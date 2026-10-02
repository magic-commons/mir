#!/usr/bin/env node
/* tests/app.node.mjs — the easy start (1.5.0-alpha.5), headless: makeParam() makes a number a control, a modulation
 * target and a saved value (value() is the base while a route drives it, never the modulated reading); targets added
 * after the install are routable, and removing one removes its routes; route() makes a first route in one call, and a
 * route onto a target not added yet waits, dormant; FOLDERS' first seat keeps clear of the racks and the bar;
 * greet's first part stops at the first `---`; describe() reads rack.windows() and the clock. */
import assert from 'node:assert/strict';
import { installModulation } from '../mir/modulation/bind.js';
import { makeParam } from '../mir/app.js';
import { freeSeat } from '../mir/folders/folders.js';
import { firstPart } from '../mir/info/page.js';
import { describeText, createDescribe } from '../mir/core/describe.js';

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };
/* a widget as makeParam and the seam use one: root, set, and a recorded onInput (a hand) */
const fake = (o) => { const w = { o, v: o.value, root: { dataset: {}, classList: { toggle() {}, remove() {} } }, set(v) { w.v = v; } }; return w; };
const t0 = 1000;
const run = (mod, from, secs) => { for (let i = 1; i <= secs * 10; i++) mod.host.clock.advanceTo(from + i * 0.1); return from + secs; };

const mod = installModulation({ mount: null, params: [] });
const S = { size: 0.6, spread: 0.25 };
const size = makeParam({ state: S, key: 'size', label: 'SIZE', min: 0.1, max: 1, mod, make: fake });

ok('makeParam: a kit control (the widget made with the label, range and value), a target, a hook for pages', () => {
  assert.equal(size.id, 'app.size'); assert.equal(size.widget.o.label, 'SIZE'); assert.equal(size.widget.o.value, 0.6);
  assert.equal(size.root.dataset.param, 'app.size'); assert.equal(size.root.dataset.info, 'size');
  assert.ok(mod.params().some((p) => p.id === 'app.size'));
  size.widget.o.onInput(0.7); assert.equal(S.size, 0.7, 'an unrouted hand writes the number');
  assert.equal(size.value(), 0.7);
});
ok('map sets the widget: wrap → wrap, log → log, integer → a whole-number readout', () => {
  const T = { h: 10, f: 100, c: 3 };
  assert.equal(makeParam({ state: T, key: 'h', min: 0, max: 360, map: 'wrap', make: fake }).widget.o.wrap, true);
  assert.equal(makeParam({ state: T, key: 'f', min: 20, max: 2000, map: 'log', make: fake }).widget.o.log, true);
  assert.equal(makeParam({ state: T, key: 'c', min: 3, max: 24, map: 'integer', make: fake }).widget.o.fmt(6.6), '7');
});
let at = t0;
ok('route(kind, id, depth): one call routes an LFO; value() stays the base while get() swings', () => {
  const r = mod.route('lfo', 'app.size', 0.35);
  assert.ok(r && r.route && r.macro && r.source && typeof r.remove === 'function');
  assert.equal(r.source.kind, 'lfo');
  mod.play(true); at = run(mod, at, 2);
  const seen = new Set(); for (let i = 0; i < 10; i++) { at = run(mod, at, 0.1); seen.add(S.size.toFixed(4)); }
  assert.ok(seen.size >= 5, 'the number moves: ' + seen.size);
  assert.ok(mod.isModulated('app.size'));
  assert.equal(size.value(), 0.7, 'the saved value is the base');
  assert.notEqual(S.size, 0.7);
  size.widget.o.onInput(0.5);                                        // a hand on a routed control moves the base (the hand law)
  assert.equal(mod.baseOf('app.size'), 0.5); assert.equal(size.value(), 0.5);
  size.set(0.4); assert.equal(size.value(), 0.4, 'set() is a hand: the base');
  r.remove(); mod.host.clock.applyAll(true);
  assert.equal(mod.isModulated('app.size'), false); assert.equal(S.size, 0.4, 'the route let go: the number is back on its base');
});
ok('a target added after the install is routable; a route made before it waits, dormant, and wakes when it is added', () => {
  const r = mod.route('lfo', 'app.spread', 0.5);
  assert.equal(r.route.dormant, true, 'no target yet: dormant');
  const spread = makeParam({ state: S, key: 'spread', min: 0, max: 1, mod, make: fake });        // the lazy window is built
  assert.equal(r.route.dormant, false);
  at = run(mod, at, 1);
  assert.ok(mod.isModulated('app.spread'));
  assert.equal(spread.value(), 0.25, 'the base, not the reading');
  spread.remove();
  assert.equal(mod.params().some((p) => p.id === 'app.spread'), false, 'removed: no longer a target');
  assert.equal(mod.M.routeList().filter((x) => x.targetId === 'app.spread').length, 0, 'and its routes went with it');
  assert.equal(S.spread, 0.25, 'left on its base');
});
ok('route() takes a source id or a source object too; a negative depth swings down', () => {
  const src = mod.M.sourceList().find((s) => s.kind === 'lfo');
  const a = mod.route(src.id, 'app.size', -0.2), b = mod.route(src, 'app.size', 0.2);
  assert.ok(a && b); assert.equal(a.route.min, 0.2); assert.equal(a.route.max, 0);
  a.remove(); b.remove();
});
mod.dispose();

ok('freeSeat: centred between the racks, under the menubar, shortened to end above the bar', () => {
  const vw = 1280, vh = 800;
  const right = { left: 932, top: 0, right: 1280, bottom: 137 }, left = { left: 0, top: 0, right: 348, bottom: 200 }, bar = { left: 320, top: 694, right: 960, bottom: 740 };
  const s = freeSeat({ vw, vh, w: 380, h: 680, clear: [right, left, bar] });
  assert.ok(s.x >= 348 + 16 && s.x + 380 <= 932 - 16, JSON.stringify(s));
  assert.equal(s.y, 72); assert.ok(s.h && s.y + s.h <= 694 - 16, 'ends above the bar');
  const none = freeSeat({ vw, vh, w: 380, h: 400, clear: [] });
  assert.deepEqual(none, { x: 450, y: 72 }, 'no rack, no bar: the centre of the stage');
  const tight = freeSeat({ vw: 900, vh, w: 380, h: 400, clear: [{ left: 0, top: 0, right: 372, bottom: 100 }, { left: 528, top: 0, right: 900, bottom: 100 }] });
  assert.ok(tight.x >= 16 && tight.x + 380 <= 884, 'no room between the racks: on the stage still');
});
ok('firstPart: the page up to its first ---, past front matter and fenced code', () => {
  assert.equal(firstPart('# A\nwords\n\n---\n\n## B'), '# A\nwords\n');
  assert.equal(firstPart('---\ntitle: x\n---\n# A\n---\nB'), '# A');
  assert.equal(firstPart('# A\n```\n---\n```\n---\nB'), '# A\n```\n---\n```');
  assert.equal(firstPart('no rule at all'), 'no rule at all');
});
ok('describe: the windows from rack.windows(), and the clock line', () => {
  const rack = { windows: () => [{ id: 'ring', title: 'RING', side: 'left', open: true, built: true, floating: false, folded: false }] };
  const fakeMod = { isModulated: () => false, playing: () => true, power: () => false, bpm: () => 30 };
  const s = createDescribe({ app: { name: 'X' }, rack, mod: fakeMod, doc: null }).describe();
  assert.match(s, /\| ring \| RING \| open, left rack \|/);
  assert.match(s, /\*\*Clock:\*\* playing · 30 BPM · modulation off \(bypassed\)/);
  assert.doesNotMatch(describeText({ app: { name: 'Y' } }), /Clock/, 'no clock given: no line');
});
console.log(`\napp.node: ${n} passed`);
