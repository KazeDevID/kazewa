/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Baileys-compatible multi-file auth state adapter for seamless migration
 */

import fs from 'node:fs';
import path from 'node:path';
import type { AuthenticationCreds, AuthenticationState } from '../types/index.js';
import { initAuthCreds } from './compactAuth.js';

function bufferReplacer(_key: string, value: any): any {
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return {
      type: 'Buffer',
      data: Buffer.from(value).toString('base64')
    };
  }
  return value;
}

function bufferReviver(_key: string, value: any): any {
  if (value && typeof value === 'object' && value.type === 'Buffer' && typeof value.data === 'string') {
    return Buffer.from(value.data, 'base64');
  }
  return value;
}

export async function useMultiFileAuthState(folderPath: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const dir = path.resolve(folderPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const credsPath = path.join(dir, 'creds.json');
  let creds: AuthenticationCreds;

  if (fs.existsSync(credsPath)) {
    try {
      const data = fs.readFileSync(credsPath, 'utf-8');
      creds = JSON.parse(data, bufferReviver);
    } catch {
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
    fs.writeFileSync(credsPath, JSON.stringify(creds, bufferReplacer, 2));
  }

  const saveCreds = async () => {
    const tempPath = `${credsPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(creds, bufferReplacer, 2));
    fs.renameSync(tempPath, credsPath);
  };

  const keys = {
    get: async <T>(type: string, ids: string[]): Promise<{ [id: string]: T }> => {
      const data: { [id: string]: T } = {};
      for (const id of ids) {
        const filePath = path.join(dir, `${type}-${id}.json`);
        if (fs.existsSync(filePath)) {
          try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            data[id] = JSON.parse(raw, bufferReviver);
          } catch {
            // ignore corrupted
          }
        }
      }
      return data;
    },
    set: async (data: { [type: string]: { [id: string]: any } }) => {
      for (const type of Object.keys(data)) {
        for (const id of Object.keys(data[type])) {
          const val = data[type][id];
          const filePath = path.join(dir, `${type}-${id}.json`);
          if (val === null || val === undefined) {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } else {
            const tmp = `${filePath}.tmp`;
            fs.writeFileSync(tmp, JSON.stringify(val, bufferReplacer));
            fs.renameSync(tmp, filePath);
          }
        }
      }
    }
  };

  return {
    state: { creds, keys },
    saveCreds
  };
}
