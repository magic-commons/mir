/* themes.browser.mjs — the vanilla themes and the new built-in settings under a real browser (tests/fixtures/themes.html).
 *   · A THEME IS SETTINGS: applying each theme writes nothing on <html> or <body> (attribute, class, style property) that
 *     the look store does not own, and adds no stylesheet; a reload keeps the theme and its tone.
 *   · SOLID: an opaque pane (alpha 1) with no backdrop filter, on the rack windows, the cards and a .glass pane.
 *   · ONE LIGHT: the pane shadow falls away from LIGHT ANGLE and the shine sits opposite it; SHINE 0 leaves no shine
 *     layer (no ::before drawn, html[data-shine] absent); the lite and flat tiers draw none.
 *   · SPACING: a real drag on the dial moves the gap between two rack windows and the rack's inset; at 0 both are 0 px.
 *   · THE COST: each theme's reading when applied (blurred surfaces, shadows, shine layers, frame time), and the frame
 *     time with the shine on and off over sixteen cards.
 *   · THE PLUGIN: the work bar's power seat is 44 × 44 inside its bar, and a skin's --state-focus still draws the ring.
 * Standalone: node tools/serve.mjs 8821 & MIR_BASE=http://127.0.0.1:8821 node tests/themes.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = (process.env.MIR_BASE || 'http://127.0.0.1:8821').replace(/\/$/, '');
const URL_ = BASE + '/tests/fixtures/themes.html';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
const report = [];

let p = await launch({ width: 1440, height: 900 });
const ready = async () => { for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100); await sleep(250); };
const J = async (expr) => JSON.parse(await p.eval(`(async () => { const T = __T, G = T.gui, P = T.P; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const cs = (s, pr, ps) => getComputedStyle(typeof s === 'string' ? document.querySelector(s) : s, ps || null).getPropertyValue(pr).trim();
  return JSON.stringify(await (async () => { ${expr} })()); })()`));
const mouse = (type, x, y, held) => p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });

try {
  await p.goto(URL_ + '?fresh', 900); await ready();

  /* ── a theme writes only what the look store owns ── */
  const owned = await J(`const n = new Set(); for (const w of P.resolve()) if (w.kind !== 'run') n.add(w.on + ':' + w.kind + ':' + w.name);
    /* the run rows' engines: the accent (shell/accent.js), the motion policy, the pointer effects, the frost hold */
    for (const x of ['body:prop:--acc', 'body:prop:--acc2', 'body:prop:--acc-glow', 'body:prop:--acc-ink', 'html:attr:data-motion', 'html:attr:data-pointer-light', 'html:attr:data-parallax-live', 'body:class:frost-hold']) n.add(x);
    return [...n];`);
  const snap = `(() => { const o = {}; for (const [on, e] of [['html', document.documentElement], ['body', document.body]]) {
      for (const a of e.attributes) if (a.name !== 'class' && a.name !== 'style') o[on + ':attr:' + a.name] = a.value;
      for (const c of e.classList) o[on + ':class:' + c] = true;
      for (let i = 0; i < e.style.length; i++) o[on + ':prop:' + e.style[i]] = e.style.getPropertyValue(e.style[i]); }
    o.sheets = document.styleSheets.length; return o; })()`;
  const stray = [];
  for (const id of ['morph', 'classic', 'swift', 'aurora', 'neon', 'frost']) {
    const r = await J(`const before = ${snap}; G.applyTheme('${id}'); await wait(250); const after = ${snap};
      const keys = new Set([...Object.keys(before), ...Object.keys(after)]); const moved = [...keys].filter((k) => before[k] !== after[k]);
      return { moved, preset: P.preset() };`);
    const own = new Set(owned);
    const bad = r.moved.filter((k) => k !== 'sheets' && !own.has(k)).concat(r.moved.includes('sheets') ? ['a stylesheet was added'] : []);
    if (bad.length || r.preset !== id) stray.push(`${id}: ${bad.join(', ') || 'preset ' + r.preset}`);
  }
  check('a theme is settings: applying each writes only look-store options on <html> and <body>, and adds no stylesheet', stray.length === 0, stray.join(' ; ') || owned.length + ' owned writes');

  /* ── reload keeps the theme and its tone ── */
  await J(`G.applyTheme('aurora'); G.applyTone('dusk'); await wait(200); return 0;`);
  await p.goto(URL_, 900); await ready();
  let r = await J(`const { matchTone } = await import('/mir/shell/themes.js'); return [P.preset(), matchTone(P.all(), P.preset()), document.body.dataset.card];`);
  check('a reload keeps the theme and its tone', r[0] === 'aurora' && r[1] === 'dusk' && r[2] === 'refractive', JSON.stringify(r));

  /* ── SOLID ── */
  r = await J(`G.applyTheme('morph'); await wait(300); const one = (s) => { const c = cs(s, 'background-color'); return { c, bf: cs(s, 'backdrop-filter') }; };
    return { rack: one('.mir-rack .dev'), card: one('#cards .dev'), pane: one('#pane'), win: one(G.root) };`);
  const opaque = (x) => /^rgb\(/.test(x.c) && x.bf === 'none';
  check('SOLID: rack windows, cards, a .glass pane and the kit window are opaque (alpha 1) and never blur', Object.values(r).every(opaque), JSON.stringify(r));

  /* ── one light: the shadow away from it, the shine toward it; 0 and the tiers draw no shine ── */
  const xy = `(s) => { const t = s.split(/,(?![^(]*\\))/).map((x) => x.trim()).filter((x) => !/inset/.test(x) && !/rgba\\(0, 0, 0, 0\\)/.test(x)); const n = t[0] ? t[0].replace(/(rgba?|color|oklab)\\([^)]*\\)/g, '').trim().split(/\\s+/).map(parseFloat) : [0, 0]; return [Math.sign(Math.round(n[0] * 100)), Math.sign(Math.round(n[1] * 100))]; }`;
  const lightAt = async (deg) => J(`P.set('lightAngle', ${deg}); await wait(200); const XY = ${xy}; const card = document.querySelector('#cards .dev');
    return { shadow: XY(cs(card, 'box-shadow')), shine: XY(cs(card, 'box-shadow', '::before')), blend: cs(card, 'mix-blend-mode', '::before') };`);
  const at315 = await lightAt(315), at90 = await lightAt(90), at0 = await lightAt(0);
  check('LIGHT ANGLE 315° (upper left): the shadow falls bottom-right, the shine sits upper-left, blended plus-lighter', at315.shadow.join() === '1,1' && at315.shine.join() === '-1,-1' && at315.blend === 'plus-lighter', JSON.stringify(at315));
  check('LIGHT ANGLE 90° (right): the shadow falls left, the shine sits right; 0° (above): straight down and straight up', at90.shadow[0] === -1 && at90.shine[0] === 1 && at0.shadow.join() === '0,1' && at0.shine.join() === '0,-1', JSON.stringify({ at90, at0 }));
  r = await J(`P.set('shine', 0); await wait(200); return { attr: document.documentElement.hasAttribute('data-shine'), content: cs('#cards .dev', 'content', '::before'), census: G.census().shine };`);
  check('SHINE 0: no shine layer at all (no html[data-shine], no ::before drawn, census 0)', !r.attr && r.content === 'none' && r.census === 0, JSON.stringify(r));
  r = await J(`P.set('shine', 0.7); await wait(150); const on = G.census().shine; P.set('quality', 'balanced'); await wait(200); const lite = { content: cs('#cards .dev', 'content', '::before'), census: G.census().shine };
    P.set('quality', 'light'); await wait(200); const flat = { content: cs('#cards .dev', 'content', '::before'), census: G.census().shine, shadow: cs('#cards .dev', 'box-shadow') }; P.set('quality', 'full'); await wait(150); return { on, lite, flat };`);
  check('the shine is drawn at FULL and not in the lite or flat tiers', r.on >= 16 && r.lite.content === 'none' && r.lite.census === 0 && r.flat.content === 'none' && r.flat.census === 0, JSON.stringify(r));

  /* ── SPACING: a real drag; the gap between two rack windows and the rack's inset follow; 0 is flush ── */
  const rackGeo = `(() => { const d = [...document.querySelectorAll('.mir-rack[data-side="right"] > .dev')].map((x) => x.getBoundingClientRect()); return { gap: Math.round(d[1].top - d[0].bottom), inset: Math.round(innerWidth - d[0].right), top: Math.round(d[0].top), radius: cs(document.querySelector('.mir-rack .dev'), 'border-top-left-radius') }; })()`;
  await J(`G.applyTheme('frost'); G.open('options:2'); await wait(500); return 0;`);
  const g0 = await J(`return ${rackGeo};`);
  const s = await J(`const k = document.querySelector('.mir-gui .gui-grp[data-group="windows"] .k-dial'), b = k.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2, h = document.elementFromPoint(x, y); return { x, y, hit: !!h && (h === k || k.contains(h)) };`);
  await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y, true);
  for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', s.x, s.y + i * 25, true); await sleep(16); }
  await mouse('mouseReleased', s.x, s.y + 300); await sleep(300);
  const g1 = await J(`return { spacing: P.get('spacing'), flush: document.documentElement.hasAttribute('data-flush'), ...${rackGeo} };`);
  await J(`P.set('spacing', 1); await wait(250); return 0;`);
  const g2 = await J(`return ${rackGeo};`);
  check('SPACING: a real drag (hit-tested) takes the rack to 0: windows flush to each other and to the screen edge, square', s.hit && g1.spacing === 0 && g1.flush && g1.gap === 0 && g1.inset === 0 && g1.radius === '0px', JSON.stringify({ hit: s.hit, g1 }));
  check('SPACING: FROST\'s default (gap 6, inset 6) and 100 % (16, 16) move the gap between two rack windows and the rack\'s inset', g0.gap === 6 && g0.inset === 6 && g2.gap === 16 && g2.inset === 16, JSON.stringify({ g0, g2 }));
  report.push(`SPACING rack: FROST ${JSON.stringify(g0)} · 0 % ${JSON.stringify(g1)} · 100 % ${JSON.stringify(g2)}`);
  await J(`G.close(); P.set('spacing', 0.4); return 0;`);

  /* ── the cost of each theme, and of the shine over sixteen cards ── */
  const costs = {};
  for (const id of ['frost', 'morph', 'classic', 'swift', 'aurora', 'neon']) {
    costs[id] = await J(`G.applyTheme('${id}'); for (let i = 0; i < 40 && !G.themeCost('${id}'); i++) await wait(100); return G.themeCost('${id}');`);
  }
  check('each theme is costed when applied (blur, shadow, shine, frame time)', Object.values(costs).every((c) => c && c.ms > 0), JSON.stringify(costs));
  check('SWIFT\'s claim is a number: no blur, no shine, fewer shadows than FROST', costs.swift.blur === 0 && costs.swift.shine === 0 && costs.swift.shadow < costs.frost.shadow, JSON.stringify({ swift: costs.swift, frost: costs.frost }));
  for (const [id, c] of Object.entries(costs)) report.push(`cost ${id.toUpperCase()}: ${c.blur} blur · ${c.shadow} shadow · ${c.shine} shine · ${c.ms.toFixed(2)} ms`);
  const frames = (n) => `await new Promise((res) => { const t = []; let last = 0; const f = (now) => { if (last) t.push(now - last); last = now; if (t.length < ${n}) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }).then(() => 0)`;
  const shineCost = await J(`G.applyTheme('morph'); await wait(300); const run = async () => { const t0 = performance.now(); let n = 0; const end = t0 + 1500;
      await new Promise((res) => { const f = () => { n++; document.documentElement.style.setProperty('--light-angle', (n * 7 % 360) + 'deg'); if (performance.now() < end) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      return +((performance.now() - t0) / n).toFixed(2); };
    const on = await run(); P.set('shine', 0); await wait(200); const off = await run(); P.set('shine', 0.7); document.documentElement.style.removeProperty('--light-angle'); P.apply({ now: true });
    return { cards: document.querySelectorAll('#cards .dev').length, on, off };`);
  report.push(`shine cost (MORPH, the light turning every frame, ${shineCost.cards} cards): ${shineCost.on} ms/frame with the shine, ${shineCost.off} without`);
  check('the shine\'s cost is measured over sixteen cards (frame time with it on and off while the light turns)', shineCost.cards === 16 && shineCost.on > 0 && shineCost.off > 0, JSON.stringify(shineCost));
  if (p.logs.length) check('no page errors', !p.logs.some((l) => l.startsWith('EXCEPTION')), p.logs.slice(0, 4).join(' | '));
} finally { await p.close(); }

/* ── both modes: FROST's ink, the cast's cap, MORPH's relief, the alpha.4 switch, and every tile's label contrast ── */
const COLOR = `const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, under) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1); };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };`;
p = await launch({ width: 1440, height: 900 });
try {
  await p.goto(URL_ + '?fresh', 900); await ready();
  let r = await J(`const L = () => ['--fg', '--fg-soft', '--ink-key', '--dim', '--ink-faint'].map((n) => getComputedStyle(document.body).getPropertyValue(n).trim());
    G.applyTheme('frost'); P.set('theme', 'dark'); await wait(200); const auto = L(), attr = document.body.dataset.text;
    P.set('text', 'light'); await wait(150); const white = L(); P.set('text', 'theme'); P.set('theme', 'light'); await wait(200); const light = L(); P.set('theme', 'dark'); await wait(150);
    return { auto, white, attr, light };`);
  check("FROST dark: TEXT AUTO computes the recipe's white ladder exactly (the same as TEXT LIGHT); FROST light: the black ladder", r.attr === 'light' && JSON.stringify(r.auto) === JSON.stringify(r.white) && r.auto[0] === 'hsl(0 0% 100%)' && r.light[0] === 'hsl(0 0% 0%)', JSON.stringify(r));
  r = await J(`${COLOR} G.applyTheme('frost'); await wait(200); const i = document.createElement('i'); i.style.cssText = 'position:fixed;left:0;top:0;width:4px;height:4px;box-shadow:var(--surface-shadow-menu)'; document.body.appendChild(i);
    const s = getComputedStyle(i).boxShadow; i.remove(); const alphas = s.split(/,(?![^(]*\\))/).filter((t) => !/inset/.test(t)).map((t) => rgba(t.match(/(rgba?|color)\\([^)]*\\)/)[0])[3]);
    return { max: Math.max(...alphas), s };`);
  check('FROST (SHADOW 200 %): the menu cast is no darker than BASINS\' own pane shadow at 200 % (alpha ≤ .40)', r.max <= 0.401, JSON.stringify(r));
  report.push(`FROST menu cast at 200 %: darkest layer alpha ${r.max.toFixed(2)} (cap .40, BASINS' pane at 200 %)`);
  const relief = async (mode) => J(`${COLOR} G.applyTheme('morph'); P.set('theme', '${mode}'); await wait(250); const v = (n) => rgba(getComputedStyle(document.body).getPropertyValue(n).trim());
    const pane = v('--solid-pane'), lit = v('--solid-lit'), shade = v('--solid-shade'); return { lit: +ratio(lit, pane).toFixed(2), shade: +ratio(pane, shade).toFixed(2), gain: getComputedStyle(document.body).getPropertyValue('--shine-gain').trim() };`);
  const rd = await relief('dark'), rl = await relief('light');
  check('MORPH: the relief reads as clearly on a dark pane as on a light one (lift × sink contrast, dark ≥ 90 % of light), and the dark pane shines more', rd.lit * rd.shade >= 0.9 * rl.lit * rl.shade && +rd.gain > +rl.gain, JSON.stringify({ dark: rd, light: rl }));
  report.push(`MORPH relief contrast (highlight · shade against the pane): dark ${rd.lit} · ${rd.shade}, light ${rl.lit} · ${rl.shade}; shine gain dark ${rd.gain}, light ${rl.gain}`);
  /* the alpha.4 switch, migrated */
  const mig = [];
  for (const [blob, want] of [[{ card: 'refractive', frost: 'always', blur: 11, veil: 0, saturation: 1.3, corners: 24, shadow: true }, 2], [{ card: 'tinted', blur: 20, shadow: true }, 1], [{ card: 'refractive', shadow: false }, 0]]) {
    await p.eval(`localStorage.setItem('mir.gui', ${JSON.stringify(JSON.stringify(blob))}); 0`); await p.goto(URL_, 700); await ready();
    mig.push([await p.eval('__T.P.get("shadow")'), want]);
  }
  check('an alpha.4 SHADOW switch is migrated: on → the matched theme\'s amount (FROST 200 %, else 100 %), off → 0', mig.every(([g, w]) => g === w), JSON.stringify(mig));
  /* every tile of the wall: the label ink against its pane, in both modes */
  const { THEMES } = await import('../mir/shell/themes.js');
  const tiles = [], bad = [];
  for (const mode of ['dark', 'light']) for (const t of THEMES) for (const o of t.tones) {
    await p.goto(`${BASE}/gallery/themes.html?scene&theme=${t.id}&tone=${o.id}&mode=${mode}`, 500); await ready();
    const c = JSON.parse(await p.eval(`(() => { ${COLOR} const ground = rgba(getComputedStyle(document.body).backgroundColor), mode = document.body.dataset.theme, card = document.body.dataset.card;
      const dev = document.querySelector('.mir-rack .dev'), pane = over(rgba(getComputedStyle(dev).backgroundColor), ground);
      const on = document.querySelector('.mir-rack .sw.on'), trg = document.querySelector('.mir-rack .trig'), lbl = document.querySelector('.mir-rack .k-lbl');
      const face = (n) => over(rgba(getComputedStyle(n).backgroundColor), pane), ink = (n) => over(rgba(getComputedStyle(n).color), face(n));
      const pairs = { on: ratio(ink(on), face(on)), trigger: ratio(ink(trg), face(trg)), label: ratio(over(rgba(getComputedStyle(lbl).color), pane), pane) };
      const inkLight = lum(rgba(getComputedStyle(on).color)) > .5;
      return JSON.stringify({ mode, card, min: +Math.min(...Object.values(pairs)).toFixed(2), pairs, agree: (mode === 'dark') === inkLight }); })()`));
    const glass = c.card === 'refractive';
    const ok = glass ? c.agree : c.min >= 4.5;
    tiles.push(`${t.name}·${o.name} ${mode}${c.mode !== mode ? '→' + c.mode : ''}: ${c.min}${glass ? ' (glass, over the ground)' : ''}`);
    if (!ok) bad.push(`${t.id}/${o.id} ${mode}: ${JSON.stringify(c)}`);
  }
  check('every tile of the wall, both modes: label ink ≥ 4.5 : 1 on SOLID and TINTED panes; on glass the ink agrees with the mode', bad.length === 0, bad.join(' ; '));
  report.push('label contrast per tile (min of the ON label, a trigger, a knob label): ' + tiles.join(' · '));
  /* the wall's own DARK / LIGHT control */
  const wall = [];
  for (const mode of ['dark', 'light']) {
    await p.goto(`${BASE}/gallery/themes.html`, 900); await ready();
    await p.eval(`__T.gui.prefs.set('theme', '${mode}'); 0`); await sleep(300);
    wall.push(JSON.parse(await p.eval(`(() => { ${COLOR} const b = [...document.querySelectorAll('.w-modes .seg-b')], ground = rgba(getComputedStyle(document.body).backgroundColor);
      return JSON.stringify(b.map((n) => { const f = over(rgba(getComputedStyle(n).backgroundColor), ground), i = rgba(getComputedStyle(n).color); return { label: n.textContent, ratio: +ratio(over(i, f), f).toFixed(2), agree: (document.body.dataset.theme === 'dark') === (lum(i) > .5) }; })); })()`)));
  }
  check('the wall\'s own DARK / LIGHT control: its ink agrees with the mode in both modes', wall.flat().every((x) => x.agree), JSON.stringify(wall));
  report.push('wall DARK/LIGHT control (over the plain ground): ' + JSON.stringify(wall));
} finally { await p.close(); }

/* ── the modulation plugin: the power seat, and a skin's focus ring ── */
p = await launch({ width: 1440, height: 900 });
try {
  await p.goto(BASE + '/gallery/modulation.html?fresh=1', 1200);
  for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await sleep(600);
  /* a key press first, so a programmatic focus is a keyboard focus (:focus-visible) */
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
  const r = JSON.parse(await p.eval(`(() => { const pow = document.querySelector('#modwin .m2workbar .modxport.mir-mod-power'), bar = pow && pow.closest('.m2workbar');
    if (!pow) return JSON.stringify({ none: true });
    const b = pow.getBoundingClientRect(), w = bar.getBoundingClientRect(), next = pow.nextElementSibling && pow.nextElementSibling.getBoundingClientRect();
    const h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    document.getElementById('modwin').style.setProperty('--state-focus', '3px dashed rgb(255, 0, 0)');
    pow.focus({ focusVisible: true }); const cs = getComputedStyle(pow);
    return JSON.stringify({ w: b.width, h: b.height, inside: b.top >= w.top - 0.5 && b.bottom <= w.bottom + 0.5, overlap: next ? next.left < b.right - 0.5 : false, hit: !!h && pow.contains(h),
      fv: pow.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor }); })()`));
  check('the modulation work bar\'s power seat is 44 × 44 (BASINS), inside its bar, not over its neighbour, hit-tested', r.w === 44 && r.h === 44 && r.inside && !r.overlap && r.hit, JSON.stringify(r));
  check('a skin\'s --state-focus (an outline) still draws the focus ring inside the modulation window', r.fv && r.outline === 'dashed 3px rgb(255, 0, 0)', JSON.stringify(r));
} finally { await p.close(); }

for (const l of results) console.log(l);
for (const l of report) console.log('  · ' + l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(failed ? `${failed} of ${results.length} theme checks FAILED` : `ALL ${results.length} theme checks passed`);
process.exit(failed ? 1 : 0);
