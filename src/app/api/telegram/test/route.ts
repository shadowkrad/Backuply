import { NextRequest, NextResponse } from "next/server";
import { testTelegramConnection } from "@/lib/telegram";
import { getSettings } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const settings = getSettings();
    const botToken = body.botToken || settings.telegramBotToken;
    const chatId = body.chatId || settings.telegramChatId;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { ok: false, error: "Bot Token e Chat ID sono obbligatori per il test" },
        { status: 400 }
      );
    }

    const res = await testTelegramConnection(botToken, chatId);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: res.error || "Errore invio messaggio di prova Telegram" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Messaggio di prova inviato con successo a Telegram!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Errore imprevisto test Telegram" },
      { status: 500 }
    );
  }
}
