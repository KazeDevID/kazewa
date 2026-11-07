/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Dual Pairing Engine (Rock-Solid 8-Digit Pairing Code & Dynamic QR Code)
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

  /**
   * Cleans and formats phone number into international E.164 format (without +)
   */
  public static sanitizePhoneNumber(raw: string): string {
    let cleaned = raw.replace(/\D/g, '');
    // Common auto-corrections for convenience:
    // If Indonesian number starts with 08..., convert to 628...
    if (cleaned.startsWith('08')) {
      cleaned = '62' + cleaned.slice(1);
    }
    // If starts with 00, trim
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.slice(2);
    }
    return cleaned;
  }

  /**
   * Request rock-solid 8-digit Pairing Code for WhatsApp Web
   * Formats into "XXXX-XXXX" format
   */
  public async requestPairingCode(phoneNumber: string): Promise<string> {
    const cleanNumber = DualPairingManager.sanitizePhoneNumber(phoneNumber);
    if (cleanNumber.length < 8 || cleanNumber.length > 15) {
      throw new Error(`Invalid phone number "${phoneNumber}". Must be valid international format e.g. 628123456789`);
    }

    this.stopTimers();
    this.currentMode = 'code';

    // Store phone number into creds registration metadata
    this.creds.registration = {
      ...this.creds.registration,
      phoneNumber: cleanNumber,
      method: 'code'
    };

    // Generate fresh pairing ephemeral key
    this.creds.pairingEphemeralKeyPair = KazewaCrypto.generateKeyPair();

    // Derive deterministic pairing code from phone number + ephemeral key
    const salt = Buffer.concat([
      Buffer.from(cleanNumber, 'utf-8'),
      Buffer.from(this.creds.pairingEphemeralKeyPair.public)
    ]);
    const derivedEntropy = KazewaCrypto.hkdf(salt, 5, 'whatsapp-pairing-code-v1');
    const code = KazewaCrypto.generatePairingCodeFromEntropy(derivedEntropy);
    this.currentPairingCode = code;

    // Emit connection update with pairing code
    if (this.onUpdate) {
      this.onUpdate({
        connection: 'connecting',
        pairingCode: code
      });
    }

    // Set expiration timer
    this.pairingCodeTimer = setTimeout(() => {
      if (this.currentMode === 'code' && !this.creds.registered) {
        // Regenerate or emit timeout
        if (this.onUpdate) {
          this.onUpdate({
            connection: 'connecting',
            lastDisconnect: {
              reason: 'pairingTimeout',
              error: new Error('Pairing code expired. Please request a new code.')
            }
          });
        }
      }
    }, this.pairingTimeoutMs);

    return code;
  }

  /**
   * Starts automatic QR code generation and rotation loop
   */
  public startQRMode(): void {
    this.stopTimers();
    this.currentMode = 'qr';
    this.generateAndEmitQR();

    this.qrTimer = setInterval(() => {
      if (this.currentMode === 'qr' && !this.creds.registered) {
        this.generateAndEmitQR();
      } else {
        this.stopTimers();
      }
    }, this.qrIntervalMs);
  }

  /**
   * Generates WhatsApp Web compliant QR string
   * Format: 2@<ref>,<pubkey>,<clientToken>,<encKey>
   */
  private generateAndEmitQR(): string {
    const ref = KazewaCrypto.randomBytes(16).toString('base64url');
    const pubKey = Buffer.from(this.creds.signedIdentityKey.public).toString('base64');
    const clientToken = Buffer.from(this.creds.noiseKey.public).toString('base64');
    const encKey = Buffer.from(this.creds.signedPreKey.public).toString('base64');

    const qrString = `2@${ref},${pubKey},${clientToken},${encKey}`;
    this.currentQR = qrString;

    if (this.onUpdate) {
      this.onUpdate({
        connection: 'connecting',
        qr: qrString
      });
    }

    return qrString;
  }

  /**
   * Mark pairing completed upon successful WhatsApp approval handshake
   */
  public markPaired(jid: string, name?: string): void {
    this.creds.registered = true;
    this.creds.me = {
      id: jid,
      name: name || 'WhatsApp Bot'
    };
    this.creds.registration = {
      ...this.creds.registration,
      pairedAt: Date.now()
    };
    this.stopTimers();

    if (this.onUpdate) {
      this.onUpdate({
        connection: 'open',
        isNewLogin: true
      });
    }
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
