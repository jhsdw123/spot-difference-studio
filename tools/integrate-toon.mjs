// Integrate accepted cartoon pairs (from gen-cartoon-pairs.mjs output dirs) into the site library.
// Usage: node integrate-toon.mjs <dir1> [dir2 ...]
// Only pairs with verdict "OK" are added; already-integrated ids are skipped.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const libDir = resolve(import.meta.dirname, '../library');
const manifestPath = join(libDir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const have = new Set(manifest.map(e => e.id));

let added = 0;
for (const dir of process.argv.slice(2)) {
  const results = JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8'));
  for (const r of results) {
    if (r.verdict !== 'OK' || have.has(r.id)) { if (r.verdict !== 'OK') console.log('skip', r.id, r.verdict); continue; }
    copyFileSync(join(dir, `${r.id}_a.webp`), join(libDir, 'img', `${r.id}_a.webp`));
    copyFileSync(join(dir, `${r.id}_b.webp`), join(libDir, 'img', `${r.id}_b.webp`));
    manifest.push({ id: r.id, count: r.count, regions: r.regions, w: 1024, h: 1024, style: 'toon' });
    have.add(r.id);
    added++;
    console.log('added', r.id, `(${r.count} diffs)`);
  }
}
writeFileSync(manifestPath, JSON.stringify(manifest));
console.log(`done: +${added} toon pairs, manifest total ${manifest.length}`);
