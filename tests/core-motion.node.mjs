/* core-motion.node.mjs — what of the motion primitive runs without a page: the policy, the token parse, and
 * sequence() on fake animations (ordering, cancellation, no timers). */
import assert from 'node:assert/strict';
import { resolvePolicy, motionPolicy, setMotionPolicy, parseDuration, motionToken, MOTION, sequence } from '../mir/core/motion.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };

{
  assert.equal(resolvePolicy('auto', false), 'full'); assert.equal(resolvePolicy('auto', true), 'reduced');
  assert.equal(resolvePolicy('off', false), 'off'); assert.equal(resolvePolicy('full', true), 'full', 'the app\'s own MOTION setting may override');
  assert.equal(resolvePolicy('reduced', false), 'reduced'); assert.equal(resolvePolicy('nonsense', true), 'reduced', 'anything else is auto');
  assert.equal(motionPolicy(), 'full', 'no matchMedia under node: auto is full');
  assert.equal(setMotionPolicy('off'), 'off'); assert.equal(motionPolicy(), 'off');
  assert.equal(setMotionPolicy('bogus'), 'full'); assert.equal(setMotionPolicy('auto'), 'full');
  pass('policy: the app\'s setting wins, auto follows the OS, anything unknown is auto');
}

{
  assert.equal(parseDuration('160ms', 0), 160); assert.equal(parseDuration('.32s', 0), 320); assert.equal(parseDuration(' 80ms ', 0), 80);
  assert.equal(parseDuration('0ms', 5), 0); assert.equal(parseDuration('', 7), 7); assert.equal(parseDuration('fast', 7), 7); assert.equal(parseDuration(40, 7), 40);
  assert.equal(motionToken('ui'), MOTION.ui); assert.equal(motionToken('structural'), 320); assert.equal(motionToken('out'), MOTION.out);
  pass('tokens: CSS durations parse in ms or s; without a page the fallbacks are the same numbers as core.css', `${MOTION.micro}/${MOTION.ui}/${MOTION.structural} ms`);
}

/* a fake Animation: finished settles when the test says, cancel() rejects it like WAAPI does */
const fake = (log, name) => {
  let res, rej; const a = { name, cancelled: false, finished: new Promise((r, j) => { res = r; rej = j; }) };
  a.finish = () => res(a); a.cancel = () => { if (a.cancelled) return; a.cancelled = true; log.push('cancel ' + name); rej(Object.assign(new Error('abort'), { name: 'AbortError' })); };
  log.push('start ' + name); return a;
};
const tick = () => new Promise((r) => setImmediate(r));

{
  const log = [], anims = {};
  const seq = sequence([() => (anims.out = fake(log, 'out')), () => { log.push('seat'); }, () => (anims.in = fake(log, 'in'))]);
  await tick(); assert.deepEqual(log, ['start out'], 'the second step waits for the first to finish');
  anims.out.finish(); await tick();
  assert.deepEqual(log, ['start out', 'seat', 'start in']);
  anims.in.finish();
  assert.equal(await seq.finished, true);
  pass('sequence: each step waits on the last one\'s finished, a step may return nothing', log.join(' · '));
}

{
  const log = [], anims = {};
  const seq = sequence([() => (anims.out = fake(log, 'out')), () => (anims.in = fake(log, 'in'))]);
  await tick(); seq.cancel(); seq.cancel();
  assert.equal(await seq.finished, false);
  await tick();
  assert.deepEqual(log, ['start out', 'cancel out'], 'cancel stops the running animation once, and no later step runs');
  pass('sequence: cancel mid-step stops the animation and ends the sequence false');
}

{
  const log = [], anims = {};
  const seq = sequence([() => (anims.out = fake(log, 'out')), () => (anims.in = fake(log, 'in'))]);
  await tick(); anims.out.cancel();                                  // someone else cancels the animation
  assert.equal(await seq.finished, false); assert.equal(anims.in, undefined);
  pass('sequence: an animation cancelled from outside ends the sequence instead of hanging it (no fallback timer needed)');
}

{
  const log = []; let release;
  const seq = sequence([() => new Promise((r) => { release = r; }), () => { log.push('second'); }]);
  await tick(); seq.cancel(); release(); assert.equal(await seq.finished, false);
  assert.deepEqual(log, [], 'a promise step that resolves after cancel does not let the next step run');
  const before = setTimeout; let timers = 0; globalThis.setTimeout = (...a) => { timers++; return before(...a); };
  const s2 = sequence([() => Promise.resolve(), () => Promise.resolve()]); await s2.finished; globalThis.setTimeout = before;
  assert.equal(timers, 0, 'sequence books no timer');
  pass('sequence: promise steps obey cancel, and the whole thing uses no timers');
}

console.log(`ALL ${n} MIR core motion laws passed`);
