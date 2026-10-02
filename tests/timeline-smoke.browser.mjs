// The timeline smoke: the app boots GPU-free, the TIMELINE opens docked, a ruler drag scrubs the transport through
// controller.scrub, and a screenshot lands in SHOT (default: the system's temp folder).
// PORTED (2026-10-02) from BASINS tools/rig/smoke-timeline.mjs to gallery/timeline.html: every check kept; Chromium only.
// MIR_BASE=http://127.0.0.1:8830/ node tests/timeline-smoke.browser.mjs
import { openTimeline, ledger } from './timeline-rig.mjs';

const SHOT = process.env.SHOT || (await import('node:os')).tmpdir();
const name = 'chromium', touch = false;
const RUN = await (async () => {
  const { page, errors, presses, close } = await openTimeline();
  const L = ledger(name);
  try {
    await page.evaluate(() => { const T = window.__TL; T.mod.play(false); T.tl.open();   /* the gallery's timeline is docked at the bottom, 440 tall */ });
    await page.waitForTimeout(200);
    L.ck(await page.locator('.tl-ruler').count() === 1, 'the ruler strip exists');
    L.ck(await page.locator('.tl-pane').count() === 4, 'four lanes');
    const r = await page.locator('.tl-ruler').boundingBox();
    const before = await page.evaluate(() => window.__TL.tl.controller.state().beat);
    await page.mouse.move(r.x + 120, r.y + r.height / 2); await page.mouse.down();
    await page.mouse.move(r.x + 220, r.y + r.height / 2, { steps: 8 }); await page.waitForTimeout(60);
    const mid = await page.evaluate(() => ({ beat: window.__TL.tl.controller.state().beat, scrubbing: window.__TL.tl.controller.isScrubbing() }));
    await page.mouse.up(); await page.waitForTimeout(60);
    const after = await page.evaluate(() => ({ beat: window.__TL.tl.controller.state().beat, scrubbing: window.__TL.tl.controller.isScrubbing() }));
    L.ck(mid.scrubbing && mid.beat > before, 'a ruler drag scrubs the transport forward', { before, mid });
    L.ck(!after.scrubbing && after.beat === mid.beat, 'release keeps the last beat and ends the scrub', after);
    L.ck(await page.locator('.tl-playhead').evaluate((n) => /translateX\((\d+(\.\d+)?)px\)/.test(n.style.transform)), 'the playhead paints by transform');
    await page.screenshot({ path: `${SHOT}/timeline-smoke-${name}.png` });
    L.ck(errors().length === 0, 'no page errors', errors());
    L.ck(presses().every((p) => / @(timeline|rail|popup)$/.test(p.at)), 'every press landed on the timeline, its rail or its popups (elementFromPoint)', presses().filter((p) => !/ @(timeline|rail|popup)$/.test(p.at)));
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
