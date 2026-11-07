"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * KeepAlive & Connection Stability Engine for Kazewa
 * Maintains rock-solid WebSocket connection and Signal protocol state
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeepAliveManager = void 0;
const crypto_js_1 = require("../signal/crypto.js");
class KeepAliveManager {
    intervalMs;
    timeoutMs;
    maxBackoffMs;
    pingTimer;
    pongTimeoutTimer;
    preKeyCheckTimer;
    backoffAttempts = 0;
    onPing;
    onTimeout;
    isAlive = true;
    constructor(options = {}) {
        this.intervalMs = options.intervalMs || 25_000;
        this.timeoutMs = options.timeoutMs || 10_000;
        this.maxBackoffMs = options.maxBackoffMs || 30_000;
        this.onPing = options.onPing;
        this.onTimeout = options.onTimeout;
    }
    start() {
        this.stop();
        this.isAlive = true;
        this.scheduleNextPing();
    }
    scheduleNextPing() {
        this.pingTimer = setTimeout(() => {
            this.sendPing();
        }, this.intervalMs);
    }
    sendPing() {
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
    onReceivePong() {
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
    getNextReconnectDelay() {
        this.backoffAttempts++;
        const base = Math.min(this.maxBackoffMs, 1000 * Math.pow(1.8, this.backoffAttempts));
        const jitter = Math.random() * 800;
        return Math.floor(base + jitter);
    }
    resetBackoff() {
        this.backoffAttempts = 0;
    }
    /**
     * Signal Pre-Key Health Monitor:
     * Keeps signal pre-key pool replenished so users never encounter "Waiting for this message" decryption failure!
     */
    startPreKeyReplenisher(creds, keys, onNewKeysUploaded) {
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
                    const newKeys = crypto_js_1.KazewaCrypto.generatePreKeys(nextId, batchSize);
                    await keys.set({ 'pre-key': newKeys });
                    creds.nextPreKeyId = nextId + batchSize;
                    if (onNewKeysUploaded) {
                        onNewKeysUploaded(batchSize);
                    }
                }
            }
            catch (err) {
                console.warn('[Kazewa] Error during prekey auto-replenishment:', err);
            }
        }, 10 * 60 * 1000);
    }
    stop() {
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
exports.KeepAliveManager = KeepAliveManager;
//# sourceMappingURL=keepalive.js.map