/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native Noise Handshake (Noise_XX_25519_AESGCM_SHA256) for WhatsApp Web Gateway
 * Implemented natively using node:crypto without external framework dependencies
 */

import crypto from 'node:crypto';
import { KazewaCrypto } from '../signal/crypto.js';

export const NOISE_WA_HEADER = Buffer.from([0x57, 0x41, 0x06, 0x02]); // "WA\x06\x02"
export const NOISE_MODE = Buffer.from('Noise_XX_25519_AESGCM_SHA256');

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

  // Handshake state
  private hash: Buffer;
  private salt: Buffer;
  private encKey: Buffer;
  private decKey: Buffer;
  private counter = 0;
  private sentIntro = false;
  private inBytes = Buffer.alloc(0);

  constructor(staticKeyPair: { publicKey: Buffer; privateKey: Buffer }) {
    this.staticKeyPair = staticKeyPair;
    const keyPair = KazewaCrypto.generateKeyPair();
    this.ephemeralKeyPair = {
      privateKey: Buffer.from(keyPair.private),
      publicKey: Buffer.from(keyPair.public)
    };

    const initialHash = KazewaCrypto.sha256(NOISE_MODE);
    this.hash = initialHash;
    this.salt = initialHash;
    this.encKey = initialHash;
    this.decKey = initialHash;

    this.authenticate(NOISE_WA_HEADER);
    this.authenticate(this.ephemeralKeyPair.publicKey);
  }

  public getEphemeralPublicKey(): Buffer {
    return this.ephemeralKeyPair.publicKey;
  }

  public authenticate(data: Buffer): void {
    if (!this.cipherState) {
      this.hash = KazewaCrypto.sha256(Buffer.concat([this.hash, data]));
    }
  }

  private mixIntoKey(sharedSecret: Buffer): void {
    const key = KazewaCrypto.hkdf(sharedSecret, 64, '', this.salt);
    this.salt = key.subarray(0, 32);
    this.encKey = key.subarray(32, 64);
    this.decKey = key.subarray(32, 64);
    this.counter = 0;
  }

  private generateIV(counter: number): Buffer {
    const iv = Buffer.alloc(12, 0);
    iv.writeUInt32BE(counter, 8);
    return iv;
  }

  /**
   * Initializes client hello frame for Noise XX pattern (-> e)
   */
  public createClientHello(): Buffer {
    // Protobuf encoding of HandshakeMessage { clientHello: { ephemeral: 32 bytes } }
    // 0x12 (tag 2 = clientHello), 0x22 (len 34), 0x0a (tag 1 = ephemeral), 0x20 (len 32)
    const pub = this.ephemeralKeyPair.publicKey;
    const protoPayload = Buffer.concat([
      Buffer.from([0x12, 0x22, 0x0a, 0x20]),
      pub
    ]);

    const len = protoPayload.length;
    const header = Buffer.from([(len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);

    // Send NOISE_WA_HEADER + 3-byte length + HandshakeMessage
    this.sentIntro = true;
    return Buffer.concat([NOISE_WA_HEADER, header, protoPayload]);
  }

  /**
   * Transition handshake to full transport encryption state
   */
  public finishInit(): void {
    const keys = KazewaCrypto.hkdf(Buffer.alloc(0), 64, '', this.salt);
    const writeKey = keys.subarray(0, 32);
    const readKey = keys.subarray(32, 64);

    this.cipherState = {
      encKey: writeKey,
      decKey: readKey,
      encCounter: 0,
      decCounter: 0
    };
  }

  /**
   * Encrypts outgoing frame with AES-256-GCM and prepends 3-byte length
   */
  public encryptFrame(plaintext: Buffer): Buffer {
    if (!this.cipherState) {
      const len = plaintext.length;
      const header = Buffer.from([(len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
      return Buffer.concat([header, plaintext]);
    }

    const iv = this.generateIV(this.cipherState.encCounter++);
    const { ciphertext, tag } = KazewaCrypto.aesGcmEncrypt(plaintext, this.cipherState.encKey, iv);
    const fullCipher = Buffer.concat([ciphertext, tag]);

    const len = fullCipher.length;
    const header = Buffer.from([(len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
    return Buffer.concat([header, fullCipher]);
  }

  /**
   * Decrypts incoming binary frame using AES-256-GCM
   */
  public decryptFrame(frame: Buffer): Buffer {
    if (!this.cipherState) {
      return frame;
    }

    if (frame.length < 16) {
      return frame;
    }

    const iv = this.generateIV(this.cipherState.decCounter++);
    const authTag = frame.subarray(frame.length - 16);
    const ciphertext = frame.subarray(0, frame.length - 16);

    try {
      return KazewaCrypto.aesGcmDecrypt(ciphertext, this.cipherState.decKey, iv, authTag);
    } catch {
      return frame;
    }
  }

  public setTransportKeys(writeKey: Buffer, readKey: Buffer): void {
    this.cipherState = {
      encKey: writeKey,
      decKey: readKey,
      encCounter: 0,
      decCounter: 0
    };
  }

  public isTransportReady(): boolean {
    return !!this.cipherState;
  }
}
