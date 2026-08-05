"use client";

import { useEffect } from "react";
import { rehydrateStore } from "@/lib/store/hydration";

export default function StoreHydration() {
  useEffect(() => {
    rehydrateStore();
  }, []);
  return null;
}
