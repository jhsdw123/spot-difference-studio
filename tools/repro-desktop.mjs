import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });
await page.setViewport({ width: 1440, height: 900 });
await page.goto('https://jhsdw123.github.io/spot-hunt/', { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 25000 });
await page.click('#btn-play');
await page.waitForFunction(() => !document.querySelector('#veil').classList.contains('on'), { timeout: 30000 }).catch(() => console.log('veil never cleared'));
await new Promise(r => setTimeout(r, 800));
console.log(await page.evaluate(() => {
  const pa = document.querySelector('#panel-a').getBoundingClientRect();
  const img = document.querySelector('#img-a');
  return {
    panel: { w: Math.round(pa.width), h: Math.round(pa.height) },
    imgSrc: img.src.slice(-40), imgComplete: img.complete, imgNatural: img.naturalWidth,
    imgRect: { w: Math.round(img.getBoundingClientRect().width), h: Math.round(img.getBoundingClientRect().height) },
  };
}));
await page.screenshot({ path: 'repro-desktop.png' });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
