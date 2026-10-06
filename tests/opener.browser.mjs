/* opener.browser.mjs — THE OPENER in a real page (tests/fixtures/opener.html), real input through CDP.
 * Proves: the title screen shows three of the four covers, NEW, and RESUME only when a session exists (each button hit-tested
 * with elementFromPoint) · hover picks the cover by lanes · Tab then the arrow keys move across the grid and Enter picks (the
 * pick runs onPick after the fade) · a mouse click on RESUME resolves 'resume' · ?starter= opens a start with no screen ·
 * the previews are lazy and obey the motion policy (play() is asked of covers on screen, never under reduced motion) · the
 * notice: once per browser by default, every cold start with warn 'every', ?warn=0 skips it, ?warn=1 forces it.
 * Standalone: node tools/serve.mjs 8854 & MIR_BASE=http://127.0.0.1:8854 node tests/opener.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = (process.env.MIR_BASE || 'http://127.0.0.1:8854').replace(/\/$/, '');
const PAGE = BASE + '/tests/fixtures/opener.html';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1100, height: 800 });
try {
  const q = (expr) => p.eval(expr);
  const wait = async (expr, ms = 4000) => { for (let t = 0; t < ms; t += 100) { if (await q(expr)) return true; await sleep(100); } return false; };
  const box = async (sel) => JSON.parse(await q(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'null'; const b = e.getBoundingClientRect(); const x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2); const h = document.elementFromPoint(x, y); return JSON.stringify({ x, y, hit: !!h && (h === e || e.contains(h)), got: h ? h.className : null }); })()`));
  const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });
  const covers = async () => JSON.parse(await q(`JSON.stringify([...document.querySelectorAll('.mir-opener-option')].map((b) => b.dataset.cover))`));

  /* ── the screen, with a saved session ── */
  await p.goto(PAGE + '?fresh&seed&seen', 1500);
  check('the screen is up', await wait(`!!document.querySelector('.mir-opener')`));
  const list = await covers();
  check('it shows three of the four covers (the fourth is reached by ?starter= only)', list.length === 3 && !list.includes('hidden'), JSON.stringify(list));
  check('NEW is on the screen and takes the click (elementFromPoint)', (await box('.mir-opener-home')).hit);
  const rb = await box('.mir-opener-resume');
  check('RESUME is offered because a session exists, and takes the click', !!rb && rb.hit, JSON.stringify(rb));
  check('the screen is a modal dialog with a name', await q(`(() => { const r = document.querySelector('.mir-opener'); return r.getAttribute('role') === 'dialog' && r.getAttribute('aria-modal') === 'true' && !!r.getAttribute('aria-label'); })()`));
  check('body scroll is held while the screen is up', await q(`document.body.style.overflow === 'hidden'`));

  /* ── the previews: lazy, and asked to play only for covers on screen ── */
  await sleep(500);
  check('no preview fetches anything until it plays (preload none)', await q(`[...document.querySelectorAll('.mir-opener-preview')].every((v) => v.preload === 'none')`));
  check('the previews on screen were asked to play', (await q(`window.__plays`)) >= 1, String(await q(`window.__plays`)));

  /* ── hover by lanes ── */
  const second = await box('.mir-opener-option[data-cover="piezo"]');
  await mouse('mouseMoved', second.x, second.y); await sleep(150); await mouse('mouseMoved', second.x + 4, second.y + 6); await sleep(250);
  check('hover makes the cover under the pointer the active one', await q(`document.querySelector('.mir-opener-option[data-active]')?.dataset.cover`) === 'piezo');
  check('the active cover is lit and posed: its pointer variables are written', await q(`(() => { const b = document.querySelector('.mir-opener-option[data-active]'); return b.style.getPropertyValue('--tilt-y') !== '' && b.style.getPropertyValue('--pointer-x') !== ''; })()`));
  const lit = await q(`document.querySelector('.mir-opener-option[data-active] .mir-opener-cover').hasAttribute('data-lit')`);
  check('the kit\'s pointer light is on the active cover (data-lit)', lit === true);
  const third = await box('.mir-opener-option[data-cover="gamma"]');
  await mouse('mouseMoved', third.x, third.y); await sleep(250);
  check('moving to the next lane moves the activity', await q(`document.querySelector('.mir-opener-option[data-active]')?.dataset.cover`) === 'gamma');
  await mouse('mouseMoved', 5, 5); await sleep(150);

  /* ── the keyboard: Tab, the arrows, Enter ── */
  await p.key('Tab');
  check('Tab goes to the first cover', await q(`document.activeElement?.dataset?.cover`) === 'alpha');
  await p.key('ArrowRight');
  check('ArrowRight moves to the next cover', await q(`document.activeElement?.dataset?.cover`) === 'piezo');
  await p.key('ArrowRight'); await p.key('ArrowRight');
  check('the arrows wrap', await q(`document.activeElement?.dataset?.cover`) === 'alpha');
  await p.key('ArrowLeft');
  check('ArrowLeft wraps the other way', await q(`document.activeElement?.dataset?.cover`) === 'gamma');
  await p.key('ArrowLeft');
  check('a focused cover is the active one', await q(`document.querySelector('.mir-opener-option[data-active]')?.dataset.cover`) === 'piezo');
  await p.key('Enter');
  check('Enter picks: the chosen cover grows while the others go (data-launching)', await q(`!!document.querySelector('.mir-opener-card[data-launching]') && document.querySelector('.mir-opener-option[data-chosen]')?.dataset.cover === 'piezo'`));
  check('the screen goes and onPick runs after the fade', await wait(`window.__PICK === 'piezo'`, 5000), String(await q(`window.__PICK`)));
  check('start() resolved with the id, the screen is gone and the scroll is released', await wait(`window.__id === 'piezo' && !document.querySelector('.mir-opener') && document.body.style.overflow !== 'hidden'`));

  /* ── RESUME by a mouse click ── */
  await p.goto(PAGE + '?seed&seen', 1500);
  await wait(`!!document.querySelector('.mir-opener-resume')`);
  const rc = await p.click('.mir-opener-resume');
  check('RESUME takes the click', rc.hit, rc.got);
  check('it resolves \'resume\'', await wait(`window.__id === 'resume'`, 5000), String(await q(`window.__id`)));

  /* ── no session: no RESUME; NEW resolves 'home' ── */
  await p.goto(PAGE + '?fresh&seen', 1500);
  await wait(`!!document.querySelector('.mir-opener')`);
  check('with no session there is no RESUME', await q(`!document.querySelector('.mir-opener-resume')`));
  const nc = await p.click('.mir-opener-home');
  check('NEW takes the click', nc.hit, nc.got);
  check('it resolves \'home\'', await wait(`window.__id === 'home'`, 5000), String(await q(`window.__id`)));

  /* ── the switches ── */
  await p.goto(PAGE + '?fresh&seen&starter=piezo', 1500);
  check('?starter=piezo opens that start at once, with no screen', await wait(`window.__id === 'piezo'`) && await q(`!document.querySelector('.mir-opener')`));
  await p.goto(PAGE + '?fresh&seen&starter=hidden', 1500);
  check('?starter= reaches a cover the screen does not show', await wait(`window.__id === 'hidden'`));
  await p.goto(PAGE + '?fresh&seen&starter=nonsense', 1500);
  check('an unknown ?starter= is ignored: the screen shows', await wait(`!!document.querySelector('.mir-opener')`) && (await q(`window.__id === undefined`)));

  /* ── reduced motion: the previews never play ── */
  await p.goto(PAGE + '?fresh&seen&reduced', 1500);
  await wait(`!!document.querySelector('.mir-opener')`); await sleep(500);
  check('under reduced motion the previews are never asked to play', (await q(`window.__plays`)) === 0, String(await q(`window.__plays`)));
  check('and the sheet draws no transition or growth', await q(`getComputedStyle(document.querySelector('.mir-opener-cover')).transitionDuration === '0s'`));

  /* ── the notice ── */
  await p.goto(PAGE + '?fresh', 1500);
  check('the first visit shows the notice before the screen (once per browser)', await wait(`!!document.querySelector('.mir-dialog')`) && await q(`!document.querySelector('.mir-opener')`));
  const cb = await p.click('.mir-dialog .trig');
  check('CONTINUE takes the click', cb.hit, cb.got);
  check('then the screen opens', await wait(`!!document.querySelector('.mir-opener')`));
  await p.goto(PAGE, 1500);
  check('the second visit does not show the notice again (the kit\'s default)', await wait(`!!document.querySelector('.mir-opener')`) && await q(`!document.querySelector('.mir-dialog')`));
  await p.goto(PAGE + '?every&seen', 1500);
  check('warn "every" shows it on every cold start, though it was read', await wait(`!!document.querySelector('.mir-dialog')`) && await q(`!document.querySelector('.mir-opener')`));
  await p.goto(PAGE + '?fresh&every', 1500);
  await wait(`!!document.querySelector('.mir-dialog')`);
  await p.click('.mir-dialog .trig'); await wait(`!!document.querySelector('.mir-opener')`);
  check('"every" never writes the seen flag, so the next load asks again', await q(`localStorage.getItem('mir.flashNotice')`) === null);
  await p.goto(PAGE + '?every&warn=0', 1500);
  check('?warn=0 skips it and resumes at once (no notice, no screen)', await wait(`window.__id === 'resume'`) && await q(`!document.querySelector('.mir-dialog') && !document.querySelector('.mir-opener')`));
  await p.goto(PAGE + '?seen&warn=1', 1500);
  check('?warn=1 forces it though it was read', await wait(`!!document.querySelector('.mir-dialog')`));
  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} opener checks FAILED` : `ALL ${results.length} MIR opener browser checks passed`);
process.exit(failed.length ? 1 : 0);
