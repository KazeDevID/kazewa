import type { AuthenticationState } from "../types/index.js";
export interface SessionStringAuthResult {
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    getSessionString: () => string;
}
export declare function useSessionStringAuthState(sessionString?: string, onUpdate?: (updatedString: string) => void | Promise<void>): Promise<SessionStringAuthResult>;
//# sourceMappingURL=sessionString.d.ts.map