# MIR · THEMES — vanilla themes, tones, and the settings they are made of

A **vanilla theme** is a named set of the kit's built-in look settings and nothing else. Josh, 2026-10-01: *"If you can make it in house from the built in settings, then it's a vanilla skin. If you vibe code specifics into it, then it's a 'name'-spec MIR build/theme."* So a theme has no stylesheet and no code: it is a row of values in `mir/shell/themes.js`, and applying it is one `prefs.set(values)` on the GUI window's look store. A **tone** is a named set of only the colour settings (HUE, TINT, BRIGHT, ACCENT A, ACCENT B, VIVID), stepped under the theme.

See them all at `gallery/themes.html` (every theme × every tone, live; click one to apply it to the page). Choose one in the GUI window: **GUI › MIR OPTIONS › THEME › SKIN** steps through the themes and **TONE** through the theme's tones. Moving any option by hand shows **CUSTOM**.

## The themes

| Theme | What it is | Its settings (beyond the kit's home) | Tones |
|---|---|---|---|
| **FROST** | Glassmorphism. Josh's recipe, the new user's look | REFRACTIVE, FROST always, BLUR 11, VEIL 0, SATURATION 130 %, CORNERS 24, CONTROL FACES glass, TEXT auto (white in dark, as the recipe says; black in light), EDGE off, SHADOW 200 %, SPACING 40 % | CLEAR · ROSE · AZURE |
| **MORPH** | Neumorphism | SOLID, CORNERS 20, EDGE off, LIGHT ANGLE 315° (upper left), SHADOW 140 %, DISTANCE 6, SOFTNESS 14, SHINE 70 %, SHINE SOFT 14, glow and parallax off, SPACING 75 % | CLAY · MINT · LILAC · SLATE |
| **CLASSIC** | The 1.4 spirit | TINTED, solid faces, the relief, CORNERS 14, the house veil, BLUR 22 (1.4's own), SPACING 63 % (1.4's 10 px gap) | HOUSE · INK · EMBER |
| **SWIFT** | The fast one (it replaces the preset called LIGHT) | SOLID, relief FLAT, SHADOW 0, MOTION off, glow and parallax off, QUALITY light (the flat tier), SPACING 25 % | GRAPHITE · SAND · STEEL |
| **AURORA** | The flashy one | REFRACTIVE, FROST always, BLUR 16, VEIL 6, SATURATION 180 %, CORNERS 22, glass faces, SHADOW 150 %, DISTANCE 3, SOFTNESS 14, SHINE 100 %, SHINE SOFT 18, vivid accents, SPACING 50 % | BOREALIS · DUSK · SOLAR |
| **NEON** | Near-black panes, accents at full strength: a dark theme in either mode | THEME dark, SOLID, CORNERS 10, EDGE off, SHADOW 0, parallax off, BRIGHT −26 and VIVID 100 % in every tone, SPACING 20 % | VOLT · MAGENTA · CYAN |

FROST is Josh's; MORPH and CLASSIC are named in the plan; **AURORA, NEON, SWIFT and every tone name are inventions** (Josh rename and cut freely: each is one line of the table in `mir/shell/themes.js`).

A theme states every look option except the user's own: THEME (light · dark · system), HINTS, HELP and DROP GUIDES. So stepping from one theme to another leaves no trace of the last. One theme states THEME as well: NEON is near-black panes in either mode, so it sets dark (a pane lightness that ignored the mode would have left the light theme's faces, rims and ON face on a black pane). Every other theme reads in both modes, and FROST's white text is dark mode's: its TEXT is AUTO, which under glass is BASINS' unsampled seat, the pure ladder in the mode's polarity (in dark the computed ink equals TEXT LIGHT exactly, proved in `tests/themes.browser.mjs`).

## The settings a theme is made of (new in 1.5.0-alpha.5)

All are options of the GUI window's look store (`docs/GUI.md` has every option and its hook). The ones this release added, and where each came from:

| Setting | Range | What it does | From |
|---|---|---|---|
| PANE · **SOLID** | tinted · refractive · solid | A third card style: the pane at full opacity, no blur, no veil, no sheen. Its colour is the glass tint: HUE picks it, **TINT is its saturation**, BRIGHT its lightness; at TINT 0 it is the theme's own (near-black dark, near-white light). Faces wear the pane's colour; the relief is mixed from it | Josh ("a 3rd card style where opacity is maxed and the tint colour becomes stronger") |
| CONTROL FACES | glass · solid | Under REFRACTIVE or FROST the knobs, buttons, switches, segments, fields, faders and readouts are clear glass with a hairline. ON keeps its frost face and the chosen segment its face (INTENT) | BASINS `skin.js setFaces`, `material.css` §1 |
| BLEND | 0–100 % | While FACES is SOLID: the faces cross from solid (0) to glass (100) with a colour-burn (dark) or colour-dodge (light) layer strongest halfway | BASINS `setFaceBlend`, `material.css` BLEND |
| TEXT (INK) | auto · light · dark | White or black ink on every label, the pure ladder (1 · .96 · .86 · .82 · .70) and no emboss. AUTO: under glass (REFRACTIVE, or FROST) the pure ladder in the mode's polarity, as BASINS' unsampled seat; on a SOLID pane the pane's lightness; on a TINTED pane the house ladder. No sampling | BASINS `setText`, `ink.css` (BASINS' AUTO samples the picture through `adaptive-ink.js`; that sampler is the app's and is not in the kit) |
| SHADOW | 0–200 % | The pane shadow's strength. At 100 % and the light at home the kit's own shadows stand; off home the shadow is BASINS' ABOUT shadow at this strength. An alpha.4 switch is migrated: on → the stored look's theme's amount (FROST 200 %, otherwise 100 %), off → 0 | BASINS `surface-material.js projectMaterial` |
| DROP SHADOW | on · off | Display's switch: off is no pane shadow at all | BASINS Settings › DISPLAY |
| BRIGHT · HUE · TINT · SATURATION · VEIL | as before | Now BASINS' formula exactly: the tint's lightness +40 per BRIGHT, its hue to HUE and saturation to 70 % by TINT, **times SATURATION**; the veil is the theme's signed whiteness **plus ½·BRIGHT**, coloured toward HUE by TINT | BASINS `applyGlass` (`mir/core/look.js`) |
| EDGE | on · off | A window pane's hairline rim (`--pane-edge`). Menus and popovers keep theirs | BASINS draws no window edge (`material.css`) |
| **LIGHT ANGLE** | 0–360° (an arc) | Where the one light is, clockwise from straight up. Pane shadows fall away from it, the shine sits toward it, and the controls' relief turns with it | Josh ("bottom right shadow, upper left shine") |
| DISTANCE · SOFTNESS | 0–24 px · 0–48 px | How far the shadow falls and how soft it is (the shine uses the same distance) | invention |
| **SHINE** · SHINE SOFT | 0–100 % · 0–48 px | The shadow's opposite: a light 180° across, blended additively | Josh ("set blend mode to 'add' which is shine") |
| **SPACING** | 0–100 % | The rack's air: the gap between its windows and its inset from the screen's edge are 16 px × SPACING, the padding inside a window 3 + 6.4 px × SPACING. 0 is flush | Josh ("an option for 0 padding/margins for the rack windows and the edge of the screen") |

### One light

`--light-angle` (on `<html>`) is the only direction. The sheets draw from it with CSS `sin()` / `cos()`:
- **the pane shadow** (`html[data-cast]`, written while any light setting is off home) falls away from it, at three heights (pane · floating window · menu: ×1, ×3, ×5 the distance, ×1, ×2.25, ×3.5 the softness). A height scales distance and softness, never darkness: every height wears BASINS' pane alphas (.20 · .12 dark, .10 · .06 light) times SHADOW, so **the cap** is BASINS' own pane shadow at 200 %: alpha .40 · .24 (dark), .20 · .12 (light). FROST's menu, which was .76, is .40;
- **the shine** (`html[data-shine]`, SHINE above 0) sits toward it;
- **the controls' relief** (`--neu-raise`, `--neu-inset`, read through `--relief-raise` / `--relief-well`) turns with it: the highlight toward the light, the drop away. At 315° these are the 1.4 drawing exactly; at FROST's 0° (above, plan ruling 2) the raise is straight up and down. This settles INTENT's O2.

FROST's light is from above (0°). MORPH's is the upper left (315°).

**The shine on each pane species.** A `box-shadow` cannot blend, so the shine needs a layer of its own:

| Pane | How the shine is drawn | Additive? |
|---|---|---|
| a rack card or floating `.dev` window | its free `::before`, `mix-blend-mode: plus-lighter`; the card's paint containment is lifted while it shines | yes |
| the kit window (`.mir-win`), the notebook, a menu, the transport bar, the modulation panes | one more layer of the pane's own shadow list (`--shine-term`): these panes clip their own overflow, so a pseudo-element cannot reach outside them, and the kit owns no sibling for them | no (normal blending) |
| a disconnected window's islands | in their shadow list, as above | no |

It is off in the lite and flat tiers, under reduced transparency, and at SHINE 0: then there is no `html[data-shine]`, no `::before` drawn and no layer at all.

### SOLID, and neumorphism inside it

Inside a SOLID pane the relief is mixed from the pane's own colour: the raise is a lighter mix (`--solid-lit`) toward the light and a darker mix (`--solid-shade`) away from it; the well is the reverse. The wells are a darker mix of the pane. The mixes follow the pane's lightness L (`core/look.js solidRelief`): the highlight rises ΔL = 8 + 20·(1 − L/100) toward white, the shade falls ΔL = 6 + 14·L/100 toward black, and the shine is ×(1 + 1.2·(1 − L/100)). So a dark pane lifts and shines more and a light one sinks more: MORPH's highlight · shade contrast against the pane is 2.63 · 1.21 in dark and 1.17 · 1.38 in light (product 3.18 against 1.61), its shine ×2.04 in dark and ×1.08 in light. **At a window's edge there is no neumorphic depth**: the pane floats by the shadow and the shine only.

INTENT does not change: a dent is a well or a press, never ON or chosen; ON keeps its frost face and its light; chosen keeps the accent label; focus is the ring outside; disabled has no relief. `tests/intent.browser.mjs` runs these under FROST and MORPH in both themes, including "a resting trigger stands proud and is not a well" (the fault neumorphism invites).

**The tiers under SOLID.** A solid pane is already the cheapest surface (no blur, no veil). The tiers still switch: **lite** gives every pane shadow one layer and draws no shine; **flat** turns off the relief, the pane shadows, the shine and the motion.

### SPACING at 0

At 0 (`html[data-flush]`) the rack's windows meet each other and the screen's edge. To leave no sliver of picture and no doubled edge, a rack window in the flush column is **square** (`--surface-radius: 0`), draws **no drop shadow and no shine** (the column is one slab: a shadow would fall across its neighbour), and its top hairline is hidden so only one hairline separates two windows. A window that floats keeps its corner and its shadow. Above 0 nothing of this applies.

| SPACING | gap | inset | padding inside |
|---|---|---|---|
| before this release (no setting) | 10 px | 10 px | 7 · 7 · 10 px |
| **FROST's default, 40 %** | 6 px | 6 px | 6 px |
| 0 % | 0 | 0 | 0 |
| 100 % | 16 px | 16 px | 9 px |

The new default is tighter than 1.4's (Josh: "the dock margins are too large"); a control never touches a pane's edge at the default, and coarse-pointer targets keep their 44 px seats. The rack's dock guides and the transport's dodge read the rack's computed padding, so they follow.

## Contrast, every tile in both modes

`tests/themes.browser.mjs` loads every theme × tone × mode of the wall and measures the label ink against what is under it (the lowest of the ON switch's label on its face, a trigger's label, a knob's label on the pane). On SOLID and TINTED panes it fails under 4.5 : 1; on glass the picture is unknown, so the number is taken over the plain ground and the test fails only if the ink's polarity disagrees with the mode.

| Theme | dark | light |
|---|---|---|
| FROST (glass) | 9.76 · 9.17 · 8.93 | 8.11 · 8.06 · 8.07 |
| MORPH | 8.50 · 8.12 · 8.91 · 8.65 | 7.98 · 8.10 · 7.87 · 7.96 |
| CLASSIC | 6.76 · 6.77 · 6.69 | 4.71 · 4.67 · 4.70 |
| SWIFT | 8.65 · 8.29 · 8.61 | 7.96 · 8.06 · 7.96 |
| AURORA (glass) | 9.64 · 9.72 · 9.68 | 8.11 · 8.03 · 8.09 |
| NEON (dark in either) | 9.85 · 9.86 · 9.82 | 9.85 · 9.86 · 9.82 |

(per tone, in the table's order). CLASSIC's INK tone lost its −5 BRIGHT to clear 4.5 in light. The wall's own DARK / LIGHT control agrees with the mode in both; its chosen label is accent A on the frost face, 3.3 : 1 in light — the kit's accent on a light ON face, not a theme setting.

## What each theme costs

Measured in `tests/themes.browser.mjs` (headless Chromium on the RTX, `tests/fixtures/themes.html`: a rack of three windows, sixteen cards, a pane, the GUI window), the GUI window's own reading taken when each theme was applied. The frame times are headless and capped by the display's 60 Hz, so they say "no frame was missed", not how much headroom there is; the surface counts are exact.

| Theme | surfaces that blur | shadows drawn | shine layers | mean frame |
|---|---|---|---|---|
| FROST | 26 | 106 | 0 | 17.2 ms |
| MORPH | 0 | 83 | 19 | 16.7 ms |
| CLASSIC | 0 | 83 | 0 | 16.7 ms |
| SWIFT | 0 | 33 | 0 | 16.7 ms |
| AURORA | 23 | 83 | 19 | 16.7 ms |
| NEON | 0 | 60 | 0 | 16.7 ms |

The shine's own cost, with the light turning every frame over the sixteen cards under MORPH: 16.75 ms a frame with it, 16.66 ms without (at the 60 Hz cap: no measurable cost here; a real iPad is not measured). The GUI window shows each theme's reading beside its name.

## FROST against BASINS

BASINS (the adoption worktree, served read-only) at Josh's recipe — `setMaterialPreset('about')`, radius 24, shadow 200 %, blur 11, text light, faces glass, disconnected off — against the kit's gallery at FROST, computed styles of the same kinds of element (`.tmp/W5/V/frost-vs-basins.mjs`):

| Element | Same | Differs | Why |
|---|---|---|---|
| rack card | pane fill, blur + saturate, radius 24, shadow (BASINS' ABOUT shadow at 200 %), edge, ink | — | |
| floating pane (a modulation device) | all | — | |
| knob | face (clear), edge, needle | background-image: clear gradients vs `none` (paints nothing); relief from above vs from the upper left | INTENT **O2** settled: the relief follows LIGHT ANGLE, FROST's light is from above (plan ruling 2) |
| trigger | face (clear), hairline, ink | relief from above | INTENT **O2** |
| switch off | all | — | |
| switch on | — | frost face + thin rim vs BASINS' accent fill + well + accent border | INTENT **ON / latched** (ruled): never an accent fill, never a well |
| chosen segment | label in the accent | frost face + rim vs BASINS' clear face and raised relief; the accent's colour | INTENT **Chosen** (ruled): never raised. The accent colour is BASINS' own accent engine (its ACCENT A 180° on its own vivid scale), not a FROST setting |
| segment track | the well's relief colours, hairline | corner 8 vs 9 px; relief from above | the 9 px corner (and BASINS' 3 px padding) is BASINS' own segment design in its app sheet (`skin.css` 532), not a setting: listed for Josh, not taken; the relief is **O2** |
| menu | clear fill, no sheen, blur, rim | its shadow sits at the menu height (0 10px 28px), as dark as BASINS' pane shadow at 200 % (.40) and no darker | INTENT **A pane floats** (ruled): four heights, by distance and softness |
| label ink | white, no emboss | — | |

Every other difference found on the first pass was a defect and was fixed: the knob, trigger and seg faces were still solid (the glass tokens were declared before the faces'), the menu kept the tinted pane's sheen, menus and popovers lost BASINS' rim when EDGE went off (EDGE is now the window panes' alone), and the cast carried a transparent shine layer when SHINE was 0.

## What an app can delete

- **BASINS:** Settings › LOOK's implementation in `skin.js` (`setFaces`, `setFaceBlend`, `setText`, `setMaterial`, `setMaterialPreset`, `applyGlass`, `setBlur`, `setUIDropShadow`'s pane part, and their prefs keys), `surface-material.js` + `surface-material.css`, the glass-face and popover rules of `material.css` (§1, §2, §4 and the window-edge rule), the TEXT seats of `ink.css` (§1's body and forced seats; the per-cell sampler `adaptive-ink.js` stays the app's), and the work bar's `.modxport.mir-mod-power` 44 px rule in `transport-controls.css`.
- **Any app:** a rule that drew its own neumorphic relief, its own pane-shadow direction, or its own rack gaps.
