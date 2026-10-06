/* audio-zip.node.mjs — BASINS tools/test-project-zip.mjs, ported (2026-10-05) with its assertions, over the kit's split:
 * core/assets.js (the store by content hash), folders/zip.js (projectZip, readProjectZip, restoreAssets, rollbackAssets).
 * A project with an audio clip round-trips through the ZIP with its asset's bytes; importing the same ZIP again skips the asset
 * already in the store; a tampered ZIP is refused by its CRC and the store is untouched.  Added: the store's own contract, a
 * hostile entry, an asset whose bytes do not hash to its name, and the rollback. */
import assert from 'node:assert/strict';
import { createTimelineModel, isTimelineSnapshot } from '../mir/timeline/model.js';
import { audioSource } from '../mir/timeline/audio-kind.js';
import { analyseAudio } from '../mir/timeline/audio-analysis.js';
import { createAssetStore, assetId, toBase64, fromBase64 } from '../mir/core/assets.js';
import { readStoredZip, StoredZip } from '../mir/core/zip.js';
import { projectZip, readProjectZip, restoreAssets, rollbackAssets, projectAssetIds, zipProject } from '../mir/folders/zip.js';

const store = createAssetStore({ name: 'test-assets' });             // no IndexedDB in node: the memory fallback, the same API

// THE STORE: bytes by content hash, meta cached, copied in, listed, deleted
const bytes0 = Uint8Array.from([1, 2, 3, 4, 5]), id0 = await assetId(bytes0);
assert.match(id0, /^[a-f0-9]{32}$/); assert.equal(await assetId(bytes0.slice()), id0, 'the same bytes are the same asset');
assert.notEqual(await assetId(Uint8Array.from([1, 2, 3, 4, 6])), id0);
await store.put({ id: id0, name: 'five.bin', seconds: 1 }, bytes0); bytes0[0] = 99;
assert.deepEqual([...(await store.bytes(id0))], [1, 2, 3, 4, 5], 'the caller\'s buffer is copied, never held');
assert.equal(store.meta(id0).name, 'five.bin'); assert.deepEqual(await store.list(), [id0]);
await store.delete(id0); assert.equal(await store.load(id0), null); assert.equal(await store.bytes(id0), null); assert.deepEqual(await store.list(), []);

// A synthetic half-second tone, its asset, and a Timeline that drives palette.phase from it.
const SR = 48000, SECONDS = 0.5;
const pcm = Float32Array.from({ length: SR * SECONDS }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 440 * i / SR));
const a = analyseAudio([pcm], SR), bytes = new Uint8Array(pcm.buffer.slice(0));
const meta = { id: await assetId(bytes), name: 'tone.wav', type: 'audio/wav', seconds: a.seconds, sampleRate: SR, channels: 1, peaks: a.peaks, envelopes: a.envelopes };
await store.put(meta, bytes);
const m = createTimelineModel(), lane = m.state().lanes[0].id, src = audioSource(meta, { bpm: 120, keep: true });
const clipId = m.create({ targetId: 'palette.phase', name: 'TONE', value: 0, start: 0, duration: src.length, laneId: lane, source: src });
assert.ok(clipId, 'the audio clip is created');
const snap = m.serialize();
assert.ok(isTimelineSnapshot(snap), 'the Timeline is a valid snapshot');

// THE PROJECT as FOLDERS captures it: the kit's parts (the timeline and the asset manifest), plus the name it is saved under
const project = { parts: { timeline: snap, assets: { audio: [{ id: meta.id, name: 'tone.wav', seconds: a.seconds }] } }, name: 'ZIP ROUND TRIP' };
assert.deepEqual(projectAssetIds(project), [meta.id], 'the ids a project names (the kit\'s shape)');
assert.deepEqual(projectAssetIds({ timeline: snap }), [meta.id], '… and BASINS\' own shape');
assert.deepEqual(projectAssetIds({ parts: { assets: { audio: [{ id: 'nope' }] } }, timeline: { curves: [{ kind: 'audio', assetId: '../x' }] } }), [], 'a bad id names nothing');

// ROUND TRIP: the zip carries project.json and the asset's bytes plus its analysis json.
const zip = await projectZip(project, { store }), files = readStoredZip(new Uint8Array(await zip.arrayBuffer()));
assert.ok(files.has('project.json') && files.has(`assets/audio/${meta.id}.wav`) && files.has(`assets/audio/${meta.id}.json`), 'the zip carries the project and the asset');
assert.deepEqual(files.get(`assets/audio/${meta.id}.wav`), bytes, 'the asset bytes ride stored, not deflated');

await store.delete(meta.id);
assert.equal(await store.bytes(meta.id), null, 'the asset is gone before the import');
const read = await readProjectZip(zip);
assert.deepEqual(read.project, JSON.parse(JSON.stringify(project)), 'the project reads back exactly');
assert.equal(await store.bytes(meta.id), null, 'READING writes nothing: the caller validates first');
const put = await restoreAssets(read, { store });
assert.deepEqual(put.restored, [meta.id], 'the asset is restored'); assert.deepEqual(put.skipped, [], 'a missing asset is written, not skipped'); assert.deepEqual(put.written, [meta.id]);
const reloaded = await store.load(meta.id);
assert.equal(reloaded.seconds, meta.seconds, 'the asset is back in the store');
assert.equal((await store.bytes(meta.id)).length, bytes.length, 'its bytes are back too');
assert.deepEqual(reloaded.peaks[2].data, a.peaks[2].data, 'the peaks come back as Int8');
assert.deepEqual(fromBase64(toBase64(Uint8Array.from([0, 255, 7]))), Uint8Array.from([0, 255, 7]));

// SKIPPING AN ASSET ALREADY PRESENT: opening the same zip again writes nothing a second time.
const again = await restoreAssets(await readProjectZip(zip), { store });
assert.deepEqual(again.restored, [meta.id]); assert.deepEqual(again.skipped, [meta.id], 'an asset already in the store is skipped, not rewritten'); assert.deepEqual(again.written, []);

// A TAMPERED ZIP IS REFUSED: one flipped byte inside project.json's own payload (byte 42: a 30-byte local header plus
// "project.json"'s 12-byte name) fails its CRC — readProjectZip throws, and the store is untouched.
const raw = new Uint8Array(await zip.arrayBuffer()), tampered = raw.slice();
tampered[42] ^= 0xff;
await assert.rejects(() => readProjectZip(new Blob([tampered])), /CRC/, 'a tampered zip is refused by its CRC, not silently accepted');
assert.equal((await store.load(meta.id)).seconds, meta.seconds, 'the store is unchanged by the refused import');

// AN ASSET WHOSE BYTES DO NOT HASH TO ITS NAME is rejected, not restored (a swapped file under a good name)
const evil = new StoredZip(), enc = new TextEncoder(), fakeId = 'd'.repeat(32);
evil.add('project.json', enc.encode('{"name":"X"}')); evil.add(`assets/audio/${fakeId}.json`, enc.encode(JSON.stringify({ id: fakeId, name: 'x.wav', peaks: [] })));
evil.add(`assets/audio/${fakeId}.wav`, Uint8Array.from([9, 9, 9])); evil.add('../../escape.txt', enc.encode('x'));
const er = await readProjectZip(evil.finish());
assert.deepEqual(er.rejected, [fakeId], 'bytes that do not hash to the id are rejected'); assert.deepEqual(er.assets, []);
assert.equal((await restoreAssets(er, { store })).written.length, 0);
assert.equal(await readProjectZip(new StoredZip().finish()).then((r) => r.project), null, 'a zip with no project.json reads as no project');

// ROLLBACK: a write that fails partway gives back what the call wrote, and says so by throwing; rollbackAssets deletes only what it is given
const flaky = createAssetStore({ name: 'flaky' }), realPut = flaky.put; let n = 0;
flaky.put = async (m2, b2) => { if (++n === 2) throw new Error('quota'); return realPut(m2, b2); };
const two = { assets: [{ id: 'e'.repeat(32), meta: { id: 'e'.repeat(32), peaks: [] }, bytes: Uint8Array.from([1]) }, { id: 'f'.repeat(32), meta: { id: 'f'.repeat(32), peaks: [] }, bytes: Uint8Array.from([2]) }] };
await assert.rejects(() => restoreAssets(two, { store: flaky }), /quota/);
assert.deepEqual(await flaky.list(), [], 'the first asset this call wrote was given back');
await store.put({ id: 'a1'.repeat(16), peaks: [] }, Uint8Array.from([1])); await rollbackAssets(['b2'.repeat(16)], { store });
assert.deepEqual((await store.list()).includes('a1'.repeat(16)), true, 'rollback deletes only the ids it was given');
// SAVE AS ZIP's project (BASINS parity, round seven): the app's parts need no capture (no engine); an unopened project is UNTITLED, not
// the app's default name; a shown entry names the live project
let captured = 0; const capture = async () => { captured++; return { payload: { look: 'captured' } }; };
const live = await zipProject({ entry: null, parts: () => ({ timeline: { clips: [] }, look: 'session' }), capture });
assert.deepEqual([live.name, live.project.name, live.project.look, captured], ['UNTITLED', 'UNTITLED', 'session', 0], 'parts() is the project, read with no capture; an unopened project is UNTITLED');
const named = await zipProject({ entry: { name: 'PEAS IN A POD', payload: { look: 'saved' } }, capture });
assert.deepEqual([named.name, named.project.look, captured], ['PEAS IN A POD', 'captured', 1], 'without parts the live capture is the project, named after the entry shown');
console.log('audio zip: the store by content hash, project + asset round trip, a second import skips, a tampered zip refused by its CRC, a swapped asset rejected, a failed write rolled back, SAVE AS ZIP\'s project (parts, UNTITLED) pass.');
