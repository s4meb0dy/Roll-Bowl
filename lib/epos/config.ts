/** localStorage key for kitchen Epson ePOS printer settings (admin iPad). */
export const EPOS_CONFIG_KEY = "roll-bowl-epos-config";

export interface EposPrinterConfig {
  /** Printer IPv4 on the café LAN, e.g. 192.168.1.50 */
  host: string;
  /** ePOS-Print device id (default on TM-m30 series: local_printer). */
  deviceId: string;
  /** Request timeout ms. */
  timeoutMs: number;
  /**
   * Use HTTPS to reach the printer. Required when the admin page itself is
   * served over HTTPS (rollnbowl.be) — browsers block http:// (mixed content).
   * Enable SSL + ePOS-Print on the printer and accept its self-signed cert once.
   */
  useSsl: boolean;
  /** When true, /admin uses ePOS instead of window.print(). */
  enabled: boolean;
}

export const DEFAULT_EPOS_CONFIG: EposPrinterConfig = {
  host: "",
  deviceId: "local_printer",
  timeoutMs: 60000,
  useSsl: true,
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
      useSsl: parsed.useSsl !== false,
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
  const scheme = config.useSsl ? "https" : "http";
  return `${scheme}://${host}/cgi-bin/epos/service.cgi?devid=${devid}&timeout=${timeout}`;
}

/** Web Config / cert-accept URL for the printer (open once in the kitchen browser). */
export function eposPrinterWebUrl(config: EposPrinterConfig): string | null {
  const host = config.host.trim();
  if (!host) return null;
  const scheme = config.useSsl !== false ? "https" : "http";
  return `${scheme}://${host}/`;
}

/**
 * True when the print error is almost certainly a blocked self-signed SSL
 * certificate (browser refuses the request until the operator opens the
 * printer IP and taps "Advanced → Proceed").
 */
export function isPrinterCertError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("certificaat") ||
    m.includes("certificate") ||
    m.includes("netwerk/cors") ||
    m.includes("kan printer niet bereiken") ||
    m.includes("geen verbinding met printer") ||
    m.includes("failed to fetch") ||
    m.includes("load failed") ||
    m.includes("networkerror")
  );
}
