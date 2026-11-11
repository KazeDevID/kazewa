/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Dual Pairing Helper for QR & Pairing Code utilities
 */
export class DualPairingManager {
    creds;
    pairingTimeoutMs;
    qrIntervalMs;
    onUpdate;
    qrTimer;
    pairingCodeTimer;
    currentMode = 'none';
    currentPairingCode;
    currentQR;
    constructor(creds, options = {}) {
        this.creds = creds;
        this.pairingTimeoutMs = options.pairingTimeoutMs || 120_000;
        this.qrIntervalMs = options.qrRotationIntervalMs || 20_000;
        this.onUpdate = options.onUpdate;
    }
    static sanitizePhoneNumber(raw) {
        let cleaned = raw.replace(/\D/g, '');
        if (cleaned.startsWith('08')) {
            cleaned = '62' + cleaned.slice(1);
        }
        if (cleaned.startsWith('00')) {
            cleaned = cleaned.slice(2);
        }
        return cleaned;
    }
    getCurrentCode() {
        return this.currentPairingCode;
    }
    getCurrentQR() {
        return this.currentQR;
    }
    stopTimers() {
        if (this.qrTimer) {
            clearInterval(this.qrTimer);
            this.qrTimer = undefined;
        }
        if (this.pairingCodeTimer) {
            clearTimeout(this.pairingCodeTimer);
            this.pairingCodeTimer = undefined;
        }
    }
}
//# sourceMappingURL=pairing.js.map