/* intent.browser.mjs — the rulings of docs/INTENT.md a machine can see, on the kit's house sheets (tests/fixtures/intent.html).
 *   ONE LIGHT, FROM ABOVE: no drop shadow on a kit pane (card, floating window, carried window, menu, glass, badge)
 *     has a negative y, in either theme · ON IS NEVER AN ACCENT FILL: .sw.on, .trig.on and .seg-b.on wear the frost
 *     face (--state-on), not --acc-soft · TWO MATERIALS (O12, 2026-10-02): under FROST a TINTED pane thins to .58 and
 *     blurs as a REFRACTIVE one does, SOLID never; at BLUR 0 there is no filter at all · FOCUS: Tab onto a switch draws a ring OUTSIDE it (an
 *     outline, offset ≥ 0) · PRESSED: a held trigger scales to --state-press-scale · DISABLED: one fade (.38) and no
 *     relief on the knob's puck.  Everything clicked or Tabbed is hit-tested with elementFromPoint.
 *   THE VANILLA THEMES KEEP IT: under FROST and MORPH (shell/themes.js, applied through the look store), in both themes,
 *     shadows fall away from LIGHT ANGLE, the heights stack, a resting trigger stands proud and is not a well, ON and
 *     CHOSEN are the frost face and not wells, the track is the well, disabled has no relief.
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

  /* ── two materials (rule 4, O12 ruled 2026-10-02: "tinted can blur") ── */
  const mat = JSON.parse(await ev(`(async () => { const f = (sel) => getComputedStyle(document.querySelector(sel)).backdropFilter, a = (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor;
    const b = document.body; b.dataset.card = 'tinted'; const tinted = f('[data-id="pane"]'), menuT = f('.mb-list'), fillT = a('[data-id="pane"]');
    b.classList.remove('frost'); const offT = f('[data-id="pane"]'), fillOff = a('[data-id="pane"]'); b.classList.add('frost');
    b.dataset.card = 'refractive'; const refr = f('[data-id="pane"]'), menuR = f('.mb-list');
    b.dataset.card = 'solid'; const solid = f('[data-id="pane"]');
    /* BLUR 0: the look engine writes the filter as the whole value none */
    b.dataset.card = 'tinted'; b.style.setProperty('--surface-filter', 'none'); const zero = f('[data-id="pane"]'), zeroMenu = f('.mb-list'), zeroFill = a('[data-id="pane"]'); b.style.removeProperty('--surface-filter');
    return JSON.stringify({ tinted, menuT, fillT, offT, fillOff, refr, menuR, solid, zero, zeroMenu, zeroFill }); })()`));
  const alpha = (c) => { const m = /rgba?\(([^)]*)\)/.exec(c || ''); const v = m ? m[1].split(',').map(parseFloat) : []; return v.length > 3 ? v[3] : 1; };
  check('material: under FROST a TINTED pane thins to .58 and blurs, as a REFRACTIVE one blurs; SOLID never does',
    /blur/.test(mat.tinted) && Math.abs(alpha(mat.fillT) - 0.58) < 0.005 && /blur/.test(mat.refr) && mat.solid === 'none', JSON.stringify(mat));
  check('material: FROST off, a TINTED pane is its full tint with no filter', mat.offT === 'none' && alpha(mat.fillOff) > 0.8, JSON.stringify(mat));
  check('material: a TINTED menu blurs under FROST, as a REFRACTIVE one does', /blur/.test(mat.menuT) && /blur/.test(mat.menuR), JSON.stringify(mat));
  check('material: at BLUR 0 a TINTED pane and menu have no filter at all (none, never blur(0)) and the pane stays at .58',
    mat.zero === 'none' && mat.zeroMenu === 'none' && Math.abs(alpha(mat.zeroFill) - 0.58) < 0.005, JSON.stringify(mat));
  /* FROST · STILL: while the hold lasts a joined pane stops blurring and wears the full tinted fill; then it is back */
  const hold = JSON.parse(await ev(`(() => { const b = document.body, pane = document.querySelector('[data-id="pane"]'), cs = () => getComputedStyle(pane);
    const was = b.dataset.card; b.dataset.card = 'tinted'; b.classList.add('frost-hold'); const tintFill = cs().backgroundColor, tintHeld = cs().backdropFilter; b.classList.remove('frost-hold');
    b.dataset.card = 'refractive'; const always = { f: cs().backdropFilter, bg: cs().backgroundColor };
    b.classList.add('frost-hold'); const held = { f: cs().backdropFilter, bg: cs().backgroundColor };
    b.classList.remove('frost-hold'); const after = cs().backdropFilter; b.dataset.card = was;
    return JSON.stringify({ frost: b.classList.contains('frost'), disc: b.classList.contains('disconnected'), tintFill, tintHeld, always, held, after }); })()`));
  check('FROST · STILL: a held pane (REFRACTIVE or TINTED) has no blur and the full tinted fill; the blur returns when the hold lifts',
    hold.frost && /blur/.test(hold.always.f) && hold.held.f === 'none' && hold.tintHeld === 'none' && alpha(hold.tintFill) > 0.8 && hold.held.bg === hold.tintFill && hold.held.bg !== hold.always.bg && /blur/.test(hold.after), JSON.stringify(hold));

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

  /* ── the vanilla themes keep INTENT: FROST (from above) and MORPH (SOLID, the light upper-left, neumorphism) ──────
     Neumorphism makes every inset look alike — the "resting toolbar looks already pressed" fault INTENT was written to
     stop — so under each theme: shadows fall away from the light, the heights still stack, a resting trigger stands
     proud and is not a well, ON and CHOSEN wear the frost face and are not wells, the track is the well, and disabled
     has no relief.  The theme is applied through the look store, as the GUI window applies it. */
  for (const id of ['frost', 'morph']) for (const theme of ['dark', 'light']) {
    await p.goto(BASE + '/tests/fixtures/intent.html', 800);
    for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
    const t = JSON.parse(await ev(`(async () => { ${SHADOWS}
      const { createPrefs } = await import('/mir/core/prefs.js'), { lookSchema } = await import('/mir/shell/gui.js'), { themeValues } = await import('/mir/shell/themes.js');
      const P = createPrefs({ key: 'intent', schema: lookSchema(), storage: null }); P.set({ ...themeValues('${id}'), theme: '${theme}' }); P.apply({ now: true });
      await new Promise((r) => setTimeout(r, 300));
      const cs = (sel) => getComputedStyle(typeof sel === 'string' ? document.querySelector(sel) : sel);
      const ang = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--light-angle')) || 0) * Math.PI / 180, away = [-Math.sin(ang), Math.cos(ang)];
      const xy = (t) => { const n = t.replace(/(rgba?|hsla?|color|oklab|oklch)\\([^)]*\\)/g, '').trim().split(/\\s+/).filter((x) => /px$/.test(x)).map(parseFloat); return { x: n[0] || 0, y: n[1] || 0, blur: n[2] || 0, clear: /rgba\\(0, 0, 0, 0\\)|\\/ 0\\)/.test(t) }; };
      const drawn = (s) => s === 'none' ? [] : s.split(/,(?![^(]*\\))/).map((t) => ({ inset: /inset/.test(t), ...xy(t.trim()), t: t.trim() })).filter((d) => !d.clear);
      const toward = []; for (const sel of ['[data-id="pane"]', '[data-id="float"]', '.mb-list', '.glass']) for (const d of drawn(cs(sel).boxShadow)) if (!d.inset && d.blur > 0 && d.x * away[0] + d.y * away[1] < -0.01 && (d.x || d.y)) {
        const shine = /255, 255, 255/.test(d.t); if (!shine) toward.push(sel + ': ' + d.t); }
      const h = (sel) => Math.max(0, ...drawn(cs(sel).boxShadow).filter((d) => !d.inset && !/255, 255, 255/.test(d.t)).map((d) => Math.hypot(d.x, d.y)));
      const probe = (v) => { const i = document.createElement('i'); i.style.backgroundColor = v; document.body.appendChild(i); const c = getComputedStyle(i).backgroundColor; i.remove(); return c; };
      const wells = (el) => drawn(cs(el).boxShadow).filter((d) => d.inset && d.blur > 0).length, raised = (el) => drawn(cs(el).boxShadow).filter((d) => !d.inset && d.blur > 0).length;
      const dial = cs(__T.k.root.querySelector('.k-dial'));
      return JSON.stringify({ card: document.body.dataset.card, faces: document.body.dataset.faces || '', angle: getComputedStyle(document.documentElement).getPropertyValue('--light-angle').trim() || '0deg', toward,
        heights: { pane: h('[data-id="pane"]'), float: h('[data-id="float"]'), menu: h('.mb-list') },
        rest: { raised: raised(__T.before.root), wells: wells(__T.before.root) }, on: { frost: probe('var(--state-on)'), sw: cs('.sw.on').backgroundColor, seg: cs('.seg-b.on').backgroundColor, swWells: wells('.sw.on'), segWells: wells('.seg-b.on'), trWells: wells(__T.trOn.root) },
        track: wells('.seg'), disabled: drawn(dial.boxShadow).length }); })()`));
    const L = `${id.toUpperCase()} ${theme}`;
    check(`${L}: every pane shadow falls away from the light (${t.angle})`, t.toward.length === 0, t.toward.join(' ; '));
    check(`${L}: the heights still stack (pane < floating window < menu)`, t.heights.pane < t.heights.float && t.heights.float < t.heights.menu, JSON.stringify(t.heights));
    check(`${L}: a resting trigger stands proud and is not a well (not "already pressed")`, t.rest.raised > 0 && t.rest.wells === 0, JSON.stringify(t.rest));
    /* under GLASS faces a chosen segment is clear, as BASINS draws it (its rim and accent label stay): docs/THEMES.md */
    check(`${L}: ON wears the frost face, CHOSEN the frost face (clear under GLASS faces, as BASINS), neither is a well; the track is the well`, t.on.sw === t.on.frost && (t.on.seg === t.on.frost || (t.faces === 'glass' && t.on.seg === 'rgba(0, 0, 0, 0)')) && !t.on.swWells && !t.on.segWells && !t.on.trWells && t.track > 0, JSON.stringify({ on: t.on, track: t.track }));
    check(`${L}: disabled has no relief`, t.disabled === 0, String(t.disabled));
  }
  check('no page errors', !p.logs.some((l) => /EXCEPTION/.test(l)), p.logs.join(' | '));
} finally { await p.close(); }

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nPASS intent: all ${results.length}`);
process.exit(failed ? 1 : 0);
