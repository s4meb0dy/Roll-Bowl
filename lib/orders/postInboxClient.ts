import type { Order } from "@/lib/types";

/** POST order to Redis inbox (retries + sendBeacon fallback). */
export async function postOrderToInbox(order: Order): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const inboxUrl = `${window.location.origin}/api/orders/inbox`;
  let body: string;
  try {
    body = JSON.stringify(
      JSON.parse(JSON.stringify({ order })) as { order: Order }
    );
  } catch {
    body = JSON.stringify({ order });
  }

  const ac = new AbortController();
  const timer = window.setTimeout(() => ac.abort(), 12_000);
  let ok = false;

  try {
    let inboxRes = await fetch(inboxUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: ac.signal,
      keepalive: true,
    });
    if (inboxRes.ok) {
      ok = true;
    } else {
      const txt = await inboxRes.text().catch(() => "");
      const isInboxUnavailable =
        inboxRes.status === 503 && txt.includes("inbox_unavailable");
      if (isInboxUnavailable) {
        console.warn("[orders/inbox] Redis niet bereikbaar (lokaal ok)");
      } else {
        console.warn("[orders/inbox] HTTP", inboxRes.status, txt);
      }
    }
    if (!ok) {
      inboxRes = await fetch(inboxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
      if (inboxRes.ok) ok = true;
      else {
        const txt2 = await inboxRes.text().catch(() => "");
        const isInboxUnavailable =
          inboxRes.status === 503 && txt2.includes("inbox_unavailable");
        if (!isInboxUnavailable) {
          console.warn("[orders/inbox] retry", inboxRes.status, txt2);
        }
      }
    }
  } catch (e) {
    const err = e as Error;
    if (err.name !== "AbortError") {
      console.warn("[orders/inbox]", e);
    }
  } finally {
    window.clearTimeout(timer);
  }

  if (!ok && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(inboxUrl, new Blob([body], { type: "application/json" }));
  }

  return ok;
}
