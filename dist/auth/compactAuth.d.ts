import { BufferJSON } from "@whiskeysockets/baileys";
import type { CompactAuthOptions, CompactAuthResult } from "../types/index.js";
export { BufferJSON };
export declare const initAuthCreds: () => import("@whiskeysockets/baileys").AuthenticationCreds;
/**
 * High-performance, ultra-compact single-file WhatsApp auth state.
 * Stores all credentials and Signal protocol keys inside a single compressed .kaze file.
 */
export declare function useCompactAuthState(filePathOrDir: string, options?: CompactAuthOptions): Promise<CompactAuthResult>;
//# sourceMappingURL=compactAuth.d.ts.map