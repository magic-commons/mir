// The colour controls' pure parts (mir/controls/): the swatch's colour maths, the fine gear's decision, the double-tap.
// The hand on the real controls is tests/controls-colour.browser.mjs.
import assert from 'node:assert/strict';
import { rgbToHsv, hsvToRgb, rgbCss, SWATCH } from '../mir/controls/swatch.js';
import { fineHeld, fineGain, tapHome, TAP, lawNow } from '../mir/controls/gesture.js';
import { ARC } from '../mir/controls/arc.js';

/* hsv ↔ rgb round-trips over a grid (greys have no hue: only the value must come back) */
let worst = 0;
for (let r = 0; r <= 1; r += 0.125) for (let g = 0; g <= 1; g += 0.125) for (let b = 0; b <= 1; b += 0.125) {
  const [h, s, v] = rgbToHsv([r, g, b]), back = hsvToRgb(h, s, v);
  for (let i = 0; i < 3; i++) worst = Math.max(worst, Math.abs(back[i] - [r, g, b][i]));
}
assert.ok(worst < 1e-12, 'hsv round trip: ' + worst);
assert.deepEqual(rgbToHsv([1, 0, 0]).map((x) => +x.toFixed(6)), [0, 1, 1]);
assert.ok(Math.abs(rgbToHsv([0, 1, 0])[0] - 1 / 3) < 1e-12 && Math.abs(rgbToHsv([0, 0, 1])[0] - 2 / 3) < 1e-12, 'green is a third, blue two thirds');
assert.equal(rgbCss([1, 0.5, 0]), 'rgb(255 127.5 0)');
assert.deepEqual(hsvToRgb(1.25, 1, 1).map((x) => +x.toFixed(6)), hsvToRgb(0.25, 1, 1).map((x) => +x.toFixed(6)), 'a hue past 1 wraps');
assert.equal(SWATCH.ARM, 8); assert.equal(SWATCH.TRAVEL, 220);

/* the fine gear: any modifier gears the hand down by the kit's one divisor; none leaves it 1 */
const law = lawNow();
assert.ok(law.fine > 1 && law.travel > 0 && law.touchTravel > 0, 'the kit law is readable');
assert.equal(fineGain({}, 1), 1);
for (const m of ['shiftKey', 'altKey', 'ctrlKey', 'metaKey']) { assert.ok(fineHeld({ [m]: true }, 1), m); assert.equal(fineGain({ [m]: true }, 1), 1 / law.fine); }
assert.equal(fineGain({ shiftKey: true }, 1, 8), 1 / 8, 'a control\'s own divisor wins');

/* the double-tap: two presses within 300 ms and 14 px; the second takes home, a third starts afresh */
let homes = 0;
const tap = tapHome(() => { homes++; });
assert.equal(TAP.ms, 300); assert.equal(TAP.px, 14);
assert.equal(tap({ clientX: 10, clientY: 10 }), false);
assert.equal(tap({ clientX: 18, clientY: 12 }), true); assert.equal(homes, 1);
assert.equal(tap({ clientX: 18, clientY: 12 }), false, 'the press after a home is a first press again');
assert.equal(tap({ clientX: 100, clientY: 100 }), false, 'a second press 80 px away is not a double-tap');

/* ONE LAW (Josh, 2026-10-07, call 20: "300ms"): kit.js tapWatcher IS tapHome, on the one TAP; on a clock: 290 ms is a home,
   330 ms is not; 20 px apart is not; a caller that hands no event is timed only */
{
  const { tapWatcher, TAP: KT } = await import('../mir/kit.js');
  assert.equal(tapWatcher, tapHome, 'tapHome is the kit\'s tapWatcher, not a second law');
  assert.equal(KT, TAP, 'one TAP object');
  const realNow = performance.now; let T = 1000, n = 0;
  performance.now = () => T;
  try {
    const w = tapWatcher(() => { n++; });
    const at = (dt, x = 50, y = 50) => { T += dt; return w({ clientX: x, clientY: y }); };
    assert.equal(at(0), false); assert.equal(at(290), true, '290 ms in place is a double-tap'); assert.equal(n, 1);
    assert.equal(at(1000), false); assert.equal(at(330), false, '330 ms is not a double-tap');
    assert.equal(at(1000), false); assert.equal(at(310), false, '310 ms is not a double-tap any more (it was under 320)');
    assert.equal(at(1000), false); assert.equal(at(200, 70, 50), false, '20 px away is not a double-tap');
    T += 1000; w(); T += 290; assert.equal(w(), true, 'no event: the time alone decides'); assert.equal(n, 2);
  } finally { performance.now = realNow; }
}

/* the arc's geometry: a 60° gap at the bottom of a bounded arc */
assert.equal(ARC.SWEEP, 300); assert.equal(ARC.DEAD, 7); assert.equal(ARC.NEAR, 34); assert.equal(ARC.FLOOR, 0.15);
console.log('PASS controls-colour (node): hsv round trip, the fine gear, the double-tap, the arc numbers');
