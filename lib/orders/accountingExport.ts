import type { Order } from "@/lib/types";

const DELIMITER = ";";

function csvCell(value: string | number | boolean | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[;"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(values: Array<string | number | boolean | null | undefined>): string {
  return values.map(csvCell).join(DELIMITER);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("nl-BE", {
    timeZone: "Europe/Brussels",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleTimeString("nl-BE", {
    timeZone: "Europe/Brussels",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function orderTypeLabel(orderType: Order["orderType"]): string {
  return orderType === "takeaway" ? "Afhalen" : "Bezorging";
}

function paymentLabel(order: Order): string {
  return order.paymentMethod === "cash" ? "Contant" : "Online";
}

function statusLabel(order: Order): string {
  if (order.orderType === "takeaway" && order.status === "delivered") {
    return "Opgehaald";
  }
  const map: Record<Order["status"], string> = {
    pending: "Wachtend",
    paid: "Betaald",
    preparing: "In bereiding",
    ready: "Klaar",
    delivered: "Bezorgd",
  };
  return map[order.status] ?? order.status;
}

function fulfillmentLabel(order: Order): string {
  if (order.fulfillmentTime?.mode === "scheduled") {
    return `Gepland ${formatDate(order.fulfillmentTime.scheduledFor)} ${formatTime(order.fulfillmentTime.scheduledFor)}`;
  }
  return "Zo snel mogelijk";
}

function itemsSummary(order: Order): string {
  return order.items
    .map((i) => `${i.quantity}× ${i.name} (€${(i.price * i.quantity).toFixed(2)})`)
    .join(" | ");
}

const HEADERS = [
  "Bestelnummer",
  "Datum",
  "Tijd",
  "Klant",
  "Telefoon",
  "Type",
  "Betaling",
  "Status",
  "Subtotaal (EUR)",
  "Bezorgkosten (EUR)",
  "Totaal (EUR)",
  "Stripe betalings-ID",
  "Adres",
  "Postcode",
  "Aantal artikelen",
  "Artikelen",
  "Levering",
  "Opmerking klant",
  "Contant bedrag",
  "Wisselgeld",
] as const;

export function ordersToAccountingCsv(orders: Order[]): string {
  const lines = [row([...HEADERS])];

  for (const order of orders) {
    const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
    const cashDenom = order.cashDenomination;
    const change =
      cashDenom !== undefined && cashDenom > order.total
        ? (cashDenom - order.total).toFixed(2)
        : "";

    lines.push(
      row([
        order.id.toUpperCase(),
        formatDate(order.createdAt),
        formatTime(order.createdAt),
        order.customerInfo.name,
        order.customerInfo.phone,
        orderTypeLabel(order.orderType),
        paymentLabel(order),
        statusLabel(order),
        order.subtotal.toFixed(2),
        order.deliveryFee.toFixed(2),
        order.total.toFixed(2),
        order.stripePaymentIntentId ?? "",
        order.orderType === "takeaway" ? "" : order.customerInfo.address,
        order.orderType === "takeaway" ? "" : order.customerInfo.zipCode,
        itemCount,
        itemsSummary(order),
        fulfillmentLabel(order),
        order.generalNote,
        cashDenom !== undefined ? cashDenom.toFixed(2) : "",
        change,
      ])
    );
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Filter orders by inclusive YYYY-MM-DD range (Europe/Brussels calendar dates). */
export function filterOrdersByDateRange(
  orders: Order[],
  from?: string | null,
  to?: string | null
): Order[] {
  let result = orders;
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    result = result.filter(
      (o) =>
        new Date(o.createdAt).toLocaleDateString("sv-SE", {
          timeZone: "Europe/Brussels",
        }) >= from
    );
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    result = result.filter(
      (o) =>
        new Date(o.createdAt).toLocaleDateString("sv-SE", {
          timeZone: "Europe/Brussels",
        }) <= to
    );
  }
  return result.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function accountingExportFilename(from?: string | null, to?: string | null): string {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  if (from && to) return `rollnbowl-bestellingen-${from}_${to}.csv`;
  if (from) return `rollnbowl-bestellingen-vanaf-${from}.csv`;
  if (to) return `rollnbowl-bestellingen-tot-${to}.csv`;
  return `rollnbowl-bestellingen-${today}.csv`;
}

export function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
