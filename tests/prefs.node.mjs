/* prefs.node.mjs — the look store (mir/core/prefs.js) with an injected storage, and the GUI window's schema and presets
 * (mir/shell/gui.js lookSchema, LOOK_PRESETS): defaults, set/get, repair of bad stored values, subscribe, reset, the
 * writes each option resolves to, and presets resolving to option sets with CUSTOM when they stop matching. */
import assert from 'node:assert/strict';
import { createPrefs, repair, defaults, resolve, matchPreset, coerce } from '../mir/core/prefs.js';
import { lookSchema, LOOK_PRESETS } from '../mir/shell/gui.js';
import { THEMES, themeValues, matchTone } from '../mir/shell/themes.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };
const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const schema = lookSchema();
const mk = (storage) => createPrefs({ key: 'mir.gui', schema, presets: LOOK_PRESETS, storage, doc: null });

{
  const P = mk(memory());
  assert.deepEqual(P.all(), defaults(schema));
  assert.equal(P.get('card'), 'refractive'); assert.equal(P.get('quality'), 'full'); assert.equal(P.get('glow'), true); assert.equal(P.get('theme'), 'dark');
  assert.equal(P.preset(), 'frost', 'a fresh store is the FROST look');
  const F = LOOK_PRESETS.frost;
  assert.deepEqual([F.card, F.frost, F.blur, F.veil, F.saturation, F.corners, F.faces, F.text, F.shadow, F.disconnected], ['refractive', 'always', 11, 0, 1.3, 24, 'glass', 'theme', 2, false], "FROST is Josh's recipe (its white text is dark mode's AUTO)");
  assert.equal(matchTone(P.all(), 'frost'), 'clear', 'and its own tone: BRIGHT 0, TINT 0');
  pass("defaults: a fresh store is FROST (Josh's recipe) on the dark theme", `${schema.length} options`);
}
{
  const S = memory(), P = mk(S);
  assert.deepEqual(P.set('card', 'tinted'), ['card']);
  assert.equal(P.get('card'), 'tinted');
  assert.equal(JSON.parse(S.m.get('mir.gui')).card, 'tinted', 'written to the one key');
  assert.deepEqual(P.set('card', 'tinted'), [], 'the same value is no change');
  assert.deepEqual(P.set('card', 'opaque'), [], 'a value the row does not have is ignored');
  assert.deepEqual(P.set('nonsense', 1), [], 'an unknown key is ignored');
  assert.equal(P.set({ blur: 99 })[0], 'blur'); assert.equal(P.get('blur'), 24, 'a number a control hands in is clamped (0–24 px: CLASSIC is 1.4\'s 22)');
  P.set('accentA', 370); assert.equal(P.get('accentA'), 10, 'a hue wraps');
  assert.equal(mk(S).get('card'), 'tinted', 'a second store on the same storage reads it back (the reload)');
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
  P.set({ card: 'tinted', frost: 'off' }); P.set('card', 'tinted');
  off(); P.set('frost', 'always');
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
  P.applyPreset('frost'); P.set('corners', 5);
  assert.equal(P.preset(), 'custom', 'one option off the preset is CUSTOM');
  P.set('corners', LOOK_PRESETS.frost.corners); assert.equal(P.preset(), 'frost', 'and back again');
  P.set('tint', 0.4); assert.equal(P.preset(), 'frost', 'TINT is a tone, not the theme'); assert.equal(matchTone(P.all(), 'frost'), 'custom', 'the tone goes CUSTOM'); P.set('tint', 0);
  P.set('theme', 'light'); P.set('accentA', 120); assert.equal(P.preset(), 'frost', 'theme and accents are not part of a preset');
  assert.equal(matchPreset({ card: 'x' }, LOOK_PRESETS), 'custom');
  assert.deepEqual(P.applyPreset('nope'), []);
  for (const t of THEMES) { P.set(themeValues(t.id)); assert.equal(P.preset(), t.id); assert.equal(matchTone(P.all(), t.id), t.tones[0].id, t.id + ' applies its own tone'); }
  pass('presets: every vanilla theme is an option set with its own tone; CUSTOM appears when the options stop matching', Object.keys(LOOK_PRESETS).join(' · '));
}
{
  const at = (state, env = { theme: 'dark' }) => Object.fromEntries(resolve({ ...defaults(schema), ...state }, schema, env).filter((w) => w.kind !== 'run').map((w) => [w.on + ' ' + w.kind + ' ' + w.name, w.value]));
  const home = at(LOOK_PRESETS.classic);
  assert.equal(home['html prop --glass-blur'], '22px', 'BLUR is always written: CLASSIC is the kit\'s own 22'); assert.equal(home['body prop --surface-veil'], null); assert.equal(home['body prop --glass-tint'], null); assert.equal(home['body prop --surface-filter'], null);
  assert.equal(home['html attr data-cast'], '', 'the engine always draws BASINS\' material shadow, at 100 % too'); assert.equal(home['body attr data-text'], null); assert.equal(home['body attr data-faces'], null); assert.equal(home['body prop --pane-edge'], null);
  assert.equal(home['html prop --rack-gap'], '6px', 'CLASSIC\'s SPACING is DEFAULT'); assert.equal(home['html prop --pane-pad'], undefined, 'DEFAULT leaves the pane padding to the sheets (BASINS: 7 · 7 · 10)'); assert.equal(home['html prop --rail-gap'], '4px');
  assert.equal(home['body prop --surface-radius'], null); assert.equal(home['html prop --relief-raise'], null); assert.equal(home['body prop --surface-shadow'], null);
  assert.equal(home['html attr data-ui-tier'], null); assert.equal(home['body class frost'], false); assert.equal(home['body attr data-card'], 'tinted');
  const g = at(themeValues('frost'));
  assert.equal(g['html prop --glass-blur'], '11px'); assert.equal(g['body prop --surface-filter'], 'blur(11px) saturate(1.30)'); assert.equal(g['body prop --surface-veil'], 'rgb(255 255 255 / 0.000)', 'VEIL 0 is a clear veil (BASINS)');
  assert.equal(g['body class disconnected'], false); assert.equal(g['body class frost'], true); assert.equal(g['body prop --surface-radius'], '24px'); assert.equal(g['body prop --glass-tint'], '214 20.8% 13%', 'SATURATION 130 % multiplies the tint\'s chroma (BASINS applyGlass)');
  assert.equal(g['body attr data-text'], 'light', 'white text in dark'); assert.equal(at(themeValues('frost'), { theme: 'light' })['body attr data-text'], 'dark', 'and black in light');
  assert.equal(at({ text: 'theme', card: 'tinted', frost: 'off' })['body attr data-text'], null, 'AUTO on a tinted pane: the house ladder');
  assert.equal(at({ text: 'sampled' })['body attr data-text'], null, "SAMPLED writes no data-text: the app's sampler decides"); assert.equal(g['body attr data-faces'], 'glass', 'glass control faces'); assert.equal(g['html prop --shadow-amount'], '2', 'shadow maxed');
  assert.equal(g['html attr data-cast'], '', 'SHADOW 200 % draws the cast'); assert.equal(g['html attr data-shine'], null); assert.equal(g['body prop --pane-edge'], 'transparent', 'no pane edge (BASINS ABOUT)');
  assert.equal(at({ tint: 0.5, hue: 120, saturation: 1 })['body prop --glass-tint'], '120 43% 13%', 'TINT moves the glass tint toward HUE (BASINS applyGlass)');
  assert.equal(at({ bright: 0.5, saturation: 1 }, { theme: 'light' })['body prop --glass-tint'], '214 22% 98%', 'BRIGHT moves its lightness, clamped');
  const m = at(themeValues('morph'));
  assert.equal(m['body attr data-card'], 'solid'); assert.equal(m['html prop --light-angle'], '315deg'); assert.equal(m['html attr data-shine'], ''); assert.equal(m['body attr data-text'], 'light', 'AUTO on a dark SOLID pane is white');
  assert.equal(at(themeValues('morph'), { theme: 'light' })['body attr data-text'], 'dark', '… and black on a light one');
  assert.equal(at({ spacing: '0' })['html attr data-flush'], '', 'SPACING 0 is flush'); assert.equal(at({ spacing: '0' })['html prop --rack-gap'], '0px'); assert.equal(at({ spacing: '0' })['html prop --pane-pad'], '6px', 'a pane keeps 6 px');
  assert.equal(at({ faces: 'solid', faceBlend: 0.5 })['body attr data-faces'], 'blend'); assert.equal(at({ faces: 'solid', faceBlend: 0.5 })['body prop --faces-solid-pct'], '50.00%');
  assert.equal(at({ dropShadow: false })['body prop --surface-shadow'], '0 0 0 0 transparent', 'DROP SHADOW off: no pane shadow'); assert.equal(at({ dropShadow: false })['html attr data-cast'], null);
  const l = at(LOOK_PRESETS.swift);
  assert.equal(l['html attr data-ui-tier'], 'flat'); assert.equal(l['html prop --relief-raise'], '0 0 0 0 transparent'); assert.equal(l['body prop --surface-shadow-menu'], '0 0 0 0 transparent');
  assert.equal(at({ quality: 'balanced', veil: 30, saturation: 1.5 })['body prop --surface-veil'], null, 'the tier owns the pane below FULL');
  assert.equal(at({ quality: 'balanced', saturation: 1.5 })['body prop --surface-filter'], null);
  assert.equal(at({ blur: 0 })['body prop --surface-filter'], 'none', 'a blur of 0 is the whole filter none, never blur(0)');
  assert.equal(at({ veil: 20 }, { theme: 'light' })['body prop --surface-veil'], 'rgb(255 255 255 / 0.200)', 'the veil is white on light');
  assert.equal(at({ veil: 20 })['body prop --surface-veil'], 'rgb(0 0 0 / 0.200)', 'and black on dark');
  assert.equal(at({ theme: 'system' }, { theme: 'light' })['body attr data-theme'], 'light', 'SYSTEM writes what the OS says');
  assert.equal(at({ hints: false, help: false })['body class control-hints-off'], true);
  assert.equal(at({ help: false })['body class window-info-off'], true);
  pass('resolve: home writes nothing (BLUR aside), each option writes its hook, the tier owns the pane below FULL, off is never blur(0) or none');
}

console.log(`ALL ${n} MIR look-store laws passed`);
