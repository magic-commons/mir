/* timeline-scrub.browser.mjs — BASINS tools/rig/timeline-scrub-check.mjs (SMOOTH SCRUB + SAMPLING, 2026-10-01), ported to
 * gallery/timeline.html (2026-10-02): free scrub (Shift snaps, Alt bypasses), Escape rewinds, and the hand leads the
 * playhead at every SCRUB level, landing the model on the hand's beat at release.  The SAMPLING checks that need
 * BASINS' Settings window and its AUTOMATION grid are listed below and not run.
 * MIR_BASE=http://127.0.0.1:8830/ node tests/timeline-scrub.browser.mjs */
import { openTimeline, ledger } from './timeline-rig.mjs';

const SHOT = process.env.SHOT || (await import('node:os')).tmpdir();

async function setup(page) {
  await page.evaluate(() => {
    const T = window.__TL;
    T.mod.play(false); T.mod.arm(false);
    T.mod.host.model.modReset({ bare: true }); T.mod.host.targets.sync();
    T.tl.controller.seek(0); T.tl.open();
    document.querySelector('.tl-viewport').scrollLeft = 0;
    /* BASINS' rig ran its own rAF loop (S.mod.tick + paintHead); the kit paints the head from the controller's own
       'scrub' and 'seek' reasons and from the app's present, so no loop is added here (idle costs nothing) */
  });
  await page.waitForTimeout(150);
}

const playheadX = (page) => page.locator('.tl-playhead').evaluate((n) => {
  const m = /translateX\(([-\d.]+)px\)/.exec(n.style.transform); return m ? parseFloat(m[1]) : null;
});
const expectedX = (page) => page.evaluate(() => {
  const T = window.__TL, hand = T.tl.controller.handBeat();
  const beat = hand === null ? T.mod.host.model.transport.beats : hand;
  return beat * T.tl.editor.px() - document.querySelector('.tl-viewport').scrollLeft;
});
/* BASINS' Settings › QUALITY › SAMPLING › SCRUB is the gallery's SCRUB control (the scrubLevel port) */
const pickScrub = (page, label) => page.locator(`[data-g="scrub"] .seg-b[data-id="${label.toLowerCase()}"]`).click();

const name = 'chromium', touch = false;
const RUN = await (async () => {
  const { page, errors, presses, close } = await openTimeline();
  const L = ledger(name);
  try {
    await setup(page);
    const ruler = page.locator('.tl-ruler');
    const r = await ruler.boundingBox();

    /* ── LAW 1: FREE SCRUB — unsnapped by default, Shift snaps, Alt always bypasses ───────────── */
    await page.mouse.move(r.x + 37, r.y + 16); await page.mouse.down();
    await page.mouse.move(r.x + 37, r.y + 16);
    await page.waitForTimeout(80);
    const free = await page.evaluate(() => window.__TL.tl.controller.state().beat);
    await page.mouse.up();
    L.ck(!Number.isInteger(free) && free > 0, 'plain scrub is unsnapped (not on the beat grid)', free);

    await page.keyboard.down('Shift');
    await page.mouse.move(r.x + 50, r.y + 16); await page.mouse.down();
    await page.mouse.move(r.x + 50, r.y + 16);
    await page.waitForTimeout(80);
    const snapped = await page.evaluate(() => window.__TL.tl.controller.state().beat);
    await page.mouse.up(); await page.keyboard.up('Shift');
    L.ck(Number.isInteger(snapped), 'Shift snaps the scrub to the grid', snapped);

    await page.keyboard.down('Shift'); await page.keyboard.down('Alt');
    await page.mouse.move(r.x + 63, r.y + 16); await page.mouse.down();
    await page.mouse.move(r.x + 63, r.y + 16);
    await page.waitForTimeout(80);
    const bypassed = await page.evaluate(() => window.__TL.tl.controller.state().beat);
    await page.mouse.up(); await page.keyboard.up('Alt'); await page.keyboard.up('Shift');
    L.ck(!Number.isInteger(bypassed), 'Alt bypasses the grid even with Shift held', bypassed);

    /* ── LAW: Escape rewinds to where the gesture began ───────────────────────────────────────── */
    await page.evaluate(() => window.__TL.tl.controller.seek(5));
    await page.mouse.move(r.x + 200, r.y + 16); await page.mouse.down();
    await page.mouse.move(r.x + 260, r.y + 16);
    await page.waitForTimeout(80);
    await page.keyboard.press('Escape'); await page.mouse.up();
    const rewound = await page.evaluate(() => window.__TL.tl.controller.state().beat);
    L.ck(rewound === 5, 'Escape rewinds the scrub to its starting beat', rewound);

    /* ── LAW 3: SCRUB level — LIVE/LIGHT/RELEASE; the model lands on the hand's beat at release ── */
    for (const [label, level] of [['LIVE', 'live'], ['LIGHT', 'light'], ['RELEASE', 'release']]) {
      await pickScrub(page, label); await page.waitForTimeout(40);
      await page.evaluate(() => { window.__TL.tl.controller.seek(0); window.__seeks = 0; window.__scrubs = 0; window.__frames = 0; });
      // the editor funnels every pointer move through frame-coalescer.js before it ever reaches scrub(), so
      // 'scrub' reasons are the coalesced paint opportunities; requestAnimationFrame is extra evidence only —
      // headless WebKit throttles it far below the coalescer's own 32ms timer fallback (frame-coalescer.js).
      await page.evaluate(() => { window.__unsub = window.__TL.tl.controller.subscribe((reason) => { if (reason === 'seek') window.__seeks++; if (reason === 'scrub') window.__scrubs++; }); const c = () => { window.__frames++; if (!window.__frameStop) requestAnimationFrame(c); }; window.__frameStop = false; requestAnimationFrame(c); });
      await page.mouse.move(r.x + 10, r.y + 16); await page.mouse.down();
      let midX = null, midExpected = null;
      for (let i = 1; i <= 60; i++) {
        await page.mouse.move(r.x + 10 + i * 5, r.y + 16); await page.waitForTimeout(4);
        if (i === 30) { midX = await playheadX(page); midExpected = await expectedX(page); }
      }
      await page.waitForTimeout(80);
      const tally = await page.evaluate(() => { window.__frameStop = true; window.__unsub(); return { seeks: window.__seeks, scrubs: window.__scrubs, frames: window.__frames, moves: 60 }; });
      const handAtRelease = await page.evaluate(() => window.__TL.tl.controller.handBeat());
      await page.mouse.up();
      const settled = await page.evaluate(() => window.__TL.tl.controller.state().beat);
      const expectSeeks = level === 'live' ? tally.scrubs : level === 'release' ? 0 : Math.round(tally.scrubs / 3);
      L.ck(tally.seeks <= tally.scrubs && Math.abs(tally.seeks - expectSeeks) <= 1, `${label}: seeks <= coalesced paints, at the level's own rate`, tally);
      L.ck(midX !== null && Math.abs(midX - midExpected) < 1, `${label}: the playhead transform follows the hand within a frame mid-drag`, { midX, midExpected });
      L.ck(settled === handAtRelease, `${label}: the model lands exactly on the hand's beat at release`, { settled, handAtRelease });
    }

    /* NEEDS THE APP (BASINS' Settings window and its AUTOMATION sampling grid, which stay BASINS'): every SAMPLING control
       carries a hint · LIVE over a forced slow frame toasts · an AUTOMATION grid toasts · SAMPLING persists across a reload
       · FRAME samples a changing value · 1/8 holds one stepped value · a deterministic export samples per frame · 1/8
       presents fewer renders than FRAME.  Not run here. */

    await page.screenshot({ path: `${SHOT}/timeline-scrub-${name}.png` });
    L.ck(errors().length === 0, 'no page errors', errors());
    L.ck(presses().every((p) => / @(timeline|rail|popup|bar)$/.test(p.at)), 'every press landed on the timeline or the gallery bar\'s SCRUB control (elementFromPoint)', presses().filter((p) => !/ @(timeline|rail|popup|bar)$/.test(p.at)));
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
