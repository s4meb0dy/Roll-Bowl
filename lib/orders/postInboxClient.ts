import type { Order } from "@/lib/types";

type PostOutcome = "stored" | "not_configured" | "unavailable" | "error";

/**
 * Inspect an inbox POST response. A HTTP 200 is NOT enough: when Redis is not
 * configured the endpoint still returns 200 with `{ stored: false }`, which
 * means the kitchen PC will never see this order. We only count the write as a
 * real success when the server confirms `stored: true`.
 */
async function readOutcome(res: Response): Promise<PostOutcome> {
  const text = await res.text().catch(() => "");
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }

  if (res.ok) {
    // Missing body but 2xx — assume the older "stored on write" contract.
    if (!data) return "stored";
    if (data.stored === true) return "stored";
    if (data.reason === "inbox_not_configured") return "not_configured";
    return "unavailable";
  }

  if (res.status === 503 && (data?.reason === "inbox_unavailable" || text.includes("inbox_unavailable"))) {
    return "unavailable";
  }
  return "error";
}

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
  let outcome: PostOutcome = "error";

  try {
    const first = await fetch(inboxUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: ac.signal,
      keepalive: true,
    });
    outcome = await readOutcome(first);

    if (outcome !== "stored" && outcome !== "not_configured") {
      const retry = await fetch(inboxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
      outcome = await readOutcome(retry);
    }
  } catch (e) {
    const err = e as Error;
    if (err.name !== "AbortError") {
      console.warn("[orders/inbox]", e);
    }
    outcome = "error";
  } finally {
    window.clearTimeout(timer);
  }

  if (outcome === "not_configured") {
    console.warn(
      "[orders/inbox] Redis niet geconfigureerd — bestelling niet naar de keuken gesynchroniseerd."
    );
    return false;
  }
  if (outcome === "unavailable") {
    console.warn("[orders/inbox] Redis niet bereikbaar (lokaal ok)");
  }

  if (outcome !== "stored" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(inboxUrl, new Blob([body], { type: "application/json" }));
  }

  return outcome === "stored";
}
