"use client";

import type { Order } from "@/lib/types";
import {
  buildKitchenReceiptLines,
  formatReceiptOrderId,
  orderTypeBannerLabel,
  RECEIPT_COLS,
} from "@/lib/epos/receiptContent";

/**
 * 80mm thermal receipt preview (Takeaway-style layout).
 * Primary print path: ePOS in /admin. This remains for browser fallback / PDF.
 */
export default function KitchenReceipt80({ order }: { order: Order }) {
  const lines = buildKitchenReceiptLines(order);

  return (
    <div className="kitchen-receipt-80mm text-black">
      {lines.map((line, idx) => {
        // Double-size lines are the "banners": order type, order id, paid stamp.
        const isBanner = line.width === 2 && line.height === 2;
        const isHeader =
          line.text === "www.rollnbowl.be" || line.text === "ROLL & BOWL";
        const isReverse = line.reverse;

        let className = "font-mono leading-tight ";
        if (line.align === "center") className += "text-center ";
        if (line.align === "right") className += "text-right ";
        if (line.bold || line.width === 2) className += "font-bold ";
        if (isBanner) className += "text-[13px] uppercase tracking-wide py-0.5 ";
        else if (isHeader) className += "text-[11px] ";
        else className += "text-[10px] ";
        if (isReverse) className += "bg-black text-white px-1 ";

        if (line.qr) {
          const src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(
            line.qr
          )}`;
          return (
            <div key={idx} className="my-1 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={line.qr}
                width={96}
                height={96}
                className="h-24 w-24"
              />
            </div>
          );
        }

        if (line.text === " ") {
          return <div key={idx} className="h-1.5" aria-hidden />;
        }

        return (
          <div
            key={idx}
            className={className}
            style={{
              maxWidth: `${RECEIPT_COLS}ch`,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {line.text}
          </div>
        );
      })}

      <div className="mt-2 border-t border-dashed border-neutral-400 pt-1 text-center font-mono text-[8px] text-neutral-500">
        {orderTypeBannerLabel(order)} · {formatReceiptOrderId(order.id)}
      </div>
    </div>
  );
}
