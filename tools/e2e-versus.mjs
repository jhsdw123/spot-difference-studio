// E2E: full 3-player versus match — hurry-up alarm, race halt, greyout+reveal,
// review phase, per-round ranking, and the final leaderboard.
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, sep } from 'node:path';

const root = 'C:/Users/User/AutoIncome_2026/spot-hunt-game';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith(sep) || p.endsWith('/')) p = join(p, 'index.html');
  try { res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8942, r));

const browser = await puppeteer.launch({ headless: 'new' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function mk(name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`[${name}] PAGEERROR:`, e.message));
  page.on('console', m => { if (m.type() === 'error') console.log(`[${name}]`, m.text().slice(0, 140)); });
  page.on('dialog', d => d.accept());
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:8942/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 25000 });
  await page.tap('#btn-versus');
  await page.evaluate(n => { document.querySelector('#vs-name').value = n; }, name);
  return page;
}

const host = await mk('Host');
const alice = await mk('Alice');
const bob = await mk('Bob');

await host.tap('#vs-create');
await host.waitForFunction(() => /^[A-Z0-9]{4}$/.test(document.querySelector('#vs-code-big').textContent), { timeout: 15000 });
const code = await host.$eval('#vs-code-big', e => e.textContent);
console.log('room:', code);

for (const p of [alice, bob]) {
  await p.type('#vs-code-input', code);
  await p.tap('#vs-join');
  await p.waitForFunction(() => document.querySelector('[data-step="guest"]').classList.contains('on'), { timeout: 20000 });
}
await host.waitForFunction(() => document.querySelector('#vs-status').textContent.includes('3 players'), { timeout: 15000 });
console.log('lobby: 3 players OK |', await host.$eval('.vs-player-count', e => e.textContent));

await host.tap('#vs-start');
const players = [['host', host], ['alice', alice], ['bob', bob]];

async function waitRoundRunning() {
  for (const [n, p] of players) {
    await p.waitForFunction(() => document.querySelector('#screen-game').classList.contains('active') &&
      !document.querySelector('#veil').classList.contains('on') &&
      window.__sh.versus.currentRound()?.running, { timeout: 45000 });
  }
}

async function aliceWinsRound(checkExtras) {
  const regions = await alice.evaluate(() => window.__sh.versus.currentRound().puzzle.regions);
  const box = await alice.$eval('#panel-b', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  // find all but one
  for (let i = 0; i < regions.length - 1; i++) {
    await alice.touchscreen.tap(box.x + regions[i].x / 100 * box.w, box.y + regions[i].y / 100 * box.w);
    await sleep(320);
  }
  if (checkExtras) {
    await sleep(1000);
    // opponents see Alice's live progress + the hurry-up siren
    const pill = await host.$$eval('.opp-pill', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    console.log('host opp pills:', pill);
    const hurry = await bob.evaluate(() => !!document.querySelector('.hurry'));
    console.log('bob hurry-up shown:', hurry ? 'OK' : 'MISSING');
  }
  // finish
  const last = regions[regions.length - 1];
  await alice.touchscreen.tap(box.x + last.x / 100 * box.w, box.y + last.y / 100 * box.w);
}

/* ---------- round 1: with extra checks ---------- */
await waitRoundRunning();
console.log('round 1 running on all 3');
await aliceWinsRound(true);

// race halt -> everyone enters review phase (reveal rings + greyout for losers)
await host.waitForFunction(() => document.body.classList.contains('review'), { timeout: 15000 });
console.log('host review phase:', await host.evaluate(() => ({
  greyout: document.body.classList.contains('player-done'),
  rings: document.querySelectorAll('#panel-a .reveal-ring').length,
  banner: document.querySelector('#done-banner')?.textContent,
})));

// round result with ranking rows
await host.waitForFunction(() => document.querySelector('#result').classList.contains('on'), { timeout: 15000 });
console.log('host round result:', await host.$eval('#result-title', e => e.textContent));
console.log('host ranking rows:', await host.$$eval('#result-list .rank-row', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim())));
console.log('alice round result:', await alice.$eval('#result-title', e => e.textContent));

/* ---------- rounds 2 & 3: alice sweeps ---------- */
async function dump(tag) {
  for (const [n, p] of players) {
    console.log(tag, n, await p.evaluate(() => ({
      level: document.querySelector('#game-level').textContent,
      veil: document.querySelector('#veil').classList.contains('on'),
      result: document.querySelector('#result').classList.contains('on'),
      title: document.querySelector('#result-title').textContent,
      running: !!window.__sh.versus.currentRound()?.running,
      review: document.body.classList.contains('review'),
    })));
  }
}
for (let r = 2; r <= 3; r++) {
  for (const [, p] of players) {
    await p.waitForFunction(rr => document.querySelector('#game-level').textContent.includes(`Round ${rr}`), { timeout: 30000 }, r).catch(async e => { await dump('STUCK r' + r); throw e; });
  }
  await waitRoundRunning();
  console.log(`round ${r} running`);
  await aliceWinsRound(false);
  await host.waitForFunction(() => document.querySelector('#result').classList.contains('on'), { timeout: 25000 }).catch(async e => {
    for (const [n, p] of players) {
      console.log('STUCK123', n, await p.evaluate(() => {
        const v = window.__sh.versus.__vs();
        return { found: document.querySelector('#found-count').textContent,
          running: !!v.round?.running, finished: !!v.round?.finished,
          inRound: v.inRound, results: Object.keys(v.results).length,
          roundIdx: v.roundIdx, misses: v.round?.misses };
      }));
    }
    throw e;
  });
  await sleep(500);
}

/* ---------- final leaderboard ---------- */
await alice.waitForFunction(() => document.querySelector('#result-title').textContent.includes('win the match'), { timeout: 30000 });
console.log('alice final:', await alice.$eval('#result-title', e => e.textContent));
console.log('host final:', await host.$eval('#result-title', e => e.textContent));
console.log('leaderboard (host view):', await host.$$eval('#result-list .rank-row', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim())));
console.log('rematch button (host):', await host.$eval('#btn-next', e => e.textContent + ' disabled=' + e.disabled));
console.log('rematch button (alice):', await alice.$eval('#btn-next', e => e.textContent + ' disabled=' + e.disabled));

console.log('MULTI VERSUS E2E OK');
await browser.close(); server.close();
