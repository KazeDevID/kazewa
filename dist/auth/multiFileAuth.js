/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Multi-file auth state adapter with rock-solid file locking
 */
import { useMultiFileAuthState as useBaileysMultiFileAuthState } from "@whiskeysockets/baileys";
export async function useMultiFileAuthState(folderPath) {
    return useBaileysMultiFileAuthState(folderPath);
}
//# sourceMappingURL=multiFileAuth.js.map