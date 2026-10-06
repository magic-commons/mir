// The lanes panel in a real browser (gallery/panel-lanes.html), with real input through CDP, every press hit-tested with elementFromPoint: three made-up lane sets
// (a BASINS-like colour list, an NEBULA-like AGE strip, an EARTH-like layer list) on one panel; + ADD adds a lane and its modulation targets; a lane reorders by a
// drag of its grip and by the arrow keys (rows down, strips across); the mute dot is the lane's own; the solo latches and restores exactly and a hold is a peek; the
// × needs two taps; a routed macro moves a principal slider (rows and strips) and a hand on it moves the base; on a coarse pointer the arcs and the blend sit behind the
// lane's fold; a gesture is one history row named for the control it began on.
// MIR_BASE=http://127.0.0.1:8864/ node tests/panel-lanes.browser.mjs
import { openTimeline, ledger } from './timeline-rig.mjs';
import { sleep } from '../tools/cdp.mjs';

const { page, cdp, errors, presses, close } = await openTimeline({ page: 'gallery/panel-lanes.html', query: '', width: 1500, height: 1700 });
const L = ledger('panel-lanes');
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const pt = (code) => page.evaluate(`() => { const n = ${code}; if (!n) return null; const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, l: r.left, t: r.top, b: r.bottom, r: r.right }; }`);
const get = (code) => page.evaluate(`() => ${code}`);
const hitIs = (x, y, code) => page.evaluate(`(a) => { const n = document.elementFromPoint(a[0], a[1]); const t = ${code}; return !!n && !!t && (n === t || t.contains(n)); }`, [x, y]);
const press = async (x, y, { mods = [] } = {}) => { await sleep(340); for (const m of mods) await page.keyboard.down(m); await page.mouse.move(x, y); await page.mouse.down(); };
const release = async (mods = []) => { await page.mouse.up(); for (const m of mods) await page.keyboard.up(m); await sleep(60); };
const click = async (code) => { const c = await pt(code); const ok = await hitIs(c.x, c.y, code); await sleep(340); await page.mouse.click(c.x, c.y); await sleep(60); return ok; };
const panel = (n) => `__L.panels.${n}.view`;
const lane = (n, id) => `${panel(n)}.laneRoot(${JSON.stringify(id)})`;
const ids = (n) => get(`__L.ports.${n}.list().map((r) => r.id)`);
const domIds = (n, sel) => get(`[...${panel(n)}.view.rows.children].map((r) => r.dataset.id)`);
const mod = (id) => get(`__L.mod.params().some((p) => p.id === ${JSON.stringify(id)})`);
const J = JSON.stringify;

try {
  /* ── 0 · the three lane sets, built from data alone ── */
  const shape = await get(`({ colour: [${panel('colour')}.layout, ${panel('colour')}.root.dataset.count], age: [${panel('age')}.layout, ${panel('age')}.root.dataset.count], layers: [${panel('layers')}.layout, ${panel('layers')}.root.dataset.count],
    lanes: document.querySelectorAll('.mir-lane-body').length })`);
  L.ck(J(shape.colour) === '["rows","3"]' && J(shape.age) === '["strips","6"]' && J(shape.layers) === '["rows","4"]' && shape.lanes === 13, 'one panel, three lane sets: rows of 3 colours, strips of 6 strata, rows of 4 layers (13 lanes in the DOM)', shape);
  const kinds = await get(`({ swatch: !!${lane('colour', 'c1')}.querySelector('.mir-swatch-seat'), hue: !!${lane('age', 'a1')}.querySelector('.k-arcknob.mir-lane-colour'), chip: !!${lane('layers', 'l1')}.querySelector('.mir-lane-chip'),
    v: ${lane('age', 'a1')}.querySelector('.mir-lane-principal').dataset.orient, h: ${lane('colour', 'c1')}.querySelector('.mir-lane-principal').dataset.orient, extras: ${lane('colour', 'c1')}.querySelectorAll('.mir-lane-extras .k-arcknob').length,
    blend: !!${lane('colour', 'c1')}.querySelector('.mir-step.mir-lane-blend'), mute: !!${lane('age', 'a1')}.querySelector('.sw.mir-lane-mute'), solo: !!${lane('layers', 'l1')}.querySelector('.trig.mir-lane-solo') })`);
  L.ck(kinds.swatch && kinds.hue && kinds.chip && kinds.v === 'v' && kinds.h === 'h' && kinds.extras === 2 && kinds.blend && kinds.mute && kinds.solo, 'each lane is built from the colour controls: a swatch, a hue arc or a display chip, a horizontal or vertical lane slider, two arcs, a blend stepper, a mute dot, a solo', kinds);
  L.ck(await mod('colour.c1.freq') && await mod('colour.c1.phase') && await mod('colour.c1.opacity') && await mod('age.a1.hue') && await mod('age.a1.gain') && await mod('layers.l1.opacity') && !(await mod('colour.c1.blend')),
    'every principal amount, arc and hue is a modulation target under <root>.<lane>.<key> (the blend is not)', await get('__L.mod.params().length'));

  /* ── 1 · + ADD adds a lane and its targets; it dims at the cap ── */
  let add = await pt(`${panel('colour')}.root.querySelector('.mir-list-add')`);
  L.ck(await hitIs(add.x, add.y, `${panel('colour')}.root.querySelector('.mir-list-add')`), '+ ADD is what a hand presses at the foot of the colour list (elementFromPoint)', add);
  await sleep(340); await page.mouse.click(add.x, add.y); await sleep(120);
  const added = await get(`({ n: __L.ports.colour.list().length, dom: ${panel('colour')}.view.count(), lane: !!${panel('colour')}.laneRoot('c4'), t: __L.mod.params().some((p) => p.id === 'colour.c4.freq') })`);
  L.ck(added.n === 4 && added.dom === 4 && added.lane && added.t, '+ ADD asks the port for a lane, builds it and adds its modulation targets', added);
  for (let i = 0; i < 2; i++) { add = await pt(`${panel('colour')}.root.querySelector('.mir-list-add')`); await sleep(340); await page.mouse.click(add.x, add.y); await sleep(100); }
  const full = await get(`(() => { const b = ${panel('colour')}.root.querySelector('.mir-list-add'); return { n: __L.ports.colour.list().length, disabled: b.disabled, dim: +getComputedStyle(b).opacity }; })()`);
  L.ck(full.n === 6 && full.disabled && full.dim < 0.6, '+ ADD dims at the cap (6) and adds nothing more', full);

  /* ── 2 · reorder by a drag of the grip (rows) and by the arrow keys ── */
  const grip = (n, id) => `${panel(n)}.view.stripOf(${J(id)}).grip`;
  let g1 = await pt(grip('colour', 'c1')), p3 = await pt(`${panel('colour')}.view.nodeOf('c3')`);
  L.ck(await hitIs(g1.x, g1.y, grip('colour', 'c1')), 'the grip is what a hand presses on a colour lane (elementFromPoint)', g1);
  await press(g1.x, g1.y); await page.mouse.move(g1.x, g1.y + 40, { steps: 4 }); await page.mouse.move(g1.x, p3.b + 8, { steps: 8 }); await sleep(120);
  const mid = await get(`${panel('colour')}.view.rows.children[0].style.transform`);
  await release(); await sleep(200);
  L.ck(mid.startsWith('translateY(') && (await ids('colour')).slice(0, 3).join() === 'c2,c3,c1' && (await domIds('colour')).slice(0, 3).join() === 'c2,c3,c1', 'a drag of c1’s grip past c3 moves the row live and the drop commits the port’s order once', { mid, ids: await ids('colour') });
  await get(`${grip('colour', 'c1')}.focus()`);
  await page.keyboard.press('ArrowUp'); await sleep(80);
  L.ck((await ids('colour')).slice(0, 3).join() === 'c2,c1,c3' && (await get(`document.activeElement === ${grip('colour', 'c1')}`)), 'ArrowUp on a grip moves the lane up in the port and keeps the focus', await ids('colour'));
  await page.keyboard.press('Home'); await sleep(80);
  L.ck((await ids('colour'))[0] === 'c1', 'Home sends it first', await ids('colour'));
  const tgt = await get(`__L.mod.params().find((p) => p.id === 'colour.c1.freq').label`);
  L.ck(/COLOUR 1 · FREQ/.test(tgt), 'the modulation window’s name for a lane follows its place after a move (routes kept)', tgt);

  /* ── 3 · strips reorder across, by a drag and by the arrows ── */
  const sg = (id) => grip('age', id);
  let a1 = await pt(sg('a1')), a3 = await pt(`${panel('age')}.view.nodeOf('a3')`);
  L.ck(await hitIs(a1.x, a1.y, sg('a1')), 'the grip under a strip is what a hand presses (elementFromPoint)', a1);
  await press(a1.x, a1.y); await page.mouse.move(a1.x + 20, a1.y, { steps: 4 }); await page.mouse.move(a3.r + 4, a1.y, { steps: 8 }); await sleep(120);
  const midX = await get(`${panel('age')}.view.rows.children[0].style.transform`);
  await release(); await sleep(200);
  L.ck(midX.startsWith('translateX(') && (await ids('age')).slice(0, 3).join() === 'a2,a3,a1', 'a drag of a strip’s grip along x moves it live and the drop commits the order', { midX, ids: await ids('age') });
  await get(`${sg('a1')}.focus()`); await page.keyboard.press('ArrowLeft'); await sleep(80);
  L.ck((await ids('age')).slice(0, 3).join() === 'a2,a1,a3', 'ArrowLeft on a strip’s grip moves it left', await ids('age'));
  await page.keyboard.press('Home'); await sleep(80);

  /* ── 4 · the mute dot is the lane’s own ── */
  const dot = (n, id) => `${lane(n, id)}.querySelector('.mir-lane-mute')`;
  let d = await pt(dot('layers', 'l1'));
  L.ck(await hitIs(d.x, d.y, dot('layers', 'l1')), 'the mute dot is what a hand presses on a layer (elementFromPoint)', d);
  const lit0 = await get(`getComputedStyle(${dot('layers', 'l1')}.querySelector('.sw-led')).backgroundColor`);
  await click(dot('layers', 'l1'));
  const m1 = await get(`({ muted: __L.ports.layers.get('l1', 'mute'), attr: ${lane('layers', 'l1')}.hasAttribute('data-muted'), on: ${dot('layers', 'l1')}.classList.contains('on'), led: getComputedStyle(${dot('layers', 'l1')}.querySelector('.sw-led')).backgroundColor })`);
  L.ck(m1.muted === true && m1.attr && !m1.on && m1.led !== lit0 && /rgba\(0, 0, 0, 0\)|transparent/.test(m1.led), 'a press on the dot mutes the lane in the port; the dot goes hollow and the lane wears the faint ink', { lit0, m1 });
  await click(dot('layers', 'l1'));
  L.ck((await get(`__L.ports.layers.get('l1', 'mute')`)) === false && (await get(`${dot('layers', 'l1')}.classList.contains('on')`)), 'a second press brings it back', {});
  const ageDot = await click(dot('age', 'a2'));
  L.ck(ageDot && (await get(`__L.ports.age.get('a2', 'mute')`)) === true, 'a strip’s mute dot works the same', {});
  await click(dot('age', 'a2'));

  /* ── 5 · SOLEIL’s solo: a click latches and restores exactly; a hold is a peek ── */
  const solo = (id) => `${lane('layers', id)}.querySelector('.mir-lane-solo')`;
  await get(`__L.ports.layers.set('l3', 'mute', true)`);                                    // l3 was muted by the user before any solo
  await sleep(80);
  const mutes = () => get(`__L.ports.layers.list().map((r) => (__L.ports.layers.get(r.id, 'mute') ? 1 : 0)).join('')`);
  const before = await mutes();
  let s2 = await pt(solo('l2'));
  L.ck(await hitIs(s2.x, s2.y, solo('l2')) && before === '0010', 'the S is what a hand presses on a layer; l3 is muted before the solo', { before });
  await click(solo('l2'));
  L.ck((await mutes()) === '1011' && (await get(`${panel('layers')}.soloOf()`)) === 'l2' && (await get(`${solo('l2')}.classList.contains('on')`)), 'a click latches: l2 alone, the rest muted, the S lit', { m: await mutes() });
  await click(solo('l4'));
  L.ck((await mutes()) === '1110' && (await get(`${panel('layers')}.soloOf()`)) === 'l4', 'another S moves the latch', { m: await mutes() });
  await click(solo('l4'));
  L.ck((await mutes()) === before && (await get(`${panel('layers')}.soloOf()`)) === null && !(await get(`${solo('l4')}.classList.contains('on')`)), 'the same S again lifts it and every lane is exactly as it was (l3 stays muted)', { m: await mutes(), before });
  s2 = await pt(solo('l2'));
  await press(s2.x, s2.y); await sleep(450);
  const peek = await get(`({ m: __L.ports.layers.list().map((r) => (__L.ports.layers.get(r.id, 'mute') ? 1 : 0)).join(''), latched: ${panel('layers')}.soloOf(), peeking: ${panel('layers')}.peeking(), mark: ${solo('l2')}.hasAttribute('data-peek') })`);
  await release(); await sleep(120);
  L.ck(peek.m === '1011' && peek.latched === null && peek.peeking && peek.mark, 'a hold of a quarter second is a peek: the lane alone while the finger is down, never a state', peek);
  L.ck((await mutes()) === before && !(await get(`${panel('layers')}.peeking()`)) && (await get(`${panel('layers')}.soloOf()`)) === null, 'and on lift exactly what was on comes back (and the click that ends a hold latches nothing)', { m: await mutes() });
  await get(`__L.ports.layers.set('l3', 'mute', false)`);

  /* ── 6 · the × needs two taps ── */
  const x1 = (n, id) => `${panel(n)}.view.stripOf(${J(id)}).chip('remove')`;
  const nBefore = (await ids('colour')).length;
  let xb = await pt(x1('colour', 'c2'));
  L.ck(await hitIs(xb.x, xb.y, x1('colour', 'c2')), 'the × of a lane is what a hand presses (elementFromPoint)', xb);
  await sleep(340); await page.mouse.click(xb.x, xb.y); await sleep(60);
  const armed = await get(`({ n: __L.ports.colour.list().length, armed: ${x1('colour', 'c2')}.classList.contains('armed'), text: ${x1('colour', 'c2')}.textContent })`);
  L.ck(armed.n === nBefore && armed.armed && armed.text === 'sure?', 'the first tap on × only arms it ("sure?"): nothing is removed', armed);
  await page.mouse.click(xb.x, xb.y); await sleep(150);
  const gone = await get(`({ n: __L.ports.colour.list().length, ids: __L.ports.colour.list().map((r) => r.id).join(), t: __L.mod.params().some((p) => p.id === 'colour.c2.freq'), dom: !!document.querySelector('[data-id="c2"]') })`);
  L.ck(gone.n === nBefore - 1 && !gone.ids.includes('c2') && !gone.t && !gone.dom, 'the second tap removes the lane from the port, the list and the modulation window’s targets', gone);
  await sleep(2800);

  /* ── 7 · a routed macro moves a principal slider; a hand on it moves the base ── */
  await page.evaluate(() => { __L.mod.open(); return 0; }); await sleep(500);
  await page.evaluate(() => { __L.mod.route('lfo', 'colour.c1.freq', 0.4); __L.mod.route('lfo', 'age.a1.gain', 0.4); __L.mod.setPower && __L.mod.setPower(true); __L.mod.play(true); return 0; });
  await sleep(300);
  const seen = { h: new Set(), v: new Set(), dot: new Set() };
  for (let i = 0; i < 18; i++) {
    const s = await get(`({ h: ${lane('colour', 'c1')}.querySelector('.mir-lane-principal').style.getPropertyValue('--fill'), v: ${lane('age', 'a1')}.querySelector('.mir-lane-principal').style.getPropertyValue('--fill') })`);
    seen.h.add(s.h); seen.v.add(s.v); await sleep(90);
  }
  const routed = await get(`({ h: ${lane('colour', 'c1')}.querySelector('.mir-lane-principal').classList.contains('mod-held'), v: ${lane('age', 'a1')}.querySelector('.mir-lane-principal').classList.contains('mod-held'),
    range: !!${lane('colour', 'c1')}.querySelector('.mir-lane-principal .m2fdrange'), rangeV: !!${lane('age', 'a1')}.querySelector('.mir-lane-principal .m2fdrange') })`);
  L.ck(routed.h && routed.v && seen.h.size >= 4 && seen.v.size >= 4, 'a macro routed onto a lane’s principal slider moves its thumb (a horizontal pill on a row, a vertical one on a strip)', { h: seen.h.size, v: seen.v.size, routed });
  L.ck(routed.range && routed.rangeV, 'and the modulation window’s RANGE bar draws along it in both layouts', routed);
  await page.evaluate(() => { __L.mod.close(); return 0; }); await sleep(300);
  const f = await pt(`${lane('colour', 'c1')}.querySelector('.mir-lane-principal')`);
  L.ck(await hitIs(f.x, f.y, `${lane('colour', 'c1')}.querySelector('.mir-lane-principal')`), 'the routed pill is what a hand presses (elementFromPoint)', f);
  await press(f.l + f.w * 0.3, f.y); await page.mouse.move(f.l + f.w * 0.6, f.y, { steps: 4 }); await release();
  const base = await get(`({ widget: ${panel('colour')}.lane('c1').principal.get(), base: __L.mod.baseOf('colour.c1.freq'), port: __L.ports.colour.get('c1', 'freq') })`);
  L.ck(near(base.base, base.widget, 1e-6) && base.widget > 0.5, 'a hand on a routed pill writes the base (the registry’s), not the modulated value', base);
  await page.evaluate(() => { __L.mod.play(false); return 0; });

  /* ── 8 · a gesture is one history row named for the control and the window ── */
  const h0 = await get('__L.history.length');
  await page.evaluate(() => { __L.history.absorb(); return 0; });
  const op = await pt(`${lane('colour', 'c3')}.querySelectorAll('.mir-lane-extras .k-arcknob .k-dial')[1]`);
  const v0 = await get(`__L.ports.colour.get('c3', 'opacity')`);
  await press(op.x, op.y); await page.mouse.move(op.x, op.y + 40, { steps: 6 }); await release(); await sleep(500);
  const rows = await get(`({ n: __L.history.length, last: __L.history.entries().slice(-1)[0].label, dom: __L.history.entries().slice(-1)[0].domain })`);
  L.ck(rows.n === h0 + 1 && /^OPACITY · colour 3/.test(rows.last) && rows.dom === 'colour', 'a drag on a lane’s arc is one history row named CONTROL · WINDOW', { h0, rows });
  await page.evaluate(() => { __L.history.undo(); return 0; }); await sleep(120);
  L.ck(near(await get(`__L.ports.colour.get('c3', 'opacity')`), v0, 1e-9) && near(await get(`${panel('colour')}.lane('c3').extras.opacity.get()`), v0, 1e-9), 'undo puts the value back in the port and on the arc', { v0 });

  /* ── 9 · touch protection: on a coarse pointer the arcs and the blend sit behind the lane’s fold ── */
  const vis = (code) => get(`(() => { const n = ${code}; return !!n && n.getClientRects().length > 0; })()`);
  L.ck(await vis(`${lane('colour', 'c1')}.querySelector('.mir-lane-extras')`) && !(await vis(`${lane('colour', 'c1')}.querySelector('.mir-lane-fold')`)), 'on a fine pointer the arcs are in the open and there is no fold', {});
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });   // headless Chromium: touch emulation is what makes (pointer: coarse) true
  await sleep(300);
  const folded = await get(`({ fold: ${panel('colour')}.root.dataset.fold, extras: ${lane('colour', 'c1')}.querySelector('.mir-lane-extras').getClientRects().length, blend: ${lane('colour', 'c1')}.querySelector('.mir-lane-blend').getClientRects().length })`);
  L.ck(folded.fold === 'on' && folded.extras === 0 && folded.blend === 0, 'a coarse pointer folds each lane: the arcs and the blend are out of reach', folded);
  const fb = await pt(`${lane('colour', 'c1')}.querySelector('.mir-lane-fold')`);
  L.ck(await hitIs(fb.x, fb.y, `${lane('colour', 'c1')}.querySelector('.mir-lane-fold')`) && fb.w >= 44 && fb.h >= 44, 'the fold is a 44 px target a finger can hit (elementFromPoint)', fb);
  await sleep(340); await page.mouse.click(fb.x, fb.y); await sleep(120);
  const opened = await get(`({ extras: ${lane('colour', 'c1')}.querySelector('.mir-lane-extras').getClientRects().length, exp: ${lane('colour', 'c1')}.querySelector('.mir-lane-fold').getAttribute('aria-expanded') })`);
  L.ck(opened.extras > 0 && opened.exp === 'true', 'a tap on the fold opens that lane (and only that lane)', opened);
  L.ck((await get(`${lane('colour', 'c3')}.querySelector('.mir-lane-extras').getClientRects().length`)) === 0, 'the other lanes stay folded', {});
  await sleep(340); await page.mouse.click(fb.x, fb.y); await sleep(100);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await sleep(250);
  L.ck((await get(`${panel('colour')}.root.dataset.fold`)) === 'off', 'and the fold goes away again on a fine pointer', {});

  /* every press was a hit test */
  const bad = presses().filter((p) => /nothing|body$|html$/.test(p.at));
  L.ck(bad.length === 0, 'every mouse press landed on a control (the rig hit-tests each one)', bad.slice(0, 3));
  L.ck(errors().length === 0, 'no uncaught page errors', errors());
} finally { await close(); }
const out = L.finish();
if (out.pass !== out.total) process.exit(1);
