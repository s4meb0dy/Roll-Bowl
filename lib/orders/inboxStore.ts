import type { Order } from "@/lib/types";
import { getInboxRedis, isWrongTypeError } from "./inboxRedis";

const LIST_KEY = "order:inbox";
const MAX_LEN = 200;

export async function readInboxOrders(): Promise<Order[]> {
  const redis = getInboxRedis();
  let raw: unknown[];
  try {
    raw = (await redis.lrange(LIST_KEY, 0, MAX_LEN - 1)) as unknown[];
  } catch (e) {
    if (!isWrongTypeError(e)) throw e;
    await redis.del(LIST_KEY);
    raw = [];
  }

  const byId = new Map<string, Order>();
  for (const entry of raw) {
    try {
      const o = (typeof entry === "string" ? JSON.parse(entry) : entry) as Order;
      if (o?.id) byId.set(o.id, o);
    } catch {
      /* skip malformed entries */
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function appendOrderToInbox(order: Order): Promise<void> {
  const redis = getInboxRedis();
  try {
    await redis.lpush(LIST_KEY, JSON.stringify(order));
    await redis.ltrim(LIST_KEY, 0, MAX_LEN - 1);
  } catch (e) {
    if (!isWrongTypeError(e)) throw e;
    await redis.del(LIST_KEY);
    await redis.lpush(LIST_KEY, JSON.stringify(order));
    await redis.ltrim(LIST_KEY, 0, MAX_LEN - 1);
  }
}
