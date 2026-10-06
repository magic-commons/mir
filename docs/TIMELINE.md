# MIR · TIMELINE — the second plugin

The TIMELINE is an arrangement window: lanes of clips over musical time, each clip an automation curve on one of the app's registered parameters (or a pattern, an audio envelope, or a kind the app adds), a ruler to scrub and select time on, a playhead, a curve editor with FL Studio's gestures, and a work bar that carries the app's **one play**. It is BASINS' timeline as Josh last tuned it (branch `basins-ui-fixes-2026-10-01`), harvested into `mir/timeline/` as the kit's second plugin on the socket of `docs/PLUGIN-CONTRACT.md`. Play with it at `gallery/timeline.html`.

Josh, 2026-10-01: *"Timeline will have the true play while Modulation will now have a power button."* The timeline's ▶ (and Space) start and stop the app's one clock; modulation's power only bypasses its routes.

## Add it to an app

```js
import { installModulation } from './mir/modulation/bind.js';
import { installTimeline } from './mir/timeline/bind.js';
import { observeSpan } from './mir/window/dock.js';

const span = observeSpan({ left: rackL, right: rackR });               // ONE span per page, shared by every window
let tl = null;
const present = () => { redraw(); if (tl) tl.paintHead(); };          // the playhead paints from the app's frame
const mod = installModulation({ mount: floats, params, present, dock: { span } });
tl = installTimeline({ mount: floats, mod, present, dock: { span }, storageKey: 'myapp.timeline',
  keys,                                                                 // the app's one key table (createKeys): the rows go in it
  history,                                                              // optional: the app's one history (createHistory)
  initial: { dock: 'bottom', open: true, h: 440 } });                   // the first seat, when nothing is stored
```

Load `mir/timeline/timeline.css` after the kit's sheets (`mir/mir.css`). A lane automates a **registered parameter**: everything `installModulation` knows (`mod.registry`) is a target, so `app.param()` and `mod.add()` make targets for the timeline too. Hold a knob for half a second (or right-click it) for CREATE AUTOMATION CLIP.

### `installTimeline(options)` — `mir/timeline/bind.js`

| Option | What it is | Default |
|---|---|---|
| `mount` | the element the window and its rail go in (the float layer) | required |
| `mod` | `installModulation`'s result: its registry is the targets, its clock the time | required |
| `model` | an arrangement (`createTimelineModel()`) | a new one |
| `present()` | ask the app for a frame | none |
| `say(text)` | a notice (the text is translated already) | none |
| `dock` | `{ span, guide, anchor }`, as `createWindow` | floats only |
| `storageKey`, `store` | where the window's shape and the work lane are kept (`{ read, write }`) | `localStore('mir.timeline')` |
| `initial` | the first shape when nothing is stored: `{ dock, open, x, y, w, h, chipSide, workLane }` | closed, floating 1080 × 440 |
| `keys` | the app's key table: the timeline's rows (and the one play's Space, if it has none) are added | a small table of its own |
| `history` | the app's one history: the timeline becomes one delegated domain (`adoptTimeline`) | the model's own 64-row undo |
| `project` | `false` keeps the arrangement out of the project | registered as the part `timeline` |
| `remap(id, saved)` | targets whose ids do not survive a reload (BASINS binds palette curves by position) | ids are stable |
| `automation` | `false`: the app wires the arrangement to its clock itself (BASINS, for its recorder) | wired |
| `transport` | `{ layout, nodes, rack }` for the work bar's transport; `{ shared: tr }`: the app's ONE transport (`createTransport`): it moves into the work lane while the lane shows and the window is open, back to the stage otherwise (the rack's dock wins; `body.no-transport-bar` keeps it off everywhere); `false`: none | `TIMELINE_TRANSPORT` |
| `audio` | `{ pick({ laneId, start }) }`: ADD AUDIO… in the ⋯ menu | absent |
| `scrubLevel()` | `'live' \| 'light' \| 'release'`: how often a scrub really seeks | `'live'` |
| | `createApp` builds no timeline, so SAMPLING · SCRUB (the GUI's saved `scrub`) reaches the arrangement through the app's own one line: `scrubLevel: () => gui.prefs.get('scrub')` (`app.gui.prefs.get('scrub')` with `createApp`) | |
| `busy()` | true while a recorder owns the clock: a scrub is refused | never |
| `moved(rect)`, `onWindow(open)` | where the window is (hand it to `rack.dodge`); open or closed | none |

It returns the timeline: `{ win, root, rail, editor, model, controller, transport, actions, keys, open(), close(), toggle(), isOpen(), paintHead(), presentation(), restore(shape), shortcuts(x, y), automation(id, beat), dispose() }`.

### The pieces, for an app that builds its own seam

| Module | What it is |
|---|---|
| `model.js` `createTimelineModel()` | the arrangement: lanes, curves (sources), clips (instances); its own snapshot undo; `value(targetId, beat)` is what the clock samples |
| `source.js` | a curve source in beats: normalise, evaluate (MIR's `bend`), add / move / slide / draw / remove points, tension, Hold segments |
| `kinds.js` | THE CLIP-KIND REGISTRY: `registerClipKind(name, { validate, value, paint, slice, duration, drives, menu })` |
| `pattern-kind.js`, `audio-kind.js` | the kit's two kinds (below) |
| `geometry.js`, `curve-view.js`, `draw.js`, `selection.js`, `slice.js` | the pure laws: musical geometry, the plot, Step strokes, the rectangle selection, THE SLICE LAW |
| `time-format.js` | `formatSeconds`, `formatBar`, `formatPercent` |
| `controller.js` `createTransportController({ mod, scrubLevel, busy })` | THE ONE PLAY and THE SCRUB GATE |
| `project.js` `timelinePart(model, { remap })`, `registerTimelinePart` | the project part |
| `history.js` `adoptTimeline(history, model)`, `timelineLabel` | the timeline as one domain of the app's history |
| `window.js` `createTimeline(host, port)` | the window: the editor, the work-bar transport, the readout layer, the held-knob popup |
| `editor.js`, `view.js`, `playhead.js`, `cursor.js`, `readout.js`, `knobs.js`, `icons.js` | the window's insides |
| `shortcuts.js` `timelineActions(get)`, `openTimelineShortcuts`, `renderShortcutsMarkdown` | the keys as rows of the app's key table, and the sheet made from them |

`createTimeline(host, port)`: `port` is `{ model, mod, controller?, present?, say?, dock?, store?, initial?, size?, min?, keys?, transport?, audio?, scrubLevel?, busy?, moved?, onWindow?, id?, title?, storageKey? }`.

## The port: what an app hands the timeline

The fractal's camera, its colour palette and its deep-zoom readout were BASINS' own; they leave through the port, as the modulation controller's did:

| BASINS had | The kit's port |
|---|---|
| its camera and colour knobs as targets (`palette.*`, `camera.*`) | `mod.registry`: any registered parameter |
| `remapTimelineTarget` (palette ids re-made on load) | `remap(id, saved)` |
| `prefs.scrubLevel` (Settings › SAMPLING) | `scrubLevel()` |
| its video and deterministic clocks owning the time | `busy()`; `automation: false` to keep its own provider (frozen values, the AUTOMATION grid) |
| `toast()` | `say(text)` |
| its 10ⁿ depth readout in the transport | `transport: { nodes: { readout } }` (the layout's `app:readout`) |
| its rack (send-to-rack) | `transport: { rack }` |
| `installAudioDrop` (decode, analyse, store, play) | `audio: { pick }`, `setAudioPeaks(fn)`, and `registerClipKind('audio', { ...AUDIO_KIND, menu })` |
| `mod.onTick(paintHead)` | `tl.paintHead()` from the app's present (or a modulation seam with `onTick`) |

## The clip kinds

| Kind | Value | Paint | Slice | In the kit |
|---|---|---|---|---|
| curve (the default) | the curve at the source beat, scaled into its OUTPUT RANGE | the MIR plot: fill, line, points, tension handles | two instances of one source, two new points at the cut, each half's tension refitted | whole |
| `pattern` | none: it fires, it never drives (`drives: false`) | FL's step grid repeated across the clip, groups of four, lit steps in the device colour, repeat boundaries | two instances of one row, the phase continuing | whole; **the sequencer that fires it stays BASINS'** (`pattern-sequencer.js`, `pattern-model.js`: they are its ENV devices' step rows) |
| `audio` | the source's own envelope (100 Hz, Uint8), a lookup | the envelope line; the peaks too when the app hands them (`setAudioPeaks`) | two instances | the source, its check, the lookup, the TEMPO LAW, Shift+T, the in-place patch, the budget, the paint. **Stays BASINS':** decoding, analysis (it needs BASINS' band edges and WebAudio), the asset store (IndexedDB), playback (KEEP AUDIO), the drop popup, the asset manifest part and the ENVELOPE · band menu rows (they reload an asset) |
| an app's own | its `value` | its `paint` | its `slice` (or none: it vetoes) | `registerClipKind(name, impl)` |

A kind never overrides the model's own fields: the model merges the kind's source first and writes `length` after it (BASINS, 2026-10-01).

## The laws

| Law | What it means |
|---|---|
| **One play** | Only the work bar's ▶ (and its Space row) starts or stops time (`controller.play`, the clock's own demand). Modulation's power is a bypass; power never plays; play never powers. |
| **The scrub gate** | A ruler drag (or the SCRUB tool) takes the realtime pump (`host.clock.suspendRealtime`): the hand leads (free; Shift snaps; Alt bypasses), the playhead follows the hand's beat, the model lands on the hand's beat at release at every SCRUB level, Escape rewinds to where it began. |
| **No second clock** | The arrangement is the modulation clock's automation (`setAutomation({ value })`, `setAutomationHold(true)`): a moving baseline under every route, sampled on the one tick; a paused seek previews it. `demand('timeline')` while an unmuted clip drives a registered target. |
| **One gesture, one transaction** | A drag is `model.begin … commit`; Escape, a lost capture, a blur, a hidden page or H cancels it whole. The last pointer sample is flushed before the commit. A right-button sweep that deletes several clips is one undo. |
| **One mapping** | Drawing, hit tests and edits use one musical-to-pixel mapping (`geometry.js`). The nearest lane comes from content coordinates, never `elementFromPoint`. Zoom keeps the beat under the anchor. |
| **The curve alone** | A clip's body never highlights the lane: feedback is the curve (fill, line, points) and the tab (tint, rim). |
| **The work lane** | The transport hugs the left; EDIT … ACTIVE · ⋯ are one bar that hugs the right and reaches the window's inner edge (under the resize corner where they share a row). No hint row: the status line takes no space and shows only while it says something. WORK BARS cycles top → bottom → hidden (pressed false, true, mixed). |
| **One key table** | The keys are rows of the app's table, live only while the timeline's surface has the focus (`when`); the sheet and this page's table are made from those rows. Escape and H end what is in flight (not table actions). |
| **The window is clear** | The window draws no pane of its own; the ruler, each lane and the two work bars are each a house `.glass` pane, so every look setting reaches them. The rail, its chips, the controls and the resize corner wear the modulation material (`material: 'modulation'`). |
| **Idle costs nothing** | No loop: the playhead paints from the clock's tick (the app's present) and from the controller's own seek and scrub; nothing books a frame while nothing moves. |

## The keys

The timeline's keys are rows of the app's one key table (`docs/KEYS.md`), rebindable in the KEYBOARD window; the SHORTCUTS sheet (⋯ › SHORTCUTS) shows the user's own bindings. The table below is generated from the same rows (`renderShortcutsMarkdown`; `tests/timeline-ticks.node.mjs` keeps it in step) and shows the declared keys.

<!-- SHORTCUTS -->
### Keyboard: rows of the app’s key table, live while the timeline’s surface has the focus

| Key | Action | FL / BASINS |
|---|---|---|
| Ctrl+A | Select all clips | FL — Select All |
| Ctrl+D | Deselect | FL — Deselect selection |
| Ctrl+B | Duplicate the selection, placed to its right | BASINS — FL documents no Ctrl+B; every copy gets an independent source, never a linked one |
| Ctrl+C | Copy the selection | FL — Copy selection |
| Ctrl+X | Cut the selection | FL — Cut selection |
| Ctrl+V | Paste at the playhead, into the active lane | FL — Paste selection |
| Ctrl+Z | Undo | standard — not an FL Playlist binding |
| Ctrl+Shift+Z | Redo | standard — not an FL Playlist binding |
| Ctrl+Enter | Set the time range to the selection’s span | BASINS |
| Ctrl+← | Slide the time range back by its own width | BASINS |
| Ctrl+→ | Slide the time range forward by its own width | BASINS |
| Del · Bksp | Delete the selection | BASINS — FL’s Backspace toggles Global Snap; not adopted, since an iPad keyboard has no forward Delete |
| Home | Seek to the beginning | FL — Move playback marker to start |
| Num Multiply | Seek to the next measure | FL — Next bar |
| Num Divide | Seek to the previous measure | FL — Previous bar |
| Shift+0 | Center the view on the playhead | BASINS |
| Shift+1 | Zoom to 12px per beat | FL — Horizontal Zoom level 1 |
| Shift+2 | Zoom to 20px per beat | FL — Horizontal Zoom level 2 |
| Shift+3 | Zoom to 40px per beat | FL — Horizontal Zoom level 3 |
| Shift+4 | Zoom to show the whole arrangement | FL — Horizontal Zoom, show all |
| Shift+5 · Shift+Z | Zoom to the selection | FL — Zoom to selection (Shift+5); Shift+Z is BASINS’ own, kept beside it |
| Shift+I | Invert the clip selection | FL — Invert selection |
| PgUp | Zoom in | FL — Zoom in |
| PgDn | Zoom out | FL — Zoom out |
| Shift+← · Alt+Shift+← | Move the selection earlier by the snap (Alt: a sixteenth) | FL — Shift+arrows move clips |
| Shift+→ · Alt+Shift+→ | Move the selection later by the snap (Alt: a sixteenth) | FL — Shift+arrows move clips |
| Shift+↑ | Move the selection up a lane | BASINS — FL has no lane axis to move on |
| Shift+↓ | Move the selection down a lane | BASINS — FL has no lane axis to move on |
| E | Select tool | FL — Select tool |
| P | Edit tool | adapted — FL’s P is the Draw tool; BASINS has one modeless curve editor |
| Y | Scrub tool | adapted — FL’s Y is the Playback/Preview tool |
| C | Slice tool | FL — Slice tool |
| Ins | Slice every selected clip at the playhead (one undo) | BASINS — FL slices with the tool; Insert cuts the selection at the playhead |
| Shift+T | Fit each selected audio clip’s remaining audio into its length (varispeed) | BASINS — Shift+T |
| Space | Play / pause, exact resume | BASINS — the transport’s one play (transportActions); FL’s Space stops to the start position instead |
| Escape | Cancel the gesture in flight, close menus, rewind a cancelled scrub | BASINS — active wherever the timeline is open |
| H | Release any open menu or gesture before the shell hides the UI | BASINS — active wherever the timeline is open |

### Pointer and touch

| Key | Action | FL / BASINS |
|---|---|---|
| Middle button, hold + drag | Pan time and tracks | FL — Middle-Mouse-Click pans |
| Ctrl/Cmd + drag (empty) | Rectangle-select clips or points | FL — Ctrl+drag selects |
| Ctrl/Cmd + Shift + drag | Add to the rectangle selection | FL — Ctrl+Shift+drag adds |
| Ctrl/Cmd + click a clip | Toggle it in the selection | FL — Ctrl+click toggles |
| Shift + drag a title | Duplicate the selection while moving it | FL — Shift-drag clones |
| Ctrl/Cmd + drag the ruler | Select a time range; + Shift extends it | adapted — FL selects by dragging the bar-ruler |
| Select tool: drag the ruler | Select a time range (no Ctrl, so touch can); a tap seeks | FL — dragging the bar-ruler selects time |
| Shift + vertical drag on the ruler | Zoom time around the pointer’s beat (up = in) | BASINS — a touch-friendly zoom; a horizontal Shift-drag still snaps the scrub |
| Hold a knob | Create a timeline clip from it, or locate its clips | BASINS |
| ACTIVE (toolbar) | Mark the ruler’s range, or the whole arrangement, as the active range; again to clear | BASINS — the range the record window renders |
| Slice tool: click a clip | Cut it at the pointer’s beat (Snap applies, Alt bypasses) | FL — the Slice tool cuts at the click |
| Drag a pattern / audio clip body | Move it (Shift copies, right-button deletes); it has no points | FL — pattern clips move from their body |
| Right-drag empty clip space | Add and place a point | FL — Right-Click + drag adds a point |
| Shift + right-click a clip | Add a point that preserves its current value | FL — Shift+Right-Click is non-destructive add |
| Left-drag a point or tension handle | Move it | FL — drag a node or a tension handle |
| Ctrl (held) while dragging tension | Fine-tune the tension | FL — Ctrl allows fine adjustment |
| Right-click a tension handle | Reset it | BASINS — FL’s right-click opens a Delete menu instead |
| Alt + left-click a point | Delete it | adapted — FL’s manual names Right-Alt+click specifically |
| Shift / Ctrl while moving a point | Lock its value / time | FL — Shift locks vertical, Ctrl locks horizontal |
| Alt (held) | Bypass Snap for the gesture in progress | FL — Alt temporarily sets snap to none |
<!-- /SHORTCUTS -->

## The look

Every look value of `timeline.css` is a token in its `/* FROST · values */` block (`docs/SKINS.md`); the rules read names only, and `tools/lint-intent.mjs` counts zero in every category for the sheet. The panes are the house's glass, so CARD STYLE (tinted, refractive), FROST, CORNERS, FACES, the two lights (LIGHT ANGLE on the panes, RELIEF ANGLE on the buttons) and SPACING (the docked rail's chips) reach the timeline with no timeline code (`tests/timeline.browser.mjs` checks each). Popups are the house's menu pane (`.glass[data-mir-surface="menu"]`).

## What changed from BASINS, and why

| Change | Why |
|---|---|
| The window is `createWindow`, not kwin + `snapWindow` + a second `observeRackBounds` | the one window set: Shift-drag, long press and keyboard seats, the dock guide that is the landing, motion, the cancels |
| The material comes from `material: 'modulation'`, not ~1,250 cloned rules fought with `!important` in `@layer mir.timeline` | no clone; no `!important` |
| A chosen tool is the ON face (the frost face, a thin rim, the label in accent A); BASINS fills it with accent A at .16 and rings it | INTENT: "ON is never an accent fill" (`docs/INTENT.md`) |
| The BPM pill in the work bar stands proud; BASINS sank it in a well | ruled by Josh 2026-10-01 (`docs/TRANSPORT.md`) |
| The keys are rows of the app's key table; BASINS' surface handler and its display table are gone | one source for the keys, the menus, the hints, the KEYBOARD window and the sheet |
| Each Ctrl/⌘+← / → is its own row (RANGE BACK, RANGE FORWARD) | a key table row is one action |
| A pointer row says "Hold a knob" for BASINS' "Hold a camera or colour knob" | the kit's targets are the app's parameters |
| Every word goes through `t` / `label` / `ariaLabel`; popup rows and buttons carry `data-row`, `data-tool`, `data-mode` | languages; nothing is found by its words |
| Reduced motion is the kit's policy (`<html data-motion>`), not a media query | the app's setting wins (`core/motion.js`) |
| The popups are the house's menu pane | no cloned `.m2pick` |
| The arrangement is a project part; the history domain is the kit's | one seam for "part of the project", one undo ring |
| The transport's seats in the work bar keep the bar's hairline (`timeline.css`) | as BASINS draws them beside the tools; the kit's work-bar seat had none |

## What BASINS deletes when it adopts

Paths are BASINS' `app/` (branch `basins-ui-fixes-2026-10-01`), with their line counts.

| BASINS file | Lines | Becomes |
|---|---|---|
| `timeline-model.js` | 216 | `mir/timeline/model.js` |
| `timeline-source.js` | 169 | `source.js` |
| `timeline-kinds.js` | 9 | `kinds.js` |
| `timeline-geometry.js` | 65 | `geometry.js` |
| `timeline-curve-view.js` | 44 | `curve-view.js` |
| `timeline-draw.js` | 17 | `draw.js` |
| `timeline-selection.js` | 12 | `selection.js` |
| `timeline-slice.js` | 54 | `slice.js` |
| `timeline-pattern-kind.js` | 51 | `pattern-kind.js` |
| `timeline-playhead.js` | 15 | `playhead.js` |
| `timeline-cursor.js` | 77 | `cursor.js` |
| `timeline-view.js` | 109 | `view.js` |
| `timeline-editor.js` | 313 | `editor.js` + `shortcuts.js` (its keydown handler is the key table now) |
| `timeline-shortcuts.js` | 125 | `shortcuts.js` |
| `timeline-icons.js` | 13 | `icons.js` |
| `timeline-knobs.js` | 38 | `knobs.js` |
| `timeline-window.js` | 63 | `window.js` + `bind.js` |
| `timeline-dock.js` | 19 | `window/dock.js` `dockGeometry` (already the kit's) |
| `timeline-window.css` | 262 | `timeline.css` |
| `readout-layer.js` + `readout.css` | 106 + 18 | `readout.js` + `timeline.css` (its modulation window's `mod-cursor.js` imports the kit's) |
| `time-format.js` | 26 | `time-format.js` |
| `transport-controller.js` | 71 | `controller.js` |
| `history.js` `adoptTimeline`, `timelineLabel` | 47 (183–229) | `history.js` |
| `audio-clip.js`, its app-independent half | ~120 of 278 | `audio-kind.js` (keep the analysis, the decode, the drop and the menu) |
| `audio.css` the clip rule | 2 of 5 | `timeline.css` |
| `modulation.js` 105–127, the timeline wiring | ~12 | `installTimeline` (or keep it with `automation: false` for the recorder) |
| `save-window.js` its timeline lines (123, 151, 188, 232, 255, 274) | 6 | the project part |
| `transport-placement.js` the timeline seat | ~20 of 46 | the work-bar transport inside the window |
| `kwin.js adoptMaterial` for TIMELINE, `snapWindow` for TIMELINE, the second `observeRackBounds` | — | `createWindow({ material, dock })` (`snap-window.js` stays while the PATTERN window uses it) |

About **2,300 lines** of BASINS' timeline go; what stays BASINS' own: `timeline-project.js`'s `remapTimelineTarget` (its palette law, as the `remap` port), the pattern sequencer and the PATTERN window, the audio engine (decode, analysis, assets, playback, the drop), its AUTOMATION sampling grid and its recorder's frozen values, the 10ⁿ depth readout, and the lego stack with the modulation window (`reserveTop` / `stackAbove`: an app span with an inset does it).

## Proofs

- **Pure laws** (`tests/timeline*.node.mjs`): BASINS' own node tests, ported with their assertions — `test-timeline` (with the kit's tempo set to BASINS' 60 BPM), `-source`, `-editing`, `-geometry`, `-interaction` (the dock checks against the kit's `dockGeometry`), `-kinds`, `-slice`, `-cursor`, `-ticks` (and this page's table), `test-transport-controller` (the `busy` and `scrubLevel` ports), `test-history` (whole, on the kit's history), `test-audio-clip` (the kit's half, on a synthetic envelope).
- **BASINS' rigs** (`tests/timeline-{fixes,scrub,ticks,kinds,readout,smoke}.browser.mjs`), on `gallery/timeline.html`, real input through CDP, every press hit-tested with `elementFromPoint`: fixes 44/44, scrub 14 of 22 (the 8 others need BASINS' Settings window and its AUTOMATION grid), ticks 58/58, kinds 32/32, readout 23/23 (its touch block needs touch WebKit), smoke 6/6 — each plus the press ledger. Chromium only.
- **The kit's own** (`tests/timeline.browser.mjs`): the one play; the work lane; the window docked, floated and docked again; drags reversed half-way; idle; the key table and a rebinding; the project part; a held knob; the work-bar BPM pill; the look settings reaching the panes; `qps`.
- **Element by element against BASINS** (computed styles, docked at the bottom, at Josh's FROST recipe): the differences that remain are listed in the lane's hand-over and in "What changed" above.
- Plates (`MIR_PLATES=1`): `docs/plates/timeline/`.

## Not built

- The PATTERN window and its sequencer, the audio engine, BASINS' SAMPLING settings (they stay BASINS').
- A tempo map: one tempo, the clock's (`time-format.js` reads it); BASINS has none either.
- Touch WebKit and a real iPad (BASINS ran its rigs in touch WebKit; these ran in Chromium).
- `onTick` on `installModulation` (the playhead paints from the app's present until the join adds it).
