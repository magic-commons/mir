/* info-bodies.node.mjs — the force step (mir/info/bodies.js) on a fake clock.
 *   bodies come to rest EXACTLY on their resting places · two overlapping bodies separate · the rest pass leaves no
 *   overlap · the energy cut-off books nothing more · the 90-frame cap · a pointer parts them but a reach does not ·
 *   a held body does not yield · reduced motion jumps */
import assert from 'node:assert/strict';
import { createBody, step, atRest, snap, resolveRests, createRunner, PHYS } from '../mir/info/bodies.js';
import { createFrame } from '../mir/core/frame.js';

const results = [];
const check = (name, ok, detail = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const overlapping = (a, b, gap = 0) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + gap > 0 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + gap > 0;

/** a frame on a fake clock: rafs are collected and fired by hand, one per 16.7 ms */
function fakeFrame() {
  let q = [], t = 0, timers = [];
  const f = createFrame({ raf: (fn) => { q.push(fn); return q.length; }, caf: () => {}, setTimer: (fn) => { timers.push(fn); return timers.length; }, clearTimer: () => {}, now: () => t, floor: 0 });
  return { f, pump(n = 1) { let ran = 0; for (let i = 0; i < n; i++) { t += 1000 / 60; const r = q; q = []; if (!r.length) break; for (const fn of r) fn(t); ran++; } return ran; }, booked: () => q.length };
}

/* 1 · rest is exact */
{
  const bodies = [createBody({ id: 'a', x: 0, y: 0, w: 80, h: 30 }), createBody({ id: 'b', x: 400, y: 300, w: 120, h: 50 })];
  bodies[0].rx = 210; bodies[0].ry = -40; bodies[1].rx = 330; bodies[1].ry = 360;
  const F = fakeFrame(); let painted = 0, rested = 0;
  const run = createRunner({ frame: F.f, bodies: () => bodies, paint: () => painted++, onRest: () => rested++ });
  run.kick(); const frames = F.pump(400);
  const exact = bodies.every((b) => b.x === b.rx && b.y === b.ry && b.vx === 0 && b.vy === 0);
  check('rest: bodies land EXACTLY on their resting places', exact && rested === 1, `frames ${frames}, at ${bodies.map((b) => `${b.x},${b.y}`).join(' ')}`);
  check('rest: the run ends before the cap on its own energy cut-off', frames < PHYS.cap && frames > 10, `${frames} frames`);
  check('idle: once at rest nothing is booked', F.booked() === 0 && !run.running && F.f.state().pending === 0, JSON.stringify(F.f.state()));
  /* the feel: floaty — a soft overshoot, not a wobble (Josh, 10-01: "everything moving and floaty") */
  const b = createBody({ id: 'o', x: 0, y: 0, w: 10, h: 10 }); b.rx = 100;
  let peak = 0; for (let i = 0; i < 180; i++) { step([b], 1 / 60); peak = Math.max(peak, b.x); }
  check('feel: a 100 px move overshoots softly (5–13 %) and settles', peak > 105 && peak < 113 && Math.abs(b.x - 100) < 0.5, `peak ${peak.toFixed(2)}`);
  /* an offset rides on top of the rest: the body lands on rest + offset, and the rest itself is untouched */
  const o = createBody({ id: 'p', x: 0, y: 0, w: 10, h: 10 }); o.rx = 50; o.ox = 12; o.oy = -6;
  for (let i = 0; i < 240; i++) step([o], 1 / 60);
  check('offset: a body settles on rest + offset, and snap lands there', Math.abs(o.x - 62) < 0.5 && Math.abs(o.y + 6) < 0.5 && o.rx === 50 && (snap([o]), o.x === 62 && o.y === -6), `at ${o.x.toFixed(2)},${o.y.toFixed(2)}`);
}

/* 2 · two overlapping bodies separate */
{
  const a = createBody({ id: 'a', x: 100, y: 100, w: 100, h: 40 }), b = createBody({ id: 'b', x: 120, y: 110, w: 100, h: 40 });
  a.rx = 100; a.ry = 100; b.rx = 120; b.ry = 110;                    // both want the same place
  for (let i = 0; i < 40; i++) step([a, b], 1 / 60);
  check('neighbours: two bodies on one spot push apart while they fly', !overlapping(a, b), `a ${a.x.toFixed(1)},${a.y.toFixed(1)} b ${b.x.toFixed(1)},${b.y.toFixed(1)}`);
  /* the rest pass: rests that overlap are pushed apart, deterministically */
  const c = createBody({ id: 'c', x: 100, y: 100, w: 100, h: 40 }), d = createBody({ id: 'd', x: 110, y: 105, w: 100, h: 40 }), e = createBody({ id: 'e', x: 90, y: 112, w: 60, h: 40 });
  resolveRests([c, d, e], new Set(['c']));
  const R = (z) => ({ x: z.rx, y: z.ry, w: z.w, h: z.h });
  check('seat pass: no two rest boxes overlap, and a fixed one did not move', !overlapping(R(c), R(d)) && !overlapping(R(c), R(e)) && !overlapping(R(d), R(e)) && c.rx === 100 && c.ry === 100,
    [c, d, e].map((z) => `${z.id} ${z.rx.toFixed(1)},${z.ry.toFixed(1)}`).join(' '));
}

/* 3 · the cap: a body that will not settle is landed at the cap (300 frames) */
{
  const P = { ...PHYS, zeta: 0.0, k: 30 };                          // no damping: it would ring forever
  const bodies = [createBody({ id: 'r', x: 0, y: 0, w: 10, h: 10 })]; bodies[0].rx = 300;
  const F = fakeFrame();
  const run = createRunner({ frame: F.f, bodies: () => bodies, P });
  run.kick(); const frames = F.pump(1000);
  check('cap: an undamped body is stopped at the cap and landed on its rest', run.frames === PHYS.cap && bodies[0].x === 300 && F.booked() === 0, `frames ${run.frames} (pumped ${frames}), x ${bodies[0].x}`);
  /* a kick mid-run resets the cap */
  bodies[0].x = 0; bodies[0].rx = 300; run.kick(); F.pump(60); run.kick(); F.pump(1000);
  check('cap: a new disturbance restarts the count', run.frames === PHYS.cap && bodies[0].x === 300);
  /* alive: a layer that drifts keeps its frame; it lands the moment it stops being alive */
  let on = true; bodies[0].x = 0;
  const live = createRunner({ frame: F.f, bodies: () => bodies, P, alive: () => on });
  live.kick(); F.pump(PHYS.cap + 50);
  const still = live.running; on = false; F.pump(5);
  check('alive: the run does not land while alive, and lands when it is not', still && !live.running && bodies[0].x === 300 && F.booked() === 0);
}

/* 4 · the pointer: passing by parts them; reaching for one does not */
{
  const mk = () => { const b = createBody({ id: 'p', x: 200, y: 200, w: 100, h: 40 }); return b; };
  const side = mk(), reach = mk();
  const pass = { pointer: { x: 250, y: 260, vx: 600, vy: 0, heat: 1 } };          // moving sideways just below it
  const toward = { pointer: { x: 250, y: 260, vx: 0, vy: -600, heat: 1 } };       // moving straight at it
  for (let i = 0; i < 6; i++) { step([side], 1 / 60, pass); step([reach], 1 / 60, toward); }
  check('pointer: moving past a body parts it', side.y < 199, `y ${side.y.toFixed(2)}`);
  check('pointer: moving TOWARD a body does not push it (reaching is not fleeing)', Math.abs(reach.y - 200) < 1e-9 && Math.abs(reach.x - 200) < 1e-9, `at ${reach.x},${reach.y}`);
  const cold = mk(); for (let i = 0; i < 6; i++) step([cold], 1 / 60, { pointer: { x: 250, y: 260, vx: 600, vy: 0, heat: 0 } });
  check('pointer: a pointer that has stopped pushes nothing', cold.y === 200);
}

/* 5 · a held body does not yield; its neighbour takes the whole push */
{
  const h = createBody({ id: 'h', x: 100, y: 100, w: 100, h: 40 }), n = createBody({ id: 'n', x: 150, y: 100, w: 100, h: 40 });
  h.held = true;
  for (let i = 0; i < 30; i++) step([h, n], 1 / 60);
  check('held: the dragged body stays under the hand, the neighbour yields', h.x === 100 && h.y === 100 && Math.hypot(n.x - 150, n.y - 100) > 20, `n ${n.x.toFixed(1)},${n.y.toFixed(1)}`);
}

/* 6 · reduced motion: no flight */
{
  const bodies = [createBody({ id: 'm', x: 0, y: 0, w: 10, h: 10 })]; bodies[0].rx = 500; bodies[0].ry = 80;
  const F = fakeFrame(); let paints = 0;
  const run = createRunner({ frame: F.f, bodies: () => bodies, policy: () => 'reduced', paint: () => paints++ });
  run.kick(); const frames = F.pump(10);
  check('reduced motion: bodies jump to rest in one frame', frames === 1 && bodies[0].x === 500 && bodies[0].y === 80 && paints === 1 && !run.running, `frames ${frames}`);
}

/* 7 · walls */
{
  const b = createBody({ id: 'w', x: -80, y: 0, w: 50, h: 20 }); b.rx = -80;
  for (let i = 0; i < 120; i++) step([b], 1 / 60, { bounds: { left: 0, top: 0, right: 800, bottom: 600 } });
  check('walls: a body whose rest is off-screen is held softly inside', b.x > -40, `x ${b.x.toFixed(1)}`);
  snap([b]); check('snap: lands on rest', b.x === -80 && atRest([b]));
}

for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} body checks FAILED` : `ALL ${results.length} info body checks passed`);
process.exit(failed.length ? 1 : 0);
