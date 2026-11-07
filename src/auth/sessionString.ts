/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Zero-Disk Session String Auth Engine for Serverless & Cloud Deployments
 */

import zlib from 'node:zlib';
import type { AuthenticationCreds, AuthenticationState } from '../types/index.js';
import { initAuthCreds } from './compactAuth.js';

function bufferReviver(_key: string, value: any): any {
  if (value && typeof value === 'object' && value.type === 'Buffer' && typeof value.data === 'string') {
    return Buffer.from(value.data, 'base64');
  }
  return value;
}

function bufferReplacer(_key: string, value: any): any {
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return {
      type: 'Buffer',
      data: Buffer.from(value).toString('base64')
    };
  }
  return value;
}

export interface SessionStringAuthResult {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  getSessionString: () => string;
}

/**
 * Load WhatsApp session directly from a single Portable Session String (e.g. from process.env.SESSION_ID)
 */
export async function useSessionStringAuthState(
  sessionString?: string,
  onUpdate?: (updatedString: string) => void | Promise<void>
): Promise<SessionStringAuthResult> {
  let creds: AuthenticationCreds = initAuthCreds();
  let keysStore: { [type: string]: { [id: string]: any } } = {};

  if (sessionString && sessionString.startsWith('KAZE_WA:v1:')) {
    try {
      const base64Data = sessionString.replace('KAZE_WA:v1:', '');
      const compressed = Buffer.from(base64Data, 'base64');
      const jsonText = zlib.gunzipSync(compressed).toString('utf-8');
      const parsed = JSON.parse(jsonText, bufferReviver);
      creds = parsed.creds || creds;
      keysStore = parsed.keys || {};
    } catch (err) {
      console.warn('[Kazewa] Invalid session string provided, creating fresh session credentials:', err);
    }
  }

  const getSessionString = (): string => {
    const payload = {
      version: 1,
      creds,
      keys: keysStore,
      metadata: {
        updatedAt: Date.now(),
        platform: 'kazewa-string'
      }
    };
    const jsonStr = JSON.stringify(payload, bufferReplacer);
    const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'), { level: 9 });
    return `KAZE_WA:v1:${compressed.toString('base64')}`;
  };

  const triggerUpdate = async () => {
    if (onUpdate) {
      const str = getSessionString();
      await onUpdate(str);
    }
  };

  const saveCreds = async () => {
    await triggerUpdate();
  };

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
      for (const type of Object.keys(data)) {
        if (!keysStore[type]) keysStore[type] = {};
        for (const id of Object.keys(data[type])) {
          const val = data[type][id];
          if (val === null || val === undefined) {
            delete keysStore[type][id];
          } else {
            keysStore[type][id] = val;
          }
        }
      }
      await triggerUpdate();
    }
  };

  return {
    state: { creds, keys },
    saveCreds,
    getSessionString
  };
}
