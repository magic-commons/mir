/* panel-xy.node.mjs — the XY panel's pure parts: mir/panels/morph.js (AUTOMATA's P1 SNAPSHOTS and MORPH, harvested) and the panel's own
 * resolveRef / morphSets / readXY.  The morph laws are AUTOMATA's tests/p1-morph.test.mjs, ported: AUTOMATA ran them over its laws' dial
 * sets; the kit has no laws, so they run over three seeded dial sets of the kinds an app hands it (linear, log and stepped dials together).
 * The panel under a real browser is tests/panel-xy.browser.mjs. */
import assert from 'node:assert/strict';
import { createMorph, dialsOf, blend, fillCorners, snapshot, recallValues, loadBank, saveBank, kindOf, LINEAR, LOG, STEP, BANK_MAX } from '../mir/panels/morph.js';
import { resolveRef, morphSets, readXY, MODES } from '../mir/panels/xy.js';

let passed = 0;
const pass = (name) => { passed++; console.log(`PASS ${name}`); };
let seed = 0x1F2E3D4C; const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
/* three windows' dials: the kinds every app has (a log FREQ, a stepped COUNT, a mask, linear amounts) */
const SETS = [
  { id: 'grade', params: [{ id: 'grade.exposure', min: -4, max: 4, map: 'linear' }, { id: 'grade.gamma', min: 0.2, max: 5, map: 'log' }, { id: 'grade.sat', min: 0, max: 2 }] },
  { id: 'lanes', params: [{ id: 'lanes.freq', min: 0.02, max: 50, map: 'log' }, { id: 'lanes.count', min: 1, max: 12, step: 1 }, { id: 'lanes.mask', min: 0, max: 255, fmt: 'mask' }, { id: 'lanes.phase', min: 0, max: 1 }] },
  { id: 'law', params: [{ id: 'law.f', min: 0, max: 0.12 }, { id: 'law.k', min: 0.03, max: 0.075 }, { id: 'law.du', min: 0.02, max: 0.4, map: 'log' }, { id: 'law.r', min: 1, max: 30, map: 'integer' }, { id: 'law.dt', min: 0, max: 1, hidden: true }] },
];
const valueOf = (d, u) => (d.kind === STEP ? Math.round(d.min + u * (d.max - d.min)) : d.kind === LOG ? d.min * Math.pow(d.max / d.min, u) : d.min + u * (d.max - d.min));
const snap = (dials) => ({ values: Object.fromEntries(dials.map((d) => [d.name, valueOf(d, rnd())])) });
const f32 = new Float32Array(1), i32 = new Int32Array(f32.buffer), bits32 = (x) => { f32[0] = x; return i32[0]; };
const ulp32 = (a, b) => Math.abs(bits32(a) - bits32(b));
const at = (m, x, y) => { const xy = new Float64Array([0, 0, x, y]); m.touch(); m.step(xy); return m.out; };

/* the kinds, and dialsOf over a law or a list */
{
  assert.equal(kindOf({ map: 'log' }), LOG); assert.equal(kindOf({ step: 1 }), STEP); assert.equal(kindOf({ fmt: 'mask' }), STEP); assert.equal(kindOf({ map: 'integer' }), STEP); assert.equal(kindOf({}), LINEAR);
  const D = dialsOf(SETS[2]), L = dialsOf(SETS[2].params);
  assert.deepEqual(D, L, 'a law ({ params }) and a list give the same dials');
  assert.deepEqual(D.map((d) => d.name), ['f', 'k', 'du', 'r'], 'AUTOMATA\'s names: the last segment; hidden dials are not held');
  assert.deepEqual(dialsOf([{ id: 'a.b', name: 'a.b', min: 0, max: 1 }]).map((d) => d.name), ['a.b'], 'a record\'s own name wins (the panel names by the whole id)');
  pass('the kinds (log · step · mask · integer · linear) and dialsOf over a law or a parameter list');
}

/* AUTOMATA P1 LAW: a corner is its snapshot */
{
  let checked = 0;
  for (const set of SETS) {
    const D = dialsOf(set), m = createMorph(D);
    for (let k = 0; k < 200; k++) {
      const S = [snap(D), snap(D), snap(D), snap(D)]; m.setCorners(S);
      for (const [c, x, y] of [[0, 0, 0], [1, 1, 0], [2, 0, 1], [3, 1, 1]]) { const out = at(m, x, y); D.forEach((d, i) => { assert.ok(Object.is(out[i], S[c].values[d.name]), `${set.id} ${d.name} at ${'ABCD'[c]}`); checked++; }); }
    }
  }
  assert.ok(checked > 5000);
  pass(`a corner is its snapshot, bit for bit (${checked} dial values at the corners)`);
}

/* AUTOMATA P1 LAW: each dial in its own map */
{
  let worst = 0, n = 0;
  const EDGES = [[0, 1, (t) => [t, 0]], [2, 3, (t) => [t, 1]], [0, 2, (t) => [0, t]], [1, 3, (t) => [1, t]]];
  for (const set of SETS) {
    const D = dialsOf(set), m = createMorph(D);
    for (let k = 0; k < 50; k++) {
      const S = [snap(D), snap(D), snap(D), snap(D)]; if (k % 10 === 0) S[1] = { values: { ...S[0].values } };
      m.setCorners(S);
      for (const [p, q, xy] of EDGES) {
        const [cx, cy] = xy(0.5), mid = at(m, cx, cy).slice();
        D.forEach((d, i) => {
          if (d.kind === STEP) return;
          const a = S[p].values[d.name], b = S[q].values[d.name], ref = d.kind === LOG ? Math.sqrt(a * b) : (a + b) / 2;
          const u = ulp32(Math.fround(mid[i]), Math.fround(ref)); worst = Math.max(worst, u); n++;
          assert.ok(u <= 1, `${set.id} ${d.name}: ${mid[i]} vs ${ref}`);
        });
        const prev = new Float64Array(D.length).fill(NaN);
        for (let s = 0; s <= 200; s++) {
          const [x, y] = xy(s / 200), out = at(m, x, y);
          D.forEach((d, i) => {
            const a = S[p].values[d.name], b = S[q].values[d.name], v = out[i];
            assert.ok(v >= Math.min(a, b) && v <= Math.max(a, b), `${set.id} ${d.name} outside its edge`);
            if (s) assert.ok(a === b ? v === prev[i] : a < b ? v >= prev[i] : v <= prev[i], `${set.id} ${d.name} not monotone`);
            prev[i] = v;
          });
        }
      }
    }
  }
  pass(`each dial in its own map: a log dial's edge centre is √(ab), a linear one's (a + b)/2 (worst ${worst} ulp in f32 over ${n}), every edge between its corners and monotone`);
}

/* AUTOMATA P1 LAW: a stepped dial never takes a value between */
{
  let stepped = 0;
  for (const set of SETS) {
    const D = dialsOf(set), steps = D.map((d, i) => [d, i]).filter(([d]) => d.kind === STEP); if (!steps.length) continue;
    const m = createMorph(D), S = [snap(D), snap(D), snap(D), snap(D)]; m.setCorners(S);
    const pts = []; for (let k = 0; k < 3000; k++) pts.push([rnd(), rnd()]);
    for (const u of [0, 0.25, 0.5, 0.75, 1]) pts.push([0.5, u], [u, 0.5]);
    for (const [x, y] of pts) {
      const out = at(m, x, y), w = [(1 - x) * (1 - y), x * (1 - y), (1 - x) * y, x * y]; let best = 0; for (let c = 1; c < 4; c++) if (w[c] > w[best]) best = c;
      for (const [d, i] of steps) { const vals = S.map((s) => s.values[d.name]); assert.equal(out[i], vals[best], `${set.id} ${d.name} at (${x}, ${y})`); stepped++; }
    }
  }
  assert.ok(stepped > 5000);
  pass(`a stepped dial is always the corner of largest weight, a tie toward A, then B, then C (${stepped} values)`);
}

/* AUTOMATA P1 LAW: fewer corners, fewer dials; a still pad does nothing; the bank */
{
  assert.deepEqual(fillCorners([true, true, false, false]), [0, 1, 0, 1]);
  assert.deepEqual(fillCorners([true, false, false, true]), [0, 0, 0, 3]);
  assert.deepEqual(fillCorners([false, false, false, true]), [3, 3, 3, 3]);
  assert.deepEqual(fillCorners([false, false, false, false]), [-1, -1, -1, -1]);
  const D = dialsOf(SETS[1]), m = createMorph(D), A = snap(D), B = snap(D);
  m.setCorners([A, B, null, null]);
  for (let k = 0; k < 300; k++) { const x = rnd(), y = rnd(), a = at(m, x, y).slice(), b = at(m, x, 0); D.forEach((d, i) => assert.ok(Object.is(a[i], b[i]), 'A·B is a fader on x')); }
  const old = { values: { ...A.values } }; delete old.values.phase;
  m.setCorners([old, null, null, null]); assert.deepEqual([...m.mask], D.map((d) => (d.name === 'phase' ? 0 : 1)), 'a dial no corner holds is left alone');
  const xy = new Float64Array([0.3, 0.6, 0.3, 0.6]); m.setCorners([A, B, null, null]);
  let moves = 0; for (let k = 0; k < 500; k++) moves += m.step(xy) ? 1 : 0; assert.equal(moves, 1, 'a still pad reports one move, then none');
  m.touch(); moves = 0; for (let k = 0; k < 50; k++) moves += m.step(xy) ? 1 : 0; assert.equal(moves, 1, 'ENGAGE (touch) is one move');
  xy[3] = 0.1; m.sync(xy); assert.equal(m.step(xy), false, 'sync takes the position as it stands');
  const base = Object.fromEntries(D.map((d) => [d.name, 1])), s = snapshot(D, base, 'A NAME LONGER THAN SIXTEEN', null);
  assert.equal(s.name.length, 16);
  const b = { slots: [s, null, { ...s, name: 'TWO' }, null, null, null, null, null], corners: [0, 2, null, 0], engaged: true, x: 0.25, y: 0.75 };
  assert.deepEqual(loadBank(JSON.parse(JSON.stringify(saveBank(b)))), b);
  const g = loadBank({ slots: [{ name: 'X', values: { a: 1, b: NaN } }, 7], corners: [0, 1, 9, -1], x: 4, y: NaN, engaged: 'yes' });
  assert.equal(g.slots.length, BANK_MAX); assert.deepEqual(g.corners, [0, null, null, null]); assert.equal(g.x, 1); assert.equal(g.y, 0.5); assert.equal(g.engaged, false);
  assert.deepEqual(recallValues(dialsOf([{ id: 'p.a', min: 0, max: 1 }]), { values: { a: 9 } }), [['a', 1]], 'a recall lands inside the range');
  assert.equal(blend(LINEAR, 1, 2, 3, 4, 0.5, 0.5), 2.5); assert.equal(blend(STEP, 1, 2, 3, 4, 0.5, 0.5), 1); assert.ok(Math.abs(blend(LOG, 1, 4, 1, 4, 0.5, 0) - 2) < 1e-15);
  pass('fewer corners make a fader or a constant; a still pad does nothing; the bank round-trips and sanitises');
}

/* the panel's own pure parts */
{
  assert.deepEqual(MODES, ['pair', 'route', 'morph']);
  const list = [{ id: 'cam.panx', min: -1, max: 1, get: () => 0, set: () => {} }, { id: 'xy.x', min: 0, max: 1, get: () => 0, set: () => {} }, { id: 'cam.flip', get: () => false, set: () => {} },
    { id: 'grade.gain', group: 'grade', min: 0, max: 2, get: () => 1, set: () => {} }];
  assert.equal(resolveRef('cam.panx', list), list[0]); assert.equal(resolveRef('nope', list), null);
  const own = { id: 'own', get: () => 1, set: () => {} }; assert.equal(resolveRef(own, list), own); assert.equal(resolveRef({ id: 'x' }, list), null, 'a record needs get and set');
  const sets = morphSets(list, 'xy');
  assert.deepEqual(sets.map((s) => [s.id, s.label, s.params.map((p) => p.id)]), [['cam', 'CAM', ['cam.panx']], ['grade', 'GRADE', ['grade.gain']]], 'grouped by root; the panel\'s own and a switch left out');
  const r = readXY({ mode: 'route', pair: 2, spring: true, set: 'cam', route: [2, NaN], banks: { cam: { corners: [0], x: 0.2 } } });
  assert.equal(r.mode, 'route'); assert.equal(r.pair, 2); assert.equal(r.spring, true); assert.deepEqual(r.route, [1, 0.5]); assert.equal(r.banks.cam.x, 0.2); assert.deepEqual(r.banks.cam.corners, [null, null, null, null]);
  assert.deepEqual(readXY(null), { v: 1, mode: null, pair: 0, spring: false, set: null, route: [0.5, 0.5], banks: {} });
  pass('resolveRef (an id or a record), morphSets (grouped by root, own ids out), readXY (sanitised)');
}
console.log(`ALL ${passed} PASS`);
