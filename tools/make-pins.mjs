// Pinterest pins v4 — every library pair becomes an instantly-usable puzzle pin.
// - Stable puzzle numbers in library/pin-numbers.json (append-only)
// - Per-pin QR -> answers.html?p=N (online answer checker)
// - "PUZZLE No. N" + FIND-N badge on the image, edition line kept
// Usage:
//   node make-pins.mjs           -> regenerate the 7 curated audience pins (assets/pins/, committed)
//   node make-pins.mjs --all     -> generate ALL library pairs (assets/pins-all/, gitignored, skips existing)
//   node make-pins.mjs --all --force  -> regenerate all even if files exist
// Both modes rewrite ../pinterest-upload-helper-data.js for the upload helper.
import sharp from 'sharp';
import QRCode from 'qrcode';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const LIB = resolve(import.meta.dirname, '../library/img');
const OUT_CURATED = resolve(import.meta.dirname, '../assets/pins');
const OUT_ALL = resolve(import.meta.dirname, '../assets/pins-all');
const NUMBERS_PATH = resolve(import.meta.dirname, '../library/pin-numbers.json');
const HELPER_DATA = resolve(import.meta.dirname, '../../pinterest-upload-helper-data.js');
const MANIFEST = JSON.parse(readFileSync(resolve(import.meta.dirname, '../library/manifest.json'), 'utf8'));
const bySuffix = (s) => MANIFEST.find(e => e.id.endsWith(s));

const SITE = 'https://jhsdw123.github.io/spot-difference-studio/';
const ALL = process.argv.includes('--all');
const FORCE = process.argv.includes('--force');

// ---- stable puzzle numbers (append-only) ----
const numbers = existsSync(NUMBERS_PATH) ? JSON.parse(readFileSync(NUMBERS_PATH, 'utf8')) : {};
let next = Object.values(numbers).reduce((m, n) => Math.max(m, n), 0) + 1;
for (const e of MANIFEST) if (!(e.id in numbers)) numbers[e.id] = next++;
writeFileSync(NUMBERS_PATH, JSON.stringify(numbers, null, 1));

// ---- curated audience pins (hand-tuned copy lives in the helper) ----
const CURATED = [
  { file: 'pin-seniors.png', pair: 'tc_tz3u', accent: '#7c3aed', line2: 'for Seniors & Memory Care' },
  { file: 'pin-kids.png', pair: 'jv_3avx', accent: '#dd5514', line2: 'for Kids — Screen-Free Fun' },
  { file: 'pin-classroom.png', pair: 't0_jkie', accent: '#0e7490', line2: 'Classroom & ESL Activity' },
  { file: 'pin-roadtrip.png', pair: 'ki_dfq6', accent: '#15803d', line2: 'Road Trip Boredom Busters' },
  { file: 'pin-largeprint.png', pair: 'ru_loz3', accent: '#a16207', line2: 'Large Print Edition' },
  { file: 'pin-free.png', pair: 'kb_x8d2', accent: '#0369a1', line2: 'Print Unlimited — 100% Free' },
  { file: 'pin-winter.png', pair: 'ky_1fbz', accent: '#b91c1c', line2: 'Winter Edition' },
];
const curatedIds = new Set(CURATED.map(c => bySuffix(c.pair)?.id).filter(Boolean));

// ---- audience rotation for bulk pins ----
const AUD = [
  { line2: 'for Kids — Screen-Free Fun', accent: '#dd5514', board2: 'Spot the Difference for Kids',
    t: 'Spot the Difference for Kids', s: 'a fun screen-free activity that builds observation skills and concentration for kids.' },
  { line2: 'Brain Game for Adults', accent: '#0369a1', board2: 'Hard Spot the Difference Puzzles for Adults',
    t: 'Spot the Difference Brain Game for Adults', s: 'a genuinely challenging brain game for adults who enjoy attention-to-detail puzzles.' },
  { line2: 'for Seniors & Memory Care', accent: '#7c3aed', board2: 'Spot the Difference for Seniors & Memory Care',
    t: 'Spot the Difference for Seniors', s: 'a dignified, gentle cognitive activity for seniors and memory care.' },
  { line2: 'Classroom & ESL Activity', accent: '#0e7490', board2: 'Spot the Difference for Kids',
    t: 'Classroom Spot the Difference Activity', s: 'a no-prep classroom worksheet for ESL speaking practice, early finishers, and brain breaks.' },
  { line2: 'Road Trip Boredom Buster', accent: '#15803d', board2: 'Spot the Difference for Kids',
    t: 'Road Trip Spot the Difference', s: 'a back-seat boredom buster for car trips and flights — kids can self-check with the online answer key.' },
  { line2: 'Quiet Time Activity', accent: '#a16207', board2: 'Spot the Difference for Kids',
    t: 'Quiet Time Spot the Difference', s: 'a calm, independent quiet-time activity with a built-in finish line.' },
  { line2: 'Family Game Night Edition', accent: '#b91c1c', board2: 'Free Printable Spot the Difference Puzzles',
    t: 'Family Spot the Difference Game', s: 'print two copies and race — a free family game night in one sheet.' },
  { line2: 'Coffee Break Challenge', accent: '#0f766e', board2: 'Hard Spot the Difference Puzzles for Adults',
    t: 'Coffee Break Spot the Difference', s: 'a five-minute visual challenge for your coffee break — sharper than doomscrolling.' },
  { line2: 'Rainy Day Rescue Edition', accent: '#4338ca', board2: 'Spot the Difference for Kids',
    t: 'Rainy Day Spot the Difference', s: 'a rainy-day rescue for stir-crazy kids — screen-free and mess-free.' },
  { line2: 'Waiting Room Kit', accent: '#be185d', board2: 'Free Printable Spot the Difference Puzzles',
    t: 'Waiting Room Spot the Difference', s: 'the perfect waiting-room and restaurant sheet — weighs nothing, calms everything.' },
];

// ---- layout ----
const W = 1000, H = 1500;
const MARGIN = 36;
const IMG = 560, GAP = 16, IMG_TOP = 250;
const SB_X = 616, SB_W = W - SB_X - MARGIN;
const SB_CX = SB_X + SB_W / 2;

const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const chip = (x, y, label) => `
  <rect x="${x}" y="${y}" width="46" height="46" rx="10" fill="#20242c" opacity="0.82"/>
  <text x="${x + 23}" y="${y + 33}" text-anchor="middle" font-family="Arial, sans-serif"
    font-weight="800" font-size="27" fill="#ffffff">${label}</text>`;

const textLayer = (accent, line2raw, count, num) => {
  const line2 = xml(line2raw);
  const bCy = 470, bR = 138;
  const qY = 800;
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

  <text x="${SB_CX}" y="${bCy + 205}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900"
    font-size="34" fill="#20242c">PUZZLE No. ${num}</text>

  <rect x="${SB_CX - 112}" y="${qY - 12}" width="224" height="224" rx="14" fill="#ffffff" stroke="#20242c" stroke-opacity="0.14" stroke-width="2.5"/>
  <text x="${SB_CX}" y="${qY + 258}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="26" fill="#20242c" letter-spacing="3">SCAN FOR ANSWERS</text>
  <text x="${SB_CX}" y="${qY + 300}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
    font-size="26" fill="#555b6e">or enter Puzzle No. ${num}</text>
  <text x="${SB_CX}" y="${qY + 334}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
    font-size="26" fill="#555b6e">at our website — plus</text>
  <text x="${SB_CX}" y="${qY + 368}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
    font-size="26" fill="#555b6e">unlimited free puzzles</text>

  <text x="${SB_CX}" y="${qY + 436}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="23" fill="#20242c">Teachers &amp; caregivers:</text>
  <text x="${SB_CX}" y="${qY + 466}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="23" fill="#20242c">QR-free student copy</text>
  <text x="${SB_CX}" y="${qY + 496}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="23" fill="#20242c">free at the same link</text>

  <text x="50%" y="${H - 52}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700"
    font-size="28" fill="#555b6e">Answer key online &#183; print unlimited puzzles free</text>
  <text x="50%" y="${H - 14}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800"
    font-size="32" fill="#0f766e">Spot the Difference Studio</text>
</svg>`);
};

async function makePin(entry, { file, accent, line2, outDir }) {
  const num = numbers[entry.id];
  const [pa, pb] = await Promise.all(['a', 'b'].map(s =>
    sharp(join(LIB, `${entry.id}_${s}.webp`)).resize(IMG, IMG, { fit: 'cover' }).toBuffer()));
  const qrSvg = await QRCode.toString(`${SITE}answers.html?p=${num}`, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#20242c', light: '#ffffff' } });
  const qr = await sharp(Buffer.from(qrSvg)).resize(200, 200).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: '#faf6ef' } })
    .composite([
      { input: pa, left: MARGIN, top: IMG_TOP },
      { input: pb, left: MARGIN, top: IMG_TOP + IMG + GAP },
      { input: await sharp(textLayer(accent, line2, entry.count, num)).png().toBuffer(), left: 0, top: 0 },
      { input: qr, left: Math.round(SB_CX - 100), top: 800 },
    ])
    .png()
    .toFile(join(outDir, file));
  return num;
}

// ---- curated 7 ----
mkdirSync(OUT_CURATED, { recursive: true });
for (const pin of CURATED) {
  const entry = bySuffix(pin.pair);
  if (!entry) { console.error('pair not found:', pin.pair); continue; }
  const num = await makePin(entry, { ...pin, outDir: OUT_CURATED });
  console.log('curated', pin.file, `(#${num}, ${entry.count} differences)`);
}

// ---- bulk: the whole library ----
const bulk = [];
if (ALL) {
  mkdirSync(OUT_ALL, { recursive: true });
  let made = 0, skipped = 0;
  for (const entry of MANIFEST) {
    if (curatedIds.has(entry.id)) continue;
    const num = numbers[entry.id];
    const file = `pin-${String(num).padStart(3, '0')}.png`;
    const aud = AUD[(num - 1) % AUD.length];
    bulk.push({ num, file, style: entry.style, count: entry.count, aud });
    if (!FORCE && existsSync(join(OUT_ALL, file))) { skipped++; continue; }
    await makePin(entry, { file, accent: aud.accent, line2: aud.line2, outDir: OUT_ALL });
    made++;
    if (made % 25 === 0) console.log(`bulk: ${made} made...`);
  }
  console.log(`bulk done: ${made} made, ${skipped} already existed -> ${OUT_ALL}`);
} else {
  // still list bulk metadata for the helper if images were generated previously
  for (const entry of MANIFEST) {
    if (curatedIds.has(entry.id)) continue;
    const num = numbers[entry.id];
    const file = `pin-${String(num).padStart(3, '0')}.png`;
    if (existsSync(join(OUT_ALL, file))) {
      const aud = AUD[(num - 1) % AUD.length];
      bulk.push({ num, file, style: entry.style, count: entry.count, aud });
    }
  }
}

// ---- helper data file ----
const styleWord = s => s === 'toon' ? 'cartoon' : 'realistic photo-style';
const pinsAll = bulk.sort((a, b) => a.num - b.num).map(({ num, file, style, count, aud }) => ({
  num, file, style, count,
  title: `${aud.t} — Free Printable (${count} Differences)`,
  desc: `Free printable spot the difference puzzle with ${count} differences to find — ${aud.s} Download, print, and play; check answers anytime by scanning the QR code or entering Puzzle #${num} on our site. Every finished puzzle doubles as a coloring page, and you can print unlimited new ones free.`,
  alt: `Free printable spot the difference puzzle number ${num} — two ${styleWord(style)} scenes with ${count} differences to find, answer key online`,
  board2: aud.board2,
}));
writeFileSync(HELPER_DATA, '// generated by tools/make-pins.mjs — do not edit by hand\nconst PINS_ALL = ' + JSON.stringify(pinsAll, null, 1) + ';\n');
console.log(`helper data: ${pinsAll.length} bulk pins -> ${HELPER_DATA}`);
