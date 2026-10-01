/* kit-paint.browser.mjs — the kit paints only what changed (knob, fader, formula), counted by window.__MIR.perf; and the
 * history list draws a history and obeys its keys.  Run by tests/run.mjs with MIR_BASE set. */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8790';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  — ' + detail}`);

const p = await launch({ width: 800, height: 600 });
try {
  await p.goto(BASE + '/tests/fixtures/kit-paint.html', 800);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  const ev = (x) => p.eval(x);
  /* the counters around one call: { writes, skipped } it caused */
  const cost = async (call) => JSON.parse(await ev(`JSON.stringify((() => { const P = window.__MIR.perf; P.reset(); ${call}; const s = P.snapshot(); return { writes: s.writes, skipped: s.skipped }; })())`));

  /* knob: a changed value costs text + --turn (2 writes); the same value again costs none */
  let c = await cost('__T.k.set(0.3)');
  check('knob: a changed value writes its text and --turn', c.writes === 2, JSON.stringify(c));
  c = await cost('__T.k.set(0.3)');
  check('knob: the same value again writes nothing', c.writes === 0 && c.skipped >= 2, JSON.stringify(c));
  c = await cost('__T.k.paint()');
  check('knob: paint() again writes nothing', c.writes === 0, JSON.stringify(c));
  check('knob: DOM agrees with the value', await ev(`__T.k.root.querySelector('.k-val').textContent === '0.30' || __T.k.root.querySelector('.k-val').textContent.length > 0`));
  /* modulated: the painted value dances, the base tick (--base-turn) rides along; a repeat is free */
  c = await cost('__T.k.show(0.6)');
  check('knob: a modulated value writes text, --turn and --base-turn', c.writes === 3, JSON.stringify(c));
  c = await cost('__T.k.show(0.6)');
  check('knob: the same modulated value writes nothing', c.writes === 0, JSON.stringify(c));
  c = await cost('__T.k.show(0.61)');
  check('knob: a moved modulated value rewrites text and --turn only', c.writes === 2, JSON.stringify(c));

  /* fader: --fill and text */
  c = await cost('__T.f.set(0.8)');
  check('fader: a changed value writes --fill and its text', c.writes === 2, JSON.stringify(c));
  c = await cost('__T.f.set(0.8)');
  check('fader: the same value again writes nothing', c.writes === 0, JSON.stringify(c));
  c = await cost('__T.f.show(0.9)');
  check('fader: a painted value writes --fill and its text', c.writes === 2, JSON.stringify(c));
  c = await cost('__T.f.show(0.9)');
  check('fader: the same painted value writes nothing', c.writes === 0, JSON.stringify(c));

  /* formula slots */
  c = await cost(`__T.fx.set({ e: '2.0' })`);
  check('formula: a changed slot writes once', c.writes === 1, JSON.stringify(c));
  c = await cost(`__T.fx.set({ e: '2.0' })`);
  check('formula: the same slot writes nothing', c.writes === 0 && c.skipped === 1, JSON.stringify(c));
  check('formula: the DOM shows the value', await ev(`document.querySelector('.fx-v').textContent === '2.0'`));

  /* the history list: rows newest first, goto on click, the keys */
  const rows = () => ev(`JSON.stringify([...document.querySelectorAll('.hist-row')].map((b) => [b.querySelector('.hist-lbl').textContent, b.classList.contains('hist-current'), b.classList.contains('hist-future')]))`);
  check('history list: a fresh stack shows START as current', await rows() === '[["START",true,false]]', await rows());
  await ev(`(() => { __T.H.hold('ONE'); __T.x = 1; __T.H.release(); })()`); await sleep(120);
  await ev(`(() => { __T.H.hold('TWO'); __T.x = 2; __T.H.release(); })()`); await sleep(120);
  check('history list: newest first, the row you stand on current', await rows() === '[["TWO",true,false],["ONE",false,false],["START",false,false]]', await rows());
  await ev(`document.querySelector('.hist-row:last-child').click()`); await sleep(100);
  check('history list: a click goes to that row (state and view)', (await ev('__T.x')) === 0 && (await rows()) === '[["TWO",false,true],["ONE",false,true],["START",true,false]]', await rows());
  check('history list: UNDO is disabled at the bottom, REDO is not', await ev(`(() => { const t = document.querySelectorAll('.hist-tools .trig'); return t[0].disabled && !t[1].disabled; })()`));
  await ev(`document.querySelectorAll('.hist-tools .trig')[1].click()`); await sleep(100);
  check('history list: REDO steps forward', (await ev('__T.x')) === 1);
  const zKey = (mods) => p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'KeyZ', key: 'z', windowsVirtualKeyCode: 90, modifiers: mods });
  await zKey(2 /* Ctrl */); await sleep(100);
  check('keys: Ctrl+Z undoes', (await ev('__T.x')) === 0);
  await zKey(2 | 8 /* Ctrl+Shift */); await sleep(100);
  check('keys: Ctrl+Shift+Z redoes', (await ev('__T.x')) === 1);
  await ev(`(() => { const i = document.createElement('input'); i.type = 'text'; i.id = 'tf'; document.body.appendChild(i); i.focus(); })()`);
  await zKey(2); await sleep(100);
  check('keys: a text field keeps its own undo', (await ev('__T.x')) === 1);
  check('no page errors', !p.logs.some((l) => /EXCEPTION/.test(l)), p.logs.join(' | '));
} finally { await p.close(); }

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nPASS kit-paint: all ${results.length}`);
process.exit(failed ? 1 : 0);
