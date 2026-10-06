# MIR · the XY panel — one pad, three uses

A rack card with one square pad on it. A segment at its head says what the pad does:

| Use | What the pad drives | Where it comes from |
|---|---|---|
| **PAIR** | one of the app's coupled pairs: BASINS PAN X / Y, SOLEIL PAN and LENS, NEBULA Re c / Im c, POLAR YAW / PITCH. With more than one pair, a stepper picks which | the kit's XY pad (`docs/CONTROLS.md`): the pad for the hand, its two knobs the targets |
| **ROUTE** | two macros, **XY X** and **XY Y**: a controller in the VST sense. Drag X's or Y's grip onto any knob and the pad moves that knob | the modulation window's own macros and grips: nothing here routes |
| **MORPH** | four snapshots of a window's parameters, one on each corner A–D; the pad blends them, each dial in its own map | AUTOMATA's MORPH (`lab/main.js` 685–711, `lab/morph.js`), moved into the kit as `mir/panels/morph.js` |

In every use the pad is the kit's: drag it, nudge it with the arrow keys (Shift ⅛, Page ten), centre it with Home or a double-tap; Shift, Alt or a second finger is the ⅛ fine gear. **SPRING** (a switch with a lamp) sends it back to centre when you let go of a drag. While a route moves it, the dot turns accent B, the hand's own position stays a ring, and a **trail** of its last twelve positions follows it (painted only when the dot moves).

Try it at `gallery/panel-xy.html`: a picture drawn from six numbers in a DEMO window of plain knobs, with no engine, and the XY card beside it.

```js
import { createXYPanel } from './mir/panels/xy.js';     // and <link rel="stylesheet" href="mir/panels/xy.css"> (or mir/mir.css)

const mod = installModulation({ mount: rack.el.floats, roots: ['basins', 'xy'], params, … });   // the roots must name the panel's prefix
createXYPanel({ rack, mod, history, open: true,
  pairs: [{ label: 'PAN', x: 'basins.panx', y: 'basins.pany' }],     // ids already in the modulation registry, or records { id, label, min, max, map, get, set }
  morph: [{ id: 'grade', label: 'GRADE', params: ['basins.exposure', 'basins.gamma', 'basins.sat'] }],   // optional: absent, every root in mod.params() is a window
  subscribe: (fn) => engine.onChange(fn),                            // the app says when its numbers moved; nothing is polled
});
```

`createXYPanel` registers a rack card (`rack.register`: it docks, floats, folds, powers and saves its place like every window; it is built the first time it opens). Pass `parent: node` instead of `rack` to build the same rows now, anywhere. The uses the card shows are the ones the app can have: PAIR needs `pairs`, ROUTE needs `mod`, MORPH needs a window with at least one finite parameter.

## PAIR

`pairs: [{ label, x, y }]`. `x` and `y` are a modulation id (looked up in `mod.params()` when the card is built, so the app's window must be built first, or the card says so and tries again on its next open) or a record `{ id, label, min, max, map, step, def, get, set, widget }`. The pad's knobs take the record's range, map (`log` is a log axis) and `def` (where Home and the double-tap go; else the middle).

- The hand writes through the app's own road: `mod.hand(id, v)` when a route drives the parameter (the base moves, the route rides on it), else `set(v)`, and the app's own widget is set too, so its knob follows.
- **The pad's knobs are the app's targets**: their `data-param` is the app's id, so a macro dropped on the pad's X knob routes the app's own parameter. A routed pair moves the dot (accent B); the panel reads it on the modulation's own tick, only while the card can be seen.
- `subscribe(fn)` is how the pad hears a change the app made itself (a drag on the picture, a preset). Without it the pad is right after each of its own gestures and each time the card opens.

## ROUTE

X and Y **are two macros** of the modulation model, owned by the panel: `xy:x` and `xy:y` (named `XY X`, `XY Y`; `<id>:x` for a card with another `id`). They are made the first time the hand uses them (a press on a grip or on the pad), so a rack that never uses ROUTE gains nothing. They appear in the modulation window's macro row like any other macro and travel with its presets and its saved rack.

- **The grips** under the pad are the modulation window's own (`mod.view.api.wireGrip`): drag onto any knob to route there (the knobs glow by nearness, as for any macro), tap to arm and then tap a knob, double-tap to reset. The count beside the letter is how many controls that axis reaches. Depth, range, curve, bypass and removal are the window's, on the routed knob.
- The pad writes the macros' values and the routes are applied at once (no clock needed: a macro with no source is a hand's).
- **X and Y are targets too**: `xy.x`, `xy.y`. Route an LFO onto X and the dot moves, and through it macro X and everything X reaches. A macro of the panel routed onto the panel's own axis is taken away (it would drive itself).
- Needs the modulation window mounted (`installModulation({ mount })`); without it the grips are off and the card says so.
- **Not in the kit yet: a macro owned by a panel.** Until `installModulation` has `own(macroId)`, `mod.route('lfo', …)` or the window's source cycle may bind an LFO to XY X while it has no route; the pad then stops moving it. The panel calls `mod.own` when it is there.

## MORPH

AUTOMATA's, over any window. The window is chosen by a stepper when there is more than one: `morph: [{ id, label, params }]` (ids or records), or, absent, every root of `mod.params()` (`camera.*` is CAMERA, `demo.*` is DEMO) without the panel's own.

| | |
|---|---|
| **STORE** | keeps the window's dials as they stand (their **bases**, under any route) in the next empty slot of a bank of eight |
| a row | its number, its name (edit in place, 16 characters), the corners it is on, **RECALL** (the dials go there, through their own road), **STORE** (over it), **×** |
| a **corner**, tapped | arms it: tap a snapshot's number to put that snapshot there (tap the corner again to leave it) |
| a corner, **held** (450 ms) or **Shift-clicked** | stores the dials as they stand straight onto it (its own slot, else the next empty one) |
| **ENGAGE** | the pad drives the dials; off, the pad and its routes write nothing and the dials are the hand's |
| the pad | the corners laid out as it is: C D over A B. Each dial blends in its own map: a **log** dial geometrically, a **linear** one arithmetically, a **stepped** one (step 1, an integer map, a mask) takes the corner of largest weight. A missing corner takes the nearest assigned one, so two corners on an edge are a fader and one is a constant |

The morph writes the dials' **bases** (a routed dial's route rides on top), on the one frame after the pad or its corners moved; a still pad writes nothing, and a hand on a dial wins until the pad next moves. **X and Y are targets** (`xy.morphx`, `xy.morphy`: AUTOMATA's `morph.x` / `morph.y`), so an LFO can sweep the blend. Each window keeps its own bank, corners, ENGAGE and pad position.

`mir/panels/morph.js` is AUTOMATA's file as it was (`createMorph`, `blend`, `fillCorners`, `snapshot`, `recallValues`, `loadBank`, `saveBank`, `morphPart`, `dialsOf`, `kindOf`), with one widening: `dialsOf` takes a parameter list as well as a law, and a record's own `name`.

## Project and history

- **Project:** a part named `part` (default the card's id, `xy`): `{ v: 1, mode, pair, spring, set, route: [x, y], banks: { windowId: bank } }`. Restored as it stands: the morph's pad position is not a move (the dials ride in their own windows' parts), and ROUTE's position puts the macros where nothing else drives them. `project: false` when the app's own part carries it.
- **History:** pass `history`: the same state is one snapshot domain, so a gesture on the card is one row named `CONTROL · WINDOW` by the kit's gesture names. A PAIR drag or a MORPH blend changes the **app's** numbers: those rows belong to the app's own domains.
- **Idle costs nothing:** no timer, no poller. The pad repaints on the app's notice, on the modulation's tick while a route drives what it shows, and on the frame after a hand moved it.

## The API

```
createXYPanel({ rack | parent, mod, pairs, morph, subscribe, history, project, part, id = 'xy', title = 'XY', side = 'right', open, glyph = 'xy', hint, action, modPrefix = id, spec })
  → { id, part, spec, root, macros: { x, y }, targets: { route: [x, y], morph: [x, y] },
      mode(), setMode('pair' | 'route' | 'morph'), modes(), pair(), setPair(i), sets(), set(), setSet(id),
      route() → { x, y, hand: [x, y] }, morph() → { set, engaged, x, y, bank },
      store(slot?), recall(slot), storeOnCorner(c), assign(c, slot), engage(on),
      capture(), restore(state), sync(), params(), view(), destroy() }
Pure: MODES, TRAIL, HOLD_MS, resolveRef(ref, list), morphSets(params, ownPrefix), readXY(raw)
```

## What an app deletes

| App | Deletes | Keeps |
|---|---|---|
| **AUTOMATA** | `lab/morph.js` (105, now `mir/panels/morph.js`); in `lab/main.js` the MORPH window's body `buildMorph` 685–711 but its SCENES line, the bank's functions 1505–1562 (`MORPH_LINE` … `paintMorphHint`), `paintPad` with its two guards 1563–1570 and `morphTick` 236–243 (the panel's frame step); `lab/automata.css` 264–290 (`.mp-*`) | the WEDGE's Shift-click into MORPH (a cell's whole world into the bank: the panel has no door for a snapshot it did not take yet), SCENES (`pf.buildScenes`, reading the bank), its project wiring of the part (`project: false` if its own part keeps `morph`), the regime label in a snapshot (`afterMorph`) |
| **BASINS · SOLEIL · NEBULA · POLAR · EARTH** | nothing: none of them has a pad today (census §3); each gains the window by naming its pairs (BASINS PAN X/Y; SOLEIL PAN, LENS X/Y; NEBULA Re c/Im c, SOURCE Re/Im; POLAR YAW/PITCH, β θ/φ; EARTH probe lat/lon) | their knobs |

## Where it is

`mir/panels/xy.js` (the panel), `mir/panels/morph.js` (AUTOMATA's morph), `mir/panels/xy.css` (layer `mir.kit.house`, tokens `--xy-*`). Tests: `tests/panel-xy.node.mjs` (AUTOMATA's morph laws on three dial sets; the panel's pure parts) and `tests/panel-xy.browser.mjs` (real input hit-tested by `elementFromPoint`: PAIR moves two knobs and is one history row; ROUTE's grip routes onto a knob and the pad moves it; MORPH stores two corners by Shift-click and by a hold, ENGAGE, and a drag blends a log, a linear and a stepped dial each in its own map; the project part).
