/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa WhatsApp Web API & Protocol Library
 * 
 * High-performance, ultra-compact session storage, rock-solid dual pairing (QR & 8-digit code),
 * and advanced proto message builders.
 */

import { makeWASocket } from './socket/makeWASocket.js';

export { makeWASocket, sanitizePhoneNumber, type KazewaSocket, type WASocket } from './socket/makeWASocket.js';
export { useCompactAuthState, initAuthCreds } from './auth/compactAuth.js';
export { useSessionStringAuthState } from './auth/sessionString.js';
export { useMultiFileAuthState } from './auth/multiFileAuth.js';
export { DualPairingManager } from './socket/pairing.js';
export { KeepAliveManager } from './socket/keepalive.js';
export { MessageBuilder } from './builder/index.js';
export { KazewaCrypto } from './signal/crypto.js';
export { KazewaLogger, defaultLogger } from './utils/logger.js';

// Re-export core Baileys protocol utilities for ultimate convenience
export {
  DisconnectReason,
  Browsers,
  BufferJSON,
  proto,
  jidEncode,
  jidDecode,
  areJidsSameUser,
  delay
} from '@whiskeysockets/baileys';

export * from './types/index.js';

export default makeWASocket;
