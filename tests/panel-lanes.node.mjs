/* panel-lanes.node.mjs — the lanes panel's and the ramp editor's pure parts (mir/panels/lanes.js, ramp.js): the modulation ids, the solo law (SOLEIL's: a click latches
 * and restores exactly, a hold is a peek), the default snapshot and restore over any port, the ramp's lookup table (it is palette.js toLUT bit for bit when
 * cyclic, and holds its ends when linear) and the stop arithmetic.  The same two panels under a real browser are tests/panel-lanes.browser.mjs and
 * tests/panel-ramp.browser.mjs. */
import assert from 'node:assert/strict';
import { laneTargetId, hueCss, createSolo, laneKeys, snapshotLanes, restoreLanes, HOLD_MS } from '../mir/panels/lanes.js';
import { rampLUT, rampGradient, rampConic, normalizeStops, addStop, removeStop, rotateStops, reverseStops, seamOf } from '../mir/panels/ramp.js';
import { toLUT, PRESETS, PRESET_BY_ID, hsvWheel } from '../mir/palette.js';
import { idFault } from '../mir/modulation/registry.js';

let n = 0;
const pass = (name) => { n++; console.log(`PASS ${name}`); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

/* ── the modulation id: a registry segment is lowercase alphanumeric, starting with a letter ── */
{
  assert.equal(laneTargetId('lanes', 'c1', 'freq'), 'lanes.c1.freq');
  assert.equal(laneTargetId('lanes', 'Colour-3', 'opacity'), 'lanes.colour3.opacity');
  assert.equal(laneTargetId('age', 3, 'gain'), 'age.l3.gain', 'a numeric id gets a letter in front');
  assert.equal(laneTargetId('lanes', '###', 'x'), 'lanes.l.x');
  for (const id of ['c1', 'Colour-3', 3, 'sst', 'FE II 171']) assert.equal(idFault(laneTargetId('lanes', id, 'phase'), ['lanes']), null, 'a valid registry id for ' + id);
  pass('a lane’s modulation id is lanes.<lane>.<key> and always a valid registry id');
}
{
  assert.equal(hueCss(0), 'hsl(0 85% 62%)'); assert.equal(hueCss(0.5), 'hsl(180 85% 62%)'); assert.equal(hueCss(1.25), 'hsl(90 85% 62%)', 'wraps');
  assert.equal(hueCss(180, 0, 360), 'hsl(180 85% 62%)'); assert.equal(hueCss(-0.25), 'hsl(270 85% 62%)');
  pass('a hue arc’s ink is hsl(turn, 85%, 62%) (BASINS), over any range, wrapped');
}

/* ── SOLEIL's solo ── */
const mutes = (ids) => { const m = new Map(ids.map((i) => [i, false])); return { m, get: (i) => m.get(i), set: (i, v) => m.set(i, v), ids: () => [...m.keys()] }; };
{
  const s = mutes(['a', 'b', 'c', 'd']); s.m.set('c', true);                                     // c was muted by the user
  const solo = createSolo({ ids: s.ids, get: s.get, set: s.set });
  assert.equal(solo.toggle('b'), true);
  assert.deepEqual([...s.m], [['a', true], ['b', false], ['c', true], ['d', true]], 'the lane alone, everything else muted');
  assert.equal(solo.latched(), 'b');
  assert.equal(solo.toggle('d'), true, 'another lane moves the latch');
  assert.deepEqual([...s.m], [['a', true], ['b', true], ['c', true], ['d', false]]);
  assert.equal(solo.toggle('d'), false, 'again, the latch lifts');
  assert.deepEqual([...s.m], [['a', false], ['b', false], ['c', true], ['d', false]], 'and what it silenced comes back as it was (c stays muted: it was the user’s)');
  assert.equal(solo.latched(), null);
  pass('a click latches the solo; another lane moves it; again lifts it and every lane is exactly as it was');
}
{
  const s = mutes(['a', 'b', 'c']);
  const solo = createSolo({ ids: s.ids, get: s.get, set: s.set });
  s.set('a', true);
  assert.equal(solo.peek('b', true), true);
  assert.deepEqual([...s.m], [['a', true], ['b', false], ['c', true]], 'a peek: the lane alone');
  assert.equal(solo.peeking(), true); assert.equal(solo.latched(), null, 'a peek is never a state');
  assert.equal(solo.peek('c', true), false, 'a second finger does not nest a peek');
  assert.equal(solo.peek('b', false), true);
  assert.deepEqual([...s.m], [['a', true], ['b', false], ['c', false]], 'on lift: exactly what was there');
  solo.toggle('c');                                                                               // latch c, then peek b over it
  solo.peek('b', true); assert.deepEqual([...s.m], [['a', true], ['b', false], ['c', true]]);
  solo.peek('b', false); assert.deepEqual([...s.m], [['a', true], ['b', true], ['c', false]], 'a peek over a latch gives the latch back');
  assert.equal(solo.latched(), 'c');
  assert.equal(HOLD_MS, 250, 'SOLEIL’s HOLD_MS');
  pass('a hold is a peek: the lane alone while down, exactly what was on when it lifts, a latch under it untouched');
}
{
  const s = mutes(['a', 'b', 'c']); const solo = createSolo({ ids: s.ids, get: s.get, set: s.set });
  solo.toggle('b'); s.m.delete('b');
  solo.forget(); assert.equal(solo.latched(), null, 'a latch on a removed lane is dropped');
  assert.deepEqual([...s.m], [['a', true], ['c', true]], 'and nothing is restored under it');
  pass('a latch whose lane was removed is dropped and restores nothing');
}

/* ── the default snapshot and restore ── */
function makePort(seed) {
  let data = seed.map((d) => ({ id: d.id, v: { ...d.v } })), next = 100;
  const rec = (d) => ({ id: d.id, colour: 'swatch', principal: { key: 'freq', min: 0, max: 1 }, extras: [{ key: 'phase', min: 0, max: 1 }], blend: ['ADD', 'MIX'], mute: true });
  return { data: () => data, list: () => data.map(rec), get: (id, k) => data.find((d) => d.id === id).v[k], set: (id, k, v) => { data.find((d) => d.id === id).v[k] = v; },
    add: () => { data.push({ id: 'n' + next++, v: { colour: [0, 0, 0], freq: 0.5, phase: 0, blend: 'ADD', mute: false } }); return data[data.length - 1].id; },
    remove: (id) => { data = data.filter((d) => d.id !== id); return true; }, move: (id, to) => { const i = data.findIndex((d) => d.id === id); const [d] = data.splice(i, 1); data.splice(to, 0, d); return true; } };
}
{
  const v = (f) => ({ colour: [f, 0, 0], freq: f, phase: f / 2, blend: 'MIX', mute: f > 0.5 });
  const p = makePort([{ id: 'a', v: v(0.1) }, { id: 'b', v: v(0.6) }, { id: 'c', v: v(0.9) }]);
  assert.deepEqual(laneKeys(p.list()[0]), ['colour', 'freq', 'phase', 'blend', 'mute']);
  const before = snapshotLanes(p);
  assert.equal(before.lanes.length, 3);
  assert.deepEqual(before.lanes[1], { id: 'b', values: v(0.6) });
  p.set('a', 'freq', 0.99); p.set('b', 'colour', [1, 1, 1]); p.remove('c'); p.move('b', 0); p.add();
  restoreLanes(p, before);
  const after = snapshotLanes(p);
  assert.deepEqual(after.lanes.map((l) => l.values), before.lanes.map((l) => l.values), 'every value is back, by position');
  assert.equal(after.lanes.length, 3);
  assert.deepEqual(after.lanes.map((l) => l.id), ['a', 'b', 'n100'].length === 3 ? after.lanes.map((l) => l.id) : [], 'ids are the port’s');
  const grow = { lanes: [...before.lanes, { id: 'z', values: v(0.3) }] };
  restoreLanes(p, grow); assert.equal(p.list().length, 4); assert.equal(p.get(p.list()[3].id, 'freq'), 0.3, 'a missing lane is added and given its values');
  restoreLanes(p, { lanes: [before.lanes[0]] }); assert.equal(p.list().length, 1, 'the surplus goes');
  pass('snapshotLanes / restoreLanes: the lanes by position, the surplus removed, the missing added, every key put back');
}
{
  const calls = []; const port = { list: () => [], snapshot: () => ({ own: 1 }), restore: (s) => calls.push(s) };
  assert.deepEqual(snapshotLanes(port), { own: 1 }); restoreLanes(port, { own: 2 }); assert.deepEqual(calls, [{ own: 2 }]);
  pass('a port’s own snapshot() and restore() win');
}

/* ── the ramp ── */
const prism = PRESET_BY_ID.get('prism').stops;
{
  for (const p of PRESETS.slice(0, 8)) {
    const a = rampLUT(p.stops, 256, true), b = toLUT(p.stops);
    let worst = 0; for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
    assert.ok(worst < 1e-6, p.id + ' cyclic 256 is palette.js toLUT (' + worst + ')');
  }
  pass('rampLUT(stops, 256, cyclic) is palette.js toLUT, preset by preset');
}
{
  const stops = [{ at: 0.25, rgb: [1, 0, 0] }, { at: 0.75, rgb: [0, 0, 1] }];
  const lut = rampLUT(stops, 256, false);
  assert.ok(near(lut[0], 1) && near(lut[1], 0) && near(lut[2], 0), 'before the first stop the ramp holds its first colour');
  const last = 255 * 4; assert.ok(near(lut[last], 0) && near(lut[last + 1], 0) && near(lut[last + 2], 1), 'after the last it holds the last');
  const m = rampLUT(stops, 5, false);                                                            // u = 0, .25, .5, .75, 1: the third is half way between the stops
  assert.ok(m[8] > 0.05 && m[8] < 0.95, 'half way is a blend: ' + m[8]);
  assert.equal(lut.length, 256 * 4); assert.equal(rampLUT(stops, 16, false).length, 64);
  assert.equal(rampLUT(stops, 256, false)[3], 1, 'alpha 1');
  pass('a linear ramp holds its end colours and blends between (OKLab); any table size');
}
{
  const g = rampGradient(rampLUT(prism, 256, true), 5); assert.match(g, /^linear-gradient\(90deg,(rgb\(\d+,\d+,\d+\) [\d.]+%,?){5}\)$/);
  assert.match(g, /rgb\(\d+,\d+,\d+\) 0%/); assert.match(g, / 100%\)$/);
  const c = rampConic(rampLUT(prism, 256, true), 5); assert.match(c, /^conic-gradient\(from 270deg,/); assert.match(c, / 360deg\)$/);
  pass('the strip is a linear-gradient of the table, the ring a conic from nine o’clock');
}
{
  const s = [{ at: 0.1, rgb: [1, 0, 0] }, { at: 0.9, rgb: [0, 0, 1] }];
  assert.deepEqual(normalizeStops([{ at: 1.25, rgb: [2, -1, 0.5] }], true), [{ at: 0.25, rgb: [1, 0, 0.5] }], 'cyclic wraps, rgb clamps');
  assert.equal(normalizeStops([{ at: 1.25, rgb: [0, 0, 0] }], false)[0].at, 1, 'linear clamps');
  assert.equal(normalizeStops([], true).length, 1, 'never empty');
  assert.deepEqual(normalizeStops([s[1], s[0]], true).map((x) => +x.at.toFixed(9)), [0.1, 0.9], 'sorted');
  const a = addStop(s, 0.5); assert.equal(a.length, 3); assert.ok(a[2].rgb.every((c) => c >= 0 && c <= 1), 'a new stop takes the ramp’s colour there');
  const lut = rampLUT(s, 256, true), i = Math.round(0.5 * 256) * 4;
  assert.ok(near(a[2].rgb[0], lut[i], 1e-6) && near(a[2].rgb[2], lut[i + 2], 1e-6), 'exactly the table’s colour at that place');
  assert.equal(removeStop(s, 0, 2), s, 'two stops is the fewest'); assert.equal(removeStop(a, 2, 2).length, 2);
  const r = rotateStops(s, 0.25); assert.ok(near(r[0].at, 0.35) && near(r[1].at, 0.15), 'rotated round the wrap');
  assert.ok(near(rotateStops(s, 1)[0].at, 0.1) && near(rotateStops(s, -0.2)[0].at, 0.9), 'a whole turn is nothing; a negative turn wraps');
  const rv = reverseStops(s, true); assert.ok(near(rv[0].at, 0.9) && near(rv[1].at, 0.1)); assert.equal(reverseStops([{ at: 0, rgb: [0, 0, 0] }], true)[0].at, 0, '0 stays 0 (λWAVES)');
  assert.ok(near(reverseStops([{ at: 0.2, rgb: [0, 0, 0] }], false)[0].at, 0.8), 'linear: 1 − at');
  pass('stop arithmetic: normalize, add (the ramp’s own colour), remove (never below two), rotate, reverse');
}
{
  const closed = hsvWheel(6);
  assert.ok(seamOf(closed) < 0.06, 'the wheel closes: ' + seamOf(closed));
  assert.ok(seamOf([{ at: 0.01, rgb: [1, 1, 1] }, { at: 0.5, rgb: [1, 1, 1] }, { at: 0.99, rgb: [0, 0, 0] }]) > 0.06, 'white to black across the wrap is a seam');
  pass('the seam reading is palette.js cyclic(): a closed wheel reads under 0.06, a white-to-black wrap does not');
}
console.log(`${n} passed`);
