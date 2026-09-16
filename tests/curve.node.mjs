/* curve.node.mjs — mir/modulation/curve.js: the breakpoint curve's five laws, the exactness table against the
 * model's analytic waves, the preset tap, the four editor doors, curveEdit's neighbour clamp and curveInfo.
 *
 *   node tests/curve.node.mjs
 *
 * Ported from λWAVES tests/mir.test.mjs §19 ("THE BREAKPOINT CURVE'S FIVE LAWS").  Nothing in it was λWAVES
 * content; the only other module it needs is mod.js (waveAt for the exactness table, curveEdit for the drag clamp).
 */
import assert from 'node:assert/strict';
import * as CV from '../mir/modulation/curve.js';
import * as M from '../mir/modulation/mod.js';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  if (!ok) console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 600)));
}

const P = CV.PRESETS;

/* law 1 — exact at every point; at a duplicate t the LATER point wins */
{
  const hand = [
    [{ t: 0, v: 0.13, tension: 0.7 }, { t: 0.4, v: 0.91, tension: -0.35 }, { t: 1, v: 0.22, tension: 0 }],
    [{ t: 0, v: 1, tension: -1 }, { t: 0.25, v: 0, tension: 1 }, { t: 0.75, v: 0.5, tension: 0.42 }, { t: 1, v: 1, tension: 0 }]
  ].map(CV.normalizePoints);
  let bad = 0, n = 0;
  for (const pts of [...P.map(CV.presetPoints), ...hand]) {
    for (let i = 0; i < pts.length; i++) {
      let want = pts[i].v;
      for (let k = i + 1; k < pts.length; k++) if (pts[k].t === pts[i].t) want = pts[k].v;
      n++; if (!Object.is(CV.evaluate(pts, pts[i].t), want)) bad++;
    }
  }
  check('§19 law 1: evaluate(pts, pts[i].t) is pts[i].v as the same double, on all seven presets and two hand-drawn curves (40 points), later point wins at a duplicate t',
    bad === 0 && n === 40 && P.length === 7, { points: n, wrong: bad, presets: P.length });
}

/* law 2 — tension 0 is bitwise linear */
{
  let bad = 0;
  for (let i = 0; i <= 1000; i++) { const x = i / 1000; if (!Object.is(CV.bend(x, 0), x)) bad++; }
  if (!Object.is(CV.bend(0.37, -0), 0.37) || !Object.is(CV.bend(0.37, NaN), 0.37)) bad += 1000;
  const tri = CV.presetPoints('tri');
  let lin = 0;
  for (let i = 0; i <= 500; i++) {
    const u = i / 500, want = u <= 0.5 ? 2 * u : 2 - 2 * u;
    if (Math.abs(CV.evaluate(tri, u) - want) > 0) lin++;
  }
  check('§19 law 2: bend(x, 0) is x itself (and -0, NaN take the same branch); TRI is exactly 2u / 2-2u',
    bad === 0 && lin === 0, { bendMismatches: bad, triMismatches: lin });
}

/* law 3 — monotone within a segment, no overshoot */
{
  let ends = 0, mono = 0, out = 0, n = 0;
  for (let i = 0; i <= 200; i++) {
    const tau = -1 + i / 100;
    if (!Object.is(CV.bend(0, tau), 0) || !Object.is(CV.bend(1, tau), 1)) ends++;
    let prev = -1;
    for (let j = 0; j <= 400; j++) { const y = CV.bend(j / 400, tau); n++; if (y < prev) mono++; if (y < 0 || y > 1) out++; prev = y; }
  }
  const pts = CV.normalizePoints([{ t: 0, v: 0.2, tension: 0.95 }, { t: 0.5, v: 0.9, tension: -0.95 }, { t: 1, v: 0.05, tension: 0 }]);
  let esc = 0;
  for (let j = 0; j <= 2000; j++) {
    const u = j / 2000, y = CV.evaluate(pts, u);
    const lo = u <= 0.5 ? 0.2 : 0.05, hi = 0.9;
    if (y < Math.min(lo, hi) - 1e-15 || y > Math.max(lo, hi) + 1e-15) esc++;
  }
  check('§19 law 3: over 201 tensions x 401 samples bend() is non-decreasing, inside [0,1], exact at 0 and 1; a hard-bent curve never leaves its segment',
    ends === 0 && mono === 0 && out === 0 && esc === 0 && n === 80601,
    { readings: n, ends, mono, out, esc });
}

/* law 4 — C0 by construction; SQUARE's jump is deliberate */
{
  const sq = CV.presetPoints('square');
  const before = CV.evaluate(sq, 0.5 - 1e-12), after = CV.evaluate(sq, 0.5);
  const tri = CV.presetPoints('tri');
  const c0 = Math.abs(CV.evaluate(tri, 0.5 - 1e-9) - CV.evaluate(tri, 0.5 + 1e-9));
  check('§19 law 4: TRI is continuous across its breakpoint; SQUARE reads 0 just before 0.5 and 1 at 0.5 (four points, two at 0.5)',
    before === 0 && after === 1 && c0 < 5e-9 && sq.length === 4 && sq[1].t === 0.5 && sq[2].t === 0.5,
    { before, after, c0 });
}

/* law 5 — the mirror is closed in the family */
{
  let anti = 0;
  for (let i = 0; i <= 200; i++) {
    const tau = -1 + i / 100;
    for (let j = 0; j <= 400; j++) { const x = j / 400; anti = Math.max(anti, Math.abs(CV.bend(x, -tau) - (1 - CV.bend(1 - x, tau)))); }
  }
  const ff = P.map((n) => CV.curveHash(CV.flip(CV.flip(CV.presetPoints(n)))) === CV.curveHash(CV.presetPoints(n)));
  const sym = P.filter(CV.presetIsSymmetric);
  const symQuiet = sym.every((n) => CV.curveHash(CV.flip(CV.presetPoints(n))) === CV.curveHash(CV.presetPoints(n)));
  const asymLoud = P.filter((n) => !CV.presetIsSymmetric(n)).every((n) => CV.curveHash(CV.flip(CV.presetPoints(n))) !== CV.curveHash(CV.presetPoints(n)));
  check('§19 law 5: bend(x,-t) = 1 - bend(1-x,t) to 2e-16; flip∘flip is bit-identical on every preset; TRI, SINE, MULTI-TRI flip to their own hash and the others do not',
    anti < 2e-16 && ff.every(Boolean) && sym.join() === 'tri,sine,mtri' && symQuiet && asymLoud,
    { anti, ff, sym });
}

/* the exactness table: four presets ARE the model's analytic waves, SINE is a stated approximation */
{
  const rows = [];
  for (const [pn, wn] of [['tri', 'tri'], ['sawup', 'rotate'], ['sawdown', 'sawdown'], ['square', 'square'], ['sine', 'sine']]) {
    const pts = CV.presetPoints(pn);
    let e = 0;
    for (let j = 0; j < 2000; j++) { const u = j / 2000; e = Math.max(e, Math.abs(CV.evaluate(pts, u) - M.waveAt(wn, u, {}))); }
    rows.push({ preset: pn, wave: wn, maxErr: e });
  }
  const by = Object.fromEntries(rows.map((r) => [r.preset, r.maxErr]));
  check("§19 SAW-up = rotate, SAW-down = sawdown, SQUARE = square bit-exact over [0,1); TRI to 1e-16; SINE's worst error is 0.008759",
    by.sawup === 0 && by.sawdown === 0 && by.square === 0 && by.tri < 1e-16 &&
    Math.abs(by.sine - 0.00875850942854084) < 1e-12, rows);
}

/* the preset tap: tap again to flip */
{
  const t1 = CV.applyPreset([], 'sawup'), t2 = CV.applyPreset(t1.points, 'sawup'), t3 = CV.applyPreset(t2.points, 'sawup');
  const a1 = CV.applyPreset([], 'tri'), a2 = CV.applyPreset(a1.points, 'tri');
  check("§19 tapping SAW-up twice gives presetPoints('sawdown') and three times is back; tapping TRI twice reports symmetric and keeps the hash",
    CV.pointsEqual(t1.points, CV.presetPoints('sawup')) && CV.pointsEqual(t2.points, CV.presetPoints('sawdown')) &&
    t2.flipped === true && CV.pointsEqual(t3.points, CV.presetPoints('sawup')) &&
    a2.symmetric === true && CV.curveHash(a2.points) === CV.curveHash(a1.points));
}

/* the four editor doors refuse in the engine */
{
  const full = CV.normalizePoints(Array.from({ length: CV.CURVE_MAX_POINTS }, (_, i) => ({ t: i / 31, v: 0.5 })));
  const atCeiling = CV.addPoint(full, 0.501, 0.9);
  const two = CV.removePoint(CV.presetPoints('sawup'), 0);
  const three = CV.removePoint(CV.presetPoints('tri'), 1);
  const triArg = CV.presetPoints('tri'), triHash = CV.curveHash(triArg);
  const moved = CV.movePoint(triArg, 0, 0.4, 0.8);
  const bentLast = CV.setTension(triArg, 2, 0.9);
  check('§19 addPoint at the 32-point ceiling refuses; removePoint keeps two points; movePoint keeps the first t; setTension on the last point is a no-op; arguments are not mutated',
    CV.CURVE_MAX_POINTS === 32 && atCeiling.full === true && atCeiling.points.length === 32 &&
    two.removed === false && two.points.length === 2 &&
    three.removed === true && three.points.length === 2 && moved[0].t === 0 && moved[0].v === 0.8 &&
    CV.curveHash(bentLast) === CV.curveHash(CV.presetPoints('tri')) && CV.curveHash(triArg) === triHash,
    { ceiling: atCeiling.full, two: two.removed, three: three.removed, firstT: moved[0].t });
}

/* curveEdit clamps a move between its neighbours; the bare movePoint does not */
{
  M.modReset();
  const s = M.addSource('lfo', { shapeMode: 'curve', points: CV.presetPoints('mtri') });
  M.curveEdit(s.id, 'move', { index: 3, t: 0.9, v: 0.5 });
  const ts = s.points.map((p) => p.t);
  const bare = CV.movePoint(CV.presetPoints('mtri'), 3, 0.9, 0.5);
  check("§19 curveEdit clamps point 3 of MULTI-TRI dragged to 0.9 at 0.5 and keeps the order; bare movePoint reorders it",
    ts[3] === 0.5 && ts.every((t, i, a) => i === 0 || t >= a[i - 1]) && bare[3].t === 0.5 && bare[7].t === 0.9,
    { throughCurveEdit: ts, bare: bare.map((p) => p.t) });
  M.modReset();
}

/* curveInfo names a shape by the button that draws it */
{
  const down = CV.curveInfo(CV.presetPoints('sawdown'));
  const mir = CV.curveInfo(CV.presetMirror('msaw'));
  check("§19 curveInfo sweeps exact matches before mirrors: SAW-down is 'sawdown' not mirrored; a mirrored MULTI-SAW says so",
    down.preset === 'sawdown' && down.mirrored === false && mir.preset === 'msaw' && mir.mirrored === true,
    { down, mir: { preset: mir.preset, mirrored: mir.mirrored } });
}

const failed = results.filter((r) => !r.ok);
assert.equal(failed.length, 0, failed.length + ' of ' + results.length + ' failed: ' + failed.map((r) => r.name).join(' | '));
console.log('PASS curve: ' + results.length + ' assertions');
