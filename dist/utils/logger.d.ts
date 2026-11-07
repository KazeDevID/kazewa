/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Lightweight zero-dependency Logger for Kazewa
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
export declare class KazewaLogger {
    private level;
    private prefix;
    constructor(level?: LogLevel, prefix?: string);
    child(childPrefix: string): KazewaLogger;
    setLevel(level: LogLevel): void;
    private shouldLog;
    trace(...args: any[]): void;
    debug(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
}
export declare const defaultLogger: KazewaLogger;
//# sourceMappingURL=logger.d.ts.map