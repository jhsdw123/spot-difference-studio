// Spot the Difference Studio — puzzle generation engine
// Deterministic: same (theme, difficulty, diffCount, seed) always yields the same puzzle.

import { THEMES } from './objects.js';

export const CANVAS_W = 1000;
export const CANVAS_H = 700;
const MARGIN = 70;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIFFICULTY = {
  easy:   { objects: 9,  size: [1.10, 1.45], mutations: ['remove', 'recolor', 'swap', 'resize'] },
  medium: { objects: 14, size: [0.90, 1.20], mutations: ['remove', 'recolor', 'swap', 'resize', 'mirror', 'rotate'] },
  hard:   { objects: 20, size: [0.72, 0.98], mutations: ['remove', 'recolor', 'swap', 'resize', 'mirror', 'rotate', 'move'] },
};

export const DIFF_DEFAULTS = { easy: 5, medium: 8, hard: 12 };

/* ---------- placement ---------- */

function placeObjects(theme, cfg, rng) {
  const types = theme.objects;
  const order = [];
  // cycle through shuffled type lists so variety is maximized before repeats
  while (order.length < cfg.objects) {
    for (const t of shuffle(types, rng)) {
      order.push(t);
      if (order.length >= cfg.objects) break;
    }
  }
  const placed = [];
  for (const type of order) {
    const s = cfg.size[0] + rng() * (cfg.size[1] - cfg.size[0]);
    const zone = theme.zones[type.zone] || Object.values(theme.zones)[0];
    const r = 52 * s;
    let ok = false, x = 0, y = 0;
    for (let attempt = 0; attempt < 30 && !ok; attempt++) {
      x = MARGIN + r * 0.4 + rng() * (CANVAS_W - 2 * MARGIN - r * 0.8);
      const y0 = zone[0] * CANVAS_H, y1 = zone[1] * CANVAS_H;
      y = y0 + rng() * (y1 - y0);
      // keep the full object (which extends 100*s upward from anchor) inside the canvas
      if (y - 100 * s < 8) continue;
      if (y > CANVAS_H - 8) continue;
      ok = placed.every(p => {
        const dx = p.x - x, dy = (p.y - 50 * p.s) - (y - 50 * s);
        return Math.hypot(dx, dy) > (52 * p.s + r) * 0.88;
      });
    }
    if (ok) placed.push({ type, x, y, s, zoneY: [zone[0] * CANVAS_H, zone[1] * CANVAS_H],
      color: type.colors[Math.floor(rng() * type.colors.length)], mirror: false, rot: 0 });
  }
  placed.sort((a, b) => a.y - b.y);
  return placed;
}

/* ---------- mutations ---------- */

const MUTATION_BUILDERS = {
  remove: (inst) => ({ kind: 'remove', apply: b => { b.removed = true; } }),
  recolor: (inst, rng) => {
    // only accept replacement colors that are clearly distinguishable in print
    const dist = (a, b) => {
      const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
      const dr = ((pa >> 16) & 255) - ((pb >> 16) & 255);
      const dg = ((pa >> 8) & 255) - ((pb >> 8) & 255);
      const db = (pa & 255) - (pb & 255);
      return Math.hypot(dr, dg, db);
    };
    let others = inst.type.colors.filter(c => c !== inst.color && dist(c, inst.color) >= 95);
    if (!others.length) return null;
    const nc = others[Math.floor(rng() * others.length)];
    return { kind: 'recolor', apply: b => { b.color = nc; } };
  },
  mirror: (inst) => inst.type.canMirror ? { kind: 'mirror', apply: b => { b.mirror = !b.mirror; } } : null,
  rotate: (inst, rng) => {
    if (!inst.type.canRotate) return null;
    const deg = (26 + rng() * 16) * (rng() < 0.5 ? -1 : 1);
    return { kind: 'rotate', apply: b => { b.rot = Math.round(b.rot + deg); } };
  },
  resize: (inst, rng, cfg) => {
    const grow = rng() < 0.5;
    let f = grow ? 1.38 : 0.66;
    const ns = inst.s * f;
    // growing must not push the object off-canvas; otherwise shrink
    if (grow && (inst.y - 100 * ns < 4 || inst.x - 55 * ns < 4 || inst.x + 55 * ns > CANVAS_W - 4)) f = 0.66;
    return { kind: 'resize', apply: b => { b.s = +(b.s * f).toFixed(3); } };
  },
  move: (inst, rng, cfg, placed) => {
    const w = 100 * inst.s;
    for (let i = 0; i < 12; i++) {
      const ang = rng() * Math.PI * 2;
      const d = w * (0.6 + rng() * 0.35);
      const nx = inst.x + Math.cos(ang) * d;
      const ny = inst.y + Math.sin(ang) * d * 0.5;
      if (nx < MARGIN || nx > CANVAS_W - MARGIN || ny - 100 * inst.s < 8 || ny > CANVAS_H - 8) continue;
      if (ny < inst.zoneY[0] || ny > inst.zoneY[1]) continue; // stay in the object's habitat zone
      const clear = placed.every(p => p === inst ||
        Math.hypot(p.x - nx, (p.y - 50 * p.s) - (ny - 50 * inst.s)) > (52 * p.s + 52 * inst.s) * 0.8);
      if (clear) return { kind: 'move', nx, ny, apply: b => { b.x = nx; b.y = ny; } };
    }
    return null;
  },
  swap: (inst, rng, cfg, placed, theme) => {
    const candidates = theme.objects.filter(t => t.zone === inst.type.zone && t.id !== inst.type.id);
    if (!candidates.length) return null;
    const nt = candidates[Math.floor(rng() * candidates.length)];
    const nc = nt.colors[Math.floor(rng() * nt.colors.length)];
    return { kind: 'swap', apply: b => { b.type = nt; b.color = nc; b.mirror = false; b.rot = 0; } };
  },
};

const MUTATION_CAPS = { remove: 2, move: 2, resize: 3 };

function chooseMutations(placed, theme, cfg, diffCount, rng) {
  const chosen = [];
  const used = { remove: 0, move: 0, resize: 0 };
  const instOrder = shuffle(placed.map((_, i) => i), rng);
  for (const idx of instOrder) {
    if (chosen.length >= diffCount) break;
    const inst = placed[idx];
    for (const kind of shuffle(cfg.mutations, rng)) {
      if (MUTATION_CAPS[kind] != null && used[kind] >= MUTATION_CAPS[kind]) continue;
      const m = MUTATION_BUILDERS[kind](inst, rng, cfg, placed, theme);
      if (m) {
        chosen.push({ idx, ...m });
        if (used[kind] != null) used[kind]++;
        break;
      }
    }
  }
  return chosen;
}

/* ---------- rendering ---------- */

function renderInstance(inst) {
  if (inst.removed) return '';
  const { x, y, s } = inst;
  let inner = inst.type.draw(inst.color);
  if (inst.mirror) inner = `<g transform="translate(100 0) scale(-1 1)">${inner}</g>`;
  if (inst.rot) inner = `<g transform="rotate(${inst.rot} 50 50)">${inner}</g>`;
  return `<g transform="translate(${(x - 50 * s).toFixed(1)} ${(y - 100 * s).toFixed(1)}) scale(${s.toFixed(3)})">${inner}</g>`;
}

function renderScene(bg, instances, answers) {
  const body = instances.map(renderInstance).join('\n');
  let overlay = '';
  if (answers && answers.length) {
    overlay = answers.map(a => `
      <circle cx="${a.cx.toFixed(1)}" cy="${a.cy.toFixed(1)}" r="${a.r.toFixed(1)}"
        fill="none" stroke="#e8262d" stroke-width="7" stroke-dasharray="16 10" opacity="0.95"/>`).join('');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
<rect x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" fill="#fff"/>
${bg}
${body}
${overlay}
<rect x="1.5" y="1.5" width="${CANVAS_W - 3}" height="${CANVAS_H - 3}" rx="10" fill="none" stroke="#2d2a26" stroke-width="3"/>
</svg>`;
}

/* ---------- public API ---------- */

export function generatePuzzle({ themeId = 'garden', difficulty = 'medium', diffCount, seed }) {
  const theme = THEMES[themeId];
  if (!theme) throw new Error('unknown theme: ' + themeId);
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.medium;
  const target = diffCount || DIFF_DEFAULTS[difficulty] || 8;
  if (seed == null) seed = Math.floor(Math.random() * 900000) + 100000;
  const rng = mulberry32(seed);

  const bg = theme.background(rng);
  const placed = placeObjects(theme, cfg, rng);
  const mutations = chooseMutations(placed, theme, cfg, target, rng);

  // build scene B (deep-ish copy of instances, then apply mutations)
  const instB = placed.map(p => ({ ...p }));
  const answers = [];
  const diffs = [];
  for (const m of mutations) {
    const a = placed[m.idx], b = instB[m.idx];
    m.apply(b);
    const sMax = Math.max(a.s, b.s);
    const cx = m.kind === 'move' ? b.x : a.x;
    const cy = (m.kind === 'move' ? b.y : a.y) - 50 * sMax;
    answers.push({ cx, cy, r: 60 * sMax + 8 });
    diffs.push({ kind: m.kind, object: a.type.id });
  }

  return {
    seed, themeId, difficulty,
    count: mutations.length,
    diffs,
    svgA: renderScene(bg, placed, null),
    svgB: renderScene(bg, instB, null),
    svgAnswer: renderScene(bg, instB, answers),
  };
}

export { THEMES };
