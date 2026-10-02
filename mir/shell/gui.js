/* MIR · shell/gui.js — the GUI window: MIR OPTIONS and MIR ABOUT, two pages behind one page turner.
 *
 * WHAT IT IS.  The menubar's GUI entry opens a floating kit window (mir/window/window.js) with two pages.  MIR OPTIONS
 * holds every LOOK option an app on the kit has, in eight groups; MIR ABOUT says what MIR is.  The look is a browser
 * preference (core/prefs.js, one key, never in a project), so an app's own Settings keeps only its engine's options
 * (ruling 7 of the 1.5 plan).
 *
 * THE LAWS IT KEEPS
 *   · EVERY CONTROL IS A KIT CONTROL wearing the current look (knob, seg, sw, trig, readout from mir/kit.js), so the
 *     window is its own demonstration.  The one control the kit lacks — the `‹ NAME ›` stepper, built like BASINS'
 *     blend-mode picker — is built here, and the page turner is the same stepper.
 *   · NO DEAD CONTROLS.  Each option drives a hook a kit sheet or kit module already reads (the table is LOOK_SCHEMA
 *     below and docs/GUI.md).  An option with no hook yet is left out and listed in the doc as waiting for its token.
 *     A control that is inert in the current combination says so (it is disabled), it does not pretend.
 *   · NOTHING SCROLLS.  Each page is laid out at its natural size and the window is placed to fit it; at phone width the
 *     OPTIONS groups split into sheets that the same page turner steps through sideways.
 *   · THE COST IS SHOWN.  QUALITY carries a reading of what the look costs: the panes that blur, the shadows drawn and the
 *     frame time measured over 30 frames after a change.  It is taken only while the window is open on OPTIONS, and
 *     only after a change (no timer, no poll), so the reading itself costs nothing at rest.
 *   · The pointer glow and the parallax (mir/fx/) are installed here, because their two switches live here.
 *
 * createGui({ host, prefs, app: { name, version }, about, accent, defaults, storageKey }) →
 *   { root, prefs, open(page?), close(), toggle(page?), get page, turn(dir), moving(bool), dropGuides(), census(),
 *     destroy() }
 *   host       where the window goes (a fixed layer above the stage)
 *   prefs      a store from core/prefs.js made with LOOK_SCHEMA (default: one is made, key `storageKey` = 'mir.gui')
 *   defaults   { key: value } — the app's own home look, over the kit's (e.g. { theme: 'light' })
 *   accent     a shell/accent.js engine (default: one is made); ACCENT A/B/VIVID drive it
 *   about      { github, credits: [line…], fonts: href-prefix } — extras for the ABOUT page (shell/about.js richText lines)
 *   moving(b)  the app says the picture is moving: under FROST · STILL the frost is held (body.frost-hold) while it moves
 *   dropGuides() the DROP GUIDES switch, for createWindow({ dock: { guide: gui.dropGuides } }) */
import { el, knob, seg, sw, trig, readout } from '../kit.js';
import { createWindow } from '../window/window.js';
import { createPrefs } from '../core/prefs.js';
import { setMotionPolicy } from '../core/motion.js';
import { frame } from '../core/frame.js';
import { setText, setVar } from '../core/perf.js';
import { createAccent } from './accent.js';
import { richText, safeHref } from './about.js';
import { createPointerLight } from '../fx/pointer-light.js';
import { createParallax } from '../fx/parallax.js';

/** the kit's version, as package.json says it (the release step keeps the two in step) */
import { MIR_VERSION } from '../version.js'; export { MIR_VERSION };   // one constant: mir/version.js
/** the skins: FROST is the house look; the others are announced, not selectable, until their packages land */
export const SKINS = Object.freeze([{ id: 'frost', label: 'FROST' }, { id: 'metro', label: 'METRO', coming: true }, { id: 'sprites', label: 'SPRITES', coming: true }]);
/** the words MIR says about itself — quoted from magic-commons.com/joshs-library/lambdawaves/about (2026-10-01) */
export const MIR_WORDS = 'MIR is the shared Magic Commons interface kit behind its controls, window system, gestures, and modulation. MIR is an open source platform and will continuously be updated, allowing for ‘LLM Mods’ support and customizable skins.';
const ZERO_SHADOW = '0 0 0 0 transparent';                       // the off shadow: never `none` (a list with none drops)
const HOME = Object.freeze({ veil: 10, saturation: 1, corners: 14 });   // where nothing is written: the dark frost veil · no saturate · skin.css --card-r
/* the theme's own glass tint (skin.css: dark hsl(214 16% 13%), light hsl(214 22% 93%)), which BRIGHT, HUE and TINT move */
const THEME_TINT = Object.freeze({ dark: { h: 214, s: 16, l: 13 }, light: { h: 214, s: 22, l: 93 } });
/** glassTint(bright, hue, tint, theme) — BASINS skin.js applyGlass: lightness + 40·BRIGHT, hue → HUE and saturation → 70 %
 *  by TINT.  → the `H S% L%` triple the kit reads as --glass-tint, or null at home (BRIGHT 0, TINT 0) */
export function glassTint(bright, hue, tint, theme) {
  if (!bright && !tint) return null;
  const T = THEME_TINT[theme] || THEME_TINT.dark;
  const h = tint > 0 ? Math.round(hue) : T.h, sat = +(T.s + tint * (70 - T.s)).toFixed(1), l = +Math.max(2, Math.min(98, T.l + 40 * bright)).toFixed(1);
  return `${h} ${sat}% ${l}%`;
}

/* ── THE LOOK, as one schema: what each option is, and the hook it drives ───────────────────────────────────────────
   Rows are applied in this order inside one frame job, so THEME is on <body> before the accent reads it, and the tier
   and the motion policy are written before the pointer effects re-ask their off rules (the last row). */
export function lookSchema() {
  const full = (s) => s.quality === 'full';
  return [
    { key: 'skin', type: 'enum', values: ['frost'], default: 'frost', apply: [{ on: 'html', attr: 'data-skin' }] },
    { key: 'theme', type: 'enum', values: ['dark', 'light', 'system'], default: 'dark', apply: [{ on: 'body', attr: 'data-theme', map: (v, s, e) => e.theme }] },
    { key: 'accentA', type: 'number', step: 1, min: 0, max: 360, wrap: true, default: 30 },
    { key: 'accentB', type: 'number', step: 1, min: 0, max: 360, wrap: true, default: 300 },
    { key: 'vivid', type: 'number', step: 0.01, min: 0, max: 1, default: 0.1, apply: [{ run(v, s, e, c) {     // ACCENT A, B and VIVID are one call
      if (!c || !c.accent) return;
      const k = [s.accentA, s.accentB, v, e.theme].join();
      if (c.lastAccent === k) return;
      c.lastAccent = k; c.accent.set({ a: s.accentA, b: s.accentB, vivid: v });
    } }] },
    { key: 'card', type: 'enum', values: ['tinted', 'refractive'], default: 'refractive', apply: [{ on: 'body', attr: 'data-card' }] },
    { key: 'frost', type: 'enum', values: ['off', 'still', 'always'], default: 'always', apply: [
      { on: 'body', cls: 'frost', when: (v) => v !== 'off' },
      { run(v, s, e, c) { const b = c && c.doc && c.doc.body; if (b) b.classList.toggle('frost-hold', v === 'still' && !!c.moving); } }] },
    /* BLUR is BASINS' 0–20 px (20 is the WebKit ceiling), so it is always written: the kit's own 22 is outside it */
    { key: 'blur', type: 'number', step: 1, min: 0, max: 20, default: 11, apply: [{ on: 'html', prop: '--glass-blur', map: (v) => v + 'px' }] },
    { key: 'veil', type: 'number', step: 1, min: 0, max: 60, default: 0, apply: [{ on: 'body', prop: '--surface-veil',
      map: (v, s, e) => (v === HOME.veil || !full(s) ? null : `hsl(${e.theme === 'light' ? '0 0% 100%' : '0 0% 0%'} / ${(v / 100).toFixed(2)})`) }] },
    { key: 'saturation', type: 'number', step: 0.01, min: 0, max: 2, default: 1.3, apply: [{ on: 'body', prop: '--surface-filter',
      map: (v, s) => (!full(s) ? null : s.blur === 0 ? 'none' : v === HOME.saturation ? null : `blur(${s.blur}px) saturate(${v.toFixed(2)})`) }] },
    { key: 'corners', type: 'number', step: 1, min: 0, max: 24, default: 24, apply: [{ on: 'body', prop: '--surface-radius', map: (v) => (v === HOME.corners ? null : Math.round(v) + 'px') }] },
    /* BRIGHT, HUE, TINT — BASINS' glass knobs, onto the kit's --glass-tint on <body> (the tinted pane and every solid face) */
    { key: 'bright', type: 'number', step: 0.01, min: -1, max: 1, default: 0 },
    { key: 'hue', type: 'number', step: 1, min: 0, max: 360, wrap: true, default: 0 },
    { key: 'tint', type: 'number', step: 0.01, min: 0, max: 1, default: 0, apply: [{ on: 'body', prop: '--glass-tint', map: (v, s, e) => glassTint(s.bright, s.hue, v, e.theme) }] },
    { key: 'relief', type: 'enum', values: ['default', 'flat'], default: 'default', apply: [
      { on: 'html', prop: '--relief-raise', map: (v) => (v === 'flat' ? ZERO_SHADOW : null) },
      { on: 'html', prop: '--relief-well', map: (v) => (v === 'flat' ? ZERO_SHADOW : null) }] },
    { key: 'shadow', type: 'bool', default: true, apply: ['--surface-shadow', '--surface-shadow-float', '--surface-shadow-menu']
      .map((prop) => ({ on: 'body', prop, map: (v) => (v ? null : ZERO_SHADOW) })) },
    { key: 'disconnected', type: 'bool', default: false, apply: [{ on: 'body', cls: 'disconnected' }] },
    { key: 'motion', type: 'enum', values: ['auto', 'full', 'reduced', 'off'], default: 'auto', apply: [{ run: (v) => setMotionPolicy(v) }] },
    { key: 'glow', type: 'bool', default: true },                    // fx/pointer-light.js — off on touch by its own law (ruling 13)
    { key: 'parallax', type: 'bool', default: true },                // fx/parallax.js
    { key: 'dropGuides', type: 'bool', default: true },              // read by createWindow({ dock: { guide } }) → gui.dropGuides()
    { key: 'hints', type: 'bool', default: true, apply: [{ on: 'body', cls: 'control-hints-off', when: (v) => !v }] },
    { key: 'help', type: 'bool', default: true, apply: [{ on: 'body', cls: 'window-info-off', when: (v) => !v }] },
    { key: 'quality', type: 'enum', values: ['full', 'balanced', 'light'], default: 'full', apply: [
      { on: 'html', attr: 'data-ui-tier', map: (v) => (v === 'balanced' ? 'lite' : v === 'light' ? 'flat' : null) },
      { run(v, s, e, c) { if (c && c.fx) c.fx(); } }] },
  ];
}
/** the presets: named sets of the MATERIAL, RELIEF and QUALITY options.  Accents, theme, motion and text are the user's
 *  own and no preset touches them.
 *  FROST is Josh's recipe (2026-10-01) and the new user's look: BASINS' ABOUT GLASS (skin.js setMaterialPreset('about'):
 *  ABOUT_MATERIAL veil 0 · radius 16 · shadow 1, ABOUT_SATURATION 1.3, GLASS_DEF bright 0 · hue 0 · tint 0, refractive,
 *  frost always) with his changes: BLUR 11 px, CORNERS maxed (24), SHADOW maxed (on, until it is an amount), DISCONNECTED off. */
export const LOOK_PRESETS = Object.freeze({
  frost: { card: 'refractive', frost: 'always', blur: 11, veil: 0, saturation: 1.3, corners: 24, bright: 0, tint: 0, relief: 'default', shadow: true, disconnected: false, quality: 'full' },
  classic: { card: 'tinted', frost: 'off', blur: 20, veil: HOME.veil, saturation: HOME.saturation, corners: HOME.corners, bright: 0, tint: 0, relief: 'default', shadow: true, disconnected: false, quality: 'full' },
  light: { card: 'tinted', frost: 'off', blur: 20, veil: HOME.veil, saturation: HOME.saturation, corners: HOME.corners, bright: 0, tint: 0, relief: 'flat', shadow: false, disconnected: false, quality: 'light' },
});

/* ── THE STEPPER: `‹ NAME ›`, two 44 px buttons around a live label (BASINS colour-window.js blend-mode picker) ───── */
/** stepper({ label, aria, items: [{ id, label, coming? }], value, onChange, wrap }) → { root, get, set(id), setItems(items, id) }
 *  An item marked `coming` is shown in the list but never chosen; the arrows skip it and stand down when nothing else
 *  can be reached. */
export function stepper(o) {
  const root = el('div', 'gui-step' + (o.cls ? ' ' + o.cls : ''));
  if (o.label) el('div', 'k-lbl', root, o.label);
  const row = el('div', 'gui-step-row', root);
  const prev = el('button', 'gui-step-b', row, '‹'); prev.type = 'button'; prev.dataset.step = '-1';
  const name = el('div', 'gui-step-name', row); name.setAttribute('aria-live', 'polite');
  const next = el('button', 'gui-step-b', row, '›'); next.type = 'button'; next.dataset.step = '1';
  prev.setAttribute('aria-label', 'previous'); next.setAttribute('aria-label', 'next');
  if (o.aria || o.label) row.setAttribute('aria-label', o.aria || o.label);
  let items = o.items || [], v = o.value;
  const live = () => items.filter((i) => !i.coming);
  const paint = () => {
    const it = items.find((i) => i.id === v) || live()[0];
    setText(name, it ? it.label : '');
    const L = live(), i = L.findIndex((x) => x.id === v), wrap = o.wrap !== false;
    prev.disabled = L.length < 2 || (!wrap && i <= 0); next.disabled = L.length < 2 || (!wrap && i >= L.length - 1);
  };
  const step = (d) => {
    const L = live(); if (L.length < 2) return;
    const i = Math.max(0, L.findIndex((x) => x.id === v)), j = o.wrap === false ? Math.max(0, Math.min(L.length - 1, i + d)) : (i + d + L.length) % L.length;
    if (L[j].id === v) return;
    v = L[j].id; paint(); if (o.onChange) o.onChange(v, d);
  };
  prev.addEventListener('click', () => step(-1)); next.addEventListener('click', () => step(1));
  row.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'ArrowLeft') { e.preventDefault(); step(-1); } else if (e.code === 'ArrowRight') { e.preventDefault(); step(1); }
  });
  paint();
  return { root, prev, next, get: () => v, set(id) { v = id; paint(); }, setItems(list, id) { items = list; if (id !== undefined) v = id; paint(); }, step };
}

/* ── THE COST READING ────────────────────────────────────────────────────────────────────────────────────────────── */
const OFF_SHADOW = /^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px 0px)$/;
/** census(doc) → { blur, shadow } — how many visible surfaces (elements and their drawn ::before/::after) carry a backdrop
 *  filter, and how many carry a drawn box shadow.  One style read per surface: it runs once after a change, never per frame. */
export function census(doc = document) {
  let blur = 0, shadow = 0;
  for (const n of doc.body.querySelectorAll('*')) {
    if (n.checkVisibility ? !n.checkVisibility() : !n.getClientRects().length) continue;
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(n, pseudo);
      if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
      const bf = cs.backdropFilter || cs.webkitBackdropFilter;
      if (bf && bf !== 'none') blur++;
      if (cs.boxShadow && !OFF_SHADOW.test(cs.boxShadow) && !cs.boxShadow.split(/,(?![^(]*\))/).every((l) => OFF_SHADOW.test(l.trim()))) shadow++;
    }
  }
  return { blur, shadow };
}

/* the narrow layout: the OPTIONS groups as sheets, stepped sideways by the page turner */
const NARROW = '(max-width: 720px)';
const SHEETS = { preset: 1, skin: 1, accent: 1, material: 2, relief: 3, text: 3, quality: 3, motion: 4 };
const SHEET_COUNT = 4;

export function createGui({ host, prefs, app = {}, about = {}, accent, defaults = {}, storageKey = 'mir.gui' } = {}) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const life = new AbortController(), on = { signal: life.signal };
  const appName = app.name || 'This app';

  /* ── the store, the accent, the pointer effects ── */
  const ctx = { doc, accent: accent === false ? null : accent || createAccent(), moving: false, lastAccent: null, fx: null };
  const schema = lookSchema().map((r) => (r.key in defaults ? { ...r, default: defaults[r.key] } : r));
  const P = prefs || createPrefs({ key: storageKey, schema, presets: LOOK_PRESETS, context: ctx });
  const light = createPointerLight({ doc, enabled: () => P.get('glow') });
  const plx = createParallax({ doc, enabled: () => P.get('parallax') });
  ctx.fx = () => { light.refresh(); plx.refresh(); };
  P.apply({ now: true });                                            // the first paint wears the stored look

  /* ── OPTIONS: eight groups ── */
  const controls = new Map();                                        // option key → { set(v) } so the window follows the store
  const bind = (key, c, toUi = (v) => v) => { controls.set(key, { c, set: (v) => c.set(toUi(v)) }); return c; };
  const opts = el('div', 'gui-page gui-options');
  const grid = el('div', 'gui-grid', opts);
  const groupEl = (id, title) => { const g = el('section', 'gui-grp', grid); g.dataset.group = id; g.dataset.light = ''; g.dataset.sheet = String(SHEETS[id]); el('h3', 'gui-grp-lbl', g, title); return g; };
  const line = (g, cls = '') => el('div', 'gui-line' + (cls ? ' ' + cls : ''), g);
  const segOf = (key, label, options) => bind(key, seg({ label, options: options.map(([id, l, title]) => ({ id, label: l, title })), value: P.get(key), onChange: (v) => P.set(key, v) }));
  const swOf = (key, label, title) => bind(key, sw({ label, title, value: P.get(key), onChange: (v) => P.set(key, v) }));
  const knobOf = (key, label, o) => bind(key, knob({ label, value: o.toUi ? o.toUi(P.get(key)) : P.get(key), min: o.min, max: o.max, fmt: o.fmt, wrap: o.wrap, cls: o.cls,
    onInput: (v) => { P.set(key, o.fromUi ? o.fromUi(v) : v); if (o.input) o.input(v); } }), o.toUi);

  /* PRESET */
  let g = groupEl('preset', 'PRESET');
  const presetSeg = seg({ label: 'LOOK', options: [
    { id: 'frost', label: 'FROST', title: 'Josh\u2019s glass: refractive frost, 11 px, 130 % saturation, round corners' },
    { id: 'classic', label: 'CLASSIC', title: 'The 1.4 look: tinted panes, no blur, the relief' },
    { id: 'light', label: 'LIGHT', title: 'The fast look: no blur, flat, no shadows, no motion' },
    { id: 'custom', label: 'CUSTOM', title: 'Your own mix: the options match no preset' }], value: P.preset(),
    onChange: (id) => { if (id !== 'custom') P.applyPreset(id); } });
  line(g).append(presetSeg.root);
  const resetT = trig({ label: 'RESET LOOK', title: 'Every look option back home', onFire: () => P.reset() });
  line(g).append(resetT.root);

  /* SKIN */
  g = groupEl('skin', 'SKIN');
  const skinStep = stepper({ label: 'SKIN', items: SKINS, value: P.get('skin'), onChange: (v) => P.set('skin', v) });
  bind('skin', skinStep);
  line(g).append(skinStep.root);
  el('div', 'gui-note', g, SKINS.filter((s) => s.coming).map((s) => s.label).join(' · ') + ' — coming');
  line(g).append(segOf('theme', 'THEME', [['light', 'LIGHT'], ['dark', 'DARK'], ['system', 'SYSTEM', 'Follow the system']]).root);

  /* ACCENT — a hue is cyclic, so it is an arc (INTENT rule 2): the kit's accent dial */
  g = groupEl('accent', 'ACCENT');
  const sweep = (k) => (v) => setVar(k.root, '--accent-sweep', Math.round(v) + 'deg');
  const deg = (v) => Math.round(v) + '°';
  const kA = knobOf('accentA', 'A', { min: 0, max: 360, wrap: true, fmt: deg, cls: 'accent-dial' });
  const kB = knobOf('accentB', 'B', { min: 0, max: 360, wrap: true, fmt: deg, cls: 'accent-dial accent-dial-b' });
  const kV = knobOf('vivid', 'VIVID', { min: 0, max: 100, fmt: (v) => Math.round(v) + '%', toUi: (v) => v * 100, fromUi: (v) => v / 100 });
  const swA = sweep(kA), swB = sweep(kB); swA(P.get('accentA')); swB(P.get('accentB'));
  line(g, 'gui-knobs').append(kA.root, kB.root, kV.root);

  /* MATERIAL */
  g = groupEl('material', 'MATERIAL');
  line(g, 'gui-pair').append(segOf('card', 'PANE', [['tinted', 'TINTED', 'A tinted pane: no blur, no compositor cost'], ['refractive', 'REFRACTIVE', 'The blur alone, with a veil']]).root,
    segOf('frost', 'FROST', [['off', 'OFF'], ['still', 'STILL', 'Frost while the picture is still'], ['always', 'ALWAYS', 'Frost always: the costliest']]).root);
  const kBlur = knobOf('blur', 'BLUR', { min: 0, max: 20, fmt: (v) => Math.round(v) + 'px' });
  const kVeil = knobOf('veil', 'VEIL', { min: 0, max: 60, fmt: (v) => Math.round(v) + '%' });
  const kSat = knobOf('saturation', 'SATURATION', { min: 0, max: 2, fmt: (v) => Math.round(v * 100) + '%' });
  const kCorner = knobOf('corners', 'CORNERS', { min: 0, max: 24, fmt: (v) => Math.round(v) + 'px' });
  line(g, 'gui-knobs').append(kBlur.root, kVeil.root, kSat.root, kCorner.root);
  const signed = (v) => (v > 0.005 ? '+' : v < -0.005 ? '\u2212' : '') + Math.abs(v * 100).toFixed(0);
  const kBright = knobOf('bright', 'BRIGHT', { min: -1, max: 1, fmt: signed });
  /* HUE is cyclic, so an arc (INTENT rule 2), drawn in the hue it names */
  const kHue = knobOf('hue', 'HUE', { min: 0, max: 360, wrap: true, fmt: deg, cls: 'accent-dial' });
  const kTint = knobOf('tint', 'TINT', { min: 0, max: 100, fmt: (v) => Math.round(v) + '%', toUi: (v) => v * 100, fromUi: (v) => v / 100 });
  const hueArc = (v) => { setVar(kHue.root, '--accent-sweep', Math.round(v) + 'deg'); setVar(kHue.root, '--acc', `hsl(${Math.round(v)} 70% 55%)`); };
  hueArc(P.get('hue'));
  const holder = el('div', 'k'); holder.setAttribute('aria-hidden', 'true');      // the fourth seat, so the two dial rows share columns
  line(g, 'gui-knobs').append(kBright.root, kHue.root, kTint.root, holder);

  /* RELIEF */
  g = groupEl('relief', 'RELIEF');
  line(g).append(segOf('relief', 'CONTROLS', [['default', 'DEFAULT', 'Raised controls and wells'], ['flat', 'FLAT', 'No control relief']]).root);
  line(g, 'gui-sws gui-col').append(swOf('shadow', 'SHADOW', 'Pane shadows').root, swOf('disconnected', 'DISCONNECTED', 'Window headers apart from their bodies').root);

  /* MOTION */
  g = groupEl('motion', 'MOTION');
  line(g).append(segOf('motion', 'MOTION', [['auto', 'AUTO', 'Follow the system'], ['full', 'FULL'], ['reduced', 'REDUCED', 'Fades only: nothing travels'], ['off', 'OFF', 'Nothing animates']]).root);
  line(g, 'gui-sws').append(swOf('glow', 'POINTER GLOW', 'A soft light follows the pointer over lit surfaces (never on touch)').root,
    swOf('parallax', 'PARALLAX', 'Marked layers drift against the pointer (never on touch)').root);
  line(g, 'gui-sws').append(swOf('dropGuides', 'DROP GUIDES', 'The dotted guide where a dragged window will land').root,
    Object.assign(el('div', 'sw'), { ariaHidden: 'true' }));         // an empty, invisible seat, so DROP GUIDES is as wide as the two above
  g.lastElementChild.lastElementChild.style.visibility = 'hidden';


  /* TEXT */
  g = groupEl('text', 'TEXT');
  const shows = el('div', 'segw gui-show', line(g)); el('div', 'k-lbl', shows, 'SHOW');      // a label like every first control's, so the labels share a baseline
  el('div', 'gui-line gui-sws gui-col', shows).append(swOf('hints', 'HINTS', 'Hover hints on controls').root, swOf('help', 'HELP', 'The ⓘ panels on windows').root);

  /* QUALITY — and what it costs */
  g = groupEl('quality', 'QUALITY');
  line(g).append(segOf('quality', 'TIER', [['full', 'FULL', 'Everything'], ['balanced', 'BALANCED', 'No blur anywhere, one shadow layer'], ['light', 'LIGHT', 'No blur, no relief, no shadows, no motion']]).root);
  const roBlur = readout({ label: 'BLUR', value: '—' }), roShadow = readout({ label: 'SHADOW', value: '—' }), roFrame = readout({ label: 'FRAME', value: '—' });
  for (const r of [roBlur, roShadow, roFrame]) { r.root.classList.add('gui-ro'); r.root.title = 'What the look costs, measured after the last change'; }
  roBlur.root.title = 'Surfaces that blur what is behind them: one compositor pass each';
  roShadow.root.title = 'Surfaces that draw a shadow';
  roFrame.root.title = 'The mean frame time over 30 frames after the last change';
  line(g, 'gui-cost').append(roBlur.root, roShadow.root, roFrame.root);

  /* ── ABOUT ── */
  const ab = el('div', 'gui-page gui-about');
  const logo = el('div', 'gui-logo', ab); logo.dataset.light = ''; logo.setAttribute('role', 'img'); logo.setAttribute('aria-label', 'MIR');
  const logoArt = el('div', 'gui-logo-art', logo); logoArt.dataset.parallax = '5';
  el('div', 'gui-ab-ver', ab, `MIR ${MIR_VERSION} · SKIN ${SKINS.find((s) => s.id === P.get('skin')).label}`);
  el('div', 'gui-ab-std', ab, `${appName} is an MIR Standard app`);
  el('p', 'gui-ab-words', ab, MIR_WORDS);
  const fine = (parts) => richText(el('p', 'gui-ab-fine', ab), parts);
  if (about.github && safeHref(about.github)) fine(['Source: ', [about.github.replace(/^https?:\/\//, ''), about.github]]);
  fine(['MIR is free software under the GNU GPL v3.0 only (GPL-3.0-only) — no warranty.']);
  const F = about.fonts || '../fonts/';
  fine(['Type: ', ['Roboto', F + 'Roboto-OFL.txt'], ' · ', ['LW Title', F + 'Spinwerad-OFL.txt'], ' (a renamed subset of Spinwerad by gluk) · ',
    ['STIX Two Math', F + 'STIXTwoMath-OFL.txt'], ' · the notebook’s ', ['Spectral', F + 'info/Spectral-OFL.txt'], ', ', ['Playfair Display', F + 'info/PlayfairDisplay-OFL.txt'],
    ' and ', ['Alegreya SC', F + 'info/AlegreyaSC-OFL.txt'], ' — all SIL OFL 1.1.']);
  fine(['The MIR logo is outlined from Butler Free Extra Bold by ', ['Fabian De Smet', 'https://www.fabiandesmet.com/'], '.']);
  for (const c of about.credits || ['© 2026 Joshua Hosain · Magic Commons. Built by AI coding agents — Claude (Anthropic) · Gemini (Google) · GPT (OpenAI).']) fine(c);

  /* the logo: the theme's file, inlined so its nine tiles can turn; ids stripped (the SVG's <title id="title"> would
     collide with the wordmark's #title) */
  const logos = {};
  const loadLogo = (theme) => {
    if (logos[theme]) return Promise.resolve(logos[theme]);
    return fetch(new URL(`./assets/mir-${theme}.svg`, import.meta.url)).then((r) => (r.ok ? r.text() : '')).then((t) => {
      const svg = t && new DOMParser().parseFromString(t, 'image/svg+xml').documentElement;
      if (!svg || svg.nodeName !== 'svg') return null;
      for (const n of [svg, ...svg.querySelectorAll('[id]')]) n.removeAttribute('id');
      svg.removeAttribute('aria-labelledby'); svg.setAttribute('aria-hidden', 'true'); svg.removeAttribute('width'); svg.removeAttribute('height');
      for (const n of svg.querySelectorAll('title, desc, metadata')) n.remove();
      return (logos[theme] = doc.importNode(svg, true));
    }).catch(() => null);
  };
  const showLogo = () => { const t = P.env().theme; loadLogo(t).then((svg) => { if (svg && P.env().theme === t && logoArt.firstChild !== svg) logoArt.replaceChildren(svg); }); };
  /* the nine tiles cycle the palette while the pointer is on the logo (BASINS brand-motion, 240 ms a step): each tile
     walks the logo's own nine colours from its own place, as a stepped animation — no timer, and none at rest */
  let turning = [];
  const STEP_MS = 240;
  logo.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch' || doc.documentElement.dataset.motion !== 'full') return;
    const tiles = [...logoArt.querySelectorAll('rect')]; if (tiles.length !== 9) return;
    const cols = tiles.map((t) => t.getAttribute('fill'));
    turning = tiles.map((t, i) => t.animate(cols.map((_, k) => ({ fill: cols[(i + k) % 9] })).concat([{ fill: cols[i] }]),
      { duration: STEP_MS * 9, iterations: Infinity, easing: 'steps(9, jump-none)' }));
  }, on);
  logo.addEventListener('pointerleave', () => { for (const a of turning) a.cancel(); turning = []; }, on);

  /* ── the window, the page turner ── */
  const head = el('div', 'gui-head');
  let narrow = !!(win.matchMedia && win.matchMedia(NARROW).matches), page = 'options', sheet = 1;
  const pages = () => (narrow ? [...Array.from({ length: SHEET_COUNT }, (_, i) => ({ id: 'options:' + (i + 1), label: `MIR OPTIONS ${i + 1}/${SHEET_COUNT}` })), { id: 'about', label: 'MIR ABOUT' }]
    : [{ id: 'options', label: 'MIR OPTIONS' }, { id: 'about', label: 'MIR ABOUT' }]);
  const pageId = () => (page === 'about' ? 'about' : narrow ? 'options:' + sheet : 'options');
  const turner = stepper({ cls: 'gui-turner', aria: 'page', items: pages(), value: pageId(), onChange: (id) => show(id) });
  head.append(turner.root);

  const W = createWindow({ id: 'gui', title: 'GUI', host, size: { w: 920, h: 520 }, min: { w: 280, h: 200 }, emptyDrag: true,
    panels: [{ name: 'options', body: (p) => p.append(opts) }, { name: 'about', body: (p) => p.append(ab) }] });
  W.root.classList.add('mir-gui');
  W.root.setAttribute('aria-label', 'GUI — MIR OPTIONS and MIR ABOUT');
  W.body.prepend(head);                                             // the turner sits above both pages
  for (const c of W.rail.el.querySelectorAll('.mir-chip')) c.dataset.light = '';   // the window's own chips catch the light too

  /** fit — place the window to its page's natural size, so nothing scrolls (one layout read) */
  function fit() {
    if (!W.isOpen()) return;
    const cs = getComputedStyle(W.body);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const pg = page === 'about' ? ab : opts, wide = page === 'about' ? ab : grid, edge = 2;
    const w = Math.ceil(Math.max(wide.offsetWidth, turner.root.scrollWidth) + padX + edge), h = Math.ceil(head.offsetHeight + pg.scrollHeight + padY + edge);
    const vw = win.innerWidth, vh = win.innerHeight, r = W.rect();
    const cw = Math.min(w, vw - 16), ch = Math.min(h, vh - 16);
    const cx = r ? r.left + r.width / 2 : vw / 2, cy = r ? r.top + r.height / 2 : vh / 2;
    W.place({ left: Math.round(Math.max(8, Math.min(vw - cw - 8, cx - cw / 2))), top: Math.round(Math.max(8, Math.min(vh - ch - 8, cy - ch / 2))), width: cw, height: ch });
  }
  function show(id) {
    page = id === 'about' ? 'about' : 'options';
    if (id.startsWith('options:')) sheet = +id.split(':')[1] || 1;
    opts.dataset.sheet = narrow ? String(sheet) : '';
    W.tab(page);
    turner.setItems(pages(), pageId());
    if (page === 'about') showLogo();
    fit();
    if (page === 'options') measureCost();
  }
  const onNarrow = (e) => { narrow = e.matches; show(pageId() === 'about' ? 'about' : narrow ? 'options:' + sheet : 'options'); };
  const mqNarrow = win.matchMedia ? win.matchMedia(NARROW) : null;
  if (mqNarrow && mqNarrow.addEventListener) mqNarrow.addEventListener('change', onNarrow, on);
  opts.dataset.sheet = narrow ? '1' : '';

  /* ── the cost: once after a change, while OPTIONS is showing ── */
  let costRun = 0;
  function measureCost() {
    if (!W.isOpen() || page !== 'options') return;
    const run = ++costRun;
    frame.coalesce('gui:cost', () => {
      requestAnimationFrame(() => {                                 // after the change has been styled and painted
        if (run !== costRun) return;
        const c = census(doc);
        setText(roBlur.root.querySelector('.ro-val'), String(c.blur)); setText(roShadow.root.querySelector('.ro-val'), String(c.shadow));
        roBlur.root.dataset.count = c.blur; roShadow.root.dataset.count = c.shadow;
        const t = []; let last = 0;
        const tick = (now) => { if (run !== costRun) return; if (last) t.push(now - last); last = now; if (t.length < 30) requestAnimationFrame(tick); else {
          const ms = t.reduce((a, b) => a + b, 0) / t.length;
          setText(roFrame.root.querySelector('.ro-val'), ms.toFixed(1) + ' ms'); roFrame.root.dataset.ms = ms.toFixed(2);
        } };
        requestAnimationFrame(tick);
      });
    });
  }

  /* ── the window follows the store ── */
  function sync(state, changed) {
    for (const k of changed) { const c = controls.get(k); if (c) c.set(state[k]); }
    if (changed.includes('accentA')) swA(state.accentA);
    if (changed.includes('accentB')) swB(state.accentB);
    if (changed.includes('hue')) hueArc(state.hue);
    const preset = P.preset();
    presetSeg.set(preset); presetSeg.button('custom').hidden = preset !== 'custom';
    const full = state.quality === 'full';
    kBlur.setDisabled(!full); kSat.setDisabled(!full); kVeil.setDisabled(!full || state.card !== 'refractive');
    kHue.setDisabled(!state.tint);                                    // HUE shows only through TINT
    if (changed.includes('theme') && page === 'about') showLogo();
    if (changed.length) { fit(); measureCost(); }
  }
  const unsub = P.subscribe(sync);
  sync(P.all(), []);

  return {
    root: W.root, window: W, prefs: P,
    /** open(page) — 'options' (default) or 'about' */
    open(p) { const first = !W.isOpen(); if (first) W.open(); show(p === 'about' ? 'about' : narrow ? 'options:' + sheet : 'options'); },
    close() { W.close(); },
    toggle(p) { if (W.isOpen() && (!p || p === page)) W.close(); else this.open(p); },
    get page() { return page; },
    turn(d) { turner.step(d); },
    /** moving(b) — the app's picture is moving (FROST · STILL holds the frost while it does) */
    moving(b) { ctx.moving = !!b; P.apply(); },
    dropGuides: () => P.get('dropGuides'),
    census: () => census(doc),
    light, parallax: plx,
    destroy() { unsub(); life.abort(); costRun++; frame.cancel('gui:cost'); light.destroy(); plx.destroy(); W.destroy(); if (!prefs) P.destroy(); },
  };
}
