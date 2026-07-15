/**
 * Screen Wake Lock helper for the kitchen board.
 *
 * A dedicated kitchen tablet that locks/sleeps is the #1 reason the audio
 * context gets suspended and the new-order alarm goes silent. Holding a screen
 * wake lock keeps the display (and the tab) awake so audio keeps running.
 *
 * Notes:
 * - Requires a secure context and a recent user gesture to acquire.
 * - The browser auto-releases the lock when the tab is hidden, so we re-acquire
 *   it on `visibilitychange` → visible.
 */

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
}

interface WakeLockLike {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
}

let sentinel: WakeLockSentinelLike | null = null;
let visibilityHookInstalled = false;
let wanted = false;

function getWakeLock(): WakeLockLike | null {
  if (typeof navigator === "undefined") return null;
  const wl = (navigator as unknown as { wakeLock?: WakeLockLike }).wakeLock;
  return wl ?? null;
}

/** True when the browser exposes the Wake Lock API. */
export function isWakeLockSupported(): boolean {
  return getWakeLock() !== null;
}

/** Request a screen wake lock. Safe to call repeatedly; call from a user gesture. */
export async function requestScreenWakeLock(): Promise<void> {
  wanted = true;
  const wl = getWakeLock();
  if (!wl) return;
  if (sentinel && !sentinel.released) return;
  try {
    sentinel = await wl.request("screen");
    sentinel.addEventListener?.("release", () => {
      sentinel = null;
    });
    installVisibilityReacquire();
  } catch {
    // Denied / no gesture yet — the visibility hook retries on the next focus.
    installVisibilityReacquire();
  }
}

function installVisibilityReacquire(): void {
  if (visibilityHookInstalled) return;
  if (typeof document === "undefined") return;
  visibilityHookInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (
      wanted &&
      document.visibilityState === "visible" &&
      (sentinel === null || sentinel.released)
    ) {
      void requestScreenWakeLock();
    }
  });
}

/** Release the wake lock and stop re-acquiring it. */
export function releaseScreenWakeLock(): void {
  wanted = false;
  const current = sentinel;
  sentinel = null;
  try {
    void current?.release();
  } catch {
    /* ignore */
  }
}
