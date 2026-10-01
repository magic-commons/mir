# MIR · INTENT — what every shadow, bevel and light means

> *"Things that have shadows or have bevels have meanings, everything should have intent."* — Josh

This is the kit's law for relief, light and state. Josh ruled it on 2026-10-01 (the 1.5 plan, §4 and §9 rulings 1–4). A new app, a new skin and a new component start here. If a drawing is not in this table, it does not go in the kit until it has a row.

The tokens named below are in `mir/tokens.json` (the schema) and `docs/TOKENS.md` (generated from it). A name in *italics* is the 1.5 name; it is proposed in the schema and reads the 1.4 name beside it as its fallback until it lands.

## The vocabulary

| Meaning | How FROST draws it | Token(s) | Never |
|---|---|---|---|
| **A pane floats** over the picture | One drop shadow, **falling down**, in four heights: docked · pane · floating window · menu/popover | `--glass-shadow` → *`--surface-shadow-docked`*, *`--surface-shadow`*, *`--surface-shadow-float`*, *`--surface-shadow-menu`* | Falling up. On a button. A fifth height |
| **Press me** (a control that stands proud) | The raised relief | `--neu-raise` → *`--relief-raise`* | For "selected" or "on" |
| **A well** (a track, a field you type in, a container) | The inset relief on the well fill | `--neu-inset` + `--glass-well` → *`--relief-well`* | For ON, for pressed, on a resting button |
| **Pressed** (while held) | Sink: an inset wash and a small scale down | `--glass-press` → *`--state-press`*, *`--state-press-scale`* | A translate. A well. An accent fill |
| **ON / latched** | The face turns frost with a thin rim; its light, if it has one, lights in accent A with a glow | `--m2-mat-frost` → *`--state-on`*, *`--state-on-rim`*; the light `--acc` + `--acc-glow` → *`--state-on-light`* | An accent fill. A well. Ink colour alone |
| **Chosen** (one of several) | The same frost face as ON, the label in accent A | *`--state-on`* + `--acc` | Raised. A different drawing per window |
| **Hover** | A lighter face and a small lift | `--glass-raise` → *`--state-hover`* | Ink colour alone. A ring |
| **Keyboard focus** | An accent ring **outside** the control | *`--state-focus`* (its 1.4 form is modhost.css entry 50) | Inside the control. The browser's default. The hover look |
| **Live** (a value is moving) | A glow in accent A | `--acc`, `--acc-glow` | Accent B |
| **A relationship or time** (a route, a macro, the playhead) | Accent B | `--acc2`, `--acc2-soft` | Accent A. Mixing A and B for the same thing |
| **Carried** (mid-drag) | One height up, plus an accent ring | *`--state-carried`* | An upward shadow. Two drawings for one carry |
| **Drop here** | A dotted outline that brightens as the thing gets near; solid when it will land | `--prox` (core/proximity.js) + core.css `.mir-prox` | A whole-container line |
| **A value in its own colour** | An arc, or a coloured thumb, with a glow in that colour — and no other relief | `--accent-sweep`, `--nc`, `--m2-slot-ink`; *`--glow-own`* | Raise or well on top of it |
| **Disabled** | Faded, no relief | *`--state-disabled`* | Keeping its relief. More than one fade |

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

| # | Question | Today |
|---|---|---|
| O1 | Are the round header chips (⏻ ⧉ ⇄ ▾ ×) "press me" (raised) or flat glyph seats? | flat on `--glass-raise` with a hairline |
| O2 | Does "from above" straighten the controls' relief too? `--neu-raise` casts down-right (`2px 2px`) from a top-left light | top-left (skin.css Law 2) |
| O3 | The text emboss `--ink-shadow` under `.glass`: delete it (relief on ink), or keep it as legibility over the live field in TINTED? | on in TINTED; BASINS turns it off under its glass ink |
| O4 | The value tooltip (`.k-val`): menu height, or no drop at all? | `--neu-flat` + `0 3px 8px` |
| O5 | A trigger has no LED. Where does its ON light go — the glyph, the label, a dot? | label in accent |
| O6 | One disabled fade and one press scale: which numbers? | fades .38 / .3 / .45; scales .92 / .94 / .985 |
| O7 | The TAB window flash (`.dev.tab-hot`, an accent outline inside): is it focus, or its own meaning? | accent outline, offset −1px |
| O8 | The menubar list: TINTED or REFRACTIVE? | a .65 tint *and* a blur |
| O9 | Drop here: accent A (as core.css draws it) or accent B (it is a relationship)? | accent A |
| O10 | `--neu-flat`, "a resting seat" (a 1 px ring): a meaning, or gone? | on `.sw`, `.badge`, `.k-val` |
| O11 | Plan §5.2 and F1 §5.2 name the same tokens twice (`--relief-raise` / `--face-relief-raise`, `--state-on` / `--face-fill-on` …). Which spelling? | both in the schema as `proposed`; the plan's are listed first |

## How it is kept

- **`tools/lint-intent.mjs`** counts, per kit sheet: look literals outside tokens (colour, shadow, radius, blur, motion, font size, tracking), `:root:root` ladders, `!important`, and the relief breaks a machine can see (a well on a resting button, an accent fill on ON, a raise on a chosen control, a drop shadow falling up, a pane shadow on a button, `blur(0`). It fails only when a count goes **up** against `tools/lint-intent.baseline.json`. `--report` lists every hit with file:line; `--update-baseline` locks in a cleanup.
- **`mir/tokens.json`** gives every token an `intent` from this table where it carries one; `tests/tokens.node.mjs` keeps the schema and the sheets in step.

## Migration ledger — where the kit's own sheets break this today

These are the fixes the next lane makes. Each one changes pixels, so each is proved and shown to Josh separately; none is made here. The modulation sheets are the PORTED-WINDOW EXCEPTION (STYLE-LOCK): a plugin row is fixed in the host seat (`modhost.css`) where it can be, not by editing the ported artifact.

<!-- ledger:begin -->
*Resolved against the tree at 2026-10-01 16:13 UTC (71 rows, 81 declaration lines). Lines move while 1.5.0 wraps the sheets in layers; the selector is exact, so a moved line is found by it.*

| # | meaning | where (file:line) | selector | what it draws today | fix |
|---|---|---|---|---|---|
| L01 | pane floats | `css/skin.css:28` | `:root` | the pane float has an UPWARD term `0 -2px 6px` (dark) | drop the term; the value becomes today's `--glass-shadow-flat` (dark) |
| L02 | pane floats | `css/skin.css:211` | `body[data-theme="light"]` | the same upward term (light) | the same; `--glass-shadow-flat` (light) |
| L03 | pane floats | `modulation/modhost.css:135` | `.mir-modwindow, .kwin-chiprail, .m2ghost` | the plugin's quoted copy of the upward float (dark) | re-quote L01's value, or alias to the 1.5 surface shadow |
| L04 | pane floats | `modulation/modhost.css:299` | `body[data-theme="light"] .mir-modwindow, body[data-theme="light"] .…` | the quoted copy (light) | as L03 |
| L05 | pane floats | `css/base.css:152` | `.dev.floating` | a floating window lifted UP: `0 -5px 14px` | height 3 (floating window), falling down: `--surface-shadow-float` |
| L06 | pane floats | `modulation/modwindow/modwindow.css:1820` | `:root` | a second plugin pane height `0 8px 26px` (and `none` under `:root.skin-frost`) beside L03 | one plugin pane height: the house's |
| L07 | pane floats | `shell/shell.css:98` | `.mb-list` | a menu at PANE height (`--glass-shadow`) | height 4: `--surface-shadow-menu` |
| L08 | pane floats | `shell/shell.css:154` | `#menubar .mb-list` | the same, re-issued | as L07 |
| L09 | pane floats | `css/base.css:289` | `#graphTip` | the one tip at PANE height | height 4 |
| L10 | pane floats | `css/skin.css:433` | `.native-info .native-info-content, .control-help` | hint and ⓘ panel: literal `0 8px 24px` + inset light, `!important` | height 4 as a token; the `!important` goes (layers) |
| L11 | pane floats | `css/skin.css:440` | `body[data-theme="light"] .native-info .native-info-content, body[da…` | the same literal (light) | as L10 |
| L12 | pane floats | `css/skin.css:126` | `.k-val` | the value tooltip: `--neu-flat` + literal `0 3px 8px` | height 4, or no drop (open: is a value chip a menu?) |
| L13 | pane floats | `css/skin.css:171` | `.badge` | a badge: `--neu-flat` + literal `0 4px 12px` | height 1 or 2 as a token |
| L14 | pane floats | `shell/shell.css:31` | `#notebook` | the notebook: literal `inset … , 0 8px 24px` (light) | height 3 (it floats like a window) |
| L15 | pane floats | `shell/shell.css:33` | `body[data-theme="dark"] #notebook` | the same (dark) | as L14 |
| L16 | press me | `modulation/modhost.css:1052` | `:root:root:root #modwin.mir-modwindow .m2dialink::before` | the modulation dial: a second raised-knob drawing (top light + bottom lip, no drop) beside the kit puck's `--neu-raise` | one raised relief: `--relief-raise` |
| L17 | press me | `modulation/modhost.css:1054` | `:root:root:root body[data-theme="light"] #modwin.mir-modwindow .m2d…` | the same (light) | as L16 |
| L18 | pressed | `css/skin.css:137` | `.sw:active` | pressed drawn as a WELL (`--neu-inset` + `--glass-well`), no scale | `--state-press` wash + `--state-press-scale` |
| L19 | pressed | `css/skin.css:146` | `.trig:active` | pressed as a well + `translateY(1px)` | `--state-press` + scale down, not a translate |
| L20 | pressed | `shell/shell.css:94` | `.nb-dump:active, .ab-home:active` | pressed as `translateY(1px)` | as L19 |
| L21 | pressed | `modulation/modhost.css:2017,2018` | `:root:root:root #modwin.mir-modwindow .m2macadd:active:not(:disable…` | pressed: `translateY(1px) scale(.985)` + a literal inset | as L19, one scale |
| L22 | on | `css/skin.css:138` | `.sw.on` | ON = accent fill (`--acc-soft`) + WELL (`--neu-inset`) + accent ring | frost face (`--state-on`) + thin rim; the LED is the light |
| L23 | on | `css/skin.css:147` | `.trig.on` | ON = accent fill + well + ring; label in accent | as L22; a trigger with no LED gets the light as its label/glyph glow (open: which) |
| L24 | on | `css/base.css:225` | `.sw.on` | a second ON fill (hsl accent .28), shadowed by skin.css | delete |
| L25 | on | `css/base.css:237` | `.trig.on` | a second ON fill (`--acc-soft`), shadowed by skin.css | delete |
| L26 | on | `modulation/modhost.css:2020` | `:root:root:root #modwin.mir-modwindow .m2devadd.on` | ON as a WELL (`--glass-well` + `--neu-inset`) | frost face + rim |
| L27 | on | `modulation/modwindow/modwindow.css:913` | `.mir-modwindow .m2swb.on` | ON as an accent fill .32 (out-specified inside `#modwin .m2dev` by modhost.css, whose LED is right) | delete |
| L28 | on | `modulation/modwindow/modwindow.css:1427,1428` | `.mir-modwindow .m2dev.lfo .m2preset.on` | a chosen preset as an accent fill + accent border | frost face; label in accent (CHOSEN) |
| L29 | on | `modulation/modwindow/modwindow.css:1321` | `#modwin.mir-modwindow .m2chk.on, #modwin.mir-modwindow .m2swb.on, #…` | ON as an accent UNDERLINE (`inset 0 -2px 0`) on eight controls | frost face + rim; the bar may stay as the light (accent A + glow) |
| L30 | on | `modulation/modwindow/modwindow.css:1392,1393` | `.mir-modwindow .m2dev.m2cmp.lfo .m2lfocmpcmd.on` | the same underline + accent border | as L29 |
| L31 | on | `modulation/modwindow/modwindow.css:819` | `.mir-modwindow .m2pow.on` | ON as ink + border only (no face) | frost face + rim + light |
| L32 | on | `modulation/modhost.css:1146` | `:root:root:root #modwin.mir-modwindow .modtempo.on` | ON as ink colour only | as L31 |
| L33 | chosen | `css/skin.css:143` | `.seg-b.on` | the chosen segment RISES (`--neu-raise`): press-me relief spent on "selected" | frost face, label in accent; no raise |
| L34 | chosen | `css/base.css:232` | `.seg-b.on` | a second chosen fill (accent .30), shadowed by skin.css | delete |
| L35 | hover | `css/skin.css:119` | `.k:hover .k-dial` | hover as a 1px white RING | a lighter face (`--state-hover`) + small lift |
| L36 | hover | `css/skin.css:145` | `.trig:hover` | hover as a 1px white ring | as L35 |
| L37 | hover | `css/base.css:83` | `.dev-copy:hover` | hover as INK ALONE (accent) | lighter face |
| L38 | hover | `css/base.css:168` | `.dev-pop:hover, .dev-rail:hover` | hover as ink alone | lighter face |
| L39 | hover | `shell/shell.css:97` | `.mb-btn:hover` | hover as ink alone, background forced transparent | lighter face |
| L40 | hover | `shell/shell.css:68` | `.nb-tools button:hover` | hover as ink alone | lighter face |
| L41 | hover | `modulation/modhost.css:1272` | `:root:root:root #modwin.mir-modwindow .m2railhead:hover` | hover as ink alone (one of several in the plugin: `.m2swb`, `.m2mac`, work-bar buttons) | lighter face |
| L42 | focus | `css/skin.css:426` | `.native-info-button:hover, .native-info-button:focus-visible, .nati…` | focus drawn as HOVER, outline removed | the accent ring outside (`--state-focus`) |
| L43 | focus | `css/skin.css:444` | `.plane-model:focus-visible` | focus ring drawn INSIDE (offset −2px) | outside |
| L44 | focus | `shell/shell.css:38` | `.nb-title:focus` | focus as ink colour | the accent ring outside |
| L45 | focus | `shell/shell.css:40` | `.nb-subtitle:focus` | focus as ink colour | as L44 |
| L46 | live | `css/skin.css:124` | `.k.live .k-needle, .k.drag .k-needle, .k.active .k-needle` | a LIVE needle with its glow taken away (a dark hairline replaces base.css's `--acc-glow`) | live = a glow in accent A: `--acc-glow` |
| L47 | relation | `css/base.css:359` | `.k-ring-edit` | a modulation ROUTE drawn in accent A, while its depth readout (`.k.ring-drag .k-val`) is accent B — one thing in two accents | `--acc2` |
| L48 | relation | `css/base.css:360` | `.k-ring-stack` | the summed routes in accent A | `--acc2` |
| L49 | relation | `css/base.css:363` | `.k-ring-tick` | the zero-depth route tick in accent A | `--acc2` |
| L50 | relation | `css/base.css:367` | `.k-ring-spur` | the overflow spur in accent A | `--acc2` |
| L51 | carried | `css/base.css:66` | `.dev.dragging` | carried = accent OUTLINE + opacity .82 … | one drawing: one height up + accent ring |
| L52 | carried | `css/skin.css:94,96` | `.dev.dragging` | … and in skin.css = scale 1.012 + an UPWARD shadow + accent ring | one height up (falling down) + accent ring |
| L53 | carried | `css/skin.css:288` | `body.disconnected:not(.phone) .dev.dragging > .dev-head, body.disco…` | the same upward carry on the two islands | as L52 |
| L54 | own colour | `css/base.css:249` | `.fd.pop .fd-fill` | the own-colour fader reads `--nc`, which nothing writes | wire it, or retire `.fd.pop` (colour sliders are 1.5.x kit controls) |
| L55 | disabled | `css/base.css:217` | `.k.disabled` | disabled .38 … (and the puck keeps its raise) | one `--state-disabled`, relief none |
| L56 | disabled | `css/skin.css:131` | `.k.disabled` | … and .3 in skin.css (the knob and fader are faded twice-defined) | as L55 |
| L57 | disabled | `css/skin.css:132` | `.fd.disabled` | fader .3 vs base.css .38 | as L55 |
| L58 | disabled | `css/base.css:219` | `.sw.disabled, .sw:disabled, .seg-b:disabled, .trig:disabled` | disabled .38 with the raise still drawn | relief none |
| L59 | disabled | `shell/shell.css:103` | `.mb-item:disabled` | a third fade, .45 | one value |
| L60 | meaningless relief | `css/base.css:127` | `.glass` | an emboss on every glyph inside `.glass` (`--ink-shadow`): relief on ink | none (open: legibility over the live field — see Open) |
| L61 | meaningless relief | `modulation/modwindow/modwindow.css:17` | `.glass.mir-modwindow, .mir-modwindow .glass` | the bevel token: every light transparent, draws nothing | delete with the `--gl-*` lights |
| L62 | meaningless relief | `modulation/modwindow/modwindow.css:52,68,83,316,384,1856` | (several rules: `box-shadow: …, var(--glass-bevel)`) | composes the inert bevel into a shadow list | drop `var(--glass-bevel)` from the list |
| L63 | meaningless relief | `css/skin.css:30` | `:root` | declared, read by nothing | becomes the value of `--glass-shadow` (L01), then the name goes |
| L64 | material | `css/skin.css:228` | `body.frost .dev, body.frost .glass` | FROST blurs every pane, TINTED included | scope to `[data-card="refractive"]` |
| L65 | material | `css/skin.css:233` | `body.frost:not(.frost-hold)[data-card="tinted"] .dev, body.frost:no…` | TINTED thins to .58 under FROST so the blur shows | delete: TINTED keeps `--card-opacity` |
| L66 | material | `css/skin.css:234` | `body.disconnected.frost:not(.frost-hold)[data-card="tinted"]:not(.p…` | the same .58 on the disconnected body | delete |
| L67 | material | `css/skin.css:266` | `body.disconnected.frost:not(.phone) .dev > .dev-body` | the disconnected body blurs whatever the card style | gate on refractive |
| L68 | material | `css/skin.css:268,269` | `body.disconnected.frost:not(.phone) .dev > .dev-head` | the disconnected head blurs whatever the card style | gate on refractive |
| L69 | material | `css/base.css:290` | `#graphTip` | a .97 TINTED tip that also blurs | no blur (it is tinted) |
| L70 | material | `shell/shell.css:154` | `#menubar .mb-list` | a .65 tint WITH blur: neither material | one material (open: which) |
| L71 | material | `modulation/modhost.css:1670` | `.mod-matrix::backdrop` | a dark dimming scrim `#0008` + literal `blur(8px)` behind the matrix dialog — the "dark layer" Josh asked to avoid | no dark scrim; if a blur, REFRACTIVE's token |
<!-- ledger:end -->

**Two gaps that are not one line each**

| # | meaning | where | what it draws today | fix |
|---|---|---|---|---|
| S1 | pressed | every `:active` rule in the kit: 73 rules (base 5 · skin 4 · shell 1 · modhost 22 · modwindow 41) | a wash alone; **one** of the 73 scales (modhost `.m2macadd`, L21) | add `--state-press-scale` to the press drawing once, at the widget level |
| S2 | focus | `.trig`, `.sw`, `.seg-b`, `.k-dial`, `.fd`, `select.sel`, the header chips (base.css, skin.css) | **no focus rule at all**: the browser's default ring. `.k` and `.fd` only reveal their value on `:focus-within` | one `--state-focus` ring outside, on `:focus-visible`; modhost.css entry 50 already draws it right inside the plugin |

**Counted, not listed:** the literal census and the mechanical relief counts are the lint's baseline (`tools/lint-intent.baseline.json`; `node tools/lint-intent.mjs --report` for every site).
