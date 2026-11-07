"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Baileys-compatible multi-file auth state adapter for seamless migration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMultiFileAuthState = useMultiFileAuthState;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const compactAuth_js_1 = require("./compactAuth.js");
function bufferReplacer(_key, value) {
    if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
        return {
            type: 'Buffer',
            data: Buffer.from(value).toString('base64')
        };
    }
    return value;
}
function bufferReviver(_key, value) {
    if (value && typeof value === 'object' && value.type === 'Buffer' && typeof value.data === 'string') {
        return Buffer.from(value.data, 'base64');
    }
    return value;
}
async function useMultiFileAuthState(folderPath) {
    const dir = node_path_1.default.resolve(folderPath);
    if (!node_fs_1.default.existsSync(dir)) {
        node_fs_1.default.mkdirSync(dir, { recursive: true });
    }
    const credsPath = node_path_1.default.join(dir, 'creds.json');
    let creds;
    if (node_fs_1.default.existsSync(credsPath)) {
        try {
            const data = node_fs_1.default.readFileSync(credsPath, 'utf-8');
            creds = JSON.parse(data, bufferReviver);
        }
        catch {
            creds = (0, compactAuth_js_1.initAuthCreds)();
        }
    }
    else {
        creds = (0, compactAuth_js_1.initAuthCreds)();
        node_fs_1.default.writeFileSync(credsPath, JSON.stringify(creds, bufferReplacer, 2));
    }
    const saveCreds = async () => {
        const tempPath = `${credsPath}.tmp`;
        node_fs_1.default.writeFileSync(tempPath, JSON.stringify(creds, bufferReplacer, 2));
        node_fs_1.default.renameSync(tempPath, credsPath);
    };
    const keys = {
        get: async (type, ids) => {
            const data = {};
            for (const id of ids) {
                const filePath = node_path_1.default.join(dir, `${type}-${id}.json`);
                if (node_fs_1.default.existsSync(filePath)) {
                    try {
                        const raw = node_fs_1.default.readFileSync(filePath, 'utf-8');
                        data[id] = JSON.parse(raw, bufferReviver);
                    }
                    catch {
                        // ignore corrupted
                    }
                }
            }
            return data;
        },
        set: async (data) => {
            for (const type of Object.keys(data)) {
                for (const id of Object.keys(data[type])) {
                    const val = data[type][id];
                    const filePath = node_path_1.default.join(dir, `${type}-${id}.json`);
                    if (val === null || val === undefined) {
                        if (node_fs_1.default.existsSync(filePath)) {
                            node_fs_1.default.unlinkSync(filePath);
                        }
                    }
                    else {
                        const tmp = `${filePath}.tmp`;
                        node_fs_1.default.writeFileSync(tmp, JSON.stringify(val, bufferReplacer));
                        node_fs_1.default.renameSync(tmp, filePath);
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
//# sourceMappingURL=multiFileAuth.js.map