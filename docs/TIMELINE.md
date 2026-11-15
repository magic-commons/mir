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
| `scaledRoom` | 1.5.7-alpha.68 (docs/WINDOWS.md law 16): under UI SCALE above 100 % the window, docked or floating, is at most the screen's room ÷ the scale tall in its own px, so it never covers the page (at 150 % on a 1300 × 850 page: 551 px, was 660); `TIMELINE_MIN.h` (400) yields to it. `false` lets it take the screen as before | on |
| `keys` | the app's key table: the timeline's rows (and the one play's Space, if it has none) are added | a small table of its own |
| `history` | the app's one history: the timeline becomes one delegated domain (`adoptTimeline`) | the model's own 64-row undo |
| `project` | `false` keeps the arrangement out of the project | registered as the part `timeline` |
| `remap(id, saved)` | targets whose ids do not survive a reload (BASINS binds palette curves by position) | ids are stable |
| `automation` | `false`: the app wires the arrangement to its clock itself (BASINS, for its recorder) | wired |
| `transport` | `{ layout, nodes, rack, powerWord }` for the work bar's transport (`powerWord`, 1.5.7-alpha.20: the power seat wears the app's word, as `createTransport({ powerWord })`); `{ shared: tr }`: the app's ONE transport (`createTransport`): it moves into the work lane while the lane shows and the window is open, back to the stage otherwise (the rack's dock wins; `body.no-transport-bar` keeps it off everywhere); `false`: none | `TIMELINE_TRANSPORT` |
| `audio` | `{ pick({ laneId, start }) }`: ADD AUDIO… in the ⋯ menu | absent |
| `scrubLevel()` | `'live' \| 'light' \| 'release'`: how often a scrub really seeks | `'live'` |
| | `createApp` builds no timeline, so SAMPLING · SCRUB (the GUI's saved `scrub`) reaches the arrangement through the app's own one line: `scrubLevel: () => gui.prefs.get('scrub')` (`app.gui.prefs.get('scrub')` with `createApp`) | |
| `busy()` | true while a recorder owns the clock: a scrub is refused | never |
| `controller` | the app's own one-play controller (`timeline/controller.js`'s shape), so its play, its scrub gate and its refusal sentences are the ones used (1.5.0-alpha.15: installTimeline forwards it to createTimeline) | made from `scrubLevel` and `busy` |
| `moved(rect)`, `onWindow(open)` | where the window is (hand it to `rack.dodge`); open or closed | none |
| `loop` | `false`: the clock runs free past the clips (THE LOOP, 1.5.6-alpha.25) | the loop |

It returns the timeline: `{ win, root, rail, editor, model, controller, transport, actions, keys, open(), close(), toggle(), isOpen(), paintHead(), presentation(), restore(shape), shortcuts(x, y), automation(id, beat), dispose() }`.

### The pieces, for an app that builds its own seam

| Module | What it is |
|---|---|
| `model.js` `createTimelineModel()` | the arrangement: lanes, curves (sources), clips (instances); its own snapshot undo; `value(targetId, beat)` is what the clock samples; `extent({ unmuted })` the clips' span; `stretchClip(id, edge, duration, { original })` the shape-keeping stretch |
| `source.js` | a curve source in beats: normalise, evaluate (MIR's `bend`), add / move / slide / draw / remove points, tension, Hold segments |
| `kinds.js` | THE CLIP-KIND REGISTRY: `registerClipKind(name, { validate, value, paint, slice, duration, drives, menu })` |
| `pattern-kind.js`, `audio-kind.js` | the kit's two kinds (below) |
| `audio-analysis.js`, `audio-playback.js`, `audio-drop.js` | the audio clip's decode and analysis, KEEP AUDIO, and the drop (`docs/AUDIO.md`) |
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
| `installAudioDrop` (decode, analyse, store, play) | `installAudioDrop(tl.editor, { mod, controller, say, busy })` in `mir/timeline/audio-drop.js`, and `audio: { pick }` for ⋯ › ADD AUDIO… (`docs/AUDIO.md`); `setAudioPeaks(fn)` only for peaks of the app's own |
| `mod.onTick(paintHead)` | `tl.paintHead()` from the app's present (or a modulation seam with `onTick`) |

## The clip kinds

| Kind | Value | Paint | Slice | In the kit |
|---|---|---|---|---|
| curve (the default) | the curve at the source beat, scaled into its OUTPUT RANGE | the MIR plot: fill, line, points, tension handles | two instances of one source, two new points at the cut, each half's tension refitted | whole |
| `pattern` | none: it fires, it never drives (`drives: false`) | FL's step grid repeated across the clip, groups of four, lit steps in the device colour, repeat boundaries | two instances of one row, the phase continuing | whole; **the sequencer that fires it stays BASINS'** (`pattern-sequencer.js`, `pattern-model.js`: they are its ENV devices' step rows) |
| `audio` | the source's own envelope (100 Hz, Uint8), a lookup | the waveform (the peaks from the asset store, the envelope line over them) | two instances | whole (1.5.0-alpha.13): the source, its check, the lookup, the TEMPO LAW (the re-derive is no undo row), Shift+T, the in-place patch, the budget for every way a clip is made, the paint, the clip menu (ENVELOPE · LEVEL / LOW / MID / HIGH, KEEP AUDIO ↔ SIGNAL ONLY, STRETCH), decode and analysis, KEEP AUDIO playback, the drop popup, the asset manifest part (`docs/AUDIO.md`) |
| an app's own | its `value` | its `paint` | its `slice` (or none: it vetoes) | `registerClipKind(name, impl)` |

A kind never overrides the model's own fields: the model merges the kind's source first and writes `length` after it (BASINS, 2026-10-01).

## The laws

| Law | What it means |
|---|---|
| **One play** | Only the work bar's ▶ (and its Space row) starts or stops time (`controller.play`, the clock's own demand). Modulation's power is a bypass; power never plays; play never powers. |
| **The scrub gate** | A ruler drag (or the SCRUB tool) takes the realtime pump (`host.clock.suspendRealtime`): the hand leads (free; Ctrl snaps — Shift until 1.5.6-alpha.23; Alt bypasses), the playhead follows the hand's beat, the model lands on the hand's beat at release at every SCRUB level, Escape rewinds to where it began. |
| **One modifier table** (1.5.6-alpha.23, THE HANDS; 1.5.7-alpha.39 · 43) | **Shift selects, fines and clones** (the ruler's range, the marquee, a clip's toggle; ⅛ on a point, a tension, a stretch; a drag from a clip clones it — 1.5.7-alpha.39, FL's gesture, where Josh asked for it); **Ctrl shapes** (the ruler's zoom and snapped scrub, a clip's stretch, a point's time lock, a segment's repeat from its tension handle — 1.5.7-alpha.43; a clip's clone by Ctrl-drag stays as an alias of Shift-drag); **the right button deletes** (a sweep from empty lane space — 1.5.7-alpha.38); **Alt bypasses Snap and deletes a point**. Every tool's plain gesture is its modifier gesture (SELECT drag = Shift-drag, SLICE click = the cut, SCRUB drag = the scrub), so touch needs no key. The value lock on a point is retired. |
| **The modes** (1.5.7-alpha.49, λWAVES 041 T1) | THE MODE MENU is FL Studio's context tool-menu (its "Middle-Mouse-Click + Right-Click"): a popup of two columns — **MODE**, nine large icon rows with a radio dot each, FL's tool column top to bottom; **MENU**, this window's menus as rows that open their lists in its place (EDIT · SELECT · ZOOM · SNAP · SCOPE), the bar's switches (STEP · SLIDE · ACTIVE), ADD AUDIO…, SHORTCUTS and the app's rows (`moreRows`), the rest of the column empty. It opens at the pointer on a **middle-button click on the lanes** (a middle drag still pans) and on the **chord middle + right** in either order (what the first button began is cancelled whole); the bar's **MODE chip** (after the four tools, wearing the mode in force) opens it for a finger; `editor.openModes(x, y)` for an app. The mode chosen is **the left button's tool until changed** (`editor.tool()`, `setTool(id)`, `MODES` in `editor.js`) and **the cursor wears it** (its glyph, over empty lane space; over the clips too in a mode that is not a pencil). **PENCIL** (`edit`): the hand as it was. **PAINT** (`paint`): a drag over empty lane space lays the clip last pressed end to end, a copy in every slot the pointer passes (slot k starts k lengths from the first, on the lane under the pointer; an occupied slot is left; the curve is shared, as the pencil's stamp); on a clip it is the pencil. **PAINT ADD** (`paintadd`, FL's step brush — its Paint in drum-sequencer mode): the same stroke with every copy ONE SNAP STEP long on the snap grid, the clip's whole shape squeezed into the step (Snap OFF or Alt: its own length); a press on a clip mutes or unmutes it. **DELETE** (`delete`, FL's ⊘): the left button is the right button's sweep. **MUTE** (`mute`): a press mutes or unmutes a clip, a drag gives every clip it crosses the state the first one took; a muted clip plays nothing and is hollow (no fill, a dashed curve, an empty tab). **SLICE** (`slice`): a click cuts the clip under it, a drag draws the cut down the lanes and every clip the line crosses is cut at that beat. **SELECT** (`select`): as it was. **ZOOM** (`zoom`): a drag zooms to the range it spans, a click zooms out to the whole arrangement. **PREVIEW** (`scrub`, FL's Playback; the SCRUB tool's id and key): a press seeks there and plays while it is held, a drag scrubs. Every stroke is one undo. Under every mode the right button deletes, Shift selects and clones, and the ruler is the ruler (040's hands). By keyboard (T4): Enter or Space on the MODE chip opens it on the mode in force; ↑ ↓ walk a column (round), ← → cross to the other column at the same height, Enter chooses, Escape closes; closed from inside it the focus returns to the timeline's surface, so its keys stay live. On a coarse pointer a mode row is `--touch` tall. The five new modes are rows of the key table with no key of their own (FL's B · N · D · T · Z belong to the kit and the apps). FL's Slip tool is not built. |
| **The pencil** (1.5.6-alpha.23) | The clip last pressed is remembered; an EDIT click on empty lane space stamps it there (`model.placeClip`: the same curve, shared, its length, offset and scale, at the snapped beat), and the press moves it; one undo. MAKE UNIQUE detaches it. Nothing remembered: the click clears the selection. |
| **The arrangement's law** (1.5.6-alpha.21) | Where clips on one target overlap, the **highest lane** wins (its index in `lanes`, the top lane first), then the **earliest start**, then the lower id; a muted clip never plays. Lanes are the arrangement's priority (BASINS' law was the latest start). |
| **The stretch** (1.5.6-alpha.21) | `stretchClip(id, 'start' \| 'end', duration)` changes the clip's length and its `scale` together (the source span `duration · scale` is held), so the curve keeps its shape; the start edge moves `start` (never before beat 0); one transaction. A trim (`updateClip`) cuts the shape instead. THE SELECTION RESIZES TOGETHER (1.5.7-alpha.11): an edge pressed on a clip inside a selection of several keeps the selection — a trim moves that edge of every selected clip by the pressed clip's snapped delta (each keeps its own start on a right edge; each clamps at its own minimum); the stretch (Ctrl/Cmd, Ctrl+Shift ⅛) first GLUES them (`glueTimelineClips`, geometry.js: lane by lane, a clip after a gap moves left to the end of the one before; an overlap stays), then scales the glued block about its other edge, the pressed clip's glued edge moving with the hand (snapped; f = its new distance from the pivot over its old one; start' = pivot + (start − pivot)·f, duration·f, scale / f: every curve keeps its shape, touching clips stay touching; never before beat 0). The whole gesture is one undo row. |
| **An event is a banded curve** (1.5.6-alpha.21/22) | A plain curve may carry `steps` (an integer ≥ 2; optional, so an older file opens unchanged): the bands of a target whose registry row is `integer` with `options` (the unit line in equal bands, FL's law) or a `toggle` (two). `registry.describe(id).steps` is what the target has now. A pattern's own `steps` (its row) is the pattern kind's. |
| **The loop** (1.5.6-alpha.25 · 1.5.7-alpha.8 · 1.5.7-alpha.17) | Playing, the clock loops: `controller.loop()` is the ruler's range, else the ACTIVE range, else the clips' extent (`model.extent()`, unmuted), else — THE EMPTY TIMELINE RESTS (1.5.7-alpha.8) — the first bar (`{ start: 0, end: model.meter() }`), never a free run: the clock keeps running, the readout cycles 1.1 … 1.4 and a first clip (CREATE CLIP, → TL, both at the playhead's bar) lands at 1.1. At each wrap a synced LFO whose period divides the bar is continuous; a dotted one (and 1/1 T) re-phases, a synced S&H or drift repeats its bar, a free (Hz) LFO does not follow the bar (1.5.7-alpha.14's words). A tick that crosses the end lands on the start (with its overshoot) before anything is applied, so no frame shows the end (`host.clock.setLoop`, heard as 'seek' then 'tick'); a playing tick already past the end (a play or a seek there, the clips cut away under it) lands on the start — a ruler range or ACTIVE too: a play started past its end begins at its start (FL's way; Ableton plays through). A seek, a scrub, a paused clock and a film (the recorder's `step`) never loop; an app that steps the clock on its own frame (a locked frame rate) asks `clock.step(dt, { loop: true })` and wraps by the same rule (THE STEPPED CLOCK LOOPS, 1.5.7-alpha.17). `installTimeline({ loop: false })` keeps the free run. The range and ACTIVE bands are its chrome. |
| **The empty lane has no hint** (1.5.7-alpha.51, λWAVES 041 T3; was THE EMPTY LANE SAYS HOW, 1.5.7-alpha.23 · 44) | An empty lane's band and pane wear no hint (Josh 11-09: "lambdawaves is advertised with DAW features, and DAWs never have any hints. We will make a manual one day"). Alpha.23 hinted them "{lane} is empty — right-click a knob › CLIP to make a clip" and drew that line over the lanes; alpha.44 took the line away (Josh: "There's a random text that says 'no clips yet...' remove it"); alpha.51 takes the hint. A lane with a clip is hinted by its name on its band, as before. Josh's two lines are the FOR-MIR lines the removals waited for. |
| **The arrangement wins where it plays** (1.5.6-alpha.27) | Under a clip the clip's value is the target's: a device's routes on it stand aside (a hand macro still layers); off a clip the device plays. →TL bypasses the device it sent. ⋯ › ROUTE NEW PARAMETER… arms every routable control (the modulation window's `armFor`) and the tap re-targets the clip (`model.retarget`: a shared curve is copied first). |
| **No second clock** | The arrangement is the modulation clock's automation (`setAutomation({ value })`, `setAutomationHold(true)`): a moving baseline under every route, sampled on the one tick; a paused seek previews it. `demand('timeline')` while an unmuted clip drives a registered target. |
| **One gesture, one transaction** | A drag is `model.begin … commit`; Escape, a lost capture, a blur, a hidden page or H cancels it whole. The last pointer sample is flushed before the commit. A right-button sweep that deletes several clips is one undo. |
| **The tension repeats** (1.5.7-alpha.43, λWAVES 040 T6) | Ctrl/Cmd + a drag on a segment's tension handle repeats that segment between its two points (`model.repeatSegment`, `repeatTimelineSegment` in `source.js`, pure): every 24 px up one more copy of its shape, each 1/n of its time (plain copies run a → b, a jump back to a at every seam: two points at one time, the later read); down past the press mirrored copies, alternating a → b and b → a (a copy run back wears the tension negated — bend's exact time reversal — and an even count jumps back to b at the end's time); an upward drag coming back takes copies away first; at most 32. Every sample is computed from the press's curve, release commits, one undo. The plain drag (tension) and Shift (fine) are unchanged; Ctrl shapes. |
| **The copies wear one colour** (1.5.7-alpha.42, λWAVES 040 T5) | A clip's colour is its curve's. A recolour (TITLE / COLOR's APPLY with a new tint) paints the clip's family in one undo — `timelineFamily(doc, clipId)` (`model.js`, pure): THE PREDICATE: clip Y is a copy of clip X when Y plays X's own curve (the pencil's stamps share it) or a byte-equal curve (the curve's JSON with its `id`, `name` and `color` set aside: Shift-drag's and Ctrl+B's own copies, the same target, points, tensions, length, steps and kind data) **and** Y's `duration`, `offset` and `scale` equal X's. A copy edited apart — a point moved, a trim, a stretch, a slip, a retarget — leaves the family and keeps its colour; the odd colour is the indicator. A rename never recolours. |
| **The edge is the edge** (1.5.7-alpha.41, λWAVES 040 T4) | Every trim zone — a tab's (12 px, 6 on a narrow tab, half a micro one), a body's (8 px, half a narrow clip), 14 px on touch — is centred on the clip's visual edge, half inside and half outside (FL's). The editor names the edge by geometry, never by the element under the pointer (`timelineEdgeAt(entries, x)`, `geometry.js`, pure): where two clips abut, the side of the seam the pointer is on names the clip (a right edge holds x while x < end, a left edge while x ≥ start; exactly on the seam, the right clip's left edge); else the nearer edge. Before the press the named edge lights (`data-hot`, its grip at .9) under the resize cursor; a curve's point or handle under the pointer still wins its press. |
| **The range stays** (1.5.7-alpha.40, λWAVES 040 T3) | The ruler's range (the loop's first choice, ACTIVE's source, ZOOM TO SELECTION's fallback) is cleared only by a quick double-click on the ruler — two presses within the kit's TAP law (300 ms, 14 px) at one spot — or replaced by a Shift-drag that draws a new one (a project open resets it, as before). A click on the ruler, a scrub, a SELECT-tool tap (which seeks) and a Shift-drag shorter than a sixteenth leave it as it was (before alpha.40 a scrub press and a SELECT tap cleared it, and a too-short Shift-drag emptied it). Ctrl+D is the clips' deselect, as before. |
| **Shift-drag clones** (1.5.7-alpha.39, λWAVES 040 T2) | A Shift press on a clip — its tab, a kind's body, or a curve body with no point or handle under the pointer — holds the clip; once the hand moves past the slop the selection (the pressed clip joins it) is duplicated (`model.duplicateClips`, each copy its own curve, as Ctrl+B) and the copies move with the hand, snapped, lane to lane; a Shift press that never moves is a click and toggles the clip in the selection, as before. Shift + drag on empty lane space is still the rectangle selection (Ctrl + Shift adds to it); in POINTS scope a Shift drag on a curve body is still the point marquee. Ctrl/Cmd + drag's clone stays as an alias. |
| **The right click deletes** (1.5.7-alpha.38, λWAVES 040 T1) | A right-button press on a lane's empty space, on a title band or in the gap between lanes (the bands are where the tabs live: nothing there is click-through) starts a delete sweep: while the button is held every clip the pointer crosses — tab or body, by the one geometry (`clipsInRectangle` over the path since the last pointer sample, so a fast hand skips no clip) — is deleted; the whole sweep is one undo; down on a tab deletes that clip at once, as before. The lane's right-click menu (ADD LANE · REMOVE LANE, 1.5.6-alpha.24) is gone: the rail's + and − chips add and remove lanes. A right-drag on a curve clip's body still adds a point (FL's law); Shift + right-click adds at the curve's value. |
| **One mapping** | Drawing, hit tests and edits use one musical-to-pixel mapping (`geometry.js`). The nearest lane comes from content coordinates, never `elementFromPoint`. Zoom keeps the beat under the anchor. |
| **The scroll** (1.5.7-alpha.9) | THE TIMELINE SCROLLS UNDER THE POINTER: Ctrl/Cmd + wheel zooms about the pointer; a plain wheel scrolls time while the lanes fit the height (with more lanes than fit it scrolls the lanes), Shift + wheel always scrolls time, a trackpad's sideways swipe is the native scroll. A scrub (the playhead's drag), a range, a move, a trim or a stretch held within 28 px of the viewport's left or right edge — or past it — scrolls time each frame while it holds (faster the deeper), and the gesture follows the view; release, a cancel or the pointer coming back in stops it. THE PUMP WAITS FOR A DRAG (1.5.7-alpha.14): it starts only once the gesture has moved past the 6-px slop, so a click or a tap near an edge never scrolls; a scrub's head stays inside the lanes on view (it waits at the edge while the view scrolls, and stops where the content ends); a scrub released past the loop's end while playing brings the view home with the head the loop sends home. The wheel lands on the element under the pointer, so no window registry is needed. |
| **The curve alone** | A clip's body never highlights the lane: feedback is the curve (fill, line, points) and the tab (tint, rim). |
| **The work lane** | The transport hugs the left; EDIT … ACTIVE · ⋯ are one bar that hugs the right and reaches the window's inner edge (under the resize corner where they share a row). No hint row: the status line takes no space and shows only while it says something. WORK BARS cycles top → bottom → hidden (pressed false, true, mixed). |
| **The face** (1.5.6-alpha.24, λWAVES 032) | One seat law for the tool bar: EDIT · SELECT · SCRUB · SLICE are round discs of one size (36 px, `--tl-action-h`, the CSB's) with 20 px glyphs (`--tl-icon`, the CSB's since 1.6.0-alpha.69; they were 16) (SLICE's `slice`, a blade), CLIPS / POINTS the kit's segment, SNAP a typed pill as the BPM pill (`1 · 1/4 · 1/8 · 1/16 · OFF`, the values unchanged), STEP · SLIDE · ACTIVE triggers, ⋯ as before; every button moves as the kit's chips (hover 1.06, a press .92, `--motion-micro`). A chosen clip is ringed in the accent with its tab in accent B and its fill at .36, a chosen point ringed 2 px in the accent; the ruler's range is a strong accent-B wash. Clips are fuller (fill .28, tab 1, the curve's ink 80 % of the tint, the swatches 20 % more chroma); handles smaller (point 5, tension 4; the grab stays 20). The rail's FIT chip (was RESET SIZE) zooms to the arrangement and sizes the window to its lanes, keeping its seat and dock (`window.place` with a size alone no longer writes NaN). MUTE reads DISABLE CLIP / ENABLE CLIP. A lane with clips asks through `confirmDialog` before it goes (the chip: the bottom lane; the lane's own right-click menu went in 1.5.7-alpha.38). An EVENT clip (`createClip` on a target whose registry row has `options`, or a toggle: a HOLD curve with `steps`) draws its band hairlines, and wears a centred ⚠ while the target offers another count, until a point edit redraws it for the count in force. |
| **One line** | The tool bar never wraps (Josh, 2026-10-06). What does not fit folds from the bar's END behind ⋯ (MORE, the `more` glyph, a trigger), so the first tools never move; ⋯'s list shows the folded tools as rows in bar order (icon and word; SNAP and the scope as `SNAP · QUARTER`, opening their choices), each acting through the bar's own control and showing its pressed state, then the selection's actions. A folded tool keeps its key. Space is measured in the kit's frame on one ResizeObserver; a fold comes back only with 6 px to spare (no flicker at the edge). No tool changes width with its state. `editor.folded()` says how many are folded. |
| **One key table** | The keys are rows of the app's table, live only while the timeline's surface has the focus (`when`); the sheet and this page's table are made from those rows. Escape and H end what is in flight (not table actions). |
| **The window is clear** | The window draws no pane of its own; the ruler, each lane and the two work bars are each a house `.glass` pane, so every look setting reaches them. The rail, its chips, the controls and the resize corner wear the modulation material (`material: 'modulation'`). |
| **Idle costs nothing** | No loop: the playhead paints from the clock's tick (the app's present) and from the controller's own seek and scrub; nothing books a frame while nothing moves. |

## The keys

The timeline's keys are rows of the app's one key table (`docs/KEYS.md`), rebindable in the KEYBOARD window; the SHORTCUTS sheet (⋯ › SHORTCUTS) shows the user's own bindings. The table below is generated from the same rows (`renderShortcutsMarkdown`; `tests/timeline-ticks.node.mjs` keeps it in step) and shows the declared keys.

<!-- SHORTCUTS -->
### Keyboard: rows of the app’s key table, live while the timeline’s surface has the focus

| Key | Action | FL / MIR |
|---|---|---|
| Ctrl+A | Select all clips | FL — Select All |
| Ctrl+D | Clear the selection | FL — Deselect selection |
| Ctrl+B | Duplicate the selection, placed to its right | MIR — FL documents no Ctrl+B; every copy gets an independent source, never a linked one |
| Ctrl+C | Copy the selection | FL — Copy selection |
| Ctrl+X | Cut the selection | FL — Cut selection |
| Ctrl+V | Paste at the playhead, into the active lane | FL — Paste selection |
| Ctrl+Z | Undo the last edit | standard — not an FL Playlist binding |
| Ctrl+Shift+Z · Ctrl+Y | Redo the edit undone | standard — not an FL Playlist binding |
| Ctrl+Enter | Set the time range to the selection’s span | MIR |
| Ctrl+← | Slide the time range back by its own width | MIR |
| Ctrl+→ | Slide the time range forward by its own width | MIR |
| Del · Bksp | Delete the selection | MIR — FL’s Backspace toggles Global Snap; not adopted, since an iPad keyboard has no forward Delete |
| Home | Seek to the beginning | FL — Move playback marker to start |
| Num Multiply | Seek to the next measure | FL — Next bar |
| Num Divide | Seek to the previous measure | FL — Previous bar |
| Shift+0 | Centre the view on the playhead | MIR |
| Shift+1 | Zoom to 12px per beat | FL — Horizontal Zoom level 1 |
| Shift+2 | Zoom to 20px per beat | FL — Horizontal Zoom level 2 |
| Shift+3 | Zoom to 40px per beat | FL — Horizontal Zoom level 3 |
| Shift+4 | Zoom to show the whole arrangement | FL — Horizontal Zoom, show all |
| Shift+5 · Shift+Z | Zoom to the selection | FL — Zoom to selection (Shift+5); Shift+Z is MIR’s own, kept beside it |
| Shift+I | Invert the clip selection | FL — Invert selection |
| PgUp | Zoom the timeline in | FL — Zoom in |
| PgDn | Zoom the timeline out | FL — Zoom out |
| Shift+← · Alt+Shift+← | Move the selection earlier by the snap (Alt: a sixteenth) | FL — Shift+arrows move clips |
| Shift+→ · Alt+Shift+→ | Move the selection later by the snap (Alt: a sixteenth) | FL — Shift+arrows move clips |
| Shift+↑ | Move the selection up a lane | MIR — FL has no lane axis to move on |
| Shift+↓ | Move the selection down a lane | MIR — FL has no lane axis to move on |
| E | Select mode: the left button selects | FL — Select tool |
| P | Pencil mode: the left button draws a clip | FL — Draw tool (P) |
| Y | Preview mode: a press plays while held, a drag scrubs | FL — Playback tool (Y) |
| C | Slice mode: the left button cuts a clip | FL — Slice tool |
| — | Paint mode: drag to lay the last clip end to end | FL — Paint tool (B); unbound in MIR |
| — | Paint Add mode: lay the last clip one snap step at a time | FL — Paint in drum-sequencer mode (N); unbound in MIR |
| — | Delete mode: the left button deletes what it crosses | FL — Delete tool (D); unbound in MIR |
| — | Mute mode: a press mutes or unmutes a clip | FL — Mute tool (T); unbound in MIR |
| — | Zoom mode: drag a range to zoom to it, click to zoom out | FL — Zoom tool (Z); unbound in MIR |
| Ins | Slice every selected clip at the playhead (one undo) | MIR — FL slices with the tool; Insert cuts the selection at the playhead |
| Shift+T | Fit each selected audio clip’s audio to its length | MIR — Shift+T |
| Space | Play / pause, exact resume | MIR — the one play (transportActions); FL’s Space stops to the start position instead |
| Escape | Cancel the gesture in flight and close menus | MIR — active wherever the timeline is open |

### Pointer and touch

| Key | Action | FL / MIR |
|---|---|---|
| Middle button, hold + drag | Pan time and tracks | FL — Middle-Mouse-Click pans |
| Middle click on the lanes · middle + right together · the bar’s MODE chip | Open THE MODE MENU: the nine modes and this window’s menus | FL — Middle-Mouse-Click + Right-Click opens the context tool-menu; the lone middle click and the chip are MIR’s |
| Wheel over the timeline | Scroll time (or the lanes); Ctrl/Cmd + wheel zooms | FL — the wheel scrolls the playlist, Ctrl + wheel zooms |
| Drag past the left or right edge | Scroll time while a drag holds it at the edge | FL — the playlist scrolls under a drag held at its edge |
| Right-button drag on empty lane space (or between lanes) | Delete every clip the pointer crosses, tab or body | FL — right-click deletes a clip; MIR sweeps while the button is held |
| Shift + drag (empty) | Rectangle-select clips or points | adapted — FL’s Ctrl+drag; in MIR Shift selects |
| Ctrl/Cmd + Shift + drag | Add to the rectangle selection | FL — Ctrl+Shift+drag adds |
| Shift + click a clip | Toggle it in the selection | adapted — FL’s Ctrl+click toggles |
| Shift + drag a clip | Duplicate the selection with the clip and move the copies | FL — Shift-drag clones a clip |
| Ctrl/Cmd + drag a clip | Duplicate the selection while moving it, as Shift-drag does | adapted — FL’s Shift-drag clones; MIR’s Ctrl alias stays |
| Drag a clip’s edge | Trim it: the curve keeps its beats; the selection trims too | FL — drag a clip’s edge; a selection resizes together; the lit edge is the one that moves |
| Ctrl/Cmd + drag a clip’s edge | Stretch it: the curve keeps its shape; a selection as one | MIR — length and speed change together |
| Ctrl/Cmd + Shift + drag a clip’s edge | Stretch it finely (⅛, free of Snap) | MIR — Shift is the fine gear |
| Pencil: click empty lane space | Place the clip last pressed there (the same curve, shared) | FL — the pencil places the last clip; MAKE UNIQUE detaches it |
| Paint: drag over empty lane space | Lay the last clip end to end where the pointer passes | FL — the Paint tool paints clips while dragging |
| Paint Add: drag over empty lane space | Lay the last clip one snap step long; a clip press mutes it | FL — Paint in drum-sequencer mode: one step a click, a click on a note mutes it |
| Delete: press or drag | Delete every clip the pointer crosses, on the left button | FL — the Delete tool |
| Mute: press or drag | Mute or unmute a clip; a drag sets every clip it crosses | FL — the Mute tool |
| Zoom: drag a range · click | Zoom to the range dragged; a click zooms out to the whole | FL — the Zoom tool: drag zooms to the selection, a click zooms out |
| Preview: press · drag | Play from the press while it is held; a drag scrubs | FL — the Playback tool: a click plays from there, a drag scrubs |
| Shift + drag the ruler | Select a time range; + Ctrl/Cmd extends it | adapted — FL selects by dragging the bar-ruler |
| Select: drag the ruler | Select a time range; a tap seeks and keeps the range | FL — dragging the bar-ruler selects time |
| Drag the ruler | Scrub: the playhead follows the hand; the range stays | MIR — the hand leads |
| Double-click the ruler | Clear the time range (a double press at one spot) | MIR — Josh 2026-11-09; FL clears the selection on a click |
| Ctrl/Cmd + vertical drag on the ruler | Zoom time around the pointer’s beat (up = in) | MIR — a touch-friendly zoom; a horizontal Ctrl-drag scrubs on Snap |
| Hold a knob | Create a timeline clip from it, or locate its clips | MIR |
| ACTIVE (toolbar) | Mark the ruler’s range as the active range; again to clear | MIR — the range the record window renders |
| Slice: click a clip · drag down the lanes | Cut the clip at the pointer’s beat; a drag cuts every clip | FL — the Slice tool: click and drag vertically to slice |
| Drag a pattern / audio clip body | Move it (Shift or Ctrl copies, right button deletes) | FL — pattern clips move from their body |
| Right-drag empty clip space | Add and place a point | FL — Right-Click + drag adds a point |
| Shift + right-click a clip | Add a point that preserves its current value | FL — Shift+Right-Click is non-destructive add |
| Left-drag a point or tension handle | Move it | FL — drag a node or a tension handle |
| Shift (held) while dragging a point or tension | Fine-tune it (⅛; a point’s time is free of Snap) | adapted — FL fines tension with Ctrl; Shift is MIR’s fine gear |
| Ctrl/Cmd (held) while moving a point | Lock its time | FL — Ctrl locks horizontal |
| Ctrl/Cmd + drag a tension handle | Repeat the segment: up adds copies, down mirrors them | MIR — Ctrl shapes (Josh, 040) |
| Right-click a tension handle | Reset it | MIR — FL’s right-click opens a Delete menu instead |
| Alt + left-click a point | Delete it | adapted — FL’s manual names Right-Alt+click specifically |
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
| A menu is the kit's `contextMenu` (1.6.0-alpha.66): the ⋯ list, a clip's and a point's menu, every list a MENU row opens; a row carries `data-id`, the pane `data-pop`; a key is keycaps, a choice a ✓ or • in the row's picture seat, SCOPE · SNAP · SEGMENT submenus; no title row (the title is the pane's accessible name). THE MODE MENU and the three forms (TITLE / COLOR, TIME / VALUE, OUTPUT RANGE) are `.tl-pop` panes of their own | one menu renderer, one walk (↑ ↓ → ← Home End, a typed letter), one Escape road |
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
| `audio-clip.js` | 278 | `audio-kind.js` + `audio-analysis.js` + `audio-drop.js`; `audio-assets.js` (110) → `core/assets.js`; `audio-playback.js` (72) → `audio-playback.js`; `audio.js` (438) → `modulation/audio-capture.js` (`docs/AUDIO.md`) |
| `audio.css` the clip rule | 2 of 5 | `timeline.css` |
| `modulation.js` 105–127, the timeline wiring | ~12 | `installTimeline` (or keep it with `automation: false` for the recorder) |
| `save-window.js` its timeline lines (123, 151, 188, 232, 255, 274) | 6 | the project part |
| `transport-placement.js` the timeline seat | ~20 of 46 | the work-bar transport inside the window |
| `kwin.js adoptMaterial` for TIMELINE, `snapWindow` for TIMELINE, the second `observeRackBounds` | — | `createWindow({ material, dock })` (`snap-window.js` stays while the PATTERN window uses it) |

About **2,300 lines** of BASINS' timeline go; what stays BASINS' own: `timeline-project.js`'s `remapTimelineTarget` (its palette law, as the `remap` port), the pattern sequencer and the PATTERN window, its AUTOMATION sampling grid and its recorder's frozen values, the 10ⁿ depth readout, and the lego stack with the modulation window (`reserveTop` / `stackAbove`: an app span with an inset does it).

## Proofs

- **Pure laws** (`tests/timeline*.node.mjs`): BASINS' own node tests, ported with their assertions — `test-timeline` (with the kit's tempo set to BASINS' 60 BPM), `-source`, `-editing`, `-geometry`, `-interaction` (the dock checks against the kit's `dockGeometry`), `-kinds`, `-slice`, `-cursor`, `-ticks` (and this page's table), `test-transport-controller` (the `busy` and `scrubLevel` ports), `test-history` (whole, on the kit's history), `test-audio-clip` (the kit's half, on a synthetic envelope).
- **BASINS' rigs** (`tests/timeline-{fixes,scrub,ticks,kinds,readout,smoke}.browser.mjs`), on `gallery/timeline.html`, real input through CDP, every press hit-tested with `elementFromPoint`: fixes 44/44, scrub 14 of 22 (the 8 others need BASINS' Settings window and its AUTOMATION grid), ticks 58/58, kinds 32/32, readout 23/23 (its touch block needs touch WebKit), smoke 6/6 — each plus the press ledger. Chromium only.
- **The kit's own** (`tests/timeline.browser.mjs`): the one play; the work lane; the window docked, floated and docked again; drags reversed half-way; idle; the key table and a rebinding; the project part; a held knob; the work-bar BPM pill; the look settings reaching the panes; `qps`.
- **The modes** (`tests/timeline-modes.browser.mjs`, 1.5.7-alpha.49): the chip, the middle click and the chord open the menu; its two columns, its size; a mode chosen and the cursor it wears; each mode's hand (PAINT, PAINT ADD, MUTE and the hollow clip, DELETE, SLICE's drag, ZOOM, PREVIEW) and its one undo; 040's right button, Shift-drag and ruler range under another mode.
- **One line** (`tests/timeline-fold.browser.mjs`): wide, every tool on the bar; narrowed 740 → 320 px in 20 px steps, the bar keeps one height, the tools fold from the end, the first two never move; no flicker at the edge; ⋯ lists the folded tools in bar order, a row acts and shows its state (STEP, SNAP's choices); beside a wide transport even the tools fold and their keys hold (C: SLICE); widened, they come back.
- **λWAVES 032 (1.5.6-alpha.21 … 28)**: `timeline-editing.node.mjs` (the arrangement's law, extent, the stretch, steps), `event-target.node.mjs` (bands, centres, describe), `curve-gesture.node.mjs` (the fine gear, the time lock), `timeline-interaction.node.mjs` (the pencil's `placeClip`, `retarget`), `timeline-controller.node.mjs` (THE LOOP on the real host: the precedence, the wrap before the apply, seeks, the recorder), `timeline-geometry.node.mjs` (the handles, SNAP's fractions), `modulation-seam.node.mjs` §4 (the arrangement wins where it plays); in Chromium `timeline.browser.mjs` adds THE HANDS (Ctrl-edge stretch, Ctrl-title clone, the pencil stamp, Shift-ruler range), THE FACE (FIT keeps the dock, the event clip's ⚠ and its clearing, DISABLE CLIP), ROUTE NEW PARAMETER… and →TL's bypass; `timeline-scrub` and `timeline-kinds` press Ctrl where they pressed Shift.
- **Element by element against BASINS** (computed styles, docked at the bottom, at Josh's FROST recipe): the differences that remain are listed in the lane's hand-over and in "What changed" above.
- Plates (`MIR_PLATES=1`): `docs/plates/timeline/`.

## Not built

- BASINS' SAMPLING settings (they stay BASINS'). The audio clip is whole (`docs/AUDIO.md`); KEEP AUDIO is proved in Chromium only.
- A tempo map: one tempo, the clock's (`time-format.js` reads it); BASINS has none either.
- Touch WebKit and a real iPad (BASINS ran its rigs in touch WebKit; these ran in Chromium).
- `onTick` on `installModulation` (the playhead paints from the app's present until the join adds it).
- MAPPING (MIDI / MOD) rows for the four tools (λWAVES 032 call 9): their keys (E · P · Y · C) are rows of the key table and rebindable; no registry row yet.
- The event clip's ⚠ is read when the editor paints; an app whose options list changes while the timeline is idle calls `editor.paint()` (nothing polls).
- The pencil stamps on press and the press moves it; it never stamps a kind's curve onto another kind's target (it re-uses the pressed clip's curve as it is).
