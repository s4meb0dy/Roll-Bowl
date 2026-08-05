import {
  pushOrderToLightspeed,
  type LightspeedPushResult,
} from "@/lib/lightspeed/pushOrder";
import type { Order, OrderLightspeedMeta } from "@/lib/types";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { getInboxRedis } from "@/lib/orders/inboxRedis";
import { getOrderById, patchOrderFields } from "@/lib/orders/inboxStore";

const KEY_POS_CLAIM = (id: string) => `order:posClaim:${id}`;
/** Covers a slow POS round-trip; released early on failure so retries can claim again. */
const POS_CLAIM_TTL_S = 120;

export type PosPushOnceResult =
  | (LightspeedPushResult & { duplicate?: boolean })
  | { state: "in_flight"; pushedAt: string };

function isTerminal(meta?: OrderLightspeedMeta): boolean {
  return meta?.state === "success" || meta?.state === "skipped";
}

function metaFromResult(result: LightspeedPushResult): OrderLightspeedMeta {
  return {
    state: result.state,
    pushedAt: result.pushedAt,
    saleId: result.saleId,
    accountIdentifier: result.accountIdentifier,
    errorMessage: result.errorMessage,
    httpStatus: result.httpStatus,
    dryRun: result.dryRun,
  };
}

async function releasePosClaim(orderId: string): Promise<void> {
  if (!isOrderInboxConfigured()) return;
  try {
    const redis = getInboxRedis();
    await redis.del(KEY_POS_CLAIM(orderId));
  } catch {
    /* best effort */
  }
}

/**
 * Push an order to the POS at most once, even when webhook + browser race.
 * Uses a Redis claim plus persisted `lightspeed` meta when inbox is configured.
 */
export async function pushOrderToPosOnce(
  order: Order
): Promise<PosPushOnceResult> {
  const now = new Date().toISOString();

  if (isOrderInboxConfigured()) {
    const existing = await getOrderById(order.id);
    if (isTerminal(existing?.lightspeed)) {
      return { ...existing!.lightspeed!, duplicate: true };
    }

    const redis = getInboxRedis();
    const claimed = await redis.set(KEY_POS_CLAIM(order.id), now, {
      nx: true,
      ex: POS_CLAIM_TTL_S,
    });

    if (!claimed) {
      const again = await getOrderById(order.id);
      if (isTerminal(again?.lightspeed)) {
        return { ...again!.lightspeed!, duplicate: true };
      }
      return { state: "in_flight", pushedAt: now };
    }

    try {
      const result = await pushOrderToLightspeed(order);

      if (result.state !== "skipped") {
        await patchOrderFields(order.id, { lightspeed: metaFromResult(result) });
      }

      if (result.state === "failed") {
        await releasePosClaim(order.id);
      }

      return result;
    } catch (e) {
      await releasePosClaim(order.id);
      throw e;
    }
  }

  return pushOrderToLightspeed(order);
}
