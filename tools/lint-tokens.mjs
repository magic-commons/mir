/* lint-tokens.mjs — every token the kit READS is a token something WRITES.
 *
 *   node tools/lint-tokens.mjs            exit 1 if any var(--x) without a fallback has no definition
 *   node tools/lint-tokens.mjs --unused   also list tokens the kit defines and nothing in the kit reads
 *
 * A token counts as written when a kit sheet declares it (`--x:` in any rule), when kit JavaScript sets it
 * (`setProperty('--x'…)`, or a '--x' string handed to style), or when it is on HOST below: a token the kit
 * deliberately leaves to the app, each with the reason.  A var() WITH a fallback is not an error — the rule
 * says what happens without it — but it is listed when --unused is asked for, so a typo in a fallback-guarded
 * name can still be seen.  A read with no fallback and no writer is a bug: the property silently falls back
 * to its initial value (measured 2026-09-16: --w-medium, --accent-sweep, --line).
 *
 * 1.5.0 · NO :root LADDERS.  The kit is in cascade layers (docs/LAYERS.md): rank comes from the layer, so a
 * `:root:root…` prefix that buys specificity is a bug.  Every kit sheet is counted; a sheet listed in LADDER_FREE
 * fails the lint if one comes back, the others are reported only, until their layer pass lands.
 * The sheets are read as text, so @layer blocks need nothing special: a declaration is a declaration in any block. */
import fs from 'node:fs'; import path from 'node:path';

/* the sheets whose ladders are gone, so a ladder there is an error (docs/LAYERS.md: STEP B) */
export const LADDER_FREE = ['mir/modulation/modhost.css'];

const ROOT = new URL('..', import.meta.url).pathname;
/* written by the app, read by the kit — the contract (docs/CONTRACT.md lists them too) */
export const HOST = {
  '--accent-sweep': 'an accent dial\'s arc angle, written per knob by the app that builds accent dials (λWAVES native-ui.js)',
  '--cx': 'the busy mark\'s pointer x, written by the app that shows a busy mark (λWAVES rack.js)',
  '--cy': 'the busy mark\'s pointer y (λWAVES rack.js)',
};

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'vendor' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const files = walk(path.join(ROOT, 'mir'));
const css = files.filter((f) => f.endsWith('.css')), js = files.filter((f) => f.endsWith('.js'));
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const defined = new Map(), reads = [];
for (const f of css) {
  const src = strip(fs.readFileSync(f, 'utf8'));
  for (const m of src.matchAll(/(^|[\s;{])(--[\w-]+)\s*:/g)) if (!defined.has(m[2])) defined.set(m[2], path.relative(ROOT, f));
  for (const m of src.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
    const line = src.slice(0, m.index).split('\n').length;
    reads.push({ name: m[1], fallback: !!m[2], at: `${path.relative(ROOT, f)}:${line}` });
  }
}
for (const f of js) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/setProperty\(\s*['"`](--[\w-]+)['"`]/g)) if (!defined.has(m[1])) defined.set(m[1], path.relative(ROOT, f) + ' (JS)');
  for (const m of src.matchAll(/['"`](--[\w-]+)\s*:/g)) if (!defined.has(m[1])) defined.set(m[1], path.relative(ROOT, f) + ' (JS string)');
  for (const m of src.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) reads.push({ name: m[1], fallback: !!m[2], at: `${path.relative(ROOT, f)}:${src.slice(0, m.index).split('\n').length}`, js: true });
}

const missing = reads.filter((r) => !r.fallback && !defined.has(r.name) && !(r.name in HOST));
const guarded = reads.filter((r) => r.fallback && !defined.has(r.name) && !(r.name in HOST));
const byName = (list) => { const m = new Map(); for (const r of list) { if (!m.has(r.name)) m.set(r.name, []); m.get(r.name).push(r.at); } return m; };

console.log(`tokens: ${defined.size} written by the kit, ${Object.keys(HOST).length} left to the host, ${new Set(reads.map((r) => r.name)).size} read`);
if (missing.length) {
  console.log(`\nREAD WITH NO WRITER AND NO FALLBACK (${byName(missing).size}) — the property falls back to its initial value:`);
  for (const [n, at] of byName(missing)) console.log(`  ${n}  ← ${at.slice(0, 6).join(', ')}${at.length > 6 ? ` (+${at.length - 6})` : ''}`);
}
if (process.argv.includes('--unused')) {
  if (guarded.length) { console.log(`\nread only behind a fallback, written nowhere in the kit (${byName(guarded).size}):`); for (const [n, at] of byName(guarded)) console.log(`  ${n}  ← ${at.slice(0, 3).join(', ')}`); }
  const readNames = new Set(reads.map((r) => r.name));
  const unused = [...defined.keys()].filter((n) => !readNames.has(n));
  console.log(`\nwritten and never read inside the kit (${unused.length}) — an app may read them; check before removing:`);
  console.log('  ' + unused.join(' '));
}
/* the :root ladder check: selectors (outside comments) carrying two or more :root in a row */
let ladderErrors = 0; const ladderReport = [];
for (const f of css) {
  const rel = path.relative(ROOT, f), n = (strip(fs.readFileSync(f, 'utf8')).match(/:root:root/g) || []).length;
  if (!n) continue;
  if (LADDER_FREE.includes(rel)) { ladderErrors += n; ladderReport.push(`  ${rel}: ${n} — ERROR, this sheet is ladder-free since its layer pass`); }
  else ladderReport.push(`  ${rel}: ${n} (report only until its layer pass lands)`);
}
if (ladderReport.length) console.log(`\n:root ladders (two or more :root in a row):\n${ladderReport.join('\n')}`);
console.log(missing.length ? `\n${byName(missing).size} unwritten token(s)` : '\nevery token the kit reads has a writer');
if (ladderErrors) console.log(`${ladderErrors} :root ladder(s) in a ladder-free sheet`);
process.exit(missing.length || ladderErrors ? 1 : 0);
