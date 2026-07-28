/**
 * One-shot: convert all PNG files under public/ to WebP and remove originals.
 * Menu cards display at ~400px — 450×450 WebP @ q82 is ~30–80 KB vs ~500 KB PNG.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PUBLIC = path.join(process.cwd(), "public");
const MAX_EDGE = 512;
const QUALITY = 82;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (e.isFile() && e.name.toLowerCase().endsWith(".png")) files.push(full);
  }
  return files;
}

async function convertOne(pngPath) {
  const webpPath = pngPath.replace(/\.png$/i, ".webp");
  const img = sharp(pngPath);
  const meta = await img.metadata();
  const w = meta.width ?? MAX_EDGE;
  const h = meta.height ?? MAX_EDGE;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));

  await img
    .resize(scale < 1 ? Math.round(w * scale) : w, scale < 1 ? Math.round(h * scale) : h, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY, effort: 4 })
    .toFile(webpPath);

  const [before, after] = await Promise.all([
    fs.stat(pngPath),
    fs.stat(webpPath),
  ]);
  await fs.unlink(pngPath);
  return { pngPath, before: before.size, after: after.size };
}

const pngs = await walk(PUBLIC);
let saved = 0;
let beforeTotal = 0;
let afterTotal = 0;

for (const p of pngs) {
  const r = await convertOne(p);
  beforeTotal += r.before;
  afterTotal += r.after;
  saved += r.before - r.after;
  console.log(`${path.relative(PUBLIC, r.pngPath)} → ${(r.after / 1024).toFixed(0)} KB (was ${(r.before / 1024).toFixed(0)} KB)`);
}

console.log(
  `\nDone: ${pngs.length} files, ${(beforeTotal / 1024 / 1024).toFixed(1)} MB → ${(afterTotal / 1024 / 1024).toFixed(1)} MB (saved ${(saved / 1024 / 1024).toFixed(1)} MB)`
);
