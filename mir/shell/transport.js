/* shell/transport.js — the transport: PARTS an app lays out, and the bar they make.
 *
 * Josh, 2026-10-01: "Prefer BASINS. However keep the Transports as they are per each app.  If a feature is similar or
 * the same on Basins/Lambdawaves, then use their design."  So the kit gives the parts and the look, and the LAYOUT is
 * the app's: every part is an exported builder (play, the modulation power button, the door to the modulation window,
 * the BPM pill, the tempo panel, TAP, a window latch, the dock chip, the seat button, the way back, a plain bar button),
 * and createTransport({ layout }) assembles a bar from an ordered list of parts, groups and the app's own nodes.  With
 * no layout it is BASINS' basic bar (BASINS_LAYOUT); λWAVES' arrangement is LAMBDAWAVES_LAYOUT, from the same parts.
 *
 * Every part is BASINS' design where BASINS has the feature (app/transport.js, transport-controls.js/.css,
 * transport-placement.js, tempo-editor.js; its DOM and class names: `#transport.mini`, `.native-play-row`, `.tbtn.play`,
 * `.tbtn.modb.mir-mod-power`, `.tbtn.tempo-expand`, `.native-tempo`, `.dock-btn`, `.mod-exp.mod-logo`), λWAVES' where
 * only λWAVES has it, and the kit's own only where neither has it (docs/TRANSPORT.md says which is which, line by line).
 *
 * THE LAWS IT KEEPS
 *   1. ONE TRUE PLAY.  The play part is the only thing in this module that starts or stops time, on the clock the app
 *      passes (its timeline's, or its main clock).  Modulation is a POWER button (BASINS' glyph and its press: the arm,
 *      `mod.arm`), never a second play; the modulation window opens from its own door or a latch.  (Josh, 2026-10-01:
 *      this is how λWAVES' two clocks become one when it moves to 1.5.)
 *   2. THE MAIN OPENER.  createTransport({ opener: true }) is what an app calls first; firstRun(store) tells it a first
 *      run, so it leaves its windows closed and the bar is all there is.  Under H on a touch screen the bar keeps one
 *      button, the way back.
 *   3. ONE DODGE: THE RACK'S.  moved(rect) hands a floating window's rect to rack.dodge; the rack writes `data-seat`.
 *      Docked (BASINS' dock chip), the bar lives in a rack window named TRANSPORT and does not dodge.
 *   4. LATCHES SAY THE TRUTH, AND NOTHING POLLS.  After a click or a key on the page, a rack window opening or closing,
 *      the arm, the clock: ONE paint in the next frame.  Idle costs nothing.  BASINS' 250 ms sync interval is gone.
 *   5. EVERY LOOK VALUE IS THE KIT'S.  The bar is a `.glass` pane, so CARD STYLE, FROST, BLUR, CORNERS (via
 *      --surface-radius), RELIEF and the tier restyle it with no transport code (transport.css).
 *   6. NO ENGLISH IN A LOOKUP.  Words go through label() / ariaLabel() / t(); parts are found by class and data-*.
 *
 * The pure helpers are exported for node tests. */
import { el, label, ariaLabel, trig } from '../kit.js';
import { onLanguage } from '../core/i18n.js';
import { drag } from '../core/pointer.js';
import { frame } from '../core/frame.js';
import { setText, setAttr } from '../core/perf.js';
import { setGlyph, glyphEl, hasGlyph } from '../glyph.js';
import { markSvg } from './wordmark.js';
import * as MOD from '../modulation/mod.js';

/** the numbers the bar keeps (BASINS transport.js measured them) */
export const TRANSPORT = Object.freeze({
  pxPerStep: 9,        // a mouse drag on the pill: one step per 9 px (BASINS transport.js:66)
  touchPxPerStep: 14,  // a finger: one step per 14 px, always in ones (BASINS transport.js:69)
  slop: 4,             // the hand travels this far before a press on the pill is a drag (BASINS: |dy| ≥ 4)
  longPress: 500,      // a finger held on the bar opens the seat menu
  doubleTap: 320,      // the kit's one double-tap interval (kit.js tapWatcher)
  latchTap: 240,       // a bend tapped quicker than this latches (BASINS transport.js:126)
  bpmMin: 20, bpmMax: 300,
});
/** the seats a user may choose on the stage (Josh 2026-10-01); docking into the rack is BASINS' dock chip */
export const SEATS = Object.freeze(['bottom', 'top', 'compact']);
const SEAT_WORD = { bottom: 'BOTTOM', top: 'TOP', compact: 'COMPACT' };
const SEAT_HINT = { bottom: 'the bar at the bottom centre', top: 'the bar at the top centre', compact: 'a small bar at the bottom: glyphs only, no Hz reading' };
const PLAY_ACTION = 'transport.play';
/** the rack window the bar docks into (BASINS / λWAVES `device({ id: 'transport', eyebrow: 'TRANSPORT' })`) */
export const DOCK_ID = 'transport';
const SVG = 'http://www.w3.org/2000/svg';

/* ── the pure part ─────────────────────────────────────────────────────────────────────────────────────────── */
/** formatBpm(bpm) — one decimal under 100, whole above (BASINS) */
export const formatBpm = (bpm) => (Number.isFinite(bpm) ? bpm.toFixed(bpm < 100 ? 1 : 0) : '');
/** clampBpm(v, min, max) — inside the model's range, on the tenth (BASINS: Math.round(x * 10) / 10, clamped) */
export function clampBpm(v, min = TRANSPORT.bpmMin, max = TRANSPORT.bpmMax) {
  if (!Number.isFinite(v)) return null;
  return Math.round(Math.min(max, Math.max(min, v)) * 10) / 10;
}
/** digitStep(text, i) — BASINS: the step the i-th character of the shown tempo stands for (10 on the tens, 1 on the
 *  ones, 0.1 on the tenths); the point, anything else and a place off the number step by one */
export function digitStep(text, i) {
  const s = String(text);
  if (!(i >= 0 && i < s.length) || !/\d/.test(s[i])) return 1;
  const p = s.indexOf('.') < 0 ? s.length : s.indexOf('.');
  return i < p ? 10 ** (p - 1 - i) : Math.round(10 ** -(i - p) * 1e6) / 1e6;
}
/** charAt(boxes, x) — which character box a pointer x falls in (−1: none) */
export function charAt(boxes, x) {
  for (let i = 0; i < boxes.length; i++) if (x >= boxes[i].left && x <= boxes[i].right) return i;
  return -1;
}
/** dragBpm(start, rise, step, touch, range) — BASINS' drag: n = trunc(rise / px), tempo = start + n · step */
export function dragBpm(start, rise, step = 1, touch = false, { min, max } = {}) {
  const n = Math.trunc(rise / (touch ? TRANSPORT.touchPxPerStep : TRANSPORT.pxPerStep));
  return clampBpm(start + n * (touch ? 1 : step), min, max);
}
/** keyStep(code, shift) — BASINS: ↑ → PageUp up, ↓ ← PageDown down; a page is ten, Shift a tenth, else one */
export function keyStep(code, shift = false) {
  const dir = code === 'ArrowUp' || code === 'ArrowRight' || code === 'PageUp' ? 1 : code === 'ArrowDown' || code === 'ArrowLeft' || code === 'PageDown' ? -1 : 0;
  if (!dir) return 0;
  return dir * (shift ? 0.1 : code.startsWith('Page') ? 10 : 1);
}
/** parseBpm(text) — a typed tempo (a comma is a decimal point); null if it is not a number */
export function parseBpm(text) {
  const v = Number.parseFloat(String(text ?? '').trim().replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}
export const seatOf = (raw) => (SEATS.includes(raw) ? raw : 'bottom');
export const homeOf = (seat) => (seat === 'top' ? 'top' : 'bottom');
/** seatRect(seat, { vw, vh, w, h, top, bottom }) — where a stage seat puts a w × h bar, centred (the rack's numbers) */
export function seatRect(seat, { vw, vh, w, h, top = 52, bottom = 60 }) {
  const left = (vw - w) / 2, y = homeOf(seat) === 'top' ? top : vh - bottom - h;
  return { left, right: left + w, top: y, bottom: y + h, width: w, height: h };
}
export const menuSide = (seat) => (homeOf(seat) === 'top' ? 'below' : 'above');

/** firstRun(...stores) — true when nothing is saved in any of them (a store is `{ get() }` or a localStorage key) */
export function firstRun(...stores) {
  for (const s of stores.flat()) {
    let v = null;
    try { v = typeof s === 'string' ? globalThis.localStorage.getItem(s) : s && typeof s.get === 'function' ? s.get() : null; } catch { v = null; }
    if (v !== null && v !== undefined && v !== '') return false;
  }
  return true;
}
export function localSeatStore(key = 'mir.transport') {
  return {
    get() { try { const raw = globalThis.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } },
    set(v) { try { globalThis.localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } },
  };
}
/** menuRow(row) — a WINDOW-menu row ([label, run, disabled, hint]) read back as { label, key, hint } */
export function menuRow(row) {
  if (!Array.isArray(row) || typeof row[0] !== 'string') return null;
  const [name, key = ''] = row[0].replace(/^[↑⊕]\s+/u, '').split('\t');
  return { label: name.trim(), key: key.trim(), hint: typeof row[3] === 'string' ? row[3] : '' };
}
/** openerRows(list) — openers repaired: an id once, a label, a way to open */
export function openerRows(list) {
  const seen = new Set(), out = [];
  for (const o of Array.isArray(list) ? list : []) {
    if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !o.id || seen.has(o.id)) continue;
    if (typeof o.open !== 'function' && typeof o.toggle !== 'function') continue;
    seen.add(o.id);
    out.push({ id: o.id, label: typeof o.label === 'string' && o.label ? o.label : o.id.toUpperCase(), glyph: typeof o.glyph === 'string' ? o.glyph : '',
      key: typeof o.key === 'string' ? o.key : '', action: typeof o.action === 'string' ? o.action : '', hint: typeof o.hint === 'string' ? o.hint : '',
      open: o.open, close: o.close, toggle: o.toggle, isOpen: o.isOpen });
  }
  return out;
}
export function isOpenOf(o) {
  if (!o) return false;
  try { return typeof o.isOpen === 'function' ? !!o.isOpen() : !!o.isOpen; } catch { return false; }
}
export function toggleOf(o) {
  if (typeof o.toggle === 'function') return o.toggle();
  if (isOpenOf(o) && typeof o.close === 'function') return o.close();
  return o.open();
}
/** rackOpeners(rack, { only, glyphs }) — the rack's registered windows as openers (the docked bar's own window aside) */
export function rackOpeners(rack, { only = null, glyphs = {} } = {}) {
  return () => {
    const ids = rack.registered || [], menu = typeof rack.windowMenu === 'function' ? rack.windowMenu() : [];
    return ids.map((id, i) => {
      const spec = typeof rack.spec === 'function' ? rack.spec(id) : null, m = menuRow(menu[i]) || {};
      return { id, label: (spec && spec.title) || m.label || id.toUpperCase(), key: (spec && spec.key) || m.key || '',
        glyph: glyphs[id] || (spec && spec.glyph) || '', hint: (spec && spec.hint) || '',
        open: () => rack.raise(id), close: () => rack.close(id), isOpen: () => rack.isOpen(id) };
    }).filter((o) => o.id !== DOCK_ID && (!only || only.includes(o.id)));
  };
}
/** transportActions(get) — the key table's row for the one true play: Space */
export function transportActions(get) {
  return [{ id: PLAY_ACTION, label: 'PLAY / PAUSE', group: 'TRANSPORT', keys: ['Space'], hint: 'play or pause',
    run: () => { const tr = get(); if (tr) tr.toggle(); } }];
}

/* ── the tempo: one read and one write for every part that shows or moves it ───────────────────────────────── */
/** createTempo({ model, setBpm, mod, persist }) → { get, set(v), commit(), min, max }.  The write is the modulation
 *  clock's setBpm when there is one (it re-anchors: the beat is continuous), else model.setTransport. */
export function createTempo({ model = MOD, setBpm = null, mod = null, persist = null } = {}) {
  const min = Number.isFinite(model.BPM_MIN) ? model.BPM_MIN : TRANSPORT.bpmMin, max = Number.isFinite(model.BPM_MAX) ? model.BPM_MAX : TRANSPORT.bpmMax;
  const get = () => (model.transport && Number.isFinite(model.transport.bpm) ? model.transport.bpm : model.BPM_DEFAULT);
  const subs = new Set();
  return {
    min, max, get, model,
    set(v) {
      const b = clampBpm(v, min, max); if (b === null) return get();
      if (setBpm) setBpm(b);
      else if (mod && mod.host && mod.host.clock && typeof mod.host.clock.setBpm === 'function') mod.host.clock.setBpm(b);
      else if (typeof model.setTransport === 'function') model.setTransport({ bpm: b });
      for (const f of subs) f(); return get();
    },
    commit() { if (persist) persist(); else if (mod && typeof mod.persist === 'function') mod.persist(); },
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

/* ── THE PARTS.  Each is `part(options) → { root, sync(), destroy?() }`; `signal` ends its listeners ─────────── */
const tbtn = (cls) => { const b = el('button', 'tbtn ' + cls); b.type = 'button'; return b; };
const lifeOf = (signal) => { const c = new AbortController(); if (signal) signal.addEventListener('abort', () => c.abort(), { once: true }); return c; };

/** playButton({ clock, onRefused }) — THE ONE TRUE PLAY (BASINS `.tbtn.play`: the play / pause glyph, 20 px; lit, its
 *  ink in accent A).  `clock` is `{ play(), pause(), isPlaying(), toggle?() }`: the app's timeline clock. */
export function playButton({ clock, onRefused = null, signal } = {}) {
  const life = lifeOf(signal), root = tbtn('play');
  root.dataset.keyAction = PLAY_ACTION; root.title = 'Play or pause'; root.setAttribute('aria-pressed', 'false');
  setGlyph(root, 'play', { label: 'Play or pause', size: 20 });
  let shown = null;
  function toggle() {
    if (!clock) return null;
    const r = clock.isPlaying() ? clock.pause() : (typeof clock.play === 'function' ? clock.play() : clock.toggle());
    if (r && r.ok === false && onRefused) onRefused(r);
    sync(); return r;
  }
  function sync() {
    if (!clock) return;
    const p = !!clock.isPlaying();
    if (p !== shown) { shown = p; setGlyph(root, p ? 'pause' : 'play', { label: 'Play or pause', size: 20 }); }
    root.classList.toggle('on', p); setAttr(root, 'aria-pressed', String(p));
  }
  root.addEventListener('click', toggle, { signal: life.signal });
  if (!clock) root.hidden = true;
  sync();
  return { root, sync, toggle, destroy: () => life.abort() };
}

/** modPower({ mod }) — MODULATION'S POWER (BASINS transport-controls.js `mountModulationPower`: the ring-and-stem
 *  glyph with its halo; ON, the ring closes and lights in accent B).  A press powers modulation on or off — BASINS'
 *  `controller.toggleModulation()` → `mod.arm(!mod.armed())` — and never plays or pauses anything. */
export function modPower({ mod, signal } = {}) {
  const life = lifeOf(signal), root = tbtn('modb mir-mod-power');
  root.dataset.face = 'power';
  root.innerHTML = '<svg class="mir-power-icon" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle class="mir-power-halo" cx="12" cy="12" r="10.5"/><path class="mir-power-ring" d="M6.7 5.7a8.2 8.2 0 1 0 10.6 0"/><path class="mir-power-stem" d="M12 2.5v9"/></svg>';
  ariaLabel(root, 'Modulation on or off'); root.title = 'Enable or bypass modulation'; root.setAttribute('aria-pressed', 'true');
  const armed = () => (mod && typeof mod.armed === 'function' ? !!mod.armed() : false);
  function sync() { const on = armed(); root.classList.toggle('on', on); setAttr(root, 'aria-pressed', String(on)); }
  root.addEventListener('click', () => { if (mod && typeof mod.arm === 'function') mod.arm(!armed()); sync(); }, { signal: life.signal });
  if (!mod) root.hidden = true;
  sync();
  return { root, sync, destroy: () => life.abort() };
}

/** modDoor({ mod }) — the door to the modulation window (BASINS / λWAVES `.mod-exp.mod-logo`: the MIR mark in a
 *  round seat).  A press opens or closes the window; `aria-expanded` says which. */
export function modDoor({ mod, signal } = {}) {
  const life = lifeOf(signal), root = el('button', 'mod-exp mod-logo'); root.type = 'button';
  if (typeof document !== 'undefined') root.appendChild(markSvg());
  ariaLabel(root, 'Open the modulation window'); root.title = 'Open the modulation window'; root.setAttribute('aria-expanded', 'false');
  function sync() { setAttr(root, 'aria-expanded', String(isOpenOf(mod))); }
  root.addEventListener('click', () => { if (mod) mod.toggle(); }, { signal: life.signal });
  if (!mod) root.hidden = true;
  return { root, sync, destroy: () => life.abort() };
}

/** tempoPill({ tempo, panel }) — BASINS' BPM pill (`.tbtn.tempo-expand`: the number, BPM, the Hz, the chevron).
 *  Drag up or down: the digit under the pointer is the step; the wheel by that digit; ↑ → up and ↓ ← down by one,
 *  Shift a tenth, PageUp/PageDown ten.  A click opens the tempo panel (BASINS); a double click types the tempo in
 *  a field in the pill's seat (the kit's: Enter or leaving takes it, Escape does not). */
export function tempoPill({ tempo, panel = null, signal } = {}) {
  const life = lifeOf(signal), on = { signal: life.signal };
  const wrap = el('span', 'tempo-seat');
  const root = tbtn('tempo-expand'); wrap.appendChild(root);
  root.setAttribute('role', 'spinbutton'); root.setAttribute('aria-valuemin', String(tempo.min)); root.setAttribute('aria-valuemax', String(tempo.max));
  root.setAttribute('aria-expanded', 'false'); root.title = 'Set transport tempo';
  const num = el('b', 'tempo-number', root), unit = el('span', 'tempo-unit', root), hz = el('i', 'tempo-hz', root);
  el('span', 'tempo-chevron', root).setAttribute('aria-hidden', 'true');
  label(unit, 'BPM'); num.dir = 'ltr'; hz.dir = 'ltr';
  const field = el('input', 'modtempoin transport-tempo-input', wrap);
  field.type = 'text'; field.inputMode = 'decimal'; field.maxLength = 8; field.spellcheck = false; field.hidden = true; field.dir = 'ltr';
  ariaLabel(field, 'Type the tempo in BPM');
  const doc = root.ownerDocument;
  function stepAt(x) {
    const n = num.firstChild; if (!n || n.nodeType !== 3) return 1;
    const s = n.textContent, r = doc.createRange(), boxes = [];
    for (let i = 0; i < s.length; i++) { r.setStart(n, i); r.setEnd(n, i + 1); const b = r.getBoundingClientRect(); boxes.push({ left: b.left, right: b.right }); }
    return digitStep(s, charAt(boxes, x));
  }
  let dragged = false, g0 = null, lastClick = 0, editing = false, shownBpm = '';
  const g = drag(root, { slop: TRANSPORT.slop,
    onStart: (s) => { const touch = s.pointerType === 'touch'; g0 = { bpm: tempo.get(), touch, step: touch ? 1 : stepAt(s.x0) }; root.classList.add('drag'); },
    onMove: (s) => { if (g0) { tempo.set(dragBpm(g0.bpm, -s.dy, g0.step, g0.touch, tempo)); sync(); } },
    onEnd: () => { if (!g0) return; g0 = null; dragged = true; root.classList.remove('drag'); tempo.commit(); },
    onCancel: () => { if (!g0) return; const b = g0.bpm; g0 = null; root.classList.remove('drag'); tempo.set(b); sync(); } });
  root.addEventListener('pointerdown', () => { dragged = false; }, on);
  root.addEventListener('click', (e) => {
    if (dragged) { dragged = false; return; }
    const now = e.timeStamp;
    if (now - lastClick < TRANSPORT.doubleTap) { lastClick = 0; if (panel && panel.isOpen()) panel.close(); edit(); return; }
    lastClick = now;
    if (panel) panel.toggle();
  }, on);
  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : e.deltaY > 0 ? -1 : 0; if (!dir) return;
    tempo.set(tempo.get() + dir * stepAt(e.clientX)); sync(); frame.coalesce('mir.transport.persist', () => tempo.commit());
  }, { passive: false, signal: life.signal });
  root.addEventListener('keydown', (e) => {
    const k = keyStep(e.code, e.shiftKey); if (!k) return;
    e.preventDefault(); tempo.set(tempo.get() + k); sync(); tempo.commit();
  }, on);
  function edit() {
    if (editing) return; editing = true;
    const r = root.getBoundingClientRect();
    field.style.width = r.width + 'px'; field.style.height = r.height + 'px';
    field.value = formatBpm(tempo.get()); root.hidden = true; field.hidden = false;
    field.focus({ preventScroll: true }); field.select();
  }
  function close(take, refocus) {
    if (!editing) return; editing = false;
    if (take) { const v = parseBpm(field.value); if (v !== null) { tempo.set(v); tempo.commit(); } }
    field.hidden = true; root.hidden = false;
    if (refocus) root.focus({ preventScroll: true });
    sync();
  }
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(e.key === 'Enter', true); }
  }, on);
  field.addEventListener('blur', () => close(true, false), on);
  function sync() {
    const bpm = tempo.get(), n = formatBpm(bpm);
    setText(num, n); setText(hz, (bpm / 60).toFixed(2) + ' Hz'); setAttr(root, 'aria-valuenow', n);
    if (shownBpm !== n) { shownBpm = n; ariaLabel(root, '{bpm} beats per minute', { bpm: n }); }
    if (panel) setAttr(root, 'aria-expanded', String(panel.isOpen()));
  }
  const offLang = onLanguage(() => { shownBpm = ''; sync(); });
  sync();
  return { root: wrap, pill: root, field, sync, edit, destroy() { g.destroy(); life.abort(); offLang(); } };
}

/** tempoPanel({ tempo, mod }) — BASINS' tempo panel (`.native-tempo`), its CLOCK tiles: TAP, WALL / FREE, the
 *  cadence (when the seam has one), ÷2 ×2 ×4 (hold to bend, tap to latch) and HOLD ¼ / HOLD 1 (the stutter).
 *  Opened by a click on the pill.  BASINS' macro rail is not here (docs/TRANSPORT.md). */
export function tempoPanel({ tempo, mod = null, signal } = {}) {
  const life = lifeOf(signal), on = { signal: life.signal };
  const C = mod && mod.host && mod.host.clock, M = tempo.model || MOD;
  const root = el('div', 'native-tempo'); root.hidden = true;
  const pane = el('div', 'tempo-pane tempo-clock', root); ariaLabel(pane, 'clock');
  const grid = el('div', 'tempo-grid', pane);
  let taps = [];
  const tapT = trig({ label: 'TAP', title: 'Tap the tempo', onFire: () => { const r = (M.tapTempo || MOD.tapTempo)(taps, performance.now()); taps = r.taps; if (r.bpm) tempo.set(r.bpm); tempo.commit(); sync(); } });
  tapT.root.classList.add('tap'); grid.appendChild(tapT.root);
  const syncB = trig({ label: 'WALL', title: 'Sync the modulation clock to the wall clock or run it free', onFire: () => { C.setSync(M.syncMode() === 'wall' ? 'free' : 'wall'); tempo.commit(); sync(); } });
  const cad = trig({ label: '60 Hz', title: 'Modulation cadence', onFire: () => { mod.setCadence(mod.cadence() === 120 ? 60 : 120); sync(); } });
  if (C && typeof C.setSync === 'function' && typeof M.syncMode === 'function') grid.appendChild(syncB.root);
  if (mod && typeof mod.cadence === 'function' && typeof mod.setCadence === 'function') grid.appendChild(cad.root);
  const bend = { base: null, which: null, latched: false, downAt: 0 };
  const bends = [[0.5, '÷2'], [2, '×2'], [4, '×4']].map(([factor, word]) => {
    const b = trig({ label: word, title: 'Hold to ' + (factor > 1 ? 'multiply' : 'halve') + ' the tempo, release to return · tap to latch, tap again to release', onFire: () => {} });
    b.root.setAttribute('aria-pressed', 'false'); b.root.dataset.bend = String(factor);
    const go = () => { if (bend.base === null) bend.base = tempo.get(); bend.which = word; tempo.set(bend.base * factor); sync(); };
    const off = () => { if (bend.base !== null) tempo.set(bend.base); bend.base = null; bend.which = null; bend.latched = false; sync(); };
    b.root.addEventListener('pointerdown', (e) => { if (e.button) return; e.preventDefault(); bend.downAt = performance.now();
      if (bend.which === word && bend.latched) { off(); return; }
      if (bend.which && bend.which !== word) off();
      go(); try { b.root.setPointerCapture(e.pointerId); } catch (_) { /* a capture that cannot be taken is fine */ } }, on);
    b.root.addEventListener('pointerup', () => { if (bend.which !== word || bend.latched) return; if (performance.now() - bend.downAt < TRANSPORT.latchTap) { bend.latched = true; sync(); return; } off(); }, on);
    b.root.addEventListener('pointercancel', () => { if (bend.which === word && !bend.latched) off(); }, on);
    b.root.addEventListener('keydown', (e) => { if (e.repeat || (e.code !== 'Space' && e.code !== 'Enter')) return; e.preventDefault(); if (bend.which === word) { off(); return; } if (bend.which) off(); go(); bend.latched = true; sync(); }, on);
    grid.appendChild(b.root); return { b, word };
  });
  const holds = ['1/4', '1'].map((note) => {
    const b = trig({ label: note === '1/4' ? 'HOLD ¼' : 'HOLD 1', title: 'Stutter: hold the beat at this note value',
      onFire: () => { const T = M.transport; if (T.hold && T.holdNote === note) C.release(); else { if (T.hold) C.release(); C.hold(note); } sync(); } });
    if (C && typeof C.hold === 'function') grid.appendChild(b.root);
    return { b, note };
  });
  const lit = (t, v) => { t.root.classList.toggle('on', !!v); setAttr(t.root, 'aria-pressed', String(!!v)); };
  function sync() {
    if (C && typeof M.syncMode === 'function') { const wall = M.syncMode() === 'wall'; syncB.setLabel(wall ? 'WALL' : 'FREE'); lit(syncB, wall); }
    if (mod && typeof mod.cadence === 'function') cad.setLabel(mod.cadence() + ' Hz');
    for (const { b, word } of bends) lit(b, bend.which === word);
    const T = M.transport || {};
    for (const { b, note } of holds) lit(b, !!T.hold && T.holdNote === note);
  }
  const subs = new Set();
  const set = (v) => { if (v === !root.hidden) return; root.hidden = !v; for (const f of subs) f(v); sync(); };
  sync();
  return { root, sync, isOpen: () => !root.hidden, open: () => set(true), close: () => set(false), toggle: () => set(root.hidden),
    onToggle(fn) { subs.add(fn); return () => subs.delete(fn); }, destroy: () => life.abort() };
}

/** tapButton({ tempo }) — TAP as a seat of its own on the bar (BASINS and λWAVES keep it in the tempo panel) */
export function tapButton({ tempo, signal } = {}) {
  const life = lifeOf(signal), root = tbtn('tap');
  label(el('span', 'tr-word', root), 'TAP'); root.title = 'Tap the tempo: four taps set it';
  let taps = [];
  root.addEventListener('click', () => { const M = tempo.model || MOD; const r = (M.tapTempo || MOD.tapTempo)(taps, performance.now()); taps = r.taps; if (r.bpm) tempo.set(r.bpm); tempo.commit(); }, { signal: life.signal });
  return { root, sync() {}, destroy: () => life.abort() };
}

/** barButton({ cls, glyph, svg, text, label, title, run }) — a plain round seat on the bar for an app's own verb
 *  (BASINS' and λWAVES' rewind `.transport-home`, λWAVES' step ‹ › and its ⟳ jump) */
export function barButton({ cls = '', glyph = '', svg = '', text = '', label: name = '', title = '', run, signal } = {}) {
  const life = lifeOf(signal), root = tbtn(cls);
  if (svg) root.innerHTML = svg; else if (glyph && hasGlyph(glyph)) root.appendChild(glyphEl(glyph, 'tr-gly', 16)); else if (text) root.textContent = text;
  if (name) ariaLabel(root, name); if (title) root.title = title;
  if (run) root.addEventListener('click', run, { signal: life.signal });
  return { root, sync() {}, destroy: () => life.abort() };
}
/** BASINS' and λWAVES' rewind drawing (transport.js:15) */
export const SVG_REWIND = '<svg xmlns="' + SVG + '" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="tr-rewind"><rect x="5" y="5" width="2.6" height="14" rx="1.1"/><polygon points="20 5 9 12 20 19"/></svg>';

/** latch(opener) — one window's latch (the kit's: neither BASINS nor λWAVES puts window buttons on the bar): its
 *  glyph and word; lit while the window is open; a press toggles the window */
export function latch(o, { signal } = {}) {
  const life = lifeOf(signal), root = tbtn('tr-open'); root.dataset.opener = o.id; root.setAttribute('aria-pressed', 'false');
  if (o.glyph && hasGlyph(o.glyph)) { const g = glyphEl(o.glyph, 'tr-gly', 16); if (g) root.appendChild(g); root.classList.add('has-glyph'); }
  label(el('span', 'tr-word', root), o.label);
  root.title = o.hint || o.label;
  if (o.action) root.dataset.keyAction = o.action; else if (o.key) root.dataset.keyHint = o.key;
  root.addEventListener('click', () => toggleOf(o), { signal: life.signal });
  function sync() { const open = isOpenOf(o); root.classList.toggle('on', open); setAttr(root, 'aria-pressed', String(open)); }
  sync();
  return { root, sync, destroy: () => life.abort() };
}

/** wayBack({ run }) — under H on a touch screen, the one button left of the main opener (the kit's) */
export function wayBack({ run, signal } = {}) {
  const life = lifeOf(signal), root = el('button', 'tr-back'); root.type = 'button';
  setGlyph(root, 'expand', { label: 'Show the interface', size: 18 }); root.title = 'Show the interface';
  root.addEventListener('click', () => run && run(), { signal: life.signal });
  return { root, sync() {}, destroy: () => life.abort() };
}

/* ── the layouts ───────────────────────────────────────────────────────────────────────────────────────────── */
/** BASINS' basic bar (app/transport.js): the play row — play, modulation's power, the BPM pill — then the tempo
 *  panel the pill opens, the window latches, the seat button, the dock chip and the modulation door. */
export const BASINS_LAYOUT = Object.freeze([{ group: 'native-play-row', items: ['play', 'power', 'rewind', 'tempo'] }, 'panel', 'openers', 'seat', 'dock', 'door']);
/** λWAVES' bar (lab/rack.js §25 + native-ui.js), from the same parts: play, modulation's power, rewind, ‹ ›, then the
 *  app's own scrub, ⟳, readouts and RATE knob (`app:<name>`, from `nodes`), the pill; the panel; then dock and door. */
export const LAMBDAWAVES_LAYOUT = Object.freeze([{ group: 'native-play-row', items: ['play', 'power', 'rewind', 'app:back', 'app:forward', 'app:scrub', 'app:jump', 'app:time', 'app:period', 'app:rate', 'tempo'] },
  'panel', 'openers', 'seat', 'dock', 'door']);

/** layoutNames(layout) — every part name a layout uses, groups opened */
export function layoutNames(list) {
  const out = [];
  for (const x of Array.isArray(list) ? list : []) if (typeof x === 'string') out.push(x); else if (x && Array.isArray(x.items)) out.push(...layoutNames(x.items));
  return out;
}

/* the docked seat: the bar in a rack window named TRANSPORT (BASINS transport-placement.js `docked`).  One window per
   rack, registered once; its hooks are forwarded to whichever bar is alive. */
const docks = new WeakMap();
function dockOf(R) {
  let d = docks.get(R);
  if (!d) {
    d = { open: null, close: null }; docks.set(R, d);
    if (!(R.registered || []).includes(DOCK_ID)) R.register({ id: DOCK_ID, title: 'TRANSPORT', side: 'left', hint: 'the transport, docked',
      build() {}, onOpen: (api) => d.open && d.open(api), onClose: () => d.close && d.close() });
  }
  return d;
}

/** createTransport(options) → api
 *    layout      the bar's arrangement: an array of part names ('play', 'power', 'door', 'tempo', 'panel', 'tap',
 *                'rewind', 'openers', 'seat', 'dock', 'back'), `app:<name>` (a node from `nodes`), DOM nodes, and
 *                `{ group: 'class names', items: [...] }`.  Default BASINS_LAYOUT.
 *    nodes       { name: Element } — the app's own nodes a layout names
 *    clock       the ONE TRUE PLAY's clock: { play(), pause(), isPlaying(), toggle?(), onChange?(fn), seek?(beat) }
 *    mod         the modulation seam (installModulation's result): the power button, the door, the panel's clock tiles
 *    model, setBpm, persist   the tempo (createTempo)
 *    openers, rack, keys, store, key, opener, onRefused, onInterface, host, root, id — as in docs/TRANSPORT.md */
export function createTransport({ layout = BASINS_LAYOUT, nodes = {}, host = globalThis.document && document.body, root = null, id = 'transport',
  clock = null, mod = null, model = MOD, setBpm = null, persist = null, openers = [], rack = null, keys = null, store = null,
  key = 'mir.transport', opener = true, onRefused = null, onInterface = null } = {}) {
  const doc = host.ownerDocument, view = doc.defaultView, body = doc.body;
  const life = new AbortController(), on = { signal: life.signal }, signal = life.signal;
  const S = store || localSeatStore(key);
  const rackOf = () => (typeof rack === 'function' ? rack() : rack) || null;
  const tempo = createTempo({ model, setBpm, mod, persist });
  const made = [], parts = [];

  const bar = root || doc.getElementById(id) || (() => { const n = el('div', '', host); n.id = id; made.push(n); return n; })();
  const stageHost = bar.parentElement || host;
  for (const c of ['mir-transport', 'glass', 'mini']) bar.classList.add(c);
  if (opener) bar.dataset.opener = ''; else delete bar.dataset.opener;
  bar.setAttribute('role', 'toolbar'); ariaLabel(bar, 'Transport');

  /* ── the parts the layout names, built once each ── */
  let panel = null, openBox = null, seatB = null, dockB = null;
  const one = (p) => { parts.push(p); return p.root; };
  const build = (name) => {
    if (name && name.nodeType === 1) return name;
    if (typeof name === 'string' && name.startsWith('app:')) return nodes[name.slice(4)] || null;
    switch (name) {
      case 'play': return one(playPart);
      case 'power': return one(modPower({ mod, signal }));
      case 'door': return one(modDoor({ mod, signal }));
      case 'tempo': return one(pillPart());
      case 'panel': return panelPart().root;
      case 'tap': return one(tapButton({ tempo, signal }));
      case 'rewind': return clock && typeof clock.seek === 'function'
        ? one(barButton({ cls: 'transport-home', svg: SVG_REWIND, label: 'Seek to the beginning', title: 'Seek to the beginning', run: () => { clock.seek(0); soon(); }, signal })) : null;
      case 'openers': openBox = el('div', 'tr-openers'); return openBox;
      case 'seat': seatB = tbtn('tr-seat'); setGlyph(seatB, 'grip', { label: 'Choose where the transport sits', size: 16 });
        seatB.title = 'Where the transport sits'; seatB.setAttribute('aria-haspopup', 'menu'); seatB.setAttribute('aria-expanded', 'false'); return seatB;
      case 'dock': if (!rackOf() && typeof rack !== 'function') return null;
        dockB = el('button', 'dock-btn'); dockB.type = 'button'; setGlyph(dockB, 'north', { label: 'Dock the transport into the rack' });
        dockB.title = 'Move the transport between the stage and the rack'; dockB.setAttribute('aria-pressed', 'false'); return dockB;
      case 'back': return null;                                     // the way back is always the bar's last child
      default: return null;
    }
  };
  const playPart = playButton({ clock, onRefused, signal });
  let pillP = null;
  function panelPart() { if (!panel) { panel = tempoPanel({ tempo, mod, signal }); parts.push(panel); panel.onToggle((v) => {   /* the bar keeps its width while the panel opens beneath its row (BASINS #transport.tempo-open) */
      if (v && !docked) bar.style.width = bar.getBoundingClientRect().width + 'px'; else bar.style.removeProperty('width');
      bar.classList.toggle('tempo-open', v); if (pillP) pillP.sync(); }); } return panel; }
  function pillPart() { if (!pillP) pillP = tempoPill({ tempo, panel: layoutNames(layout).includes('panel') ? panelPart() : null, signal }); return pillP; }
  const place = (list, parent) => {
    for (const item of list) {
      if (item && typeof item === 'object' && item.nodeType !== 1 && Array.isArray(item.items)) { const g = el('div', item.group || 'tr-group', parent); place(item.items, g); continue; }
      const n = build(item); if (n) parent.appendChild(n);
    }
  };
  bar.textContent = '';
  place(layout, bar);
  const back = wayBack({ run: () => { if (onInterface) onInterface(); else { const R = rackOf(); if (R && typeof R.setInterface === 'function') R.setInterface(true); else body.classList.remove('ui-hidden'); } }, signal });
  bar.appendChild(back.root);

  /* ── the latches, from data, redrawn only when the list changes ── */
  let latches = [], latchSig = '';
  function drawLatches() {
    if (!openBox) return;
    const rows = openerRows(typeof openers === 'function' ? openers() : openers);
    const sig = rows.map((o) => o.id + ':' + o.label + ':' + o.glyph + ':' + o.key).join('|');
    if (sig === latchSig) { latches.forEach((l, i) => { l.o = rows[i]; }); return; }
    latchSig = sig; for (const l of latches) l.p.destroy(); openBox.textContent = '';
    latches = rows.map((o) => { const holder = { o }; const proxy = { ...o, isOpen: () => isOpenOf(holder.o), open: () => holder.o.open(), close: holder.o.close && (() => holder.o.close()), toggle: holder.o.toggle && (() => holder.o.toggle()) };
      const p = latch(proxy, { signal }); p.root.addEventListener('click', () => soon(), on); openBox.appendChild(p.root); holder.p = p; return holder; });
    if (keys && typeof keys.hints === 'function') keys.hints(bar);
    rove(null);
  }

  /* ── the roving tab stop: one stop for the bar; ← → Home End walk it (the pill keeps ← → for the tempo: BASINS) ── */
  let current = null;
  const items = () => [...bar.querySelectorAll('button, input')].filter((n) => !n.hidden && n.getClientRects().length && !n.closest('.native-tempo') && !n.classList.contains('tr-back'));
  function rove(to) {
    const list = items(); if (!list.length) return;
    current = to && list.includes(to) ? to : (current && list.includes(current) ? current : list[0]);
    for (const n of list) n.tabIndex = n === current ? 0 : -1;
  }
  bar.addEventListener('focusin', (e) => { if (e.target !== current && items().includes(e.target)) rove(e.target); }, on);
  bar.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.target.tagName === 'INPUT') return;
    const list = items(), i = list.indexOf(e.target); if (i < 0) return;
    const rtl = view.getComputedStyle(bar).direction === 'rtl';
    const next = e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
    let to = -1;
    if (next) to = (i + next + list.length) % list.length; else if (e.key === 'Home') to = 0; else if (e.key === 'End') to = list.length - 1;
    if (to < 0) return;
    e.preventDefault(); rove(list[to]); list[to].focus({ preventScroll: true });
  }, on);

  /* ── the seats on the stage (BOTTOM, TOP, COMPACT: ruled 2026-10-01), remembered; the rack's dodge moves the bar ── */
  let seat = 'bottom', lastRect = null, docked = false;
  const menu = el('div', 'glass mb-list mir-transport-seats', host); menu.hidden = true; menu.setAttribute('role', 'menu'); made.push(menu);
  ariaLabel(menu, 'Where the transport sits');
  const seatItems = SEATS.map((s) => {
    const it = el('button', 'mb-item', menu); it.type = 'button'; it.dataset.seatChoice = s; it.setAttribute('role', 'menuitemradio');
    label(el('span', 'mb-lbl', it), SEAT_WORD[s]); it.title = SEAT_HINT[s];
    return it;
  });
  function seatMenu(show, at) {
    const want = !!show; if (want === !menu.hidden) return;
    if (seatB) seatB.setAttribute('aria-expanded', String(want));
    if (!want) { menu.hidden = true; return; }
    const R = rackOf();
    for (const it of seatItems) {
      const s = it.dataset.seatChoice, chosen = s === seat;
      it.classList.toggle('on', chosen); it.setAttribute('aria-checked', String(chosen));
      it.disabled = s === 'top' && !!R && typeof R.setHome !== 'function';    // a rack without setHome cannot keep a top seat
    }
    menu.hidden = false;
    const b = bar.getBoundingClientRect(), m = menu.getBoundingClientRect(), vw = view.innerWidth, vh = view.innerHeight;
    const x = Math.max(8, Math.min(vw - m.width - 8, (at ? at.x : b.left + b.width / 2) - m.width / 2));
    const y = menuSide(seat) === 'below' ? Math.min(vh - m.height - 8, b.bottom + 8) : Math.max(8, b.top - m.height - 8);
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
    (seatItems.find((it) => it.classList.contains('on')) || seatItems[0]).focus({ preventScroll: true });
  }
  function applySeat(s, { save = false } = {}) {
    seat = seatOf(s);
    setAttr(bar, 'data-home', homeOf(seat)); setAttr(bar, 'data-form', seat === 'compact' ? 'compact' : 'bar');
    const R = rackOf();
    if (R) { if (typeof R.setHome === 'function' && !docked) R.setHome(homeOf(seat)); }
    else setAttr(bar, 'data-seat', homeOf(seat));
    if (save) S.set({ v: 1, seat });
    rove(null);
    return seat;
  }
  if (seatB) seatB.addEventListener('click', (e) => { e.stopPropagation(); seatMenu(menu.hidden); }, on);
  menu.addEventListener('click', (e) => {
    const it = e.target.closest('[data-seat-choice]'); if (!it || it.disabled) return;
    e.stopPropagation(); applySeat(it.dataset.seatChoice, { save: true }); seatMenu(false); if (seatB) seatB.focus({ preventScroll: true });
  }, on);
  menu.addEventListener('keydown', (e) => {
    const list = seatItems.filter((it) => !it.disabled), i = list.indexOf(doc.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); seatMenu(false); if (seatB) seatB.focus({ preventScroll: true }); return; }
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (d) { e.preventDefault(); list[(i + d + list.length) % list.length].focus({ preventScroll: true }); }
  }, on);
  doc.addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target) && !(seatB && seatB.contains(e.target))) seatMenu(false); }, { capture: true, signal });
  bar.addEventListener('contextmenu', (e) => { if (e.target.tagName === 'INPUT') return; e.preventDefault(); seatMenu(true, { x: e.clientX }); }, on);
  let hold = null, swallow = false;
  const endHold = () => { if (hold) { view.clearTimeout(hold.timer); hold = null; } };
  bar.addEventListener('pointerdown', (e) => {
    endHold(); swallow = false;
    if (e.pointerType !== 'touch' || e.target.tagName === 'INPUT' || e.target.closest('.tempo-expand, .native-tempo')) return;
    hold = { id: e.pointerId, x: e.clientX, y: e.clientY, timer: view.setTimeout(() => { hold = null; swallow = true; seatMenu(true, { x: e.clientX }); }, TRANSPORT.longPress) };
  }, on);
  bar.addEventListener('pointermove', (e) => { if (hold && e.pointerId === hold.id && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > TRANSPORT.slop) endHold(); }, on);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bar.addEventListener(ev, endHold, on);
  bar.addEventListener('click', (e) => { if (swallow) { swallow = false; e.preventDefault(); e.stopPropagation(); } }, { capture: true, signal });

  /* ── docked: BASINS' dock chip moves the bar into a rack window named TRANSPORT and back ── */
  function setDocked(v) {
    docked = !!v;
    bar.classList.toggle('docked', docked); bar.classList.toggle('mini', !docked);
    if (dockB) { setAttr(dockB, 'aria-pressed', String(docked)); setGlyph(dockB, docked ? 'reopen' : 'north', { label: docked ? 'Undock the transport' : 'Dock the transport into the rack' }); }
    if (!docked) { if (bar.parentElement !== stageHost) stageHost.appendChild(bar); const R = rackOf(); if (R && typeof R.dodge === 'function') R.dodge(lastRect); }
    rove(null); soon();
  }
  function wireDock() {
    const R = rackOf(); if (!R || typeof R.register !== 'function') return;
    const d = dockOf(R);
    d.open = (api) => { api.body.appendChild(bar); setDocked(true); };
    d.close = () => setDocked(false);
    if (R.isOpen && R.isOpen(DOCK_ID)) { const api = R.window(DOCK_ID); if (api) d.open(api); }
  }
  if (dockB) dockB.addEventListener('click', () => { const R = rackOf(); if (!R) return; if (docked) R.close(DOCK_ID); else R.open(DOCK_ID, { index: 0 }); }, on);

  /** moved(rect | null) — a floating window reports where it is: the rack's dodge moves the bar (on the stage) */
  function moved(r) {
    lastRect = r || null;
    const R = rackOf(); if (R && typeof R.dodge === 'function' && !docked) R.dodge(lastRect);
    soon();
  }

  /* ── one paint ── */
  function sync() {
    if (signal.aborted) return;
    drawLatches();
    for (const p of parts) p.sync();
    for (const l of latches) l.p.sync();
  }
  const soon = () => frame.coalesce('mir.transport.sync', sync);
  view.addEventListener('click', soon, on);
  view.addEventListener('keyup', soon, on);
  doc.addEventListener('devopen', soon, on);
  doc.addEventListener('devclose', soon, on);
  const offs = [tempo.onChange(soon)];
  if (mod && typeof mod.onArm === 'function') offs.push(mod.onArm(soon));
  if (clock && typeof clock.onChange === 'function') offs.push(clock.onChange(soon));

  const savedSeat = (() => { try { const v = S.get(); return v && typeof v === 'object' ? v.seat : v; } catch { return null; } })();
  seat = seatOf(savedSeat);
  setAttr(bar, 'data-home', homeOf(seat)); setAttr(bar, 'data-form', seat === 'compact' ? 'compact' : 'bar');
  let started = false;
  const start = () => { if (started || signal.aborted) return; started = true; wireDock(); if (!docked) applySeat(seat); sync(); };
  queueMicrotask(start);
  sync(); rove(null);

  return {
    root: bar, layout, parts: { play: playPart, pill: pillP, panel },
    el: { play: playPart.root, power: bar.querySelector('.mir-mod-power'), door: bar.querySelector('.mod-exp'), pill: pillP && pillP.pill, field: pillP && pillP.field,
      panel: panel && panel.root, seat: seatB, dock: dockB, back: back.root, menu, openers: openBox },
    sync, refresh: soon, moved, toggle: () => playPart.toggle(),
    play: () => (clock && !clock.isPlaying() ? playPart.toggle() : null),
    pause: () => (clock && clock.isPlaying() ? playPart.toggle() : null),
    setBpm: (v) => { const b = tempo.set(v); tempo.commit(); return b; },
    get bpm() { return tempo.get(); },
    edit: () => pillP && pillP.edit(),
    setSeat: (s) => applySeat(s, { save: true }), get seat() { return seat; }, get docked() { return docked; },
    dock: (v = true) => { const R = rackOf(); if (!R) return; if (v && !docked) R.open(DOCK_ID, { index: 0 }); else if (!v && docked) R.close(DOCK_ID); },
    seatMenu: (show = true) => seatMenu(show),
    start,
    destroy() {
      if (signal.aborted) return;
      endHold(); life.abort(); for (const p of parts) if (p.destroy) p.destroy(); for (const l of latches) l.p.destroy();
      for (const off of offs) if (typeof off === 'function') off();
      const R = rackOf(); const d = R && docks.get(R); if (d) { d.open = null; d.close = null; }
      if (docked && bar.parentElement !== stageHost) stageHost.appendChild(bar);
      for (const n of made) n.remove();
      if (!made.includes(bar)) { bar.textContent = ''; bar.classList.remove('mir-transport', 'mini', 'docked', 'tempo-open'); for (const a of ['data-home', 'data-form']) bar.removeAttribute(a); delete bar.dataset.opener; }
    },
  };
}
