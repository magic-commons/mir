// THE ONE LINE (wave 19, Josh 2026-10-06: "Never let the timeline's work bars 'word wrap', instead let it show a button that
// shows more button options").  The tool bar keeps ONE line at every width; what does not fit folds, from the bar's END,
// behind the one ⋯ (MORE), whose list shows the folded tools as rows in bar order, each acting through the bar's own control
// and showing its pressed state; the first tools never move; widen and they come back; a state change never moves a tool.
// Real input through the rig (every press hit-tested).  MIR_BASE=http://127.0.0.1:8837/ node tests/timeline-fold.browser.mjs
import { openTimeline, ledger } from './timeline-rig.mjs';

const ORDER = ['edit', 'select', 'scrub', 'slice', 'scope', 'snap', 'step', 'slide', 'active'];   // the bar's fold order, restated
const RUN = await (async () => {
  const { page, errors, presses, close } = await openTimeline();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const L = ledger('chromium');
  try {
    /* the bar at a floating width: which of the fold order shows, the bar's lines, the rects of the first two tools */
    const at = async (w, extra = '') => {
      await page.evaluate(([w]) => { window.__TL.tl.win.place({ x: 240, y: 300, w, h: 440 }); }, [w]);
      await page.waitForTimeout(160);
      return page.evaluate(([order]) => {
        const bar = document.querySelector('.tl-toolbar'), win = document.querySelector('.mir-win.mir-timeline').getBoundingClientRect();
        const node = (k) => k === 'scope' ? bar.querySelector('.tl-scope').parentElement : k === 'snap' ? bar.querySelector('.tl-setting') : bar.querySelector(`[data-tool="${k}"], [data-mode="${k}"]`);
        const shown = order.filter((k) => getComputedStyle(node(k)).display !== 'none');
        const kids = [...bar.children].filter((n) => getComputedStyle(n).display !== 'none').map((n) => n.getBoundingClientRect());
        const rel = (k) => { const r = node(k).getBoundingClientRect(); return [Math.round(r.left - win.left), Math.round(r.top - win.top), Math.round(r.width)]; };
        const more = bar.querySelector('[data-mode="more"]').getBoundingClientRect(), b = bar.getBoundingClientRect();
        return { shown, folded: window.__TL.tl.editor.folded(), oneLine: kids.every((r) => Math.abs(r.top + r.height / 2 - (kids[0].top + kids[0].height / 2)) < 2), barH: Math.round(b.height),
          fits: bar.scrollWidth <= bar.clientWidth + 1 && b.right <= win.right + .5, moreLast: Math.abs(more.right - Math.max(...kids.map((r) => r.right))) < .5,
          edit: rel('edit'), select: rel('select'), column: getComputedStyle(document.querySelector('.tl-worklane')).flexDirection === 'column' };
      }, [ORDER]);
    };
    const moreRows = () => page.evaluate(() => [...document.querySelectorAll('.tl-pop[data-pop="more"] [data-fold]')].map((n) => n.dataset.fold));
    await page.evaluate(() => { const T = window.__TL; T.mod.play(false); T.tl.open(); });

    // ---- wide: every tool on the bar, nothing behind MORE ---------------------------------------------------------------
    const wide = await at(1500);
    L.ck(wide.shown.length === ORDER.length && wide.folded === 0, 'a wide timeline has every tool on its bar', wide);
    L.ck(wide.oneLine && wide.fits && wide.moreLast, 'one line, inside the window, MORE last', wide);
    await page.locator('.tl-toolbar [data-mode="more"]').click(); await page.waitForTimeout(60);
    L.ck((await moreRows()).length === 0 && await page.locator('.tl-pop[data-pop="more"] [data-row="select-all"]').count() === 1, 'wide: MORE lists the selection actions and no folded tool', await moreRows());
    await page.keyboard.press('Escape'); await page.waitForTimeout(40);
    const glyph = await page.evaluate(() => { const b = document.querySelector('.tl-toolbar [data-mode="more"]'); return { svg: !!b.querySelector('svg.gly-more'), text: b.textContent.trim(), lamp: b.classList.contains('on') || b.hasAttribute('aria-pressed') }; });
    L.ck(glyph.svg && glyph.text === '' && !glyph.lamp, 'MORE is drawn from glyph.js (no typed character) and is a trigger: no lamp, no pressed state', glyph);

    // ---- narrowed in steps (the work lane in its column: the bar starts at the window's left) ------------------------------
    const steps = []; for (let w = 740; w >= 320; w -= 20) steps.push(await at(w));
    const first = steps[0];
    L.ck(steps.every((s) => s.column), 'the steps run with the bar on its own line', steps.map((s) => s.column));
    L.ck(steps.every((s) => s.oneLine && s.barH === first.barH), 'the bar stays one line at every width (its height never changes)', steps.map((s) => [s.oneLine, s.barH]));
    L.ck(steps.every((s) => s.fits && s.moreLast), 'every tool shown fits inside the window, and MORE stays last', steps.filter((s) => !s.fits || !s.moreLast));
    L.ck(steps.every((s) => s.shown.join() === ORDER.slice(0, s.shown.length).join()), 'what shows is always the head of the bar: tools fold from the END', steps.map((s) => s.shown.length));
    L.ck(steps.every((s, i) => i === 0 || s.folded >= steps[i - 1].folded) && steps.at(-1).folded > first.folded, 'narrowing folds more, never fewer', steps.map((s) => s.folded));
    L.ck(steps.every((s) => s.edit.join() === first.edit.join() && s.select.join() === first.select.join()), 'the first tools never move', steps.map((s) => [s.edit, s.select]));

    // ---- at the edge it does not flicker: a fold needs a few pixels of room before it comes back --------------------------
    const edge = await page.evaluate(async () => {
      const T = window.__TL, settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 20))));
      const set = async (w) => { T.tl.win.place({ x: 240, y: 300, w, h: 440 }); await settle(); await settle(); return T.tl.editor.folded(); };
      let w = 700; const f0 = await set(w);
      while (w > 320 && (await set(w - 1)) === f0) w--;
      const folds = w - 1, at = await set(folds), plus2 = await set(folds + 2), plus12 = await set(folds + 12);
      return { f0, folds, at, plus2, plus12 };
    });
    L.ck(edge.at === edge.f0 + 1 && edge.plus2 === edge.at && edge.plus12 === edge.f0, 'at the edge a tool folds at once and comes back only with room to spare (no flicker)', edge);

    // ---- MORE lists the folded tools in bar order; a row acts through the bar's own control and shows its state -----------
    const narrow = await at(420);
    await page.locator('.tl-toolbar [data-mode="more"]').click(); await page.waitForTimeout(60);
    let rows = await moreRows();
    L.ck(rows.join() === ORDER.slice(narrow.shown.length).join(), 'MORE lists exactly the folded tools, in bar order', { rows, shown: narrow.shown });
    const stepWas = await page.evaluate(() => document.querySelector('.tl-toolbar [data-mode="step"]').getAttribute('aria-pressed'));
    await page.locator('.tl-pop [data-fold="step"]').click(); await page.waitForTimeout(60);
    const stepNow = await page.evaluate(() => ({ bar: document.querySelector('.tl-toolbar [data-mode="step"]').getAttribute('aria-pressed'), pop: document.querySelectorAll('.tl-pop').length }));
    L.ck(stepWas === 'false' && stepNow.bar === 'true' && stepNow.pop === 0, 'pressing the folded STEP row turns STEP on (the bar\'s own control) and closes the list', { stepWas, stepNow });
    await page.locator('.tl-toolbar [data-mode="more"]').click(); await page.waitForTimeout(60);
    const stepRow = await page.evaluate(() => { const r = document.querySelector('.tl-pop [data-fold="step"]'); return { pressed: r.getAttribute('aria-pressed'), on: r.classList.contains('on') }; });
    L.ck(stepRow.pressed === 'true' && stepRow.on, 'the folded STEP row shows its pressed state', stepRow);
    await page.locator('.tl-pop [data-fold="snap"]').click(); await page.waitForTimeout(60);
    const snapList = await page.evaluate(() => [...document.querySelectorAll('.tl-pop[data-pop="snap"] [data-row]')].map((n) => n.dataset.row + ':' + n.getAttribute('aria-pressed')));
    L.ck(snapList.includes('snap-1:true') && snapList.filter((x) => x.endsWith(':true')).length === 1, 'the folded SNAP row opens its choices, the one in force pressed', snapList);
    await page.locator('.tl-pop [data-row="snap-0.5"]').click(); await page.waitForTimeout(60);
    L.ck(await page.evaluate(() => window.__TL.tl.editor.snap()) === .5 && await page.evaluate(() => document.querySelector('.tl-toolbar .tl-setting select').value) === '0.5', 'choosing EIGHTH there sets the snap and the bar\'s own select', await page.evaluate(() => window.__TL.tl.editor.snap()));
    await page.locator('.tl-toolbar [data-mode="step"]').evaluate((b) => { b.click(); return 0; });   // STEP off again (folded: no seat to press)

    // ---- a state change moves nothing: every tool keeps its width pressed or not ------------------------------------------
    await at(1500);
    const widths = await page.evaluate(() => [...document.querySelectorAll('.tl-toolbar > .tl-action, .tl-toolbar > .tl-setting, .tl-toolbar > .tl-select-wrap')].map((b) => {
      const w0 = b.getBoundingClientRect().width; b.classList.toggle('on'); const w1 = b.getBoundingClientRect().width; b.classList.toggle('on'); return Math.abs(w0 - w1); }));
    L.ck(widths.every((d) => d < .01), 'pressed or not, no tool changes width (its neighbours never shift)', widths);

    // ---- widen again: they come back --------------------------------------------------------------------------------------
    const back = await at(1500);
    L.ck(back.folded === 0 && back.shown.length === ORDER.length, 'widened again, every tool is back on the bar', back);

    // ---- a wide transport beside the bar (BASINS' row): the TOOLS fold too, and their keys and state hold ------------------
    await page.evaluate(() => { document.querySelector('.tl-transport-host').style.minWidth = '760px'; });
    const crowded = await at(900);
    L.ck(!crowded.column && crowded.oneLine && crowded.fits && crowded.folded >= 7, 'beside a wide transport the bar folds even its tools, on one line', crowded);
    await page.locator('.timeline-surface').focus(); await page.keyboard.press('C'); await page.waitForTimeout(60);
    L.ck(await page.evaluate(() => window.__TL.tl.editor.tool()) === 'slice', 'a folded tool\'s key still works (C: SLICE)', await page.evaluate(() => window.__TL.tl.editor.tool()));
    await page.locator('.tl-toolbar [data-mode="more"]').click(); await page.waitForTimeout(60);
    rows = await moreRows();
    const sliceRow = await page.evaluate(() => { const r = document.querySelector('.tl-pop [data-fold="slice"]'); return r && { pressed: r.getAttribute('aria-pressed'), on: r.classList.contains('on') }; });
    L.ck(rows.join() === ORDER.slice(crowded.shown.length).join() && sliceRow?.pressed === 'true' && sliceRow.on, 'the folded SLICE row shows the tool the key chose', { rows, sliceRow });
    const selectRow = await page.evaluate(() => { const r = document.querySelector('.tl-pop [data-fold="select"]'); return r && { icon: !!r.querySelector('svg.gly-select'), word: (r.querySelector('.tl-row-word') || r).textContent.trim(), key: (r.querySelector('.tl-key') || {}).textContent || '', pressed: r.getAttribute('aria-pressed') }; });
    L.ck(selectRow?.icon && selectRow.word === 'SELECT' && selectRow.pressed === 'false', 'a folded tool\'s row is its icon and its word, unpressed while another tool is chosen', selectRow);
    await page.locator('.tl-pop [data-fold="select"]').click(); await page.waitForTimeout(60);
    L.ck(await page.evaluate(() => window.__TL.tl.editor.tool()) === 'select', 'pressing the folded SELECT row chooses SELECT', await page.evaluate(() => window.__TL.tl.editor.tool()));
    await page.evaluate(() => { document.querySelector('.tl-transport-host').style.minWidth = ''; });
    const freed = await at(1500);
    L.ck(freed.folded === 0, 'with the room back, nothing stays folded', freed);

    L.ck(errors().length === 0, 'no page errors', errors());
    L.ck(presses().every((p) => / @(timeline|rail|popup)$/.test(p.at)), 'every press landed on the timeline, its rail or its popups (elementFromPoint)', presses().filter((p) => !/ @(timeline|rail|popup)$/.test(p.at)));
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
