/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * WhatsApp JID manipulation utilities
 */
export const S_WHATSAPP_NET = 's.whatsapp.net';
export const OFFICIAL_BIZ_JID = '16505361212@c.us';
export function jidEncode(user, server = S_WHATSAPP_NET, device) {
    const cleanUser = user.replace(/\D/g, '');
    if (device !== undefined && device > 0) {
        return `${cleanUser}:${device}@${server}`;
    }
    return `${cleanUser}@${server}`;
}
export function jidDecode(jid) {
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