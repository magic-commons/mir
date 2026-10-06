/* history-window.browser.mjs — THE HISTORY WINDOW in a real page (tests/fixtures/history-window.html), real input through CDP.
 * Proves: a knob drag makes ONE row named CONTROL · WINDOW (read off the DOM: aria-label, data-mir-window) · a click on an
 * older row returns the value (and the click is hit-tested) · ↶ and ↷ are the same travel · the future is dimmed · the
 * count and CLEAR are in the foot · a MODULATION change is a row and undo takes the source back out of the rack.
 * Standalone: node tools/serve.mjs 8854 & MIR_BASE=http://127.0.0.1:8854 node tests/history-window.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8854';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1100, height: 760 });
try {
  await p.goto(BASE.replace(/\/$/, '') + '/tests/fixtures/history-window.html', 1500);
  for (let i = 0; i < 40 && !(await p.eval(`typeof __H === 'object'`)); i++) await sleep(100);
  const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  const at = async (sel) => JSON.parse(await p.eval(`(() => { const e = ${sel}; const b = e.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
    const h = document.elementFromPoint(x, y); return JSON.stringify({ x, y, hit: !!h && (h === e || e.contains(h)), got: h ? h.className : null }); })()`));
  const press = async (sel, name) => {
    const c = await at(sel); check('hit-test: ' + name, c.hit, c.got);
    await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y); await mouse('mouseReleased', c.x, c.y); await sleep(120);
  };
  const rows = async () => JSON.parse(await p.eval(`JSON.stringify(__H.hw.rows())`));
  const size = () => p.eval(`__H.S.size`);

  await p.eval(`__H.hw.open()`); await sleep(500);
  check('the window opens', await p.eval(`__H.hw.isOpen`) === true);
  check('it carries the notebook frame: ↶ ↷ × in the head, CLEAR and the count in the foot', await p.eval(`!!document.querySelector('.hist-win .nb-head .hist-undo') && !!document.querySelector('.hist-win .nb-head .hist-redo') && !!document.querySelector('.hist-win .nb-head .hist-close') && !!document.querySelector('.hist-win .nb-foot .hist-clear') && !!document.querySelector('.hist-win .nb-foot .hist-count')`));
  let r = await rows();
  check('it starts with the one row, where the project stands', r.length === 1 && r[0].state === 'current', JSON.stringify(r));

  /* a real knob drag: two gestures */
  const drag = async (dy) => {
    const c = await at(`document.querySelector('#card .k-dial') || document.querySelector('#card .k')`);
    await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y);
    for (let i = 1; i <= 8; i++) await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y + dy * i / 8, button: 'left', buttons: 1 });
    await mouse('mouseReleased', c.x, c.y + dy); await sleep(150);
  };
  const s0 = await size();
  await drag(-60); const s1 = await size();
  await drag(-40); const s2 = await size();
  check('the knob moved twice', s1 > s0 && s2 > s1, `${s0} ${s1} ${s2}`);
  r = await rows();
  check('each gesture is ONE row (newest first), named for the control and the window', r.length === 3 && r[0].state === 'current' && /SIZE/i.test(r[0].label) && /SCENE/i.test(r[0].label), JSON.stringify(r));
  check('the name is the kit label then the window, read by hook (CONTROL · WINDOW)', r[0].label.toUpperCase() === 'SIZE · SCENE', r[0].label);
  const countText = await p.eval(`document.querySelector('.hist-count').textContent`);
  check('the count line says rows of the limit', /2 of 256/.test(countText), countText);

  /* a click on the first gesture's row returns there */
  await press(`document.querySelector('.hist-row[data-i="0"]')`, 'the older row');
  const back = await size();
  check('a click on an older row returns the value', Math.abs(back - s1) < 1e-6, `${back} vs ${s1}`);
  r = await rows();
  check('the row you stand on is current and the one ahead is future', r.find((x) => x.i === 0).state === 'current' && r.find((x) => x.i === 1).state === 'future', JSON.stringify(r));
  check('the future row is drawn dimmed', +(await p.eval(`getComputedStyle(document.querySelector('.hist-row.hist-future')).opacity`)) < 0.6);

  await press(`document.querySelector('.hist-redo')`, 'redo');
  check('↷ goes forward', Math.abs((await size()) - s2) < 1e-6);
  await press(`document.querySelector('.hist-undo')`, 'undo');
  check('↶ goes back', Math.abs((await size()) - s1) < 1e-6);

  /* MODULATION: an edit to the rack is a row, and undo takes it out */
  const n0 = await p.eval(`__H.mod.M.sourceList().length`);
  await p.eval(`__H.history.change('modulation', 'ADD LFO · MODULATION', () => __H.mod.M.addSource('lfo'))`); await sleep(100);
  const n1 = await p.eval(`__H.mod.M.sourceList().length`);
  check('a modulation edit is a row', n1 === n0 + 1 && (await rows())[0].label.startsWith('ADD LFO'), `${n0} to ${n1}`);
  await press(`document.querySelector('.hist-undo')`, 'undo (modulation)');
  check('undo writes the rack back (the source is gone)', (await p.eval(`__H.mod.M.sourceList().length`)) === n0);
  await press(`document.querySelector('.hist-redo')`, 'redo (modulation)');
  check('redo puts the source back', (await p.eval(`__H.mod.M.sourceList().length`)) === n1);

  /* CLEAR forgets the rows, the picture stays */
  const keep = await size();
  await press(`document.querySelector('.hist-clear')`, 'CLEAR');
  r = await rows();
  check('CLEAR leaves one row and the picture as it is', r.length === 1 && Math.abs((await size()) - keep) < 1e-6, JSON.stringify(r));

  await press(`document.querySelector('.hist-close')`, 'the x in the head');
  await sleep(500);
  check('the x closes the window', await p.eval(`__H.hw.isOpen`) === false);
  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} history window checks FAILED` : `ALL ${results.length} MIR history window browser checks passed`);
process.exit(failed.length ? 1 : 0);
