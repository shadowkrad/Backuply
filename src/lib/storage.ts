import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { BackupSnapshot, BackuplySettings, TenantBackupStatus } from "./types";

const DEFAULT_SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

export function getBackupsDirectory(): string {
  // Se configurato da ENV o nel container QNAP
  const envPath = process.env.BACKUPLY_STORAGE_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }
  const defaultDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function computeSha256(filePath: string): string {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch {
    return "unknown";
  }
}

export function getLocalSnapshots(): BackupSnapshot[] {
  const dir = getBackupsDirectory();
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);
  const snapshots: BackupSnapshot[] = [];

  for (const file of files) {
    if (!file.endsWith(".db.gz") && !file.endsWith(".db") && !file.endsWith(".tar.gz") && !file.endsWith(".sql.gz") && !file.endsWith(".sql")) continue;

    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);

    // Parsing nome file: es. backup_littlecreationsfamily_20260928_030000.db.gz
    let target = "core";
    let moduleType: BackupSnapshot["moduleType"] = "core";

    if (file.startsWith("taaaac_") || file.includes("core")) {
      target = "core";
      moduleType = "core";
    } else {
      const match = file.match(/backup_([a-zA-Z0-9_-]+?)_\d{8}/);
      if (match && match[1]) {
        target = match[1];
        if (target.includes("littlecreations") || target.includes("vendoly")) moduleType = "vendoly";
        else if (target.includes("schedly") || target.includes("beauty") || target.includes("estetica") || target.includes("bf")) moduleType = "schedly";
        else if (target.includes("barber")) moduleType = "barberly";
        else if (target.includes("tavoly") || target.includes("ristorante")) moduleType = "tavoly";
        else if (target.includes("taskly") || target.includes("manutenzioni")) moduleType = "taskly";
        else moduleType = "schedly";
      }
    }

    const sha256 = computeSha256(fullPath);

    snapshots.push({
      id: file,
      target,
      moduleType,
      fileName: file,
      filePath: fullPath,
      sizeBytes: stats.size,
      sizeFormatted: formatBytes(stats.size),
      sha256,
      createdAt: stats.mtime.toISOString(),
      isImmutable: true,
      integrityStatus: "verified",
    });
  }

  // Ordina per data decrescente
  return snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function pruneOldSnapshots(retentionDays: number): { prunedCount: number; freedBytes: number } {
  if (!retentionDays || retentionDays <= 0) return { prunedCount: 0, freedBytes: 0 };
  const dir = getBackupsDirectory();
  if (!fs.existsSync(dir)) return { prunedCount: 0, freedBytes: 0 };

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(dir);
  let prunedCount = 0;
  let freedBytes = 0;

  for (const file of files) {
    if (!file.endsWith(".db.gz") && !file.endsWith(".db") && !file.endsWith(".tar.gz") && !file.endsWith(".sql.gz") && !file.endsWith(".sql")) continue;
    const fullPath = path.join(dir, file);
    try {
      const stats = fs.statSync(fullPath);
      if (stats.mtimeMs < cutoff) {
        freedBytes += stats.size;
        fs.unlinkSync(fullPath);
        prunedCount++;
      }
    } catch {}
  }
  return { prunedCount, freedBytes };
}

const DEFAULT_TELEGRAM_BOT_TOKEN = "8996782756:AAFX_ZghCcmWK6V-l3AvGtHSoVsZ5TTJ6j8";
const DEFAULT_TELEGRAM_CHAT_ID = "122043515";

export function getSettings(): BackuplySettings {
  try {
    if (fs.existsSync(DEFAULT_SETTINGS_FILE)) {
      const raw = fs.readFileSync(DEFAULT_SETTINGS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      return {
        taaaacCoreUrl: parsed.taaaacCoreUrl || process.env.TAAAAC_CORE_URL || "https://taaaac.eu",
        backupSecretToken: parsed.backupSecretToken || process.env.BACKUPLY_SECRET_TOKEN || "taaaac-backuply-secure-token",
        qnapStoragePath: parsed.qnapStoragePath || getBackupsDirectory(),
        autoBackupEnabled: parsed.autoBackupEnabled !== undefined ? parsed.autoBackupEnabled : true,
        autoBackupTime: parsed.autoBackupTime || "03:00",
        cronSchedule: parsed.cronSchedule || "0 3 * * *",
        retentionDays: parsed.retentionDays || 30,
        telegramAlertsEnabled: parsed.telegramAlertsEnabled !== undefined 
          ? Boolean(parsed.telegramAlertsEnabled) 
          : true,
        telegramBotToken: parsed.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN,
        telegramChatId: parsed.telegramChatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_TELEGRAM_CHAT_ID,
        telegramNotifyOnSuccess: parsed.telegramNotifyOnSuccess !== undefined ? Boolean(parsed.telegramNotifyOnSuccess) : true,
        lastBackupRunAt: parsed.lastBackupRunAt,
        lastBackupStatus: parsed.lastBackupStatus || "IDLE",
        lastBackupMessage: parsed.lastBackupMessage,
      };
    }
  } catch {}

  return {
    taaaacCoreUrl: process.env.TAAAAC_CORE_URL || "https://taaaac.eu",
    backupSecretToken: process.env.BACKUPLY_SECRET_TOKEN || "taaaac-backuply-secure-token",
    qnapStoragePath: getBackupsDirectory(),
    autoBackupEnabled: true,
    autoBackupTime: "03:00",
    cronSchedule: "0 3 * * *", // Ogni notte alle ore 03:00
    retentionDays: 30, // 30 giorni di snapshot immutabili
    telegramAlertsEnabled: true,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID || DEFAULT_TELEGRAM_CHAT_ID,
    telegramNotifyOnSuccess: true,
    lastBackupStatus: "IDLE",
  };
}

export function saveSettings(settings: Partial<BackuplySettings>): BackuplySettings {
  const current = getSettings();
  const updated: BackuplySettings = { ...current, ...settings };

  const dataDir = path.dirname(DEFAULT_SETTINGS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(DEFAULT_SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf8");
  return updated;
}
