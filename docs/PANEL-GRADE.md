# MIR · the GRADE panel — the master picture controls

One window over the whole picture, in every app: EXPOSURE, CONTRAST, GAMMA, SATURATION, the input levels (BLACK · WHITE), OPACITY, HUE, INVERT and BLEND. Josh, 2026-10-02: *"Alpha blending (Like a master Hue, Brightness, and whatever)"*. Every app had hand-built some of this row (NEBULA's GRADE, SOLEIL's MASTER, BASINS' BRIGHTNESS and GLOBAL HUE, λWAVES' LOOK, AUTOMATA's DISPLAY, POLAR's EXPOSURE); this is it built once, from the control language, so every MIR app has the same one.

It works on **any canvas with no app code**: the panel puts one SVG filter on the picture. An app with its own shader takes the values through a **port** instead, and no filter is installed.

Try it at `gallery/panel-grade.html`: one picture graded by the filter alone, one shaded by the page's own code through a port (with two rows of its own and BLEND hidden). `?bench` makes the picture fill the window and redraw every frame, for measuring.

```js
import { createGradePanel } from './mir/panels/grade.js';     // and <link rel="stylesheet" href="mir/panels/grade.css"> (after the colour controls' sheet)

// 1 · NO ENGINE: any canvas (or any element). One SVG filter, CSS opacity and mix-blend-mode. Nothing else.
createGradePanel({ rack, canvas: document.getElementById('picture'), mod: app.mod, history: app.history });

// 2 · AN ENGINE: the values go into your own last pass.
createGradePanel({ rack, mod: app.mod, port: {
  set(id, v) { uniforms[id] = v; engine.redraw(); },          // exposure contrast gamma saturation hue black white opacity blend invert, and your rows' ids
  get: (id) => uniforms[id],                                  // optional: your number is the truth
  subscribe: (fn) => engine.onGradeChange(fn),                // optional: you changed one yourself; nothing is polled
  ranges: { exposure: { min: 0.05, max: 20, home: 1 } },      // optional: your range for an id
  rows: [{ id: 'vibrance', label: 'VIBRANCE', min: 0, max: 1, home: 0, group: 'GRADE' }],   // optional: rows of your own, by descriptor
  hide: ['blend'],                                            // optional: the rows you do not have
} });
```

`createGradePanel` registers a rack card (`rack.register`: it docks, floats, folds, powers and saves its place like every window; the card is built the first time it opens). The values, the filter, the project part and the history domain are made at once, so a closed card still grades the picture and a project still restores it. `createGradeView(parent, options)` builds the same rows anywhere (FOLDERS, a window of the app's own). `parent: node` instead of `rack` builds the card's rows straight into a node.

## The rows, top down

| Row | What | Control (docs/CONTROLS.md) |
|---|---|---|
| **tone** | EXPOSURE · CONTRAST · GAMMA · SATURATION | solid knobs (Josh: *"the ol' regular knobs"*) |
| **levels** | BLACK · WHITE: below BLACK is black, above WHITE is white | one range slider, two thumbs that never cross |
| **amount** | OPACITY: how much of the picture is laid over what is under it | the window's lane slider (the picture's one principal amount) |
| **turns** | HUE · INVERT | an arc in its own colour · a switch whose glyph is the state (BASINS' half-filled disk, turned over when ON; no lamp) |
| **blend** | BLEND: NORMAL, MULTIPLY, SCREEN … LUMINOSITY (the sixteen CSS modes) | a stepper `‹ NAME ›`; a tap on the name opens the list |
| **the app's** | its own rows by descriptor (`control(descriptor)`), under their `group` word | whatever the descriptor says: a knob, an arc, a switch … |

Each row exists only when it is not hidden. A double-tap on any knob, arc, thumb or the lane sends it home (the one knob law).

| Id | Range (the kit's; `ranges` overrides) | Home | What it does to the picture |
|---|---|---|---|
| `exposure` | 0.25 … 4, log | 1 | multiplies every channel, before the levels |
| `black`, `white` | 0 … 1 | 0, 1 | the input levels: `(x − black) / (white − black)` |
| `gamma` | 0.5 … 2.2, log | 1 | `x^(1/γ)`: above 1 lifts the middle tones |
| `contrast` | 0.5 … 2, log | 1 | about mid-grey |
| `saturation` | 0 … 2 | 1 | 0 is grey (the CSS weights), 2 doubles |
| `hue` | 0 … 360°, wraps | 0 | every colour turned together |
| `opacity` | 0 … 1 | 1 | CSS `opacity` on the picture |
| `blend` | the sixteen CSS modes | `normal` | CSS `mix-blend-mode` on the picture |
| `invert` | on / off | off | the negative, last of all |

## The filter: the zero-engine road

`mir/panels/picture-filter.js`. `pictureFilter(canvas)` gives every caller the **same** filter for one picture (GRADE and CURVES on one canvas share it); the last `release()` puts the element's own filter, opacity and blend back.

| | |
|---|---|
| `feColorMatrix` | SATURATION and HUE composed into one matrix (the CSS `saturate()` and `hue-rotate()` matrices) |
| `feComponentTransfer` | one 256-entry table per channel: EXPOSURE → BLACK / WHITE → GAMMA → CONTRAST, then CURVES' master and channel tables, then INVERT, all composed into **one** table |
| CSS | `opacity`, `mix-blend-mode` |

**Neutral costs nothing.** A primitive that would do nothing is not in the filter, and when nothing is left the picture's `filter` is empty: the default grade adds no filter pass at all. **One write per frame:** changes are coalesced on `core/frame.js`; a modulated HUE rewrites the matrix's twenty numbers once a frame and never rebuilds a table. The filter works in sRGB, as CSS filters do.

### What it costs (measured 2026-10-06)

`gallery/panel-grade.html?bench`: the picture fills the window and is redrawn every frame (as an engine's canvas would be), the modulation clock running; 4 s per case, frame times from `requestAnimationFrame` and `window.__MIR.perf`.

| Case | RTX 3070 (Chromium, GPU compositing), 1600 × 1000 and 2560 × 1440 | software compositing (headless SwiftShader), 1600 × 1000 |
|---|---|---|
| A · home: no filter | 16.67 ms (60 fps) | 16.6 ms |
| B · a static grade (SATURATION 0.5, CONTRAST 1.3: matrix and table) | 16.67 ms, no frame lost | 25.4 ms mean (p50 33.3) |
| C · HUE modulated by an LFO (the matrix rewritten every frame) | 16.67 ms, no frame lost | 21.6 ms mean (p50 16.7, p95 33.4) |

The script side of a write is small: 0.024 ms for a HUE change, 0.18 ms for a table rebuilt (a curve dragged). No long task in any case.

**The recommendation.** The filter is fine for a 2-D canvas app, a gallery, the starter, and any app on a browser that composites on the GPU (on this machine's RTX it loses no frame at 2560 × 1440 with HUE modulated). Where the compositor is in software (a headless browser, a machine without GPU compositing) a filter on a full-window picture that redraws every frame costs 5 to 9 ms a frame. **An app with a WebGPU or WebGL engine should take the port**: the grade is a few multiply-adds in its last pass, and the picture then never leaves the GPU for a filter.

## The port

```
{ set(id, v)                         every change, by id (the master ids above and the rows' own)
  get?(id) → value | undefined       the app's number is the truth (undefined: the panel keeps its own)
  subscribe?(fn) → off               fn() when the app changed a value itself; nothing is polled
  ranges?: { [id]: { min, max, home, log, fmt, label, hint } }   the app's range for an id, in its own unit
  rows?: [descriptor]                more rows: { id, label, min, max, home, group, wrap, hue, options, … } (control(descriptor)); a row with its own get/set uses them
  hide?: [id]                        rows the app does not have ('black' or 'white' hides the levels)
  modIds?: { [id]: 'the.apps.id' }   the id a control is a modulation target under }
```

`rows`, `hide`, `ranges` and `modIds` may also be given as options to `createGradePanel` (NEBULA's ten extra rows: VIBRANCE, TEMPERATURE, TINT, SHADE, DITHER, VIGNETTE, GRAIN, ABERRATION, GAIN, TONE).

## Modulation

Every continuous control is a modulation target: `grade.exposure`, `grade.contrast`, `grade.gamma`, `grade.saturation`, `grade.hue`, `grade.black`, `grade.white`, `grade.opacity`, and `grade.<id>` for each row of the app's (`modPrefix` for two grades on a page; `modIds` for an app's own ids). Pass `mod` (`installModulation()`'s result): the targets are added when the card is built (a route saved against them wakes up) and a hand on a routed control writes its **base** (`mod.hand`). **The install's `roots` must name the prefix** (`installModulation({ roots: ['grade'], … })`). Without `mod`, `view.params()` is the list for your own `installModulation({ params })`. BLEND and INVERT are states, not targets.

## Project and history

- **Project.** The values ride as a part named `part` (default `'grade'`): `{ v: 1, values: { id: value } }`; a routed control is saved as its base. `project: false` when the app's own part carries them.
- **History.** Pass `history` (`createHistory()`): the values are one snapshot domain, so a gesture is one row, named `CONTROL · WINDOW` by the kit's gesture names (`SATURATION · GRADE`). Undo goes back through the port or the filter.
- **Idle.** Nothing runs at rest. A notice from the app repaints the controls once on the frame.

## What an app deletes

| App | Deletes | Keeps |
|---|---|---|
| SOLEIL | `main.js` 1024–1032 and 1036: EXPOSURE, GAMMA, SATURATION, HUE, CONTRAST and INVERT as hand-built knobs and a switch (10 lines, each with its `writeControl` and `writePrefs` wiring) | TONEMAP, LINK UI, NORMALIZE (rows by descriptor, or its own group); the shader's master pass, fed by a port |
| NEBULA | the `grade` entry of `panels.js` 13–17 and the factory's build of its 17 rows | its GRADE uniforms (`lab4.js` 2179) behind a port; VIBRANCE, TEMPERATURE, TINT, SHADE, DITHER, VIGNETTE, GRAIN, ABERRATION, GAIN, TONE as `rows` |
| λWAVES | `lab/rack.js` 1282–1284 (EXPOSURE, SOFT, HUE knobs), 1399 (GAMMA), 1515 (INVERT) and their records at 2546–2551 | SOFT and STAGE as `rows`; the material uniforms behind a port |
| AUTOMATA | `main.js` 838 and 841 (EXPOSURE, CONTRAST), 858–859 (HUE, SATURATION): 4 lines | LO / HI / GAMMA map a channel, not the picture: they stay its DISPLAY (or a CURVES port) |
| BASINS | the INVERT glyph switch it builds by hand (`colour-window.js` 255–259, `colour.css` 96–102) | its BRIGHTNESS gauges: they are the palette's own quantities (its SATURATION is the escaping pixels' brightness), not a picture grade |
| POLAR | its EXPOSURE knob (not read in full) | — |
| any canvas app | everything: `createGradePanel({ rack, canvas })` | — |

## Where it is

`mir/panels/grade.js` (the model, the view, the card), `mir/panels/picture-filter.js` (the filter, shared with CURVES; its pure parts are exported for an app's own shader: `toneAt`, `toneTable`, `colourMatrix`, `composeTables`), `mir/panels/grade.css` (layer `mir.kit.plugin.host`, tokens `--grade-*`). Tests: `tests/panel-grade.node.mjs` (the filter's maths, the ids, the port road, the project part, one history row) and `tests/panel-grade.browser.mjs` (real input hit-tested by `elementFromPoint`, every picture check read off the screen: SATURATION to 0 makes a red patch grey, INVERT flips it, a routed LFO turns HUE, OPACITY, BLEND, the port card, an idle page).

Sources: NEBULA `lab/panels.js` 13–17 and `engine/params.js` 61–75; SOLEIL `lab/main.js` 1020–1036; BASINS `app/colour-window.js` 56–68 and 255–259, `app/colour.css` 96–102; λWAVES `lab/rack.js` 1282–1284, 1399; AUTOMATA `lab/main.js` 838–859.
