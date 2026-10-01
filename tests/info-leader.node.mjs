/* info-leader.node.mjs — the line grammar (mir/info/leader.js) at many random positions.
 *   every segment is 0°, 45° or 90° · the path is connected · it starts on the anchor's edge · it ends at the label
 *   (or at the end of the underline) · both styles · the comb is a connected tree of legal segments */
import assert from 'node:assert/strict';
import { leader, comb, route, toPath, angleOf, STYLES } from '../mir/info/leader.js';

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const R = (a, b) => a + (b - a) * rnd();
const legal = (s) => { const a = angleOf(s); return [0, 45, 90, 135, 180].some((t) => Math.abs(a - t) < 1e-6); };
const len = (s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
let n = 0;

for (const style of STYLES) {
  for (let i = 0; i < 4000; i++) {
    const A = { x: R(-500, 500), y: R(-500, 500), r: rnd() < 0.2 ? 0 : R(1, 30) };
    const L = { x: A.x + R(-600, 600) * (rnd() < 0.05 ? 0 : 1), y: A.y + R(-600, 600) * (rnd() < 0.05 ? 0 : 1) };
    const under = rnd() < 0.5 ? 0 : R(1, 200);
    const l = leader(A, L, { style, under });
    const ctx = `${style} A=${JSON.stringify(A)} L=${JSON.stringify(L)} under=${under}`;
    for (const s of l.segs) { assert.ok(legal(s), `illegal angle ${angleOf(s)} — ${ctx}`); assert.ok(len(s) > 1e-9, `empty segment — ${ctx}`); }
    for (let k = 1; k < l.segs.length; k++) assert.ok(near(l.segs[k].x1, l.segs[k - 1].x2) && near(l.segs[k].y1, l.segs[k - 1].y2), `disconnected — ${ctx}`);
    assert.ok(l.segs.length <= 3, `more than three runs — ${ctx}`);
    const d = Math.hypot(L.x - A.x, L.y - A.y);
    if (d > A.r) assert.ok(near(Math.hypot(l.start.x - A.x, l.start.y - A.y), A.r, 1e-6), `does not start on the edge — ${ctx}`);
    const end = under > 0 ? { x: L.x + l.side * under, y: L.y } : L;
    if (l.segs.length) assert.ok(near(l.end.x, end.x, 1e-6) && near(l.end.y, end.y, 1e-6), `does not end at the label — ${ctx}`);
    /* the style: which run touches the thing */
    const bare = route(l.start, L, style);
    if (bare.length === 3) {
      const first = angleOf({ x1: bare[0].x, y1: bare[0].y, x2: bare[1].x, y2: bare[1].y });
      const diag = near(first, 45) || near(first, 135);
      assert.equal(diag, style === 'diagonal-first', `style ${style} starts with ${first}° — ${ctx}`);
    }
    n++;
  }
}

/* the side: a label left of its anchor has its line arrive from the right, and its underline runs left */
const left = leader({ x: 0, y: 0, r: 5 }, { x: -200, y: -60 }, { under: 80 });
assert.equal(left.side, -1); assert.ok(near(left.end.x, -280) && near(left.end.y, -60));
assert.equal(left.segs.length, 2, 'diagonal then one merged flat run');

/* the comb */
for (let i = 0; i < 3000; i++) {
  const A = { x: R(-300, 300), y: R(-300, 300), r: R(0, 20) };
  const k = 2 + Math.floor(rnd() * 3), Ls = [];
  for (let j = 0; j < k; j++) Ls.push({ x: A.x + R(-400, 400), y: A.y + R(-400, 400) });
  const under = Ls.map(() => (rnd() < 0.5 ? 0 : R(10, 120)));
  const c = comb(A, Ls, { under });
  const ctx = `comb A=${JSON.stringify(A)} Ls=${JSON.stringify(Ls)}`;
  for (const s of c.segs) { assert.ok(legal(s), `illegal comb angle ${angleOf(s)} — ${ctx}`); assert.ok(len(s) > 1e-9, `empty — ${ctx}`); }
  /* the first segment is the shared 45° run, from the edge */
  assert.ok(near(angleOf(c.segs[0]), 45) || near(angleOf(c.segs[0]), 135), `the comb does not open with a 45° run — ${ctx}`);
  assert.ok(near(Math.hypot(c.start.x - A.x, c.start.y - A.y), A.r, 1e-6), `comb not on the edge — ${ctx}`);
  /* connected: every segment touches a point already reached, starting from the start */
  const reached = [c.start], onSeg = (p, s) => {
    const cross = (s.x2 - s.x1) * (p.y - s.y1) - (s.y2 - s.y1) * (p.x - s.x1);
    const dot = (p.x - s.x1) * (s.x2 - s.x1) + (p.y - s.y1) * (s.y2 - s.y1);
    return Math.abs(cross) < 1e-6 * (1 + len(s)) && dot >= -1e-6 && dot <= len(s) ** 2 + 1e-6;
  };
  const left2 = [...c.segs]; let grew = true;
  while (left2.length && grew) {
    grew = false;
    for (let j = left2.length - 1; j >= 0; j--) {
      const s = left2[j], a = { x: s.x1, y: s.y1 };
      if (reached.some((p) => near(p.x, a.x, 1e-6) && near(p.y, a.y, 1e-6)) || c.segs.filter((t) => !left2.includes(t)).some((t) => onSeg(a, t))) {
        reached.push(a, { x: s.x2, y: s.y2 }); left2.splice(j, 1); grew = true;
      }
    }
  }
  assert.equal(left2.length, 0, `comb is not connected — ${ctx}`);
  /* every label is reached */
  for (const L of Ls) assert.ok(c.segs.some((s) => onSeg(L, s)), `a label is not on the comb — ${ctx}`);
  n++;
}

/* the path string */
const p = toPath(leader({ x: 0, y: 0 }, { x: 100, y: -40 }).segs);
assert.equal(p, 'M0 0L40 -40L100 -40');
assert.equal(toPath(leader({ x: 0, y: 0 }, { x: 100, y: -40 }, { style: 'flat-first' }).segs), 'M0 0L60 0L100 -40');
assert.equal(toPath(leader({ x: 0, y: 0 }, { x: 30, y: -100 }).segs), 'M0 0L30 -30L30 -100', 'more above than beside: 45° then vertical');

console.log(`ALL info leader checks passed — ${n} random lines and combs, every segment 0°, 45° or 90°, connected, on the edge`);
