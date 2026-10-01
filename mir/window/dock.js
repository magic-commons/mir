/* window/dock.js — snapping a window between the racks.
 *
 * THE LAW IT KEEPS: THE GUIDE IS THE LANDING.  One function, dockGeometry(), says where a docked window lands — the
 * free span between the racks, the window's own height, and a lane on the CHIPS' side so the rail never sits on the
 * racks — and the same function draws the guide (core/proximity.js paints exactly the rect it is handed).  In BASINS
 * the modulation window's guide came from an older snapTarget() that always reserved the lane on the left, while its
 * commit used this geometry with the real chip side: the guide showed a box the window never landed in (survey B §3a).
 *
 * The span is the host's: { left, right, top, bottom } of the room the racks leave.  observeSpan() is a small helper
 * that watches the rack elements; a host makes ONE and hands it to every window (BASINS ran two, each with its own
 * observers and its own 350 ms rAF loop on the same two racks).  It does no work when nothing moves: a resize or a
 * ResizeObserver books one read, and a rack's own transition is followed frame by frame through the one frame only
 * until it ends.
 *
 * Harvested from BASINS timeline-dock.js (the geometry), mod-window-snap.js (SNAP), rack-bounds.js (the span).
 */
import { frame } from '../core/frame.js';
import { rect } from '../core/perf.js';
import { createProximity } from '../core/proximity.js';

export const DOCK = Object.freeze({ edge: 8, lane: 64, reach: 96, capture: 32, minWidth: 320, minHeight: 52 });
const SIDES = ['left', 'right', 'top', 'bottom'];

/** dockGeometry({ span, side, dock, height, railSizes, viewport }) — the exact rect a window docked at `dock`
 *  ('top' | 'bottom') lands in, with the chip lane on `side`.  If the preferred side has no room the others are
 *  tried in order (the preference is the caller's and is not changed).  → { left, top, width, height, side } | null */
export function dockGeometry({ span, side = 'left', dock = 'bottom', height, railSizes, viewport, edge = DOCK.edge, lane = DOCK.lane, minWidth = DOCK.minWidth }) {
  const vw = viewport.width, vh = viewport.height;
  for (const eff of [side, ...SIDES.filter((s) => s !== side)]) {
    const v = eff === 'left' || eff === 'right', size = railSizes[v ? 'vertical' : 'horizontal'];
    if (size.w > vw - edge * 2 || size.h > vh - edge * 2) continue;
    const room = v ? Math.max(lane, size.w) : size.h + edge;
    const left = Math.max(edge, span.left) + (eff === 'left' ? room : 0);
    const right = Math.min(vw - edge, span.right) - (eff === 'right' ? room : 0);
    const top = Math.max(edge, span.top ?? edge) + (eff === 'top' ? room : 0);
    const bottom = Math.min(vh - edge, span.bottom ?? vh - edge) - (eff === 'bottom' ? room : 0);
    if (right - left < minWidth || bottom - top < DOCK.minHeight) continue;
    const h = Math.min(height, bottom - top);
    return { left: Math.round(left), top: Math.round(dock === 'top' ? top : bottom - h), width: Math.floor(right - left), height: Math.floor(h), side: eff };
  }
  return null;
}

/** dockTargets(o) — the two docks as proximity targets: `rect` IS dockGeometry() (the guide = the landing), `hit` is
 *  the landing's leading edge, so a window is captured as its top (or bottom) edge comes within reach of it */
export function dockTargets(o) {
  const out = [];
  for (const dock of ['top', 'bottom']) {
    const g = dockGeometry({ ...o, dock });
    if (!g) continue;
    const y = dock === 'top' ? g.top : g.top + g.height;
    out.push({ id: dock, rect: { left: g.left, top: g.top, width: g.width, height: g.height }, hit: { left: g.left, top: y, width: g.width, height: 0 }, shape: 'rect', side: g.side });
  }
  return out;
}

/** createDockGuide({ layer, enabled }) — the drop-here guide for the two docks (reach 96, capture 32, as BASINS has
 *  it).  track(box, geometryInputs) measures and paints; end() → the captured target or null (release lands there);
 *  cancel() clears at once (Escape, blur, a hidden page — proximity.js listens).  enabled() false is the host's
 *  Display switch: nothing is drawn and the snap still works. */
export function createDockGuide({ layer, enabled = () => true } = {}) {
  const prox = createProximity({ layer, reach: DOCK.reach, capture: DOCK.capture, enabled });
  return {
    track: (box, o) => prox.update(box, dockTargets(o)),
    end() { const m = prox.end(); return m && m.captured ? m.captured : null; },
    cancel: () => prox.cancel(),
    destroy: () => prox.destroy(),
  };
}

/** observeSpan({ left, right, edge, view }) — the free span between two rack elements (either may be null), as
 *  { read(), subscribe(fn) → off, destroy() }.  A rack that is hidden, empty of boxes or slid off screen leaves the
 *  span at the viewport edge.  Make ONE per page and give it to every window. */
export function observeSpan({ left = null, right = null, edge = DOCK.edge, view = globalThis.window } = {}) {
  const doc = view.document, fns = new Set(), racks = [left, right].filter(Boolean);
  let last = '', following = 0;
  const shown = (n) => n && n.isConnected && !n.hidden && n.getClientRects().length > 0 && view.getComputedStyle(n).visibility !== 'hidden';
  function read() {
    const vw = view.innerWidth, vh = view.innerHeight;
    const l = shown(left) ? rect(left).right : 0, r = shown(right) ? rect(right).left : vw;
    return { left: Math.min(vw - edge, Math.max(edge, l)), right: Math.max(edge, Math.min(vw - edge, r)), top: edge, bottom: vh - edge };
  }
  const publish = () => {
    const s = read(), key = `${s.left.toFixed(1)}:${s.right.toFixed(1)}:${s.bottom}`;
    if (key !== last) { last = key; for (const fn of fns) fn(s); }
  };
  const book = () => frame.read(publish);
  const tick = () => { publish(); if (following) frame.read(tick); };
  const transition = (e) => {
    if (!racks.includes(e.target)) return;
    if (e.type === 'transitionrun') { if (!following++) frame.read(tick); }
    else { following = Math.max(0, following - 1); book(); }
  };
  const ro = view.ResizeObserver ? new view.ResizeObserver(book) : null;
  for (const n of racks) if (ro) ro.observe(n);
  view.addEventListener('resize', book, { passive: true });
  for (const t of ['transitionrun', 'transitionend', 'transitioncancel']) doc.addEventListener(t, transition);
  return {
    read,
    subscribe(fn) { fns.add(fn); return () => fns.delete(fn); },
    destroy() {
      fns.clear(); following = 0; if (ro) ro.disconnect();
      view.removeEventListener('resize', book);
      for (const t of ['transitionrun', 'transitionend', 'transitioncancel']) doc.removeEventListener(t, transition);
    },
  };
}
