/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Dual Pairing Helper for QR & Pairing Code utilities
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
    static sanitizePhoneNumber(raw: string): string;
    getCurrentCode(): string | undefined;
    getCurrentQR(): string | undefined;
    stopTimers(): void;
}
//# sourceMappingURL=pairing.d.ts.map