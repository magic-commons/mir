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
  const closeAll = () => run(`F.close(); T.bar.close(); T.sel.close(); T.few.close(); R.favMenu.close(); if (T.kb.isOpen()) T.kb.close(); D.activeElement && D.activeElement.blur && D.activeElement.blur(); await wait(200); return 0;`);
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
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} panes checks pass`);
if (failed) process.exit(1);
