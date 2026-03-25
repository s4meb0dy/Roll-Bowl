"use client";

import type { Order } from "@/lib/types";

/**
 * 80mm thermal receipt (labels in Dutch) for kitchen / kiosk printing.
 * Use with body.kitchen-printing-active and @media print in globals.css.
 */
export default function KitchenReceipt80({ order }: { order: Order }) {
  const time = new Date(order.createdAt).toLocaleString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="kitchen-receipt-80mm text-black">
      <div className="border-b border-dashed border-neutral-400 pb-2 text-center">
        <div className="text-base font-black uppercase tracking-tight">Rollen Bowl</div>
        <div className="text-[10px] font-semibold">Keukenbon · 80 mm</div>
      </div>

      <div className="mt-2 font-mono text-[11px] leading-snug">
        <div className="flex justify-between gap-2">
          <span className="text-neutral-600">Bestelling</span>
          <span className="font-bold">#{order.id.toUpperCase()}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-neutral-600">Tijd</span>
          <span>{time}</span>
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-neutral-400" />

      <div className="font-mono text-[11px] leading-snug">
        <div className="font-bold uppercase">Klant</div>
        <div>{order.customerInfo.name}</div>
        <div>{order.customerInfo.phone}</div>
        <div className="mt-1 whitespace-pre-wrap">
          {order.customerInfo.address}
          {"\n"}
          {order.customerInfo.zipCode}
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-neutral-400" />

      <div className="font-mono text-[11px] leading-snug">
        <div className="mb-1 font-bold uppercase">Artikelen</div>
        {order.items.map((item) => (
          <div key={item.cartId} className="mb-1.5 flex justify-between gap-2">
            <span className="max-w-[48mm] flex-1">
              {item.quantity}× {item.name}
            </span>
            <span className="shrink-0">€{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="my-2 border-t border-dashed border-neutral-400" />

      <div className="font-mono text-[11px] leading-snug">
        <div className="flex justify-between">
          <span>Subtotaal</span>
          <span>€{order.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Bezorging</span>
          <span>€{order.deliveryFee.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between font-bold">
          <span>TOTAAL</span>
          <span>€{order.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-neutral-400" />

      <div className="font-mono text-[11px] leading-snug">
        <div className="font-bold uppercase">Betaling</div>
        {order.paymentMethod === "cash" ? (
          <>
            <div>CONTANT</div>
            {order.cashDenomination !== undefined && (
              <>
                <div>
                  Betaalt: €{order.cashDenomination.toFixed(2)}
                </div>
                {order.cashDenomination > order.total && (
                  <div className="font-bold">
                    Wisselgeld: €{(order.cashDenomination - order.total).toFixed(2)}
                  </div>
                )}
                {order.cashDenomination === order.total && (
                  <div>Exact bedrag — geen wisselgeld</div>
                )}
              </>
            )}
          </>
        ) : (
          <div>Kaart / online</div>
        )}
      </div>

      {order.generalNote ? (
        <>
          <div className="my-2 border-t border-dashed border-neutral-400" />
          <div className="font-mono text-[11px] leading-snug">
            <div className="font-bold uppercase">Opmerking</div>
            <div className="whitespace-pre-wrap">{order.generalNote}</div>
          </div>
        </>
      ) : null}

      <div className="mt-3 border-t border-dashed border-neutral-400 pt-2 text-center font-mono text-[9px] text-neutral-500">
        Dank u · Smakelijk bereiden
      </div>
    </div>
  );
}
