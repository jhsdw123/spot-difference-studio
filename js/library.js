// Illustrated (photo) puzzle library — 1:1 AI-illustrated pairs mirrored from the
// Spot Hunt production DB. Metadata in library/manifest.json, images in library/img/.

let manifest = null;

export async function loadLibrary() {
  if (manifest) return manifest;
  const res = await fetch('library/manifest.json');
  if (!res.ok) throw new Error('library manifest missing');
  manifest = await res.json();
  return manifest;
}

export function librarySize() { return manifest ? manifest.length : 0; }

// num is 1-based; omit for random.
export function getPhotoPuzzle(num) {
  if (!manifest || !manifest.length) throw new Error('library not loaded');
  let idx = (num >= 1 && num <= manifest.length) ? num - 1 : Math.floor(Math.random() * manifest.length);
  const e = manifest[idx];
  return {
    photo: true,
    num: idx + 1,
    id: e.id,
    count: e.count,
    regions: e.regions,
    aUrl: `library/img/${e.id}_a.webp`,
    bUrl: `library/img/${e.id}_b.webp`,
  };
}

export function samplePhotoPuzzles(n) {
  if (!manifest || !manifest.length) throw new Error('library not loaded');
  const order = manifest.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, Math.min(n, order.length)).map(i => getPhotoPuzzle(i + 1));
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
