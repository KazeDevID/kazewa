/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Multi-file auth state adapter for traditional directory storage
 */
import fs from 'node:fs';
import path from 'node:path';
import { BufferJSON, initAuthCreds } from './compactAuth.js';
export async function useMultiFileAuthState(folderPath) {
    const dir = path.resolve(folderPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const credsPath = path.join(dir, 'creds.json');
    let creds;
    if (fs.existsSync(credsPath)) {
        try {
            const data = fs.readFileSync(credsPath, 'utf-8');
            creds = JSON.parse(data, BufferJSON.reviver);
        }
        catch {
            creds = initAuthCreds();
        }
    }
    else {
        creds = initAuthCreds();
        fs.writeFileSync(credsPath, JSON.stringify(creds, BufferJSON.replacer, 2));
    }
    const saveCreds = async () => {
        const tempPath = `${credsPath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(creds, BufferJSON.replacer, 2));
        fs.renameSync(tempPath, credsPath);
    };
    const keys = {
        get: async (type, ids) => {
            const data = {};
            for (const id of ids) {
                const filePath = path.join(dir, `${type}-${id}.json`);
                if (fs.existsSync(filePath)) {
                    try {
                        const raw = fs.readFileSync(filePath, 'utf-8');
                        data[id] = JSON.parse(raw, BufferJSON.reviver);
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
                    const filePath = path.join(dir, `${type}-${id}.json`);
                    if (val === null || val === undefined) {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                    else {
                        const tmp = `${filePath}.tmp`;
                        fs.writeFileSync(tmp, JSON.stringify(val, BufferJSON.replacer));
                        fs.renameSync(tmp, filePath);
                    }
                }
            }
        },
        clear: async () => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    try {
                        fs.unlinkSync(path.join(dir, file));
                    }
                    catch { }
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