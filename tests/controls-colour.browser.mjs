// The colour controls in a real browser (gallery/colour-controls.html), with real input through CDP, every press hit-tested
// with elementFromPoint: the arc turns by the vertical law and by the angular law (finer far from the hub), the kit's fine
// gear (a modifier, a second finger) engages without moving the value, double-tap comes home, Escape puts the value back;
// the swatch drag turns the hue and a drag's click opens nothing; the lane slider moves (h and v), homes on a double-tap and
// is routed from a macro (the thumb moves, the RANGE bar and the live dot draw in both orientations); the chip strip is
// static and its × asks twice; the list reorders by drag and by arrows, × asks twice, + ADD dims at the cap.
// MIR_BASE=http://127.0.0.1:8853/ node tests/controls-colour.browser.mjs
import { openTimeline, ledger } from './timeline-rig.mjs';
import { sleep } from '../tools/cdp.mjs';

const { page, cdp, errors, presses, close } = await openTimeline({ page: 'gallery/colour-controls.html', query: '', width: 1280, height: 1100 });
const L = ledger('controls-colour');
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const wrapDiff = (a, b, period) => { const d = (((a - b) % period) + period) % period; return d > period / 2 ? d - period : d; };
const pt = (code) => page.evaluate(`() => { const n = ${code}; const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, l: r.left, t: r.top, b: r.bottom, r: r.right }; }`);
const get = (code) => page.evaluate(`() => ${code}`);
const hitIs = (x, y, code) => page.evaluate(`(a) => { const n = document.elementFromPoint(a[0], a[1]); const t = ${code}; return !!n && (n === t || t.contains(n)); }`, [x, y]);
const dialOf = (key) => `__C.W.${key}.root.querySelector('.k-dial')`;
const rootOf = (key) => `__C.W.${key}.root`;
const press = async (x, y, { mods = [] } = {}) => { await sleep(340); for (const m of mods) await page.keyboard.down(m); await page.mouse.move(x, y); await page.mouse.down(); };   // 340 ms: a press is not the second of a double-tap
const release = async (mods = []) => { await page.mouse.up(); for (const m of mods) await page.keyboard.up(m); await sleep(40); };

try {
  const law = await page.evaluate(async () => (await import('../mir/kit.js')).setKnobLaw());
  const gain = 1 / law.fine;
  L.ck(law.travel > 0 && law.fine > 1, 'the kit law is readable (setKnobLaw())', law);

  /* ── 1 · the arc: the vertical law ── */
  let c = await pt(dialOf('hue'));
  L.ck(await hitIs(c.x, c.y, rootOf('hue')), 'the HUE arc is what a hand presses at its centre (elementFromPoint)', c);
  const noBody = await get(`(() => { const d = ${dialOf('hue')}, cs = getComputedStyle(d); return { shadow: cs.boxShadow, bg: cs.backgroundColor, bgi: cs.backgroundImage, svg: !!d.querySelector('svg.k-arc .k-arc-value'), cap: getComputedStyle(d.querySelector('.k-arc-value')).strokeLinecap }; })()`);
  L.ck(noBody.svg && noBody.cap === 'round' && noBody.shadow === 'none' && noBody.bgi === 'none', 'no body, a round-capped SVG ring', noBody);
  const v0 = await get('__C.W.hue.get()');
  await press(c.x, c.y); await page.mouse.move(c.x, c.y - 55, { steps: 6 }); await release();
  const v1 = await get('__C.W.hue.get()');
  L.ck(near(wrapDiff(v1, v0, 360), 55 / law.travel * 360, 1.5), 'a vertical drag of 55 px turns the hue by 55 / travel of a turn (dx ignored)', { v0, v1, want: 55 / law.travel * 360 });
  /* dx ignored */
  const v2a = await get('__C.W.hue.get()');
  await press(c.x, c.y); await page.mouse.move(c.x + 90, c.y, { steps: 5 }); await release();
  L.ck(near(await get('__C.W.hue.get()'), v2a, 0.01), 'a sideways drag turns nothing (the vertical law ignores dx)', { v2a });

  /* the fine gear: Shift is 1/fine, and engaging it mid-drag moves nothing */
  const v3 = await get('__C.W.hue.get()');
  await press(c.x, c.y, { mods: ['Shift'] }); await page.mouse.move(c.x, c.y - 55, { steps: 6 }); await release(['Shift']);
  L.ck(near(wrapDiff(await get('__C.W.hue.get()'), v3, 360), 55 / law.travel * 360 * gain, 1), 'Shift gears the drag to 1 / fine of the hand', { want: 55 / law.travel * 360 * gain, gain });
  const v4 = await get('__C.W.hue.get()');
  await press(c.x, c.y); await page.mouse.move(c.x, c.y - 30, { steps: 4 });
  const mid = await get('__C.W.hue.get()');
  await page.keyboard.down('Shift'); const afterEngage = await get('__C.W.hue.get()');
  await page.mouse.move(c.x, c.y - 60, { steps: 4 }); await page.keyboard.up('Shift'); await release();
  L.ck(near(afterEngage, mid, 0.001) && near(wrapDiff(await get('__C.W.hue.get()'), v4, 360), (30 / law.travel + 30 / law.travel * gain) * 360, 1.5),
    'engaging the gear in the middle of a drag moves nothing; the rest of the drag is geared (a virtual point)', { v4, mid, afterEngage, end: await get('__C.W.hue.get()') });

  /* a second finger: a real touch drag with a second touch down is geared */
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const v5 = await get('__C.W.hue.get()');
  const tp = (id, x, y) => ({ x, y, id, radiusX: 1, radiusY: 1, force: 1 });
  await sleep(340);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tp(1, c.x, c.y)] });
  presses().push({ x: c.x, y: c.y, button: 'touch', at: 'touch ' + (await hitIs(c.x, c.y, dialOf('hue'))) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tp(1, c.x, c.y), tp(2, c.x + 200, c.y + 200)] });
  for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [tp(1, c.x, c.y - 11 * i), tp(2, c.x + 200, c.y + 200)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(80);
  const touchDelta = wrapDiff(await get('__C.W.hue.get()'), v5, 360);
  L.ck(touchDelta > 0 && near(touchDelta, 55 / law.touchTravel * 360 * gain, 1), 'a second finger down gears a touch drag to 1 / fine (touch travel)', { touchDelta, want: 55 / law.touchTravel * 360 * gain });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });

  /* double-tap comes home; a double-click does it once */
  const home = 210;
  await page.mouse.click(c.x, c.y); await page.mouse.click(c.x, c.y);
  await sleep(40);
  L.ck(near(await get('__C.W.hue.get()'), home, 0.001) && !(await get(`${rootOf('hue')}.classList.contains('drag')`)), 'a double-tap comes home (and no drag is left running)', { v: await get('__C.W.hue.get()') });

  /* Escape puts the value back */
  const v6 = await get('__C.W.hue.get()');
  await press(c.x, c.y); await page.mouse.move(c.x, c.y - 40, { steps: 4 });
  const moved = await get('__C.W.hue.get()');
  await page.keyboard.press('Escape'); await release(); await sleep(60);
  L.ck(!near(moved, v6, 1) && near(await get('__C.W.hue.get()'), v6, 0.001) && !(await get(`${rootOf('hue')}.classList.contains('drag')`)), 'Escape ends the drag and puts the value back', { v6, moved, after: await get('__C.W.hue.get()') });

  /* ── 2 · the arc: the angular law (a free dial: farther from the hub is finer) ── */
  await page.mouse.move(...Object.values(await pt(dialOf('hubA'))).slice(0, 2)); await sleep(300);   // the hover lifts the dial 1 px: measure after it
  c = await pt(dialOf('hubA'));
  const arcTurn = async (radius, degrees) => {
    const a0 = -Math.PI / 2, v = await get('__C.W.hubA.get()');
    await press(c.x + radius * Math.cos(a0), c.y + radius * Math.sin(a0));
    for (let i = 1; i <= 10; i++) { const a = a0 + (degrees * Math.PI / 180) * i / 10; await page.mouse.move(c.x + radius * Math.cos(a), c.y + radius * Math.sin(a)); }
    await release();
    return wrapDiff(await get('__C.W.hubA.get()'), v, 360);
  };
  const dNear = await arcTurn(30, 40), dFar = await arcTurn(45, 40);
  L.ck(await hitIs(c.x, c.y - 30, rootOf('hubA')), 'the big angular arc takes a press near its hub (elementFromPoint)', c);
  L.ck(near(dNear, 40, 2), 'inside 34 px of the hub one turn of the hand is one turn of the value', { dNear });
  L.ck(near(dFar, 40 * 34 / 45, 2) && dFar < dNear, 'far from the hub is finer: gain 34 / distance, decided at the press', { dFar, want: 40 * 34 / 45 });
  const hub = await get(`(() => { const v = __C.W.hubA.get(); return v; })()`);
  await press(c.x + 2, c.y); await page.mouse.move(c.x + 3, c.y + 2); await page.mouse.move(c.x - 2, c.y - 3); await release();
  L.ck(near(await get('__C.W.hubA.get()'), hub, 0.001), 'the 7 px dead hub has no angle: nothing turns', { hub });

  /* ── 3 · the swatch ── */
  const sw = await pt(`__C.W.sw_rgb.root`);
  L.ck(await hitIs(sw.x, sw.y, `__C.W.sw_rgb.root`) && (await get(`document.elementFromPoint(${sw.x}, ${sw.y}).classList.contains('mir-swatch-pick')`)), 'the transparent chooser is what a hand presses on the swatch (elementFromPoint)', sw);
  const hue = (code) => page.evaluate(`async () => { const m = await import('../mir/controls/swatch.js'); return m.rgbToHsv(${code})[0] * 360; }`);
  await page.evaluate(() => { window.__clicks = 0; window.addEventListener('click', (e) => { if (e.target.classList && e.target.classList.contains('mir-swatch-pick')) window.__clicks++; }); return 0; });
  const h0 = await hue('__C.W.sw_rgb.get()');
  await press(sw.x, sw.y); await page.mouse.move(sw.x, sw.y - 44, { steps: 6 }); await release();
  const h1 = await hue('__C.W.sw_rgb.get()');
  L.ck(near(wrapDiff(h1, h0, 360), 44 / 220 * 360, 2), 'a drag of 44 px turns the swatch hue by 44 / 220 of a turn', { h0, h1, want: 44 / 220 * 360 });
  L.ck((await get('window.__clicks')) === 0, 'the click a drag ends in opens no chooser', { clicks: await get('window.__clicks') });
  const s0 = await get('__C.W.sw_rgb.get()');
  await press(sw.x, sw.y); await page.mouse.move(sw.x, sw.y - 4); await release();
  L.ck((await get('window.__clicks')) === 1 && JSON.stringify(await get('__C.W.sw_rgb.get()')) === JSON.stringify(s0), 'a tap (under 8 px) goes through to the chooser and turns nothing', { clicks: await get('window.__clicks') });
  const h2 = await hue('__C.W.sw_rgb.get()');
  await press(sw.x, sw.y); await page.mouse.move(sw.x, sw.y - 44, { steps: 4 }); await page.keyboard.press('Escape'); await release(); await sleep(60);
  L.ck(near(await hue('__C.W.sw_rgb.get()'), h2, 0.01), 'Escape puts the swatch colour back', { h2 });
  /* no glow in its own colour (Josh, 2026-10-07): the swatch keeps its 1 px rim only, and the lane thumb wears none */
  const glow = await get(`(() => { const s = __C.W.sw_rgb.root.querySelector('.mir-swatch'), t = __C.W.laneFreq.root.querySelector('.fd-edge'); return { swatch: getComputedStyle(s).boxShadow, thumb: getComputedStyle(t).boxShadow }; })()`);
  /* call 16 (Josh, 2026-10-07): no hint of its own, no accent ring; a keyboard focus is BASINS' 1 px hairline in its own colour */
  const ringOf = () => get(`(() => { const s = getComputedStyle(__C.W.sw_rgb.root.querySelector('.mir-swatch')); return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor, bg: s.backgroundColor, title: __C.W.sw_rgb.input.title, help: __C.W.sw_rgb.input.dataset.help || '' }; })()`);
  await page.evaluate(() => { __C.W.sw_rgb.input.blur(); return 0; });
  await press(sw.x, sw.y); await page.mouse.move(sw.x, sw.y - 20, { steps: 3 }); await release();   // a mouse press (a drag: no chooser)
  const mouseRing = { ...(await ringOf()), focused: await get('document.activeElement === __C.W.sw_rgb.input') };
  await page.evaluate(() => { __C.W.sw_rgb.input.blur(); return 0; }); await page.keyboard.press('Shift');
  await page.evaluate(() => { __C.W.sw_rgb.input.focus(); return 0; }); await sleep(40);
  const keyRing = await ringOf();
  await page.evaluate(() => { __C.W.sw_rgb.input.blur(); return 0; });
  L.ck(mouseRing.title === '' && mouseRing.help === '' && mouseRing.style === 'none' && keyRing.style === 'solid' && keyRing.width === '1px' && keyRing.color === keyRing.bg,
    'the swatch has no hint and no accent ring: a keyboard focus is a 1 px hairline in its own colour', { mouseRing, keyRing });
  L.ck(/inset/.test(glow.swatch) && !/\) -?\d+px -?\d+px [1-9]/.test(glow.swatch) && glow.thumb === 'none', 'no coloured glow: the swatch is its 1 px rim, the lane thumb has no shadow', glow);

  /* ── 4 · the lane slider ── */
  let f = await pt(`__C.W.laneFreq.root`);
  L.ck(await hitIs(f.x, f.y, `__C.W.laneFreq.root`), 'the lane pill is what a hand presses (elementFromPoint)', f);
  const logAt = (u) => 0.25 * Math.pow(32, u);
  await press(f.l + f.w * 0.25, f.y); await page.mouse.move(f.l + f.w * 0.75, f.y, { steps: 6 }); await release();
  L.ck(near(await get('__C.W.laneFreq.get()'), logAt(0.75), 0.05), 'a press jumps the pill to where it came down and the drag follows (log scale)', { v: await get('__C.W.laneFreq.get()'), want: logAt(0.75) });
  const fv0 = await get('__C.W.laneFreq.get()');
  await press(f.l + f.w * 0.75, f.y, { mods: ['Alt'] }); await page.mouse.move(f.l + f.w * 0.75 + 60, f.y, { steps: 4 }); await release(['Alt']);
  const fv1 = await get('__C.W.laneFreq.get()');
  L.ck(fv1 > fv0 && near(Math.log(fv1 / fv0) / Math.log(32), 60 / f.w * gain, 0.02), 'a modifier gears the pill (relative from where it stands)', { fv0, fv1, want: 60 / f.w * gain });
  await page.mouse.click(f.l + f.w * 0.5, f.y); await page.mouse.click(f.l + f.w * 0.5, f.y); await sleep(40);
  L.ck(near(await get('__C.W.laneFreq.get()'), 1, 1e-6), 'a double-tap on the pill comes home', { v: await get('__C.W.laneFreq.get()') });

  let vv = await pt(`__C.W.laneVert.root`);
  L.ck(await hitIs(vv.x, vv.y, `__C.W.laneVert.root`) && vv.h > vv.w * 2, 'the vertical pill is taller than wide and takes the press', vv);
  await press(vv.x, vv.b - vv.h * 0.25); await page.mouse.move(vv.x, vv.b - vv.h * 0.8, { steps: 6 }); await release();
  L.ck(near(await get('__C.W.laneVert.get()'), 0.8, 0.02), 'a vertical pill: the top is the maximum', { v: await get('__C.W.laneVert.get()') });
  await page.mouse.click(vv.x, vv.y); await page.mouse.click(vv.x, vv.y); await sleep(40);
  L.ck(near(await get('__C.W.laneVert.get()'), 0.4, 1e-6), 'a double-tap on the vertical pill comes home', { v: await get('__C.W.laneVert.get()') });
  const ink = await get(`(() => { const lane = __C.lane; return { lane: getComputedStyle(lane).getPropertyValue('--lane-ink'), fill: getComputedStyle(__C.W.laneFreq.root.querySelector('.fd-fill')).backgroundColor, thumb: getComputedStyle(__C.W.laneFreq.root.querySelector('.fd-edge')).backgroundColor }; })()`);
  L.ck(ink.fill === ink.thumb && /rgb\(2\d\d/.test(ink.fill), 'the fill and the thumb wear the lane\'s ink (--lane-ink)', ink);

  /* ── 5 · routed from a macro: all four are modulation targets ── */
  await page.evaluate(() => { __C.mod.open(); return 0; });
  await sleep(500);
  await page.evaluate(() => { for (const id of ['demo.hue', 'demo.amount', 'demo.freq', 'demo.gain']) __C.mod.route('lfo', id, 0.4); __C.mod.play(true); return 0; });
  await sleep(300);
  const seen = { fill: new Set(), live: new Set(), gain: new Set() };
  for (let i = 0; i < 16; i++) {
    const s = await get(`({ fill: __C.W.rFreq.root.style.getPropertyValue('--fill'), live: __C.W.rHue.root.style.getPropertyValue('--live-turn'), gain: __C.W.rGain.root.style.getPropertyValue('--fill') })`);
    seen.fill.add(s.fill); seen.live.add(s.live); seen.gain.add(s.gain); await sleep(90);
  }
  const rs = await get(`({ held: [__C.W.rHue, __C.W.rAmt, __C.W.rFreq, __C.W.rGain].map((w) => w.root.classList.contains('mod-held')), ring: [__C.W.rHue, __C.W.rFreq, __C.W.rGain].map((w) => w.root.classList.contains('has-ring')) })`);
  L.ck(rs.held.every(Boolean) && rs.ring.every(Boolean), 'a route onto each of them marks it driven and ringed', rs);
  L.ck(seen.fill.size >= 4 && seen.gain.size >= 4, 'a routed pill (h and v) moves its thumb natively: no native range, no overlay', { fill: seen.fill.size, gain: seen.gain.size });
  L.ck(seen.live.size >= 4, 'a routed arc rides its live dot round the ring', { live: seen.live.size });
  const bar = await get(`(() => { const r = (w) => { const a = w.root.querySelector('.m2fdrange'), d = w.root.querySelector('.m2fdrangedot'); const b = a && a.getBoundingClientRect(), p = d && d.getBoundingClientRect(); return { range: b && { w: b.width, h: b.height }, dot: p && { w: p.width, h: p.height, hidden: d.hidden }, hidden: a && a.hidden }; }; return { h: r(__C.W.rFreq), v: r(__C.W.rGain), liveDot: getComputedStyle(__C.W.rHue.root.querySelector('.k-live')).display }; })()`);
  L.ck(bar.h.range && bar.h.range.w > 4 && near(bar.h.range.h, 2, 0.6) && bar.h.dot && !bar.h.dot.hidden, 'the modulation window\'s RANGE bar and dot draw along a horizontal pill', bar.h);
  L.ck(bar.v.range && bar.v.range.h > 4 && near(bar.v.range.w, 2, 0.6) && bar.v.dot && !bar.v.dot.hidden, '... and up a vertical one', bar.v);
  L.ck(bar.liveDot === 'block', 'the live dot of a routed arc shows', bar);
  /* a hand on a routed pill writes the base (the window is closed: it floats over this card) */
  await page.evaluate(() => { __C.mod.close(); return 0; });
  await sleep(300);
  f = await pt(`__C.W.rFreq.root`);
  L.ck(await hitIs(f.x, f.y, `__C.W.rFreq.root`), 'the routed pill is what a hand presses (elementFromPoint)', f);
  await press(f.l + f.w * 0.3, f.y); await page.mouse.move(f.l + f.w * 0.6, f.y, { steps: 4 }); await release();
  const base = await get(`({ widget: __C.W.rFreq.get(), base: __C.mod.baseOf('demo.freq') })`);
  L.ck(near(base.base, base.widget, 1e-6) && near(base.widget, logAt(0.6), 0.1), 'a hand on a routed pill moves the base, not the modulated value', base);
  await page.evaluate(() => { __C.mod.play(false); __C.mod.close(); return 0; });

  /* ── 6 · the static chip strip ── */
  const st = await get(`(() => { const e = __C.strip1.el, cs = getComputedStyle(e), c = e.querySelector('.mir-chip').getBoundingClientRect(); return { pos: cs.position, w: c.width, h: c.height, rail: e.classList.contains('mir-rail'), kinds: [...e.querySelectorAll('.mir-chip')].map((b) => b.dataset.kind) }; })()`);
  L.ck(st.pos === 'static' && st.rail && near(st.w, 44, 1) && near(st.h, 44, 1) && st.kinds.join() === 'grip,close', 'the strip is a static .mir-rail of 44 px chips (grip over ×)', st);
  const xb = await pt(`__C.strip1.chip('remove')`);
  L.ck(await hitIs(xb.x, xb.y, `__C.strip1.chip('remove')`), 'the × chip is what a hand presses (elementFromPoint)', xb);
  await page.mouse.click(xb.x, xb.y);
  const armed = await get(`({ armed: __C.strip1.chip('remove').classList.contains('armed'), text: __C.strip1.chip('remove').textContent, log: __C.log.slice() })`);
  L.ck(armed.armed && armed.text === 'sure?' && !armed.log.includes('remove'), 'the first tap on × only arms it ("sure?")', armed);
  await page.mouse.click(xb.x, xb.y);
  L.ck((await get('__C.log.filter((n) => n === "remove").length')) === 1 && !(await get(`__C.strip1.chip('remove').classList.contains('armed')`)), 'the second tap fires it, once', { log: await get('__C.log') });
  await page.mouse.click(xb.x, xb.y); await sleep(2900);
  L.ck(!(await get(`__C.strip1.chip('remove').classList.contains('armed')`)), 'an armed × disarms by itself after 2.6 s', {});

  /* ── 7 · the sortable list ── */
  const ids = () => get('__C.list.items().map((x) => x.id)');
  const domIds = () => get(`[...__C.list.rows.children].map((r) => +r.dataset.id)`);
  L.ck(JSON.stringify(await ids()) === '[1,2,3]', 'the list starts 1 2 3', await ids());
  const strip = (id) => `__C.list.stripOf(${id})`;
  let g1 = await pt(`${strip(1)}.grip`), p3 = await pt(`__C.list.nodeOf(3)`);
  L.ck(await hitIs(g1.x, g1.y, `${strip(1)}.grip`), 'the grip is what a hand presses (elementFromPoint)', g1);
  const sideOk = await get(`(() => { const s = __C.list.stripOf(1).el.getBoundingClientRect(), p = __C.list.nodeOf(1).getBoundingClientRect(); return s.left > p.left; })()`);
  L.ck(sideOk, 'on the right rack the chips sit to the right of the pane', {});
  await press(g1.x, g1.y); await page.mouse.move(g1.x, g1.y + 40, { steps: 4 }); await page.mouse.move(g1.x, p3.b + 6, { steps: 8 });
  await sleep(120);
  const live = await get(`[...__C.list.rows.children].map((r) => r.style.transform)`);
  const pre = await ids();
  await release();
  L.ck(live[0].startsWith('translateY(') && live[1].startsWith('translateY(-') && live[2].startsWith('translateY(-') && JSON.stringify(pre) === '[1,2,3]', 'while the grip is dragged the row follows the hand and the two it passes glide up out of its way (nothing is re-parented)', { live, pre });
  await sleep(150);
  L.ck(JSON.stringify(await ids()) === '[2,3,1]' && JSON.stringify(await domIds()) === '[2,3,1]' && (await get(`[...__C.list.rows.children].every((r) => !r.style.transform)`)), 'the drop commits the new order once and clears the transforms', { ids: await ids() });
  await get(`${strip(1)}.grip.focus()`);
  await page.keyboard.press('ArrowUp');
  L.ck(JSON.stringify(await ids()) === '[2,1,3]' && JSON.stringify(await domIds()) === '[2,1,3]' && (await get(`document.activeElement === ${strip(1)}.grip`)), 'ArrowUp on a grip moves the item up and keeps the focus', { ids: await ids() });
  await page.keyboard.press('Home');
  L.ck(JSON.stringify(await ids()) === '[1,2,3]', 'Home on a grip moves the item first', await ids());
  /* Escape mid-drag puts the order back */
  g1 = await pt(`${strip(1)}.grip`); p3 = await pt(`__C.list.nodeOf(3)`);
  await press(g1.x, g1.y); await page.mouse.move(g1.x, p3.b + 6, { steps: 8 }); await page.keyboard.press('Escape'); await release(); await sleep(60);
  L.ck(JSON.stringify(await ids()) === '[1,2,3]' && JSON.stringify(await domIds()) === '[1,2,3]', 'Escape mid-drag puts the list back', { ids: await ids(), dom: await domIds() });

  let x2 = await pt(`${strip(2)}.chip('remove')`);
  L.ck(await hitIs(x2.x, x2.y, `${strip(2)}.chip('remove')`), 'the × of an item is what a hand presses (elementFromPoint)', x2);
  await page.mouse.click(x2.x, x2.y);
  L.ck((await get('__C.list.count()')) === 3 && (await get(`${strip(2)}.chip('remove').classList.contains('armed')`)), 'the first tap on an item\'s × arms it and removes nothing', { n: await get('__C.list.count()') });
  await page.mouse.click(x2.x, x2.y);
  L.ck(JSON.stringify(await ids()) === '[1,3]' && JSON.stringify(await domIds()) === '[1,3]', 'the second tap removes the item', await ids());

  let add = await pt(`__C.list.root.querySelector('.mir-list-add')`);
  L.ck(await hitIs(add.x, add.y, `__C.list.root.querySelector('.mir-list-add')`), '+ ADD is what a hand presses at the foot (elementFromPoint)', add);
  const addAt = () => pt(`__C.list.root.querySelector('.mir-list-add')`);
  for (let i = 0; i < 3; i++) { add = await addAt(); await page.mouse.click(add.x, add.y); await sleep(40); }
  const capped = await get(`(() => { const b = __C.list.root.querySelector('.mir-list-add'); return { n: __C.list.count(), disabled: b.disabled, dim: +getComputedStyle(b).opacity, full: __C.list.root.dataset.full }; })()`);
  L.ck(capped.n === 5 && capped.disabled && capped.dim < 0.6 && capped.full === 'true', '+ ADD adds up to the cap and dims there', capped);
  add = await addAt(); await page.mouse.click(add.x, add.y); await sleep(40);
  L.ck((await get('__C.list.count()')) === 5, 'a press on the dimmed + ADD adds nothing', { n: await get('__C.list.count()') });
  await page.evaluate(() => { __C.list.setItems([__C.list.items()[0]]); return 0; });
  const last = await get(`(() => { const x = __C.list.stripOf(__C.list.items()[0].id).chip('remove'); return { disabled: x.disabled, removed: __C.list.remove(__C.list.items()[0].id), n: __C.list.count() }; })()`);
  L.ck(last.disabled && last.removed === false && last.n === 1, 'the last item cannot be removed (the × is disabled)', last);
  await page.evaluate(() => { __C.list.root.dataset.side = 'left'; return 0; });
  const flip = await get(`(() => { const s = __C.list.stripOf(__C.list.items()[0].id).el.getBoundingClientRect(), p = __C.list.nodeOf(__C.list.items()[0].id).getBoundingClientRect(); return s.right <= p.left + 1; })()`);
  L.ck(flip, 'on the left rack the chips mirror to the left of the pane', {});

  /* BASINS parity, round seven (BASINS' COLOUR window, measured on it 2026-10-06): a stepper in an item's pane is BASINS' blend; + ADD
     is in the look's corner with the pane's shadow and wears the pane's material under TINTED and FROST; the rows stand 5 + 7 px above it */
  await page.evaluate(async () => {
    if (!document.querySelector('link[href$="controls/controls.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '../mir/controls/controls.css'; await new Promise((r) => { l.onload = r; l.onerror = r; document.head.prepend(l); }); }   // the stepper's own sheet, as BASINS links it
    const { stepper } = await import('../mir/controls/stepper.js'); const pane = __C.list.nodeOf(__C.list.items()[0].id);
    __C.blend = stepper({ aria: 'Blend', cls: 'blend', items: [{ id: 'normal', label: 'NORMAL' }, { id: 'add', label: 'ADD' }, { id: 'screen', label: 'SCREEN' }], value: 'normal', onChange: (v) => { __C.blendSeen = v; } });
    __C.blend.root.style.gridColumn = '1 / -1'; pane.appendChild(__C.blend.root); return 0; });   // the lane's grid seats it across (BASINS: 150 px)
  await sleep(80);
  const face = await get(`(() => { const r = __C.blend.root, cs = (n) => getComputedStyle(n), name = r.querySelector('.mir-step-name'), b = r.querySelector('.mir-step-b'), row = r.querySelector('.mir-step-row');
    const add = __C.list.root.querySelector('.mir-list-add'), rows = __C.list.root.querySelector('.mir-list-rows').getBoundingClientRect(), addrow = __C.list.root.querySelector('.mir-list-addrow').getBoundingClientRect();
    return { nameSize: cs(name).fontSize, nameInk: cs(name).color, nameMinH: cs(name).minHeight, bRadius: cs(b).borderRadius, bGlyph: cs(b).fontSize, bW: cs(b).width, bH: cs(b).height, stepB: cs(r).getPropertyValue('--step-b').trim(), row: cs(row).display + ' ' + cs(row).justifyContent + ' ' + cs(row).columnGap,
      addRadius: cs(add).borderRadius, surfaceRadius: cs(document.body).getPropertyValue('--surface-radius').trim() || cs(document.body).getPropertyValue('--card-r').trim(), addShadow: cs(add).boxShadow, foot: Math.round(addrow.top - rows.bottom) }; })()`);
  L.ck(face.nameSize === '8px' && face.nameMinH === '0px' && face.bRadius === '3px' && face.bGlyph === '22px' && face.bW === face.bH && face.row === 'flex space-between 2px',
    'a stepper in a pane is BASINS\' blend: an 8 px name, square arrows (the touch seat) in the 3 px corner with a 22 px glyph, the row across the pane', face);
  L.ck(face.addRadius === face.surfaceRadius && face.foot === 12, '+ ADD is in the look\'s corner, 12 px under the rows (5 + 7)', face);
  const tintedAdd = await get(`(() => { const b = document.body, was = [b.dataset.card, b.className]; const add = __C.list.root.querySelector('.mir-list-add'), out = {};
    b.dataset.card = 'tinted'; b.classList.remove('frost'); out.tinted = getComputedStyle(add).backgroundColor;
    b.classList.add('frost'); b.classList.remove('frost-hold'); out.frost = getComputedStyle(add).backgroundColor; out.frostFilter = getComputedStyle(add).backdropFilter;
    b.classList.add('frost-hold'); out.holdFilter = getComputedStyle(add).backdropFilter;
    b.dataset.card = was[0]; b.className = was[1]; return out; })()`);
  const alpha = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); const v = m ? m[1].split(',').map(Number) : []; return v.length === 4 ? v[3] : 1; };
  L.ck(Math.abs(alpha(tintedAdd.tinted) - 0.84) < 0.03 && Math.abs(alpha(tintedAdd.frost) - 0.58) < 0.01 && /blur/.test(tintedAdd.frostFilter) && tintedAdd.holdFilter === 'none',
    '+ ADD wears the pane\'s material: the TINTED fill (.84), thinner under FROST (.58) with FROST\'s filter, none while frost holds', tintedAdd);
  const nb = await pt(`__C.blend.root.querySelectorAll('.mir-step-b')[1]`);
  L.ck(await hitIs(nb.x, nb.y, `__C.blend.root.querySelectorAll('.mir-step-b')[1]`), 'the pane stepper\'s › is what a hand presses (elementFromPoint)', nb);
  await page.mouse.click(nb.x, nb.y); await sleep(60);
  L.ck((await get('__C.blendSeen')) === 'add', 'a press on › steps the blend', await get('__C.blendSeen'));

  /* every press was a hit test */
  const bad = presses().filter((p) => /nothing|body$|html$/.test(p.at));
  L.ck(bad.length === 0, 'every mouse press landed on a control (the rig hit-tests each one)', bad.slice(0, 3));
  L.ck(errors().length === 0, 'no uncaught page errors', errors());
} finally { await close(); }
const out = L.finish();
if (out.pass !== out.total) process.exit(1);
