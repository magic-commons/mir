/* timeline-history.node.mjs — BASINS tools/test-history.mjs, ported whole (2026-10-02): the kit's createHistory (harvested
 * from BASINS before) with the kit's adoptTimeline (timeline/history.js) and model. */
// THE ONE STACK (2026-10-01): push/undo/redo across two domains in order, the 256-entry / 32 MiB limits, labels, gestures,
// and the timeline domain delegating to its model's own snapshot undo.  node tools/test-history.mjs
import assert from 'node:assert/strict';
import { createHistory, HISTORY_LIMIT, HISTORY_BYTES } from '../mir/history/history.js';
import { adoptTimeline, timelineLabel } from '../mir/timeline/history.js';
import { createTimelineModel } from '../mir/timeline/model.js';

/* a hand-cranked clock: the stack's quiet windows and next-task settles run when the test says */
const queue = [];
const timers = { setTimeout: (fn) => { queue.push(fn); return queue.length; }, clearTimeout: (id) => { if (id) queue[id - 1] = null; } };
const tick = () => { const run = queue.splice(0); for (const fn of run) if (fn) fn(); };

/* two snapshot domains standing in for COLOUR and CAMERA */
const colour = { hue: 0.1, entries: [1, 2, 3] }, camera = { panx: 0 };
const H = createHistory({ timers });
H.register('colour', { read: () => structuredClone(colour), write: (s) => Object.assign(colour, structuredClone(s)) });
H.register('camera', { read: () => ({ ...camera }), write: (s) => Object.assign(camera, s) });
const model = createTimelineModel();
let rawUndos = 0;
const adopted = adoptTimeline(H, model);
const ownUndo = adopted.raw.undo; adopted.raw.undo = () => { rawUndos++; return ownUndo(); };
assert.equal(H.length, 0); assert.equal(H.canUndo, false);

/* a COLOUR gesture, then a TIMELINE edit, then a CAMERA note: three rows, in the hand's order */
H.hold('HUE · COLOUR'); colour.hue = 0.5; H.release(); tick();
const clip = model.create({ targetId: 'palette.hue', value: 0.25, start: 0, duration: 4 });
assert.ok(clip);
H.note('PAN X · CAMERA'); camera.panx = 0.3; tick();
assert.deepEqual(H.entries().map((e) => [e.label, e.state]), [['START', 'past'], ['HUE · COLOUR', 'past'], [timelineLabel('create'), 'past'], ['PAN X · CAMERA', 'current']]);
assert.equal(H.entries()[2].domain, 'timeline');

/* undo walks back across the domains in order; the timeline row calls the model's own undo */
assert.equal(H.undo(), true); assert.equal(camera.panx, 0); assert.equal(model.state().clips.length, 1);
assert.equal(H.undo(), true); assert.equal(model.state().clips.length, 0); assert.equal(rawUndos, 1); assert.equal(colour.hue, 0.5);
assert.equal(H.undo(), true); assert.equal(colour.hue, 0.1);
assert.equal(H.undo(), false); assert.equal(H.cursor, 0);
/* …and redo forward, in the same order */
assert.equal(H.redo(), true); assert.equal(colour.hue, 0.5);
assert.equal(H.redo(), true); assert.equal(model.state().clips.length, 1);
assert.equal(H.redo(), true); assert.equal(camera.panx, 0.3);
assert.equal(H.redo(), false);

/* the model's OWN undo key routes through the one stack: Ctrl+Z inside the timeline undoes the newest row, whatever it is */
model.undo(); assert.equal(camera.panx, 0, 'the timeline window\'s Ctrl+Z took the camera row, the newest');
model.redo(); assert.equal(camera.panx, 0.3);

/* a timeline gesture is ONE row at its commit; a cancelled gesture is none; a travel is never an edit */
const curveId = model.state().curves[0].id;
model.begin(); model.movePoint(curveId, 0, 0, 0.9); model.movePoint(curveId, 0, 0, 0.8); model.commit();
assert.equal(H.entries().at(-1).label, timelineLabel('movePoint'));
const rows = H.length;
model.begin(); model.movePoint(curveId, 0, 0, 0.1); model.cancel();
assert.equal(H.length, rows, 'a cancelled drag leaves no row');
H.undo(); assert.equal(model.state().curves[0].points[0].v, 0.25);
H.redo(); assert.equal(model.state().curves[0].points[0].v, 0.8);

/* goto: any row, one hop, either direction; START is −1 */
H.goto(-1); assert.equal(H.cursor, 0); assert.equal(colour.hue, 0.1); assert.equal(model.state().clips.length, 0); assert.equal(camera.panx, 0);
H.goto(1); assert.equal(H.cursor, 2); assert.equal(model.state().clips.length, 1); assert.equal(camera.panx, 0);
assert.deepEqual(H.entries().map((e) => e.state), ['past', 'past', 'current', 'future', 'future']);
/* an edit truncates the future */
H.note('BRIGHT · COLOUR'); colour.hue = 0.7; tick();
assert.equal(H.length, 3); assert.equal(H.canRedo, false); assert.equal(H.entries().at(-1).label, 'BRIGHT · COLOUR');

/* one gesture that moves two domains is ONE row; a gesture that moved nothing takes its name with it */
H.hold('PRESET · MODULATION'); colour.hue = 0.2; camera.panx = 0.6; H.release(); tick();
assert.equal(H.entries().at(-1).domain, 'colour · camera');
H.undo(); assert.equal(colour.hue, 0.7); assert.equal(camera.panx, 0);
H.redo();
H.hold('NOTHING'); H.release(); tick();
H.note(); colour.hue = 0.3; tick();
assert.equal(H.entries().at(-1).label, 'EDIT', 'an unnamed note does not inherit a spent gesture\'s name');
/* a stage gesture is not an edit: absorbed */
H.hold(); camera.panx = 0.9; H.release({ absorb: true }); tick();
assert.notEqual(H.entries().at(-1).label, 'NOTHING'); const before = H.length;
H.note('X'); tick(); assert.equal(H.length, before, 'the absorbed move is not a row later either');

/* a change nobody announced (boot, a programmatic write) is absorbed at the next gesture, never a row of its own */
const quietRows = H.length;
colour.hue = 0.95;
H.hold('PAN Y · CAMERA'); camera.panx = 0.1; H.release(); tick();
assert.equal(H.length, quietRows + 1); assert.equal(H.entries().at(-1).domain, 'camera');
H.undo(); assert.equal(colour.hue, 0.95, 'undoing the camera row leaves the unannounced colour alone'); H.redo();

/* change(): a programmatic edit as one named row */
H.change('colour', 'LOAD LOOK', () => { colour.entries = [9]; });
assert.equal(H.entries().at(-1).label, 'LOAD LOOK'); H.undo(); assert.deepEqual(colour.entries, [1, 2, 3]);

/* a replaced timeline takes its rows with it; the others keep their order */
model.restore(null);
assert.ok(H.entries().every((e) => e.domain !== 'timeline'));
H.clear('OPEN · TEST'); assert.equal(H.entries()[0].label, 'OPEN · TEST'); assert.equal(H.length, 0);

/* THE LIMITS: 256 rows, the oldest fall off the front; 32 MiB, the bytes bound the count first */
assert.equal(HISTORY_LIMIT, 256); assert.equal(HISTORY_BYTES, 32 * 1024 * 1024);
const L = createHistory({ timers });
let n = 0;
for (let i = 0; i < 300; i++) L.push({ label: 'ROW ' + i, domain: 'x', size: 10, undo: () => { n--; }, redo: () => { n++; } });
assert.equal(L.length, 256); assert.equal(L.entries()[1].label, 'ROW 44'); assert.equal(L.bytes, 2560);
const B = createHistory({ timers });
for (let i = 0; i < 40; i++) B.push({ label: 'BIG ' + i, domain: 'x', size: 1024 * 1024, undo() {}, redo() {} });
assert.equal(B.length, 32); assert.ok(B.bytes <= HISTORY_BYTES); assert.equal(B.entries()[1].label, 'BIG 8');
const one = createHistory({ timers }); one.push({ label: 'HUGE', size: 64 * 1024 * 1024, undo() {}, redo() {} });
assert.equal(one.length, 1, 'the newest row survives even past the byte cap');

/* a delegated row its model no longer holds (past its own 64) is dropped and the next row answers */
const T = createHistory({ timers }), m2 = createTimelineModel(); adoptTimeline(T, m2);
for (let i = 0; i < 70; i++) m2.create({ targetId: 'palette.hue', value: 0.5, start: i * 4, duration: 4 });
assert.equal(T.length, 70);
let undone = 0; while (T.undo()) undone++;
assert.equal(undone, 64, 'the model held 64 of the 70; the stack drops the six it cannot apply');
assert.equal(m2.state().clips.length, 6);

console.log('History: two domains in order, the timeline delegating to its model\'s own undo, gestures, goto, labels, 256 rows and 32 MiB pass.');
