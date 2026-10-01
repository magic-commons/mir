/* info.browser.mjs — INFORMATIONAL under a real browser and a real pointer (tests/fixtures/info.html).
 *   AGAINST THE CURSOR: after the dwell the block ends on the far side of the subject from the pointer, and a pin
 *     shows once · REACHING IS NOT FLEEING: moving toward the block, then resting on it, never moves it · EDIT: a
 *     dragged label's line is legal (0°, 45°, 90°) at every sampled frame and its neighbours yield · the layer never
 *     eats a click (elementFromPoint under a label is the stage when EDIT is off) · at rest every body sits exactly
 *     on its resting place · reduced motion enters with a fade only · IDLE: after everything settles no rAF is
 *     booked or requested.
 * Run by tests/run.mjs with MIR_BASE set; standalone: MIR_BASE=http://127.0.0.1:8851 node tests/info.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8851';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  await p.goto(BASE + '/tests/fixtures/info.html', 800);
  for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, L = T.layer, D = () => L.debug();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const item = (id) => D().items.find((i) => i.id === id);
    ${body} })().then(JSON.stringify)`));
  let down = false;                                                   // a move while pressed carries the button, as a real drag does
  const mouse = (type, x, y) => {
    if (type === 'mousePressed') down = true; if (type === 'mouseReleased') down = false;
    const held = down && type === 'mouseMoved';
    return p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: down ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });
  };
  const glide = async (x0, y0, x1, y1, n = 12, ms = 25) => { for (let i = 1; i <= n; i++) { await mouse('mouseMoved', x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n); await sleep(ms); } };
  const settle = () => run(`for (let i = 0; i < 80 && (D().running || D().items.some((i) => !i.measured)); i++) await wait(50); await wait(80); return D();`);
  /* a path is legal when every segment longer than a pixel is flat, vertical or at 45° (coordinates are rounded to 0.01 px) */
  const LEGAL = `const legal = (d) => { const n = d.match(/-?[\\d.]+/g).map(Number), cmds = d.match(/[ML]/g); let at = null, bad = []; let k = 0;
      for (const c of cmds) { const q = { x: n[k++], y: n[k++] }; if (c === 'L' && at) { const dx = Math.abs(q.x - at.x), dy = Math.abs(q.y - at.y);
        if (Math.hypot(dx, dy) > 1 && !(dy <= 0.03 || dx <= 0.03 || Math.abs(dx - dy) <= 0.04)) bad.push([dx.toFixed(2), dy.toFixed(2)]); } at = q; } return bad; };`;

  let s = await settle();
  check('fixture: the block and three labels are measured and at rest', s.items.length === 4 && s.items.every((i) => i.measured) && !s.running, JSON.stringify(s.items.map((i) => i.id)));
  check('rest: every body sits EXACTLY on its resting place', s.items.every((i) => i.x === i.rx && i.y === i.ry), JSON.stringify(s.items.map((i) => [i.id, +(i.x - i.rx).toFixed(4), +(i.y - i.ry).toFixed(4)])));
  r0: {
    const legalAll = await run(`${LEGAL} return D().groups.map((g) => ({ k: g.key, bad: legal(g.d), d: g.d }));`);
    check('lines: every leader at rest is legal, and the comb is drawn', legalAll.every((g) => g.bad.length === 0 && g.d.length > 0) && legalAll.length === 2, JSON.stringify(legalAll.map((g) => g.k + ':' + g.bad.length)));
  }

  /* ── the layer never eats a click ── */
  let r = await run(`const el = document.querySelector('[data-id="la"]'), b = el.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { id: hit && hit.id, cls: hit && hit.className };`);
  check('click-through: elementFromPoint under a label is the STAGE while EDIT is off', r.id === 'stage', JSON.stringify(r));

  /* ── AGAINST THE CURSOR ── */
  const blk = (await run(`return item('blk');`));
  check('block: it starts on the right of the subject', blk.x > 740, `x ${blk.x.toFixed(1)}`);
  await mouse('mouseMoved', 100, 700); await sleep(50);
  await glide(100, 700, 790, 700, 10, 25);                            // across the centre line, well past 8 %, below the block
  r = await run(`await wait(120); const early = item('blk'); return { earlySide: early.rx < 540 ? 'left' : 'right' };`);
  check('dwell: just after crossing, the block has not moved yet', r.earlySide === 'right', JSON.stringify(r));
  s = await run(`await wait(600); for (let i = 0; i < 60 && D().running; i++) await wait(50); await wait(50);
    return { blk: item('blk'), pin: document.querySelector('[data-id="blk"] .mir-info-pin').hasAttribute('data-show') };`);
  check('against the cursor: after the dwell the block rests on the FAR side (left) of the subject', s.blk.x + s.blk.w < 540 && s.blk.x === s.blk.rx, `x ${s.blk.x.toFixed(1)} w ${s.blk.w.toFixed(1)}`);
  check('the pin: the first time the block moves away, its pin shows', s.pin);

  /* ── REACHING IS NOT FLEEING ── */
  const before = s.blk;
  await mouse('mouseMoved', 1150, 420); await sleep(30);
  const samples = [];
  for (let i = 1; i <= 16; i++) {                                    // straight at the block, crossing the centre line
    await mouse('mouseMoved', 1150 - i * ((1150 - (before.x + before.w / 2)) / 16), 420);
    await sleep(28);
    if (i % 4 === 0) samples.push((await run(`return item('blk');`)).rx);
  }
  r = await run(`await wait(900); return { blk: item('blk'), reach: document.querySelector('[data-id="blk"]').hasAttribute('data-reach'), op: getComputedStyle(document.querySelector('[data-id="blk"]')).opacity };`);
  check('reaching: moving toward the block and resting on it never moves it', samples.every((x) => x === before.rx) && r.blk.rx === before.rx && Math.abs(r.blk.x - before.x) < 0.5, JSON.stringify({ samples, rx: r.blk.rx, was: before.rx }));
  check('reaching: the block is at full strength while reached for', r.reach && +r.op === 1, JSON.stringify({ reach: r.reach, op: r.op }));
  await glide(before.x + before.w / 2, 420, 640, 760, 8, 25);       // out, down to a neutral place on the centre line
  await sleep(500);

  /* ── EDIT: drag a label; the line stays legal at every sampled frame; the neighbours yield ── */
  await run(`L.setEdit(true); return 0;`);
  const la = await run(`const b = document.querySelector('[data-id="la"]').getBoundingClientRect(); return { x: b.left + 20, y: b.top + 10 };`);
  const lb = await run(`return item('lb1');`);
  r = await run(`const el = document.querySelector('[data-id="la"]'), b = el.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + 20, b.top + 10); return { inLabel: !!(hit && hit.closest('[data-id="la"]')) };`);
  check('EDIT: the label takes the pointer only while EDIT is on', r.inLabel);
  await mouse('mouseMoved', la.x, la.y); await mouse('mousePressed', la.x, la.y);
  const laItem = await run(`return item('la');`);
  /* the hand's offsets: around the subject, then straight onto the comb's first label and held there, then away */
  const onto = [lb.x + 10 - laItem.x, lb.y + 8 - laItem.y];
  const bad = [], drops = [[-60, 40], [-160, 120], [-300, 190], [onto[0] * 0.8, onto[1] * 0.8], onto, onto, onto, [-470, 60], [-250, -80], [-60, -150], [80, 40]];
  let i0 = 0, pushed = 0;
  for (const [dx, dy] of drops) {
    for (let k = 1; k <= 4; k++) {
      const [px0, py0] = i0 ? drops[i0 - 1] : [0, 0];
      await mouse('mouseMoved', la.x + px0 + ((dx - px0) * k) / 4, la.y + py0 + ((dy - py0) * k) / 4);
      await sleep(18);
      const g = await run(`${LEGAL} return { g: D().groups.map((g) => ({ k: g.key, bad: legal(g.d) })), n: item('lb1') };`);
      for (const x of g.g) if (x.bad.length) bad.push(x);
      pushed = Math.max(pushed, Math.hypot(g.n.x - lb.x, g.n.y - lb.y));
    }
    i0++;
  }
  await mouse('mouseReleased', la.x + 80, la.y + 40);
  check(`EDIT: the dragged label's line is legal at every sampled frame (${drops.length * 4} samples, both lines)`, bad.length === 0, JSON.stringify(bad.slice(0, 3)));
  check('EDIT: a neighbour yielded while the label was carried onto it', pushed > 20, `the neighbour moved up to ${pushed.toFixed(1)} px`);
  s = await settle();
  const la2 = s.items.find((i) => i.id === 'la');
  check('EDIT: dropped, the label rests where the hand left it (its new place is kept)', Math.abs(la2.x - (la.x + 80 - 20)) < 2 && Math.abs(la2.y - (la.y + 40 - 10)) < 2 && la2.x === la2.rx, `at ${la2.x.toFixed(1)},${la2.y.toFixed(1)} want ${la.x + 60},${la.y + 30}`);
  await run(`L.setEdit(false); return 0;`);

  /* ── follow: the anchor moves, the label trails on its spring and lands exactly ── */
  r = await run(`const a0 = item('la'); T.F.a.x += 60; T.F.a.y += 30; L.viewChanged();
    await wait(70); const mid = item('la');
    for (let i = 0; i < 60 && D().running; i++) await wait(50); await wait(50); const end = item('la');
    return { lag: (a0.x + 60) - mid.x, end: [end.x - (a0.x + 60), end.y - (a0.y + 30)], exact: end.x === end.rx && end.y === end.ry };`);
  check('follow: a label trails its moving anchor on the spring, then lands exactly', r.lag > 2 && Math.abs(r.end[0]) < 0.01 && Math.abs(r.end[1]) < 0.01 && r.exact, JSON.stringify(r));

  /* ── reduced motion: the entrance is a fade, nothing travels ── */
  r = await run(`T.motion.setMotionPolicy('reduced'); await L.replay(); await wait(30);
    const kf = [...document.querySelectorAll('.mir-info *, .mir-info')].flatMap((e) => e.getAnimations()).filter((a) => !(a instanceof CSSTransition)).flatMap((a) => a.effect.getKeyframes());
    const moves = kf.some((k) => 'transform' in k || 'translate' in k || 'scale' in k || 'strokeDashoffset' in k);
    await wait(300); T.motion.setMotionPolicy('auto'); return { n: kf.length, moves };`);
  check('reduced motion: the entrance is an opacity fade only', r.n > 0 && !r.moves, JSON.stringify(r));

  /* ── HOLD STILL: Space freezes everything ── */
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  r = await run(`await wait(30); const f = D().frozen; const h = document.querySelector('.mir-info').hasAttribute('data-hold'); return { f, h };`);
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  const after = await run(`await wait(30); return D().frozen;`);
  check('hold still: Space held freezes the layer; released, it lets go', r.f && r.h && after === false, JSON.stringify({ ...r, after }));

  /* ── the idle law ── */
  await mouse('mouseMoved', 640, 780);
  await sleep(1500);
  r = await run(`T.perf.reset(); const raf0 = window.__rafCalls; await wait(600);
    return { snap: T.perf.snapshot(), rafs: window.__rafCalls - raf0, state: T.frame.state(), running: D().running };`);
  check('idle: after everything settles no rAF is booked and none is requested over 600 ms', r.rafs === 0 && !r.state.scheduled && r.state.pending === 0 && !r.running, JSON.stringify({ rafs: r.rafs, state: r.state }));
  check('idle: __MIR.perf shows zero writes, reads and frames', r.snap.writes === 0 && r.snap.reads === 0 && r.snap.frames === 0, JSON.stringify(r.snap));
  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} info checks FAILED` : `ALL ${results.length} MIR info browser checks passed`);
process.exit(failed.length ? 1 : 0);
