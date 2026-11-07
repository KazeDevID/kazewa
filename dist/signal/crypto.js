"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Cryptographic engine for Kazewa Signal & Noise Handshake
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KazewaCrypto = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class KazewaCrypto {
    /**
     * Generates Curve25519 (X25519) key pair for Noise & Signal protocol
     */
    static generateKeyPair() {
        const { privateKey, publicKey } = node_crypto_1.default.generateKeyPairSync('x25519', {
            publicKeyEncoding: { type: 'spki', format: 'der' },
            privateKeyEncoding: { type: 'pkcs8', format: 'der' }
        });
        // Extract raw 32-byte keys from DER encoding
        const privRaw = privateKey.subarray(privateKey.length - 32);
        const pubRaw = publicKey.subarray(publicKey.length - 32);
        return {
            private: new Uint8Array(privRaw),
            public: new Uint8Array(pubRaw)
        };
    }
    /**
     * Generate Signed Pre-Key with cryptographic keyId
     */
    static generateSignedPreKey(identityKeyPair, keyId) {
        const keyPair = this.generateKeyPair();
        // Sign public key with identity key using HMAC-SHA256 or Edwards curve
        const hmac = node_crypto_1.default.createHmac('sha256', Buffer.from(identityKeyPair.private));
        hmac.update(Buffer.from(keyPair.public));
        const signature = new Uint8Array(hmac.digest());
        return {
            ...keyPair,
            signature,
            keyId
        };
    }
    /**
     * Generates a batch of Pre-Keys with automatic IDs
     */
    static generatePreKeys(startId, count) {
        const keys = {};
        for (let i = 0; i < count; i++) {
            const id = startId + i;
            keys[id.toString()] = this.generateKeyPair();
        }
        return keys;
    }
    /**
     * HKDF Key Derivation (RFC 5869)
     */
    static hkdf(ikm, length, info, salt) {
        const saltBuf = salt ? Buffer.from(salt) : Buffer.alloc(32, 0);
        const infoBuf = typeof info === 'string' ? Buffer.from(info, 'utf-8') : Buffer.from(info);
        const ikmBuf = Buffer.from(ikm);
        return Buffer.from(node_crypto_1.default.hkdfSync('sha256', ikmBuf, saltBuf, infoBuf, length));
    }
    /**
     * AES-256-GCM authenticated encryption
     */
    static aesGcmEncrypt(plaintext, key, iv, additionalData) {
        const cipher = node_crypto_1.default.createCipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
        if (additionalData) {
            cipher.setAAD(Buffer.from(additionalData));
        }
        const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
        const tag = cipher.getAuthTag();
        return { ciphertext, tag };
    }
    /**
     * AES-256-GCM authenticated decryption
     */
    static aesGcmDecrypt(ciphertext, key, iv, tag, additionalData) {
        const decipher = node_crypto_1.default.createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
        decipher.setAuthTag(Buffer.from(tag));
        if (additionalData) {
            decipher.setAAD(Buffer.from(additionalData));
        }
        return Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]);
    }
    /**
     * HMAC-SHA256
     */
    static hmacSha256(key, data) {
        return node_crypto_1.default.createHmac('sha256', Buffer.from(key)).update(Buffer.from(data)).digest();
    }
    /**
     * SHA-256 Hash
     */
    static sha256(data) {
        const input = typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(data);
        return node_crypto_1.default.createHash('sha256').update(input).digest();
    }
    /**
     * Secure Random Bytes
     */
    static randomBytes(length) {
        return node_crypto_1.default.randomBytes(length);
    }
    /**
     * Generate 8-character Pairing Code in WhatsApp Web format (e.g. "ABCD-EFGH")
     */
    static generatePairingCodeFromEntropy(entropy) {
        const bytes = entropy || node_crypto_1.default.randomBytes(5);
        // WhatsApp pairing code alphabet: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ (32 unambiguous chars)
        const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        let val = 0;
        let bits = 0;
        for (const b of bytes) {
            val = (val << 8) | b;
            bits += 8;
            while (bits >= 5 && code.length < 8) {
                bits -= 5;
                const index = (val >> bits) & 31;
                code += alphabet[index];
            }
        }
        while (code.length < 8) {
            code += alphabet[node_crypto_1.default.randomInt(0, alphabet.length)];
        }
        return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    }
}
exports.KazewaCrypto = KazewaCrypto;
//# sourceMappingURL=crypto.js.map