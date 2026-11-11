/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * KeepAlive & Connection Stability Engine for Kazewa
 * Maintains rock-solid WebSocket connection and Signal protocol state
 */

import { KazewaCrypto } from '../signal/crypto.js';
import type { AuthenticationCreds, SignalKeyStore } from '../types/index.js';

export interface KeepAliveOptions {
  intervalMs?: number;
  timeoutMs?: number;
  maxBackoffMs?: number;
  onPing?: () => void;
  onTimeout?: () => void;
}

export class KeepAliveManager {
  private intervalMs: number;
  private timeoutMs: number;
  private maxBackoffMs: number;
  private pingTimer?: NodeJS.Timeout;
  private pongTimeoutTimer?: NodeJS.Timeout;
  private preKeyCheckTimer?: NodeJS.Timeout;
  private backoffAttempts = 0;
  private onPing?: () => void;
  private onTimeout?: () => void;
  private isAlive = true;

  constructor(options: KeepAliveOptions = {}) {
    this.intervalMs = options.intervalMs || 25_000;
    this.timeoutMs = options.timeoutMs || 10_000;
    this.maxBackoffMs = options.maxBackoffMs || 30_000;
    this.onPing = options.onPing;
    this.onTimeout = options.onTimeout;
  }

  public start(): void {
    this.stop();
    this.isAlive = true;
    this.scheduleNextPing();
  }

  private scheduleNextPing(): void {
    this.pingTimer = setTimeout(() => {
      this.sendPing();
    }, this.intervalMs);
  }

  private sendPing(): void {
    this.isAlive = false;
    if (this.onPing) {
      this.onPing();
    }

    // Set pong timeout
    this.pongTimeoutTimer = setTimeout(() => {
      if (!this.isAlive) {
        if (this.onTimeout) {
          this.onTimeout();
        }
      }
    }, this.timeoutMs);
  }

  public onReceivePong(): void {
    this.isAlive = true;
    this.backoffAttempts = 0;
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = undefined;
    }
    this.scheduleNextPing();
  }

  /**
   * Calculates next reconnect delay with exponential backoff and randomized jitter
   */
  public getNextReconnectDelay(): number {
    this.backoffAttempts++;
    const base = Math.min(this.maxBackoffMs, 1000 * Math.pow(1.8, this.backoffAttempts));
    const jitter = Math.random() * 800;
    return Math.floor(base + jitter);
  }

  public resetBackoff(): void {
    this.backoffAttempts = 0;
  }

  /**
   * Signal Pre-Key Health Monitor:
   * Keeps signal pre-key pool replenished so users never encounter "Waiting for this message" decryption failure!
   */
  public startPreKeyReplenisher(
    creds: AuthenticationCreds,
    keys: SignalKeyStore,
    onNewKeysUploaded?: (count: number) => void
  ): void {
    if (this.preKeyCheckTimer) {
      clearInterval(this.preKeyCheckTimer);
    }

    // Check pre-keys every 10 minutes
    this.preKeyCheckTimer = setInterval(async () => {
      try {
        const nextId = creds.nextPreKeyId || 1;
        const testIds = Array.from({ length: 30 }, (_, i) => (nextId + i).toString());
        const existing = await keys.get('pre-key', testIds);
        const count = Object.keys(existing).length;

        // If available pre-keys drop below 20, generate a fresh batch of 50
        if (count < 20) {
          const batchSize = 50;
          const newKeys = KazewaCrypto.generatePreKeys(nextId, batchSize);
          await keys.set({ 'pre-key': newKeys });
          creds.nextPreKeyId = nextId + batchSize;

          if (onNewKeysUploaded) {
            onNewKeysUploaded(batchSize);
          }
        }
      } catch (err) {
        console.warn('[Kazewa] Error during prekey auto-replenishment:', err);
      }
    }, 10 * 60 * 1000);
  }

  public stop(): void {
    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = undefined;
    }
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = undefined;
    }
    if (this.preKeyCheckTimer) {
      clearInterval(this.preKeyCheckTimer);
      this.preKeyCheckTimer = undefined;
    }
  }
}
