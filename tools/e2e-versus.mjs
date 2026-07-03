// E2E: full 2-player versus flow — two pages, one real Supabase Realtime room.
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, sep } from 'node:path';

const root = 'C:/Users/User/AutoIncome_2026/spot-hunt-game';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith(sep) || p.endsWith('/')) p = join(p, 'index.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8942, r));

const browser = await puppeteer.launch({ headless: 'new' });

async function makePlayer(name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`[${name}] PAGEERROR:`, e.message));
  page.on('console', m => { if (m.type() === 'error') console.log(`[${name}] console:`, m.text().slice(0, 160)); });
  page.on('dialog', d => d.accept());
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:8942/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__sh && window.__sh.state.sequence.length > 0, { timeout: 25000 });
  await page.tap('#btn-versus');
  await page.waitForSelector('#screen-versus.active');
  await page.evaluate(n => { const i = document.querySelector('#vs-name'); i.value = n; }, name);
  return page;
}

const host = await makePlayer('HostBot');
const guest = await makePlayer('GuestBot');

// host creates room
await host.tap('#vs-create');
await host.waitForFunction(() => /^[A-Z0-9]{4}$/.test(document.querySelector('#vs-code-big').textContent), { timeout: 15000 });
const code = await host.$eval('#vs-code-big', e => e.textContent);
console.log('room created:', code);

// guest joins
await guest.type('#vs-code-input', code);
await guest.tap('#vs-join');
await guest.waitForFunction(() => document.querySelector('[data-step="guest"]').classList.contains('on'), { timeout: 15000 });
console.log('guest joined');

// host sees guest and starts
await host.waitForFunction(() => !document.querySelector('#vs-start').disabled, { timeout: 15000 });
console.log('host sees guest:', await host.$eval('#vs-status', e => e.textContent));
await host.tap('#vs-start');

// both reach the running round (veil off)
for (const [n, p] of [['host', host], ['guest', guest]]) {
  await p.waitForFunction(() => document.querySelector('#screen-game').classList.contains('active') &&
    !document.querySelector('#veil').classList.contains('on'), { timeout: 40000 });
  console.log(n, 'round running:', await p.$eval('#game-level', e => e.textContent));
}

// guest finds all but one — host should see live opponent progress
const regions = await guest.evaluate(() => window.__sh.versus.currentRound().puzzle.regions);
const box = await guest.$eval('#panel-b', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
for (let i = 0; i < regions.length - 1; i++) {
  await guest.touchscreen.tap(box.x + regions[i].x / 100 * box.w, box.y + regions[i].y / 100 * box.w);
  await new Promise(r => setTimeout(r, 380));
}
await new Promise(r => setTimeout(r, 1200));
console.log('host sees opp progress:', await host.$eval('#opp-count', e => e.textContent),
  `(expected ${regions.length - 1}/${regions.length})`);

// guest finishes -> guest wins round, host round halts
await guest.touchscreen.tap(box.x + regions[regions.length - 1].x / 100 * box.w, box.y + regions[regions.length - 1].y / 100 * box.w);
await guest.waitForFunction(() => document.querySelector('#result').classList.contains('on'), { timeout: 15000 });
await host.waitForFunction(() => document.querySelector('#result').classList.contains('on'), { timeout: 15000 });
console.log('guest result:', await guest.$eval('#result-title', e => e.textContent), '|', await guest.$eval('#result-sub', e => e.textContent));
console.log('host result :', await host.$eval('#result-title', e => e.textContent), '|', await host.$eval('#result-sub', e => e.textContent));

// both auto-advance to round 2
for (const [n, p] of [['host', host], ['guest', guest]]) {
  await p.waitForFunction(() => document.querySelector('#game-level').textContent.includes('Round 2'), { timeout: 25000 });
  console.log(n, 'advanced to:', await p.$eval('#game-level', e => e.textContent),
    '| score:', await p.$eval('#vs-scoreline', e => e.textContent));
}

console.log('VERSUS E2E OK');
await browser.close(); server.close();
