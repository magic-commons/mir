/* core-perf.node.mjs — the meter: counters, the identical-write skip, snapshot and reset. */
import assert from 'node:assert/strict';
import { perf, setText, setVar, setAttr, rect, count, snapshot, reset } from '../mir/core/perf.js';
import { createFrame } from '../mir/core/frame.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };

/* a minimal element: text, an inline style and attributes, each counting its real mutations */
const fakeEl = () => {
  const props = new Map(), attrs = new Map(); let text = '';
  const el = { mutations: 0,
    get textContent() { return text; }, set textContent(v) { text = v; el.mutations++; },
    style: { getPropertyValue: (k) => props.get(k) ?? '', setProperty: (k, v) => { props.set(k, v); el.mutations++; }, removeProperty: (k) => { props.delete(k); el.mutations++; } },
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null), setAttribute: (k, v) => { attrs.set(k, v); el.mutations++; }, removeAttribute: (k) => { attrs.delete(k); el.mutations++; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }) };
  return el;
};

{
  reset();
  const el = fakeEl();
  for (let i = 0; i < 60; i++) setText(el, '0.50');                 // a modulated knob whose value did not change
  setText(el, 0.75);
  assert.equal(el.mutations, 2); assert.equal(el.textContent, '0.75');
  const s = snapshot();
  assert.equal(s.writes, 2); assert.equal(s.skipped, 59);
  pass('setText: sixty identical writes are one write and fifty-nine skips', JSON.stringify({ writes: s.writes, skipped: s.skipped }));
}

{
  reset();
  const el = fakeEl();
  setVar(el, '--turn', 0.25); setVar(el, '--turn', '0.25'); setVar(el, '--turn', 0.5);
  setVar(el, '--gone', null);                                        // removing what is not there is a skip
  setVar(el, '--turn', null); setVar(el, '--turn', null);
  setAttr(el, 'data-prox', 'near'); setAttr(el, 'data-prox', 'near'); setAttr(el, 'data-prox', null);
  assert.equal(el.mutations, 5);
  const s = snapshot();
  assert.equal(s.writes, 5); assert.equal(s.skipped, 4);
  pass('setVar / setAttr: only changes are written; null removes, once', `${s.writes} writes · ${s.skipped} skipped`);
}

{
  reset();
  rect(fakeEl()); rect(fakeEl()); count('timers'); count('frames', 3);
  const f = createFrame({ raf: (fn) => { fn(0); return 1; }, caf: () => {}, setTimer: () => 0, clearTimer: () => {} });
  f.write(() => {});                                                 // a real frame feeds the shared meter
  const s = snapshot();
  assert.equal(s.reads, 2); assert.equal(s.timers, 1); assert.equal(s.frames, 4);
  assert.ok(s.ms >= 0 && typeof s.longTasks === 'number');
  const z = reset();
  assert.deepEqual([z.writes, z.skipped, z.reads, z.frames, z.timers, z.longTasks], [0, 0, 0, 0, 0, 0]);
  assert.equal(perf.snapshot, snapshot, 'perf is the same API as the named exports');
  pass('counters: reads through rect(), frames and timers from the frame, snapshot() and reset()', JSON.stringify(s));
}

console.log(`ALL ${n} MIR core perf laws passed`);
