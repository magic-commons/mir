#!/usr/bin/env node
/* tests/i18n.node.mjs — core/i18n.js, the pseudo-language, the packs and the LANGUAGE menu's pure parts. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLanguage, language, direction, languages, missing, addLocales, onLanguage, LANGUAGES } from '../mir/core/i18n.js';
import { pseudo, unpseudo } from '../mir/locales/pseudo.js';
import { pickLanguage, languageMenu } from '../mir/shell/language.js';

const ROOT = new URL('..', import.meta.url);
let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('ok   ' + name); };

await ok('English: t() is the identity, and {name} substitutes', () => {
  assert.equal(language(), 'en');
  assert.equal(t('EXPOSURE'), 'EXPOSURE');
  assert.equal(t('{value} · modulated', { value: '0.25' }), '0.25 · modulated');
  assert.equal(t('{a} and {b}', { a: 1 }), '1 and {b}');                     // an unknown var stays visible, never blank
  assert.equal(t(''), ''); assert.equal(t(undefined), ''); assert.equal(t(7), 7);
});

await ok('a missing pack does not throw: the language is set and every string stays English', async () => {
  const seen = []; const off = onLanguage((tag) => seen.push(tag));
  const got = await setLanguage('xx-NOPE');
  assert.equal(got, false); assert.equal(language(), 'xx-NOPE'); assert.equal(t('EXPOSURE'), 'EXPOSURE');
  assert.deepEqual(missing(), ['EXPOSURE']);
  off(); await setLanguage('en'); assert.deepEqual(seen, ['xx-NOPE']);
});

await ok('a pack translates, falls back per string, counts its misses, and an app pack wins over the kit', async () => {
  addLocales((tag) => (tag === 'es' ? { tag: 'es', dir: 'ltr', strings: { EXPOSURE: 'EXPOSICIÓN', '{value} · modulated': '{value} · modulado' } } : null));
  addLocales((tag) => (tag === 'es' ? { strings: { EXPOSURE: 'EXPOSICIÓN (app)' } } : null));
  assert.equal(await setLanguage('es'), true);
  assert.equal(t('EXPOSURE'), 'EXPOSICIÓN (app)');
  assert.equal(t('{value} · modulated', { value: '0.25' }), '0.25 · modulado');
  assert.equal(t('HUE'), 'HUE'); assert.deepEqual(missing(), ['HUE']);
  assert.equal(t('{name} help', { name: { t: 'EXPOSURE' } }), 'EXPOSICIÓN (app) help');   // a { t } var is a label, translated in turn
  assert.equal(t('{name} help', { name: 'EXPOSURE' }), 'EXPOSURE help');                  // a plain var is data
  await setLanguage('en'); assert.equal(t('EXPOSURE'), 'EXPOSURE');
});

await ok('the last setLanguage wins, however the loads finish', async () => {
  const a = setLanguage('xx-A'), b = setLanguage('qps');
  await Promise.all([a, b]); assert.equal(language(), 'qps');
  await setLanguage('en');
});

const cat = JSON.parse(fs.readFileSync(new URL('mir/locales/en.json', ROOT), 'utf8'));
const keys = Object.keys(cat.strings);

await ok('qps: every string is bracketed, accented, 30–50 % longer, and reverses to its English exactly', async () => {
  await setLanguage('qps');
  assert.equal(direction(), 'ltr');
  assert.equal(t('EXPOSURE'), pseudo('EXPOSURE'));
  assert.match(t('EXPOSURE'), /^\[ÉẊÞÖŠÛŔÉ~*\]$/);
  assert.equal(t('{value} · modulated', { value: '0.25' }).includes('0.25'), true);       // the var is substituted after
  assert.equal(pseudo('<m>ρ</m> density'), '[<m>ρ</m> ðéñšíţý~~~~]');                     // maths runs pass through
  const len = (s) => [...s].length;
  let src = 0, out = 0; const bad = [];
  for (const k of keys) {
    const p = pseudo(k);
    if (unpseudo(p) !== k) bad.push(k);
    if (len(k) >= 8) { const r = len(p) / len(k); if (r < 1.3 || r > 1.5) bad.push(k + ' ×' + r.toFixed(2)); }
    src += len(k); out += len(p);
    assert.ok(!/[A-Za-z]/.test(p.replace(/<m>[\s\S]*?<\/m>|\{\w+\}/g, '')), 'no plain ASCII letter left in ' + p);
  }
  assert.deepEqual(bad, [], 'every catalogue string reverses and sits in 30–50 %');
  const r = out / src; assert.ok(r >= 1.3 && r <= 1.5, 'catalogue-wide ×' + r.toFixed(3));
  console.log(`     ${keys.length} catalogue strings, ×${r.toFixed(3)} overall`);
  await setLanguage('qps-rtl'); assert.equal(direction(), 'rtl'); assert.equal(t('EXPOSURE'), pseudo('EXPOSURE'));
  await setLanguage('en');
});

await ok('every pack file agrees with the language list (name, dir, reviewed) and names its fonts', () => {
  for (const l of LANGUAGES.filter((x) => x.tag !== 'en' && !x.dev)) {
    const p = JSON.parse(fs.readFileSync(new URL(`mir/locales/${l.tag}.json`, ROOT), 'utf8'));
    assert.equal(p.tag, l.tag); assert.equal(p.name, l.name); assert.equal(p.dir, l.dir); assert.equal(p.reviewed, l.reviewed, l.tag);
    assert.ok(Array.isArray(p.fonts) && p.fonts.some((f) => f.role === 'ui'), l.tag + ' names a UI face');
    assert.ok(p.fonts.every((f) => f.status === 'held' && f.file === null), l.tag + ': no font is shipped while downloads are on hold');
    assert.ok(p.strings && typeof p.strings === 'object', l.tag);
    for (const k of Object.keys(p.strings)) assert.ok(k in cat.strings, `${l.tag}: "${k}" is not in the catalogue`);
  }
  assert.equal(languages().length, 11); assert.equal(languages({ dev: true }).length, 13);
});

await ok('locales.css gates exactly the languages whose packs say case: none', () => {
  const css = fs.readFileSync(new URL('mir/locales/locales.css', ROOT), 'utf8');
  assert.match(css, /@layer mir\.kit\.locale \{/);
  for (const l of LANGUAGES.filter((x) => x.tag !== 'en' && !x.dev)) {
    const p = JSON.parse(fs.readFileSync(new URL(`mir/locales/${l.tag}.json`, ROOT), 'utf8'));
    const base = l.tag.split('-')[0];
    const gate = new RegExp(`:where\\(:root:lang\\(${base}\\)\\) \\{[^}]*--label-case: none`);
    assert.equal(gate.test(css), p.type.case === 'none', l.tag);
  }
});

await ok('first run follows the browser when a pack matches; the menu names each language in its own script', async () => {
  assert.equal(pickLanguage(['de-DE', 'zh-CN', 'en']), 'zh-Hans');
  assert.equal(pickLanguage(['pt-BR']), 'pt-BR');
  assert.equal(pickLanguage(['en-GB']), 'en');
  assert.equal(pickLanguage(['de', 'nl']), null);
  const rows = languageMenu()();
  assert.deepEqual(rows.map((r) => r[0].split('\t')[0]), ['English', '中文', 'हिन्दी', 'Español', 'العربية', 'Français', 'বাংলা', 'Português', 'Bahasa Indonesia', 'Русский', '日本語']);
  assert.ok(rows.every((r) => r[4].raw));
  assert.equal(rows[0][0], 'English\t✓'); assert.equal(rows[0][4].current, true);
  assert.equal(rows[3][0], 'Español\tDRAFT');
  assert.equal(languageMenu({ dev: true })().length, 13);
});

console.log(`ALL ${n} PASS — i18n`);
