import type { Order } from "@/lib/types";
import type { EposPrinterConfig } from "./config";
import { eposServiceUrl } from "./config";
import { buildEposPrintXml, wrapSoapEnvelope } from "./eposXml";
import { buildKitchenReceiptLines } from "./receiptContent";

export type EposPrintResult =
  | { ok: true; mode: "sdk" | "http" }
  | { ok: false; error: string };

declare global {
  interface Window {
    epson?: {
      ePOSBuilder: new () => EposBuilder;
      ePOSPrint: new (url: string) => EposPrint;
    };
  }
}

interface EposBuilder {
  addTextLang(lang: string): EposBuilder;
  addTextFont(font: number): EposBuilder;
  addTextSize(w: number, h: number): EposBuilder;
  addText(text: string): EposBuilder;
  addTextAlign(align: number): EposBuilder;
  addTextStyle(options: {
    em?: boolean;
    ul?: boolean;
    reverse?: boolean;
  }): EposBuilder;
  addFeedLine(lines: number): EposBuilder;
  addCut(type: number): EposBuilder;
  addSymbol(
    data: string,
    type: number,
    level: number,
    width: number,
    height: number,
    size: number
  ): EposBuilder;
  toString(): string;
  FONT_A: number;
  ALIGN_LEFT: number;
  ALIGN_CENTER: number;
  ALIGN_RIGHT: number;
  CUT_FEED: number;
  SYMBOL_QRCODE_MODEL_2: number;
  LEVEL_M: number;
}

interface EposPrint {
  send(request: string): void;
  onreceive?: (response: { success: boolean; code?: string; status?: string }) => void;
  onerror?: (error: { status?: number; responseText?: string }) => void;
}

let sdkLoadPromise: Promise<boolean> | null = null;

/** Load official Epson ePOS SDK from /public/epos/epos-2.27.0.js */
export function loadEposSdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.epson?.ePOSBuilder && window.epson?.ePOSPrint) {
    return Promise.resolve(true);
  }
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-epos-sdk="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(!!window.epson?.ePOSPrint));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "/epos/epos-2.27.0.js";
    script.async = true;
    script.dataset.eposSdk = "1";
    script.onload = () => resolve(!!window.epson?.ePOSPrint);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

function buildSdkDocument(order: Order): string | null {
  const e = window.epson;
  if (!e?.ePOSBuilder) return null;

  const Builder = e.ePOSBuilder;
  const b = new Builder();
  b.addTextLang("nl");
  b.addTextFont(b.FONT_A);

  for (const line of buildKitchenReceiptLines(order)) {
    const align =
      line.align === "center"
        ? b.ALIGN_CENTER
        : line.align === "right"
          ? b.ALIGN_RIGHT
          : b.ALIGN_LEFT;
    b.addTextAlign(align);
    if (line.qr) {
      b.addSymbol(line.qr, b.SYMBOL_QRCODE_MODEL_2, b.LEVEL_M, 6, 6, 0);
      b.addTextAlign(b.ALIGN_LEFT);
      continue;
    }
    b.addTextSize(line.width ?? 1, line.height ?? 1);
    b.addTextStyle({
      em: line.bold,
      reverse: line.reverse,
    });
    b.addText(`${line.text}\n`);
    b.addTextSize(1, 1);
    b.addTextStyle({});
    b.addTextAlign(b.ALIGN_LEFT);
  }

  b.addFeedLine(3);
  b.addCut(b.CUT_FEED);
  return b.toString();
}

function printViaSdk(url: string, xmlOrRequest: string): Promise<EposPrintResult> {
  return new Promise((resolve) => {
    const e = window.epson;
    if (!e?.ePOSPrint) {
      resolve({ ok: false, error: "ePOS SDK niet geladen" });
      return;
    }
    const printer = new e.ePOSPrint(url);
    const timer = window.setTimeout(() => {
      resolve({ ok: false, error: "Printer timeout — controleer IP en ePOS-Print instelling" });
    }, 65000);

    printer.onreceive = (res) => {
      clearTimeout(timer);
      if (res.success) resolve({ ok: true, mode: "sdk" });
      else
        resolve({
          ok: false,
          error: `Printer fout (${res.code ?? res.status ?? "onbekend"})`,
        });
    };
    printer.onerror = (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        error: `Netwerk/CORS: ${err.status ?? ""} ${err.responseText ?? "kan printer niet bereiken"}. Open eenmalig https://[printer-ip] op de iPad en accepteer het certificaat. ePOS-Print + SSL aan (login epson/epson).`,
      });
    };

    try {
      printer.send(xmlOrRequest);
    } catch (e) {
      clearTimeout(timer);
      resolve({
        ok: false,
        error: e instanceof Error ? e.message : "Print mislukt",
      });
    }
  });
}

async function printViaHttp(url: string, soapBody: string): Promise<EposPrintResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: '""',
      },
      body: soapBody,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status} — ePOS-Print + SSL inschakelen op printer (https://IP → ePOS-Print → Restart)`,
      };
    }
    const text = await res.text();
    if (/success\s*=\s*"(true|1)"/i.test(text) || /<response[^>]*success/i.test(text)) {
      return { ok: true, mode: "http" };
    }
    if (/error/i.test(text)) {
      return { ok: false, error: "Printer antwoordde met een fout" };
    }
    return { ok: true, mode: "http" };
  } catch {
    return {
      ok: false,
      error:
        "Geen verbinding met printer. Zelfde Wi‑Fi? ePOS-Print + SSL aan? Open eenmalig https://[printer-ip] op de iPad om het certificaat te accepteren. Local Network toestaan voor rollnbowl.be?",
    };
  }
}

/** Print kitchen receipt for an order via Epson ePOS (SDK preferred, HTTP fallback). */
export async function printKitchenOrderEpos(
  order: Order,
  config: EposPrinterConfig
): Promise<EposPrintResult> {
  const url = eposServiceUrl(config);
  if (!url) {
    return { ok: false, error: "Geen printer IP — stel ePOS in bij Keuken-setup" };
  }

  const xml = buildEposPrintXml(buildKitchenReceiptLines(order));
  const soap = wrapSoapEnvelope(xml);

  const sdkReady = await loadEposSdk();
  if (sdkReady) {
    const sdkDoc = buildSdkDocument(order);
    if (sdkDoc) {
      const sdkResult = await printViaSdk(url, sdkDoc);
      if (sdkResult.ok) return sdkResult;
    }
  }

  return printViaHttp(url, soap);
}

/** Test print (minimal) to verify connectivity. */
export async function printEposTest(config: EposPrinterConfig): Promise<EposPrintResult> {
  const url = eposServiceUrl(config);
  if (!url) {
    return { ok: false, error: "Vul printer IP in" };
  }

  const testLines = buildKitchenReceiptLines({
    id: "test0001",
    items: [],
    subtotal: 0,
    deliveryFee: 0,
    total: 0,
    customerInfo: {
      name: "Test",
      phone: "+32 000 00 00 00",
      address: "Teststraat 1",
      zipCode: "2100 Deurne",
    },
    generalNote: "",
    paymentMethod: "online",
    orderType: "takeaway",
    fulfillmentTime: { mode: "asap" },
    status: "paid",
    createdAt: new Date().toISOString(),
  });

  const xml = buildEposPrintXml([
    { text: "Roll&Bowl", align: "center", bold: true, width: 2, height: 2 },
    { text: "ePOS TEST OK", align: "center", bold: true },
    ...testLines.slice(0, 4),
  ]);
  const soap = wrapSoapEnvelope(xml);

  const sdkReady = await loadEposSdk();
  if (sdkReady && window.epson?.ePOSPrint) {
    const b = new window.epson.ePOSBuilder();
    b.addTextAlign(b.ALIGN_CENTER);
    b.addTextSize(2, 2);
    b.addText("Roll&Bowl\n");
    b.addTextSize(1, 1);
    b.addText("ePOS test OK\n");
    b.addCut(b.CUT_FEED);
    const sdkResult = await printViaSdk(url, b.toString());
    if (sdkResult.ok) return sdkResult;
  }

  return printViaHttp(url, soap);
}
