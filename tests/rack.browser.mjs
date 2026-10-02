/* rack.browser.mjs — the rack under a real browser (tests/fixtures/rack.html), real input through CDP, every press
 * hit-tested with elementFromPoint first.  Lazy windows are not in the DOM until opened; + opens one; the SHIFT-queue
 * opens two in pick order; a header drag reorders with the landing slot drawn; dragged out it floats, dragged back
 * it docks into the lit slot; a drag reversed halfway and cancelled (Escape; a finger's pointercancel after a long
 * press) leaves everything where it began; hide and show by the one path, with no rack ancestor ever below opacity 1;
 * the edge peek; H and the edge handle; the keyboard; the transport's dodge; idle after a drag is zero frames; the
 * layout survives a reload; the WINDOW menu lists exactly the registered windows.
 * Standalone: MIR_BASE=http://127.0.0.1:8795 node tests/rack.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8795';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  const load = async (q = '') => { await p.goto(BASE + '/tests/fixtures/rack.html' + q, 600); for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100); await sleep(400); };
  await load('?fresh');
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, R = T.rack, M = T.motion;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const dev = (id) => document.querySelector('.dev[data-id="' + id + '"]');
    const settle = async () => { for (let i = 0; i < 6; i++) { await Promise.all([...document.querySelectorAll('.dev')].map((d) => M.settled(d))); await wait(30); } };
    ${body} })().then(JSON.stringify)`));
  const mouse = (type, x, y, mods = 0) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, modifiers: mods });
  const hover = (x, y) => p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
  const key = async (k, code = k, vk = 0, mods = 0, type = 'both') => {
    if (type !== 'up') await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
    if (type !== 'down') await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  };
  /** the point to press: the element's centre, refused unless elementFromPoint finds the element (or inside it) there */
  const hit = async (expr, dx = 0.5, dy = 0.5) => JSON.parse(await p.eval(`(() => { const e = (${expr}); if (!e) return JSON.stringify(null); const b = e.getBoundingClientRect();
    const x = Math.round(b.left + b.width * ${dx}), y = Math.round(b.top + b.height * ${dy}); const f = document.elementFromPoint(x, y);
    return JSON.stringify({ x, y, ok: !!f && (f === e || e.contains(f)), found: f ? (f.className && f.className.baseVal === undefined ? f.className : f.tagName) : null }); })()`));
  const click = async (expr, mods = 0) => { const h = await hit(expr); if (!h || !h.ok) return h; await mouse('mouseMoved', h.x, h.y, mods); await mouse('mousePressed', h.x, h.y, mods); await mouse('mouseReleased', h.x, h.y, mods); await sleep(60); return h; };
  /* a header's grab point: on the eyebrow, never a button */
  const headOf = (id) => `document.querySelector('.dev[data-id="${id}"] .dev-eyebrow')`;
  const path = async (x, y, pts, { mods = 0, end = 'release', pause } = {}) => {
    await mouse('mouseMoved', x, y, mods); await mouse('mousePressed', x, y, mods);
    let cx = x, cy = y;
    for (const [tx, ty, steps = 8] of pts) { for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', Math.round(cx + ((tx - cx) * i) / steps), Math.round(cy + ((ty - cy) * i) / steps), mods); await sleep(16); } cx = tx; cy = ty; }
    await sleep(50);
    if (pause) await pause();
    if (end === 'release') await mouse('mouseReleased', cx, cy, mods); else await end();
    await sleep(80);
  };

  /* ── lazy: a never-opened window is not in the DOM ───────────────────────────────────────────────────────── */
  let r = await run(`return { built: R.built, devs: [...document.querySelectorAll('.dev')].map((d) => d.dataset.id), mix: !!dev('mix'), reg: R.registered.length };`);
  check('lazy: two of six windows built at boot; the four others are not in the DOM', r.built === 2 && r.devs.length === 2 && !r.mix && r.reg === 6, JSON.stringify(r));

  /* ── + opens one ─────────────────────────────────────────────────────────────────────────────────────────── */
  let h = await click(`document.getElementById('rackAdd')`);
  r = await run(`return { shown: R.addMenu.shown, rows: [...document.querySelectorAll('#rackAddList .mb-item')].map((b) => b.dataset.win) };`);
  check('+: the button answers the mouse and lists the closed windows A→Z', h.ok && r.shown && r.rows.join() === 'camera,mix,notes,scope', JSON.stringify({ h, r }));
  h = await click(`document.querySelector('#rackAddList .mb-item[data-win="mix"]')`);
  await run(`await settle(); return 0;`);
  r = await run(`return { built: R.built, open: R.isOpen('mix'), order: R.order('right'), shown: R.addMenu.shown };`);
  check('+: a click on a row builds and opens that window at the top of its rack', h.ok && r.built === 3 && r.open && r.order[0] === 'mix' && !r.shown, JSON.stringify(r));

  /* ── the SHIFT-queue: two, in pick order ─────────────────────────────────────────────────────────────────── */
  await click(`document.getElementById('rackAdd')`);
  await key('Shift', 'ShiftLeft', 16, 8, 'down');
  h = await click(`document.querySelector('#rackAddList .mb-item[data-win="notes"]')`, 8);
  const h2 = await click(`document.querySelector('#rackAddList .mb-item[data-win="camera"]')`, 8);
  r = await run(`return { queued: R.addMenu.queued, nums: [...document.querySelectorAll('#rackAddList .mb-num')].map((n) => n.parentElement.dataset.win + n.textContent), built: R.built };`);
  const queuedOk = h.ok && h2.ok && r.queued.join() === 'notes,camera' && r.built === 3;
  await key('Shift', 'ShiftLeft', 16, 0, 'up'); await sleep(60);
  r = { ...r, after: await run(`await settle(); return { built: R.built, left: R.order('left'), shown: R.addMenu.shown };`) };
  check('SHIFT-queue: two SHIFT-clicks queue (numbered), letting SHIFT go opens both, the rack reading in pick order', queuedOk && r.after.built === 5 && r.after.left.join() === 'notes,camera,display' && !r.after.shown, JSON.stringify(r));

  /* ── reorder: the held window follows, the slot it will land in is drawn ─────────────────────────────────── */
  let a = await hit(headOf('tone'), 0.5, 0.5), b = await hit(headOf('mix'));
  let mid = null;
  await path(a.x, a.y, [[a.x, b.y - 30, 10]], { pause: async () => { mid = await run(`const g = [...document.querySelectorAll('.mir-prox')].find((o) => o.dataset.prox === 'capture' && o.dataset.shape === 'rect');
    const t = dev('tone'), tr = t.getBoundingClientRect(), gr = g ? g.getBoundingClientRect() : null;
    const layoutTop = t.parentElement.getBoundingClientRect().top + t.offsetTop - t.parentElement.scrollTop;
    return { order: R.order('right'), dragging: R.dragging, translate: t.style.translate, guide: gr && { top: Math.round(gr.top), h: Math.round(gr.height) }, layoutTop: Math.round(layoutTop), h: t.offsetHeight };`); } });
  r = await run(`await settle(); const t = dev('tone'); return { order: R.order('right'), translate: t.style.translate, dragging: t.classList.contains('dragging'), anims: t.getAnimations().length };`);
  check('reorder mid-drag: the neighbours swapped live, and the slot is drawn exactly where the held window will land', !!mid && mid.dragging && mid.order[0] === 'tone' && !!mid.guide && Math.abs(mid.guide.top - mid.layoutTop) <= 1 && Math.abs(mid.guide.h - mid.h) <= 1, JSON.stringify(mid));
  check('reorder release: it lands in its slot, clean (no translate, no animation, not dragging)', r.order.join() === 'tone,mix' && !r.translate && !r.dragging && r.anims === 0, JSON.stringify(r));

  /* ── drag out: it floats; drag back: it docks into the lit slot ──────────────────────────────────────────── */
  a = await hit(headOf('mix'));
  await path(a.x, a.y, [[a.x - 420, a.y + 40, 12]]);
  r = await run(`await settle(); const m = dev('mix'), b = m.getBoundingClientRect(); return { floating: m.classList.contains('floating'), parent: m.parentElement.id, left: Math.round(b.left), translate: m.style.translate, f: R.floatOf('mix') };`);
  check('drag out: past the rack\'s edge the window comes off and floats where the hand left it (one layout commit)', r.floating && r.parent === 'floats' && !r.translate && r.f && Math.abs(r.f.x - r.left) <= 1, JSON.stringify(r));
  a = await hit(headOf('mix'));
  const L = await run(`const rk = document.getElementById('rackL'), cs = [...rk.querySelectorAll('.dev:not(.closed)')]; const b1 = cs[0].getBoundingClientRect(), b2 = cs[1].getBoundingClientRect(), k = rk.getBoundingClientRect();
    return { x: Math.round(k.left + 120), y: Math.round((b1.bottom + b2.top) / 2 + 4), order: cs.map((c) => c.dataset.id) };`);
  let slot = null;
  await path(a.x, a.y, [[L.x, L.y, 14]], { pause: async () => { slot = await run(`const o = [...document.querySelectorAll('.mir-prox')].find((x) => x.dataset.shape === 'slot' && x.dataset.prox === 'capture');
    const rk = document.getElementById('rackL').getBoundingClientRect(); const b = o && o.getBoundingClientRect();
    return b ? { inRack: b.left >= rk.left - 1 && b.right <= rk.right + 1, top: Math.round(b.top), h: Math.round(b.height), opacity: +getComputedStyle(o).opacity } : null;`); } });
  r = await run(`await settle(); const m = dev('mix'); return { left: R.order('left'), floating: m.classList.contains('floating'), translate: m.style.translate, prox: document.querySelectorAll('.mir-prox[data-prox]').length };`);
  check('drag back mid-drag: the insertion slot is lit solid inside the target rack, between the two windows', !!slot && slot.inRack && slot.h <= 6 && slot.opacity > 0.5, JSON.stringify(slot));
  check('drag back release: it docks into that slot (index 1 of the left rack), clean, and the guide clears', !r.floating && r.left[1] === 'mix' && r.left.length === 4 && !r.translate && r.prox === 0, JSON.stringify({ before: L.order, r }));

  /* ── reversed halfway and cancelled: Escape ──────────────────────────────────────────────────────────────── */
  const snap = `({ left: R.order('left'), right: R.order('right'), floating: R.floating(), tr: [...document.querySelectorAll('.dev')].map((d) => d.style.translate || '').join(''), drag: document.querySelectorAll('.dev.dragging').length, prox: document.querySelectorAll('.mir-prox[data-prox]').length })`;
  let before = await run(`return ${snap};`);
  a = await hit(headOf('notes'));
  await path(a.x, a.y, [[a.x, a.y + 260, 10], [a.x, a.y + 130, 5]], { end: async () => { await key('Escape', 'Escape', 27); } });
  let after = await run(`await settle(); return ${snap};`);
  check('cancel (Escape) after a reorder reversed halfway: everything is where it began', JSON.stringify(before) === JSON.stringify(after), JSON.stringify({ before, after }));

  /* ── reversed halfway and cancelled: a finger's long press, carried off the rack and back, then pointercancel ── */
  before = await run(`return ${snap};`);
  a = await hit(headOf('tone'));
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const touch = (type, x, y) => p.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
  await touch('touchStart', a.x, a.y); await sleep(520);
  const lifted = await run(`return dev('tone').classList.contains('dragging');`);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', a.x - i * 45, a.y + i * 4); await sleep(16); }
  const out = await run(`return dev('tone').classList.contains('floating');`);
  for (let i = 1; i <= 5; i++) { await touch('touchMove', a.x - 450 + i * 45, a.y + 40 - i * 4); await sleep(16); }
  await touch('touchCancel', 0, 0); await sleep(80);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  after = await run(`await settle(); return ${snap};`);
  check('touch: a 400-ms hold lifts the header, the finger carries it off the rack (it floats)', lifted && out, JSON.stringify({ lifted, out }));
  check('cancel (pointercancel) after carrying it out and halfway back: it is back in its rack, in its place', JSON.stringify(before) === JSON.stringify(after), JSON.stringify({ before, after }));

  /* ── the keyboard: ↓ moves, Enter floats, Enter docks ────────────────────────────────────────────────────── */
  await run(`dev('mix').querySelector('.dev-head').focus(); return 0;`);
  await key('ArrowDown', 'ArrowDown', 40); await sleep(40);
  r = await run(`await settle(); return { left: R.order('left'), focus: document.activeElement === dev('mix').querySelector('.dev-head') };`);
  await key('Enter', 'Enter', 13); await sleep(40);
  const fl = await run(`await settle(); return R.floating();`);
  await key('Enter', 'Enter', 13); await sleep(40);
  const back = await run(`await settle(); return { left: R.order('left'), floating: R.floating() };`);
  check('keyboard: ↓ moves the window down its rack (focus kept), Enter floats it, Enter docks it home', r.left.indexOf('mix') === 2 && r.focus && fl.includes('mix') && back.floating.length === 0 && back.left.indexOf('mix') === 2, JSON.stringify({ r, fl, back }));

  /* ── hide and show by the one path: no rack ancestor below opacity 1, at any frame of the hide ─────────────── */
  await run(`window.__samples = []; window.__sampling = true; const tick = () => { if (!window.__sampling) return;
      let min = 1; for (const h of document.querySelectorAll('.mir-rack .dev > .dev-head')) for (let n = h.parentElement; n; n = n.parentElement) min = Math.min(min, +getComputedStyle(n).opacity);
      window.__samples.push(min); requestAnimationFrame(tick); }; requestAnimationFrame(tick); return 0;`);
  await key('b', 'KeyB', 66); await sleep(600);
  r = await run(`window.__sampling = false; const rk = document.getElementById('rack'); return { hidden: R.hidden, vis: getComputedStyle(rk).visibility, frames: __samples.length, min: Math.min(...__samples), act: R.activity.state(dev('tone')).reason, life: T.life.filter((x) => x.startsWith('present:tone')).slice(-1)[0] };`);
  check('hide (B): the racks slide out and stop painting; no ancestor of a rack window is ever below opacity 1', r.hidden && r.vis === 'hidden' && r.frames >= 5 && r.min === 1, JSON.stringify(r));
  check('hidden costs nothing: window-activity says rack-hidden and the window was told it cannot present', r.act === 'rack-hidden' && r.life === 'present:tone:false', JSON.stringify(r));
  await hover(1270, 300); await sleep(450);
  const peek = await run(`return { peek: R.peek, vis: getComputedStyle(document.getElementById('rack')).visibility, cls: document.body.classList.contains('rack-peek-right') };`);
  await hover(640, 300); await sleep(450);
  const unpeek = await run(`return { peek: R.peek, vis: getComputedStyle(document.getElementById('rack')).visibility };`);
  check('edge peek: resting at the right edge peeks the rack; leaving it lets it go', peek.peek === 'right' && peek.vis === 'visible' && peek.cls && unpeek.peek === '' && unpeek.vis === 'hidden', JSON.stringify({ peek, unpeek }));
  h = await click(`document.getElementById('rackToggle')`);
  r = await run(`await wait(450); return { hidden: R.hidden, vis: getComputedStyle(document.getElementById('rack')).visibility };`);
  check('show: the hide button answers the mouse and brings the racks back', h.ok && !r.hidden && r.vis === 'visible', JSON.stringify({ h, r }));
  await key('h', 'KeyH', 72); await sleep(100);
  const hd = await hit(`document.querySelector('.mir-rack-handle[data-side="right"]')`);
  const uiHidden = await run(`return document.body.classList.contains('ui-hidden') && getComputedStyle(document.getElementById('rack')).display === 'none';`);
  await click(`document.querySelector('.mir-rack-handle[data-side="right"]')`);
  r = await run(`return { ui: document.body.classList.contains('ui-hidden'), disp: getComputedStyle(document.getElementById('rack')).display };`);
  check('H hides the interface (display: none); the edge handle is what elementFromPoint finds, and brings it back', uiHidden && hd && hd.ok && !r.ui && r.disp !== 'none', JSON.stringify({ hd, uiHidden, r }));

  /* ── the dodge: a floating kit window over the transport moves it to its other seat, then back ──────────── */
  r = await run(`const tb = document.getElementById('transport').getBoundingClientRect(); T.drift.place({ x: Math.round(tb.left), y: Math.round(tb.top - 40) }); await wait(500);
    const up = { seat: R.seat, attr: document.getElementById('transport').dataset.seat, top: Math.round(document.getElementById('transport').getBoundingClientRect().top), anims: document.getElementById('transport').getAnimations().length };
    T.drift.place({ x: 480, y: 120 }); await wait(500);
    return { up, down: { seat: R.seat, anims: document.getElementById('transport').getAnimations().length } };`);
  check('dodge: DRIFT over the transport sends it to the top seat; DRIFT gone, it returns; no animation left behind', r.up.seat === 'top' && r.up.attr === 'top' && r.up.top < 120 && r.up.anims === 0 && r.down.seat === 'bottom' && r.down.anims === 0, JSON.stringify(r));

  /* ── idle after a drag: zero frames ──────────────────────────────────────────────────────────────────────── */
  a = await hit(headOf('tone'));
  await path(a.x, a.y, [[a.x, a.y + 90, 8]]);
  await sleep(700);
  r = await run(`const f0 = T.perf.snapshot().frames, r0 = window.__rafCalls; await wait(800); return { frames: T.perf.snapshot().frames - f0, raf: window.__rafCalls - r0 };`);
  check('idle after a drag: no frame and no rAF booked while nothing moves', r.frames === 0 && r.raf === 0, JSON.stringify(r));

  /* ── the WINDOW menu is the registered windows ───────────────────────────────────────────────────────────── */
  r = await run(`T.bar.openGroup('WINDOW'); await wait(50); const items = T.bar.items; T.bar.close(); return { items, n: R.registered.length };`);
  const names = r.items.map((t) => t.replace(/^[↑⊕]\s+/, ''));
  check('WINDOW menu: one row per registered window, ↑ for open, ⊕ for closed — exactly those', r.items.length === r.n && names.slice().sort().join() === 'CAMERA,DISPLAY,MIX,NOTES,SCOPE,TONE' && r.items.filter((t) => t.startsWith('⊕')).join() === '⊕  SCOPE', JSON.stringify(r.items));

  /* ── the layout round-trips a reload ─────────────────────────────────────────────────────────────────────── */
  await run(`R.close('notes'); R.fold('camera', true); R.open('scope'); await settle(); R.float('scope', { x: 500, y: 300 }); await settle(); await wait(100); return 0;`);
  const cap = (s) => `(() => { const L = __T.rack.capture(); delete L.at; return L; })()`;
  before = await run(`return ${cap()};`);
  await load('');
  after = await run(`return { L: ${cap()}, built: R.built, notesBuilt: R.isBuilt('notes') };`);
  const kept = { ...before, cards: before.cards.filter((c) => c.open) };   // a closed window comes back a name, unbuilt, so it is not in the capture
  check('layout: order, sides, folded and floating survive a reload; a closed window comes back unbuilt', JSON.stringify(kept) === JSON.stringify(after.L) && !after.notesBuilt && after.built === 5, JSON.stringify({ before, after }));
  r = await run(`localStorage.setItem('mir.test.rack', JSON.stringify({ v: 1, layout: { cards: [{ id: 'ghost', side: 'left', open: true }, { id: 'tone', side: 'left', open: true }] } })); return 0;`);
  await load('');
  r = await run(`return { left: R.order('left'), ghost: !!document.querySelector('.dev[data-id="ghost"]'), logs: 0 };`);
  check('layout: an unknown id in a saved layout is ignored, never thrown on', r.left.includes('tone') && !r.ghost && !p.logs.some((l) => l.startsWith('EXCEPTION')), JSON.stringify({ r, logs: p.logs }));
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} rack checks pass`);
if (failed) process.exit(1);
