import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/storage";
import { getSchedulerStatus } from "@/lib/scheduler";

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json({
      ok: true,
      settings,
      scheduler: getSchedulerStatus(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = saveSettings(body);
    return NextResponse.json({
      ok: true,
      message: "Impostazioni aggiornate con successo",
      settings: updated,
      scheduler: getSchedulerStatus(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
