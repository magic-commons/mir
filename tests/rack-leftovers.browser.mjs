/* rack-leftovers.browser.mjs — BASINS' rack leftovers in the kit (tests/fixtures/rack-leftovers.html), real input through
 * CDP, every press hit-tested with elementFromPoint first.
 *   1. the scrollbar seated at the card column: it stands at the gutter's inner edge beside the cards, the native bar is
 *      off, a real drag of its thumb scrolls the rack, End reaches the bottom, a rack with no overflow has none, and a
 *      hidden rack takes it away
 *   2. a retired id in a saved layout opens its heir
 *   3. RESET LAYOUT returns a window carried off the rack (and a folded, a closed and a powered-off one) home
 *   4. a ☆ layout keeps the notebook's size
 *   5. the touch-tablet clamp: under touch emulation at 1280 px a float is kept wholly inside the viewport
 * Standalone: MIR_BASE=http://127.0.0.1:8846 node tests/rack-leftovers.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8795';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  const load = async (q = '') => { await p.goto(BASE + '/tests/fixtures/rack-leftovers.html' + q, 600); for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100); await sleep(400); };
  await load('?fresh');
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, R = T.rack, M = T.motion;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const dev = (id) => document.querySelector('.dev[data-id="' + id + '"]');
    const settle = async () => { for (let i = 0; i < 6; i++) { await Promise.all([...document.querySelectorAll('.dev')].map((d) => M.settled(d))); await wait(30); } };
    ${body} })().then(JSON.stringify)`));
  const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  const hit = async (expr, dx = 0.5, dy = 0.5) => JSON.parse(await p.eval(`(() => { const e = (${expr}); if (!e) return JSON.stringify(null); const b = e.getBoundingClientRect();
    const x = Math.round(b.left + b.width * ${dx}), y = Math.round(b.top + b.height * ${dy}); const f = document.elementFromPoint(x, y);
    return JSON.stringify({ x, y, ok: !!f && (f === e || e.contains(f)), found: f ? String(f.className && f.className.baseVal === undefined ? f.className : f.tagName) : null }); })()`));
  const path = async (x, y, pts) => {
    await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y);
    let cx = x, cy = y;
    for (const [tx, ty, steps = 8] of pts) { for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', Math.round(cx + ((tx - cx) * i) / steps), Math.round(cy + ((ty - cy) * i) / steps)); await sleep(16); } cx = tx; cy = ty; }
    await sleep(50); await mouse('mouseReleased', cx, cy); await sleep(120);
  };
  const bar = (side) => `document.querySelector('.rack-scrollbar[data-side="${side}"]')`;

  /* ── 1. the scrollbar ───────────────────────────────────────────────────────────────────────────────────── */
  let r = await run(`await settle(); await wait(60); const rk = document.getElementById('rack'), b = ${bar('right')}, L = ${bar('left')}, rr = rk.getBoundingClientRect(), br = b.getBoundingClientRect();
    const first = rk.querySelector('.dev:not(.closed)').getBoundingClientRect();
    return { shown: !b.hidden, left: br.left, want: rr.left + 48 - 4, cardLeft: first.left, top: br.top, height: br.height, native: getComputedStyle(rk).scrollbarWidth,
      overflow: rk.scrollHeight - rk.clientHeight, leftShown: !L.hidden, leftOverflow: document.getElementById('rackL').scrollHeight - document.getElementById('rackL').clientHeight };`);
  check('scrollbar: the right rack overflows and its bar stands at the gutter\'s inner edge, beside the cards; the native bar is off',
    r.shown && r.overflow > 0 && Math.abs(r.left - r.want) < 0.5 && r.cardLeft - (r.left + 12) >= 0 && r.cardLeft - (r.left + 12) < 12 && r.native === 'none', JSON.stringify(r));
  check('scrollbar: a rack with nothing to scroll has none', !r.leftShown && r.leftOverflow <= 0, JSON.stringify(r));
  /* ONE BAR, 2 PX (wave 19, Josh on the iPad): the native bar is off (above), the kit's thumb is 2 px and its 12-px track
     paints nothing; and with a fine pointer the column still lets a press through to the picture */
  r = await run(`const b = ${bar('right')}, t = b.querySelector('.rack-scrollbar-thumb'), cs = getComputedStyle(b), tb = t.getBoundingClientRect(), bb = b.getBoundingClientRect();
    return { thumbW: tb.width, trackW: bb.width, trackBg: cs.backgroundColor, trackImg: cs.backgroundImage, border: cs.borderLeftWidth, centred: Math.abs((tb.left + tb.width / 2) - (bb.left + bb.width / 2)) < 0.6,
      pe: getComputedStyle(document.getElementById('rack')).pointerEvents, coarse: matchMedia('(pointer: coarse)').matches };`);
  check('scrollbar: one bar, 2 px — the thumb is 2 px wide in the middle of a 12-px track that paints nothing; a fine pointer\'s rack column is pointer-transparent',
    r.thumbW === 2 && r.trackW === 12 && r.centred && r.trackBg === 'rgba(0, 0, 0, 0)' && r.trackImg === 'none' && r.border === '0px' && r.pe === 'none' && !r.coarse, JSON.stringify(r));

  const th = await hit(`${bar('right')}.querySelector('.rack-scrollbar-thumb')`);
  const before = await run(`return { top: document.getElementById('rack').scrollTop, max: document.getElementById('rack').scrollHeight - document.getElementById('rack').clientHeight };`);
  await path(th.x, th.y, [[th.x, th.y + 120, 10]]);
  r = await run(`await wait(60); const rk = document.getElementById('rack'), b = ${bar('right')}, t = b.querySelector('.rack-scrollbar-thumb');
    return { top: rk.scrollTop, drag: b.classList.contains('drag'), now: +b.getAttribute('aria-valuenow'), thumbTop: parseFloat(t.style.top) };`);
  check('scrollbar: a real drag of the thumb (hit-tested) scrolls the rack, and the thumb follows', th && th.ok && before.top === 0 && r.top > 40 && !r.drag && r.now === Math.round(r.top) && r.thumbTop > 0, JSON.stringify({ th, before, r }));

  const tr = await hit(bar('right'), 0.5, 0.97);
  await mouse('mouseMoved', tr.x, tr.y); await mouse('mousePressed', tr.x, tr.y); await mouse('mouseReleased', tr.x, tr.y); await sleep(100);
  r = await run(`const rk = document.getElementById('rack'); return { top: rk.scrollTop, max: rk.scrollHeight - rk.clientHeight };`);
  const jumped = tr && tr.ok && r.top > before.max * 0.8;
  await p.eval(`(${bar('right')}).focus(), 0`);
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
  await sleep(80);
  const home = await run(`return document.getElementById('rack').scrollTop;`);
  check('scrollbar: a press low on the track jumps there; Home (keyboard) goes back to the top', jumped && home === 0, JSON.stringify({ tr, r, home }));

  r = await run(`R.setHidden(true); await wait(700); const gone = ${bar('right')}.hidden; R.setHidden(false); await wait(700); return { gone, back: !${bar('right')}.hidden };`);
  check('scrollbar: a hidden rack takes its bar away, and showing it brings the bar back', r.gone && r.back, JSON.stringify(r));

  /* ── 2. a retired id opens its heir ──────────────────────────────────────────────────────────────────────── */
  await run(`localStorage.setItem('mir.test.rack-leftovers', JSON.stringify({ v: 1, layout: { cards: [{ id: 'oldscope', side: 'left', open: true }, { id: 'tone', side: 'right', open: true }] } })); return 0;`);
  await load('');
  r = await run(`await settle(); return { left: R.order('left'), scope: R.isOpen('scope'), old: !!dev('oldscope') };`);
  check('retired: a saved layout naming the old id opens its heir where the old one stood', r.scope && r.left[0] === 'scope' && !r.old, JSON.stringify(r));
  await load('?fresh');

  /* ── 3. RESET LAYOUT ─────────────────────────────────────────────────────────────────────────────────────── */
  const head = await hit(`document.querySelector('.dev[data-id="tone"] .dev-eyebrow')`);
  await path(head.x, head.y, [[head.x - 420, head.y + 80, 14]]);
  r = await run(`await settle(); R.fold('mix', true); R.close('eq'); R.window('verb').dev.setOff(true); R.move('display', { side: 'right', index: 0 }); await settle();
    return { floating: R.floating(), mix: dev('mix').classList.contains('folded'), eq: R.isOpen('eq'), verb: dev('verb').classList.contains('off'), right: R.order('right') };`);
  const moved = head && head.ok && r.floating.includes('tone') && r.mix && !r.eq && r.verb && r.right[0] === 'display';
  r = { moved: r, after: await run(`R.setHidden(true); R.resetLayout(); await settle();
    return { floating: R.floating(), right: R.order('right'), left: R.order('left'), folded: !!document.querySelector('.dev.folded'), closed: R.windows().filter((w) => !w.open).map((w) => w.id),
      off: !!document.querySelector('.dev.off'), hidden: R.hidden, tone: dev('tone').parentElement.id };`) };
  check('RESET LAYOUT: the window carried off the rack (real drag) is docked home; everything is open, on, unfolded, in its home rack; the rack shows',
    moved && r.after.floating.length === 0 && r.after.tone === 'rack' && r.after.left.join() === 'display,camera' && !r.after.right.includes('display') && r.after.right.includes('scope')
      && !r.after.folded && r.after.closed.length === 0 && !r.after.off && !r.after.hidden, JSON.stringify(r));

  /* ── 4. the notebook's size in a ☆ layout ─────────────────────────────────────────────────────────────── */
  r = await run(`T.nb.w = 500; T.nb.h = 380; const slot = R.saveLayout(); const kept = R.capture().nb; T.nb.w = 900; T.nb.h = 700; T.nb.resized.length = 0;
    R.loadLayout(slot); return { kept, resized: T.nb.resized, now: [T.nb.w, T.nb.h] };`);
  check('nb: a ☆ layout keeps the notebook\'s size and loading it resizes the notebook', JSON.stringify(r.kept) === '[500,380]' && JSON.stringify(r.now) === '[500,380]' && r.resized.length === 1, JSON.stringify(r));

  /* ── 5. the touch-tablet clamp ───────────────────────────────────────────────────────────────────────────── */
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await sleep(200);
  r = await run(`const coarse = matchMedia('(any-pointer: coarse) and (min-width: 701px)').matches;
    R.float('camera', { x: innerWidth - 60, y: innerHeight - 40 }); await settle(); const b = dev('camera').getBoundingClientRect();
    return { coarse, right: b.right, bottom: b.bottom, left: b.left, top: b.top, vw: innerWidth, vh: innerHeight };`);
  check('tablet clamp: on a coarse pointer wider than 700 px a float is kept wholly inside the viewport, 8 px in',
    r.coarse ? (r.right <= r.vw - 8 + 0.5 && r.bottom <= r.vh - 8 + 0.5 && r.left >= 8 && r.top >= 8) : false, JSON.stringify(r));
  /* A FINGER SCROLLS THE RACK (wave 19; Safari will not touch-scroll a scroller whose own pointer-events is none): on a
     touch tablet (body.touch-tablet, the GUI's class) and on a coarse pointer the column takes the pointer itself */
  r = await run(`const pe = () => getComputedStyle(document.getElementById('rack')).pointerEvents, coarse = matchMedia('(pointer: coarse)').matches, onCoarse = pe();
    document.body.classList.add('touch-tablet'); const onTablet = pe(); document.body.classList.remove('touch-tablet'); return { coarse, onCoarse, onTablet };`);
  check('touch: the rack column takes the pointer under a coarse pointer and on body.touch-tablet (so Safari scrolls it by touch)', r.coarse && r.onCoarse === 'auto' && r.onTablet === 'auto', JSON.stringify(r));
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await sleep(150);
  r = await run(`document.body.classList.add('touch-tablet'); const pe = getComputedStyle(document.getElementById('rack')).pointerEvents; document.body.classList.remove('touch-tablet'); return { pe, coarse: matchMedia('(pointer: coarse)').matches };`);
  check('touch: body.touch-tablet alone (a fine pointer) also makes the column take the pointer', !r.coarse && r.pe === 'auto', JSON.stringify(r));
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} rack leftovers checks pass`);
if (failed) process.exit(1);
