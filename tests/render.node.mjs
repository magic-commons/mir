/* render.node.mjs — mir/render/: the plan, the record clock, the store and its recovery, the stored ZIP parts and the MP4
 * muxer, headless.
 *
 *   node tests/render.node.mjs
 *
 * Ported from BASINS tools/test-render-plan.mjs (the TIMELINE · ACTIVE / SELECTION plan through the stepped clock, and the 64-bit
 * MP4 headers) with the kit's host in place of BASINS' copy.  New here, because the kit's clock is the host's: the record clock's
 * four modes, its repeatability, its restore of the live runtime, a page that is hidden, and the render store against an
 * in-memory stand-in for the origin-private file system (create, checkpoint, interrupt, recover, resume, finish, discard). */
import assert from 'node:assert/strict';

import { createModHost, model as M } from '../mir/modulation/host.js';
import { timelinePlan, recordingPlan, pickHighBitrate, estimateFilm, ceilingWarning, codecCandidates, RUN_CEILING_MS, CAP_MS_DEFAULT } from '../mir/render/plan.js';
import { mp4Parts, mp4Build, mp4Parse } from '../mir/render/mp4.js';
import { createRecordClock } from '../mir/render/clock.js';
import { RenderStore } from '../mir/render/store.js';
import { StoredZip, readStoredZip } from '../mir/core/zip.js';

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok }); if (!ok) console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 600))); };

/* ═══════════════ the plan: BASINS tools/test-render-plan.mjs, the timeline half, on the kit's host ═══════════════ */
{
  const host = createModHost({ presentationActive: true }), C = host.clock, TM = host.model;
  TM.modReset({ bare: true }); C.setBpm(120);
  for (const [kind, range, fps] of [['active', { start: 0, end: 16 }, 30], ['selection', { start: 4.5, end: 9.25 }, 60], ['selection', { start: 1 / 3, end: 2 }, 24]]) {
    const plan = timelinePlan({ range, bpm: 120, fps }), spb = 60 / 120;
    check('plan ' + kind + ' ' + fps + ' fps: the frame count and the first frame', plan.fps === fps && plan.startFrame === Math.round(range.start * spb * fps) &&
      plan.frames === Math.round(range.end * spb * fps) - plan.startFrame && Math.abs(plan.beatAt(0) - range.start) <= 0.5 * 120 / 60 / fps + 1e-12, plan);
    check('plan ' + kind + ': the last frame is before the end and the end is one frame on', plan.beatAt(plan.frames - 1) < range.end && Math.abs(plan.beatAt(plan.frames) - range.end) <= 120 / 60 / fps, plan);
    /* the deterministic clock's own law: frame zero at the play edge, 1/fps per frame, the beats land where the plan says */
    C.pause(0); TM.resetPhases(); C.demand('render', true); C.setEnabled(true); C.play(0); C.step(0);
    for (let i = 0; i < plan.startFrame; i++) C.step(1 / fps);
    const a = Math.abs(TM.transport.beats - plan.beatAt(0)) < 1e-9;
    for (let i = 1; i < plan.frames; i++) C.step(1 / fps);
    check('plan ' + kind + ': the stepped clock lands on the first and the last frame\'s beat', a && Math.abs(TM.transport.beats - plan.beatAt(plan.frames - 1)) < 1e-9, TM.transport.beats);
  }
  C.pause(0); C.demand('render', false);
  check('plan: 4 beats at 60 BPM and 30 fps is 120 frames', timelinePlan({ range: { start: 0, end: 4 }, bpm: 60, fps: 30 }).frames === 120);
  let refused = 0;
  for (const empty of [null, {}, { start: 4, end: 4 }, { start: 8, end: 2 }, { start: -1, end: 2 }, { start: NaN, end: 1 }]) { try { timelinePlan({ range: empty, bpm: 120, fps: 30 }); } catch (e) { if (/empty/.test(e.message)) refused++; } }
  check('plan: an empty or unreadable range refuses with a sentence', refused === 6, refused);
  let fpsRefused = false; try { timelinePlan({ range: { start: 0, end: 4 }, bpm: 120, fps: 25 }); } catch (e) { fpsRefused = /frame rate/.test(e.message); }
  check('plan: a frame rate the render does not offer refuses', fpsRefused);
  const rp = recordingPlan({ fps: 30, durationS: 2, offsetS: 1 });
  check('recordingPlan: frames, start frame and the last source frame', rp.frames === 60 && rp.startFrame === 30 && rp.lastSourceFrame === 89, rp);
  check('recordingPlan refuses a rate or a length it cannot do', recordingPlan({ fps: 25, durationS: 1 }) === null && recordingPlan({ fps: 30, durationS: 0 }) === null && recordingPlan({ fps: 30, durationS: 1, offsetS: -1 }) === null);
  check('pickHighBitrate is clamped to 40..200 Mbps', pickHighBitrate(640, 360, 24) === 40e6 && pickHighBitrate(1920, 1080, 60) === Math.round(1920 * 1080 * 60 * 0.5) && pickHighBitrate(7680, 4320, 60) === 200e6);
  const codecs = codecCandidates(3840, 2160), small = codecCandidates(1280, 720);
  check('the encoder ladder leads with High 5.2 above 1080p and with High 4.2 at or below it', codecs[0] === 'avc1.640034' && small[0] === 'avc1.64002a' && codecs.length === small.length + 2);
  const e = estimateFilm({ frames: 300, fps: 30, width: 1920, height: 1080, format: 'mp4' }), ep = estimateFilm({ frames: 300, fps: 30, width: 1920, height: 1080, format: 'png', msPerFrame: 100 });
  check('the estimate: size from the bitrate, time from the measured ms per frame (BASINS\' 84 until the device\'s own)', e.bytes === Math.round(e.bitrate / 8 * 10) && e.renderMs === 300 * CAP_MS_DEFAULT && ep.bytes === null && ep.renderMs === 30000 && ep.rawBytes === 1920 * 1080 * 4 * 300, { e, ep });
  check('the ceiling warning speaks above the ceiling and is silent below it', ceilingWarning(RUN_CEILING_MS + 1).includes('LONGER') && ceilingWarning(RUN_CEILING_MS) === '');
}

/* ═══════════════ the MP4 muxer: BASINS' 64-bit header check ═══════════════ */
{
  const headers = mp4Parts({ width: 1920, height: 1080, fps: 30, largeFile: true, headersOnly: true, description: Uint8Array.from([1, 100, 0, 40, 255, 225, 0, 0]),
    samples: [{ data: { size: 0x80000000 }, key: true, cts: 0 }, { data: { size: 0x80000000 }, key: false, cts: 3000 }] });
  const mdat = new DataView(headers[2].buffer);
  check('mp4: beyond 4 GB the mdat is a 64-bit box', mdat.getUint32(0) === 1 && mdat.getBigUint64(8) === 0x100000010n);
  const moov = headers[1], text = new TextDecoder('latin1').decode(moov), co64 = text.indexOf('co64');
  check('mp4: the co64 offset is the headers\' length', co64 > 0 && new DataView(moov.buffer).getBigUint64(co64 + 12) === BigInt(headers.reduce((n, b) => n + b.length, 0)));
  const small = mp4Parse(mp4Build({ width: 16, height: 16, fps: 24, largeFile: true, description: Uint8Array.from([1, 100, 0, 40, 255, 225, 0, 0]), samples: [{ data: new Uint8Array(8), key: true, cts: 0 }] }));
  check('mp4: a one-sample file parses, with its payload where the offset says', small.ok && small.chunkOffset === small.mdatPayloadAt && small.sampleCount === 1, small);
  const named = new TextDecoder('latin1').decode(mp4Build({ width: 16, height: 16, fps: 24, handler: 'BASINS video', description: Uint8Array.from([1, 100, 0, 40, 255, 225, 0, 0]), samples: [{ data: new Uint8Array(8), key: true }] }));
  check('mp4: the handler name is the app\'s', named.includes('BASINS video'));
}

/* ═══════════════ the stored ZIP parts the PNG path writes ═══════════════ */
{
  const zip = new StoredZip();
  for (let i = 0; i < 3; i++) zip.add('frame_' + String(i).padStart(6, '0') + '.png', new Uint8Array([137, 80, 78, 71, i, i, i]));
  zip.add('recording.json', new TextEncoder().encode('{"v":1}'));
  const files = readStoredZip(new Uint8Array(await zip.finish().arrayBuffer()));
  check('zip: the parts read back by name, with the frame bytes', files.size === 4 && files.get('frame_000002.png')[4] === 2 && new TextDecoder().decode(files.get('recording.json')) === '{"v":1}');
}

/* ═══════════════ the record clock, on the kit's host ═══════════════ */
const ROOTS = ['view', 'look'];
function rig() {
  const port = { angle: 0.1, grain: 0.35, knee: 0.5 };
  const host = createModHost({ wall: 1000, roots: ROOTS });
  host.install([
    { id: 'view.angle', label: 'ANGLE', map: 'wrap', min: 0, max: 2 * Math.PI, get: () => port.angle, set: (v) => { port.angle = v; } },
    { id: 'look.grain', label: 'GRAIN', map: 'linear', min: 0, max: 1, get: () => port.grain, set: (v) => { port.grain = v; } },
    { id: 'look.knee', label: 'KNEE', map: 'linear', min: 0, max: 1, get: () => port.knee, set: (v) => { port.knee = v; } },
  ]);
  M.modReset();
  M.setTransport({ bpm: 120, sync: 'wall', playing: false });
  const src = M.addSource('lfo', { label: 'LFO', on: true, wave: 'sine', sync: true, mult: M.LFO_MULT_DEFAULT, phaseOff: 0, smooth: 0 });
  const macro = M.macroList()[0];
  M.setMacro(macro.id, { name: 'LFO', sourceId: src.id });
  M.addRoute(macro.id, 'view.angle', 0, 0.4);
  host.targets.sync();
  /* the arrangement: GRAIN rides the beat (a saw over four beats), nothing else */
  const arrangement = { value: (id, beat) => (id === 'look.grain' ? (beat % 4) / 4 : null) };
  host.clock.setAutomationHold(true); host.clock.setAutomation(arrangement);
  host.clock.demand('timeline', true);
  return { port, host, arrangement };
}
const record = (r, mode, n, { hidden = false, frozenValues = null, fps = 30 } = {}) => {
  const clock = createRecordClock({ host: r.host, hidden: () => hidden });
  const start = { angle: r.port.angle, grain: r.port.grain, knee: r.port.knee };
  if (hidden) r.host.clock.setHidden(true);
  clock.enter(fps, { ...mode, frozenValues });
  const out = []; out.start = start;
  for (let i = 0; i < n; i++) { clock.frame(i); out.push({ i, beat: r.host.model.transport.beats, angle: r.port.angle, grain: r.port.grain, knee: r.port.knee }); }
  clock.exit();
  if (hidden) r.host.clock.setHidden(false);
  return out;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
{
  const r = rig();
  const live = { angle: r.port.angle, grain: r.port.grain, knee: r.port.knee };
  const before = r.host.clock.captureRuntime();
  const on = record(r, { modulation: true, timeline: true }, 24);
  check('clock: frame zero is beat zero and every frame is exactly 1/fps on (120 BPM, 30 fps = 1/15 beat a frame)',
    on[0].beat === 0 && on.every((f) => Math.abs(f.beat - f.i / 15) < 1e-9), on.slice(0, 3));
  check('clock: ON · ON moves the routed parameter and rides the arrangement', new Set(on.map((f) => f.angle.toFixed(9))).size > 4 && Math.abs(on[15].grain - (1 / 4)) < 1e-9, { g: on[15].grain, n: new Set(on.map((f) => f.angle.toFixed(9))).size });
  const after = r.host.clock.captureRuntime();
  check('clock: exit puts the live runtime back (transport, power, demands, the automation provider)',
    after.host.playing === before.host.playing && after.host.enabled === before.host.enabled && after.host.modulationEnabled === before.host.modulationEnabled &&
    after.host.automation === before.host.automation && same(after.host.demands, before.host.demands) && after.model.transport.beats === before.model.transport.beats && after.host.automationHold === before.host.automationHold,
    { before: before.host, after: after.host });
  check('clock: …and the parameters are where they were', Math.abs(r.port.angle - live.angle) < 1e-12 && Math.abs(r.port.grain - live.grain) < 1e-12 && Math.abs(r.port.knee - live.knee) < 1e-12, { port: r.port, live });

  const again = record(r, { modulation: true, timeline: true }, 24);
  check('clock: a render is repeatable to the bit (the same frames twice)', same(on, again));
  const hiddenRun = record(r, { modulation: true, timeline: true }, 24, { hidden: true });   // the host is hidden for the whole run
  r.host.clock.setHidden(true);
  check('clock: a render started while the page is hidden gives the same frames as one started visible', same(on, hiddenRun), { on: on.slice(0, 3), hid: hiddenRun.slice(0, 3) });
  check('clock: …and a hidden page is handed back to the live clock as hidden', (() => { r.host.clock.setHidden(true); const c = createRecordClock({ host: r.host, hidden: () => true }); c.enter(30, {}); c.frame(3); c.exit(); const h = r.host.clock.isHidden(); r.host.clock.setHidden(false); return h; })());

  const frozen = record(r, { modulation: false, timeline: false }, 12);
  check('clock: OFF · OFF freezes the look: nothing moves and no time passes', frozen.every((f) => f.beat === 0 && f.angle === frozen[0].angle && f.grain === frozen[0].grain && f.knee === frozen[0].knee) && Math.abs(frozen[0].grain - frozen.start.grain) < 1e-9 && Math.abs(frozen[0].angle - frozen.start.angle) < 1e-9, frozen.slice(0, 2));
  const tlOnly = record(r, { modulation: false, timeline: true }, 24);
  check('clock: modulation OFF, timeline ON: the arrangement plays, the routed parameter holds the frozen look',
    tlOnly.every((f) => f.angle === tlOnly[0].angle) && Math.abs(tlOnly[15].grain - 0.25) < 1e-9 && Math.abs(tlOnly[0].angle - tlOnly.start.angle) < 1e-9, tlOnly.slice(0, 2));
  const modOnly = record(r, { modulation: true, timeline: false }, 24);
  check('clock: modulation ON, timeline OFF: the routed parameter moves, the arrangement is bypassed (GRAIN holds its base)',
    new Set(modOnly.map((f) => f.angle.toFixed(9))).size > 4 && modOnly.every((f) => Math.abs(f.grain - 0.35) < 1e-9), modOnly.slice(0, 2));
  const resumed = record(r, { modulation: false, timeline: false }, 3, { frozenValues: { 'look.knee': 0.9 } });
  check('clock: a resumed render holds the ORIGINAL look (frozenValues), not the one on screen now', resumed.every((f) => Math.abs(f.knee - 0.9) < 1e-9) && Math.abs(r.port.knee - live.knee) < 1e-12, resumed[0]);

  /* the app's realtime tick keeps calling advanceTo(stamp) while the clock runs; advanceTo writes the host's wall before it sees
     the pump is suspended, so a wall-synced rack would derive its beat from real time (found in a browser: beats 5.87, 4.97, 5.0).
     The record clock puts the wall back before every exact step */
  {
    const rw = rig();
    const clk = createRecordClock({ host: rw.host }); clk.enter(30, { modulation: true, timeline: true });
    const beats = [];
    for (let i = 0; i < 12; i++) { clk.frame(i); beats.push(rw.host.model.transport.beats); rw.host.clock.advanceTo(2.93 + i * 0.016); }   // the app's tick lands between frames
    clk.exit();
    check('clock: the app\'s realtime tick between frames cannot move a wall-synced beat (1/15 beat a frame, exactly)', beats.every((b, i) => Math.abs(b - i / 15) < 1e-9), beats);
  }
  /* a scrub (or another run) owns the realtime pump: the render refuses */
  const release = r.host.clock.suspendRealtime(1000);
  let refused = '';
  try { createRecordClock({ host: r.host }).enter(30, {}); } catch (e) { refused = e.message; }
  release(1000);
  check('clock: it refuses to enter while a scrub owns the clock', /scrubbing/.test(refused), refused);
  const c2 = createRecordClock({ host: r.host }); c2.enter(30, {});
  let twice = ''; try { createRecordClock({ host: r.host }).enter(30, {}); } catch (e) { twice = e.message; }
  c2.exit();
  check('clock: and while another render holds it', /scrubbing|already/.test(twice), twice);
  let order = ''; const c3 = createRecordClock({ host: r.host }); c3.enter(30, {}); c3.frame(5); try { c3.frame(3); } catch (e) { order = e.message; } c3.exit();
  check('clock: frames only advance', /in order/.test(order), order);
}

/* ═══════════════ the pattern in a render: a hit is carried at its velocity, the same in a hidden tab ═══════════════
   BASINS' open item (docs/ENV-PATTERN-AUDIO-HARDENING §Open): "a recording started in a hidden tab renders pattern hits at full
   strength (velocity lives on the macros)".  The sequencer rides the host clock's advance notice, which the recorder's step
   rings, so the render clock needs nothing more: the same frames visible and hidden, and never above the step's velocity. */
{
  const { createPatternSequencer } = await import('../mir/pattern/sequencer.js');
  const { createPatternModel } = await import('../mir/pattern/model.js');
  const H = createModHost({ roots: ['test'], presentationActive: false }); H.model.modReset(); H.model.setTransport({ bpm: 120, sync: 'free' });
  let level = 0; H.targets.install({ id: 'test.level', map: 'linear', min: 0, max: 1, get: () => level, set: (v) => { level = v; } });
  const env = H.model.addSource('env', { a: 0, hold: 0, d: 0.2, s: 0, r: 0.05 }), m1 = H.model.macroList()[0];
  H.model.setMacro(m1.id, { sourceId: env.id }); H.model.addRoute(m1.id, 'test.level', 0, 1); H.targets.sync();
  const pattern = createPatternModel(); pattern.setStep(env.id, 0, 64); pattern.setStep(env.id, 4, 32); pattern.setLive(env.id, true);
  const seq = createPatternSequencer({ M: H.model, clock: H.clock, pattern });
  H.clock.onAdvance((kind) => (kind === 'seek' ? seq.reset() : seq.tick()));
  const take = (hidden) => {
    if (hidden) H.clock.setHidden(true);
    const c = createRecordClock({ host: H, hidden: () => hidden });
    c.enter(30, { modulation: true, timeline: false });
    const values = []; for (let i = 0; i < 40; i++) { c.frame(i); values.push(+level.toFixed(9)); }
    c.exit(); if (hidden) H.clock.setHidden(false);
    return values;
  };
  /* the page has been playing before the render starts: the sequencer holds a beat from the live clock */
  H.clock.play(0); for (let i = 0; i < 25; i++) H.clock.step(1 / 30); H.clock.pause(0);
  const shown = take(false), shownAgain = take(false), hidden = take(true);
  check('pattern: after the play edge (frame zero is the edge\'s own fire, as live play paints it) the render carries the step\'s velocity, 64/127, never full strength',
    shown[0] === 1 && Math.max(...shown.slice(1, 7)) > 0.2 && Math.max(...shown.slice(1)) <= 64 / 127 + 1e-9, shown.slice(0, 8));
  check('pattern: a render is repeatable even after live play (the sequencer starts from the play edge)', same(shown, shownAgain), { a: shown.slice(0, 6), b: shownAgain.slice(0, 6) });
  check('pattern: a render started while the page is hidden gives the same frames as one started visible', same(shown, hidden), { shown: shown.slice(0, 8), hidden: hidden.slice(0, 8) });
}

/* ═══════════════ the render store, against an in-memory origin-private file system ═══════════════ */
class Writable {
  constructor(file) { this.file = file; this.chunks = []; }
  async write(b) { this.chunks.push(b instanceof Uint8Array ? b.slice() : new Uint8Array(b)); }
  async close() { this.file.blob = new Blob(this.chunks); }
  async abort() { this.chunks = []; }
}
class FileHandle { constructor(name) { this.kind = 'file'; this.name = name; this.blob = new Blob([]); } async createWritable() { return new Writable(this); } async getFile() { return this.blob; } }
class DirHandle {
  constructor(name) { this.kind = 'directory'; this.name = name; this.map = new Map(); }
  async getDirectoryHandle(n, o = {}) { if (!this.map.has(n)) { if (!o.create) throw new Error('NotFound'); this.map.set(n, new DirHandle(n)); } return this.map.get(n); }
  async getFileHandle(n, o = {}) { if (!this.map.has(n)) { if (!o.create) throw new Error('NotFound'); this.map.set(n, new FileHandle(n)); } return this.map.get(n); }
  async removeEntry(n) { if (!this.map.delete(n)) throw new Error('NotFound'); }
  async *entries() { for (const e of this.map) yield e; }
}
const fakeStorage = () => { const root = new DirHandle(''); return { getDirectory: async () => root, estimate: async () => ({ quota: 1e12, usage: 0 }), root }; };
const DESC = [1, 100, 0, 40, 255, 225, 0, 0];
const sampleBytes = (n, seed) => new Uint8Array(n).fill(seed);
{
  const storage = fakeStorage(), opts = { dir: 'basins-recordings', storage };
  check('store: no origin-private file system, no store (the run keeps its samples in memory)', (await RenderStore.create('x', { format: 'png' }, 0, { storage: {} })) === null);

  /* PNG: a part is committed with a checkpoint; a finished job is a stored render */
  const png = await RenderStore.create('png-1', { format: 'png', width: 16, height: 16, frames: 4, fps: 30 }, 4096, opts);
  const part = await png.savePart('mir-frames-png-1-001.zip', new Blob([sampleBytes(4096, 9)]), 2);
  let jobs = await RenderStore.recoveries(opts);
  check('store: a PNG part is on disk with its checkpoint, found by recoveries() in the app\'s directory',
    part.bytes === 4096 && jobs.length === 1 && jobs[0].store.id === 'png-1' && jobs[0].frames === 2 && jobs[0].files.length === 1 && storage.root.map.has('basins-recordings') && !storage.root.map.has('mir-recordings'), jobs.length);
  await png.finishParts();
  jobs = await RenderStore.recoveries(opts);
  check('store: finishing a PNG render marks it ready', jobs[0].store.manifest.state === 'ready');
  await jobs[0].store.discard();
  check('store: DISCARD removes the job', (await RenderStore.recoveries(opts)).length === 0);

  /* MP4: payload on disk, a checkpoint every so often, an interruption keeps the completed prefix */
  const spec = { format: 'mp4', width: 16, height: 16, fps: 24, frames: 6, bitrate: 40e6, rendererVersion: 1 };
  const info = (n) => ({ width: 16, height: 16, fps: 24, description: DESC, samples: Array.from({ length: n }, (_, i) => ({ size: 100, key: i === 0, ts: i * 41667, cts: i * 3750 })) });
  const mp4 = await RenderStore.create('mp4-1', spec, 6000, opts);
  for (let i = 0; i < 2; i++) mp4.append(sampleBytes(100, i + 1));
  await mp4.checkpoint(info(2));
  mp4.append(sampleBytes(100, 3));                  // the third sample is written after the checkpoint …
  await mp4.interrupt();                            // … and the run dies
  jobs = await RenderStore.recoveries(opts);
  check('store: an interrupted MP4 shows its completed frames (the checkpoint), not the one in flight', jobs.length === 1 && jobs[0].frames === 2 && jobs[0].store.manifest.state === 'rendering', jobs[0] && jobs[0].frames);
  const rec = await jobs[0].store.finalize('basins-recovered-partial.mp4', { handler: 'BASINS' });
  const parsed = mp4Parse(new Uint8Array(await rec.blob.arrayBuffer()));
  check('store: RECOVER COMPLETED FRAMES makes a valid MP4 of exactly the checkpointed samples', rec.frames === 2 && parsed.ok && parsed.sampleCount === 2 && rec.bytes === (await rec.blob.arrayBuffer()).byteLength && parsed.chunkOffset === parsed.mdatPayloadAt, parsed);
  const payload = new Uint8Array(await rec.blob.arrayBuffer()).slice(parsed.mdatPayloadAt);
  check('store: …whose payload is those two samples, byte for byte', payload.length === 200 && payload[0] === 1 && payload[99] === 1 && payload[100] === 2 && payload[199] === 2, payload.length);

  /* a resume continues from the checkpoint into a new part, and the finished file has every sample */
  const mp4b = await RenderStore.create('mp4-2', spec, 6000, opts);
  for (let i = 0; i < 2; i++) mp4b.append(sampleBytes(100, i + 1));
  await mp4b.checkpoint(info(2));
  mp4b.append(sampleBytes(100, 3));
  await mp4b.interrupt();
  const again = (await RenderStore.recoveries(opts)).filter((j) => j.store.id === 'mp4-2');
  const store = again[0].store;
  await store.resume();
  store.append(sampleBytes(100, 3)); store.append(sampleBytes(100, 4));
  const done = await store.finish(info(4), 'mir-render.mp4');
  const fin = mp4Parse(new Uint8Array(await done.blob.arrayBuffer()));
  const finBytes = new Uint8Array(await done.blob.arrayBuffer()).slice(fin.mdatPayloadAt);
  check('store: RESUME writes on from the checkpoint and finishes one file of every sample', done.frames === 4 && fin.ok && fin.sampleCount === 4 && finBytes.length === 400 && finBytes[200] === 3 && finBytes[399] === 4, { fin, len: finBytes.length });
  check('store: finalizing removes the temporary payload parts', ![...(await (await (await storage.getDirectory()).getDirectoryHandle('basins-recordings')).getDirectoryHandle('mp4-2')).map.keys()].some((k) => k.startsWith('payload')));
  let again2 = ''; try { await (await RenderStore.recoveries(opts)).find((j) => j.store.id === 'mp4-2').store.resume(); } catch (e) { again2 = e.message; }
  check('store: a complete recording cannot be resumed', /already complete/.test(again2), again2);
  const tight = { getDirectory: storage.getDirectory, estimate: async () => ({ quota: 50e6, usage: 40e6 }) };
  let quota = ''; try { await RenderStore.create('big', { format: 'mp4' }, 10e6, { dir: 'basins-recordings', storage: tight }); } catch (e) { quota = e.message; }
  check('store: a quota that cannot hold the run twice over refuses before the first frame', /Not enough temporary storage/.test(quota), quota);
  check('store: a refused create leaves nothing behind', !(await (await storage.getDirectory()).getDirectoryHandle('basins-recordings')).map.has('big'));
}

const failed = results.filter((r) => !r.ok);
console.log(`render: ${results.length - failed.length}/${results.length} pass`);
if (failed.length) process.exit(1);
