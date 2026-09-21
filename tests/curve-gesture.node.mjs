import assert from 'node:assert/strict';
import {
  CURVE_GESTURES, svgPoint, curveHit, curveAction, pointDrag, pointAddValue,
  tensionDelta, editablePresetForWave
} from '../mir/modulation/curve-gesture.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };

{
  const svg = {
    viewBox: { baseVal: { x: 10, y: 20, width: 200, height: 100 } },
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 400, height: 200 })
  };
  assert.deepEqual(svgPoint(svg, { clientX: 300, clientY: 150 }), { x: 110, y: 70 });
  pass('1.4.2 pointer coordinates are transformed into the SVG viewBox', 'a 2× CSS resize lands on 110,70');
}

{
  const hit = curveHit({ x: 100, y: 50 }, [{ x: 84, y: 50, i: 2 }], [{ x: 101, y: 50, i: 3 }], 20);
  assert.deepEqual(hit, { kind: 'handle', i: 3, d: 1 });
  pass('the nearest visible tension handle wins over a farther point');
}

{
  const empty = { kind: null }, point = { kind: 'point' }, handle = { kind: 'handle' };
  assert.equal(curveAction({ button: 2 }, empty), 'add-point');
  assert.equal(curveAction({ button: 0 }, empty), null);
  assert.equal(curveAction({ button: 0 }, point), 'move-point');
  assert.equal(curveAction({ button: 0, altKey: true }, point), 'remove-point');
  assert.equal(curveAction({ button: 0 }, handle), 'move-tension');
  assert.equal(curveAction({ button: 2 }, handle), 'reset-tension');
  assert.equal(curveAction({ button: 2 }, point), 'point-menu');
  pass('the FL gesture matrix is exact', Object.values(CURVE_GESTURES).join(' · '));
}

{
  const start = { x: 0.25, y: 0.8 }, at = { x: 0.7, y: 0.2 };
  assert.deepEqual(pointDrag(start, at, { shiftKey: true, ctrlKey: false }), { x: 0.7, y: 0.8 });
  assert.deepEqual(pointDrag(start, at, { shiftKey: false, ctrlKey: true }), { x: 0.25, y: 0.2 });
  assert.equal(tensionDelta(20, 100, { ctrlKey: false }), 80);
  assert.equal(tensionDelta(20, 100, { ctrlKey: true }), 10);
  assert.equal(pointAddValue({ shiftKey: false }, 0.2, 0.65), 0.2);
  assert.equal(pointAddValue({ shiftKey: true }, 0.2, 0.65), 0.65);
  pass('Shift/Ctrl point locks, Shift-right level preservation and Ctrl-fine tension keep their axes');
}

{
  assert.deepEqual(['rotate', 'sine', 'tri', 'sawdown', 'square'].map(editablePresetForWave),
    ['sawup', 'sine', 'tri', 'sawdown', 'square']);
  assert.equal(editablePresetForWave('sh'), null);
  assert.equal(editablePresetForWave('drift'), null);
  pass('deterministic analytic waves materialize without a preset-selection gate');
}

console.log(`ALL ${n} MIR curve-gesture laws passed`);
