/* window-dock.node.mjs — the dock's geometry: the landing rect with the chip lane on the chips' side (each side), the
 * fallback when a side has no room, and THE GUIDE IS THE LANDING: the proximity target's rect is dockGeometry()'s, and
 * the window lays out (windowLayout) into that same rect once docked.  Also the persisted shape. */
import assert from 'node:assert/strict';
import { DOCK, dockGeometry, dockTargets, anchorTarget, anchorBox } from '../mir/window/dock.js';
import { windowLayout, dockInput, readShape } from '../mir/window/window.js';
import { measure } from '../mir/core/proximity.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };
const viewport = { width: 1280, height: 800 };
const railSizes = { vertical: { w: 62, h: 270 }, horizontal: { w: 270, h: 62 } };
const span = { left: 300, right: 980, top: 8, bottom: 792 };
const geo = (side, dock = 'bottom', height = 300, s = span) => dockGeometry({ span: s, side, dock, height, railSizes, viewport });

{
  assert.deepEqual(geo('left'), { left: 364, top: 492, width: 616, height: 300, side: 'left' }, 'the 64 px lane on the left');
  assert.deepEqual(geo('right'), { left: 300, top: 492, width: 616, height: 300, side: 'right' }, 'on the right');
  assert.deepEqual(geo('top', 'top'), { left: 300, top: 78, width: 680, height: 300, side: 'top' }, 'above: the rail height + the edge');
  assert.deepEqual(geo('bottom'), { left: 300, top: 422, width: 680, height: 300, side: 'bottom' }, 'below');
  assert.deepEqual(geo('left', 'top'), { left: 364, top: 8, width: 616, height: 300, side: 'left' }, 'docked at the top');
  pass('the landing reserves the chip lane on the chips\' side, for each side and both docks');
}
{
  const narrow = { left: 300, right: 680, top: 8, bottom: 792 };
  assert.equal(geo('left', 'bottom', 300, narrow).side, 'top', '380 − 64 < 320: neither side lane fits, the first that does (top)');
  assert.equal(geo('left', 'bottom', 300, { left: 300, right: 600 }), null, 'no side leaves 320 px: no dock');
  assert.equal(geo('left', 'bottom', 2000).height, 784, 'a window taller than the room is cut to it');
  pass('a side without room falls back to the next; no room at all is no dock; the height is cut to the room');
}
{
  const o = { span, side: 'right', height: 300, railSizes, viewport };
  const t = dockTargets(o);
  assert.deepEqual(t.map((x) => x.id), ['top', 'bottom']);
  for (const x of t) {
    const g = dockGeometry({ ...o, dock: x.id });
    assert.deepEqual(x.rect, { left: g.left, top: g.top, width: g.width, height: g.height }, 'the guide rect IS the landing');
  }
  assert.equal(t[0].hit.top, t[0].rect.top); assert.equal(t[1].hit.top, t[1].rect.top + t[1].rect.height); assert.equal(t[0].hit.height, 0);
  /* a window dragged to 20 px below the top line is captured by the top dock */
  const win = { left: 400, top: 28, width: 500, height: 300 };
  const m = measure(win, t, { reach: DOCK.reach, capture: DOCK.capture });
  assert.equal(m.captured && m.captured.id, 'top'); assert.equal(m.distance, 20);
  pass('dockTargets: each target\'s rect is dockGeometry()\'s, the hit is its leading edge; 20 px off the top line captures', `${JSON.stringify(t[0].rect)}`);
}
{
  /* the window lays out exactly where the guide was drawn */
  const env = { view: viewport, sizes: railSizes, span };
  const P = { x: 400, y: 28, w: 500, h: 300, open: true, dock: null, chipSide: 'right' };
  const target = dockTargets(dockInput(P, env)).find((x) => x.id === 'top');
  const L = windowLayout({ ...P, dock: 'top' }, env);
  assert.deepEqual(L.box, target.rect); assert.equal(L.docked, 'top');
  assert.equal(L.seat.side, 'right'); assert.equal(L.seat.left, L.box.left + L.box.width, 'the rail sits in its lane, right of the window');
  const auto = windowLayout({ ...P, dock: 'bottom', chipSide: 'auto' }, env);
  assert.equal(auto.seat.side, 'left', "'auto' docks with the lane on the left");
  const noRoom = windowLayout({ ...P, dock: 'top' }, { ...env, span: { left: 300, right: 600 } });
  assert.equal(noRoom.docked, null, 'no room to dock: it floats for now');
  pass('windowLayout docked = the guide\'s rect; the rail seats in the lane; no room floats and keeps the wish');
}
{
  const env = { view: viewport, sizes: railSizes, span: null };
  const c = windowLayout({ x: null, y: null, w: 520, h: 360, dock: null, chipSide: 'left' }, env);
  assert.deepEqual(c.box, { left: 380, top: 220, width: 520, height: 360 }, 'unplaced: centred');
  const low = windowLayout({ x: 300, y: 900, w: 520, h: 360, dock: null, chipSide: 'left' }, env);
  assert.equal(low.box.top, 800 - 52, 'the house clamp: 52 px of it stays on screen below');
  const off = windowLayout({ x: -900, y: 200, w: 520, h: 360, dock: null, chipSide: 'left' }, env);
  assert.equal(off.box.left, 120 - 520, 'and 120 px across');
  assert.equal(off.seat.side, 'right', 'pushed off the left edge, the rail hops to the side it fits');
  pass('floating: centred until placed, the house clamp, the rail solver behind it');
}
{
  const d = { w: 520, h: 360, chipSide: 'left' };
  assert.deepEqual(readShape(null, d), { x: null, y: null, w: 520, h: 360, open: false, dock: null, chipSide: 'left' });
  assert.deepEqual(readShape({ x: 10.4, y: 20, w: 90, h: 900, open: true, dock: 'top', chipSide: 'auto', junk: 1 }, d, { w: 240, h: 160 }),
    { x: 10, y: 20, w: 240, h: 900, open: true, dock: 'top', chipSide: 'auto' }, 'rounded, floored by min, unknown keys dropped');
  assert.deepEqual(readShape({ x: 'a', y: NaN, w: null, open: 'yes', dock: 'left', chipSide: 'middle' }, d),
    { x: null, y: null, w: 520, h: 360, open: false, dock: null, chipSide: 'left' }, 'every bad field falls back');
  assert.deepEqual(Object.keys(readShape({}, d)), ['x', 'y', 'w', 'h', 'open', 'dock', 'chipSide']);
  pass('the one persistence shape { x, y, w, h, open, dock, chipSide }: every field checked, nothing else kept');
}

{
  /* the anchor seat (BASINS mod-window-snap.js anchorTarget): corner to corner, the same reach and capture as an edge */
  const seatR = { left: 500, top: 300, width: 420, height: 40 };
  const near = anchorTarget({ left: 520, top: 320, width: 300, height: 200 }, seatR);
  assert.equal(near.id, 'anchor'); assert.deepEqual(near.rect, { left: 500, top: 300, width: 420, height: 200 }, 'the seat\'s left, top, width; the window\'s height');
  assert.equal(anchorTarget({ left: 600, top: 400, width: 300, height: 200 }, seatR), null, '141 px corner to corner: out of reach (96)');
  assert.equal(anchorTarget({ left: 520, top: 320, width: 300, height: 200 }, null), null, 'no seat, no target');
  const m = measure({ x: 520, y: 320 }, [near], { reach: DOCK.reach, capture: DOCK.capture });
  assert.ok(m.captured && m.captured.id === 'anchor', '28 px corner to corner: captured');
  const L = windowLayout({ x: 0, y: 0, w: 300, h: 200, open: true, dock: 'anchor', chipSide: 'left' }, { view: viewport, sizes: railSizes, span, anchor: seatR });
  assert.deepEqual(L.box, anchorBox(seatR, 200), 'the guide IS the landing for an anchor too'); assert.equal(L.docked, 'anchor');
  const gone = windowLayout({ x: 0, y: 0, w: 300, h: 200, open: true, dock: 'anchor', chipSide: 'left' }, { view: viewport, sizes: railSizes, span, anchor: null });
  assert.ok(gone.away && gone.docked === 'anchor', 'the seat gone: away, and the wish kept');
  assert.equal(readShape({ dock: 'anchor' }, { w: 1, h: 1 }).dock, 'anchor', 'an anchor dock persists');
  pass('anchorTarget: a seat on another element is a dock target, corner to corner; the landing is the guide; away when it leaves');
}

console.log(`ALL ${n} MIR window dock and layout laws passed`);
