import { NextResponse } from "next/server";
import { applyBulk, readInventory } from "@/lib/inventory/server";
import {
  fetchLightspeedAvailability,
  isLightspeedConfigured,
} from "@/lib/lightspeed/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_PIN = process.env.ADMIN_PIN ?? "4355";

export async function POST(req: Request) {
  const pin = req.headers.get("x-admin-pin");
  if (pin !== ADMIN_PIN) {
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
