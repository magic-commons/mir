/* panel-grade.browser.mjs — the GRADE and CURVES panels under a real browser (gallery/panel-grade.html, gallery/panel-curves.html), real input
 * through CDP, every press hit-tested with elementFromPoint first, and every picture check read off the SCREEN (a screenshot of a few pixels,
 * decoded by the page): what the filter did is what the compositor drew, not what the canvas holds.
 *   · THE DEFAULT costs nothing: at home the picture has no filter at all.
 *   · SATURATION to 0 (a real drag on its knob) turns a red patch grey; a double-tap brings it home and the red back.
 *   · INVERT (a real press on its glyph) flips the picture; the glyph is the state (no lamp).
 *   · A ROUTED macro (an LFO) moves HUE: the value swings, the filter's matrix follows, the arc shows it, the hand's base stays.
 *   · OPACITY (a press on the lane slider), BLEND (the stepper's ›), the PORT card (a knob on an app's own drawing, no filter on it).
 *   · CURVES: a press on the plot adds a point and dragging it up brightens the mid-grey; dragged out of the plot it is removed; a double-tap
 *     removes one; the R channel's curve moves red alone; GRADE's INVERT on the same picture composes with the curve (one filter).
 *   · THE PROJECT carries both as parts; at rest nothing runs.
 * Standalone: MIR_BASE=http://127.0.0.1:8862 node tests/panel-grade.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = (process.env.MIR_BASE || 'http://127.0.0.1:8862').replace(/\/$/, '');
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
const near = (a, b, e) => Math.abs(a - b) <= e;

const p = await launch({ width: 1400, height: 1100 });
const J = async (expr) => JSON.parse(await p.eval(`(async () => { const K = window.__K; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); return JSON.stringify(await (async () => { ${expr} })()); })()`));
const misses = [];
let held = false, mods = 0;
const mouse = (type, x, y) => { if (type === 'mousePressed') held = true; if (type === 'mouseReleased') held = false;
  return p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1, modifiers: mods }); };
const spot = (node, at = [0.5, 0.5]) => J(`const n = ${node}; if (!n) return null; n.scrollIntoView({ block: 'nearest' }); const b = n.getBoundingClientRect(), x = Math.round(b.left + b.width * ${at[0]}), y = Math.round(b.top + b.height * ${at[1]});
  const h = document.elementFromPoint(x, y); return { x, y, w: b.width, h: b.height, left: b.left, top: b.top, hit: !!h && (h === n || n.contains(h)) };`);
async function need(node, label, at) { const s = await spot(node, at); if (!s) { misses.push(label + ': not found'); return null; } if (!s.hit) misses.push(label + ': elementFromPoint missed'); return s; }
async function drag(node, label, steps, { at, settle = 200 } = {}) {
  const s = await need(node, label, at); if (!s) return null;
  await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y);
  for (const [dx, dy] of steps) { await mouse('mouseMoved', s.x + dx, s.y + dy); await sleep(20); }
  const last = steps[steps.length - 1]; await mouse('mouseReleased', s.x + last[0], s.y + last[1]); await sleep(settle);
  return s;
}
async function click(node, label, at) { const s = await need(node, label, at); if (!s) return null; await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(200); return s; }
async function dbl(node, label, at) { const s = await need(node, label, at); if (!s) return null; await mouse('mouseMoved', s.x, s.y); for (let i = 0; i < 2; i++) { await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(60); } await sleep(200); return s; }
const steps = (dx, dy, n = 8) => Array.from({ length: n }, (_, i) => [dx * (i + 1) / n, dy * (i + 1) / n]);
/** the colour on the SCREEN at the centre of a node's fraction (a 3 × 3 screenshot, decoded by the page, averaged) */
async function pixel(node, at) {
  const s = await J(`const n = ${node}; const b = n.getBoundingClientRect(); return { x: Math.round(b.left + b.width * ${at[0]}) - 1, y: Math.round(b.top + b.height * ${at[1]}) - 1 };`);
  await sleep(120);
  const r = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: s.x, y: s.y, width: 3, height: 3, scale: 1 } });
  return J(`const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,${r.result.data}')).blob()); const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data; const o = [0, 0, 0]; for (let i = 0; i < d.length; i += 4) { o[0] += d[i]; o[1] += d[i + 1]; o[2] += d[i + 2]; } const k = d.length / 4; return o.map((v) => Math.round(v / k));`);
}
const D = (id) => `document.querySelector('.dev[data-id="${id}"]')`;
const PIC = `document.getElementById('pic')`;
const RED = [0.06 + 0.12, 0.66 + 0.14], GREY = [0.38 + 0.12, 0.66 + 0.14], BLUE = [0.70 + 0.12, 0.66 + 0.14];   // the patches' centres, as shares of the picture
const dial = (card, param) => `${D(card)}.querySelector('[data-param="${param}"] .k-dial')`;

try {
  /* ═══ GRADE ═══ */
  await p.goto(BASE + '/gallery/panel-grade.html?reset', 1200);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await sleep(500);
  check('the grade page builds both cards with no console error', (await p.eval('!!window.__ready')) && p.logs.length === 0, JSON.stringify(p.logs));

  const lay = await J(`const g = ${D('grade')}.querySelector('.mir-grade'); return { rows: [...g.children].map((r) => r.className.replace('grade-row ', '')),
    kinds: [...g.querySelectorAll('[data-control]')].map((n) => n.dataset.control), lamp: !!g.querySelector('.grade-invert .sw-led'), glyph: !!g.querySelector('.grade-invert svg'),
    params: [...g.querySelectorAll('[data-param]')].map((n) => n.dataset.param), filter: K.pic.style.filter, desc: K.pg.model.filter.describe() };`);
  check('the rows: four tone knobs, BLACK · WHITE, OPACITY, HUE and INVERT, BLEND', lay.rows.join() === 'grade-knobs,grade-levels,grade-amount,grade-turns,grade-blend', lay.rows.join());
  check('built only from the control language: knob ×4, range, lane, arc, a switch whose glyph is the state (no lamp), a stepper', lay.kinds.join() === 'knob,knob,knob,knob,range,lane,arc,switch,stepper' && !lay.lamp && lay.glyph, lay.kinds.join() + ' lamp=' + lay.lamp);
  check('every continuous control is a modulation target (grade.exposure … grade.opacity, the levels\' two thumbs)', ['grade.exposure', 'grade.contrast', 'grade.gamma', 'grade.saturation', 'grade.black', 'grade.white', 'grade.opacity', 'grade.hue'].every((x) => lay.params.includes(x)), lay.params.join());
  check('the default costs nothing: at home the picture carries no filter at all', lay.filter === '' && !lay.desc.matrix && !lay.desc.table, JSON.stringify(lay.desc));

  const red0 = await pixel(PIC, RED);
  check('the red patch is red on the screen', red0[0] > 190 && red0[1] < 90 && red0[2] < 70, JSON.stringify(red0));

  /* SATURATION → 0: a real drag down on its knob (half the scale is 110 px; 150 clamps at 0) */
  await drag(dial('grade', 'grade.saturation'), 'SATURATION knob', steps(0, 150));
  const sat = await J(`return K.pg.model.read('saturation');`);
  const grey = await pixel(PIC, RED);
  check('SATURATION dragged to 0 (a real drag): the value is 0 and the filter carries the matrix', near(sat, 0, 1e-9) && (await J(`return K.pg.model.filter.describe().matrix;`)), String(sat));
  check('…and the red patch is grey on the screen', near(grey[0], grey[1], 6) && near(grey[1], grey[2], 6) && grey[0] > 60 && grey[0] < 140, JSON.stringify(grey));
  await dbl(dial('grade', 'grade.saturation'), 'SATURATION knob (double-tap)');
  const red1 = await pixel(PIC, RED);
  check('a double-tap brings SATURATION home (1) and the red back; the matrix leaves the filter', near(await J(`return K.pg.model.read('saturation');`), 1, 1e-9) && near(red1[0], red0[0], 4) && !(await J(`return K.pg.model.filter.describe().matrix;`)), JSON.stringify(red1));

  /* INVERT: a real press on the glyph */
  const INV = `${D('grade')}.querySelector('.grade-invert')`;
  await click(INV, 'INVERT');
  const inv = await pixel(PIC, RED), invG = await pixel(PIC, GREY);
  const invState = await J(`const b = ${INV}; return { on: b.classList.contains('on'), pressed: b.getAttribute('aria-pressed'), v: K.pg.model.read('invert'), turn: getComputedStyle(b.querySelector('svg')).transform };`);
  check('INVERT (a real press): the red patch becomes its negative on the screen (220,60,40 → 35,195,215)', near(inv[0], 255 - red0[0], 12) && near(inv[1], 255 - red0[1], 12) && near(inv[2], 255 - red0[2], 12), JSON.stringify({ inv, red0 }));
  check('…the mid-grey stays mid-grey, and the switch says ON by its glyph turned over (aria-pressed, no lamp)', near(invG[0], 127, 6) && invState.on && invState.pressed === 'true' && invState.v === true && invState.turn !== 'none', JSON.stringify({ invG, invState }));
  await click(INV, 'INVERT again');
  check('INVERT again: the picture is back and the filter is gone', (await J(`return K.pic.style.filter;`)) === '' && near((await pixel(PIC, RED))[0], red0[0], 4));

  /* OPACITY: a press at 30 % of the lane slider; BLEND: the stepper's › */
  const LANE = `${D('grade')}.querySelector('[data-param="grade.opacity"]')`;
  await click(LANE, 'OPACITY lane', [0.3, 0.5]);
  const op = await J(`return { v: K.pg.model.read('opacity'), css: K.pic.style.opacity };`);
  check('OPACITY (a press on the lane slider): the value jumps where it came down and the picture\'s CSS opacity follows', near(op.v, 0.3, 0.06) && near(+op.css, op.v, 0.01), JSON.stringify(op));
  await dbl(LANE, 'OPACITY lane (double-tap)', [0.5, 0.5]);
  check('a double-tap on the lane brings OPACITY home (1) and the CSS opacity leaves', near(await J(`return K.pg.model.read('opacity');`), 1, 1e-9) && (await J(`return K.pic.style.opacity;`)) === '');
  await click(`${D('grade')}.querySelectorAll('.grade-blend .mir-step-b')[1]`, 'BLEND ›');
  const bl = await J(`return { v: K.pg.model.read('blend'), css: K.pic.style.mixBlendMode, name: ${D('grade')}.querySelector('.grade-blend .mir-step-text').textContent };`);
  check('BLEND (the stepper\'s ›): MULTIPLY, and the picture\'s mix-blend-mode follows', bl.v === 'multiply' && bl.css === 'multiply' && bl.name === 'MULTIPLY', JSON.stringify(bl));
  await click(`${D('grade')}.querySelectorAll('.grade-blend .mir-step-b')[0]`, 'BLEND ‹');

  /* a ROUTED macro moves HUE */
  await click(`document.querySelector('#bar .trig')`, 'ROUTE');
  const seen = [];
  for (let i = 0; i < 12; i++) { await sleep(150); seen.push(await J(`const k = ${D('grade')}.querySelector('[data-param="grade.hue"]'); const fe = document.querySelector('.mir-picture-filters feColorMatrix');
    return { v: K.pg.model.read('hue'), base: K.mod.baseOf('grade.hue'), m: fe ? fe.getAttribute('values') : '', on: K.pg.model.filter.describe().matrix, live: k.style.getPropertyValue('--live-turn') || k.getAttribute('aria-valuenow'), modc: k.classList.contains('k-mod') || k.classList.contains('has-ring') };`)); }
  const hs = seen.map((s) => s.v), span = Math.max(...hs) - Math.min(...hs);
  check('routed: the LFO moves HUE (the value swings) and the filter\'s colour matrix follows', span > 20 && new Set(seen.map((s) => s.m)).size > 4 && seen.some((s) => s.on), JSON.stringify({ span, mats: new Set(seen.map((s) => s.m)).size }));
  check('routed: the arc shows it (its ring is a route\'s) and the hand\'s base stays at 0', seen.some((s) => s.modc) && seen.every((s) => near(s.base, 0, 1e-6)), JSON.stringify({ base: seen[0].base, modc: seen.map((s) => s.modc).join('') }));
  const hueShot = await pixel(PIC, RED);
  check('…and the screen turns: the red patch is no longer the red it was', Math.abs(hueShot[0] - red0[0]) + Math.abs(hueShot[1] - red0[1]) + Math.abs(hueShot[2] - red0[2]) > 30, JSON.stringify(hueShot));
  await click(`document.querySelector('#bar .trig')`, 'ROUTE off');
  await J(`await wait(300); return 1;`);

  /* the PORT card: a knob on an app's own drawing; no filter on it */
  const own0 = await J(`return K.V.exposure;`);
  await drag(dial('gport', 'gport.exposure'), 'PORT EXPOSURE knob', steps(0, -44));
  const own1 = await J(`return { v: K.V.exposure, filter: K.own.style.filter, extras: [...${D('gport')}.querySelectorAll('.grade-extra [data-param]')].map((n) => n.dataset.param), blend: !!${D('gport')}.querySelector('.grade-blend') };`);
  check('the PORT card: a real drag on EXPOSURE reaches the app\'s port.set (×1.74: a fifth of a log 0.25…4 scale), and no filter is on its picture', near(own1.v, own0 * Math.pow(16, 0.2), 0.05) && own1.filter === '', JSON.stringify(own1));
  check('…its own rows by descriptor are modulation targets too (gport.vibrance, gport.tint) and the row it hid (BLEND) is not drawn', own1.extras.join() === 'gport.vibrance,gport.tint' && !own1.blend, JSON.stringify(own1.extras));

  const part = await J(`const m = await import('/mir/core/project.js'); const c = m.captureProject(); return { names: m.projectPartNames(), g: c.grade && c.grade.values };`);
  check('the values ride in the project as a part named for the panel', part.names.includes('grade') && part.names.includes('gport') && part.g && part.g.saturation === 1 && part.g.blend === 'normal', JSON.stringify(part));

  await sleep(400);
  const f0 = await J(`const m = await import('/mir/core/perf.js'); return m.snapshot().frames || 0;`);
  await sleep(900);
  const f1 = await J(`const m = await import('/mir/core/perf.js'); return m.snapshot().frames || 0;`);
  check('at rest the panels cost no frames (nothing re-reads anything on a timer)', f1 - f0 <= 1, JSON.stringify({ f0, f1 }));
  check('no console error on the grade page', p.logs.length === 0, JSON.stringify(p.logs));

  /* ═══ CURVES ═══ */
  p.logs.length = 0;
  await p.goto(BASE + '/gallery/panel-curves.html?reset', 1200);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await sleep(500);
  const PLOT = `${D('curves')}.querySelector('.cv-svg')`;
  const pts = () => J(`return K.pc.model.points('MASTER').map((q) => [+q.t.toFixed(3), +q.v.toFixed(3)]);`);
  const g0 = await pixel(PIC, GREY);
  check('the curves page builds, the mid-grey patch reads 128 and no filter is on the picture', near(g0[0], 128, 4) && (await J(`return K.pic.style.filter;`)) === '' && p.logs.length === 0, JSON.stringify({ g0, logs: p.logs }));

  /* a press on the plot at (0.4, 0.4) adds a point there; dragged up to 0.7 it lifts the middle */
  const plot = await spot(PLOT);
  const at = (t, v) => [t, 1 - v];
  await drag(PLOT, 'the plot (add a point)', steps(0, -0.3 * plot.h), { at: at(0.4, 0.4) });
  const p1 = await pts(), g1 = await pixel(PIC, GREY);
  check('a press on the plot adds a point and the drag carries it up: three points, the new one at (0.4, ≈0.7)', p1.length === 3 && near(p1[1][0], 0.4, 0.02) && near(p1[1][1], 0.7, 0.03), JSON.stringify(p1));
  check('…and the mid-grey is brighter on the screen (128 → ≈191)', g1[0] > 170 && near(g1[0], g1[1], 4) && near(g1[1], g1[2], 4), JSON.stringify(g1));
  check('…the filter carries the table, and the plot\'s ink is accent B on MASTER', (await J(`return K.pc.model.filter.describe().table && /url\\(/.test(K.pic.style.filter) && ${D('curves')}.querySelector('.mir-curves').dataset.channel === 'master';`)));

  /* GRADE's INVERT on the same picture composes with the curve: one filter */
  await click(`${D('grade')}.querySelector('.grade-invert')`, 'INVERT (curves page)');
  const gi = await pixel(PIC, GREY);
  check('GRADE\'s INVERT on the same picture composes with the curve (≈255 − 191): one filter, two panels', near(gi[0], 255 - g1[0], 10) && (await J(`return document.querySelectorAll('.mir-picture-filters filter').length;`)) === 1, JSON.stringify(gi));
  await click(`${D('grade')}.querySelector('.grade-invert')`, 'INVERT off (curves page)');

  /* drag the point out of the plot: removed on release */
  await drag(PLOT, 'the point (drag out)', steps(plot.w * 0.6 + 60, 0), { at: at(0.4, 0.7) });
  const p2 = await pts(), g2 = await pixel(PIC, GREY);
  check('a point dragged out of the plot is removed on release (Photoshop), and the mid-grey is back', p2.length === 2 && near(g2[0], 128, 4), JSON.stringify({ p2, g2 }));

  /* a double-tap on a point removes it */
  await drag(PLOT, 'the plot (add again)', steps(0, -0.2 * plot.h, 4), { at: at(0.25, 0.25) });
  const p3 = await pts();
  await dbl(PLOT, 'the point (double-tap)', at(p3[1][0], p3[1][1]));
  const p4 = await pts();
  check('a double-tap on a point removes it', p3.length === 3 && p4.length === 2, JSON.stringify({ p3, p4 }));

  /* the R channel alone */
  await click(`${D('curves')}.querySelectorAll('.curves-channel .seg-b')[1]`, 'CHANNEL R');
  await drag(PLOT, 'the R plot', steps(0, -0.3 * plot.h), { at: at(0.4, 0.4) });
  const gr = await pixel(PIC, GREY);
  const rState = await J(`return { ch: K.pc.model.channel(), n: K.pc.model.points('R').length, m: K.pc.model.points('MASTER').length, ink: ${D('curves')}.querySelector('.mir-curves').dataset.channel };`);
  check('the R channel: its curve moves red alone (the grey patch turns red: r up, g and b as they were)', rState.ch === 'R' && rState.n === 3 && rState.m === 2 && rState.ink === 'r' && gr[0] > 170 && near(gr[1], 128, 5) && near(gr[2], 128, 5), JSON.stringify({ gr, rState }));
  await click(`${D('curves')}.querySelector('.curves-reset')`, 'RESET');
  check('RESET (a real press) puts the R channel back on the diagonal', (await J(`return K.pc.model.points('R').length;`)) === 2 && near((await pixel(PIC, GREY))[0], 128, 4));

  /* the keys: + chooses a point, ↑ moves it */
  await click(`${D('curves')}.querySelectorAll('.curves-channel .seg-b')[0]`, 'CHANNEL MASTER');
  await drag(PLOT, 'the plot (a point for the keys)', steps(0, 1, 2), { at: at(0.5, 0.5 + 0.06) });
  const k0 = await pts();
  await p.key('PageUp');
  const k1 = await pts();
  check('the keys: the chosen point moves up a tenth on Page Up', k0.length === 3 && near(k1[1][1] - k0[1][1], 0.1, 0.005), JSON.stringify({ k0, k1 }));

  const cpart = await J(`const m = await import('/mir/core/project.js'); const c = m.captureProject(); return c.curves;`);
  check('the curves ride in the project (the MASTER channel\'s points; the identity channels left out)', cpart && cpart.curves && Array.isArray(cpart.curves.MASTER) && cpart.curves.MASTER.length === 3 && !cpart.curves.R, JSON.stringify(cpart));
  const amt = await J(`return [...document.querySelectorAll('[data-param]')].map((n) => n.dataset.param).includes('curves.amount');`);
  check('AMOUNT is a modulation target (curves.amount)', amt);

  check('every press the test made was found and hit-tested by elementFromPoint', misses.length === 0, misses.join('; '));
  check('no console error on the curves page', p.logs.length === 0, JSON.stringify(p.logs));
} finally { await p.close(); }

for (const r of results) console.log(r);
const bad = results.filter((r) => r.startsWith('FAIL'));
console.log(`${results.length - bad.length}/${results.length} passed`);
process.exit(bad.length ? 1 : 0);
