// Grayscale-survivability analyzer.
// For every pair, checks whether each difference region still shows a visible
// difference after grayscale conversion. A pair is "bw_safe" only if EVERY
// region survives — otherwise its B&W version would mismatch the answer key.
// Usage: node bw-check.mjs [nums,comma,sep]   (no arg = whole library summary)
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const LIB = join(ROOT, 'library/img');
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'library/manifest.json'), 'utf8'));
const NUMS = JSON.parse(readFileSync(join(ROOT, 'library/pin-numbers.json'), 'utf8'));
const byNum = {}; for (const e of MANIFEST) byNum[NUMS[e.id]] = e;

// A region "collapses" in grayscale only when it has a real color difference
// that mostly VANISHES in gray: color diff is meaningful, but grayscale keeps
// less than half of it AND loses a big absolute chunk. Small-but-present
// differences (grayMAD ≈ colorMAD) are fine — they survive B&W, just subtle.
const COLOR_MIN = 13;      // region must actually differ in color to matter
const RATIO = 0.5;         // grayMAD must be < 50% of colorMAD to count as color-dependent
const ABS_GAP = 8;         // ...and lose at least this much absolute contrast

async function rawGray(id, side, w, h) {
  return { data: await sharp(join(LIB, `${id}_${side}.webp`)).grayscale().raw().toBuffer(), w, h };
}
async function rawColor(id, side) {
  const img = sharp(join(LIB, `${id}_${side}.webp`));
  const meta = await img.metadata();
  return { data: await img.raw().toBuffer(), w: meta.width, h: meta.height, ch: 3 };
}

function regionMAD(a, b, w, h, ch, r) {
  const cx = r.x / 100 * w, cy = r.y / 100 * h, rad = Math.max(r.radius, 4) / 100 * Math.max(w, h);
  const x0 = Math.max(0, Math.round(cx - rad)), x1 = Math.min(w, Math.round(cx + rad));
  const y0 = Math.max(0, Math.round(cy - rad)), y1 = Math.min(h, Math.round(cy + rad));
  let sum = 0, cnt = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * w + x) * ch;
    if (ch === 1) sum += Math.abs(a[i] - b[i]);
    else sum += (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
    cnt++;
  }
  return cnt ? sum / cnt : 0;
}

async function analyze(e) {
  const col = await rawColor(e.id, 'a');
  const colB = (await sharp(join(LIB, `${e.id}_b.webp`)).raw().toBuffer());
  const grA = (await sharp(join(LIB, `${e.id}_a.webp`)).grayscale().raw().toBuffer());
  const grB = (await sharp(join(LIB, `${e.id}_b.webp`)).grayscale().raw().toBuffer());
  const { w, h } = col;
  const regions = e.regions.map((r, i) => {
    const colorMad = regionMAD(col.data, colB, w, h, 3, r);
    const grayMad = regionMAD(grA, grB, w, h, 1, r);
    const collapses = colorMad >= COLOR_MIN && grayMad < RATIO * colorMad && (colorMad - grayMad) >= ABS_GAP;
    return { i: i + 1, colorMad: +colorMad.toFixed(1), grayMad: +grayMad.toFixed(1), collapses };
  });
  const bad = regions.filter(r => r.collapses);
  return { bwSafe: bad.length === 0, regions, badCount: bad.length };
}

const arg = process.argv[2];
const targets = arg ? arg.split(',').map(Number).map(n => ({ n, e: byNum[n] })) : MANIFEST.map(e => ({ n: NUMS[e.id], e }));

let safe = 0, unsafe = 0; const safeList = [], unsafeList = [];
for (const { n, e } of targets) {
  const r = await analyze(e);
  if (r.bwSafe) { safe++; safeList.push(n); }
  else { unsafe++; unsafeList.push(n); }
  if (arg) console.log(`#${n} ${r.bwSafe ? 'SAFE ✓' : 'UNSAFE ✗ (' + r.badCount + ' color-only)'}  ` + r.regions.map(x => `${x.grayMad}/${x.colorMad}${x.collapses ? '⚠' : ''}`).join(' '));
}
console.log(`\n=== ${safe} bw-safe / ${unsafe} unsafe (of ${targets.length}) ===`);
if (!arg) {
  writeFileSync(join(ROOT, 'library/bw-safe.json'), JSON.stringify({ safe: safeList.sort((a, b) => a - b), unsafe: unsafeList.sort((a, b) => a - b), rule: { COLOR_MIN, RATIO, ABS_GAP } }, null, 0));
  console.log('wrote library/bw-safe.json');
}
