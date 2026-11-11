/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native Noise Handshake (Noise_XX_25519_AESGCM_SHA256) for WhatsApp Web Gateway
 * Implemented natively using node:crypto without external framework dependencies
 */
import { KazewaCrypto } from '../signal/crypto.js';
export const NOISE_WA_HEADER = Buffer.from([0x57, 0x41, 0x06, 0x02]); // "WA\x06\x02"
export const NOISE_MODE = Buffer.from('Noise_XX_25519_AESGCM_SHA256');
export class PureNoiseHandler {
    ephemeralKeyPair;
    staticKeyPair;
    cipherState;
    // Handshake state
    hash;
    salt;
    encKey;
    decKey;
    counter = 0;
    sentIntro = false;
    inBytes = Buffer.alloc(0);
    constructor(staticKeyPair) {
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
    getEphemeralPublicKey() {
        return this.ephemeralKeyPair.publicKey;
    }
    authenticate(data) {
        if (!this.cipherState) {
            this.hash = KazewaCrypto.sha256(Buffer.concat([this.hash, data]));
        }
    }
    mixIntoKey(sharedSecret) {
        const key = KazewaCrypto.hkdf(sharedSecret, 64, '', this.salt);
        this.salt = key.subarray(0, 32);
        this.encKey = key.subarray(32, 64);
        this.decKey = key.subarray(32, 64);
        this.counter = 0;
    }
    generateIV(counter) {
        const iv = Buffer.alloc(12, 0);
        iv.writeUInt32BE(counter, 8);
        return iv;
    }
    /**
     * Initializes client hello frame for Noise XX pattern (-> e)
     */
    createClientHello() {
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
    finishInit() {
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
    encryptFrame(plaintext) {
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
    decryptFrame(frame) {
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
        }
        catch {
            return frame;
        }
    }
    setTransportKeys(writeKey, readKey) {
        this.cipherState = {
            encKey: writeKey,
            decKey: readKey,
            encCounter: 0,
            decCounter: 0
        };
    }
    isTransportReady() {
        return !!this.cipherState;
    }
}
//# sourceMappingURL=index.js.map