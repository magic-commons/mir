# MIR, for a model building with it

This is **MIR**, Magic Commons' interface kit: glass, controls, windows, menus, pages and a modulation system, as plain ES modules and CSS with no build step. This page is the starter app's greeting and its manual. You are reading it on the picture; a model reads the same page through the app.

The bar at the bottom opens everything: **Space** (or ▶) plays, the ring beside it is modulation's power, the latches open the windows, the MIR mark opens modulation. **J** the notebook, **?** the keys. Escape or a press on the picture puts these words away.

---

## 1. The one rule

**The kit draws. You never restyle a kit part: you pass it data and options.**

A knob is `knob({ label, min, max, value, onInput })`. Its shape, light, shadow, focus ring and hover are the kit's sheets. You write the picture (a canvas, a game, a simulation) and the numbers; the kit writes every control, window, menu and page around it. If the kit has no part for what you need, build it plainly in your own file and say so; never copy a kit part's look into a second one.

> [!tip] Licence
> MIR is GPL-3.0-only. An app built by copying the kit is a work based on it: if it is given to anyone else, it goes with its source under GPL-3.0-only. Kept private, nothing is owed.

## 2. How to start

**Copy the starter, then change the game.** Assembling an app from the parts below by hand is slower and gets the order wrong.

```
myapp/
  mir/        the kit: never edit a file in it
  fonts/      the kit's faces (mir/css/skin.css reads ../../fonts/)
  LLM.md      this page: the starter's greeting
  LICENSE     GPL-3.0
  app/        the starter, renamed: index.html + app.js
```

- From the `mir-builder` skill: copy its `mir/`, `fonts/`, `LLM.md` and `LICENSE` into the new folder, and its `starter/` as `app/`.
- From the kit's repository: `starter/` is the app, and `mir/` and `fonts/` sit beside it.
- An app adopted with `node tools/adopt.mjs <app>` has the kit at `lab/mir/` and `lab/fonts/` instead; its page is `lab/index.html`, and every `../mir/` below is `./mir/` there.
- **Serve it, never open the file.** Modules do not load from `file://`. `node tools/serve.mjs 8800 myapp` (or `python3 -m http.server 8800` in `myapp/`), then `http://127.0.0.1:8800/app/`.

## 3. The starter, section by section

`app/app.js` is one file of about 70 lines. Every section starts with a `// ──` line saying what it is and what to change. `index.html` loads one stylesheet, `../mir/mir.css` (every kit sheet, in order), shows the boot card, and imports `app.js`.

| Section | What it is | What you change |
|---|---|---|
| **THE NAME** | `KEY` names every store in the browser (`KEY + '.rack'` …) | both names, first |
| **THE NUMBERS** | `S`: every number the picture is drawn from | your game's numbers |
| **THE PICTURE** | a 2D canvas drawn from `S`; the loop runs through `frame.coalesce`, only while the app's one clock plays | `draw()`: this is where Tetris goes |
| **THE APP** | `createApp({ name, key, stage, state: S, present, pages, menus, … })` (`../mir/app.js`): the look, the language, the key table, the transport bar, the rack, modulation, the pages, the notebook, FOLDERS, the words on the picture, the menus and describe, wired in the kit's order | the words, `pages`, `menus` |
| **THE PARAMETERS** | `app.param(key, label, min, max, more?)`: one call makes `S[key]` a kit control, a modulation target **and** a saved value | one call per number a player may turn |
| **THE RACK** | `app.rack.register({ id, title, side, open: !app.first, build })`; each window gets a latch on the bar; `build` runs on first open | your windows |
| **MODULATION** | `app.mod.route('lfo', 'app.size', 0.35)` on a first run: an LFO drives SIZE | which number the first route drives |

The pitch, in one function: **register any number and the modulation window can drive it.** That is `app.param()`, and it is the whole seam:

```js
const gravity = app.param('gravity', 'GRAVITY', 0, 4);    // a knob, a target an LFO can drive, and part of a saved game
```

A route writes its target as a base plus a swing, $x(t) = b + d\,\sin(2\pi f t)$; the hand moves $b$, never the swing, and a project saves $b$ (`param.value()`), never the swinging reading.

**One clock.** The app has one play: the bar's ▶ and **Space**. Modulation has a power button (the ring on the bar): off, every route lets go and every number is back on its base; it never plays or pauses. The starter's picture turns while the clock plays (`app.playing()`); a reload never plays by itself.

**The bar is the opener.** On a first run (nothing saved) `app.first` is true and every window stays closed: only the bar is on screen, and each window opens from its latch.

Any piece `createApp` wires can be left out (`folders: false`), given more options (`rack: { favourites: 4 }`), or built by hand with the builders below: each is returned (`app.rack`, `app.mod`, `app.keys`, `app.folders`, `app.info`, `app.pages`, `app.notebook`, `app.gui`, `app.transport`, `app.describe`).

## 4. The builders

One line each. Paths are from `app/`.

| Builder | Import | What it makes |
|---|---|---|
| `createApp`, `makeParam` | `../mir/app.js` | the standard wiring in one call; one number as a control, a target and a saved value |
| `knob`, `fader`, `sw`, `seg`, `trig`, `readout`, `group`, `device`, `el`, `label` | `../mir/kit.js` | the controls; `el(tag, cls, parent, text)` for plain DOM |
| `frame.coalesce(key, fn)`, `frame.read`, `frame.write` | `../mir/core/frame.js` | the one frame: every animation and DOM write |
| `drag(el, { onMove, onEnd, onCancel })`, `installPress` | `../mir/core/pointer.js` | a gesture; the pressed look on buttons |
| `presence`, `tweenRect`, `flip` | `../mir/core/motion.js` | motion, by transform, honouring reduced motion |
| `registerProjectPart(name, { capture, restore })` | `../mir/core/project.js` | a piece of the project FOLDERS saves |
| `createDescribe` | `../mir/core/describe.js` | `describe()` and `dump()` |
| `createRack` | `../mir/shell/rack.js` | the racks of windows at the edges; `rack.windows()` lists them |
| `createTransport`, `firstRun`, `transportActions` | `../mir/shell/transport.js` | the transport bar: the one play, modulation's power, the tempo, the latches |
| `createWindow({ id, title, host, body, size })` | `../mir/window/window.js` | one floating window |
| `wordmark`, `createMenubar`, `createAccent` | `../mir/shell/wordmark.js`, `menubar.js`, `accent.js` | the name, its menus, the accent pair |
| `createNotebook`, `createPages` | `../mir/shell/notebook.js`, `pages.js` | the notebook (J) and the project's pages |
| `createGui` | `../mir/shell/gui.js` | MIR OPTIONS and MIR ABOUT |
| `createKeys`, `createKeysHelp`, `createKeyboardWindow` | `../mir/shell/keys.js`, `../mir/keyboard/keyboard.js` | keys as data, the help view, the rebinding window |
| `languageMenu`, `t` | `../mir/shell/language.js`, `../mir/core/i18n.js` | the LANGUAGE menu; translate your own sentences |
| `notice`, `openDialog`, `confirmDialog`, `bootCard`, `busyMark`, `settingsRows` | `../mir/shell/notice.js`, `dialog.js`, `boot.js`, `busy.js`, `settings-rows.js` | a toast, a dialog, the boot card, the loading mark, a settings panel |
| `installModulation` | `../mir/modulation/bind.js` | the modulation window; `mod.add(param)`, `mod.route(source, id, depth)`, `mod.play(on)`, `mod.setPower(on)` |
| `createFolders` | `../mir/folders/folders.js` | the project window |
| `createInfoLayer`, `infoActions`, `showPage`, `greet` | `../mir/info/layer.js`, `../mir/info/page.js` | words on the picture; `greet(…, { first: true })` shows page 0 up to its first `---` |

Every export is in the kit's `docs/API.md`; every part has its own page in `docs/`.

## 5. INTENT: what every shadow, bevel and light means

| | DO | DON'T |
|---|---|---|
| **ON** | the kit's frost face and rim; a switch lights its LED | fill it with the accent colour |
| **A dialog** | `openDialog`: a pane at menu height | a dark scrim behind it; no dark layers anywhere |
| **Light** | from above: every shadow falls down | a shadow that falls up, a fifth shadow height |
| **Raised** | means *press me* | raise something that is selected or on |
| **Inset** | means *a well*: a track, a field you type in | sink a resting button |
| **Accent A** | live, emphasis: a value moving | use it for a route or time |
| **Accent B** | a relationship or time: a route, a macro, the playhead | use it for "live" |
| **Pressed** | the kit's sink and small scale | a translate, a well |
| **Focus** | the kit's ring outside, on `:focus-visible` | a ring on hover, or none |
| **Colour** | spend it on meaning; resting chrome is grey | colour a panel to decorate it |
| **Time** | one play: the bar's ▶ and Space run the app's clock; modulation has a power button, which only bypasses its routes | a second play button, or a play inside a window |
| **Opening** | the transport bar is the main opener: on a first run only the bar shows (`open: !app.first`), and every window has a latch on it | open windows on a first run, or hide a window's only way in inside a menu |

The full table is `docs/INTENT.md`.

## 6. How to add

- **A window:** `app.rack.register({ id: 'score', title: 'SCORE', side: 'left', open: !app.first, build(body) { body.append(readout({ label: 'LINES', value: '0' }).root); } })`. It gets a latch on the bar and a row in the WINDOW menu by itself.
- **A control:** inside a window's `build`, a kit builder: `body.append(trig({ label: 'DROP', onFire: hardDrop }).root)`.
- **A modulation target:** `app.param('fall', 'FALL', 0.1, 4)`, anywhere: at the top, or inside a window's `build` (it becomes a target when the window is first built). `{ map: 'log' | 'wrap' | 'integer', make: fader, fmt }` shape it.
- **A route, in code:** `app.mod.route('lfo', 'app.fall', 0.4)` (a source kind or id, the parameter's id `app.<key>`, how far it swings); its `remove()` undoes it.
- **A page:** add a row to `createApp({ pages })`, or `app.pages.add({ title: 'How to play', md: '…', shared: true })`. A label on a control is a callout naming its key:

  ```md
  > [!mir|ui:size] SIZE
  > What this knob does.
  ```

- **A key:** a row in `createApp({ keys: [...] })`: `{ id: 'rotate', label: 'ROTATE', group: 'GAME', keys: ['ArrowUp', 'X'], run: rotate }`. Menus show it with `app.keys.menuItem('rotate')`. Space is already the one play; I holds the words on the picture still.
- **A menu row:** `createApp({ menus: { EDIT: () => [['UNDO', undo]] } })`; FILE, WINDOW, ABOUT, LANGUAGE and GUI are the kit's unless you pass your own.
- **A setting:** an engine option goes in a window built with `settingsRows(body, rows)`. A look option (theme, accent, glass) is the GUI window's, never yours. Preferences never go in a project.
- **A saved thing:** every `app.param()` is saved already. Anything else: `registerProjectPart('board', { capture: () => board.slice(), restore: (v) => load(v || EMPTY) })`. `restore(null)` is NEW.

## 7. A skin

A skin is token values only, in one file:

```json
{ "mir": 1, "kind": "skin", "kit": "1.5.0-alpha.5", "name": "ember",
  "data": { "tokens": { "--hue-acc": "28", "--glass-blur": "14px" }, "light": { "--lum-acc": "30%" } } }
```

Every key must be a token whose row in `mir/tokens.json` says `skin: true`. Check it with `node tools/check-envelope.mjs ember.json` before anyone loads it. The format is `docs/FORMAT.md`; the tokens are `docs/TOKENS.md`.

## 8. Check your work

1. Serve the folder and load the page in a browser (headless is fine): **no console error**.
2. A first load shows only the bar. Open a window from its latch, drag a control: the picture changes. Space plays. Press a key: its action runs.
3. `window.__MIR.describe()` in the console reads like this app; `window.__MIR.dump()` is the block to paste when something is wrong.
4. A skin passes `node tools/check-envelope.mjs`.

## 9. Mistakes models make

> [!warning] Predicted, not yet observed
> These are predicted from the kit's laws. The observed list comes from running "build me Tetris with MIR" through real models.

1. **Restyling a kit control**: CSS on `.k`, `.trig`, `.sw`, `.dev`, or colours on them. Pass options; leave the look.
2. **Raw elements instead of builders**: `<button>`, `<input type="range">`, `<select>` where `trig`, `fader`, `seg` exist.
3. **An accent fill for ON**, or a dark overlay behind a dialog.
4. **A private loop**: `requestAnimationFrame` or `setInterval` beside the kit's frame. Use `frame.coalesce(key, fn)`; book the next frame only while something moves.
5. **A private `keydown` listener.** Every key goes in the key table, or the menus, hints and help view do not know it.
6. **Opening `index.html` as a file**: nothing loads. Serve it.
7. **Editing `mir/`** to change a look. The kit is copied, never edited; ask for the change in the kit.
8. **Wrong paths** after moving the starter: the app is one folder below the kit (`../mir/`, `../LLM.md`).
9. **A knob made by hand for a number modulation drives**, with an `onInput` that writes the number: the hand and the LFO fight, and a save stores the LFO's reading. Make it with `app.param()`.
10. **Finding things by their words**: `querySelector` by label text, or `.toUpperCase()` on a label. Labels translate; use `data-` hooks.
11. **One name for two apps**: leaving `KEY = 'starter'`, so two apps share their saved layout, keys and projects.
12. **A second play**: a PLAY switch in a window, or modulation's power used as a play. There is one clock; Space and the bar's ▶ run it.
13. **Opening windows on a first run** (`open: true`): the bar is the opener; use `open: !app.first`.

### Observed

*(filled in after the model runs)*
