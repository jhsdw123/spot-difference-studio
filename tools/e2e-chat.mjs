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
await new Promise(r => server.listen(8944, r));
const browser = await puppeteer.launch({ headless: 'new' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function mk(name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`[${name}] ERR`, e.message));
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:8944/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 25000 });
  await page.tap('#btn-versus');
  await page.evaluate(n => { document.querySelector('#vs-name').value = n; }, name);
  return page;
}
const host = await mk('Host');
const guest = await mk('Guest');
await host.tap('#vs-create');
await host.waitForFunction(() => /^[A-Z0-9]{4}$/.test(document.querySelector('#vs-code-big').textContent), { timeout: 15000 });
const code = await host.$eval('#vs-code-big', e => e.textContent);
await guest.type('#vs-code-input', code);
await guest.tap('#vs-join');
await guest.waitForFunction(() => document.querySelector('[data-step="guest"]').classList.contains('on'), { timeout: 20000 });

// lobby chat
await host.type('#chat-input-lobby', 'hello from host!');
await host.tap('#chat-send-lobby');
await guest.waitForFunction(() => document.querySelector('#chat-msgs-lobby').textContent.includes('hello from host!'), { timeout: 10000 });
console.log('lobby chat: OK ->', await guest.$eval('#chat-msgs-lobby .chat-m', e => e.textContent.replace(/\s+/g, ' ').trim()));
await guest.type('#chat-input-lobby', 'hi!! ready 😄');
await guest.tap('#chat-send-lobby');
await host.waitForFunction(() => document.querySelector('#chat-msgs-lobby').textContent.includes('ready'), { timeout: 10000 });
console.log('lobby chat reply: OK');

// in-game chat: toast + badge + panel
await host.waitForFunction(() => !document.querySelector('#vs-start').disabled, { timeout: 15000 });
await host.tap('#vs-start');
for (const p of [host, guest]) {
  await p.waitForFunction(() => document.querySelector('#screen-game').classList.contains('active') &&
    window.__sh.versus.currentRound()?.running, { timeout: 45000 });
}
await guest.tap('#btn-chat');
await sleep(400);
await guest.evaluate(() => { const i = document.querySelector('#chat-input-game'); i.value = 'catch me if you can'; });
await guest.tap('#chat-send-game');
await guest.tap('#chat-close');
await host.waitForFunction(() => document.querySelector('#chat-feed').textContent.includes('catch me'), { timeout: 10000 });
console.log('in-game toast on host: OK');
console.log('host unread badge:', await host.$eval('#chat-badge', e => e.classList.contains('on') ? e.textContent : 'OFF'));
await host.tap('#btn-chat');
await sleep(400);
console.log('host chat panel open:', await host.$eval('#chat-panel', e => e.classList.contains('on')));
console.log('host panel has msg:', await host.$eval('#chat-msgs-game', e => e.textContent.includes('catch me')));
console.log('badge cleared:', await host.$eval('#chat-badge', e => !e.classList.contains('on')));
await host.evaluate(() => { const i = document.querySelector('#chat-input-game'); i.value = 'oh yeah?'; });
await host.tap('#chat-send-game');
await guest.waitForFunction(() => document.querySelector('#chat-feed').textContent.includes('oh yeah'), { timeout: 10000 });
console.log('reply toast on guest: OK');
await guest.screenshot({ path: 'chat-feed.png' });
await host.screenshot({ path: 'chat-panel.png' });
console.log('CHAT E2E OK');
await browser.close(); server.close();
