/* notebook-pages.browser.mjs — the notebook's TABS and THE SHELF in a real browser (gallery/shell.html), real input
 * through CDP.  Every control is hit-tested with elementFromPoint before it is pressed.  Proves: a tab click shows its
 * text · typing writes the pages model · + adds · rename (double-click, F2) · delete asks first · a drag reorder lands
 * and reverses exactly · Ctrl+←/→ reorder · ←/→ rove · the eye flips `shared` · OPEN ANOTHER PROJECT swaps the
 * project tabs and leaves YOURS and the shelf alone · a dropped .md becomes a page · copy to the shelf and back gives
 * independent copies · the shelf face's delete asks first and its open fills YOURS.
 * Standalone: MIR_BASE=http://127.0.0.1:8794 node tests/notebook-pages.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8790';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  await p.goto(BASE + '/gallery/shell.html', 1500);
  for (let i = 0; i < 40 && !(await p.eval(`typeof __MIR_SHELL === 'object'`)); i++) await sleep(100);
  const ev = async (body) => JSON.parse(await p.eval(`(async () => { const S = __MIR_SHELL.parts, NB = S.notebook, P = S.pages, SH = S.shelf, nb = document.getElementById('notebook');
    const ta = nb.querySelector('.nb-text'), ti = nb.querySelector('.nb-title');
    const tab = (k) => nb.querySelector('.nb-tab[data-tab="' + k + '"]');
    const order = () => P.list().map((r) => r.id); const strip = () => [...nb.querySelectorAll('.nb-tablist .nb-tab')].map((t) => t.dataset.tab);
    ${body} })().then(JSON.stringify)`));
  const mouse = (type, x, y, clickCount = 1) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount });
  const key = async (k, code, vk, mods = 0) => {
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  };
  const type = (text) => p.send('Input.insertText', { text });
  /** the centre of `sel` (an expression), and whether elementFromPoint there lands inside it */
  const at = async (sel) => JSON.parse(await p.eval(`(() => { const e = ${sel}; const b = e.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
    const h = document.elementFromPoint(x, y); return JSON.stringify({ x, y, hit: !!h && (h === e || e.contains(h)), left: b.left, right: b.right, top: b.top, width: b.width }); })()`));
  const press = async (sel, name, clicks = 1) => {
    if (!(await p.eval(`!!(${sel})`))) { check('present: ' + name, false, 'not in the DOM'); return false; }
    const c = await at(sel); if (!c.hit) check('hit-test: ' + name, false, 'elementFromPoint misses it');
    for (let n = 1; n <= clicks; n++) { await mouse('mouseMoved', c.x, c.y, n); await mouse('mousePressed', c.x, c.y, n); await mouse('mouseReleased', c.x, c.y, n); }
    await sleep(60); return c.hit;
  };
  let mid = null;
  const dragX = async (sel, toX) => {
    const c = await at(sel); await mouse('mouseMoved', c.x, c.y, 0); await mouse('mousePressed', c.x, c.y);
    for (let i = 1; i <= 10; i++) { await mouse('mouseMoved', Math.round(c.x + ((toX - c.x) * i) / 10), c.y, 0); await sleep(20); }
    await sleep(60);
    mid = JSON.parse(await p.eval(`JSON.stringify({ carried: !!document.querySelector('#notebook .nb-tab[data-carried]'), capture: document.querySelectorAll('.mir-prox[data-shape="slot"][data-prox="capture"]').length })`));
    await mouse('mouseReleased', toX, c.y); await sleep(500); return c.hit;
  };

  await p.eval(`__MIR_SHELL.notebook('notes')`); await sleep(200);
  let r = await ev(`return { strip: strip(), sel: NB.selected, roles: [...nb.querySelectorAll('.nb-tab-b')].map((b) => b.getAttribute('role') + ':' + b.tabIndex + ':' + b.getAttribute('aria-selected')),
    list: nb.querySelector('.nb-tablist').getAttribute('role'), mark: !tab('p1').querySelector('.nb-tab-mark').hidden && tab('p2').querySelector('.nb-tab-mark').hidden };`);
  check('the strip: YOURS, then the project\'s three pages; a real tablist with one roving stop', r.strip.join() === 'yours,p1,p2,p3' && r.list === 'tablist' && r.roles.join() === 'tab:0:true,tab:-1:false,tab:-1:false,tab:-1:false', JSON.stringify(r));
  check('page 0 carries the greeting mark, and only it', r.mark);

  /* click a tab: its text shows */
  const hitAll = await ev(`return [...nb.querySelectorAll('.nb-tab-b, .nb-tab-eye, .nb-tab-add')].filter((b) => b.getClientRects().length).map((b) => { const r = b.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return h && (h === b || b.contains(h)); }).every(Boolean);`);
  check('hit-test: every tab, eye and + is what elementFromPoint finds', hitAll);
  await press(`document.querySelector('.nb-tab[data-tab="p2"] .nb-tab-b')`, 'tab p2');
  r = await ev(`return { sel: NB.selected, text: ta.value, title: ti.value, md: P.get('p2').md, aria: tab('p2').querySelector('.nb-tab-b').getAttribute('aria-selected') };`);
  check('a click on a tab shows its text and title', r.sel === 'p2' && r.text === r.md && r.title === 'Tour' && r.aria === 'true', JSON.stringify({ sel: r.sel, title: r.title }));

  /* typing writes the model (debounced), the tab label follows the title */
  await press(`document.querySelector('#notebook .nb-text')`, 'the text');
  await p.eval(`(() => { const t = document.querySelector('#notebook .nb-text'); t.setSelectionRange(t.value.length, t.value.length); })()`);
  await type(' And more.'); await sleep(450);
  r = await ev(`return { md: P.get('p2').md, ta: ta.value };`);
  check('typing in a page writes pages.update (after the debounce)', r.md.endsWith(' And more.') && r.md === r.ta, JSON.stringify(r.md.slice(-20)));

  /* + adds a page, selected, with its title field ready */
  await press(`document.querySelector('#notebook .nb-tab-add')`, '+');
  await type('Fresh'); await p.eval(`document.querySelector('#notebook .nb-text').focus()`); await sleep(50);
  r = await ev(`const rows = P.list(); const last = rows[rows.length - 1]; return { n: rows.length, sel: NB.selected, id: last.id, title: last.title, label: tab(last.id).querySelector('.nb-tab-name').textContent };`);
  check('+ adds a page at the end, selects it, and its title is typed in place', r.n === 4 && r.sel === r.id && r.title === 'Fresh' && r.label === 'Fresh', JSON.stringify(r));
  const fresh = r.id;

  /* rename: double-click, then F2 + Escape changes nothing */
  await press(`document.querySelector('.nb-tab[data-tab="p2"] .nb-tab-b')`, 'tab p2 (double-click)', 2);
  r = await ev(`const i = nb.querySelector('.nb-tab[data-tab="p2"] .nb-tab-in'); return { input: !!i, focused: document.activeElement === i };`);
  await type('Guided tour'); await key('Enter', 'Enter', 13); await sleep(60);
  let r2 = await ev(`return { title: P.get('p2').title, field: ti.value, label: tab('p2').querySelector('.nb-tab-name').textContent, focus: document.activeElement === tab('p2').querySelector('.nb-tab-b') };`);
  check('double-click renames in place: the model, the title field and the tab agree', r.input && r.focused && r2.title === 'Guided tour' && r2.field === 'Guided tour' && r2.label === 'Guided tour' && r2.focus, JSON.stringify({ r, r2 }));
  await key('F2', 'F2', 113); await sleep(30);
  r = await ev(`return !!nb.querySelector('.nb-tab-in');`);
  await type('nope'); await key('Escape', 'Escape', 27); await sleep(30);
  r2 = await ev(`return P.get('p2').title;`);
  check('F2 renames too, and Escape leaves the name as it was', r === true && r2 === 'Guided tour', JSON.stringify(r2));

  /* delete asks first */
  await press(`document.querySelector('.nb-tab[data-tab="${fresh}"] .nb-tab-b')`, 'tab ' + fresh);
  await press(`document.querySelector('.nb-tab[data-tab="${fresh}"] .nb-tab-x')`, 'the × on the selected tab');
  r = await ev(`return { ask: !!tab('${fresh}').querySelector('.nb-tab-ask'), n: P.list().length };`);
  await press(`document.querySelector('.nb-tab[data-tab="${fresh}"] .nb-tab-no')`, 'no');
  r2 = await ev(`return { ask: !!tab('${fresh}').querySelector('.nb-tab-ask'), n: P.list().length };`);
  await press(`document.querySelector('.nb-tab[data-tab="${fresh}"] .nb-tab-x')`, 'the × again');
  await press(`document.querySelector('.nb-tab[data-tab="${fresh}"] .nb-tab-yes')`, 'yes');
  await sleep(400);
  const r3 = await ev(`return { n: P.list().length, gone: !tab('${fresh}'), sel: NB.selected, text: ta.value === (P.get(NB.selected) || {}).md };`);
  check('delete asks "delete? yes / no" on the tab: no keeps it, yes removes it and selects a neighbour', r.ask && r.n === 4 && !r2.ask && r2.n === 4 && r3.n === 3 && r3.gone && r3.sel === 'p3' && r3.text, JSON.stringify({ r, r2, r3 }));

  /* drag reorder: lands, then reverses exactly */
  const o0 = await ev(`return order();`);
  const p3 = await at(`document.querySelector('.nb-tab[data-tab="p3"]')`);
  await dragX(`document.querySelector('.nb-tab[data-tab="p1"] .nb-tab-b')`, Math.round(p3.right + 2));
  r = await ev(`return { order: order(), strip: strip(), carried: !!nb.querySelector('[data-carried]'), tr: [...nb.querySelectorAll('.nb-tab')].map((t) => t.style.translate).join(''), guides: [...document.querySelectorAll('.mir-prox[data-prox]')].length };`);
  check('mid-drag the tab is carried and one drop slot (core/proximity.js) is captured', mid.carried && mid.capture === 1, JSON.stringify(mid));
  check('a drag carries p1 past p3 and it lands there (model and strip agree)', r.order.join() === 'p2,p3,p1' && r.strip.join() === 'yours,p2,p3,p1' && !r.carried && r.tr === '', JSON.stringify(r));
  const p2 = await at(`document.querySelector('.nb-tab[data-tab="p2"]')`);
  await dragX(`document.querySelector('.nb-tab[data-tab="p1"] .nb-tab-b')`, Math.round(p2.left - 2));
  r = await ev(`return { order: order(), strip: strip(), sel: NB.selected };`);
  check('…and dragged back before p2, the order is exactly what it was', r.order.join() === o0.join() && r.strip.join() === 'yours,' + o0.join(), JSON.stringify({ o0, r }));

  /* keyboard: Ctrl+→ / Ctrl+← move; ← / → rove and select */
  await p.eval(`document.querySelector('.nb-tab[data-tab="p1"] .nb-tab-b').focus()`);
  await key('ArrowRight', 'ArrowRight', 39, 2); await sleep(400);
  r = await ev(`return { order: order(), focus: document.activeElement === tab('p1').querySelector('.nb-tab-b') };`);
  await key('ArrowLeft', 'ArrowLeft', 37, 2); await sleep(400);
  r2 = await ev(`return order();`);
  check('Ctrl+→ moves the focused page right, Ctrl+← back, focus stays on it', r.order.join() === 'p2,p1,p3' && r.focus && r2.join() === o0.join(), JSON.stringify({ r, r2 }));
  await key('ArrowRight', 'ArrowRight', 39); await sleep(60);
  r = await ev(`return { sel: NB.selected, focus: document.activeElement === tab('p2').querySelector('.nb-tab-b'), stops: [...nb.querySelectorAll('.nb-tab-b')].filter((b) => b.tabIndex === 0).length };`);
  check('→ moves to the next tab and selects it; one tab stop', r.sel === 'p2' && r.focus && r.stops === 1, JSON.stringify(r));

  /* the eye */
  await press(`document.querySelector('.nb-tab[data-tab="p3"] .nb-tab-eye')`, 'the eye on p3');
  r = await ev(`return { shared: P.get('p3').shared, pressed: tab('p3').querySelector('.nb-tab-eye').getAttribute('aria-pressed') };`);
  await press(`document.querySelector('.nb-tab[data-tab="p3"] .nb-tab-eye')`, 'the eye again');
  r2 = await ev(`return P.get('p3').shared;`);
  check('the eye flips shared on and off, and shows it', r.shared === true && r.pressed === 'true' && r2 === false, JSON.stringify({ r, r2 }));

  /* YOURS: write a note, then open another project */
  await press(`document.querySelector('.nb-tab[data-tab="yours"] .nb-tab-b')`, 'YOURS');
  await press(`document.querySelector('#notebook .nb-text')`, 'the text');
  await type('my own note'); await sleep(350);
  const before = await ev(`return { yours: NB.yours, shelf: localStorage.getItem(SH.key), label: tab('yours').querySelector('.nb-tab-name').textContent };`);
  await press(`document.querySelector('.demo-project')`, 'OPEN ANOTHER PROJECT');
  r = await ev(`return { strip: strip(), names: P.list().map((x) => x.title), yours: NB.yours, shelf: localStorage.getItem(SH.key), label: tab('yours').querySelector('.nb-tab-name').textContent, sel: NB.selected, text: ta.value };`);
  check('another project: its tabs replace the old ones', r.names.join() === 'Hydrogen 2p,Spectrum' && r.strip.join() === 'yours,p1,p2', JSON.stringify(r.names));
  check('…YOURS and the shelf are untouched', JSON.stringify(r.yours) === JSON.stringify(before.yours) && before.yours.md === 'my own note' && r.shelf === before.shelf && r.label === before.label && r.sel === 'yours' && r.text === 'my own note', JSON.stringify({ before: before.yours, after: r.yours }));
  await press(`document.querySelector('.nb-tab[data-tab="p2"] .nb-tab-b')`, 'Spectrum');
  await press(`document.querySelector('.demo-project')`, 'OPEN ANOTHER PROJECT (back)');
  r = await ev(`return { names: P.list().map((x) => x.title), sel: NB.selected, text: ta.value === P.greeting().md, p2: P.get('p2').md.endsWith(' And more.') };`);
  check('…and back: project A\'s pages return with their edits; a page that was open hands over to the new greeting', r.names.join() === 'The Mandelbrot set,Guided tour,Field notes' && r.sel === 'p1' && r.text && r.p2, JSON.stringify(r));

  /* a dropped .md becomes a page (the file drop is synthetic: headless Chromium cannot drag a file from disk) */
  r = await ev(`const dt = new DataTransfer(); dt.items.add(new File(['# Dropped\\n\\n$x^2$'], 'Dropped page.md', { type: 'text/markdown' }));
    const box = nb.getBoundingClientRect(), o = { dataTransfer: dt, bubbles: true, cancelable: true, clientX: box.left + 100, clientY: box.top + 200 };
    nb.querySelector('.nb-text').dispatchEvent(new DragEvent('dragover', o)); const ring = nb.hasAttribute('data-drop');
    nb.querySelector('.nb-text').dispatchEvent(new DragEvent('drop', o)); await new Promise((r) => setTimeout(r, 100));
    const last = P.list()[P.list().length - 1]; return { ring, after: nb.hasAttribute('data-drop'), title: last.title, md: last.md, sel: NB.selected === last.id };`);
  check('a .md dropped on the notebook becomes a page, selected, named for its file', r.ring && !r.after && r.title === 'Dropped page' && r.md === '# Dropped\n\n$x^2$' && r.sel, JSON.stringify(r));

  /* copy to the shelf and back: two independent copies */
  await press(`document.querySelector('.nb-tab[data-tab="p3"] .nb-tab-b')`, 'Field notes');
  await press(`document.querySelector('#notebook .nb-pg-copy')`, 'COPY TO SHELF');
  r = await ev(`return { has: SH.has('Field notes'), md: (SH.get('Field notes') || {}).md, page: P.get('p3').md };`);
  await press(`document.querySelector('#notebook .nb-text')`, 'the text');
  await p.eval(`(() => { const t = document.querySelector('#notebook .nb-text'); t.setSelectionRange(t.value.length, t.value.length); })()`);
  await type(' EDITED IN THE PROJECT'); await sleep(400);
  r2 = await ev(`return { shelf: SH.get('Field notes').md, page: P.get('p3').md };`);
  check('COPY TO SHELF makes a shelf note; editing the page does not change it', r.has && r.md === r.page && r2.page.endsWith('EDITED IN THE PROJECT') && r2.shelf === r.md, JSON.stringify({ r, r2 }));
  await press(`document.querySelector('#notebook .nb-shelf-btn')`, 'the ▤ shelf button');
  r = await ev(`return { face: NB.face, row: !!nb.querySelector('.nt-item[data-path="Field notes"]') };`);
  await press(`document.querySelector('.nt-item[data-path="Field notes"] .nt-toproject')`, '→ project on the shelf row');
  r2 = await ev(`const rows = P.list(), last = rows[rows.length - 1]; return { n: rows.length, id: last.id, title: last.title, md: last.md, shelf: SH.get('Field notes').md };`);
  check('the shelf face lists it, and → copies it into the project as a new page', r.face === 'shelf' && r.row && r2.title === 'Field notes' && r2.md === r2.shelf && r2.n === 5, JSON.stringify({ r, r2 }));
  await p.eval(`__MIR_SHELL.notebook('notes')`); await sleep(100);
  await press(`document.querySelector('.nb-tab[data-tab="${r2.id}"] .nb-tab-b')`, 'the copied page');
  await press(`document.querySelector('#notebook .nb-text')`, 'the text');
  await type('NEW COPY '); await sleep(400);
  r = await ev(`return { copy: P.get('${r2.id}').md, shelf: SH.get('Field notes').md, orig: P.get('p3').md };`);
  check('…and the copy is its own: editing it changes neither the shelf note nor the page it came from', r.copy.endsWith('NEW COPY ') && r.shelf === r2.shelf && r.orig.endsWith('EDITED IN THE PROJECT') && !r.orig.includes('NEW COPY'), JSON.stringify(r));

  /* the shelf face: open into YOURS (asks first when YOURS has unsaved text), delete asks first */
  await press(`document.querySelector('#notebook .nb-shelf-btn')`, 'the ▤ shelf button');
  await press(`document.querySelector('.nt-item[data-path="Ideas"] .nt-name')`, 'the note Ideas');
  r = await ev(`return { ask: !!nb.querySelector('.nt-item[data-path="Ideas"] .nt-ask'), yours: NB.yours.md };`);
  await press(`document.querySelector('.nt-item[data-path="Ideas"] .nt-yes')`, 'yes, replace');
  r2 = await ev(`return { sel: NB.selected, face: NB.face, yours: NB.yours, shelf: SH.get('Ideas') };`);
  check('opening a shelf note over unsaved YOURS asks first; yes puts it in the YOURS tab', r.ask && r.yours === 'my own note' && r2.sel === 'yours' && r2.face === 'notes' && r2.yours.md === r2.shelf.md && r2.yours.title === r2.shelf.title, JSON.stringify({ r, r2 }));
  await press(`document.querySelector('#notebook .nb-shelf-btn')`, 'the ▤ shelf button');
  await press(`document.querySelector('.nt-item[data-path="maths/Fixed points"] .nt-del')`, '× on a shelf row');
  r = await ev(`return { ask: !!nb.querySelector('.nt-item[data-path="maths/Fixed points"] .nt-ask'), has: SH.has('maths/Fixed points') };`);
  await press(`document.querySelector('.nt-item[data-path="maths/Fixed points"] .nt-yes')`, 'yes, delete');
  r2 = await ev(`return { has: SH.has('maths/Fixed points'), row: !!nb.querySelector('.nt-item[data-path="maths/Fixed points"]') };`);
  check('a shelf note\'s × asks "delete?" first; yes deletes it', r.ask && r.has && !r2.has && !r2.row, JSON.stringify({ r, r2 }));

  /* many tabs scroll inside the strip; the notebook never scrolls sideways */
  await p.eval(`__MIR_SHELL.notebook('notes')`);
  r = await ev(`for (let i = 0; i < 14; i++) P.add({ title: 'A page with a long name ' + i, md: String(i) });
    const L = P.list(); NB.select(L[L.length - 1].id); await new Promise((r) => setTimeout(r, 50));
    const list = nb.querySelector('.nb-tablist'), sel = tab(L[L.length - 1].id).getBoundingClientRect(), lb = list.getBoundingClientRect(), face = nb.querySelector('.nb-notes');
    return { overflow: list.scrollWidth > list.clientWidth, inView: sel.left >= lb.left - 1 && sel.right <= lb.right + 1, nbScroll: nb.scrollWidth <= nb.clientWidth + 1 && face.scrollWidth <= face.clientWidth + 1 };`);
  check('many tabs: the strip scrolls, the selected tab is kept in view, the notebook does not scroll sideways', r.overflow && r.inView && r.nbScroll, JSON.stringify(r));
  check('no page error on the way', !p.logs.some((l) => /EXCEPTION|Uncaught/i.test(l)), p.logs.filter((l) => /EXCEPTION|Uncaught/i.test(l)).join(' | '));
} catch (e) { check('the run itself', false, e.message); } finally { await p.close(); }
console.log(results.join('\n'));
const ok = results.every((x) => x.startsWith('PASS'));
console.log(ok ? `\nALL PASS (${results.length})` : '\nSOME FAIL');
process.exit(ok ? 0 : 1);
