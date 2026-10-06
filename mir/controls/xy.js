/* controls/xy.js — THE XY PAD: one square for the hand, and the two knobs that stay the modulation targets.
 *
 * THE LAW IT KEEPS: A COUPLED PAIR (pan x/y, Re c / Im c, az/el, a point in a plane) IS ONE PAD AND TWO KNOBS (AUTOMATA's MORPH contract,
 * `lab/main.js:691`).  The PAD is for the hand: drag, the arrow keys (Shift: the kit's fine gear), Home, Delete or a double-tap to centre.  The two KNOBS are the kit's own
 * `knob()`s, so each is a modulation target, a keyboard slider and a screen-reader value; a macro routes onto one of them, never onto
 * the pad.  The pad PAINTS FROM THE KNOBS' VALUES (the base, or the modulated value a route shows), so a modulated pair moves the dot and
 * the hand's base stays a ring: it cannot disagree with them.  The hand is the one knob law (kit.js): a press brings the dot to the
 * pointer; ⅛ fine on any modifier or a second finger, on a virtual point (nothing jumps when the gear engages); a double-tap centres.
 *   xyPad({ label, aria, x, y, home, tags, onInput, onChange, cls })
 *     x, y    each the options of the kit's knob() for that axis: { label, min, max, value, log, step, fmt, unit, title, … }
 *     home    [x, y] where Home and a double-tap go (default: the middle of each range)
 *     tags    { bl, br, tl, tr } words in the pad's corners (AUTOMATA's A B C D); words go through label()
 *     onInput(x, y) while the hand or a key moves it; onChange(x, y) when it lands
 *   → { root, pad, x, y, get() → [x, y], set(x, y), setDisabled(on), paint(), destroy() }   x and y are the knob widgets: register them as the targets
 * Styled by controls.css (`.mir-xy`, `.xy-pad`, `.xy-dot`, `.xy-base`). */
import { el, label, ariaLabel, knob, watchTouches, gearOf, tapWatcher, setKnobLaw } from '../kit.js';
import { setVar } from '../core/perf.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function xyPad(o = {}) {
  const root = el('div', 'mir-xy' + (o.cls ? ' ' + o.cls : ''));
  if (o.label) label(el('div', 'k-lbl', root), o.label);
  const body = el('div', 'mir-xy-body', root);
  const pad = el('div', 'xy-pad', body); pad.tabIndex = 0; pad.setAttribute('role', 'application');
  ariaLabel(pad, o.aria || o.label || 'XY pad');
  pad.setAttribute('aria-roledescription', 'XY pad');
  if (o.tags) for (const k of ['bl', 'br', 'tl', 'tr']) if (o.tags[k]) label(el('span', 'xy-tag xy-tag-' + k, pad), o.tags[k]);
  const ring = el('i', 'xy-base', pad); ring.hidden = true;
  const dot = el('i', 'xy-dot', pad);
  const side = el('div', 'mir-xy-side', body);
  const A = { x: o.x || {}, y: o.y || {} };
  const norm = (ax, v) => { const a = A[ax]; return a.log ? clamp01(Math.log(v / a.min) / Math.log(a.max / a.min)) : clamp01((v - a.min) / (a.max - a.min)); };
  const denorm = (ax, u) => { const a = A[ax]; return a.log ? a.min * Math.pow(a.max / a.min, clamp01(u)) : a.min + clamp01(u) * (a.max - a.min); };
  const snap = (ax, v) => { const a = A[ax]; return a.step ? Math.min(a.max, Math.max(a.min, Math.round((v - a.min) / a.step) * a.step + a.min)) : Math.min(a.max, Math.max(a.min, v)); };
  const home = o.home || [(A.x.min + A.x.max) / 2, (A.y.min + A.y.max) / 2];
  let disabled = false;
  const emit = () => { if (o.onInput) o.onInput(kx.get(), ky.get()); };
  const land = () => { if (o.onChange) o.onChange(kx.get(), ky.get()); };
  const mk = (ax) => knob({ ...A[ax], size: A[ax].size, onInput: (v) => { paintPad(); emit(); }, onChange: () => { paintPad(); land(); } });
  const kx = mk('x'), ky = mk('y');
  side.append(kx.root, ky.root);
  /* the pad paints from the knobs: wrap set and show (a route's show, the app's set) so every road repaints it */
  for (const k of [kx, ky]) {
    const set0 = k.set, show0 = k.show;
    k.set = function (v, silent) { set0.call(k, v, silent); paintPad(); };
    k.show = function (v) { show0.call(k, v); paintPad(); };
  }
  function paintPad() {
    const sx = kx.shown ?? kx.get(), sy = ky.shown ?? ky.get();
    const mod = kx.shown !== null && kx.shown !== undefined || ky.shown !== null && ky.shown !== undefined;
    setVar(dot, '--x', +norm('x', sx).toFixed(5)); setVar(dot, '--y', +norm('y', sy).toFixed(5));
    pad.classList.toggle('mod', mod); ring.hidden = !mod;
    if (mod) { setVar(ring, '--x', +norm('x', kx.get()).toFixed(5)); setVar(ring, '--y', +norm('y', ky.get()).toFixed(5)); }
  }
  /** the hand writes both bases */
  function put(x, y, fromHand = true) {
    x = snap('x', x); y = snap('y', y);
    if (x === kx.get() && y === ky.get()) return false;
    kx.set(x); ky.set(y); if (fromHand) emit(); return true;
  }

  /* ── the hand ── */
  watchTouches();
  let g = null;
  let homed = false;
  const tap = tapWatcher(() => { homed = true; if (put(home[0], home[1])) land(); });
  pad.addEventListener('pointerdown', (e) => {
    if (disabled || g || e.button) return;
    e.preventDefault();
    pad.focus({ preventScroll: true });
    homed = false; tap();
    if (homed) return;                                           // the second tap centres, and starts no drag
    try { pad.setPointerCapture(e.pointerId); } catch (_) {}
    const r = pad.getBoundingClientRect();
    g = { id: e.pointerId, lx: e.clientX, ly: e.clientY, w: r.width || 1, h: r.height || 1, ux: norm('x', kx.get()), uy: norm('y', ky.get()) };
    pad.classList.add('drag');
    if (gearOf(e, e.pointerId) === 1) {                          // a press brings the dot to the pointer; with the gear engaged nothing jumps
      g.ux = clamp01((e.clientX - r.left) / g.w); g.uy = clamp01(1 - (e.clientY - r.top) / g.h);
      put(denorm('x', g.ux), denorm('y', g.uy));
    }
  });
  pad.addEventListener('pointermove', (e) => {
    if (!g || e.pointerId !== g.id) return;
    const k = gearOf(e, g.id);                                   // the virtual point: gear · Δ / size on each axis
    g.ux = clamp01(g.ux + k * (e.clientX - g.lx) / g.w); g.uy = clamp01(g.uy - k * (e.clientY - g.ly) / g.h);
    g.lx = e.clientX; g.ly = e.clientY;
    put(denorm('x', g.ux), denorm('y', g.uy));
  });
  const end = (e) => { if (!g || (e && e.pointerId !== g.id)) return; g = null; pad.classList.remove('drag'); paintPad(); land(); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end); pad.addEventListener('lostpointercapture', end);
  pad.addEventListener('dblclick', (e) => { e.preventDefault(); });   // the double-tap is taken on the press (320 ms); a click would answer it a second time
  pad.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
  pad.addEventListener('keydown', (e) => {
    if (disabled || e.ctrlKey || e.metaKey || e.altKey) return;
    const d = 0.01 * (e.code.startsWith('Page') ? 10 : 1) * (e.shiftKey ? setKnobLaw().keyFine : 1);   // the kit's one fine gear
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1], PageUp: [0, 1], PageDown: [0, -1] }[e.code];
    if (!dir && e.code !== 'Home' && e.code !== 'Delete' && e.code !== 'Backspace') return;   // Home and Delete: home, as on a knob
    e.preventDefault(); e.stopPropagation();
    if (dir) put(denorm('x', norm('x', kx.get()) + dir[0] * d), denorm('y', norm('y', ky.get()) + dir[1] * d)); else put(home[0], home[1]);
    land();
  });
  paintPad();
  return { root, pad, x: kx, y: ky, get: () => [kx.get(), ky.get()], set(x, y) { kx.set(x); ky.set(y); },
    setDisabled(on) { disabled = !!on; root.classList.toggle('disabled', disabled); pad.tabIndex = on ? -1 : 0; pad.setAttribute('aria-disabled', String(!!on)); kx.setDisabled(on); ky.setDisabled(on); },
    paint: paintPad, destroy() { root.remove(); } };
}
