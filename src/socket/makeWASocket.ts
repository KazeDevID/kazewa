/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa WhatsApp Web Engine - Rock-Solid Dual Pairing & Compact Session Socket
 */

import baileysDefault, {
  Browsers,
  DisconnectReason as BaileysDisconnectReason,
  proto as baileysProto
} from '@whiskeysockets/baileys';
import pino from 'pino';
import type {
  AuthenticationState,
  ConnectionUpdate,
  EventMap,
  InteractiveButton,
  MessageContent,
  MessageKey,
  SocketConfig,
  WebMessageInfo
} from '../types/index.js';
import { useCompactAuthState } from '../auth/compactAuth.js';
import { MessageBuilder } from '../builder/index.js';
import { defaultLogger } from '../utils/logger.js';

const makeBaileysSocket = (baileysDefault as any).default || baileysDefault;

export interface WASocket {
  ev: {
    on<T extends keyof EventMap>(event: T, listener: EventMap[T]): void;
    off<T extends keyof EventMap>(event: T, listener: EventMap[T]): void;
    emit<T extends keyof EventMap>(event: T, ...args: Parameters<EventMap[T]>): boolean;
  };
  authState: AuthenticationState;
  requestPairingCode: (phoneNumber: string, customPairingCode?: string) => Promise<string>;
  sendMessage: (
    jid: string,
    content: MessageContent,
    options?: { quoted?: any; mentions?: string[] }
  ) => Promise<any>;
  sendInteractive: (
    jid: string,
    data: {
      title?: string;
      body: string;
      footer?: string;
      buttons: InteractiveButton[];
      quoted?: any;
    }
  ) => Promise<any>;
  sendAlbum: (
    jid: string,
    items: Array<{ image?: any; video?: any; caption?: string }>,
    options?: { caption?: string; quoted?: any }
  ) => Promise<any>;
  sendPoll: (
    jid: string,
    data: { question: string; options: string[]; selectableCount?: number; multiSelect?: boolean }
  ) => Promise<any>;
  sendReaction: (key: MessageKey, emoji: string) => Promise<any>;
  end: (error?: Error) => void;
  logout: () => Promise<void>;
  user?: { id: string; name?: string };
}

/**
 * Sanitize and normalize phone number into clean international format
 */
export function sanitizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.slice(1);
  }
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Creates and initializes a Kazewa WhatsApp Web socket instance
 * Enhanced with automated QR-readiness sync for 100% reliable pairing codes
 */
export async function makeWASocket(config: SocketConfig = {}): Promise<WASocket> {
  const logger = config.logger || defaultLogger;

  // Resolve or initialize auth state
  let authState: AuthenticationState;
  let saveCredsHandler: () => Promise<void>;

  if (config.auth) {
    authState = config.auth;
    saveCredsHandler = async () => {};
  } else {
    const compactAuth = await useCompactAuthState('./session.kaze');
    authState = compactAuth.state;
    saveCredsHandler = compactAuth.saveCreds;
  }

  // Internal silent pino logger for baileys core
  const baileysLogger = pino({ level: 'silent' });

  // Initialize the real WhatsApp Web MD socket
  const innerSock = makeBaileysSocket({
    auth: authState as any,
    logger: baileysLogger,
    printQRInTerminal: config.printQRInTerminal ?? false,
    browser: config.browser || Browsers.ubuntu('Chrome'),
    syncFullHistory: config.syncFullHistory ?? false,
    markOnlineOnConnect: config.markOnlineOnConnect ?? true,
    connectTimeoutMs: config.connectTimeoutMs || 60_000,
    keepAliveIntervalMs: config.keepAliveIntervalMs || 25_000,
    defaultQueryTimeoutMs: config.defaultQueryTimeoutMs || 60_000
  });

  let hasReceivedQR = false;

  innerSock.ev.on('connection.update', (update: any) => {
    if (update.qr) {
      hasReceivedQR = true;
    }
  });

  /**
   * Request rock-solid 8-digit Pairing Code for WhatsApp Web
   * Automatically synchronizes with WhatsApp Noise handshake completion
   */
  const requestPairingCode = async (phoneNumber: string, customPairingCode?: string): Promise<string> => {
    const cleanPhone = sanitizePhoneNumber(phoneNumber);
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      throw new Error(`Nomor telepon "${phoneNumber}" tidak valid. Gunakan format internasional (contoh: 628123456789).`);
    }

    if (innerSock.authState?.creds?.registered) {
      throw new Error('Sesi ini sudah terdaftar dan terhubung ke WhatsApp.');
    }

    // Helper to format 8-char code as XXXX-XXXX
    const formatCode = (raw: string) => {
      if (raw && raw.length === 8) {
        return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
      }
      return raw;
    };

    // If WhatsApp has already emitted QR, the socket is already authenticated and ready
    if (hasReceivedQR) {
      const rawCode = await innerSock.requestPairingCode(cleanPhone, customPairingCode);
      return formatCode(rawCode);
    }

    // Otherwise, wait for the socket connection & QR challenge node before requesting pairing code
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        innerSock.ev.off('connection.update', onUpdate);
        reject(new Error('Koneksi ke server WhatsApp timed out saat inisialisasi pairing. Pastikan jaringan stabil.'));
      }, 30_000);

      const onUpdate = async (update: any) => {
        if (update.qr) {
          hasReceivedQR = true;
          clearTimeout(timeout);
          innerSock.ev.off('connection.update', onUpdate);
          try {
            const rawCode = await innerSock.requestPairingCode(cleanPhone, customPairingCode);
            resolve(formatCode(rawCode));
          } catch (err) {
            reject(err);
          }
        } else if (update.connection === 'close') {
          clearTimeout(timeout);
          innerSock.ev.off('connection.update', onUpdate);
          reject(new Error(update.lastDisconnect?.error?.message || 'Koneksi ke WhatsApp tertutup sebelum pairing siap.'));
        }
      };

      innerSock.ev.on('connection.update', onUpdate);
    });
  };

  const sendMessage = async (
    jid: string,
    content: MessageContent,
    options: { quoted?: any; mentions?: string[] } = {}
  ): Promise<any> => {
    const cleanJid = jid.includes('@') ? jid : `${jid.replace(/\D/g, '')}@s.whatsapp.net`;
    return innerSock.sendMessage(cleanJid, content as any, options as any);
  };

  const sendInteractive = async (
    jid: string,
    data: {
      title?: string;
      body: string;
      footer?: string;
      buttons: InteractiveButton[];
      quoted?: any;
    }
  ): Promise<any> => {
    const content = MessageBuilder.interactive(data);
    return sendMessage(jid, content, { quoted: data.quoted });
  };

  const sendAlbum = async (
    jid: string,
    items: Array<{ image?: any; video?: any; caption?: string }>,
    options: { caption?: string; quoted?: any } = {}
  ): Promise<any> => {
    const content = MessageBuilder.album(items, options);
    return sendMessage(jid, content, { quoted: options.quoted });
  };

  const sendPoll = async (
    jid: string,
    data: { question: string; options: string[]; selectableCount?: number; multiSelect?: boolean }
  ): Promise<any> => {
    const content = MessageBuilder.poll(data);
    return sendMessage(jid, content);
  };

  const sendReaction = async (key: MessageKey, emoji: string): Promise<any> => {
    const content = MessageBuilder.reaction(key, emoji);
    return sendMessage(key.remoteJid, content);
  };

  const end = (error?: Error) => {
    innerSock.end(error);
  };

  const logout = async () => {
    await innerSock.logout();
  };

  return {
    ev: innerSock.ev as any,
    authState: innerSock.authState as any,
    requestPairingCode,
    sendMessage,
    sendInteractive,
    sendAlbum,
    sendPoll,
    sendReaction,
    end,
    logout,
    user: innerSock.user as any
  };
}

export default makeWASocket;
