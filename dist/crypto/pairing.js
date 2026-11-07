"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native WhatsApp Pairing Code Cryptographic Engine
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CROCKFORD_CHARACTERS = void 0;
exports.bytesToCrockford = bytesToCrockford;
exports.generatePairingCode = generatePairingCode;
exports.derivePairingCodeKey = derivePairingCodeKey;
exports.aesEncryptCTR = aesEncryptCTR;
exports.aesDecryptCTR = aesDecryptCTR;
exports.generatePairingWrappedKey = generatePairingWrappedKey;
exports.decipherLinkPublicKey = decipherLinkPublicKey;
const node_crypto_1 = __importDefault(require("node:crypto"));
exports.CROCKFORD_CHARACTERS = '123456789ABCDEFGHJKLMNPQRSTVWXYZ';
/**
 * Encodes a 5-byte buffer into WhatsApp's 8-character Crockford Base32 pairing code
 */
function bytesToCrockford(buffer) {
    let value = 0;
    let bitCount = 0;
    const result = [];
    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | (buffer[i] & 0xff);
        bitCount += 8;
        while (bitCount >= 5) {
            result.push(exports.CROCKFORD_CHARACTERS.charAt((value >>> (bitCount - 5)) & 31));
            bitCount -= 5;
        }
    }
    if (bitCount > 0) {
        result.push(exports.CROCKFORD_CHARACTERS.charAt((value << (5 - bitCount)) & 31));
    }
    return result.join('');
}
/**
 * Generate 8-character pairing code
 */
function generatePairingCode() {
    const rand = node_crypto_1.default.randomBytes(5);
    return bytesToCrockford(rand);
}
/**
 * Derives a 32-byte key from pairing code using PBKDF2-SHA256 with 131,072 iterations
 */
function derivePairingCodeKey(pairingCode, salt) {
    return node_crypto_1.default.pbkdf2Sync(pairingCode, salt, 131072, 32, 'sha256');
}
/**
 * AES-256-CTR encryption
 */
function aesEncryptCTR(data, key, iv) {
    const cipher = node_crypto_1.default.createCipheriv('aes-256-ctr', key, iv);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}
/**
 * AES-256-CTR decryption
 */
function aesDecryptCTR(data, key, iv) {
    const decipher = node_crypto_1.default.createDecipheriv('aes-256-ctr', key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}
/**
 * Generates the wrapped companion ephemeral public key node payload
 * Format: 32 bytes salt + 16 bytes IV + 32 bytes AES-CTR encrypted public key = 80 bytes
 */
function generatePairingWrappedKey(pairingCode, companionEphemeralPub) {
    const salt = node_crypto_1.default.randomBytes(32);
    const iv = node_crypto_1.default.randomBytes(16);
    const key = derivePairingCodeKey(pairingCode, salt);
    const ciphered = aesEncryptCTR(companionEphemeralPub, key, iv);
    return Buffer.concat([salt, iv, ciphered]);
}
/**
 * Deciphers phone's primary ephemeral public key received during approval
 */
function decipherLinkPublicKey(data, pairingCode) {
    const salt = data.subarray(0, 32);
    const iv = data.subarray(32, 48);
    const ciphered = data.subarray(48, 80);
    const key = derivePairingCodeKey(pairingCode, salt);
    return aesDecryptCTR(ciphered, key, iv);
}
//# sourceMappingURL=pairing.js.map