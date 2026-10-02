/* menubar-phone.browser.mjs — the menubar on a phone (390 × 844, touch, hover: none) with seven groups
 * (FILE · EDIT · VIEW · WINDOW · ABOUT · LANGUAGE · GUI, gallery/gui.html): the bar wraps instead of running off the
 * screen, so every group is reachable.  Each group button is inside the viewport and is the element under its own
 * centre (elementFromPoint); a tap opens its list, and the opened list is inside the viewport.
 *   MIR_BASE=http://127.0.0.1:8790 node tests/menubar-phone.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';
const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8790';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 390, height: 844 });
try {
  await p.phone(390, 844);
  await p.goto(BASE + '/gallery/gui.html', 2500);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await sleep(400);
  const btns = JSON.parse(await p.eval(`JSON.stringify([...document.querySelectorAll('#menubar .mb-btn')].map((b) => {
    const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, h = document.elementFromPoint(x, y);
    return { name: b.dataset.menu, x, y, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, hit: !!h && (h === b || b.contains(h)) };
  }))`));
  check('phone: the bar has the seven groups', btns.length === 7, btns.map((b) => b.name).join(' · '));
  const rows = new Set(btns.map((b) => Math.round(b.y))).size;
  check('phone: every group button is inside the viewport', btns.every((b) => b.inside), JSON.stringify(btns.filter((b) => !b.inside)));
  check('phone: every group button is the element under its own centre', btns.every((b) => b.hit), JSON.stringify(btns.filter((b) => !b.hit)));
  check('phone: the bar wraps onto a second row', rows >= 2, `${rows} row(s)`);
  const touch = (type, x, y) => p.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const tap = async (x, y) => { await touch('touchStart', x, y); await sleep(40); await touch('touchEnd', x, y); };
  for (const b of btns) {
    await tap(b.x, b.y);
    await sleep(250);
    const l = JSON.parse(await p.eval(`(() => { const g = [...document.querySelectorAll('#menubar .mb-btn')].find((x) => x.dataset.menu === ${JSON.stringify(b.name)});
      const list = g.nextElementSibling, r = list.getBoundingClientRect();
      return JSON.stringify({ open: !list.hidden, l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }); })()`));
    check(`phone: tapping ${b.name} opens its list, whole on the screen`, l.open && l.inside, JSON.stringify(l));
    await tap(b.x, b.y);
    await sleep(150);
  }
  check('no page errors', !p.logs.some((l) => /EXCEPTION/.test(l)), p.logs.join(' | '));

  /* the rack starts below a bar that wrapped: no group button's rect meets the rack's (tests/fixtures/menubar-rack.html) */
  p.logs.length = 0;
  await p.goto(BASE + '/tests/fixtures/menubar-rack.html', 2500);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await p.eval('__T.rack.setHidden(false); true'); await sleep(700);                 // the phone's one rack, shown
  const over = JSON.parse(await p.eval(`(() => {
    const racks = [...document.querySelectorAll('.mir-rack')].filter((r) => getComputedStyle(r).display !== 'none').map((r) => r.getBoundingClientRect());
    const btns = [...document.querySelectorAll('#menubar .mb-btn')].map((b) => ({ name: b.dataset.menu, r: b.getBoundingClientRect() }));
    const meets = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    return JSON.stringify({ racks: racks.map((r) => [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]), rows: new Set(btns.map((b) => Math.round(b.r.top))).size,
      hits: btns.filter((b) => racks.some((r) => meets(b.r, r))).map((b) => b.name), barBottom: getComputedStyle(document.documentElement).getPropertyValue('--menubar-bottom') }); })()`));
  check('phone + rack: the bar wraps over a shown rack with seven groups', over.rows >= 2 && over.racks.length >= 1 && over.racks[0][0] >= 0, JSON.stringify(over));
  check('phone + rack: no menubar button meets the rack (the rack starts below the bar)', over.hits.length === 0, JSON.stringify(over));
  check('phone + rack: no page errors', !p.logs.some((l) => /EXCEPTION/.test(l)), p.logs.join(' | '));
} finally { await p.close(); }

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nPASS menubar-phone: all ${results.length}`);
process.exit(failed ? 1 : 0);
