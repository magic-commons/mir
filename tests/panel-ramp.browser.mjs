// The ramp editor in a real browser (gallery/panel-ramp.html), with real input through CDP, every press hit-tested with elementFromPoint: a CYCLIC ramp (λWAVES' words,
// a seam, a ring) and a LINEAR one (EARTH-like words, its own presets, no seam): the preset stepper loads a ramp and the app is handed its lookup table; a click on the strip
// adds a stop that takes the ramp's own colour there (the table does not move); a handle drags (the table changes, the stop keeps its identity past another); a handle dragged
// off the strip is removed on release (Escape puts it back); the selected stop's swatch turns its hue; the × is armed (two taps) and disabled at two stops; the keys move a
// handle; a gesture is one history row; the seam reads warn when the wrap is broken; a linear ramp holds its end colours.
// MIR_BASE=http://127.0.0.1:8864/ node tests/panel-ramp.browser.mjs
import { openTimeline, ledger } from './timeline-rig.mjs';
import { sleep } from '../tools/cdp.mjs';

const { page, errors, presses, close } = await openTimeline({ page: 'gallery/panel-ramp.html', query: '', width: 1400, height: 1000 });
const L = ledger('panel-ramp');
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const pt = (code) => page.evaluate(`() => { const n = ${code}; if (!n) return null; const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, l: r.left, t: r.top, b: r.bottom, r: r.right }; }`);
const get = (code) => page.evaluate(`() => ${code}`);
const hitIs = (x, y, code) => page.evaluate(`(a) => { const n = document.elementFromPoint(a[0], a[1]); const t = ${code}; return !!n && !!t && (n === t || t.contains(n)); }`, [x, y]);
const press = async (x, y, { mods = [] } = {}) => { await sleep(340); for (const m of mods) await page.keyboard.down(m); await page.mouse.move(x, y); await page.mouse.down(); };
const release = async () => { await page.mouse.up(); await sleep(80); };
const V = (n) => `__R.panels.${n}.view`;
const H = (n, i) => `${V(n)}.handle(${i})`;
const n = (name) => get(`${V(name)}.stops().length`);
const lutOf = (name) => get(`Array.from(${V(name)}.toLUT(256))`);
const lutDiff = (a, b) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);

try {
  /* ── 0 · two ramps on two cards, one cyclic and one linear ── */
  const shape = await get(`({ phase: [${V('phase')}.root.dataset.cyclic, ${V('phase')}.stops().length, !!${V('phase')}.root.querySelector('.mir-ramp-ring'), !!${V('phase')}.root.querySelector('.mir-ramp-seam')],
    cmap: [${V('cmap')}.root.dataset.cyclic, ${V('cmap')}.stops().length, !!${V('cmap')}.root.querySelector('.mir-ramp-ring'), !!${V('cmap')}.root.querySelector('.mir-ramp-seam')],
    ticks: [...${V('phase')}.root.querySelectorAll('.mir-ramp-tick')].map((t) => t.textContent), ticks2: [...${V('cmap')}.root.querySelectorAll('.mir-ramp-tick')].map((t) => t.textContent) })`);
  L.ck(shape.phase[0] === 'true' && shape.phase[1] === 6 && shape.phase[2] && shape.phase[3] && shape.cmap[0] === 'false' && shape.cmap[1] === 5 && !shape.cmap[2] && !shape.cmap[3],
    'a cyclic ramp has its seam reading and its ring; a linear one has neither (6 stops of prism, 5 of ocean)', shape);
  L.ck(shape.ticks.join() === '−π,−π/2,0,+π/2,+π' && shape.ticks2.join() === '−2 °C,14,30 °C', 'the labels are the app’s: λWAVES’ −π … +π, EARTH-like °C', shape);
  const lut0 = await lutOf('phase');
  const fed = await get(`(() => { const n0 = 0; return 1; })()`);
  void fed;

  /* the app is handed the table: patch the port's lut hook to count */
  await page.evaluate(() => { const p = __R.ports.phase, o = p.lut; window.__nl = 0; window.__n = 0; p.lut = (l, n) => { window.__nl++; window.__n = n; o(l, n); }; return 0; });

  /* ── 1 · the preset stepper loads a ramp and the app is handed its table ── */
  const next = `${V('phase')}.root.querySelector('.mir-step-b[data-step="1"]')`;
  let nb = await pt(next);
  L.ck(await hitIs(nb.x, nb.y, next), 'the stepper’s › is what a hand presses (elementFromPoint)', nb);
  await sleep(340); await page.mouse.click(nb.x, nb.y); await sleep(200);
  const p1 = await get(`({ preset: __R.ports.phase.get().preset, id: ${V('phase')}.presetId(), n: ${V('phase')}.stops().length, calls: window.__nl, size: window.__n, name: ${V('phase')}.root.querySelector('.mir-step-text').textContent })`);
  const lut1 = await lutOf('phase');
  L.ck(p1.preset !== 'prism' && p1.preset === p1.id && p1.calls >= 1 && p1.size === 256 && lutDiff(lut0, lut1) > 0.05, 'the next preset loads: the port is told its id and stops, and handed a 256-entry table that is not the old one', { p1, diff: lutDiff(lut0, lut1) });
  const pre = await get(`__R.ports.phase.get().stops.length`);
  L.ck(pre === (await n('phase')) && await get(`${V('phase')}.root.querySelectorAll('.mir-ramp-stop').length`) === pre, 'one handle per stop', { pre });
  await get(`${V('phase')}.preset('prism')`); await sleep(100);

  /* ── 2 · a click on the strip adds a stop with the ramp’s own colour: the table does not move ── */
  const base = await lutOf('phase'), n0 = await n('phase');
  const strip = `${V('phase')}.strip`;
  let st = await pt(strip);
  const px = st.l + st.w * 0.62, py = st.b - 6;
  L.ck(await hitIs(px, py, strip), 'the strip itself (between handles) is what a hand presses to add a stop (elementFromPoint)', { px, py });
  await sleep(340); await page.mouse.click(px, py); await sleep(150);
  const lut2 = await lutOf('phase');
  L.ck((await n('phase')) === n0 + 1 && lutDiff(base, lut2) < 0.006, 'a click on the strip adds a stop, and it takes the ramp’s colour there so the table is unmoved (to about one 8-bit step, 0.004: the gamut clamp)', { n: await n('phase'), diff: lutDiff(base, lut2) });
  L.ck((await get(`${V('phase')}.selected()`)) >= 0 && (await get(`${V('phase')}.root.querySelector('.mir-ramp-stop.sel') !== null`)), 'the new stop is the selected one', {});

  /* ── 3 · a handle drags; it keeps its identity past a neighbour; the table changes ── */
  const si = await get(`${V('phase')}.selected()`);
  let h = await pt(H('phase', si));
  L.ck(await hitIs(h.x, h.y, H('phase', si)), 'the handle is what a hand presses (elementFromPoint)', h);
  const at0 = await get(`${V('phase')}.stops()[${si}].at`);
  await press(h.x, h.y); await page.mouse.move(h.x - 30, h.y, { steps: 6 }); await page.mouse.move(h.x - 60, h.y, { steps: 6 }); await release();
  const at1 = await get(`(() => { const s = ${V('phase')}.stops(); return s[${V('phase')}.selected()].at; })()`);
  const lut3 = await lutOf('phase');
  L.ck(at1 < at0 - 0.2 && lutDiff(lut2, lut3) > 0.03, 'a drag along the strip moves the stop (here past a neighbour) and the table changes with it', { at0, at1, diff: lutDiff(lut2, lut3) });
  L.ck(near(at1, at0 - 60 / st.w, 0.04), 'by as much as the hand travelled', { want: at0 - 60 / st.w, at1 });

  /* ── 4 · dragged off the strip it is removed on release; Escape puts it back ── */
  const n1 = await n('phase'), si2 = await get(`${V('phase')}.selected()`);
  h = await pt(H('phase', si2)); st = await pt(strip);
  const stopsBefore = await get(`JSON.stringify(${V('phase')}.stops())`);
  await press(h.x, h.y); await page.mouse.move(h.x, h.y - 40, { steps: 3 }); await page.mouse.move(h.x, st.t - 80, { steps: 6 }); await sleep(80);
  const ghost = await get(`${V('phase')}.root.querySelector('.mir-ramp-stop[data-removing]') !== null`);
  await page.keyboard.press('Escape'); await release(); await sleep(100);
  L.ck(ghost && (await n('phase')) === n1 && (await get(`JSON.stringify(${V('phase')}.stops())`)) === stopsBefore, 'a handle pulled off the strip fades, and Escape puts it back exactly', { ghost });
  h = await pt(H('phase', si2));
  await press(h.x, h.y); await page.mouse.move(h.x, h.y - 40, { steps: 3 }); await page.mouse.move(h.x, st.t - 80, { steps: 6 }); await release(); await sleep(150);
  L.ck((await n('phase')) === n1 - 1, 'released off the strip, it is removed', { n: await n('phase') });

  /* ── 5 · the swatch turns the selected stop’s hue ── */
  h = await pt(H('phase', 2));
  await sleep(340); await page.mouse.click(h.x, h.y); await sleep(100);
  const swatchOf = `${V('phase')}.root.querySelector('.mir-ramp-swatch')`;
  const sw0 = await get(`JSON.stringify(${V('phase')}.root.querySelector('.mir-ramp-swatch input').value)`);
  const rgbBefore = await get(`${V('phase')}.stops()[${await get(`${V('phase')}.selected()`)}].rgb`);
  const sp = await pt(swatchOf);
  L.ck(await hitIs(sp.x, sp.y, swatchOf) && (await get(`document.elementFromPoint(${sp.x}, ${sp.y}).classList.contains('mir-swatch-pick')`)), 'the swatch (the selected stop’s colour) is what a hand presses (elementFromPoint)', sp);
  const lut4 = await lutOf('phase');
  await press(sp.x, sp.y); await page.mouse.move(sp.x, sp.y - 50, { steps: 6 }); await release();
  const rgbAfter = await get(`${V('phase')}.stops()[${await get(`${V('phase')}.selected()`)}].rgb`);
  L.ck(JSON.stringify(rgbBefore) !== JSON.stringify(rgbAfter) && lutDiff(lut4, await lutOf('phase')) > 0.02, 'a drag on the swatch turns the hue of the selected stop, and the table follows', { rgbBefore, rgbAfter, sw0 });

  /* ── 6 · the × is armed, and disabled at the fewest ── */
  const xb = `${V('phase')}.root.querySelector('.mir-ramp-remove .mir-chip')`;
  let xp = await pt(xb);
  const n2 = await n('phase');
  L.ck(await hitIs(xp.x, xp.y, xb), 'the × of the selected stop is what a hand presses (elementFromPoint)', xp);
  await sleep(340); await page.mouse.click(xp.x, xp.y); await sleep(80);
  const armed = await get(`({ n: ${V('phase')}.stops().length, armed: ${xb}.classList.contains('armed'), text: ${xb}.textContent })`);
  L.ck(armed.n === n2 && armed.armed && armed.text === 'sure?', 'the first tap arms it ("sure?"): no stop goes', armed);
  await page.mouse.click(xp.x, xp.y); await sleep(150);
  L.ck((await n('phase')) === n2 - 1, 'the second tap removes the selected stop', { n: await n('phase') });
  /* down to two */
  for (let i = 0; i < 6 && (await n('phase')) > 2; i++) { xp = await pt(xb); await sleep(340); await page.mouse.click(xp.x, xp.y); await sleep(40); await page.mouse.click(xp.x, xp.y); await sleep(120); }
  const two = await get(`({ n: ${V('phase')}.stops().length, disabled: ${xb}.disabled })`);
  L.ck(two.n === 2 && two.disabled, 'a ramp keeps two stops: the × is disabled there', two);
  for (let i = 0; i < 4; i++) { st = await pt(strip); await sleep(340); await page.mouse.click(st.l + st.w * (0.2 + 0.2 * i), st.b - 6); await sleep(60); }

  /* ── 7 · the keys move a handle; Delete is armed too ── */
  await get(`${H('phase', 0)}.focus()`);
  const k0 = await get(`${V('phase')}.stops()[${await get(`${V('phase')}.selected()`)}].at`);
  await page.keyboard.press('ArrowRight'); await sleep(60);
  const k1 = await get(`${V('phase')}.stops()[${await get(`${V('phase')}.selected()`)}].at`);
  L.ck(near(k1 - k0, 0.01, 0.002), 'ArrowRight on a focused handle moves it one hundredth', { k0, k1 });
  await page.keyboard.press('Shift+ArrowLeft'); await sleep(60);
  const k2 = await get(`${V('phase')}.stops()[${await get(`${V('phase')}.selected()`)}].at`);
  L.ck(near(k1 - k2, 0.01 / 8, 0.0008), 'Shift is an eighth of that', { k1, k2 });
  const n3 = await n('phase');
  await page.keyboard.press('Delete'); await sleep(60);
  L.ck((await n('phase')) === n3, 'Delete once only arms', {});
  await page.keyboard.press('Delete'); await sleep(120);
  L.ck((await n('phase')) === n3 - 1, 'Delete twice removes', { n: await n('phase') });

  /* ── 8 · the seam: closed reads ok, broken reads warn; the ring is drawn from the table ── */
  await get(`${V('phase')}.load([{ at: 0.01, rgb: [1, 1, 1] }, { at: 0.5, rgb: [1, 1, 1] }, { at: 0.99, rgb: [0, 0, 0] }])`); await sleep(100);
  const warn = await get(`({ cls: ${V('phase')}.root.querySelector('.mir-ramp-seam .ro-val').className, sub: ${V('phase')}.root.querySelector('.mir-ramp-seam .ro-sub').textContent, seam: ${V('phase')}.seam() })`);
  await get(`${V('phase')}.preset('prism')`); await sleep(100);
  const ok = await get(`({ cls: ${V('phase')}.root.querySelector('.mir-ramp-seam .ro-val').className, sub: ${V('phase')}.root.querySelector('.mir-ramp-seam .ro-sub').textContent, ring: getComputedStyle(${V('phase')}.root.querySelector('.mir-ramp-ring')).backgroundImage.slice(0, 22) })`);
  L.ck(/warn/.test(warn.cls) && /seam/.test(warn.sub) && /ok/.test(ok.cls) && /closes/.test(ok.sub) && ok.ring.startsWith('conic-gradient'), 'the seam reads warn for a ramp that does not close and ok for one that does; the ring is a conic of the table', { warn, ok });

  /* ── 9 · a linear ramp holds its end colours; its table is the app’s ── */
  await get(`${V('cmap')}.load([{ at: 0.3, rgb: [1, 0, 0] }, { at: 0.7, rgb: [0, 0, 1] }])`); await sleep(100);
  const lin = await get(`(() => { const l = ${V('cmap')}.toLUT(256); return { first: [l[0], l[1], l[2]], last: [l[255 * 4], l[255 * 4 + 1], l[255 * 4 + 2]] }; })()`);
  L.ck(near(lin.first[0], 1, 0.01) && near(lin.first[2], 0, 0.01) && near(lin.last[2], 1, 0.01) && near(lin.last[0], 0, 0.01), 'a linear ramp holds its first colour before the first stop and its last after the last', lin);

  /* ── 10 · a gesture is one history row; undo puts the ramp back ── */
  await page.evaluate(() => { __R.history.absorb(); return 0; });
  const hh = await get('__R.history.length'), before = await get(`JSON.stringify(${V('phase')}.part().capture().stops)`);
  h = await pt(H('phase', 1));
  await press(h.x, h.y); await page.mouse.move(h.x + 40, h.y, { steps: 5 }); await release(); await sleep(500);
  const row = await get(`({ n: __R.history.length, last: __R.history.entries().slice(-1)[0].label, dom: __R.history.entries().slice(-1)[0].domain })`);
  L.ck(row.n === hh + 1 && row.dom === 'phase' && /^Stop 2 of/.test(row.last), 'a handle drag is one history row, named for the handle it began on', { hh, row });
  await page.evaluate(() => { __R.history.undo(); return 0; }); await sleep(150);
  L.ck((await get(`JSON.stringify(${V('phase')}.part().capture().stops)`)) === before, 'undo puts every stop back', {});

  const bad = presses().filter((p) => /nothing|body$|html$/.test(p.at));
  L.ck(bad.length === 0, 'every mouse press landed on a control (the rig hit-tests each one)', bad.slice(0, 3));
  L.ck(errors().length === 0, 'no uncaught page errors', errors());
} finally { await close(); }
const out = L.finish();
if (out.pass !== out.total) process.exit(1);
