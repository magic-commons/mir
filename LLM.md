# MIR, for a model building with it

This is **MIR**, Magic Commons' interface kit: glass, controls, windows, menus, pages and a modulation system, as plain ES modules and CSS with no build step. This page is the starter app's greeting and its manual. You are reading it on the picture; a model reads the same page through the app.

Press **J** for the notebook, **M** for modulation, **?** for the keys. Escape or a press on the picture puts these words away.

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

`app/app.js` is one file, under 200 lines. Every section starts with a `// ──` line saying what it is and what to change.

| Section | What it is | What you change |
|---|---|---|
| **THE NAME** | `APP` names every store in the browser (`APP + '.rack'` …) | both names, first |
| **THE LOOK** | `createGui`: the GUI window, which applies the user's stored theme, accent and glass before anything draws | nothing |
| **THE PICTURE** | a 2D canvas drawn from the numbers in `S`; the loop runs through `frame.coalesce`, only while PLAY is on | `S` and `draw()`: this is where Tetris goes |
| **THE PARAMETERS** | `param(key, label, min, max, make?, more?)`: one call makes `S[key]` a kit control **and** a modulation target | one call per number a player may turn |
| **THE RACK** | `createRack` + `rack.register({ id, title, side, open, build })`; `build` runs on first open (PLAY is lazy) | your windows |
| **MODULATION** | `installModulation({ mount, params, … })`; an LFO is routed onto SIZE on a first visit | which number the first route drives |
| **THE PAGES** | `createPages`: page 0 is this file, `shared`; page 1 has a label pointing at the SIZE knob | your greeting and pages |
| **INFORMATIONAL** | `createInfoLayer` + `greet`: page 0's first block on the picture | `subject()`: where your picture's subject is |
| **FOLDERS** | `registerProjectPart('scene', { capture, restore })` + `createFolders`: SAVE, OPEN, NEW, export | what a saved game holds |
| **THE KEYS** | `createKeys({ actions })`: the keyboard, once, as data; `createKeysHelp` is the help view | your actions |
| **THE MENUS** | `createMenubar({ menus })`: FILE · EDIT · VIEW · WINDOW · ABOUT · LANGUAGE · GUI as data | the rows |
| **DESCRIBE** | `createDescribe`: what a visiting model can read | `what`: one sentence |

`index.html` loads the kit's sheets in order (`mir/modulation/modwindow/modwindow.css` last, always), shows the boot card, and imports `app.js`.

The pitch, in one function: **register any number and the modulation window can drive it.** That is `param()`, and it is the whole seam:

```js
const gravity = param('gravity', 'GRAVITY', 0, 4);    // a knob, and a target an LFO, an envelope or the microphone can drive
```

A route writes its target as a base plus a swing, $x(t) = b + d\,\sin(2\pi f t)$; the hand moves $b$, never the swing.

## 4. The builders

One line each. Paths are from `app/`.

| Builder | Import | What it makes |
|---|---|---|
| `knob`, `fader`, `sw`, `seg`, `trig`, `readout`, `group`, `device`, `el`, `label` | `../mir/kit.js` | the controls; `el(tag, cls, parent, text)` for plain DOM |
| `frame.coalesce(key, fn)`, `frame.read`, `frame.write` | `../mir/core/frame.js` | the one frame: every animation and DOM write |
| `drag(el, { onMove, onEnd, onCancel })`, `installPress` | `../mir/core/pointer.js` | a gesture; the pressed look on buttons |
| `presence`, `tweenRect`, `flip` | `../mir/core/motion.js` | motion, by transform, honouring reduced motion |
| `registerProjectPart(name, { capture, restore })` | `../mir/core/project.js` | a piece of the project FOLDERS saves |
| `createDescribe` | `../mir/core/describe.js` | `describe()` and `dump()` |
| `createRack` | `../mir/shell/rack.js` | the racks of windows at the edges |
| `createWindow({ id, title, host, body, size })` | `../mir/window/window.js` | one floating window |
| `wordmark`, `createMenubar`, `createAccent` | `../mir/shell/wordmark.js`, `menubar.js`, `accent.js` | the name, its menus, the accent pair |
| `createNotebook`, `createPages` | `../mir/shell/notebook.js`, `pages.js` | the notebook (J) and the project's pages |
| `createGui` | `../mir/shell/gui.js` | MIR OPTIONS and MIR ABOUT |
| `createKeys`, `createKeysHelp`, `createKeyboardWindow` | `../mir/shell/keys.js`, `../mir/keyboard/keyboard.js` | keys as data, the help view, the rebinding window |
| `languageMenu`, `t` | `../mir/shell/language.js`, `../mir/core/i18n.js` | the LANGUAGE menu; translate your own sentences |
| `notice`, `openDialog`, `confirmDialog`, `bootCard`, `busyMark`, `settingsRows` | `../mir/shell/notice.js`, `dialog.js`, `boot.js`, `busy.js`, `settings-rows.js` | a toast, a dialog, the boot card, the loading mark, a settings panel |
| `installModulation` | `../mir/modulation/bind.js` | the modulation window, routed onto your parameters |
| `createFolders` | `../mir/folders/folders.js` | the project window |
| `createInfoLayer`, `showPage`, `greet` | `../mir/info/layer.js`, `../mir/info/page.js` | words on the picture |

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

The full table is `docs/INTENT.md`.

## 6. How to add

- **A window:** `rack.register({ id: 'score', title: 'SCORE', side: 'left', open: true, build(body) { body.append(readout({ label: 'LINES', value: '0' }).root); } })`. It is in the WINDOW menu by itself.
- **A control:** inside a window's `build`, a kit builder: `body.append(trig({ label: 'DROP', onFire: hardDrop }).root)`.
- **A modulation target:** `param('fall', 'FALL', 0.1, 4)`, before `installModulation` runs. The widgets must exist then, so build them with `param()` and put them in a window's `build`.
- **A page:** `pages.add({ title: 'How to play', md: '…', shared: true })`. A label on a control is a callout naming its `data-info`:

  ```md
  > [!mir|ui:size] SIZE
  > What this knob does.
  ```

- **A key:** a row in `createKeys({ actions })`: `{ id: 'rotate', label: 'ROTATE', group: 'GAME', keys: ['ArrowUp', 'X'], run: rotate }`. Menus show it with `keys.menuItem('rotate')`.
- **A setting:** an engine option goes in a window built with `settingsRows(body, rows)`. A look option (theme, accent, glass) is the GUI window's, never yours. Preferences never go in a project.
- **A saved thing:** `registerProjectPart('board', { capture: () => board.slice(), restore: (v) => load(v || EMPTY) })`. `restore(null)` is NEW.

## 7. A skin

A skin is token values only, in one file:

```json
{ "mir": 1, "kind": "skin", "kit": "1.5.0-alpha.3", "name": "ember",
  "data": { "tokens": { "--hue-acc": "28", "--glass-blur": "14px" }, "light": { "--lum-acc": "30%" } } }
```

Every key must be a token whose row in `mir/tokens.json` says `skin: true`. Check it with `node tools/check-envelope.mjs ember.json` before anyone loads it. The format is `docs/FORMAT.md`; the tokens are `docs/TOKENS.md`.

## 8. Check your work

1. Serve the folder and load the page in a browser (headless is fine): **no console error**.
2. Drag a control: the picture changes. Press its key: the action runs. Open the window from the WINDOW menu.
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
9. **Breaking the hand law**: a control's `onInput` writing the number directly while a route drives it, so the hand and the LFO fight. Use `mod.hand(id, v)` first, as `param()` does.
10. **Making targets inside a lazy window**: `installModulation` needs the widgets when it runs; a lazy window's `build` has not run yet.
11. **Finding things by their words**: `querySelector` by label text, or `.toUpperCase()` on a label. Labels translate; use `data-` hooks.
12. **One name for two apps**: leaving `APP = 'starter'`, so two apps share their saved layout, keys and projects.
13. **Space for an action**: the words on the picture hold still while Space is held. The starter plays on **P**.
14. **A sheet after `modwindow.css`.** It must be the last stylesheet.

### Observed

*(filled in after the model runs)*
