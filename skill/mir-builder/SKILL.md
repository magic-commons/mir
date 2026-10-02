---
name: mir-builder
description: Build an app, game, instrument or tool on MIR, Magic Commons' interface kit (Josh Hosain's glass UI kit with knobs, racks of windows, a modulation window, a notebook and words on the picture). Use when the person says "MIR", "with MIR", "use this UI", "in Josh's interface kit" or "like λWAVES / BASINS", or asks for an app or instrument in that kit, e.g. "build me Tetris with MIR". This skill carries the whole kit and a working starter app to copy.
---

# Building on MIR

MIR is a kit of plain ES modules and CSS with no build step and no dependencies. This folder carries all of it: the kit (`mir/`, `fonts/`), a **working starter app** (`starter/`), the one-page manual (`LLM.md`), the kit's laws (`docs/`) and three small tools (`tools/`). Call this folder `SKILL_DIR` (the folder this file is in).

## Do this, in this order

1. **Read `SKILL_DIR/LLM.md` in full** before writing any code. It is one page: the one rule, the starter explained section by section, the builders, the INTENT table, and the mistakes models make.
2. **Copy the starter; do not assemble an app from parts.** Make the app's folder with the kit beside the app:

   ```bash
   mkdir -p myapp && cp -r "$SKILL_DIR"/{mir,fonts,tools,LLM.md,LICENSE} myapp/ && cp -r "$SKILL_DIR/starter" myapp/app
   ```

   The app is `myapp/app/index.html` + `myapp/app/app.js`; it reads the kit at `../mir/` and its greeting at `../LLM.md`. Never edit anything in `myapp/mir/` or `myapp/fonts/`.
3. **Change the starter, section by section** (each section of `app.js` starts with a `// ──` line saying what to change):
   - THE NAME first: `KEY` (a unique id; it names every store) and `NAME`.
   - THE NUMBERS and THE PICTURE: replace `S` and `draw()` with the game. Keep the loop on `frame.coalesce`; it runs while the app's one clock plays (`app.playing()`).
   - THE APP: `createApp({ … })` wires everything; change its words, `pages`, `menus` and `keys` (one row per action: `{ id, label, group, keys, run }`; menus show `app.keys.menuItem(id)`). Space is already the one play.
   - THE PARAMETERS: one `app.param(key, label, min, max)` per number a player may turn. Each becomes a kit knob (or fader), a target the modulation window can drive, **and** part of a saved game.
   - THE RACK: one `app.rack.register({ id, title, side, open: !app.first, build })` per window; each gets a latch on the transport bar, which is the main opener (a first run shows only the bar).
   - Anything else a saved game holds: `registerProjectPart(name, { capture, restore })`.
   - THE PAGES: keep `LLM.md` as page 0 while you build; when the app is done you may replace it with the app's own greeting (page 0 is what greets, up to its first `---`; `shared: true` is what a visiting model may read).
4. **Keep the one rule: the kit draws; you never restyle a kit part.** Pass data and options to the builders (`knob`, `fader`, `sw`, `seg`, `trig`, `readout`, `rack.register`, `createWindow`, `notice`, `openDialog` …). Write CSS only to lay out your own picture and your own non-kit elements. If the kit lacks a part, build it plainly in your own file and say so in your answer. No accent fills for ON, no dark scrims, light from above (see LLM.md §5).

## Run it and check it

1. **Serve it** (modules do not load from `file://`): `node myapp/tools/serve.mjs 8800 myapp`, then the app is at `http://127.0.0.1:8800/app/`.
2. **Load it headless** and read what it says: `node "$SKILL_DIR/check-app.mjs" http://127.0.0.1:8800/app/ --shot /tmp/myapp.png`. It exits 0 only when the page started with **no console error** and no failed boot card, and prints the app's `describe()` (its windows, parameters and keys). Look at the picture it saved.
3. Fix every error before you report. Do not report "done" from reading the code alone.
4. **A skin** (token values only, `docs/FORMAT.md`): `node myapp/tools/check-envelope.mjs my-skin.json` must pass before anyone loads it.
5. When something is wrong in the browser, `window.__MIR.dump()` is one block that says what the app was doing (versions, look, layout, cost, recent errors and input events, never what was typed).

## Licence

MIR is **GPL-3.0-only** (`LICENSE`). An app made by copying the kit is a work based on MIR. Kept private, nothing is owed. Given or published to anyone, it must go with its complete source under GPL-3.0-only, with `LICENSE` beside it; the fonts keep their own SIL OFL licences (in `fonts/`). Say this to the person when you hand the app over.

## Where things are

| What | Where |
|---|---|
| the manual for you | `SKILL_DIR/LLM.md` |
| the starter | `SKILL_DIR/starter/` (`index.html`, `app.js`, `README.md`) |
| every export | `SKILL_DIR/docs/API.md` |
| what every shadow, bevel and light means | `SKILL_DIR/docs/INTENT.md` |
| one page per part | `docs/RACK.md`, `MODULATION.md`, `FOLDERS.md`, `KEYS.md`, `NOTEBOOK.md`, `INFORMATIONAL.md`, `GUI.md`, `SHELL-PARTS.md`, `LANGUAGES.md`, `FORMAT.md` |
| the tokens a skin may set | `SKILL_DIR/mir/tokens.json` (`skin: true`), `docs/TOKENS.md` |
| the kit's version | `SKILL_DIR/BUILD.json`, `mir/version.js` |
