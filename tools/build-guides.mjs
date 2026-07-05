// Guides pipeline — drop a new article into guides/, run this, commit.
// 1. Injects SEO meta (canonical, Open Graph, Twitter card, JSON-LD Article)
//    into every guide <head> (idempotent via <!-- seo:auto --> markers).
// 2. Regenerates the guides/index.html card list (newest first, by git add date).
// 3. Regenerates sitemap.xml with <lastmod> from git.
// 4. Validates: one h1, meta description present, generator link, 700+ words.
// Usage: node build-guides.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');
const GUIDES = join(ROOT, 'guides');
const BASE = 'https://jhsdw123.github.io/spot-difference-studio/';
const OG_IMAGE = BASE + 'assets/pins/pin-free.png'; // 2:3 — ideal for Pinterest saves

const git = (args) => {
  try { return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { return ''; }
};
const addedAt = (rel) => Number(git(`log --diff-filter=A --follow --format=%at -- "${rel}"`).split('\n').pop()) || Math.floor(Date.now() / 1000);
const lastMod = (rel) => git(`log -1 --format=%as -- "${rel}"`) || new Date().toISOString().slice(0, 10);

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#\d+;/g, m => String.fromCharCode(m.slice(2, -1)));
const grab = (html, re) => decode((html.match(re) || [, ''])[1].trim());
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const jstr = (s) => JSON.stringify(s);

const files = readdirSync(GUIDES).filter(f => f.endsWith('.html') && f !== 'index.html');
const articles = [];
let warnings = 0;

for (const f of files) {
  const path = join(GUIDES, f);
  let html = readFileSync(path, 'utf8');
  const title = grab(html, /<title>([\s\S]*?)<\/title>/);
  const desc = grab(html, /<meta name="description" content="([\s\S]*?)">/);
  const h1 = grab(html, /<h1>([\s\S]*?)<\/h1>/).replace(/<[^>]+>/g, '');
  const url = BASE + 'guides/' + f;

  // --- validation ---
  const words = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const h1Count = (html.match(/<h1>/g) || []).length;
  const warn = (msg) => { console.warn(`  ⚠ ${f}: ${msg}`); warnings++; };
  if (h1Count !== 1) warn(`${h1Count} <h1> tags`);
  if (!desc) warn('missing meta description');
  if (desc.length > 165) warn(`meta description ${desc.length} chars (aim ≤160)`);
  if (!/href="\.\.\/#generator"/.test(html)) warn('no generator CTA link');
  if (words < 700) warn(`only ${words} words (aim 800+)`);

  // --- SEO block injection (idempotent) ---
  const seoBlock = `<!-- seo:auto -->
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Spot the Difference Studio">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":${jstr(h1 || title)},"description":${jstr(desc)},"url":${jstr(url)},"image":${jstr(OG_IMAGE)},"author":{"@type":"Organization","name":"Spot the Difference Studio"},"publisher":{"@type":"Organization","name":"Spot the Difference Studio"}}</script>
<!-- /seo:auto -->`;
  const next = html.includes('<!-- seo:auto -->')
    ? html.replace(/<!-- seo:auto -->[\s\S]*?<!-- \/seo:auto -->/, seoBlock)
    : html.replace('</head>', seoBlock + '\n</head>');
  if (next !== html) { writeFileSync(path, next); html = next; }

  articles.push({ f, title, desc, h1: h1 || title, url, added: addedAt('guides/' + f) });
}

articles.sort((a, b) => b.added - a.added); // newest first

// --- guides/index.html ---
const cards = articles.map(a => `    <a class="g" href="${a.f}">
      <h3>${esc(a.h1)}</h3>
      <p>${esc(a.desc)}</p>
    </a>`).join('\n');
const idxPath = join(GUIDES, 'index.html');
let idx = readFileSync(idxPath, 'utf8');
idx = idx.replace(/<div class="guide-list">[\s\S]*?<\/div>\s*<\/main>/, `<div class="guide-list">\n${cards}\n  </div>\n</main>`);
if (!idx.includes('rel="canonical"')) idx = idx.replace('</head>', `<link rel="canonical" href="${BASE}guides/">\n</head>`);
writeFileSync(idxPath, idx);

// --- sitemap.xml ---
const urlTag = (loc, pri, rel) => `  <url><loc>${loc}</loc>${rel ? `<lastmod>${lastMod(rel)}</lastmod>` : ''}<priority>${pri}</priority></url>`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlTag(BASE, '1.0', 'index.html')}
${urlTag(BASE + 'guides/', '0.7', 'guides/index.html')}
${articles.map(a => urlTag(a.url, '0.8', 'guides/' + a.f)).join('\n')}
${urlTag(BASE + 'answers.html', '0.4', 'answers.html')}
${urlTag(BASE + 'privacy.html', '0.3', 'privacy.html')}
</urlset>
`;
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap);

console.log(`${articles.length} guides -> index cards + sitemap + SEO meta (${warnings} warning${warnings === 1 ? '' : 's'})`);
