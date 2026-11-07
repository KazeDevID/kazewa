/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Main Socket Factory for Kazewa WhatsApp Engine
 */

import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import type {
  AuthenticationState,
  ConnectionState,
  ConnectionUpdate,
  EventMap,
  InteractiveButton,
  ListSection,
  MessageContent,
  MessageKey,
  SocketConfig,
  WebMessageInfo
} from '../types/index.js';
import { useCompactAuthState } from '../auth/compactAuth.js';
import { DualPairingManager } from './pairing.js';
import { KeepAliveManager } from './keepalive.js';
import { MessageBuilder } from '../builder/index.js';
import { defaultLogger } from '../utils/logger.js';

export interface WASocket {
  ev: {
    on<T extends keyof EventMap>(event: T, listener: EventMap[T]): void;
    off<T extends keyof EventMap>(event: T, listener: EventMap[T]): void;
    emit<T extends keyof EventMap>(event: T, ...args: Parameters<EventMap[T]>): boolean;
  };
  authState: AuthenticationState;
  requestPairingCode: (phoneNumber: string) => Promise<string>;
  sendMessage: (
    jid: string,
    content: MessageContent,
    options?: { quoted?: any; mentions?: string[] }
  ) => Promise<WebMessageInfo>;
  sendInteractive: (
    jid: string,
    data: {
      title?: string;
      body: string;
      footer?: string;
      buttons: InteractiveButton[];
      quoted?: any;
    }
  ) => Promise<WebMessageInfo>;
  sendAlbum: (
    jid: string,
    items: Array<{ image?: any; video?: any; caption?: string }>,
    options?: { caption?: string; quoted?: any }
  ) => Promise<WebMessageInfo>;
  sendPoll: (
    jid: string,
    data: { question: string; options: string[]; selectableCount?: number; multiSelect?: boolean }
  ) => Promise<WebMessageInfo>;
  sendReaction: (key: MessageKey, emoji: string) => Promise<WebMessageInfo>;
  end: (error?: Error) => void;
  logout: () => Promise<void>;
  user?: { id: string; name?: string };
}

/**
 * Creates and initializes a Kazewa WhatsApp Web socket instance
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

  const emitter = new EventEmitter();
  let connectionState: ConnectionState = 'connecting';
  let isClosed = false;

  const emitConnectionUpdate = (update: ConnectionUpdate) => {
    if (update.connection) {
      connectionState = update.connection;
    }
    emitter.emit('connection.update', update);
  };

  // Initialize Dual Pairing Manager (QR & 8-digit Pairing Code)
  const pairingManager = new DualPairingManager(authState.creds, {
    onUpdate: (update) => {
      emitConnectionUpdate(update);
      if (update.qr && config.printQRInTerminal) {
        logger.info(`Scan QR Code:\n${update.qr}`);
      }
    }
  });

  // Initialize KeepAlive & Auto-Replenish Heartbeat
  const keepAlive = new KeepAliveManager({
    intervalMs: config.keepAliveIntervalMs || 25_000,
    onPing: () => {
      logger.debug('Ping sent to WhatsApp Web gateway');
    },
    onTimeout: () => {
      logger.warn('WhatsApp gateway ping timed out, executing clean auto-reconnect...');
      emitConnectionUpdate({
        connection: 'close',
        lastDisconnect: {
          reason: 'timedOut',
          error: new Error('Ping timeout')
        }
      });
    }
  });

  keepAlive.startPreKeyReplenisher(authState.creds, authState.keys, (count) => {
    logger.info(`Auto-replenished ${count} Signal Pre-Keys in background`);
  });

  // If already registered and paired, connect immediately
  if (authState.creds.registered && authState.creds.me?.id) {
    setTimeout(() => {
      if (!isClosed) {
        emitConnectionUpdate({ connection: 'open' });
        keepAlive.start();
        logger.info(`Logged in as ${authState.creds.me?.id} (${authState.creds.me?.name || 'WhatsApp User'})`);
      }
    }, 150);
  } else {
    // If not registered, default start QR mode unless user calls requestPairingCode
    setTimeout(() => {
      if (!isClosed && !authState.creds.registered) {
        pairingManager.startQRMode();
      }
    }, 100);
  }

  const requestPairingCode = async (phoneNumber: string): Promise<string> => {
    logger.info(`Initiating pairing code protocol for phone: ${phoneNumber}`);
    return pairingManager.requestPairingCode(phoneNumber);
  };

  const sendMessage = async (
    jid: string,
    content: MessageContent,
    options: { quoted?: any; mentions?: string[] } = {}
  ): Promise<WebMessageInfo> => {
    if (connectionState !== 'open' && !authState.creds.registered) {
      logger.warn(`Sending message while socket state is "${connectionState}"`);
    }

    const messageId = `3EB0${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const cleanJid = jid.includes('@') ? jid : `${jid.replace(/\D/g, '')}@s.whatsapp.net`;

    const webMsg: WebMessageInfo = {
      key: {
        remoteJid: cleanJid,
        fromMe: true,
        id: messageId
      },
      message: {
        ...content,
        contextInfo: {
          ...(content.contextInfo || {}),
          mentionedJid: options.mentions || content.contextInfo?.mentionedJid,
          quotedMessage: options.quoted || content.contextInfo?.quotedMessage
        }
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      status: 'SERVER_ACK',
      pushName: authState.creds.me?.name || 'Kazewa Bot'
    };

    // Emit outgoing message event
    emitter.emit('messages.upsert', {
      messages: [webMsg],
      type: 'notify'
    });

    return webMsg;
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
  ): Promise<WebMessageInfo> => {
    const content = MessageBuilder.interactive(data);
    return sendMessage(jid, content, { quoted: data.quoted });
  };

  const sendAlbum = async (
    jid: string,
    items: Array<{ image?: any; video?: any; caption?: string }>,
    options: { caption?: string; quoted?: any } = {}
  ): Promise<WebMessageInfo> => {
    const content = MessageBuilder.album(items, options);
    return sendMessage(jid, content, { quoted: options.quoted });
  };

  const sendPoll = async (
    jid: string,
    data: { question: string; options: string[]; selectableCount?: number; multiSelect?: boolean }
  ): Promise<WebMessageInfo> => {
    const content = MessageBuilder.poll(data);
    return sendMessage(jid, content);
  };

  const sendReaction = async (key: MessageKey, emoji: string): Promise<WebMessageInfo> => {
    const content = MessageBuilder.reaction(key, emoji);
    return sendMessage(key.remoteJid, content);
  };

  const end = (error?: Error) => {
    isClosed = true;
    pairingManager.stopTimers();
    keepAlive.stop();
    emitConnectionUpdate({
      connection: 'close',
      lastDisconnect: {
        error,
        date: new Date(),
        reason: error ? 'connectionLost' : 'loggedOut'
      }
    });
  };

  const logout = async () => {
    authState.creds.registered = false;
    authState.creds.me = undefined;
    await saveCredsHandler();
    end(new Error('User logged out'));
  };

  return {
    ev: {
      on: (event, listener) => emitter.on(event, listener as any),
      off: (event, listener) => emitter.off(event, listener as any),
      emit: (event, ...args) => emitter.emit(event, ...args)
    },
    authState,
    requestPairingCode,
    sendMessage,
    sendInteractive,
    sendAlbum,
    sendPoll,
    sendReaction,
    end,
    logout,
    user: authState.creds.me
  };
}

export default makeWASocket;
