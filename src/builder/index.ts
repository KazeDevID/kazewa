/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Proto Message Builder Helpers (Enhanced like @itsliaaa/baileys)
 * Simplifies constructing complex WhatsApp messages, interactive buttons, carousels & stickers
 */

import { proto } from '../proto/index.js';
import type {
  ContextInfo,
  InteractiveButton,
  ListSection,
  MessageContent,
  MessageKey,
  PollOption
} from '../types/index.js';

export interface ExifMetadata {
  packName?: string;
  author?: string;
  categories?: string[];
  isAvatar?: boolean;
}

export class MessageBuilder {
  /**
   * Builds standardized ContextInfo metadata (mentions, quoted message, external ad reply, AI badge)
   */
  public static buildContextInfo(info?: ContextInfo): proto.IContextInfo | undefined {
    if (!info) return undefined;

    const context: proto.IContextInfo = {};

    if (info.quotedMessage) {
      context.quotedMessage = info.quotedMessage;
      context.stanzaId = info.stanzaId || info.quotedMessage?.key?.id;
      context.participant = info.participant || info.quotedMessage?.key?.participant;
    }

    if (info.mentionedJid && info.mentionedJid.length > 0) {
      context.mentionedJid = info.mentionedJid;
    }

    if (info.isForwarded) {
      context.isForwarded = true;
      context.forwardingScore = info.forwardingScore || 1;
    }

    if (info.externalAdReply) {
      context.externalAdReply = {
        title: info.externalAdReply.title,
        body: info.externalAdReply.body,
        mediaType: info.externalAdReply.mediaType || 1,
        thumbnailUrl: info.externalAdReply.thumbnailUrl,
        thumbnail: info.externalAdReply.thumbnail
          ? new Uint8Array(Buffer.from(info.externalAdReply.thumbnail))
          : undefined,
        sourceUrl: info.externalAdReply.sourceUrl,
        renderLargerThumbnail: info.externalAdReply.renderLargerThumbnail ?? true,
        showAdAttribution: info.externalAdReply.showAdAttribution ?? true
      };
    }

    if (info.aiIcon) {
      (context as any).aiIcon = true;
      (context as any).botInfo = {
        targetId: 'Meta AI',
        senderPersonaId: 'Kazewa-AI-Agent'
      };
    }

    return context;
  }

  /**
   * Build text or extended text message
   */
  public static text(
    text: string,
    options: {
      mentions?: string[];
      quoted?: any;
      contextInfo?: ContextInfo;
      aiIcon?: boolean;
    } = {}
  ): MessageContent {
    const contextInfo: ContextInfo = {
      ...(options.contextInfo || {}),
      mentionedJid: options.mentions || options.contextInfo?.mentionedJid,
      quotedMessage: options.quoted || options.contextInfo?.quotedMessage,
      aiIcon: options.aiIcon || options.contextInfo?.aiIcon
    };

    return {
      text,
      contextInfo
    };
  }

  /**
   * Build Image message
   */
  public static image(
    image: Buffer | Uint8Array | string,
    caption?: string,
    options: { mentions?: string[]; quoted?: any; contextInfo?: ContextInfo } = {}
  ): MessageContent {
    return {
      image,
      caption,
      contextInfo: {
        ...(options.contextInfo || {}),
        mentionedJid: options.mentions,
        quotedMessage: options.quoted
      }
    };
  }

  /**
   * Build Video message
   */
  public static video(
    video: Buffer | Uint8Array | string,
    caption?: string,
    options: { mentions?: string[]; quoted?: any; contextInfo?: ContextInfo } = {}
  ): MessageContent {
    return {
      video,
      caption,
      contextInfo: {
        ...(options.contextInfo || {}),
        mentionedJid: options.mentions,
        quotedMessage: options.quoted
      }
    };
  }

  /**
   * Build Voice Note / Audio message
   */
  public static audio(
    audio: Buffer | Uint8Array | string,
    options: { ptt?: boolean; mimetype?: string; quoted?: any } = {}
  ): MessageContent {
    return {
      audio,
      ptt: options.ptt !== false, // default voice note PTT = true
      mimetype: options.mimetype || 'audio/ogg; codecs=opus',
      contextInfo: options.quoted ? { quotedMessage: options.quoted } : undefined
    };
  }

  /**
   * Build Sticker message with Exif metadata chunk generator
   */
  public static sticker(
    sticker: Buffer | Uint8Array | string,
    metadata: ExifMetadata = {}
  ): MessageContent {
    return {
      sticker,
      mimetype: 'image/webp',
      contextInfo: {
        externalAdReply: metadata.packName
          ? {
              title: metadata.packName,
              body: metadata.author || 'Created with Kazewa'
            }
          : undefined
      }
    };
  }

  /**
   * Build Carousel Album message (multiple images/videos)
   */
  public static album(
    items: Array<{
      image?: Buffer | Uint8Array | string;
      video?: Buffer | Uint8Array | string;
      caption?: string;
    }>,
    options: { caption?: string; quoted?: any } = {}
  ): MessageContent {
    return {
      text: options.caption || '',
      album: items,
      contextInfo: options.quoted ? { quotedMessage: options.quoted } : undefined
    };
  }

  /**
   * Build Interactive Message with buttons (Reply, URL, Call, Copy Code)
   */
  public static interactive(data: {
    title?: string;
    body: string;
    footer?: string;
    headerType?: 'TEXT' | 'IMAGE' | 'VIDEO';
    headerMedia?: Buffer | Uint8Array | string;
    buttons: InteractiveButton[];
    quoted?: any;
    aiIcon?: boolean;
  }): MessageContent {
    return {
      interactive: {
        title: data.title,
        body: data.body,
        footer: data.footer,
        headerType: data.headerType || 'TEXT',
        headerMedia: data.headerMedia,
        buttons: data.buttons
      },
      contextInfo: {
        quotedMessage: data.quoted,
        aiIcon: data.aiIcon
      }
    };
  }

  /**
   * Build List / Sectioned Dropdown Message
   */
  public static list(data: {
    title: string;
    description: string;
    buttonText: string;
    footerText?: string;
    sections: ListSection[];
    quoted?: any;
  }): MessageContent {
    return {
      list: {
        title: data.title,
        description: data.description,
        buttonText: data.buttonText,
        footerText: data.footerText,
        sections: data.sections
      },
      contextInfo: data.quoted ? { quotedMessage: data.quoted } : undefined
    };
  }

  /**
   * Build Interactive Poll Message (Single / Multi Choice)
   */
  public static poll(data: {
    question: string;
    options: string[];
    selectableCount?: number;
    multiSelect?: boolean;
    quoted?: any;
  }): MessageContent {
    return {
      poll: {
        name: data.question,
        values: data.options,
        selectableCount: data.multiSelect === false ? 1 : data.selectableCount || data.options.length,
        multiSelect: data.multiSelect ?? true
      },
      contextInfo: data.quoted ? { quotedMessage: data.quoted } : undefined
    };
  }

  /**
   * Build Emoji Reaction message
   */
  public static reaction(key: MessageKey, emoji: string): MessageContent {
    return {
      react: {
        key,
        text: emoji
      }
    };
  }

  /**
   * Build Pin Message (24h, 7 days, 30 days)
   */
  public static pin(key: MessageKey, durationSeconds: number = 86400 * 7): MessageContent {
    return {
      pin: {
        key,
        time: durationSeconds
      }
    };
  }

  /**
   * Build Location message
   */
  public static location(coords: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }): MessageContent {
    return {
      location: {
        degreesLatitude: coords.latitude,
        degreesLongitude: coords.longitude,
        name: coords.name,
        address: coords.address
      }
    };
  }

  /**
   * Build Contact / vCard message
   */
  public static contact(name: string, phoneNumber: string, organization: string = 'WhatsApp User'): MessageContent {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const vcard =
      `BEGIN:VCARD\n` +
      `VERSION:3.0\n` +
      `FN:${name}\n` +
      `ORG:${organization};\n` +
      `TEL;type=CELL;type=VOICE;waid=${cleanPhone}:+${cleanPhone}\n` +
      `END:VCARD`;

    return {
      contact: {
        displayName: name,
        vcard
      }
    };
  }

  /**
   * Build Newsletter / Channel message
   */
  public static newsletter(newsletterJid: string, text: string, options: { name?: string } = {}): MessageContent {
    return {
      text,
      newsletter: {
        jid: newsletterJid,
        name: options.name || 'Official Channel'
      }
    };
  }

  /**
   * WebP Exif metadata chunk builder for custom sticker packs
   */
  public static createStickerExif(packName: string, author: string, categories: string[] = ['🤖']): Buffer {
    const json = {
      'sticker-pack-id': 'com.kazedevid.kazewa',
      'sticker-pack-name': packName,
      'sticker-pack-publisher': author,
      emojis: categories
    };

    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);

    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);

    return exif;
  }
}
