/* settle.mjs — wait on the condition, never a fixed sleep (a helper the browser tests share, not a test: tests/run.mjs
 * runs *.node.mjs and *.browser.mjs only).
 * A look setting lands in the store's frame job (core/frame.js), and then the page MOVES: the rack's cards FLIP to a new
 * SPACING (320 ms, shell/rack.js createRackMotion) and a pane's shadow eases (.dev's 120 ms transition).  A fixed sleep
 * raced that motion: on a busy machine themes.browser.mjs's SPACING AIRY row read a card still travelling (wave 18).
 * settle() waits two frames (the job has run, any motion it starts has started), then until every finite running
 * animation on the page has finished, again until none is left.  At the 3 s ceiling it returns false and the caller
 * reads what is there, so a page that never settles fails on its numbers and never hangs.
 *   SETTLE        page-side source that defines `settle()`; splice it into an evaluated async body, then `await settle()`
 *   settle(p)     the same, run from node on a tools/cdp.mjs page → true (settled) | false (the ceiling) */
export const SETTLE = `const settle = async () => { const end = performance.now() + 3000;
    while (performance.now() < end) {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const moving = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && Number.isFinite(a.effect.getComputedTiming().endTime));
      if (!moving.length) return true;
      await Promise.race([Promise.all(moving.map((a) => a.finished.catch(() => 0))), new Promise((r) => setTimeout(r, Math.max(0, end - performance.now())))]);
    } return false; };`;

export const settle = (p) => p.eval(`(async () => { ${SETTLE} return settle(); })()`);
