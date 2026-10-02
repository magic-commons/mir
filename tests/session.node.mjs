/* session.node.mjs — the live project (mir/core/session.js) and the preferences-against-project split (mir/core/prefs.js
 * migratePrefs, the refused project keys, FORGET, the settings file), with an injected storage, a fake clock-free timer
 * check and an isolated parts registry (core/project.js createProjectParts).  BASINS' behaviour: a change saves 300 ms
 * later, leaving saves now, nothing is written before RESUME / NEW, the seed of a migration reaches the app once. */
import assert from 'node:assert/strict';
import { createSession, readSession, adoptInto, openerSwitches, SESSION_V } from '../mir/core/session.js';
import { createProjectParts } from '../mir/core/project.js';
import { createPrefs, migratePrefs, forgetPrefs, settingsFileName } from '../mir/core/prefs.js';

let n = 0;
const pass = (name) => { n++; console.log(`PASS ${name}`); };
const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const target = () => { const ls = {}; return { ls, addEventListener: (t, f) => { (ls[t] ||= []).push(f); }, fire: (t) => (ls[t] || []).forEach((f) => f()) }; };
/* a part: a number the app owns, which says when it changed */
function counter(reg, name = 'colour') {
  const p = { v: 0, subs: new Set() };
  reg.register(name, { capture: () => ({ v: p.v }), restore: (s) => { p.v = s ? s.v : 0; }, signature: () => String(p.v), subscribe: (fn) => { p.subs.add(fn); return () => p.subs.delete(fn); } });
  p.set = (v) => { p.v = v; for (const f of p.subs) f(); };
  return p;
}

{
  const S = memory(), reg = createProjectParts(), c = counter(reg), win = target(), doc = target();
  const s = createSession({ key: 'app.session', storage: S, parts: reg, win, doc, delay: 20 });
  assert.equal(s.hasResume(), false, 'a cold browser has nothing to resume');
  c.set(5); await sleep(40);
  assert.equal(S.m.has('app.session'), false, 'nothing is written before the app chose RESUME or NEW');
  s.discard(); c.set(6); c.set(7);
  assert.equal(S.m.has('app.session'), false, 'a change saves soon, not now');
  await sleep(40);
  assert.deepEqual(JSON.parse(S.m.get('app.session')), { v: SESSION_V, parts: { colour: { v: 7 } } }, 'one save, the latest work');
  S.m.set('app.session', 'sentinel'); c.set(7); await sleep(40);
  assert.equal(S.m.get('app.session'), 'sentinel', 'an unchanged signature writes nothing');
  S.m.delete('app.session'); c.set(8);
  doc.visibilityState = 'hidden'; doc.fire('visibilitychange');
  assert.equal(JSON.parse(S.m.get('app.session')).parts.colour.v, 8, 'a page going hidden saves now');
  c.set(9); win.fire('pagehide');
  assert.equal(JSON.parse(S.m.get('app.session')).parts.colour.v, 9, 'pagehide saves now');
  s.destroy();
  pass('autosave: armed by the opener, 300 ms-style coalesced, skipped when unchanged, flushed on hide and pagehide');
}
{
  const S = memory({ 'app.session': JSON.stringify({ v: 1, parts: { colour: { v: 42 }, gone: 1 } }) }), reg = createProjectParts(), c = counter(reg);
  const other = { got: 'untouched' }; reg.register('accent', { capture: () => null, restore: (x, ctx) => { other.got = x; other.ctx = ctx; } });
  const s = createSession({ key: 'app.session', storage: S, parts: reg, win: null, doc: null, delay: 10 });
  assert.equal(s.hasResume(), true);
  const r = s.resume({ from: 'opener' });
  assert.deepEqual(r, { ok: true, failed: [], seeded: false });
  assert.equal(c.v, 42, 'the work comes back');
  assert.equal(other.got, null, 'a part the record never had restores with null (the part decides)');
  assert.deepEqual(other.ctx, { session: true, from: 'opener' });
  S.m.set('app.session', 'kept'); await sleep(20); assert.equal(S.m.get('app.session'), 'kept', 'a resume does not rewrite what it just read');
  s.discard(); assert.equal(S.m.has('app.session'), false, 'discard forgets the work');
  pass('resume: every part restored with { session: true }, a missing part gets null; discard forgets');
}
{
  const S = memory({ 'mandel.view': '{}' }), s = createSession({ key: 'app.session', storage: S, parts: createProjectParts(), also: ['mandel.view'], win: null, doc: null });
  assert.equal(s.hasResume(), true, 'the app\'s own view key also offers RESUME');
  assert.deepEqual(s.resume(), { ok: false, failed: [], seeded: false });
  const held = memory(), reg = createProjectParts(), c = counter(reg); let film = true;
  const h = createSession({ key: 'k', storage: held, parts: reg, hold: () => film, win: null, doc: null }); h.arm(); c.set(3);
  assert.equal(h.save(), false); film = false; assert.equal(h.save(), true);
  pass('also-keys offer RESUME; hold() keeps the session from writing (a film renders)');
}
{
  /* the migration's seed: before there was a project, and with a live one */
  const S = memory();
  assert.equal(adoptInto(S, 'p', { bpm: 90 }), true);
  assert.deepEqual(JSON.parse(S.m.get('p')), { v: 1, seed: { bpm: 90 } });
  adoptInto(S, 'p', { bpm: 120, gauges: [1] });
  assert.deepEqual(JSON.parse(S.m.get('p')).seed, { bpm: 90, gauges: [1] }, 'nothing already in the record is overwritten');
  const reg = createProjectParts(), c = counter(reg); let seen = null;
  const s = createSession({ key: 'p', storage: S, parts: reg, onSeed: (seed, o) => { seen = { seed, ...o }; }, win: null, doc: null });
  assert.equal(s.hasResume(), true);
  assert.deepEqual(s.resume(), { ok: false, failed: [], seeded: true });
  assert.deepEqual(seen, { seed: { bpm: 90, gauges: [1] }, live: false });
  c.set(1); s.flush();
  assert.deepEqual(JSON.parse(S.m.get('p')), { v: 1, parts: { colour: { v: 1 } } }, 'the next save absorbs the seed');
  /* an old record of the app's own, read by lift */
  const L = memory({ old: JSON.stringify({ v: 2, look: { a: 1 }, bpm: 77 }) });
  const lifted = readSession(L, 'old', (raw) => (raw.v === 2 ? { parts: { look: raw.look, tempo: raw.bpm } } : null));
  assert.deepEqual(lifted, { parts: { look: { a: 1 }, tempo: 77 } });
  assert.equal(readSession(L, 'old'), null, 'without lift an unknown record is not the work');
  pass('the seed reaches onSeed once and the next save absorbs it; lift reads an app\'s older record');
}
{
  /* BASINS' prefs v1 → v2: modBpm and gauges move to the project, once */
  const schema = [{ key: 'theme', type: 'enum', values: ['dark', 'light'], default: 'dark' }, { key: 'modBpm', type: 'number', min: 20, max: 300, default: 30 }];
  const S = memory({ 'app.settings': JSON.stringify({ theme: 'light', modBpm: 96, gauges: { h: 1 } }) });
  const handed = [];
  const P = createPrefs({ key: 'app.settings', schema, storage: S, doc: null, version: 2, projectKeys: ['modBpm', 'gauges'], project: (m) => { handed.push(m); return adoptInto(S, 'app.session', m); } });
  assert.deepEqual(P.migration, { ok: true, migrated: true, moved: { modBpm: 96, gauges: { h: 1 } } });
  assert.deepEqual(JSON.parse(S.m.get('app.settings')), { theme: 'light', prefsV: 2 }, 'the project keys left; the blob is marked');
  assert.deepEqual(JSON.parse(S.m.get('app.session')).seed, { modBpm: 96, gauges: { h: 1 } });
  assert.deepEqual(P.set('modBpm', 50), [], 'a project key is refused after');
  assert.equal(P.get('theme'), 'light');
  createPrefs({ key: 'app.settings', schema, storage: S, doc: null, version: 2, projectKeys: ['modBpm', 'gauges'], project: (m) => handed.push(m) });
  assert.equal(handed.length, 1, 'a migration runs once per version');
  /* a failed project write keeps them here, to try again next load */
  const F = memory({ s: JSON.stringify({ theme: 'dark', modBpm: 60 }) });
  assert.deepEqual(migratePrefs(F, 's', { version: 2, projectKeys: ['modBpm'], project: () => false }), { ok: false, moved: { modBpm: 60 } });
  assert.equal(JSON.parse(F.m.get('s')).modBpm, 60);
  assert.deepEqual(migratePrefs(memory(), 's', { version: 2 }), { ok: true, migrated: false }, 'no blob, nothing to move');
  /* the app's own reshaping runs inside the same step */
  const M = memory({ s: JSON.stringify({ old: 'x' }) });
  migratePrefs(M, 's', { version: 3, migrate: (b, from, to) => ({ theme: b.old === 'x' ? 'light' : 'dark', from, to }) });
  assert.deepEqual(JSON.parse(M.m.get('s')), { theme: 'light', from: 1, to: 3, prefsV: 3 });
  pass('prefs: the versioned migration moves project keys once, project first; write refuses them after; migrate reshapes');
}
{
  const schema = [{ key: 'theme', type: 'enum', values: ['dark', 'light'], default: 'dark' }, { key: 'blur', type: 'number', min: 0, max: 24, default: 11 }];
  const S = memory(), P = createPrefs({ key: 'g', schema, storage: S, doc: null });
  P.set({ theme: 'light', blur: 4 });
  assert.equal(JSON.parse(S.m.get('g')).prefsV, undefined, 'without a version the blob is as before');
  const env = P.settings({ app: 'basins' });
  assert.equal(env.kind, 'settings'); assert.equal(env.app, 'basins'); assert.deepEqual(env.data, { theme: 'light', blur: 4 });
  const Q = createPrefs({ key: 'h', schema, storage: memory(), doc: null });
  const r = Q.load(JSON.stringify(env));
  assert.equal(r.ok, true); assert.deepEqual(r.changed.sort(), ['blur', 'theme']);
  assert.equal(Q.load(JSON.stringify({ ...env, data: { blur: 99 } })).ok, false, 'an out-of-bounds value refuses the file');
  assert.equal(Q.load('{"mir":1,"kind":"page","data":{"title":"a","md":""}}').ok, false, 'not a settings file');
  assert.match(settingsFileName('BASINS', new Date('2026-10-02T12:00:00Z')), /^basins-settings-2026-10-02\.json$/);
  assert.deepEqual(P.forget(), { theme: 'dark', blur: 11 }); assert.equal(S.m.has('g'), false, 'FORGET wipes the key');
  P.set('blur', 3); forgetPrefs('g', S); assert.equal(S.m.has('g'), false);
  pass('DOWNLOAD SETTINGS is a settings envelope, read back by load(); FORGET and forgetPrefs wipe the key');
}
{
  assert.deepEqual(openerSwitches('?warn=0'), { warning: false, choice: 'resume' });
  assert.deepEqual(openerSwitches('?warn=1', { webdriver: true }), { warning: true, choice: null });
  assert.deepEqual(openerSwitches('', { webdriver: true }), { warning: false, choice: 'resume' });
  assert.deepEqual(openerSwitches('?starter=home'), { warning: true, choice: 'home' });
  assert.deepEqual(openerSwitches('?starter=piezo', { ids: ['home', 'resume', 'piezo'] }), { warning: true, choice: 'piezo' });
  assert.deepEqual(openerSwitches('?starter=nope'), { warning: true, choice: null });
  assert.deepEqual(openerSwitches('?classic', { direct: ['rmb', 'classic', 'nofactory'] }), { warning: true, choice: 'resume' });
  pass('opener switches: ?warn= and ?starter= as BASINS reads them');
}
console.log(`ALL ${n} session checks passed`);
