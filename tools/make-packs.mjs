// Sellable PDF pack generator (Etsy/TPT) — puzzle pages, circled answer keys,
// large-print variant, cover, back page, and listing preview images.
// Output goes OUTSIDE the public repo: AutoIncome_2026/상품_팩/<slug>/
// Usage: node make-packs.mjs [slug]   (no arg = all packs)
import sharp from 'sharp';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const LIB = join(ROOT, 'library/img');
const OUT_BASE = resolve(ROOT, '../상품_팩');
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'library/manifest.json'), 'utf8'));
const NUMS = JSON.parse(readFileSync(join(ROOT, 'library/pin-numbers.json'), 'utf8'));
const byNum = {};
for (const e of MANIFEST) byNum[NUMS[e.id]] = e;

// ---- IP-risk blocklist: NEVER include in paid products (LEGO/Minecraft/SpongeBob/Sesame/Mario-style) ----
const BLOCKED = new Set([
  ...range(151, 165), ...range(166, 204), ...range(211, 214), [226, 232], [235, 236], [244, 245], [258, 266], [276, 291],
].flatMap(x => Array.isArray(x) ? range(x[0], x[1]) : [x]));
function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }

const SITE = 'https://spothuntstudio.com/spot-difference-studio/';
const BRAND = 'Spot the Difference Studio';

const PACKS = [
  {
    slug: 'ot-visual-perception-vol1',
    title: 'Visual Perception Puzzles',
    subtitle: 'Spot the Difference — OT Activity Pack · Vol. 1',
    nums: [293, 295, 298, 300, 305, 309, 313, 316, 320, 323],
    largePrint: false,
  },
  {
    slug: 'slp-barrier-games-vol1',
    title: 'Barrier Game Picture Pairs',
    subtitle: 'Speech Therapy Describing Activities · Vol. 1',
    nums: [302, 304, 306, 307, 308, 312, 317, 319, 324, 327],
    largePrint: false,
    barrier: true,
  },
  {
    slug: 'senior-large-print-vol1',
    title: 'Large Print Spot the Difference',
    subtitle: 'Dignified Puzzles for Seniors & Memory Care · Vol. 1',
    nums: [10, 11, 12, 13, 22, 33, 34, 54, 62, 64],
    largePrint: true,
  },
  {
    slug: 'winter-kids-vol1',
    title: 'Winter Spot the Difference',
    subtitle: 'Cozy Snow-Day Puzzles for Kids · Vol. 1',
    nums: [269, 270, 271, 272, 273, 274, 275, 296, 328, 38],
    largePrint: false,
  },
  {
    slug: 'adult-photo-hard-vol1',
    title: 'Hard Spot the Difference',
    subtitle: 'Photo-Style Brain Games for Adults · Vol. 1',
    nums: [5, 6, 7, 8, 36, 40, 49, 93, 95, 112],
    largePrint: false,
  },
];

// US Letter
const PW = 612, PH = 792, M = 36;
const jpegCache = new Map();
async function jpg(id, side) {
  const key = id + side;
  if (!jpegCache.has(key)) jpegCache.set(key, await sharp(join(LIB, `${id}_${side}.webp`)).jpeg({ quality: 90 }).toBuffer());
  return jpegCache.get(key);
}

async function buildPdf(pack) {
  for (const n of pack.nums) {
    if (BLOCKED.has(n)) throw new Error(`BLOCKED pair #${n} in pack ${pack.slug} — IP risk, remove it`);
    if (!byNum[n]) throw new Error(`unknown puzzle #${n}`);
  }
  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.12, 0.13, 0.17), gray = rgb(0.45, 0.47, 0.53), red = rgb(0.88, 0.15, 0.18);
  const center = (page, text, font, size, y, color = ink) =>
    page.drawText(text, { x: (PW - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });

  // ---- cover ----
  const cover = pdf.addPage([PW, PH]);
  center(cover, pack.title.toUpperCase(), bold, 30, PH - 150);
  center(cover, pack.subtitle, reg, 14, PH - 178, gray);
  const covImgs = await Promise.all(pack.nums.slice(0, 3).map(n => jpg(byNum[n].id, 'a')));
  const cw = 158, cGap = 12, cx0 = (PW - 3 * cw - 2 * cGap) / 2;
  for (let i = 0; i < covImgs.length; i++) {
    const im = await pdf.embedJpg(covImgs[i]);
    cover.drawImage(im, { x: cx0 + i * (cw + cGap), y: PH - 400, width: cw, height: cw });
  }
  center(cover, `${pack.nums.length} puzzles  ·  full answer keys  ·  print at home`, bold, 13, PH - 440);
  center(cover, pack.largePrint ? 'Large print: one full page per picture' : 'One puzzle pair per page', reg, 11, PH - 462, gray);
  center(cover, `${BRAND}`, bold, 12, 90, rgb(0.06, 0.46, 0.43));
  center(cover, 'Illustrations AI-assisted, every puzzle hand-verified by a human. For personal & classroom use.', reg, 8.5, 70, gray);

  // ---- barrier game instructions (optional) ----
  if (pack.barrier) {
    const p = pdf.addPage([PW, PH]);
    center(p, 'How to Run a Barrier Game', bold, 20, PH - 100);
    const lines = [
      '1. Print the pair: give picture A to one player, picture B to the other.',
      '   Stand a folder upright between them - that is the barrier.',
      '2. Players take turns describing a spot in their picture:',
      '   "In my picture, the snowman has a red scarf. What about yours?"',
      '3. When descriptions do not match - a difference is found. Both circle it.',
      '4. Count down to the win, then have the child retell every difference.',
      '',
      'Language targets: attributes (color, size, number), spatial prepositions,',
      'question formation, comparatives, and vocabulary from each themed scene.',
      '',
      'The answer keys at the back of this pack are for the adult only!',
    ];
    let y = PH - 150;
    for (const line of lines) { p.drawText(line, { x: M + 20, y, size: 12, font: reg, color: ink }); y -= 22; }
  }

  // ---- puzzle pages ----
  for (const n of pack.nums) {
    const e = byNum[n];
    const [a, b] = await Promise.all([jpg(e.id, 'a'), jpg(e.id, 'b')]);
    if (pack.largePrint) {
      for (const [buf, tag] of [[a, 'A'], [b, 'B']]) {
        const p = pdf.addPage([PW, PH]);
        center(p, `Puzzle ${n}  ·  Picture ${tag}  ·  find ${e.count} differences`, bold, 15, PH - 52);
        const S = PW - 2 * M;
        p.drawImage(await pdf.embedJpg(buf), { x: M, y: PH - 80 - S, width: S, height: S });
        center(p, BRAND, reg, 9, 40, gray);
      }
    } else {
      const p = pdf.addPage([PW, PH]);
      center(p, `Puzzle ${n}  ·  find ${e.count} differences`, bold, 15, PH - 50);
      const S = 336, x = (PW - S) / 2;
      p.drawImage(await pdf.embedJpg(a), { x, y: PH - 72 - S, width: S, height: S });
      p.drawImage(await pdf.embedJpg(b), { x, y: PH - 72 - S - 10 - S, width: S, height: S });
      center(p, BRAND, reg, 9, 22, gray);
    }
  }

  // ---- answer keys (2 per page) ----
  const keyTitle = pdf.addPage([PW, PH]);
  center(keyTitle, 'ANSWER KEYS', bold, 26, PH / 2 + 20);
  center(keyTitle, 'Differences are circled on picture B.', reg, 12, PH / 2 - 10, gray);
  for (let i = 0; i < pack.nums.length; i += 2) {
    const p = pdf.addPage([PW, PH]);
    for (let k = 0; k < 2 && i + k < pack.nums.length; k++) {
      const n = pack.nums[i + k];
      const e = byNum[n];
      const S = 300, x = (PW - S) / 2, yTop = k === 0 ? PH - 60 : PH - 60 - S - 70;
      p.drawText(`Puzzle ${n} — ${e.count} differences`, { x, y: yTop + 6, size: 12, font: bold, color: ink });
      p.drawImage(await pdf.embedJpg(await jpg(e.id, 'b')), { x, y: yTop - S, width: S, height: S });
      for (const r of e.regions) {
        p.drawEllipse({
          x: x + r.x / 100 * S,
          y: yTop - S + (S - r.y / 100 * S),
          xScale: Math.max(r.radius, 4) / 100 * S * 1.15,
          yScale: Math.max(r.radius, 4) / 100 * S * 1.15,
          borderColor: red, borderWidth: 2.5,
        });
      }
    }
  }

  // ---- back page ----
  const back = pdf.addPage([PW, PH]);
  center(back, 'Thank you!', bold, 22, PH - 140);
  center(back, 'Print unlimited new puzzles free, or check answers online anytime:', reg, 12, PH - 175, gray);
  center(back, SITE.replace('https://', ''), bold, 13, PH - 198, rgb(0.06, 0.46, 0.43));
  center(back, 'Enjoyed these? Play more on the YouTube channel "Spot Hunt" - please subscribe!', reg, 11, PH - 230, gray);
  center(back, 'Personal & single-classroom use. Not for resale or redistribution.', reg, 9, 60, gray);

  return pdf.save();
}

// ---- listing preview images (2000x1600) ----
async function buildPreviews(pack, outDir) {
  const W = 2000, H = 1600;
  const thumbs = await Promise.all(pack.nums.slice(0, 4).map(n =>
    sharp(join(LIB, `${byNum[n].id}_a.webp`)).resize(430, 430).toBuffer()));
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#faf6ef"/>
  <text x="50%" y="150" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="92" fill="#20242c">${esc(pack.title)}</text>
  <text x="50%" y="230" text-anchor="middle" font-family="Arial" font-weight="700" font-size="44" fill="#7c3aed">${esc(pack.subtitle)}</text>
  <rect x="120" y="1310" width="1760" height="150" rx="24" fill="#0f766e"/>
  <text x="50%" y="1372" text-anchor="middle" font-family="Arial" font-weight="800" font-size="48" fill="#ffffff">${pack.nums.length} PUZZLES  ·  FULL ANSWER KEYS  ·  ${pack.largePrint ? 'LARGE PRINT' : 'INSTANT DOWNLOAD'}</text>
  <text x="50%" y="1430" text-anchor="middle" font-family="Arial" font-weight="700" font-size="30" fill="#d7f4ef">Printable PDF · US Letter · hand-verified puzzles</text>
</svg>`);
  const comps = [{ input: svg, left: 0, top: 0 }];
  const positions = [[145, 320], [605, 320], [1065, 320], [1525, 320]];
  // wait — 4 thumbs of 430 need x: total 4*430+3*30=1810, x0=(2000-1810)/2=95
  const xs = [95, 555, 1015, 1475];
  thumbs.forEach((t, i) => comps.push({ input: t, left: xs[i], top: 330 }));
  // sample pair strip (A/B of first puzzle) below
  const e0 = byNum[pack.nums[0]];
  const [sa, sb] = await Promise.all(['a', 'b'].map(s => sharp(join(LIB, `${e0.id}_${s}.webp`)).resize(430, 430).toBuffer()));
  comps.push({ input: sa, left: 520, top: 820 }, { input: sb, left: 1050, top: 820 });
  const vs = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <text x="500" y="1050" text-anchor="end" font-family="Arial" font-weight="800" font-size="40" fill="#20242c">Every pair</text>
    <text x="500" y="1100" text-anchor="end" font-family="Arial" font-weight="800" font-size="40" fill="#20242c">verified ✓</text>
    <text x="735" y="1295" text-anchor="middle" font-family="Arial" font-weight="800" font-size="34" fill="#555b6e">A</text>
    <text x="1265" y="1295" text-anchor="middle" font-family="Arial" font-weight="800" font-size="34" fill="#555b6e">B</text>
  </svg>`);
  comps.push({ input: vs, left: 0, top: 0 });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#faf6ef' } })
    .composite(comps).jpeg({ quality: 88 }).toFile(join(outDir, 'preview-main.jpg'));

  // preview 2: answer-key demo (B with circles) via SVG overlay
  const S2 = 900;
  const bBuf = await sharp(join(LIB, `${e0.id}_b.webp`)).resize(S2, S2).toBuffer();
  const rings = e0.regions.map(r => `<ellipse cx="${r.x / 100 * S2}" cy="${r.y / 100 * S2}" rx="${Math.max(r.radius, 4) / 100 * S2 * 1.15}" ry="${Math.max(r.radius, 4) / 100 * S2 * 1.15}" fill="none" stroke="#e11d2e" stroke-width="8"/>`).join('');
  await sharp({ create: { width: 1600, height: 1100, channels: 3, background: '#ffffff' } })
    .composite([
      { input: bBuf, left: 80, top: 100 },
      { input: Buffer.from(`<svg width="${S2}" height="${S2}" xmlns="http://www.w3.org/2000/svg">${rings}</svg>`), left: 80, top: 100 },
      { input: Buffer.from(`<svg width="1600" height="1100" xmlns="http://www.w3.org/2000/svg">
        <text x="1060" y="380" font-family="Arial Black, Arial" font-weight="900" font-size="64" fill="#20242c">Answer keys</text>
        <text x="1060" y="450" font-family="Arial" font-weight="700" font-size="40" fill="#555b6e">included for</text>
        <text x="1060" y="505" font-family="Arial" font-weight="700" font-size="40" fill="#555b6e">every puzzle</text>
        <text x="80" y="70" font-family="Arial" font-weight="800" font-size="36" fill="#0f766e">${esc(pack.title)} — what you get</text>
      </svg>`), left: 0, top: 0 },
    ]).jpeg({ quality: 88 }).toFile(join(outDir, 'preview-answerkey.jpg'));
}

const only = process.argv[2];
for (const pack of PACKS) {
  if (only && pack.slug !== only) continue;
  const dir = join(OUT_BASE, pack.slug);
  mkdirSync(dir, { recursive: true });
  const bytes = await buildPdf(pack);
  writeFileSync(join(dir, `${pack.slug}.pdf`), bytes);
  await buildPreviews(pack, dir);
  console.log(`pack: ${pack.slug} — ${pack.nums.length} puzzles -> ${dir}`);
}
console.log('done ->', OUT_BASE);
