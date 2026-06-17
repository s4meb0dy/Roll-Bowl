import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/admin/pinServer";
import { adminSessionSetCookieHeader } from "@/lib/admin/adminSession";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const pin = typeof (body as { pin?: unknown }).pin === "string" ? (body as { pin: string }).pin : "";
  if (!verifyAdminPin(pin)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": adminSessionSetCookieHeader() } }
  );
}
