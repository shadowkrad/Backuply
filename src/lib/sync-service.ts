import { downloadTenantBackup, fetchRemoteTenants } from "./taaaac-client";
import { getLocalSnapshots, getSettings, saveSettings, pruneOldSnapshots } from "./storage";
import { formatBackupTelegramReport, sendTelegramNotification } from "./telegram";
import { SyncResult } from "./types";

export interface RunBackupSyncOptions {
  subdomain?: string;
  isAutomated?: boolean;
}

export async function runBackupSync(options?: RunBackupSyncOptions): Promise<SyncResult> {
  const startTime = Date.now();
  const targetSubdomain = options?.subdomain;
  const isAutomated = Boolean(options?.isAutomated);

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

    // Notifica Telegram se abilitata
    if (settings.telegramAlertsEnabled && settings.telegramBotToken && settings.telegramChatId) {
      const shouldNotify = !isSuccess || settings.telegramNotifyOnSuccess !== false;
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

        // Invio asincrono senza bloccare il flusso
        sendTelegramNotification(reportHtml).catch((tgErr) => {
          console.error("[Backuply] Errore invio notifica Telegram:", tgErr);
        });
      }
    }

    return {
      ok: finalOk,
      message: summaryMessage,
      downloadedCount: downloadedFiles.length,
      totalBytes,
      snapshots: currentSnapshots,
      errors,
    };
  } catch (error: any) {
    const errorMsg = error.message || "Errore imprevisto durante il backup";
    console.error("[Backuply] Errore sincronizzazione:", error);

    const settings = getSettings();
    saveSettings({
      lastBackupRunAt: new Date().toISOString(),
      lastBackupStatus: "ERROR",
      lastBackupMessage: errorMsg,
    });

    if (settings.telegramAlertsEnabled && settings.telegramBotToken && settings.telegramChatId) {
      const reportHtml = formatBackupTelegramReport({
        success: false,
        isAutomated,
        downloadedCount: downloadedFiles.length,
        totalBytes,
        downloadedFiles,
        errors: [...errors, errorMsg],
        durationMs: Date.now() - startTime,
      });

      sendTelegramNotification(reportHtml).catch(() => {});
    }

    return {
      ok: false,
      message: errorMsg,
      downloadedCount: downloadedFiles.length,
      totalBytes,
      snapshots: getLocalSnapshots(),
      errors: [...errors, errorMsg],
    };
  }
}
