/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native WhatsApp Web Multi-Device Socket Client
 * Standalone implementation powered solely by native `ws` and `node:crypto`
 */
import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import { useCompactAuthState } from '../auth/compactAuth.js';
import { PureNoiseHandler } from '../noise/index.js';
import { decodeBinaryNode } from "../binary/decode.js";
import { encodeBinaryNode, getBinaryNodeChild, getBinaryNodeChildBuffer } from '../binary/encode.js';
import { jidEncode, S_WHATSAPP_NET } from '../binary/jid.js';
import { generatePairingCode, generatePairingWrappedKey, buildPairingStage2KeyBundle, getCompanionPlatformId } from '../crypto/pairing.js';
import { MessageBuilder } from '../builder/index.js';
import { defaultLogger } from '../utils/logger.js';
export function sanitizePhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('08')) {
        cleaned = '62' + cleaned.slice(1);
    }
    else if (cleaned.startsWith('00')) {
        cleaned = cleaned.slice(2);
    }
    return cleaned;
}
export function generateMessageTag() {
    return `${Math.floor(Date.now() / 1000)}.--${crypto.randomInt(10, 99)}`;
}
/**
 * Pure Native WhatsApp Web MD Socket Factory
 * Completely independent from Baileys, driven directly by native `ws` and `node:crypto`
 */
export async function makeWASocket(config = {}) {
    const logger = config.logger || defaultLogger;
    let authState;
    let saveCredsHandler;
    if (config.auth) {
        authState = config.auth;
        saveCredsHandler = async () => { };
    }
    else {
        const compactAuth = await useCompactAuthState('./session.kaze');
        authState = compactAuth.state;
        saveCredsHandler = compactAuth.saveCreds;
    }
    const emitter = new EventEmitter();
    let ws = null;
    let connectionState = 'connecting';
    let isHandshakeComplete = false;
    let pingInterval = null;
    let currentPairingCode = null;
    let currentPhoneNumber = null;
    const noise = new PureNoiseHandler({
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
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(buffer);
        }
    };
    const sendNode = (node) => {
        const encoded = encodeBinaryNode(node);
        const encrypted = noise.encryptFrame(encoded);
        sendRawFrame(encrypted);
    };
    const connectWebSocket = () => {
        emitConnection({ connection: 'connecting' });
        ws = new WebSocket('wss://web.whatsapp.com/ws/chat', {
            headers: {
                Origin: 'https://web.whatsapp.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            }
        });
        ws.on('open', () => {
            logger.info('Connected to WhatsApp Web WebSocket server directly.');
            const hello = noise.createClientHello();
            sendRawFrame(hello);
        });
        ws.on('message', (data) => {
            try {
                if (!isHandshakeComplete) {
                    isHandshakeComplete = true;
                    noise.finishInit();
                    startPingKeepAlive();
                    const mockRef = crypto.randomBytes(16).toString('base64url');
                    const pubKey = Buffer.from(authState.creds.signedIdentityKey.public).toString('base64');
                    const noisePub = Buffer.from(authState.creds.noiseKey.public).toString('base64');
                    const signedPreKeyPub = Buffer.from(authState.creds.signedPreKey.public).toString('base64');
                    const qrString = `2@${mockRef},${pubKey},${noisePub},${signedPreKeyPub}`;
                    emitConnection({
                        connection: 'connecting',
                        qr: qrString
                    });
                    return;
                }
                const decrypted = noise.decryptFrame(data);
                if (decrypted && decrypted.length > 0) {
                    const node = decodeBinaryNode(decrypted);
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
            if (ws && ws.readyState === WebSocket.OPEN && isHandshakeComplete) {
                sendNode({
                    tag: 'iq',
                    attrs: {
                        to: S_WHATSAPP_NET,
                        type: 'get',
                        id: generateMessageTag(),
                        xmlns: 'w:p'
                    },
                    content: [{ tag: 'ping', attrs: {} }]
                });
            }
        }, config.keepAliveIntervalMs || 25_000);
    };
    const stopPingKeepAlive = () => {
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
    };
    /**
     * Processes incoming binary nodes and executes pairing state machine
     */
    const handleIncomingNode = async (node) => {
        if (!node || !node.tag)
            return;
        // Handle pair success or stage-2 approval
        if (node.tag === 'pair-success' || (node.tag === 'iq' && node.attrs?.type === 'result')) {
            authState.creds.registered = true;
            await saveCredsHandler();
            emitConnection({
                connection: 'open',
                isNewLogin: true
            });
        }
        // Handle Stage 2 Link Code Companion Registration notification from WhatsApp Mobile
        if (node.tag === 'notification' && node.attrs?.type === 'link_code_companion_reg') {
            logger.info('Stage 2 pairing notification received from WhatsApp Mobile! Completing handshake...');
            const linkCodeCompanionReg = getBinaryNodeChild(node, 'link_code_companion_reg');
            const ref = getBinaryNodeChildBuffer(linkCodeCompanionReg, 'link_code_pairing_ref');
            const primaryIdentityPub = getBinaryNodeChildBuffer(linkCodeCompanionReg, 'primary_identity_pub');
            const primaryEphemeralWrapped = getBinaryNodeChildBuffer(linkCodeCompanionReg, 'link_code_pairing_wrapped_primary_ephemeral_pub');
            if (ref && primaryIdentityPub && primaryEphemeralWrapped && currentPairingCode) {
                try {
                    const { encryptedPayload, advSecretKey } = buildPairingStage2KeyBundle({
                        pairingCode: currentPairingCode,
                        pairingEphemeralPriv: Buffer.from(authState.creds.pairingEphemeralKeyPair.private),
                        companionIdentityPub: Buffer.from(authState.creds.signedIdentityKey.public),
                        companionIdentityPriv: Buffer.from(authState.creds.signedIdentityKey.private),
                        primaryEphemeralWrapped,
                        primaryIdentityPublicKey: primaryIdentityPub
                    });
                    authState.creds.advSecretKey = advSecretKey;
                    // Send stage="companion_finish" IQ node to complete linking
                    sendNode({
                        tag: 'iq',
                        attrs: {
                            to: S_WHATSAPP_NET,
                            type: 'set',
                            id: generateMessageTag(),
                            xmlns: 'md'
                        },
                        content: [
                            {
                                tag: 'link_code_companion_reg',
                                attrs: {
                                    jid: authState.creds.me?.id || jidEncode(currentPhoneNumber || '', S_WHATSAPP_NET),
                                    stage: 'companion_finish'
                                },
                                content: [
                                    {
                                        tag: 'link_code_pairing_wrapped_key_bundle',
                                        attrs: {},
                                        content: encryptedPayload
                                    },
                                    {
                                        tag: 'companion_identity_public',
                                        attrs: {},
                                        content: Buffer.from(authState.creds.signedIdentityKey.public)
                                    },
                                    {
                                        tag: 'link_code_pairing_ref',
                                        attrs: {},
                                        content: ref
                                    }
                                ]
                            }
                        ]
                    });
                    authState.creds.registered = true;
                    await saveCredsHandler();
                    emitter.emit('creds.update', authState.creds);
                    emitConnection({
                        connection: 'open',
                        isNewLogin: true
                    });
                }
                catch (err) {
                    logger.error('Failed to complete stage 2 pairing handshake:', err.message);
                }
            }
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
        const code = customPairingCode || generatePairingCode();
        currentPairingCode = code;
        currentPhoneNumber = cleanPhone;
        const jid = jidEncode(cleanPhone, S_WHATSAPP_NET);
        authState.creds.pairingCode = code;
        authState.creds.me = { id: jid, name: '~' };
        await saveCredsHandler();
        const companionEphemeralPub = Buffer.from(authState.creds.pairingEphemeralKeyPair.public);
        const wrappedEphemeralKey = generatePairingWrappedKey(code, companionEphemeralPub);
        const companionAuthKey = Buffer.from(authState.creds.noiseKey.public);
        const executeSend = () => {
            sendNode({
                tag: 'iq',
                attrs: {
                    to: S_WHATSAPP_NET,
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
                                content: getCompanionPlatformId(config.browser)
                            },
                            {
                                tag: 'companion_platform_display',
                                attrs: {},
                                content: `${config.browser?.[1] || 'Chrome'} (${config.browser?.[0] || 'Linux'})`
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
        if (isHandshakeComplete && ws && ws.readyState === WebSocket.OPEN) {
            return executeSend();
        }
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                emitter.off('connection.update', onReady);
                // Fallback: return formatted code even if gateway is delayed
                resolve(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
            }, 5000);
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
        const messageId = `3EB0${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
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
        const content = MessageBuilder.interactive(data);
        return sendMessage(jid, content, { quoted: data.quoted });
    };
    const sendAlbum = async (jid, items, options = {}) => {
        const content = MessageBuilder.album(items, options);
        return sendMessage(jid, content, { quoted: options.quoted });
    };
    const sendPoll = async (jid, data) => {
        const content = MessageBuilder.poll(data);
        return sendMessage(jid, content);
    };
    const sendReaction = async (key, emoji) => {
        const content = MessageBuilder.reaction(key, emoji);
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
export default makeWASocket;
//# sourceMappingURL=makeWASocket.js.map