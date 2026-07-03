import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith(sep) || p.endsWith('/')) p = join(p, 'index.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8934, r));
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width: 1440, height: 1000 });
await page.goto('http://localhost:8934/', { waitUntil: 'networkidle0' });
await page.waitForSelector('#pv-a svg image');
console.log('default (should be Cartoon):', await page.$eval('#pv-meta', e => e.textContent));
await page.click('#answers-toggle');
await new Promise(r => setTimeout(r, 400));
console.log('toon answer circles:', await page.$eval('#pv-b svg', s => s.querySelectorAll('circle').length));
await page.click('#answers-toggle');
await page.click('#style-seg [data-value="photo"]');
await page.waitForFunction(() => document.querySelector('#pv-meta').textContent.includes('Photo #'));
console.log('photo:', await page.$eval('#pv-meta', e => e.textContent));
await page.click('#style-seg [data-value="classic"]');
await page.waitForFunction(() => /Garden|Ocean|Space|Farm|Christmas|Halloween/.test(document.querySelector('#pv-meta').textContent));
console.log('classic:', await page.$eval('#pv-meta', e => e.textContent));
await page.click('#style-seg [data-value="toon"]');
await page.waitForFunction(() => document.querySelector('#pv-meta').textContent.includes('Cartoon #'));
console.log('back to toon: OK');
await page.screenshot({ path: 'toon-home.png' });
console.log('errors:', errors.length ? errors : 'none');
await browser.close(); server.close();
