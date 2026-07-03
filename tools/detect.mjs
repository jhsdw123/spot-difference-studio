// Automatic answer-region detection for AI-generated puzzle pairs.
// Strategy: the edit model is asked for exactly N changes, so N is ground truth.
// Detect changed-pixel blobs, then converge the blob count to N:
//   too many -> merge the closest pair repeatedly (fixes one change split into fragments)
//   too few  -> retry with a lower diff threshold (catches subtler edits)
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const D = 512; // detection resolution

async function rawPixels(buf) {
  return sharp(buf).resize(D, D, { fit: 'fill' }).blur(1.2).raw().toBuffer();
}

function components(a, b, threshold) {
  const mask = new Uint8Array(D * D);
  let changed = 0;
  for (let i = 0; i < D * D; i++) {
    const o = i * 3;
    const d = Math.max(Math.abs(a[o] - b[o]), Math.abs(a[o + 1] - b[o + 1]), Math.abs(a[o + 2] - b[o + 2]));
    if (d > threshold) { mask[i] = 1; changed++; }
  }
  const seen = new Uint8Array(D * D);
  const comps = [];
  const qx = new Int32Array(D * D), qy = new Int32Array(D * D);
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const idx = y * D + x;
    if (!mask[idx] || seen[idx]) continue;
    let head = 0, tail = 0, sx = 0, sy = 0, n = 0;
    qx[tail] = x; qy[tail] = y; tail++; seen[idx] = 1;
    while (head < tail) {
      const cx = qx[head], cy = qy[head]; head++;
      sx += cx; sy += cy; n++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= D || ny >= D) continue;
        const ni = ny * D + nx;
        if (mask[ni] && !seen[ni]) { seen[ni] = 1; qx[tail] = nx; qy[tail] = ny; tail++; }
      }
    }
    if (n >= 55) comps.push({ x: sx / n, y: sy / n, area: n });
  }
  return { comps, frac: changed / (D * D) };
}

function mergePair(comps) {
  let bi = 0, bj = 1, bd = Infinity;
  for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) {
    const d = Math.hypot(comps[i].x - comps[j].x, comps[i].y - comps[j].y);
    if (d < bd) { bd = d; bi = i; bj = j; }
  }
  const A = comps[bi].area + comps[bj].area;
  comps[bi] = {
    x: (comps[bi].x * comps[bi].area + comps[bj].x * comps[bj].area) / A,
    y: (comps[bi].y * comps[bi].area + comps[bj].y * comps[bj].area) / A,
    area: A,
  };
  comps.splice(bj, 1);
}

export async function detectRegions(bufA, bufB, expected = 5) {
  const [a, b] = await Promise.all([rawPixels(bufA), rawPixels(bufB)]);
  let comps = [], frac = 0, threshold = 0;
  for (const thr of [42, 32, 25]) {
    const res = components(a, b, thr);
    comps = res.comps; frac = res.frac; threshold = thr;
    if (comps.length >= expected) break;
  }
  // merge blobs that are practically touching first (fragments of one object)
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) {
      const ri = Math.sqrt(comps[i].area / Math.PI), rj = Math.sqrt(comps[j].area / Math.PI);
      if (Math.hypot(comps[i].x - comps[j].x, comps[i].y - comps[j].y) < (ri + rj) * 1.05 + 5) {
        const A = comps[i].area + comps[j].area;
        comps[i] = {
          x: (comps[i].x * comps[i].area + comps[j].x * comps[j].area) / A,
          y: (comps[i].y * comps[i].area + comps[j].y * comps[j].area) / A,
          area: A,
        };
        comps.splice(j, 1); merged = true; break outer;
      }
    }
  }
  // converge to the requested count
  while (comps.length > expected) mergePair(comps);

  const regions = comps.map(c => ({
    x: +(c.x / D * 100).toFixed(1),
    y: +(c.y / D * 100).toFixed(1),
    radius: +Math.min(15, Math.max(4.5, Math.sqrt(c.area / Math.PI) / D * 100 * 2.2)).toFixed(1),
  }));
  return { regions, frac, threshold, exact: regions.length === expected };
}

export async function reviewSheet(bufOrPathB, regions, outPath) {
  const b64 = (await sharp(bufOrPathB).resize(700, 700).png().toBuffer()).toString('base64');
  const circles = regions.map(r =>
    `<circle cx="${r.x * 7}" cy="${r.y * 7}" r="${r.radius * 7}" fill="none" stroke="#e8262d" stroke-width="7" stroke-dasharray="14 9"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700"><image href="data:image/png;base64,${b64}" width="700" height="700"/>${circles}</svg>`;
  writeFileSync(outPath, new Resvg(svg).render().asPng());
}
