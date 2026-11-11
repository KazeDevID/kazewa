/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Baileys-compatible multi-file auth state adapter for seamless migration
 */

import {
  useMultiFileAuthState as baileysUseMultiFileAuthState,
  type AuthenticationState
} from '@whiskeysockets/baileys';

export async function useMultiFileAuthState(folderPath: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  return baileysUseMultiFileAuthState(folderPath);
}
