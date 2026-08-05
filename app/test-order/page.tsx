"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { useStore } from "@/lib/store/useStore";
import { useStoreHydrated } from "@/lib/store/hydration";
import { TEST_PRODUCT } from "@/lib/menu";

/**
 * Private test link (not linked anywhere, blocked in robots.txt). Visiting it
 * drops a €1 takeaway test item into the cart and sends you to checkout so the
 * full order + card-payment flow can be verified without exposing the item to
 * customers. Takeaway avoids any delivery-minimum blocking the €1 total.
 */
export default function TestOrderPage() {
  const router = useRouter();
  const addToCart = useStore((s) => s.addToCart);
  const startTakeawaySession = useStore((s) => s.startTakeawaySession);
  const storeHydrated = useStoreHydrated();
  const done = useRef(false);
  const [msg, setMsg] = useState("Testbestelling voorbereiden…");

  useEffect(() => {
    // Add only after the persisted store has hydrated, otherwise the rehydrate
    // merge would overwrite our freshly-added cart line.
    if (!storeHydrated) return;

    const run = () => {
      if (done.current) return;
      done.current = true;
      startTakeawaySession();
      addToCart({
        type: "item",
        name: TEST_PRODUCT.name,
        price: TEST_PRODUCT.price,
        quantity: 1,
        note: "TESTBESTELLING",
        menuItemId: TEST_PRODUCT.id,
      });
      setMsg("Doorsturen naar afrekenen…");
      window.setTimeout(() => router.push("/cart"), 500);
    };

    run();
  }, [storeHydrated, addToCart, startTakeawaySession, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-500">
        <FlaskConical size={26} className="text-white" />
      </div>
      <h1 className="font-display mt-4 text-xl font-bold text-neutral-800">
        Testbestelling
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{msg}</p>
    </div>
  );
}
