/* window.browser.mjs — the one window under a real browser (tests/fixtures/window.html), with real input through CDP.
 * Open and close travel (presence) and land clean; the body and the chips answer the mouse (elementFromPoint, never a
 * synthetic click); chip state tables; the grip drag and every cancel path; empty glass; the dock (the guide's rect IS
 * the landing, the landing travels and settles); the three relocations (Shift-drag, long press, keyboard) each move the
 * rail and the window makes room; the raise; the chip material against the modulation window's rail; the idle law.
 * Run by tests/run.mjs with MIR_BASE set; standalone: MIR_BASE=http://127.0.0.1:8843 node tests/window.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8843';
const results = [], notes = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  await p.goto(BASE + '/tests/fixtures/window.html', 800);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, M = T.motion, A = T.A, B = T.B;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const R = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; };
    const off = (a, b) => Math.max(...['left', 'top', 'width', 'height'].map((k) => Math.abs(a[k] - b[k])));
    const clean = (el) => el.getAnimations().length === 0 && !el.style.translate && !el.style.scale && !el.style.opacity && !M.owns(el);
    const rest = async (w) => { for (let i = 0; i < 4; i++) { await M.settled(w.root); await M.settled(w.rail.el); await wait(20); } };
    const center = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; };
    ${body} })().then(JSON.stringify)`));
  const mouse = (type, x, y, mods = 0) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, modifiers: mods });
  const key = async (k, code = k, vk = 0, mods = 0) => {
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  };
  /** a real drag: press at (x, y), move by (dx, dy) in steps, then `end` (default: release) */
  const dragBy = async (x, y, dx, dy, { mods = 0, steps = 8, end } = {}) => {
    await mouse('mouseMoved', x, y, mods); await mouse('mousePressed', x, y, mods);
    for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', x + Math.round((dx * i) / steps), y + Math.round((dy * i) / steps), mods); await sleep(16); }
    await sleep(40);
    if (end) await end(); else await mouse('mouseReleased', x + dx, y + dy, mods);
    await sleep(60);
  };
  const at = async (sel) => JSON.parse(await p.eval(`(() => { const b = (${sel}).getBoundingClientRect(); return JSON.stringify({ x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2), left: b.left, top: b.top, width: b.width, height: b.height }); })()`));

  /* ── open and close: presence, window and rail together ─────────────────────────────────────────────────── */
  let r = await run(`
    A.open(); const shown = !A.root.hidden && !A.rail.el.hidden, owned = M.owns(A.root) && M.owns(A.rail.el);
    await wait(60); const mid = +getComputedStyle(A.root).opacity;
    await rest(A); const landed = { op: getComputedStyle(A.root).opacity, clean: clean(A.root) && clean(A.rail.el) };
    A.close(); const closing = M.owns(A.root) && !A.root.hidden; await rest(A);
    const closed = { hidden: A.root.hidden && A.rail.el.hidden, clean: clean(A.root) && clean(A.rail.el), moved: T.moved[T.moved.length - 1], stored: T.store.A.open };
    A.open(); B.open(); await rest(A); await rest(B);
    return { shown, owned, mid, landed, closing, closed };`);
  check('open: window and rail are shown at once and travel in together (presence)', r.shown && r.owned && r.mid > 0 && r.mid < 1, `opacity ${r.mid.toFixed(2)} mid-entrance`);
  check('open: the entrance lands opaque and clean', r.landed.op === '1' && r.landed.clean, JSON.stringify(r.landed));
  check('close: an exit travels, then both are hidden, clean, reported (moved null) and persisted closed', r.closing && r.closed.hidden && r.closed.clean && r.closed.moved === null && r.closed.stored === false, JSON.stringify(r.closed));

  /* ── the body and the chips answer the mouse: hit-tests, then real clicks ──────────────────────────────── */
  r = await run(`
    const body = A.body.getBoundingClientRect(), fill = A.body.querySelector('.fill').getBoundingClientRect();
    const hitBody = document.elementFromPoint(body.left + 40, fill.top + 30), inner = document.getElementById('inner'), ci = center(inner);
    const chips = [...A.rail.el.querySelectorAll('.mir-chip')].map((c) => { const p = center(c); const h = document.elementFromPoint(p.x, p.y); return h && h.closest('.mir-chip') === c ? null : c.dataset.mirChip; }).filter(Boolean);
    return { body: !!hitBody && hitBody.closest('.mir-win') === A.root, bodyIn: hitBody && hitBody.className, inner: document.elementFromPoint(ci.x, ci.y) === inner, missed: chips };`);
  check('hit-test: empty glass, a control in the body and every chip are what elementFromPoint finds', r.body && r.inner && r.missed.length === 0, JSON.stringify(r));
  let c = await at(`__T.A.rail.chip('bars')`);
  await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y); await sleep(20);
  const pressedNow = await p.eval(`__T.A.rail.chip('bars').classList.contains('press')`);
  await mouse('mouseReleased', c.x, c.y); await sleep(30);
  await mouse('mousePressed', c.x, c.y); await mouse('mouseReleased', c.x, c.y); await sleep(30);
  r = await run(`const b = A.rail.chip('bars'); return { state: b.dataset.state, pressed: b.getAttribute('aria-pressed'), on: b.classList.contains('on'), label: b.getAttribute('aria-label'), title: b.title, glyph: b.dataset.glyph };`);
  check('a real click steps the cycle chip twice: bottom → top → hidden, every attribute from its row', r.state === 'hidden' && r.pressed === 'mixed' && !r.on && r.label === 'Work bars: hidden' && r.title.startsWith('Work bars hidden') && pressedNow, JSON.stringify(r));
  c = await at(`__T.A.rail.chip('render')`);
  await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y); await mouse('mouseReleased', c.x, c.y); await sleep(30);
  r = await run(`const g = A.rail.chip('gallery'), d = A.rail.chip('render');
    return { g: g.getAttribute('aria-pressed'), d: d.getAttribute('aria-pressed'), on: d.classList.contains('on') && !g.classList.contains('on'), pane: [...A.panels].filter(([, el]) => !el.hidden).map(([n]) => n).join() };`);
  check('a real click on a radio chip: it turns on, its partner off, and the window shows that pane', r.g === 'false' && r.d === 'true' && r.on && r.pane === 'render', JSON.stringify(r));
  await run(`A.tab('gallery'); return 0;`);

  /* ── the grip drag ─────────────────────────────────────────────────────────────────────────────────────── */
  let g = await at(`__T.A.rail.grip`), before = await at(`__T.A.root`);
  await dragBy(g.x, g.y, 100, 40);
  r = await run(`return { box: R(A.root), rail: R(A.rail.el), last: T.writes.A[T.writes.A.length - 1], keys: Object.keys(T.store.A).join(), clean: clean(A.root) };`);
  check('drag: the grip moves the window exactly with the hand, and the rail with it', Math.abs(r.box.left - before.left - 100) < 0.5 && Math.abs(r.box.top - before.top - 40) < 0.5 && Math.abs(r.rail.left + r.rail.width - r.box.left) < 1, JSON.stringify(r.box));
  check('persist: one shape { x, y, w, h, open, dock, chipSide }, written on release', r.keys === 'x,y,w,h,open,dock,chipSide' && r.last.x === Math.round(r.box.left) && r.last.y === Math.round(r.box.top), JSON.stringify(r.last));

  const cancelled = async (label, trigger, touchPath = false) => {
    const b0 = await at(`__T.A.root`), gg = await at(`__T.A.rail.grip`), n0 = await p.eval(`__T.writes.A.length`);
    if (touchPath) {
      await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      const touch = (type, x, y) => p.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
      await touch('touchStart', gg.x, gg.y); for (let i = 1; i <= 6; i++) { await touch('touchMove', gg.x + i * 12, gg.y + i * 9); await sleep(16); }
      await sleep(40); await touch('touchCancel', 0, 0); await sleep(80);
      await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    } else await dragBy(gg.x, gg.y, 90, 70, { end: async () => { await trigger(); await mouse('mouseMoved', gg.x + 140, gg.y + 90); await mouse('mouseReleased', gg.x + 140, gg.y + 90); } });
    const s = await run(`return { box: R(A.root), n: T.writes.A.length, drag: A.rail.grip.classList.contains('drag') };`);
    check(`drag: ${label} cancels and rolls the window back, nothing persisted`, Math.abs(s.box.left - b0.left) < 0.5 && Math.abs(s.box.top - b0.top) < 0.5 && s.n === n0 && !s.drag, `${s.box.left},${s.box.top} vs ${b0.left},${b0.top} · writes ${s.n - n0}`);
  };
  await cancelled('Escape', () => key('Escape', 'Escape', 27));
  await cancelled('the window losing focus', () => p.eval(`window.dispatchEvent(new Event('blur'))`));
  await cancelled('pointercancel (a finger taken away)', null, true);

  /* empty glass drags; a control in the body does not */
  before = await at(`__T.A.root`);
  let e = await run(`const f = A.body.querySelector('.fill').getBoundingClientRect(); return { x: Math.round(f.left + 30), y: Math.round(f.top + 40) };`);
  await dragBy(e.x, e.y, -60, 30);
  let after = await at(`__T.A.root`);
  const ib = await at(`document.getElementById('inner')`);
  await dragBy(ib.x, ib.y, 50, 50);
  const after2 = await at(`__T.A.root`);
  check('empty glass is a handle: a press on nothing pressable drags the window; a press on a control does not', Math.abs(after.left - before.left + 60) < 0.5 && Math.abs(after.top - before.top - 30) < 0.5 && after2.left === after.left && after2.top === after.top,
    `glass ${after.left - before.left},${after.top - before.top} · control ${after2.left - after.left},${after2.top - after.top}`);

  /* ── the dock: the guide IS the landing, the landing travels and settles ───────────────────────────────── */
  before = await at(`__T.A.root`); g = await at(`__T.A.rail.grip`);
  let guide = null;
  await dragBy(g.x, g.y, 0, Math.round(20 - before.top), { end: async () => {
    guide = await run(`const o = [...document.querySelectorAll('#floats .mir-prox')].find((n) => n.dataset.prox === 'capture'); return o ? R(o) : null;`);
    const end = await at(`__T.A.rail.grip`);
    await mouse('mouseReleased', end.x, end.y);
  } });
  r = await run(`const owned = M.owns(A.root), anims = A.root.getAnimations().length; await rest(A);
    return { owned, anims, box: R(A.root), dock: A.root.dataset.dock, rail: R(A.rail.el), side: A.rail.el.dataset.side, clean: clean(A.root) && clean(A.rail.el), stored: T.store.A.dock };`);
  const offG = guide ? Math.max(...['left', 'top', 'width', 'height'].map((k) => Math.abs(guide[k] - r.box[k]))) : Infinity;
  check('dock: the guide drawn while the window is captured is exactly where it lands (≤ 0.5 px)', offG <= 0.5, `guide ${JSON.stringify(guide)} · landed ${JSON.stringify(r.box)}`);
  check('dock: the landing travels (a motion owns the pane right after release) and settles clean, docked and persisted', r.owned && r.anims > 0 && r.clean && r.dock === 'top' && r.stored === 'top', `anims ${r.anims}`);
  check('dock: the chip lane is on the chips\' side — the rail sits beside the docked pane, off the racks', r.side === 'left' && r.rail.left + r.rail.width <= r.box.left + 0.5 && r.rail.left >= 240, JSON.stringify(r.rail));

  /* ── relocation 1 · Shift-drag: the nearest edge takes the rail; the docked window makes room ──────────── */
  before = await at(`__T.A.root`); g = await at(`__T.A.rail.grip`);
  await dragBy(g.x, g.y, Math.round(before.left + before.width + 30 - g.x), Math.round(before.top + before.height / 2 - g.y), { mods: 8 });
  r = await run(`await rest(A); return { box: R(A.root), rail: R(A.rail.el), side: A.rail.el.dataset.side, dock: A.root.dataset.dock, stored: T.store.A.chipSide };`);
  check('Shift-drag: the rail goes to the nearest edge (right), the docked window gives it the lane, and it is kept', r.side === 'right' && r.dock === 'top' && Math.abs(r.box.left - before.left) > 10 && r.rail.left >= r.box.left + r.box.width - 0.5 && r.stored === 'right',
    `pane ${before.left}→${r.box.left} · rail at ${r.rail.left}`);

  /* ── relocation 2 · a long press: four seats appear as guides, the finger picks one ────────────────────── */
  before = await at(`__T.A.root`); g = await at(`__T.A.rail.grip`);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const touch = (type, x, y) => p.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
  await touch('touchStart', g.x, g.y); await sleep(650);
  const seats = await run(`return [...document.querySelectorAll('#floats .mir-prox')].filter((n) => n.dataset.prox).map(R);`);
  const below = seats.find((s) => s.top >= before.top + before.height - 1);
  const armed = await p.eval(`__T.A.rail.grip.classList.contains('armed')`);
  if (below) for (let i = 1; i <= 8; i++) { await touch('touchMove', Math.round(g.x + ((below.left + below.width / 2 - g.x) * i) / 8), Math.round(g.y + ((below.top + below.height / 2 - g.y) * i) / 8)); await sleep(16); }
  await touch('touchEnd', 0, 0); await sleep(60);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  r = await run(`await rest(A); return { box: R(A.root), rail: R(A.rail.el), side: A.rail.el.dataset.side, stored: T.store.A.chipSide, armed: A.rail.grip.classList.contains('armed'), guides: [...document.querySelectorAll('#floats .mir-prox')].filter((n) => n.dataset.prox).length };`);
  const seatOff = below ? Math.max(...['left', 'top', 'width', 'height'].map((k) => Math.abs(below[k] - r.rail[k]))) : Infinity;
  check('long press: the grip arms and four seat guides appear', armed && seats.length === 4, `${seats.length} guides`);
  check('long press: the finger picks the seat below, the rail lands on that guide\'s rect, the window makes room', r.side === 'bottom' && r.stored === 'bottom' && seatOff <= 0.5 && Math.abs(r.box.width - before.width) > 10 && !r.armed && r.guides === 0,
    `seat off ${seatOff.toFixed(2)} px · width ${before.width}→${r.box.width}`);

  /* ── relocation 3 · the keyboard: arrows preview, Escape puts it back, Enter keeps it ──────────────────── */
  before = await at(`__T.A.root`);
  await p.eval(`__T.A.rail.grip.focus()`);
  await key('ArrowLeft', 'ArrowLeft', 37); await sleep(30);
  const preview = await run(`await rest(A); return { side: A.rail.el.dataset.side, box: R(A.root), stored: T.store.A.chipSide };`);
  await key('Escape', 'Escape', 27); await sleep(30);
  const back = await run(`await rest(A); return { side: A.rail.el.dataset.side, box: R(A.root), stored: T.store.A.chipSide };`);
  await key('ArrowUp', 'ArrowUp', 38); await key('Enter', 'Enter', 13); await sleep(30);
  r = await run(`await rest(A); return { side: A.rail.el.dataset.side, box: R(A.root), rail: R(A.rail.el), stored: T.store.A.chipSide };`);
  check('keyboard: an arrow moves the seat live (not yet kept) and the window makes room', preview.side === 'left' && preview.stored === 'bottom' && Math.abs(preview.box.width - before.width) > 10, JSON.stringify(preview));
  check('keyboard: Escape puts seat and window back exactly', back.side === 'bottom' && Math.abs(back.box.left - before.left) < 0.5 && Math.abs(back.box.width - before.width) < 0.5);
  check('keyboard: ArrowUp + Enter keeps the top seat; the docked pane drops below the rail', r.side === 'top' && r.stored === 'top' && r.rail.top + r.rail.height <= r.box.top + 0.5, JSON.stringify({ rail: r.rail, box: r.box }));

  /* the host's Display switch hides the guide and keeps the snap: drag away, then dock at the bottom unseen */
  await p.eval(`document.body.classList.add('no-guide'); __T.A.rail.grip.blur(); 0`);
  g = await at(`__T.A.rail.grip`); before = await at(`__T.A.root`);
  let drawn = null;
  await dragBy(g.x, g.y, 0, Math.round(800 - 8 - 20 - (before.top + before.height)), { end: async () => {
    drawn = await run(`return [...document.querySelectorAll('#floats .mir-prox')].filter((n) => n.dataset.prox).length;`);
    const end = await at(`__T.A.rail.grip`); await mouse('mouseReleased', end.x, end.y); } });
  r = await run(`await rest(A); return { dock: A.root.dataset.dock, box: R(A.root) };`);
  check('the Display switch off: no guide is drawn, and release still docks (at the bottom)', drawn === 0 && r.dock === 'bottom' && Math.abs(r.box.top + r.box.height - 792) < 0.5, JSON.stringify({ drawn, ...r }));
  await p.eval(`document.body.classList.remove('no-guide'); 0`);

  /* ── the raise: window and rail rise together, above the other window and its rail ────────────────────── */
  const bb = await at(`__T.B.body`);
  await mouse('mouseMoved', bb.x, bb.y); await mouse('mousePressed', bb.x, bb.y); await mouse('mouseReleased', bb.x, bb.y); await sleep(30);
  const zB = await run(`const z = (el) => +getComputedStyle(el).zIndex; return { a: z(A.root), ar: z(A.rail.el), b: z(B.root), br: z(B.rail.el) };`);
  c = await at(`__T.A.rail.chip('sort')`);
  await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y); await mouse('mouseReleased', c.x, c.y); await sleep(30);
  const zA = await run(`const z = (el) => +getComputedStyle(el).zIndex; return { a: z(A.root), ar: z(A.rail.el), b: z(B.root), br: z(B.rail.el), sort: A.rail.chip('sort').textContent };`);
  check('raise: a press on B lifts B and its rail above A and A\'s rail', zB.b > zB.ar && zB.br === zB.b + 1, JSON.stringify(zB));
  check('raise: a press on one of A\'s chips lifts A and its rail together (and the text chip cycled)', zA.a > zA.br && zA.ar === zA.a + 1 && zA.ar <= 4 && zA.sort === 'NEW', JSON.stringify(zA));

  /* ── the chip material: follows its pane, and against the modulation window's rail ─────────────────────── */
  const PROPS = ['width', 'height', 'border-top-width', 'border-radius', 'border-top-color', 'box-shadow', 'background-color', 'backdrop-filter'];
  const GEOM = ['width', 'height', 'border-top-width', 'border-radius'];
  const mismatch = {};
  let follows = true, geomOk = true;
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 640, y: 795 });   // no hover on either rail
  for (const theme of ['dark', 'light']) for (const card of ['tinted', 'refractive']) for (const frost of [false, true]) {
    const s = await run(`document.body.dataset.theme = '${theme}'; document.body.dataset.card = '${card}'; document.body.classList.toggle('frost', ${frost});
      await wait(160);                                               // both discs transition their fill (80 ms): read the landed value
      const ours = A.rail.chip('sort'), mod = T.modRail.querySelectorAll('.crail-chip')[1];
      const pick = (el, pseudo, list) => { const cs = getComputedStyle(el, pseudo); return Object.fromEntries(list.map((k) => [k, cs.getPropertyValue(k)])); };
      const D = ${JSON.stringify(PROPS)}, C = ['width', 'height', 'color', 'font-size', 'font-weight'];
      const pane = getComputedStyle(A.root);
      return { ours: { ...pick(ours, '::before', D), chip: pick(ours, null, C), gap: getComputedStyle(A.rail.el).rowGap, dock: A.rail.el.dataset.dock || null }, mod: { ...pick(mod, '::before', D), chip: pick(mod, null, C), gap: getComputedStyle(T.modRail).rowGap },
        pane: { bg: pane.backgroundColor, filter: pane.backdropFilter } };`);
    const seat = `${theme}/${card}${frost ? '/frost' : ''}`;
    if (s.ours['background-color'] !== s.pane.bg || s.ours['backdrop-filter'] !== s.pane.filter) { follows = false; notes.push(`disc ≠ pane in ${seat}: ${s.ours['background-color']} ${s.ours['backdrop-filter']} vs ${s.pane.bg} ${s.pane.filter}`); }
    for (const k of PROPS) if (s.ours[k] !== s.mod[k]) { (mismatch[k] ||= []).push(`${seat}: ours ${s.ours[k]} · modulation ${s.mod[k]}`); if (GEOM.includes(k)) geomOk = false; }
    /* A is docked at the bottom here, so its rail sits tighter (1.5.0-alpha.5, BASINS: each chip is its disc + --rail-gap along
       the rail, the chips --rail-gap apart); the modulation rail in this fixture floats.  Along a docked rail: disc + gap. */
    const along = s.ours.dock === 'top' || s.ours.dock === 'bottom' ? 'width' : s.ours.dock ? 'height' : null;
    const tight = along && parseFloat(s.ours.chip[along]) === parseFloat(s.ours.width) + parseFloat(s.ours.gap) && parseFloat(s.ours.gap) < parseFloat(s.mod.gap);
    if (along && !tight) { geomOk = false; (mismatch['chip ' + along] ||= []).push(`${seat}: docked ${s.ours.chip[along]} ≠ disc ${s.ours.width} + gap ${s.ours.gap}`); }
    for (const k of ['width', 'height', 'font-size', 'font-weight']) if (k !== along && s.ours.chip[k] !== s.mod.chip[k]) { geomOk = false; (mismatch['chip ' + k] ||= []).push(`${seat}: ${s.ours.chip[k]} vs ${s.mod.chip[k]}`); }
    if (s.ours.chip.color !== s.mod.chip.color) (mismatch['chip color'] ||= []).push(`${seat}: ours ${s.ours.chip.color} · modulation ${s.mod.chip.color}`);
    if (!along && s.ours.gap !== s.mod.gap) { geomOk = false; (mismatch.gap ||= []).push(`${seat}: ${s.ours.gap} vs ${s.mod.gap}`); }
  }
  await run(`document.body.dataset.theme = 'dark'; document.body.dataset.card = 'tinted'; document.body.classList.remove('frost'); return 0;`);
  check('chip material: in all 8 seats the disc wears its own pane\'s fill and filter (lab.css §56)', follows, notes.join(' | '));
  check('chip geometry matches the modulation rail in all 8 seats: target, disc, border, radius, gap, type (docked: disc + --rail-gap along the rail)', geomOk, JSON.stringify(Object.fromEntries(Object.entries(mismatch).filter(([k]) => GEOM.includes(k) || k.startsWith('chip ') && k !== 'chip color' || k === 'gap'))));
  for (const [k, v] of Object.entries(mismatch)) if (!GEOM.includes(k)) console.log(`INFO  differs from the modulation rail · ${k}: ${[...new Set(v.map((x) => x.replace(/^[^:]+: /, '')))].join('  /  ')}  (in ${v.length} of 8 seats)`);

  /* ── the idle law ──────────────────────────────────────────────────────────────────────────────────────── */
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 640, y: 795 });
  await sleep(500);
  r = await run(`T.perf.reset(); const raf0 = window.__rafCalls; await wait(500); return { snap: T.perf.snapshot(), rafs: window.__rafCalls - raf0, state: T.frame.state() };`);
  check('idle: two open windows, a docked one and a span observer book no rAF and no timer over 500 ms', r.rafs === 0 && !r.state.scheduled && r.state.pending === 0, JSON.stringify({ rafs: r.rafs, state: r.state }));
  check('idle: __MIR.perf counts zero writes, reads and frames over 500 ms', r.snap.writes === 0 && r.snap.reads === 0 && r.snap.frames === 0, JSON.stringify(r.snap));
  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} window checks FAILED` : `ALL ${results.length} MIR window browser checks passed`);
process.exit(failed.length ? 1 : 0);
