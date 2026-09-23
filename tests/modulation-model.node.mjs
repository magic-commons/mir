/* modulation-model.node.mjs — mir/modulation/mod.js: rack serialisation, the smoothing and envelope laws, the
 * bipolar route, macro order, and the preset store as it ships.
 *
 *   node tests/modulation-model.node.mjs
 *
 * Ported from λWAVES tests/mir.test.mjs §5, §20, §21 and §24.  What changed in the port:
 *   - λWAVES' parameter ids are replaced by a neutral fixture under explicit registry roots;
 *   - §20(b) no longer pins kit.js's 220 px knob travel (a knob law an app retunes with setKnobLaw): the ENV-knob
 *     claim is checked across a range of travels instead, since what it is about is the model's ENV_MAX_S and its
 *     default attack;
 *   - §21's "drop depth fills the room" arithmetic is now driven through the model (setRouteRange + a host) rather
 *     than only computed in the test;
 *   - §22 (λWAVES' own presets) is app-only and is not here.  The preset store is covered instead under the key and
 *     folders the kit ships, against a fake globalThis.localStorage.
 */
import assert from 'node:assert/strict';
import * as M from '../mir/modulation/mod.js';
import * as CV from '../mir/modulation/curve.js';
import { createModHost } from '../mir/modulation/host.js';

const results = [];
const skipped = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  if (!ok) console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 600)));
}
/** A KNOWN KIT BUG, documented rather than fixed here: `body` asserts the behaviour the kit should have.  It is
 *  run, but its result does not fail the suite; if it starts passing, say so, so somebody unskips it. */
function knownBug(name, why, body) {
  skipped.push(name);
  let nowPasses = false, threw = null;
  try { nowPasses = body() === true; } catch (e) { threw = e; }
  console.log('SKIP ' + name + '\n     ' + why +
              (nowPasses ? '\n     NOTE: this now PASSES against the kit - turn it into a check.' : '') +
              (threw ? '\n     (the documenting body threw: ' + String(threw && threw.message) + ')' : ''));
}
const clone = (v) => JSON.parse(JSON.stringify(v));

const ROOTS = ['view', 'look', 'grid', 'clock', 'state'];

/* A new LFO starts as the real editable SINE preset. Explicit analytic waves
   in saved and factory patches keep their old meaning through a round trip. */
{
  M.modReset({ bare: true });
  const fresh = M.addSource('lfo');
  const explicit = M.addSource('lfo', { wave: 'sine' });
  const before = M.serializeRack();
  const initial = fresh.shapeMode === 'curve' && fresh.wave === 'sine' &&
    CV.pointsEqual(fresh.points, CV.presetPoints('sine')) && explicit.shapeMode === 'wave';
  M.modReset({ bare: true });
  const loaded = M.deserializeRack(before), rows = M.sourceList();
  check('a new LFO is the editable SINE preset while explicit analytic waves and saved shapes survive',
    initial && loaded && rows[0].shapeMode === 'curve' && rows[1].shapeMode === 'wave' &&
    CV.pointsEqual(rows[0].points, CV.presetPoints('sine')),
    { initial, loaded, modes: rows.map(s => s.shapeMode) });
  M.modReset();
}

/* ══════════════ λWAVES §5 · serializeRack / deserializeRack round-trips ══════════ */
{
  const port = { angle: 0.65, tilt: 0.38, gain: 1, knee: 0.6, cells: 96 };
  const f = (k) => ({ get: () => port[k], set: (v) => { port[k] = v; } });
  const host = createModHost({ wall: 1000, roots: ROOTS });
  host.install([
    { id: 'view.angle', map: 'wrap', min: 0, max: 2 * Math.PI, ...f('angle') },
    { id: 'view.tilt', map: 'bipolar', min: -Math.PI / 2, max: Math.PI / 2, ...f('tilt') },
    { id: 'look.gain', map: 'log', min: 0.05, max: 20, ...f('gain') },
    { id: 'look.knee', map: 'linear', min: 0, max: 1, ...f('knee') },
    { id: 'grid.cells', map: 'integer', min: 32, max: 192, step: 32, ...f('cells') }
  ]);
  M.modReset();
  M.setTransport({ bpm: 60, sync: 'wall', playing: false });
  const source = M.addSource('lfo', { label: 'MIR LFO', on: true, wave: 'sine', sync: true,
                                      mult: M.LFO_MULT_DEFAULT, phaseOff: 0, smooth: 0 });
  const macro = M.macroList()[0];
  M.setMacro(macro.id, { name: 'MIR LFO', sourceId: source.id });
  for (const [id, hi] of [['view.angle', 0.2], ['view.tilt', 0.15], ['look.gain', 0.3], ['look.knee', 0.25], ['grid.cells', 0.4]]) {
    M.addRoute(macro.id, id, 0, hi);
  }
  host.targets.sync();

  const atRest = JSON.stringify(M.serializeRack());
  M.modReset({ bare: true });
  const empty = { sources: M.sourceCount(), routes: M.routeList().length, macros: M.macroList().length };
  const ok = M.deserializeRack(JSON.parse(atRest));
  const back = JSON.stringify(M.serializeRack());
  check('§5 serializeRack()/deserializeRack() round-trips byte for byte through a bare reset (five routes, two macros, one LFO)',
    ok && atRest === back && !empty.sources && !empty.routes && !empty.macros &&
    M.routeList().length === 5 && M.macroList().length === 2 && M.sourceCount() === 1,
    { bytes: atRest.length, empty });

  /* mid-run is idempotent rather than byte-identical: a source-driven macro's value is a live read-out and a load
     starts at bar 1 with phase 0 */
  host.clock.play(1000);
  for (let i = 0; i < 4; i++) host.clock.step(0.125);
  const midRun = clone(M.serializeRack());
  M.deserializeRack(clone(midRun));
  const once = JSON.stringify(M.serializeRack());
  M.deserializeRack(JSON.parse(once));
  const twice = JSON.stringify(M.serializeRack());
  const liveMacro = midRun.macros.find((m) => m.sourceId);
  check('§5 a rack serialized mid-run is idempotent, and the live macro value does not survive the load',
    once === twice && liveMacro.value !== JSON.parse(once).macros.find((m) => m.sourceId).value,
    { liveValue: liveMacro.value, afterLoad: JSON.parse(once).macros.find((m) => m.sourceId).value });
  host.clock.pause();
  host.targets.uninstall();
  M.modReset();
}

/* ══════════════ λWAVES §20 · the smoothing readout and the envelope laws ═════════ */
{
  /* (a) the smoothing time constant is 0.5 * v^2 seconds, not v * SMOOTH_TAU_MAX */
  const rows = [0.25, 0.5, 0.75, 1].map((v) => ({ knob: v, linear: v * M.SMOOTH_TAU_MAX * 1000, tau: M.smoothTau(v) * 1000 }));
  const worst = Math.max(...rows.map((r) => r.linear / (r.tau || 1)));
  check('§20a smoothTau is 0.5 v^2 s: 31.25 ms at 0.25, 125 ms at 0.5, 500 ms at 1, 0 at 0; a linear readout is wrong by up to 4x',
    Math.abs(M.smoothTau(0.25) * 1000 - 31.25) < 1e-9 && Math.abs(M.smoothTau(0.5) * 1000 - 125) < 1e-9 &&
    Math.abs(M.smoothTau(1) * 1000 - 500) < 1e-9 && M.smoothTau(0) === 0 && Math.abs(worst - 4) < 1e-9, { rows, worst });

  /* (b) an ENV time knob over 0 ... ENV_MAX_S.  λWAVES measured this at kit.js's 220 px travel; the travel is an app
     setting (setKnobLaw), so the claim is checked for a range of travels: a LINEAR knob's first pixel is already
     longer than the default attack, the SQUARE law's (get sqrt(v/max), set p^2 * max) first pixel is under a tenth
     of it, and the square law spends its resolution at the bottom (its top pixel is ~2x the linear step). */
  M.modReset();
  const e = M.addSource('env');
  const law = [120, 220, 400, 600].map((PX) => {
    const lin = (px) => (px / PX) * M.ENV_MAX_S, sq = (px) => Math.pow(px / PX, 2) * M.ENV_MAX_S;
    return { PX, linStep: lin(1) * 1000, sqBottom: sq(1) * 1000, sqTop: (M.ENV_MAX_S - sq(PX - 1)) * 1000 };
  });
  check('§20b the default attack is 10 ms over an 8 s ENV range: a linear time knob cannot reach it in one pixel at any of 120-600 px travel, the square law can',
    e.a === 0.01 && M.ENV_MAX_S === 8 &&
    law.every((r) => r.linStep > e.a * 1000 && r.sqBottom < e.a * 1000 / 10 && r.sqTop > 1.9 * r.linStep),
    { defaultAttackMs: e.a * 1000, law });

  /* (c) FIT: a default envelope drawn over its default window crowds into the left quarter; FIT spreads it.
     W is a picture width in pixels, a fixture: the claim is about envPoints' t, and holds at any width. */
  const W = 265, px = (s2) => M.envPoints(s2).map((p) => Math.round(p.t * W));
  M.modReset();
  const e2 = M.addSource('env');
  const at4 = px(e2), dur = M.envDuration(e2);
  M.setSource(e2.id, { timeScale: Math.min(M.ENV_MAX_S, Math.max(0.25, dur * 1.15)) });
  const fitted = px(e2);
  check('§20c a default envelope (duration 0.910 s) over its default window sits on 0,1,21,60,265 of 265 px; after FIT (timeScale = duration x 1.15) on 0,3,78,230,265',
    at4.join() === '0,1,21,60,265' && fitted.join() === '0,3,78,230,265' &&
    Math.abs(dur - 0.91) < 1e-9 && Math.abs(e2.timeScale - dur * 1.15) < 1e-9,
    { dur, at4, fitted, timeScale: e2.timeScale });

  /* (d) the envelope is a curve: envPoints() evaluated by curve.js agrees with envAt() */
  M.modReset();
  const e3 = M.addSource('env', { a: 0.2, hold: 0.1, d: 0.4, s: 0.6, r: 0.5, ta: 0.3, td: -0.4, tr: 0.2, timeScale: 2 });
  M.trigger(e3.id);
  const ep = M.envPoints(e3);
  let disagree = 0, envWorst = 0;
  for (let j = 0; j <= 400; j++) {
    const u = j / 400;
    const d2 = Math.abs(CV.evaluate(ep, u) - M.envAt(e3, u * e3.timeScale));
    if (d2 > envWorst) envWorst = d2;
    if (d2 > 1e-12) disagree++;
  }
  check('§20d envPoints() is a {t, v, tension} curve (six points with HOLD) that curve.evaluate reads to within 1e-12 of envAt() at 401 samples',
    ep.length === 6 && disagree === 0 && ep[2].tension === -0.4 && ep[0].tension === 0.3,
    { points: ep.length, disagree, envWorst, tensions: ep.map((p) => p.tension) });
  M.modReset();
}

/* ══════════════ λWAVES §21 · the bipolar route ═════════════════════════════════ */
{
  M.modReset();
  const host = createModHost({ wall: 1000, roots: ROOTS });
  const reg = host.registry;
  let v = 0.5;
  host.install([{ id: 'look.knee', label: 'KNEE', map: 'linear', min: 0, max: 1, get: () => v, set: (x) => { v = x; } }]);
  const mac = M.macroList()[0].id;
  M.setMacro(mac, { sourceId: null, masterDepth: 1 });                 /* a HAND macro: value is the fader */
  const r = M.addRoute(mac, 'look.knee', 0, 0.6).route;
  M.setRouteRange(r.id, { bi: true });
  const base = reg.baseOf('look.knee'), h = 0.3;
  const at = (x) => { M.setMacro(mac, { value: x }); host.clock.applyAll(true); return reg.read('look.knee'); };
  const mid = at(0.5), lo = at(0), hi = at(1);
  check('§21 a bipolar route puts the base in the middle of the swing: macro 0.5 moves nothing (Object.is), 0 is base - h, 1 is base + h',
    Object.is(mid, base) && Math.abs(lo - (base - h)) < 1e-12 && Math.abs(hi - (base + h)) < 1e-12,
    { base, lo, mid, hi });

  M.setRouteRange(r.id, { bi: false, min: 0, max: 0.4 });
  const u0 = at(0), u1 = at(1);
  check('§21 clearing the flag gives the unipolar route back: base ... base + span',
    Object.is(u0, base) && Math.abs(u1 - (base + 0.4)) < 1e-12, { u0, u1, base });

  /* the drop default fills the room the knob has left, in the direction it has room — measured through the model */
  const room = (b) => (Math.abs(b - 0.5) <= 0.02 ? { min: 0, max: 2 * Math.min(b, 1 - b), bi: true }
                       : b <= 0.5 ? { min: 0, max: 1 - b, bi: false } : { min: b, max: 0, bi: false });
  const reach = (b, q) => { const s = q.max - q.min;
    return q.bi ? [b - Math.abs(s) / 2, b + Math.abs(s) / 2] : s < 0 ? [b + s, b] : [b, b + s]; };
  const rows = [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1].map((b) => {
    reg.write('look.knee', b);
    const q = room(b);
    M.setRouteRange(r.id, q);
    const got = [at(0), at(1)].sort((x, y) => x - y);
    const want = reach(b, q);
    return { b, got, want, ok: Math.abs(got[0] - want[0]) < 1e-12 && Math.abs(got[1] - want[1]) < 1e-12 &&
             want[0] >= -1e-12 && want[1] <= 1 + 1e-12 && (Math.abs(want[0]) < 1e-12 || Math.abs(want[1] - 1) < 1e-12) };
  });
  check('§21 a drop depth sized to the room left (UP below centre, DOWN above, CENTRE at it) swings exactly to an end of the range at every base, with no clipping',
    rows.every((x) => x.ok), rows);

  M.setRouteRange(r.id, { bi: true, min: 0, max: 0.6 });
  const blob = clone(M.serialize());
  const onWire = blob.routes[0].bi;
  M.modReset();
  M.deserialize(blob);
  const back = M.routeList()[0];
  M.modReset();
  const plain = JSON.stringify(clone(M.serialize()));
  check('§21 bi survives serialize -> deserialize: 1 on the wire when set, absent when no route is bipolar',
    onWire === 1 && back.bi === true && plain.indexOf('"bi"') < 0, { onWire, restored: back.bi });
  host.targets.uninstall();
  M.modReset();
}

/* ══════════════ λWAVES §24 · macro order is presentation; identity keeps the routes ═ */
{
  M.modReset();
  const third = M.addMacro();
  const before = M.macroList(), firstId = before[0].id, secondId = before[1].id;
  M.setMacro(secondId, { name: 'BASS MOVEMENT' });
  const route = M.addRoute(firstId, 'look.gain', 0, 0.4).route;
  const moved = M.moveMacro(firstId, 2);
  const order = M.macroList();
  const wire = clone(M.serialize());
  M.modReset(); M.deserialize(wire);
  const restored = M.macroList();
  check('§24 moving a macro moves its stable id, not its wiring; generated names follow the order, a human name stays, serialization keeps the order',
    moved === 2 && order.map((m) => m.id).join() === [secondId, third.id, firstId].join() &&
    order.map((m) => m.name).join('|') === 'BASS MOVEMENT|MACRO 2|MACRO 3' &&
    M.routeList().some((x) => x.id === route.id && x.macroId === firstId) &&
    restored.map((m) => m.id).join() === order.map((m) => m.id).join(),
    { moved, order: order.map((m) => [m.id, m.name]), restored: restored.map((m) => [m.id, m.name]) });
  M.removeMacro(third.id);
  check('§24 removing a row closes the ordinal gap without renaming a human label',
    M.macroList().map((m) => m.name).join('|') === 'BASS MOVEMENT|MACRO 2', M.macroList().map((m) => [m.id, m.name]));
  M.modReset();
}

/* ══════════════ the preset store, under the key and folders the kit ships ══════════ */
/* mod.js stays byte-identical to its vendored source (λWAVES' tests/mir.test.mjs §16 proves it), so the key is not
   injectable yet: these checks prove the store as it ships, against a fake globalThis.localStorage. */
{
  const lsDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const mem = new Map();
  const fake = {
    getItem: (k) => (mem.has(String(k)) ? mem.get(String(k)) : null),
    setItem: (k, val) => { mem.set(String(k), String(val)); },
    removeItem: (k) => { mem.delete(String(k)); },
    clear: () => { mem.clear(); },
    key: (i) => (i >= 0 && i < mem.size ? Array.from(mem.keys())[i] : null),
    get length() { return mem.size; }
  };
  Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true });
  try {
    const KEY = M.PRESET_LS;
    check('the preset key is the one every reader ships with', KEY === 'lambdawaves.q0.modpresets', KEY);
    const st = M.presetStoreReload();
    check('presetStoreState() reports the key and both folders, and an empty store', st.key === KEY &&
      st.folderDefault === M.PRESET_FOLDER_DEFAULT && st.folderFactory === M.PRESET_FOLDER_FACTORY && st.users === 0 && st.error === null, st);

    /* a rack with a bipolar route, saved and loaded back through the store */
    M.modReset();
    const src = M.addSource('lfo', { on: true, wave: 'tri', sync: true });
    const mac = M.macroList()[0].id;
    M.setMacro(mac, { sourceId: src.id });
    const rt = M.addRoute(mac, 'look.knee', 0, 0.6).route;
    M.setRouteRange(rt.id, { bi: true });
    const rackBefore = JSON.stringify(M.serializeRack());
    const saved = M.presetSave('KIT TEST', M.serializeRack());
    const blob = mem.has(KEY) ? JSON.parse(mem.get(KEY)) : null;
    check('a saved preset lands under the key, in the default folder, and nowhere else',
      saved.ok === true && saved.folder === M.PRESET_FOLDER_DEFAULT && Array.from(mem.keys()).join() === KEY &&
      blob && blob.formatVersion === M.PRESET_FORMAT_V && blob.presets.length === 1 && blob.presets[0].name === 'KIT TEST' &&
      !('transport' in blob.presets[0].rack),
      { saved, keys: Array.from(mem.keys()) });

    const list = M.presetList();
    const folders = M.presetFolders();
    check('the factory presets list under the factory folder, the user preset under the default folder',
      list.filter((p) => p.factory).length === M.FACTORY_PRESETS.length &&
      list.filter((p) => p.factory).every((p) => p.folder === M.PRESET_FOLDER_FACTORY) &&
      list.filter((p) => !p.factory).map((p) => p.name + '@' + p.folder).join() === 'KIT TEST@' + M.PRESET_FOLDER_DEFAULT &&
      folders[0].name === M.PRESET_FOLDER_FACTORY && folders[0].factory === 1 && folders.some((f) => f.name === M.PRESET_FOLDER_DEFAULT && f.count === 1),
      { list: list.map((p) => [p.name, p.folder]), folders });

    const reserved = M.presetSave('OTHER', M.serializeRack(), { folder: M.PRESET_FOLDER_FACTORY.toLowerCase() });
    check('the factory folder is reserved, case-insensitively', reserved.ok === false && reserved.error === 'reserved', reserved);

    M.modReset();
    const applied = M.presetApply(saved.id);
    check('presetApply loads the stored rack back, bipolar flag included',
      applied.ok === true && JSON.stringify(M.serializeRack()) === rackBefore && M.routeList()[0].bi === true, { applied });

    const del = M.presetDelete(saved.id);
    check('presetDelete removes it from the store', del && del.ok !== false && M.presetList().filter((p) => !p.factory).length === 0, del);
  } finally {
    if (lsDescriptor) Object.defineProperty(globalThis, 'localStorage', lsDescriptor);
    else delete globalThis.localStorage;
    const after = M.presetStoreReload();
    M.modReset();
    check('without storage the store reads empty again', after.users === 0, { users: after.users });
  }
}

const failed = results.filter((r) => !r.ok);
assert.equal(failed.length, 0, failed.length + ' of ' + results.length + ' failed: ' + failed.map((r) => r.name).join(' | '));
console.log('PASS modulation-model: ' + results.length + ' assertions' +
            (skipped.length ? ', ' + skipped.length + ' known kit bug skipped' : ''));
