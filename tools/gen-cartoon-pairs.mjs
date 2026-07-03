// Prototype: automated cartoon spot-the-difference pair generation.
// base scene (Gemini image gen) -> edited copy with N differences (Gemini image edit)
// -> automatic answer-region detection via pixel diff -> review sheet for visual QA.
// Usage: node gen-cartoon-pairs.mjs <outDir> <numPairs>
import sharp from 'sharp';
import { detectRegions, reviewSheet } from './detect.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] || './toon-out';
const NUM = parseInt(process.argv[3] || '2', 10);
const OFFSET = parseInt(process.argv[4] || '0', 10);
mkdirSync(OUT, { recursive: true });

const env = readFileSync('C:/Users/User/Desktop/Premium-jazz-lounge/premium-jazz-lounge/.env.local', 'utf8');
const KEY = env.match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const MODEL = 'gemini-3.1-flash-image';
const EP = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

const SCENES = [
  'a cozy house with a red roof on a grassy cliff by the ocean, wooden fence, clouds',
  'a cheerful farm yard with a barn, tractor, cow, chickens and sunflowers',
  'a fun playground in a park with slide, swings, sandbox, kids toys and a dog',
  'a cozy kitchen with a cat on the counter, kettle, fruit bowl, hanging pots',
  'a colorful underwater coral reef with tropical fish, turtle, treasure chest',
  'a camping scene with a tent, campfire, backpack, lantern and a raccoon',
  'a busy toy shop interior with shelves of teddy bears, robots, balls and a rocking horse',
  'a winter village street with snowman, sled, pine trees and cottages',
];

const STYLE = `children's picture-book cartoon illustration, thick clean dark outlines,
vibrant flat colors with simple soft shading, cheerful, many distinct medium-sized objects,
no text, no letters, no watermark, square 1:1 composition`;

async function gemini(parts, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(EP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } },
      }),
    });
    const data = await r.json();
    const cand = data.candidates?.[0];
    const img = cand?.content?.parts?.find(p => p.inlineData)?.inlineData;
    const txt = cand?.content?.parts?.find(p => p.text)?.text || '';
    if (img) return { buf: Buffer.from(img.data, 'base64'), txt };
    console.error(`[${label}] attempt ${attempt} no image:`, JSON.stringify(data).slice(0, 300));
    await new Promise(s => setTimeout(s, 3000));
  }
  throw new Error(`${label}: no image after retries`);
}


const results = [];
for (let i = 0; i < NUM; i++) {
  const scene = SCENES[(i + OFFSET) % SCENES.length];
  const nDiffs = 5;
  const id = `toon_${Date.now().toString(36)}_${i}`;
  try {
    console.log(`[${i}] generating base: ${scene.slice(0, 50)}…`);
    const base = await gemini([{ text: `Draw ${scene}. Style: ${STYLE}.` }], `${i}-base`);
    console.log(`[${i}] generating edited copy…`);
    const edit = await gemini([
      { inlineData: { mimeType: 'image/png', data: base.buf.toString('base64') } },
      { text: `Create an EXACT copy of this illustration but with exactly ${nDiffs} small differences for a spot-the-difference puzzle:
1. Completely remove one small object.
2. Change the color of one object to a clearly different color.
3. Remove one other small object or detail.
4. Change the color of one more object.
5. Replace one small object with a different object of similar size.
Every difference must be in a DIFFERENT part of the image, clearly visible, and at least 5% of the image size.
Keep absolutely everything else identical: same composition, same outlines, same colors, same lighting, same style. No text.` },
    ], `${i}-edit`);
    if (edit.txt) console.log(`[${i}] model notes:`, edit.txt.replace(/\n/g, ' ').slice(0, 200));

    const det = await detectRegions(base.buf, edit.buf, nDiffs);
    console.log(`[${i}] diff frac=${(det.frac * 100).toFixed(1)}% thr=${det.threshold} regions=${det.regions.length}`);
    const verdict = det.frac > 0.30 ? 'REJECT-global-redraw' : (det.exact ? 'OK' : 'REVIEW-count-' + det.regions.length);

    await sharp(base.buf).resize(1024, 1024).webp({ quality: 82 }).toFile(join(OUT, `${id}_a.webp`));
    await sharp(edit.buf).resize(1024, 1024).webp({ quality: 82 }).toFile(join(OUT, `${id}_b.webp`));
    await reviewSheet(edit.buf, det.regions, join(OUT, `${id}_review.png`));
    results.push({ id, scene, count: det.regions.length, regions: det.regions, frac: +det.frac.toFixed(3), verdict });
    console.log(`[${i}] ${verdict}`);
  } catch (e) {
    console.error(`[${i}] FAILED:`, e.message);
    results.push({ id, scene, verdict: 'ERROR: ' + e.message });
  }
}
writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log('done:', results.map(r => r.verdict).join(', '));
