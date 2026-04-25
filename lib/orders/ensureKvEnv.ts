/**
 * Vercel "Install integration" can set a custom env prefix (e.g. STORAGE_*).
 * @vercel/kv only reads KV_REST_API_URL and KV_REST_API_TOKEN, so we mirror
 * prefixed vars before any `kv` call. Import this module before `@vercel/kv`.
 */
function copyIfMissing(
  toKey: "KV_REST_API_URL" | "KV_REST_API_TOKEN",
  fromKeys: string[]
) {
  if (process.env[toKey]) return;
  for (const from of fromKeys) {
    const v = process.env[from];
    if (v) {
      process.env[toKey] = v;
      return;
    }
  }
}

if (typeof process !== "undefined") {
  copyIfMissing("KV_REST_API_URL", [
    "STORAGE_REST_API_URL",
    "UPSTASH_REDIS_REST_URL",
  ]);
  copyIfMissing("KV_REST_API_TOKEN", [
    "STORAGE_REST_API_TOKEN",
    "UPSTASH_REDIS_REST_TOKEN",
  ]);
  if (!process.env.KV_URL && process.env.STORAGE_URL) {
    process.env.KV_URL = process.env.STORAGE_URL;
  }
}
