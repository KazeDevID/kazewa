/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Protobuf Definitions & Helper Factories for WhatsApp Web protocol
 */
export declare namespace proto {
    interface IString {
        value?: string;
    }
    interface IContextInfo {
        stanzaId?: string;
        participant?: string;
        quotedMessage?: IMessage;
        remoteJid?: string;
        mentionedJid?: string[];
        conversionSource?: string;
        conversionData?: Uint8Array;
        conversionDelaySeconds?: number;
        forwardingScore?: number;
        isForwarded?: boolean;
        externalAdReply?: {
            title?: string;
            body?: string;
            mediaType?: number;
            thumbnailUrl?: string;
            thumbnail?: Uint8Array;
            sourceType?: string;
            sourceId?: string;
            sourceUrl?: string;
            renderLargerThumbnail?: boolean;
            showAdAttribution?: boolean;
        };
        entryPointConversionSource?: string;
        entryPointConversionApp?: string;
        entryPointConversionDelaySeconds?: number;
        disappearingMode?: {
            initiator?: number;
        };
        actionLink?: {
            url?: string;
            buttonTitle?: string;
        };
        groupSubject?: string;
        parentGroupJid?: string;
        trustBannerType?: string;
        trustBannerAction?: number;
        isSampled?: boolean;
        groupMentions?: Array<{
            groupJid?: string;
            groupSubject?: string;
        }>;
        botInfo?: {
            editTargetId?: string;
            targetId?: string;
            targetChatJid?: string;
            senderPersonaId?: string;
        };
        aiIcon?: boolean;
    }
    interface IExtendedTextMessage {
        text?: string;
        matchedText?: string;
        canonicalUrl?: string;
        description?: string;
        title?: string;
        textArgb?: number;
        backgroundArgb?: number;
        font?: number;
        previewType?: number;
        jpegThumbnail?: Uint8Array;
        contextInfo?: IContextInfo;
        doNotPlayInline?: boolean;
    }
    interface IImageMessage {
        url?: string;
        mimetype?: string;
        caption?: string;
        fileSha256?: Uint8Array;
        fileLength?: number | string;
        height?: number;
        width?: number;
        mediaKey?: Uint8Array;
        fileEncSha256?: Uint8Array;
        interactiveAnnotations?: any[];
        directPath?: string;
        mediaKeyTimestamp?: number;
        jpegThumbnail?: Uint8Array;
        contextInfo?: IContextInfo;
        firstScanSidecar?: Uint8Array;
        firstScanLength?: number;
        experimentGroupId?: number;
        scansSidecar?: Uint8Array;
        scanLengths?: number[];
        midQualityFileSha256?: Uint8Array;
        viewOnce?: boolean;
    }
    interface IVideoMessage {
        url?: string;
        mimetype?: string;
        fileSha256?: Uint8Array;
        fileLength?: number | string;
        seconds?: number;
        mediaKey?: Uint8Array;
        caption?: string;
        gifPlayback?: boolean;
        jpegThumbnail?: Uint8Array;
        contextInfo?: IContextInfo;
        viewOnce?: boolean;
        ptv?: boolean;
    }
    interface IAudioMessage {
        url?: string;
        mimetype?: string;
        fileSha256?: Uint8Array;
        fileLength?: number | string;
        seconds?: number;
        ptt?: boolean;
        mediaKey?: Uint8Array;
        waveform?: Uint8Array;
        contextInfo?: IContextInfo;
    }
    interface IStickerMessage {
        url?: string;
        fileSha256?: Uint8Array;
        fileEncSha256?: Uint8Array;
        mediaKey?: Uint8Array;
        mimetype?: string;
        height?: number;
        width?: number;
        directPath?: string;
        fileLength?: number | string;
        mediaKeyTimestamp?: number;
        isAvatar?: boolean;
        isAi?: boolean;
        isLottie?: boolean;
        contextInfo?: IContextInfo;
    }
    interface IInteractiveMessage {
        header?: {
            title?: string;
            subtitle?: string;
            hasMediaAttachment?: boolean;
            imageMessage?: IImageMessage;
            videoMessage?: IVideoMessage;
        };
        body?: {
            text?: string;
        };
        footer?: {
            text?: string;
        };
        nativeFlowMessage?: {
            buttons?: Array<{
                name: string;
                buttonParamsJson: string;
            }>;
            messageVersion?: number;
        };
        carouselMessage?: {
            cards?: any[];
            messageVersion?: number;
        };
        contextInfo?: IContextInfo;
    }
    interface IPollCreationMessage {
        encKey?: Uint8Array;
        name?: string;
        options?: Array<{
            optionName?: string;
        }>;
        selectableOptionsCount?: number;
        contextInfo?: IContextInfo;
    }
    interface IReactionMessage {
        key?: {
            remoteJid?: string;
            fromMe?: boolean;
            id?: string;
        };
        text?: string;
        groupingKey?: string;
        senderTimestampMs?: number;
    }
    interface IPinInChatMessage {
        key?: {
            remoteJid?: string;
            fromMe?: boolean;
            id?: string;
        };
        type?: number;
        senderTimestampMs?: number;
    }
    interface IMessage {
        conversation?: string;
        extendedTextMessage?: IExtendedTextMessage;
        imageMessage?: IImageMessage;
        videoMessage?: IVideoMessage;
        audioMessage?: IAudioMessage;
        documentMessage?: any;
        stickerMessage?: IStickerMessage;
        interactiveMessage?: IInteractiveMessage;
        pollCreationMessage?: IPollCreationMessage;
        pollCreationMessageV2?: IPollCreationMessage;
        pollCreationMessageV3?: IPollCreationMessage;
        reactionMessage?: IReactionMessage;
        pinInChatMessage?: IPinInChatMessage;
        albumMessage?: any;
        locationMessage?: any;
        contactMessage?: any;
        viewOnceMessage?: {
            message?: IMessage;
        };
        viewOnceMessageV2?: {
            message?: IMessage;
        };
    }
    interface IWebMessageInfo {
        key: {
            remoteJid?: string;
            fromMe?: boolean;
            id?: string;
            participant?: string;
        };
        message?: IMessage;
        messageTimestamp?: number;
        status?: number;
        participant?: string;
        messageC2STimestamp?: number;
        ignore?: boolean;
        starred?: boolean;
        broadcast?: boolean;
        pushName?: string;
    }
    const Message: {
        fromObject(obj: any): IMessage;
        encode(msg: IMessage): {
            finish: () => Uint8Array;
        };
        decode(data: Uint8Array | Buffer): IMessage;
    };
    const WebMessageInfo: {
        fromObject(obj: any): IWebMessageInfo;
    };
}
//# sourceMappingURL=index.d.ts.map