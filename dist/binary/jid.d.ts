/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * WhatsApp JID manipulation utilities
 */
export declare const S_WHATSAPP_NET = "s.whatsapp.net";
export declare const OFFICIAL_BIZ_JID = "16505361212@c.us";
export interface FullJid {
    user: string;
    server: string;
    device?: number;
}
export declare function jidEncode(user: string, server?: string, device?: number): string;
export declare function jidDecode(jid: string): FullJid | undefined;
//# sourceMappingURL=jid.d.ts.map