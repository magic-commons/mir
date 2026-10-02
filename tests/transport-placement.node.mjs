/* transport-placement.node.mjs — the pure rules of the one bar that moves, the tempo field, the macro rail's keys, the
 * lego stack and the palette diamond (BASINS' numbers). */
import assert from 'node:assert/strict';
import { placementOf, tempoDirection, travelBpm, reorderTo, TRANSPORT } from '../mir/shell/transport.js';
import { stackedAt, withReserve, windowLayout } from '../mir/window/window.js';
import { stackPlan, WORKSPACE } from '../mir/window/workspaces.js';
import { paletteAt, MIR_PALETTE, PALETTE_STEP } from '../mir/shell/wordmark.js';

const groups = [];
const group = (name, fn) => { fn(); groups.push(name); console.log('PASS ' + name); };

group('placement: the rack wins, then a work lane that shows, else the stage (BASINS transport-placement.js)', () => {
  assert.equal(placementOf({ docked: true, host: {} }), 'rack');
  assert.equal(placementOf({ docked: false, host: {} }), 'work');
  assert.equal(placementOf({ docked: false, host: null }), 'stage');
});
group('the tempo panel opens toward the free side (BASINS positionTempo)', () => {
  assert.equal(tempoDirection({ top: 600, bottom: 652 }, 200, 900), 'below');      // 248 left below ≥ 216
  assert.equal(tempoDirection({ top: 700, bottom: 752 }, 200, 900), 'above');      // 148 below, 700 above
  assert.equal(tempoDirection({ top: 100, bottom: 152 }, 900, 900), 'below');      // too tall either way: more room below
});
group('the tempo field: 8 characters; the travel drag is the range over 220 px, a finger 320, Shift 1760', () => {
  assert.equal(TRANSPORT.fieldChars, 8);
  assert.equal(travelBpm(30, 22, { min: 20, max: 300 }), 58);
  assert.equal(travelBpm(30, 32, { touch: true, min: 20, max: 300 }), 58);
  assert.equal(travelBpm(30, 176, { shift: true, min: 20, max: 300 }), 58);
  assert.equal(travelBpm(290, 220, { min: 20, max: 300 }), 300);
});
group('the macro rail keys: ← → one place, ↑ ↓ a row of two, Home, End, clamped', () => {
  assert.equal(reorderTo('ArrowRight', 1, 4), 2); assert.equal(reorderTo('ArrowLeft', 0, 4), 0);
  assert.equal(reorderTo('ArrowDown', 1, 4), 3); assert.equal(reorderTo('ArrowUp', 1, 4), 0);
  assert.equal(reorderTo('Home', 3, 4), 0); assert.equal(reorderTo('End', 0, 4), 3); assert.equal(reorderTo('KeyA', 0, 4), -1);
});
group('the lego stack: 8 px above, left edges together, inside the screen; the band reserved; a floating window floors below it', () => {
  assert.equal(WORKSPACE.gap, 8);
  assert.deepEqual(stackedAt({ width: 600, height: 200 }, { left: 220, top: 360 }, { width: 1440, height: 900 }), { left: 220, top: 152 });
  assert.deepEqual(stackedAt({ width: 600, height: 400 }, { left: 1200, top: 100 }, { width: 1440, height: 900 }), { left: 832, top: 8 });
  assert.equal(stackPlan(true, true), true); assert.equal(stackPlan(true, false), false);
  assert.deepEqual(withReserve({ left: 8, right: 900, top: 8, bottom: 892 }, 208), { left: 8, right: 900, top: 216, bottom: 892 });
  assert.equal(withReserve(null, 50), null);
  const L = windowLayout({ x: 100, y: 40, w: 400, h: 300, dock: null, chipSide: 'left' }, { view: { width: 1440, height: 900 }, sizes: { vertical: { w: 62, h: 300 }, horizontal: { w: 300, h: 62 } }, top: 216 });
  assert.equal(L.box.top, 216);
});
group('the palette diamond: MIR\'s nine swatches, stepped exactly, every 240 ms (BASINS brand-motion.js)', () => {
  assert.equal(MIR_PALETTE.length, 9); assert.equal(PALETTE_STEP, 240);
  assert.equal(paletteAt(0, 0), '#f15b66'); assert.equal(paletteAt(0, 2), '#5bcfc2'); assert.equal(paletteAt(8, 1), '#f15b66');
});
console.log(`\n${groups.length} transport-placement groups pass`);
