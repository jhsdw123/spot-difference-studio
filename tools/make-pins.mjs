// Pinterest pin generator: 1000x1500 vertical pins, one per theme.
import { Resvg } from '@resvg/resvg-js';
import { generatePuzzle } from '../js/engine.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const outDir = process.argv[2] || '../assets/pins';
mkdirSync(outDir, { recursive: true });

const PINS = [
  { themeId: 'garden', seed: 111111, title: 'FREE Printable', sub: 'Spot the Difference Puzzles' },
  { themeId: 'ocean', seed: 222222, title: 'FREE Ocean Puzzles', sub: 'Print with Answer Keys' },
  { themeId: 'space', seed: 333333, title: 'FREE Space Puzzles', sub: 'Unlimited & Printable' },
  { themeId: 'farm', seed: 444444, title: 'FREE Farm Puzzles', sub: 'For Kids & Seniors' },
  { themeId: 'christmas', seed: 555555, title: 'FREE Christmas', sub: 'Spot the Difference' },
  { themeId: 'halloween', seed: 666666, title: 'FREE Halloween', sub: 'Spot the Difference' },
];

for (const pin of PINS) {
  const p = generatePuzzle({ themeId: pin.themeId, difficulty: 'easy', diffCount: 5, seed: pin.seed });
  const a = p.svgA.replace(/<svg[^>]*>/, '').replace('</svg>', '');
  const b = p.svgB.replace(/<svg[^>]*>/, '').replace('</svg>', '');
  const esc = s => s.replace(/&/g, '&amp;amp;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1500" viewBox="0 0 1000 1500">
    <rect width="1000" height="1500" fill="#faf7f2"/>
    <text x="500" y="110" font-family="Arial" font-weight="bold" font-size="72" fill="#e8262d" text-anchor="middle">${esc(pin.title)}</text>
    <text x="500" y="185" font-family="Arial" font-weight="bold" font-size="52" fill="#2d2a26" text-anchor="middle">${esc(pin.sub)}</text>
    <g transform="translate(110 230) scale(0.78)"><g>${a}</g></g>
    <g transform="translate(110 796) scale(0.78)"><g>${b}</g></g>
    <text x="500" y="1425" font-family="Arial" font-size="34" fill="#6f6a62" text-anchor="middle">Can you find the 5 differences?</text>
    <text x="500" y="1472" font-family="Arial" font-weight="bold" font-size="30" fill="#0f766e" text-anchor="middle">Print unlimited puzzles free — answer keys included</text>
  </svg>`;
  writeFileSync(`${outDir}/pin-${pin.themeId}.png`, new Resvg(svg, { fitTo: { mode: 'width', value: 1000 } }).render().asPng());
  console.log('pin-' + pin.themeId + '.png');
}
