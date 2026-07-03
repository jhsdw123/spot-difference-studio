// KDP print pipeline step 2: assemble a print-ready book interior PDF at 300 DPI.
// Puzzle pages: both pictures stacked, "find N differences" header, page numbers.
// Answer section: 4-up grid with red answer circles baked in.
// Usage: node make-kdp-book.mjs [--style toon] [--count 40] [--trim 8.5x11|6x9] [--out book.pdf]
import sharp from 'sharp';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const getArg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const styleFilter = getArg('--style', 'toon');
const count = parseInt(getArg('--count', '999'), 10);
const trim = getArg('--trim', '8.5x11');
const outPath = getArg('--out', `kdp-book-${styleFilter}-${trim}.pdf`);

const TRIMS = { '8.5x11': [612, 792], '6x9': [432, 648] }; // points (72/inch)
const [PW, PH] = TRIMS[trim] || TRIMS['8.5x11'];
const M = 40;             // outer margin (0.55in, comfortably above KDP minimum)
const DPI_TARGET = 300;

const root = resolve(import.meta.dirname);
const hdDir = join(root, 'kdp-hd');
const manifest = JSON.parse(readFileSync(join(root, '../library/manifest.json'), 'utf8'));
const entries = manifest.filter(e => (e.style || 'photo') === styleFilter).slice(0, count);
if (!entries.length) { console.error('no entries for style', styleFilter); process.exit(1); }
const missing = entries.filter(e => !existsSync(join(hdDir, `${e.id}_a.jpg`)));
if (missing.length) { console.error(`missing HD images for ${missing.length} pairs — run upscale-kdp.mjs first`); process.exit(1); }

const doc = await PDFDocument.create();
const fontB = await doc.embedFont(StandardFonts.HelveticaBold);
const font = await doc.embedFont(StandardFonts.Helvetica);

// resize HD jpg to the exact pixel size needed at 300dpi for its printed dimensions
async function embedResized(pdf, file, printWidthPt) {
  const px = Math.round(printWidthPt / 72 * DPI_TARGET);
  const buf = await sharp(file).resize(px, px, { fit: 'fill' }).jpeg({ quality: 92 }).toBuffer();
  return pdf.embedJpg(buf);
}

async function answerImage(e, printWidthPt) {
  const px = Math.round(printWidthPt / 72 * DPI_TARGET);
  const circles = e.regions.map(r => `<circle cx="${r.x / 100 * px}" cy="${r.y / 100 * px}" r="${r.radius / 100 * px}"
    fill="none" stroke="#e8262d" stroke-width="${Math.max(5, px * 0.009)}" stroke-dasharray="${px * 0.024} ${px * 0.015}"/>`).join('');
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}">${circles}</svg>`);
  const buf = await sharp(join(hdDir, `${e.id}_b.jpg`))
    .resize(px, px, { fit: 'fill' })
    .composite([{ input: overlay }])
    .jpeg({ quality: 90 }).toBuffer();
  return doc.embedJpg(buf);
}

function pageNumber(page, n) {
  page.drawText(String(n), { x: PW / 2 - 6, y: 18, size: 10, font, color: rgb(0.45, 0.42, 0.38) });
}

/* ---------- puzzle pages ---------- */
let pageNo = 1;
let num = 0;
for (const e of entries) {
  num++;
  const page = doc.addPage([PW, PH]);
  const headerH = 44;
  const gap = 14;
  const availH = PH - M * 2 - headerH - gap;
  const imgSide = Math.min(PW - M * 2, availH / 2);
  const x = (PW - imgSide) / 2;

  page.drawText(`Puzzle ${num}`, { x: M, y: PH - M - 16, size: 20, font: fontB, color: rgb(0.18, 0.16, 0.15) });
  page.drawText(`Find ${e.count} differences`, { x: PW - M - font.widthOfTextAtSize(`Find ${e.count} differences`, 13), y: PH - M - 14, size: 13, font, color: rgb(0.43, 0.4, 0.37) });

  const imgA = await embedResized(doc, join(hdDir, `${e.id}_a.jpg`), imgSide);
  const imgB = await embedResized(doc, join(hdDir, `${e.id}_b.jpg`), imgSide);
  const topY = PH - M - headerH - imgSide;
  page.drawImage(imgA, { x, y: topY, width: imgSide, height: imgSide });
  page.drawImage(imgB, { x, y: topY - gap - imgSide, width: imgSide, height: imgSide });
  pageNumber(page, pageNo++);
  process.stdout.write(`\rpuzzle pages: ${num}/${entries.length}`);
}
console.log();

/* ---------- answer section ---------- */
const perPage = 4; // 2x2 grid
for (let i = 0; i < entries.length; i += perPage) {
  const page = doc.addPage([PW, PH]);
  page.drawText('Answer Key', { x: M, y: PH - M - 16, size: 18, font: fontB, color: rgb(0.18, 0.16, 0.15) });
  const gridTop = PH - M - 40;
  const cellW = (PW - M * 2 - 16) / 2;
  const imgSide = Math.min(cellW, (gridTop - M - 40) / 2 - 24);
  for (let k = 0; k < perPage && i + k < entries.length; k++) {
    const e = entries[i + k];
    const col = k % 2, row = Math.floor(k / 2);
    const cx = M + col * (cellW + 16) + (cellW - imgSide) / 2;
    const cy = gridTop - row * (imgSide + 34) - imgSide;
    const img = await answerImage(e, imgSide);
    page.drawImage(img, { x: cx, y: cy, width: imgSide, height: imgSide });
    page.drawText(`Puzzle ${i + k + 1}`, { x: cx, y: cy - 14, size: 10, font: fontB, color: rgb(0.3, 0.28, 0.26) });
  }
  pageNumber(page, pageNo++);
  process.stdout.write(`\ranswer pages: ${Math.floor(i / perPage) + 1}/${Math.ceil(entries.length / perPage)}`);
}
console.log();

const bytes = await doc.save();
writeFileSync(join(root, outPath), bytes);
console.log(`saved ${outPath} — ${entries.length} puzzles, ${pageNo - 1} pages, ${(bytes.length / 1048576).toFixed(1)} MB, trim ${trim} @ ${DPI_TARGET}dpi`);
