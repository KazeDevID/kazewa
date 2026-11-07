/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * KeepAlive & Connection Stability Engine for Kazewa
 * Maintains rock-solid WebSocket connection and Signal protocol state
 */
import type { AuthenticationCreds, SignalAuthState } from '../types/index.js';
export interface KeepAliveOptions {
    intervalMs?: number;
    timeoutMs?: number;
    maxBackoffMs?: number;
    onPing?: () => void;
    onTimeout?: () => void;
}
export declare class KeepAliveManager {
    private intervalMs;
    private timeoutMs;
    private maxBackoffMs;
    private pingTimer?;
    private pongTimeoutTimer?;
    private preKeyCheckTimer?;
    private backoffAttempts;
    private onPing?;
    private onTimeout?;
    private isAlive;
    constructor(options?: KeepAliveOptions);
    start(): void;
    private scheduleNextPing;
    private sendPing;
    onReceivePong(): void;
    /**
     * Calculates next reconnect delay with exponential backoff and randomized jitter
     */
    getNextReconnectDelay(): number;
    resetBackoff(): void;
    /**
     * Signal Pre-Key Health Monitor:
     * Keeps signal pre-key pool replenished so users never encounter "Waiting for this message" decryption failure!
     */
    startPreKeyReplenisher(creds: AuthenticationCreds, keys: SignalAuthState, onNewKeysUploaded?: (count: number) => void): void;
    stop(): void;
}
//# sourceMappingURL=keepalive.d.ts.map