import { Resvg } from '@resvg/resvg-js';
import { generatePuzzle } from '../js/engine.js';
import { writeFileSync } from 'node:fs';
const out = process.argv[2];
const p = generatePuzzle({ themeId: 'garden', difficulty: 'medium', seed: 777777, bw: true });
console.log('bw diffs:', p.diffs.map(d => d.kind).join(','), '| recolor excluded:', !p.diffs.some(d => d.kind === 'recolor'));
writeFileSync(`${out}/bw-A.png`, new Resvg(p.svgA, { fitTo: { mode: 'width', value: 1000 } }).render().asPng());
writeFileSync(`${out}/bw-ans.png`, new Resvg(p.svgAnswer, { fitTo: { mode: 'width', value: 1000 } }).render().asPng());
