/* info/bodies.js — FORCE: every label and block of INFORMATIONAL is a small body with a resting place.
 *
 * THE LAW IT KEEPS: THINGS MOVE ONLY WHILE THEY HAVE SOMEWHERE TO GO, AND AT REST THEY SIT EXACTLY WHERE THEY
 * BELONG.  Each step pulls a body to its rest on a spring, pushes near or overlapping neighbours apart, parts them
 * from a moving pointer (fading with distance and with time since it moved), and keeps them inside soft walls.
 * The runner books the one frame (core/frame.js) only while something is still moving, and never for more than
 * CAP frames after the last disturbance; when it stops, every body is snapped onto its rest — so the rest state is
 * exact and testable, and idle is zero work.  Under reduced motion there is no flight: bodies jump to rest.
 * (Draft 2 §A: the seats are chosen elsewhere; force only MOVES the bodies, which is what makes it feel alive.)
 *
 * The feel, settled by eye on gallery/info.html (units px and seconds, a body has mass 1):
 *   spring k 170 s⁻², ζ 0.72  → ω 13 rad/s, ~4 % overshoot, settled in ~0.45 s       (labels)
 *   blocks k 95 s⁻², ζ 0.8    → a heavier, calmer glide for a seat change
 *   neighbours: gap 18 px, push 520 s⁻² per px of overlap, along the shallower axis
 *   pointer: reach 120 px, push 4400 px/s² at contact fading as (1 − d/reach)², and with time since the last move
 *            (τ 180 ms) — a still pointer pushes nothing, so labels come home under it
 *   reaching is not fleeing: the push is scaled by how SIDEWAYS the pointer moves past a body; heading straight at
 *            it (or sitting on it) pushes nothing
 *   walls: 10 px inside the bounds, 900 s⁻² per px
 *   rest: every |v| < 6 px/s and every |x − rest| < 0.4 px; a hard cap of 90 frames per disturbance
 *
 *   createBody({ id, x, y, w, h, k?, zeta? })      → a body (x, y = its box's top-left; rx, ry = its rest)
 *   step(bodies, dt, env, P)                       → { maxV, maxD } after one step (substepped)
 *   atRest(bodies, P), snap(bodies)                — the cut-off and the landing
 *   resolveRests(bodies, fixed, P)                 — rests pushed apart so no two rest boxes overlap (the seat pass)
 *   createRunner({ frame, bodies, env, paint, policy, P }) → { kick(), stop(), running, frames }
 */

export const PHYS = Object.freeze({
  k: 170, zeta: 0.72, gap: 18, push: 520, reach: 120, pointer: 4400, tau: 0.18,
  wall: 900, margin: 10, vEps: 6, dEps: 0.4, cap: 90, maxDt: 1 / 30, sub: 1 / 120,
});

/** createBody({ id, x, y, w, h, k, zeta }) — at rest where it starts */
export function createBody(o) {
  return { id: o.id, x: o.x, y: o.y, w: o.w || 0, h: o.h || 0, rx: o.rx ?? o.x, ry: o.ry ?? o.y,
    vx: 0, vy: 0, k: o.k, zeta: o.zeta, held: false, solid: o.solid !== false, reach: o.reach !== false, lift: 0 };
}

/** the overlap of two boxes grown by `gap`, or null */
function overlap(a, ax, ay, b, bx, by, gap) {
  const ox = Math.min(ax + a.w, bx + b.w) - Math.max(ax, bx) + gap;
  const oy = Math.min(ay + a.h, by + b.h) - Math.max(ay, by) + gap;
  return ox > 0 && oy > 0 ? { ox, oy } : null;
}
/** the distance from a point to a box (0 inside) and the push direction (from the point to the box's centre) */
function away(px, py, b) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const qx = Math.max(b.x, Math.min(px, b.x + b.w)), qy = Math.max(b.y, Math.min(py, b.y + b.h));
  const d = Math.hypot(px - qx, py - qy), l = Math.hypot(cx - px, cy - py) || 1;
  return { d, ux: (cx - px) / l, uy: (cy - py) / l };
}

/** one integration step of length h (semi-implicit Euler) */
function sub(bodies, h, env, P) {
  const n = bodies.length, ax = new Float64Array(n), ay = new Float64Array(n);
  const pt = env && env.pointer, bounds = env && env.bounds;
  for (let i = 0; i < n; i++) {
    const b = bodies[i]; if (b.held) continue;
    const k = b.k ?? P.k, c = 2 * (b.zeta ?? P.zeta) * Math.sqrt(k);
    ax[i] += k * (b.rx - b.x) - c * b.vx;
    ay[i] += k * (b.ry - b.y) - c * b.vy;
    /* the pointer parts them like water: strength fades with distance and with time since it moved; heading
       straight at a body (reaching) or sitting on it pushes nothing */
    if (pt && pt.heat > 0.01) {
      const a = away(pt.x, pt.y, b);
      if (a.d > 0 && a.d < P.reach) {
        const sp = Math.hypot(pt.vx || 0, pt.vy || 0);
        const toward = sp > 1 ? Math.max(0, ((pt.vx * a.ux) + (pt.vy * a.uy)) / sp) : 1;
        const s = P.pointer * pt.heat * (1 - a.d / P.reach) ** 2 * (b.reach ? 1 - toward : 1);
        ax[i] += a.ux * s; ay[i] += a.uy * s;
      }
    }
    if (bounds) {                                                    // soft walls
      const m = P.margin;
      const l = bounds.left + m - b.x, r = b.x + b.w - (bounds.right - m), t = bounds.top + m - b.y, btm = b.y + b.h - (bounds.bottom - m);
      if (l > 0) ax[i] += P.wall * l; else if (r > 0) ax[i] -= P.wall * r;
      if (t > 0) ay[i] += P.wall * t; else if (btm > 0) ay[i] -= P.wall * btm;
    }
    if (b.lift) ay[i] += b.lift;                                     // a caller's own nudge (a block crossing the subject)
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {     // neighbours: a short-range push apart
    const a = bodies[i], b = bodies[j]; if (!a.solid || !b.solid) continue;
    const o = overlap(a, a.x, a.y, b, b.x, b.y, P.gap); if (!o) continue;
    const horizontal = o.ox < o.oy;
    const dir = horizontal ? Math.sign((b.x + b.w / 2) - (a.x + a.w / 2)) || 1 : Math.sign((b.y + b.h / 2) - (a.y + a.h / 2)) || 1;
    const f = P.push * (horizontal ? o.ox : o.oy);
    const wa = a.held ? 0 : b.held ? 2 : 1, wb = 2 - wa;            // a held body does not yield: its neighbour takes all
    if (horizontal) { ax[i] -= dir * f * wa; ax[j] += dir * f * wb; } else { ay[i] -= dir * f * wa; ay[j] += dir * f * wb; }
  }
  for (let i = 0; i < n; i++) {
    const b = bodies[i]; if (b.held) { b.vx = b.vy = 0; continue; }
    b.vx += ax[i] * h; b.vy += ay[i] * h;
    b.x += b.vx * h; b.y += b.vy * h;
  }
}

/** step(bodies, dt, env, P) — advance by dt seconds (clamped, substepped).  env: { pointer: { x, y, vx, vy, heat },
 *  bounds: { left, top, right, bottom } }.  → { maxV, maxD } */
export function step(bodies, dt, env = {}, P = PHYS) {
  const t = Math.min(Math.max(dt, 0), P.maxDt), n = Math.max(1, Math.ceil(t / P.sub - 1e-9));
  for (let i = 0; i < n; i++) sub(bodies, t / n, env, P);
  return measure(bodies);
}
function measure(bodies) {
  let maxV = 0, maxD = 0;
  for (const b of bodies) { if (b.held) continue; maxV = Math.max(maxV, Math.hypot(b.vx, b.vy)); maxD = Math.max(maxD, Math.hypot(b.x - b.rx, b.y - b.ry)); }
  return { maxV, maxD };
}
/** atRest(bodies, P) — nothing moving and everything home */
export function atRest(bodies, P = PHYS) { const m = measure(bodies); return m.maxV < P.vEps && m.maxD < P.dEps; }
/** snap(bodies) — land every free body exactly on its rest */
export function snap(bodies) { for (const b of bodies) { if (b.held) continue; b.x = b.rx; b.y = b.ry; b.vx = 0; b.vy = 0; } }

/** resolveRests(bodies, fixed, P) — push rest boxes apart until none overlap (bodies in `fixed` and held bodies do
 *  not move; the others yield).  Deterministic; a few passes are plenty for a screenful of labels. */
export function resolveRests(bodies, fixed = new Set(), P = PHYS, passes = 12) {
  for (let it = 0; it < passes; it++) {
    let moved = false;
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j]; if (!a.solid || !b.solid) continue;
      const o = overlap(a, a.rx, a.ry, b, b.rx, b.ry, P.gap); if (!o) continue;
      const fa = fixed.has(a.id) || a.held, fb = fixed.has(b.id) || b.held; if (fa && fb) continue;
      const wa = fa ? 0 : fb ? 1 : 0.5, wb = 1 - wa;
      if (o.ox < o.oy) { const d = Math.sign((b.rx + b.w / 2) - (a.rx + a.w / 2)) || 1; a.rx -= d * o.ox * wa; b.rx += d * o.ox * wb; }
      else { const d = Math.sign((b.ry + b.h / 2) - (a.ry + a.h / 2)) || 1; a.ry -= d * o.oy * wa; b.ry += d * o.oy * wb; }
      moved = true;
    }
    if (!moved) break;
  }
}

/** createRunner({ frame, bodies, env, paint, policy, P, onRest }) — steps on the one frame only while it must.
 *  kick() is a disturbance: it (re)starts the run and resets the 90-frame cap. */
export function createRunner({ frame, bodies, env = () => ({}), paint = () => {}, policy = () => 'full', P = PHYS, onRest = () => {}, key = 'info:bodies' }) {
  let running = false, frames = 0, last = 0, stopped = false;
  const land = () => { running = false; snap(bodies()); paint(); onRest(); };
  function tick(now) {
    if (!running || stopped) return;
    const list = bodies();
    if (policy() !== 'full') { land(); return; }                    // reduced / off: no flight, they jump to rest
    const dt = last ? (now - last) / 1000 : 1 / 60; last = now;
    step(list, dt, env(), P); frames++;
    if (atRest(list, P) || frames >= P.cap) { land(); return; }
    paint();
    frame.coalesce(key, tick);                                       // queued during the batch: the next frame
  }
  return {
    kick() {
      if (stopped) return;
      frames = 0;
      if (!running) { running = true; last = 0; frame.coalesce(key, tick); }
    },
    stop() { running = false; frame.cancel(key); },
    destroy() { stopped = true; running = false; frame.cancel(key); },
    get running() { return running; },
    get frames() { return frames; },
  };
}
