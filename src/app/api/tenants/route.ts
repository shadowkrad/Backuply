import { NextResponse } from "next/server";
import { fetchRemoteTenants } from "@/lib/taaaac-client";

export async function GET() {
  try {
    const res = await fetchRemoteTenants();
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ ok: false, tenants: [], error: error.message }, { status: 500 });
  }
}
