/* timeline.browser.mjs — the kit's own TIMELINE checks on gallery/timeline.html, beyond BASINS' ported rigs (those are
 * tests/timeline-{fixes,scrub,ticks,kinds,readout,smoke}.browser.mjs).  Real pointer and keys (CDP), every press
 * hit-tested with elementFromPoint (timeline-rig.mjs keeps the ledger):
 *   THE ONE PLAY — ▶ in the work bar runs the clock, the playhead moves and the automation moves the picture; Space plays
 *     with the timeline focused; modulation's power never plays and play never powers.
 *   THE WORK LANE — the transport hugs the left, one tool bar hugs the right and reaches the window's inner edge (fix 5);
 *     no hint row (fix 6); WORK BARS cycles top → bottom → hidden with BASINS' pressed, and it persists.
 *   THE WINDOW — docked at the bottom by default; a grip drag floats it; a drag back to the bottom docks it again.
 *   THE CURVE EDITOR — a point drag reversed half-way lands exactly where it began (one model, no drift).
 *   THE KEYS — the timeline's rows are in the page's one key table; a rebinding there moves the key and the sheet.
 *   THE PROJECT — the arrangement is a project part.  A HELD KNOB makes a clip.  The tempo pill types in the work bar.
 *   IDLE — after a gesture, nothing books a frame.  WORDS — under qps the timeline's words translate.
 * Plates with MIR_PLATES=1 only (docs/plates/timeline/).  MIR_BASE=http://127.0.0.1:8830/ node tests/timeline.browser.mjs */
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { openTimeline, ledger } from './timeline-rig.mjs';
import { settle } from './settle.mjs';

const PLATES = process.env.MIR_PLATES === '1' ? fileURLToPath(new URL('../docs/plates/timeline/', import.meta.url)) : null;
if (PLATES) mkdirSync(PLATES, { recursive: true });
const near = (a, b, t) => Math.abs(a - b) <= t;

const RUN = await (async () => {
  const { page, errors, presses, close, cdp } = await openTimeline();
  const L = ledger('chromium');
  const E = (fn, arg) => page.evaluate(fn, arg);
  const center = async (sel) => { const b = await page.locator(sel).boundingBox(); return b && [b.x + b.width / 2, b.y + b.height / 2]; };
  try {
    /* ── THE ONE PLAY ─────────────────────────────────────────────────────────────────────────────────────────── */
    await E(() => { const T = window.__TL; T.mod.play(false); T.tl.controller.seek(0); T.mod.host.clock.setBpm(120); return 0; });
    await page.waitForTimeout(100);
    const head0 = await page.locator('.tl-playhead').evaluate((n) => n.style.transform);
    const size0 = await E(() => window.__TL.S.size);
    const [px, py] = await center('.mir-timeline .mir-transport .play');
    await page.mouse.click(px, py); await page.waitForTimeout(700);
    const run = await E(() => ({ playing: window.__TL.mod.playing(), beat: window.__TL.mod.host.model.transport.beats, size: window.__TL.S.size, power: window.__TL.mod.power(), pressed: document.querySelector('.mir-timeline .mir-transport .play').getAttribute('aria-pressed') }));
    const head1 = await page.locator('.tl-playhead').evaluate((n) => n.style.transform);
    L.ck(run.playing && run.beat > 0.5 && run.pressed === 'true', '▶ in the work bar starts the app\'s one clock', run);
    L.ck(head1 !== head0, 'the playhead runs by transform while the clock plays', { head0, head1 });
    L.ck(!near(run.size, size0, 1e-6), 'the SIZE lane\'s automation moves the picture while it plays', { size0, size: run.size });
    const [qx, qy] = await center('.mir-timeline .mir-transport .modb');
    await page.mouse.click(qx, qy); await page.waitForTimeout(80);
    const p1 = await E(() => ({ playing: window.__TL.mod.playing(), power: window.__TL.mod.power() }));
    L.ck(p1.playing && p1.power === !run.power, 'modulation\'s power bypasses and never stops the clock', p1);
    await page.mouse.click(qx, qy); await page.mouse.click(px, py); await page.waitForTimeout(80);
    const p2 = await E(() => ({ playing: window.__TL.mod.playing(), power: window.__TL.mod.power() }));
    L.ck(!p2.playing && p2.power === run.power, 'play pauses and never touches the power', p2);
    await page.locator('.timeline-surface').focus(); await page.keyboard.press('Space'); await page.waitForTimeout(150);
    const sp = await E(() => window.__TL.mod.playing());
    await page.keyboard.press('Space'); await page.waitForTimeout(80);
    L.ck(sp && !(await E(() => window.__TL.mod.playing())), 'Space plays and pauses with the timeline focused (the one play\'s key row)', sp);

    /* ── THE WORK LANE ────────────────────────────────────────────────────────────────────────────────────────── */
    const lane = await E(() => { const r = (s) => document.querySelector(s).getBoundingClientRect();
      const surf = r('.mir-timeline .timeline-surface'), bar = r('.mir-timeline .tl-toolbar'), tr = r('.mir-timeline .mir-transport'), pad = parseFloat(getComputedStyle(document.querySelector('.mir-timeline .timeline-surface')).paddingRight);
      return { barRight: bar.right, inner: surf.right - pad, trLeft: tr.left, innerLeft: surf.left + parseFloat(getComputedStyle(document.querySelector('.mir-timeline .timeline-surface')).paddingLeft), barTop: bar.top, trTop: tr.top, barH: bar.height, trH: tr.height,
        hint: !!document.querySelector('.mir-timeline .tl-hint'), status: getComputedStyle(document.querySelector('.mir-timeline .tl-status')).display }; });
    L.ck(near(lane.barRight, lane.inner, 0.5) && near(lane.trLeft, lane.innerLeft, 0.5), 'the transport hugs the left and the one tool bar reaches the inner right edge (fix 5)', lane);
    L.ck(lane.barH === 52 && lane.trH === 52 && lane.barTop === lane.trTop, 'both bars are 52 px, on one row (fix 8)', lane);
    L.ck(!lane.hint && lane.status === 'none', 'no hint row; the empty status line takes no space (fix 6)', lane);
    const chip = async () => E(() => { const c = document.querySelector('.mir-rail[data-mir-rail="timeline"] [data-mir-chip="workbars"]'); return { state: c.dataset.state, pressed: c.getAttribute('aria-pressed'), lane: document.querySelector('.mir-timeline .timeline-surface').dataset.workLane }; });
    const seen = [await chip()];
    for (let i = 0; i < 3; i++) { await page.locator('.mir-rail[data-mir-rail="timeline"] [data-mir-chip="workbars"]').click(); await page.waitForTimeout(60); seen.push(await chip()); }
    L.ck(seen.map((s) => s.state + ':' + s.pressed + ':' + s.lane).join(' ') === 'top:false:top bottom:true:bottom hidden:mixed:hidden top:false:top', 'WORK BARS cycles top → bottom → hidden with BASINS\' pressed', seen);
    await page.locator('.mir-rail[data-mir-rail="timeline"] [data-mir-chip="workbars"]').click(); await page.waitForTimeout(250);
    await page.reload();
    const kept = await chip();
    L.ck(kept.lane === 'bottom' && kept.state === 'bottom', 'the work lane persists with the window', kept);
    await page.locator('.mir-rail[data-mir-rail="timeline"] [data-mir-chip="workbars"]').click(); await page.locator('.mir-rail[data-mir-rail="timeline"] [data-mir-chip="workbars"]').click(); await page.waitForTimeout(60);

    /* ── THE WINDOW: docked, floated, docked again ────────────────────────────────────────────────────────────── */
    const dock0 = await E(() => document.querySelector('.mir-win.mir-timeline').dataset.dock || null);
    const [gx, gy] = await center('.mir-rail[data-mir-rail="timeline"] [data-mir-chip="grip"]');
    await page.mouse.move(gx, gy); await page.mouse.down(); await page.mouse.move(gx + 200, gy - 300, { steps: 10 }); await page.waitForTimeout(40); await page.mouse.up(); await page.waitForTimeout(500);
    const floated = await E(() => { const w = document.querySelector('.mir-win.mir-timeline'); return { dock: w.dataset.dock || null, top: w.getBoundingClientRect().top }; });
    L.ck(dock0 === 'bottom' && floated.dock === null, 'docked at the bottom by default; a grip drag floats it', { dock0, floated });
    const [g2x, g2y] = await center('.mir-rail[data-mir-rail="timeline"] [data-mir-chip="grip"]');
    await page.mouse.move(g2x, g2y); await page.mouse.down(); await page.mouse.move(g2x, 1075, { steps: 14 }); await page.waitForTimeout(80);
    const guide = await E(() => [...document.querySelectorAll('[data-mir-guide="dock"][data-window="timeline"][data-edge]')].filter((g) => g.getClientRects().length).map((g) => g.dataset.edge));
    await page.mouse.up(); await page.waitForTimeout(600);
    const redocked = await E(() => document.querySelector('.mir-win.mir-timeline').dataset.dock || null);
    L.ck(guide.includes('bottom') && redocked === 'bottom', 'a drag to the bottom lights the guide and docks it again', { guide, redocked });

    /* ── THE CURVE EDITOR: a point drag reversed half-way lands exactly where it began ───────────────────────── */
    const ids = await E(() => { const T = window.__TL, m = T.model; m.restore(null); const lanes = m.state().lanes.map((l) => l.id);
      const a = m.create({ targetId: 'scene.glow', name: 'GLOW', value: .5, start: 0, duration: 8, laneId: lanes[0] });
      m.updateCurve(m.state().clips[0].curveId, { points: [{ t: 0, v: .2, tension: 0 }, { t: .5, v: .7, tension: 0 }, { t: 1, v: .3, tension: 0 }] });
      T.tl.editor.setTool('edit'); T.tl.editor.setSnap(0); document.querySelector('.tl-viewport').scrollLeft = 0; return { a, sig: m.signature() }; });
    await page.waitForTimeout(120);
    const [ptx, pty] = await center(`.tl-clip[data-clip="${ids.a}"] circle.tl-point[data-point="1"]`);
    await page.mouse.move(ptx, pty); await page.mouse.down(); await page.mouse.move(ptx + 30, pty - 20, { steps: 6 }); await page.waitForTimeout(40);
    const mid = await E(() => window.__TL.model.state().curves[0].points[1]);
    if (PLATES) await page.screenshot({ path: PLATES + 'timeline-curve-editor-held.png' });
    await page.mouse.move(ptx, pty, { steps: 6 }); await page.waitForTimeout(40); await page.mouse.up(); await page.waitForTimeout(60);
    const back = await E(() => ({ p: window.__TL.model.state().curves[0].points[1], sig: window.__TL.model.signature() }));
    L.ck(mid.v > .7 && back.p.t === .5 && near(back.p.v, .7, 1e-6), 'a point drag reversed half-way lands where it began (the point follows the pointer: FL\'s law)', { mid, back: back.p });
    const sig1 = await E(() => window.__TL.model.signature());
    const tab = await page.locator(`.tl-clip-title[data-clip="${ids.a}"]`).boundingBox();
    await page.mouse.move(tab.x + 40, tab.y + 9); await page.mouse.down(); await page.mouse.move(tab.x + 120, tab.y + 9, { steps: 6 }); await page.waitForTimeout(30);
    const moved = await E(() => window.__TL.model.state().clips[0].start);
    await page.mouse.move(tab.x + 40, tab.y + 9, { steps: 6 }); await page.waitForTimeout(30); await page.mouse.up(); await page.waitForTimeout(60);
    const after = await E(() => window.__TL.model.signature());
    L.ck(moved > 0 && after === sig1, 'a clip drag reversed half-way lands exactly where it began', { moved });

    /* ── IDLE: after the gesture, nothing books a frame ────────────────────────────────────────────────────────── */
    const idle = await E(async () => { const { perf } = await import('/mir/core/perf.js'), { frame } = await import('/mir/core/frame.js');
      let rafs = 0; const raf = window.requestAnimationFrame; window.requestAnimationFrame = (f) => { rafs++; return raf(f); };
      await new Promise((r) => setTimeout(r, 300)); perf.reset(); rafs = 0; await new Promise((r) => setTimeout(r, 700));
      window.requestAnimationFrame = raf; return { snap: perf.snapshot(), rafs, state: frame.state() }; });
    L.ck(idle.snap.frames === 0 && idle.rafs === 0 && !idle.state.scheduled, 'idle after a gesture: zero frames, zero rAF', idle);

    /* ── THE KEYS: rows of the page's one key table; a rebinding moves the key and the sheet ──────────────────── */
    const k0 = await E(() => { const K = window.__TL.keys; return { has: !!K.get('timeline.select-all') && !!K.get('transport.play') && !!K.get('gallery.hide'), n: K.list().filter((a) => a.id.startsWith('timeline.')).length }; });
    L.ck(k0.has && k0.n >= 30, 'the timeline\'s rows, the one play\'s Space and the page\'s own row share one key table', k0);
    await E(() => { window.__TL.keys.bind('timeline.select-all', 'Mod+Shift+KeyA'); return 0; });
    await page.locator('.timeline-surface').focus(); await page.keyboard.press('Control+d'); await page.keyboard.press('Control+a'); await page.waitForTimeout(40);
    const none = await E(() => window.__TL.tl.editor.selection().clips.length);
    await page.keyboard.press('Control+Shift+A'); await page.waitForTimeout(40);
    const all = await E(() => window.__TL.tl.editor.selection().clips.length);
    await page.locator('.tl-toolbar [data-mode="more"]').click(); await page.locator('.tl-pop [data-row="shortcuts"]').click(); await page.waitForTimeout(80);
    const row = await E(() => document.querySelector('.tl-shortcuts .tl-shortcut-row[data-id="timeline.select-all"] .tl-shortcut-col')?.textContent);
    await page.keyboard.press('Escape'); await E(() => { window.__TL.keys.reset('timeline.select-all'); return 0; });
    L.ck(none === 0 && all === 1 && row === 'Ctrl+Shift+A', 'a rebinding in the key table moves the key and the sheet', { none, all, row });

    /* ── THE PROJECT: the arrangement is a project part ───────────────────────────────────────────────────────── */
    const proj = await E(async () => { const P = await import('/mir/core/project.js'), m = window.__TL.model; const saved = P.captureProject(); const sig = m.signature();
      m.restore(null); const cleared = m.state().clips.length; const r = P.restoreProject(saved); return { names: P.projectPartNames(), has: !!saved.timeline, cleared, back: m.signature() === sig, failed: r.failed }; });
    L.ck(proj.names.includes('timeline') && proj.has && proj.cleared === 0 && proj.back && !proj.failed.length, 'the arrangement saves and opens as a project part', proj);

    /* ── A HELD KNOB MAKES A CLIP ─────────────────────────────────────────────────────────────────────────────── */
    const [kx, ky] = await center('#card .k[data-param="scene.spin"] .k-dial');
    await page.mouse.move(kx, ky); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up(); await page.waitForTimeout(80);
    const popped = await page.locator('.tl-pop [data-tl-action="create-clip"]').count();
    if (popped) await page.locator('.tl-pop [data-tl-action="create-clip"]').click();
    await page.waitForTimeout(80);
    const made = await E(() => window.__TL.model.state().curves.filter((c) => c.targetId === 'scene.spin').length);
    L.ck(popped === 1 && made === 1, 'holding a knob offers CREATE AUTOMATION CLIP, which makes a clip on its parameter', { popped, made });

    /* ── THE TEMPO PILL in the work bar types the tempo (BASINS' timeline form) ─────────────────────────────── */
    await page.locator('.mir-timeline .mir-transport .tempo-expand').click(); await page.waitForTimeout(60);
    const typing = await E(() => { const f = document.querySelector('.mir-timeline .mir-transport .transport-tempo-input'); return { shown: !f.hidden, focused: document.activeElement === f, panel: !!document.querySelector('.mir-timeline .mir-transport .native-tempo:not([hidden])') }; });
    await page.keyboard.press('Escape');
    L.ck(typing.shown && typing.focused && !typing.panel, 'a click on the work bar\'s BPM pill types the tempo (no panel)', typing);

    /* ── THE LOOK: the vanilla themes' settings reach the timeline's panes and controls (no literal in its sheet) ── */
    const look = async (set) => { await E((set) => { window.__TL.gui.prefs.set(set); return 0; }, set); await settle(cdp); return E(() => {   // the condition, not a fixed 150 ms (tests/settle.mjs)
      const cs = (s, ...ps) => { const n = document.querySelector(s), c = getComputedStyle(n); return ps.map((p) => c.getPropertyValue(p)).join(' | '); };
      return { lane: cs('.mir-timeline .tl-pane:not(.clip-at-start)', 'background-color', 'backdrop-filter', 'border-top-right-radius', 'box-shadow'),
        bar: cs('.mir-timeline .tl-toolbar', 'background-color', 'border-top-right-radius'), tool: cs('.mir-timeline .tl-tool[aria-pressed="false"]', 'background-color', 'box-shadow'),
        chips: (() => { const c = [...document.querySelectorAll('.mir-rail[data-mir-rail="timeline"] .mir-chip')].map((n) => n.getBoundingClientRect()); return Math.round(c[2].top - c[1].top); })() }; }); };
    const base = await look({ card: 'refractive', frost: 'always', corners: 24, spacing: 'default', faces: 'glass', lightAngle: 0, reliefAngle: 315 });
    const reach = {
      card: (await look({ card: 'tinted' })).lane !== base.lane,
      frost: (await look({ card: 'refractive', frost: 'off' })).lane !== base.lane,
      corners: /10px/.test((await look({ frost: 'always', corners: 10 })).lane.split(' | ')[2]),
      faces: (await look({ corners: 24, faces: 'solid' })).tool !== base.tool,
      lightAngle: (await look({ faces: 'glass', lightAngle: 90 })).lane !== base.lane,
      reliefAngle: (await look({ lightAngle: 0, reliefAngle: 45 })).tool !== base.tool,
      spacing: (await look({ reliefAngle: 315, spacing: 'tight' })).chips !== base.chips,
    };
    await look({ spacing: 'default' });
    L.ck(Object.values(reach).every(Boolean), 'CARD, FROST, CORNERS, FACES, the two lights and SPACING each reach the timeline', reach);

    /* ── WORDS: under qps the timeline's words translate ───────────────────────────────────────────────────────── */
    await E(() => window.__TL.setLanguage('qps')); await page.waitForTimeout(200);
    const qps = await E(() => ({ step: document.querySelector('.tl-toolbar [data-mode="step"]').textContent, snap: document.querySelector('.tl-setting-word').textContent,
      tool: document.querySelector('.tl-tool[data-tool="edit"]').getAttribute('aria-label'), chip: document.querySelector('.mir-rail[data-mir-rail="timeline"] [data-mir-chip="addLane"]').getAttribute('aria-label'),
      option: document.querySelector('.tl-setting .mir-step-text').textContent }));   // SNAP's choice: the kit's stepper (call 19)
    await E(() => window.__TL.setLanguage('en')); await page.waitForTimeout(100);
    L.ck(Object.values(qps).every((s) => s && !/^[A-Za-z ]+$/.test(s)), 'under qps the timeline\'s words translate (tools, settings, options, chips)', qps);

    if (PLATES) {
      const shot = async (f) => { await page.waitForTimeout(250); await page.screenshot({ path: PLATES + f }); };
      await E(() => { const T = window.__TL; T.mod.play(false); localStorage.clear(); return 0; });
      await page.reload(); await shot('timeline-docked-dark.png');
      const r = await page.locator('.tl-ruler').boundingBox(); await page.mouse.move(r.x + 120, r.y + 16); await page.mouse.down(); await page.mouse.move(r.x + 300, r.y + 16, { steps: 6 }); await shot('timeline-mid-scrub-dark.png'); await page.mouse.up();
      const pt = await page.locator('.tl-clip circle.tl-point[data-point="2"]').boundingBox(); await page.mouse.click(pt.x + pt.width / 2, pt.y + pt.height / 2, { button: 'right' }); await shot('timeline-point-menu-dark.png'); await page.keyboard.press('Escape');
      await E(() => { window.__TL.gui.prefs.set('theme', 'light'); return 0; }); await shot('timeline-docked-light.png');
      const [fx, fy] = await center('.mir-rail[data-mir-rail="timeline"] [data-mir-chip="grip"]'); await page.mouse.move(fx, fy); await page.mouse.down(); await page.mouse.move(fx + 260, fy - 360, { steps: 10 }); await page.mouse.up(); await shot('timeline-floating-light.png');
      await E(() => { window.__TL.gui.prefs.set('theme', 'dark'); return 0; }); await shot('timeline-floating-dark.png');
    }
    L.ck(errors().length === 0, 'no page errors', errors());
    L.ck(presses().every((p) => / @(timeline|rail|popup|card)$/.test(p.at)), 'every press landed on the timeline, its rail, its popups or a knob (elementFromPoint)', presses().filter((p) => !/ @(timeline|rail|popup|card)$/.test(p.at)));
  } finally { await close(); }
  return L.finish();
})();
if (RUN.pass !== RUN.total) process.exitCode = 1;
