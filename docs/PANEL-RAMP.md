# MIR · the RAMP editor

A colour ramp as **stops on a strip**, as a rack window: a preset stepper, the strip with its stops as handles, a seam reading and a ring when the ramp is cyclic, the selected stop's colour and place, and a lookup table out the other side. It is λWAVES' palette editor (`paletteview.js`, 156 lines) made generic, on the kit's `palette.js` (the presets, OKLab, `toLUT`, `cyclic`).

What the ends of the strip **mean** is the app's: λWAVES' arg ψ from −π to +π and "SEAM at ±π", EARTH's colormap units, BASINS' escape count. They come in as `labels`; the defaults are the plain 0 … 1. Live, a cyclic and a linear ramp side by side: `gallery/panel-ramp.html`.

| | |
|---|---|
| `mir/panels/ramp.js`, `ramp.css` | the editor (a kit layer; load `ramp.css` after the colour controls' sheet) |
| `createRampPanel({ rack, ramp, cyclic, labels })` | a rack card (or `parent: node`) |
| `createRampView(parent, options)` | the rows, built now |
| `rampLUT(stops, n, cyclic)` | the table, anywhere (pure) |
| tests | `tests/panel-lanes.node.mjs` (the table and the stop arithmetic), `tests/panel-ramp.browser.mjs` (real input) |

## Using it

```js
import { createRampPanel } from './mir/panels/ramp.js';

const ramp = {                                          // the port
  get: () => ({ stops: app.palette.stops, preset: app.palette.preset }),      // stops: [{ at: 0..1, rgb: [0..1 ×3] }]
  set: (stops, { preset, live }) => { app.palette.stops = stops; app.palette.preset = preset; },
  lut: (table, n) => gpu.setPaletteTexture(table),      // the ramp as RGBA floats, on every change and at build (λWAVES' api.setLUT)
  subscribe: (fn) => app.palette.onChange(fn) };         // the app changed the ramp itself

createRampPanel({ rack, ramp, cyclic: true, history: app.history,
  labels: { ticks: [[0, '−π'], [.5, '0'], [1, '+π']], seam: 'SEAM at ±π', seamWarn: 'a visible seam at arg ψ = ±π', fmt: (u) => ((2 * u - 1) * Math.PI).toFixed(3) + ' rad' } });
```

`api.toLUT(n)` returns the table for any size; `api.stops()`, `api.load(stops, presetId)`, `api.preset(id)`, `api.seam()` and `api.part()` are there for the app.

Options: `cyclic` (true), `labels`, `n` (256, the table's size), `cap` (16 stops), `min` (2), `presets` (default `palette.js` `PRESETS`; EARTH's colormaps go here as `{ id, label, stops }`), `ring` (false: no ring), `seamTol` (0.06), `project` (false: no part), `history`, and the rack card's `id`, `title`, `side`, `open`, `glyph`, `key`, `eager`.

## The labels (the app's words)

`{ ticks: [[at, text], …], seam, seamOk, seamWarn, at, fmt(at) → text, note }`. `ticks` are the words under the strip (default 0, ¼, ½, ¾, 1); `seam` the readout's name; `at` the field's name; `fmt` how a stop's place reads (the typed value is always the 0 … 1 place); `note` a line under the verbs.

## The hand

| | |
|---|---|
| **tap the strip** (between stops) | adds a stop there; it takes the ramp's own colour at that place, so the picture does not move (the table is unchanged to about one 8-bit step) |
| **drag a handle** | moves the stop; it keeps its identity past a neighbour; the table follows every frame; a cyclic ramp never lets a stop sit on the wrap itself (λWAVES' 0.9999) |
| **drag it off the strip** | the handle fades, and on release the stop is removed. Escape (or a cancel) puts it back exactly |
| **tap a handle** | selects it: its colour is the swatch below (tap = the platform's chooser, drag up or down = turn the hue), its place the number beside it (drag, type, keys) |
| **× (armed)** | the first tap says `sure?`, the second removes the selected stop; it is disabled at the fewest (two) |
| **keys on a handle** | ← → one hundredth, Shift an eighth of that, Page ten, Home and End the ends, Delete **twice** removes |
| presets | the stepper `‹ name ›` walks `PRESETS`; a tap on the name opens the full list; RESET reloads the chosen one |
| ADD, REVERSE, ROTATE | a stop opposite the selected one · the ramp run backwards · a jog wheel that carries every stop round (cyclic only) |

A handle's hit area is a square on the strip's top edge (28 px, 44 under a finger), so the strip below it is always free to tap and add a stop, however many stops there are. Nothing deletes on a double-click: a finger zooming the picture would (Josh, 09-12: "I also too keep deleting the colors on accident").

## Cyclic and linear

| | cyclic (`cyclic: true`) | linear (`cyclic: false`) |
|---|---|---|
| the table | entry *i* is at *i* / *n*; the last stop blends round to the first (at 256 entries it is `palette.js` `toLUT`, bit for bit) | entry *i* is at *i* / (*n* − 1); the ends hold their colours before the first stop and after the last |
| the seam | read in OKLab (`palette.js` `cyclic`): under `seamTol` reads *closes cleanly*, over it a warning, because a seam draws a false line where the ramp wraps | none |
| the ring | the same ramp round, nine o'clock = 0, clockwise, with the seam marked (`ring: false` turns it off) | none |
| ROTATE | yes | no |

Blending is OKLab in both: a straight RGB blend between two saturated hues passes through a muddy grey.

## In the project, in the history

A part named for the card (`ramp` by default): `{ stops: [{ at, rgb }], preset }`. One history domain of the same name; a drag, a key or a swatch turn is one row, named for the handle it began on (`Stop 2 of 6`). `project: false` when the app's own part carries the ramp (BASINS' palette does). No poller: the app's `subscribe` and the hand are the only writers; the table is computed on the frame the hand moves it.

## What an app deletes

| App | File and lines | Becomes |
|---|---|---|
| λWAVES | `paletteview.js` whole but `DEFAULT_PALETTE` and the `push` into `api.setLUT` (about 140 of 156 lines), and its `.pal-*` CSS | a port (`get`, `set`, `lut`) and the labels above |
| EARTH | `palettes.js` 44–48 (`lutGradient`) when it draws its legend from `rampGradient(lut)`; the DERIVED palettes' picker can be `presets` | `createRampPanel({ cyclic: false, presets })` |
| BASINS | the palette's stops as a ramp: not harvested (BASINS' colour lanes are lanes; the escape-count mapping is the fractal's) | — |
| AUTOMATA | its LOOK palettes: the editor takes any list of stops (not read in full) | — |

## Limits to know

- The strip is a gradient of 33 samples of the table (CSS interpolates between them in sRGB), not λWAVES' 1-pixel canvas columns; at a strip a few hundred pixels wide the eye cannot tell.
- The presets are one flat list (λWAVES grouped them by point count in `<optgroup>`s); the stepper's list pane shows names only.
- A stop's place is typed in the 0 … 1 unit even when `fmt` shows radians or degrees.
- The ramp has no modulation targets: a ramp's stops are not a fixed set of parameters. An app that wants its palette animated routes its own phase or hue (BASINS' PHASE and HUE).
