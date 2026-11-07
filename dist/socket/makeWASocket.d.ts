/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Main Socket Factory for Kazewa WhatsApp Engine
 */
import type { AuthenticationState, EventMap, InteractiveButton, MessageContent, MessageKey, SocketConfig, WebMessageInfo } from '../types/index.js';
export interface WASocket {
    ev: {
        on<T extends keyof EventMap>(event: T, listener: EventMap[T]): void;
        off<T extends keyof EventMap>(event: T, listener: EventMap[T]): void;
        emit<T extends keyof EventMap>(event: T, ...args: Parameters<EventMap[T]>): boolean;
    };
    authState: AuthenticationState;
    requestPairingCode: (phoneNumber: string) => Promise<string>;
    sendMessage: (jid: string, content: MessageContent, options?: {
        quoted?: any;
        mentions?: string[];
    }) => Promise<WebMessageInfo>;
    sendInteractive: (jid: string, data: {
        title?: string;
        body: string;
        footer?: string;
        buttons: InteractiveButton[];
        quoted?: any;
    }) => Promise<WebMessageInfo>;
    sendAlbum: (jid: string, items: Array<{
        image?: any;
        video?: any;
        caption?: string;
    }>, options?: {
        caption?: string;
        quoted?: any;
    }) => Promise<WebMessageInfo>;
    sendPoll: (jid: string, data: {
        question: string;
        options: string[];
        selectableCount?: number;
        multiSelect?: boolean;
    }) => Promise<WebMessageInfo>;
    sendReaction: (key: MessageKey, emoji: string) => Promise<WebMessageInfo>;
    end: (error?: Error) => void;
    logout: () => Promise<void>;
    user?: {
        id: string;
        name?: string;
    };
}
/**
 * Creates and initializes a Kazewa WhatsApp Web socket instance
 */
export declare function makeWASocket(config?: SocketConfig): Promise<WASocket>;
export default makeWASocket;
//# sourceMappingURL=makeWASocket.d.ts.map