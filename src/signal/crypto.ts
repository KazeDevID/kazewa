/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Cryptographic engine for Kazewa Signal & Noise Handshake
 */

import crypto from 'node:crypto';
import type { KeyPair, SignedKeyPair } from '../types/index.js';

export class KazewaCrypto {
  /**
   * Generates Curve25519 (X25519) key pair for Noise & Signal protocol
   */
  static generateKeyPair(): KeyPair {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519', {
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
  static generateSignedPreKey(identityKeyPair: KeyPair, keyId: number): SignedKeyPair {
    const keyPair = this.generateKeyPair();
    // Sign public key with identity key using HMAC-SHA256 or Edwards curve
    const hmac = crypto.createHmac('sha256', Buffer.from(identityKeyPair.private));
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
  static generatePreKeys(startId: number, count: number): { [keyId: string]: KeyPair } {
    const keys: { [keyId: string]: KeyPair } = {};
    for (let i = 0; i < count; i++) {
      const id = startId + i;
      keys[id.toString()] = this.generateKeyPair();
    }
    return keys;
  }

  /**
   * HKDF Key Derivation (RFC 5869)
   */
  static hkdf(
    ikm: Uint8Array | Buffer,
    length: number,
    info: string | Uint8Array | Buffer,
    salt?: Uint8Array | Buffer
  ): Buffer {
    const saltBuf = salt ? Buffer.from(salt) : Buffer.alloc(32, 0);
    const infoBuf = typeof info === 'string' ? Buffer.from(info, 'utf-8') : Buffer.from(info);
    const ikmBuf = Buffer.from(ikm);

    return Buffer.from(
      crypto.hkdfSync('sha256', ikmBuf, saltBuf, infoBuf, length)
    );
  }

  /**
   * AES-256-GCM authenticated encryption
   */
  static aesGcmEncrypt(
    plaintext: Buffer | Uint8Array,
    key: Buffer | Uint8Array,
    iv: Buffer | Uint8Array,
    additionalData?: Buffer | Uint8Array
  ): { ciphertext: Buffer; tag: Buffer } {
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
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
  static aesGcmDecrypt(
    ciphertext: Buffer | Uint8Array,
    key: Buffer | Uint8Array,
    iv: Buffer | Uint8Array,
    tag: Buffer | Uint8Array,
    additionalData?: Buffer | Uint8Array
  ): Buffer {
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
    decipher.setAuthTag(Buffer.from(tag));
    if (additionalData) {
      decipher.setAAD(Buffer.from(additionalData));
    }
    return Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]);
  }

  /**
   * HMAC-SHA256
   */
  static hmacSha256(key: Buffer | Uint8Array, data: Buffer | Uint8Array): Buffer {
    return crypto.createHmac('sha256', Buffer.from(key)).update(Buffer.from(data)).digest();
  }

  /**
   * SHA-256 Hash
   */
  static sha256(data: Buffer | Uint8Array | string): Buffer {
    const input = typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(data);
    return crypto.createHash('sha256').update(input).digest();
  }

  /**
   * Secure Random Bytes
   */
  static randomBytes(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Generate 8-character Pairing Code in WhatsApp Web format (e.g. "ABCD-EFGH")
   */
  static generatePairingCodeFromEntropy(entropy?: Buffer): string {
    const bytes = entropy || crypto.randomBytes(5);
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
      code += alphabet[crypto.randomInt(0, alphabet.length)];
    }

    return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
  }
}
