/* audio-budget.node.mjs — the audio budget counts every audio clip however it was made (BASINS' open item, ENV-PATTERN-AUDIO-
 * HARDENING §Open: "Duplicate, paste and slice are not counted against the 64 audio-clip budget"; Josh, 2026-10-02).  64 clips and
 * 20 minutes of DISTINCT audio: create, duplicate, paste (and so DUPLICATE in the menu) and slice all refuse with the add's own
 * sentence, whole (nothing half-applied, no history row), and say why in model.lastRefusal. */
import assert from 'node:assert/strict';
import { createTimelineModel } from '../mir/timeline/model.js';
import { sliceClips } from '../mir/timeline/slice.js';
import { audioSource, audioBudget, AUDIO_CLIP_MAX, AUDIO_ENV_HZ, toBase64 } from '../mir/timeline/audio-kind.js';
import { adoptTimeline } from '../mir/timeline/history.js';
import { createHistory } from '../mir/history/history.js';

const mk = (id, seconds) => ({ id, name: id + '.wav', seconds, envelopes: { level: toBase64(new Uint8Array(Math.ceil(seconds * AUDIO_ENV_HZ))) } });
const A = mk('a'.repeat(32), 2), B = mk('b'.repeat(32), 600), C = mk('c'.repeat(32), 700);
const add = (m, i, meta = A, lane = i % 4, start = Math.floor(i / 4) * 5) => m.create({ targetId: 'palette.phase', name: 'A' + i, value: 0, start, duration: 4, laneId: m.state().lanes[lane].id, source: audioSource(meta, { bpm: 120 }) });
const audioClips = (m) => m.state().clips.length;
const WHY = 'No room: {n} audio clips is the budget.';

// 63 clips: one more fits by every road
const m = createTimelineModel();
for (let i = 0; i < AUDIO_CLIP_MAX - 1; i++) assert.ok(add(m, i), 'clip ' + i);
assert.equal(audioBudget(m.state()).ok, true, 'the 64th clip has room');
const first = m.state().clips[0].id;
assert.ok(m.duplicate(first), 'the 64th by duplicate fits'); assert.equal(audioClips(m), 64);

// 64 clips: every road refuses with the add's sentence, and nothing moved
const sig = m.signature();
assert.equal(add(m, 64, A, 0, 200), null, 'create refuses at 64'); assert.equal(m.lastRefusal.why, WHY); assert.deepEqual(m.lastRefusal.vars, { n: 64 });
assert.equal(m.duplicate(first), null, 'duplicate refuses'); assert.equal(m.lastRefusal.why, WHY);
assert.equal(m.duplicate(first, true), null, 'a unique duplicate refuses too');
assert.equal(m.duplicateClips([first]), null, 'DUPLICATE (the selection) refuses'); assert.equal(m.lastRefusal.why, WHY);
const bundle = m.copyClips([first]);
assert.equal(m.pasteClips(bundle, { start: 300 }), null, 'paste refuses'); assert.equal(m.lastRefusal.why, WHY);
assert.equal(sliceClips(m, [first], m.state().clips[0].start + 2), null, 'slice refuses (it makes a second instance)');
assert.equal(m.signature(), sig, 'every refusal is whole: the document is exactly as it was');
// a curve clip is not counted and not refused
assert.ok(m.create({ targetId: 'palette.phase', name: 'C', value: 0.5, start: 400, duration: 4, laneId: m.state().lanes[0].id }), 'a plain curve clip is not an audio clip');
assert.equal(m.lastRefusal, null, 'lastRefusal is cleared by the next ask');
// deleting one makes room again, by every road
m.deleteClip(m.state().clips[1].id);
assert.ok(m.duplicate(first), 'room again');

// ATOMIC PASTE: a group of three over a 62-clip arrangement does not half-apply (62 + 3 > 64)
const g = createTimelineModel();
for (let i = 0; i < 62; i++) add(g, i);
const ids = g.state().clips.slice(0, 3).map((c) => c.id), group = g.copyClips(ids), gsig = g.signature();
assert.equal(g.pasteClips(group, { start: 500 }), null, 'a group that would pass 64 is refused whole'); assert.equal(g.lastRefusal.why, WHY);
assert.equal(g.signature(), gsig, 'no clip of the group was added');
assert.ok(g.pasteClips(g.copyClips(ids.slice(0, 2)), { start: 500 }), 'a group of two fits'); assert.equal(audioClips(g), 64);

// ATOMIC SLICE: two selected clips, room for one cut → neither is cut
const s = createTimelineModel();
for (let i = 0; i < 63; i++) add(s, i);
const [c1, c2] = s.state().clips.slice(0, 2), ssig = s.signature();
assert.equal(sliceClips(s, [c1.id, c2.id], 1), null, 'two cuts need two places; there is one: nothing is cut');
assert.equal(s.signature(), ssig);
assert.ok(sliceClips(s, [c1.id], 2) && audioClips(s) === 64, 'one cut fits');

// THE 20 MINUTES count distinct assets: a paste of a clip of another asset that would pass 1200 s is refused; the same asset costs nothing
const t = createTimelineModel();
assert.ok(add(t, 0, B)); assert.ok(add(t, 1, B));
const bun = t.copyClips([t.state().clips[0].id]);
assert.ok(t.pasteClips(bun, { start: 100 }), 'the same 10-minute asset again costs nothing');
const other = createTimelineModel(); add(other, 0, C);
const foreign = other.copyClips([other.state().clips[0].id]);
assert.equal(t.pasteClips(foreign, { start: 200 }), null, '600 + 700 s of distinct audio is over 20 minutes');
assert.equal(t.lastRefusal.why, 'No room: {max} minutes of audio is the budget (this would be {now}).'); assert.equal(t.lastRefusal.vars.max, 20);
assert.equal(audioClips(t), 3);

// UNDER THE ONE HISTORY a refusal adds no row, and a success adds one
const h = createHistory(), hm = createTimelineModel(); adoptTimeline(h, hm);
for (let i = 0; i < 64; i++) add(hm, i);
const rows = h.length, hid = hm.state().clips[0].id;
assert.equal(hm.duplicate(hid), null); assert.equal(hm.pasteClips(hm.copyClips([hid]), { start: 400 }), null); assert.equal(sliceClips(hm, [hid], hm.state().clips[0].start + 2), null);
assert.equal(h.length, rows, 'refusals leave no history row');
assert.equal(hm.lastRefusal === null || typeof hm.lastRefusal === 'object', true);
console.log('audio budget: create, duplicate, paste and slice all count against 64 clips / 20 minutes, refuse with the add\'s sentence, atomically, with no history row, pass.');
