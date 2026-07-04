// Pinterest pins v2 — audience-targeted, built from hand-verified AI cartoon
// pairs with the A/B + red-circle design language. 1000x1500 (2:3 standard).
// Output: ../assets/pins/  Usage: node make-pins.mjs
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const LIB = resolve(import.meta.dirname, '../library/img');
const OUT = resolve(import.meta.dirname, '../assets/pins');
mkdirSync(OUT, { recursive: true });
const MANIFEST = JSON.parse(readFileSync(resolve(import.meta.dirname, '../library/manifest.json'), 'utf8'));
const bySuffix = (s) => MANIFEST.find(e => e.id.endsWith(s));

const PINS = [
  { file: 'pin-seniors.png', pair: 'tc_tz3u', accent: '#7c3aed', line2: 'for Seniors & Memory Care' },
  { file: 'pin-kids.png', pair: 'jv_3avx', accent: '#dd5514', line2: 'for Kids — Screen-Free Fun' },
  { file: 'pin-classroom.png', pair: 't0_jkie', accent: '#0e7490', line2: 'Classroom & ESL Activity' },
  { file: 'pin-roadtrip.png', pair: 'ki_dfq6', accent: '#15803d', line2: 'Road Trip Boredom Busters' },
  { file: 'pin-largeprint.png', pair: 'ru_loz3', accent: '#a16207', line2: 'Large Print Edition' },
  { file: 'pin-free.png', pair: 'kb_x8d2', accent: '#0369a1', line2: 'Print Unlimited — 100% Free' },
  { file: 'pin-winter.png', pair: 'ky_1fbz', accent: '#b91c1c', line2: 'Winter Edition' },
];

const W = 1000, H = 1500;
const MARGIN = 36, HEADER = 250, FOOTER = 132, GAP = 14;
const PANEL_W = W - MARGIN * 2;
const PANEL_H = Math.floor((H - HEADER - FOOTER - GAP - MARGIN) / 2);

function visiblePts(regions, pw, ph, pos) {
  const S = Math.max(pw, ph); // square source, cover fit
  const dx = (pw - S) / 2;
  const dy = pos === 'top' ? 0 : pos === 'bottom' ? ph - S : (ph - S) / 2;
  return regions.map(r => ({
    x: r.x / 100 * S + dx,
    y: r.y / 100 * S + dy,
    r: Math.min(Math.max(r.radius, 5) / 100 * S * 1.2, ph * 0.34),
  })).filter(p => p.x > p.r * 0.85 && p.x < pw - p.r * 0.85 && p.y > p.r * 0.85 && p.y < ph - p.r * 0.85)
    .sort((a, b) => a.x - b.x);
}

// pick the crop anchor that keeps the most answers in frame
function bestPos(regions, pw, ph) {
  return ['top', 'centre', 'bottom']
    .map(pos => ({ pos, n: visiblePts(regions, pw, ph, pos).length }))
    .sort((a, b) => b.n - a.n)[0].pos;
}

function circlesSvg(regions, pw, ph, pos) {
  const cand = visiblePts(regions, pw, ph, pos);
  const pts = cand.length <= 3 ? cand : [cand[0], cand[cand.length >> 1], cand[cand.length - 1]];
  const rings = pts.map(p => `
    <ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${p.r.toFixed(1)}" ry="${(p.r * 0.9).toFixed(1)}"
      fill="none" stroke="#ffffff" stroke-width="${(p.r * 0.24).toFixed(1)}" opacity="0.5"/>
    <ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${p.r.toFixed(1)}" ry="${(p.r * 0.9).toFixed(1)}"
      fill="none" stroke="#e11d2e" stroke-width="${(p.r * 0.14).toFixed(1)}"
      stroke-dasharray="${(p.r * 0.6).toFixed(1)} ${(p.r * 0.32).toFixed(1)}" stroke-linecap="round"
      transform="rotate(-10 ${p.x.toFixed(1)} ${p.y.toFixed(1)})"/>`).join('');
  return Buffer.from(`<svg width="${pw}" height="${ph}" xmlns="http://www.w3.org/2000/svg">${rings}</svg>`);
}

const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const textLayer = (accent, line2raw) => {
  const line2 = xml(line2raw);
  return Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="50%" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="34" fill="#d9433b" letter-spacing="7">FREE PRINTABLE</text>
  <text x="50%" y="156" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900"
    font-size="74" fill="#20242c">Spot the Difference</text>
  <text x="50%" y="222" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="46" fill="${accent}">${line2}</text>
  <text x="50%" y="${H - 84}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
    font-size="31" fill="#20242c">Print unlimited puzzles free &#183; answer keys included</text>
  <text x="50%" y="${H - 36}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="34" fill="#0f766e">Spot the Difference Studio</text>
  <rect x="${MARGIN - 3}" y="${HEADER - 3}" width="${PANEL_W + 6}" height="${PANEL_H + 6}" fill="none" stroke="#20242c" stroke-opacity="0.16" stroke-width="3" rx="10"/>
  <rect x="${MARGIN - 3}" y="${HEADER + PANEL_H + GAP - 3}" width="${PANEL_W + 6}" height="${PANEL_H + 6}" fill="none" stroke="#20242c" stroke-opacity="0.16" stroke-width="3" rx="10"/>
</svg>`);
};

for (const pin of PINS) {
  const entry = bySuffix(pin.pair);
  if (!entry) { console.error('pair not found:', pin.pair); continue; }
  const pos = bestPos(entry.regions, PANEL_W, PANEL_H);
  const [pa, pb] = await Promise.all(['a', 'b'].map(s =>
    sharp(join(LIB, `${entry.id}_${s}.webp`)).resize(PANEL_W, PANEL_H, { fit: 'cover', position: pos }).toBuffer()));
  const circles = await sharp(circlesSvg(entry.regions, PANEL_W, PANEL_H, pos)).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: '#faf6ef' } })
    .composite([
      { input: pa, left: MARGIN, top: HEADER },
      { input: pb, left: MARGIN, top: HEADER + PANEL_H + GAP },
      { input: circles, left: MARGIN, top: HEADER },
      { input: circles, left: MARGIN, top: HEADER + PANEL_H + GAP },
      { input: await sharp(textLayer(pin.accent, pin.line2)).png().toBuffer(), left: 0, top: 0 },
    ])
    .png()
    .toFile(join(OUT, pin.file));
  console.log('made', pin.file, '(' + entry.id + ')');
}
console.log('pins ->', OUT);
