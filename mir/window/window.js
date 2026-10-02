/* window/window.js — the one floating window.
 *
 * THE LAW IT KEEPS: ONE WINDOW SPECIES, ONE PLACE THAT PLACES IT.  Every floating window in an app — MODULATION,
 * TIMELINE, SAVE/FOLDERS, PATTERN, HISTORY — is this: a glass pane, a chip rail beside it (window/rail.js), and one
 * layout function (windowLayout) that turns the window's state { x, y, w, h, open, dock, chipSide } into the rect
 * the pane lands in and the seat its rail lands in.  The drag, the resize, the dock, the three relocation gestures,
 * open and close all change the state and call that one function; nothing else writes the pane's box.  While the
 * window's own placement motion owns the pane (motion.owns), a plain relayout waits for it to land.
 *
 * And six rules:
 *   1. THE DOM CARRIES HOOKS, NOT LOOKS.  `data-mir-window="<id>"`, `data-mir-rail`, `data-mir-chip` and classes; the
 *      material is window.css, native.  No stylesheet is cloned at runtime (BASINS kwin.js adoptMaterial re-issued
 *      ~1,250 modulation-window rules per window) and nothing is styled by its label text.
 *   2. OPEN AND CLOSE HAVE MOTION (motion.presence), window and rail together; a dock landing travels (tweenRect).
 *   3. EVERY GESTURE IS core/pointer.js drag: coalesced, the last sample flushed before the commit, and any cancel —
 *      Escape, a lost capture, the window losing focus, a hidden page — rolls the state back.
 *   4. EMPTY GLASS IS A HANDLE (emptyDrag): a press that lands on nothing pressable is handed to the grip, so one
 *      gesture machinery moves the window from either.
 *   5. WINDOW AND RAIL RISE TOGETHER, by one stack shared by every window: a press anywhere on either puts the pair on
 *      top; z is the pair's place in the stack, so it stays small and nothing reads a sibling's style.
 *   6. IT SAYS WHERE IT IS: onMoved(rect) after every layout (null when it closes), so a host can dodge it.
 * Harvested from BASINS mir-plugins/kwin/kwin.js (the shell, the raise law, empty-glass drag), snap-window.js (the
 * drag, the Shift seat, the dock commit), save-window.js and timeline-window.js (how a window is made today).
 */
import { drag, installPress } from '../core/pointer.js';
import { presence, tweenRect, owns, settled } from '../core/motion.js';
import { rect, setVar, setAttr } from '../core/perf.js';
import { ariaLabel } from '../kit.js';
import { createRail, seatRail, seatOn, nearestSide, roomFor, markForwarded, RAIL } from './rail.js';
import { dockGeometry, createDockGuide } from './dock.js';

/** the house clamp (kwin.js): 120 px of a window stays across the screen, 52 px of it stays below its top */
export const CLAMP = Object.freeze({ x: 120, y: 52, inset: 16, top: 56 });
const CHIP_SIDES = ['left', 'right', 'top', 'bottom', 'auto'];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(Math.max(lo, hi), n));

/* ── the pure part: the persisted shape and the layout ─────────────────────────────────────────────────────── */
/** readShape(raw, defaults, min) — the one persistence shape { x, y, w, h, open, dock, chipSide }, every field
 *  checked: x/y a number or null (null = centred until a hand moves it), w/h at least `min`, dock top|bottom|null,
 *  chipSide left|right|top|bottom|auto.  Anything else falls back to the default. */
export function readShape(raw, d, min = { w: 0, h: 0 }) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const num = (v, f) => (Number.isFinite(v) ? Math.round(v) : f);
  return {
    x: num(r.x, d.x ?? null), y: num(r.y, d.y ?? null),
    w: Math.max(min.w, num(r.w, d.w)), h: Math.max(min.h, num(r.h, d.h)),
    open: typeof r.open === 'boolean' ? r.open : !!d.open,
    dock: r.dock === 'top' || r.dock === 'bottom' ? r.dock : null,
    chipSide: CHIP_SIDES.includes(r.chipSide) ? r.chipSide : (d.chipSide || 'left'),
  };
}
/** what the dock geometry is asked, the same for the guide and for the landing (so the guide IS the landing) */
export function dockInput(P, env) {
  return { span: env.span, side: P.chipSide === 'auto' ? 'left' : P.chipSide, height: Math.min(P.h, env.view.height - CLAMP.inset),
    railSizes: env.sizes, viewport: env.view };
}
/** windowLayout(P, env) — the state to the pane's rect and the rail's seat.  env = { view: { width, height },
 *  sizes: the rail's { vertical, horizontal }, span: the dock span or null }.  Docked when it can be; a dock with no
 *  room floats for now and keeps the wish (P.dock is not touched).  → { box, seat, docked } */
export function windowLayout(P, env) {
  const { view, sizes } = env;
  if (P.dock && env.span) {
    const g = dockGeometry({ ...dockInput(P, env), dock: P.dock });
    if (g) { const box = { left: g.left, top: g.top, width: g.width, height: g.height }; return { box, seat: seatOn(g.side, box, sizes, view), docked: P.dock }; }
  }
  const w = Math.min(P.w, view.width - CLAMP.inset), h = Math.min(P.h, view.height - CLAMP.inset);
  const x = P.x ?? Math.round((view.width - w) / 2), y = P.y ?? Math.round(Math.max(CLAMP.top, (view.height - h) / 2));
  const box = { left: clamp(x, CLAMP.x - w, view.width - CLAMP.x), top: clamp(y, 0, view.height - CLAMP.y), width: w, height: h };
  return { box, seat: seatRail({ prefer: P.chipSide, box, sizes, view }), docked: null };
}

/* ── the raise: one stack for every window, the pair rises together ────────────────────────────────────────── */
const STACK = [];
function raisePair(w) {
  const i = STACK.indexOf(w); if (i >= 0) STACK.splice(i, 1);
  STACK.push(w);
  STACK.forEach((x, k) => { setVar(x.root, 'z-index', String(1 + 2 * k)); setVar(x.rail, 'z-index', String(2 + 2 * k)); });
}
const pressed = new WeakSet();
function installOnce(doc) { if (pressed.has(doc)) return; pressed.add(doc); installPress({ selector: '.mir-chip', root: doc.defaultView }); }

/* what empty glass is NOT: anything a hand presses, edits or scrolls by itself (kwin.js's list) */
const PRESSABLE = 'button, input, select, textarea, a[href], label, summary, [contenteditable=""], [contenteditable="true"], ' +
  '[role="button"], [role="slider"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"], [tabindex]:not([tabindex="-1"]), ' +
  '.k, .fd, .sw, .seg, .trig, .mir-win-resize, canvas, video';
/** along(p, lo, size, next) — where a span of `next` starts so the point p keeps its place on it (detaching a dock) */
const along = (p, lo, size, next) => (p < lo ? lo : p > lo + size ? lo + size - next : p - ((p - lo) / size) * next);

/** createWindow({ id, title, host, chips, body | panels, size, min, resizable, emptyDrag, dock, persist, onMoved,
 *  onOpen, onClose })
 *    chips      rail chip specs (window/rail.js); a chip may carry press(state, win).  The close chip and the grip are
 *               added when absent; a radio chip named like a panel switches to it
 *    body       a Node, or fn(bodyEl) that fills the body;  panels: [{ name, body }] — one shown at a time (tab())
 *    size, min  { w, h } floating size and its floor;  resizable adds the corner;  emptyDrag true or a selector of
 *               the host's own pressable things
 *    dock       { span: { read(), subscribe(fn) } (dock.js observeSpan), guide: () => bool (the Display switch) }
 *    persist    { read() → shape | null, write(shape) }
 *  → { root, body, rail, open(), close(), toggle(), isOpen(), rect(), place(rect | pos, { animate }), setChip, tab,
 *      raise(), state(), destroy() } */
export function createWindow({ id, title = id, host, chips = [], body, panels, size = { w: 520, h: 360 }, min = { w: 240, h: 160 },
  resizable = false, emptyDrag = false, dock = null, persist = null, onMoved, onOpen, onClose } = {}) {
  const doc = host.ownerDocument, view = doc.defaultView;
  installOnce(doc);
  const mk = (tag, cls, parent) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (parent) parent.appendChild(n); return n; };

  /* ── the DOM ── */
  const root = mk('div', 'mir-win glass');
  root.dataset.mirWindow = id;
  root.setAttribute('role', 'group');
  ariaLabel(root, String(title));   // no toUpperCase: it would upper-case a translation
  root.hidden = true;
  const bodyEl = mk('div', 'mir-win-body', root);
  const fill = (target, b) => { const n = typeof b === 'function' ? b(target) : b; if (n && n.nodeType) target.appendChild(n); };
  const panelEls = new Map();
  if (panels && panels.length) {
    for (const p of panels) { const el = mk('div', 'mir-win-panel', bodyEl); el.dataset.panel = p.name; el.setAttribute('role', 'tabpanel'); fill(el, p.body); panelEls.set(p.name, el); }
  } else fill(bodyEl, body);
  const corner = resizable ? mk('div', 'mir-win-resize', root) : null;
  if (corner) { corner.setAttribute('role', 'separator'); ariaLabel(corner, 'Resize window'); }
  host.appendChild(root);

  /* ── the state ── */
  const P = readShape(persist && persist.read ? persist.read() : null, { w: size.w, h: size.h, chipSide: 'left' }, min);
  const wantOpen = P.open; P.open = false;
  let box = null, moving = null, deferred = false, gest = null, kbBefore = null, active = panels && panels.length ? panels[0].name : null;
  const env = () => ({ view: { width: view.innerWidth, height: view.innerHeight }, sizes: rail.sizes(), span: dock ? dock.span.read() : null });
  const shape = () => ({ x: P.x, y: P.y, w: P.w, h: P.h, open: P.open, dock: P.dock, chipSide: P.chipSide });
  const save = () => { if (persist && persist.write) persist.write(shape()); };

  const rail = createRail({ id, title, chips, layer: host,
    seats: () => ['left', 'right', 'top', 'bottom'].map((side) => ({ id: side, rect: relocated(side).seat })),
    onChip(name, state, spec) {
      if (spec.kind === 'close') { api.close(); return; }
      if (panelEls.has(name)) tab(name);
      if (spec.press) spec.press(state, api);
    },
    onSide(side, phase) {
      if (phase === 'preview') { if (!kbBefore) kbBefore = { ...P }; relocate(side); return; }
      if (phase === 'cancel') { if (kbBefore) { Object.assign(P, kbBefore); kbBefore = null; layout({ animate: true }); } return; }
      kbBefore = null;
      if (side && side !== P.chipSide) relocate(side);
      save();
    },
    onNudge(dx, dy) { if (P.dock || !box) return; P.x = box.left + dx; P.y = box.top + dy; layout({ animate: true }); save(); },
  });
  host.appendChild(rail.el);
  const pair = { root, rail: rail.el };
  const guide = dock ? createDockGuide({ layer: host, enabled: dock.guide || (() => true) }) : null;

  /* ── THE ONE PLACE THAT PLACES IT ── */
  function layout({ animate = false } = {}) {
    if (!P.open) return box;
    /* the window's own placement tween owns the pane: a plain relayout waits for it to land (presence, an entrance,
       does not place, so a drag during an entrance is not held up) */
    if (!animate && moving && owns(root)) {
      if (!deferred) { deferred = true; settled(root).then(() => { deferred = false; layout(); }); }
      return box;
    }
    const L = windowLayout(P, env());
    box = L.box;
    setAttr(root, 'data-dock', L.docked);
    if (animate) {
      const t = tweenRect(root, box); moving = t;
      t.then(() => { if (moving === t) moving = null; });
    } else {
      setVar(root, 'left', `${box.left}px`); setVar(root, 'top', `${box.top}px`);
      setVar(root, 'width', `${box.width}px`); setVar(root, 'height', `${box.height}px`);
    }
    rail.seat(L.seat, { animate });
    if (onMoved) onMoved({ ...box });
    return box;
  }
  /** stop the window's own travel where it is seen, so a hand can take it */
  function still() { if (moving) { moving = null; tweenRect(root, rect(root)); box = { ...box, ...pick(rect(root)) }; } }
  const pick = (r) => ({ left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) });
  const pin = () => { if (!P.dock && box) { P.x = box.left; P.y = box.top; } };
  /** the state after the hand chooses `side`: a floating window makes room for its rail there */
  function relocated(side) {
    const Q = { ...P, chipSide: side }, e = env();
    if (!Q.dock || !e.span) { const r = roomFor(windowLayout(Q, e).box, side, e.sizes, e.view); Q.x = r.left; Q.y = r.top; }
    return { Q, seat: windowLayout(Q, e).seat };
  }
  function relocate(side) { Object.assign(P, relocated(side).Q); layout({ animate: true }); }

  /* ── THE DRAG: the grip (and empty glass, handed to it) ── */
  const gripDrag = drag(rail.grip, { slop: RAIL.slop,
    onStart() { still(); pin(); gest = { before: { ...P }, anchor: null, shifted: false }; rail.grip.classList.add('drag'); },
    onMove(s) {
      if (!gest || rail.holding()) return;
      if (s.shiftKey) {                                              // Shift: the nearest edge takes the rail
        gest.shifted = true; gest.anchor = null; if (guide) guide.cancel();
        const side = nearestSide(s.x, s.y, box); if (side !== P.chipSide) relocate(side);
        return;
      }
      if (!gest.anchor) {
        const at = gest.shifted ? { x: s.x, y: s.y } : { x: s.x0, y: s.y0 };
        if (P.dock) {                                                // drag away to detach: the point keeps its place
          const e = env(), w = Math.min(P.w, e.view.width - CLAMP.inset), h = Math.min(P.h, e.view.height - CLAMP.inset);
          P.x = Math.round(along(at.x, box.left, box.width, w)); P.y = Math.round(along(at.y, box.top, box.height, h)); P.dock = null;
        }
        if (moving) still();
        gest.anchor = { dx: at.x - P.x, dy: at.y - P.y };
      }
      P.x = Math.round(s.x - gest.anchor.dx); P.y = Math.round(s.y - gest.anchor.dy);
      layout();
      if (guide) guide.track(box, dockInput(P, env()));
    },
    onEnd() {
      rail.grip.classList.remove('drag');
      const was = gest; gest = null;
      if (!was || rail.holding()) return;
      const hit = guide ? guide.end() : null;
      if (hit) { P.dock = hit.id; layout({ animate: true }); }
      save();
    },
    onCancel() {
      rail.grip.classList.remove('drag');
      if (guide) guide.cancel();
      if (!gest) return;
      Object.assign(P, gest.before); gest = null;
      still(); layout();
    },
  });
  const onEmpty = (e) => {
    const t = e.target;
    if (e.button !== 0 || !e.isPrimary || gripDrag.active || !(t instanceof view.Element)) return;
    if (t.closest(PRESSABLE + (typeof emptyDrag === 'string' ? ', ' + emptyDrag : ''))) return;
    if (t.scrollHeight > t.clientHeight || t.scrollWidth > t.clientWidth) {    // a scroller's own scrollbar is not glass
      const r = t.getBoundingClientRect();
      if (e.clientX - r.left - t.clientLeft >= t.clientWidth || e.clientY - r.top - t.clientTop >= t.clientHeight) return;
    }
    e.preventDefault();
    rail.grip.dispatchEvent(markForwarded(new view.PointerEvent('pointerdown', { pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: true,
      button: 0, buttons: e.buttons, clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, cancelable: true })));
  };
  if (emptyDrag) root.addEventListener('pointerdown', onEmpty);

  /* ── THE RESIZE CORNER (bottom-right; top-right when docked at the bottom, where the height grows upward) ── */
  let rz = null;
  const cornerDrag = corner && drag(corner, {
    onStart() { still(); pin(); rz = { ...P }; root.classList.add('resizing'); },
    onMove(s) {
      if (!rz) return;
      const e = env();
      if (!P.dock) P.w = Math.round(clamp(rz.w + s.dx, min.w, e.view.width - CLAMP.inset));
      P.h = Math.round(clamp(rz.h + (P.dock === 'bottom' ? -s.dy : s.dy), min.h, e.view.height - CLAMP.inset));
      layout();
    },
    onEnd() { root.classList.remove('resizing'); rz = null; save(); },
    onCancel() { root.classList.remove('resizing'); if (rz) { Object.assign(P, rz); rz = null; layout(); } },
  });

  /* ── the raise, the viewport, the racks ── */
  const raise = () => raisePair(pair);
  root.addEventListener('pointerdown', raise, true);
  rail.el.addEventListener('pointerdown', raise, true);
  const resized = () => layout();
  view.addEventListener('resize', resized, { passive: true });
  const unSpan = dock && dock.span.subscribe ? dock.span.subscribe(() => { if (P.dock) layout(); }) : null;

  function tab(name) {
    if (!panelEls.has(name)) return active;
    active = name;
    for (const [n, p] of panelEls) p.hidden = n !== name;
    if (rail.chip(name)) rail.setChip(name, true);
    bodyEl.scrollTop = 0;
    return name;
  }
  if (active) tab(active);

  const api = {
    root, body: bodyEl, rail, panels: panelEls,
    /** open() — measure and lay out once with nothing painted, then the entrance: window and rail together */
    open() {
      if (P.open) return;
      P.open = true;
      root.hidden = rail.el.hidden = false; rail.measure(); layout(); root.hidden = rail.el.hidden = true;
      raise();
      presence(root, true); presence(rail.el, true);
      if (onOpen) onOpen(api);
      save();
    },
    close() {
      if (!P.open) return;
      gripDrag.cancel(); if (cornerDrag) cornerDrag.cancel(); if (guide) guide.cancel();
      P.open = false; moving = null;
      presence(root, false); presence(rail.el, false);
      if (onMoved) onMoved(null);
      if (onClose) onClose(api);
      save();
    },
    toggle() { if (P.open) api.close(); else api.open(); },
    isOpen: () => P.open,
    rect: () => (box ? { ...box } : null),
    /** place(rect | pos, { animate }) — the host puts the window somewhere: it floats there */
    place(t, { animate = false } = {}) {
      if (t) {
        P.dock = null; P.x = Math.round(t.left ?? t.x); P.y = Math.round(t.top ?? t.y);
        if (t.width || t.w) P.w = Math.max(min.w, Math.round(t.width || t.w));
        if (t.height || t.h) P.h = Math.max(min.h, Math.round(t.height || t.h));
      }
      layout({ animate }); save();
    },
    setChip: rail.setChip, tab, raise,
    state: shape,
    destroy() {
      api.close(); gripDrag.destroy(); if (cornerDrag) cornerDrag.destroy(); if (guide) guide.destroy();
      if (unSpan) unSpan(); view.removeEventListener('resize', resized);
      const i = STACK.indexOf(pair); if (i >= 0) STACK.splice(i, 1);
      rail.destroy(); root.remove();
    },
  };
  if (wantOpen) api.open();
  return api;
}
