/* keys-undo.browser.mjs — UNDO HAS ONE OWNER (wave 19, lane K): through createApp() with the one history and the TIMELINE,
 * real keys and a real knob drag through CDP (tests/fixtures/keys-undo.html).
 *   1. Mod+Z and Mod+Shift+Z / Mod+Y are held by ONE row each of the app's key table ('undo', 'redo'): no capture listener,
 *      no second timeline row
 *   2. after a knob change, Ctrl+Z undoes once (one row back, the value home) and Ctrl+Shift+Z redoes once
 *   3. after a timeline edit, with the focus in the timeline, Ctrl+Z undoes once (the lane goes, the knob stays)
 *   4. rebinding undo moves it: the old chord does nothing, the new one undoes (the old capture listener made this impossible)
 *   5. a text field keeps its own undo: Ctrl+Z typed in one moves no row
 *   6. the EDIT menu and HISTORY's ↶ show the table's chord, not a typed one
 * Standalone: node tools/serve.mjs 8840 . --no-reset & MIR_BASE=http://127.0.0.1:8840 node tests/keys-undo.browser.mjs */
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
  const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });

  /* 1. one owner */
  const own = await ev(`return { z: A.keys.holders('Mod+Z'), sz: A.keys.holders('Mod+Shift+Z'), y: A.keys.holders('Mod+Y'), conflicts: A.keys.conflicts().filter((c) => /KeyZ|KeyY/.test(c.chord)), tl: A.keys.list().filter((a) => /^timeline\\.(undo|redo)$/.test(a.id)).length };`);
  check('Mod+Z is held by one row, "undo"', JSON.stringify(own.z) === '["undo"]', JSON.stringify(own.z));
  check('Mod+Shift+Z and Mod+Y by one row, "redo"', JSON.stringify(own.sz) === '["redo"]' && JSON.stringify(own.y) === '["redo"]', JSON.stringify(own));
  check('no chord of undo or redo is held twice, and the timeline has no undo row of its own', own.conflicts.length === 0 && own.tl === 0, JSON.stringify(own));

  /* 2. a knob change: a real drag, then Ctrl+Z once and Ctrl+Shift+Z once */
  const c = await ev(`const d = document.querySelector('.dev[data-id="scene"] .k-dial') || document.querySelector('.dev[data-id="scene"] .k'); const b = d.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2), h = document.elementFromPoint(x, y); return { x, y, hit: !!h && (h === d || d.contains(h)) };`);
  check('hit-test: the knob', c.hit);
  const s0 = await p.eval('__U.S.size'), i0 = await p.eval('__U.at()');
  await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y);
  for (let i = 1; i <= 8; i++) await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y - 60 * i / 8, button: 'left', buttons: 1 });
  await mouse('mouseReleased', c.x, c.y - 60); await sleep(200);
  const s1 = await p.eval('__U.S.size'), i1 = await p.eval('__U.at()');
  check('the knob drag is one row', s1 > s0 && i1 === i0 + 1, `size ${s0} → ${s1}, row ${i0} → ${i1}`);
  await p.key('Mod+Z');
  const s2 = await p.eval('__U.S.size'), i2 = await p.eval('__U.at()');
  check('Ctrl+Z after a knob change undoes ONCE (one row back, the value home)', i2 === i1 - 1 && Math.abs(s2 - s0) < 1e-9, `row ${i1} → ${i2}, size ${s2}`);
  await p.key('Mod+Shift+Z');
  check('Ctrl+Shift+Z redoes once', (await p.eval('__U.at()')) === i1 && Math.abs((await p.eval('__U.S.size')) - s1) < 1e-9);
  await p.key('Mod+Z');

  /* 3. a timeline edit, the focus in the timeline: Ctrl+Z once */
  const t0 = await ev(`A.timeline.open(); await new Promise((r) => setTimeout(r, 300)); const n = A.timeline.model.state().lanes.length; A.timeline.model.addLane(); A.timeline.editor.surface.focus(); return { n, m: A.timeline.model.state().lanes.length, at: U.at(), size: U.S.size, live: A.timeline.editor.keysLive() };`);
  check('the timeline edit is one row and the timeline has the keys', t0.m === t0.n + 1 && t0.live, JSON.stringify(t0));
  await p.key('Mod+Z');
  const t1 = await ev(`return { m: A.timeline.model.state().lanes.length, at: U.at(), size: U.S.size };`);
  check('Ctrl+Z after a timeline edit undoes ONCE (the lane goes, the knob stays)', t1.m === t0.n && t1.at === t0.at - 1 && t1.size === t0.size, JSON.stringify({ t0, t1 }));
  await p.key('Mod+Y');
  const t2 = await ev(`return { m: A.timeline.model.state().lanes.length, at: U.at() };`);
  check('Ctrl+Y redoes it once', t2.m === t0.m && t2.at === t0.at, JSON.stringify(t2));

  /* 4. rebinding undo moves it */
  const rb = await ev(`return A.keys.bind('undo', 'Alt+KeyU');`);
  check('undo rebinds (to Alt+U)', rb.ok, JSON.stringify(rb));
  const a0 = await p.eval('__U.at()');
  await p.key('Mod+Z');
  check('the old chord, Ctrl+Z, no longer undoes', (await p.eval('__U.at()')) === a0);
  await p.key('Alt+U');
  check('the new chord undoes once', (await p.eval('__U.at()')) === a0 - 1);
  await ev(`A.keys.reset('undo'); return 1;`);

  /* 5. a text field keeps its own undo */
  await ev(`const f = document.createElement('input'); f.id = 'field'; f.style.cssText = 'position:fixed;left:20px;top:300px;z-index:99'; document.body.appendChild(f); f.focus(); return 1;`);
  const f0 = await p.eval('__U.at()');
  await p.key('a'); await p.key('Mod+Z');
  check('Ctrl+Z in a text field moves no row', (await p.eval('__U.at()')) === f0);
  await ev(`document.getElementById('field').remove(); return 1;`);

  /* 6. shown from the table */
  const shown = await ev(`const m = A.menubar && A.menubar.menus ? null : null; const row = A.keys.menuItem('undo'); const u = document.querySelector('.hist-undo');
    return { row: row && row[0], hint: u && u.getAttribute('data-key-hint'), title: u && (u.getAttribute('title') || u.dataset.help || '') };`);
  check('the menu row is the table\'s: UNDO with Ctrl+Z', shown.row === 'UNDO\tCtrl+Z', JSON.stringify(shown));
  check('HISTORY\'s ↶ shows the table\'s chord, and no typed key in its words', shown.hint === 'Ctrl+Z' && !/Ctrl/.test(shown.title), JSON.stringify(shown));
  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} keys-undo checks FAILED` : `ALL ${results.length} MIR keys-undo browser checks passed`);
process.exit(failed.length ? 1 : 0);
