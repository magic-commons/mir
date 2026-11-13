/* controls.browser.mjs — the general control set under a real browser (gallery/controls.html), with real input through CDP, every press
 * hit-tested with elementFromPoint.
 *   · THE ONE KNOB LAW: a vertical drag moves a full scale in 220 px; the ⅛ gear by Shift and by Alt (a modifier held), by a modifier engaged
 *     mid-drag (nothing jumps), and by a SECOND FINGER (real touch events); a double-tap is home.
 *   · THE STEPPER steps, wraps and skips a `coming` item; a tap on its name opens the full list in the kit's menu pane, which picks, types ahead and closes on Escape.
 *   · THE SELECT opens the same pane; THE NUMBER FIELD drags, types (Enter takes, Escape does not) and keys.
 *   · THE RANGE SLIDER: both thumbs move, never cross, a press on the track takes the nearest.
 *   · THE XY PAD moves its two knobs; a routed knob (a real macro route) moves the pad's dot; a routed pair keeps the hand's base as a ring.
 *   · A switch has its lamp, and `lamp: false` has none and lights its label.
 *   · control() builds the right kind for ten descriptors, each in the document and hit-testable.
 * Standalone: MIR_BASE=http://127.0.0.1:8856 node tests/controls.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8856';
const URL_ = BASE.replace(/\/$/, '') + '/gallery/controls.html';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
const near = (a, b, e = 0.004) => Math.abs(a - b) <= e;

const p = await launch({ width: 1280, height: 1000 });
const J = async (expr) => JSON.parse(await p.eval(`(async () => { const C = window.__C, W = C.W; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); return JSON.stringify(await (async () => { ${expr} })()); })()`));
const misses = [];
let held = false, mods = 0;
const mouse = (type, x, y) => { if (type === 'mousePressed') held = true; if (type === 'mouseReleased') held = false;
  return p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1, modifiers: mods }); };
const touch = (type, pts) => p.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
/** where `sel` (a JS expression for a node) is drawn, and whether elementFromPoint at its centre finds it or a child of it */
const spot = (node, at = [0.5, 0.5]) => J(`const n = ${node}; if (!n) return null; n.scrollIntoView({ block: 'center' }); const b = n.getBoundingClientRect(), x = Math.round(b.left + b.width * ${at[0]}), y = Math.round(b.top + b.height * ${at[1]});
  const h = document.elementFromPoint(x, y); return { x, y, w: b.width, h: b.height, hit: !!h && (h === n || n.contains(h)) };`);
async function need(node, label, at) { const s = await spot(node, at); if (!s) { misses.push(label + ': not found'); return null; } if (!s.hit) misses.push(label + ': elementFromPoint missed'); return s; }
/** a mouse drag from the centre of `node`: the steps are [dx, dy] offsets from the press, with the modifier bits held (8 Shift · 1 Alt · 2 Ctrl · 4 Meta) */
async function drag(node, label, steps, { mod = 0, at } = {}) {
  const s = await need(node, label, at); if (!s) return null;
  mods = 0; await mouse('mouseMoved', s.x, s.y); mods = mod; await mouse('mousePressed', s.x, s.y);
  for (const [dx, dy, m] of steps) { if (m !== undefined) mods = m; await mouse('mouseMoved', s.x + dx, s.y + dy); await sleep(20); }
  const last = steps[steps.length - 1]; await mouse('mouseReleased', s.x + last[0], s.y + last[1]); mods = 0; await sleep(320);   // past TAP.ms: the next press here is a new gesture, not a double-tap (home, and no drag: 1.6.0-alpha.19)
  return s;
}
const val = (node) => J(`return ${node}.get();`);
const RT0 = (w) => `W.range.${w}.root`;

try {
  await p.goto(URL_, 1200);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  check('the gallery page builds every control with no console error', (await p.eval('!!window.__ready')) && p.logs.length === 0, JSON.stringify(p.logs));

  /* ── THE ONE KNOB LAW ── */
  const K = 'W.knob.root.querySelector(".k-dial")';
  await J(`W.knob.set(0.4); W.knob.setDefault(0.4); return 1;`);
  await drag(K, 'knob', [[0, -11], [0, -22]]);
  let v = await val('W.knob'); check('knob: 22 px up is a tenth of the scale (220 px for a full scale)', near(v, 0.5), String(v));
  await J(`W.knob.set(0.4); return 1;`);
  await drag(K, 'knob', [[300, 0], [300, -22]]);
  v = await val('W.knob'); check('knob: the drag is vertical; 300 px sideways adds nothing', near(v, 0.5), String(v));
  await J(`W.knob.set(0.4); return 1;`);
  await drag(K, 'knob (Shift)', [[0, -11], [0, -22]], { mod: 8 });
  v = await val('W.knob'); check('knob: Shift held is an eighth: 22 px is 0.0125', near(v, 0.4125, 0.0006), String(v));
  await J(`W.knob.set(0.4); return 1;`);
  await drag(K, 'knob (Alt)', [[0, -22]], { mod: 1 });
  v = await val('W.knob'); check('knob: Alt is the same gear (any modifier)', near(v, 0.4125, 0.0006), String(v));
  await J(`W.knob.set(0.4); return 1;`);
  await drag(K, 'knob (Shift mid-drag)', [[0, -22, 0], [0, -22, 8], [0, -44, 8], [0, -44, 0]]);
  v = await val('W.knob'); check('knob: engaging the gear mid-drag moves nothing, then an eighth, and leaving it moves nothing (a virtual point)', near(v, 0.4 + 0.1 + 0.0125, 0.0006), String(v));
  await J(`W.knob.set(0.9); return 1;`);
  { const s = await need(K, 'knob (double-tap)'); mods = 0; await mouse('mouseMoved', s.x, s.y);
    await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(60); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(100); }
  v = await val('W.knob'); check('knob: a double-tap is home', near(v, 0.4, 1e-6), String(v));
  /* 1.6.0-alpha.3 THE WHEEL WAITS FOR A CLICK: over an unpressed knob the wheel is the page's (the value stays, the default is not prevented);
     pressed and focused, a notch is the arrow key's step (1/100, Shift an eighth of it) and the page stays; the focus leaving ends it */
  { await J(`W.knob.set(0.4); if (document.activeElement) document.activeElement.blur(); window.__wh = []; W.knob.root.addEventListener('wheel', (e) => setTimeout(() => __wh.push(e.defaultPrevented)), true); return 1;`);
    const s = await need(K, 'knob (wheel)'); mods = 0; await mouse('mouseMoved', s.x, s.y);
    const wheel = async (dy, m = 0) => { await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: s.x, y: s.y, deltaX: 0, deltaY: dy, modifiers: m }); await sleep(80); };
    await wheel(-100); const cold = await val('W.knob');
    await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(350);
    await wheel(-100); const up = await val('W.knob'); await wheel(100); await wheel(100); const down = await val('W.knob'); await wheel(-100, 8); const fine = await val('W.knob');
    await J(`document.activeElement.blur(); return 1;`); await wheel(-100); const left = await val('W.knob');
    const seen = await J(`return __wh;`);
    check('knob: a wheel over an unpressed knob changes nothing and is left to the page; pressed and focused, a notch is the arrow key\'s step (Shift the fine gear) and the page does not scroll; the focus leaving ends it',
      near(cold, 0.4, 1e-9) && near(up, 0.41, 1e-9) && near(down, 0.39, 1e-9) && near(fine, 0.39125, 1e-9) && near(left, fine, 1e-9) && seen.join() === 'false,true,true,true,true,false', JSON.stringify({ cold, up, down, fine, left, seen })); }
  /* ONE double-tap law (Josh, 2026-10-07, call 20): 300 ms and 14 px — two presses 330 ms apart, or 20 px apart, are not home */
  { await J(`W.knob.set(0.9); return 1;`); await sleep(350);
    const s = await need(K, 'knob (slow taps)'); mods = 0; await mouse('mouseMoved', s.x, s.y);
    await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(330); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(350);
    const slow = await val('W.knob');
    await mouse('mousePressed', s.x - 10, s.y); await mouse('mouseReleased', s.x - 10, s.y); await sleep(40); await mouse('mousePressed', s.x + 10, s.y); await mouse('mouseReleased', s.x + 10, s.y); await sleep(350);
    const apart = await val('W.knob');
    check('knob: two taps 330 ms apart, or 20 px apart, are not home (300 ms within 14 px)', near(slow, 0.9, 1e-6) && near(apart, 0.9, 1e-6), JSON.stringify({ slow, apart })); }
  /* 1.6.0-alpha.19 ONE DOUBLE PRESS, ONE HOME: a real mouse double-click (the second press carries clickCount 2, so the browser fires `dblclick`
     after it) goes home ONCE on a knob, a fader and a range thumb, and the second press begins no drag: a pixel of travel leaves the value home */
  { const dbl = async (node, label, at) => { const s = await need(node, label, at); mods = 0; await mouse('mouseMoved', s.x, s.y);
      await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(60);
      const two = (type, x) => p.send('Input.dispatchMouseEvent', { type, x, y: s.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 2 });
      await two('mousePressed', s.x); await mouse('mouseMoved', s.x + 2, s.y); held = false; await two('mouseReleased', s.x + 2); await sleep(120); };
    await sleep(350); await J(`W.knob.set(0.9); W.knob.setDefault(0.4); W.fader.set(0.2); W.fader.setDefault(0.5); W.range.set(0.25, 0.75); W.range.lo.setDefault(0.1); W.n.knob = W.n.fader = W.n.range = 0; window.__dbl = 0; document.addEventListener('dblclick', () => { __dbl++; }, true); return 1;`);
    await dbl(K, 'knob (double-click)'); await sleep(350);
    await dbl('W.fader.root', 'fader (double-click)', [0.8, 0.5]); await sleep(350);
    await dbl(RT0('lo'), 'range lo (double-click)');
    const r = await J(`return { knob: W.knob.get(), fader: W.fader.get(), lo: W.range.get()[0], n: W.n, dbl: __dbl };`);
    check('a mouse double-click is home ONCE on a knob, a fader and a range thumb (the browser fired dblclick three times and none of them answered; the second press starts no drag)',
      near(r.knob, 0.4, 1e-9) && near(r.fader, 0.5, 1e-9) && near(r.lo, 0.1, 1e-9) && r.dbl === 3 && r.n.knob === 2 && r.n.fader === 2 && r.n.range === 2, JSON.stringify(r));
    await J(`W.knob.set(0.4); W.range.set(0.25, 0.75); W.range.lo.setDefault(0.25); if (document.activeElement) document.activeElement.blur(); return 1;`); await sleep(350); }
  /* 1.6.0-alpha.20 A GESTURE ENDS ONE OF TWO WAYS: Escape mid-drag (a real key) puts a knob, a fader and a range thumb back where the hand found
     them and lands nothing; so does a cancelled pointer (it committed); the lift after it is nobody's */
  { const held2 = async (node, label, dx, dy, how, at) => { const s = await need(node, label, at); mods = 0; await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y);
      await mouse('mouseMoved', s.x + dx / 2, s.y + dy / 2); await mouse('mouseMoved', s.x + dx, s.y + dy); await sleep(40);
      const mid = await J(`return [W.knob.get(), W.fader.get(), W.range.get()[0]];`);
      if (how === 'esc') { await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); }
      else await J(`const n = ${node}; n.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })); return 1;`);
      await mouse('mouseMoved', s.x + dx * 2, s.y + dy * 2); await mouse('mouseReleased', s.x + dx * 2, s.y + dy * 2); await sleep(330); return mid; };
    await J(`W.knob.set(0.4); W.fader.set(0.2); W.range.set(0.25, 0.75); W.n.knob = W.n.fader = W.n.range = 0; return 1;`);
    const m1 = await held2(K, 'knob (Escape)', 0, -44, 'esc'), m2 = await held2('W.fader.root', 'fader (Escape)', 30, 0, 'esc', [0.6, 0.5]), m3 = await held2(RT0('lo'), 'range lo (Escape)', 40, 0, 'esc');
    const a = await J(`return { v: [W.knob.get(), W.fader.get(), W.range.get()[0]], n: W.n, drag: [W.knob.dragging(), W.fader.dragging()] };`);
    check('Escape mid-drag puts a knob, a fader and a range thumb back where the hand found them and lands nothing (each had moved under the hand)',
      near(m1[0], 0.6, 0.01) && m2[1] > 0.5 && m3[2] > 0.3 && near(a.v[0], 0.4, 1e-9) && near(a.v[1], 0.2, 1e-9) && near(a.v[2], 0.25, 1e-9) && a.n.knob + a.n.fader + a.n.range === 0 && !a.drag[0] && !a.drag[1], JSON.stringify({ m1, m2, m3, a }));
    const c1 = await held2(K, 'knob (cancel)', 0, -44, 'cancel'), c2 = await held2('W.fader.root', 'fader (cancel)', 30, 0, 'cancel', [0.6, 0.5]);
    const b = await J(`return { v: [W.knob.get(), W.fader.get()], n: W.n };`);
    check('a cancelled pointer puts a knob and a fader back too (it committed) and lands nothing', near(c1[0], 0.6, 0.01) && c2[1] > 0.5 && near(b.v[0], 0.4, 1e-9) && near(b.v[1], 0.2, 1e-9) && b.n.knob + b.n.fader === 0, JSON.stringify({ c1, c2, b }));
    await J(`if (document.activeElement) document.activeElement.blur(); return 1;`); }

  /* a second finger is the gear: real touch events */
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await J(`W.knob.set(0.4); return 1;`);
  { const s = await need(K, 'knob (touch)'); const f1 = (dy) => ({ x: s.x, y: s.y + dy, id: 1 }), f2 = { x: s.x + 200, y: s.y + 300, id: 2 };
    await touch('touchStart', [f1(0)]); await sleep(40);
    await touch('touchMove', [f1(-16)]); await sleep(40); await touch('touchMove', [f1(-32)]); await sleep(60);
    const a = await val('W.knob');
    await touch('touchStart', [f1(-32), f2]); await sleep(40);
    await touch('touchMove', [f1(-32), f2]); await sleep(40);
    const b = await val('W.knob');
    await touch('touchMove', [f1(-64), f2]); await sleep(60);
    const c = await val('W.knob');
    await touch('touchEnd', [f1(-64)]); await sleep(40); await touch('touchEnd', []); await sleep(120);
    check('knob: a finger travels 320 px for a full scale (32 px is a tenth)', near(a, 0.5), String(a));
    check('knob: a second finger put down moves nothing', near(b, a, 1e-9), a + ' → ' + b);
    check('knob: with the second finger down the first moves an eighth (32 px is 0.0125)', near(c, a + 0.0125, 0.0006), String(c));
  }
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });

  /* ── THE LAMP RULES ── */
  {
    const r = await J(`const probe = document.createElement('i'); probe.style.color = 'var(--acc)'; document.body.append(probe); const acc = getComputedStyle(probe).color; probe.remove();
      return { acc, lamp: !!W.swLamp.root.querySelector('.sw-led'), nolamp: !!W.swNoLamp.root.querySelector('.sw-led'), cls: W.swNoLamp.root.className, on: getComputedStyle(W.swNoLamp.root).color, led: getComputedStyle(W.swLamp.root.querySelector('.sw-led')).backgroundColor,
        trig: !!W.trig.root.querySelector('.sw-led'), pressed: W.swNoLamp.root.getAttribute('aria-pressed') };`);
    check('sw shows a lamp; sw({ lamp: false }) has none and its label is ON\'s light (accent); trig never has one', r.lamp && !r.nolamp && /sw-nolamp/.test(r.cls) && r.on === r.acc && !r.trig && r.pressed === 'true', JSON.stringify(r));
  }

  /* ── THE STEPPER ── */
  const SB = (i) => `W.stepper.root.querySelectorAll('.mir-step-b')[${i}]`, SN = 'W.stepper.name';
  await J(`W.stepper.set('overlay'); return 1;`);
  { const s = await need(SB(1), 'stepper ›'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(80); }
  check('stepper: › steps to the next mode, the name says it (aria-live)', (await val('W.stepper')) === 'soft light' && (await J(`return [W.stepper.name.textContent, W.stepper.name.querySelector('[aria-live]').getAttribute('aria-live')];`))[0] === 'SOFT LIGHT');
  { const sz = await J(`const b = ${SB(0)}.getBoundingClientRect(); return [b.width, b.height];`); check('stepper: the buttons are the full 44 px touch seat', sz[0] >= 44 && sz[1] >= 44, JSON.stringify(sz)); }
  /* call 18 (Josh, 2026-10-07): the arrows are DRAWN — glyph.js chevrons, no typed ‹ ›, 1em of the button's font, centred, and the
     press lands on the button (the drawing takes no pointer) */
  { const g = await J(`return [0, 1].map((i) => { const b = W.stepper.root.querySelectorAll('.mir-step-b')[i], s = b.querySelector('svg'), br = b.getBoundingClientRect(), sr = s ? s.getBoundingClientRect() : null;
      const hit = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
      return { text: b.textContent, cls: s ? s.getAttribute('class') : null, w: sr && sr.width, font: parseFloat(getComputedStyle(b).fontSize), dx: sr && Math.abs((sr.left + sr.width / 2) - (br.left + br.width / 2)), dy: sr && Math.abs((sr.top + sr.height / 2) - (br.top + br.height / 2)), hit: hit === b }; });`);
    check('stepper: ‹ › are drawn chevrons (chevronLeft / chevronRight), 1em, centred in the seat, and a press lands on the button',
      g[0].text === '' && g[1].text === '' && /gly-chevronLeft/.test(g[0].cls) && /gly-chevronRight/.test(g[1].cls) && g.every((x) => Math.abs(x.w - x.font) < 0.5 && x.dx < 0.6 && x.dy < 0.6 && x.hit), JSON.stringify(g)); }
  await J(`W.stepper.set('darken'); return 1;`);
  { const s = await need(SB(1), 'stepper › (wrap)'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(80); }
  check('stepper: it wraps (DARKEN › NORMAL)', (await val('W.stepper')) === 'normal');
  await J(`W.stepper.setItems(W.stepper.get() && [{ id: 'a', label: 'ALPHA' }, { id: 'b', label: 'BETA', coming: true }, { id: 'c', label: 'GAMMA' }, { id: 'd', label: 'DELTA' }, { id: 'e', label: 'EPSILON' }], 'a'); return 1;`);
  { const s = await need(SB(1), 'stepper › (coming)'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(80); }
  check('stepper: a `coming` item is skipped by the arrows', (await val('W.stepper')) === 'c');
  { const s = await need(SN, 'stepper name'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(150); }
  let lp = await J(`const l = document.querySelector('.mir-pick'); if (!l) return null; const r = l.getBoundingClientRect(); const rows = [...l.querySelectorAll('.mir-pick-i')];
    return { n: rows.length, surface: l.dataset.mirSurface, role: l.getAttribute('role'), sel: rows.filter((x) => x.getAttribute('aria-selected') === 'true').map((x) => x.textContent), coming: rows.filter((x) => x.classList.contains('coming')).map((x) => x.textContent),
      pos: getComputedStyle(l).position, glass: l.classList.contains('glass'), h: rows[0].getBoundingClientRect().height, expanded: W.stepper.name.getAttribute('aria-expanded'), inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, focus: document.activeElement.textContent };`);
  check('stepper: a tap on the name opens the full list in the menu pane (a glass menu surface, 44 px rows, the chosen one marked, `coming` dimmed, focus on the chosen)',
    !!lp && lp.n === 5 && lp.surface === 'menu' && lp.role === 'listbox' && lp.glass && lp.pos === 'fixed' && lp.sel[0] === 'GAMMA' && lp.coming[0] === 'BETA' && lp.h >= 44 && lp.expanded === 'true' && lp.inView && lp.focus === 'GAMMA', JSON.stringify(lp));
  { const s = await need(`[...document.querySelectorAll('.mir-pick-i')].find((x) => x.textContent === 'BETA')`, 'list: coming row'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(100); }
  check('list: a `coming` row is never chosen (the pane stays open)', !!(await J(`return !!document.querySelector('.mir-pick');`)) && (await val('W.stepper')) === 'c');
  await p.key('ArrowDown'); await p.key('ArrowDown'); await sleep(40);
  check('list: the arrows move the focus along the live rows', (await J(`return document.activeElement.textContent;`)) === 'EPSILON');
  await p.key('KeyA'); await sleep(40);
  check('list: a typed letter goes to the next row that starts with it', (await J(`return document.activeElement.textContent;`)) === 'ALPHA');
  await p.key('Enter'); await sleep(120);
  check('list: Enter picks, the pane closes, onChange has the pick (dir 0)', (await val('W.stepper')) === 'a' && !(await J(`return !!document.querySelector('.mir-pick');`)));
  { const s = await need(SN, 'stepper name'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(120); }
  { const s = await need(`[...document.querySelectorAll('.mir-pick-i')].find((x) => x.textContent === 'DELTA')`, 'list: DELTA'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(120); }
  check('list: a tap on a row picks it', (await val('W.stepper')) === 'd' && !(await J(`return !!document.querySelector('.mir-pick');`)));
  { const s = await need(SN, 'stepper name'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(120); }
  await p.key('Escape'); await sleep(80);
  check('list: Escape closes it and gives the focus back to the name', !(await J(`return !!document.querySelector('.mir-pick');`)) && (await J(`return document.activeElement === W.stepper.name;`)));
  { const s = await need(SN, 'stepper name'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(120); await mouse('mouseMoved', 5, 5); await mouse('mousePressed', 5, 5); await mouse('mouseReleased', 5, 5); await sleep(80); }
  check('list: a press outside closes it', !(await J(`return !!document.querySelector('.mir-pick');`)));
  /* one law for ↑ ↓ on a closed list (wave 19): the stepper's name does what the closed select does */
  await J(`W.stepper.set('c'); W.stepper.name.focus(); return 1;`); await p.key('ArrowDown'); await sleep(40);
  check('stepper: ↓ on the closed name steps to the next, as a closed select does (no list opens)', (await val('W.stepper')) === 'd' && !(await J(`return !!document.querySelector('.mir-pick');`)));
  await p.key('ArrowUp'); await sleep(40);
  check('stepper: ↑ on the closed name steps back', (await val('W.stepper')) === 'c');
  await p.key('Alt+ArrowDown'); await sleep(100);
  check('stepper: Alt+↓ opens the list, as on the select', await J(`return !!document.querySelector('.mir-pick');`));
  await p.key('Escape'); await sleep(80);
  { const r = await J(`const t = W.pager.root; return { list: W.pager.name.tagName, count: t.querySelector('.mir-step-count').textContent, form: t.classList.contains('mir-step-pager') };`);
    check('the page turner form: no list (the name is a label), the count says where it is', r.list === 'DIV' && r.count.trim() === '1 / 3' && r.form, JSON.stringify(r)); }

  /* ── THE SELECT ── */
  { const s = await need('W.select.button', 'select'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(150); }
  lp = await J(`const l = document.querySelector('.mir-pick'); if (!l) return null; const b = W.select.button.getBoundingClientRect(), r = l.getBoundingClientRect(); return { n: l.querySelectorAll('.mir-pick-i').length, native: document.querySelectorAll('select').length, wide: r.width >= b.width - 1, scrolls: l.scrollHeight >= l.clientHeight, sel: l.querySelector('[aria-selected="true"]').textContent, aria: W.select.button.getAttribute('aria-expanded'), vis: r.bottom <= innerHeight };`);
  check('select: opens the kit\'s menu pane (24 ports, no native <select>), at least as wide as the button, the chosen row selected', !!lp && lp.n === 24 && lp.native === 0 && lp.wide && lp.sel === 'MIDI PORT 4' && lp.aria === 'true' && lp.vis, JSON.stringify(lp));
  { const s = await need(`[...document.querySelectorAll('.mir-pick-i')].find((x) => x.textContent === 'MIDI PORT 9')`, 'select: port 9'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(120); }
  check('select: a row picks, the button says it, onChange fires, the pane closes', (await val('W.select')) === 'p8' && (await J(`return W.select.button.textContent.trim();`)) === 'MIDI PORT 9' && !(await J(`return !!document.querySelector('.mir-pick');`)));
  await J(`W.select.button.focus(); return 1;`); await p.key('ArrowDown'); await sleep(40);
  check('select: a closed select steps with the arrows, like the platform\'s', (await val('W.select')) === 'p9');

  /* ── THE NUMBER FIELD ── */
  const NF = 'W.number.face';
  await J(`W.number.set(12.5); return 1;`);
  await drag(NF, 'number', [[0, -11], [0, -22]]);
  v = await val('W.number'); check('number: a drag is the knob law (22 px up = a tenth of the 0..100 range, to the 0.5 step)', near(v, 22.5, 0.01), String(v));
  await J(`W.number.set(12.5); return 1;`);
  await drag(NF, 'number (Shift)', [[0, -5], [0, -6], [0, -7]], { mod: 8 });
  v = await val('W.number'); check('number: under Shift a stepped number moves one step a pixel, the slop not counted (1.5.7-alpha.45: 5 px slop, 2 px = 2 × 0.5 → 13.5)', near(v, 13.5, 0.01), String(v));
  { const s = await need(NF, 'number click'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(100); }
  const ed = await J(`const i = W.number.input; return { shown: !i.hidden, face: W.number.face.hidden, text: i.value, sel: i.selectionStart === 0 && i.selectionEnd === i.value.length, focus: document.activeElement === i, max: i.maxLength, mode: i.inputMode };`);
  check('number: a press that never travels opens the field with the number selected (the tempo field\'s law)', ed.shown && ed.face && ed.text === '13.5' && ed.sel && ed.focus && ed.max === 8 && ed.mode === 'decimal', JSON.stringify(ed));
  await p.key('Digit4'); await p.key('Digit2'); await p.key('Enter'); await sleep(80);
  v = await val('W.number'); check('number: typed 42 and Enter takes it; the face is back', near(v, 42, 1e-9) && !(await J(`return W.number.face.hidden;`)) && !!(await J(`return W.number.input.hidden;`)) && (await J(`return document.activeElement === W.number.face;`)), String(v));
  { const s = await need(NF, 'number click'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(100); }
  await p.key('Digit9'); await p.key('Escape'); await sleep(80);
  check('number: Escape does not take it', near(await val('W.number'), 42, 1e-9));
  await J(`W.number.face.focus(); return 1;`); await p.key('ArrowUp'); await p.key('Shift+ArrowUp'); await sleep(40);
  v = await val('W.number'); check('number: ↑ steps by one step, and Shift ↑ is one step too on a stepped number (42 → 42.5 → 43; 1.6.0-alpha.21)', near(v, 43, 1e-9), String(v));

  /* ── THE RANGE SLIDER ── */
  await J(`W.range.set(0.25, 0.75); return 1;`);
  const RT = (w) => `W.range.${w}.root`;
  { /* 1.6.0-alpha.3 THE WHEEL WAITS FOR A CLICK, on a thumb: unpressed nothing; pressed, a notch is the thumb's arrow step */
    await J(`if (document.activeElement) document.activeElement.blur(); return 1;`);
    let s = await need(RT('hi'), 'range hi (wheel)'); mods = 0; await mouse('mouseMoved', s.x, s.y);
    const wheel = async (dy) => { await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: s.x, y: s.y, deltaX: 0, deltaY: dy }); await sleep(80); };
    const y0 = await J(`return scrollY;`); await wheel(100); const cold = await J(`return W.range.get();`), y1 = await J(`return scrollY;`);
    s = await need(RT('hi'), 'range hi (wheel, pressed)'); await mouse('mouseMoved', s.x, s.y);   // the unpressed wheel scrolled the page: aim again
    await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(350);
    const held = await J(`return W.range.get();`), y2 = await J(`return scrollY;`); await wheel(100); const turned = await J(`return W.range.get();`), y3 = await J(`return scrollY;`);
    check('range: a wheel over an unpressed thumb changes nothing and scrolls the page; over the pressed, focused thumb one notch is its arrow step, the other thumb stays and the page does not scroll', near(cold[0], 0.25, 1e-9) && near(cold[1], 0.75, 1e-9) && y1 > y0 && turned[1] < held[1] && near(turned[0], held[0], 1e-9) && y3 === y2, JSON.stringify({ cold, held, turned, y: [y0, y1, y2, y3] }));
    await J(`document.activeElement.blur(); W.range.set(0.25, 0.75); return 1;`); }
  await drag(RT('lo'), 'range lo', [[40, 0], [80, 0]]);
  let rg = await J(`return W.range.get();`); check('range: the lo thumb drags right', rg[0] > 0.25 && near(rg[1], 0.75, 1e-9), JSON.stringify(rg));
  await drag(RT('hi'), 'range hi', [[-40, 0], [-80, 0]]);
  rg = await J(`return W.range.get();`); check('range: the hi thumb drags left', rg[1] < 0.75, JSON.stringify(rg));
  await J(`W.range.set(0.25, 0.75); return 1;`);
  await drag(RT('lo'), 'range lo (cross)', [[200, 0], [600, 0]]);
  rg = await J(`return W.range.get();`); check('range: the thumbs never cross (lo stops at hi)', rg[0] <= rg[1] && near(rg[0], rg[1], 0.011) && near(rg[1], 0.75, 1e-9), JSON.stringify(rg));
  await J(`W.range.set(0.25, 0.75); return 1;`);
  { const s = await need(`W.range.root.querySelector('.mir-rng-rail')`, 'range rail', [0.9, 0.5]); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(100); }
  rg = await J(`return W.range.get();`); check('range: a press on the track takes the NEAREST thumb (hi to 0.9)', near(rg[1], 0.9, 0.04) && near(rg[0], 0.25, 1e-9), JSON.stringify(rg));
  await J(`W.range.set(0.25, 0.75); W.range.lo.root.focus(); return 1;`); await p.key('ArrowRight'); await p.key('Shift+ArrowRight');
  rg = await J(`return W.range.get();`); check('range: the arrow keys move the focused thumb by a step (0.01); Shift on a stepped range is ignored, as on a stepped knob', near(rg[0], 0.27, 1e-9), JSON.stringify(rg));
  { const r = await J(`const t = W.range.hi.root; return { role: t.getAttribute('role'), now: t.getAttribute('aria-valuenow'), min: t.getAttribute('aria-valuemin'), max: t.getAttribute('aria-valuemax'), name: t.getAttribute('aria-label'), w: t.getBoundingClientRect().width };`);
    check('range: each thumb is a slider with its own bounds (hi cannot go under lo) and a name', r.role === 'slider' && +r.min >= 0.25 && +r.max === 1 && /high/i.test(r.name || ''), JSON.stringify(r)); }

  /* ── THE XY PAD ── */
  const PAD = 'W.xy.pad';
  await J(`W.xy.set(0.2, -0.3); return 1;`);
  { const s = await need(PAD, 'xy pad', [0.75, 0.25]); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseMoved', s.x + 1, s.y + 1); await mouse('mouseReleased', s.x + 1, s.y + 1); await sleep(100); }
  let xy = await J(`return W.xy.get();`);
  check('xy: a press at the pad\'s upper right brings both knobs there (x to the right, y up)', near(xy[0], 0.5, 0.06) && near(xy[1], 0.5, 0.06), JSON.stringify(xy));
  await sleep(450);                                         // a press within 320 ms of the last one is a double-tap, by the law
  { const s = await need(PAD, 'xy pad (drag)', [0.5, 0.5]); await J(`W.xy.set(0, 0); return 1;`); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseMoved', s.x + 40, s.y - 40); await sleep(30); await mouse('mouseMoved', s.x + 60, s.y - 60); await mouse('mouseReleased', s.x + 60, s.y - 60); await sleep(100); }
  xy = await J(`return W.xy.get();`); check('xy: a drag up and right moves the two knobs up and right', xy[0] > 0.2 && xy[1] > 0.2, JSON.stringify(xy));
  { const dot = await J(`const d = W.xy.pad.querySelector('.xy-dot'), pr = W.xy.pad.getBoundingClientRect(), b = d.getBoundingClientRect(); return { cx: (b.left + b.width / 2 - pr.left) / pr.width, cy: 1 - (b.top + b.height / 2 - pr.top) / pr.height, x: (W.xy.x.get() + 1) / 2, y: (W.xy.y.get() + 1) / 2 };`);
    check('xy: the dot is drawn at the knobs\' values (the pad paints from the knobs)', near(dot.cx, dot.x, 0.03) && near(dot.cy, dot.y, 0.03), JSON.stringify(dot)); }
  await sleep(450);
  { const s = await need(PAD, 'xy pad (fine)', [0.5, 0.5]); await J(`W.xy.set(0, 0); return 1;`); await mouse('mouseMoved', s.x, s.y); mods = 8; await mouse('mousePressed', s.x, s.y); await mouse('mouseMoved', s.x + 60, s.y); await mouse('mouseReleased', s.x + 60, s.y); mods = 0; await sleep(100); }
  xy = await J(`return W.xy.get();`); check('xy: under Shift nothing jumps to the pointer, and 60 px across a 240 px pad is an eighth of a quarter of the range (0.0625)', near(xy[0], 0.0625, 0.012) && Math.abs(xy[1]) < 1e-9, JSON.stringify(xy));
  await J(`W.xy.set(0.4, 0.4); W.xy.pad.focus(); return 1;`); await p.key('Home'); await sleep(40);
  xy = await J(`return W.xy.get();`); check('xy: Home centres (to its home, 0 0)', near(xy[0], 0, 1e-9) && near(xy[1], 0, 1e-9), JSON.stringify(xy));
  await J(`W.xy.set(0.4, 0.4); W.xy.pad.focus(); return 1;`); await p.key('Delete'); await sleep(40);
  xy = await J(`return W.xy.get();`); check('xy: Delete sends it home too, as on a knob (wave 19)', near(xy[0], 0, 1e-9) && near(xy[1], 0, 1e-9), JSON.stringify(xy));
  await J(`const { setKnobLaw } = await import('/mir/kit.js'); setKnobLaw({ keyFine: 0.5 }); W.xy.set(0, 0); W.xy.pad.focus(); return 1;`); await p.key('Shift+ArrowRight'); await sleep(40);
  xy = await J(`const { setKnobLaw } = await import('/mir/kit.js'); setKnobLaw({ keyFine: 1 / 8 }); return W.xy.get();`);
  check('xy: Shift+arrow is the kit\'s fine gear, read from setKnobLaw (keyFine ½: a two-hundredth of the range, 0.01)', near(xy[0], 0.01, 1e-9) && near(xy[1], 0, 1e-9), JSON.stringify(xy));
  await J(`W.xy.set(0.4, 0.4); return 1;`);
  await sleep(450);
  { const s = await need(PAD, 'xy pad (tap tap)', [0.5, 0.5]); await mouse('mouseMoved', s.x + 40, s.y + 40);
    await mouse('mousePressed', s.x + 40, s.y + 40); await mouse('mouseReleased', s.x + 40, s.y + 40); await sleep(60); await mouse('mousePressed', s.x + 40, s.y + 40); await mouse('mouseReleased', s.x + 40, s.y + 40); await sleep(100); }
  xy = await J(`return W.xy.get();`); check('xy: a double-tap centres', near(xy[0], 0, 1e-9) && near(xy[1], 0, 1e-9), JSON.stringify(xy));
  { const kd = await need('W.xy.x.root.querySelector(".k-dial")', 'xy knob x'); check('xy: its X knob is a kit knob a hand can reach', !!kd); }

  /* ── ROUTED: a real macro route onto the pad's knob moves the pad's dot ── */
  const rd = async () => J(`const d = W.rxy.pad.querySelector('.xy-dot'); return { x: +d.style.getPropertyValue('--x'), y: +d.style.getPropertyValue('--y'), mod: W.rxy.pad.classList.contains('mod'), ring: !W.rxy.pad.querySelector('.xy-base').hidden, base: [W.rxy.x.get(), W.rxy.y.get()], shown: W.rxy.x.shown, thumb: W.rrange.lo.shown, lomod: W.rrange.lo.root.classList.contains('mod'), baseTick: !W.rrange.root.querySelector('.mir-rng-base').hidden };`);
  const before = await rd();
  await J(`C.mod.setPower && C.mod.setPower(true); const r = ['demo.x', 'demo.y', 'demo.lo', 'demo.hi'].map((id) => C.mod.route('lfo', id, 0.4)); C.mod.play(true); window.__routes = r; return 1;`);
  const seen = []; for (let i = 0; i < 8; i++) { await sleep(180); seen.push(await rd()); }
  const xs = seen.map((s) => s.x), moved = Math.max(...xs) - Math.min(...xs);
  check('routed: a macro route onto the X knob moves the pad\'s dot (it swings while the hand\'s base stays put)', moved > 0.05 && seen.every((s) => near(s.base[0], before.base[0], 1e-9)), JSON.stringify({ moved, base: before.base, xs }));
  check('routed: the pad wears accent B\'s dot and keeps the hand\'s base as a ring', seen.some((s) => s.mod && s.ring), JSON.stringify(seen[seen.length - 1]));
  check('routed: a route onto a range thumb moves that thumb and draws its base tick (accent B ring)', seen.some((s) => s.lomod && s.baseTick), JSON.stringify({ lomod: seen[seen.length - 1].lomod, tick: seen[seen.length - 1].baseTick }));
  await J(`C.mod.play(false); window.__routes.forEach((r) => r.remove()); return 1;`);

  /* ── control(): ten descriptors, the right kind, in the document, hit-tested ── */
  const kinds = await J(`return Object.entries(W.factory).map(([id, c]) => [id, c.kind, c.root.isConnected, c.root.dataset.control, c.targets.length]);`);
  const want = { enable: 'switch', mode: 'segment', blend: 'stepper', view: 'segment', phase: 'knob', band: 'select', gain: 'knob', hue: 'arc', freq: 'lane', pan: 'xy', win: 'range', count: 'number' };
  check('control(): twelve descriptors give switch · segment · stepper · segment (six, in two rows) · knob (a phase) · select · knob · arc · lane · xy · range · number', kinds.every(([id, k, conn, ds]) => k === want[id] && conn && ds === k), JSON.stringify(kinds.map((k) => k.slice(0, 2))));
  check('control(): the targets are what a macro may route onto (knob, arc, lane: 1; xy and range: 2; the rest: none)', kinds.every(([id, , , , n]) => n === ({ gain: 1, phase: 1, hue: 1, freq: 1, pan: 2, win: 2 }[id] || 0)), JSON.stringify(kinds.map((k) => [k[0], k[4]])));
  { const hits = []; for (const id of Object.keys(want)) { const s = await spot(`W.factory.${id}.root`); hits.push(!!s && s.hit && s.w > 20); } check('control(): every control is hit-testable where it is drawn', hits.every(Boolean), JSON.stringify(hits)); }
  { const pr = await J(`const ps = W.factory.pan.params(), rs = W.factory.win.params(), ks = W.factory.gain.params(); return { pan: ps.map((q) => q.id), win: rs.map((q) => q.id), gain: ks.map((q) => [q.id, q.map, typeof q.get, typeof q.set, !!q.widget]), hue: W.factory.hue.params()[0].map, freq: W.factory.freq.params()[0].map, sw: W.factory.enable.params().length };`);
    check('control().params(): installModulation records, one per target (pan.x pan.y · win.lo win.hi · gain linear · hue wrap · freq log · a switch none)', pr.pan.join() === 'pan.x,pan.y' && pr.win.join() === 'win.lo,win.hi' && pr.gain[0][0] === 'gain' && pr.gain[0][1] === 'linear' && pr.hue === 'wrap' && pr.freq === 'log' && pr.sw === 0, JSON.stringify(pr)); }

  /* ── 1.6.0-alpha.21 THE KEYS AGREE (real keys on the focused control) ── */
  { const VK = { ArrowUp: 38, ArrowDown: 40, Home: 36, End: 35, PageUp: 33, PageDown: 34 };
    const key = async (k, m = 0) => { for (const type of ['keyDown', 'keyUp']) await p.send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: VK[k], modifiers: m }); await sleep(40); };
    await J(`W.number.set(12.5); W.number.face.focus(); return 1;`); await key('ArrowUp', 8); const shifted = await val('W.number'); await key('ArrowUp'); const plain = await val('W.number');
    check('number: on a stepped number Shift + ↑ is one step, as ↑ is (an eighth of a step rounded straight back: a dead key)', near(shifted, 13, 1e-9) && near(plain, 13.5, 1e-9), JSON.stringify({ shifted, plain }));
    await J(`W.select.set('p23'); W.select.button.focus(); return 1;`); await key('ArrowDown'); const wrapped = await val('W.select'); await key('ArrowUp'); const back = await val('W.select');
    await J(`W.select.open(); return 1;`); await sleep(80); await key('ArrowDown'); const paneAt = await J(`return document.activeElement.dataset.id;`); await key('ArrowUp'); const paneBack = await J(`return document.activeElement.dataset.id;`);
    await J(`W.select.close(false); return 1;`);
    check('select: the walk wraps at both ends, closed (↓ on the last is the first, ↑ back) and in the open pane', wrapped === 'p0' && back === 'p23' && paneAt === 'p0' && paneBack === 'p23', JSON.stringify({ wrapped, back, paneAt, paneBack }));
    await J(`W.stepper.set('c'); W.stepper.name.focus(); return 1;`); await key('End'); const last = await val('W.stepper'); await key('Home'); const first = await val('W.stepper');
    check('stepper: End is the last live item and Home the first', last === 'e' && first === 'a', JSON.stringify({ last, first }));
    /* 1.6.0-alpha.22 NO CONTROL KEEPS THE LAW AS A NUMBER: with the arrow's gear retuned (keyFine ½, the drag's divisor left at 8), Shift + ↑ on an
       unstepped range thumb and on an unstepped number is HALF a plain arrow (the range kept a literal ⅛, the number read the drag's divisor) */
    { await J(`C.kit.setKnobLaw({ keyFine: 0.5 }); W.law = { r: C.control({ id: 'law.r', label: 'LAW', type: 'range', min: 0, max: 1, value: [0.2, 0.8] }), n: C.control({ id: 'law.n', label: 'LAWN', value: 5 }) };
        document.body.append(W.law.r.root, W.law.n.root); W.law.r.widget.hi.root.focus(); return 1;`);
      await key('ArrowUp', 8); const hi = (await J(`return W.law.r.get();`))[1];
      await J(`W.law.n.widget.face.focus(); return 1;`); await key('ArrowUp', 8); const num = await J(`return W.law.n.get();`);
      const law = await J(`const l = C.kit.setKnobLaw({ fine: 8 }); W.law.r.root.remove(); W.law.n.root.remove(); return l;`);
      check('setKnobLaw({ keyFine }) reaches the range thumb\'s and the number\'s Shift + arrow (0.8 → 0.805, 5 → 5.5), and { fine: 8 } puts the law back', near(hi, 0.805, 1e-9) && near(num, 5.5, 1e-9) && law.keyFine === 0.125 && law.fine === 8, JSON.stringify({ hi, num, law })); }
    await J(`W.knob.set(0.4); if (document.activeElement) document.activeElement.blur(); return 1;`);
    const s = await need(K, 'knob (press takes the focus)'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(60);
    const kf = await J(`return document.activeElement === W.knob.root;`);
    const f = await need('W.fader.root', 'fader (press takes the focus)', [0.5, 0.5]); await mouse('mouseMoved', f.x, f.y); await mouse('mousePressed', f.x, f.y); await mouse('mouseReleased', f.x, f.y); await sleep(60);
    const ff = await J(`return document.activeElement === W.fader.root;`);
    check('a pressed knob and a pressed fader hold the focus (the arrows after a click are the control\'s)', kf && ff, JSON.stringify({ kf, ff }));
    await J(`if (document.activeElement) document.activeElement.blur(); return 1;`); await sleep(330); }

  /* ── 1.6.0-alpha.23 ONE SPELLING ON EVERY BUILDER: home · options · title · setDisabled · root · the trigger's glyph form ── */
  { const r = await J(`const k = C.kit, hintOf = (n) => n.getAttribute('title') || '';
      const kn = k.knob({ label: 'H', min: 0, max: 1, value: 0.7, home: 0.2 }), fd = k.fader({ label: 'F', min: 0, max: 1, value: 0.7, home: 0.2, title: 'a fader hint' });
      kn.home(); fd.root.mirKnob.home();
      const rg = C.control({ id: 'o.r', type: 'range', min: 0, max: 1, value: [0.3, 0.6], home: [0.1, 0.9] }); document.body.append(rg.root);
      for (const t of rg.targets) { t.root.focus(); t.root.dispatchEvent(new KeyboardEvent('keydown', { code: 'Delete', key: 'Delete', bubbles: true, cancelable: true })); }
      const nm = C.control({ id: 'o.n', label: 'N', hint: 'a number hint', value: 4, home: 9 }); document.body.append(nm.root);
      nm.widget.face.dispatchEvent(new KeyboardEvent('keydown', { code: 'Delete', key: 'Delete', bubbles: true, cancelable: true }));
      const xy = C.control({ id: 'o.xy', label: 'P', hint: 'a pad hint', pair: [{ id: 'o.x', label: 'X', min: 0, max: 1, value: 0.5 }, { id: 'o.y', label: 'Y', min: 0, max: 1, value: 0.5 }] });
      const sw = k.sw({ label: 'S', value: false }), sg = k.seg({ label: 'G', value: 'a', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] }), tg = k.trig({ label: 'T' });
      document.body.append(sw.root, sg.root, tg.root); sg.button('c').disabled = true;
      let fired = 0; sw.setDisabled(true); sg.setDisabled(true); tg.setDisabled(true); W.stepper.setDisabled(true);
      sw.root.click(); sg.button('b').click(); const before = W.stepper.get(); W.stepper.step(1);
      const off = { sw: sw.get(), seg: sg.get(), trig: tg.root.disabled, segAll: ['a', 'b', 'c'].every((id) => sg.button(id).disabled), step: W.stepper.get() === before, stepArrows: W.stepper.prev.disabled && W.stepper.next.disabled, stepCls: W.stepper.root.classList.contains('disabled') };
      sw.setDisabled(false); sg.setDisabled(false); tg.setDisabled(false); W.stepper.setDisabled(false);
      sw.root.click(); sg.button('b').click(); W.stepper.step(1);
      const on = { sw: sw.get(), seg: sg.get(), trig: tg.root.disabled, segC: sg.button('c').disabled, step: W.stepper.get() !== before };
      const g = W.trigGlyph.root, out = { knob: kn.get(), fader: fd.get(), range: rg.get(), number: nm.get(),
        hints: [hintOf(fd.root), hintOf(nm.root), hintOf(xy.root), hintOf(W.select.root)], off, on,
        glyph: { cls: g.classList.contains('trig-glyph'), name: g.getAttribute('aria-label'), word: !!g.querySelector('.trig-l'), svg: !!g.querySelector('.trig-g svg'), w: g.getBoundingClientRect().width, h: g.getBoundingClientRect().height },
        sel: W.select.get(), pick: (W.select.open(), document.querySelectorAll('.mir-pick-i').length) };
      W.select.close(false); W.trigGlyph.setLabel('Add two'); out.glyph.renamed = g.getAttribute('aria-label');
      for (const n of [rg.root, nm.root, sw.root, sg.root, tg.root]) n.remove();
      return out;`);
    check('home: knob({ home }), fader({ home }), a range\'s home: [lo, hi] and a number\'s home are where home goes (0.2 · 0.2 · [0.1, 0.9] · 9)',
      near(r.knob, 0.2, 1e-9) && near(r.fader, 0.2, 1e-9) && near(r.range[0], 0.1, 1e-9) && near(r.range[1], 0.9, 1e-9) && r.number === 9, JSON.stringify([r.knob, r.fader, r.range, r.number]));
    check('title: a fader, a number, an XY pad and a select wear their hint on the root', r.hints.join('|') === 'a fader hint|a number hint|a pad hint|Which port to listen to', JSON.stringify(r.hints));
    check('setDisabled: a switch, a seg, a trigger and a stepper stand down and come back; an option the app disabled itself stays disabled',
      r.off.sw === false && r.off.seg === 'a' && r.off.trig && r.off.segAll && r.off.step && r.off.stepArrows && r.off.stepCls && r.on.sw === true && r.on.seg === 'b' && !r.on.trig && r.on.segC && r.on.step, JSON.stringify({ off: r.off, on: r.on }));
    check('trig({ glyph, word: false }): the glyph alone on a square touch seat, the label its accessible name (setLabel renames it); `options` fills a select',
      r.glyph.cls && r.glyph.name === 'Add one' && !r.glyph.word && r.glyph.svg && r.glyph.w >= 44 && r.glyph.w <= 48 && r.glyph.h >= 44 && r.glyph.renamed === 'Add two' && r.pick === 24, JSON.stringify(r.glyph) + ' ' + r.pick); }

  /* 1.6.0-alpha.24: six short options are a segment in TWO ROWS of three (all six seen, none wider than its column); a phase is a free knob, not an arc */
  { const r = await J(`const v = W.factory.view.root, bs = [...v.querySelectorAll('.seg-b')].map((b) => b.getBoundingClientRect()), ph = W.factory.phase.root;
      return { cls: v.classList.contains('seg-2'), n: bs.length, rows: [...new Set(bs.map((b) => Math.round(b.top)))].length, cols: [...new Set(bs.map((b) => Math.round(b.left)))].length,
        same: Math.max(...bs.map((b) => b.width)) - Math.min(...bs.map((b) => b.width)) < 1, arc: ph.classList.contains('k-arcknob'), knob: ph.classList.contains('k') };`);
    check('six short options are a segment in two rows of three equal columns; a wrapped phase is a knob, not an arc', r.cls && r.n === 6 && r.rows === 2 && r.cols === 3 && r.same && !r.arc && r.knob, JSON.stringify(r)); }

  /* ── light: the same page, the other theme, still drawn ── */
  await J(`document.body.dataset.theme = 'light'; return 1;`); await sleep(200);
  const light = await J(`const cs = (n, pr) => getComputedStyle(n)[pr]; const rt = W.range.hi.root, pad = W.xy.pad, face = W.number.face, sel = W.select.button;
    return { thumb: cs(rt, 'backgroundColor'), pad: cs(pad, 'backgroundColor'), ink: getComputedStyle(pad).getPropertyValue('--xy-lattice-ink').trim(), face: cs(face, 'color'), sel: cs(sel, 'color'), bg: cs(document.body, 'backgroundColor') };`);
  check('light theme: the controls take the light theme\'s tokens (the thumb and the field are not the dark ones, the ink is dark; the pad has no well since alpha.21, its lattice ink is the light well)', light.face !== 'rgb(255, 255, 255)' && light.thumb !== 'rgba(0, 0, 0, 0)' && light.pad === 'rgba(0, 0, 0, 0)' && light.ink !== '' && !/var\(/.test(light.ink) && /^rgb\((\d+), (\d+), (\d+)\)$/.test(light.face) && +light.face.match(/\d+/g)[0] < 120, JSON.stringify(light));
} catch (e) { check('the test ran to the end', false, String(e && e.stack || e)); }

const logs = p.logs.filter((l) => !/favicon|Failed to load resource/.test(l));
if (logs.length) check('no console errors or warnings', false, JSON.stringify(logs));
if (misses.length) check('every press was hit-tested (elementFromPoint found the control)', false, misses.join(' · '));
else check('every press was hit-tested (elementFromPoint found the control)', true);
await p.close();
console.log(results.join('\n'));
const bad = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - bad}/${results.length} passed`);
process.exit(bad ? 1 : 0);
