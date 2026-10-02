# MIR · GUI — MIR OPTIONS and MIR ABOUT

The **GUI window** is where a user chooses how an app on MIR looks. The menubar's **GUI** group opens it. It is a floating kit window with two pages behind one page turner:

- **MIR OPTIONS** — every look option the kit has, in eight groups, every one a real kit control.
- **MIR ABOUT** — the MIR logo, the kit's version and skin, what MIR is, its licence, the fonts' licences, and credits.

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

**What an app can delete.** Every row of its own Settings that is a look option: in BASINS, all of **Settings › LOOK** (THEME, CARD STYLE, FROST, DISCONNECTED, UI FLAT/DEFAULT, SATURATION, BLUR, VEIL, CORNERS, SHADOW, ACCENT A/B, VIVID, ABOUT GLASS/RESET) and from **Settings › DISPLAY** CONTROL HINTS, HELP, UI DROP SHADOW and DOCK GUIDE, with the code in `skin.js` that applies them and their keys in `basins.settings`. The rows listed below as *waiting for the token* stay in the app until their hook lands. Settings keeps QUALITY for the renderer and the app's own rows. The pointer helpers also replace the three parallax implementations and the opener's glow pipeline (below).

## The API

**`shell/gui.js`**
- `createGui({ host, prefs, app, about, accent, defaults, storageKey })` → `{ root, window, prefs, open(page), close(), toggle(page), page, turn(dir), moving(bool), dropGuides(), census(), light, parallax, destroy() }`.
  - `open('options' | 'about')`; `turn(±1)` steps the page turner; `page` is the page showing.
  - `prefs` is the store (below): `gui.prefs.set('theme', 'light')`, `gui.prefs.subscribe(fn)`.
- `lookSchema()` — the options as schema rows. `LOOK_PRESETS` — CLASSIC, GLASS, LIGHT. `SKINS`. `MIR_VERSION`. `MIR_WORDS`.
- `stepper({ label, items, value, onChange, wrap })` — the `‹ NAME ›` control (BASINS' blend-mode picker): two 44 px buttons around a live label; arrow keys step it; an item marked `coming` is listed but never chosen.
- `census(doc)` → `{ blur, shadow }` — how many visible surfaces carry a backdrop filter and a drawn shadow.

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
| PRESET | CLASSIC · GLASS · LIGHT · CUSTOM | seg | sets the MATERIAL, RELIEF and QUALITY options at once (below); CUSTOM shows only when the options match no preset | CLASSIC |
| | RESET LOOK | trig | every option home; the stored key is removed | |
| SKIN | `‹ FROST ›` | stepper | `<html data-skin="frost">` — the seam for 1.5.5; METRO and SPRITES are listed as coming | FROST |
| | THEME light · dark · system | seg | `<body data-theme>`; SYSTEM follows `prefers-color-scheme` live | dark |
| ACCENT | A, B | arc dials (`.accent-dial`, cyclic: INTENT rule 2) | `shell/accent.js` `set({ a, b })` → `--acc`, `--acc2` on `<body>` | 30°, 300° |
| | VIVID | dial | `accent.set({ vivid })` → `--acc-glow` and the chroma | 10 % |
| MATERIAL | PANE tinted · refractive | seg | `<body data-card>` | tinted |
| | FROST off · still · always | seg | `body.frost`; under STILL, `body.frost-hold` while `gui.moving(true)` | off |
| | BLUR 0–40 px | dial | `--glass-blur` on `<html>` (it feeds `--frost-filter` there); 0 writes `--surface-filter: none`, never `blur(0)` | 22 px |
| | VEIL 0–40 % | dial | `--surface-veil` on `<body>` (white on light, black on dark). Disabled unless REFRACTIVE at FULL | the house veils |
| | SATURATION 50–200 % | dial | `--surface-filter: blur(Npx) saturate(s)` on `<body>`. Disabled below FULL | 100 % |
| | CORNERS 0–24 px | dial | `--surface-radius` on `<body>` | 14 px |
| RELIEF | CONTROLS default · flat | seg | `--relief-raise`, `--relief-well` = `0 0 0 0 transparent` on `<html>` | default |
| | SHADOW | switch | `--surface-shadow`, `-float`, `-menu` = `0 0 0 0 transparent` on `<body>` | on |
| | DISCONNECTED | switch | `body.disconnected` | off |
| MOTION | AUTO · FULL · REDUCED · OFF | seg | `core/motion.js` `setMotionPolicy()` → `<html data-motion>` | auto (the OS) |
| | POINTER GLOW | switch | `fx/pointer-light.js` (below) | on (ruling 13) |
| | PARALLAX | switch | `fx/parallax.js` (below) | on |
| | DROP GUIDES | switch | `gui.dropGuides()`, handed to `createWindow({ dock: { guide } })` | on |
| TEXT | HINTS | switch | `body.control-hints-off` (`control-help.js`) | on |
| | HELP | switch | `body.window-info-off` (skin.css hides every ⓘ) | on |
| QUALITY | FULL · BALANCED · LIGHT | seg | `<html data-ui-tier>`: none · `lite` · `flat` (`docs/TIERS.md`) | FULL |
| | BLUR · SHADOW · FRAME | readouts | the cost of the look (below) | |

**The presets** set only MATERIAL, RELIEF and QUALITY. Theme, accents, motion and text are the user's own, and no preset touches them.

| | PANE | FROST | BLUR | VEIL | SATURATION | CORNERS | CONTROLS | SHADOW | DISCONNECTED | QUALITY |
|---|---|---|---|---|---|---|---|---|---|---|
| **CLASSIC** (the 1.4 spirit) | tinted | off | 22 | home | 100 % | 14 | default | on | off | FULL |
| **GLASS** (BASINS today) | refractive | always | 8 | 0 | 130 % | 16 | default | on | on | FULL |
| **LIGHT** (fast) | tinted | off | 22 | home | 100 % | 14 | flat | off | off | LIGHT |

**QUALITY is the tier.** FULL is no attribute, BALANCED is `lite` (no blur anywhere, one shadow layer, a legible tinted pane) and LIGHT is `flat` (lite, plus no relief, no shadows, no sheen, no motion). Below FULL the tier owns the pane, so BLUR, VEIL and SATURATION stand down: they write nothing and their dials are disabled. AUTO and the governor are not built: there is no tier logic without a measurement on a real app.

**The cost reading** answers "beautiful but cost heavy". After every change, while MIR OPTIONS is showing, QUALITY reads:
- **BLUR** — how many visible surfaces (elements and their drawn `::before`/`::after`) carry a backdrop filter: each is a compositor pass.
- **SHADOW** — how many draw a shadow.
- **FRAME** — the mean frame time over the next 30 frames.

It is taken once per change and never on a timer, so the reading costs nothing at rest. In the gallery, CLASSIC reads BLUR 0, GLASS reads BLUR 16.

### Options left out, and what each waits for

These are in the plan's table but have no hook a kit sheet reads yet. A control for them would be dead, so they are not in the window.

| Option | Waits for |
|---|---|
| RELIEF › FACES glass ↔ solid | the face tokens (`--face-fill`, `--face-fill-hover`, `--face-fill-press` are rows in `mir/tokens.json`, but no kit sheet reads them yet). BASINS draws its faces in its own `material.css` |
| RELIEF › ACCENT BARS | a kit hook for the selected window's accent head. λWAVES draws it app-side (`.dev.native-selected > .dev-head`) |
| TEXT › AUTO · LIGHT · DARK | the ink law in the kit. `data-text` and the adaptive sampler are BASINS' (`ink.css`, `adaptive-ink.js`); no kit sheet reads `data-text` |
| TEXT › STATUS TAGS | a kit class that hides the badges. `body.no-badges` is BASINS' `lab.css` |
| SHADOW as an amount | a shadow-strength token. The pane shadows are literals in the theme, so SHADOW is a switch |
| SKIN › METRO, SPRITES | their skin packages (plan §8.3, 1.5.5) |
| QUALITY › AUTO | the governor, after a measured reason |

## The window

It is built on the kit's window (`mir/window/window.js`), not the notebook's free glass:
- it gets the house drag, the empty-glass handle, the raise, presence motion and the rail for free;
- its two pages are the window's two panels;
- every look option paints it, because the pane is a `.glass`.

The notebook form would have meant a second drag and resize machinery for one more window.

**The layout.** OPTIONS is one even grid of five equal 208 px columns and two rows, so every group shares its column edges, gutters and title inset, and each row's first control labels share a baseline: PRESET · SKIN · ACCENT · TEXT · QUALITY, then MATERIAL (two columns: its two choices side by side over its four dials) · RELIEF · MOTION (two columns).

**Nothing scrolls.** Each page is laid out at its natural size (ABOUT is one 440 px column). The window is placed to fit the page (one layout read per page turn or change), centred where it was.

**At 720 px wide and under**, the grid is one 300 px column. OPTIONS splits into four sheets — PRESET · SKIN · ACCENT, then MATERIAL, then RELIEF · TEXT · QUALITY, then MOTION — and the page turner steps through them, then ABOUT.

The **page turner** is the same stepper as SKIN. It sits above both pages, with the arrows and the keyboard (← →).

**ABOUT**:
- The logo is `mir/shell/assets/mir-dark.svg` or `mir-light.svg`, by theme (`assets/LOGO-SOURCE.txt` says where they come from). It is inlined so its nine tiles can turn, and its ids are stripped so they never collide with the wordmark's `#title`.
- While the pointer is on it, the tiles cycle the logo's own nine colours, 240 ms a step, as BASINS' About does. This is a stepped Web Animation: no timer, nothing at rest, never on touch or under reduced motion.
- MIR's description is quoted from magic-commons.com (the λWAVES About page). Then the licence, each shipped font's licence, the logo's typeface credit, and the app's credits.
- The GitHub link shows only when the app passes `about.github`: the kit's README names none.

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
  - one assertion per option: the hook is written and a specimen's computed style moves;
  - DROP GUIDES with a real grip drag, HINTS with a real hover;
  - a reload keeps the choices;
  - the page turner;
  - no panel overflows at 1280×720 or at 390×844 (every sheet);
  - the glow follows the pointer and a still pointer writes nothing;
  - glow and parallax are off under reduced motion, in the flat tier and on a coarse pointer.
- Plates in `docs/plates/gui/`: both pages, dark and light, CLASSIC and GLASS; the glow on the glass; the five phone pages.
- **Not proven:** WebKit and a real iPad; FROST · STILL on the joined window pane (the kit's sheets hold the frost only on the disconnected surfaces and the tinted fill, so the proof uses a disconnected card); the frame time on a busy app (the reading is honest about the gallery, which is idle).
