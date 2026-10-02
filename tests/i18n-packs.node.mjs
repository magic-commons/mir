#!/usr/bin/env node
/* tests/i18n-packs.node.mjs — the translation packs (mir/locales/<tag>.json) against the catalogue (en.json).
   FAILS on: a pack that does not parse · a key the catalogue does not have · an empty value · a value whose {placeholders}
   differ from its key's · a value with '<' or a control character.
   REPORTS (never fails): coverage per pack, and the short capital labels whose translation is more than 1.6x longer.
   An empty pack passes with coverage 0. English and the pseudo-languages are not packs to check. */
import assert from 'node:assert/strict';
import fs from 'node:fs';

const DIR = new URL('../mir/locales/', import.meta.url);
const SKIP = new Set(['en.json', 'en.unreached.json']);
const en = JSON.parse(fs.readFileSync(new URL('en.json', DIR), 'utf8')).strings;
const total = Object.keys(en).length;
const holders = (s) => [...String(s).matchAll(/\{[^{}]*\}/g)].map((m) => m[0]).sort();
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const isCapLabel = (k) => k.length <= 8 && /\p{L}/u.test(k) && k === k.toUpperCase() && !/[{}]/.test(k);

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };
const report = [];

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !SKIP.has(f)).sort();
ok('there are packs to check', () => assert.ok(files.length >= 10, 'expected the ten language packs, found ' + files.length));

for (const f of files) {
  const tag = f.replace(/\.json$/, '');
  let pack;
  ok(`${tag}: parses, and its head is complete`, () => {
    pack = JSON.parse(fs.readFileSync(new URL(f, DIR), 'utf8'));
    assert.equal(pack.tag, tag);
    for (const k of ['name', 'dir', 'reviewed', 'fonts', 'type', 'strings']) assert.ok(k in pack, 'missing field ' + k);
    assert.equal(typeof pack.strings, 'object');
  });
  const S = pack.strings;
  ok(`${tag}: every key is in the catalogue`, () => {
    const stale = Object.keys(S).filter((k) => !(k in en));
    assert.deepEqual(stale, [], 'keys not in en.json: ' + stale.slice(0, 5).map((k) => JSON.stringify(k)).join(', '));
  });
  ok(`${tag}: no empty value, no '<', no control character`, () => {
    const bad = [];
    for (const [k, v] of Object.entries(S)) {
      if (typeof v !== 'string' || v.trim() === '') bad.push(['empty', k]);
      else if (v.includes('<')) bad.push(['<', k]);
      else if (CONTROL.test(v)) bad.push(['control', k]);
    }
    assert.deepEqual(bad, [], 'bad values: ' + bad.slice(0, 5).map((b) => b[0] + ' ' + JSON.stringify(b[1])).join(' | '));
  });
  ok(`${tag}: each value keeps exactly its key's {placeholders}`, () => {
    const bad = Object.entries(S).filter(([k, v]) => typeof v === 'string' && holders(k).join('\n') !== holders(v).join('\n'));
    assert.deepEqual(bad.map(([k]) => k), [], 'placeholder mismatch: ' + bad.slice(0, 3).map(([k, v]) => JSON.stringify(k) + ' → ' + JSON.stringify(v)).join(' | '));
  });
  const done = Object.keys(S).length;
  const long = Object.entries(S).filter(([k, v]) => isCapLabel(k) && typeof v === 'string' && v.length > 1.6 * k.length).map(([k, v]) => `${k} → ${v}`);
  report.push({ tag, done, long });
}

console.log('\ncoverage (translated / catalogue):');
for (const r of report) console.log(`  ${r.tag.padEnd(8)} ${String(r.done).padStart(4)} / ${total}  ${(100 * r.done / total).toFixed(1)} %`);
console.log('\nshort capital labels (English <= 8 characters) translated more than 1.6x longer:');
for (const r of report) if (r.long.length) console.log(`  ${r.tag}: ${r.long.length}\n    ` + r.long.join('\n    '));
console.log(`\n${n} checks passed`);
