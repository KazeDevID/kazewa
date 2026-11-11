/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Baileys-compatible multi-file auth state adapter for seamless migration
 */
import { useMultiFileAuthState as baileysUseMultiFileAuthState } from '@whiskeysockets/baileys';
export async function useMultiFileAuthState(folderPath) {
    return baileysUseMultiFileAuthState(folderPath);
}
//# sourceMappingURL=multiFileAuth.js.map