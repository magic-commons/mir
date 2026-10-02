/* transport.browser.mjs — the transport's parts under a real browser (gallery/transport.html), real pointer, wheel and
 * keys through CDP, every press hit-tested with elementFromPoint first.  A first load shows only the bar; with nothing
 * saved the pill reads 30.0; play is the one play and the power button is modulation's power (neither moves the other);
 * the pill: a drag by the digit under the pointer (tens, tenths, ones), the wheel, ↑ ↓ ← → Shift PageUp (BASINS), a
 * click opens the tempo panel and TAP there sets the tempo, a double click types it; the resting pill is not a well and
 * the typed field is; a latch opens its window and closing the window from the window unlatches it; the MIR mark opens
 * the modulation window; the bar dodges a floating window and comes back; the dock chip docks it into the rack and
 * back; the λWAVES layout from the same parts; the GUI's look settings restyle the bar in both layouts (card, frost,
 * BLUR, CORNERS, RELIEF, the flat tier); H; idle is zero frames; the seat survives a reload; under qps the words
 * translate.  Standalone: MIR_BASE=http://127.0.0.1:8814 node tests/transport.browser.mjs   (MIR_PLATES=1: the plates) */
import { launch, sleep } from '../tools/cdp.mjs';
import fs from 'node:fs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8814';
const PLATES = process.env.MIR_PLATES === '1';
const plate = (name) => new URL(`../docs/plates/transport/${name}`, import.meta.url).pathname;
if (PLATES) fs.mkdirSync(new URL('../docs/plates/transport/', import.meta.url), { recursive: true });
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  const load = async (q = '') => {
    await p.goto(BASE + '/gallery/transport.html' + q, 700);
    for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
    await p.eval(`(() => { window.__raf = 0; const r0 = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (f) => { window.__raf++; return r0(f); }; return 1; })()`);
    await sleep(400);
  };
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, tr = T.tr, R = T.rack;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const bar = tr.root, pill = tr.el.pill, field = tr.el.field;
    const latch = (id) => bar.querySelector('.tr-open[data-opener="' + id + '"]');
    ${body} })().then(JSON.stringify)`));
  const mouse = (type, x, y, mods = 0, clickCount = 1) => p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount, modifiers: mods });
  const key = async (k, code = k, vk = 0, mods = 0) => {
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  };
  const hit = async (expr, dx = 0.5, dy = 0.5) => JSON.parse(await p.eval(`(() => { const e = (${expr}); if (!e) return JSON.stringify(null); const b = e.getBoundingClientRect();
    const x = Math.round(b.left + b.width * ${dx}), y = Math.round(b.top + b.height * ${dy}); const f = document.elementFromPoint(x, y);
    return JSON.stringify({ x, y, ok: !!f && (f === e || e.contains(f)), found: f ? f.tagName + '.' + (typeof f.className === 'string' ? f.className : '') : null }); })()`));
  const click = async (expr) => { const h = await hit(expr); if (!h || !h.ok) return h || { ok: false }; await mouse('mouseMoved', h.x, h.y); await mouse('mousePressed', h.x, h.y); await mouse('mouseReleased', h.x, h.y); await sleep(80); return h; };
  const digit = async (i) => JSON.parse(await p.eval(`(() => { const n = __T.tr.el.pill.querySelector('.tempo-number').firstChild, r = document.createRange();
    r.setStart(n, ${i}); r.setEnd(n, ${i} + 1); const b = r.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
    const f = document.elementFromPoint(x, y); return JSON.stringify({ x, y, ok: !!f && __T.tr.el.pill.contains(f), ch: n.textContent[${i}] }); })()`));
  const dragUp = async (pt, rise) => {
    await mouse('mouseMoved', pt.x, pt.y); await mouse('mousePressed', pt.x, pt.y);
    for (let i = 1; i <= 6; i++) { await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: Math.round(pt.y - (rise * i) / 6), button: 'left', buttons: 1 }); await sleep(20); }
    await sleep(40); await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y - rise, button: 'left', buttons: 0, clickCount: 1 }); await sleep(80);
  };
  /* after the size change, in any seat: the wheel on the tens digit steps by ten, a click opens the panel, play plays */
  const seatCheck = async (name, want = { glyph: 32, num: 18, seat: 40 }) => {
    await run(`T.tr.setBpm(30); if (T.clock.isPlaying()) T.clock.pause(); await wait(60); return 0;`);
    const dg = await digit(0);
    await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: dg.x, y: dg.y, deltaX: 0, deltaY: -100 }); await sleep(80);
    const w = await run(`return T.tr.bpm;`);
    const hp = await click(`__T.tr.el.pill`);
    const op = await run(`await wait(60); const o = !__T.tr.el.panel.hidden; return o;`);
    await click(`__T.tr.el.pill`);
    const hy = await click(`__T.tr.el.play`);
    const q = await run(`await wait(60); const g = { width: parseFloat(getComputedStyle(T.tr.el.play.querySelector('svg')).width) }, b = T.tr.el.play.getBoundingClientRect(); const on = T.clock.isPlaying(); T.tr.toggle(); await wait(40);
      return { on, glyph: Math.round(g.width), seat: Math.round(b.width), num: parseFloat(getComputedStyle(T.tr.el.pill.querySelector('.tempo-number')).fontSize) };`);
    check(name + ': after the size change the wheel on the tens digit steps by ten, a click opens the tempo panel, play plays (glyph ' + want.glyph + ' px in a ' + want.seat + ' px seat, tempo ' + want.num + ' px)',
      dg.ok && dg.ch === '3' && w === 40 && hp.ok && op && hy.ok && q.on && q.glyph === want.glyph && q.seat === want.seat && q.num === want.num, JSON.stringify({ dg, w, op, q }));
  };
  const shadowTerms = `(s) => (s === 'none' ? [] : s.split(/,(?![^(]*\\))/).map((x) => x.trim()))`;

  /* ── a first load: the bar and nothing else ───────────────────────────────────────────────────────────────── */
  await load('?fresh');
  let r = await run(`const open = { racks: [...document.querySelectorAll('.dev')].filter((d) => !d.classList.contains('closed') && d.getClientRects().length).length,
      folders: T.folders.isOpen(), gui: T.gui.window.isOpen(), drift: T.drift.isOpen(), mod: !!T.mod.isOpen };
    const b = bar.getBoundingClientRect(), f = document.elementFromPoint(b.left + 20, b.top + b.height / 2);
    return { first: T.first, layout: T.layout, open, shown: bar.getClientRects().length > 0, hit: !!f && bar.contains(f), bpm: pill.querySelector('.tempo-number').textContent,
      w: Math.round(pill.getBoundingClientRect().width), plays: bar.querySelectorAll('.tbtn.play').length };`);
  check('first run: BASINS\' bar is on screen and hit-testable, and nothing else is open', r.first && r.layout === 'basins' && r.shown && r.hit && r.open.racks === 0 && !r.open.folders && !r.open.gui && !r.open.drift && !r.open.mod, JSON.stringify(r));
  check('with nothing saved the pill reads 30.0; the bar has one play', r.bpm === '30.0' && r.plays === 1, JSON.stringify(r));
  r = await run(`const px = (e, k) => parseFloat(getComputedStyle(e)[k]), box = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }; const home = bar.querySelector('.transport-home');
    return { num: px(pill.querySelector('.tempo-number'), 'fontSize'), unit: px(pill.querySelector('.tempo-unit'), 'fontSize'), hz: px(pill.querySelector('.tempo-hz'), 'fontSize'), pill: box(pill),
      play: box(tr.el.play), glyph: box(tr.el.play.querySelector('svg')), playBg: getComputedStyle(tr.el.play).backgroundColor, playRing: px(tr.el.play, 'borderTopWidth'),
      home: box(home), homeRing: getComputedStyle(home).borderTopWidth, homeR: getComputedStyle(home).borderRadius, dockRing: getComputedStyle(tr.el.dock).borderTopWidth, dockR: getComputedStyle(tr.el.dock).borderRadius };`);
  check('BASINS\' new sizes: the tempo 18 px (was 12), BPM / Hz 8 px (was 7), the pill sized to it (≥ 72, about 90); play\'s glyph 32 px (was 20) in a 40 px seat with no face and no ring; to-start wears the dock chip\'s and the logo\'s hairline ring',
    r.num === 18 && r.unit === 8 && r.hz === 8 && r.pill[0] >= 84 && r.pill[0] <= 100 && r.glyph[0] === 32 && r.play[0] === 40 && r.play[1] === 40 && r.playBg === 'rgba(0, 0, 0, 0)' && r.playRing === 0
    && r.home[0] === 34 && r.homeRing === r.dockRing && r.homeRing !== '0px' && r.homeR === r.dockR, JSON.stringify(r));
  r = await run(`const px = (e, k) => parseFloat(getComputedStyle(e)[k]), box = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }; const W = T.work, wb = document.querySelector('#workbar .g-wb'), sh = (e) => getComputedStyle(e).boxShadow, rad = (e) => getComputedStyle(e).borderRadius;
    const seats = [...W.root.querySelectorAll('.transport-home, .dock-btn, .mod-exp')];
    return { bar: W.root.dataset.bar, pad: getComputedStyle(W.root).paddingTop, h: box(W.root)[1], wb: [box(wb)[1], rad(wb), sh(wb), getComputedStyle(wb).backgroundColor],
      seats: seats.map((e) => [box(e), rad(e), sh(e) === sh(wb), getComputedStyle(e).backgroundColor === getComputedStyle(wb).backgroundColor, e.classList.contains('trig')]), pill: box(W.el.pill) };`);
  check('in a work bar (bar: \'work\'): to-start, send-to-rack and the logo are the bar\'s buttons — 34 × 34, radius 8, the same face and relief as EDIT and SNAP beside them; the bar\'s padding is 3 px',
    r.bar === 'work' && r.pad === '3px' && r.seats.length === 3 && r.seats.every((x) => x[0][0] === 34 && x[0][1] === 34 && x[1] === '8px' && x[1] === r.wb[1] && x[2] && x[3] && x[4]) && r.pill[1] === 34, JSON.stringify(r));
  if (PLATES) await p.shot(plate('transport-first-run.png'));
  r = await run(`const terms = ${shadowTerms}; const cs = getComputedStyle(pill), B = document.body;
    return { pill: terms(cs.boxShadow), pillBg: cs.backgroundColor, glass: B.dataset.faces === 'glass' && (B.dataset.card === 'refractive' || B.classList.contains('frost')) && B.dataset.card !== 'solid' };`);
  const pillRaised = r.pill.some((s) => !s.includes('inset')), pillBg = r.pillBg, glassFaces = r.glass;

  /* ── the one play and modulation's power: neither moves the other ────────────────────────────────────────── */
  let h = await click(`__T.tr.el.play`);
  r = await run(`await wait(60); return { playing: T.clock.isPlaying(), on: tr.el.play.classList.contains('on'), gly: tr.el.play.dataset.gly, armed: T.mod.armed() };`);
  const b0 = await run(`return T.beats;`); await sleep(300); const b1 = await run(`return T.beats;`);
  const h2 = await click(`__T.tr.el.power`);
  let r2 = await run(`await wait(60); return { playing: T.clock.isPlaying(), armed: T.mod.armed(), on: tr.el.power.classList.contains('on') };`);
  const h3 = await click(`__T.tr.el.power`);
  const r3 = await run(`await wait(60); return { playing: T.clock.isPlaying(), armed: T.mod.armed(), on: tr.el.power.classList.contains('on') };`);
  await click(`__T.tr.el.play`);
  const r4 = await run(`await wait(60); return { playing: T.clock.isPlaying(), armed: T.mod.armed(), gly: tr.el.play.dataset.gly };`);
  check('play: a press runs the clock and lights its ink (pause glyph); the tempo turns the picture', h.ok && r.playing && r.on && r.gly === 'pause' && b1 > b0, JSON.stringify({ r, b0, b1 }));
  check('power: a press turns modulation off and on (its ring lit in accent B when on) and never changes whether the clock plays; play never changes the power',
    h2.ok && h3.ok && r.armed && !r2.armed && !r2.on && r2.playing && r3.armed && r3.on && r3.playing && !r4.playing && r4.armed && r4.gly === 'play', JSON.stringify({ r, r2, r3, r4 }));

  /* ── the pill, BASINS' law ───────────────────────────────────────────────────────────────────────────────── */
  let d = await digit(0); await dragUp(d, 13);
  r = await run(`await wait(40); return { bpm: tr.bpm, panel: tr.el.panel.hidden === false };`);
  check('drag on the tens digit, one band up: +10 (30.0 → 40.0), and the release does not open the panel', d.ok && d.ch === '3' && r.bpm === 40 && !r.panel, JSON.stringify({ d, r }));
  d = await digit(3); await dragUp(d, 13);
  r = await run(`await wait(40); return { bpm: tr.bpm };`);
  check('drag on the tenths digit, one band up: +0.1 (40.0 → 40.1)', d.ok && r.bpm === 40.1, JSON.stringify({ d, r }));
  d = await digit(1); await dragUp(d, -22);
  r = await run(`await wait(40); return { bpm: tr.bpm };`);
  check('drag on the ones digit, two bands down: −2 (40.1 → 38.1)', d.ok && r.bpm === 38.1, JSON.stringify({ d, r }));
  d = await digit(0);
  await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: d.x, y: d.y, deltaX: 0, deltaY: -100 }); await sleep(80);
  const wheelTens = (await run(`return tr.bpm;`));
  d = await digit(1);
  await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: d.x, y: d.y, deltaX: 0, deltaY: 100 }); await sleep(80);
  r = await run(`return { bpm: tr.bpm };`);
  check('wheel: up on the tens +10 (48.1), down on the ones −1 (47.1)', wheelTens === 48.1 && r.bpm === 47.1, JSON.stringify({ wheelTens, r }));
  await run(`pill.focus(); return 0;`);
  await key('ArrowUp', 'ArrowUp', 38); await key('ArrowRight', 'ArrowRight', 39); await key('ArrowLeft', 'ArrowLeft', 37);
  await key('ArrowDown', 'ArrowDown', 40, 8); await key('PageUp', 'PageUp', 33);
  r = await run(`await wait(30); return { bpm: tr.bpm, focus: document.activeElement === pill };`);
  check('keys on the pill (BASINS): ↑ +1, → +1, ← −1, Shift+↓ −0.1, PageUp +10 (47.1 → 58.0)', r.bpm === 58 && r.focus, JSON.stringify(r));

  /* ── a click opens BASINS' tempo panel; TAP four times there ─────────────────────────────────────────────── */
  h = await click(`__T.tr.el.pill`);
  r = await run(`await wait(60); return { open: !tr.el.panel.hidden, exp: pill.getAttribute('aria-expanded'), tiles: [...tr.el.panel.querySelectorAll('.trig')].length };`);
  check('a click on the pill opens the tempo panel under the row (TAP, WALL, ÷2 ×2 ×4, HOLD)', h.ok && r.open && r.exp === 'true' && r.tiles >= 6, JSON.stringify({ h, r }));
  await run(`window.__taps = []; tr.el.panel.querySelector('.tap').addEventListener('click', () => window.__taps.push(performance.now()), true); return 0;`);
  h = await hit(`__T.tr.el.panel.querySelector('.tap')`);
  for (let i = 0; i < 4; i++) { await mouse('mouseMoved', h.x, h.y); await mouse('mousePressed', h.x, h.y); await mouse('mouseReleased', h.x, h.y); if (i < 3) await sleep(470); }
  r = await run(`await wait(30); const t = window.__taps; return { bpm: tr.bpm, taps: t.length, want: Math.round(60000 / ((t[t.length - 1] - t[0]) / (t.length - 1)) * 10) / 10 };`);
  check('TAP four times, about half a second apart: the tempo of the taps as they landed (about 120)', h.ok && r.taps === 4 && Math.abs(r.bpm - r.want) <= 0.2 && r.bpm > 95 && r.bpm < 135, JSON.stringify({ h, r }));
  await click(`__T.tr.el.pill`);
  r = await run(`await wait(60); return { open: !tr.el.panel.hidden, w: bar.style.width };`);
  check('a second click closes the panel and the bar lets go of its width', !r.open && r.w === '', JSON.stringify(r));

  /* ── a double click types it; the field is a well, the resting pill is not ───────────────────────────────── */
  await run(`tr.setBpm(92.5); await wait(30); return 0;`);
  h = await hit(`__T.tr.el.pill`);
  await mouse('mouseMoved', h.x, h.y); await mouse('mousePressed', h.x, h.y, 0, 1); await mouse('mouseReleased', h.x, h.y, 0, 1);
  await sleep(60); await mouse('mousePressed', h.x, h.y, 0, 2); await mouse('mouseReleased', h.x, h.y, 0, 2); await sleep(80);
  r = await run(`const terms = ${shadowTerms}; const cs = getComputedStyle(field); return { open: !field.hidden, focus: document.activeElement === field, value: field.value, panel: !tr.el.panel.hidden,
    field: terms(cs.boxShadow), fieldBg: cs.backgroundColor };`);
  /* BASINS: under GLASS control faces (REFRACTIVE or FROST) the resting pill and the tempo field are both clear; otherwise the
     pill wears its own face and the field the well's fill.  Either way the pill is not a well and the field is. */
  const clear = (c) => c === 'rgba(0, 0, 0, 0)';
  const fieldWell = r.field.length > 0 && r.field.every((s) => s.includes('inset')) && (glassFaces ? clear(pillBg) && clear(r.fieldBg) : r.fieldBg !== pillBg);
  check('the resting pill is not a well (it stands proud), the field you type in is a well; under glass faces both are clear, as BASINS draws them', pillRaised && fieldWell, JSON.stringify({ pillRaised, pillBg, glassFaces, r }));
  await key('Backspace', 'Backspace', 8); await p.send('Input.insertText', { text: '64' }); await key('Enter', 'Enter', 13);
  const r5 = await run(`await wait(30); return { bpm: tr.bpm, open: !field.hidden, focus: document.activeElement === pill };`);
  check('a double click types it (the panel stays shut); 64 and Enter set it; the focus comes back to the pill', h.ok && r.open && r.value === '92.5' && !r.panel && r5.bpm === 64 && !r5.open && r5.focus, JSON.stringify({ r, r5 }));

  /* ── latches; the MIR mark opens the modulation window ───────────────────────────────────────────────────── */
  h = await click(`document.querySelector('.tr-open[data-opener="tone"]')`);
  r = await run(`await wait(400); return { open: R.isOpen('tone'), on: latch('tone').classList.contains('on') };`);
  const hx = await click(`document.querySelector('.dev[data-id="tone"] .dev-close')`);
  r2 = await run(`await wait(120); return { open: R.isOpen('tone'), on: latch('tone').classList.contains('on') };`);
  check('a latch opens its rack window and lights; the window\'s own × closes it and the latch goes dark', h.ok && r.open && r.on && hx.ok && !r2.open && !r2.on, JSON.stringify({ h, r, hx, r2 }));
  h = await click(`document.querySelector('.tr-open[data-opener="gui"]')`);
  r = await run(`await wait(400); return { open: T.gui.window.isOpen(), on: latch('gui').classList.contains('on') };`);
  const hg = await click(`document.querySelector('[data-mir-rail="gui"] [data-mir-chip="close"]') || T.gui.window.root.querySelector('[data-mir-chip="close"]')`);
  r2 = await run(`await wait(400); return { open: T.gui.window.isOpen(), on: latch('gui').classList.contains('on') };`);
  check('GUI: its latch opens it; its own close chip closes it and the latch goes dark', h.ok && r.open && r.on && hg.ok && !r2.open && !r2.on, JSON.stringify({ h, r, hg, r2 }));
  h = await click(`__T.tr.el.door`);
  r = await run(`await wait(500); return { open: !!T.mod.isOpen, exp: tr.el.door.getAttribute('aria-expanded'), armed: T.mod.armed(), playing: T.clock.isPlaying() };`);
  await run(`T.mod.close(); await wait(400); return 0;`);
  check('the MIR mark opens the modulation window, and touches neither the power nor the play', h.ok && r.open && r.exp === 'true' && r.armed && !r.playing, JSON.stringify({ h, r }));

  /* ── the dodge, through the rack's one dodge ─────────────────────────────────────────────────────────────── */
  h = await click(`document.querySelector('.tr-open[data-opener="drift"]')`);
  r = await run(`await wait(300); const b = bar.getBoundingClientRect(); T.drift.place({ x: Math.round(b.left + 40), y: Math.round(b.top - 60) }); await wait(700);
    const up = { seat: R.seat, top: Math.round(bar.getBoundingClientRect().top), anims: bar.getAnimations().length };
    T.drift.place({ x: 40, y: 80 }); await wait(700);
    return { up, down: { seat: R.seat, top: Math.round(bar.getBoundingClientRect().top), anims: bar.getAnimations().length } };`);
  check('dodge: DRIFT over the bar sends it to the top seat; moved away, it comes back; no animation left behind', h.ok && r.up.seat === 'top' && r.up.top < 120 && r.up.anims === 0 && r.down.seat === 'bottom' && r.down.top > 600 && r.down.anims === 0, JSON.stringify(r));

  /* ── the dock chip: into the rack's TRANSPORT window and back (BASINS) ───────────────────────────────────── */
  h = await click(`__T.tr.el.dock`);
  r = await run(`await wait(500); const host = bar.closest('.dev'); return { docked: tr.docked, in: host ? host.dataset.id : null, cls: bar.classList.contains('docked'), pos: getComputedStyle(bar).position };`);
  const hd = await click(`__T.tr.el.dock`);
  r2 = await run(`await wait(500); return { docked: tr.docked, in: !!bar.closest('.dev'), pos: getComputedStyle(bar).position, top: Math.round(bar.getBoundingClientRect().top) };`);
  check('the dock chip docks the bar into the rack\'s TRANSPORT window, and from there back onto the stage', h.ok && r.docked && r.in === 'transport' && r.cls && r.pos === 'static' && hd.ok && !r2.docked && !r2.in && r2.pos === 'fixed' && r2.top > 600, JSON.stringify({ h, r, hd, r2 }));
  if (PLATES) { await run(`R.open('mix'); T.drift.place({ x: 60, y: 170 }); T.clock.play(); await wait(900); T.clock.pause(); await wait(300); return 0;`); await p.shot(plate('transport-basins-dark.png')); }

  /* ── the look settings restyle the bar, in both layouts ──────────────────────────────────────────────────── */
  const looks = async () => run(`const P = T.gui.prefs, cs = () => getComputedStyle(bar), ps = () => getComputedStyle(tr.el.pill), terms = ${shadowTerms};
    const settle = async () => { await wait(120); };
    const drop = (s) => terms(s).some((t) => !t.includes('inset') && !/^rgba\\(0, 0, 0, 0\\) 0px 0px 0px/.test(t) && !/ 0px 0px 0px 0px$/.test(t));
    const out = {};
    P.set({ card: 'tinted', frost: 'always', blur: 11, corners: 24, relief: 'default', quality: 'full', shadow: true }); await settle();
    out.tinted = cs().backdropFilter; out.home = cs().borderRadius; out.pillRaised = drop(ps().boxShadow); out.shadow = drop(cs().boxShadow);
    P.set({ card: 'refractive' }); await settle(); out.refr = cs().backdropFilter;
    P.set({ blur: 4 }); await settle(); out.blur4 = cs().backdropFilter;
    P.set({ blur: 16 }); await settle(); out.blur16 = cs().backdropFilter;
    P.set({ frost: 'off' }); await settle(); out.frostOff = cs().backdropFilter; P.set({ frost: 'always' });
    P.set({ corners: 6 }); await settle(); out.corners6 = cs().borderRadius;
    P.set({ relief: 'flat' }); await settle(); out.pillFlat = drop(ps().boxShadow); P.set({ relief: 'default' });
    P.set({ quality: 'light' }); await settle(); out.flatShadow = drop(cs().boxShadow); out.flatBlur = cs().backdropFilter; out.flatPill = drop(ps().boxShadow);
    P.set({ quality: 'full', corners: 24, card: 'tinted', blur: 11 }); await settle();
    return out;`);
  const lookOk = (o) => o.tinted === 'none' && /blur\(/.test(o.refr) && /blur\(4px\)/.test(o.blur4) && /blur\(16px\)/.test(o.blur16) && o.frostOff === 'none'
    && o.home !== o.corners6 && o.corners6 === '6px' && o.pillRaised && !o.pillFlat && o.shadow && !o.flatShadow && o.flatBlur === 'none' && !o.flatPill;
  const looksB = await looks();
  check('settings (BASINS layout): TINTED no blur, REFRACTIVE blurs by BLUR (4 px, 16 px), FROST off none, CORNERS (home → 6 px), RELIEF flat flattens the pill, the flat tier: no shadow, no blur', lookOk(looksB), JSON.stringify(looksB));

  /* ── λWAVES' layout from the same parts: the switch flips it ─────────────────────────────────────────────── */
  h = await click(`[...document.querySelectorAll('#layoutSwitch .seg-b')].find((b) => b.dataset.id === 'lambdawaves' || /WAVES/.test(b.textContent))`);
  r = await run(`await wait(300); const t = __T.tr, b = t.root; return { layout: __T.layout, seats: [...b.querySelectorAll('.native-play-row > *')].map((n) => n.classList[0] + (n.classList[1] ? '.' + n.classList[1] : '')).join(' '),
    plays: b.querySelectorAll('.tbtn.play').length, power: !!b.querySelector('.mir-mod-power'), door: !!b.querySelector('.mod-exp'), latches: b.querySelectorAll('.tr-open').length };`);
  check('the switch flips to λWAVES\' layout: play, power, rewind, ‹ ›, the scrub, ⟳, two readouts, RATE, the pill — one play, the power, the door, the latches', h.ok && r.layout === 'lambdawaves' && r.plays === 1 && r.power && r.door && r.latches >= 4
    && /tbtn\.play tbtn\.modb tbtn\.transport-home tbtn\.transport-step-back tbtn\.transport-step-forward fd .*tbtn\.jump ro\.time ro\.period k .*tempo-seat/.test(r.seats), JSON.stringify({ h, r }));
  h = await click(`__T.tr.el.play`);
  r = await run(`await wait(300); const on = T.clock.isPlaying(), armed = T.mod.armed(); T.tr.toggle(); await wait(60); return { on, armed, after: T.clock.isPlaying(), time: document.querySelector('#transport .ro.time .ro-val').textContent };`);
  check('λWAVES\' layout: its one play runs the clock and its readout moves; the power stays as it was', h.ok && r.on && r.armed && !r.after && r.time !== '0.00', JSON.stringify({ h, r }));
  await seatCheck('λWAVES\' layout');
  if (PLATES) { await run(`R.open('tone'); await wait(400); return 0;`); await p.shot(plate('transport-lambdawaves-dark.png')); }
  const looksL = await run(`return 0;`).then(() => looks());
  check('settings (λWAVES layout): the same restyling, with no transport code', lookOk(looksL), JSON.stringify(looksL));

  /* ── H: out of paint, and back ───────────────────────────────────────────────────────────────────────────── */
  await run(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); return 0;`);
  await key('h', 'KeyH', 72);
  r = await run(`await wait(60); return { hidden: document.body.classList.contains('ui-hidden'), display: getComputedStyle(T.tr.root).display };`);
  await key('h', 'KeyH', 72);
  r2 = await run(`await wait(60); return { hidden: document.body.classList.contains('ui-hidden'), display: getComputedStyle(T.tr.root).display };`);
  check('H takes the bar out of paint (a fine pointer: the rack\'s edge handle is the way back) and H brings it back', r.hidden && r.display === 'none' && !r2.hidden && r2.display === 'flex', JSON.stringify({ r, r2 }));

  /* ── idle: zero frames ───────────────────────────────────────────────────────────────────────────────────── */
  await sleep(500);
  r = await run(`const f0 = T.perf.snapshot().frames, r0 = window.__raf; await wait(900); return { frames: T.perf.snapshot().frames - f0, raf: window.__raf - r0 };`);
  check('idle: no frame and no rAF booked while nothing moves', r.frames === 0 && r.raf === 0, JSON.stringify(r));

  /* ── the seat (ruled: BOTTOM, TOP, COMPACT), kept across a reload ────────────────────────────────────────── */
  h = await click(`__T.tr.el.seat`);
  r = await run(`await wait(40); return { shown: !T.tr.el.menu.hidden, topOk: T.tr.el.menu.querySelector('[data-seat-choice="top"]').disabled === (typeof R.setHome !== 'function') };`);
  const hc = await click(`__T.tr.el.menu.querySelector('[data-seat-choice="compact"]')`);
  r2 = await run(`await wait(60); const b = T.tr.root; return { seat: T.tr.seat, form: b.dataset.form, hz: getComputedStyle(T.tr.el.pill.querySelector('.tempo-hz')).display, menu: !T.tr.el.menu.hidden };`);
  await seatCheck('COMPACT', { glyph: 22, num: 14, seat: 30 });
  check('the seat menu opens from ⠿; COMPACT drops the Hz reading (TOP is offered when the rack has setHome)', h.ok && r.shown && r.topOk && hc.ok && r2.seat === 'compact' && r2.form === 'compact' && r2.hz === 'none' && !r2.menu, JSON.stringify({ h, r, hc, r2 }));
  await load('');
  r = await run(`return { seat: tr.seat, form: bar.dataset.form, first: T.first, layout: T.layout };`);
  check('a reload keeps the seat (and it is no longer a first run)', r.seat === 'compact' && r.form === 'compact' && r.first === false, JSON.stringify(r));
  await run(`tr.setSeat('bottom'); return 0;`);

  /* ── the light plates ────────────────────────────────────────────────────────────────────────────────────── */
  if (PLATES) {
    await load('?theme=light&layout=lambdawaves');
    await run(`R.open('tone'); T.drift.open(); T.drift.place({ x: 60, y: 170 }); await wait(500); return 0;`);
    await p.shot(plate('transport-lambdawaves-light.png'));
    await load('?theme=light');
    await run(`R.open('tone'); T.drift.open(); T.drift.place({ x: 60, y: 170 }); await wait(500); return 0;`);
    await p.shot(plate('transport-basins-light.png'));
  }

  /* ── languages ───────────────────────────────────────────────────────────────────────────────────────────── */
  await load('?lang=qps');
  r = await run(`await wait(100); const words = [...bar.querySelectorAll('.tr-word, .tempo-unit')].map((n) => n.textContent);
    return { words, play: tr.el.play.getAttribute('aria-label'), power: tr.el.power.getAttribute('aria-label'), pill: pill.getAttribute('aria-label'), num: pill.querySelector('.tempo-number').textContent };`);
  check('qps: the words and the accessible names translate (play, power, the pill); the number does not', r.words.length >= 6 && r.words.every((w) => w.startsWith('[')) && r.play.startsWith('[') && r.power.startsWith('[') && r.pill.startsWith('[') && /^\d/.test(r.num), JSON.stringify(r));
  check('no exception on the page', !p.logs.some((l) => l.startsWith('EXCEPTION')), JSON.stringify(p.logs.filter((l) => l.startsWith('EXCEPTION'))));
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} transport checks pass`);
if (failed) process.exit(1);
