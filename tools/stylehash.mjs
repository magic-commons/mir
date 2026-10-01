/* stylehash.mjs — the NEUTRALITY proof: does a change to the kit change what an app draws?
 *
 * MIR 1.0.0 was extracted from λWAVES "proved neutral by a 3 292-element computed-style hash, dark and light,
 * before and after" — and the script that did it was never kept.  This is that proof, kept.
 *
 *   node tools/stylehash.mjs capture <name> <url> <out-dir> [options]
 *   node tools/stylehash.mjs compare <out-dir> <before> <after> [--noise <before-again>]
 *
 * CAPTURE drives one page through a matrix of states — theme × card × frost by default — and records, for every
 * visible element of the page, its computed style (the properties that make a look) and its box, keyed by the
 * element's structural path, plus a viewport screenshot per state.
 *   --ready  <js>     an expression that is true when the page has booted          (default: document.readyState === 'complete')
 *   --setup  <js>     run once after ready (hide canvases, pause clocks, dismiss notices…)
 *   --theme  <js>     how to set the theme, %s is the quoted value                 (default: document.body.dataset.theme = %s)
 *   --card   <js>     how to set the card style                                    (default: document.body.dataset.card = %s)
 *   --frost  <js>     how to set frost, %s is true/false                            (default: document.body.classList.toggle('frost', %s))
 *   --states <list>   comma list of theme-card-frost, e.g. dark-tinted-off,light-refractive-on   (default: all 8)
 *   --skip   <css>    elements (and their subtrees) to leave out                    (default: canvas)
 *   --size   <WxH>    viewport                                                       (default: 1440x900)
 *   --gpu    1        a real WebGPU adapter, and one reload (for an app that will not boot without the GPU)
 *   --media  <list>   emulated media features for the whole capture, e.g. prefers-reduced-motion=reduce,prefers-contrast=more
 *                     (CDP Emulation.setEmulatedMedia; set before the page loads — the kit's a11y layer lives behind these)
 *
 * COMPARE reports, per state, elements that appeared, disappeared or changed (with the properties that differ),
 * and the pixels.  A page is rarely still — a clock ticks, a mark turns — so `--noise <name>` names a SECOND
 * capture of the unchanged page: an element property that differs between the two before-runs is noise and is
 * masked (per state, element and property), and so is a PIXEL that differs between them (per pixel).  With
 * --noise, exit 1 if any element or any pixel differs beyond the noise; without it, pixels are reported only.
 *
 * WHAT IT SEES: every visible element under <html> including <html> and <body>, 80-odd computed properties, the
 * element's box, ::before/::after, and every custom property the page's own sheets declare, read on <html> and
 * <body> — so a token that changes shows up even where nothing paints it yet.  The token scan walks every grouping
 * rule (@layer blocks since 1.5.0, @media, @supports, @container), so a token declared inside a layer is seen.  WHAT IT DOES NOT: hover, focus,
 * open popovers and any state the matrix does not drive (drive them with --setup, or prove them elsewhere:
 * tools/shell-parity.mjs, tests/widgets.browser.mjs), and differences inside a <canvas>. */
import fs from 'node:fs'; import path from 'node:path';
import { launch, sleep } from './cdp.mjs';

const PROPS = ['display', 'position', 'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'background-color', 'background-image', 'background-size', 'background-position', 'background-clip', 'box-shadow', 'backdrop-filter', 'filter', 'opacity', 'mix-blend-mode',
  'mask-image', 'clip-path', 'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-variant-numeric', 'line-height',
  'letter-spacing', 'word-spacing', 'text-transform', 'text-align', 'text-indent', 'text-shadow', 'text-overflow', 'text-decoration-line', 'text-decoration-color',
  'white-space', 'vertical-align', 'list-style-type', 'gap', 'align-items', 'justify-content', 'flex-direction', 'flex-wrap', 'order',
  'z-index', 'cursor', 'visibility', 'overflow-x', 'overflow-y', 'transform', 'transition', 'animation-name', 'fill', 'stroke',
  'outline-style', 'outline-width', 'outline-color', 'outline-offset', 'pointer-events', 'top', 'right', 'bottom', 'left', 'content'];

function args(list) {
  const o = {}, pos = [];
  for (let i = 0; i < list.length; i++) { if (list[i].startsWith('--')) { o[list[i].slice(2)] = list[i + 1]; i++; } else pos.push(list[i]); }
  return { o, pos };
}

const COLLECT = (skip) => `(() => {
  const PROPS = ${JSON.stringify(PROPS)}, SKIP = ${JSON.stringify(skip)};
  const out = {};
  /* the tokens: every custom property the page's own sheets declare, read where an app's rules read them */
  const names = new Set();
  const scan = (rules) => { for (const r of rules) { if (r.style) for (let i = 0; i < r.style.length; i++) { const n = r.style[i]; if (n.startsWith('--')) names.add(n); } if (r.cssRules) scan(r.cssRules); } };
  for (const sh of document.styleSheets) { try { scan(sh.cssRules); } catch (_) {} }
  const tok = (el) => { const cs = getComputedStyle(el), o = {}; for (const n of [...names].sort()) o[n] = cs.getPropertyValue(n).trim(); return o; };
  out['#tokens on html'] = tok(document.documentElement); out['#tokens on body'] = tok(document.body);
  const keyOf = (e) => { if (e === document.documentElement) return 'html'; if (e === document.body) return 'body'; const parts = []; for (let n = e; n && n !== document.body; n = n.parentElement) {
      const sib = n.parentElement ? [...n.parentElement.children].filter((c) => c.tagName === n.tagName) : [n];
      const id = n.id ? '#' + n.id : ''; const cls = [...n.classList].filter((c) => !/^(turn|busy|sq\\d|khover|kdrag)$/.test(c)).sort().join('.');
      parts.unshift(n.tagName.toLowerCase() + id + (cls ? '.' + cls : '') + (!id && sib.length > 1 ? ':' + sib.indexOf(n) : '')); }
    return parts.join(' > '); };
  for (const e of [document.documentElement, document.body, ...document.body.querySelectorAll('*')]) {
    if (SKIP && e.closest(SKIP)) continue;
    if (!(e.checkVisibility ? e.checkVisibility({ visibilityProperty: false }) : e.getClientRects().length)) continue;
    const cs = getComputedStyle(e), b = e.getBoundingClientRect();
    const v = {}; for (const p of PROPS) v[p] = cs.getPropertyValue(p);
    v['#box'] = [b.x, b.y, b.width, b.height].map((n) => Math.round(n * 10) / 10).join(' ');
    for (const pe of ['::before', '::after']) { const c = getComputedStyle(e, pe); if (c.content && c.content !== 'none' && c.content !== 'normal') { for (const p of ['content', 'background-color', 'color', 'border-top-color', 'width', 'height', 'opacity']) v[pe + ' ' + p] = c.getPropertyValue(p); } }
    let k = keyOf(e); while (out[k]) k += "'"; out[k] = v;
  }
  return JSON.stringify(out);
})()`;

async function capture(name, url, outDir, o) {
  const [W, H] = (o.size || '1440x900').split('x').map(Number);
  const states = (o.states || ['dark', 'light'].flatMap((t) => ['tinted', 'refractive'].flatMap((c) => ['off', 'on'].map((f) => `${t}-${c}-${f}`))).join(',')).split(',');
  const T = o.theme || 'document.body.dataset.theme = %s', C = o.card || 'document.body.dataset.card = %s', F = o.frost || "document.body.classList.toggle('frost', %s)";
  const dir = path.join(outDir, name); fs.mkdirSync(dir, { recursive: true });
  const p = await launch({ width: W, height: H, gpu: !!o.gpu });
  const meta = { url, states, at: new Date().toISOString(), counts: {}, media: o.media || null };
  try {
    if (o.media) await p.send('Emulation.setEmulatedMedia', { features: o.media.split(',').map((kv) => { const [name, value] = kv.split('='); return { name, value }; }) });
    await p.goto(url, 2500);
    const ready = o.ready || "document.readyState === 'complete'";
    for (let i = 0; i < 40 && !(await p.eval(ready)); i++) await sleep(250);
    /* Chromium: the first requestAdapter() after launch can return null — one reload, only if the page did not come up */
    if (o.gpu && !(await p.eval(ready))) { await p.goto(url, 4000); for (let i = 0; i < 40 && !(await p.eval(ready)); i++) await sleep(250); }
    if (!(await p.eval(ready))) throw new Error('the page never became ready: ' + ready);
    if (o.setup) await p.eval(o.setup);
    await p.mouse(W - 2, H - 2);
    for (const st of states) {
      const [t, c, f] = st.split('-');
      await p.eval(T.replace('%s', JSON.stringify(t))); await p.eval(C.replace('%s', JSON.stringify(c))); await p.eval(F.replace('%s', f === 'on' ? 'true' : 'false'));
      await p.eval(`document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
      await p.eval('document.fonts.ready.then(() => true)'); await sleep(700);
      const snap = await p.eval(COLLECT(o.skip === undefined ? 'canvas' : o.skip));
      fs.writeFileSync(path.join(dir, st + '.json'), snap);
      meta.counts[st] = Object.keys(JSON.parse(snap)).length;
      await p.shot(path.join(dir, st + '.png'));
    }
    meta.logs = p.logs.slice(0, 50);
  } finally { await p.close(); }
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
  console.log(`captured ${name}: ${states.length} states, ${Object.values(meta.counts).join('/')} elements → ${dir}`);
}

function diffSnap(a, b) {
  const onlyA = Object.keys(a).filter((k) => !(k in b)), onlyB = Object.keys(b).filter((k) => !(k in a)), changed = {};
  for (const k of Object.keys(a)) if (k in b) for (const p of Object.keys(a[k])) if (a[k][p] !== b[k][p]) (changed[k] ||= {})[p] = [a[k][p], b[k][p]];
  return { onlyA, onlyB, changed };
}

async function compare(outDir, A, B, o) {
  const metaA = JSON.parse(fs.readFileSync(path.join(outDir, A, 'meta.json'), 'utf8'));
  const report = [`# before ${A}: ${metaA.url}`, `# after  ${B}: ${JSON.parse(fs.readFileSync(path.join(outDir, B, 'meta.json'), 'utf8')).url}`];
  if (o.noise) report.push(`# noise  ${o.noise} (a second capture of the unchanged page; what differs there is masked)`);
  let real = 0, realPix = 0; const pixStates = [];
  for (const st of metaA.states) {
    const a = JSON.parse(fs.readFileSync(path.join(outDir, A, st + '.json'), 'utf8'));
    const b = JSON.parse(fs.readFileSync(path.join(outDir, B, st + '.json'), 'utf8'));
    const d = diffSnap(a, b);
    let noise = null;
    if (o.noise) { const n = JSON.parse(fs.readFileSync(path.join(outDir, o.noise, st + '.json'), 'utf8')); noise = diffSnap(a, n); }
    const noisyKey = (k) => noise && (noise.onlyA.includes(k) || noise.onlyB.includes(k));
    const noisyProp = (k, p) => noise && noise.changed[k] && noise.changed[k][p];
    const onlyA = d.onlyA.filter((k) => !noisyKey(k)), onlyB = d.onlyB.filter((k) => !noisyKey(k));
    const allChanged = Object.entries(d.changed).map(([k, ps]) => [k, Object.entries(ps).filter(([p]) => !noisyProp(k, p))]).filter(([, ps]) => ps.length);
    /* tokens are reported apart: a token whose TEXT changed may paint nothing different (hsl(…) for a hex), and
       a token that paints differently shows up in the elements that read it */
    const tokens = allChanged.filter(([k]) => k.startsWith('#tokens')), changed = allChanged.filter(([k]) => !k.startsWith('#tokens'));
    const n = onlyA.length + onlyB.length + changed.length; real += n;
    report.push(`## ${st}: ${Object.keys(a).length} → ${Object.keys(b).length} elements · ${changed.length} changed · ${onlyA.length} gone · ${onlyB.length} new${noise ? ` · (${Object.keys(noise.changed).length + noise.onlyA.length + noise.onlyB.length} noisy masked)` : ''}`);
    for (const k of onlyA.slice(0, 25)) report.push(`  - gone: ${k}`);
    for (const k of onlyB.slice(0, 25)) report.push(`  + new:  ${k}`);
    for (const [k, ps] of changed.slice(0, 60)) report.push(`  ~ ${k}\n      ${ps.map(([p, [x, y]]) => `${p}: ${x} → ${y}`).join('\n      ')}`);
    for (const [k, ps] of tokens) report.push(`  · ${k} (token text; counts only if an element above changed): ${ps.length} changed\n      ${ps.slice(0, 20).map(([p, [x, y]]) => `${p}: ${x} → ${y}`).join('\n      ')}`);
    pixStates.push(st);
  }
  const p = await launch({ width: 800, height: 600 }); const pix = [];
  try {
    await p.goto('about:blank', 200);
    for (const st of pixStates) {
      const ua = 'data:image/png;base64,' + fs.readFileSync(path.join(outDir, A, st + '.png')).toString('base64');
      const ub = 'data:image/png;base64,' + fs.readFileSync(path.join(outDir, B, st + '.png')).toString('base64');
      const un = o.noise ? 'data:image/png;base64,' + fs.readFileSync(path.join(outDir, o.noise, st + '.png')).toString('base64') : null;
      const r = JSON.parse(await p.eval(`(async () => {
        const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
        const un = ${JSON.stringify(un)};
        const [A, B, N] = await Promise.all([load(${JSON.stringify(ua)}), load(${JSON.stringify(ub)}), un ? load(un) : null]);
        const w = Math.max(A.width, B.width), h = Math.max(A.height, B.height);
        const px = (img) => { const c = new OffscreenCanvas(w, h); c.getContext('2d').drawImage(img, 0, 0); return c.getContext('2d').getImageData(0, 0, w, h).data; };
        const da = px(A), db = px(B), dn = N ? px(N) : null;
        const dist = (x, y, i) => Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2]));
        let over = 0, masked = 0; const box = [w, h, -1, -1];
        for (let i = 0; i < da.length; i += 4) {
          if (dist(da, db, i) <= 8) continue;
          if (dn && dist(da, dn, i) > 8) { masked++; continue; }             /* this pixel moves on its own: noise */
          over++; const x = (i / 4) % w, y = Math.floor(i / 4 / w); if (x < box[0]) box[0] = x; if (y < box[1]) box[1] = y; if (x > box[2]) box[2] = x; if (y > box[3]) box[3] = y; }
        let png = '';
        if (over) { const pair = new OffscreenCanvas(A.width + B.width + 12, h), xp = pair.getContext('2d'); xp.fillStyle = '#ff00aa'; xp.fillRect(0, 0, pair.width, h); xp.drawImage(A, 0, 0); xp.drawImage(B, A.width + 12, 0);
          const blob = await pair.convertToBlob({ type: 'image/png' }); const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); png = btoa(s); }
        return JSON.stringify({ over, masked, frac: over / (w * h), box: over ? box : null, png });
      })()`));
      if (r.png) fs.writeFileSync(path.join(outDir, `${A}__${B}__${st}.pair.png`), Buffer.from(r.png, 'base64'));
      if (o.noise) realPix += r.over;
      pix.push(`${st}: ${r.over} pixels differ (${(100 * r.frac).toFixed(3)} %)${r.box ? ` inside x ${r.box[0]}–${r.box[2]}, y ${r.box[1]}–${r.box[3]}` : ''}${o.noise ? ` · ${r.masked} masked as noise` : ''}`);
    }
  } finally { await p.close(); }
  const text = report.join('\n') + '\n\n## pixels ' + (o.noise ? '(beyond the pixels that moved between the two before-runs)' : '(informational without --noise)') + '\n' + pix.join('\n') + '\n';
  const file = path.join(outDir, `${A}__${B}.report.txt`); fs.writeFileSync(file, text);
  console.log(text.split('\n').filter((l) => l.startsWith('#') || /pixels differ/.test(l)).join('\n'));
  const failed = real || realPix;
  console.log(failed ? `\n${real} element difference(s) and ${realPix} pixel(s) beyond noise — ${file}` : `\nneutral: no element${o.noise ? ' and no pixel' : ''} differs beyond noise`);
  process.exit(failed ? 1 : 0);
}

const [cmd, ...rest] = process.argv.slice(2);
const { o, pos } = args(rest);
if (cmd === 'capture' && pos.length === 3) await capture(pos[0], pos[1], pos[2], o);
else if (cmd === 'compare' && pos.length === 3) await compare(pos[0], pos[1], pos[2], o);
else { console.error('usage: stylehash.mjs capture <name> <url> <out-dir> [--ready js] [--setup js] [--theme js] [--card js] [--frost js] [--states list] [--skip css] [--size WxH] [--gpu 1] [--media name=value,…]\n       stylehash.mjs compare <out-dir> <before> <after> [--noise <before-again>]'); process.exit(2); }
