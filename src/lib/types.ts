export type TenantModuleType = "core" | "vendoly" | "schedly" | "barberly" | "tavoly" | "taskly";

export interface BackupSnapshot {
  id: string;
  target: string; // es. 'core' o 'littlecreationsfamily'
  moduleType: TenantModuleType;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string;
  createdAt: string;
  isImmutable: boolean;
  integrityStatus: "verified" | "corrupted" | "unverified";
}

export interface TenantBackupStatus {
  id: string;
  name: string;
  subdomain: string;
  moduleType: TenantModuleType;
  customDomain?: string;
  status: "ONLINE" | "BACKED_UP" | "PENDING_SYNC" | "WARNING";
  lastBackupAt?: string;
  lastBackupSize?: string;
  lastBackupSha256?: string;
  totalSnapshots: number;
}

export interface BackuplySettings {
  taaaacCoreUrl: string;
  backupSecretToken: string;
  qnapStoragePath: string;
  cronSchedule: string; // es. '0 3 * * *'
  retentionDays: number; // es. 30
  telegramAlertsEnabled: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export interface SyncResult {
  ok: boolean;
  message: string;
  downloadedCount: number;
  totalBytes: number;
  snapshots: BackupSnapshot[];
  errors: string[];
}
