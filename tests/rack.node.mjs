/* rack.node.mjs — the rack's pure part: the live reorder (the title bar decides), the insertion index and the slot it
 * draws, the detach test, the float clamp, the peek (near, hold, the armed dismiss), the transport's seat, the
 * SHIFT-queue's order, the ☆ slot choice, and the layout repair (unknown ids dropped, λWAVES/BASINS records read). */
import assert from 'node:assert/strict';
import { RACK, reorderIndex, insertionIndex, slotRect, moveId, clampFloat, detached, peekSide, dodgeSeat,
  queueToggle, openOrder, favSlot, readLayout, layoutLabel } from '../mir/shell/rack.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };
/* three 100-px windows with 10-px gaps: middles at 50, 160, 270 */
const B = [{ top: 0, height: 100 }, { top: 110, height: 100 }, { top: 220, height: 100 }];

{
  /* THE TITLE BAR DECIDES: the probe is the middle of the held window's title bar (a 34-px bar: 17 px below its top) */
  assert.equal(reorderIndex(B, 0, 17), 0, 'at rest: the bar is in its own window');
  assert.equal(reorderIndex(B, 0, 160), 0, 'exactly on the neighbour\'s middle: not yet');
  assert.equal(reorderIndex(B, 0, 160.5), 1, 'past it: below it');
  assert.equal(reorderIndex(B, 0, 300), 2, 'past two middles: two');
  assert.equal(reorderIndex(B, 2, 159.5), 1, 'upward: above the middle, above the window');
  assert.equal(reorderIndex(B, 2, 160), 2, 'on the middle upward: not yet');
  assert.equal(reorderIndex(B, 2, 0), 0, 'to the top');
  assert.equal(reorderIndex(B, 1, 117), 1, 'its own bar at rest');
  /* a TALL held window: its centre would be far below its bar — only the bar counts */
  const T = [{ top: 0, height: 100 }, { top: 110, height: 600 }];
  assert.equal(reorderIndex(T, 1, 60), 1, 'the bar 10 px below the neighbour\'s middle: stays below, however tall');
  assert.equal(reorderIndex(T, 1, 49), 0, 'the bar above the neighbour\'s middle: above it');
  /* no hysteresis needed: after the swap the neighbour's middle has moved the held window's height away */
  const after = [{ top: 0, height: 600 }, { top: 610, height: 100 }];
  assert.equal(reorderIndex(after, 0, 49), 0, 'swapped: the same bar is now well above the neighbour\'s new middle (660)');
  pass('reorderIndex: the title bar\'s middle decides — above a window once above its middle, below once below; tall windows alike, stable after a swap');
}
{
  assert.equal(insertionIndex(B, -40), 0); assert.equal(insertionIndex(B, 49), 0); assert.equal(insertionIndex(B, 51), 1, 'the carried window\'s title bar below the first middle: below it');
  assert.equal(insertionIndex(B, 400), 3); assert.equal(insertionIndex([], 10), 0);
  const col = { left: 900, right: 1200, top: 0 };
  assert.deepEqual(slotRect(col, B, 1), { left: 900, top: 103, width: 300, height: 4 }, 'centred in the 10-px gap');
  assert.deepEqual(slotRect(col, B, 0), { left: 900, top: -7, width: 300, height: 4 }, 'above the first');
  assert.deepEqual(slotRect(col, B, 3), { left: 900, top: 323, width: 300, height: 4 }, 'below the last');
  assert.equal(slotRect(col, [], 0).width, 300, 'an empty rack still has a slot');
  pass('insertionIndex + slotRect: the slot is drawn in the gap the window will land in');
}
{
  const col = { left: 980, right: 1280 };
  assert.equal(detached(700, 260, col), true, '700 + 260 = 960 < 980 − 12');
  assert.equal(detached(712, 260, col), false, 'still inside the margin');
  assert.equal(detached(1293, 260, col), true, 'out the far side');
  assert.deepEqual(clampFloat(-500, -40, 300, { width: 1280, height: 800 }), { x: -180, y: 0 }, '120 px stay on screen, the head below the top');
  assert.deepEqual(clampFloat(2000, 2000, 300, { width: 1280, height: 800 }), { x: 1160, y: 756 });
  pass('detached + clampFloat: a window comes loose only once it clears the column by 12 px; a float stays reachable');
}
{
  const W = 1280, w = 300;
  assert.equal(peekSide({ x: 1250, width: W, right: w }), 'right', 'near the right edge');
  assert.equal(peekSide({ x: 30, width: W, left: w, right: w }), 'left');
  assert.equal(peekSide({ x: 30, width: W, right: w }), '', 'no left rack, no left peek');
  assert.equal(peekSide({ x: 1000, width: W, right: w }), '', 'not armed: the middle of the screen peeks nothing');
  assert.equal(peekSide({ x: 1000, width: W, right: w, current: 'right' }), 'right', 'armed: it holds over the rack');
  assert.equal(peekSide({ x: W - w - RACK.peekHold - 1, width: W, right: w, current: 'right' }), '', 'and lets go past rack + 48');
  pass('peekSide: near an edge peeks, a peek holds over its rack, and lets go beyond it');
}
{
  const seats = { bottom: { left: 360, right: 920, top: 694, bottom: 740 }, top: { left: 360, right: 920, top: 52, bottom: 98 } };
  assert.equal(dodgeSeat(seats, null, 'top'), 'bottom', 'nothing floats: home');
  assert.equal(dodgeSeat(seats, { left: 400, right: 800, top: 600, bottom: 720 }), 'top', 'covered: up');
  assert.equal(dodgeSeat(seats, { left: 400, right: 800, top: 0, bottom: 800 }, 'top'), 'top', 'both covered: stay');
  assert.equal(dodgeSeat(seats, { left: 0, right: 100, top: 0, bottom: 800 }, 'top'), 'bottom', 'beside it: home');
  pass('dodgeSeat: the transport takes the seat the floating rect does not cover');
}
{
  let q = []; for (const id of ['a', 'b', 'c']) q = queueToggle(q, id);
  q = queueToggle(q, 'b'); assert.deepEqual(q, ['a', 'c'], 'a second SHIFT-click takes it back');
  assert.deepEqual(openOrder(['a', 'b', 'c']), ['c', 'b', 'a'], 'replayed backwards, so the rack reads a, b, c');
  assert.deepEqual(moveId(['a', 'b', 'c'], 'a', 2), ['b', 'c', 'a']); assert.deepEqual(moveId(['a', 'b', 'c'], 'c', -4), ['c', 'a', 'b']);
  assert.equal(favSlot({}), 1); assert.equal(favSlot({ 1: { at: 5 }, 2: { at: 9 } }), 3);
  assert.equal(favSlot({ 1: { at: 5 }, 2: { at: 1 }, 3: { at: 9 }, 4: { at: 7 } }), 2, 'full: the oldest');
  pass('queue, open order, moveId, favSlot');
}
{
  const known = new Set(['a', 'b', 'c']);
  const L = readLayout({ hidden: true, cards: [{ id: 'a', side: 'left', open: true, folded: true }, { id: 'ghost', side: 'left', open: true },
    { id: 'a', side: 'right', open: false }, { id: 'b', side: 'R', closed: false, float: { x: 10.4, y: 'no', w: 50 } }, null, 7, { id: 'c', side: 'L', closed: true }] }, known);
  assert.deepEqual(L.cards.map((c) => c.id), ['a', 'b', 'c'], 'the unknown and the repeat are dropped, nothing throws');
  assert.equal(L.hidden, true);
  assert.deepEqual(L.cards[0], { id: 'a', side: 'left', open: true, folded: true, off: false, float: null });
  assert.deepEqual(L.cards[1].float, { x: 10, y: 0, w: 120, compact: false, z: 0, index: 0 }, 'every float field checked');
  assert.equal(L.cards[1].side, 'right'); assert.equal(L.cards[2].side, 'left'); assert.equal(L.cards[2].open, false, 'BASINS `closed` is read');
  for (const junk of [null, undefined, 'x', 3, [], { cards: 'no' }]) assert.deepEqual(readLayout(junk, known).cards, []);
  assert.match(layoutLabel(L, 2), /^2  ·  2 windows  ·  both racks  ·  1 floating  ·  \d\d:\d\d$/);
  pass('readLayout: the one shape, repaired; λWAVES and BASINS records read as they are; junk is an empty layout');
}
console.log(`\n${n} rack groups pass`);
