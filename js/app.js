// Spot the Difference Studio — UI wiring

import { generatePuzzle, DIFF_DEFAULTS, THEMES } from './engine.js';
import { exportPdf } from './pdf.js';

const CONFIG = {
  // shown in PDF footers; uses the real host once deployed, falls back to the target domain locally
  siteUrl: /localhost|127\.0\.0\.1/.test(location.hostname) ? 'spotdifferencestudio.com' : location.host,
  gumroadUrl: 'https://gumroad.com/l/REPLACE_ME', // Pro product URL (set after creating the Gumroad product)
  gumroadProductId: '',                            // optional: enables online license verification
  youtubeUrl: '',                                  // Spot Hunt channel URL for cross-promotion
};

const state = {
  themeId: 'garden',
  difficulty: 'medium',
  diffCount: DIFF_DEFAULTS.medium,
  pageFormat: 'a4',
  layout: 'side',
  seed: null,
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

function regenerate(freshSeed = true) {
  if (freshSeed || !state.seed) state.seed = newSeed();
  state.puzzle = generatePuzzle({
    themeId: state.themeId,
    difficulty: state.difficulty,
    diffCount: state.diffCount,
    seed: state.seed,
  });
  $('#seed-input').value = state.seed;
  renderPreview();
}

function renderPreview() {
  const p = state.puzzle;
  if (!p) return;
  $('#pv-a').innerHTML = p.svgA;
  $('#pv-b').innerHTML = state.showAnswers ? p.svgAnswer : p.svgB;
  $('#pv-meta').textContent = `Puzzle #${p.seed} · ${THEMES[p.themeId].label} · ${p.difficulty} · ${p.count} differences`;
  $('#pv-imgs').classList.toggle('side', state.layout === 'side');
  // print area mirrors the current puzzle
  $('#print-title').textContent = 'Spot the Difference!';
  $('#print-sub').textContent = `Can you find all ${p.count} differences?`;
  $('#print-a').innerHTML = p.svgA;
  $('#print-b').innerHTML = p.svgB;
  $('#print-foot').textContent = `Puzzle #${p.seed} · free printables at ${CONFIG.siteUrl}`;
}

/* ---------- events ---------- */

function bind() {
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
    if (v > 0) { state.seed = v; regenerate(false); }
  });
  $('#seed-random').addEventListener('click', () => regenerate(true));

  $('#btn-generate').addEventListener('click', () => regenerate(true));

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
      const puzzles = [];
      for (let i = 0; i < n; i++) {
        puzzles.push(generatePuzzle({
          themeId: state.themeId,
          difficulty: state.difficulty,
          diffCount: state.diffCount,
          seed: newSeed(),
        }));
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
  regenerate(true);
});
