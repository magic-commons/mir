# MIR · CONTROLS — which control do I use?

The kit prescribes **one control for each kind of value**. This page is the table, the rule behind each row (with whose rule it is), and the API of every control. The colour family (arc, swatch, lane slider, chip strip, sortable list) has its own page, `docs/CONTROLS-COLOUR.md`; its rules are in the table here. Every control is drawn live, dark and light, with its rule beside it, on `gallery/controls.html` (`?pair` shows both themes side by side).

Josh, 2026-10-02: *"Just try to let the UI be as adaptable as possible by having a diverse set of knobs with specific cases and rules. Like a coherent design language. Arcs that show color can primarily be used for color and knobs are for all parameters, and things with a unique parameter (like Basins color frequency) those are sliders … Perhaps buttons that are toggles need the light indicator, or other cases where it shouldn't have one."*

Source tags: **J** is Josh's own rule · **B** BASINS draws it so · **R** a reading of the orchestrator's, shown on the gallery page for Josh to overrule · *kit* already existed.

## The table

| Kind of value | The control | Source |
|---|---|---|
| A hue, or any cyclic value drawn in its own colour (a colour's phase) | **ARC KNOB**: no body, an SVG ring with round caps in the colour it names | J, B |
| A colour amount inside a coloured lane (that colour's opacity) | arc in the lane's ink | B |
| An angle, bounded or wrapped (rotation, a light's angle) | arc in the accent | INTENT rule 2, B |
| A colour the user picks | **HUE SWATCH**: tap = the platform's chooser, drag 8 px = turn the hue | B |
| A colour amount in a global grade (exposure, saturation, brightness) | solid **KNOB** | J ("the ol' regular knobs") |
| Any ordinary continuous parameter | **KNOB**: one drag law | J |
| A plain scalar on a straight horizontal track, with no lane ink | **FADER** (`fader()`, `kit.js`): the lane slider's plain base, the same hand law, a modulation target | kit |
| A thing's one principal parameter (a colour's FREQUENCY, a lane's gain, a layer's opacity) | **LANE SLIDER**: a long pill in the thing's ink, glowing thumb, a modulation target natively | J, B |
| A coupled pair (pan x/y, a point in a plane, az/el) | **XY PAD** for the hand + its two knobs, which stay the modulation targets | J (the control), AUTOMATA's contract |
| A 3-D direction (a camera's yaw and pitch, a light's az/el) | **DIRECTION SPHERE** (`directionSphere`, `mir/panels/camera.js`): the plane model's sphere, the arrow's tip follows the finger, + its two arcs, which stay the modulation targets; the XY pad stays the control for a flat pair | R (1.5.0-alpha.14, the CAMERA panel: for Josh to rule) |
| A lo/hi range | **RANGE SLIDER**: one track, two thumbs | R |
| An unbounded turn | jog wheel (`knob({ onDelta })`) | kit |
| A state that stays on | **SWITCH with a lamp** | J |
| No lamp when: the glyph itself is the state (power, eye, play/pause, invert: `sw({ glyph })`); a lane's dot is itself the lamp, in the lane's ink; an opener whose open window is the evidence (`latch()`); a chosen segment (its frost face says it) | no lamp | R |
| A momentary action | **TRIGGER**, never a lamp | INTENT O5 |
| One of 2–4 modes, all visible | **SEGMENT** | R |
| One of 5 or more modes, in order (blend modes, looks) | **STEPPER / PAGE TURNER** `‹ NAME ›`; a tap on the name opens the full list | J (the control), R (the threshold) |
| A long list of data (bands, ports, files) | **SELECT** (the kit's own, never a native one) | R |
| A typed number | **NUMBER FIELD**: drag + type + keys (the tempo field's law) | B |
| A transfer curve | **CURVES** (the CURVES panel, `docs/PANEL-CURVES.md`) | J |
| A list the user builds (colours, layers) | **SORTABLE LIST**: dot grip (drag and arrows), armed × (tap twice), + ADD at the foot that dims at the cap | B |
| A window's verbs | **CHIPS** on the rail | J |

Not changed by this table: VIVID and the accent's BRIGHTNESS stay arcs (BASINS draws them so; they are the accent's own colour). The thin RANGE bar on plain knobs is not built (a question to Josh).

**One build of each.** The census found three arc builds, five steppers, four blend-mode controls, three power drawings and three knob drag laws. The kit has one of each now; its own private copies (the GUI's stepper, the modulation window's and the transport's drag laws and inline arcs) use it.

## Or describe it once: `control(descriptor)`

An app describes a parameter once and gets the right control and a modulation target. NEBULA wrote this rule for itself (`lab/main.js:128`); it is the table as code. The first row that fits wins:

| The descriptor says | You get |
|---|---|
| `type: 'boolean'`, or a boolean `value` | `sw` (a lamp; `lamp: false` for the cases above) |
| `colour: true` | `hueSwatch` |
| `pair: [axisX, axisY]` | `xyPad` |
| `type: 'range'`, or `value: [lo, hi]` | `rangeSlider` |
| `options`, 1–4, every label under 26 characters | `seg` |
| `options`, 5 or more, in order | `stepper` |
| `options` with `list: true` or `ordered: false`, over 16, or a long label | `select` |
| finite `min`/`max` with `wrap`, `cyclic`, `hue` or `angle` | `arcKnob` |
| finite `min`/`max` with `principal: true` | `laneSlider` |
| finite `min`/`max` | `knob` |
| anything else | `number` |

```js
import { control } from './mir/kit.js';
const c = control({ id: 'warp.gain', label: 'GAIN', min: 0, max: 1, value: 0.5, get: () => engine.gain, set: (v) => { engine.gain = v; } });
rack.append(c.root);                         // c.kind === 'knob'
installModulation({ params: c.params() });   // one record per target: { id, label, min, max, step, map, get, set, widget }
```

`control(d)` → `{ kind, root, widget, targets, get(), set(v), desc, params() }`. `targets` are the widgets a macro may route onto (a knob, arc or lane: one; the pad's two knobs; the range's two thumbs; the rest none). `controlKind(d)` is the pure choice. `get`/`set` on the descriptor are the app's own road to the value; `onInput`/`onChange` also fire.

## The one knob law

Every control that is turned or dragged answers the same hand (`kit.js`; `setKnobLaw()` retunes it):

| | |
|---|---|
| **The drag is vertical** | a full scale is 220 px of rise (320 under a finger); sideways motion is ignored. `knob({ dragAxis: 'sum' })` keeps the 1.4 law for an app that has not moved |
| **The fine gear is ⅛** | **any modifier** (Shift, Alt, Ctrl, Meta) **or a second finger put down while one drags**. It runs on a virtual point, so engaging or leaving it moves nothing. Josh: *"currently holding shift gives a 1/4 fine tuning, can we make this 1/8?"* (it was 900/220 on a knob and ⅕ on a fader) |
| **Double-tap is home** | two presses within 320 ms; a double-click does the same. The arrow keys are 1/100 of travel, Shift an eighth of that, Page ten times, Home and End the ends, Delete home |
| **The gesture belongs to the pointer that started it** | a second finger is the gear, not a second drag |

Exports for a control the kit did not build: `fineHeld(event, pointerId)`, `gearOf(event, pointerId, fine?)`, `watchTouches()`, `verticalDrag(downEvent, { travel, fine, touchTravel, axis }) → { move(e) → travel so far, gear }` and `dragTravel(event)` (220 · 320 · 1760). The arc knob, the swatch, the lane slider, the number field and the XY pad all stand on these.

`knob.dragging()` says whether a hand is on it. (The knob's warn / clamped states, `knob.setState`, are removed in 1.5.0-alpha.18: nothing used them.)

## The lamp rules

| | |
|---|---|
| `sw({ label, value, onChange })` | wears the lamp: the frost face, a thin rim, the LED in accent A with its glow |
| `sw({ …, lamp: false })` | no LED; ON is the frost face and the label in accent A, as a trigger's is. For the listed cases only |
| `trig({ … })` | a momentary action: **never a lamp**. A trigger used as a state (`.on`) lights its label and face only |
| `latch()` (`shell/transport.js`) | a window opener, lit while its window is open |
| `sw({ …, glyph: 'invertColors' })` | the glyph is the state (power, an eye, invert): a 44 px round target with no face, no lamp and no word (the label is its accessible name); the owner shows ON in the glyph (GRADE turns INVERT's over). A window's own power and the transport's play stay chrome buttons |

## The controls

### `stepper({ label, aria, items, value, onChange, wrap, list, pager, count, compact, cls })`
`‹ NAME ›`: two round 44 px buttons around a live name (`aria-live`); the arrows wrap and skip a `coming` item and stand down when nothing else can be reached; ← → on the row; on the name ↑ ↓ step and Alt+↓ opens the list, as on a closed select (one law for ↑ ↓ on a closed list). **A tap on the name opens the full list** in the kit's menu pane (`list: false` turns that off). `pager: true` is the page turner (BASINS' rack-card pager: the name is a label, no list; `count: true` adds `n / N`). `compact: true` leaves the two arrows out of the DOM (a strip a finger wide): the name opens the list and ← → still step it. `items: [{ id, label, vars?, coming? }]`; `onChange(id, dir)` with `dir` −1, +1, or 0 for a pick from the list. → `{ root, prev, next, name, get, set, setItems(items, id), step(d), open(), close(), destroy() }`. The GUI's SKIN, TONE and page turner are this (`gui.js` re-exports it as `stepper`). **The name's seat is its longest option** (THE HAND, 1.5.0-alpha.19): every option's word sits unseen in the name's one grid cell (`.mir-step-seat`, drawn by CSS from `data-w`, so it is not the name's text), made when the stepper is built and again on `setItems` and on a language change; `6em` stays the floor. So ‹ and › never move as the name changes; a name that fills its row (lanes, ramp, the list pane) still shrinks and ellipsises.

### `select({ label, aria, items, value, onChange, placeholder, cls })` and `listPane(…)`
The kit's own choose-one for a long list of data. A button on the well opens **the menu pane** (`.glass[data-mir-surface="menu"]` on the body: the card style's material, the menu height, 44 px rows, scrolls inside the viewport, below the button or above when there is no room). Closes on an outside press, Escape, a resize or the page losing focus. Keys in the list: ↑ ↓ Home End, a typed letter, Enter picks, Escape closes and returns the focus; on the closed button ↑ ↓ step like a platform select, Alt+↓ opens. `listPane({ anchor, items, value, onPick, onClose, label })` is the pane alone, for any host. → `{ root, button, get, set, setItems, open, close, isOpen, setDisabled, destroy }`.

### `number({ label, aria, min, max, value, step, digits, fmt, parse, unit, chars, range, drag, onInput, onChange })`
The tempo field's law, for every typed number. **Drag** on the number (the knob law: the whole range in 220 px; a range-less number moves 100 steps per travel; `range` overrides). **Click**, or Enter on the face, opens the field with the number selected; Enter or leaving takes it, Escape does not (the focus returns to the face); a comma is a point; 8 characters. **Keys** on the face: ↑ → and ↓ ← one `step`, Shift an eighth of it, Page ten, Home/End the range's ends, Delete home. `bindNumber({ button, input, model, parse, enabled, drag, click, paint, chars, step, range, signal })` is that behaviour on a button and input you already have (`model` is `{ get, set, commit?, min?, max? }`: createTempo's, as it is). Pure: `numberTravel`, `parseNumber`, `digitsOf`.

### `rangeSlider({ label, aria, min, max, lo, hi, step, log, fmt, minGap, onInput, onChange })`
One track, two thumbs that never cross (each stops at the other, less `minGap`). A press on the track brings the nearest thumb; two thumbs on one spot: the first move chooses; ⅛ gear and double-tap home as the law says; keys on a thumb: one step (or 1/100), Page ten, Home/End its bounds. **Each thumb is a modulation target** with the knob's widget contract (`root, get, set, show, shown, setBase, setDisabled, setDefault, paint`): a routed thumb paints the modulated value over the base, shows the base as a tick and wears an accent-B ring. → `{ root, lo, hi, get() → [lo, hi], set(lo, hi), setDisabled, destroy }`. Thumb roots are `.rng-t` (`data-param` goes there).

### `xyPad({ label, aria, x, y, home, tags, onInput, onChange })`
AUTOMATA's contract: **a pad for the hand and its two knobs, which stay the modulation targets.** `x` and `y` are `knob()` options for each axis. The pad **paints from the knobs** (the base, or the modulated value a route shows), so a routed pair moves the dot (accent B) and the hand's base stays a ring. A press brings the dot to the pointer (under the gear nothing jumps), ⅛ fine, a double-tap or Home centres (`home`, default the middle), arrows nudge (Shift ⅛, Page ten). `tags: { bl, br, tl, tr }` are corner words. → `{ root, pad, x, y, get() → [x, y], set(x, y), setDisabled, paint, destroy }`; register `x` and `y` as targets.

## What an app deletes

| Today | Becomes |
|---|---|
| BASINS' `colour-window.js` blend stepper (`:202`), SAVE pager (`gallery.js:187`); λWAVES' `‹ select ›` (`paletteview.js:57`) and transport step (`rack.js:2957`) | `stepper()` |
| NEBULA's native range / select / `type=number` factory fallbacks; AUTOMATA's WEDGE number inputs and 12-blend / LOOK / MIDI-port segs; the modulation window's route-amount `type=number` and native route `<select>` | `number()`, `select()`, `stepper()` |
| AUTOMATA's XY pad (`main.js:691–703`, `automata.css:278–290`) | `xyPad()` |
| AUTOMATA's LO/HI, EARTH's RANGE LO/HI, NEBULA's BLACK/WHITE as pairs of knobs | `rangeSlider()` |
| BASINS' tempo editor and the kit's `bindTempoField` body | `bindNumber()` |
| Every app's own knob drag / Shift law; the macro seat's own slider law | the one law (`verticalDrag`, `fineHeld`) |
| A switch whose LED an app hides with CSS (EARTH's M) | `sw({ lamp: false })` |
| NEBULA's `control()` (`main.js:128–161`) | `control(descriptor)` |

## Where it is

`mir/controls/` (`stepper.js`, `select.js`, `number.js`, `range.js`, `xy.js`, `factory.js`, `controls.css`; the colour family beside them), all re-exported from `mir/kit.js`; the law and the lamp are in `mir/kit.js`. Tests: `tests/controls.node.mjs` (the pure parts) and `tests/controls.browser.mjs` (real input, hit-tested: the gear by Shift, Alt, mid-drag and a second finger; the stepper and its list; the select; the number field; both range thumbs; the pad; a real macro route; `control()` for ten descriptors).
