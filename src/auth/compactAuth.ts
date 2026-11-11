/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa Compact Single-File Auth Engine
 * Standalone implementation powered solely by native `node:crypto`, `node:fs`, and `node:zlib`
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { KazewaCrypto } from '../signal/crypto.js';
import type {
  AuthenticationCreds,
  AuthenticationState,
  CompactAuthOptions,
  CompactAuthResult,
  CompactAuthStats,
  SignalKeyStore
} from '../types/index.js';

export const BufferJSON = {
  replacer: (_key: string, value: any): any => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      return {
        type: 'Buffer',
        data: Buffer.from(value).toString('base64')
      };
    }
    return value;
  },
  reviver: (_key: string, value: any): any => {
    if (value && typeof value === 'object' && value.type === 'Buffer' && typeof value.data === 'string') {
      return Buffer.from(value.data, 'base64');
    }
    return value;
  }
};

export function initAuthCreds(): AuthenticationCreds {
  const identityKey = KazewaCrypto.generateKeyPair();
  const signedPreKey = KazewaCrypto.generateSignedPreKey(identityKey, 1);

  return {
    noiseKey: KazewaCrypto.generateKeyPair(),
    pairingEphemeralKeyPair: KazewaCrypto.generateKeyPair(),
    signedIdentityKey: identityKey,
    signedPreKey,
    registrationId: crypto.randomInt(1000, 9999),
    advSecretKey: crypto.randomBytes(32).toString('base64'),
    processedHistoryMessages: [],
    nextPreKeyId: 2,
    firstUnuploadedPreKeyId: 2,
    accountSyncCounter: 0,
    accountSettings: {
      unarchiveChats: false
    },
    deviceId: crypto.randomBytes(16).toString('hex'),
    phoneId: crypto.randomUUID(),
    identityId: crypto.randomBytes(20),
    registered: false,
    backupToken: crypto.randomBytes(20),
    registration: {
      platform: 'android'
    }
  };
}

interface StoredData {
  version: number;
  creds: AuthenticationCreds;
  keys: { [type: string]: { [id: string]: any } };
  metadata?: {
    createdAt?: number;
    updatedAt?: number;
    platform?: string;
  };
}

/**
 * High-performance, ultra-compact single-file WhatsApp auth state.
 * Stores all credentials and Signal protocol keys inside a single compressed .kaze file.
 */
export async function useCompactAuthState(
  filePathOrDir: string,
  options: CompactAuthOptions = {}
): Promise<CompactAuthResult> {
  const compress = options.compress !== false;
  const maxPreKeys = options.maxStoredPreKeys || 50;

  let targetFile = path.resolve(filePathOrDir);
  if (fs.existsSync(targetFile) && fs.statSync(targetFile).isDirectory()) {
    targetFile = path.join(targetFile, 'session.kaze');
  } else if (!targetFile.endsWith('.kaze') && !targetFile.endsWith('.json')) {
    targetFile = `${targetFile}.kaze`;
  }

  const parentDir = path.dirname(targetFile);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  let creds: AuthenticationCreds;
  let keysStore: { [type: string]: { [id: string]: any } } = {};
  let lastSavedAt = Date.now();

  if (fs.existsSync(targetFile)) {
    try {
      const rawBuffer = fs.readFileSync(targetFile);
      let jsonText: string;

      if (rawBuffer.length >= 2 && rawBuffer[0] === 0x1f && rawBuffer[1] === 0x8b) {
        jsonText = zlib.gunzipSync(rawBuffer).toString('utf-8');
      } else {
        jsonText = rawBuffer.toString('utf-8');
      }

      const parsed: StoredData = JSON.parse(jsonText, BufferJSON.reviver);
      creds = parsed.creds || initAuthCreds();
      keysStore = parsed.keys || {};
      lastSavedAt = parsed.metadata?.updatedAt || Date.now();
    } catch (err) {
      console.warn(`[Kazewa] Could not parse existing session at ${targetFile}, creating fresh session:`, err);
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  let isWriting = false;
  const saveToFile = async () => {
    if (isWriting) {
      await new Promise((r) => setTimeout(r, 10));
    }
    isWriting = true;
    try {
      if (keysStore['pre-key']) {
        const preKeyIds = Object.keys(keysStore['pre-key']).map(Number).sort((a, b) => a - b);
        if (preKeyIds.length > maxPreKeys) {
          const toRemove = preKeyIds.slice(0, preKeyIds.length - maxPreKeys);
          for (const id of toRemove) {
            delete keysStore['pre-key'][id.toString()];
          }
        }
      }

      const payload: StoredData = {
        version: 1,
        creds,
        keys: keysStore,
        metadata: {
          createdAt: lastSavedAt,
          updatedAt: Date.now(),
          platform: 'kazewa-engine-v1'
        }
      };

      const jsonStr = JSON.stringify(payload, BufferJSON.replacer);
      let outputBuffer: Buffer;

      if (compress) {
        outputBuffer = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'), { level: 9 });
      } else {
        outputBuffer = Buffer.from(jsonStr, 'utf-8');
      }

      const tempFile = `${targetFile}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, outputBuffer);
      fs.renameSync(tempFile, targetFile);
      lastSavedAt = Date.now();
    } finally {
      isWriting = false;
    }
  };

  const saveCreds = async () => {
    await saveToFile();
  };

  const keys: SignalKeyStore = {
    get: async <T>(type: string, ids: string[]): Promise<{ [id: string]: T }> => {
      const data: { [id: string]: T } = {};
      const bucket = keysStore[type] || {};
      for (const id of ids) {
        const val = bucket[id];
        if (val !== undefined && val !== null) {
          data[id] = val;
        }
      }
      return data;
    },
    set: async (data: { [type: string]: { [id: string]: any } }) => {
      let changed = false;
      for (const type of Object.keys(data)) {
        if (!keysStore[type]) {
          keysStore[type] = {};
        }
        for (const id of Object.keys(data[type])) {
          const val = data[type][id];
          if (val === null || val === undefined) {
            delete keysStore[type][id];
          } else {
            keysStore[type][id] = val;
          }
          changed = true;
        }
      }
      if (changed) {
        await saveToFile();
      }
    },
    clear: async () => {
      keysStore = {};
      if (fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
      }
    }
  };

  const exportSessionString = (): string => {
    const payload: StoredData = {
      version: 1,
      creds,
      keys: keysStore,
      metadata: {
        createdAt: lastSavedAt,
        updatedAt: Date.now(),
        platform: 'kazewa-portable'
      }
    };
    const jsonStr = JSON.stringify(payload, BufferJSON.replacer);
    const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'), { level: 9 });
    return `KAZE_WA:v1:${compressed.toString('base64')}`;
  };

  const cleanStaleKeys = async (): Promise<number> => {
    let removed = 0;
    if (keysStore['pre-key']) {
      const ids = Object.keys(keysStore['pre-key']).map(Number).sort((a, b) => a - b);
      if (ids.length > 30) {
        const excess = ids.slice(0, ids.length - 30);
        for (const id of excess) {
          delete keysStore['pre-key'][id.toString()];
          removed++;
        }
      }
    }
    if (removed > 0) {
      await saveToFile();
    }
    return removed;
  };

  const getStats = async (): Promise<CompactAuthStats> => {
    let size = 0;
    if (fs.existsSync(targetFile)) {
      size = fs.statSync(targetFile).size;
    }
    const uncompressedSize = Buffer.byteLength(
      JSON.stringify({ creds, keys: keysStore }, BufferJSON.replacer)
    );
    const ratio = uncompressedSize > 0 ? `${((1 - size / uncompressedSize) * 100).toFixed(1)}%` : '0%';

    let totalKeys = 0;
    for (const k in keysStore) {
      totalKeys += Object.keys(keysStore[k] || {}).length;
    }
    const sessionCount = Object.keys(keysStore['session'] || {}).length;
    const preKeysCount = Object.keys(keysStore['pre-key'] || {}).length;
    const formatted = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;

    return {
      filePath: targetFile,
      fileSizeBytes: size,
      fileSizeFormatted: formatted,
      keysCount: totalKeys,
      sessionCount,
      preKeysCount,
      compressionRatio: ratio,
      lastSavedAt
    };
  };

  if (!fs.existsSync(targetFile)) {
    await saveToFile();
  }

  return {
    state: {
      creds,
      keys
    },
    saveCreds,
    exportSessionString,
    getStats,
    cleanStaleKeys
  };
}
