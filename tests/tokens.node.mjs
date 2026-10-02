/* tokens.node.mjs — mir/tokens.json is honest about the kit's sheets, and docs/TOKENS.md is honest about the schema.
 *   1. every custom property a kit sheet declares or reads (var(), fallbacks included) has a row in the schema
 *   2. every row that is not `proposed` is declared or read in some kit sheet (a stable name that left the sheets is a lie)
 *   3. a `proposed` row is NOT in the sheets yet (when it lands, its status becomes stable) and names its fallback
 *   4. the rows are well formed: one per name, the enumerated fields, an alias points at a real row
 *   5. docs/TOKENS.md is exactly what tools/tokens-doc.mjs renders from the schema
 *   6. the parser does not care about cascade layers: a sheet wrapped in `@layer x { … }` yields the same tokens
 * Kit sheets = every .css under mir/ except vendor/ (tools/lint-intent.mjs kitSheets()), so a new kit sheet is covered
 * the day it lands. */
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { kitSheets, readSheet, parseCss, tokenUse, ROOT } from '../tools/lint-intent.mjs';
import { render, SCHEMA, DOC } from '../tools/tokens-doc.mjs';

const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));
const rows = new Map(schema.tokens.map((t) => [t.name, t]));
const fails = [];

/* 4 · shape */
assert.equal(rows.size, schema.tokens.length, 'a token name appears twice in mir/tokens.json');
const TIER = ['primitive', 'semantic', 'component'], OWNER = ['kit', 'plugin', 'app-input', 'runtime'];
const TYPE = ['color', 'color-channels', 'angle', 'percentage', 'number', 'length', 'shadow', 'filter', 'image', 'duration', 'easing', 'font', 'keyword', 'outline', 'border', 'font-shorthand'];
for (const t of schema.tokens) {
  const bad = (why) => fails.push(`${t.name}: ${why}`);
  if (!/^--[a-z0-9][a-z0-9-]*$/.test(t.name)) bad('not a lower-kebab custom property name');
  if (!TIER.includes(t.tier)) bad(`tier "${t.tier}"`);
  if (!OWNER.includes(t.owner)) bad(`owner "${t.owner}"`);
  if (!TYPE.includes(t.type)) bad(`type "${t.type}"`);
  if (typeof t.skin !== 'boolean') bad('skin must be true or false');
  if (!t.group) bad('no group');
  if (!t.note) bad('no note');
  if (!Array.isArray(t.declaredIn)) bad('declaredIn must be a list of files');
  if (!/^(stable|deprecated|proposed|alias-of:--[a-z0-9-]+)$/.test(t.status)) bad(`status "${t.status}"`);
  if (t.status.startsWith('alias-of:') && !rows.has(t.status.slice(9))) bad(`alias of a name the schema does not have: ${t.status.slice(9)}`);
  if (t.intent && !schema.intents.includes(t.intent)) bad(`intent "${t.intent}" is not a docs/INTENT.md meaning`);
  if (t.status === 'proposed' && !t.fallback && !t.fallbackExpr && !/^--(p-|state-|surface-veil|surface-shadow-|glow-|font-display|label-case|ease-|z-)/.test(t.name)) bad('proposed with no fallback');
  if (t.fallback && !rows.has(t.fallback)) bad(`fallback ${t.fallback} is not in the schema`);
}

/* 1, 2, 3 · the sheets */
const inSheets = new Map();   // name → [file]
for (const f of kitSheets()) {
  const { declared, read } = tokenUse(readSheet(f));
  for (const n of [...declared.keys(), ...read.keys()]) { if (!inSheets.has(n)) inSheets.set(n, new Set()); inSheets.get(n).add(f); }
}
for (const [n, files] of inSheets) if (!rows.has(n)) fails.push(`${n}: used in ${[...files].join(', ')} and missing from mir/tokens.json`);
for (const t of schema.tokens) {
  if (t.status === 'proposed') { if (inSheets.has(t.name)) fails.push(`${t.name}: marked proposed but already in ${[...inSheets.get(t.name)].join(', ')} — make it stable`); }
  else if (!inSheets.has(t.name)) {
    /* the one exception: a runtime token kit SCRIPT writes for apps to read (core/pointer.js --pxs) — the script must still name it */
    const byJs = (t.writtenBy || []).some((f) => fs.existsSync(ROOT + f) && fs.readFileSync(ROOT + f, 'utf8').includes(`'${t.name}'`));
    if (!byJs) fails.push(`${t.name}: marked ${t.status} and no kit sheet declares or reads it (nor does the script it names) — remove the row or mark it proposed`);
  }
}
const declaredNow = new Set(); for (const f of kitSheets()) for (const n of tokenUse(readSheet(f)).declared.keys()) declaredNow.add(n);
for (const t of schema.tokens) if (t.status !== 'proposed' && t.declaredIn.length && !declaredNow.has(t.name)) fails.push(`${t.name}: the schema says it is declared in ${t.declaredIn.join(', ')}; no kit sheet declares it now`);

/* 6 · layers do not change what the parser sees */
for (const f of kitSheets()) {
  const src = fs.readFileSync(ROOT + f, 'utf8');
  const plain = tokenUse(parseCss(src, f)), wrapped = tokenUse(parseCss(`@layer mir.a, mir.b;\n@layer mir.test {\n${src}\n}\n`, f));
  const key = (u) => [...u.declared.keys()].sort().join() + '|' + [...u.read.keys()].sort().join();
  if (key(plain) !== key(wrapped)) fails.push(`${f}: wrapping the sheet in @layer changed the tokens the parser finds`);
}

/* 5 · the generated page */
const want = render(schema), have = fs.existsSync(DOC) ? fs.readFileSync(DOC, 'utf8') : '';
if (want !== have) fails.push('docs/TOKENS.md is stale: run `node tools/tokens-doc.mjs`');

if (fails.length) { console.log(`FAIL tokens schema — ${fails.length} problem(s):\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`PASS tokens schema: ${schema.tokens.length} rows; all ${inSheets.size} names used in ${kitSheets().length} kit sheets are in it; every non-proposed row is in the sheets; @layer-proof; docs/TOKENS.md is up to date`);
