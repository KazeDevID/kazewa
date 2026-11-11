/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native Noise Handshake (Noise_XX_25519_AESGCM_SHA256) for WhatsApp Web Gateway
 * Implemented natively using node:crypto without external framework dependencies
 */
export declare const NOISE_WA_HEADER: Buffer<ArrayBuffer>;
export declare const NOISE_MODE: Buffer<ArrayBuffer>;
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
    private hash;
    private salt;
    private encKey;
    private decKey;
    private counter;
    private sentIntro;
    private inBytes;
    constructor(staticKeyPair: {
        publicKey: Buffer;
        privateKey: Buffer;
    });
    getEphemeralPublicKey(): Buffer;
    authenticate(data: Buffer): void;
    private mixIntoKey;
    private generateIV;
    /**
     * Initializes client hello frame for Noise XX pattern (-> e)
     */
    createClientHello(): Buffer;
    /**
     * Transition handshake to full transport encryption state
     */
    finishInit(): void;
    /**
     * Encrypts outgoing frame with AES-256-GCM and prepends 3-byte length
     */
    encryptFrame(plaintext: Buffer): Buffer;
    /**
     * Decrypts incoming binary frame using AES-256-GCM
     */
    decryptFrame(frame: Buffer): Buffer;
    setTransportKeys(writeKey: Buffer, readKey: Buffer): void;
    isTransportReady(): boolean;
}
//# sourceMappingURL=index.d.ts.map