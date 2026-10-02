/* cdp.mjs — a headless browser for the kit's proofs, with no dependency: Chromium's DevTools protocol over the
 * WebSocket Node 22 already has.  launch() starts a private Chromium; the page it returns can go to a URL,
 * evaluate an expression, resize, and take a screenshot.  Used by tools/shell-parity.mjs; any proof may import it.
 *   CHROMIUM=/path/to/chrome overrides the binary (default: the first of chromium, chromium-browser,
 *            google-chrome, google-chrome-stable on PATH, then the snap's /snap/bin/chromium).
 *   MIR_TMP=/some/dir puts the throwaway browser profile there.  A SNAP Chromium has a private /tmp and cannot
 *            write hidden home directories, so by default its profile goes to ~/snap/chromium/common, which both
 *            the snap and this process can reach (and so delete); any other Chromium uses the system temp.
 * Every browser this module starts is killed when the process exits, even if the caller throws. */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';

const LIVE = new Set();
const reap = () => { for (const b of LIVE) { try { b.proc.kill(); } catch {} try { fs.rmSync(b.profile, { recursive: true, force: true }); } catch {} } LIVE.clear(); };
process.on('exit', reap);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { reap(); process.exit(130); });

function findChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  for (const name of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    try { const p = execFileSync('which', [name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); if (p) return p; } catch {}
  }
  return '/snap/bin/chromium';
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** keyOf(spec) → { key, code, vk, mods, text } — what page.key() sends for 'Space', 'ArrowLeft', 'KeyZ', 'Z', '7',
 *  'Enter', 'Mod+S', 'Shift+Slash' or '?' (pure; exported for tests) */
const NAMED_KEYS = { Space: [' ', 32, ' '], Enter: ['Enter', 13, '\r'], Escape: ['Escape', 27], Tab: ['Tab', 9], Backspace: ['Backspace', 8], Delete: ['Delete', 46],
  ArrowLeft: ['ArrowLeft', 37], ArrowUp: ['ArrowUp', 38], ArrowRight: ['ArrowRight', 39], ArrowDown: ['ArrowDown', 40], Home: ['Home', 36], End: ['End', 35],
  PageUp: ['PageUp', 33], PageDown: ['PageDown', 34], Slash: ['/', 191, '/'], Comma: [',', 188, ','], Period: ['.', 190, '.'], Minus: ['-', 189, '-'], Equal: ['=', 187, '='],
  ShiftLeft: ['Shift', 16], ControlLeft: ['Control', 17], AltLeft: ['Alt', 18], Shift: ['Shift', 16, '', 'ShiftLeft'],
  Insert: ['Insert', 45], NumpadMultiply: ['*', 106, '*'], NumpadDivide: ['/', 111, '/'] };
export function keyOf(spec) {
  const parts = String(spec).split('+').filter(Boolean); let name = parts.pop() || '';
  let mods = 0;
  for (const m of parts) mods |= { Alt: 1, Ctrl: 2, Mod: 2, Meta: 4, Shift: 8 }[m] || 0;
  if (name === '?') { name = 'Slash'; mods |= 8; }
  if (name === ' ') name = 'Space';
  if (/^[a-z]$/i.test(name)) name = 'Key' + name.toUpperCase();
  if (/^[0-9]$/.test(name)) name = 'Digit' + name;
  const shift = (mods & 8) !== 0, plain = (mods & 7) === 0;
  if (/^Key[A-Z]$/.test(name)) { const c = name[3]; const t = shift ? c : c.toLowerCase(); return { key: t, code: name, vk: c.charCodeAt(0), mods, text: plain ? t : '' }; }
  if (/^Digit[0-9]$/.test(name)) { const d = name[5]; return { key: d, code: name, vk: d.charCodeAt(0), mods, text: plain && !shift ? d : '' }; }
  const n = NAMED_KEYS[name]; if (!n) throw new Error('cdp key: unknown key ' + spec);
  const key = name === 'Slash' && shift ? '?' : n[0];
  return { key, code: n[3] || name, vk: n[1], mods, text: plain && n[2] ? (name === 'Slash' && shift ? '?' : n[2]) : '' };
}

export async function launch({ width = 1280, height = 900, scale = 1, gpu = false, port = 9300 + Math.floor(Math.random() * 600) } = {}) {
  const bin = findChromium();
  let snap = false; try { snap = fs.realpathSync(bin).startsWith('/snap/') || bin.startsWith('/snap/'); } catch { snap = bin.startsWith('/snap/'); }
  const base = process.env.MIR_TMP || (snap ? path.join(os.homedir(), 'snap', 'chromium', 'common') : os.tmpdir());
  fs.mkdirSync(base, { recursive: true });
  const profile = fs.mkdtempSync(path.join(base, 'mir-cdp-'));
  const proc = spawn(bin, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb',
    /* grayscale text everywhere: whether Chromium uses subpixel (LCD) antialiasing depends on the compositing layer
       the text lands in — λWAVES' wordmark sits over canvases and gets grayscale, a plain page gets LCD — and a
       proof must not see that as a design difference (measured 2026-09-16: 0.35 % of the menubar strip, text only) */
    '--font-render-hinting=none', '--disable-lcd-text', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
    /* gpu: a real WebGPU adapter for an app that will not boot without one (MANDELBROT-REDUX's rig flags) */
    ...(gpu ? ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] : []), 'about:blank'],
  { stdio: 'ignore' });
  const handle = { proc, profile }; LIVE.add(handle);
  let ok = false;
  for (let i = 0; i < 80 && !ok; i++) { try { await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); ok = true; } catch { await sleep(250); } }
  if (!ok) { proc.kill(); LIVE.delete(handle); throw new Error('chromium (' + bin + ') did not open its DevTools port'); }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const pending = new Map(); const logs = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
    if (d.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    else if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'warning')) logs.push(d.params.type + ' ' + d.params.args.map((a) => a.value ?? a.description).join(' '));
  };
  /* every call has a deadline: a page wedged in GPU work must fail a proof, not hang it (MIR_CDP_TIMEOUT ms, default 90 s) */
  const LIMIT = Number(process.env.MIR_CDP_TIMEOUT) || 90000;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    const timer = setTimeout(() => { if (pending.delete(i)) reject(new Error(`cdp: ${method} took longer than ${LIMIT} ms`)); }, LIMIT);
    pending.set(i, (d) => { clearTimeout(timer); resolve(d); });
    try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(timer); pending.delete(i); reject(e); }
  });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  return {
    logs, send,
    async goto(url, settle = 1500) { await send('Page.navigate', { url }); await sleep(settle); },
    /** evaluate an expression in the page; a promise is awaited and the value comes back by value */
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.result.exceptionDetails) throw new Error('page: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
      return r.result.result.value;
    },
    /** a synthetic mouse: CSS :hover and pointerenter need the real input pipeline, not a dispatched event */
    async mouse(x, y, type = 'mouseMoved') { await send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1 }); },
    async shot(file, clip) {
      const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
      fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
    },
    /** key('Space' | 'ArrowLeft' | 'KeyZ' | 'Z' | 'Enter' | 'Mod+S' | 'Shift+Slash' | '?', { hold }) — a REAL key, through
     *  the browser's input pipeline (keydown, keypress for a printable one, keyup), so the page's key table, a focused
     *  button and a text field each see what a person's key would do.  Names are KeyboardEvent.code values, or a
     *  letter, digit or one of ' ? / '; Mod is Ctrl here (Linux).  hold: ms between down and up (a held key). */
    async key(spec, { hold = 0 } = {}) {
      const k = keyOf(spec);
      await send('Input.dispatchKeyEvent', { type: k.text ? 'keyDown' : 'rawKeyDown', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, modifiers: k.mods, ...(k.text ? { text: k.text, unmodifiedText: k.text } : {}) });
      if (hold) await sleep(hold);
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, modifiers: k.mods });
      await sleep(60);
    },
    /** click(selector) — a real mouse click at the element's centre, once elementFromPoint says it would land there.
     *  → { hit, got } (hit false: something else is on top, `got` names it, and nothing is clicked) */
    async click(selector) {
      const at = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const b = el.getBoundingClientRect(), x = Math.round(b.left + b.width / 2), y = Math.round(b.top + b.height / 2), h = document.elementFromPoint(x, y);
        return { x, y, hit: !!h && (h === el || el.contains(h)), got: h ? h.tagName.toLowerCase() + (h.id ? '#' + h.id : '') + '.' + String(h.className.baseVal ?? h.className).split(' ').join('.') : 'nothing' }; })()`);
      if (!at) return { hit: false, got: 'absent' };
      if (!at.hit) return at;
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
      await sleep(120);
      return at;
    },
    async resize(w, h) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false }); },
    /** a phone: mobile metrics, touch, and a pointer that reports (hover: none) — set it BEFORE goto */
    async phone(w = 390, h = 844) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: true });
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    },
    async close() { try { ws.close(); } catch {} proc.kill(); LIVE.delete(handle); await sleep(300); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} },
  };
}
