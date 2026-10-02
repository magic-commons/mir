/* intent.browser.mjs — the rulings of docs/INTENT.md a machine can see, on the kit's house sheets (tests/fixtures/intent.html).
 *   ONE LIGHT, FROM ABOVE: no drop shadow on a kit pane (card, floating window, carried window, menu, glass, badge)
 *     has a negative y, in either theme · ON IS NEVER AN ACCENT FILL: .sw.on, .trig.on and .seg-b.on wear the frost
 *     face (--state-on), not --acc-soft · TWO MATERIALS, ONE BLUR: under FROST a TINTED pane has backdrop-filter none
 *     and a REFRACTIVE one blurs; a TINTED menu never blurs · FOCUS: Tab onto a switch draws a ring OUTSIDE it (an
 *     outline, offset ≥ 0) · PRESSED: a held trigger scales to --state-press-scale · DISABLED: one fade (.38) and no
 *     relief on the knob's puck.  Everything clicked or Tabbed is hit-tested with elementFromPoint.
 * Standalone: node tools/serve.mjs 8791 & MIR_BASE=http://127.0.0.1:8791 node tests/intent.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8791';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

/* the drop terms of a computed box-shadow: [{ inset, y }] — a computed list is "color x y blur spread [inset]" */
const SHADOWS = `const drops = (s) => s === 'none' ? [] : s.split(/,(?![^(]*\\))/).map((t) => { t = t.trim(); const n = t.replace(/(rgba?|hsla?|color|oklab|oklch)\\([^)]*\\)/g, '').trim().split(/\\s+/).filter((x) => /px$/.test(x)).map(parseFloat); return { inset: /inset/.test(t), y: n[1] || 0, t }; });`;

const p = await launch({ width: 1280, height: 800 });
try {
  await p.goto(BASE + '/tests/fixtures/intent.html', 800);
  for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  const ev = (x) => p.eval(x);
  const hits = async (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}), b = e.getBoundingClientRect(), h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!h && (h === e || e.contains(h)); })()`);

  /* ── one light, from above ── */
  for (const theme of ['dark', 'light']) {
    const up = JSON.parse(await ev(`(() => { ${SHADOWS} document.body.dataset.theme = '${theme}';
      const panes = ['[data-id="pane"]', '[data-id="float"]', '[data-id="carried"]', '.mb-list', '.glass', '.badge', '.k-val'];
      const bad = []; for (const sel of panes) for (const d of drops(getComputedStyle(document.querySelector(sel)).boxShadow)) if (!d.inset && d.y < 0) bad.push(sel + ': ' + d.t);
      return JSON.stringify(bad); })()`));
    check(`light from above (${theme}): no pane drop shadow has a negative y`, up.length === 0, up.join(' ; '));
  }
  const heights = JSON.parse(await ev(`(() => { ${SHADOWS} document.body.dataset.theme = 'dark'; const y = (sel) => Math.max(0, ...drops(getComputedStyle(document.querySelector(sel)).boxShadow).filter((d) => !d.inset).map((d) => d.y));
    return JSON.stringify({ pane: y('[data-id="pane"]'), float: y('[data-id="float"]'), menu: y('.mb-list') }); })()`));
  check('four heights: a floating window sits above a pane, a menu above a floating window', heights.pane < heights.float && heights.float < heights.menu, JSON.stringify(heights));

  /* ── ON is a frost face, never an accent fill ── */
  const on = JSON.parse(await ev(`(() => { const probe = (v) => { const i = document.createElement('i'); i.style.backgroundColor = v; document.body.appendChild(i); const c = getComputedStyle(i).backgroundColor; i.remove(); return c; };
    const frost = probe('var(--state-on)'), acc = probe('var(--acc-soft)'), bg = (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor;
    return JSON.stringify({ frost, acc, sw: bg('.sw.on'), trig: bg('.trig.on'), seg: bg('.seg-b.on'), led: getComputedStyle(document.querySelector('.sw.on .sw-led')).boxShadow, segInk: getComputedStyle(document.querySelector('.seg-b.on')).color, accInk: (() => { const i = document.createElement('i'); i.style.color = 'var(--acc)'; document.body.appendChild(i); const c = getComputedStyle(i).color; i.remove(); return c; })() }); })()`));
  check('ON: .sw.on, .trig.on and .seg-b.on wear the frost face, not the accent fill', [on.sw, on.trig, on.seg].every((c) => c === on.frost && c !== on.acc), JSON.stringify(on));
  check('ON: the switch LED is lit with a glow; a chosen segment’s label is in accent A', on.led !== 'none' && on.segInk === on.accInk, `${on.led} · ${on.segInk}`);

  /* ── two materials, one blur ── */
  const mat = JSON.parse(await ev(`(async () => { const f = (sel) => getComputedStyle(document.querySelector(sel)).backdropFilter;
    document.body.dataset.card = 'tinted'; const tinted = f('[data-id="pane"]'), menuT = f('.mb-list');
    document.body.dataset.card = 'refractive'; const refr = f('[data-id="pane"]'), menuR = f('.mb-list');
    document.body.dataset.card = 'tinted'; return JSON.stringify({ tinted, menuT, refr, menuR }); })()`));
  check('material: under FROST a TINTED pane has backdrop-filter none, a REFRACTIVE one blurs', mat.tinted === 'none' && /blur/.test(mat.refr), JSON.stringify(mat));
  check('material: a TINTED menu never blurs; a REFRACTIVE one does', mat.menuT === 'none' && /blur/.test(mat.menuR), JSON.stringify(mat));

  /* ── keyboard focus: a ring outside ── */
  check('focus: the switch is the element under its own centre', await hits('.sw.on'));
  await ev(`__T.before.root.focus(); true`);
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'Tab', key: 'Tab', windowsVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Tab', key: 'Tab' }); await sleep(150);
  const fo = JSON.parse(await ev(`(() => { const a = document.activeElement, cs = getComputedStyle(a); return JSON.stringify({ isSw: a === __T.swOn.root, fv: a.matches(':focus-visible'), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), offset: parseFloat(cs.outlineOffset), color: cs.outlineColor }); })()`));
  check('focus: Tab onto a switch draws an accent ring OUTSIDE it', fo.isSw && fo.fv && fo.style === 'solid' && fo.width >= 1 && fo.offset >= 0, JSON.stringify(fo));
  await ev('document.activeElement.blur(); true');

  /* ── pressed: the scale, while held ── */
  const [px, py] = JSON.parse(await ev(`(() => { const b = __T.press.root.getBoundingClientRect(); return JSON.stringify([b.left + b.width / 2, b.top + b.height / 2]); })()`));
  const pressHit = await ev(`(() => { const h = document.elementFromPoint(${px}, ${py}); return !!h && __T.press.root.contains(h); })()`);
  await p.mouse(px, py); await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: px, y: py, button: 'left', buttons: 1, clickCount: 1 }); await sleep(250);
  const held = JSON.parse(await ev(`(() => { const cs = getComputedStyle(__T.press.root); return JSON.stringify({ active: __T.press.root.matches(':active'), scale: cs.scale, want: getComputedStyle(document.documentElement).getPropertyValue('--state-press-scale').trim() }); })()`));
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: px, y: py, button: 'left', buttons: 0, clickCount: 1 }); await sleep(250);
  const rest = await ev(`getComputedStyle(__T.press.root).scale`);
  check('press: a held trigger scales to --state-press-scale, and returns', pressHit && held.active && Number(held.scale) === Number(held.want) && Number(held.want) < 1 && rest === 'none', JSON.stringify({ pressHit, held, rest }));

  /* ── disabled: one fade, no relief ── */
  const dis = JSON.parse(await ev(`(() => { ${SHADOWS} const k = getComputedStyle(__T.k.root), dial = getComputedStyle(__T.k.root.querySelector('.k-dial')), f = getComputedStyle(__T.fd.root);
    const drawn = (s) => drops(s).filter((d) => !/rgba\\(0, 0, 0, 0\\)/.test(d.t) && !/ 0px 0px 0px 0px/.test(' ' + d.t.replace(/^\\S+\\s/, ''))).length;
    return JSON.stringify({ k: k.opacity, f: f.opacity, dial: dial.boxShadow, drawn: drawn(dial.boxShadow), fdDrawn: drawn(f.boxShadow) }); })()`));
  check('disabled: the knob and the fader fade to .38, once', dis.k === '0.38' && dis.f === '0.38', JSON.stringify(dis));
  check('disabled: no relief on the knob’s puck or the fader’s well', dis.drawn === 0 && dis.fdDrawn === 0, JSON.stringify(dis));
  check('no page errors', !p.logs.some((l) => /EXCEPTION/.test(l)), p.logs.join(' | '));
} finally { await p.close(); }

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nPASS intent: all ${results.length}`);
process.exit(failed ? 1 : 0);
