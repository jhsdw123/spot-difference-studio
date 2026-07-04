// Portal submission covers for Spot Hunt — composed from a real cartoon puzzle
// pair (A|B side by side, like the game) + logo/wordmark overlay.
// Output: ../../spot-hunt-game/tools/dist/assets/
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const LIB = resolve(import.meta.dirname, '../library/img');
const OUT = resolve(import.meta.dirname, '../../spot-hunt-game/tools/dist/assets');
mkdirSync(OUT, { recursive: true });

// default pair: playground scene with hand-verified answer regions
const PAIR_ID = process.argv[2] || 'sd_mr5yp7jv_3avx';
const a = join(LIB, `${PAIR_ID}_a.webp`);
const b = join(LIB, `${PAIR_ID}_b.webp`);
const MANIFEST = JSON.parse(readFileSync(resolve(import.meta.dirname, '../library/manifest.json'), 'utf8'));
const REGIONS = MANIFEST.find(e => e.id === PAIR_ID)?.regions || [];

// answer highlights: white underlay ring + red dashed ring, hand-drawn feel.
// Region %-coords are projected through the panel's cover-fit crop; only fully
// visible answers are circled, up to three well-spread ones.
function circleLayer(panelW, panelH, panelLeft, panelTop, pos = 'centre') {
  const S = Math.max(panelW, panelH); // square source, cover fit
  const dx = (panelW - S) / 2;
  const dy = pos === 'top' ? 0 : (panelH - S) / 2;
  const cand = REGIONS.map(r => ({
    x: r.x / 100 * S + dx,
    y: r.y / 100 * S + dy,
    r: Math.min(Math.max(r.radius, 5) / 100 * S * 1.2, panelH * 0.34),
  })).filter(p =>
    p.x > p.r * 0.85 && p.x < panelW - p.r * 0.85 &&
    p.y > p.r * 0.85 && p.y < panelH - p.r * 0.85)
    .sort((p, q) => p.x - q.x);
  const pts = cand.length <= 3 ? cand : [cand[0], cand[cand.length >> 1], cand[cand.length - 1]];
  const rings = pts.map(p => `
    <ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${p.r.toFixed(1)}" ry="${(p.r * 0.9).toFixed(1)}"
      fill="none" stroke="#ffffff" stroke-width="${(p.r * 0.24).toFixed(1)}" opacity="0.5"/>
    <ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${p.r.toFixed(1)}" ry="${(p.r * 0.9).toFixed(1)}"
      fill="none" stroke="#ff2f45" stroke-width="${(p.r * 0.14).toFixed(1)}"
      stroke-dasharray="${(p.r * 0.6).toFixed(1)} ${(p.r * 0.32).toFixed(1)}" stroke-linecap="round"
      transform="rotate(-10 ${p.x.toFixed(1)} ${p.y.toFixed(1)})"/>`).join('');
  return sharp(Buffer.from(`<svg width="${panelW}" height="${panelH}" xmlns="http://www.w3.org/2000/svg">${rings}</svg>`))
    .png().toBuffer().then(input => ({ input, left: panelLeft, top: panelTop }));
}

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

async function panel(src, w, h, pos = 'centre') {
  return sharp(src).resize(w, h, { fit: 'cover', position: pos }).toBuffer();
}

// dueling mascot mice (from tools/assets-src, prepped by prep-mice.mjs)
const MICE = resolve(import.meta.dirname, 'assets-src');

async function mouse(side, height) {
  const buf = await sharp(join(MICE, `mouse-${side}.png`)).resize({ height }).png().toBuffer();
  const meta = await sharp(buf).metadata();
  const { data: px, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  for (let p = 0; p < info.width * info.height; p++) {
    px[p * 4] = 8; px[p * 4 + 1] = 9; px[p * 4 + 2] = 20;
    px[p * 4 + 3] = Math.round(px[p * 4 + 3] * 0.45);
  }
  const shadow = await sharp(px, { raw: info }).blur(7).png().toBuffer();
  return { buf, shadow, w: meta.width, h: meta.height };
}

// left mouse peers in from the bottom-left, right mouse from the bottom-right
async function miceLayers(w, h, mouseH, bottomY) {
  const [L, R] = await Promise.all([mouse('left', mouseH), mouse('right', mouseH)]);
  const pad = Math.round(w * 0.004);
  return [
    { input: L.shadow, left: pad + 10, top: bottomY - L.h + 14 },
    { input: L.buf, left: pad, top: bottomY - L.h },
    { input: R.shadow, left: w - R.w - pad + 10, top: bottomY - R.h + 14 },
    { input: R.buf, left: w - R.w - pad, top: bottomY - R.h },
  ];
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
      await circleLayer(half - gap, h, 0, 0),
      await circleLayer(half - gap, h, half + gap, 0),
      { input: await sharp(textSvg(w, h, 'Spot Hunt', 'Find the differences — beat the clock!', title, tag)).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(logoSvg(logoSize)).png().toBuffer(), left: Math.round(w / 2 - logoSize / 2), top: Math.round(h * 0.06) },
      ...await miceLayers(w, h, Math.round(h * 0.42), h - Math.round(h * 0.035)),
    ])
    .png()
    .toFile(join(OUT, file));
  console.log('made', file);
}

// square + portrait: A on top, B below — instantly reads as spot-the-difference
async function stacked(w, h, file, { title, tag, mouseH, mouseBottom }) {
  const gap = Math.max(4, Math.round(h / 160));
  const panelH = Math.floor((h - gap) / 2);
  // top-anchored crop keeps the answer-dense upper half of the scene visible
  const [pa, pb] = await Promise.all([panel(a, w, panelH, 'top'), panel(b, w, panelH, 'top')]);
  await sharp({ create: { width: w, height: h, channels: 4, background: '#101223' } })
    .composite([
      { input: pa, left: 0, top: 0 },
      { input: pb, left: 0, top: panelH + gap },
      await circleLayer(w, panelH, 0, 0, 'top'),
      await circleLayer(w, panelH, 0, panelH + gap, 'top'),
      { input: await sharp(textSvg(w, h, 'Spot Hunt', 'Find the differences!', title, tag)).png().toBuffer(), left: 0, top: 0 },
      ...await miceLayers(w, h, mouseH, mouseBottom),
    ])
    .png()
    .toFile(join(OUT, file));
  console.log('made', file);
}

async function square(size, file) {
  await stacked(size, size, file, {
    title: Math.round(size * 0.088),
    tag: Math.round(size * 0.04),
    mouseH: Math.round(size * 0.24),
    mouseBottom: size - Math.round(size * 0.012),
  });
}

async function portrait(w, h, file) {
  await stacked(w, h, file, {
    title: Math.round(w * 0.092),
    tag: Math.round(w * 0.042),
    mouseH: Math.round(h * 0.17),
    mouseBottom: h - Math.round(h * 0.01),
  });
}

await cover(1920, 1080, 'cover-1920x1080.png');
await cover(1280, 720, 'cover-1280x720.png');
await cover(512, 384, 'cover-512x384.png');
await square(512, 'cover-512x512.png');
await square(800, 'cover-800x800.png');
await portrait(800, 1200, 'cover-800x1200.png');
console.log('covers ->', OUT);
