// Sellable PDF pack generator v2 (TPT/Etsy) — benchmarked on top-seller teardowns
// (CreativeCOTA 42pg OT model, Allison Fors SLP structure, Etsy senior large-print).
// Every puzzle ships 4 ways (color / B&W / answer key / large-print) and every pack
// carries the boilerplate top sellers include: cover, contents, how-to, TOU, credits,
// data/record sheet, feedback-CTA back page.
// Output goes OUTSIDE the public repo: AutoIncome_2026/상품_팩/<slug>/
// Usage: node make-packs.mjs [slug]   (no arg = all packs)
import sharp from 'sharp';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { PACKS, SITE, BRAND, PLAY_URL } from './packs-config.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const LIB = join(ROOT, 'library/img');
const OUT_BASE = resolve(ROOT, '../상품_팩');
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'library/manifest.json'), 'utf8'));
const NUMS = JSON.parse(readFileSync(join(ROOT, 'library/pin-numbers.json'), 'utf8'));
const byNum = {};
for (const e of MANIFEST) byNum[NUMS[e.id]] = e;

// ---- B&W safety: pairs whose differences are color-only VANISH in grayscale,
// breaking the B&W puzzle vs. its (color) answer key. bw-check.mjs precomputes
// which pairs are safe; paid packs must contain ONLY bw-safe pairs. ----
const BW_PATH = join(ROOT, 'library/bw-safe.json');
const BW_UNSAFE = new Set(existsSync(BW_PATH) ? JSON.parse(readFileSync(BW_PATH, 'utf8')).unsafe : []);

// ---- IP-risk blocklist: NEVER include in paid products ----
const BLOCKED = new Set(
  [[151, 165], [166, 204], [211, 214], [226, 232], [235, 236], [244, 245], [258, 266], [276, 291]]
    .flatMap(([a, b]) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; })
);


// US Letter
const PW = 612, PH = 792, M = 40;
const INK = rgb(0.12, 0.13, 0.17), GRAY = rgb(0.42, 0.44, 0.5), RED = rgb(0.86, 0.15, 0.18);
const TEAL = rgb(0.06, 0.46, 0.43), ACCENT = rgb(0.34, 0.13, 0.55);

// image buffer cache (color + grayscale)
const cache = new Map();
async function img(id, side, bw = false) {
  const key = id + side + (bw ? 'g' : 'c');
  if (!cache.has(key)) {
    let p = sharp(join(LIB, `${id}_${side}.webp`));
    if (bw) p = p.grayscale().linear(1.05, -6); // slightly punchier contrast for print
    cache.set(key, await p.jpeg({ quality: 90 }).toBuffer());
  }
  return cache.get(key);
}

function makeText(pdf, fonts) {
  const { bold, reg } = fonts;
  const center = (pg, t, f, s, y, c = INK) => pg.drawText(t, { x: (PW - f.widthOfTextAtSize(t, s)) / 2, y, size: s, font: f, color: c });
  const left = (pg, t, x, y, s, f = reg, c = INK) => pg.drawText(t, { x, y, size: s, font: f, color: c });
  const para = (pg, lines, x, y, s = 12, lead = 20, f = reg, c = INK) => { let yy = y; for (const ln of lines) { if (ln !== '') pg.drawText(ln, { x, y: yy, size: s, font: f, color: c }); yy -= lead; } return yy; };
  return { center, left, para };
}

// ---------- boilerplate page builders ----------
function coverPage(pdf, T, fonts, pack, imgs) {
  const p = pdf.addPage([PW, PH]);
  T.center(p, pack.title.toUpperCase(), fonts.bold, 30, PH - 130);
  T.center(p, pack.subtitle, fonts.reg, 13, PH - 158, GRAY);
  const cw = 156, g = 14, x0 = (PW - 3 * cw - 2 * g) / 2;
  imgs.forEach((im, i) => p.drawImage(im, { x: x0 + i * (cw + g), y: PH - 380, width: cw, height: cw }));
  T.center(p, `${pack.nums.length} puzzles  ·  full answer keys  ·  print at home`, fonts.bold, 13, PH - 420);
  const bullets = {
    ot: 'Builds visual discrimination, scanning & attention to detail',
    slp: 'Barrier games for describing, prepositions & language',
    senior: 'Large print · high contrast · one picture per page',
    kids: 'Screen-free fun · answer keys included',
    adult: 'Genuinely challenging photo-style brain games',
  }[pack.niche];
  T.center(p, bullets, fonts.reg, 12, PH - 444, GRAY);
  T.center(p, pack.mono ? 'Authentic vintage black & white photographs' : 'Color + Black & White versions of every puzzle inside', fonts.reg, 11, PH - 466, GRAY);
  T.center(p, BRAND, fonts.bold, 12, 96, TEAL);
  T.center(p, 'Illustrations AI-assisted, every puzzle hand-verified by a human.', fonts.reg, 8.5, 74, GRAY);
  T.center(p, 'Personal & single-classroom use — see Terms of Use inside.', fonts.reg, 8.5, 60, GRAY);
}

function contentsPage(pdf, T, fonts, pack) {
  const p = pdf.addPage([PW, PH]);
  T.center(p, "WHAT'S INCLUDED", fonts.bold, 24, PH - 100);
  const n = pack.nums.length;
  const rows = pack.mono ? [
    `${n} vintage black & white photo puzzles`,
    `${n} answer keys — every difference circled`,
    'Large print: one full-size picture per page',
  ] : [
    `${n} spot-the-difference puzzle scenes (color)`,
    `${n} black & white / ink-saver versions of every scene`,
    `${n} answer keys — every difference circled`,
    pack.largePrint ? 'Large print: one full-size picture per page' : 'Difficulty ranges from easy (3-4) to hard (7+) differences',
  ];
  if (pack.niche === 'ot') rows.push('Teacher / therapist how-to-use guide', 'Find-and-record score sheet');
  if (pack.niche === 'slp') rows.push('Barrier-game setup guide', 'Target-concept prompt index (by language goal)', 'Vocabulary word list per scene', 'Data-collection / progress sheet');
  if (pack.niche === 'senior') rows.push('Caregiver how-to-use & adaptation notes', 'Printable game tokens & markers');
  rows.push('Terms of Use & credits');
  let y = PH - 160;
  for (const r of rows) { T.left(p, '•', M + 12, y, 14, fonts.bold, TEAL); T.left(p, r, M + 34, y, 13); y -= 26; }
  T.center(p, `Print on US Letter or A4  ·  ${BRAND}`, fonts.reg, 10, 60, GRAY);
}

function howToPage(pdf, T, fonts, pack) {
  const p = pdf.addPage([PW, PH]);
  const map = {
    ot: {
      h: 'How to Use These Puzzles',
      lines: [
        'Spot-the-difference puzzles build the visual-perceptual skills behind',
        'reading and handwriting: visual discrimination, figure-ground, visual',
        'memory, and systematic scanning.',
        '',
        'Use them in:',
        '   •  OT sessions (warm-up or main visual-perception task)',
        '   •  Small groups and classroom centers',
        '   •  Morning work and early-finisher folders',
        '   •  Home programs (send a few home each week)',
        '',
        'To GRADE THE DIFFICULTY: cover part of the answer key and ask the',
        'student to find only 3, then 5, then all of the differences. Watch HOW',
        'they scan (left-to-right vs. random) — the strategy is the skill.',
        '',
        'Every scene comes in color and black & white — the B&W version also',
        'works as a coloring page once all the differences are found.',
      ],
    },
    slp: {
      h: 'How to Run a Barrier Game',
      lines: [
        '1. Print the pair: give Picture A to one player, Picture B to the other.',
        '   Stand a folder or easel upright between them — that is the barrier.',
        '2. Players take turns describing one spot in their picture:',
        '     "In my picture, the snowman has a RED scarf. What about yours?"',
        '3. When the descriptions do not match, a difference is found — both',
        '   players circle it. No peeking; language does all the work.',
        '4. Count down to the win, then have the student retell every',
        '   difference (a built-in second rep of the target structures).',
        '',
        'Also works: cooperatively against a timer, or as classic side-by-side',
        'spot-the-difference for younger clients not ready for the barrier.',
        '',
        'Use the Target-Concept Index (next pages) so you never have to invent',
        'prompts. Answer keys at the back are for the adult only!',
      ],
    },
    senior: {
      h: 'How to Use & Adapt',
      lines: [
        'These large-print puzzles are designed to be easy on the eyes and',
        'satisfying to finish — one clear picture per page, high contrast.',
        '',
        'Facilitating:',
        '   •  1:1 — sit beside and point to a region to guide the search',
        '   •  Small group — one puzzle on a table, take turns finding',
        '   •  Independent — hand a sheet plus the answer key to self-check',
        '',
        'To make it EASIER: name how many differences are in the picture, or',
        'point to the half of the page where the next one is.',
        'To make it HARDER: use a timer, or ask for all of them with no hints.',
        '',
        'Print on US Letter or A4. Every puzzle has a color and a black & white',
        'version — the B&W version is gentler on the eyes and on your ink.',
      ],
    },
    kids: { h: 'How to Use These Puzzles', lines: ['Print a page, find every difference, circle it, check the answer key.', '', 'Great for quiet time, road trips, rainy days and family game night —', 'print two copies of the same page and race! Every scene comes in color', 'and black & white (a coloring page once the puzzle is solved).'] },
    adult: { h: 'How to Use These Puzzles', lines: ['Find every difference and circle it; check yourself with the answer key.', '', 'A five-minute visual workout — sharper than doomscrolling. Every scene', 'comes in color and a print-friendly black & white version.'] },
  };
  const cfg = map[pack.niche];
  T.center(p, cfg.h, fonts.bold, 22, PH - 90);
  T.para(p, cfg.lines, M + 8, PH - 140, 12, 21);
  T.center(p, BRAND, fonts.reg, 9, 46, GRAY);
}

function conceptIndexPages(pdf, T, fonts) {
  const groups = [
    ['Vocabulary / naming', 'Name every object you can see. Find the one that changed and name it.'],
    ['Adjectives (color, size, shape)', 'Describe it: "The big RED kite." Compare: "Mine is bigger / darker / rounder."'],
    ['Spatial concepts (prepositions)', 'Where is it? on / in / under / above / below / next to / between / behind.'],
    ['Describing & attributes', 'Tell your partner about a spot without pointing — enough detail to find it.'],
    ['Asking & answering questions', '"Does your picture have…?" "Is the door open or closed?" "How many…?"'],
    ['Comparing & contrasting', '"Mine has more / fewer." "Yours is missing the…" "Both pictures have…"'],
    ['Multi-step & sequential directions', '"First look at the roof, then the window, then tell me what is different."'],
    ['Categorization', 'Group the differences: which are animals? which are things you wear?'],
  ];
  const p1 = pdf.addPage([PW, PH]);
  T.center(p1, 'TARGET-CONCEPT INDEX', fonts.bold, 22, PH - 90);
  T.center(p1, 'Pick a goal — ready-made prompts for every scene. (SLP page 1 of 2)', fonts.reg, 11, PH - 114, GRAY);
  let y = PH - 155;
  const draw = (pg, arr) => { for (const [g, ex] of arr) { T.left(pg, g, M + 8, y, 13, fonts.bold, ACCENT); y -= 18; T.left(pg, ex, M + 20, y, 11, fonts.reg, INK); y -= 30; } };
  draw(p1, groups.slice(0, 4));
  T.center(p1, BRAND, fonts.reg, 9, 46, GRAY);
  const p2 = pdf.addPage([PW, PH]);
  T.center(p2, 'TARGET-CONCEPT INDEX', fonts.bold, 22, PH - 90);
  T.center(p2, '(SLP page 2 of 2)', fonts.reg, 11, PH - 114, GRAY);
  y = PH - 155; draw(p2, groups.slice(4));
  T.left(p2, 'Sample goal:', M + 8, y - 6, 12, fonts.bold);
  T.para(p2, ['"During structured barrier-game activities, [student] will produce [target] in', '8 of 10 opportunities across 3 sessions, given [level of cueing]."'], M + 8, y - 26, 11, 16);
  T.center(p2, BRAND, fonts.reg, 9, 46, GRAY);
}

function wordListPage(pdf, T, fonts, pack) {
  const p = pdf.addPage([PW, PH]);
  T.center(p, 'VOCABULARY BY SCENE', fonts.bold, 22, PH - 90);
  T.center(p, 'Pre-teach three words per scene, or use for articulation carryover.', fonts.reg, 11, PH - 114, GRAY);
  let y = PH - 155;
  for (const n of pack.nums) {
    T.left(p, `Puzzle ${n}:`, M + 8, y, 12, fonts.bold, ACCENT);
    T.left(p, '________________   ________________   ________________', M + 90, y, 12, fonts.reg, GRAY);
    y -= 26;
  }
  T.para(p, ['Tip: scan the scene for your student’s target sound, then require every', 'description to name an object with that sound — dozens of reps, disguised as a game.'], M + 8, y - 8, 10.5, 15, fonts.reg, GRAY);
  T.center(p, BRAND, fonts.reg, 9, 46, GRAY);
}

function dataSheetPage(pdf, T, fonts, pack, title, cols) {
  const p = pdf.addPage([PW, PH]);
  T.center(p, title, fonts.bold, 22, PH - 90);
  T.left(p, 'Name: ______________________', M + 8, PH - 128, 12);
  T.left(p, 'Date: ____________', PW - 200, PH - 128, 12);
  const x0 = M + 8, w = PW - 2 * (M + 8);
  const colX = [x0, x0 + 210, x0 + 210 + 130, x0 + 210 + 260];
  let y = PH - 165;
  cols.forEach((c, i) => T.left(p, c, colX[i] + 4, y, 11, fonts.bold));
  y -= 6;
  for (let r = 0; r < Math.min(pack.nums.length, 16); r++) {
    p.drawLine({ start: { x: x0, y }, end: { x: x0 + w, y }, thickness: 0.7, color: rgb(0.8, 0.8, 0.82) });
    y -= 24;
    T.left(p, `Puzzle ${pack.nums[r]}`, colX[0] + 4, y + 7, 11, fonts.reg);
  }
  p.drawLine({ start: { x: x0, y }, end: { x: x0 + w, y }, thickness: 0.7, color: rgb(0.8, 0.8, 0.82) });
  T.center(p, `${BRAND}  ·  made to be reused — photocopy as needed`, fonts.reg, 9, 46, GRAY);
}

function tokensPage(pdf, T, fonts) {
  const p = pdf.addPage([PW, PH]);
  T.center(p, 'PRINTABLE MARKERS', fonts.bold, 22, PH - 90);
  T.center(p, 'Print on card, cut out, and use to mark each difference you find.', fonts.reg, 11, PH - 114, GRAY);
  const cols = 5, rows = 6, cell = 84, gx = (PW - cols * cell) / 2;
  let y = PH - 160;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gx + c * cell + cell / 2;
      p.drawCircle({ x, y: y - cell / 2, size: 30, borderColor: RED, borderWidth: 2 });
      p.drawText(String(r * cols + c + 1), { x: x - 6, y: y - cell / 2 - 7, size: 18, font: fonts.bold, color: RED });
    }
    y -= cell;
  }
  T.center(p, BRAND, fonts.reg, 9, 40, GRAY);
}

function touPage(pdf, T, fonts) {
  const p = pdf.addPage([PW, PH]);
  T.center(p, 'TERMS OF USE', fonts.bold, 22, PH - 100);
  T.para(p, [
    'Thank you for your purchase! This resource is licensed for use by a single',
    'teacher, therapist, or household.',
    '',
    'YOU MAY:',
    '   •  Use these pages with your own students, clients, or family',
    '   •  Print as many copies as you need for that single classroom / caseload',
    '   •  Save a copy to your own password-protected device',
    '',
    'YOU MAY NOT:',
    '   •  Resell, share, sublicense, or redistribute the files or pages',
    '   •  Post them publicly online or on shared drives',
    '   •  Claim them as your own work',
    '',
    'Additional licenses for a team, department, or facility are available at a',
    'discount — please get in touch. Copyright ' + BRAND + '. All rights reserved.',
  ], M + 8, PH - 150, 12, 21);
  T.center(p, BRAND, fonts.reg, 9, 46, GRAY);
}

async function digitalPage(pdf, T, fonts, pack) {
  const p = pdf.addPage([PW, PH]);
  T.center(p, 'BONUS — Play This Pack Online', fonts.bold, 23, PH - 100);
  T.center(p, 'No printer? Play the whole pack on any iPad, tablet, or computer.', fonts.reg, 12, PH - 126, GRAY);
  const url = PLAY_URL + '?c=' + encodeURIComponent(pack.code);
  const qrPng = await QRCode.toBuffer(url, { margin: 1, width: 440, color: { dark: '#20242c', light: '#ffffff' } });
  const qr = await pdf.embedPng(qrPng);
  const qs = 196; p.drawImage(qr, { x: (PW - qs) / 2, y: PH - 360, width: qs, height: qs });
  T.center(p, 'YOUR CODE', fonts.reg, 11, PH - 388, GRAY);
  T.center(p, pack.code, fonts.bold, 32, PH - 426, ACCENT);
  const mode = pack.playMode === 'timer' ? 'beat the clock and see your results at the end' : 'find them at your own pace — no timer, no pressure';
  T.para(p, [
    '1.  On a tablet: open the camera and scan the QR code above.',
    '2.  On a computer: go to  spothuntstudio.com/play',
    '3.  Enter your code, then ' + mode + '.',
  ], M + 46, PH - 486, 12.5, 26);
  T.center(p, 'This code unlocks only your pack. Keep this page — it is part of your purchase.', fonts.reg, 10, 130, GRAY);
  T.center(p, BRAND, fonts.reg, 9, 58, GRAY);
}

function creditsBackPage(pdf, T, fonts, pack) {
  const p = pdf.addPage([PW, PH]);
  T.center(p, 'Thank you!', fonts.bold, 24, PH - 130);
  const audience = {
    ot: 'Perfect for OT, special education, classroom teachers, and home programs.',
    slp: 'Great for SLPs, SPED, ESL, teletherapy, and adult / aphasia rehab.',
    senior: 'For senior centers, memory care, home caregivers — and all ages.',
    kids: 'For parents, teachers, road trips, and rainy days.',
    adult: 'For puzzle lovers, waiting rooms, and coffee breaks.',
  }[pack.niche];
  T.center(p, audience, fonts.reg, 12, PH - 165, GRAY);
  T.center(p, 'Leave feedback to earn TpT credits toward future purchases —', fonts.reg, 12, PH - 205, INK);
  T.center(p, 'and follow the store for new themed packs every month.', fonts.reg, 12, PH - 225, INK);
  T.center(p, 'Prefer a screen? Play this pack online with your code:', fonts.reg, 12, PH - 275, GRAY);
  T.center(p, 'spothuntstudio.com/play  ·  code ' + pack.code, fonts.bold, 13, PH - 297, TEAL);
  T.para(p, ['Credits: Illustrations generated with AI assistance and hand-verified for quality by', 'the ' + BRAND + ' team. Fonts: Helvetica (standard). No third-party clip art used.'], M + 8, 120, 9.5, 14, fonts.reg, GRAY);
  T.center(p, '© ' + BRAND + '  ·  single-classroom / personal use only', fonts.reg, 9, 60, GRAY);
}

// ---------- puzzle & answer pages ----------
async function puzzlePages(pdf, T, fonts, pack, bw) {
  for (const n of pack.nums) {
    const e = byNum[n];
    if (pack.largePrint) {
      for (const [side, tag] of [['a', 'A'], ['b', 'B']]) {
        const p = pdf.addPage([PW, PH]);
        T.center(p, `Puzzle ${n}  ·  Picture ${tag}  ·  find ${e.count} differences${bw ? '  (B&W)' : ''}`, fonts.bold, 14, PH - 50);
        const S = PW - 2 * M;
        p.drawImage(await pdf.embedJpg(await img(e.id, side, bw)), { x: M, y: PH - 74 - S, width: S, height: S });
        T.center(p, BRAND, fonts.reg, 9, 40, GRAY);
      }
    } else {
      const p = pdf.addPage([PW, PH]);
      T.center(p, `Puzzle ${n}  ·  find ${e.count} differences${bw ? '  (B&W — color it in!)' : ''}`, fonts.bold, 15, PH - 48);
      const S = 336, x = (PW - S) / 2;
      p.drawImage(await pdf.embedJpg(await img(e.id, 'a', bw)), { x, y: PH - 70 - S, width: S, height: S });
      p.drawImage(await pdf.embedJpg(await img(e.id, 'b', bw)), { x, y: PH - 70 - S - 10 - S, width: S, height: S });
      T.center(p, BRAND, fonts.reg, 9, 22, GRAY);
    }
  }
}

async function answerPages(pdf, T, fonts, pack) {
  const title = pdf.addPage([PW, PH]);
  T.center(title, 'ANSWER KEYS', fonts.bold, 26, PH / 2 + 20);
  T.center(title, 'Differences are circled on picture B. (For the adult only!)', fonts.reg, 12, PH / 2 - 10, GRAY);
  for (let i = 0; i < pack.nums.length; i += 2) {
    const p = pdf.addPage([PW, PH]);
    for (let k = 0; k < 2 && i + k < pack.nums.length; k++) {
      const n = pack.nums[i + k], e = byNum[n];
      const S = 300, x = (PW - S) / 2, yTop = k === 0 ? PH - 58 : PH - 58 - S - 66;
      T.left(p, `Puzzle ${n} — ${e.count} differences`, x, yTop + 6, 12, fonts.bold);
      p.drawImage(await pdf.embedJpg(await img(e.id, 'b')), { x, y: yTop - S, width: S, height: S });
      for (const r of e.regions) {
        p.drawEllipse({ x: x + r.x / 100 * S, y: yTop - S + (S - r.y / 100 * S), xScale: Math.max(r.radius, 4) / 100 * S * 1.15, yScale: Math.max(r.radius, 4) / 100 * S * 1.15, borderColor: RED, borderWidth: 2.5 });
      }
    }
  }
}

// ---------- assemble one pack ----------
async function buildPdf(pack) {
  for (const n of pack.nums) {
    if (BLOCKED.has(n)) throw new Error(`BLOCKED pair #${n} in ${pack.slug} — IP risk`);
    if (BW_UNSAFE.has(n)) throw new Error(`bw-unsafe pair #${n} in ${pack.slug} — color-only difference vanishes in B&W; swap it (see bw-check.mjs)`);
    if (!byNum[n]) throw new Error(`unknown puzzle #${n}`);
  }
  const pdf = await PDFDocument.create();
  const fonts = { bold: await pdf.embedFont(StandardFonts.HelveticaBold), reg: await pdf.embedFont(StandardFonts.Helvetica) };
  const T = makeText(pdf, fonts);
  const covImgs = await Promise.all(pack.nums.slice(0, 3).map(async n => pdf.embedJpg(await img(byNum[n].id, 'a'))));

  coverPage(pdf, T, fonts, pack, covImgs);
  contentsPage(pdf, T, fonts, pack);
  await digitalPage(pdf, T, fonts, pack);                  // BONUS online-play page (QR + code)
  if (pack.niche === 'slp') touPage(pdf, T, fonts);       // SLP puts TOU right after cover-area
  howToPage(pdf, T, fonts, pack);
  if (pack.niche === 'slp') conceptIndexPages(pdf, T, fonts);

  await puzzlePages(pdf, T, fonts, pack, false);          // color
  if (!pack.mono) await puzzlePages(pdf, T, fonts, pack, true);  // B&W duplicate (skip for already-B&W mono packs)

  if (pack.niche === 'slp') wordListPage(pdf, T, fonts, pack);
  if (pack.niche === 'ot') dataSheetPage(pdf, T, fonts, pack, 'FIND & RECORD SHEET', ['Puzzle', 'Found', 'Time', 'Notes']);
  if (pack.niche === 'slp') dataSheetPage(pdf, T, fonts, pack, 'DATA COLLECTION', ['Puzzle', 'Accuracy', 'Cueing', 'Notes']);
  if (pack.niche === 'senior') tokensPage(pdf, T, fonts);

  await answerPages(pdf, T, fonts, pack);

  if (pack.niche !== 'slp') touPage(pdf, T, fonts);
  creditsBackPage(pdf, T, fonts, pack);
  return { bytes: await pdf.save(), pages: pdf.getPageCount() };
}

// ---------- listing preview images ----------
async function buildPreviews(pack, outDir) {
  const W = 2000, H = 1600, esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const first = byNum[pack.nums[0]];

  // preview 1: hero grid
  const xs = [95, 555, 1015, 1475];
  const thumbs = await Promise.all(pack.nums.slice(0, 4).map(n => sharp(join(LIB, `${byNum[n].id}_a.webp`)).resize(430, 430).toBuffer()));
  const [sa, sb] = await Promise.all(['a', 'b'].map(s => sharp(join(LIB, `${first.id}_${s}.webp`)).resize(430, 430).toBuffer()));
  const hero = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#faf6ef"/>
    <text x="50%" y="150" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="86" fill="#20242c">${esc(pack.title)}</text>
    <text x="50%" y="228" text-anchor="middle" font-family="Arial" font-weight="700" font-size="42" fill="#7c3aed">${esc(pack.subtitle)}</text>
    <text x="500" y="1055" text-anchor="end" font-family="Arial" font-weight="800" font-size="38" fill="#20242c">Every pair</text>
    <text x="500" y="1100" text-anchor="end" font-family="Arial" font-weight="800" font-size="38" fill="#20242c">verified ✓</text>
    <text x="735" y="1295" text-anchor="middle" font-family="Arial" font-weight="800" font-size="34" fill="#555b6e">A</text>
    <text x="1265" y="1295" text-anchor="middle" font-family="Arial" font-weight="800" font-size="34" fill="#555b6e">B</text>
    <rect x="120" y="1330" width="1760" height="150" rx="24" fill="#0f766e"/>
    <text x="50%" y="1392" text-anchor="middle" font-family="Arial" font-weight="800" font-size="46" fill="#ffffff">${pack.nums.length} PUZZLES · ${pack.mono ? 'VINTAGE B&amp;W' : 'COLOR + B&amp;W'} · ANSWER KEYS${pack.largePrint ? ' · LARGE PRINT' : ''}</text>
    <text x="50%" y="1448" text-anchor="middle" font-family="Arial" font-weight="700" font-size="28" fill="#d7f4ef">Printable PDF · US Letter + A4 · hand-verified puzzles</text>
  </svg>`);
  await sharp({ create: { width: W, height: H, channels: 3, background: '#faf6ef' } }).composite([
    { input: hero, left: 0, top: 0 },
    ...thumbs.map((t, i) => ({ input: t, left: xs[i], top: 330 })),
    { input: sa, left: 520, top: 820 }, { input: sb, left: 1050, top: 820 },
  ]).jpeg({ quality: 88 }).toFile(join(outDir, 'preview-1-hero.jpg'));

  // preview 2: answer-key demo
  const S2 = 900;
  const bBuf = await sharp(join(LIB, `${first.id}_b.webp`)).resize(S2, S2).toBuffer();
  const rings = first.regions.map(r => `<ellipse cx="${r.x / 100 * S2}" cy="${r.y / 100 * S2}" rx="${Math.max(r.radius, 4) / 100 * S2 * 1.15}" ry="${Math.max(r.radius, 4) / 100 * S2 * 1.15}" fill="none" stroke="#e11d2e" stroke-width="8"/>`).join('');
  await sharp({ create: { width: 1600, height: 1100, channels: 3, background: '#ffffff' } }).composite([
    { input: bBuf, left: 80, top: 100 },
    { input: Buffer.from(`<svg width="${S2}" height="${S2}" xmlns="http://www.w3.org/2000/svg">${rings}</svg>`), left: 80, top: 100 },
    { input: Buffer.from(`<svg width="1600" height="1100" xmlns="http://www.w3.org/2000/svg">
      <text x="1060" y="380" font-family="Arial Black, Arial" font-weight="900" font-size="62" fill="#20242c">Answer keys</text>
      <text x="1060" y="450" font-family="Arial" font-weight="700" font-size="38" fill="#555b6e">included for</text>
      <text x="1060" y="503" font-family="Arial" font-weight="700" font-size="38" fill="#555b6e">every puzzle</text>
      <text x="80" y="70" font-family="Arial" font-weight="800" font-size="34" fill="#0f766e">${esc(pack.title)} — what you get</text></svg>`), left: 0, top: 0 },
  ]).jpeg({ quality: 88 }).toFile(join(outDir, 'preview-2-answerkey.jpg'));

  // preview 3: B&W ink-saver
  const bwA = await sharp(join(LIB, `${first.id}_a.webp`)).grayscale().resize(760, 760).toBuffer();
  const bwB = await sharp(join(LIB, `${byNum[pack.nums[1] || pack.nums[0]].id}_a.webp`)).grayscale().resize(760, 760).toBuffer();
  await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#ffffff' } }).composite([
    { input: bwA, left: 40, top: 160 }, { input: bwB, left: 800, top: 160 },
    { input: Buffer.from(`<svg width="1600" height="1000" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="90" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="56" fill="#20242c">Color + Black &amp; White versions</text>
      <text x="50%" y="140" text-anchor="middle" font-family="Arial" font-weight="700" font-size="30" fill="#555b6e">Save ink — and the B&amp;W pages double as coloring sheets</text></svg>`), left: 0, top: 0 },
  ]).jpeg({ quality: 86 }).toFile(join(outDir, 'preview-3-bw.jpg'));

  // preview 4: structure / what's inside
  const listByNiche = {
    ot: ['Teacher / therapist how-to-use guide', 'Find & record score sheet', 'Color + B&W of every scene', 'Circled answer keys', 'Terms of Use + credits'],
    slp: ['Barrier-game setup guide', 'Target-concept prompt index', 'Vocabulary word list per scene', 'Data-collection sheet', 'Color + B&W + answer keys'],
    senior: [pack.mono ? 'Authentic vintage black & white photos' : 'Color + B&W of every scene', 'Large print — one picture per page', 'Caregiver how-to & adaptation notes', 'Printable game markers', 'Circled answer keys'],
    kids: ['Color + B&W of every scene', 'Circled answer keys', 'Print & race — family game night', 'Terms of Use + credits'],
    adult: ['Photo-style hard puzzles', 'Color + B&W of every scene', 'Circled answer keys', 'Terms of Use + credits'],
  }[pack.niche];
  const items = listByNiche.map((t, i) => `<text x="140" y="${360 + i * 130}" font-family="Arial" font-weight="800" font-size="46" fill="#20242c">✓  ${esc(t)}</text>`).join('');
  await sharp({ create: { width: 1600, height: 1100, channels: 3, background: '#faf6ef' } }).composite([
    { input: Buffer.from(`<svg width="1600" height="1100" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="180" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="70" fill="#20242c">What's inside</text>
      ${items}
      <rect x="140" y="980" width="1320" height="90" rx="18" fill="#0f766e"/>
      <text x="50%" y="1040" text-anchor="middle" font-family="Arial" font-weight="800" font-size="40" fill="#ffffff">No-prep · Print &amp; go · Hand-verified</text></svg>`), left: 0, top: 0 },
  ]).jpeg({ quality: 88 }).toFile(join(outDir, 'preview-4-structure.jpg'));
}

const only = process.argv[2];
for (const pack of PACKS) {
  if (only && pack.slug !== only) continue;
  const dir = join(OUT_BASE, pack.slug);
  mkdirSync(dir, { recursive: true });
  const { bytes, pages } = await buildPdf(pack);
  writeFileSync(join(dir, `${pack.slug}.pdf`), bytes);
  await buildPreviews(pack, dir);
  console.log(`pack: ${pack.slug} — ${pack.nums.length} puzzles, ${pages} pages, ${pack.price} -> ${dir}`);
}
console.log('done ->', OUT_BASE);
