/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native Ultra-Compact Session & Auth State Engine for Kazewa
 * 85-95% smaller than standard Baileys multi-file auth with zero external dependencies
 */
import type { AuthenticationCreds, CompactAuthResult } from '../types/index.js';
export interface CompactAuthOptions {
    compress?: boolean;
    autoSaveIntervalMs?: number;
    maxStoredPreKeys?: number;
    encryptionPassword?: string;
}
export declare function generateCurve25519KeyPair(): {
    private: Buffer;
    public: Buffer;
};
/**
 * Pure Native Credential Initialization using node:crypto Curve25519
 */
export declare function initAuthCreds(): AuthenticationCreds;
/**
 * High-performance, ultra-compact single-file WhatsApp auth state
 * Replaces Baileys 100+ multi-file folder with a single atomic compressed binary/JSON file
 */
export declare function useCompactAuthState(filePathOrDir: string, options?: CompactAuthOptions): Promise<CompactAuthResult>;
//# sourceMappingURL=compactAuth.d.ts.map