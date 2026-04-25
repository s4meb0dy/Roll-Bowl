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

/**
 * `new URL(redis://...)` can throw if the password contains unescaped ":", "/" etc.
 * Upstash still uses a single `default:<token>` userinfo — parse by splitting on last "@".
 */
function parseRedisSchemaless(
  raw: string
): { host: string; token: string } | null {
  const t = raw.trim();
  if (!t.startsWith("redis://") && !t.startsWith("rediss://")) return null;
  const without = t.replace(/^rediss?:\/\//, "");
  const at = without.lastIndexOf("@");
  if (at < 0) return null;
  const userinfo = without.slice(0, at);
  const hostPort = without.slice(at + 1);
  const host = hostPort.split(":")[0]?.split("/")[0]?.trim();
  if (!host) return null;
  let token = "";
  const colon = userinfo.indexOf(":");
  if (colon >= 0) {
    token = decodeURIComponent(userinfo.slice(colon + 1));
  } else if (userinfo) {
    token = decodeURIComponent(userinfo);
  }
  if (!token) return null;
  return { host, token };
}

/**
 * Map Vercel/Upstash env to what @vercel/kv reads. Idempotent; safe to call
 * on every `isOrderInboxConfigured` / request.
 */
export function applyOrderInboxEnv(): void {
  if (typeof process === "undefined") return;

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

  /* Legacy: some integrations only set `KV_URL` to a redis: connection string. */
  if (
    process.env.KV_URL &&
    (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) &&
    (process.env.KV_URL.startsWith("redis://") || process.env.KV_URL.startsWith("rediss://"))
  ) {
    const manual = parseRedisSchemaless(process.env.KV_URL);
    if (manual) {
      if (!process.env.KV_REST_API_URL) {
        process.env.KV_REST_API_URL = `https://${manual.host}`;
      }
      if (!process.env.KV_REST_API_TOKEN) {
        process.env.KV_REST_API_TOKEN = manual.token;
      }
    }
  }

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return;
  }

  const anyToken =
    process.env.REDIS_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  const raw = process.env.REDIS_URL;
  if (raw) {
    const s = raw.trim();
    if (s.startsWith("https://") || s.startsWith("http://")) {
      if (!process.env.KV_REST_API_URL) {
        process.env.KV_REST_API_URL = s;
      }
      if (!process.env.KV_REST_API_TOKEN && anyToken) {
        process.env.KV_REST_API_TOKEN = anyToken;
      }
    } else {
      let parsed: { host: string; token: string } | null = null;
      try {
        const u = new URL(s);
        if ((u.protocol === "redis:" || u.protocol === "rediss:") && u.hostname) {
          const token = u.password
            ? decodeURIComponent(u.password)
            : (anyToken ? String(anyToken) : "");
          if (token) {
            parsed = { host: u.hostname, token };
          }
        }
      } catch {
        /* fall through to manual */
      }
      if (!parsed) {
        const manual = parseRedisSchemaless(s);
        if (manual) parsed = manual;
      }
      if (parsed) {
        if (!process.env.KV_REST_API_URL) {
          process.env.KV_REST_API_URL = `https://${parsed.host}`;
        }
        if (!process.env.KV_REST_API_TOKEN) {
          process.env.KV_REST_API_TOKEN = parsed.token;
        }
      } else if (s.startsWith("redis://") || s.startsWith("rediss://")) {
        /* host+port without userinfo: token must come from env */
        try {
          const u = new URL(s);
          if (u.hostname && anyToken) {
            if (!process.env.KV_REST_API_URL) {
              process.env.KV_REST_API_URL = `https://${u.hostname}`;
            }
            if (!process.env.KV_REST_API_TOKEN) {
              process.env.KV_REST_API_TOKEN = String(anyToken);
            }
          }
        } catch {
          /* */
        }
      }
    }
  }
}

applyOrderInboxEnv();
