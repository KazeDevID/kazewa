/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Cryptographic engine for Kazewa Signal & Noise Handshake
 */
import type { KeyPair, SignedKeyPair } from '../types/index.js';
export declare class KazewaCrypto {
    /**
     * Generates Curve25519 (X25519) key pair for Noise & Signal protocol
     */
    static generateKeyPair(): KeyPair;
    /**
     * Generate Signed Pre-Key with cryptographic keyId
     */
    static generateSignedPreKey(identityKeyPair: KeyPair, keyId: number): SignedKeyPair;
    /**
     * Generates a batch of Pre-Keys with automatic IDs
     */
    static generatePreKeys(startId: number, count: number): {
        [keyId: string]: KeyPair;
    };
    /**
     * HKDF Key Derivation (RFC 5869)
     */
    static hkdf(ikm: Uint8Array | Buffer, length: number, info: string | Uint8Array | Buffer, salt?: Uint8Array | Buffer): Buffer;
    /**
     * AES-256-GCM authenticated encryption
     */
    static aesGcmEncrypt(plaintext: Buffer | Uint8Array, key: Buffer | Uint8Array, iv: Buffer | Uint8Array, additionalData?: Buffer | Uint8Array): {
        ciphertext: Buffer;
        tag: Buffer;
    };
    /**
     * AES-256-GCM authenticated decryption
     */
    static aesGcmDecrypt(ciphertext: Buffer | Uint8Array, key: Buffer | Uint8Array, iv: Buffer | Uint8Array, tag: Buffer | Uint8Array, additionalData?: Buffer | Uint8Array): Buffer;
    /**
     * HMAC-SHA256
     */
    static hmacSha256(key: Buffer | Uint8Array, data: Buffer | Uint8Array): Buffer;
    /**
     * SHA-256 Hash
     */
    static sha256(data: Buffer | Uint8Array | string): Buffer;
    /**
     * Secure Random Bytes
     */
    static randomBytes(length: number): Buffer;
    /**
     * Generate 8-character Pairing Code in WhatsApp Web format (e.g. "ABCD-EFGH")
     */
    static generatePairingCodeFromEntropy(entropy?: Buffer): string;
}
//# sourceMappingURL=crypto.d.ts.map