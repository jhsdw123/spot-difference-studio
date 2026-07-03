import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith(sep) || p.endsWith('/')) p = join(p, 'index.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8932, r));
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:8932/', { waitUntil: 'networkidle0' });
await page.waitForSelector('#pv-a svg');
await page.click('#bw-toggle');
await new Promise(r => setTimeout(r, 400));
const gray = await page.$eval('#pv-a svg', s => s.innerHTML.includes('#d8d8d8') || s.innerHTML.includes('#bdbdbd'));
console.log('bw preview grayscale:', gray ? 'OK' : 'FAIL');
await page.click('#bw-toggle');
await new Promise(r => setTimeout(r, 400));
const colorBack = await page.$eval('#pv-a svg', s => !s.innerHTML.includes('#bdbdbd'));
console.log('color restore:', colorBack ? 'OK' : 'FAIL');
console.log('errors:', errors.length ? errors : 'none');
await browser.close(); server.close();
