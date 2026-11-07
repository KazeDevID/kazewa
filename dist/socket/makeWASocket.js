"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa WhatsApp Web Engine - Rock-Solid Dual Pairing & Compact Session Socket
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizePhoneNumber = sanitizePhoneNumber;
exports.makeWASocket = makeWASocket;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const pino_1 = __importDefault(require("pino"));
const compactAuth_js_1 = require("../auth/compactAuth.js");
const index_js_1 = require("../builder/index.js");
const logger_js_1 = require("../utils/logger.js");
const makeBaileysSocket = baileys_1.default.default || baileys_1.default;
/**
 * Sanitize and normalize phone number into clean international format
 */
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
/**
 * Creates and initializes a Kazewa WhatsApp Web socket instance
 * Enhanced with automated QR-readiness sync for 100% reliable pairing codes
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
    // Internal silent pino logger for baileys core
    const baileysLogger = (0, pino_1.default)({ level: 'silent' });
    // Initialize the real WhatsApp Web MD socket
    const innerSock = makeBaileysSocket({
        auth: authState,
        logger: baileysLogger,
        printQRInTerminal: config.printQRInTerminal ?? false,
        browser: config.browser || baileys_1.Browsers.ubuntu('Chrome'),
        syncFullHistory: config.syncFullHistory ?? false,
        markOnlineOnConnect: config.markOnlineOnConnect ?? true,
        connectTimeoutMs: config.connectTimeoutMs || 60_000,
        keepAliveIntervalMs: config.keepAliveIntervalMs || 25_000,
        defaultQueryTimeoutMs: config.defaultQueryTimeoutMs || 60_000
    });
    let hasReceivedQR = false;
    innerSock.ev.on('connection.update', (update) => {
        if (update.qr) {
            hasReceivedQR = true;
        }
    });
    /**
     * Request rock-solid 8-digit Pairing Code for WhatsApp Web
     * Automatically synchronizes with WhatsApp Noise handshake completion
     */
    const requestPairingCode = async (phoneNumber, customPairingCode) => {
        const cleanPhone = sanitizePhoneNumber(phoneNumber);
        if (cleanPhone.length < 8 || cleanPhone.length > 15) {
            throw new Error(`Nomor telepon "${phoneNumber}" tidak valid. Gunakan format internasional (contoh: 628123456789).`);
        }
        if (innerSock.authState?.creds?.registered) {
            throw new Error('Sesi ini sudah terdaftar dan terhubung ke WhatsApp.');
        }
        // Helper to format 8-char code as XXXX-XXXX
        const formatCode = (raw) => {
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
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                innerSock.ev.off('connection.update', onUpdate);
                reject(new Error('Koneksi ke server WhatsApp timed out saat inisialisasi pairing. Pastikan jaringan stabil.'));
            }, 30_000);
            const onUpdate = async (update) => {
                if (update.qr) {
                    hasReceivedQR = true;
                    clearTimeout(timeout);
                    innerSock.ev.off('connection.update', onUpdate);
                    try {
                        const rawCode = await innerSock.requestPairingCode(cleanPhone, customPairingCode);
                        resolve(formatCode(rawCode));
                    }
                    catch (err) {
                        reject(err);
                    }
                }
                else if (update.connection === 'close') {
                    clearTimeout(timeout);
                    innerSock.ev.off('connection.update', onUpdate);
                    reject(new Error(update.lastDisconnect?.error?.message || 'Koneksi ke WhatsApp tertutup sebelum pairing siap.'));
                }
            };
            innerSock.ev.on('connection.update', onUpdate);
        });
    };
    const sendMessage = async (jid, content, options = {}) => {
        const cleanJid = jid.includes('@') ? jid : `${jid.replace(/\D/g, '')}@s.whatsapp.net`;
        return innerSock.sendMessage(cleanJid, content, options);
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
        innerSock.end(error);
    };
    const logout = async () => {
        await innerSock.logout();
    };
    return {
        ev: innerSock.ev,
        authState: innerSock.authState,
        requestPairingCode,
        sendMessage,
        sendInteractive,
        sendAlbum,
        sendPoll,
        sendReaction,
        end,
        logout,
        user: innerSock.user
    };
}
exports.default = makeWASocket;
//# sourceMappingURL=makeWASocket.js.map