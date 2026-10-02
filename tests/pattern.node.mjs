/* pattern.node.mjs — the pattern model and sequencer against the kit's real modulation model (ported whole from BASINS
 * tools/test-pattern-sequencer.mjs, its assertions unchanged): crossings per tick, velocity, length, seek reset,
 * clip-over-row precedence, the stopped law, gate release, one hit per lit step, step-size independence, the project
 * seam and undo on the app's one stack. */
import assert from 'node:assert/strict';
import * as M from '../mir/modulation/mod.js';
import { stepCrossings, createPatternSequencer } from '../mir/pattern/sequencer.js';
import { createPatternModel, patternProjectPart, STEP_BEATS } from '../mir/pattern/model.js';
import { createTimelineModel } from '../mir/timeline/model.js';
import { clipKinds } from '../mir/timeline/kinds.js';
import { createHistory } from '../mir/history/history.js';
import { createProjectParts } from '../mir/core/project.js';

let pass = 0;
const ok = (cond, label, ev) => { assert.ok(cond, label + (ev === undefined ? '' : ' ' + JSON.stringify(ev))); pass++; };

assert.ok(clipKinds().includes('pattern'), 'the timeline registers the pattern kind');

/* ── the crossing law, pure ── */
assert.deepEqual(stepCrossings(0, 0.25), [0]); assert.deepEqual(stepCrossings(0, 0.2501), [0, 1]);
assert.deepEqual(stepCrossings(0.25, 0.5), [1]); assert.deepEqual(stepCrossings(0.1, 0.2), []); assert.deepEqual(stepCrossings(1, 1), []);
{ // any partition of [0, 8) visits every one of the 32 boundaries exactly once
  let p = 0, seen = []; const cuts = [0.013, 0.25, 0.2500000001, 0.6, 1.0, 1.1, 3.75, 4, 5.999999999, 7.3, 8];
  for (const c of cuts) { seen.push(...stepCrossings(p, c)); p = c; }
  ok(seen.length === 32 && seen.every((k, i) => k === i), 'a partition of 8 beats crosses 32 boundaries once each, in order', seen.length);
}

/* ── a rack: one ENV, its OUT on macro 1, transport free at 120 BPM ── */
function rig({ bpm = 120 } = {}) {
  M.modReset();
  M.setTransport({ bpm, sync: 'free' });
  const env = M.addSource('env', { a: 0, hold: 0, d: 0.2, s: 0, r: 0.05 });
  const m1 = M.macroList()[0]; M.setMacro(m1.id, { sourceId: env.id });
  const clock = { playing: true, applied: 0, isPlaying() { return this.playing; }, isRunning() { return this.playing; }, applyAll() { this.applied++; return 0; } };
  const model = createPatternModel(), timeline = createTimelineModel();
  const seq = createPatternSequencer({ M, clock, pattern: model, timeline });
  seq.reset(0);
  // one tick: the clock advances the model, then the sequencer reads the crossing (modulation.js's order)
  const tick = (dt) => { if (clock.playing) M.advance(dt); return seq.tick(); };
  return { env, m1, clock, model, timeline, seq, tick };
}
const runTo = (r, beat, dt) => { const log = []; while (M.transport.beats < beat - 1e-12) { const before = r.env.fires; r.tick(Math.min(dt, (beat - M.transport.beats) * 60 / M.transport.bpm)); if (r.env.fires !== before) log.push(+M.transport.beats.toFixed(6)); } return log; };

{ // crossings per tick across a boundary: FILL EACH 4 = one hit per beat, at the tick that crosses it
  const r = rig(); r.model.fill(r.env.id, 4); r.model.setLive(r.env.id, true);
  const dt = 1 / 60;                                   // 1/30 beat per tick at 120 BPM
  r.tick(dt); ok(r.env.fires === 1, 'the first tick fires step 0 at beat 0', r.env.fires);
  runTo(r, 1 - 1e-6, dt); ok(r.env.fires === 1, 'nothing more before the next lit boundary', r.env.fires);
  const log = runTo(r, 8, dt);
  ok(r.env.fires === 8, 'two bars of FILL EACH 4 fire 8 hits', r.env.fires);
  ok(log.every((b, i) => b >= i + 1 && b < i + 1 + 1 / 30 + 1e-9), 'each hit lands on the tick that crosses its beat', log);
}
{ // velocity scales the ENV's output on its macro
  const r = rig(); r.model.setStep(r.env.id, 0, 64); r.model.setLive(r.env.id, true);
  r.tick(1 / 60);
  const m = M.macroOf(r.m1.id), s = M.sourceOf(r.env.id);
  ok(r.env.fires === 1 && s.out > 0.9, 'the hit fired with attack 0', { fires: r.env.fires, out: s.out });
  ok(Math.abs(m.value - s.out * 64 / 127) < 1e-12, 'the macro carries out × 64/127', { value: m.value, out: s.out });
  r.tick(1 / 60);
  ok(Math.abs(M.macroOf(r.m1.id).value - s.out * 64 / 127) < 1e-12 && r.clock.applied >= 2, 'it stays scaled tick after tick and the clock re-applies', { value: M.macroOf(r.m1.id).value, applied: r.clock.applied });
  M.trigger(r.env.id); M.advance(1 / 60); r.seq.tick();
  ok(Math.abs(M.macroOf(r.m1.id).value - s.out) < 1e-12, 'a hand trigger is full strength again', { value: M.macroOf(r.m1.id).value, out: s.out });
}
{ // length 32: steps 0 and 16 → beats 0, 4, 8, 12 over 16 beats
  const r = rig(); r.model.setLength(r.env.id, 32); r.model.setStep(r.env.id, 0, 127); r.model.setStep(r.env.id, 16, 127); r.model.setLive(r.env.id, true);
  const log = [M.transport.beats]; r.tick(1 / 60); log.push(...runTo(r, 16, 1 / 60));
  ok(r.env.fires === 4, 'length 32 loops every 8 beats: 4 hits in 16', r.env.fires);
  ok(r.model.setStep(r.env.id, 40, 127) === false, 'a step past the length is refused');
}
{ // seek reset: a forward jump fires nothing; the next boundary fires on time
  const r = rig(); r.model.fill(r.env.id, 1); r.model.setLive(r.env.id, true);
  runTo(r, 1, 1 / 60); const f0 = r.env.fires;      // every step lit: 4 per beat
  ok(f0 === 4, 'every step lit: four hits per beat', f0);
  M.setTransport({ beats: 5.1 }); r.tick(1 / 60);
  ok(r.env.fires === f0, 'a forward seek of 4.1 beats is not a burst', { before: f0, after: r.env.fires });
  runTo(r, 5.26, 1 / 60); ok(r.env.fires === f0 + 1, 'the first boundary after the seek fires', r.env.fires);
  M.setTransport({ beats: 2 }); r.seq.reset(2); r.tick(1 / 60);
  ok(r.env.fires === f0 + 2, 'an explicit reset onto a boundary fires that step once on the next tick', r.env.fires);
  M.setTransport({ beats: 0.5 }); r.tick(1 / 60);
  ok(r.env.fires === f0 + 2, 'a backwards jump without a reset fires nothing', r.env.fires);
}
{ // stopped: nothing fires, and the memory follows the beat
  const r = rig(); r.model.fill(r.env.id, 1); r.model.setLive(r.env.id, true);
  r.clock.playing = false; M.advance(1); r.tick(0); M.advance(1); r.tick(0);
  ok(r.env.fires === 0, 'nothing fires while the transport is stopped', r.env.fires);
  r.clock.playing = true; r.model.setLive(r.env.id, false); runTo(r, 3, 1 / 60);
  ok(r.env.fires === 0, 'nothing fires while PATT is off', r.env.fires);
}
{ // gate mode: released at the step's end
  const r = rig(); M.setSource(r.env.id, { gateMode: 'gate' }); r.model.setStep(r.env.id, 0, 127); r.model.setLive(r.env.id, true);
  r.tick(1 / 60); ok(M.sourceOf(r.env.id).gate === true, 'a gate ENV holds after its step fires');
  runTo(r, 0.26, 1 / 60); ok(M.sourceOf(r.env.id).gate === false && r.seq.stats().releases === 1, 'and lets go at the step end', r.seq.stats());
}
{ // ONE HIT PER LIT STEP (Josh, 2026-10-01): a lit step fires its ENV once, at its beat, whatever the tick rate; the ENV is one-shot
  const lit = [0, 5, 6, 15], hitsAt = (dt) => { const r = rig(); for (const k of lit) r.model.setStep(r.env.id, k, 127); r.model.setLive(r.env.id, true);
    const log = []; let f = r.env.fires; r.tick(dt); if (r.env.fires !== f) log.push(0);
    while (M.transport.beats < 8 - 1e-12) { f = r.env.fires; r.tick(Math.min(dt, (8 - M.transport.beats) * 60 / M.transport.bpm)); for (let n = f; n < r.env.fires; n++) log.push(+M.transport.beats.toFixed(6)); }
    return { r, log }; };
  for (const dt of [1 / 240, 1 / 60, 1 / 7]) {
    const { r, log } = hitsAt(dt), want = [0, 1, 2].flatMap((bar) => lit.map((k) => bar * 4 + k * 0.25)).filter((b) => b < 8);
    ok(log.length === want.length && log.every((b, i) => b >= want[i] - 1e-9 && b < want[i] + dt * 2 + 1e-9), 'two bars of 4 lit steps: one fire each, on the tick at its beat (dt ' + dt.toFixed(4) + ')', { log, want });
    ok(M.sourceOf(r.env.id).gateMode === 'oneshot' && r.seq.stats().releases === 0, 'a one-shot ENV: nothing to release, every hit plays once through', r.seq.stats());
  }
  // the kit's play edge (modPlayEdge) fires every ENV on the beat play begins: on a lit step that IS the step's hit — not a second
  const r = rig(); r.model.setStep(r.env.id, 0, 64); r.model.setStep(r.env.id, 1, 127); r.model.setLive(r.env.id, true);
  r.clock.playing = false; r.tick(0); r.clock.playing = true;
  const f0 = r.env.fires; M.modPlayEdge(); const edge = r.env.fires - f0;
  r.tick(1 / 60); const first = r.env.fires - f0;
  runTo(r, 0.26, 1 / 60); const after = r.env.fires - f0;
  ok(edge === 1 && first === 1 && after === 2 && r.seq.stats().adopted === 1, 'play edge on lit step 0: one fire (the edge\'s), then step 1 fires once', { edge, first, after, stats: r.seq.stats() });
  ok(Math.abs(M.macroOf(r.m1.id).value - M.sourceOf(r.env.id).out) < 1e-12 && r.seq.position(r.env.id).step === 1, 'the adopted hit carried step 0\'s velocity until step 1\'s full hit', { value: M.macroOf(r.m1.id).value });
  const g = rig(); M.setSource(g.env.id, { gateMode: 'gate' }); g.model.setStep(g.env.id, 0, 127); g.model.setLive(g.env.id, true);
  g.clock.playing = false; g.tick(0); g.clock.playing = true; M.modPlayEdge(); g.tick(1 / 60);
  const held = M.sourceOf(g.env.id).gate; runTo(g, 0.26, 1 / 60);
  ok(held && M.sourceOf(g.env.id).gate === false && g.seq.stats().releases === 1 && g.env.fires === 1, 'a gate ENV hit by the edge on lit step 0 holds the step and lets go at its end', { held, stats: g.seq.stats(), fires: g.env.fires });
}
{ // the clip under the playhead rules its ENV; the row loops elsewhere
  const r = rig(); r.model.fill(r.env.id, 4); r.model.setLive(r.env.id, true);
  const steps = new Array(16).fill(0); steps[2] = 127;
  const lane = r.timeline.state().lanes[0].id;
  const id = r.timeline.create({ targetId: 'pattern.' + r.env.id, name: 'P', value: 0, start: 4, duration: 4, laneId: lane, source: { kind: 'pattern', envId: r.env.id, steps } });
  ok(!!id, 'a pattern clip creates through the model', id);
  r.tick(1 / 60); const log = [0, ...runTo(r, 12, 1 / 60)];
  ok(r.env.fires === 9, 'row 0..3, the clip once at 4.5, row 8..11: 9 hits', { fires: r.env.fires, log });
  ok(log.some((b) => b >= 4.5 && b < 4.5 + 1 / 30 + 1e-9) && !log.some((b) => b >= 4 && b < 4.5), 'the clip fires its step 2 and silences the row inside it', log);
  ok(r.seq.position(r.env.id, 5.1).clip === id && r.seq.position(r.env.id, 5.1).step === 4, 'the marker follows the clip', r.seq.position(r.env.id, 5.1));
  r.timeline.updateClip(id, { mute: true }); M.setTransport({ beats: 4 }); r.seq.reset(4); runTo(r, 8, 1 / 60);
  ok(r.env.fires === 13, 'a muted clip gives the ENV back to its row', r.env.fires);
}
{ // the recorder's frames: a coarse step fires exactly the hits fine ticks fire
  const counts = [1 / 60, 1 / 7, 0.24].map((dt) => { const r = rig(); r.model.fill(r.env.id, 2); r.model.setLive(r.env.id, true); r.tick(dt); runTo(r, 16, dt); return r.env.fires; });
  ok(counts.every((n) => n === 32), 'fine ticks, 7 fps and 4 fps frames all fire 32 hits in 16 beats', counts);
}
{ // the project seam: capture → restore → signature, the project part, and undo on the app's one stack
  const a = createPatternModel(); a.fill('s9', 8); a.setLength('s9', 32); a.setLive('s9', true); a.setStep('s9', 31, 50);
  const snap = JSON.parse(JSON.stringify(a.capture())), b = createPatternModel();
  ok(b.restore(snap) && b.signature() === a.signature(), 'capture/restore round-trips the signature', snap);
  ok(b.restore({ v: 1, rows: [{ env: 'x', length: 12, live: true, steps: [] }] }) === false && b.signature() === a.signature(), 'an invalid length is refused whole');
  // undo is the app's one stack: the model as a snapshot domain, a paint-drag held as ONE gesture row
  const H = createHistory({ timers: { setTimeout: (fn) => (fn(), 1), clearTimeout() {} } });
  H.register('pattern', { read: () => b.capture(), write: (snap) => b.restore(snap) });
  H.hold('PAINT'); for (let i = 1; i < 6; i++) b.setStep('s9', i, 90); H.release();
  ok(H.length === 1 && b.lit('s9') > a.lit('s9') && H.undo() && b.signature() === a.signature() && H.redo() && b.steps('s9')[3] === 90, 'a held paint-drag is one history row: undo and redo it', { rows: H.length });
  b.bindRack((id) => id !== 's9'); ok(b.capture().rows.length === 0 && b.lit('s9') > 0, 'a row whose ENV left the rack is not captured (and is not lost)'); b.bindRack(null);
  const parts = createProjectParts(), shared = createPatternModel(), part = patternProjectPart(shared);
  parts.register('pattern', part);
  ok(parts.names().includes('pattern'), 'the pattern is a registered project part', parts.names());
  shared.setStep('s1', 3, 99);
  ok(parts.capture().pattern.rows[0].steps[3] === 99 && part.restore(null) && part.capture().rows.length === 0, 'the project part is the model', part.signature());
  let heard = 0; const off = part.subscribe(() => heard++); shared.rackChanged(); shared.setStep('s1', 1, 9); off();
  ok(heard === 1, 'a rack move is not a project edit', heard);
}
console.log(`PASS pattern: ${pass} assertions (step ${STEP_BEATS} beat)`);
