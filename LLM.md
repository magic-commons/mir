# MIR, for a model building with it

This is **MIR**, Magic Commons' interface kit: glass, controls, windows, menus, pages and a modulation system, as plain ES modules and CSS with no build step. This page is the starter app's greeting and its manual. You are reading it on the picture; a model reads the same page through the app.

The bar at the bottom opens everything: **Space** (or ▶) plays, the ring beside it is modulation's power, the latches open the windows, the MIR mark opens modulation. **S** FOLDERS, **M** modulation, **J** the notebook, **B** the rack, **T** dock the transport, **H** hide the interface, **F** full screen, **?** the keys (BASINS' table, the kit's default). Escape or a press on the picture puts these words away.

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
| **THE PICTURE** | a 2D canvas drawn from `S` inside `app.safeRect()`; the loop runs through `frame.coalesce`, only while the app's one clock plays | `draw()`: this is where Tetris goes |
| **THE APP** | `createApp({ name, key, stage, state: S, present, subject, pages, keys, menus, … })` (`../mir/app.js`): the look, the language, the key table, the transport bar, the rack, modulation, the pages, the notebook, FOLDERS, the words on the picture, the menus and describe, the banner, the scene guard and the wake lock, wired in the kit's order. Opt in with `timeline: true` (the TIMELINE and the lego stack under the modulation window), `session: true` (the live project: RESUME on a cold start), `pattern: false` (the PATTERN step sequencer is on with the modulation). `name` is also the page title and the wordmark. `present` is your redraw: it is called when a number changes, **when the theme or the look changes**, and when a window opens or closes. `subject()` is where your picture's subject is (the board, the ring), in stage px: the words on the picture rest beside it | the words, `subject`, `pages`, `keys`, `menus` |
| **THE PARAMETERS** | `app.param(key, label, min, max, more?)`: one call makes `S[key]` a kit control, a modulation target **and** a saved value | one call per number a player may turn |
| **THE RACK** | `app.rack.register({ id, title, side, open: !app.first, build })`; each window gets a latch on the bar; `build` runs on first open | your windows |
| **MODULATION** | `app.mod.route('lfo', 'app.size', 0.35)` on a first run: an LFO drives SIZE | which number the first route drives |

The pitch, in one function: **register any number and the modulation window can drive it.** That is `app.param()`, and it is the whole seam:

```js
const gravity = app.param('gravity', 'GRAVITY', 0, 4);    // a knob, a target an LFO can drive, and part of a saved game
```

A route writes its target as a base plus a swing, $x(t) = b + d\,\sin(2\pi f t)$; the hand moves $b$, never the swing, and a project saves $b$ (`param.value()`), never the swinging reading.

**One clock.** The app has one play: the bar's ▶ and **Space** (the key table's `transport.play`; it works over a focused button too). It always plays, with or without modulation: no route, no source and the power off never stop it. Modulation has a power button (the ring on the bar): off, every route lets go and every number is back on its base; it never plays or pauses. Your loop runs while `app.playing()`; a game stops the clock itself with `app.pause()` (game over) and `app.play()` starts it; a reload never plays by itself.

**Where the picture may draw: `app.safeRect()`** → `{ left, top, width, height }` in stage px, the stage minus the transport bar and the racks showing a window. Fit your board in it, not in the whole canvas (paint the background over the whole canvas). It changes when a window opens or closes, and `present` is called then.

**The bar is the opener.** On a first run (nothing saved) `app.first` is true and every window stays closed: only the bar is on screen, and each window opens from its latch.

Any piece `createApp` wires can be left out (`folders: false`), given more options (`rack: { favourites: 4 }`), or built by hand with the builders below: each is returned (`app.rack`, `app.mod`, `app.keys`, `app.folders`, `app.info`, `app.pages`, `app.notebook`, `app.gui`, `app.transport`, `app.describe`, `app.pattern`, `app.timeline`, `app.session`, `app.banner`, `app.sceneGuard`, `app.wakeLock`).

## 4. The builders

One line each. Paths are from `app/`.

| Builder | Import | What it makes |
|---|---|---|
| `createApp`, `makeParam` | `../mir/app.js` | the standard wiring in one call (`app.play()`, `app.pause()`, `app.playing()`, `app.safeRect()`); one number as a control, a target and a saved value |
| `knob`, `fader`, `sw`, `seg`, `trig`, `readout`, `group`, `device`, `el`, `label`, `onThemeChange` | `../mir/kit.js` | the controls; `el(tag, cls, parent, text)` for plain DOM (`el('div', 'row', body)` is the kit's row: controls side by side, spread across the window); `onThemeChange(fn)` outside `createApp` |
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
| `installTimeline` | `../mir/timeline/bind.js` | the timeline, the kit's second plugin: lanes of automation clips on any parameter, in the modulation clock (`installTimeline({ mount, mod, keys, history })`; `docs/TIMELINE.md`) |
| `installPattern` | `../mir/pattern/window.js` | PATTERN, the step sequencer for the modulation window's ENVs: 16/32/64 steps a row, one window on its device (`installPattern({ mount, mod })`; `docs/PATTERN.md`) |
| `createSession`, `openerSwitches` | `../mir/core/session.js` | the live project beside the view: saved 300 ms after a change, RESUME on a cold start (`docs/SESSION.md`) |
| `createSceneGuard`, `installBanner`, `bootVeil`, `installWakeLock`, `copyText` | `../mir/shell/scene-guard.js`, `banner.js`, `boot.js`, `../mir/core/wakelock.js`, `../mir/shell/clipboard.js` | the UI's space never reaches the picture; the banner of problems; the boot veil; the screen kept awake while it plays; copy (`docs/SCENE-GUARD.md`, `docs/SHELL-PARTS.md`) |
| `createInkSampler` | `../mir/core/ink.js` | each label white or black from the picture beneath it (`docs/INK.md`) |
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

- **A key:** a row in `createApp({ keys: [...] })`: `{ id: 'rotate', label: 'ROTATE', group: 'GAME', keys: ['ArrowUp', 'X'], run: rotate }`, or later `app.keys.add(row)`. A key is one key with any modifiers: `'Space'`, `'Enter'`, `'ArrowLeft'`, `'X'` (or `'KeyX'`), `'Shift+ArrowDown'`, `'Mod+S'` (Ctrl, or ⌘ on a Mac); a modifier alone (`'Shift'`) is refused with an error. Menus show a row with `app.keys.menuItem('rotate')`. Space is already the one play (`transport.play`); I holds the words on the picture still. **Game keys over a focused control:** a knob owns its arrows and a button its Enter; a game's arrows say `overControls: true, when: () => app.playing()`, so they steer the game while it plays and leave a paused game's knobs their arrows. `repeat: true` lets a held key repeat.
- **A number shown, not turned:** `const lines = readout({ label: 'LINES', value: '0' })`, then `lines.set(String(n))` every time it changes (there is no `.value`). Keep the readout in a variable your game updates; a window's `build` runs once.
- **A menu row:** `createApp({ menus: { EDIT: () => [['UNDO', undo]] } })`; FILE, WINDOW, ABOUT, LANGUAGE and GUI are the kit's unless you pass your own.
- **A glyph** (`glyph:` on a rack window or a latch, `glyphEl(name)`): one of <!-- glyphs -->`barsBottom` `barsTop` `bulletList` `camera` `check` `chevronDown` `clear` `close` `compact` `dirNext` `dirPrev` `dot` `download` `duplicate` `expand` `folder` `gallery` `grip` `info` `invertColors` `juliaRestore` `leave` `lock` `mandelbrot` `mandelbrotSmall` `morph` `north` `pause` `pending` `play` `plus` `projectFile` `rename` `render` `reopen` `save` `saveFolder` `sliders` `swap` `tune` `warn`<!-- /glyphs -->. Any other name draws no glyph (the gallery's GLYPHS card shows them all).
- **A setting:** an engine option goes in a window built with `settingsRows(body, rows)`. A look option is the GUI window's, never yours: a **vanilla theme** (FROST · MORPH · CLASSIC · SWIFT · AURORA · NEON, each with tones) is a named set of the built-in settings; anything needing rules or art outside them is a **'name'-spec**, a separate MIR build. Preferences never go in a project.
- **A saved thing:** every `app.param()` is saved already. Anything else: `registerProjectPart('board', { capture: () => board.slice(), restore: (v) => load(v || EMPTY) })`. `restore(null)` is NEW.

## 7. A skin

A skin is token values only, in one file:

```json
{ "mir": 1, "kind": "skin", "kit": "1.5.0-alpha.5", "name": "ember",
  "data": { "tokens": { "--hue-acc": "28", "--glass-blur": "14px" }, "light": { "--lum-acc": "30%" } } }
```

Every key must be a token whose row in `mir/tokens.json` says `skin: true`. Check it with `node tools/check-envelope.mjs ember.json` before anyone loads it. The format is `docs/FORMAT.md`; the tokens are `docs/TOKENS.md`.

## 8. Check your work

1. Serve the folder (`node tools/serve.mjs 8800`; it prints the app's address) and load the page: **no console error**.
2. **Play it, headless, with real keys**, from the app's folder: `node tools/check-app.mjs http://127.0.0.1:8800/app/ --keys Space --expect playing --keys ArrowLeft,ArrowUp --changed 'JSON.stringify(window.__GAME.piece)' --shot /tmp/app.png` (`--changed` reads whatever your app puts on `window`). Press your app's main keys and click a latch (`--click '#transport [data-opener="score"]'`); it exits 0 only when every step landed and every check held, and prints `describe()`: the windows, the clock, every parameter and the keys in full, each shared page as its title and line count (`--pages` prints the pages too). Booting is not working: Space must play.
3. Look at the picture it saved, in both themes (`--light`): the board inside the safe rect, the words beside it, nothing under the bar.
4. `window.__MIR.dump()` is the block to paste when something is wrong. A skin passes `node tools/check-envelope.mjs`.

## 9. Mistakes models make

### Observed (2026-10-02: "build me Tetris with MIR", one run each of Haiku, Sonnet and Opus, from the skill alone)

| Mistake | Who | Now |
|---|---|---|
| A play that did nothing: with no route, Space was refused, so each app routed an LFO it did not need just to make the clock run | all three (Sonnet found why) | **the kit prevents it**: the app's play never depends on modulation |
| Space over a just-clicked latch pressed the latch instead of playing | Haiku, Sonnet (Opus wrote its own Space row) | **the kit prevents it**: Space plays over a focused control |
| The greeting under the transport bar; a subject of the whole stage | Sonnet, Opus | **the kit prevents it**: the words keep clear of the bar and the racks; a subject is the thing, not the stage |
| The board drawn under the bar | Haiku | `app.safeRect()`; **the page says** (§3) |
| The canvas not redrawn when the theme flips while paused | Haiku, Sonnet | **the kit prevents it**: `present` is called on a theme change |
| `STARTER` left in the page title and the boot card | Haiku | **the kit prevents it**: `name` writes them |
| A parameter key in camelCase (`fallSpeed`) | Haiku | **an error says so**, naming the key and the rule |
| A hard drop bound to `Shift` alone: a row with no key, silently | Haiku | **an error says so** |
| `app.keys.add()`, which did not exist | Haiku | **added** |
| A glyph name guessed (`target`): no glyph drawn | Haiku | **the page lists them** (§6) |
| A readout written once in `build` and never again (the score froze); `.value` for `.set()` | Haiku | **the page says** (§6) |
| A page label naming a control by a key that does not exist (`ui:fallSpeed` for the key `speed`) | Haiku | **the page says**: `ui:<key>` is the parameter's key |
| One number on two controls (a GHOST knob and a GHOST switch writing it directly) | Haiku | **the page says** (mistake 9 below) |
| "It works" from "it loads" | Haiku, Sonnet | **the checker plays it** (§8) |

### Predicted, still plausible

1. **Restyling a kit control**: CSS on `.k`, `.trig`, `.sw`, `.dev`, or colours on them. Pass options; leave the look.
2. **Raw elements instead of builders**: `<button>`, `<input type="range">`, `<select>` where `trig`, `fader`, `seg` exist.
3. **An accent fill for ON**, or a dark overlay behind a dialog.
4. **A private loop**: `requestAnimationFrame` or `setInterval` beside the kit's frame. Use `frame.coalesce(key, fn)`; book the next frame only while something moves.
5. **A private `keydown` listener.** Every key goes in the key table, or the menus, hints and help view do not know it.
6. **Opening `index.html` as a file**: nothing loads. Serve it.
7. **Editing `mir/`** to change a look. The kit is copied, never edited; ask for the change in the kit.
8. **One name for two apps**: leaving `KEY = 'starter'`, so two apps share their saved layout, keys and projects.
9. **A number on a control made by hand** (or on two controls), with an `onInput` that writes it: the hand and the LFO fight, and a save stores the LFO's reading. One `app.param()` per number.
10. **A second play**: a PLAY switch in a window, or modulation's power used as a play.
11. **Wrong paths** after moving the app: it sits one folder below the kit (`../mir/`, `../LLM.md`).
12. **Finding things by their words** (`querySelector` by label text): labels translate; use `data-` hooks.

None of the three restyled a kit part, wrote a private `keydown`, a `setInterval` loop or a second play button, or filled ON with the accent.
