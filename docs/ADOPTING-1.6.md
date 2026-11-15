# Adopting MIR 1.6 from 1.5

A checklist for an app moving from the 1.5 line (anything from `1.5.0-alpha.24` to `1.5.7-alpha.71`) to 1.6. An app
still on 1.4 works through [ADOPTING-1.5.md](ADOPTING-1.5.md) first. Run `node tools/adopt.mjs <app> --line 1.6 --dry-run`,
then `--line 1.6` ([LINES.md](LINES.md)), and work down this list. Each entry says what changed, how to find the places
in your app, and what to write instead. Every name below was checked against the kit's code at `1.6.0-alpha.96`; the
door that made each change has its paragraph in [CHANGELOG.md](../CHANGELOG.md).

Find your app's uses of a removed name with one grep over the app's own files (not its `lab/mir/` copy):
`grep -rn "<name>" <app> --include=*.js --include=*.css --include=*.html | grep -v /mir/`.

## 1. Names removed

Nothing below has an alias. An app that imports one fails at load; a selector that names one matches nothing.

| Removed | Door | Write instead |
|---|---|---|
| `rack.addMenu` (the 1.5.5 shim), `#rackAdd`, `#rackAddList`, `el.add`, `el.addList`, `.rack-add-none` | 1.5.5, 1.6.0-alpha.80 | THE FINDER: `createWindowPicker({ rack })` (`shell/window-picker.js`) |
| `GUI_TABS`, `TAB_OF`, the `mir.gui.tab` record, the GUI api's `tab` / `turn()` | 1.5.5 | nothing: MIR OPTIONS has no tabs; every older page name opens OPTIONS |
| `SKINS` (`shell/gui.js`) | 1.5.5 | the app's own list: `createPrefs({ presets })` |
| `PILL.track`, `.rack-pill::before` | 1.5.5 | nothing: `PILL` is `{ linger, gap }` |
| the transport's `setOrient`, `data-orient`, the VERTICAL chip | 1.5.5 | nothing: the seat store is `{ v: 2, seat, place }` |
| `shell/rack.js` `localStore` | alpha.80 | `jsonStore(key, view)` (the rack's default store); a `store` you hand in is read as before |
| `shell/share-link.js` `crc32` | alpha.80 | `core/png.js` `crc32` (the same number) |
| `shell/gui.js` `glassTint(bright, hue, tint, theme, saturation)` (positional) | alpha.80 | `core/look.js` `glassTint({ bright, hue, tint, saturation }, theme)` |
| `core/zoom.js` `viewIn` | alpha.80 | nothing read it |
| `export` off (the value stays inside its file): `core/look.js` `SPACING`, `core/png.js` `KEYWORD`, `render/encoder.js` `AUDIO_LADDER` · `verifyAudioEncoder`, `render/mp4.js` `MP4_TIMESCALE`, `info/layer.js` `springEasing`, `keyboard/keyboard.js` `extraRows`, `shell/midi.js` `MIDI_MODES`, `shell/rack-scrollbar.js` `inkOn`, `shell/window-picker.js` `WINDOW_PICKER`, `shell/gui.js` `migrateShadow` | alpha.80 | your own constant, if you need the number |
| `modulation/host.js` `labParameters`, `LAB_PRESET_FOLDER`, `LAB_PRESETS`, `labPresetList`, `labPresetGet`, `labPresetApply`, `foreignPresets`, `presetRouteTargets` (λWAVES' catalogue) | alpha.57 | the app's own catalogue; `barTempo` stays |
| `modulation/mod.js` `setLegacy`, `demolish`, `migrateFromLegacy`, `materialize`, `legacyOf`, `modState`, `AUDIO_RESERVED`, `AUDIO_MODES` | alpha.89 | nothing: the v2 migration and the dump are gone |
| `export` off: `mod.js` `MACRO_BOOT`, `migrateRack`, `AUDIO_OUTPUTS`, `AUDIO_EXPOSED`, `AUDIO_SOURCES`, `AUDIO_LEVEL_MIX_DEFAULTS`, `AUDIO_OUT_MODE`, `AUDIO_GATE_DEFAULTS`, `AUDIO_ONSET`, `AUDIO_FEED_HZ_DEFAULT`, `TAP_EARLY`, `TAP_WIN`, `TAP_SETTLE`, `TAP_WILD`, `TAP_STRAY`; `timeline/icons.js` `EDIT_ICON` · `SELECT_ICON` · `SCRUB_ICON` · `SLICE_ICON`; `timeline/audio-kind.js` `AUDIO_CANVAS_MAX`; `folders/files.js` `FOLDER_SEGMENT_MAX` · `FOLDER_MAX`; `timeline/pattern-kind.js` `PATTERN_LENGTHS` | alpha.89 | `pattern/model.js` `PATTERN_LENGTHS`; the others: your own constant |
| `shell/transport.js` `localSeatStore` | alpha.89 | `jsonStore(key)` (the bar's default store) |
| `shell/transport.js` `BASINS_LAYOUT` | alpha.69 | `BASIC_LAYOUT`; its drawing is `data-layout="basic"` (it was `"basins"`) |
| `shell/transport.js` `LAMBDAWAVES_LAYOUT` and its `data-layout="lambdawaves"` drawing | alpha.69 | `CONTROL_SURFACE_LAYOUT` (`data-layout="csb"`), or `BASIC_LAYOUT` |
| `createTransport(…).el.menu` as a kept element; `.mir-transport-seats` and its rules | alpha.88 | `el.menu` is the open seat menu's pane or `null`; the menu is a `contextMenu` with radio rows (`seatMenu: false` still draws none) |
| `createHistoryWindow({ dock, chips })` | alpha.71 | nothing: HISTORY is `chrome: 'close'`, ↶ ↷ are head buttons |
| `buildDevicePick`, `buildMacroPick`, the `.m2pick` sheet | alpha.62 | nothing: ADD DEVICE and ADD MACRO open `controls/select.js` `listPane` |
| the glyphs `mandelbrot`, `juliaRestore` | alpha.82 | `registerGlyphs({ … })` with your own drawing |

## 2. Keyframes: `lw-` is `mir-`

**What changed** (alpha.96). The kit's twelve `@keyframes lw-…` are `mir-…`. No frame, time or curve moved.

| Was | Now |
|---|---|
| `lw-busy-breathe` | `mir-breathe` (`mir-busy-breathe` is the busy mark's own, with a var) |
| `lw-warn-in`, `lw-dev-enter`, `lw-dev-enter-quiet` | `mir-warn-in`, `mir-dev-enter`, `mir-dev-enter-quiet` |
| `lw-tr-out-down`, `lw-tr-out-up`, `lw-tr-in-up`, `lw-tr-in-down` | `mir-tr-out-down`, `mir-tr-out-up`, `mir-tr-in-up`, `mir-tr-in-down` |

Find them: `grep -rn "lw-busy-breathe\|lw-warn-in\|lw-tr-\|lw-dev-enter" <app>`. On this machine SOLEIL's,
NEBULA REDUX's and BASINS III's `lab.css` name `lw-busy-breathe` and `lw-warn-in`.

## 3. Stored data

- **The preset store's default key is `mir.modpresets`** (alpha.58; it was `lambdawaves.q0.modpresets`). The kit
  migrates nothing. An app with saved presets passes its old key: `installModulation({ presetKey: 'lambdawaves.q0.modpresets' })`
  (SOLEIL and NEBULA REDUX call `installModulation` with no `presetKey`, so they read the old default today).
  `createApp()` passes `presetKey: <its key> + '.modpresets'` and is not affected.
- **The reserved factory folder is `FACTORY`** (alpha.58; it was `MANDELBROT`).
- **The house palette `lambda` is labelled `MIR`** (alpha.58; it was `λWAVES`). The id and the stops stay, so saved
  looks and links still name it. An app that wants its own word sets the row's `label`.
- **DRAG HANDLE and SPACING changed type** (1.5.7-alpha.56, alpha.57): `grip` is GRIP · ICON · HIDDEN and `spacing` is
  a px knob, under the same keys. Old stored values open through each row's `legacy` map: nothing to write.

## 4. Tokens removed or renamed

Thirty-five tokens left between `1.5.7-alpha.71` and `1.6.0-alpha.96` (generated from `mir/tokens.json` at both).
An app that re-points or reads one of them gets nothing.

- **Renamed** (alpha.35, ONE HEAD SCALE): `--win-head-h` → `--head-h`, `--win-head-btn` → `--head-btn`, `--win-head-glyph`
  → `--head-glyph`; `--win-head-press` is gone (a press shrinks, alpha.40).
- **Gone with no successor:** `--pane-pad`; `--hist-title-size`, `--hist-title-tracking` (alpha.71); `--render-disabled`
  (alpha.39, the one disabled fade); `--render-lines-h` (alpha.95); `--xport-rail-thumb` (alpha.68, the one scrollbar);
  `--folders-menu-rim`, `--pt-menu-r`, `--pt-menu-fill`, `--pt-menu-shadow`, `--pt-menu-z`, `--pt-mi-h`, `--pt-mi-r`,
  `--pt-mi-size`, `--pt-mi-weight`, `--pt-mi-track`, `--pt-mi-press`, `--pt-rule-ink` (alpha.13, the dead weight);
  `--m2-fs-6p5`, `--m2-fs-7p5`, `--m2-fs-8p5` (alpha.95); `--m2-focus-ring`, `--m2-focus-shadow`, `--m2-button-focus-ring`,
  `--m2-button-focus-shadow`, `--m2-button-press-shadow`, `--m2-chip-ring`, `--m2-kctl-focus-ring`,
  `--m2-numseat-focus-ring`, `--m2-audio-audminleds-focus-ring`, `--m2-aud-mix-focus-shadow` (alpha.60: every ring in
  the plugin is `--state-focus`).
- **Moved values an app may have matched in a picture test:** `--xport-seat` and `--xport-work-seat` 34 → 36,
  `--tl-icon` 16 → 20 (alpha.69); the head is 38 everywhere (alpha.35); the small corner is 6 (alpha.38).
- Thirty-three tokens are new; [TOKENS.md](TOKENS.md) lists every one.

## 5. Words a hand reads, and a test may match

A suite or an app that finds a kit element by its text or its aria name reads the new words.

- **CONTROL SURFACE** (alpha.91): the docked bar window's title (TRANSPORT before), MIR OPTIONS' switch (TRANSPORT BAR),
  the seat button, its menu, the dock chip and `createApp`'s row `DOCK THE CONTROL SURFACE`. `transportActions()`'
  group is `PLAY` (TRANSPORT). Ids, keys, `body.no-transport-bar` and the `transportBar` preference are unchanged.
- **ABOUT MIR** (alpha.91; MIR ABOUT before). Every pop chip says **FLOAT** / **DOCK**.
- **Hints and aria names** (alpha.92, alpha.93): one line under 60 characters, a capital first letter, no full stop.
  A stepper's next button is `aria-label="Next"` (it was `next`): λWAVES' `tests/history.browser-test.mjs` pressed it by
  the old name.
- **Notices** (alpha.93): `Saved {name}`, `Opened` · `Imported` · `Deleted {name}`, `{What} copied`, and every failure
  `Could not {verb}: {why}`, no full stop (`Saved — {name}`, `… could not start`, `Render failed` before). A saved thing
  is DELETEd (a layout's "Forget", a folder's "removed" before); an in-row confirm says `DELETE?`. An empty list says
  `No {things} yet — {how}`. `createApp`'s and the rack's rows are CAPS (`HIDE OR SHOW THE RACK`, `HIDE THE INTERFACE`).
- **A drawing, never a character** (alpha.94): the kit's × buttons draw `close`; ◂ ▸ − + ⋯ ⓘ ☆ ✎ are glyphs. A test
  that read the character as the button's text finds an `svg`.
- The nine language packs keep their old translations of every changed English key until a translator passes
  (`i18n-packs` reports them; never a failure).

## 6. Behaviour that changed under an app

Nothing to write unless your app relied on the old behaviour; each is a kit-wide law now.

- **The wheel waits for a click** (alpha.3): no control turns under a bare wheel; a click (or focus) arms it.
- **The hold is 550 ms** (alpha.4, `TAP.hold`), and **one double press goes home once** (alpha.19); a routed knob's
  arc goes home on a double press and its right-click removes the route (alpha.2). The timeline's clips, points and
  tension handles read `TAP` (alpha.65: 300 ms / 14 px, was 400 / 16).
- **One control menu** (alpha.14, `controlMenu`): RESET · COPY VALUE · PASTE · FINE · ROUTES › · CLIP › · LEARN… · CREATE
  EVENT · the favourites, on every value control. The timeline's lists are `contextMenu` too (alpha.66).
- **One Escape stack** (alpha.53, alpha.67): THE FINDER, a select's list, a dialog, the layouts list and the timeline's
  gestures and panes push a layer through `escapeLayer`; an app hands its stack to the kit with `setMenuEscape(push)`.
  An app's own Escape listener that closed one of these closes nothing now, or closes it twice.
- **The menu key on a held knob is the browser's** (alpha.85): ContextMenu and Shift+F10 arrive as `contextmenu`; an
  app's own document `keydown` for those keys now opens a focused registered knob's menu where the kit's used to.
- **A notice owns its time** (alpha.56, `NOTICE_MS` by `kind`: ok 3 s, warn 5 s): pass `kind`, not `ms`.
- **Windows:** a card can be born closed (`device({ closed: true })`, alpha.25); `min` is read only with `resizable`, and
  empty glass is a handle by default (alpha.27); the head's ↗ and ▯ sit at the left end (alpha.31); `rack.power(id, on)`
  presses power as the hand does (alpha.29); `register({ kind, folded })` (alpha.30). KEYS and HISTORY are
  `chrome: 'close'` windows (alpha.56, alpha.71). PATTERN keeps above the app's bar (`installPattern({ avoid })`, alpha.87).
- **The faces** (alpha.35…42): one head scale (38), the clean body, a heading inside a window is light, the small corner
  6, one disabled fade (38 %), a press shrinks, one focus ring, the stronger ground where nothing can blur. Panes follow
  CORNERS and the one accent scrollbar (alpha.43…44).
- **From the 1.5 line, for an app adopting from before them:** the highest lane wins where clips overlap, the timeline
  loops a live play by default (`loop: false` opts out), Shift selects and fine-tunes while Ctrl shapes, a clip overrides
  a device's routes where it plays (1.5.6); with no clip playing the timeline loops its first bar (1.5.7-alpha.8); an
  empty lane says nothing (1.5.7-alpha.44, alpha.51); a hidden rack peeks within 140 px and slides in 120 ms
  (1.5.7-alpha.63); UI SCALE reaches TIMELINE, MODULATION and PATTERN and the inverse-zoom rule is gone (1.5.7-alpha.64).

## 7. Loading the sheets

- `mir/mir.css` is every kit sheet in one link (README § Adopt it). A page that still links the kit's sheets one by one
  now needs `controls/controls.css` for the modulation window (alpha.62).
- Two kit sheets are in no cascade layer today, `shell/window-picker.css` and `info/faces.css`: their rules meet an app's
  unlayered rules by specificity, not by layer, and outrank every layered kit rule. An app rule aimed at THE FINDER or
  INFORMATIONAL's faces must out-weigh the kit's selector, not merely come later. (λWAVES' FOR-MIR asks for a door.)

## Check

1. `node tools/adopt.mjs <app> --check` says `in step with MIR 1.6.0-…` (a pinned app's "consistent with its own
   manifest" is not that).
2. The greps of §1 and §2 come back empty outside the app's `mir/` copy.
3. The app's own tests, and a look at every window that has a test pinned to a word of §5.
