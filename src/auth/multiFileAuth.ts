/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Multi-file auth state adapter with rock-solid file locking
 */
import { useMultiFileAuthState as useBaileysMultiFileAuthState } from "@whiskeysockets/baileys";
import type { AuthenticationState } from "../types/index.js";

export async function useMultiFileAuthState(folderPath: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  return useBaileysMultiFileAuthState(folderPath) as any;
}
