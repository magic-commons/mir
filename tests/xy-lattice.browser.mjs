/* xy-lattice.browser.mjs — THE XY PAD'S LATTICE (wave 20) under a real browser at 2× (gallery/controls.html), real mouse input through CDP.
 *   · the canvas is the pad's first child (under the tags, the ring and the dot), transparent to the pointer, crisp at the device ratio;
 *   · THE IDLE LAW: at rest the lattice paints nothing and books no frame; a value change repaints once;
 *   · the dot nearest the point is the largest and the farthest is the base; the knobs move the dot and the lattice follows;
 *   · a hover swells the lattice under the cursor and leaving restores it; under data-motion="off" a hover changes nothing;
 *   · the glow that tinted the dot is gone (the lattice carries that meaning); a disabled pad dims its lattice; a theme flip repaints;
 *   · THE COST: a 60-move drag and a 60-move hover on a 240 px pad at 2×, the paint's own time (performance.now around it).
 * Screenshots: .tmp/W20/XY/lattice-rest.png, -drag.png, -hover.png, -light.png.
 * Standalone: MIR_BASE=http://127.0.0.1:8841 node tests/xy-lattice.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8841';
const URL_ = BASE.replace(/\/$/, '') + '/gallery/controls.html';
const SHOTS = new URL('../.tmp/W20/XY/', import.meta.url).pathname;
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 1000, scale: 2 });
const J = async (expr) => JSON.parse(await p.eval(`(async () => { const C = window.__C, W = C.W; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); return JSON.stringify(await (async () => { ${expr} })()); })()`));
let held = false;
const mouse = (type, x, y) => { if (type === 'mousePressed') held = true; if (type === 'mouseReleased') held = false;
  return p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 }); };
const L = (reset) => J(`return W.xy.lattice(${reset ? 'true' : ''});`);
/** the index of the dot nearest (nx, ny) in [0, 1] (y up) */
const idx = (o, ux, uy) => Math.min(o.ny - 1, Math.max(0, Math.floor((1 - uy) * o.ny))) * o.nx + Math.min(o.nx - 1, Math.max(0, Math.floor(ux * o.nx)));
const argmax = (a) => a.reduce((m, v, i) => (v > a[m] ? i : m), 0);
/** is dot i one of the dots around (ux, uy): its centre within a dot's diagonal (a point on a cell edge has two or four equal nearest) */
const around = (o, i, ux, uy) => Math.hypot(((i % o.nx) + 0.5) / o.nx - ux, (1 - (Math.floor(i / o.nx) + 0.5) / o.ny) - uy) <= Math.SQRT1_2 / o.nx + 1e-9;

try {
  await p.goto(URL_, 1200);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  /* the pad at its full 240 px, in view */
  await J(`const r = W.xy.root; r.style.width = '360px'; W.xy.pad.style.width = '240px'; r.scrollIntoView({ block: 'center' }); await wait(300); return 1;`);

  /* ── the canvas ── */
  const cv = await J(`const pad = W.xy.pad, c = pad.querySelector('canvas.xy-lattice'), dot = pad.querySelector('.xy-dot'), cs = c && getComputedStyle(c);
    const b = pad.getBoundingClientRect(), h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return c && { first: pad.firstElementChild === c, under: !!(c.compareDocumentPosition(dot) & Node.DOCUMENT_POSITION_FOLLOWING), pe: cs.pointerEvents, w: c.width, h: c.height, cw: pad.clientWidth, ch: pad.clientHeight, dpr: devicePixelRatio, hit: h === pad || (!!h && h.classList.contains('xy-tag')) };`);
  check('the lattice is a canvas, the pad\'s first child, under the dot', !!cv && cv.first && cv.under, JSON.stringify(cv));
  check('the canvas takes no pointer: elementFromPoint at the pad\'s centre is the pad', !!cv && cv.pe === 'none' && cv.hit, JSON.stringify(cv));
  check('the backing store is the pad\'s size at the device ratio (2×: crisp)', !!cv && cv.dpr === 2 && cv.w === cv.cw * 2 && cv.h === cv.ch * 2, JSON.stringify(cv));
  check('the pad is 240 px for the cost', !!cv && cv.cw >= 236 && cv.cw <= 240, String(cv && cv.cw));

  /* ── the glow is gone ── */
  const glow = await J(`const pad = W.xy.pad, dot = pad.querySelector('.xy-dot'); pad.classList.add('drag'); const a = getComputedStyle(dot).boxShadow; pad.classList.remove('drag');
    pad.classList.add('mod'); const b = getComputedStyle(dot).boxShadow; pad.classList.remove('mod'); W.xy.paint(); return { drag: a, mod: b };`);
  check('the dot wears no glow while dragged or routed (the tint is replaced by the lattice)', glow.drag === 'none' && glow.mod === 'none', JSON.stringify(glow));

  /* ── the idle law ── */
  await mouse('mouseMoved', 5, 5); await sleep(400);
  const idle = await J(`const { frame } = await import('/mir/core/frame.js'); const raf0 = window.requestAnimationFrame; let n = 0;
    window.requestAnimationFrame = (f) => { n++; return raf0.call(window, f); };
    const p0 = W.xy.lattice().paints; await wait(1000); window.requestAnimationFrame = raf0;
    return { raf: n, paints: W.xy.lattice().paints - p0, scheduled: frame.state().scheduled };`);
  check('at rest: no lattice paint and no frame booked over 1 s (0 rAF/s)', idle.paints === 0 && idle.raf === 0 && !idle.scheduled, JSON.stringify(idle));
  await J(`W.xy.set(0.5, 0.5); await wait(150); return 1;`);
  const once = await J(`const p0 = W.xy.lattice().paints; W.xy.set(-0.5, 0.25); await wait(200); const p1 = W.xy.lattice().paints; W.xy.set(-0.5, 0.25); await wait(200); return { change: p1 - p0, same: W.xy.lattice().paints - p1 };`);
  check('a value change repaints once; setting the same value repaints nothing', once.change === 1 && once.same === 0, JSON.stringify(once));

  /* ── the swell follows the point ── */
  let o = await L();
  { const ux = 0.25, uy = 0.625, near = idx(o, ux, uy), r = o.radii, far = idx(o, 1, 0);
    check('the dot nearest the point is larger than the farthest, which is the base', r[near] > r[far] + 2 && Math.abs(r[far] - 0.9) < 1e-3, JSON.stringify({ n: o.n, near: r[near], far: r[far] }));
    check('the largest dot is one at the point', around(o, argmax(r), ux, uy), JSON.stringify({ max: argmax(r), near })); }
  check('auto: 24 dots across a 240 px pad (10 px pitch)', o.n === 24 && o.nx === 24 && o.ny === 24, JSON.stringify({ n: o.n, nx: o.nx, ny: o.ny }));
  await J(`W.xy.x.set(0.75); W.xy.y.set(-0.75); await wait(200); return 1;`);
  o = await L();
  check('the X and Y knobs move the dot and the lattice follows (its peak is at the new point)', around(o, argmax(o.radii), 0.875, 0.125), JSON.stringify({ max: argmax(o.radii), want: idx(o, 0.875, 0.125) }));

  /* ── hover ── */
  await J(`W.xy.set(-0.8, -0.8); await wait(200); return 1;`);
  const box = await J(`const b = W.xy.pad.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height };`);
  const rest = await L();
  const hx = box.x + box.w * 0.8, hy = box.y + box.h * 0.2;                // the upper right, far from the point
  await mouse('mouseMoved', box.x - 30, hy); await sleep(60); await mouse('mouseMoved', hx, hy); await sleep(250);
  let hov = await L(); const hi = idx(hov, 0.8, 0.8);
  check('a hover swells the lattice under the cursor (eased in by the micro token)', hov.radii[hi] > rest.radii[hi] + 1 && hov.hover === 1, JSON.stringify({ rest: rest.radii[hi], hover: hov.radii[hi], h: hov.hover }));
  check('the cursor\'s swell is gentler than the point\'s', Math.max(...hov.radii) === hov.radii[argmax(rest.radii)] && hov.radii[hi] < rest.radii[argmax(rest.radii)], JSON.stringify({ cursor: hov.radii[hi], point: rest.radii[argmax(rest.radii)] }));
  await J(`W.xy.lattice(true); return 1;`);
  await p.shot(SHOTS + 'lattice-hover.png', { x: box.x - 8, y: box.y - 8, width: box.w + 16, height: box.h + 16 });
  await mouse('mouseMoved', box.x - 40, hy); await sleep(250);
  let left = await L();
  check('leaving the pad restores the lattice exactly', left.hover === 0 && left.radii.every((v, i) => Math.abs(v - rest.radii[i]) < 1e-6));
  const idleAfter = await J(`const p0 = W.xy.lattice().paints; await wait(500); return W.xy.lattice().paints - p0;`);
  check('the ease ends: nothing paints after the swell has gone', idleAfter === 0, String(idleAfter));

  /* ── data-motion="off": a static lattice (the point's swell stays; no cursor swell) ── */
  await J(`const { setMotionPolicy } = await import('/mir/core/motion.js'); setMotionPolicy('off'); return document.documentElement.dataset.motion;`);
  const p0 = (await L()).paints;
  await mouse('mouseMoved', hx, hy); await sleep(250);
  const off = await L();
  check('data-motion="off": a hover changes nothing (no paint, the same radii); the point\'s swell stays', off.paints === p0 && off.radii.every((v, i) => v === rest.radii[i]) && Math.max(...off.radii) > 3, JSON.stringify({ paints: off.paints - p0 }));
  await mouse('mouseMoved', box.x - 40, hy); await sleep(100);
  await J(`const { setMotionPolicy } = await import('/mir/core/motion.js'); setMotionPolicy('auto'); return 1;`);

  /* ── disabled dims it; a theme flip repaints it ── */
  const dis = await J(`W.xy.setDisabled(true); const o = +getComputedStyle(W.xy.root).opacity; W.xy.setDisabled(false); return o;`);
  check('a disabled pad dims its lattice with it (one fade on the root)', dis < 1, String(dis));
  const th = await J(`const p0 = W.xy.lattice().paints; document.body.dataset.theme = 'light'; await wait(200); return W.xy.lattice().paints - p0;`);
  await p.shot(SHOTS + 'lattice-light.png', { x: box.x - 8, y: box.y - 8, width: box.w + 16, height: box.h + 16 });
  await J(`document.body.dataset.theme = 'dark'; await wait(200); return 1;`);
  check('a theme flip repaints the lattice once', th === 1, String(th));

  /* ── the hand is unchanged: a press brings the dot to the pointer ── */
  await J(`W.xy.set(0, 0); await wait(100); return 1;`);
  await mouse('mouseMoved', box.x + box.w * 0.75, box.y + box.h * 0.25); await mouse('mousePressed', box.x + box.w * 0.75, box.y + box.h * 0.25);
  await mouse('mouseMoved', box.x + box.w * 0.75 + 1, box.y + box.h * 0.25 + 1); await mouse('mouseReleased', box.x + box.w * 0.75 + 1, box.y + box.h * 0.25 + 1); await sleep(150);
  const got = await J(`return W.xy.get();`);
  check('the hand law is unchanged: a press at the upper right brings the dot there', Math.abs(got[0] - 0.5) < 0.06 && Math.abs(got[1] - 0.5) < 0.06, JSON.stringify(got));
  await mouse('mouseMoved', box.x - 40, box.y - 40); await sleep(200);
  await J(`W.xy.set(0.2, -0.3); await wait(200); return 1;`);
  await p.shot(SHOTS + 'lattice-rest.png', { x: box.x - 8, y: box.y - 8, width: box.w + 16, height: box.h + 16 });

  /* ── THE COST: 60 drag moves and 60 hover moves on the 240 px pad at 2× ── */
  await J(`W.xy.set(-0.9, -0.9); await wait(150); W.xy.lattice(true); return 1;`);
  { const x0 = box.x + box.w * 0.05, y0 = box.y + box.h * 0.95;
    await mouse('mouseMoved', x0, y0); await mouse('mousePressed', x0, y0);
    for (let i = 1; i <= 60; i++) { await mouse('mouseMoved', x0 + i * box.w * 0.015, y0 - i * box.h * 0.012); await sleep(17); if (i === 40) await p.shot(SHOTS + 'lattice-drag.png', { x: box.x - 8, y: box.y - 8, width: box.w + 16, height: box.h + 16 }); }
    await mouse('mouseReleased', x0 + 60 * box.w * 0.015, y0 - 60 * box.h * 0.012); await sleep(150); }
  const dragCost = await L(true);
  await mouse('mouseMoved', box.x - 30, box.y + box.h / 2); await sleep(200); await L(true);
  for (let i = 0; i <= 60; i++) { await mouse('mouseMoved', box.x + 4 + i * (box.w - 8) / 60, box.y + box.h * (0.5 + 0.35 * Math.sin(i / 6))); await sleep(17); }
  await sleep(150);
  const hoverCost = await L(true);
  await mouse('mouseMoved', box.x - 30, box.y - 30); await sleep(200);
  const fmt = (c) => ({ paints: c.paints, mean: +(c.sum / Math.max(1, c.paints)).toFixed(3), max: +c.max.toFixed(3) });
  const dc = fmt(dragCost), hc = fmt(hoverCost);
  console.log('COST drag ' + JSON.stringify(dc) + '  hover ' + JSON.stringify(hc) + '  (ms per paint, 240 px pad at 2×, ' + dragCost.nx + '×' + dragCost.ny + ' dots)');
  check('a 60-move drag repaints the lattice per move, well under 2 ms each', dc.paints >= 40 && dc.mean < 1 && dc.max < 2, JSON.stringify(dc));
  check('a 60-move hover repaints per move, well under 2 ms each', hc.paints >= 40 && hc.mean < 1 && hc.max < 2, JSON.stringify(hc));

  check('no console error', p.logs.length === 0, JSON.stringify(p.logs));
} catch (e) {
  check('the run', false, String(e && e.stack || e));
} finally {
  await p.close();
}
for (const r of results) console.log(r);
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
