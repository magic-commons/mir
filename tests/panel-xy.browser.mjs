/* panel-xy.browser.mjs — the XY CONTROLLER under a real browser (gallery/panel-xy.html), real input through CDP, every press hit-tested with
 * elementFromPoint first.
 *   · PAIR: a drag on the pad moves the app's two parameters (CENTRE X / Y) by the share of the pad it crossed, the DEMO window's own knobs
 *     follow, and the pad's knobs are the app's targets (data-param demo.cx / demo.cy); the drag is one history row and UNDO takes it back.
 *   · ROUTE: X's grip, dragged onto the DEMO window's SIZE knob, routes macro XY X there (the modulation window's own grip and drop); then the
 *     pad moves SIZE through the route, and back.
 *   · MORPH: Shift-click on corner A and a hold on corner D store the dials as they stand onto them; ENGAGE (a real press); a drag on the pad
 *     blends them, each dial in its own map: SIZE (log) geometrically, SPIN (linear) arithmetically, POINTS (a step) the nearest corner's.
 * Standalone: MIR_BASE=http://127.0.0.1:8863 node tests/panel-xy.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8863';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
const near = (a, b, e = 0.02) => Math.abs(a - b) <= e;

const p = await launch({ width: 1400, height: 1300 });
const J = async (expr) => JSON.parse(await p.eval(`(async () => { const K = window.__K; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); return JSON.stringify(await (async () => { ${expr} })()); })()`));
const misses = [];
let held = false, mods = 0;
const mouse = (type, x, y) => { if (type === 'mousePressed') held = true; if (type === 'mouseReleased') held = false;
  return p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1, modifiers: mods }); };
/** where a node is drawn, and whether elementFromPoint at that spot finds it or a child of it */
const spot = (node, at = [0.5, 0.5]) => J(`const n = ${node}; if (!n) return null; n.scrollIntoView({ block: 'center' }); const b = n.getBoundingClientRect(), x = Math.round(b.left + b.width * ${at[0]}), y = Math.round(b.top + b.height * ${at[1]});
  const h = document.elementFromPoint(x, y); return { x, y, w: b.width, h: b.height, hit: !!h && (h === n || n.contains(h)) };`);
async function need(node, label, at) { const s = await spot(node, at); if (!s) { misses.push(label + ': not found'); return null; } if (!s.hit) misses.push(label + ': elementFromPoint missed'); return s; }
async function drag(node, label, steps, { at } = {}) {
  const s = await need(node, label, at); if (!s) return null;
  mods = 0; await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y);
  for (const [dx, dy] of steps) { await mouse('mouseMoved', s.x + dx, s.y + dy); await sleep(20); }
  const last = steps[steps.length - 1]; await mouse('mouseReleased', s.x + last[0], s.y + last[1]); await sleep(200);
  return s;
}
async function click(node, label, { mod = 0, hold = 0 } = {}) {
  const s = await need(node, label); if (!s) return null;
  mods = 0; await mouse('mouseMoved', s.x, s.y); mods = mod; await mouse('mousePressed', s.x, s.y); if (hold) await sleep(hold); await mouse('mouseReleased', s.x, s.y); mods = 0; await sleep(200); return s;
}
const steps = (dx, dy, n = 8) => Array.from({ length: n }, (_, i) => [dx * (i + 1) / n, dy * (i + 1) / n]);
const CARD = `document.querySelector('.dev[data-id="xy"]')`;
const BODY = (m) => `${CARD}.querySelector('.xy-body[data-mode="${m}"]')`;
const PAD = (m) => `${BODY(m)}.querySelector('.xy-pad')`;
const SEG = (m) => `[...${CARD}.querySelectorAll('.xy-head .seg-b')][${['pair', 'route', 'morph'].indexOf(m)}]`;
const DEMO = (id) => `document.querySelector('.dev[data-id="demo"] .k[data-param="${id}"]')`;
const S = () => J(`return { ...K.S };`);

try {
  await p.goto(BASE.replace(/\/$/, '') + '/gallery/panel-xy.html?reset', 1200);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await sleep(500);
  check('the gallery page builds the DEMO window and the XY card with no console error', (await p.eval('!!window.__ready')) && p.logs.length === 0, JSON.stringify(p.logs));
  const lay = await J(`return { modes: K.xy.modes(), mode: K.xy.mode(), seg: [...${CARD}.querySelectorAll('.xy-head .seg-b')].map((b) => b.textContent.trim()), params: [...${PAD('pair')}.closest('.mir-xy').querySelectorAll('.mir-xy-side .k')].map((k) => k.dataset.param) };`);
  check('one card, three uses on a segment at its head (PAIR · ROUTE · MORPH), PAIR first; the pair\'s pad knobs are the app\'s targets', lay.seg.join() === 'PAIR,ROUTE,MORPH' && lay.mode === 'pair' && lay.params.join() === 'demo.cx,demo.cy', JSON.stringify(lay));

  /* ── PAIR ── */
  const h0 = await J(`return K.history.length;`);
  const ps = await drag(PAD('pair'), 'pair pad', steps(60, -40));
  const s1 = await S();
  const ex = ps ? 2 * 60 / ps.w : 0, ey = ps ? 2 * 40 / ps.h : 0;
  check('PAIR: a real drag on the pad moves CENTRE X right and CENTRE Y up by the share of the pad it crossed', near(s1.cx, ex, 0.03) && near(s1.cy, ey, 0.03), JSON.stringify({ cx: s1.cx, cy: s1.cy, ex, ey }));
  const kv = await J(`return [${DEMO('demo.cx')}, ${DEMO('demo.cy')}].map((k) => +k.getAttribute('aria-valuenow'));`);
  check('PAIR: the DEMO window\'s own knobs follow the pad', near(kv[0], s1.cx, 0.01) && near(kv[1], s1.cy, 0.01), JSON.stringify(kv));
  const h1 = await J(`const e = K.history.entries(); return { n: K.history.length, label: e[e.length - 1].label };`);
  await click(`[...document.querySelectorAll('#bar .trig')].find((b) => b.querySelector('.trig-l').textContent.trim() === 'UNDO')`, 'UNDO');
  const s1u = await S();
  check('PAIR: the drag is one history row (named for the pad and the window) and UNDO puts the pair back', h1.n === h0 + 1 && /XY/.test(h1.label) && near(s1u.cx, 0, 1e-9) && near(s1u.cy, 0, 1e-9), JSON.stringify({ h0, h1, cx: s1u.cx }));

  /* ── ROUTE ── */
  await click(SEG('route'), 'ROUTE segment');
  check('ROUTE: a real press on the segment shows the ROUTE body', await J(`return K.xy.mode() === 'route' && !${BODY('route')}.hidden && ${BODY('pair')}.hidden;`));
  const size0 = (await S()).size;
  const grip = await need(`${BODY('route')}.querySelector('.xy-grip[data-axis="x"]')`, 'X grip');
  const knob = await need(`${DEMO('demo.size')}.querySelector('.k-dial')`, 'SIZE knob');
  if (grip && knob) {
    mods = 0; await mouse('mouseMoved', grip.x, grip.y); await mouse('mousePressed', grip.x, grip.y);
    for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', grip.x + (knob.x - grip.x) * i / 12, grip.y + (knob.y - grip.y) * i / 12); await sleep(25); }
    await mouse('mouseReleased', knob.x, knob.y); await sleep(250);
  }
  const rt = await J(`const M = K.mod.M; return { macro: M.macroOf('xy:x') && M.macroOf('xy:x').name, routes: M.routesOfTarget('demo.size').map((r) => r.macroId), n: ${BODY('route')}.querySelector('.xy-grip[data-axis="x"] .xy-grip-n').textContent };`);
  check('ROUTE: X\'s grip dragged onto SIZE routes macro XY X there (the window\'s own grip and drop), and the grip says it reaches one control', rt.macro === 'XY X' && rt.routes.includes('xy:x') && rt.n === '→ 1', JSON.stringify(rt));
  await drag(PAD('route'), 'route pad', steps(70, 0));
  const r1 = await J(`return { size: K.S.size, x: K.mod.M.macroOf('xy:x').value, shown: K.knobs.size.shown, cur: K.mod.currentOf('demo.size') };`);
  await drag(PAD('route'), 'route pad (back)', steps(-140, 0));
  const r2 = await J(`return { size: K.S.size, x: K.mod.M.macroOf('xy:x').value };`);
  check('ROUTE: the pad moves macro X, and SIZE follows through the route (its knob shows the modulated value); back at the left edge SIZE is home', r1.x > 0.75 && r1.size < size0 - 0.05 && near(r1.shown, r1.size, 1e-6) && near(r1.cur, r1.size, 1e-6) && r2.x < 0.01 && near(r2.size, size0, 1e-6), JSON.stringify({ size0, r1, r2 }));
  await J(`K.mod.M.removeRoutesOfMacro('xy:x'); K.mod.host.clock.applyAll(true); K.mod.paintWidgets(); await wait(80); return 1;`);   // the next part reads SIZE unrouted

  /* ── MORPH ── */
  await click(SEG('morph'), 'MORPH segment');
  const put = (v) => J(`const v = ${JSON.stringify(v)}; for (const [k, x] of Object.entries(v)) { K.S[k] = x; K.knobs[k].set(x); } return 1;`);
  await put({ size: 0.1, spin: 0.2, count: 4 });
  await click(`${BODY('morph')}.querySelector('.xy-corner[data-corner="A"]')`, 'corner A (Shift-click)', { mod: 8 });
  await put({ size: 0.8, spin: 0.6, count: 9 });
  await click(`${BODY('morph')}.querySelector('.xy-corner[data-corner="D"]')`, 'corner D (hold)', { hold: 650 });
  const bk = await J(`const m = K.xy.morph(); return { corners: m.bank.corners, slots: m.bank.slots.filter(Boolean).map((s) => s.values), rows: ${BODY('morph')}.querySelectorAll('.xy-row').length, a: ${BODY('morph')}.querySelector('.xy-corner[data-corner="A"]').textContent.trim() };`);
  check('MORPH: a Shift-click on corner A and a hold on corner D store the dials onto them (two rows in the bank, A and D named)', bk.corners[0] === 0 && bk.corners[3] === 1 && bk.rows === 2 && bk.slots[0]['demo.size'] === 0.1 && bk.slots[1]['demo.size'] === 0.8 && /SNAP 1/.test(bk.a), JSON.stringify(bk));
  await click(`${BODY('morph')}.querySelector('.xy-engage')`, 'ENGAGE');
  const ps2 = await drag(PAD('morph'), 'morph pad', steps(40, -55));
  const mo = await J(`const { blend, LOG, LINEAR, STEP } = await import('/mir/panels/morph.js'); const m = K.xy.morph(), x = m.x, y = m.y;
    return { engaged: m.engaged, x, y, size: K.S.size, spin: K.S.spin, count: K.S.count, eSize: blend(LOG, .1, .1, .1, .8, x, y), eSpin: blend(LINEAR, .2, .2, .2, .6, x, y), eCount: blend(STEP, 4, 4, 4, 9, x, y),
      arith: .1 + (.8 - .1) * x * y, knob: +${DEMO('demo.size')}.getAttribute('aria-valuenow') };`);
  check('MORPH: ENGAGE and a drag blend the corners, each dial in its own map — SIZE geometric (not arithmetic), SPIN linear, POINTS a corner\'s value; the DEMO knob follows',
    mo.engaged && mo.x > 0.55 && mo.y > 0.55 && near(mo.size, mo.eSize, 1e-9) && Math.abs(mo.size - mo.arith) > 0.01 && near(mo.spin, mo.eSpin, 1e-9) && mo.count === mo.eCount && near(mo.knob, mo.size, 0.01), JSON.stringify(mo));
  const part = await J(`const { captureProject } = await import('/mir/core/project.js'); const c = captureProject(); const x = c && (c.parts ? c.parts.xy : c.xy); return x ? { mode: x.mode, banks: Object.keys(x.banks) } : c;`);
  check('the panel rides in the project as the part "xy" (its use and the bank)', part && part.mode === 'morph' && part.banks.includes('demo'), JSON.stringify(part));
} catch (e) {
  check('the run', false, e && e.stack || String(e));
} finally {
  if (misses.length) check('every press was hit-tested by elementFromPoint and found its target', false, misses.join('; '));
  else check('every press was hit-tested by elementFromPoint and found its target', true);
  console.log(results.join('\n'));
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(failed ? `${failed} FAILED` : `ALL ${results.length} PASS`);
  await p.close();
  process.exit(failed ? 1 : 0);
}
