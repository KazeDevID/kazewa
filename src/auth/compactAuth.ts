/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa Compact Single-File Auth Engine
 * Stores full WhatsApp credentials and Signal keys in a single compressed .kaze file.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  initAuthCreds as initBaileysCreds,
  BufferJSON,
  proto
} from "@whiskeysockets/baileys";
import type {
  AuthenticationCreds,
  AuthenticationState,
  CompactAuthOptions,
  CompactAuthResult,
  CompactAuthStats,
  SignalKeyStore
} from "../types/index.js";

export { BufferJSON };
export const initAuthCreds = initBaileysCreds;

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
    targetFile = path.join(targetFile, "session.kaze");
  } else if (!targetFile.endsWith(".kaze") && !targetFile.endsWith(".json")) {
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
        jsonText = zlib.gunzipSync(rawBuffer).toString("utf-8");
      } else {
        jsonText = rawBuffer.toString("utf-8");
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
      await new Promise((r) => setTimeout(r, 15));
    }
    isWriting = true;
    try {
      if (keysStore["pre-key"]) {
        const preKeyIds = Object.keys(keysStore["pre-key"]).map(Number).sort((a, b) => a - b);
        if (preKeyIds.length > maxPreKeys) {
          const toRemove = preKeyIds.slice(0, preKeyIds.length - maxPreKeys);
          for (const id of toRemove) {
            delete keysStore["pre-key"][id.toString()];
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
          platform: "kazewa-engine-v1.0.7"
        }
      };

      const jsonStr = JSON.stringify(payload, BufferJSON.replacer);
      let outputBuffer: Buffer;
      if (compress) {
        outputBuffer = zlib.gzipSync(Buffer.from(jsonStr, "utf-8"), { level: 9 });
      } else {
        outputBuffer = Buffer.from(jsonStr, "utf-8");
      }

      const tempFile = `${targetFile}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, outputBuffer);
      fs.renameSync(tempFile, targetFile);
      lastSavedAt = Date.now();
    } catch (err) {
      console.error("[Kazewa] Error saving session to file:", err);
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
        let val = bucket[id];
        if (type === "app-state-sync-key" && val) {
          val = proto.Message.AppStateSyncKeyData.fromObject(val) as any;
        }
        if (val !== undefined && val !== null) {
          data[id] = val;
        }
      }
      return data;
    },
    set: async (data: { [type: string]: { [id: string]: any } }) => {
      for (const category of Object.keys(data)) {
        if (!keysStore[category]) {
          keysStore[category] = {};
        }
        for (const id of Object.keys(data[category])) {
          const val = data[category][id];
          if (val === null || val === undefined) {
            delete keysStore[category][id];
          } else {
            keysStore[category][id] = val;
          }
        }
      }
      await saveToFile();
    },
    clear: async () => {
      keysStore = {};
      if (fs.existsSync(targetFile)) {
        try {
          fs.unlinkSync(targetFile);
        } catch {}
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
        platform: "kazewa-string"
      }
    };
    const jsonStr = JSON.stringify(payload, BufferJSON.replacer);
    const compressed = zlib.gzipSync(Buffer.from(jsonStr, "utf-8"), { level: 9 });
    return `KAZE_WA:v1:${compressed.toString("base64")}`;
  };

  const getStats = async (): Promise<CompactAuthStats> => {
    let size = 0;
    if (fs.existsSync(targetFile)) {
      size = fs.statSync(targetFile).size;
    }
    const rawJson = JSON.stringify({ creds, keys: keysStore }, BufferJSON.replacer);
    const rawSize = Buffer.byteLength(rawJson, "utf-8");
    const ratio = rawSize > 0 ? `${Math.round((1 - size / rawSize) * 100)}%` : "0%";

    let totalKeys = 0;
    for (const k of Object.keys(keysStore)) {
      totalKeys += Object.keys(keysStore[k] || {}).length;
    }

    const preKeys = Object.keys(keysStore["pre-key"] || {}).length;
    const sessionCount = Object.keys(keysStore["session"] || {}).length;

    return {
      filePath: targetFile,
      fileSizeBytes: size,
      fileSizeFormatted: `${(size / 1024).toFixed(1)} KB`,
      keysCount: totalKeys,
      sessionCount,
      preKeysCount: preKeys,
      compressionRatio: ratio,
      lastSavedAt
    };
  };

  const cleanStaleKeys = async (): Promise<number> => {
    let removed = 0;
    if (keysStore["pre-key"]) {
      const keys = Object.keys(keysStore["pre-key"]);
      if (keys.length > maxPreKeys) {
        removed = keys.length - maxPreKeys;
        const sorted = keys.map(Number).sort((a, b) => a - b);
        for (const id of sorted.slice(0, removed)) {
          delete keysStore["pre-key"][id.toString()];
        }
        await saveToFile();
      }
    }
    return removed;
  };

  return {
    state: { creds, keys },
    saveCreds,
    exportSessionString,
    getStats,
    cleanStaleKeys
  };
}
