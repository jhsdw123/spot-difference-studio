// Pinterest pins v3 — spoiler-free, instantly usable puzzles.
// Full uncropped image pair (all differences visible), no answer circles.
// Right sidebar: big "FIND N DIFFERENCES" badge + QR to the site.
// 1000x1500 (2:3 standard). Output: ../assets/pins/  Usage: node make-pins.mjs
import sharp from 'sharp';
import QRCode from 'qrcode';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const LIB = resolve(import.meta.dirname, '../library/img');
const OUT = resolve(import.meta.dirname, '../assets/pins');
mkdirSync(OUT, { recursive: true });
const MANIFEST = JSON.parse(readFileSync(resolve(import.meta.dirname, '../library/manifest.json'), 'utf8'));
const bySuffix = (s) => MANIFEST.find(e => e.id.endsWith(s));

const SITE_URL = 'https://jhsdw123.github.io/spot-difference-studio/';

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
const MARGIN = 36;
const IMG = 560, GAP = 16, IMG_TOP = 250;          // two full squares, left column
const SB_X = 616, SB_W = W - SB_X - MARGIN;        // right sidebar
const SB_CX = SB_X + SB_W / 2;

const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const chip = (x, y, label) => `
  <rect x="${x}" y="${y}" width="46" height="46" rx="10" fill="#20242c" opacity="0.82"/>
  <text x="${x + 23}" y="${y + 33}" text-anchor="middle" font-family="Arial, sans-serif"
    font-weight="800" font-size="27" fill="#ffffff">${label}</text>`;

const textLayer = (accent, line2raw, count) => {
  const line2 = xml(line2raw);
  const bCy = 470, bR = 138;                        // count badge
  const qX = SB_CX - 100, qY = 770;                 // QR box (200px QR inside)
  return Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${MARGIN + 4}" y="64" font-family="Arial, sans-serif" font-weight="800"
    font-size="28" fill="#d9433b" letter-spacing="6">FREE PRINTABLE</text>
  <text x="${MARGIN + 2}" y="150" font-family="Arial Black, Arial, sans-serif" font-weight="900"
    font-size="74" fill="#20242c">Spot the Difference</text>
  <text x="${MARGIN + 4}" y="212" font-family="Arial, sans-serif" font-weight="800"
    font-size="44" fill="${accent}">${line2}</text>

  <rect x="${MARGIN - 3}" y="${IMG_TOP - 3}" width="${IMG + 6}" height="${IMG + 6}" fill="none" stroke="#20242c" stroke-opacity="0.16" stroke-width="3" rx="10"/>
  <rect x="${MARGIN - 3}" y="${IMG_TOP + IMG + GAP - 3}" width="${IMG + 6}" height="${IMG + 6}" fill="none" stroke="#20242c" stroke-opacity="0.16" stroke-width="3" rx="10"/>
  ${chip(MARGIN + 12, IMG_TOP + 12, 'A')}
  ${chip(MARGIN + 12, IMG_TOP + IMG + GAP + 12, 'B')}

  <circle cx="${SB_CX}" cy="${bCy}" r="${bR}" fill="${accent}"/>
  <circle cx="${SB_CX}" cy="${bCy}" r="${bR - 10}" fill="none" stroke="#ffffff" stroke-width="3.5"
    stroke-dasharray="15 11" stroke-linecap="round" opacity="0.85"/>
  <text x="${SB_CX}" y="${bCy - 74}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="28" fill="#ffffff" letter-spacing="4" opacity="0.95">FIND</text>
  <text x="${SB_CX}" y="${bCy + 52}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900"
    font-size="132" fill="#ffffff">${count}</text>
  <text x="${SB_CX}" y="${bCy + 98}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="20" fill="#ffffff" letter-spacing="1" opacity="0.95">DIFFERENCES</text>

  <rect x="${qX - 12}" y="${qY - 12}" width="224" height="224" rx="14" fill="#ffffff" stroke="#20242c" stroke-opacity="0.14" stroke-width="2.5"/>
  <text x="${SB_CX}" y="${qY + 262}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="26" fill="#20242c" letter-spacing="4">SCAN FOR MORE</text>
  <text x="${SB_CX}" y="${qY + 306}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
    font-size="27" fill="#555b6e">Print unlimited free</text>
  <text x="${SB_CX}" y="${qY + 342}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
    font-size="27" fill="#555b6e">puzzles &amp; answer keys</text>
  <text x="${SB_CX}" y="${qY + 378}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
    font-size="27" fill="#555b6e">on our website</text>

  <text x="50%" y="${H - 52}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
    font-size="28" fill="#555b6e">More themes, large-print PDFs &amp; answer keys — always free</text>
  <text x="50%" y="${H - 14}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="32" fill="#0f766e">Spot the Difference Studio</text>
</svg>`);
};

const qrSvg = await QRCode.toString(SITE_URL, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#20242c', light: '#ffffff' } });
const qr = await sharp(Buffer.from(qrSvg)).resize(200, 200).png().toBuffer();

for (const pin of PINS) {
  const entry = bySuffix(pin.pair);
  if (!entry) { console.error('pair not found:', pin.pair); continue; }
  const count = entry.regions.length;
  const [pa, pb] = await Promise.all(['a', 'b'].map(s =>
    sharp(join(LIB, `${entry.id}_${s}.webp`)).resize(IMG, IMG, { fit: 'cover' }).toBuffer()));
  await sharp({ create: { width: W, height: H, channels: 3, background: '#faf6ef' } })
    .composite([
      { input: pa, left: MARGIN, top: IMG_TOP },
      { input: pb, left: MARGIN, top: IMG_TOP + IMG + GAP },
      { input: await sharp(textLayer(pin.accent, pin.line2, count)).png().toBuffer(), left: 0, top: 0 },
      { input: qr, left: Math.round(SB_CX - 100), top: 770 },
    ])
    .png()
    .toFile(join(OUT, pin.file));
  console.log('made', pin.file, `(${entry.id}, ${count} differences)`);
}
console.log('pins ->', OUT);
