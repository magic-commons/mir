/* folders-basins.browser.mjs — BASINS' own SAVE gate (tools/rig/save-gate.js in the BASINS worktree, read 2026-10-02)
 * run against FOLDERS mounted with BASINS' options (tests/fixtures/folders-basins.html).  Every check keeps the gate's
 * name, order, actions and timings; only the selectors that name kwin's DOM are mapped to the kit window's:
 *   #savewin                              → #savewin (FOLDERS gives the root its id)
 *   .kwin-chiprail[data-mir-rail=savewin] → [data-mir-rail="savewin"]
 *   [data-rail="<chip>"] · 'drag'         → [data-mir-chip="<chip>"] · 'grip'
 *   K.activeTab() / K.tab(id)             → F.activeTab() / F.tab(id)
 *   .kwin-resize                          → .mir-win-resize
 * Each check is tagged: RAN (the gate's check as written), STAND-IN (the gate's check against the fixture's stand-in
 * engine or RENDER panel: it proves the seat, not BASINS' engine), or listed under NEEDS APP and not run.
 * Standalone: MIR_BASE=http://127.0.0.1:8801 node tests/folders-basins.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8801';
const NEEDS_APP = [
  'consistency: the SAVE rail against the MODULATION rail, 4 seats × 7 parts (needs BASINS\' modulation window)',
  'the factory project restores its exact scale (the engine\'s scaleLog2)',
  'its six knobs land on the flagship curve values exactly (the engine\'s registry)',
  'its colour list restores (count, blend) (the engine\'s palette)',
  'CAPTURE IMAGE makes a real picture and enables DOWNLOAD IMAGE (BASINS\' RENDER panel)',
  'the film estimate is priced for home → this view (BASINS\' RENDER panel)',
  'RENDER MP4 makes a film under VIDEO TIME and offers SAVE FILE (film=1 only)',
  'the video clock released the rack when the run ended (film=1 only)',
  'the self-test runs and reports (BASINS\' RENDER panel)',
];
const GATE = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = window.__B, SV = B.F, G = SV.gallery, F = SV.files, K = { activeTab: () => SV.activeTab(), tab: (id) => SV.tab(id) }, M = B.M, E = B.E;
  const out = { checks: [] };
  const check = (tag, name, cond, detail) => out.checks.push([cond ? 'PASS' : 'FAIL', tag, name, detail === undefined ? '' : JSON.stringify(detail)]);
  const root = () => document.getElementById('savewin');
  const q = (s) => root().querySelector(s), qa = (s) => [...root().querySelectorAll(s)];
  const rail = () => document.querySelector('[data-mir-rail="savewin"]');
  const chip = (id) => rail().querySelector('[data-mir-chip="' + (id === 'drag' ? 'grip' : id) + '"]');
  const box = (n) => { const r = n.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const pointerDrag = async (n, dx, dy) => { const r = n.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    const ev = (t, x, y) => n.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 11, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: t === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', x0, y0); for (let i = 1; i <= 8; i++) { ev('pointermove', x0 + dx * i / 8, y0 + dy * i / 8); await sleep(16); } ev('pointerup', x0 + dx, y0 + dy); await sleep(150); };
  const typeInto = (inp, v) => { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); };
  const fire = (labelRe, scope) => { const b = [...(scope || root()).querySelectorAll('button')].find((x) => labelRe.test(x.textContent)); if (!b) throw new Error('no button ' + labelRe); b.click(); return b; };
  const go = (log2Scale) => { E.place = { x: '-0.7453', y: '0.1127', log2Scale, theta: 0 }; };

  /* ═══ OPEN ═══ */
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true }));
  const facN = () => F.entries().filter((e) => e.facts && e.facts.factoryId).length, libN = () => F.entries().filter((e) => e.facts && e.facts.libraryId).length;
  for (let i = 0; i < 100 && (facN() < 19 || !libN()); i++) await sleep(100);
  await sleep(500);
  check('RAN', 'S opens the SAVE window, the rail on its right', !root().hidden && box(rail()).x >= box(root()).x + box(root()).w, [box(root()), box(rail())]);
  check('RAN', 'a fresh device gets the factory gallery (19) and JOSH\\'S LIBRARY as one folder', facN() === 19 && F.entries().length === 19 + libN() && /19 PROJECTS · 1 FOLDER/.test(q('.sv-count').textContent), q('.sv-count').textContent);
  check('RAN', 'the window clears the right rack', box(root()).x + box(root()).w + 70 <= document.getElementById('rack').getBoundingClientRect().left + 1, [box(root()), box(document.getElementById('rack'))]);

  /* ═══ CHIPS ═══ */
  chip('render').click(); await sleep(250);
  check('RAN', 'RENDER chip shows RENDER and reads pressed', K.activeTab() === 'render' && chip('render').getAttribute('aria-pressed') === 'true' && chip('gallery').getAttribute('aria-pressed') === 'false');
  chip('gallery').click(); await sleep(250);
  check('RAN', 'GALLERY chip comes back', K.activeTab() === 'gallery' && chip('gallery').getAttribute('aria-pressed') === 'true');
  const firstName = () => (q('.sv-card .sv-name') || { textContent: '' }).textContent;
  const n0 = firstName(); const ink0 = chip('sort').textContent;
  chip('sort').click(); await sleep(200);
  check('RAN', 'the sort chip cycles its ink and the order (A–Z → Z–A)', ink0 === 'A–Z' && chip('sort').textContent === 'Z–A' && firstName() !== n0, [ink0, chip('sort').textContent, n0, firstName()]);
  for (let i = 0; i < 5; i++) { chip('sort').click(); await sleep(60); }
  check('RAN', 'six orders, back to A–Z', chip('sort').textContent === 'A–Z');

  /* ═══ OPEN A FACTORY PROJECT ═══ */
  const fac = F.entries().find((e) => e.facts.factoryId === 'fac18'), src = B.FACTORY.find((f) => f.id === 'fac18');
  const facShot = root().querySelector('[data-entry="' + fac.id + '"] .sv-shot');
  facShot.click(); await sleep(100);
  check('RAN', 'first tap selects a project without opening it', G.selected()?.id === fac.id && q('.sv-context').hidden);
  facShot.click(); await sleep(300);
  check('RAN', 'opening over an unknown screen asks first', !q('.sv-context').hidden && /Save this first/.test(q('.sv-context').textContent));
  fire(/OPEN WITHOUT SAVING/); await sleep(1200);
  check('STAND-IN', 'the factory project restores its place and look (the stand-in engine, not the fractal)', E.place.log2Scale === src.place.log2Scale && E.look.knobs.freq === src.knobs.freq, [E.place.log2Scale, src.place.log2Scale]);

  /* ═══ SAVE into a new folder ═══ */
  go(-12);
  typeInto(q('.sv-to-input'), 'SEAHORSE/TAILS');
  check('RAN', 'the proposed name follows SAVE TO', q('.sv-name-input').value === 'TAILS', q('.sv-name-input').value);
  const c0 = F.entries().length;
  q('.sv-project').click();
  for (let i = 0; i < 60 && F.entries().length === c0; i++) await sleep(100);
  await sleep(400);
  const saved = F.entries().find((e) => e.folder === 'SEAHORSE/TAILS');
  check('RAN', 'PROJECT saves into a path that did not exist and opens it', !!saved && G.folder() === 'SEAHORSE/TAILS' && /1 PROJECT · 0 FOLDERS/.test(q('.sv-count').textContent), [G.folder(), q('.sv-count').textContent]);
  check('STAND-IN', 'it carries place + look + rack and a real thumbnail', saved && saved.payload.place && saved.payload.look && saved.payload.rack && /^data:image\\/jpeg/.test(saved.thumb));
  fire(/^ROOT$/, q('.sv-crumbs')); await sleep(200);
  const seaCard = root().querySelector('.sv-folder[data-folder="SEAHORSE"]');
  check('RAN', 'ROOT shows the new folder as a card with its newest picture', !!seaCard && /url\\("data:image/.test(seaCard.querySelector('.sv-folder-shot').style.backgroundImage));

  /* ═══ the project menu ═══ */
  G.go('SEAHORSE/TAILS'); await sleep(150);
  root().querySelector('.sv-card .sv-shot').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(200);
  check('RAN', 'right-click (long-press on touch) opens the project menu', !q('.sv-context').hidden && /SET AS FOLDER PICTURE/.test(q('.sv-context').textContent) && /MOVE/.test(q('.sv-context').textContent));
  fire(/SET AS FOLDER PICTURE/); await sleep(150);
  check('RAN', 'SET AS FOLDER PICTURE records the choice', F.folderPicture('SEAHORSE/TAILS') && F.folderPicture('SEAHORSE/TAILS').chosen === true);
  root().querySelector('.sv-card .sv-shot').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(200);
  typeInto(q('.sv-context .sv-input'), 'SEAHORSE/SPIRALS');
  fire(/^MOVE$/, q('.sv-context')); await sleep(250);
  check('RAN', 'MOVE sends it to a new path', F.entry(saved.id).folder === 'SEAHORSE/SPIRALS', F.entry(saved.id).folder);

  /* ═══ rename; the folder menu ═══ */
  G.go('SEAHORSE/SPIRALS'); await sleep(150);
  q('.sv-card .sv-shot').click();
  q('.sv-card .sv-rename').click(); await sleep(100);
  const inl = q('.sv-inline'); inl.value = 'EYE'; inl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(200);
  check('RAN', 'the selected project can be renamed in place', F.entry(saved.id).name === 'EYE', F.entry(saved.id).name);
  G.go(''); await sleep(150);
  root().querySelector('.sv-folder[data-folder="SEAHORSE"] .sv-folder-shot').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(200);
  typeInto(q('.sv-context .sv-input'), 'VALLEY');
  fire(/^RENAME$/, q('.sv-context')); await sleep(250);
  check('RAN', 'RENAME a folder moves its subtree', F.entry(saved.id).folder === 'VALLEY/SPIRALS' && !F.folders().includes('SEAHORSE'), F.entry(saved.id).folder);
  root().querySelector('.sv-folder[data-folder="VALLEY"] .sv-folder-shot').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(200);
  const rm = fire(/REMOVE FOLDER/); await sleep(120);
  check('RAN', 'REMOVE FOLDER arms first', F.folders().includes('VALLEY') && /MOVE CONTENTS TO ROOT/.test(rm.textContent), rm.textContent);
  rm.click(); await sleep(250);
  check('RAN', 'the second tap moves the contents to ROOT', !F.folders().includes('VALLEY') && F.entry(saved.id).folder === '');

  /* ═══ components ═══ */
  const sws = qa('.sv-part:not(.sv-soon)');
  for (const s of sws) s.click(); await sleep(100);
  const c1 = F.entries().length; q('.sv-project').click(); await sleep(600);
  check('RAN', 'a save with no component is refused', F.entries().length === c1);
  sws.find((s) => s.dataset.part === 'place').click(); await sleep(60);
  q('.sv-project').click();
  for (let i = 0; i < 60 && F.entries().length === c1; i++) await sleep(100);
  const placeOnly = F.entries()[F.entries().length - 1];
  check('STAND-IN', 'FRACTAL alone saves the place and nothing else', placeOnly && placeOnly.payload.place && !placeOnly.payload.look && !placeOnly.payload.rack, placeOnly && Object.keys(placeOnly.payload));
  G.select(placeOnly.id);
  const beforeDuplicate = F.entries().length;
  q('.sv-duplicate').click(); await sleep(180);
  const duplicated = F.entries()[F.entries().length - 1];
  check('RAN', 'DUPLICATE copies the selected file rather than capturing the live view', F.entries().length === beforeDuplicate + 1 && duplicated && duplicated.id !== placeOnly.id && duplicated.thumb === placeOnly.thumb && JSON.stringify(duplicated.payload) === JSON.stringify(placeOnly.payload));
  for (const s of sws) if (s.dataset.part !== 'place') s.click(); await sleep(100);

  /* ═══ MODULATION round-trips; NEW clears it ═══ */
  M.addSource('lfo'); await sleep(200);
  const sources0 = M.sourceList().length;
  const c2 = F.entries().length; q('.sv-project').click();
  for (let i = 0; i < 60 && F.entries().length === c2; i++) await sleep(100);
  const rackSaved = F.entries()[F.entries().length - 1];
  q('.sv-new').click(); await sleep(600);
  check('STAND-IN', 'NEW clears the modulation and goes home', M.sourceList().length < sources0 && E.place.log2Scale > -12, [sources0, M.sourceList().length, E.place.log2Scale]);
  await SV.gallery.openEntry(rackSaved.id, { force: true }); await sleep(800);
  check('STAND-IN', 'opening the project brings the rack back', M.sourceList().length === sources0, [sources0, M.sourceList().length]);

  /* ═══ delete (armed) and RESTORE FACTORY GALLERY ═══ */
  G.go(''); await sleep(150);
  const facCard = root().querySelector('[data-entry="' + fac.id + '"]');
  const del = facCard.querySelector('.sv-del');
  del.click(); await sleep(80);
  check('RAN', '× arms first', !!F.entry(fac.id) && del.classList.contains('armed'));
  del.click(); await sleep(250);
  check('RAN', 'the second tap deletes', !F.entry(fac.id));
  fire(/RESTORE FACTORY GALLERY/); for (let i = 0; i < 40 && !F.entries().some((e) => e.facts.factoryId === 'fac18'); i++) await sleep(100);
  check('RAN', 'RESTORE FACTORY GALLERY puts back only what is missing', F.entries().filter((e) => e.facts.factoryId).length === 19, F.entries().filter((e) => e.facts.factoryId).length);

  /* ═══ RENDER: the inspector (the stand-in panel; the picture, the film and the self-test are BASINS') ═══ */
  const one = root().querySelector('.sv-card .sv-info'); one.click(); await sleep(400);
  check('STAND-IN', 'i shows the project in RENDER', K.activeTab() === 'render' && /COMPONENTS/.test(q('.sr-subject').textContent) && !/^THIS VIEW/.test(q('.sr-subject-name').textContent));
  fire(/^THIS VIEW$/, q('.sr-subject')); await sleep(200);
  check('STAND-IN', 'THIS VIEW returns the subject to the live view', q('.sr-subject-name').textContent === 'THIS VIEW');

  /* ═══ WINDOW ═══ */
  K.tab('gallery'); await sleep(150);
  const w0 = box(root());
  await pointerDrag(q('.mir-win-resize'), 60, 40);
  const w1 = box(root());
  check('RAN', 'the corner resizes, and the size persists', w1.w === w0.w + 60 && w1.h === w0.h + 40 && B.readPrefs().savewin.w === w1.w, [w0, w1, B.readPrefs().savewin.w]);
  const r0 = box(rail());
  await pointerDrag(chip('drag'), -80, 30);
  const w2 = box(root()), r1 = box(rail());
  check('RAN', 'the grip drags window and rail together', w2.x - w1.x === -80 && w2.y - w1.y === 30 && r1.x - r0.x === -80 && r1.y - r0.y === 30, [w1, w2, r0, r1]);
  chip('close').click(); await sleep(150);
  const hidden150 = root().hidden && rail().hidden;
  await sleep(300);
  check('RAN', 'close hides window and rail, persisted', root().hidden && rail().hidden && B.readPrefs().savewin.open === false, { at150ms: hidden150 });
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true })); await sleep(300);
  check('RAN', 'S reopens it where it was left, at its size', !root().hidden && box(root()).x === w2.x && box(root()).w === w1.w, [box(root()), w2]);
  out.closeAt150 = hidden150;
  return out;
})()`;

const p = await launch({ width: 1440, height: 900 });
const results = [];
try {
  await p.goto(BASE + '/tests/fixtures/folders-basins.html', 300);
  await p.eval('localStorage.clear(); location.reload(); 1');
  await sleep(900);
  for (let i = 0; i < 50 && !(await p.eval('!!window.__ready').catch(() => false)); i++) await sleep(100);
  const out = await p.eval(GATE);
  for (const [v, tag, name, detail] of out.checks) results.push(`${v}  [${tag}] ${name}${v === 'FAIL' && detail ? '  — ' + detail : ''}`);
  if (!out.closeAt150) results.push('NOTE  the gate waits 150 ms after close; the kit window\'s exit motion (ruled: windows animate open, close and minimise) takes --motion-ui, so the check is read again 300 ms later');
  const errs = p.logs.filter((l) => /EXCEPTION|error/.test(l));
  results.push(`${errs.length ? 'FAIL' : 'PASS'}  no page exceptions or console errors${errs.length ? '  — ' + errs.slice(0, 3).join(' | ') : ''}`);
  /* the plate: a fresh device, S, as BASINS opens it (the gate above leaves the window moved and resized) */
  if (process.env.MIR_PLATES) {
    await p.eval('localStorage.clear(); location.reload(); 1'); await sleep(900);
    for (let i = 0; i < 50 && !(await p.eval('!!window.__ready').catch(() => false)); i++) await sleep(100);
    await p.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true })); 1`); await sleep(5200);
    await p.shot('docs/plates/folders/basins.png');
  }
} catch (e) {
  results.push('FAIL  the run threw: ' + (e && e.stack || e));
} finally { await p.close(); }
for (const l of results) console.log(l);
for (const n of NEEDS_APP) console.log('SKIP  [NEEDS APP] ' + n);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(`\nfolders-basins.browser: ${results.filter((l) => l.startsWith('PASS')).length}/${results.filter((l) => /^(PASS|FAIL)/.test(l)).length} passed, ${NEEDS_APP.length} need BASINS itself`);
process.exit(failed.length ? 1 : 0);
