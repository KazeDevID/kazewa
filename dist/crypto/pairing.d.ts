/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native WhatsApp Pairing Code Cryptographic Engine
 * Implements full Stage 1 (companion_hello) and Stage 2 (companion_finish) handshake
 */
export declare const CROCKFORD_CHARACTERS = "123456789ABCDEFGHJKLMNPQRSTVWXYZ";
/**
 * Encodes a 5-byte buffer into WhatsApp's 8-character Crockford Base32 pairing code
 */
export declare function bytesToCrockford(buffer: Buffer): string;
/**
 * Generate 8-character pairing code
 */
export declare function generatePairingCode(): string;
/**
 * Derives a 32-byte key from pairing code using PBKDF2-SHA256 with 131,072 iterations
 */
export declare function derivePairingCodeKey(pairingCode: string, salt: Buffer): Buffer;
/**
 * AES-256-CTR encryption
 */
export declare function aesEncryptCTR(data: Buffer, key: Buffer, iv: Buffer): Buffer;
/**
 * AES-256-CTR decryption
 */
export declare function aesDecryptCTR(data: Buffer, key: Buffer, iv: Buffer): Buffer;
/**
 * Generates the wrapped companion ephemeral public key node payload
 * Format: 32 bytes salt + 16 bytes IV + 32 bytes AES-CTR encrypted public key = 80 bytes
 */
export declare function generatePairingWrappedKey(pairingCode: string, companionEphemeralPub: Buffer): Buffer;
/**
 * Deciphers phone's primary ephemeral public key received during approval
 */
export declare function decipherLinkPublicKey(data: Buffer, pairingCode: string): Buffer;
/**
 * Resolves companion platform ID for WhatsApp Web
 */
export declare function getCompanionPlatformId(browser?: [string, string, string]): string;
/**
 * Complete Stage 2 companion registration cryptographic key exchange.
 * Deciphers phone's primary ephemeral public key, computes Diffie-Hellman shared key,
 * encrypts the key bundle with AES-256-GCM, and derives the companion advSecretKey.
 */
export declare function buildPairingStage2KeyBundle(params: {
    pairingCode: string;
    pairingEphemeralPriv: Buffer;
    companionIdentityPub: Buffer;
    companionIdentityPriv: Buffer;
    primaryEphemeralWrapped: Buffer;
    primaryIdentityPublicKey: Buffer;
}): {
    encryptedPayload: Buffer;
    advSecretKey: string;
};
//# sourceMappingURL=pairing.d.ts.map