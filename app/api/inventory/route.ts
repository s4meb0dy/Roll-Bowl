import { NextResponse } from "next/server";
import { readInventory, applyUpdate } from "@/lib/inventory/server";
import type { InventoryUpdateRequest } from "@/lib/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin PIN used to gate mutating requests. In a real deployment, replace with
 * a proper auth header (e.g. NextAuth session, Lightspeed OAuth token, etc.).
 * The PIN matches the one in `app/admin/page.tsx` so the existing kitchen
 * terminal unlock continues to work without new configuration.
 */
const ADMIN_PIN = process.env.ADMIN_PIN ?? "1234";

export async function GET() {
  const state = await readInventory();
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const pin = req.headers.get("x-admin-pin");
  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const update = body as Partial<InventoryUpdateRequest>;
  if (
    !update ||
    (update.kind !== "item" && update.kind !== "category") ||
    typeof update.id !== "string" ||
    typeof update.available !== "boolean"
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const state = await applyUpdate(update as InventoryUpdateRequest);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
