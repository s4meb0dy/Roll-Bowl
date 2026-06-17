import { createHmac, timingSafeEqual } from "crypto";
import { getAdminPin } from "./pinServer";

export const ADMIN_SESSION_COOKIE = "rb_admin";
/** Kitchen tablet shift — re-enter PIN after 12 h. */
const MAX_AGE_S = 12 * 60 * 60;

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() || getAdminPin();
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createAdminSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const payload = String(exp);
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string): boolean {
  if (!token || token.length > 256) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number.parseInt(payload, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(payload);
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

export function adminSessionSetCookieHeader(): string {
  const token = createAdminSessionToken();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_S}${secure}`;
}

export function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

export function readAdminSessionToken(req: Request): string | null {
  const cookies = parseCookieHeader(req.headers.get("cookie"));
  return cookies[ADMIN_SESSION_COOKIE] ?? null;
}
