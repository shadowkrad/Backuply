import { NextResponse } from "next/server";
import { getLocalSnapshots, formatBytes, getBackupsDirectory } from "@/lib/storage";

export async function GET() {
  try {
    const snapshots = getLocalSnapshots();
    const totalBytes = snapshots.reduce((acc, s) => acc + s.sizeBytes, 0);

    return NextResponse.json({
      ok: true,
      directory: getBackupsDirectory(),
      count: snapshots.length,
      totalBytes,
      totalFormatted: formatBytes(totalBytes),
      snapshots,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
