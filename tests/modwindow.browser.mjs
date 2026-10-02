/* modwindow.browser.mjs — the modulation plugin under a real browser (gallery/modulation.html), real input through CDP.
 * The window in the one window set: in each of the four rail seats the dock guide is drawn at exactly the rect the
 * window lands in, and the landing travels and ends exactly; a drag cancelled by Escape or by pointercancel puts the
 * window back exactly; the chips relocate by Shift-drag and by the keyboard.  Routing: a macro dragged toward a knob
 * lights it (core/proximity.js) and routes onto it, even from beside it; a route onto a fader moves the fader's value.
 * Two instances with different presetKeys keep separate presets.  ONE CLOCK: the window's first seat is modulation's
 * POWER (BASINS'), not a play; the dot follows the app's clock while power is on (and a paused seek); power off returns
 * every target to its base and leaves the app's clock running; the app's play never changes the power; a reload keeps it.  Under the pseudo-language the plugin's words are translated.  Idle after a drag is zero frames.
 * Clickable things are hit-tested with elementFromPoint.  MIR_PLATES=1 also writes docs/plates/modulation/*.png.
 * Standalone: MIR_BASE=http://127.0.0.1:8802 node tests/modwindow.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';
import fs from 'node:fs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8802';
const PLATES = process.env.MIR_PLATES ? new URL('../docs/plates/modulation/', import.meta.url).pathname : null;
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1440, height: 900 });
try {
  /* counts every animation frame the page books, from before any module loads */
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__raf = 0; { const r0 = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (f) => { window.__raf++; return r0(f); }; }` });
  await p.goto(BASE + '/gallery/modulation.html?fresh=1', 1200);
  for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await p.eval('document.fonts.ready.then(() => true)');
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const G = __MOD, mod = G.mod, view = mod.view, api = view.api, M = G.M, MO = G.motion;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const R = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; };
    const off = (a, b) => Math.max(...['left', 'top', 'width', 'height'].map((k) => Math.abs(a[k] - b[k])));
    const center = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; };
    const hits = (el) => { const c = center(el), h = document.elementFromPoint(c.x, c.y); return !!h && (h === el || el.contains(h)); };
    const rest = async () => { for (let i = 0; i < 4; i++) { await MO.settled(view.root); await MO.settled(view.rail); await wait(30); } };
    const win = view.root, rail = view.rail, grip = view.chipRail.grip;
    ${body} })().then(JSON.stringify)`));
  const mouse = (type, x, y, mods = 0) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, modifiers: mods });
  const key = async (k, code = k, vk = 0, mods = 0) => {
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  };
  const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await sleep(30); await mouse('mouseReleased', x, y); await sleep(80); };
  const at = async (sel) => JSON.parse(await p.eval(`(() => { const e = ${sel}; const b = e.getBoundingClientRect(); return JSON.stringify({ x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2), left: b.left, top: b.top, width: b.width, height: b.height }); })()`));
  /** press at (x, y), move to (x + dx, y + dy) in steps; returns before releasing (the caller ends it) */
  const press = async (x, y, dx, dy, { mods = 0, steps = 10 } = {}) => {
    await mouse('mouseMoved', x, y, mods); await mouse('mousePressed', x, y, mods);
    for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', x + Math.round((dx * i) / steps), y + Math.round((dy * i) / steps), mods); await sleep(16); }
    await sleep(80);
  };
  const shot = async (name) => { if (PLATES) { fs.mkdirSync(PLATES, { recursive: true }); await p.shot(PLATES + name + '.png'); } };

  /* ── 0 · the page booted: the window is open, its rail is the one window set's, every chip answers the mouse ── */
  let r = await run(`await rest();
    const chips = [...rail.querySelectorAll('[data-mir-chip]')].filter((c) => getComputedStyle(c).display !== 'none');
    return { open: mod.isOpen, rail: rail.dataset.mirRail, grip: grip.tagName, missed: chips.filter((c) => !hits(c)).map((c) => c.dataset.mirChip),
      xport: hits(win.querySelector('.modxport')), save: hits(win.querySelector('.m2presave')), grips: [...win.querySelectorAll('.m2grip')].every(hits) };`);
  check('boot: the window is open; its rail is data-mir-rail="modulation" with a keyboard grip (a button)', r.open && r.rail === 'modulation' && r.grip === 'BUTTON', JSON.stringify({ open: r.open, rail: r.rail, grip: r.grip }));
  check('hit-test: every chip, the play button, SAVE and every macro grip are what elementFromPoint finds', r.missed.length === 0 && r.xport && r.save && r.grips, JSON.stringify(r));

  /* ── 1 · the dock, in each of the four rail seats: the guide IS the landing; the landing travels and ends exactly ── */
  const SEAT_KEY = { left: ['ArrowLeft', 37], right: ['ArrowRight', 39], top: ['ArrowUp', 38], bottom: ['ArrowDown', 40] };
  for (const side of ['left', 'right', 'top', 'bottom']) {
    /* the keyboard puts the chips on this side (arrows preview, Enter keeps) */
    await p.eval(`__MOD.mod.view.chipRail.grip.focus()`);
    await key(SEAT_KEY[side][0], SEAT_KEY[side][0], SEAT_KEY[side][1]); await key('Enter', 'Enter', 13);
    await run(`await rest(); return 1;`);
    const g = await at(`__MOD.mod.view.chipRail.grip`);
    const s = await run(`const pl = api.placement(); return { side: pl.side, chipSide: pl.chipSide, box: pl.box, land: pl.landing.bottom };`);
    const dy = Math.round(s.land.top + s.land.height - (s.box.top + s.box.height)) + 6;
    await press(g.x, g.y, 0, dy);
    r = await run(`await frames(3);
      const guide = document.querySelector('#floats > .mir-prox[data-prox="capture"]');
      return { guide: guide ? R(guide) : null, land: api.placement().landing.bottom };`);
    await mouse('mouseReleased', g.x, g.y + dy); await sleep(40);
    const mid = await run(`return { moving: api.placement().moving, anims: win.getAnimations().length };`);
    const end = await run(`await rest(); return { rect: R(win), dock: api.placement().dock, anims: win.getAnimations().length, transform: getComputedStyle(win).translate, side: api.placement().side,
      seat: R(rail), railHits: [...rail.querySelectorAll('[data-mir-chip]')].filter((c) => getComputedStyle(c).display !== 'none').every(hits) };`);
    const d = r.guide ? Math.max(...['left', 'top', 'width', 'height'].map((k) => Math.abs(r.guide[k] - end.rect[k]))) : Infinity;
    check(`dock · chips ${side}: the dotted guide's rect equals the landing rect (≤ 1 px)`, s.chipSide === side && !!r.guide && d <= 1 && end.dock === 'bottom',
      `seat ${s.side}, guide ${JSON.stringify(r.guide)} landing ${JSON.stringify(end.rect)} Δ ${d.toFixed(2)}`);
    check(`dock · chips ${side}: the landing travels (a transform) and ends exactly, clean`, mid.moving && mid.anims > 0 && end.anims === 0 && (end.transform === 'none' || end.transform === '') && off(end.rect, r.land) <= 0.5 && end.railHits,
      JSON.stringify({ mid, anims: end.anims, side: end.side }));
    if (side !== 'left') await shot('rail-' + side);
    /* drag it away again: the dock detaches (the point keeps its place) */
    const g2 = await at(`__MOD.mod.view.chipRail.grip`);
    await press(g2.x, g2.y, 0, -260); await mouse('mouseReleased', g2.x, g2.y - 260); await run(`await rest(); return 1;`);
  }
  function off(a, b) { return Math.max(...['left', 'top', 'width', 'height'].map((k) => Math.abs(a[k] - b[k]))); }

  /* back to the left seat, floating, for the rest */
  await p.eval(`__MOD.mod.view.chipRail.grip.focus()`); await key('ArrowLeft', 'ArrowLeft', 37); await key('Enter', 'Enter', 13);
  await run(`await rest(); return 1;`);
  await shot('rail-left');

  /* ── 2 · a drag cancelled by Escape, and by pointercancel, puts the window back exactly ── */
  for (const how of ['Escape', 'pointercancel']) {
    const before = await run(`await rest(); return { rect: R(win), state: api.placement() };`);
    const g = await at(`__MOD.mod.view.chipRail.grip`);
    if (how === 'pointercancel') await p.eval(`window.__pid = null; __MOD.mod.view.chipRail.grip.addEventListener('pointerdown', (e) => { window.__pid = e.pointerId; }, { once: true })`);
    await press(g.x, g.y, -120, 90);
    const moved = await run(`return R(win);`);
    if (how === 'Escape') await key('Escape', 'Escape', 27);
    else await p.eval(`__MOD.mod.view.chipRail.grip.dispatchEvent(new PointerEvent('pointercancel', { pointerId: window.__pid, bubbles: true }))`);
    await mouse('mouseReleased', g.x - 120, g.y + 90);
    const after = await run(`await rest(); return { rect: R(win), state: api.placement() };`);
    check(`cancel by ${how}: the window moved, then returns exactly`, off(moved, before.rect) > 50 && off(after.rect, before.rect) <= 0.5 && after.state.dock === before.state.dock,
      `moved Δ ${off(moved, before.rect).toFixed(0)} px, back Δ ${off(after.rect, before.rect).toFixed(2)} px`);
  }

  /* ── 3 · the chips relocate: Shift-drag on the grip (the nearest edge wins), and the keyboard ── */
  {
    const g = await at(`__MOD.mod.view.chipRail.grip`), w = await at(`__MOD.mod.view.root`);
    const tx = Math.round(w.left + w.width - 30), ty = Math.round(w.top + w.height / 2);
    await press(g.x, g.y, tx - g.x, ty - g.y, { mods: 8, steps: 14 });
    await mouse('mouseReleased', tx, ty, 8);
    r = await run(`await rest(); const pl = api.placement(); return { side: pl.side, chipSide: pl.chipSide, railLeft: R(rail).left, winRight: R(win).left + R(win).width, hit: [...rail.querySelectorAll('[data-mir-chip]')].filter((c) => getComputedStyle(c).display !== 'none').every(hits) };`);
    check('relocate by Shift-drag: the chips take the nearest edge (right) and answer the mouse there', r.side === 'right' && r.chipSide === 'right' && r.railLeft >= r.winRight - 1 && r.hit, JSON.stringify(r));
    await p.eval(`__MOD.mod.view.chipRail.grip.focus()`); await key('ArrowDown', 'ArrowDown', 40);
    const preview = await run(`await rest(); return api.placement().side;`);
    await key('Escape', 'Escape', 27);
    const undone = await run(`await rest(); return api.placement().side;`);
    await key('ArrowLeft', 'ArrowLeft', 37); await key('Enter', 'Enter', 13);
    r = await run(`await rest(); const pl = api.placement(); return { side: pl.side, stored: view.presentation().chipSide, railRight: R(rail).left + R(rail).width, winLeft: R(win).left };`);
    check('relocate by the keyboard: an arrow previews, Escape puts it back, Enter keeps (left), and it is persisted', preview === 'bottom' && undone === 'right' && r.side === 'left' && r.stored === 'left' && r.railRight <= r.winLeft + 1, JSON.stringify({ preview, undone, ...r }));
  }

  /* ── 4 · a route dragged toward a knob: the nearest routable control glows by distance, captures, and the drop routes ── */
  {
    const grip = await at(`document.querySelectorAll('#modwin .m2grip')[1]`);       // MACRO 2's ✥
    const dial = await at(`document.querySelector('.k[data-param="scene.spin"] .k-dial')`);
    /* aim BESIDE the dial — inside capture (18 px) but not on it — so only the glow can catch the drop */
    const { tx, ty } = JSON.parse(await p.eval(`(() => { const d = document.querySelector('.k[data-param="scene.spin"] .k-dial').getBoundingClientRect();
      for (let r = 6; r <= 16; r += 2) for (let a = 0; a < 16; a++) { const x = Math.round(d.left + d.width / 2 + Math.cos(a * Math.PI / 8) * (d.width / 2 + r)), y = Math.round(d.top + d.height / 2 + Math.sin(a * Math.PI / 8) * (d.height / 2 + r));
        const u = document.elementFromPoint(x, y); if (u && !u.closest('.k, .fd, .mir-prox')) return JSON.stringify({ tx: x, ty: y }); }
      return JSON.stringify({ tx: Math.round(d.right + 12), ty: Math.round(d.top + d.height / 2) }); })()`));
    await press(grip.x, grip.y, tx - grip.x, ty - grip.y, { steps: 16 });
    r = await run(`await frames(3);
      const k = document.querySelector('.k[data-param="scene.spin"]'), lit = [...document.querySelectorAll('.m2route-glow > .mir-prox[data-prox]')].map((n) => n.dataset.prox);
      const cap = document.querySelector('.m2route-glow > .mir-prox[data-prox="capture"]'), under = document.elementFromPoint(${tx}, ${ty});
      return { lit, capture: cap ? R(cap) : null, dial: R(k.querySelector('.k-dial')), over: k.classList.contains('is-over'), arming: api.arming(),
        notOnIt: !(under && under.closest('.k')), ink: cap ? getComputedStyle(cap).borderTopColor : '', acc2: getComputedStyle(document.querySelector('.m2route-glow')).getPropertyValue('--acc2').trim() };`);
    await shot('route-lit');
    await mouse('mouseReleased', tx, ty); await sleep(120);
    const routed = await run(`await frames(2); return { routes: M.routeList().filter((x) => x.targetId === 'scene.spin').map((x) => x.macroId), rings: api.rings(), cleared: !document.querySelector('.m2route-glow > .mir-prox[data-prox="capture"]') };`);
    check('route glow: dragging a macro near a knob lights the routable controls by distance and captures the nearest (accent B)', r.lit.length >= 2 && r.lit.includes('capture') && !!r.capture && off(r.capture, r.dial) <= 1 && r.over && r.notOnIt,
      JSON.stringify({ lit: r.lit, over: r.over, capture: r.capture, dial: r.dial, ink: r.ink }));
    check('route glow: released beside the knob, the route lands on it and the glow clears', routed.routes.length === 1 && routed.rings.includes('scene.spin') && routed.cleared, JSON.stringify(routed));
  }

  /* ── 5 · a route onto a fader: drop MACRO 1 onto SPREAD; while the transport plays, the fader's value moves ── */
  {
    const grip = await at(`document.querySelectorAll('#modwin .m2grip')[0]`);
    const fd = await at(`document.querySelector('.fd[data-param="scene.spread"]')`);
    await press(grip.x, grip.y, fd.x - grip.x, fd.y - grip.y, { steps: 14 });
    await mouse('mouseReleased', fd.x, fd.y); await sleep(120);
    r = await run(`await frames(2); const f = document.querySelector('.fd[data-param="scene.spread"]'), bar = f.querySelector('.m2fdrange');
      return { route: M.routeList().some((x) => x.targetId === 'scene.spread'), ring: f.classList.contains('has-ring'), bar: !!bar && !bar.hidden && getComputedStyle(bar).display !== 'none', span: bar ? +bar.style.getPropertyValue('--m2-route-span') : 0 };`);
    check('fader: a macro dropped on a kit fader() routes onto it, and the fader wears its range bar', r.route && r.ring && r.bar && r.span > 0, JSON.stringify(r));
    const play = await at(`document.querySelector('#appplay .trig')`);      // the APP's play, outside the window
    await click(play.x, play.y);
    r = await run(`await wait(250); const f = document.querySelector('.fd[data-param="scene.spread"]'), a = +f.style.getPropertyValue('--fill'), sa = G.S.spread;
      await wait(400); const b = +f.style.getPropertyValue('--fill'), sb = G.S.spread;
      return { playing: mod.host.clock.isPlaying(), a, b, sa, sb, mod: f.classList.contains('mod'), base: mod.baseOf('scene.spread') };`);
    check('fader: while the app plays, the routed fader shows the moving value over its base (fader().show)', r.playing && r.mod && Math.abs(r.a - r.b) > 1e-3 && Math.abs(r.sa - r.sb) > 1e-3, JSON.stringify(r));
  }

  /* ── 6 · ONE CLOCK: the window's first work-bar seat is modulation's POWER; the dot follows the app's clock ── */
  {
    r = await run(`const x = win.querySelector('.modxport');
      const b = document.createElement('i'); b.style.color = 'var(--acc2)'; x.parentNode.appendChild(b); const accB = getComputedStyle(b).color; b.remove();
      return { face: x.dataset.face, ink: getComputedStyle(x).color === accB && getComputedStyle(x.querySelector('svg')).color === accB && getComputedStyle(x.querySelector('.mir-power-ring')).stroke === accB, power: x.classList.contains('mir-mod-power'), ring: !!x.querySelector('.mir-power-ring'), pressed: x.getAttribute('aria-pressed'), on: mod.power(),
        hit: hits(x), noPlay: !win.querySelector('polygon') && ![...win.querySelectorAll('[aria-label], [title]')].some((n) => /\\bplay\\b/i.test((n.getAttribute('aria-label') || '') + ' ' + (n.title || ''))) };`);
    check('power: the work bar\'s first seat is BASINS\' power button (lit in accent B while on, aria-pressed), and nothing in the window is a play', r.face === 'power' && r.ink && r.power && r.ring && r.pressed === 'true' && r.on && r.hit && r.noPlay, JSON.stringify(r));
    r = await run(`const lfo = M.sourceList().find((s) => s.kind === 'lfo').id; const c1 = api.curve(lfo); await wait(300); const c2 = api.curve(lfo);
      const x = (c) => c.dot[0], expect = (c) => +(${'c.pad'} + c.headU * (c.w - 2 * c.pad)).toFixed(2);
      return { lfo, moved: Math.abs(x(c1) - x(c2)) > 0.5, onCurve: Math.abs(x(c2) - expect(c2)) < 1.5 || Math.abs(x(c2) - expect(c1)) < 30, a: c1.dot, b: c2.dot, head: c2.head };`);
    check('play dot: power on and the app playing, the LFO’s dot moves along its curve (and the play line with it)', r.moved && r.onCurve && Math.abs(r.head - r.b[0]) < 0.01, JSON.stringify(r));
    /* power OFF (a real press on the window's power): every target back on its base, the app's clock still running */
    const pow = await at(`document.querySelector('#modwin .modxport')`);
    await click(pow.x, pow.y);
    r = await run(`await wait(200); const f = document.querySelector('.fd[data-param="scene.spread"]'), b0 = M.transport.beats; await wait(300);
      return { power: mod.power(), pressed: win.querySelector('.modxport').getAttribute('aria-pressed'), lit: win.querySelector('.modxport').classList.contains('on'),
        playing: mod.playing(), beats: M.transport.beats - b0, held: ['scene.size', 'scene.bright', 'scene.spread'].filter((id) => mod.isModulated(id)),
        spread: G.S.spread, base: mod.baseOf('scene.spread'), faderMod: f.classList.contains('mod') };`);
    check('power off: every routed target returns to its base, and the app\'s clock keeps running', !r.power && r.pressed === 'false' && !r.lit && r.playing && r.beats > 0 && r.held.length === 0 && Math.abs(r.spread - r.base) < 1e-9 && !r.faderMod, JSON.stringify(r));
    const play = await at(`document.querySelector('#appplay .trig')`);
    await click(play.x, play.y);                                               // the app pauses
    r = await run(`await wait(120); return { off: { playing: mod.playing(), power: mod.power() } };`);
    const played = await run(`return 1;`);
    await click(play.x, play.y); const r2 = await run(`await wait(120); return { playing: mod.playing(), power: mod.power() };`);
    await click(play.x, play.y); const r3 = await run(`await wait(120); return { playing: mod.playing(), power: mod.power() };`);
    check('app play does not change the power (pause, play, pause: power stays off)', !r.off.playing && !r.off.power && r2.playing && !r2.power && !r3.playing && !r3.power, JSON.stringify({ r, r2, r3, played }));
    await click(pow.x, pow.y);                                                 // power back on, the app paused
    r = await run(`await wait(120); const lfo = M.sourceList().find((s) => s.kind === 'lfo').id, s = M.sourceOf(lfo);
      M.setSource(lfo, { sync: 1, anchor: 1 }); mod.host.clock.recomputeRunning();
      const a = api.curve(lfo).dot[0]; mod.host.clock.seek((M.transport.beats || 0) + 0.37); await frames(4); const b = api.curve(lfo).dot[0];
      return { playing: mod.host.clock.isPlaying(), power: mod.power(), a, b };`);
    check('play dot: the app paused and power on, a seek moves the model and the dot follows (one paint, no loop)', !r.playing && r.power && Math.abs(r.a - r.b) > 0.5, JSON.stringify(r));
  }

  /* ── 7 · two instances, two presetKeys, two preset stores ── */
  {
    const name = await at(`document.querySelector('#modwin .m2prename')`);
    await click(name.x, name.y); await p.send('Input.insertText', { text: 'ALPHA' });
    const save = await at(`document.querySelector('#modwin .m2presave')`);
    await click(save.x, save.y);
    const second = await at(`[...document.querySelectorAll('#bar .trig')].find((b) => b.closest('.g-second'))`);
    await click(second.x, second.y);
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { await sleep(150); ready = await p.eval(`!!(document.getElementById('second').contentWindow && document.getElementById('second').contentWindow.__ready)`); }
    r = await run(`const B = document.getElementById('second').contentWindow.__MOD;
      const bSaw = B.M.presetList().filter((x) => !x.factory).map((x) => x.name);
      B.M.presetSave('BETA', B.M.serializeRack());
      const aSees = M.presetList().filter((x) => !x.factory).map((x) => x.name);
      return { ready: true, aKey: api.presetKey(), bKey: B.mod.view.api.presetKey(), aSees, bSaw, bNow: B.M.presetList().filter((x) => !x.factory).map((x) => x.name) };`);
    check('presetKey: two instances with different keys keep separate presets (A saved ALPHA through the window, B saved BETA)',
      r.aKey !== r.bKey && r.aSees.includes('ALPHA') && !r.aSees.includes('BETA') && !r.bSaw.includes('ALPHA') && r.bNow.includes('BETA'), JSON.stringify(r));
    await click(second.x, second.y);
  }

  /* ── 8 · the words: under the pseudo-language the plugin's labels are translated ── */
  {
    r = await run(`await G.setLanguage('qps'); await frames(3);
      const q = (s) => typeof s === 'string' && /^\\[.*\\]$/.test(s.trim()) && /[^\\x00-\\x7f]/.test(s);
      const out = { head: [...win.querySelector('.m2railhead').childNodes].find((n) => n.nodeType === 3).nodeValue, add: win.querySelector('.m2macadd').textContent, kind: win.querySelector('.m2dev .m2kind').textContent,
        chip: view.chipRail.chip('compact').getAttribute('aria-label'), rail: rail.getAttribute('aria-label'), cap: win.querySelector('.m2dev.lfo .m2macbox').dataset.cap,
        check: win.querySelector('.m2chk span').textContent, sync: win.querySelector('.modsync').textContent, knob: win.querySelector('.m2kcap').textContent };
      const all = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, q(v)]));
      await G.setLanguage('en'); await frames(3);
      const back = { add: win.querySelector('.m2macadd').textContent, cap: win.querySelector('.m2dev.lfo .m2macbox').dataset.cap, chip: view.chipRail.chip('compact').getAttribute('aria-label') };
      return { out, all, back };`);
    check('language: under qps the window’s labels, chip names, CSS captions and painted words are translated, and English comes back',
      Object.values(r.all).every(Boolean) && r.back.add === 'ADD MACRO' && r.back.cap === 'OUT' && r.back.chip === 'COMPACT', JSON.stringify(r));
  }

  /* ── 9 · idle after a drag is zero frames ── */
  {
    const g = await at(`__MOD.mod.view.chipRail.grip`);
    await press(g.x, g.y, 60, 40); await mouse('mouseReleased', g.x + 60, g.y + 40);
    r = await run(`await rest(); await wait(400); const n0 = window.__raf; await wait(1000); return { frames: window.__raf - n0, playing: mod.host.clock.isPlaying(), frame: G.frame.state() };`);
    check('idle: a second after a drag lands, with the transport paused, the page books zero animation frames', r.frames === 0 && !r.playing && !r.frame.scheduled, JSON.stringify(r));
  }
  /* ── 9b · docked (BASINS 2026-10-01): the right work bar follows the last device; the chips sit tighter ── */
  {
    r = await run(`view.restore({ ...view.presentation(), dock: 'bottom', chipSide: 'left', open: true }); await rest(); await frames(3);
      const bar = () => win.querySelector('.m2pre').getBoundingClientRect(), run = () => win.querySelector('.m2run').getBoundingClientRect();
      const last = () => { const c = win.querySelectorAll('.m2run .m2dev'); return c[c.length - 1].getBoundingClientRect(); };
      const two = { devices: win.querySelectorAll('.m2run .m2dev').length, bar: bar().right, last: last().right };
      const chips = [...rail.querySelectorAll('.crail-chip')].filter((c) => getComputedStyle(c).display !== 'none').map((c) => c.getBoundingClientRect());
      const step = chips[1].top - chips[0].top, disc = parseFloat(getComputedStyle(rail).getPropertyValue('--chrome-chip-disc')) || 48;
      const tight = { dock: rail.dataset.dock, step, gapDiscs: step - disc, across: Math.round(chips[0].width) };
      for (let i = 0; i < 3; i++) M.addSource('lfo');
      view.rebuild(); await rest(); await frames(3);
      const over = { devices: win.querySelectorAll('.m2run .m2dev').length, bar: bar().right, run: run().right, last: last().right };
      const buttons = [...win.querySelectorAll('.m2pre button')].filter((b) => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden');
      const missed = buttons.filter((b) => !hits(b)).map((b) => b.className);
      return { two, over, tight, missed, n: buttons.length };`);
    check('docked: with two devices the right work bar ends at the last device (≤ 1 px)', r.two.devices === 2 && Math.abs(r.two.bar - r.two.last) <= 1, JSON.stringify(r.two));
    check('docked: with the run overflowing it ends at the run’s right edge (≤ 1 px), and every button on it answers elementFromPoint',
      r.over.last > r.over.run && Math.abs(r.over.bar - r.over.run) <= 1 && r.missed.length === 0 && r.n >= 5, JSON.stringify({ over: r.over, missed: r.missed, n: r.n }));
    check('docked: the rail carries data-dock and its discs stand 8 px apart (4 + 4), the 62 px target kept across', r.tight.dock === 'bottom' && Math.abs(r.tight.gapDiscs - 8) <= 1 && r.tight.across === 62, JSON.stringify(r.tight));
    await p.mouse(1435, 300); await p.eval(`__MOD.mod.view.say('')`); await sleep(300);   // no hover hint or transient line in the plate
    await shot('docked');
    await run(`for (const s of M.sourceList().filter((x) => x.kind === 'lfo').slice(1)) M.removeSource(s.id); view.restore({ ...view.presentation(), dock: null, x: 340, y: 132, open: true }); await rest(); return 1;`);
  }

  /* ── 10 · a reload keeps the power state ── */
  {
    const pow = await at(`document.querySelector('#modwin .modxport')`);
    await click(pow.x, pow.y);
    await run(`await wait(400); return 1;`);                                     // the store writes 180 ms after the change
    const before = await run(`return { power: mod.power() };`);
    await p.goto(BASE + '/gallery/modulation.html', 1200);
    for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
    r = await run(`await rest(); const x = win.querySelector('.modxport'); return { power: mod.power(), pressed: x.getAttribute('aria-pressed'), lit: x.classList.contains('on'), enabled: mod.host.clock.isModulationEnabled(), playing: mod.playing() };`);
    check('reload: the power state is kept (off before, off after; the clock is not played by it)', !before.power && !r.power && r.pressed === 'false' && !r.lit && !r.enabled && !r.playing, JSON.stringify({ before, after: r }));
    await shot('power-off');
  }
  check('no page errors', p.logs.filter((l) => /EXCEPTION|error/i.test(l)).length === 0, p.logs.slice(0, 4).join(' | '));
} catch (e) {
  results.push('FAIL  the run threw — ' + (e && e.stack || e));
} finally { await p.close(); }

for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`modwindow browser: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
