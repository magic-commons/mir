/* gui.browser.mjs — the GUI window under a real browser (tests/fixtures/gui.html), with real input through CDP.
 * GUI opens from the menubar; every control on MIR OPTIONS is hit-tested with elementFromPoint, pressed or dragged
 * with the real mouse, and then (one assertion per option — the "no dead controls" proof) the hook it claims is
 * written AND the computed style of a specimen changes with it; a reload keeps the choices; THE HAND LAW (wave 19): the
 * head, the ×, the (i) and the tab row keep one rect on every tab, HELP inserts no row, the title bar drags, the (i)
 * opens MIR ABOUT as its own window, the × and Escape close; at 390×844 the tabs keep the head and nothing runs
 * sideways; the pointer glow follows the
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

  /* ── the LIGHT tab, then the WINDOWS tab ── */
  const tabB = (i) => `document.querySelectorAll('.mir-gui .gui-tabs .seg-b')[${i}]`;
  const shownGrp = (g) => `getComputedStyle(${grp(g)}).visibility === 'visible'`;
  const p2 = await click(tabB(1), 'tab LIGHT'); await sleep(200);
  r = await J(`return [G.tab, ${tabB(1)}.classList.contains('on'), ${shownGrp('light')}, ${shownGrp('theme')}];`);
  check('the LIGHT tab shows the light (a real click, hit-tested) and the LOOK groups stand down', p2 && r[0] === 'light' && r[1] && r[2] && !r[3], JSON.stringify(r));
  await option('LIGHT ANGLE (an arc)', () => dragUp(dial('light', 0), 'LIGHT ANGLE', 50), `[hv('--light-angle') !== '', document.documentElement.hasAttribute('data-cast')]`, [true, true], `cs('#pane', 'box-shadow')`);
  await option('SHADOW (0–200 %)', () => dragUp(dial('light', 1), 'SHADOW', 40), `[P.get('shadow') > 1, hv('--shadow-amount') === String(P.get('shadow'))]`, [true, true], `cs('#pane', 'box-shadow')`);
  await option('DISTANCE', () => dragUp(dial('light', 2), 'DISTANCE', 40), `hv('--shadow-dist') === P.get('shadowDist') + 'px'`, true, `cs('#pane', 'box-shadow')`);
  await option('SOFTNESS', () => dragUp(dial('light', 3), 'SOFTNESS', 40), `hv('--shadow-soft') === P.get('shadowSoft') + 'px'`, true, `cs('#pane', 'box-shadow')`);
  await option('SHINE', () => dragUp(dial('light', 4), 'SHINE', 40), `[document.documentElement.hasAttribute('data-shine'), cs('#strip .dev', 'mix-blend-mode', '::before')]`, [true, 'plus-lighter'], `cs('#strip .dev', 'box-shadow', '::before')`);
  await option('SHINE SOFT', () => dragUp(dial('light', 5), 'SHINE SOFT', 40), `hv('--shine-soft') === P.get('shineSoft') + 'px'`, true, `cs('#strip .dev', 'box-shadow', '::before')`);
  await J(`P.set('relief', 'default'); return 0;`); await sleep(150);   /* the relief back on (FLAT was proved on page 1), so RELIEF ANGLE has a raise to turn */
  await option('RELIEF ANGLE (an arc)', () => dragUp(dial('light', 6), 'RELIEF ANGLE', 50), `[P.get('reliefAngle') !== 315, hv('--relief-angle') === P.get('reliefAngle') + 'deg']`, [true, true], `cs('#knob .k-dial', 'box-shadow')`);
  await option('LINK (the relief takes LIGHT ANGLE)', () => click(swB('light', 0), 'LINK'), `[P.get('reliefLink'), hv('--relief-angle') === (P.get('lightAngle') === 315 ? '' : P.get('lightAngle') + 'deg')]`, [true, true], `cs('#knob .k-dial', 'box-shadow')`);
  await click(tabB(2), 'tab WINDOWS'); await sleep(200);
  await option('EDGE off', () => click(swB('windows', 1), 'EDGE'), `bv('--pane-edge')`, 'transparent', `cs('#pane', 'border-top-color')`);
  await option('SPACING tight', () => click(segB('windows', 0, 1), 'SPACING TIGHT'), `[P.get('spacing'), hv('--rack-gap'), hv('--pane-pad'), hv('--rail-gap')]`, ['tight', '3px', '6px', '2px'], `cs('#strip .dev > .dev-body', 'padding-top')`);
  await option('DROP SHADOW off', () => click(swB('windows', 0), 'DROP SHADOW'), `bv('--surface-shadow')`, '0 0 0 0 transparent', `cs('#pane', 'box-shadow')`);
  await option('DISCONNECTED on', () => click(swB('windows', 2), 'DISCONNECTED'), `document.body.classList.contains('disconnected')`, true, `cs('.dev', 'visibility')`);
  await click(tabB(0), 'tab LOOK'); await sleep(200);

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

  /* ── THE HAND LAW (wave 19): the head, the × and the tab row never move; only the body changes ── */
  await p.eval(`__T.gui.open('options')`); await sleep(500);
  const headAt = () => J(`const q = (n) => { const b = n.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10).join(); };
    const r = G.root.getBoundingClientRect(), b = G.window.body, over = [];
    if (r.right > innerWidth || r.bottom > innerHeight || r.left < 0 || r.top < 0) over.push('the window leaves the screen');
    if (b.scrollWidth > b.clientWidth + 0.5) over.push('the body runs sideways ' + b.scrollWidth + ' in ' + b.clientWidth);
    return { tab: G.tab, head: q(G.window.head), tabs: q(G.root.querySelector('.gui-tabbar')), x: q(G.window.head.querySelector('.mir-win-x')), i: q(G.window.head.querySelector('.gui-about-btn')), win: q(G.root), rail: !!document.querySelector('[data-mir-rail="gui"]'), over };`);
  const seenTabs = [await headAt()];
  for (const i of [1, 2, 0, 2, 0]) { await click(tabB(i), 'tab ' + i); await sleep(250); seenTabs.push(await headAt()); }
  const same = (k) => seenTabs.every((s) => s[k] === seenTabs[0][k]);
  check('the hand law: the head, the ×, the (i), the tab row and the window keep one rect on every tab (real clicks: LOOK → LIGHT → WINDOWS → LOOK → WINDOWS → LOOK)',
    seenTabs.map((s) => s.tab).join() === 'look,light,windows,look,windows,look' && ['head', 'tabs', 'x', 'i', 'win'].every(same), JSON.stringify(seenTabs.map((s) => [s.tab, s.head, s.tabs, s.win])));
  check('MIR OPTIONS has no chip rail, stays on the screen at 1280×720 and never runs sideways (the body scrolls down when it must)', seenTabs.every((s) => !s.rail && !s.over.length), JSON.stringify(seenTabs.flatMap((s) => s.over)));
  /* a switch inserts no row: HELP shows and hides its prose in the seat it always has */
  const rowsAt = () => J(`return [...G.root.querySelectorAll('.gui-grid[data-tab="look"] .gui-grp')].map((g) => { const b = g.getBoundingClientRect(); return g.dataset.group + ':' + Math.round(b.left) + ',' + Math.round(b.top) + ',' + Math.round(b.height); }).join(' ') + ' | ' + JSON.stringify(G.window.rect());`);
  const rows0 = await rowsAt(); const hOn = await click(swB('text', 1), 'HELP on'); await sleep(300); const rows1 = await rowsAt(); await click(swB('text', 1), 'HELP off'); await sleep(300); const rows2 = await rowsAt();
  check('a switch inserts no row: HELP on, then off, leaves every LOOK group and the window where they were', hOn && rows0 === rows1 && rows1 === rows2, rows0 === rows1 ? '' : rows0 + ' → ' + rows1);
  /* the whole title bar drags the window (the house grip gesture), and a tab after the drag leaves it where the hand put it */
  const w0 = await J(`return G.window.rect();`);
  const hs = await J(`const b = G.window.head.querySelector('.mir-win-title').getBoundingClientRect(), x = Math.round(b.left + 24), y = Math.round(b.top + b.height / 2), h = document.elementFromPoint(x, y); return { x, y, hit: !!h && G.window.head.contains(h) };`);
  await mouse('mouseMoved', hs.x, hs.y); await mouse('mousePressed', hs.x, hs.y);
  for (let i = 1; i <= 10; i++) { await mouse('mouseMoved', hs.x - i * 12, hs.y + i * 6); await sleep(16); }
  await mouse('mouseReleased', hs.x - 120, hs.y + 60); await sleep(200);
  const w1 = await J(`return G.window.rect();`);
  await click(tabB(1), 'tab LIGHT after the drag'); await sleep(250);
  const w2 = await J(`return G.window.rect();`); await click(tabB(0), 'tab LOOK'); await sleep(200);
  check('the whole title bar drags MIR OPTIONS: a press on its title moves it by the hand\'s (−120, +60), and a tab then leaves it there', hs.hit && Math.abs(w1.left - w0.left + 120) <= 1 && Math.abs(w1.top - w0.top - 60) <= 1 && JSON.stringify(w1) === JSON.stringify(w2), JSON.stringify({ w0, w1, w2 }));
  /* ABOUT is a circled (i) in the head: it opens the MIR ABOUT window, which has its own title bar and ×, and no rail */
  const iHit = await click(`G.window.tools.querySelector('.gui-about-btn')`, 'the (i)'); await sleep(600);
  r = await J(`const A = G.about, b = A.root.getBoundingClientRect(); return { open: A.isOpen(), page: G.page, glyph: G.window.tools.querySelector('.gui-about-btn').dataset.glyph, svg: !!G.window.tools.querySelector('.gui-about-btn svg.gly-info'),
    chrome: A.root.dataset.chrome, x: !!A.head.querySelector('.mir-win-x svg.gly-close'), rail: !!document.querySelector('[data-mir-rail="gui-about"]'), logo: !!A.root.querySelector('.gui-logo-art svg'),
    words: A.root.querySelector('.gui-ab-words').textContent.length, ver: A.root.querySelector('.gui-ab-ver').textContent, inside: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight, tabs: [...G.root.querySelectorAll('.gui-tabs .seg-b')].map((x) => x.textContent).join() };`);
  check('the circled (i) (glyph "info") opens MIR ABOUT as its own window: a title bar with the × glyph, no chip rail, the logo, the version and the words, on the screen; ABOUT is no tab',
    iHit && r.open && r.glyph === 'info' && r.svg && r.chrome === 'close' && r.x && !r.rail && r.logo && r.words > 40 && /^MIR /.test(r.ver) && r.inside && r.tabs === 'LOOK,LIGHT,WINDOWS', JSON.stringify(r));
  const xHit = await click(`G.about.head.querySelector('.mir-win-x')`, 'ABOUT ×'); await sleep(450);
  r = await J(`return { about: G.about.isOpen(), gui: G.window.isOpen(), hidden: G.about.root.hidden };`);
  check('the plain × closes the MIR ABOUT window, and only it', xHit && !r.about && r.gui && r.hidden, JSON.stringify(r));
  /* Escape closes: MIR OPTIONS with the focus in it; MIR ABOUT, on top, with the focus on nothing */
  await click(tabB(1), 'tab LIGHT (the focus in the window)'); await sleep(150);
  const esc = async () => { await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(450); };
  const focusIn = await J(`return G.root.contains(document.activeElement);`);
  await esc();
  const gEsc = await J(`return G.window.isOpen();`);
  await J(`G.open('about'); await wait(400); document.activeElement && document.activeElement.blur && document.activeElement.blur(); return 0;`);
  await esc();
  const aEsc = await J(`return G.about.isOpen();`);
  check('Escape closes MIR OPTIONS when the focus is in it, and MIR ABOUT when it is the top window and the focus is on nothing', focusIn && !gEsc && !aEsc, JSON.stringify({ focusIn, gEsc, aEsc }));
  r = await J(`G.open('options'); await wait(400); const t = G.tab; G.close(); return t;`);
  check('the tab is remembered: MIR OPTIONS opens again on the tab it last showed', r === 'light', r);
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
  await p.eval(`__T.gui.open('look')`); await sleep(500);
  const seen = [];
  for (let i = 0; i < 3; i++) {
    seen.push(await J(`const q = (n) => { const b = n.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round).join(); };
      const r = G.root.getBoundingClientRect(), b = G.window.body, over = [];
      if (r.right > innerWidth || r.bottom > innerHeight || r.left < 0 || r.top < 0) over.push('off screen');
      if (b.scrollWidth > b.clientWidth + 0.5) over.push('the body runs sideways ' + b.scrollWidth + ' in ' + b.clientWidth);
      for (const g of b.querySelectorAll('.gui-grid[data-tab="' + G.tab + '"] .gui-grp')) if (g.scrollWidth > g.clientWidth + 0.5) over.push(g.dataset.group + ' runs sideways');
      const tb = G.root.querySelector('.gui-tabbar'); if (tb.scrollWidth > tb.clientWidth + 0.5) over.push('the tab row overflows');
      return { tab: G.tab, head: q(G.window.head), tabs: q(tb), win: q(G.root), headH: G.window.head.getBoundingClientRect().height, over };`));
    await p.eval(`__T.gui.turn(1)`); await sleep(400);
  }
  check('at 390×844 the three tabs keep the head, the tab row and the window in place, on the screen, nothing wider than it (the body scrolls down), the title bar a finger tall',
    seen.map((s) => s.tab).join() === 'look,light,windows' && seen.every((s) => !s.over.length && s.head === seen[0].head && s.tabs === seen[0].tabs && s.win === seen[0].win && s.headH >= 44),
    seen.map((s) => s.tab + ' ' + s.win + (s.over.length ? ' ✗ ' + s.over.join(',') : '')).join(' · '));
  await p.eval(`__T.gui.open('about')`); await sleep(500);
  const ra = await J(`const b = G.about.root.getBoundingClientRect(); return { open: G.about.isOpen(), inside: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight, w: Math.round(b.width) };`);
  check('at 390×844 MIR ABOUT opens on the screen', ra.open && ra.inside, JSON.stringify(ra));
} finally { await p.close(); }

for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(failed ? `${failed} of ${results.length} GUI checks FAILED` : `ALL ${results.length} GUI checks passed`);
process.exit(failed ? 1 : 0);
