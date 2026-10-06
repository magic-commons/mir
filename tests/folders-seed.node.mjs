/* folders-seed.node.mjs — BASINS tools/test-starter-gallery.mjs, ported (2026-10-05) with its assertions: a changed bundled starter
 * replaces its previous revision IN PLACE (id, name, folder, folder pictures and the seq kept), never a same-name user save;
 * idempotent (the second seed writes nothing); a full library, a quota and another tab's write leave the gallery exactly as it was
 * (the next load retries); an unreadable store is not touched.  The kit's rule is the starter's `revision` (facts.seedRevision);
 * `replaces(entry)` is the app's own test for entries that predate it (BASINS: starter id + source id + date). */
import assert from 'node:assert/strict';
import { createFiles } from '../mir/folders/files.js';
import { seed, refreshes } from '../mir/folders/seed.js';

const next = { id: 'peas-in-a-pod', name: 'PEAS IN A POD', folder: 'STARTERS', data: { parts: { look: { v: 2 } } }, thumbnail: 'data:image/jpeg;base64,NEW', at: 1790999999999, revision: 2, readOnly: true, facts: { depth: 96 } };
const old = { id: 'f4', name: 'MY RENAMED STARTER', folder: 'STARTERS', at: 1790783700849, thumb: 'data:image/jpeg;base64,OLD', payload: { parts: { look: { old: true } } }, bytes: 10, facts: { starterId: 'peas-in-a-pod', sourceId: 'f41' } };
const user = { id: 'f40', name: 'PEAS IN A POD', folder: 'STARTERS 2', at: 1790000000000, thumb: '', payload: { parts: { look: { mine: true } } }, bytes: 10, facts: { depth: 96.12116772627564 } };
const env = { kit: 'MIR files', formatVersion: 1, seq: 40, entries: [old, user], folders: { STARTERS: { pictureId: 'f4' } } };
// a key-aware storage; `raw` and `writes` are the library's own key ('test'): the seeded list lives under another
const memory = (raw, seeded = true) => { const m = new Map([['test', raw]]), s = { writes: 0, get raw() { return m.get('test'); }, set raw(v) { m.set('test', v); },
  getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (k === 'test') s.writes++; m.set(k, String(v)); } }; if (seeded) m.set('test.seeded', JSON.stringify(['peas-in-a-pod', 'z'])); return s; };   // BASINS had seeded it long ago
// BASINS' entries predate seedId: the app names its previous revision itself (starter id + source id + date), as BASINS' rule did
const bundled = { ...next, replaces: (e) => e.facts?.starterId === 'peas-in-a-pod' && e.facts.sourceId === 'f41' && e.at === 1790783700849 };

const st = memory(JSON.stringify(env)), files = createFiles({ key: 'test', storage: st });
let r = seed(files, [bundled], { storage: st, seededKey: 'test.seeded' });
assert.equal(r.ok, true); assert.equal(r.refreshed, 1, 'the previous revision is replaced');
const after = JSON.parse(st.raw), a0 = after.entries[0];
assert.deepEqual(a0.payload, next.data); assert.equal(a0.id, 'f4'); assert.equal(a0.name, old.name, 'id and name are kept'); assert.equal(a0.folder, 'STARTERS');
assert.equal(a0.thumb, next.thumbnail); assert.equal(a0.at, next.at); assert.equal(a0.facts.seedRevision, '2'); assert.equal(a0.facts.seedId, 'peas-in-a-pod'); assert.equal(a0.facts.readOnly, true); assert.equal(a0.facts.depth, 96);
assert.deepEqual(after.entries[1], user, 'a same-name user save is never touched'); assert.deepEqual(after.folders, env.folders, 'the folder pictures are kept'); assert.equal(after.seq, 40);
// idempotent: the entry now records the revision
const writes = st.writes; r = seed(files, [bundled], { storage: st, seededKey: 'test.seeded' });
assert.equal(r.refreshed, 0); assert.equal(st.writes, writes, 'nothing is written the second time');
// a user entry without the app's fingerprint, and a starter with no revision, are not refreshed even if the payload matches
assert.deepEqual(refreshes(files, [{ ...next, revision: 3, replaces: undefined }]).map((u) => u.id), ['f4'], 'by seedId alone, the recorded entry follows a new revision');
assert.deepEqual(refreshes(files, [{ ...next, revision: undefined }]), [], 'no revision, no refresh');
assert.deepEqual(refreshes(files, [{ ...next, id: 'other', revision: 3 }]), [], 'another starter\'s entries are not this one\'s');

// A FULL LIBRARY refuses the whole refresh and leaves the gallery as it was (cap: growth is refused, never a shrinking write)
const big = { ...bundled, data: { parts: { look: { pad: 'x'.repeat(3000) } } } };
const st2 = memory(JSON.stringify(env)), f2 = createFiles({ key: 'test', storage: st2, capChars: JSON.stringify(env).length + 1000 }), before2 = st2.raw;
r = seed(f2, [big], { storage: st2, seededKey: 'test.seeded' });
assert.equal(r.refreshed, 0); assert.equal(r.refreshFailed.full, true); assert.equal(st2.raw, before2, 'a full library keeps the old gallery'); assert.equal(st2.writes, 0);
// A QUOTA refuses it and keeps the gallery in memory too
const st3 = memory(JSON.stringify(env)); st3.setItem = () => { throw new Error('quota'); };
const f3 = createFiles({ key: 'test', storage: st3 }); r = seed(f3, [bundled], { storage: st3, seededKey: 'test.seeded' });
assert.equal(r.refreshFailed.ok, false); assert.equal(f3.entry('f4').payload.parts.look.old, true, 'the live library rolled back');
// ANOTHER TAB wrote meanwhile: refused, the next attempt reloads and applies on top
const st4 = memory(JSON.stringify(env)), f4 = createFiles({ key: 'test', storage: st4 }); f4.entries();
const other = JSON.parse(st4.raw); other.entries.push({ ...user, id: 'f41', name: 'THEIRS' }); other.seq = 41; st4.raw = JSON.stringify(other);
r = seed(f4, [bundled], { storage: st4, seededKey: 'test.seeded' });
assert.equal(r.refreshed, 1, 'the library reloaded the other tab\'s write first, then applied on top'); assert.equal(JSON.parse(st4.raw).entries.some((e) => e.name === 'THEIRS'), true, 'the other tab\'s save survives');
// an unreadable store is not touched by a refresh (it has no entries to refresh)
const st5 = memory('{bad'), f5 = createFiles({ key: 'test', storage: st5 }); r = seed(f5, [{ ...bundled, id: 'z', replaces: undefined }], { storage: st5, seededKey: 'test.seeded' });
assert.equal(r.refreshed, 0); assert.equal(st5.raw.startsWith('{"kit"') || st5.raw === '{bad', true);
console.log('folders seed: a changed bundled starter is refreshed in place, never a user save, idempotent; full, quota and another tab\'s write keep the gallery; pass.');
