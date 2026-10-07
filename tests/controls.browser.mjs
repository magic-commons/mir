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
  const last = steps[steps.length - 1]; await mouse('mouseReleased', s.x + last[0], s.y + last[1]); mods = 0; await sleep(120);
  return s;
}
const val = (node) => J(`return ${node}.get();`);

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
  /* ONE double-tap law (Josh, 2026-10-07, call 20): 300 ms and 14 px — two presses 330 ms apart, or 20 px apart, are not home */
  { await J(`W.knob.set(0.9); return 1;`); await sleep(350);
    const s = await need(K, 'knob (slow taps)'); mods = 0; await mouse('mouseMoved', s.x, s.y);
    await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(330); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(350);
    const slow = await val('W.knob');
    await mouse('mousePressed', s.x - 10, s.y); await mouse('mouseReleased', s.x - 10, s.y); await sleep(40); await mouse('mousePressed', s.x + 10, s.y); await mouse('mouseReleased', s.x + 10, s.y); await sleep(350);
    const apart = await val('W.knob');
    check('knob: two taps 330 ms apart, or 20 px apart, are not home (300 ms within 14 px)', near(slow, 0.9, 1e-6) && near(apart, 0.9, 1e-6), JSON.stringify({ slow, apart })); }

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
  await drag(NF, 'number (Shift)', [[0, -88]], { mod: 8 });
  v = await val('W.number'); check('number: Shift is the eighth gear (88 px = 0.1 of range / 8 · 4 ≈ 5 → 17.5)', near(v, 17.5, 0.01), String(v));
  { const s = await need(NF, 'number click'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(100); }
  const ed = await J(`const i = W.number.input; return { shown: !i.hidden, face: W.number.face.hidden, text: i.value, sel: i.selectionStart === 0 && i.selectionEnd === i.value.length, focus: document.activeElement === i, max: i.maxLength, mode: i.inputMode };`);
  check('number: a press that never travels opens the field with the number selected (the tempo field\'s law)', ed.shown && ed.face && ed.text === '17.5' && ed.sel && ed.focus && ed.max === 8 && ed.mode === 'decimal', JSON.stringify(ed));
  await p.key('Digit4'); await p.key('Digit2'); await p.key('Enter'); await sleep(80);
  v = await val('W.number'); check('number: typed 42 and Enter takes it; the face is back', near(v, 42, 1e-9) && !(await J(`return W.number.face.hidden;`)) && !!(await J(`return W.number.input.hidden;`)) && (await J(`return document.activeElement === W.number.face;`)), String(v));
  { const s = await need(NF, 'number click'); await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(100); }
  await p.key('Digit9'); await p.key('Escape'); await sleep(80);
  check('number: Escape does not take it', near(await val('W.number'), 42, 1e-9));
  await J(`W.number.face.focus(); return 1;`); await p.key('ArrowUp'); await p.key('Shift+ArrowUp'); await sleep(40);
  v = await val('W.number'); check('number: ↑ steps by one step, Shift ↑ an eighth of it (42 → 42.5 → 42.5625 → 42.5)', near(v, 42.5, 0.1), String(v));

  /* ── THE RANGE SLIDER ── */
  await J(`W.range.set(0.25, 0.75); return 1;`);
  const RT = (w) => `W.range.${w}.root`;
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
  const want = { enable: 'switch', mode: 'segment', blend: 'stepper', band: 'select', gain: 'knob', hue: 'arc', freq: 'lane', pan: 'xy', win: 'range', count: 'number' };
  check('control(): ten descriptors give switch · segment · stepper · select · knob · arc · lane · xy · range · number', kinds.every(([id, k, conn, ds]) => k === want[id] && conn && ds === k), JSON.stringify(kinds.map((k) => k.slice(0, 2))));
  check('control(): the targets are what a macro may route onto (knob, arc, lane: 1; xy and range: 2; the rest: none)', kinds.every(([id, , , , n]) => n === ({ gain: 1, hue: 1, freq: 1, pan: 2, win: 2 }[id] || 0)), JSON.stringify(kinds.map((k) => [k[0], k[4]])));
  { const hits = []; for (const id of Object.keys(want)) { const s = await spot(`W.factory.${id}.root`); hits.push(!!s && s.hit && s.w > 20); } check('control(): every control is hit-testable where it is drawn', hits.every(Boolean), JSON.stringify(hits)); }
  { const pr = await J(`const ps = W.factory.pan.params(), rs = W.factory.win.params(), ks = W.factory.gain.params(); return { pan: ps.map((q) => q.id), win: rs.map((q) => q.id), gain: ks.map((q) => [q.id, q.map, typeof q.get, typeof q.set, !!q.widget]), hue: W.factory.hue.params()[0].map, freq: W.factory.freq.params()[0].map, sw: W.factory.enable.params().length };`);
    check('control().params(): installModulation records, one per target (pan.x pan.y · win.lo win.hi · gain linear · hue wrap · freq log · a switch none)', pr.pan.join() === 'pan.x,pan.y' && pr.win.join() === 'win.lo,win.hi' && pr.gain[0][0] === 'gain' && pr.gain[0][1] === 'linear' && pr.hue === 'wrap' && pr.freq === 'log' && pr.sw === 0, JSON.stringify(pr)); }

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
