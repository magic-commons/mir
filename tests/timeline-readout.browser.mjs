/* timeline-readout.browser.mjs — BASINS tools/rig/timeline-readout-check.mjs (LANE 7.A: THE CURSOR + THE READOUT LAYER,
 * 2026-10-01), ported to gallery/timeline.html (2026-10-02).  Every check computes its expected reader string from
 * px/bpm/meter/clip-rect inline (never from timeline/time-format.js or timeline/cursor.js), so the rig cannot share a bug
 * with the module it is checking.  H is the gallery's key-table row (BASINS': its shell's).  The touch block (touch
 * WebKit) is not run: Chromium only.  MIR_BASE=http://127.0.0.1:8830/ node tests/timeline-readout.browser.mjs */
import { openTimeline, ledger } from './timeline-rig.mjs';

const SHOT = process.env.SHOT || (await import('node:os')).tmpdir();

// Reimplemented independently of app/time-format.js, for cross-checking only.
const pad2 = n => String(n).padStart(2, '0');
function fmtSeconds(s, fine) {
  const sign = s < 0 ? '-' : '', tenths = Math.floor(Math.abs(s) * 10 + 1e-9);
  const minutes = Math.floor(tenths / 600), rest = tenths - minutes * 600, whole = Math.floor(rest / 10), tenth = rest % 10;
  return fine ? `${sign}${minutes}:${pad2(whole)}.${tenth}` : `${sign}${minutes}:${pad2(whole)}`;
}
const fmtPercent = (v, held) => { const pct = Math.max(0, Math.min(100, v * 100)); return held ? (Math.round(pct * 10) / 10).toFixed(1) + '%' : Math.round(pct) + '%'; };

const name = 'chromium', touch = false;
const RUN = await (async () => {
  const { page, errors, presses, close } = await openTimeline();
  const L = ledger(name);
  try {
    const setup = () => page.evaluate(() => {
      const T = window.__TL; T.mod.play(false);
      const m = T.tl.editor.model; m.restore(null);
      T.tl.open();   /* the gallery's timeline is docked at the bottom, 440 tall */
      const laneId = m.state().lanes[0].id;
      const id = m.create({ targetId: 'scene.size', name: 'TEST', value: .5, start: 1, duration: 4, laneId });
      const curveId = m.state().clips.find(c => c.id === id).curveId;
      m.updateCurve(curveId, { points: [{ t: 0, v: .2, tension: 0 }, { t: 1, v: .8, tension: 0 }] });
      document.querySelector('.tl-viewport').scrollLeft = 0; document.querySelector('.tl-viewport').scrollTop = 0;
      return id;
    });
    const clipId = await setup();
    await page.waitForTimeout(150);

    const geo = () => page.evaluate(id => {
      const T = window.__TL, ed = T.tl.editor, m = ed.model, clip = m.state().clips.find(c => c.id === id);
      const svg = document.querySelector(`.tl-clip[data-clip="${id}"] svg`), rect = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      const ruler = document.querySelector('.tl-ruler').getBoundingClientRect(), content = document.querySelector('.tl-content').getBoundingClientRect();
      return { clip, px: ed.px(), bpm: T.mod.host.model.transport.bpm, meter: m.state().meter,
        rect: rect.toJSON(), vb: { width: vb.width, height: vb.height }, ruler: ruler.toJSON(), content: content.toJSON() };
    }, clipId);
    const read = () => page.evaluate(() => {
      const box = sel => { const n = document.querySelector(sel); return n ? n.getBoundingClientRect().toJSON() : null; };
      const style = sel => getComputedStyle(document.querySelector(sel));
      const mask = sel => { const s = style(sel); return s.maskImage || s.webkitMaskImage || ''; };
      return {
        state: document.querySelector('.readout-layer').dataset.state,
        display: style('.readout-layer').display,
        clipTime: document.querySelector('.rl-clip-time').textContent, clipValue: document.querySelector('.rl-clip-value').textContent,
        clipInk: style('.rl-clip-time').color, curveInk: style('.tl-curve').stroke,
        clipTimeBox: box('.rl-clip-time'), clipValueBox: box('.rl-clip-value'),
        vlineBox: box('.rl-vline'), hlineBox: box('.rl-hline'), trackBox: box('.rl-track'),
        trackTime: document.querySelector('.rl-track-time').textContent,
        vlineMask: mask('.rl-vline'), hlineMask: mask('.rl-hline')
      };
    });
    const hitUnaffected = (x, y) => page.evaluate(([x, y]) => {
      const before = document.elementFromPoint(x, y), layer = document.querySelector('.readout-layer');
      const prev = layer.style.display; layer.style.display = 'none';
      const after = document.elementFromPoint(x, y); layer.style.display = prev;
      return before === after;
    }, [x, y]);

    let geoA = await geo();
    const fine = geoA.px * geoA.bpm / 60 >= 40;
    // Hover at a known fraction of the plot — the point under the mouse, not a control point.
    const fx = .3, fy = .4;
    let hx = geoA.rect.left + geoA.rect.width * fx, hy = geoA.rect.top + geoA.rect.height * fy;
    await page.mouse.move(hx, hy); await page.waitForTimeout(80);
    let r = await read();
    let lx = fx * geoA.vb.width, ly = fy * geoA.vb.height;
    let beat = geoA.clip.start + lx / geoA.px, sourceBeat = beat - geoA.clip.start, t = sourceBeat / geoA.clip.duration;
    let curveValue = .2 + .6 * t, seconds = beat * 60 / geoA.bpm;
    let expectTime = fmtSeconds(seconds, fine), expectValue = fmtPercent(curveValue, false);
    L.ck(r.state === 'hover', 'hover over a clip sets data-state=hover', r.state);
    L.ck(r.clipTime === expectTime, 'the bottom-right reader is the geometry\'s own seconds', { got: r.clipTime, expectTime });
    L.ck(r.clipValue === expectValue, 'the top-right reader is the curve\'s own value at the beat', { got: r.clipValue, expectValue });
    L.ck(r.clipInk === r.curveInk, 'the corner readers use the clip\'s --tl-curve-ink', r);
    L.ck(Math.abs(r.clipValueBox.x + r.clipValueBox.width - (geoA.rect.right - 4)) < 1.5 && Math.abs(r.clipValueBox.y - (geoA.rect.top + 4)) < 1.5, 'the value reader sits 4px inside the top-right corner', { box: r.clipValueBox, rect: geoA.rect });
    L.ck(Math.abs(r.clipTimeBox.x + r.clipTimeBox.width - (geoA.rect.right - 4)) < 1.5 && Math.abs(r.clipTimeBox.y + r.clipTimeBox.height - (geoA.rect.bottom - 4)) < 1.5, 'the time reader sits 4px inside the bottom-right corner', { box: r.clipTimeBox, rect: geoA.rect });
    L.ck(Math.abs(r.trackBox.x + r.trackBox.width / 2 - hx) < 2 && Math.abs(r.trackBox.y - geoA.ruler.bottom) < 1.5, 'the track reader centres on the pointer x just under the strip', { box: r.trackBox, hx, rulerBottom: geoA.ruler.bottom });
    L.ck(Math.abs(r.vlineBox.x - hx) < 1.5 && Math.abs(r.vlineBox.y - geoA.ruler.bottom) < 1.5 && Math.abs(r.vlineBox.y + r.vlineBox.height - geoA.content.bottom) < 1.5, 'the vertical line spans ruler-bottom to content-bottom', { box: r.vlineBox, geo: geoA });
    L.ck(Math.abs(r.hlineBox.x - geoA.rect.left) < 1.5 && Math.abs(r.hlineBox.x + r.hlineBox.width - geoA.rect.right) < 1.5, 'the horizontal line spans the hovered clip\'s width', { box: r.hlineBox, rect: geoA.rect });
    L.ck(r.vlineMask !== 'none' && r.hlineMask !== 'none', 'hover hairlines are dashed', r);
    L.ck(await hitUnaffected(hx, hy) && await hitUnaffected(r.clipTimeBox.x + 2, r.clipTimeBox.y + 2) && await hitUnaffected(r.vlineBox.x, r.vlineBox.y + 5), 'elementFromPoint ignores the readout layer', {});

    // Press a point and drag 30px: held, solid, locked to the committed point — one decimal.
    const pointBox = await page.locator(`.tl-clip[data-clip="${clipId}"] circle.tl-point[data-point="0"]`).boundingBox();
    const px0 = pointBox.x + pointBox.width / 2, py0 = pointBox.y + pointBox.height / 2;
    await page.mouse.move(px0, py0); await page.mouse.down();
    await page.mouse.move(px0 + 22, py0 - 22, { steps: 6 }); await page.waitForTimeout(120);
    const held = await read();
    const committed = await page.evaluate(id => { const n = document.querySelector(`.tl-clip[data-clip="${id}"] circle.tl-point[data-point="0"]`); return { cx: +n.getAttribute('cx'), cy: +n.getAttribute('cy') }; }, clipId);
    geoA = await geo();
    const hBeat = geoA.clip.start + committed.cx / geoA.px, hValue = 1 - committed.cy / geoA.vb.height, hSeconds = hBeat * 60 / geoA.bpm;
    const expectHeldTime = fmtSeconds(hSeconds, fine), expectHeldValue = fmtPercent(hValue, true);
    L.ck(held.state === 'held', 'dragging a point sets data-state=held', held.state);
    L.ck(held.vlineMask === 'none' && held.hlineMask === 'none', 'held hairlines go solid', held);
    L.ck(held.clipTime === expectHeldTime, 'held time reader locks to the committed point', { got: held.clipTime, expectHeldTime });
    L.ck(held.clipValue === expectHeldValue && /\.\d%$/.test(held.clipValue), 'held value reader is the committed point, one decimal', { got: held.clipValue });
    await page.mouse.up(); await page.waitForTimeout(32);
    const released = await read();
    L.ck(released.state === 'hover', 'release returns to hover within a frame', released.state);

    await page.mouse.move(5, 5); await page.waitForTimeout(80);
    L.ck((await read()).display === 'none', 'leaving the view hides the layer');

    await page.mouse.move(hx, hy); await page.waitForTimeout(80);
    L.ck((await read()).state === 'hover', 'moving back over the clip restores hover', (await read()).state);
    await page.locator('.timeline-surface').focus(); await page.keyboard.press('h'); await page.waitForTimeout(80);
    L.ck((await read()).display === 'none', 'H hides the layer with the rest of the UI');
    await page.keyboard.press('h'); await page.waitForTimeout(80);

    // Ctrl+wheel zoom and a horizontal scroll: readers stay aligned to the new geometry.
    await page.mouse.move(hx, hy);
    await page.keyboard.down('Control'); await page.mouse.wheel(0, -200); await page.keyboard.up('Control'); await page.waitForTimeout(120);
    geoA = await geo();
    hx = geoA.rect.left + geoA.rect.width * fx; hy = geoA.rect.top + geoA.rect.height * fy;
    await page.mouse.move(hx + 1, hy + 1); await page.mouse.move(hx, hy); await page.waitForTimeout(80);
    r = await read();
    L.ck(Math.abs(r.hlineBox.x - geoA.rect.left) < 1.5 && Math.abs(r.hlineBox.x + r.hlineBox.width - geoA.rect.right) < 1.5, 'zoom: the horizontal line still spans the clip at the new scale', { box: r.hlineBox, rect: geoA.rect });
    await page.evaluate(() => { document.querySelector('.tl-viewport').scrollLeft += 60; });
    await page.waitForTimeout(100);
    geoA = await geo();
    await page.mouse.move(hx + 1, hy); await page.mouse.move(hx, hy); await page.waitForTimeout(80);
    r = await read();
    L.ck(Math.abs(r.vlineBox.x - hx) < 1.5, 'scroll: the vertical line still tracks the pointer x', { box: r.vlineBox, hx });

    // Reduced motion: no element in the layer carries a transition.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(50);   // the kit's motion policy mirrors the media query onto <html data-motion> on its change event
    const transitions = await page.evaluate(() => [...document.querySelectorAll('.readout-layer, .readout-layer *')].map(n => getComputedStyle(n).transitionDuration));
    L.ck(transitions.every(t => t === '0s' || t === ''), 'reduced motion removes every transition in the layer', transitions);
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    if (touch) {
      // A coarse pointer: nothing on hover, readers during a drag, gone 600ms after.
      geoA = await geo();
      const tx = geoA.rect.left + geoA.rect.width * .6, ty = geoA.rect.top + geoA.rect.height * .5;
      await page.evaluate(([x, y]) => { document.elementFromPoint(x, y).dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 77, clientX: x, clientY: y, pointerType: 'touch' })); }, [tx, ty]);
      await page.waitForTimeout(60);
      L.ck((await read()).display === 'none', 'touch: a plain hover shows nothing');
      const tp = await page.locator(`.tl-clip[data-clip="${clipId}"] circle.tl-point[data-point="1"]`).boundingBox();
      const tpx = tp.x + tp.width / 2, tpy = tp.y + tp.height / 2;
      // A fabricated pointerId has no real OS-tracked pointer behind it; WebKit's setPointerCapture
      // is strict about that (NotFoundError) where Chromium is lenient. A real touchscreen never hits
      // this — patch it out only for this synthetic drag, restored right after.
      await page.evaluate(() => { window.__spc = Element.prototype.setPointerCapture; Element.prototype.setPointerCapture = function (id) { try { return window.__spc.call(this, id); } catch (_) {} }; });
      await page.evaluate(([x, y]) => { document.elementFromPoint(x, y).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 78, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true })); }, [tpx, tpy]);
      await page.evaluate(([x, y]) => { document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 78, clientX: x, clientY: y, pointerType: 'touch' })); }, [tpx + 20, tpy - 20]);
      await page.waitForTimeout(60);
      const duringTouch = await read();
      L.ck(duringTouch.state === 'held', 'touch: readers appear during a point drag', duringTouch.state);
      await page.evaluate(([x, y]) => { document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 78, clientX: x, clientY: y, pointerType: 'touch' })); }, [tpx + 20, tpy - 20]);
      await page.waitForTimeout(120);
      const justAfter = await read();
      L.ck(justAfter.display !== 'none', 'touch: readers linger right after release', justAfter.display);
      await page.waitForTimeout(650);
      L.ck((await read()).display === 'none', 'touch: readers are gone 600ms after release');
      await page.evaluate(() => { Element.prototype.setPointerCapture = window.__spc; delete window.__spc; });
    }

    await page.screenshot({ path: `${SHOT}/timeline-readout-${name}.png` });
    L.ck(errors().length === 0, 'no page errors', errors());
    L.ck(presses().every((p) => / @(timeline|rail|popup)$/.test(p.at)), 'every press landed on the timeline, its rail or its popups (elementFromPoint)', presses().filter((p) => !/ @(timeline|rail|popup)$/.test(p.at)));
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
