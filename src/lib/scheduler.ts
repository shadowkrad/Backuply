import { getSettings } from "./storage";
import { runBackupSync } from "./sync-service";

let schedulerInterval: NodeJS.Timeout | null = null;
let lastExecutedDate: string | null = null;
let isJobRunning = false;

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
  if (schedulerInterval) {
    return; // Già attivo
  }

  console.log("[Backuply Scheduler] Inizializzazione motore di schedulazione automatico...");

  // Controllo ogni 45 secondi
  schedulerInterval = setInterval(async () => {
    if (isJobRunning) return;

    try {
      const settings = getSettings();
      if (!settings.autoBackupEnabled) return;

      const targetTime = (settings.autoBackupTime || "03:00").trim();
      const { timeStr, dateStr } = getLocalItalyTime();

      if (timeStr === targetTime && lastExecutedDate !== dateStr) {
        lastExecutedDate = dateStr;
        isJobRunning = true;
        console.log(`[Backuply Scheduler] ⏰ Orario target ${targetTime} raggiunto (oggi ${dateStr}). Avvio backup automatico...`);

        try {
          const res = await runBackupSync({ isAutomated: true });
          console.log(`[Backuply Scheduler] ✅ Backup automatico completato: ${res.downloadedCount} snapshot archiviati.`);
        } catch (err: any) {
          console.error("[Backuply Scheduler] ❌ Errore durante l'esecuzione del backup automatico:", err);
        } finally {
          isJobRunning = false;
        }
      }
    } catch (loopErr) {
      console.error("[Backuply Scheduler] Errore loop scheduler:", loopErr);
      isJobRunning = false;
    }
  }, 45000);

  // Evita che il timer blocchi l'uscita del processo
  if (schedulerInterval && typeof schedulerInterval.unref === "function") {
    schedulerInterval.unref();
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
    isActive: Boolean(schedulerInterval) && settings.autoBackupEnabled,
    isJobRunning,
    targetTime: settings.autoBackupTime || "03:00",
    currentTime: timeStr,
    currentDate: dateStr,
    lastExecutedDate,
  };
}
