// The PATTERN window, in a real browser (tests/fixtures/pattern.html): PATT on the ENV face opens the window seated on
// its ENV device; steps paint with real pointer events (hit-tested with elementFromPoint); the sequencer fires the ENV on
// a stepped clock; the window follows its device when the run scrolls and hides when the device scrolls away; it goes
// and comes back with the modulation window.
// MIR_BASE=http://127.0.0.1:8843/ node tests/pattern.browser.mjs
import { openTimeline, ledger } from './timeline-rig.mjs';

const RUN = await (async () => {
  const { page, errors, close } = await openTimeline({ page: 'tests/fixtures/pattern.html', query: '', width: 1280, height: 900 });
  const L = ledger('pattern');
  const at = (x, y) => page.evaluate(([x, y]) => { const n = document.elementFromPoint(x, y); return n ? { cls: String(n.className && n.className.baseVal !== undefined ? n.className.baseVal : n.className), pattern: !!n.closest('.mir-pattern'), patt: !!n.closest('.m2patt'), step: n.closest('.pt-step') ? +n.closest('.pt-step').dataset.i : null } : null; }, [x, y]);
  try {
    await page.evaluate(() => { window.__P.mod.open(); });
    await page.waitForTimeout(500);
    const env = await page.evaluate(() => window.__P.mod.M.sourceList().find((s) => s.kind === 'env').id);

    /* 1 · PATT on the ENV face, pressed for real */
    const patt = await page.locator('.m2dev[data-id="' + env + '"] .m2patt').boundingBox();
    L.ck(!!patt && patt.width > 20, 'PATT is on the ENV face', patt);
    const hitPatt = await at(patt.x + patt.width / 2, patt.y + patt.height / 2);
    L.ck(hitPatt && hitPatt.patt, 'PATT is what a hand presses there (elementFromPoint)', hitPatt);
    await page.mouse.click(patt.x + patt.width / 2, patt.y + patt.height / 2);
    await page.waitForTimeout(600);
    const seated = await page.evaluate((id) => {
      const P = window.__P, r = P.pattern.root.getBoundingClientRect(), d = document.querySelector('.m2dev[data-id="' + id + '"]').getBoundingClientRect();
      return { open: P.pattern.isOpen(), live: P.pattern.model.isLive(id), docked: P.pattern.docked(), left: r.left, width: r.width, top: r.top, bottom: r.bottom,
        devLeft: d.left, devWidth: d.width, modTop: P.mod.view.seatBox().content.top, rows: P.pattern.rows().length, h: r.height, want: P.pattern.height(),
        pressed: document.querySelector('.m2dev[data-id="' + id + '"] .m2patt').getAttribute('aria-pressed') };
    }, env);
    L.ck(seated.open && seated.live && seated.pressed === 'true', 'PATT turns the row live, lights, and opens the window', seated);
    L.ck(seated.docked && Math.abs(seated.left - seated.devLeft) <= 1 && Math.abs(seated.width - seated.devWidth) <= 1, 'the window is seated on its ENV device: its left and its width', seated);
    L.ck(Math.abs(seated.modTop - 8 - seated.bottom) <= 1.5 || seated.top >= seated.modTop, 'it sits 8 px over the modulation window (or under it when the top has no room)', seated);
    L.ck(seated.rows === 1 && Math.abs(seated.h - seated.want) <= 1, 'one row per ENV, and the height is the rows\'', seated);

    /* 2 · steps paint with real pointer events */
    const s0 = await page.locator('.mir-pattern .pt-step[data-i="0"]').boundingBox();
    const s3 = await page.locator('.mir-pattern .pt-step[data-i="3"]').boundingBox();
    const hit0 = await at(s0.x + s0.width / 2, s0.y + s0.height / 2);
    L.ck(hit0 && hit0.pattern && hit0.step === 0, 'step 1 is what a hand presses there (elementFromPoint)', hit0);
    await page.mouse.move(s0.x + s0.width / 2, s0.y + s0.height / 2); await page.mouse.down();
    await page.mouse.move(s3.x + s3.width / 2, s3.y + s3.height / 2, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(80);
    const painted = await page.evaluate((id) => ({ steps: window.__P.pattern.model.steps(id).slice(0, 6), lit: [...document.querySelectorAll('.mir-pattern .pt-step.on')].map((b) => +b.dataset.i), undo: window.__P.history.length }), env);
    L.ck(painted.steps.join() === '127,127,127,127,0,0' && painted.lit.join() === '0,1,2,3', 'a drag paints a run of four steps, lit', painted);
    L.ck(painted.undo === 1, 'the paint-drag is one row of the one history', painted);

    /* 3 · the sequencer fires on a stepped clock: FILL EACH 4 by the cap's menu, then 4 beats of recorder steps */
    const cap = await page.locator('.mir-pattern .pt-cap').boundingBox();
    await page.mouse.click(cap.x + cap.width / 2, cap.y + cap.height / 2);
    await page.waitForTimeout(80);
    const items = await page.evaluate(() => window.__P.pattern.menu());
    L.ck(Array.isArray(items) && items.length >= 7, 'the cap opens the row menu: ON/OFF · FILL 2/4/8 · CLEAR · LENGTH', items);
    const fill4 = await page.evaluate(() => { const b = [...document.querySelectorAll('.pt-menu .pt-mi')][2].getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    const hitFill = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y).closest('.pt-menu'), [fill4.x, fill4.y]);
    L.ck(hitFill, 'the menu item is what a hand presses (elementFromPoint)', fill4);
    await page.mouse.click(fill4.x, fill4.y);
    await page.waitForTimeout(60);
    const fired = await page.evaluate((id) => {
      const P = window.__P, M = P.mod.M, clock = P.mod.host.clock;
      clock.setBpm(120); clock.seek(0);
      const release = clock.suspendRealtime(performance.now() / 1000);         // the recorder owns time: no realtime pump
      const f0 = M.sourceOf(id).fires;
      P.mod.play(true);                                                           // the play edge fires every ENV: on lit step 0 that IS its hit
      for (let i = 0; i < 120; i++) clock.step(1 / 60);                           // 2 s at 120 BPM = 4 beats
      const fires = M.sourceOf(id).fires - f0;
      P.mod.play(false); if (release) release(performance.now() / 1000);
      return { fires, beats: +M.transport.beats.toFixed(4), steps: P.pattern.model.steps(id).slice(0, 8), stats: P.pattern.sequencer.stats() };
    }, env);
    L.ck(fired.fires === 4 && Math.abs(fired.beats - 4) < 1e-6, 'FILL EACH 4: four beats of recorder steps fire the ENV four times (one per lit step, the play edge adopted)', fired);

    /* 4 · it follows its device and hides when the device scrolls away */
    const follow = await page.evaluate(async (id) => {
      const P = window.__P, run = document.querySelector('#modwin .m2run');
      const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const read = () => { const r = P.pattern.root.getBoundingClientRect(), d = document.querySelector('.m2dev[data-id="' + id + '"]').getBoundingClientRect(); return { left: Math.round(r.left), dev: Math.round(d.left), vis: getComputedStyle(P.pattern.root).visibility, anchor: P.pattern.root.dataset.anchor }; };
      const room = run.scrollWidth - run.clientWidth;
      run.scrollLeft = Math.min(room, 120); await wait(); const mid = read();
      const before = P.pattern.root.getBoundingClientRect();
      run.scrollLeft = room; await wait(); const gone = read();
      const n = document.elementFromPoint(before.left + 20, before.top + before.height / 2);
      run.scrollLeft = 0; await wait(); const back = read();
      return { room, mid, gone, under: n ? !!n.closest('.mir-pattern') : false, back };
    }, env);
    L.ck(follow.room > 200, 'the device run scrolls (the fixture\'s rack is wider than the window)', follow);
    L.ck(Math.abs(follow.mid.left - follow.mid.dev) <= 1 && follow.mid.vis === 'visible', 'scrolled a little, the window follows its device', follow.mid);
    L.ck(follow.gone.vis === 'hidden' && !follow.under, 'scrolled away, the window is hidden and the hand reaches what is under it', follow);
    L.ck(follow.back.vis === 'visible' && Math.abs(follow.back.left - follow.back.dev) <= 1, 'scrolled back, it is seated again', follow.back);

    /* 5 · it goes and comes back with its window */
    const withMod = await page.evaluate(async () => {
      const P = window.__P, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      P.mod.close(); await wait(450); const closed = P.pattern.isOpen();
      P.mod.open(); await wait(600); const reopened = P.pattern.isOpen();
      return { closed, reopened };
    });
    L.ck(!withMod.closed && withMod.reopened, 'closing the modulation window closes the docked pattern window, and opening it brings it back', withMod);
    L.ck(errors().length === 0, 'no page errors', errors());
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
