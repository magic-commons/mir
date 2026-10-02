/* MIR · shell/settings-rows.js — A SETTINGS PANEL FROM DATA, and the two fields the kit did not have (select, number).
 *
 * Harvested from NEBULA-REDUX lab/main.js:113-161: `control()` builds each control from the engine's parameter
 * description, and `bindWidget()` keeps THE EDIT-OWNERSHIP LAW — a control under the hand is begun (instrument.begin)
 * on the first press or arrow key and ended on release, and `sync()` skips every control being edited, so a sync never
 * repaints a control under the hand.  AUTOMATA, POLAR and EARTH hand-built their SETTINGS three different ways, EARTH
 * with a raw `<select>` (main.js:365) and AUTOMATA with a `seg` standing in for one (main.js:725); NEBULA styled its
 * select with a cssText string (main.js:263-267) because the kit had none.
 *
 * THE LAWS IT KEEPS
 *   · A ROW IS DATA: { id, label, hint, control, get, set, options, min, max, step, log, fmt, when, begin, end }.
 *     `control` is 'sw' | 'seg' | 'fader' | 'knob' | 'select' | 'number'.  The control is the kit's own (mir/kit.js), so it
 *     wears the current skin; select and number are built here with the kit's field look (a field you type in is a
 *     WELL: `select.sel` from skin.css, `.mir-num` from parts.css).  `hint` is the control's title (the hint hop
 *     translates it).  `when()` decides whether the row shows; it is asked again on every sync().
 *   · BEGIN / END EDIT.  On a fader or knob a press or an edit key begins its edit (row.begin, opts.onBegin); release,
 *     key up or focus leaving ends it (row.end, opts.onEnd) — a drag is one undo step, not sixty.  The panel ends every
 *     open edit when the pointer is released anywhere, as NEBULA does.  A switch, a segment or a select change is one
 *     whole edit (begin, set, end); a number field is held from focus to blur.
 *   · SYNC SKIPS WHAT IS HELD.  sync() reads every row's get() and repaints only controls that are not being edited and
 *     whose value changed.  A number field is held while it has the focus.
 *   · ENGLISH IN: labels and option labels go through `label()`.
 *
 * settingsRows(host, rows, { onBegin, onEnd, onChange }) → { root, sync(), control(id), editing(id), beginEdit(id), endEdit(id), destroy() }
 * selectField({ label, options: [{ id, label, disabled }], value, onChange, aria, title }) → { root, get, set, setDisabled, input }
 * numberField({ label, value, min, max, step, onChange, aria, title, fmt }) → { root, get, set, setDisabled, input } */
import { el, label as setLabel, ariaLabel, sw, seg, fader, knob } from '../kit.js';

/* ── the two fields (to move into kit.js later) ────────────────────────────────────────────────────────── */
export function selectField(o = {}) {
  const root = el('label', 'mir-field mir-field-select');
  if (o.label) setLabel(el('span', 'k-lbl', root), o.label);
  const input = el('select', 'sel', root);
  if (o.aria || o.label) ariaLabel(input, o.aria || o.label);
  if (o.title) root.title = o.title;
  for (const opt of o.options || []) {
    const op = el('option', '', input); setLabel(op, opt.label === undefined ? String(opt.id) : opt.label);
    op.value = String(opt.id); if (opt.disabled) op.disabled = true;
  }
  const ids = (o.options || []).map((x) => x.id);
  const toId = (s) => { const i = ids.findIndex((x) => String(x) === s); return i < 0 ? s : ids[i]; };
  if (o.value !== undefined) input.value = String(o.value);
  input.addEventListener('change', () => { if (o.onChange) o.onChange(toId(input.value)); });
  return { root, input, get: () => toId(input.value), set(v) { const s = String(v); if (input.value !== s) input.value = s; }, setDisabled(on) { input.disabled = !!on; } };
}

export function numberField(o = {}) {
  const root = el('label', 'mir-field mir-field-number');
  if (o.label) setLabel(el('span', 'k-lbl', root), o.label);
  const input = el('input', 'mir-num', root);
  input.type = 'number'; input.inputMode = 'decimal';
  if (o.min !== undefined && o.min !== null) input.min = String(o.min);
  if (o.max !== undefined && o.max !== null) input.max = String(o.max);
  input.step = o.step ? String(o.step) : 'any';
  if (o.aria || o.label) ariaLabel(input, o.aria || o.label);
  if (o.title) root.title = o.title;
  const clamp = (v) => { let x = Number(v); if (!Number.isFinite(x)) return null; if (o.min != null) x = Math.max(o.min, x); if (o.max != null) x = Math.min(o.max, x); return x; };
  const show = (v) => (o.fmt ? o.fmt(v) : String(v));
  let v = clamp(o.value) ?? 0; input.value = show(v);
  input.addEventListener('change', () => { const x = clamp(input.value); if (x === null) { input.value = show(v); return; } v = x; input.value = show(v); if (o.onChange) o.onChange(v); });
  return { root, input, get: () => v, set(x) { const c = clamp(x); if (c === null) return; v = c; if (document.activeElement !== input) input.value = show(v); }, setDisabled(on) { input.disabled = !!on; } };
}

/* ── the panel ─────────────────────────────────────────────────────────────────────────────────────────── */
const EDIT_KEYS = /^(Arrow|Home|End|Page|Delete|Backspace)/;

export function settingsRows(host, rows, { onBegin, onEnd, onChange } = {}) {
  const life = new AbortController(), on = { signal: life.signal };
  const root = el('div', 'mir-settings', host);
  const seats = new Map(), held = new Set();

  function beginEdit(id) {
    if (held.has(id)) return; const s = seats.get(id); if (!s) return;
    held.add(id); s.root.dataset.editing = '';
    if (s.row.begin) s.row.begin(); if (onBegin) onBegin(id);
  }
  function endEdit(id) {
    if (!held.has(id)) return; const s = seats.get(id);
    held.delete(id); if (s) delete s.root.dataset.editing;
    if (s && s.row.end) s.row.end(); if (onEnd) onEnd(id);
    if (s) { s.last = read(s.row); }                                    // what the hand left is what is shown
  }
  const read = (row) => { try { return row.get ? row.get() : undefined; } catch (_) { return undefined; } };
  const write = (row, v) => { if (row.set) row.set(v); if (onChange) onChange(row.id, v); };
  const commit = (row, v) => { beginEdit(row.id); write(row, v); endEdit(row.id); };   // a discrete change is one whole edit

  for (const row of rows) {
    const seat = el('div', 'mir-set-row', root); seat.dataset.id = row.id;
    const v0 = read(row);
    let w;
    switch (row.control) {
      case 'sw': w = sw({ label: row.label, value: !!v0, title: row.hint, onChange: (v) => commit(row, v) }); break;
      case 'seg': w = seg({ label: row.label, value: v0, options: row.options || [], onChange: (v) => commit(row, v) });
        if (row.hint) w.root.title = row.hint; break;
      case 'fader': w = fader({ label: row.label, min: row.min ?? 0, max: row.max ?? 1, value: v0 ?? row.min ?? 0, log: row.log, fmt: row.fmt,
        onInput: (v) => write(row, v) });
        if (row.hint) w.root.title = row.hint; break;
      case 'knob': w = knob({ label: row.label, min: row.min ?? 0, max: row.max ?? 1, value: v0 ?? row.min ?? 0, log: row.log, step: row.step, wrap: row.wrap, fmt: row.fmt,
        title: row.hint, onInput: (v) => write(row, v) }); break;
      case 'select': w = selectField({ label: row.label, options: row.options || [], value: v0, title: row.hint, onChange: (v) => commit(row, v) }); break;
      case 'number': w = numberField({ label: row.label, value: v0, min: row.min, max: row.max, step: row.step, fmt: row.fmt, title: row.hint, onChange: (v) => write(row, v) }); break;
      default: throw new TypeError(`settingsRows: row ${row.id} has an unknown control ${JSON.stringify(row.control)}`);
    }
    seat.appendChild(w.root);
    const s = { row, w, root: seat, last: v0 };
    seats.set(row.id, s);
    /* the ownership law (NEBULA bindWidget): begun by a press or an edit key, ended by release, key up or focus out */
    if (row.control === 'number') {
      w.input.addEventListener('focus', () => beginEdit(row.id), on);
      w.input.addEventListener('blur', () => endEdit(row.id), on);
    } else if (row.control === 'fader' || row.control === 'knob') {
      w.root.addEventListener('pointerdown', () => beginEdit(row.id), { capture: true, signal: life.signal });
      w.root.addEventListener('keydown', (e) => { if (EDIT_KEYS.test(e.key)) beginEdit(row.id); }, { capture: true, signal: life.signal });
      w.root.addEventListener('keyup', () => endEdit(row.id), on);
      w.root.addEventListener('focusout', (e) => { if (!w.root.contains(e.relatedTarget)) endEdit(row.id); }, on);
    }
  }
  /* a release anywhere ends the edits a pointer began (a drag that leaves the control still ends) */
  for (const type of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(type, () => { for (const id of [...held]) { const s = seats.get(id); if (!(s && s.row.control === 'number' && document.activeElement === s.w.input)) endEdit(id); } }, on);

  function sync() {
    for (const s of seats.values()) {
      const show = typeof s.row.when === 'function' ? !!s.row.when() : true;
      if (s.root.hidden === show) s.root.hidden = !show;
      if (held.has(s.row.id)) continue;                                   // never under the hand
      const v = read(s.row);
      if (v === s.last || (typeof v === 'number' && typeof s.last === 'number' && Math.abs(v - s.last) < 1e-12)) continue;
      s.last = v;
      if (s.row.control === 'knob') s.w.set(v, true); else s.w.set(v);
    }
  }
  sync();
  return {
    root, sync, beginEdit, endEdit,
    control: (id) => seats.get(id)?.w || null,
    editing: (id) => (id === undefined ? [...held] : held.has(id)),
    destroy() { life.abort(); for (const id of [...held]) endEdit(id); root.remove(); seats.clear(); }
  };
}
