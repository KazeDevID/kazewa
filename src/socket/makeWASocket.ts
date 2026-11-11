/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa WhatsApp Web Multi-Device Socket Client
 * Fully powered by reliable Baileys protocol engine with ultra-compact session,
 * rock-solid dual pairing (QR & 8-digit Crockford Pairing Code), and rich message builders.
 */
import makeBaileysSocket, {
  DisconnectReason,
  Browsers,
  type AuthenticationState,
  type ConnectionState
} from "@whiskeysockets/baileys";
import pino from "pino";
import { useCompactAuthState } from "../auth/compactAuth.js";
import { MessageBuilder } from "../builder/index.js";
import type {
  ConnectionUpdate,
  InteractiveButton,
  MessageContent,
  MessageKey,
  SocketConfig,
  WASocket
} from "../types/index.js";

export { DisconnectReason };

export function sanitizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("08")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Kazewa WhatsApp Web MD Socket Factory
 * Provides production-grade pairing code handshake that reliably links with WhatsApp Mobile & Web.
 */
export async function makeWASocket(config: SocketConfig = {}): Promise<WASocket> {
  let authState: AuthenticationState;
  let saveCredsHandler: () => Promise<void>;

  if (config.auth) {
    authState = config.auth;
    saveCredsHandler = async () => {};
  } else {
    const compactAuth = await useCompactAuthState("./session.kaze");
    authState = compactAuth.state;
    saveCredsHandler = compactAuth.saveCreds;
  }

  // Create quiet logger unless overridden
  const logger = config.logger || pino({ level: "silent" });

  // Browser config: [OS, Browser, Version]
  const browser = config.browser || Browsers.ubuntu("Chrome");

  // Initialize Baileys socket with clean configuration
  const rawSock: any = makeBaileysSocket({
    auth: authState,
    logger: logger as any,
    browser,
    printQRInTerminal: config.printQRInTerminal ?? false,
    connectTimeoutMs: config.connectTimeoutMs ?? 30_000,
    keepAliveIntervalMs: config.keepAliveIntervalMs ?? 30_000,
    defaultQueryTimeoutMs: config.defaultQueryTimeoutMs ?? 60_000,
    markOnlineOnConnect: config.markOnlineOnConnect ?? true,
    syncFullHistory: config.syncFullHistory ?? false,
    generateHighQualityLinkPreview: true,
    ...(config.options || {})
  });

  // Auto-persist creds when Baileys updates them
  rawSock.ev.on("creds.update", async () => {
    try {
      await saveCredsHandler();
    } catch (err: any) {
      logger.error?.("Failed to save creds on update:", err?.message);
    }
  });

  /**
   * Request rock-solid 8-digit Pairing Code for WhatsApp Web & Mobile
   * Communicates directly with WhatsApp servers and returns formatted Crockford code: XXXX-XXXX
   */
  const originalRequestPairingCode = rawSock.requestPairingCode.bind(rawSock);

  const requestPairingCode = async (phoneNumber: string, customPairingCode?: string): Promise<string> => {
    const cleanPhone = sanitizePhoneNumber(phoneNumber);
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      throw new Error(
        `Nomor telepon "${phoneNumber}" tidak valid. Gunakan format internasional (contoh: 628123456789).`
      );
    }

    // Wait until gateway is ready
    if (!rawSock.ws?.isOpen) {
      try {
        await rawSock.waitForConnectionUpdate((u: any) => !!u.qr || u.connection === "open", 15_000);
      } catch {
        // Continue if timeout
      }
    }

    // Call native Baileys requestPairingCode
    const rawCode = await originalRequestPairingCode(cleanPhone, customPairingCode);
    const code = String(rawCode || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const formatted = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4, 8)}` : code;

    // Display visually formatted terminal pairing box like Baileys / Indonesian bot standards
    console.log("\n\x1b[32m╭────────────────────────────────────────────────────────╮\x1b[0m");
    console.log("\x1b[32m│\x1b[0m      \x1b[1m\x1b[36m🌿 KAZEWA WHATSAPP PAIRING CODE SIAP DIGUNAKAN\x1b[0m     \x1b[32m│\x1b[0m");
    console.log("\x1b[32m├────────────────────────────────────────────────────────┤\x1b[0m");
    console.log(`\x1b[32m│\x1b[0m  📱 Target Nomor : \x1b[33m+${cleanPhone}\x1b[0m`);
    console.log(`\x1b[32m│\x1b[0m  🔑 Kode Pairing : \x1b[1m\x1b[32m${formatted}\x1b[0m`);
    console.log("\x1b[32m╰────────────────────────────────────────────────────────╯\x1b[0m");
    console.log("\x1b[33mPetunjuk menautkan di WhatsApp HP Anda:\x1b[0m");
    console.log("  1. Buka aplikasi WhatsApp di smartphone Anda.");
    console.log("  2. Buka Pengaturan / Titik Tiga (pojok kanan atas) -> \x1b[1mPerangkat Tertaut\x1b[0m.");
    console.log("  3. Ketuk \x1b[1mTautkan Perangkat\x1b[0m -> Pilih \x1b[1mTautkan dengan nomor telepon saja\x1b[0m.");
    console.log(`  4. Masukkan kode 8-digit ini: \x1b[1m\x1b[36m${formatted}\x1b[0m\n`);

    rawSock.ev.emit("connection.update", {
      connection: "connecting",
      pairingCode: formatted
    } as any);

    return formatted;
  };

  // Kazewa extended message helpers
  const sendInteractive = async (
    jid: string,
    data: {
      title?: string;
      body: string;
      footer?: string;
      buttons: InteractiveButton[];
      quoted?: any;
    }
  ) => {
    const content = MessageBuilder.interactive(data);
    return rawSock.sendMessage(jid, content as any, { quoted: data.quoted });
  };

  const sendAlbum = async (
    jid: string,
    items: Array<{ image?: any; video?: any; caption?: string }>,
    options: { caption?: string; quoted?: any } = {}
  ) => {
    const results = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const caption = i === 0 ? (options.caption || item.caption) : item.caption;
      if (item.image) {
        results.push(await rawSock.sendMessage(jid, { image: item.image, caption } as any, { quoted: options.quoted }));
      } else if (item.video) {
        results.push(await rawSock.sendMessage(jid, { video: item.video, caption } as any, { quoted: options.quoted }));
      }
    }
    return results[0];
  };

  const sendPoll = async (
    jid: string,
    data: { question: string; options: string[]; selectableCount?: number; multiSelect?: boolean }
  ) => {
    const pollMessage = {
      poll: {
        name: data.question,
        values: data.options,
        selectableCount: data.multiSelect === false ? 1 : data.selectableCount || data.options.length
      }
    };
    return rawSock.sendMessage(jid, pollMessage as any);
  };

  const sendReaction = async (key: MessageKey, emoji: string) => {
    return rawSock.sendMessage(key.remoteJid, {
      react: {
        text: emoji,
        key: key as any
      }
    } as any);
  };

  return Object.assign(rawSock, {
    requestPairingCode,
    sendInteractive,
    sendAlbum,
    sendPoll,
    sendReaction,
    authState
  }) as unknown as WASocket;
}

export default makeWASocket;
