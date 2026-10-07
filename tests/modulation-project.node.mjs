/* modulation-project.node.mjs — THE RACK AND THE TEMPO ARE PROJECT PARTS (wave 22, Josh's call 23; modulation/project.js,
 * bind.js law 6), headless:
 *   1. an install registers 'rack' and 'bpm'; a capture carries the authored rack and the tempo; both are in the signature
 *   2. a project round trip: a route and a tempo saved, the rack and the tempo changed, the project restored → the route
 *      and the tempo are back, and the device record (law 5) says the same: one writer
 *   3. an older project (no 'rack', no 'bpm') and NEW (null) leave the rack and the tempo as they are: the device record
 *      is the fallback
 *   4. an unreadable rack or tempo is a failed part (FOLDERS rolls the open back), never a throw at the caller
 *   5. project: { save, load } translates the saved rack; project: false registers nothing; dispose unregisters */
import assert from 'node:assert/strict';
import { installModulation } from '../mir/modulation/bind.js';
import { captureProject, restoreProject, projectSignature, projectPartNames } from '../mir/core/project.js';

const fake = new Map(); globalThis.localStorage = { getItem: (k) => (fake.has(k) ? fake.get(k) : null), setItem: (k, v) => fake.set(k, String(v)), removeItem: (k) => fake.delete(k) };
const mem = {}; const store = { read: () => ({ ...mem }), write: (p) => Object.assign(mem, p) };
let x = 0.5;
const params = [{ id: 'app.x', label: 'X', min: 0, max: 1, get: () => x, set: (v) => { x = v; } }];
const mod = installModulation({ mount: null, store, params });
const M = mod.M, routes = () => M.routeList().map((r) => r.targetId);

/* 1 */
assert.ok(projectPartNames().includes('rack') && projectPartNames().includes('bpm'), 'the install registers rack and bpm: ' + projectPartNames());
mod.host.clock.setBpm(97);
const r = mod.route('lfo', 'app.x', 0.4); assert.ok(r, 'a first route');
const saved = captureProject();
assert.equal(saved.bpm, 97, 'the tempo is in the capture');
assert.ok(saved.rack && Array.isArray(saved.rack.routes) && saved.rack.routes.some((q) => q.targetId === 'app.x'), 'the authored rack is in the capture');
assert.equal(saved.rack.transport, undefined, 'the rack part carries no transport (the tempo is its own part)');
const sig0 = projectSignature();

/* 2 */
M.modReset(); mod.host.targets.sync(); mod.host.clock.setBpm(140); mod.persist();
assert.equal(routes().length, 0); assert.equal(M.transport.bpm, 140); assert.notEqual(projectSignature(), sig0, 'the rack and the tempo are in the signature');
assert.equal(mem.modulationState.transport.bpm, 140);
let res = restoreProject(JSON.parse(JSON.stringify(saved)));
assert.deepEqual(res.failed, [], 'the round trip restores: ' + res.failed);
assert.deepEqual(routes(), ['app.x'], 'the route is back'); assert.equal(M.transport.bpm, 97, 'the tempo is back');
assert.equal(projectSignature(), sig0, 'what is on screen is what was saved');
assert.ok(mem.modulationState.routes.some((q) => q.targetId === 'app.x') && mem.modulationState.transport.bpm === 97, 'the device record follows the project (one writer)');

/* 3 */
res = restoreProject({ params: { x: 0.2 } });
assert.deepEqual(res.failed, []); assert.deepEqual(routes(), ['app.x'], 'an older project keeps the rack'); assert.equal(M.transport.bpm, 97, '…and the tempo');
res = restoreProject(null);
assert.deepEqual(res.failed, []); assert.deepEqual(routes(), ['app.x'], 'NEW keeps the rack'); assert.equal(M.transport.bpm, 97, '…and the tempo');

/* 4 */
res = restoreProject({ rack: 5, bpm: 'fast' });
assert.deepEqual(res.failed.sort(), ['bpm', 'rack'], 'an unreadable rack and tempo are failed parts: ' + res.failed);
assert.deepEqual(routes(), ['app.x']); assert.equal(M.transport.bpm, 97, 'a failed part changes nothing');
mod.dispose();
assert.ok(!projectPartNames().includes('rack') && !projectPartNames().includes('bpm'), 'dispose unregisters both');

/* 5 */
let loaded = null;
const mod2 = installModulation({ mount: null, store: { read: () => ({}), write() {} }, params, project: { save: (rack) => ({ ...rack, tag: 'basins' }), load: (s) => { loaded = s.tag; const { tag, ...rack } = s; return rack; } } });
const s2 = captureProject();
assert.equal(s2.rack.tag, 'basins', 'save translates the rack the file keeps');
restoreProject(s2); assert.equal(loaded, 'basins', 'load translates it back');
mod2.dispose();
const mod3 = installModulation({ mount: null, store: { read: () => ({}), write() {} }, params, project: false });
assert.ok(!projectPartNames().includes('rack') && !projectPartNames().includes('bpm'), 'project: false registers nothing');
mod3.dispose();

console.log('PASS modulation project: rack + bpm parts registered and captured; a round trip restores both and the device record follows; an older project and NEW keep the device fallback; unreadable parts fail alone; save/load translate; project: false and dispose');
