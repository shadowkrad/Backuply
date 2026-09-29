import { NextRequest, NextResponse } from "next/server";
import { runBackupSync } from "@/lib/sync-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetSubdomain = body.subdomain as string | undefined;

    const result = await runBackupSync({
      subdomain: targetSubdomain,
      isAutomated: false,
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error: any) {
    console.error("Errore sincronizzazione Backuply:", error);
    return NextResponse.json({ ok: false, message: error.message, errors: [error.message] }, { status: 500 });
  }
}

