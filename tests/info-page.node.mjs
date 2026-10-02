#!/usr/bin/env node
/* tests/info-page.node.mjs — info/page.js parsePage (a page's .md → blocks and labels) and info/seats.js (the chooser). */
import assert from 'node:assert/strict';
import { parsePage, anchorKind } from '../mir/info/page.js';
import { chooseSeat, scoreSeat, segCrossesSeg, clipLength } from '../mir/info/seats.js';
import { leader, comb } from '../mir/info/leader.js';

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };

ok('a label with a title, its body, and the prose around it', () => {
  const P = parsePage('# The trefoil\nA shape.\n\n> [!mir|nucleus] The nucleus\n> Period $p = 3$, at $c \\approx -0.1226 + 0.7449i$.\n\nMore prose.');
  assert.deepEqual(P.labels, [{ anchor: 'nucleus', kind: 'feature', line: 'auto', title: 'The nucleus', md: 'Period $p = 3$, at $c \\approx -0.1226 + 0.7449i$.' }]);
  assert.equal(P.blocks.length, 1);
  assert.equal(P.blocks[0].md, '# The trefoil\nA shape.\n\n\nMore prose.');
});
ok('a label without a title, the line word, the three anchor kinds', () => {
  const P = parsePage('> [!mir|@-0.20+0.42i flat]\n> A note.\n\n> [!mir|tip-1 diagonal] Tip\n> x\n\n> [!mir|ui:page-next] Turn\n> $\\to$\n\n> [!mir|a diagonal-first]\n> y\n\n> [!mir|b wide] Kept\n> z');
  assert.deepEqual(P.labels.map((l) => [l.anchor, l.kind, l.line, l.title, l.md]), [
    ['@-0.20+0.42i', 'place', 'flat-first', '', 'A note.'],
    ['tip-1', 'feature', 'diagonal-first', 'Tip', 'x'],
    ['ui:page-next', 'control', 'auto', 'Turn', '$\\to$'],
    ['a', 'feature', 'diagonal-first', '', 'y'],
    ['b', 'feature', 'auto', 'Kept', 'z'],                            // an unknown word is not a line, and is not lost into the anchor
  ]);
  assert.equal(P.blocks.length, 0);
  assert.equal(anchorKind('@51.48,-0.00'), 'place'); assert.equal(anchorKind('UI:knob'), 'control'); assert.equal(anchorKind('nucleus'), 'feature');
});
ok('other callouts are ordinary prose and stay in a block', () => {
  const md = '> [!note] Remember\n> this is prose\n\n> a plain quote';
  const P = parsePage(md);
  assert.equal(P.labels.length, 0); assert.deepEqual(P.blocks, [{ md }]);
});
ok('--- on its own line separates blocks; empty blocks vanish; a rule inside a fence does not', () => {
  const P = parsePage('One\n---\nTwo\n\n---\n\n---\nThree\n```\n---\n> [!mir|x] not a label\n```\n');
  assert.deepEqual(P.blocks.map((b) => b.md), ['One', 'Two', 'Three\n```\n---\n> [!mir|x] not a label\n```']);
  assert.equal(P.labels.length, 0);
});
ok('maths and markdown pass through untouched', () => {
  const md = '## Level sets\n$$r(\\theta) = R\\,\\bigl(1 + \\varepsilon\\cos 3\\theta\\bigr)$$\n\n*it turns* by $2\\pi/3$ — **three** times; [a link](https://example.org)';
  assert.equal(parsePage(md).blocks[0].md, md);
});
ok('CRLF, a BOM and front matter', () => {
  const P = parsePage('﻿---\r\ntags: [mir]\r\nshared: true\r\n---\r\n# Hi\r\n\r\n> [!mir|nucleus] N\r\n> body\r\n');
  assert.deepEqual(P.blocks, [{ md: '# Hi' }]);
  assert.deepEqual(P.labels.map((l) => [l.title, l.md]), [['N', 'body']]);
  assert.ok(!parsePage('a\r\nb').blocks[0].md.includes('\r'));
});
ok('a page that starts with a rule and prose is not mistaken for front matter', () => {
  assert.deepEqual(parsePage('---\nJust words here.\n---\nNext').blocks.map((b) => b.md), ['Just words here.', 'Next']);
});
ok('empty and odd input', () => {
  assert.deepEqual(parsePage(''), { blocks: [], labels: [] });
  assert.deepEqual(parsePage(null), { blocks: [], labels: [] });
});

/* ── the seat chooser ── */
ok('geometry: a crossing, a touch that is not one, the length inside a box', () => {
  assert.equal(segCrossesSeg({ x1: 0, y1: 0, x2: 10, y2: 10 }, { x1: 0, y1: 10, x2: 10, y2: 0 }), true);
  assert.equal(segCrossesSeg({ x1: 0, y1: 0, x2: 10, y2: 0 }, { x1: 10, y1: 0, x2: 20, y2: 5 }), false);
  assert.ok(Math.abs(clipLength({ x1: -5, y1: 5, x2: 15, y2: 5 }, { x: 0, y: 0, w: 10, h: 10 }) - 10) < 1e-9);
  assert.equal(clipLength({ x1: -5, y1: 20, x2: 15, y2: 20 }, { x: 0, y: 0, w: 10, h: 10 }), 0);
});
ok('the chooser keeps the natural seat when it is free, and leaves it when a comb is in the way', () => {
  const A = { x: 400, y: 300, r: 4 };
  const seat = (sx, sy, i) => { const L = { x: A.x + sx * 60, y: A.y + sy * 40 }, box = { x: sx > 0 ? L.x + 6 : L.x - 6 - 120, y: L.y - 20, w: 120, h: 40 };
    return { boxes: [box], segs: leader(A, L, { style: 'diagonal-first', under: 80, side: sx }).segs, natural: i === 0 }; };
  const cands = [seat(1, -1, 0), seat(1, 1, 1), seat(-1, -1, 2), seat(-1, 1, 3)];
  const bounds = { left: 0, top: 0, right: 1000, bottom: 800 };
  assert.equal(chooseSeat(cands, { boxes: [], segs: [] }, { bounds }), 0);
  /* another anchor's comb sits up and to the right: its spine and branches run through the natural seat */
  const B = { x: 440, y: 330, r: 4 }, c = comb(B, [{ x: 500, y: 250 }, { x: 500, y: 200 }], { under: [60, 60] });
  const obs = { boxes: [{ x: 506, y: 230, w: 100, h: 40 }, { x: 506, y: 180, w: 100, h: 40 }], segs: c.segs };
  const pick = chooseSeat(cands, obs, { bounds });
  assert.notEqual(pick, 0);
  assert.ok(scoreSeat(cands[pick], obs, { bounds }) < 1e5, 'the seat it picks crosses nothing');
});
ok('sticky: the seat it has is kept while it is out of trouble; in trouble the best seat is chosen again', () => {
  const a = { boxes: [{ x: 0, y: 0, w: 100, h: 40 }], segs: [], natural: true }, b = { boxes: [{ x: 200, y: 0, w: 100, h: 40 }], segs: [], natural: false, current: true };
  assert.equal(chooseSeat([a, b], { boxes: [], segs: [] }), 1);                                   // free: it stays
  assert.equal(chooseSeat([a, b], { boxes: [{ x: 296, y: 0, w: 4, h: 40 }], segs: [] }), 1);      // a corner in the way: it stays
  assert.equal(chooseSeat([a, b], { boxes: [{ x: 200, y: 0, w: 100, h: 40 }], segs: [] }), 0);    // covered: it moves to the free seat
  assert.equal(chooseSeat([a, b], { boxes: [], segs: [{ x1: 250, y1: -5, x2: 250, y2: 60 }] }), 0); // a line through it: it moves
});
ok('an anchor inside the subject: the line that crosses less of it wins', () => {
  const S = { x: 100, y: 100, w: 300, h: 100 }, A = { x: 250, y: 120, r: 4 };
  const side = { boxes: [{ x: 460, y: 60, w: 100, h: 30 }], segs: [{ x1: 250, y1: 120, x2: 450, y2: 80 }], natural: true };   // across 150 px of it
  const top = { boxes: [{ x: 280, y: 40, w: 100, h: 30 }], segs: [{ x1: 250, y1: 120, x2: 270, y2: 70 }], natural: false };  // out of the top in 20
  assert.equal(chooseSeat([side, top], { boxes: [], segs: [] }, { subject: S }), 1);
});

console.log(`ALL ${n} info page + seat checks passed`);
