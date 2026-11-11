/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Baileys-compatible multi-file auth state adapter for seamless migration
 */
import { type AuthenticationState } from '@whiskeysockets/baileys';
export declare function useMultiFileAuthState(folderPath: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}>;
//# sourceMappingURL=multiFileAuth.d.ts.map