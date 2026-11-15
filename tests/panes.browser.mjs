/* panes.browser.mjs — THE KIT'S FLOATING PANES AND THE LISTS IN THEM, as one family (1.6.0-alpha.43 on; λWAVES 044 KV2, Rule 1: "If it lists,
 * it is the FINDER's row.  If it searches, it is the FINDER's field"): THE FINDER, the menubar's lists and a context menu, a select's list, the
 * saved-layouts list, the keyboard window, a dialog and a notice on one page (tests/fixtures/panes.html, the whole kit sheet), real keys and a
 * real pointer through CDP.  One block a door.
 * Standalone: MIR_BASE=http://127.0.0.1:8795 node tests/panes.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8795';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  const load = async () => { await p.goto(BASE + '/tests/fixtures/panes.html', 600); for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100); await sleep(300); };
  await load();
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, R = T.rack, F = T.finder, D = document;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const $ = (s) => D.querySelector(s), $$ = (s) => [...D.querySelectorAll(s)];
    const cs = (n) => getComputedStyle(typeof n === 'string' ? $(n) : n);
    const box = (n) => { const r = (typeof n === 'string' ? $(n) : n).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    ${body} })().then((v) => JSON.stringify(v === undefined ? null : v))`));
  const closeAll = () => run(`F.close(); T.finder2.close(); T.adder.close(); T.bar.close(); T.sel.close(); T.few.close(); R.favMenu.close(); if (T.kb.isOpen()) T.kb.close(); D.activeElement && D.activeElement.blur && D.activeElement.blur(); await wait(200); return 0;`);
  let r;

  /* ── alpha.43 · EVERY FLOATING PANE READS THE CORNERS DIAL ─────────────────────────────────────────────────── */
  const corners = () => run(`F.open(); T.bar.openGroup('FILE'); T.sel.open(); R.favMenu.open(); const dlg = T.dialog.openDialog({ title: 'T', body: 'b' }); await wait(450);
    const m = T.menus.contextMenu({ x: 700, y: 500, entries: [['ONE', () => {}], ['TWO', () => {}]] });
    const out = { finder: cs('.mir-window-picker').borderTopLeftRadius, menu: cs('#menubar .mb-list:not([hidden])').borderTopLeftRadius, ctx: cs('.mir-ctx-pane').borderTopLeftRadius,
      pick: cs('.mir-pick').borderTopLeftRadius, fav: cs('.mir-rack-list').borderTopLeftRadius, dialog: cs('.mir-dialog').borderTopLeftRadius };
    m.close(); dlg.close(); return out;`);
  await run(`D.body.style.setProperty('--surface-radius', '20px'); return 0;`);
  r = await corners();
  check('CORNERS at 20: the FINDER, a menubar list, a context menu, a select\'s list, the saved-layouts list and a dialog are all 20 px', Object.values(r).every((v) => v === '20px'), JSON.stringify(r));
  await closeAll();
  await run(`D.body.style.removeProperty('--surface-radius'); return 0;`);
  r = await corners();
  check('CORNERS at home: the six panes share the house\'s pane corner (--card-r, 14 px); none keeps a 10 or a 12 of its own', Object.values(r).every((v) => v === '14px'), JSON.stringify(r));
  await closeAll();

  /* ── alpha.44 · ONE SCROLLBAR ───────────────────────────────────────────────────────────────────────────────── */
  r = await run(`F.open(); T.bar.openGroup('FILE'); T.sel.open(); R.favMenu.open(); T.kb.open(); const dlg = T.dialog.openDialog({ title: 'T', body: 'b' }); await wait(450);
    const acc = (() => { const s = el0(); s.style.color = 'var(--acc)'; const c = getComputedStyle(s).color; s.remove(); return c; function el0() { return D.body.appendChild(D.createElement('i')); } })();
    const of = (s) => { const c = cs(s); return c.scrollbarWidth + ' | ' + c.scrollbarColor; };
    const out = { acc, finder: of('.wp-list'), menu: of('#menubar .mb-list:not([hidden])'), pick: of('.mir-pick'), fav: of('.mir-rack-list'), keys: of('.km-list'), dialog: of('.mir-dialog'), rack: of('.mir-rack') };
    dlg.close(); return out;`);
  const bar1 = 'thin | ' + r.acc + ' rgba(0, 0, 0, 0)';
  check('ONE SCROLLBAR: the FINDER\'s list, a menu, a select\'s list, the saved-layouts list, KEYBOARD\'s list and a dialog wear the rack\'s: thin, the thumb in accent A, no groove',
    ['finder', 'menu', 'pick', 'fav', 'keys', 'dialog', 'rack'].every((k) => r[k] === bar1), JSON.stringify(r));
  await closeAll();

  /* ── alpha.45 · THE WASH ────────────────────────────────────────────────────────────────────────────────────── */
  const wash = () => run(`F.open(); T.bar.openGroup('FILE'); T.sel.open(); T.kb.open(); await wait(450);
    const pr = D.body.appendChild(D.createElement('i')); pr.style.background = 'color-mix(in srgb, var(--acc) 16%, transparent)'; const want = getComputedStyle(pr).backgroundColor; pr.remove();
    const row = $('.km-action-row'); row.click(); await wait(400);
    const bg = (s) => cs(s).backgroundColor;
    return { want, finder: bg('.wp-row.on'), option: bg('.mir-pick-i.on'), rim: cs('.mir-pick-i.on').boxShadow, checked: bg('#menubar .mb-item[aria-checked="true"]'), unchecked: bg('#menubar .mb-item[aria-checked="false"]'),
      keys: bg('.km-action-row-selected'), seg: bg('.seg-b.on') };`);
  r = await wash();
  check('THE WASH: the FINDER\'s cursor row, a select\'s chosen option, a checked menu row and KEYBOARD\'s chosen row wear one face, accent A at 16 % — and a chosen option has no rim',
    r.want !== 'rgba(0, 0, 0, 0)' && [r.finder, r.option, r.checked, r.keys].every((c) => c === r.want) && r.rim === 'none' && r.unchecked !== r.want, JSON.stringify(r));
  check('THE WASH is a list\'s: a segment\'s chosen option keeps the frost face (Josh\'s exception)', r.seg !== r.want, r.seg);
  await closeAll();
  await run(`D.body.dataset.theme = 'light'; await wait(60); return 0;`);
  r = await wash();
  check('THE WASH follows the theme\'s accent (light)', r.want !== 'rgba(0, 0, 0, 0)' && [r.finder, r.option, r.checked, r.keys].every((c) => c === r.want), JSON.stringify(r));
  await closeAll();
  await run(`D.body.dataset.theme = 'dark'; await wait(60); return 0;`);
  await p.mouse(640, 780);
  r = await run(`T.bar.openGroup('FILE'); await wait(120); const it = $('#menubar .mb-list:not([hidden]) .mb-item'); const b = it.getBoundingClientRect(); return { x: b.left + 30, y: b.top + b.height / 2 };`);
  await p.mouse(r.x, r.y); await sleep(120);
  r = await run(`const pr = D.body.appendChild(D.createElement('i')); pr.style.background = 'var(--state-wash)'; const want = getComputedStyle(pr).backgroundColor; pr.remove(); return { want, hover: cs('#menubar .mb-list:not([hidden]) .mb-item').backgroundColor };`);
  check('THE WASH is a menu\'s cursor: the row under the pointer wears it', r.hover === r.want && r.want !== 'rgba(0, 0, 0, 0)', JSON.stringify(r));
  await p.mouse(640, 780); await closeAll();

  /* ── alpha.46 · EVERY MENU ROW HAS A PICTURE'S SEAT ─────────────────────────────────────────────────────────── */
  r = await run(`T.bar.openGroup('FILE'); await wait(120); const its = $$('#menubar .mb-list:not([hidden]) > .mb-item');
    const row = (it) => { const s = it.firstElementChild, l = it.querySelector('.mb-lbl'); return { t: l.textContent, h: Math.round(box(it).h * 10) / 10, seat: s.classList.contains('mb-icon'), sw: box(s).w, tag: s.tagName.toLowerCase(), mark: s.classList.contains('mb-mark'), none: s.classList.contains('mb-none'), lx: Math.round(box(l).x * 10) / 10 }; };
    const rows = its.map(row), arrow = $('#menubar .mb-sub .mb-arrow');
    return { rows, arrow: !!arrow.querySelector('svg') && arrow.textContent === '', typed: its.some((it) => /[✓•▸]/.test(it.textContent)) };`);
  const by = (t) => r.rows.find((x) => x.t.startsWith(t));
  check('A MENU ROW IS ONE HEIGHT: 28 px with a glyph and without one', r.rows.length === 8 && r.rows.every((x) => x.h === 28), JSON.stringify(r.rows.map((x) => x.h)));
  check('EVERY ROW BEGINS WITH A 16 px SEAT, so every label starts in one column: a glyph (NEW), nothing (A ROW WITH NO PICTURE)',
    r.rows.every((x) => x.seat && x.sw === 16 && x.lx === r.rows[0].lx) && by('NEW').tag === 'svg' && by('A ROW').none, JSON.stringify(r.rows));
  check('a check or radio row that is on wears a drawn mark in the seat, one that is off an empty seat; a submenu\'s arrow is drawn; no ✓ • ▸ is typed',
    by('LOCK').mark && by('LOCK').tag === 'svg' && by('FIRST').mark && !by('LOOSE').mark && by('LOOSE').none && r.arrow && !r.typed, JSON.stringify({ arrow: r.arrow, typed: r.typed }));
  r = await run(`const m = T.menus.contextMenu({ x: 700, y: 400, entries: [['ONE', () => {}], ['TWO', () => {}, null, '', { icon: 'plus' }], ['THREE', () => [['IN', () => {}]], null, '', { sub: true }]] });
    const out = $$('.mir-ctx-pane > .mb-item').map((it) => Math.round(box(it).h * 10) / 10); m.close(); return out;`);
  check('a context menu\'s rows are the same 28 px', r.length === 3 && r.every((h) => h === 28), JSON.stringify(r));
  await closeAll();

  /* ── alpha.47 · THE POPUP ROW ───────────────────────────────────────────────────────────────────────────────── */
  r = await run(`F.open(); T.sel.open(); T.kb.open(); await wait(450);
    const row = (s) => { const n = $(s), c = cs(n); return { h: Math.round(box(n).h * 10) / 10, r: c.borderTopLeftRadius }; };
    const long = $$('.mir-pick-i')[3], word = long.querySelector('.mir-pick-t'), kl = $$('.km-action-row').find((n) => n.textContent.startsWith('AN ACTION')), kw = kl.querySelector('.km-action-label');
    const head = (s) => { const c = cs(s); return c.fontWeight + ' ' + c.fontSize; };
    return { finder: row('.wp-row'), pick: row('.mir-pick-i'), keys: row('.km-action-row'), paneW: box('.mir-pick').w,
      long: { h: Math.round(box(long).h * 10) / 10, cut: word.scrollWidth > word.clientWidth, lines: Math.round(box(word).h), hint: long.title === word.textContent, fits: box(long).w <= box('.mir-pick').w },
      klong: { h: Math.round(box(kl).h * 10) / 10, cut: kw.scrollWidth > kw.clientWidth },
      heads: { finder: head('.wp-head'), keys: head('.km-action-group'), ink: [cs('.wp-head').color, cs('.km-action-group').color] } };`);
  check('THE POPUP ROW: a select\'s row and KEYBOARD\'s row are the FINDER\'s: 34 px, a 9 px corner', [r.finder, r.pick, r.keys].every((x) => x.h === 34 && x.r === '9px'), JSON.stringify([r.finder, r.pick, r.keys]));
  check('a word too long for the list ends in an ellipsis on one line (the row stays 34 px, the pane at most 420 px wide) and is the row\'s hint',
    r.long.h === 34 && r.long.cut && r.long.lines < 20 && r.long.hint && r.long.fits && r.paneW <= 420 && r.klong.h === 34 && r.klong.cut, JSON.stringify({ long: r.long, klong: r.klong, paneW: r.paneW }));
  check('A HEAD IS LIGHT: the FINDER\'s section head and KEYBOARD\'s group head are 8 px, weight 400, one faint ink', r.heads.finder === '400 8px' && r.heads.keys === '400 8px' && r.heads.ink[0] === r.heads.ink[1], JSON.stringify(r.heads));
  await closeAll();

  /* ── alpha.48 · KEYCAPS ─────────────────────────────────────────────────────────────────────────────────────── */
  r = await run(`T.bar.openGroup('FILE'); T.kb.open(); await wait(300); const k = $('#menubar .mb-list:not([hidden]) .mb-key'), cap = k.querySelector('kbd'), chip = $('.km-chip-key');
    const face = (n) => { const c = cs(n); return c.backgroundColor + ' | ' + c.boxShadow + ' | ' + c.borderTopLeftRadius; };
    return { text: k.textContent, caps: [...k.querySelectorAll('kbd')].map((n) => n.textContent), plus: cs(k.querySelector('.mb-plus')).display, cap: face(cap), chip: face(chip), well: cs(cap).backgroundColor !== 'rgba(0, 0, 0, 0)',
      pure: [T.menus.capsOf('Ctrl+Shift+S'), T.menus.capsOf('⌘⇧S'), T.menus.capsOf('Ctrl++'), T.menus.capsOf('Space'), T.menus.capsOf('?'), T.menus.capsOf('')] };`);
  check('KEYCAPS: a menu row\'s key is drawn as caps (Ctrl · Alt · N), its text still the chord as written', r.text === 'Ctrl+Alt+N' && r.caps.join() === 'Ctrl,Alt,N' && r.plus === 'none', JSON.stringify(r));
  check('one keycap: a menu\'s cap and the keyboard window\'s chip wear the same well, shadow and corner', r.well && r.cap === r.chip, JSON.stringify([r.cap, r.chip]));
  check('capsOf: a chord by its +, a Mac chord by its symbols, the + key itself, a lone word, nothing', JSON.stringify(r.pure) === JSON.stringify([['Ctrl', 'Shift', 'S'], ['⌘', '⇧', 'S'], ['Ctrl', '+'], ['Space'], ['?'], []]), JSON.stringify(r.pure));
  await closeAll();

  /* ── alpha.49 · THE TWO FIELDS ──────────────────────────────────────────────────────────────────────────────── */
  r = await run(`F.open(); T.kb.open(); await wait(450); const nm = D.body.appendChild(D.createElement('input')); nm.className = 'mir-name'; nm.value = 'my preset';
    const f = (s) => { const n = typeof s === 'string' ? $(s) : s, c = cs(n); return [Math.round(box(n).h), c.borderTopLeftRadius, c.fontSize, c.backgroundColor, c.borderTopWidth].join(' | '); };
    const out = { finder: f('.wp-search'), keys: f('.km-search'), cls: [$('.wp-search').className, $('.km-search').className], name: [Math.round(box(nm).h), cs(nm).borderTopLeftRadius, cs(nm).textTransform].join(' | '),
      made: T.picker.searchField(D.body).className }; nm.remove(); $('body > .mir-search').remove(); return out;`);
  check('ONE SEARCH FIELD: the FINDER\'s and KEYBOARD\'s are the same pill (34 px, 14 px type, one well and hairline), made by searchField()', r.finder === r.keys && r.finder.startsWith('34 | ') && r.finder.includes('| 14px |') && r.cls.every((c) => c.includes('mir-search')) && r.made === 'mir-search', JSON.stringify(r));
  check('THE NAME FIELD (.mir-name): 30 px, radius 8, upper case', r.name === '30 | 8px | uppercase', r.name);
  await closeAll();

  /* ── alpha.50 · THE WALK SPEAKS, AND NOTHING MATCHES ────────────────────────────────────────────────────────── */
  await run(`F.open(); await wait(450); return 0;`);
  await p.key('ArrowDown');
  r = await run(`const i = $('.wp-search'), on = $('.wp-row.on'); return { focus: D.activeElement === i, ad: i.getAttribute('aria-activedescendant'), id: on.id, sel: $$('.wp-row[aria-selected="true"]').length, tab: $$('.wp-row').every((b) => b.tabIndex === -1), ctl: i.getAttribute('aria-controls') === $('.wp-list').id,
    fade: cs('.wp-glyph').opacity };`);
  check('THE WALK SPEAKS: ↓ keeps the focus in the field, which names the marked row (aria-activedescendant); that row alone is aria-selected; no row is a Tab stop', r.focus && r.ad && r.ad === r.id && r.sel === 1 && r.tab && r.ctl, JSON.stringify(r));
  r = await run(`const i = $('.wp-search'); return { vis: i.matches(':focus-visible'), ring: [cs(i).outlineStyle, cs(i).outlineWidth, cs(i).outlineOffset].join(' ') };`);
  check('THE FINDER\'S FIELD WEARS THE RING (alpha.83): focused for the keys, the search shows the house ring inside its box (2 px solid, -2 px), as every field does', r.vis && r.ring === 'solid 2px -2px', JSON.stringify(r));
  for (const c of 'zzqx') await p.key(c);
  r = await run(`T.kb.open(); await wait(300); const s = $('.km-search'); s.focus(); s.value = 'zzqx'; s.dispatchEvent(new Event('input', { bubbles: true })); await wait(150);
    const a = $('.mir-window-picker .mir-empty'), b = $('.km-list .mir-empty'); return { finder: a && !a.hidden ? a.textContent : null, keys: b ? b.textContent : null, rows: $$('.wp-row').filter((x) => !x.hidden).length, same: a && b && cs(a).color === cs(b).color && cs(a).fontSize === cs(b).fontSize, ad: $('.wp-search').hasAttribute('aria-activedescendant') };`);
  check('NOTHING MATCHES: a search that finds nothing shows one dim line, one wording, in the FINDER and in KEYBOARD', r.finder === 'Nothing matches' && r.keys === 'Nothing matches' && r.rows === 0 && r.same && !r.ad, JSON.stringify(r));
  await closeAll();

  /* ── alpha.51 · THE MATCHER IS A DECLARED OPTION, AND ESCAPE CLEARS THEN CLOSES ─────────────────────────────── */
  const shown = `$$('.mir-window-picker:not([hidden]) .wp-row').filter((x) => !x.hidden).sort((a, b) => box(a).y - box(b).y).map((x) => x.querySelector('.wp-name').textContent)`;
  await run(`F.open(); await wait(450); return 0;`);
  for (const c of 'tmln') await p.key(c);
  r = await run(`return { rows: ${shown}, empty: !$('.mir-window-picker:not([hidden]) .mir-empty').hidden };`);
  const own = r;
  await p.key('Escape'); const e1 = await run(`return { open: F.shown, q: $('.mir-window-picker:not([hidden]) .wp-search').value, rows: ${shown}.length };`);
  await p.key('Escape'); await sleep(250); const e2 = await run(`return { open: F.shown };`);
  check('ESCAPE CLEARS, THEN CLOSES: with a query typed the first Escape empties the field and brings every row back, the second closes the FINDER', e1.open && e1.q === '' && e1.rows === 8 && !e2.open, JSON.stringify({ e1, e2 }));
  await run(`T.finder2.open(); await wait(450); return 0;`);
  for (const c of 'tmln') await p.key(c);
  r = await run(`const on = $('.mir-window-picker:not([hidden]) .wp-row.on'); return { rows: ${shown}, on: on && on.querySelector('.wp-name').textContent, head: !$('.mir-window-picker:not([hidden]) .wp-head').hidden };`);
  check('THE MATCHER IS THE APP\'S: the FINDER\'s own finds nothing for "tmln" (the one dim line); with match it finds TIMELINE, best first and the default, the section\'s row under its head',
    own.rows.length === 0 && own.empty && r.rows.length === 3 && r.rows[0] === 'TIMELINE' && r.rows[2] === 'EXTRA TIMELINE ROW' && r.on === 'TIMELINE' && r.head, JSON.stringify({ own, r }));
  await p.key('Enter'); await sleep(300);
  r = await run(`return { open: R.isOpen('timeline'), shown: T.finder2.shown };`);
  check('Enter opens the best match (TIMELINE) and closes the FINDER', r.open && !r.shown, JSON.stringify(r));
  await closeAll();

  /* ── alpha.52 · THE MENUS BY KEYBOARD, AND THE VALUE DOOR OF EVERY CONTROL ──────────────────────────────────── */
  const at = () => run(`const a = D.activeElement; return { grp: a.classList.contains('mb-btn') ? a.dataset.menu : null, row: a.classList.contains('mb-item') ? a.querySelector('.mb-lbl').textContent : null, open: ($('#menubar .mb-btn[aria-expanded="true"]') || { dataset: {} }).dataset.menu || null, bar: T.bar.isOpen };`);
  await run(`T.bar.open(true); await wait(120); return 0;`);
  const w = []; const press = async (k) => { await p.key(k); w.push(await at()); };
  await press('ArrowRight'); await press('ArrowDown'); await press('End'); await press('Home'); await press('l'); await press('ArrowRight'); await press('Escape'); await press('End'); await press('Home');
  check('THE MENUS BY KEYBOARD: → walks the groups, ↓ opens a list at its first row, End / Home its last and first, a letter jumps (l → LOCK), → steps to the next group\'s list, Escape closes it back to its group, End / Home the last and first group',
    w[0].grp === 'FILE' && w[1].row === 'NEW' && w[1].open === 'FILE' && w[2].row === 'MORE' && w[3].row === 'NEW' && w[4].row === 'LOCK' && w[5].row === 'UNDO' && w[5].open === 'EDIT' && w[6].grp === 'EDIT' && !w[6].open && w[6].bar && w[7].grp === 'WINDOW' && w[8].grp === 'FINDER', JSON.stringify(w));
  await p.key('Enter'); await sleep(150);
  r = await run(`return { ran: T.ran.includes('finder-entry'), bar: T.bar.isOpen, list: !!$('#menubar .mb-act .mb-list'), hint: $('#menubar .mb-act .mb-btn').title };`);
  check('AN ACTING ENTRY (menus.FINDER = { run }): a group with no list; Enter on it runs it and closes the bar', r.ran && !r.bar && !r.list && r.hint === 'open the finder', JSON.stringify(r));
  r = await run(`const n = T.num, face = n.root.querySelector('.mir-num-face'); n.set(7);
    const m = T.menus.controlMenu(face, { x: 600, y: 500 }); const ids = m ? $$('.mir-ctx-pane .mb-item').map((b) => b.dataset.id) : null; if (m) { $('.mir-ctx-pane [data-id="reset"]').click(); }
    return { ids, after: n.get(), act: T.menus.knobAct(face, 'copy') };`);
  check('THE VALUE DOOR OF EVERY CONTROL: the control menu on a number (from an element inside it) has RESET · COPY VALUE · PASTE, and RESET sends it home', r.ids && r.ids.slice(0, 3).join() === 'reset,copy,paste' && r.after === 5 && r.act === true, JSON.stringify(r));
  await run(`F.open(); await wait(450); return 0;`);
  await p.key('End'); const fe = await run(`return $('.wp-row.on .wp-name').textContent;`); await p.key('Home'); const fh = await run(`return $('.wp-row.on .wp-name').textContent;`);
  check('THE FINDER: End and Home mark the last and the first row (nothing typed)', fe === 'EXTRA' && fh.startsWith('A WINDOW'), JSON.stringify([fe, fh]));
  await closeAll();

  /* ── alpha.84 · THE BAR STAYS WHILE THE KEYS WALK IT: a list closed by Escape under a resting pointer is not the pointer leaving ── */
  await run(`T.bar.open(false); await wait(120); return 0;`);
  { const centre = (sel) => run(`const n = $(${JSON.stringify(sel)}), r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`);
    let at2 = await centre('#menubar .mb-btn[data-menu="FILE"]'); await p.mouse(at2.x, at2.y); await sleep(200);
    at2 = await centre('#menubar .mb-list:not([hidden]) .mb-item:nth-child(3)'); await p.mouse(at2.x, at2.y); await sleep(150);
    await run(`$('#menubar .mb-list:not([hidden]) .mb-item:nth-child(3)').focus(); return 0;`);
    await p.key('Escape'); await sleep(700);
    const mid = await at(); await p.key('End'); const end = await at();
    check('THE BAR STAYS WHILE THE KEYS WALK IT: Escape closes the list under a resting pointer back to FILE, the bar is still there 700 ms later, and End finds the last group',
      mid.grp === 'FILE' && !mid.open && mid.bar && end.grp === 'WINDOW' && end.bar, JSON.stringify({ mid, end }));
    await p.mouse(5, 795); }
  await closeAll();

  /* ── alpha.53 · EVERY KIT LAYER IS ON THE ONE STACK ─────────────────────────────────────────────────────────── */
  r = await run(`const S = []; T.menus.setMenuEscape((close) => { const L = { close }; S.push(L); return () => { const i = S.indexOf(L); if (i >= 0) S.splice(i, 1); }; });
    const seen = {}; F.open(); seen.finder = S.length; F.close(); await wait(250); seen.finderOff = S.length;
    T.sel.open(); seen.select = S.length; T.sel.close(); seen.selectOff = S.length;
    R.favMenu.open(); seen.fav = S.length; R.favMenu.close(); seen.favOff = S.length;
    const d = T.dialog.openDialog({ title: 'T', body: 'b' }); await wait(100); seen.dialog = S.length; d.close(); await wait(100); seen.dialogOff = S.length;
    const m = T.menus.contextMenu({ x: 600, y: 400, entries: [['ONE', () => {}]] }); seen.ctx = S.length; m.close(); seen.ctxOff = S.length;
    /* the stack's own pop closes the layer, as an app's Escape would */
    F.open(); await wait(450); S.pop().close(); await wait(250); seen.popped = !F.shown; T.sel.open(); S.pop().close(); seen.poppedSel = !T.sel.isOpen;
    T.menus.setMenuEscape(null); return seen;`);
  check('EVERY KIT LAYER IS ON THE ONE STACK: the FINDER, a select\'s list, the saved-layouts list, a dialog and a context menu push a layer while open and take it off when they close; the stack\'s pop closes them',
    [r.finder, r.select, r.fav, r.dialog, r.ctx].every((n) => n === 1) && [r.finderOff, r.selectOff, r.favOff, r.dialogOff, r.ctxOff].every((n) => n === 0) && r.popped && r.poppedSel, JSON.stringify(r));
  await closeAll();

  /* ── alpha.54 · THE LAYOUTS LIST WEARS THE MENU'S ROW, AND A PICKER WITHOUT A RACK ──────────────────────────── */
  r = await run(`R.favMenu.open(); await wait(120); const L = $('.mir-rack-list'); const empty = (L.querySelector('.mir-empty') || {}).textContent; L.querySelector('.mb-item').click(); await wait(150);
    const its = [...L.querySelectorAll('.mb-item')]; return { empty, n: its.length, typed: /[☆⊙×★]/.test(L.textContent), seats: its.every((it) => it.firstElementChild.classList.contains('mb-icon') && it.firstElementChild.tagName.toLowerCase() === 'svg'),
      words: its.map((it) => it.querySelector('.mb-lbl').textContent)[0], h: its.map((it) => Math.round(box(it).h)), x: !!L.querySelector('.fav-x svg'), head: (L.querySelector('.rack-fav-head') || {}).textContent };`);
  check('THE LAYOUTS LIST WEARS THE MENU\'S ROW: a drawn glyph in every row\'s seat, the word alone, a drawn ×, 28 px rows, nothing typed; empty, it says so in the one dim line',
    r.empty === 'No layout saved yet' && r.n === 2 && !r.typed && r.seats && r.words === 'SAVE LAYOUT' && r.h.every((h) => h === 28) && r.x && r.head === 'LOAD LAYOUT', JSON.stringify(r));
  await run(`$('.mir-rack-list .fav-x').click(); await wait(100); return 0;`);
  await closeAll();
  await run(`T.adder.open(); await wait(450); return 0;`);
  for (const c of 'bl') await p.key(c);
  r = await run(`const P = T.adder.root; return { rows: [...P.querySelectorAll('.wp-row')].filter((x) => !x.hidden).map((x) => x.textContent), heads: [...P.querySelectorAll('.wp-head')].filter((x) => !x.hidden).map((x) => x.textContent) };`);
  await p.key('Enter'); await sleep(250);
  const ran = await run(`return { ran: T.ran.includes('add-blur'), shown: T.adder.shown };`);
  check('A PICKER WITHOUT A RACK lists its sections alone: "bl" leaves BLUR under EFFECTS, Enter runs it and closes', r.rows.join() === 'BLUR' && r.heads.join() === 'EFFECTS' && ran.ran && !ran.shown, JSON.stringify({ r, ran }));
  await closeAll();

  /* ── alpha.55 · ONE EDGE ────────────────────────────────────────────────────────────────────────────────────── */
  r = await run(`F.open(); T.sel.open(); R.favMenu.open(); await wait(450); const m = T.menus.contextMenu({ x: 700, y: 500, entries: [['ONE', () => {}]] });
    const e = (s) => { const c = cs(s); return [$(s).dataset.mirSurface, c.borderTopColor, c.borderTopWidth, c.backgroundColor].join(' | '); }, sh = (s) => cs(s).boxShadow;
    const out = { ctx: e('.mir-ctx-pane'), finder: e('.mir-window-picker'), pick: e('.mir-pick'), fav: e('.mir-rack-list'), sh: [sh('.mir-ctx-pane'), sh('.mir-window-picker'), sh('.mir-rack-list')] }; m.close(); return out;`);
  check('ONE EDGE: the FINDER and the saved-layouts list carry the menu mark and wear a context menu\'s and a select\'s list\'s edge, floor and shadow', r.ctx.startsWith('menu | ') && r.finder === r.ctx && r.pick === r.ctx && r.fav === r.ctx && r.sh[1] === r.sh[0] && r.sh[2] === r.sh[0], JSON.stringify(r).slice(0, 420));
  await closeAll();

  /* ── alpha.56 · KEYS HAS A TITLE BAR, THE NOTICE OWNS ITS TIME, THE DIALOG'S BUTTON ─────────────────────────── */
  r = await run(`T.help.open(); await wait(400); const w = T.help.win.root, d = T.dialog.openDialog({ title: 'T', body: 'b' }); await wait(120); const b = $('.mir-dialog .trig');
    const out = { head: !!w.querySelector('.mir-win-head'), x: !!w.querySelector('.mir-win-head button, .mir-win-close'), ms: T.notices.NOTICE_MS, btn: [Math.round(box(b).h), cs(b).borderTopLeftRadius, cs(b).fontFamily === cs('.mb-btn').fontFamily] };
    d.close(); T.help.close(); return out;`);
  check('KEYS (the help view) has a title bar with its ×; a dialog\'s button is the 44 px trigger with the middle corner in the kit\'s face; NOTICE_MS names a notice\'s time by kind',
    r.head && r.x && r.btn[0] >= 44 && r.btn[1] === '8px' && r.btn[2] && r.ms.info === 3000 && r.ms.warn === 5000 && r.ms.error === 9000, JSON.stringify(r));
  await closeAll();
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} panes checks pass`);
if (failed) process.exit(1);
