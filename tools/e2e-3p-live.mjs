import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new' });
async function mk(name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('https://spothuntstudio.com/spot-hunt/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 25000 });
  await page.tap('#btn-versus');
  await page.evaluate(n => { document.querySelector('#vs-name').value = n; }, name);
  return page;
}
const host = await mk('나');
const g1 = await mk('친구1');
const g2 = await mk('친구2');
await host.tap('#vs-create');
await host.waitForFunction(() => /^[A-Z0-9]{4}$/.test(document.querySelector('#vs-code-big').textContent), { timeout: 15000 });
const code = await host.$eval('#vs-code-big', e => e.textContent);
console.log('LIVE room:', code);
for (const [n, p] of [['친구1', g1], ['친구2', g2]]) {
  await p.type('#vs-code-input', code);
  await p.tap('#vs-join');
  await p.waitForFunction(() => document.querySelector('[data-step="guest"]').classList.contains('on') ||
    document.querySelector('#vs-entry-msg').textContent.length > 0, { timeout: 25000 });
  const msg = await p.$eval('#vs-entry-msg', e => e.textContent);
  console.log(n, msg ? 'REJECTED: ' + msg : 'joined OK');
}
await host.waitForFunction(() => document.querySelector('.vs-player-count')?.textContent.includes('3/8'), { timeout: 15000 });
console.log('host roster:', await host.$$eval('.vs-player', els => els.map(e => e.textContent.trim())));
console.log('count label:', await host.$eval('.vs-player-count', e => e.textContent));
console.log('START enabled:', await host.$eval('#vs-start', e => !e.disabled));
await host.screenshot({ path: 'live-lobby-3p.png' });
console.log('3P LIVE OK');
await browser.close();
