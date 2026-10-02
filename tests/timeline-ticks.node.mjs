/* timeline-ticks.node.mjs — BASINS tools/test-timeline-ticks.mjs, ported (2026-10-02): the tick law unchanged; the shortcut
 * table is now the key table's rows, carried in docs/TIMELINE.md. */
// THE BEAT TICKS law as a pure function (alpha ramp, height step, subdivision threshold, device-
// pixel rounding) plus the shortcut sheet staying in step with docs/TIMELINE-SHORTCUTS.md.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tickLaw, ticks } from '../mir/timeline/view.js';
import { renderShortcutsMarkdown, timelineActions } from '../mir/timeline/shortcuts.js';
import { normalize } from '../mir/shell/keys.js';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const PXS = [8, 10, 12, 16, 20, 24, 40];
for (const px of PXS) {
  const law = tickLaw(px, 1);
  const wantAlpha = .16 * clamp((px - 4) / 8, .5, 1);
  assert.ok(law.beatAlpha > 0, `beat ticks never hide at px=${px}`);
  assert.ok(Math.abs(law.beatAlpha - wantAlpha) < 1e-9, `alpha ramp at px=${px}: ${law.beatAlpha}`);
  assert.equal(law.beatHeight, px < 12 ? 3 : 4, `height steps at px=${px}`);
  assert.equal(law.subdivisions, px >= 20, `subdivision threshold at px=${px}`);
  assert.equal(law.subAlpha, law.subdivisions ? law.beatAlpha : 0, `sub alpha mirrors the ramp at px=${px}`);
}
assert.ok(Math.abs(tickLaw(12, 1).beatAlpha - .16) < 1e-9, 'full alpha (base .16) at 12px');
assert.ok(Math.abs(tickLaw(8, 1).beatAlpha - .08) < 1e-9, 'half alpha (.08) at 8px');
assert.equal(tickLaw(19.9, 1).subdivisions, false, 'subdivisions still hidden just under 20px');
assert.equal(tickLaw(20, 1).subdivisions, true, 'subdivisions visible from 20px (was 24px)');

// Device-pixel rounding: continuous zoom (fractional px, any dpr) never lands a tick between pixels.
for (const [px, dpr] of [[13.37, 1], [13.37, 2], [19.6, 3], [27.1, 1.5], [8, 1], [40, 2]]) {
  const pattern = ticks([1, 2, 3], px, dpr);
  const xs = [...pattern.matchAll(/([\d.]+)px,var\(--tl-beat-tick\)/g)].map((m) => Number(m[1]));
  assert.equal(xs.length, 3, `three beat stops in the gradient at px=${px} dpr=${dpr}`);
  for (const x of xs) {
    const scaled = x * dpr;
    assert.ok(Math.abs(scaled - Math.round(scaled)) < 1e-9, `tick at ${x}px lands on a device pixel (px=${px} dpr=${dpr})`);
  }
}
assert.equal(ticks([], 20, 1), 'linear-gradient(transparent,transparent)', 'no stops paints an inert gradient');
console.log('Timeline tick law: alpha ramp, height step, subdivision threshold and device-pixel rounding pass.');

// THE SHEET AND THE DOC FROM ONE TABLE: docs/TIMELINE.md carries renderShortcutsMarkdown(timelineActions()) between its
// two SHORTCUTS markers (BASINS kept docs/TIMELINE-SHORTCUTS.md in step the same way).
const expected = renderShortcutsMarkdown(timelineActions(() => null));
const doc = await readFile(new URL('../docs/TIMELINE.md', import.meta.url), 'utf8');
const m = /<!-- SHORTCUTS -->\n([\s\S]*?)<!-- \/SHORTCUTS -->/.exec(doc);
assert.ok(m, 'docs/TIMELINE.md has its SHORTCUTS markers');
assert.equal(m[1], expected, 'docs/TIMELINE.md must carry renderShortcutsMarkdown(timelineActions()) exactly');
// every row is a key the key table accepts (a declared key that is not a key throws there: docs/KEYS.md)
for (const a of timelineActions(() => null)) for (const k of a.keys) assert.ok(normalize(k), `${a.id}: ${k} parses`);
assert.equal(new Set(timelineActions(() => null).map((a) => a.id)).size, timelineActions(() => null).length, 'ids are unique');
console.log('Timeline shortcuts: the key rows parse, and docs/TIMELINE.md carries the table made from them.');
