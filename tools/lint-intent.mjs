#!/usr/bin/env node
/* lint-intent.mjs — the ratchet on the kit's look: it may get better, it may not get worse.
 *
 *   node tools/lint-intent.mjs                     exit 1 if any count in any kit sheet went UP against the baseline
 *   node tools/lint-intent.mjs --report            also print every hit, file:line, per category (--all: no cap)
 *   node tools/lint-intent.mjs --update-baseline   rewrite tools/lint-intent.baseline.json from the tree as it is
 *
 * WHAT IT COUNTS, per kit sheet (every .css under mir/ except vendor/):
 *   lit.*      a LOOK LITERAL outside a custom-property declaration — a value a skin cannot reach.  A literal inside
 *              `--x: …` is where it belongs and is not counted.  A var() fallback IS counted (`var(--a, #fff)` hides
 *              #fff from the token).  colour · shadow (a box-/text-shadow or drop-shadow with a literal in it) ·
 *              radius (not 0, not 50%) · blur · motion (a literal duration or easing) · fontSize · tracking
 *   root2      a complex selector carrying two or more `:root` (the specificity ladder; layers end it)
 *   important  `!important`
 *   relief.*   relief drawn AGAINST docs/INTENT.md, where a machine can see it:
 *     insetAtRest  a well (--neu-inset or a shaded inset) on a button with no state on it — "a well is never a resting button"
 *     accentOn     an accent background on .on / [aria-pressed|checked|selected="true"] — "ON is never an accent fill"
 *     raiseChosen  the raised relief on a chosen/ON control — "press me is never selected"
 *     upShadow     a drop shadow whose y offset is negative — "light comes from above; every shadow falls down"
 *     paneOnButton a pane's float (--glass-shadow, --m2-mat-shadow) on a button — "a pane floats; a button does not"
 *     blur0        `blur(0` — "a switched-off blur is `none`; blur(0) still costs a pass"
 *
 * It parses, it does not grep: comments are blanked (lines kept), braces are tracked, so a sheet wrapped in
 * `@layer x { … }` (MIR 1.5.0) counts exactly what it counted before it was wrapped.  The parser is exported and
 * shared with tests/tokens.node.mjs and tools/tokens-doc.mjs.  No dependencies. */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const BASELINE = path.join(ROOT, 'tools', 'lint-intent.baseline.json');

/* ── the kit's sheets ─────────────────────────────────────────────────────────────────────────────────────── */
export function kitSheets() {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === 'vendor' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
  return walk(path.join(ROOT, 'mir')).filter((f) => f.endsWith('.css')).map((f) => path.relative(ROOT, f).split(path.sep).join('/')).sort();
}

/* ── the parser ───────────────────────────────────────────────────────────────────────────────────────────── */
export const blank = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
/* Every declaration with its file, line, property, value, !important, the rule's selector and the at-rules around
   it (`ctx`, outermost first: `@layer mir.base`, `@media …`).  At-rule preludes ending in `;` (`@layer a, b;`,
   `@import`) are skipped; declarations directly inside an at-rule (`@font-face`, `@property`) are not rules and are
   skipped too. */
export function parseCss(src, file = '') {
  const s = blank(src);
  const decls = [], rules = [], stack = [];
  let buf = '', bl = 1, line = 1, q = null, par = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\n') line++;
    if (q) { buf += c; if (c === q && s[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'") { if (!buf.trim()) bl = line; buf += c; q = c; continue; }
    if (c === '(') par++;
    if (c === ')') par = Math.max(0, par - 1);
    if (c === '{' && !par) {
      const pre = buf.trim().replace(/\s+/g, ' ');
      stack.push({ pre, line: bl, at: pre.startsWith('@') });
      if (!pre.startsWith('@')) rules.push({ file, line: bl, sel: pre, ctx: stack.slice(0, -1).map((x) => x.pre) });
      buf = ''; continue;
    }
    if ((c === ';' && !par) || c === '}') {
      const d = buf.trim(), top = stack.at(-1);
      if (d && !d.startsWith('@') && top && !top.at) {
        const k = d.indexOf(':');
        if (k > 0) {
          const raw = d.slice(k + 1).trim();
          decls.push({ file, line: bl, prop: d.slice(0, k).trim(), val: raw.replace(/\s*!\s*important\s*$/i, ''),
            important: /!\s*important\s*$/i.test(raw), sel: top.pre, ctx: stack.slice(0, -1).map((x) => x.pre) });
        }
      }
      buf = ''; if (c === '}') stack.pop(); continue;
    }
    if (!buf.trim() && !/\s/.test(c)) bl = line;
    buf += c;
  }
  return { decls, rules };
}
export const readSheet = (rel) => parseCss(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel);

/* the custom properties a parsed sheet DECLARES and READS (var(), fallbacks included) */
export function tokenUse({ decls }) {
  const declared = new Map(), read = new Map();
  const add = (m, k, at) => { if (!m.has(k)) m.set(k, []); m.get(k).push(at); };
  for (const d of decls) {
    if (d.prop.startsWith('--')) add(declared, d.prop, d);
    for (const m of d.val.matchAll(/var\(\s*(--[\w-]+)/g)) add(read, m[1], d);
  }
  return { declared, read };
}

/* split at top-level occurrences of `sep` (outside (), [] and quotes) */
export function splitTop(s, sep = ',') {
  const out = []; let depth = 0, q = null, cur = '';
  for (const c of s) {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === sep && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
/* the last compound selector of a complex selector (what the rule actually paints) */
export function lastCompound(complex) {
  let depth = 0, cut = 0;
  for (let i = 0; i < complex.length; i++) {
    const c = complex[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && /[\s>+~]/.test(c)) cut = i + 1;
  }
  return complex.slice(cut).trim();
}
/* var(--x) → V, var(--x, fb) → V(fb): the token is gone, a literal fallback stays visible */
const unvar = (v) => v.replace(/var\(\s*--[\w-]+\s*\)/g, 'V').replace(/var\(\s*--[\w-]+\s*,/g, 'V(');
/* the balanced argument string of the call starting at index i (s[i] is the name's first char, open paren at j) */
function callEnd(s, j) { let d = 0; for (let k = j; k < s.length; k++) { if (s[k] === '(') d++; else if (s[k] === ')' && --d === 0) return k; } return s.length - 1; }

/* ── the literal counters ─────────────────────────────────────────────────────────────────────────────────── */
const COLOUR_FN = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/gi;
function colourLiterals(val) {
  const v = unvar(val).replace(/url\([^)]*\)/g, ''); const hits = [];
  for (const m of v.matchAll(/#[0-9a-f]{3,8}\b/gi)) hits.push(m[0]);
  let m; COLOUR_FN.lastIndex = 0;
  while ((m = COLOUR_FN.exec(v))) {
    const open = m.index + m[0].length - 1, end = callEnd(v, open), call = v.slice(m.index, end + 1);
    if (/\d/.test(call.replace(/^[a-z-]+\(/i, ''))) hits.push(call.length > 48 ? call.slice(0, 45) + '…' : call);
    COLOUR_FN.lastIndex = end + 1;
  }
  for (const n of v.matchAll(/(^|[\s,(])(white|black)(?=$|[\s,)])/gi)) hits.push(n[2]);
  return hits;
}
const SKIP_COLOUR_PROPS = /^(content|font-family|quotes|grid-template-areas|counter-|will-change|transition-property)/;
const isShadowProp = (p) => /^(-webkit-)?(box-shadow|text-shadow)$/.test(p);
const RADIUS_PROP = /^border(-(top|bottom|start|end)-(left|right|start|end))?-radius$/;
const MOTION_PROP = /^(-webkit-)?(transition|animation)(-(duration|delay|timing-function))?$/;
const EASING = /cubic-bezier\(|steps\(|(^|[\s,])(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)(?=$|[\s,])/g;
const DURATION = /(^|[\s,(])-?(\d*\.)?\d+m?s(?=$|[\s,)])/g;

/* ── the relief detectors ─────────────────────────────────────────────────────────────────────────────────── */
/* a class name ends where a word character or a hyphen does not follow: `.sw` must not match `.sw-led` */
const STATE = /:active|:hover|:focus|:checked|:disabled|\.(on|active|drag|dragging|press|pressed|armed|live|open|sel|selected|hot|disabled|is-[\w-]+)(?![\w-])|\[aria-(pressed|expanded|checked|selected|current|disabled)/;
const ON = /\.on(?![\w-])|\[aria-(pressed|checked|selected)="?true"?\]/;
const BUTTON = /(^|[^\w-])button(?![\w-])|\[role="?button"?\]|\.(trig|sw|seg-b|tbtn|mb-btn|mb-item|native-info-button|dock-btn|dev-(power|fold|close|copy|pop|rail|swap)|nb-dump|ab-home)(?![\w-])/;
const WELL = /var\(\s*--(neu-inset|relief-well|face-relief-inset)\b|(^|,)\s*inset\s+-?[\d.]+(px)?\s+[1-9][\d.]*px\s+[1-9]/;
const RAISE = /var\(\s*--(neu-raise|relief-raise|face-relief-raise)\b/;
const ACCENT_BG = /var\(\s*--(acc|acc-soft|acc2|acc2-soft|hue-acc|hue-acc2)\b/;
const PANE = /var\(\s*--(glass-shadow|m2-mat-shadow|surface-shadow)\b/;
/* a light, not a shadow: white, #fff, rgb 255s, or an hsl lightness of 60% and up (the raise's top-left highlight) */
const isHighlight = (layer) => /(#fff\b|#ffffff\b|\bwhite\b|rgba?\(\s*255\s*,\s*255\s*,\s*255)/i.test(layer)
  || [...layer.matchAll(/hsla?\(\s*[^\s,]+[\s,]+[^\s,]+[\s,]+([\d.]+)%/g)].some((m) => parseFloat(m[1]) >= 60);
function upShadowLayers(val) {
  const hits = [];
  for (const layer of splitTop(val)) {
    if (/^\s*inset\b/.test(layer) || /\binset\s*$/.test(layer) || isHighlight(layer)) continue;
    const nums = [...unvar(layer).matchAll(/(^|\s)(-?(\d*\.)?\d+)(px|em|rem)?(?=\s|$)/g)].map((m) => parseFloat(m[2]));
    if (nums.length >= 3 && nums[1] < 0) hits.push(layer.trim());
  }
  return hits;
}
const looksLikeShadowList = (v) => splitTop(v).some((l) => /(^|\s)-?[\d.]+px\s+-?[\d.]+px/.test(l) && /(hsl|rgb|#|black|white|transparent|color-mix)/.test(l));

export const CATEGORIES = ['lit.colour', 'lit.shadow', 'lit.radius', 'lit.blur', 'lit.motion', 'lit.fontSize', 'lit.tracking',
  'root2', 'important', 'relief.insetAtRest', 'relief.accentOn', 'relief.raiseChosen', 'relief.upShadow', 'relief.paneOnButton', 'relief.blur0'];

export function scan(rel) {
  const parsed = readSheet(rel);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])), hits = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  const hit = (cat, line, text, n = 1) => { counts[cat] += n; hits[cat].push({ at: `${rel}:${line}`, text, n }); };
  for (const r of parsed.rules) for (const part of splitTop(r.sel)) {
    if ((part.match(/:root\b/g) || []).length >= 2) hit('root2', r.line, part.length > 90 ? part.slice(0, 87) + '…' : part);
  }
  for (const d of parsed.decls) {
    const p = d.prop.toLowerCase(), isToken = p.startsWith('--'), v = d.val;
    if (d.important) hit('important', d.line, `${d.prop}  {${d.sel.slice(0, 60)}}`);
    if (/blur\(\s*0(\.0+)?(px)?\s*\)/.test(v)) hit('relief.blur0', d.line, `${d.prop}: ${v.slice(0, 70)}`);
    if ((isShadowProp(p) || isToken) && (!isToken || looksLikeShadowList(v))) for (const l of upShadowLayers(v)) hit('relief.upShadow', d.line, `${d.prop}: … ${l}`);
    if (!isToken) {
      if (!SKIP_COLOUR_PROPS.test(p)) { const c = colourLiterals(v); if (c.length) hit('lit.colour', d.line, `${d.prop}: ${c.join(' · ')}`, c.length); }
      const u = unvar(v);
      if ((isShadowProp(p) && /\d/.test(u.replace(/\bV\b/g, ''))) || (/filter$/.test(p) && /drop-shadow\([^)]*\d/.test(u))) hit('lit.shadow', d.line, `${d.prop}: ${v.slice(0, 80)}`);
      if (RADIUS_PROP.test(p) && splitTop(u, ' ').some((t) => /\d/.test(t) && !/^(0(px)?|50%)$/.test(t))) hit('lit.radius', d.line, `${d.prop}: ${v}`);
      for (const m of u.matchAll(/blur\(\s*([\d.]+[a-z]*)\s*\)/g)) if (!/^0(px)?$/.test(m[1])) hit('lit.blur', d.line, `${d.prop}: blur(${m[1]})`);
      if (MOTION_PROP.test(p)) { const n = [...u.matchAll(DURATION)].length + [...u.matchAll(EASING)].length; if (n) hit('lit.motion', d.line, `${d.prop}: ${v.slice(0, 80)}`, n); }
      if (p === 'font-size' ? /\d/.test(u) : p === 'font' && /(^|[\s/])[\d.]+(px|em|rem|pt|%)/.test(u)) hit('lit.fontSize', d.line, `${d.prop}: ${v.slice(0, 60)}`);
      if (p === 'letter-spacing' && /\d/.test(u) && !/^0(\.0+)?(em|px)?$/.test(u.trim())) hit('lit.tracking', d.line, `${d.prop}: ${v}`);
      /* relief against the vocabulary: judged on what the rule paints, its LAST compound, never a pseudo-element */
      for (const part of splitTop(d.sel)) {
        const lc = lastCompound(part); if (lc.includes('::') || /:(before|after)\b/.test(lc)) continue;
        if (p === 'box-shadow' && BUTTON.test(lc) && !STATE.test(lc) && WELL.test(v)) hit('relief.insetAtRest', d.line, `${part}  {${v.slice(0, 50)}}`);
        if (/^background(-color|-image)?$/.test(p) && ON.test(lc) && ACCENT_BG.test(v)) hit('relief.accentOn', d.line, `${part}  {${v.slice(0, 50)}}`);
        if (p === 'box-shadow' && ON.test(lc) && RAISE.test(v)) hit('relief.raiseChosen', d.line, `${part}  {${v.slice(0, 50)}}`);
        if (p === 'box-shadow' && BUTTON.test(lc) && PANE.test(v)) hit('relief.paneOnButton', d.line, `${part}  {${v.slice(0, 50)}}`);
      }
    }
  }
  return { counts, hits };
}

/* ── main ─────────────────────────────────────────────────────────────────────────────────────────────────── */
function main() {
  const argv = process.argv.slice(2), report = argv.includes('--report'), all = argv.includes('--all');
  const sheets = kitSheets(), now = {}, detail = {};
  for (const f of sheets) { const r = scan(f); now[f] = r.counts; detail[f] = r.hits; }
  const LABEL = { 'lit.colour': 'colour', 'lit.shadow': 'shadow', 'lit.radius': 'radius', 'lit.blur': 'blur', 'lit.motion': 'motion', 'lit.fontSize': 'fsize',
    'lit.tracking': 'track', root2: 'root2', important: '!imp', 'relief.insetAtRest': 'wellBtn', 'relief.accentOn': 'accOn', 'relief.raiseChosen': 'raiseOn',
    'relief.upShadow': 'upShad', 'relief.paneOnButton': 'paneBtn', 'relief.blur0': 'blur0' };
  const table = () => {
    const w = Math.max(...sheets.map((s) => s.length));
    console.log(''.padEnd(w) + ' ' + CATEGORIES.map((c) => LABEL[c].padStart(8)).join(''));
    for (const f of sheets) console.log(f.padEnd(w) + ' ' + CATEGORIES.map((c) => String(now[f][c]).padStart(8)).join(''));
    const tot = Object.fromEntries(CATEGORIES.map((c) => [c, sheets.reduce((a, f) => a + now[f][c], 0)]));
    console.log('TOTAL'.padEnd(w) + ' ' + CATEGORIES.map((c) => String(tot[c]).padStart(8)).join(''));
    return tot;
  };
  if (argv.includes('--update-baseline')) {
    const totals = table();
    fs.writeFileSync(BASELINE, JSON.stringify({ about: 'tools/lint-intent.mjs — counts may go down, never up. Rewrite with --update-baseline after a cleanup.',
      categories: CATEGORIES, sheets: now, totals }, null, 2) + '\n');
    console.log(`\nbaseline written: ${path.relative(ROOT, BASELINE)}`);
    return 0;
  }
  const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).sheets : {};
  const up = [], down = [];
  for (const f of sheets) for (const c of CATEGORIES) {
    const was = base[f]?.[c] ?? 0, is = now[f][c];
    if (is > was) up.push({ f, c, was, is }); else if (is < was) down.push({ f, c, was, is });
  }
  for (const f of Object.keys(base)) if (!sheets.includes(f)) down.push({ f, c: '(sheet gone)', was: '', is: '' });
  if (report) {
    const tot = table();
    const cap = all ? Infinity : 12;
    for (const c of CATEGORIES) {
      const list = sheets.flatMap((f) => detail[f][c]);
      if (!list.length) continue;
      console.log(`\n── ${c}  (${tot[c]})`);
      if (c === 'lit.colour') {   /* the values written out most often, then the sites */
        const freq = new Map(); for (const h of list) for (const v of h.text.replace(/^[^:]+:\s*/, '').split(' · ')) freq.set(v, (freq.get(v) || 0) + 1);
        console.log('   most repeated: ' + [...freq].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([v, n]) => `${n}× ${v}`).join('  '));
      }
      for (const h of list.slice(0, cap)) console.log(`   ${h.at.padEnd(44)} ${h.text}`);
      if (list.length > cap) console.log(`   … ${list.length - cap} more (--all)`);
    }
    console.log('');
  }
  for (const d of down) console.log(`better  ${d.f}  ${d.c}  ${d.was} → ${d.is}`);
  if (down.length) console.log('(counts went down: run `node tools/lint-intent.mjs --update-baseline` to lock the gain in)');
  if (up.length) {
    for (const u of up) console.log(`WORSE   ${u.f}  ${u.c}  ${u.was} → ${u.is}`);
    console.log(`\nintent lint: ${up.length} count(s) went UP — see docs/INTENT.md; \`--report\` lists every hit with file:line`);
    return 1;
  }
  console.log(`intent lint: ok — no count went up across ${sheets.length} kit sheets`);
  return 0;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) process.exit(main());
