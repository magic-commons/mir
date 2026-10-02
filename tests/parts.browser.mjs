/* parts.browser.mjs — the shell parts under a real browser, a real pointer and real keys (tests/fixtures/parts.html).
 *   DIALOG: the focus goes in, Tab and Shift+Tab stay in, a hit-tested press on an action resolves the promise and the
 *     focus comes back; Escape resolves a confirm as false; a press outside dismisses and never reaches the stage; no
 *     element with a dimming background appears under it · NOTICE: the toast (the default, BASINS') is one seat, centred,
 *     84 px up (or an app's offset), no ×; a second replaces the first; it holds under the pointer and leaves after; the
 *     corner seat (NEBULA's) still stacks · BUSY: the mark animates only transform/opacity, and when stopped has no animation and writes
 *     nothing · BOOT: a failure becomes a readable message with COPY DETAILS · SETTINGS: a click changes a switch's
 *     value; sync() during a fader drag does not move the fader under the pointer; begin/end fire once around the drag
 *   · LANGUAGE: under setLanguage('qps') the dialog, the notice and the rows' labels are the pseudo-language.
 * Run by tests/run.mjs with MIR_BASE set; standalone: MIR_BASE=http://127.0.0.1:8800 node tests/parts.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8800';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1280, height: 800 });
try {
  await p.goto(BASE + '/tests/fixtures/parts.html', 800);
  for (let i = 0; i < 50 && !(await p.eval('!!window.__ready')); i++) await sleep(100);
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const T = __T; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const center = (n) => { const b = n.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
    ${body} })().then((v) => JSON.stringify(v === undefined ? null : v))`));
  let down = false;
  const mouse = (type, x, y) => {
    if (type === 'mousePressed') down = true; if (type === 'mouseReleased') down = false;
    const held = down && type === 'mouseMoved';
    return p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: down ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });
  };
  const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await sleep(60); };
  const key = async (k, code, vk, shift = false) => {
    const m = shift ? 8 : 0;
    await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: m });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: m }); await sleep(40);
  };
  /* every element that paints a background over half the viewport or more: a scrim would be one */
  const COVER = `[...document.querySelectorAll('body *')].filter((n) => { const b = n.getBoundingClientRect(), cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || b.width * b.height < innerWidth * innerHeight * 0.5) return false;
      const bg = cs.backgroundColor, m = bg.match(/rgba?\\(([^)]+)\\)/), a = m ? (m[1].split(/[ ,\\/]+/).filter(Boolean)[3] ?? '1') : '0';
      return +a > 0 || cs.backgroundImage !== 'none' || cs.backdropFilter !== 'none'; }).map((n) => n.id || n.className || n.tagName)`;

  /* ── DIALOG ── */
  const opener = await run(`return center(document.getElementById('opener'));`);
  await click(opener.x, opener.y);
  const coverBefore = await run(`return ${COVER};`);
  let r = await run(`window.__d = T.openDialog({ title: 'RENDER SETTINGS', body: 'Pick one.', actions: [{ label: 'CANCEL', value: 'cancel' }, { label: 'APPLY', kind: 'primary', value: 'apply' }] });
    window.__res = undefined; __d.result.then((v) => { window.__res = v; }); await wait(300);
    const d = document.querySelector('.mir-dialog'); return { open: !!d, inFocus: d.contains(document.activeElement), primary: document.activeElement.dataset.kind, cover: ${COVER} };`);
  check('dialog: it opens with the focus on the primary action', r.open && r.inFocus && r.primary === 'primary', JSON.stringify(r));
  check('dialog: NO SCRIM — nothing new paints over the page behind it', JSON.stringify(r.cover) === JSON.stringify(coverBefore), JSON.stringify({ before: coverBefore, after: r.cover }));
  const inside = [];
  for (let i = 0; i < 5; i++) { await key('Tab', 'Tab', 9); inside.push(await run(`return document.querySelector('.mir-dialog').contains(document.activeElement);`)); }
  for (let i = 0; i < 3; i++) { await key('Tab', 'Tab', 9, true); inside.push(await run(`return document.querySelector('.mir-dialog').contains(document.activeElement);`)); }
  check('dialog: Tab and Shift+Tab never leave it (8 presses)', inside.every(Boolean), JSON.stringify(inside));
  const apply = await run(`const b = document.querySelector('.mir-dialog [data-kind="primary"]'), c = center(b), hit = document.elementFromPoint(c.x, c.y); return { ...c, hit: !!hit && b.contains(hit) };`);
  check('dialog: elementFromPoint on APPLY is APPLY', apply.hit);
  await click(apply.x, apply.y); await sleep(350);
  r = await run(`return { res: window.__res, focus: document.activeElement.id, gone: !document.querySelector('.mir-dialog') };`);
  check('dialog: a real press on APPLY resolves "apply", the pane leaves, the focus returns to the opener', r.res === 'apply' && r.focus === 'opener' && r.gone, JSON.stringify(r));

  r = await run(`window.__c = undefined; T.confirmDialog('Delete it?', { yes: 'DELETE', danger: true }).then((v) => { window.__c = v; }); await wait(250); return true;`);
  await key('Escape', 'Escape', 27); await sleep(350);
  r = await run(`return { c: window.__c, focus: document.activeElement.id };`);
  check('confirm: Escape resolves false and the focus returns', r.c === false && r.focus === 'opener', JSON.stringify(r));

  await run(`window.__o = undefined; T.openDialog({ title: 'PICK', body: 'x' }).result.then((v) => { window.__o = v; }); await wait(250); return 1;`);
  await click(600, 700); await sleep(350);
  r = await run(`return { o: window.__o, stage: T.stageClicks.n };`);
  check('dialog: a press outside dismisses with null and never reaches the stage under it', r.o === null && r.stage === 0, JSON.stringify(r));
  r = await run(`const a = T.openDialog({ title: 'ONE' }), b = T.openDialog({ title: 'TWO' }); await wait(200);
    const n1 = document.querySelectorAll('.mir-dialog:not([hidden])').length, t1 = document.querySelector('.mir-dialog-title').textContent;
    a.close('x'); await wait(400); const t2 = [...document.querySelectorAll('.mir-dialog')].map((d) => d.querySelector('.mir-dialog-title').textContent); b.close(); await wait(350);
    return { n1, t1, t2 };`);
  check('dialog: one at a time — the second waits for the first', r.n1 === 1 && r.t1 === 'ONE' && r.t2.join() === 'TWO', JSON.stringify(r));

  /* ── NOTICE: the toast (the default, BASINS') ── */
  r = await run(`window.__n = T.notice('Saved.', { ms: 700 }); await wait(300); const n = __n.root, b = n.getBoundingClientRect(), c = center(n), hit = document.elementFromPoint(c.x, c.y);
    return { seats: document.querySelectorAll('.mir-toast').length, dx: +(b.left + b.width / 2 - innerWidth / 2).toFixed(2), bottom: +(innerHeight - b.bottom).toFixed(2),
      x: n.querySelectorAll('.mir-notice-x, button:not(.trig)').length, hit: !!hit && n.contains(hit), live: n.getAttribute('aria-live'), shown: !n.hidden };`);
  check('toast: one seat, centred within 1 px, 84 px above the bottom, no ×, polite, and elementFromPoint on it is it',
    r.seats === 1 && Math.abs(r.dx) <= 1 && Math.abs(r.bottom - 84) <= 1 && r.x === 0 && r.hit && r.live === 'polite' && r.shown, JSON.stringify(r));
  r = await run(`window.__n = T.notice('Second.', { ms: 700 }); await wait(150); const s = document.querySelectorAll('.mir-toast');
    return { seats: s.length, texts: [...s[0].querySelectorAll('.mir-notice-text')].map((x) => x.textContent), shown: !s[0].hidden, ...center(s[0]) };`);
  check('toast: a second notice REPLACES the first in the same seat', r.seats === 1 && r.texts.join() === 'Second.' && r.shown, JSON.stringify(r));
  await mouse('mouseMoved', r.x, r.y); await sleep(1300);
  check('toast: it holds while the pointer rests on it (1.3 s on a 0.7 s notice)', await run(`return !__n.root.hidden;`));
  await mouse('mouseMoved', 640, 400); await sleep(1300);
  check('toast: it leaves by itself once the pointer has gone', await run(`return __n.root.hidden;`));
  r = await run(`const n = T.notice('Higher.', { offset: 120, action: { label: 'UNDO' } }); await wait(300); const b = n.root.getBoundingClientRect();
    const out = { bottom: +(innerHeight - b.bottom).toFixed(2), action: !!n.root.querySelector('.trig') }; n.close(); await wait(300); return out;`);
  check('toast: an app passes its own offset (120 px), and an action sits inside the one seat', Math.abs(r.bottom - 120) <= 1 && r.action, JSON.stringify(r));

  /* ── NOTICE: the corner (seat: 'corner', NEBULA's) ── */
  r = await run(`window.__ns = ['One.', 'Two.', 'Three.'].map((t) => T.notice(t, { seat: 'corner', ms: 0 })); await wait(300); const st = document.querySelector('.mir-notices');
    return { n: st.querySelectorAll('.mir-notice').length, x: st.querySelectorAll('.mir-notice-x').length, pe: getComputedStyle(st).pointerEvents, live: st.getAttribute('aria-live') };`);
  check('corner: seat "corner" still stacks, each with its ×, and the stack takes no press', r.n === 3 && r.x === 3 && r.pe === 'none' && r.live === 'polite', JSON.stringify(r));
  if (process.env.MIR_PLATES) {
    for (const theme of ['dark', 'light']) {
      await run(`document.body.dataset.theme = '${theme}'; T.notice('Position copied.', { ms: 0 }); await wait(300); return 1;`);
      await p.shot(`docs/plates/parts/notice-toast-${theme}.png`, { x: 340, y: 640, width: 600, height: 120 });
      await p.shot(`docs/plates/parts/notice-corner-${theme}.png`, { x: 880, y: 560, width: 400, height: 240 });
    }
    await run(`document.body.dataset.theme = 'dark'; T.notice('', { ms: 1 }); await wait(400); return 1;`);
  }
  await run(`__ns.forEach((n) => n.close()); await wait(350); return 1;`);

  /* ── BUSY ── */
  r = await run(`const m = T.busyMark(document.getElementById('card'), { seat: 'card' }); window.__m = m; m.start(); await wait(200);
    const anims = m.root.getAnimations({ subtree: true }), props = new Set();
    for (const a of anims) for (const f of a.effect.getKeyframes()) for (const k of Object.keys(f)) if (!['offset', 'computedOffset', 'easing', 'composite'].includes(k)) props.add(k);
    return { n: anims.length, props: [...props] };`);
  const allowed = ['translate', 'opacity', 'transform', 'rotate', 'scale'];
  check('busy: the mark animates (10 animations: 9 squares + the breath) by transform and opacity only', r.n >= 10 && r.props.every((k) => allowed.includes(k)), JSON.stringify(r));
  r = await run(`__m.stop(); await wait(50); let writes = 0; const mo = new MutationObserver((l) => { writes += l.length; }); mo.observe(document.getElementById('card'), { subtree: true, attributes: true, childList: true, characterData: true });
    await wait(500); mo.disconnect(); return { anims: __m.root.getAnimations({ subtree: true }).length, writes, hidden: __m.root.parentElement.hidden };`);
  check('busy: stopped, it has no animation and writes nothing (0.5 s watched)', r.anims === 0 && r.writes === 0 && r.hidden, JSON.stringify(r));
  r = await run(`T.busyLogo(true); await wait(100); const on = { svg: document.querySelector('#title .mark').hidden, busy: !!document.querySelector('#title .mir-busy[data-on]') };
    T.busyLogo(false); await wait(50); return { on, off: { svg: document.querySelector('#title .mark').hidden, busy: !!document.querySelector('#title .mir-busy[data-on]') } };`);
  check('busy: the logo seat swaps the turning mark in for the still one, and back', r.on.svg && r.on.busy && !r.off.svg && !r.off.busy, JSON.stringify(r));
  await run(`T.busyCursor(true); return 1;`); await mouse('mouseMoved', 500, 300); await sleep(150);
  r = await run(`const m = document.querySelector('.mir-busy[data-seat="pointer"]'), b = m.getBoundingClientRect(); const on = m.hasAttribute('data-on'); T.busyCursor(false); return { on, x: Math.round(b.left), y: Math.round(b.top), off: !m.hasAttribute('data-on') };`);
  check('busy: the pointer seat follows the pointer (+15 px) while on, and stops', r.on && r.off && Math.abs(r.x - 515) < 20 && Math.abs(r.y - 315) < 20, JSON.stringify(r));

  /* ── BOOT ── */
  r = await run(`const b = T.bootCard({ name: 'NEBULA', steps: ['Asking for an adapter', 'Compiling'] }); b.step(); await wait(100);
    const walking = document.querySelector('.mir-boot-step').textContent;
    b.fail(new Error('requestAdapter() returned null'), { retry() {} }); await wait(200);
    const card = document.querySelector('.mir-boot'), btn = [...card.querySelectorAll('.trig')], c = center(btn[0]), hit = document.elementFromPoint(c.x, c.y);
    const out = { walking, role: card.getAttribute('role'), code: card.dataset.code, title: card.querySelector('.mir-boot-name').textContent, what: card.querySelector('.mir-boot-what').textContent,
      todo: card.querySelector('.mir-boot-todo').textContent, buttons: btn.length, hit: !!hit && btn[0].contains(hit), noMark: !card.querySelector('.mir-busy') };
    card.remove(); return out;`);
  check('boot: the card walks its steps, then fails into a readable message (what happened, what to do, COPY DETAILS, RETRY)',
    r.walking === 'Asking for an adapter' && r.role === 'alert' && r.code === 'noadapter' && r.title === 'NEBULA could not start' && /no graphics adapter/.test(r.what) && /Reload/.test(r.todo) && r.buttons === 2 && r.hit && r.noMark, JSON.stringify(r));

  /* ── SETTINGS ── */
  r = await run(`const b = document.querySelector('[data-id="on"] .sw'), c = center(b), hit = document.elementFromPoint(c.x, c.y); return { ...c, hit: !!hit && b.contains(hit) };`);
  await click(r.x, r.y);
  let s = await run(`return { on: T.S.on, hooks: T.hooks };`);
  check('settings: a real press on a switch row changes its value, as one begin/end', r.hit && s.on === true && s.hooks.begin.join() === 'on' && s.hooks.end.join() === 'on', JSON.stringify(s));
  const fd = await run(`T.hooks.begin.length = 0; T.hooks.end.length = 0; const f = document.querySelector('[data-id="depth"] .fd'), b = f.getBoundingClientRect(); return { x0: b.left + b.width * 0.2, x1: b.left + b.width * 0.7, y: b.top + b.height / 2, hit: f.contains(document.elementFromPoint(b.left + b.width * 0.2, b.top + b.height / 2)) };`);
  await mouse('mouseMoved', fd.x0, fd.y); await mouse('mousePressed', fd.x0, fd.y);
  for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', fd.x0 + (fd.x1 - fd.x0) * i / 6, fd.y); await sleep(30); }
  r = await run(`const w = T.panel.control('depth'), before = w.get(); T.S.depth = 0.01; T.panel.sync(); await wait(50);
    return { before, after: w.get(), fill: getComputedStyle(w.root).getPropertyValue('--fill'), editing: T.panel.editing('depth') };`);
  check('settings: sync() during a fader drag does not move the fader under the pointer', fd.hit && r.editing && Math.abs(r.after - r.before) < 1e-9 && r.before > 0.6 && +r.fill > 0.6, JSON.stringify(r));
  await mouse('mouseReleased', fd.x1, fd.y); await sleep(60);
  s = await run(`return { depth: T.S.depth, editing: T.panel.editing('depth'), hooks: T.hooks };`);
  check('settings: the drag was one edit: begin once, end once on release', !s.editing && s.hooks.begin.join() === 'depth' && s.hooks.end.join() === 'depth', JSON.stringify(s));
  r = await run(`T.S.depth = 0.25; T.S.mode = 'b'; T.panel.sync(); return { depth: T.panel.control('depth').get(), shown: !document.querySelector('[data-id="hidden"]').hidden, sel: document.querySelector('[data-id="pick"] select').value };`);
  check('settings: after the drag, sync() paints the new value; when() shows a row; the select is a kit well', r.depth === 0.25 && r.shown && r.sel === 'two', JSON.stringify(r));

  /* ── LANGUAGE ── */
  r = await run(`await T.setLanguage('qps'); await wait(100); const d = T.openDialog({ title: 'RENDER SETTINGS', actions: [{ label: 'APPLY' }] }); const n = T.notice('Saved.'); await wait(250);
    const title = document.querySelector('.mir-dialog-title').textContent, act = document.querySelector('.mir-dialog .trig-l').textContent, note = n.root.querySelector('.mir-notice-text').textContent,
      row = document.querySelector('[data-id="depth"] .fd-lbl').textContent, opt = document.querySelector('[data-id="pick"] option').textContent;
    d.close(); n.close(); await wait(300); await T.setLanguage('en'); await wait(100);
    const back = document.querySelector('[data-id="depth"] .fd-lbl').textContent;
    return { title, act, note, row, opt, back, ok: [title, act, note, row, opt].map((s) => T.unpseudo(s)) };`);
  check('language: under qps the dialog, its action, a notice, a row label and a select option are translated, and come back in English',
    r.title !== 'RENDER SETTINGS' && r.ok.join('|') === 'RENDER SETTINGS|APPLY|Saved.|DEPTH|LIGHT' && r.back === 'DEPTH', JSON.stringify(r));

  const errs = p.logs.filter((l) => !/favicon/.test(l));
  check('no page errors', errs.length === 0, errs.join(' | '));
} catch (e) {
  check('the run finished', false, String(e && e.stack || e));
} finally {
  await p.close();
}
console.log(results.join('\n'));
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\nparts: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
