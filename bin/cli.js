#!/usr/bin/env node

/**
 * Kazewa CLI - WhatsApp Bot Pairing & Session Manager
 * Copyright (c) 2026 Michael (KazeDevID)
 */

import { makeWASocket } from '../dist/index.js';
import { useCompactAuthState } from '../dist/auth/compactAuth.js';
import qrcode from 'qrcode';

const args = process.argv.slice(2);
const command = args[0] || 'help';

async function main() {
  console.log('\x1b[36m%s\x1b[0m', '╭──────────────────────────────────────────────╮');
  console.log('\x1b[36m%s\x1b[0m', '│   🌿 KAZEWA WHATSAPP BOT ENGINE & TOOLKIT   │');
  console.log('\x1b[36m%s\x1b[0m', '╰──────────────────────────────────────────────╯\n');

  if (command === 'help' || command === '--help' || command === '-h') {
    console.log('Usage:');
    console.log('  npx @kazedevid/kazewa pair --phone <number>   Pair via 8-digit Pairing Code');
    console.log('  npx @kazedevid/kazewa qr                      Pair via Terminal QR Code');
    console.log('  npx @kazedevid/kazewa stats                   Inspect current session stats');
    console.log('  npx @kazedevid/kazewa export                  Export single-line session string');
    process.exit(0);
  }

  const sessionPath = './session.kaze';
  const { state, saveCreds, getStats, exportSessionString } = await useCompactAuthState(sessionPath);

  if (command === 'stats') {
    const stats = await getStats();
    console.log('\x1b[32m✔ Session Stats:\x1b[0m');
    console.log(`  File: ${stats.filePath}`);
    console.log(`  Size: ${stats.fileSizeFormatted} (Compression: ${stats.compressionRatio})`);
    console.log(`  Total Keys: ${stats.keysCount}`);
    console.log(`  Pre-Keys: ${stats.preKeysCount}`);
    process.exit(0);
  }

  if (command === 'export') {
    const str = exportSessionString();
    console.log('\x1b[32m✔ Exported Single-Line Session Token:\x1b[0m\n');
    console.log(str);
    console.log('\nCopy and paste this into process.env.SESSION_ID for serverless hosting.');
    process.exit(0);
  }

  if (command === 'pair') {
    const phoneIdx = args.indexOf('--phone');
    const phone = phoneIdx !== -1 ? args[phoneIdx + 1] : undefined;
    if (!phone) {
      console.error('\x1b[31mError: Please provide --phone <number>\x1b[0m');
      console.error('Example: npx @kazedevid/kazewa pair --phone 628123456789');
      process.exit(1);
    }

    console.log(`\x1b[33mConnecting to WhatsApp Web gateway with Compact Session...\x1b[0m`);
    const sock = await makeWASocket({ auth: state });

    sock.ev.on('creds.update', saveCreds);

    const code = await sock.requestPairingCode(phone);
    console.log('\n\x1b[32m=============================================\x1b[0m');
    console.log(`  YOUR PAIRING CODE:  \x1b[1m\x1b[36m${code}\x1b[0m`);
    console.log('\x1b[32m=============================================\x1b[0m');
    console.log('Steps on your WhatsApp phone:');
    console.log('1. Open WhatsApp -> Settings -> Linked Devices');
    console.log('2. Tap "Link a Device" -> "Link with phone number instead"');
    console.log(`3. Enter the 8-digit code: ${code}\n`);

    sock.ev.on('connection.update', (update) => {
      if (update.connection === 'open') {
        console.log('\x1b[32m✔ WhatsApp Successfully Paired & Connected!\x1b[0m');
        console.log(`Session saved compactly at: ${sessionPath}`);
      }
    });
    return;
  }

  if (command === 'qr') {
    console.log(`\x1b[33mGenerating QR Code for WhatsApp Web...\x1b[0m`);
    const sock = await makeWASocket({ auth: state });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      if (update.qr) {
        try {
          const terminalQR = await qrcode.toString(update.qr, { type: 'terminal', small: true });
          console.log(terminalQR);
          console.log('Scan this QR code with WhatsApp -> Linked Devices -> Link a Device\n');
        } catch {
          console.log(`QR String: ${update.qr}`);
        }
      }
      if (update.connection === 'open') {
        console.log('\x1b[32m✔ WhatsApp Successfully Paired & Connected!\x1b[0m');
      }
    });
    return;
  }
}

main().catch(console.error);
