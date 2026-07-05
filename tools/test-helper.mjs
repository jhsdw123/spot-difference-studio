// smoke test for pinterest-upload-helper.html v3.1 (done-to-back + undo)
import puppeteer from 'puppeteer';
import { resolve } from 'node:path';

const HELPER = resolve(import.meta.dirname, '../../pinterest-upload-helper.html');
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.evaluateOnNewDocument(() => { window.open = () => null; }); // block the pinterest auto-open in tests
await page.goto('file:///' + HELPER.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

const state = () => page.evaluate(() => ({
  curated: [...document.querySelectorAll('#curated .card h2')].map(h => h.textContent),
  bulkFirst: document.querySelector('#bulk .card h2')?.textContent,
  bulkCount: document.querySelectorAll('#bulk .card').length,
  undoDisabled: document.getElementById('undo').disabled,
  undoCount: document.getElementById('undo-count').textContent,
}));

const s0 = await state();
console.log('initial curated order:', s0.curated.join(', '));
console.log('bulk rendered:', s0.bulkCount, '| first bulk:', s0.bulkFirst, '| undo disabled:', s0.undoDisabled);

// check the first curated pin (pin-kids.png) as done
await page.click('#curated .card input[data-done]');
await new Promise(r => setTimeout(r, 300));
const s1 = await state();
console.log('after check  :', s1.curated.join(', '), '| undo:', s1.undoCount, 'disabled:', s1.undoDisabled);
if (s1.curated[s1.curated.length - 1] !== 'pin-kids.png') throw new Error('FAIL: checked pin did not move to back');
if (s1.undoDisabled) throw new Error('FAIL: undo button should be enabled');

// check a bulk pin too
await page.click('#bulk .card input[data-done]');
await new Promise(r => setTimeout(r, 300));
const s2 = await state();
console.log('after bulk check, undo count:', s2.undoCount);

// undo twice -> both restored
await page.click('#undo');
await new Promise(r => setTimeout(r, 200));
await page.click('#undo');
await new Promise(r => setTimeout(r, 300));
const s3 = await state();
console.log('after 2x undo:', s3.curated.join(', '), '| first bulk:', s3.bulkFirst, '| undo disabled:', s3.undoDisabled);
if (s3.curated[0] !== 'pin-kids.png') throw new Error('FAIL: undo did not restore curated order');
if (JSON.stringify(s3.curated) !== JSON.stringify(s0.curated)) throw new Error('FAIL: curated order mismatch after undo');
if (s3.bulkFirst !== s0.bulkFirst) throw new Error('FAIL: bulk order mismatch after undo');
if (!s3.undoDisabled) throw new Error('FAIL: undo should be disabled when stack empty');

if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
console.log('ALL PASS ✓');
await browser.close();
