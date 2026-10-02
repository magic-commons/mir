/* shell/transport.js — the basic transport bar: the main opener.  Play, the MOD lamp, the BPM pill, TAP, and one
 * latch per main window.  It is the first thing a person sees and the thing they open everything else from.
 *
 * Harvested from BASINS (transport.js: the bar, play, the MOD lamp, the BPM pill with the digit-under-pointer drag;
 * tempo-editor.js: the typed tempo; transport-placement.js: the seats), checked against λWAVES (the dodge and the
 * peek, which the rack already owns: shell/rack.js `dodge`, `transport-peek`).  The DOM and the class names are
 * BASINS' (`#transport.mini`, `.native-play-row`, `.tbtn.play`, `.tbtn.modb`, `.tbtn.tempo-expand`, `.tempo-number`,
 * `.tempo-unit`, `.tempo-hz`, `.transport-tempo-input`), so an adopting app's own sheets keep matching.
 * docs/TRANSPORT.md is the manual.
 *
 * THE LAWS IT KEEPS
 *   1. THE MAIN OPENER.  An app calls createTransport({ opener: true }) first.  On a first run (firstRun(store):
 *      nothing saved) the app leaves every window closed, so the bar is the only thing on screen; every main window
 *      opens from one of its latches.  Under H (body.ui-hidden) on a touch screen the bar keeps one button, the way
 *      back, so hiding the interface never strands a finger.
 *   2. ONE DODGE: THE RACK'S.  A floating window reports its rect to `moved(rect)`, which hands it to `rack.dodge` (the
 *      sequence that waits on each animation, no timers).  The rack writes `data-seat`; this module writes it only
 *      when there is no rack.  The user's seat (BOTTOM, TOP, COMPACT) is remembered per browser through a store.
 *   3. THE BPM PILL (BASINS' law): drag up or down, the digit under the pointer chooses the step (tens, ones,
 *      tenths); the wheel steps by that digit; ↑ ↓ step by one (Shift: a tenth; PageUp/PageDown: ten); a double
 *      click, a double tap or Enter types it.  The resting pill is RAISED ("press me"); the field you type in is a
 *      WELL (docs/INTENT.md fact 4: BASINS' resting pill wore the inset and read as already pressed).
 *   4. LATCHES SAY THE TRUTH.  An opener is lit while its window is open, however it was closed (its own ×, Escape,
 *      the WINDOW menu): the bar re-reads every latch once, in the one frame, after any click or key on the page and
 *      on the rack's devopen/devclose.  No poller: idle costs nothing.
 *   5. KEYBOARD AND TOUCH ARE FIRST-CLASS.  One tab stop for the bar (a roving tabindex: ← → Home End walk it);
 *      Space plays through the app's key table when it passes one; targets are 32 px at least on a coarse pointer;
 *      a long press (or a right click) on the bar opens the seat menu.
 *   6. NO ENGLISH IN A LOOKUP.  Every word goes through label() / ariaLabel() / t(); things are found by class and
 *      data-attribute (`data-opener`, `data-seat-choice`), never by their words.
 *
 * createTransport(options) → api — see docs/TRANSPORT.md.  The pure helpers are exported for node tests. */
import { el, label, ariaLabel } from '../kit.js';
import { t, onLanguage } from '../core/i18n.js';
import { drag } from '../core/pointer.js';
import { frame } from '../core/frame.js';
import { setText, setAttr } from '../core/perf.js';
import { setGlyph, glyphEl, hasGlyph } from '../glyph.js';
import * as MOD from '../modulation/mod.js';

/** the numbers the bar keeps (BASINS transport.js measured the drag; the rack keeps the seats' heights) */
export const TRANSPORT = Object.freeze({
  pxPerStep: 9,        // a mouse drag: one step per 9 px (BASINS transport.js:66)
  touchPxPerStep: 14,  // a finger: one step per 14 px, always in ones (BASINS transport.js:69)
  slop: 4,             // the hand travels this far before a press on the pill becomes a drag
  longPress: 500,      // a finger holds the bar this long to open the seat menu
  doubleTap: 320,      // the kit's one double-tap interval (kit.js tapWatcher)
  bpmMin: 20, bpmMax: 300,   // used only when the model passed has no BPM_MIN / BPM_MAX
});
/** the seats a user may choose: bottom centre (the default), top centre, and the compact bar at the bottom */
export const SEATS = Object.freeze(['bottom', 'top', 'compact']);
const SEAT_WORD = { bottom: 'BOTTOM', top: 'TOP', compact: 'COMPACT' };
const SEAT_HINT = { bottom: 'the bar at the bottom centre', top: 'the bar at the top centre', compact: 'a small bar at the bottom: glyphs only' };
const PLAY_ACTION = 'transport.play';

/* ── the pure part ─────────────────────────────────────────────────────────────────────────────────────────── */
/** formatBpm(bpm) — one decimal under 100, whole above (BASINS) */
export const formatBpm = (bpm) => (Number.isFinite(bpm) ? bpm.toFixed(bpm < 100 ? 1 : 0) : '');
/** clampBpm(v, min, max) — inside the model's range, on the tenth */
export function clampBpm(v, min = TRANSPORT.bpmMin, max = TRANSPORT.bpmMax) {
  if (!Number.isFinite(v)) return null;
  return Math.round(Math.min(max, Math.max(min, v)) * 10) / 10;
}
/** digitStep(text, i) — the step the i-th character of the shown tempo stands for: 10 on the tens, 1 on the ones,
 *  0.1 on the tenths; the point, anything else and a place off the number step by one */
export function digitStep(text, i) {
  const s = String(text);
  if (!(i >= 0 && i < s.length) || !/\d/.test(s[i])) return 1;
  const p = s.indexOf('.') < 0 ? s.length : s.indexOf('.');
  return i < p ? 10 ** (p - 1 - i) : Math.round(10 ** -(i - p) * 1e6) / 1e6;
}
/** charAt(boxes, x) — which character box a pointer x falls in (−1: none).  boxes: [{ left, right }] */
export function charAt(boxes, x) {
  for (let i = 0; i < boxes.length; i++) if (x >= boxes[i].left && x <= boxes[i].right) return i;
  return -1;
}
/** dragBpm(start, rise, step, touch, range) — the tempo a vertical drag has reached: one step per pixel band, up is more */
export function dragBpm(start, rise, step = 1, touch = false, { min, max } = {}) {
  const n = Math.trunc(rise / (touch ? TRANSPORT.touchPxPerStep : TRANSPORT.pxPerStep));
  return clampBpm(start + n * (touch ? 1 : step), min, max);
}
/** keyStep(code, shift) — ↑ → PageUp are up, ↓ ← PageDown down; a page is ten, Shift a tenth.  0: not a tempo key */
export function keyStep(code, shift = false) {
  const dir = code === 'ArrowUp' || code === 'PageUp' ? 1 : code === 'ArrowDown' || code === 'PageDown' ? -1 : 0;
  if (!dir) return 0;
  return dir * (code.startsWith('Page') ? 10 : shift ? 0.1 : 1);
}
/** parseBpm(text) — a typed tempo (a comma is a decimal point); null if it is not a number */
export function parseBpm(text) {
  const v = Number.parseFloat(String(text ?? '').trim().replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}
/** seatOf(raw) — a stored seat, repaired: anything unknown is the default */
export const seatOf = (raw) => (SEATS.includes(raw) ? raw : 'bottom');
/** homeOf(seat) — the edge a seat rests on: the compact bar sits at the bottom */
export const homeOf = (seat) => (seat === 'top' ? 'top' : 'bottom');
/** seatRect(seat, { vw, vh, w, h, top, bottom }) — where a seat puts a bar of w × h, centred (the rack's numbers) */
export function seatRect(seat, { vw, vh, w, h, top = 52, bottom = 60 }) {
  const left = (vw - w) / 2, y = homeOf(seat) === 'top' ? top : vh - bottom - h;
  return { left, right: left + w, top: y, bottom: y + h, width: w, height: h };
}
/** menuSide(seat) — the seat menu opens away from the edge the bar rests on */
export const menuSide = (seat) => (homeOf(seat) === 'top' ? 'below' : 'above');

/** firstRun(...stores) — true when nothing is saved in any of them: the app leaves its windows closed and the bar is
 *  the only thing on screen.  A store is `{ get() }` or a localStorage key.  A store that throws counts as empty. */
export function firstRun(...stores) {
  for (const s of stores.flat()) {
    let v = null;
    try { v = typeof s === 'string' ? globalThis.localStorage.getItem(s) : s && typeof s.get === 'function' ? s.get() : null; } catch { v = null; }
    if (v !== null && v !== undefined && v !== '') return false;
  }
  return true;
}
/** localSeatStore(key) — the default seat store over localStorage; a private window simply forgets */
export function localSeatStore(key = 'mir.transport') {
  return {
    get() { try { const raw = globalThis.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } },
    set(v) { try { globalThis.localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } },
  };
}

/** menuRow(row) — a WINDOW-menu row ([label, run, disabled, hint], shell/menubar.js) read back as { label, key, hint }.
 *  The rack's rows start with a state mark ('↑  ', '⊕  '); the key follows a tab. */
export function menuRow(row) {
  if (!Array.isArray(row) || typeof row[0] !== 'string') return null;
  const [name, key = ''] = row[0].replace(/^[↑⊕]\s+/u, '').split('\t');
  return { label: name.trim(), key: key.trim(), hint: typeof row[3] === 'string' ? row[3] : '' };
}
/** openerRows(list) — the openers repaired: each needs an id, a label and a way to open; ids are kept once */
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
/** isOpenOf(o) — a window's open state, read whether it is a function (window.js) or a getter (installModulation) */
export function isOpenOf(o) {
  if (!o) return false;
  try { return typeof o.isOpen === 'function' ? !!o.isOpen() : !!o.isOpen; } catch { return false; }
}
/** toggleOf(o) — press a latch: toggle if the window has one, else close an open one or open a closed one */
export function toggleOf(o) {
  if (typeof o.toggle === 'function') return o.toggle();
  if (isOpenOf(o) && typeof o.close === 'function') return o.close();
  return o.open();
}
/** rackOpeners(rack, { only, glyphs }) — the rack's registered windows as openers, so an app describes its windows
 *  once.  Reads `rack.spec(id)` when the rack has it, else the WINDOW menu's rows (one per registered window, in
 *  order).  Returns a function: it is read again whenever the bar redraws, so windows registered later appear. */
export function rackOpeners(rack, { only = null, glyphs = {} } = {}) {
  return () => {
    const ids = rack.registered || [], menu = typeof rack.windowMenu === 'function' ? rack.windowMenu() : [];
    return ids.map((id, i) => {
      const spec = typeof rack.spec === 'function' ? rack.spec(id) : null, m = menuRow(menu[i]) || {};
      return { id, label: (spec && spec.title) || m.label || id.toUpperCase(), key: (spec && spec.key) || m.key || '',
        glyph: glyphs[id] || (spec && spec.glyph) || '', hint: (spec && spec.hint) || '',
        open: () => rack.raise(id), close: () => rack.close(id), isOpen: () => rack.isOpen(id) };
    }).filter((o) => !only || only.includes(o.id));
  };
}
/** transportActions(get) — the bar's rows for the app's key table (shell/keys.js): Space plays.  `get()` returns the
 *  transport (it may be made after the table). */
export function transportActions(get) {
  return [{ id: PLAY_ACTION, label: 'PLAY / PAUSE', group: 'TRANSPORT', keys: ['Space'], hint: 'play or pause the clock',
    run: () => { const tr = get(); if (tr) tr.toggle(); } }];
}

/* ── the bar ───────────────────────────────────────────────────────────────────────────────────────────────── */
/** createTransport({ host, root, id, clock, mod, model, setBpm, persist, openers, rack, keys, store, key, opener,
 *                    onRefused, onInterface }) → api
 *    host        where the bar and its seat menu are appended (default document.body)
 *    root        an existing element to adopt (BASINS' #transport); else the element with `id`, else a new one
 *    clock       { play(), pause(), isPlaying(), toggle?(), onChange?(fn) → off }; default mod.host.clock
 *    mod         the modulation seam (installModulation's result): armed(), onArm(fn), toggle(), isOpen
 *    model       the transport model (mir/modulation/mod.js by default): transport.bpm, setTransport, tapTempo, BPM_*
 *    setBpm      (bpm) → how a tempo is written; default the modulation clock's setBpm, else model.setTransport
 *    persist     () after a tempo is committed (a drag let go, a wheel step, a key, a typed value, a tap)
 *    openers     [{ id, label, glyph, key?, action?, hint?, open(), close?(), toggle?(), isOpen }] or () => that list
 *    rack        the rack (or () => the rack, when the rack is made after the bar)
 *    keys        the app's key table (shell/keys.js); include transportActions(() => tr) in it for Space
 *    store       { get(), set(v) } for the seat; default localStorage under `key`
 *    opener      true (default): this bar is the main opener, and the way back under H on a touch screen
 *    onRefused   (result) when the clock refuses to play (the modulation clock with nothing to run)
 *    onInterface () the way back under H; default rack.setInterface(true) */
export function createTransport({ host = globalThis.document && document.body, root = null, id = 'transport', clock = null, mod = null,
  model = MOD, setBpm = null, persist = null, openers = [], rack = null, keys = null, store = null, key = 'mir.transport',
  opener = true, onRefused = null, onInterface = null } = {}) {
  const doc = host.ownerDocument, view = doc.defaultView, body = doc.body;
  const life = new AbortController(), on = { signal: life.signal };
  const S = store || localSeatStore(key);
  const rackOf = () => (typeof rack === 'function' ? rack() : rack) || null;
  const C = clock || (mod && mod.host && mod.host.clock) || null;
  const min = Number.isFinite(model.BPM_MIN) ? model.BPM_MIN : TRANSPORT.bpmMin, max = Number.isFinite(model.BPM_MAX) ? model.BPM_MAX : TRANSPORT.bpmMax;
  const bpmNow = () => (model.transport && Number.isFinite(model.transport.bpm) ? model.transport.bpm : model.BPM_DEFAULT);
  const made = [];

  /* ── the DOM (BASINS' names) ── */
  const bar = root || doc.getElementById(id) || (() => { const n = el('div', '', host); n.id = id; made.push(n); return n; })();
  for (const c of ['mir-transport', 'glass', 'mini']) bar.classList.add(c);
  if (opener) bar.dataset.opener = ''; else delete bar.dataset.opener;
  bar.setAttribute('role', 'toolbar'); ariaLabel(bar, 'Transport');
  const row = el('div', 'native-play-row', bar);
  const btn = (cls, parent = row) => { const b = el('button', 'tbtn ' + cls, parent); b.type = 'button'; b.tabIndex = -1; return b; };

  const play = btn('play');
  play.dataset.keyAction = PLAY_ACTION; play.title = 'Play or pause'; play.setAttribute('aria-pressed', 'false');
  setGlyph(play, 'play', { label: 'Play or pause', size: 20 });
  if (!C) play.hidden = true;

  const lamp = btn('modb mir-transport-lamp');
  label(el('span', 'tr-word', lamp), 'MOD'); el('span', 'tr-led', lamp).setAttribute('aria-hidden', 'true');
  ariaLabel(lamp, 'The modulation window'); lamp.title = 'The modulation window: lit while modulation is armed';
  lamp.setAttribute('aria-expanded', 'false');
  if (!mod) lamp.hidden = true;

  const pill = btn('tempo-expand');
  pill.setAttribute('role', 'spinbutton'); pill.setAttribute('aria-valuemin', String(min)); pill.setAttribute('aria-valuemax', String(max));
  pill.title = 'Tempo: drag up or down (the digit under the pointer is the step), the wheel, ↑ ↓; double-click or Enter to type it';
  const num = el('b', 'tempo-number', pill), unit = el('span', 'tempo-unit', pill), hz = el('i', 'tempo-hz', pill);
  label(unit, 'BPM'); num.dir = 'ltr'; hz.dir = 'ltr';
  const field = el('input', 'modtempoin transport-tempo-input tempo-field', row);
  field.type = 'text'; field.inputMode = 'decimal'; field.maxLength = 8; field.spellcheck = false; field.hidden = true; field.dir = 'ltr';
  ariaLabel(field, 'Type the tempo in BPM');
  const tap = btn('tap');
  label(el('span', 'tr-word', tap), 'TAP'); tap.title = 'Tap the tempo: four taps set it';

  const sep = el('span', 'tr-sep', row); sep.setAttribute('aria-hidden', 'true');
  const opensBox = el('div', 'tr-openers', row);
  const seatBtn = btn('tr-seat');
  setGlyph(seatBtn, 'grip', { label: 'Choose where the transport sits', size: 16 });
  seatBtn.title = 'Where the transport sits'; seatBtn.setAttribute('aria-haspopup', 'menu'); seatBtn.setAttribute('aria-expanded', 'false');

  const back = el('button', 'tr-back', bar); back.type = 'button';
  setGlyph(back, 'expand', { label: 'Show the interface', size: 18 }); back.title = 'Show the interface';

  const menu = el('div', 'glass mb-list mir-transport-seats', host); menu.hidden = true; menu.setAttribute('role', 'menu'); made.push(menu);
  ariaLabel(menu, 'Where the transport sits');
  const seatItems = SEATS.map((s) => {
    const it = el('button', 'mb-item', menu); it.type = 'button'; it.dataset.seatChoice = s; it.setAttribute('role', 'menuitemradio');
    label(el('span', 'mb-lbl', it), SEAT_WORD[s]); it.title = SEAT_HINT[s];
    return it;
  });

  /* ── the tempo ── */
  const writeBpm = (v) => {
    const b = clampBpm(v, min, max); if (b === null) return bpmNow();
    if (setBpm) setBpm(b);
    else if (mod && mod.host && mod.host.clock && typeof mod.host.clock.setBpm === 'function') mod.host.clock.setBpm(b);
    else if (typeof model.setTransport === 'function') model.setTransport({ bpm: b });
    sync(); return bpmNow();
  };
  const commit = () => { if (persist) persist(); else if (mod && typeof mod.persist === 'function') mod.persist(); };
  /* the step under a pointer x: one Range box per character of the number (a read, on the gesture's own event) */
  function stepAt(x) {
    const n = num.firstChild; if (!n || n.nodeType !== 3) return 1;
    const s = n.textContent, r = doc.createRange(), boxes = [];
    for (let i = 0; i < s.length; i++) { r.setStart(n, i); r.setEnd(n, i + 1); const b = r.getBoundingClientRect(); boxes.push({ left: b.left, right: b.right }); }
    return digitStep(s, charAt(boxes, x));
  }
  let dragged = false, g0 = null;
  const pillDrag = drag(pill, { slop: TRANSPORT.slop,
    onStart: (s) => { const touch = s.pointerType === 'touch'; g0 = { bpm: bpmNow(), touch, step: touch ? 1 : stepAt(s.x0) }; pill.classList.add('drag'); },
    onMove: (s) => { if (g0) writeBpm(dragBpm(g0.bpm, -s.dy, g0.step, g0.touch, { min, max })); },
    onEnd: () => { if (!g0) return; g0 = null; dragged = true; pill.classList.remove('drag'); commit(); },
    onCancel: () => { if (!g0) return; const b = g0.bpm; g0 = null; pill.classList.remove('drag'); writeBpm(b); } });
  pill.addEventListener('pointerdown', () => { dragged = false; }, on);
  let lastTap = 0;
  pill.addEventListener('click', (e) => {
    if (dragged) { dragged = false; return; }
    const now = e.timeStamp || view.performance.now();
    if (now - lastTap < TRANSPORT.doubleTap) { lastTap = 0; edit(); } else lastTap = now;
  }, on);
  pill.addEventListener('wheel', (e) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : e.deltaY > 0 ? -1 : 0; if (!dir) return;
    writeBpm(bpmNow() + dir * stepAt(e.clientX)); frame.coalesce('mir.transport.persist', commit);
  }, { passive: false, signal: life.signal });
  pill.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); edit(); return; }
    const k = keyStep(e.code, e.shiftKey); if (!k) return;
    e.preventDefault(); writeBpm(bpmNow() + k); commit();
  }, on);

  /* typing: the pill gives its seat to a well of the same size; Enter or leaving takes the value, Escape does not */
  let editing = false;
  function edit() {
    if (editing) return; editing = true;
    const r = pill.getBoundingClientRect();
    field.style.width = r.width + 'px'; field.style.height = r.height + 'px';
    field.value = formatBpm(bpmNow()); pill.hidden = true; field.hidden = false; rove(field);
    field.focus({ preventScroll: true }); field.select();
  }
  function closeEdit(take, refocus) {
    if (!editing) return; editing = false;
    if (take) { const v = parseBpm(field.value); if (v !== null) { writeBpm(v); commit(); } }
    field.hidden = true; pill.hidden = false; rove(pill);
    if (refocus) pill.focus({ preventScroll: true });
    sync();
  }
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeEdit(e.key === 'Enter', true); }
  }, on);
  field.addEventListener('blur', () => closeEdit(true, false), on);

  let taps = [];
  tap.addEventListener('click', () => {
    const r = (model.tapTempo || MOD.tapTempo)(taps, view.performance.now()); taps = r.taps;
    if (r.bpm) { writeBpm(r.bpm); commit(); }
    tap.classList.add('beat'); frame.coalesce('mir.transport.tap', () => tap.classList.remove('beat'));
  }, on);

  /* ── play and the lamp ── */
  function toggle() {
    if (!C) return null;
    const r = C.isPlaying() ? C.pause() : (typeof C.play === 'function' ? C.play() : C.toggle());
    if (r && r.ok === false && onRefused) onRefused(r);
    sync(); return r;
  }
  play.addEventListener('click', () => toggle(), on);
  lamp.addEventListener('click', () => { if (mod) { mod.toggle(); soon(); } }, on);

  /* ── the openers ── */
  let rows = [], rowSig = '';
  const openerList = () => openerRows(typeof openers === 'function' ? openers() : openers);
  function drawOpeners() {
    rows = openerList();
    const sig = rows.map((o) => o.id + ':' + o.label + ':' + o.glyph + ':' + o.key).join('|');
    if (sig === rowSig) return;
    rowSig = sig; opensBox.textContent = '';
    for (const o of rows) {
      const b = btn('tr-open', opensBox); b.dataset.opener = o.id; b.setAttribute('aria-pressed', 'false');
      if (o.glyph && hasGlyph(o.glyph)) { const g = glyphEl(o.glyph, 'tr-gly', 16); if (g) b.appendChild(g); b.classList.add('has-glyph'); }
      label(el('span', 'tr-word', b), o.label);
      b.title = o.hint || o.label;
      if (o.action) b.dataset.keyAction = o.action; else if (o.key) b.dataset.keyHint = o.key;
    }
    sep.hidden = !rows.length;
    if (keys && typeof keys.hints === 'function') keys.hints(bar);
    rove(current && current.isConnected && !current.hidden ? current : null);
  }
  opensBox.addEventListener('click', (e) => {
    const b = e.target.closest('.tr-open'); if (!b) return;
    const o = rows.find((x) => x.id === b.dataset.opener); if (!o) return;
    toggleOf(o); soon();
  }, on);

  /* ── the roving tab stop: the bar is one stop; ← → Home End walk it (mirrored right to left) ── */
  let current = null;
  const items = () => [...bar.querySelectorAll('.native-play-row button, .native-play-row input')].filter((n) => !n.hidden && n.getClientRects().length);
  function rove(to) {
    const list = items(); if (!list.length) return;
    current = to && list.includes(to) ? to : (current && list.includes(current) ? current : list[0]);
    for (const n of list) n.tabIndex = n === current ? 0 : -1;
  }
  row.addEventListener('focusin', (e) => { if (e.target !== current && items().includes(e.target)) rove(e.target); }, on);
  row.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.target === field || e.altKey || e.ctrlKey || e.metaKey) return;
    const list = items(), i = list.indexOf(e.target); if (i < 0) return;
    const rtl = view.getComputedStyle(bar).direction === 'rtl';
    const next = e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
    let to = -1;
    if (next) to = (i + next + list.length) % list.length; else if (e.key === 'Home') to = 0; else if (e.key === 'End') to = list.length - 1;
    if (to < 0) return;
    e.preventDefault(); rove(list[to]); list[to].focus({ preventScroll: true });
  }, on);

  /* ── the seat: the user's choice, remembered; the rack moves the bar out of a floating window's way ── */
  let seat = 'bottom', lastRect = null;
  function seatMenu(show, at) {
    const want = !!show; if (want === !menu.hidden) return;
    seatBtn.setAttribute('aria-expanded', String(want));
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
    const first = seatItems.find((it) => it.classList.contains('on')) || seatItems[0];
    first.focus({ preventScroll: true });
  }
  function applySeat(s, { save = false } = {}) {
    seat = seatOf(s);
    setAttr(bar, 'data-home', homeOf(seat)); setAttr(bar, 'data-form', seat === 'compact' ? 'compact' : 'bar');
    const R = rackOf();
    if (R) { if (typeof R.setHome === 'function') R.setHome(homeOf(seat)); }
    else setAttr(bar, 'data-seat', homeOf(seat));                    // no rack: the bar is its own seat's only writer
    if (save) S.set({ v: 1, seat });
    rove(null);
    return seat;
  }
  seatBtn.addEventListener('click', (e) => { e.stopPropagation(); seatMenu(menu.hidden); }, on);
  menu.addEventListener('click', (e) => {
    const it = e.target.closest('[data-seat-choice]'); if (!it || it.disabled) return;
    e.stopPropagation(); applySeat(it.dataset.seatChoice, { save: true }); seatMenu(false); seatBtn.focus({ preventScroll: true });
  }, on);
  menu.addEventListener('keydown', (e) => {
    const list = seatItems.filter((it) => !it.disabled), i = list.indexOf(doc.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); seatMenu(false); seatBtn.focus({ preventScroll: true }); return; }
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (d) { e.preventDefault(); list[(i + d + list.length) % list.length].focus({ preventScroll: true }); }
  }, on);
  doc.addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target) && !seatBtn.contains(e.target)) seatMenu(false); }, { capture: true, signal: life.signal });
  /* a right click, or a finger held still on the bar, opens the seat menu (the pill keeps its drag, the field its text) */
  bar.addEventListener('contextmenu', (e) => {
    if (e.target === field) return;
    e.preventDefault(); seatMenu(true, { x: e.clientX });
  }, on);
  let hold = null, swallow = false;
  const endHold = () => { if (hold) { view.clearTimeout(hold.timer); hold = null; } };
  bar.addEventListener('pointerdown', (e) => {
    endHold(); swallow = false;
    if (e.pointerType !== 'touch' || e.target === field || pill.contains(e.target)) return;
    hold = { id: e.pointerId, x: e.clientX, y: e.clientY, timer: view.setTimeout(() => { hold = null; swallow = true; seatMenu(true, { x: e.clientX }); }, TRANSPORT.longPress) };
  }, on);
  bar.addEventListener('pointermove', (e) => { if (hold && e.pointerId === hold.id && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > TRANSPORT.slop) endHold(); }, on);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bar.addEventListener(ev, endHold, on);
  bar.addEventListener('click', (e) => { if (swallow) { swallow = false; e.preventDefault(); e.stopPropagation(); } }, { capture: true, signal: life.signal });

  /** moved(rect | null) — a floating window reports where it is: the rack's dodge moves the bar; the latches re-read */
  function moved(r) {
    lastRect = r || null;
    const R = rackOf(); if (R && typeof R.dodge === 'function') R.dodge(lastRect);
    soon();
  }

  /* the way back under H: on a touch screen this button is all that is left of the bar (transport.css) */
  back.addEventListener('click', () => {
    if (onInterface) onInterface();
    else { const R = rackOf(); if (R && typeof R.setInterface === 'function') R.setInterface(true); else body.classList.remove('ui-hidden'); }
  }, on);

  /* ── one paint: every word, lamp and latch, written only where it changed ── */
  let shownPlay = null, shownBpm = '';
  function sync() {
    if (life.signal.aborted) return;
    const bpm = bpmNow(), n = formatBpm(bpm);
    setText(num, n); setText(hz, (bpm / 60).toFixed(2) + ' Hz');
    setAttr(pill, 'aria-valuenow', n);
    if (shownBpm !== n) { shownBpm = n; ariaLabel(pill, '{bpm} beats per minute', { bpm: n }); }
    if (C) {
      const p = !!C.isPlaying();
      if (p !== shownPlay) { shownPlay = p; setGlyph(play, p ? 'pause' : 'play', { label: 'Play or pause', size: 20 }); }
      play.classList.toggle('on', p); setAttr(play, 'aria-pressed', String(p));
    }
    if (mod) {
      const armed = typeof mod.armed === 'function' ? !!mod.armed() : true;
      lamp.classList.toggle('on', armed); setAttr(lamp, 'data-armed', String(armed)); setAttr(lamp, 'aria-expanded', String(isOpenOf(mod)));
    }
    drawOpeners();
    for (const b of opensBox.children) {
      const o = rows.find((x) => x.id === b.dataset.opener), open = isOpenOf(o);
      b.classList.toggle('on', open); setAttr(b, 'aria-pressed', String(open));
    }
  }
  const soon = () => frame.coalesce('mir.transport.sync', sync);

  /* what can change a latch or a lamp without telling the bar: a press or a key anywhere, a rack window opening or
     closing, the modulation arm, the clock, the language.  Each books ONE paint in the next frame; nothing polls. */
  view.addEventListener('click', soon, on);
  view.addEventListener('keyup', soon, on);
  doc.addEventListener('devopen', soon, on);
  doc.addEventListener('devclose', soon, on);
  const offs = [];
  if (mod && typeof mod.onArm === 'function') offs.push(mod.onArm(soon));
  if (C && typeof C.onChange === 'function') offs.push(C.onChange(soon));
  offs.push(onLanguage(() => { shownBpm = ''; soon(); }));

  /* the seat: read once; applied after the task that made the bar, so a rack made right after it is there */
  const savedSeat = (() => { try { const v = S.get(); return v && typeof v === 'object' ? v.seat : v; } catch { return null; } })();
  seat = seatOf(savedSeat);
  setAttr(bar, 'data-home', homeOf(seat)); setAttr(bar, 'data-form', seat === 'compact' ? 'compact' : 'bar');
  let started = false;
  const start = () => { if (started || life.signal.aborted) return; started = true; applySeat(seat); sync(); };
  queueMicrotask(start);
  sync();
  rove(null);

  const api = {
    root: bar, el: { play, lamp, pill, field, tap, seat: seatBtn, back, menu, openers: opensBox },
    sync, refresh: soon, moved, toggle,
    play: () => (C && !C.isPlaying() ? toggle() : null),
    pause: () => (C && C.isPlaying() ? toggle() : null),
    setBpm: (v) => { const b = writeBpm(v); commit(); return b; },
    get bpm() { return bpmNow(); },
    edit, tap: () => tap.click(),
    setSeat: (s) => applySeat(s, { save: true }),
    get seat() { return seat; },
    seatMenu: (show = true) => seatMenu(show),
    start,
    destroy() {
      if (life.signal.aborted) return;
      endHold(); pillDrag.destroy(); life.abort(); for (const off of offs) if (typeof off === 'function') off();
      for (const n of made) n.remove();
      if (!made.includes(bar)) { row.remove(); back.remove(); bar.classList.remove('mir-transport', 'mini'); bar.removeAttribute('data-home'); bar.removeAttribute('data-form'); delete bar.dataset.opener; }
    },
  };
  return api;
}
