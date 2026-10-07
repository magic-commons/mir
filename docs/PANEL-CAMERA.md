# MIR · the CAMERA panel — where the view is

A rack card an app gets by naming its camera. It is the window BASINS drew for its 2-D view (a ROTATION arc, a PAN pad, NORTH that goes back when pressed again, the two scales, the orbit) and λWAVES drew for its 3-D one (TURNTABLE · FREE, SPIN, FRICTION, DRAG GAIN, FLING, ZOOM, FOV), built once, from the control language, so every MIR app has the same one. The app keeps what the numbers mean; the panel owns the controls, the layout, the gestures, the modulation targets, the project part and the history.

Try it at `gallery/panel-camera.html`: three cards, two of them with **no engine at all** (the panel turns a CSS transform on the picture), one over a small engine written by hand in radians.

```js
import { createCameraPanel } from './mir/panels/camera.js';     // and <link rel="stylesheet" href="mir/panels/camera.css"> (it is in mir.css)

// 1 · NO ENGINE: any picture. The panel drives rotate / translate / scale on the canvas (mode '3d': a perspective).
createCameraPanel({ rack, canvas: document.getElementById('picture'), mode: '2d', mod });

// 2 · AN ENGINE: name your camera by a port. Implement only the ids you have; the panel shows only those.
createCameraPanel({ rack, mod, port: {
  get: (id) => ({ rotation: view.theta * 180 / Math.PI, panX: view.x, panY: view.y })[id],
  set(id, v) { /* write the engine's number */ },
  subscribe: (fn) => engine.onViewChange(fn),                    // the app notifies; nothing is polled
  verbs: [{ label: 'CENTER', run: () => centerOnCore() }],       // the app's own verbs come first on the top row
} });
```

`createCameraPanel` registers a rack card (`rack.register`; it docks, floats, folds, powers and saves its place like every window; the card is built on first open). `createCameraView(parent, options)` builds the same rows anywhere (FOLDERS, a window of the app's own) and returns `{ root, port, params(), controls, sync(), northPress(), home(), destroy() }`.

## The rows, top down

Each row exists only when the port has its ids.

| Row | What | Control (docs/CONTROLS.md) |
|---|---|---|
| **verbs** | the app's own verbs, then **PAN HOME** and **NORTH** (2-D) or **HOME** (3-D). The very top row: no heading, no divider, no route hint (Josh's second message about BASINS' window) | triggers; NORTH lights while the view is at north |
| **mode** | TURNTABLE · FREE | segment |
| **sphere** | the direction sphere for `yaw` and `pitch`, and the two arcs beside it | the sphere is the hand's, the two arcs are the targets (the XY pad's contract) |
| **pan** | PAN: a pad and its knob column X, Y and, under Y, **ROTATION** (1.5.0-alpha.20; Josh: "could the rotation knob sit underneath the Y knob? I think we can save a row that way") | XY pad; an arc for the angle |
| **view** | ROLL · ZOOM · FOV · FLIP, and ROTATION when there is no pad. It follows the pad; a 2-D camera with no ZOOM or FLIP (BASINS) has no view row | an arc for an angle, a knob, a switch with a lamp |
| **scales** | ROT SCALE · PAN SCALE · ORBIT · ORBIT ANGLE | knobs, an arc |
| **HAND** | DRAG · FRICTION · INERTIA · FLING · AUTO-ROTATE · SPIN · WHEEL (SMOOTH · STEP): the feel of the drag. Only when the port has them | knobs, a switch, a segment |

BASINS' MAGNET, GLIDE / CRUISE and STEER are not here: they stay BASINS' (its CONTROLS window keeps them). A port that has `yaw` but not `pitch` gets two plain arcs in the view row; one that has only one of `panX`, `panY` gets plain knobs there too.

## The port

```
{ get(id) → number | boolean | string | undefined       the app's number now (undefined: "I do not have this id")
  set(id, v)                                            write it
  subscribe(fn) → off                                   fn() when the camera changed, by the app's own hand or its engine
  has?(id)                                              say so, when get() cannot (a camera whose value can be undefined)
  angle?: 'deg' | 'rad'                                 the unit of every angle id (default 'deg'); readouts are always degrees
  ranges?: { [id]: { min, max, home, log, step, fmt, label } }   the app's own range for an id, in its own unit
  modIds?: { [id]: 'the.apps.id' }                      the id this control is a modulation target under
  verbs?: [{ label, title?, run() → void | Promise }]   a promise disables its button until it settles (BASINS' CENTER)
  home?()   north?()   northMemo?() → degrees | null    the app's own HOME / NORTH; see below
  turn?(dyaw, dpitch)                                   a RELATIVE turn, in the port's unit: λWAVES' one road (orbitBy) in TURNTABLE and FREE
}
```

**The ids** (`mir/panels/camera-rig.js` `VOCAB` has each one's words, range, home and format):

| 2-D | `rotation` `panX` `panY` `zoom` `flip` `rotationMul` `panMul` `orbit` `orbitAngle` |
|---|---|
| 3-D | `mode` (`'turntable'` · `'free'`) `yaw` `pitch` `roll` `zoom` `fov` |
| HAND | `drag` `friction` `inertia` `fling` `autoRotate` `spin` `wheel` (`'smooth'` · `'step'`) |

`rotation` runs 0…360°, 0 = north, clockwise (the compass needle's sense, BASINS'). Pan is a share of the view's width, up is +Y. `yaw` is about the vertical (z), `pitch` up from the horizon, in the sphere's drawing the plane model's isometric one.

**`NORTH`.** Off north it goes there and remembers where it left; at north it goes back; the memory is kept, so the next press goes north again (BASINS' one-button law, `northStep` in the rig). A double-tap on ROTATION is the same trip north. Unrouted, an app that has `north()` is called instead (BASINS' animated compass: `northToggle`) and reports its memory by `northMemo()`; routed, the rotation's *base* goes north and comes back, the route keeps turning about it.

**`HOME`.** 3-D: `port.home()` when the app has one, else yaw, pitch, roll, zoom and FOV go to their homes. 2-D: PAN HOME resets pan and orbit; a port's `home()` is not used there (BASINS' PAN HOME does not touch rotation or zoom; put an app's RESET VIEW in `verbs`).

## Modulation

Every continuous control is a modulation target. The id is `camera.` + the id in lower case (`camera.rotation`, `camera.panx`, `camera.rotationmul`, `camera.orbitangle`: BASINS' own), or `modIds[id]`, or `options.modPrefix + '.' + id` (a page with two cameras: `modPrefix: 'cam2d'`).

- Give the panel the install: `createCameraPanel({ …, mod })`, `mod` being `installModulation()`'s result. When the card is built it `add()`s its targets (a route saved against them wakes up), and a hand on a routed dial writes the **base** (`mod.hand`), as the kit's law is. **The install's `roots` must name the prefix** (`installModulation({ roots: ['camera'], … })`: the registry refuses a target under an unknown root).
- Or take the list: `view.params()` is `[{ id, label, min, max, step, map, hint, def, get, set, widget }]` to hand to `installModulation({ params })`. `get` and `set` go to `port.get` / `port.set`: the registry writes the app's number.
- The pad is two knobs (`panX`, `panY`) and the sphere is two arcs (`yaw`, `pitch`); a macro routes onto those, never onto the pad or the sphere. A routed pair moves the pad's dot or the sphere's arrow in accent B and the hand's base stays.

## The sphere

`directionSphere(options)` is exported. It is the kit's `plane-model.js` drawing (the same sphere, three rings, isometric projection, 400 × 280) for a direction: the arrow is where the camera looks, the film plane stands across it and turns with ROLL. The hand **grabs the arrow's tip and the tip follows the finger** (`sphereDrag`: a damped least-squares turn, so it never locks at the pole and never jumps when the arrow points at the eye). It stands on the one knob law: ⅛ gear on any modifier or a second finger, a double-tap is home, arrows nudge (Shift ⅛, Page ten). It paints from its two arcs (the base, or the modulated value a route shows).

## The zero-engine camera

With `canvas` and no `port`, `createCssPort(canvas, { mode })` is the port: it keeps the numbers (BASINS' rig: `cameraPose` composes rotation, pan, orbit and the scales, unwrapped across the 359° → 0° seam) and writes one coalesced CSS transform per frame (`translate · rotate · scale`; 3-D: `perspective · rotateX · rotateY · rotateZ · scale`, roll only in FREE). The starter and the gallery use it to show a live camera on any picture. The panel destroys the port it made.

## Project and history

- **Project.** The values ride in the project as a part named `options.part` (default `'camera'`): `{ v: 1, values: { id: value }, north }`. An app whose own part already carries the camera passes `project: false`.
- **History.** Pass `history` (`createHistory()`): the values are one snapshot domain, so a gesture is one row, named `CONTROL · WINDOW` by the kit's own gesture names.
- **Idle.** The panel subscribes. One coalesced frame reads the port after a notice; the 250 ms re-read BASINS' window ran is not here. Nothing runs at rest.

## What an app deletes

| App | Deletes | Keeps |
|---|---|---|
| BASINS | `app/camera-window.js` (157), `app/camera-rig.js` (26: moved to `mir/panels/camera-rig.js` with the same exports), the camera rules in `controls.css:24–39` | a port (~35 lines: `get`/`set` over the registry and `gestures.js`, `subscribe`, `north: northToggle`, `northMemo`, `verbs: [{ label: 'CENTER', run: centerCamera }]`) |
| λWAVES | the camera-motion block in `lab/rack.js` (the CONTROL segment, AUTO-ROTATE, SPIN, FRICTION, DRAG GAIN, FLING, ZOOM, FOV, RESET VIEW: ≈ 37 lines at 1521–1557) | `lab/camera-law.js` (the law), the port over its `camera` object (`turn: orbitBy`, `home: resetView`) |
| the rest | the camera knob rows each already draws (NEBULA, SOLEIL, AUTOMATA, POLAR, EARTH: the census lists the ids; the counts have not been read) | the engine's camera |

## Where it is

`mir/panels/camera.js` (the panel, the sphere, the CSS port), `camera-rig.js` (the maths, no DOM), `camera.css` (layer `mir.kit.house`, tokens `--cam-*`). Tests: `tests/camera.node.mjs` (the rig: BASINS' seam, the pan and orbit, NORTH and its memory, the vocabulary and its units, the sphere drag, the transforms) and `tests/camera.browser.mjs` (real input hit-tested by `elementFromPoint`: the pad and its knobs, NORTH and back, the double-tap, a routed macro turning ROTATION, the sphere and its gear, a radian port with the hand, the project part, an idle page).

Sources: BASINS `app/camera-window.js`, `app/camera-rig.js`; the kit's `mir/plane-model.js`; λWAVES `lab/camera-law.js`, `lab/rack.js:1521–1557`.
