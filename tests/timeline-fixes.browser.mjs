// Josh's three TIMELINE fixes + the playhead/tab scope addition (2026-10-01):
// 1. NEAREST LANE — a dragged clip's target lane comes from row geometry, never elementFromPoint.
// 2. THE CURVE ALONE — no clip-body wash; feedback lives on the fill/curve/points/tab.
// 3. RIGHT-CLICK DELETE — a tab's right button deletes; holding it sweeps; one undo; Escape cancels whole.
// 4/5. THE PLAYHEAD triangle + THE TABS' solid gradient cap.
// Expected numbers are hand-computed here, independent of app/timeline-geometry.js and the CSS
// values, so this rig cannot share a bug with the code it is checking.
// PORTED (2026-10-02) from BASINS tools/rig/timeline-fixes-check.mjs to gallery/timeline.html: every check, its name and
// order kept; Chromium only (BASINS also ran touch WebKit).  MIR_BASE=http://127.0.0.1:8830/ node tests/timeline-fixes.browser.mjs
import { openTimeline, ledger } from './timeline-rig.mjs';

const SHOT = process.env.SHOT || (await import('node:os')).tmpdir();
const TAB = 18, GAP = 2; // TIMELINE_TAB_HEIGHT / TIMELINE_ROW_GAP, restated independently.

const name = 'chromium', touch = false;
const RUN = await (async () => {
  const { page, errors, presses, close } = await openTimeline();
  await page.emulateMedia({ reducedMotion: 'reduce' }); // deterministic opacity/scale reads, no transition timing races
  const L = ledger(name);
  try {
    const setup = () => page.evaluate(() => {
      const T = window.__TL; T.mod.play(false);
      const m = T.tl.editor.model; m.restore(null);
      T.tl.open();   /* the gallery's timeline is docked at the bottom, 440 tall */
      const laneId = m.state().lanes[0].id;
      const a = m.create({ targetId: 'scene.size', name: 'A', value: .5, start: 1, duration: 3, laneId });
      const b = m.create({ targetId: 'scene.hue', name: 'B', value: .5, start: 5, duration: 3, laneId });
      const c = m.create({ targetId: 'scene.spin', name: 'C', value: .5, start: 9, duration: 3, laneId });
      document.querySelector('.tl-viewport').scrollLeft = 0; document.querySelector('.tl-viewport').scrollTop = 0;
      return { a, b, c, lane0: m.state().lanes[0].id, lane1: m.state().lanes[1].id, laneCount: m.state().lanes.length };
    });
    let ids = await setup();
    await page.waitForTimeout(150);

    // ---- 1. NEAREST LANE ----------------------------------------------------------------
    const laneHeight = await page.evaluate(() => window.__TL.tl.editor.view.height());
    const rowHeight = TAB + laneHeight, stride = rowHeight + GAP, boundary = rowHeight + GAP / 2; // row0/row1 midpoint
    const viewportTop = (await page.locator('.tl-viewport').boundingBox()).y;
    const tabA = await page.locator(`.tl-clip-title[data-clip="${ids.a}"]`).boundingBox();
    const x = tabA.x + tabA.width / 2;
    await page.mouse.move(x, tabA.y + tabA.height / 2); await page.mouse.down();
    await page.mouse.move(x, viewportTop + boundary - 12, { steps: 4 }); await page.waitForTimeout(40);
    let laneAt = async () => page.evaluate(id => window.__TL.tl.editor.model.state().clips.find(c => c.id === id).laneId, ids.a);
    const seq = [];
    for (let dy = -12; dy <= 12; dy += 2) {
      await page.mouse.move(x, viewportTop + boundary + dy, { steps: 1 }); await page.waitForTimeout(40);
      seq.push({ dy, lane: await laneAt() });
    }
    const changes = seq.filter((s, i) => i > 0 && s.lane !== seq[i - 1].lane);
    L.ck(changes.length === 1, 'the lane changes exactly once across the gap sweep', seq);
    L.ck(changes[0]?.dy >= -2 && changes[0]?.dy <= 2, 'the change lands within 2px of the gap midpoint', changes);
    L.ck(seq[0].lane === ids.lane0 && seq.at(-1).lane === ids.lane1, 'it starts on lane0 and ends on lane1, never reverting', seq);
    const rulerTop = (await page.locator('.tl-ruler').boundingBox()).y;
    await page.mouse.move(x, rulerTop - 10, { steps: 2 }); await page.waitForTimeout(40);
    L.ck(await laneAt() === ids.lane0, 'above the ruler clamps to the first lane', await laneAt());
    const winBox = await page.locator('.mir-win.mir-timeline').boundingBox();
    await page.mouse.move(x, winBox.y + winBox.height + 80, { steps: 2 }); await page.waitForTimeout(40);
    const lastLaneId = await page.evaluate(() => window.__TL.tl.editor.model.state().lanes.at(-1).id);
    L.ck(await laneAt() === lastLaneId, 'below the window clamps to the last lane', { lane: await laneAt(), lastLaneId });
    await page.mouse.up(); await page.waitForTimeout(40);

    // ---- 2. THE CURVE ALONE --------------------------------------------------------------
    ids = await setup(); // fresh, undisturbed clips for the remaining sections
    const clipBox = () => page.locator(`.tl-clip[data-clip="${ids.a}"]`).boundingBox();
    const bg = sel => page.evaluate(s => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
    const fillOpacity = () => page.evaluate(s => getComputedStyle(document.querySelector(s + ' .tl-fill')).opacity, `.tl-clip[data-clip="${ids.a}"]`);
    const curveFilter = () => page.evaluate(s => getComputedStyle(document.querySelector(s + ' .tl-curve')).filter, `.tl-clip[data-clip="${ids.a}"]`);
    L.ck(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/.test(await bg(`.tl-clip[data-clip="${ids.a}"]`)), 'clip body is transparent at rest', await bg(`.tl-clip[data-clip="${ids.a}"]`));
    L.ck(Math.abs(+(await fillOpacity()) - .15) < .005, 'the fill is rest-opacity (.15) before any interaction', await fillOpacity());
    L.ck((await curveFilter()) === 'none', 'the curve is unbrightened before any interaction', await curveFilter());

    // Hover alone (no click): .15 -> .20 -> .15, clip body still transparent.
    const cb = await clipBox();
    await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height * .8, { steps: 6 }); await page.waitForTimeout(260);
    L.ck(Math.abs(+(await fillOpacity()) - .20) < .005, 'hovering the plot brightens the fill to .20', await fillOpacity());
    L.ck((await curveFilter()) !== 'none', 'hovering brightens the curve line (filter set)', await curveFilter());
    L.ck(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/.test(await bg(`.tl-clip[data-clip="${ids.a}"]`)), 'clip body stays transparent while hovered', await bg(`.tl-clip[data-clip="${ids.a}"]`));
    await page.mouse.move(5, 5, { steps: 6 }); await page.waitForTimeout(260);
    L.ck((await curveFilter()) === 'none', 'leaving restores the curve filter', await curveFilter());
    L.ck(Math.abs(+(await fillOpacity()) - .15) < .005, 'leaving restores the fill to .15', await fillOpacity());

    // One press (selects + holds; zero movement, so no double-tap): held and selected both read .20.
    const tabBox = await page.locator(`.tl-clip-title[data-clip="${ids.a}"]`).boundingBox();
    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2); await page.mouse.down();
    L.ck(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/.test(await bg(`.tl-clip[data-clip="${ids.a}"]`)), 'clip body is transparent while held', await bg(`.tl-clip[data-clip="${ids.a}"]`));
    L.ck(Math.abs(+(await fillOpacity()) - .20) < .005, 'holding the tab brightens the fill to .20', await fillOpacity());
    await page.mouse.up(); await page.waitForTimeout(260);
    L.ck(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/.test(await bg(`.tl-clip[data-clip="${ids.a}"]`)), 'clip body is transparent once selected', await bg(`.tl-clip[data-clip="${ids.a}"]`));
    L.ck(Math.abs(+(await fillOpacity()) - .20) < .005, 'a selected clip keeps the fill at .20 with no further input', await fillOpacity());
    const emptySpot = await page.locator('.tl-pane').first().boundingBox();
    await page.mouse.click(emptySpot.x + emptySpot.width - 20, emptySpot.y + emptySpot.height / 2); // deselect
    await page.waitForTimeout(260);
    L.ck(Math.abs(+(await fillOpacity()) - .15) < .005, 'deselecting returns the fill to rest (.15)', await fillOpacity());

    const pointR = () => page.evaluate(s => document.querySelector(s + ' circle.tl-point')?.getAttribute('r'), `.tl-clip[data-clip="${ids.a}"]`);
    const tensionR = () => page.evaluate(s => document.querySelector(s + ' circle.tl-tension')?.getAttribute('r'), `.tl-clip[data-clip="${ids.a}"]`);
    L.ck(await pointR() === '6', 'point radius is 6', await pointR());
    L.ck(await tensionR() === '5', 'tension radius is 5', await tensionR());
    // An interior point (t=0/t=1 sit exactly at the clip's edge, under the 8px resize-grip strip
    // the editor's own gesture code already gives points priority over — but a raw
    // elementFromPoint there would hit the grip, so this check uses a point clear of that zone).
    await page.evaluate(id => { const m = window.__TL.tl.editor.model, c = m.state().clips.find(x => x.id === id), curve = m.state().curves.find(cc => cc.id === c.curveId); m.addPoint(curve.id, curve.length / 2, .8); }, ids.a);
    await page.waitForTimeout(80);
    const midLocator = page.locator(`.tl-clip[data-clip="${ids.a}"] circle.tl-point[data-point="1"]`);
    const pointBox = await midLocator.boundingBox();
    const pointTransform = () => page.evaluate(s => getComputedStyle(document.querySelector(s))?.transform, `.tl-clip[data-clip="${ids.a}"] circle.tl-point[data-point="1"]`);
    L.ck((await pointTransform()) === 'none', 'a point is unscaled before hover', await pointTransform());
    await page.mouse.move(pointBox.x + pointBox.width / 2, pointBox.y + pointBox.height / 2, { steps: 6 }); await page.waitForTimeout(160);
    L.ck((await pointTransform()) !== 'none', 'hovering a point scales it', await pointTransform());
    await page.mouse.move(5, 5, { steps: 6 }); await page.waitForTimeout(160);
    L.ck((await pointTransform()) === 'none', 'leaving restores the point', await pointTransform());

    // ---- 3. RIGHT-CLICK DELETE ------------------------------------------------------------
    const tabCenter = async id => { const b = await page.locator(`.tl-clip-title[data-clip="${id}"]`).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
    let [ax, ay] = await tabCenter(ids.a);
    await page.mouse.move(ax, ay); await page.mouse.down({ button: 'right' }); await page.waitForTimeout(40);
    let clipIds = await page.evaluate(() => window.__TL.tl.editor.model.state().clips.map(c => c.id));
    L.ck(!clipIds.includes(ids.a), 'right-button down on a tab deletes that clip at once', clipIds);
    await page.mouse.up({ button: 'right' }); await page.waitForTimeout(40);
    await page.keyboard.press('Escape'); await page.waitForTimeout(40); // stray Escape after release is a no-op
    clipIds = await page.evaluate(() => window.__TL.tl.editor.model.state().clips.map(c => c.id));
    L.ck(!clipIds.includes(ids.a), 'the single delete persists (not undone by a later Escape)', clipIds);

    ids = await setup();
    [ax, ay] = await tabCenter(ids.a); const [bx, by] = await tabCenter(ids.b); const [cx, cy] = await tabCenter(ids.c);
    await page.mouse.move(ax, ay); await page.mouse.down({ button: 'right' }); await page.waitForTimeout(30);
    await page.mouse.move(bx, by, { steps: 4 }); await page.waitForTimeout(30);
    await page.mouse.move(cx, cy, { steps: 4 }); await page.waitForTimeout(30);
    clipIds = await page.evaluate(() => window.__TL.tl.editor.model.state().clips.map(c => c.id));
    L.ck(![ids.a, ids.b, ids.c].some(id => clipIds.includes(id)), 'holding the button and crossing tabs sweeps every one of them', clipIds);
    await page.mouse.up({ button: 'right' }); await page.waitForTimeout(40);
    await page.evaluate(() => window.__TL.tl.editor.model.undo());
    clipIds = await page.evaluate(() => window.__TL.tl.editor.model.state().clips.map(c => c.id));
    L.ck([ids.a, ids.b, ids.c].every(id => clipIds.includes(id)), 'one undo restores the whole sweep', clipIds);

    ids = await setup();
    [ax, ay] = await tabCenter(ids.a); const [bx2, by2] = await tabCenter(ids.b);
    await page.mouse.move(ax, ay); await page.mouse.down({ button: 'right' }); await page.waitForTimeout(30);
    await page.mouse.move(bx2, by2, { steps: 4 }); await page.waitForTimeout(30);
    await page.keyboard.press('Escape'); await page.waitForTimeout(40);
    await page.mouse.up({ button: 'right' }); await page.waitForTimeout(40);
    clipIds = await page.evaluate(() => window.__TL.tl.editor.model.state().clips.map(c => c.id));
    L.ck([ids.a, ids.b].every(id => clipIds.includes(id)), 'Escape cancels the whole sweep', clipIds);

    // the plot's MIR curve law is untouched: a right-drag over empty plot space still adds a point
    ids = await setup();
    const plot = page.locator(`.tl-clip[data-clip="${ids.a}"] svg[data-clip]`);
    const pb = await plot.boundingBox();
    const before = await page.evaluate(id => { const m = window.__TL.tl.editor.model, c = m.state().clips.find(x => x.id === id); return m.state().curves.find(cc => cc.id === c.curveId).points.length; }, ids.a);
    // Away from both endpoints (x=0/x=width) and the midpoint tension handle (x=.5,y=.5 on this flat curve).
    await page.mouse.move(pb.x + pb.width * .25, pb.y + pb.height * .08);
    await page.mouse.down({ button: 'right' }); await page.mouse.move(pb.x + pb.width * .25, pb.y + pb.height * .12, { steps: 3 }); await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(60);
    const after = await page.evaluate(id => { const m = window.__TL.tl.editor.model, c = m.state().clips.find(x => x.id === id); return m.state().curves.find(cc => cc.id === c.curveId).points.length; }, ids.a);
    L.ck(after === before + 1, 'right-drag on the plot still adds a point (MIR curve law)', { before, after });

    // right-click over empty lane space does nothing
    const laneBox = await page.locator('.tl-pane').first().boundingBox();
    const beforeSel = await page.evaluate(() => window.__TL.tl.editor.selection());
    await page.mouse.move(laneBox.x + laneBox.width - 20, laneBox.y + laneBox.height / 2);
    await page.mouse.down({ button: 'right' }); await page.mouse.up({ button: 'right' }); await page.waitForTimeout(40);
    const afterSel = await page.evaluate(() => window.__TL.tl.editor.selection());
    const clipsNow = await page.evaluate(() => window.__TL.tl.editor.model.state().clips.length);
    L.ck(clipsNow === 3 && JSON.stringify(beforeSel) === JSON.stringify(afterSel), 'right-click over empty lane space does nothing', { clipsNow, beforeSel, afterSel });

    // the ⋯ button still opens the clip menu
    const more = page.locator(`.tl-clip-title[data-clip="${ids.a}"] .tl-clip-more`);
    await more.click();
    L.ck(await page.locator('.tl-pop').count() === 1, 'the ⋯ button still opens the clip menu', await page.locator('.tl-pop').count());
    // OUTPUT RANGE is the kit's number fields, never a native type=number (Josh, 2026-10-07, call 19): ↑ on MIN, APPLY → +0.01
    const minBefore = await page.evaluate(id => { const m = window.__TL.tl.editor.model, c = m.state().clips.find(x => x.id === id); return m.state().curves.find(cc => cc.id === c.curveId).min; }, ids.a);
    await page.locator('.tl-pop [data-row="output-range"]').click(); await page.waitForTimeout(40);
    const range = await page.evaluate(() => { const p = document.querySelector('.tl-pop[data-pop="range"]'); return p && { nums: p.querySelectorAll('.mir-num [role="spinbutton"]').length,
      natives: document.querySelectorAll('.mir-timeline select, .mir-timeline input[type="number"], .tl-pop select, .tl-pop input[type="number"]').length, faces: [...p.querySelectorAll('.mir-num-face')].map((f) => f.textContent) }; });
    L.ck(range && range.nums === 2 && range.natives === 0, 'OUTPUT RANGE: two kit number fields; no native select or number input in the timeline or its popups', range);
    await page.locator('.tl-pop[data-pop="range"] .mir-num-face').first().focus(); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(30);
    await page.locator('.tl-pop[data-pop="range"] [data-tl-action="apply"]').click(); await page.waitForTimeout(40);
    const minAfter = await page.evaluate(id => { const m = window.__TL.tl.editor.model, c = m.state().clips.find(x => x.id === id); return m.state().curves.find(cc => cc.id === c.curveId).min; }, ids.a);
    L.ck(Math.abs(minAfter - minBefore - .01) < 1e-9 && await page.locator('.tl-pop').count() === 0, 'its keys move it by its step and APPLY sets the curve\'s output minimum', { minBefore, minAfter });
    await page.keyboard.press('Escape'); await page.waitForTimeout(30);

    // elementFromPoint still resolves a point circle (an interior one: t=0/t=1 sit under the edge
    // grips; clip B's curve is untouched by the right-drag above, so its midpoint sits clear of
    // any neighbouring tension handle).
    const midIndexB = await page.evaluate(id => { const m = window.__TL.tl.editor.model, c = m.state().clips.find(x => x.id === id), curve = m.state().curves.find(cc => cc.id === c.curveId); return m.addPoint(curve.id, curve.length / 2, .8).index; }, ids.b);
    await page.waitForTimeout(80);
    const anyPoint = await page.locator(`.tl-clip[data-clip="${ids.b}"] circle.tl-point[data-point="${midIndexB}"]`).boundingBox();
    const hitsPoint = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.classList.contains('tl-point'), [anyPoint.x + anyPoint.width / 2, anyPoint.y + anyPoint.height / 2]);
    L.ck(hitsPoint, 'elementFromPoint on a point still returns the circle', hitsPoint);

    // ---- 4. THE PLAYHEAD ------------------------------------------------------------------
    const headWidth = await page.evaluate(() => getComputedStyle(document.querySelector('.tl-playhead')).width);
    L.ck(headWidth === '1.5px', 'the playhead line is 1.5px', headWidth);
    const before2 = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.tl-playhead'), '::before');
      return { top: cs.top, left: cs.left, bl: cs.borderLeftWidth, br: cs.borderRightWidth, bt: cs.borderTopWidth, transform: cs.transform };
    });
    const w2 = parseFloat(before2.bl) + parseFloat(before2.br), h2 = parseFloat(before2.bt);
    L.ck(Math.abs(w2 - 14) < .5 && Math.abs(h2 - 10) < .5, 'the handle box is ~14x10', { w2, h2 });
    const apexX = parseFloat(before2.left) + parseFloat(before2.bl);
    L.ck(Math.abs(apexX - .75) < .5, 'the apex sits on the line (half the 1.5px line width)', apexX);
    L.ck(before2.transform === 'none', 'the handle is unscaled before hover/scrub', before2.transform);
    const rulerBox = await page.locator('.tl-ruler').boundingBox();
    await page.mouse.move(rulerBox.x + rulerBox.width / 2, rulerBox.y + rulerBox.height / 2, { steps: 6 }); await page.waitForTimeout(160);
    const hoverTransform = await page.evaluate(() => getComputedStyle(document.querySelector('.tl-playhead'), '::before').transform);
    L.ck(hoverTransform !== 'none', 'hovering the ruler scales the handle', hoverTransform);
    await page.mouse.move(5, 5, { steps: 6 }); await page.waitForTimeout(160);
    await page.mouse.move(rulerBox.x + 10, rulerBox.y + rulerBox.height / 2); await page.mouse.down();
    await page.mouse.move(rulerBox.x + 60, rulerBox.y + rulerBox.height / 2, { steps: 4 }); await page.waitForTimeout(80);
    const scrubbing = await page.evaluate(() => document.querySelector('.tl-playhead').classList.contains('scrubbing'));
    const scrubTransform = await page.evaluate(() => getComputedStyle(document.querySelector('.tl-playhead'), '::before').transform);
    L.ck(scrubbing && scrubTransform !== 'none', 'scrubbing also scales the handle', { scrubbing, scrubTransform });
    await page.mouse.up(); await page.waitForTimeout(40);

    // ---- 5. THE TABS ------------------------------------------------------------------------
    const tabHeight = await page.evaluate(() => getComputedStyle(document.querySelector('.tl-titleband')).height);
    L.ck(tabHeight === '18px', 'the tab height is 18px', tabHeight);
    const tintFill = await page.evaluate(id => document.querySelector(`.tl-clip-title[data-clip="${id}"] .tl-tab-tint`).getAttribute('fill'), ids.a);
    L.ck(/^url\(#/.test(tintFill), 'the tab tint fills from an SVG gradient id', tintFill);
    const gradCount = await page.evaluate(id => document.querySelectorAll(`.tl-clip-title[data-clip="${id}"] linearGradient`).length, ids.a);
    L.ck(gradCount === 2, 'two gradients exist (tint + rim)', gradCount);
    const footColor = await page.evaluate(id => getComputedStyle(document.querySelector(`.tl-clip-title[data-clip="${id}"] .tl-tab-grad-foot`)).stopColor, ids.a);
    const curveStroke = await page.evaluate(id => getComputedStyle(document.querySelector(`.tl-clip[data-clip="${id}"] .tl-curve`)).stroke, ids.a);
    L.ck(footColor === curveStroke, 'the gradient foot equals the curve stroke colour (one token)', { footColor, curveStroke });
    const microBox = await page.evaluate(() => { const m = window.__TL.tl.editor.model; const laneId = m.state().lanes[0].id; return m.create({ targetId: 'scene.glow', name: 'TINY', value: .5, start: 20, duration: .25, laneId }); });
    await page.waitForTimeout(80);
    const microClass = await page.evaluate(id => document.querySelector(`.tl-clip-title[data-clip="${id}"]`).className, microBox);
    L.ck(/\bmicro\b/.test(microClass), 'a very short clip keeps the micro cap shoulders', microClass);

    await page.screenshot({ path: `${SHOT}/timeline-fixes-${name}.png` });
    L.ck(errors().length === 0, 'no page errors', errors());
    L.ck(presses().every((p) => / @(timeline|rail|popup)$/.test(p.at)), 'every press landed on the timeline, its rail or its popups (elementFromPoint)', presses().filter((p) => !/ @(timeline|rail|popup)$/.test(p.at)));
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
