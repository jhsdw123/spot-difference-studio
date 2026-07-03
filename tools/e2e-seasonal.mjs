import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('https://jhsdw123.github.io/spot-difference-studio/', { waitUntil: 'networkidle0', timeout: 45000 });
await page.waitForSelector('#pv-a svg');
for (const t of ['christmas', 'halloween']) {
  await page.click(`[data-theme="${t}"]`);
  await page.waitForFunction(l => document.querySelector('#pv-meta').textContent.toLowerCase().includes(l), {}, t);
  console.log(t, 'live: OK ->', await page.$eval('#pv-meta', e => e.textContent));
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
