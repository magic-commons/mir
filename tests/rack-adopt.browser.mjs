/* rack-adopt.browser.mjs — createRack adopted by an app that ALREADY HAS A RACK (tests/fixtures/rack-basins.html: BASINS'
 * markup and id rules, every window built eagerly by the app, the transport card in the left rack), and the dock span
 * as BASINS' rack-bounds draws it.  Real input through CDP; presses hit-tested with elementFromPoint.
 *   1. the span: the 48-px shadow gutter is subtracted; an empty rack does not narrow it; hidden, phone and narrow
 *      racks are absent; setActive(false) stands it down
 *   2. adoption: the app's containers are used as they are (one #rack, no kit look class, the app's own width), its
 *      windows are taken over, not rebuilt, and drag like the kit's; an eager window is built at once; the transport
 *      card is no window (not in the FINDER or WINDOW) yet keeps its place; the app's own + button opens the FINDER (1.5.5)
 *   3. a ☆ layout written by BASINS' own rack.js (tests/fixtures/basins-layout.json) loads: order, sides, fold, close,
 *      float and the transport card's place.
 * Standalone: MIR_BASE=http://127.0.0.1:8795 node tests/rack-adopt.browser.mjs */
import fs from 'node:fs';
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8795';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
const BASINS = JSON.parse(fs.readFileSync(new URL('./fixtures/basins-layout.json', import.meta.url), 'utf8'));

const p = await launch({ width: 1280, height: 800 });
try {
  const load = async () => { await p.goto(BASE + '/tests/fixtures/rack-basins.html', 600); for (let i = 0; i < 40 && !(await p.eval('!!window.__ready')); i++) await sleep(100); await sleep(300); };
  await load();
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T, R = T.rack, S = T.span;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const dev = (id) => document.querySelector('.dev[data-id="' + id + '"]');
    const box = (id) => document.getElementById(id).getBoundingClientRect();
    const settle = async () => { for (let i = 0; i < 6; i++) { await Promise.all([...document.querySelectorAll('.dev')].map((d) => T.motion.settled(d))); await wait(30); } };
    ${body} })().then(JSON.stringify)`));
  const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  const hit = async (expr) => JSON.parse(await p.eval(`(() => { const e = (${expr}); const b = e.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2);
    const f = document.elementFromPoint(x, y); return JSON.stringify({ x, y, ok: !!f && (f === e || e.contains(f)) }); })()`));

  const first = await run(`return { left: R.order('left'), right: R.order('right') };`);
  check('adopt: the order is the app\'s as it stood (the transport card first in the left rack)', first.left.join() === 'transport,colour,camera' && first.right.join() === 'controls,settings,history', JSON.stringify(first));

  /* ── 1. the dock span is BASINS' rack-bounds ─────────────────────────────────────────────────────────────── */
  let r = await run(`const s = S.read(), L = box('rackL'), Rr = box('rack');
    return { s, want: { left: L.right - 48, right: Rr.left + 48 }, gutter: getComputedStyle(document.getElementById('rack')).getPropertyValue('--rack-shadow-gutter').trim() };`);
  check('span: the 48-px shadow gutter is subtracted from both racks (BASINS\' logical edge)', r.gutter === '48px' && Math.abs(r.s.left - r.want.left) < 0.5 && Math.abs(r.s.right - r.want.right) < 0.5 && r.s.width === r.s.right - r.s.left, JSON.stringify(r));
  r = await run(`for (const id of ['colour', 'camera']) R.close(id); T.wTr.root.hidden = true; await settle(); await wait(60);
    const s = S.read(), last = T.spans[T.spans.length - 1]; return { left: s.left, published: last && last.left };`);
  check('span: a rack with no open window does not narrow it (the left edge is the screen\'s, 8 px in), and it is published', r.left === 8 && r.published === 8, JSON.stringify(r));
  r = await run(`for (const id of ['colour', 'camera']) R.open(id); T.wTr.root.hidden = false; await settle();
    R.setHidden(true); await wait(500); const hidden = S.read();
    R.setHidden(false); await wait(500); document.body.classList.add('phone'); const phone = S.read(); document.body.classList.remove('phone');
    document.body.classList.add('ui-hidden'); const ui = S.read(); document.body.classList.remove('ui-hidden');
    return { hidden, phone, ui, vw: innerWidth };`);
  const absent = (s, vw) => s.left === 8 && s.right === vw - 8;
  check('span: a hidden rack (after its slide), the phone and H leave the span at the screen edges', absent(r.hidden, r.vw) && absent(r.phone, r.vw) && absent(r.ui, r.vw), JSON.stringify(r));
  await p.resize(820, 800); await sleep(300);
  r = await run(`const n = T.spans.length; S.setActive(false); R.close('history'); await wait(200); const quiet = T.spans.length === n; R.open('history'); S.setActive(true); await wait(100);
    return { s: S.read(), vw: innerWidth, quiet };`);
  check('span: at 860 px or narrower both racks are absent; setActive(false) publishes nothing', absent(r.s, r.vw) && r.quiet, JSON.stringify(r));
  await p.resize(1280, 800); await sleep(300);

  /* ── 2. adoption ──────────────────────────────────────────────────────────────────────────────────────────── */
  r = await run(`await settle(); return { racks: document.querySelectorAll('#rack').length + document.querySelectorAll('#rackL').length + document.querySelectorAll('#floats').length,
    kitClass: document.querySelectorAll('.mir-rack, .mir-rack-floats, .mir-rack-btn').length, adopted: document.getElementById('rack').hasAttribute('data-mir-adopted'),
    width: Math.round(box('rack').width), same: ['colour', 'camera', 'controls', 'settings', 'history', 'rackSave'].every((id) => R.window(id).root === T.built[id].root && T.built[id].root.__builtBy === 'app'),
    built: R.built, eager: T.notesBuilt, notesIn: !!dev('notes'), notesClosed: dev('notes') && dev('notes').classList.contains('closed'),
    left: R.order('left'), right: R.order('right') };`);
  check('adopt: the app\'s #rack / #rackL / #floats are used as they are — one of each, no kit look class, the app\'s own width (300 + 48)', r.racks === 3 && r.kitClass === 0 && r.adopted && r.width === 348, JSON.stringify(r));
  check('adopt: every app-built window is taken over (the same node, never rebuilt); an eager window is built once, closed', r.same && r.built === 8 && r.eager === 1 && r.notesIn && r.notesClosed, JSON.stringify(r));
  const before = await run(`return R.order('right');`);
  const a = await hit(`document.querySelector('.dev[data-id="settings"] .dev-eyebrow')`), b = await hit(`document.querySelector('.dev[data-id="history"] .dev-eyebrow')`);
  await mouse('mouseMoved', a.x, a.y); await mouse('mousePressed', a.x, a.y);
  for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', a.x, Math.round(a.y + ((b.y - 30 - a.y) * i) / 12)); await sleep(16); }
  await sleep(60); await mouse('mouseReleased', a.x, b.y - 30); await sleep(100);
  r = await run(`await settle(); return { right: R.order('right'), tr: dev('settings').style.translate };`);
  check('adopt: an adopted window drags by its header like the kit\'s own (hit-tested; reorder lands clean)', a.ok && before[0] === 'history' && r.right[0] === 'settings' && !r.tr, JSON.stringify({ before, a, r }));
  let h = await hit(`document.getElementById('finderOpen')`);
  await mouse('mouseMoved', h.x, h.y); await mouse('mousePressed', h.x, h.y); await mouse('mouseReleased', h.x, h.y); await sleep(450);
  r = await run(`const rows = [...document.querySelectorAll('.mir-window-picker .wp-row')].map((b) => b.dataset.win), shown = T.finder.shown; T.finder.close();
    const want = R.windows().filter((w) => !w.card).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })).map((w) => w.id);
    const menu = R.windowMenu().filter(Boolean).map((row) => row[0].replace(/^[↑⊕]\\s+/, '').split('\\t')[0]);
    return { rows, want, shown, menu, kitAdd: !!document.getElementById('rackAdd') || !!document.getElementById('rackAddList') };`);
  check('adopt: the app\'s own + button opens the FINDER (every window, A→Z); the transport card is in neither the FINDER nor WINDOW; the kit made no + list',
    h.ok && r.shown && r.rows.join() === r.want.join() && r.rows.length === 7 && !r.rows.includes('transport') && !r.menu.includes('TRANSPORT') && r.menu.length === 7 && !r.kitAdd, JSON.stringify({ h, r }));

  /* ── 3. a layout BASINS' own rack.js saved ────────────────────────────────────────────────────────────────── */
  r = await run(`localStorage.setItem('basins.settings', JSON.stringify({ layouts: { 1: ${JSON.stringify(BASINS.layout)} } }));
    const label = R.layouts()[0] && R.layouts()[0].label; const ok = R.loadLayout(1); await settle();
    const f = R.floatOf('settings'), sb = dev('settings').getBoundingClientRect();
    return { ok, label, left: R.order('left'), right: R.order('right'), all: [...document.getElementById('rack').querySelectorAll('.dev')].map((d) => d.dataset.id),
      folded: dev('camera').classList.contains('folded'), saveClosed: dev('rackSave').classList.contains('closed'),
      floating: R.floating(), at: f && [f.x, f.y], seen: [Math.round(sb.left), Math.round(sb.top)], trParent: T.wTr.root.parentElement.id };`);
  check('BASINS\' layout: its ☆ slot is listed and loads through the store adapter', r.ok && /^1  ·  6 windows  ·  both racks  ·  1 floating/.test(r.label), JSON.stringify(r));
  check('BASINS\' layout: order and sides, CAMERA folded, SAVE closed, SETTINGS floating at (520, 180), the transport card first in the left rack', r.left.join() === 'transport,colour,camera' && r.all.join() === 'notes,history,controls,rackSave'
    && r.folded && r.saveClosed && r.floating.join() === 'settings' && r.at.join() === '520,180' && r.seen.join() === '520,180' && r.trParent === 'rackL', JSON.stringify(r));
  /* BASINS parity, round seven: the kit's sortable list inside a window of the ADOPTED left rack (#rackL wears no kit look class)
     seats its chips on the rack's outer edge, as BASINS' three #rackL rules did by hand: the list reads [data-mir-rack][data-side] */
  {
    const r = await run(`
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '../../mir/controls/colour-controls.css';
      await new Promise((res) => { link.onload = res; link.onerror = res; document.head.appendChild(link); });
      const { sortableList } = await import('../../mir/controls/list.js');
      const host = [...document.querySelectorAll('#rackL > .dev')].find((d) => !d.classList.contains('folded') && d.querySelector('.dev-body') && d.dataset.id !== 'transport');
      const list = sortableList({ items: [{ id: 1 }, { id: 2 }], noun: 'colour', build(it, i, pane) { pane.style.minHeight = '44px'; } });
      host.querySelector('.dev-body').appendChild(list.root);
      await wait(120);
      const strip = list.stripOf(1).el.getBoundingClientRect(), pane = list.nodeOf(1).getBoundingClientRect();
      const grip = list.root.querySelector('.mir-list-item .mir-chip'), g = grip.getBoundingClientRect(), hit = document.elementFromPoint(g.left + g.width / 2, g.top + g.height / 2);
      const out = { rack: document.getElementById('rackL').className, hook: document.getElementById('rackL').dataset.mirRack, side: document.getElementById('rackL').dataset.side,
        stripRight: Math.round(strip.right), paneLeft: Math.round(pane.left), gripHit: !!hit && (hit === grip || grip.contains(hit)) };
      list.destroy(); list.root.remove(); link.remove();
      return out;`);
    check('the sortable list in an adopted left rack (no kit look class) puts its chips on the outer edge, left of the pane; the grip is what a hand presses', r.rack === '' && r.hook === '' && r.side === 'left' && r.stripRight <= r.paneLeft + 1 && r.gripHit, JSON.stringify(r));
  }
  /* 1.5.6-alpha.28 · THE CARD'S × AND THE BARE POP: an app card's × closes through the rack (its onClose runs, once); popped,
     a { bare: true } card draws no title bar — its × and rail chip stay (the house skin hides the pop chip everywhere) */
  {
    const at = await run(`const { device } = await import('/mir/kit.js'); const d = device({ id: 'probe', eyebrow: 'PROBE' });
      document.getElementById('rackL').appendChild(d.root); window.__shut = 0;
      R.register({ id: 'probe', el: d, card: true, bare: true, onClose: () => { window.__shut++; } }); R.open('probe'); await settle();
      const b = d.root.querySelector('.dev-close').getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };`);
    await mouse('mouseMoved', at.x, at.y); await mouse('mousePressed', at.x, at.y); await mouse('mouseReleased', at.x, at.y); await sleep(120);
    const shut = await run(`return { shut: window.__shut, closed: dev('probe').classList.contains('closed'), again: R.close('probe') && window.__shut };`);
    check('an app card\'s × closes through the rack: its onClose runs once (the empty-slot bug)', shut.shut === 1 && shut.closed && shut.again === 1, JSON.stringify(shut));
    const bare = await run(`R.open('probe'); R.float('probe'); await settle(); const h = dev('probe').querySelector('.dev-head'), cs = (n) => getComputedStyle(n);
      const out = { floating: dev('probe').classList.contains('floating'), id: cs(h.querySelector('.dev-id')).display, close: cs(h.querySelector('.dev-close')).display, rail: cs(h.querySelector('.dev-rail')).display, head: cs(h).position };
      R.dock('probe'); await settle(); out.docked = cs(dev('probe').querySelector('.dev-id')).display; R.close('probe'); return out;`);
    check('a bare card popped off the rack draws no title bar; its × and rail chip stay; docked again, its title is back',
      bare.floating && bare.id === 'none' && bare.close !== 'none' && bare.rail !== 'none' && bare.head === 'absolute' && bare.docked !== 'none', JSON.stringify(bare));
  }
  {
    /* 1.6.0-alpha.29: an ADOPTED card — the registration's onPower is the hand's press (and rack.power), not a restore's setOff */
    const pwr = await run(`const { device } = await import('/mir/kit.js'); const log = [], own = [], ev = [];
      const d = device({ id: 'pwa', eyebrow: 'PWA', loadingMark: false, onPower: (live) => own.push(live) }); document.getElementById('rack').appendChild(d.root);
      R.register({ id: 'pwa', el: d, onPower: (live) => log.push(live) }); d.root.addEventListener('devpower', (e) => ev.push(e.detail.on));
      R.power('pwa', false); const a = { log: log.join(), own: own.join(), ev: ev.join(), off: d.off };
      d.root.querySelector('.dev-power').click(); const b = { log: log.join(), ev: ev.join(), off: d.off };
      const L = R.capture(); L.cards.find((c) => c.id === 'pwa').off = true; R.apply(L); await settle();
      const c = { log: log.join(), own: own.join(), ev: ev.join(), off: d.off }; R.power('pwa', true); R.close('pwa'); return { a, b, c };`);
    check('an adopted card: rack.power and the click run the registration\'s onPower and `devpower`; a restore (apply) runs neither — only device({ onPower }), which fires on every setOff',
      pwr.a.log === 'false' && pwr.a.own === 'false' && pwr.a.ev === 'false' && pwr.a.off && pwr.b.log === 'false,true' && pwr.b.ev === 'false,true' && !pwr.b.off
      && pwr.c.off && pwr.c.log === 'false,true' && pwr.c.ev === 'false,true' && pwr.c.own === 'false,true,false', JSON.stringify(pwr));
  }
  {
    /* 1.6.0-alpha.30: an ADOPTED card says its kind and its first fold at the registration */
    const kf = await run(`const { device } = await import('/mir/kit.js'); const mk = (id) => { const d = device({ id, eyebrow: id.toUpperCase(), loadingMark: false }); document.getElementById('rack').appendChild(d.root); return d; };
      const a = mk('kfa'), b = mk('kfb'); R.register({ id: 'kfa', el: a, kind: 'control', folded: true }); R.register({ id: 'kfb', el: b.root, kind: 'other', folded: true });
      const out = { a: [a.root.classList.contains('folded'), a.root.dataset.kind, a.root.querySelector('.dev-fold').getAttribute('aria-expanded')], b: [b.root.classList.contains('folded'), b.root.dataset.kind],
        rows: R.windows().filter((x) => x.id.startsWith('kf')).map((x) => x.kind + ':' + x.folded).join() };
      R.close('kfa'); R.close('kfb'); return out;`);
    check('an adopted card (a device() result, or its bare element) arrives folded and wears data-kind when its registration says { kind, folded: true }',
      kf.a[0] && kf.a[1] === 'control' && kf.a[2] === 'false' && kf.b[0] && kf.b[1] === 'other' && kf.rows === 'control:true,other:true', JSON.stringify(kf));
  }
  check('the page raised no exception', !p.logs.some((l) => l.startsWith('EXCEPTION')), p.logs.join(' | '));
} finally {
  await p.close();
}
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} rack adoption checks pass`);
if (failed) process.exit(1);
