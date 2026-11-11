/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native WhatsApp Pairing Code Cryptographic Engine
 * Implements full Stage 1 (companion_hello) and Stage 2 (companion_finish) handshake
 */

import crypto from 'node:crypto';
import { KazewaCrypto } from '../signal/crypto.js';

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

/**
 * Resolves companion platform ID for WhatsApp Web
 */
export function getCompanionPlatformId(browser?: [string, string, string]): string {
  if (!browser || !browser[1]) return '0';
  const name = browser[1].toLowerCase();
  if (name.includes('chrome')) return '0';
  if (name.includes('firefox')) return '1';
  if (name.includes('safari')) return '2';
  if (name.includes('edge')) return '3';
  return '0';
}

/**
 * Complete Stage 2 companion registration cryptographic key exchange.
 * Deciphers phone's primary ephemeral public key, computes Diffie-Hellman shared key,
 * encrypts the key bundle with AES-256-GCM, and derives the companion advSecretKey.
 */
export function buildPairingStage2KeyBundle(params: {
  pairingCode: string;
  pairingEphemeralPriv: Buffer;
  companionIdentityPub: Buffer;
  companionIdentityPriv: Buffer;
  primaryEphemeralWrapped: Buffer;
  primaryIdentityPublicKey: Buffer;
}): {
  encryptedPayload: Buffer;
  advSecretKey: string;
} {
  const {
    pairingCode,
    pairingEphemeralPriv,
    companionIdentityPub,
    companionIdentityPriv,
    primaryEphemeralWrapped,
    primaryIdentityPublicKey
  } = params;

  // 1. Decipher phone's ephemeral public key
  const codePairingPublicKey = decipherLinkPublicKey(primaryEphemeralWrapped, pairingCode);

  // 2. Compute Curve25519 shared secret: DH(pairingEphemeralPriv, codePairingPublicKey)
  const companionSharedKey = KazewaCrypto.x25519SharedKey(pairingEphemeralPriv, codePairingPublicKey);

  // 3. Generate random 32-byte secret and linkCodeSalt
  const random = crypto.randomBytes(32);
  const linkCodeSalt = crypto.randomBytes(32);

  // 4. Derive key bundle encryption key via HKDF
  const linkCodePairingExpanded = KazewaCrypto.hkdf(
    companionSharedKey,
    32,
    'link_code_pairing_key_bundle_encryption_key',
    linkCodeSalt
  );

  // 5. Encrypt payload [companionIdentityPub, primaryIdentityPublicKey, random] with AES-256-GCM
  const encryptPayload = Buffer.concat([
    companionIdentityPub,
    primaryIdentityPublicKey,
    random
  ]);
  const encryptIv = crypto.randomBytes(12);
  const { ciphertext, tag } = KazewaCrypto.aesGcmEncrypt(encryptPayload, linkCodePairingExpanded, encryptIv);
  const encryptedPayload = Buffer.concat([linkCodeSalt, encryptIv, ciphertext, tag]);

  // 6. Compute identity shared key: DH(companionIdentityPriv, primaryIdentityPublicKey)
  const identitySharedKey = KazewaCrypto.x25519SharedKey(companionIdentityPriv, primaryIdentityPublicKey);

  // 7. Derive advSecretKey: HKDF([companionSharedKey, identitySharedKey, random], 32, 'adv_secret')
  const identityPayload = Buffer.concat([companionSharedKey, identitySharedKey, random]);
  const advSecretKey = KazewaCrypto.hkdf(identityPayload, 32, 'adv_secret').toString('base64');

  return {
    encryptedPayload,
    advSecretKey
  };
}
