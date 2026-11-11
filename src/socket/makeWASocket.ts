/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Main Socket Factory for Kazewa WhatsApp Web Engine
 * Powered by battle-tested WhatsApp Web Multi-Device protocol with Rock-Solid Pairing Code
 */

import baileysMakeWASocket, {
  Browsers,
  DisconnectReason,
  type WASocket as BaileysWASocket,
  type UserFacingSocketConfig,
  type AnyMessageContent,
  type MiscMessageGenerationOptions
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { useCompactAuthState } from '../auth/compactAuth.js';
import { MessageBuilder } from '../builder/index.js';
import type {
  AuthenticationState,
  ConnectionUpdate,
  InteractiveButton,
  MessageContent,
  MessageKey,
  SocketConfig,
  WebMessageInfo
} from '../types/index.js';

export interface KazewaSocket extends BaileysWASocket {
  requestPairingCode: (phoneNumber: string, customPairingCode?: string) => Promise<string>;
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
}

export type WASocket = KazewaSocket;

/**
 * Normalizes phone numbers to standard international WhatsApp format without leading + or 0
 * Examples: '08123456789' -> '628123456789', '+62 812-3456' -> '628123456'
 */
export function sanitizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Creates and initializes a Kazewa WhatsApp Web socket instance.
 * Features ultra-compact session storage and rock-solid pairing code connection.
 */
export async function makeWASocket(config: SocketConfig = {}): Promise<KazewaSocket> {
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

  const logger = config.logger || pino({ level: 'silent' });

  // Use rock-solid Linux Chrome browser header for maximum pairing acceptance
  const browserTuple = config.browser || Browsers.ubuntu('Chrome');

  const baileysConfig: UserFacingSocketConfig = {
    auth: authState as any,
    logger,
    printQRInTerminal: config.printQRInTerminal ?? false,
    browser: browserTuple,
    syncFullHistory: config.syncFullHistory ?? false,
    markOnlineOnConnect: config.markOnlineOnConnect ?? false,
    connectTimeoutMs: config.connectTimeoutMs || 60_000,
    keepAliveIntervalMs: config.keepAliveIntervalMs || 25_000,
    defaultQueryTimeoutMs: config.defaultQueryTimeoutMs || 60_000
  };

  const sock = baileysMakeWASocket(baileysConfig) as KazewaSocket;

  // Track socket readiness for pairing code registration
  let isSocketReadyForPairing = false;

  sock.ev.on('connection.update', (update: any) => {
    if (update.qr || update.connection === 'open' || update.receivedPendingNotifications) {
      isSocketReadyForPairing = true;
    }
  });

  /**
   * Request rock-solid 8-digit Pairing Code for WhatsApp Web.
   * Auto-formats to international E.164, waits for gateway handshake,
   * transmits pairing request to WhatsApp servers, and returns formatted "XXXX-XXXX".
   */
  const originalRequestPairingCode = sock.requestPairingCode.bind(sock);

  sock.requestPairingCode = async (phoneNumber: string, customPairingCode?: string): Promise<string> => {
    const cleanPhone = sanitizePhoneNumber(phoneNumber);
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      throw new Error(
        `Nomor telepon "${phoneNumber}" tidak valid. Gunakan format internasional (contoh: 628123456789).`
      );
    }

    if (sock.authState?.creds?.registered) {
      throw new Error('Akun WhatsApp ini sudah terdaftar/terhubung dalam session.');
    }

    // If socket has not received initial challenge, wait up to 5 seconds for gateway
    if (!isSocketReadyForPairing) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          resolve(); // proceed to request anyway
        }, 5000);

        const onReady = (update: any) => {
          if (update.qr || update.connection === 'open' || update.receivedPendingNotifications) {
            cleanup();
            resolve();
          } else if (update.connection === 'close') {
            cleanup();
            const err = update.lastDisconnect?.error;
            reject(new Error(`Koneksi ke server WhatsApp tertutup: ${err?.message || 'Connection closed'}`));
          }
        };

        const cleanup = () => {
          clearTimeout(timeout);
          sock.ev.off('connection.update', onReady);
        };

        sock.ev.on('connection.update', onReady);
      });
    }

    // Request pairing code through native WhatsApp protocol
    const rawCode = await originalRequestPairingCode(cleanPhone, customPairingCode);
    const formatted = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;

    // Emit connection update with pairingCode
    sock.ev.emit('connection.update', {
      connection: 'connecting',
      pairingCode: formatted
    } as any);

    return formatted;
  };

  /**
   * Send interactive message with buttons
   */
  sock.sendInteractive = async (
    jid: string,
    data: {
      title?: string;
      body: string;
      footer?: string;
      buttons: InteractiveButton[];
      quoted?: any;
    }
  ) => {
    const content = MessageBuilder.interactive(data);
    return sock.sendMessage(jid, content as any, { quoted: data.quoted });
  };

  /**
   * Send album / carousel message
   */
  sock.sendAlbum = async (
    jid: string,
    items: Array<{ image?: any; video?: any; caption?: string }>,
    options: { caption?: string; quoted?: any } = {}
  ) => {
    const content = MessageBuilder.album(items, options);
    return sock.sendMessage(jid, content as any, { quoted: options.quoted });
  };

  /**
   * Send poll message
   */
  sock.sendPoll = async (
    jid: string,
    data: { question: string; options: string[]; selectableCount?: number; multiSelect?: boolean }
  ) => {
    const content = MessageBuilder.poll(data);
    return sock.sendMessage(jid, content as any);
  };

  /**
   * Send emoji reaction
   */
  sock.sendReaction = async (key: MessageKey, emoji: string) => {
    const content = MessageBuilder.reaction(key, emoji);
    return sock.sendMessage(key.remoteJid, content as any);
  };

  return sock;
}

export default makeWASocket;
