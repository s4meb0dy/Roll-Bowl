import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import type { OrderLightspeedMeta, OrderStatus } from "@/lib/types";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import { isInboxUnreachableError } from "@/lib/orders/inboxRedis";
import {
  getOrderById,
  patchOrderFields,
  type OrderPatch,
} from "@/lib/orders/inboxStore";

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "preparing",
  "ready",
  "delivered",
];

function isLightspeedMeta(v: unknown): v is OrderLightspeedMeta {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const x = v as Record<string, unknown>;
  return (
    (x.state === "success" || x.state === "failed" || x.state === "skipped") &&
    typeof x.pushedAt === "string"
  );
}

function buildPatch(body: unknown): { ok: true; patch: OrderPatch } | { ok: false; reason: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, reason: "body_not_object" };
  }
  const x = body as Record<string, unknown>;
  const patch: OrderPatch = {};

  if (x.status !== undefined) {
    if (typeof x.status !== "string" || !VALID_STATUSES.includes(x.status as OrderStatus)) {
      return { ok: false, reason: "invalid_status" };
    }
    patch.status = x.status as OrderStatus;
  }

  if (x.lightspeed !== undefined) {
    if (x.lightspeed === null) {
      // Allow callers to clear the field explicitly with null.
      patch.lightspeed = undefined;
    } else if (isLightspeedMeta(x.lightspeed)) {
      patch.lightspeed = x.lightspeed;
    } else {
      return { ok: false, reason: "invalid_lightspeed" };
    }
  }

  if (x.kitchenPrinted !== undefined) {
    if (typeof x.kitchenPrinted !== "boolean") {
      return { ok: false, reason: "invalid_kitchenPrinted" };
    }
    patch.kitchenPrinted = x.kitchenPrinted;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, reason: "empty_patch" };
  }
  return { ok: true, patch };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isOrderInboxConfigured()) {
    return NextResponse.json(
      { error: "inbox_not_configured" },
      { status: 503 }
    );
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }
  try {
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (e) {
    if (isInboxUnreachableError(e)) {
      return NextResponse.json(
        { error: "inbox_unavailable" },
        { status: 503 }
      );
    }
    console.error("[orders/:id] GET", e);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
}

/**
 * PATCH — partial update. Body shape:
 *   { status?: OrderStatus, lightspeed?: OrderLightspeedMeta | null,
 *     kitchenPrinted?: boolean }
 *
 * Returns the merged record + the new global version, or 404 if the order
 * is not in Redis (which usually means the inbox isn't configured at all,
 * since admins only PATCH orders that came back from /api/orders/inbox).
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isOrderInboxConfigured()) {
    return NextResponse.json(
      { ok: false, error: "inbox_not_configured" },
      { status: 503 }
    );
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const checked = buildPatch(body);
  if (!checked.ok) {
    return NextResponse.json(
      { error: "Invalid patch", reason: checked.reason },
      { status: 400 }
    );
  }

  try {
    const result = await patchOrderFields(id, checked.patch);
    if (!result) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      order: result.order,
      version: result.version,
    });
  } catch (e) {
    if (isInboxUnreachableError(e)) {
      // Local dev without Upstash, or transient outage — admin's optimistic
      // UI already updated; nothing useful for us to do here.
      return NextResponse.json(
        { ok: false, error: "inbox_unavailable" },
        { status: 503 }
      );
    }
    console.error("[orders/:id] PATCH", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
