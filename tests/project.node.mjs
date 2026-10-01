/* project.node.mjs — the project's parts: capture, restore, signature, order, and a part that throws.  node tests/project.node.mjs */
import assert from 'node:assert/strict';
import { createProjectParts, registerProjectPart, captureProject, restoreProject, projectSignature, projectPartNames } from '../mir/core/project.js';

const P = createProjectParts();
let accents = { a: 180, b: 20 }, heard = [];
const subs = new Set();
const off = P.register('accent', { capture: () => ({ ...accents }), restore: (s) => { if (s) accents = { ...s }; }, signature: () => JSON.stringify(accents), subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); } });
const unwatch = P.subscribe((name) => heard.push(name));
for (const fn of subs) fn();
assert.deepEqual(heard, ['accent'], 'a part saying it changed reaches the project watcher, by name');
unwatch(); for (const fn of subs) fn(); assert.equal(heard.length, 1, 'an unwatched watcher hears nothing');

/* capture leaves out a part with nothing to say, and a part that throws */
P.register('empty', { capture: () => null, restore() {} });
P.register('boom', { capture: () => { throw new Error('x'); }, restore: () => { throw new Error('y'); } });
assert.deepEqual(P.capture(), { accent: { a: 180, b: 20 } });

/* restore: order is registration order; a throwing part does not take the others down and is named */
const order = []; let tail = 'untouched';
P.register('tail', { capture: () => 't', restore: (s) => { order.push('tail'); tail = s; } });
P.register('accent', { capture: () => ({ ...accents }), restore: (s) => { order.push('accent'); if (s) accents = { ...s }; } });   // re-register: keeps its slot
assert.deepEqual(P.names(), ['accent', 'empty', 'boom', 'tail']);
const r = P.restore({ accent: { a: 0, b: 240 }, tail: 'T' }, { from: 'test' });
assert.deepEqual(order, ['accent', 'tail']); assert.deepEqual(r, { failed: ['boom'] });
assert.deepEqual(accents, { a: 0, b: 240 }); assert.equal(tail, 'T');

/* a project that never had the part restores it with null; the part decides */
order.length = 0; tail = 'x';
P.restore(undefined); assert.equal(tail, null); P.restore('not an object'); assert.equal(tail, null);
assert.deepEqual(accents, { a: 0, b: 240 }, 'a legacy project leaves a part that ignores null alone');
const seen = []; P.register('ctx', { capture: () => 1, restore: (s, ctx) => seen.push([s, ctx]) });
P.restore({ ctx: 7 }, 'C'); assert.deepEqual(seen, [[7, 'C']]);
assert.equal(Object.hasOwn(P.capture(), 'empty'), false);

/* signature: per part, `name:?` for one that throws, JSON of capture() when it has no signature of its own */
const sig = P.signature();
assert.ok(sig.includes('boom:?') && sig.includes('tail:"t"') && sig.includes('ctx:1'), sig);
const sig0 = P.signature(); accents = { a: 1, b: 2 }; assert.notEqual(P.signature(), sig0);

/* unregister: gone, and a stale unregister cannot remove the part that replaced it */
const offX = P.register('x', { capture: () => 1, restore() {} });
const offX2 = P.register('x', { capture: () => 2, restore() {} });
offX(); assert.ok(P.names().includes('x')); offX2(); assert.ok(!P.names().includes('x'));
off(); assert.ok(P.names().includes('accent'), 'the first registration of accent was replaced, so its unregister is stale');
assert.throws(() => P.register('bad', { capture() {} }), /capture and restore/);
assert.throws(() => P.register('', { capture() {}, restore() {} }));

/* a part whose subscribe throws still registers */
P.register('shy', { capture: () => 1, restore() {}, subscribe: () => { throw new Error('no'); } });
assert.ok(P.names().includes('shy'));

/* the shared instance is the app's, and starts empty */
assert.deepEqual(projectPartNames(), []); assert.deepEqual(captureProject(), {}); assert.equal(projectSignature(), '');
const offS = registerProjectPart('s', { capture: () => 5, restore() {} });
assert.deepEqual(captureProject(), { s: 5 }); assert.deepEqual(restoreProject({ s: 5 }), { failed: [] }); offS();

console.log('Project parts: capture skips null and throwers; restore in registration order, null for a missing part, a thrower named and the rest restored; signatures; unregister by identity — all pass.');
