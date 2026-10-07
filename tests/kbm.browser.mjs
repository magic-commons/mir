/* kbm.browser.mjs — THE LIVE POINTER (core/kbm.js, 1.5.0 wave 21; Josh 2026-10-07: "I want it to behave exactly like my
 * linux desktop is for the menu and logo via the iPad's magic mousepad").  On gallery/gui.html (createGui installs the
 * layer; a kit window, the menubar, the GUI window):
 *   · a coarse primary pointer (Chromium's touch emulation: what an iPad reports even with a trackpad attached) boots
 *     in TOUCH; one mouse move → PRECISION at once, and a kit hover rule (the window chip's lift) applies although
 *     `(hover: hover)` is false; a touch → TOUCH at once and the hover does not stick on the tapped chip;
 *   · DENSE arms only after 600 ms of continuous precision, never during a drag, and a touch drops it at once;
 *   · the pref pins the mode (MOTION › POINTER in MIR OPTIONS writes it) and AUTO hands it back;
 *   · the menubar: under precision the wordmark's hover shows the bar and hovering another group switches the open
 *     list (the desktop); under a pinned TOUCH a hover opens nothing;
 *   · the pointer glow (fx/pointer-light.js) follows the mode, not the media query;
 *   · a desktop (fine pointer) boots in PRECISION and stays un-dense until a mouse is actually seen.
 *   MIR_BASE=http://127.0.0.1:8845 node tests/kbm.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';
const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8790';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
const cls = (p) => p.eval(`(() => { const c = document.documentElement.classList; return (c.contains('kbm-precision') ? 'P' : '') + (c.contains('kbm-touch') ? 'T' : '') + (c.contains('kbm-dense') ? 'D' : ''); })()`);
const ready = async (p) => { for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100); await sleep(400); };

const p = await launch({ width: 1180, height: 820 });
try {
  /* ── the iPad: a coarse primary pointer, touch points ── */
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto(BASE + '/gallery/gui.html', 2500);
  await ready(p);
  const media = JSON.parse(await p.eval(`JSON.stringify(Object.fromEntries(['(pointer: coarse)', '(hover: hover)', '(any-pointer: fine)', '(any-hover: hover)'].map((q) => [q, matchMedia(q).matches])))`));
  check('emulated iPad: the primary pointer is coarse and does not hover', media['(pointer: coarse)'] && !media['(hover: hover)'], JSON.stringify(media));
  check('boot: TOUCH (no pointer seen yet; the primary pointer decides)', (await cls(p)) === 'T', await cls(p));

  /* the chip under test: the SPECIMEN window's grip (a drag handle: a tap on it does nothing) */
  const chip = JSON.parse(await p.eval(`(() => { const c = document.querySelector('.mir-chip[data-kind="grip"]') || document.querySelector('.mir-chip'); c.id = c.id || 'kbm-chip';
    const r = c.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), id: c.id }); })()`));
  const lift = () => p.eval(`getComputedStyle(document.getElementById(${JSON.stringify(chip.id)}), '::before').transform`);
  const rest = await lift();
  await p.mouse(20, 20); await sleep(30);
  await p.mouse(chip.x, chip.y); await sleep(250);
  check('one mouse move → PRECISION at once', (await cls(p)).startsWith('P'), await cls(p));
  const hovered = await lift();
  check('a kit hover rule applies under a cursor although (hover: hover) is false (the window chip lifts)', hovered !== rest && hovered !== 'none', `rest ${rest} · hovered ${hovered}`);

  /* the pointer glow follows the mode (POINTER GLOW on by default) */
  const glowOn = await p.eval(`document.documentElement.hasAttribute('data-pointer-light')`);
  check('precision: the pointer glow is live', glowOn === true, String(glowOn));

  /* a finger on the same chip: TOUCH at once, and no sticky hover */
  const touch = (type, x, y) => p.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await touch('touchStart', chip.x, chip.y); await sleep(20);
  const duringTouch = await cls(p);
  await touch('touchEnd', chip.x, chip.y); await sleep(250);
  check('a touch → TOUCH at once (and DENSE dropped in the same turn)', duringTouch === 'T', duringTouch);
  const stuck = JSON.parse(await p.eval(`JSON.stringify({ hover: document.getElementById(${JSON.stringify(chip.id)}).matches(':hover'), t: getComputedStyle(document.getElementById(${JSON.stringify(chip.id)}), '::before').transform })`));
  check('after a tap the hover rule does not stick on the chip', stuck.t === rest, `:hover ${stuck.hover} · ${stuck.t} (rest ${rest})`);
  const glowOff = await p.eval(`document.documentElement.hasAttribute('data-pointer-light')`);
  check('touch: the pointer glow is off', glowOff === false, String(glowOff));

  /* DENSE: 600 ms of continuous precision, never during a drag */
  await p.mouse(300, 500); await sleep(300);
  const d300 = await cls(p);
  await sleep(600);
  const d900 = await cls(p);
  check('DENSE is not armed 300 ms into precision', d300 === 'P', d300);
  check('DENSE is armed after 600 ms of precision', d900 === 'PD', d900);
  await touch('touchStart', 600, 600); await sleep(20);
  const dTouch = await cls(p);
  await touch('touchEnd', 600, 600); await sleep(100);
  check('a touch takes DENSE away at once', dTouch === 'T', dTouch);
  await p.mouse(310, 510); await sleep(20);
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 310, y: 510, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 0; i < 9; i++) { await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 310 + i * 4, y: 510, button: 'left', buttons: 1 }); await sleep(100); }
  const dDrag = await cls(p);
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 346, y: 510, button: 'left', buttons: 0, clickCount: 1 });
  check('DENSE never arms while a pointer is down (900 ms of mouse drag)', dDrag === 'P', dDrag);
  await sleep(800);
  check('… and arms 600 ms after the release', (await cls(p)) === 'PD', await cls(p));

  /* the menubar under precision: the desktop's hover */
  const title = JSON.parse(await p.eval(`(() => { const r = document.getElementById('title').getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }); })()`));
  await p.mouse(title.x, title.y); await sleep(250);
  check('precision: hovering the wordmark shows the menubar', await p.eval(`!document.getElementById('menubar').hidden`));
  const fileAt = await p.click('#menubar .mb-btn[data-menu="FILE"]');
  check('precision: FILE opens its list', fileAt.hit && await p.eval(`!document.querySelector('#menubar .mb-btn[data-menu="FILE"]').nextElementSibling.hidden`), JSON.stringify(fileAt));
  const edit = JSON.parse(await p.eval(`(() => { const r = document.querySelector('#menubar .mb-btn[data-menu="EDIT"]').getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }); })()`));
  await p.mouse(edit.x, edit.y); await sleep(200);
  check('precision: hovering EDIT switches the open list to EDIT (the desktop menubar)', await p.eval(`!document.querySelector('#menubar .mb-btn[data-menu="EDIT"]').nextElementSibling.hidden && document.querySelector('#menubar .mb-btn[data-menu="FILE"]').nextElementSibling.hidden`));
  await p.eval(`__T.menubar.close()`); await p.mouse(600, 700); await sleep(600);

  /* the pref pins it; AUTO hands it back */
  await p.eval(`__MIR.kbm.setPref('touch'), true`);
  await p.mouse(chip.x, chip.y); await sleep(200);
  check('pref TOUCH: a mouse move leaves it TOUCH', (await cls(p)) === 'T', await cls(p));
  check('pref TOUCH: the chip does not lift under the cursor', (await lift()) === rest, await lift());
  check('pref TOUCH is kept as a device setting (mir.pointer)', (await p.eval(`localStorage.getItem('mir.pointer')`)) === 'touch');
  await p.mouse(600, 700); await sleep(100);
  await p.mouse(title.x, title.y); await sleep(300);
  check('pref TOUCH: hovering the wordmark opens nothing', await p.eval(`document.getElementById('menubar').hidden`));
  await p.mouse(600, 700); await sleep(100);
  await p.eval(`__MIR.kbm.setPref('precision'), true`);
  await touch('touchStart', 600, 600); await sleep(20);
  const pinnedP = await cls(p);
  await touch('touchEnd', 600, 600); await sleep(100);
  check('pref PRECISION: a touch leaves it PRECISION', pinnedP.startsWith('P'), pinnedP);
  await p.eval(`__MIR.kbm.setPref('auto'), true`);
  check('pref AUTO: the key is removed', (await p.eval(`localStorage.getItem('mir.pointer')`)) === null);
  check('pref AUTO: the last pointer decides again (a touch → TOUCH)', (await cls(p)) === 'T', await cls(p));

  /* the GUI row: MOTION › POINTER */
  await p.eval(`__T.gui.open('look'), true`); await sleep(500);
  const row = await p.eval(`(() => { const s = [...document.querySelectorAll('.segw')].find((w) => (w.querySelector('.k-lbl') || {}).textContent === 'POINTER'); if (!s) return null; s.id = 'kbm-row'; return [...s.querySelectorAll('.seg-b')].map((b) => b.textContent).join(' · '); })()`);
  check('MIR OPTIONS › MOTION has the POINTER segment', row === 'AUTO · TOUCH · PRECISION', String(row));
  await p.eval(`document.getElementById('kbm-row').scrollIntoView({ block: 'center' }), true`); await sleep(200);
  const hit = await p.click('#kbm-row .seg-b:nth-child(2)');
  check('pressing TOUCH there pins the pref', hit.hit && (await p.eval(`__MIR.kbm.pref()`)) === 'touch', JSON.stringify(hit) + ' pref ' + (await p.eval(`__MIR.kbm.pref()`)));
  await p.eval(`__MIR.kbm.setPref('auto'), true`); await sleep(50);
  check('… and the segment follows the layer back to AUTO', await p.eval(`document.querySelector('#kbm-row .seg-b:nth-child(1)').classList.contains('on') || document.querySelector('#kbm-row .seg-b:nth-child(1)').getAttribute('aria-checked') === 'true'`));
  check('the dump carries the input lines', /input mode/.test(await p.eval(`(async () => (await import('/mir/core/describe.js')).dumpLines().join('\\n'))()`)));
  check('no page errors (iPad)', !p.logs.some((l) => /EXCEPTION/.test(l)), p.logs.join(' | '));
} finally { await p.close(); }

/* ── the desktop: a fine primary pointer boots in PRECISION, un-dense until a mouse is SEEN ── */
const d = await launch({ width: 1280, height: 900 });
try {
  await d.goto(BASE + '/gallery/gui.html', 2500);
  await ready(d);
  /* headless Chromium may report no hover at all; the boot follows whatever the PRIMARY pointer says */
  const dm = JSON.parse(await d.eval(`JSON.stringify({ fine: matchMedia('(pointer: fine)').matches, hover: matchMedia('(hover: hover)').matches })`));
  const want = dm.fine && dm.hover ? 'P' : 'T';
  check('desktop boot: the primary pointer decides, and no DENSE (no mouse observed yet)', (await cls(d)) === want, `${await cls(d)} (media ${JSON.stringify(dm)})`);
  await sleep(700);
  check('desktop: still not DENSE with no mouse event (clause a: observed, not inferred)', (await cls(d)) === want, await cls(d));
  await d.mouse(400, 400); await sleep(800);
  check('desktop: DENSE after a real mouse and 600 ms', (await cls(d)) === 'PD', await cls(d));
  check('no page errors (desktop)', !d.logs.some((l) => /EXCEPTION/.test(l)), d.logs.join(' | '));
} finally { await d.close(); }

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nPASS kbm: all ${results.length}`);
process.exit(failed ? 1 : 0);
