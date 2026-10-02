/* history.node.mjs — THE ONE STACK (ported from BASINS tools/test-history.mjs, minus the timeline model, plus the laws a kit
 * promises): push/undo/redo across domains in order, hold/release coalescing, goto, truncating the future, a no-op gesture
 * leaves no row, the 256-row / 32 MiB caps, a delegated row its owner dropped, and the list view's entries.  node tests/history.node.mjs */
import assert from 'node:assert/strict';
import { createHistory, HISTORY_LIMIT, HISTORY_BYTES } from '../mir/history/history.js';

/* a hand-cranked clock: the stack's quiet windows and next-task settles run when the test says */
const queue = [];
const timers = { setTimeout: (fn) => { queue.push(fn); return queue.length; }, clearTimeout: (id) => { if (id) queue[id - 1] = null; } };
const tick = () => { const run = queue.splice(0); for (const fn of run) if (fn) fn(); };

const colour = { hue: 0.1, entries: [1, 2, 3] }, camera = { panx: 0 };
const H = createHistory({ timers });
H.register('colour', { read: () => structuredClone(colour), write: (s) => Object.assign(colour, structuredClone(s)) });
H.register('camera', { read: () => ({ ...camera }), write: (s) => Object.assign(camera, s) });
assert.equal(H.length, 0); assert.equal(H.canUndo, false); assert.equal(H.canRedo, false);

/* a COLOUR gesture, a delegated row, a CAMERA note: three rows, in the hand's order */
let owned = 0;
H.register('owned', { delegated: true });
H.hold('HUE · COLOUR'); colour.hue = 0.5; H.release(); tick();
H.push({ label: 'OWNED EDIT', domain: 'owned', domains: ['owned'], undo: () => { owned--; }, redo: () => { owned++; } }); owned = 1;
H.note('PAN X · CAMERA'); camera.panx = 0.3; tick();
assert.deepEqual(H.entries().map((e) => [e.label, e.state]), [['START', 'past'], ['HUE · COLOUR', 'past'], ['OWNED EDIT', 'past'], ['PAN X · CAMERA', 'current']]);

/* undo walks back across the domains in order; redo forward again */
assert.equal(H.undo(), true); assert.equal(camera.panx, 0); assert.equal(owned, 1);
assert.equal(H.undo(), true); assert.equal(owned, 0); assert.equal(colour.hue, 0.5);
assert.equal(H.undo(), true); assert.equal(colour.hue, 0.1);
assert.equal(H.undo(), false); assert.equal(H.cursor, 0);
assert.equal(H.redo(), true); assert.equal(colour.hue, 0.5);
assert.equal(H.redo(), true); assert.equal(owned, 1);
assert.equal(H.redo(), true); assert.equal(camera.panx, 0.3);
assert.equal(H.redo(), false);

/* coalescing under hold: many moves in one gesture are ONE row, named for the gesture */
const n0 = H.length;
H.hold('DRAG · COLOUR'); for (const h of [0.2, 0.3, 0.4, 0.6]) { colour.hue = h; H.note(); } H.release(); tick();
assert.equal(H.length, n0 + 1); assert.equal(H.entries().at(-1).label, 'DRAG · COLOUR');
H.undo(); assert.equal(colour.hue, 0.5, 'the whole drag undoes in one step'); H.redo(); assert.equal(colour.hue, 0.6);
/* …and a held gesture does not settle on a note's timer */
H.hold('HELD'); colour.hue = 0.65; H.note(); tick(); assert.equal(H.length, n0 + 1, 'held: nothing lands until release'); H.release(); tick(); assert.equal(H.length, n0 + 2);
H.undo(); H.undo();

/* goto: any row, one hop, either direction; START is −1 */
H.goto(-1); assert.equal(H.cursor, 0); assert.equal(colour.hue, 0.1); assert.equal(owned, 0); assert.equal(camera.panx, 0);
H.goto(1); assert.equal(H.cursor, 2); assert.equal(owned, 1); assert.equal(camera.panx, 0);
assert.deepEqual(H.entries().slice(0, 5).map((e) => e.state), ['past', 'past', 'current', 'future', 'future']);
assert.equal(H.goto(1), false, 'standing on the row already: no move');
/* an edit truncates the future */
H.note('BRIGHT · COLOUR'); colour.hue = 0.7; tick();
assert.equal(H.length, 3); assert.equal(H.canRedo, false); assert.equal(H.entries().at(-1).label, 'BRIGHT · COLOUR');

/* one gesture that moves two domains is ONE row; a gesture that moved nothing leaves no row and takes its name with it */
H.hold('PRESET · BOTH'); colour.hue = 0.2; camera.panx = 0.6; H.release(); tick();
assert.equal(H.entries().at(-1).domain, 'colour · camera');
H.undo(); assert.equal(colour.hue, 0.7); assert.equal(camera.panx, 0); H.redo();
const rows = H.length;
H.hold('NOTHING'); H.release(); tick();
assert.equal(H.length, rows, 'a no-op gesture leaves no row');
H.note(); colour.hue = 0.3; tick();
assert.equal(H.entries().at(-1).label, 'EDIT', 'an unnamed note does not inherit a spent gesture\'s name');
/* a gesture that is not an edit (a drag on the picture) is absorbed */
H.hold(); camera.panx = 0.9; H.release({ absorb: true }); tick();
const before = H.length; H.note('X'); tick(); assert.equal(H.length, before, 'the absorbed move is not a row later either');

/* a change nobody announced (boot, a programmatic write) is absorbed at the next gesture, never a row of its own */
const quietRows = H.length;
colour.hue = 0.95;
H.hold('PAN Y · CAMERA'); camera.panx = 0.1; H.release(); tick();
assert.equal(H.length, quietRows + 1); assert.equal(H.entries().at(-1).domain, 'camera');
H.undo(); assert.equal(colour.hue, 0.95, 'undoing the camera row leaves the unannounced colour alone'); H.redo();

/* change(): a programmatic edit as one named row; one that changed nothing is none */
H.change('colour', 'LOAD LOOK', () => { colour.entries = [9]; });
assert.equal(H.entries().at(-1).label, 'LOAD LOOK'); H.undo(); assert.deepEqual(colour.entries, [1, 2, 3]); H.redo();
const r2 = H.length; assert.equal(H.change('colour', 'SAME', () => {}), false); assert.equal(H.length, r2);

/* a travel is not an edit: while a row runs, notes and pushes are suppressed */
let applyingSeen = null;
const A = createHistory({ timers }); A.register('x', { delegated: true });
A.push({ label: 'A', domain: 'x', domains: ['x'], undo: () => { applyingSeen = A.applying; A.note('NOPE'); A.push({ label: 'LOOP', undo() {}, redo() {} }); }, redo() {} });
A.undo(); tick(); assert.equal(applyingSeen, true); assert.equal(A.length, 1, 'nothing pushed during a travel');

/* forget(domain), clear(label), subscribe */
let heard = 0; const off = H.subscribe(() => heard++);
H.push({ label: 'OWNED 2', domain: 'owned', domains: ['owned'], undo() {}, redo() {} });
assert.ok(heard >= 1); assert.equal(H.forget('owned') >= 1, true); assert.ok(H.entries().every((e) => e.domain !== 'owned')); off();
H.clear('OPEN · TEST'); assert.equal(H.entries()[0].label, 'OPEN · TEST'); assert.equal(H.length, 0);

/* THE LIMITS: 256 rows, the oldest fall off the front; 32 MiB, the bytes bound the count first */
assert.equal(HISTORY_LIMIT, 256); assert.equal(HISTORY_BYTES, 32 * 1024 * 1024);
const L = createHistory({ timers });
for (let i = 0; i < 300; i++) L.push({ label: 'ROW ' + i, domain: 'x', size: 10, undo() {}, redo() {} });
assert.equal(L.length, 256); assert.equal(L.entries()[1].label, 'ROW 44'); assert.equal(L.bytes, 2560);
const B = createHistory({ timers });
for (let i = 0; i < 40; i++) B.push({ label: 'BIG ' + i, domain: 'x', size: 1024 * 1024, undo() {}, redo() {} });
assert.equal(B.length, 32); assert.ok(B.bytes <= HISTORY_BYTES); assert.equal(B.entries()[1].label, 'BIG 8');
const one = createHistory({ timers }); one.push({ label: 'HUGE', size: 64 * 1024 * 1024, undo() {}, redo() {} });
assert.equal(one.length, 1, 'the newest row survives even past the byte cap');
const small = createHistory({ timers, limit: 3 }); for (let i = 0; i < 5; i++) small.push({ label: 'S' + i, undo() {}, redo() {} });
assert.equal(small.length, 3); assert.equal(small.limit, 3);

/* a delegated row its owner no longer holds (undo returns false) is dropped and the next row answers */
const T = createHistory({ timers }); let held = 2;
for (let i = 0; i < 5; i++) T.push({ label: 'T' + i, domain: 't', domains: ['t'], undo: () => (i >= 5 - held ? true : false), redo() {} });
let undone = 0; while (T.undo()) undone++;
assert.equal(undone, 2, 'two rows the owner still holds; the three it cannot apply are dropped'); assert.equal(T.length, 2);

/* a record() over several domains is one row, and a push without undo/redo is refused */
const R = createHistory({ timers }); const s1 = { v: 1 }, s2 = { v: 1 };
R.register('a', { read: () => ({ ...s1 }), write: (s) => Object.assign(s1, s) }); R.register('b', { read: () => ({ ...s2 }), write: (s) => Object.assign(s2, s) });
assert.equal(R.record(['a', 'b'], 'BOTH', { a: { v: 1 }, b: { v: 1 } }, { a: { v: 2 }, b: { v: 3 } }), true);
Object.assign(s1, { v: 2 }); Object.assign(s2, { v: 3 }); R.undo(); assert.deepEqual([s1.v, s2.v], [1, 1]); R.redo(); assert.deepEqual([s1.v, s2.v], [2, 3]);
assert.equal(R.push({ label: 'BAD' }), false);

/* the list's host state (history-list.js): what a host's own UNDO / REDO / count need when it turns the list's off */
{
  const { historyState } = await import('../mir/history/history-list.js');
  const S = createHistory({ timers }); let v = 0;
  S.register('v', { read: () => ({ v }), write: (s) => { v = s.v; } });
  let st = historyState(S); assert.equal(st.canUndo, false); assert.equal(st.canRedo, false);
  S.change('v', 'ONE', () => { v = 1; }); tick();
  st = historyState(S); assert.equal(st.canUndo, true); assert.equal(st.length, S.length); assert.match(st.count, /^\d+ of \d+ · [\d.]+ of \d+ MB$/);
  S.undo(); st = historyState(S); assert.equal(st.canRedo, true);
}

console.log('History: two domains in order, coalescing under hold, goto, a no-op gesture leaving no row, truncation, travel-is-not-an-edit, 256 rows and 32 MiB pass.');
