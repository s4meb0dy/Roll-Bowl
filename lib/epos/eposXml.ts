import type { ReceiptTextLine } from "./receiptContent";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textNode(line: ReceiptTextLine): string {
  const attrs: string[] = [];
  if (line.width && line.width > 1) attrs.push(`width="${line.width}"`);
  if (line.height && line.height > 1) attrs.push(`height="${line.height}"`);
  if (line.bold) attrs.push('em="true"');
  if (line.reverse) attrs.push('reverse="true"');
  const attrStr = attrs.length ? ` ${attrs.join(" ")}` : "";
  const content = escapeXml(line.text.replace(/\n/g, "&#10;"));
  if (line.align && line.align !== "left") {
    return `<text${attrStr}>${content}</text>`;
  }
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
