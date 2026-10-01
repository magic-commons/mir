/* tier.browser.mjs — the performance tier (mir/css/tokens.css, docs/TIERS.md) does what it says, and nothing at the default.
 *   LITE   no rendered element (nor its ::before/::after) has a computed backdrop-filter other than `none`
 *   FLAT   no rendered element of the house has a blurred or offset NEUTRAL box-shadow, and every transition duration is 0s
 *   OFF    removing data-ui-tier restores every computed style the page had before
 * Run on the gallery in all 16 seats (theme × card × frost × disconnected), and on the shell page with the notebook and a
 * menu open (tokens.css is linked into it at run time: that page does not load it).  The modulation plugin's sheets do
 * not read the 1.5 names yet: they are held to LITE (the tier's --frost-filter bridge reaches them) but only COUNTED for
 * FLAT, and the count is printed so the plugin lane can drive it to zero.
 * Run by tests/run.mjs with MIR_BASE set; standalone: MIR_BASE=http://127.0.0.1:8790 node tests/tier.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8790';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  — ' + detail}`);
const PLUGIN = '.mir-modwindow, .kwin-chiprail, .m2ghost, #modwin';
const SKIP = 'canvas, .k.k-mod, .fd.mod';   // the gallery's two rAF-animated controls move on their own

/* one pass over the page: what the tier promises, and a full snapshot for the restore check */
const PROBE = `((plugin, skip) => {
  const rgba = (s) => { let m = s.match(/^rgba?\\(([^)]*)\\)/); if (m) { const v = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v[3] ?? 1]; }
    m = s.match(/^color\\(srgb ([^)]*)\\)/); if (m) { const v = m[1].split(/[ \\/]+/).filter(Boolean).map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v[3] ?? 1]; }
    return null; };
  const layers = (v) => { const out = []; let d = 0, cur = ''; for (const c of v) { if (c === '(') d++; if (c === ')') d--; if (c === ',' && !d) { out.push(cur.trim()); cur = ''; } else cur += c; } if (cur.trim()) out.push(cur.trim()); return out; };
  /* a neutral shadow layer that is blurred or offset: achromatic (channel spread ≤ 48 of 255) and visible */
  const badShadow = (v) => v !== 'none' && layers(v).some((l) => {
    const col = l.match(/(rgba?\\([^)]*\\)|color\\([^)]*\\))/); const c = col ? rgba(col[1]) : null;
    if (!c || c[3] === 0) return false;
    const neutral = Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) <= 48;
    const px = l.replace(col[1], '').match(/-?[\\d.]+px/g)?.map(parseFloat) || [];
    return neutral && (px[0] || px[1] || px[2]);
  });
  const all = [document.documentElement, document.body, ...document.body.querySelectorAll('*')];
  const filt = [], shad = [], dur = [], pshad = [], snap = {};
  all.forEach((e, i) => {
    if (skip && e.closest && e.closest(skip)) return;
    if (!(e.checkVisibility ? e.checkVisibility() : e.getClientRects().length)) return;
    const cs = getComputedStyle(e), tag = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).join('.') : '');
    for (const pe of ['', '::before', '::after']) {
      const c = pe ? getComputedStyle(e, pe) : cs;
      if (pe && (c.content === 'none' || c.content === 'normal')) continue;
      if (c.backdropFilter !== 'none') filt.push(tag + pe + ' {' + c.backdropFilter + '}');
    }
    const inPlugin = !!(e.closest && e.closest(plugin));
    if (badShadow(cs.boxShadow)) (inPlugin ? pshad : shad).push(tag + ' {' + cs.boxShadow.slice(0, 90) + '}');
    if (!inPlugin && cs.transitionDuration.split(',').some((d) => parseFloat(d) !== 0)) dur.push(tag + ' {' + cs.transitionDuration + '}');
    snap[i + ' ' + tag] = [cs.backdropFilter, cs.boxShadow, cs.background, cs.borderColor, cs.borderRadius, cs.transition, cs.opacity, cs.color, cs.letterSpacing, cs.fontFamily, cs.textTransform].join(' | ');
  });
  return JSON.stringify({ filt, shad, dur, pshad, snap, n: Object.keys(snap).length });
})`;

const p = await launch({ width: 1440, height: 900 });
const probe = async () => JSON.parse(await p.eval(`${PROBE}(${JSON.stringify(PLUGIN)}, ${JSON.stringify(SKIP)})`));
const tier = (v) => p.eval(v ? `document.documentElement.dataset.uiTier = ${JSON.stringify(v)}` : `delete document.documentElement.dataset.uiTier`);
const settle = () => sleep(1300);   // past --t-soft + --t-linger (1.05 s): a transition must have landed before a style is read
const diffSnap = (a, b) => Object.keys(a).filter((k) => a[k] !== b[k]).concat(Object.keys(b).filter((k) => !(k in a)));
let pluginFlat = 0, pluginSample = [];

/* run the three promises in the current seat */
async function seat(label) {
  await tier(null); await settle();
  const d = await probe();
  await tier('lite'); await settle();
  const lite = await probe();
  check(`${label} · lite: no backdrop-filter on any rendered element (${lite.n} elements)`, lite.filt.length === 0, lite.filt.slice(0, 4).join(' ; '));
  await tier('flat'); await settle();
  const flat = await probe();
  check(`${label} · flat: no blurred or offset neutral box-shadow in the house`, flat.shad.length === 0, flat.shad.slice(0, 4).join(' ; '));
  check(`${label} · flat: every house transition duration is 0s`, flat.dur.length === 0, flat.dur.slice(0, 4).join(' ; '));
  check(`${label} · full: the shadow and duration detectors bite (${d.shad.length} shadows, ${d.dur.length} transitions at full)`, d.shad.length > 0 && (label.startsWith('shell') || d.dur.length > 0), 'nothing to detect at full');   // the shell page has no transition at rest
  if (flat.pshad.length > pluginFlat) { pluginFlat = flat.pshad.length; pluginSample = flat.pshad; }
  await tier(null); await settle();
  const back = await probe();
  const moved = diffSnap(d.snap, back.snap);
  check(`${label} · off: removing the attribute restores every computed style`, moved.length === 0, moved.slice(0, 3).map((k) => k + ': ' + d.snap[k] + ' → ' + back.snap[k]).join(' ; '));
  return { d, lite, flat };
}

try {
  /* ── the gallery, every seat ── */
  await p.goto(BASE + '/gallery/index.html', 1200);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__GALLERY')); i++) await sleep(100);
  check('gallery: tokens.css is loaded and the tier layer is named', await p.eval(`[...document.styleSheets].some((s) => /tokens\\.css$/.test(s.href || ''))`));
  for (const theme of ['dark', 'light']) for (const card of ['tinted', 'refractive']) for (const frost of [false, true]) for (const disc of [true, false]) {
    await p.eval(`window.__GALLERY.setTheme(${JSON.stringify(theme)}); document.body.dataset.card = ${JSON.stringify(card)}; document.body.classList.toggle('frost', ${frost}); document.body.classList.toggle('disconnected', ${disc}); true`);
    const r = await seat(`gallery ${theme}-${card}-frost ${frost ? 'on' : 'off'}${disc ? '-disconnected' : '-joined'}`);
    /* the seat really blurs at full, so lite is doing something (refractive + frost is the blur policy) */
    if (frost) check(`gallery ${theme}-${card}-frost on${disc ? '-disconnected' : '-joined'} · full really has backdrop filters to remove`, r.d.filt.length > 0, 'none at full');
  }

  /* ── the shell page: the notebook and a menu carry the house's literal blurs ── */
  await p.goto(BASE + '/gallery/shell.html', 1200);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__MIR_SHELL')); i++) await sleep(100);
  await p.eval(`new Promise((res) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '../mir/css/tokens.css'; l.onload = () => res(true); document.head.appendChild(l); })`);
  await p.eval(`__MIR_SHELL.notebook('notes'); __MIR_SHELL.menu('FILE'); true`); await sleep(400);
  for (const theme of ['light', 'dark']) {
    await p.eval(`document.body.dataset.theme = ${JSON.stringify(theme)}; true`);
    const r = await seat(`shell ${theme} (notebook + FILE menu open)`);
    check(`shell ${theme} · full really blurs the notebook and the menu`, r.d.filt.some((f) => /notebook/.test(f)) && r.d.filt.some((f) => /mb-list/.test(f)), r.d.filt.join(' ; '));
  }

  /* ── reduced transparency takes the lite surface values with no attribute ── */
  await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] }); await settle();
  const rt = await probe();
  check('shell · prefers-reduced-transparency: no backdrop-filter with no tier set', rt.filt.length === 0, rt.filt.slice(0, 4).join(' ; '));
  await p.send('Emulation.setEmulatedMedia', { features: [] });
  check('no page errors', !p.logs.some((l) => /EXCEPTION/.test(l)), p.logs.join(' | '));
} finally { await p.close(); }

console.log(results.join('\n'));
console.log(`(the modulation plugin, not yet on the 1.5 names: at most ${pluginFlat} element(s) per seat keep a neutral blurred/offset shadow under FLAT — counted, not failed)${pluginSample.length ? '\n   ' + pluginSample.join('\n   ') : ''}`);
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nPASS tier: all ${results.length}`);
process.exit(failed ? 1 : 0);
