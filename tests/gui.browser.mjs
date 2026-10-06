/* gui.browser.mjs — the GUI window under a real browser (tests/fixtures/gui.html), with real input through CDP.
 * GUI opens from the menubar; every control on MIR OPTIONS is hit-tested with elementFromPoint, pressed or dragged
 * with the real mouse, and then (one assertion per option — the "no dead controls" proof) the hook it claims is
 * written AND the computed style of a specimen changes with it; a reload keeps the choices; the page turner shows
 * ABOUT and back; no panel scrolls at 1280×720 or at 390×844 (every page, every sheet); the pointer glow follows the
 * pointer on a `data-light` surface and writes nothing while the pointer is still; glow and parallax are off under
 * reduced motion, in the flat tier and on a coarse pointer.
 * Standalone: MIR_BASE=http://127.0.0.1:8797 node tests/gui.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8797';
const URL_ = BASE.replace(/\/$/, '') + '/tests/fixtures/gui.html';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

let p = await launch({ width: 1280, height: 720 });
const ready = async () => { for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100); await sleep(150); };
const J = async (expr) => JSON.parse(await p.eval(`(async () => { const T = __T, G = T.gui, P = G.prefs; const cs = (s, pr, ps) => getComputedStyle(document.querySelector(s), ps || null).getPropertyValue(pr).trim();
  const hv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), bv = (n) => getComputedStyle(document.body).getPropertyValue(n).trim();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms)); return JSON.stringify(await (async () => { ${expr} })()); })()`));
let held = false;                                                    // a move while the button is down carries buttons: 1
const mouse = (type, x, y) => { if (type === 'mousePressed') held = true; if (type === 'mouseReleased') held = false;
  return p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 }); };
/** where `sel` is drawn, and whether elementFromPoint at its centre finds it (or something inside it) */
const spot = (sel) => J(`const n = ${sel}; if (!n) return null; const b = n.getBoundingClientRect(), x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
  const h = document.elementFromPoint(x, y); return { x, y, hit: !!h && (h === n || n.contains(h)), w: b.width };`);
const misses = [];
async function click(sel, label) {
  const s = await spot(sel); if (!s) { misses.push(label + ': not found'); return false; }
  if (!s.hit) misses.push(label + ': elementFromPoint missed');
  await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(120);
  return s.hit;
}
async function dragUp(sel, label, dy = 70) {
  const s = await spot(sel); if (!s) { misses.push(label + ': not found'); return false; }
  if (!s.hit) misses.push(label + ': elementFromPoint missed');
  await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y);
  for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', s.x, s.y - Math.round((dy * i) / 8)); await sleep(16); }
  await mouse('mouseReleased', s.x, s.y - dy); await sleep(150);
  return s.hit;
}
const grp = (g) => `document.querySelector('.mir-gui .gui-grp[data-group="${g}"]')`;
const segB = (g, i, b) => `${grp(g)}.querySelectorAll('.seg')[${i}].querySelectorAll('.seg-b')[${b}]`;
const swB = (g, i) => `${grp(g)}.querySelectorAll('.sw')[${i}]`;
const dial = (g, i) => `${grp(g)}.querySelectorAll('.k-dial')[${i}]`;
/** one option: read the specimen, act with the real mouse, read again; the hook must say `want` and the specimen must move */
async function option(name, act, hookExpr, want, specExpr) {
  const before = await J(`return ${specExpr};`);
  const hit = await act();
  /* the condition, not a fixed 60 ms: read each frame until the hook says `want` (the look store's frame job has run), 3 s at most */
  let after;
  for (const end = Date.now() + 3000; ;) {
    after = await J(`await new Promise((r) => requestAnimationFrame(r)); return { hook: ${hookExpr}, spec: ${specExpr} };`);
    if (JSON.stringify(after.hook) === JSON.stringify(want) || Date.now() > end) break;
  }
  const ok = hit && JSON.stringify(after.hook) === JSON.stringify(want) && JSON.stringify(after.spec) !== JSON.stringify(before);
  check(`option ${name}: the hook says ${JSON.stringify(want)} and the specimen's computed style moved`, ok, `hook ${JSON.stringify(after.hook)} · ${JSON.stringify(before)} → ${JSON.stringify(after.spec)}`);
}

try {
  await p.goto(URL_, 900); await ready();

  /* ── GUI opens from the menubar ─────────────────────────────────────────────────────────────────────────── */
  let t = await spot(`document.getElementById('title')`);
  await mouse('mouseMoved', t.x, t.y); await sleep(250);
  const gHit = await click(`[...document.querySelectorAll('#menubar .mb-btn')].pop()`, 'menubar GUI');
  const item = await click(`document.querySelector('#menubar .mb-list:not([hidden]) button')`, 'GUI › MIR OPTIONS');
  await sleep(500);
  let r = await J(`return { open: G.window.isOpen(), page: G.page, shown: !G.root.hidden };`);
  check('GUI opens from the menubar: the last group, its first item, the window on MIR OPTIONS', gHit && item && r.open && r.shown && r.page === 'options', JSON.stringify(r));

  /* ── a new user is on FROST, Josh's recipe ── */
  r = await J(`return { preset: P.preset(), theme: document.body.dataset.theme, card: document.body.dataset.card, frost: document.body.classList.contains('frost'), blur: hv('--glass-blur'), radius: bv('--surface-radius'), filter: bv('--surface-filter') };`);
  check("a new user starts on FROST (Josh's recipe) on the dark theme", r.preset === 'frost' && r.theme === 'dark' && r.card === 'refractive' && r.frost && r.blur === '11px' && r.radius === '24px' && r.filter === 'blur(11px) saturate(1.30)', JSON.stringify(r));
  /* the walk below starts from CLASSIC, stepped to with the mouse (SKIN ›, ›: FROST → MORPH → CLASSIC), so each option moves something */
  const skinNext = `${grp('theme')}.querySelector('.gui-skin .mir-step-b[data-step="1"]')`, toneNext = `${grp('theme')}.querySelector('.gui-tone .mir-step-b[data-step="1"]')`;
  await option('SKIN › › CLASSIC (a vanilla theme)', async () => { const a = await click(skinNext, 'SKIN ›'); const b = await click(skinNext, 'SKIN ›'); return a && b; },
    `[P.preset(), document.body.dataset.card, ${grp('theme')}.querySelector('.gui-skin .mir-step-name').textContent]`, ['classic', 'tinted', 'CLASSIC'], `cs('#pane', 'background-color')`);
  r = await J(`return document.documentElement.dataset.skin;`);
  check('SKIN keeps the seam: <html data-skin="frost"> (the vanilla themes are settings, not a skin package)', r === 'frost', r);
  await option('TONE › (INK: the theme\'s colours only)', () => click(toneNext, 'TONE ›'), `[P.preset(), ${grp('theme')}.querySelector('.gui-tone .mir-step-name').textContent, P.get('tint')]`, ['classic', 'INK', 0.2], `cs('#knob .k-dial', 'background-color')`);
  await option('THEME light', () => click(segB('theme', 0, 0), 'THEME LIGHT'), `document.body.dataset.theme`, 'light', `bv('--fg')`);
  await click(segB('theme', 0, 1), 'THEME DARK');
  await option('ACCENT A', () => dragUp(dial('accent', 0), 'ACCENT A'), `P.get('accentA') !== 200`, true, `bv('--acc')`);
  await option('ACCENT B', () => dragUp(dial('accent', 1), 'ACCENT B'), `P.get('accentB') !== 300`, true, `bv('--acc2')`);
  await option('VIVID', () => dragUp(dial('accent', 2), 'VIVID'), `P.get('vivid') > 0.1`, true, `bv('--acc-glow')`);
  await option('PANE refractive', () => click(segB('material', 0, 1), 'REFRACTIVE'), `document.body.dataset.card`, 'refractive', `cs('#pane', 'background-color')`);
  await option('FROST always', () => click(segB('material', 1, 2), 'FROST ALWAYS'), `document.body.classList.contains('frost')`, true, `cs('#pane', 'backdrop-filter')`);
  await option('FACES glass', () => click(segB('controls', 1, 0), 'FACES GLASS'), `document.body.dataset.faces`, 'glass', `cs('#knob .k-dial', 'background-color')`);
  await click(segB('controls', 1, 1), 'FACES SOLID');
  await option('BLEND (solid toward glass)', () => dragUp(dial('controls', 0), 'BLEND', 40), `[document.body.dataset.faces, P.get('faceBlend') > 0]`, ['blend', true], `cs('#knob .k-dial', 'background-color')`);
  const bHit = await dragUp(dial('material', 0), 'BLUR', -60);
  r = await J(`return { blur: P.get('blur'), hook: hv('--glass-blur'), filter: cs('#pane', 'backdrop-filter') };`);
  check('option BLUR: dragging the dial writes --glass-blur on <html> and the pane\'s blur follows', bHit && r.blur !== 22 && r.hook === r.blur + 'px' && r.filter.includes('blur(' + r.blur + 'px)'), JSON.stringify(r));
  await option('VEIL', () => dragUp(dial('material', 1), 'VEIL'), `!!bv('--surface-veil')`, true, `cs('#pane', 'background-color')`);
  await option('SATURATION', () => dragUp(dial('material', 2), 'SATURATION'), `bv('--surface-filter').includes('saturate')`, true, `cs('#pane', 'backdrop-filter')`);
  await option('CORNERS', () => dragUp(dial('material', 3), 'CORNERS', 30), `!!bv('--surface-radius')`, true, `cs('.dev', 'border-top-left-radius')`);
  await click(segB('controls', 1, 0), 'FACES GLASS');              /* back to clear faces: the tint is read by the pane from here on */
  await click(segB('material', 0, 0), 'TINTED');
  await option('BRIGHT', () => dragUp(dial('material', 4), 'BRIGHT', 40), `!!bv('--glass-tint') && P.get('bright') > 0`, true, `cs('#pane', 'background-color')`);
  await J(`P.set('tint', 0); return 0;`); await sleep(80);
  r = await J(`return ${dial('material', 5)}.closest('.k').classList.contains('disabled');`);
  check('HUE stands down while TINT is 0 (it shows only through TINT)', r === true);
  await option('TINT', () => dragUp(dial('material', 6), 'TINT', 40), `P.get('tint') > 0`, true, `cs('#pane', 'background-color')`);
  await option('HUE', () => dragUp(dial('material', 5), 'HUE', 40), `bv('--glass-tint').split(' ')[0] === String(P.get('hue'))`, true, `cs('#pane', 'background-color')`);
  await option('PANE solid', () => click(segB('material', 0, 2), 'SOLID'), `[document.body.dataset.card, cs('#pane', 'backdrop-filter')]`, ['solid', 'none'], `cs('#pane', 'background-color')`);
  r = await J(`const c = cs('#pane', 'background-color'); return { c, a: c.startsWith('rgb(') };`);
  check('a SOLID pane is opaque (alpha 1) and never blurs', r.a, JSON.stringify(r));
  await click(segB('material', 0, 1), 'REFRACTIVE');
  await option('RELIEF flat', () => click(segB('controls', 0, 1), 'FLAT'), `hv('--relief-raise')`, '0 0 0 0 transparent', `cs('#knob .k-dial', 'box-shadow')`);
  await option('FROST still, while the picture moves', async () => { const h = await click(segB('material', 1, 1), 'FROST STILL'); await p.eval('__T.gui.moving(true)'); await sleep(80); return h; },
    `[document.body.classList.contains('frost'), document.body.classList.contains('frost-hold')]`, [true, true], `cs('#pane', 'backdrop-filter')`);
  await p.eval('__T.gui.moving(false)');
  await option('MOTION off', () => click(segB('motion', 0, 3), 'MOTION OFF'), `document.documentElement.dataset.motion`, 'off', `hv('--motion-ui')`);
  await click(segB('motion', 0, 1), 'MOTION FULL'); await sleep(80);
  await option('POINTER GLOW off', () => click(swB('motion', 0), 'POINTER GLOW'), `document.documentElement.hasAttribute('data-pointer-light')`, false, `cs('#lit', 'content', '::after')`);
  await option('PARALLAX off', async () => { const s = await spot(`document.getElementById('deep')`); await mouse('mouseMoved', s.x - 30, s.y - 30); await sleep(400); return click(swB('motion', 1), 'PARALLAX'); },
    `document.documentElement.hasAttribute('data-parallax-live')`, false, `cs('#layer', 'translate')`);
  /* DROP GUIDES: a real grip drag toward the top edge, cancelled with Escape; the guide shows only while the switch is on */
  const guideDuring = async () => {
    const g = await spot(`__T.D.rail.grip`); if (!g.hit) misses.push('DOCK grip: elementFromPoint missed');
    await mouse('mouseMoved', g.x, g.y); await mouse('mousePressed', g.x, g.y);
    for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', g.x - i * 10, g.y - i * 2); await sleep(20); }
    await sleep(80);
    const n = await J(`return document.querySelectorAll('.mir-prox:is([data-prox="near"], [data-prox="capture"])').length;`);
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await mouse('mouseReleased', g.x - 80, g.y - 16); await sleep(150);
    return n;
  };
  const onCount = await guideDuring();
  const dHit = await click(swB('motion', 2), 'DROP GUIDES');
  const offCount = await guideDuring();
  r = await J(`return P.get('dropGuides');`);
  check('option DROP GUIDES off: the window\'s dock guide is drawn while dragging with it on, and not with it off', dHit && r === false && onCount > 0 && offCount === 0, `on ${onCount} · off ${offCount}`);
  /* HINTS: hover the hinted control for longer than the hint delay */
  const hintShown = async () => { const s = await spot(`document.getElementById('hinted')`); await mouse('mouseMoved', s.x - 3, s.y); await mouse('mouseMoved', s.x, s.y); await sleep(900);
    const v = await J(`const h = document.getElementById('controlHelp'); return !!h && !h.hidden && getComputedStyle(h).display !== 'none';`); await mouse('mouseMoved', 640, 30); await sleep(200); return v; };
  const hintOn = await hintShown();
  const hHit = await click(swB('text', 0), 'HINTS');
  const hintOff = await hintShown();
  r = await J(`return document.body.classList.contains('control-hints-off');`);
  check('option HINTS off: body.control-hints-off, and a hovered control\'s hint no longer shows', hHit && r && hintOn && !hintOff, `before ${hintOn} · after ${hintOff}`);
  /* HELP is off for a new user (BASINS NEW_USER): the click turns the ⓘ panels ON (the hook says false), the next puts them away again */
  await option('HELP on', () => click(swB('text', 1), 'HELP'), `document.body.classList.contains('window-info-off')`, false, `cs('.native-info', 'display')`);
  await click(swB('text', 1), 'HELP off again');
  await option('INK dark (black text)', () => click(segB('text', 0, 2), 'INK DARK'), `document.body.dataset.text`, 'dark', `bv('--fg')`);
  await option('INK auto (under glass in dark: the white ladder)', () => click(segB('text', 0, 0), 'INK AUTO'), `document.body.dataset.text`, 'light', `bv('--fg')`);
  await option('QUALITY balanced', () => click(segB('quality', 0, 1), 'BALANCED'), `document.documentElement.dataset.uiTier`, 'lite', `cs('#pane', 'backdrop-filter')`);
  await option('QUALITY light', () => click(segB('quality', 0, 2), 'LIGHT'), `document.documentElement.dataset.uiTier`, 'flat', `cs('#knob .k-dial', 'transition-duration')`);
  await click(segB('quality', 0, 0), 'FULL');
  r = await J(`await wait(900); return { blur: ${grp('quality')}.querySelectorAll('.ro-val')[0].textContent, frame: ${grp('quality')}.querySelectorAll('.ro-val')[2].textContent };`);
  check('QUALITY shows what the look costs: blurred surfaces and a measured frame time', /^\d+$/.test(r.blur) && /ms$/.test(r.frame), JSON.stringify(r));

  /* ── MIR OPTIONS 2: the light, the windows ── */
  const pageNext = `document.querySelector('.mir-gui .gui-turner .mir-step-b[data-step="1"]')`;
  const p2 = await click(pageNext, 'turner › (OPTIONS 2)'); await sleep(400);
  r = await J(`return [G.page, G.root.querySelector('.gui-turner .mir-step-name').textContent, !!${grp('light')}.getClientRects().length];`);
  check('the page turner shows MIR OPTIONS 2 (the light and the windows)', p2 && r[0] === 'options' && r[1] === 'MIR OPTIONS 2' && r[2], JSON.stringify(r));
  await option('LIGHT ANGLE (an arc)', () => dragUp(dial('light', 0), 'LIGHT ANGLE', 50), `[hv('--light-angle') !== '', document.documentElement.hasAttribute('data-cast')]`, [true, true], `cs('#pane', 'box-shadow')`);
  await option('SHADOW (0–200 %)', () => dragUp(dial('light', 1), 'SHADOW', 40), `[P.get('shadow') > 1, hv('--shadow-amount') === String(P.get('shadow'))]`, [true, true], `cs('#pane', 'box-shadow')`);
  await option('DISTANCE', () => dragUp(dial('light', 2), 'DISTANCE', 40), `hv('--shadow-dist') === P.get('shadowDist') + 'px'`, true, `cs('#pane', 'box-shadow')`);
  await option('SOFTNESS', () => dragUp(dial('light', 3), 'SOFTNESS', 40), `hv('--shadow-soft') === P.get('shadowSoft') + 'px'`, true, `cs('#pane', 'box-shadow')`);
  await option('SHINE', () => dragUp(dial('light', 4), 'SHINE', 40), `[document.documentElement.hasAttribute('data-shine'), cs('#strip .dev', 'mix-blend-mode', '::before')]`, [true, 'plus-lighter'], `cs('#strip .dev', 'box-shadow', '::before')`);
  await option('SHINE SOFT', () => dragUp(dial('light', 5), 'SHINE SOFT', 40), `hv('--shine-soft') === P.get('shineSoft') + 'px'`, true, `cs('#strip .dev', 'box-shadow', '::before')`);
  await J(`P.set('relief', 'default'); return 0;`); await sleep(150);   /* the relief back on (FLAT was proved on page 1), so RELIEF ANGLE has a raise to turn */
  await option('RELIEF ANGLE (an arc)', () => dragUp(dial('light', 6), 'RELIEF ANGLE', 50), `[P.get('reliefAngle') !== 315, hv('--relief-angle') === P.get('reliefAngle') + 'deg']`, [true, true], `cs('#knob .k-dial', 'box-shadow')`);
  await option('LINK (the relief takes LIGHT ANGLE)', () => click(swB('light', 0), 'LINK'), `[P.get('reliefLink'), hv('--relief-angle') === (P.get('lightAngle') === 315 ? '' : P.get('lightAngle') + 'deg')]`, [true, true], `cs('#knob .k-dial', 'box-shadow')`);
  await option('EDGE off', () => click(swB('windows', 1), 'EDGE'), `bv('--pane-edge')`, 'transparent', `cs('#pane', 'border-top-color')`);
  await option('SPACING tight', () => click(segB('windows', 0, 1), 'SPACING TIGHT'), `[P.get('spacing'), hv('--rack-gap'), hv('--pane-pad'), hv('--rail-gap')]`, ['tight', '3px', '6px', '2px'], `cs('#strip .dev > .dev-body', 'padding-top')`);
  await option('DROP SHADOW off', () => click(swB('windows', 0), 'DROP SHADOW'), `bv('--surface-shadow')`, '0 0 0 0 transparent', `cs('#pane', 'box-shadow')`);
  await option('DISCONNECTED on', () => click(swB('windows', 2), 'DISCONNECTED'), `document.body.classList.contains('disconnected')`, true, `cs('.dev', 'visibility')`);
  await click(pageNext, 'turner › (ABOUT)'); await sleep(300); await click(pageNext, 'turner › (OPTIONS 1)'); await sleep(300);

  /* ── SKIN: the sets, and CUSTOM ── */
  r = await J(`return { preset: P.preset(), name: ${grp('theme')}.querySelector('.gui-skin .mir-step-name').textContent };`);
  check('SKIN: after all that the options match no theme, and the stepper says CUSTOM', r.preset === 'custom' && r.name === 'CUSTOM', JSON.stringify(r));
  await option('SKIN › FROST (from CUSTOM, the first theme)', () => click(skinNext, 'SKIN › FROST'), `[P.preset(), document.body.dataset.card, document.body.classList.contains('frost'), document.body.classList.contains('disconnected'), document.body.style.getPropertyValue('--glass-tint')]`, ['frost', 'refractive', true, false, '214 20.8% 13%'], `[cs('.dev', 'border-top-left-radius'), cs('#pane', 'backdrop-filter')]`);
  r = await J(`await wait(900); return [${grp('theme')}.querySelector('.gui-skin .mir-step-name').textContent, ${grp('theme')}.querySelector('.gui-tone .mir-step-name').textContent, ${grp('theme')}.querySelector('.gui-theme-cost').textContent, G.themeCost('frost')];`);
  check('a theme that matches names itself and its tone, and shows what it cost when applied', r[0] === 'FROST' && r[1] === 'CLEAR' && /BLUR .* ms$/.test(r[2]) && r[3] && r[3].ms > 0, JSON.stringify(r));

  /* ── a reload keeps the choices ── */
  await click(segB('theme', 0, 0), 'THEME LIGHT');
  await p.goto(URL_, 900); await ready();
  r = await J(`return { preset: P.preset(), tone: ${grp('theme')}.querySelector('.gui-tone .mir-step-name').textContent, theme: document.body.dataset.theme, card: document.body.dataset.card, frost: document.body.classList.contains('frost'), guides: P.get('dropGuides'), hints: document.body.classList.contains('control-hints-off') };`);
  check('a reload keeps the choices, the theme and its tone (one localStorage key, applied before the first paint)', r.preset === 'frost' && r.tone === 'CLEAR' && r.theme === 'light' && r.card === 'refractive' && r.frost && r.guides === false && r.hints, JSON.stringify(r));

  /* ── the page turner, and nothing scrolls ── */
  await p.eval(`__T.gui.open('options')`); await sleep(500);
  const overflow = async () => J(`const over = []; const all = [G.window.body, ...G.window.body.querySelectorAll('.mir-win-panel:not([hidden]), .gui-grp, .gui-page')];
    for (const n of all) { if (!n.getClientRects().length) continue; if (n.scrollHeight > n.clientHeight + 0.5 || n.scrollWidth > n.clientWidth + 0.5) over.push((n.className || n.tagName) + ' ' + n.scrollWidth + '×' + n.scrollHeight + ' in ' + n.clientWidth + '×' + n.clientHeight); }
    const r = G.root.getBoundingClientRect(); if (r.right > innerWidth || r.bottom > innerHeight || r.left < 0 || r.top < 0) over.push('the window leaves the screen');
    return { page: G.page, name: G.root.querySelector('.gui-turner .mir-step-name').textContent, over };`);
  const pages1280 = [await overflow()];
  const next = `document.querySelector('.mir-gui .gui-turner .mir-step-b[data-step="1"]')`, prev = `document.querySelector('.mir-gui .gui-turner .mir-step-b[data-step="-1"]')`;
  const tHit = await click(next, 'turner ›'); await sleep(400);
  pages1280.push(await overflow());
  await click(next, 'turner ›'); await sleep(400);
  pages1280.push(await overflow());
  const back = await click(prev, 'turner ‹'); await sleep(400); await click(prev, 'turner ‹'); await sleep(400);
  r = await J(`return G.root.querySelector('.gui-turner .mir-step-name').textContent;`);
  check('the page turner: › MIR OPTIONS 2, › MIR ABOUT, ‹ ‹ back to MIR OPTIONS 1 (real clicks, hit-tested)', tHit && back && pages1280.map((x) => x.name).join() === 'MIR OPTIONS 1,MIR OPTIONS 2,MIR ABOUT' && r === 'MIR OPTIONS 1', pages1280.map((x) => x.name).join(' → ') + ' → ' + r);
  check('nothing scrolls at 1280×720: every panel, group and page fits (scrollHeight ≤ clientHeight)', pages1280.every((x) => !x.over.length), JSON.stringify(pages1280.flatMap((x) => x.over)));
  /* ── the pointer glow follows the pointer, and writes nothing when the pointer is still ── */
  await p.eval(`__T.gui.close(); __T.gui.prefs.set({ glow: true, parallax: true, motion: 'auto', quality: 'full' }); 0`); await sleep(500);
  const L = await spot(`document.getElementById('lit')`);
  await mouse('mouseMoved', L.x - 20, L.y - 20); await sleep(120);
  const a = await J(`return { x: cs('#lit', '--light-x'), lit: document.getElementById('lit').hasAttribute('data-lit') };`);
  await mouse('mouseMoved', L.x + 25, L.y + 15); await sleep(120);
  const b = await J(`return { x: cs('#lit', '--light-x'), paint: cs('#lit', 'background-image', '::after') };`);
  await J(`T.perf.reset(); return 0;`); await sleep(600);
  const still = await J(`return T.perf.snapshot();`);
  check('the glow follows the pointer on a data-light surface (its place moves with the hand)', a.lit && a.x && b.x && a.x !== b.x && b.paint.includes('radial-gradient'), `${a.x} → ${b.x}`);
  check('a still pointer costs nothing: no write, no read, no frame', still.writes === 0 && still.reads === 0 && still.frames === 0, JSON.stringify(still));

  /* ── off rules: reduced motion, the flat tier ── */
  const fxState = () => J(`return [document.documentElement.hasAttribute('data-pointer-light'), document.documentElement.hasAttribute('data-parallax-live'), G.light.live, G.parallax.live];`);
  const onState = await fxState();
  await p.eval(`__T.gui.prefs.set('motion', 'reduced'); 0`); await sleep(150);
  const reduced = await fxState();
  await p.eval(`__T.gui.prefs.set({ motion: 'auto', quality: 'light' }); 0`); await sleep(150);
  const flat = await fxState();
  await p.eval(`__T.gui.prefs.set('quality', 'full'); 0`); await sleep(150);
  check('glow and parallax are live at FULL with motion full', onState.every(Boolean), JSON.stringify(onState));
  check('glow and parallax are off (no listener, nothing drawn) under data-motion reduced', reduced.every((v) => !v), JSON.stringify(reduced));
  check('glow and parallax are off in the flat tier (QUALITY LIGHT)', flat.every((v) => !v), JSON.stringify(flat));
  check('every control was found where it is drawn (elementFromPoint)', misses.length === 0, misses.join('; '));
  if (p.logs.length) check('no page errors', !p.logs.some((l) => l.startsWith('EXCEPTION')), p.logs.slice(0, 4).join(' | '));
} finally { await p.close(); }

/* ── a phone: coarse pointer, 390 × 844 ── */
p = await launch({ width: 390, height: 844 });
try {
  await p.phone(390, 844);
  await p.goto(URL_ + '?phone', 900); await ready();
  const coarse = await J(`return { coarse: matchMedia('(pointer: coarse)').matches, fx: [document.documentElement.hasAttribute('data-pointer-light'), document.documentElement.hasAttribute('data-parallax-live')], glow: P.get('glow') };`);
  check('glow and parallax are off on a coarse pointer, with their switches on', coarse.coarse && coarse.glow && coarse.fx.every((v) => !v), JSON.stringify(coarse));
  await p.eval(`__T.gui.open('options')`); await sleep(500);
  const seen = [];
  for (let i = 0; i < 7; i++) {
    seen.push(await J(`const over = []; for (const n of [G.window.body, ...G.window.body.querySelectorAll('.mir-win-panel:not([hidden]), .gui-grp, .gui-page')]) { if (!n.getClientRects().length) continue; if (n.scrollHeight > n.clientHeight + 0.5 || n.scrollWidth > n.clientWidth + 0.5) over.push(n.className + ' ' + n.scrollWidth + '×' + n.scrollHeight + ' in ' + n.clientWidth + '×' + n.clientHeight); }
      const r = G.root.getBoundingClientRect(); if (r.right > innerWidth || r.bottom > innerHeight) over.push('off screen'); return { name: G.root.querySelector('.gui-turner .mir-step-name').textContent, over };`));
    await p.eval(`__T.gui.turn(1)`); await sleep(400);
  }
  check('at 390×844 the OPTIONS groups page sideways (5 sheets, then ABOUT) and nothing scrolls on any of them', seen.slice(0, 6).map((s) => s.name).join() === 'MIR OPTIONS 1/5,MIR OPTIONS 2/5,MIR OPTIONS 3/5,MIR OPTIONS 4/5,MIR OPTIONS 5/5,MIR ABOUT' && seen.every((s) => !s.over.length),
    seen.map((s) => s.name + (s.over.length ? ' ✗ ' + s.over.join(',') : '')).join(' · '));
} finally { await p.close(); }

for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(failed ? `${failed} of ${results.length} GUI checks FAILED` : `ALL ${results.length} GUI checks passed`);
process.exit(failed ? 1 : 0);
