/* keys-table.browser.mjs — THE KEYS SHOWN BESIDE THE ACTION, FROM THE ONE TABLE (wave 19, lane K), through createApp() with
 * the history and the TIMELINE (tests/fixtures/keys-undo.html), real keys and a real pointer through CDP.
 *   1. no hard-coded H: hiding the interface (on whatever key the table gives 'hide') closes the knob's TIMELINE CLIP menu
 *      and the timeline's ⋯ menu; with hide moved off H, H closes nothing
 * Standalone: node tools/serve.mjs 8840 . --no-reset & MIR_BASE=http://127.0.0.1:8840 node tests/keys-table.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8840';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  await p.goto(BASE.replace(/\/$/, '') + '/tests/fixtures/keys-undo.html', 800);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await sleep(500);
  const ev = async (body) => JSON.parse(await p.eval(`(async () => { const U = __U, A = U.app, H = U.history; ${body} })().then(JSON.stringify)`));
  const hidden = () => p.eval(`document.body.classList.contains('ui-hidden')`);
  const pops = () => p.eval(`document.querySelectorAll('.tl-pop').length`);

  /* 1. H is the table's 'hide', nothing else's */
  const k = await ev(`const d = document.querySelector('.dev[data-id="scene"] .k-dial'); const b = d.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2), h = document.elementFromPoint(x, y); return { x, y, hit: !!h && d.contains(h) || h === d };`);
  check('hit-test: the knob', k.hit);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type, x: k.x, y: k.y, button: 'right', buttons: type === 'mousePressed' ? 2 : 0, clickCount: 1 });
  await sleep(150);
  check('a right click on a routable knob opens TIMELINE CLIP', (await pops()) === 1);
  await p.key('H'); await sleep(150);
  check('H (the table\'s hide) hides the interface and the knob\'s menu goes with it', (await hidden()) && (await pops()) === 0);
  await p.key('H'); await sleep(150);
  check('H again brings the interface back', !(await hidden()));
  await ev(`A.keys.bind('hide', 'KeyG'); A.timeline.open(); await new Promise((r) => setTimeout(r, 300)); return 1;`);
  const more = await p.click('.mir-timeline .tl-toolbar [data-mode="more"]');
  check('hit-test: the timeline\'s ⋯', more.hit, more.got);
  check('⋯ opens its menu', (await pops()) === 1);
  await p.eval(`document.querySelector('.tl-pop button').focus()`);
  await p.key('H'); await sleep(150);
  check('with hide moved to G, H closes nothing and hides nothing (no hard-coded H)', (await pops()) === 1 && !(await hidden()));
  await p.key('G'); await sleep(150);
  check('G, now the hide key, hides the interface and closes the ⋯ menu', (await hidden()) && (await pops()) === 0);
  await p.key('G'); await sleep(150);
  await ev(`A.keys.reset('hide'); return 1;`);

  /* 2. no key text typed by hand: the ⋯ rows, the timeline's tools, the notebook's × show the table's chord */
  const row = async (id) => { await p.click('.mir-timeline .tl-toolbar [data-mode="more"]'); const t = await p.eval(`(document.querySelector('.tl-pop [data-row="${id}"]') || {}).textContent || ''`); await p.key('Escape'); return t; };
  const z0 = await row('zoom-selection');
  check('⋯ ZOOM TO SELECTION shows the table\'s chord (Shift+5, its first), not a typed SHIFT+Z', /^ZOOM TO SELECTION · Shift\+5$/.test(z0), z0);
  check('⋯ DUPLICATE shows Ctrl+B', /· Ctrl\+B$/.test(await row('duplicate')));
  await ev(`A.keys.bind('timeline.zoom-selection', 'Shift+KeyX'); return 1;`);
  const z1 = await row('zoom-selection');
  check('rebound, the ⋯ row follows (Shift+X)', /· Shift\+X$/.test(z1), z1);
  await ev(`A.keys.reset('timeline.zoom-selection'); return 1;`);
  const tools = await ev(`return [...document.querySelectorAll('.mir-timeline .tl-tool')].map((b) => b.dataset.tool + '=' + (b.getAttribute('data-key-hint') || ''));`);
  check('the timeline\'s tools carry their table chord as a hint', tools.join(' ') === 'edit=P select=E scrub=Y slice=C', tools.join(' '));
  const nb = await ev(`const b = document.querySelector('#notebook .nb-close'); return { action: b.dataset.keyAction, hint: b.getAttribute('data-key-hint'), help: b.dataset.help || b.title };`);
  check('the notebook\'s × runs the table\'s "notebook" and shows its key (J), with no J typed in its words', nb.action === 'notebook' && nb.hint === 'J' && !/J/.test(nb.help), JSON.stringify(nb));

  /* 4. every kit window is a row (no key invented), so it can be bound: bound, its key opens it */
  const rowsNow = await ev(`return ['history', 'gui', 'gui-about'].map((id) => { const a = A.keys.get(id); return id + ':' + (a ? a.group + ':' + A.keys.chords(id).length : 'none'); });`);
  check('HISTORY, MIR OPTIONS and MIR ABOUT are rows of the table, with no key', rowsNow.join(' ') === 'history:WINDOW:0 gui:WINDOW:0 gui-about:WINDOW:0', rowsNow.join(' '));
  await ev(`A.keys.bind('history', 'Shift+KeyH'); A.keys.bind('gui', 'Shift+KeyO'); A.keys.bind('gui-about', 'Shift+KeyA'); document.activeElement && document.activeElement.blur && document.activeElement.blur(); return 1;`);
  await p.key('Shift+H'); await sleep(250);
  check('bound, HISTORY opens from its key', await p.eval(`__U.app.history.isOpen`) === true);
  await p.key('Shift+O'); await sleep(250);
  check('bound, MIR OPTIONS opens from its key', await p.eval(`__U.app.gui.window.isOpen()`) === true);
  await p.key('Shift+A'); await sleep(250);
  check('bound, MIR ABOUT opens from its key', await p.eval(`__U.app.gui.about.isOpen()`) === true);
  const menu = await ev(`return { win: A.keys.menuItem('history')[0], gui: A.keys.menuItem('gui')[0] };`);
  check('the menus show the bound key from the table', menu.win === 'HISTORY\tShift+H' && menu.gui === 'MIR OPTIONS\tShift+O', JSON.stringify(menu));
  await ev(`for (const id of ['history', 'gui', 'gui-about']) A.keys.reset(id); A.history.close(); A.gui.window.close(); A.gui.about.close(); return 1;`);

  /* 5. createApp installs the KEYBOARD window: a row itself, and it lists the app's rows (undo, the windows, the timeline's) */
  await ev(`A.keys.bind('keyboard', 'Shift+KeyK'); return 1;`);
  await p.key('Shift+K'); await sleep(300);
  const kbw = await ev(`const r = A.keyboard && A.keyboard.root; return { made: !!A.keyboard, open: !!A.keyboard && A.keyboard.isOpen(), rows: ['undo', 'history', 'gui', 'keyboard', 'timeline.copy'].map((id) => !!(r && r.querySelector('[data-id="' + id + '"]'))) };`);
  check('app.keyboard is the KEYBOARD window, opened from its row', kbw.made && kbw.open, JSON.stringify(kbw));
  check('it lists the table: undo, HISTORY, MIR OPTIONS, KEYBOARD, the timeline\'s COPY', kbw.rows.every(Boolean), JSON.stringify(kbw.rows));
  await ev(`A.keys.reset('keyboard'); A.keyboard.close(); return 1;`);

  /* 6. a panel takes the table's action id, never a bare key string (CAMERA too) */
  const cam = await ev(`const { createCameraPanel } = await import('/mir/panels/camera.js'); createCameraPanel({ rack: A.rack, canvas: document.getElementById('picture'), action: 'camera', key: 'C' });
    const s = A.rack.spec('camera'); return { action: s.action, key: s.key === undefined ? null : s.key };`);
  check('CAMERA hands its action id to the rack, and no bare key', cam.action === 'camera' && cam.key === null, JSON.stringify(cam));

  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} keys-table checks FAILED` : `ALL ${results.length} MIR keys-table browser checks passed`);
process.exit(failed.length ? 1 : 0);
