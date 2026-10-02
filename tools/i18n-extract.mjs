#!/usr/bin/env node
/* i18n-extract.mjs — the English catalogue: every string the kit hands to t(), once, with the files it came from.
 *
 *   node tools/i18n-extract.mjs              write mir/locales/en.json (the catalogue) and mir/locales/en.unreached.json
 *   node tools/i18n-extract.mjs --check      exit 1 if either file is not what the source says now (stale)
 *   node tools/i18n-extract.mjs --root lab --out lab/locales/en.json --css lab
 *                                            an app's own catalogue, from its own folder (the same rules)
 *
 * WHAT IT READS.  It lexes JavaScript (comments, strings, template literals and regex literals are told apart; no
 * dependency) and takes a string literal when it sits at a choke point:
 *   t('…')  ·  label(x, '…')  ·  ariaLabel(x, '…')  ·  chip(x, glyph, '…')  ·  setGlyph(x, glyph, '…')  ·  infoPanel(x, '…')
 *   el(tag, cls, parent, '…')  ·  a key  label: / title: / aria: / eyebrow: / hint: / t:  '…'  (and `label = '…'`)
 *   x.title = '…'  ·  x.placeholder = '…'  ·  setAttribute('aria-label' | 'title', '…')
 * A title is a hint (control-help.js translates it), so hints are in the catalogue too.
 *
 * WHAT IT CANNOT REACH (en.unreached.json, for a later pass to rewrite as whole sentences):
 *   fragment   a literal with a leading or trailing space or joiner, beside a `+`: ' window controls'
 *   template   a template literal with ${…} written into the page (textContent, aria-label, title, el text)
 *   textContent  a literal written by .textContent = '…', which skips t()
 *   css        a CSS `content:` string with words in it
 * Errors (throw, console) are never user strings and are skipped. */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const CHECK = process.argv.includes('--check');
const SRC = arg('--root', 'mir'), OUT = arg('--out', 'mir/locales/en.json'), CSS = arg('--css', SRC);
const REPORT = OUT.replace(/\.json$/, '.unreached.json');

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (e.name === 'vendor' || e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);

/* ── the lexer: just enough JavaScript to know what is a string ── */
const REGEX_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', 'return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'throw', '=>', '&&', '||', '??']);
export function lex(src) {
  const out = []; out.notes = new Map(); let i = 0, line = 1;
  const push = (type, value, l) => out.push({ type, value, line: l });
  const prevSig = () => { for (let k = out.length - 1; k >= 0; k--) return out[k]; return null; };
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') {
      const j0 = i; while (i < src.length && src[i] !== '\n') i++;
      /* a translator's note: `// tr: …` is for every key on its line, `// tr[KEY]: …` for that key only */
      for (const part of src.slice(j0, i).trim().split(/\s+(?=\/\/\s*tr[[:])/)) {   // several notes may share a line
        const m = /^\/\/\s*tr(?:\[([^\]]+)\])?:\s*(.+)$/.exec(part);
        if (m) { const at = out.notes.get(line) || []; at.push({ key: m[1] || null, text: m[2].trim() }); out.notes.set(line, at); }
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? src.length : e + 2; line += (src.slice(i, end).match(/\n/g) || []).length; i = end; continue; }
    if (c === '"' || c === "'") {
      const l = line; let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') { s += unesc(src[j + 1], src, j); j += escLen(src, j); continue; } if (src[j] === '\n') line++; s += src[j++]; }
      push('str', s, l); i = j + 1; continue;
    }
    if (c === '`') {
      const l = line; let j = i + 1, s = '', dyn = false;
      while (j < src.length && src[j] !== '`') {
        if (src[j] === '\\') { s += unesc(src[j + 1], src, j); j += escLen(src, j); continue; }
        if (src[j] === '$' && src[j + 1] === '{') { dyn = true; s += '${}'; let depth = 1; j += 2; while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; else if (src[j] === '\n') line++; j++; } continue; }
        if (src[j] === '\n') line++;
        s += src[j++];
      }
      push(dyn ? 'tpl' : 'str', s, l); i = j + 1; continue;
    }
    if (c === '/') {
      const p = prevSig();
      if (!p || (p.type === 'punct' && REGEX_AFTER.has(p.value)) || (p.type === 'ident' && REGEX_AFTER.has(p.value))) {
        let j = i + 1, cls = false;
        while (j < src.length && src[j] !== '\n') { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; else if (src[j] === '/' && !cls) break; j++; }
        j++; while (/[a-z]/i.test(src[j] || '')) j++;
        push('regex', src.slice(i, j), line); i = j; continue;
      }
    }
    if (/[A-Za-z_$]/.test(c)) { let j = i; while (/[\w$]/.test(src[j] || '')) j++; push('ident', src.slice(i, j), line); i = j; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (/[\w.]/.test(src[j] || '')) j++; push('num', src.slice(i, j), line); i = j; continue; }
    const three = src.slice(i, i + 3), two = src.slice(i, i + 2);
    if (['===', '!==', '...', '**=', '??=', '&&=', '||='].includes(three)) { push('punct', three, line); i += 3; continue; }
    if (['=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/='].includes(two)) { push('punct', two, line); i += 2; continue; }
    push('punct', c, line); i++;
  }
  return out;
}
function escLen(src, j) { const n = src[j + 1]; if (n === 'u') return src[j + 2] === '{' ? src.indexOf('}', j) - j + 1 : 6; if (n === 'x') return 4; return 2; }
function unesc(n, src, j) {
  if (n === 'n') return '\n'; if (n === 't') return '\t'; if (n === 'r') return '\r';
  if (n === 'u') { const h = src[j + 2] === '{' ? src.slice(j + 3, src.indexOf('}', j)) : src.slice(j + 2, j + 6); return String.fromCodePoint(parseInt(h, 16)); }
  if (n === 'x') return String.fromCharCode(parseInt(src.slice(j + 2, j + 4), 16));
  if (n === '\n') return '';
  return n;
}

/* ── the choke points ── */
const KEYS = new Set(['label', 'title', 'aria', 'eyebrow', 'hint', 't']);
/* the kit's own names for the choke points: [the argument that is the English, the argument that is its context] */
const CALLS = { t: [0, 2], label: [1, 3], ariaLabel: [1, 3], hint: [1, 3], phrase: [0, 1], chip: [2], setGlyph: [2], infoPanel: [1], el: [3] };
/** this file's own names for them: `import { label as kitLabel } from '../kit.js'` makes kitLabel a label() */
function aliases(src) {
  const map = Object.assign(Object.create(null), Object.fromEntries(Object.keys(CALLS).map((k) => [k, k]))); map.tn = 'tn';
  const re = /import\s*\{([^}]*)\}\s*from\s*'[^']*(?:kit|i18n)\.js'/g; let m;
  while ((m = re.exec(src))) for (const part of m[1].split(',')) { const [a, b] = part.trim().split(/\s+as\s+/); if (b && (a in CALLS || a === 'tn')) map[b.trim()] = a; }
  return map;
}
/** a sentence-shaped `t:` value (a {t} var or a part), not a tokenizer's { t: 'num' } */
const tWord = (v) => /\s|\{|::/.test(v) || (/^[A-Z0-9][A-Z0-9 ·\-–\/'’+%&]*$/.test(v) && /[A-Z]{2}/.test(v));
const words = (s) => /\p{L}/u.test(s);
/** prose, not markup, CSS, a selector, a key prefix or a word list: letters, spaces and a sentence's punctuation only */
const prose = (s) => {
  const x = s.trim();
  if (!/^[\p{L}\p{N}\s·—–,.:'’…?!*-]+$/u.test(s) || !/\p{L}{2}/u.test(x) || /^[\w-]+:$/.test(x)) return false;
  if (/\.\w/.test(x) || (!/\s/.test(x) && /[:.]/.test(x))) return false;   // a selector, a key prefix (':hit', 'info:bodies:')
  const w = x.split(/\s+/);
  if (w.every((y) => /^[a-z0-9-]+$/.test(y)) && w.some((y) => y.includes('-'))) return false;   // a class list
  return !(w.length >= 8 && /^[a-z\s]+$/.test(x));   // a long run of bare lowercase words is a table (CSS colour names), not a sentence
};
/** the argument tokens of a call whose '(' is at k: [[tokens of arg 0], [arg 1], …] and the index after ')' */
function args(tk, k) {
  const list = [[]]; let depth = 0, i = k;
  for (; i < tk.length; i++) {
    const v = tk[i].type === 'punct' ? tk[i].value : null;
    if (v === '(' || v === '[' || v === '{') { depth++; if (depth === 1) continue; }
    else if (v === ')' || v === ']' || v === '}') { depth--; if (depth === 0) break; }
    else if (v === ',' && depth === 1) { list.push([]); continue; }
    list[list.length - 1].push(tk[i]);
  }
  return list;
}
/** the tokens of one value from index k: up to the first `,` `;` `)` `]` `}` at its own depth */
function valueAt(tk, k) {
  const out = []; let depth = 0;
  for (let i = k; i < tk.length; i++) {
    const v = tk[i].type === 'punct' ? tk[i].value : null;
    if (v === '(' || v === '[' || v === '{') depth++;
    else if (v === ')' || v === ']' || v === '}') { if (depth === 0) break; depth--; }
    else if ((v === ',' || v === ';') && depth === 0) break;
    out.push(tk[i]);
  }
  return out;
}
/** the English strings a value can be: the one literal, or each branch of `cond ? 'A' : 'B'` */
function choices(arg) {
  if (!arg || !arg.length) return [];
  if (arg.length === 1) return arg[0].type === 'str' ? [arg[0]] : [];
  if (!arg.some((x) => x.type === 'punct' && x.value === '?')) return [];
  return arg.filter((x, i) => x.type === 'str' && i > 0 && arg[i - 1].type === 'punct' && (arg[i - 1].value === '?' || arg[i - 1].value === ':')
    && (i === arg.length - 1 || (arg[i + 1].type === 'punct' && arg[i + 1].value === ':')));
}
export function extract(src, file) {
  const tk = lex(src), found = [], unreached = [], names = aliases(src);
  const ctxOf = (arg) => (arg && arg.length === 1 && arg[0].type === 'str' && /^[a-z][a-z0-9 -]*$/.test(arg[0].value) ? arg[0].value : null);
  const take = (tok, context, plural) => {
    if (!(tok && tok.type === 'str' && words(tok.value) && tok.value.trim())) return;
    const text = context ? context + '::' + tok.value : tok.value;
    const notes = tk.notes.get(tok.line) || [], mine = notes.find((n) => n.key === text || n.key === tok.value) || notes.find((n) => !n.key);
    found.push({ text, file, line: tok.line, note: mine && mine.text, plural });
    /* every {:LABEL} a sentence quotes is a key of its own: the button as that language labels it */
    for (const m of tok.value.matchAll(/\{:([^{}]+)\}/g)) found.push({ text: m[1], file, line: tok.line });
  };
  const quiet = (k) => { for (let j = Math.max(0, k - 6); j < k; j++) if (tk[j].type === 'ident' && (tk[j].value === 'throw' || tk[j].value === 'console' || tk[j].value === 'Error')) return true; return false; };
  for (let k = 0; k < tk.length; k++) {
    const a = tk[k], b = tk[k + 1], c = tk[k + 2];
    const fn = a.type === 'ident' && b && b.type === 'punct' && b.value === '(' && names[a.value] && !(tk[k - 1] && (tk[k - 1].value === 'function' || tk[k - 1].value === '.')) ? names[a.value] : null;
    if (a.type === 'punct' && a.value === '.' && b && b.type === 'ident' && b.value === 'setLabel' && c && c.value === '(') {   // trig().setLabel, fader().setLabel
      for (const x of choices(args(tk, k + 2)[0])) take(x);
    }
    if (fn === 'tn') {                                          // tn(n, one, other, vars, context): the key is `other`
      const all = args(tk, k + 1), ctx = ctxOf(all[4]), one = all[1], other = all[2];
      if (one && one.length === 1 && other && other.length === 1 && other[0].type === 'str') take(other[0], ctx, { one: one[0].value });
    } else if (fn) {
      const all = args(tk, k + 1), [at, ct] = CALLS[fn], arg = all[at];
      const cs = choices(arg);
      if (cs.length) for (const x of cs) take(x, ct === undefined ? null : ctxOf(all[ct]));
      else if (arg && arg[0] && arg[0].type === 'tpl' && fn === 'el') unreached.push({ file, line: arg[0].line, why: 'template', text: arg[0].value });
    }
    if ((a.type === 'ident' || a.type === 'str') && KEYS.has(a.value) && b && b.type === 'punct' && (b.value === ':' || b.value === '=') && c && (tk[k - 1] ? tk[k - 1].value !== '.' || b.value === '=' : true)) {
      /* `t:` is also a tokenizer's favourite key ({ t: 'num' }): as a part it is a sentence, so it must have a space or a {var} */
      const ok = a.value !== 't' || (b.value === ':' && c.type === 'str' && tWord(c.value));
      const val = valueAt(tk, k + 2), cs = choices(val);
      if (ok && cs.length && !(val.length === 1 && tk[k + 3] && tk[k + 3].value === '+')) for (const x of cs) take(x);
      else if (ok && c.value === '[' && tk[k + 3] && tk[k + 3].type === 'str' && tk[k + 4] && tk[k + 4].value === ',') take(tk[k + 3]);   // title: ['… {x} …', { x }]
    }
    if (a.type === 'punct' && a.value === '.' && b && b.type === 'ident' && (b.value === 'title' || b.value === 'placeholder' || b.value === 'textContent') && c && c.value === '=' && tk[k + 3]) {
      const v = tk[k + 3], after = tk[k + 4];
      if (v.type === 'tpl') unreached.push({ file, line: v.line, why: 'template', text: v.value });
      else if (v.type === 'str' && after && after.value === '+') { /* the fragment rule below has it */ }
      else if (v.type === 'str' && b.value === 'textContent' && words(v.value)) unreached.push({ file, line: v.line, why: 'textContent', text: v.value });
      else if (v.type === 'str') take(v);
      else for (const x of choices(valueAt(tk, k + 3))) take(x);   // x.title = cond ? 'A' : 'B'
    }
    if (a.type === 'ident' && a.value === 'setAttribute' && b && b.value === '(') {
      const [n, v] = args(tk, k + 1);
      if (n && n.length === 1 && n[0].type === 'str' && (n[0].value === 'aria-label' || n[0].value === 'title') && v) {
        if (v.length === 1) take(v[0]); else if (v[0] && v[0].type === 'tpl') unreached.push({ file, line: v[0].line, why: 'template', text: v[0].value });
      }
    }
    /* a fragment: words with an edge of space or a joiner, beside a + — the sentence is assembled in code */
    if ((a.type === 'str' || a.type === 'tpl') && prose(a.value) && /^[\s·:—–,;(]|[\s·:—–,;(]$/.test(a.value)
      && ((tk[k - 1] && tk[k - 1].value === '+') || (b && b.value === '+')) && !quiet(k) && !/^[\w-]+$/.test(a.value.trim())) {   // one bare token is a class name
      unreached.push({ file, line: a.line, why: 'fragment', text: a.value });
    }
  }
  /* a table of NAMES (shell/themes.js): a `// tr: names` note makes every capital-letters literal in the file a name */
  if ([...tk.notes.values()].some((l) => l.some((n) => !n.key && n.text === 'names'))) {
    for (const x of tk) if (x.type === 'str' && /^[A-Z][A-Z0-9]+$/.test(x.value)) found.push({ text: 'name::' + x.value, file, line: x.line });
  }
  return { found, unreached };
}

export function cssContent(src, file) {
  const out = []; const re = /content\s*:\s*(["'])((?:\\.|(?!\1).)*)\1/g; let m;
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, ' '));
  while ((m = re.exec(clean))) if (words(m[2].replace(/\\[0-9a-f]+\s?/gi, ''))) out.push({ file, line: clean.slice(0, m.index).split('\n').length, why: 'css', text: m[2] });
  return out;
}

export function build({ root = ROOT, src = SRC, css = CSS } = {}) {
  const rel = (f) => path.relative(root, f).split(path.sep).join('/');
  const files = walk(path.join(root, src)).filter((f) => f.endsWith('.js') || f.endsWith('.mjs')).sort();
  const sources = new Map(), notes = new Map(), plural = new Map(); const unreached = [];
  for (const f of files) {
    const { found, unreached: u } = extract(fs.readFileSync(f, 'utf8'), rel(f));
    for (const s of found) {
      if (!sources.has(s.text)) sources.set(s.text, new Set()); sources.get(s.text).add(s.file);
      if (s.note && !notes.has(s.text)) notes.set(s.text, s.note);
      if (s.plural) plural.set(s.text, s.plural);
    }
    unreached.push(...u);
  }
  for (const f of walk(path.join(root, css)).filter((f) => f.endsWith('.css')).sort()) unreached.push(...cssContent(fs.readFileSync(f, 'utf8'), rel(f)));
  const order = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  const all = [...sources.keys()].sort(order), keys = all.filter((k) => !k.startsWith('name::')), nameKeys = all.filter((k) => k.startsWith('name::'));
  const en = (k) => k.replace(/^[a-z][a-z0-9 -]*::/, '');
  const catalogue = {
    tag: 'en', name: 'English', dir: 'ltr', reviewed: true,
    fonts: [{ family: 'Roboto', role: 'ui', script: 'Latin (the shipped subset)', licence: 'OFL-1.1', file: 'fonts/Roboto-ui.woff2', status: 'shipped' }],
    type: { case: 'uppercase', tracking: 'house', lineHeight: 1.45 },
    note: 'The catalogue (tools/i18n-extract.mjs writes it; do not edit). Each key is the English; a key `context::ENGLISH` is one meaning of a word that has two. `strings` is English itself as a pack (a plural key holds its English forms); `notes` says what a key means where that is not obvious; `names` are names, never translated; `sources` says where each key is used. docs/LANGUAGES.md §11 and FOR-TRANSLATORS say how to fill a pack.',
    strings: Object.fromEntries(keys.map((k) => [k, plural.has(k) ? { one: plural.get(k).one, other: en(k) } : en(k)])),
    notes: Object.fromEntries(keys.filter((k) => notes.has(k)).map((k) => [k, notes.get(k)])),
    names: nameKeys.map(en),
    sources: Object.fromEntries(all.map((k) => [k, [...sources.get(k)].sort()])),
  };
  unreached.sort((x, y) => (x.file < y.file ? -1 : x.file > y.file ? 1 : x.line - y.line));
  return { catalogue, unreached };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { catalogue, unreached } = build();
  const a = JSON.stringify(catalogue, null, 1) + '\n', b = JSON.stringify(unreached, null, 1) + '\n';
  const outA = path.join(ROOT, OUT), outB = path.join(ROOT, REPORT);
  if (CHECK) {
    const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
    const stale = [read(outA) !== a && OUT, read(outB) !== b && REPORT].filter(Boolean);
    if (stale.length) { console.log('STALE  ' + stale.join(', ') + ' — run: node tools/i18n-extract.mjs'); process.exit(1); }
    console.log(`in step: ${Object.keys(catalogue.strings).length} strings, ${unreached.length} unreached`);
  } else {
    fs.mkdirSync(path.dirname(outA), { recursive: true });
    fs.writeFileSync(outA, a); fs.writeFileSync(outB, b);
    const by = unreached.reduce((m, u) => ((m[u.why] = (m[u.why] || 0) + 1), m), {});
    console.log(`wrote ${OUT}: ${Object.keys(catalogue.strings).length} strings · ${REPORT}: ${unreached.length} unreached ${JSON.stringify(by)}`);
  }
}
