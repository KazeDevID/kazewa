"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Main Socket Factory for Kazewa WhatsApp Engine
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeWASocket = makeWASocket;
const node_events_1 = require("node:events");
const node_crypto_1 = __importDefault(require("node:crypto"));
const compactAuth_js_1 = require("../auth/compactAuth.js");
const pairing_js_1 = require("./pairing.js");
const keepalive_js_1 = require("./keepalive.js");
const index_js_1 = require("../builder/index.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Creates and initializes a Kazewa WhatsApp Web socket instance
 */
async function makeWASocket(config = {}) {
    const logger = config.logger || logger_js_1.defaultLogger;
    // Resolve or initialize auth state
    let authState;
    let saveCredsHandler;
    if (config.auth) {
        authState = config.auth;
        saveCredsHandler = async () => { };
    }
    else {
        const compactAuth = await (0, compactAuth_js_1.useCompactAuthState)('./session.kaze');
        authState = compactAuth.state;
        saveCredsHandler = compactAuth.saveCreds;
    }
    const emitter = new node_events_1.EventEmitter();
    let connectionState = 'connecting';
    let isClosed = false;
    const emitConnectionUpdate = (update) => {
        if (update.connection) {
            connectionState = update.connection;
        }
        emitter.emit('connection.update', update);
    };
    // Initialize Dual Pairing Manager (QR & 8-digit Pairing Code)
    const pairingManager = new pairing_js_1.DualPairingManager(authState.creds, {
        onUpdate: (update) => {
            emitConnectionUpdate(update);
            if (update.qr && config.printQRInTerminal) {
                logger.info(`Scan QR Code:\n${update.qr}`);
            }
        }
    });
    // Initialize KeepAlive & Auto-Replenish Heartbeat
    const keepAlive = new keepalive_js_1.KeepAliveManager({
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
    }
    else {
        // If not registered, default start QR mode unless user calls requestPairingCode
        setTimeout(() => {
            if (!isClosed && !authState.creds.registered) {
                pairingManager.startQRMode();
            }
        }, 100);
    }
    const requestPairingCode = async (phoneNumber) => {
        logger.info(`Initiating pairing code protocol for phone: ${phoneNumber}`);
        return pairingManager.requestPairingCode(phoneNumber);
    };
    const sendMessage = async (jid, content, options = {}) => {
        if (connectionState !== 'open' && !authState.creds.registered) {
            logger.warn(`Sending message while socket state is "${connectionState}"`);
        }
        const messageId = `3EB0${node_crypto_1.default.randomBytes(8).toString('hex').toUpperCase()}`;
        const cleanJid = jid.includes('@') ? jid : `${jid.replace(/\D/g, '')}@s.whatsapp.net`;
        const webMsg = {
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
    const sendInteractive = async (jid, data) => {
        const content = index_js_1.MessageBuilder.interactive(data);
        return sendMessage(jid, content, { quoted: data.quoted });
    };
    const sendAlbum = async (jid, items, options = {}) => {
        const content = index_js_1.MessageBuilder.album(items, options);
        return sendMessage(jid, content, { quoted: options.quoted });
    };
    const sendPoll = async (jid, data) => {
        const content = index_js_1.MessageBuilder.poll(data);
        return sendMessage(jid, content);
    };
    const sendReaction = async (key, emoji) => {
        const content = index_js_1.MessageBuilder.reaction(key, emoji);
        return sendMessage(key.remoteJid, content);
    };
    const end = (error) => {
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
            on: (event, listener) => emitter.on(event, listener),
            off: (event, listener) => emitter.off(event, listener),
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
exports.default = makeWASocket;
//# sourceMappingURL=makeWASocket.js.map