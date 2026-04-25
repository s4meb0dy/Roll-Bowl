import { applyOrderInboxEnv } from "./ensureKvEnv";

/**
 * Server-only: Vercel Redis / ex-KV (Upstash) sets these when the storage is
 * connected to the project. @vercel/kv 3 is backed by Upstash REST.
 * Custom Vercel integration prefixes (e.g. STORAGE_*) are copied to KV_* in
 * `applyOrderInboxEnv` so `@vercel/kv` can connect.
 */
export function isOrderInboxConfigured(): boolean {
  applyOrderInboxEnv();
  /* @vercel/kv only uses KV_REST_API_*; do not use KV_URL alone as "configured". */
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}
