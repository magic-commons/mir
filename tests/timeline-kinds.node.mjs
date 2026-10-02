// The clip-kind seam: a registered kind validates, values and is found under a beat; a curve clip is untouched.
import assert from 'node:assert/strict';
import { registerClipKind, clipKind, clipKinds, isKindCurve } from '../mir/timeline/kinds.js';
import { createTimelineModel, isTimelineSnapshot } from '../mir/timeline/model.js';

registerClipKind('step', {
  validate: (c) => Array.isArray(c.levels) && c.levels.length > 0 && c.levels.every((v) => v >= 0 && v <= 1),
  value: (c, clip, sourceBeat) => c.levels[Math.floor(sourceBeat) % c.levels.length],
  duration: (c) => c.levels.length
});
// the kit's model registers its two kinds (pattern, audio) on import, so a BASINS project restores anywhere; BASINS
// imported them in timeline-project.js instead, so its registry held only 'step' here
assert.deepEqual(clipKinds().sort(), ['audio', 'pattern', 'step']);
assert.equal(clipKind({ kind: 'curve' }), null);
assert.equal(isKindCurve({ kind: 'step' }), true);

const m = createTimelineModel();
const lane = m.state().lanes[0].id;
const plain = m.create({ targetId: 'camera.panx', name: 'A', value: .5, start: 0, duration: 4, laneId: lane });
assert.ok(plain, 'a curve clip still creates');
const stepped = m.create({ targetId: 'camera.pany', name: 'S', value: .5, start: 8, duration: 4, laneId: lane, source: { kind: 'step', levels: [0, .25, .5, 1] } });
assert.ok(stepped, 'a kind clip creates through the one path');
const curve = m.state().curves.find((c) => c.kind === 'step');
assert.equal(curve.points.length, 0, 'a kind curve may carry no points');
assert.equal(m.create({ targetId: 'camera.pany', name: 'bad', value: .5, start: 16, duration: 4, laneId: lane, source: { kind: 'step', levels: [2] } }), null, 'the kind refuses what it cannot validate');

assert.equal(m.value('camera.pany', 8), 0, 'value asks the kind');
assert.equal(m.value('camera.pany', 9.5), .25);
assert.equal(m.value('camera.pany', 11), 1);
assert.equal(m.value('camera.pany', 12), null, 'outside the clip');
assert.ok(Number.isFinite(m.value('camera.panx', 1)), 'a curve clip still values');

const under = m.activeClips(9, 'step');
assert.equal(under.length, 1); assert.equal(under[0].curve.kind, 'step');
assert.equal(m.activeClips(1, 'step').length, 0);
assert.equal(m.activeClips(1).length, 1, 'no kind filter returns every live pair');

const json = JSON.parse(JSON.stringify(m.serialize()));
assert.ok(isTimelineSnapshot(json), 'the kind survives the snapshot law');
const m2 = createTimelineModel(); assert.ok(m2.restore(json));
assert.equal(m2.value('camera.pany', 10), .5, 'restored through the kind');
const broken = JSON.parse(JSON.stringify(json)); broken.curves.find((c) => c.kind === 'step').levels = [5];
assert.equal(isTimelineSnapshot(broken), false, 'an invalid kind curve is refused');
const unknown = JSON.parse(JSON.stringify(json)); unknown.curves.find((c) => c.kind === 'step').kind = 'nobody';
assert.equal(isTimelineSnapshot(unknown), false, 'an unregistered kind is refused');
console.log('Timeline kinds: registry, create through one path, value by kind, activeClips, snapshot law pass.');
