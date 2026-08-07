import { BUSINESS } from "@/lib/business";
import { STORE_TIMEZONE } from "@/lib/deliveryConfig";
import {
  describeCartItemForKitchen,
  type KitchenLine,
} from "@/lib/orders/itemDescriptors";
import { shortOrderCode } from "@/lib/orderId";
import type { CartItem, Order } from "@/lib/types";

/** Printable width in monospace chars (80 mm, Font A). */
export const RECEIPT_COLS = 42;

/** Always format receipt clocks in store local time — SDP builds XML on UTC servers. */
const RECEIPT_TZ = STORE_TIMEZONE;

/** Full-width divider rule for the receipt. */
const DIVIDER = "-".repeat(RECEIPT_COLS);

const DEFAULT_ZSM_PREP_MINUTES = 30;

export interface ReceiptTextLine {
  text: string;
  align?: "left" | "center" | "right";
  /** ePOS width multiplier 1–8 */
  width?: number;
  /** ePOS height multiplier 1–8 */
  height?: number;
  bold?: boolean;
  reverse?: boolean;
  /** If set, render a QR code encoding this string instead of `text`. */
  qr?: string;
}

/** Public site URL encoded in the receipt QR code. */
export const RECEIPT_QR_URL = "https://www.rollnbowl.be";

export function formatReceiptOrderId(orderId: string): string {
  return `#${shortOrderCode(orderId)}`;
}

/**
 * Big banner label telling the kitchen exactly what kind of order this is:
 * pickup vs delivery, and whether it is scheduled for later or ASAP.
 */
export function orderTypeBannerLabel(order: Order): string {
  const isTakeaway = order.orderType === "takeaway";
  const isScheduled = order.fulfillmentTime?.mode === "scheduled";
  if (isTakeaway) return isScheduled ? "GEPLANDE AFHALING" : "AFHALEN";
  return isScheduled ? "GEPLANDE LEVERING" : "LEVERING";
}

export function formatReceiptDateShort(iso: string): string {
  return new Date(iso).toLocaleString("nl-BE", {
    timeZone: RECEIPT_TZ,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatReceiptPlacedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleString("nl-BE", {
    timeZone: RECEIPT_TZ,
    day: "2-digit",
    month: "short",
  });
  const time = d.toLocaleString("nl-BE", {
    timeZone: RECEIPT_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${time} ${date}`;
}

function formatReceiptTimeOnly(d: Date): string {
  return d.toLocaleString("nl-BE", {
    timeZone: RECEIPT_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveZsmEta(order: Order): Date {
  if (order.expectedReadyAt && !Number.isNaN(Date.parse(order.expectedReadyAt))) {
    return new Date(order.expectedReadyAt);
  }
  const createdMs = Date.parse(order.createdAt);
  const baseMs = Number.isNaN(createdMs) ? Date.now() : createdMs;
  const prep =
    typeof order.prepMinutes === "number" && order.prepMinutes > 0
      ? order.prepMinutes
      : DEFAULT_ZSM_PREP_MINUTES;
  return new Date(baseMs + prep * 60_000);
}

/** Header + footer timing lines for kitchen receipts. */
export function getReceiptTimingLines(order: Order): {
  headerLine: string;
  footerLine: string;
} {
  const isTakeaway = order.orderType === "takeaway";
  const isScheduled = order.fulfillmentTime?.mode === "scheduled";

  if (isScheduled && order.fulfillmentTime.mode === "scheduled") {
    const slot = new Date(order.fulfillmentTime.scheduledFor);
    const time = formatReceiptTimeOnly(slot);
    return {
      headerLine: isTakeaway
        ? `Geplande afhaling: ${time}`
        : `Geplande levering: ${time}`,
      footerLine: `Gepland: ${time}`,
    };
  }

  const eta = resolveZsmEta(order);
  const time = formatReceiptTimeOnly(eta);
  return {
    headerLine: `Verwacht: ZSM ${time}`,
    footerLine: `Verwacht: ZSM ${time}`,
  };
}

function padLine(left: string, right: string, cols = RECEIPT_COLS): string {
  const l = left.trim();
  const r = right.trim();
  const gap = cols - l.length - r.length;
  if (gap >= 1) return l + " ".repeat(gap) + r;
  return `${l.slice(0, cols - r.length - 1)} ${r}`;
}

function money(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Flat ingredient lines (Takeaway-style), one per row.
 *
 * Every component is prefixed with its amount (`1 x`, `2 x`, ...) so the kitchen
 * knows exactly how much of each ingredient to put in. Duplicate selections
 * within the same category are grouped and counted. Counts are per single dish
 * (the item header already shows how many dishes were ordered), so they are not
 * multiplied by the item quantity. Any component equal to `skipName` (e.g. the
 * size label that already appears in the item header) is dropped.
 */
function expandKitchenLines(lines: KitchenLine[], skipName?: string): string[] {
  const out: string[] = [];
  const skip = skipName?.trim().toLowerCase();
  for (const line of lines) {
    const parts = line.value.split(" · ").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;

    const counts = new Map<string, number>();
    const order: string[] = [];
    for (const part of parts) {
      if (skip && part.toLowerCase() === skip) continue;
      if (!counts.has(part)) order.push(part);
      counts.set(part, (counts.get(part) ?? 0) + 1);
    }

    const isAccent = line.accent || line.label.startsWith("+");
    for (const part of order) {
      const n = counts.get(part) ?? 1;
      out.push(isAccent ? `+ ${n} x ${part}` : `${n} x ${part}`);
    }
  }
  return out;
}

export function buildKitchenReceiptLines(order: Order): ReceiptTextLine[] {
  const isTakeaway = order.orderType === "takeaway";
  const { headerLine, footerLine } = getReceiptTimingLines(order);

  const lines: ReceiptTextLine[] = [];

  // ── Header ──
  lines.push({ text: "ROLL & BOWL", align: "center", bold: true });
  lines.push({ text: "www.rollnbowl.be", align: "center" });
  lines.push({ text: `Tel: ${BUSINESS.phoneDisplay}`, align: "center" });
  lines.push({ text: `BTW ${BUSINESS.vat}`, align: "center" });
  lines.push({ text: " " });
  lines.push({
    text: orderTypeBannerLabel(order),
    align: "center",
    width: 2,
    height: 2,
    bold: true,
  });
  lines.push({ text: headerLine, align: "center", bold: true });
  lines.push({ text: " " });
  lines.push({
    text: formatReceiptOrderId(order.id),
    align: "center",
    width: 2,
    height: 2,
    bold: true,
  });

  // ── Items ──
  lines.push({ text: DIVIDER });
  lines.push({ text: padLine("AANTAL / ARTIKEL", "EUR"), bold: true });
  lines.push({ text: DIVIDER });

  order.items.forEach((item, idx) => {
    const lineTotal = item.price * item.quantity;
    lines.push({
      text: padLine(`${item.quantity} x ${item.name}`, money(lineTotal)),
      bold: true,
    });
    for (const ing of expandKitchenLines(
      describeCartItemForKitchen(item),
      item.name
    )) {
      lines.push({ text: `   ${ing}` });
    }
    if (item.note?.trim()) {
      lines.push({ text: `   >> ${item.note.trim()}`, bold: true });
    }
    if (idx < order.items.length - 1) lines.push({ text: " " });
  });

  // ── Totals ──
  lines.push({ text: DIVIDER });
  lines.push({ text: padLine("Subtotaal", money(order.subtotal)) });
  if (!isTakeaway && order.deliveryFee > 0) {
    lines.push({ text: padLine("Leveringskosten", money(order.deliveryFee)) });
  }
  lines.push({ text: DIVIDER });
  lines.push({
    text: padLine("TOTAAL", `EUR ${money(order.total)}`),
    bold: true,
  });
  lines.push({ text: DIVIDER });

  // ── Payment ──
  if (order.paymentMethod === "cash") {
    const paid =
      order.cashDenomination !== undefined
        ? `Contant EUR ${money(order.cashDenomination)}`
        : "Contant";
    lines.push({ text: padLine("Te betalen", paid) });
    if (
      order.cashDenomination !== undefined &&
      order.cashDenomination > order.total
    ) {
      lines.push({
        text: padLine("Wisselgeld", money(order.cashDenomination - order.total)),
        bold: true,
      });
    }
  } else {
    lines.push({ text: padLine("Betaald", `Kaart ${money(order.total)}`) });
  }

  // Cash is always collected on pickup/delivery, so a cash ticket must never
  // read "paid" — it always shows "still to be paid", regardless of status.
  const paidOnline =
    order.paymentMethod === "online" &&
    (order.status === "paid" ||
      order.status === "preparing" ||
      order.status === "ready" ||
      order.status === "delivered");

  lines.push({ text: " " });
  if (order.paymentMethod === "cash") {
    lines.push({
      text: "CONTANT - NOG TE BETALEN",
      align: "center",
      bold: true,
      reverse: true,
    });
  } else if (paidOnline) {
    lines.push({
      text: "BESTELLING BETAALD",
      align: "center",
      width: 2,
      height: 2,
      bold: true,
    });
  } else {
    lines.push({
      text: "BETALING IN BEHANDELING",
      align: "center",
      bold: true,
    });
  }

  if (order.isFirstTimeCustomer) {
    lines.push({ text: " " });
    lines.push({
      text: "NIEUWE KLANT - 1E BESTELLING",
      align: "center",
      bold: true,
      reverse: true,
    });
  }

  // ── Customer ──
  lines.push({ text: DIVIDER });
  lines.push({ text: "KLANT", bold: true });
  lines.push({ text: order.customerInfo.name });
  if (!isTakeaway) {
    lines.push({ text: order.customerInfo.address });
    lines.push({ text: order.customerInfo.zipCode });
  } else {
    lines.push({ text: "Afhalen in de winkel" });
    lines.push({ text: BUSINESS.street });
    lines.push({ text: `${BUSINESS.postalCode} ${BUSINESS.city}` });
  }
  lines.push({ text: order.customerInfo.phone });

  if (order.generalNote?.trim()) {
    lines.push({ text: " " });
    lines.push({ text: "OPMERKING", bold: true });
    lines.push({ text: order.generalNote.trim() });
  }

  // ── Footer ──
  lines.push({ text: DIVIDER });
  lines.push({ text: `Besteld:  ${formatReceiptPlacedAt(order.createdAt)}` });
  lines.push({ text: footerLine, bold: true });
  lines.push({ text: " " });
  lines.push({ text: "Smakelijk!", align: "center", bold: true });
  lines.push({ text: " " });
  lines.push({ text: "Bestel opnieuw & scan:", align: "center" });
  lines.push({ text: RECEIPT_QR_URL, align: "center", qr: RECEIPT_QR_URL });
  lines.push({ text: "www.rollnbowl.be", align: "center", bold: true });

  return lines;
}

/** HTML preview rows (KitchenReceipt80). */
export function buildReceiptPreviewRows(order: Order) {
  return buildKitchenReceiptLines(order);
}

export function cartItemLabel(item: CartItem): string {
  return `${item.quantity} x ${item.name}`;
}
