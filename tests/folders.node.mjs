#!/usr/bin/env node
/* tests/folders.node.mjs — FOLDERS' pure parts over an injected storage: the library store (folders/files.js, BASINS'
 * model), the seeds (folders/seed.js) and the project adapter with its open-with-rollback (folders/project.js). */
import assert from 'node:assert/strict';
import { createFiles } from '../mir/folders/files.js';
import { seed } from '../mir/folders/seed.js';
import { createProjectAdapter, openWithRollback, emptyProject, restoreOk } from '../mir/folders/project.js';
import { createProjectParts } from '../mir/core/project.js';
import { createPages } from '../mir/shell/pages.js';

let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('ok   ' + name); };
const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { m, get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const P = (x) => ({ parts: { knob: x } });

await ok('store: save, SAVE AS, overwrite in place, rename, delete', () => {
  const st = memory(), F = createFiles({ key: 'mir.folders', storage: st });
  const a = F.save({ name: 'ONE', folder: '', payload: P(1), thumb: '' });
  assert.ok(a.ok); assert.equal(a.entry.name, 'ONE');
  const b = F.save({ name: 'ONE', folder: '', payload: P(2), thumb: '' });          // SAVE AS under a taken name: suffixed
  assert.equal(b.entry.name, 'ONE 2');
  const w = F.overwrite(a.entry.id, { payload: P(9), thumb: 'data:image/png;base64,AA' });
  assert.ok(w.ok); assert.equal(w.entry.id, a.entry.id); assert.equal(w.entry.name, 'ONE');
  assert.deepEqual(F.entry(a.entry.id).payload, P(9));
  assert.equal(F.entries().length, 2, 'overwrite made no new entry');
  assert.equal(F.rename(b.entry.id, 'two').entry.name, 'two');
  assert.equal(F.rename(b.entry.id, 'one').entry.name, 'one 2', 'names stay unique within a folder, case-insensitively');
  assert.ok(F.remove(a.entry.id).ok); assert.equal(F.entries().length, 1);
  assert.equal(F.overwrite('nope', { payload: P(0) }).ok, false);
  const again = createFiles({ key: 'mir.folders', storage: st });                      // a reload reads what was written
  assert.deepEqual(again.entries().map((e) => e.name), ['one 2']);
});

await ok('store: folders are paths — move, rename (merge), remove (to ROOT), duplicate', () => {
  const F = createFiles({ key: 'k', storage: memory() });
  const x = F.save({ name: 'X', folder: 'A', payload: P(1), thumb: '' }).entry;
  F.save({ name: 'Y', folder: 'A/deep', payload: P(2), thumb: '' });
  F.save({ name: 'X', folder: 'B', payload: P(3), thumb: '' });
  assert.deepEqual(F.folders(), ['A', 'A/deep', 'B']);
  assert.equal(F.move(x.id, 'C/new').entry.folder, 'C/new', 'a move makes the path');
  const r = F.renameFolder('C/new', 'B');
  assert.ok(r.ok); assert.equal(F.entry(x.id).folder, 'B'); assert.equal(F.entry(x.id).name, 'X 2', 'a merge suffixes the clash');
  assert.ok(F.deleteFolder('A').ok);
  assert.deepEqual(F.entries().filter((e) => e.folder === '').map((e) => e.name).sort(), ['Y'], 'the folder\'s contents go to ROOT');
  const dup = F.save({ name: F.entry(x.id).name, folder: 'B', payload: F.entry(x.id).payload, thumb: '' });   // DUPLICATE is a save of a copy
  assert.equal(dup.entry.name, 'X 3'); assert.deepEqual(dup.entry.payload, P(1));
});

await ok('store: a corrupt record is skipped, the rest kept, the raw set aside before the first write — never thrown', () => {
  const good = { id: 'f1', name: 'GOOD', folder: '', at: 1, thumb: '', payload: P(1), facts: {} };
  const raw = JSON.stringify({ kit: 'MIR files', formatVersion: 1, seq: 2, entries: [good, { id: 'f2', name: 7, folder: null }], folders: {} });
  const st = memory({ 'mir.folders': raw }), F = createFiles({ key: 'mir.folders', storage: st });
  assert.deepEqual(F.entries().map((e) => e.name), ['GOOD']);
  assert.equal(F.state().refusedPending, true); assert.equal(F.state().stat.repaired, 1);
  assert.ok(F.save({ name: 'NEW', folder: '', payload: P(2), thumb: '' }).ok);
  const aside = [...st.m.keys()].find((k) => k.startsWith('mir.folders.refused-'));
  assert.ok(aside, 'the original text was set aside'); assert.equal(st.getItem(aside), raw);
  assert.equal(F.entries().find((e) => e.name === 'NEW').id, 'f3', 'no id is reused, not even a skipped record\'s');
  const junk = memory({ 'mir.folders': '{not json' }), G = createFiles({ key: 'mir.folders', storage: junk });
  assert.deepEqual(G.entries(), []);
  assert.ok(G.save({ name: 'A', folder: '', payload: P(1), thumb: '' }).ok);
  assert.ok([...junk.m.keys()].some((k) => k.startsWith('mir.folders.refused-')), 'unreadable text is kept aside, not overwritten');
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, get length() { return 0; }, key: () => null };
  const H = createFiles({ key: 'k', storage: broken });
  const r = H.save({ name: 'A', folder: '', payload: P(1), thumb: '' });
  assert.equal(r.ok, false); assert.ok(r.quota, 'a refusing browser is a refusal, not a throw');
});

await ok('seeds: added once, never over the user\'s, a deleted one stays deleted, read-only kept', () => {
  const st = memory(), F = createFiles({ key: 'mir.folders', storage: st });
  F.save({ name: 'ORBIT', folder: 'STARTERS', payload: P('mine'), thumb: '' });       // the user's own, same name
  const list = [{ name: 'ORBIT', folder: 'STARTERS', data: P('ship'), readOnly: true }, { name: 'SPIRAL', folder: 'STARTERS', data: P('s') }];
  const r1 = seed(F, list, { storage: st });
  assert.deepEqual([r1.ok, r1.added], [true, 2]);
  const names = F.entries().map((e) => e.name).sort();
  assert.deepEqual(names, ['ORBIT', 'ORBIT 2', 'SPIRAL']);
  assert.deepEqual(F.entries().find((e) => e.name === 'ORBIT').payload, P('mine'), 'the user\'s ORBIT is untouched');
  assert.equal(F.entries().find((e) => e.name === 'ORBIT 2').facts.readOnly, true);
  assert.equal(seed(F, list, { storage: st }).added, 0, 'a second boot adds nothing');
  F.remove(F.entries().find((e) => e.name === 'SPIRAL').id);
  assert.equal(seed(F, list, { storage: st }).added, 0, 'a deleted starter stays deleted');
  const fresh = memory(), G = createFiles({ key: 'mir.folders', storage: fresh });
  G.save({ name: 'COPY', folder: '', payload: P(1), thumb: '', facts: { seedId: 'STARTERS/SPIRAL' } });
  assert.equal(seed(G, list, { storage: fresh }).added, 1, 'a library that already holds a starter is not seeded twice');
});

/* the adapter over an isolated parts registry: two knobs, a colour, the pages, and a part that can be made to throw */
function app() {
  const reg = createProjectParts(), s = { a: 0.2, b: 0.5, colour: '#ff8800' }, pages = createPages();
  let breakOn = Symbol('never');
  for (const k of ['a', 'b', 'colour']) reg.register(k, { capture: () => s[k], restore: (v) => { s[k] = v ?? (k === 'colour' ? '#808080' : 0); } });
  reg.register('pages', pages.part());
  reg.register('fragile', { capture: () => 'ok', restore: (v) => { if (v === breakOn) throw new Error('boom'); } });
  const A = createProjectAdapter({ capture: () => ({ parts: reg.capture() }), restore: (d) => reg.restore(d && d.parts), signature: reg.signature });
  return { reg, s, pages, A, breakWith: (v) => { breakOn = v; } };
}

await ok('adapter: a good open restores every part; NEW is the empty project', async () => {
  const { s, pages, A } = app();
  pages.add({ title: 'HELLO', md: 'first page' });
  const saved = await A.capture();
  s.a = 0.9; s.colour = '#00ff00'; pages.restore(null);
  const r = await openWithRollback(A, saved);
  assert.equal(r.ok, true); assert.equal(s.a, 0.2); assert.equal(s.colour, '#ff8800'); assert.equal(pages.list()[0].title, 'HELLO');
  const e = await emptyProject(A);
  assert.equal(e.ok, true); assert.deepEqual([s.a, s.b, s.colour], [0, 0, '#808080']); assert.equal(pages.list().length, 0);
});

await ok('adapter: an open whose part throws rolls back to what was there, and says so', async () => {
  const { s, pages, A, breakWith } = app();
  pages.add({ title: 'MINE', md: 'kept' });
  const bad = { parts: { a: 0.7, b: 0.1, colour: '#123456', fragile: 'poison' } };
  breakWith('poison');
  const sig = A.signature();
  const r = await openWithRollback(A, bad);
  assert.equal(r.ok, false); assert.equal(r.rolledBack, true); assert.deepEqual(r.failed, ['fragile']);
  assert.match(r.why, /fragile/); assert.match(r.why, /back/);
  assert.deepEqual([s.a, s.b, s.colour], [0.2, 0.5, '#ff8800'], 'the knobs and the colour are what they were');
  assert.equal(pages.list()[0].title, 'MINE'); assert.equal(A.signature(), sig, 'what is on screen is exactly what was there');
  const thrower = createProjectAdapter({ capture: () => ({}), restore: () => { throw new Error('the engine is not up'); } });
  const t2 = await openWithRollback(thrower, {});
  assert.equal(t2.ok, false); assert.match(t2.why, /engine is not up/);
  assert.equal(t2.rolledBack, false, 'a rollback that fails too is said, not hidden');
  assert.deepEqual(restoreOk(undefined), { ok: true, failed: [] }); assert.equal(restoreOk(false).ok, false); assert.equal(restoreOk({ failed: ['x'] }).ok, false);
});

await ok('adapter: the default is core/project.js — capture is { parts }, empty restores every part with null', async () => {
  const A = createProjectAdapter();
  assert.ok(A.capture().parts && typeof A.capture().parts === 'object');
  assert.equal(typeof A.signature(), 'string'); assert.equal(typeof A.subscribe, 'function');
});

console.log(`folders.node: ${n} passed`);
