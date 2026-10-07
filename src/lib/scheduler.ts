import { getSettings } from "./storage";
import { runBackupSync } from "./sync-service";

const globalForBackuply = globalThis as unknown as {
  __backuply_scheduler_interval?: NodeJS.Timeout | null;
  __backuply_last_executed_date?: string | null;
  __backuply_is_running?: boolean;
};

export function getLocalItalyTime(date = new Date()): { timeStr: string; dateStr: string } {
  const timeZone = process.env.TZ || "Europe/Rome";
  try {
    const timeStr = new Intl.DateTimeFormat("it-IT", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);

    const dateStr = new Intl.DateTimeFormat("it-IT", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

    return { timeStr, dateStr };
  } catch {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return { timeStr: `${h}:${m}`, dateStr: `${d}/${mo}/${y}` };
  }
}

export function startBackupScheduler(): void {
  if (globalForBackuply.__backuply_scheduler_interval) {
    return; // Già attivo nel runtime di processo
  }

  console.log("[Backuply Scheduler] Inizializzazione motore di schedulazione automatico...");

  // Controllo ogni 45 secondi
  const interval = setInterval(async () => {
    if (globalForBackuply.__backuply_is_running) return;

    try {
      const settings = getSettings();
      if (!settings.autoBackupEnabled) return;

      const targetTime = (settings.autoBackupTime || "03:00").trim();
      const { timeStr, dateStr } = getLocalItalyTime();

      // Verifica se oggi è già stato eseguito un backup automatico
      if (settings.lastBackupRunAt) {
        try {
          const lastRunDate = new Date(settings.lastBackupRunAt);
          const { dateStr: lastRunDateStr } = getLocalItalyTime(lastRunDate);
          if (lastRunDateStr === dateStr) {
            globalForBackuply.__backuply_last_executed_date = dateStr;
          }
        } catch {}
      }

      if (timeStr === targetTime && globalForBackuply.__backuply_last_executed_date !== dateStr) {
        globalForBackuply.__backuply_last_executed_date = dateStr;
        globalForBackuply.__backuply_is_running = true;
        console.log(`[Backuply Scheduler] ⏰ Orario target ${targetTime} raggiunto (oggi ${dateStr}). Avvio backup automatico...`);

        try {
          const res = await runBackupSync({ isAutomated: true });
          console.log(`[Backuply Scheduler] ✅ Backup automatico completato: ${res.downloadedCount} snapshot archiviati.`);
        } catch (err: any) {
          console.error("[Backuply Scheduler] ❌ Errore durante l'esecuzione del backup automatico:", err);
        } finally {
          globalForBackuply.__backuply_is_running = false;
        }
      }
    } catch (loopErr) {
      console.error("[Backuply Scheduler] Errore loop scheduler:", loopErr);
      globalForBackuply.__backuply_is_running = false;
    }
  }, 45000);

  globalForBackuply.__backuply_scheduler_interval = interval;

  // Evita che il timer blocchi l'uscita del processo
  if (interval && typeof interval.unref === "function") {
    interval.unref();
  }
}

export function getSchedulerStatus(): {
  isActive: boolean;
  isJobRunning: boolean;
  targetTime: string;
  currentTime: string;
  currentDate: string;
  lastExecutedDate: string | null;
} {
  const { timeStr, dateStr } = getLocalItalyTime();
  const settings = getSettings();

  return {
    isActive: Boolean(globalForBackuply.__backuply_scheduler_interval) && settings.autoBackupEnabled,
    isJobRunning: Boolean(globalForBackuply.__backuply_is_running),
    targetTime: settings.autoBackupTime || "03:00",
    currentTime: timeStr,
    currentDate: dateStr,
    lastExecutedDate: globalForBackuply.__backuply_last_executed_date || null,
  };
}
