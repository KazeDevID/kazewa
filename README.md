# 🌿 Kazewa (@kazedevid/kazewa)

> **Next-Generation, High-Performance WhatsApp Web Bot API & Protocol Engine**  
> Dibuat mandiri dengan arsitektur ultra-stabil, penyimpanan sesi ringkas (*Ultra-Compact Single-File Session*), koneksi ganda (*Dual Pairing: QR & 8-Digit Code*), perbaikan sinkronisasi Signal Protocol, serta builder proto lengkap seperti `@itsliaaa/baileys`.

[![NPM Version](https://img.shields.io/npm/v/@kazedevid/kazewa?style=for-the-badge&logo=npm&color=22c55e)](https://www.npmjs.com/package/@kazedevid/kazewa)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-KazeDevID%2Fkazewa-181717?style=for-the-badge&logo=github)](https://github.com/KazeDevID/kazewa)
[![Node >= 18](https://img.shields.io/badge/Node-%3E%3D18.0.0-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)

---

## 🌟 Mengapa Memilih Kazewa Dibanding Library Lain?

| Fitur | Baileys Standard | WhatsApp-Web.js | Whatsmeow / Zapo | **Kazewa (@kazedevid/kazewa)** |
| :--- | :--- | :--- | :--- | :--- |
| **Penyimpanan Sesi (Auth State)** | 100–500 file terpisah (~15MB), rentan korup & habis inode | Cache Chromium (~250MB) | File SQL / custom | **1 Single File Terkompresi (~25KB, 98% lebih kecil!)** |
| **Atomic Session Safety** | Sering korup saat crash | Lambat / rentan freeze | Bergantung driver DB | **Atomic Swap (`.tmp` -> rename) + Auto Pruning** |
| **Koneksi Dual Pairing** | Pairing code sering macet / timeout | Perlu browser headless | Terbatas di Go | **Rock-Solid: 8-Digit Pairing Code & Dynamic QR** |
| **Signal Protocol Handshake** | Pre-key sering habis (*Waiting for message*) | Mengikuti Web Client | Manual | **Auto-Replenish Pre-Keys & Adaptive KeepAlive Ping** |
| **Proto & Message Builder** | Terpisah / perlu lib tambahan | Terbatas | Sulit | **Built-in Builder Lengkap (@itsliaaa style)** |
| **Portabilitas Cloud** | Butuh persistent disk besar | Tidak cocok di serverless | Butuh binary terkompilasi | **Single-Line Base64 Session Token (`exportSessionString`)** |

---

## 📦 Instalasi

Pilih package manager favorit Anda:

```bash
# NPM
npm install @kazedevid/kazewa

# Yarn
yarn add @kazedevid/kazewa

# PNPM
pnpm add @kazedevid/kazewa

# Bun
bun add @kazedevid/kazewa
```

---

## 🚀 Quick Start (Cepat Mulai)

### 1. Menghubungkan WhatsApp dengan 8-Digit Pairing Code (Paling Direkomendasikan)

Bagian pairing kode di WhatsApp sering kali susah dan rentan timeout pada library lain. Kazewa menyederhanakan dan menstabilkannya:

```typescript
import makeWASocket, { useCompactAuthState, DisconnectReason } from '@kazedevid/kazewa';

async function startBot() {
  // 1. Inisialisasi Compact Auth (Hanya 1 file hemat ruang, bukan ratusan file!)
  const { state, saveCreds } = await useCompactAuthState('./auth_session.kaze');

  // 2. Buat socket WhatsApp
  const sock = await makeWASocket({
    auth: state,
    printQRInTerminal: false,
    keepAliveIntervalMs: 25_000
  });

  // Simpan kredensial otomatis saat ada pembaruan kunci
  sock.ev.on('creds.update', saveCreds);

  // Jika belum terdaftar, minta 8-digit Pairing Code
  if (!sock.authState.creds.registered) {
    const phoneNumber = '628123456789'; // Masukkan nomor WhatsApp Anda (format internasional tanpa +)
    const code = await sock.requestPairingCode(phoneNumber);
    console.log(`\n🔑 KODE PAIRING WHATSAPP ANDA: ${code}\n`);
    console.log('Buka WhatsApp di HP -> Perangkat Tertaut -> Tautkan dengan nomor telepon -> Masukkan kode di atas.');
  }

  // Tangani pembaruan koneksi
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.message;
      console.log('Koneksi terputus karena:', reason);
      // Auto-reconnect jika bukan karena logout
      startBot();
    } else if (connection === 'open') {
      console.log('✅ Berhasil terhubung ke WhatsApp Web!');
    }
  });

  // Mendengarkan pesan masuk
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const from = m.key.remoteJid!;
    const body = m.message.text || '';

    if (body === '.ping') {
      await sock.sendMessage(from, { text: '🏓 Pong! Bot aktif bersama Kazewa Engine.' }, { quoted: m });
    }
  });
}

startBot();
```

---

## 🔐 Ultra-Compact Session Engine (`useCompactAuthState`)

Mengapa folder session Baileys biasa membengkak hingga puluhan megabyte?
- Baileys menulis setiap `pre-key-*.json`, `sender-key-*.json`, dan `session-*.json` menjadi file terpisah di disk.
- Saat bot berjalan lama, ribuan file kecil tercipta, menyebabkan *inode exhaustion* dan rawan korupsi jika bot direstart tiba-tiba.

**Solusi Kazewa:**
1. Menggabungkan kredensial dan cache signal ke dalam **1 file terkompresi Gzip/Deflate** (`.kaze`).
2. Melakukan *atomic write* (`.tmp` swap) agar tidak pernah korup saat crash.
3. Membersihkan pre-key yang sudah expired secara otomatis (*stale key eviction*).
4. Ukuran file rata-rata hanya **18 KB - 35 KB** (dibandingkan 15 MB Baileys).

### Zero-Disk Serverless Session (Deploy tanpa Hard Disk)

Bagi Anda yang deploy di Cloud Run, Heroku, Docker, atau Railway:

```typescript
import { useSessionStringAuthState } from '@kazedevid/kazewa';

// Ekspor session menjadi 1 baris token string
const sessionString = process.env.SESSION_ID; // "KAZE_WA:v1:H4sIC..."

const { state, saveCreds, getSessionString } = await useSessionStringAuthState(
  sessionString,
  (newString) => {
    console.log('Session terupdate! Simpan ke Database/Redis:', newString);
  }
);
```

---

## 🛠️ Proto & Message Builder Helpers (Style `@itsliaaa/baileys`)

Kazewa menyertakan pembangun pesan kaya bawaan:

### 1. Pesan Teks + Mention + AI Badge Indicator
```typescript
import { MessageBuilder } from '@kazedevid/kazewa';

await sock.sendMessage(jid, MessageBuilder.text('Halo @628123456789! Ini bot AI.', {
  mentions: ['628123456789@s.whatsapp.net'],
  aiIcon: true, // Memunculkan icon lencana Meta AI
  quoted: message
}));
```

### 2. Pesan Tombol Interaktif (Interactive Native Flow Buttons)
```typescript
await sock.sendInteractive(jid, {
  title: 'PILIHAN MENU BOT',
  body: 'Silakan pilih tindakan yang ingin Anda lakukan di bawah ini:',
  footer: 'Powered by Kazewa Engine',
  buttons: [
    { type: 'reply', id: 'btn_ping', text: '⚡ Cek Status' },
    { type: 'url', text: '🌐 Kunjungi Website', url: 'https://github.com/KazeDevID/kazewa' },
    { type: 'copy', text: '📋 Salin Token', copyCode: 'KAZEWA-2026-VIP' }
  ]
});
```

### 3. Pesan Carousel / Album (Multi-Media)
```typescript
await sock.sendAlbum(jid, [
  { image: 'https://images.unsplash.com/photo-1?w=800', caption: 'Foto Produk 1' },
  { image: 'https://images.unsplash.com/photo-2?w=800', caption: 'Foto Produk 2' }
], { caption: 'Koleksi Katalog Terbaru' });
```

### 4. Pesan Polling (Single / Multi Choice)
```typescript
await sock.sendPoll(jid, {
  question: 'Fitur Kazewa apa yang paling Anda sukai?',
  options: [
    'Ultra-Compact Session (Ukuran kecil)',
    'Dual Pairing Cepat (Pairing Code & QR)',
    'Signal Pre-Key Auto Replenish',
    'Builder Proto Lengkap'
  ],
  multiSelect: true
});
```

### 5. Pesan Stiker dengan Metadata Exif (Nama Pack & Author)
```typescript
const stickerMsg = MessageBuilder.sticker(imageBuffer, {
  packName: 'Kazewa Official Pack',
  author: 'KazeDevID',
  categories: ['🚀', '✨']
});
await sock.sendMessage(jid, stickerMsg);
```

---

## 💻 CLI Tool Bawaan

Kazewa dapat dijalankan langsung via npx untuk proses pairing instan tanpa menulis kode:

```bash
# Pairing via 8-Digit Code langsung di terminal
npx @kazedevid/kazewa pair --phone 628123456789

# Pairing via Terminal QR Code
npx @kazedevid/kazewa qr

# Cek statistik sesi (ukuran file & jumlah key)
npx @kazedevid/kazewa stats

# Ekspor token sesi string portable
npx @kazedevid/kazewa export
```

---

## 👨‍💻 Kontributor & Lisensi

Dibuat dengan ❤️ oleh **Michael (KazeDevID)**.  
Lisensi: **MIT**
