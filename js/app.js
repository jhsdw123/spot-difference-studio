// Spot the Difference Studio — UI wiring

import { generatePuzzle, DIFF_DEFAULTS, THEMES } from './engine.js';
import { exportPdf } from './pdf.js';
import { loadLibrary, librarySize, getPhotoPuzzle, samplePhotoPuzzles, photoSvg } from './library.js';

const CONFIG = {
  // shown in PDF footers; uses the real host once deployed, falls back to the target domain locally
  siteUrl: /localhost|127\.0\.0\.1/.test(location.hostname) ? 'spotdifferencestudio.com' : location.host,
  gumroadUrl: 'https://gumroad.com/l/REPLACE_ME', // Pro product URL (set after creating the Gumroad product)
  gumroadProductId: '',                            // optional: enables online license verification
  youtubeUrl: '',                                  // Spot Hunt channel URL for cross-promotion
};

const state = {
  style: 'photo',              // 'photo' (illustrated library) | 'classic' (procedural SVG)
  themeId: 'garden',
  difficulty: 'medium',
  diffCount: DIFF_DEFAULTS.medium,
  pageFormat: 'a4',
  layout: 'side',
  bw: false,
  seed: null,
  photoNum: null,
  puzzle: null,
  showAnswers: false,
  pro: false,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/* ---------- license ---------- */

const LICENSE_RE = /^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/i;

async function checkLicense(key) {
  if (!LICENSE_RE.test(key.trim())) return { ok: false, msg: 'That does not look like a license key.' };
  if (CONFIG.gumroadProductId) {
    try {
      const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ product_id: CONFIG.gumroadProductId, license_key: key.trim() }),
      });
      const data = await res.json();
      if (!data.success) return { ok: false, msg: 'License key not found. Check for typos.' };
    } catch (e) { /* offline / CORS — fall through to format acceptance */ }
  }
  return { ok: true };
}

function applyPro(on) {
  state.pro = on;
  $$('#batch-select option[data-pro]').forEach(o => { o.disabled = !on; });
  $('#pro-status').textContent = on ? 'Pro is active on this device. Thank you!' : '';
  $('#license-box').style.display = on ? 'none' : '';
}

/* ---------- generation ---------- */

function newSeed() { return Math.floor(Math.random() * 900000) + 100000; }

async function regenerate(fresh = true) {
  if (state.style === 'photo') {
    try {
      await loadLibrary();
    } catch (e) {
      // library not deployed — fall back to classic so the tool still works
      setStyle('classic');
      return;
    }
    state.puzzle = getPhotoPuzzle(fresh ? null : state.photoNum);
    state.photoNum = state.puzzle.num;
    $('#seed-input').value = state.photoNum;
  } else {
    if (fresh || !state.seed) state.seed = newSeed();
    state.puzzle = generatePuzzle({
      themeId: state.themeId,
      difficulty: state.difficulty,
      diffCount: state.diffCount,
      seed: state.seed,
      bw: state.bw,
    });
    $('#seed-input').value = state.seed;
  }
  renderPreview();
}

function renderPreview() {
  const p = state.puzzle;
  if (!p) return;
  if (p.photo) {
    $('#pv-a').innerHTML = photoSvg(p.aUrl);
    $('#pv-b').innerHTML = photoSvg(p.bUrl, state.showAnswers ? p.regions : null);
    $('#pv-meta').textContent = `Photo #${p.num} of ${librarySize()} · ${p.count} differences`;
    $('#print-a').innerHTML = photoSvg(p.aUrl);
    $('#print-b').innerHTML = photoSvg(p.bUrl);
    $('#print-foot').textContent = `Photo #${p.num} · free printables at ${CONFIG.siteUrl}`;
  } else {
    $('#pv-a').innerHTML = p.svgA;
    $('#pv-b').innerHTML = state.showAnswers ? p.svgAnswer : p.svgB;
    $('#pv-meta').textContent = `Puzzle #${p.seed} · ${THEMES[p.themeId].label} · ${p.difficulty} · ${p.count} differences`;
    $('#print-a').innerHTML = p.svgA;
    $('#print-b').innerHTML = p.svgB;
    $('#print-foot').textContent = `Puzzle #${p.seed} · free printables at ${CONFIG.siteUrl}`;
  }
  $('#pv-imgs').classList.toggle('side', state.layout === 'side');
  $('#print-title').textContent = 'Spot the Difference!';
  $('#print-sub').textContent = `Can you find all ${p.count} differences?`;
}

function setStyle(style) {
  state.style = style;
  $$('#style-seg button').forEach(b => b.classList.toggle('active', b.dataset.value === style));
  document.body.classList.toggle('photo-mode', style === 'photo');
  regenerate(true);
}

/* ---------- events ---------- */

function bind() {
  $$('#style-seg button').forEach(btn => btn.addEventListener('click', () => setStyle(btn.dataset.value)));

  $$('.theme-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.themeId = btn.dataset.theme;
    regenerate();
  }));

  $$('#difficulty-seg button').forEach(btn => btn.addEventListener('click', () => {
    $$('#difficulty-seg button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.value;
    state.diffCount = DIFF_DEFAULTS[state.difficulty];
    $('#diff-count').value = state.diffCount;
    regenerate();
  }));

  $('#diff-count').addEventListener('change', (e) => {
    state.diffCount = Math.max(3, Math.min(15, parseInt(e.target.value, 10) || 8));
    e.target.value = state.diffCount;
    regenerate(false);
  });

  $('#page-format').addEventListener('change', (e) => { state.pageFormat = e.target.value; });

  $$('#layout-seg button').forEach(btn => btn.addEventListener('click', () => {
    $$('#layout-seg button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.layout = btn.dataset.value;
    renderPreview();
  }));

  $('#seed-input').addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10);
    if (v > 0) {
      if (state.style === 'photo') state.photoNum = v; else state.seed = v;
      regenerate(false);
    }
  });
  $('#seed-random').addEventListener('click', () => regenerate(true));

  $('#btn-generate').addEventListener('click', () => regenerate(true));

  $('#bw-toggle').addEventListener('change', (e) => {
    state.bw = e.target.checked;
    regenerate(false);
  });

  $('#answers-toggle').addEventListener('change', (e) => {
    state.showAnswers = e.target.checked;
    renderPreview();
  });

  $('#btn-print').addEventListener('click', () => window.print());

  $('#btn-pdf').addEventListener('click', async () => {
    const btn = $('#btn-pdf');
    btn.disabled = true; btn.textContent = 'Preparing PDF…';
    try {
      await exportPdf([state.puzzle], { pageFormat: state.pageFormat, siteUrl: CONFIG.siteUrl });
    } finally {
      btn.disabled = false; btn.textContent = '⬇ Download PDF';
    }
  });

  $('#btn-batch').addEventListener('click', async () => {
    const n = parseInt($('#batch-select').value, 10);
    if (n > 3 && !state.pro) { location.hash = '#pro'; return; }
    const btn = $('#btn-batch');
    btn.disabled = true;
    try {
      let puzzles;
      if (state.style === 'photo') {
        await loadLibrary();
        puzzles = samplePhotoPuzzles(n);
      } else {
        puzzles = [];
        for (let i = 0; i < n; i++) {
          puzzles.push(generatePuzzle({
            themeId: state.themeId,
            difficulty: state.difficulty,
            diffCount: state.diffCount,
            seed: newSeed(),
            bw: state.bw,
          }));
        }
      }
      await exportPdf(puzzles, {
        pageFormat: state.pageFormat, siteUrl: CONFIG.siteUrl,
        onProgress: (i, total) => { btn.textContent = `Rendering ${i}/${total}…`; },
      });
    } finally {
      btn.disabled = false; btn.textContent = 'Generate pack';
    }
  });

  $('#license-apply').addEventListener('click', async () => {
    const key = $('#license-input').value;
    const msg = $('#license-msg');
    msg.className = 'license-msg';
    msg.textContent = 'Checking…';
    const res = await checkLicense(key);
    if (res.ok) {
      localStorage.setItem('sds_license', key.trim());
      msg.classList.add('ok'); msg.textContent = 'Pro unlocked. Enjoy!';
      applyPro(true);
    } else {
      msg.classList.add('err'); msg.textContent = res.msg;
    }
  });

  $$('.gumroad-link').forEach(a => { a.href = CONFIG.gumroadUrl; });
  if (CONFIG.youtubeUrl) {
    const yt = $('#yt-link');
    if (yt) { yt.href = CONFIG.youtubeUrl; yt.style.display = ''; }
  }
}

/* ---------- init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  bind();
  if (localStorage.getItem('sds_license')) applyPro(true);
  setStyle(state.style);
});
