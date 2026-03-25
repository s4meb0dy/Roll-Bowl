"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, ChefHat, ArrowLeft, CreditCard, Banknote } from "lucide-react";
import { Suspense } from "react";
import { useStore } from "@/lib/store/useStore";

function ConfirmedContent() {
  const params = useSearchParams();
  const orderId = params.get("id");
  const [dots, setDots] = useState(".");
  const orders = useStore((s) => s.orders);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const order = mounted ? orders.find((o) => o.id === orderId) : undefined;

  useEffect(() => {
    const t = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      600
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sage-500 shadow-lg">
        <CheckCircle2 size={40} className="text-white" />
      </div>

      <h1 className="font-display mb-2 text-3xl font-bold text-neutral-800">
        Order confirmed!
      </h1>
      <p className="mb-1 text-neutral-500">
        We&apos;ve received your order and the kitchen is on it{dots}
      </p>
      {orderId && (
        <p className="mb-8 text-xs text-neutral-400">
          Order ID:{" "}
          <span className="font-mono font-semibold text-neutral-600">
            #{orderId.toUpperCase()}
          </span>
        </p>
      )}

      {/* Status card */}
      <div className="mb-8 w-full max-w-sm rounded-2xl border border-sage-100 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          {[
            { icon: "📝", label: "Confirmed" },
            { icon: "👨‍🍳", label: "Preparing" },
            { icon: "🛵", label: "On the way" },
            { icon: "🏠", label: "Delivered" },
          ].map((s, i) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                  i === 0
                    ? "bg-sage-500 shadow-sm"
                    : "bg-neutral-100"
                }`}
              >
                {s.icon}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  i === 0 ? "text-sage-600" : "text-neutral-400"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <Clock size={15} />
        Estimated delivery: <strong>30–45 minutes</strong>
      </div>

      {/* Payment info */}
      {order && (
        <div className={`mt-4 flex w-full max-w-sm items-start gap-3 rounded-2xl border px-5 py-4 ${
          order.paymentMethod === "cash"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-sage-200 bg-sage-50 text-sage-800"
        }`}>
          <div className="mt-0.5 flex-shrink-0">
            {order.paymentMethod === "cash"
              ? <Banknote size={18} />
              : <CreditCard size={18} />}
          </div>
          <div className="text-sm">
            {order.paymentMethod === "cash" ? (
              <>
                <p className="font-semibold">Contant betalen</p>
                {order.cashDenomination !== undefined && (
                  <p className="mt-0.5 text-xs">
                    {order.cashDenomination === order.total
                      ? "Exact bedrag — geen wisselgeld nodig."
                      : `Zorg voor €${order.cashDenomination.toFixed(2)} — de koerier geeft €${(order.cashDenomination - order.total).toFixed(2)} wisselgeld terug.`}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">Online / Kaart</p>
                <p className="mt-0.5 text-xs">Betaal bij levering via kaart of app.</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <Link href="/menu" className="btn-secondary">
          <ArrowLeft size={15} />
          Order again
        </Link>
        <Link href="/admin" className="btn-ghost text-neutral-400">
          <ChefHat size={15} />
          Kitchen view
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense>
      <ConfirmedContent />
    </Suspense>
  );
}
