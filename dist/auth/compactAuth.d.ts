/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa Compact Single-File Auth Engine
 * Standalone implementation powered solely by native `node:crypto`, `node:fs`, and `node:zlib`
 */
import type { AuthenticationCreds, CompactAuthOptions, CompactAuthResult } from '../types/index.js';
export declare const BufferJSON: {
    replacer: (_key: string, value: any) => any;
    reviver: (_key: string, value: any) => any;
};
export declare function initAuthCreds(): AuthenticationCreds;
/**
 * High-performance, ultra-compact single-file WhatsApp auth state.
 * Stores all credentials and Signal protocol keys inside a single compressed .kaze file.
 */
export declare function useCompactAuthState(filePathOrDir: string, options?: CompactAuthOptions): Promise<CompactAuthResult>;
//# sourceMappingURL=compactAuth.d.ts.map