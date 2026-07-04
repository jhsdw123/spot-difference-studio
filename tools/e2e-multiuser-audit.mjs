// Multi-account live audit for Spot Hunt — plays real matches with several
// simulated players (separate browser contexts) against the deployed site and
// reports anomalies. Usage: node e2e-multiuser-audit.mjs <s0|s1|s3|s4|s5|s6> [url]
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';

const SCENARIO = process.argv[2] || 's1';
const URL = process.argv[3] || 'https://jhsdw123.github.io/spot-hunt/';
const SHOT_DIR = new globalThis.URL('./audit/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(SHOT_DIR, { recursive: true });

const findings = [];
const finding = (t) => { findings.push(t); console.log('FINDING:', t); };
const ok = (t) => console.log('OK:', t);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

async function mkPlayer(name, { width = 390, height = 844 } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const events = [];
  page.on('pageerror', e => { events.push(`pageerror: ${e.message}`); console.log(`[${name}] pageerror:`, e.message); });
  page.on('console', m => { if (m.type() === 'error') { events.push(`console: ${m.text()}`); console.log(`[${name}] console.error:`, m.text().slice(0, 200)); } });
  page.on('dialog', async d => { events.push(`dialog: ${d.message()}`); console.log(`[${name}] DIALOG:`, d.message()); await d.accept(); });
  await page.setViewport({ width, height, isMobile: true, hasTouch: true });
  // skip the first-run onboarding tour — these scenarios drive the UI directly
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('sh_tour', '1'); } catch {} });
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 30000 });
  return { name, ctx, page, events };
}

const vsEval = (p, fn) => p.page.evaluate(fn);

// tap with diagnostics: on failure, report where the element is and what covers it
async function tapUI(p, sel) {
  try { await p.page.tap(sel); return true; }
  catch (e) {
    const diag = await p.page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return { missing: true };
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(Math.min(r.x + r.width / 2, innerWidth - 1), Math.min(r.y + r.height / 2, innerHeight - 1));
      return {
        rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        viewport: { w: innerWidth, h: innerHeight },
        offscreen: r.right > innerWidth || r.x < 0 || r.bottom > innerHeight || r.y < 0,
        coveredBy: top && top !== el && !el.contains(top) && !top.contains(el) ? (top.id ? '#' + top.id : top.className || top.tagName) : null,
      };
    }, sel).catch(() => null);
    finding(`${p.name}: tap ${sel} failed (${e.message.split('\n')[0]}) diag=${JSON.stringify(diag)}`);
    return false;
  }
}
const enterVersus = async (p) => {
  await p.page.tap('#btn-versus');
  await p.page.evaluate(n => { document.querySelector('#vs-name').value = n; }, p.name);
};

async function createRoom(host) {
  await enterVersus(host);
  await host.page.tap('#vs-create');
  await host.page.waitForFunction(() => /^[A-Z0-9]{4}$/.test(document.querySelector('#vs-code-big').textContent), { timeout: 20000 });
  return host.page.$eval('#vs-code-big', e => e.textContent);
}

async function joinRoom(p, code, { expectReject = false } = {}) {
  await enterVersus(p);
  await p.page.type('#vs-code-input', code);
  await p.page.tap('#vs-join');
  await p.page.waitForFunction(() =>
    document.querySelector('[data-step="guest"]').classList.contains('on') ||
    document.querySelector('#vs-entry-msg').textContent.length > 0, { timeout: 30000 });
  const msg = await p.page.$eval('#vs-entry-msg', e => e.textContent);
  const joined = await p.page.$eval('[data-step="guest"]', e => e.classList.contains('on'));
  if (expectReject && joined) finding(`${p.name}: expected rejection but joined room ${code}`);
  return { joined, msg };
}

// wait until this player's round <idx> is actually running (countdown done)
async function waitRoundRunning(p, idx, timeout = 60000) {
  await p.page.waitForFunction((i) => {
    const v = window.__sh?.versus.__vs();
    return v && v.roundIdx === i && v.round && v.round.running === true;
  }, { timeout }, idx);
}

async function tapRegions(p, n, { delay = 500, skipFirst = 0 } = {}) {
  const regions = await vsEval(p, () => {
    const v = window.__sh.versus.__vs();
    return v.puzzles[v.roundIdx].regions.map(r => ({ x: r.x, y: r.y }));
  });
  const box = await p.page.$eval('#panel-a', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  const picks = regions.slice(skipFirst, skipFirst + n);
  for (const r of picks) {
    const running = await vsEval(p, () => window.__sh.versus.__vs().round?.running === true);
    if (!running) return false;
    await p.page.touchscreen.tap(box.x + r.x / 100 * box.w, box.y + r.y / 100 * box.w);
    await sleep(delay);
  }
  return true;
}

const puzzleCount = (p) => vsEval(p, () => { const v = window.__sh.versus.__vs(); return v.puzzles[v.roundIdx].count; });

// force everyone's timer to expire (tests the timeout/forceSettle path quickly)
const expireTimer = (p, secs = 2.5) => vsEval(p, () => { const v = window.__sh.versus.__vs(); if (v.round) v.round.timeLeft = 2.5; });

async function waitSettled(players, roundIdx, timeout = 40000) {
  // round result board shows, then auto-advances; detect via inRound=false + result list visible
  for (const p of players) {
    await p.page.waitForFunction((i) => {
      const v = window.__sh?.versus.__vs();
      return v && v.roundIdx === i && !v.inRound &&
        document.querySelector('#result').classList.contains('on') &&
        document.querySelector('#result-list').style.display !== 'none';
    }, { timeout }, roundIdx);
  }
}

async function shot(p, file) { try { await p.page.screenshot({ path: SHOT_DIR + file }); } catch {} }

/* ================= scenarios ================= */

async function s0_solo() {
  const p = await mkPlayer('Solo');
  const t0 = Date.now();
  await p.page.tap('#btn-play');
  await p.page.waitForFunction(() => !document.querySelector('#veil').classList.contains('on') && window.__sh.state.round?.running, { timeout: 45000 });
  console.log(`solo: PLAY -> running in ${((Date.now() - t0) / 1000).toFixed(1)}s (incl. 1.9s countdown)`);
  const regions = await p.page.evaluate(() => window.__sh.state.puzzle.regions.map(r => ({ x: r.x, y: r.y })));
  const box = await p.page.$eval('#panel-a', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  for (const r of regions) {
    await p.page.touchscreen.tap(box.x + r.x / 100 * box.w, box.y + r.y / 100 * box.w);
    await sleep(350);
  }
  await p.page.waitForFunction(() => document.querySelector('#result').classList.contains('on'), { timeout: 8000 });
  ok('solo win overlay shown: ' + await p.page.$eval('#result-title', e => e.textContent));
  await p.page.tap('#btn-next');
  await p.page.waitForFunction(() => window.__sh.state.round?.running, { timeout: 45000 });
  ok('solo next puzzle starts');
  // miss penalty sanity: tap a far corner
  const before = await p.page.evaluate(() => window.__sh.state.round.timeLeft);
  await p.page.touchscreen.tap(box.x + 2, box.y + 2);
  await sleep(300);
  const after = await p.page.evaluate(() => window.__sh.state.round.timeLeft);
  if (before - after < 5) finding(`solo: miss penalty not applied (before=${before.toFixed(1)} after=${after.toFixed(1)})`);
  else ok('solo miss penalty applied');
  await shot(p, 's0-solo.png');
}

async function s1_fullMatch() {
  const host = await mkPlayer('Host');
  const g1 = await mkPlayer('Kim');
  const g2 = await mkPlayer('Lee');
  const g3 = await mkPlayer('Park');
  const all = [host, g1, g2, g3];
  const guests = [g1, g2, g3];

  const code = await createRoom(host);
  console.log('room:', code);
  for (const g of guests) {
    const { joined, msg } = await joinRoom(g, code);
    if (!joined) { finding(`${g.name} could not join: ${msg}`); return; }
  }
  await host.page.waitForFunction(() => document.querySelector('.vs-player-count')?.textContent.includes('4/8'), { timeout: 15000 });
  ok('lobby shows 4/8 on host');

  // lobby chat both directions
  await host.page.type('#chat-input-lobby', 'hello from host');
  await host.page.tap('#chat-send-lobby');
  await g2.page.waitForFunction(() => document.querySelector('#chat-msgs-lobby').textContent.includes('hello from host'), { timeout: 10000 });
  await g2.page.type('#chat-input-lobby', 'hi!');
  await g2.page.tap('#chat-send-lobby');
  await host.page.waitForFunction(() => document.querySelector('#chat-msgs-lobby').textContent.includes('hi!'), { timeout: 10000 });
  ok('lobby chat both directions');
  await shot(host, 's1-lobby.png');

  await host.page.tap('#vs-start');
  for (const p of all) await waitRoundRunning(p, 0);
  ok('round 1 running for all 4');

  /* --- round 1: host races to finish; g1 taps 2; hurry-up + race-halt checks --- */
  const count = await puzzleCount(host);
  await tapRegions(g1, 2, { delay: 400 });
  await tapRegions(host, count - 1, { delay: 420 });
  // hurry-up should fire on opponents (count>=3)
  let hurrySeen = false;
  const hurryDeadline = Date.now() + 4000;
  while (Date.now() < hurryDeadline && !hurrySeen) {
    hurrySeen = await vsEval(g2, () => !!document.querySelector('.hurry'));
    if (!hurrySeen) await sleep(200);
  }
  if (hurrySeen) ok('hurry-up siren shown on opponent'); else finding('hurry-up overlay not seen on opponent within 4s of leader reaching n-1');
  // host progress pill on g3
  const pill = await vsEval(g3, () => document.querySelector('#opp-list').textContent);
  if (!pill.includes(`${count - 1}/${count}`)) finding(`opponent progress pill stale on Park: "${pill.trim().slice(0, 80)}"`);
  else ok('live progress pills update');

  // in-game chat: g3 opens panel, sends; host should get feed line + unread badge
  if (await tapUI(g3, '#btn-chat')) {
    await sleep(450); // panel slide-in
    await g3.page.type('#chat-input-game', 'gg');
    await tapUI(g3, '#chat-send-game');
    await tapUI(g3, '#chat-close');
    await host.page.waitForFunction(() => document.querySelector('#chat-feed').textContent.includes('gg'), { timeout: 8000 })
      .then(() => ok('in-game chat feed line delivered'))
      .catch(() => finding('in-game chat feed line NOT delivered to host within 8s'));
    const badge = await vsEval(host, () => document.querySelector('#chat-badge').classList.contains('on'));
    if (!badge) finding('unread chat badge not lit on host'); else ok('unread badge lit');
  } else {
    await shot(g3, 's1-chatbtn-fail.png');
  }

  await tapRegions(host, 1, { skipFirst: count - 1, delay: 300 });
  // race rule: everyone else should be halted with banner
  await g2.page.waitForFunction(() => {
    const v = window.__sh.versus.__vs();
    return v.results[v.myId] && v.round && v.round.finished;
  }, { timeout: 10000 }).then(() => ok('race rule halts unfinished players'))
    .catch(() => finding('race rule: Lee not halted within 10s of host completing'));
  const banner = await vsEval(g2, () => document.querySelector('#done-banner')?.textContent || '');
  if (!banner.includes('found them all')) finding(`race banner wrong/missing on Lee: "${banner}"`);
  await shot(g2, 's1-race-halt.png');

  await waitSettled(all, 0);
  const rows = await vsEval(host, () => [...document.querySelectorAll('#result-list .rank-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  console.log('round1 ranking:', rows);
  if (rows.length !== 4) finding(`round1 ranking has ${rows.length} rows, expected 4`);
  if (!rows[0].includes('Host')) finding(`round1: completer not ranked 1st: "${rows[0]}"`);
  else ok('round1 ranking: completer first, 4 rows');
  await shot(host, 's1-round1-rank.png');

  /* --- round 2: everyone times out (accelerated) -> rank by found count --- */
  for (const p of all) await waitRoundRunning(p, 1, 90000);
  ok('round 2 running for all (round transition clean)');
  await tapRegions(g2, 3, { delay: 350 });
  await tapRegions(g3, 1, { delay: 350 });
  for (const p of all) await expireTimer(p);
  // everyone should grey out + reveal answers, then settle
  await g2.page.waitForFunction(() => document.body.classList.contains('player-done'), { timeout: 15000 })
    .then(() => ok('personal timeout: grey-out class applied'))
    .catch(() => finding('personal timeout: player-done class not applied on Lee'));
  const rings = await vsEval(g3, () => document.querySelectorAll('#inner-a .reveal-ring').length);
  if (!rings) finding('timeout: reveal rings not shown on Park');
  else ok(`timeout reveal rings shown (${rings})`);
  await shot(g2, 's1-timeout-grey.png');
  await waitSettled(all, 1, 60000);
  const rows2 = await vsEval(g1, () => [...document.querySelectorAll('#result-list .rank-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  console.log('round2 ranking (timeout, by found):', rows2);
  if (!rows2[0].includes('Lee')) finding(`round2: top scorer by found not 1st: "${rows2[0]}"`);
  else ok('round2 timeout ranking by found count');

  /* --- round 3: different winner (g1) -> tally/scoreline check --- */
  for (const p of all) await waitRoundRunning(p, 2, 90000);
  const c3 = await puzzleCount(g1);
  await tapRegions(g1, c3, { delay: 380 });
  await waitSettled(all, 2, 60000);
  ok('round 3 settled');

  // final leaderboard
  for (const p of all) {
    await p.page.waitForFunction(() => window.__sh.versus.__vs().matchOver === true, { timeout: 20000 });
  }
  const board = await vsEval(host, () => [...document.querySelectorAll('#result-list .rank-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  console.log('final board:', board);
  const btn = await vsEval(g1, () => ({ text: document.querySelector('#btn-next').textContent, disabled: document.querySelector('#btn-next').disabled }));
  if (!btn.disabled) finding('guest rematch button not disabled at final board');
  await shot(host, 's1-final-board.png');
  ok('final leaderboard shown on all');

  /* --- rematch: guests must get a clean new round 1 --- */
  await host.page.tap('#btn-next');
  let rematchClean = true;
  for (const p of all) {
    const started = await p.page.waitForFunction(() => {
      const v = window.__sh.versus.__vs();
      return v.active && v.roundIdx === 0 && v.inRound;
    }, { timeout: 30000 }).then(() => true).catch(() => false);
    if (!started) { finding(`rematch: ${p.name} did not enter new match`); rematchClean = false; continue; }
    const overlay = await vsEval(p, () => document.querySelector('#result').classList.contains('on'));
    if (overlay) { finding(`rematch: stale result overlay still covering screen on ${p.name}`); rematchClean = false; await shot(p, `s1-rematch-stuck-${p.name}.png`); }
  }
  if (rematchClean) ok('rematch: all 4 entered clean round 1');

  /* --- finish match 2 fast, then leave-at-scoreboard behavior --- */
  for (let r = 0; r < 3; r++) {
    for (const p of all) await waitRoundRunning(p, r, 90000).catch(() => finding(`match2 round ${r + 1}: not all running`));
    const c = await puzzleCount(host);
    await tapRegions(host, c, { delay: 300 });
    await waitSettled(all, r, 60000).catch(() => finding(`match2 round ${r + 1}: settle failed`));
  }
  for (const p of all) await p.page.waitForFunction(() => window.__sh.versus.__vs().matchOver === true, { timeout: 20000 });
  ok('match 2 complete — final board again');

  // guests leave one by one; watch host for alert-kick
  for (const g of [g3, g2]) { await g.page.tap('#btn-result-home'); await sleep(1500); }
  const hostStillOnBoard1 = await vsEval(host, () => document.querySelector('#result').classList.contains('on'));
  await g1.page.tap('#btn-result-home');
  await sleep(2500);
  const hostStillOnBoard2 = await vsEval(host, () => document.querySelector('#result').classList.contains('on'));
  const hostAlert = host.events.find(e => e.startsWith('dialog:'));
  console.log(`host on board after 2 leaves: ${hostStillOnBoard1}, after all leaves: ${hostStillOnBoard2}, alert: ${hostAlert || 'none'}`);
  if (hostAlert) finding(`scoreboard-leave: host got kicked with alert "${hostAlert}" while viewing final standings`);
  else if (!hostStillOnBoard2) finding('scoreboard-leave: host silently kicked off final standings');
  else ok('host keeps final standings after everyone leaves');

  for (const p of all) console.log(`[events ${p.name}]`, p.events.length ? p.events : 'none');
}

async function s3_midRoundDisconnect() {
  const host = await mkPlayer('Host');
  const g1 = await mkPlayer('Kim');
  const g2 = await mkPlayer('Lee');
  const code = await createRoom(host);
  await joinRoom(g1, code); await joinRoom(g2, code);
  await host.page.waitForFunction(() => document.querySelector('.vs-player-count')?.textContent.includes('3/8'), { timeout: 15000 });
  await host.page.tap('#vs-start');
  for (const p of [host, g1, g2]) await waitRoundRunning(p, 0);
  ok('3p match running');

  await tapRegions(g2, 1, { delay: 300 });
  await g2.ctx.close(); // hard disconnect mid-round
  console.log('Lee disconnected mid-round');
  const count = await puzzleCount(host);
  await tapRegions(host, count, { delay: 350 });
  await waitSettled([host, g1], 0, 60000)
    .then(() => ok('round settled without the disconnected player'))
    .catch(() => finding('mid-round disconnect: round did NOT settle within 60s (deadlock)'));
  const rows = await vsEval(host, () => [...document.querySelectorAll('#result-list .rank-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  console.log('ranking rows:', rows);
  if (rows.some(r => r.includes('Lee'))) finding('disconnected player still listed in round ranking');
  await Promise.all([host, g1].map(p => p.page.waitForFunction(() => {
    const v = window.__sh.versus.__vs();
    return v.roundIdx === 1 && v.round?.running;
  }, { timeout: 90000 }).then(() => ok(`${p.name} reached round 2 after disconnect`)).catch(() => finding(`${p.name} stuck before round 2 after disconnect`))));
  for (const p of [host, g1]) console.log(`[events ${p.name}]`, p.events.length ? p.events : 'none');
}

async function s4_lateJoiner() {
  const host = await mkPlayer('Host');
  const g1 = await mkPlayer('Kim');
  const code = await createRoom(host);
  await joinRoom(g1, code);
  await host.page.waitForFunction(() => !document.querySelector('#vs-start').disabled, { timeout: 15000 });
  await host.page.tap('#vs-start');
  for (const p of [host, g1]) await waitRoundRunning(p, 0);

  const late = await mkPlayer('Late');
  const { joined, msg } = await joinRoom(late, code);
  console.log('late joiner mid-match:', joined ? 'entered guest lobby' : `rejected: ${msg}`);
  if (joined) {
    const status = await vsEval(late, () => document.querySelector('[data-step="guest"] .vs-status')?.textContent);
    if (/in progress/i.test(status)) ok(`late joiner notified: "${status}"`);
    else finding(`late joiner status lacks match-in-progress notice: "${status}"`);
    await shot(late, 's4-late-lobby.png');
  }

  // finish the match quickly (host completes all 3 rounds)
  for (let r = 0; r < 3; r++) {
    for (const p of [host, g1]) await waitRoundRunning(p, r, 90000);
    const c = await puzzleCount(host);
    await tapRegions(host, c, { delay: 300 });
    await waitSettled([host, g1], r, 60000);
  }
  for (const p of [host, g1]) await p.page.waitForFunction(() => window.__sh.versus.__vs().matchOver === true, { timeout: 20000 });
  await host.page.tap('#btn-next'); // rematch — roster now includes the late joiner
  const lateIn = await late.page.waitForFunction(() => {
    const v = window.__sh.versus.__vs();
    return v.active && v.inRound;
  }, { timeout: 30000 }).then(() => true).catch(() => false);
  console.log('late joiner pulled into rematch:', lateIn);
  if (lateIn) {
    const running = await late.page.waitForFunction(() => window.__sh.versus.__vs().round?.running, { timeout: 30000 }).then(() => true).catch(() => false);
    if (running) ok('late joiner plays in rematch'); else finding('late joiner in rematch but round never starts for them');
  } else {
    finding('late joiner NOT included in rematch (stuck in lobby forever)');
  }
  for (const p of [host, g1, late]) console.log(`[events ${p.name}]`, p.events.length ? p.events : 'none');
}

async function s5_roomFull() {
  const host = await mkPlayer('Host');
  const code = await createRoom(host);
  const guests = [];
  for (let i = 1; i <= 7; i++) {
    const g = await mkPlayer(`P${i}`);
    guests.push(g);
    const { joined, msg } = await joinRoom(g, code);
    if (!joined) finding(`P${i} (player ${i + 1}/8) rejected unexpectedly: ${msg}`);
  }
  await host.page.waitForFunction(() => document.querySelector('.vs-player-count')?.textContent.includes('8/8'), { timeout: 20000 })
    .then(() => ok('8/8 lobby fills'))
    .catch(async () => finding('lobby never showed 8/8: ' + await vsEval(host, () => document.querySelector('.vs-player-count')?.textContent)));
  const ninth = await mkPlayer('P8');
  const { joined, msg } = await joinRoom(ninth, code, { expectReject: true });
  if (!joined && msg.includes('full')) ok(`9th player rejected: "${msg}"`);
  else if (joined) finding('9th player slipped into a full room');
  await shot(host, 's5-full-lobby.png');
  // can a full 8p match actually start?
  await host.page.tap('#vs-start');
  let runningCount = 0;
  for (const p of [host, ...guests]) {
    const r = await waitRoundRunning(p, 0, 90000).then(() => true).catch(() => false);
    if (r) runningCount++;
  }
  console.log(`8p match: ${runningCount}/8 players running`);
  if (runningCount < 8) finding(`8p match start: only ${runningCount}/8 got into the round`);
  else ok('full 8-player match starts for everyone');
}

async function s6_badCodes() {
  const p1 = await mkPlayer('Solo1');
  const t0 = Date.now();
  const { joined, msg } = await joinRoom(p1, 'ZZZZ');
  console.log(`bogus code result after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, joined ? 'JOINED (bad)' : msg);
  if (joined) finding('joined a nonexistent room');
  else ok(`bogus code rejected ("${msg}")`);

  // two guests join the same nonexistent code nearly simultaneously
  const a = await mkPlayer('GhostA');
  const b = await mkPlayer('GhostB');
  const [ra, rb] = await Promise.all([joinRoom(a, 'QQQQ'), joinRoom(b, 'QQQQ')]);
  console.log('ghost-room results:', JSON.stringify({ a: ra, b: rb }));
  if (ra.joined || rb.joined) finding('ghost room: guests joining the same wrong code see each other and enter a hostless lobby (no one can ever start)');
  else ok('simultaneous wrong-code joins both rejected');

  // host abandons the lobby -> waiting guest should be told
  const h = await mkPlayer('Host2');
  const g = await mkPlayer('Guest2');
  const code = await createRoom(h);
  await joinRoom(g, code);
  await h.page.tap('#vs-leave-host');
  await g.page.waitForFunction(() => /host left/i.test(document.querySelector('#vs-status-guest')?.textContent || ''), { timeout: 12000 })
    .then(() => ok('waiting guest notified when host leaves the lobby'))
    .catch(async () => finding('waiting guest NOT notified after host left lobby: "' +
      await vsEval(g, () => document.querySelector('#vs-status-guest')?.textContent) + '"'));
}

/* ================= run ================= */
const scenarios = { s0: s0_solo, s1: s1_fullMatch, s3: s3_midRoundDisconnect, s4: s4_lateJoiner, s5: s5_roomFull, s6: s6_badCodes };
const fn = scenarios[SCENARIO];
if (!fn) { console.error('unknown scenario', SCENARIO); process.exit(2); }
try {
  await Promise.race([
    fn(),
    sleep(560000).then(() => { throw new Error('scenario watchdog timeout'); }),
  ]);
} catch (e) {
  finding(`harness error in ${SCENARIO}: ${e.message}`);
}
console.log(`\n=== ${SCENARIO} summary: ${findings.length} finding(s) ===`);
findings.forEach((f, i) => console.log(`${i + 1}. ${f}`));
await browser.close();
process.exit(0);
