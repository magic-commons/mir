# MIR · API

Every module the kit exports, what each export is, and what it returns. MIR 1.4.0.

Each module's own header holds its laws and their reasons. This page is the map to them.

How an app loads the kit, the body attributes it reads, the ids it owns and the tokens an app may re-point are all in [CONTRACT.md](CONTRACT.md).

Import paths below are from an adopted app's `lab/` folder: `./mir/…`.

---

## `mir/kit.js`: controls and window chrome

### Builders
Each builder makes its own DOM, styled by `mir/css/base.css` and `skin.css`, and returns handles.

| Builder | Options | Returns |
|---|---|---|
| `knob(o)` | `label, aria, title, min, max, value, log, wrap, step, fmt, unit, size:'lg', cls, travel, fine, onInput, onChange, onDelta, onReset` | `{ root, get, set(x, silent=true), show(x), shown, setDefault(x), setDisabled(on), setBase(fn), paint }` |
| `fader(o)` | `label, aria, min, max, value, fmt, log, fine, cls, onInput, onChange` | `{ root, get, set, show(x), shown, setBase(fn), setDisabled(on), paint, setDefault, setLabel, dragging() }` |
| `seg(o)` | `label, aria, options:[{id,label,title}], value, onChange` | `{ root, get, set, button(id), paint }` |
| `sw(o)` | `label, value, title, onChange` | `{ root, get, set }` |
| `trig(o)` | `label, glyph, title, cls, onFire` | `{ root, setLabel, setGlyph, set on(v) }` (a trigger used as a state writes `aria-pressed`) |
| `readout(o)` | `label, value, cls` | `{ root, set(text, cls), setSub(text) }`. `cls` is `live`, `ok` or `warn` |
| `formula(o)` | `lines: [[string \| {s, v}]…], cls` | `{ root, set({s: v…}), names }` (only moved slots are written) |
| `device(o)` | `id, eyebrow, status, onPower, loadingMark` | `{ root, body, setOff, setLoading(v, key), popBtn, railBtn, foldBtn, off, loading, setStatus(text, cls), fold, row }` |
| `group(parent, label)` | | the group element |
| `gripDots(parent, size=13)` | | the 3 × 3 DRAG-ME grip |
| `chip(button, glyphName, label)` | | draws a glyph on a round chip |
| `el(tag, cls, parent, text)` | | the one DOM helper. Text in `<m>…</m>` is set as mathematics |

Notes on the builders:
- **The modulated look.** `show(x)` paints a value over the base: the knob's needle moves while a tick marks the base, and a fader gets `.mod`. `get()` stays the value the user set. A control driven by modulation announces its base once `setBase(() => base)` is wired.
- **Disabled.** `setDisabled(true)` removes the control from the tab order and sets `aria-disabled`. If the control had focus, focus moves to the window's power button.
- **`device()`.** It dispatches `devclose` (bubbling) when its × is pressed.
  - `loadingMark`: an element, a selector, or `false`. The default is the wordmark's mark (`#title .mark`).

### The drag law

| Export | What it is |
|---|---|
| `setKnobLaw({ travel, fine, keyFine, faderFine, touchTravel })` | Retunes the law and returns the law in force. Defaults: `travel 220`, `fine 900/220`, `keyFine .25`, `faderFine 5`, `touchTravel 320`. |
| `dragTravel(event, { touch, travel, fine })` | Pixels for a full scale under the law. It's for drag surfaces the kit did not build. |
| `tapWatcher(fn)` | The shared double-tap detector (320 ms). |

About `setKnobLaw`:
- `fine` alone retunes every Shift at once. BASINS' Shift = ⅛ is `setKnobLaw({ fine: 8 })`.
- Explicit parts win, so `setKnobLaw(setKnobLaw())` changes nothing.

### Ink, colour and canvas helpers

| Export | What it is |
|---|---|
| `lightTheme()` | `true` on the light theme |
| `onThemeChange(fn)` → `unsubscribe` | Called when `body[data-theme]` flips; repaint a canvas here |
| `parseCssColor(text)`, `cssRGB(ctx, name, fallback)` | Read a CSS colour (hex, rgb, hsl, `color(display-p3 …)`) as 0–255 RGB |
| `themeInk(…)`, `vividInk(…)`, `inkRatio`, `nRGB`, `N_COLOR`, `N_RGB`, `N_RGB_LIGHT` | The six data inks `--n1…n6`, per theme, for canvas drawing |
| `setAccentRGB(a, b)`, `accentRGB(ctx, n)` | The accents as numbers, for canvas views (`shell/accent.js` writes them) |
| `graphHover(canvas, { objects, plot, repaint, draw })` → `{ set, hit, clear, plot }`, `showGraphTip`, `hideGraphTip` | Hover labels on a canvas graph |
| `fitText(…)` | Shrink a label into its box |
| `hasMath(s)`, `mathText(node, s)`, `mathPlain(s)` | The `<m>` maths marker: detect it, set it, or strip it for an attribute |

---

## `mir/css/base.css`, `mir/css/skin.css`: tokens and materials

These are not modules. Tokens live on `:root` in `base.css`, are re-pointed in `skin.css`, and the light theme lives under `body[data-theme="light"]`. The kit's own material is **FROST**:
- tinted and refractive cards, with frost as a policy over both (`body.frost`, `.frost-hold`);
- disconnected windows (`body.disconnected`);
- neumorphic seats;
- the phone breakpoint, which raises `--phone` to 1.

See [CONTRACT.md](CONTRACT.md) for the tokens an app may re-point, and `tools/lint-tokens.mjs` for the check that every token the kit reads is written somewhere.

---

## `mir/glyph.js`: drawn marks, never font characters

| Export | What it is |
|---|---|
| `glyphNames()` | Every glyph name (see the gallery) |
| `hasGlyph(name)` | Whether a glyph exists |
| `glyphSvg(name, cls, size)` | The glyph as an SVG string |
| `glyphEl(name, cls, size)` | The glyph as an SVG element |
| `setGlyph(el, name, { label })` | Draw a glyph into a button and set its accessible label |

## `mir/palette.js`: colour science and the palette catalogue

| Export | What it is |
|---|---|
| `rgbToOklab`, `oklabToRgb`, `hexToRgb`, `rgbToHex` | 0–1 RGB triples |
| `relLuminance`, `contrastRatio(a, b)` | WCAG 2.x |
| `visibleInk(rgb, ground, floor = 3)` | The same hue and chroma, at the nearest lightness that clears `floor` against `ground` |
| `normalize(stops)`, `toLUT(stops)` | A 256 × RGBA table, interpolated in OKLab |
| `cyclic(stops)` | The seam size |
| `hsvWheel(n, s, v)` | An HSV wheel as stops |
| `PRESETS`, `PRESET_BY_ID`, `PRESET_GROUPS` | The 23 palettes, grouped by point count |

## `mir/control-help.js`: hints that step aside, and one help surface per window

| Export | What it is |
|---|---|
| `installControlHelp(root = document)` | Every `[title]` becomes a hint shown after `HELP_HOVER_DELAY` (600 ms) |
| `infoPanel(content, label)` → `anchor` | An ⓘ button whose panel holds `content`: hover or focus to peek, click to pin, Escape closes |
| `consolidateWindowHelp(root, { sources })` | Gathers each window's notes into one ⓘ in its header. `sources` defaults to `.note:not(.link-note), .sp-fx` |
| `HELP_CLASSES`, `setHelpClasses({ hintsOff })` | The two body switches that silence help: `control-hints-off` (an app may rename it) and `window-info-off` (a CSS contract name, not renameable) |

How a hint behaves once installed:
- **A hand on a control closes it.** A press, a wheel or an operating key closes the hint, and it stays closed until the pointer leaves and returns.
- **Focus shows a hint only from the keyboard.** A click's own focus doesn't reopen it.

## `mir/window-activity.js`: idle is zero work

`createWindowActivity({ body, onChange, rackIds = ['rack', 'rackL'], classes: { uiHidden, rackHidden, rackPeek } })` returns `{ track(window), canPresent(window), state(window) → { active, intersecting, reason }, presentOffscreen(on), tracked, changes, disconnect }`.

A window does no presentation work while it is off, closed, folded, compact, hidden, in a hidden rack or off screen.

## `mir/slider-keys.js`

`bindSliderKeys(element, { get, set, editable })` gives a 0…1 host slider arrow keys: arrows move 0.01, Shift 0.001, Home and End go to the ends. Space is left to the app.

## `mir/plane-model.js`

`planeModel(host, { getNormal, getPosition, onTurn })` returns `{ root, paint(force), destroy() }`. It is the sphere-and-plane orientation control:
- dragging or the arrow keys tilt the plane about world X and Y, Shift for fine, and Home resets;
- it is sharp at every device-pixel ratio and repaints itself on a theme flip; an accent change shows on the app's next `paint()`.

---

## `mir/shell/`: the wordmark, the menubar, the notebook, ABOUT, the accent

| Export | What it is |
|---|---|
| `wordmark(parent, { lead, word, sub, id = 'title' })` | `#title`, with an optional lead glyph (λWAVES' λ) |
| `markSvg()` | The nine-square mark |
| `createMenubar({ opener, host, menus, label, phone, keep })` | FILE · EDIT · VIEW · WINDOW · ABOUT under the wordmark. Returns `{ bar, open(focus), close(), openGroup(name), isOpen, items, destroy() }` |
| `createNotebook({ host, name, title, storageKey, about, faces, render, vendor, logo, onLogo, dump, keyLabel })` | The glass with NOTES and ABOUT. Returns `{ root, open(face), close, toggle, isOpen, face, moveTo, resize, size, dump, text, title, subtitle, mode, setMode, render, html, destroy() }` |
| `loadRenderer()` | Loads marked and KaTeX from `shell/vendor/`, once, only what the page hasn't loaded |
| `aboutFace(face, data)` | The ABOUT face from data |
| `gplLicence(name, { license, notice })`, `kitType(extra, fontsPath)` | The default licence and type lines |
| `richText(node, line)` | Text and `[text, href]` parts. No `innerHTML`; unsafe schemes are dropped |
| `safeHref(u)` | Whether a link's scheme is safe |
| `createAccent({ accentStops, wheelStops, paletteOn, a, b, vivid, hueShift, stageGround, gamut, onAccent })` | Accents A and B as angles on a palette, plus the mark. Returns `{ apply, set(patch), wheelColor, accentColor, markInk, paintMarks, turn, busy(on), hueSat, a, b, vivid, hueShift, paletteOn }` |
| `STAGE_GROUND`, `CARD_GROUND`, `MARK_SELECTOR` | The two stage grounds, the two card grounds, and the marks that `paintMarks()` paints |
| `renderNotebook(markdown, { marked, katex })` | Sanitised markdown with maths (λWAVES' renderer) |
| `renderNotebookMath(tex, display, katex)` | One formula, with an escaped fallback |

Notes on the shell:
- **Menus are data:** `name → () => [[label + '\t' + key, run, disabled, hint] | null, …]`.
- **App faces:** each face in `faces` is `{ id, glyph, label, title, build(faceEl, api), show(faceEl, api) }` and gets a round button after ◐.
- **Accent defaults:** A 30°, B 300°, vivid 0.1, as λWAVES ships. Josh's law is `{ a: 60, b: 300 }`.
- **Sheets:** `shell/shell.css` is required for the shell. `shell/stage.css` is an optional ground.

---

## `mir/modulation/`: the modulation system

### `registry.js`: the parameter registry

| Export | What it is |
|---|---|
| `createRegistry({ roots, onError })` | The registry every modulation target is registered in. `roots` defaults to λWAVES' `observer · material · state · transport · field` |
| `idFault(id, roots)` | Why an id is not valid, or `null` |
| `MAP_KINDS` | `linear · log · wrap · integer · bipolar` |

### `curve.js`: the curve editor's maths

| Export | What it is |
|---|---|
| `evaluate`, `bend`, `normalizePoints`, `clonePoints`, `mirror`, `flip`, `pointsEqual` | Evaluating and reshaping a curve |
| `addPoint`, `removePoint`, `movePoint`, `setTension` | Pure edits that never mutate their input |
| `PRESETS`, `PRESET_LABEL`, `isPreset`, `presetPoints`, `presetMirror`, `presetIsSymmetric`, `applyPreset` | The preset shapes |
| `curveHash`, `curveInfo` | A hash and a summary of a curve |
| `TENSION_OCT`, `CURVE_MAX_POINTS`, `SINE_TENSION` | Limits and constants |

### `curve-gesture.js`: the curve editor's pointer law (1.4.3)

| Export | What it is |
|---|---|
| `svgPoint(svg, event)` | Converts client coordinates to the SVG viewBox before hit testing, including CSS/UI scaling |
| `curveHit(point, points, handles, radius)` | Nearest point-or-handle hit test in that coordinate system |
| `curveAction(event, hit)` | FL Studio's action matrix: right-empty add, left-point move, left-handle tension, right- or double-click handle reset, Alt-left-point delete |
| `pointDrag(start, current, event)` | Shift locks value; Ctrl locks time |
| `pointAddValue(event, pointerValue, curveValue)` | Shift-right-click preserves the curve's current value; ordinary right-click uses pointer value |
| `tensionDelta(startY, currentY, event)` | Handle travel with Ctrl fine adjustment |
| `editablePresetForWave(wave)` | Deterministic analytic wave → editable breakpoint preset; S&H and DRIFT return `null` |
| `CURVE_GESTURES` | The human-readable gesture contract |

### `mod.js`: the model

188 exports. Grouped:

| Group | Exports |
|---|---|
| **Sources** (LFO, envelope, audio, steps) | `addSource, setSource, removeSource, moveSource, sourceList, sourceOf, sourceIndexOf, sourceCount, sourceIds, WAVES, WAVE_LABEL, waveAt, waveSeedOf, envAt, envDuration, envPoints, trigger, release, curveEdit, copyBank, pasteBank, STEPS_*, stepQuant, stepsRungIndex` |
| **Audio** | `modFeedAudio, audioReset, audioArm, audioConsumers, audioDemand, audioApplicationDemand, audioOutputOf, audioReadout, audioRangeNorm, audioDbAmp, audioDbPow, audioNorm, audioAlpha, audioRiseMs, AUDIO_*` |
| **Macros and triggers** | `addMacro, setMacro, removeMacro, moveMacro, macroList, macroOf, MACRO_KINDS, MACRO_BOOT, MACRO_MAX, isTriggerMacro, triggerMacros, fireMacro, releaseMacro, fireTriggers, releaseTriggers, triggerLevel, setSourceTrigger, subsOfTrigger, subCountOfTrigger, clearTrigger, pruneTriggerRefs, isHitOutput, HIT_ENV, hitEnvOf, hitMacroFor` |
| **Routes** | `addRoute, removeRoute, removeRoutesOfTarget, removeRoutesOfMacro, setRouteRange, routeList, routeOfTarget, routeOfId, routesOfTarget, routeCountOfTarget, routesOfMacro, routeCountOfMacro, targetDepth, targetPos, targetValue, targetDriven, anyLiveRoute, syncDormant, dormantRoutes, dormantCount, dormantCountOfMacro` |
| **Clock and transport** | `transport, setTransport, reanchorTransport, advance, needsClock, lfoHz, freeHz, freePos, beatsPerCycle, smoothTau, syncMode, setSyncMode, clampSyncMode, effectiveSyncMode, setExternalClock, externalClockActive, transportLag, tapTempo, TAP_*, HOLD_NOTES, heldBeat, holdStart, holdEnd, snapshotPhases, restorePhases, resetPhases, modPlayEdge, BPM_MIN, RATE_MIN, LFO_MULTS, LFO_MULT_LABEL, LFO_MULT_DEFAULT, TRIPLET, BEATS_PER_WHOLE, SYNC_MODES, SYNC_DEFAULT` |
| **State** | `serialize, deserialize, serializeRack, deserializeRack, migrateRack, modStateReadable, MOD_STATE_V, MOD_STATE_READS, modState, modStat, modReset, materialize, legacyOf, setLegacy, demolish, migrateFromLegacy` |
| **Presets** | `presetList, presetFolders, setPresetFolder, presetGet, presetApply, presetSave, presetDelete, presetStoreReload, presetStoreState, FACTORY_PRESETS, PRESET_LS, PRESET_FORMAT_V, PRESET_NAME_MAX, PRESET_FOLDER_DEFAULT, PRESET_FOLDER_FACTORY, PRESET_FOLDER_MAX` |

About the preset store:
- **The key and folders** are λWAVES' (`lambdawaves.q0.modpresets`; `Josh's Collection`, factory `MANDELBROT`), and every reader shares them (each app has its own origin).
- **Not injectable yet.** Making them options is a `mod.js` edit, and `mod.js` stays byte-identical to its vendored source while λWAVES' `tests/mir.test.mjs` §16 proves it.

### `host.js`: the host a window talks to

| Export | What it is |
|---|---|
| `createTargetHost({ registry, available })` | The targets a route can drive |
| `createModClock({ registry, targets, present, pauseMode, wall, maxStep, enabled, presentationActive })` | The clock that advances modulation |
| `createModHost({ …, invalidateGeometry, roots, onError })` | The host a window mounts on |
| `MAX_WALL_STEP`, `PAUSE_MODES`, `RESUME_LAWS`, `resumeGrid` | Clock limits and pause/resume laws |
| `model` | the model module (`mod.js`) the host drives, re-exported |

The remaining exports are **λWAVES content that still lives in the kit**:
- `labParameters`, `LAB_PRESET_FOLDER`, `LAB_PRESETS`, `presetRouteTargets`, `foreignPresets`, `labPresetList`, `labPresetFolders`, `labPresetGet`, `labPresetApply`;
- `barTempo`.

They go home to λWAVES when the kit drops its λWAVES leftovers (2.0.0).

### `modwindow/modwindow.js`: the window's builders

| Export | What it is |
|---|---|
| `createModWindow(host)` | The whole window, built and not wired: `root.modwindow` holds `rack, foot, transport, addMacro, addDevice, buildRing, buildSpan, buildClear, buildGhost, buildDevicePick, buildMacroPick, buildPresetSheet, buildDeadInspector` |
| `buildChipRail`, `buildMacroSlot`, `buildDevice`, `setDeviceMode`, `buildAudioSheet`, `buildRing`, `buildSpan`, `buildClear` | The sub-builders |
| `setViewHeight`, `setWorkLane` | Sizing the rack view and the work lane |
| `ringGeom`, `knobArc` | Ring and arc geometry |
| `gripIcon`, `powIcon`, `GLYPHS`, `glyphEl`, `setGlyph`, `m2mk`, `m2svg`, `SVG_PLAY`, `SVG_PAUSE` | The window's own icons and DOM helpers |
| `NS`, `WINDOW_ID`, `WINDOW_TITLE`, `CHIPRAIL_LABEL`, `IDS`, `GEOM`, `sizeLaw`, `COPY` | Names, ids, geometry and copy |

**The complete controller that wires the window to a host is not in the kit yet.** Routes, rings, the clock and presets (`wireGrip`, `wireDepth`, `paintDepth`, `moveMacro`, `rebuildMacros`) live in λWAVES' `lab/modwindow.js`, which BASINS and NEBULA copied. Curve pointer semantics are the exception since 1.4.2: every host imports `curve-gesture.js`, so copied controllers cannot drift on point/tension controls.

The window loads two sheets, `mir/modulation/modhost.css` and then `mir/modulation/modwindow/modwindow.css`, and nothing may follow the second.

---

## `tools/`: the proofs

| Tool | What it does |
|---|---|
| `adopt.mjs <app> [--check \| --dry-run] [--prefix lab] [--allow-dirty]` | Put the kit into an app, or prove it is in step |
| `serve.mjs [port] [root]` | A static server with no dependencies (`npm run gallery`) |
| `lint-tokens.mjs [--unused]` | Every token the kit reads has a writer |
| `stylehash.mjs capture\|compare` | Neutrality: does a kit change change what an app draws? |
| `shell-parity.mjs capture\|compare` | The shell is λWAVES' shell: styles, text, boxes and pixels in 14 states |
| `shell-behaviour.mjs [url]` | 19 behaviour probes of the shell |
| `extract-shell-css.mjs` | How `mir/shell/shell.css` was made |
| `cdp.mjs` | The headless Chromium under all of them |

`npm test` runs the token lint, `tests/*.node.mjs` and `tests/*.browser.mjs`.
