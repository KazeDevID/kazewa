"use strict";
/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * WhatsApp JID manipulation utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OFFICIAL_BIZ_JID = exports.S_WHATSAPP_NET = void 0;
exports.jidEncode = jidEncode;
exports.jidDecode = jidDecode;
exports.S_WHATSAPP_NET = 's.whatsapp.net';
exports.OFFICIAL_BIZ_JID = '16505361212@c.us';
function jidEncode(user, server = exports.S_WHATSAPP_NET, device) {
    const cleanUser = user.replace(/\D/g, '');
    if (device !== undefined && device > 0) {
        return `${cleanUser}:${device}@${server}`;
    }
    return `${cleanUser}@${server}`;
}
function jidDecode(jid) {
    if (!jid || typeof jid !== 'string')
        return undefined;
    const atIdx = jid.indexOf('@');
    if (atIdx === -1)
        return undefined;
    const userSection = jid.slice(0, atIdx);
    const server = jid.slice(atIdx + 1);
    const colonIdx = userSection.indexOf(':');
    if (colonIdx !== -1) {
        return {
            user: userSection.slice(0, colonIdx),
            device: parseInt(userSection.slice(colonIdx + 1), 10),
            server
        };
    }
    return {
        user: userSection,
        server
    };
}
//# sourceMappingURL=jid.js.map