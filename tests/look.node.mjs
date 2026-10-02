/* look.node.mjs — the look's arithmetic (mir/core/look.js) against BASINS' own numbers, and the vanilla themes as data
 * (mir/shell/themes.js): every theme states every theme option and nothing else, every tone only colours. */
import assert from 'node:assert/strict';
import { glassTint, glassVeil, paneShadow, lightOffset, lightIsHome, solidInk, solidRelief, autoInk, spacingPx, LIGHT_HOME } from '../mir/core/look.js';
import { THEMES, THEME_KEYS, COLOUR_KEYS, themeValues, matchTheme, matchTone } from '../mir/shell/themes.js';
import { lookSchema } from '../mir/shell/gui.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };

{ /* BASINS skin.js applyGlass, worked by hand from its source (2026-10-01) */
  assert.equal(glassTint({ bright: 0, tint: 0, saturation: 1 }, 'dark'), null, 'home writes nothing');
  assert.equal(glassTint({ bright: 0, tint: 0, saturation: 1.3 }, 'dark'), '214 20.8% 13%', 'ABOUT GLASS: 16 % × 1.3');
  assert.equal(glassTint({ bright: 0.25, hue: 300, tint: 0.5, saturation: 1 }, 'dark'), '300 43% 23%', 'l + 40·BRIGHT, s → 70 % by TINT');
  assert.equal(glassTint({ bright: -1, tint: 0, saturation: 1 }, 'dark'), '214 16% 2%', 'clamped at 2');
  assert.equal(glassVeil({ veil: 10, bright: 0, tint: 0 }, 'dark'), null, 'the house veil stands');
  assert.equal(glassVeil({ veil: 0, bright: 0, tint: 0 }, 'dark'), 'rgb(255 255 255 / 0.000)', 'VEIL 0: clear');
  assert.equal(glassVeil({ veil: 0, bright: 0.4, tint: 0 }, 'dark'), 'rgb(255 255 255 / 0.200)', '+½·BRIGHT');
  assert.equal(glassVeil({ veil: 10, bright: 0, tint: 0.5, hue: 0, saturation: 1 }, 'dark'), 'rgb(99 21 21 / 0.150)', 'toward HUE by .85·TINT, alpha max(|v|, .3·TINT)');
  pass("glass: BASINS' applyGlass to the digit (tint, saturation multiply, veil, ½·BRIGHT)");
}
{
  assert.deepEqual(lightOffset(0, 2), { x: 0, y: 2 }, 'from above: straight down');
  assert.deepEqual(lightOffset(315, 2), { x: 1.4142, y: 1.4142 }, 'upper left: bottom right');
  assert.equal(paneShadow({ shadow: 2, lightAngle: 0, shadowDist: 2, shadowSoft: 8 }, 'dark'),
    'inset 0px 1px 0 rgb(255 255 255 / 0.12), 0px 2px 8px rgb(0 0 0 / 0.4), 0px 1px 2px rgb(0 0 0 / 0.24)', "BASINS' ABOUT shadow at 200 %");
  assert.equal(paneShadow({ shadow: 0 }, 'dark'), '0 0 0 0 transparent');
  assert.equal(lightIsHome(LIGHT_HOME), true); assert.equal(lightIsHome({ ...LIGHT_HOME, shine: 0.1 }), false);
  assert.equal(solidInk({ bright: 0 }, 'dark'), 'light'); assert.equal(solidInk({ bright: 0 }, 'light'), 'dark'); assert.equal(solidInk({ bright: -1 }, 'light'), 'light', 'a light theme darkened past the middle takes white');
  assert.deepEqual(spacingPx('0'), { gap: 0, inset: 0, pad: 6, rail: 0 }); assert.deepEqual(spacingPx('tight'), { gap: 3, inset: 3, pad: 6, rail: 2 });
  assert.deepEqual(spacingPx('default'), { gap: 6, inset: 6, pad: 8, rail: 4 }, "BASINS' DEFAULT"); assert.deepEqual(spacingPx('nope'), spacingPx('default'));
  pass('one light: the offsets, the cast at FROST, the home; SOLID ink; SPACING');
}
{
  const rows = new Map(lookSchema().map((r) => [r.key, r]));
  for (const t of THEMES) {
    assert.deepEqual(Object.keys(t.values).filter((k) => k !== 'theme').sort(), [...THEME_KEYS].sort(), t.id + ' states every theme option (and THEME only if it is one-mode)');
    for (const [k, v] of Object.entries(t.values)) { const r = rows.get(k); assert.ok(r, k + ' is a look option'); assert.ok(r.type === 'bool' ? typeof v === 'boolean' : r.type === 'enum' ? r.values.includes(v) : v >= r.min && v <= r.max, `${t.id}.${k} = ${v} is in range`); }
    assert.ok(t.tones.length >= 2, t.id + ' has tones');
    for (const o of t.tones) { assert.deepEqual(Object.keys(o.values).sort(), [...COLOUR_KEYS].sort(), `${t.id}/${o.id} sets only the colours`); for (const [k, v] of Object.entries(o.values)) { const r = rows.get(k); assert.ok(v >= r.min && v <= r.max, `${t.id}/${o.id}.${k}`); } }
    assert.equal(matchTheme(themeValues(t.id)), t.id); assert.equal(matchTone(themeValues(t.id), t.id), t.tones[0].id);
  }
  assert.equal(new Set(THEMES.map((t) => JSON.stringify(t.values))).size, THEMES.length, 'no two themes are the same set');
  for (const k of [...THEME_KEYS, ...COLOUR_KEYS]) assert.ok(rows.has(k), k);
  for (const k of ['theme', 'hints', 'help', 'dropGuides']) assert.ok(!THEME_KEYS.includes(k) && !COLOUR_KEYS.includes(k), k + ' is the user\'s own');
  assert.deepEqual(THEMES.filter((t) => 'theme' in t.values).map((t) => t.id + ':' + t.values.theme), ['neon:dark'], 'only NEON states its mode');
  { const d = solidRelief({ bright: 0 }, 'dark'), l = solidRelief({ bright: 0 }, 'light');
    assert.ok(d.lift > 18 && d.gain > l.gain && l.sink < d.sink, 'a dark pane lifts more and shines more'); }
  assert.equal(autoInk({ card: 'refractive' }, 'dark'), 'light'); assert.equal(autoInk({ card: 'refractive' }, 'light'), 'dark'); assert.equal(autoInk({ card: 'tinted', frost: 'off' }, 'dark'), null);
  assert.deepEqual(Object.keys(themeValues('frost')).filter((k) => !rows.has(k)), []);
  pass('themes are data: whole, in range, distinct; tones are colours only', THEMES.map((t) => `${t.name} (${t.tones.map((o) => o.name).join('/')})`).join(' · '));
}
console.log(`ALL ${n} MIR look laws passed`);
