/* ink.browser.mjs — adaptive ink and the GUI's alpha.12 rows in a real browser (tests/fixtures/ink.html), real input
 * through CDP, every control hit-tested with elementFromPoint.
 *   · a two-tone canvas under a REFRACTIVE pane: the label is white over black; the picture flips to white and, seen twice,
 *     the label turns black; the pane's computed fill and filter are the same before and after (the glass is not touched);
 *   · TEXT · LIGHT (a real click) stops the sampler and clears every cell; AUTO starts it again;
 *   · BRIGHTNESS (a real drag) moves --acc and --acc2 toward white and writes --acc-white;
 *   · the accent part round-trips through the project: captured, changed, restored live;
 *   · STATUS TAGS and TRANSPORT BAR (real clicks) set their body classes; SAMPLING · SCRUB (a real click) stores its level;
 *   · QUALITY · AUTO: the device is measured once (an injected bench) and the tier is kept.
 * Standalone: MIR_BASE=http://127.0.0.1:8845 node tests/ink.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8845';
const URL_ = BASE.replace(/\/$/, '') + '/tests/fixtures/ink.html';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 720 });
const J = async (expr) => JSON.parse(await p.eval(`(async () => { const T = __T, G = T.gui, P = G.prefs, I = T.ink; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const cs = (s, pr) => getComputedStyle(document.querySelector(s)).getPropertyValue(pr).trim(), bv = (n) => getComputedStyle(document.body).getPropertyValue(n).trim();
  return JSON.stringify(await (async () => { ${expr} })()); })()`));
let held = false;
const mouse = (type, x, y) => { if (type === 'mousePressed') held = true; if (type === 'mouseReleased') held = false;
  return p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 }); };
const misses = [];
const spot = (sel) => J(`const n = ${sel}; if (!n) return null; const b = n.getBoundingClientRect(), x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
  const h = document.elementFromPoint(x, y); return { x, y, hit: !!h && (h === n || n.contains(h)) };`);
async function click(sel, name) {
  const s = await spot(sel); if (!s) { misses.push(name + ': not found'); return false; }
  if (!s.hit) misses.push(name + ': elementFromPoint missed');
  await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y); await mouse('mouseReleased', s.x, s.y); await sleep(150);
  return s.hit;
}
async function dragUp(sel, name, dy = 60) {
  const s = await spot(sel); if (!s) { misses.push(name + ': not found'); return false; }
  if (!s.hit) misses.push(name + ': elementFromPoint missed');
  await mouse('mouseMoved', s.x, s.y); await mouse('mousePressed', s.x, s.y);
  for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', s.x, s.y - Math.round((dy * i) / 8)); await sleep(16); }
  await mouse('mouseReleased', s.x, s.y - dy); await sleep(200);
  return s.hit;
}
const grp = (g) => `document.querySelector('.mir-gui .gui-grp[data-group="${g}"]')`;
const segB = (g, i, b) => `${grp(g)}.querySelectorAll('.seg')[${i}].querySelectorAll('.seg-b')[${b}]`;
const swB = (g, i) => `${grp(g)}.querySelectorAll('.sw')[${i}]`;

try {
  await p.goto(URL_, 900);
  for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  await sleep(300);

  /* ── the ink: white over black, black over white once seen twice, the glass untouched ── */
  let r = await J(`P.set({ card: 'refractive', frost: 'always', text: 'theme' }); P.apply({ now: true }); await wait(200); I.tick(); await wait(400);
    return { live: document.body.hasAttribute('data-ink-live'), ink: document.getElementById('word').dataset.ink, color: cs('#word', 'color'),
      fill: cs('#pane', 'background-color'), image: cs('#pane', 'background-image'), filter: cs('#pane', 'backdrop-filter'), state: I.state() };`);
  check('over the black half the label is white (data-ink w, computed rgb(255, 255, 255))', r.live && r.ink === 'w' && r.color === 'rgb(255, 255, 255)', JSON.stringify({ live: r.live, ink: r.ink, color: r.color, cells: r.state.cells }));
  const before = r;
  r = await J(`T.paint('#fff', '#000'); I.tick(); await wait(400); const once = document.getElementById('word').dataset.ink; I.tick(); await wait(400);
    return { once, ink: document.getElementById('word').dataset.ink, color: cs('#word', 'color'), fill: cs('#pane', 'background-color'), image: cs('#pane', 'background-image'), filter: cs('#pane', 'backdrop-filter'), flips: I.stat.flips };`);
  check('the picture turns white under it: seen once the label holds (hysteresis), seen twice it turns black', r.once === 'w' && r.ink === 'k' && r.color === 'rgb(0, 0, 0)', JSON.stringify(r));
  check('the pane is not repainted: its computed fill, image and filter are the same before and after', r.fill === before.fill && r.image === before.image && r.filter === before.filter, `${before.fill} | ${before.filter} → ${r.fill} | ${r.filter}`);
  r = await J(`return { shadow: cs('#word', 'text-shadow'), acc: bv('--acc') };`);
  check('no text shadow on the sampled label', r.shadow === 'none', r.shadow);

  /* ── TEXT · LIGHT stops it (a real click), AUTO starts it again ── */
  await J(`G.open('options'); await wait(300); return 1;`);
  const hitL = await click(segB('text', 0, 1), 'TEXT LIGHT');
  r = await J(`await wait(250); return { mode: I.mode(), live: document.body.hasAttribute('data-ink-live'), cells: document.querySelectorAll('[data-ink]').length, text: document.body.dataset.text, color: cs('#word', 'color') };`);
  check('TEXT · LIGHT: the sampler stops, every cell is cleared, the label is white by the forced seat', hitL && r.mode === 'off' && !r.live && r.cells === 0 && r.text === 'light' && r.color === 'rgb(255, 255, 255)', JSON.stringify(r));
  const hitA = await click(segB('text', 0, 0), 'TEXT AUTO');
  r = await J(`await wait(200); I.tick(); await wait(400); return { mode: I.mode(), ink: document.getElementById('word').dataset.ink };`);
  check('TEXT · AUTO: the sampler runs again and the label is black over the white half', hitA && r.mode === 'auto' && r.ink === 'k', JSON.stringify(r));

  /* ── BRIGHTNESS moves the accents toward white ── */
  const acc0 = await J(`return { a: bv('--acc'), b: bv('--acc2'), white: bv('--acc-white') };`);
  const hitBr = await dragUp(`${grp('accent')}.querySelectorAll('.k-dial')[3]`, 'BRIGHTNESS', 70);
  r = await J(`const lum = (c) => { const m = c.match(/[0-9a-f]{6}/i); if (m) { const n = parseInt(m[0], 16); return ((n >> 16) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) / 255; } return -1; };
    return { a: bv('--acc'), b: bv('--acc2'), white: bv('--acc-white'), bright: P.get('accentBright'), la0: lum(${JSON.stringify(acc0.a)}), la: lum(bv('--acc')), lb0: lum(${JSON.stringify(acc0.b)}), lb: lum(bv('--acc2')) };`);
  check('BRIGHTNESS (a real drag): --acc and --acc2 move toward white and --acc-white is written', hitBr && r.bright > 0 && r.la > r.la0 && r.lb > r.lb0 && /%$/.test(r.white) && !acc0.white, JSON.stringify(r));

  /* ── the accent part round-trips ── */
  r = await J(`P.set({ accentA: 120, accentB: 200, vivid: .4, accentBright: .25 }); await wait(120); const saved = T.captureProject(); const acc = bv('--acc');
    P.set({ accentA: 10, accentB: 20, vivid: .1, accentBright: 0 }); await wait(120); const moved = bv('--acc');
    const back = T.restoreProject(saved); await wait(150);
    const none = T.restoreProject({}); await wait(80);
    return { saved: saved.accent, acc, moved, now: bv('--acc'), state: [P.get('accentA'), P.get('accentB'), P.get('vivid'), P.get('accentBright')], failed: back.failed, after: [P.get('accentA'), P.get('accentBright')] };`);
  check('the accent part: captured as { a, b, vivid, bright }, restored live, and a project without it leaves the UI alone',
    JSON.stringify(r.saved) === JSON.stringify({ a: 120, b: 200, vivid: 0.4, bright: 0.25 }) && r.moved !== r.acc && r.now === r.acc && JSON.stringify(r.state) === '[120,200,0.4,0.25]' && r.failed.length === 0 && JSON.stringify(r.after) === '[120,0.25]', JSON.stringify(r));

  /* ── STATUS TAGS, TRANSPORT BAR, SAMPLING ── */
  r = await J(`return { off: document.body.classList.contains('no-badges'), shown: cs('#badges', 'display') };`);
  const hitS = await click(swB('text', 2), 'STATUS TAGS');
  let r2 = await J(`await wait(120); return { off: document.body.classList.contains('no-badges'), shown: cs('#badges', 'display') };`);
  check('STATUS TAGS: off for a new user (body.no-badges hides #badges); a real click shows them', r.off && r.shown === 'none' && hitS && !r2.off && r2.shown !== 'none', JSON.stringify([r, r2]));
  await J(`G.open('options:2'); await wait(300); return 1;`);
  const hitT = await click(swB('windows', 3), 'TRANSPORT BAR');
  r = await J(`await wait(120); return document.body.classList.contains('no-transport-bar');`);
  check('TRANSPORT BAR off (a real click): body.no-transport-bar', hitT && r === true);
  const hitSc = await click(segB('sampling', 0, 1), 'SCRUB LIGHT');
  r = await J(`await wait(120); return G.sampling();`);
  check('SAMPLING · SCRUB LIGHT (a real click): stored and handed out by gui.sampling()', hitSc && r.scrub === 'light' && r.grid === 0, JSON.stringify(r));

  /* ── QUALITY · AUTO: measured once, kept ── */
  r = await J(`for (let i = 0; i < 20 && !G.tier(); i++) await wait(100); const t = G.tier(); return { q: P.get('quality'), t, kept: JSON.parse(localStorage.getItem('mir.tier') || 'null'), tier: document.documentElement.dataset.uiTier || null, tablet: document.body.classList.contains('touch-tablet') };`);
  check('QUALITY · AUTO: the injected bench sorts the device (16.7 / 2 ms = ×8.4 at 60 Hz → B → FULL), the reading is kept, no tier attribute', r.q === 'auto' && r.t && r.t.tier === 'B' && r.kept && r.kept.tier === 'B' && r.tier === null && r.tablet === false, JSON.stringify(r));

  check('every control was hit-tested where it is drawn', misses.length === 0, misses.join('; '));
  r = await J(`return document.querySelectorAll('.mir-gui .gui-page.gui-options').length;`);
} catch (e) {
  check('the run', false, String(e && e.stack || e));
} finally {
  await p.close();
}
for (const r of results) console.log(r);
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `${failed} of ${results.length} ink checks FAILED` : `ALL ${results.length} ink checks passed`);
process.exit(failed ? 1 : 0);
