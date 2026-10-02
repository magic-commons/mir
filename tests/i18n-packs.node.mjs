#!/usr/bin/env node
/* tests/i18n-packs.node.mjs — the translation packs (mir/locales/<tag>.json) against the catalogue (en.json).
   FAILS on: a pack that does not parse · an empty value · a value whose {placeholders} differ from its key's (a {:LABEL}
   reference counts as a placeholder) · a value with '<' or a control character · a plural entry on a key that is not a
   count, or with a form name Intl.PluralRules does not have, or without `other` · a `review` flag on a key the pack lacks.
   REPORTS (never fails): per pack, covered / missing / review / stale; and the short capital labels whose translation is
   more than 1.6x longer.  An empty pack passes with coverage 0.  English and the pseudo-languages are not packs to check. */
import assert from 'node:assert/strict';
import fs from 'node:fs';

const DIR = new URL('../mir/locales/', import.meta.url);
const SKIP = new Set(['en.json', 'en.unreached.json']);
const CAT = JSON.parse(fs.readFileSync(new URL('en.json', DIR), 'utf8'));
const en = CAT.strings;
const total = Object.keys(en).length;
const FORMS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const english = (k) => k.replace(/^[a-z][a-z0-9 -]*::/, '');
const holders = (s) => [...String(s).matchAll(/\{[^{}]*\}/g)].map((m) => m[0]).sort();
const isCount = (k) => typeof en[k] === 'object' || /\{n\}/.test(k);
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const isCapLabel = (k) => k.length <= 8 && /\p{L}/u.test(k) && k === k.toUpperCase() && !/[{}]/.test(k);

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };
const report = [];

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !SKIP.has(f)).sort();
ok('there are packs to check', () => assert.ok(files.length >= 10, 'expected the ten language packs, found ' + files.length));
ok('the catalogue: every plural entry has its English one and other, and no name is a string to translate', () => {
  for (const [k, v] of Object.entries(en)) if (typeof v === 'object') assert.ok(v.one && v.other, k);
  for (const k of Object.keys(en)) assert.ok(!k.startsWith('name::'), 'a name in strings: ' + k);
});

for (const f of files) {
  const tag = f.replace(/\.json$/, '');
  let pack;
  ok(`${tag}: parses, and its head is complete`, () => {
    pack = JSON.parse(fs.readFileSync(new URL(f, DIR), 'utf8'));
    assert.equal(pack.tag, tag);
    for (const k of ['name', 'dir', 'reviewed', 'fonts', 'type', 'strings']) assert.ok(k in pack, 'missing field ' + k);
    assert.equal(typeof pack.strings, 'object');
  });
  const S = pack.strings, R = pack.review || {};
  const stale = Object.keys(S).filter((k) => !(k in en)), missing = Object.keys(en).filter((k) => !(k in S));
  const forms = (v) => (typeof v === 'object' && v ? Object.entries(v) : [['', v]]);
  ok(`${tag}: no empty value, no '<', no control character`, () => {
    const bad = [];
    for (const [k, v] of Object.entries(S)) for (const [, x] of forms(v)) {
      if (typeof x !== 'string' || x.trim() === '') bad.push(['empty', k]);
      else if (x.includes('<')) bad.push(['<', k]);
      else if (CONTROL.test(x)) bad.push(['control', k]);
    }
    assert.deepEqual(bad, [], 'bad values: ' + bad.slice(0, 5).map((b) => b[0] + ' ' + JSON.stringify(b[1])).join(' | '));
  });
  ok(`${tag}: a plural entry only on a count, with real form names and an \`other\``, () => {
    const bad = [];
    for (const [k, v] of Object.entries(S)) {
      if (typeof v !== 'object' || v === null) continue;
      if (!isCount(k)) bad.push('not a count: ' + k);
      for (const name of Object.keys(v)) if (!FORMS.has(name)) bad.push(`form "${name}": ${k}`);
      if (!('other' in v)) bad.push('no other: ' + k);
    }
    assert.deepEqual(bad, []);
  });
  ok(`${tag}: each value keeps exactly its key's {placeholders} (a form other than \`other\` may drop {n})`, () => {
    const bad = [];
    for (const [k, v] of Object.entries(S)) {
      const want = holders(english(k));
      for (const [form, x] of forms(v)) {
        if (typeof x !== 'string') continue;
        const got = holders(x);
        const fine = form && form !== 'other' ? got.every((h) => want.includes(h)) && want.filter((h) => h !== '{n}').every((h) => got.includes(h)) : got.join('\n') === want.join('\n');
        if (!fine) bad.push(JSON.stringify(k) + (form ? '.' + form : '') + ' → ' + JSON.stringify(x));
      }
    }
    assert.deepEqual(bad, [], 'placeholder mismatch: ' + bad.slice(0, 3).join(' | '));
  });
  ok(`${tag}: every review flag names a key the pack has`, () => {
    assert.deepEqual(Object.keys(R).filter((k) => !(k in S)), []);
  });
  const done = Object.keys(S).length - stale.length;
  const long = Object.entries(S).filter(([k, v]) => isCapLabel(k) && typeof v === 'string' && v.length > 1.6 * k.length).map(([k, v]) => `${k} → ${v}`);
  report.push({ tag, done, long, stale, missing, review: Object.keys(R).length });
}

console.log('\nper pack (covered of the catalogue · missing · flagged for review · stale):');
for (const r of report) console.log(`  ${r.tag.padEnd(8)} ${String(r.done).padStart(4)} / ${total}  ${(100 * r.done / total).toFixed(1).padStart(5)} %   missing ${String(r.missing.length).padStart(4)}   review ${String(r.review).padStart(3)}   stale ${r.stale.length}`);
console.log('\nshort capital labels (English <= 8 characters) translated more than 1.6x longer:');
for (const r of report) if (r.long.length) console.log(`  ${r.tag}: ${r.long.length}\n    ` + r.long.join('\n    '));
console.log(`\n${n} checks passed`);
