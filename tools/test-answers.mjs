// verify answers.html live: screen view screenshot + print-view PDF (QR-free copy)
import puppeteer from 'puppeteer';
import { resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, 'answers-test');
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.setViewport({ width: 900, height: 1200 });
await page.goto('https://spothuntstudio.com/spot-difference-studio/answers.html?p=5', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));

const shown = await page.evaluate(() => ({
  count: document.getElementById('count').textContent,
  resultVisible: !document.getElementById('result').hidden,
  marks: document.querySelectorAll('#marks ellipse').length,
  downloadBtn: document.getElementById('printbtn').textContent,
}));
console.log(JSON.stringify(shown, null, 1));
await page.screenshot({ path: OUT + '/screen.png', fullPage: false });
if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
console.log('OK ->', OUT);
await browser.close();
