/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native WhatsApp Pairing Code Cryptographic Engine
 */

import crypto from 'node:crypto';

export const CROCKFORD_CHARACTERS = '123456789ABCDEFGHJKLMNPQRSTVWXYZ';

/**
 * Encodes a 5-byte buffer into WhatsApp's 8-character Crockford Base32 pairing code
 */
export function bytesToCrockford(buffer: Buffer): string {
  let value = 0;
  let bitCount = 0;
  const result: string[] = [];

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | (buffer[i] & 0xff);
    bitCount += 8;
    while (bitCount >= 5) {
      result.push(CROCKFORD_CHARACTERS.charAt((value >>> (bitCount - 5)) & 31));
      bitCount -= 5;
    }
  }

  if (bitCount > 0) {
    result.push(CROCKFORD_CHARACTERS.charAt((value << (5 - bitCount)) & 31));
  }

  return result.join('');
}

/**
 * Generate 8-character pairing code
 */
export function generatePairingCode(): string {
  const rand = crypto.randomBytes(5);
  return bytesToCrockford(rand);
}

/**
 * Derives a 32-byte key from pairing code using PBKDF2-SHA256 with 131,072 iterations
 */
export function derivePairingCodeKey(pairingCode: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(pairingCode, salt, 131072, 32, 'sha256');
}

/**
 * AES-256-CTR encryption
 */
export function aesEncryptCTR(data: Buffer, key: Buffer, iv: Buffer): Buffer {
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

/**
 * AES-256-CTR decryption
 */
export function aesDecryptCTR(data: Buffer, key: Buffer, iv: Buffer): Buffer {
  const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Generates the wrapped companion ephemeral public key node payload
 * Format: 32 bytes salt + 16 bytes IV + 32 bytes AES-CTR encrypted public key = 80 bytes
 */
export function generatePairingWrappedKey(pairingCode: string, companionEphemeralPub: Buffer): Buffer {
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const key = derivePairingCodeKey(pairingCode, salt);
  const ciphered = aesEncryptCTR(companionEphemeralPub, key, iv);
  return Buffer.concat([salt, iv, ciphered]);
}

/**
 * Deciphers phone's primary ephemeral public key received during approval
 */
export function decipherLinkPublicKey(data: Buffer, pairingCode: string): Buffer {
  const salt = data.subarray(0, 32);
  const iv = data.subarray(32, 48);
  const ciphered = data.subarray(48, 80);
  const key = derivePairingCodeKey(pairingCode, salt);
  return aesDecryptCTR(ciphered, key, iv);
}
