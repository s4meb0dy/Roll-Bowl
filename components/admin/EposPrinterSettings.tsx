"use client";

import { useCallback, useEffect, useState } from "react";
import { Printer, Wifi } from "lucide-react";
import {
  DEFAULT_EPOS_CONFIG,
  loadEposConfig,
  saveEposConfig,
  type EposPrinterConfig,
} from "@/lib/epos/config";
import { printEposTest } from "@/lib/epos/printOrder";

export default function EposPrinterSettings() {
  const [config, setConfig] = useState<EposPrinterConfig>(DEFAULT_EPOS_CONFIG);
  const [message, setMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConfig(loadEposConfig());
  }, []);

  const persist = useCallback((next: EposPrinterConfig) => {
    setConfig(next);
    saveEposConfig(next);
  }, []);

  const onTest = async () => {
    setTesting(true);
    setMessage(null);
    const result = await printEposTest(config);
    setMessage(result.ok ? "Testbon afgedrukt." : result.error);
    setTesting(false);
  };

  if (!mounted) return null;

  return (
    <div className="no-print mt-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Wifi size={18} className="text-sage-700" />
        <h3 className="text-sm font-bold text-neutral-800">Epson ePOS (Wi‑Fi printer)</h3>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-neutral-600">
        TM-m30II / TM-m30III op hetzelfde Wi‑Fi als de iPad. Eénmalig:{" "}
        <strong>TM Utility</strong> → Wi‑Fi, daarna op{" "}
        <strong>http://[printer-IP]</strong> (login <code className="rounded bg-neutral-100 px-1">epson</code>
        / <code className="rounded bg-neutral-100 px-1">epson</code>) →{" "}
        <strong>ePOS-Print inschakelen</strong> → Restart. Vast IP in de router aanbevolen.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-neutral-700">
          Printer IP (vast)
          <input
            type="text"
            inputMode="decimal"
            placeholder="192.168.1.50"
            value={config.host}
            onChange={(e) => persist({ ...config, host: e.target.value.trim() })}
            className="input-field mt-1 font-mono text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-neutral-700">
          Device ID
          <input
            type="text"
            value={config.deviceId}
            onChange={(e) =>
              persist({ ...config, deviceId: e.target.value.trim() || "local_printer" })
            }
            className="input-field mt-1 font-mono text-sm"
          />
        </label>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => persist({ ...config, enabled: e.target.checked })}
          className="h-4 w-4 rounded border-neutral-300"
        />
        <span className="font-medium text-neutral-800">
          ePOS-druk gebruiken (geen Safari/AirPrint-dialoog)
        </span>
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={testing || !config.host.trim()}
          onClick={() => void onTest()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-xs font-semibold text-sage-900 shadow-sm disabled:opacity-40"
        >
          <Printer size={14} />
          {testing ? "Drukken…" : "Testbon"}
        </button>
        {message && (
          <span
            className={`text-xs font-medium ${
              message.includes("afgedrukt") ? "text-sage-700" : "text-red-600"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
