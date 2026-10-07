# MIR · the colour controls

Five parts for anything an app colours: the **arc** (a hue, a phase, an angle: a ring in its own ink), the **hue swatch** (a colour the user picks), the **lane slider** (a thing's one principal parameter, in that thing's ink), the **static chip strip** (the rail's round discs, in the flow) and the **sortable list** (a stack of panes the user builds: colours, layers, bands). They are in `mir/controls/`; the page that shows them is `gallery/colour-controls.html`. The rule for which control a value gets is `docs/CONTROLS.md`; this page is how these five work.

Josh, 2026-10-02: "Arcs that show color can primarily be used for color and knobs are for all parameters, and things with a unique parameter; (Like Basins color frequency) those are sliders." · "Color knobs needs to be rounded and less pixelated."

They were BASINS' colour window's hand (`colour-controls.js`, `arc-ring.js`, `colour.css`). Every drawing, size, timing and word is BASINS'; its names became options and its sheet became a kit layer.

## Using them

```html
<link rel="stylesheet" href="mir/mir.css">          <!-- or mir/controls/colour-controls.css after the kit's sheets -->
```
```js
import { arcKnob, hueSwatch, laneSlider, laneInk, chipStrip, sortableList } from './mir/controls/…';   // one import each, or from kit.js
const hue = arcKnob({ label: 'HUE', min: 0, max: 360, wrap: true, value: 210, home: 210, ink: (v) => `hsl(${v} 85% 62%)`, onInput: (v) => app.hue = v });
const lane = document.querySelector('.my-lane');   // a lane's root: its colour is --lane-ink
laneInk(lane, 'rgb(240 90 60)');
lane.append(hueSwatch({ rgb: [.94, .35, .24], onInput: (rgb) => laneInk(lane, rgbCss(rgb)) }).root,
            laneSlider({ label: 'FREQ', min: .25, max: 8, log: true, value: 1, home: 1 }).root);
```
Each of the arc knob and the lane slider is a **modulation target exactly as `knob()` and `fader()` are**: hand it to `installModulation({ params: [{ …, widget }] })` and a route onto it moves it, shows the live value and draws the modulation window's range ring or bar. Nothing else is needed (NEBULA's native range and SOLEIL's invisible knob overlay are not needed).

## The colour of a lane: `--lane-ink`

A lane is any element that wears class `mir-lane` (the sortable list's panes do). Its colour is the custom property `--lane-ink`: set it with `laneInk(node, css)`, or an arc's `ink` option sets it on that arc. Everything in this folder that draws in a colour reads `--lane-ink`, then the swatch's own colour, then the accent: the arc's ring, the pill's fill and thumb, the swatch's ring (no control glows in it: Josh, 2026-10-07). A lane's ink is never `--ink`, so the adaptive ink never repaints it.

## The arc

| | |
|---|---|
| `arcRing(parent, { from = 0, span = 360 })` → `{ svg, set(turn) }` | the ring alone: a track `span` degrees long starting `from` degrees clockwise from the top, and a value ring `turn` degrees of it. Vector strokes with round caps (no masked conic, so no hard pixel edge). One build: the GUI's accent dials, the transport and the modulation window draw their arcs with it |
| `arcKnob(o)` → the kit's `knob()` plus `{ law, home, paintArc(), arc(), gesture(), dragging(), destroy() }` | every `knob()` option, and the same widget contract (`root get set show shown setBase setDisabled paint setDefault`), so DOM, ARIA and keyboard (arrows, Page, Home/End, Delete) are the kit's |
| `law: 'vertical'` (default) | `p = p0 − g·dy / travel`; the horizontal part of the drag is ignored. Bounded arcs have the 60° gap at the bottom (a 300° sweep); `wrap: true` is the whole ring |
| `law: 'angular'` | a free dial (a phase, a hue): the angle about the dial's centre, the shortest way round the ±π seam, a 7 px dead hub, and **farther from the hub is finer**, decided once at the press: `gain = dist > 34 ? max(.15, 34 / dist) : 1`. One turn of the hand is one turn of the value. (A 34 px dial is all inside 34 px: the gain only differs on a bigger dial) |
| `home` | where a double-tap, a double-click and Delete go: the engine's own value, not the one the knob was built with |
| `ink` | a CSS colour or `(base) → colour` |
| `size: 'sm'` | the lane's arc: a 22 px dial and no label (the title and the value chip name it) |
| `onPress(event)` | a hook the host runs on every press the arc takes, after the press has been forwarded (a modulation host selects the macro here: `api.selectForTarget`) |
| `live()` | → the modulated value now, or `null`: read when the hand lets go so a routed dial shows its live value at once |

A routed arc keeps the **base** the hand owns as its ring and rides the **live** value as a small dot (`.k-live`); the host's raised puck and accent ring are not drawn on it (an arc has no body).

## The hue swatch

`hueSwatch({ rgb, label, title, onInput(rgb), onChange(), fine })` → `{ root, button, input, arc, set(rgb), get(), dragging(), destroy() }`; `rgb` is `[r, g, b]` in 0 to 1. A circle of the colour with a 1 px rim and a hue ring round it (no glow in its colour: Josh, 2026-10-07). **Tap**: the platform's colour chooser (a transparent `<input type=color>` is laid over the circle, so the platform opens its own inside the gesture). **Press and drag 8 px or more up or down**: the hue turns, `h = h0 + (−dy / 220)·360`, saturation and value kept (a grey is given full saturation so the turn shows). The click a drag ends in opens nothing. `onInput` runs on every change (the chooser's and the drag's), `onChange` once per drag and once per chooser close. Pure helpers: `rgbToHsv`, `hsvToRgb`, `rgbCss`.

## The lane slider

`laneSlider({ home, value, orient: 'h' | 'v', ink, …every fader() option })` → the kit's `fader()` plus `{ home, orient }`. A long pill (a 6 px track, a 15 px thumb of the same ink, no glow) in the lane's ink; `orient: 'v'` stands it up with the top as the maximum. `log: true` is a log scale. It is the kit's own fader with the lane's skin, so a route onto it moves the thumb and the modulation window draws its RANGE bar (the 2 px line and the live dot) along the pill, either way up.

The hand is taken in capture, for both orientations, so there is one law: **a press jumps the value to where it came down**, then the drag follows on a *virtual point*; any modifier or a second finger gears it down by the kit's fine divisor and engaging the gear moves nothing; **two presses within 300 ms and 14 px come home** (the kit fader's own double-tap resets before the press's absolute map writes the press over the reset). The press is forwarded to the page, and `pointercancel`, lost capture, Escape and a hidden page end the drag and put the value back.

## The static chip strip

`chipStrip({ id, title, chips, onChip, onGrip, onKey, glyphSize = 20, flow = 'column' | 'row', material })` → `{ el, grip, chip(name), setChip(name, state), state(name), setDisabled(name, on), destroy() }`.

The rail's round discs (`.mir-chip`: the same faces, the same ladder of card styles, the same chip table) in the flow beside a lane or a pane. `createRail` is fixed-position and its grip moves a window; this strip is a toolbar in the document and moves nothing. The discs are 44 px targets round 36 px faces (`--chipstrip-target`, `--chipstrip-disc`). `chips` are `window/rail.js`'s specs (`{ name, kind: close | action | toggle | radio | cycle | grip, label, hint, glyph | text, states, state }`), with one more key: **`confirm: { text = 'sure?', ms = 2600, label }`** makes a chip *armed to fire*: the first press arms it (its ink becomes `text` in the warning colour for `ms`), the second within `ms` calls `onChip`. A disarmed chip is back on its glyph. `onGrip(pointerdown)` is the grip's press; the strip never moves anything: wire `core/pointer.js` `drag(strip.grip, …)` to it. `onKey(name, keydown)` is a chip's key.

## The sortable list

`sortableList({ items, build, onMove, onRemove, onAdd, cap = 8, min = 1, noun = 'item', addLabel = '+ ADD', side = 'auto', armMs, material, axis = 'y' })` → `{ root, rows, add(), items(), setItems(items), rebuild(), move(id, to), remove(id), nodeOf(id), stripOf(id), count(), destroy() }`.

One pane per item (`data-mir-surface="island"`, so CARD STYLE and FROST paint it as a window's body card), a grip over an armed × on a chip strip beside it, and a centred `+ ADD` pill at the foot. The pill is drawn as BASINS' COLOUR window draws it: the look's corner (`--surface-radius`) and, because it floats outside the panes, their material: the TINTED fill (`--frost-opacity` under FROST) and FROST's filter (none while frost holds); its relief stays the trigger's raise (BASINS gives it the pane's float shadow, which INTENT forbids on a button). The rows stand 5 px (`--list-foot-gap`) and the islands' gap above it. A `stepper` inside an item's pane is BASINS' blend: it spans the pane, its name is the micro size in the key ink, and its arrows are 44 px squares in the small corner with a 22 px glyph (`--list-step-glyph`). `axis: 'x'` (1.5.0-alpha.14) lays the items side by side as strips: one island pane holds them all, each item's chip strip sits under it whatever the rack's side, the drag runs along x and ← → move an item (flipped under `direction: rtl`; ↑ ↓ still work). The LANES panel's strips are this.

| | |
|---|---|
| `items` | `[{ id, … }]` the app's records; `build(item, index, pane)` returns the pane's content (a node, or `{ el, destroy() }`) |
| the grip | a drag reorders: the row follows the hand by transform and the rows it passes glide out of its way, **nothing is re-parented mid-drag** (a re-parented element loses its pointer capture) and the drop commits once; Escape or a cancel puts the list back. Arrow Up/Down move the item, Home/End send it to an end, and the focus stays on the grip |
| `onMove(id, to)` | `false` refuses and the list goes back |
| the × | the first tap arms it ("sure?", 2.6 s), the second removes; it is disabled while the list holds `min` items. `onRemove(id)` returning `false` refuses |
| `+ ADD` | `onAdd()` returns the new item (appended); it **dims at `cap`** and its hint says `n of cap` |
| `side` | `'auto'`: the chips on the rack's OUTER edge: right of the pane on the right rack and in a floating window, left on the left rack and on a phone; `'left'` / `'right'` force it. The rack is read by `[data-mir-rack][data-side]`, which an app's adopted rack carries too (BASINS' `#rackL`) |

## The laws they keep

| Law | Where |
|---|---|
| **One hand law.** The fine divisor, the travels and "any modifier or a second finger" are read from the kit's `setKnobLaw()` (`controls/gesture.js`); the three controls never carry a number of their own for them | arc, swatch, slider |
| **A gesture belongs to its pointer and ends one of two ways**: the pointer lets go (the last sample is flushed first), or it is cancelled (`pointercancel`, lost capture, Escape, a hidden page) and the value goes back | arc, swatch, slider, list |
| **Every press is forwarded**, so a menu or a pinned ⓘ still closes on a press a control took | arc, slider |
| **One frame**: writes go through `core/frame.js` (the latest sample wins, one per display frame, the release flushes) | all |
| **Cascade layers**: one sheet in `mir.kit.plugin.host` (above the house, level with the modulation host whose has-ring rules the arc beats), no `!important`, no `:root` ladders | `colour-controls.css` |
| **Tokens**: every look value is a token declared on its component's root; the rules read names | `colour-controls.css`, `docs/TOKENS.md` |
| **Focus is an accent ring outside** (the arc's and the pill's are the kit's); the swatch's keyboard focus is BASINS' 1 px hairline in its own colour, 5 px out, and the swatch carries no hint of its own (Josh, 2026-10-07, call 16) | INTENT |

## What an app deletes

BASINS: `colour-controls.js` (343 lines) and `arc-ring.js` (17) whole; about 95 of `colour.css`'s 150 lines (the arc, the lane's arcs, the pill, the swatch, the chips, the rows' grid, + ADD); about 70 lines of `colour-window.js` (`wireGrip`, `wireClose`, the chip builders, the add-row bookkeeping, `rebuild`'s disabled marks). SOLEIL's and NEBULA's lane faders and their native-range / overlay workarounds; the three conic-arc builds (the GUI's `.accent-dial`, NEBULA's `.k` arc, SOLEIL's `.lane .k`).

## Limits to know

- An arc takes the press in capture and stops it for the kit's own knob, so a listener on the dial in the bubble phase would miss it; the modulation window's **hold-for-the-route-pop-over** and its **select-the-macro-on-press** run on an arc as on any dial: the modulation window hears both on the host in the capture phase (1.5.0-alpha.13). A host of your own can still select the macro from the arc's `onPress`.
- The kit's hover lift (a 1 px translate of every dial) applies to an arc as BASINS draws it.
- The angular law differs from the vertical one only on a dial bigger than 34 px.
