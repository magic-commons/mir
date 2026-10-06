#!/usr/bin/env node
/* audit-material.mjs — the two look audits BASINS runs on its glass, as a tool for any MIR app page.  Reads the LIVE page through
 * tools/cdp.mjs (computed style, never the sheets), so it sees what a person sees in the theme and the card style the page is in.
 *
 *   node tools/audit-material.mjs <url> [--theme dark|light] [--click selector]… [--scope selector] [--allow selector]
 *                                 [--min-alpha .5] [--min-contrast 2] [--size 1280x800] [--wait 1500] [--json]
 *
 *   SURFACES  every visible box (and ::before / ::after) of 24 × 16 px or more whose background is at alpha ≥ .5 (--min-alpha).  Under
 *             glass a FACE is never that dense: INTENT says a pane is a frost face and a thin rim.  Three kinds are allowed to be
 *             dense and are counted, not failed: ACCENT (a fill within a hair of --acc, --acc2, --ok, --warn or --bad), CONTENT (a
 *             picture, a canvas, a colour input, a swatch, anything under --allow) and nothing else.  Any other dense fill is a FACE
 *             and fails.
 *   TEXT      every element that holds text of its own, its ink composited over the fills under it (up to the first opaque one).  A
 *             ratio under 2:1 (--min-contrast) fails.  Where less than half of the ground is fill the picture shows through and
 *             the text is judged by eye, so it is skipped and said so.
 *   INK       when the page runs adaptive ink (a [data-ink] cell exists): labels in pure white or black that disagree with their cell.
 *   --click   open a window, a menu, a tab first (a real click, hit-tested; repeat the flag to sweep several in a row): the page is
 *             swept once before the first click and once after each, and each finding names the stage it was first seen in.
 *   --theme   sets body[data-theme] and prefs 'theme' first, as tools/check-app.mjs --light does.
 * Exit 0 only when no FACE is dense, no text is under the ratio and (when it runs) no ink is stray.  Needs a Chromium: tools/cdp.mjs. */
import { launch, sleep } from './cdp.mjs';
import { fileURLToPath } from 'node:url'; import path from 'node:path';

/** parseArgs(argv) → options, or { error }; pure, exported for tests */
export function parseArgs(argv) {
  const o = { url: null, theme: null, click: [], scope: 'body', allow: '', minAlpha: 0.5, minContrast: 2, size: [1280, 800], wait: 1500, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = argv[i + 1];
    if (a === '--theme') { o.theme = v; i++; } else if (a === '--click') { o.click.push(v); i++; } else if (a === '--scope') { o.scope = v; i++; } else if (a === '--allow') { o.allow = v; i++; }
    else if (a === '--min-alpha') { o.minAlpha = Number(v); i++; } else if (a === '--min-contrast') { o.minContrast = Number(v); i++; }
    else if (a === '--size') { o.size = String(v).split('x').map(Number); i++; } else if (a === '--wait') { o.wait = Number(v) || 0; i++; } else if (a === '--json') o.json = true;
    else if (/^https?:/.test(a)) o.url = a;
  }
  if (!o.url) return { error: 'usage: node tools/audit-material.mjs <url> [--theme dark|light] [--click selector]… [--scope selector] [--allow selector] [--min-alpha .5] [--min-contrast 2] [--size 1280x800] [--wait 1500] [--json]' };
  if (o.theme && !/^(dark|light)$/.test(o.theme)) return { error: '--theme is dark or light' };
  if (!(o.minAlpha > 0 && o.minAlpha <= 1) || !(o.minContrast >= 1)) return { error: '--min-alpha is 0…1 and --min-contrast is 1 or more' };
  return o;
}

/* the colour arithmetic, pure: WCAG relative luminance and the ratio of two colours, and "top over bottom"; exported for tests */
/* parseColor(computed) → { r, g, b, a } (r g b 0…255, a 0…1) from what getComputedStyle returns: rgb()/rgba() (the alpha a number or a percent),
   color(srgb …), and oklab()/oklch() (how Chromium writes a color-mix() in those spaces); null for anything else */
export const parseColor = (c) => {
  const m = /^(rgba?|color|oklab|oklch)\(\s*(?:srgb\s+)?([^)]*)\)$/.exec(String(c).trim()); if (!m) return null;
  const [body, al] = m[2].split('/').map((x) => x.trim()), p = body.split(/[ ,]+/).filter(Boolean);
  const num = (x) => (/%$/.test(x) ? parseFloat(x) / 100 : x === 'none' ? 0 : parseFloat(x));
  let a = al === undefined ? 1 : num(al); if (al === undefined && p.length > 3) a = num(p.pop());
  if (m[1] === 'rgb' || m[1] === 'rgba') return { r: num(p[0]) * (/%$/.test(p[0]) ? 255 : 1), g: num(p[1]) * (/%$/.test(p[1]) ? 255 : 1), b: num(p[2]) * (/%$/.test(p[2]) ? 255 : 1), a };
  if (m[1] === 'color') return { r: num(p[0]) * 255, g: num(p[1]) * 255, b: num(p[2]) * 255, a };
  const L = num(p[0]); let A = num(p[1]), B = num(p[2]);
  if (m[1] === 'oklch') { const h = parseFloat(p[2]) * Math.PI / 180; A = num(p[1]) * Math.cos(h); B = num(p[1]) * Math.sin(h); }
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, mm = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, ss = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const enc = (v) => 255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * Math.abs(v) ** (1 / 2.4) - 0.055));
  return { r: enc(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss), g: enc(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss), b: enc(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * ss), a };
};
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export const luminance = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
export const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* the page side: the sweep, written once and sent as text (it needs the page's own computed style).  It holds the same arithmetic as above. */
const SWEEP = (cfg) => `(() => {
  const CFG = ${JSON.stringify(cfg)};
  const parse = ${parseColor.toString()}, lin = ${lin.toString()}, luminance = ${luminance.toString()}, contrast = ${contrast.toString()};
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const root = document.querySelector(CFG.scope) || document.body;
  const visible = (n) => { if (!n.getClientRects().length) return false; const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const sig = (n, pe) => { const w = n.closest('[id]'); return (w && w !== n ? '#' + w.id + ' › ' : '') + n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\\s+/).slice(0, 3).join('.') : '') + (pe || ''); };
  const probe = document.createElement('i'); probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'; document.body.appendChild(probe);
  const tokenRGB = (tok) => { probe.style.color = 'var(' + tok + ')'; return parse(getComputedStyle(probe).color); };
  const near = (a, b) => !!a && !!b && Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) <= 9;
  const accents = ['--acc', '--acc2', '--ok', '--warn', '--bad'].map(tokenRGB);
  const CONTENT = 'canvas, video, img, input[type=color], [data-swatch], [class*="swatch"]' + (CFG.allow ? ', ' + CFG.allow : '');
  const kindOf = (n, bg, cs) => /url\\(/.test(cs.backgroundImage || '') || n.closest(CONTENT) ? 'content' : accents.some((a) => near(bg, a)) ? 'accent' : 'FACE';
  const R = window.__audit = window.__audit || { opaque: new Map(), faint: new Map(), skipped: 0, ink: { cells: 0, followed: 0, stray: new Map() }, texts: 0 };
  const stage = CFG.stage;
  const note = (n, pe, r) => {
    const cs = getComputedStyle(n, pe || null); if (pe && (cs.content === 'none' || cs.content === 'normal')) return;
    const w = pe ? parseFloat(cs.width) || r.width : r.width, h = pe ? parseFloat(cs.height) || r.height : r.height;
    const bg = parse(cs.backgroundColor); if (!bg || bg.a < CFG.minAlpha || !(w >= 24 && h >= 16 && w * h < 0.8 * innerWidth * innerHeight)) return;
    const k = sig(n, pe); if (!R.opaque.has(k)) R.opaque.set(k, { stage, kind: kindOf(n, bg, cs), alpha: +bg.a.toFixed(2), bg: cs.backgroundColor, blur: cs.backdropFilter && cs.backdropFilter !== 'none' ? cs.backdropFilter.slice(0, 40) : 'none', size: [w | 0, h | 0] });
  };
  const pureInk = (c) => { const m = parse(c); if (!m || m.a < 0.99 || m.r !== m.g || m.g !== m.b || (m.r !== 0 && m.r !== 255)) return null; return m.r === 255 ? 'w' : 'k'; };
  for (const n of [root, ...root.querySelectorAll('*')]) {
    if (n.tagName === 'CANVAS' || n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.closest('svg') || n === probe || !visible(n)) continue;
    const cs = getComputedStyle(n), r = n.getBoundingClientRect();
    note(n, '', r); note(n, '::before', r); note(n, '::after', r);
    if (![...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim().length > 0)) continue;
    R.texts++;
    const cell = n.closest('[data-ink]'), pi = pureInk(cs.color);
    if (cell && pi) { R.ink.cells++; if (pi === cell.getAttribute('data-ink')) R.ink.followed++; else { const k = sig(cell) + ' › ' + sig(n) + ' = ' + cs.color; R.ink.stray.set(k, (R.ink.stray.get(k) || 0) + 1); } }
    const ink = parse(cs.color); if (!ink || ink.a < 0.05) continue;
    const stack = []; let p = n, solid = null;
    while (p) { const b = parse(getComputedStyle(p).backgroundColor); if (b && b.a > 0) { stack.push(b); if (b.a >= 0.999) { solid = b; break; } } p = p.parentElement; }
    if (!stack.length) { R.skipped++; continue; }
    let ground = solid || { r: 127, g: 127, b: 127, a: 1 };
    const trans = solid ? stack.slice(0, -1) : stack;
    for (let i = trans.length - 1; i >= 0; i--) ground = over(trans[i], ground);
    if (!solid && 1 - trans.reduce((acc, b) => acc * (1 - b.a), 1) < 0.5) { R.skipped++; continue; }
    const cr = contrast(over(ink, ground), ground);
    if (cr < CFG.minContrast) { const k = sig(n); const e = R.faint.get(k) || { stage, ratio: +cr.toFixed(2), ink: cs.color, ground: 'rgb(' + [ground.r, ground.g, ground.b].map((v) => v | 0).join(',') + ')', text: n.textContent.trim().slice(0, 24), count: 0 }; e.count++; R.faint.set(k, e); }
  }
  probe.remove();
})()`;

const COLLECT = `(() => { const R = window.__audit; return JSON.stringify({ opaque: [...R.opaque], faint: [...R.faint], skipped: R.skipped, texts: R.texts, ink: { cells: R.ink.cells, followed: R.ink.followed, stray: [...R.ink.stray] } }); })()`;

/** summarise(raw) → { faces, allowed:{accent,content}, faint, ink, ok } from the page's collected sweep; pure, exported for tests */
export function summarise(raw) {
  const faces = raw.opaque.filter(([, v]) => v.kind === 'FACE'), count = (k) => raw.opaque.filter(([, v]) => v.kind === k).length;
  const strays = raw.ink.stray.length;
  return { faces, allowed: { accent: count('accent'), content: count('content') }, faint: raw.faint, texts: raw.texts, skipped: raw.skipped, ink: { ...raw.ink, strays }, ok: !faces.length && !raw.faint.length && !strays };
}

export async function audit(o, p) {
  await p.eval('window.__audit = undefined');
  const sweep = (stage) => p.eval(SWEEP({ scope: o.scope, allow: o.allow, minAlpha: o.minAlpha, minContrast: o.minContrast, stage }));
  await sweep('page');
  const misses = [];
  for (const sel of o.click) {
    const r = await p.click(sel);
    if (!r.hit) { misses.push(`${sel}: ${r.got === 'absent' ? 'no such element' : 'something else is on top (' + r.got + ')'}`); continue; }
    await sleep(500); await sweep('after ' + sel);
  }
  return { ...summarise(JSON.parse(await p.eval(COLLECT))), misses };
}

export function report(o, s) {
  const L = [`audit-material  ${o.url}  ${o.theme || 'the page\'s own theme'}  α ≥ ${o.minAlpha} · text ≥ ${o.minContrast}:1`];
  L.push(`surfaces  ${s.faces.length} dense FACE · allowed dense: ${s.allowed.accent} accent, ${s.allowed.content} content`);
  for (const [k, v] of s.faces) L.push(`  FACE  ${k}  α${v.alpha}  ${v.bg}  blur ${v.blur}  ${v.size[0]}×${v.size[1]}  [${v.stage}]`);
  L.push(`text      ${s.texts} labels read · ${s.faint.length} under ${o.minContrast}:1 · ${s.skipped} left to the eye (the picture shows through)`);
  for (const [k, v] of s.faint) L.push(`  FAINT ${k}  ${v.ratio}:1  ink ${v.ink} on ${v.ground}  "${v.text}" ×${v.count}  [${v.stage}]`);
  if (s.ink.cells) { L.push(`ink       ${s.ink.followed}/${s.ink.cells} pure-ink labels follow their cell · ${s.ink.strays} stray`); for (const [k, n] of s.ink.stray.slice(0, 20)) L.push(`  STRAY ${k} ×${n}`); }
  for (const m of s.misses) L.push('FAIL  --click ' + m);
  const ok = s.ok && !s.misses.length;
  L.push(ok ? 'OK' : 'NOT OK');
  return { lines: L, ok };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const o = parseArgs(process.argv.slice(2));
  if (o.error) { console.log(o.error); process.exit(2); }
  const p = await launch({ width: o.size[0], height: o.size[1] });
  let code = 1;
  try {
    await p.goto(o.url, o.wait);
    if (o.theme) { await p.eval(`(window.__MIR && window.__MIR.prefs) ? window.__MIR.prefs.set('theme', ${JSON.stringify(o.theme)}) : (document.body.dataset.theme = ${JSON.stringify(o.theme)})`); await sleep(500); }
    const s = await audit(o, p), rep = report(o, s);
    console.log(o.json ? JSON.stringify({ ...s, ok: rep.ok }, null, 2) : rep.lines.join('\n'));
    code = rep.ok ? 0 : 1;
  } catch (e) { console.log('audit-material threw: ' + (e && e.stack || e)); } finally { await p.close(); }
  process.exit(code);
}
