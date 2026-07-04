// Portal-integration E2E — stubs the CrazyGames/GameDistribution SDKs and
// verifies init events, midgame ad gating, rewarded hints, and portal guards.
// Usage: node e2e-portal.mjs <plain|cg|gd|zip> <baseUrl>
import puppeteer from 'puppeteer';

const MODE = process.argv[2] || 'cg';
const BASE = process.argv[3] || 'http://127.0.0.1:8124/';
const findings = [];
const finding = t => { findings.push(t); console.log('FINDING:', t); };
const ok = t => console.log('OK:', t);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CG_STUB = () => {
  window.__ads = { midgame: 0, rewarded: 0, events: [] };
  window.CrazyGames = {
    SDK: {
      environment: 'local',
      init: async () => { window.__ads.events.push('init'); },
      game: {
        loadingStart: () => window.__ads.events.push('loadingStart'),
        loadingStop: () => window.__ads.events.push('loadingStop'),
        gameplayStart: () => window.__ads.events.push('gameplayStart'),
        gameplayStop: () => window.__ads.events.push('gameplayStop'),
        happytime: () => window.__ads.events.push('happytime'),
      },
      ad: {
        requestAd: (type, cb) => {
          window.__ads[type]++;
          window.__ads.events.push('ad:' + type);
          cb.adStarted();
          setTimeout(() => cb.adFinished(), 600);
        },
      },
    },
  };
};

const GD_STUB = () => {
  window.__ads = { midgame: 0, rewarded: 0, pauses: 0, resumes: 0 };
  window.gdsdk = {
    preloadAd: async () => {},
    showAd: async (type) => {
      if (type === 'rewarded') window.__ads.rewarded++; else window.__ads.midgame++;
      window.__ads.pauses++; window.GD_OPTIONS?.onEvent({ name: 'SDK_GAME_PAUSE' });
      await new Promise(r => setTimeout(r, 400));
      window.__ads.resumes++; window.GD_OPTIONS?.onEvent({ name: 'SDK_GAME_START' });
    },
  };
};

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', e => finding('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') finding('console: ' + m.text().slice(0, 150)); });
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

if (MODE === 'cg' || MODE === 'zip') await page.evaluateOnNewDocument(CG_STUB);
if (MODE === 'gd') await page.evaluateOnNewDocument(GD_STUB);

const url = MODE === 'plain' || MODE === 'zip' ? BASE : `${BASE}?portal=${MODE === 'cg' ? 'crazygames' : 'gd'}`;
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 30000 });

async function winLevel() {
  await page.waitForFunction(() => window.__sh.state.round?.running, { timeout: 45000 });
  const regions = await page.evaluate(() => window.__sh.state.puzzle.regions.map(r => ({ x: r.x, y: r.y })));
  const box = await page.$eval('#panel-a', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  for (const r of regions) {
    await page.touchscreen.tap(box.x + r.x / 100 * box.w, box.y + r.y / 100 * box.w);
    await sleep(300);
  }
  await page.waitForFunction(() => document.querySelector('#result').classList.contains('on'), { timeout: 8000 });
}

if (MODE === 'plain') {
  const leaks = await page.evaluate(() => ({
    cg: !!window.CrazyGames, gd: !!window.gdsdk || !!window.GD_OPTIONS,
    share: document.querySelector('#btn-share').style.display !== 'none',
  }));
  if (leaks.cg || leaks.gd) finding('plain build loaded a portal SDK');
  else ok('plain build: no portal SDKs loaded');
  if (!leaks.share) finding('plain build: share button hidden'); else ok('plain build: share button visible');
  const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  if (!sw) finding('plain build: service worker not registered'); else ok('plain build: SW registered');
  await page.tap('#btn-play');
  await winLevel();
  ok('plain build: solo level playable');
  const hintCls = await page.$eval('#btn-hint', e => e.className);
  if (hintCls.includes('ad')) finding('plain build: hint button offers ads without a portal');
}

if (MODE === 'zip') {
  await page.waitForFunction(() => window.__ads.events.includes('init'), { timeout: 10000 })
    .then(() => ok('zip build: stamped SH_PORTAL initializes CrazyGames SDK'))
    .catch(() => finding('zip build: SDK init event missing'));
  const stamped = await page.evaluate(() => window.SH_PORTAL);
  if (stamped !== 'crazygames') finding(`zip build: SH_PORTAL = ${stamped}`);
  const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  if (sw) finding('zip build: service worker registered inside portal build'); else ok('zip build: no SW');
}

if (MODE === 'cg') {
  const boot = await page.evaluate(() => window.__ads.events);
  for (const ev of ['init', 'loadingStart', 'loadingStop']) {
    if (!boot.includes(ev)) finding(`cg: boot missing ${ev} (got: ${boot.join(',')})`);
  }
  ok('cg boot events: ' + boot.join(','));
  const share = await page.$eval('#btn-share', e => e.style.display === 'none');
  if (!share) finding('cg: share button not hidden in portal mode'); else ok('cg: share button hidden');
  const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  if (sw) finding('cg: SW registered in portal mode'); else ok('cg: no SW in portal mode');

  await page.tap('#btn-play');
  await winLevel();
  const ev1 = await page.evaluate(() => window.__ads.events);
  if (!ev1.includes('gameplayStart')) finding('cg: gameplayStart not sent on round start');
  if (!ev1.includes('gameplayStop')) finding('cg: gameplayStop not sent on win');
  else ok('cg: gameplayStart/Stop sent');

  // midgame gate: not due yet -> no ad on next
  await page.tap('#btn-next');
  await page.waitForFunction(() => window.__sh.state.round?.running, { timeout: 45000 });
  let ads = await page.evaluate(() => window.__ads.midgame);
  if (ads !== 0) finding(`cg: midgame ad fired too early (${ads})`);
  else ok('cg: no midgame ad before gate');

  // rewarded hint: free hint -> AD state -> watch -> extra hint
  await page.tap('#btn-hint');
  await sleep(300);
  let cls = await page.$eval('#btn-hint', e => e.className);
  if (!cls.includes('ad')) finding(`cg: hint button not in AD state after free hint (class="${cls}")`);
  await page.tap('#btn-hint');
  await page.waitForFunction(() => window.__ads.rewarded === 1, { timeout: 6000 })
    .then(() => ok('cg: rewarded ad requested'))
    .catch(() => finding('cg: rewarded ad not requested'));
  await sleep(1200);
  const hintState = await page.evaluate(() => ({
    hintsUsed: window.__sh.state.round?.hintsUsed,
    running: window.__sh.state.round?.running,
    cls: document.querySelector('#btn-hint').className,
  }));
  if (hintState.hintsUsed !== 1) finding(`cg: rewarded hint not granted (hintsUsed=${hintState.hintsUsed})`);
  else ok('cg: rewarded hint granted and consumed');
  if (!hintState.cls.includes('ad')) finding('cg: hint button should offer another ad after reward');

  // wind the clock: gate open -> midgame on next natural break
  await winLevel();
  await page.evaluate(() => { window.__sh.portal.__test.breaks = 2; window.__sh.portal.__test.lastAdAt = Date.now() - 200000; });
  await page.tap('#btn-next');
  await page.waitForFunction(() => window.__ads.midgame === 1, { timeout: 6000 })
    .then(() => ok('cg: midgame ad shown at gated break'))
    .catch(() => finding('cg: midgame ad did not fire when due'));
  await page.waitForFunction(() => window.__sh.state.round?.running, { timeout: 45000 })
    .then(() => ok('cg: next level starts after the ad'))
    .catch(() => finding('cg: game stuck after midgame ad'));
}

if (MODE === 'gd') {
  const opts = await page.evaluate(() => ({ has: !!window.GD_OPTIONS, id: window.GD_OPTIONS?.gameId }));
  if (!opts.has) finding('gd: GD_OPTIONS not set'); else ok(`gd: GD_OPTIONS set (gameId="${opts.id}")`);

  await page.tap('#btn-play');
  await winLevel();
  await page.evaluate(() => { window.__sh.portal.__test.breaks = 2; window.__sh.portal.__test.lastAdAt = Date.now() - 200000; });
  await page.tap('#btn-next');
  await page.waitForFunction(() => window.__ads.midgame === 1, { timeout: 6000 })
    .then(() => ok('gd: midgame showAd called at gated break'))
    .catch(() => finding('gd: midgame showAd not called'));
  await page.waitForFunction(() => window.__sh.state.round?.running, { timeout: 45000 });
  const pr = await page.evaluate(() => window.__ads);
  if (pr.pauses !== pr.resumes || pr.pauses < 1) finding(`gd: pause/resume mismatch ${JSON.stringify(pr)}`);
  else ok('gd: SDK pause/resume handled');

  await page.tap('#btn-hint');
  await sleep(300);
  await page.tap('#btn-hint');
  await page.waitForFunction(() => window.__ads.rewarded === 1, { timeout: 6000 })
    .then(() => ok('gd: rewarded ad flow works'))
    .catch(() => finding('gd: rewarded ad not requested'));
  await sleep(900);
  const hu = await page.evaluate(() => window.__sh.state.round?.hintsUsed);
  if (hu !== 1) finding(`gd: rewarded hint not granted (hintsUsed=${hu})`);
  else ok('gd: rewarded hint granted');
}

console.log(`\n=== portal:${MODE} summary: ${findings.length} finding(s) ===`);
findings.forEach((f, i) => console.log(`${i + 1}. ${f}`));
await browser.close();
process.exit(findings.length ? 1 : 0);
