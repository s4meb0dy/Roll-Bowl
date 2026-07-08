/** localStorage key for kitchen Epson ePOS printer settings (admin iPad). */
export const EPOS_CONFIG_KEY = "roll-bowl-epos-config";

export interface EposPrinterConfig {
  /** Printer IPv4 on the café LAN, e.g. 192.168.1.50 */
  host: string;
  /** ePOS-Print device id (default on TM-m30 series: local_printer). */
  deviceId: string;
  /** Request timeout ms. */
  timeoutMs: number;
  /** When true, /admin uses ePOS instead of window.print(). */
  enabled: boolean;
}

export const DEFAULT_EPOS_CONFIG: EposPrinterConfig = {
  host: "",
  deviceId: "local_printer",
  timeoutMs: 60000,
  enabled: false,
};

export function loadEposConfig(): EposPrinterConfig {
  if (typeof window === "undefined") return DEFAULT_EPOS_CONFIG;
  try {
    const raw = localStorage.getItem(EPOS_CONFIG_KEY);
    if (!raw) return DEFAULT_EPOS_CONFIG;
    const parsed = JSON.parse(raw) as Partial<EposPrinterConfig>;
    return {
      host: typeof parsed.host === "string" ? parsed.host.trim() : "",
      deviceId:
        typeof parsed.deviceId === "string" && parsed.deviceId.trim()
          ? parsed.deviceId.trim()
          : DEFAULT_EPOS_CONFIG.deviceId,
      timeoutMs:
        typeof parsed.timeoutMs === "number" && parsed.timeoutMs >= 5000
          ? parsed.timeoutMs
          : DEFAULT_EPOS_CONFIG.timeoutMs,
      enabled: parsed.enabled === true,
    };
  } catch {
    return DEFAULT_EPOS_CONFIG;
  }
}

export function saveEposConfig(config: EposPrinterConfig): void {
  localStorage.setItem(EPOS_CONFIG_KEY, JSON.stringify(config));
}

export function eposServiceUrl(config: EposPrinterConfig): string | null {
  const host = config.host.trim();
  if (!host) return null;
  const devid = encodeURIComponent(config.deviceId || "local_printer");
  const timeout = config.timeoutMs || 60000;
  return `http://${host}/cgi-bin/epos/service.cgi?devid=${devid}&timeout=${timeout}`;
}
