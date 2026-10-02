/* rack-leftovers.node.mjs — the pure part of BASINS' rack leftovers: retired ids and the notebook's size in readLayout,
 * the touch-tablet clamp, the scrollbar's seat and thumb, and COPY's text. */
import assert from 'node:assert/strict';
import { readLayout, clampFloatTablet, digestText, closedLayout } from '../mir/shell/rack.js';
import { scrollbarSeat, thumbOf } from '../mir/shell/rack-scrollbar.js';

let n = 0;
const pass = (name) => { n++; console.log(`PASS ${name}`); };

{
  const known = new Set(['scope', 'tone']), retired = { oldscope: 'scope' };
  let L = readLayout({ cards: [{ id: 'oldscope', side: 'L', closed: false }, { id: 'tone', side: 'R', closed: true }] }, known, retired);
  assert.deepEqual(L.cards.map((c) => [c.id, c.side, c.open]), [['scope', 'left', true], ['tone', 'right', false]]);
  L = readLayout({ cards: [{ id: 'oldscope', side: 'L' }, { id: 'scope', side: 'R', closed: false }] }, known, retired);
  assert.deepEqual(L.cards.map((c) => [c.id, c.side]), [['scope', 'right']], 'the heir named itself: the old record is dropped (BASINS)');
  assert.deepEqual(readLayout({ cards: [{ id: 'oldscope' }] }, known).cards, [], 'no retired map: an unknown id is dropped as before');
  assert.deepEqual(readLayout({ cards: [], nb: [500.4, 380] }).nb, [500, 380]);
  for (const bad of [[0, 300], ['x', 1], null, 'big']) assert.equal(readLayout({ cards: [], nb: bad }).nb, undefined);
  pass('readLayout: a retired id resolves to its heir unless the heir is named; nb is kept when it is a size');
}
{
  /* createRack({ persist: 'closed' }) — BASINS keeps only which windows are closed (and the phone rack shown) */
  const L = closedLayout([{ id: 'scope', side: 'left', open: true }, { id: 'tone', side: 'right', open: false }], { phoneShown: true, at: 1 });
  assert.deepEqual(L, { v: 1, at: 1, hidden: false, phoneShown: true, cards: [{ id: 'scope', side: 'left', open: true }, { id: 'tone', side: 'right', open: false }] });
  const back = readLayout(L, new Set(['scope', 'tone']));
  assert.deepEqual(back.cards.map((c) => [c.id, c.side, c.open, c.folded, c.float]), [['scope', 'left', true, false, null], ['tone', 'right', false, false, null]], 'it reads back with nothing the hand arranged');
  assert.equal(back.phoneShown, true); assert.equal(back.hidden, false);
  pass("closedLayout: persist 'closed' keeps the closed list and the phone rack, nothing else (BASINS)");
}
{
  const vv = { width: 1280, height: 800, top: 0, vh: 800 };
  assert.deepEqual(clampFloatTablet(1250, 780, 300, 200, vv), { x: 972, y: 592 }, 'the whole window inside, 8 px in');
  assert.deepEqual(clampFloatTablet(-50, -50, 300, 200, vv), { x: 8, y: 8 });
  assert.deepEqual(clampFloatTablet(100, 700, 300, 200, { ...vv, top: 100, vh: 500 }), { x: 100, y: 392 }, 'the visual viewport (a keyboard up) bounds it');
  pass('clampFloatTablet: BASINS\' touch-tablet clamp to the visual viewport');
}
{
  const rect = { left: 900, right: 1280, top: 0, bottom: 800 }, view = { width: 1280, height: 800 };
  assert.deepEqual(scrollbarSeat({ side: 'right', rect, gutter: 48, view, overflow: 100 }), { left: 944, top: 8, height: 784 });
  assert.deepEqual(scrollbarSeat({ side: 'left', rect: { left: 0, right: 380, top: 0, bottom: 600 }, gutter: 48, view, overflow: 1 }), { left: 324, top: 8, height: 584 });
  for (const off of [{ gutter: 0 }, { overflow: 0 }, { uiHidden: true }, { hidden: true }]) assert.equal(scrollbarSeat({ side: 'right', rect, gutter: 48, view, overflow: 100, ...off }), null);
  assert.deepEqual(thumbOf({ height: 400, client: 400, scrollHeight: 800, scrollTop: 400 }), { size: 200, top: 200, max: 400 });
  assert.equal(thumbOf({ height: 400, client: 10, scrollHeight: 10000, scrollTop: 0 }).size, 32, 'never shorter than 32 px');
  pass('scrollbar: BASINS\' seat (gutter − 8 / + gutter − 4, 8 px in), gone with no gutter / overflow / H / a hidden rack; the thumb');
}
{
  const at = new Date('2026-10-02T12:00:00Z');
  assert.equal(digestText({ name: 'BASINS REDUX', title: 'COLOUR', status: 'LIVE', rows: [['ITER', '512', ''], ['DEPTH', '1e-12', 'x']], at }),
    'BASINS REDUX · COLOUR · 2026-10-02T12:00:00.000Z\nstatus\tLIVE\nITER\t512\t\nDEPTH\t1e-12\tx');
  assert.equal(digestText({ title: 'MIX', at }), 'MIX · 2026-10-02T12:00:00.000Z', 'no name, no status: just the head');
  pass('digestText: BASINS\' COPY text');
}
console.log(`\n${n} rack leftovers groups pass`);
