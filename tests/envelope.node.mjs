#!/usr/bin/env node
/* tests/envelope.node.mjs — core/envelope.js: the one portable format and its one checker (pure).
 *   round trips (wrap/unwrap/stringify, pack/unpackText) · a good file of every kind passes · every schema default of a
 *   skin token passes its own grammar · the refusals each carry a path and a reason · the checker never throws. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wrap, unwrap, stringify, pack, unpackText, check, checkSkinValue, skinValues, FORMAT, KINDS } from '../mir/core/envelope.js';

const tokens = JSON.parse(fs.readFileSync(new URL('../mir/tokens.json', import.meta.url), 'utf8'));
const settings = [
  { key: 'motion', type: 'enum', options: ['full', 'reduced'], default: 'full' },
  { key: 'scale', type: 'number', range: [0.75, 2], default: 1 },
  { key: 'hints', type: 'bool', default: true }
];
const opts = { tokens, settings, app: 'basins' };
let n = 0; const ok = (name, fn) => Promise.resolve(fn()).then(() => { n++; console.log('ok   ' + name); });
const refused = (env, path, re, o = opts) => {
  const r = check(env, o);
  assert.equal(r.ok, false, 'should refuse: ' + JSON.stringify(env).slice(0, 120));
  assert.equal(r.envelope, null);
  const hit = r.errors.find((e) => e.path === path);
  assert.ok(hit, `no error at ${path}: ${JSON.stringify(r.errors)}`);
  assert.match(hit.why, re);
};
const skin = (t) => wrap('skin', { tokens: t });

const GOOD = {
  skin: wrap('skin', { tokens: { '--hue-acc': '200', '--glass-blur': '18px', '--font-ui': '"Spectral", Georgia, serif', '--ease-out': 'cubic-bezier(.2, 1, .3, 1)',
    '--glass-shadow': 'inset 0 1px 0 hsl(0 0% 100% / .06), 0 1px 2px hsl(0 0% 0% / .16)', '--acc-soft': 'color-mix(in srgb, var(--acc) 20%, transparent)',
    '--info-size-body': 'clamp(14px, 8px + .68cqi, 18px)', '--t-fast': '90ms', '--glass-sheen': 'linear-gradient(160deg, hsl(0 0% 100% / .07), transparent 42%)',
    '--label-case': 'none', '--frost-filter': 'blur(var(--glass-blur)) saturate(1.1)' }, light: { '--lum-acc': '30%' } }, { name: 'calm' }),
  settings: wrap('settings', { motion: 'reduced', scale: 1.25, hints: false }),
  page: wrap('page', { title: 'HELLO', md: '# hello\n\n$x^2$', shared: true }),
  project: wrap('project', { parts: { pattern: { rows: [1, 2, 3] }, accents: { a: 188 } }, pages: { pages: [{ id: 'p1', title: 'G', md: 'hi' }], showOnOpen: true } }, { app: 'basins' }),
  spec: wrap('spec', { skin: { tokens: { '--hue-acc': '30' } }, settings: { scale: 1.5 }, layouts: { main: { rack: ['a', 'b'] } }, keys: { 'window.close': 'Ctrl+W', 'rack.next': ['Tab', 'Ctrl+]'] }, language: 'pt-BR' }, { name: 'josh-spec' })
};

await ok('wrap / stringify / unwrap round-trip, for every kind', () => {
  for (const k of KINDS) {
    const e = GOOD[k]; assert.equal(e.mir, FORMAT); assert.equal(e.kind, k); assert.equal(typeof e.kit, 'string'); assert.ok(!Number.isNaN(Date.parse(e.made)));
    const u = unwrap(stringify(e)); assert.deepEqual(u.errors, []); assert.deepEqual(u.envelope, e);
    assert.deepEqual(unwrap(e).envelope, e);
  }
  assert.throws(() => wrap('macro', {}));
});
await ok('pack / unpackText round-trip (deflated here: node has CompressionStream), and a typical spec fits a QR', async () => {
  for (const k of KINDS) { const p = await pack(GOOD[k]); assert.match(p, /^mir1\.z\./); assert.deepEqual((await unpackText(p)).envelope, GOOD[k]); }
  assert.ok((await pack(GOOD.spec)).length < 1024);
  assert.equal((await unpackText('mir1.z.!!!')).envelope, null);
  assert.equal((await unpackText('hello')).envelope, null);
  assert.equal((await unpackText('mir1.z.AAAA')).envelope, null);
});
await ok('the checker accepts a good file of each kind, and hands back the clean copy', () => {
  for (const k of KINDS) { const r = check(GOOD[k], opts); assert.equal(r.ok, true, k + ' ' + JSON.stringify(r.errors)); assert.deepEqual(r.errors, []); assert.equal(r.envelope.kind, k); }
  assert.deepEqual(skinValues(check(GOOD.skin, opts).envelope.data, 'light')['--lum-acc'], '30%');
});
await ok('every schema default of a skin token passes its own grammar (both themes)', () => {
  const known = new Map(tokens.tokens.map((r) => [r.name, r])); let count = 0;
  for (const r of tokens.tokens.filter((r) => r.skin)) for (const th of ['dark', 'light']) {
    const v = r.default && r.default[th]; if (!v) continue; count++;
    assert.equal(checkSkinValue(r, v, known), null, `${r.name} ${th}: ${v}`);
  }
  assert.ok(count > 100);
});
await ok('refused, with a path and a reason: an unknown token', () => refused(skin({ '--nope': '1' }), 'data.tokens.--nope', /not a token in the schema/));
await ok('refused: a token that is not a skin\'s (data ink)', () => refused(skin({ '--n1': 'red' }), 'data.tokens.--n1', /not a skin's/));
await ok('refused: an out-of-range number, percentage, length', () => {
  refused(skin({ '--glass-opacity': '7' }), 'data.tokens.--glass-opacity', /out of range/);
  refused(skin({ '--lum-acc': '140%' }), 'data.tokens.--lum-acc', /out of range/);
  refused(skin({ '--glass-blur': '90000px' }), 'data.tokens.--glass-blur', /out of range/);
});
await ok('refused: url(...) in a colour and in an image; image-set; @import; expression(); javascript:', () => {
  refused(skin({ '--acc': 'url(https://x.example/a.png)' }), 'data.tokens.--acc', /cannot load/);
  refused(skin({ '--glass-sheen': 'url(a.png)' }), 'data.tokens.--glass-sheen', /cannot load/);
  refused(skin({ '--glass-sheen': 'image-set("a.png" 1x)' }), 'data.tokens.--glass-sheen', /outside/);
  refused(skin({ '--acc': '@import "x.css"' }), 'data.tokens.--acc', /cannot load/);
  refused(skin({ '--acc': 'expression(alert(1))' }), 'data.tokens.--acc', /cannot run/);
  refused(skin({ '--acc': 'javascript:alert(1)' }), 'data.tokens.--acc', /cannot run/);
  refused(skin({ '--acc': 'u\\72l(x)' }), 'data.tokens.--acc', /escape/);
});
await ok('refused: </style><script> in a value, and a value that ends its declaration', () => {
  refused(skin({ '--acc': 'red</style><script>alert(1)</script>' }), 'data.tokens.--acc', /markup/);
  refused(skin({ '--acc': 'red; background: blue' }), 'data.tokens.--acc', /declaration/);
});
await ok('refused: var(--not-a-token), also as a fallback\'s inner var', () => {
  refused(skin({ '--acc': 'var(--not-a-token)' }), 'data.tokens.--acc', /names no token/);
  refused(skin({ '--acc': 'var(--acc2, var(--evil))' }), 'data.tokens.--acc', /names no token/);
});
await ok('refused: a value outside its type (a length in a colour, a font not on the list, a word not in the set)', () => {
  refused(skin({ '--acc': '12px' }), 'data.tokens.--acc', /not a colour/);
  refused(skin({ '--font-ui': '"Comic Sans", serif' }), 'data.tokens.--font-ui', /not in the list/);
  refused(skin({ '--label-case': 'blink' }), 'data.tokens.--label-case', /one of/);
  refused(wrap('skin', { tokens: {}, rules: '.x{}' }), 'data.rules', /nothing else/);
});
await ok('warned, not refused: the kit\'s off-value laws and a contrast below 4.5:1', () => {
  const r = check(skin({ '--glass-shadow': 'none', '--frost-filter': 'blur(0)', '--fg': '#333' }), opts);
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some((w) => /0 0 0 0 transparent/.test(w.why)));
  assert.ok(r.warnings.some((w) => /blur\(0\)/.test(w.why)));
  assert.ok(r.warnings.some((w) => /dark theme/.test(w.why) && /4\.5:1/.test(w.why)));
});
await ok('refused: a newer format version; an older one with no migration', () => {
  refused({ ...GOOD.page, mir: FORMAT + 1 }, 'mir', /newer MIR/);
  assert.match(unwrap(JSON.stringify({ ...GOOD.page, mir: 99 })).errors[0].why, /newer/);
  refused({ ...GOOD.page, mir: 0 }, 'mir', /whole number/);
});
await ok('refused: a project for another app; accepted for this one', () => {
  refused(wrap('project', { parts: {} }, { app: 'automata' }), 'app', /automata's; this is basins/);
  assert.equal(check(wrap('project', { parts: {} }, { app: 'automata' }), { ...opts, app: 'automata' }).ok, true);
});
await ok('refused: a non-object, an array, null, a string that is not JSON, an unknown kind', () => {
  for (const x of [42, null, [1, 2], 'not json', '"a string"', undefined]) { const r = check(x, opts); assert.equal(r.ok, false); assert.equal(r.errors[0].path, ''); }
  refused({ mir: 1, kind: 'macro', data: {} }, 'kind', /unknown kind/);
  refused({ mir: 1, kind: 'page' }, 'data', /carries data/);
});
await ok('settings: a bad value is an error, an unknown key is dropped with a warning', () => {
  refused(wrap('settings', { scale: 9 }), 'data.scale', /at most 2/);
  refused(wrap('settings', { motion: 'wild' }), 'data.motion', /one of/);
  const r = check(wrap('settings', { scale: 1, colourOfMoon: 'blue' }), opts);
  assert.equal(r.ok, true); assert.deepEqual(r.envelope.data, { scale: 1 }); assert.equal(r.warnings[0].path, 'data.colourOfMoon');
  assert.ok(check(wrap('settings', { scale: 1 }), { tokens }).warnings.some((w) => /no options schema/.test(w.why)));
});
await ok('page, project and spec shapes', () => {
  refused(wrap('page', { title: 3, md: 'x' }), 'data.title', /string/);
  refused(wrap('page', { title: 'x', md: 'y'.repeat((2 << 20) + 1) }), 'data.md', /2 MB/);
  refused(wrap('project', { parts: [] }, { app: 'basins' }), 'data.parts', /object/);
  refused(wrap('project', JSON.parse('{"parts":{"__proto__":{"x":1}}}'), { app: 'basins' }), 'data.parts.__proto__', /reserved/);
  refused(wrap('spec', { skin: { tokens: { '--acc': 'url(x)' } } }), 'data.skin.tokens.--acc', /cannot load/);
  refused(wrap('spec', { keys: { 'a.b': '<b>' } }), 'data.keys.a.b', /chord/);
  refused(wrap('spec', { language: 'English!' }), 'data.language', /tag/);
});
await ok('the checker never throws: cycles, functions, deep nesting, odd values', () => {
  const cyc = { parts: {} }; cyc.parts.self = cyc;
  const deep = {}; let d = deep; for (let i = 0; i < 200; i++) d = d.x = {};
  for (const data of [cyc, { parts: { f() {} } }, { parts: deep }, { parts: { n: NaN } }]) assert.equal(check(wrap('project', data, { app: 'basins' }), opts).ok, false);
  for (const v of [{}, [], null, 7, true, 'a'.repeat(5000), '((((((', ')', 'var(', 'calc(1px +)', '#', '"open']) assert.doesNotThrow(() => check(skin({ '--acc': v, '--glass-blur': v }), opts));
  assert.equal(check(skin({ '--acc': 'red' }), {}).ok, false);                                      // no schema, no skin
});
console.log(`\nALL ${n} envelope checks ok`);
