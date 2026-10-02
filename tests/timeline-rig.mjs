/* timeline-rig.mjs — the harness the timeline's browser tests share (not a test: tests/run.mjs runs *.node.mjs and
 * *.browser.mjs).  BASINS' rigs (tools/rig/timeline-*.mjs) were written against Playwright; this is the small part of its
 * page API they use, over the kit's own tools/cdp.mjs (no dependency), so each rig is ported with its checks, names and
 * order intact: page.evaluate, waitForTimeout, mouse.{move,down,up,click,wheel}, keyboard.{press,down,up},
 * locator(sel).{boundingBox,count,first,click,focus,evaluate,textContent,getAttribute}, emulateMedia, screenshot, reload.
 * Every input is REAL (CDP Input.dispatch*: the browser's own pipeline), and EVERY PRESS IS HIT-TESTED: before a button
 * goes down the rig asks document.elementFromPoint what is under it and keeps the answer (presses()), so a test can
 * prove that what it pressed is what a person would have pressed.
 *   openTimeline({ base, query, width, height }) → { page, cdp, errors(), presses(), close() }
 *   ledger(name) → { ck(ok, label, evidence), finish(), checks } (BASINS pw.mjs ledger) */
import { launch, sleep, keyOf } from '../tools/cdp.mjs';

export const BASE = (process.env.MIR_BASE || 'http://127.0.0.1:8830').replace(/\/?$/, '/');   // tests/run.mjs passes it without the slash
const MOD_BITS = { Alt: 1, Control: 2, Meta: 4, Shift: 8 };
const BUTTON_BITS = { left: 1, right: 2, middle: 4 };
const KEY_NAMES = { Control: 'ControlLeft', Shift: 'ShiftLeft', Alt: 'AltLeft' };

export function ledger(name) {
  const checks = [];
  const ck = (ok, label, evidence) => { checks.push({ ok: !!ok, label, evidence }); if (!ok) console.log(name, 'FAIL', label, JSON.stringify(evidence)); return !!ok; };
  const finish = () => { const pass = checks.filter((c) => c.ok).length; console.log(`${name}: ${pass}/${checks.length} pass`); return { name, checks, pass, total: checks.length }; };
  return { ck, finish, checks };
}

export async function openTimeline({ base = BASE, query = '?fresh', width = 1920, height = 1080, page: path = 'gallery/timeline.html' } = {}) {
  const cdp = await launch({ width, height });
  const url = base + path + query;
  const ready = async () => { for (let i = 0; i < 60 && !(await cdp.eval('!!window.__ready')); i++) await sleep(100); await sleep(300); };
  await cdp.goto(url, 1200); await ready();
  const st = { x: 0, y: 0, buttons: 0, button: 'none', mods: 0 }, pressed = [];
  const send = (type, extra = {}) => cdp.send('Input.dispatchMouseEvent', { type, x: st.x, y: st.y, modifiers: st.mods, buttons: st.buttons, button: st.button, ...extra });
  const hit = async (x, y) => cdp.eval(`(() => { const n = document.elementFromPoint(${x}, ${y}); if (!n) return 'nothing';
    const c = String(n.className && n.className.baseVal !== undefined ? n.className.baseVal : n.className || ''); return n.tagName.toLowerCase() + (c ? '.' + c.trim().split(/\\s+/).join('.') : '') +
    (n.closest('.mir-timeline') ? ' @timeline' : n.closest('.mir-rail[data-mir-rail="timeline"]') ? ' @rail' : n.closest('.tl-pop, .tl-confirm') ? ' @popup' : n.closest('#bar') ? ' @bar' : n.closest('#card') ? ' @card' : ' @page'); })()`);
  const mouse = {
    async move(x, y, { steps = 1 } = {}) {
      const x0 = st.x, y0 = st.y;
      for (let i = 1; i <= steps; i++) { st.x = x0 + (x - x0) * i / steps; st.y = y0 + (y - y0) * i / steps; await send('mouseMoved', { button: st.buttons ? st.button : 'none' }); }
    },
    async down({ button = 'left', clickCount = 1 } = {}) {
      pressed.push({ x: Math.round(st.x), y: Math.round(st.y), button, at: await hit(st.x, st.y) });
      st.button = button; st.buttons |= BUTTON_BITS[button]; await send('mousePressed', { button, clickCount });
    },
    async up({ button = 'left', clickCount = 1 } = {}) { st.buttons &= ~BUTTON_BITS[button]; await send('mouseReleased', { button, clickCount }); if (!st.buttons) st.button = 'none'; },
    async click(x, y, { button = 'left' } = {}) { await mouse.move(x, y); await mouse.down({ button }); await mouse.up({ button }); },
    async wheel(dx, dy) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: st.x, y: st.y, deltaX: dx, deltaY: dy, modifiers: st.mods }); },
  };
  const keyboard = {
    async press(spec) {
      const name = String(spec).replace(/^Control\+/, 'Ctrl+').replace(/\+Control\+/, '+Ctrl+');
      await cdp.key(name);   // tools/cdp.mjs names Insert and the numpad's * and / since 1.5.0-alpha.11
    },
    async down(name) { st.mods |= MOD_BITS[name] || 0; const k = keyOf(KEY_NAMES[name] || name); await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, modifiers: st.mods }); },
    async up(name) { st.mods &= ~(MOD_BITS[name] || 0); const k = keyOf(KEY_NAMES[name] || name); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, modifiers: st.mods }); },
  };
  const q = (sel, i) => `([...document.querySelectorAll(${JSON.stringify(sel)})][${i}])`;
  const locator = (sel, i = 0) => ({
    first: () => locator(sel, 0),
    nth: (n) => locator(sel, n),
    count: () => cdp.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`),
    async boundingBox() { return cdp.eval(`(() => { const n = ${q(sel, i)}; if (!n) return null; const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; })()`); },
    async click({ button = 'left' } = {}) { const b = await this.boundingBox(); if (!b) throw new Error('rig: no ' + sel); await mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button }); await sleep(30); },
    focus: () => cdp.eval(`(() => { ${q(sel, i)}.focus(); return 0; })()`),
    evaluate: (fn, arg) => cdp.eval(`(${fn.toString()})(${q(sel, i)}, ${JSON.stringify(arg ?? null)})`),
    textContent: () => cdp.eval(`(() => { const n = ${q(sel, i)}; return n ? n.textContent : null; })()`),
    getAttribute: (name) => cdp.eval(`(() => { const n = ${q(sel, i)}; return n ? n.getAttribute(${JSON.stringify(name)}) : null; })()`),
  });
  const page = {
    evaluate: (fn, arg) => cdp.eval(`(${fn.toString()})(${JSON.stringify(arg ?? null)})`),
    waitForTimeout: (ms) => sleep(ms),
    mouse, keyboard, locator,
    async emulateMedia({ reducedMotion } = {}) { await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducedMotion || '' }] }); },
    screenshot: ({ path, clip }) => cdp.shot(path, clip ? { x: clip.x, y: clip.y, width: clip.width, height: clip.height } : undefined),
    async reload() { await cdp.goto(base + path + (query.replace(/[?&]fresh\b/, '') || ''), 1200); await ready(); },
  };
  return { page, cdp, errors: () => cdp.logs.filter((l) => l.startsWith('EXCEPTION')), presses: () => pressed.slice(), close: () => cdp.close() };
}
