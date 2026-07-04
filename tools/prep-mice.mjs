// Split the two-mice artwork into left/right transparent PNGs.
// Background removal via border-connected flood fill so interior whites
// (lens highlight, teeth) survive. Output: assets-src/mouse-{left,right}.png
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SRC = process.argv[2] || 'C:/Users/User/Downloads/ChatGPT Image 2026년 7월 4일 오후 04_03_11.png';
const OUT = resolve(import.meta.dirname, 'assets-src');
mkdirSync(OUT, { recursive: true });

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const near = (p) => data[p * 4] > 222 && data[p * 4 + 1] > 222 && data[p * 4 + 2] > 222;

// flood fill near-white background from the borders
const bg = new Uint8Array(W * H);
const qx = new Int32Array(W * H), qy = new Int32Array(W * H);
let qt = 0;
const push = (x, y) => {
  const p = y * W + x;
  if (!bg[p] && near(p)) { bg[p] = 1; qx[qt] = x; qy[qt] = y; qt++; }
};
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
for (let qh = 0; qh < qt; qh++) {
  const x = qx[qh], y = qy[qh];
  if (x > 0) push(x - 1, y);
  if (x < W - 1) push(x + 1, y);
  if (y > 0) push(x, y - 1);
  if (y < H - 1) push(x, y + 1);
}
// enclosed white pockets on the RIGHT sprite (between the slingshot bands)
// are background too — remove large ones; small whites (teeth, eyes) stay.
// The left sprite keeps all pockets (magnifying-glass lens is white).
const mid0 = W >> 1;
for (let y = 0; y < H; y++) for (let x = mid0; x < W; x++) {
  const p = y * W + x;
  if (bg[p] || !near(p)) continue;
  // BFS this pocket
  const comp = [];
  let head = 0;
  bg[p] = 2; comp.push(p);
  while (head < comp.length) {
    const c = comp[head++]; const cx = c % W, cy = (c / W) | 0;
    for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
      if (nx < mid0 || nx >= W || ny < 0 || ny >= H) continue;
      const q = ny * W + nx;
      if (!bg[q] && near(q)) { bg[q] = 2; comp.push(q); }
    }
  }
  if (comp.length <= 2500) for (const c of comp) bg[c] = 0; // keep small whites
}
for (let p = 0; p < W * H; p++) if (bg[p]) data[p * 4 + 3] = 0;
// soften the cut edge: half-fade opaque pixels that touch removed background
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const p = y * W + x;
  if (!bg[p] && (bg[p - 1] || bg[p + 1] || bg[p - W] || bg[p + W])) data[p * 4 + 3] = 140;
}

// bounding boxes of the two sprites, split at the widest transparent column gap
const mid = W >> 1;
function bbox(x0, x1) {
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) {
    if (data[(y * W + x) * 4 + 3] > 0) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const pad = 4;
  return { left: Math.max(0, minX - pad), top: Math.max(0, minY - pad),
    width: Math.min(x1 - 1, maxX + pad) - Math.max(0, minX - pad) + 1,
    height: Math.min(H - 1, maxY + pad) - Math.max(0, minY - pad) + 1 };
}
const img = sharp(data, { raw: info });
const L = bbox(0, mid), R = bbox(mid, W);
await sharp(await img.png().toBuffer()).extract(L).toFile(join(OUT, 'mouse-left.png'));
await sharp(await sharp(data, { raw: info }).png().toBuffer()).extract(R).toFile(join(OUT, 'mouse-right.png'));
console.log('mouse-left:', L.width + 'x' + L.height, '| mouse-right:', R.width + 'x' + R.height, '->', OUT);
