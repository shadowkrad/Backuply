import { NextRequest, NextResponse } from "next/server";
import { downloadTenantBackup, fetchRemoteTenants } from "@/lib/taaaac-client";
import { getLocalSnapshots } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetSubdomain = body.subdomain as string | undefined;

    const downloadedFiles: string[] = [];
    const errors: string[] = [];
    let totalBytes = 0;

    if (targetSubdomain && targetSubdomain !== "all") {
      // Sincronizzazione singolo tenant o core
      const res = await downloadTenantBackup(targetSubdomain);
      if (res.ok && res.fileName) {
        downloadedFiles.push(res.fileName);
        totalBytes += res.sizeBytes || 0;
      } else {
        errors.push(`[${targetSubdomain}]: ${res.error}`);
      }
    } else {
      // Sincronizzazione massiva di tutti i moduli e tenant
      const remoteRes = await fetchRemoteTenants();
      if (!remoteRes.ok) {
        return NextResponse.json(
          { ok: false, message: `Errore recupero lista tenant da Taaaac: ${remoteRes.error}`, errors: [remoteRes.error || ""] },
          { status: 502 }
        );
      }

      for (const tenant of remoteRes.tenants) {
        const res = await downloadTenantBackup(tenant.subdomain);
        if (res.ok && res.fileName) {
          downloadedFiles.push(res.fileName);
          totalBytes += res.sizeBytes || 0;
        } else {
          errors.push(`[${tenant.subdomain}]: ${res.error}`);
        }
      }
    }

    const currentSnapshots = getLocalSnapshots();

    return NextResponse.json({
      ok: errors.length === 0 || downloadedFiles.length > 0,
      message: `Sincronizzazione completata: ${downloadedFiles.length} snapshot archiviati su QNAP.`,
      downloadedCount: downloadedFiles.length,
      downloadedFiles,
      totalBytes,
      errors,
      snapshots: currentSnapshots,
    });
  } catch (error: any) {
    console.error("Errore sincronizzazione Backuply:", error);
    return NextResponse.json({ ok: false, message: error.message, errors: [error.message] }, { status: 500 });
  }
}
