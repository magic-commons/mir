/* icons.browser.mjs — the icon gallery (gallery/icons.html) under a real browser: every glyph in the library is on the page at 16, 24 and 64 px
 * on a dark ground and a light one, each svg paints real ink (a bounding box that is not empty), the one that sits under the pointer at its centre is
 * the glyph itself (document.elementFromPoint), and the ink is the ground's own colour (currentColor), so the two grounds differ.
 * MIR_PLATES=1 also writes docs/plates/icons/gallery.png.
 * Run by tests/run.mjs with MIR_BASE set; standalone: MIR_BASE=http://127.0.0.1:8857 node tests/icons.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8857';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1500, height: 900 });
try {
  await p.goto(BASE + '/gallery/icons.html', 600);
  for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  const H = await p.eval('Math.ceil(document.documentElement.scrollHeight)');
  await p.resize(1500, H); await sleep(200);        // the whole page in view, so elementFromPoint can reach every cell
  const r = JSON.parse(await p.eval(`(async () => {
    const { glyphNames } = await import('../mir/glyph.js');
    const names = glyphNames(), bad = [], flat = [], covered = [], small = [];
    const ink = {};
    for (const tone of ['dark', 'light']) {
      const pane = document.querySelector('.pane.' + tone);
      for (const n of names) {
        const cell = pane.querySelector('.cell[data-glyph="' + n + '"]');
        if (!cell) { bad.push(tone + ':' + n); continue; }
        const svgs = cell.querySelectorAll('svg');
        if (svgs.length !== 3) { bad.push(tone + ':' + n + ' has ' + svgs.length + ' sizes'); continue; }
        [...svgs].forEach((s, i) => {
          const b = s.getBoundingClientRect(), want = [16, 24, 64][i];
          if (Math.round(b.width) !== want) small.push(tone + ':' + n + '@' + want + ' is ' + b.width);
          let box; try { box = s.getBBox(); } catch (e) { box = { width: 0, height: 0 }; }
          if (!(box.width > 0 || box.height > 0)) flat.push(tone + ':' + n + '@' + want);
          if (want === 24) {
            const h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
            if (!h || !(h === s || s.contains(h) || (h.closest && h.closest('svg') === s))) {
              /* a stroke-only glyph can have a hole at its centre; the hit then lands on the cell, which is still inside this svg's box */
              if (!(h && h.closest && h.closest('.cell') === cell)) covered.push(tone + ':' + n);
            }
          }
        });
        const path = cell.querySelector('svg [stroke="currentColor"], svg [fill="currentColor"]');
        ink[tone + ':' + n] = path ? getComputedStyle(path).stroke !== 'none' ? getComputedStyle(path).stroke : getComputedStyle(path).fill : null;
      }
    }
    const diff = names.filter((n) => ink['dark:' + n] && ink['light:' + n] && ink['dark:' + n] === ink['light:' + n]);
    return { count: names.length, bad, flat, covered, small, diff, aliasLine: document.querySelector('.alias').textContent };
  })().then((v) => JSON.stringify(v))`));
  check('every glyph is on the page, in both panes, at 16 / 24 / 64 px', r.bad.length === 0 && r.small.length === 0 && r.count > 70, r.bad.concat(r.small).slice(0, 6).join('; ') + ' (' + r.count + ' glyphs)');
  check('every svg paints ink (a bounding box that is not empty; a bar may be flat)', r.flat.length === 0, r.flat.slice(0, 6).join(', '));
  check('the element under the pointer at each 24 px glyph’s centre is that glyph (or its cell), never something over it', r.covered.length === 0, r.covered.slice(0, 6).join(', '));
  check('the ink is currentColor: the dark pane and the light pane paint every glyph in different colours', r.diff.length === 0, r.diff.slice(0, 6).join(', '));
  check('the aliases are listed', /north → popOut/.test(r.aliasLine), r.aliasLine);
  check('no console error or exception', p.logs.filter((l) => !/Failed to load resource/.test(l)).length === 0, p.logs.slice(0, 3).join(' | '));
  if (process.env.MIR_PLATES) {
    const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'plates', 'icons', 'gallery.png');
    await p.shot(out); check('plate written', true, out);
  }
} finally { await p.close(); }
console.log(results.join('\n'));
if (results.some((l) => l.startsWith('FAIL'))) process.exit(1);
console.log('PASS  icons gallery: ' + results.length + ' checks');
