import fs from "node:fs";
import path from "node:path";
import { downloadTenantBackup, fetchRemoteTenants } from "./taaaac-client";
import { getLocalSnapshots, getSettings, saveSettings, pruneOldSnapshots } from "./storage";
import { formatBackupTelegramReport, sendTelegramNotification } from "./telegram";
import { SyncResult } from "./types";

export interface RunBackupSyncOptions {
  subdomain?: string;
  isAutomated?: boolean;
}

const LOCK_FILE = path.join(process.cwd(), "data", ".backup.lock");

function tryAcquireLock(): boolean {
  try {
    const dataDir = path.dirname(LOCK_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(LOCK_FILE)) {
      try {
        const stats = fs.statSync(LOCK_FILE);
        const ageMs = Date.now() - stats.mtimeMs;
        // Se il lock ha più di 10 minuti, è orfano (es. crash processo precedente)
        if (ageMs > 10 * 60 * 1000) {
          console.warn("[Backuply Sync] ⚠️ Lock file obsoleto (> 10m). Rimozione forzata...");
          fs.unlinkSync(LOCK_FILE);
        } else {
          return false;
        }
      } catch {
        return false;
      }
    }

    const fd = fs.openSync(LOCK_FILE, "wx");
    fs.writeSync(fd, JSON.stringify({ pid: process.pid, time: new Date().toISOString() }));
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {}
}

const globalForSync = globalThis as unknown as {
  __backuply_sync_in_progress?: boolean;
  __backuply_last_sync_ts?: number;
  __backuply_last_sync_result?: SyncResult;
};

export async function runBackupSync(options?: RunBackupSyncOptions): Promise<SyncResult> {
  const startTime = Date.now();
  const targetSubdomain = options?.subdomain;
  const isAutomated = Boolean(options?.isAutomated);

  // Controllo concorrenza cross-process ed in-memory: solo un backup attivo alla volta
  if (globalForSync.__backuply_sync_in_progress || !tryAcquireLock()) {
    console.warn("[Backuply Sync] ⚠️ Un backup è già attualmente in corso (lock rilevato). Ritorno stato attuale senza duplicare il processo.");
    return {
      ok: true,
      message: "Un processo di sincronizzazione backup è già in corso.",
      downloadedCount: 0,
      totalBytes: 0,
      snapshots: getLocalSnapshots(),
      errors: [],
    };
  }

  // Se un backup automatico identico è appena stato eseguito da meno di 90 secondi (es. trigger concorrente cron + scheduler interno)
  const lastSyncAge = Date.now() - (globalForSync.__backuply_last_sync_ts || 0);
  if (isAutomated && lastSyncAge < 90000 && globalForSync.__backuply_last_sync_result) {
    console.log("[Backuply Sync] ℹ️ Backup completato meno di 90 secondi fa. Riutilizzo esito per evitare duplicazioni e doppie notifiche.");
    releaseLock();
    return globalForSync.__backuply_last_sync_result;
  }

  globalForSync.__backuply_sync_in_progress = true;

  const downloadedFiles: string[] = [];
  const errors: string[] = [];
  let totalBytes = 0;

  try {
    if (targetSubdomain && targetSubdomain !== "all") {
      // Sincronizzazione singolo tenant o core
      const res = await downloadTenantBackup(targetSubdomain);
      if (res.ok && res.fileName) {
        downloadedFiles.push(res.fileName);
        totalBytes += res.sizeBytes || 0;
      } else {
        errors.push(`[${targetSubdomain}]: ${res.error || "Errore sconosciuto"}`);
      }
    } else {
      // Sincronizzazione massiva di tutti i moduli e tenant
      const remoteRes = await fetchRemoteTenants();
      if (!remoteRes.ok) {
        const errMsg = `Errore recupero lista tenant da Taaaac: ${remoteRes.error}`;
        errors.push(errMsg);
      } else {
        for (const tenant of remoteRes.tenants) {
          const res = await downloadTenantBackup(tenant.subdomain);
          if (res.ok && res.fileName) {
            downloadedFiles.push(res.fileName);
            totalBytes += res.sizeBytes || 0;
          } else {
            errors.push(`[${tenant.subdomain}]: ${res.error || "Errore download"}`);
          }
        }
      }
    }

    // Applicazione retention
    const settings = getSettings();
    const { prunedCount, freedBytes } = pruneOldSnapshots(settings.retentionDays || 30);

    const isSuccess = errors.length === 0 && downloadedFiles.length > 0;
    const isPartial = errors.length > 0 && downloadedFiles.length > 0;
    const finalOk = isSuccess || isPartial;

    const durationMs = Date.now() - startTime;
    const currentSnapshots = getLocalSnapshots();

    const summaryMessage = isSuccess
      ? `Sincronizzazione completata: ${downloadedFiles.length} snapshot archiviati su QNAP.`
      : isPartial
      ? `Sincronizzazione parziale: ${downloadedFiles.length} snapshot salvati, ${errors.length} errori.`
      : `Errore sincronizzazione: ${errors[0] || "Nessun dato salvato"}`;

    // Aggiorna stato settings
    saveSettings({
      lastBackupRunAt: new Date().toISOString(),
      lastBackupStatus: isSuccess ? "SUCCESS" : isPartial ? "ERROR" : "ERROR",
      lastBackupMessage: summaryMessage,
    });

    // Notifica Telegram: invia sempre se token e chat id sono presenti
    const hasTelegramConfig = Boolean(settings.telegramBotToken && settings.telegramChatId);
    const isAlertsEnabled = settings.telegramAlertsEnabled !== false;
    const shouldNotify = hasTelegramConfig && isAlertsEnabled && (!isSuccess || settings.telegramNotifyOnSuccess !== false);

    if (shouldNotify) {
      const reportHtml = formatBackupTelegramReport({
        success: isSuccess,
        isAutomated,
        downloadedCount: downloadedFiles.length,
        totalBytes,
        downloadedFiles,
        errors,
        durationMs,
        prunedCount,
        freedBytes,
      });

      try {
        console.log("[Backuply] 📱 Invio notifica Telegram in corso...");
        const tgRes = await sendTelegramNotification(reportHtml, {
          botToken: settings.telegramBotToken,
          chatId: settings.telegramChatId,
        });
        if (tgRes.ok) {
          console.log("[Backuply] ✅ Notifica Telegram inviata con successo!");
        } else {
          console.error("[Backuply] ❌ Errore invio notifica Telegram:", tgRes.error);
        }
      } catch (tgErr: any) {
        console.error("[Backuply] ❌ Eccezione durante invio Telegram:", tgErr.message || tgErr);
      }
    } else {
      console.log(`[Backuply] Notifica Telegram non inviata (hasConfig=${hasTelegramConfig}, isAlertsEnabled=${isAlertsEnabled}, shouldNotify=${shouldNotify})`);
    }

    const resultPayload: SyncResult = {
      ok: finalOk,
      message: summaryMessage,
      downloadedCount: downloadedFiles.length,
      totalBytes,
      snapshots: currentSnapshots,
      errors,
    };

    globalForSync.__backuply_last_sync_ts = Date.now();
    globalForSync.__backuply_last_sync_result = resultPayload;

    return resultPayload;
  } catch (error: any) {
    const errorMsg = error.message || "Errore imprevisto durante il backup";
    console.error("[Backuply] Errore sincronizzazione:", error);

    const settings = getSettings();
    saveSettings({
      lastBackupRunAt: new Date().toISOString(),
      lastBackupStatus: "ERROR",
      lastBackupMessage: errorMsg,
    });

    const hasTelegramConfig = Boolean(settings.telegramBotToken && settings.telegramChatId);
    const isAlertsEnabled = settings.telegramAlertsEnabled !== false;

    if (hasTelegramConfig && isAlertsEnabled) {
      const reportHtml = formatBackupTelegramReport({
        success: false,
        isAutomated,
        downloadedCount: downloadedFiles.length,
        totalBytes,
        downloadedFiles,
        errors: [...errors, errorMsg],
        durationMs: Date.now() - startTime,
      });

      try {
        console.log("[Backuply] 📱 Invio notifica di ERRORE a Telegram in corso...");
        const tgRes = await sendTelegramNotification(reportHtml, {
          botToken: settings.telegramBotToken,
          chatId: settings.telegramChatId,
        });
        if (tgRes.ok) {
          console.log("[Backuply] ✅ Notifica Telegram di errore inviata!");
        } else {
          console.error("[Backuply] ❌ Errore API Telegram (errore backup):", tgRes.error);
        }
      } catch (tgErr: any) {
        console.error("[Backuply] ❌ Eccezione durante invio errore a Telegram:", tgErr.message || tgErr);
      }
    }

    const errPayload: SyncResult = {
      ok: false,
      message: errorMsg,
      downloadedCount: downloadedFiles.length,
      totalBytes,
      snapshots: getLocalSnapshots(),
      errors: [...errors, errorMsg],
    };

    globalForSync.__backuply_last_sync_ts = Date.now();
    globalForSync.__backuply_last_sync_result = errPayload;

    return errPayload;
  } finally {
    globalForSync.__backuply_sync_in_progress = false;
    releaseLock();
  }
}
