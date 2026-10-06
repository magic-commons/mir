/* modwindow.node.mjs — the modulation plugin's laws that need no browser.
 *   1. THE PRESET KEY IS AN OPTION: mod.js setPresetKey separates two stores on one origin, PRESET_LS stays the default.
 *   2. THE CONTROLLER IS THE WINDOW SET'S: window.js takes its rail, dock and drag from mir/window and core/pointer, and
 *      carries no hand copy of them (no snapTarget, no own pointer capture on the grip, no nearestChipSide).
 *   3. STRINGS ARE NOT CODE: no toUpperCase() in the plugin's code; no CSS `content:` with English; nothing looks a
 *      control up by its label text (no aria-label or textContent read to find or name a node). */
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');   // comments out: the laws are about code

/* ── 1 · the preset key ── */
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => mem.delete(k), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const M = await import('../mir/modulation/mod.js');
ok(M.presetKeyOf() === M.PRESET_LS, 'the default key is PRESET_LS');
M.setPresetKey('app.a.presets');
ok(M.presetSave('ALPHA', M.serializeRack()).ok, 'A saves ALPHA');
M.setPresetKey('app.b.presets');
ok(!M.presetList().some((p) => p.name === 'ALPHA'), 'B does not see A\'s preset');
ok(M.presetSave('BETA', M.serializeRack()).ok, 'B saves BETA');
M.setPresetKey('app.a.presets');
const aNames = M.presetList().filter((p) => !p.factory).map((p) => p.name);
ok(aNames.includes('ALPHA') && !aNames.includes('BETA'), 'A still has ALPHA only: ' + aNames);
ok(mem.has('app.a.presets') && mem.has('app.b.presets') && !mem.has(M.PRESET_LS), 'two keys in storage, the default untouched');
ok(M.presetStoreState().key === 'app.a.presets', 'presetStoreState names the key in force');
ok(M.setPresetKey('') === M.PRESET_LS, 'an empty key restores the default');

/* ── 2 · one window set ── */
const win = code(read('mir/modulation/window.js'));
for (const [what, re] of [['createRail', /createRail\(/], ['windowLayout', /windowLayout\(/], ['createDockGuide', /createDockGuide\(/], ['core/pointer drag (on the grip, through window/window.js gripGesture)', /gripGesture\(rail,/], ['tweenRect', /tweenRect\(root/], ['presence', /presence\(root/]])
  ok(re.test(win), `window.js uses ${what}`);
for (const [what, re] of [['snapTarget', /snapTarget/], ['nearestChipSide', /nearestChipSide/], ['buildChipRail', /buildChipRail\(/], ['a hand-rolled grip capture', /rail\.grip\.setPointerCapture|chips\.drag\.addEventListener/]])
  ok(!re.test(win), `window.js carries no ${what}`);
ok(/ROUTABLE = '\.k\[data-param\], \.fd\[data-param\], \.rng-t\[data-param\]'/.test(win), 'a fader and a range slider\'s thumb are routable like a knob');
ok(/createProximity\(/.test(win), 'routing glows through core/proximity.js');

/* ── 3 · strings ── */
const plugin = ['mir/modulation/window.js', 'mir/modulation/bind.js', 'mir/modulation/modwindow/modwindow.js'];
for (const f of plugin) {
  const s = code(read(f));
  ok(!/\.toUpperCase\(\)/.test(s), `${f}: no toUpperCase() — case is the string's`);
  ok(!/querySelector(All)?\([^)]*aria-label/.test(s) && !/\[aria-label=/.test(s), `${f}: nothing is found by its accessible name`);
}
ok(!/ariaLabel\([^;]*\.textContent/.test(code(read('mir/modulation/window.js'))), 'window.js names no control from a label it reads back');
for (const f of ['mir/modulation/modhost.css', 'mir/modulation/modwindow/modwindow.css']) {
  const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  const words = [...css.matchAll(/content:\s*"([^"]*)"/g)].map((m) => m[1]).filter((w) => /[A-Za-z]{2,}/.test(w));
  ok(words.length === 0, `${f}: no English in a CSS content: string (${words.join(', ')})`);
}

console.log(`modwindow: ${n} checks PASS`);
