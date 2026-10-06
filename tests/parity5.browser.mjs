/* parity5.browser.mjs — BASINS parity, round five (tests/fixtures/parity5.html: the kit's TIMELINE with the shared transport in
 * its work lane, under the look store).  Each check is one gap of the round, measured in a real browser:
 *   1. FROST is the recipe's White Text: the look store's fresh TEXT is LIGHT, and data-text stays light in both modes
 *   2. the rail's grip draws BASINS' dots (`.kwin-grip-dots > i`, nine 2 px dots) in the chip ink with its one-pixel lift, and the
 *      grip is what elementFromPoint finds at its centre
 *   3. createAccent({ model: 'hsl' }): at A = 180°, VIVID 1, the accent is hsl(180 100% 64%) (BASINS), where the palette model's
 *      is not; BRIGHTNESS mixes toward white in OKLCH; the palette model is unchanged
 *   4. a transport in a work bar OUTSIDE the modulation window: the pane's fill by card style (TINTED .58, REFRACTIVE clear),
 *      the pane's shadow, the Hz reading's .82 ink
 *   5. CONTROL FACES · GLASS clears a pill trigger, a segment well and a switch under FROST, in a card
 * Standalone: MIR_BASE=http://127.0.0.1:8881 node tests/parity5.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8881';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1440, height: 900 });
try {
  await p.goto(BASE + '/tests/fixtures/parity5.html', 800);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  const J = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${body} })().then(JSON.stringify)`));

  /* ── 1. FROST's White Text ── */
  let r = await J(`const a = { fresh: T.P.get('text'), dark: document.body.dataset.text }; T.P.set('theme', 'light'); T.P.apply({ now: true }); await wait(150); a.light = document.body.dataset.text; T.P.set('theme', 'dark'); T.P.apply({ now: true }); return a;`);
  check('FROST: a fresh store is TEXT LIGHT (the recipe\'s White Text), and the ink stays white in the light theme too', r.fresh === 'light' && r.dark === 'light' && r.light === 'light', JSON.stringify(r));

  /* ── 2. the grip's dots ── */
  await p.eval(`__T.tl.win.open(); 0`); await sleep(900);
  r = await J(`const g = T.tl.win.rail.grip, dots = [...g.querySelectorAll('.kwin-grip-dots > i')], d = g.querySelector('.kwin-grip-dots'), c = getComputedStyle(d), i = getComputedStyle(dots[0]);
    const b = g.getBoundingClientRect(), x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2), f = document.elementFromPoint(x, y);
    const chip = getComputedStyle(g).getPropertyValue('--ink-key');
    return { n: dots.length, w: i.width, h: i.height, round: i.borderTopLeftRadius, color: c.color, filter: c.filter, hit: !!f && (f === g || g.contains(f)), mir: d.classList.contains('mir-grip-dots') };`);
  check('the grip draws BASINS\' dots: nine 2 px round dots under .kwin-grip-dots, hit-tested at the grip\'s centre', r.n === 9 && r.w === '2px' && r.h === '2px' && r.round === '50%' && r.hit && r.mir, JSON.stringify(r));
  check('the dots wear the chip ink and its one-pixel lift (drop-shadow 0 1px 0)', /drop-shadow/.test(r.filter) && /0px 1px 0px/.test(r.filter) && r.color !== 'rgba(0, 0, 0, 0)', JSON.stringify({ filter: r.filter, color: r.color }));

  /* ── 3. the HSL accent model ── */
  r = await J(`const probe = () => { const i = document.createElement('i'); i.style.color = 'var(--acc)'; document.body.appendChild(i); const c = getComputedStyle(i).color; i.remove(); return c; };
    const pal = T.createAccent({ a: 180, b: 20, vivid: 1 }); pal.apply(); const palette = probe();
    const acc = T.createAccent({ model: 'hsl', a: 180, b: 20, vivid: 1 }); acc.apply(); const st = document.body.style;
    const hsl = { color: probe(), hue: st.getPropertyValue('--hue-acc'), sat: st.getPropertyValue('--sat-acc'), lum: st.getPropertyValue('--lum-acc'), hueB: st.getPropertyValue('--hue-acc2'), bright: document.body.classList.contains('acc-bright') };
    acc.set({ bright: 0.5 }); const mixed = { cls: document.body.classList.contains('acc-bright'), acc: st.getPropertyValue('--acc'), white: st.getPropertyValue('--acc-white'), color: probe() };
    acc.set({ bright: 0, vivid: 0 }); const dull = { sat: st.getPropertyValue('--sat-acc'), lum: st.getPropertyValue('--lum-acc') };
    return { palette, hsl, mixed, dull, model: acc.model };`);
  check('createAccent({ model: \'hsl\' }): A = 180°, VIVID 1 is hsl(180 100% 64%) = rgb(71, 255, 255) with BASINS\' six tokens; the palette model is not', r.hsl.color === 'rgb(71, 255, 255)' && r.hsl.hue === '180' && r.hsl.sat === '100%' && r.hsl.lum === '64%' && r.hsl.hueB === '20' && !r.hsl.bright && r.palette !== 'rgb(71, 255, 255)' && r.model === 'hsl', JSON.stringify(r));
  check('… BRIGHTNESS .5 mixes toward white in OKLCH (acc-bright, --acc-white 50%), VIVID 0 is hsl(.. 20% 28%)', r.mixed.cls && /color-mix\(in oklch/.test(r.mixed.acc) && r.mixed.white === '50%' && r.mixed.color !== r.hsl.color && r.dull.sat === '20%' && r.dull.lum === '28%', JSON.stringify({ mixed: r.mixed, dull: r.dull }));

  /* ── 4. a work-bar transport outside the modulation window ── */
  const rows = [];
  for (const [card, frost] of [['tinted', 'always'], ['refractive', 'always']]) {
    rows.push(await J(`T.P.set({ card: '${card}', frost: '${frost}' }); T.P.apply({ now: true }); await wait(300);
      const t = document.querySelector('.mir-transport[data-bar=work]'), c = getComputedStyle(t), h = getComputedStyle(t.querySelector('.tempo-hz'));
      const i = document.createElement('i'); i.style.boxShadow = 'var(--surface-shadow)'; document.body.appendChild(i); const want = getComputedStyle(i).boxShadow; i.remove();
      return { card: '${card}', bg: c.backgroundColor, shadow: c.boxShadow, want, hz: h.color, win: !!t.closest('.mir-modwindow') };`));
  }
  check('a work bar outside .mir-modwindow: TINTED under FROST is the pane at .58, REFRACTIVE is clear', rows[0].bg === 'rgba(26, 32, 40, 0.58)' && /, 0\)$/.test(rows[1].bg) && !rows[0].win, JSON.stringify(rows.map((x) => x.bg)));
  check('… its shadow is the pane\'s (not the sheen\'s 0 .6px inset transparent) and the Hz reading\'s ink is .82', rows.every((x) => x.shadow === x.want && x.shadow !== 'none') && rows.every((x) => x.hz === 'rgba(255, 255, 255, 0.82)'), JSON.stringify(rows.map((x) => [x.shadow, x.hz])));

  /* ── 5. CONTROL FACES · GLASS ── */
  r = await J(`T.P.set({ card: 'refractive', frost: 'always', faces: 'glass' }); T.P.apply({ now: true }); await wait(200);
    const { trig, seg, sw, device } = await import('/mir/kit.js');
    const d = device({ id: 'faces', eyebrow: 'FACES' }); document.body.append(d.root); d.root.style.cssText = 'position:fixed;left:10px;top:10px;width:300px;z-index:50';
    const pill = trig({ label: '+ ADD' }).root; pill.style.cssText = 'border-radius:999px;padding:0 18px;min-width:96px';
    const sg = seg({ value: 'a', options: [{ id: 'a', label: 'SMOOTH' }, { id: 'b', label: 'ITER' }] }).root, s = sw({ label: 'SMOOTHING', value: false }).root;
    d.body.append(pill, sg, s); await wait(100);
    const bg = (n) => getComputedStyle(n).backgroundColor + '|' + getComputedStyle(n).backgroundImage;
    const f = [pill, sg, sg.querySelector('.seg-b'), s].map(bg); d.root.remove(); return f;`);
  check('CONTROL FACES · GLASS under FROST: a pill trigger, a segment\'s well and its segment, and a switch are clear', r.every((x) => x === 'rgba(0, 0, 0, 0)|none'), JSON.stringify(r));
} finally { await p.close(); }
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} parity round five checks pass`);
if (failed) process.exit(1);
