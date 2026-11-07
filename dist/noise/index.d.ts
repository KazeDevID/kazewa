/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native Noise Protocol (Noise_XX_25519_AESGCM_SHA256) for WhatsApp Web Gateway
 */
export declare const NOISE_PROLOGUE: Buffer<ArrayBuffer>;
export interface NoiseCipherState {
    encKey: Buffer;
    decKey: Buffer;
    encCounter: number;
    decCounter: number;
}
export declare class PureNoiseHandler {
    private ephemeralKeyPair;
    private staticKeyPair;
    private cipherState?;
    constructor(staticKeyPair: {
        publicKey: Buffer;
        privateKey: Buffer;
    });
    generateX25519KeyPair(): {
        publicKey: Buffer;
        privateKey: Buffer;
    };
    getEphemeralPublicKey(): Buffer;
    /**
     * Initializes client hello frame for Noise XX pattern (-> e)
     */
    createClientHello(): Buffer;
    /**
     * Decrypts an incoming binary frame using AES-256-GCM
     */
    decryptFrame(frame: Buffer): Buffer;
    /**
     * Encrypts an outgoing binary frame using AES-256-GCM and prepends 3-byte length
     */
    encryptFrame(plaintext: Buffer): Buffer;
    /**
     * Derives transport keys from shared secrets
     */
    setTransportKeys(writeKey: Buffer, readKey: Buffer): void;
}
//# sourceMappingURL=index.d.ts.map