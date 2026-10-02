#!/usr/bin/env node
/* tests/wakelock.node.mjs — core/wakelock.js under node with a fake platform: BASINS' wake-lock law (non-gesture contexts
 *   arm only; an armed listener asks on a granting event; the activation veto; only gesture refusals strike, three stop;
 *   a platform release re-arms), the kit's install (held while the clock plays, hold(reason), visibility), and the dump line.
 *   Also the dump-lines registry (core/describe.js) and recentRows (folders/files.js). */
import assert from 'node:assert/strict';
import { createWakeLock, installWakeLock } from '../mir/core/wakelock.js';
import { registerDumpLines, dumpLines } from '../mir/core/describe.js';
import { recentRows } from '../mir/folders/files.js';
import { KIT_KEYS, normalize } from '../mir/shell/keys.js';

let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('ok   ' + name); };
const tick = () => new Promise((r) => setTimeout(r, 0));

/** a fake target: addEventListener with signals, and fire(type, ev) */
function target() {
  const L = [];
  return {
    addEventListener(type, fn, o) { const rec = { type, fn }; L.push(rec); if (o && o.signal) o.signal.addEventListener('abort', () => { const i = L.indexOf(rec); if (i >= 0) L.splice(i, 1); }); },
    fire(type, ev = {}) { for (const r of L.slice()) if (r.type === type) r.fn({ type, ...ev }); },
    count: (type) => L.filter((r) => r.type === type).length,
  };
}
/** a fake sentinel the platform can release */
function sentinel() { const L = []; return { released: false, release() { this.released = true; return Promise.resolve(); }, addEventListener(t, fn) { L.push(fn); }, drop() { for (const f of L) f(); } }; }
/** a fake env: request() resolves a sentinel, or refuses with NotAllowedError when `refuse` */
function env(o = {}) {
  const t = target(), stat = { req: 0, acq: 0, rel: 0, refused: [] };
  const e = { hasApi: () => true, isRunning: () => (o.running ? o.running() : true), target: t,
    request: () => { stat.req++; if (o.refuse && o.refuse()) { const err = new Error('no'); err.name = 'NotAllowedError'; return Promise.reject(err); } const s = sentinel(); stat.last = s; return Promise.resolve(s); },
    onAcquire: () => stat.acq++, onRelease: () => stat.rel++, onRefuse: (nm) => stat.refused.push(nm) };
  if (o.isActive) e.isActive = o.isActive;
  return { e, t, stat };
}

await ok('a boot or resume context ARMS ONLY: it never requests, so it can never be refused', async () => {
  const { e, t, stat } = env(); const w = createWakeLock(e);
  w.acquire({ ctx: 'boot' }); await tick();
  assert.equal(stat.req, 0); assert.equal(w.state().state, 'armed'); assert.equal(t.count('pointerup'), 1);
});
await ok('an armed lock asks on a granting event: a touch on pointerup (not pointerdown), a mouse on pointerdown, a key but not Escape', async () => {
  const { e, t, stat } = env(); const w = createWakeLock(e);
  w.acquire({ ctx: 'boot' });
  t.fire('pointerdown', { pointerType: 'touch' }); await tick(); assert.equal(stat.req, 0, 'a touch pointerdown is no grant');
  t.fire('keydown', { key: 'Escape' }); await tick(); assert.equal(stat.req, 0, 'Escape is no grant');
  t.fire('pointerup', { pointerType: 'touch' }); await tick();
  assert.equal(stat.req, 1); assert.equal(w.state().state, 'held'); assert.equal(w.state().attempts.gesture, 1); assert.equal(w.state().attempts.boot, 0);
  assert.equal(t.count('pointerup'), 0, 'the arm is gone once held');
});
await ok('the activation veto: a TRUSTED granting event with no live activation spends nothing and stays armed; a constructed one is never vetoed', async () => {
  const { e, t, stat } = env({ isActive: () => false }); const w = createWakeLock(e);
  w.acquire({ ctx: 'resume' });
  t.fire('pointerup', { pointerType: 'touch', isTrusted: true }); await tick();
  assert.equal(stat.req, 0); assert.equal(w.state().skips, 1); assert.equal(w.state().armed, true);
  t.fire('pointerup', { pointerType: 'touch', isTrusted: false }); await tick();
  assert.equal(stat.req, 1); assert.equal(w.state().held, true);
});
await ok('only gesture refusals strike; a refusal re-arms; three in a row stop the asking (denied)', async () => {
  const { e, t, stat } = env({ refuse: () => true }); const w = createWakeLock(e);
  w.acquire({ gesture: true, ctx: 'gesture' }); await tick(); await tick();
  assert.equal(w.state().denials, 1); assert.equal(w.state().armed, true, 're-armed after a refusal');
  t.fire('keydown', { key: 'a' }); await tick(); await tick();
  t.fire('keydown', { key: 'a' }); await tick(); await tick();
  assert.equal(w.state().state, 'denied'); assert.equal(stat.refused.length, 3);
  t.fire('keydown', { key: 'a' }); await tick();
  assert.equal(stat.req, 3, 'nothing asks after the third strike');
});
await ok('a platform release re-arms while running; release() lets go and counts it', async () => {
  const { e, t, stat } = env(); const w = createWakeLock(e);
  w.acquire({ gesture: true }); await tick();
  stat.last.drop();
  assert.equal(w.state().held, false); assert.equal(w.state().state, 'armed'); assert.equal(w.state().armCtx, 'resume');
  t.fire('pointerdown', { pointerType: 'mouse' }); await tick();
  assert.equal(w.state().held, true);
  w.release(); assert.equal(stat.rel, 1); assert.equal(stat.last.released, true); assert.equal(w.state().state, 'released');
});
await ok('installWakeLock: held while the clock plays (a play inside a gesture asks at once), let go on pause; hold(reason) holds it too', async () => {
  let playing = false; const subs = new Set();
  const clock = { isPlaying: () => playing, onChange: (f) => { subs.add(f); return () => subs.delete(f); } };
  const t = target(); let active = true; const req = [];
  const nav = { wakeLock: { request: () => { const s = sentinel(); req.push(s); return Promise.resolve(s); } }, userActivation: { get isActive() { return active; } } };
  const doc = { visibilityState: 'visible', addEventListener() {} };
  const W = installWakeLock({ clock, nav, target: t, doc });
  playing = true; for (const f of subs) f(); await tick();
  assert.equal(req.length, 1); assert.equal(W.state().held, true);
  playing = false; for (const f of subs) f(); await tick();
  assert.equal(W.state().held, false); assert.equal(req[0].released, true);
  active = false;                                            // a hold from no gesture arms; the next touch asks
  const off = W.hold('record'); await tick();
  assert.equal(W.state().armed, true); assert.deepEqual(W.state().holds, ['record']);
  active = true; t.fire('pointerup', { pointerType: 'touch' }); await tick();
  assert.equal(W.state().held, true);
  assert.match(W.line(), /^wakeLock {4}held {2}\(sentinel held\).*held for: record/);
  assert.equal(off(), true); await tick(); assert.equal(W.state().held, false); assert.equal(off(), false);
  assert.ok(dumpLines().some((l) => l.startsWith('wakeLock')), 'its line is in every dump');
  W.destroy();
  assert.ok(!dumpLines().some((l) => l.startsWith('wakeLock')), 'destroy takes the line away');
});
await ok('a hidden page is never held: running is false while hidden', async () => {
  const clock = { isPlaying: () => true, onChange: () => () => {} };
  const nav = { wakeLock: { request: () => Promise.resolve(sentinel()) }, userActivation: { isActive: true } };
  const W = installWakeLock({ clock, nav, target: target(), doc: { visibilityState: 'hidden', addEventListener() {} } });
  await tick(); assert.equal(W.state().held, false); W.destroy();
});
await ok('dump lines: by name, replaced by a second registration, a producer that throws is one line, off() removes', async () => {
  const off1 = registerDumpLines('t1', () => ['one', 'two']);
  const off2 = registerDumpLines('t2', () => { throw new Error('boom'); });
  const off3 = registerDumpLines('t1', () => ['ONE']);
  const L = dumpLines();
  assert.ok(L.includes('ONE') && !L.includes('one'));
  assert.ok(L.includes('t2  [dump producer threw: boom]'));
  assert.equal(off1(), false, 'the replaced registration is gone already');
  off3(); off2(); assert.ok(!dumpLines().includes('ONE') && !dumpLines().some((l) => l.startsWith('t2')));
});
await ok('recentRows: the newest five as ↺ rows, raw names, the folder (or ROOT) in the hint', async () => {
  const E = (i, at, folder = '') => ({ id: 'e' + i, name: 'P' + i, folder, at });
  const opened = [];
  const rows = recentRows([E(1, 10), E(2, 70, 'live/sets'), E(3, 30), E(4, 40), E(5, 50), E(6, 60)], 5, (id) => opened.push(id));
  assert.deepEqual(rows.map((r) => r[0]), ['↺  P2', '↺  P6', '↺  P5', '↺  P4', '↺  P3']);
  assert.equal(rows[0][3], 'live/sets / P2'); assert.equal(rows[1][3], 'ROOT / P6'); assert.deepEqual(rows[0][4], { raw: true });
  rows[0][1](); assert.deepEqual(opened, ['e2']);
  assert.deepEqual(recentRows({ entries: () => [E(9, 1)] }).map((r) => r[0]), ['↺  P9']);
});
await ok('the kit\'s key table is BASINS\': S FOLDERS, F full screen, B rack, T dock, H hide, M, J, Space', async () => {
  assert.deepEqual({ ...KIT_KEYS }, { 'transport.play': 'Space', save: 'Mod+S', folders: 'S', modulation: 'M', notebook: 'J', rack: 'B', dock: 'T', hide: 'H', fullscreen: 'F', help: '?' });
  for (const c of Object.values(KIT_KEYS)) assert.ok(normalize(c), c + ' parses');
  assert.equal(new Set(Object.values(KIT_KEYS).map((c) => normalize(c))).size, Object.keys(KIT_KEYS).length, 'no chord twice');
});
console.log(`\n${n} passed`);
