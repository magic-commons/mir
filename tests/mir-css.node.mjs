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
/* 1.5.7-alpha.16 · THE MENU PANE KEEPS ITS FLOOR: the menu floors outweigh every card style's pane veil and fill (FROST · ALWAYS's dark veil and
   FROST · STILL's fill tied the pane's floor and won, being later; the bar's list lost outright) — specificity compared as (ids, classes, elements) */
const spec = (s) => { s = s.replace(/:where\((?:[^()]|\([^()]*\))*\)/g, '').replace(/:not\(/g, '(');
  return [(s.match(/#[\w-]+/g) || []).length, (s.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g) || []).length, (s.match(/(?:^|[\s>+~(])[a-z][\w-]*/g) || []).length]; };
const more = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const sel = (file, needle) => { const css = fs.readFileSync(path.join(MIR, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/([^{}]+)\{/g)].flatMap((m) => m[1].split(',').map((x) => x.trim())).filter((x) => x.includes(needle)); };
ok('the menu pane keeps its floor (1.5.7-alpha.16): the floor outweighs the frost veil and the STILL fill', () => {
  const floor = sel('css/skin.css', '.glass[data-mir-surface="menu"]:not([hidden])'), bar = sel('shell/shell.css', '#menubar .mb-list:not([hidden])');
  assert.equal(floor.length, 1); assert.equal(bar.length, 1);
  for (const v of sel('css/skin.css', 'body.frost').filter((x) => /\.glass$/.test(x))) assert.ok(more(spec(floor[0]), spec(v)) > 0, floor[0] + ' does not outweigh ' + v);
  for (const v of sel('shell/shell.css', '#menubar .mb-list').filter((x) => x !== bar[0] && x.startsWith('body'))) assert.ok(more(spec(bar[0]), spec(v)) >= 0, bar[0] + ' is outweighed by ' + v);
});
console.log(`\nmir-css: ${n} passed`);
