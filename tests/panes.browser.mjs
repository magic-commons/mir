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
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} panes checks pass`);
if (failed) process.exit(1);
