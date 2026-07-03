import { Resvg } from '@resvg/resvg-js';
import { generatePuzzle } from '../js/engine.js';
import { writeFileSync } from 'node:fs';

const p = generatePuzzle({ themeId: 'garden', difficulty: 'easy', diffCount: 5, seed: 111111 });
const inner = p.svgA.replace(/<svg[^>]*>/, '').replace('</svg>', '');

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#faf7f2"/>
  <g transform="translate(560 65) scale(0.58)">
    <g>${inner}</g>
  </g>
  <g transform="translate(60 140)">
    <circle cx="36" cy="36" r="26" fill="none" stroke="#e8262d" stroke-width="10"/>
    <path d="M56 56 L78 78" stroke="#e8262d" stroke-width="12" stroke-linecap="round"/>
    <circle cx="36" cy="36" r="11" fill="#ffc93c"/>
    <text x="0" y="150" font-family="Arial" font-weight="bold" font-size="52" fill="#2d2a26">Free Printable</text>
    <text x="0" y="210" font-family="Arial" font-weight="bold" font-size="52" fill="#e8262d">Spot the Difference</text>
    <text x="0" y="270" font-family="Arial" font-weight="bold" font-size="52" fill="#2d2a26">Generator</text>
    <text x="0" y="330" font-family="Arial" font-size="24" fill="#6f6a62">Unlimited free puzzles with answer keys</text>
  </g>
</svg>`;
writeFileSync('../assets/og-image.png', new Resvg(og, { fitTo: { mode: 'width', value: 1200 } }).render().asPng());
console.log('og-image.png written');
