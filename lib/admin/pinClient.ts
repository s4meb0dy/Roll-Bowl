const ADMIN_SESSION_KEY = "roll-bowl-admin-unlocked";
const ADMIN_PIN_SESSION_KEY = "roll-bowl-admin-pin";

export function isAdminSessionUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAdminSessionUnlocked(pin?: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    if (pin) sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, pin);
  } catch {
    /* ignore */
  }
}

export function getStoredAdminPin(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ADMIN_PIN_SESSION_KEY);
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_PIN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Refresh the `rb_admin` session cookie from the PIN stored this session.
 * EventSource (the kitchen stream) can only authenticate via that cookie, which
 * may be missing or expired (e.g. tab left open > 12 h); re-verifying the stored
 * PIN re-issues a fresh cookie so the live link connects on the first try.
 * No-op (returns false) when no PIN is stored.
 */
export async function refreshAdminSessionCookie(): Promise<boolean> {
  const pin = getStoredAdminPin();
  if (!pin) return false;
  return verifyAdminPinRemote(pin);
}

export async function verifyAdminPinRemote(pin: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}
