/* extract-shell-css.mjs — how mir/shell/shell.css was made, kept so it can be made again.
 *
 *   node tools/extract-shell-css.mjs <served λWAVES url> <λWAVES lab dir> <out.css>
 *   e.g. node tools/extract-shell-css.mjs http://127.0.0.1:8779/index.html ~/Documents/LAMBDAWAVES/lab /tmp/shell-extract.css
 *
 * It takes, from λWAVES' app sheets (lab.css, skin.css), every rule that can style the SHELL — #title, #menubar
 * (every list filled), #notebook (NOTES and ABOUT faces, a markdown view) — in cascade order, with each declaration
 * block kept byte for byte (so -webkit- aliases survive, which a CSSOM round-trip would drop), and each selector
 * list trimmed to the components that can match.  Relevance is decided by the live page: body/html/:root compounds
 * are relaxed (theme, phone, frost… are all states the shell must carry), dynamic pseudo-classes and pseudo-elements
 * are stripped, JS-set states (.turn, .busy on the mark) are applied, and the DOM is tried in every face × mode.
 * The output is then prefixed with the stage section and the header by hand (see mir/shell/shell.css). */
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './cdp.mjs';
const [URL_LW, LAB, OUT_CSS] = process.argv.slice(2);
if (!URL_LW || !LAB || !OUT_CSS) { console.error('usage: extract-shell-css.mjs <served λWAVES url> <λWAVES lab dir> <out.css>'); process.exit(2); }
const LW = LAB.endsWith('/') ? LAB : LAB + '/';
const KIT = new URL('../mir/css/', import.meta.url).pathname;

/* ── a small CSS parser that keeps source text ── */
function parse(src, file) {
  const items = []; let i = 0; const n = src.length;
  const skipWsComments = () => { for (;;) { while (i < n && /\s/.test(src[i])) i++; if (src.startsWith('/*', i)) { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; } else break; } };
  const readUntilBlockOrSemi = () => { const s = i; let depthP = 0, q = null;
    for (; i < n; i++) { const c = src[i];
      if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (src.startsWith('/*', i)) { const e = src.indexOf('*/', i + 2); i = (e < 0 ? n : e + 2) - 1; continue; }
      if (c === '(') depthP++; else if (c === ')') depthP--;
      else if ((c === '{' || c === ';') && depthP === 0) break; }
    return src.slice(s, i); };
  const readBlock = () => { /* at '{' */ const s = i + 1; let d = 0, q = null;
    for (; i < n; i++) { const c = src[i];
      if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (src.startsWith('/*', i)) { const e = src.indexOf('*/', i + 2); i = (e < 0 ? n : e + 2) - 1; continue; }
      if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { const body = src.slice(s, i); i++; return body; } } }
    throw new Error('unclosed block in ' + file); };
  function level(wrappers, endAt) {
    for (;;) { skipWsComments(); if (i >= n || (endAt && src[i] === '}')) return;
      const prelude = readUntilBlockOrSemi().trim();
      if (src[i] === ';') { i++; items.push({ kind: 'statement', text: prelude + ';', wrappers, file }); continue; }
      if (prelude.startsWith('@media') || prelude.startsWith('@supports') || prelude.startsWith('@layer') || prelude.startsWith('@container')) {
        i++; /* past { */ level([...wrappers, prelude], true); skipWsComments(); if (src[i] === '}') i++; continue; }
      const body = readBlock();
      if (prelude.startsWith('@')) { items.push({ kind: 'at', prelude, body, wrappers, file }); continue; }
      items.push({ kind: 'rule', selectors: splitList(prelude), prelude, body, wrappers, file, order: items.length }); }
  }
  level([], false);
  return items;
}
function splitList(s) { const out = []; let d = 0, cur = '', q = null;
  for (const c of s) { if (q) { cur += c; if (c === q) q = null; continue; } if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--;
    if (c === ',' && d === 0) { out.push(cur.trim()); cur = ''; continue; } cur += c; }
  if (cur.trim()) out.push(cur.trim()); return out; }

/* the testable form of a component: strip pseudo-elements and dynamic pseudo-classes, relax the root compounds */
const DYN = /:(hover|active|focus-visible|focus-within|focus|disabled|enabled|checked|popover-open|visited|link|placeholder-shown|-webkit-autofill|target)(?![\w-])/g;
const PSEUDO_EL = /::?(before|after|placeholder|selection|backdrop|marker|-webkit-scrollbar(-[\w-]+)?|-webkit-resizer|first-line|first-letter)(\([^)]*\))?/g;
function testable(sel) {
  let s = sel.replace(PSEUDO_EL, '').replace(DYN, '');
  s = s.replace(/^(:root|html)((\[[^\]]*\]|\.[\w-]+|:not\([^)]*\))*)\s*/, '');           // a leading html/:root compound only scopes
  s = s.replace(/^body((\[[^\]]*\]|\.[\w-]+|:not\([^)]*\)|:where\([^)]*\)|:is\([^)]*\))*)/, 'body');   // any body state is a shell state
  s = s.replace(/#notebook(\[data-(face|mode)="?[\w-]+"?\])+/g, '#notebook');
  s = s.replace(/#title\.menu-open/g, '#title');
  s = s.trim(); if (!s || s === 'body') return null; return s; }

const sheets = ['lab.css', 'skin.css'];
const items = sheets.flatMap((f) => parse(fs.readFileSync(LW + f, 'utf8'), f));
const comps = [...new Set(items.filter((x) => x.kind === 'rule').flatMap((r) => r.selectors.map(testable).filter(Boolean)))];
console.log('rules', items.filter((x) => x.kind === 'rule').length, 'components', comps.length);

const p = await launch({ width: 1440, height: 900 });
await p.goto(URL_LW, 5000);
const verdict = await p.eval(`(async () => {
  const L = __LW.layout; L.menu.open();
  const bar = document.getElementById('menubar');
  // fill every list (each click fills its own; the last click leaves one open, which is fine)
  for (const b of bar.querySelectorAll('.mb-btn')) b.click();
  for (const l of bar.querySelectorAll('.mb-list')) l.hidden = false;
  L.notebook.open('about'); L.notebook.open('notes');   // ABOUT first: its logo is cloned from #title on first show
  for (const m of document.querySelectorAll('#title .mark, .nb-logo .mark')) m.classList.add('turn', 'busy');
  const view = document.querySelector('#notebook .nb-view');
  view.innerHTML = '<h1>a</h1><h2>b</h2><h3>c</h3><p>p <em>e</em> <strong>s</strong> <code>c</code> <a href="#">a</a></p><ul><li>u</li></ul><ol><li>o</li></ol><pre><code>x</code></pre><blockquote>q</blockquote><table><thead><tr><th>h</th></tr></thead><tbody><tr><td>d</td></tr></tbody></table><hr><span class="katex"></span><span class="katex-display"></span>';
  const nb = document.getElementById('notebook');
  const targets = () => [document.getElementById('title'), bar, nb].flatMap((r) => [r, ...r.querySelectorAll('*')]).filter((e) => !e.closest('.nb-projectsface'));
  const comps = ${JSON.stringify(comps)};
  const hit = new Set(), bad = [];
  for (const face of ['notes', 'about']) for (const mode of ['edit', 'view']) {
    nb.dataset.face = face; nb.dataset.mode = mode;
    const T = targets();
    for (const c of comps) { if (hit.has(c)) continue; try { if (T.some((e) => e.matches(c))) hit.add(c); } catch (e) { bad.push(c); } }
  }
  return JSON.stringify({ hit: [...hit], bad });
})()`);
await p.close();
const V = JSON.parse(verdict); const hit = new Set(V.hit);
console.log('matched components', hit.size, 'unparseable', V.bad.length, V.bad.slice(0, 10));

/* emit, in cascade order, trimmed lists, verbatim bodies, wrappers re-opened per run */
const kept = [];
for (const it of items) {
  if (it.kind !== 'rule') continue;
  const sels = it.selectors.filter((s) => { const t = testable(s); return t && hit.has(t); });
  if (!sels.length) continue;
  kept.push({ ...it, sels });
}
let out = '', open = [];
const close = () => { for (let k = open.length - 1; k >= 0; k--) out += '}\n'; open = []; };
let lastFile = null;
for (const r of kept) {
  if (r.file !== lastFile) { close(); out += `\n/* ── from λWAVES lab/${r.file} ── */\n`; lastFile = r.file; }
  if (JSON.stringify(open) !== JSON.stringify(r.wrappers)) { close(); for (const w of r.wrappers) out += w + ' {\n'; open = r.wrappers.slice(); }
  out += r.sels.join(', ') + ' {' + r.body + '}\n';
}
close();
fs.writeFileSync(OUT_CSS, out);
/* custom properties the kept rules read, and whether anything defines them */
const used = new Set([...out.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
const kit = fs.readFileSync(path.join(KIT, 'base.css'), 'utf8') + fs.readFileSync(path.join(KIT, 'skin.css'), 'utf8');
const definedIn = (name, text) => new RegExp('(^|[\\s;{])' + name.replace(/[-]/g, '\\-') + '\\s*:').test(text);
const missing = [...used].filter((v) => !definedIn(v, kit) && !definedIn(v, out));
console.log('kept rules', kept.length, 'bytes', out.length, 'vars used', used.size, 'undefined-in-kit+extract', missing);
const anims = [...out.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
console.log('animations referenced', anims);
