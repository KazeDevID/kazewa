/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native Cryptographic Engine for Kazewa Signal & WhatsApp Handshake
 * Completely standalone using Node.js native `node:crypto`
 */
import type { KeyPair, SignedKeyPair } from '../types/index.js';
export declare class KazewaCrypto {
    /**
     * Computes Curve25519 (X25519) Diffie-Hellman shared secret using native node:crypto
     */
    static x25519SharedKey(privateKey32: Buffer | Uint8Array, publicKey32: Buffer | Uint8Array): Buffer;
    /**
     * Generates Curve25519 (X25519) key pair
     */
    static generateKeyPair(): KeyPair;
    /**
     * Generate Signed Pre-Key with cryptographic keyId
     */
    static generateSignedPreKey(identityKeyPair: KeyPair, keyId: number): SignedKeyPair;
    /**
     * Generates a batch of Pre-Keys
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
}
//# sourceMappingURL=crypto.d.ts.map