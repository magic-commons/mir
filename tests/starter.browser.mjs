/* starter.browser.mjs — the STARTER (starter/index.html) under a real browser, with real CDP pointer and keys; every
 * press is hit-tested with elementFromPoint first.  A first run shows only the transport bar (and the greeting, which
 * is LLM.md's first part only); a latch opens its rack window; a knob drag changes the picture's number; the lazily
 * built RING window makes its knob a modulation target when it is first opened, and a route onto it moves it; Space
 * plays and pauses the one clock and leaves modulation's power alone, and the power button leaves play alone; the
 * LFO routed on a first run moves SIZE; FOLDERS opens clear of the rack and the bar; SAVE while a route drives SIZE
 * keeps its base, and opening the project after a knob change brings that base back; GUI opens MIR OPTIONS; ? opens
 * the help view; the pseudo-language relabels; describe() carries the clock and only the shared page; no console error.
 *   MIR_BASE     the server (default http://127.0.0.1:8811)
 *   MIR_STARTER  the starter's path under it (default /starter/index.html; the built skill serves it at the same path)
 *   MIR_PLATES=1 writes docs/plates/starter/{first-run,windows,light}.png */
import fs from 'node:fs';
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8811';
const PATH = process.env.MIR_STARTER || '/starter/index.html';
const PLATES = !!process.env.MIR_PLATES;
const LLM = fs.readFileSync(new URL('../LLM.md', import.meta.url), 'utf8');
const HEADING = LLM.match(/^# (.+)$/m)[1], SECOND = LLM.match(/^## (.+)$/m)[1];   // the second heading is past the first `---`
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
const ev = async (body) => JSON.parse(await p.eval(`(async () => { const S = window.__STARTER && window.__STARTER.S, A = window.__STARTER && window.__STARTER.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const C = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; };
  const R = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; };
  const meets = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  ${body} })().then((v) => JSON.stringify(v === undefined ? null : v))`));
const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const key = async (k, code, vk, mods = 0) => {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  await sleep(200);
};
const space = () => key(' ', 'Space', 32);
const missed = [];
/** where an element would be pressed, and whether elementFromPoint finds it (or something in it) there */
const at = (expr) => ev(`const el = ${expr}; if (!el) return null; const c = C(el), h = document.elementFromPoint(c.x, c.y);
  return { ...c, hit: !!h && (h === el || el.contains(h)), got: h ? h.tagName + '.' + String(h.className.baseVal ?? h.className) : 'nothing' };`);
async function click(expr, label) {
  const c = await at(expr);
  if (!c || !c.hit) { missed.push(label + (c ? ' (hit ' + c.got + ')' : ' (absent)')); return false; }
  await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y); await mouse('mouseReleased', c.x, c.y); await sleep(250);
  return true;
}
async function dragUp(expr, label, dy = 70) {
  const c = await at(expr);
  if (!c || !c.hit) { missed.push(label + (c ? ' (hit ' + c.got + ')' : ' (absent)')); return; }
  await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y);
  for (let i = 1; i <= 10; i++) { await mouse('mouseMoved', c.x, c.y - Math.round((dy * i) / 10)); await sleep(16); }
  await mouse('mouseReleased', c.x, c.y - dy); await sleep(200);
}
/** a press on the empty picture, away from the words: the greeting leaves and the focus goes back to the page */
const ground = async () => { await mouse('mouseMoved', 200, 300); await mouse('mousePressed', 200, 300); await mouse('mouseReleased', 200, 300); await sleep(250); };
const knob = (k) => `A.params.find((p) => p.key === ${JSON.stringify(k)}).root.querySelector('.k-dial')`;
const latch = (id) => `document.querySelector('#transport [data-opener="${id}"]')`;
async function menu(group, index) {
  const w = await at(`document.getElementById('title')`);
  await mouse('mouseMoved', w.x, w.y); await sleep(300);
  await click(`document.querySelector('.mb-btn[data-menu="${group}"]')`, group + ' menu');
  await click(`document.querySelector('.mb-btn[data-menu="${group}"]').nextElementSibling.querySelectorAll('.mb-item')[${index}]`, group + ' item ' + index);
}

try {
  await p.goto(BASE + PATH, 1200);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__STARTER').catch(() => false)); i++) await sleep(150);
  await sleep(900);
  if (PLATES) await p.shot('docs/plates/starter/first-run.png');

  /* ── a first run: only the bar, and the greeting is LLM.md's first part ── */
  let r = await ev(`const words = [...document.querySelectorAll('.mir-info-block')].map((b) => b.textContent).join(' ');
    const open = [...document.querySelectorAll('.dev:not(.closed), .mir-win')].filter((n) => n.offsetWidth && getComputedStyle(n).visibility !== 'hidden' && !n.hidden);
    const bar = document.getElementById('transport'), c = C(bar), h = document.elementFromPoint(c.x, c.y);
    return { first: A.first, boot: !document.querySelector('.mir-boot:not([data-state="gone"])'), open: open.map((n) => n.className), bar: !!h && bar.contains(h),
      chrome: !!document.getElementById('rackAdd'), h1: (document.querySelector('.mir-info-block h1') || {}).textContent, second: words.includes(${JSON.stringify(SECOND)}), page0: A.pages.list()[0].shared };`);
  check('a first run shows only the transport bar: no window open, no rack chrome, the bar takes the pointer', r.first && r.boot && r.open.length === 0 && r.bar && !r.chrome, JSON.stringify(r));
  const greet0 = r;
  r = await ev(`const b = document.querySelector('.mir-info-block').getBoundingClientRect(), t = R(document.getElementById('transport')), st = R(document.getElementById('stage'));
    return { inside: b.left >= st.left && b.top >= st.top && b.right <= st.right && b.bottom <= st.bottom, clear: !meets(R(document.querySelector('.mir-info-block')), t) };`);
  check('the greeting rests inside the stage and clear of the transport bar (1280×800)', r.inside && r.clear, JSON.stringify(r));
  r = await ev(`const { createInfoLayer } = await import(new URL('../mir/info/layer.js', location.href).href), { showPage, firstPart } = await import(new URL('../mir/info/page.js', location.href).href);
    const st = document.getElementById('stage'), W = st.clientWidth, H = st.clientHeight;
    const L = createInfoLayer({ stage: st, subject: () => ({ left: W / 2 - 200, top: 10, width: 400, height: H - 20 }), avoid: () => [document.getElementById('transport').getBoundingClientRect()], parallax: false });
    showPage(L, firstPart(A.pages.list()[0].md)); await wait(1500);
    const el = L.root.querySelector('.mir-info-block'), b = R(el), s2 = R(st), t = R(document.getElementById('transport'));
    const out = { inside: b.left >= s2.left - 1 && b.top >= s2.top - 1 && b.right <= s2.right + 1 && b.bottom <= s2.bottom + 1, clear: !meets(b, t), over: el.hasAttribute('data-over'), b };
    L.destroy(); return out;`);
  check('with a tall centred subject the block still rests inside the stage and clear of the bar', r.inside && r.clear, JSON.stringify(r));
  check('the greeting is LLM.md\'s first part only (its heading, not the next section), and page 0 is shared', greet0.h1 === HEADING && !greet0.second && greet0.page0 === true, JSON.stringify({ h1: greet0.h1, second: greet0.second }));
  await ground();

  /* ── a latch on the bar opens its rack window; a knob drag changes the picture's number ── */
  await click(latch('picture'), 'PICTURE latch');
  r = await ev(`return { open: A.rack.isOpen('picture'), lit: document.querySelector('#transport [data-opener="picture"]').classList.contains('on') || document.querySelector('#transport [data-opener="picture"]').getAttribute('aria-pressed') === 'true' };`);
  check('the PICTURE latch opens the rack window', r.open, JSON.stringify(r));
  /* ── Space over the latch that has the focus: it plays, and the latch is not pressed (alpha.6: Opus) ── */
  const focused = await ev(`return document.activeElement && document.activeElement.dataset.opener;`);
  await space();
  const over = await ev(`return { playing: A.playing(), open: A.rack.isOpen('picture') };`);
  await space();
  const over2 = await ev(`return { playing: A.playing(), open: A.rack.isOpen('picture') };`);
  check('Space over a focused latch plays and pauses the one clock and leaves the latch alone', focused === 'picture' && over.playing && over.open && !over2.playing && over2.open, JSON.stringify({ focused, over, over2 }));
  const s0 = await ev(`return S.speed;`);
  await dragUp(knob('speed'), 'SPEED knob');
  const s1 = await ev(`return S.speed;`);
  check('a knob drag (SPEED) changes the picture\'s number', s1 > s0 + 0.1, `${s0} → ${s1}`);

  /* ── the one clock: Space plays and pauses; the power is not touched ── */
  await ground();
  const pw0 = await ev(`return A.mod.power();`);
  await space();
  const on = await ev(`return { playing: A.mod.playing(), bar: document.querySelector('#transport .tbtn[data-key-action="transport.play"], #transport [data-key-action="transport.play"]').getAttribute('aria-pressed'), power: A.mod.power() };`);
  await space();
  const off = await ev(`return { playing: A.mod.playing(), power: A.mod.power() };`);
  await space();
  check('Space plays and pauses the one clock (the bar\'s ▶ says so) and does not change modulation\'s power', on.playing && on.bar === 'true' && !off.playing && on.power === pw0 && off.power === pw0, JSON.stringify({ on, off, pw0 }));

  /* ── the power button: a bypass, never a play ── */
  await click(`document.querySelector('#transport .mir-mod-power')`, 'power button');
  r = await ev(`return { playing: A.mod.playing(), power: A.mod.power() };`);
  await click(`document.querySelector('#transport .mir-mod-power')`, 'power button (again)');
  const r2 = await ev(`return { playing: A.mod.playing(), power: A.mod.power() };`);
  check('the power button flips modulation\'s power and leaves play alone', r.playing === true && r.power === !pw0 && r2.playing === true && r2.power === pw0, JSON.stringify({ r, r2 }));

  /* ── the LFO routed on a first run moves SIZE while the clock plays ── */
  r = await ev(`const seen = new Set(); for (let i = 0; i < 12; i++) { seen.add(S.size.toFixed(4)); await wait(80); } return { n: seen.size, routed: A.mod.isModulated('app.size'), running: A.mod.running() };`);
  check('the LFO routed on a first run moves SIZE with no hand on it', r.routed && r.running && r.n >= 5, JSON.stringify(r));

  /* ── the lazy window: built on first open, and its knob becomes a target then; a route onto it moves it ── */
  const before = await ev(`return { built: A.rack.isBuilt('ring'), param: A.params.some((p) => p.key === 'spread'), target: A.mod.params().some((p) => p.id === 'app.spread') };`);
  await ground();
  await click(latch('ring'), 'RING latch');
  r = await ev(`const p = A.params.find((q) => q.key === 'spread'); return { built: A.rack.isBuilt('ring'), open: A.rack.isOpen('ring'), target: A.mod.params().some((q) => q.id === 'app.spread'), hook: p && p.root.dataset.param };`);
  check('RING is not built until its latch opens it; then its SPREAD knob is a modulation target', !before.built && !before.param && !before.target && r.built && r.open && r.target && r.hook === 'app.spread', JSON.stringify({ before, after: r }));
  r = await ev(`const route = A.mod.route('lfo', 'app.spread', 0.5); const seen = new Set(); for (let i = 0; i < 12; i++) { seen.add(S.spread.toFixed(4)); await wait(80); }
    const knobMoved = A.params.find((q) => q.key === 'spread').root.classList.contains('mod-held'); const n = seen.size; route.remove(); await wait(100);
    return { n, knobMoved, after: A.mod.isModulated('app.spread'), back: S.spread };`);
  check('a route onto the lazily built knob moves it; removing the route lets go', r.n >= 5 && r.knobMoved && r.after === false && Math.abs(r.back - 0.25) < 1e-6, JSON.stringify(r));

  /* ── FOLDERS (F) opens clear of the rack and the bar ── */
  await ground();
  await key('f', 'KeyF', 70);
  r = await ev(`const w = R(A.folders.win.root), bar = R(document.getElementById('transport')), racks = [...document.querySelectorAll('.mir-rack')].filter((k) => k.querySelector('.dev:not(.closed)')).map(R);
    return { open: A.folders.isOpen(), w, clearOfBar: !meets(w, bar), clearOfRacks: racks.every((k) => !meets(w, k)), racks: racks.length };`);
  check('F opens FOLDERS, clear of both racks and the transport bar', r.open && r.clearOfBar && r.clearOfRacks && r.racks === 2, JSON.stringify(r));

  /* ── SAVE while the LFO drives SIZE keeps its base; a knob change, then OPEN, brings the base back ── */
  const atSave = await ev(`return { base: A.mod.baseOf('app.size'), now: S.size, routed: A.mod.isModulated('app.size') };`);
  await click(`A.folders.win.root.querySelector('[data-action="save"]')`, 'FOLDERS › SAVE');
  await sleep(300);
  r = await ev(`const e = A.folders.current(); return { name: e && e.name, n: A.folders.files.entries().length, notice: document.querySelectorAll('.mir-notice').length };`);
  check('SAVE in FOLDERS saves the project and says so in a notice', r.name && r.n === 1 && r.notice > 0, JSON.stringify(r));
  const name = r.name;
  await dragUp(knob('size'), 'SIZE knob (after save)', -50);
  const changed = await ev(`return A.mod.baseOf('app.size');`);
  const tile = `[...A.folders.win.root.querySelectorAll('.sv-card')].find((c) => c.dataset.name === ${JSON.stringify(name)}).querySelector('.sv-shot')`;
  await click(tile, 'saved tile (select)');
  await click(tile, 'saved tile (open)');
  const asked = await ev(`return !!A.folders.win.root.querySelector('.sv-ask');`);
  await click(`A.folders.win.root.querySelector('.sv-ask .sv-act:not(.sv-primary)')`, 'OPEN WITHOUT SAVING');
  await sleep(300);
  const back = await ev(`return { base: A.mod.baseOf('app.size'), routed: A.mod.isModulated('app.size') };`);
  check('the project keeps SIZE\'s base, not the LFO\'s reading: a knob change then OPEN restores the base', atSave.routed && Math.abs(atSave.now - atSave.base) > 1e-4 && Math.abs(changed - atSave.base) > 0.05 && Math.abs(back.base - atSave.base) < 1e-6 && back.routed && asked,
    JSON.stringify({ atSave, changed, back, asked }));
  await ev(`A.folders.close(); return 0;`);

  /* ── GUI opens MIR OPTIONS from the menubar, and it takes the pointer ── */
  await menu('GUI', 0);
  r = await ev(`const g = A.gui; const c = C(g.root), h = document.elementFromPoint(c.x, c.y); return { open: !g.root.hidden && g.root.getBoundingClientRect().width > 100, page: g.page, hit: !!h && g.root.contains(h) };`);
  check('GUI › MIR OPTIONS opens the GUI window, and it takes the pointer', r.open && r.page === 'options' && r.hit, JSON.stringify(r));
  await ev(`A.gui.close(); return 0;`);

  /* ── a theme flip redraws the picture, paused too (createApp calls the app's present) ── */
  await ev(`if (A.playing()) A.pause(); await wait(200); return 0;`);
  const px = `const c = document.getElementById('picture'), d = c.getContext('2d').getImageData(4, 4, 1, 1).data; return d[0];`;
  const dark0 = await ev(px);
  await ev(`A.gui.prefs.set('theme', 'light'); await wait(300); return 0;`);
  const light0 = await ev(px);
  await ev(`A.gui.prefs.set('theme', 'dark'); await wait(300); A.play(); return 0;`);
  check('a theme flip redraws the canvas while the clock is paused', dark0 < 60 && light0 > 200, JSON.stringify({ dark0, light0 }));

  /* ── ? opens the help view, which lists Space (play) and I (hold the words still) ── */
  await key('?', 'Slash', 191, 8);
  r = await ev(`return { open: A.help.isOpen(), play: A.keys.chords('transport.play'), hold: A.keys.chords('info-hold') };`);
  check('? opens the help view; the key table holds Space for play and I for holding the words still', r.open && r.play.includes('Space') && r.hold.includes('KeyI'), JSON.stringify(r));
  await ev(`A.help.close(); return 0;`);

  /* ── the pseudo-language relabels, live ── */
  r = await ev(`const i18n = await import(new URL('../mir/core/i18n.js', location.href).href);
    const lbl = () => A.params[0].root.querySelector('.k-lbl').textContent, menu = () => document.querySelector('.mb-btn[data-menu="WINDOW"]').textContent;
    const before = [lbl(), menu()]; await i18n.setLanguage('qps'); await wait(150); const during = [lbl(), menu(), document.documentElement.lang];
    await i18n.setLanguage('en'); await wait(100); return { before, during, after: [lbl(), menu()] };`);
  check('a switch to qps relabels the knobs and the menus, and back', r.before[0] === 'SPEED' && r.during[0] !== 'SPEED' && r.during[1] !== r.before[1] && r.during[2] === 'qps' && r.after[0] === 'SPEED', JSON.stringify(r));

  /* ── what a visiting model reads ── */
  r = await ev(`const d = document.getElementById('mir-describe'); return { hidden: d && d.hidden, text: d ? d.textContent : '', live: window.__MIR.describe() };`);
  const unshared = 'An LFO is driving this knob';
  check('describe() carries the windows, the clock and the shared page (LLM.md), not the unshared one', r.hidden === true && r.text.includes('### LLM') && r.text.includes(HEADING) && !r.live.includes(unshared)
    && /\| app\.size \| SIZE \|/.test(r.live) && /\| ring \| RING \| open/.test(r.live) && /\*\*Clock:\*\* playing · 30(\.0)? BPM · modulation on/.test(r.live), r.live.split('\n').filter((l) => /Clock|ring/.test(l)).join(' / '));

  /* ── play needs no modulation: every route and source gone, a reload, then Space plays (alpha.6: Sonnet) ── */
  await ev(`const M = A.mod.M; for (const x of M.routeList()) M.removeRoute(x.id); for (const x of M.sourceList()) M.removeSource(x.id); A.mod.persist(); return 0;`);
  await p.goto(BASE + PATH, 1200);
  for (let i = 0; i < 60 && !(await p.eval('!!window.__STARTER').catch(() => false)); i++) await sleep(150);
  await sleep(600); await ground();
  r = await ev(`return { routes: A.mod.M.routeList().length, sources: A.mod.M.sourceList().length, playing: A.playing() };`);
  await space();
  const played = await ev(`const t0 = performance.now(); await wait(300); return { playing: A.playing(), power: A.mod.power() };`);
  await ev(`A.mod.setPower(false); return 0;`); await space(); await space();
  const unpowered = await ev(`return A.playing();`);
  check('with no route and no source, after a reload, Space plays (and with modulation powered off too)', r.routes === 0 && !r.playing && played.playing && unpowered, JSON.stringify({ r, played, unpowered }));
  await ev(`A.mod.setPower(true); return 0;`);

  if (PLATES) {
    await ev(`A.mod.open(); return 0;`); await sleep(900);
    await p.shot('docs/plates/starter/windows.png');
    await ev(`A.mod.close(); A.gui.prefs.set('theme', 'light'); return 0;`); await sleep(900);
    await p.shot('docs/plates/starter/light.png');
    await ev(`A.gui.prefs.set('theme', 'dark'); return 0;`);
  }
  check('every press landed where the browser would deliver it (no missed hit-tests)', missed.length === 0, missed.join(' · '));
  const errs = p.logs.filter((l) => /EXCEPTION|error/.test(l));
  check('no page exceptions or console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
} catch (e) {
  results.push('FAIL  the run threw: ' + (e && e.stack || e));
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(`\nstarter.browser: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
