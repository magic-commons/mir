/* folders.browser.mjs — FOLDERS under a real browser (gallery/folders.html ?reset&test), with real CDP input.
 * Every press is hit-tested with elementFromPoint first (the 2026-09-18 dead-window bug passed every synthetic-click
 * gate; only a hit-test catches it).  The window takes the pointer everywhere it should; SAVE then a knob shows the
 * unsaved mark; opening another project restores the knobs, the colour and the pages; NEW is the empty project; a
 * failed open rolls back and says so (?break); a tile carried onto a folder lights it and lands there, and Escape
 * mid-carry leaves it where it was; a chip relocates; empty glass moves the window and a tile does not; the transport
 * dodges; export as .mir and as a picture, and dropping each back opens the project; a reload keeps the library.
 * Plates: PLATES=1 writes docs/plates/folders/{dark,light,carry}.png.
 * Standalone: MIR_BASE=http://127.0.0.1:8801 node tests/folders.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8801';
const PLATES = !!process.env.PLATES;
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
const ready = async (q) => { try { await p.eval('window.__old = true'); } catch {} await p.goto(BASE + '/gallery/folders.html' + q, 900); for (let i = 0; i < 80 && !(await p.eval('!window.__old && !!window.__ready').catch(() => false)); i++) await sleep(100); await sleep(250); };
const ev = async (body) => JSON.parse(await p.eval(`(async () => { const F = __F.folders, G = F.gallery, S = __F.S;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const C = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2), left: b.left, top: b.top, width: b.width, height: b.height }; };
  const entry = (name) => F.files.entries().find((e) => e.name === name);
  const tile = (name) => [...F.win.root.querySelectorAll('.sv-card')].find((c) => c.dataset.name === name);
  ${body} })().then(JSON.stringify)`));
const mouse = (type, x, y, mods = 0) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, modifiers: mods });
const key = async (k, code = k, vk = 0) => {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk });
  if (k === 'Enter') await p.send('Input.dispatchKeyEvent', { type: 'char', key: k, code, text: '\r', windowsVirtualKeyCode: vk });   // a button activates on the keypress
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
};
/** the point an element would be pressed at, and whether elementFromPoint finds it (or something inside it) there */
const at = async (expr) => ev(`const el = ${expr}; if (!el) return null; const c = C(el); const h = document.elementFromPoint(c.x, c.y); return { ...c, hit: !!h && (h === el || el.contains(h)), got: h && (h.className && h.className.baseVal === undefined ? h.className : h.tagName) };`);
const missed = [];
/** a real click on an element, refused (and recorded) if the browser would not deliver it there */
async function click(expr, label = expr) {
  const c = await at(expr);
  if (!c) { missed.push(label + ' (absent)'); return false; }
  if (!c.hit) { missed.push(label + ' (hit ' + c.got + ')'); return false; }
  await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y); await mouse('mouseReleased', c.x, c.y); await sleep(160);
  return true;
}
const dragBy = async (x, y, dx, dy, { mods = 0, steps = 10, end, mid } = {}) => {
  await mouse('mouseMoved', x, y, mods); await mouse('mousePressed', x, y, mods);
  for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', x + Math.round((dx * i) / steps), y + Math.round((dy * i) / steps), mods); await sleep(18); }
  await sleep(80);
  if (mid) await mid();
  if (end) await end(); else await mouse('mouseReleased', x + dx, y + dy, mods);
  await sleep(160);
};
const T = (sel) => `F.win.root.querySelector(${JSON.stringify(sel)})`;

try {
  await ready('?reset&test');

  /* ── the window takes the pointer (the 09-18 bug cannot recur): glass, toolbar, fields, folders, chips ── */
  let r = await ev(`const root = F.win.root, out = [];
    const probe = (el, label) => { if (!el) { out.push(label + ' absent'); return; } const c = C(el), h = document.elementFromPoint(c.x, c.y); if (!h || !(h === el || el.contains(h))) out.push(label + ' → ' + (h ? h.tagName + '.' + h.className : 'nothing')); };
    for (const b of root.querySelectorAll('.sv-toolbar .trig')) probe(b, 'verb ' + b.dataset.action);
    probe(root.querySelector('.sv-name-input'), 'name field'); probe(root.querySelector('.sv-projects-heading'), 'glass (projects heading)');
    for (const f of root.querySelectorAll('.sv-folder-shot')) probe(f, 'folder');
    for (const ch of F.win.rail.el.querySelectorAll('.mir-chip')) probe(ch, 'chip ' + ch.dataset.mirChip);
    const b = root.getBoundingClientRect(), low = document.elementFromPoint(b.left + 40, b.bottom - 60);
    return { missed: out, low: !!low && root.contains(low), id: root.id, pe: getComputedStyle(root).pointerEvents, title: root.getAttribute('aria-label'), rail: F.win.rail.el.getAttribute('aria-label') };`);
  check('hit-test: every verb, the field, the glass, each folder, each chip and the empty bottom of the pane are the window\'s (elementFromPoint)', !r.missed.length && r.low, JSON.stringify(r.missed));
  check('the window takes the pointer by its class, with no id at all (nothing for a retitle to break)', r.id === '' && r.pe === 'auto' && r.title === 'FOLDERS' && /^FOLDERS window controls$/.test(r.rail), JSON.stringify(r));

  /* ── open a starter by real clicks: folder, tile (select), tile (open) ── */
  await click(T('.sv-folder[data-folder="STARTERS"] .sv-folder-shot'), 'STARTERS folder');
  await click(`tile('TIDE').querySelector('.sv-shot')`, 'TIDE select');
  await click(`tile('TIDE').querySelector('.sv-shot')`, 'TIDE open');
  await sleep(200);
  r = await ev(`return { S: { ...S }, pages: __F.pages.list().map((x) => x.title), cur: ${T('.fo-current')}.textContent, dirty: ${T('.fo-head')}.dataset.dirty || null };`);
  check('opening TIDE restores the knobs, the colour and the pages, and names it', r.S.rings === 9 && Math.abs(r.S.twist - 0.12) < 1e-9 && r.S.hue === 190 && r.pages.join() === 'TIDE' && r.cur === 'TIDE' && !r.dirty, JSON.stringify(r));

  /* ── SAVE over a starter is the user's own copy; then a knob change shows the unsaved mark; SAVE writes in place ── */
  await click(T('[data-action="save"]'), 'SAVE');
  await sleep(300);
  r = await ev(`const e = F.current(); return { name: e && e.name, ro: !!(e && e.facts.readOnly), n: F.files.entries().length, dirty: ${T('.fo-head')}.dataset.dirty || null };`);
  check('SAVE on a read-only starter saves the user\'s own copy (TIDE stays as shipped)', r.name === 'TIDE 2' && !r.ro && r.n === 7 && !r.dirty, JSON.stringify(r));
  const knobAt = await at(`__F.rings.root.querySelector('.k-dial')`);
  await dragBy(knobAt.x, knobAt.y, 0, -60);
  await sleep(120);
  r = await ev(`return { rings: S.rings, dirty: ${T('.fo-head')}.dataset.dirty || null, mark: ${T('.fo-mark')}.textContent };`);
  check('a real drag on the RINGS knob changes the picture and FOLDERS marks the project unsaved', r.rings !== 9 && r.dirty === 'true' && /UNSAVED/.test(r.mark), JSON.stringify(r));
  const ringsSaved = r.rings;
  await click(T('[data-action="save"]'), 'SAVE again');
  await sleep(300);
  r = await ev(`const e = F.current(); return { name: e.name, rings: e.payload.parts.knobs.rings, n: F.files.entries().length, dirty: ${T('.fo-head')}.dataset.dirty || null };`);
  check('SAVE writes over the open project in place: same entry, new knobs, the mark goes out', r.name === 'TIDE 2' && r.rings === ringsSaved && r.n === 7 && !r.dirty, JSON.stringify(r));

  /* ── another project: EMBER; then NEW = the empty project ── */
  await click(`tile('EMBER').querySelector('.sv-shot')`, 'EMBER select');
  await click(`tile('EMBER').querySelector('.sv-shot')`, 'EMBER open');
  await sleep(250);
  r = await ev(`return { S: { ...S }, pages: __F.pages.list().map((x) => x.title), cur: ${T('.fo-current')}.textContent };`);
  check('opening EMBER restores its knobs, colour and pages', r.S.rings === 6 && r.S.hue === 18 && r.pages.join() === 'EMBER' && r.cur === 'EMBER', JSON.stringify(r));
  await click(T('[data-action="fresh"]'), 'NEW');
  await sleep(250);
  r = await ev(`return { S: { ...S }, pages: __F.pages.list().length, cur: ${T('.fo-current')}.textContent, current: F.current() };`);
  check('NEW is the empty project: every part restored with null (the app\'s own empty), no pages, UNTITLED', r.S.rings === 3 && r.S.twist === 0 && r.S.hue === 210 && r.pages === 0 && r.cur === 'UNTITLED' && r.current === null, JSON.stringify(r));

  /* ── SAVE AS into ROOT, so ROOT has tiles to carry ── */
  await click(T('.sv-crumb[data-folder=""]'), 'ROOT crumb');
  await ev(`const n = F.win.root.querySelector('.sv-name-input'); n.value = 'MINE'; n.dispatchEvent(new Event('input')); return 0;`);
  await click(T('[data-action="saveAs"]'), 'SAVE AS');
  await sleep(300);
  await ev(`const n = F.win.root.querySelector('.sv-name-input'); n.value = 'SPARE'; n.dispatchEvent(new Event('input')); return 0;`);
  await click(T('[data-action="saveAs"]'), 'SAVE AS (2)');
  await sleep(300);
  r = await ev(`return { root: F.files.entries().filter((e) => e.folder === '').map((e) => e.name).sort(), cur: F.current() && F.current().name };`);
  check('SAVE AS makes new projects at ROOT, each named from the field', r.root.join() === 'MINE,SPARE' && r.cur === 'SPARE', JSON.stringify(r));

  /* ── drag a tile onto a folder: the folder lights (dotted, then solid), release lands it there ── */
  const winBefore = await ev(`return F.win.rect();`);
  const from = await at(`tile('MINE').querySelector('.sv-shot')`), to = await at(T('.sv-folder[data-folder="STUDIES"]'));
  let lit = null;
  await dragBy(from.x, from.y, to.x - from.x, to.y - from.y, { mid: async () => {
    lit = await ev(`const g = [...document.querySelectorAll('.mir-prox')].find((n) => n.dataset.prox === 'capture'), f = ${T('.sv-folder[data-folder="STUDIES"]')}.getBoundingClientRect();
      const near = [...document.querySelectorAll('.mir-prox[data-prox="near"]')].length;
      return g ? { capture: true, off: Math.max(Math.abs(g.getBoundingClientRect().left - f.left), Math.abs(g.getBoundingClientRect().top - f.top), Math.abs(g.getBoundingClientRect().width - f.width)), near, ghost: !!document.querySelector('.sv-ghost'), lifted: tile('MINE').classList.contains('lifted'), solid: getComputedStyle(g).borderTopStyle } : { capture: false, near };`);
    if (PLATES) await p.shot('docs/plates/folders/carry.png');
  } });
  await sleep(200);
  r = await ev(`return { folder: entry('MINE').folder, ghost: !!document.querySelector('.sv-ghost'), win: F.win.rect() };`);
  check('mid-carry: the folder under the hand is lit solid, exactly at its own rect, and the tile is lifted under a ghost', lit && lit.capture && lit.off < 1 && lit.ghost && lit.lifted && lit.solid === 'solid', JSON.stringify(lit));
  check('release on the folder moves the project there; the ghost is gone', r.folder === 'STUDIES' && !r.ghost, JSON.stringify(r));
  check('a drag that starts on a tile does not move the window', JSON.stringify(r.win) === JSON.stringify(winBefore), JSON.stringify({ before: winBefore, after: r.win }));

  const from2 = await at(`tile('SPARE').querySelector('.sv-shot')`), to2 = await at(T('.sv-folder[data-folder="STARTERS"]'));
  let lit2 = null;
  await dragBy(from2.x, from2.y, to2.x - from2.x, to2.y - from2.y, { mid: async () => { lit2 = await ev(`return !!document.querySelector('.mir-prox[data-prox="capture"]');`); }, end: async () => { await key('Escape', 'Escape', 27); await sleep(60); await mouse('mouseReleased', to2.x, to2.y); } });
  r = await ev(`return { folder: entry('SPARE').folder, guides: document.querySelectorAll('.mir-prox[data-prox]').length, ghost: !!document.querySelector('.sv-ghost'), lifted: !!F.win.root.querySelector('.sv-card.lifted') };`);
  check('Escape mid-carry: the tile stays where it was, the guides and the ghost go', lit2 && r.folder === '' && r.guides === 0 && !r.ghost && !r.lifted, JSON.stringify({ lit2, ...r }));

  /* ── the keyboard way: the tile's MOVE button opens MOVE TO, a folder button moves it ── */
  await sleep(450);                                              // the click a carry's release makes is swallowed for 400 ms
  await click(`tile('SPARE').querySelector('.sv-shot')`, 'SPARE select');
  await click(`tile('SPARE').querySelector('.sv-move-btn')`, 'SPARE move button');
  r = await ev(`const f = document.activeElement; return { focus: f && f.dataset.folder, list: [...F.win.root.querySelectorAll('.sv-moveto .trig')].map((b) => b.dataset.folder) };`);
  await key('Enter', 'Enter', 13); await sleep(150);
  const moved = await ev(`return entry('SPARE').folder;`);
  check('MOVE TO: the menu lists every folder, the keyboard lands on the first, Enter moves the project there', r.list.length >= 2 && r.focus === r.list[0] && moved === r.list[0], JSON.stringify({ ...r, moved }));

  /* ── a chip relocates (Shift-drag on the grip); empty glass moves the window; the transport dodges ── */
  const grip = await at(`F.win.rail.grip`), box0 = await ev(`return F.win.rect();`);
  await dragBy(grip.x, grip.y, Math.round(box0.width + 60), 0, { mods: 8 });
  await sleep(450);
  r = await ev(`const w = F.win.rect(), rl = F.win.rail.el.getBoundingClientRect(); return { side: F.win.state().chipSide, railLeft: rl.left, right: w.left + w.width };`);
  check('Shift-drag on the grip moves the chip rail to the window\'s right edge', r.side === 'right' && r.railLeft >= r.right - 1, JSON.stringify(r));
  const glass = await at(T('.sv-projects-heading'));
  const seat0 = await ev(`return document.getElementById('transport').dataset.seat;`);
  const b1 = await ev(`return F.win.rect();`);
  const dy = Math.round(800 - 120 - b1.top - b1.height + 40);
  await dragBy(glass.x, glass.y, -40, dy);
  await sleep(700);
  r = await ev(`return { win: F.win.rect(), seat: document.getElementById('transport').dataset.seat };`);
  check('empty glass (the PROJECTS heading) drags the window with the hand', Math.abs(r.win.left - (b1.left - 40)) <= 1 && Math.abs(r.win.top - Math.min(b1.top + dy, 800 - 52)) <= 1, JSON.stringify({ b1, after: r.win }));
  check('the window reports its rect: over the bottom seat, the transport takes the top', seat0 === 'bottom' && r.seat === 'top', JSON.stringify({ seat0, seat: r.seat }));
  await ev(`F.win.place({ x: 600, y: 64 }); return 0;`);
  await sleep(500);

  /* ── export: a .mir file and a picture; NEW; drop each back on the window and it opens ── */
  await ev(`G.go('STUDIES'); return 0;`);
  await click(`tile('MOSS').querySelector('.sv-shot')`, 'MOSS select');
  await click(T('[data-action="export"]'), 'EXPORT');
  await click(T('[data-export="mir"]'), 'EXPORT .MIR');
  await click(`tile('MOSS').querySelector('.sv-shot')`, 'MOSS select (2)');
  await click(T('[data-action="export"]'), 'EXPORT (2)');
  await click(T('[data-export="png"]'), 'EXPORT PICTURE');
  await sleep(500);
  r = await ev(`const d = __F.downloads; const text = d[0] ? JSON.parse(await d[0].blob.text()) : null; const png = d[1] ? new Uint8Array(await d[1].blob.arrayBuffer()) : null;
    return { names: d.map((x) => x.name), kind: text && text.kind, app: text && text.app, rings: text && text.data.parts.knobs.rings, png: png && png[1] === 80 && png.length };`);
  check('EXPORT gives MOSS.mir (a project envelope for this app) and MOSS.png', r.names.join() === 'MOSS.mir,MOSS.png' && r.kind === 'project' && r.app === 'mir-folders-demo' && r.rings === 12 && r.png > 100, JSON.stringify(r));
  const dropBack = async (i, label) => {
    await click(T('[data-action="fresh"]'), 'NEW before ' + label);
    await sleep(200);
    const ask = await ev(`return !!F.win.root.querySelector('.sv-ask');`);
    if (ask) await click(T('.sv-ask .sv-danger'), 'NEW WITHOUT SAVING');
    await sleep(200);
    return ev(`const d = __F.downloads[${i}], dt = new DataTransfer(); dt.items.add(new File([d.blob], d.name, { type: d.blob.type }));
      const n0 = F.files.entries().length;
      F.win.root.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      for (let k = 0; k < 40 && F.files.entries().length === n0; k++) await wait(50);
      await wait(400);
      return { S: { ...S }, pages: __F.pages.list().map((x) => x.title), cur: F.current() && F.current().name, n: F.files.entries().length - n0 };`);
  };
  r = await dropBack(0, '.mir');
  check('dropping MOSS.mir on the window adds it and opens it: knobs, colour, pages', r.S.rings === 12 && r.S.hue === 110 && r.pages.join() === 'MOSS' && r.n === 1 && /^MOSS/.test(r.cur), JSON.stringify(r));
  r = await dropBack(1, '.png');
  check('dropping MOSS.png (the picture carries the project) opens it too', r.S.rings === 12 && r.S.hue === 110 && r.pages.join() === 'MOSS' && r.n === 1, JSON.stringify(r));
  r = await ev(`const env = { mir: 1, kind: 'project', kit: '1.5.0-alpha.3', app: 'automata', made: '2026-10-01', data: { parts: {} } };
    const dt = new DataTransfer(); dt.items.add(new File([JSON.stringify(env)], 'theirs.mir', { type: 'application/json' }));
    const n0 = F.files.entries().length;
    F.win.root.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); await wait(400);
    return { n: F.files.entries().length - n0, status: F.win.root.querySelector('.fo-status').textContent, tone: F.win.root.querySelector('.fo-status').dataset.tone };`);
  check('a project for another app is refused, with the reason', r.n === 0 && /automata/.test(r.status) && r.tone === 'warn', JSON.stringify(r));

  if (PLATES) { await ev(`G.go('STUDIES'); G.select(entry('DUSK').id); F.say(''); return 0;`); await sleep(400); await p.shot('docs/plates/folders/dark.png'); }

  /* ── a reload keeps the library ── */
  const names = await ev(`return F.files.entries().map((e) => e.folder + '/' + e.name).sort();`);
  await ready('?test');
  r = await ev(`return { names: F.files.entries().map((e) => e.folder + '/' + e.name).sort(), seeded: F.seeded && F.seeded.added };`);
  check('a reload keeps the library exactly, and seeds nothing twice', JSON.stringify(r.names) === JSON.stringify(names) && r.seeded === 0, JSON.stringify({ n: r.names.length, seeded: r.seeded }));

  /* ── a failed open rolls back (?break: the colour part refuses HALO's hue) ── */
  await ready('?test&break');
  await ev(`G.go('STARTERS'); return 0;`);
  const before = await ev(`return { ...S, pages: __F.pages.list().length };`);
  await click(`tile('HALO').querySelector('.sv-shot')`, 'HALO select');
  await click(`tile('HALO').querySelector('.sv-shot')`, 'HALO open');
  await sleep(300);
  r = await ev(`return { S: { ...S, pages: __F.pages.list().length }, status: F.win.root.querySelector('.fo-status').textContent, tone: F.win.root.querySelector('.fo-status').dataset.tone, cur: F.current() };`);
  check('an open that fails rolls back to what was on screen, and says so', JSON.stringify(r.S) === JSON.stringify(before) && /colour/.test(r.status) && /back/.test(r.status) && r.tone === 'warn' && r.cur === null, JSON.stringify(r));

  if (PLATES) {
    await ready('?test&theme=light');
    await ev(`G.go('STUDIES'); G.select(entry('MOSS').id); return 0;`); await sleep(400);
    await p.shot('docs/plates/folders/light.png');
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
console.log(`\nfolders.browser: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
