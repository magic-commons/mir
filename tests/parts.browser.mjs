/* parts.browser.mjs — the shell parts under a real browser, a real pointer and real keys (tests/fixtures/parts.html).
 *   DIALOG: the focus goes in, Tab and Shift+Tab stay in, a hit-tested press on an action resolves the promise and the
 *     focus comes back; Escape resolves a confirm as false; a press outside dismisses and never reaches the stage; no
 *     element with a dimming background appears under it · NOTICE: the toast (the default, BASINS') is one seat, centred,
 *     84 px up (or an app's offset), no ×; a second replaces the first; it holds under the pointer and leaves after; the
 *     corner seat (NEBULA's) still stacks · BUSY: the mark animates only transform/opacity, and when stopped has no animation and writes
 *     nothing · BOOT: a failure becomes a readable message with COPY DETAILS
 *   · LANGUAGE: under setLanguage('qps') the dialog and the notice are the pseudo-language.
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
      xs: n.querySelectorAll('.mir-notice-x, button:not(.trig)').length, beneath: hit && hit.id, live: n.getAttribute('aria-live'), shown: !n.hidden, z: getComputedStyle(n).zIndex, ...c };`);
  check('toast: one seat, centred within 1 px, 84 px above the bottom, no ×, polite, z 50; elementFromPoint at its centre is the stage BENEATH it',
    r.seats === 1 && Math.abs(r.dx) <= 1 && Math.abs(r.bottom - 84) <= 1 && r.xs === 0 && r.beneath === 'stage' && r.live === 'polite' && r.shown && r.z === '50', JSON.stringify(r));
  const clicks0 = await run(`return T.stageClicks.n;`);
  await click(r.x, r.y);
  check('toast: a real click at its centre reaches the stage beneath it', (await run(`return T.stageClicks.n;`)) === clicks0 + 1);
  r = await run(`window.__n = T.notice('Second.', { ms: 700, action: { label: 'UNDO' } }); await wait(150); const s = document.querySelectorAll('.mir-toast'), a = s[0].querySelector('.trig'), c = center(a), hit = document.elementFromPoint(c.x, c.y);
    return { seats: s.length, texts: [...s[0].querySelectorAll('.mir-notice-text')].map((x) => x.textContent), shown: !s[0].hidden, onAction: !!hit && a.contains(hit), ...c };`);
  check('toast: a second notice REPLACES the first in the same seat, and its action (only) takes the pointer', r.seats === 1 && r.texts.join() === 'Second.' && r.shown && r.onAction, JSON.stringify(r));
  await mouse('mouseMoved', r.x, r.y); await sleep(1300);
  check('toast: it holds while the pointer rests on its action (1.3 s on a 0.7 s notice)', await run(`return !__n.root.hidden;`));
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

  /* ── THE PHOTOSENSITIVITY NOTICE IS BASINS' ORIGINAL (Josh, 2026-10-07): measured on basins-ui-fixes at 1280 × 800
     (startup.css .mandel-warn-*): the picture 352 px square, then 32 px; the title 22.4 px / 700 / 4.032 px tracking,
     then 16 px; the words 16 px / 26.4 px leading, 374 px wide, then 36 px; CONTINUE 172.95 × 49.625 px, 15.2 px / 600,
     padding 12.8 × 40 px, radius 4 px; the picture leads, the title follows ── */
  r = await run(`const art = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720"><path d="M360 40 700 680H20Z" fill="#c33"/></svg>');
    const done = T.photosensitivityNotice({ force: true, every: true, art, alt: 'caution' }); await wait(450);
    const d = document.querySelector('.mir-dialog[data-kind="notice"]'), cs = (n) => getComputedStyle(n), box = (n) => n.getBoundingClientRect();
    const img = d.querySelector('.mir-notice-art'), h = d.querySelector('.mir-dialog-title'), b = d.querySelector('.mir-dialog-body'), btn = d.querySelector('.mir-dialog-actions .trig');
    const out = { order: [...d.children].map((n) => n.className.baseVal ?? n.className).join(' > '), img: [box(img).width, box(img).height, cs(img).marginBottom],
      title: [cs(h).fontSize, cs(h).fontWeight, cs(h).letterSpacing, cs(h).marginBottom], body: [cs(b).fontSize, cs(b).lineHeight, box(b).width, cs(b).marginBottom, b.textContent],
      btn: [+box(btn).width.toFixed(2), +box(btn).height.toFixed(3), cs(btn).fontSize, cs(btn).fontWeight, cs(btn).padding, cs(btn).borderRadius] };
    btn.click(); await done; await wait(400); out.gone = !document.querySelector('.mir-dialog'); return out;`);
  check('notice: BASINS\' original — the picture first, its font, words, spacing and CONTINUE\'s size as measured on basins-ui-fixes',
    /^mir-notice-art > mir-dialog-title > mir-dialog-body/.test(r.order) && r.img.join() === '352,352,32px' && r.title.join() === '22.4px,700,4.032px,16px'
      && r.body.slice(0, 4).join() === '16px,26.4px,374,36px' && /^This app displays rapid strobing effects and changing colors\./.test(r.body[4])
      && r.btn.join() === '172.95,49.625,15.2px,600,12.8px 40px,4px' && r.gone, JSON.stringify(r));

  /* ── LANGUAGE ── */
  r = await run(`await T.setLanguage('qps'); await wait(100); const d = T.openDialog({ title: 'RENDER SETTINGS', actions: [{ label: 'APPLY' }] }); const n = T.notice('Saved.'); await wait(250);
    const title = document.querySelector('.mir-dialog-title').textContent, act = document.querySelector('.mir-dialog .trig-l').textContent, note = n.root.querySelector('.mir-notice-text').textContent;
    d.close(); n.close(); await wait(300); await T.setLanguage('en'); await wait(100);
    return { title, act, note, ok: [title, act, note].map((s) => T.unpseudo(s)) };`);
  check('language: under qps the dialog, its action and a notice are translated',
    r.title !== 'RENDER SETTINGS' && r.ok.join('|') === 'RENDER SETTINGS|APPLY|Saved.', JSON.stringify(r));

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
