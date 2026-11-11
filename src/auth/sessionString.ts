/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Zero-Disk Session String Auth Engine for Serverless & Cloud Deployments
 */
import zlib from "node:zlib";
import { proto } from "@whiskeysockets/baileys";
import type { AuthenticationCreds, AuthenticationState, SignalKeyStore } from "../types/index.js";
import { BufferJSON, initAuthCreds } from "./compactAuth.js";

export interface SessionStringAuthResult {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  getSessionString: () => string;
}

export async function useSessionStringAuthState(
  sessionString?: string,
  onUpdate?: (updatedString: string) => void | Promise<void>
): Promise<SessionStringAuthResult> {
  let creds: AuthenticationCreds = initAuthCreds();
  let keysStore: { [type: string]: { [id: string]: any } } = {};

  if (sessionString && sessionString.startsWith("KAZE_WA:v1:")) {
    try {
      const base64Data = sessionString.replace("KAZE_WA:v1:", "");
      const compressed = Buffer.from(base64Data, "base64");
      const jsonText = zlib.gunzipSync(compressed).toString("utf-8");
      const parsed = JSON.parse(jsonText, BufferJSON.reviver);
      creds = parsed.creds || creds;
      keysStore = parsed.keys || {};
    } catch (err) {
      console.warn("[Kazewa] Invalid session string provided, creating fresh session credentials:", err);
    }
  }

  const getSessionString = (): string => {
    const payload = {
      version: 1,
      creds,
      keys: keysStore,
      metadata: {
        updatedAt: Date.now(),
        platform: "kazewa-string"
      }
    };
    const jsonStr = JSON.stringify(payload, BufferJSON.replacer);
    const compressed = zlib.gzipSync(Buffer.from(jsonStr, "utf-8"), { level: 9 });
    return `KAZE_WA:v1:${compressed.toString("base64")}`;
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
    },
    clear: async () => {
      keysStore = {};
      await triggerUpdate();
    }
  };

  return {
    state: { creds, keys },
    saveCreds,
    getSessionString
  };
}
