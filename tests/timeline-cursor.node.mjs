/* timeline-cursor.node.mjs — BASINS tools/test-timeline-cursor.mjs, ported unchanged but for its imports (2026-10-02). */
// THE CURSOR, at known geometry — no browser, no editor, plain objects standing in for the DOM.
import assert from 'node:assert/strict';
import { createTimelineCursor } from '../mir/timeline/cursor.js';
import { formatSeconds, formatBar, formatPercent } from '../mir/timeline/time-format.js';

// The three formatters.
assert.equal(formatSeconds(4), '0:04');
assert.equal(formatSeconds(4, true), '0:04.0');
assert.equal(formatSeconds(65.37, true), '1:05.3');
assert.equal(formatSeconds(7), '0:07');
assert.equal(formatBar(0, 4), '1.1');
assert.equal(formatBar(6, 4), '2.3');
assert.equal(formatBar(8, 4), '3.1');
assert.equal(formatPercent(.5), '50%');
assert.equal(formatPercent(.5, true), '50.0%');
assert.equal(formatPercent(.625, true), '62.5%');
assert.equal(formatPercent(.624), '62%');
console.log('time-format: formatters pass.');

// Known geometry: px=20, bpm=120 (px·bpm/60 = 40, exactly the 'fine' threshold), meter=4.
// clip starts at world beat 4, 8 beats long, 1:1 onto an 8-beat linear 0→1 source.
const px = 20, bpm = 120, meter = 4;
const clip = { id: 'c1', laneId: 'lane1', curveId: 'cv1', start: 4, duration: 8, offset: 0, scale: 1 };
const curve = { id: 'cv1', length: 8, points: [{ t: 0, v: 0, tension: 0 }, { t: 1, v: 1, tension: 0 }] };
const svgRect = { left: 100, top: 50, width: 160, height: 64, right: 260, bottom: 114 };
const rulerRect = { left: 0, top: 0, right: 1000, bottom: 32 };
const contentRect = { left: 0, top: 32, right: 1000, bottom: 300 };
let gestureValue = null;
const svg = {
  viewBox: { baseVal: { width: 160, height: 64 } },
  getBoundingClientRect: () => svgRect,
  parentElement: null, // no getComputedStyle in Node: ink resolves to '' — the browser rig checks the real colour.
  querySelector: sel => {
    if (sel === 'circle.tl-point[data-point="0"]') return { getAttribute: n => ({ cx: '40', cy: '32' }[n]) };
    return null;
  }
};
const view = {
  world: e => ({ x: e.clientX, y: e.clientY }), // viewport left/top and scroll both 0 in this fixture
  ruler: { getBoundingClientRect: () => rulerRect },
  content: { getBoundingClientRect: () => contentRect },
  shell: { contains: el => !!el.__inShell },
  getClip: id => (id === clip.id ? clip : null),
  getCurve: id => (id === curve.id ? curve : null),
  plot: id => (id === clip.id ? svg : null)
};
const editor = { view, px: () => px, model: { state: () => ({ meter }) }, gesture: () => gestureValue };
const mod = { host: { model: { transport: { bpm } } } };
const cursor = createTimelineCursor({ editor, mod });

// Outside the shell entirely: resolve() is null.
assert.equal(cursor.resolve({ target: { __inShell: false, closest: () => null }, clientX: 1, clientY: 1 }), null);
assert.equal(cursor.resolve(null), null);

// Hover inside the clip's plot at (180,66): lx=80 → beat 8, ly=16 → curve value .5.
const plotTarget = { __inShell: true, closest: sel => (sel === 'svg[data-clip]' ? { ...svg, dataset: { clip: 'c1' } } : null) };
const hover = cursor.resolve({ target: plotTarget, clientX: 180, clientY: 66 });
assert.equal(hover.state, 'hover');
assert.equal(hover.track.text, '0:04.0'); assert.equal(hover.track.sub, '3.1'); assert.equal(hover.track.x, 180); assert.equal(hover.track.y, 32);
assert.equal(hover.vLine.x, 180); assert.equal(hover.vLine.top, 32); assert.equal(hover.vLine.bottom, 300);
assert.equal(hover.hLine.y, 66); assert.equal(hover.hLine.left, 100); assert.equal(hover.hLine.right, 260);
assert.deepEqual(hover.clip.rect, svgRect);
assert.equal(hover.clip.timeText, '0:04.0');
assert.equal(hover.clip.valueText, '50%'); // the curve's own value at that beat, not the mouse's raw y
console.log('resolve(): clip hover geometry matches hand-computed numbers.');

// Hovering the clip's title tab: a clip id with no plot y under the pointer — track only, no corner readers.
const tabTarget = { __inShell: true, closest: sel => (sel === '.tl-clip-title[data-clip]' ? { dataset: { clip: 'c1' } } : null) };
const tab = cursor.resolve({ target: tabTarget, clientX: 150, clientY: 10 }); // beat 7.5, 3.75s
assert.equal(tab.clip, null);
assert.equal(tab.track.text, '0:03.7');
console.log('resolve(): the title tab shows the track reader with no clip corner readers.');

// Bare lane/ruler: no clip id at all, same shape as the tab case.
const bareTarget = { __inShell: true, closest: () => null };
const bare = cursor.resolve({ target: bareTarget, clientX: 60, clientY: 10 }); // beat 3, 1.5s
assert.equal(bare.clip, null);
assert.equal(bare.track.text, '0:01.5');
console.log('resolve(): bare ruler/lane hover reports the pointer beat with no clip.');

// The edit in flight: a held point (index 0) at cx=40,cy=32 — the committed point, not the hand.
gestureValue = { kind: 'point', clip: 'c1', curve: 'cv1', index: 0, edge: null };
const held = cursor.gesture();
assert.equal(held.state, 'held');
assert.equal(held.track.text, '0:03.0'); assert.equal(held.track.sub, '2.3');
assert.equal(held.vLine.x, 140); assert.equal(held.hLine.y, 82); assert.equal(held.hLine.left, 100); assert.equal(held.hLine.right, 260);
assert.equal(held.clip.valueText, '50.0%'); // one decimal while held
console.log('gesture(): a held point locks the readout to its committed x/y.');

// Kinds outside point/points/tension, and no active gesture, resolve to no held cursor.
gestureValue = { kind: 'move', clip: 'c1', curve: 'cv1', index: null, edge: null };
assert.equal(cursor.gesture(), null);
gestureValue = null;
assert.equal(cursor.gesture(), null);
console.log('gesture(): move/trim/step and no-gesture both report null.');
console.log('timeline-cursor: all checks pass.');
