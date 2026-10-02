/* timeline-audio.node.mjs — BASINS tools/test-audio-clip.mjs, ported (2026-10-02) as far as the kit's audio kind goes.
 * Ran here: the source through the model's one path, value(beat) = the envelope lookup, the JSON round-trip, a torn
 * envelope refused, duration at 60/120 BPM, the TEMPO LAW, Shift+T, the in-place source patch, the budgets.
 * Not here (BASINS' engines, which stay BASINS'): the analysis of a tone (analyseAudio), the band split, the peaks, the
 * playback placement (audio-playback.js), the asset store and the project ZIP.  The envelope is a synthetic ramp. */
import assert from 'node:assert/strict';
import { createTimelineModel, isTimelineSnapshot } from '../mir/timeline/model.js';
import { clipKind } from '../mir/timeline/kinds.js';
import { audioSource, envelopeAt, audioRate, readjustAudioTempo, stretchAudioClip, patchAudioClip, audioBudget, validAudioSource,
  AUDIO_ENV_HZ, AUDIO_CLIP_MAX, AUDIO_SECONDS_MAX, toBase64, fromBase64 } from '../mir/timeline/audio-kind.js';

const SECONDS = 2, frames = SECONDS * AUDIO_ENV_HZ;
const level = Uint8Array.from({ length: frames }, (_, i) => Math.round(255 * i / (frames - 1)));   // a synthetic LEVEL ramp
const env = toBase64(level);
const meta = { id: 'a'.repeat(32), name: 'ramp.wav', seconds: SECONDS, envelopes: { level: env, low: env, mid: env, high: env } };
// Quantisation round-trips through JSON; the model restores the source through the kind's validate.
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
[0.3, 1.1, 1.8].map((t) => at(m, t, 60)).forEach((v, i) => assert.ok(Math.abs(v - before[i]) < 1e-12, 'the envelope sits at the same seconds'));   // to an ulp: the synthetic ramp interpolates where BASINS' tone landed on samples
assert.ok(m.undo() && m.state().clips[0].duration === 4, 'one undo restores the beat length');
m.redo();

// SHIFT+T: trim to 1.5 beats at 60 BPM, stretch → the remaining 2 s of audio fit 1.5 s; ratio = seconds / clip seconds.
m.updateClip(clipId, { duration: 1.5 });
assert.ok(Math.abs(stretchAudioClip(m, clipId) - 4 / 1.5) < 1e-12, "scale = the source beats left over the clip beats");
c = m.state().clips[0]; s = m.state().curves[0];
assert.ok(Math.abs(audioRate(c, s, 60) - SECONDS / (1.5 * 60 / 60)) < 1e-12, 'the stretch ratio is the audio seconds over the clip seconds');
assert.ok(Math.abs(m.value('palette.phase', 4 + 1.5 - 1e-6) - envelopeAt(s, SECONDS - 1e-6 * 4 / 3)) < 1e-3, 'the clip ends where the audio ends');
assert.equal(readjustAudioTempo(m, 60, 90), 0, 'a stretched clip keeps its beats when the tempo moves');

// A source edit re-creates the clip in place: one undo, same lane, start, offset, scale.
const kept = m.state().clips[0], next = patchAudioClip(m, clipId, { keep: false });
const now = m.state().clips.find((x) => x.id === next);
assert.ok(next && now.start === kept.start && now.scale === kept.scale && now.laneId === kept.laneId && m.state().curves[0].keep === false);
assert.ok(m.undo() && m.state().clips[0].id === clipId, 'one undo restores the original clip');

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
console.log('Audio clips (the kit\'s kind): the one path, the envelope lookup, JSON round-trip, torn envelope refused, duration at 60/120 BPM, tempo readjust, Shift+T ratio, source patch, budgets (64 clips · 20 min) pass.');
