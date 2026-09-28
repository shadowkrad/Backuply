import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/storage";

export async function GET() {
  try {
    const settings = getSettings();
    // Nascondiamo parzialmente il token per sicurezza UI se desiderato, o esponiamolo mascherato
    return NextResponse.json({
      ok: true,
      settings,
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
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
