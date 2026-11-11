/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Dual Pairing Helper for QR & Pairing Code utilities
 */

import { KazewaCrypto } from '../signal/crypto.js';
import type { AuthenticationCreds, ConnectionUpdate } from '../types/index.js';

export interface PairingOptions {
  pairingTimeoutMs?: number;
  qrRotationIntervalMs?: number;
  onUpdate?: (update: ConnectionUpdate) => void;
}

export class DualPairingManager {
  private creds: AuthenticationCreds;
  private pairingTimeoutMs: number;
  private qrIntervalMs: number;
  private onUpdate?: (update: ConnectionUpdate) => void;
  private qrTimer?: NodeJS.Timeout;
  private pairingCodeTimer?: NodeJS.Timeout;
  private currentMode: 'none' | 'qr' | 'code' = 'none';
  private currentPairingCode?: string;
  private currentQR?: string;

  constructor(creds: AuthenticationCreds, options: PairingOptions = {}) {
    this.creds = creds;
    this.pairingTimeoutMs = options.pairingTimeoutMs || 120_000;
    this.qrIntervalMs = options.qrRotationIntervalMs || 20_000;
    this.onUpdate = options.onUpdate;
  }

  public static sanitizePhoneNumber(raw: string): string {
    let cleaned = raw.replace(/\D/g, '');
    if (cleaned.startsWith('08')) {
      cleaned = '62' + cleaned.slice(1);
    }
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.slice(2);
    }
    return cleaned;
  }

  public getCurrentCode(): string | undefined {
    return this.currentPairingCode;
  }

  public getCurrentQR(): string | undefined {
    return this.currentQR;
  }

  public stopTimers(): void {
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
