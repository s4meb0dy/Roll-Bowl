"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

const DEFAULT_MAX = 999;

type Size = "lg" | "md" | "sm";

const SIZE_STYLES: Record<
  Size,
  { btn: string; useIcons: boolean; input: string; icon: number; gap: string }
> = {
  lg: {
    btn: "tap-target flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-ink-200 text-lg font-bold text-ink-600 transition-transform motion-reduce:transition-none hover:bg-ink-100 active:scale-[0.98] motion-reduce:active:scale-100",
    useIcons: false,
    input:
      "w-10 min-w-[2.5rem] border-0 bg-transparent p-0 text-center text-sm font-semibold tabular-nums text-ink-800 focus:outline-none focus:ring-0",
    icon: 0,
    gap: "gap-1",
  },
  md: {
    btn: "flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100",
    useIcons: true,
    input:
      "w-8 min-w-[2rem] max-w-[3.25rem] border-0 bg-transparent p-0 text-center text-sm font-semibold tabular-nums text-ink-800 focus:outline-none focus:ring-0",
    icon: 13,
    gap: "gap-1",
  },
  sm: {
    btn: "flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100",
    useIcons: true,
    input:
      "w-7 min-w-[1.75rem] max-w-[3.25rem] border-0 bg-transparent p-0 text-center text-sm font-semibold tabular-nums text-ink-800 focus:outline-none focus:ring-0",
    icon: 13,
    gap: "gap-1",
  },
};

type Props = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  size?: Size;
  className?: string;
  inputAriaLabel?: string;
};

/**
 * +/− with a field you can type into (clamped to min–max, integer).
 */
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = DEFAULT_MAX,
  size = "lg",
  className = "",
  inputAriaLabel = "Aantal",
}: Props) {
  const s = SIZE_STYLES[size];
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(String(value));
    }
  }, [value, focused]);

  const commit = (raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned === "") {
      onChange(value);
      setText(String(value));
      return;
    }
    const n = parseInt(cleaned, 10);
    if (Number.isNaN(n)) {
      onChange(value);
      setText(String(value));
      return;
    }
    const next = Math.min(max, Math.max(min, n));
    onChange(next);
    setText(String(next));
  };

  return (
    <div className={`flex items-center ${s.gap} ${className}`.trim()}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={s.btn}
        aria-label="Minder"
      >
        {s.useIcons ? <Minus size={s.icon} /> : "−"}
      </button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/\D/g, "");
          setText(t);
          if (t === "") return;
          const n = parseInt(t, 10);
          if (Number.isNaN(n)) return;
          onChange(Math.min(max, Math.max(min, n)));
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit(text);
        }}
        className={s.input}
        aria-label={inputAriaLabel}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className={s.btn}
        aria-label="Meer"
      >
        {s.useIcons ? <Plus size={s.icon} /> : "+"}
      </button>
    </div>
  );
}
