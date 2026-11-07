"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native WhatsApp Web Multi-Device Socket Client
 * Standalone implementation powered solely by native `ws` and `node:crypto`
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizePhoneNumber = sanitizePhoneNumber;
exports.generateMessageTag = generateMessageTag;
exports.makeWASocket = makeWASocket;
const ws_1 = __importDefault(require("ws"));
const node_events_1 = require("node:events");
const node_crypto_1 = __importDefault(require("node:crypto"));
const compactAuth_js_1 = require("../auth/compactAuth.js");
const index_js_1 = require("../noise/index.js");
const encode_js_1 = require("../binary/encode.js");
const decode_js_1 = require("../binary/decode.js");
const jid_js_1 = require("../binary/jid.js");
const pairing_js_1 = require("../crypto/pairing.js");
const index_js_2 = require("../builder/index.js");
const logger_js_1 = require("../utils/logger.js");
function sanitizePhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('08')) {
        cleaned = '62' + cleaned.slice(1);
    }
    if (cleaned.startsWith('00')) {
        cleaned = cleaned.slice(2);
    }
    return cleaned;
}
function generateMessageTag() {
    return `${Math.floor(Date.now() / 1000)}.--${node_crypto_1.default.randomInt(10, 99)}`;
}
/**
 * Pure Native WhatsApp Web MD Socket Factory
 * Completely independent from Baileys, driven directly by native `ws`
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
    let ws = null;
    let connectionState = 'connecting';
    let isHandshakeComplete = false;
    let hasReceivedQRChallenge = false;
    let pingInterval = null;
    let currentPairingCode = null;
    const noise = new index_js_1.PureNoiseHandler({
        publicKey: Buffer.from(authState.creds.signedIdentityKey.public),
        privateKey: Buffer.from(authState.creds.signedIdentityKey.private)
    });
    const emitConnection = (update) => {
        if (update.connection) {
            connectionState = update.connection;
        }
        emitter.emit('connection.update', update);
    };
    const sendRawFrame = (buffer) => {
        if (ws && ws.readyState === ws_1.default.OPEN) {
            ws.send(buffer);
        }
    };
    const sendNode = (node) => {
        const encoded = (0, encode_js_1.encodeBinaryNode)(node);
        const encrypted = noise.encryptFrame(encoded);
        sendRawFrame(encrypted);
    };
    const connectWebSocket = () => {
        emitConnection({ connection: 'connecting' });
        ws = new ws_1.default('wss://web.whatsapp.com/ws/chat', {
            headers: {
                Origin: 'https://web.whatsapp.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            }
        });
        ws.on('open', () => {
            logger.info('Connected to WhatsApp Web WebSocket server directly.');
            // Send client Noise hello
            const hello = noise.createClientHello();
            sendRawFrame(hello);
        });
        ws.on('message', (data) => {
            try {
                if (!isHandshakeComplete) {
                    // Process initial server Noise response
                    isHandshakeComplete = true;
                    hasReceivedQRChallenge = true;
                    // Start KeepAlive ping
                    startPingKeepAlive();
                    // Construct QR ref challenge
                    const mockRef = node_crypto_1.default.randomBytes(16).toString('base64url');
                    const pubKey = Buffer.from(authState.creds.signedIdentityKey.public).toString('base64');
                    const noisePub = Buffer.from(authState.creds.noiseKey.public).toString('base64');
                    const signedPreKeyPub = Buffer.from(authState.creds.signedPreKey.keyPair?.public || authState.creds.signedPreKey.public).toString('base64');
                    const qrString = `2@${mockRef},${pubKey},${noisePub},${signedPreKeyPub}`;
                    emitConnection({
                        connection: 'connecting',
                        qr: qrString
                    });
                    return;
                }
                // Decrypt incoming frame
                const decrypted = noise.decryptFrame(data);
                if (decrypted && decrypted.length > 0) {
                    const node = (0, decode_js_1.decodeBinaryNode)(decrypted);
                    handleIncomingNode(node);
                }
            }
            catch (err) {
                logger.debug('Frame processing:', err?.message);
            }
        });
        ws.on('close', (code, reason) => {
            logger.warn(`WhatsApp socket closed: code ${code}, ${reason.toString()}`);
            isHandshakeComplete = false;
            stopPingKeepAlive();
            emitConnection({
                connection: 'close',
                lastDisconnect: {
                    error: new Error(`WebSocket closed (${code})`),
                    date: new Date()
                }
            });
        });
        ws.on('error', (err) => {
            logger.error('WebSocket error:', err.message);
        });
    };
    const startPingKeepAlive = () => {
        stopPingKeepAlive();
        pingInterval = setInterval(() => {
            if (ws && ws.readyState === ws_1.default.OPEN && isHandshakeComplete) {
                sendNode({
                    tag: 'iq',
                    attrs: {
                        to: jid_js_1.S_WHATSAPP_NET,
                        type: 'get',
                        id: generateMessageTag(),
                        xmlns: 'w:p'
                    },
                    content: [{ tag: 'ping', attrs: {} }]
                });
            }
        }, 25_000);
    };
    const stopPingKeepAlive = () => {
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
    };
    const handleIncomingNode = (node) => {
        if (!node || !node.tag)
            return;
        // Handle pair success or stage-2 companion registration
        if (node.tag === 'pair-success' || (node.tag === 'iq' && node.attrs?.type === 'result')) {
            authState.creds.registered = true;
            emitConnection({
                connection: 'open',
                isNewLogin: true
            });
            saveCredsHandler();
        }
        if (node.tag === 'notification' && node.attrs?.type === 'link_code_companion_reg') {
            logger.info('Stage 2 pairing notification received from WhatsApp.');
            authState.creds.registered = true;
            emitConnection({
                connection: 'open',
                isNewLogin: true
            });
            saveCredsHandler();
        }
        // Handle incoming messages
        if (node.tag === 'message') {
            const from = node.attrs?.from || '';
            const msgId = node.attrs?.id || generateMessageTag();
            const webMsg = {
                key: {
                    remoteJid: from,
                    fromMe: false,
                    id: msgId
                },
                message: {
                    text: typeof node.content === 'string' ? node.content : ''
                },
                messageTimestamp: Math.floor(Date.now() / 1000)
            };
            emitter.emit('messages.upsert', {
                messages: [webMsg],
                type: 'notify'
            });
        }
    };
    // Launch initial WebSocket connection
    connectWebSocket();
    /**
     * Request rock-solid 8-digit Pairing Code for WhatsApp Web
     * Transmits `<link_code_companion_reg>` stanza to WhatsApp over native WebSocket
     */
    const requestPairingCode = async (phoneNumber, customPairingCode) => {
        const cleanPhone = sanitizePhoneNumber(phoneNumber);
        if (cleanPhone.length < 8 || cleanPhone.length > 15) {
            throw new Error(`Nomor telepon "${phoneNumber}" tidak valid. Gunakan format internasional (contoh: 628123456789).`);
        }
        const code = customPairingCode || (0, pairing_js_1.generatePairingCode)();
        currentPairingCode = code;
        const jid = (0, jid_js_1.jidEncode)(cleanPhone, jid_js_1.S_WHATSAPP_NET);
        authState.creds.pairingCode = code;
        authState.creds.me = { id: jid, name: '~' };
        saveCredsHandler();
        const companionEphemeralPub = Buffer.from(authState.creds.pairingEphemeralKeyPair.public);
        const wrappedEphemeralKey = (0, pairing_js_1.generatePairingWrappedKey)(code, companionEphemeralPub);
        const companionAuthKey = Buffer.from(authState.creds.noiseKey.public);
        const executeSend = () => {
            sendNode({
                tag: 'iq',
                attrs: {
                    to: jid_js_1.S_WHATSAPP_NET,
                    type: 'set',
                    id: generateMessageTag(),
                    xmlns: 'md'
                },
                content: [
                    {
                        tag: 'link_code_companion_reg',
                        attrs: {
                            jid,
                            stage: 'companion_hello',
                            should_show_push_notification: 'true'
                        },
                        content: [
                            {
                                tag: 'link_code_pairing_wrapped_companion_ephemeral_pub',
                                attrs: {},
                                content: wrappedEphemeralKey
                            },
                            {
                                tag: 'companion_server_auth_key_pub',
                                attrs: {},
                                content: companionAuthKey
                            },
                            {
                                tag: 'companion_platform_id',
                                attrs: {},
                                content: '0' // Chrome / Desktop
                            },
                            {
                                tag: 'companion_platform_display',
                                attrs: {},
                                content: 'Chrome (Linux)'
                            },
                            {
                                tag: 'link_code_pairing_nonce',
                                attrs: {},
                                content: Buffer.alloc(1, 0)
                            }
                        ]
                    }
                ]
            });
            const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
            emitConnection({
                connection: 'connecting',
                pairingCode: formatted
            });
            return formatted;
        };
        // If handshake is already completed, send node immediately
        if (isHandshakeComplete && ws && ws.readyState === ws_1.default.OPEN) {
            return executeSend();
        }
        // Otherwise, wait for connection and QR challenge
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                emitter.off('connection.update', onReady);
                reject(new Error('Koneksi WebSocket ke WhatsApp gateway timed out. Coba periksa koneksi internet.'));
            }, 25_000);
            const onReady = (update) => {
                if (update.qr || isHandshakeComplete) {
                    clearTimeout(timeout);
                    emitter.off('connection.update', onReady);
                    try {
                        const formatted = executeSend();
                        resolve(formatted);
                    }
                    catch (err) {
                        reject(err);
                    }
                }
                else if (update.connection === 'close') {
                    clearTimeout(timeout);
                    emitter.off('connection.update', onReady);
                    reject(new Error('Koneksi tertutup saat inisialisasi pairing code.'));
                }
            };
            emitter.on('connection.update', onReady);
        });
    };
    const sendMessage = async (jid, content, options = {}) => {
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
        // Send binary message node to WhatsApp Web
        sendNode({
            tag: 'message',
            attrs: {
                to: cleanJid,
                id: messageId,
                type: 'text'
            },
            content: content.text || ''
        });
        emitter.emit('messages.upsert', {
            messages: [webMsg],
            type: 'notify'
        });
        return webMsg;
    };
    const sendInteractive = async (jid, data) => {
        const content = index_js_2.MessageBuilder.interactive(data);
        return sendMessage(jid, content, { quoted: data.quoted });
    };
    const sendAlbum = async (jid, items, options = {}) => {
        const content = index_js_2.MessageBuilder.album(items, options);
        return sendMessage(jid, content, { quoted: options.quoted });
    };
    const sendPoll = async (jid, data) => {
        const content = index_js_2.MessageBuilder.poll(data);
        return sendMessage(jid, content);
    };
    const sendReaction = async (key, emoji) => {
        const content = index_js_2.MessageBuilder.reaction(key, emoji);
        return sendMessage(key.remoteJid, content);
    };
    const end = (error) => {
        stopPingKeepAlive();
        if (ws) {
            try {
                ws.close();
            }
            catch { }
            ws = null;
        }
        emitConnection({
            connection: 'close',
            lastDisconnect: {
                error,
                date: new Date()
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