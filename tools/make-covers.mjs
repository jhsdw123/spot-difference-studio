// Portal submission covers for Spot Hunt — composed from a real cartoon puzzle
// pair (A|B side by side, like the game) + logo/wordmark overlay.
// Output: ../../spot-hunt-game/tools/dist/assets/
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const LIB = resolve(import.meta.dirname, '../library/img');
const OUT = resolve(import.meta.dirname, '../../spot-hunt-game/tools/dist/assets');
mkdirSync(OUT, { recursive: true });

const PAIR_ID = process.argv[2] || 'toon_mr4pj0f6_0';
const a = join(LIB, `${PAIR_ID}_a.webp`);
const b = join(LIB, `${PAIR_ID}_b.webp`);

const logoSvg = (s) => Buffer.from(`
<svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ff5a5f"/><stop offset="1" stop-color="#ffb03a"/>
  </linearGradient></defs>
  <circle cx="42" cy="42" r="27" fill="none" stroke="url(#lg)" stroke-width="11"/>
  <path d="M63 63 L86 86" stroke="url(#lg)" stroke-width="13" stroke-linecap="round"/>
  <path d="M34 40 Q42 30 52 36" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".85"/>
</svg>`);

const textSvg = (w, h, title, tag, titlePx, tagPx) => Buffer.from(`
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(16,18,35,0)"/>
      <stop offset="0.55" stop-color="rgba(16,18,35,0.55)"/>
      <stop offset="1" stop-color="rgba(16,18,35,0.92)"/>
    </linearGradient>
    <linearGradient id="hot" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff5a5f"/><stop offset="1" stop-color="#ffb03a"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#fade)"/>
  <text x="50%" y="${h - tagPx * 2.1}" text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${titlePx}"
    fill="#ffffff" stroke="#101223" stroke-width="${Math.max(2, titlePx / 22)}" paint-order="stroke"
    letter-spacing="1">Spot<tspan dx="0.28em" fill="url(#hot)">Hunt</tspan></text>
  <text x="50%" y="${h - tagPx * 0.8}" text-anchor="middle"
    font-family="Arial, sans-serif" font-weight="700" font-size="${tagPx}"
    fill="#e8eaf6">${tag}</text>
</svg>`);

async function panel(src, w, h) {
  return sharp(src).resize(w, h, { fit: 'cover', position: 'centre' }).toBuffer();
}

async function cover(w, h, file) {
  const half = Math.floor(w / 2);
  const gap = Math.max(4, Math.round(w / 320));
  const [pa, pb] = await Promise.all([panel(a, half - gap, h), panel(b, half - gap, h)]);
  const logoSize = Math.round(h * 0.30);
  const title = Math.round(h * 0.148);
  const tag = Math.round(h * 0.052);
  await sharp({ create: { width: w, height: h, channels: 4, background: '#101223' } })
    .composite([
      { input: pa, left: 0, top: 0 },
      { input: pb, left: half + gap, top: 0 },
      { input: await sharp(textSvg(w, h, 'Spot Hunt', 'Find the differences — beat the clock!', title, tag)).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(logoSvg(logoSize)).png().toBuffer(), left: Math.round(w / 2 - logoSize / 2), top: Math.round(h * 0.06) },
    ])
    .png()
    .toFile(join(OUT, file));
  console.log('made', file);
}

async function square(size, file) {
  const logoSize = Math.round(size * 0.34);
  const title = Math.round(size * 0.128);
  const tag = Math.round(size * 0.05);
  await sharp(a)
    .resize(size, size, { fit: 'cover' })
    .composite([
      { input: await sharp(textSvg(size, size, 'Spot Hunt', 'Find the differences!', title, tag)).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(logoSvg(logoSize)).png().toBuffer(), left: Math.round(size / 2 - logoSize / 2), top: Math.round(size * 0.07) },
    ])
    .png()
    .toFile(join(OUT, file));
  console.log('made', file);
}

async function portrait(w, h, file) {
  const logoSize = Math.round(w * 0.34);
  const title = Math.round(w * 0.15);
  const tag = Math.round(w * 0.052);
  await sharp(a)
    .resize(w, h, { fit: 'cover' })
    .composite([
      { input: await sharp(textSvg(w, h, 'Spot Hunt', 'Find the differences!', title, tag)).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(logoSvg(logoSize)).png().toBuffer(), left: Math.round(w / 2 - logoSize / 2), top: Math.round(h * 0.07) },
    ])
    .png()
    .toFile(join(OUT, file));
  console.log('made', file);
}

await cover(1920, 1080, 'cover-1920x1080.png');
await cover(1280, 720, 'cover-1280x720.png');
await cover(512, 384, 'cover-512x384.png');
await square(512, 'cover-512x512.png');
await square(800, 'cover-800x800.png');
await portrait(800, 1200, 'cover-800x1200.png');
console.log('covers ->', OUT);
