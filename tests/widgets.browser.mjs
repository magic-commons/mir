/* widgets.browser.mjs — the kit's widgets under a real pointer and a real keyboard (tests/fixtures/widgets.html).
 * Run by tests/run.mjs with MIR_BASE set; standalone: MIR_BASE=http://127.0.0.1:8790 node tests/widgets.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8790';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  — ' + detail}`);
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

const p = await launch({ width: 800, height: 1400 });
try {
  await p.goto(BASE + '/tests/fixtures/widgets.html', 800);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  const ev = (x) => p.eval(x);
  const key = async (sel, code, keyName, mods = 0) => {
    await ev(`document.querySelector(${JSON.stringify(sel)}).focus()`);
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key: keyName, windowsVirtualKeyCode: { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Home: 36, End: 35, PageUp: 33, PageDown: 34, Delete: 46 }[keyName] || 0, modifiers: mods });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: keyName, modifiers: mods });
  };
  const center = async (sel) => JSON.parse(await ev(`JSON.stringify((() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2, b.x, b.width]; })())`));
  const drag = async (x0, y0, x1, y1, mods = 0) => {
    await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0, y: y0, modifiers: mods });
    await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x0, y: y0, button: 'left', clickCount: 1, modifiers: mods });
    const steps = 8; for (let i = 1; i <= steps; i++) await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps, button: 'left', buttons: 1, modifiers: mods });
    await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x1, y: y1, button: 'left', clickCount: 1, modifiers: mods });
    await sleep(400);   // past the 320 ms double-tap window, so the next press is not a reset
  };
  const kSel = '.k:nth-of-type(1)';

  /* ── the drag law ── */
  const law0 = JSON.parse(await ev('JSON.stringify(__T.kit.setKnobLaw())'));
  check('setKnobLaw() returns the shipped law', law0.travel === 220 && near(law0.fine, 900 / 220) && law0.keyFine === 0.25 && law0.faderFine === 5 && law0.touchTravel === 320, JSON.stringify(law0));
  const law1 = JSON.parse(await ev('JSON.stringify(__T.kit.setKnobLaw(__T.kit.setKnobLaw()))'));
  check('setKnobLaw(setKnobLaw()) is the identity', JSON.stringify(law1) === JSON.stringify(law0), JSON.stringify(law1));
  check('dragTravel: 220 plain, 900 with Shift, 320 under a finger', await ev(`__T.kit.dragTravel({}) === 220 && Math.abs(__T.kit.dragTravel({ shiftKey: true }) - 900) < 1e-9 && __T.kit.dragTravel({}, { touch: true }) === 320`));

  /* ── knob: pointer ── */
  let [cx, cy] = await center(kSel + ' .k-dial');
  await drag(cx, cy, cx, cy - 110);
  let v = await ev('__T.k.get()');
  check('knob: 110 px up is half the range (travel 220)', near(v, 0.5, 0.02), String(v));
  await ev('__T.k.set(0)');
  await drag(cx, cy, cx, cy - 90, 8 /* Shift */);
  v = await ev('__T.k.get()');
  check('knob: Shift drag is fine (90 px ≈ 0.1 of the range)', near(v, 0.1, 0.02), String(v));

  /* ── knob: keys ── */
  await ev('__T.k.set(0.5)');
  await key(kSel, 'ArrowUp', 'ArrowUp'); v = await ev('__T.k.get()');
  check('knob: ArrowUp is 1/100 of the range', near(v, 0.51), String(v));
  await key(kSel, 'ArrowUp', 'ArrowUp', 8); v = await ev('__T.k.get()');
  check('knob: Shift+ArrowUp is a quarter of that', near(v, 0.5125), String(v));
  await key(kSel, 'PageDown', 'PageDown'); v = await ev('__T.k.get()');
  check('knob: PageDown is ten steps', near(v, 0.4125), String(v));
  await key(kSel, 'End', 'End'); check('knob: End is the maximum', await ev('__T.k.get() === 1'));
  await key(kSel, 'Delete', 'Delete'); check('knob: Delete resets to the default', await ev('__T.k.get() === 0'));
  await ev('__T.kit.setKnobLaw({ fine: 8 })'); await ev('__T.k.set(0.5)');
  await key(kSel, 'ArrowUp', 'ArrowUp', 8); v = await ev('__T.k.get()');
  check('knob: setKnobLaw({ fine: 8 }) makes Shift+Arrow an eighth', near(v, 0.50125), String(v));
  await ev('__T.kit.setKnobLaw(' + JSON.stringify(law0) + ')');
  await ev('__T.kw.set(0)'); await key('.k:nth-of-type(2)', 'ArrowDown', 'ArrowDown'); v = await ev('__T.kw.get()');
  check('wrap knob: ArrowDown from 0 folds to 0.99', near(v, 0.99), String(v));
  await key('.k:nth-of-type(3)', 'ArrowUp', 'ArrowUp', 8); v = await ev('__T.ks.get()');
  check('stepped knob: Shift is ignored, one arrow is one step', v === 60, String(v));

  /* ── knob: modulation and aria ── */
  await ev('__T.k.set(0.25); __T.k.show(0.8)');
  const aria = JSON.parse(await ev(`JSON.stringify({ now: document.querySelector('${kSel}').getAttribute('aria-valuenow'), text: document.querySelector('${kSel}').getAttribute('aria-valuetext'), get: __T.k.get(), cls: document.querySelector('${kSel}').classList.contains('k-mod') })`));
  check('knob: show() paints over the base; get() is the base', aria.get === 0.25 && aria.cls, JSON.stringify(aria));
  check('knob: a painted knob announces the base in both aria values', aria.now === '0.25' && /^0\.25 · modulated$/.test(aria.text), JSON.stringify(aria));
  await ev('__T.k.set(0.25); __T.k.setDisabled(true)');
  await key(kSel, 'ArrowUp', 'ArrowUp');
  check('knob: disabled takes no keys and says so', await ev(`__T.k.get() === 0.25 && document.querySelector('${kSel}').getAttribute('aria-disabled') === 'true' && document.querySelector('${kSel}').tabIndex === -1`));
  await ev('__T.k.setDisabled(false)');

  /* ── fader ── */
  const [, fy, fx0, fw] = await center('.fd');
  await drag(fx0 + fw * 0.75, fy, fx0 + fw * 0.75, fy); v = await ev('__T.f.get()');
  check('fader: a press at 75 % sets 0.75', near(v, 0.75, 0.01), String(v));
  await ev('__T.f.set(0.5)'); await key('.fd', 'ArrowRight', 'ArrowRight', 8); v = await ev('__T.f.get()');
  check('fader: Shift+Arrow is a quarter step', near(v, 0.5025), String(v));
  await ev('__T.f.setBase(() => 0.3); __T.f.show(0.9)');
  const fa = JSON.parse(await ev(`JSON.stringify({ now: document.querySelector('.fd').getAttribute('aria-valuenow'), text: document.querySelector('.fd').getAttribute('aria-valuetext'), mod: document.querySelector('.fd').classList.contains('mod') })`));
  check('fader: setBase(fn) makes a driven fader announce its base', fa.now === '0.3' && /base · modulated/.test(fa.text) && fa.mod, JSON.stringify(fa));
  await ev('__T.f.setBase(null); __T.f.set(0.5); __T.f.setDisabled(true)');
  await drag(fx0 + fw * 0.9, fy, fx0 + fw * 0.9, fy); await key('.fd', 'ArrowRight', 'ArrowRight');
  check('fader: disabled ignores the pointer and the keys', await ev(`__T.f.get() === 0.5 && document.querySelector('.fd').getAttribute('aria-disabled') === 'true'`));
  await ev(`__T.f.setDefault(0.9); document.querySelector('.fd').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`);
  check('fader: disabled does not reset on a double-click, and looks disabled', await ev(`__T.f.get() === 0.5 && getComputedStyle(document.querySelector('.fd')).opacity < 1 && getComputedStyle(document.querySelector('.fd')).pointerEvents === 'none'`));
  await ev(`__T.f.setDefault(0.5)`);
  await ev('__T.f.setDisabled(false)');
  check('fader: log with min ≤ 0 warns and stays linear', await ev(`__T.warns.some((w) => /log needs 0 < min < max/.test(w))`));

  /* ── seg, switch, trigger ── */
  await ev(`__T.s.button('b').click()`); check('seg: a click selects and reports', await ev(`__T.s.get() === 'b' && __T.log.some((e) => e[0] === 's' && e[1] === 'b')`));
  await ev(`__T.w.root.click()`); check('switch: a click toggles and reports', await ev(`__T.w.get() === true && __T.log.some((e) => e[0] === 'w' && e[1] === true)`));
  await ev(`__T.t.root.click()`); check('trigger: a click fires', await ev(`__T.log.some((e) => e[0] === 't')`));

  /* ── window chrome ── */
  check('device: loadingMark:false builds no mark, and the default clones the wordmark’s', await ev(`!__T.d.root.querySelector('.dev-loading .mark') && !!__T.d2.root.querySelector('.dev-loading .mark')`));
  await ev(`__T.d.setLoading(true)`); check('device: setLoading marks the window busy and inert', await ev(`__T.d.root.classList.contains('loading') && __T.d.root.inert === true`));
  await ev(`__T.d.setLoading(false)`);
  await ev(`__T.d.foldBtn.click()`); check('device: fold folds', await ev(`__T.d.root.classList.contains('folded')`));
  await ev(`__T.d.foldBtn.click()`);
  check('window activity: a folded window is inactive, with the reason', await ev(`(() => { __T.d.foldBtn.click(); const s = __T.wa.state(__T.d); __T.d.foldBtn.click(); return s.active === false && s.reason === 'folded'; })()`));
  check('window activity: the hide class is the app’s to name', await ev(`(() => { document.body.classList.add('my-hidden'); const s = __T.wa.state(__T.d); document.body.classList.remove('my-hidden'); return s.reason === 'interface-hidden'; })()`));

  /* ── the CSS the kit builds for (1.4.0) ── */
  const css = JSON.parse(await ev(`JSON.stringify({ stat: getComputedStyle(document.querySelector('.dev-head > .dev-stat')).display, statNum: getComputedStyle(document.querySelector('.dev-stat')).fontVariantNumeric, fxl: getComputedStyle(document.querySelector('.fx-l')).display, info: getComputedStyle(document.querySelector('.native-info-button')).borderRadius, pm: getComputedStyle(document.querySelector('.plane-model')).height, tip: getComputedStyle(document.getElementById('controlHelp')).position })`));
  check('css: the header status is hidden in the header, tabular in the numbers', css.stat === 'none' && /tabular-nums/.test(css.statNum), JSON.stringify(css));
  check('css: the formula, the ⓘ button, the plane model and the hint are styled', css.fxl === 'block' && css.info === '50%' && css.pm === '150px' && css.tip === 'fixed', JSON.stringify(css));

  /* ── help ── */
  check('help: a title becomes data-help', await ev(`!!document.querySelector('.seg [data-help="the second mode"]') || !!document.querySelector('[data-help="the second mode"]')`));
  const [hx, hy] = await center('[data-help="the second mode"]');
  await p.mouse(hx, hy); await sleep(900);
  check('help: hovering shows the hint', await ev(`!document.getElementById('controlHelp').hidden && document.getElementById('controlHelp').textContent === 'the second mode'`));
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hx, y: hy, button: 'left', clickCount: 1 });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hx, y: hy, button: 'left', clickCount: 1 });
  check('help: a press closes the hint, and the press’s own focus does not reopen it', await ev(`document.getElementById('controlHelp').hidden`));
  await p.mouse(700, 1300); await sleep(100);
  await ev(`document.querySelector('[data-help="the second mode"]').previousElementSibling.focus()`);
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'Tab', key: 'Tab', windowsVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Tab', key: 'Tab' });
  await sleep(150);
  check('help: Tab onto a control still shows its hint', await ev(`document.activeElement.dataset.help === 'the second mode' && !document.getElementById('controlHelp').hidden`), await ev(`(document.activeElement.dataset.help || document.activeElement.className) + ' / hidden=' + document.getElementById('controlHelp').hidden`));
  await ev(`document.activeElement.blur()`);
  await p.mouse(700, 1300); await sleep(100);
  await ev(`__T.setHelpClasses({ hintsOff: 'quiet-please' }); document.body.classList.add('quiet-please')`);
  await p.mouse(hx, hy); await sleep(900);
  check('help: the hints-off class is the app’s to name', await ev(`document.getElementById('controlHelp').hidden`));
  await ev(`document.body.classList.remove('quiet-please'); __T.setHelpClasses({ hintsOff: 'control-hints-off' })`);
  await p.mouse(700, 1300);

  /* ── slider keys ── */
  await key('.sk', 'ArrowUp', 'ArrowUp'); check('slider keys: an arrow is 0.01', await ev('Math.abs(__T.skv - 0.51) < 1e-9'));
  await key('.sk', 'ArrowUp', 'ArrowUp', 8); check('slider keys: Shift is 0.001', await ev('Math.abs(__T.skv - 0.511) < 1e-9'));

  /* ── the accent follows what an app writes on <body> (1.4.0) ── */
  const acc = JSON.parse(await ev(`JSON.stringify((() => {
    const probe = document.createElement('i'); probe.style.cssText = 'color: var(--acc); background-color: var(--acc-soft); border-top: 1px solid var(--acc2)'; document.body.appendChild(probe);
    const read = () => { const c = getComputedStyle(probe); return [c.color, c.backgroundColor, c.borderTopColor]; };
    const before = read();
    document.body.style.setProperty('--hue-acc', '300'); document.body.style.setProperty('--hue-acc2', '120');
    const turned = read();
    document.body.dataset.theme = 'light'; const light = read();
    document.body.style.setProperty('--acc', 'rgb(1, 2, 3)'); const inline = read();
    document.body.style.removeProperty('--acc'); document.body.style.removeProperty('--hue-acc'); document.body.style.removeProperty('--hue-acc2'); document.body.dataset.theme = 'dark'; probe.remove();
    return { before, turned, light, inline };
  })())`));
  check('accent: the default is the house cyan (#78e1f0 to one level)', /rgb\(120, 22[45], 240\)/.test(acc.before[0]), acc.before[0]);
  check('accent: turning --hue-acc on <body> turns --acc and its soft tint', acc.turned[0] !== acc.before[0] && acc.turned[1] !== acc.before[1], JSON.stringify(acc.turned));
  check('accent: turning --hue-acc2 on <body> turns --acc2', acc.turned[2] !== acc.before[2], JSON.stringify(acc.turned));
  check('accent: light theme follows the hue too', acc.light[0] !== acc.turned[0] && acc.light[0] !== acc.before[0], JSON.stringify(acc.light));
  check('accent: an app’s own inline --acc wins, and its soft tint follows it', acc.inline[0] === 'rgb(1, 2, 3)' && /^color\(srgb 0\.0039\d* 0\.0078\d* 0\.0117\d* \/ 0\.16\)$/.test(acc.inline[1]), JSON.stringify(acc.inline));

  /* ── plane model ── */
  await p.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 1400, deviceScaleFactor: 2, mobile: false });
  await sleep(300); await ev('__T.pm.paint(true)');
  check('plane model: the backing store follows the device-pixel ratio', await ev(`document.querySelector('.plane-model').width === 800 && document.querySelector('.plane-model').height === 560`), await ev(`document.querySelector('.plane-model').width + '×' + document.querySelector('.plane-model').height`));
  const px = async () => ev(`(() => { const c = document.querySelector('.plane-model'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0; return h; })()`);
  const pxDark = await px(); await ev(`document.body.dataset.theme = 'light'`); await sleep(200); const pxLight = await px(); await ev(`document.body.dataset.theme = 'dark'`);
  check('plane model: a theme flip repaints it', pxDark !== pxLight);
  check('no page errors', !p.logs.some((l) => /EXCEPTION/.test(l)), p.logs.join(' | '));
} finally { await p.close(); }

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nPASS widgets: all ${results.length}`);
process.exit(failed ? 1 : 0);
