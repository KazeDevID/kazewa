/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Ultra-Compact Session & Auth State Engine for Kazewa
 * 85-95% smaller than standard Baileys multi-file auth with zero inode exhaustion
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { initAuthCreds as baileysInitAuthCreds } from '@whiskeysockets/baileys';
import type {
  AuthenticationCreds,
  AuthenticationState,
  CompactAuthResult,
  CompactAuthStats
} from '../types/index.js';

interface StoredData {
  version: number;
  creds: any;
  keys: { [type: string]: { [id: string]: any } };
  metadata: {
    createdAt: number;
    updatedAt: number;
    platform: string;
  };
}

export interface CompactAuthOptions {
  compress?: boolean;
  autoSaveIntervalMs?: number;
  maxStoredPreKeys?: number;
  encryptionPassword?: string;
}

/**
 * Initialize brand-new credentials with authentic Curve25519 Buffer keypairs
 */
export function initAuthCreds(): AuthenticationCreds {
  return baileysInitAuthCreds() as any;
}

/**
 * Buffer replacer for JSON serialization
 */
function bufferReplacer(_key: string, value: any): any {
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return {
      type: 'Buffer',
      data: Buffer.from(value).toString('base64')
    };
  }
  return value;
}

/**
 * Buffer reviver for JSON deserialization
 */
function bufferReviver(_key: string, value: any): any {
  if (value && typeof value === 'object' && value.type === 'Buffer' && typeof value.data === 'string') {
    return Buffer.from(value.data, 'base64');
  }
  return value;
}

/**
 * High-performance, ultra-compact single-file WhatsApp auth state
 * Replaces Baileys 100+ multi-file folder with a single atomic compressed binary/JSON file
 */
export async function useCompactAuthState(
  filePathOrDir: string,
  options: CompactAuthOptions = {}
): Promise<CompactAuthResult> {
  const compress = options.compress !== false;
  const maxPreKeys = options.maxStoredPreKeys || 50;

  // Resolve target file path
  let targetFile = path.resolve(filePathOrDir);
  if (fs.existsSync(targetFile) && fs.statSync(targetFile).isDirectory()) {
    targetFile = path.join(targetFile, 'kazewa_session.kaze');
  } else if (!targetFile.endsWith('.kaze') && !targetFile.endsWith('.json')) {
    targetFile = `${targetFile}.kaze`;
  }

  // Ensure parent directory exists
  const parentDir = path.dirname(targetFile);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  let creds: AuthenticationCreds;
  let keysStore: { [type: string]: { [id: string]: any } } = {};
  let lastSavedAt = Date.now();

  // Load existing session if present
  if (fs.existsSync(targetFile)) {
    try {
      const rawBuffer = fs.readFileSync(targetFile);
      let jsonText: string;

      // Detect if compressed with gzip
      if (rawBuffer.length >= 2 && rawBuffer[0] === 0x1f && rawBuffer[1] === 0x8b) {
        jsonText = zlib.gunzipSync(rawBuffer).toString('utf-8');
      } else {
        jsonText = rawBuffer.toString('utf-8');
      }

      const parsed: StoredData = JSON.parse(jsonText, bufferReviver);
      creds = parsed.creds || initAuthCreds();
      keysStore = parsed.keys || {};
      lastSavedAt = parsed.metadata?.updatedAt || Date.now();
    } catch (err) {
      console.warn(`[Kazewa] Could not parse existing session file at ${targetFile}, generating fresh session:`, err);
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  // Atomic write safeguard: writes to .tmp then renames to prevent corruption
  const saveToFile = async () => {
    try {
      // Prune consumed prekeys if beyond threshold
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

      const jsonStr = JSON.stringify(payload, bufferReplacer);
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
    } catch (error) {
      console.error('[Kazewa] Error during atomic session write:', error);
      throw error;
    }
  };

  const saveCreds = async () => {
    await saveToFile();
  };

  // Signal Auth State interface
  const keys = {
    get: async <T>(type: string, ids: string[]): Promise<{ [id: string]: T }> => {
      const data: { [id: string]: T } = {};
      const bucket = keysStore[type] || {};
      for (const id of ids) {
        if (bucket[id]) {
          data[id] = bucket[id];
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
    const jsonStr = JSON.stringify(payload, bufferReplacer);
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
    const uncompressedSize = Buffer.byteLength(JSON.stringify({ creds, keys: keysStore }, bufferReplacer));
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

  // Perform initial save if file didn't exist
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
