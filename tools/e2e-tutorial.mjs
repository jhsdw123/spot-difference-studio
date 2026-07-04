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

/* ---------- guided round (fixed pair, answer-demo masks) ---------- */
await page.waitForFunction(() => window.__sh.state.round?.running, { timeout: 45000 });
const pid = await page.evaluate(() => window.__sh.state.puzzle.id);
if (pid !== 'sd_mr4rwrru_loz3') finding(`tutorial uses random pair ${pid}, expected fixed sd_mr4rwrru_loz3`);
else ok('tutorial uses the fixed hand-verified pair');

await page.waitForSelector('.tut-mask', { timeout: 8000 }).then(() => ok('answer demo: mask + ring shown'))
  .catch(() => finding('answer demo mask missing'));
const tl1 = await page.evaluate(() => window.__sh.state.round.timeLeft);
await sleep(1300);
const tl2 = await page.evaluate(() => window.__sh.state.round.timeLeft);
if (tl1 - tl2 > 0.2) finding(`clock not frozen during demo (${tl1.toFixed(1)} -> ${tl2.toFixed(1)})`);
else ok('clock frozen during answer demo');
await page.screenshot({ path: 'audit/tour-demo1.png' });

const box = await page.$eval('#panel-a', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
const tapRing = async () => {
  const c = await page.evaluate(() => {
    const ring = document.querySelector('.tut-mask .tut-ring');
    return ring ? { x: +ring.getAttribute('cx'), y: +ring.getAttribute('cy') } : null;
  });
  if (!c) return false;
  await page.touchscreen.tap(box.x + c.x / 100 * box.w, box.y + c.y / 100 * box.w);
  await sleep(400);
  return true;
};

await tapRing(); // demo answer 1
let found = await page.evaluate(() => window.__sh.state.round.found.size);
if (found !== 1) finding(`demo tap 1 did not register (found=${found})`);
const burst = await page.evaluate(() => !!document.querySelector('.burst'));
if (!burst) finding('no star burst on a correct tap'); else ok('correct tap fires star burst');
await tapRing(); // demo answer 2
found = await page.evaluate(() => window.__sh.state.round.found.size);
if (found !== 2) finding(`demo tap 2 did not register (found=${found})`);
else ok('both demo answers tappable via rings');

// progress-UI spotlight
await waitTour('progress').then(() => ok('progress-UI spotlight appears after 2 finds'))
  .catch(() => finding('progress-UI spotlight missing'));
await page.screenshot({ path: 'audit/tour-progress.png' });
await tourNext();

// free play: clock resumes, masks gone
const maskGone = await page.evaluate(() => !document.querySelector('.tut-mask'));
if (!maskGone) finding('mask still up in free play');
const tlA = await page.evaluate(() => window.__sh.state.round.timeLeft);
await sleep(1100);
const tlB = await page.evaluate(() => window.__sh.state.round.timeLeft);
if (!(tlA - tlB > 0.4)) finding(`clock did not resume in free play (${tlA.toFixed(1)} -> ${tlB.toFixed(1)})`);
else ok('clock resumes for free play');

// deliberate miss: X should shake + −6s penalty
const missPt = await page.evaluate(() => {
  const rs = window.__sh.state.round.puzzle.regions;
  let best = null, bd = -1;
  for (let x = 4; x <= 96; x += 4) for (let y = 4; y <= 96; y += 4) {
    const d = Math.min(...rs.map(r => Math.hypot(r.x - x, r.y - y)));
    if (d > bd) { bd = d; best = { x, y }; }
  }
  return best;
});
const tlBeforeMiss = await page.evaluate(() => window.__sh.state.round.timeLeft);
await page.touchscreen.tap(box.x + missPt.x / 100 * box.w, box.y + missPt.y / 100 * box.w);
await sleep(200);
const miss = await page.evaluate(() => ({
  x: !!document.querySelector('.miss-x'),
  tl: window.__sh.state.round.timeLeft,
}));
if (!miss.x) finding('no shaking X on a wrong tap');
else if (tlBeforeMiss - miss.tl < 5) finding('miss penalty not applied');
else ok('wrong tap: shaking X + −6s');
await sleep(500);

// find 3rd and 4th -> hint lesson at one-left
const tapUnfound = async () => {
  const c = await page.evaluate(() => {
    const r = window.__sh.state.round;
    const i = r.puzzle.regions.findIndex((_, k) => !r.found.has(k));
    return r.puzzle.regions[i];
  });
  await page.touchscreen.tap(box.x + c.x / 100 * box.w, box.y + c.y / 100 * box.w);
  await sleep(400);
};
await tapUnfound();
await tapUnfound();
await waitTour('A·B').then(() => ok('hint lesson appears at one-left'))
  .catch(() => finding('hint lesson missing at one-left'));
await page.screenshot({ path: 'audit/tour-hint-bubble.png' });
await tourNext();

// new hint flow: freeze -> 3·2·1 -> 1.5s A/B strobe
await page.tap('#btn-hint');
await page.waitForSelector('.hint-count', { timeout: 3000 }).then(() => ok('hint countdown shows'))
  .catch(() => finding('hint countdown missing'));
const ht1 = await page.evaluate(() => window.__sh.state.round.timeLeft);
await sleep(1000);
const ht2 = await page.evaluate(() => window.__sh.state.round.timeLeft);
if (ht1 - ht2 > 0.2) finding('clock not frozen during hint countdown');
else ok('clock frozen during hint');
await page.waitForFunction(() => document.querySelector('.blink-img.strobe'), { timeout: 4000 })
  .then(() => ok('A·B strobe starts after countdown'))
  .catch(() => finding('strobe never started'));
await page.screenshot({ path: 'audit/hint-strobe.png' });
await sleep(2000);
const hint = await page.evaluate(() => ({
  strobing: !!document.querySelector('.blink-img.strobe'),
  counting: !!document.querySelector('.hint-count'),
  used: window.__sh.state.round.hintsUsed,
  frozen: window.__sh.state.round.frozen,
  cls: document.querySelector('#btn-hint').className,
}));
if (hint.strobing || hint.counting) finding('hint visuals stuck on');
if (hint.frozen) finding('clock still frozen after hint');
if (hint.used !== 1) finding(`hintsUsed=${hint.used} after hint`);
if (!hint.cls.includes('used')) finding(`hint button not disabled after use (class="${hint.cls}")`);
else ok('hint is once-per-game and cleans up');

// progress pill visibility
const pill = await page.evaluate(() => {
  const el = document.querySelector('#found-count');
  const b = el.querySelector('b');
  return { html: el.innerHTML, big: b && parseFloat(getComputedStyle(b).fontSize) >= 18 };
});
if (!pill.big) finding(`found-progress count not prominent: ${pill.html}`);
else ok('found-progress pill renders big count');

await tapUnfound(); // last one
const win = await page.evaluate(() => ({
  banner: !!document.querySelector('.congrats-banner'),
  confetti: !!document.querySelector('canvas'),
  bursts: document.querySelectorAll('.burst').length,
}));
if (!win.banner) finding('Congratulations banner missing on completion');
if (!win.confetti) finding('confetti rain missing on completion');
else ok(`completion: banner + confetti + ${win.bursts} answer bursts`);
await page.screenshot({ path: 'audit/win-celebration.png' });
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
