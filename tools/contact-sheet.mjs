// contact sheets of all library scenes (image A) labeled with puzzle numbers
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(import.meta.dirname, 'contact-sheets');
mkdirSync(OUT, { recursive: true });
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'library/manifest.json'), 'utf8'));
const NUMS = JSON.parse(readFileSync(join(ROOT, 'library/pin-numbers.json'), 'utf8'));

const COLS = 7, ROWS = 6, T = 140, PAD = 8, LABEL = 26;
const CELL_W = T + PAD, CELL_H = T + LABEL + PAD;
const entries = MANIFEST.map(e => ({ ...e, num: NUMS[e.id] })).sort((a, b) => a.num - b.num);
const perSheet = COLS * ROWS;

for (let s = 0; s * perSheet < entries.length; s++) {
  const batch = entries.slice(s * perSheet, (s + 1) * perSheet);
  const comps = [];
  const labels = [];
  for (let i = 0; i < batch.length; i++) {
    const e = batch[i];
    const cx = (i % COLS) * CELL_W + PAD / 2;
    const cy = Math.floor(i / COLS) * CELL_H + PAD / 2;
    comps.push({
      input: await sharp(join(ROOT, 'library/img', `${e.id}_a.webp`)).resize(T, T).toBuffer(),
      left: cx, top: cy,
    });
    labels.push(`<text x="${cx + T / 2}" y="${cy + T + 20}" text-anchor="middle" font-family="Arial" font-weight="800" font-size="18" fill="#111">#${e.num}${e.style === 'toon' ? 'T' : ''}</text>`);
  }
  const W = COLS * CELL_W, H = ROWS * CELL_H;
  comps.push({ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${labels.join('')}</svg>`), left: 0, top: 0 });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
    .composite(comps).jpeg({ quality: 82 }).toFile(join(OUT, `sheet-${s + 1}.jpg`));
  console.log(`sheet-${s + 1}.jpg (${batch[0].num}..${batch[batch.length - 1].num})`);
}
