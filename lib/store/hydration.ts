"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store/useStore";

type StorePersist = typeof useStore.persist;

/**
 * Zustand does not install `persist` at all when the browser refuses access to
 * localStorage (Safari with all cookies blocked, some in-app webviews), so the
 * API we rely on can legitimately be missing at runtime.
 */
function getPersist(): StorePersist | undefined {
  return (useStore as unknown as { persist?: StorePersist }).persist;
}

/** Re-read persisted state, tolerating a storage that refuses to be read. */
export function rehydrateStore(): void {
  const persist = getPersist();
  if (!persist) return;
  try {
    void Promise.resolve(persist.rehydrate()).catch(() => {});
  } catch {
    /* unreadable storage — carry on with in-memory state */
  }
}

/**
 * A failed rehydration never fires zustand's finish listeners, so anything that
 * blocks rendering on hydration has to time out on its own. Local storage reads
 * are synchronous, so this only ever elapses when something went wrong.
 */
const HYDRATION_TIMEOUT_MS = 1_500;

/**
 * True once persisted state has been read — or once it is clear it never will
 * be. Screens that must not be withheld from the customer (the order
 * confirmation above all) should gate on this rather than on `hasHydrated()`.
 */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = getPersist();
    if (!persist) {
      setHydrated(true);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setHydrated(true);
    };

    const unsub = persist.onFinishHydration(finish);
    rehydrateStore();
    if (persist.hasHydrated()) finish();
    const timer = setTimeout(finish, HYDRATION_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  return hydrated;
}
