/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa WhatsApp Web Bot API & Protocol Library
 */

import type {
  AuthenticationCreds as BaileysAuthenticationCreds,
  AuthenticationState as BaileysAuthenticationState,
  SignalAuthState as BaileysSignalAuthState,
  SignalKeyStore as BaileysSignalKeyStore,
  ConnectionState as BaileysConnectionState,
  DisconnectReason as BaileysDisconnectReason,
  proto
} from '@whiskeysockets/baileys';

export type DisconnectReason = BaileysDisconnectReason | string | number;
export type AuthenticationCreds = BaileysAuthenticationCreds;
export type AuthenticationState = BaileysAuthenticationState;
export type SignalAuthState = BaileysSignalAuthState;
export type SignalKeyStore = BaileysSignalKeyStore;
export type ConnectionState = BaileysConnectionState;

export interface KeyPair {
  public: Uint8Array;
  private: Uint8Array;
}

export interface SignedKeyPair extends KeyPair {
  signature: Uint8Array;
  keyId: number;
}

export interface CompactAuthStats {
  filePath?: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  keysCount: number;
  sessionCount: number;
  preKeysCount: number;
  compressionRatio: string;
  lastSavedAt: number;
}

export interface CompactAuthResult {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  exportSessionString: () => string;
  getStats: () => Promise<CompactAuthStats>;
  cleanStaleKeys: () => Promise<number>;
}

export interface ConnectionUpdate {
  connection?: ConnectionState;
  lastDisconnect?: {
    error?: Error;
    date?: Date;
    reason?: any;
  };
  qr?: string;
  qrDataUrl?: string;
  pairingCode?: string;
  isNewLogin?: boolean;
  receivedPendingNotifications?: boolean;
}

export interface MessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
  participant?: string;
}

export interface ContextInfo {
  stanzaId?: string;
  participant?: string;
  quotedMessage?: any;
  mentionedJid?: string[];
  conversionSource?: string;
  isForwarded?: boolean;
  forwardingScore?: number;
  externalAdReply?: {
    title?: string;
    body?: string;
    previewType?: 'NONE' | 'PHOTO' | 'VIDEO';
    thumbnailUrl?: string;
    thumbnail?: Buffer | Uint8Array;
    sourceUrl?: string;
    mediaType?: number;
    renderLargerThumbnail?: boolean;
    showAdAttribution?: boolean;
  };
  aiIcon?: boolean;
}

export interface InteractiveButton {
  type: 'reply' | 'url' | 'call' | 'copy';
  id?: string;
  text: string;
  url?: string;
  phoneNumber?: string;
  copyCode?: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface PollOption {
  optionName: string;
}

export interface AlbumItem {
  image?: Buffer | Uint8Array | string;
  video?: Buffer | Uint8Array | string;
  caption?: string;
}

export interface MessageContent {
  text?: string;
  caption?: string;
  image?: Buffer | Uint8Array | string;
  video?: Buffer | Uint8Array | string;
  audio?: Buffer | Uint8Array | string;
  document?: Buffer | Uint8Array | string;
  sticker?: Buffer | Uint8Array | string;
  mimetype?: string;
  fileName?: string;
  ptt?: boolean;
  contextInfo?: ContextInfo;
  mentions?: string[];
  edit?: MessageKey;
  delete?: MessageKey;
  react?: {
    text: string;
    key: MessageKey;
  };
  pin?: {
    key: MessageKey;
    time?: number; // 24h, 7d, 30d
  };
  poll?: {
    name: string;
    values: string[];
    selectableCount?: number;
    multiSelect?: boolean;
  };
  interactive?: {
    title?: string;
    body: string;
    footer?: string;
    headerType?: 'TEXT' | 'IMAGE' | 'VIDEO';
    headerMedia?: Buffer | Uint8Array | string;
    buttons: InteractiveButton[];
  };
  list?: {
    title: string;
    description: string;
    buttonText: string;
    footerText?: string;
    sections: ListSection[];
  };
  album?: AlbumItem[];
  location?: {
    degreesLatitude: number;
    degreesLongitude: number;
    name?: string;
    address?: string;
  };
  contact?: {
    displayName: string;
    vcard: string;
  };
  newsletter?: {
    jid: string;
    name?: string;
  };
}

export interface WebMessageInfo {
  key: MessageKey;
  message?: MessageContent;
  messageTimestamp: number;
  status?: 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ';
  participant?: string;
  pushName?: string;
  broadcast?: boolean;
}

export interface SocketConfig {
  auth?: AuthenticationState;
  printQRInTerminal?: boolean;
  browser?: [string, string, string]; // [OS, Browser, Version]
  syncFullHistory?: boolean;
  markOnlineOnConnect?: boolean;
  connectTimeoutMs?: number;
  keepAliveIntervalMs?: number;
  maxRetries?: number;
  defaultQueryTimeoutMs?: number;
  logger?: any;
}

export type EventMap = {
  'connection.update': (update: ConnectionUpdate) => void;
  'creds.update': (creds: AuthenticationCreds) => void;
  'messages.upsert': (data: { messages: any[]; type: 'notify' | 'append' }) => void;
  'messages.update': (data: { key: MessageKey; update: Partial<WebMessageInfo> }[]) => void;
  'presence.update': (data: { id: string; presences: { [participant: string]: { lastKnownPresence: string } } }) => void;
  'groups.update': (data: any) => void;
};
