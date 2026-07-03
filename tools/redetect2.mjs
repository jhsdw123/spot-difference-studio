import { detectRegions, vlmReconcile, reviewSheet } from './detect.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const dir = process.argv[2];
const env = readFileSync('C:/Users/User/Desktop/Premium-jazz-lounge/premium-jazz-lounge/.env.local', 'utf8');
const KEY = env.match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const results = JSON.parse(readFileSync(`${dir}/results.json`, 'utf8'));
for (const r of results) {
  if (r.verdict?.startsWith('ERROR')) continue;
  const a = readFileSync(`${dir}/${r.id}_a.webp`);
  const b = readFileSync(`${dir}/${r.id}_b.webp`);
  const det = await detectRegions(a, b, 5);
  const rec = await vlmReconcile(a, b, det.regions, KEY);
  if (rec) {
    r.regions = rec.regions.map(({ what, ...g }) => g);
    r.count = rec.regions.length;
    r.notes = rec.regions.map(g => g.what).join('; ');
    r.verdict = det.frac > 0.3 ? 'REJECT-global' : 'OK';
    console.log(r.id, `pixel-blobs=${det.regions.length} vlm=${rec.semanticCount} (${rec.model})`);
    console.log('   diffs:', r.notes);
  } else {
    console.log(r.id, 'VLM reconcile failed, keeping pixel blobs');
  }
  await reviewSheet(b, r.regions, `${dir}/${r.id}_review.png`);
}
writeFileSync(`${dir}/results.json`, JSON.stringify(results, null, 2));
