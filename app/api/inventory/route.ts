import { NextResponse } from "next/server";
import { readInventory, applyUpdate } from "@/lib/inventory/server";
import type { InventoryUpdateRequest } from "@/lib/inventory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { verifyAdminPin } from "@/lib/admin/pinServer";

export async function GET() {
  const state = await readInventory();
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const pin = req.headers.get("x-admin-pin");
  if (!verifyAdminPin(pin ?? "")) {
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
