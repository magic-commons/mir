/* scene-guard.browser.mjs — shell/scene-guard.js through createApp(), with REAL wheel, mouse, touch and keys (CDP input):
 *   1. every probe point is first hit-tested with elementFromPoint: a gap in the floating window, a rounded corner of the
 *      KEYS window and a gap between two rack cards ARE the canvas underneath (so the guard is what decides), the
 *      picture's clear area is the canvas too
 *   2. a wheel in those gaps never reaches the picture; a wheel in the rack is re-dispatched to the rack (its scroller),
 *      which scrolls; a wheel in the clear area and in the rack's 48-px shadow gutter does reach it
 *   3. a mouse press and a touch tap in a gap start nothing on the picture (no pointerdown, no click); a drag begun on the
 *      picture keeps its moves and its up across a gap
 *   4. H hides the interface: the gap is the picture's again; H again brings it back
 *   5. the key table is BASINS': S opens FOLDERS, F is full screen (not FOLDERS), B hides the rack
 * Standalone: MIR_BASE=http://127.0.0.1:8842 node tests/scene-guard.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8842';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  await p.goto(BASE + '/tests/fixtures/scene-guard.html', 800);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await sleep(700);
  const ev = async (body) => JSON.parse(await p.eval(`(async () => { const G = __G, A = G.app, C = G.canvas; ${body} })().then(JSON.stringify)`));
  const seen = () => ev(`return { ...G.seen };`);
  const wheel = async (x, y, dy = 120) => { await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy }); await sleep(120); };
  const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' || type === 'mouseMoved' ? 0 : 1, clickCount: 1 });
  const drag = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });

  /* ── 1. the probe points, each hit-tested ── */
  const pts = await ev(`
    const at = (x, y) => { const h = document.elementFromPoint(x, y); return { x: Math.round(x), y: Math.round(y), canvas: h === C, got: h ? h.tagName + '.' + h.className : 'none' }; };
    const one = document.querySelector('.mir-rack-floats > .dev[data-id="one"]');
    const hd = one.querySelector('.dev-head').getBoundingClientRect(), bd = one.querySelector('.dev-body').getBoundingClientRect();
    const gap = at(hd.left + hd.width / 2, (hd.bottom + bd.top) / 2);
    const kw = document.querySelector('[data-mir-window="keys-help"]').getBoundingClientRect();
    const corner = at(kw.left + 1.5, kw.top + 1.5);
    const order = A.rack.order('right'), dv = (id) => document.querySelector('.mir-rack > .dev[data-id="' + id + '"]').getBoundingClientRect();
    const two = dv(order[0]), three = dv(order[1]);
    const rackGap = at(two.left + two.width / 2, (two.bottom + three.top) / 2);
    const rk = A.rack.el.racks.right.getBoundingClientRect(), gutterPx = parseFloat(getComputedStyle(A.rack.el.racks.right).getPropertyValue('--rack-shadow-gutter')) || 0;
    const gutter = at(rk.left + Math.min(20, gutterPx / 2), two.top + 20);
    const clear = at(Math.min(kw.left, one.getBoundingClientRect().left, rk.left) / 2, 200);
    return { gap, gapPx: bd.top - hd.bottom, corner, rackGap, rackGapPx: three.top - two.bottom, gutter, gutterPx, clear,
      rackCards: A.rack.order('right'), floating: A.rack.floating() };`);
  check('setup: ONE floats, TWO and THREE stand in the right rack, the KEYS window is open', pts.floating.includes('one') && pts.rackCards.slice().sort().join() === 'three,two', JSON.stringify({ f: pts.floating, r: pts.rackCards }));
  check('hit-test: the gap between the floating window\'s head and body is the canvas underneath (elementFromPoint)', pts.gap.canvas && pts.gapPx > 0, JSON.stringify(pts.gap) + ' gap ' + pts.gapPx);
  check('hit-test: the KEYS window\'s rounded corner is the canvas underneath', pts.corner.canvas, JSON.stringify(pts.corner));
  check('hit-test: the gap between two rack cards is the canvas underneath', pts.rackGap.canvas && pts.rackGapPx > 0, JSON.stringify(pts.rackGap) + ' gap ' + pts.rackGapPx);
  check('hit-test: the rack\'s shadow gutter and the clear picture are the canvas', pts.gutter.canvas && pts.clear.canvas && pts.gutterPx === 48, JSON.stringify({ g: pts.gutter, c: pts.clear, px: pts.gutterPx }));

  /* ── 2. the wheel ── */
  let s0 = await seen(); await wheel(pts.clear.x, pts.clear.y); let s1 = await seen();
  check('wheel: on the clear picture it reaches the canvas', s1.wheel === s0.wheel + 1, `${s0.wheel} → ${s1.wheel}`);
  s0 = s1; await wheel(pts.gap.x, pts.gap.y); await wheel(pts.corner.x, pts.corner.y); s1 = await seen();
  check('wheel: in the floating window\'s gap and in the KEYS window\'s corner it never reaches the picture', s1.wheel === s0.wheel, `${s0.wheel} → ${s1.wheel}`);
  const r0 = await ev(`return { top: A.rack.el.racks.right.scrollTop, max: A.rack.el.racks.right.scrollHeight - A.rack.el.racks.right.clientHeight, ...G.rackWheels };`);
  s0 = await seen(); await wheel(pts.rackGap.x, pts.rackGap.y); s1 = await seen();
  const r1 = await ev(`return { top: A.rack.el.racks.right.scrollTop, ...G.rackWheels };`);
  check('wheel: in a gap of the rack it never reaches the picture; it is re-dispatched to the rack, which scrolls', s1.wheel === s0.wheel && r1.n === r0.n + 1 && r1.trusted === r0.trusted && (r0.max <= 0 || r1.top > r0.top),
    JSON.stringify({ canvas: [s0.wheel, s1.wheel], r0, r1 }));
  s0 = s1; await wheel(pts.gutter.x, pts.gutter.y); s1 = await seen();
  check('wheel: in the rack\'s shadow gutter (paint, not UI) it reaches the picture', s1.wheel === s0.wheel + 1, `${s0.wheel} → ${s1.wheel}`);

  /* ── 3. presses ── */
  s0 = await seen();
  await mouse('mouseMoved', pts.gap.x, pts.gap.y); await mouse('mousePressed', pts.gap.x, pts.gap.y); await mouse('mouseReleased', pts.gap.x, pts.gap.y); await sleep(120);
  s1 = await seen();
  check('a mouse press in a gap starts nothing on the picture: no pointerdown, no up, no click', s1.pointerdown === s0.pointerdown && s1.click === s0.click && s1.pointerup === s0.pointerup, JSON.stringify({ s0, s1 }));
  s0 = s1;
  await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts.gap.x, y: pts.gap.y }] });
  await p.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pts.gap.x, y: pts.gap.y + 30 }] });
  await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(200);
  s1 = await seen();
  check('a touch tap and swipe from a gap start nothing on the picture', s1.pointerdown === s0.pointerdown && s1.click === s0.click && s1.touchstart === s0.touchstart && s1.pointermove === s0.pointermove, JSON.stringify({ s0, s1 }));
  s0 = s1;
  await drag('mousePressed', pts.clear.x, pts.clear.y); await drag('mouseMoved', (pts.clear.x + pts.gap.x) / 2, pts.gap.y); await drag('mouseMoved', pts.gap.x, pts.gap.y);
  await drag('mouseReleased', pts.gap.x, pts.gap.y); await sleep(120);
  s1 = await seen();
  check('a drag begun on the picture keeps its moves and its up across the gap', s1.pointerdown === s0.pointerdown + 1 && s1.pointermove >= s0.pointermove + 2 && s1.pointerup === s0.pointerup + 1, JSON.stringify({ s0, s1 }));

  /* ── 4. H hides the interface; the gap is the picture's again ── */
  await p.key('KeyH'); await sleep(200);
  let h = await ev(`return { hidden: document.body.classList.contains('ui-hidden'), hit: !!A.sceneGuard.hit({ clientX: ${pts.gap.x}, clientY: ${pts.gap.y} }) };`);
  s0 = await seen(); await wheel(pts.gap.x, pts.gap.y); s1 = await seen();
  check('H hides the interface, and then the old gap is the picture\'s (UI space released)', h.hidden && !h.hit && s1.wheel === s0.wheel + 1, JSON.stringify(h) + ` ${s0.wheel} → ${s1.wheel}`);
  await p.key('KeyH'); await sleep(300);
  h = await ev(`return { hidden: document.body.classList.contains('ui-hidden'), hit: !!A.sceneGuard.hit({ clientX: ${pts.gap.x}, clientY: ${pts.gap.y} }) };`);
  check('H again brings it back, and the gap is UI space again', !h.hidden && h.hit, JSON.stringify(h));

  /* ── 5. BASINS' keys ── */
  await p.mouse(pts.clear.x, pts.clear.y);
  let k = await ev(`return { folders: A.folders.isOpen(), chords: ['folders', 'fullscreen', 'rack', 'dock', 'hide', 'modulation', 'notebook'].map((id) => id + ':' + A.keys.chords(id).join('|')) };`);
  await p.key('KeyF'); await sleep(250);
  const afterF = await ev(`return { folders: A.folders.isOpen() };`);
  await p.key('KeyS'); await sleep(400);
  const afterS = await ev(`const r = document.querySelector('[data-mir-window="folders"], #savewin'); return { folders: A.folders.isOpen() };`);
  check('keys: S opens FOLDERS, F does not (F is full screen); the table is BASINS\'', !k.folders && !afterF.folders && afterS.folders &&
    k.chords.join() === 'folders:KeyS,fullscreen:KeyF,rack:KeyB,dock:KeyT,hide:KeyH,modulation:KeyM,notebook:KeyJ', JSON.stringify({ k, afterF, afterS }));
  await p.key('KeyS'); await sleep(200);
  const b0 = await ev(`return A.rack.hidden;`); await p.key('KeyB'); await sleep(200); const b1 = await ev(`return A.rack.hidden;`); await p.key('KeyB'); await sleep(200);
  check('keys: B hides and shows the rack', b0 === false && b1 === true, `${b0} → ${b1}`);
  const menus = await ev(`const M = A.menubar; M.openGroup('VIEW'); const view = M.items.slice(); M.openGroup('ABOUT'); const about = M.items.slice(); M.openGroup('EDIT'); const edit = M.items.slice(); M.close(); return { view, about, edit };`);
  check('menus: VIEW has HIDE and FULL SCREEN with their keys, EDIT ends with Purge Cache/RAM, ABOUT ends with COPY DUMP',
    menus.view.some((t) => /HIDE the interface/.test(t) && /H$/.test(t)) && menus.view.some((t) => /FULL SCREEN/.test(t) && /F$/.test(t)) && /Purge Cache\/RAM/.test(menus.edit[menus.edit.length - 1]) && /COPY DUMP/.test(menus.about[menus.about.length - 1]), JSON.stringify(menus));

  /* ── 6. the banner, the boot veil, the dump ── */
  const bn = await ev(`const B = await import('../../mir/shell/banner.js'), V = await import('../../mir/shell/boot.js');
    B.warn('A thing is slow'); B.fail('The picture broke', new Error('boom')); B.fail('The picture broke', new Error('boom'));
    const pane = document.getElementById('mir-banner');
    const items = [...pane.querySelectorAll('.mir-banner-item')].map((n) => n.firstChild.textContent + n.children[1].textContent);
    B.offerReload(); const reload = !pane.querySelector('.mir-banner-acts').hidden;
    const x = pane.querySelector('.mir-banner-x').getBoundingClientRect();
    const xHit = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2) === pane.querySelector('.mir-banner-x');
    const veil = V.bootVeil({ ready: () => true }); await veil.done;
    const dump = A.dump();
    return { shown: !pane.hidden, kind: pane.dataset.kind, items, xHit, reload, xc: { x: x.left + x.width / 2, y: x.top + x.height / 2 }, fill: getComputedStyle(pane).backgroundColor,
      veil: { hidden: veil.el.hidden, via: veil.stat.via, first: veil.stat.firstPresentMs > 0 },
      dump: { problems: /--- problems \\(2\\) ---/.test(dump), veil: /boot veil {3}down after/.test(dump), wake: /wakeLock {4}/.test(dump) } };`);
  check('banner: a warning and a twice-reported error are two lines, the second counted (x2); the pane is an error pane in BASINS\' maroon',
    bn.shown && bn.kind === 'error' && bn.items.length === 2 && /⛔ The picture broke {2}\(x2\)/.test(bn.items[1]) && bn.fill === 'rgba(64, 28, 34, 0.95)', JSON.stringify(bn));
  check('banner: offerReload() shows RELOAD; the boot veil comes down after its first frame; the dump carries problems, the veil and the wake lock',
    bn.reload && bn.veil.hidden && /^fade/.test(bn.veil.via) && bn.veil.first && bn.dump.problems && bn.dump.veil && bn.dump.wake, JSON.stringify({ r: bn.reload, v: bn.veil, d: bn.dump }));
  await sleep(500);                                  // the veil's view-transition garnish holds the input while it runs
  await mouse('mouseMoved', bn.xc.x, bn.xc.y); await mouse('mousePressed', bn.xc.x, bn.xc.y); await mouse('mouseReleased', bn.xc.x, bn.xc.y); await sleep(150);
  const gone = await ev(`const p = document.getElementById('mir-banner'); return p.hidden || p.textContent;`);
  check('banner: its × (hit-tested) puts it down', bn.xHit && gone === true, JSON.stringify({ xHit: bn.xHit, gone }));

  /* ── 6b. the notebook's COPY DUMP says whether it worked (1.5.0-alpha.17; BASINS flashed COPIED / FAILED for 1.4 s) ── */
  const dumpPress = async (refuse) => {
    const at = await ev(`const nb = A.notebook; nb.open('about'); await new Promise((r) => setTimeout(r, 120));
      const t0 = document.getElementById('mir-toast'); if (t0) t0.hidden = true;
      G.copied = null;
      navigator.clipboard.writeText = ${refuse} ? (() => Promise.reject(new Error('refused'))) : ((s) => { G.copied = s; return Promise.resolve(); });
      G.realExec = document.execCommand.bind(document); if (${refuse}) document.execCommand = () => false;
      const b = nb.root.querySelector('.nb-dump').getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
      return { x, y, hit: document.elementFromPoint(x, y) === nb.root.querySelector('.nb-dump') };`);
    await mouse('mouseMoved', at.x, at.y); await mouse('mousePressed', at.x, at.y); await mouse('mouseReleased', at.x, at.y); await sleep(200);
    return { hit: at.hit, ...(await ev(`const t = document.getElementById('mir-toast'); document.execCommand = G.realExec;
      return { shown: !!t && !t.hidden, text: t ? t.textContent : null, kind: t ? t.dataset.kind : null, copied: typeof G.copied === 'string' && /GUARD/.test(G.copied) };`)) };
  };
  const ok = await dumpPress(false), bad = await dumpPress(true);
  await ev(`A.notebook.close(); return 0;`);
  check('notebook: COPY DUMP (hit-tested) acknowledges through the kit\'s notice — COPIED when the clipboard took the dump, FAILED when it was refused',
    ok.hit && ok.copied && ok.shown && ok.text === 'COPIED' && ok.kind === 'ok' && bad.hit && bad.shown && bad.text === 'FAILED' && bad.kind === 'warn', JSON.stringify({ ok, bad }));

  /* ── 7. createApp({ session: true }): one live project, armed one task after createApp (no opener yet) ── */
  const s0x = await ev(`return { session: A.session };`);
  await p.goto(BASE + '/tests/fixtures/scene-guard.html?session=1', 800);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__ready && /session/.test(location.search)')); i++) await sleep(100);   // the new page's, not the old one's
  await sleep(300);
  const ss = await ev(`return { has: !!A.session, armed: A.session.armed(), saved: (A.session.save(), !!localStorage.getItem('guard.session')) };`);
  check('session: off by default; session: true makes app.session, armed after createApp, saving under <key>.session', s0x.session === null && ss.has && ss.armed && ss.saved, JSON.stringify({ s0x, ss }));
} catch (e) {
  results.push('FAIL  the run threw — ' + (e && e.stack || e));
} finally { await p.close(); }

for (const r of results) console.log(r);
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
