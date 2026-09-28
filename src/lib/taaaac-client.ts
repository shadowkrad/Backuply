import fs from "node:fs";
import path from "node:path";
import { getBackupsDirectory, getSettings } from "./storage";
import { TenantBackupStatus, SyncResult } from "./types";

export async function fetchRemoteTenants(): Promise<{ ok: boolean; tenants: TenantBackupStatus[]; error?: string }> {
  const settings = getSettings();
  const url = `${settings.taaaacCoreUrl.replace(/\/$/, "")}/api/internal/backup/tenants`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: {
        "x-backuply-token": settings.backupSecretToken,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, tenants: [], error: `Errore HTTP ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();
    return { ok: true, tenants: data.tenants || [] };
  } catch (err: any) {
    return { ok: false, tenants: [], error: err.message || "Impossibile raggiungere Taaaac Cloud VPS" };
  }
}

export async function downloadTenantBackup(subdomain: string): Promise<{ ok: boolean; fileName?: string; sizeBytes?: number; error?: string }> {
  const settings = getSettings();
  const baseUrl = settings.taaaacCoreUrl.replace(/\/$/, "");
  const generateUrl = `${baseUrl}/api/internal/backup/generate`;

  try {
    // 1. Trigger generazione atomica del dump su Taaaac Cloud
    const genRes = await fetch(generateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-backuply-token": settings.backupSecretToken,
      },
      body: JSON.stringify({ subdomain }),
    });

    if (!genRes.ok) {
      const errJson = await genRes.json().catch(() => ({}));
      return { ok: false, error: errJson.error || `Errore generazione dump: HTTP ${genRes.status}` };
    }

    const genData = await genRes.json();
    const remoteFileName = genData.fileName; // es. backup_littlecreationsfamily_20260928_140000.db.gz

    // 2. Download in streaming del file direttamente su storage QNAP
    const downloadUrl = `${baseUrl}/api/internal/backup/download?file=${encodeURIComponent(remoteFileName)}&subdomain=${encodeURIComponent(subdomain)}`;
    const downRes = await fetch(downloadUrl, {
      headers: {
        "x-backuply-token": settings.backupSecretToken,
      },
    });

    if (!downRes.ok) {
      return { ok: false, error: `Errore download stream: HTTP ${downRes.status}` };
    }

    const arrayBuffer = await downRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const targetPath = path.join(getBackupsDirectory(), remoteFileName);
    fs.writeFileSync(targetPath, buffer);

    return {
      ok: true,
      fileName: remoteFileName,
      sizeBytes: buffer.length,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Errore durante il download dal cloud" };
  }
}
