/* webkit.mjs — a WebKit page with the same small face as tools/cdp.mjs's, for tools/check-app.mjs --webkit (Safari is the iPad's engine).
 * It adds NOTHING to the kit: it uses a Playwright that is already on this machine and a WebKit Playwright already downloaded, and says
 * what is missing when either is not there.  Nothing is installed and nothing is fetched.
 *   PW_CORE=/path/to/playwright-core/index.mjs   the Playwright to use (default: `playwright-core` or `playwright` resolved from the
 *                                                  working directory, then from tools/ and the kit folder)
 *   WEBKIT=/path/to/pw_run.sh                    the WebKit launcher (default: the newest ~/.cache/ms-playwright/webkit-<n>/pw_run.sh;
 *                                                  PLAYWRIGHT_BROWSERS_PATH moves the folder)
 * launchWebkit({ width, height, engine }) → { logs, goto, eval, key, click, shot, close }, or throws an Error whose message says what to put
 * where.  engine 'chromium' drives Chromium through the same Playwright face (used to prove the adapter where WebKit cannot start). */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { createRequire } from 'node:module'; import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { keyOf, sleep } from './cdp.mjs';

/** playwrightKey(spec) → the string Playwright's keyboard.press wants for a tools/cdp.mjs key spec ('Mod+S' → 'Control+KeyS'); pure, exported for tests */
export function playwrightKey(spec) {
  const k = keyOf(spec), mods = [];
  if (k.mods & 1) mods.push('Alt'); if (k.mods & 2) mods.push('Control'); if (k.mods & 4) mods.push('Meta'); if (k.mods & 8) mods.push('Shift');
  return [...mods, k.code].join('+');
}

/** findPlaywright() → the module's file URL, or null; findWebkit() → the launcher's path, or null */
export function findPlaywright() {
  if (process.env.PW_CORE) return fs.existsSync(process.env.PW_CORE) ? pathToFileURL(process.env.PW_CORE).href : null;
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const from of [process.cwd(), here, path.join(here, '..')]) {
    for (const name of ['playwright-core', 'playwright']) { try { return pathToFileURL(createRequire(path.join(from, 'x.js')).resolve(name)).href; } catch {} }
  }
  return null;
}
export function findWebkit() {
  if (process.env.WEBKIT) return fs.existsSync(process.env.WEBKIT) ? process.env.WEBKIT : null;
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright');
  let names = []; try { names = fs.readdirSync(dir).filter((n) => /^webkit-\d+$/.test(n)).sort((a, b) => parseInt(b.slice(7)) - parseInt(a.slice(7))); } catch {}
  for (const n of names) { const f = path.join(dir, n, 'pw_run.sh'); if (fs.existsSync(f)) return f; }
  return null;
}
/** missingLibraries(launcher) → the shared libraries the downloaded WebKit cannot find on this machine (ldd on its MiniBrowser) */
export function missingLibraries(launcher) {
  const found = [];
  for (const sub of ['minibrowser-wpe/bin/MiniBrowser', 'minibrowser-wpe/MiniBrowser']) {
    const f = path.join(path.dirname(launcher), sub); if (!fs.existsSync(f)) continue;
    try { for (const l of execFileSync('ldd', [f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n')) { const m = /^\s*(\S+) => not found/.exec(l); if (m) found.push(m[1]); } } catch {}
    break;
  }
  return found;
}

export async function launchWebkit({ width = 1280, height = 800, engine = 'webkit' } = {}) {
  const core = findPlaywright();
  if (!core) throw new Error('--webkit needs a Playwright that is already on this machine, and none was found: set PW_CORE=/path/to/node_modules/playwright-core/index.mjs (or run from a folder where `playwright-core` resolves). Nothing is installed by this tool.');
  const pw = await import(core);
  const type = pw[engine] || pw.default?.[engine];
  let executablePath;
  if (engine === 'webkit') {
    executablePath = findWebkit();
    if (!executablePath) throw new Error('--webkit needs a WebKit that Playwright has already downloaded (~/.cache/ms-playwright/webkit-*/pw_run.sh, or WEBKIT=/path/to/pw_run.sh): none found. Nothing is installed by this tool.');
  } else executablePath = process.env.CHROMIUM || '/snap/bin/chromium';
  let browser;
  try { browser = await type.launch({ headless: true, executablePath, args: engine === 'webkit' ? [] : ['--no-sandbox'] }); }
  catch (e) {
    const miss = engine === 'webkit' ? missingLibraries(executablePath) : [];
    throw new Error(`${engine} would not start from ${executablePath}` + (miss.length ? `: this machine lacks ${miss.length} shared libraries it needs (${miss.join(', ')}); they come from the system's packages, which this tool does not install` : '') + '\n' + String(e.message).split('\n').slice(0, 6).join('\n'));
  }
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage(), logs = [];
  page.on('pageerror', (e) => logs.push('EXCEPTION ' + (e.stack || e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ' ' + m.text()); });
  return {
    logs, page, engine,
    async goto(url, settle = 1500) { await page.goto(url, { waitUntil: 'load' }).catch((e) => logs.push('EXCEPTION ' + e.message)); await sleep(settle); },
    /** a string is an expression, as tools/cdp.mjs eval takes it; a promise is awaited and the value comes back by value */
    async eval(expression) { return page.evaluate(expression); },
    async key(spec, { hold = 0 } = {}) { const combo = playwrightKey(spec); if (hold) { await page.keyboard.down(combo); await sleep(hold); await page.keyboard.up(combo); } else await page.keyboard.press(combo); await sleep(60); },
    async click(selector) {
      const at = await page.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const b = el.getBoundingClientRect(), x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2), h = document.elementFromPoint(x, y);
        return { x, y, hit: !!h && (h === el || el.contains(h)), got: h ? h.tagName.toLowerCase() + (h.id ? '#' + h.id : '') + '.' + String(h.className.baseVal ?? h.className).split(' ').join('.') : 'nothing' }; })()`);
      if (!at) return { hit: false, got: 'absent' };
      if (!at.hit) return at;
      await page.mouse.click(at.x, at.y); await sleep(120);
      return at;
    },
    async shot(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); await page.screenshot({ path: file }); },
    async close() { try { await browser.close(); } catch {} },
  };
}
