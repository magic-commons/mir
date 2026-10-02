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
  const out = []; let i = 0, line = 1;
  const push = (type, value, l) => out.push({ type, value, line: l });
  const prevSig = () => { for (let k = out.length - 1; k >= 0; k--) return out[k]; return null; };
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
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
const CALLS = { t: 0, tx: 0, label: 1, ariaLabel: 1, writeLabel: 1, chip: 2, setGlyph: 2, infoPanel: 1, el: 3 };
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
export function extract(src, file) {
  const tk = lex(src), found = [], unreached = [];
  const take = (tok) => { if (tok && tok.type === 'str' && words(tok.value) && tok.value.trim()) found.push({ text: tok.value, file, line: tok.line }); };
  const quiet = (k) => { for (let j = Math.max(0, k - 6); j < k; j++) if (tk[j].type === 'ident' && (tk[j].value === 'throw' || tk[j].value === 'console' || tk[j].value === 'Error')) return true; return false; };
  for (let k = 0; k < tk.length; k++) {
    const a = tk[k], b = tk[k + 1], c = tk[k + 2];
    if (a.type === 'ident' && b && b.type === 'punct' && b.value === '(' && a.value in CALLS && !(tk[k - 1] && tk[k - 1].value === 'function')) {
      const arg = args(tk, k + 1)[CALLS[a.value]];
      if (arg && arg.length === 1) take(arg[0]);
      else if (arg && arg[0] && arg[0].type === 'tpl' && a.value === 'el') unreached.push({ file, line: arg[0].line, why: 'template', text: arg[0].value });
    }
    if ((a.type === 'ident' || a.type === 'str') && KEYS.has(a.value) && b && b.type === 'punct' && (b.value === ':' || b.value === '=') && c && (tk[k - 1] ? tk[k - 1].value !== '.' || b.value === '=' : true)) {
      /* `t:` is also a tokenizer's favourite key ({ t: 'num' }): as a part it is a sentence, so it must have a space or a {var} */
      const ok = a.value !== 't' || (b.value === ':' && c.type === 'str' && /\s|\{\w+\}/.test(c.value));
      if (ok && c.type === 'str' && (!tk[k + 3] || tk[k + 3].value !== '+')) take(c);
    }
    if (a.type === 'punct' && a.value === '.' && b && b.type === 'ident' && (b.value === 'title' || b.value === 'placeholder' || b.value === 'textContent') && c && c.value === '=' && tk[k + 3]) {
      const v = tk[k + 3], after = tk[k + 4];
      if (v.type === 'tpl') unreached.push({ file, line: v.line, why: 'template', text: v.value });
      else if (v.type === 'str' && after && after.value === '+') { /* the fragment rule below has it */ }
      else if (v.type === 'str' && b.value === 'textContent' && words(v.value)) unreached.push({ file, line: v.line, why: 'textContent', text: v.value });
      else if (v.type === 'str') take(v);
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
  const sources = new Map(); const unreached = [];
  for (const f of files) {
    const { found, unreached: u } = extract(fs.readFileSync(f, 'utf8'), rel(f));
    for (const s of found) { if (!sources.has(s.text)) sources.set(s.text, new Set()); sources.get(s.text).add(s.file); }
    unreached.push(...u);
  }
  for (const f of walk(path.join(root, css)).filter((f) => f.endsWith('.css')).sort()) unreached.push(...cssContent(fs.readFileSync(f, 'utf8'), rel(f)));
  const keys = [...sources.keys()].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  const catalogue = {
    tag: 'en', name: 'English', dir: 'ltr', reviewed: true,
    fonts: [{ family: 'Roboto', role: 'ui', script: 'Latin (the shipped subset)', licence: 'OFL-1.1', file: 'fonts/Roboto-ui.woff2', status: 'shipped' }],
    type: { case: 'uppercase', tracking: 'house', lineHeight: 1.45 },
    note: 'The catalogue (tools/i18n-extract.mjs writes it; do not edit). A translator copies this file to <tag>.json, keeps the keys, writes each value in the language, and deletes "sources". English needs no pack: it is the fallback.',
    strings: Object.fromEntries(keys.map((k) => [k, k])),
    sources: Object.fromEntries(keys.map((k) => [k, [...sources.get(k)].sort()])),
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
