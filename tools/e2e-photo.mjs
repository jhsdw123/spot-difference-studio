// E2E: photo (illustrated) mode — preview, answers overlay, PDF download, style switching.
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dlDir = resolve(import.meta.dirname, 'photo-dl');
mkdirSync(dlDir, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith(sep) || p.endsWith('/')) p = join(p, 'index.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8933, r));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const client = await page.createCDPSession();
await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir });

await page.setViewport({ width: 1440, height: 1000 });
await page.goto('http://localhost:8933/', { waitUntil: 'networkidle0' });
await page.waitForSelector('#pv-a svg image', { timeout: 10000 });
console.log('photo mode default:', await page.$eval('#pv-meta', e => e.textContent));

// classic-only controls hidden?
const hidden = await page.$eval('.theme-grid', el => el.closest('.classic-only').offsetParent === null);
console.log('classic controls hidden in photo mode:', hidden ? 'OK' : 'FAIL');

// answers overlay
await page.click('#answers-toggle');
await new Promise(r => setTimeout(r, 300));
const circles = await page.$eval('#pv-b svg', s => s.querySelectorAll('circle').length);
console.log('answer circles shown:', circles > 0 ? `OK (${circles})` : 'FAIL');
await page.click('#answers-toggle');

// jump to specific photo number
await page.evaluate(() => { const i = document.querySelector('#seed-input'); i.value = '7'; i.dispatchEvent(new Event('change')); });
await page.waitForFunction(() => document.querySelector('#pv-meta').textContent.includes('#7'));
console.log('photo number jump: OK');

// PDF download
await page.click('#btn-pdf');
await new Promise(r => setTimeout(r, 6000));
const pdfs = readdirSync(dlDir).filter(f => f.startsWith('spot-the-difference-photo'));
console.log('photo PDF:', pdfs.length ? `OK ${pdfs[0]} (${statSync(join(dlDir, pdfs[0])).size} bytes)` : 'MISSING');

// switch to cartoon and back
await page.click('#style-seg [data-value="classic"]');
await page.waitForFunction(() => document.querySelector('#pv-meta').textContent.includes('Garden'));
console.log('switch to cartoon: OK');
await page.click('#style-seg [data-value="photo"]');
await page.waitForFunction(() => document.querySelector('#pv-meta').textContent.includes('Photo #'));
console.log('switch back to photo: OK');

console.log('console errors:', errors.length ? errors : 'none');
await browser.close(); server.close();
console.log('E2E photo done');
