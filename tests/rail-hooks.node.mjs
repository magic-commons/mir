/* rail-hooks.node.mjs — the modulation chip rail is styled by hooks, never by its English label (MIR 1.5). */
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const kit = walk(path.join(ROOT, 'mir')).filter((f) => /\.(css|js)$/.test(f));

/* 1. no kit sheet selects on the label text */
for (const f of kit.filter((f) => f.endsWith('.css'))) {
  const css = fs.readFileSync(f, 'utf8');
  ok(!/window controls"\]/.test(css), `${path.relative(ROOT, f)} still selects on the label text`);
}
const host = read('mir/modulation/modhost.css'), win = read('mir/modulation/modwindow/modwindow.css');
ok(/\[data-mir-rail="modulation"\]/.test(host) && /\[data-mir-rail="modulation"\]/.test(win), 'both sheets key the rail by [data-mir-rail="modulation"]');

/* 2. the builder sets both hooks, and keeps the label */
const js = read('mir/modulation/modwindow/modwindow.js');
const builder = js.slice(js.indexOf('export function buildChipRail'), js.indexOf('THE RACK'));
ok(/rail\.dataset\.mirRail\s*=/.test(builder), 'buildChipRail sets data-mir-rail on the rail');
ok(/\.dataset\.mirChip\s*=/.test(builder), 'buildChipRail sets data-mir-chip on every chip');
ok(/setAttribute\('aria-label',\s*\(title \|\| windowRoot\.id\) \+ ' window controls'\)/.test(builder), 'the aria-label is unchanged');

/* 3. no kit file sets or reads data-ink on a chip; the glyph name lives in data-glyph */
for (const f of kit) {
  const s = fs.readFileSync(f, 'utf8');
  ok(!/dataset\.ink\b|data-ink/.test(s), `${path.relative(ROOT, f)} still uses the chips' data-ink`);
}
ok(/closeChip\.dataset\.glyph\s*=\s*'close'/.test(builder) && /b\.dataset\.glyph\s*=\s*c\.glyph/.test(builder), 'chips name their glyph with data-glyph');

console.log(`rail hooks: ${n} checks PASS`);
