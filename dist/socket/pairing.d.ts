/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Dual Pairing Engine (Rock-Solid 8-Digit Pairing Code & Dynamic QR Code)
 */
import type { AuthenticationCreds, ConnectionUpdate } from '../types/index.js';
export interface PairingOptions {
    pairingTimeoutMs?: number;
    qrRotationIntervalMs?: number;
    onUpdate?: (update: ConnectionUpdate) => void;
}
export declare class DualPairingManager {
    private creds;
    private pairingTimeoutMs;
    private qrIntervalMs;
    private onUpdate?;
    private qrTimer?;
    private pairingCodeTimer?;
    private currentMode;
    private currentPairingCode?;
    private currentQR?;
    constructor(creds: AuthenticationCreds, options?: PairingOptions);
    /**
     * Cleans and formats phone number into international E.164 format (without +)
     */
    static sanitizePhoneNumber(raw: string): string;
    /**
     * Request rock-solid 8-digit Pairing Code for WhatsApp Web
     * Formats into "XXXX-XXXX" format
     */
    requestPairingCode(phoneNumber: string): Promise<string>;
    /**
     * Starts automatic QR code generation and rotation loop
     */
    startQRMode(): void;
    /**
     * Generates WhatsApp Web compliant QR string
     * Format: 2@<ref>,<pubkey>,<clientToken>,<encKey>
     */
    private generateAndEmitQR;
    /**
     * Mark pairing completed upon successful WhatsApp approval handshake
     */
    markPaired(jid: string, name?: string): void;
    getCurrentCode(): string | undefined;
    getCurrentQR(): string | undefined;
    stopTimers(): void;
}
//# sourceMappingURL=pairing.d.ts.map