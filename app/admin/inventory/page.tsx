"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChefHat,
  Lock,
  Radio,
  RefreshCw,
  ShieldCheck,
  Package,
  PackageX,
  Cloud,
  ArrowLeft,
} from "lucide-react";
import Header from "@/components/Header";
import {
  useInventory,
  useInventorySync,
  postInventoryUpdate,
  triggerLightspeedSync,
} from "@/lib/inventory/client";
import {
  INVENTORY_CATALOG,
  PROTECTED_CATEGORIES,
} from "@/lib/inventory/config";
import type { InventoryCategoryConfig, InventoryItemEntry } from "@/lib/inventory/config";
import type { InventoryCategoryId } from "@/lib/inventory/types";

const ADMIN_PIN = "4355";

function PinGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onUnlock(pin);
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-500">
            <ChefHat size={28} className="text-white" />
          </div>
        </div>
        <h1 className="font-display mb-1 text-xl font-bold text-neutral-800">
          Voorraadbeheer
        </h1>
        <p className="mb-6 text-sm text-neutral-400">Voer de PIN in om verder te gaan</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoFocus
              className={`input-field pl-9 text-center text-2xl tracking-[0.5em] ${
                error ? "border-red-300 bg-red-50" : ""
              }`}
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 animate-fade-in">Incorrect PIN. Try again.</p>
          )}
          <button type="submit" className="btn-primary w-full justify-center">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

function ToggleSwitch({
  enabled,
  disabled,
  onChange,
  ariaLabel,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        disabled
          ? "cursor-not-allowed bg-neutral-200"
          : enabled
          ? "bg-sage-500"
          : "bg-neutral-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ItemRow({
  entry,
  available,
  pending,
  onToggle,
}: {
  entry: InventoryItemEntry;
  available: boolean;
  pending: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors ${
        available
          ? "border-neutral-100 bg-white"
          : "border-red-100 bg-red-50/50"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`font-medium ${
            available ? "text-neutral-800" : "text-neutral-500 line-through"
          }`}
        >
          {entry.name}
        </p>
        {entry.hint && (
          <p className="text-xs text-neutral-400">{entry.hint}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!available && (
          <span className="tag-badge bg-red-100 text-red-700">
            Uitverkocht
          </span>
        )}
        <ToggleSwitch
          enabled={available}
          disabled={pending}
          onChange={onToggle}
          ariaLabel={`Beschikbaarheid ${entry.name}`}
        />
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  pin,
}: {
  category: InventoryCategoryConfig;
  pin: string;
}) {
  const { isCategoryAvailable, isItemAvailable } = useInventory();
  const isProtected = PROTECTED_CATEGORIES.has(category.id);
  const categoryOn = isCategoryAvailable(category.id);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [localError, setLocalError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const setPendingKey = (key: string, on: boolean) => {
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  async function handleUpdate(kind: "item" | "category", id: string, available: boolean) {
    const key = `${kind}:${id}`;
    setPendingKey(key, true);
    setLocalError(null);
    try {
      await postInventoryUpdate(pin, { kind, id, available });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Fout bij opslaan.");
    } finally {
      setPendingKey(key, false);
    }
  }

  const categoryPending = pending.has(`category:${category.id}`);

  return (
    <section className="card overflow-hidden">
      <header
        className={`flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4 ${
          categoryOn ? "bg-neutral-50" : "bg-red-50/60"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-neutral-800">
              {category.label}
            </h2>
            {isProtected && (
              <span className="tag-badge inline-flex items-center gap-1 bg-sage-50 text-sage-700">
                <ShieldCheck size={11} /> Beschermd
              </span>
            )}
            {!categoryOn && !isProtected && (
              <span className="tag-badge bg-red-100 text-red-700">
                Volledig uit
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-500">{category.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="btn-ghost text-xs text-neutral-400"
          >
            {collapsed ? "Toon items" : "Verberg items"}
          </button>
          <ToggleSwitch
            enabled={categoryOn}
            disabled={isProtected || categoryPending}
            onChange={(next) => handleUpdate("category", category.id, next)}
            ariaLabel={`Categorie ${category.label}`}
          />
        </div>
      </header>

      {localError && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
          {localError}
        </div>
      )}

      {!collapsed && (
        <div className="space-y-5 px-5 py-4">
          {category.readyMade && category.readyMade.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Producten
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {category.readyMade.map((it) => (
                  <ItemRow
                    key={it.id}
                    entry={{ id: it.id, name: it.name }}
                    available={isItemAvailable(it.id)}
                    pending={pending.has(`item:${it.id}`)}
                    onToggle={(next) => handleUpdate("item", it.id, next)}
                  />
                ))}
              </div>
            </div>
          )}

          {category.builderGroups?.map((group) => (
            <div key={group.id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {group.label}
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {group.items.map((entry) => (
                  <ItemRow
                    key={entry.id}
                    entry={entry}
                    available={isItemAvailable(entry.id)}
                    pending={pending.has(`item:${entry.id}`)}
                    onToggle={(next) => handleUpdate("item", entry.id, next)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function InventoryAdminPage() {
  useInventorySync();
  const { state, connected } = useInventory();

  const [mounted, setMounted] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return INVENTORY_CATALOG;
    return INVENTORY_CATALOG.map((cat) => {
      const readyMade = cat.readyMade?.filter((it) => it.name.toLowerCase().includes(q));
      const builderGroups = cat.builderGroups?.map((g) => ({
        ...g,
        items: g.items.filter((it) => it.name.toLowerCase().includes(q)),
      })).filter((g) => g.items.length > 0);
      const hasMatch =
        cat.label.toLowerCase().includes(q) ||
        (readyMade && readyMade.length > 0) ||
        (builderGroups && builderGroups.length > 0);
      return hasMatch
        ? { ...cat, readyMade, builderGroups: builderGroups ?? cat.builderGroups }
        : null;
    }).filter(Boolean) as typeof INVENTORY_CATALOG;
  }, [search]);

  const outOfStockCount = useMemo(() => {
    return Object.values(state.items).filter((v) => v === false).length;
  }, [state.items]);

  const disabledCategories = useMemo(() => {
    const out: InventoryCategoryId[] = [];
    for (const [k, v] of Object.entries(state.categories)) {
      if (v === false) out.push(k as InventoryCategoryId);
    }
    return out;
  }, [state.categories]);

  async function handleSync() {
    if (!pin) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await triggerLightspeedSync(pin);
      if (res.ok) {
        setSyncMessage(`Lightspeed sync OK — ${res.applied ?? 0} item(s) bijgewerkt.`);
      } else if (res.reason === "lightspeed_not_configured") {
        setSyncMessage(res.message ?? "Lightspeed nog niet geconfigureerd.");
      } else {
        setSyncMessage("Sync mislukt. Probeer opnieuw.");
      }
    } catch {
      setSyncMessage("Netwerkfout tijdens sync.");
    } finally {
      setSyncing(false);
    }
  }

  if (!mounted || !pin) {
    return (
      <>
        <Header />
        <PinGate onUnlock={setPin} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="btn-ghost text-xs text-neutral-400 hover:text-neutral-600"
              >
                <ArrowLeft size={14} /> Bestellingen
              </Link>
            </div>
            <h1 className="font-display mt-1 text-2xl font-bold text-neutral-800">
              Voorraadbeheer
            </h1>
            <p className="text-sm text-neutral-500">
              {outOfStockCount} producten uitverkocht ·{" "}
              {disabledCategories.length} categorie(ën) globaal uit
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm ${
                connected
                  ? "border-emerald-200 bg-white"
                  : "border-amber-200 bg-amber-50"
              }`}
              title={connected ? "Live via SSE" : "Polling fallback (elke 15 s)"}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    connected ? "animate-ping bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    connected ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <Radio size={14} className={connected ? "text-emerald-600" : "text-amber-600"} />
              <span className={`font-semibold ${connected ? "text-emerald-800" : "text-amber-800"}`}>
                {connected ? "Live sync actief" : "Polling fallback"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="btn-secondary text-sm"
            >
              {syncing ? <RefreshCw size={15} className="animate-spin" /> : <Cloud size={15} />}
              Lightspeed sync
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-600">
            {syncMessage}
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="card flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-50 text-sage-700">
              <Package size={18} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-400">
                In voorraad
              </div>
              <div className="font-bold text-neutral-800">
                {Object.keys(ITEM_IDS).length - outOfStockCount}
              </div>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
              <PackageX size={18} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-400">
                Uitverkocht
              </div>
              <div className="font-bold text-neutral-800">{outOfStockCount}</div>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-50 text-sage-700">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-400">
                Beschermd
              </div>
              <div className="font-bold text-neutral-800">Bowls · Burritos · Sushi</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek een product of ingrediënt…"
            className="input-field"
          />
        </div>

        <div className="space-y-5">
          {filtered.map((category) => (
            <CategoryCard key={category.id} category={category} pin={pin} />
          ))}
        </div>
      </main>
    </div>
  );
}

// Build a stable map of every item ID exactly once — used only for the
// in-stock counter in the stats strip above.
const ITEM_IDS: Record<string, true> = (() => {
  const out: Record<string, true> = {};
  for (const cat of INVENTORY_CATALOG) {
    cat.readyMade?.forEach((it) => { out[it.id] = true; });
    cat.builderGroups?.forEach((g) => g.items.forEach((it) => { out[it.id] = true; }));
  }
  return out;
})();
