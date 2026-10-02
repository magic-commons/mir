/* modulation/bind.js — how the modulation window drives an app's parameters.
 *
 * What it is: the seam between an app and the kit's modulation plugin, in one call.  The app hands over a list of
 * its parameters (each with get/set and, when it has one, the widget that shows it); this builds the registry and
 * the clock (host.js createModHost), installs the parameters as targets, marks every widget routable
 * (`data-param`), keeps each widget's base road (`setBase`), runs the clock while something moves, stores the rack
 * and the window in the app's settings, and mounts the window (window.js createModulation).  Until 1.5 every app
 * wrote this seam for itself (SOLEIL lab/modulation.js, NEBULA lab/modulation.js, λWAVES' rack.js wiring); this is
 * those seams with their differences as options.
 *   installModulation({ mount, params, … }) → { host, view, registry, M, open, close, toggle, isOpen,
 *     power, setPower, togglePower, onPower (arm, armed, onArm: the same, 1.4 names), play, togglePlay, playing, onPlay,
 *     isModulated, baseOf, currentOf, hand, running, bpm, syncBases, paintWidgets, persist, dispose }
 *
 * THE LAWS IT KEEPS
 *   1. THE HAND OWNS THE BASE.  A hand on a routed control writes the registry's base (hand(id, v) → true); the
 *      value the app reads back is the modulated one.  A hand on an unrouted control is the app's, untouched.
 *   2. THE APP'S NUMBER IS THE BASE WHEREVER NOTHING DRIVES IT.  Each tick, before the clock advances, every
 *      unrouted parameter's own value is written into the registry (syncBases), so a route starts from the knob.
 *   3. IDLE COSTS NOTHING.  The clock ticks through core/frame.js only while it runs or the microphone is live; a
 *      paused change (a seek, a preset, a hand on a routed knob) asks for ONE paint of the open window, so the play
 *      dot and the rings follow the model without a loop.
 *   0. ONE CLOCK (1.5.0-alpha.4).  Time is the app's: play(on) starts and stops the clock, and only the app's play
 *      button calls it.  Modulation's POWER is a bypass, as BASINS has it: off, every route lets go and every target is
 *      back on its base, while the clock, the sources, the tempo and the HOLDs carry on; on, the routes drive again in
 *      time.  Power never plays; play never powers.
 *   4. A HIDDEN PAGE STOPS THE CLOCK (host.js setHidden) and the microphone; visible, it re-anchors and goes on.
 *   4b. A ROUTED WIDGET SHOWS ITS VALUE.  A knob or a fader whose parameter a route drives keeps the hand's base
 *      (set) and paints the modulated value over it (show) on every tick — so a route onto a fader moves the fader,
 *      natively (SOLEIL laid an invisible knob over its lane fader to get this).  `showWidgets: false` leaves it to the
 *      app.
 *   5. ONE RECORD IN THE APP'S SETTINGS: { modulationState, modwin, modArm, modCadence, audioDevice } through
 *      `store` (default: localStorage under `storageKey`), written 180 ms after the last change and on pagehide.
 */
import { createModHost } from './host.js';
import * as M from './mod.js';
import { createModulation, ROUTABLE } from './window.js';
import { frame } from '../core/frame.js';

const TICK = 'mir:modulation:tick', PAINT = 'mir:modulation:paint';
const IDLE = { state: 'idle', reason: '', live: false, deviceId: '', sampleRate: 0, frames: 0, inputLatencyMs: null,
  analysisLatencyMs: 0, visualLatencyMs: 0, latencyMs: 0, latencyEstimated: true };

/** a store in localStorage under one key: read() → the record, write(patch) merges.  Every access is guarded (a
 *  private window or blocked storage reads empty and writes nothing). */
export function localStore(key) {
  const read = () => { try { const s = globalThis.localStorage && globalThis.localStorage.getItem(key); return s ? JSON.parse(s) || {} : {}; } catch (_) { return {}; } };
  return { read, write(patch) { try { globalThis.localStorage.setItem(key, JSON.stringify({ ...read(), ...patch })); } catch (_) { /* storage refused */ } } };
}

/** the registry roots a parameter list implies: the first segment of every id, once */
export function rootsOf(params) { return [...new Set(params.map((p) => String(p.id).split('.')[0]))]; }

/**
 * installModulation(o)
 *   mount        the element the window and its rail go in (`#floats`)
 *   params       [{ id, label, unit, group, hint, min, max, step, map, def, get(), set(v), widget }]
 *                id is 'root.name'; map linear | log | wrap | integer | bipolar; widget is a kit knob() or fader()
 *                (anything with .root, and setBase / paint if it has them) — it becomes routable
 *   roots        the registry's id roots (default: rootsOf(params))
 *   available()  the capability gate: may modulation write now (default: always)
 *   present()    ask the app for a frame (the renderer re-reads the parameters)
 *   onWindow(open)  the window opened or closed
 *   store        { read() → record, write(patch) } (default localStore(storageKey))
 *   storageKey   default 'mir.modulation'
 *   presetKey    the preset store's key (default mod.js PRESET_LS) — two apps on one origin must not share one
 *   audio        the app's audio capture factory, createAudioCapture({ onState }) (lab/audio.js); absent: no AUDIO
 *   dock, copy, targets, routeGlow   passed to the window (window.js createModulation's port)
 *   enabled      modulation's power at first boot, when the store has none (default true)
 *   showWidgets  paint routed widgets from the registry each tick (default true; law 4b)
 */
export function installModulation(o) {
  const { mount, params = [], present, onWindow } = o;
  const store = o.store || localStore(o.storageKey || 'mir.modulation');
  const prefs = store.read() || {};
  if (o.presetKey) M.setPresetKey(o.presetKey);
  try { if (prefs.modulationState) M.deserialize(prefs.modulationState); } catch (_) { /* a record this model cannot read */ }

  let view = null, lastTick = 0, feedMs = 0, saveTimer = 0, rebasing = false, looping = false, disposed = false;
  let cadence = prefs.modCadence === 120 ? 120 : 60;
  let armed = prefs.modArm === undefined ? o.enabled !== false : prefs.modArm !== false;
  let audioCap = null;
  const byId = new Map(params.map((p) => [p.id, p])), armWatchers = new Set();
  const available = typeof o.available === 'function' ? o.available : () => true;

  /* ONE CLOCK (1.5.0-alpha.4): the clock is always enabled — the app's play starts and stops it; modulation's POWER is
     host.js setModulationEnabled, which bypasses the routes and leaves time alone (BASINS modulation.js setArm) */
  const host = createModHost({ roots: o.roots || rootsOf(params), available, presentationActive: false, enabled: true,
    present: () => { if (present) present(); requestLoop(); paintSoon(); } });

  host.install(params.map((p) => ({
    id: p.id, label: p.label, unit: p.unit || '', group: p.group || p.id.split('.')[0], hint: p.hint || '',
    min: p.min, max: p.max, step: Number.isFinite(p.step) ? p.step : 0, map: p.map || 'linear', def: p.def,
    get: () => p.get(),
    set: (value) => { if (!rebasing) p.set(value); if (present) present(); },
  })));
  /* every widget becomes a target: data-param is the routing's one hook (never the label), setBase its base road */
  for (const p of params) {
    if (!p.widget || !p.widget.root) continue;
    p.widget.root.dataset.param = p.id;
    if (p.widget.setBase) p.widget.setBase(() => (host.registry.isModulated(p.id) ? host.registry.baseOf(p.id) : null));
  }
  const offHeld = host.registry.subscribe('*', (event) => {
    const p = byId.get(event.id);
    if (p && p.widget && p.widget.root) p.widget.root.classList.toggle('mod-held', host.registry.isModulated(event.id));
    if (present) present();
  });

  const stateRecord = () => ({ modulationState: M.serialize(), modwin: view ? view.presentation() : prefs.modwin, modArm: armed, modCadence: cadence });
  function persistNow() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; } store.write(stateRecord()); }
  function persistSoon() { if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(persistNow, 180); }

  /** the hand's number becomes the registry's base wherever nothing drives the target (law 2) */
  function syncBases(all = false) {
    let changed = 0; rebasing = true;
    try {
      for (const p of params) {
        if (!all && host.registry.isModulated(p.id)) continue;
        const value = Number(p.get());
        if (!Number.isFinite(value) || Object.is(host.registry.snap(p.id, value), host.registry.baseOf(p.id))) continue;
        host.registry.write(p.id, value); changed++;
      }
    } finally { rebasing = false; }
    return changed;
  }

  /* ── the microphone edge (optional): the app's own capture, fed at the modulation cadence ── */
  const capture = () => (audioCap || (audioCap = o.audio({ onState: () => { if (view && view.isOpen) view.paint(true); if (present) present(); requestLoop(); } })));
  function audioState() {
    return audioCap ? { state: audioCap.state, reason: audioCap.reason, live: audioCap.live, deviceId: audioCap.deviceId, sampleRate: audioCap.sampleRate, frames: audioCap.frames,
      inputLatencyMs: audioCap.inputLatencyMs, analysisLatencyMs: audioCap.analysisLatencyMs, visualLatencyMs: audioCap.visualLatencyMs, latencyMs: audioCap.latencyMs,
      latencyEstimated: audioCap.latencyEstimated } : { ...IDLE };
  }
  function audioSync() {
    const devices = M.sourceList().filter((s) => s.kind === 'audio');
    if (!devices.length && audioCap && (audioCap.live || audioCap.state === 'asking')) audioCap.stop();
    for (const source of devices) if (M.audioArm) M.audioArm(source.id, true);
  }
  function audioSilence() { if (!M.audioReset) return; for (const source of M.sourceList()) if (source.kind === 'audio') M.audioReset(source.id); }
  function feedAudio(hz) {
    if (!audioCap || !audioCap.live) return;
    const packet = audioCap.read(hz); if (!packet) return;
    for (const source of M.sourceList()) if (source.kind === 'audio') M.modFeedAudio(source.id, packet);
  }

  /** law 4b: a routed widget keeps the hand's base and shows the modulated value; a route removed stands it down */
  const showWidgets = o.showWidgets !== false;
  function paintWidgets() {
    if (!showWidgets) return;
    for (const p of params) {
      const w = p.widget; if (!w || !w.show || (w.dragging && w.dragging())) continue;
      if (host.registry.isModulated(p.id)) { w.set(host.registry.baseOf(p.id)); w.show(host.registry.state(p.id).current); }
      else if (w.shown !== null && w.shown !== undefined) w.set(p.get());
    }
  }

  /* ── THE TICK, through the one frame, only while something moves (law 3) ── */
  const active = () => host.clock.isRunning() || !!(audioCap && audioCap.live);
  function requestLoop() { if (!looping && !disposed && active()) { looping = true; frame.coalesce(TICK, tick); } }
  function tick(stamp) {
    looping = false;
    if (stamp - lastTick >= 1000 / cadence - 1) {
      syncBases();
      if (lastTick) { const dt = Math.min(500, Math.max(1, stamp - lastTick)); feedMs = feedMs ? feedMs + (dt - feedMs) * 0.25 : dt; }
      lastTick = stamp;
      feedAudio(feedMs ? 1000 / feedMs : cadence);
      host.clock.advanceTo(stamp / 1000);
      paintWidgets();
      if (view && view.isOpen) view.paint(false);
      if (present) present();
    }
    requestLoop();
  }
  /** a change while paused (a seek, a preset, a route): the open window paints once — the play dot is never stale */
  function paintSoon() {
    if (disposed || !view || active()) return;
    frame.coalesce(PAINT, () => { paintWidgets(); if (view && view.isOpen) view.paint(true); });
  }
  /** MODULATION'S POWER, as BASINS has it: off bypasses every route (each target returns to its base) and leaves the
   *  clock, the sources, the tempo and the HOLDs running, so power on picks up in time; on puts the routes back.  It
   *  never plays or pauses.  Stored as modArm (the record's old name).  Watchers hear every change (onPower). */
  function setArm(on, options) {
    const was = armed;
    armed = !!on; host.clock.setModulationEnabled(armed);
    if (view) view.sync();
    paintWidgets();
    if (was !== armed || (options && options.announce)) for (const fn of armWatchers) { try { fn(armed); } catch (e) { (globalThis.reportError || console.error)(e); } }
    if (!(options && options.quiet)) persistSoon();
    if (present) present();
    requestLoop(); return armed;
  }
  /** THE APP'S ONE PLAY.  The window never calls it; the app's play button (the transport bar's, the timeline's) does. */
  function play(on) {
    const w = performance.now() / 1000;
    const r = on ? host.clock.play(w) : host.clock.pause(w);
    if (view) view.sync();
    if (present) present();
    requestLoop(); paintSoon();
    for (const fn of playWatchers) { try { fn(host.clock.isPlaying()); } catch (e) { (globalThis.reportError || console.error)(e); } }
    return r;
  }
  const playWatchers = new Set();

  const port = {
    M, registry: host.registry, targets: host.targets, clock: host.clock,
    apply: () => { host.clock.applyAll(false); persistSoon(); if (present) present(); requestLoop(); paintSoon(); },
    cadence: () => cadence,
    setCadence: (hz) => { cadence = hz === 120 ? 120 : 60; persistSoon(); requestLoop(); return cadence; },
    armed: () => armed, arm: (on) => setArm(on),
    knobOf: (rid) => { const p = byId.get(rid); return p ? p.widget || null : null; },
    moved: o.moved || (() => {}),
    opened: () => { host.clock.setPresentationActive(true); if (onWindow) onWindow(true); requestLoop(); },
    closed: () => { host.clock.setPresentationActive(false); if (onWindow) onWindow(false); },
    persist: persistNow,
    presetKey: o.presetKey, copy: o.copy, dock: o.dock, targets: o.targets || ROUTABLE, routeGlow: o.routeGlow,
    audio: typeof o.audio === 'function' ? {
      state: audioState, support: () => capture().support(),
      start: (id) => capture().start(id === undefined ? (store.read().audioDevice || '') : id)
        .then((state) => { if (audioCap && audioCap.live) store.write({ audioDevice: audioCap.deviceId }); requestLoop(); return state; }),
      stop: () => { audioSilence(); return capture().stop(); },
      sync: audioSync, devices: () => capture().devices(),
    } : null,
  };
  view = createModulation(mount, port);
  try { view.restore(prefs.modwin); } catch (_) { /* a record this window cannot read */ }
  setArm(armed, { quiet: true, announce: true });

  const onVisibility = () => { host.clock.setHidden(document.hidden); if (audioCap) audioCap.setHidden(document.hidden); if (!document.hidden) requestLoop(); };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', persistNow);

  return Object.freeze({
    host, view, registry: host.registry, M,
    open: () => view.open(), close: () => view.close(), toggle: () => view.toggle(),
    get isOpen() { return view.isOpen; },
    /** the power (1.5.0-alpha.4): power() reads it, setPower(on) sets it, togglePower() flips it, onPower(fn) → off hears
     *  every change.  arm / armed / onArm are the same three under their 1.4 names, kept as aliases. */
    power: () => armed, setPower: (on) => setArm(on), togglePower: () => setArm(!armed),
    onPower(fn) { armWatchers.add(fn); return () => armWatchers.delete(fn); },
    arm: setArm, armed: () => armed,
    onArm(fn) { armWatchers.add(fn); return () => armWatchers.delete(fn); },
    /** the app's one clock: play(on), togglePlay(), playing(), onPlay(fn) → off */
    play, togglePlay: () => play(!host.clock.isPlaying()), playing: () => host.clock.isPlaying(),
    onPlay(fn) { playWatchers.add(fn); return () => playWatchers.delete(fn); },
    isModulated: (id) => host.registry.isModulated(id),
    baseOf: (id) => host.registry.baseOf(id),
    currentOf: (id) => host.registry.state(id).current,
    /** the hand law: a hand on a routed control writes the base and reports true; an unrouted one is the caller's */
    hand(id, value) {
      if (!host.registry.has(id) || !host.registry.isModulated(id)) return false;
      host.registry.write(id, value); persistSoon(); requestLoop(); paintSoon(); return true;
    },
    running: () => host.clock.isRunning(),
    bpm: () => M.transport.bpm,
    syncBases, persist: persistNow, paintWidgets,
    dispose() {
      disposed = true; frame.cancel(TICK); frame.cancel(PAINT);
      document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', persistNow);
      offHeld(); persistNow(); if (audioCap) audioCap.stop(); view.dispose(); host.dispose();
    },
  });
}
