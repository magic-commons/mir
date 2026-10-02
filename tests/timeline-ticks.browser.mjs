/* timeline-ticks.browser.mjs — BASINS tools/rig/timeline-ticks-check.mjs (THE BEAT TICKS + THE SHORTCUT SHEET, 2026-10-01),
 * ported to gallery/timeline.html (2026-10-02): the graded tick law live in the pane's CSS at six zoom levels, the
 * Shift+1..5 / Shift+I keys (rows of the key table now), the ⋯ › SHORTCUTS sheet, and a regression subset of the keys.
 * The sheet's keys come from the key table (shortcutRows), where BASINS read its hand-kept TIMELINE_KEYS.
 * Pane plates go to docs/plates/timeline/ only with MIR_PLATES=1 (a test run never writes into docs/).
 * MIR_BASE=http://127.0.0.1:8830/ node tests/timeline-ticks.browser.mjs */
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { openTimeline, ledger } from './timeline-rig.mjs';
import { timelineActions, shortcutRows } from '../mir/timeline/shortcuts.js';

const PLATES = process.env.MIR_PLATES === '1' ? fileURLToPath(new URL('../docs/plates/timeline/', import.meta.url)) : os.tmpdir() + '/';
await mkdir(PLATES, { recursive: true });
const SHEET_KEYS = shortcutRows(timelineActions(() => null)).flatMap((r) => r.keys.split(' · '));

// Mirrors app/timeline-view.js's tickLaw(): an independent oracle, not an import of the code under test.
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const expectedLaw = (px) => ({ beatAlpha: .16 * clamp((px - 4) / 8, .5, 1), beatHeight: px < 12 ? 3 : 4, subdivisions: px >= 20 });

const name = 'chromium';
const RUN = await (async () => {
  const { page, errors, presses, close } = await openTimeline();
  const L = ledger(name);
  try {
    await page.evaluate(() => { const T = window.__TL; T.mod.play(false); T.tl.open();   /* the gallery's timeline is docked at the bottom, 440 tall */ });
    await page.waitForTimeout(150);
    const surface = page.locator('.timeline-surface'), pane = page.locator('.tl-pane').first();
    const dpr = await page.evaluate(() => window.devicePixelRatio || 1);
    const meter = await page.evaluate(() => window.__TL.tl.editor.model.state().meter);
    const px = async () => page.evaluate(() => window.__TL.tl.editor.px());
    // Lane T2 (2026-10-01) removed the − / + toolbar buttons; their keys (PageDown / PageUp) are the same zoom(1/1.25) / zoom(1.25).
    const zoomOut = { click: () => page.keyboard.press('PageDown') }, zoomIn = { click: () => page.keyboard.press('PageUp') };

    const readTicks = async () => page.evaluate(() => {
      const n = document.querySelector('.tl-pane'), cs = getComputedStyle(n);
      return { pattern: cs.getPropertyValue('--tl-beat-pattern'), alpha: cs.getPropertyValue('--tl-beat-alpha'), height: cs.getPropertyValue('--tl-beat-height'), sub: n.classList.contains('subdivisions'), dense: n.classList.contains('dense') };
    });
    const checkLaw = async (label, actualPx) => {
      const want = expectedLaw(actualPx), got = await readTicks();
      const xs = [...got.pattern.matchAll(/transparent ([\d.]+)px,(?:var\(--tl-beat-tick\)|color-mix)/g)].map((m) => Number(m[1]));
      L.ck(xs.length === meter - 1, `${label}: a beat stop for every beat (px=${actualPx.toFixed(2)})`, { xs, meter });
      L.ck(xs.every((x) => Math.abs(x * dpr - Math.round(x * dpr)) < 1e-6), `${label}: every stop lands on a device pixel`, { xs, dpr });
      L.ck(Math.abs(Number(got.alpha) - want.beatAlpha) < 1e-6, `${label}: alpha follows the ramp, never zero`, { got: got.alpha, want: want.beatAlpha });
      L.ck(Number.parseFloat(got.height) === want.beatHeight, `${label}: height steps at 12px`, { got: got.height, want: want.beatHeight });
      L.ck(got.sub === want.subdivisions, `${label}: subdivisions from 20px (was 24px)`, { got: got.sub, want: want.subdivisions });
      L.ck(got.dense === false, `${label}: no .dense cliff class`, got.dense);
      const box = await pane.boundingBox();
      await page.screenshot({ path: `${PLATES}ticks-${label}-${name}.png`, clip: { x: box.x, y: box.y, width: Math.min(260, box.width), height: box.height } });
    };

    await surface.focus();
    for (let i = 0; i < 12; i++) await zoomOut.click();
    await checkLaw('px08', await px());
    await zoomIn.click();
    await checkLaw('px10', await px());
    await page.keyboard.press('Shift+1'); let p = await px();
    L.ck(p === 12, 'Shift+1 zooms to 12px/beat', p); await checkLaw('px12', p);
    await page.keyboard.press('Shift+2'); p = await px();
    L.ck(p === 20, 'Shift+2 zooms to 20px/beat', p);
    await zoomOut.click(); p = await px();
    L.ck(p === 16, 'one zoom-out step from Shift+2 lands on 16px', p); await checkLaw('px16', p);
    await page.keyboard.press('Shift+2'); // reset to the exact 20px baseline before the wheel step
    const box = await page.locator('.tl-viewport').boundingBox();
    await page.mouse.move(box.x + 200, box.y + 40);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -Math.log(1.2) / .003);
    await page.keyboard.up('Control');
    await page.waitForTimeout(40);
    p = await px();
    L.ck(Math.abs(p - 24) < .6, 'Ctrl+wheel reaches ~24px/beat', p); await checkLaw('px24', p);
    await page.keyboard.press('Shift+3'); p = await px();
    L.ck(p === 40, 'Shift+3 zooms to 40px/beat', p); await checkLaw('px40', p);

    // Selection: Shift+I inverts, Shift+4 fits the whole arrangement, Shift+5 aliases Shift+Z.
    const ids = await page.evaluate(() => {
      const T = window.__TL, m = T.tl.editor.model; m.restore(null);
      const a = m.create({ targetId: 'scene.spin', start: 0, duration: 4, value: .2 });
      const b = m.create({ targetId: 'scene.hue', start: 8, duration: 4, value: .5, laneId: m.state().lanes[1].id });
      return { a, b };
    });
    await page.locator('.tl-tool[data-tool="edit"]').click();
    const titleA = await page.locator(`.tl-clip-title[data-clip="${ids.a}"]`).boundingBox();
    await page.mouse.click(titleA.x + 10, titleA.y + 7);
    let sel = await page.evaluate(() => window.__TL.tl.editor.selection());
    L.ck(sel.clips.length === 1 && sel.clips[0] === ids.a, 'clicking a clip title selects it', sel);
    await surface.focus();
    await page.keyboard.press('Shift+I');
    sel = await page.evaluate(() => window.__TL.tl.editor.selection());
    L.ck(sel.clips.length === 1 && sel.clips[0] === ids.b, 'Shift+I inverts the clip selection', sel);
    await page.keyboard.press('Shift+I');
    sel = await page.evaluate(() => window.__TL.tl.editor.selection());
    L.ck(sel.clips.length === 1 && sel.clips[0] === ids.a, 'Shift+I inverts back', sel);

    const vw = await page.locator('.tl-viewport').evaluate((n) => n.clientWidth);
    const wantFit = clamp((vw - 40) / 12, 8, 100);
    await page.keyboard.press('Shift+4');
    let after = await page.evaluate(() => ({ px: window.__TL.tl.editor.px(), sel: window.__TL.tl.editor.selection() }));
    L.ck(Math.abs(after.px - wantFit) < .6, 'Shift+4 fits the whole arrangement', { got: after.px, want: wantFit });
    L.ck(after.sel.clips.length === 1 && after.sel.clips[0] === ids.a, 'Shift+4 does not disturb the clip selection', after.sel);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Shift+5');
    after = await page.evaluate(() => window.__TL.tl.editor.px());
    L.ck(Math.abs(after - wantFit) < .6, 'Shift+5 aliases Shift+Z (zoom to selection)', after);

    // The ⋯ menu opens the sheet; it lists every keyboard key of the doc.
    await page.locator('.tl-toolbar [data-mode="more"]').click();
    await page.locator('.tl-pop [data-row="shortcuts"]').click();
    const sheet = page.locator('.tl-shortcuts');
    L.ck(await sheet.count() === 1, 'the ⋯ menu opens the sheet as a kit popup', true);
    const sheetText = await sheet.textContent();
    L.ck(SHEET_KEYS.every((key) => sheetText.includes(key)), 'the sheet lists every key of the key table', SHEET_KEYS.filter((k) => !sheetText.includes(k)));
    await page.keyboard.press('Escape');
    L.ck(await sheet.count() === 0, 'Escape closes the sheet', true);

    // Regression: a subset of Sol's existing key assertions still hold after this lane's edits.
    await surface.focus();
    await page.keyboard.press('Control+a');
    sel = await page.evaluate(() => window.__TL.tl.editor.selection());
    L.ck(sel.clips.length === 2, 'Ctrl+A still selects all', sel);
    await page.keyboard.press('Control+d');
    sel = await page.evaluate(() => window.__TL.tl.editor.selection());
    L.ck(sel.clips.length === 0, 'Ctrl+D still deselects', sel);
    await page.keyboard.press('Home');
    const beat = await page.evaluate(() => window.__TL.mod.host.model.transport.beats);
    L.ck(beat === 0, 'Home still seeks to the start', beat);
    await page.keyboard.press('Shift+2');
    const pxBefore = await px();
    await page.keyboard.press('PageUp');
    L.ck((await px()) > pxBefore, 'PageUp still zooms in', { pxBefore, pxAfter: await px() });
    await page.keyboard.press('e');
    L.ck(await page.locator('.tl-tool[data-tool="select"]').getAttribute('aria-pressed') === 'true', 'E still selects the Select tool', true);
    await page.keyboard.press('y');
    L.ck(await page.locator('.tl-tool[data-tool="scrub"]').getAttribute('aria-pressed') === 'true', 'Y still selects the Scrub tool', true);
    await page.keyboard.press('p');
    L.ck(await page.locator('.tl-tool[data-tool="edit"]').getAttribute('aria-pressed') === 'true', 'P still selects the Edit tool', true);

    L.ck(errors().length === 0, 'no page errors', errors());
    L.ck(presses().every((p) => / @(timeline|rail|popup)$/.test(p.at)), 'every press landed on the timeline, its rail or its popups (elementFromPoint)', presses().filter((p) => !/ @(timeline|rail|popup)$/.test(p.at)));
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
