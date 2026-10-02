# MIR — changelog

## 1.5.0-alpha.6 — 2026-10-02 · what three models hit, ten complete draft translations, a checker that plays

Not released: built on branch `worktree-mir-1.5`.

**Behaviour changes (read these first):**
- **The app's play no longer needs a modulation source.** `installModulation`'s `play(true)` holds a demand of its own on the clock, so with no route, no source or the power off, Space and ▶ still play. Before, the host refused ("nothing-to-run") and an app had to route an LFO it did not need.
- **Space plays over a focused button, latch or knob** (the transport's key row is `overControls`, as BASINS).
- **A modifier-only key and a non-lowercase parameter key now throw.** `createKeys` and `keys.add` refuse a declared key that is not a key (a modifier alone), naming the action; `app.param` refuses a key that is not lowercase letters and digits, naming it and the fix. Both were silent before.
- **The page title comes from `createApp({ name })`** (`document.title`); the starter's `index.html` and boot card no longer carry a name.

### What three models hit, and what the kit does now
- "Build me Tetris with MIR" was run on Haiku, Sonnet and Opus with only the skill: **all three built a playing Tetris from the skill alone**. Every one had to route an LFO just so Space would play, two found Space pressing a just-clicked latch, one bound hard drop to Shift alone (silently dropped), one put the greeting under the bar. **A fourth run on the fixed skill needed no workaround.** The evaluation is `docs/LLM-MODS.md` "First runs, 2026-10-02"; plates `docs/plates/tetris/`.
- **INFORMATIONAL keeps clear of the bar and the racks:** `createInfoLayer({ avoid })` (viewport rects; `createApp` passes `rack.keepClear()`); a block rests only in the free stage, beside the subject, else above or below, else over the subject dimmed (`data-over`, new token `--info-over-fade`), never outside the stage or under the bar.
- **`app.safeRect()`** (where the picture may draw: the stage minus the bar and the racks showing a window), **`app.play()` / `app.pause()`**; `createApp` calls the app's `present` when the theme or the look changes and when a window opens or closes.
- **`keys.add(action | actions)`**: rows after the table was made, with their saved keys. `PLAY_ACTION` is exported from the transport.
- **`LLM.md`**: one clock that always plays, `app.pause()`, `app.safeRect()`, `present` on a theme change, the key spelling, game keys over a focused knob, readouts (`.set`), the glyph names (generated; `tests/app.node.mjs` fails if they drift), checking by playing; §9 "Observed" says what each model hit and whether the kit now prevents it, reports it, or the page warns of it.
- `tools/serve.mjs` prints the pages that exist where it serves (`app/`, `starter/`, `gallery/`).
- **Apps can delete:** a first-run LFO route kept only so play works; a Space row of their own to play over a focused button; a hand-made theme subscription for the canvas; a board offset to dodge the bar (use `safeRect()`); their own play-check scripts.

### Ten complete draft translations
- All ten packs (Spanish, French, Brazilian Portuguese, Indonesian, Simplified Chinese, Japanese, Russian, Hindi, Bengali, Arabic) now translate the whole catalogue, 917 of 917 keys, with the plural forms each language needs and no review flag left. They stay `reviewed: false` (DRAFT in the menu) until a native reader checks them.
- The glossary (`docs/LANGUAGES-GLOSSARY.md`) gains the terms the top-up met and its corrections (HOLD stays English in es / fr / pt-BR / id; WALL and LIVE differ in Chinese; RACK is الراك in Arabic, so it differs from SHELF). The known weak spots are named in `docs/LANGUAGES.md` §12: Arabic's and Bengali's glass vocabulary, Russian HUE and TINT (both ОТТЕНОК), long labels (ADD DEVICE in the Latin-script languages, Bengali overall).

### The checker
- **`tools/check-app.mjs` plays the app** (it was the skill's `check-app.mjs`, which only proved the page boots): `--keys`, `--click` (hit-tested, refused when something else is on top), `--wait`, `--expect playing | paused | <text>`, `--changed '<js>'`, `--light`, `--shot`. It prints the windows, the clock, every parameter and the keys in full, and each shared page as its title and line count (`--pages` prints the pages' text; the starter's page 0 is all of `LLM.md`). The skill ships it in `tools/`. `describe({ pages: false })` is that short form.
- `tools/cdp.mjs` gains `key(spec, { hold })`, `click(selector)` and the pure `keyOf`; `window.__MIR.prefs` lets a checker set the theme.

## 1.5.0-alpha.5 — 2026-10-01 · the vanilla themes, one light, SPACING, createApp, plurals and context, BASINS' toast and transport sizes

Not released: built on branch `worktree-mir-1.5`.

**Behaviour and breaking changes (read these first):**
- **English keys changed.** 70 of the 559 English keys the alpha.4 drafts were written against changed (a context, a `{:LABEL}`, an index var, a whole sentence, curly quotes). **An app's own language packs keyed on kit strings must be re-keyed** to the new English (`mir/locales/en.json`); the kit's ten packs were carried over by script.
- **The notice is BASINS' toast by default**: one centred pill 84 px above the bottom, at most 560 px wide; a new message replaces the one showing; no ×; 3 s. An app that relied on NEBULA's corner stack passes `seat: 'corner'` (or `stack: true`).
- **SPACING's default is tighter**: rack gap and inset 6 px, pane padding 8 px (1.4 was 10 / 10 / 7); docked chip rails 4 px.
- **INFORMATIONAL's hold-still is the I key; Space is the app's one play** (BASINS and λWAVES both play on Space).
- **The GUI window's `shadow` is an amount (0–2), not a switch**: the switch is `dropShadow`; a stored alpha.4 `shadow: true/false` is migrated (true → the matched theme's amount, FROST 200 %, else 100 %; false → 0).
- **`LOOK_PRESETS` → the themes**: it holds every vanilla theme (no colour options; a theme's colours are its tones'); `LOOK_PRESETS.light` is gone (SWIFT replaces it). `census()` returns `{ blur, shadow, shine }`.
- **The controls' relief at the default light is straight down**, not down-right (every raised control and well shifts by about a pixel); the text emboss is off under REFRACTIVE or FROST; TEXT AUTO under glass is white ink in dark and black in light, so FROST reads in both modes; NEON sets the dark mode; a cast's height scales its distance and softness, not its darkness; the BLUR range is 0–24.
- **FOLDERS' default first seat** with no `firstSeat` and no rack is the centre of the stage, not the top right.

### The vanilla themes and the settings that reach them
- **A vanilla theme is a named set of the built-in settings and nothing else** (`mir/shell/themes.js`, `docs/THEMES.md`): **FROST** (Josh's recipe, the default), **MORPH** (neumorphism), **CLASSIC** (the 1.4 spirit), **SWIFT** (the fast one), **AURORA** (the flashy one) and **NEON**. Each has tones, named sets of only the colour options. Anything that needs rules or art outside the settings is a 'name'-spec (METRO, SPRITES). The GUI window's PRESET and SKIN groups are one THEME group: SKIN `‹ theme ›`, TONE `‹ tone ›`, the theme's measured cost, THEME light · dark · system, RESET LOOK. Wall: `gallery/themes.html`.
- **Harvested from BASINS, exactly:** CONTROL FACES glass · solid and BLEND, TEXT white · black · auto, SHADOW 0–200 % plus the DROP SHADOW switch, and BRIGHT · HUE · TINT · VEIL · SATURATION as BASINS' `applyGlass` computes them. FROST now matches BASINS at Josh's recipe on every compared element except where INTENT rules otherwise.
- **EDGE**: a window pane's rim (`--pane-edge`). CORNERS now reaches the kit window, menus and popovers. Under REFRACTIVE with FROST the hover hint and the ⓘ panel are glass.
- **The GUI window** has three pages (MIR OPTIONS 1 · 2 · MIR ABOUT) and five phone sheets; every new option has its proof (`tests/gui.browser.mjs`).
- `mir/core/look.js`: the look's arithmetic, pure (`glassTint`, `glassVeil`, `autoInk`, `paneShadow`, `spacingPx` …).
- **The modulation window:** its focus ring is an outline (`--state-focus` is one; reading it as a box-shadow lost the ring whenever a skin set it); the work bar's power seat is 44 × 44, as BASINS draws it.
- **Apps can delete** (BASINS): Settings › LOOK's implementation in `skin.js` (setFaces, setFaceBlend, setText, setMaterial, setMaterialPreset, applyGlass, setBlur, the pane part of setUIDropShadow), `surface-material.js` + `.css`, the glass-face, popover, glass-knob and window-edge rules of `material.css`, the TEXT seats of `ink.css` §1, the 44 px power rule in `transport-controls.css`.

### SOLID, the light angle and the shine
- **CARD STYLE · SOLID**: the opaque pane in the tint's colour (HUE picks it, TINT is its saturation, BRIGHT its lightness), with faces in the pane's colour and the relief mixed from it.
- **One light**: LIGHT ANGLE (an arc), SHADOW DISTANCE and SOFTNESS, SHINE and SHINE SOFT. The pane shadow falls away from the light, the shine (additive, on rack cards) sits toward it, and the controls' relief turns with it (`--neu-raise` / `--neu-inset` read `--light-sin` / `--light-cos`). FROST's light is from above; MORPH's upper-left.

### SPACING
- Josh: "the dock margins are too large … an option for 0". BASINS' three levels 0 · TIGHT · DEFAULT, and AIRY (this kit's): `--rack-gap` / `--rack-inset` / `--pane-pad` / `--rail-gap` = 0/0/6/0 · 3/3/6/2 · **6/6/8/4 (the default)** · 16/16/9/6. 0 is flush (square, one hairline, no shadow inside the slab).
- The GUI window writes `--rail-gap` on `<html>`; the rail sheets read `var(--rail-gap, var(--rail-gap-derived))`, so the written value wins and a page with no GUI window derives it from `--rack-gap`.

### `createApp`, `param` and the one stylesheet
- **`mir/app.js`: `createApp(options)`** does the standard wiring an app wrote by hand, in the kit's order, and returns every piece: the rack and its float layer, the look, the language, the key table, modulation, the one clock and the transport bar (the main opener), the parameters, the pages, the notebook, FOLDERS, INFORMATIONAL and its greeting, the help view, the menus, the hints and the pressed look, describe. Each piece is still the kit's own constructor (`false` leaves one out).
- **`makeParam` / `app.param(key, label, min, max)`**: one number becomes a kit control, a modulation target and a saved value; `value()` is the base, never the modulated reading.
- **Modulation takes targets after the install**: `mod.add(param)`, `mod.remove(id)`, `mod.params()`; **`mod.route(source, id, depth)`** is a first route in one call.
- **`mir/mir.css`**: one stylesheet that `@import`s every kit sheet in the kit's order (`tests/mir-css.node.mjs` fails if one is missing or doubled).
- `greet(…, { first: true })` shows page 0 up to its first `---`; keys can be held (`up`); `rack.windows()` and `rack.keepClear()`; FOLDERS' first seat keeps clear of the racks and the bar; `describe()` carries the clock.
- **The starter** is rewritten on these: one stylesheet link, `app.js` 69 lines (was 161); the transport bar is the opener, Space and ▶ are the one play.
- **Apps can delete:** the per-sheet `<link>`s; a full-screen windows layer and its pointer rules; the hand law in every `onInput`; the seven-call first route; an up-front `params` list; a hand-placed FOLDERS seat; the start-up checklist.

### Languages: plurals, context, whole sentences
- **Plurals:** `tn(n, one, other, vars?, context?)`; a pack entry may hold `{ zero, one, two, few, many, other }`, chosen by `Intl.PluralRules`.
- **Context:** one English word with two meanings is two keys (`t(en, vars, context)` or `context::English`); `name::X` is a name, never translated. Split: LIGHT, DARK, FROST, WINDOW, FULL, HOLD.
- **Labels inside sentences:** `{:LABEL}` is that label, translated in turn (57 sentences). `phrase()` marks a string for the catalogue; `english()` gives a key's English. `kit.js` `hint()` and `placeholder()`; a native tooltip is translated too.
- **The catalogue** writes notes (`// tr:`), names and each count's forms: 917 keys. The fragments the drafts could not translate are whole sentences.
- **The packs** were carried onto the new keys by script (no translation written); `tests/i18n-packs.node.mjs` checks plural forms and reports covered / missing / review per pack.

### The transport's sizes and work-bar form
- **BASINS' new sizes** (Josh, BASINS ui-fixes 8–11): the tempo 18 px (was 12), BPM / Hz 8 px (was 7), the pill sized to its number; play's glyph 32 px (was 20) in a 40 × 40 seat with no face and no ring; to-start is one of the round seats. COMPACT: play 22 px, the tempo 14 px.
- **`createTransport({ bar: 'work' })`**: the transport inside a work bar (BASINS' timeline-mounted form): 52 px tall, its seats the bar's button face at 34 × 34. `BARS`, `BAR_SEATS`.
- Fixed: two bars on one page shared one paint job.

### The notice
- `notice()` is BASINS' toast by default (above); NEBULA's corner stack is `seat: 'corner'`; `offset` lifts the toast clear of a transport bar. 14 `--toast-*` tokens. FOLDERS and the boot card speak through it.
- **Apps can delete:** BASINS' `toast()` and `#toast`.

### Keys and the history list
- **Keys can play over a control**: an action marked `overControls` runs even when a focused control owns its key, and the control gets neither the press nor its release (never in a text field unless `inFields`). BASINS' own Space handler can go.
- **The history list takes a host's tools**: `historyList(h, host, { tools: false, count: false })` leaves UNDO / REDO and the count to the host; `state()`, `onChange(fn)`, `historyState(h)`.

### The modulation window docked
- Docked, the right work bar ends at the last device (or the run's right edge when it overflows), as floating (BASINS: "so it doesn't hang").
- **A chip rail docked at the top or bottom sits tighter** (BASINS: "Reduce the padding on all the chips when docked"): each chip is its 48 px disc + `--rail-gap` along the rail, 8 px disc to disc where it was 21; the 62 px target across the rail is unchanged. `rail.setDock(dock)`; `createWindow` calls it, so every kit window's docked rail tightens.
- A status message is no longer overwritten by the idle hint on a language change.

## 1.5.0-alpha.4 — 2026-10-01 · the look in tokens, the starter and the skill, ten draft languages, FROST by default, the transport bar, one play

Not released: built on branch `worktree-mir-1.5`.

**Behaviour changes (read these first):**
- **The modulation window's play is now modulation's power** (one clock: the timeline owns the one play). The window never starts time; an app gives the user its own play (below).
- **The default tempo is 30 BPM** (`BPM_DEFAULT` in `mir/modulation/mod.js`, was 60). A saved rack keeps its own tempo.
- **New users start on FROST, dark.** FROST (refractive, frost always, BLUR 11, SATURATION 130 %, CORNERS 24, shadow on, disconnected off) is the GUI window's default preset; a user with saved look preferences keeps them.
- **CLASSIC's blur is 20 px, not 22**: the GUI window's BLUR range is now BASINS' 0–20.

### The look values are tokens
- **The house sheets' look is in tokens.** Every colour, shadow, radius, duration, easing, font size, weight, letter-spacing and look opacity in the kit's own sheets (`base.css`, `skin.css`, `shell.css`, `stage.css`, `core.css`, `window.css`, `pages.css`, `notes.css`, `gui.css`, `parts.css`, `info.css`, `fx.css`, `keyboard.css`, `folders.css`, `history.css`, `locales.css`) is a custom property holding today's exact value, declared in one `/* FROST · values */` block at the top of its sheet; the rules below read names only. 115 new names; `--knob-face` lands. Nothing was rounded or merged: proved neutral by stylehash on twelve gallery pages × theme × card × frost and on the lite and flat tiers (zero elements, zero pixels). The house sheets' look literals go from 151 to 5, each justified in `docs/SKINS.md` (new: where the look lives, the rules a skin follows, the themed names, the near-duplicates).
- **The modulation window's look is in tokens.** Every look literal in `modhost.css` and `modwindow.css` is one of 362 tokens in a `/* FROST · values */` block at the top of its sheet, with today's exact value; the five values `modwindow.js` wrote as SVG attributes are tokens too. Proved neutral with stylehash (eight configurations × eight states) and the plugin's browser tests. `docs/SKINS-MODULATION.md` lists the blocks, the exceptions and 30 near-duplicate pairs.
- **Two new token types**, `border` and `font-shorthand`, with their grammars in the format checker (`mir/core/envelope.js`, `docs/FORMAT.md`), so a skin may set the plugin's border and whole-font tokens.
- **How MIR names a look** (Josh, 2026-10-01): a **vanilla theme** is a named set of the built-in settings and nothing else (FROST, glassmorphism; MORPH, neumorphism, coming); anything that needs rules or art outside the settings is a **'name'-spec** MIR build or theme (METRO, SPRITES). The docs now use these words.
- **Apps can delete:** any rule that re-states a kit look value to change it: set the token instead (`docs/SKINS.md` gives the selector for each).

### The starter, LLM.md and the skill
- **`starter/`: the smallest whole MIR app**, to copy. A ring of dots drawn from four numbers on a 2D canvas, with the wordmark and FILE · EDIT · VIEW · WINDOW · ABOUT · LANGUAGE · GUI, a rack with two windows (one built only when first opened), the modulation window with an LFO routed onto SIZE, the notebook whose page 0 is `LLM.md` (shared, and the greeting on the picture), FOLDERS, a key table and its help view, a notice on save and the boot card. `app.js` is 161 lines; every section starts with a line saying what to change. `param(key, label, min, max)` makes a number a kit control and a modulation target.
- **`LLM.md`**: one page for a model that has never seen MIR: the one rule, how to start, the starter section by section, the builders, INTENT as do and don't, how to add each thing, skins and their checker, and the mistakes models make.
- **The `mir-builder` skill** (`skill/mir-builder/`, built by `node tools/make-skill.mjs` or `npm run skill` into `dist/mir-builder/`, never committed): `SKILL.md`, the kit, the starter, `LLM.md`, the docs, a static server, the envelope checker, and `check-app.mjs`, which loads an app headless and exits 0 only when it started with no console error. It refuses to build from a dirty kit unless `--allow-dirty`. Doc: `docs/LLM-MODS.md`.
- **`mir/core/describe.js`: what a visiting model can read.** `createDescribe({ app, rack, params, pages, keys, prefs, mod })` → `describe()` (the windows, every parameter with its range and value, the keys, and only the pages marked shared; also kept in a hidden `#mir-describe` element) and `dump()` (versions, look, layout, the cost meter, the last errors and input events, then `describe()`). It never carries what was typed into a field, nor an unshared page.
- `PROMPT.md` is superseded for starting a new app (a note at its top says so); Josh decides later whether to delete it.
- **Apps can delete:** a hand-written "about this app for the model" text, and any debug-dump code (the notebook's COPY DUMP takes `dump: () => d.dump()`).

### Ten draft translations
- All ten packs translate the whole catalogue: Spanish, French, Brazilian Portuguese and Indonesian; Simplified Chinese, Japanese and Russian; Hindi, Bengali and Modern Standard Arabic (`mir/locales/*.json`). Every pack stays `reviewed: false` (the menu shows DRAFT) until a native reader checks it. Latin-script labels keep their capitals with accents; in Hindi, Bengali and Arabic the control, DSP and modulation names stay in Latin capitals; `{placeholders}`, names, key caps, units and maths pass through.
- **`docs/LANGUAGES-GLOSSARY.md`**: the rules, the voice per language, and one table of terms with the ten columns.
- **`tests/i18n-packs.node.mjs`**: every pack parses, every key is in the catalogue, no value is empty or holds `<` or a control character, each keeps exactly its key's `{placeholders}`; coverage and over-long labels are reported, never failed.
- Known limits: no plural mechanism (counts are wrong for some n in Russian and Arabic); a few English keys carry two meanings (`LIGHT`, `FROST`, `WINDOW`, `FULL`) and need splitting (`docs/LANGUAGES.md` §12).

### FROST is the default; the tempo default is 30
- **The GUI window's presets are FROST · CLASSIC · LIGHT.** GLASS became FROST, Josh's recipe: BASINS' ABOUT GLASS (veil 0, saturation 130 %, bright, hue and tint 0, refractive, frost always) with BLUR 11, CORNERS 24 (maxed), SHADOW on, DISCONNECTED off. FROST is a vanilla theme: a named set of the built-in settings.
- The ranges match BASINS (BLUR 0–20, VEIL 0–60, SATURATION 0–200, CORNERS 0–24). MATERIAL gains **BRIGHT**, **HUE** (an arc in its own hue) and **TINT**, onto the kit's `--glass-tint` on `<body>`, as BASINS' `applyGlass` computes it. WHITE TEXT, GLASS CONTROL FACES and SHADOW as an amount are what FROST still wants (`docs/GUI.md`).
- **The default tempo is 30 BPM** (Josh: "Let 30BPM be the default"). Two tests that counted one beat a second from the default now set 60 out loud.
- **Breaking:** `LOOK_PRESETS.glass` is now `LOOK_PRESETS.frost` (an app that named `glass` must say `frost`).

### The transport bar: BASINS' design, parts an app lays out
- **`mir/shell/transport.js`, `transport.css`.** Josh, 2026-10-01: "Prefer BASINS … keep the Transports as they are per each app." The kit gives the parts and the look; the layout is the app's. Parts, each an exported builder: `playButton` (the one true play, on the app's timeline or main clock), `modPower` (BASINS' power ring: a press arms or disarms modulation, never plays), `modDoor` (the MIR mark: opens the modulation window), `tempoPill` (BASINS' 72 px BPM pill: drag by the digit under the pointer, the wheel, the arrows, Shift, pages; a click opens the tempo panel; a double click types it), `tempoPanel` (BASINS' CLOCK tiles: TAP, WALL/FREE, the bends, HOLD), `tapButton`, `latch` (a window's latch), `barButton`, `wayBack`, and `createTempo`. `createTransport({ layout })` assembles a bar from an ordered list of parts, groups and the app's own nodes; `BASINS_LAYOUT` is the default, `LAMBDAWAVES_LAYOUT` is λWAVES' bar from the same parts. The dock chip moves the bar into a rack window named TRANSPORT. Seats BOTTOM / TOP / COMPACT from ⠿. The dodge is the rack's. Doc: `docs/TRANSPORT.md`; page: `gallery/transport.html` (a switch flips the two layouts).
- **The opener law** (Josh: "Always basic Transport Bar as the main opener"): `createTransport({ opener: true })` first, `firstRun(store, …)`; on a first run only the bar is on screen. Under H on a touch screen the bar keeps its way back.
- **Customizable by the settings:** every look value is the kit's or an `--xport-*` token, so CARD STYLE, FROST, BLUR, CORNERS, RELIEF and the flat tier restyle the bar in both layouts. INTENT on BASINS' design: the resting pill stands proud (BASINS drew a well); the dock chip and the door wear no pane shadow. No poller (BASINS' 250 ms interval is gone); idle is zero frames.
- The transport's tokens use the prefix `--xport-*`, not `--tr-*`, which is the house's tracking prefix (`--tr-tight`, `--tr-wide`, `--tr-wider`).
- `rack.js`: `setHome(seat)` (the TOP seat; `dodgeSeat` takes a `home`) and `spec(id)` (a window's description, for the openers).
- **Apps can delete:** BASINS' `transport.js` bar (all but the macro rail), `transport-controls.js` / `.css`, `transport-dodge.js`, the stage and rack seats of `transport-placement.js`, the `#transport` rules in `skin.css` / `lab.css`; λWAVES' transport wiring in `lab/rack.js` §25 and its tempo pill and panel in `native-ui.js`; a NEBULA port's transport card and `modDodge`.

### Modulation: a power button, not a second play
- **Behaviour change: the modulation window's play button is now modulation's POWER button** (Josh, 2026-10-01: one clock; the timeline owns the one play, modulation has power). The work bar's first seat is BASINS' power (its halo, ring and stem; the ring opens when off), lit in accent B as BASINS draws it. A press bypasses or restores every route (`host.clock.setModulationEnabled`): off, every target returns to its base while the clock, the sources, the tempo and the HOLDs keep running; it never plays or pauses. The power is kept in the stored record and a reload never plays.
- **Breaking for an adopting app:** the window no longer starts time, so an app must give the user its own play (`mod.play(on)`). An app that used the window's play, or `arm` / `clock.setEnabled` to stop modulation, now gets a bypass that leaves time running.
- `bind.js`: `play(on)`, `togglePlay()`, `playing()`, `onPlay(fn)` (the app's one clock) and `power()`, `setPower(on)`, `togglePower()`, `onPower(fn)` (`arm` / `armed` / `onArm` stay as aliases). The transport's power button binds to them. `modwindow.js` exports `SVG_POWER`; `SVG_PLAY` / `SVG_PAUSE` stay exported and are no longer drawn by the window. `gallery/modulation.html` has the app's PLAY outside the window.

## 1.5.0-alpha.3 — 2026-10-01 · INTENT in the house, pages, the rack, languages, the GUI window, one portable file, keys, the shell parts, FOLDERS and the modulation window

Not released: built on branch `worktree-mir-1.5`. This entry is wave 3, joined.

### INTENT in the house sheets
- Every ledger row in `base.css`, `skin.css` and `shell.css` is fixed (`docs/INTENT.md`, its status column).
  - One light from above: the card float's upward term is gone. A floating window, the notebook, a carried window and every menu, tip and popover now cast down at their own height.
  - ON and CHOSEN are the frost face and a thin rim, never an accent fill. A switch's light is its LED; a trigger's is its label glow.
  - Pressed is the press wash and one `scale` (`--state-press-scale: .96`). Hover is a lighter face (and a 1 px lift on what stands proud), never ink alone or a ring. Keyboard focus is one accent ring outside, on `:focus-visible`, for every control the kit builds. Disabled is one fade (`--state-disabled: .38`) with no relief.
  - A modulation route is accent B. TINTED never blurs under FROST (the .58 thinning is gone); REFRACTIVE carries the blur. The menubar list wears CARD STYLE. The ⓘ panel and the control hint lost their seven `!important`s.
  - The rail chip follows its pane under FROST (`mir/window/window.css`). In LIGHT the ON chip face is now `hsl(0 0% 100% / .62)` (it was .086, invisible on a light card).
- **FROST · STILL holds a joined pane too.** While `body.frost-hold` is set, a REFRACTIVE pane (and its rail chip, and a disconnected window's body card) stops blurring and wears the tinted fill, the surface the lite tier gives it, so STILL differs from ALWAYS. Only the pixels of the hold change.
- New page `gallery/intent.html`: the INTENT vocabulary, live, drawn by the kit's own controls. New test `tests/intent.browser.mjs`.
- Removed: `--glass-shadow-flat` (read by nothing), the unread `--face-*` rows in `mir/tokens.json` (the 1.5 names are `--relief-*` and `--state-*`), and the duplicate `.sw.on`, `.trig.on`, `.seg-b.on`, `.k.live .k-needle`, `.dev.dragging` and disabled rules in `base.css`.
- `--state-focus` is an `outline` shorthand (a new token type), so it never has to be composed with a control's own relief.
- **Apps can delete:** any rule that undid the upward card shadow, re-flattened `.seg-b.on`, put a focus ring on kit controls, re-drew the accent fill on `.sw.on` / `.trig.on`, or turned off the tinted blur under FROST; any `!important` used to beat the ⓘ panel or the hint.

### The modulation sheets
- The plugin reads the 1.5 names (`--surface-*`, `--relief-*`, `--state-*`, `--label-*`) at the place of use with its 1.4 value as fallback, so the performance tier and a skin reach it. FLAT leaves no shadow in the plugin; LITE leaves no blur and gives its panes the tinted fill. Literals equal to a token became the token. Proved neutral by stylehash before the INTENT pass.
- The plugin keeps INTENT: ON is a frost face, a thin rim and an accent light (switches, LED switches, power, tempo, transport, the eight underline controls, + DEVICE); a chosen preset is the ON face with an accent glyph; hover is a lighter face (no ring); pressed is the press wash and one scale, no translate; the dial wears the house's raised relief; one pane height, the house's; no scrim behind the matrix dialog. Plates: `docs/plates/intent/plugin/`.
- Removed: `--glass-bevel` and its six lights `--gl-w`, `--gl-t`, `--gl-l`, `--gl-r`, `--gl-b`, `--gl-glow` (they drew nothing). `--m2-mat-shadow` is now the house height, declared once in `modhost.css`.
- **Apps can delete:** any rule that re-quoted the plugin's pane shadow, or turned off its hover ring or scrim.

### Pages, the notebook and the shelf
- `mir/shell/pages.js`: a project's pages as one pure model (a page is a `.md` file; `pages[0]` is the greeting). New: `beforeCapture(fn) → off`, called at the top of `capture()` (a hook that throws is isolated); the notebook registers its flush there, so a capture always has the last keystrokes.
- **The notebook gets pages.** `createNotebook({ pages })` shows them as tabs after YOURS: select, type, add, rename, delete with an inline yes/no, reorder by drag or Ctrl/⌘+←/→, the eye for `shared`, SHOW ON OPEN on the greeting, .MD export, IMPORT .MD, drop a .md, COPY TO SHELF / COPY TO PROJECT. Without `pages` the notebook is unchanged node for node. New sheet `mir/shell/pages.css`. Doc: `docs/NOTEBOOK.md`.
- **The shelf** (`mir/notes/`): λWAVES' mini file system as the notebook's own notes store (`shelf.js`, pure) and face (`face.js`, `notes.css`): folders, the recent five, SAVE / SAVE AS, .md export and import, rename, delete. A damaged store is mended, never thrown.
- **Apps can delete:** their own notes store and projects face (λWAVES' `renderProjects`), and any timer that flushed the notebook before saving.

### INFORMATIONAL
- `mir/info/page.js` shows PAGES: `parsePage(md)` (Obsidian callouts `> [!mir|anchor] Title` become labels on a feature, an `@place` or a `ui:control`), `showPage(layer, page, opts)` (one page at a time) and `greet(layer, pages)` (page 0 when the project should greet).
- Control anchors follow the element with `data-info~="name"`; a gone anchor hides its label and line; a page may sit bare or on a pane (`setPane`); `mir/info/seats.js` chooses which side of its anchor a label rests on, so lines stop crossing.
- `gallery/info.html` reads its words from `gallery/pages/*.md`.
- **Apps can delete:** any tour, guide or title-card code: a tutorial is just a page someone writes.

### The rack
- `mir/shell/rack.js` and `rack.css`: `createRack()`. Windows are registered by name and built on first open; the `+` menu has the SHIFT-queue and ☆ favourite layouts; `windowMenu()` gives the WINDOW menu; reorder, carry across, float and dock run through core pointer, motion and proximity, with the slot and the detach edge drawn; Escape and pointercancel roll back. One hide path, by transform and delayed visibility, that never fades a rack. Edge peek, the transport dodge, the edge handle, header keys, layout persistence through an injected store, the phone's one rack. Doc: `docs/RACK.md`; page: `gallery/rack.html`.
- **Apps can delete:** their own `rack.js` (BASINS: about 618 lines plus `createRackMotion` and about 85 CSS lines; each NEBULA port about 400–550 lines).

### Languages
- `mir/core/i18n.js`: `t('English')`. English is the key and the fallback; packs load on demand from `mir/locales/<tag>.json`; `setLanguage(tag)` writes `<html lang dir>`. Every kit label changes language live, without a reload, through `label()` / `ariaLabel()` in `kit.js`.
- The menubar, the ABOUT face, the chips' names, the hints, the notebook, the shelf, the window and rail names, the history list's domain and a window's OFF / COPIED caption all translate. A window's and a rail's accessible name is no longer upper-cased in script; the history domain's capitals are CSS (`var(--label-case, uppercase)`).
- `mir/shell/language.js`: the LANGUAGE menu (each language in its own name, DRAFT for an unreviewed pack). The pseudo-languages `qps` / `qps-rtl`. `tools/i18n-extract.mjs` writes the catalogue `mir/locales/en.json` (`npm run i18n`). Ten empty draft packs; no font is shipped.
- Right to left: `dir="rtl"` mirrors the chrome. The house sheets now draw their sides as logical properties (`inset-inline-start`, `padding-inline`, `margin-inline-*`, `text-align: start | end`, `border-inline-start`), so the mirror rules for the wordmark, the menu lists, a window's head and status and the notebook's quotes are gone from `locales.css`. In left to right nothing changed (stylehash: 0 pixels on `gallery/index.html` and `gallery/shell.html`).
- `mir/locales/locales.css` is in its own layer, `mir.kit.locale`, declared in `base.css`'s order statement.
- **Breaking:** `about.js` `gplLicence()` and `kitType()` return one sentence part `{ t, vars }`; a menubar entry takes a fifth element `{ raw, current }`; `openGroup(name)` takes the English group name; a window root's `aria-label` is its title as written, no longer upper-cased. Code must never upper-case translated text.
- **Apps can delete:** any lookup by a label's English text (use `data-menu`, `data-help-en`).

### The GUI window, prefs and fx
- `mir/shell/gui.js`, `gui.css`: the menubar's GUI group opens MIR OPTIONS (eight groups of kit controls with a live reading of what the look costs) and MIR ABOUT (the MIR logo, the version and skin, MIR's words, licences and credits). Nothing scrolls; at phone width the groups page sideways. Doc: `docs/GUI.md`; page: `gallery/gui.html`.
- `mir/core/prefs.js`: one store for browser preferences; a schema says how each option is applied; bad stored values are repaired; applying is one coalesced frame job.
- `mir/fx/pointer-light.js`, `parallax.js`, `fx.css`: the cursor glow and one pointer parallax, opt-in by `data-light` / `data-parallax`; off on touch, under reduced motion, in the flat tier and by switch.
- **The menubar on a phone wraps.** With seven groups the bar ran off a 390 px screen; it now gets the room from the wordmark to the edge, wraps onto a second row, and an opened list is shifted sideways to stay whole on the screen. The phone rack starts below the bar (menubar.js writes `--menubar-bottom` on `<html>`; rack.css reads it) (`tests/menubar-phone.browser.mjs`).
- **One version constant:** `mir/version.js` exports `MIR_VERSION`; the GUI window and the envelope read it, and `tests/version.node.mjs` holds it equal to `package.json`.
- **Apps can delete:** their own options window, preference store, cursor glow and parallax.

### The portable format
- `mir/core/envelope.js`: one envelope `{ mir: 1, kind, kit, app?, name?, made, data }` for settings, a skin, a project, a page and a spec, and one checker that never throws. A skin is checked against `mir/tokens.json` by a whitelist grammar per token type. The `outline` type has its grammar (a width, a style and a colour), so a skin may set `--state-focus`. A compact form for small carriers.
- `mir/core/png.js` carries the envelope in one `iTXt` chunk of any PNG; `mir/core/intake.js` is the one way in (drop, paste, picker). `node tools/check-envelope.mjs <file>` (`npm run check:envelope`). Doc: `docs/FORMAT.md`; page: `gallery/format.html`.
- **Apps can delete:** their own settings export/import and drop handlers.

### Keys and the keyboard window
- **`mir/shell/keys.js`: one key table.** An app declares its keyboard once (`{ id, label, group, keys, run, when, inFields }`); one `keydown` listener runs it. Chords are `event.code` with a fixed modifier order and `Mod` (⌘ on a Mac, Ctrl elsewhere). Rebinding steals and reports the loser; only the difference is saved (the shape of a spec envelope's `keys`). The table generates the menus' key column (`menuItem`, `menuKey`), control hints (`hints`, `aria-keyshortcuts`, and now the visible hint: `control-help.js` shows a control's `data-key-hint` after its words, untranslated), the help rows and a plain-data `describe()`. Doc: `docs/KEYS.md`.
- **`mir/keyboard/`: the KEYBOARD window**, λWAVES' design rebuilt untinted on the 1.5 window: the drawn ANSI board, the modifier badges, the two wells, the action list with search, the platform switch, RECORD and RESET, steal on conflict. Every drawn key is focusable and pressable; recording works from a tap on the board. **`createKeysHelp`**: the help view generated from the table. Page: `gallery/keyboard.html`.
- Removed: the dead λWAVES `#keymap` rules and `@keyframes km-pulse` in `base.css` (nothing in the kit builds a `#keymap` now).
- **Apps can delete:** their shortcut tables, keymap editors and every hand-written help dialog (λWAVES `lab/shortcuts.js`, `lab/keymap.js`).

### The shell parts
- The small parts every app wrote again, each taken from the app with the best one (`docs/SHELL-PARTS.md`, `gallery/parts.html`; sheet `mir/shell/parts.css`):
  - `shell/dialog.js`: `openDialog` / `confirmDialog`, a pane at menu height with no scrim; focus trapped and returned; Escape and a press outside dismiss when allowed; one at a time.
  - `shell/notice.js`: `notice(text, { kind, ms, action })`, stacked in one corner, a polite live region, leaving by itself, held by hover or focus; `guarded(fn)` turns a throw into an error notice.
  - `shell/busy.js`: the loading mark is the 3×3 diamond (`busyMark` inline, card, logo or pointer; `busyCursor`, `busyLogo`, `whileBusy`), moved by transform and opacity only, and nothing when stopped.
  - `shell/boot.js`: `bootCard({ name, steps })` with `step` / `done` / `fail(error, { retry })`; `explainBoot(error)` names no WebGPU, no adapter, a lost device, a file that did not load or an exception, in plain words; COPY DETAILS.
  - `shell/flash-guard.js`: a per-route limiter that holds a parameter to WCAG 2.3.1 (at most 3 flashes a second) and names what tripped it; the field judge; `photosensitivityNotice()` once per browser.
  - `shell/share-link.js`: a readable `#v=1&c=…` fragment of what differs from the defaults, CRC-checked, so a damaged link is null and never a throw.
  - `shell/settings-rows.js`: a settings panel from data with the kit's controls and the begin/end edit law (a sync never repaints a control under the hand); the kit's first select and number fields.
- **Apps can delete:** their hand-rolled `<dialog>`s and `window.confirm`, toast code, spinners, boot screens, flash limiters, share-link encoders and settings panels.

### FOLDERS
- **`mir/folders/`: BASINS' SAVE window, retitled and split.** `createFolders()` on the one window (rail, empty-glass drag, resize, motion, `onMoved` for the transport dodge); the project adapter (`createProjectAdapter`, default core/project.js parts; NEW is the empty project; a failed open rolls back and says so); BASINS' library store (`files.js`: the key an option, plus `overwrite`, and a library with a bad record is repaired instead of hidden); the gallery plus drag-to-folder with the proximity glow and MOVE TO for touch and keyboard; seeding once (`seed.js`); export as a `.mir` project envelope or a PNG that carries it; import by drop or OPEN FILE (another app's project is refused with the reason). Doc: `docs/FOLDERS.md`; page: `gallery/folders.html`.
- INTENT where BASINS' SAVE broke it: resting toolbar buttons are raised kit triggers (they were wells), tiles at rest are flat (they were sunk), a chosen tile wears the ON face with its name in accent A, pressed is the sink and scale, and the "save this first?" box lost its literal colours and `!important`.
- **A window persisted open opens one microtask after `createWindow` returns** (`mir/window/window.js`, `docs/WINDOWS.md`), so its `onOpen` can use the returned window. FOLDERS' guard for the old order is gone.
- **Apps can delete:** BASINS' `save-window.js` and its library code.

### The modulation window
- **The controller is importable.** `mir/modulation/window.js` (`createModulation(host, port)`) is λWAVES' 3,084-line `lab/modwindow.js`, taken whole into the kit, and `mir/modulation/bind.js` (`installModulation({ mount, params, … })`) is the app seam SOLEIL and NEBULA each wrote. Doc: `docs/MODULATION.md`; page: `gallery/modulation.html`.
- **It joins the window set.** Its chip rail is `window/rail.js`, its placement `windowLayout`, its drag `core/pointer.js`, its dock guide `createDockGuide` (the guide is the landing in every seat), and the landing and every relocation travel; open and close have motion. The resting window is unchanged (stylehash, 8 seats: 0 pixels); the grip is now a `<button>`.
- **It routes onto faders natively:** `.fd[data-param]` is a target; a routed fader wears a range bar and shows the modulated value. While a macro is dragged, routable controls glow by distance (core/proximity.js, accent B) and the one inside capture takes the drop.
- The preset key is an option (`mod.js setPresetKey(key)` / `presetKeyOf()`); the play dot is true after a resize or a paused change; the plugin's words go through `t()` (the CSS captions are `content: attr(data-cap)`, no `toUpperCase()`); the route badges, pop-over and arming marks are the kit's; `.k.has-ring > .k-dial` no longer slides 10 px left; the ON rim draws again (the plugin read `--state-on-rim` as a colour).
- **Apps can delete:** λWAVES' `lab/modwindow.js`, SOLEIL's and NEBULA's modulation seams, SOLEIL's invisible-knob overlay, and every app's `:root`-laddered route-badge rules.

## 1.5.0-alpha.2 — 2026-10-01 · one window, the first 1.5 tokens, words on the stage

Not released: the 1.5 line is built on branch `worktree-mir-1.5`. The plans are in Josh's vault (`MIR CLAUDE 1.5 PLAN 2026-10-01`, `MIR CLAUDE 1.5.X INFORMATIONAL + LLM PLAN 2026-10-01`).

- **`mir/window/`**: one floating window, one chip rail, one dock (`docs/WINDOWS.md`). No runtime CSS cloning; chips relocate by Shift-drag, long press and keyboard; the dock guide is the landing rect.
- **The chip rail is styled by hooks** (`data-mir-rail`, `data-mir-chip`), not by its English label; the chips' glyph attribute is `data-glyph`. **Breaking for an adopting app:** `docs/ADOPTING-1.5.md`.
- **The first 1.5 token names**, read at the place of use with the 1.4 name as the fallback (`--surface-*`, `--relief-*`, `--state-*`, `--label-*`), and **`data-ui-tier="lite" | "flat"`** (`docs/TIERS.md`).
- **Controls paint only what changed** (`kit.js` through `core/perf.js`).
- **`mir/history/`** (one undo ring and its list) and **`mir/core/project.js`** (project parts), lifted from BASINS.
- **`mir/info/`**: INFORMATIONAL's first page: floating text, a jointed line that is only ever flat, 45° or vertical, force between labels (`docs/INFORMATIONAL.md`, `gallery/info.html`). The notebook faces Spectral, Playfair Display and Alegreya SC are in `fonts/info/`.

## 1.5.0-alpha.1 — 2026-10-01 · the foundation

- **The base**: BASINS' four forked kit files and the timeline's `host.js` / `mod.js` work are in the kit.
- **The line guard**: `adopt.mjs` refuses to move an app onto another line without `--line` (`docs/LINES.md`). The 1.4 line is frozen as branch `mir-1.4.x` at `v1.4.3`.
- **Cascade layers**: the kit's sheets are in `@layer`s; an app's sheets beat them with plain selectors; 838 `:root` ladders are gone (`docs/LAYERS.md`). **Behaviour change:** the kit's `!important`s now beat an app's.
- **`mir/core/`**: frame, motion, pointer, proximity, perf (`docs/CORE.md`).
- **INTENT**: `docs/INTENT.md`, `mir/tokens.json`, `tools/lint-intent.mjs`.

## 1.4.3 — 2026-09-23 · editable sine at birth, double-click tension reset

- Fresh LFOs now start on the editable SINE preset. Explicit analytic waves and saved source modes are preserved.
- Double-clicking a tension handle resets it, alongside the existing right-click reset, for LFO and ENV hosts.

## 1.4.2 — 2026-09-21 · the FL curve workflow is a kit law

- Added `mir/modulation/curve-gesture.js`, the shared interpreter every modulation host now uses.
- Restored Image-Line's documented envelope controls: right-drag empty space adds and places a point; Shift-right-click adds at the curve's current value; left-drag moves a point; left-drag on the tension handle changes curvature; Ctrl gives fine tension control; right-click on a tension handle resets it; Alt-left-click deletes a point. A plain left click on empty curve is inert.
- Fixed the scaled-editor miss: pointer coordinates are converted from client pixels into the SVG viewBox before point/handle hit testing. Clicking a visible tension handle can no longer fall through as empty space and add a point.
- Deterministic analytic LFOs materialize their equivalent editable curve on the first edit. The editor no longer blocks behind “select a preset first.” S&H and DRIFT remain analytic because no single-cycle breakpoint curve represents them.
- `PROMPT.md`, the contract, API and adopted host contract state the law explicitly so a model cannot silently reintroduce the tap-to-add or preset-gate variants.
- `tests/curve-gesture.node.mjs` proves the coordinate transform, hit priority, full action matrix, point-axis locks, Ctrl-fine tension and analytic-wave mapping.

## 1.4.0 — 2026-09-16 · polish: the kit proves itself

MIR gets its own proofs, repairs the bugs its 2026-09-16 survey found, shows everything it has in a gallery that restyles nothing, and has docs that are MIR's.

Every change below was measured in throwaway copies of λWAVES and BASINS III re-adopted onto this kit (`tools/stylehash.mjs`: every visible element × theme × card × frost, λWAVES fully booted on the GPU). The results, and how they were checked:
- **λWAVES:** identical in all 8 default states, element by element and pixel by pixel. Two tokens change underneath (see *The accent follows the app*), and they show as soon as a switch is on.
- **BASINS:** identical except that its accent setting now works.
- **The shell:** still λWAVES' own in all 14 states (`tools/shell-parity.mjs`).
- **An independent verifier** re-ran every proof, mutated the kit under the tests (each mutation caught), and found the gaps fixed below before release.

### Fixed
- **The accent follows the app.** `--acc` was a literal (`#78e1f0`, and `hsl(188 70% 34%)` on light), and its soft tints were resolved once on `:root`. So:
  - an app that turned `--hue-acc` on `<body>` moved the derived tints but never `--acc` itself;
  - an app that wrote `--acc` never moved `--acc-soft` or `--acc2-soft`.

  Accents are now `hsl(var(--hue-acc) var(--sat-acc) var(--lum-acc))`, and B likewise with `--hue-acc2/--sat-acc2/--lum-acc2`. They and their soft tints are declared again on `<body>`, so they follow whatever the app writes there; an inline `--acc` still wins. The defaults are the house cyan to within one level of green.
  - **Visible in BASINS and NEBULA:** their ACCENT A setting now recolours the power lamps, the switch and trigger fills and every other accent. Measured in BASINS: rgb(120,225,240) → rgb(134,227,214), BASINS' own chosen accent.
  - **Visible in λWAVES, once it re-adopts (Josh's call):** the soft tints now follow λWAVES' own accent instead of the house cyan. That means the fill of a switch that is ON, the modulation button while live, the transport's mod buttons and the keymap's highlights: a switch turned on at boot fills with the palette's accent rather than cyan (measured). The default screens paint no soft tint, so they are identical.
  - **Breaking, for an app that writes accents on `<html>` or in a `:root` rule:** those are now shadowed by the `<body>` declaration and ignored. Write accents on `<body>`; λWAVES, BASINS and NEBULA already do, and hue tokens on `<html>` still work.
- **Help reopened on a click.** A mouse press closed a hover hint, and the press's own focus reopened it at once, against the law that a hand on a control closes the hint. Focus now shows a hint only to the keyboard (`:focus-visible`), and Tab still does.
- **The parts the kit builds are styled by the kit.** The CSS for the window status (`.dev-stat`), the formula (`.fx`), the ⓘ button and panel, the hover hint (`.control-help`) and the plane model lived only in λWAVES' sheets, so every other app got them unstyled: the gallery's status ran into its title, and a hint sat in the page flow. The rules are λWAVES', now at the end of `mir/css/skin.css`: 32 blocks, 28 byte for byte, 1 differing only in whitespace, 3 with their selector lists trimmed to the kit's parts. They duplicate, and so don't change, what λWAVES, BASINS and NEBULA already carry.
- **A disabled fader is disabled.** It no longer resets on a double-click, and it looks disabled (`.fd.disabled`, the knob's .38 / .3).
- **Undefined tokens.**
  - `--w-medium` (a typo for `--w-med`) is now `--w-med`: bold text in a window's ⓘ help is medium weight again.
  - `--line` (defined nowhere) is now `--glass-border-color`, in the parked macro matrix.
  - `tools/lint-tokens.mjs` now fails on any token read that nothing writes.
- **Motion tokens.** `--t-fast/--t-soft/--t-linger/--logo-turn` moved from `skin.css` to `base.css`, which reads them.
- **The fader caught up with the knob.**
  - `setBase(fn)` works (it was an empty stub), and so does `setDisabled(on)`.
  - A painted (modulated) fader or knob announces the hand's value in both `aria-valuenow` and `aria-valuetext`.
  - `log` with min ≤ 0 warns instead of silently turning linear.
- **The drag law round-trips.** `setKnobLaw` takes explicit `keyFine`, `faderFine` and `touchTravel`, so `setKnobLaw(setKnobLaw())` changes nothing. `dragTravel(event, { touch })` gives the law to a drag surface the kit did not build.
- **The plane model** is sharp at every device-pixel ratio. It repaints on a theme flip, when it used to hold the other theme's ink. An accent written inline on `<body>` is noticed on the next `paint()`, with no style resolution per frame, since λWAVES paints it every frame. `destroy()` releases its observers.
- **Leaks.** An ⓘ panel's document listener leaves once the panel has been in the page and left it.

### λWAVES names became options (defaults unchanged)
- `device({ loadingMark })`: an element, a selector, or `false`. Default: the wordmark's mark.
- `createWindowActivity({ rackIds, classes: { uiHidden, rackHidden, rackPeek } })`. This renames what window-activity reads; `shell.css` still hides the shell on `ui-hidden`.
- `setHelpClasses({ hintsOff })`, and `consolidateWindowHelp(root, { sources })`. `window-info-off` is a CSS contract name and stays as it is.
- **Not in this release:** an injectable preset key. `mod.js` is untouched, byte-identical to its vendored source, because λWAVES' `tests/mir.test.mjs` §16 proves those bytes and an adopt must not break λWAVES' gate. It waits for that gate to retire.

### Proofs and tools
- **`npm test` (`tests/run.mjs`)**, with no dependencies. Every suite passes:
  - the token lint;
  - `adopt.node.mjs` (17 assertions);
  - `registry.node.mjs` (19), `curve.node.mjs` (10), `host.node.mjs` (50) and `modulation-model.node.mjs` (20), ported from λWAVES' `tests/mir.test.mjs` with neutral fixtures;
  - `widgets.browser.mjs` (47, real pointer and keyboard);
  - `shell.browser.mjs` (the 19 shell probes).
- **`tools/stylehash.mjs`** is the neutrality proof: the "3 292-element computed-style hash" of 1.0.0, kept this time.
  - **What it captures:** every visible element including `<html>` and `<body>`, about 90 computed properties, boxes, `::before`/`::after`, and every custom property the page's sheets declare.
  - **Noise:** a second capture of the unchanged page masks noise per property and per pixel. With that mask, a pixel difference fails the run too.
  - **What it does not drive:** hover, focus or popovers (the other proofs cover those).
- **`tools/lint-tokens.mjs`:** every `var(--x)` the kit reads has a writer. Tokens left to the host are listed with their reason.
- **`tools/adopt.mjs` hardened:**
  - an unknown flag is an error (a mistyped `--check` used to copy), and so is a `--prefix` that is a flag or leaves the app;
  - files the kit no longer has are removed, and `--check` reports them as EXTRA along with a manifest that doesn't match the bytes;
  - `--dry-run` and `--prefix` are new, and a corrupt manifest is reported, not thrown;
  - the manifest records the kit commit, and adopting from uncommitted kit changes needs `--allow-dirty`;
  - files are replaced atomically;
  - the manifest keeps the shape λWAVES' `tests/mir-manifest.test.mjs` reads.
- **`tools/serve.mjs`:** a static server with no dependencies. `npm run gallery` no longer needs Python.
- **`tools/cdp.mjs`:**
  - every call has a deadline (`MIR_CDP_TIMEOUT`), so a GPU-wedged page fails a proof instead of hanging it;
  - `gpu: true` for an app that needs WebGPU;
  - it finds Chromium on the PATH;
  - a snap Chromium's profile goes where the snap can write it, and every browser is killed on exit.
- **`package.json`:** `"type": "module"`, and scripts for `test`, `gallery`, `lint:tokens`, `adopt`, `check`, `parity:shell` and `stylehash`.

### Gallery
`gallery/index.html` is rebuilt.
- **Seats:** theme, card style, frost, disconnected, and a **ground** seat: plain, or a busy coloured field (Sol's test: glass must hold over a picture).
- **Accents:** A, B and VIVID on the accent engine.
- **Tokens:** every colour, type size, spacing and radius.
- **Controls:** every control in every state (linear, log, wrap, stepped, modulated with its base tick, disabled, large; switches off and on; a latched trigger; faders linear, log, driven and disabled; readout states; the formula; badges).
- **Window states:** live, off, calculating, folded.
- **The glyph set, and the real modulation window**, built by `createModWindow` and not restyled.
- **Removed:** the gallery's own `.g-tile` overrides, which broke the one rule.

### Docs
- **New:**
  - `docs/API.md`: every export of every module.
  - `docs/CONTRACT.md`: load order, what the kit reads on `<body>`, the tokens an app may re-point, ids, events, storage.
  - `docs/PLUGIN-CONTRACT.md`: the socket TIMELINE plugs into, and what the vault already decided about it.
- **Corrected:** STYLE-LOCK, MOTION-LAW, ANTI-PATTERNS, REFERENCES and the modulation window's notes are now MIR docs. Their λWAVES provenance is kept, λWAVES rulings are labelled as such, and stale claims are corrected (the byte-frozen law, keyboard knobs "NOT built", the default card style, the accent defaults, the host-API claim).

### Readability is the app's (Josh, 2026-09-16)
*"Each app specific stuff should be fine. And readability is different for each app."*
- **The kit ships normal polarity:** dark ink on light, light ink on dark, as λWAVES reads.
- **An app sets its own ink in its own sheet.** BASINS, whose glass sits over the coloured Mandelbrot set, uses white text on light and black on dark (its `ink.css`, re-pointing the ink ladder, CONTRACT §4).
- **So no kit-wide ground axis.** The gallery's FIELD ground stays a way to look at glass over a busy picture, not a law.
- **The same goes for the faint `--ok`/`--warn` readouts on light cards:** an app that uses them re-points them.

## 1.3.0 — 2026-09-16 · the shell, from λWAVES

Josh named λWAVES the reference app for MIR's features. The first to come into the kit are the menubar the wordmark opens and the notebook glass with its ABOUT face. A fresh app on MIR now gets these, and the basics of an ABOUT page, without writing them.

- **`mir/shell/`** is new. It holds the wordmark, the menubar and the notebook, built from λWAVES' own DOM and CSS, node for node.
  - **`wordmark.js`** builds `#title`: an optional lead glyph (λWAVES' λ), the name in LW Title, the nine-square mark, and a hidden subtitle.
  - **`menubar.js`** provides `createMenubar({ opener, host, menus })`.
    - **Menus are data:** `FILE · EDIT · VIEW · WINDOW · ABOUT → [label<TAB>key, run, disabled, hint]`, where `disabled` is a boolean or a function.
    - **Open and close:** hovering the wordmark opens the bar; leaving the wordmark and the bar for 400 ms closes it. A press outside closes it, and so does Escape, which gives the wordmark its focus back (λWAVES wave 62).
    - **Keyboard:** it is a disclosure, not an ARIA menubar. A keyboard open focuses the first group, and every list is filled when it opens.
    - **Phone:** the bar is always shown, and crossing into the kit's `--phone` breakpoint shows and places it. A shown bar is placed again once the fonts have loaded and on resize.
    - **Teardown:** `destroy()` removes the bar and all its listeners.
  - **`notebook.js`** provides `createNotebook({ host, name, about, faces, render, … })`, the free glass.
    - **NOTES** keeps markdown and maths; Ctrl/⌘+Enter previews, and typing never reaches the app's keys except Ctrl/⌘+S and Ctrl/⌘+,.
    - **ABOUT** is the face described below. **App faces** each get a round button after ◐.
    - **Drags:** moving and resizing belong to the pointer that started them.
    - **Storage:** each face remembers its own size, and writes are debounced and flushed on pagehide.
    - **Teardown:** `destroy()` flushes storage, then removes the notebook and its listeners.
  - **`about.js`** provides `aboutFace(face, data)`, the ABOUT face built from data.
    - **Defaults every app gets** unless it says otherwise:
      - the GNU GPL v3.0-only notice, with LICENSE and NOTICE links (the paths are options, and NOTICE can be left out);
      - the kit's three typefaces with their SIL OFL 1.1 licences.
    - **Its own words:** version, tagline, copyright, special thanks, team, made-by, and a home link.
    - **Rich text without `innerHTML`.**
    - **Unsafe links dropped:** a link whose scheme could run code (`javascript:`, `data:`, …) is written as plain text, and an unsafe home link is not built.
  - **`accent.js`** provides `createAccent()`, λWAVES' accent engine.
    - **Accents:** A and B are two angles on a palette, with their lightness held to the theme and pushed toward neon by VIVID.
    - **The λ:** its colour is held to a 3 : 1 contrast floor against its ground.
    - **The mark:** its nine squares are painted from the palette wheel, with a TURN and a BUSY loop.
    - **Defaults:** λWAVES' own, A 30° and B 300°. Josh's law of 60° and 300° is one option away.
  - **`notebook-render.js`, `notebook-math.js`** are λWAVES' sanitised markdown and KaTeX renderer, copied verbatim.
  - **`vendor/`** holds marked 12.0.2 and KaTeX, both MIT licensed, KaTeX's fonts under the SIL OFL, with their licences. The notebook loads them the first time a preview asks, and only the halves the page has not already loaded, so an app that never previews never downloads them. `vendor: false` turns this off.
  - **`shell.css`** holds the shell's rules: 109 rules taken from λWAVES' `lab.css` and `skin.css` by `tools/extract-shell-css.mjs`, with declaration blocks byte for byte and in cascade order, plus one kit addition: an app-added face hides the notebook's title, as PROJECTS does. Re-running the extractor reproduces the sheet exactly.
    - **No rack gutter by default:** it keeps λWAVES' gutter for two racks, and an app with no racks sets `--rack-w: 0px`.
    - **Hands off the stage:** it sets nothing on html, body, #lab or #stage.
  - **`stage.css`** is optional: λWAVES' ground (#070a0f dark, #eef1f6 light) for an app that wants the stage the shell was drawn on.
- **`mir/palette.js`** is λWAVES' palette module, copied verbatim: OKLab, the WCAG contrast floor (`visibleInk`), the 256-entry lookup table, and the 23-palette catalogue.
- **`gallery/shell.html`** is a fresh app on the kit and nothing else. `?as=lambdawaves` fills it with λWAVES' words.
- **Proofs.**
  - **`tools/shell-parity.mjs`** drives λWAVES and `gallery/shell.html?as=lambdawaves` through 14 states and compares four things in each: computed styles (70 properties plus ::before/::after), each element's own text, each element's box, and the pixels.
    - **Desktop, light and dark:** FILE open, a real pointer hovering an item, NOTES, NOTES previewed with markdown, a table and maths, and ABOUT.
    - **Phone, light and dark:** idle, and ABOUT full screen.
    - **Result:** all four are identical in every state. It exits 1 on any difference, pixels included.
  - **Negative controls:**
    - a fresh app's words: 274 differences;
    - a hover-only rule: caught in the two hover states;
    - a (hover: none) rule: caught;
    - one changed word and a heading text-shadow: caught.
  - **`tools/shell-behaviour.mjs`** runs 19 probes of what a picture cannot show: hover, Escape and focus, J never typing into the notes, the rack gutter, the preview rendering, links served and unsafe links dropped, `destroy()`, and the phone bar and its placement.
  - **`tools/cdp.mjs`** is the dependency-free headless Chromium underneath. Every browser it starts is killed when the process exits, and it renders text in grayscale, because subpixel antialiasing follows the compositing layer, not the design.
  - **An independent verifier** re-ran the proofs, compared about 590 properties per element (0 differences), and found the gaps fixed above.
- **Known and left as λWAVES has it:** on a phone, the always-shown bar covers the notebook's round buttons when the notebook is full screen.
- **Not in this release.**
  - **The keyboard (keymap) editor:** Josh's call; its GUI is not ready.
  - **The PROJECTS face:** the file/folder system is its own to-do. `faces` is where it will plug in.
- **The look is FROST.** MIR has one skin today, FROST; skins are to come (see `README.md`).

## 1.2.0 — 2026-09-12 · published under the 1.1.3 label

The two commits after the 1.1.3 entry (f0ac335, 05155da) added API to `kit.js` without a version of their own. They are this release.

- **The drag law as defaults an app may retune.**
  - `setKnobLaw({ travel, fine })` sets the law: travel is 220 px for a full scale, fine is the Shift divisor on a drag (900/220 on a knob, 5 on a fader), and 1/fine is the Shift factor on an arrow step. It returns the law.
  - BASINS asked for Shift = ⅛ with `setKnobLaw({ fine: 8 })`.
  - Every knob and fader may also carry its own `travel` and `fine`.
- **`fader` catches up with the knob.**
  - `log` gives a log-scale fader for FREQ-shaped ranges.
  - `show(x)` and `shown` paint a modulated value over the base, adding the `.mod` class.
  - `paint` and `setDefault` are new.
  - The Shift-drag is now `dx / (width · fine)`, and arrow steps move in log space on a log fader.
- **Known, and not fixed here** (see the 2026-09-16 survey):
  - `setKnobLaw(setKnobLaw())` does not round-trip.
  - A fader's Shift-drag (⅕) and Shift-arrow (¼) disagree.
  - The fader's `setBase` is an empty stub.
  - The modulation window's own dials do not read the law.

## 1.1.3 — 2026-09-11

- The tinted pane wears the glass opacity again (.84 dark / .86 light). While FROST is in force it thins to
  .58 so the blur can be seen through it; when the policy lifts (frost-hold) it is a full pane again.

## 1.1.2 — 2026-09-11

- `fader`: the fine (Shift) drag reads its rect once per drag, not once per move.
- `modhost.css`: two dead rules from the audio device's old cycling design removed (a trace rule for a device
  that never builds one; a selected/unselected split carrying one declaration).

## 1.1.1 — 2026-09-11

- `knob`: a modulated knob keeps its base visible — a short accent tick at the rim marks the hand's number
  under the dancing needle (Bitwig's convention: modulation shows over the setting, it does not hide it).

## 1.1.0 — 2026-09-11

- The modulation window's AUDIO device is redesigned (a minimised meter, separate full and compact layouts,
  routing controls aligned) and SPECTRUM/AUDIO labels tightened — work that arrived in λWAVES from the GPT
  team on 2026-09-10/11 and is taken back into the kit here (`modulation/modwindow/*`, `modhost.css`,
  `mod.js`). With this the "byte-frozen port" law is retired: MIR is the source of the window now, and
  λWAVES' `tests/mir.test.mjs` provenance patch (`docs/mir-matrix-patch.json`) records the delta from
  BASINS.
- `--card-opacity` .76 → .88: the tinted pane keeps a faint breath of the field, no more.
- `control-help.js`: the ⓘ panel's copy edits from the same pass.

## 1.0.1 — 2026-09-10

- `knob`: a base and a painted value are two things. `show(x)` paints a modulated value over the base (the
  needle dances), `set(x)` writes the base, and a drag starts from the base — so a hand on a routed knob moves
  its range by the drag and never teleports it to where the modulator was.

## 1.0.0 — 2026-09-10 · extracted from λWAVES

- Tokens, widgets and window chrome (`mir/css/base.css`, `mir/kit.js`) and the material language
  (`mir/css/skin.css`) split out of λWAVES' `lab.css` / `skin.css`; the app keeps only its own selectors.
  Proved neutral by a 3 292-element computed-style hash, dark and light, before and after.
- `control-help.js` (hints that step aside, the ⓘ panel, one help surface per window) and `plane-model.js`
  cut out of λWAVES' `native-ui.js`.
- The modulation system (BASINS' window, byte-frozen, with λWAVES' host, model, registry and curves) under
  `mir/modulation/`. The host API exposes the window's own gestures (`wireGrip`, `wireDepth`, `paintDepth`,
  `moveMacro`, `rebuildMacros`) so a second face can reuse them. *(Corrected in 1.4.0: those five live in
  λWAVES' own `lab/modwindow.js` host controller, not in MIR; the kit ships the window's builders.)*
- The dot grip (`gripDots`, 3 × 3 on a 5-px pitch) is the one *drag me* mark: rack window headers, the rail's
  reorder handle, the transport's macro tiles, the modulation device cards. The four-way cross is *route me*.
- `tools/adopt.mjs` copies the kit into an app and writes `MIR-MANIFEST.json`; `--check` reports drift.
