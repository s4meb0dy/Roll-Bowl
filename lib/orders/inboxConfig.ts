import "./ensureKvEnv";

/**
 * Server-only: Vercel Redis / ex-KV (Upstash) sets these when the storage is
 * connected to the project. @vercel/kv 3 is backed by Upstash REST.
 * Custom Vercel integration prefixes (e.g. STORAGE_*) are copied to KV_* in
 * `ensureKvEnv` so `@vercel/kv` can connect.
 */
export function isOrderInboxConfigured(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) || process.env.KV_URL
  );
}
