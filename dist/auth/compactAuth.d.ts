/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa Compact Single-File Auth Engine
 * Replaces Baileys multi-file folder (100-500 files) with a single atomic compressed .kaze file
 */
import { type AuthenticationCreds, type AuthenticationState } from '@whiskeysockets/baileys';
export interface CompactAuthOptions {
    compress?: boolean;
    maxStoredPreKeys?: number;
}
export interface CompactAuthStats {
    filePath: string;
    fileSizeBytes: number;
    fileSizeFormatted: string;
    keysCount: number;
    sessionCount: number;
    preKeysCount: number;
    compressionRatio: string;
    lastSavedAt: number;
}
export interface CompactAuthResult {
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    exportSessionString: () => string;
    getStats: () => Promise<CompactAuthStats>;
    cleanStaleKeys: () => Promise<number>;
}
export declare const initAuthCreds: () => AuthenticationCreds;
/**
 * High-performance, ultra-compact single-file WhatsApp auth state.
 * Stores all credentials and Signal protocol keys inside a single compressed .kaze file.
 */
export declare function useCompactAuthState(filePathOrDir: string, options?: CompactAuthOptions): Promise<CompactAuthResult>;
//# sourceMappingURL=compactAuth.d.ts.map