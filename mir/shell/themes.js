/* MIR · shell/themes.js — the VANILLA THEMES and their TONES: named sets of the built-in look settings, and nothing else.
 *
 * WHAT IT IS.  Josh, 2026-10-01: "If you can make it in house from the built in settings, then it's a vanilla skin.  If
 * you vibe code specifics into it, then it's a 'name'-spec MIR build/theme."  So a theme here is `{ id, name, values }`
 * over the GUI window's look options (shell/gui.js lookSchema) — no stylesheet, no class, no code — and applying one is
 * one `prefs.set(values)`.  A TONE is a named set of ONLY the colour options (COLOUR_KEYS), stepped under the theme.
 *
 * THE LAWS IT KEEPS
 *   · DATA ONLY.  Every value is an option the look store owns; tests/themes.browser.mjs proves applying a theme writes
 *     nothing the store does not own.
 *   · A THEME IS WHOLE.  Each theme states every option in THEME_KEYS (BASE fills what it does not say), so stepping from
 *     one theme to another never leaves a trace of the last.  The user's own choices — THEME (light · dark · system),
 *     HINTS, HELP, DROP GUIDES — are in neither list, and no theme touches them but one: a theme that is only itself
 *     in one mode may also state THEME (NEON: near-black panes, so dark in either mode).
 *   · ONE TABLE TO EDIT.  Josh renames and cuts: a name is the `name` string, a theme is one entry of THEMES, a tone one
 *     row of its `tones`.  The first tone is the theme's own, applied with it.
 *
 * Exports: THEMES, THEME_KEYS, COLOUR_KEYS, themeById(id), themeValues(id), toneValues(themeId, toneId),
 *          matchTheme(state), matchTone(state, themeId). */

/** the options a tone sets: colour only */
export const COLOUR_KEYS = Object.freeze(['hue', 'tint', 'bright', 'accentA', 'accentB', 'vivid']);
/** the options a theme sets: every look option but the colours and the user's own (theme, hints, help, drop guides) */
export const THEME_KEYS = Object.freeze(['card', 'frost', 'blur', 'veil', 'saturation', 'corners', 'faces', 'faceBlend', 'text', 'relief', 'edge',
  'lightAngle', 'shadow', 'shadowDist', 'shadowSoft', 'shine', 'shineSoft', 'dropShadow', 'disconnected', 'spacing', 'motion', 'glow', 'parallax', 'quality']);

/* what a theme does not say: the kit's own home for each (shell/gui.js lookSchema defaults, before FROST) */
const BASE = { card: 'tinted', frost: 'off', blur: 11, veil: 10, saturation: 1, corners: 14, faces: 'solid', faceBlend: 0, text: 'theme', relief: 'default', edge: true,
  lightAngle: 0, shadow: 1, shadowDist: 2, shadowSoft: 8, shine: 0, shineSoft: 12, dropShadow: true, disconnected: false, spacing: 0.63, motion: 'auto', glow: true, parallax: true, quality: 'full' };
const tone = (id, name, hue, tint, bright, accentA, accentB, vivid) => ({ id, name, values: { hue, tint, bright, accentA, accentB, vivid } });

/* ── THE TABLE ─────────────────────────────────────────────────────────────────────────────────────────────────────
   tone(id, NAME, HUE°, TINT, BRIGHT, ACCENT A°, ACCENT B°, VIVID) — the accents are angles on the accent palette. */
const TABLE = [   // tr: names
  /* FROST — Josh's recipe (2026-10-01): "'About Glass', Shadow maxed, Veil 0, Brightness 0, Dark mode, White Text, Glass
     control surface, Blur at 11px.  Saturation bumped to 130.  Tint 0, and disconnected off.  Corners knob maxed. …
     Refractive on and frost always."  BASINS' ABOUT GLASS draws no pane edge (material.css), so EDGE is off.  The white
     text belongs to dark mode: TEXT is AUTO, which under glass is BASINS' pure ladder in the mode's polarity — white in
     dark (the recipe, exactly), black in light. */
  { id: 'frost', name: 'FROST', values: { card: 'refractive', frost: 'always', blur: 11, veil: 0, saturation: 1.3, corners: 24, faces: 'glass', text: 'theme', edge: false, shadow: 2, spacing: 0.4 },
    tones: [tone('clear', 'CLEAR', 0, 0, 0, 30, 300, 0.1), tone('rose', 'ROSE', 340, 0.22, 0, 345, 300, 0.25), tone('azure', 'AZURE', 205, 0.28, 0, 200, 280, 0.25)] },
  /* MORPH — neumorphism: the SOLID pane, the light at the upper left, a drop shadow bottom-right and the shine upper-left
     (Josh: "So bottom right shadow, upper left shine"), faces the pane's colour, soft corners, no edge. */
  { id: 'morph', name: 'MORPH', values: { card: 'solid', corners: 20, edge: false, lightAngle: 315, shadow: 1.4, shadowDist: 6, shadowSoft: 14, shine: 0.7, shineSoft: 14, glow: false, parallax: false, spacing: 0.75 },
    tones: [tone('clay', 'CLAY', 24, 0.16, 0, 30, 300, 0.1), tone('mint', 'MINT', 150, 0.18, 0, 140, 300, 0.1), tone('lilac', 'LILAC', 268, 0.2, 0, 280, 30, 0.1), tone('slate', 'SLATE', 0, 0, 0, 30, 300, 0.1)] },
  /* CLASSIC — the 1.4 spirit: the tinted pane, solid faces, the relief, the house corner and veil, and 1.4's 22 px blur. */
  { id: 'classic', name: 'CLASSIC', values: { blur: 22 },
    tones: [tone('house', 'HOUSE', 0, 0, 0, 30, 300, 0.1), tone('ink', 'INK', 214, 0.2, 0, 200, 300, 0.1), tone('ember', 'EMBER', 18, 0.18, 0, 20, 300, 0.15)] },
  /* SWIFT — the high-performance one: SOLID, no blur, no shadow, no shine, flat controls, motion off, pointer glow and
     parallax off, the flat tier.  (It replaces the preset called LIGHT: the name was ambiguous with the light theme.) */
  { id: 'swift', name: 'SWIFT', values: { card: 'solid', relief: 'flat', shadow: 0, motion: 'off', glow: false, parallax: false, quality: 'light', spacing: 0.25 },
    tones: [tone('graphite', 'GRAPHITE', 0, 0, 0, 30, 300, 0.1), tone('sand', 'SAND', 40, 0.14, 0, 40, 300, 0.1), tone('steel', 'STEEL', 210, 0.16, 0, 200, 300, 0.1)] },
  /* AURORA — the flashy one: refractive, saturation up, a strong shine, vivid accents, pointer glow and parallax on. */
  { id: 'aurora', name: 'AURORA', values: { card: 'refractive', frost: 'always', blur: 16, veil: 6, saturation: 1.8, corners: 22, faces: 'glass', edge: true, shadow: 1.5, shadowDist: 3, shadowSoft: 14, shine: 1, shineSoft: 18, spacing: 0.5 },
    tones: [tone('borealis', 'BOREALIS', 160, 0.3, 0, 120, 280, 0.8), tone('dusk', 'DUSK', 300, 0.3, 0, 320, 40, 0.7), tone('solar', 'SOLAR', 40, 0.3, 0, 45, 200, 0.8)] },
  /* NEON — near-black SOLID panes, accents at full strength with their glow, everything else quiet (no pane shadow, no edge).
     A dark-pane theme in either mode, so it states THEME dark. */
  { id: 'neon', name: 'NEON', values: { theme: 'dark', card: 'solid', corners: 10, edge: false, shadow: 0, parallax: false, spacing: 0.2 },
    tones: [tone('volt', 'VOLT', 0, 0, -0.26, 110, 300, 1), tone('magenta', 'MAGENTA', 300, 0.25, -0.26, 300, 180, 1), tone('cyan', 'CYAN', 190, 0.25, -0.26, 180, 330, 1)] },
];

/** THEMES — [{ id, name, values, tones: [{ id, name, values }] }]; a theme's values state every THEME_KEYS option */
export const THEMES = Object.freeze(TABLE.map((t) => Object.freeze({ id: t.id, name: t.name,
  values: Object.freeze({ ...('theme' in t.values ? { theme: t.values.theme } : {}), ...Object.fromEntries(THEME_KEYS.map((k) => [k, k in t.values ? t.values[k] : BASE[k]])) }),
  tones: Object.freeze(t.tones.map((o) => Object.freeze({ id: o.id, name: o.name, values: Object.freeze(o.values) }))) })));

export const themeById = (id) => THEMES.find((t) => t.id === id) || null;
/** themeValues(id) — the theme's options and its own (first) tone's: what applying it sets */
export function themeValues(id) { const t = themeById(id); return t ? { ...t.values, ...t.tones[0].values } : null; }
/** toneValues(themeId, toneId) — that tone's colour options */
export function toneValues(themeId, toneId) { const t = themeById(themeId), o = t && t.tones.find((x) => x.id === toneId); return o ? { ...o.values } : null; }
const same = (state, values) => Object.entries(values).every(([k, v]) => state[k] === v);
/** matchTheme(state) → the id of the theme whose every option the state matches, or 'custom' */
export function matchTheme(state) { const t = THEMES.find((x) => same(state, x.values)); return t ? t.id : 'custom'; }
/** matchTone(state, themeId) → the id of the theme's tone the colours match, or 'custom' */
export function matchTone(state, themeId) { const t = themeById(themeId), o = t && t.tones.find((x) => same(state, x.values)); return o ? o.id : 'custom'; }
