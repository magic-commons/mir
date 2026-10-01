/* core-frame.node.mjs — the one frame's laws, on a fake clock: reads before writes, latest-wins coalescing,
 * idle books nothing, a driven frame books no rAF, flush runs now, and the 32 ms floor. */
import assert from 'node:assert/strict';
import { createFrame } from '../mir/core/frame.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };

/* a fake rAF and a fake timer the test steps by hand */
function rig() {
  const rafs = new Map(), timers = new Map(); let id = 0, rafCalls = 0, timerCalls = 0;
  const counts = {};
  const f = createFrame({
    raf: (fn) => { rafCalls++; rafs.set(++id, fn); return id; }, caf: (h) => rafs.delete(h),
    setTimer: (fn) => { timerCalls++; timers.set(++id, fn); return id; }, clearTimer: (h) => timers.delete(h),
    now: () => 1000, count: (k, v = 1) => { counts[k] = (counts[k] || 0) + v; },
  });
  const frameNow = () => { const all = [...rafs.values()]; rafs.clear(); for (const fn of all) fn(16); };
  const timerNow = () => { const all = [...timers.values()]; timers.clear(); for (const fn of all) fn(); };
  return { f, rafs, timers, frameNow, timerNow, counts, get rafCalls() { return rafCalls; }, get timerCalls() { return timerCalls; } };
}

{
  const r = rig(), log = [];
  r.f.write(() => log.push('w1')); r.f.read(() => log.push('r1')); r.f.coalesce('k', () => log.push('j'));
  r.f.write(() => log.push('w2')); r.f.read(() => log.push('r2'));
  assert.equal(r.rafCalls, 1, 'five jobs book ONE frame');
  r.frameNow();
  assert.deepEqual(log, ['r1', 'r2', 'j', 'w1', 'w2']);
  pass('reads run before coalesced jobs, which run before writes; one rAF for the batch', log.join(' '));
}

{
  const r = rig(), seen = [];
  for (let i = 0; i < 10; i++) r.f.coalesce('drag', () => seen.push(i));
  r.f.coalesce('other', () => seen.push('o'));
  r.frameNow();
  assert.deepEqual(seen, [9, 'o']);
  pass('coalesce: the latest job per key wins, once per frame', JSON.stringify(seen));
}

{
  const r = rig();
  r.f.write(() => {}); r.frameNow();
  const s = r.f.state();
  assert.equal(s.scheduled, false); assert.equal(s.pending, 0); assert.equal(r.rafs.size, 0); assert.equal(r.timers.size, 0);
  pass('idle is zero work: an empty queue leaves no rAF and no timer booked');
}

{
  const r = rig(), log = [];
  r.f.write(() => { log.push('a'); r.f.read(() => log.push('b')); });
  r.frameNow();
  assert.deepEqual(log, ['a']); assert.equal(r.f.state().pending, 1); assert.equal(r.rafs.size, 1);
  r.frameNow();
  assert.deepEqual(log, ['a', 'b']); assert.equal(r.f.state().scheduled, false);
  pass('work queued during a batch runs in the NEXT frame, so a write that queues a read cannot spin');
}

{
  const r = rig(), log = [];
  r.f.coalesce('drag', () => log.push('final')); r.f.write(() => log.push('w'));
  assert.equal(r.f.flush('drag'), 1);
  assert.deepEqual(log, ['final']);
  assert.equal(r.f.state().pending, 1, 'flush(key) runs only that key');
  r.f.flush();
  assert.deepEqual(log, ['final', 'w']);
  assert.equal(r.f.state().scheduled, false); assert.equal(r.rafs.size, 0); assert.equal(r.timers.size, 0);
  pass('flush(key) runs one pending job now, flush() the whole queue, and both unbook the frame when it empties');
}

{
  const r = rig(), log = [];
  r.f.coalesce('drag', () => log.push('stale')); r.f.cancel('drag');
  assert.equal(r.f.state().scheduled, false); r.frameNow(); r.timerNow();
  assert.deepEqual(log, []);
  pass('cancel(key) drops a pending job and, with nothing left, unbooks the frame');
}

{
  const r = rig(), log = []; let kicks = 0;
  r.f.drive(() => { kicks++; });
  r.f.write(() => log.push('w')); r.f.read(() => log.push('r')); r.f.coalesce('k', () => log.push('j'));
  assert.equal(r.rafCalls, 0, 'a driven frame books no rAF');
  assert.equal(kicks, 1, 'and kicks the app loop once per frame, however much is queued');
  assert.equal(r.f.tick(5), 3);
  assert.deepEqual(log, ['r', 'j', 'w']);
  r.f.write(() => {}); assert.equal(kicks, 2);
  r.f.tick(); assert.equal(r.f.tick(), 0, 'an idle tick does nothing');
  assert.equal(r.rafCalls, 0);
  r.f.drive(null); r.f.write(() => {}); assert.equal(r.rafCalls, 1, 'drive(null) gives the frame its own rAF back');
  pass('tick-driven mode: the app loop runs the batch, the frame books no rAF of its own', `kicks ${kicks}`);
}

{
  const r = rig(), log = [];
  r.f.write(() => log.push('w'));
  r.timerNow();                                                     // rAF throttled: the 32 ms floor fires first
  assert.deepEqual(log, ['w']); assert.equal(r.rafs.size, 0, 'the floor disarms the rAF');
  assert.equal(r.counts.timers, 1); assert.equal(r.counts.frames, 1);
  r.f.write(() => log.push('w2')); r.frameNow();
  assert.equal(r.timers.size, 0, 'and the rAF disarms the floor');
  assert.equal(r.counts.timers, 1, 'a floor that did not run work is not counted');
  pass('the 32 ms floor: whichever of rAF and the timer fires first runs the batch and disarms the other', JSON.stringify(r.counts));
}

{
  const r = rig(), log = [];
  const err = console.error; const rep = globalThis.reportError; globalThis.reportError = () => {};
  r.f.write(() => { throw new Error('boom'); }); r.f.write(() => log.push('after'));
  r.frameNow(); globalThis.reportError = rep; console.error = err;
  assert.deepEqual(log, ['after']);
  pass('a throwing job is reported and does not wedge the batch');
}

console.log(`ALL ${n} MIR core frame laws passed`);
