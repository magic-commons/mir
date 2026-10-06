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

**The kit does this for you since 1.5.0-alpha.12:** `mir/shell/scene-guard.js` (`docs/SCENE-GUARD.md`), BASINS' scene input guard. `createApp()` installs it on the stage's canvas (`app.sceneGuard`); by hand it is `createSceneGuard({ canvas, rects: uiSpace({ rack }) })`, or `install: false` and your gesture engine calls `guard.hit(e)` / `guard.wheel(e, region)` as BASINS' `gestures.js` does. A wheel in UI space goes to the UI's scroller, never the picture; a tap or a swipe from a gap starts nothing.

## 6. Behaviour that changed under an app in 1.5.0-alpha.5

- **The notice is BASINS' toast by default**: one centred pill above the bottom, a new message replaces the old. An app that relied on NEBULA's corner stack passes `seat: 'corner'`.
- **INFORMATIONAL's hold-still is the I key; Space is the app's one play.**
- **The GUI window's `shadow` is an amount (0–2)**, not a switch (the switch is `dropShadow`); a stored alpha.4 value is migrated. `LOOK_PRESETS` holds the themes; `LOOK_PRESETS.light` is gone (SWIFT).
- **SPACING's default is tighter** (rack gap and inset 6 px, pane padding 8; 1.4 was 10 / 10 / 7).
- **English keys changed** (contexts, `{:LABEL}`, whole sentences): an app's own language pack keyed on kit strings must move to the new keys (`mir/locales/en.json`).

## 7. What BASINS can delete now

Gathered from the lanes that harvested BASINS' parts into the kit (each is a kit part with BASINS' design; delete BASINS' copy when the adoption reaches it):

- **Settings › LOOK** (VANILLA): in `skin.js`, `setFaces`, `setFaceBlend`, `setText`, `setMaterial`, `setMaterialPreset`, `applyGlass`, `setBlur` and the pane part of `setUIDropShadow`, with their prefs keys; `surface-material.js` + `.css` (put `data-mir-surface` on its own panes, §8); the face, popover, menu-veil, glass-knob and window-edge rules of `material.css` (the kit's GLASS faces are BASINS' `material.css` §1, exactly, since alpha.7); the TEXT seats of `ink.css` §1 (body and forced). With TEXT · SAMPLED (`createGui({ inkSampler: true })`) nothing of `ink.css` needs to override the kit; `adaptive-ink.js` and its sampler seats stay. Its own rack gaps (SPACING).
- **The toast** (shell parts): `toast()` and `#toast` (`notice()` is BASINS' toast, value for value since alpha.7: a `.glass` pane, no pointer, z-index 50; BASINS keeps writing `--glass-tint-color`, which the toast reads).
- **Keys** (keys lane): its own Space handler for playing over a focused control (`overControls` in the key table); the history list's own UNDO / REDO and count wiring (`historyList(…, { tools: false, count: false })`, `state()`, `onChange()`).
- **The transport** (transport lane): the `transport.js` bar (all but the macro rail), `transport-controls.js` / `.css` (including its 44 px power rule `#modwin.mir-modwindow .modxport.mir-mod-power`: the kit draws the seat), `transport-dodge.js`, the stage and rack seats of `transport-placement.js`, the `#transport` rules in `skin.css` / `lab.css`. The kit now has BASINS' ui-fix sizes (tempo 18 px, play 32 px) and the work-bar form (`bar: 'work'`).
- **The docked chip rail and the modulation window docked** (modulation lane): any app rule that tightened docked chips or clipped the docked work bar (`rail.setDock`, `--rail-gap`).
- **The dock span and the rack** (1.5.0-alpha.7): `rack-bounds.js` and its extra instances (`observeSpan` is BASINS' rack-bounds: the shadow gutter subtracted, an empty or hidden rack absent); in stages, `rack.js` itself, as `createRack` adopts the existing `#rack` / `#rackL` / `#floats` (§9).
- **FOLDERS** (1.5.0-alpha.7): `save-window.js`, in stages (§9): `createFolders` has BASINS' toolbar (PROJECT · CAPTURE · DOWNLOAD · DUPLICATE · NEW · ⋯), its panels and radio chips, its top-right first seat and the root id `#savewin`; BASINS' own SAVE gate runs against it (`tests/folders-basins.browser.mjs`). `tools/rig/save-gate.js` needs five selector edits (`docs/FOLDERS.md`, "Its gate").
- **The window material** (1.5.0-alpha.8): `kwin.js adoptMaterial` and the about 1,250 rules it clones, by passing `material: 'modulation'` to `createWindow` for the SAVE, TIMELINE and COLOUR windows: the window wears the modulation window's material (rail, chips, controls, resize corner) from eight rules in `window.css` and one shared value block in `skin.css`, with no cloning. FOLDERS passes it by default. The 8 px rail gap is kwin's (`RAIL.gap`); `kwin`'s `anchorTarget` docking is `createWindow({ dock: { anchor } })`; its rig's synthetic `PointerEvent`s now drive kit windows as they are (no shim).
- **An app's own window law** (1.5.0-alpha.9): a law that raises its windows by element or by its own counter raises a kit window with `windowOf(el).raise()` or `win.stackAt(z)` (the pane at `z`, its rail at `z + 1`), so the pane and its rail never part; a law that walks its windows reads `win.pair` (`{ root, rail }`). BASINS' z-index counter for kwin windows becomes `stackAt`. An app that keeps its rails in a tier above its windows passes `createWindow({ railTier })` (or `stackAt(z, { railOffset })`), so each rail lands in that tier (1.5.0-alpha.10).
- **The FOLDERS gallery** (1.5.0-alpha.8): BASINS' gallery as it stands (its options button, the folder glyph, the .65 cover wash, the 13 px inset, the finger parallax, the 10 px tap rule); drag-to-folder is an option (`dragToFolder`, off by default, as BASINS'); `onOpen` is where BASINS seeds, a persisted open included.
- **The rack's motion** (1.5.0-alpha.11): `rack-motion.js` (`createRackMotion` is the kit's, harvested whole; the title bar decides above or below).
- **The timeline** (1.5.0-alpha.11): about 2,300 lines, file by file in `docs/TIMELINE.md` ("What BASINS deletes"), once it mounts `installTimeline({ mount, mod, keys, history })`. What stays its own: the palette remap (the `remap` port), the pattern sequencer and PATTERN window, the audio engine, its SAMPLING grid and recorder, the 10ⁿ readout.
- **The wave-12 parts** (1.5.0-alpha.12), per part (the file lists are BASINS' own, from stage 3):
  - **The modulation fork**: `app/modwindow.js` (3,416), `pattern-window.js` (299), `pattern-model.js` (75), `pattern-sequencer.js` (120), `pattern.css` (75), `mod-cursor.js` (56), `tempo-editor.js` (44), `curve-view.js` (17), `mod-window-snap.js` (51), the `createLayoutMotion` half of `rack-motion.js` (140–204), `upsertProjectPreset` in `project-session.js`, the automation-grid lines in `modulation.js`, `tools/test-pattern-sequencer.mjs`. In `app/modulation.js` remove `pattern.tick()` from `videoClock.step` and `deterministicClock.frame` and `createPatternSequencer(...)` with its `pattern.reset(...)` calls: `installPattern`'s sequencer ticks on `host.clock.onAdvance` (every realtime tick, every `step()`) and resets on every `seek()`; the recorder keeps calling `host.clock.step(1 / fps)` (this is also the hidden-tab fix). BASINS' four starter racks and its colour remap go through `installModulation({ factory: { presets, apply } })`; `starter-modulation.js` stays as data. `createRack({ persist: 'closed' })` keeps BASINS' reload behaviour; `phoneTr` has no kit field.
  - **The session**: `project-session.js` (107) onto `core/session.js` (a small `lift` for its v1/v2 records; look, rack, timeline, bpm registered as parts); `prefs.js`'s migration onto `createPrefs({ version, migrate, projectKeys })`; its FORGET and DOWNLOAD SETTINGS onto `prefs.forget()` / `prefs.download({ app })`.
  - **The scene guard, the banner, the veil, the wake lock, the keys and the shell verbs**: `scene-input-guard.js` (68) and 5 lines of `gestures.js` onto `createSceneGuard({ install: false })` (its own gesture engine calls `hit()` / `wheel()`); `wakelock.js` (244) (anim.js and export.js keep only `installWakeLock({ clock })` / `hold('render')`); `overlay.js`'s `report / fail / warn / describe / problems / offerReload / registerDumpLines / extraDumpLines / veilStat` and the error listeners, with `#banner` and its `lab.css` 280–297 rules (about 145 lines); `main.js` 117–232 `armVeil / dismissVeil` (`bootVeil` with `ready: () => pyramid.stat.presents > 0`); `shell.js`'s `copyText`, its keydown table, `hideUi`, `fullscreen`, the recent / purge / coming / COPY DUMP rows; `debug.js copyDebugInfo`; `tablet.css` but its COLOUR block; the `.skip` rule and the skip-link wiring.
  - **The look**: `adaptive-ink.js` keeps only its GPU read (about 30 lines) as the `sample` it hands `createInkSampler`; `settings-window.js` drops about 180 of its 217 lines to the GUI window (STATUS TAGS, RESET LAYOUT, FORGET, TRANSPORT BAR, SAMPLING, ACCENT BRIGHTNESS are rows of it now); the `skin.js` setters the GUI covers; the tier benchmark onto `createGui`'s QUALITY · AUTO.
  - **The transport**: `transport.js` (201), `transport-placement.js` (46) (the timeline takes `transport: { shared: tr }`), `tempo-editor.js` (44), `brand-motion.js` 1–57, the workspace code in `shell.js` (`createWorkspaces`, `workspaceSwitch`).
  - **The rack**: `rack-scrollbars.js` (62) onto `createRack({ scrollbar: true })`; the touch-tablet clamp, retired ids, the notebook's size in a layout, RESET LAYOUT and COPY from `rack.js`; windows onto `createRack` with `persist: 'closed'`.
- **The wave-13 parts** (1.5.0-alpha.13), per part (each doc's "What BASINS deletes" has the lines):
  - **The control language** (`docs/CONTROLS.md`): the private steppers and pagers (`colour-window.js` blend stepper, the SAVE pager), every native range / select / number in a window, AUTOMATA's XY pad and LO/HI pairs, each app's own knob drag and Shift law, the tempo editor's body (`bindNumber`); `docs/CONTROLS-COLOUR.md`: `colour-controls.js` (343) and `arc-ring.js` (17) whole, about 95 of `colour.css`'s 150 lines and about 70 of `colour-window.js`.
  - **Audio and the ZIP** (`docs/AUDIO.md`): `audio.js` (438), `audio-clip.js` (278), `audio-assets.js` (110), `audio-playback.js` (72), `export-zip.js` (72), `starter-gallery.js` (32), `saveBlob` and `prefersVideoDownload` (about 45), SAVE AS ZIP / OPEN ZIP in `save-window.js` (about 50) and the popup rule of `audio.css`; `useAssets(createAssetStore({ name: 'basins-assets' }))` keeps its users' files.
  - **RENDER** (`docs/RENDER.md`): `deterministic-export.js`, the render store and its worker, the encoder preflight, the self-test and the RENDER tab's rows onto `createRecorder` and `renderPanel` (the app keeps its `frame()`, its ZOOM motion and its SUBJECT block).
  - **The opener and the notice** (`docs/OPENER.md`): `app/startup.js` (242), `startup.css` (176), `starter-covers.js` (8; the data stays) and the warning overlay onto `createOpener` and `photosensitivityNotice({ every: true, art })`.
  - **The HISTORY window and the notebook** (`docs/HISTORY.md`, `docs/NOTEBOOK.md`): `history-window.js` onto `createHistoryWindow`; the notebook's size, landing and project seam onto `createNotebook({ aboutSize })` and `notebook.project`.
  - **The icons** (`docs/ICONS.md`): every inline icon string (power, rewind, eye, minus, the timeline's three tools, the dot grip, the four-way cross) onto `glyph.js`; the apps' own `rack.js` chips say `popOut` / `dock` at their next adoption.
  - **Developer tools**: `tools/hit-probe.mjs`, `audit-material.mjs`, `serve.mjs --https` and `check-app.mjs --webkit` replace the one-off probes.
- **The wave-14 parts** (1.5.0-alpha.14): the rack windows (`docs/PANELS.md`; each panel doc's "What an app deletes" has the lines), and BASINS parity round five:
  - **CAMERA** (`docs/PANEL-CAMERA.md`): BASINS `app/camera-window.js` (157), `app/camera-rig.js` (26, now `mir/panels/camera-rig.js` with the same exports) and the camera rules in `controls.css:24–39`, onto a port of about 35 lines (BASINS still owes the port a notice when the view changes: today it re-reads every 250 ms, `camera-window.js:155`); λWAVES' camera-motion block in `lab/rack.js` (about 37 lines at 1521–1557).
  - **GRADE and CURVES** (`docs/PANEL-GRADE.md`, `docs/PANEL-CURVES.md`): BASINS' hand-built INVERT glyph switch (`colour-window.js` 255–259, `colour.css` 96–102) onto `sw({ glyph })`; SOLEIL's hand-built tone knobs (`main.js` 1024–1036), its curve editor (`curves.js` 62–105 and 11–26), its CURVES window (`main.js` 1120–1134, 1271–1275) and `sol.css` 160–166; NEBULA's `grade` panel entry (`panels.js` 13–17); λWAVES' EXPOSURE, SOFT, HUE, GAMMA and INVERT rows (`lab/rack.js` 1282–1284, 1399, 1515, 2546–2551); AUTOMATA's four tone knobs (`main.js` 838–859).
  - **XY** (`docs/PANEL-XY.md`): AUTOMATA's `lab/morph.js` (105, now `mir/panels/morph.js`), the MORPH window's body (`lab/main.js` 685–711), the bank (1505–1562), `paintPad` (1563–1570), `morphTick` (236–243) and `.mp-*` in `automata.css` 264–290. The other apps gain the window by naming their pairs.
  - **LANES and RAMP** (`docs/PANEL-LANES.md`, `docs/PANEL-RAMP.md`): BASINS `colour-window.js` 124–260 and `colour.css` 56–150 (about 135 + 95, some counted under the colour controls); NEBULA `main.js` 247–305 and `nebula.css` 34–63; SOLEIL `main.js` 895–921, 1247–1258, 1403–1425 and `sol.css` 23–65; EARTH `cardkit.js` 198–215 and `palettes.js` 44–48; λWAVES `paletteview.js` (about 140 of 156 lines) and its `.pal-*` CSS.
  - **BASINS parity round five**: its accent engine (`createAccentEngine` in `skin.js`) onto `createAccent({ model: 'hsl', a: 180, b: 20, vivid: 1 })`; its own FORGET keys onto `createGui({ forget: ['basins.settings', …] })`; the transport's `docked` onto `createRack({ layoutExtra })`; its gate rigs that read `.kwin-grip-dots > i` find the kit rail's nine dots again. Still BASINS' side: the COLOUR `+ ADD` and MAPPING well fill under glass faces comes from its own unlayered `skin.css:529–533` (gate those rules off under `body[data-faces="glass"]` or delete them), and the work bar needs the kit's `.glass.mir-transport[data-bar="work"]` (stage 4 part B).
- **BASINS parity, round six** (1.5.0-alpha.15):
  - **basins.css** can drop lines 8–17 of the adopt branch (`#transport.mini { width: max-content; min-width: 0 }`, `#transport .tempo-expand { order: 0; row-gap: 0 }`, `#transport.docked { background: transparent }` and the seven docked-grid rules). It keeps line 37 (`.transport-decade`'s grid-area: its own node) and its decade type rules.
  - **shell.js:131** can drop the `pattern.win.stackAt(z + 1)` seat: the kit's modulation window is in the one stack now (or `registerWindow({ root: #modwin, rail })` once, which returns the same registration), so `pattern.show()` raises PATTERN; `layout.modulation.expand` raises #modwin by `windowOf(modRoot).raise()` in place of kwin's `raiseWindow`.
  - **pattern-check row 12** (the reload row) re-docks by `pattern.close(); pattern.show(env)`; neither BASINS nor the kit re-docks on show. BASINS' own rig re-docked with `P.restore({ ...P.presentation(), dock: 'anchor', open: true })`; the kit's form is `pattern.win.restore({ ...pattern.win.state(), dock: 'anchor', open: true })`.
  - **The refusal sentence**: with `controller` forwarded, BASINS can build its controller (`createTransportController({ mod, scrubLevel, busy, onRefusedPlay: () => say('nothing to run — add a source in the modulation window and route it') })`) and pass `controller` to `installTimeline`.
  - **timeline-ticks-check:76** (`scrollLeft = 0` before the clip-title click) can go once the rig runs on alpha.15.
  - A stored `mir.pattern` shape from before alpha.15 has no `v`: its side reads `auto` on the first load (once written again it carries `v: 2`).
- **The start-up** (EASE): the per-sheet `<link>`s (one `mir/mir.css`); a full-screen windows layer and its `pointer-events` rules (mount kit windows in `rack.el.floats`); the hand law in each control's `onInput` and the `isModulated ? baseOf : get` in a save (`makeParam`); the seven-call first route (`mod.route`); a hand-placed FOLDERS seat (`createFolders({ rack })`).

**What only BASINS can change.** Its own sheets are unlayered and beat the kit's layered rules on the same property, so these stay as BASINS draws them until BASINS deletes or scopes its rule (each was measured against the kit in `docs/THEMES.md`, "BASINS parity, round two"):
- the card's 14 px corner rule (at boot, disconnected, the card keeps BASINS' corner; joined it takes CORNERS);
- the COLOUR lanes' controls (`border: 0`, `border-radius: 0`, `box-shadow: none` on their faders and arc knobs);
- the segment track's 9 px corner and 3 px padding (`skin.css` 532), and the raise on its chosen segment (the kit's chosen segment is INTENT's ON face and accent label).

Waiting: **the timeline's keys** cannot move into the key table until `timeline-editor.js`'s surface-gated handlers are handed over (one action per row, a `when()` reading the surface focus, the help sheet from `keys.helpRows()`).


## 8. Your own panes, your own ink, and what you may write onto the look (1.5.0-alpha.7)

- **Your own panes take the kit's material with one attribute**, `data-mir-surface` (`docs/GUI.md`, "An app's own panes"): `pane` (or empty) · `float` · `menu` (the height) · `chip` (pane height, your own corner) · `island` (a pane only while DISCONNECTED). Delete your own material rules for them (in BASINS: `surface-material.css`, the pane and button rules of `material.css`); your sheet is unlayered and still wins wherever it paints the same property.
- **An ink sampler of your own**: `createGui({ inkSampler: true })` and TEXT · SAMPLED writes no `data-text`, so your per-label ink (BASINS' `adaptive-ink.js` and its seats in `ink.css`) decides.
- **What you may write onto the look tokens.** The kit's engine writes the shadows as `0 0 0 0 transparent` when they are off, never `none`. You may write either on `--surface-shadow`, `--surface-shadow-float` and `--surface-shadow-menu`: since alpha.7 no kit rule puts them in a list with another layer except the modulation window's own pane and rail, which add an inner light that is transparent unless the plugin's chassis is lit, and (alpha.8, BASINS' drawing) a window chip that is ON, whose rim rides with the pane shadow (`none` there costs that light or that rim, nothing else). Inside a list of your own, write `0 0 0 0 transparent`. A blur that is off is the whole filter `none` (`--surface-filter: none`), never `blur(0)`.
- **Your windows can wear the modulation window's material** (`[data-mir-material]` on the root and the rail; the kit window's option sets it): delete a clone of the plugin's rules (BASINS: `kwin.js adoptMaterial`). Under the look engine the pane shadow at SHADOW 100 % is BASINS' material shadow and a disconnected head is a pane: delete `surface-material.*` once your panes carry `data-mir-surface`.
- **What your own sheets still beat.** The kit is layered and your sheets are not: a rule of yours that paints the same property on the same control wins over the kit's look setting (BASINS' COLOUR lanes set `border: 0`, `border-radius: 0` and `box-shadow: none` on their faders and arc knobs, and its segments a 9 px corner and the raise on the chosen one). Keep such a rule only where it is your component's design, not the material.

## 9. The staged adoptions: the rack and FOLDERS

BASINS does not swap its rack or its SAVE window in one step. Each kit part adopts what is already in the page, so the app moves over in stages, with its own tests green at each:

- **The rack**: `docs/RACK.md`, "Adopting into an app that has a rack" (four stages: one dock span in place of `rack-bounds.js`; `createRack` takes the existing windows (`register({ id, el })`, `card: true` for an app card) and the motion with them; the `+` and ☆ menus (`chrome: true`); the containers' look), and "What BASINS' rack does that the kit still does not".
- **FOLDERS**: `docs/FOLDERS.md`, "BASINS: the exact options, and where each job of `save-window.js` sits" (the options that reproduce BASINS' window, and which of its jobs moved where).

## Check

`npm test` in the kit; in your app, load once and confirm the chips keep their material (the stylehash neutrality
proof, `tools/stylehash.mjs`, is the instrument).
