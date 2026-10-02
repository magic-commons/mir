#!/usr/bin/env node
/* check-app.mjs — load an MIR app in headless Chromium, PLAY it with real keys and clicks, and say whether it works.
 *
 *   node tools/check-app.mjs http://127.0.0.1:8800/app/ [steps…] [--expect …] [--shot out.png] [--light]
 *
 *   steps, run in the order written, after the app has started and its greeting has been put away:
 *     --keys Space,ArrowLeft,ArrowUp     real key presses (tools/cdp.mjs key(): 'Space', 'Enter', 'ArrowLeft', 'KeyX' or
 *                                        'X', 'Mod+S', '?'); 'wait500' waits 500 ms
 *     --click '#transport [data-opener="score"]'   a real click, refused (and reported) if something else is on top
 *     --wait 2000                        let the app run
 *   checks, after the steps:
 *     --expect playing | paused          the app's one clock (read from describe(): "**Clock:** playing")
 *     --expect 'some text'               describe() contains it
 *     --changed 'js expression'          the expression's value is different after the steps (e.g. 'JSON.stringify(window.__GAME.piece)')
 *   --shot out.png   a picture after the steps;  --light   the light theme first;  --pages   print each shared page in full
 *
 * Prints every console error and page exception, whether the boot card failed, each step and whether it landed,
 * describe() (the windows, the clock, every parameter and the keys in full; each shared page as its title and line count
 * unless --pages), and each check.  --expect still reads the whole describe(), pages included.  Exit 0 only when the page
 * started with no error and every step landed and every check held.  Needs a Chromium on PATH (or CHROMIUM=…). */
import { launch, sleep } from './cdp.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8800/app/';
const steps = [], expects = [], changed = [];
let shot = null, light = false, fullPages = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i], v = args[i + 1];
  if (a === '--keys') { steps.push({ keys: String(v).split(',').map((k) => k.trim()).filter(Boolean) }); i++; }
  else if (a === '--click') { steps.push({ click: v }); i++; }
  else if (a === '--wait') { steps.push({ wait: Number(v) || 0 }); i++; }
  else if (a === '--expect') { expects.push(v); i++; }
  else if (a === '--changed') { changed.push(v); i++; }
  else if (a === '--shot') { shot = v; i++; }
  else if (a === '--light') light = true;
  else if (a === '--pages') fullPages = true;
}
const p = await launch({ width: 1280, height: 800 });
let code = 0;
const bad = (line) => { console.log('FAIL  ' + line); code = 1; };
try {
  await p.goto(url, 2000);
  let started = false;
  for (let i = 0; i < 60 && !(started = await p.eval('!!(window.__MIR && window.__MIR.describe)').catch(() => false)); i++) await sleep(150);
  const failed = await p.eval(`(() => { const b = document.querySelector('.mir-boot[data-state="fail"]'); return b ? b.textContent : null; })()`);
  if (failed) bad('the boot card failed: ' + failed);
  if (!started) bad('window.__MIR.describe never appeared: the app did not finish starting (or does not call createDescribe / createApp)');
  if (light) { await p.eval(`(window.__MIR && window.__MIR.prefs) ? window.__MIR.prefs.set('theme', 'light') : (document.body.dataset.theme = 'light')`); await sleep(400); }
  if (started && steps.length) {
    await p.key('Escape'); await sleep(200);                            // the greeting leaves; the keys go to the page
    const before = [];
    for (const js of changed) before.push(await p.eval(js).catch((e) => 'threw: ' + e.message));
    for (const s of steps) {
      if (s.wait) { await sleep(s.wait); console.log(`step  wait ${s.wait} ms`); continue; }
      if (s.click) { const r = await p.click(s.click); if (r.hit) console.log('step  click ' + s.click); else bad(`click ${s.click}: ${r.got === 'absent' ? 'no such element' : 'something else is on top (' + r.got + ')'}`); await sleep(250); continue; }
      for (const k of s.keys) { if (/^wait\d+$/.test(k)) { await sleep(+k.slice(4)); continue; } try { await p.key(k); console.log('step  key ' + k); } catch (e) { bad(e.message); } await sleep(120); }
    }
    await sleep(300);
    for (const [i, js] of changed.entries()) { const now = await p.eval(js).catch((e) => 'threw: ' + e.message); if (now === before[i]) bad(`${js} did not change (${String(now).slice(0, 80)})`); else console.log(`PASS  ${js} changed`); }
  }
  if (shot) { await sleep(600); await p.shot(shot); }
  const errors = p.logs.filter((l) => /^(EXCEPTION|error)/.test(l));
  if (errors.length) bad(errors.length + ' console error(s):\n  ' + errors.join('\n  '));
  if (started) {
    const d = String(await p.eval('window.__MIR.describe()'));
    console.log('\n' + (fullPages ? d : String(await p.eval('window.__MIR.describe({ pages: false })')) + '(each shared page\'s text: --pages)'));
    for (const e of expects) {
      const ok = e === 'playing' || e === 'paused' ? new RegExp('\\*\\*Clock:\\*\\* ' + e).test(d) : d.includes(e);
      if (ok) console.log('PASS  expect ' + e); else bad('expect ' + e + (e === 'playing' || e === 'paused' ? ': the clock line says ' + ((d.match(/\*\*Clock:\*\*[^.]*/) || ['no clock'])[0]) : ': not in describe()'));
    }
  }
  console.log(code ? '\nNOT OK' : '\nOK: started with no console error' + (steps.length ? ', every step landed' : '') + (expects.length + changed.length ? ', every check held' : '') + (shot ? ' · picture: ' + shot : ''));
} catch (e) {
  console.log('the check threw: ' + (e && e.stack || e)); code = 1;
} finally { await p.close(); }
process.exit(code);
