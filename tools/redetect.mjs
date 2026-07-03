import { detectRegions, reviewSheet } from './detect.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const dir = process.argv[2];
const results = JSON.parse(readFileSync(`${dir}/results.json`, 'utf8'));
for (const r of results) {
  if (r.verdict?.startsWith('ERROR')) continue;
  const a = readFileSync(`${dir}/${r.id}_a.webp`);
  const b = readFileSync(`${dir}/${r.id}_b.webp`);
  const det = await detectRegions(a, b, 5);
  r.regions = det.regions; r.count = det.regions.length; r.frac = +det.frac.toFixed(3);
  r.verdict = det.frac > 0.3 ? 'REJECT-global' : (det.regions.length < 4 ? 'REVIEW-few' : 'OK');
  await reviewSheet(b, det.regions, `${dir}/${r.id}_review.png`);
  console.log(r.id, 'regions=' + r.count, 'frac=' + (r.frac * 100).toFixed(1) + '%', r.verdict);
}
writeFileSync(`${dir}/results.json`, JSON.stringify(results, null, 2));
