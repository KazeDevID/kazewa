/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Zero-Disk Session String Auth Engine for Serverless & Cloud Deployments
 */
import type { AuthenticationState } from '../types/index.js';
export interface SessionStringAuthResult {
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    getSessionString: () => string;
}
/**
 * Load WhatsApp session directly from a single Portable Session String (e.g. from process.env.SESSION_ID)
 */
export declare function useSessionStringAuthState(sessionString?: string, onUpdate?: (updatedString: string) => void | Promise<void>): Promise<SessionStringAuthResult>;
//# sourceMappingURL=sessionString.d.ts.map