/* ink.node.mjs — core/ink.js without a browser: the arithmetic of the ground, the bias and its hysteresis, and the cell walk
 * over a fake page (plain objects through the walk's io), with a fake `sample`.
 * Standalone: node tests/ink.node.mjs */
import assert from 'node:assert/strict';
import { INK, parseFill, over, paintOf, summedArea, meanUnder, groundOf, decide, walkCells } from '../mir/core/ink.js';

const results = [];
const law = (name, fn) => { try { fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name} — ${e.message}`); } };

law('the arithmetic: a fill parses to luma and alpha; one layer over another; a gradient is the mean of its stops', () => {
  assert.deepEqual(parseFill('255, 255, 255'), { l: 1, a: 1 });
  assert.deepEqual(parseFill('0 0 0 / 0.5'), { l: 0, a: 0.5 });
  const o = over({ l: 1, a: 0.5 }, { l: 0, a: 1 }); assert.equal(o.a, 1); assert.equal(o.l, 0.5);
  assert.equal(paintOf({ backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none' }), null);
  const g = paintOf({ backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'linear-gradient(rgb(255, 255, 255), rgb(0, 0, 0))' });
  assert.ok(Math.abs(g.l - 0.5) < 1e-9 && g.a === 1);
  assert.equal(paintOf({ backgroundColor: 'rgb(9, 9, 9)', backgroundImage: 'url(x.png)' }).l, 9 / 255);
});

/* a fake sample: the left half black, the right half white, 64 × 36, covering a 1280 × 720 screen */
const W = INK.GW, H = INK.GH, luma = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) luma[y * W + x] = x < W / 2 ? 0 : 1;
const sample = () => ({ luma, w: W, h: H });
const area = { left: 0, top: 0, width: 1280, height: 720 };
const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

law('the ground: the mean of the sample under a box (summed-area), then every fill above it, outermost first', () => {
  const s = sample(), sat = summedArea(s.luma, s.w, s.h);
  assert.equal(meanUnder(sat, W, H, box(100, 100, 200, 40), area), 0);
  assert.equal(meanUnder(sat, W, H, box(900, 100, 200, 40), area), 1);
  assert.equal(meanUnder(sat, W, H, box(600, 100, 80, 40), area), 0.5);           // astride the edge
  assert.equal(meanUnder(sat, W, H, box(100, 100, 200, 40), { width: 0 }), null);   // no sample: no answer
  /* a pale .86 card over the black half is a LIGHT ground */
  assert.ok(groundOf(0, [{ l: 0.93, a: 0.86 }]) > INK.TO_BLACK);
  assert.equal(groundOf(1, []), 1);
});

law('the bias and the hysteresis: the nearer pole first; a flip needs the far threshold, seen twice running', () => {
  const c = { ink: null, pending: null };
  assert.equal(decide(c, 0.52), true); assert.equal(c.ink, 'k');                   // first look: the nearer pole
  assert.equal(decide(c, 0.47), false); assert.equal(c.ink, 'k');                  // inside the band: it keeps what it had
  assert.equal(decide(c, 0.2), false); assert.equal(c.ink, 'k'); assert.equal(c.pending, 'w');   // seen once
  assert.equal(decide(c, 0.6), false); assert.equal(c.pending, null);              // the picture went back: nothing pending
  assert.equal(decide(c, 0.2), false); assert.equal(decide(c, 0.2), true); assert.equal(c.ink, 'w');   // seen twice: flips
  assert.equal(decide(c, 0.5), false); assert.equal(c.ink, 'w');
});

/* a fake page: a 1280 × 720 body holding a rack column (a clear strip), a pale card in it with a label, a label straight
   on the glass over each half, a hidden window, an off-screen chip, a skipped node and a stage that holds the picture */
const N = (name, r, o = {}) => ({ name, r: box(...r), kids: o.kids || [], st: { display: 'block', visibility: 'visible', backgroundColor: o.bg || 'rgba(0, 0, 0, 0)', backgroundImage: 'none', ...(o.st || {}) },
  before: o.before || null, text: o.text || '', own: !!o.own, skip: !!o.skip, stage: !!o.stage, holds: !!o.holds });
const labelDark = N('label-dark', [40, 40, 120, 20], { text: 'BLUR' });
const labelLight = N('label-light', [1000, 40, 120, 20], { text: 'VEIL' });
const cardLabel = N('card-label', [60, 210, 100, 20], { text: 'HUE' });
const card = N('card', [40, 200, 240, 60], { bg: 'rgba(237, 237, 237, 0.86)', kids: [cardLabel] });
const strip = N('strip', [20, 180, 280, 300], { kids: [card] });
const hidden = N('hidden', [40, 400, 100, 20], { text: 'X', st: { display: 'none' } });
const off = N('off', [-400, 40, 100, 20], { text: 'OFF' });
const skipped = N('skipped', [40, 600, 100, 20], { text: 'TOAST', skip: true });
const chip = N('chip', [500, 600, 40, 40], { text: '×', before: { content: '""', display: 'block', visibility: 'visible', width: '40px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.9)', backgroundImage: 'none' } });
const stage = N('stage', [0, 0, 1280, 720], { stage: true, skip: true });
const shell = N('shell', [0, 0, 1280, 720], { bg: 'rgb(0, 0, 0)', holds: true, own: false, kids: [stage, labelDark, labelLight, strip, hidden, off, skipped, chip] });
const body = N('body', [0, 0, 1280, 720], { kids: [shell] });
const all = (n) => n.kids.flatMap((k) => [k, ...all(k)]);
const io = {
  kids: (n) => n.kids, rect: (n) => n.r, style: (n, pseudo) => (pseudo ? n.before || { content: 'none' } : n.st), skip: (n) => n.skip,
  isSvg: () => false, field: () => false, text: (n) => !!n.text || n.kids.some((k) => io.text(k)), ownText: (n) => n.own, glyph: () => false, all, holdsStage: (n) => n.holds,
};

law('the walk: small things are cells; a strip holding a face walks into it; hidden, off-screen and skipped things are not; a fill under the picture is ignored', () => {
  const cells = walkCells(body, io, { vw: 1280, vh: 720 });
  const names = cells.map((c) => c.el.name).sort();
  assert.deepEqual(names, ['card', 'chip', 'label-dark', 'label-light']);
  const byName = Object.fromEntries(cells.map((c) => [c.el.name, c]));
  assert.equal(byName['label-dark'].stack.length, 0, 'the black shell holds the picture: its fill lies under it');
  assert.equal(byName.card.stack.length, 1, 'a small card with no face inside is ONE cell, and it carries its own fill');
  assert.equal(byName.chip.stack.length, 1, 'a ::before face of 12 px or more is the chip\'s own fill');
  /* and the verdict with the fake sample: white over black, black over white, black on the pale card over black */
  const s = sample(), sat = summedArea(s.luma, s.w, s.h), ink = {};
  for (const c of cells) { decide(c, groundOf(meanUnder(sat, W, H, c.el.r, area), c.stack)); ink[c.el.name] = c.ink; }
  assert.deepEqual(ink, { 'label-dark': 'w', 'label-light': 'k', card: 'k', chip: 'k' });
  /* a re-walk keeps what a cell had (its ink and its pending flip), so the hysteresis survives a rebuild */
  const keep = new Map(cells.map((c) => [c.el, c])); byName['label-dark'].pending = 'k';
  const again = walkCells(body, io, { vw: 1280, vh: 720, keep });
  const d = again.find((c) => c.el.name === 'label-dark'); assert.equal(d.ink, 'w'); assert.equal(d.pending, 'k');
});

for (const r of results) console.log(r);
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `${failed} of ${results.length} MIR ink laws FAILED` : `ALL ${results.length} MIR ink laws passed`);
process.exit(failed ? 1 : 0);
