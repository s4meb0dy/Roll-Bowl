import { NextResponse } from "next/server";
import { verifyAdminPin } from "./pinServer";
import { readAdminSessionToken, verifyAdminSessionToken } from "./adminSession";

/** Returns a 401 response when auth fails, otherwise null (proceed). */
export function requireAdminAuth(req: Request): NextResponse | null {
  const session = readAdminSessionToken(req);
  if (session && verifyAdminSessionToken(session)) {
    return null;
  }

  const pin = req.headers.get("x-admin-pin");
  if (verifyAdminPin(pin ?? "")) {
    return null;
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
