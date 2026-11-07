"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa WhatsApp Web API & Protocol Library
 *
 * High-performance, ultra-compact session storage, rock-solid dual pairing (QR & 8-digit code),
 * and advanced proto message builders.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLogger = exports.KazewaLogger = exports.proto = exports.KazewaCrypto = exports.MessageBuilder = exports.KeepAliveManager = exports.DualPairingManager = exports.useMultiFileAuthState = exports.useSessionStringAuthState = exports.initAuthCreds = exports.useCompactAuthState = exports.makeWASocket = void 0;
const makeWASocket_js_1 = require("./socket/makeWASocket.js");
var makeWASocket_js_2 = require("./socket/makeWASocket.js");
Object.defineProperty(exports, "makeWASocket", { enumerable: true, get: function () { return makeWASocket_js_2.makeWASocket; } });
var compactAuth_js_1 = require("./auth/compactAuth.js");
Object.defineProperty(exports, "useCompactAuthState", { enumerable: true, get: function () { return compactAuth_js_1.useCompactAuthState; } });
Object.defineProperty(exports, "initAuthCreds", { enumerable: true, get: function () { return compactAuth_js_1.initAuthCreds; } });
var sessionString_js_1 = require("./auth/sessionString.js");
Object.defineProperty(exports, "useSessionStringAuthState", { enumerable: true, get: function () { return sessionString_js_1.useSessionStringAuthState; } });
var multiFileAuth_js_1 = require("./auth/multiFileAuth.js");
Object.defineProperty(exports, "useMultiFileAuthState", { enumerable: true, get: function () { return multiFileAuth_js_1.useMultiFileAuthState; } });
var pairing_js_1 = require("./socket/pairing.js");
Object.defineProperty(exports, "DualPairingManager", { enumerable: true, get: function () { return pairing_js_1.DualPairingManager; } });
var keepalive_js_1 = require("./socket/keepalive.js");
Object.defineProperty(exports, "KeepAliveManager", { enumerable: true, get: function () { return keepalive_js_1.KeepAliveManager; } });
var index_js_1 = require("./builder/index.js");
Object.defineProperty(exports, "MessageBuilder", { enumerable: true, get: function () { return index_js_1.MessageBuilder; } });
var crypto_js_1 = require("./signal/crypto.js");
Object.defineProperty(exports, "KazewaCrypto", { enumerable: true, get: function () { return crypto_js_1.KazewaCrypto; } });
var index_js_2 = require("./proto/index.js");
Object.defineProperty(exports, "proto", { enumerable: true, get: function () { return index_js_2.proto; } });
var logger_js_1 = require("./utils/logger.js");
Object.defineProperty(exports, "KazewaLogger", { enumerable: true, get: function () { return logger_js_1.KazewaLogger; } });
Object.defineProperty(exports, "defaultLogger", { enumerable: true, get: function () { return logger_js_1.defaultLogger; } });
__exportStar(require("./types/index.js"), exports);
exports.default = makeWASocket_js_1.makeWASocket;
//# sourceMappingURL=index.js.map