// Onboarding + tutorial + blink-hint E2E for Spot Hunt.
// Usage: node e2e-tutorial.mjs [baseUrl]
import puppeteer from 'puppeteer';

const BASE = process.argv[2] || 'http://127.0.0.1:8124/';
const findings = [];
const finding = t => { findings.push(t); console.log('FINDING:', t); };
const ok = t => console.log('OK:', t);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', e => finding('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') finding('console: ' + m.text().slice(0, 150)); });
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

const tourText = () => page.evaluate(() => document.querySelector('#tour .tour-text')?.textContent || '');
// bubbles ignore clicks for ~350ms after opening (synthetic-click guard) —
// wait out the arming window before pressing
const tourNext = async () => { await sleep(450); await page.tap('#tour [data-act="next"]'); await sleep(250); };
const waitTour = (needle, timeout = 10000) =>
  page.waitForFunction((n) => document.querySelector('#tour .tour-text')?.textContent.includes(n), { timeout }, needle);

/* ---------- first visit: coach marks ---------- */
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 30000 });

await waitTour('PLAY').then(() => ok('step 1 shows solo instructions (style + PLAY)'))
  .catch(async () => finding('tour step 1 missing: "' + await tourText() + '"'));
const spot1 = await page.evaluate(() => {
  const s = document.querySelector('#tour .tour-spot')?.getBoundingClientRect();
  const p = document.querySelector('#btn-play').getBoundingClientRect();
  return s && s.top <= p.top && s.bottom >= p.bottom;
});
if (!spot1) finding('step 1 spotlight does not frame the PLAY button'); else ok('step 1 spotlight frames PLAY');
await page.screenshot({ path: 'audit/tour-step1.png' });
await tourNext();

await waitTour('Versus').then(() => ok('step 2 explains Versus + room code'))
  .catch(async () => finding('tour step 2 missing: "' + await tourText() + '"'));
const code = await tourText();
if (!/room code/i.test(code)) finding('step 2 does not mention the room code');
await page.screenshot({ path: 'audit/tour-step2.png' });
await tourNext();

await waitTour('first puzzle').catch(async () => finding('tour step 3 missing: "' + await tourText() + '"'));
await tourNext(); // ▶ Start tutorial

/* ---------- guided round ---------- */
await waitTour('differences', 45000).then(() => ok('tutorial intro bubble appears'))
  .catch(() => finding('tutorial intro bubble missing'));
let paused = await page.evaluate(() => window.__sh.state.round && !window.__sh.state.round.running);
if (!paused) finding('round not paused during intro bubble'); else ok('timer paused during bubble');
await page.screenshot({ path: 'audit/tour-round-intro.png' });
await tourNext();
await page.waitForFunction(() => window.__sh.state.round?.running, { timeout: 5000 });
ok('round resumes after intro');

const regions = await page.evaluate(() => window.__sh.state.puzzle.regions.map(r => ({ x: r.x, y: r.y })));
const box = await page.$eval('#panel-a', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
const tapRegion = async (i) => { await page.touchscreen.tap(box.x + regions[i].x / 100 * box.w, box.y + regions[i].y / 100 * box.w); await sleep(350); };

await tapRegion(0);
await waitTour('+4s').then(() => ok('first-find bubble (+4s/−6s) appears'))
  .catch(() => finding('first-find bubble missing'));
await tourNext();

for (let i = 1; i < regions.length - 1; i++) await tapRegion(i);
await waitTour('💡').then(() => ok('hint bubble appears at one-left'))
  .catch(() => finding('hint bubble missing at one-left'));
await page.screenshot({ path: 'audit/tour-hint-bubble.png' });
await tourNext();

// blink hint: strobes the opposite image, once per game
await page.tap('#btn-hint');
const blinked = await page.waitForFunction(() => document.querySelector('.blink-img.on'), { timeout: 3000 }).then(() => true).catch(() => false);
if (!blinked) finding('blink hint overlay did not strobe'); else ok('blink hint strobes A/B overlap');
await page.screenshot({ path: 'audit/hint-blink.png' });
await sleep(900);
const hint = await page.evaluate(() => ({
  gone: !document.querySelector('.blink-img.on'),
  used: window.__sh.state.round.hintsUsed,
  cls: document.querySelector('#btn-hint').className,
}));
if (!hint.gone) finding('blink overlay stuck on');
if (hint.used !== 1) finding(`hintsUsed=${hint.used} after hint`);
if (!hint.cls.includes('used')) finding(`hint button not disabled after use (class="${hint.cls}")`);
else ok('hint is once-per-game (button disabled after use)');

// progress pill visibility
const pill = await page.evaluate(() => {
  const el = document.querySelector('#found-count');
  const b = el.querySelector('b');
  return { html: el.innerHTML, big: b && parseFloat(getComputedStyle(b).fontSize) >= 18 };
});
if (!pill.big) finding(`found-progress count not prominent: ${pill.html}`);
else ok('found-progress pill renders big count');

await tapRegion(regions.length - 1);
await page.waitForFunction(() => document.querySelector('#result').classList.contains('on'), { timeout: 8000 });
ok('tutorial puzzle completed -> win screen');
const flag = await page.evaluate(() => localStorage.getItem('sh_tour'));
if (flag !== '1') finding(`sh_tour flag not set (=${flag})`);

/* ---------- second visit: no tour; ❓ replays it ---------- */
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 30000 });
await sleep(1500);
const tourAgain = await page.evaluate(() => !!document.querySelector('#tour'));
if (tourAgain) finding('tour shows again on a return visit'); else ok('no tour on return visits');
await page.tap('#btn-help');
await waitTour('PLAY', 5000).then(() => ok('❓ button replays the tour'))
  .catch(() => finding('❓ button does not open the tour'));
await sleep(450); // arming window
await page.tap('#tour [data-act="skip"]');
await sleep(300);
const closed = await page.evaluate(() => !document.querySelector('#tour'));
if (!closed) finding('skip does not close the tour');

console.log(`\n=== tutorial summary: ${findings.length} finding(s) ===`);
findings.forEach((f, i) => console.log(`${i + 1}. ${f}`));
await browser.close();
process.exit(findings.length ? 1 : 0);
