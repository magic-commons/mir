#!/usr/bin/env node
/* check-app.mjs — load an MIR app in headless Chromium and say whether it started.
 *   node check-app.mjs http://127.0.0.1:8800/app/ [--shot out.png] [--light]
 * Prints every console error and page exception, whether the boot card failed, and the first lines of the app's
 * describe() (window.__MIR.describe, set by core/describe.js).  Exit 0 only when the page started with no error.
 * Needs a Chromium on PATH (or CHROMIUM=/path/to/chrome); nothing else. */
import { launch, sleep } from './tools/cdp.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8800/app/';
const shot = args.includes('--shot') ? args[args.indexOf('--shot') + 1] : null;
const p = await launch({ width: 1280, height: 800 });
let code = 0;
try {
  await p.goto(url, 2000);
  let started = false;
  for (let i = 0; i < 60 && !(started = await p.eval('!!(window.__MIR && window.__MIR.describe)').catch(() => false)); i++) await sleep(150);
  const failed = await p.eval(`(() => { const b = document.querySelector('.mir-boot[data-state="fail"]'); return b ? b.textContent : null; })()`);
  if (args.includes('--light')) { await p.eval(`document.body.dataset.theme = 'light'`); await sleep(400); }
  if (shot) { await sleep(600); await p.shot(shot); }
  const errors = p.logs.filter((l) => /^(EXCEPTION|error)/.test(l));
  if (failed) { console.log('BOOT FAILED: ' + failed); code = 1; }
  if (errors.length) { console.log(errors.length + ' console error(s):\n  ' + errors.join('\n  ')); code = 1; }
  if (!started) { console.log('window.__MIR.describe never appeared: the app did not finish starting (or does not call createDescribe)'); code = 1; }
  else console.log(String(await p.eval('window.__MIR.describe()')).split('\n').slice(0, 24).join('\n'));
  console.log(code ? '\nNOT OK' : '\nOK: started with no console error' + (shot ? ' · picture: ' + shot : ''));
} catch (e) {
  console.log('the check threw: ' + (e && e.stack || e)); code = 1;
} finally { await p.close(); }
process.exit(code);
