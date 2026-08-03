import "@/lib/orders/ensureKvEnv";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/requireAdminAuth";
import { isOrderInboxConfigured } from "@/lib/orders/inboxConfig";
import {
  getPrintQueueDepth,
  isSdpHealthy,
  isServerDirectPrintEnabled,
  readPrintTelemetry,
  SDP_HEALTHY_MS,
  serverDirectPrintId,
} from "@/lib/orders/printQueueStore";

/**
 * Kitchen board uses this to decide:
 *  - SDP configured?
 *  - Is the venue printer actually polling us (healthy)?
 * If configured but unhealthy → fall back to local ePOS so orders still print.
 */
export async function GET(req: Request) {
  const auth = requireAdminAuth(req);
  if (auth) return auth;

  const enabled = isServerDirectPrintEnabled();
  const configuredId = serverDirectPrintId();
  let telemetry = null;
  let queueDepth = 0;
  let healthy = false;
  const inboxOk = isOrderInboxConfigured();

  if (enabled && inboxOk) {
    try {
      telemetry = await readPrintTelemetry();
      queueDepth = await getPrintQueueDepth();
      healthy = isSdpHealthy(telemetry);
    } catch (e) {
      console.error("[print/config]", e);
    }
  }

  const secondsSincePoll =
    telemetry?.lastPollAt != null
      ? Math.round((Date.now() - telemetry.lastPollAt) / 1000)
      : null;

  return NextResponse.json({
    enabled,
    /** Use server queue only when the printer is actively polling. */
    healthy,
    useServerPrint: enabled && healthy,
    inboxOk,
    queueDepth,
    healthyWindowSec: Math.round(SDP_HEALTHY_MS / 1000),
    configuredIdSet: Boolean(configuredId),
    /** Hint length only — never expose the full secret in the client. */
    configuredIdLength: configuredId?.length ?? 0,
    lastPollSecAgo: secondsSincePoll,
    lastPollIdReceived: telemetry?.lastPollId ?? null,
    lastIdMatch: telemetry?.lastIdMatch ?? null,
    lastConnectionType: telemetry?.lastConnectionType ?? null,
    lastJobServedSecAgo:
      telemetry?.lastJobServedAt != null
        ? Math.round((Date.now() - telemetry.lastJobServedAt) / 1000)
        : null,
    pollCount: telemetry?.pollCount ?? 0,
    hint: !enabled
      ? "sdp_disabled"
      : !inboxOk
        ? "inbox_missing"
        : !telemetry?.lastPollAt
          ? "printer_never_polled"
          : telemetry.lastIdMatch === false
            ? "id_mismatch"
            : !healthy
              ? "printer_stale"
              : "ok",
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
