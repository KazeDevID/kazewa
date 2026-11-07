/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native Noise Protocol (Noise_XX_25519_AESGCM_SHA256) for WhatsApp Web Gateway
 */

import crypto from 'node:crypto';

export const NOISE_PROLOGUE = Buffer.from([0x57, 0x41, 0x06, 0x02]); // "WA\x06\x02"

export interface NoiseCipherState {
  encKey: Buffer;
  decKey: Buffer;
  encCounter: number;
  decCounter: number;
}

export class PureNoiseHandler {
  private ephemeralKeyPair: { publicKey: Buffer; privateKey: Buffer };
  private staticKeyPair: { publicKey: Buffer; privateKey: Buffer };
  private cipherState?: NoiseCipherState;

  constructor(staticKeyPair: { publicKey: Buffer; privateKey: Buffer }) {
    this.staticKeyPair = staticKeyPair;
    this.ephemeralKeyPair = this.generateX25519KeyPair();
  }

  public generateX25519KeyPair(): { publicKey: Buffer; privateKey: Buffer } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });
    return {
      privateKey: privateKey.subarray(privateKey.length - 32),
      publicKey: publicKey.subarray(publicKey.length - 32)
    };
  }

  public getEphemeralPublicKey(): Buffer {
    return this.ephemeralKeyPair.publicKey;
  }

  /**
   * Initializes client hello frame for Noise XX pattern (-> e)
   */
  public createClientHello(): Buffer {
    return Buffer.concat([NOISE_PROLOGUE, this.ephemeralKeyPair.publicKey]);
  }

  /**
   * Decrypts an incoming binary frame using AES-256-GCM
   */
  public decryptFrame(frame: Buffer): Buffer {
    if (!this.cipherState) {
      // Return raw if handshake is in raw mode
      return frame;
    }

    if (frame.length < 16) {
      return frame;
    }

    const iv = Buffer.alloc(12);
    iv.writeUInt32BE(this.cipherState.decCounter++, 8);

    const authTag = frame.subarray(frame.length - 16);
    const ciphertext = frame.subarray(0, frame.length - 16);

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.cipherState.decKey, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      return frame;
    }
  }

  /**
   * Encrypts an outgoing binary frame using AES-256-GCM and prepends 3-byte length
   */
  public encryptFrame(plaintext: Buffer): Buffer {
    if (!this.cipherState) {
      const len = plaintext.length;
      const header = Buffer.from([(len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
      return Buffer.concat([header, plaintext]);
    }

    const iv = Buffer.alloc(12);
    iv.writeUInt32BE(this.cipherState.encCounter++, 8);

    const cipher = crypto.createCipheriv('aes-256-gcm', this.cipherState.encKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    const fullCipher = Buffer.concat([ciphertext, tag]);
    const len = fullCipher.length;
    const header = Buffer.from([(len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);

    return Buffer.concat([header, fullCipher]);
  }

  /**
   * Derives transport keys from shared secrets
   */
  public setTransportKeys(writeKey: Buffer, readKey: Buffer): void {
    this.cipherState = {
      encKey: writeKey,
      decKey: readKey,
      encCounter: 0,
      decCounter: 0
    };
  }
}
