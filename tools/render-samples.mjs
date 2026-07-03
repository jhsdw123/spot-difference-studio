// QA helper: render sample puzzles to PNG so they can be visually inspected.
import { Resvg } from '@resvg/resvg-js';
import { generatePuzzle } from '../js/engine.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] || './samples';
mkdirSync(outDir, { recursive: true });

const jobs = [
  { themeId: 'garden', difficulty: 'easy', seed: 111111 },
  { themeId: 'ocean', difficulty: 'medium', seed: 222222 },
  { themeId: 'space', difficulty: 'medium', seed: 333333 },
  { themeId: 'farm', difficulty: 'hard', seed: 444444 },
];

for (const job of jobs) {
  const p = generatePuzzle(job);
  console.log(`${job.themeId}/${job.difficulty} seed=${p.seed} diffs=${p.count} kinds=${p.diffs.map(d => d.kind + ':' + d.object).join(',')}`);
  for (const [suffix, svg] of [['A', p.svgA], ['B', p.svgB], ['ans', p.svgAnswer]]) {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1000 } }).render().asPng();
    writeFileSync(join(outDir, `${job.themeId}-${suffix}.png`), png);
  }
}
console.log('done ->', outDir);
