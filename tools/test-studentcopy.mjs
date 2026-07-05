// generate the QR-free student copy locally and save it for visual review
import puppeteer from 'puppeteer';
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(import.meta.dirname, 'answers-test');
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  try {
    const body = readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(8123, r));

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT, eventsEnabled: true });
await page.goto('http://localhost:8123/answers.html?p=5', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));
await page.click('#printbtn');
const target = join(OUT, 'spot-the-difference-puzzle-5-student-copy.png');
for (let i = 0; i < 40 && !existsSync(target); i++) await new Promise(r => setTimeout(r, 250));
if (!existsSync(target)) throw new Error('download did not appear. dir: ' + readdirSync(OUT).join(', '));
if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
console.log('student copy ->', target);
await browser.close();
server.close();
