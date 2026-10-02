/* rack-motion.browser.mjs — BASINS' animated drag and drop in the kit's rack (Josh, 2026-10-02: "Yes to basins animated
 * drag and drop, Let the windows title bar be the deciding factor whether a window goes above or below something").
 * On gallery/rack.html (the kit's racks) and tests/fixtures/rack-basins.html (BASINS' markup, adopted):
 *   · folding a window (a real click on its fold button, hit-tested) animates its HEIGHT and the window below travels
 *     with it, frame by frame (no step larger than a third of the travel), and both end exactly on the layout;
 *   · a header drag reversed halfway then Escape lands every window exactly where it began;
 *   · under reduced motion the same fold jumps (one frame, no animation);
 *   · idle after the motion is zero frames;
 *   · THE TITLE BAR DECIDES: a window dragged by its header goes above its neighbour exactly when the middle of its
 *     title bar crosses the neighbour's middle — at three heights of the dragged window (2 px either side).
 * Standalone: MIR_BASE=http://127.0.0.1:8795 node tests/rack-motion.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8795';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 860 });
const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const key = async (k, code, vk) => { await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); };
const hit = async (expr) => JSON.parse(await p.eval(`(() => { const e = (${expr}); const b = e.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
  const f = document.elementFromPoint(x, y); return JSON.stringify({ x, y, ok: !!f && (f === e || e.contains(f)) }); })()`));
const click = async (expr) => { const h = await hit(expr); await mouse('mouseMoved', h.x, h.y); await mouse('mousePressed', h.x, h.y); await mouse('mouseReleased', h.x, h.y); return h; };
const ev = async (body) => JSON.parse(await p.eval(`(async () => { const M = await import('${BASE}/mir/core/motion.js');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const dev = (id) => document.querySelector('.dev[data-id="' + id + '"]');
  const settle = async () => { for (let i = 0; i < 8; i++) { await Promise.all([...document.querySelectorAll('.dev')].map((d) => M.settled(d))); await wait(30); } };
  const snap = () => [...document.querySelectorAll('#rack .dev:not(.closed), #rackL .dev:not(.closed)')].map((d) => { const b = d.getBoundingClientRect(); return d.dataset.id + '@' + Math.round(b.top) + '/' + Math.round(b.height); }).join(' ');
  ${body} })().then(JSON.stringify)`));

/* the fold, sampled every frame: the folding window's height and the top of the window below */
const foldProof = async (label, card, below) => {
  await ev(`window.__fold = []; window.__on = true; const tick = () => { if (!window.__on) return; const a = dev('${card}').getBoundingClientRect(), b = dev('${below}').getBoundingClientRect();
    window.__fold.push([a.height, b.top]); requestAnimationFrame(tick); }; requestAnimationFrame(tick); return 0;`);
  const h = await click(`document.querySelector('.dev[data-id="${card}"] .dev-fold')`);
  await sleep(600);
  const r = await ev(`window.__on = false; await settle(); const s = window.__fold, a = dev('${card}'), b = dev('${below}');
    const hs = s.map((x) => x[0]), ts = s.map((x) => x[1]); const steps = (v) => v.slice(1).map((x, i) => Math.abs(x - v[i]));
    const travel = Math.abs(ts[ts.length - 1] - ts[0]), hTravel = Math.abs(hs[hs.length - 1] - hs[0]);
    const end = { h: a.getBoundingClientRect().height, top: b.getBoundingClientRect().top };
    return { folded: a.classList.contains('folded'), frames: s.length, distinct: new Set(ts.map(Math.round)).size, travel, hTravel,
      maxStep: Math.max(...steps(ts)), maxHStep: Math.max(...steps(hs)), endExact: Math.abs(end.top - ts[ts.length - 1]) < 0.5 && Math.abs(end.h - hs[hs.length - 1]) < 0.5,
      clean: a.getAnimations().length === 0 && b.getAnimations().length === 0 && !a.classList.contains('rack-sizing') };`);
  check(`${label}: a real click folds the window; its height animates and the window below travels with it, frame by frame, ending exactly`,
    h.ok && r.folded && r.travel > 20 && r.distinct >= 6 && r.maxStep < r.travel / 3 && r.maxHStep < r.hTravel / 3 && r.endExact && r.clean, JSON.stringify(r));
  await click(`document.querySelector('.dev[data-id="${card}"] .dev-fold')`); await sleep(500);
};

/* the title-bar rule: drag `card` (made `h` px tall) by its header up toward `above`; 2 px below the neighbour's middle
   it stays below, 2 px above it goes above */
const barProof = async (label, card, above, heights) => {
  const out = [];
  for (const H of heights) {
    const g = await ev(`const c = dev('${card}'); c.querySelector('.dev-body').style.minHeight = '${H}px'; await settle();
      const n = dev('${above}').getBoundingClientRect(), head = c.querySelector('.dev-eyebrow').getBoundingClientRect(), hd = c.querySelector('.dev-head').getBoundingClientRect();
      return { nMid: n.top + n.height / 2, x: Math.round(head.left + head.width / 2), y: Math.round(head.top + head.height / 2), barMid: hd.top + hd.height / 2, h: Math.round(c.getBoundingClientRect().height), order: snap() };`);
    /* the pointer at (x, y) holds the bar's middle at y + (barMid − y); put the bar's middle at nMid ± 2 */
    const off = g.barMid - g.y, yBelow = Math.round(g.nMid + 2 - off), yAbove = Math.round(g.nMid - 2 - off);
    await mouse('mouseMoved', g.x, g.y); await mouse('mousePressed', g.x, g.y);
    for (let i = 1; i <= 10; i++) { await mouse('mouseMoved', g.x, Math.round(g.y + ((yBelow - g.y) * i) / 10)); await sleep(16); }
    await sleep(80);
    const below = await ev(`return { order: [...dev('${card}').parentElement.querySelectorAll('.dev:not(.closed)')].map((d) => d.dataset.id) };`);
    for (let i = 1; i <= 2; i++) { await mouse('mouseMoved', g.x, Math.round(yBelow + ((yAbove - yBelow) * i) / 2)); await sleep(30); }
    await sleep(80);
    const aboveR = await ev(`const o = [...document.querySelectorAll('.mir-prox[data-prox="capture"]')].map((x) => { const b = x.getBoundingClientRect(); return Math.round(b.top); });
      return { order: [...dev('${card}').parentElement.querySelectorAll('.dev:not(.closed)')].map((d) => d.dataset.id), slotTop: o[0], cardLayoutTop: Math.round(dev('${card}').parentElement.getBoundingClientRect().top + dev('${card}').offsetTop - dev('${card}').parentElement.scrollTop) };`);
    await key('Escape', 'Escape', 27); await sleep(80);
    const back = await ev(`await settle(); return snap();`);
    const ok = below.order.indexOf(card) > below.order.indexOf(above) && aboveR.order.indexOf(card) < aboveR.order.indexOf(above) && Math.abs(aboveR.slotTop - aboveR.cardLayoutTop) <= 1 && back === g.order;
    out.push({ H: g.h, ok, below: below.order.join(), above: aboveR.order.join(), slot: [aboveR.slotTop, aboveR.cardLayoutTop], escaped: back === g.order });
    await ev(`dev('${card}').querySelector('.dev-body').style.minHeight = ''; await settle(); return 0;`);
  }
  check(`${label}: THE TITLE BAR DECIDES — 2 px below the neighbour's middle the window stays below, 2 px above it goes above (the slot drawn there), at three heights; Escape puts it back`,
    out.every((o) => o.ok) && new Set(out.map((o) => o.H)).size === 3, JSON.stringify(out));
};

try {
  /* ── 1. the kit's own racks: gallery/rack.html ───────────────────────────────────────────────────────────── */
  await p.goto(BASE + '/gallery/rack.html?reset', 1500);
  await ev(`__R.rack.open('mix'); __R.rack.open('scope'); await settle(); return 0;`);   // the right rack: scope, mix, tone
  await foldProof('gallery', 'mix', 'tone');

  /* a drag reversed halfway, then Escape: exactly where it began */
  let before = await ev(`return snap();`);
  let g = await hit(`document.querySelector('.dev[data-id="scope"] .dev-eyebrow')`);
  await mouse('mouseMoved', g.x, g.y); await mouse('mousePressed', g.x, g.y);
  for (let i = 1; i <= 10; i++) { await mouse('mouseMoved', g.x, g.y + i * 40); await sleep(16); }
  const mid = await ev(`return snap();`);
  for (let i = 1; i <= 5; i++) { await mouse('mouseMoved', g.x, g.y + 400 - i * 40); await sleep(16); }
  await p.shot('docs/plates/rack/rack-motion-mid-drag.png');
  await key('Escape', 'Escape', 27); await sleep(80);
  let after = await ev(`await settle(); return { s: snap(), anims: [...document.querySelectorAll('.dev')].reduce((n, d) => n + d.getAnimations().length, 0), tr: [...document.querySelectorAll('.dev')].map((d) => d.style.translate).join('') };`);
  check('gallery: a header drag that moved the others, reversed halfway, then Escape: every window exactly where it began, clean', g.ok && mid !== before && after.s === before && after.anims === 0 && !after.tr, JSON.stringify({ before, mid, after }));

  /* idle after the motion: zero frames */
  let r = await ev(`let n = 0; const raf0 = requestAnimationFrame; window.requestAnimationFrame = (f) => { n++; return raf0(f); };
    await wait(800); window.requestAnimationFrame = raf0; return { raf: n, frames: window.__MIR && window.__MIR.perf ? 'perf' : 'none' };`);
  check('gallery: idle after the motion books no frame', r.raf === 0, JSON.stringify(r));

  /* reduced motion: the same fold jumps */
  r = await ev(`M.setMotionPolicy('reduced'); const a = dev('mix'), b = dev('tone'); const t0 = b.getBoundingClientRect().top;
    a.querySelector('.dev-fold').click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const t1 = b.getBoundingClientRect().top, anims = a.getAnimations().length + b.getAnimations().length; await wait(400); const t2 = b.getBoundingClientRect().top;
    a.querySelector('.dev-fold').click(); await wait(100); M.setMotionPolicy('auto'); return { moved: Math.round(t0 - t1), anims, after: Math.round(t1 - t2) };`);
  check('gallery: under reduced motion the fold jumps — the window below is at its new place the next frame, no animation', r.moved > 20 && r.anims === 0 && r.after === 0, JSON.stringify(r));

  /* a plate mid-fold */
  await ev(`dev('mix').querySelector('.dev-fold').click(); await wait(120); return 0;`);
  if (process.env.MIR_PLATES) await p.shot('docs/plates/rack/rack-motion-mid-fold.png');   // a test run never writes into docs/: MIR_PLATES=1 retakes it
  await ev(`await settle(); dev('mix').querySelector('.dev-fold').click(); await settle(); return 0;`);

  await barProof('gallery', 'tone', 'mix', [180, 380, 560]);

  /* ── 2. BASINS' markup, adopted: tests/fixtures/rack-basins.html ──────────────────────────────────────────── */
  await p.goto(BASE + '/tests/fixtures/rack-basins.html', 1200);
  await foldProof('BASINS markup', 'controls', 'settings');
  await barProof('BASINS markup', 'history', 'settings', [160, 360, 540]);
  check('no page raised an exception', !p.logs.some((l) => l.startsWith('EXCEPTION')), p.logs.join(' | '));
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} rack motion checks pass`);
if (failed) process.exit(1);
