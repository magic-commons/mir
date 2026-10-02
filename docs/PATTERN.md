# PATTERN — the step sequencer for the modulation window's envelopes

The PATTERN window is FL Studio's channel rack for the ENV devices in the modulation window. Each ENV on the rack has one row of steps. A lit step fires its ENV when the transport crosses it, so an envelope becomes a hit that plays a rhythm. Every ENV shares the one window, and every row plays in time with the others.

It came from BASINS (`app/pattern-window.js`, `pattern-model.js`, `pattern-sequencer.js`, `pattern.css`), as Josh last tuned it on 2026-10-01. The behaviour, the sizes, the words and the gestures are BASINS'.

## Adding it to an app

```js
import { installModulation } from './mir/modulation/bind.js';
import { installPattern } from './mir/pattern/window.js';

const mod = installModulation({ mount: floats, params, present });
const pattern = installPattern({ mount: floats, mod, history });   // history: the app's one stack (mir/history), optional
// with a timeline: mod.setTimeline(tl) — pattern clips then rule their ENV, and SEND TO TIMELINE appears
```

Load `mir/pattern/pattern.css` after the kit's sheets (`mir.css` imports it). Once it is installed, every ENV face in the modulation window has a **PATT** button, and the app's WINDOW menu can call `pattern.toggle()`.

`installPattern(o)` takes:

| option | what it is |
|---|---|
| `mount` | the element the window and its rail go in (the app's float layer) |
| `mod` | `installModulation`'s result: its model, clock, window and timeline |
| `model` | a `createPatternModel()` (default: a new one) |
| `history` | `mir/history` `createHistory()`: the rows become its `pattern` domain, and a paint-drag is one row |
| `project` | `false` keeps the rows out of the project. By default they are the project part `pattern` (`core/project.js`) |
| `dock` | `{ span, guide }`: the app's dock span (`window/dock.js observeSpan`) and its DOCK GUIDE switch. The window always docks on its ENV device too |
| `store` / `storageKey` | where the window's own shape is kept (default localStorage `mir.pattern`) |
| `say(msg)` | where a refusal is said (default: the modulation window's status line) |

It returns `{ win, root, rail, model, sequencer, open, close, toggle, isOpen, show(envId), rows(), seat(), docked(), height(), menu(), sync(), paintMarkers(force), closeMenu(), destroy() }`.

## What the user sees

- **PATT** sits on the ENV face. On the Full face it comes after ↑ FIT ↓. On Compact it sits beside OUT and TRIG IN. It is never on the minimised strip. Pressing it turns that ENV's row on (the button lights) and opens the window. Pressing it again turns the row off, and the row keeps its steps.
- **The row.** Each row has a cap in the device's colour, then 16 steps in four groups of four, with alternate groups shaded. A step is a 16th note. Each step has an LED bar along its top edge. The bar is dark when the step is off, and lit in the device's colour when it is on. Its length is the step's velocity. While the transport plays, the playing step's bar glows in accent B.
- **Gestures** (FL's): a left drag paints a run of steps and a right drag clears one. A vertical drag on a lit step sets its velocity, where 64 px covers 1 to 127. On touch, a tap on a lit step clears it. A finger on a 32- or 64-step row pans the row sideways, so a step only lights when the finger lifts. A vertical wheel pages a long row.
- **The cap's menu** (tap or right-click): PATTERN ON/OFF · FILL EACH 2/4/8 STEPS · CLEAR · LENGTH 16/32/64 · SEND TO TIMELINE (only when a timeline is attached).
- **The seat.** Docked (the default), the window takes the left edge and width of one ENV device: the first ENV with PATT on, or else the first ENV. It sits 8 px above the modulation window's content, or below it when the top of the screen leaves no room. It follows the device as the device run scrolls sideways. It is cut where the run cuts the device, and hides when the device scrolls fully out of view. A drag on its grip or its empty glass sets it free. A drop near the seat docks it again.
- **With its window.** Closing the modulation window closes a docked pattern window, and opening it brings that window back. A free window stays where it is.
- **No ENV, no window.** With no ENV on the rack, the window is not drawn. PATT and WINDOW › PATTERN say so instead.
- **Height = rows.** The window is 40 px per ENV (52 px under a finger), plus its own edges.
- **WINDOW › PATTERN with the modulation window closed** (`show()`): it opens the modulation window first, then seats itself on its ENV.

## The sequencer

`createPatternSequencer({ M, clock, pattern, timeline })` (`mir/pattern/sequencer.js`) watches for beat crossings on the modulation clock. `installPattern` hooks it to the clock's advance notice (`host.clock.onAdvance`). It ticks on every realtime tick and every recorder `step()`, and it resets on every seek. A recording therefore fires exactly the hits that live play fires.

| law | what it means |
|---|---|
| One hit per lit step | Each step boundary `k · ¼` beat in `[previous beat, beat)` fires its ENV exactly once. The model's play edge already fires every ENV on the beat where play starts, so a lit step on that beat adopts that fire and does not fire again. |
| Nothing while stopped | No step fires while the transport is stopped. A seek, or a jump of more than one beat beyond what the elapsed time explains, resets the memory, so hits never burst. |
| Gate | A gate-mode ENV is released at the end of its step. |
| Velocity | The ENV's macros carry the ENV's output × velocity/127. The scaling stops as soon as anything else fires the ENV. |
| Clips win | A pattern clip under the playhead (`timeline.activeClips(beat, 'pattern')`) rules its ENV over the row. A muted clip gives the ENV back to its row. |

## The project and the history

The rows are saved as `{ v: 1, rows: [{ env, length, live, steps[] }] }`. Trailing zeros are dropped. An untouched row is not saved, and neither is a row whose ENV has left the rack (it is not lost either). A restore refuses the whole snapshot if any row is invalid. Use `patternProjectPart(model)` to register it yourself (`installPattern` does this unless `project: false`). Undo is the app's one history: the model is its `pattern` snapshot domain.

## Files

`mir/pattern/model.js` (the rows), `sequencer.js` (the hits), `window.js` (the window), `pattern.css` (its sheet). Tests: `tests/pattern.node.mjs` (BASINS' 41 sequencer and model assertions, ported unchanged) and `tests/pattern.browser.mjs` (PATT, painting, the stepped clock, the seat).
