/**
 * Server-only: Vercel Redis / ex-KV (Upstash) sets these when the storage is
 * connected to the project. @vercel/kv 3 is backed by Upstash REST.
 */
export function isOrderInboxConfigured(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    process.env.KV_URL
  );
}
