/* camera.browser.mjs — the CAMERA panel under a real browser (gallery/panel-camera.html), real input through CDP, every press hit-tested with
 * elementFromPoint first.
 *   · THE LAYOUT is BASINS' as Josh left it: the verb row is the first row, no heading, no divider; 2-D has PAN HOME and NORTH, 3-D has HOME.
 *   · THE PAD moves pan, and both of its knobs (the modulation targets) show it; a knob drag moves the pad's dot; the picture's CSS transform follows.
 *   · NORTH goes north and, pressed again, back to where it left; routed, it moves the BASE and comes back.
 *   · A ROUTED macro turns ROTATION and the arc follows (accent B), the hand's base staying put.
 *   · THE SPHERE: a drag turns yaw and pitch and the arrow's tip follows the finger; Shift is the ⅛ gear; the picture's perspective follows.
 *   · A PORT BY HAND (radians, port.turn, HAND, a verb of its own): the sphere turns the engine through port.turn, DRAG is a knob on the engine, HOME and
 *     the verb run, and nothing is polled (idle costs no frames).
 *   · THE PROJECT carries the values as parts named for the panels.
 * Standalone: MIR_BASE=http://127.0.0.1:8861 node tests/camera.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8861';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
const near = (a, b, e = 0.02) => Math.abs(a - b) <= e;

const p = await launch({ width: 1400, height: 1500 });
const J = async (expr) => JSON.parse(await p.eval(`(async () => { const K = window.__K; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); return JSON.stringify(await (async () => { ${expr} })()); })()`));
const misses = [];
let held = false, mods = 0;
const mouse = (type, x, y) => { if (type === 'mousePressed') held = true; if (type === 'mouseReleased') held = false;
  return p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1, modifiers: mods }); };
/** where a node is drawn, and whether elementFromPoint at that spot finds it or a child of it */
const spot = (node, at = [0.5, 0.5]) => J(`const n = ${node}; if (!n) return null; n.scrollIntoView({ block: 'center' }); const b = n.getBoundingClientRect(), x = Math.round(b.left + b.width * ${at[0]}), y = Math.round(b.top + b.height * ${at[1]});
  const h = document.elementFromPoint(x, y); return { x, y, w: b.width, h: b.height, hit: !!h && (h === n || n.contains(h)) };`);
async function need(node, label, at) { const s = await spot(node, at); if (!s) { misses.push(label + ': not found'); return null; } if (!s.hit) misses.push(label + ': elementFromPoint missed'); return s; }
async function drag(node, label, steps, { mod = 0, at } = {}) {
  const s = await need(node, label, at); if (!s) return null;
  mods = 0; await mouse('mouseMoved', s.x, s.y); mods = mod; await mouse('mousePressed', s.x, s.y);
  for (const [dx, dy] of steps) { await mouse('mouseMoved', s.x + dx, s.y + dy); await sleep(20); }
  const last = steps[steps.length - 1]; await mouse('mouseReleased', s.x + last[0], s.y + last[1]); mods = 0; await sleep(160);
  return s;
}
async function click(node, label) { const s = await need(node, label); if (!s) return null; mods = 0; await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(160); return s; }
/** a drag of (dx, dy) in eight small steps: the sphere is small, and its law is the tip following the finger step by step */
const fine = (dx, dy, n = 8) => Array.from({ length: n }, (_, i) => [dx * (i + 1) / n, dy * (i + 1) / n]);
const D = (id) => `document.querySelector('.dev[data-id="${id}"]')`;
const get = (panel, id) => J(`return K.${panel}.port.get(${JSON.stringify(id)});`);
const xf = () => J(`return K.pic2.style.transform;`);

try {
  await p.goto(BASE.replace(/\/$/, '') + '/gallery/panel-camera.html?reset', 1200);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await sleep(500);
  check('the gallery page builds the three cards with no console error', (await p.eval('!!window.__ready')) && p.logs.length === 0, JSON.stringify(p.logs));

  /* ── THE LAYOUT ── */
  const lay = await J(`const rows = (id) => [...document.querySelector('.dev[data-id="' + id + '"] .mir-camera').children].map((c) => c.className.replace('cam-row ', '')); const q = (id, s) => document.querySelectorAll('.dev[data-id="' + id + '"] ' + s).length;
    return { r2: rows('camera2d'), r3: rows('camera3d'), re: rows('cameraeng'), verbs2: [...document.querySelectorAll('.dev[data-id="camera2d"] .cam-verbs .trig')].map((b) => b.textContent.trim()), verbs3: [...document.querySelectorAll('.dev[data-id="camera3d"] .cam-verbs .trig')].map((b) => b.textContent.trim()),
      verbsE: [...document.querySelectorAll('.dev[data-id="cameraeng"] .cam-verbs .trig')].map((b) => b.textContent.trim()), title2: q('camera2d', '.cam-title, hr, .grp-lbl'), hand3: q('camera3d', '.cam-hand'), handE: q('cameraeng', '.cam-hand') };`);
  check('2-D: the verb row is the very top row (PAN HOME, NORTH), then the dials, the pad, the scales; no heading and no divider', lay.r2[0] === 'cam-verbs' && lay.verbs2.join() === 'PAN HOME,NORTH' && lay.r2.join() === 'cam-verbs,cam-view,cam-pan,cam-scales' && lay.title2 === 0, JSON.stringify(lay));
  check('3-D: HOME on the verb row, then CONTROL, the sphere, the view dials; no HAND (the CSS camera has none)', lay.r3[0] === 'cam-verbs' && lay.verbs3.join() === 'HOME' && lay.r3.includes('cam-sphere') && lay.hand3 === 0, JSON.stringify(lay.r3));
  check('the engine port: its own verb first, then HOME; a HAND section because the port has the hand\'s ids', lay.verbsE.join() === 'RESET ZOOM,HOME' && lay.handE === 1, JSON.stringify(lay.verbsE));

  /* ── THE PAD and its two knobs ── */
  const PAD = D('camera2d') + '.querySelector(".xy-pad")';
  const KX = D('camera2d') + '.querySelectorAll(".mir-xy-side .k")[0].querySelector(".k-dial")';
  const KXR = D('camera2d') + '.querySelectorAll(".mir-xy-side .k")[0]';
  const KYR = D('camera2d') + '.querySelectorAll(".mir-xy-side .k")[1]';
  const x0 = await xf();
  const padS = await drag(PAD, 'pad', [[20, -10], [60, -30], [90, -45]]);
  const px = await get('p2', 'panX'), py = await get('p2', 'panY');
  const expect = padS ? 2 * 90 / padS.w : 0;
  check('the pad: a real drag moves pan X right and pan Y up by the share of the pad it crossed (and both are in the port)', near(px, expect, 0.03) && py > 0.1, JSON.stringify({ px, py, expect, w: padS && padS.w }));
  const kv = await J(`const r = (n) => n.getAttribute('aria-valuenow'); return [r(${KXR}), r(${KYR})].map(Number);`);
  check('the pad\'s two knobs show it (they are the modulation targets: data-param camera ids)', near(kv[0], px, 0.01) && near(kv[1], py, 0.01) && (await J(`return [${KXR}.dataset.param, ${KYR}.dataset.param];`)).join() === 'cam2d.panx,cam2d.pany', JSON.stringify(kv));
  const x1 = await xf();
  check('the picture moved: a CSS translate by the pan, a share of its width, up is up', x1 !== x0 && /translate\([1-9]/.test(x1) && /translate\([^,]+, -/.test(x1), x1);
  await J(`K.p2.view().home(); await wait(120); return 1;`);
  const before = await get('p2', 'panX');
  await drag(KX, 'pan X knob', [[0, -11], [0, -22]]);
  const after = await get('p2', 'panX');
  check('the X knob: 22 px up is a tenth of its scale (0.2 of −1…1), and the pad\'s dot followed', near(after - before, 0.2, 0.02), JSON.stringify({ before, after }));
  await J(`K.p2.view().home(); await wait(120); return 1;`);
  check('PAN HOME (a real press) brings pan home', (await click(D('camera2d') + '.querySelector(".cam-home")', 'PAN HOME'), near(await get('p2', 'panX'), 0, 1e-6) && near(await get('p2', 'panY'), 0, 1e-6)));

  /* ── NORTH, and back ── */
  const ROT = D('camera2d') + '.querySelector(".cam-view .k .k-dial")';
  await drag(ROT, 'rotation arc', [[0, -20], [0, -40], [0, -55]]);
  const r90 = await get('p2', 'rotation');
  check('ROTATION is an arc: 55 px up is a quarter of 360° (90°)', near(r90, 90, 4), String(r90));
  const NORTH = D('camera2d') + '.querySelector(".cam-north")';
  await click(NORTH, 'NORTH');
  const r0 = await get('p2', 'rotation');
  const lit = await J(`return ${NORTH}.classList.contains('on');`);
  check('NORTH goes north (rotation 0) and lights', near(r0, 0, 0.2) && lit, JSON.stringify({ r0, lit }));
  await click(NORTH, 'NORTH again');
  const rb = await get('p2', 'rotation');
  check('NORTH pressed again goes back to where it left (the memory)', near(rb, r90, 0.2), JSON.stringify({ rb, r90 }));
  const tip = await J(`return ${NORTH}.title;`);
  check('and its hint names where it will go back to', /go back to/i.test(tip) || /back to/.test(tip), tip);
  { const s = await need(ROT, 'rotation arc (double-tap)'); mods = 0; if (s) { await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(60); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(200); } }
  const rh = await get('p2', 'rotation');
  await click(NORTH, 'NORTH after the double-tap');
  const rh2 = await get('p2', 'rotation');
  check('a double-tap on ROTATION is a trip north and remembers where it left (BASINS): NORTH then goes back', near(rh, 0, 0.2) && near(rh2, r90, 0.3), JSON.stringify({ rh, rh2 }));

  /* ── a ROUTED macro turns ROTATION; the arc follows; the hand's base stays ── */
  const ROUTE = `document.querySelector('#bar .trig')`;
  await click(ROUTE, 'ROUTE');
  const seen = []; for (let i = 0; i < 12; i++) { await sleep(150); seen.push(await J(`const k = ${D('camera2d')}.querySelector('.cam-view .k'); return { v: K.p2.port.get('rotation'), base: K.mod.baseOf('cam2d.rotation'), live: k.style.getPropertyValue('--live-turn'), modc: k.classList.contains('k-mod'), tf: K.pic2.style.transform };`)); }
  const vs = seen.map((s) => s.v), span = Math.max(...vs) - Math.min(...vs);
  check('routed: the LFO turns ROTATION (the port\'s number swings) and the picture turns with it', span > 8 && new Set(seen.map((s) => s.tf)).size > 4, JSON.stringify({ span, n: new Set(seen.map((s) => s.tf)).size }));
  check('routed: the arc follows (its live ring moves, accent B) and the hand\'s base stays where it was', new Set(seen.map((s) => s.live)).size > 4 && seen.some((s) => s.modc) && seen.every((s) => near(s.base, rb, 0.01)), JSON.stringify({ lives: new Set(seen.map((s) => s.live)).size, base: seen[0].base }));
  await click(NORTH, 'NORTH (routed)');
  const bn = await J(`return K.mod.baseOf('cam2d.rotation');`);
  await click(NORTH, 'NORTH (routed) again');
  const bb = await J(`return K.mod.baseOf('cam2d.rotation');`);
  check('routed: NORTH moves the BASE (the route keeps turning about it) and the next press returns it', near(bn, 0, 0.5) && near(bb, rb, 0.5), JSON.stringify({ bn, bb, rb }));
  await click(ROUTE, 'ROUTE off'); await J(`K.mod.play(false); return 1;`);

  /* ── THE SPHERE: 3-D, no engine ── */
  const SPH = D('camera3d') + '.querySelector(".cs-svg")';
  const TIP = D('camera3d') + '.querySelector(".cs-tip")';
  const tipAt = () => J(`const b = ${TIP}.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2];`);
  await J(`K.p3.port.set('yaw', 20); K.p3.port.set('pitch', 15); await wait(200); return 1;`);
  const t0 = await tipAt(), y0 = await get('p3', 'yaw'), pi0 = await get('p3', 'pitch');
  await drag(SPH, 'sphere', fine(12, -5.6), { at: [0.25, 0.5] });
  const t1 = await tipAt(), y1 = await get('p3', 'yaw'), pi1 = await get('p3', 'pitch');
  const dtx = t1[0] - t0[0], dty = t1[1] - t0[1];
  check('the sphere: a real drag turns yaw and pitch', Math.abs(y1 - y0) > 3 && Math.abs(pi1 - pi0) > 1, JSON.stringify({ y0, y1, pi0, pi1 }));
  check('the arrow\'s tip follows the finger (a 12 px × 5.6 px drag moves it about 12 × 5.6 px, the way the finger went)', dtx > 0 && dty < 0 && Math.abs(dtx - 12) < 4 && Math.abs(dty + 5.6) < 3, JSON.stringify({ dtx, dty }));
  const knobsNow = await J(`const ks = [...${D('camera3d')}.querySelectorAll('.mir-camsphere-side .k')]; return ks.map((k) => Number(k.getAttribute('aria-valuenow')));`);
  check('the sphere\'s two arcs (yaw, pitch: the targets) show it', near(knobsNow[0], y1, 0.5) && near(knobsNow[1], pi1, 0.5), JSON.stringify({ knobsNow, y1, pi1 }));
  const tf3 = await J(`return document.getElementById('pic3').style.transform;`);
  check('the picture turned in perspective (rotateY follows yaw)', new RegExp('rotateY\\(' + y1.toFixed(1).replace('.', '\\.') + '|rotateY\\(' + y1.toFixed(0)).test(tf3) || /rotateY\(-?[1-9]/.test(tf3), tf3);
  await J(`K.p3.port.set('yaw', 20); K.p3.port.set('pitch', 15); await wait(200); return 1;`);
  const g0 = await get('p3', 'yaw');
  await drag(SPH, 'sphere (Shift)', fine(24, 0), { at: [0.25, 0.5], mod: 8 });
  const g1 = await get('p3', 'yaw');
  await J(`K.p3.port.set('yaw', 20); await wait(200); return 1;`);
  await drag(SPH, 'sphere (full)', fine(3, 0, 3), { at: [0.25, 0.5] });
  const g2 = await get('p3', 'yaw');
  check('Shift is the ⅛ gear: 24 px under Shift turns yaw as far as 3 px does without it', Math.abs(g1 - g0) > 0.2 && near((g2 - 20) / (g1 - g0), 1, 0.2), JSON.stringify({ fine24: g1 - g0, full3: g2 - 20 }));
  const modeSeg = D('camera3d') + '.querySelectorAll(".cam-mode .seg-b")[1]';
  await click(modeSeg, 'FREE');
  check('TURNTABLE · FREE is a segment: FREE is chosen (the port holds the mode)', (await get('p3', 'mode')) === 'free');
  await click(D('camera3d') + '.querySelector(".cam-home")', 'HOME');
  check('HOME (a real press) restores yaw and pitch', near(await get('p3', 'yaw'), 0, 1e-6) && near(await get('p3', 'pitch'), 0, 1e-6));

  /* ── A PORT BY HAND: radians, port.turn, HAND, a verb ── */
  const ESPH = D('cameraeng') + '.querySelector(".cs-svg")';
  const e0 = await J(`return { yaw: K.E.yaw, pitch: K.E.pitch };`);
  await drag(ESPH, 'engine sphere', fine(20, 0), { at: [0.25, 0.5] });
  const e1 = await J(`return { yaw: K.E.yaw, pitch: K.E.pitch, box: document.getElementById('eng').textContent };`);
  check('the engine port: the sphere turned the engine through port.turn, in radians', Math.abs(e1.yaw - e0.yaw) > 0.1 && Math.abs(e1.yaw - e0.yaw) < 2 && /yaw\s+/.test(e1.box) && e1.box.includes(e1.yaw.toFixed(3)), JSON.stringify({ e0, e1: { yaw: e1.yaw, pitch: e1.pitch } }));
  const dragK = D('cameraeng') + '.querySelector("[data-param=\\"eng.drag\\"] .k-dial")';
  await drag(dragK, 'DRAG knob', [[0, -11], [0, -22]]);
  const eg = await J(`return K.E.drag;`);
  check('HAND: DRAG is a knob on the engine (22 px up is a tenth of a log scale 0.2…8: ×1.45)', near(eg, Math.pow(40, 0.1), 0.06), String(eg));
  await J(`K.engine.set('zoom', 7); await wait(150); return 1;`);
  await click(D('cameraeng') + '.querySelector(".cam-verb")', 'RESET ZOOM');
  check('the app\'s own verb runs (RESET ZOOM)', near(await J(`return K.E.zoom;`), 3.3, 1e-9));
  await click(D('cameraeng') + '.querySelector(".cam-home")', 'HOME (engine)');
  check('HOME calls the port\'s own home()', near(await J(`return K.E.yaw;`), 0.65, 1e-9));
  const zoomArc = await J(`const k = ${D('cameraeng')}.querySelector('[data-param="eng.zoom"]'); return Number(k.getAttribute('aria-valuenow'));`);
  check('a change the app makes itself (the engine notifies) reaches the knob without a poll', near(zoomArc, 3.3, 0.01), String(zoomArc));

  /* ── THE PROJECT ── */
  const part = await J(`const m = await import('/mir/core/project.js'); const c = m.captureProject(); return { names: m.projectPartNames(), v: c.camera2d && c.camera2d.values, north: c.camera2d && c.camera2d.north };`);
  check('the values ride in the project as parts named for the panels (rotation, pan, zoom; the north memory)', part.names.includes('camera2d') && part.names.includes('camera3d') && part.v && part.v.rotation !== undefined && near(part.north ?? 0, r90, 0.3), JSON.stringify(part));

  /* ── IDLE: nothing is polled ── */
  await sleep(300);
  const f0 = await J(`const m = await import('/mir/core/perf.js'); return m.snapshot().frames || 0;`);
  await sleep(900);
  const f1 = await J(`const m = await import('/mir/core/perf.js'); return m.snapshot().frames || 0;`);
  check('at rest the panel costs no frames (nothing re-reads the engine on a timer)', f1 - f0 <= 1, JSON.stringify({ f0, f1 }));

  check('every press the test made was found and hit-tested by elementFromPoint', misses.length === 0, misses.join('; '));
  check('no console error during the whole run', p.logs.length === 0, JSON.stringify(p.logs));
} finally { await p.close(); }

for (const r of results) console.log(r);
const bad = results.filter((r) => r.startsWith('FAIL'));
console.log(`${results.length - bad.length}/${results.length} passed`);
process.exit(bad.length ? 1 : 0);
