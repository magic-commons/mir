/* transport-placement.browser.mjs — THE ONE BAR THAT MOVES and THE WORKSPACE STACK, under a real browser
 * (tests/fixtures/transport-placement.html: the stage transport, the kit's real timeline without a transport of its own,
 * and a kit window in MODULATION's seat).  Real CDP input; every press is hit-tested with elementFromPoint.
 *   · the timeline opens with its work lane showing → the SAME bar node is inside the lane, in the work-bar form, and a
 *     press on its play lands on it; a click on its pill types the tempo (Enter takes it, Escape does not)
 *   · WORK BARS → hidden (the real chip) → the bar is back on the stage; → top again → back in the lane; the timeline
 *     closes → the stage
 *   · TRANSPORT BAR off (body.no-transport-bar) → hidden in the lane and on the stage, nothing to hit; on → back
 *   · the stage pill opens the tempo panel with the macro rail: a tile's routing grip is what the pointer finds
 *   · both workspaces open → UPPER seats 8 px above TIMELINE, left edges together, the band reserved; a real drag of
 *     UPPER's grip → detached, the band given back
 *   · the MIR switch in UPPER swaps to TIMELINE; the door in the timeline's work lane swaps back
 *   · the door's palette diamond steps its colours under a hovering mouse and puts them back on leave
 * Standalone: MIR_BASE=http://127.0.0.1:8844 node tests/transport-placement.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8844';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1440, height: 900 });
try {
  await p.goto(BASE + '/tests/fixtures/transport-placement.html', 800);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, tr = T.tr, tl = T.tl, up = T.upper, ws = T.ws, M = T.motion;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const rest = async (w) => { for (let i = 0; i < 4; i++) { await M.settled(w.root); await wait(20); } };
    const R = (el) => { const b = el.getBoundingClientRect(); return { left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right), bottom: Math.round(b.bottom), width: Math.round(b.width), height: Math.round(b.height) }; };
    const hit = (el) => { const b = el.getBoundingClientRect(); if (!b.width) return false; const h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!h && (h === el || el.contains(h)); };
    ${body} })().then(JSON.stringify)`));
  const mouse = (type, x, y, mods = 0) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, modifiers: mods });
  const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await sleep(20); await mouse('mouseReleased', x, y); await sleep(80); };
  const at = async (sel) => JSON.parse(await p.eval(`(() => { const n = ${sel}; const b = n.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2); const h = document.elementFromPoint(x, y); return JSON.stringify({ x, y, hit: !!h && (h === n || n.contains(h)) }); })()`));
  const type = async (text) => { for (const ch of text) { await p.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, key: ch }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); } };
  const key = async (k, vk) => { await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code: k, windowsVirtualKeyCode: vk }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: vk }); await sleep(60); };

  /* ── on the stage first ── */
  let r = await run(`return { place: tr.placement, parent: tr.root.parentElement.id, bar: tr.root.dataset.bar, play: hit(tr.el.play) };`);
  check('closed timeline: the bar is on the stage, in its floating form, and its play is what the pointer finds', r.place === 'stage' && r.parent === 'ground' && r.bar === 'float' && r.play, JSON.stringify(r));

  /* ── the timeline opens with its work lane: the same node moves in ── */
  r = await run(`const node = tr.root; tl.open(); await rest(tl.win); await wait(60);
    return { place: tr.placement, same: node === tr.root, inLane: tl.editor.transportHost.contains(tr.root), inWin: tl.root.contains(tr.root), bar: tr.root.dataset.bar,
      seats: [...tr.root.querySelectorAll('.transport-home, .dock-btn, .mod-exp')].every((b) => b.classList.contains('trig')), play: hit(tr.el.play), pill: hit(tr.el.pill), stageEmpty: !document.getElementById('ground').querySelector('.mir-transport') };`);
  check('timeline open, work lane showing: the SAME bar is inside the work lane in the work-bar form (seats wear .trig), the stage holds none, and play and the pill are what the pointer finds',
    r.place === 'work' && r.same && r.inLane && r.inWin && r.bar === 'work' && r.seats && r.play && r.pill && r.stageEmpty, JSON.stringify(r));

  /* ── the work bar's pill types the tempo: one click, Enter takes, Escape does not ── */
  let c = await at(`__T.tr.el.pill`);
  await click(c.x, c.y);
  r = await run(`const f = tr.el.field; return { open: !f.hidden && document.activeElement === f, value: f.value, bpm: tr.bpm, panel: tr.root.classList.contains('tempo-open'), max: f.maxLength };`);
  check('in the work bar a click on the pill opens the tempo field (BASINS tempo-editor), holding the tempo, 8 characters, no panel', c.hit && r.open && r.value === String(r.bpm) && !r.panel && r.max === 8, JSON.stringify({ c, r }));
  await p.eval(`(() => { const f = __T.tr.el.field; f.select(); })()`);
  await type('123.5'); await key('Enter', 13);
  r = await run(`return { bpm: tr.bpm, field: tr.el.field.hidden, pill: !tr.el.pill.hidden };`);
  check('typed 123.5 + Enter: the tempo is 123.5 (decimals kept) and the pill is back', r.bpm === 123.5 && r.field && r.pill, JSON.stringify(r));
  c = await at(`__T.tr.el.pill`); await click(c.x, c.y);
  await p.eval(`(() => { const f = __T.tr.el.field; f.select(); })()`);
  await type('99'); await key('Escape', 27);
  r = await run(`return { bpm: tr.bpm, field: tr.el.field.hidden };`);
  check('typed 99 + Escape: nothing taken, the field closes', r.bpm === 123.5 && r.field, JSON.stringify(r));
  /* a drag on the work bar's pill runs the travel law: 22 px up of 220 = a tenth of the range */
  c = await at(`__T.tr.el.pill`);
  await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y);
  for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', c.x, c.y - Math.round(22 * i / 6)); await sleep(16); }
  await sleep(40); await mouse('mouseReleased', c.x, c.y - 22); await sleep(80);
  r = await run(`return { bpm: tr.bpm, field: tr.el.field.hidden, range: [T.M.BPM_MIN, T.M.BPM_MAX] };`);
  const want = Math.round((123.5 + (22 / 220) * (r.range[1] - r.range[0])) * 10) / 10;
  check('a drag up 22 px on the work bar\'s pill: the travel law (the range over 220 px), and a drag is not a click', Math.abs(r.bpm - want) < 0.11 && r.field, JSON.stringify({ r, want }));

  /* ── the tempo panel in the work bar floats toward the free side (BASINS positionTempo) ── */
  r = await run(`tr.tempoPanel(true); await wait(40); const b = R(tr.root), q = R(tr.el.panel), dir = tr.root.dataset.tempoDirection;
    const tile = tr.el.panel.querySelector('.tempo-tile .m2grip'); const out = { dir, below: q.top - b.bottom, above: b.top - q.bottom, tile: !!tile && hit(tile) }; tr.tempoPanel(false); await wait(20);
    return { ...out, closed: !tr.root.dataset.tempoDirection };`);
  check('in the work bar the tempo panel opens below (room for it) 8 px from the bar, over the lanes, its macro tiles hit', r.dir === 'below' && Math.abs(r.below - 8) <= 1 && r.tile && r.closed, JSON.stringify(r));

  /* ── WORK BARS → hidden with the real chip (top → bottom → hidden): the bar goes back to the stage ── */
  const chip = async () => { const q = await at(`__T.tl.rail.chip('workbars')`); await click(q.x, q.y); return q.hit; };
  const h1 = await chip(); r = await run(`await wait(40); return { lane: tl.editor.workLane(), place: tr.placement, inLane: tl.editor.transportHost.contains(tr.root) };`);
  check('WORK BARS → bottom: the lane still shows, the bar stays in it', h1 && r.lane === 'bottom' && r.place === 'work' && r.inLane, JSON.stringify(r));
  await chip(); r = await run(`await wait(40); return { lane: tl.editor.workLane(), place: tr.placement, parent: tr.root.parentElement.id, bar: tr.root.dataset.bar, play: hit(tr.el.play) };`);
  check('WORK BARS → hidden: the bar is back on the stage, floating, and play is what the pointer finds', r.lane === 'hidden' && r.place === 'stage' && r.parent === 'ground' && r.bar === 'float' && r.play, JSON.stringify(r));
  await chip(); r = await run(`await wait(40); return { lane: tl.editor.workLane(), place: tr.placement, inLane: tl.editor.transportHost.contains(tr.root), play: hit(tr.el.play) };`);
  check('WORK BARS → top: the bar returns to the lane', r.lane === 'top' && r.place === 'work' && r.inLane && r.play, JSON.stringify(r));

  /* ── TRANSPORT BAR off: hidden in every seat, nothing to hit; on again: back ── */
  r = await run(`document.body.classList.add('no-transport-bar'); await wait(30);
    const inLane = { shown: !!tr.root.getClientRects().length, play: hit(tr.el.play), closed: tr.closed };
    tl.close(); await rest(tl.win); await wait(40);
    const onStage = { place: tr.placement, shown: !!tr.root.getClientRects().length };
    document.body.classList.remove('no-transport-bar'); await wait(30);
    return { inLane, onStage, back: { shown: !!tr.root.getClientRects().length, play: hit(tr.el.play), closed: tr.closed } };`);
  check('TRANSPORT BAR off: hidden in the lane and, after the timeline closes, on the stage; on again, it is back where it is (the user\'s close wins)',
    !r.inLane.shown && !r.inLane.play && r.inLane.closed && r.onStage.place === 'stage' && !r.onStage.shown && r.back.shown && r.back.play && !r.back.closed, JSON.stringify(r));

  /* ── the stage pill opens the tempo panel, with the macro rail ── */
  c = await at(`__T.tr.el.pill`); await click(c.x, c.y);
  r = await run(`await wait(40); const tiles = [...tr.root.querySelectorAll('.tempo-rail .tempo-tile')]; const g = tiles[0] && tiles[0].querySelector('.m2grip');
    return { open: tr.root.classList.contains('tempo-open'), tiles: tiles.length, macros: T.M.macroList().length, grip: !!g && hit(g), depth: !!tiles[0] && hit(tiles[0].querySelector('.m2numseat')), clockTiles: tr.root.querySelectorAll('.tempo-clock .trig').length };`);
  check('on the stage a click on the pill opens the tempo panel: MACROS (one tile per macro, its routing grip and depth seat hit) | CLOCK',
    c.hit && r.open && r.tiles === r.macros && r.tiles > 0 && r.grip && r.depth && r.clockTiles >= 5, JSON.stringify(r));
  await click(c.x, c.y);

  /* ── the lego stack: both open → UPPER 8 px above TIMELINE; a real drag of UPPER away → detached ── */
  r = await run(`tl.open(); up.open(); ws.sync(); await rest(tl.win); await rest(up); await wait(80);
    const a = R(up.root), b = R(tl.root);
    return { a, b, gap: b.top - a.bottom, left: a.left - b.left, stacked: ws.stacked, band: tl.win.reserved, h: a.height };`);
  check('both workspaces open: UPPER seats 8 px above TIMELINE with their left edges together, and TIMELINE keeps the band (its height + 8)',
    r.stacked && Math.abs(r.gap - 8) <= 1 && Math.abs(r.left) <= 1 && r.band === r.h + 8, JSON.stringify(r));
  const g = await at(`__T.upper.rail.grip`);
  await mouse('mouseMoved', g.x, g.y); await mouse('mousePressed', g.x, g.y);
  for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', g.x + 15 * i, g.y - 6 * i); await sleep(16); }
  await sleep(40); await mouse('mouseReleased', g.x + 120, g.y - 48); await sleep(120);
  r = await run(`await rest(up); await rest(tl.win); const a = R(up.root), b = R(tl.root); return { stacked: ws.stacked, band: tl.win.reserved, gap: b.top - a.bottom, left: a.left - b.left };`);
  check('a real drag of UPPER\'s grip: it leaves the stack and TIMELINE gives the band back', g.hit && !r.stacked && r.band === 0 && Math.abs(r.left - 120) <= 2, JSON.stringify({ g, r }));

  /* ── the MIR switch swaps; the door in the work lane swaps back ── */
  c = await at(`__T.sw.root`); await click(c.x, c.y);
  r = await run(`await rest(tl.win); await wait(60); return { up: up.isOpen(), tl: tl.isOpen(), place: tr.placement };`);
  check('the MIR switch in UPPER: UPPER closes, TIMELINE opens, and the bar is in its lane', c.hit && !r.up && r.tl && r.place === 'work', JSON.stringify({ c, r }));
  c = await at(`__T.tr.el.door`); await click(c.x, c.y);
  r = await run(`await rest(up); await wait(60); return { up: up.isOpen(), tl: tl.isOpen(), place: tr.placement };`);
  check('the door in the timeline\'s work lane switches back: TIMELINE closes, UPPER opens, the bar is on the stage', c.hit && r.up && !r.tl && r.place === 'stage', JSON.stringify({ c, r }));

  /* ── the door's palette diamond cycles under a hovering mouse, never interpolated, and rests on leave ── */
  c = await at(`__T.tr.el.door`);
  const fills = () => p.eval(`JSON.stringify([...__T.tr.el.door.querySelectorAll('.mod-palette-mark rect')].map((t) => t.getAttribute('fill')))`).then(JSON.parse);
  const rest0 = await fills();
  await mouse('mouseMoved', c.x, c.y); await sleep(560);
  const moved = await fills();
  await mouse('mouseMoved', 5, 5); await sleep(60);
  const back = await fills();
  const PAL = ['#f15b66', '#f5bf5e', '#5bcfc2', '#f58b53', '#68cb83', '#767fd3', '#bad969', '#5ca9e4', '#b979d0'];
  check('the door\'s diamond: MIR\'s nine swatches at rest, stepped (exact swatches) while a mouse hovers, back at rest on leave',
    JSON.stringify(rest0) === JSON.stringify(PAL) && JSON.stringify(moved) !== JSON.stringify(rest0) && moved.every((f) => PAL.includes(f)) && JSON.stringify(back) === JSON.stringify(rest0), JSON.stringify({ rest0, moved, back }));

} catch (e) {
  results.push('FAIL  the run threw — ' + (e && e.stack || e));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} of ${results.length} transport-placement checks FAILED` : `\nALL ${results.length} transport-placement checks passed`);
process.exit(failed ? 1 : 0);
