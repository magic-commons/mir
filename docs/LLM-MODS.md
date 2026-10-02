# MIR · LLM MODS — building on MIR with a model

MIR promises "LLM Mods": a model that has never seen the kit can build an app on it, and a model visiting an app can read what it is. A model cannot learn a kit from documents alone, so three things carry it, in this order: an installable **skill** that brings the kit with it, one working **starter** app to copy, and a one-page manual, **`LLM.md`**. Plan: `MIR CLAUDE 1.5.X INFORMATIONAL + LLM PLAN 2026-10-01.md` §3.1, §3.5.

## Install the skill

```bash
node tools/make-skill.mjs                         # → dist/mir-builder/ (about 4 MB, 200 files); refuses a dirty kit
cp -r dist/mir-builder ~/.claude/skills/          # for every project; or into a project's .claude/skills/
```

Then, in Claude Code, say *"build me Tetris with MIR"*. Claude loads the skill when the words "MIR", "use this UI" or "Josh's interface kit" come up. The skill folder holds:

| | |
|---|---|
| `SKILL.md` | the instructions: read `LLM.md`, copy the starter, change it section by section, keep the one rule, serve it, check it headless, the licence |
| `LLM.md` | the manual (below) |
| `starter/` | the app to copy |
| `mir/`, `fonts/` | the whole kit, as the kit's repository has it |
| `docs/*.md` | the kit's laws, one page per part |
| `tools/serve.mjs`, `tools/check-envelope.mjs`, `tools/cdp.mjs` | a static server (it prints the pages it finds), the skin and file checker, the headless browser (`key()`, `click()`: real keys and clicks) |
| `tools/check-app.mjs` | loads an app headless and **plays it**: `--keys Space,ArrowLeft`, `--click <selector>`, `--wait`, then `--expect playing` (the one clock), `--expect '<text in describe()>'`, `--changed '<js>'`, `--light`, `--shot`, `--pages`. Exit 0 only when it started with no console error and every step and check held; prints `describe()` with each shared page as its title and line count (`--pages` for their text). SKILL.md's copy step puts it in the app's own `tools/` |
| `BUILD.json` | the kit's version and commit, and whether it was built from uncommitted changes |

`--allow-dirty` builds from uncommitted kit changes and says so in `BUILD.json`; `--out <dir>` writes somewhere else. `dist/` is a build product and is not committed.

A model's app is laid out as the kit is, so the starter's paths hold: `myapp/mir/`, `myapp/fonts/`, `myapp/LLM.md`, and the app in `myapp/app/`.

## First runs, 2026-10-02

"Build me Tetris with MIR", one run each of Haiku, Sonnet and Opus, each with only the built skill (`1.5.0-alpha.5`, `e8411b0`) and an empty folder. All three made a game. Each was then served, checked with the skill's checker, and driven with real keys and pointer through CDP (`.tmp/W6/EASE/evaluate.mjs`); plates in `docs/plates/tetris/`.

| | Haiku | Sonnet | Opus |
|---|---|---|---|
| `app.js` | 327 lines | 138 lines | 259 lines |
| starts, no console error | yes | yes | yes |
| Space plays | yes (only because of a first-run LFO route) | yes (the same: it found the refusal and routed an LFO to GHOST to get past it) | yes (the same) |
| ← → move, ↑ rotates, a piece falls and locks | yes | yes | yes |
| hard drop | **no key**: bound to `Shift` alone, which the table silently dropped | Enter | Enter |
| a full row clears | yes (by soft drop) | yes | yes |
| the bar's latches open the windows | yes | yes | yes |
| Space over a just-clicked latch | **presses the latch** | **presses the latch** | plays (its own Space row, a workaround) |
| reload, then Space | plays (the stored route) | plays (the stored route) | plays (the stored route) |
| light theme | the canvas follows only while playing | the same | follows (`onThemeChange`) |
| the greeting | inside the stage | **under the bar** (subject: the whole stage) | inside (it moved its board left to make room) |
| rule breaks | none of the one rule or INTENT; but the score readouts are written once and freeze, one number has two controls (a GHOST knob made and a GHOST switch writing it directly), the board runs under the bar, `STARTER` left in the title and boot card, page labels name keys that do not exist (`ui:fallSpeed`) | none | none |

None restyled a kit part, wrote a private `keydown` or a `setInterval`, made a second play, or filled ON with the accent. What they hit, and what 1.5.0-alpha.6 did about each, is `LLM.md` §9 "Observed".

## The starter

`starter/index.html` and `starter/app.js` (72 lines; 161 before 1.5.0-alpha.5) are the smallest whole MIR app: a ring of dots drawn from five numbers on a 2D canvas, with the transport bar as the main opener (a first run shows only the bar; ▶ and Space are the one play, the ring beside it is modulation's power), the wordmark and its seven menus, a rack with two windows (RING built only when first opened, its knob becoming a modulation target then), the modulation window with an LFO driving one number, the notebook whose first page is `LLM.md` (shared, and its first part the greeting on the picture), FOLDERS, a key table and its help view, a notice on save and the boot card. `index.html` loads one stylesheet, `mir/mir.css`. `createApp()` (`mir/app.js`) does the standard wiring in the kit's order and returns every piece; each piece can be left out (`false`), given options, or built by hand. Every section of `app.js` begins with a line saying what it is and what to change. Run it with `npm run gallery` and open `/starter/`.

**The mod pitch, in one function.** `app.param(key, label, min, max)` (`makeParam` in `mir/app.js`) makes one number a kit knob, a target the modulation window can drive, and a saved value (a project keeps the base, never the modulated reading). A model adds a drivable number to a game with one line, at the top or inside a window's `build`.

## `LLM.md`

One page, for a model and for a person (it is the starter's greeting): the one rule, how to start, the starter section by section, the builders with their import paths, INTENT as do and don't, how to add a window, a control, a target, a page, a key and a setting, how to write and check a skin, how to check the work, and **the mistakes models make**. That last list is predicted from the kit's laws today and is marked so; the observed list comes from running "build me Tetris" through real models.

## What a visiting model can read: `describe()` and `dump()`

`mir/core/describe.js`. An app hands over what it already has:

```js
import { createDescribe } from './mir/core/describe.js';
const d = createDescribe({ app: { name: 'TETRIS', what: 'Falling blocks.' }, rack, params, pages, keys, prefs: gui.prefs, mod, transport });   // createApp does this
```

| | What it gives |
|---|---|
| `describe()` | markdown: the app, the clock (playing, the tempo, modulation's power), its windows (`rack.windows()`: open, built, which rack), every parameter with its range and current value (and, if a route drives it, its base), the key actions, and **only the pages marked shared**. The same text sits in the page in a hidden element, `#mir-describe`, for agents that only read the DOM; it is rewritten when the pages or keys change and at the end of a gesture, never on a timer |
| `dump()` | one block to paste to a model: the kit version, the browser, the look (skin, theme, card, frost, language, motion, viewport), the GUI preferences, the rack layout, the cost meter (`core/perf.js`), the last 20 errors and the last 20 input events, then `describe()` |
| `window.__MIR.describe()`, `window.__MIR.dump()` | the same, for an agent with a console |
| the notebook's ABOUT › COPY DUMP | the dump, when the app passes `dump: () => d.dump()` to `createNotebook` (the starter does) |

**What it never gives.** A page whose eye is shut is never named, counted or quoted. An input event is its kind and its target's hooks (`id`, `data-param`, `data-info`, `data-key-action`, the window and chip names), never its text, value, title or accessible name; a key pressed in a field is recorded without the key. And any text a field holds when the dump is made is cut out of it, so an error message that quoted it cannot carry it out. Hidden means hidden from a polite reader: anyone who opens the project file can read every page.

## Not built

- **Publishing the kit to npm** (plan ruling 8: not yet). The skill needs no publishing; a single-file web artifact would.
- **The theme optimiser** ("make it look like Tetris Effect"): it needs the vanilla themes' settings (FROST · MORPH · CLASSIC · SWIFT · AURORA · NEON, with tones) as its search space, and a 'name'-spec for anything outside them.
- **'name'-specs** (METRO, SPRITES) with their own rules, images and fonts: they are code, and need their own loading law.
- **Lint results in the dump** (plan §3.5): the lints are node tools; a page cannot run them.
- **The observed mistakes** in `LLM.md` §9: they come from the model runs.

## Proofs

- `tests/describe.node.mjs`: `describe()` lists the windows, the parameters (live values, the modulated base) and the keys, and quotes only shared pages; `dump()` keeps the versions, layout, cost, errors and events, and a secret typed into a field (key by key, and leaked into an error message) is absent, as is the unshared page.
- `tests/app.node.mjs`: `makeParam` (a control, a target, a saved base), `mod.add` after the install (a dormant route wakes), `mod.route`, removing a target removes its routes, FOLDERS' free seat, the greeting's first part, `describe` with `rack.windows()` and the clock. `tests/mir-css.node.mjs`: `mir/mir.css` imports every kit sheet exactly once.
- `tests/starter.browser.mjs` (real pointer and keys, every press hit-tested with `elementFromPoint`): a first run shows only the bar and a greeting of LLM.md's first part; a latch opens its window; a knob drag moves its number; Space plays and pauses the one clock without touching the power, and the power button leaves play alone; the LFO moves SIZE; the lazy RING window's knob becomes a target when built and a route moves it; FOLDERS opens clear of the racks and the bar; SAVE while routed keeps the base, and OPEN after a knob change restores it; GUI opens; `?` opens the help view; `qps` relabels; describe holds the clock and only the shared page; no console error. `MIR_STARTER=/app/index.html` runs it against a copied-out app; it passes against the built skill (`node tools/make-skill.mjs`, served from `dist/mir-builder/`); `MIR_PLATES=1` writes `docs/plates/starter/{first-run,windows,light}.png`.
- The built skill: the same test passes against `dist/mir-builder/` served as it is, and against an app copied out of it by `SKILL.md`'s own command.
