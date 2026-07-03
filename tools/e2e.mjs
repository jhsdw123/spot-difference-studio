// E2E smoke test: loads the app in headless Chrome, checks for console errors,
// exercises the main flows, and downloads a real PDF.
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const shotDir = process.argv[2] || './shots';
const dlDir = resolve(shotDir, 'downloads');
mkdirSync(shotDir, { recursive: true });
mkdirSync(dlDir, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith('\\') || p.endsWith('/')) p = join(p, 'index.html');
  try {
    const body = readFileSync(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(8931, r));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

const client = await page.createCDPSession();
await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir });

await page.setViewport({ width: 1440, height: 1000 });
await page.goto('http://localhost:8931/', { waitUntil: 'networkidle0' });
await page.waitForSelector('#pv-a svg', { timeout: 8000 });
console.log('page loaded, preview rendered');

await page.screenshot({ path: join(shotDir, 'desktop-top.png') });

// answers toggle
await page.click('#answers-toggle');
await new Promise(r => setTimeout(r, 300));
const hasCircle = await page.$eval('#pv-b svg', svg => svg.innerHTML.includes('stroke-dasharray="16 10"'));
console.log('answers overlay:', hasCircle ? 'OK' : 'MISSING');
await page.click('#answers-toggle');

// switch theme + difficulty
await page.click('[data-theme="ocean"]');
await page.waitForFunction(() => document.querySelector('#pv-meta').textContent.includes('Ocean'));
await page.click('#difficulty-seg [data-value="hard"]');
await page.waitForFunction(() => document.querySelector('#pv-meta').textContent.includes('hard'));
console.log('theme/difficulty switch: OK ->', await page.$eval('#pv-meta', e => e.textContent));
await page.screenshot({ path: join(shotDir, 'desktop-ocean-hard.png') });

// seed reproducibility
await page.evaluate(() => { document.querySelector('#seed-input').value = '123456'; });
await page.$eval('#seed-input', e => e.dispatchEvent(new Event('change')));
await new Promise(r => setTimeout(r, 400));
const svg1 = await page.$eval('#pv-a svg', s => s.innerHTML.length);
await page.$eval('#seed-input', e => e.dispatchEvent(new Event('change')));
await new Promise(r => setTimeout(r, 400));
const svg2 = await page.$eval('#pv-a svg', s => s.innerHTML.length);
console.log('seed reproducibility:', svg1 === svg2 ? 'OK' : `MISMATCH ${svg1} vs ${svg2}`);

// single PDF download
await page.click('#btn-pdf');
await new Promise(r => setTimeout(r, 6000));
let pdfs = readdirSync(dlDir).filter(f => f.endsWith('.pdf'));
console.log('single PDF:', pdfs.length ? `OK ${pdfs[0]} (${statSync(join(dlDir, pdfs[0])).size} bytes)` : 'MISSING');

// batch 3 (free tier)
await page.click('#btn-batch');
await new Promise(r => setTimeout(r, 12000));
pdfs = readdirSync(dlDir).filter(f => f.includes('pack'));
console.log('batch-3 PDF:', pdfs.length ? `OK ${pdfs[0]} (${statSync(join(dlDir, pdfs[0])).size} bytes)` : 'MISSING');

// license: bad key rejected
await page.type('#license-input', 'not-a-key');
await page.click('#license-apply');
await new Promise(r => setTimeout(r, 500));
console.log('bad license msg:', await page.$eval('#license-msg', e => e.textContent));

// license: well-formed key accepted (no product id configured -> format check)
await page.$eval('#license-input', e => { e.value = 'ABCD1234-ABCD1234-ABCD1234-ABCD1234'; });
await page.click('#license-apply');
await new Promise(r => setTimeout(r, 800));
console.log('good license msg:', await page.$eval('#license-msg', e => e.textContent).catch(() => '(box hidden = OK)'));
const proOpt = await page.$eval('#batch-select option[value="25"]', o => !o.disabled);
console.log('pro options unlocked:', proOpt ? 'OK' : 'STILL LOCKED');

// mobile viewport
await page.setViewport({ width: 390, height: 844 });
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: join(shotDir, 'mobile-top.png') });

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
server.close();
console.log('E2E done');
