# Adopting MIR 1.5 from 1.4

A checklist for an app moving from the 1.4 line to 1.5. Run `node tools/adopt.mjs <app> --line 1.5` (see
`docs/LINES.md`), then work down this list. Each entry says what changed, how to find the places in your app, and
what to write instead. Entries are added by the lane that made the change.

## 1. The chip rail is styled by hooks, not by its label

**What changed.** Kit CSS used to select the modulation window's chip rail by its English label,
`[aria-label="MODULATION window controls"]` (exact) and `[aria-label$="window controls"]` (suffix). Rename or translate
the label and the chips silently lost their material. 1.5 gives the rail and chips stable hooks and the kit's CSS keys
on them. The aria-label is unchanged and is for people only.

| Was | Now |
|---|---|
| `.kwin-chiprail[aria-label="MODULATION window controls"]` | `.kwin-chiprail[data-mir-rail="modulation"]` |
| `.kwin-chiprail[aria-label$="window controls"]` | `.kwin-chiprail[data-mir-rail]` |
| `.crail-chip[data-rail="ribbon"]` | `.crail-chip[data-mir-chip="ribbon"]` |

- The rail root carries `data-mir-rail="<window id>"` (`modulation` for the modulation window); each chip carries
  `data-mir-chip="<chip name>"` (`close`, `compact`, `workbars`, `ribbon`, `drag`, ...). `data-rail` on chips is still
  set, with the same value.
- **If your app builds its own rails** (BASINS does, in `mir-plugins/kwin/kwin.js`), set `data-mir-rail` there too, or
  the kit's host-rank rules (`[data-mir-rail]`) will not match your rail.
- Find your selectors: `grep -rn "window controls" <app>` over `*.css` and `*.js`; every hit that is a selector (not
  the `aria-label` assignment itself) becomes a hook selector from the table. Specificity is unchanged, one attribute
  selector for one.

**BASINS** (`MANDELBROT APP/.../basins-engine-2026-09-12/app/`), read-only survey. Files that mention
`window controls`: `colour-window.js`, `lab.css`, `scene-input-guard.js`, `skin.css`, `timeline-window.css`,
`colour.css`, `mir-plugins/kwin/kwin.js`. (`lab/mir/**` is the kit copy and is replaced by adopting.)

## 2. The chips' glyph attribute is `data-glyph`, not `data-ink`

**What changed.** Chips named their glyph with `data-ink="close|<glyph>"`. A host's adaptive text ink uses the same
attribute for `w|k`, so the two collided. The kit's chips now use `data-glyph`; the kit reads `data-ink` nowhere.

- Find: `grep -rn "dataset.ink\|data-ink" <app>`. Anything that sets or selects the chips' glyph name moves to
  `data-glyph`. Leave `data-ink="w|k"` (the adaptive-ink contract) alone.

**BASINS** sets the glyph on its own chips in `colour-window.js:179` (`xEl.dataset.ink = 'close'`) and in
`mir-plugins/kwin/kwin.js` (lines 252, 294, 299). Those become `dataset.glyph`. `adaptive-ink.js` and `ink.css` use
`data-ink` for `w|k` and stay as they are.

## 3. An app's resting rule now beats the kit's pressed and focus states

An unlayered app rule beats every kit layer, whatever the state. So the kit's `:active` and `:focus-visible` rules inside an adopted or plugin window lose to **any** app rule on the same property, even a resting one: a pressed button can lose its press wash, and a focused one shows the app's own outline instead of the kit's accent ring. In BASINS this hits `#savewin`, `#timelinewin`, `#patternwin` and `#modwin` (`skin.css` `.m2-workspace-switch`). The fix is the app's: scope the resting rule with `:not(:active):not(:focus-visible)`, or drop it.

## 4. Layers, CSSOM copies and the names the kit now reads

- **A script that clones the kit's rules from the CSSOM** (BASINS' `adoptMaterial()` in `mir-plugins/kwin/kwin.js`) must descend into `@layer mir…` blocks and re-issue each rule inside a layer of the same name; descending only into `@media` / `@supports` copies nothing now.
- **An app's own layers must not be named `mir.*`**: they would sit inside the kit's `mir` layer and beat the whole kit. Rename them `app.*` and put one order statement, `@layer app, mir;`, before `base.css`.
- **The modulation window's ink ladder** may be replaced inside `@layer mir.kit.plugin.host` (`docs/LAYERS.md` §6.1).
- **`--surface-shadow` on `<body>` is read by the kit's panes** (and `--surface-*` generally, `docs/TIERS.md`). An app that already wrote that name now reaches the kit; it must never write `none` there (a switched-off shadow is `0 0 0 0 transparent`).

## 5. A floating window's whole rect is UI space

An app's picture gestures (wheel zoom, drag to pan, a click that places something) must treat a floating window's **whole rect** as UI space: its gaps between parts and its round corners included, not only the elements under the pointer. Test the rect, not `event.target`: `rack.keepClear()` gives the rects of the racks and the transport bar, and each kit window's `rect()` its own. Inside the rack's float layer (`rack.el.floats`, where `createApp` mounts the kit's windows) the layer is `pointer-events: none` and each window `auto`, so a window takes the pointer; a press in a window's gap must still not reach the picture.

## 6. Behaviour that changed under an app in 1.5.0-alpha.5

- **The notice is BASINS' toast by default**: one centred pill above the bottom, a new message replaces the old. An app that relied on NEBULA's corner stack passes `seat: 'corner'`.
- **INFORMATIONAL's hold-still is the I key; Space is the app's one play.**
- **The GUI window's `shadow` is an amount (0–2)**, not a switch (the switch is `dropShadow`); a stored alpha.4 value is migrated. `LOOK_PRESETS` holds the themes; `LOOK_PRESETS.light` is gone (SWIFT).
- **SPACING's default is tighter** (rack gap and inset 6 px, pane padding 8; 1.4 was 10 / 10 / 7).
- **English keys changed** (contexts, `{:LABEL}`, whole sentences): an app's own language pack keyed on kit strings must move to the new keys (`mir/locales/en.json`).

## 7. What BASINS can delete now

Gathered from the lanes that harvested BASINS' parts into the kit (each is a kit part with BASINS' design; delete BASINS' copy when the adoption reaches it):

- **Settings › LOOK** (VANILLA): in `skin.js`, `setFaces`, `setFaceBlend`, `setText`, `setMaterial`, `setMaterialPreset`, `applyGlass`, `setBlur` and the pane part of `setUIDropShadow`, with their prefs keys; `surface-material.js` + `.css`; the glass-face, popover, glass-knob and window-edge rules of `material.css`; the TEXT seats of `ink.css` §1 (body and forced; `adaptive-ink.js` stays); its own rack gaps (SPACING).
- **The toast** (shell parts): `toast()` and `#toast` (`notice()` is BASINS' toast).
- **Keys** (keys lane): its own Space handler for playing over a focused control (`overControls` in the key table); the history list's own UNDO / REDO and count wiring (`historyList(…, { tools: false, count: false })`, `state()`, `onChange()`).
- **The transport** (transport lane): the `transport.js` bar (all but the macro rail), `transport-controls.js` / `.css` (including its 44 px power rule `#modwin.mir-modwindow .modxport.mir-mod-power`: the kit draws the seat), `transport-dodge.js`, the stage and rack seats of `transport-placement.js`, the `#transport` rules in `skin.css` / `lab.css`. The kit now has BASINS' ui-fix sizes (tempo 18 px, play 32 px) and the work-bar form (`bar: 'work'`).
- **The docked chip rail and the modulation window docked** (modulation lane): any app rule that tightened docked chips or clipped the docked work bar (`rail.setDock`, `--rail-gap`).
- **The start-up** (EASE): the per-sheet `<link>`s (one `mir/mir.css`); a full-screen windows layer and its `pointer-events` rules (mount kit windows in `rack.el.floats`); the hand law in each control's `onInput` and the `isModulated ? baseOf : get` in a save (`makeParam`); the seven-call first route (`mod.route`); a hand-placed FOLDERS seat (`createFolders({ rack })`).

Waiting: **the timeline's keys** cannot move into the key table until `timeline-editor.js`'s surface-gated handlers are handed over (one action per row, a `when()` reading the surface focus, the help sheet from `keys.helpRows()`).


## 8. Your own panes, your own ink, and what you may write onto the look (1.5.0-alpha.7)

- **Your own panes take the kit's material with one attribute**, `data-mir-surface` (`docs/GUI.md`, "An app's own panes"): `pane` (or empty) · `float` · `menu` (the height) · `chip` (pane height, your own corner) · `island` (a pane only while DISCONNECTED). Delete your own material rules for them (in BASINS: `surface-material.css`, the pane and button rules of `material.css`); your sheet is unlayered and still wins wherever it paints the same property.
- **An ink sampler of your own**: `createGui({ inkSampler: true })` and TEXT · SAMPLED writes no `data-text`, so your per-label ink (BASINS' `adaptive-ink.js` and its seats in `ink.css`) decides.
- **What you may write onto the look tokens.** The kit's engine writes the shadows as `0 0 0 0 transparent` when they are off, never `none`. You may write either on `--surface-shadow`, `--surface-shadow-float` and `--surface-shadow-menu`: since alpha.7 no kit rule puts them in a list with another layer except the modulation window's own pane and rail, which add an inner light that is transparent unless the plugin's chassis is lit (`none` there costs that light, nothing else). Inside a list of your own, write `0 0 0 0 transparent`. A blur that is off is the whole filter `none` (`--surface-filter: none`), never `blur(0)`.
- **What your own sheets still beat.** The kit is layered and your sheets are not: a rule of yours that paints the same property on the same control wins over the kit's look setting (BASINS' COLOUR lanes set `border: 0`, `border-radius: 0` and `box-shadow: none` on their faders and arc knobs, and its segments a 9 px corner and the raise on the chosen one). Keep such a rule only where it is your component's design, not the material.

## Check

`npm test` in the kit; in your app, load once and confirm the chips keep their material (the stylehash neutrality
proof, `tools/stylehash.mjs`, is the instrument).
