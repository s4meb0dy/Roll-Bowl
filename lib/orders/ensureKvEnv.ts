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

  /**
   * Vercel/Upstash often add only `REDIS_URL` (redis:// or rediss:// with user:password
   * in the host part). @vercel/kv uses the Upstash **HTTP** REST API — same host,
   * token = password in the URL (usually user `default`).
   */
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    const raw = process.env.REDIS_URL;
    if (raw) {
      try {
        const u = new URL(raw);
        if ((u.protocol === "redis:" || u.protocol === "rediss:") && u.hostname) {
          const token = u.password
            ? decodeURIComponent(u.password)
            : (process.env.REDIS_TOKEN ? String(process.env.REDIS_TOKEN) : "");
          if (token) {
            if (!process.env.KV_REST_API_URL) {
              process.env.KV_REST_API_URL = `https://${u.hostname}`;
            }
            if (!process.env.KV_REST_API_TOKEN) {
              process.env.KV_REST_API_TOKEN = token;
            }
          }
        }
      } catch {
        /* invalid REDIS_URL */
      }
    }
  }
}
