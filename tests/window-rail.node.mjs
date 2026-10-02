/* window-rail.node.mjs — the chip rail's pure laws: the seating solver (every fallback branch, and the preference
 * is never written), the nearest edge, the window making room, and the chip state tables (toggle, radio, cycle). */
import assert from 'node:assert/strict';
import { SIDES, RAIL, chipPosition, seatRail, seatOn, nearestSide, roomFor, chipTable, nextState } from '../mir/window/rail.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };
const view = { width: 1280, height: 800 };
const sizes = { vertical: { w: 62, h: 270 }, horizontal: { w: 270, h: 62 } };
const box = (left, top, width = 400, height = 300) => ({ left, top, width, height });

{
  const s = seatRail({ prefer: 'left', box: box(400, 200), sizes, view });
  assert.deepEqual(s, { side: 'left', left: 338, top: 215, width: 62, height: 270, fits: true });
  const t = seatRail({ prefer: 'top', box: box(400, 200), sizes, view });
  assert.deepEqual([t.side, t.left, t.top, t.width, t.height], ['top', 465, 138, 270, 62]);
  const b = seatRail({ prefer: 'bottom', box: box(400, 200), sizes, view });
  assert.deepEqual([b.side, b.top], ['bottom', 500]);
  pass('the preferred side when it fits, centred along the window, with the size of its orientation', `left ${s.left},${s.top} · top ${t.left},${t.top}`);
}
{
  const s = seatRail({ prefer: 'left', box: box(20, 200), sizes, view });
  assert.equal(s.side, 'right'); assert.equal(s.left, 420); assert.ok(s.fits);
  const t = seatRail({ prefer: 'top', box: box(400, 30, 400, 300), sizes, view });
  assert.equal(t.side, 'left', 'top does not fit; the search goes left, right, top, bottom from the preference');
  const r = seatRail({ prefer: 'right', box: box(860, 200), sizes, view });
  assert.equal(r.side, 'left');
  pass('the preferred side does not fit: the first other side that does, in the order of SIDES', `${SIDES.join(' → ')}`);
}
{
  /* a window filling the screen: no side fits, every side is reachable → the first reachable in the search order */
  const s = seatRail({ prefer: 'bottom', box: box(0, 0, 1280, 800), sizes, view });
  assert.equal(s.side, 'bottom'); assert.equal(s.fits, false);
  assert.ok(s.left >= 4 && s.top === 800 - 62 - 4, 'clamped into the view');
  /* a rail too tall for a vertical seat: the first side it can be reached on at all (a horizontal one) */
  const tall = { vertical: { w: 62, h: 900 }, horizontal: { w: 900, h: 62 } };
  const t = seatRail({ prefer: 'left', box: box(0, 0, 1280, 800), sizes: tall, view });
  assert.equal(t.side, 'top', 'left and right cannot be reached (900 > 792); top is the first reachable');
  assert.equal(t.fits, false);
  /* nothing reachable at all: the preference, clamped */
  const huge = { vertical: { w: 62, h: 2000 }, horizontal: { w: 2000, h: 62 } };
  const u = seatRail({ prefer: 'right', box: box(100, 100), sizes: huge, view });
  assert.equal(u.side, 'right'); assert.equal(u.top, 4); assert.equal(u.fits, false);
  pass('nothing fits: the first reachable side, clamped; nothing reachable: the preference, clamped', `${s.side} · ${t.side} · ${u.side}`);
}
{
  const P = { chipSide: 'left' };
  const s = seatRail({ prefer: P.chipSide, box: box(20, 200), sizes, view });
  assert.equal(s.side, 'right'); assert.equal(P.chipSide, 'left', 'the solver never writes the preference');
  const back = seatRail({ prefer: P.chipSide, box: box(400, 200), sizes, view });
  assert.equal(back.side, 'left', 'with room again the preference is honoured');
  const a = seatRail({ prefer: 'auto', box: box(400, 200), sizes, view });
  assert.equal(a.side, 'left', "'auto' is the order of SIDES");
  pass('the preference is kept: a fallback today does not change tomorrow\'s seat');
}
{
  assert.deepEqual(chipPosition('left', box(10, 10), 62, 270, view), { left: 4, top: 25, fits: false });
  assert.equal(nearestSide(390, 300, box(400, 200)), 'left');
  assert.equal(nearestSide(810, 300, box(400, 200)), 'right');
  assert.equal(nearestSide(600, 195, box(400, 200)), 'top');
  assert.equal(nearestSide(600, 497, box(400, 200)), 'bottom');
  assert.equal(nearestSide(600, 350, box(400, 200)), 'top', 'inside: the nearest edge (top 150 · bottom 150 · tie to the earlier)');
  pass('chipPosition clamps and reports fit; nearestSide is the edge nearest the pointer (the Shift-drag law)');
}
{
  const r = roomFor(box(20, 200), 'left', sizes, view);
  assert.deepEqual(r, box(66, 200), 'moved right so the 62 px rail fits on its left with the 4 px pad');
  assert.deepEqual(roomFor(box(400, 200), 'left', sizes, view), box(400, 200), 'already room: untouched');
  assert.deepEqual(roomFor(box(400, 700), 'bottom', sizes, view), box(400, 434));
  assert.deepEqual(roomFor(box(0, 0, 1270, 300), 'left', sizes, view), box(0, 0, 1270, 300), 'window + rail wider than the view: untouched');
  assert.ok(seatRail({ prefer: 'left', box: r, sizes, view }).fits);
  pass('roomFor: a floating window moves just enough for its rail on the chosen side');
}
{
  const t = chipTable({ name: 'bars', kind: 'toggle', label: 'Work bars', states: { true: { hint: 'shown' } } });
  assert.equal(t.get(true).pressed, 'true'); assert.equal(t.get(false).pressed, 'false');
  assert.equal(t.get(true).hint, 'shown'); assert.equal(t.get(false).label, 'Work bars');
  assert.equal(nextState({ kind: 'toggle' }, true), false);
  const radio = chipTable({ name: 'gallery', kind: 'radio', group: 'pane', label: 'Gallery' });
  assert.deepEqual([radio.get(true).pressed, radio.get(false).pressed], ['true', 'false']);
  assert.equal(nextState({ kind: 'radio' }, false), true); assert.equal(nextState({ kind: 'radio' }, true), true, 'a radio press never turns itself off');
  const close = chipTable({ name: 'close', kind: 'close', glyph: 'close', label: 'Close window' });
  assert.equal(close.size, 1); assert.equal(close.get(null).pressed, undefined, 'a close chip has no aria-pressed');
  pass('toggle and radio: rows true/false, aria-pressed from the row, a radio press only turns on');
}
{
  const spec = { name: 'workbars', kind: 'cycle', label: 'Work bars', states: [
    { id: 'bottom', pressed: false, label: 'Work bars: below', glyph: 'barsBottom' },
    { id: 'top', pressed: true, label: 'Work bars: above', glyph: 'barsTop' },
    { id: 'hidden', pressed: 'mixed', label: 'Work bars: hidden', glyph: 'barsTop' }] };
  const t = chipTable(spec);
  assert.deepEqual([...t.keys()], ['bottom', 'top', 'hidden'], 'the declared order');
  assert.deepEqual([...t.values()].map((r) => r.pressed), ['false', 'true', 'mixed']);
  assert.equal(t.get('hidden').label, 'Work bars: hidden');
  assert.deepEqual(['bottom', 'top', 'hidden'].map((s) => nextState(spec, s)), ['top', 'hidden', 'bottom'], 'one cycle, declared once');
  const sort = chipTable({ name: 'sort', kind: 'cycle', label: 'Sort', states: [{ id: 'az', text: 'A–Z' }, { id: 'new', text: 'D↓' }] });
  assert.equal(sort.get('az').text, 'A–Z'); assert.equal(sort.get('new').pressed, 'false', 'a cycle state without pressed is not pressed');
  assert.throws(() => chipTable({ name: 'x', kind: 'cycle', label: 'x' }), /needs states/);
  pass('cycle: one row per declared state, aria-pressed true|false|mixed as declared, text or glyph ink, the order wraps');
}

{
  /* kwin.js RAIL_GAP: a floating window's rail sits 8 px off its RIGHT edge and flush on the left; kwin has no top or
     bottom rail and BASINS' mod-window-snap seats those flush; a docked rail (seatOn in its lane) is flush */
  assert.deepEqual({ ...RAIL.gap }, { left: 0, right: 8, top: 0, bottom: 0 }, 'kwin\'s numbers');
  const b = box(400, 200);
  assert.equal(chipPosition('right', b, 62, 270, view, 4, 8).left, 808, 'right: the box\'s right (800) + 8');
  assert.equal(chipPosition('left', b, 62, 270, view, 4, 0).left, 338, 'left: flush (400 − 62)');
  assert.equal(chipPosition('top', b, 270, 62, view, 4, 0).top, 138, 'top: flush');
  assert.equal(chipPosition('bottom', b, 270, 62, view, 4, 0).top, 500, 'bottom: flush');
  assert.equal(seatRail({ prefer: 'right', box: b, sizes, view, gap: RAIL.gap }).left, 808, 'the solver carries the gap');
  assert.equal(seatRail({ prefer: 'left', box: b, sizes, view, gap: RAIL.gap }).left, 338);
  assert.equal(seatRail({ prefer: 'right', box: b, sizes, view }).left, 800, 'no gap asked: flush (the modulation window, as BASINS draws it)');
  assert.equal(seatOn('right', b, sizes, view).left, 800, 'a docked lane is flush');
  /* the right edge with the gap does not fit: the window makes room for rail AND gap */
  const tight = box(1280 - 4 - 400 - 62, 200);
  assert.equal(seatRail({ prefer: 'right', box: tight, sizes, view, gap: RAIL.gap }).side, 'left', 'rail + gap no longer fits on the right: the solver goes left');
  assert.equal(roomFor(tight, 'right', sizes, view, 4, RAIL.gap).left, 1280 - 4 - 62 - 8 - 400, 'roomFor moves the window by the gap too');
  assert.equal(roomFor(tight, 'right', sizes, view).left, tight.left, 'without a gap it already fits');
  pass('the rail\'s gap from its window is kwin\'s: right 8, left / top / bottom 0, docked 0; the solver and roomFor follow it');
}

console.log(`ALL ${n} MIR window rail laws passed`);
