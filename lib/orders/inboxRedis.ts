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

export function isWrongTypeError(e: unknown): boolean {
  const m = (e && typeof e === "object" && "message" in e
    ? String((e as Error).message)
    : String(e)
  ).toLowerCase();
  return m.includes("wrongtype") || m.includes("wrong kind of value");
}
