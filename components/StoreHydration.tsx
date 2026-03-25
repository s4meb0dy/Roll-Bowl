"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store/useStore";

export default function StoreHydration() {
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);
  return null;
}
