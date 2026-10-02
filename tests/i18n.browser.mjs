/* i18n.browser.mjs — the language mechanism live on gallery/language.html, under a real pointer.
 *   · qps rewrites every kit-written label (a walk of the visible text finds no plain-English kit string), and
 *     English comes back exactly;
 *   · qps-rtl mirrors the menubar and a window's head, and a knob and a fader do NOT mirror (measured);
 *   · labels that do not fit under qps are LISTED (a finding, not a failure).
 * Standalone: MIR_BASE=http://127.0.0.1:<port> node tests/i18n.browser.mjs     (MIR_PLATES=1 also writes docs/plates/languages/) */
import { launch, sleep } from '../tools/cdp.mjs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8790';
const PLATES = process.env.MIR_PLATES ? fileURLToPath(new URL('../docs/plates/languages/', import.meta.url)) : null;
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  — ' + detail}`);
const note = (s) => results.push('NOTE  ' + s);

/* in the page: every kit-written label and name, as written now */
const SNAP = `JSON.stringify((() => { const q = (sel) => [...document.querySelectorAll(sel)].filter((n) => !n.closest('.mb-list'));   // a list is refilled when it opens
  return q('[data-t]').map((n) => n.textContent).concat(q('[data-t-aria]').map((n) => n.getAttribute('aria-label')), q('[data-help-en]').map((n) => n.dataset.help)); })())`;
/* in the page: visible text nodes with a run of plain ASCII letters and no pseudo letter at all (a pseudo sentence may carry
   a name as a var: "… modify MIR under …"), outside translate="no" and outside the exempt classes */
const EXEMPT = ['k-val', 'fd-val', 'ro-val', 'ro-sub', 'mb-key', 'ab-tag', 'ab-version', 'nb-logo', 'nb-title', 'nb-subtitle'];
const WALK = `(() => {
  const exempt = ${JSON.stringify(EXEMPT)}, out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const s = n.textContent.trim(); if (!s) continue;
    const e = n.parentElement; if (!e || e.closest('[translate="no"], script, style')) continue;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (!r.width || !r.height || cs.visibility === 'hidden' || !e.checkVisibility()) continue;
    if (!/[A-Za-z]{2,}/.test(s) || /[\u00C0-\u024F\u1E00-\u1EFF]/.test(s)) continue;
    const why = exempt.find((c) => e.closest('.' + c)) || (e.closest('a') ? 'a link: a name' : e.closest('.ab-fine, .ab-credit') && !e.closest('[data-t]') && !/[\\[\\]]/.test(e.closest('p').textContent) ? 'the app\\'s own words (a name, a copyright)' : null);
    out.push({ text: s.slice(0, 60), cls: e.className || e.tagName, why });
  }
  return JSON.stringify(out);
})()`;
/* in the page: kit labels whose text is wider than the control that holds it */
const CLIP = `(() => {
  const out = [];
  for (const e of document.querySelectorAll('[data-t]')) {
    if (!e.checkVisibility() || !e.textContent.trim()) continue;
    const box = e.closest('.k, .fd, .sw, .trig, .seg-b, .ro, .dev-id, .mb-btn, .mb-item, .nb-dump, .ab-home, .grp') || e;
    const rg = document.createRange(); rg.selectNodeContents(e); const t = rg.getBoundingClientRect(), b = box.getBoundingClientRect();
    const over = Math.max(b.left - t.left, t.right - b.right, 0), cut = e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible';
    if (over > 1 || cut) out.push({ label: e.dataset.t, cls: e.className, over: Math.round(over), cut });
  }
  return JSON.stringify(out);
})()`;
/* in the page: the geometry of a knob and a fader — the needle's turn, the fill's edge, measured in the control's own box */
const GEOM = `JSON.stringify((() => { const k = __LANG.controls.k1.root, f = __LANG.controls.f1.root;
  const kd = k.querySelector('.k-dial').getBoundingClientRect(), nd = k.querySelector('.k-needle').getBoundingClientRect();
  const fr = f.getBoundingClientRect(), fill = f.querySelector('.fd-fill').getBoundingClientRect(), edge = f.querySelector('.fd-edge').getBoundingClientRect();
  return { needle: getComputedStyle(k.querySelector('.k-needle')).transform, nx: Math.round(nd.left + nd.width / 2 - kd.left), ny: Math.round(nd.top + nd.height / 2 - kd.top),
    fillL: Math.round(fill.left - fr.left), fillW: Math.round(fill.width), edgeX: Math.round(edge.left - fr.left), kdir: getComputedStyle(k).direction, fdir: getComputedStyle(f).direction }; })())`;

const p = await launch({ width: 1400, height: 900 });
try {
  const ev = (x) => p.eval(x);
  const ready = async () => { for (let i = 0; i < 60 && !(await ev('!!window.__ready')); i++) await sleep(100); await sleep(300); };
  /* a real click on a strip button, hit-tested first */
  const press = async (tag) => {
    const [x, y, hit] = JSON.parse(await ev(`JSON.stringify((() => { const b = document.querySelector('.g-switch [data-lang="${tag}"]'), r = b.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2; return [x, y, document.elementFromPoint(x, y) === b]; })())`));
    await p.mouse(x, y); await p.mouse(x, y, 'mousePressed'); await p.mouse(x, y, 'mouseReleased');
    for (let i = 0; i < 30 && (await ev('__LANG.language()')) !== tag; i++) await sleep(50);
    await sleep(150);
    return hit;
  };
  /* show the bar by hovering the wordmark (the real pointer path) and open one group */
  const openMenu = async (group) => {
    const [x, y] = JSON.parse(await ev(`JSON.stringify((() => { const r = document.getElementById('title').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })())`));
    await p.mouse(x, y); await sleep(150);
    await ev(`__LANG.menubar.openGroup(${JSON.stringify(group)})`); await sleep(150);
  };

  await p.goto(BASE + '/gallery/language.html', 1200); await ready();
  const en0 = await ev(SNAP);
  const g0 = JSON.parse(await ev(GEOM));
  check('English: the page builds, nothing missing', (await ev('__LANG.missing().length')) === 0 && JSON.parse(en0).length > 30, en0.slice(0, 200));

  /* ── qps ── */
  check('the qps switch is under the pointer (elementFromPoint)', await press('qps'));
  await openMenu('FILE');
  const left = JSON.parse(await ev(WALK)).filter((x) => !x.why);
  check('qps: no visible kit string is left in plain English', left.length === 0, JSON.stringify(left));
  note('qps exceptions (exempt by rule): ' + JSON.stringify(JSON.parse(await ev(WALK)).filter((x) => x.why).map((x) => `${x.text} [${x.why}]`)));
  check('qps: the menu labels and the group names are pseudo', await ev(`[...document.querySelectorAll('#menubar .mb-btn, #menubar .mb-lbl')].every((n) => /^\\[/.test(n.textContent))`));
  check('qps: a group is found by data-menu, not by its text', await ev(`__LANG.menubar.openGroup('LANGUAGE')`));
  check('qps: the LANGUAGE rows are each language in its own name, untranslated', await ev(`(() => { const t = [...document.querySelectorAll('#menubar .mb-item .mb-lbl')].map((n) => n.textContent); return t.includes('中文') && t.includes('العربية') && t.includes('English'); })()`));
  check('qps: the hint is translated at the one hop (data-help), its English kept (data-help-en)', await ev(`(() => { const n = document.querySelector('[data-help-en="how bright the picture is"]'); return !!n && /^\\[ĥöŵ/.test(n.dataset.help); })()`));
  check('qps: nothing fell back to English', (await ev('__LANG.missing().length')) === 0);
  const clipped = JSON.parse(await ev(CLIP));
  note(`qps: ${clipped.length} label(s) wider than their control: ` + JSON.stringify(clipped));
  if (PLATES) { await openMenu('LANGUAGE'); await p.shot(PLATES + 'qps.png'); }

  /* ── back to English, exactly ── */
  await ev('__LANG.menubar.close()');
  await press('en');
  const en1 = await ev(SNAP), a0 = JSON.parse(en0), a1 = JSON.parse(en1);
  check('English again: every kit label, name and hint is the exact English', en1 === en0, JSON.stringify({ n0: a0.length, n1: a1.length, diff: a1.map((x, i) => x !== a0[i] && [a0[i], x]).filter(Boolean).slice(0, 6) }));
  if (PLATES) { await openMenu('LANGUAGE'); await p.shot(PLATES + 'en.png'); await ev('__LANG.menubar.close()'); }

  /* ── qps-rtl ── */
  await press('qps-rtl');
  await openMenu('FILE');
  const m = JSON.parse(await ev(`JSON.stringify((() => { const b = [...document.querySelectorAll('#menubar .mb-btn')].map((n) => n.getBoundingClientRect()), bar = document.getElementById('menubar').getBoundingClientRect(), t = document.getElementById('title').getBoundingClientRect();
    const head = document.querySelector('.dev-head'), id = head.querySelector('.dev-id').getBoundingClientRect(), util = head.querySelector('.dev-util').getBoundingClientRect();
    return { dir: document.documentElement.dir, firstX: b[0].x, lastX: b[b.length - 1].x, barRight: bar.right, titleLeft: t.left, titleRight: t.right, vw: innerWidth, idX: id.x, utilX: util.x }; })())`));
  check('qps-rtl: <html dir="rtl">', m.dir === 'rtl', m.dir);
  check('qps-rtl: the menubar mirrors (FILE is the rightmost group, the bar sits left of the wordmark, the wordmark in the right corner)', m.firstX > m.lastX && m.barRight <= m.titleLeft && m.titleRight > m.vw / 2, JSON.stringify(m));
  check("qps-rtl: a window's head mirrors (the name right, the buttons left)", m.idX > m.utilX, JSON.stringify(m));
  const g1 = JSON.parse(await ev(GEOM));
  const same = g1.needle === g0.needle && g1.nx === g0.nx && g1.ny === g0.ny && g1.fillL === g0.fillL && g1.fillW === g0.fillW && g1.edgeX === g0.edgeX;
  check('qps-rtl: a knob and a fader do not mirror (needle, fill and edge measured identical, dir ltr)', same && g1.kdir === 'ltr' && g1.fdir === 'ltr', JSON.stringify({ g0, g1 }));
  /* and the hand agrees: a press at 75 % of the fader's width is 0.75, not 0.25 */
  await ev('__LANG.menubar.close()');
  const [fx, fy, fhit] = JSON.parse(await ev(`JSON.stringify((() => { const f = __LANG.controls.f1.root, r = f.getBoundingClientRect(), x = r.x + r.width * 0.75, y = r.y + r.height / 2; return [x, y, f.contains(document.elementFromPoint(x, y))]; })())`));
  await p.mouse(fx, fy); await p.mouse(fx, fy, 'mousePressed'); await p.mouse(fx, fy, 'mouseReleased'); await sleep(400);
  const fv = await ev('__LANG.controls.f1.get()');
  check('qps-rtl: a press at 75 % of the fader sets 0.75 (hit-tested)', fhit && Math.abs(fv - 0.75) < 0.01, `${fhit} ${fv}`);
  check('qps-rtl: a readout keeps its Latin digits in an LTR island', await ev(`getComputedStyle(document.querySelector('.ro-val')).direction === 'ltr' && document.querySelector('.ro-val').textContent === '0.50 s'`));
  if (PLATES) { await openMenu('LANGUAGE'); await p.shot(PLATES + 'qps-rtl.png'); await ev('__LANG.menubar.close()'); }

  /* ── a real pack with nothing translated yet: everything falls back, and the page counts it ── */
  await press('es');
  const n = await ev('__LANG.missing().length');
  check('es (a draft pack): the strings it lacks fall back to English and are counted', n > 20 && (await ev(`document.querySelector('.g-count').textContent.startsWith('${n} ')`)), String(n));
  check('es: the page is <html lang="es" dir="ltr">', await ev(`document.documentElement.lang === 'es' && document.documentElement.dir === 'ltr'`));
  await press('en');

  /* ── 1.5.0-alpha.5 · THE KIT'S WINDOWS UNDER qps: the GUI window, the transport bar, the notebook, FOLDERS, KEYS (the
     starter app, which has them all) and the modulation window with an AUDIO device.  Only text inside the kit's own
     roots is read; what may stay plain is a NAME, a VALUE with its unit, or the user's / the app's own data. */
  const ROOTS = '.mir-win, .mir-transport, #modwin, #menubar, #notebook, .mir-rail, .mir-notice, .tempo-panel';
  const KIT_WALK = `(() => {
    const out = [], latin = /[A-Za-z]{2,}/, pseudoCh = /[\\u00C0-\\u024F\\u1E00-\\u1EFF]/;
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.checkVisibility({ visibilityProperty: true }); };
    const add = (kind, s, e) => { s = (s || '').trim(); if (!s || !latin.test(s) || pseudoCh.test(s)) return; out.push({ kind, s: s.slice(0, 90), cls: String(e.className && e.className.baseVal === undefined ? e.className : '').split(' ')[0], tag: e.tagName, link: !!e.closest('a') }); };
    const ok = (e) => e.closest(${JSON.stringify(ROOTS)}) && !e.closest('[translate="no"], script, style, svg') && vis(e);
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const e = n.parentElement; if (e && ok(e)) add('text', n.textContent, e); }
    for (const e of document.querySelectorAll('[aria-label], [placeholder], [data-help]')) { if (!ok(e)) continue;
      if (e.hasAttribute('aria-label')) add('aria', e.getAttribute('aria-label'), e);
      if (e.hasAttribute('placeholder')) add('ph', e.getAttribute('placeholder'), e);
      if (e.dataset.help) add('help', e.dataset.help, e); }
    return JSON.stringify(out);
  })()`;
  const NAMES = new Set(JSON.parse((await import('node:fs')).readFileSync(new URL('../mir/locales/en.json', import.meta.url), 'utf8')).names.concat(['MIR']));
  const VALUE = /^[-+−]?[\d.,…\s-]*\d[\d.,…\s-]*\s?(Hz|HZ|ms|s|dB|px|%|°)?$/;
  const DATA = new Set(['m2vname', 'nb-tab-name', 'fo-current']);                 // a macro's, a page's, a project's own name
  const why = (r) => (NAMES.has(r.s) ? 'name' : VALUE.test(r.s) ? 'value' : r.s === 'BPM' ? 'unit' : DATA.has(r.cls) ? 'data' : r.link ? 'a link: a name' : null);
  const walkKit = async (path, steps) => {
    await p.goto(BASE + path, 1500);
    for (let i = 0; i < 60 && !(await ev('!!(window.__ready || window.__STARTER)')); i++) await sleep(100);
    await sleep(500);
    await ev(`import('/mir/core/i18n.js').then((m) => m.setLanguage('qps')).then(() => true)`);
    const seen = new Map();
    for (const s of steps) { await ev(s); await sleep(450); for (const r of JSON.parse(await ev(KIT_WALK))) seen.set(r.kind + '|' + r.s, r); }
    return [...seen.values()];
  };
  const S = '__STARTER.app';
  const starter = await walkKit('/starter/index.html', ['1', `(${S}.notebook.open(), 1)`, `(${S}.gui.open('options:1'), 1)`, `(${S}.gui.open('options:2'), 1)`, `(${S}.gui.open('about'), 1)`,
    `(${S}.gui.close(), ${S}.folders.open(), 1)`, `(${S}.folders.close(), ${S}.help && ${S}.help.open(), 1)`]);
  const modw = await walkKit('/gallery/modulation.html?fresh=1', ['1', `(__MOD.M.addSource('audio'), __MOD.mod.view.rebuild(), 1)`]);
  const plain = [...starter, ...modw].filter((r) => !why(r));
  check('qps: the GUI window, the transport bar, the notebook, FOLDERS, KEYS and the modulation window show no plain-English kit string', plain.length === 0, JSON.stringify(plain.map((r) => `${r.kind} ${r.s} <${r.cls || r.tag}>`)));
  const kinds = [...starter, ...modw].reduce((m, r) => { const w = why(r); m[w] = (m[w] || 0) + 1; return m; }, {});
  note('kit windows under qps, the plain strings by reason (all allowed): ' + JSON.stringify(kinds));

  /* ── PLURALS, LIVE: the notebook's word count in Russian and Arabic, with the real drafts loaded and a tiny test entry on
     top (the drafts keep `other` only until a translator writes the forms) ── */
  await p.goto(BASE + '/starter/index.html', 1500);
  for (let i = 0; i < 60 && !(await ev('!!window.__STARTER')); i++) await sleep(100);
  await sleep(400);
  const counts = JSON.parse(await ev(`(async () => {
    const m = await import('/mir/core/i18n.js');
    const forms = { ru: { one: '{n} слово', few: '{n} слова', many: '{n} слов', other: '{n} слова' }, ar: { zero: 'لا كلمات', one: 'كلمة واحدة', two: 'كلمتان', few: '{n} كلمات', many: '{n} كلمة', other: '{n} كلمة' } };
    m.addLocales((tag) => forms[tag] ? { strings: { '{n} words · kept in this browser': forms[tag], '{n} words · in the project': forms[tag] } } : null);
    ${S}.notebook.open(); ${S}.notebook.select && ${S}.notebook.select('yours');
    const ta = document.querySelector('#notebook .nb-text'), out = {}, errs = [];
    for (const tag of ['ru', 'ar']) {
      try { await m.setLanguage(tag); } catch (e) { errs.push(tag + ': ' + e.message); }
      out[tag] = [];
      for (const n of [1, 2, 5]) { ta.value = Array.from({ length: n }, (_, i) => 'w' + i).join(' '); ta.dispatchEvent(new Event('input')); out[tag].push(document.querySelector('#notebook .nb-count').textContent); }
    }
    await m.setLanguage('en'); ta.value = ''; ta.dispatchEvent(new Event('input'));
    return JSON.stringify({ out, errs, lang: document.documentElement.lang });
  })()`));
  check('ru: 1, 2 and 5 words render three different forms (one · few · many)', new Set(counts.out.ru).size === 3 && counts.out.ru[0] === '1 слово' && counts.out.ru[2] === '5 слов', JSON.stringify(counts.out.ru));
  check('ar: 1, 2 and 5 words render three different forms (one · two · few)', new Set(counts.out.ar).size === 3 && counts.out.ar[1] === 'كلمتان', JSON.stringify(counts.out.ar));
  check('the real ru and ar drafts load and nothing throws', counts.errs.length === 0 && !p.logs.some((l) => /EXCEPTION/.test(l)), JSON.stringify(counts.errs) + ' ' + p.logs.filter((l) => /EXCEPTION/.test(l)).join(' | '));

  if (p.logs.length) note('console: ' + p.logs.join(' | '));
} finally { await p.close(); }
for (const r of results) console.log(r);
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `${failed} FAILED` : `ALL ${results.filter((r) => r.startsWith('PASS')).length} PASS — languages`);
process.exit(failed ? 1 : 0);
