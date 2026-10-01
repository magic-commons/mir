/* core.browser.mjs — the core under a real browser (tests/fixtures/core.html).
 * THE RELIABILITY LAW for flip, tweenRect and presence: (a) retargeted halfway it lands exactly on the new target
 * with nothing left inline; (b) ten rapid triggers end on the last one; (c) under reduced motion nothing moves and
 * the end state is immediate; (d) while it runs owns() is true and a deferred placement runs once, after it lands.
 * Then the drag gesture (coalesced moves, the flushed final sample, every cancel path rolls back, .press under a
 * finger), the proximity guide, the pointer field, and the idle law.
 * Run by tests/run.mjs with MIR_BASE set; standalone: MIR_BASE=http://127.0.0.1:8835 node tests/core.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8835';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  await p.goto(BASE + '/tests/fixtures/core.html', 800);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  /** run an async body in the page and get its value back as JSON */
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, M = T.motion, $ = (id) => document.getElementById(id);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const R = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; };
    const off = (a, b) => Math.max(...['left', 'top', 'width', 'height'].map((k) => Math.abs(a[k] - b[k])));
    const clean = (el) => el.getAnimations().length === 0 && !el.style.translate && !el.style.scale && !el.style.transform && !el.style.opacity && !M.owns(el);
    ${body} })().then(JSON.stringify)`));

  /* ── tweenRect ─────────────────────────────────────────────────────────────────────────────────────────── */
  let r = await run(`
    const el = $('tw'), B = { left: 400, top: 100, width: 200, height: 120 }, C = { left: 220, top: 420, width: 160, height: 60 };
    M.tweenRect(el, B); const owned = M.owns(el);
    await wait(150); const leftMid = el.style.left; const v0 = R(el);
    const p2 = M.tweenRect(el, C); const v1 = R(el);
    const landed = await p2; await M.settled(el);
    return { owned, leftMid, jump: off(v0, v1), landed, off: off(R(el), C), clean: clean(el), left: el.style.left };`);
  check('tweenRect (a): retargeted halfway it continues from where it was seen', r.jump < 0.5, `jump ${r.jump.toFixed(3)} px`);
  check('tweenRect (a): and lands exactly on the new target, nothing left inline but the committed layout', r.landed && r.off < 0.5 && r.clean, `off ${r.off.toFixed(3)} px · clean ${r.clean} · left ${r.left}`);
  check('tweenRect: layout is not written mid-flight (commit once, at the end)', r.leftMid === '' , `style.left mid-flight '${r.leftMid}'`);
  check('tweenRect (d): owns(el) is true while it runs', r.owned);

  r = await run(`
    const el = $('tw'); let T9;
    for (let i = 0; i < 10; i++) { T9 = { left: 40 + i * 37, top: 200 + (i % 3) * 61, width: 100 + i * 9, height: 50 + (i % 4) * 13 }; M.tweenRect(el, T9); await wait(17); }
    await M.settled(el); return { off: off(R(el), T9), clean: clean(el) };`);
  check('tweenRect (b): ten rapid triggers end on the last target', r.off < 0.5 && r.clean, `off ${r.off.toFixed(3)} px`);

  r = await run(`
    const el = $('tw'), B = { left: 500, top: 150, width: 140, height: 90 }, C = { left: 120, top: 240, width: 180, height: 70 };
    let placed = 0, at = null, ownsAt = null;
    M.tweenRect(el, B);
    if (M.owns(el)) M.settled(el).then(() => { placed++; at = R(el); ownsAt = M.owns(el); });   // the caller defers
    await wait(100); M.tweenRect(el, C); await wait(60); const early = placed;
    await M.settled(el); await wait(30);
    return { early, placed, off: off(at, C), ownsAt };`);
  check('tweenRect (d): a deferred placement waits through a retarget and runs ONCE, after the last landing', r.early === 0 && r.placed === 1 && r.off < 0.5 && r.ownsAt === false, JSON.stringify(r));

  r = await run(`
    const el = $('tw'), D = { left: 300, top: 300, width: 150, height: 100 };
    M.setMotionPolicy('reduced'); const html = document.documentElement.dataset.motion;
    M.tweenRect(el, D); const now = { off: off(R(el), D), anims: el.getAnimations().length, owns: M.owns(el) };
    M.setMotionPolicy('auto'); return { html, ...now };`);
  check('tweenRect (c): under reduced motion it lands at once, no animation', r.off < 0.5 && r.anims === 0 && !r.owns && r.html === 'reduced', JSON.stringify(r));

  /* ── flip ──────────────────────────────────────────────────────────────────────────────────────────────── */
  const expect = `const top0 = $('list').getBoundingClientRect().top; const want = (ids) => ids.every((id, k) => Math.abs($('i' + id).getBoundingClientRect().top - (top0 + k * 34)) < 0.5);
    const allClean = () => T.items.every(clean);`;
  r = await run(`${expect}
    const items = () => T.items;
    M.flip(items, () => T.order([4, 3, 2, 1, 0])); const owned = M.owns($('i0'));
    await wait(150); const v0 = R($('i0')), v4 = R($('i4'));
    M.flip(items, () => T.order([2, 0, 4, 1, 3])); const v0b = R($('i0')), v4b = R($('i4'));
    await Promise.all(T.items.map(M.settled));
    return { owned, jump: Math.max(off(v0, v0b), off(v4, v4b)), lands: want([2, 0, 4, 1, 3]), clean: allClean() };`);
  check('flip (a): reordered again halfway, every item continues from where it was seen', r.jump < 0.5, `jump ${r.jump.toFixed(3)} px`);
  check('flip (a): and every item lands on its new slot with nothing left behind', r.lands && r.clean);
  check('flip (d): owns() is true for a moving item', r.owned);
  r = await run(`${expect}
    const orders = [[1,0,2,3,4],[3,1,0,4,2],[0,1,2,3,4],[4,0,3,1,2],[2,4,1,0,3],[1,3,4,2,0],[0,2,1,4,3],[3,4,0,2,1],[4,2,3,0,1],[1,4,2,3,0]];
    for (const o of orders) { M.flip(T.items, () => T.order(o)); await wait(19); }
    await Promise.all(T.items.map(M.settled)); return { lands: want(orders[9]), clean: allClean() };`);
  check('flip (b): ten rapid reorders end in the last order', r.lands && r.clean);
  r = await run(`${expect}
    let placed = 0; M.flip(T.items, () => T.order([0, 1, 2, 3, 4])); M.settled($('i4')).then(() => placed++);
    await wait(90); M.flip(T.items, () => T.order([4, 3, 2, 1, 0])); await wait(40); const early = placed;
    await Promise.all(T.items.map(M.settled)); await wait(20);
    M.setMotionPolicy('reduced'); M.flip(T.items, () => T.order([0, 1, 2, 3, 4]));
    const instant = want([0, 1, 2, 3, 4]) && T.items.every((n) => n.getAnimations().length === 0); M.setMotionPolicy('auto');
    return { early, placed, instant };`);
  check('flip (d): a deferred placement runs once, after the retargeted item lands', r.early === 0 && r.placed === 1, JSON.stringify(r));
  check('flip (c): under reduced motion the new order is immediate, no animation', r.instant);

  /* ── presence ──────────────────────────────────────────────────────────────────────────────────────────── */
  r = await run(`
    const el = $('panel'); const owned0 = M.owns(el);
    M.presence(el, true); const shownAtOnce = !el.hidden, owned = M.owns(el);
    await wait(80); const o0 = +getComputedStyle(el).opacity, v0 = R(el);
    M.presence(el, false); const o1 = +getComputedStyle(el).opacity, v1 = R(el);
    await M.settled(el); const hiddenAfter = el.hidden, clean1 = clean(el);
    M.presence(el, true); await M.settled(el);
    return { owned0, shownAtOnce, owned, mid: o0, jump: Math.abs(o0 - o1) + off(v0, v1), hiddenAfter, clean1, back: !el.hidden && getComputedStyle(el).opacity === '1' && clean(el) };`);
  check('presence (a): an entrance reversed halfway turns around from where it is', r.mid > 0.05 && r.mid < 0.98 && r.jump < 0.02, `opacity at reverse ${r.mid.toFixed(3)}, jump ${r.jump.toFixed(4)}`);
  check('presence (a): the exit lands hidden and clean; shown again it lands opaque and clean', r.hiddenAfter && r.clean1 && r.back);
  check('presence (d): owns() is true while it runs, the element is shown before its entrance', !r.owned0 && r.owned && r.shownAtOnce);
  r = await run(`
    const el = $('panel'); let want;
    for (let i = 0; i < 10; i++) { want = i % 3 !== 0; M.presence(el, want); await wait(13); }   // ends on hide
    await M.settled(el); const a = { hidden: el.hidden, want, clean: clean(el) };
    for (let i = 0; i < 10; i++) { want = i % 2 === 1; M.presence(el, want); await wait(11); }   // alternating, ending on show
    await M.settled(el); return { a, b: { hidden: el.hidden, want, clean: clean(el) } };`);
  check('presence (b): ten rapid toggles end in the last state', r.a.hidden === !r.a.want && r.a.clean && r.b.hidden === !r.b.want && r.b.clean, JSON.stringify(r));
  r = await run(`
    const el = $('panel'); el.hidden = true;
    M.setMotionPolicy('off'); M.presence(el, true); const off1 = { shown: !el.hidden, anims: el.getAnimations().length, owns: M.owns(el) };
    M.presence(el, false); const off2 = el.hidden;
    M.setMotionPolicy('reduced'); M.presence(el, true);
    const kf = el.getAnimations()[0] ? el.getAnimations()[0].effect.getKeyframes() : [];
    const moves = kf.some((k) => 'translate' in k || 'scale' in k || 'transform' in k);
    await M.settled(el); M.setMotionPolicy('auto');
    return { off1, off2, kfs: kf.length, moves, shown: !el.hidden && clean(el) };`);
  check('presence (c): under motion OFF open and close are immediate', r.off1.shown && r.off1.anims === 0 && !r.off1.owns && r.off2, JSON.stringify(r.off1));
  check('presence (c): under REDUCED nothing moves — the entrance is an opacity fade only', r.kfs === 2 && !r.moves && r.shown, JSON.stringify(r));

  /* ── pointer: the drag gesture ─────────────────────────────────────────────────────────────────────────── */
  const mouse = (type, x, y, mods = 0) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, modifiers: mods });
  const resetBox = async () => JSON.parse(await p.eval(`(() => { const b = document.getElementById('box'); b.style.left = '40px'; b.style.top = '600px'; b.style.width = ''; b.style.height = ''; __T.log.length = 0; const r = b.getBoundingClientRect(); return JSON.stringify({ left: r.left, top: r.top }); })()`));
  const home = await resetBox();
  await mouse('mouseMoved', 80, 640); await mouse('mousePressed', 80, 640);
  for (let i = 1; i <= 5; i++) await mouse('mouseMoved', 80 + i * 4, 640 - i * 2);
  await sleep(50);
  /* Chromium already aligns REAL mouse moves to the frame, one per frame; a burst inside one task is what a busy
     main thread or a high-rate pen delivers, and that is what the coalescer is for */
  const burst = await run(`const id = T.log.find((e) => e[0] === 'start')[3], n0 = T.log.filter((e) => e[0] === 'move').length;
    for (let i = 1; i <= 30; i++) $('box').dispatchEvent(new PointerEvent('pointermove', { pointerId: id, isPrimary: true, pointerType: 'mouse', clientX: 100 + i * 3, clientY: 630 - i, bubbles: true }));
    await wait(60); const moves = T.log.filter((e) => e[0] === 'move');
    return { added: moves.length - n0, last: moves[moves.length - 1] };`);
  check('drag: thirty pointer moves inside one frame reach onMove ONCE, with the latest sample', burst.added === 1 && burst.last[1] === 190 && burst.last[2] === 600, JSON.stringify(burst));
  await mouse('mouseMoved', 207, 579);
  await mouse('mouseReleased', 207, 579);
  await sleep(100);
  r = await run(`const L = T.log, moves = L.filter((e) => e[0] === 'move'), end = L.find((e) => e[0] === 'end'), lastMove = moves[moves.length - 1];
    return { n: moves.length, end, lastMove, box: R($('box')), order: L.map((e) => e[0]).join(',') };`);
  check('drag: the release point is flushed as the last move BEFORE onEnd', r.lastMove && r.lastMove[1] === 207 && r.lastMove[2] === 579 && r.end && r.end[1] === 207 && r.order.endsWith('move,end'), JSON.stringify({ lastMove: r.lastMove, end: r.end }));
  check('drag: the box followed the hand exactly', Math.abs(r.box.left - (home.left + 127)) < 0.5 && Math.abs(r.box.top - (home.top - 61)) < 0.5, JSON.stringify(r.box));

  /* each cancel path rolls back */
  const cancelled = async (label, trigger) => {
    await resetBox();
    await mouse('mouseMoved', 80, 640); await mouse('mousePressed', 80, 640);
    for (let i = 1; i <= 6; i++) await mouse('mouseMoved', 80 + i * 10, 640 - i * 10);
    await sleep(50); await trigger();
    await mouse('mouseMoved', 200, 500); await mouse('mouseReleased', 200, 500); await sleep(80);
    const s = await run(`return { kinds: T.log.map((e) => e[0]), box: R($('box')), active: T.g.active };`);
    check(`drag: ${label} cancels and rolls back`, s.kinds.includes('cancel') && !s.kinds.includes('end') && Math.abs(s.box.left - home.left) < 0.5 && Math.abs(s.box.top - home.top) < 0.5 && !s.active,
      `${s.kinds.filter((k) => k !== 'move').join(',')} · box ${s.box.left},${s.box.top}`);
  };
  await cancelled('Escape', async () => {
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  });
  await cancelled('window blur', () => p.eval(`window.dispatchEvent(new Event('blur'))`));

  /* a finger: pointercancel (the touch is taken by the system) and the press law */
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const touch = (type, x, y) => p.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
  await resetBox();
  await touch('touchStart', 80, 640);
  for (let i = 1; i <= 6; i++) await touch('touchMove', 80 + i * 10, 640 - i * 10);
  await sleep(50); await touch('touchCancel', 0, 0); await sleep(80);
  r = await run(`return { kinds: T.log.map((e) => e[0]), box: R($('box')) };`);
  check('drag: pointercancel (a touch taken away) cancels and rolls back', r.kinds.includes('start') && r.kinds.includes('cancel') && !r.kinds.includes('end') && Math.abs(r.box.left - home.left) < 0.5 && Math.abs(r.box.top - home.top) < 0.5, r.kinds.filter((k) => k !== 'move').join(','));
  await touch('touchStart', 1190, 42); await sleep(30);
  const pressed = await p.eval(`document.getElementById('btn').classList.contains('press')`);
  await touch('touchEnd', 0, 0); await sleep(30);
  const released = await p.eval(`!document.getElementById('btn').classList.contains('press')`);
  check('press: a finger gets .press on pointerdown and loses it on lift', pressed && released, `pressed ${pressed} · released ${released}`);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: false });

  /* ── proximity ─────────────────────────────────────────────────────────────────────────────────────────── */
  await resetBox();
  // the box's top-left starts at (40, 600); the landing corner is (400, 40).  Walk it there in steps.
  const path = [[0, 0], [150, -300], [300, -460], [320, -500], [340, -530], [352, -550], [356, -556], [360, -560]];
  await mouse('mouseMoved', 80, 640); await mouse('mousePressed', 80, 640);
  const seen = [];
  for (const [dx, dy] of path.slice(1)) {
    await mouse('mouseMoved', 80 + dx, 640 + dy); await sleep(60);
    seen.push(await run(`const o = document.querySelector('.mir-prox'); return o ? { prox: o.style.getPropertyValue('--prox'), state: o.dataset.prox || '', rect: R(o), d: T.last && T.last.distance } : null;`));
  }
  const guideRect = seen[seen.length - 1] && seen[seen.length - 1].rect;
  await mouse('mouseReleased', 80 + 360, 640 - 560);
  await sleep(50);
  const during = await run(`return { owns: M.owns($('box')) };`);
  await run(`await M.settled($('box')); await wait(260); return 0;`);
  r = await run(`const o = document.querySelector('.mir-prox'); return { box: R($('box')), state: o.dataset.prox ?? null, prox: o.style.getPropertyValue('--prox'), vis: getComputedStyle(o).visibility, op: getComputedStyle(o).opacity };`);
  const strengths = seen.map((s) => (s ? +s.prox || 0 : 0));
  const rising = strengths.every((v, i) => i === 0 || v >= strengths[i - 1] - 1e-9);
  check('proximity: the guide\'s strength rises as the probe approaches', rising && strengths[0] === 0 && strengths[strengths.length - 1] === 1, seen.map((s) => `${s && s.state}:${s && s.prox}`).join(' '));
  check('proximity: data-prox reaches "capture" inside the capture distance, and not before', seen.filter((s) => s && s.state === 'capture').every((s) => s.d <= 32) && seen[seen.length - 1].state === 'capture' && seen.some((s) => s && s.state === 'near'));
  const L = { left: 400, top: 40, width: 120, height: 80 };
  const offR = (a) => Math.max(...['left', 'top', 'width', 'height'].map((k) => Math.abs(a[k] - L[k])));
  check('proximity: the guide is drawn at the EXACT landing rect the caller passed', guideRect && offR(guideRect) < 0.5, JSON.stringify(guideRect));
  check('proximity: release inside capture lands the box on that rect with a tween', during.owns && offR(r.box) < 0.5, JSON.stringify(r.box));
  check('proximity: everything clears on end (no state, no strength, faded and invisible)', r.state === null && r.prox === '' && r.vis === 'hidden' && r.op === '0', JSON.stringify(r));

  /* ── the pointer field ─────────────────────────────────────────────────────────────────────────────────── */
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400 });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 950, y: 650 }); await sleep(60);
  const fieldIn = await run(`const t = $('tile'), s = t.style, b = R(t), u = (950 - b.left) / b.width, v = (650 - b.top) / b.height;
    return { px: s.getPropertyValue('--px'), py: s.getPropertyValue('--py'), pxs: s.getPropertyValue('--pxs'), pys: s.getPropertyValue('--pys'), at: t.dataset.pointer || '',
      want: [u.toFixed(3), v.toFixed(3), (2 * u - 1).toFixed(3), (2 * v - 1).toFixed(3)] };`);
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400 }); await sleep(60);
  const fieldOut = await run(`const t = $('tile'); return { px: t.style.getPropertyValue('--px'), at: t.dataset.pointer || '' };`);
  check('pointer field: --px/--py (0..1) and --pxs/--pys (−1..1) at the pointer', [fieldIn.px, fieldIn.py, fieldIn.pxs, fieldIn.pys].join() === fieldIn.want.join() && fieldIn.at === 'in', JSON.stringify(fieldIn));
  check('pointer field: cleaned on leave', fieldOut.px === '' && fieldOut.at === '', JSON.stringify(fieldOut));
  await run(`M.setMotionPolicy('reduced'); return 0;`);
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 950, y: 650 }); await sleep(60);
  const fieldReduced = await run(`const t = $('tile'); const v = t.style.getPropertyValue('--px'); M.setMotionPolicy('auto'); return v;`);
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400 }); await sleep(60);
  check('pointer field: under reduced motion it writes nothing', fieldReduced === '', `--px '${fieldReduced}'`);

  /* ── the idle law ──────────────────────────────────────────────────────────────────────────────────────── */
  await sleep(400);
  r = await run(`T.perf.reset(); const raf0 = window.__rafCalls; await wait(500);
    return { snap: T.perf.snapshot(), rafs: window.__rafCalls - raf0, state: T.frame.state() };`);
  check('idle: after everything settles no rAF is booked and none is requested over 500 ms', r.rafs === 0 && !r.state.scheduled && r.state.pending === 0, JSON.stringify({ rafs: r.rafs, state: r.state }));
  check('idle: __MIR.perf shows zero writes, reads, frames and timers over 500 ms', r.snap.writes === 0 && r.snap.reads === 0 && r.snap.frames === 0 && r.snap.timers === 0, JSON.stringify(r.snap));
  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} core checks FAILED` : `ALL ${results.length} MIR core browser checks passed`);
process.exit(failed.length ? 1 : 0);
