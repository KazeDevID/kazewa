"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Dual Pairing Engine (Rock-Solid 8-Digit Pairing Code & Dynamic QR Code)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualPairingManager = void 0;
const crypto_js_1 = require("../signal/crypto.js");
class DualPairingManager {
    creds;
    pairingTimeoutMs;
    qrIntervalMs;
    onUpdate;
    qrTimer;
    pairingCodeTimer;
    currentMode = 'none';
    currentPairingCode;
    currentQR;
    constructor(creds, options = {}) {
        this.creds = creds;
        this.pairingTimeoutMs = options.pairingTimeoutMs || 120_000;
        this.qrIntervalMs = options.qrRotationIntervalMs || 20_000;
        this.onUpdate = options.onUpdate;
    }
    /**
     * Cleans and formats phone number into international E.164 format (without +)
     */
    static sanitizePhoneNumber(raw) {
        let cleaned = raw.replace(/\D/g, '');
        // Common auto-corrections for convenience:
        // If Indonesian number starts with 08..., convert to 628...
        if (cleaned.startsWith('08')) {
            cleaned = '62' + cleaned.slice(1);
        }
        // If starts with 00, trim
        if (cleaned.startsWith('00')) {
            cleaned = cleaned.slice(2);
        }
        return cleaned;
    }
    /**
     * Request rock-solid 8-digit Pairing Code for WhatsApp Web
     * Formats into "XXXX-XXXX" format
     */
    async requestPairingCode(phoneNumber) {
        const cleanNumber = DualPairingManager.sanitizePhoneNumber(phoneNumber);
        if (cleanNumber.length < 8 || cleanNumber.length > 15) {
            throw new Error(`Invalid phone number "${phoneNumber}". Must be valid international format e.g. 628123456789`);
        }
        this.stopTimers();
        this.currentMode = 'code';
        // Store phone number into creds registration metadata
        this.creds.registration = {
            ...this.creds.registration,
            phoneNumber: cleanNumber,
            method: 'code'
        };
        // Generate fresh pairing ephemeral key
        this.creds.pairingEphemeralKeyPair = crypto_js_1.KazewaCrypto.generateKeyPair();
        // Derive deterministic pairing code from phone number + ephemeral key
        const salt = Buffer.concat([
            Buffer.from(cleanNumber, 'utf-8'),
            Buffer.from(this.creds.pairingEphemeralKeyPair.public)
        ]);
        const derivedEntropy = crypto_js_1.KazewaCrypto.hkdf(salt, 5, 'whatsapp-pairing-code-v1');
        const code = crypto_js_1.KazewaCrypto.generatePairingCodeFromEntropy(derivedEntropy);
        this.currentPairingCode = code;
        // Emit connection update with pairing code
        if (this.onUpdate) {
            this.onUpdate({
                connection: 'connecting',
                pairingCode: code
            });
        }
        // Set expiration timer
        this.pairingCodeTimer = setTimeout(() => {
            if (this.currentMode === 'code' && !this.creds.registered) {
                // Regenerate or emit timeout
                if (this.onUpdate) {
                    this.onUpdate({
                        connection: 'connecting',
                        lastDisconnect: {
                            reason: 'pairingTimeout',
                            error: new Error('Pairing code expired. Please request a new code.')
                        }
                    });
                }
            }
        }, this.pairingTimeoutMs);
        return code;
    }
    /**
     * Starts automatic QR code generation and rotation loop
     */
    startQRMode() {
        this.stopTimers();
        this.currentMode = 'qr';
        this.generateAndEmitQR();
        this.qrTimer = setInterval(() => {
            if (this.currentMode === 'qr' && !this.creds.registered) {
                this.generateAndEmitQR();
            }
            else {
                this.stopTimers();
            }
        }, this.qrIntervalMs);
    }
    /**
     * Generates WhatsApp Web compliant QR string
     * Format: 2@<ref>,<pubkey>,<clientToken>,<encKey>
     */
    generateAndEmitQR() {
        const ref = crypto_js_1.KazewaCrypto.randomBytes(16).toString('base64url');
        const pubKey = Buffer.from(this.creds.signedIdentityKey.public).toString('base64');
        const clientToken = Buffer.from(this.creds.noiseKey.public).toString('base64');
        const encKey = Buffer.from(this.creds.signedPreKey.public).toString('base64');
        const qrString = `2@${ref},${pubKey},${clientToken},${encKey}`;
        this.currentQR = qrString;
        if (this.onUpdate) {
            this.onUpdate({
                connection: 'connecting',
                qr: qrString
            });
        }
        return qrString;
    }
    /**
     * Mark pairing completed upon successful WhatsApp approval handshake
     */
    markPaired(jid, name) {
        this.creds.registered = true;
        this.creds.me = {
            id: jid,
            name: name || 'WhatsApp Bot'
        };
        this.creds.registration = {
            ...this.creds.registration,
            pairedAt: Date.now()
        };
        this.stopTimers();
        if (this.onUpdate) {
            this.onUpdate({
                connection: 'open',
                isNewLogin: true
            });
        }
    }
    getCurrentCode() {
        return this.currentPairingCode;
    }
    getCurrentQR() {
        return this.currentQR;
    }
    stopTimers() {
        if (this.qrTimer) {
            clearInterval(this.qrTimer);
            this.qrTimer = undefined;
        }
        if (this.pairingCodeTimer) {
            clearTimeout(this.pairingCodeTimer);
            this.pairingCodeTimer = undefined;
        }
    }
}
exports.DualPairingManager = DualPairingManager;
//# sourceMappingURL=pairing.js.map