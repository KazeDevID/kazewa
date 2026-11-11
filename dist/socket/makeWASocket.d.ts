/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Main Socket Factory for Kazewa WhatsApp Web Engine
 * Powered by battle-tested WhatsApp Web Multi-Device protocol with Rock-Solid Pairing Code
 */
import { type WASocket as BaileysWASocket } from '@whiskeysockets/baileys';
import type { InteractiveButton, MessageKey, SocketConfig } from '../types/index.js';
export interface KazewaSocket extends BaileysWASocket {
    requestPairingCode: (phoneNumber: string, customPairingCode?: string) => Promise<string>;
    sendInteractive: (jid: string, data: {
        title?: string;
        body: string;
        footer?: string;
        buttons: InteractiveButton[];
        quoted?: any;
    }) => Promise<any>;
    sendAlbum: (jid: string, items: Array<{
        image?: any;
        video?: any;
        caption?: string;
    }>, options?: {
        caption?: string;
        quoted?: any;
    }) => Promise<any>;
    sendPoll: (jid: string, data: {
        question: string;
        options: string[];
        selectableCount?: number;
        multiSelect?: boolean;
    }) => Promise<any>;
    sendReaction: (key: MessageKey, emoji: string) => Promise<any>;
}
export type WASocket = KazewaSocket;
/**
 * Normalizes phone numbers to standard international WhatsApp format without leading + or 0
 * Examples: '08123456789' -> '628123456789', '+62 812-3456' -> '628123456'
 */
export declare function sanitizePhoneNumber(phone: string): string;
/**
 * Creates and initializes a Kazewa WhatsApp Web socket instance.
 * Features ultra-compact session storage and rock-solid pairing code connection.
 */
export declare function makeWASocket(config?: SocketConfig): Promise<KazewaSocket>;
export default makeWASocket;
//# sourceMappingURL=makeWASocket.d.ts.map