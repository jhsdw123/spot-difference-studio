import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, sep } from 'node:path';
const root = 'C:/Users/User/AutoIncome_2026/spot-hunt-game';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith(sep) || p.endsWith('/')) p = join(p, 'index.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8946, r));
const browser = await puppeteer.launch({ headless: 'new' });
for (const [label, w, h] of [['iPhone14', 390, 844], ['SE', 375, 667], ['ProMax', 430, 932]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:8946/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 25000 });
  await page.tap('#btn-play');
  await page.waitForFunction(() => !document.querySelector('#veil').classList.contains('on'), { timeout: 30000 });
  const m = await page.evaluate(() => {
    const a = document.querySelector('#panel-a').getBoundingClientRect();
    const b = document.querySelector('#panel-b').getBoundingClientRect();
    return { size: Math.round(a.width), pctOfWidth: Math.round(a.width / innerWidth * 100), bottomOK: b.bottom <= innerHeight + 1 };
  });
  console.log(`${label} (${w}x${h}): panel ${m.size}px = ${m.pctOfWidth}% of width, fits: ${m.bottomOK}`);
  if (label === 'iPhone14') await page.screenshot({ path: 'game-bigger.png' });
  await page.close();
}
await browser.close(); server.close();
