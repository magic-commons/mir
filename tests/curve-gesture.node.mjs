import assert from 'node:assert/strict';
import {
  CURVE_GESTURES, svgPoint, curveHit, curveAction, pointDrag, pointAddValue,
  tensionDelta, editablePresetForWave, fineGear, CURVE_FINE
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
  assert.equal(curveAction({ type: 'dblclick', button: 0 }, handle), 'reset-tension');
  assert.equal(curveAction({ type: 'dblclick', button: 0 }, point), null);
  assert.equal(curveAction({ type: 'dblclick', button: 0 }, empty), null);
  assert.equal(curveAction({ button: 2 }, point), 'point-menu');
  pass('the FL gesture matrix is exact', Object.values(CURVE_GESTURES).join(' · '));
}

{
  /* THE HANDS (1.5.6-alpha.23): Shift is the fine gear (⅛) on a point and a tension; Ctrl locks a point's time; the value lock is retired */
  const start = { x: 0.25, y: 0.8 }, at = { x: 0.7, y: 0.2 };
  assert.equal(CURVE_FINE, 8);
  assert.deepEqual(pointDrag(start, at, { shiftKey: true, ctrlKey: false }), { x: 0.7, y: 0.2 }, 'Shift no longer locks the value');
  assert.deepEqual(pointDrag(start, at, { shiftKey: false, ctrlKey: true }), { x: 0.25, y: 0.2 }, 'Ctrl locks the time');
  assert.equal(tensionDelta(20, 100, { ctrlKey: true }), 80, 'Ctrl is no longer the tension’s fine key');
  assert.equal(tensionDelta(20, 100, { shiftKey: true }), 10, 'Shift is');
  assert.equal(pointAddValue({ shiftKey: false }, 0.2, 0.65), 0.2);
  assert.equal(pointAddValue({ shiftKey: true }, 0.2, 0.65), 0.65);
  // the gear: motion since the last step, ⅛ while Shift is held; pressing or releasing Shift mid-drag never jumps
  const g = fineGear({ x: 0, y: 0 });
  assert.deepEqual(g.step({ x: 8, y: 16 }, {}), { x: 8, y: 16 });
  assert.deepEqual(g.step({ x: 16, y: 32 }, { shiftKey: true }), { x: 9, y: 18 });
  assert.deepEqual(g.step({ x: 16, y: 32 }, {}), { x: 9, y: 18 }, 'releasing Shift does not jump');
  assert.deepEqual(g.step({ x: 24, y: 40 }, {}), { x: 17, y: 26 });
  const p = fineGear({ x: 10, y: 10 });
  assert.deepEqual(pointDrag({ x: 10, y: 10 }, { x: 26, y: 50 }, { shiftKey: true }, p), { x: 12, y: 15 }, 'a point at ⅛ with its gear');
  assert.deepEqual(pointDrag({ x: 10, y: 10 }, { x: 34, y: 50 }, { ctrlKey: true }, p), { x: 10, y: 15 }, 'Ctrl keeps the time while the gear runs');
  const tg = fineGear({ x: 0, y: 20 });
  assert.equal(tensionDelta(20, 36, { shiftKey: true }, tg), 2); assert.equal(tensionDelta(20, 46, {}, tg), 12, 'the tension geared step by step');
  pass('Shift is the fine gear (⅛, no jump), Ctrl locks time, Shift-right level preservation');
}

{
  assert.deepEqual(['rotate', 'sine', 'tri', 'sawdown', 'square'].map(editablePresetForWave),
    ['sawup', 'sine', 'tri', 'sawdown', 'square']);
  assert.equal(editablePresetForWave('sh'), null);
  assert.equal(editablePresetForWave('drift'), null);
  pass('deterministic analytic waves materialize without a preset-selection gate');
}

console.log(`ALL ${n} MIR curve-gesture laws passed`);
