import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
const dir = process.argv[2];
const results = JSON.parse(readFileSync(`${dir}/results.json`, 'utf8'));
for (const r of results) {
  if (!r.regions) continue;
  const b64 = (await sharp(`${dir}/${r.id}_b.webp`).resize(700, 700).png().toBuffer()).toString('base64');
  const circles = r.regions.map(g => `<circle cx="${g.x * 7}" cy="${g.y * 7}" r="${g.radius * 7}" fill="none" stroke="#e8262d" stroke-width="7" stroke-dasharray="14 9"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700"><image href="data:image/png;base64,${b64}" width="700" height="700"/>${circles}</svg>`;
  writeFileSync(`${dir}/${r.id}_review.png`, new Resvg(svg).render().asPng());
  console.log('rebuilt', r.id);
}
