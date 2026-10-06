/* audio-capture.node.mjs — modulation/audio-capture.js (BASINS app/audio.js, harvested 2026-10-05) against a fake microphone: the
 * state words, the MANDATORY `{ exact: false }` voice processors, the in-flight ticket (two presses open ONE stream; a cancel
 * during the prompt cancels), the denied / no-device / overconstrained answers, the bands that are contiguous, the flux primer
 * (the first frame after an open or a resume reports 0), a track that ends, stop() closing every track and the context, and
 * installModulation's default.  No real audio: the analyser is scripted. */
import assert from 'node:assert/strict';

let opened = 0, closedCtx = 0, ctxs = 0, constraints = [], behave = 'ok';
const makeTrack = (id) => { const l = {}; return { stopped: false, stop() { this.stopped = true; }, addEventListener(k, fn) { l[k] = fn; }, end() { l.ended && l.ended(); },
  getSettings: () => ({ deviceId: id || 'default', echoCancellation: false, noiseSuppression: false, autoGainControl: false, latency: 0.01 }) }; };
const streams = [];
class FakeAnalyser {
  constructor() { this.fftSize = 2048; this.frequencyBinCount = 1024; this.smoothingTimeConstant = 1; this.db = new Float32Array(1024).fill(-Infinity); this.time = new Float32Array(2048); }
  getFloatFrequencyData(a) { a.set(this.db); } getFloatTimeDomainData(a) { a.set(this.time); }
}
let analyser = null;
class FakeContext {
  constructor() { ctxs++; this.state = 'suspended'; this.sampleRate = 48000; this.destination = {}; }
  async resume() { this.state = 'running'; } async suspend() { this.state = 'suspended'; } async close() { closedCtx++; this.state = 'closed'; }
  createMediaStreamSource() { return { connect: (n) => { this.connected = n; }, disconnect() {} }; }
  createAnalyser() { return (analyser = new FakeAnalyser()); }
}
globalThis.window = { isSecureContext: true, AudioContext: FakeContext };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: {
  async getUserMedia(c) {
    constraints.push(c); await new Promise((r) => setTimeout(r, 5));
    if (behave === 'denied') throw Object.assign(new Error('x'), { name: 'NotAllowedError' });
    if (behave === 'none') throw Object.assign(new Error('x'), { name: 'NotFoundError' });
    if (behave === 'over' && c.audio.echoCancellation && c.audio.echoCancellation.exact === false) throw Object.assign(new Error('x'), { name: 'OverconstrainedError' });
    opened++; const track = makeTrack(c.audio.deviceId && c.audio.deviceId.exact); const s = { tracks: [track], getTracks: () => s.tracks, getAudioTracks: () => s.tracks }; streams.push(s); return s;
  },
  async enumerateDevices() { return [{ kind: 'audioinput', deviceId: 'a', label: '' }, { kind: 'audioinput', deviceId: 'b', label: 'USB MIC' }, { kind: 'videoinput', deviceId: 'v', label: 'cam' }]; } } } });
const { createAudioCapture, BANDS, AUDIO_STATE, audioSupport } = await import('../mir/modulation/audio-capture.js');

assert.deepEqual(BANDS.map((b) => [b.key, b.lo, b.hi]), [['low', 20, 250], ['mid', 250, 2000], ['high', 2000, 16000]], 'the 250 and 2000 Hz crossovers');
assert.equal(audioSupport().ok, true);
const states = [], cap = createAudioCapture({ onState: (s) => states.push(s.state) });
assert.equal(cap.state, 'idle'); assert.equal(opened, 0, 'creating a capture opens nothing');
assert.equal(cap.read(60), null, 'nothing to read before a start (null, never a zero)');

// the open: asking → live; the three voice processors are asked for MANDATORILY
await cap.start('');
assert.deepEqual(states, ['asking', 'live']); assert.equal(cap.live, true);
for (const k of ['echoCancellation', 'noiseSuppression', 'autoGainControl']) assert.deepEqual(constraints[0].audio[k], { exact: false }, k + ' is { exact: false }, never a bare false');
assert.equal(constraints[0].video, false); assert.equal(analyser.smoothingTimeConstant, 0, 'the analyser does not smooth: the model\'s followers are the contract');
assert.equal(typeof cap.processing.autoGainControl, 'boolean', 'what the browser actually gave is published'); assert.equal(cap.inputLatencyMs, 10);
assert.equal(ctxs, 1); assert.equal(analyser.connected, undefined); assert.equal(streams[0].tracks[0].stopped, false);

// a scripted spectrum: a 100 Hz-ish peak in LOW, one bin in MID; the first frame LEARNS (flux 0), the next rises
const binHz = 24000 / 1024;
analyser.db.fill(-100); analyser.db[Math.round(100 / binHz)] = -10; analyser.db[Math.round(1000 / binHz)] = -20;
analyser.time.fill(0.1);
const p1 = cap.read(60);
assert.equal(p1.flux, 0, 'the first frame after an open reports no flux (a phantom onset otherwise)');
assert.ok(Math.abs(p1.rms - 0.1) < 1e-6, 'rms is LINEAR amplitude'); assert.equal(p1.sampleRate, 48000);
assert.ok(p1.bandPower[0] > p1.bandPower[2] && p1.bandPower[1] > p1.bandPower[2], 'bands: LOW and MID hold the peaks, HIGH does not');
assert.ok(p1.bandPower[0] > 0 && p1.bandPower[0] < 1, 'band power is LINEAR MEAN POWER (a mean over the band\'s bins)');
analyser.db[Math.round(5000 / binHz)] = -5;
const p2 = cap.read(60);
assert.ok(p2.flux > 0.5, 'a new peak is a rise: flux is the SUM of the rises (' + p2.flux.toFixed(3) + ')');
assert.ok(cap.read(60).flux < 1e-6, 'a steady spectrum has no flux (float32 rounding aside)'); assert.ok(p2.latencyMs > 10 && p2.latencyEstimated === false);
assert.equal(p2.feedHz, 60); assert.equal(cap.read(NaN).feedHz, 60, 'a nonsense cadence reads as 60');
// the bands are contiguous: every bin belongs to exactly one band, none to two (the 2.7 % overlap error)
analyser.db.fill(-20); const all = cap.read(60); cap.read(60);
const mean = (x) => Math.abs(x - 1e-2) < 1e-9;
assert.ok(all.bandPower.every(mean), 'a flat -20 dB spectrum is the same mean power (0.01) in each band whatever its width');

// a hide suspends the ANALYSIS (read → null), the device stays open; the return re-primes the flux
cap.setHidden(true); await new Promise((r) => setTimeout(r, 2)); assert.equal(cap.read(60), null, 'hidden: nothing is read'); assert.equal(streams[0].tracks[0].stopped, false, 'but the capture is still open: see the header');
cap.setHidden(false); await new Promise((r) => setTimeout(r, 2));
analyser.db.fill(-100); analyser.db[50] = -10; assert.equal(cap.read(60).flux, 0, 'the first frame after a resume re-learns the spectrum');

// stop closes every track and the context, and the state is idle
await cap.stop(); assert.equal(cap.state, 'idle'); assert.ok(streams[0].tracks.every((t) => t.stopped)); assert.equal(closedCtx, 1); assert.equal(cap.read(60), null);

// THE IN-FLIGHT TICKET: two presses open ONE live stream; the loser's stream is stopped, not leaked
opened = 0; streams.length = 0; ctxs = 0; closedCtx = 0;
const a = cap.start(''), b = cap.start('b'); await Promise.all([a, b]);
assert.equal(cap.state, 'live'); assert.equal(streams.filter((s) => s.tracks.some((t) => !t.stopped)).length, 1, 'exactly one live stream, the other torn down');
assert.equal(cap.deviceId, 'b', 'the latest press wins'); assert.equal(ctxs - closedCtx, 1, 'one AudioContext left open');
await cap.stop();
// a cancel during the prompt cancels (the mic must not open one tick later)
streams.length = 0; const c = cap.start(''); await new Promise((r) => setTimeout(r, 1)); await cap.stop(); await c;
assert.equal(cap.state, 'idle'); assert.ok(streams.every((s) => s.tracks.every((t) => t.stopped)), 'a stream that arrives after the cancel is stopped');
// a track that ends tears the graph down and says so
await cap.start(''); const live = streams.at(-1); live.tracks[0].end(); await new Promise((r) => setTimeout(r, 5));
assert.equal(cap.state, 'error'); assert.match(cap.reason, /disconnected/); assert.ok(live.tracks[0].stopped);
await cap.stop();

// the refusals are three different words
behave = 'denied'; await cap.start(''); assert.equal(cap.state, AUDIO_STATE.DENIED); assert.match(cap.reason, /refused/);
behave = 'none'; await cap.start(''); assert.equal(cap.state, AUDIO_STATE.NODEVICE);
behave = 'over'; constraints.length = 0; await cap.start(''); assert.equal(cap.state, 'live', 'a browser that cannot turn AGC off is still listened to'); assert.equal(constraints.length, 2); assert.equal(constraints[1].audio.autoGainControl, false);
await cap.stop(); behave = 'ok';
// the remembered input that is gone falls back to the default
const kept = createAudioCapture({ deviceId: 'gone' }); let first = true; const real = navigator.mediaDevices.getUserMedia;
navigator.mediaDevices.getUserMedia = async (c2) => { if (first) { first = false; throw Object.assign(new Error('x'), { name: 'OverconstrainedError' }); } return real(c2); };
await kept.start(); assert.equal(kept.state, 'live'); assert.notEqual(kept.deviceId, 'gone'); await kept.stop();
// devices(): the audio inputs, numbered when the browser has no labels yet
assert.deepEqual(await cap.devices(), [{ id: 'a', label: 'INPUT 1' }, { id: 'b', label: 'USB MIC' }]);
// no secure context: said before anything is asked
window.isSecureContext = false; const bad = createAudioCapture(); await bad.start(); assert.equal(bad.state, 'unavailable'); assert.match(bad.reason, /secure page/); window.isSecureContext = true;
cap.dispose();
console.log('audio capture: states, mandatory exact:false processors, the in-flight ticket, the flux primer, contiguous bands, hide/resume, track end, refusals, devices pass.');
