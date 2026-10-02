/* info-pages.browser.mjs — INFORMATIONAL shows PAGES (info/page.js) under a real browser (tests/fixtures/info-pages.html).
 *   A page with a feature label, a place label and a control label (ui:) shows all three with legal lines · the ui:
 *   label follows its control when the control moves (no viewChanged from the app) · a place that leaves the stage
 *   hides its label and line, and they come back · switching page leaves no node of the old page · PANE gives a block a
 *   background, BARE none · the greeting shows only when shouldGreet(), holds, and Escape dismisses it · click-through
 *   (the stage under a label, the control under its own dot) · the idle law with drift off and a ui: label live.
 * Standalone: node tools/serve.mjs 8793 & MIR_BASE=http://127.0.0.1:8793 node tests/info-pages.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8851';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  await p.goto(BASE + '/tests/fixtures/info-pages.html', 800);
  for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, L = T.layer, D = () => L.debug();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const settle = async () => { for (let i = 0; i < 100 && (D().running || D().items.some((i) => !i.measured)); i++) await wait(50); await wait(120); };
    const lab = (t) => [...document.querySelectorAll('.mir-info-label')].find((e) => e.textContent.includes(t));
    ${body} })().then(JSON.stringify)`));
  const LEGAL = `const legal = (d) => { const n = d.match(/-?[\\d.]+/g).map(Number), cmds = d.match(/[ML]/g); let at = null, bad = []; let k = 0;
      for (const c of cmds) { const q = { x: n[k++], y: n[k++] }; if (c === 'L' && at) { const dx = Math.abs(q.x - at.x), dy = Math.abs(q.y - at.y);
        if (Math.hypot(dx, dy) > 1 && !(dy <= 0.03 || dx <= 0.03 || Math.abs(dx - dy) <= 0.04)) bad.push([dx.toFixed(2), dy.toFixed(2)]); } at = q; } return bad; };`;
  const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });
  await mouse('mouseMoved', 640, 790);

  /* ── a page: a feature, a place, a control ── */
  let r = await run(`window.__one = T.showPage(L, T.ONE, { place: T.place }); await settle(); ${LEGAL}
    const g = D().groups; const over = document.querySelector('.mir-info-over');
    const knob = document.getElementById('knob-btn').getBoundingClientRect(), stage = document.getElementById('stage').getBoundingClientRect();
    const og = over && over.querySelector('.mir-info-leader'), dot = og && og.querySelector('.mir-info-dot');
    const dx = dot ? +dot.getAttribute('cx') + stage.left : 0, dy = dot ? +dot.getAttribute('cy') + stage.top : 0;
    return { n: D().items.length, labels: document.querySelectorAll('.mir-info-label').length, groups: g.map((x) => ({ k: x.key, bad: legal(x.d), len: x.d.length })),
      lines: ['Feature A', 'A note', 'The knob'].map((t) => lab(t) && lab(t).getAttribute('data-line')),
      overlay: !!og && og.getAttribute('data-state') === 'in', dot: [dx, dy], knob: [knob.left, knob.top, knob.right, knob.bottom],
      vis: ['Feature A', 'A note', 'The knob'].map((t) => lab(t) && getComputedStyle(lab(t)).visibility) };`);
  const k = r.knob, onEdge = r.dot[0] >= k[0] - 1 && r.dot[0] <= k[2] + 1 && r.dot[1] >= k[1] - 1 && r.dot[1] <= k[3] + 1;
  check('a page: one block and three labels (feature, place, control), all shown', r.n === 4 && r.labels === 3 && r.vis.every((v) => v === 'visible'), JSON.stringify({ n: r.n, vis: r.vis }));
  check('a page: every line is legal (0°, 45°, 90°), the control\'s too', r.groups.length === 3 && r.groups.every((g) => g.len > 0 && g.bad.length === 0), JSON.stringify(r.groups.map((g) => g.k + ':' + g.bad.length)));
  check('lines by job: the feature diagonal-first, the place and the control flat-first', r.lines.join() === 'diagonal-first,flat-first,flat-first', r.lines.join());
  check('the control\'s line is on the document-wide overlay, its dot on the knob in the rack', r.overlay && onEdge, JSON.stringify({ dot: r.dot, knob: k }));

  /* ── click-through: the layer and the overlay never take a click ── */
  r = await run(`const b = lab('Feature A').getBoundingClientRect(), hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const k = document.getElementById('knob-btn').getBoundingClientRect(), hk = document.elementFromPoint(k.left + k.width / 2, k.top + k.height / 2);
    return { label: hit && (hit.closest('#stage') ? 'stage' : hit.className), knob: hk && hk.id };`);
  check('click-through: under a label is the stage; under the control\'s dot and line is the control', r.label === 'stage' && r.knob === 'knob-btn', JSON.stringify(r));

  /* ── the ui: label follows its control (the app says nothing: a style change outside the layer is enough) ── */
  r = await run(`const g0 = D().groups.find((g) => g.key === 'f:ui:knob'), l0 = D().items.find((i) => lab('The knob') && i.id === lab('The knob').dataset.id);
    const btn = document.getElementById('knob-btn'); btn.style.top = '520px'; btn.style.left = '40px';
    await wait(60); await settle();
    const g1 = D().groups.find((g) => g.key === 'f:ui:knob'), l1 = D().items.find((i) => i.id === l0.id); ${LEGAL}
    return { dA: [g1.A.x - g0.A.x, g1.A.y - g0.A.y], dL: [l1.rx - l0.rx, l1.ry - l0.ry], bad: legal(g1.d) };`);
  check('a ui: label follows its control when the control moves, and its line stays legal', Math.abs(r.dA[0] + 50) < 1 && Math.abs(r.dA[1] - 220) < 1 && Math.abs(r.dL[1]) > 50 && r.bad.length === 0, JSON.stringify(r));

  /* ── a place that leaves the stage hides its label and line; back, they return ── */
  r = await run(`const el = lab('A note'), id = el.dataset.id; T.PL.p1 = { x: -400, y: 450, r: 4 }; L.viewChanged(); await wait(400);
    const g = [...document.querySelectorAll('.mir-info-leader')].find((x) => x.hasAttribute('data-gone'));
    const gone = { attr: el.hasAttribute('data-gone'), vis: getComputedStyle(el).visibility, line: !!g && getComputedStyle(g).visibility };
    T.PL.p1 = { x: 380, y: 450, r: 4 }; L.viewChanged(); await wait(400); await settle();
    const it = D().items.find((i) => i.id === id);
    return { gone, back: { attr: el.hasAttribute('data-gone'), vis: getComputedStyle(el).visibility, exact: it.x === it.rx + it.ox && it.y === it.ry + it.oy } };`);
  check('a place off the stage hides its label and its line; back on the stage they return, on their seat', r.gone.attr && r.gone.vis === 'hidden' && r.gone.line === 'hidden' && !r.back.attr && r.back.vis === 'visible' && r.back.exact, JSON.stringify(r));

  /* ── the idle law, with drift off and a live ui: label (its watcher must not wake the layer) ── */
  await sleep(800);
  r = await run(`T.perf.reset(); const raf0 = window.__rafCalls; await wait(600);
    return { snap: T.perf.snapshot(), rafs: window.__rafCalls - raf0, state: T.frame.state(), running: D().running };`);
  check('idle: with a page and a ui: label at rest, no rAF and zero writes, reads and frames over 600 ms', r.rafs === 0 && !r.state.scheduled && !r.running && r.snap.writes === 0 && r.snap.reads === 0 && r.snap.frames === 0, JSON.stringify({ rafs: r.rafs, snap: r.snap }));

  /* ── switching page: the old page's exit, the new page's entrance, nothing of the old one left ── */
  r = await run(`const old = D().items.map((i) => i.id); window.__two = T.showPage(L, T.TWO); await wait(700); await settle();
    const now = D().items.map((i) => i.id), left = old.filter((id) => document.querySelector('[data-id="' + id + '"]'));
    return { now: now.length, left, labels: document.querySelectorAll('.mir-info-label').length, leaders: document.querySelectorAll('.mir-info-leader').length, text: document.querySelector('.mir-info-block').textContent.slice(0, 8) };`);
  check('switching page leaves no node of the old page (labels, lines, the overlay\'s line)', r.now === 1 && r.left.length === 0 && r.labels === 0 && r.leaders === 0 && r.text === 'Page two', JSON.stringify(r));

  /* ── BARE or PANE ── */
  r = await run(`const b = document.querySelector('.mir-info-block'), cs = () => { const s = getComputedStyle(b); return { bg: s.backgroundColor, img: s.backgroundImage, before: getComputedStyle(b, '::before').display, filter: s.backdropFilter }; };
    const bare = cs(); L.setPane(true); await wait(50); const pane = cs();
    document.body.dataset.card = 'refractive'; await wait(30); const refr = cs(); document.body.dataset.card = 'tinted';
    L.setPane(false); await wait(50); const back = cs();
    const p2 = T.showPage(L, T.TWO, { pane: true }); await wait(700); await settle(); const own = getComputedStyle(document.querySelector('.mir-info-block')).backgroundImage;
    return { bare, pane, refr, back, own, tinted: pane.filter };`);
  const none = (s) => s.bg === 'rgba(0, 0, 0, 0)' && s.img === 'none';
  check('BARE has no background (the soft darkness only); PANE has one, and no shade under it', none(r.bare) && r.bare.before !== 'none' && !none(r.pane) && r.pane.before === 'none' && none(r.back), JSON.stringify({ bare: r.bare, pane: r.pane }));
  check('PANE: TINTED never blurs, REFRACTIVE carries the blur; a page can ask for the pane itself', r.tinted === 'none' && /blur/.test(r.refr.filter) && r.own !== 'none', JSON.stringify({ tinted: r.tinted, refr: r.refr.filter, own: r.own }));

  /* ── the greeting: only when shouldGreet(), holds, a press during the hold keeps it, Escape dismisses it ── */
  r = await run(`await L.clear(); const P = T.createPages(); const g = P.add({ title: 'Greeting', md: '   ' });
    const none = T.greet(L, P, { hold: 900 }); P.update(g.id, { md: '# Hello\\nThe greeting is page 0.' });
    window.__g = T.greet(L, P, { hold: 900 }); await wait(250); await settle();
    return { none: none.shown, shown: window.__g.shown, blocks: document.querySelectorAll('.mir-info-block').length };`);
  await mouse('mouseMoved', 120, 120); await mouse('mousePressed', 120, 120); await mouse('mouseReleased', 120, 120);
  const during = await run(`await wait(100); return document.querySelectorAll('.mir-info-block').length;`);
  await sleep(900);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  const after = await run(`await wait(600); return document.querySelectorAll('.mir-info-block').length;`);
  check('the greeting: not shown without text; shown with it; a press during the hold keeps it; Escape dismisses it', r.none === false && r.shown && r.blocks === 1 && during === 1 && after === 0, JSON.stringify({ ...r, during, after }));
  r = await run(`const P = T.createPages(); P.add({ title: 'G', md: 'Hello again' }); window.__g = T.greet(L, P, { hold: 300 }); await wait(500); await settle(); return document.querySelectorAll('.mir-info-block').length;`);
  await mouse('mousePressed', 120, 120); await mouse('mouseReleased', 120, 120);
  const pressed = await run(`await wait(600); return document.querySelectorAll('.mir-info-block').length;`);
  check('the greeting: after the hold, the first press on the stage dismisses it', r === 1 && pressed === 0, JSON.stringify({ shown: r, pressed }));

  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} info pages checks FAILED` : `ALL ${results.length} MIR info pages browser checks passed`);
process.exit(failed.length ? 1 : 0);
