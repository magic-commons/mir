# MIR · INTENT — what every shadow, bevel and light means

> *"Things that have shadows or have bevels have meanings, everything should have intent."* — Josh

This is the kit's law for relief, light and state. Josh ruled it on 2026-10-01 (the 1.5 plan, §4 and §9 rulings 1–4). A new app, a new skin and a new component start here. If a drawing is not in this table, it does not go in the kit until it has a row.

The tokens named below are in `mir/tokens.json` (the schema) and `docs/TOKENS.md` (generated from it). Each 1.5 name is read at the place of use with the 1.4 name after the arrow (←) as its fallback. The ones whose value has no `var()` in it are declared in `mir/css/skin.css` (on `:root`, and again for the light theme); the ones that read the accent are not declared and carry their drawing as the fallback. `gallery/intent.html` draws every row of this table with the kit's own controls.

## The vocabulary

| Meaning | How FROST draws it | Token(s) | Never |
|---|---|---|---|
| **A pane floats** over the picture | One drop shadow, **falling down**, in four heights: docked · pane · floating window · menu/popover | heights 1–2 `--surface-shadow` ← `--glass-shadow` (one value today; `--surface-shadow-docked` is reserved for the day they part) · 3 `--surface-shadow-float` · 4 `--surface-shadow-menu` | Falling up. On a button. A fifth height |
| **Press me** (a control that stands proud) | The raised relief | `--relief-raise` ← `--neu-raise` | For "selected" or "on" |
| **A well** (a track, a field you type in, a container) | The inset relief on the well fill | `--relief-well` ← `--neu-inset`, on `--glass-well` | For ON, for pressed, on a resting button |
| **Pressed** (while held) | Sink: the press wash and a small scale down (the `scale` property); a raised control loses its raise | `--state-press` ← `--glass-press` · `--state-press-scale` (.96) | A translate. A well. An accent fill |
| **ON / latched** | The face turns frost with a thin rim; its light, if it has one, lights in accent A with a glow. A switch's light is its LED; a trigger has none, so its label is the light | `--state-on`, `--state-on-rim`; the light `--state-on-light` ← `--acc-glow` | An accent fill. A well. Ink colour alone |
| **Chosen** (one of several) | The same frost face and rim as ON, the label in accent A | `--state-on` + `--state-on-rim` + `--acc` | Raised. A different drawing per window |
| **Hover** | A lighter face (a wash of the hover colour over whatever the face is); a control that stands proud also lifts a pixel (`translate`) | `--state-hover` ← `--glass-raise` | Ink colour alone. A ring |
| **Keyboard focus** | An accent ring **outside** the control, on `:focus-visible` only: an outline, 2 px, offset 2 px | `--state-focus` (an outline shorthand; default `2px solid var(--acc)`) | Inside the control. The browser's default. The hover look |
| **Live** (a value is moving) | A glow in accent A | `--acc`, `--acc-glow` | Accent B |
| **A relationship or time** (a route, a macro, the playhead) | Accent B | `--acc2`, `--acc2-soft` | Accent A. Mixing A and B for the same thing |
| **Carried** (mid-drag) | One height up (the floating window's shadow), plus an accent ring | `--state-carried` = `--surface-shadow-float` + ring | An upward shadow. Two drawings for one carry |
| **Drop here** | A dotted outline that brightens as the thing gets near; solid when it will land | `--prox` (core/proximity.js) + core.css `.mir-prox` | A whole-container line |
| **A value in its own colour** | An arc, or a coloured thumb, with a glow in that colour — and no other relief | `--accent-sweep`, `--nc`, `--m2-slot-ink`; `--glow-own` (proposed) | Raise or well on top of it |
| **Disabled** | Faded, no relief, no pointer | `--state-disabled` (.38) | Keeping its relief. More than one fade |
| **Words on the stage** (INFORMATIONAL: a greeting, a label, a slide) | Ink plus a soft halo in the opposite ink; a jointed line that is only ever flat, 45° or vertical; on request (`data-pane`) the same type on a pane that floats (the surface tokens) | `--info-ink`, `--info-halo`, `--info-line-w` (mir/info/info.css) | A pane by default. A fifth shadow height. Any other line angle |

## The rules

1. **One light, from above.** Every pane shadow falls down; no drop shadow has a negative y offset. A top-edge highlight (`inset 0 1px 0` white) is the light, and it is allowed.
2. **Arc or dial.** An **arc** when the value is cyclic or is drawn in its own colour (hue, phase, a lane's colour, an accent). A **solid dial** for a plain amount. So the glass HUE knob becomes an arc.
3. **Colour things get colour sliders.** The lane pill and the hue swatch from BASINS' COLOUR window become kit controls.
4. **Two materials, one blur.** TINTED is tint + sheen and **never blurs**. REFRACTIVE carries the blur (`--frost-filter`) and the veil. A switched-off blur is the whole filter `none`, never `blur(0)`; a switched-off shadow is `0 0 0 0 transparent`, never `none`.
5. **Accent A** is live signal and emphasis; **accent B** is relationship and time. Resting chrome is achromatic. If a state can be said with material, do not spend colour.
6. **The loading mark is the 3×3 diamond**: the nine squares rotated 45° (`#title .mark`, shell/wordmark.js), turning through the app's palette. It shows in a waiting card's overlay, beside the pointer while busy, and on the logo button. No other spinner.
7. **No dark layers.** No dimming scrim behind a dialog or a curve.
8. **A new relief needs a row here first.** The lint (below) stops the count of known violations from growing.

## Open — not ruled yet

Josh has not ruled these. 1.5.0-alpha.3 built the default in the last column so the kit is whole; each is one place to change.

| # | Question | Before alpha.3 | Built in alpha.3 (a default, not a ruling) |
|---|---|---|---|
| O1 | Are the round header chips (⏻ ⧉ ⇄ ▾ ×) "press me" (raised) or flat glyph seats? | flat on `--glass-raise` with a hairline | left as they were; they gained the hover face and the focus ring |
| O2 | Does "from above" straighten the controls' relief too? `--neu-raise` casts down-right (`2px 2px`) from a top-left light | top-left (skin.css Law 2) | **Settled in alpha.7: two lights, a pane light and a relief light, linked or not; FROST follows BASINS.** LIGHT ANGLE (`--light-angle`) turns the pane shadows and the shine; RELIEF ANGLE (`--relief-angle`) turns the controls' raise and wells; LINK makes the relief take LIGHT ANGLE. FROST and CLASSIC: panes from above (0°), controls from the upper left (315°), which is BASINS and the 1.4 relief exactly; MORPH: linked at the upper left (`docs/THEMES.md`) |
| O3 | The text emboss `--ink-shadow` under `.glass`: delete it (relief on ink), or keep it as legibility over the live field in TINTED? | on in TINTED; BASINS turns it off under its glass ink | **BASINS' answer, alpha.5:** off under REFRACTIVE or FROST and under a forced ink (TEXT LIGHT · DARK); kept on a TINTED pane |
| O4 | The value tooltip (`.k-val`): menu height, or no drop at all? | `--neu-flat` + `0 3px 8px` | a tooltip is a popover: menu height, `--surface-shadow-menu` (the `--neu-flat` seat stays, O10) |
| O5 | A trigger has no LED. Where does its ON light go — the glyph, the label, a dot? | label in accent | the frost face and rim; the label in accent A with the accent glow (`--state-on-light`) |
| O6 | One disabled fade and one press scale: which numbers? | fades .38 / .3 / .45; scales .92 / .94 / .985 | `--state-disabled: .38` and `--state-press-scale: .96`, one token each |
| O7 | The TAB window flash (`.dev.tab-hot`, an accent outline inside): is it focus, or its own meaning? | accent outline, offset −1px | left as it was |
| O8 | The menubar list: TINTED or REFRACTIVE? | a .65 tint *and* a blur | a menu is a pane and wears CARD STYLE: TINTED = the tint, no blur; REFRACTIVE = the veil and the blur. Same for the one tip (`#graphTip`): tinted, no blur. **alpha.5, BASINS' design:** under REFRACTIVE with FROST the hover hint and the ⓘ panel are glass too (the veil and the blur), and under GLASS faces a refractive menu loses the tinted pane's sheen |
| O9 | Drop here: accent A (as core.css draws it) or accent B (it is a relationship)? | accent A | left as it was |
| O10 | `--neu-flat`, "a resting seat" (a 1 px ring): a meaning, or gone? | on `.sw`, `.badge`, `.k-val` | left as it was |
| O11 | Plan §5.2 and F1 §5.2 name the same tokens twice (`--relief-raise` / `--face-relief-raise`, `--state-on` / `--face-fill-on` …). Which spelling? | both in the schema as `proposed`; the plan's are listed first | the plan's: `--relief-*`, `--state-*`. The `--face-*` duplicates are read by nothing and can leave the schema |
| O12 | Rule 4 says TINTED never blurs; BASINS draws its own TINTED panes with the frost blur when FROST is on. Keep rule 4, or let TINTED + FROST blur as BASINS does? | (1.4: FROST blurred every pane, TINTED thinned to .58) | rule 4 is kept: TINTED never blurs, REFRACTIVE carries the blur (alpha.3). **Open for Josh (1.5.0-alpha.9).** Which elements change under each answer is the look lane's eight-row table in its round-three report to the orchestrator; it is not in the tree yet and goes here when it is |

## The vanilla themes keep it

A theme is a set of built-in settings (`docs/THEMES.md`), so it can move the light, the depth and the faces but not the meanings. Under MORPH (neumorphism: SOLID panes, the light upper-left) every dent still means a well or a press: a resting trigger stands proud, ON and CHOSEN wear the frost face and are not wells, the track is the well, disabled has no relief, and every pane shadow falls away from the light. `tests/intent.browser.mjs` checks these under FROST and MORPH in both themes. **Rule 1 reads, since alpha.7: two lights.** The panes' light (LIGHT ANGLE) is above by default and in FROST, so every pane shadow falls down; the controls' light (RELIEF ANGLE) is the upper left, as 1.4 and BASINS draw it. A theme may move either, or LINK them into one light (MORPH).

## How it is kept

- **`tools/lint-intent.mjs`** counts, per kit sheet: look literals outside tokens (colour, shadow, radius, blur, motion, font size, tracking), `:root:root` ladders, `!important`, and the relief breaks a machine can see (a well on a resting button, an accent fill on ON, a raise on a chosen control, a drop shadow falling up, a pane shadow on a button, `blur(0`). It fails only when a count goes **up** against `tools/lint-intent.baseline.json`. `--report` lists every hit with file:line; `--update-baseline` locks in a cleanup.
- **`tests/intent.browser.mjs`** checks in a real browser the rulings a machine can see: no pane shadow falls up (both themes), the four heights stack, ON and CHOSEN wear the frost face and not an accent fill, a TINTED pane and menu never blur under FROST while a REFRACTIVE one does, Tab draws a ring outside, a held control scales, disabled is one fade with no relief.
- **`gallery/intent.html`** is this table, live: each meaning drawn by the kit's own controls, with the theme, card style, frost and tier seats.
- **`mir/tokens.json`** gives every token an `intent` from this table where it carries one; `tests/tokens.node.mjs` keeps the schema and the sheets in step.

## Migration ledger — where the kit's own sheets break this today

The **status** column says where each row stands. The house sheets' rows were fixed in 1.5.0-alpha.3 (before/after plates in `docs/plates/intent/`, proved by `tests/intent.browser.mjs`). The modulation sheets are the PORTED-WINDOW EXCEPTION (STYLE-LOCK): a plugin row is fixed in the host seat (`modhost.css`) where it can be, not by editing the ported artifact.

<!-- ledger:begin -->
*Resolved against the tree at 2026-10-01 16:13 UTC (71 rows, 81 declaration lines). Lines move while 1.5.0 wraps the sheets in layers; the selector is exact, so a moved line is found by it.*

| # | meaning | where (file:line) | selector | what it draws today | fix | status |
|---|---|---|---|---|---|---|
| L01 | pane floats | `css/skin.css:28` | `:root` | the pane float has an UPWARD term `0 -2px 6px` (dark) | drop the term; the value becomes today's `--glass-shadow-flat` (dark) | fixed (alpha.3) |
| L02 | pane floats | `css/skin.css:211` | `body[data-theme="light"]` | the same upward term (light) | the same; `--glass-shadow-flat` (light) | fixed (alpha.3) |
| L03 | pane floats | `modulation/modhost.css:135` | `.mir-modwindow, .kwin-chiprail, .m2ghost` | the plugin's quoted copy of the upward float (dark) | re-quote L01's value, or alias to the 1.5 surface shadow | fixed (alpha.3): every plugin pane reads `var(--surface-shadow, var(--glass-shadow))`, the house value |
| L04 | pane floats | `modulation/modhost.css:299` | `body[data-theme="light"] .mir-modwindow, body[data-theme="light"] .…` | the quoted copy (light) | as L03 | fixed (alpha.3): as L03 |
| L05 | pane floats | `css/base.css:152` | `.dev.floating` | a floating window lifted UP: `0 -5px 14px` | height 3 (floating window), falling down: `--surface-shadow-float` | fixed (alpha.3) |
| L06 | pane floats | `modulation/modwindow/modwindow.css:1820` | `:root` | a second plugin pane height `0 8px 26px` (and `none` under `:root.skin-frost`) beside L03 | one plugin pane height: the house's | fixed (alpha.3): the `:root` copy is gone; the seat declares `--m2-mat-shadow` as the house height |
| L07 | pane floats | `shell/shell.css:98` | `.mb-list` | a menu at PANE height (`--glass-shadow`) | height 4: `--surface-shadow-menu` | fixed (alpha.3) |
| L08 | pane floats | `shell/shell.css:154` | `#menubar .mb-list` | the same, re-issued | as L07 | fixed: one rule (alpha.3) |
| L09 | pane floats | `css/base.css:289` | `#graphTip` | the one tip at PANE height | height 4 | fixed (alpha.3) |
| L10 | pane floats | `css/skin.css:433` | `.native-info .native-info-content, .control-help` | hint and ⓘ panel: literal `0 8px 24px` + inset light, `!important` | height 4 as a token; the `!important` goes (layers) | fixed (alpha.3) |
| L11 | pane floats | `css/skin.css:440` | `body[data-theme="light"] .native-info .native-info-content, body[da…` | the same literal (light) | as L10 | fixed: deleted, the tokens carry the theme (alpha.3) |
| L12 | pane floats | `css/skin.css:126` | `.k-val` | the value tooltip: `--neu-flat` + literal `0 3px 8px` | height 4, or no drop (open: is a value chip a menu?) | fixed: menu height, O4 default (alpha.3) |
| L13 | pane floats | `css/skin.css:171` | `.badge` | a badge: `--neu-flat` + literal `0 4px 12px` | height 1 or 2 as a token | fixed (alpha.3) |
| L14 | pane floats | `shell/shell.css:31` | `#notebook` | the notebook: literal `inset … , 0 8px 24px` (light) | height 3 (it floats like a window) | fixed (alpha.3) |
| L15 | pane floats | `shell/shell.css:33` | `body[data-theme="dark"] #notebook` | the same (dark) | as L14 | fixed (alpha.3) |
| L16 | press me | `modulation/modhost.css:1052` | `:root:root:root #modwin.mir-modwindow .m2dialink::before` | the modulation dial: a second raised-knob drawing (top light + bottom lip, no drop) beside the kit puck's `--neu-raise` | one raised relief: `--relief-raise` | fixed (alpha.3): reads `var(--relief-raise, var(--neu-raise))` |
| L17 | press me | `modulation/modhost.css:1054` | `:root:root:root body[data-theme="light"] #modwin.mir-modwindow .m2d…` | the same (light) | as L16 | fixed (alpha.3): as L16 |
| L18 | pressed | `css/skin.css:137` | `.sw:active` | pressed drawn as a WELL (`--neu-inset` + `--glass-well`), no scale | `--state-press` wash + `--state-press-scale` | fixed (alpha.3) |
| L19 | pressed | `css/skin.css:146` | `.trig:active` | pressed as a well + `translateY(1px)` | `--state-press` + scale down, not a translate | fixed (alpha.3) |
| L20 | pressed | `shell/shell.css:94` | `.nb-dump:active, .ab-home:active` | pressed as `translateY(1px)` | as L19 | fixed (alpha.3) |
| L21 | pressed | `modulation/modhost.css:2017,2018` | `:root:root:root #modwin.mir-modwindow .m2macadd:active:not(:disable…` | pressed: `translateY(1px) scale(.985)` + a literal inset | as L19, one scale | fixed (alpha.3): press wash, no translate; the scale is S1's |
| L22 | on | `css/skin.css:138` | `.sw.on` | ON = accent fill (`--acc-soft`) + WELL (`--neu-inset`) + accent ring | frost face (`--state-on`) + thin rim; the LED is the light | fixed (alpha.3) |
| L23 | on | `css/skin.css:147` | `.trig.on` | ON = accent fill + well + ring; label in accent | as L22; a trigger with no LED gets the light as its label/glyph glow (open: which) | fixed: label glow, O5 default (alpha.3) |
| L24 | on | `css/base.css:225` | `.sw.on` | a second ON fill (hsl accent .28), shadowed by skin.css | delete | deleted (alpha.3) |
| L25 | on | `css/base.css:237` | `.trig.on` | a second ON fill (`--acc-soft`), shadowed by skin.css | delete | deleted (alpha.3) |
| L26 | on | `modulation/modhost.css:2020` | `:root:root:root #modwin.mir-modwindow .m2devadd.on` | ON as a WELL (`--glass-well` + `--neu-inset`) | frost face + rim | fixed (alpha.3): frost face + rim, label in accent A |
| L27 | on | `modulation/modwindow/modwindow.css:913` | `.mir-modwindow .m2swb.on` | ON as an accent fill .32 (out-specified inside `#modwin .m2dev` by modhost.css, whose LED is right) | delete | fixed (alpha.3): deleted (dead) |
| L28 | on | `modulation/modwindow/modwindow.css:1427,1428` | `.mir-modwindow .m2dev.lfo .m2preset.on` | a chosen preset as an accent fill + accent border | frost face; label in accent (CHOSEN) | fixed (alpha.3): ON face + rim, glyph stroked in accent |
| L29 | on | `modulation/modwindow/modwindow.css:1321` | `#modwin.mir-modwindow .m2chk.on, #modwin.mir-modwindow .m2swb.on, #…` | ON as an accent UNDERLINE (`inset 0 -2px 0`) on eight controls | frost face + rim; the bar may stay as the light (accent A + glow) | fixed (alpha.3): frost face + rim; the underline stays as the light (LED switches: the LED; `.modxport.on`: its glyph) |
| L30 | on | `modulation/modwindow/modwindow.css:1392,1393` | `.mir-modwindow .m2dev.m2cmp.lfo .m2lfocmpcmd.on` | the same underline + accent border | as L29 | fixed (alpha.3): frost face; the accent border is the rim; the bar stays |
| L31 | on | `modulation/modwindow/modwindow.css:819` | `.mir-modwindow .m2pow.on` | ON as ink + border only (no face) | frost face + rim + light | fixed (alpha.3): face + rim; the accent glyph is the light |
| L32 | on | `modulation/modhost.css:1146` | `:root:root:root #modwin.mir-modwindow .modtempo.on` | ON as ink colour only | as L31 | fixed (alpha.3): face + rim; the accent ink is the light |
| L33 | chosen | `css/skin.css:143` | `.seg-b.on` | the chosen segment RISES (`--neu-raise`): press-me relief spent on "selected" | frost face, label in accent; no raise | fixed (alpha.3) |
| L34 | chosen | `css/base.css:232` | `.seg-b.on` | a second chosen fill (accent .30), shadowed by skin.css | delete | deleted (alpha.3) |
| L35 | hover | `css/skin.css:119` | `.k:hover .k-dial` | hover as a 1px white RING | a lighter face (`--state-hover`) + small lift | fixed (alpha.3) |
| L36 | hover | `css/skin.css:145` | `.trig:hover` | hover as a 1px white ring | as L35 | fixed (alpha.3) |
| L37 | hover | `css/base.css:83` | `.dev-copy:hover` | hover as INK ALONE (accent) | lighter face | fixed (alpha.3) |
| L38 | hover | `css/base.css:168` | `.dev-pop:hover, .dev-rail:hover` | hover as ink alone | lighter face | fixed (alpha.3) |
| L39 | hover | `shell/shell.css:97` | `.mb-btn:hover` | hover as ink alone, background forced transparent | lighter face | fixed (alpha.3) |
| L40 | hover | `shell/shell.css:68` | `.nb-tools button:hover` | hover as ink alone | lighter face | fixed (alpha.3) |
| L41 | hover | `modulation/modhost.css:1272` | `:root:root:root #modwin.mir-modwindow .m2railhead:hover` | hover as ink alone (one of several in the plugin: `.m2swb`, `.m2mac`, work-bar buttons) | lighter face | fixed (alpha.3): a lighter face, `var(--state-hover, var(--m2-hover))`; the hover ring is gone |
| L42 | focus | `css/skin.css:426` | `.native-info-button:hover, .native-info-button:focus-visible, .nati…` | focus drawn as HOVER, outline removed | the accent ring outside (`--state-focus`) | fixed (alpha.3) |
| L43 | focus | `css/skin.css:444` | `.plane-model:focus-visible` | focus ring drawn INSIDE (offset −2px) | outside | fixed (alpha.3) |
| L44 | focus | `shell/shell.css:38` | `.nb-title:focus` | focus as ink colour | the accent ring outside | fixed (alpha.3) |
| L45 | focus | `shell/shell.css:40` | `.nb-subtitle:focus` | focus as ink colour | as L44 | fixed (alpha.3) |
| L46 | live | `css/skin.css:124` | `.k.live .k-needle, .k.drag .k-needle, .k.active .k-needle` | a LIVE needle with its glow taken away (a dark hairline replaces base.css's `--acc-glow`) | live = a glow in accent A: `--acc-glow` | fixed (alpha.3) |
| L47 | relation | `css/base.css:359` | `.k-ring-edit` | a modulation ROUTE drawn in accent A, while its depth readout (`.k.ring-drag .k-val`) is accent B — one thing in two accents | `--acc2` | fixed (alpha.3) |
| L48 | relation | `css/base.css:360` | `.k-ring-stack` | the summed routes in accent A | `--acc2` | fixed (alpha.3) |
| L49 | relation | `css/base.css:363` | `.k-ring-tick` | the zero-depth route tick in accent A | `--acc2` | fixed (alpha.3) |
| L50 | relation | `css/base.css:367` | `.k-ring-spur` | the overflow spur in accent A | `--acc2` | fixed (alpha.3) |
| L51 | carried | `css/base.css:66` | `.dev.dragging` | carried = accent OUTLINE + opacity .82 … | one drawing: one height up + accent ring | fixed (alpha.3) |
| L52 | carried | `css/skin.css:94,96` | `.dev.dragging` | … and in skin.css = scale 1.012 + an UPWARD shadow + accent ring | one height up (falling down) + accent ring | fixed (alpha.3) |
| L53 | carried | `css/skin.css:288` | `body.disconnected:not(.phone) .dev.dragging > .dev-head, body.disco…` | the same upward carry on the two islands | as L52 | fixed (alpha.3) |
| L54 | own colour | `css/base.css:249` | `.fd.pop .fd-fill` | the own-colour fader reads `--nc`, which nothing writes | wire it, or retire `.fd.pop` (colour sliders are 1.5.x kit controls) | kept: λWAVES builds `.fd.pop` and writes `--nc` (spectrum.js, statesview.js), so the rule is live |
| L55 | disabled | `css/base.css:217` | `.k.disabled` | disabled .38 … (and the puck keeps its raise) | one `--state-disabled`, relief none | fixed (alpha.3) |
| L56 | disabled | `css/skin.css:131` | `.k.disabled` | … and .3 in skin.css (the knob and fader are faded twice-defined) | as L55 | fixed (alpha.3) |
| L57 | disabled | `css/skin.css:132` | `.fd.disabled` | fader .3 vs base.css .38 | as L55 | fixed (alpha.3) |
| L58 | disabled | `css/base.css:219` | `.sw.disabled, .sw:disabled, .seg-b:disabled, .trig:disabled` | disabled .38 with the raise still drawn | relief none | fixed (alpha.3) |
| L59 | disabled | `shell/shell.css:103` | `.mb-item:disabled` | a third fade, .45 | one value | fixed (alpha.3) |
| L60 | meaningless relief | `css/base.css:127` | `.glass` | an emboss on every glyph inside `.glass` (`--ink-shadow`): relief on ink | none (open: legibility over the live field — see Open) | open (O3) |
| L61 | meaningless relief | `modulation/modwindow/modwindow.css:17` | `.glass.mir-modwindow, .mir-modwindow .glass` | the bevel token: every light transparent, draws nothing | delete with the `--gl-*` lights | fixed (alpha.3): `--glass-bevel` and its six lights deleted |
| L62 | meaningless relief | `modulation/modwindow/modwindow.css:52,68,83,316,384,1856` | (several rules: `box-shadow: …, var(--glass-bevel)`) | composes the inert bevel into a shadow list | drop `var(--glass-bevel)` from the list | fixed (alpha.3): `var(--glass-bevel)` dropped from all six lists |
| L63 | meaningless relief | `css/skin.css:30` | `:root` | declared, read by nothing | becomes the value of `--glass-shadow` (L01), then the name goes | fixed: the name is gone (alpha.3) |
| L64 | material | `css/skin.css:228` | `body.frost .dev, body.frost .glass` | FROST blurs every pane, TINTED included | scope to `[data-card="refractive"]` | fixed (alpha.3) |
| L65 | material | `css/skin.css:233` | `body.frost:not(.frost-hold)[data-card="tinted"] .dev, body.frost:no…` | TINTED thins to .58 under FROST so the blur shows | delete: TINTED keeps `--card-opacity` | fixed (alpha.3) |
| L66 | material | `css/skin.css:234` | `body.disconnected.frost:not(.frost-hold)[data-card="tinted"]:not(.p…` | the same .58 on the disconnected body | delete | fixed (alpha.3) |
| L67 | material | `css/skin.css:266` | `body.disconnected.frost:not(.phone) .dev > .dev-body` | the disconnected body blurs whatever the card style | gate on refractive | fixed (alpha.3) |
| L68 | material | `css/skin.css:268,269` | `body.disconnected.frost:not(.phone) .dev > .dev-head` | the disconnected head blurs whatever the card style | gate on refractive | fixed (alpha.3) |
| L69 | material | `css/base.css:290` | `#graphTip` | a .97 TINTED tip that also blurs | no blur (it is tinted) | fixed (alpha.3) |
| L70 | material | `shell/shell.css:154` | `#menubar .mb-list` | a .65 tint WITH blur: neither material | one material (open: which) | fixed: card material, O8 default (alpha.3) |
| L71 | material | `modulation/modhost.css:1670` | `.mod-matrix::backdrop` | a dark dimming scrim `#0008` + literal `blur(8px)` behind the matrix dialog — the "dark layer" Josh asked to avoid | no dark scrim; if a blur, REFRACTIVE's token | fixed (alpha.3): `background: transparent`, no scrim, no blur |
<!-- ledger:end -->

**Two gaps that are not one line each**

| # | meaning | where | what it draws today | fix | status |
|---|---|---|---|---|---|
| S1 | pressed | every `:active` rule in the kit: 73 rules (base 5 · skin 4 · shell 1 · modhost 22 · modwindow 41) | a wash alone; **one** of the 73 scales (modhost `.m2macadd`, L21) | add `--state-press-scale` to the press drawing once, at the widget level | house: fixed in alpha.3 (one `scale` rule for `.sw`, `.seg-b`, `.trig`, `.dev-fold`, and the notebook's two buttons); plugin: fixed in alpha.3 (`scale: var(--state-press-scale, .96)` on `#modwin button:active`, the chip rail and chips) |
| S2 | focus | `.trig`, `.sw`, `.seg-b`, `.k-dial`, `.fd`, `select.sel`, the header chips (base.css, skin.css) | **no focus rule at all**: the browser's default ring. `.k` and `.fd` only reveal their value on `:focus-within` | one `--state-focus` ring outside, on `:focus-visible`; modhost.css entry 50 already draws it right inside the plugin | house: fixed in alpha.3 (one rule in skin.css for the widgets, the header chips, the ⓘ button and the plane model; one in shell.css for the menubar and the notebook); plugin: its accent ring reads `var(--state-focus, …)` (alpha.3) |

**Counted, not listed:** the literal census and the mechanical relief counts are the lint's baseline (`tools/lint-intent.baseline.json`; `node tools/lint-intent.mjs --report` for every site).
