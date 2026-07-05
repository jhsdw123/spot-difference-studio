// Live verification: two players create/join a room and start a round on the deployed site.
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new' });

async function mk(name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`[${name}] ERR`, e.message));
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('https://spothuntstudio.com/spot-hunt/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 25000 });
  await page.tap('#btn-versus');
  await page.evaluate(n => { document.querySelector('#vs-name').value = n; }, name);
  return page;
}

const host = await mk('LiveHost');
const guest = await mk('LiveGuest');

await host.tap('#vs-create');
await host.waitForFunction(() => /^[A-Z0-9]{4}$/.test(document.querySelector('#vs-code-big').textContent), { timeout: 15000 });
const code = await host.$eval('#vs-code-big', e => e.textContent);
console.log('LIVE room:', code);

await guest.type('#vs-code-input', code);
await guest.tap('#vs-join');
await guest.waitForFunction(() => document.querySelector('[data-step="guest"]').classList.contains('on'), { timeout: 20000 });
await host.waitForFunction(() => !document.querySelector('#vs-start').disabled, { timeout: 20000 });
console.log('LIVE lobby OK:', await host.$eval('#vs-status', e => e.textContent));

await host.tap('#vs-start');
for (const [n, p] of [['host', host], ['guest', guest]]) {
  await p.waitForFunction(() => document.querySelector('#screen-game').classList.contains('active') &&
    !document.querySelector('#veil').classList.contains('on'), { timeout: 45000 });
  console.log('LIVE', n, 'playing:', await p.$eval('#game-level', e => e.textContent));
}
await host.screenshot({ path: 'live-versus.png' });
console.log('LIVE VERSUS OK');
await browser.close();
