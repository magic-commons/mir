/* transport.browser.mjs — the basic transport bar under a real browser (gallery/transport.html), real pointer, wheel and
 * keys through CDP, every press hit-tested with elementFromPoint first.  A first load shows only the bar; play toggles
 * the clock and lights; with nothing saved the pill reads 30.0; a drag on the tens digit steps by ten and on the tenths
 * by a tenth; the wheel and the arrows step; Enter and a double click type it; TAP four times sets it; an opener opens
 * its window and latches, and closing the window from the window unlatches it; the bar dodges a floating window and
 * comes back; the seat survives a reload; the resting pill is not a well and the typed field is; under qps the words
 * translate; H takes the bar out of paint and back; idle is zero frames.
 * Standalone: MIR_BASE=http://127.0.0.1:8814 node tests/transport.browser.mjs   (MIR_PLATES=1 retakes the plates) */
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
  /** the point to press, refused unless elementFromPoint finds the element (or something inside it) there */
  const hit = async (expr, dx = 0.5, dy = 0.5) => JSON.parse(await p.eval(`(() => { const e = (${expr}); if (!e) return JSON.stringify(null); const b = e.getBoundingClientRect();
    const x = Math.round(b.left + b.width * ${dx}), y = Math.round(b.top + b.height * ${dy}); const f = document.elementFromPoint(x, y);
    return JSON.stringify({ x, y, ok: !!f && (f === e || e.contains(f)), found: f ? f.tagName + '.' + (typeof f.className === 'string' ? f.className : '') : null }); })()`));
  const click = async (expr) => { const h = await hit(expr); if (!h || !h.ok) return h || { ok: false }; await mouse('mouseMoved', h.x, h.y); await mouse('mousePressed', h.x, h.y); await mouse('mouseReleased', h.x, h.y); await sleep(80); return h; };
  /* the centre of the i-th character of the pill's number, hit-tested */
  const digit = async (i) => JSON.parse(await p.eval(`(() => { const n = __T.tr.el.pill.querySelector('.tempo-number').firstChild, r = document.createRange();
    r.setStart(n, ${i}); r.setEnd(n, ${i} + 1); const b = r.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
    const f = document.elementFromPoint(x, y); return JSON.stringify({ x, y, ok: !!f && __T.tr.el.pill.contains(f), ch: n.textContent[${i}] }); })()`));
  const dragUp = async (pt, rise) => {
    await mouse('mouseMoved', pt.x, pt.y); await mouse('mousePressed', pt.x, pt.y);
    for (let i = 1; i <= 6; i++) { await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: Math.round(pt.y - (rise * i) / 6), button: 'left', buttons: 1 }); await sleep(20); }
    await sleep(40); await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y - rise, button: 'left', buttons: 0, clickCount: 1 }); await sleep(80);
  };
  const shadowTerms = `(s) => (s === 'none' ? [] : s.split(/,(?![^(]*\\))/).map((x) => x.trim()))`;

  /* ── a first load: the bar and nothing else ───────────────────────────────────────────────────────────────── */
  await load('?fresh');
  let r = await run(`const open = { racks: [...document.querySelectorAll('.dev')].filter((d) => !d.classList.contains('closed') && d.getClientRects().length).length,
      folders: T.folders.isOpen(), gui: T.gui.window.isOpen(), drift: T.drift.isOpen(), mod: !!T.mod.isOpen };
    const b = bar.getBoundingClientRect(), f = document.elementFromPoint(b.left + 20, b.top + b.height / 2);
    return { first: T.first, open, shown: getComputedStyle(bar).display !== 'none' && bar.getClientRects().length > 0, hit: !!f && bar.contains(f), bpm: pill.querySelector('.tempo-number').textContent, aria: pill.getAttribute('aria-valuenow') };`);
  check('first run: the bar is on screen and hit-testable, and nothing else is open', r.first && r.shown && r.hit && r.open.racks === 0 && !r.open.folders && !r.open.gui && !r.open.drift && !r.open.mod, JSON.stringify(r));
  check('with nothing saved the pill reads 30.0 (the model\'s default)', r.bpm === '30.0' && r.aria === '30.0', JSON.stringify(r));
  if (PLATES) await p.shot(plate('transport-first-run.png'));

  /* ── the resting pill stands proud; the field you type in is a well ──────────────────────────────────────── */
  r = await run(`const terms = ${shadowTerms}; const cs = getComputedStyle(pill);
    return { pill: terms(cs.boxShadow), pillBg: cs.backgroundColor };`);
  const pillRaised = r.pill.some((s) => !s.includes('inset')), pillBg = r.pillBg;

  /* ── play ────────────────────────────────────────────────────────────────────────────────────────────────── */
  let h = await click(`__T.tr.el.play`);
  r = await run(`await wait(60); return { playing: T.clock.isPlaying(), on: tr.el.play.classList.contains('on'), pressed: tr.el.play.getAttribute('aria-pressed'), gly: tr.el.play.dataset.gly };`);
  const b0 = await run(`return T.beats;`); await sleep(300); const b1 = await run(`return T.beats;`);
  h = await click(`__T.tr.el.play`);
  const r2 = await run(`await wait(60); return { playing: T.clock.isPlaying(), on: tr.el.play.classList.contains('on'), gly: tr.el.play.dataset.gly };`);
  check('play: a press starts the clock and lights it (pause glyph), the tempo turns the picture; a second press stops it', h.ok && r.playing && r.on && r.pressed === 'true' && r.gly === 'pause' && b1 > b0 && !r2.playing && !r2.on && r2.gly === 'play', JSON.stringify({ r, r2, b0, b1 }));

  /* ── the drag: the digit under the pointer is the step ───────────────────────────────────────────────────── */
  let d = await digit(0);
  await dragUp(d, 13);
  r = await run(`await wait(40); return { bpm: tr.bpm, shown: pill.querySelector('.tempo-number').textContent, field: !field.hidden };`);
  check('drag on the tens digit, one band up: +10 (30.0 → 40.0), and the release does not open the field', d.ok && d.ch === '3' && r.bpm === 40 && r.shown === '40.0' && !r.field, JSON.stringify({ d, r }));
  d = await digit(3);
  await dragUp(d, 13);
  r = await run(`await wait(40); return { bpm: tr.bpm };`);
  check('drag on the tenths digit, one band up: +0.1 (40.0 → 40.1)', d.ok && d.ch === '0' && r.bpm === 40.1, JSON.stringify({ d, r }));
  d = await digit(1);
  await dragUp(d, -22);
  r = await run(`await wait(40); return { bpm: tr.bpm };`);
  check('drag on the ones digit, two bands down: −2 (40.1 → 38.1)', d.ok && r.bpm === 38.1, JSON.stringify({ d, r }));

  /* ── the wheel and the arrows ────────────────────────────────────────────────────────────────────────────── */
  d = await digit(0);
  await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: d.x, y: d.y, deltaX: 0, deltaY: -100 }); await sleep(80);
  r = await run(`return { bpm: tr.bpm };`);
  const wheelTens = r.bpm;
  d = await digit(1);
  await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: d.x, y: d.y, deltaX: 0, deltaY: 100 }); await sleep(80);
  r = await run(`return { bpm: tr.bpm };`);
  check('wheel: up on the tens +10 (48.1), down on the ones −1 (47.1)', wheelTens === 48.1 && r.bpm === 47.1, JSON.stringify({ wheelTens, r }));
  await run(`pill.focus(); return 0;`);
  await key('ArrowUp', 'ArrowUp', 38); await key('ArrowUp', 'ArrowUp', 38);
  await key('ArrowDown', 'ArrowDown', 40, 8);
  await key('PageUp', 'PageUp', 33);
  r = await run(`await wait(30); return { bpm: tr.bpm, focus: document.activeElement === pill };`);
  check('keys on the pill: ↑ ↑ +2, Shift+↓ −0.1, PageUp +10 (47.1 → 59.0)', r.bpm === 59 && r.focus, JSON.stringify(r));

  /* ── typing: Enter, and a double click ───────────────────────────────────────────────────────────────────── */
  await key('Enter', 'Enter', 13);
  r = await run(`await wait(30); const terms = ${shadowTerms}; const cs = getComputedStyle(field); return { open: !field.hidden, focus: document.activeElement === field, pillHidden: pill.hidden,
    field: terms(cs.boxShadow), fieldBg: cs.backgroundColor, value: field.value };`);
  const fieldWell = r.field.length > 0 && r.field.every((s) => s.includes('inset')) && r.fieldBg !== pillBg;
  check('INTENT fact 4: the resting pill stands proud (a drop term, no well), the field you type in is a well', pillRaised && fieldWell, JSON.stringify({ pillRaised, pillBg, r }));
  await p.send('Input.insertText', { text: '' });
  await key('Backspace', 'Backspace', 8); await p.send('Input.insertText', { text: '92.5' });
  await key('Enter', 'Enter', 13);
  r = await run(`await wait(30); return { bpm: tr.bpm, open: !field.hidden, focus: document.activeElement === pill };`);
  check('Enter types it: the pill gives its seat to the field, 92.5 and Enter set it, the focus comes back to the pill', r.bpm === 92.5 && !r.open && r.focus, JSON.stringify(r));
  h = await hit(`__T.tr.el.pill`);
  await mouse('mouseMoved', h.x, h.y); await mouse('mousePressed', h.x, h.y, 0, 1); await mouse('mouseReleased', h.x, h.y, 0, 1);
  await sleep(60); await mouse('mousePressed', h.x, h.y, 0, 2); await mouse('mouseReleased', h.x, h.y, 0, 2); await sleep(80);
  r = await run(`return { open: !field.hidden, value: field.value };`);
  await key('Escape', 'Escape', 27);
  const r3 = await run(`await wait(30); return { bpm: tr.bpm, open: !field.hidden };`);
  check('a double click types it; Escape leaves the tempo as it was', h.ok && r.open && r.value === '92.5' && r3.bpm === 92.5 && !r3.open, JSON.stringify({ h, r, r3 }));

  /* ── TAP four times ──────────────────────────────────────────────────────────────────────────────────────── */
  await run(`window.__taps = []; tr.el.tap.addEventListener('click', () => window.__taps.push(performance.now()), true); return 0;`);
  h = await hit(`__T.tr.el.tap`);
  for (let i = 0; i < 4; i++) { await mouse('mouseMoved', h.x, h.y); await mouse('mousePressed', h.x, h.y); await mouse('mouseReleased', h.x, h.y); if (i < 3) await sleep(470); }
  r = await run(`await wait(30); const t = window.__taps; return { bpm: tr.bpm, taps: t.length, want: Math.round(60000 / ((t[t.length - 1] - t[0]) / (t.length - 1)) * 10) / 10 };`);
  check('TAP four times, about half a second apart: the tempo of the taps as they landed (about 120)', h.ok && r.taps === 4 && Math.abs(r.bpm - r.want) <= 0.2 && r.bpm > 95 && r.bpm < 135, JSON.stringify({ h, r }));

  /* ── openers latch; closing from the window unlatches ───────────────────────────────────────────────────── */
  h = await click(`document.querySelector('.tr-open[data-opener="tone"]')`);
  r = await run(`await wait(400); return { open: R.isOpen('tone'), on: latch('tone').classList.contains('on'), pressed: latch('tone').getAttribute('aria-pressed') };`);
  check('an opener (a rack window) opens its window and latches', h.ok && r.open && r.on && r.pressed === 'true', JSON.stringify({ h, r }));
  h = await click(`document.querySelector('.dev[data-id="tone"] .dev-close')`);
  r = await run(`await wait(120); return { open: R.isOpen('tone'), on: latch('tone').classList.contains('on') };`);
  check('closing the rack window by its own × unlatches it', h.ok && !r.open && !r.on, JSON.stringify({ h, r }));
  h = await click(`document.querySelector('.tr-open[data-opener="gui"]')`);
  r = await run(`await wait(400); return { open: T.gui.window.isOpen(), on: latch('gui').classList.contains('on') };`);
  const h2 = await click(`document.querySelector('[data-mir-rail="gui"] [data-mir-chip="close"]') || T.gui.window.root.querySelector('[data-mir-chip="close"]')`);
  const r4 = await run(`await wait(400); return { open: T.gui.window.isOpen(), on: latch('gui').classList.contains('on') };`);
  check('GUI: its latch opens it and lights; its own close chip closes it and the latch goes dark', h.ok && r.open && r.on && h2.ok && !r4.open && !r4.on, JSON.stringify({ h, r, h2, r4 }));
  h = await click(`__T.tr.el.lamp`);
  r = await run(`await wait(500); return { open: !!T.mod.isOpen, exp: tr.el.lamp.getAttribute('aria-expanded'), lit: tr.el.lamp.classList.contains('on'), armed: T.mod.armed() };`);
  await run(`T.mod.close(); await wait(400); return 0;`);
  check('the MOD lamp is lit while modulation is armed, and a press opens the modulation window', h.ok && r.open && r.exp === 'true' && r.lit === r.armed, JSON.stringify({ h, r }));

  /* ── the dodge: through the rack's one dodge ─────────────────────────────────────────────────────────────── */
  h = await click(`document.querySelector('.tr-open[data-opener="drift"]')`);
  r = await run(`await wait(300); const b = bar.getBoundingClientRect(); T.drift.place({ x: Math.round(b.left + 40), y: Math.round(b.top - 60) }); await wait(700);
    const up = { seat: R.seat, attr: bar.dataset.seat, top: Math.round(bar.getBoundingClientRect().top), anims: bar.getAnimations().length };
    T.drift.place({ x: 40, y: 80 }); await wait(700);
    return { up, down: { seat: R.seat, top: Math.round(bar.getBoundingClientRect().top), anims: bar.getAnimations().length }, open: T.drift.isOpen() };`);
  check('dodge: DRIFT over the bar sends it to the top seat; moved away, it comes back; no animation left behind', h.ok && r.open && r.up.seat === 'top' && r.up.top < 120 && r.up.anims === 0 && r.down.seat === 'bottom' && r.down.top > 600 && r.down.anims === 0, JSON.stringify(r));
  if (PLATES) {
    await run(`R.open('mix'); T.clock.play(); await wait(900); T.clock.pause(); await wait(200); return 0;`);
    await p.shot(plate('transport-dark.png'));
  }

  /* ── H: out of paint, and back ───────────────────────────────────────────────────────────────────────────── */
  await run(`document.activeElement && document.activeElement.blur && document.activeElement.blur(); return 0;`);
  await key('h', 'KeyH', 72);
  r = await run(`await wait(60); return { hidden: document.body.classList.contains('ui-hidden'), display: getComputedStyle(bar).display };`);
  await key('h', 'KeyH', 72);
  const r5 = await run(`await wait(60); return { hidden: document.body.classList.contains('ui-hidden'), display: getComputedStyle(bar).display };`);
  check('H takes the bar out of paint (a fine pointer: the rack\'s edge handle is the way back) and H brings it back', r.hidden && r.display === 'none' && !r5.hidden && r5.display === 'flex', JSON.stringify({ r, r5 }));

  /* ── idle: zero frames ───────────────────────────────────────────────────────────────────────────────────── */
  await sleep(500);
  r = await run(`const f0 = T.perf.snapshot().frames, r0 = window.__raf; await wait(900); return { frames: T.perf.snapshot().frames - f0, raf: window.__raf - r0 };`);
  check('idle: no frame and no rAF booked while nothing moves', r.frames === 0 && r.raf === 0, JSON.stringify(r));

  /* ── the seat: chosen from the menu, kept across a reload ────────────────────────────────────────────────── */
  h = await click(`__T.tr.el.seat`);
  r = await run(`await wait(40); return { shown: !tr.el.menu.hidden, topOk: tr.el.menu.querySelector('[data-seat-choice="top"]').disabled === (typeof R.setHome !== 'function') };`);
  const h3 = await click(`__T.tr.el.menu.querySelector('[data-seat-choice="compact"]')`);
  const r6 = await run(`await wait(60); return { seat: tr.seat, form: bar.dataset.form, w: Math.round(bar.getBoundingClientRect().width), menu: !tr.el.menu.hidden };`);
  check('the seat menu opens from the bar; COMPACT makes the small bar (TOP is offered when the rack has setHome)', h.ok && r.shown && r.topOk && h3.ok && r6.seat === 'compact' && r6.form === 'compact' && !r6.menu, JSON.stringify({ h, r, h3, r6 }));
  await load('');
  r = await run(`return { seat: tr.seat, form: bar.dataset.form, first: T.first, bpm: tr.bpm };`);
  check('a reload keeps the seat (and it is no longer a first run)', r.seat === 'compact' && r.form === 'compact' && r.first === false, JSON.stringify(r));
  await run(`tr.setSeat('bottom'); return 0;`);

  /* ── the light plate ─────────────────────────────────────────────────────────────────────────────────────── */
  if (PLATES) {
    await load('?theme=light');
    await run(`R.open('tone'); T.drift.open(); T.drift.place({ x: 60, y: 90 }); await wait(500); return 0;`);
    await p.shot(plate('transport-light.png'));
  }

  /* ── languages: under qps every word on the bar is translated ────────────────────────────────────────────── */
  await load('?lang=qps');
  r = await run(`await wait(100); const words = [...bar.querySelectorAll('.tr-word, .tempo-unit')].map((n) => n.textContent);
    return { words, aria: tr.el.play.getAttribute('aria-label'), pill: pill.getAttribute('aria-label'), num: pill.querySelector('.tempo-number').textContent };`);
  check('qps: the words (MOD, TAP, the latches, BPM) and the accessible names translate; the number does not', r.words.length >= 6 && r.words.every((w) => w.startsWith('[')) && r.aria.startsWith('[') && r.pill.startsWith('[') && /^\d/.test(r.num), JSON.stringify(r));
  check('no exception on the page', !p.logs.some((l) => l.startsWith('EXCEPTION')), JSON.stringify(p.logs.filter((l) => l.startsWith('EXCEPTION'))));
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} transport checks pass`);
if (failed) process.exit(1);
