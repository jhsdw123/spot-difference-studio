// Illustrated puzzle library — 1:1 AI-illustrated pairs (photo-realistic scenes mirrored
// from the Spot Hunt production DB + cartoon pairs from the generation pipeline).
// Metadata in library/manifest.json, images in library/img/.

let manifest = null;
let byStyle = {};

const STYLE_LABELS = { photo: 'Photo', toon: 'Cartoon' };

export async function loadLibrary() {
  if (manifest) return manifest;
  const res = await fetch('library/manifest.json');
  if (!res.ok) throw new Error('library manifest missing');
  manifest = await res.json();
  byStyle = {};
  for (const e of manifest) {
    const s = e.style || 'photo';
    (byStyle[s] = byStyle[s] || []).push(e);
  }
  return manifest;
}

export function librarySize(style) { return (byStyle[style] || []).length; }

// num is 1-based within the style; omit for random.
export function getLibraryPuzzle(style, num) {
  const pool = byStyle[style] || [];
  if (!pool.length) throw new Error('no puzzles for style ' + style);
  const idx = (num >= 1 && num <= pool.length) ? num - 1 : Math.floor(Math.random() * pool.length);
  const e = pool[idx];
  return {
    photo: true, // library puzzle (raster pair) — as opposed to procedural SVG
    style,
    styleLabel: STYLE_LABELS[style] || 'Photo',
    num: idx + 1,
    id: e.id,
    count: e.count,
    regions: e.regions,
    aUrl: `library/img/${e.id}_a.webp`,
    bUrl: `library/img/${e.id}_b.webp`,
  };
}

export function sampleLibraryPuzzles(style, n) {
  const pool = byStyle[style] || [];
  const order = pool.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, Math.min(n, order.length)).map(i => getLibraryPuzzle(style, i + 1));
}

// Inline-SVG wrapper so the same .frame styling works for photos, with optional answer circles.
export function photoSvg(url, regions) {
  const circles = (regions || []).map(r => `
    <circle cx="${r.x}" cy="${r.y}" r="${r.radius}" fill="none" stroke="#e8262d"
      stroke-width="1.1" stroke-dasharray="2.4 1.5" opacity="0.95"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <image href="${url}" x="0" y="0" width="100" height="100"/>
    ${circles}
  </svg>`;
}
