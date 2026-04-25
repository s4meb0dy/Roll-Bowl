"use client";

import { useCallback, useEffect, useRef } from "react";

type Props = {
  tabCount: number;
  activeIndex: number;
  programmaticScrollRef: React.MutableRefObject<boolean>;
  onSelectIndex: (index: number) => void;
  onStep: (dir: "prev" | "next") => void;
};

/**
 * Full-width segment bar: horizontal position maps to any category (avoids only using the
 * scrollable pill row). Ref lives here so the wheel listener and pointer handlers target a
 * stable DOM node in its own client chunk.
 */
export default function MenuCategoryScrubber({
  tabCount,
  activeIndex,
  programmaticScrollRef,
  onSelectIndex,
  onStep,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragIdx = useRef<number | null>(null);
  const pointerOn = useRef(false);

  const indexFromX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const { left, width } = el.getBoundingClientRect();
      if (width <= 0) return 0;
      const n = tabCount;
      if (n <= 1) return 0;
      const t = (clientX - left) / width;
      const clampedT = Math.min(1, Math.max(0, t));
      return Math.min(n - 1, Math.max(0, Math.floor(clampedT * n)));
    },
    [tabCount],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const nextIdx = indexFromX(e.clientX);
    pointerOn.current = true;
    dragIdx.current = nextIdx;
    programmaticScrollRef.current = true;
    onSelectIndex(nextIdx);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerOn.current) return;
    e.preventDefault();
    const i = indexFromX(e.clientX);
    if (i === dragIdx.current) return;
    dragIdx.current = i;
    onSelectIndex(i);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    try {
      if (el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    dragIdx.current = null;
    pointerOn.current = false;
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    dragIdx.current = null;
    pointerOn.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const n = trackRef.current;
    if (!n) return;
    const onW = (ev: WheelEvent) => {
      const raw =
        Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.shiftKey ? ev.deltaY : 0;
      if (raw === 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (raw > 0) onStep("next");
      else onStep("prev");
    };
    n.addEventListener("wheel", onW, { passive: false });
    return () => n.removeEventListener("wheel", onW);
  }, [onStep, tabCount]);

  if (tabCount <= 0) return null;

  const i = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div
      ref={trackRef}
      className="relative z-20 mt-2 mb-1 flex h-1.5 w-full cursor-grab select-none items-center touch-pan-y overflow-hidden rounded-full bg-ink-100/80 active:cursor-grabbing md:mt-1.5"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        onStep(e.key === "ArrowLeft" ? "prev" : "next");
      }}
      role="slider"
      tabIndex={0}
      aria-label="Kies menucategorie"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, tabCount - 1)}
      aria-valuenow={i}
      aria-orientation="horizontal"
    >
      <div
        className="pointer-events-none absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gold-500 transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
        aria-hidden
        style={{
          width: tabCount <= 1 ? "100%" : `${100 / tabCount}%`,
          left: tabCount <= 1 ? 0 : `${(i * 100) / tabCount}%`,
        }}
      />
    </div>
  );
}
