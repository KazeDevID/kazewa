/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Proto Message Builder Helpers (Enhanced like @itsliaaa/baileys)
 * Simplifies constructing complex WhatsApp messages, interactive buttons, carousels & stickers
 */
export class MessageBuilder {
    /**
     * Builds standardized ContextInfo metadata (mentions, quoted message, external ad reply, AI badge)
     */
    static buildContextInfo(info) {
        if (!info)
            return undefined;
        const context = {};
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
            context.aiIcon = true;
            context.botInfo = {
                targetId: 'Meta AI',
                senderPersonaId: 'Kazewa-AI-Agent'
            };
        }
        return context;
    }
    /**
     * Build text or extended text message
     */
    static text(text, options = {}) {
        const contextInfo = {
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
    static image(image, caption, options = {}) {
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
    static video(video, caption, options = {}) {
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
    static audio(audio, options = {}) {
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
    static sticker(sticker, metadata = {}) {
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
    static album(items, options = {}) {
        return {
            text: options.caption || '',
            album: items,
            contextInfo: options.quoted ? { quotedMessage: options.quoted } : undefined
        };
    }
    /**
     * Build Interactive Message with buttons (Reply, URL, Call, Copy Code)
     */
    static interactive(data) {
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
    static list(data) {
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
    static poll(data) {
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
    static reaction(key, emoji) {
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
    static pin(key, durationSeconds = 86400 * 7) {
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
    static location(coords) {
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
    static contact(name, phoneNumber, organization = 'WhatsApp User') {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const vcard = `BEGIN:VCARD\n` +
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
    static newsletter(newsletterJid, text, options = {}) {
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
    static createStickerExif(packName, author, categories = ['🤖']) {
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
//# sourceMappingURL=index.js.map