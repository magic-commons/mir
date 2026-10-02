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
| `tools/serve.mjs`, `tools/check-envelope.mjs`, `tools/cdp.mjs` | a static server, the skin and file checker, the headless browser |
| `check-app.mjs` | loads an app headless; exit 0 only if it started with no console error; prints its `describe()` |
| `BUILD.json` | the kit's version and commit, and whether it was built from uncommitted changes |

`--allow-dirty` builds from uncommitted kit changes and says so in `BUILD.json`; `--out <dir>` writes somewhere else. `dist/` is a build product and is not committed.

A model's app is laid out as the kit is, so the starter's paths hold: `myapp/mir/`, `myapp/fonts/`, `myapp/LLM.md`, and the app in `myapp/app/`.

## The starter

`starter/index.html` and `starter/app.js` (161 lines) are the smallest whole MIR app: a ring of dots drawn from four numbers on a 2D canvas, with the wordmark and its seven menus, a rack with two windows (one built only when first opened), the modulation window with an LFO driving one number, the notebook whose first page is `LLM.md` (shared, and the greeting on the picture), FOLDERS, a key table and its help view, a notice on save and the boot card. Every section of `app.js` begins with a line saying what it is and what to change. Run it with `npm run gallery` and open `/starter/`.

**The mod pitch, in one function.** `param(key, label, min, max)` in `app.js` makes one number a kit knob and a target the modulation window can drive. A model adds a drivable number to a game with one line.

## `LLM.md`

One page, for a model and for a person (it is the starter's greeting): the one rule, how to start, the starter section by section, the builders with their import paths, INTENT as do and don't, how to add a window, a control, a target, a page, a key and a setting, how to write and check a skin, how to check the work, and **the mistakes models make**. That last list is predicted from the kit's laws today and is marked so; the observed list comes from running "build me Tetris" through real models.

## What a visiting model can read: `describe()` and `dump()`

`mir/core/describe.js`. An app hands over what it already has:

```js
import { createDescribe } from './mir/core/describe.js';
const d = createDescribe({ app: { name: 'TETRIS', what: 'Falling blocks.' }, rack, params, pages, keys, prefs: gui.prefs, mod });
```

| | What it gives |
|---|---|
| `describe()` | markdown: the app, its windows (open, built, which rack), every parameter with its range and current value (and, if a route drives it, its base), the key actions, and **only the pages marked shared**. The same text sits in the page in a hidden element, `#mir-describe`, for agents that only read the DOM; it is rewritten when the pages or keys change and at the end of a gesture, never on a timer |
| `dump()` | one block to paste to a model: the kit version, the browser, the look (skin, theme, card, frost, language, motion, viewport), the GUI preferences, the rack layout, the cost meter (`core/perf.js`), the last 20 errors and the last 20 input events, then `describe()` |
| `window.__MIR.describe()`, `window.__MIR.dump()` | the same, for an agent with a console |
| the notebook's ABOUT › COPY DUMP | the dump, when the app passes `dump: () => d.dump()` to `createNotebook` (the starter does) |

**What it never gives.** A page whose eye is shut is never named, counted or quoted. An input event is its kind and its target's hooks (`id`, `data-param`, `data-info`, `data-key-action`, the window and chip names), never its text, value, title or accessible name; a key pressed in a field is recorded without the key. And any text a field holds when the dump is made is cut out of it, so an error message that quoted it cannot carry it out. Hidden means hidden from a polite reader: anyone who opens the project file can read every page.

## Not built

- **Publishing the kit to npm** (plan ruling 8: not yet). The skill needs no publishing; a single-file web artifact would.
- **The theme optimiser** ("make it look like Tetris Effect"): it needs the 1.5.5 skins first.
- **'name'-specs** (METRO, SPRITES) with their own rules, images and fonts: they are code, and need their own loading law.
- **Lint results in the dump** (plan §3.5): the lints are node tools; a page cannot run them.
- **The observed mistakes** in `LLM.md` §9: they come from the model runs.

## Proofs

- `tests/describe.node.mjs`: `describe()` lists the windows, the parameters (live values, the modulated base) and the keys, and quotes only shared pages; `dump()` keeps the versions, layout, cost, errors and events, and a secret typed into a field (key by key, and leaked into an error message) is absent, as is the unshared page.
- `tests/starter.browser.mjs` (real pointer and keys, every press hit-tested with `elementFromPoint`): no console error; the greeting is `LLM.md`'s first heading; a knob drag moves its number; the LFO moves SIZE; the PLAY window is built only when opened; GUI opens MIR OPTIONS; `?` opens the help view; `qps` relabels; SAVE, a knob change and opening the saved project restores it; the hidden describe element holds the shared page and not the unshared one. `MIR_STARTER=/app/index.html` runs it against a copied-out app; `MIR_PLATES=1` writes `docs/plates/starter/{dark,light,modulation}.png`.
- The built skill: the same test passes against `dist/mir-builder/` served as it is, and against an app copied out of it by `SKILL.md`'s own command.
