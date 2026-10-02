/* info-words.browser.mjs — THE LAW "A LINE NEVER CROSSES WORDS" on the gallery's own pages (gallery/info.html?still).
 *   For every page (the greeting, the trefoil, its motion), bare and on a pane, in both themes, once the bodies rest:
 *   no segment of any leader (on the stage or on the overlay) runs through the words of any label (its title, its
 *   body) or of any block, and a vertical run beside words keeps 10 px from them (it does not graze them).  Real rects (getBoundingClientRect, 1 px in from each edge), real paths (getScreenCTM).
 * Standalone: node tools/serve.mjs 8793 & MIR_BASE=http://127.0.0.1:8793 node tests/info-words.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8851';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

/* runs in the page: every leader segment against every rect of words; → the hits */
const PROBE = `(() => {
  const words = [];
  for (const it of document.querySelectorAll('.mir-info-label, .mir-info-block')) {
    if (it.hasAttribute('data-gone') || getComputedStyle(it).visibility === 'hidden') continue;
    const text = it.querySelector('.mir-info-text');
    for (const c of text.children) {
      const t = c.classList.contains('mir-info-title') ? c.querySelector('span') : c;
      const r = t.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      words.push({ who: (it.textContent || '').trim().slice(0, 18), x: r.left + 1, y: r.top + 1, w: r.width - 2, h: r.height - 2 });
    }
  }
  const clip = (s, b) => { let t0 = 0, t1 = 1; const dx = s[2] - s[0], dy = s[3] - s[1];
    for (const [p, q] of [[-dx, s[0] - b.x], [dx, b.x + b.w - s[0]], [-dy, s[1] - b.y], [dy, b.y + b.h - s[1]]]) {
      if (Math.abs(p) < 1e-9) { if (q < 0) return 0; continue; } const t = q / p;
      if (p < 0) { if (t > t1) return 0; if (t > t0) t0 = t; } else { if (t < t0) return 0; if (t < t1) t1 = t; } }
    return Math.max(0, t1 - t0) * Math.hypot(dx, dy); };
  const hits = [], near = []; let n = 0;
  for (const g of document.querySelectorAll('.mir-info-leader')) {
    if (g.hasAttribute('data-gone') || g.getAttribute('data-state') !== 'in') continue;
    const path = g.querySelector('.mir-info-ink'), d = path.getAttribute('d') || '', m = path.getScreenCTM();
    const nums = (d.match(/-?[\\d.]+/g) || []).map(Number), cmds = d.match(/[ML]/g) || []; let at = null, k = 0;
    for (const c of cmds) {
      const p = new DOMPoint(nums[k++], nums[k++]).matrixTransform(m);
      if (c === 'L' && at) { n++; const s = [at.x, at.y, p.x, p.y]; for (const w of words) { const l = clip(s, w); if (l > 1) hits.push(w.who + ' ← ' + s.map(Math.round).join(',') + ' (' + l.toFixed(1) + ' px)'); }
        /* a vertical run beside words keeps its distance (it does not graze them) */
        if (Math.abs(s[0] - s[2]) < 0.5 && Math.abs(s[1] - s[3]) > 10) for (const w of words) {
          const lo = Math.min(s[1], s[3]), hi = Math.max(s[1], s[3]); if (hi < w.y || lo > w.y + w.h) continue;
          const gap = s[0] < w.x ? w.x - s[0] : s[0] > w.x + w.w ? s[0] - (w.x + w.w) : 0; if (gap < 10) near.push(w.who + ' ' + gap.toFixed(1) + ' px'); } }
      at = p;
    }
  }
  return JSON.stringify({ hits, near, segs: n, words: words.length });
})()`;

const p = await launch({ width: 1280, height: 800 });
try {
  await p.goto(BASE + '/gallery/info.html?still', 2500);
  await p.mouse(640, 120); await sleep(200);
  const probe = async () => JSON.parse(await p.eval(PROBE));
  const pages = ['greeting', 'the trefoil', 'its motion'];
  for (const theme of ['dark', 'light']) {
    for (const pane of [false, true]) {
      await p.eval(`document.body.dataset.theme = '${theme}'; window.__INFO.setPane(${pane}); 0`);
      for (let i = 0; i < pages.length; i++) {
        await p.eval(`(() => { const b = [...document.querySelectorAll('.g-page')][0]; const want = ${i}; const n = +b.textContent.split(' / ')[0] - 1; for (let k = n; k !== want; k = (k + 1) % 3) document.querySelector('[data-info="page-next"]').click(); return 0; })()`);
        await sleep(3200);
        const r = await probe();
        check(`${theme} · ${pane ? 'pane' : 'bare'} · ${pages[i]}: no line crosses or grazes words (${r.segs} segments, ${r.words} rects of words)`, r.hits.length === 0 && r.near.length === 0 && (i === 0 || r.segs > 0), [...r.hits, ...r.near].slice(0, 4).join(' | '));
      }
    }
  }
  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} info words checks FAILED` : `ALL ${results.length} MIR info words browser checks passed`);
process.exit(failed.length ? 1 : 0);
