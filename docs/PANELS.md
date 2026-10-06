# MIR · PANELS — the kit's rack windows

Every one of Josh's apps hand-built the same windows: a camera, a master grade, curves, an XY controller, a list of colour lanes, a palette ramp. A **panel** is one of those windows built once in the kit. The app names its parameters through a small port; the kit owns the controls, the layout, the gestures, the modulation targets, the project part and the history. Josh, 2026-10-02: *"…future rack window ideas like a XY controller, Curves (Like Photosho's curves), 3D camera Controller, Alpha blending (Like a master Hue, Brightness, and whatever), and other general cross app features."*

```js
import { createGradePanel, createCurvesPanel } from './mir/panels/index.js';   // the panels' one door (mir/mir.css already has their sheets)

const app = await createApp({ name: 'DEMO', modRoots: ['grade', 'curves'] });   // the panels' targets route with no other line
const canvas = document.querySelector('canvas');
createGradePanel({ rack: app.rack, canvas, mod: app.mod, history: app.history });   // no engine: one SVG filter on the canvas
createCurvesPanel({ rack: app.rack, canvas, mod: app.mod, history: app.history });  // the same filter, shared with GRADE
```

## The six

| Panel | What it is | Doc · gallery |
|---|---|---|
| **CAMERA** | where the view is, 2-D (BASINS' camera window: ROTATION, NORTH, PAN, the scales, ORBIT) or 3-D (a direction sphere, ROLL, ZOOM, FOV, TURNTABLE · FREE), with an optional HAND section; a CSS camera when there is no engine | [PANEL-CAMERA](PANEL-CAMERA.md) · `gallery/panel-camera.html` |
| **GRADE** | the master picture: EXPOSURE, CONTRAST, GAMMA, SATURATION, BLACK · WHITE, OPACITY, HUE, INVERT, BLEND | [PANEL-GRADE](PANEL-GRADE.md) · `gallery/panel-grade.html` |
| **CURVES** | Photoshop's curves: MASTER, R, G, B (or the app's channels), PRESET, AMOUNT, the app's histogram behind the curve | [PANEL-CURVES](PANEL-CURVES.md) · `gallery/panel-curves.html` |
| **XY** | one pad, three uses: PAIR (one of the app's coupled pairs), ROUTE (X and Y are two macros you route anywhere), MORPH (four snapshots on the corners, blended) | [PANEL-XY](PANEL-XY.md) · `gallery/panel-xy.html` |
| **LANES** | a list of lanes, each a colour, one principal amount, a blend and a mute: rows (BASINS' colour lanes) or strips (NEBULA's AGE, SOLEIL's lanes), with solo, fold, reorder | [PANEL-LANES](PANEL-LANES.md) · `gallery/panel-lanes.html` |
| **RAMP** | a palette ramp: stops on a strip, presets, OKLab blending, a seam reading when cyclic; a 256-entry table out | [PANEL-RAMP](PANEL-RAMP.md) · `gallery/panel-ramp.html` |

GRADE and CURVES share one picture filter (`panels/picture-filter.js`): on one canvas they are one SVG filter, written once a frame, and nothing at all while every value is home.

## The rules for a kit rack window

| Rule | What it means |
|---|---|
| **Only the control language** | Every control is a row of `docs/CONTROLS.md`, made by `control(descriptor)`: an arc for a hue or an angle, a knob for an ordinary parameter, a lane slider for a thing's one principal parameter, an XY pad for a pair, a range slider for lo/hi, a switch with a lamp for a state, a trigger for an action, a segment for 2–4 modes, a stepper for 5 or more. The one new kind this wave, the CAMERA's direction sphere, is in the table for Josh to rule on. |
| **A panel is a rack card** | `rack.register`: it docks, floats, folds, powers and saves its place like every window, wears the look the user chose, and its ⓘ panel and hints are the kit's. It lives in `mir/panels/<name>.js` + `<name>.css`, in a kit layer. |
| **The port is small, and nothing polls** | The app hands descriptors and a way to read, write and be told (`get`, `set`, `subscribe`), or ids already in the modulation registry. Nothing is re-read on a timer: the app notifies, or the panel reads on the frame only while a gesture or a modulation is live and the card is visible. |
| **Every continuous control is a modulation target** | under the panel's own root (`camera.*`, `grade.*`, `curves.*`, `lanes.*`, `xy.*`; `modPrefix` renames it). `createApp({ modRoots: […] })` or `installModulation({ roots })` must name the root, or `mod.add` refuses the targets (LANES and XY warn once and carry on without them). |
| **The source app's design wins** | Where an app already had the window, its layout, words and behaviour are the panel's; where apps disagreed, BASINS wins, then the most complete. What no source decided is listed in each doc and in the CHANGELOG's "Choices to overrule". |
| **A blank canvas is enough** | Where it can be, a panel works on a canvas with zero engine code (CAMERA drives a CSS transform, GRADE and CURVES a filter), so the starter and the gallery show it alive. |
| **Project and history** | A panel's values ride in the project as a part named for the card (`project: false` when the app's own part carries them); with `history`, a gesture is one row named `CONTROL · WINDOW`. |
| **Icons** | from `mir/glyph.js` (`cameraOrbit`, `grade`, `curves`, `xy`, `lanes`). |

## Porting an app's window onto a panel

1. **Find its port.** List what the window reads and writes; make `get(id)` / `set(id, v)` over the engine's own numbers, and `subscribe(fn)` if the engine changes them by itself (a gesture on the picture, a preset, the app's own modulation). Each panel's doc names its ids.
2. **Name the root.** Add the panel's root to `createApp({ modRoots })` (or `installModulation({ roots })`). A route the app saved under its own old ids can stay: CAMERA and GRADE take `modIds` to keep them.
3. **Register it.** `create<Name>Panel({ rack, port, mod, history })`. Pass `project: false` if the app's project already carries the values.
4. **Delete.** The window's DOM, its CSS, its sliders' own drag laws and its own save code go; each panel doc's "What an app deletes" has the files and lines for BASINS, NEBULA, SOLEIL, EARTH, AUTOMATA and λWAVES.

`mir/kit.js` does not re-export the panels (they import it, so it would be a cycle): `mir/panels/index.js` is their door. API: `docs/API.md` § `mir/panels/`.
