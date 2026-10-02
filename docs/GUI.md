# MIR · GUI — MIR OPTIONS and MIR ABOUT

The **GUI window** is where a user chooses how an app on MIR looks. The menubar's **GUI** group opens it. It is a floating kit window with three pages behind one page turner:

- **MIR OPTIONS 1** — the theme and its tone, the accents, the text, the quality, the material, the controls, the motion.
- **MIR OPTIONS 2** — the one light (angle, shadow, shine) and the windows (drop shadow, edge, disconnected, spacing).
- **MIR ABOUT** — the MIR logo, the kit's version and theme, what MIR is, its licence, the fonts' licences, and credits.

Every control is a real kit control. A **vanilla theme** (FROST, MORPH, CLASSIC, SWIFT, AURORA, NEON) is a named set of these options and nothing else: `docs/THEMES.md`.

The look is a **browser preference**: it lives in one `localStorage` key (`mir.gui`), never in a project, a link or the history. An app's own Settings keeps only its engine's options (plan ruling 7).

Play with it at `gallery/gui.html` (`?open=options` or `?open=about` opens it at load).

## How an app adds it

```html
<link rel="stylesheet" href="./mir/css/tokens.css">      <!-- the QUALITY tier's values -->
<link rel="stylesheet" href="./mir/core/core.css">
<link rel="stylesheet" href="./mir/window/window.css">
<link rel="stylesheet" href="./mir/shell/gui.css">
<link rel="stylesheet" href="./mir/fx/fx.css">           <!-- the pointer glow and the parallax -->
```

```js
import { createGui } from './mir/shell/gui.js';

const gui = createGui({
  host: floatsLayer,                       // a fixed layer above the stage, like any kit window's host
  app: { name: 'BASINS' },                 // "BASINS is an MIR Standard app"
  accent,                                  // the app's shell/accent.js engine (default: one is made)
  defaults: { theme: 'dark' },             // the app's own home look, over the kit's (optional)
  about: { github: 'https://…', credits: [ … ], fonts: './fonts/' },   // optional extras for MIR ABOUT
});

// the menubar: menus are data, so the GUI entry is two lines
createMenubar({ opener, host, menus: { …, GUI: () => [['MIR OPTIONS', () => gui.open('options')], ['MIR ABOUT', () => gui.open('about')]] } });

// the two hooks an app wires itself
createWindow({ …, dock: { span, guide: gui.dropGuides } });   // DROP GUIDES
engine.onMoving((moving) => gui.moving(moving));               // FROST · STILL holds the frost while the picture moves
```

`createGui` applies the stored look at once (before the first paint), so call it early, before the app draws its windows.

**What an app can delete.** Every row of its own Settings that is a look option: in BASINS, all of **Settings › LOOK** (THEME, CARD STYLE, FROST, DISCONNECTED, UI FLAT/DEFAULT, SATURATION, BLUR, VEIL, CORNERS, SHADOW, ACCENT A/B, VIVID, BRIGHT, HUE, TINT, ABOUT GLASS/RESET) and from **Settings › DISPLAY** CONTROL HINTS, HELP, UI DROP SHADOW and DOCK GUIDE, with the code in `skin.js` that applies them and their keys in `basins.settings`. The rows listed below as *waiting for the token* stay in the app until their hook lands. Settings keeps QUALITY for the renderer and the app's own rows. The pointer helpers also replace the three parallax implementations and the opener's glow pipeline (below).

## The API

**`shell/gui.js`**
- `createGui({ host, prefs, app, about, accent, defaults, storageKey })` → `{ root, window, prefs, open(page), close(), toggle(page), page, turn(dir), moving(bool), dropGuides(), census(), applyTheme(id), applyTone(id), themeCost(id?), light, parallax, destroy() }`.
  - `open('options' | 'options:2' | 'about')`; `turn(±1)` steps the page turner; `page` is `'options'` or `'about'`.
  - `applyTheme(id)` sets a vanilla theme and its own tone; `applyTone(id)` one of the current theme's tones; `themeCost(id)` → `{ blur, shadow, shine, ms }` measured when that theme was applied (or every theme's, without an id).
  - `prefs` is the store (below): `gui.prefs.set('theme', 'light')`, `gui.prefs.subscribe(fn)`; `gui.prefs.preset()` names the theme the options match, or `'custom'`.
- `lookSchema()` — the options as schema rows. `LOOK_PRESETS` — every theme's options, by id (breaking in alpha.5: `light` is gone, SWIFT replaces it). `THEMES` (from `shell/themes.js`). `glassTint(bright, hue, tint, theme, saturation)` — the `--glass-tint` triple. `SKINS` (the 'name'-specs, announced). `MIR_VERSION`. `MIR_WORDS`.
- `census(doc)` → `{ blur, shadow, shine }`.

**`shell/themes.js`** — the vanilla themes as data: `THEMES` (`[{ id, name, values, tones: [{ id, name, values }] }]`), `THEME_KEYS`, `COLOUR_KEYS`, `themeById(id)`, `themeValues(id)` (the theme's options and its first tone's), `toneValues(theme, tone)`, `matchTheme(state)`, `matchTone(state, theme)`.

**`core/look.js`** — the look's arithmetic, pure: `glassTint`, `glassVeil` (BASINS' `applyGlass`), `paneShadow` (BASINS' ABOUT shadow), `lightOffset(angle, d)`, `lightIsHome(state)`, `solidInk(state, theme)`, `spacingPx(s)`, `THEME_GLASS`, `LIGHT_HOME`.
- `stepper({ label, items, value, onChange, wrap })` — the `‹ NAME ›` control (BASINS' blend-mode picker): two 44 px buttons around a live label; arrow keys step it; an item marked `coming` is listed but never chosen.
- `census(doc)` → `{ blur, shadow, shine }` — how many visible surfaces carry a backdrop filter, a drawn shadow, and a shine layer of their own.

**`core/prefs.js`** — one store for any set of browser preferences.
- `createPrefs({ key, schema, presets, storage, doc, context })` → `{ get, set, reset, all, subscribe, apply, preset, applyPreset, resolve, env, destroy }`.
- A schema row is `{ key, type: 'enum' | 'bool' | 'number', values?, min?, max?, step?, wrap?, default, apply: [spec…] }`, and a spec is one of:
  - `{ on: 'html' | 'body', attr, map? }` — an attribute; `map(v, state, env)` returns a string, or `null` to remove it;
  - `{ on, cls, when? }` — a class, present while `when(v, state, env)` (default `!!v`);
  - `{ on, prop, map? }` — a custom (or any style) property; `null` removes it;
  - `{ run(v, state, env, context) }` — a call into an engine the kit already has (the accent, the motion policy).
- **Laws.** A stored value that is unknown, wrong-typed or out of range is repaired to the default, never thrown. A value a control hands in is rounded to `step` and clamped (or wrapped). Applying is one coalesced job of the one frame (`core/frame.js`), through `core/perf.js`; `apply({ now: true })` is the first paint. A row at its home value writes nothing, so the kit's 1.4 value stands.
- Pure, for tests: `repair`, `defaults`, `resolve(state, schema, env)`, `matchPreset`, `coerce`, `valid`.

## The options and the hooks they drive

Every control on MIR OPTIONS changes what is drawn through a hook a kit sheet or module already reads. `tests/gui.browser.mjs` proves each one with the real mouse: the hook is written and a specimen's computed style moves.

| Group | Option | Control | Hook it drives | Home (writes nothing) |
|---|---|---|---|---|
| THEME | SKIN `‹ FROST ›` | stepper | the vanilla themes: sets every theme option and the theme's own tone (`docs/THEMES.md`); says CUSTOM when the options match no theme. METRO and SPRITES ('name'-specs) are announced as coming. `<html data-skin="frost">` stays the seam for them | **FROST** (new users) |
| | TONE `‹ CLEAR ›` | stepper | the theme's tones: sets only HUE, TINT, BRIGHT, ACCENT A, B and VIVID; CUSTOM when the colours match none | CLEAR |
| | the cost line | note | what the theme cost when it was applied: blurred surfaces · shadows · shine layers · frame time | |
| | THEME light · dark · system | seg | `<body data-theme>`; SYSTEM follows `prefers-color-scheme` live | dark |
| | RESET LOOK | trig | every option home (FROST); the stored key is removed | |
| ACCENT | A, B | arc dials (`.accent-dial`, cyclic: INTENT rule 2) | `shell/accent.js` `set({ a, b })` → `--acc`, `--acc2` on `<body>` | 30°, 300° |
| | VIVID | dial | `accent.set({ vivid })` → `--acc-glow` and the chroma | 10 % |
| MATERIAL | PANE tinted · refractive · solid | seg | `<body data-card>`; SOLID is the opaque pane in the tint's colour (`docs/THEMES.md`) | tinted |
| | FROST off · still · always | seg | `body.frost`; under STILL, `body.frost-hold` while `gui.moving(true)` | off |
| | BLUR 0–24 px | dial | `--glass-blur` on `<html>` (it feeds `--frost-filter` there), always written; 0 is no blur: it writes `--surface-filter: none` and `--frost-filter: none`, the whole value, never `blur(0)` (a TINTED pane under FROST stays at its .58 there, as BASINS'; INTENT rule 4). BASINS' range is 0–20 (20 is the WebKit ceiling); it reaches 22 so CLASSIC is 1.4's blur exactly. Disabled below FULL and under SOLID | FROST: 11 |
| | VEIL 0–60 % | dial | `--surface-veil` on `<body>`: BASINS' veil, the theme's signed whiteness (white on light, black on dark) plus ½·BRIGHT, coloured toward HUE by TINT (`core/look.js glassVeil`). Disabled unless REFRACTIVE at FULL | the house veils |
| | SATURATION 0–200 % | dial | `--surface-filter: blur(Npx) saturate(s)` on `<body>`, and it multiplies the tint's chroma (BASINS). Disabled below FULL and under SOLID | 100 % |
| | CORNERS 0–24 px | dial | `--surface-radius` on `<body>`: rack cards, kit windows, the notebook, menus, popovers, the modulation panes, an app pane with `data-mir-surface` (the transport bar keeps its own 16 px, as BASINS) | 14 px |
| | BRIGHT −100…+100 · HUE 0–360° (an arc, drawn in its hue) · TINT 0–100 % | dials | `--glass-tint` on `<body>` (the tinted and solid pane, every solid face), BASINS' `applyGlass` exactly: lightness + 40·BRIGHT, hue → HUE and saturation → 70 % by TINT, times SATURATION, from the theme's own tint. HUE is disabled while TINT is 0 | BRIGHT 0, TINT 0 |
| CONTROLS | RELIEF default · flat | seg | `--relief-raise`, `--relief-well` = `0 0 0 0 transparent` on `<html>`; at default the relief turns with LIGHT ANGLE | default |
| | FACES glass · solid | seg | `<body data-faces="glass">`: under REFRACTIVE or FROST the faces are clear glass with a hairline (BASINS `material.css` §1) | solid (FROST: glass) |
| | BLEND 0–100 % | dial | while FACES is SOLID: `<body data-faces="blend">`, `--faces-solid-pct`, `--faces-transition-alpha` (BASINS' burn / dodge crossing). Disabled under GLASS | 0 % |
| MOTION | AUTO · FULL · REDUCED · OFF | seg | `core/motion.js` `setMotionPolicy()` → `<html data-motion>` | auto (the OS) |
| | POINTER GLOW | switch | `fx/pointer-light.js` (below) | on (ruling 13) |
| | PARALLAX | switch | `fx/parallax.js` (below) | on |
| | DROP GUIDES | switch | `gui.dropGuides()`, handed to `createWindow({ dock: { guide } })` | on |
| TEXT | INK auto · light · dark | seg | `<body data-text>`: white or black, the pure ladder, no emboss (BASINS' TEXT). AUTO: under glass the ladder in the mode's polarity (BASINS' unsampled seat), on a SOLID pane its lightness, on a TINTED pane the house ladder | auto |
| | HINTS | switch | `body.control-hints-off` (`control-help.js`) | on |
| | HELP | switch | `body.window-info-off` (skin.css hides every ⓘ) | on |
| QUALITY | FULL · BALANCED · LIGHT | seg | `<html data-ui-tier>`: none · `lite` · `flat` (`docs/TIERS.md`) | FULL |
| | BLUR · SHADOW · FRAME | readouts | the cost of the look (below); SHADOW counts shine layers too | |
| LIGHT (page 2) | ANGLE 0–360° (an arc) | dial | `--light-angle` on `<html>`: the pane shadow falls away from it, the shine sits toward it (`docs/THEMES.md`) | 0° (above) |
| | RELIEF 0–360° (an arc) · LINK | dial · switch | `--relief-angle` on `<html>`: the controls' raise and wells turn with it; LINK writes LIGHT ANGLE there instead. RELIEF is disabled while linked or FLAT | 315° (upper left: 1.4, BASINS) · off |
| | SHADOW 0–200 % | dial | `--shadow-amount` on `<html>`; off home `html[data-cast]` draws BASINS' ABOUT shadow at this strength, at three heights | 100 % (FROST: 200 %) |
| | DISTANCE 0–24 px · SOFTNESS 0–48 px | dials | `--shadow-dist`, `--shadow-soft` on `<html>` | 2 px · 8 px |
| | SHINE 0–100 % · SHINE SOFT 0–48 px | dials | `--shine-amount`, `--shine-soft` on `<html>`; above 0, `html[data-shine]`: the additive layer on rack cards, a shadow-list layer elsewhere. Disabled in the flat tier | 0 · 12 px |
| WINDOWS (page 2) | DROP SHADOW | switch | off: `--surface-shadow`, `-float`, `-menu` = `0 0 0 0 transparent` on `<body>` | on |
| | EDGE | switch | off: `--pane-edge: transparent` on `<body>` (window panes; menus and popovers keep their rim) | on (FROST: off) |
| | DISCONNECTED | switch | `body.disconnected` | off |
| | SPACING 0 · TIGHT · DEFAULT · AIRY | seg | BASINS' row (AIRY added): `--rack-gap`, `--rack-inset`, `--pane-pad`, `--rail-gap` on `<html>`; 0 is `html[data-flush]` (`docs/THEMES.md`) | DEFAULT |

**The themes** (`docs/THEMES.md`) set every option but THEME (light · dark · system), HINTS, HELP and DROP GUIDES, which are the user's own; their tones set only the colours.

**FROST** is Josh's own default (2026-10-01): *"'About Glass', Shadow maxed, Veil 0, Brightness 0, Dark mode, White Text, Glass control surface, Blur at 11px. Saturation bumped to 130. Tint 0, and disconnected off. Corners knob maxed. This will be known as 'Frost'. … Refractive on and frost always."* BASINS' ABOUT GLASS (`skin.js setMaterialPreset('about')`) is `ABOUT_MATERIAL` = veil 0 · radius 16 · shadow 1, `ABOUT_SATURATION` = 1.3, `GLASS_DEF` = bright 0 · hue 0 · tint 0, refractive, frost always; his changes on top: BLUR 11, CORNERS 24 (the knob's maximum), SHADOW maxed, DISCONNECTED off. New users start on FROST with THEME dark.

**How MIR names a look** (Josh, 2026-10-01): a **vanilla theme** is a named set of the built-in settings and nothing else. **FROST** (glassmorphism, Josh's recipe, the default) is one; **MORPH** (neumorphism) is coming. Anything that needs rules or art outside the settings is a **'name'-spec** MIR build or theme: **METRO** and **SPRITES** are 'name'-specs.

**FROST is whole.** WHITE TEXT, GLASS CONTROL FACES and SHADOW maxed (200 %), the three parts of Josh's recipe that waited for a hook in alpha.4, are built-in settings since alpha.5, so FROST is a vanilla theme with nothing faked. Against BASINS at the same recipe, `docs/THEMES.md` lists what still differs and why.

**QUALITY is the tier.** FULL is no attribute, BALANCED is `lite` (no blur anywhere, one shadow layer, a legible tinted pane) and LIGHT is `flat` (lite, plus no relief, no shadows, no sheen, no motion). Below FULL the tier owns the pane, so BLUR, VEIL and SATURATION stand down: they write nothing and their dials are disabled. AUTO and the governor are not built: there is no tier logic without a measurement on a real app.

**The cost reading** answers "beautiful but cost heavy". After every change, while MIR OPTIONS is showing, QUALITY reads:
- **BLUR** — how many visible surfaces (elements and their drawn `::before`/`::after`) carry a backdrop filter: each is a compositor pass.
- **SHADOW** — how many draw a shadow.
- **FRAME** — the mean frame time over the next 30 frames.

It is taken once per change and never on a timer, so the reading costs nothing at rest. In the gallery, CLASSIC reads BLUR 0 and FROST reads BLUR 14. Each theme's reading is also kept when it is applied and shown under its name; `docs/THEMES.md` has the table.

### Options left out, and what each waits for

These are in the plan's table but have no hook a kit sheet reads yet. A control for them would be dead, so they are not in the window.

| Option | Waits for |
|---|---|
| RELIEF › ACCENT BARS | a kit hook for the selected window's accent head. λWAVES draws it app-side (`.dev.native-selected > .dev-head`) |
| TEXT › AUTO by sampling the picture | BASINS' `adaptive-ink.js` (a GPU sampler of the app's picture). The kit's AUTO follows the theme, or a SOLID pane's lightness |
| TEXT › STATUS TAGS | a kit class that hides the badges. `body.no-badges` is BASINS' `lab.css` |
| SKIN › METRO, SPRITES | they are 'name'-specs: rules or art outside the settings (plan §8.3, 1.5.5) |
| QUALITY › AUTO | the governor, after a measured reason |

## The window

It is built on the kit's window (`mir/window/window.js`), not the notebook's free glass:
- it gets the house drag, the empty-glass handle, the raise, presence motion and the rail for free;
- its two pages are the window's two panels;
- every look option paints it, because the pane is a `.glass`.

The notebook form would have meant a second drag and resize machinery for one more window.

**The layout.** OPTIONS 1 is one even grid of five equal 208 px columns and two rows, so every group shares its column edges, gutters and title inset, and each row's first control labels share a baseline: THEME (two columns: SKIN and TONE side by side) · ACCENT · TEXT · QUALITY, then MATERIAL (two columns) · CONTROLS · MOTION (two columns). OPTIONS 2 is the same columns, one row: LIGHT (two columns) · WINDOWS.

**Nothing scrolls.** Each page is laid out at its natural size (ABOUT is one 440 px column). The window is placed to fit the page (one layout read per page turn or change), centred where it was.

**At 720 px wide and under**, the grid is one 300 px column. OPTIONS splits into five sheets — THEME · ACCENT, then MATERIAL, then CONTROLS · TEXT · QUALITY, then MOTION, then LIGHT · WINDOWS — and the page turner steps through them, then ABOUT.

The **page turner** is the same stepper as SKIN. It sits above both pages, with the arrows and the keyboard (← →).

**ABOUT**:
- The logo is `mir/shell/assets/mir-dark.svg` or `mir-light.svg`, by theme (`assets/LOGO-SOURCE.txt` says where they come from). It is inlined so its nine tiles can turn, and its ids are stripped so they never collide with the wordmark's `#title`.
- While the pointer is on it, the tiles cycle the logo's own nine colours, 240 ms a step, as BASINS' About does. This is a stepped Web Animation: no timer, nothing at rest, never on touch or under reduced motion.
- MIR's description is quoted from magic-commons.com (the λWAVES About page). Then the licence, each shipped font's licence, the logo's typeface credit, and the app's credits.
- The GitHub link shows only when the app passes `about.github`: the kit's README names none.

## An app's own panes: `data-mir-surface`

The look reaches every pane the kit draws. An app's own pane (a card of its own window, its own bar, a round button) takes the same material with one attribute:

| `data-mir-surface` | What the element becomes |
|---|---|
| `pane` (or empty) | a pane at pane height: the edge (`--pane-edge` · `--surface-edge`), CORNERS (`--surface-radius`), the pane shadow, and the fill by CARD STYLE (the tinted fill and sheen, the refractive veil, SOLID), with FROST's blur and saturation and FROST · STILL's hold |
| `float` | the same at the floating window's height |
| `menu` | the same at the menu's height |
| `chip` | the material at pane height, keeping the element's own corner (a bar, a round button) |
| `island` | paintless while joined (the same box: a transparent 1 px edge), and a pane while DISCONNECTED, as a window's body card is |

It is the very rules a kit pane is in, at no weight of its own, so an app's sheet that paints the same property still wins: delete the app's own material rules for that pane. `tests/themes.browser.mjs` proves a `pane` computes what a kit card beside it computes in every card style × frost × tier.

## TEXT with an app's own ink sampler

An app that samples the picture under each label (BASINS' `adaptive-ink.js`) creates the window with `createGui({ inkSampler: true })`: TEXT then offers **SAMPLED**, which writes no `data-text` at all, so the app's per-label ink decides. The app keeps its sampler and the CSS that turns its per-label attribute into the ink ladder; the kit's AUTO (the mode's ladder under glass, a SOLID pane's lightness, the house ladder on a tinted pane) stays for apps with no sampler. To start a user on it: `createGui({ inkSampler: true, defaults: { text: 'sampled' } })`.

## The pointer helpers

Both are installed by `createGui` (their switches live in it). An app without the GUI window may install them itself.

**`fx/pointer-light.js`** — the opener's cursor glow.
- `createPointerLight({ doc, enabled })` → `{ refresh(), destroy(), live }`.
- A surface opts in with `data-light`: tiles, chips, window heads, the logo. The GUI window lights its own groups and rail chips.
- How it runs:
  - One delegated `pointermove` finds the lit surface under the pointer.
  - The surface's box is read once on entry, and again only after a scroll, a resize or a press.
  - It writes `--light-x/--light-y` (px) in one coalesced frame job, plus `data-lit`.
- How it draws (`fx.css`): a 105 px radial light in `--light-ink` (accent A), under the surface's content and over its pane, on the surface's `::after`.

**`fx/parallax.js`** — one parallax for the kit.
- `createParallax({ doc, enabled })` → `{ refresh(), destroy(), live }`.
- An element opts in with `data-parallax="<depth px>"`.
- How it moves:
  - Elements drift against the pointer's place in the viewport, by up to their depth.
  - It moves by `translate` only, eased by a transition.
  - It reads the viewport size once per resize and no element's layout, ever.
- **Never put it on a window pane:** `core/motion.js` animates `translate` there. Put it on a layer inside.

**Their off rules.** These are the same for both (`fxAllowed`):

| Off when | Why |
|---|---|
| a coarse pointer (touch) | ruling 13 |
| the motion policy is not `full` (`data-motion` reduced or off) | reduced motion |
| `data-ui-tier="flat"` (QUALITY LIGHT) | the cheap tier |
| the app's switch is off (POINTER GLOW, PARALLAX) | the user's choice |

Off means **no listener at all**, and the CSS is gated on `<html data-pointer-light>` / `<html data-parallax-live>`, which exist only while the helper runs. On, a still pointer costs nothing: no event, no frame (proved: zero writes, reads and frames over 600 ms). `refresh()` re-asks the rules; the pointer and reduced-motion media queries re-ask by themselves.

**The glow on glass.** The opener's glow blends `overlay` over opaque art. On a glass pane there is almost nothing to overlay, so it was looked at in screenshots of the gallery (2026-10-01):
- `overlay` and `soft-light` draw nothing visible on either theme;
- **dark theme:** `screen` at 55 % reads as a soft light;
- **light theme:** only `plus-lighter` at 35 % reads as light (`normal` reads as a stain).

Those are the defaults (`--light-blend`, `--light-strength`). It is a softer thing than the opener's glow on its cover art. An app that lights opaque art can re-point `--light-blend: overlay` on that surface.

**What the helpers replace** (survey A §5.3, B, F2):
- the opener's pointer pipeline (BASINS `startup.js:107-150`, `startup.css:96-139`);
- the SAVE gallery's thumbnail parallax (`gallery.js:566-584`, a rect read on every pointermove);
- the About logo's motion (`brand-motion.js:64-120`; its diamond cycle is the ABOUT logo's);
- the private `--pointer-x/y` variables.

## Proofs

- `tests/prefs.node.mjs` — defaults, set/get (clamped, stepped, wrapped, read back), repair of bad stored values, a throwing storage, subscribe, reset, the writes each option resolves to, and presets with CUSTOM.
- `tests/gui.browser.mjs` on `tests/fixtures/gui.html`, with real CDP input, every control hit-tested with `elementFromPoint`:
  - GUI opens from the menubar;
  - one assertion per option (SKIN and TONE, every MATERIAL, CONTROLS, TEXT, QUALITY and MOTION control, and on page 2 every LIGHT and WINDOWS control): the hook is written and a specimen's computed style moves;
  - DROP GUIDES with a real grip drag, HINTS with a real hover;
  - a reload keeps the choices;
  - the page turner;
  - no panel overflows at 1280×720 or at 390×844 (every sheet);
  - the glow follows the pointer and a still pointer writes nothing;
  - glow and parallax are off under reduced motion, in the flat tier and on a coarse pointer.
- `tests/themes.browser.mjs` — a theme writes only look-store options; a reload keeps theme and tone; SOLID is opaque; the shadow falls away from LIGHT ANGLE and the shine sits opposite; SHINE 0 and the lite and flat tiers draw no shine; SPACING by a real drag, to 0 px; each theme's cost.
- Plates in `docs/plates/gui/`: OPTIONS 1 and 2 and ABOUT under FROST (dark and light), MORPH and CLASSIC; the glow on the glass; the six phone pages. The themes: `docs/plates/themes/`.
- **FROST · STILL on a joined pane is held by the kit:** while `body.frost-hold` is set, a REFRACTIVE or TINTED pane (joined or disconnected, and its rail chip) stops blurring and wears the full tinted fill (TINTED's .58 thinning lifts with it) (`mir/css/skin.css`; proved in `tests/intent.browser.mjs`), so STILL differs from ALWAYS on every window.
- **Not proven:** WebKit and a real iPad; the frame time on a busy app (the reading is honest about the gallery, which is idle).
