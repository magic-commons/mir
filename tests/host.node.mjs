/* host.node.mjs — mir/modulation/host.js: the target host, the modulation clock and the composed host, driving the
 * real model (mod.js) through the real registry, headless.
 *
 *   node tests/host.node.mjs
 *
 * Ported from λWAVES tests/mir.test.mjs §0-4, §6, §9, §10, §13-15, §17 and §23.  What changed in the port:
 *   - λWAVES' own catalogue (host.js labParameters over λWAVES' Card) is replaced by PARAMS below: a neutral nine-
 *     parameter fixture under explicit registry roots, carrying all five maps.  Where λWAVES' ranges were used as
 *     numbers they are kept, so every measured value lands where it did there; counts that were λWAVES' (9 unrouted,
 *     14 in the catalogue) are derived from the fixture instead.
 *   - §6 no longer pins λWAVES' preset storage key; it checks that the only storage touch in the closure is mod.js's
 *     guarded globalThis.localStorage (the store itself is covered in modulation-model.node.mjs).
 *   - §13's "the shipped λWAVES vocabulary uses all five maps" becomes "describe() reports every declared map".
 *   - §22 (λWAVES' presets, barTempo) and §16 (BASINS byte provenance) are app-only and are not here.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

import { createRegistry } from '../mir/modulation/registry.js';
import { createModHost, createTargetHost, createModClock, model as M,
         MAX_WALL_STEP, PAUSE_MODES, resumeGrid, RESUME_LAWS } from '../mir/modulation/host.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  if (!ok) console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 600)));
}
const clone = (v) => JSON.parse(JSON.stringify(v));

/* ═══════════════════════════════ the fixture ═══════════════════════════════════
 * mod.js is a module SINGLETON, so every rig resets it first. */
const ROOTS = ['view', 'look', 'grid', 'clock', 'state'];
const PORT = () => ({
  view: { angle: 0.65, tilt: 0.38, zoom: 3.3 },
  look: { gain: 1, knee: 0.6, grain: 0.35, hue: 0 },
  grid: { cells: 96 },
  clock: { rate: 4, setRate(r) { this.rate = r; } }
});
function PARAMS(p) {
  const f = (o, k) => ({ get: () => o[k], set: (v) => { o[k] = v; } });
  return [
    { id: 'view.angle', label: 'ANGLE', unit: 'rad', map: 'wrap', min: 0, max: 2 * Math.PI, ...f(p.view, 'angle') },
    { id: 'view.tilt', label: 'TILT', unit: 'rad', map: 'bipolar', min: -Math.PI / 2, max: Math.PI / 2, def: 0, ...f(p.view, 'tilt') },
    { id: 'view.zoom', label: 'ZOOM', map: 'log', min: 0.4, max: 40, ...f(p.view, 'zoom') },
    { id: 'look.gain', label: 'GAIN', map: 'log', min: 0.05, max: 20, ...f(p.look, 'gain') },
    { id: 'look.knee', label: 'KNEE', map: 'linear', min: 0, max: 1, ...f(p.look, 'knee') },
    { id: 'look.grain', label: 'GRAIN', map: 'linear', min: 0, max: 1, ...f(p.look, 'grain') },
    { id: 'look.hue', label: 'HUE', map: 'wrap', min: 0, max: 360, ...f(p.look, 'hue') },
    { id: 'grid.cells', label: 'CELLS', map: 'integer', min: 32, max: 192, step: 32, ...f(p.grid, 'cells') },
    /* a target whose setter is a method, like a physics rate — §15 routes an LFO to it */
    { id: 'clock.rate', label: 'RATE', map: 'log', min: 0.01, max: 100, get: () => p.clock.rate, set: (v) => p.clock.setRate(v) }
  ];
}
const N_PARAMS = PARAMS(PORT()).length;

/* five targets, five maps, five route ranges — the window must produce five DIFFERENT numbers */
const FIVE = [
  ['view.angle', 0, 0.20],   // wrap
  ['view.tilt', 0, 0.15],    // bipolar
  ['look.gain', 0, 0.30],    // log
  ['look.knee', 0, 0.25],    // linear
  ['grid.cells', 0, 0.40]    // integer
];

function rig(opts) {
  const o = opts || {};
  const port = PORT();
  const host = createModHost({ wall: 1000, pauseMode: o.pauseMode, roots: ROOTS });
  host.install(PARAMS(port));
  M.modReset();
  M.setTransport({ bpm: 60, sync: o.sync || 'wall', playing: false });
  const source = M.addSource('lfo', { label: 'MIR LFO', on: true, wave: 'sine', sync: true,
                                      mult: M.LFO_MULT_DEFAULT, phaseOff: 0, smooth: 0 });
  const macro = M.macroList()[0];
  M.setMacro(macro.id, { name: 'MIR LFO', sourceId: source.id });
  for (const [id, lo, hi] of FIVE) M.addRoute(macro.id, id, lo, hi);
  host.targets.sync();
  return { port, host, source, macro, ids: FIVE.map((x) => x[0]) };
}

function runWindow(r, n, dt) {
  r.host.clock.play(1000);
  const trace = [];
  trace.cards = [];
  for (let i = 0; i < n; i++) {
    r.host.clock.step(dt);
    trace.push(r.host.clock.snapshot());
    trace.cards.push(clone(r.port));
  }
  return trace;
}

/* ══════════════ λWAVES §0 · a hidden preview is not background machinery ═════════ */
{
  M.modReset({ bare: true });
  const host = createModHost({ wall: 1000, presentationActive: false, roots: ROOTS });
  const source = M.addSource('lfo', { on: true, wave: 'sine', sync: false, freq: 1 });
  const closed = host.clock.play(1000);
  host.clock.setPresentationActive(true);
  const open = host.clock.play(1000);
  host.clock.advanceTo(1000.1);
  host.clock.advanceTo(1000.2);
  const preview = host.clock.snapshot();
  host.clock.setPresentationActive(false);
  const shut = host.clock.snapshot();
  check('§0 an unrouted source runs for its open editor and stops when it closes, while transport intent stays',
    !closed.ok && open.ok && shut.playing && !shut.running && !shut.presentationActive && preview.sources[0].phase > 0,
    { closed, open, shut: { playing: shut.playing, running: shut.running }, phase: preview.sources[0].phase });

  let value = 0.5;
  host.install([{ id: 'look.knee', label: 'KNEE', min: 0, max: 1, get: () => value, set: (v) => { value = v; } }]);
  const macro = M.addMacro(null);
  M.setMacro(macro.id, { sourceId: source.id });
  M.addRoute(macro.id, 'look.knee', 0, 0.25);
  host.targets.sync();
  host.clock.recomputeRunning();
  const routed = host.clock.snapshot();
  check('§0 a routed source remains machinery after the editor closes',
    routed.playing && routed.running && !routed.presentationActive && M.needsClock(),
    { playing: routed.playing, running: routed.running, value });
}

/* ══════════════ λWAVES §1 · one LFO, five targets, five distinct values ═════════ */
{
  const r = rig();
  const trace = runWindow(r, 16, 0.0625);
  const last = trace[5].targets.filter((t) => r.ids.indexOf(t.id) >= 0);
  const distinctAcross = new Set(last.map((t) => t.norm.toFixed(12))).size;
  const angle = trace.map((s) => s.targets.find((t) => t.id === 'view.angle').current.toFixed(12));
  const untouched = trace[15].targets.filter((t) => r.ids.indexOf(t.id) < 0);
  check('§1 one synced sine LFO through one macro and five routes gives five distinct normalised values',
    distinctAcross === 5 && last.length === 5 && last.every((t) => t.modulated), { distinctAcross, values: last.map((t) => t.norm) });
  check('§1 ...and one target takes many distinct values across a 16-sample window',
    new Set(angle).size >= 5, { distinctOverTime: new Set(angle).size });
  check('§1 ...while every unrouted parameter stays exactly on its base and is not marked modulated',
    untouched.length === N_PARAMS - 5 && untouched.every((t) => !t.modulated && Object.is(t.base, t.current)),
    { unrouted: untouched.length });
  const card = trace.cards[5];
  check("§1 ...and the numbers really landed on the instrument's own object through its get/set adapters",
    card.view.angle !== 0.65 && card.view.tilt !== 0.38 && card.look.gain !== 1 &&
    card.look.knee !== 0.6 && card.grid.cells !== 96, card);
}

/* ══════════════ λWAVES §2 · 60 -> 120 BPM preserves the beat at the edit edge ═══ */
{
  const r = rig();
  runWindow(r, 8, 0.125);
  const before = r.host.clock.snapshot();
  r.host.clock.setBpm(120);
  const edge = r.host.clock.snapshot();
  r.host.clock.step(0.125);
  const after = r.host.clock.snapshot();
  check('§2 changing 60 BPM to 120 preserves beats, model time and source phase at the edit edge',
    edge.bpm === 120 && before.bpm === 60 &&
    Object.is(before.beats, edge.beats) && Object.is(before.time, edge.time) &&
    Object.is(before.sources[0].phase, edge.sources[0].phase),
    { beats: [before.beats, edge.beats], time: [before.time, edge.time] });
  check('§2 ...and the next step advances twice the beats',
    Math.abs((after.beats - edge.beats) - 2 * 0.125) < 1e-12, { advanced: after.beats - edge.beats });
}

/* ══════════════ λWAVES §3 · replaying the same wall/dt schedule is exact ═════════ */
{
  const schedule = (r) => {
    const out = [];
    r.host.clock.play(1000);
    for (let i = 0; i < 8; i++) { r.host.clock.step(0.125); out.push(r.host.clock.snapshot()); }
    r.host.clock.setBpm(120);
    out.push(r.host.clock.snapshot());
    for (let i = 0; i < 8; i++) { r.host.clock.step(0.0625); out.push(r.host.clock.snapshot()); }
    r.host.clock.pause();
    out.push(r.host.clock.snapshot());
    r.host.clock.elapseWhilePaused(0.75);
    out.push(r.host.clock.snapshot());
    r.host.clock.play();
    r.host.clock.step(0.125);
    out.push(r.host.clock.snapshot());
    return JSON.stringify(out);
  };
  const a = schedule(rig());
  const b = schedule(rig());
  check('§3 replaying the same wall/dt schedule gives a byte-identical trace', a === b, { bytes: a.length });
}

/* ══════════════ λWAVES §4 · paused wall time moves nothing; resume moves again ═══ */
{
  const r = rig({ pauseMode: 'HOLD' });
  runWindow(r, 5, 0.1);
  r.host.clock.pause();
  const paused = r.host.clock.snapshot();
  r.host.clock.elapseWhilePaused(0.75);
  const afterWall = r.host.clock.snapshot();
  const sameButWall = JSON.stringify({ ...paused, wall: 0 }) === JSON.stringify({ ...afterWall, wall: 0 });
  r.host.clock.play();
  r.host.clock.step(0.1);
  const resumed = r.host.clock.snapshot();
  check('§4 paused wall time changes no model time, phase or target value — only the wall moves',
    sameButWall && afterWall.wall > paused.wall && Object.is(paused.time, afterWall.time),
    { wall: [paused.wall, afterWall.wall], time: [paused.time, afterWall.time] });
  check('§4 ...and resume advances again',
    resumed.time > paused.time && resumed.targets.some((t, i) => !Object.is(t.current, paused.targets[i].current)),
    { time: [paused.time, resumed.time] });
  check('§4 ...resume never leaps forward to the paused wall; a plain BPM source floors to its note boundary (0.5 beats -> 0, then the step)',
    Math.abs(resumed.beats - 0.1) < 1e-12 && resumed.beats < paused.beats + 0.75 && resumed.reanchors > paused.reanchors,
    { beats: [paused.beats, resumed.beats], reanchors: [paused.reanchors, resumed.reanchors] });

  const rA = rig({ pauseMode: 'HOLD' });
  M.setSource(rA.source.id, { anchor: true });
  runWindow(rA, 5, 0.1);
  rA.host.clock.pause();
  const pausedA = rA.host.clock.snapshot();
  rA.host.clock.elapseWhilePaused(0.75);
  rA.host.clock.play();
  rA.host.clock.step(0.1);
  const resumedA = rA.host.clock.snapshot();
  check('§4 ...an ANCHORED source continues from where it stopped plus the step, and the law reports ANCH',
    Math.abs(resumedA.beats - pausedA.beats - 0.1) < 1e-12 && resumedA.reanchors > pausedA.reanchors && resumedA.resume.law === 'ANCH',
    { beats: [pausedA.beats, resumedA.beats], law: resumedA.resume.law });
}

/* ══════════════ λWAVES §6 · the import closure, walked ══════════════════════════ */
{
  const specs = (src) => {
    const out = [];
    for (const re of [/^[ \t]*import\s[\s\S]*?from\s*['"]([^'"]+)['"]/gm,
                      /^[ \t]*import\s*['"]([^'"]+)['"]/gm,
                      /^[ \t]*export\s[\s\S]*?from\s*['"]([^'"]+)['"]/gm,
                      /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g]) {
      let m; while ((m = re.exec(src))) out.push(m[1]);
    }
    return { out, dynamicComputed: /\bimport\s*\(\s*[^'")\s]/.test(src) };
  };
  const closure = new Set(), bare = [], outside = [];
  let computed = false;
  const stack = [resolve(ROOT, 'mir/modulation/host.js'), resolve(ROOT, 'mir/modulation/registry.js')];
  while (stack.length) {
    const file = stack.pop();
    if (closure.has(file)) continue;
    closure.add(file);
    const { out, dynamicComputed } = specs(readFileSync(file, 'utf8'));
    if (dynamicComputed) computed = true;
    for (const s of out) {
      if (!s.startsWith('.') && !s.startsWith('/')) { bare.push(s); continue; }
      const abs = resolve(dirname(file), s);
      if (relative(resolve(ROOT, 'mir/modulation'), abs).startsWith('..')) outside.push(s);
      stack.push(abs);
    }
  }
  const rel = Array.from(closure).map((f) => relative(ROOT, f)).sort();
  const expected = ['mir/modulation/curve.js', 'mir/modulation/host.js', 'mir/modulation/mod.js', 'mir/modulation/registry.js'];
  check('§6 the import closure of host.js + registry.js is exactly four files: no kit, no view, no npm package, no computed dynamic import',
    JSON.stringify(rel) === JSON.stringify(expected) && !bare.length && !outside.length && !computed,
    { closure: rel, bare, outside, computed });

  const banned = [
    [/\bdocument\s*\./, 'document.'], [/(?:^|[^.\w'"])window\s*\./, 'window.'],
    [/\bnavigator\s*\./, 'navigator.'], [/\brequestAnimationFrame\s*\(/, 'rAF'],
    [/\bcreateElement\s*\(/, 'createElement'], [/\bgetComputedStyle\s*\(/, 'getComputedStyle'],
    [/\bGPU(?:Device|Adapter|Buffer)\b/, 'WebGPU'], [/\bHTML[A-Z]\w*Element\b/, 'HTMLElement'],
    [/from\s*['"][^'"]*(?:rack|kit|moview|skin|lab)\.js['"]/, 'a rack/kit module']
  ];
  const hits = [];
  for (const f of ['mir/modulation/registry.js', 'mir/modulation/host.js']) {
    const src = readFileSync(resolve(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    for (const [re, name] of banned) if (re.test(src)) hits.push(f + ': ' + name);
  }
  check('§6 registry.js and host.js name no DOM, GPU or kit symbol outside a comment', hits.length === 0, { hits });

  /* the storage law, without λWAVES' key: registry.js and host.js touch no storage, and every storage touch in
     mod.js is its own globalThis.localStorage (guarded by an existence check) */
  /* code only: a comment that names storage is not a storage touch (a 1.4.0 header note once failed this) */
  const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const modSrc = code(readFileSync(resolve(ROOT, 'mir/modulation/mod.js'), 'utf8'));
  const ours = code(readFileSync(resolve(ROOT, 'mir/modulation/registry.js'), 'utf8') +
                readFileSync(resolve(ROOT, 'mir/modulation/host.js'), 'utf8')).match(/localStorage|sessionStorage|indexedDB/g);
  const modAll = (modSrc.match(/localStorage|sessionStorage|indexedDB/g) || []).length;
  const modGlobal = (modSrc.match(/globalThis\.localStorage/g) || []).length;
  check("§6 the only storage in the closure is mod.js's globalThis.localStorage; registry.js and host.js touch none; the key is a non-empty string",
    !ours && modAll > 0 && modAll === modGlobal && typeof M.PRESET_LS === 'string' && M.PRESET_LS.length > 0,
    { ours, modAll, modGlobal });
  check('§6 node has no DOM: importing the whole host defined neither document nor window',
    typeof document === 'undefined' && typeof window === 'undefined');
}

/* ══════════════ λWAVES §9 · BASE vs MODULATED ══════════════════════════════════ */
{
  const r = rig({ pauseMode: 'BASE' });
  const reg = r.host.registry;
  const USER = 1.2345678901234567;
  reg.write('view.angle', USER);
  const beforeRun = reg.state('view.angle');
  runWindow(r, 6, 0.1);
  const running = reg.state('view.angle');
  r.host.clock.pause();
  const stopped = reg.state('view.angle');
  const returned = reg.restoreBase('view.angle');
  check('§9 base and current stay separate through a run: the modulator moved current and never touched the base',
    !beforeRun.modulated && !Object.is(running.current, USER) && Object.is(running.base, USER) && running.modulated,
    { base: running.base, current: running.current });
  check("§9 restoreBase() returns the user's number bit for bit, on the registry and on the instrument",
    Object.is(returned, USER) && Object.is(reg.read('view.angle'), USER) &&
    Object.is(r.port.view.angle, USER) && !reg.isModulated('view.angle'),
    { returned, card: r.port.view.angle });
  check('§9 ...and pausing in BASE mode already put it back (the synth rule on the stop edge)',
    Object.is(stopped.current, USER) && !stopped.modulated, { onStop: stopped.current });

  const r2 = rig();
  runWindow(r2, 4, 0.1);
  const mid = r2.host.registry.state('look.gain');
  r2.host.registry.write('look.gain', 2.5);
  const afterWrite = r2.host.registry.state('look.gain');
  r2.host.clock.step(0.1);
  const afterStep = r2.host.registry.state('look.gain');
  check('§9 a hand on the knob under a running modulator moves the base and the modulation rides on top',
    afterWrite.base === 2.5 && Object.is(afterWrite.current, mid.current) &&
    afterStep.base === 2.5 && !Object.is(afterStep.current, mid.current),
    { base: afterWrite.base, currentAtWrite: afterWrite.current, currentNext: afterStep.current });
}

/* ══════════════ λWAVES §10 · the pause law, all four lines ═════════════════════ */
{
  const hold = rig({ pauseMode: 'HOLD' });
  runWindow(hold, 3, 0.1);
  const beforeHold = hold.host.registry.read('view.angle');
  hold.host.clock.pause();
  check('§10 HOLD freezes a source-driven control where the modulator had it',
    Object.is(hold.host.registry.read('view.angle'), beforeHold) && hold.host.clock.pauseMode() === 'HOLD');

  const base = rig({ pauseMode: 'BASE' });
  runWindow(base, 3, 0.1);
  base.host.clock.pause();
  check('§10 BASE returns it to the knob',
    Object.is(base.host.registry.read('view.angle'), base.host.registry.baseOf('view.angle')));

  const hand = rig();
  const macro2 = M.addMacro('HAND');
  M.addRoute(macro2.id, 'look.grain', 0, 1);
  M.setMacro(macro2.id, { value: 0.8 });
  hand.host.targets.sync();
  hand.host.clock.play(1000);
  hand.host.clock.step(0.1);
  const handRunning = hand.host.registry.read('look.grain');
  hand.host.clock.pause();
  const handStopped = hand.host.registry.read('look.grain');
  check('§10 a HAND macro holds its value across the stop edge',
    Object.is(handRunning, handStopped) && handStopped !== hand.host.registry.baseOf('look.grain'),
    { running: handRunning, stopped: handStopped, base: hand.host.registry.baseOf('look.grain') });

  const bypass = rig();
  runWindow(bypass, 3, 0.1);
  M.setSource(bypass.source.id, { on: false });
  bypass.host.clock.applyAll(false);
  check("§10 switching the only source off bypasses every route on the target and hands it back to the user's knob",
    Object.is(bypass.host.registry.read('view.angle'), bypass.host.registry.baseOf('view.angle')) &&
    !bypass.host.registry.isModulated('view.angle'));
}

/* ══════════════ λWAVES §13 · the catalogue a modulation window is built from ═════ */
{
  const r = rig();
  const cat = r.host.registry.describe();
  const kinds = new Set(cat.map((c) => c.map));
  check('§13 describe() is a JSON-serialisable catalogue (id, label, unit, range, map, group) with no functions in it',
    JSON.stringify(cat) === JSON.stringify(clone(cat)) && cat.length === N_PARAMS &&
    cat.every((c) => c.id && c.map && Number.isFinite(c.min) && Number.isFinite(c.max) && typeof c.group === 'string'),
    { count: cat.length });

  /* the mode-key address space, with a hand-built pair of defs in place of λWAVES' labParameters({ modes }) */
  const amps = new Map([['h:2:1:0', 0.4], ['h:3:2:-1', 0.1]]);
  const phases = new Map([['h:2:1:0', 1.1], ['h:3:2:-1', 0]]);
  const modeDefs = [];
  for (const key of ['h:2:1:0', 'h:3:2:-1']) {
    modeDefs.push({ id: 'state.mode.' + key + '.amp', map: 'linear', min: 0, max: 1, get: () => amps.get(key), set: (v) => amps.set(key, v) });
    modeDefs.push({ id: 'state.mode.' + key + '.phase', map: 'wrap', min: 0, max: 2 * Math.PI, get: () => phases.get(key), set: (v) => phases.set(key, v) });
  }
  const modeReg = createRegistry({ roots: ROOTS });
  createTargetHost({ registry: modeReg }).install(modeDefs);
  modeReg.applyModulated('state.mode.h:2:1:0.phase', 2 * Math.PI + 0.25);
  check('§13 state.mode.h:n:l:m.* registers through a target host; a wrap phase pushed a full turn past its seam lands back inside the circle',
    modeReg.list().length === 4 && modeReg.describeOne('state.mode.h:2:1:0.amp').map === 'linear' &&
    modeReg.describeOne('state.mode.h:3:2:-1.phase').map === 'wrap' &&
    modeReg.baseOf('state.mode.h:2:1:0.amp') === 0.4 && Math.abs(phases.get('h:2:1:0') - 0.25) < 1e-12,
    { ids: modeReg.list(), phase: phases.get('h:2:1:0') });

  const declared = PARAMS(PORT());
  check('§13 describe() reports every declared map, and the fixture really uses all five',
    kinds.size === 5 && declared.every((d) => cat.find((c) => c.id === d.id).map === d.map),
    { maps: Array.from(kinds).sort() });
}

/* ══════════════ λWAVES §14 · the four edges, one at a time ═════════════════════ */
{
  const silent = createModHost({ wall: 1000, roots: ROOTS });
  silent.install(PARAMS(PORT()));
  M.modReset();
  const s = M.addSource('lfo', { on: true, wave: 'sine', sync: true, mult: M.LFO_MULT_DEFAULT });
  M.setMacro(M.macroList()[0].id, { sourceId: s.id });
  M.addRoute(M.macroList()[0].id, 'view.angle', 0, 1);
  silent.targets.sync();
  silent.clock.play(1000);
  for (let i = 0; i < 4; i++) silent.clock.step(0.1);
  const p = silent.presentation();
  check('§14 EDGE 4: presentation defaults to a no-op, and the model still asked for a paint on the start edge and every output frame',
    p.requests >= 5 && p.reasons.includes('transport-start') && p.reasons.includes('modulation-output'),
    { requests: p.requests, reasons: Array.from(new Set(p.reasons)) });

  let painted = 0, geom = 0;
  const wired = createModHost({ wall: 1000, roots: ROOTS, present: () => { painted++; }, invalidateGeometry: () => { geom++; } });
  wired.install([{ id: 'look.knee', map: 'linear', min: 0, max: 1, get: () => 0.5, set: () => {} }]);
  wired.registry.write('look.knee', 0.9);
  wired.invalidateGeometry('window-moved');
  check('§14 EDGE 4: injected present / invalidateGeometry callbacks are the ones called',
    painted === 0 && geom === 1 && wired.geometry().lastReason === 'window-moved', { painted, geom });

  let live = false;
  const gated = createModHost({ wall: 1000, roots: ROOTS, available: () => live });
  gated.install([{ id: 'look.knee', map: 'linear', min: 0, max: 1, get: () => 0.5, set: () => {} }]);
  M.modReset();
  const s2 = M.addSource('lfo', { on: true, wave: 'sine', sync: true, mult: M.LFO_MULT_DEFAULT });
  M.setMacro(M.macroList()[0].id, { sourceId: s2.id });
  M.addRoute(M.macroList()[0].id, 'look.knee', 0, 1);
  gated.targets.sync();
  const refusedRun = gated.clock.play(1000).running;
  live = true;
  gated.clock.recomputeRunning();
  check('§14 EDGE 2: the availability gate holds the clock stopped while unavailable and starts it when available',
    refusedRun === false && gated.clock.isRunning() === true && gated.clock.isPlaying() === true);

  const dorm = createModHost({ wall: 1000, roots: ROOTS });
  M.modReset();
  const s3 = M.addSource('lfo', { on: true, wave: 'sine', sync: true, mult: M.LFO_MULT_DEFAULT });
  M.setMacro(M.macroList()[0].id, { sourceId: s3.id });
  M.addRoute(M.macroList()[0].id, 'look.level', 0, 1);
  const dormantBefore = dorm.targets.sync();
  dorm.install([{ id: 'look.level', map: 'log', min: 1e-4, max: 1, get: () => 0.06, set: () => {} }]);
  const dormantAfter = M.dormantCount();
  check('§14 EDGE 2: a route whose target is not installed goes dormant, keeps its settings, and wakes when the target appears',
    dormantBefore === 1 && dormantAfter === 0 && M.routeList().length === 1, { dormantBefore, dormantAfter });

  const un = createModHost({ wall: 1000, roots: ROOTS });
  let card = 0.5;
  un.install([{ id: 'look.knee', map: 'linear', min: 0, max: 1, get: () => card, set: (v) => { card = v; } }]);
  un.registry.applyModulated('look.knee', 0.87);
  const abandoned = card;
  un.targets.uninstall();
  check('§14 EDGE 2: uninstall makes every target let go of its modulated value first',
    abandoned === 0.87 && card === 0.5 && !un.registry.has('look.knee'), { abandoned, after: card });

  check('§14 EDGE 3: the clock carries the 0.25 s wall-step clamp and the two pause modes',
    MAX_WALL_STEP === 0.25 && JSON.stringify(PAUSE_MODES) === JSON.stringify(['BASE', 'HOLD']));
}

/* ══════════════ λWAVES §15 · the modulation clock is not the physics clock ═══════ */
{
  const r = rig();
  M.addRoute(M.macroList()[0].id, 'clock.rate', 0, 1);
  r.host.targets.sync();
  r.host.clock.play(1000);
  const rates = [], beats = [];
  for (let i = 0; i < 8; i++) { r.host.clock.step(0.125); rates.push(r.port.clock.rate); beats.push(M.transport.beats); }
  let even = true;
  for (let i = 1; i < beats.length; i++) if (Math.abs((beats[i] - beats[i - 1]) - 0.125) > 1e-12) even = false;
  check('§15 an LFO swinging a rate target moves that rate while the modulation transport advances exactly 0.125 beats per 0.125 s step',
    new Set(rates.map((v) => v.toFixed(9))).size > 1 && even, { rates: rates.map((v) => +v.toFixed(4)) });

  const v = rig();
  runWindow(v, 3, 0.1);
  v.host.clock.hold('1');
  const held = M.transport.hold;
  v.host.clock.setHidden(true);
  const hiddenState = { playing: v.host.clock.isPlaying(), running: v.host.clock.isRunning(), hold: M.transport.hold };
  const timeWhenHidden = M.transport.time;
  v.host.clock.advanceTo(1010);
  const timeAfterHidden = M.transport.time;
  v.host.clock.setHidden(false);
  const backState = { playing: v.host.clock.isPlaying(), running: v.host.clock.isRunning() };
  check('§15 hidden stops the clock without touching playing, releases the hold, advances no model time, and comes back running',
    held && hiddenState.playing && !hiddenState.running && !hiddenState.hold &&
    Object.is(timeWhenHidden, timeAfterHidden) && backState.playing && backState.running,
    { hiddenState, backState });

  const w = rig();
  runWindow(w, 3, 0.1);
  w.host.invalidateGeometry('window-closed');
  check('§15 a window close (geometry invalidation) cannot reset runtime state',
    w.host.clock.isRunning() && w.host.geometry().requests === 1 && M.transport.playing);
}

/* ══════════════ λWAVES §17 · the edges come apart ═══════════════════════════════ */
{
  const registry = createRegistry({ roots: ROOTS });
  let card = 0.5;
  const painted = [];
  const targets = createTargetHost({ registry, available: () => true });
  targets.install([{ id: 'look.knee', map: 'linear', min: 0, max: 1, get: () => card, set: (v) => { card = v; } }]);
  const clock = createModClock({ registry, targets, present: (why) => painted.push(why), wall: 1000 });
  M.modReset();
  const src = M.addSource('lfo', { on: true, wave: 'sine', sync: true, mult: M.LFO_MULT_DEFAULT });
  M.setMacro(M.macroList()[0].id, { sourceId: src.id });
  M.addRoute(M.macroList()[0].id, 'look.knee', 0, 1);
  targets.sync();
  clock.play(1000);
  clock.step(0.25);
  const moved = card;
  clock.pause();
  check('§17 a registry, a target host over it and a clock over both, built by hand, still drive the instrument',
    moved !== 0.5 && card === 0.5 && painted.includes('transport-start') && painted.includes('transport-stop'),
    { moved, after: card, reasons: Array.from(new Set(painted)) });

  let refused = false;
  try { createModClock({}); } catch (e) { refused = e instanceof TypeError; }
  check('§17 (added) a clock with no registry is refused with a TypeError', refused);

  registry.applyModulated('look.knee', 0.77);
  const letGo = registry.restoreAll();
  card = 0.31;
  const resynced = registry.resync();
  check('§17 restoreAll() lets every modulated parameter go; resync() re-reads an unmodulated parameter moved behind the registry',
    letGo === 1 && resynced === 1 && registry.baseOf('look.knee') === 0.31 &&
    registry.read('look.knee') === 0.31 && !registry.isModulated('look.knee'),
    { letGo, resynced });
  targets.uninstall();
}

/* ══════════════ λWAVES §23 · the MOD arm, and the three resume laws ═════════════ */
{
  function armRig(cfgs, opts) {
    const o = opts || {};
    const port = { a: 0.5, b: 0.5, c: 0.5 };
    const host = createModHost({ wall: 1000, roots: ROOTS });
    host.install([
      { id: 'look.gain', label: 'A', map: 'linear', min: 0, max: 1, get: () => port.a, set: (v) => { port.a = v; } },
      { id: 'look.soft', label: 'B', map: 'linear', min: 0, max: 1, get: () => port.b, set: (v) => { port.b = v; } },
      { id: 'look.knee', label: 'C', map: 'linear', min: 0, max: 1, get: () => port.c, set: (v) => { port.c = v; } }
    ]);
    M.modReset();
    M.setTransport({ bpm: 60, sync: o.sync || 'wall', playing: false });
    const TG = ['look.gain', 'look.soft'];
    const ids = [];
    cfgs.forEach((cfg, i) => {
      const s = M.addSource('lfo', Object.assign({ on: true, wave: 'rotate', smooth: 0, steps: 0 }, cfg));
      const m = M.macroList()[i] || M.addMacro(null);
      M.setMacro(m.id, { sourceId: null });
      M.setMacro(m.id, { sourceId: s.id });
      M.addRoute(m.id, TG[i], 0, 1);
      ids.push(s.id);
    });
    if (o.hand) {
      const hm = M.addMacro('HAND');
      M.setMacro(hm.id, { value: 0.7 });
      M.addRoute(hm.id, 'look.knee', 0, 1);
    }
    host.targets.sync();
    host.clock.recomputeRunning();
    return { host, port, ids };
  }
  const phases = (h) => h.clock.snapshot().sources.map((s) => s.phase);

  /* 23a · the arm: off is not a pause */
  {
    const r = armRig([{ sync: true, mult: 2 }], { hand: true });
    const base = r.host.registry.list().map((id) => r.host.registry.state(id).base);
    let w = 1000; r.host.clock.play(w);
    for (let i = 0; i < 90; i++) { w += 1 / 60; r.host.clock.advanceTo(w); }
    const moved = r.host.registry.list().filter((id) => r.host.registry.isModulated(id)).length;
    const running = { a: r.port.a };
    r.host.clock.pause(w);
    const handHeldByPause = !Object.is(r.port.c, base[2]);
    r.host.clock.setEnabled(false);
    const atBase = r.host.registry.list().map((id) => r.host.registry.read(id)).every((v, i) => Object.is(v, base[i]));
    r.host.clock.setEnabled(true);
    r.host.clock.play(w);
    for (let i = 0; i < 5; i++) { w += 1 / 60; r.host.clock.advanceTo(w); }
    const backOn = r.host.registry.list().filter((id) => r.host.registry.isModulated(id)).length;
    check("§23a MOD off is not a pause: a pause keeps a hand macro's value, disarming returns every routed control to its base, re-arming picks them up",
      moved === 2 && handHeldByPause && atBase && backOn === 2 && !Object.is(running.a, base[0]),
      { moved, handHeldByPause, atBase, backOn });
  }

  /* 23b · the arm does not reach the deterministic step door */
  {
    const trace = (armed) => {
      const r = armRig([{ sync: true, mult: 2 }]);
      r.host.clock.setEnabled(armed);
      const out = [];
      for (let i = 0; i < 40; i++) { r.host.clock.step(1 / 30); out.push([r.port.a, r.port.b]); }
      return JSON.stringify(out);
    };
    const on = trace(true), off = trace(false);
    const closes = (armed) => {
      const r = armRig([{ sync: true, mult: 2, wave: 'sine' }]);
      M.setTransport({ bpm: 60 });
      r.host.clock.setEnabled(armed);
      r.host.clock.step(0); const a0 = r.port.a;
      for (let i = 0; i < 120; i++) r.host.clock.step(1 / 30);
      return { a0, a1: r.port.a };
    };
    const cOn = closes(true), cOff = closes(false);
    check('§23b an exact-period take (120 x 1/30 s = one bar at 60 BPM) closes to 1e-9 through step(), armed or disarmed, identically',
      Math.abs(cOn.a1 - cOn.a0) < 1e-9 && Math.abs(cOff.a1 - cOff.a0) < 1e-9 &&
      Object.is(cOn.a0, cOff.a0) && Object.is(cOn.a1, cOff.a1), { cOn, cOff });
    check('§23b the arm is read outside step(): 40 steps are byte-identical armed and disarmed',
      on === off && on.length > 100, { bytes: on.length });
  }

  /* 23c · the three laws, on phase and on the beat */
  {
    const run = (cfgs, sync) => {
      const r = armRig(cfgs, { sync });
      let w = 1000; r.host.clock.play(w);
      for (let i = 0; i < 150; i++) { w += 1 / 60; r.host.clock.advanceTo(w); }
      const before = { phase: phases(r.host), beats: M.transport.beats };
      r.host.clock.pause(w);
      w += 3.7; r.host.clock.elapseWhilePaused(3.7);
      r.host.clock.play(w);
      const plan = r.host.clock.resumePlan();
      return { before, after: { phase: phases(r.host), beats: M.transport.beats }, plan };
    };
    const A = run([{ sync: true, mult: 2, anchor: true }]);
    const B = run([{ sync: true, mult: 2 }]);
    const C = run([{ sync: false, trig: true, ratePos: 0.5 }]);
    check('§23c ANCH holds the curve where the pause caught it: same phase (0.5) and same beat to the double',
      A.plan.law === 'ANCH' && Object.is(A.after.phase[0], A.before.phase[0]) &&
      Object.is(A.after.beats, A.before.beats) && Math.abs(A.before.phase[0] - 0.5) < 1e-9,
      { law: A.plan.law, phase: [A.before.phase[0], A.after.phase[0]] });
    check('§23c BPM jumps to the truncated note: 2.5 beats -> 2 on a 1/4-note grid, phase 0',
      B.plan.law === 'BPM' && B.plan.grid === 1 && Object.is(B.after.beats, 2) &&
      Object.is(B.after.phase[0], 0) && Math.abs(B.plan.last.moved - 0.5) < 1e-9,
      { law: B.plan.law, grid: B.plan.grid, beats: B.after.beats, moved: B.plan.last.moved });
    check('§23c TRIG starts a free-Hz curve over at phase 0 and leaves the beat alone',
      C.plan.law === 'TRIG' && Object.is(C.after.phase[0], 0) &&
      Object.is(C.after.beats, C.before.beats) && C.before.phase[0] > 0.01,
      { law: C.plan.law, phase: [C.before.phase[0], C.after.phase[0]] });

    const AB = run([{ sync: true, mult: 2, anchor: true }, { sync: true, mult: 2 }]);
    const TS = run([{ sync: true, mult: 2, trig: true }]);
    const FR = run([{ sync: true, mult: 2 }], 'free');
    check('§23c claim order: an ANCH anywhere holds the beat and the BPM source beside it continues (both on 0.5)',
      AB.plan.law === 'ANCH' && AB.plan.grid === 0 && Object.is(AB.after.beats, AB.before.beats) &&
      Object.is(AB.after.phase[0], AB.before.phase[0]) && Object.is(AB.after.phase[1], AB.before.phase[1]) &&
      Math.abs(AB.after.phase[1] - 0.5) < 1e-9, { law: AB.plan.law, phases: [AB.before.phase, AB.after.phase] });
    check('§23c TRIG on a synced source claims the grid at its own note: beat floored to 2, phase 0',
      TS.plan.grid === 1 && Object.is(TS.after.beats, 2) && Object.is(TS.after.phase[0], 0) && TS.plan.trig === 1,
      { plan: TS.plan });
    check('§23c under FREE sync the beat is untouched and the phase still comes back on 0 (not applied by the resume)',
      FR.plan.mode === 'free' && Object.is(FR.after.beats, FR.before.beats) &&
      Object.is(FR.after.phase[0], 0) && FR.plan.last.applied === false && FR.before.phase[0] > 0.01,
      { mode: FR.plan.mode, beats: [FR.before.beats, FR.after.beats], applied: FR.plan.last.applied });
  }

  /* 23d · resumeGrid is pure and its names are the model's */
  {
    armRig([{ sync: true, mult: 0 }, { sync: true, mult: 4 }]);
    const before = JSON.stringify(M.sourceList().map((s) => [s.phase, s.cycles, s.out]));
    const g1 = resumeGrid(M.sourceList()), g2 = resumeGrid(M.sourceList());
    const after = JSON.stringify(M.sourceList().map((s) => [s.phase, s.cycles, s.out]));
    const offRack = resumeGrid(M.sourceList().map((s) => ({ ...s, on: false })));
    check('§23d the grid is the coarsest live note (whole + 1/16 -> 4 beats); resumeGrid is pure; an all-off rack claims nothing',
      g1.grid === 4 && g1.law === 'BPM' && g1.bpm === 2 && before === after &&
      JSON.stringify(g1) === JSON.stringify(g2) && offRack.law === 'FREE' && offRack.grid === 0 &&
      RESUME_LAWS.indexOf(g1.law) >= 0, { g1, offRack });
  }
  M.modReset();
}

const failed = results.filter((r) => !r.ok);
assert.equal(failed.length, 0, failed.length + ' of ' + results.length + ' failed: ' + failed.map((r) => r.name).join(' | '));
console.log('PASS host: ' + results.length + ' assertions');
