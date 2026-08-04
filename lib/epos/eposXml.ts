import type { ReceiptTextLine } from "./receiptContent";

/**
 * ESC/POS: GS ( K fn=48 m=50 — "Fine" print control mode on TM-m30 / m30II / m30III.
 * Caps speed at ~100 mm/s so the thermal head burns darker solid black
 * instead of the default high-speed pale gray.
 * Hex: 1D 28 4B 02 00 30 32
 */
export const EPOS_FINE_PRINT_MODE_HEX = "1d284b02003032";

/** Same command as a binary string for the Epson JS SDK `addCommand()`. */
export const EPOS_FINE_PRINT_MODE_BIN =
  "\x1d\x28\x4b\x02\x00\x30\x32";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function symbolNode(data: string): string {
  return (
    `<symbol type="qrcode_model_2" level="level_m" width="6" height="6" size="0">` +
    escapeXml(data) +
    `</symbol>`
  );
}

export type BuildEposXmlOptions = {
  /**
   * Prefix GS ( K Fine-mode density command. Safe for local ePOS/SDK;
   * omit for Server Direct Print — some firmwares reject `<command>` in
   * SDP PrintData and then never print the job.
   */
  densityCommand?: boolean;
  /**
   * SDP-safe subset: skip `color`, QR symbols, and reverse (those have caused
   * silent job drops on some TM-m30III firmwares).
   */
  sdpSafe?: boolean;
};

function textNode(line: ReceiptTextLine, opts: BuildEposXmlOptions): string {
  if (line.qr) {
    if (opts.sdpSafe) {
      // Print the URL as plain text instead of a QR symbol over SDP.
      return `<text width="1" height="1" em="false">${escapeXml(line.qr)}&#10;</text>`;
    }
    return symbolNode(line.qr);
  }
  // ePOS-Print XML text attributes are modal: they stay in effect for every
  // following <text> until changed. So we must set the full style explicitly
  // on each line, otherwise a single reverse/bold/large line would carry over
  // and (for reverse) turn the rest of the receipt white-on-black.
  const width = line.width && line.width > 1 ? line.width : 1;
  const height = line.height && line.height > 1 ? line.height : 1;
  const attrs = [
    `width="${width}"`,
    `height="${height}"`,
    `em="${line.bold ? "true" : "false"}"`,
  ];
  if (!opts.sdpSafe) {
    attrs.push(`color="color_1"`);
    attrs.push(`reverse="${line.reverse ? "true" : "false"}"`);
  } else if (line.reverse) {
    // Emphasize instead of reverse for SDP-safe path.
    attrs[2] = `em="true"`;
  }
  const attrStr = ` ${attrs.join(" ")}`;
  const content = escapeXml(line.text).replace(/\n/g, "&#10;");
  // Every logical line gets its own feed — including centered/right lines,
  // otherwise consecutive aligned lines (e.g. the header) print on one row.
  return `<text${attrStr}>${content}&#10;</text>`;
}

/** Build ePOS-Print XML body (inside SOAP / SDP PrintData). */
export function buildEposPrintXml(
  lines: ReceiptTextLine[],
  opts: BuildEposXmlOptions = {}
): string {
  const body: string[] = [];

  if (opts.densityCommand) {
    body.push(`<command>${EPOS_FINE_PRINT_MODE_HEX}</command>`);
  }

  let currentAlign: "left" | "center" | "right" | null = null;

  for (const line of lines) {
    const align = line.align ?? "left";
    if (align !== currentAlign) {
      if (currentAlign !== null) body.push("</align>");
      if (align !== "left") {
        body.push(`<align align="${align}">`);
      }
      currentAlign = align === "left" ? null : align;
    }
    body.push(textNode(line, opts));
  }
  if (currentAlign !== null) body.push("</align>");

  body.push('<cut type="feed"/>');

  return (
    `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">` +
    body.join("") +
    `</epos-print>`
  );
}

/** Minimal known-good SDP payload for connectivity tests. */
export function buildSdpTestPrintXml(printJobId = "sdptest"): string {
  const jobId = printJobId.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 30) || "sdptest";
  const epos =
    `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">` +
    `<text lang="nl"/>` +
    `<align align="center">` +
    `<text em="true">ROLL &amp; BOWL&#10;</text>` +
    `<text>SDP TEST OK&#10;</text>` +
    `</align>` +
    `<text>&#10;</text>` +
    `<cut type="feed"/>` +
    `</epos-print>`;
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<PrintRequestInfo Version="2.00">` +
    `<ePOSPrint>` +
    `<Parameter>` +
    `<devid>local_printer</devid>` +
    `<timeout>10000</timeout>` +
    `<printjobid>${jobId}</printjobid>` +
    `</Parameter>` +
    `<PrintData>${epos}</PrintData>` +
    `</ePOSPrint>` +
    `</PrintRequestInfo>`
  );
}

export function wrapSoapEnvelope(eposPrintXml: string): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ` +
    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xmlns:xsd="http://www.w3.org/2001/XMLSchema">` +
    `<soap:Body>${eposPrintXml}</soap:Body></soap:Envelope>`
  );
}
