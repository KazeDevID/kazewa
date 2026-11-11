/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa WhatsApp Web Multi-Device Socket Client
 * Fully powered by reliable Baileys protocol engine with ultra-compact session,
 * rock-solid dual pairing (QR & 8-digit Crockford Pairing Code), and rich message builders.
 */
import { DisconnectReason } from "@whiskeysockets/baileys";
import type { SocketConfig, WASocket } from "../types/index.js";
export { DisconnectReason };
export declare function sanitizePhoneNumber(phone: string): string;
/**
 * Kazewa WhatsApp Web MD Socket Factory
 * Provides production-grade pairing code handshake that reliably links with WhatsApp Mobile & Web.
 */
export declare function makeWASocket(config?: SocketConfig): Promise<WASocket>;
export default makeWASocket;
//# sourceMappingURL=makeWASocket.d.ts.map