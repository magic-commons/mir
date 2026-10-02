/* prefs.node.mjs — the look store (mir/core/prefs.js) with an injected storage, and the GUI window's schema and presets
 * (mir/shell/gui.js lookSchema, LOOK_PRESETS): defaults, set/get, repair of bad stored values, subscribe, reset, the
 * writes each option resolves to, and presets resolving to option sets with CUSTOM when they stop matching. */
import assert from 'node:assert/strict';
import { createPrefs, repair, defaults, resolve, matchPreset, coerce } from '../mir/core/prefs.js';
import { lookSchema, LOOK_PRESETS } from '../mir/shell/gui.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };
const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const schema = lookSchema();
const mk = (storage) => createPrefs({ key: 'mir.gui', schema, presets: LOOK_PRESETS, storage, doc: null });

{
  const P = mk(memory());
  assert.deepEqual(P.all(), defaults(schema));
  assert.equal(P.get('card'), 'tinted'); assert.equal(P.get('quality'), 'full'); assert.equal(P.get('glow'), true);
  assert.equal(P.preset(), 'classic', 'a fresh store is the CLASSIC look');
  pass('defaults: a fresh store is every row at home, and that is CLASSIC', `${schema.length} options`);
}
{
  const S = memory(), P = mk(S);
  assert.deepEqual(P.set('card', 'refractive'), ['card']);
  assert.equal(P.get('card'), 'refractive');
  assert.equal(JSON.parse(S.m.get('mir.gui')).card, 'refractive', 'written to the one key');
  assert.deepEqual(P.set('card', 'refractive'), [], 'the same value is no change');
  assert.deepEqual(P.set('card', 'opaque'), [], 'a value the row does not have is ignored');
  assert.deepEqual(P.set('nonsense', 1), [], 'an unknown key is ignored');
  assert.equal(P.set({ blur: 99 })[0], 'blur'); assert.equal(P.get('blur'), 40, 'a number a control hands in is clamped');
  P.set('accentA', 370); assert.equal(P.get('accentA'), 10, 'a hue wraps');
  assert.equal(mk(S).get('card'), 'refractive', 'a second store on the same storage reads it back (the reload)');
  pass('set/get: one key, clamped, wrapped, and read back by the next page', S.m.get('mir.gui').length + ' bytes');
}
{
  const bad = { card: 'opaque', frost: 3, blur: -5, veil: 'x', saturation: 9, theme: null, glow: 'yes', quality: 'ultra', accentA: 400, extra: 1 };
  const S = memory({ 'mir.gui': JSON.stringify(bad) }), P = mk(S);
  for (const k of Object.keys(bad).filter((k) => k !== 'extra')) assert.equal(P.get(k), defaults(schema)[k], k + ' repaired to its default');
  assert.equal('extra' in P.all(), false, 'an unknown stored key is dropped');
  assert.deepEqual(mk(memory({ 'mir.gui': '{not json' })).all(), defaults(schema), 'unparsable storage is a fresh store');
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  const T = mk(throwing); T.set('card', 'refractive'); assert.equal(T.get('card'), 'refractive', 'a storage that throws keeps nothing and throws nothing');
  assert.deepEqual(repair(null, schema), defaults(schema));
  assert.equal(coerce(schema.find((r) => r.key === 'blur'), NaN), undefined);
  pass('repair: unknown, wrong-typed and out-of-range stored values take the default; nothing throws');
}
{
  const P = mk(memory()), seen = [];
  const off = P.subscribe((s, changed) => seen.push([...changed]));
  P.set({ card: 'refractive', frost: 'always' }); P.set('card', 'refractive');
  off(); P.set('frost', 'off');
  assert.deepEqual(seen, [['card', 'frost']], 'one call per change, with the keys that moved; none after unsubscribe');
  const S = memory(), Q = mk(S), got = [];
  Q.set({ quality: 'light', hints: false }); Q.subscribe((s, c) => got.push(c.sort().join()));
  const r = Q.reset();
  assert.deepEqual(r, defaults(schema)); assert.equal(S.m.has('mir.gui'), false, 'reset removes the stored key');
  assert.deepEqual(got, ['hints,quality']);
  pass('subscribe and reset: the changed keys, once; reset goes home and forgets the key');
}
{
  const P = mk(memory());
  for (const id of Object.keys(LOOK_PRESETS)) { P.applyPreset(id); assert.equal(P.preset(), id, id + ' resolves to itself'); for (const [k, v] of Object.entries(LOOK_PRESETS[id])) assert.equal(P.get(k), v); }
  P.applyPreset('glass'); P.set('corners', 5);
  assert.equal(P.preset(), 'custom', 'one option off the preset is CUSTOM');
  P.set('corners', LOOK_PRESETS.glass.corners); assert.equal(P.preset(), 'glass', 'and back again');
  P.set('theme', 'light'); P.set('accentA', 120); assert.equal(P.preset(), 'glass', 'theme and accents are not part of a preset');
  assert.equal(matchPreset({ card: 'x' }, LOOK_PRESETS), 'custom');
  assert.deepEqual(P.applyPreset('nope'), []);
  pass('presets: CLASSIC, GLASS and LIGHT are option sets; CUSTOM appears when the options stop matching', Object.keys(LOOK_PRESETS).join(' · '));
}
{
  const at = (state, env = { theme: 'dark' }) => Object.fromEntries(resolve({ ...defaults(schema), ...state }, schema, env).filter((w) => w.kind !== 'run').map((w) => [w.on + ' ' + w.kind + ' ' + w.name, w.value]));
  const home = at({});
  assert.equal(home['html prop --glass-blur'], null); assert.equal(home['body prop --surface-veil'], null); assert.equal(home['body prop --surface-filter'], null);
  assert.equal(home['body prop --surface-radius'], null); assert.equal(home['html prop --relief-raise'], null); assert.equal(home['body prop --surface-shadow'], null);
  assert.equal(home['html attr data-ui-tier'], null); assert.equal(home['body class frost'], false); assert.equal(home['body attr data-card'], 'tinted');
  const g = at(LOOK_PRESETS.glass);
  assert.equal(g['html prop --glass-blur'], '8px'); assert.equal(g['body prop --surface-filter'], 'blur(8px) saturate(1.30)'); assert.equal(g['body prop --surface-veil'], 'hsl(0 0% 0% / 0.00)');
  assert.equal(g['body class disconnected'], true); assert.equal(g['body class frost'], true); assert.equal(g['body prop --surface-radius'], '16px');
  const l = at(LOOK_PRESETS.light);
  assert.equal(l['html attr data-ui-tier'], 'flat'); assert.equal(l['html prop --relief-raise'], '0 0 0 0 transparent'); assert.equal(l['body prop --surface-shadow-menu'], '0 0 0 0 transparent');
  assert.equal(at({ quality: 'balanced', veil: 30, saturation: 1.5 })['body prop --surface-veil'], null, 'the tier owns the pane below FULL');
  assert.equal(at({ quality: 'balanced', saturation: 1.5 })['body prop --surface-filter'], null);
  assert.equal(at({ blur: 0 })['body prop --surface-filter'], 'none', 'a blur of 0 is the whole filter none, never blur(0)');
  assert.equal(at({ veil: 20 }, { theme: 'light' })['body prop --surface-veil'], 'hsl(0 0% 100% / 0.20)', 'the veil is white on light');
  assert.equal(at({ theme: 'system' }, { theme: 'light' })['body attr data-theme'], 'light', 'SYSTEM writes what the OS says');
  assert.equal(at({ hints: false, help: false })['body class control-hints-off'], true);
  assert.equal(at({ help: false })['body class window-info-off'], true);
  pass('resolve: home writes nothing, each option writes its hook, the tier owns the pane below FULL, off is never blur(0) or none');
}

console.log(`ALL ${n} MIR look-store laws passed`);
