import { Resvg } from '@resvg/resvg-js';
import { generatePuzzle } from '../js/engine.js';
import { writeFileSync } from 'node:fs';
const out = process.argv[2];
for (const job of [
  { themeId: 'christmas', difficulty: 'medium', seed: 555555 },
  { themeId: 'halloween', difficulty: 'medium', seed: 666666 },
]) {
  const p = generatePuzzle(job);
  console.log(`${job.themeId} diffs=${p.count} kinds=${p.diffs.map(d => d.kind + ':' + d.object).join(',')}`);
  writeFileSync(`${out}/${job.themeId}-A.png`, new Resvg(p.svgA, { fitTo: { mode: 'width', value: 1000 } }).render().asPng());
}
