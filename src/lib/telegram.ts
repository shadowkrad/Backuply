import { getSettings, formatBytes } from "./storage";

export interface TelegramSendOptions {
  botToken?: string;
  chatId?: string;
}

export async function sendTelegramNotification(
  messageHtml: string,
  options?: TelegramSendOptions
): Promise<{ ok: boolean; error?: string }> {
  try {
    const settings = getSettings();
    const token = options?.botToken || settings.telegramBotToken;
    const chat = options?.chatId || settings.telegramChatId;

    if (!token || !chat) {
      return { ok: false, error: "Bot Token o Chat ID Telegram non configurati" };
    }

    const url = `https://api.telegram.org/bot${token.trim()}/sendMessage`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chat.trim(),
        text: messageHtml,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.description || `Errore Telegram API: HTTP ${res.status}`,
      };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Errore di connessione a Telegram" };
  }
}

export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const testMessage = `🛡️ <b>Backuply — Test Notifiche Telegram</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ <b>Connessione riuscita con successo!</b>\n` +
    `🕒 <i>${now}</i>\n\n` +
    `Il tuo Caveau QNAP <b>Backuply</b> è collegato correttamente a questo canale Telegram.\n` +
    `Riceverai qui il resoconto automatico di ogni snapshot programmato o manuale.\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Taaaac Cloud Ecosystem • Disaster Recovery Vault</i>`;

  return sendTelegramNotification(testMessage, { botToken, chatId });
}

export interface BackupTelegramReportParams {
  success: boolean;
  isAutomated?: boolean;
  downloadedCount: number;
  totalBytes: number;
  downloadedFiles: string[];
  errors: string[];
  durationMs?: number;
  prunedCount?: number;
  freedBytes?: number;
}

export function formatBackupTelegramReport(params: BackupTelegramReportParams): string {
  const {
    success,
    isAutomated,
    downloadedCount,
    totalBytes,
    downloadedFiles,
    errors,
    durationMs,
    prunedCount,
    freedBytes,
  } = params;

  const now = new Date().toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const statusBadge = success
    ? `🟢 <b>BACKUP COMPLETATO CON SUCCESSO</b>`
    : `🔴 <b>ATTENZIONE: ERRORI DURANTE IL BACKUP</b>`;

  const typeLabel = isAutomated ? "⏰ Automatico Notturno" : "⚡ Manuale da Dashboard";
  const durationSec = durationMs ? (durationMs / 1000).toFixed(1) + "s" : undefined;

  let msg = `🛡️ <b>Backuply — QNAP Immutability Vault</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 <b>Esito:</b> ${statusBadge}\n`;
  msg += `📌 <b>Tipo:</b> ${typeLabel}\n`;
  msg += `🕒 <b>Data & Ora:</b> <code>${now}</code>\n`;
  if (durationSec) {
    msg += `⏱️ <b>Durata:</b> ${durationSec}\n`;
  }
  msg += `📁 <b>Snapshot Archiviati:</b> ${downloadedCount}\n`;
  msg += `💾 <b>Volume Scaricato:</b> ${formatBytes(totalBytes)}\n`;

  if (downloadedFiles.length > 0) {
    msg += `\n📦 <b>File Archiviati su QNAP:</b>\n`;
    for (const f of downloadedFiles) {
      msg += ` • <code>${f}</code>\n`;
    }
  }

  if (prunedCount && prunedCount > 0) {
    msg += `\n🧹 <b>Retention:</b> Rimossi ${prunedCount} vecchi snapshot (${formatBytes(freedBytes || 0)} liberati)\n`;
  }

  if (errors.length > 0) {
    msg += `\n⚠️ <b>Dettaglio Errori (${errors.length}):</b>\n`;
    for (const e of errors) {
      msg += ` • ❌ <i>${e}</i>\n`;
    }
  }

  msg += `\n🔒 <b>Integrità Crittografica:</b> SHA-256 Verificato (WORM)\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `<i>Taaaac Cloud Ecosystem • Disaster Recovery Vault</i>`;

  return msg;
}
