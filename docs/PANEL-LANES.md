# MIR · the LANES panel

A list of lanes, where every lane is **a colour, one principal amount, a blend and a mute**, as a rack window. An app describes its lanes as data and hands over four verbs; the kit draws the list, the strips, the grips, the armed ×, the + ADD, the solo and the mute dots, makes every amount a modulation target, saves the lanes in the project and puts each gesture in the history.

Josh: *"Lambdawaves has a palette system while Basins has an 'add a color' system. Nebula has an 'AGE' system, and Automata has its own complex coloring."* Those systems stay each app's: what a lane **means** (BASINS' fold order, NEBULA's strata, SOLEIL's bands, EARTH's units) is the app's. What they are **built from** was one list, four times. This is it. Live, with three made-up lane sets: `gallery/panel-lanes.html`.

| | |
|---|---|
| `mir/panels/lanes.js`, `lanes.css` | the panel (a kit layer; load `lanes.css` after the colour controls' sheet) |
| `createLanesPanel({ rack, lanes, layout })` | a rack card (or `parent: node` for the same rows anywhere) |
| `createLanesView(parent, options)` | the rows, built now (a FOLDERS panel, a floating window) |
| tests | `tests/panel-lanes.node.mjs` (the pure parts), `tests/panel-lanes.browser.mjs` (real input) |

## Using it

```js
import { createLanesPanel } from './mir/panels/lanes.js';

const colours = {                                        // the port: what the app says about its lanes
  list: () => palette.entries().map((e) => ({
    id: e.id, colour: 'swatch',
    principal: { key: 'freq', label: 'FREQ', min: .02, max: 50, log: true, home: 1, fmt: (v) => v.toFixed(3) + '×' },
    extras: [{ key: 'phase', label: 'PHASE', min: 0, max: 1, wrap: true, home: 0 }, { key: 'opacity', label: 'OPACITY', min: 0, max: 1, home: 1 }],
    blend: ['ADD', 'SCREEN', 'MULTIPLY', 'OVERLAY', 'SOFT', 'HARD'] })),
  get: (id, key) => palette.get(id)[key],      set: (id, key, v) => palette.set(id, key, v),
  add: () => palette.add().id,                  remove: (id) => palette.remove(id),      move: (id, to) => palette.move(id, to),
  subscribe: (fn) => palette.onChange(fn),                                  // fn() whenever anything changed; nothing is polled
  cap: 8, min: 1 };

createLanesPanel({ rack, lanes: colours, layout: 'rows', noun: 'colour', idRoot: 'colour', mod: app.mod, history: app.history, project: false });
```

The panel is a rack card (`rack.register`: it docks, floats, folds, powers, saves its place and wears the look the user chose). It is built the first time it opens.

## The lane

`port.list()` returns the lanes in order. A lane is a record of **data**; every key but `id` is optional.

| Key | What it is |
|---|---|
| `id` | the lane's name to the app (a string or a number; the panel turns it into a modulation id) |
| `label` | the lane's name on its head (SOLEIL's `FE II 171`, EARTH's `SST`); without one the head says `colour 3` and shows only when the lane is folded |
| `colour` | `'swatch'`: BASINS' hue swatch (key `colour`, `[r, g, b]` 0..1) · `'hue'`: NEBULA's hue arc (key `hue`; `hue: { min, max, home, wrap, fmt, law }`) · `'chip'`: a display disc only, EARTH's layer swatch (`fill`: a CSS colour or gradient) |
| `ink` | the lane's colour as CSS, or `() → CSS`, when the app knows better than the swatch or the arc (NEBULA's strata colours come from the engine). Absent: the swatch's or the arc's own colour, else the accent |
| `principal` | the lane's **one** amount: `{ key, label, min, max, home, log, fmt, unit, hint }`. A lane slider in the lane's ink: horizontal on a row, vertical on a strip |
| `extras` | more amounts, as arcs in the lane's ink: `[{ key, label, min, max, home, wrap, log, fmt, unit, hint }]` (BASINS' PHASE and OPACITY) |
| `blend` | the modes, `[{ id, label }]` or `['ADD', …]`: a stepper `‹ NAME ›` (key `blend`); a tap on the name opens the full list |
| `mute` | `true`: the lane's own dot, in its ink, is the lamp (key `mute`; `true` = silenced) |
| `solo` | `true`: an S on the lane (below) |
| `active` | `false`: dimmed (NEBULA's lanes past the count) |

The port's verbs: `get(id, key)`, `set(id, key, value)`, `add()` (returns the new lane's id or record, or nothing to refuse), `remove(id)` and `move(id, to)` (either returning `false` refuses), `subscribe(fn)` → off, and optionally `cap` / `min` (8 and 1 by default; `fixed: true` fixes the list as it stands), `commit(id, key)` (a gesture ended: persist, BASINS' `persistPalette`), `snapshot()` and `restore(s)` (the panel's own are by position).

## Two layouts, one lane

| | `layout: 'rows'` | `layout: 'strips'` |
|---|---|---|
| source | BASINS' colour window (`colour-window.js`, `colour.css`) | NEBULA's AGE strip (`N/main.js:250–305`) and SOLEIL's lanes (`S/sol.css:23–65`) |
| a lane | a pane of its own (the card's island): the swatch and the FREQ pill across row one, the arcs and the blend on row two, 44 px rows | stood up: hue arc, blend name, a vertical slider, the mute dot, the solo, the name; side by side in one pane |
| the chips | the grip over the armed × on the **outer** edge of the rack (right of the pane on the right rack and in a floating window, left on the left rack and on a phone) | a small chip strip under each strip (grip over ×) |
| reorder | drag the grip (the row follows the hand, the others glide aside, the drop commits once) · ↑ ↓ Home End on the grip | drag the grip along the strip · ← → Home End on the grip |
| + ADD | a centred pill at the foot that dims at the cap | the same |

The mute dot is the lane's own lamp (a hollow ring when out, filled and glowing in the lane's ink when in), so it has no second lamp. A muted lane wears the faint ink.

## Every amount is a modulation target

With `mod` (the result of `installModulation`), each continuous control — the principal, every extra, the hue arc — is a target `<idRoot>.<lane>.<key>` (`idRoot` is `lanes` by default; the lane id is made a registry segment: `Colour-3` → `colour3`, `3` → `l3`). Targets are added with the lane, removed with it, and survive a rebuild (the registry keeps its routes). The app lists the root once: `installModulation({ roots: ['colour'], … })`. A hand on a routed control writes the base (`mod.hand`); an unrouted one writes the port. The modulation window names a target `COLOUR 2 · FREQ` and renames it when the lane moves. Without `mod`, `api.params()` gives the records for your own `installModulation({ params })`.

## Solo (SOLEIL's law)

| | |
|---|---|
| a **click** on a lane's S | latches: that lane is on, every other lane is muted, and what was on is remembered once |
| the same S again | lifts it: every lane is exactly as it was (a lane the user had muted stays muted) |
| another lane's S | moves the latch and keeps the first memory |
| a **hold** of 250 ms | a **peek**: the lane alone while the finger is down; on lift exactly what was on comes back; never a state, and the click that ends a hold latches nothing |

`api.solo(id)`, `api.peek(id, on)` and `api.soloOf()` are there for keys (SOLEIL's Shift-1…0). The solo works on the port's `mute`; a latch whose lane is removed is dropped.

## Touch protection

Josh, 09-12: *"I keep accidentally touching the colors while zooming on touchscreen … I also too keep deleting the colors on accident."*

| | |
|---|---|
| the × | always armed: the first tap says `sure?`, the second removes, it disarms by itself after 2.6 s, and the last lane cannot go |
| the fold | on a coarse pointer (`fold: 'auto'`; `fold: true` on any) each lane's arcs and blend sit behind a 44 px chevron on its head; one tap opens that lane and no other. The slider and the dot stay in reach |
| the picture | a press that began on the picture never reaches a lane: the scene guard (`shell/scene-guard.js`, made by `createApp`) answers it; nothing here listens to the picture |

## In the project, in the history

- **Project:** a part named for the card (`lanes` by default): `{ lanes: [{ id, values: { colour, freq, … } }] }`, restored by position (surplus removed, missing added, order and every value put back). `project: false` when the app's own part already carries the lanes (BASINS' palette does).
- **History:** one domain of the same name; a drag, a key or a tap is **one row**, named for the control it began on by `history/gestures.js` (`OPACITY · colour 3 · COLOUR`; the window is left off when the control's own name already says it). Undo goes through `port.set` / `add` / `remove` / `move`.
- **Idle costs nothing:** the port notifies, the panel repaints once on the frame while the card is present and once when it becomes so. A hidden card is not repainted.

## What an app deletes

| App | File and lines | Becomes |
|---|---|---|
| BASINS | `colour-window.js` 124–260: `add`, `move`, `remove`, `wireGrip`, `wireClose`, `buildRow`, `rebuild`, `syncValues`, the palette-change listener (about 135 lines; ~70 of them already counted under the colour controls); `colour.css` 56–150 (counted there) | a port over `paletteEntries` / `addPaletteEntry` / `movePaletteEntry` / `removePaletteEntry` / `updatePaletteEntry` with `project: false` |
| NEBULA | `main.js` 247–305 (`buildAge`, 59 lines, with its native range, its dot and its select); `nebula.css` 34–63 (30) | a port over `ageHue` / `ageBlend` / `a<i>` / `muteAge`, `layout: 'strips'` |
| SOLEIL | `main.js` 895–921 (`laneRow`), 1247–1258 (`toggleSolo`, `audition`), 1403–1425 (`wireLaneDrag`); `sol.css` 23–65 (the lane, the dot, the invisible overlay that made the slider a target) | a port over its lanes and bands, `layout: 'strips'`, `solo: true` |
| EARTH | `cardkit.js` 198–215 (`buildRow`: swatch, M, S, opacity) | a port over its sublayers, `colour: 'chip'`, `mute`, `solo` |
| AUTOMATA | its meter rows (SEND) can be a lane list with `colour: 'chip'` and one principal | (not read in full) |

## Limits to know

- A lane's accessible name is built when the lane is: `OPACITY · colour 2`. After a reorder the number in the name is the old one until the lane is rebuilt (an add, a remove, or `setItems`).
- A routed arc grows to make room for the modulation window's range dial (54 px); on a strip eight across it overlaps its neighbour's margin.
- The strips' own sorter is a horizontal twin of `sortableList` (which only moves along y); it goes the day that list takes an axis (`ASKS.md`).
- The modulation window is rebuilt once per target on a lane's first appearance (`mod.add` rebuilds it each time).
