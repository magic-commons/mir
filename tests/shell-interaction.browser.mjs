/* Regression: one pointer changes a control without moving its window; every menu opens on hover;
 * menu visibility and logo preferences keep an accessible, persistent menu bar. */
import { launch, sleep } from '../tools/cdp.mjs';
const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8941';
const p = await launch({ width: 1280, height: 900 });
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
const read = async (body) => JSON.parse(await p.eval(`(async () => { const G = __T.gui, P = G.prefs, menu = __T.menubar;
  const box = () => { const r = G.root.getBoundingClientRect(); return [r.left, r.top]; }; ${body} })().then(JSON.stringify)`));
const at = async (sel) => read(`const n = document.querySelector(${JSON.stringify(sel)}); n.scrollIntoView({ block: 'nearest' });
  const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`);
const move = (x, y, held = false) => p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: held ? 'left' : 'none', buttons: held ? 1 : 0 });
const drag = async (sel, dx, dy, disabled = false) => {
  const s = await at(sel);
  if (!disabled && !(await read(`const n = document.querySelector(${JSON.stringify(sel)}), h = document.elementFromPoint(${s.x}, ${s.y}); return h === n || n.contains(h);`))) throw new Error('Drag missed ' + sel);
  await move(s.x, s.y);
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...s, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 8; i++) { await move(s.x + dx * i / 8, s.y + dy * i / 8, true); await sleep(20); }
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: s.x + dx, y: s.y + dy, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(100);
};
const listOpen = (name) => read(`return !document.querySelector('.mb-btn[data-menu="${name}"]').nextElementSibling.hidden;`);
try {
  await p.goto(BASE + '/tests/fixtures/gui.html', 600);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await read(`P.set({ motion: 'off', quality: 'full' }); P.apply({ now: true }); return true;`);
  const logo = await at('#title'); await move(logo.x, logo.y); await sleep(80);
  check('the logo shows the bar immediately on hover', await read('return menu.isOpen;'));
  let s = await at('.mb-btn[data-menu="FILE"]'); await move(s.x, s.y); await sleep(80);
  check('the first menu opens on hover without a click', await listOpen('FILE'));
  const click = await p.click('.mb-btn[data-menu="FILE"]');
  check('a cursor click keeps the hovered menu open', click.hit && await listOpen('FILE'));
  s = await at('.mb-btn[data-menu="GUI"]'); await move(s.x, s.y); await sleep(80);
  check('hovering another group switches its dropdown', await listOpen('GUI') && !(await listOpen('FILE')));
  await p.click('.mb-btn[data-menu="GUI"] + .mb-list .mb-item');
  await sleep(200);

  for (const [name, sel, key] of [
    ['arc knob', '.gui-grp[data-group="accent"] .k-dial', 'accentA'],
    ['ordinary knob', '.gui-grp[data-group="accent"] .k:nth-child(3) .k-dial', 'vivid'],
  ]) {
    const before = await read(`return { box: box(), value: P.get('${key}') };`);
    await drag(sel, 0, -55);
    const after = await read(`return { box: box(), value: P.get('${key}') };`);
    check(`${name}: the value changes and MIR OPTIONS stays put`, before.value !== after.value && before.box.every((v, i) => Math.abs(v - after.box[i]) < 0.5), JSON.stringify({ before, after }));
  }
  await read(`G.close(); const { createWindow } = await import('/mir/window/window.js'), { arcKnob } = await import('/mir/controls/arc.js'), { laneSlider } = await import('/mir/controls/lane.js');
    const arc = arcKnob({ label: 'ARC', min: 0, max: 360, wrap: true, value: 30 }), lane = laneSlider({ label: 'LANE', min: 0, max: 1, value: 0.2 });
    arc.root.id = 'generic-arc'; lane.root.id = 'generic-lane'; lane.root.style.width = '180px';
    const C = createWindow({ id: 'control-drag', title: 'CONTROL DRAG', host: G.root.parentElement, chrome: 'close', emptyDrag: true,
      size: { w: 360, h: 180 }, body: (b) => { b.style.cssText = 'display:flex;align-items:center;gap:20px;padding:20px'; b.append(arc.root, lane.root); } });
    C.open(); window.__generic = { C, arc, lane }; return true;`);
  for (const [key, sel, dx, dy] of [['arc', '#generic-arc .k-dial', 0, -50], ['lane', '#generic-lane', 40, 0]]) {
    const before = await read(`const { C, ${key}: c } = __generic; const r = C.root.getBoundingClientRect(); return { box: [r.left, r.top], value: c.get() };`);
    await drag(sel, dx, dy);
    const after = await read(`const { C, ${key}: c } = __generic; const r = C.root.getBoundingClientRect(); return { box: [r.left, r.top], value: c.get() };`);
    check(`forwarded ${key} press cannot start an empty-glass drag in any window`, before.value !== after.value && before.box.every((v, i) => Math.abs(v - after.box[i]) < 0.5));
  }
  await read('__generic.C.destroy(); G.open("options"); return true;');
  await read(`const { laneSlider } = await import('/mir/controls/lane.js'); const lane = laneSlider({ label: 'TEST LANE', min: 0, max: 1, value: 0.2 });
    lane.root.id = 'test-lane'; lane.root.style.width = '180px'; const ln = document.createElement('div'); ln.className = 'gui-line'; ln.append(lane.root); document.querySelector('.gui-grp[data-group="accent"]').append(ln);   // 1.5.5: ACCENT's four dials share one line; the lane gets its own
    window.__lane = lane; return true;`);
  let before = await read('return { box: box(), value: __lane.get() };');
  await drag('#test-lane', 50, 0);
  let after = await read('return { box: box(), value: __lane.get() };');
  check('lane slider: the value changes and MIR OPTIONS stays put', before.value !== after.value && before.box.every((v, i) => Math.abs(v - after.box[i]) < 0.5), JSON.stringify({ before, after }));
  await read('__lane.setDisabled(true); return true;');
  before = await read('return { box: box(), value: __lane.get() };');
  await drag('#test-lane', 40, 0, true);                              // disabled controls let the pointer through to their parent
  after = await read('return { box: box(), value: __lane.get() };');
  check('a disabled slider stays inert and cannot drag its window', before.value === after.value && before.box.every((v, i) => Math.abs(v - after.box[i]) < 0.5));

  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  s = await at('.gui-grp[data-group="accent"] .k-dial');
  before = await read('return { box: box(), value: P.get("accentA") };');
  await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...s, id: 1 }] });
  for (let i = 1; i <= 8; i++) { await p.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: s.x, y: s.y - i * 7, id: 1 }] }); await sleep(20); }
  await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(100);
  after = await read('return { box: box(), value: P.get("accentA") };');
  check('a finger adjusts the arc without dragging the window', before.value !== after.value && before.box.every((v, i) => Math.abs(v - after.box[i]) < 0.5));
  await read('menu.close(); return true;');
  await move(logo.x, logo.y); await sleep(100);
  await read('window.__MIR.kbm.setPref("touch"); menu.close(); return true;');
  await move(800, 800); await move(logo.x, logo.y); await sleep(100);
  check('TOUCH mode does not open menus on mouse hover', !(await read('return menu.isOpen;')));
  await p.click('#title');
  await p.click('.mb-btn[data-menu="FILE"]');
  check('TOUCH mode still opens a menu by pressing it', await listOpen('FILE'));
  await read('window.__MIR.kbm.setPref("auto"); menu.close(); return true;');

  await read('G.open("options"); return true;'); await sleep(100);
  const always = await at('.gui-grp[data-group="menus"] .seg-b:last-child');
  await move(always.x, always.y); await p.click('.gui-grp[data-group="menus"] .seg-b:last-child');
  await sleep(150);
  await read('menu.close(); return true;'); await move(1100, 850); await sleep(450);
  check('MENU BAR · ALWAYS keeps the bar visible when dismissed', await read('return P.get("menuBar") === "always" && menu.isOpen && menu.items.length === 0;'));
  await p.click('.gui-grp[data-group="menus"] .sw'); await sleep(150);
  check('SHOW LOGO off hides the logo and moves the menus into its seat', await read(`const a = document.getElementById('title'), b = menu.bar;
    return !P.get('logo') && getComputedStyle(a).visibility === 'hidden' && menu.isOpen && Math.abs(a.getBoundingClientRect().left - b.getBoundingClientRect().left) < 1;`));
  await p.goto(BASE + '/tests/fixtures/gui.html', 600);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  check('menu and logo preferences survive a reload', await read('return P.get("menuBar") === "always" && !P.get("logo") && menu.isOpen;'));
  await read('P.applyPreset("classic"); P.apply({ now: true }); return true;'); await sleep(100);
  check('a theme change preserves menu and logo choices', await read('return P.get("menuBar") === "always" && !P.get("logo") && menu.isOpen;'));
  await read('P.set("menuBar", "hover"); P.apply({ now: true }); return true;'); await sleep(100);
  check('hiding the logo keeps even HOVER mode accessible', await read('menu.close(); return menu.isOpen;'));
  await p.key('Escape');
  check('Escape returns keyboard focus to a visible menu when the logo is hidden', await read('return document.activeElement.matches(".mb-btn") && menu.items.length === 0;'));
  await p.key('Enter');
  check('keyboard Enter opens the focused menu', await listOpen('FILE'));
  await read('P.set("logo", true); P.apply({ now: true }); return true;'); await sleep(100);
  check('showing the logo restores HOVER mode', await read('return getComputedStyle(document.getElementById("title")).visibility === "visible" && !menu.isOpen;'));
} finally { await p.close(); }
console.log(results.join('\n'));
const failed = results.filter((s) => s.startsWith('FAIL'));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
