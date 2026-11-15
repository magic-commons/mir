/* rack.browser.mjs — the rack under a real browser (tests/fixtures/rack.html), real input through CDP, every press
 * hit-tested with elementFromPoint first.  Lazy windows are not in the DOM until opened; THE FINDER (1.5.5) opens one, and
 * reveals an open one without reordering; the SHIFT-queue opens two in pick order; a header drag reorders with the landing slot drawn; dragged out it floats, dragged back
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

  /* ── THE FINDER opens one ───────────────────────────────────────────────────────────────────────────────── */
  const row = (id) => `document.querySelector('.mir-window-picker .wp-row[data-win="${id}"]')`;
  const F = `__T.finder`;
  await run(`${F}.open(); await wait(450); return 0;`);
  r = await run(`return { shown: ${F}.shown, rows: [...document.querySelectorAll('.mir-window-picker .wp-row')].map((b) => b.dataset.win + (b.hasAttribute('data-open') ? '*' : '')), shim: 'addMenu' in R };`);
  check('FINDER: every window A→Z, the open ones marked, and the rack has no addMenu (the 1.5.5 shim left at line 1.6)', r.shown && r.rows.join() === 'camera,display*,mix,notes,scope,tone*' && !r.shim, JSON.stringify(r));
  let h = await click(row('mix'));
  await run(`await settle(); return 0;`);
  r = await run(`return { built: R.built, open: R.isOpen('mix'), order: R.order('right'), shown: ${F}.shown };`);
  check('FINDER: a click on a closed row builds and opens that window at the top of its rack', h.ok && r.built === 3 && r.open && r.order[0] === 'mix' && !r.shown, JSON.stringify(r));

  /* ── the SHIFT-queue: two, in pick order ─────────────────────────────────────────────────────────────────── */
  await run(`${F}.open(); await wait(450); return 0;`);
  await key('Shift', 'ShiftLeft', 16, 8, 'down');
  h = await click(row('notes'), 8);
  const h2 = await click(row('camera'), 8);
  r = await run(`return { queued: ${F}.queued, nums: [...document.querySelectorAll('.mir-window-picker .wp-num')].map((n) => n.parentElement.dataset.win + n.textContent), built: R.built };`);
  const queuedOk = h.ok && h2.ok && r.queued.join() === 'notes,camera' && r.nums.slice().sort().join() === 'camera2,notes1' && r.built === 3;
  await key('Shift', 'ShiftLeft', 16, 0, 'up'); await sleep(60);
  r = { ...r, after: await run(`await settle(); return { built: R.built, left: R.order('left'), shown: ${F}.shown };`) };
  check('SHIFT-queue: two SHIFT-clicks queue (numbered), letting SHIFT go opens both, the rack reading in pick order', queuedOk && r.after.built === 5 && r.after.left.join() === 'notes,camera,display' && !r.after.shown, JSON.stringify(r));

  /* ── reveal: a pick of an OPEN window scrolls to it and rings it, never reordering the rack ───────────────── */
  await run(`${F}.open(); await wait(450); return 0;`);
  h = await click(row('display'));
  r = await run(`const ring = dev('display').classList.contains('mir-reveal'); await settle(); return { left: R.order('left'), ring, shown: ${F}.shown, built: R.built };`);
  check('reveal: picking an open window leaves the rack in its order (notes, camera, display), rings the card and builds nothing', h.ok && r.left.join() === 'notes,camera,display' && r.ring && !r.shown && r.built === 5, JSON.stringify(r));

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
  /* 1.6.0-alpha.4 THE HOLD IS 550: a finger held 500 ms lifts nothing; held 620 it lifts (the check held 520 over a 400 ms hold) */
  await touch('touchStart', a.x, a.y); await sleep(500);
  const early = await run(`return dev('tone').classList.contains('dragging');`);
  await touch('touchEnd', 0, 0); await sleep(120);
  await touch('touchStart', a.x, a.y); await sleep(620);
  const lifted = await run(`return dev('tone').classList.contains('dragging');`);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', a.x - i * 45, a.y + i * 4); await sleep(16); }
  const out = await run(`return dev('tone').classList.contains('floating');`);
  for (let i = 1; i <= 5; i++) { await touch('touchMove', a.x - 450 + i * 45, a.y + 40 - i * 4); await sleep(16); }
  await touch('touchCancel', 0, 0); await sleep(80);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  after = await run(`await settle(); return ${snap};`);
  check('touch: a finger held 500 ms lifts nothing; held past TAP.hold (550 ms) it lifts the header, and carries it off the rack (it floats)', !early && lifted && out, JSON.stringify({ early, lifted, out }));
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

  /* ── 1.6.0-alpha.32: arrows are the seat, Shift+arrows nudge a float; the head's double press is the one tap ── */
  await run(`dev('mix').querySelector('.dev-head').focus(); return 0;`);
  await key('Enter', 'Enter', 13); await sleep(40);
  const f0 = await run(`await settle(); return R.floatOf('mix');`);
  await key('ArrowRight', 'ArrowRight', 39); await key('ArrowDown', 'ArrowDown', 40); await sleep(40);
  const f1 = await run(`return R.floatOf('mix');`);
  await key('ArrowRight', 'ArrowRight', 39, 8); await key('ArrowUp', 'ArrowUp', 38, 8); await sleep(40);
  const f2 = await run(`return R.floatOf('mix');`);
  await key('Enter', 'Enter', 13); await sleep(40);
  const f3 = await run(`await settle(); const o = R.order('left'); dev('mix').querySelector('.dev-head').focus(); return { floating: R.floating(), at: o.indexOf('mix'), n: o.length };`);
  await key('ArrowUp', 'ArrowUp', 38, 8); await sleep(40);
  const f4 = await run(`await settle(); return R.order('left').indexOf('mix');`);
  check('ONE LAW TO MOVE A WINDOW BY KEYS: on a floating card a plain arrow moves nothing and Shift+arrow nudges it 24 px (as a window\'s rail); docked, Shift+arrow reorders nothing',
    !!f0 && f1.x === f0.x && f1.y === f0.y && f2.x === f0.x + 24 && f2.y === f0.y - 24 && f3.floating.length === 0 && f4 === f3.at, JSON.stringify({ f0, f1, f2, f3, f4 }));
  {
    const hp = await hit(headOf('tone'));
    const press = async (n) => { await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hp.x, y: hp.y, button: 'left', buttons: 1, clickCount: n }); await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hp.x, y: hp.y, button: 'left', buttons: 0, clickCount: n }); };
    const folded = () => run(`await settle(); return dev('tone').classList.contains('folded');`);
    await run(`window.__dbl = 0; dev('tone').addEventListener('dblclick', () => window.__dbl++, true); return 0;`);
    await mouse('mouseMoved', hp.x, hp.y); await press(1); await sleep(60); await press(2); const a = await folded();        // a real double click: ONE fold
    await sleep(500); await press(1); await sleep(450); await press(1); const b = await folded();                            // two slow presses: no fold
    await sleep(500); await press(1); await sleep(60); await press(1); const c = await folded();                             // two quick presses the browser calls no dblclick: the tap alone
    const dbl = await run(`return window.__dbl;`);
    check('THE HEAD\'S DOUBLE PRESS IS THE ONE TAP: a real double click folds the card ONCE (its dblclick came too and folds nothing more); two presses 450 ms apart fold nothing; two quick presses with no dblclick unfold it',
      hp.ok && a === true && b === true && c === false && dbl === 1, JSON.stringify({ hp, a, b, c, dbl }));
  }

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
  /* 1.5.7-alpha.63 THE REVEAL IS QUICK AND NEAR: 130 px from the edge peeks (it was 44), and the slide is 120 ms (it was 320) */
  const vw = await run(`return innerWidth;`);
  await hover(vw - 130, 300); await sleep(300);
  const near = await run(`const rk = document.getElementById('rack'); return { peek: R.peek, vis: getComputedStyle(rk).visibility, dur: getComputedStyle(rk).transitionDuration };`);
  await hover(vw - 150, 300); await sleep(60);
  const held = await run(`return R.peek;`);
  await hover(640, 300); await sleep(300);
  const gone = await run(`const rk = document.getElementById('rack'); return { peek: R.peek, vis: getComputedStyle(rk).visibility, dur: getComputedStyle(rk).transitionDuration };`);
  check('the reveal is near and quick: 130 px from the edge peeks the rack, it holds over the rack, and both slides are 120 ms', near.peek === 'right' && near.vis === 'visible' && held === 'right' && gone.peek === '' && gone.vis === 'hidden' && /^0\.12s/.test(near.dur) && /^0\.12s/.test(gone.dur), JSON.stringify({ near, held, gone }));
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
  /* ── 1.6.0-alpha.29 THE POWER HAS A VERB AND AN EVENT ─────────────────────────────────────────────────────── */
  r = await run(`const log = [], ev = []; document.addEventListener('devpower', (e) => ev.push(e.target.dataset.id + ':' + e.detail.on));
    R.register({ id: 'pw', title: 'PW', side: 'right', build() {}, onPower: (live) => log.push(live) }); R.open('pw'); await settle();
    const off = () => dev('pw').classList.contains('off'), out = {};
    out.unbuilt = R.power('camera-never', false);
    R.power('pw', false); out.a = { off: off(), log: log.join(), ev: ev.join() };          // the verb: the press
    R.power('pw', false); out.b = { log: log.join(), ev: ev.join() };                       // already there: nothing is pressed
    R.power('pw'); out.c = { off: off(), log: log.join(), ev: ev.join() };                  // left out: it flips
    const L = R.capture(); L.cards.find((c) => c.id === 'pw').off = true; R.apply(L); await settle();
    out.d = { off: off(), log: log.join(), ev: ev.join(), w: R.windows().find((x) => x.id === 'pw').off, api: R.window('pw').on };   // a restore: the built window's onPower, never devpower
    R.window('pw').power(true); out.e = { off: off(), ev: ev.join() }; R.close('pw'); return out;`);
  await run(`R.open('pw'); await settle(); return 0;`);
  check('rack.power(id, on) presses ⏻ as the hand does: the window\'s onPower runs and `devpower` is heard; already there, nothing is pressed; left out, it flips',
    r.unbuilt === false && r.a.off && r.a.log === 'false' && r.a.ev === 'pw:false' && r.b.log === 'false' && r.b.ev === 'pw:false' && !r.c.off && r.c.log === 'false,true' && r.c.ev === 'pw:false,pw:true', JSON.stringify(r));
  check('a restore is not a press: apply() powers the window off by dev.setOff (a kit-built window\'s onPower runs), `devpower` is not heard; windows() and the window\'s api say off',
    r.d.off && r.d.log === 'false,true,false' && r.d.ev === 'pw:false,pw:true' && r.d.w === true && r.d.api === false && !r.e.off && r.e.ev === 'pw:false,pw:true,pw:true', JSON.stringify(r));
  h = await click(`document.querySelector('.dev[data-id="pw"] .dev-power')`);
  r = await run(`return { off: dev('pw').classList.contains('off') };`);
  check('the hand\'s own click on ⏻ (hit-tested) powers the window off', h && h.ok && r.off, JSON.stringify({ h, r }));
  await run(`R.power('pw', true); R.close('pw'); await settle(); return 0;`);
  /* ── 1.6.0-alpha.30 A CARD SAYS ITS KIND AND ITS FIRST FOLD ───────────────────────────────────────────────── */
  r = await run(`const folds = []; R.register({ id: 'kf', title: 'KF', side: 'right', kind: 'info', folded: true, build() {}, onFold: (v) => folds.push(v) });
    const out = { built: R.isBuilt('kf') }; R.open('kf'); await settle(); const d = dev('kf'), row = () => R.windows().find((x) => x.id === 'kf');
    out.first = { folded: d.classList.contains('folded'), kind: d.dataset.kind, row: row().kind, spec: R.spec('kf').kind, hooks: folds.length, exp: d.querySelector('.dev-fold').getAttribute('aria-expanded') };
    R.fold('kf', false); const L = R.capture(); R.apply(L); await settle(); out.kept = { folded: d.classList.contains('folded'), hooks: folds.join() };
    R.register({ id: 'kp', title: 'KP', side: 'right', build() {} }); R.open('kp'); out.plain = { folded: dev('kp').classList.contains('folded'), kind: dev('kp').dataset.kind === undefined };
    R.close('kf'); R.close('kp'); await settle(); return out;`);
  check('register({ kind, folded }): the card is built folded on its first open (no onFold: it is not a press) and wears data-kind; windows() and spec() say the kind; a card with neither is as before',
    !r.built && r.first.folded && r.first.kind === 'info' && r.first.row === 'info' && r.first.spec === 'info' && r.first.hooks === 0 && r.first.exp === 'false' && !r.plain.folded && r.plain.kind, JSON.stringify(r));
  check('the first fold is only the first: a hand\'s unfold is kept by the layout (capture → apply leaves it unfolded)', !r.kept.folded && r.kept.hooks === 'false', JSON.stringify(r.kept));
  /* ── 1.6.0-alpha.31 THE HEAD BUTTONS KEEP THEIR SEATS · A CARD DECLARES ITS WINDOW ────────────────────────── */
  r = await run(`R.register({ id: 'st', title: 'ST', side: 'right', build() {} }); R.open('st'); await settle();
    const d = dev('st'), seats = () => { const h = d.querySelector('.dev-head').getBoundingClientRect(); return ['.dev-power', '.dev-fold', '.dev-close'].map((q) => Math.round(h.right - d.querySelector(q).getBoundingClientRect().right)).join(); };
    const shown = (q) => getComputedStyle(d.querySelector(q)).display !== 'none', left = (q) => d.querySelector(q).getBoundingClientRect().left;
    const docked = { seats: seats(), rail: shown('.dev-rail') }; R.float('st', { x: 420, y: 300 }); await settle();
    const out = { docked, floating: { seats: seats(), rail: shown('.dev-rail'), railLeftOfPower: left('.dev-rail') < left('.dev-power') } }; R.dock('st'); await settle(); R.close('st'); return out;`);
  check('the head buttons keep their seats: ⏻ ▾ × stand the same distance from the head\'s right edge docked and floating; ▯ comes in at the left end',
    r.docked.seats === r.floating.seats && !r.docked.rail && r.floating.rail && r.floating.railLeftOfPower, JSON.stringify(r));
  r = await run(`T.drift.close(); await wait(350); R.register({ id: 'tw', title: 'TW', side: 'right', build() {}, window: () => T.drift }); R.open('tw'); await settle();
    const d = dev('tw'), pop = d.querySelector('.dev-pop'); return { twin: 'twin' in d.dataset, shown: getComputedStyle(pop).display !== 'none', hint: pop.title, plain: getComputedStyle(dev('tone').querySelector('.dev-pop')).display, open: T.drift.isOpen() };`);
  h = await click(`document.querySelector('.dev[data-id="tw"] .dev-pop')`);
  after = await run(`await wait(350); const d = dev('tw'); const out = { open: T.drift.isOpen(), floating: d.classList.contains('floating'), card: R.isOpen('tw') };
    T.drift.close(); await wait(350); d.querySelector('.dev-head').focus(); return out;`);
  await key('Enter', 'Enter', 13); await sleep(350);
  const tw2 = await run(`const out = { open: T.drift.isOpen(), floating: dev('tw').classList.contains('floating'), verb: (T.drift.close(), R.twin('tw')), none: R.twin('tone') }; await wait(50); R.close('tw'); return out;`);
  check('register({ window }): the card\'s ↗ is shown in the rack (another card\'s is not) and says what it does; a press (hit-tested) opens the window twin, and the card neither floats nor closes',
    r.twin && r.shown && r.hint === 'Open this as a window' && r.plain === 'none' && !r.open && h && h.ok && after.open && !after.floating && after.card, JSON.stringify({ r, h, after }));
  check('Enter on the head of a card with a twin opens the twin (it does not float the card); rack.twin(id) is the verb, false for a card with none',
    tw2.open && !tw2.floating && tw2.verb === true && tw2.none === false, JSON.stringify(tw2));
  r = await run(`R.showPills(); await wait(80); const z = (n) => +getComputedStyle(n).zIndex; return { pills: z(document.querySelector('.rack-pills')), floats: z(R.el.floats), veil: +getComputedStyle(document.documentElement).getPropertyValue('--z-veil'), n: document.querySelectorAll('.rack-pill').length };`);
  check('THE PILLS STAY ON TOP (1.5.7-alpha.50): the scroll pills stand above the float layer (a docked TIMELINE, a work bar) and under the veil', r.n > 0 && r.pills > r.floats && r.pills < r.veil, JSON.stringify(r));
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} rack checks pass`);
if (failed) process.exit(1);
