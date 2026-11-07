"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Zero-Disk Session String Auth Engine for Serverless & Cloud Deployments
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSessionStringAuthState = useSessionStringAuthState;
const node_zlib_1 = __importDefault(require("node:zlib"));
const compactAuth_js_1 = require("./compactAuth.js");
function bufferReviver(_key, value) {
    if (value && typeof value === 'object' && value.type === 'Buffer' && typeof value.data === 'string') {
        return Buffer.from(value.data, 'base64');
    }
    return value;
}
function bufferReplacer(_key, value) {
    if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
        return {
            type: 'Buffer',
            data: Buffer.from(value).toString('base64')
        };
    }
    return value;
}
/**
 * Load WhatsApp session directly from a single Portable Session String (e.g. from process.env.SESSION_ID)
 */
async function useSessionStringAuthState(sessionString, onUpdate) {
    let creds = (0, compactAuth_js_1.initAuthCreds)();
    let keysStore = {};
    if (sessionString && sessionString.startsWith('KAZE_WA:v1:')) {
        try {
            const base64Data = sessionString.replace('KAZE_WA:v1:', '');
            const compressed = Buffer.from(base64Data, 'base64');
            const jsonText = node_zlib_1.default.gunzipSync(compressed).toString('utf-8');
            const parsed = JSON.parse(jsonText, bufferReviver);
            creds = parsed.creds || creds;
            keysStore = parsed.keys || {};
        }
        catch (err) {
            console.warn('[Kazewa] Invalid session string provided, creating fresh session credentials:', err);
        }
    }
    const getSessionString = () => {
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
        const compressed = node_zlib_1.default.gzipSync(Buffer.from(jsonStr, 'utf-8'), { level: 9 });
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
        get: async (type, ids) => {
            const data = {};
            const bucket = keysStore[type] || {};
            for (const id of ids) {
                if (bucket[id]) {
                    data[id] = bucket[id];
                }
            }
            return data;
        },
        set: async (data) => {
            for (const type of Object.keys(data)) {
                if (!keysStore[type])
                    keysStore[type] = {};
                for (const id of Object.keys(data[type])) {
                    const val = data[type][id];
                    if (val === null || val === undefined) {
                        delete keysStore[type][id];
                    }
                    else {
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
//# sourceMappingURL=sessionString.js.map