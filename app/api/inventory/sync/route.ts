import { NextResponse } from "next/server";
import { applyBulk, readInventory } from "@/lib/inventory/server";
import {
  fetchLightspeedAvailability,
  isLightspeedConfigured,
} from "@/lib/lightspeed/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { verifyAdminPin } from "@/lib/admin/pinServer";

export async function POST(req: Request) {
  const pin = req.headers.get("x-admin-pin");
  if (!verifyAdminPin(pin ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isLightspeedConfigured()) {
    const state = await readInventory();
    return NextResponse.json(
      {
        ok: false,
        reason: "lightspeed_not_configured",
        message:
          "Set LIGHTSPEED_API_URL and LIGHTSPEED_API_TOKEN env vars to enable live sync.",
        state,
      },
      { status: 200 },
    );
  }

  try {
    const updates = await fetchLightspeedAvailability();
    const state = await applyBulk(updates);
    return NextResponse.json({ ok: true, applied: updates.length, state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
