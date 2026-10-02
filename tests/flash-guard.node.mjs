#!/usr/bin/env node
/* tests/flash-guard.node.mjs — shell/flash-guard.js (pure): a 10 Hz square wave is held to the safe rate and its route
 *   is named; a slow change passes untouched; the field judge trips on a strobe and lets go after a quiet second. */
import assert from 'node:assert/strict';
import { createFlashGuard, createFlashModel, areaEvent, WCAG, flashNoticeSeen, forgetFlashNotice, photosensitivityNotice } from '../mir/shell/flash-guard.js';

let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('ok   ' + name); };
const FPS = 60;
/** the most changes of direction (≥ delta) the output makes in any one second */
function worstSecond(times) { let worst = 0; for (let i = 0; i < times.length; i++) { let k = i; while (k < times.length && times[k] - times[i] < 1) k++; worst = Math.max(worst, k - i); } return worst; }
function reversals(series, d = 0.1) {
  const at = []; let anchor = series[0].v, dir = 0;
  for (const { t, v } of series) { const s = v - anchor, sg = Math.sign(s); if (Math.abs(s) >= d && sg !== dir) { at.push(t); dir = sg; anchor = v; } else if (sg && sg === dir) anchor = v; }
  return at;
}

await ok('a 10 Hz square wave is held to ≤ 3 flashes in every second, and the trip names the route and the rate', () => {
  const trips = [];
  const guard = createFlashGuard({ onTrip: (x) => trips.push(x) });
  const out = [], inp = [];
  for (let i = 0; i < FPS * 4; i++) {
    const t = i / FPS, v = Math.floor(t * 20) % 2;                          // 10 Hz: twenty changes a second
    inp.push({ t, v }); out.push({ t, v: guard(v, 'LFO SQUARE → exposure', t) });
  }
  const inWorst = worstSecond(reversals(inp)), outWorst = worstSecond(reversals(out));
  assert.ok(inWorst >= 19, 'the input really strobes: ' + inWorst);
  assert.ok(outWorst <= 2 * WCAG.maxHz, 'the output changes direction at most six times a second: ' + outWorst);
  assert.ok(outWorst >= 4, 'it is held to the rate, not frozen: ' + outWorst);
  assert.equal(trips.length, 1); assert.equal(trips[0].route, 'LFO SQUARE → exposure');
  assert.ok(Math.abs(trips[0].hz - 10) <= 0.6, 'the rate it tried: ' + trips[0].hz);
  assert.equal(guard.lastTrip.route, 'LFO SQUARE → exposure');
  assert.match(guard.describe(), /^LFO SQUARE → exposure · \d+\.\d Hz$/);
  assert.equal(guard.state('LFO SQUARE → exposure').held, true);
});
await ok('a slow change (a 0.5 Hz sine) passes untouched, every sample', () => {
  const guard = createFlashGuard();
  for (let i = 0; i < FPS * 6; i++) { const t = i / FPS, v = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * t); assert.equal(guard(v, 'slow', t), v); }
  assert.equal(guard.lastTrip, null);
});
await ok('two routes are judged apart: the quiet one is never held for the loud one', () => {
  const guard = createFlashGuard();
  for (let i = 0; i < FPS * 2; i++) { const t = i / FPS; guard(Math.floor(t * 20) % 2, 'loud', t); assert.equal(guard(t / 4, 'quiet', t), t / 4); }
  assert.equal(guard.lastTrip.route, 'loud');
});
await ok('a route range: a swing is a tenth of ITS range', () => {
  const guard = createFlashGuard({ ranges: { hue: [0, 360] } });
  for (let i = 0; i < FPS * 2; i++) { const t = i / FPS, v = (Math.floor(t * 20) % 2) * 20; assert.equal(guard(v, 'hue', t), v); }   // 20° swings: under 36°
});
await ok('released after a quiet second; disabled passes everything', () => {
  const rel = []; const guard = createFlashGuard({ onRelease: (x) => rel.push(x) });
  let t = 0; for (; t < 2; t += 1 / FPS) guard(Math.floor(t * 20) % 2, 'r', t);
  for (; t < 4; t += 1 / FPS) guard(0.5, 'r', t);
  assert.equal(rel.length, 1); assert.equal(guard.state('r').held, false);
  guard.enabled = false; for (let i = 0; i < 30; i++) assert.equal(guard(i % 2, 'r', 5 + i / FPS), i % 2);
});
await ok('the field judge (POLAR flash.js): a full-field strobe trips over three a second, and lets go after a quiet second', () => {
  const m = createFlashModel(), dark = new Uint8Array(64 * 64).fill(20), lit = new Uint8Array(64 * 64).fill(120);
  assert.equal(areaEvent(dark, lit), 1); assert.equal(areaEvent(lit, dark), -1); assert.equal(areaEvent(dark, dark), 0);
  let tripped = -1, released = -1;
  for (let i = 0; i < 120; i++) { const t = i / 30, f = t < 2 ? (i % 2 ? lit : dark) : dark; const w = m.take(t, f); if (w === 'trip' && tripped < 0) tripped = t; if (w === 'release') released = t; }
  assert.ok(tripped >= 0 && tripped < 0.5, 'trip at ' + tripped); assert.ok(released >= 2.9 && released < 3.2, 'release at ' + released);
});
await ok('the notice: seen is remembered per storage, a test driver is never trapped', async () => {
  const mem = new Map(), storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  assert.equal(flashNoticeSeen({ storage }), false);
  assert.equal(await photosensitivityNotice({ storage, driver: true }), true);
  mem.set('mir.flashNotice', '1'); assert.equal(flashNoticeSeen({ storage }), true);
  forgetFlashNotice({ storage }); assert.equal(flashNoticeSeen({ storage }), false);
});
console.log(`flash-guard: ${n} passed`);
