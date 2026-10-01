/* core-proximity.node.mjs — the drop-here geometry: distance to rects, lines and points, the strength curve,
 * the capture threshold, and the nearest of many. */
import assert from 'node:assert/strict';
import { distance, strength, measure } from '../mir/core/proximity.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };
const R = (left, top, width, height) => ({ left, top, width, height });

{
  const r = R(100, 100, 200, 100);
  assert.equal(distance({ x: 150, y: 150 }, r), 0, 'inside is 0');
  assert.equal(distance({ x: 100, y: 150 }, r), 0, 'on the edge is 0');
  assert.equal(distance({ x: 60, y: 150 }, r), 40, 'left of it: horizontal gap');
  assert.equal(distance({ x: 200, y: 260 }, r), 60, 'below it: vertical gap');
  assert.equal(distance({ x: 330, y: 240 }, r), 50, 'off a corner: the corner distance (30, 40 → 50)');
  assert.equal(distance(r, { x: 330, y: 240 }), 50, 'symmetric');
  pass('point to rect: 0 inside, the gap to the nearest edge outside, the corner distance off a corner');
}

{
  const line = R(64, 8, 900, 0);                                    // the top dock line
  assert.equal(distance({ x: 400, y: 40 }, line), 32);
  assert.equal(distance({ x: 400, y: 8 }, line), 0);
  assert.equal(distance({ x: 20, y: 8 }, line), 44, 'beyond its end');
  assert.equal(distance({ x: 3, y: 4 }, { x: 0, y: 0 }), 5, 'point to point');
  assert.equal(distance(R(0, 0, 10, 10), R(40, 0, 10, 10)), 30, 'rect to rect: the gap');
  assert.equal(distance(R(0, 0, 50, 50), R(40, 40, 10, 10)), 0, 'overlapping rects: 0');
  assert.equal(distance(R(0, 0, 10, 10), { x: 13, y: 14 }), 5, 'rect to point');
  pass('lines, points and rect probes measure the same way', 'a dock edge is a rect of zero height');
}

{
  assert.equal(strength(200, 96, 32), 0); assert.equal(strength(96, 96, 32), 0);
  assert.equal(strength(32, 96, 32), 1); assert.equal(strength(0, 96, 32), 1);
  assert.equal(strength(64, 96, 32), 0.5, 'halfway is one half (smoothstep is symmetric)');
  let prev = -1;
  for (let d = 100; d >= 30; d -= 1) { const s = strength(d, 96, 32); assert.ok(s >= prev, `monotone at ${d}`); prev = s; }
  const nearEdge = strength(90, 96, 32), nearCap = strength(38, 96, 32);
  assert.ok(nearEdge < 0.03 && nearCap > 0.97, `soft at both ends (${nearEdge.toFixed(3)}, ${nearCap.toFixed(3)})`);
  pass('strength: 0 at reach, 1 at capture, smoothstep between, monotone as the probe approaches');
}

{
  const targets = [{ id: 'top', rect: R(0, 8, 500, 300), hit: R(0, 8, 500, 0) }, { id: 'bottom', rect: R(0, 500, 500, 300), hit: R(0, 800, 500, 0) }];
  let m = measure({ x: 250, y: 300 }, targets);
  assert.equal(m.best, null); assert.equal(m.captured, null); assert.deepEqual(m.list.map((e) => e.state), ['far', 'far']);
  m = measure({ x: 250, y: 60 }, targets);
  assert.equal(m.best.id, 'top'); assert.equal(m.captured, null); assert.equal(m.list[0].state, 'near'); assert.equal(m.distance, 52);
  m = measure({ x: 250, y: 30 }, targets);
  assert.equal(m.captured.id, 'top'); assert.equal(m.list[0].state, 'capture'); assert.equal(m.strength, 1);
  m = measure({ x: 250, y: 33 }, targets, { reach: 96, capture: 24 });
  assert.equal(m.captured, null, 'the capture distance is the caller\'s');
  pass('measure: far, then near with a rising strength, then captured inside the capture distance');
}

{
  const ring = (id, x, y) => ({ id, rect: R(x - 20, y - 20, 40, 40), hit: { x, y }, shape: 'ring' });
  const knobs = [ring('a', 100, 100), ring('b', 150, 100), ring('c', 400, 100)];
  const m = measure({ x: 128, y: 100 }, knobs);
  assert.equal(m.best.id, 'b'); assert.equal(m.captured.id, 'b');
  assert.deepEqual(m.list.map((e) => e.state), ['near', 'capture', 'far'], 'two within capture: only the nearest is captured');
  assert.ok(m.list[0].strength === 1 && m.list[1].strength === 1, 'both are at full strength; capture is the nearest one\'s alone');
  const tie = measure({ x: 125, y: 100 }, knobs);
  assert.equal(tie.captured.id, 'a', 'a tie goes to the earlier target');
  pass('nearest of many: one capture, the rest keep their strength', m.list.map((e) => `${e.target.id}:${e.distance}`).join(' '));
}

console.log(`ALL ${n} MIR core proximity laws passed`);
