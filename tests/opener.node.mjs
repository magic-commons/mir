/* opener.node.mjs — the opener's pure part: the arrow grid, the lanes, the pose, the foot and the choice.
 * node tests/opener.node.mjs */
import assert from 'node:assert/strict';
import { arrowTarget, nearestSlot, pointerPose, footParts, applyChoice } from '../mir/shell/opener.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };

ok('the arrows move one, wrap, and ignore other keys', () => {
  assert.equal(arrowTarget(3, 0, 'ArrowRight'), 1);
  assert.equal(arrowTarget(3, 2, 'ArrowRight'), 0);
  assert.equal(arrowTarget(3, 0, 'ArrowLeft'), 2);
  assert.equal(arrowTarget(3, 1, 'ArrowDown'), 2);            // three covers: one row, up and down step one
  assert.equal(arrowTarget(3, 1, 'Enter'), -1);
  assert.equal(arrowTarget(3, -1, 'ArrowRight'), -1);         // nothing has the focus: the arrows do nothing
});
ok('with more than a row, up and down step a row of three (BASINS)', () => {
  assert.equal(arrowTarget(6, 1, 'ArrowDown'), 4);
  assert.equal(arrowTarget(6, 4, 'ArrowUp'), 1);
  assert.equal(arrowTarget(6, 4, 'ArrowDown'), 1);            // wraps
  assert.equal(arrowTarget(4, 3, 'ArrowDown', 2), 1);         // columns is an option
});
ok('the nearest slot decides, by centre', () => {
  const slots = [{ left: 0, top: 0, width: 100, height: 200 }, { left: 114, top: 0, width: 100, height: 200 }, { left: 228, top: 0, width: 100, height: 200 }];
  assert.equal(nearestSlot(slots, 50, 100), 0);
  assert.equal(nearestSlot(slots, 160, 100), 1);               // a hover inside the gap-side of the middle cover
  assert.equal(nearestSlot(slots, 300, 10), 2);
  assert.equal(nearestSlot(slots, 108, 100), 1);               // closer to the middle's centre (164) than to the first's (50): 56 vs 58
  assert.equal(nearestSlot([], 0, 0), -1);
});
ok('the pose is BASINS\' numbers', () => {
  const box = { left: 100, top: 50, width: 200, height: 300 };
  const mid = pointerPose(box, 200, 200);
  assert.equal(mid['--pointer-x'], '50.0%'); assert.equal(mid['--tilt-x'], '0.00deg'); assert.equal(mid['--tilt-y'], '0.00deg');
  assert.equal(mid['--art-x'], '0.0px'); assert.equal(mid['--label-x'], '0.0px');
  const corner = pointerPose(box, 300, 50);                     // top right
  assert.equal(corner['--pointer-x'], '100.0%'); assert.equal(corner['--pointer-y'], '0.0%');
  assert.equal(corner['--art-x'], '-4.0px'); assert.equal(corner['--art-y'], '4.0px');
  assert.equal(corner['--label-x'], '12.0px'); assert.equal(corner['--label-y'], '-9.0px');
  assert.equal(corner['--tilt-x'], '6.00deg'); assert.equal(corner['--tilt-y'], '8.00deg');
  const outside = pointerPose(box, 0, 999);                     // clamped to the cover
  assert.equal(outside['--pointer-x'], '0.0%'); assert.equal(outside['--pointer-y'], '100.0%');
});
ok('the foot is a string or { text, sup }', () => {
  assert.deepEqual(footParts('10'), { text: '10', sup: '' });
  assert.deepEqual(footParts({ text: '10', sup: 243.3 }), { text: '10', sup: '243.3' });
  assert.equal(footParts(undefined), null); assert.equal(footParts(''), null);
});
ok('the choice: resume restores, anything else starts fresh, no session does nothing', () => {
  const calls = []; const session = { resume: () => { calls.push('resume'); return 1; }, discard: () => { calls.push('discard'); return 2; } };
  assert.equal(applyChoice(session, 'resume'), 1); assert.equal(applyChoice(session, 'home'), 2); assert.equal(applyChoice(session, 'piezo'), 2);
  assert.deepEqual(calls, ['resume', 'discard', 'discard']);
  assert.equal(applyChoice(null, 'resume'), null);
});
console.log(`opener: ${n} passed`);
