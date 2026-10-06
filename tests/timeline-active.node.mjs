/* timeline-active.node.mjs — THE ACTIVE RANGE rides the project (INV row 108): the range the recorder renders is a field of the
 * arrangement, so it is saved, restored, compared and undone with it.  Headless: the model, the project part, the project registry.
 *   node tests/timeline-active.node.mjs */
import assert from 'node:assert/strict';
import { createTimelineModel } from '../mir/timeline/model.js';
import { timelinePart, registerTimelinePart } from '../mir/timeline/project.js';
import { createProjectParts } from '../mir/core/project.js';

const m = createTimelineModel(), P = createProjectParts();
const part = timelinePart(m);
registerTimelinePart(m, {}, P.register);
assert.equal(part.capture(), null, 'an untouched timeline is not project content');

/* a range alone IS content: setting it makes the part capture, and changes the signature */
const sig0 = P.signature();
assert.equal(m.setActive({ start: 2, end: 6 }), true);
const doc = part.capture();
assert.deepEqual(doc.active, { start: 2, end: 6 }, 'the part captures the range even with no clips');
assert.notEqual(P.signature(), sig0, 'the project signature moves with the range (a project with a range is not the project without)');
assert.deepEqual(P.capture().timeline.active, { start: 2, end: 6 });

/* it comes back with the project, and a project that never had one clears it */
const saved = JSON.parse(JSON.stringify(P.capture()));
m.setActive(null);
assert.equal(part.capture(), null, 'clearing it makes the timeline empty again');
assert.deepEqual(P.restore(saved), { failed: [] });
assert.deepEqual(m.serialize().active, { start: 2, end: 6 }, 'restore puts the range back');
P.restore({});
assert.equal(m.serialize().active, undefined, 'a project that never had a timeline opens with no range');

/* an unreadable range does not survive a restore */
for (const bad of [{ start: 4, end: 4 }, { start: 5, end: 1 }, { start: -1, end: 3 }, { start: NaN, end: 3 }, { start: 0 }]) {
  const snap = { ...JSON.parse(JSON.stringify(m.serialize())), active: bad };
  assert.equal(m.restore(snap), true);
  assert.equal(m.serialize().active, undefined, 'a bad range is dropped: ' + JSON.stringify(bad));
}
m.restore(null);
/* setActive refuses what it cannot read */
assert.equal(m.setActive({ start: 3, end: 3 }), false); assert.equal(m.serialize().active, undefined);
assert.equal(m.setActive({ start: -2, end: 5 }), true); assert.deepEqual(m.serialize().active, { start: 0, end: 5 }, 'a negative start is clamped to zero');

/* it is one edit of the model's own history: undo takes it back, redo puts it again */
m.restore(null);
m.setActive({ start: 1, end: 3 });
assert.equal(m.undo(), true); assert.equal(m.serialize().active, undefined, 'undo removes the range');
assert.equal(m.redo(), true); assert.deepEqual(m.serialize().active, { start: 1, end: 3 }, 'redo puts it back');

/* a range does not make an arrangement carry clips it does not have */
const clips = createTimelineModel(); clips.create({ targetId: 'a.b', name: 'X', value: 0.5, start: 0, duration: 4 }); clips.setActive({ start: 0, end: 4 });
const round = createTimelineModel(); assert.equal(round.restore(JSON.parse(JSON.stringify(clips.serialize()))), true);
assert.equal(round.signature(), clips.signature(), 'a saved and restored arrangement has the same signature, range and all');

console.log('Timeline active range: the project carries it — captured alone, restored, compared, cleared, undone.');
