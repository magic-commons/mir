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

  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} keys-table checks FAILED` : `ALL ${results.length} MIR keys-table browser checks passed`);
process.exit(failed.length ? 1 : 0);
