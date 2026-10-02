/* MIR · core/look.js — the look's arithmetic: BASINS' glass formulas, the one light, the SOLID pane's ink.  Pure.
 *
 * WHAT IT IS.  The GUI window's store (shell/gui.js, core/prefs.js) turns options into writes; the numbers those writes
 * carry are computed here, so they are node-tested and decided in one place.  Nothing here touches the DOM.
 *
 * THE LAWS IT KEEPS
 *   · HARVESTED, NOT RESTYLED.  glassTint and glassVeil are BASINS' `applyGlass` (app/skin.js, 2026-10-01) to the
 *     digit: the tint's lightness moves 40 points per BRIGHT, its hue goes to HUE and its saturation to 70 % by TINT,
 *     times SATURATION; the veil is the theme's signed whiteness plus ½·BRIGHT, coloured toward HUE by TINT.
 *     paneShadow is BASINS' ABOUT material shadow (surface-material.js projectMaterial) at SHADOW's amount.
 *   · HOME WRITES NOTHING.  Each function returns null where the kit's own value should stand.
 *   · ONE LIGHT.  LIGHT ANGLE is where the light is, in degrees clockwise from straight up (0 = above, 315 = upper
 *     left).  A shadow falls away from it, the shine sits toward it.  The sheets draw both with CSS sin()/cos() from
 *     `--light-angle`; lightOffset() is the same arithmetic for a test or a script.
 *
 * Exports: THEME_GLASS, hslRgb, glassTint, glassVeil, paneShadow, lightOffset, lightIsHome, paneLightness, solidInk, spacingPx,
 *          LIGHT_HOME. */

/** the theme's own glass, as the kit ships it (skin.css :root and body[data-theme="light"]): the tinted pane's H S L
 *  and the refractive frost's veil as a signed whiteness (+ white, − black) — BASINS skin.js THEME_GLASS, verbatim */
export const THEME_GLASS = Object.freeze({ light: { h: 214, s: 22, l: 93, veil: 0.10 }, dark: { h: 214, s: 16, l: 13, veil: -0.10 } });
/** where the light settings write nothing (the kit's own shadows stand) */
export const LIGHT_HOME = Object.freeze({ lightAngle: 0, shadow: 1, shadowDist: 2, shadowSoft: 8, shine: 0, shineSoft: 12 });

const T = (theme) => THEME_GLASS[theme] || THEME_GLASS.dark;
const num = (v, d) => (Number.isFinite(+v) ? +v : d);

/** hslRgb(h°, s 0…1, l 0…1) → [r, g, b] 0…255 (BASINS skin.js hslRgb) */
export function hslRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
}

/** glassTint({ bright, hue, tint, saturation }, theme) → the `H S% L%` triple the kit reads as --glass-tint, or null at
 *  home (BRIGHT 0, TINT 0, SATURATION 100 %).  BASINS applyGlass: h = TINT > 0 ? HUE : the theme's;
 *  s = min(100, (theme s + TINT·(70 − theme s))·SATURATION); l = clamp(theme l + 40·BRIGHT, 2, 98). */
export function glassTint(o, theme) {
  const bright = num(o.bright, 0), tint = num(o.tint, 0), sat = num(o.saturation, 1), t = T(theme);
  if (!bright && !tint && sat === 1) return null;
  const h = tint > 0 ? Math.round(num(o.hue, 0)) : t.h;
  const s = +Math.min(100, (t.s + tint * (70 - t.s)) * sat).toFixed(1);
  const l = +Math.max(2, Math.min(98, t.l + 40 * bright)).toFixed(1);
  return `${h} ${s}% ${l}%`;
}

/** glassVeil({ veil, bright, hue, tint, saturation }, theme, homeVeil) → the REFRACTIVE pane's veil as `rgb(r g b / a)`,
 *  or null at home (VEIL at the kit's house value, BRIGHT 0, TINT 0: the house veils stand).  VEIL is 0…60 (%).
 *  BASINS applyGlass: v = clamp(VEIL·(light ? +1 : −1) + ½·BRIGHT, ±.6); the colour is white (v ≥ 0) or black, mixed
 *  toward hsl(HUE, min(1, .8·SATURATION), .55) by .85·TINT; the alpha is max(|v|, .3·TINT). */
export function glassVeil(o, theme, homeVeil = 10) {
  const veil = num(o.veil, homeVeil), bright = num(o.bright, 0), tint = num(o.tint, 0), sat = num(o.saturation, 1);
  if (veil === homeVeil && !bright && !tint) return null;
  const v = Math.max(-0.6, Math.min(0.6, (veil / 100) * (theme === 'light' ? 1 : -1) + 0.5 * bright));
  const base = v >= 0 ? 255 : 0, hue = hslRgb(num(o.hue, 0), Math.min(1, 0.8 * sat), 0.55), k = 0.85 * tint;
  const rgb = hue.map((c) => Math.round(base * (1 - k) + c * k));
  return `rgb(${rgb.join(' ')} / ${Math.max(Math.abs(v), 0.3 * tint).toFixed(3)})`;
}

/** lightOffset(angle°, distance) → { x, y } of the shadow (away from the light); the shine is { −x, −y } */
export function lightOffset(angle, d = 1) {
  const r = (num(angle, 0) * Math.PI) / 180;
  const z = (v) => (Math.abs(v) < 1e-9 ? 0 : +v.toFixed(4));
  return { x: z(-Math.sin(r) * d), y: z(Math.cos(r) * d) };
}

/** paneShadow({ shadow, lightAngle, shadowDist, shadowSoft }, theme) → BASINS' ABOUT material shadow at the pane
 *  height, as the sheets draw it under html[data-cast] (for tests and docs: the sheet is the drawing).  BASINS:
 *  inset 0 1px 0 white .12 (dark) / .55 (light), 0 2px 8px black .20·s / .10·s, 0 1px 2px black .12·s / .06·s. */
export function paneShadow(o, theme) {
  const s = num(o.shadow, 1), d = num(o.shadowDist, 2), soft = num(o.shadowSoft, 8), dark = theme !== 'light';
  if (s === 0) return '0 0 0 0 transparent';
  const px = (v) => +v.toFixed(4) + 'px', a = lightOffset(o.lightAngle, d), c = lightOffset(o.lightAngle, d / 2), i = lightOffset(o.lightAngle, 1);
  return `inset ${px(i.x)} ${px(i.y)} 0 rgb(255 255 255 / ${dark ? 0.12 : 0.55}), ${px(a.x)} ${px(a.y)} ${px(soft)} rgb(0 0 0 / ${+((dark ? 0.20 : 0.10) * s).toFixed(3)}), `
    + `${px(c.x)} ${px(c.y)} ${px(soft / 4)} rgb(0 0 0 / ${+((dark ? 0.12 : 0.06) * s).toFixed(3)})`;
}

/** lightIsHome(state) — every light setting at home: the store writes nothing and the kit's own shadows stand */
export function lightIsHome(s) { return Object.entries(LIGHT_HOME).every(([k, v]) => num(s[k], v) === v); }

/** paneLightness(state, theme) → the SOLID pane's lightness, 0…100 (BRIGHT moves the theme's own) */
export function paneLightness(o, theme) { return Math.max(2, Math.min(98, T(theme).l + 40 * num(o.bright, 0))); }
/** solidInk(state, theme) → 'light' (white ink) on a dark pane, 'dark' (black ink) on a light one: no sampling */
export function solidInk(o, theme) { return paneLightness(o, theme) > 55 ? 'dark' : 'light'; }

/** spacingPx(spacing 0…1) → { gap, inset, pad } in px: the gap between rack windows and their inset from the screen's
 *  edge are 16·s, the padding inside a window 3 + 6.4·s; 0 is flush (all three 0).  The kit before SPACING was gap 10,
 *  inset 10, padding 7 · 7 · 10 (≈ s .63); the default is s .4: gap 6, inset 6, padding 6. */
export function spacingPx(s) {
  const v = Math.max(0, Math.min(1, num(s, 0.4)));
  return v === 0 ? { gap: 0, inset: 0, pad: 0 } : { gap: Math.round(16 * v), inset: Math.round(16 * v), pad: Math.round(3 + 6.4 * v) };
}
