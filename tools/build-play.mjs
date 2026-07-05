// Builds the gated player data: play/packs.json.
// Each pack's puzzle set (ids + difference regions) is AES-256-GCM encrypted with
// a key derived from its purchase code. Without a valid code, the JSON reveals
// nothing (no plaintext hints, no id lookup) — the client try-decrypts every entry
// and only a correct code authenticates. Deploys into the HUB repo at /play/.
import { createHash, createCipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { PACKS, normCode } from './packs-config.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const HUB_PLAY = resolve(ROOT, '../jhsdw123.github.io/play');
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'library/manifest.json'), 'utf8'));
const NUMS = JSON.parse(readFileSync(join(ROOT, 'library/pin-numbers.json'), 'utf8'));
const byNum = {}; for (const e of MANIFEST) byNum[NUMS[e.id]] = e;

const keyFor = (code) => createHash('sha256').update(normCode(code)).digest();          // 32 bytes
const ivFor = (code) => createHash('sha256').update(normCode(code) + ':iv').digest().subarray(0, 12);

function encrypt(code, payload) {
  const c = createCipheriv('aes-256-gcm', keyFor(code), ivFor(code));
  const ct = Buffer.concat([c.update(JSON.stringify(payload), 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return { iv: ivFor(code).toString('base64'), data: Buffer.concat([ct, tag]).toString('base64') }; // WebCrypto wants ct||tag
}

const entries = PACKS.map((pack) => {
  const puzzles = pack.nums.map((n) => {
    const e = byNum[n];
    if (!e) throw new Error(`unknown puzzle #${n} in ${pack.slug}`);
    return { n, id: e.id, count: e.count, regions: e.regions };
  });
  const payload = { title: pack.title, subtitle: pack.subtitle, mode: pack.playMode, largePrint: !!pack.largePrint, puzzles };
  return encrypt(pack.code, payload);
});

// shuffle-proof order: sort by iv so file order gives no hint about which pack is which
entries.sort((a, b) => a.iv.localeCompare(b.iv));

mkdirSync(HUB_PLAY, { recursive: true });
writeFileSync(join(HUB_PLAY, 'packs.json'), JSON.stringify({ v: 1, entries }, null, 0));

console.log(`wrote play/packs.json — ${entries.length} encrypted packs`);
console.log('CODES (baked into each PDF):');
for (const p of PACKS) console.log(`  ${p.code}  →  ${p.title} (${p.playMode})`);
