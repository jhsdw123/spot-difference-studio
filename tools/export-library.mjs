// One-time export: mirror the Spot Hunt Supabase puzzle library into the static site.
// Reads credentials from a local .env (never committed); images land in ../library/img as WebP,
// metadata in ../library/manifest.json. Rerun any time new pairs are added — it skips existing files.
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ENV_PATH = process.argv[2] || 'C:/Users/User/Desktop/stock_tracker/price_fetcher/.env';
const env = Object.fromEntries(
  readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const URL_BASE = (env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) { console.error('missing SUPABASE_URL / key in', ENV_PATH); process.exit(1); }

const outDir = resolve(import.meta.dirname, '../library');
const imgDir = join(outDir, 'img');
mkdirSync(imgDir, { recursive: true });

// rows created on/after this date are cartoon-style (Flow AI uploads); earlier = photo
const TOON_SINCE = '2026-07-03';

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const rows = [];
for (let from = 0; ; from += 100) {
  const r = await fetch(`${URL_BASE}/rest/v1/spotdiff_problems?select=id,image_a_url,image_b_url,diff_count,regions,image_width,image_height,created_at&is_active=eq.true&order=created_at.asc&limit=100&offset=${from}`, { headers });
  const batch = await r.json();
  if (!Array.isArray(batch) || !batch.length) break;
  rows.push(...batch);
  if (batch.length < 100) break;
}
console.log('rows fetched:', rows.length);

// preserve entries that only exist in the local manifest (e.g. Gemini-generated toon
// pairs added by integrate-toon.mjs) and any manually assigned style tags
let existing = [];
try { existing = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8')); } catch {}
const existingById = new Map(existing.map(e => [e.id, e]));
const rowIds = new Set(rows.map(r => r.id));
const manifest = existing.filter(e => !rowIds.has(e.id));
if (manifest.length) console.log('kept manifest-only entries:', manifest.length);
let done = 0, skipped = 0, failed = 0;
for (const row of rows) {
  const style = existingById.get(row.id)?.style
    || (row.created_at >= TOON_SINCE ? 'toon' : 'photo');
  const entry = { id: row.id, count: row.diff_count, regions: row.regions, w: row.image_width, h: row.image_height, style };
  try {
    for (const [side, url] of [['a', row.image_a_url], ['b', row.image_b_url]]) {
      const fname = `${row.id}_${side}.webp`;
      const fpath = join(imgDir, fname);
      if (existsSync(fpath)) { skipped++; continue; }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${side}: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf).webp({ quality: 82 }).toFile(fpath);
      done++;
    }
    manifest.push(entry);
  } catch (e) {
    failed++;
    console.error('FAIL', row.id, e.message);
  }
  if ((manifest.length) % 25 === 0) console.log(`progress: ${manifest.length}/${rows.length}`);
}
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest));
console.log(`done. converted=${done} skipped=${skipped} failed=${failed} manifest=${manifest.length} entries`);
