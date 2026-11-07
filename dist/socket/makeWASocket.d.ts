/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa WhatsApp Web Engine - Rock-Solid Dual Pairing & Compact Session Socket
 */
import type { AuthenticationState, EventMap, InteractiveButton, MessageContent, MessageKey, SocketConfig } from '../types/index.js';
export interface WASocket {
    ev: {
        on<T extends keyof EventMap>(event: T, listener: EventMap[T]): void;
        off<T extends keyof EventMap>(event: T, listener: EventMap[T]): void;
        emit<T extends keyof EventMap>(event: T, ...args: Parameters<EventMap[T]>): boolean;
    };
    authState: AuthenticationState;
    requestPairingCode: (phoneNumber: string, customPairingCode?: string) => Promise<string>;
    sendMessage: (jid: string, content: MessageContent, options?: {
        quoted?: any;
        mentions?: string[];
    }) => Promise<any>;
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
    end: (error?: Error) => void;
    logout: () => Promise<void>;
    user?: {
        id: string;
        name?: string;
    };
}
/**
 * Sanitize and normalize phone number into clean international format
 */
export declare function sanitizePhoneNumber(phone: string): string;
/**
 * Creates and initializes a Kazewa WhatsApp Web socket instance
 * Enhanced with automated QR-readiness sync for 100% reliable pairing codes
 */
export declare function makeWASocket(config?: SocketConfig): Promise<WASocket>;
export default makeWASocket;
//# sourceMappingURL=makeWASocket.d.ts.map