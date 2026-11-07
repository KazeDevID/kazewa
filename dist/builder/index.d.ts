/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Proto Message Builder Helpers (Enhanced like @itsliaaa/baileys)
 * Simplifies constructing complex WhatsApp messages, interactive buttons, carousels & stickers
 */
import { proto } from '../proto/index.js';
import type { ContextInfo, InteractiveButton, ListSection, MessageContent, MessageKey } from '../types/index.js';
export interface ExifMetadata {
    packName?: string;
    author?: string;
    categories?: string[];
    isAvatar?: boolean;
}
export declare class MessageBuilder {
    /**
     * Builds standardized ContextInfo metadata (mentions, quoted message, external ad reply, AI badge)
     */
    static buildContextInfo(info?: ContextInfo): proto.IContextInfo | undefined;
    /**
     * Build text or extended text message
     */
    static text(text: string, options?: {
        mentions?: string[];
        quoted?: any;
        contextInfo?: ContextInfo;
        aiIcon?: boolean;
    }): MessageContent;
    /**
     * Build Image message
     */
    static image(image: Buffer | Uint8Array | string, caption?: string, options?: {
        mentions?: string[];
        quoted?: any;
        contextInfo?: ContextInfo;
    }): MessageContent;
    /**
     * Build Video message
     */
    static video(video: Buffer | Uint8Array | string, caption?: string, options?: {
        mentions?: string[];
        quoted?: any;
        contextInfo?: ContextInfo;
    }): MessageContent;
    /**
     * Build Voice Note / Audio message
     */
    static audio(audio: Buffer | Uint8Array | string, options?: {
        ptt?: boolean;
        mimetype?: string;
        quoted?: any;
    }): MessageContent;
    /**
     * Build Sticker message with Exif metadata chunk generator
     */
    static sticker(sticker: Buffer | Uint8Array | string, metadata?: ExifMetadata): MessageContent;
    /**
     * Build Carousel Album message (multiple images/videos)
     */
    static album(items: Array<{
        image?: Buffer | Uint8Array | string;
        video?: Buffer | Uint8Array | string;
        caption?: string;
    }>, options?: {
        caption?: string;
        quoted?: any;
    }): MessageContent;
    /**
     * Build Interactive Message with buttons (Reply, URL, Call, Copy Code)
     */
    static interactive(data: {
        title?: string;
        body: string;
        footer?: string;
        headerType?: 'TEXT' | 'IMAGE' | 'VIDEO';
        headerMedia?: Buffer | Uint8Array | string;
        buttons: InteractiveButton[];
        quoted?: any;
        aiIcon?: boolean;
    }): MessageContent;
    /**
     * Build List / Sectioned Dropdown Message
     */
    static list(data: {
        title: string;
        description: string;
        buttonText: string;
        footerText?: string;
        sections: ListSection[];
        quoted?: any;
    }): MessageContent;
    /**
     * Build Interactive Poll Message (Single / Multi Choice)
     */
    static poll(data: {
        question: string;
        options: string[];
        selectableCount?: number;
        multiSelect?: boolean;
        quoted?: any;
    }): MessageContent;
    /**
     * Build Emoji Reaction message
     */
    static reaction(key: MessageKey, emoji: string): MessageContent;
    /**
     * Build Pin Message (24h, 7 days, 30 days)
     */
    static pin(key: MessageKey, durationSeconds?: number): MessageContent;
    /**
     * Build Location message
     */
    static location(coords: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
    }): MessageContent;
    /**
     * Build Contact / vCard message
     */
    static contact(name: string, phoneNumber: string, organization?: string): MessageContent;
    /**
     * Build Newsletter / Channel message
     */
    static newsletter(newsletterJid: string, text: string, options?: {
        name?: string;
    }): MessageContent;
    /**
     * WebP Exif metadata chunk builder for custom sticker packs
     */
    static createStickerExif(packName: string, author: string, categories?: string[]): Buffer;
}
//# sourceMappingURL=index.d.ts.map