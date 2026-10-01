#!/usr/bin/env node
/* tests/pages.node.mjs — shell/pages.js: the pages model (pure). */
import assert from 'node:assert/strict';
import { createPages, pageFromNotebook, pageFile, pageFromFile } from '../mir/shell/pages.js';
import { createProjectParts } from '../mir/core/project.js';

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };

ok('an empty project has nothing to save and no greeting', () => {
  const P = createPages();
  assert.equal(P.capture(), null); assert.equal(P.greeting(), null); assert.equal(P.shouldGreet(), false);
});
ok('add, update, move, remove; ids are stable and never reused', () => {
  const P = createPages(); const seen = [];
  P.subscribe((what, id) => seen.push(what + ':' + id));
  const a = P.add({ title: 'HELLO', md: 'one' }), b = P.add({ title: 'B' }), c = P.add({ title: 'FIRST' }, 0);
  assert.deepEqual(P.list().map((p) => p.id), [c.id, a.id, b.id]);
  assert.equal(P.update(a.id, { md: 'one' }).md, 'one');                 // identical: silent
  assert.equal(P.update(a.id, { md: 'two', shared: true }).shared, true);
  assert.equal(P.move(b.id, 0), true); assert.equal(P.move(b.id, 0), false);
  assert.equal(P.remove(c.id), true); assert.equal(P.remove(c.id), false);
  assert.equal(P.add({}).id, 'p4');                                      // p3 was removed and is not reused
  assert.deepEqual(seen, ['add:p1', 'add:p2', 'add:p3', 'update:p1', 'move:p2', 'remove:p3', 'add:p4']);
  assert.throws(() => { P.list()[0].md = 'x'; });                        // copies are frozen
  assert.equal(P.update('nope', { md: 'x' }), null);
});
ok('the greeting is page 0, shown only with text and with the switch on', () => {
  const P = createPages(); const g = P.add({ title: 'G', md: '   ' });
  assert.equal(P.shouldGreet(), false);
  P.update(g.id, { md: '# hello' }); assert.equal(P.shouldGreet(), true);
  P.showOnOpen = false; assert.equal(P.shouldGreet(), false);
  assert.equal(P.capture().showOnOpen, false);
});
ok('capture and restore round-trip; a bad file is repaired, not thrown', () => {
  const P = createPages(); P.add({ title: 'A', md: 'a', shared: true }); P.add({ title: 'B', md: '$x^2$' });
  const saved = JSON.parse(JSON.stringify(P.capture())), Q = createPages();
  Q.restore(saved); assert.deepEqual(Q.capture(), saved); assert.equal(Q.signature(), P.signature());
  assert.equal(Q.add({}).id, 'p3');
  Q.restore({ pages: [{ id: 'p7', title: 1 }, { id: 'p7' }, null, { md: 'x' }] });
  assert.deepEqual(Q.list().map((p) => p.id), ['p7', 'p8', 'p9']); assert.equal(Q.list()[0].title, '1');
  Q.restore(null); assert.equal(Q.capture(), null); assert.equal(Q.showOnOpen, true);
});
ok('it is a project part', () => {
  const parts = createProjectParts(), P = createPages(); let told = 0;
  parts.register('pages', P.part()); parts.subscribe(() => told++);
  assert.deepEqual(parts.capture(), {});
  P.add({ title: 'G', md: 'hi' }); assert.equal(told, 1);
  const file = parts.capture(); assert.equal(file.pages.pages[0].md, 'hi');
  const before = parts.signature(); P.update('p1', { md: 'ho' }); assert.notEqual(parts.signature(), before);
  assert.deepEqual(parts.restore(file).failed, []); assert.equal(P.get('p1').md, 'hi');
  parts.restore({}); assert.equal(P.list().length, 0);
});
ok('a 1.4 notebook becomes the first page; a page is a .md file', () => {
  assert.equal(pageFromNotebook({ title: 'T', text: '  ' }), null);
  assert.deepEqual(pageFromNotebook({ title: 'T', subtitle: 'sub', text: 'body' }), { title: 'T', md: '*sub*\n\nbody' });
  assert.deepEqual(pageFile({ title: 'a/b: c?', md: 'x' }), { name: 'a b c.md', text: 'x' });
  assert.deepEqual(pageFromFile('C:\\notes\\The nucleus.md', '\uFEFF# hi'), { title: 'The nucleus', md: '# hi' });
  const P = createPages(); const p = P.add({ title: 'X', md: 'y', shared: true });
  assert.deepEqual(P.copyOut(p.id), { title: 'X', md: 'y' });
});
console.log(`\npages: ALL ${n} PASS`);
