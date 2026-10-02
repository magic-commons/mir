#!/usr/bin/env node
/* tests/mir-css.node.mjs — mir/mir.css, the kit's one stylesheet, imports every sheet under mir/ exactly once (the
 * notebook's vendored KaTeX sheet aside, which it loads itself), each import resolves to a file, and base.css comes
 * first (it declares the layer order).  So a new sheet cannot be forgotten. */
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIR = fileURLToPath(new URL('../mir/', import.meta.url));
const src = fs.readFileSync(path.join(MIR, 'mir.css'), 'utf8');
const imports = [...src.matchAll(/@import\s+url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]);
const sheets = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'vendor') walk(p); }
    else if (e.name.endsWith('.css') && p !== path.join(MIR, 'mir.css')) sheets.push(path.relative(MIR, p).split(path.sep).join('/'));
  }
})(MIR);

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };
ok('every import resolves to a sheet', () => { for (const i of imports) assert.ok(fs.existsSync(path.join(MIR, i)), i + ' does not exist'); });
ok('no sheet is imported twice', () => assert.deepEqual(imports.filter((x, i) => imports.indexOf(x) !== i), []));
ok('every sheet under mir/ is imported (vendor/ aside)', () => assert.deepEqual(sheets.filter((s) => !imports.includes(s)).sort(), [], 'missing from mir/mir.css'));
ok('base.css is first: it declares the layer order', () => assert.equal(imports[0], 'css/base.css'));
ok('nothing but imports and comments (an @import after a rule is ignored by the browser)', () => assert.equal(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]+;/g, '').trim(), ''));
console.log(`\nmir-css: ${n} passed`);
