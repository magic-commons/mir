// The modulation window's BASINS leftovers, in a real browser (tests/fixtures/workspaces-mod.html):
//   · with the TIMELINE open too, MODULATION seats 8 px above it (window/workspaces.js) and the MIR switch after the preset
//     arrows is what a hand presses there (elementFromPoint) and swaps to the TIMELINE;
//   · a device dragged by its grip with real pointer events moves along the run with the same node (no rebuild in the
//     drag), and the order lands in the model;
//   · COMPACT cycles Full → Compact → Minimized → Full; the device editor's readout shows under the pointer.
// MIR_BASE=http://127.0.0.1:8843/ node tests/modulation-stack.browser.mjs
import { openTimeline, ledger } from './timeline-rig.mjs';

const RUN = await (async () => {
  const { page, errors, close } = await openTimeline({ page: 'tests/fixtures/workspaces-mod.html', query: '', width: 1600, height: 1000 });
  const L = ledger('modulation-stack');
  try {
    /* 1 · the lego stack */
    await page.evaluate(() => { const W = window.__W; W.tl.open(); W.mod.open(); W.ws.sync(); });
    await page.waitForTimeout(700);
    const stack = await page.evaluate(() => {
      const W = window.__W, m = W.mod.view.root.getBoundingClientRect(), c = W.mod.view.api.placement().content, t = W.tl.win.root.getBoundingClientRect();
      return { stacked: W.ws.stacked, modBottom: Math.round(c.top + c.height), modLeft: Math.round(m.left), tlTop: Math.round(t.top), tlLeft: Math.round(t.left) };
    });
    L.ck(stack.stacked && Math.abs(stack.tlTop - stack.modBottom - 8) <= 1 && Math.abs(stack.modLeft - stack.tlLeft) <= 1, 'both open: MODULATION\'s content (rack + bars) seats 8 px above TIMELINE, left edges together (BASINS stackAbove)', stack);
    const sw = await page.locator('#modwin .m2-workspace-switch').boundingBox();
    const hit = sw && await page.evaluate(([x, y]) => { const n = document.elementFromPoint(x, y); return !!(n && n.closest('.m2-workspace-switch')); }, [sw.x + sw.width / 2, sw.y + sw.height / 2]);
    L.ck(!!sw && sw.width >= 40 && hit, 'the MIR switch sits in the preset bar and is what a hand presses there (elementFromPoint)', sw);
    const arrows = await page.locator('#modwin .m2prebar').boundingBox();
    L.ck(!!arrows && sw.x + sw.width <= arrows.x + arrows.width + 1, 'the switch fits inside the preset bar', { sw, bar: arrows });
    await page.mouse.click(sw.x + sw.width / 2, sw.y + sw.height / 2);
    await page.waitForTimeout(500);
    const swapped = await page.evaluate(() => ({ mod: window.__W.mod.isOpen, tl: window.__W.tl.isOpen() }));
    L.ck(!swapped.mod && swapped.tl, 'the switch swaps to the TIMELINE', swapped);

    /* 2 · a device reorder with real pointer events: the same node travels, the model takes the order on release */
    await page.evaluate(() => { const W = window.__W; W.tl.close(); W.mod.open(); });
    await page.waitForTimeout(600);
    const before = await page.evaluate(() => { const M = window.__W.mod.M; window.__dragNode = document.querySelector('#modwin .m2dev'); return M.sourceList().map((s) => s.kind + ':' + s.id); });
    const grab = await page.locator('#modwin .m2dev .m2grab').boundingBox();
    const second = await page.locator('#modwin .m2dev', 1).boundingBox();
    const hitGrab = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y).closest('.m2grab'), [grab.x + grab.width / 2, grab.y + grab.height / 2]);
    L.ck(hitGrab, 'the device grip is what a hand presses (elementFromPoint)', grab);
    await page.mouse.move(grab.x + grab.width / 2, grab.y + grab.height / 2); await page.mouse.down();
    await page.mouse.move(grab.x + grab.width / 2 + second.width * 1.2, grab.y + grab.height / 2, { steps: 12 });
    await page.waitForTimeout(120);
    const mid = await page.evaluate(() => ({ same: document.querySelectorAll('#modwin .m2dev')[1] === window.__dragNode, held: window.__dragNode.classList.contains('m2drag'), model: window.__W.mod.M.sourceList().map((s) => s.kind + ':' + s.id) }));
    await page.mouse.up(); await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({ order: window.__W.mod.M.sourceList().map((s) => s.kind + ':' + s.id), dom: [...document.querySelectorAll('#modwin .m2dev')].map((n) => n.dataset.id), still: window.__dragNode.isConnected }));
    L.ck(mid.same && mid.held && mid.model.join() === before.join(), 'mid-drag: the held node moved past its neighbour in the DOM, nothing was rebuilt, the model waits', mid);
    L.ck(after.order[1] === before[0] && after.order[0] === before[1] && after.still && after.dom[1] === before[0].split(':')[1], 'on release the model takes the new order and the same node stays', { before, after });

    /* 3 · COMPACT cycles three states */
    const states = await page.evaluate(async () => {
      const v = window.__W.mod.view, chip = v.chipRail.chip('compact'), out = [];
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 3; i++) { chip.click(); await wait(420); out.push(chip.dataset.compactMode + '/' + chip.getAttribute('aria-pressed') + '/' + v.api.cards().map((c) => c.present).join('')); }
      return out;
    });
    L.ck(/^C\/true\/C+$/.test(states[0]) && /^M\/mixed\/M+$/.test(states[1]) && /^F\/false\/F+$/.test(states[2]), 'COMPACT cycles Full → Compact → Minimized → Full', states);

    /* 4 · the device editor's readout */
    const box = await page.locator('#modwin .m2dev.lfo .m2edit svg').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4);
    await page.waitForTimeout(150);
    const ro = await page.evaluate(() => { const r = document.querySelector('#modwin .m2dev.lfo .readout-layer'); return r ? { state: r.dataset.state, time: (r.querySelector('.rl-clip-time') || {}).textContent, value: (r.querySelector('.rl-clip-value') || {}).textContent } : null; });
    L.ck(ro && ro.state === 'hover' && /beat|s$/.test(ro.time) && /%$/.test(ro.value), 'the device curve editor shows the readout: the time in the cycle\'s unit and the value', ro);
    L.ck(errors().length === 0, 'no page errors', errors());
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
