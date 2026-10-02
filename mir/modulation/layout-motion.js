/* modulation/layout-motion.js — THE MODULATION WINDOW'S LAYOUT MOTION (harvested from BASINS app/rack-motion.js
 * createLayoutMotion, branch basins-ui-fixes-2026-10-01, 2026-10-02; Josh: "Rack is going to have a drag animation
 * effect. Copy the same thing to the modulation window devices and macros").
 *
 * Explicit layout TRANSACTIONS for the modulation shelf: change(fn) reads every node's place and size, runs fn (a fold,
 * COMPACT, the macro rail folding, a reorder's DOM move), reads them again, and animates each node from where it was
 * to where it now lays out — real widths and heights (so neighbouring devices move with a shrinking rail; text is never
 * scaled) and a `translate` for the travel.  A reorder keeps the original DOM nodes, live curve editors included: the
 * held node follows the hand (hold / follow / release) and is never animated by a change; on release it settles from
 * the hand into its slot.
 *
 * Why not the rack's createRackMotion (shell/rack.js): that one OBSERVES its cards (any size change anywhere animates)
 * and moves vertical `.dev` cards; this window rebuilds its devices on edits and lays them out sideways, so it moves only
 * inside a transaction the controller opens.  BASINS ships the two for the same reason.
 *
 * THE LAWS IT KEEPS: BASINS' numbers are the kit's tokens (320 ms --motion-structural, cubic-bezier(.22, 1, .36, 1)
 * --ease-out); reduced motion, `off` and the flat tier (duration 0) jump; every animation joins core/motion.js's
 * registry (own) except the window's own box, whose placement waits on it otherwise; no loop: idle costs nothing.
 *   createLayoutMotion(nodes, { skipOwn? }) → { change(fn, sizing = true), hold(node), follow(node, x, y), layoutRect(node),
 *                                              release(node), holding, destroy() } */
import { motionPolicy, motionToken, own } from '../core/motion.js';

export function createLayoutMotion(nodes, { skipOwn = () => false } = {}) {
  const animations = new Map();
  let held = null;
  const timing = () => ({ duration: motionToken('structural'), easing: motionToken('out') });
  const live = () => motionPolicy() === 'full' && timing().duration > 0;
  const list = () => [...nodes()].filter((n) => n && n.getClientRects().length);
  const point = (n) => {
    const r = n.getBoundingClientRect(), p = n.parentElement.getBoundingClientRect();
    return { x: r.left - p.left + n.parentElement.scrollLeft, y: r.top - p.top + n.parentElement.scrollTop, w: r.width, h: r.height };
  };
  const stop = (n) => { for (const a of animations.get(n) || []) a.cancel(); animations.delete(n); };
  const animate = (n, frames) => {
    const a = n.animate(frames, timing());
    const bag = animations.get(n) || []; bag.push(a); animations.set(n, bag);
    if (!skipOwn(n)) own(n, a);
    a.finished.then(() => { const now = animations.get(n); if (!now) return;
      const i = now.indexOf(a); if (i >= 0) now.splice(i, 1); if (!now.length) animations.delete(n);
    }).catch(() => { /* cancelled: a newer change took the node */ });
  };
  /** change(fn, sizing) — the transaction: measure, fn(), measure, animate (sizes too unless sizing is false) */
  function change(fn, sizing = true) {
    const before = new Map(list().map((n) => [n, point(n)]));
    for (const n of animations.keys()) stop(n);
    fn();
    if (!live()) return;
    const after = new Map(list().map((n) => [n, point(n)]));
    if (sizing) for (const [n, r] of after) {
      const b = before.get(n); if (!b || n === (held && held.node)) continue;
      const from = {}, to = {};
      if (Math.abs(b.w - r.w) > 0.5) { from.width = b.w + 'px'; to.width = r.w + 'px'; }
      if (Math.abs(b.h - r.h) > 0.5) { from.height = b.h + 'px'; to.height = r.h + 'px'; }
      if (Object.keys(from).length) animate(n, [from, to]);
    }
    for (const [n] of after) {
      const b = before.get(n); if (!b || n === (held && held.node)) continue;
      const r = point(n), dx = b.x - r.x, dy = b.y - r.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) animate(n, [{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }]);
    }
  }
  return {
    change,
    /** hold(node) — the hand takes it: no change animates it, its place is the hand's */
    hold(node) { stop(node); held = { node, x: 0, y: 0 }; },
    /** follow(node, x, y) — the node's top-left SEEN at (x, y) */
    follow(node, x, y) {
      if (!held || held.node !== node) return;
      const r = node.getBoundingClientRect();
      held.x = x - (r.left - held.x); held.y = y - (r.top - held.y);
      node.style.translate = `${held.x}px ${held.y}px`;
    },
    /** layoutRect(node) — where it LAYS OUT, without the hand's or a travel's translate */
    layoutRect(node) {
      const r = node.getBoundingClientRect();
      let x = 0, y = 0;
      if (held && held.node === node) { x = held.x; y = held.y; }
      else if (animations.has(node)) { const t = getComputedStyle(node).translate.split(' '); x = parseFloat(t[0]) || 0; y = parseFloat(t[1]) || 0; }
      return { left: r.left - x, top: r.top - y, width: r.width, height: r.height };
    },
    /** release(node) — the hand lets go: it settles from where it is seen into its slot */
    release(node) {
      if (!held || held.node !== node) return;
      const from = `${held.x}px ${held.y}px`; held = null; node.style.removeProperty('translate');
      if (live()) animate(node, [{ translate: from }, { translate: '0px 0px' }]);
    },
    get holding() { return held ? held.node : null; },
    destroy() { if (held) held.node.style.removeProperty('translate'); held = null; for (const n of [...animations.keys()]) stop(n); },
  };
}
