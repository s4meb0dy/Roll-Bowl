import { createClient, type VercelKV } from "@vercel/kv";
import { applyOrderInboxEnv } from "./ensureKvEnv";

/**
 * Build a **fresh** Upstash client after `applyOrderInboxEnv` so we never use
 * @vercel/kv's module singleton, which can initialize before env is mapped from
 * REDIS_URL / STORAGE_*.
 */
export function getInboxRedis(): VercelKV {
  applyOrderInboxEnv();
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("inbox: KV_REST_API_URL / KV_REST_API_TOKEN not set");
  }
  return createClient({ url, token });
}

function errorMessage(e: unknown): string {
  return (e && typeof e === "object" && "message" in e
    ? String((e as Error).message)
    : String(e)
  ).toLowerCase();
}

export function isWrongTypeError(e: unknown): boolean {
  const m = errorMessage(e);
  return m.includes("wrongtype") || m.includes("wrong kind of value");
}

/**
 * True for "Upstash REST is currently unreachable" — typical when running
 * `next dev` on a laptop without the env vars filled in, or when offline.
 *
 * Callers should map these to HTTP 503 ("inbox_unavailable") instead of 500
 * so the kitchen client treats them as transient and keeps the optimistic
 * UI quiet.
 */
export function isInboxUnreachableError(e: unknown): boolean {
  const m = errorMessage(e);
  return (
    m.includes("fetch failed") ||
    m.includes("kv_rest_api_url") ||
    m.includes("econnrefused") ||
    m.includes("enotfound") ||
    m.includes("etimedout") ||
    m.includes("getaddrinfo") ||
    m.includes("network request failed")
  );
}
