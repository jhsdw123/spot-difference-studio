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
await new Promise(r => server.listen(8941, r));
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1180, height: 820, isMobile: true, hasTouch: true });
await page.goto('http://localhost:8941/', { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__sh && window.__sh.state.sequence.length > 0, { timeout: 20000 });
await page.tap('#btn-play');
await page.waitForFunction(() => !document.querySelector('#veil').classList.contains('on'), { timeout: 25000 });
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: 'game-tablet.png' });
await browser.close(); server.close();
console.log('done');
