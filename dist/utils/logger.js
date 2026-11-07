"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Lightweight zero-dependency Logger for Kazewa
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLogger = exports.KazewaLogger = void 0;
const LEVEL_PRIORITY = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    silent: 5
};
class KazewaLogger {
    level = 'info';
    prefix = '[kazewa]';
    constructor(level = 'info', prefix = '[kazewa]') {
        this.level = level;
        this.prefix = prefix;
    }
    child(childPrefix) {
        return new KazewaLogger(this.level, `${this.prefix}:${childPrefix}`);
    }
    setLevel(level) {
        this.level = level;
    }
    shouldLog(lvl) {
        return LEVEL_PRIORITY[lvl] >= LEVEL_PRIORITY[this.level];
    }
    trace(...args) {
        if (this.shouldLog('trace')) {
            console.debug(`\x1b[90m${this.prefix} [TRACE]\x1b[0m`, ...args);
        }
    }
    debug(...args) {
        if (this.shouldLog('debug')) {
            console.debug(`\x1b[36m${this.prefix} [DEBUG]\x1b[0m`, ...args);
        }
    }
    info(...args) {
        if (this.shouldLog('info')) {
            console.info(`\x1b[32m${this.prefix} [INFO]\x1b[0m`, ...args);
        }
    }
    warn(...args) {
        if (this.shouldLog('warn')) {
            console.warn(`\x1b[33m${this.prefix} [WARN]\x1b[0m`, ...args);
        }
    }
    error(...args) {
        if (this.shouldLog('error')) {
            console.error(`\x1b[31m${this.prefix} [ERROR]\x1b[0m`, ...args);
        }
    }
}
exports.KazewaLogger = KazewaLogger;
exports.defaultLogger = new KazewaLogger('info');
//# sourceMappingURL=logger.js.map