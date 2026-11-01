/* event-target.node.mjs — 1.5.6-alpha.22 · THE EVENT TARGET: an `integer` registry row with `options` cuts the unit line
 * into n equal bands (FL's law); toNorm of an option is its band's centre; describe(id) says the options and steps = n.
 * Without options nothing changes; a toggle reports two steps.  A timeline clip's value lands on its band through the
 * modulation clock's automation.
 *
 *   node tests/event-target.node.mjs
 */
import assert from 'node:assert/strict';
import { createRegistry } from '../mir/modulation/registry.js';
import { createTimelineModel } from '../mir/timeline/model.js';

const R = createRegistry({ roots: ['material', 'slice', 'action'] });
const cell = (v) => { let x = v; return { get: () => x, set: (n) => { x = n; }, now: () => x }; };

// The visible STYLE ids (9 and 10 hidden): ten bands of 0.1 each.
let visible = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11];
const style = cell(6);
R.register('material.style', { map: 'integer', min: 0, max: 11, options: () => visible, ...style });
const n = visible.length;
for (let k = 0; k < n; k++) {
  for (const f of [0, 0.25, 0.5, 0.999]) assert.equal(R.fromNorm('material.style', (k + f) / n), visible[k], `band ${k} at ${f}`);
  assert.equal(R.toNorm('material.style', visible[k]), (k + 0.5) / n, `option ${visible[k]} is its band's centre`);
  assert.equal(R.fromNorm('material.style', R.toNorm('material.style', visible[k])), visible[k], 'centre → option, exact');
}
assert.equal(R.fromNorm('material.style', 0), 0); assert.equal(R.fromNorm('material.style', 1), 11, 'u = 1 is the last band (min(n − 1, …))');
assert.equal(R.fromNorm('material.style', -3), 0); assert.equal(R.fromNorm('material.style', 7), 11); assert.equal(R.fromNorm('material.style', NaN), 0);
assert.equal(R.snap('material.style', 9), 8, 'a hidden id snaps to the nearest option (ties to the earlier)');
assert.equal(R.snap('material.style', 10), 11); assert.equal(R.snap('material.style', 10.4), 11);
assert.equal(R.baseOf('material.style'), 6, 'the seed is an option: the base is kept');

const d = R.describe('material.style');
assert.deepEqual(d.options, visible); assert.equal(d.steps, 10);
assert.deepEqual(R.describe().find((x) => x.id === 'material.style'), d, 'describe() and describe(id) agree');

// The list may change length (MOLECULES off): the bands follow it on the next read.
visible = [0, 1, 2, 3, 4, 5, 6, 7];
assert.equal(R.describe('material.style').steps, 8);
assert.equal(R.fromNorm('material.style', 0.99), 7); assert.equal(R.toNorm('material.style', 3), 3.5 / 8);

// An older point k / max lands on k when the options are the whole range (here slice.mode 0 OFF · 1 CLIP · 2 SLAB).
R.register('slice.mode', { map: 'integer', min: 0, max: 2, options: [0, 1, 2], ...cell(0) });
for (const k of [0, 1, 2]) assert.equal(R.fromNorm('slice.mode', k / 2), k, `the old point ${k}/2 → ${k}`);
R.register('material.view', { map: 'integer', min: 0, max: 139, options: Array.from({ length: 140 }, (_, i) => i), ...cell(0) });
for (let k = 0; k <= 139; k++) assert.equal(R.fromNorm('material.view', k / 139), k, `the old point ${k}/139 → ${k}`);

// No options: the integer map is as it was (the round snap, the linear position); describe has no options.
R.register('slice.plain', { map: 'integer', min: 0, max: 4, ...cell(2) });
assert.equal(R.fromNorm('slice.plain', 0.6), 2); assert.equal(R.toNorm('slice.plain', 3), 0.75); assert.equal(R.snap('slice.plain', 2.6), 3);
assert.equal('options' in R.describe('slice.plain'), false); assert.equal('steps' in R.describe('slice.plain'), false);
// Options that are not integers in range are left out; none left → the plain map.
R.register('slice.junk', { map: 'integer', min: 0, max: 4, options: () => ['a', 9, 1.5], ...cell(1) });
assert.equal(R.fromNorm('slice.junk', 0.5), 2); assert.equal('steps' in R.describe('slice.junk'), false);
R.register('slice.throws', { map: 'integer', min: 0, max: 4, options: () => { throw new Error('app'); }, ...cell(1) });
assert.equal(R.fromNorm('slice.throws', 0.5), 2, 'an options() that throws is no options');

// A toggle is two bands (0.5 with the kit's hysteresis): describe says steps 2.
R.register('action.frame', { map: 'toggle', ...cell(0) });
assert.equal(R.describe('action.frame').steps, 2);

// Modulated: the norm the modulation speaks lands in its band on the target.
visible = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11];
R.applyModulatedNorm('material.style', 0.95); assert.equal(style.now(), 11);
R.applyModulatedNorm('material.style', 0.42); assert.equal(style.now(), 4);
R.restoreBase('material.style'); assert.equal(style.now(), 6);

// An EVENT clip: a HOLD source in band centres, steps = n; the arrangement's 0..1 picks each band in turn.
const m = createTimelineModel(), centre = (k) => (k + 0.5) / 10;
const clip = m.create({ targetId: 'material.style', value: centre(0), duration: 4, source: { steps: 10,
  points: [{ t: 0, v: centre(0), tension: 0, segment: 'hold' }, { t: 0.5, v: centre(9), tension: 0, segment: 'hold' }, { t: 1, v: centre(9), tension: 0 }] } });
assert.ok(clip); assert.equal(m.state().curves[0].steps, R.describe('material.style').steps, 'drawn for the bands the target has');
assert.equal(R.fromNorm('material.style', m.value('material.style', 1)), 0);
assert.equal(R.fromNorm('material.style', m.value('material.style', 3)), 11);

console.log('event-target: equal bands, centres, describe(id) options and steps, a changing list, older points k/max → k, the plain integer map unchanged, toggle steps 2, an event clip — pass');
