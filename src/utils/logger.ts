/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Lightweight zero-dependency Logger for Kazewa
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_PRIORITY: { [k in LogLevel]: number } = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5
};

export class KazewaLogger {
  private level: LogLevel = 'info';
  private prefix = '[kazewa]';

  constructor(level: LogLevel = 'info', prefix: string = '[kazewa]') {
    this.level = level;
    this.prefix = prefix;
  }

  public child(childPrefix: string): KazewaLogger {
    return new KazewaLogger(this.level, `${this.prefix}:${childPrefix}`);
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(lvl: LogLevel): boolean {
    return LEVEL_PRIORITY[lvl] >= LEVEL_PRIORITY[this.level];
  }

  public trace(...args: any[]): void {
    if (this.shouldLog('trace')) {
      console.debug(`\x1b[90m${this.prefix} [TRACE]\x1b[0m`, ...args);
    }
  }

  public debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`\x1b[36m${this.prefix} [DEBUG]\x1b[0m`, ...args);
    }
  }

  public info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`\x1b[32m${this.prefix} [INFO]\x1b[0m`, ...args);
    }
  }

  public warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`\x1b[33m${this.prefix} [WARN]\x1b[0m`, ...args);
    }
  }

  public error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`\x1b[31m${this.prefix} [ERROR]\x1b[0m`, ...args);
    }
  }
}

export const defaultLogger = new KazewaLogger('info');
