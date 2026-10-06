/* controls.node.mjs — the general control set's pure part: the one knob law (the ⅛ gear on any modifier, on a virtual point), the stepper's
 * walk, the list pane's typeahead and placement, the number field's travel and parser, the range's bounds, and control()'s table.
 * The same controls under a real browser are tests/controls.browser.mjs. */
import assert from 'node:assert/strict';
import { setKnobLaw, dragTravel, fineHeld, gearOf, verticalDrag } from '../mir/kit.js';
import { stepTo } from '../mir/controls/stepper.js';
import { typeahead, placePane, liveItems } from '../mir/controls/select.js';
import { numberTravel, parseNumber, digitsOf, NUMBER } from '../mir/controls/number.js';
import { rangeBounds, nearestThumb } from '../mir/controls/range.js';
import { controlKind, KINDS } from '../mir/controls/factory.js';

let n = 0;
const pass = (name) => { n++; console.log(`PASS ${name}`); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

{
  const law = setKnobLaw();
  assert.equal(law.travel, 220); assert.equal(law.touchTravel, 320);
  assert.equal(law.fine, 8, 'Josh: the fine gear is an eighth'); assert.equal(law.keyFine, 1 / 8); assert.equal(law.faderFine, 8);
  assert.deepEqual(setKnobLaw(setKnobLaw()), law, 'setKnobLaw(setKnobLaw()) is the identity');
  pass('the shipped law: 220 px, 320 under a finger, and ONE gear of ⅛ for the drag, the fader and the arrow keys');
}
{
  for (const m of ['shiftKey', 'altKey', 'ctrlKey', 'metaKey']) assert.equal(fineHeld({ [m]: true }, 1), true, m + ' engages the gear');
  assert.equal(fineHeld({}, 1), false); assert.equal(gearOf({}, 1), 1); assert.equal(gearOf({ shiftKey: true }, 1), 1 / 8); assert.equal(gearOf({ altKey: true }, 1, 4), 1 / 4);
  assert.equal(dragTravel({}), 220); assert.equal(dragTravel({}, { touch: true }), 320);
  assert.equal(dragTravel({ shiftKey: true }), 1760); assert.equal(dragTravel({ metaKey: true }), 1760, 'any modifier, not Shift alone');
  pass('any modifier engages the ⅛ gear (Shift, Alt, Ctrl, Meta); dragTravel is 220 · 320 · 1760');
}
{
  /* the virtual point: a gear change moves nothing, and the rest of the drag is an eighth */
  const d = verticalDrag({ pointerId: 7, pointerType: 'mouse', clientX: 100, clientY: 300 });
  let p = d.move({ clientX: 100, clientY: 190 });                     // 110 px up at gear 1
  assert.ok(near(p, 110 / 220), 'a full gear moves 110/220');
  const before = p;
  p = d.move({ shiftKey: true, clientX: 100, clientY: 190 });         // the same place, the gear engaged: nothing moves
  assert.equal(p, before, 'engaging the gear moves nothing');
  p = d.move({ shiftKey: true, clientX: 100, clientY: 110 });         // 80 px up under the gear
  assert.ok(near(p, before + 80 / 220 / 8), 'then an eighth');
  const q = p;
  p = d.move({ clientX: 100, clientY: 110 });                         // the gear released at the same place: nothing moves
  assert.equal(p, q, 'leaving the gear moves nothing');
  p = d.move({ clientX: 400, clientY: 110 });                         // sideways is ignored
  assert.equal(p, q, 'the drag is vertical: dx is ignored');
  const s = verticalDrag({ pointerId: 7, pointerType: 'mouse', clientX: 0, clientY: 0 }, { axis: 'sum' });
  assert.ok(near(s.move({ clientX: 22, clientY: 0 }), 0.1), 'the 1.4 law (sum) is opt-in');
  const t = verticalDrag({ pointerId: 8, pointerType: 'touch', clientX: 0, clientY: 100 });
  assert.ok(near(t.move({ clientX: 0, clientY: 0 }), 100 / 320), 'a finger travels 320 px');
  pass('verticalDrag: a virtual point (the gear and its release move nothing), vertical only, 320 px under a finger, the 1.4 sum law opt-in');
}
{
  const items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B', coming: true }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }];
  assert.equal(stepTo(items, 'a', 1), 'c', 'a coming item is skipped'); assert.equal(stepTo(items, 'd', 1), 'a', 'wraps');
  assert.equal(stepTo(items, 'a', -1), 'd'); assert.equal(stepTo(items, 'd', 1, false), null, 'no wrap: the end is the end');
  assert.equal(stepTo(items, 'zz', 1), 'a', 'an unknown id steps in from the start'); assert.equal(stepTo(items, 'zz', -1), 'd');
  assert.equal(stepTo([{ id: 'x', label: 'X' }, { id: 'y', label: 'Y', coming: true }], 'x', 1), null, 'nothing else to reach');
  assert.deepEqual(liveItems(items).map((i) => i.id), ['a', 'c', 'd']);
  pass('the stepper walks the live items, wraps, skips coming, and stands down when nothing else can be reached');
}
{
  const items = [{ label: 'OVERLAY' }, { label: 'SCREEN' }, { label: 'SOFT LIGHT', coming: true }, { label: 'SOFT EDGE' }];
  assert.equal(typeahead(items, 0, 's'), 1); assert.equal(typeahead(items, 1, 's'), 3, 'a coming item is not typed to'); assert.equal(typeahead(items, 3, 's'), 1, 'wraps');
  assert.equal(typeahead(items, 0, 'so'), 3); assert.equal(typeahead(items, 0, 'zz'), -1); assert.equal(typeahead(items, 0, ''), -1);
  const view = { w: 1000, h: 800 };
  let at = placePane({ top: 100, bottom: 140, left: 50, width: 120 }, { w: 200, h: 300 }, view);
  assert.equal(at.down, true); assert.equal(at.top, 144); assert.equal(at.left, 50); assert.equal(at.minWidth, 120);
  at = placePane({ top: 700, bottom: 740, left: 50, width: 120 }, { w: 200, h: 300 }, view);
  assert.equal(at.down, false, 'no room below: above'); assert.ok(at.top + 300 <= 700, 'ends above the anchor');
  at = placePane({ top: 100, bottom: 140, left: 950, width: 80 }, { w: 200, h: 100 }, view);
  assert.ok(at.left + 200 <= 1000 - 8 + 1e-9, 'clamped to the right edge');
  at = placePane({ top: 100, bottom: 140, left: 50, width: 120 }, { w: 200, h: 5000 }, view);
  assert.ok(at.maxHeight <= 800, 'a long list scrolls inside the viewport');
  pass('the list pane: typeahead skips coming items and wraps; placement is below, else above, clamped to the viewport');
}
{
  assert.equal(parseNumber('12,5'), 12.5); assert.equal(parseNumber(' 7 '), 7); assert.equal(parseNumber('abc'), null); assert.equal(parseNumber(''), null); assert.equal(parseNumber(null), null);
  assert.equal(digitsOf(1), 0); assert.equal(digitsOf(0.5), 1); assert.equal(digitsOf(0.25), 2); assert.equal(digitsOf(0), 0);
  assert.equal(NUMBER.chars, 8);
  assert.equal(numberTravel(50, 0.5, { min: 0, max: 100 }), 100, 'half the range is 50, and it clamps at 100'); assert.equal(numberTravel(10, -1, { min: 0, max: 100 }), 0);
  assert.equal(numberTravel(10, 0.1, { min: 0, max: 100, step: 5 }), 20, 'rounded to the step');
  assert.equal(numberTravel(0, 0.1, { step: 1 }), 10, 'no range: a hundred steps per full travel');
  assert.equal(numberTravel(30, 0.01, { min: 20, max: 300, round: (v) => Math.round(v * 10) / 10 }), 32.8, 'the tempo field’s tenth, through `round`');
  pass('the number field: the typed text (comma = point), the digits of a step, the travel clamped and rounded');
}
{
  const lo = rangeBounds('lo', 0.2, 0.8, { min: 0, max: 1, minGap: 0.1 }), hi = rangeBounds('hi', 0.2, 0.8, { min: 0, max: 1, minGap: 0.1 });
  assert.ok(lo[0] === 0 && near(lo[1], 0.7), 'lo stops a gap under hi'); assert.ok(near(hi[0], 0.3) && hi[1] === 1, 'hi stops a gap over lo');
  assert.equal(nearestThumb(0.1, 0.2, 0.8), 'lo'); assert.equal(nearestThumb(0.9, 0.2, 0.8), 'hi'); assert.equal(nearestThumb(0.45, 0.2, 0.8), 'lo');
  assert.equal(nearestThumb(0.6, 0.5, 0.5), 'hi', 'a tie goes to the side of the press'); assert.equal(nearestThumb(0.4, 0.5, 0.5), 'lo');
  pass('the range: each thumb stops at the other (less the gap); a press goes to the nearest thumb');
}
{
  const opts = (k) => Array.from({ length: k }, (_, i) => ({ id: 'o' + i, label: 'OPTION ' + i }));
  const cases = [
    [{ id: 'on', value: true }, 'switch'], [{ id: 'on', type: 'boolean' }, 'switch'],
    [{ id: 'm', options: opts(3), value: 'o0' }, 'segment'], [{ id: 'm', options: opts(4) }, 'segment'],
    [{ id: 'b', options: opts(12) }, 'stepper'], [{ id: 'b', options: opts(5) }, 'stepper'],
    [{ id: 'p', options: opts(5), list: true }, 'select'], [{ id: 'p', options: opts(5), ordered: false }, 'select'], [{ id: 'p', options: opts(40) }, 'select'],
    [{ id: 'm', options: [{ id: 'a', label: 'A VERY LONG LABEL THAT WILL NOT FIT IN A SEGMENT' }, { id: 'b', label: 'B' }] }, 'select'],
    [{ id: 'g', min: 0, max: 1, value: 0.5 }, 'knob'], [{ id: 'h', min: 0, max: 360, wrap: true }, 'arc'], [{ id: 'h', min: 0, max: 1, hue: true }, 'arc'], [{ id: 'a', min: 0, max: 360, angle: true }, 'arc'],
    [{ id: 'f', min: 0.25, max: 8, log: true, principal: true }, 'lane'],
    [{ id: 'pan', pair: [{ min: 0, max: 1 }, { min: 0, max: 1 }] }, 'xy'],
    [{ id: 'w', type: 'range', min: 0, max: 1, value: [0.2, 0.8] }, 'range'], [{ id: 'w', min: 0, max: 1, value: [0, 1] }, 'range'],
    [{ id: 'c', colour: true, value: [1, 0, 0] }, 'swatch'],
    [{ id: 'n', value: 12 }, 'number'], [{ id: 'n', min: 0, step: 1 }, 'number'], [{ id: 'n', min: 0, max: Infinity }, 'number']
  ];
  for (const [d, kind] of cases) assert.equal(controlKind(d), kind, JSON.stringify(d).slice(0, 80));
  assert.deepEqual([...new Set(cases.map((c) => c[1]))].sort(), [...KINDS].sort(), 'every kind is reached');
  pass('control(): ' + cases.length + ' descriptors choose the kind the table says, and every kind is reached');
}
console.log(`${n} PASS (controls.node)`);
