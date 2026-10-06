/* audio-clip.node.mjs — BASINS tools/test-audio-clip.mjs, ported (2026-10-05) with its assertions: the envelope of a synthetic
 * ramped tone (analyseAudio over the kit's audio follower), the Uint8 JSON round trip, the band split, the tempo law, Shift+T,
 * the KEEP AUDIO placement, the in-place source patch, the budgets.  Two assertions CHANGED on purpose (Josh, 2026-10-02: "those
 * are MIR related as well"): a tempo re-derive is not an edit (no undo row), and the budget counts duplicates, pastes and slices
 * (tests/audio-budget.node.mjs).  The ZIP half of BASINS' test is tests/audio-zip.node.mjs. */
import assert from 'node:assert/strict';
import { audioNorm, audioDbAmp } from '../mir/modulation/mod.js';
import { createTimelineModel, isTimelineSnapshot } from '../mir/timeline/model.js';
import { clipKind } from '../mir/timeline/kinds.js';
import { audioSource, envelopeAt, audioRate, readjustAudioTempo, stretchAudioClip, patchAudioClip, audioBudget, validAudioSource,
  AUDIO_ENV_HZ, AUDIO_CLIP_MAX, AUDIO_SECONDS_MAX, toBase64, fromBase64 } from '../mir/timeline/audio-kind.js';
import { analyseAudio, AUDIO_PEAK_RATES } from '../mir/timeline/audio-analysis.js';
import { audioPlacement } from '../mir/timeline/audio-playback.js';
import { assetId } from '../mir/core/assets.js';
import { adoptTimeline } from '../mir/timeline/history.js';
import { createHistory } from '../mir/history/history.js';

// A 2 s, 440 Hz tone at 48 kHz whose amplitude ramps linearly 0.05 → 1.0.
const SR = 48000, SECONDS = 2, amp = (t) => 0.05 + 0.95 * t / SECONDS;
const tone = (f, a) => Float32Array.from({ length: SR * SECONDS }, (_, i) => a(i / SR) * Math.sin(2 * Math.PI * f * i / SR));
const ramp = tone(440, amp), a = analyseAudio([ramp], SR);
assert.equal(a.seconds, SECONDS); assert.equal(a.frames, SECONDS * AUDIO_ENV_HZ);
const expected = (t) => audioNorm(audioDbAmp(amp(t) / Math.SQRT2), 0);
const level = fromBase64(a.envelopes.level);
let worst = 0;
for (let i = 5; i < a.frames; i++) worst = Math.max(worst, Math.abs(level[i] / 255 - expected((i + 0.5) / AUDIO_ENV_HZ)));
assert.ok(worst <= 0.03, `the LEVEL envelope follows the ramp within 3 % after the attack (worst ${worst.toFixed(4)})`);
assert.ok(level[4] > level[1] && level[a.frames - 1] === 255, 'it rises and saturates at the −6 dBFS top');
const fine = a.peaks[0].data;
assert.equal(a.peaks.map((p) => p.rate).join(), AUDIO_PEAK_RATES.join(), 'four zoom levels');
assert.ok(Math.abs(fine[2 * 799 + 1] / 127 - amp(1.9975)) < 0.03 && Math.abs(fine[1] / 127 - amp(0)) < 0.03, 'peaks carry the ramp');
assert.equal(a.peaks[1].data.length * 4, fine.length, 'each level folds four buckets');

// The bands split where the live device splits them (modulation/audio-capture.js BANDS): a 100 Hz tone is LOW, a 5 kHz tone is HIGH.
const bass = analyseAudio([tone(100, () => 0.5)], SR), hiss = analyseAudio([tone(5000, () => 0.5)], SR);
const mean = (b64) => { const b = fromBase64(b64); return b.slice(50).reduce((x, y) => x + y, 0) / (b.length - 50) / 255; };
assert.ok(mean(bass.envelopes.low) > mean(bass.envelopes.high) + 0.3 && mean(hiss.envelopes.high) > mean(hiss.envelopes.low) + 0.3, 'LOW and HIGH separate');
const mid = analyseAudio([tone(800, () => 0.5)], SR);
assert.ok(mean(mid.envelopes.mid) > mean(mid.envelopes.low) + 0.2 && mean(mid.envelopes.mid) > mean(mid.envelopes.high) + 0.2, 'MID is what a melody sits in');

// Quantisation round-trips through JSON; the model restores the source through the kind's validate.
const meta = { id: await assetId(new Uint8Array(ramp.buffer)), name: 'ramp.wav', type: 'audio/wav', seconds: a.seconds, sampleRate: SR, channels: 1, peaks: a.peaks, envelopes: a.envelopes };
assert.deepEqual(fromBase64(JSON.parse(JSON.stringify({ e: toBase64(level) })).e), level, 'Uint8 → base64 → JSON → Uint8');
const m = createTimelineModel(), lane = m.state().lanes[0].id;
const src = audioSource(meta, { bpm: 120, keep: true });
assert.ok(clipKind(src) && validAudioSource(src), 'the audio kind is registered');
const clipId = m.create({ targetId: 'palette.phase', name: 'RAMP', value: 0, start: 4, duration: src.length, laneId: lane, source: src });
assert.ok(clipId, 'an audio clip creates through the one path');
for (const beat of [4.5, 5, 6, 7.5]) assert.ok(Math.abs(m.value('palette.phase', beat) - level[Math.round((beat - 4) / 2 * AUDIO_ENV_HZ - 0.5)] / 255) < 0.02, 'value(beat) is the envelope lookup');
const snap = JSON.parse(JSON.stringify(m.serialize()));
assert.ok(isTimelineSnapshot(snap));
const m2 = createTimelineModel(); assert.ok(m2.restore(snap));
for (const beat of [4.1, 5.3, 7.9]) assert.equal(m2.value('palette.phase', beat), m.value('palette.phase', beat), 'restored values are bit-identical');
const torn = structuredClone(snap); torn.curves[0].envelope = torn.curves[0].envelope.slice(4);
assert.equal(isTimelineSnapshot(torn), false, 'a torn envelope is refused');

// Duration = seconds·bpm/60 at 60 and 120 BPM.
assert.equal(audioSource(meta, { bpm: 60 }).length, 2); assert.equal(audioSource(meta, { bpm: 120 }).length, 4);
assert.equal(m.state().clips[0].duration, 4);

// TEMPO LAW: 120 → 60 BPM keeps the seconds (4 beats → 2 beats) and the same audio at the same real time.
const at = (model, seconds, bpm) => model.value('palette.phase', 4 + seconds * bpm / 60);
const before = [0.3, 1.1, 1.8].map((t) => at(m, t, 120));
assert.equal(readjustAudioTempo(m, 120, 60), 1);
let c = m.state().clips[0], s = m.state().curves[0];
assert.equal(c.duration, 2); assert.equal(audioRate(c, s, 60), 1);
[0.3, 1.1, 1.8].map((t) => at(m, t, 60)).forEach((v, i) => assert.ok(Math.abs(v - before[i]) < 1e-12, 'the envelope sits at the same seconds'));
// CHANGED (BASINS added one undo row per re-derive): the re-derive is derived state, not an edit — there is nothing to undo
assert.ok(m.undo() && m.state().clips.length === 0, 'a tempo re-derive leaves no undo row: the one undo is the clip\'s own creation');
assert.ok(m.redo() && m.state().clips.length === 1);
c = m.state().clips[0]; assert.equal(readjustAudioTempo(m, 60, 120), 1, 'and it runs back the same way');
assert.equal(m.state().clips[0].duration, 4); assert.equal(readjustAudioTempo(m, 120, 60), 1);

// SHIFT+T: trim to 1.5 beats at 60 BPM, stretch → the remaining 2 s of audio fit 1.5 s; ratio = seconds / clip seconds.
m.updateClip(clipId, { duration: 1.5 });
assert.ok(Math.abs(stretchAudioClip(m, clipId) - 4 / 1.5) < 1e-12, 'scale = the source beats left over the clip beats');
c = m.state().clips[0]; s = m.state().curves[0];
assert.ok(Math.abs(audioRate(c, s, 60) - SECONDS / (1.5 * 60 / 60)) < 1e-12, 'the stretch ratio is the audio seconds over the clip seconds');
assert.ok(Math.abs(m.value('palette.phase', 4 + 1.5 - 1e-6) - envelopeAt(s, SECONDS - 1e-6 * 4 / 3)) < 1e-3, 'the clip ends where the audio ends');
assert.equal(readjustAudioTempo(m, 60, 90), 0, 'a stretched clip keeps its beats when the tempo moves');
const p = audioPlacement(c, s, 4.75, 90);
assert.ok(Math.abs(p.rate - 2) < 1e-12 && Math.abs(p.offset - 1) < 1e-12, 'KEEP AUDIO plays it varispeed from the matching offset');

// A source edit re-creates the clip in place: one undo, same lane, start, offset, scale.
const kept = m.state().clips[0], next = patchAudioClip(m, clipId, { keep: false });
const now = m.state().clips.find((x) => x.id === next);
assert.ok(next && now.start === kept.start && now.scale === kept.scale && now.laneId === kept.laneId && m.state().curves[0].keep === false);
assert.ok(m.undo() && m.state().clips[0].id === clipId, 'one undo restores the original clip');

// THE RE-DERIVE UNDER THE ONE HISTORY: a user's edit is one row; the tempo's re-derive after it adds none, and undo still takes the user's edit
const h = createHistory(), hm = createTimelineModel(); adoptTimeline(h, hm);
const hid = hm.create({ targetId: 'palette.phase', name: 'H', value: 0, start: 0, duration: 4, laneId: hm.state().lanes[0].id, source: audioSource(meta, { bpm: 120 }) });
const rows = () => h.length;
const r0 = rows();
assert.equal(readjustAudioTempo(hm, 120, 60), 1); assert.equal(rows(), r0, 'no history row for the re-derive');
assert.equal(hm.state().clips[0].duration, 2);
hm.begin(); hm.updateClip(hid, { start: 1 });
assert.equal(readjustAudioTempo(hm, 60, 120), null, 'a gesture open in the model defers the re-derive (the caller asks again)');
hm.commit(); assert.equal(readjustAudioTempo(hm, 60, 120), 1);

// BUDGETS: the 65th audio clip and the 20-minute overflow are refused.
const big = createTimelineModel(), lanes = big.state().lanes.map((l) => l.id);
for (let i = 0; i < AUDIO_CLIP_MAX; i++) assert.ok(big.create({ targetId: 'palette.phase', name: 'A' + i, value: 0, start: Math.floor(i / 4) * 5, duration: 4, laneId: lanes[i % 4], source: audioSource(meta, { bpm: 120 }) }));
assert.equal(audioBudget(big.state()).ok, false, 'the 65th clip is refused');
assert.equal(audioBudget(big.state()).clips, AUDIO_CLIP_MAX);
const long = createTimelineModel(), longLane = long.state().lanes[0].id, minutes = (sec, id) => ({ ...meta, id, seconds: sec, envelopes: { level: toBase64(new Uint8Array(Math.ceil(sec * AUDIO_ENV_HZ))) } });
assert.ok(long.create({ targetId: 'palette.phase', name: 'L', value: 0, start: 0, duration: 4, laneId: longLane, source: audioSource(minutes(1190, 'f'.repeat(32)), { bpm: 120 }) }));
assert.equal(audioBudget(long.state(), { seconds: 10, assetId: 'e'.repeat(32) }).ok, true, 'exactly 20 minutes fits');
assert.equal(audioBudget(long.state(), { seconds: 10.5, assetId: 'e'.repeat(32) }).ok, false, 'the overflow is refused');
assert.equal(audioBudget(long.state(), { seconds: 1190, assetId: 'f'.repeat(32) }).ok, true, 'the same asset again costs nothing');
assert.equal(validAudioSource({ ...src, seconds: AUDIO_SECONDS_MAX + 1 }), false);
console.log(`Audio clips: envelope within ${(worst * 100).toFixed(2)} % of the ramp, bands, Uint8 JSON round-trip, duration at 60/120 BPM, tempo readjust with no undo row, Shift+T ratio, source patch, budgets (64 clips · 20 min) pass.`);
