/* timeline-kinds.browser.mjs — BASINS tools/rig/timeline-kinds-check.mjs (LANE T2: PATTERN CLIPS · SLICE · THE TOOLBAR,
 * 2026-10-01), ported to gallery/timeline.html (2026-10-02).  A pattern clip paints its row repeating with boundaries in
 * the device colour, a resize extends the repeats, a kind takes no point gestures but moves/trims/deletes, the seam
 * (addClip, onDrop) places clips, Insert slices a curve at the playhead continuously with one undo, the SLICE tool keeps a
 * pattern's phase, the toolbar has no UNDO/REDO/−/+ but their keys work, a SELECT strip drag makes a range that ACTIVE
 * stores, and a Shift-vertical strip drag zooms around the pointer's beat.  Buttons are found by their data- hooks
 * (data-tool, data-mode), where the rig found them by name.  Chromium only (BASINS also ran touch WebKit).
 * MIR_BASE=http://127.0.0.1:8830/ node tests/timeline-kinds.browser.mjs */
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { openTimeline, ledger } from './timeline-rig.mjs';

const PLATES = process.env.MIR_PLATES === '1' ? fileURLToPath(new URL('../docs/plates/timeline/', import.meta.url)) : os.tmpdir() + '/';
await mkdir(PLATES, { recursive: true });
const ROW = [100, 0, 0, 0, 64, 0, 0, 0, 127, 0, 30, 0, 90, 0, 0, 0], LIT = 5, TINT = '#e2b579';
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const name = 'chromium', touch = false;
const RUN = await (async () => {
  const { page, errors, presses, close } = await openTimeline();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const L = ledger(name);
  const S = (fn, arg) => page.evaluate(fn, arg);
  const state = () => S(() => window.__TL.tl.editor.model.state());
  try {
    const ids = await S(([row, tint]) => {
      const T = window.__TL; T.mod.play(false);
      const E = T.tl.editor, m = E.model; m.restore(null);
      T.tl.open();   /* docked at the bottom, 440 tall */
      E.setTool('edit'); document.querySelector('.tl-viewport').scrollLeft = 0;
      const lanes = m.state().lanes.map(l => l.id);
      const p = m.create({ targetId: 'pattern:env1', name: 'KICK', value: 0, start: 2, duration: 12, laneId: lanes[0], source: { kind: 'pattern', envId: 'env1', steps: row, length: 16, color: tint } });
      const a = m.create({ targetId: 'scene.size', name: 'A', value: .2, start: 1, duration: 8, laneId: lanes[1] });
      m.updateCurve(m.state().clips.find(c => c.id === a).curveId, { points: [{ t: 0, v: .1, tension: .6 }, { t: .5, v: .9, tension: -.4 }, { t: 1, v: .3, tension: 0 }], length: 8 });
      return { p, a, lanes };
    }, [ROW, TINT]);
    await page.locator('.timeline-surface').focus(); await page.keyboard.press('Shift+2'); await page.waitForTimeout(120);
    const px = () => S(() => window.__TL.tl.editor.px());
    L.ck(await px() === 20, 'the rig works at 20 px per beat', await px());

    // ---- 1. A PATTERN CLIP paints its row, repeating, in the device colour ---------------------------------------
    const grid = (id) => S((id) => { const b = document.querySelector(`.tl-clip[data-clip="${id}"]`), r = b.getBoundingClientRect(), lit = [...b.querySelectorAll('rect.tl-pattern-step.lit')];
      return { x: r.x, steps: b.querySelectorAll('rect.tl-pattern-step').length, lit: lit.length, fills: [...new Set(lit.map(n => n.getAttribute('fill')))], ink: lit[0] && getComputedStyle(lit[0]).fill,
        repeats: [...b.querySelectorAll('line.tl-pattern-repeat')].map(n => n.getBoundingClientRect().x - r.x), points: b.querySelectorAll('circle').length, kind: b.dataset.kind }; }, id);
    let g = await grid(ids.p);
    L.ck(g.kind === 'pattern' && g.steps === 48 && g.lit === LIT * 3, 'a 3-bar pattern clip paints 16 steps per repeat, its lit steps three times', g);
    L.ck(g.fills.length === 1 && g.fills[0] === TINT && g.ink === 'rgb(226, 181, 121)', 'lit steps are in the device colour', { fills: g.fills, ink: g.ink });
    L.ck(g.repeats.length === 2 && near(g.repeats[0], 80, 1.5) && near(g.repeats[1], 160, 1.5), 'the repeat boundaries sit at every 4 beats (80 px)', g.repeats);
    L.ck(g.points === 0, 'a kind emits no points or tension handles', g.points);
    L.ck(await S(() => window.__TL.tl.editor.model.value('pattern:env1', 5)) === null, 'value is null for a pattern clip');

    // ---- 2. resizing extends the repeats -------------------------------------------------------------------------
    const edge = await page.locator(`.tl-clip[data-clip="${ids.p}"] .tl-edge-right`).boundingBox();
    await page.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2); await page.mouse.down();
    await page.mouse.move(edge.x + edge.width / 2 + 80, edge.y + edge.height / 2, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(80);
    g = await grid(ids.p); let clipP = (await state()).clips.find(c => c.id === ids.p);
    L.ck(clipP.duration === 16 && g.lit === LIT * 4 && g.repeats.length === 3, 'a right-edge resize to 4 bars extends to four repeats', { duration: clipP.duration, lit: g.lit, repeats: g.repeats.length });

    // ---- 3. a kind takes no point gestures, but moves and deletes like its tab -----------------------------------
    let body = await page.locator(`.tl-clip[data-clip="${ids.p}"] svg`).boundingBox();
    const sig0 = await S(() => window.__TL.tl.editor.model.signature());
    await page.keyboard.down('Alt'); await page.mouse.click(body.x + 30, body.y + body.height / 2); await page.keyboard.up('Alt');
    await page.mouse.move(body.x + 50, body.y + 10); await page.mouse.down({ button: 'right' }); await page.mouse.move(body.x + 50, body.y + 30, { steps: 3 }); await page.mouse.up({ button: 'right' }); await page.waitForTimeout(60);
    const afterRight = await state();
    L.ck(!afterRight.clips.some(c => c.id === ids.p) && afterRight.curves.every(c => c.kind !== 'pattern' || c.points.length === 0), 'no point is added: a right-press on the body deletes it, as on its tab', afterRight.clips.map(c => c.id));
    await S(() => window.__TL.tl.editor.model.undo()); await page.waitForTimeout(60);
    L.ck(await S(() => window.__TL.tl.editor.model.signature()) === sig0, 'Alt-click was inert and one undo restores the deleted clip', null);
    body = await page.locator(`.tl-clip[data-clip="${ids.p}"] svg`).boundingBox();
    await page.mouse.move(body.x + body.width / 2, body.y + body.height / 2); await page.mouse.down();
    await page.mouse.move(body.x + body.width / 2 + 40, body.y + body.height / 2, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(80);
    clipP = (await state()).clips.find(c => c.id === ids.p);
    L.ck(clipP.start === 4 && clipP.laneId === ids.lanes[0], 'a body drag moves the pattern clip (+2 beats)', clipP);

    // ---- 4. the seam: addClip places a kind; onDrop hands a drop its beat and lane --------------------------------
    const added = await S((row) => { const E = window.__TL.tl.editor, lanes = E.model.state().lanes; const id = E.addClip('pattern', { envId: 'env2', steps: row }, { start: 24, laneId: lanes[2].id }); const c = E.model.state().clips.find(x => x.id === id); return c && { duration: c.duration, lane: c.laneId === lanes[2].id, sel: E.selection().clips }; }, ROW);
    L.ck(added && added.duration === 4 && added.lane && added.sel.length === 1, 'addClip places a kind clip, one repeat long by default, and selects it', added);
    const pane = await page.locator(`.tl-pane[data-lane="${ids.lanes[3]}"]`).boundingBox(), vp = await page.locator('.tl-viewport').boundingBox();
    const drop = await S(([x, y]) => { const E = window.__TL.tl.editor; let got = null; const off = E.onDrop(d => { got = { beat: d.beat, laneId: d.laneId, files: d.files.length }; return true; });
      let dt = null; try { dt = new DataTransfer(); } catch (_) {}
      const ev = new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, ...(dt ? { dataTransfer: dt } : {}) });
      document.querySelector('.tl-viewport').dispatchEvent(ev); off(); return { got, prevented: ev.defaultPrevented }; }, [vp.x + 200, pane.y + pane.height / 2]);
    L.ck(drop.got && near(drop.got.beat, 10, .01) && drop.got.laneId === ids.lanes[3] && drop.prevented, 'onDrop hands the handler the beat and lane under the drop', drop);

    // ---- 5. Insert slices a curve clip at the playhead: one source, continuous, one undo ---------------------------
    const pre = await S(() => { const T = window.__TL, m = T.tl.editor.model; T.tl.controller.seek(3.3); return { beat: T.mod.host.model.transport.beats, v: m.value('scene.size', 3.3), sig: m.signature() }; });
    const tabA = await page.locator(`.tl-clip-title[data-clip="${ids.a}"]`).boundingBox();
    await page.mouse.click(tabA.x + 40, tabA.y + tabA.height / 2); await page.waitForTimeout(40);
    await page.keyboard.press('Insert'); await page.waitForTimeout(80);
    const sl = await S(() => { const m = window.__TL.tl.editor.model, s = m.state(), src = s.curves.find(k => k.targetId === 'scene.size'), cs = s.clips.filter(c => c.curveId === src.id);
      return { n: cs.length, curves: s.curves.filter(k => k.targetId === 'scene.size').length, at: src.points.filter(p => Math.abs(p.t * src.length - 2.3) < 1e-9).length, v: m.value('scene.size', 3.3), vl: m.value('scene.size', 3.3 - 1e-7) }; });
    L.ck(pre.beat === 3.3 && sl.n === 2 && sl.curves === 1, 'Insert slices the selected curve clip into two instances of one source', { pre: pre.beat, sl });
    L.ck(sl.at === 2, 'two brand-new points sit in the break', sl.at);
    L.ck(near(sl.v, pre.v, 1e-6) && near(sl.vl, pre.v, 1e-6), 'value is continuous at the cut within 1e-6', { before: pre.v, right: sl.v, left: sl.vl });
    await page.keyboard.press('Control+z'); await page.waitForTimeout(60);
    L.ck(await S(() => window.__TL.tl.editor.model.signature()) === pre.sig, 'one undo (Ctrl+Z, its key kept) restores the unsliced clip', null);
    const mid = await S((id) => { const m = window.__TL.tl.editor.model, c = m.state().clips.find(x => x.id === id); return m.addPoint(c.curveId, 6, .5).index; }, ids.a);
    await page.waitForTimeout(60);
    const pt = await page.locator(`.tl-clip[data-clip="${ids.a}"] circle.tl-point[data-point="${mid}"]`).boundingBox();
    L.ck(await S(([x, y]) => document.elementFromPoint(x, y)?.classList.contains('tl-point'), [pt.x + pt.width / 2, pt.y + pt.height / 2]), 'elementFromPoint on a curve point still returns the circle', null);

    // ---- 6. the SLICE tool (C) cuts a pattern clip where it is clicked and keeps the grid phase -------------------
    const phase = () => S(() => { const s = window.__TL.tl.editor.model.state(), cs = s.clips.filter(c => s.curves.find(k => k.id === c.curveId)?.envId === 'env1');
      return { n: cs.length, curves: new Set(cs.map(c => c.curveId)).size, steps: Array.from({ length: 64 }, (_, i) => { const w = 4 + i * .25, k = cs.find(c => w >= c.start && w < c.start + c.duration); return k ? Math.floor(((w - k.start) * k.scale + k.offset) / .25 + 1e-9) % 16 : -1; }) }; });
    const ph0 = await phase();
    await page.keyboard.press('c');
    L.ck(await page.locator('.tl-tool[data-tool="slice"]').getAttribute('aria-pressed') === 'true', 'C selects the SLICE tool', null);
    body = await page.locator(`.tl-clip[data-clip="${ids.p}"] svg`).boundingBox();
    await page.mouse.click(body.x + 5 * 20 + 3, body.y + body.height / 2); await page.waitForTimeout(80);
    const ph1 = await phase(), cutP = (await state()).clips.filter(c => c.id === ids.p)[0];
    L.ck(ph1.n === 2 && ph1.curves === 1 && cutP.duration === 5, 'a SLICE click cuts the pattern clip at the snapped beat (9) into two instances', { n: ph1.n, curves: ph1.curves, left: cutP.duration });
    L.ck(JSON.stringify(ph1.steps) === JSON.stringify(ph0.steps), 'the grid phase continues through the cut', null);
    await page.keyboard.press('p');

    // ---- 7. the toolbar: no UNDO · REDO · − · +, the keys still work; ACTIVE is there; the icons when lane I lands --
    const bar = await S(() => { const bs = [...document.querySelectorAll('.tl-toolbar button')];
      return { hooks: bs.map(b => b.dataset.tool || b.dataset.mode || ''), svg: ['edit', 'select', 'scrub'].map(n => !!document.querySelector(`.tl-toolbar .tl-tool[data-tool="${n}"] svg`)), help: ['edit', 'select', 'scrub'].map(n => document.querySelector(`.tl-toolbar .tl-tool[data-tool="${n}"]`)?.dataset.help) }; });
    L.ck(bar.hooks.join() === 'edit,select,scrub,slice,step,slide,active,more', 'the toolbar has no UNDO/REDO/−/+; it has ACTIVE and SLICE', bar.hooks);
    L.ck(bar.svg.every(Boolean), 'lane I\'s icons are in the three tool buttons', bar);
    L.ck(bar.help.join() === 'EDIT,SELECT,SCRUB', 'each tool keeps its word as the hint (data-help)', bar.help);
    const z0 = await px(); await page.locator('.timeline-surface').focus(); await page.keyboard.press('PageUp'); const z1 = await px(); await page.keyboard.press('PageDown');
    L.ck(z1 > z0 && await px() === z0, 'PageUp / PageDown still zoom (the − / + keys)', { z0, z1 });

    // ---- 8. SELECT: a strip drag (touch too) makes a range; ACTIVE stores it; no range = 0 → the last clip's end ---
    await page.keyboard.press('e'); await page.waitForTimeout(40);
    const strip = await page.locator('.tl-ruler').boundingBox(), sy = strip.y + strip.height / 2, scroll = await S(() => document.querySelector('.tl-viewport').scrollLeft);
    const x1 = vp.x + 2 * 20 - scroll, x2 = vp.x + 6 * 20 - scroll;
    if (touch) {
      await S(() => { window.__spc = Element.prototype.setPointerCapture; Element.prototype.setPointerCapture = function (id) { try { return window.__spc.call(this, id); } catch (_) {} }; });
      await S(([x, y]) => document.elementFromPoint(x, y).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 91, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true, button: 0 })), [x1, sy]);
      for (let i = 1; i <= 4; i++) { await S(([x, y]) => document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId: 91, clientX: x, clientY: y, pointerType: 'touch' })), [x1 + (x2 - x1) * i / 4, sy]); await page.waitForTimeout(30); }
      await S(([x, y]) => document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 91, clientX: x, clientY: y, pointerType: 'touch' })), [x2, sy]);
      await S(() => { Element.prototype.setPointerCapture = window.__spc; });
    } else { await page.mouse.move(x1, sy); await page.mouse.down(); await page.mouse.move(x2, sy, { steps: 6 }); await page.mouse.up(); }
    await page.waitForTimeout(80);
    const rng = await S(() => window.__TL.tl.editor.range());
    L.ck(rng && rng.start === 2 && rng.end === 6, `a SELECT-tool strip drag makes a range${touch ? ' (touch pointers)' : ''}`, rng);
    await page.locator('.tl-toolbar [data-mode="active"]').click(); await page.waitForTimeout(40);
    const act = await S(() => ({ a: window.__TL.tl.editor.activeRange(), band: document.querySelectorAll('.tl-ruler .tl-active').length, pressed: document.querySelector('.tl-toolbar [data-mode="active"]')?.getAttribute('aria-pressed') }));
    L.ck(act.a && act.a.start === 2 && act.a.end === 6 && act.band === 1 && act.pressed === 'true', 'ACTIVE stores the range as editor.activeRange(), a band on the strip', act);
    await page.mouse.click(vp.x + 30 * 20 - scroll, sy); await page.waitForTimeout(60);
    const tap = await S(() => ({ range: window.__TL.tl.editor.range(), beat: window.__TL.mod.host.model.transport.beats }));
    L.ck(tap.range === null && tap.beat === 30, 'a SELECT-tool tap on the strip clears the range and seeks', tap);
    await page.locator('.tl-toolbar [data-mode="active"]').click(); await page.waitForTimeout(40);
    const whole = await S(() => { const E = window.__TL.tl.editor; return { a: E.activeRange(), end: Math.max(...E.model.state().clips.map(c => c.start + c.duration)) }; });
    L.ck(whole.a && whole.a.start === 0 && whole.a.end === whole.end, 'with no range, ACTIVE = 0 → the last clip end', whole);

    // ---- 9. Shift + vertical drag on the strip zooms around the pointer's beat (up = in) ----------------------------
    await page.keyboard.press('p');
    const zx = vp.x + 300, b0 = await S((x) => window.__TL.tl.editor.at(x, 0).beat, zx), playhead0 = await S(() => window.__TL.mod.host.model.transport.beats), p0 = await px();
    await page.keyboard.down('Shift'); await page.mouse.move(zx, sy); await page.mouse.down();
    await page.mouse.move(zx, sy - 60, { steps: 8 }); await page.waitForTimeout(60); await page.mouse.up(); await page.keyboard.up('Shift'); await page.waitForTimeout(60);
    const p1 = await px(), b1 = await S((x) => window.__TL.tl.editor.at(x, 0).beat, zx), playhead1 = await S(() => window.__TL.mod.host.model.transport.beats);
    L.ck(near(p1, p0 * Math.exp(.6), .5), 'a 60 px upward Shift-drag zooms in by e^0.6', { p0, p1, want: p0 * Math.exp(.6) });
    L.ck(near(b1, b0, .05), 'the beat under the pointer stays put', { b0, b1 });
    L.ck(playhead1 === playhead0, 'the zoom drag leaves the playhead where it was (the scrub rewinds)', { playhead0, playhead1 });

    await page.keyboard.press('Shift+2'); await S(() => { document.querySelector('.tl-viewport').scrollLeft = 0; window.__TL.tl.editor.paint(); }); await page.waitForTimeout(80);
    const win = await page.locator('.mir-win.mir-timeline').boundingBox();
    if (name === 'chromium') await page.screenshot({ path: `${PLATES}kinds-chromium.png`, clip: { x: win.x, y: win.y, width: Math.min(win.width, 1100), height: win.height } });
    else await page.screenshot({ path: `${PLATES}kinds-webkit.png`, clip: { x: win.x, y: win.y, width: Math.min(win.width, 1100), height: win.height } });
    L.ck(errors().length === 0, 'no page errors', errors());
    L.ck(presses().every((p) => / @(timeline|rail|popup)$/.test(p.at)), 'every press landed on the timeline, its rail or its popups (elementFromPoint)', presses().filter((p) => !/ @(timeline|rail|popup)$/.test(p.at)));
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
