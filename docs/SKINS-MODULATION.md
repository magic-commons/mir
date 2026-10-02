# MIR · the modulation window's look values (1.5.0-alpha.4)

The modulation plugin's two sheets, `mir/modulation/modhost.css` and `mir/modulation/modwindow/modwindow.css`, hold no look literal below their first block. Every colour, gradient, shadow, filter, radius, border width, font, size, tracking, weight, line height, duration, easing, stroke width and look opacity is a token, declared once in a block at the top of its sheet headed `/* FROST · values */`, and the rules below the block read tokens only.

A skin is a set of values for these names. Today's values are FROST: they are exactly what the sheets drew before the move (proved neutral, element by element and pixel by pixel; see "How this was proved"). FROST is a vanilla theme (a named set of the built-in settings, nothing else); METRO, a 'name'-spec (it needs rules or art outside the settings), will be written against the same names.

Plan: `MIR CLAUDE 1.5 PLAN 2026-10-01` §5.2 ("The literals move last, and exactly"), §7 (1.5.5), §8.3.

## How to change a value

Set the token on the plugin's root, in an app sheet (unlayered, so it beats the kit):

```css
.mir-modwindow, .kwin-chiprail, .m2ghost { --m2-r-6: 0; --m2-face-w07: hsl(0 0% 100% / .12); }
body[data-theme="light"] .mir-modwindow { --m2-ink-a94: hsl(214 30% 10%); }
```

Do not set them on `:root`. The plugin declares them on its own elements, and a declaration on the element wins over an inherited one.

## The blocks

Each sheet's block has up to five parts. They are all in the sheet's own layer (`mir.kit.plugin.host` for modhost.css, `mir.kit.plugin.artifact` for modwindow.css), so an app's plain rule still beats them.

| Part | Declared on | Why there |
|---|---|---|
| `@default` | `.mir-modwindow, .kwin-chiprail, .m2ghost`, the plugin's three roots (where `--m2-mat-*` already lived) | A value with a `var()` in it resolves where it is declared (`docs/TIERS.md`, "Where the values live, and why"). On the roots it resolves against the window's own accent (`--hue-acc` and the rest, which `setAccent()` writes on the window and the rail) and the house's themed inputs, which is what every element inside reads. |
| `@dark`, `@light` | the same three roots behind `:where(body[data-theme="…"])` | The values that differ by theme: the theme arms' ink and wash ladder. `:where()` keeps the gate weightless. |
| `@outside` | `:root` | Values the plugin paints on the HOST's controls (the rings, spans, range bars and the arming fade live on the app's knobs and faders, outside the plugin's roots). Only values with no `var()` in them go here. |
| `@own` | the very rules that read the value (their selectors, copied) | Three cases. (1) A value that reads a PUBLIC ink or accent name (`--fg`, `--fg-soft`, `--acc`, `--acc2`, `--acc-soft`, `--bad`): an app re-points these per element (plan §5.2), so the value must resolve where it is used. (2) A value that reads a property written BELOW the roots (`--aud-live` on an audio range row, `--gl-fill-a/-b`, which a glass-light probe may write per surface). (3) A value with a `var()` that is painted outside the roots. Declared on the painting element, the value resolves exactly as it did inline. |

Naming:

- **Ladders, by value.** `--m2-<role>-w<alpha>` is white at that alpha, `-k<alpha>` black, `-acc-<L>-<alpha>` and `-acc2-<L>-<alpha>` accent A and B at that lightness, `-tint-<alpha>` the glass tint, `-env` the envelope's derived ink. The role is `ink`, `face` (a background), `wash` (a gradient), `edge` (a border), `fill`, `stroke`, `ring` (an outline). So `--m2-ink-w56` is "ink, white at .56" and `--m2-face-w07` is "a face, white at .07". The theme arms' ladder is `--m2-ink-a<alpha>` and `--m2-wash-a<alpha>`: one name, a dark value (`hsl(0 0% 88% / α)`) and a light value (`hsl(214 20% 18% / α)`).
- **Scales, by value.** `--m2-fs-<px>`, `--m2-tr-<em>` (`--m2-tr-08` is `.08em`), `--m2-r-<px>`, `--m2-sw-<width>`, `--m2-lh-<value>`, `--m2-w-<weight>`, `--m2-t-<ms>`, `--m2-ease` (`ease`) and `--m2-ease-spring`.
- **Everything else, by part.** `--m2-<part>-<what>`: shadows, fonts (the whole `font` shorthand), opacities, borders and gradients, named after the element that paints them (`--m2-ghost-shadow`, `--m2-say-font`, `--m2-hero-well`).

Two literals share a token only when the value is identical and the role is the same. White and black written two ways (`rgba(255,255,255,.07)`, `hsl(0 0% 100% / .07)`) are one value, since the computed colour is the same. Values that differ by a hair stay apart: see the table at the foot.

Where a house name is read first (`var(--label-tracking, …)`, `var(--state-focus, …)`, `var(--pane, …)`), only the plugin's fallback moved: `var(--label-tracking, var(--m2-tr-06))`.

The plugin's values were not mapped onto the house primitives (`--r-xs`, `--w-med` and the rest), even where the number is the same. Inside the plugin, the type, radius and spacing scales are restated × `--ui-scale`, so a bare `5px` is not the plugin's `--r-sm`. An app can also set the house primitives, and mapping onto them would carry that setting into the plugin. Motion literals were not mapped onto `--t-*` either, because the `flat` tier rewrites those.

### `mir/modulation/modhost.css`

| block | selector | tokens |
|---|---|---|
| @default | `.mir-modwindow, .kwin-chiprail, .m2ghost` | 61 |
| @dark | `:where(body[data-theme="dark"]) .mir-modwindow, :where(body[data-theme="dark"]) .kwin-chiprail, :where(body[data-theme="dark"]) .m2ghost` | 36 |
| @light | `:where(body[data-theme="light"]) .mir-modwindow, :where(body[data-theme="light"]) .kwin-chiprail, :where(body[data-theme="light"]) .m2ghost` | 36 |
| @outside | `:root` | 1 |
| @own | `#modwin .aud-range-output` | 1 |
| @own | `.k.has-ring > .k-dial` | 1 |
| @own | `.k.has-ring.mod-selected > .k-dial` | 1 |
| @own | `#modwin .aud-level-mix-dial:focus-visible` | 1 |
| @own | `#modwin .aud-range-high` | 1 |
| @own | `#modwin .aud-range-low` | 1 |
| @own | `#modwin .aud-range-zone` | 1 |
| @own | `#modwin.mir-modwindow .m2dev.audio .m2audout.on .m2audled` | 1 |
| @own | `:where(.crail.crail-float).kwin-chiprail[data-mir-rail="modulation"] .crail-chip:where(:focus-visible)` | 1 |
| @own | `#modwin.mir-modwindow .m2dialink.drag::before, #modwin.mir-modwindow .m2kd.drag .m2dialink::before` | 1 |
| @own | `#modwin.mir-modwindow .m2dev .m2chk.on .m2dot, #modwin.mir-modwindow .m2dev .m2swb.on .m2dot` | 1 |
| @own | `#modwin.mir-modwindow .m2dev .m2swb.on::before, #modwin.mir-modwindow .m2dev .m2flipb.on::before` | 1 |
| @own | `#modwin.mir-modwindow .m2dev.m2cmp.lfo .m2lfocmptoggle.on::before` | 1 |
| @own | `#modwin.mir-modwindow .m2slot.m2reorder` | 1 |

**@default** (the plugin roots):

`--m2-aud-level-mix-value-font` · `--m2-aud-range-handle-a-alpha` · `--m2-aud-range-name-font` · `--m2-aud-range-value-font` · `--m2-audsreadout-font` · `--m2-chip-ink-drop` · `--m2-chk-on-shadow` · `--m2-dialink-b-wash` · `--m2-ease` · `--m2-face-tint-18` · `--m2-face-tint-94` · `--m2-face-tint-96` · `--m2-face-tint-97` · `--m2-face-tint-100` · `--m2-face-w06` · `--m2-face-w10` · `--m2-face-w18` · `--m2-fill-tint-100` · `--m2-focus-shadow` · `--m2-fs-12` · `--m2-grab-dots` · `--m2-grab-dots-frost` · `--m2-head-shadow` · `--m2-head-wash` · `--m2-hero-well` · `--m2-i-alpha` · `--m2-input-edge` · `--m2-k-val-font` · `--m2-kind-halo` · `--m2-kn-shadow` · `--m2-lfowave-edge` · `--m2-lfowave-font` · `--m2-lower-alpha` · `--m2-mac-font-2` · `--m2-mac-hover-drop` · `--m2-macadd-font` · `--m2-matrix-edge` · `--m2-matrix-face` · `--m2-mintdot-alpha` · `--m2-mintdot-shadow` · `--m2-mintfill-alpha` · `--m2-r-1` · `--m2-r-2` · `--m2-r-3` · `--m2-r-7` · `--m2-r-14` · `--m2-rail-shadow` · `--m2-say-font` · `--m2-slotx-alpha` · `--m2-sw-1` · `--m2-sw-2` · `--m2-sw-2p2` · `--m2-tempo-bpm-font` · `--m2-tempo-hz-font` · `--m2-tempo-unit-font` · `--m2-tr-04` · `--m2-tr-06` · `--m2-tr-08` · `--m2-tr-035` · `--m2-w-800` · `--m2-win-font`

Carry a `var()` input (resolved where declared): `--m2-aud-level-mix-value-font` · `--m2-aud-range-name-font` · `--m2-aud-range-value-font` · `--m2-audsreadout-font` · `--m2-chip-ink-drop` · `--m2-chk-on-shadow` · `--m2-dialink-b-wash` · `--m2-face-tint-18` · `--m2-face-tint-94` · `--m2-face-tint-96` · `--m2-face-tint-97` · `--m2-face-tint-100` · `--m2-fill-tint-100` · `--m2-focus-shadow` · `--m2-input-edge` · `--m2-k-val-font` · `--m2-kind-halo` · `--m2-lfowave-font` · `--m2-mac-font-2` · `--m2-mac-hover-drop` · `--m2-macadd-font` · `--m2-matrix-edge` · `--m2-rail-shadow` · `--m2-say-font` · `--m2-tempo-bpm-font` · `--m2-tempo-hz-font` · `--m2-tempo-unit-font` · `--m2-win-font`

**@dark** (the dark theme arm):

`--m2-face-k10` · `--m2-ink-a28` · `--m2-ink-a30` · `--m2-ink-a32` · `--m2-ink-a34` · `--m2-ink-a38` · `--m2-ink-a40` · `--m2-ink-a42` · `--m2-ink-a44` · `--m2-ink-a46` · `--m2-ink-a48` · `--m2-ink-a50` · `--m2-ink-a52` · `--m2-ink-a54` · `--m2-ink-a55` · `--m2-ink-a56` · `--m2-ink-a58` · `--m2-ink-a60` · `--m2-ink-a62` · `--m2-ink-a66` · `--m2-ink-a68` · `--m2-ink-a70` · `--m2-ink-a72` · `--m2-ink-a78` · `--m2-ink-a82` · `--m2-ink-a85` · `--m2-ink-a88` · `--m2-ink-a90` · `--m2-ink-a92` · `--m2-ink-a94` · `--m2-wash-a20` · `--m2-wash-a24` · `--m2-wash-a25` · `--m2-wash-a30` · `--m2-wash-a42` · `--m2-wash-a44`

**@light** (the light theme arm):

`--m2-ink-a28` · `--m2-ink-a30` · `--m2-ink-a32` · `--m2-ink-a34` · `--m2-ink-a38` · `--m2-ink-a40` · `--m2-ink-a42` · `--m2-ink-a44` · `--m2-ink-a46` · `--m2-ink-a48` · `--m2-ink-a50` · `--m2-ink-a52` · `--m2-ink-a54` · `--m2-ink-a55` · `--m2-ink-a56` · `--m2-ink-a58` · `--m2-ink-a60` · `--m2-ink-a62` · `--m2-ink-a66` · `--m2-ink-a68` · `--m2-ink-a70` · `--m2-ink-a72` · `--m2-ink-a78` · `--m2-ink-a82` · `--m2-ink-a85` · `--m2-ink-a88` · `--m2-ink-a90` · `--m2-ink-a92` · `--m2-ink-a94` · `--m2-macadd-face` · `--m2-wash-a20` · `--m2-wash-a24` · `--m2-wash-a25` · `--m2-wash-a30` · `--m2-wash-a42` · `--m2-wash-a44`

**@outside** (:root — var()-free values painted on the HOST's controls):

`--m2-fd-alpha`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin .aud-range-output`:

`--m2-aud-range-output-glow`

Carry a `var()` input (resolved where declared): `--m2-aud-range-output-glow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.k.has-ring > .k-dial`:

`--m2-ring-dial-shadow`

Carry a `var()` input (resolved where declared): `--m2-ring-dial-shadow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.k.has-ring.mod-selected > .k-dial`:

`--m2-ring-dial-sel-shadow`

Carry a `var()` input (resolved where declared): `--m2-ring-dial-sel-shadow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin .aud-level-mix-dial:focus-visible`:

`--m2-aud-mix-focus-shadow`

Carry a `var()` input (resolved where declared): `--m2-aud-mix-focus-shadow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin .aud-range-high`:

`--m2-aud-range-high-face`

Carry a `var()` input (resolved where declared): `--m2-aud-range-high-face`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin .aud-range-low`:

`--m2-aud-range-low-face`

Carry a `var()` input (resolved where declared): `--m2-aud-range-low-face`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin .aud-range-zone`:

`--m2-aud-range-zone-face`

Carry a `var()` input (resolved where declared): `--m2-aud-range-zone-face`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin.mir-modwindow .m2dev.audio .m2audout.on .m2audled`:

`--m2-audled-on-glow`

Carry a `var()` input (resolved where declared): `--m2-audled-on-glow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `:where(.crail.crail-float).kwin-chiprail[data-mir-rail="modulation"] .crail-chip:where(:focus-visible)`:

`--m2-chip-ring`

Carry a `var()` input (resolved where declared): `--m2-chip-ring`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin.mir-modwindow .m2dialink.drag::before, #modwin.mir-modwindow .m2kd.drag .m2dialink::before`:

`--m2-dialink-drag-shadow`

Carry a `var()` input (resolved where declared): `--m2-dialink-drag-shadow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin.mir-modwindow .m2dev .m2chk.on .m2dot, #modwin.mir-modwindow .m2dev .m2swb.on .m2dot`:

`--m2-dot-on-glow`

Carry a `var()` input (resolved where declared): `--m2-dot-on-glow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin.mir-modwindow .m2dev .m2swb.on::before, #modwin.mir-modwindow .m2dev .m2flipb.on::before`:

`--m2-dot-on-glow`

Carry a `var()` input (resolved where declared): `--m2-dot-on-glow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin.mir-modwindow .m2dev.m2cmp.lfo .m2lfocmptoggle.on::before`:

`--m2-dot-on-glow`

Carry a `var()` input (resolved where declared): `--m2-dot-on-glow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin.mir-modwindow .m2slot.m2reorder`:

`--m2-reorder-shadow`

Carry a `var()` input (resolved where declared): `--m2-reorder-shadow`

### `mir/modulation/modwindow/modwindow.css`

| block | selector | tokens |
|---|---|---|
| @default | `.mir-modwindow, .kwin-chiprail, .m2ghost` | 248 |
| @outside | `:root` | 10 |
| @own | `[data-m2target].m2droppable, .m2rnlo, .m2span.vert, .m2span.horz, .m2spanarc` | 4 |
| @own | `[data-m2target].m2drop` | 2 |
| @own | `.m2span.vert, .m2span.horz` | 1 |
| @own | `.m2spanlivecap` | 1 |
| @own | `.m2spanlive` | 1 |
| @own | `.m2ringnum` | 1 |
| @own | `.glass.mir-modwindow, .mir-modwindow .glass` | 1 |
| @own | `.crail.crail-float.kwin-chiprail[data-mir-rail="modulation"] .crail-chip::before` | 1 |
| @own | `.m2ringn` | 1 |
| @own | `.mir-modwindow .m2add` | 1 |
| @own | `.mir-modwindow .m2prowdel.m2arm` | 1 |
| @own | `.mir-modwindow .m2dev.audio.m2min .m2audminleds:focus-visible` | 1 |
| @own | `.mir-modwindow .m2dev.audio.m2min .m2audminleds i::after` | 1 |
| @own | `#modwin.mir-modwindow button:focus-visible, #modwin.mir-modwindow input:focus-visible, #modwin.mir-modwindow [role="slider"]:focus-visible` | 1 |
| @own | `.mir-modwindow .m2audsrc:focus-visible` | 1 |
| @own | `.mir-modwindow .m2audinput:focus-visible` | 1 |
| @own | `.crail.crail-float.kwin-chiprail[data-mir-rail="modulation"] .crail-chip:focus-visible` | 1 |
| @own | `.mir-modwindow .m2chk.on .m2dot` | 1 |
| @own | `#modwin.mir-modwindow .m2chk.on .m2dot` | 1 |
| @own | `.modwin.mir-modwindow .m2hold.held` | 1 |
| @own | `#modwin.mir-modwindow .kctl.ctl-frozen:focus-visible` | 1 |
| @own | `.modwin.mir-modwindow .modxport.on` | 1 |
| @own | `.mir-modwindow .m2dev.m2swaphot` | 1 |

**@default** (the plugin roots):

`--m2-add-font` · `--m2-aud-level-mix-value-font` · `--m2-aud-range-handle-a-alpha` · `--m2-audhyst-alpha` · `--m2-audq-alpha` · `--m2-audsbtn-font` · `--m2-audsleg-font` · `--m2-audslot-font` · `--m2-audsrc-edge` · `--m2-audsreadout-font` · `--m2-audtxt-font` · `--m2-body-alpha` · `--m2-button-focus-shadow` · `--m2-button-hover-shadow` · `--m2-button-off-filter` · `--m2-button-press-shadow` · `--m2-chev-edge` · `--m2-chev-edge-2` · `--m2-chip-font` · `--m2-chip-on-shadow` · `--m2-chip-shadow` · `--m2-chk-on-line` · `--m2-colhead-font` · `--m2-deadhead-font` · `--m2-deadmeta-font` · `--m2-deadroute-font` · `--m2-dev-alpha` · `--m2-dev-shadow` · `--m2-dialink-rim` · `--m2-dialink-well` · `--m2-dot-on-shadow` · `--m2-dot-shadow` · `--m2-ease` · `--m2-ease-spring` · `--m2-edge-acc-62-55` · `--m2-edge-acc-65-35` · `--m2-edge-acc2-70-25` · `--m2-edge-acc2-70-58` · `--m2-edge-w09` · `--m2-edge-w10` · `--m2-edge-w14` · `--m2-edge-w20` · `--m2-edge-w22` · `--m2-edge-w34` · `--m2-env-fill-alpha` · `--m2-env-mac-b-font` · `--m2-face-env` · `--m2-face-k10` · `--m2-face-tint-90` · `--m2-face-tint-91` · `--m2-face-tint-96` · `--m2-face-tint-98` · `--m2-face-w04` · `--m2-face-w05` · `--m2-face-w06` · `--m2-face-w07` · `--m2-face-w11` · `--m2-face-w12` · `--m2-face-w13` · `--m2-face-w20` · `--m2-face-w24` · `--m2-face-w25` · `--m2-face-w025` · `--m2-face-w30` · `--m2-face-w035` · `--m2-face-w42` · `--m2-face-w44` · `--m2-face-w045` · `--m2-face-w055` · `--m2-fill-env` · `--m2-fill-tint-98` · `--m2-fill-w035` · `--m2-fill-w45` · `--m2-fill-w50` · `--m2-fill-w58` · `--m2-fill-w075` · `--m2-flipb-font` · `--m2-fs-6p5` · `--m2-fs-7` · `--m2-fs-7p5` · `--m2-fs-8` · `--m2-fs-8p5` · `--m2-fs-11` · `--m2-fs-14` · `--m2-fs-15` · `--m2-fs-17` · `--m2-ghost-shadow` · `--m2-glass-sheen-shadow` · `--m2-glyph-dim` · `--m2-glyph-sw` · `--m2-grab-dots-art` · `--m2-gridtxt-font` · `--m2-head-rule` · `--m2-head-wash-2` · `--m2-hero-shadow` · `--m2-hint-font` · `--m2-ink-env` · `--m2-ink-w28` · `--m2-ink-w30` · `--m2-ink-w32` · `--m2-ink-w34` · `--m2-ink-w38` · `--m2-ink-w40` · `--m2-ink-w42` · `--m2-ink-w44` · `--m2-ink-w46` · `--m2-ink-w48` · `--m2-ink-w50` · `--m2-ink-w52` · `--m2-ink-w54` · `--m2-ink-w55` · `--m2-ink-w56` · `--m2-ink-w58` · `--m2-ink-w60` · `--m2-ink-w62` · `--m2-ink-w66` · `--m2-ink-w68` · `--m2-ink-w70` · `--m2-ink-w72` · `--m2-ink-w78` · `--m2-ink-w82` · `--m2-ink-w85` · `--m2-ink-w88` · `--m2-ink-w90` · `--m2-ink-w92` · `--m2-ink-w94` · `--m2-ink-w100` · `--m2-kctl-alpha` · `--m2-kctl-sel-filter` · `--m2-kctl-sel-shadow` · `--m2-kctl-shadow` · `--m2-kctl-wash` · `--m2-kd-wash` · `--m2-kends-font` · `--m2-kind-font` · `--m2-kpanel-b-alpha` · `--m2-ktab-on-shadow` · `--m2-kval-font` · `--m2-lfo-fill-alpha` · `--m2-lfo-macbox-b-font` · `--m2-lfo-play-alpha` · `--m2-lfo-swb-font` · `--m2-lfocmpcap-font` · `--m2-lfocmpvalue-font` · `--m2-lfostatus-font` · `--m2-lfowave-edge` · `--m2-lfowave-font` · `--m2-lfowave-font-2` · `--m2-lh-1p4` · `--m2-lh-1p25` · `--m2-lh-1p35` · `--m2-lh-10` · `--m2-lower-alpha` · `--m2-mac-edge` · `--m2-mac-font` · `--m2-macadd-font-2` · `--m2-maccap-font` · `--m2-minname-font` · `--m2-minnum-font` · `--m2-minstatus-font` · `--m2-mintdot-alpha` · `--m2-mintfill-alpha` · `--m2-modtap-font` · `--m2-name-font` · `--m2-note-font` · `--m2-num-edge` · `--m2-num-font` · `--m2-numseat-focus-ring` · `--m2-pfold-font` · `--m2-pickb-font` · `--m2-pow-edge` · `--m2-pow-ring-sw` · `--m2-pow-stem-sw` · `--m2-prename-font` · `--m2-prename-ph-alpha` · `--m2-prenav-font` · `--m2-prowtag-font` · `--m2-r-1` · `--m2-r-2` · `--m2-r-3` · `--m2-r-4` · `--m2-r-6` · `--m2-r-7` · `--m2-r-8` · `--m2-r-10` · `--m2-r-15` · `--m2-r-16` · `--m2-rail-edge-shadow` · `--m2-rail-face` · `--m2-railhead-font` · `--m2-resizing-shadow` · `--m2-span-alpha` · `--m2-span-font` · `--m2-spanlive-halo` · `--m2-spark-alpha` · `--m2-status-edge` · `--m2-status-shadow` · `--m2-stroke-env` · `--m2-stroke-w08` · `--m2-stroke-w12` · `--m2-stroke-w13` · `--m2-stroke-w14` · `--m2-stroke-w16` · `--m2-stroke-w17` · `--m2-stroke-w22` · `--m2-stroke-w28` · `--m2-stroke-w32` · `--m2-stroke-w100` · `--m2-sw-0p8` · `--m2-sw-1` · `--m2-sw-1p2` · `--m2-sw-1p5` · `--m2-sw-1p6` · `--m2-sw-1p7` · `--m2-sw-1p15` · `--m2-sw-1p25` · `--m2-sw-2` · `--m2-sw-2p2` · `--m2-sw-3` · `--m2-sw-4` · `--m2-sw-6` · `--m2-t-140` · `--m2-t-240` · `--m2-t-300` · `--m2-tempo-bpm-font-art` · `--m2-tempo-hz-font-art` · `--m2-tempo-unit-font-art` · `--m2-tr-01` · `--m2-tr-04` · `--m2-tr-05` · `--m2-tr-06` · `--m2-tr-07` · `--m2-tr-08` · `--m2-tr-09` · `--m2-tr-10` · `--m2-tr-13` · `--m2-tr-015` · `--m2-tr-025` · `--m2-tr-035` · `--m2-trig-font` · `--m2-vedge-shadow` · `--m2-vname-font` · `--m2-w-400` · `--m2-w-800` · `--m2-win-font` · `--m2-win-shadow` · `--m2-win-wash` · `--m2-xport-sw`

Carry a `var()` input (resolved where declared): `--m2-add-font` · `--m2-aud-level-mix-value-font` · `--m2-audsbtn-font` · `--m2-audsleg-font` · `--m2-audslot-font` · `--m2-audsreadout-font` · `--m2-audtxt-font` · `--m2-chip-font` · `--m2-chip-shadow` · `--m2-chk-on-line` · `--m2-colhead-font` · `--m2-deadhead-font` · `--m2-deadmeta-font` · `--m2-deadroute-font` · `--m2-dev-shadow` · `--m2-dialink-well` · `--m2-edge-acc-62-55` · `--m2-edge-acc-65-35` · `--m2-edge-acc2-70-25` · `--m2-edge-acc2-70-58` · `--m2-env-mac-b-font` · `--m2-face-env` · `--m2-face-tint-90` · `--m2-face-tint-91` · `--m2-face-tint-96` · `--m2-face-tint-98` · `--m2-fill-env` · `--m2-fill-tint-98` · `--m2-flipb-font` · `--m2-glass-sheen-shadow` · `--m2-gridtxt-font` · `--m2-hero-shadow` · `--m2-hint-font` · `--m2-ink-env` · `--m2-kctl-sel-shadow` · `--m2-kd-wash` · `--m2-kends-font` · `--m2-kind-font` · `--m2-ktab-on-shadow` · `--m2-kval-font` · `--m2-lfo-macbox-b-font` · `--m2-lfo-swb-font` · `--m2-lfocmpcap-font` · `--m2-lfocmpvalue-font` · `--m2-lfostatus-font` · `--m2-lfowave-font` · `--m2-lfowave-font-2` · `--m2-mac-font` · `--m2-macadd-font-2` · `--m2-maccap-font` · `--m2-minname-font` · `--m2-minnum-font` · `--m2-minstatus-font` · `--m2-modtap-font` · `--m2-name-font` · `--m2-note-font` · `--m2-num-font` · `--m2-pfold-font` · `--m2-pickb-font` · `--m2-prename-font` · `--m2-prenav-font` · `--m2-prowtag-font` · `--m2-rail-edge-shadow` · `--m2-rail-face` · `--m2-railhead-font` · `--m2-resizing-shadow` · `--m2-span-font` · `--m2-spanlive-halo` · `--m2-stroke-env` · `--m2-tempo-bpm-font-art` · `--m2-tempo-hz-font-art` · `--m2-tempo-unit-font-art` · `--m2-trig-font` · `--m2-vname-font` · `--m2-win-font` · `--m2-win-shadow`

**@outside** (:root — var()-free values painted on the HOST's controls):

`--m2-r-2` · `--m2-r-3` · `--m2-ringarc-alpha` · `--m2-ringarc-dash` · `--m2-ringnum-halo` · `--m2-stroke-w20` · `--m2-sw-0p7` · `--m2-sw-3` · `--m2-sw-4` · `--m2-sw-7`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `[data-m2target].m2droppable, .m2rnlo, .m2span.vert, .m2span.horz, .m2spanarc`:

`--m2-droppable-ring` · `--m2-face-acc2-62-16` · `--m2-ink-acc-62-72` · `--m2-stroke-acc2-66-46`

Carry a `var()` input (resolved where declared): `--m2-droppable-ring` · `--m2-face-acc2-62-16` · `--m2-ink-acc-62-72` · `--m2-stroke-acc2-66-46`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `[data-m2target].m2drop`:

`--m2-drop-glow` · `--m2-drop-ring`

Carry a `var()` input (resolved where declared): `--m2-drop-glow` · `--m2-drop-ring`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.m2span.vert, .m2span.horz`:

`--m2-span-shadow`

Carry a `var()` input (resolved where declared): `--m2-span-shadow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.m2spanlivecap`:

`--m2-spanlivecap-shadow`

Carry a `var()` input (resolved where declared): `--m2-spanlivecap-shadow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.m2spanlive`:

`--m2-spanlive-drop`

Carry a `var()` input (resolved where declared): `--m2-spanlive-drop`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.m2ringnum`:

`--m2-ringnum-font`

Carry a `var()` input (resolved where declared): `--m2-ringnum-font`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.glass.mir-modwindow, .mir-modwindow .glass`:

`--m2-glass-wash`

Carry a `var()` input (resolved where declared): `--m2-glass-wash`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.crail.crail-float.kwin-chiprail[data-mir-rail="modulation"] .crail-chip::before`:

`--m2-glass-wash`

Carry a `var()` input (resolved where declared): `--m2-glass-wash`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.m2ringn`:

`--m2-ringn-font`

Carry a `var()` input (resolved where declared): `--m2-ringn-font`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.mir-modwindow .m2add`:

`--m2-add-edge`

Carry a `var()` input (resolved where declared): `--m2-add-edge`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.mir-modwindow .m2prowdel.m2arm`:

`--m2-arm-shadow`

Carry a `var()` input (resolved where declared): `--m2-arm-shadow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.mir-modwindow .m2dev.audio.m2min .m2audminleds:focus-visible`:

`--m2-audio-audminleds-focus-ring`

Carry a `var()` input (resolved where declared): `--m2-audio-audminleds-focus-ring`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.mir-modwindow .m2dev.audio.m2min .m2audminleds i::after`:

`--m2-audminled-glow`

Carry a `var()` input (resolved where declared): `--m2-audminled-glow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin.mir-modwindow button:focus-visible, #modwin.mir-modwindow input:focus-visible, #modwin.mir-modwindow [role="slider"]:focus-visible`:

`--m2-button-focus-ring`

Carry a `var()` input (resolved where declared): `--m2-button-focus-ring`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.mir-modwindow .m2audsrc:focus-visible`:

`--m2-button-focus-ring`

Carry a `var()` input (resolved where declared): `--m2-button-focus-ring`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.mir-modwindow .m2audinput:focus-visible`:

`--m2-button-focus-ring`

Carry a `var()` input (resolved where declared): `--m2-button-focus-ring`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.crail.crail-float.kwin-chiprail[data-mir-rail="modulation"] .crail-chip:focus-visible`:

`--m2-chip-ring`

Carry a `var()` input (resolved where declared): `--m2-chip-ring`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.mir-modwindow .m2chk.on .m2dot`:

`--m2-dot-on-halo`

Carry a `var()` input (resolved where declared): `--m2-dot-on-halo`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin.mir-modwindow .m2chk.on .m2dot`:

`--m2-dot-on-halo`

Carry a `var()` input (resolved where declared): `--m2-dot-on-halo`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.modwin.mir-modwindow .m2hold.held`:

`--m2-held-shadow`

Carry a `var()` input (resolved where declared): `--m2-held-shadow`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `#modwin.mir-modwindow .kctl.ctl-frozen:focus-visible`:

`--m2-kctl-focus-ring`

Carry a `var()` input (resolved where declared): `--m2-kctl-focus-ring`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.modwin.mir-modwindow .modxport.on`:

`--m2-modxport-on-halo`

Carry a `var()` input (resolved where declared): `--m2-modxport-on-halo`

**@own** (its own elements — values reading a var() that is set below the roots, or painted outside them) — `.mir-modwindow .m2dev.m2swaphot`:

`--m2-swaphot-ring`

Carry a `var()` input (resolved where declared): `--m2-swaphot-ring`

### Themed

A dark and a light value under one name (35): `--m2-ink-a28` · `--m2-ink-a30` · `--m2-ink-a32` · `--m2-ink-a34` · `--m2-ink-a38` · `--m2-ink-a40` · `--m2-ink-a42` · `--m2-ink-a44` · `--m2-ink-a46` · `--m2-ink-a48` · `--m2-ink-a50` · `--m2-ink-a52` · `--m2-ink-a54` · `--m2-ink-a55` · `--m2-ink-a56` · `--m2-ink-a58` · `--m2-ink-a60` · `--m2-ink-a62` · `--m2-ink-a66` · `--m2-ink-a68` · `--m2-ink-a70` · `--m2-ink-a72` · `--m2-ink-a78` · `--m2-ink-a82` · `--m2-ink-a85` · `--m2-ink-a88` · `--m2-ink-a90` · `--m2-ink-a92` · `--m2-ink-a94` · `--m2-wash-a20` · `--m2-wash-a24` · `--m2-wash-a25` · `--m2-wash-a30` · `--m2-wash-a42` · `--m2-wash-a44`

Light only (read only by light-theme rules, 1): `--m2-macadd-face`

## What stays a literal, and why

| Where | What | Why |
|---|---|---|
| `modhost.css`, three rules (`font-size: 0`) | `font-size: 0` | Structure: it collapses the inline gap or hides the text of an icon-only control. The intent lint counts it as a size, and it is the only `lit.*` count left in either sheet. |
| `modwindow.css` `.m2padin` (the hit pad's bar) | `opacity: calc(0.38 + 0.62 * var(--hit, 0))` | A readout, not chrome: the opacity IS the data (`--hit` is written by the script every frame). |
| both sheets | `border-radius: 50%`, `outline-offset`, `stroke-linecap`, `border-style: dashed`, `border-collapse`, `transition-property` lists | Structure (a circle is a circle; an offset positions the focus ring outside) or a keyword a skin would not want to tune. |
| `modwindow.css` `:root`, `:root.fr-light`, `:root.skin-frost…` | the `--m2-mat-*-lum`/`-alpha` derivation ladder, `--m2-motion-*` | Already tokens before this move, on `:root` and keyed to the `fr-light`/`skin-frost` classes. Moving those rules would change their order and weight, which this move does not do. |
| `modhost.css` seat block | `--hue-acc: 172`, `--m2-ink-*` and the rest of the 1.4 seat | Already tokens (the host contract's inputs). |

The intent lint's `!important` counts (4 in modhost.css, 3 in modwindow.css) are the matrix bars' placement, two display switches and the reduced-motion guarantee. They are not look values and are unchanged.

## Values the script writes

`mir/modulation/modwindow/modwindow.js` wrote five look values as SVG attributes. Each is now a token in modwindow.css's `@default` block, read through an inline `style`:

| Was | Now | Token |
|---|---|---|
| `stroke-width="1.9"` on every glyph path (`STROKE`) | `style="stroke-width: var(--m2-glyph-sw)"` | `--m2-glyph-sw: 1.9` |
| `opacity="0.42"` on the work-bar glyphs' dim stroke | `STROKE_DIM`, `opacity: var(--m2-glyph-dim)` | `--m2-glyph-dim: 0.42` |
| the power icon's stem, `'stroke-width': '2.6'` | `style: 'stroke-width: var(--m2-pow-stem-sw)'` | `--m2-pow-stem-sw: 2.6` |
| the power icon's ring, `'stroke-width': '2.2'` | `style: 'stroke-width: var(--m2-pow-ring-sw)'` | `--m2-pow-ring-sw: 2.2` |
| `stroke-width="1.6"` on the transport's play and pause icons | `stroke-width:var(--m2-xport-sw)` in the icon's style | `--m2-xport-sw: 1.6` |

`window.js` writes one look value from script, `liveLed.style.background = 'var(--acc2)'`, which is already a token. The rest of its inline styles are geometry.

## Near-duplicates (for a later look pass, not changed here)

These pairs play the same role and differ by a hair (an alpha within .01, a tracking within .005em). A look pass could merge each pair into one token. That is a visible change and is Josh's call. It was not made here.

| Token | Value | Token | Value |
|---|---|---|---|
| `--m2-edge-w09` | `hsl(0 0% 100% / .09)` | `--m2-edge-w10` | `hsl(0 0% 100% / .10)` |
| `--m2-face-tint-90` | `hsl(var(--glass-tint) / .90)` | `--m2-face-tint-91` | `hsl(var(--glass-tint) / .91)` |
| `--m2-face-tint-96` | `hsl(var(--glass-tint) / .96)` | `--m2-face-tint-97` | `hsl(var(--glass-tint) / 0.97)` |
| `--m2-face-tint-97` | `hsl(var(--glass-tint) / 0.97)` | `--m2-face-tint-98` | `hsl(var(--glass-tint) / .98)` |
| `--m2-face-tint-97` | `hsl(var(--glass-tint) / 0.97)` | `--m2-fill-tint-98` | `hsl(var(--glass-tint) / .98)` |
| `--m2-face-w04` | `rgba(255,255,255,.04)` | `--m2-face-w05` | `rgba(255,255,255,0.05)` |
| `--m2-face-w04` | `rgba(255,255,255,.04)` | `--m2-face-w035` | `rgba(255,255,255,0.035)` |
| `--m2-face-w04` | `rgba(255,255,255,.04)` | `--m2-face-w045` | `rgba(255,255,255,0.045)` |
| `--m2-face-w05` | `rgba(255,255,255,0.05)` | `--m2-face-w06` | `hsl(0 0% 100% / 0.06)` |
| `--m2-face-w05` | `rgba(255,255,255,0.05)` | `--m2-face-w045` | `rgba(255,255,255,0.045)` |
| `--m2-face-w05` | `rgba(255,255,255,0.05)` | `--m2-face-w055` | `rgba(255,255,255,0.055)` |
| `--m2-face-w06` | `hsl(0 0% 100% / 0.06)` | `--m2-face-w07` | `rgba(255,255,255,0.07)` |
| `--m2-face-w06` | `hsl(0 0% 100% / 0.06)` | `--m2-face-w055` | `rgba(255,255,255,0.055)` |
| `--m2-face-w10` | `hsl(0 0% 100% / .10)` | `--m2-face-w11` | `rgba(255,255,255,0.11)` |
| `--m2-face-w11` | `rgba(255,255,255,0.11)` | `--m2-face-w12` | `hsl(0 0% 100% / .12)` |
| `--m2-face-w12` | `hsl(0 0% 100% / .12)` | `--m2-face-w13` | `rgba(255,255,255,0.13)` |
| `--m2-face-w24` | `hsl(0 0% 100% / .24)` | `--m2-face-w25` | `hsl(0 0% 100% / .25)` |
| `--m2-face-w025` | `hsl(0 0% 100% / .025)` | `--m2-face-w035` | `rgba(255,255,255,0.035)` |
| `--m2-face-w035` | `rgba(255,255,255,0.035)` | `--m2-face-w045` | `rgba(255,255,255,0.045)` |
| `--m2-face-w045` | `rgba(255,255,255,0.045)` | `--m2-face-w055` | `rgba(255,255,255,0.055)` |
| `--m2-ink-a54` | `hsl(0 0% 88% / 0.54)` | `--m2-ink-a55` | `hsl(0 0% 88% / 0.55)` |
| `--m2-ink-a55` | `hsl(0 0% 88% / 0.55)` | `--m2-ink-a56` | `hsl(0 0% 88% / 0.56)` |
| `--m2-ink-w54` | `hsl(0 0% 100% / .54)` | `--m2-ink-w55` | `rgba(255,255,255,0.55)` |
| `--m2-ink-w55` | `rgba(255,255,255,0.55)` | `--m2-ink-w56` | `hsl(0 0% 100% / .56)` |
| `--m2-stroke-w12` | `hsl(0 0% 100% / .12)` | `--m2-stroke-w13` | `rgba(255,255,255,0.13)` |
| `--m2-stroke-w13` | `rgba(255,255,255,0.13)` | `--m2-stroke-w14` | `hsl(0 0% 100% / .14)` |
| `--m2-stroke-w16` | `hsl(0 0% 100% / .16)` | `--m2-stroke-w17` | `rgba(255,255,255,0.17)` |
| `--m2-tr-01` | `.01em` | `--m2-tr-015` | `.015em` |
| `--m2-tr-04` | `0.04em` | `--m2-tr-035` | `.035em` |
| `--m2-wash-a24` | `hsl(0 0% 88% / 0.24)` | `--m2-wash-a25` | `hsl(0 0% 88% / 0.25)` |

## How this was proved

`tools/stylehash.mjs`, run three times per configuration: before (the kit at 1.5.0-alpha.3), before again (to mask what moves on its own), and after (the same tree with only these two sheets, and later `modwindow.js`, laid over). It was run once per pass (colours, shadows, type, the rest, the script's values, the remaining weights and patterns) on `gallery/modulation.html` with an LFO, an ENV, an AUDIO and the macros, the clock paused, in eight configurations: the rail in each of its four seats, the device picker open, the matrix dialog open, and the `lite` and `flat` tiers. Each configuration was captured in all eight theme × card × frost states. It was also run on `gallery/index.html`'s modulation card. Every pass showed zero changed elements and zero changed pixels beyond noise. Two kinds of noise appeared: the gallery index's `#page.g-page` side margin, which flips between runs of the unchanged page, and two pixels in one state of one run, which did not reproduce when that configuration was run again.

Hover, focus and press are not driven by stylehash. `tests/plugin-intent.browser.mjs`, `tests/modwindow.browser.mjs`, `tests/tier.browser.mjs` and `tests/widgets.browser.mjs` cover them, and all four pass.

A value moved to `@default` resolves on the plugin's root instead of on the element that paints it. That is the same value as long as nothing between the root and the element redeclares one of its inputs. The move checked every kit sheet and the plugin's script for such redeclarations. Values reading one of them went to `@own`: `--aud-live`, `--hit`, `--signal`, `--fill`, `--needle`, `--m2-env-ink`, `--m2-recess*`, `--m2-plate`, the host-written `--m2-*` inputs, and `--gl-fill-a/-b`. So did every value reading a public ink or accent name. The values left on the roots read only the plugin's own accent numbers (`--hue-acc`, `--sat-acc`, `--hue-acc2`, `--sat-acc2`, which the host contract writes on the window and its rail and nowhere else), the house's glass and relief inputs (`--glass-*`, `--relief-*`, `--surface-*`, `--neu-*`), the type and scale inputs (`--font-*`, `--fs-*`, `--ui-scale`) and the plugin's own `--m2-mat-*`. An app that writes one of those on an element INSIDE the window, rather than on the window or above it, would no longer reach these values. A skin sets the tokens themselves and is not affected.
