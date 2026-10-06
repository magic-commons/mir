# MIR · the CURVES panel — Photoshop's curves, on any picture

A rack card with a transfer curve per channel: a square plot with the diagonal as the neutral curve, points you add, drag and remove, tension you bend, a channel choice, presets, an amount and a reset. Josh, 2026-10-02: *"Curves (Like Photosho's curves)"*. The source is SOLEIL's CURVES (its editor, its presets, its 256-entry tables, its AMOUNT and RESET), standing on the kit's curve mathematics (`modulation/curve.js`) and the kit's curve pointer law (`modulation/curve-gesture.js`). It is not the modulation window's curve editor, which is welded to a device's record; this one edits a plain list of points.

The output is **one 256-entry table per channel**. With no engine it goes into the same SVG filter GRADE uses (`picture-filter.js`), so the curves work on any canvas with no app code. With a **port** the app takes the tables into its own shader and no filter is installed.

Try it at `gallery/panel-curves.html`: CURVES and GRADE on one picture, through one filter, with a histogram the page counted from its picture behind the curve.

```js
import { createCurvesPanel } from './mir/panels/curves.js';   // and <link rel="stylesheet" href="mir/panels/curves.css">

// 1 · NO ENGINE: MASTER, R, G and B on the picture.
createCurvesPanel({ rack, canvas: document.getElementById('picture'), mod: app.mod, history: app.history, histogram: { MASTER: bins, R, G, B } });

// 2 · AN ENGINE: any channel names; a table per channel to your shader.
createCurvesPanel({ rack, mod: app.mod, channels: ['MASTER', '171', '193', '211'],
  port: { setTable(channel, table) { device.queue.writeTexture({ texture, origin: [0, rowOf(channel), 0] }, toBytes(table), { bytesPerRow: 256 }, [256, 1, 1]); } },
  histogram: (channel) => engine.histogram(channel) });      // optional: bins of any length, or { MASTER, R, G, B }
```

`createCurvesPanel` registers a rack card (`rack.register`; it docks, floats, folds, powers and saves its place like every window; built the first time it opens). The curves, the filter, the project part and the history domain are made at once, so a closed card still applies them. `createCurvesView(parent, options)` builds the same rows anywhere; `curveEditor({ get, set(points, live) })` is the plot alone (SOLEIL's ATLAS hover, a device of an app's own).

## The window, top down

| Row | What | Control |
|---|---|---|
| **CHANNEL** | MASTER · R · G · B (or the app's channels) | a segment for 2–4, a stepper for 5 or more (`control(descriptor)` chooses) |
| **the plot** | the curve; the quarter grid; the diagonal; the histogram when the app hands one | the curve editor (below) |
| **AMOUNT · PRESET** | AMOUNT: the diagonal at 0, the whole curve at 100 % · PRESET: LINEAR, LIFT, S, LOG, GAMMA, INVERT (SOLEIL's) | a knob (a modulation target) · a stepper |
| **RESET** | this channel back to the diagonal, AMOUNT back to 100 % | a trigger |

The curve is drawn in accent B (SOLEIL draws it so: a transfer is a relationship); R, G and B draw theirs in their own colour (`--curves-ink-r`, `-g`, `-b`).

## The hand

| | |
|---|---|
| **a press on the plot** | adds a point **there** and drags it (Photoshop) |
| **a press on a point** | drags it; Shift keeps its value, Ctrl its place (the kit's curve law) |
| **drag a point out of the plot** | it fades, and goes on release (Photoshop); back inside, it stays |
| **double-tap a point** | removes it (Alt-click too) |
| **drag a ring** | bends its segment: down drops it, up lifts it; Ctrl is fine (SOLEIL's rings, FL's tension) |
| **double-tap a ring** (or right-click it) | straightens it |
| **right-click the plot** | adds a point on the curve where you clicked (the kit's curve law) |
| **the two ends** | move only up and down, and are never removed |
| **keys** (the plot focused) | `+` / `−` choose the next / previous point · arrows move it 1/100 (Shift ⅛ of that, Page ten) · Delete removes it · Enter adds one halfway to the next · Escape lets go, and a drag in progress goes back |
| **cancel** | a pointer cancelled or lost puts the curve back as it was before the gesture |

Targets are found by the kit's `curveHit` within 12 px (22 px under a finger), points before rings. A curve holds at most 32 points (`curve.js`'s rail).

## The output

`curveTable(points, amount)` → a `Float32Array(256)` in 0..1, the curve mixed with the diagonal by AMOUNT.

- **No engine.** MASTER, R, G and B go to the picture's filter, composed into one table per channel with GRADE's tone and INVERT: tone, then MASTER, then the channel's own, then INVERT. A channel on the diagonal sends nothing (no table pass). Other channel names are ignored by the filter.
- **A port.** `port.setTable(channel, table)` for every channel, once at the start (the diagonal included, so the shader starts from data) and on every change. Live while a hand drags; the same call once more when it lands.

## Modulation

AMOUNT is a modulation target, `curves.amount` (`modPrefix`, or the card's `id`, names the root; the install's `roots` must list it). A hand on a routed AMOUNT writes its base. The curve itself is the hand's.

## Project and history

- **Project.** A part named `part` (default `'curves'`): `{ v: 1, amount, channel, curves: { MASTER: [[t, v, tension], …], … } }` with the channels on the diagonal left out. `project: false` when the app's own part carries them (SOLEIL's link and prefs do: it keeps `serialize()` / `restore()` on the model).
- **History.** Pass `history`: one domain; a drag, a double-tap, a key or a preset is one row, `CURVE · CURVES` or `PRESET · CURVES`.
- **Idle.** Nothing runs at rest; the plot is painted on a change, coalesced on the frame.

## What an app deletes

| App | Deletes | Keeps |
|---|---|---|
| SOLEIL | `curves.js` 62–105 (the editor, 44 lines) and 11–26 (the presets and `tableOf`, `pathOf`, `presetOf`: the kit's now); `main.js` 1120–1134 (the CURVES window: TARGET select, the mount, AMOUNT, PRESET, RESET: 15 lines) and 1271–1275 (`curveRowSel`, `curveParamId`, `syncCurveWidgets`); `sol.css` 160–166 | the texture and its rows (a port whose `setTable` writes row `bandRow(channel)`; channels: the twelve bands and MASTER); the per-band AMOUNT targets it registers itself (`main.js` 763–764) |
| NEBULA | — (its tone is TONE + GAMMA + BLACK / WHITE: GRADE's rows) | a CURVES card is new to it |
| AUTOMATA | its DISPLAY LO · HI · GAMMA could become one curve on a port (`main.js` 854–856) | the channel routing |
| λWAVES | SOFT is a gamma (GRADE) | — |
| EARTH | RANGE and the palette (not read in full) | — |
| any canvas app | everything: `createCurvesPanel({ rack, canvas })` | — |

## Limits to know

- The two ends keep their place along the input (curve.js's law: a cycle's ends are its ends), so a black or white **input** clip is GRADE's BLACK · WHITE, not a dragged end point.
- AMOUNT is one for the window (SOLEIL had one per curve); a per-channel amount is the app's own target (SOLEIL keeps its thirteen).
- The histogram is drawn from what the app hands; the panel never reads the picture.

## Where it is

`mir/panels/curves.js` (the editor, the model, the view, the card), `mir/panels/picture-filter.js` (shared with GRADE), `mir/panels/curves.css` (layer `mir.kit.plugin.host`, tokens `--curves-*`). Tests: `tests/panel-grade.node.mjs` (the tables, AMOUNT, the presets, the port road by channel name, the project part) and `tests/panel-grade.browser.mjs` (real input hit-tested by `elementFromPoint`, read off the screen: a point added and dragged up brightens the mid-grey from 128 to 191, dragged out it goes, a double-tap removes one, the R channel moves red alone, GRADE's INVERT composes with the curve through the one filter, the keys).

Sources: SOLEIL `lab/curves.js` 1–105, `lab/main.js` 1120–1134, `lab/sol.css` 160–166; the kit's `mir/modulation/curve.js` and `curve-gesture.js`.
