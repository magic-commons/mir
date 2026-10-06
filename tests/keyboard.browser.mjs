/* keyboard.browser.mjs — the one key table and the keyboard window under a real browser (tests/fixtures/keyboard.html),
 * with real keys and a real pointer through CDP; everything clicked is hit-tested with elementFromPoint first.
 *   a chord runs its action once; the same chord typed in a text field does not (an inFields one does);
 *   pressing a key on the drawn board shows its action; RECORD → a new chord: the old chord stops running the action and
 *   the new one runs it; recording a taken chord shows the conflict, pressing it again steals it and names the loser;
 *   the menubar's key column and the help view show the new chord without a reload; a reload keeps the bindings;
 *   RESET restores them; under the pseudo-language the labels translate and the key caps do not.
 * MIR_PLATES=1 also writes the plates into docs/plates/keyboard/ (dark, light, recording, conflict, the help view).
 * Standalone: MIR_BASE=http://127.0.0.1:8799 node tests/keyboard.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8799';
const PLATES = fileURLToPath(new URL('../docs/plates/keyboard/', import.meta.url));
const SHOOT = !!process.env.MIR_PLATES;   // a test run never writes into docs/: MIR_PLATES=1 retakes the plates
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1366, height: 860 });
try {
  const boot = async () => { for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100); };
  await p.goto(BASE + '/tests/fixtures/keyboard.html', 600);
  await p.eval(`localStorage.removeItem('mir.test.keys'); location.reload(); 1`); await sleep(700); await boot();
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, K = T.keys, W = T.kb, H = T.help, M = T.motion;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const rest = async (w) => { for (let i = 0; i < 4; i++) { await M.settled(w.root); await M.settled(w.rail.el); await wait(20); } };
    ${body} })().then(JSON.stringify)`));
  const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  const VK = { Space: 32, Comma: 188, Period: 190, Equal: 187, Minus: 189, Slash: 191, Escape: 27 };
  const key = async (code, mods = 0) => {
    const k = code.startsWith('Key') ? code.slice(3).toLowerCase() : code.startsWith('Digit') ? code.slice(5) : code === 'Space' ? ' ' : code;
    const vk = code.startsWith('Key') ? code.charCodeAt(3) : code.startsWith('Digit') ? code.charCodeAt(5) : VK[code] || 0;
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
    await sleep(40);
  };
  const CTRL = 2;
  /** a real click on the element `sel` evaluates to, after proving elementFromPoint finds it (or a child of it) */
  const click = async (sel) => {
    const at = JSON.parse(await p.eval(`(() => { const n = (${sel}); const l = n.closest('.km-list');
      if (l) l.scrollTop = Math.max(0, n.offsetTop - l.offsetTop - 40);   /* a hand scrolls the list well to the row first */
      const b = n.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
      const h = document.elementFromPoint(x, y); return JSON.stringify({ x, y, hit: !!h && (h === n || n.contains(h)), what: h ? h.className : null }); })()`));
    if (!at.hit) return at;
    await mouse('mouseMoved', at.x, at.y); await mouse('mousePressed', at.x, at.y); await mouse('mouseReleased', at.x, at.y); await sleep(60);
    return at;
  };
  const shot = async (name, sels) => {
    if (!SHOOT) return;
    const c = JSON.parse(await p.eval(`(() => { const rs = [${sels}].map((n) => n.getBoundingClientRect()); const l = Math.min(...rs.map((r) => r.left)) - 16, t = Math.min(...rs.map((r) => r.top)) - 16,
      r = Math.max(...rs.map((r) => r.right)) + 16, b = Math.max(...rs.map((r) => r.bottom)) + 16; return JSON.stringify({ x: Math.max(0, l), y: Math.max(0, t), width: Math.min(innerWidth, r) - Math.max(0, l), height: Math.min(innerHeight, b) - Math.max(0, t) }); })()`));
    await p.shot(PLATES + name, c);
  };
  const ran = () => p.eval(`JSON.stringify(__T.ran.splice(0))`).then(JSON.parse);

  /* ── the one listener ── */
  await p.eval(`document.activeElement && document.activeElement.blur(); 1`);
  await key('Space');
  let r = await ran();
  check('a chord runs its action once (Space → PLAY)', r.length === 1 && r[0] === 'play', JSON.stringify(r));
  let c = await click(`document.getElementById('note')`);
  await key('Space'); await key('KeyF'); await key('KeyS', CTRL);
  r = await ran();
  check('typed in a text field: Space and F run nothing; Ctrl+S (inFields) still saves', c.hit && r.length === 1 && r[0] === 'save', JSON.stringify({ hit: c.hit, r }));
  await p.eval(`document.activeElement.blur(); 1`);

  /* ── overControls: Space plays over a focused kit button, and the button is not pressed; in a text field it types ── */
  c = await click(`document.getElementById('btn')`); await sleep(50);
  r = await ran(); const before = await p.eval(`window.__btn || 0`);
  await key('Space');
  const over = { ran: await ran(), btn: (await p.eval(`window.__btn || 0`)) - before, focus: await p.eval(`document.activeElement.id`) };
  check('overControls: Space with a kit button focused plays once and does not press the button', c.hit && before === 1 && over.focus === 'btn' && over.ran.length === 1 && over.ran[0] === 'play' && over.btn === 0, JSON.stringify({ before, over }));
  await click(`document.getElementById('note')`);
  await p.eval(`document.getElementById('note').value = ''; 1`);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', text: ' ', windowsVirtualKeyCode: 32 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 }); await sleep(40);
  const typed = { ran: await ran(), value: await p.eval(`document.getElementById('note').value`) };
  check('overControls: in a text field Space types a space and does not play', typed.ran.length === 0 && typed.value === ' ', JSON.stringify(typed));
  await p.eval(`document.activeElement.blur(); 1`);

  /* ── the window: open, then a key on the board shows its action ── */
  await run(`W.open(); await rest(W.win); return 0;`);
  const listSeat = `return ['.km-search', '.km-list', '.km-btn-record'].map((s) => { const b = W.root.querySelector(s).getBoundingClientRect(); return Math.round(b.left) + ',' + Math.round(b.top) + ',' + Math.round(b.height); }).join(' ');`;
  const seat0 = await run(listSeat);
  c = await click(`__T.kb.root.querySelector('.km-key[data-code="KeyH"]')`);
  const seat1 = await run(listSeat);
  check('THE HAND: a key pressed on the board writes the status in its kept line — the search and the list do not move', seat0 === seat1, seat0 + ' → ' + seat1);
  r = await run(`return { status: W.root.querySelector('.km-status').textContent, row: (W.root.querySelector('.km-action-row-selected') || {}).dataset?.id,
    sel: [...W.root.querySelectorAll('.km-key-selected')].map((k) => k.dataset.code) };`);
  check('pressing a drawn key shows its action: the status names it and its row is chosen', c.hit && r.row === 'hide' && /HIDE/.test(r.status) && r.sel.includes('KeyH'), JSON.stringify({ c, r }));
  c = await click(`__T.kb.root.querySelector('.km-key[data-code="KeyQ"]')`);
  r = await run(`return W.root.querySelector('.km-status').textContent;`);
  check('a free key says it is free (every drawn key is pressable)', c.hit && /free/.test(r), r);
  await click(`__T.kb.root.querySelector('.km-action-row[data-id="save"]')`);
  await shot('keyboard-dark.png', `__T.kb.win.root, __T.kb.win.rail.el`);

  /* ── record → a new chord ── */
  c = await click(`__T.kb.root.querySelector('.km-action-row[data-id="undo"]')`);
  const c2 = await click(`__T.kb.root.querySelector('.km-btn-record')`);
  r = await run(`return { rec: K.recording(), live: !!W.root.querySelector('.km-key-recording'), btn: W.root.querySelector('.km-btn-record').getAttribute('aria-pressed') };`);
  check('RECORD INPUT listens: the table records, the action\'s key is live, the button is ON', c.hit && c2.hit && r.rec && r.live && r.btn === 'true', JSON.stringify(r));
  await shot('keyboard-recording.png', `__T.kb.win.root, __T.kb.win.rail.el`);
  await key('KeyU', CTRL);
  r = await run(`return { undo: K.chords('undo'), rec: K.recording(), status: W.root.querySelector('.km-status').textContent };`);
  check('a new chord is recorded and bound', r.undo.length === 1 && r.undo[0] === 'Mod+KeyU' && !r.rec, JSON.stringify(r));
  await p.eval(`document.activeElement.blur(); 1`);
  await key('KeyZ', CTRL); const oldRan = await ran();
  await key('KeyU', CTRL); const newRan = await ran();
  check('the old chord no longer runs the action and the new one does', oldRan.length === 0 && newRan.length === 1 && newRan[0] === 'undo', JSON.stringify({ oldRan, newRan }));

  /* ── steal on conflict ── */
  await click(`__T.kb.root.querySelector('.km-action-row[data-id="fwd"]')`);
  await click(`__T.kb.root.querySelector('.km-btn-record')`);
  await key('KeyH');
  r = await run(`return { status: W.root.querySelector('.km-status').textContent, tone: W.root.querySelector('.km-status').dataset.tone, mark: !!W.root.querySelector('.km-key-conflict[data-code="KeyH"]'), hide: K.chords('hide'), rec: K.recording() };`);
  check('a taken chord is not stolen silently: the conflict is shown, the owner kept, still listening', r.tone === 'conflict' && r.mark && /HIDE THE INTERFACE/.test(r.status) && r.hide[0] === 'KeyH' && r.rec, JSON.stringify(r));
  await shot('keyboard-conflict.png', `__T.kb.win.root, __T.kb.win.rail.el`);
  await key('KeyH');
  r = await run(`return { status: W.root.querySelector('.km-status').textContent, hide: K.chords('hide'), fwd: K.chords('fwd') };`);
  check('pressing it again steals it and names who lost it', r.hide.length === 0 && r.fwd[0] === 'KeyH' && /taken from “HIDE THE INTERFACE”/.test(r.status), JSON.stringify(r));

  /* ── the menubar and the help view, without a reload ── */
  r = await run(`T.menubar.openGroup('FILE'); await wait(30);
    const row = [...document.querySelectorAll('#menubar .mb-list:not([hidden]) .mb-item')].find((b) => b.querySelector('.mb-lbl').dataset.t === 'UNDO');
    const menuKey = row && row.querySelector('.mb-key').textContent; T.menubar.close();
    W.close(); await rest(W.win); H.open(); await rest(H.win);
    const hrow = H.root.querySelector('.km-help-row[data-id="undo"] .km-chip'), hf = H.root.querySelector('.km-help-row[data-id="fwd"] .km-chip'), hh = H.root.querySelector('.km-help-row[data-id="hide"] .km-chip');
    return { menuKey, help: hrow.textContent, fwd: hf.textContent, hide: hh.textContent };`);
  check('the menubar key column and the help view show the new chords without a reload', r.menuKey === 'Ctrl+U' && r.help === 'Ctrl+U' && r.fwd === 'H' && r.hide === '—', JSON.stringify(r));
  await shot('keys-help.png', `__T.help.win.root, __T.help.win.rail.el`);
  await run(`H.close(); await rest(H.win); return 0;`);

  /* ── a reload keeps them ── */
  await p.eval(`location.reload(); 1`); await sleep(700); await boot();
  r = await run(`return { undo: K.chords('undo'), hide: K.chords('hide'), fwd: K.chords('fwd'), saved: JSON.parse(localStorage.getItem('mir.test.keys')) };`);
  check('a reload keeps the bindings (only the difference was saved)', r.undo[0] === 'Mod+KeyU' && r.hide.length === 0 && r.fwd[0] === 'KeyH' && Object.keys(r.saved).sort().join() === 'fwd,hide,undo', JSON.stringify(r));

  /* ── reset ── */
  await run(`W.open(); await rest(W.win); return 0;`);
  c = await click(`__T.kb.root.querySelector('.km-btn-reset')`);
  r = await run(`return { undo: K.chords('undo'), hide: K.chords('hide'), fwd: K.chords('fwd'), saved: localStorage.getItem('mir.test.keys') };`);
  check('RESET TO DEFAULT restores every binding and clears the save', c.hit && r.undo[0] === 'Mod+KeyZ' && r.hide[0] === 'KeyH' && r.fwd[0] === 'Period' && r.saved === null, JSON.stringify(r));

  /* ── nothing scrolls sideways; the list scrolls in its well ── */
  r = await run(`const l = W.root.querySelector('.km-list'); return { side: [W.win.body, W.root, l, ...W.root.querySelectorAll('.km-col')].some((n) => n.scrollWidth > n.clientWidth + 1),
    listScrolls: getComputedStyle(l).overflowY, page: document.documentElement.scrollWidth <= innerWidth };`);
  check('nothing scrolls sideways; the list scrolls inside its own well', !r.side && r.listScrolls === 'auto' && r.page, JSON.stringify(r));

  /* ── the pseudo-language: labels translate, key caps do not ── */
  r = await run(`await T.setLanguage('qps'); await wait(60);
    const lbl = W.root.querySelector('.km-action-row[data-id="play"] .km-action-label').textContent, cap = W.root.querySelector('.km-key[data-code="KeyS"] .km-key-cap').textContent;
    const chip = [...W.root.querySelectorAll('.km-action-row[data-id="undo"] .km-chip')].map((n) => n.textContent).join('+');
    const sub = W.root.querySelector('.km-key[data-code="Space"] .km-key-sub').textContent;
    T.menubar.openGroup('FILE'); await wait(30); const mk = [...document.querySelectorAll('#menubar .mb-list:not([hidden]) .mb-key')].map((n) => n.textContent); T.menubar.close();
    await T.setLanguage('en'); await wait(30);
    return { lbl, cap, chip, sub, mk, back: W.root.querySelector('.km-action-row[data-id="play"] .km-action-label').textContent };`);
  check('under qps the action labels translate and the key caps, chips and menu keys do not', r.lbl.startsWith('[') && r.lbl !== 'PLAY' && r.sub.startsWith('[') && r.cap === 'S' && r.chip === 'Ctrl+Z' && r.mk.includes('Ctrl+Z') && r.back === 'PLAY', JSON.stringify(r));

  /* ── the light plate ── */
  await run(`document.body.dataset.theme = 'light'; W.select('save'); await wait(80); return 0;`);
  await shot('keyboard-light.png', `__T.kb.win.root, __T.kb.win.rail.el`);
  await run(`document.body.dataset.theme = 'dark'; return 0;`);

  const errs = p.logs.filter((l) => /EXCEPTION|error/.test(l));
  check('no page errors', errs.length === 0, errs.join(' | '));
} catch (err) {
  check('the run finished', false, String(err && err.stack || err));
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const fails = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
