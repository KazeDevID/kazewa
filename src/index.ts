/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa WhatsApp Web API & Protocol Library
 * 
 * Standalone, high-performance WhatsApp Web Engine with ultra-compact session storage,
 * rock-solid dual pairing (QR & 8-digit code), and advanced proto message builders.
 */

import { makeWASocket } from './socket/makeWASocket.js';

export { makeWASocket, sanitizePhoneNumber, type KazewaSocket, type WASocket } from './socket/makeWASocket.js';
export { useCompactAuthState, initAuthCreds, BufferJSON } from './auth/compactAuth.js';
export { useSessionStringAuthState } from './auth/sessionString.js';
export { useMultiFileAuthState } from './auth/multiFileAuth.js';
export { DualPairingManager } from './socket/pairing.js';
export { KeepAliveManager } from './socket/keepalive.js';
export { MessageBuilder } from './builder/index.js';
export { KazewaCrypto } from './signal/crypto.js';
export { KazewaLogger, defaultLogger } from './utils/logger.js';
export {
  generatePairingCode,
  derivePairingCodeKey,
  generatePairingWrappedKey,
  decipherLinkPublicKey,
  buildPairingStage2KeyBundle,
  bytesToCrockford,
  getCompanionPlatformId
} from './crypto/pairing.js';
export { jidEncode, jidDecode, S_WHATSAPP_NET } from './binary/jid.js';
export { encodeBinaryNode, type BinaryNode } from './binary/encode.js';
export { decodeBinaryNode } from './binary/decode.js';
export { proto } from './proto/index.js';
export * from './types/index.js';

export default makeWASocket;
