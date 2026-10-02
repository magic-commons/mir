#!/usr/bin/env node
/* tests/notes.node.mjs — notes/shelf.js: the shelf's store over an injected storage (pure). */
import assert from 'node:assert/strict';
import { createShelf, normPath, repair, RECENT } from '../mir/notes/shelf.js';

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };
const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
let tick = 0; const now = () => new Date(Date.UTC(2026, 9, 1, 12, 0, tick++)).toISOString();

ok('paths are cleaned; folders are path prefixes', () => {
  assert.equal(normPath(' /a//b / c.md/ '), 'a/b/c.md');
  assert.equal(normPath(''), '');
  const S = createShelf({ storage: memory(), now });
  S.save('work/ideas', { title: 'Ideas', md: 'x' }); S.save('work/deep/proof', { title: 'Proof', md: 'y' }); S.save('loose', { md: 'z' });
  assert.deepEqual(S.folders(), ['', 'work', 'work/deep']);
  const it = S.list().find((r) => r.path === 'work/deep/proof');
  assert.equal(it.folder, 'work/deep'); assert.equal(it.name, 'proof');
  assert.equal(S.get('loose').title, 'loose', 'a note saved with no title takes its name');
});
ok('save and SAVE AS: the same page under two paths are two notes', () => {
  const st = memory(), S = createShelf({ storage: st, now });
  assert.equal(S.save('a', { title: 'A', md: 'one' }), 'a');
  assert.equal(S.save('b', S.get('a')), 'b');
  S.save('a', { title: 'A', md: 'two' });
  assert.equal(S.get('a').md, 'two'); assert.equal(S.get('b').md, 'one');
  assert.equal(S.save('  ', { md: 'q' }), null); assert.match(S.error, /name/);
  const stored = JSON.parse(st.getItem('mir.notes'));
  assert.deepEqual(Object.keys(stored).sort(), ['items', 'recent']);
  assert.deepEqual(Object.keys(stored.items.a).sort(), ['folder', 'md', 'name', 'opened', 'path', 'saved', 'title']);
});
ok('the shelf has its own key and touches no other', () => {
  const st = memory({ 'mir.folders': '{"x":1}' }), S = createShelf({ storage: st, now });
  S.save('a', { md: '1' });
  assert.equal(st.getItem('mir.folders'), '{"x":1}');
  assert.deepEqual([...st.m.keys()].sort(), ['mir.folders', 'mir.notes']);
});
ok('rename moves the note, keeps recent true, refuses a taken name', () => {
  const S = createShelf({ storage: memory(), now });
  S.save('a', { title: 'A', md: '1' }); S.save('b', { md: '2' });
  assert.equal(S.rename('a', 'f/a2'), 'f/a2');
  assert.equal(S.get('a'), null); assert.equal(S.get('f/a2').md, '1');
  assert.ok(S.recent().includes('f/a2') && !S.recent().includes('a'));
  assert.equal(S.rename('b', 'f/a2'), null); assert.match(S.error, /exists/);
  assert.equal(S.rename('nope', 'x'), null);
});
ok('delete removes it from the list and from recent', () => {
  const S = createShelf({ storage: memory(), now });
  S.save('a', { md: '1' }); assert.equal(S.remove('a'), true); assert.equal(S.remove('a'), false);
  assert.equal(S.list().length, 0); assert.deepEqual(S.recent(), []);
});
ok('recent holds the last five saved or opened, newest first', () => {
  const S = createShelf({ storage: memory(), now });
  for (const p of ['1', '2', '3', '4', '5', '6', '7']) S.save(p, { md: p });
  assert.equal(RECENT, 5); assert.deepEqual(S.recent(), ['7', '6', '5', '4', '3']);
  assert.deepEqual(S.open('1'), { title: '1', md: '1' });
  assert.deepEqual(S.recent(), ['1', '7', '6', '5', '4']);
});
ok('export and import: a note round-trips as a plain .md, and an import never overwrites', () => {
  const S = createShelf({ storage: memory(), now });
  const md = '# Heading\n\n$$\\int_0^1 x\\,dx$$\n\n> [!note] a callout\n';
  S.save('maths/Integrals', { title: 'Integrals', md });
  const f = S.exportNote('maths/Integrals');
  assert.deepEqual(f, { name: 'Integrals.md', text: md });
  const p = S.importNote(f.name, f.text, 'maths');
  assert.equal(p, 'maths/Integrals 2');
  assert.deepEqual(S.get(p), { title: 'Integrals', md });
});
ok('"__proto__" is an ordinary note name', () => {
  const st = memory(), S = createShelf({ storage: st, now });
  S.save('__proto__', { md: 'p' });
  assert.equal(createShelf({ storage: st, now }).get('__proto__').md, 'p');
});
ok('a corrupt store is repaired, not thrown: the raw text is kept, sound records survive', () => {
  const bad = memory({ 'mir.notes': '{not json' });
  const S = createShelf({ storage: bad, now });
  assert.equal(bad.getItem('mir.notes.corrupt'), '{not json');
  assert.deepEqual(S.list(), []); assert.equal(S.repaired.backup, 'mir.notes.corrupt');
  assert.equal(S.save('a', { md: 'works' }), 'a');

  const half = { items: { good: { path: 'good', title: 'G', md: 'kept' }, bad1: { path: 'bad1', md: 7 }, bad2: 'x', wrongKey: { path: 'other' } }, recent: ['good', 'bad1', 9] };
  const st = memory({ 'mir.notes': JSON.stringify(half) }), S2 = createShelf({ storage: st, now });
  assert.deepEqual(S2.list().map((r) => r.path), ['good']); assert.equal(S2.get('good').md, 'kept');
  assert.equal(S2.repaired.dropped, 3); assert.deepEqual(S2.recent(), ['good']);
  assert.equal(JSON.parse(st.getItem('mir.notes.corrupt')).items.bad1.md, 7, 'the dropped records are in the backup');
  assert.equal(repair('[]').broken, true); assert.equal(repair(null).broken, false);
});
ok('a storage that throws gives null and words, never an exception', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  const S = createShelf({ storage: full, now });
  assert.equal(S.save('a', { md: 'x' }), null); assert.match(S.error, /could not be saved/);
});
console.log(`\n${n} passed`);
