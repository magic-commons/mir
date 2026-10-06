# MIR · THEMES — vanilla themes, tones, and the settings they are made of

A **vanilla theme** is a named set of the kit's built-in look settings and nothing else. Josh, 2026-10-01: *"If you can make it in house from the built in settings, then it's a vanilla skin. If you vibe code specifics into it, then it's a 'name'-spec MIR build/theme."* So a theme has no stylesheet and no code: it is a row of values in `mir/shell/themes.js`, and applying it is one `prefs.set(values)` on the GUI window's look store. A **tone** is a named set of only the colour settings (HUE, TINT, BRIGHT, ACCENT A, ACCENT B, VIVID), stepped under the theme.

See them all at `gallery/themes.html` (every theme × every tone, live; click one to apply it to the page). Choose one in the GUI window: **GUI › MIR OPTIONS › THEME › SKIN** steps through the themes and **TONE** through the theme's tones. Moving any option by hand shows **CUSTOM**.

## The themes

| Theme | What it is | Its settings (beyond the kit's home) | Tones |
|---|---|---|---|
| **FROST** | Glassmorphism. Josh's recipe, the new user's look | REFRACTIVE, FROST always, BLUR 11 (20 on a touch device, alpha.12), VEIL 0, SATURATION 130 %, CORNERS 24, CONTROL FACES glass, TEXT auto (white in dark, as the recipe says; black in light), EDGE off, SHADOW 200 %, SPACING DEFAULT | CLEAR · ROSE · AZURE |
| **MORPH** | Neumorphism | SOLID, CORNERS 20, EDGE off, LIGHT ANGLE 315° (upper left) with the relief LINKED, SHADOW 140 %, DISTANCE 6, SOFTNESS 14, SHINE 70 %, SHINE SOFT 14, glow and parallax off, SPACING AIRY | CLAY · MINT · LILAC · SLATE |
| **CLASSIC** | The 1.4 spirit | TINTED, FROST off (1.4's own default; turned on, the pane thins to .58 and blurs at 22 px, as 1.4 did), solid faces, the relief, CORNERS 14, the house veil, BLUR 22 (1.4's own), SPACING DEFAULT | HOUSE · INK · EMBER |
| **SWIFT** | The fast one (it replaces the preset called LIGHT) | SOLID, relief FLAT, SHADOW 0, MOTION off, glow and parallax off, QUALITY light (the flat tier), SPACING TIGHT | GRAPHITE · SAND · STEEL |
| **AURORA** | The flashy one | REFRACTIVE, FROST always, BLUR 16, VEIL 6, SATURATION 180 %, CORNERS 22, glass faces, SHADOW 150 %, DISTANCE 3, SOFTNESS 14, SHINE 100 %, SHINE SOFT 18, vivid accents, SPACING DEFAULT | BOREALIS · DUSK · SOLAR |
| **NEON** | Near-black panes, accents at full strength: a dark theme in either mode | THEME dark, SOLID, CORNERS 10, EDGE off, SHADOW 0, parallax off, BRIGHT −26 and VIVID 100 % in every tone, SPACING TIGHT | VOLT · MAGENTA · CYAN |

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
| **LIGHT ANGLE** | 0–360° (an arc) | Where the panes' light is, clockwise from straight up. Pane shadows fall away from it and the shine sits toward it | Josh ("bottom right shadow, upper left shine") |
| **RELIEF ANGLE** · LINK | 0–360° (an arc) · on/off | Where the controls' light is: their raise and wells turn with it. LINK makes it LIGHT ANGLE (one light for everything) | BASINS (two lights: panes from above, controls from the upper left); Josh ("let it be more parameters I can mess with") |
| DISTANCE · SOFTNESS | 0–24 px · 0–48 px | How far the shadow falls and how soft it is (the shine uses the same distance) | invention |
| **SHINE** · SHINE SOFT | 0–100 % · 0–48 px | The shadow's opposite: a light 180° across, blended additively | Josh ("set blend mode to 'add' which is shine") |
| **SPACING** | 0 · TIGHT · DEFAULT · AIRY | The rack's air: the gap between its windows, its inset from the screen's edge, the padding inside a pane and the gap in a docked chip rail (`--rack-gap`, `--rack-inset`, `--pane-pad`, `--rail-gap`). 0 is flush | Josh ("an option for 0 padding/margins …"); the levels are BASINS' (`skin.js SPACING`); AIRY is an invention |

### Two lights

BASINS has two lights, and so does the kit since alpha.7: `--light-angle` (LIGHT ANGLE) for the panes and `--relief-angle` (RELIEF ANGLE) for the controls, both on `<html>`; LINK makes the relief take LIGHT ANGLE. The sheets draw from them with CSS `sin()` / `cos()`:
- **the pane shadow** (`html[data-cast]`, written while any light setting is off home) falls away from it, at three heights (pane · floating window · menu: ×1, ×3, ×5 the distance, ×1, ×2.25, ×3.5 the softness). A height scales distance and softness, never darkness: every height wears BASINS' pane alphas (.20 · .12 dark, .10 · .06 light) times SHADOW, so **the cap** is BASINS' own pane shadow at 200 %: alpha .40 · .24 (dark), .20 · .12 (light). FROST's menu, which was .76, is .40;
- **the shine** (`html[data-shine]`, SHINE above 0) sits toward it;
- **the controls' relief** (`--neu-raise`, `--neu-inset`, read through `--relief-raise` / `--relief-well`) turns with RELIEF ANGLE: the highlight toward the light, the drop away. At its home, 315°, it is the 1.4 drawing exactly (`-1px -1px 3px`, `2px 2px 4px`; wells `1px 1px 3px`, `-1px -1px 2px`: computed to the pixel); the top-edge light (`inset 0 1px 0`) never turns. This settles INTENT's O2: two lights, linked or not.

FROST and CLASSIC: panes from above (0°), controls from the upper left (315°), which is BASINS exactly. MORPH: LINK on, the upper left (315°) for everything. AURORA and NEON: as FROST (0° and 315°, unlinked). SWIFT has no relief (FLAT).

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

| SPACING | gap | inset | padding inside | chip rail |
|---|---|---|---|---|
| before this release (no setting) | 10 px | 10 px | 7 · 7 · 10 px | — |
| 0 (BASINS) | 0 | 0 | 6 px | 0 |
| TIGHT (BASINS; SWIFT, NEON) | 3 px | 3 px | 6 px | 2 px |
| **DEFAULT** (BASINS; FROST, CLASSIC, AURORA) | 6 px | 6 px | 8 px | 4 px |
| AIRY (invention; MORPH) | 16 px | 16 px | 9 px | 6 px |

The levels and numbers are BASINS' (Josh's fix, 2026-10-01: `app/skin.js SPACING`, Settings › DISPLAY › SPACING); AIRY is a fourth step after them. A pane's padding never goes under 6 px, so no control touches its edge, and coarse-pointer targets keep their 44 px seats. The rack's dock guides and the transport's dodge read the rack's computed padding, so they follow.

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

## BASINS parity, 1.5.0-alpha.7

BASINS tried its look settings on this engine and found four structural gaps. Each is closed:

| Gap | Closed by |
|---|---|
| BASINS' own panes lost the ABOUT material | `data-mir-surface` (`docs/GUI.md`): an app pane computes what a kit pane computes, every card style × frost × tier |
| TEXT · AUTO overrode BASINS' per-label sampler | TEXT · SAMPLED (offered with `createGui({ inkSampler: true })`) writes no `data-text` |
| GLASS faces were not BASINS' | BASINS' `material.css` §1 list exactly: every neutral face clear in every state, the hairline on knobs, triggers, switches, tracks, fields, faders and readouts |
| Menus and pickers lost the .10 veil | under REFRACTIVE + FROST they wear the theme's frost veil (or VEIL) and the blur, no sheen |

Also: a pane shadow written as `none` breaks nothing (the carried ring, the tooltip's and the badge's seat and the modulation window's resize ring are outlines now), and the transport bar keeps its own 16 px corner under CORNERS, as BASINS' does.

**The comparison** (`.tmp/W7/V/kit-parity.mjs` against BASINS at Josh's recipe, served read-only): the same for a COLOUR-style card (`island`, joined), the bar with the hook, the switch off, the trigger, the knob and the picker. What differs, and why:

| Element | Differs | Why |
|---|---|---|
| a rack button | ink .96 vs 1 | the button's own ink is the app's (`.mir-rack-btn` sets `--fg-soft` too) |
| chosen segment | thin rim, not raised; the accent's colour | INTENT **Chosen** (ruled: never raised); BASINS' accent engine. Its face is clear, as BASINS' |
| segment track | corner 8 vs 9 px | BASINS' app sheet (`skin.css` 532), not a setting |
| switch on | frost face + rim + LED vs accent fill + well | INTENT **ON** (ruled) |
| own-colour fader, arc knob | border 1 px vs 0, the kit's relief vs none, corner | BASINS' COLOUR lanes are their own components (`colour.css` sets `border: 0`, `box-shadow: none`); the hairline colour is the same |
| menu | its shadow at the menu height | INTENT **A pane floats** (ruled: four heights); the darkness is BASINS' |

**GLASS faces against INTENT's wording.** INTENT's states were ruled for the solid faces; under GLASS faces BASINS' drawing is the design, and it differs here:

| State | INTENT says | Under GLASS faces (BASINS) |
|---|---|---|
| Hover | a lighter face | a switch's, a segment's and a field's face stays clear (a knob and a trigger still lighten by their inset wash) |
| Pressed | the press wash and the scale | a trigger's face stays clear: the scale alone (and the raise goes) |
| Chosen | the frost face and rim, the label in accent A | clear: the rim and the accent label only |
| Rest | the face in the tint | clear, with a .08 hairline; a knob loses its groove texture and sheen |
| ON | the frost face, rim and light | unchanged (BASINS paints its own ON) |
| Disabled | one fade, no relief | unchanged |

**The light.** One angle could not reproduce BASINS: its panes cast straight down and its controls down-right. Since alpha.7 there are two settings (above), and FROST is `lightAngle: 0, reliefAngle: 315` in `mir/shell/themes.js`: the knob, trigger, segment track, fader well and arc knob compute BASINS' 1.4 relief exactly, and the panes BASINS' straight-down shadow. Against alpha.4 on `gallery/index.html` and `intent.html` (stylehash) every control's relief is back where it was; what differs is alpha.5–7's own: the tooltip's, badge's and carried window's ring are outlines (the same pixels), no text emboss under glass (O3), a refractive menu under FROST wears the .10 veil and no sheen, and the 44 px power seat.

## BASINS parity, round two (1.5.0-alpha.8)

BASINS' adoption log (rows 21–22) listed what still kept its look and its SAVE window off the kit. Each is closed:

| Gap | Closed by |
|---|---|
| (a) at SHADOW 100 % the pane shadow was the 1.4 glass shadow | the look engine always draws BASINS' material shadow (`html[data-cast]` is on whenever the store is): `inset 0 1px 0` white .12 / .55, `0 2px 8px` black .20 / .10 × SHADOW, `0 1px 2px` .12 / .06 × SHADOW. A page with no store keeps the 1.4 shadows |
| (b) a `chip` surface missed SATURATION | it reads `--surface-filter`; and the engine also writes `--frost-filter` as blur + saturate, for any sheet (an app's, the plugin's) that reads the 1.4 name |
| (c) a disconnected window head was not a pane | under the engine (`html[data-skin]`) the head wears its body's material: the fill by CARD STYLE, the blur, the shadow |
| (d) islands and the modulation chip rail ignored VEIL | the chip rail's fill reads `--surface-veil` (VEIL 0: clear); islands already did |
| (e) a `chip` surface drew the .14 edge with EDGE off | it reads `--pane-edge` (proved: transparent with EDGE off) |
| (f) GLASS faces cleared an app's own fader track | the wells clear by rule now, not by emptying `--glass-well`, so an app's track keeps .28 |
| (g) SHADOW's amount reached the value tooltip | under the cast the tooltip reads `--tip-shadow` (the 1.4 menu shadow); the tiers still reach it |

**The window material** (`createWindow({ material: 'modulation' })` writes `[data-mir-material="modulation"]` on a kit window's root and its rail: it wears the modulation window's material: rail, chips, controls, resize corner; no CSS cloning): the modulation window's rail, controls and corner, as BASINS' SAVE, TIMELINE and COLOUR windows wear them, with no cloning. **Eight rules and two value blocks:** the shared values (`--m2-mat-frost` .13, the controls' `--glass-hairline` .09 dark / .16 light, `--m2-rail-track` 1.2 px) live once in `mir/css/skin.css` and both the plugin's roots and a material window read them; `mir/window/window.css` adds the corner and trigger values and the rules: the chips' tracking, the ON face .13 with one rim (no second inset light), a trigger's 11 px type at 1.32 px, the 18 px resize corner 2 px in, drawn in `--ink-key` at 52–58 % and 70–76 %, opacity .5 (1 on hover or resizing), z 4. The rail's chip shadow is the pane shadow (the cast) and its filter the surface filter, so the settings drive both. BASINS' kwin.js `adoptMaterial` cloned about 1,250 rules for the same thing.

**The SAVE window against FOLDERS with the material** (`.tmp/W8/V/savecmp.mjs`: BASINS read-only, its SAVE window open; `tests/fixtures/folders-basins.html`; BASINS' boot, its light boot and Josh's FROST recipe): the pane, the rail, every chip at rest and ON with their `::before`, the action chip, the grip dots, the field and its label and the resize corner compute the same in all three (the window's place and size aside: layout, not material). What differs:

| Element | Differs | Why |
|---|---|---|
| a toolbar trigger | the raise, where BASINS draws a well | INTENT **Press me** (ruled): a resting control stands proud; a resting toolbar drawn as wells is the "already pressed" fault INTENT was written to stop |
| the options button | a raised trigger face, where BASINS draws a well with a .09 hairline | the same ruling; FOLDERS draws its options button as a trigger (the gallery lane's DOM) |

**The element table again** (`.tmp/W8/V/kit-parity.mjs`, boot and FROST): the COLOUR-style card (at FROST; at boot, disconnected, its corner is the fixture's own 14 px rule: an app's sheet beats the kit's layered rule, so BASINS keeps its card corner only joined), the bar, the switch off, the trigger, the knob and the picker compute BASINS'. Open, all ruled or BASINS' own components: the chosen segment (INTENT Chosen; BASINS' accent engine), the segment track's 9 px corner (BASINS' app sheet), the switch on (INTENT ON), the COLOUR lanes' fader and arc knob (BASINS' own components: `border: 0`, `box-shadow: none`), the menu's height (INTENT four heights), a rack button's ink (the app's).

## BASINS parity, round three (1.5.0-alpha.9)

With these, BASINS' SAVE window and the kit's FOLDERS window (`material: 'modulation'`) compute the same, element by element, at BASINS' boot, at Josh's FROST recipe and in the light TINTED seats (`.tmp/W9/V/savecmp.mjs`, BASINS read-only): the pane, the rail and every chip, the field, the non-toolbar trigger (the plugin's own button: corner, padding, ink, face, edge), the folder tile's ground (.22) and the resize corner. What still differs is ruled: the toolbar's triggers and the options button stand proud where BASINS draws wells (INTENT: a resting control is raised, not "already pressed"), a folder tile is flat where BASINS draws it as a well (a tile is pressed, not a well), and a TINTED pane carries the sheen (INTENT rule 4: tint + sheen).

The light TINTED pane is .86 (it was .84: `--card-opacity` resolved at `:root`), as BASINS'. Under light TINTED the material keeps the light control ladder: that is what BASINS' live SAVE window computes.

## TINTED can blur (1.5.0-alpha.11)

Josh ruled INTENT O12 on 2026-10-02: *"tinted can blur, the blur knob can reach 0 no?"* Rule 4 read: TINTED is tint + sheen, and thins and blurs under FROST as REFRACTIVE does; BLUR 0 is no blur. Since 1.5.0-alpha.12 it reads: TINTED is the tint; a sheen only where the theme gives one (CLASSIC does, FROST does not).

**How the kit draws it.** One token, `--frost-opacity` (.58, `skin.css`'s values). Under `body.frost:not(.frost-hold)[data-card="tinted"]` the body's `--card-opacity` becomes it, and every tinted fill in the kit reads `--card-opacity` where it is used, so the rack cards, `.glass` panes and hooked surfaces, the islands, the disconnected heads and bodies, the menus, the hint and the ⓘ panel (`--popover-fill`), the rail discs (`.mir-chip`, kwin `.crail-chip`), the modulation work bar and the work-bar transport all thin together. The frost filter (`--surface-filter`, else `--frost-filter`) reaches TINTED wherever it reached REFRACTIVE; SOLID never blurs, except the rail discs, which take the chip filter under FROST for every card style (BASINS' rails). The modulation window's chassis keeps its full tint, as BASINS'.

**What lifts it.** FROST · STILL (`frost-hold`): no filter, the full tinted fill. The lite and flat tiers and reduced transparency: no filter, and `tokens.css` sets `--card-opacity` back to the glass opacity, so the pane is the legible .84 / .86 again rather than a .58 pane with nothing behind it.

**BLUR 0.** Both filter names are written as the whole value `none` (`gui.js`); the pane stays at .58, as BASINS' does. So a TINTED pane at BLUR 0 is the .58 tint over the picture, sharp, with no backdrop pass at all. (BASINS at BLUR 0 writes `blur(0px) saturate(1.3)`: the picture behind is still saturated by 1.3. That is the one measured difference at BLUR 0, and it is the ruled one.)

**CLASSIC.** FROST off is its 1.4 default: the still .84 / .86 tinted pane, no filter (the gallery's BLUR readout is 0). With FROST on, CLASSIC is 1.4's frosted card exactly: .58 and `blur(22px)` (WebKit draws 20). SWIFT stays blur-free by its own settings (SOLID, the flat tier).

**Against BASINS** (`.tmp/W11/V/basins-o12.mjs` · `kit-o12.mjs`; BASINS read-only; TINTED + FROST, dark and light, BLUR 11 and 0): rack cards, rack buttons, the bar, the menus, the hint and the ⓘ panel, the disconnected heads and bodies, the modulation rail's discs, the kit rail's discs and the work bar all compute BASINS' fill (`hsl(tint / .58)`) and filter. What stays different is ruled: `none` against `blur(0px) saturate(1.3)` at BLUR 0, and the toast, which blurs with the panes in the kit (BASINS leaves its toast unblurred under TINTED).

## BASINS' missing rows (1.5.0-alpha.12)

| Setting | What it does | From |
|---|---|---|
| TEXT · AUTO, sampled | With an ink sampler (`core/ink.js`, `docs/INK.md`) each label is white or black from the picture beneath it, per label; the theme seat is only what a label wears before its first sample. No pane is repainted and no text shadow is drawn | BASINS `adaptive-ink.js`, `ink.css` §1 |
| ACCENT BRIGHTNESS | 0–100 %: both accents mixed toward white in OKLCH; `--acc`, `--acc2` and every token derived from them follow | BASINS `skin.js setAccentBright` |
| The accents in the project | ACCENT A, B, VIVID and BRIGHTNESS are the one look setting a project carries (`accent` part); opening a project applies them | BASINS `skin.js accentProject` |
| QUALITY · AUTO | the device's tier, measured once (A, B → FULL; C → BALANCED) | BASINS `settings.js` §2 |
| BLUR on first run | 11 px on a desktop, 20 px on a touch device; FROST's BLUR is the device's | BASINS `skin.js newUserBlur`, ruled 2026-10-02 |

**Themes and AUTO.** A theme states every look option, QUALITY included. Since alpha.12 every theme but SWIFT says **AUTO** (the device decides; it was FULL), and SWIFT keeps LIGHT. Every tone states BRIGHTNESS 0, so a tone resets it and a BRIGHTNESS above 0 reads as a CUSTOM tone, as a moved ACCENT A does.

## What an app can delete

- **BASINS:** Settings › LOOK's implementation in `skin.js` (`setFaces`, `setFaceBlend`, `setText`, `setMaterial`, `setMaterialPreset`, `applyGlass`, `setBlur`, `setUIDropShadow`'s pane part, and their prefs keys), `surface-material.js` + `surface-material.css`, the glass-face and popover rules of `material.css` (§1, §2, §4 and the window-edge rule), the TEXT seats of `ink.css` (§1's body and forced seats, and since alpha.12 the sampled seats and §3's generated rungs; `adaptive-ink.js` too, keeping only its 64 × 36 GPU read as the `sample()` it hands `createInkSampler`), and the work bar's `.modxport.mir-mod-power` 44 px rule in `transport-controls.css`. Since 1.5.0-alpha.11 (TINTED can blur) also: the tinted-frost .58 rule of `basins.css` (`body.frost:not(.frost-hold)[data-card="tinted"] .dev, … .glass, … .dev-body`), the frost-filter rules of its `skin.css` (`--frost-filter` on body, the tinted `#transport.mini` filter, the refractive pane filter and the `frost-hold` release), and in `lab.css` §56 the disc's fill and filter by card (`--chip-fill` tinted · tinted-frost .58 · refractive · refractive-frost, `--chip-filter` under FROST and its hold): the kit draws each.
- **Any app:** a rule that drew its own neumorphic relief, its own pane-shadow direction, or its own rack gaps.
