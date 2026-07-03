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
await new Promise(r => server.listen(8943, r));
const browser = await puppeteer.launch({ headless: 'new' });
async function mk(name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on('console', m => console.log(`[${name}]`, m.type(), m.text().slice(0, 200)));
  page.on('pageerror', e => console.log(`[${name}] ERR`, e.message));
  await page.goto('http://localhost:8943/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 25000 });
  await page.tap('#btn-versus');
  await page.evaluate(n => { document.querySelector('#vs-name').value = n; }, name);
  return page;
}
const host = await mk('H');
const guest = await mk('G');
await host.tap('#vs-create');
await host.waitForFunction(() => /^[A-Z0-9]{4}$/.test(document.querySelector('#vs-code-big').textContent), { timeout: 15000 });
const code = await host.$eval('#vs-code-big', e => e.textContent);
console.log('code:', code);
// host presence self-check
console.log('host presence:', await host.evaluate(() => JSON.stringify(window.__sh.versus.__debugState?.() || 'n/a')));
await guest.type('#vs-code-input', code);
await guest.tap('#vs-join');
await new Promise(r => setTimeout(r, 8000));
console.log('guest entry msg:', JSON.stringify(await guest.$eval('#vs-entry-msg', e => e.textContent)));
console.log('guest step on:', await guest.$$eval('.vs-step', els => els.filter(e => e.classList.contains('on')).map(e => e.dataset.step)));
console.log('guest presence dump:', await guest.evaluate(() => {
  const v = window.__sh.versus;
  return JSON.stringify(v.__presence ? v.__presence() : 'no hook');
}));
await browser.close(); server.close();
