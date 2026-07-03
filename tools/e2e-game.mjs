// E2E: play a full round of Spot Hunt in headless Chrome.
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, sep } from 'node:path';

const root = 'C:/Users/User/AutoIncome_2026/spot-hunt-game';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith(sep) || p.endsWith('/')) p = join(p, 'index.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8940, r));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto('http://localhost:8940/', { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__sh && window.__sh.state.sequence.length > 0, { timeout: 20000 });
console.log('home loaded, pool:', await page.$eval('#home-pool', e => e.textContent));
await page.screenshot({ path: 'game-home.png' });

await page.tap('#btn-play');
// wait for countdown veil to finish and round to start
await page.waitForFunction(() => !document.querySelector('#veil').classList.contains('on'), { timeout: 25000 });
await new Promise(r => setTimeout(r, 300));
console.log('round started:', await page.$eval('#game-level', e => e.textContent),
  '| timer:', await page.$eval('#timer-text', e => e.textContent));
await page.screenshot({ path: 'game-play.png' });

// test a MISS first (tap far from any region)
const regions = await page.evaluate(() => window.__sh.state.puzzle.regions);
const box = await page.$eval('#panel-b', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
function farPoint(regions) {
  for (let ty = 5; ty < 95; ty += 7) for (let tx = 5; tx < 95; tx += 7) {
    if (regions.every(r => Math.hypot(r.x - tx, r.y - ty) > Math.max(r.radius, 4.5) * 1.2 + 6)) return { tx, ty };
  }
  return null;
}
const far = farPoint(regions);
if (far) {
  await page.tap('body'); // noop focus
  await page.touchscreen.tap(box.x + far.tx / 100 * box.w, box.y + far.ty / 100 * box.w);
  await new Promise(r => setTimeout(r, 400));
  const misses = await page.evaluate(() => window.__sh.state.round.misses);
  console.log('miss registered:', misses === 1 ? 'OK' : 'FAIL(' + misses + ')');
}

// hint
await page.tap('#btn-hint');
await new Promise(r => setTimeout(r, 300));
console.log('hint rings:', await page.$$eval('.hint-ring', els => els.length) >= 2 ? 'OK' : 'FAIL');

// find all differences by tapping region centers on panel B
for (let i = 0; i < regions.length; i++) {
  const r = regions[i];
  await page.touchscreen.tap(box.x + r.x / 100 * box.w, box.y + r.y / 100 * box.w);
  await new Promise(res => setTimeout(res, 350));
}
console.log('found counter:', await page.$eval('#found-count', e => e.textContent));
await page.waitForFunction(() => document.querySelector('#result').classList.contains('on'), { timeout: 8000 });
console.log('result:', await page.$eval('#result-title', e => e.textContent),
  '|', await page.$eval('#result-sub', e => e.textContent),
  '| stars:', await page.$$eval('#result-stars span.on', els => els.length));
await new Promise(r => setTimeout(r, 900));
await page.screenshot({ path: 'game-result.png' });

// next puzzle flow
await page.tap('#btn-next');
await page.waitForFunction(() => !document.querySelector('#result').classList.contains('on'), { timeout: 5000 });
console.log('next puzzle flow: OK ->', await page.$eval('#game-level', e => e.textContent));

console.log('console errors:', errors.length ? errors : 'none');
await browser.close(); server.close();
console.log('E2E game done');
