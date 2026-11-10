/* timeline-modes.browser.mjs — THE MODE MENU (1.5.7-alpha.49, λWAVES 041 T1): FL Studio's context tool-menu in the kit's timeline.
 *   the bar's MODE chip, a middle click on the lanes and the chord middle + right each open it; MODE holds the nine modes (a radio dot
 *   each), MENU the window's menus; a mode chosen is the left button's tool and the cursor wears it; each mode's own hand (PAINT,
 *   PAINT ADD, DELETE, MUTE, SLICE's drag, ZOOM, PREVIEW); and 040's hands under another mode (the right button's sweep, Shift-drag's
 *   clone, the ruler's Shift range).  Real input through CDP on gallery/timeline.html; Chromium only. */
import { openTimeline, ledger } from './timeline-rig.mjs';

const RUN = await (async () => {
  const { page, errors, close } = await openTimeline({ width: 1300, height: 850 });
  const L = ledger('modes');
  const E = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms = 60) => page.waitForTimeout(ms);
  const MODES = ['edit', 'paint', 'paintadd', 'delete', 'mute', 'slice', 'select', 'zoom', 'scrub'];
  const state = () => E(() => { const d = window.__TL.model.state(); return { n: d.clips.length, clips: d.clips.map((c) => ({ id: c.id, lane: d.lanes.findIndex((l) => l.id === c.laneId), start: c.start, duration: c.duration, scale: c.scale, mute: c.mute, curve: c.curveId })).sort((a, b) => a.lane - b.lane || a.start - b.start) }; });
  const mode = (m) => E((m) => { window.__TL.tl.editor.setTool(m); return window.__TL.tl.editor.tool(); }, m);
  try {
    /* a clean arrangement: one 4-beat clip at 0 in lane 1, Snap a beat, the view at 0 */
    const H = await E(() => { const T = window.__TL, m = T.model; T.mod.play(false); T.tl.controller.seek(0); m.restore(null); const lanes = m.state().lanes.map((l) => l.id);
      const a = m.create({ targetId: 'scene.glow', name: 'GLOW', value: .5, start: 0, duration: 4, laneId: lanes[0] });
      T.tl.editor.setTool('edit'); T.tl.editor.setSnap(1); document.querySelector('.tl-viewport').scrollLeft = 0; T.tl.editor.paint(); return { a, lanes, px: T.tl.editor.px() }; });
    await wait(120);
    const pane = (i) => page.locator(`.tl-pane[data-lane="${H.lanes[i]}"]`).boundingBox();
    const p0 = await pane(0), p1 = await pane(1), p2 = await pane(2), X = (beat) => p0.x + beat * H.px;

    /* ── the chip and the popup ─────────────────────────────────────────────────────────────────────────────────── */
    await page.locator('.tl-toolbar [data-mode="modes"]').click(); await wait();
    const pop = await E(() => { const m = document.querySelector('.tl-pop[data-pop="modes"]'); if (!m) return null; const r = m.getBoundingClientRect(), rows = [...m.querySelectorAll('[data-mode-row]')];
      return { w: Math.round(r.width), h: Math.round(r.height), modes: rows.map((b) => b.dataset.modeRow), rowH: rows[0].offsetHeight, icon: rows[0].querySelector('svg').getBoundingClientRect().width, dots: m.querySelectorAll('.tl-mode-dot').length,
        on: rows.filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => b.dataset.modeRow), titles: [...m.querySelectorAll('.tl-pop-title')].map((n) => n.textContent),
        menu: [...m.querySelectorAll('.tl-modes-menu [data-row], .tl-modes-menu [data-fold]')].map((b) => b.dataset.row || b.dataset.fold), help: rows.map((b) => b.dataset.help),
        spare: m.querySelector('.tl-modes-menu').getBoundingClientRect().bottom - [...m.querySelectorAll('.tl-modes-menu > *')].at(-1).getBoundingClientRect().bottom }; });
    L.ck(pop && pop.modes.join() === MODES.join() && pop.dots === 9 && pop.on.join() === 'edit' && pop.titles.join() === 'MODE,MENU', 'the MODE chip opens the menu: MODE with the nine modes in FL\'s order, a radio dot each, the one in force checked; MENU beside it', pop);
    L.ck(pop && pop.rowH >= 36 && pop.icon >= 22 && pop.h >= 330, 'it is as large as FL\'s (rows ≥ 36 px, icons ≥ 22 px, ≥ 330 px tall)', pop && { rowH: pop.rowH, icon: pop.icon, w: pop.w, h: pop.h });
    L.ck(pop && pop.menu.join() === 'menu-edit,menu-select,menu-zoom,menu-snap,menu-scope,step,slide,active,add-audio,shortcuts' && pop.spare > 24, 'MENU holds the window\'s menus and switches, and empty space below them', pop && { menu: pop.menu, spare: pop.spare });
    L.ck(pop && pop.help.join() === 'PENCIL,PAINT,PAINT ADD,DELETE,MUTE,SLICE,SELECT,ZOOM,PREVIEW', 'every mode row is hinted by its word', pop && pop.help);
    await page.locator('.tl-pop[data-pop="modes"] [data-row="menu-snap"]').click(); await wait();
    const snapList = await E(() => [...document.querySelectorAll('.tl-pop[data-pop="menu-snap"] [data-row]')].map((b) => b.dataset.row + (b.classList.contains('on') ? '*' : '')));
    L.ck(snapList.join() === 'snap-4,snap-1*,snap-0.5,snap-0.25,snap-0', 'a MENU row opens its list in the menu\'s place (SNAP: the five grids, the one in force lit)', snapList);
    await page.keyboard.press('Escape'); await wait();
    await page.locator('.tl-toolbar [data-mode="modes"]').click(); await wait();
    await page.locator('.tl-pop[data-pop="modes"] [data-mode-row="mute"]').click(); await wait();
    const chosen = await E(() => { const s = window.__TL.tl.editor.surface; return { tool: window.__TL.tl.editor.tool(), open: !!document.querySelector('.tl-pop'), chip: document.querySelector('.tl-toolbar [data-mode="modes"]').dataset.now, chipGlyph: !!document.querySelector('.tl-toolbar [data-mode="modes"] svg.gly-mute'),
      cursor: getComputedStyle(document.querySelector('.tl-viewport')).cursor.slice(0, 24), all: s.dataset.cursor, tab: getComputedStyle(document.querySelector('.tl-clip-title')).cursor.slice(0, 4) }; });
    L.ck(chosen.tool === 'mute' && !chosen.open && chosen.chip === 'mute' && chosen.chipGlyph, 'a mode row chooses the mode, closes the menu, and the chip wears it', chosen);
    L.ck(chosen.cursor.startsWith('url("data:image/svg') && chosen.all === 'all' && chosen.tab === 'url(', 'the cursor wears the mode (its glyph, over the lanes and — not a pencil — over the clips)', chosen);

    /* ── by keyboard: the chip opens it on the mode in force; ↓ walks, → crosses, Enter chooses, and the focus comes home to the surface ── */
    await E(() => { document.querySelector('.tl-toolbar [data-mode="modes"]').focus(); return 0; }); await page.keyboard.press('Enter'); await wait();
    const kb0 = await E(() => document.activeElement?.dataset.modeRow);
    await page.keyboard.press('ArrowDown'); const kb1 = await E(() => document.activeElement?.dataset.modeRow);
    await page.keyboard.press('ArrowRight'); const kb2 = await E(() => document.activeElement?.dataset.row || document.activeElement?.dataset.fold);
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter'); await wait();
    const kb3 = await E(() => ({ tool: window.__TL.tl.editor.tool(), open: !!document.querySelector('.tl-pop'), live: window.__TL.tl.editor.keysLive() }));
    L.ck(kb0 === 'mute' && kb1 === 'slice' && kb2 === 'step' && kb3.tool === 'delete' && !kb3.open && kb3.live, 'by keyboard: Enter on the chip opens it on the mode in force, the arrows walk and cross, Enter chooses, and the timeline\'s keys are live again', { kb0, kb1, kb2, kb3 });

    /* ── the mouse's roads: a middle click on the lanes, the chord middle + right ───────────────────────────────── */
    await mode('edit');
    await page.mouse.move(X(20), p1.y + p1.height / 2); await page.mouse.down({ button: 'middle' }); await page.mouse.up({ button: 'middle' }); await wait();
    const mid = await E(() => { const m = document.querySelector('.tl-pop[data-pop="modes"]'), r = m && m.getBoundingClientRect(); return r && { x: Math.round(r.left), y: Math.round(r.top), floor: Math.round(innerHeight - r.height - 8) }; });
    L.ck(mid && Math.abs(mid.x - X(20)) < 2 && Math.abs(mid.y - Math.min(p1.y + p1.height / 2, mid.floor)) < 2, 'a middle-button click on the lanes opens the menu at the pointer (kept inside the page)', { mid, at: [X(20), p1.y + p1.height / 2] });
    await page.keyboard.press('Escape'); await wait();
    await page.mouse.move(X(20), p1.y + p1.height / 2); await page.mouse.down({ button: 'middle' }); await page.mouse.move(X(14), p1.y + p1.height / 2, { steps: 4 }); await page.mouse.up({ button: 'middle' }); await wait();
    L.ck(!(await E(() => !!document.querySelector('.tl-pop'))), 'a middle-button DRAG still pans and opens nothing', null);
    await E(() => { document.querySelector('.tl-viewport').scrollLeft = 0; return 0; }); await wait();
    for (const [first, second] of [['middle', 'right'], ['right', 'middle']]) {
      await page.mouse.move(X(22), p2.y + p2.height / 2); await page.mouse.down({ button: first }); await page.mouse.down({ button: second }); await wait();
      const open = await E(() => !!document.querySelector('.tl-pop[data-pop="modes"]'));
      await page.mouse.up({ button: second }); await page.mouse.up({ button: first }); await wait();
      const after = await E(() => ({ open: !!document.querySelector('.tl-pop[data-pop="modes"]'), gesture: window.__TL.tl.editor.gesture(), n: window.__TL.model.state().clips.length }));
      L.ck(open && after.open && !after.gesture && after.n === 1, `the chord ${first} + ${second} opens the menu, and it stays when the buttons come up`, { open, after });
      await page.keyboard.press('Escape'); await wait();
    }

    /* ── PAINT: a drag lays the last clip end to end ─────────────────────────────────────────────────────────────── */
    const tab = await page.locator(`.tl-clip-title[data-clip="${H.a}"]`).boundingBox();
    await page.mouse.click(tab.x + 30, tab.y + 9); await wait();   // the pencil's memory: the clip last pressed
    await mode('paint');
    await page.mouse.move(X(8.4), p1.y + p1.height / 2); await page.mouse.down(); await page.mouse.move(X(18.5), p1.y + p1.height / 2, { steps: 10 }); await page.mouse.up(); await wait();
    const painted = await state(), lane1 = painted.clips.filter((c) => c.lane === 1);
    L.ck(lane1.map((c) => c.start).join() === '8,12,16' && lane1.every((c) => c.duration === 4 && c.curve === painted.clips[0].curve), 'PAINT: a drag lays the clip last pressed end to end (8 · 12 · 16), its curve shared', lane1);
    await E(() => window.__TL.model.undo()); await wait();
    L.ck((await state()).n === 1, 'the whole stroke is one undo', (await state()).n);

    /* ── PAINT ADD: one snap step a slot; a press on a clip mutes it ─────────────────────────────────────────────── */
    await mode('paintadd');
    await page.mouse.move(X(8.4), p1.y + p1.height / 2); await page.mouse.down(); await page.mouse.move(X(11.5), p1.y + p1.height / 2, { steps: 8 }); await page.mouse.up(); await wait();
    const stepped = (await state()).clips.filter((c) => c.lane === 1);
    L.ck(stepped.map((c) => c.start).join() === '8,9,10,11' && stepped.every((c) => c.duration === 1 && c.scale === 4), 'PAINT ADD: one snap step a copy (8 · 9 · 10 · 11), the shape squeezed into the step', stepped);
    await page.mouse.click(X(9.5), p1.y + p1.height / 2); await wait();
    const stepMuted = (await state()).clips.filter((c) => c.lane === 1).map((c) => c.mute);
    L.ck(stepMuted.join() === 'false,true,false,false', 'PAINT ADD: a press on a clip mutes it (FL\'s step brush)', stepMuted);

    /* ── MUTE: a press toggles; a muted clip is hollow ──────────────────────────────────────────────────────────── */
    await mode('mute');
    await page.mouse.click(X(2), p0.y + p0.height / 2); await wait();
    const hollow = await E((id) => { const c = window.__TL.model.state().clips.find((x) => x.id === id), b = document.querySelector(`.tl-clip[data-clip="${id}"]`), t = document.querySelector(`.tl-clip-title[data-clip="${id}"]`);
      return { mute: c.mute, fill: getComputedStyle(b.querySelector('.tl-fill')).fill, dash: getComputedStyle(b.querySelector('.tl-curve')).strokeDasharray, tab: getComputedStyle(t.querySelector('.tl-tab-tint')).opacity }; }, H.a);
    L.ck(hollow.mute && hollow.fill === 'none' && hollow.dash !== 'none' && hollow.tab === '0', 'MUTE: a press mutes the clip, and a muted clip is hollow (no fill, a dashed curve, an empty tab)', hollow);
    await page.mouse.move(X(7.5), p1.y + p1.height / 2); await page.mouse.down(); await page.mouse.move(X(11.8), p1.y + p1.height / 2, { steps: 8 }); await page.mouse.up(); await wait();
    const sweptMute = (await state()).clips.filter((c) => c.lane === 1).map((c) => c.mute);
    L.ck(sweptMute.join() === 'true,true,true,true', 'MUTE: a drag gives every clip it crosses the state the first one took', sweptMute);

    /* ── 040's hands under another mode (MUTE): the right button's sweep, Shift-drag's clone, the ruler's Shift range ── */
    await page.mouse.move(X(7.5), p1.y + p1.height * .3); await page.mouse.down({ button: 'right' }); await page.mouse.move(X(9.8), p1.y + p1.height * .3, { steps: 6 }); await page.mouse.up({ button: 'right' }); await wait();
    const rightSwept = (await state()).clips.filter((c) => c.lane === 1).map((c) => c.start);
    L.ck(rightSwept.join() === '10,11', 'under MUTE the right button still sweeps clips away (alpha.38)', rightSwept);
    const tab2 = await page.locator(`.tl-clip-title[data-clip="${H.a}"]`).boundingBox();
    await page.keyboard.down('Shift'); await page.mouse.move(tab2.x + 30, tab2.y + 9); await page.mouse.down(); await page.mouse.move(tab2.x + 30 + 12 * H.px, tab2.y + 9, { steps: 6 }); await page.mouse.up(); await page.keyboard.up('Shift'); await wait();
    const cloned = (await state()).clips.filter((c) => c.lane === 0).map((c) => c.start);
    L.ck(cloned.join() === '0,12', 'under MUTE Shift + drag on a clip still clones it (alpha.39)', cloned);
    const ruler = await page.locator('.tl-ruler').boundingBox();
    await page.keyboard.down('Shift'); await page.mouse.move(ruler.x + 2 * H.px, ruler.y + 16); await page.mouse.down(); await page.mouse.move(ruler.x + 6 * H.px, ruler.y + 16, { steps: 6 }); await page.mouse.up(); await page.keyboard.up('Shift'); await wait();
    const rg = await E(() => window.__TL.tl.editor.range());
    L.ck(rg && rg.start === 2 && rg.end === 6, 'under MUTE Shift + a ruler drag still draws the range (alpha.40)', rg);
    await page.mouse.click(ruler.x + 300, ruler.y + 16); await page.mouse.click(ruler.x + 300, ruler.y + 16); await wait();   // the double-tap clears it

    /* ── DELETE: the left button sweeps; one undo ───────────────────────────────────────────────────────────────── */
    await mode('delete');
    const before = (await state()).n;
    await page.mouse.move(X(9.5), p1.y + p1.height / 2); await page.mouse.down(); await page.mouse.move(X(11.8), p1.y + p1.height / 2, { steps: 6 }); await page.mouse.up(); await wait();
    const gone = (await state()).n;
    await E(() => window.__TL.model.undo()); await wait();
    L.ck(before - gone === 2 && (await state()).n === before, 'DELETE: the left button deletes every clip it crosses, one undo', { before, gone });

    /* ── SLICE: a drag down the lanes cuts every clip its line crosses ──────────────────────────────────────────── */
    await E(([lanes]) => { const m = window.__TL.model; for (const c of m.state().clips.filter((c) => c.laneId === lanes[1])) m.deleteClip(c.id); m.create({ targetId: 'scene.glow', name: 'B', value: .5, start: 0, duration: 4, laneId: lanes[1] }); return 0; }, [H.lanes]); await wait();
    await mode('slice');
    await page.mouse.move(X(2), p0.y + 6); await page.mouse.down(); await page.mouse.move(X(2.2), p1.y + p1.height - 6, { steps: 6 });
    const cutLine = await E(() => { const m = document.querySelector('.tl-marquee'), r = m.getBoundingClientRect(); return { shown: getComputedStyle(m).display, w: r.width, h: Math.round(r.height) }; });
    await page.mouse.up(); await wait();
    const cut = (await state()).clips.filter((c) => c.lane < 2 && c.start < 4).map((c) => c.lane + ':' + c.start + '+' + c.duration);
    L.ck(cutLine.shown === 'block' && cutLine.w <= 2 && cutLine.h > p0.height && cut.join() === '0:0+2,0:2+2,1:0+2,1:2+2', 'SLICE: a drag draws the cut down the lanes and every clip the line crosses is cut at that beat', { cutLine, cut });
    await E(() => window.__TL.model.undo()); await wait();
    L.ck((await state()).clips.filter((c) => c.lane < 2 && c.start < 4).length === 2, 'the whole cut is one undo', null);

    /* ── ZOOM: a drag zooms to its range; a click zooms out ─────────────────────────────────────────────────────── */
    await mode('zoom');
    await page.mouse.move(X(2), p2.y + 10); await page.mouse.down(); await page.mouse.move(X(22), p2.y + 30, { steps: 6 }); await page.mouse.up(); await wait(120);
    const zoomed = await E(() => { const v = document.querySelector('.tl-viewport'), px = window.__TL.tl.editor.px(); return { px, from: v.scrollLeft / px, span: v.clientWidth / px }; });
    L.ck(Math.abs(zoomed.from - 2) < .05 && Math.abs(zoomed.span - 20) < .05, 'ZOOM: a drag zooms to the range dragged (beats 2 … 22 fill the view)', zoomed);
    await page.mouse.click(p2.x + 200, p2.y + 20); await wait(120);
    const out = await E(() => ({ px: window.__TL.tl.editor.px(), left: document.querySelector('.tl-viewport').scrollLeft }));
    L.ck(out.px !== zoomed.px && out.left < 1, 'ZOOM: a click zooms out to the whole arrangement', out);

    /* ── PREVIEW: a press plays from there while it is held ─────────────────────────────────────────────────────── */
    await mode('scrub');
    const px = await E(() => window.__TL.tl.editor.px()), at = await E(() => document.querySelector('.tl-viewport').scrollLeft);
    await page.mouse.move(p2.x + 1 * px - at, p2.y + 20); await page.mouse.down(); await wait(260);   // inside the clips' span: past it THE LOOP sends a play home
    const held = await E(() => ({ ...window.__TL.tl.controller.state(), gesture: window.__TL.tl.editor.gesture()?.kind }));
    await page.mouse.up(); await wait(80);
    const released = await E(() => window.__TL.tl.controller.state());
    L.ck(held.playing && held.gesture === 'preview' && held.beat > 1 && held.beat < 3 && !released.playing, 'PREVIEW: a press seeks there and plays while held; the release stops it', { held, released: released.playing });
    await page.mouse.move(p2.x + 6 * px - at, p2.y + 20); await page.mouse.down(); await page.mouse.move(p2.x + 10 * px - at, p2.y + 20, { steps: 6 }); await wait();
    const scrubbing = await E(() => ({ playing: window.__TL.tl.controller.state().playing, scrub: window.__TL.tl.controller.isScrubbing(), hand: window.__TL.tl.controller.handBeat() }));
    await page.mouse.up(); await wait();
    L.ck(!scrubbing.playing && scrubbing.scrub && Math.abs(scrubbing.hand - 10) < .2, 'PREVIEW: a drag scrubs (the hand leads)', scrubbing);

    L.ck(errors().length === 0, 'no page errors', errors());
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
