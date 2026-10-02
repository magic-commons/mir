/* starter.browser.mjs — the STARTER (starter/index.html) under a real browser, with real CDP pointer and keys; every
 * press is hit-tested with elementFromPoint first.  It loads with no console error; the greeting on the picture is
 * LLM.md's first heading; a knob drag changes the picture's number; the routed LFO moves SIZE; the PLAY window is built
 * only when it is first opened; GUI opens MIR OPTIONS; the pseudo-language relabels; SAVE in FOLDERS, then a knob
 * change, then opening the saved project restores it (and the save says so in a notice); the hidden describe element
 * holds the shared page and not the unshared one.
 *   MIR_BASE     the server (default http://127.0.0.1:8811)
 *   MIR_STARTER  the starter's path under it (default /starter/index.html; the built skill serves it at the same path)
 *   MIR_PLATES=1 writes docs/plates/starter/{dark,light}.png */
import fs from 'node:fs';
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8811';
const PATH = process.env.MIR_STARTER || '/starter/index.html';
const PLATES = !!process.env.MIR_PLATES;
const HEADING = fs.readFileSync(new URL('../LLM.md', import.meta.url), 'utf8').match(/^# (.+)$/m)[1];
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
const ev = async (body) => JSON.parse(await p.eval(`(async () => { const A = window.__STARTER, S = A && A.S;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const C = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; };
  ${body} })().then((v) => JSON.stringify(v === undefined ? null : v))`));
const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const key = async (k, code, vk, mods = 0) => {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  await sleep(200);
};
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
const knob = (key) => `A.params.find((p) => p.key === ${JSON.stringify(key)}).widget.root.querySelector('.k-dial')`;
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

  /* ── it loads, and greets with LLM.md ── */
  let r = await ev(`const h = document.querySelector('.mir-info-block h1');
    return { up: !!A, boot: !document.querySelector('.mir-boot:not([data-state="gone"])'), h1: h && h.textContent.trim(), page0: A.pages.list()[0].title, shared: A.pages.list()[0].shared };`);
  check('the starter loads and the boot card leaves', r.up && r.boot, JSON.stringify(r));
  check('the greeting on the picture is LLM.md\'s first heading, and page 0 is LLM.md, shared', r.h1 === HEADING && r.page0 === 'LLM' && r.shared === true, JSON.stringify(r));

  /* ── a real knob drag changes the picture's number ── */
  const s0 = await ev(`return S.speed;`);
  await dragUp(knob('speed'), 'SPEED knob');
  const s1 = await ev(`return S.speed;`);
  check('a knob drag (SPEED) changes the picture\'s parameter', s1 > s0 + 0.1, `${s0} → ${s1}`);

  /* ── the routed LFO moves SIZE by itself ── */
  r = await ev(`const seen = new Set(); for (let i = 0; i < 12; i++) { seen.add(S.size.toFixed(4)); await wait(80); } return { n: seen.size, routed: A.mod.isModulated('scene.size'), running: A.mod.running() };`);
  check('the LFO routed at start moves its target (SIZE) with no hand on it', r.routed && r.running && r.n >= 5, JSON.stringify(r));

  /* ── the lazy window is built only when it opens (+, then PLAY) ── */
  const built0 = await ev(`return { play: A.rack.isBuilt('play'), dom: !!document.querySelector('.dev [data-key-action="play"]') };`);
  await click(`document.getElementById('rackAdd')`, '+ button');
  await click(`document.querySelector('#rackAddList [data-win="play"]')`, '+ › PLAY');
  r = await ev(`return { play: A.rack.isBuilt('play'), open: A.rack.isOpen('play'), dom: !!document.querySelector('.dev [data-key-action="play"]') };`);
  check('the PLAY window is not built until it opens, then it is', !built0.play && !built0.dom && r.play && r.open && r.dom, JSON.stringify({ before: built0, after: r }));
  await click(`document.querySelector('.dev [data-key-action="play"]')`, 'PLAY switch');
  r = await ev(`return S.play;`);
  check('the PLAY switch it built works (a real click pauses the picture)', r === false);
  await key('p', 'KeyP', 80);
  check('the key table runs P (play) from the page', await ev(`return S.play;`) === true);

  /* ── GUI opens MIR OPTIONS from the menubar ── */
  await menu('GUI', 0);
  r = await ev(`const g = A.gui; const c = C(g.root), h = document.elementFromPoint(c.x, c.y); return { open: !g.root.hidden && g.root.getBoundingClientRect().width > 100, page: g.page, hit: !!h && g.root.contains(h) };`);
  check('GUI › MIR OPTIONS opens the GUI window, and it takes the pointer', r.open && r.page === 'options' && r.hit, JSON.stringify(r));
  await ev(`A.gui.close(); return 0;`);

  /* ── the help view, from ? ── */
  await key('?', 'Slash', 191, 8);
  r = await ev(`return A.help.isOpen();`);
  check('? opens the help view generated from the key table', r === true);
  await ev(`A.help.close(); return 0;`);

  /* ── the pseudo-language relabels, live ── */
  r = await ev(`const i18n = await import(new URL('../mir/core/i18n.js', location.href).href);
    const lbl = () => A.params[0].widget.root.querySelector('.k-lbl').textContent, menu = () => document.querySelector('.mb-btn[data-menu="WINDOW"]').textContent;
    const before = [lbl(), menu()]; await i18n.setLanguage('qps'); await wait(150); const during = [lbl(), menu(), document.documentElement.lang];
    await i18n.setLanguage('en'); await wait(100); return { before, during, after: [lbl(), menu()] };`);
  check('a switch to qps relabels the knobs and the menus, and back', r.before[0] === 'SPEED' && r.during[0] !== 'SPEED' && r.during[1] !== r.before[1] && r.during[2] === 'qps' && r.after[0] === 'SPEED', JSON.stringify(r));

  /* ── FOLDERS: F opens it; SAVE; a knob change; open the saved project: restored ── */
  await key('f', 'KeyF', 70);
  r = await ev(`return A.folders.isOpen();`);
  check('F (from the key table) opens FOLDERS', r === true);
  const saved = await ev(`return S.speed;`);
  await click(`A.folders.win.root.querySelector('[data-action="save"]')`, 'FOLDERS › SAVE');
  await sleep(300);
  r = await ev(`const e = A.folders.current(); return { name: e && e.name, n: A.folders.files.entries().length, notice: [...document.querySelectorAll('.mir-notice')].map((n) => n.dataset.kind) };`);
  check('SAVE in FOLDERS saves the project and says so in a notice', r.name && r.n === 1 && r.notice.length > 0, JSON.stringify(r));
  const name = r.name;
  await dragUp(knob('speed'), 'SPEED knob (after save)', -60);
  const changed = await ev(`return S.speed;`);
  const tile = `[...A.folders.win.root.querySelectorAll('.sv-card')].find((c) => c.dataset.name === ${JSON.stringify(name)}).querySelector('.sv-shot')`;
  await click(tile, 'saved tile (select)');
  await click(tile, 'saved tile (open)');
  const asked = await ev(`return !!A.folders.win.root.querySelector('.sv-ask');`);   // what is on screen is unsaved: FOLDERS asks first
  await click(`A.folders.win.root.querySelector('.sv-ask .sv-act:not(.sv-primary)')`, 'OPEN WITHOUT SAVING');
  await sleep(300);
  const back = await ev(`return S.speed;`);
  check('changing a knob, then opening the saved project (FOLDERS asks first: OPEN WITHOUT SAVING), restores it', asked && Math.abs(changed - saved) > 0.1 && Math.abs(back - saved) < 1e-6, `saved ${saved} · changed ${changed} · opened ${back} · asked ${asked}`);

  /* ── what a visiting model reads ── */
  r = await ev(`const d = document.getElementById('mir-describe'); return { hidden: d && d.hidden, text: d ? d.textContent : '', live: window.__MIR.describe() };`);
  const unshared = 'An LFO is driving this knob';
  check('the hidden describe element holds the shared page (LLM.md) and not the unshared one', r.hidden === true && r.text.includes('### LLM') && r.text.includes(HEADING) && !r.text.includes(unshared) && !r.live.includes(unshared) && /\| scene\.size \| SIZE \|/.test(r.text), r.text.split('\n')[0]);
  r = await ev(`const f = A.folders.win.root.querySelector('.sv-name-input'); f.focus(); f.value = 'zebra-typed-in-a-field'; f.dispatchEvent(new Event('input', { bubbles: true })); return window.__MIR.dump();`);
  check('dump() never carries what is in a field, nor the unshared page', !r.includes('zebra-typed-in-a-field') && !r.includes(unshared) && /MIR 1\.5/.test(r));
  await ev(`const f = A.folders.win.root.querySelector('.sv-name-input'); f.value = ''; f.blur(); return 0;`);

  if (PLATES) {
    await ev(`A.folders.close(); A.rack.close('play'); return 0;`);
    await p.goto(BASE + PATH, 2500); await sleep(900);
    await p.shot('docs/plates/starter/dark.png');
    await ev(`A.gui.prefs.set('theme', 'light'); return 0;`); await sleep(900);
    await p.shot('docs/plates/starter/light.png');
    await ev(`A.gui.prefs.set('theme', 'dark'); return 0;`);
    await key('Escape', 'Escape', 27); await key('m', 'KeyM', 77); await sleep(900);   // the greeting leaves; M opens modulation
    await p.shot('docs/plates/starter/modulation.png');
    await ev(`A.mod.close(); return 0;`);
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
