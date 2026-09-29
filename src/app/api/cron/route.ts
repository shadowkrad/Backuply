import { NextRequest, NextResponse } from "next/server";
import { runBackupSync } from "@/lib/sync-service";
import { getSettings } from "@/lib/storage";
import { getSchedulerStatus, startBackupScheduler } from "@/lib/scheduler";

export async function GET(req: NextRequest) {
  // Avvia lo scheduler in background se non ancora attivo
  startBackupScheduler();

  const { searchParams } = new URL(req.url);
  const trigger = searchParams.get("trigger");
  const token = req.headers.get("x-backuply-token") || searchParams.get("token");

  // Se è una semplice verifica di stato
  if (trigger !== "run") {
    return NextResponse.json({
      ok: true,
      scheduler: getSchedulerStatus(),
    });
  }

  // Se richiesto il trigger manuale/esterno, verifichiamo il token se fornito o consentito
  const settings = getSettings();
  if (settings.backupSecretToken && token && token !== settings.backupSecretToken) {
    return NextResponse.json({ ok: false, error: "Token non valido" }, { status: 401 });
  }

  const result = await runBackupSync({ isAutomated: true });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function POST(req: NextRequest) {
  const settings = getSettings();
  const token = req.headers.get("x-backuply-token");

  if (settings.backupSecretToken && token && token !== settings.backupSecretToken) {
    return NextResponse.json({ ok: false, error: "Token non valido" }, { status: 401 });
  }

  const result = await runBackupSync({ isAutomated: true });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
