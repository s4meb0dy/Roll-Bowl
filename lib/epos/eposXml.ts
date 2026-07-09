import type { ReceiptTextLine } from "./receiptContent";

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

function textNode(line: ReceiptTextLine): string {
  if (line.qr) return symbolNode(line.qr);
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
    `reverse="${line.reverse ? "true" : "false"}"`,
  ];
  const attrStr = ` ${attrs.join(" ")}`;
  const content = escapeXml(line.text).replace(/\n/g, "&#10;");
  // Every logical line gets its own feed — including centered/right lines,
  // otherwise consecutive aligned lines (e.g. the header) print on one row.
  return `<text${attrStr}>${content}&#10;</text>`;
}

/** Build ePOS-Print XML body (inside SOAP). */
export function buildEposPrintXml(lines: ReceiptTextLine[]): string {
  const body: string[] = [];

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
    body.push(textNode(line));
  }
  if (currentAlign !== null) body.push("</align>");

  body.push('<cut type="feed"/>');

  return (
    `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">` +
    body.join("") +
    `</epos-print>`
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
