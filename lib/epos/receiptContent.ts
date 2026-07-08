import { BUSINESS } from "@/lib/business";
import {
  describeCartItemForKitchen,
  type KitchenLine,
} from "@/lib/orders/itemDescriptors";
import type { CartItem, Order } from "@/lib/types";

/** Printable width in monospace chars (80 mm, Font A). */
export const RECEIPT_COLS = 42;

const ALLERGEN_NOTICE =
  "BELANGRIJK: INFORMATIE OVER VOEDSELALLERGENEN WORDT VERSTREKT DOOR " +
  "HET RESTAURANT. CONTROLEER HET ALLERGENENOVERZICHT OP DE WEBSITE. " +
  "INDICATIEF — KEUKEN MOET VERIFIËREN.";

export interface ReceiptTextLine {
  text: string;
  align?: "left" | "center" | "right";
  /** ePOS width multiplier 1–8 */
  width?: number;
  /** ePOS height multiplier 1–8 */
  height?: number;
  bold?: boolean;
  reverse?: boolean;
}

export function formatReceiptOrderId(orderId: string): string {
  const clean = orderId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const core = clean.slice(0, 9).padEnd(9, "0");
  return `# ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6, 9)}`.trim();
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
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatReceiptPlacedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleString("nl-BE", {
    day: "2-digit",
    month: "short",
  });
  const time = d.toLocaleString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${time} ${date}`;
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

/** Flat ingredient lines (Takeaway-style), one per row. */
function expandKitchenLines(lines: KitchenLine[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const parts = line.value.split(" · ").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    for (const part of parts) {
      if (line.accent || line.label.startsWith("+")) {
        out.push(`+ ${part}`);
      } else {
        out.push(part);
      }
    }
  }
  return out;
}

export function buildKitchenReceiptLines(order: Order): ReceiptTextLine[] {
  const isTakeaway = order.orderType === "takeaway";
  const scheduled =
    order.fulfillmentTime?.mode === "scheduled"
      ? new Date(order.fulfillmentTime.scheduledFor)
      : null;

  const expectedLabel = scheduled
    ? `Verwacht: ${scheduled.toLocaleString("nl-BE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : `Verwacht: ${new Date(order.createdAt).toLocaleString("nl-BE", {
        day: "2-digit",
        month: "short",
      })}, ZSM (${new Date(order.createdAt).toLocaleString("nl-BE", {
        hour: "2-digit",
        minute: "2-digit",
      })})`;

  const lines: ReceiptTextLine[] = [];

  lines.push({ text: "www.rollnbowl.be", align: "center" });
  lines.push({ text: BUSINESS.name, align: "center", bold: true });
  lines.push({
    text: orderTypeBannerLabel(order),
    align: "center",
    width: 2,
    height: 2,
    bold: true,
  });
  lines.push({ text: expectedLabel, align: "center" });
  lines.push({
    text: formatReceiptOrderId(order.id),
    align: "center",
    width: 2,
    height: 2,
    bold: true,
  });
  lines.push({ text: " ", align: "left" });
  lines.push({
    text: padLine("", "EUR"),
    align: "left",
    bold: true,
  });

  for (const item of order.items) {
    const lineTotal = item.price * item.quantity;
    lines.push({
      text: padLine(
        `${item.quantity} x ${item.name}`,
        money(lineTotal)
      ),
      bold: true,
    });
    for (const ing of expandKitchenLines(describeCartItemForKitchen(item))) {
      lines.push({ text: `  ${ing}` });
    }
    if (item.note?.trim()) {
      lines.push({ text: `  ★ ${item.note.trim()}`, bold: true });
    }
    lines.push({ text: " " });
  }

  lines.push({ text: padLine("Subtotaal", money(order.subtotal)) });
  lines.push({ text: padLine("Totaal bestelling", money(order.subtotal)) });
  if (!isTakeaway && order.deliveryFee > 0) {
    lines.push({
      text: padLine("Leveringskosten", money(order.deliveryFee)),
    });
  }
  lines.push({
    text: padLine("Totaal verschuldigd", money(order.total)),
    bold: true,
  });
  lines.push({ text: " " });

  if (order.paymentMethod === "cash") {
    const paid =
      order.cashDenomination !== undefined
        ? `Contant €${money(order.cashDenomination)}`
        : "Contant";
    lines.push({
      text: padLine("Betaald door:", paid),
    });
    if (
      order.cashDenomination !== undefined &&
      order.cashDenomination > order.total
    ) {
      lines.push({
        text: padLine(
          "Wisselgeld",
          money(order.cashDenomination - order.total)
        ),
      });
    }
  } else {
    lines.push({
      text: padLine("Betaald door:", `Kaart ${money(order.total)}`),
    });
  }

  lines.push({ text: " " });
  lines.push({ text: ALLERGEN_NOTICE, align: "left" });
  lines.push({ text: " " });

  const paidOnline =
    order.paymentMethod === "online" &&
    (order.status === "paid" ||
      order.status === "preparing" ||
      order.status === "ready" ||
      order.status === "delivered");
  const paidCash =
    order.paymentMethod === "cash" &&
    order.status !== "pending";

  if (paidOnline || paidCash) {
    lines.push({
      text: "BESTELLING BETAALD",
      align: "center",
      width: 2,
      height: 2,
      bold: true,
    });
  } else if (order.paymentMethod === "cash") {
    lines.push({
      text: "CONTANT — NOG TE BETALEN",
      align: "center",
      width: 2,
      height: 1,
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
      text: "★ NIEUWE KLANT — 1E BESTELLING ★",
      align: "center",
      reverse: true,
    });
  }

  lines.push({ text: " " });
  lines.push({ text: "Details van de klant:", bold: true });
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
  lines.push({ text: " " });
  lines.push({
    text: `Bestelling geplaatst om ${formatReceiptPlacedAt(order.createdAt)}`,
  });
  lines.push({
    text: `Bon afgedrukt om ${formatReceiptPlacedAt(new Date().toISOString())}`,
  });

  if (order.generalNote?.trim()) {
    lines.push({ text: " " });
    lines.push({ text: "Opmerking:", bold: true });
    lines.push({ text: order.generalNote.trim() });
  }

  return lines;
}

/** HTML preview rows (KitchenReceipt80). */
export function buildReceiptPreviewRows(order: Order) {
  return buildKitchenReceiptLines(order);
}

export function cartItemLabel(item: CartItem): string {
  return `${item.quantity} x ${item.name}`;
}
