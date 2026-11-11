import type { AuthenticationState } from "../types/index.js";
export declare function useMultiFileAuthState(folderPath: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}>;
//# sourceMappingURL=multiFileAuth.d.ts.map