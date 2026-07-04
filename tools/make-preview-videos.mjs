// CrazyGames preview videos (<=20s): real gameplay recorded via puppeteer
// screencast, then converted to H.264 MP4. Usage: node make-preview-videos.mjs [baseUrl]
import puppeteer from 'puppeteer';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { rmSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8124/';
const OUT = resolve(import.meta.dirname, '../../spot-hunt-game/tools/dist/assets');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

async function record(name, { width, height, mobile }) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('sh_tour', '1'); localStorage.setItem('sh_mode', 'toon'); localStorage.setItem('sh_level_toon', '0'); } catch {}
  });
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__sh?.state.sequence.length > 0, { timeout: 30000 });

  const webm = join(OUT, `${name}.webm`);
  const recorder = await page.screencast({ path: webm });
  await sleep(1000); // a beat on the home screen

  const press = async (sel) => mobile ? page.tap(sel) : page.click(sel);
  await press('#btn-play');
  await page.waitForFunction(() => window.__sh.state.round?.running, { timeout: 45000 });

  const regions = await page.evaluate(() => window.__sh.state.puzzle.regions.map(r => ({ x: r.x, y: r.y })));
  const box = await page.$eval('#panel-a', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  const tapAt = async (r) => {
    const x = box.x + r.x / 100 * box.w, y = box.y + r.y / 100 * box.w;
    if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
  };

  // natural-paced finds, then the cinematic hint, then the win celebration
  for (let i = 0; i < regions.length - 1; i++) {
    await sleep(i === 0 ? 900 : 1300);
    await tapAt(regions[i]);
  }
  await sleep(700);
  await press('#btn-hint'); // 3·2·1 + A·B strobe (~3.7s)
  await sleep(4300);
  await tapAt(regions[regions.length - 1]); // Congratulations + confetti
  await sleep(3300);

  await recorder.stop();
  await page.close();

  const mp4 = join(OUT, `preview-${name}.mp4`);
  execSync(`ffmpeg -y -i "${webm}" -t 19.5 -c:v libx264 -pix_fmt yuv420p -r 30 -vf "scale=${width}:${height}" -movflags +faststart -an "${mp4}"`, { stdio: 'pipe' });
  rmSync(webm);
  console.log('made', mp4);
}

await record('landscape', { width: 1920, height: 1080, mobile: false });
await record('portrait', { width: 1080, height: 1920, mobile: true });
await browser.close();
console.log('done');
