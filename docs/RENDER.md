# RENDER — the recorder: frame-exact film from any canvas app

RENDER turns an app's picture into a video or a folder of lossless frames, **exactly**: frame zero is the play edge, every later frame is musical time moved by exactly 1/fps, and the same project renders to the same bytes every time, in a hidden tab as in a visible one. It is BASINS' deterministic render (its RENDER tab, `deterministic-export.js`, the render store, the encoder preflight, the self-test) moved into the kit. The kit does the clock, the encoding, the store on disk with recovery, the preflight and the panel; the app draws the frame.

An app uses it in three steps.

```js
import { createRecorder } from './mir/render/recorder.js';
import { renderPanel, createRenderCard } from './mir/render/panel.js';

const recorder = createRecorder({
  host: mod.host,                         // the modulation host (installModulation's mod.host)
  editor: tl.editor,                      // the timeline's editor: TIMELINE · ACTIVE and · SELECTION read its ranges
  app: 'myapp',                           // file names: myapp-frames-<run>-001.zip
  wake: app.wakeLock.hold,                // hold the screen awake during a run
  frame: async (i, ctx) => { draw(ctx.width, ctx.height); return canvas; },   // THE APP'S PART
});
const folders = createFolders({ …, panels: [renderPanel({ recorder, picture, subject, say })] });   // RENDER as a FOLDERS tab
const card = createRenderCard({ recorder, picture, say });                                          // and as a rack card
const tl = installTimeline({ …, busy: () => recorder.running() });                                  // the timeline stands aside while a run owns the clock
```

Link `mir/render/render.css` (`mir.css` imports it).

## What the app provides

`frame(i, ctx)` returns the picture for frame `i` as a canvas, an `ImageBitmap`, an `OffscreenCanvas`, an `ImageData` or `{ rgba, width, height }`. By the time it is called the clock has stepped and the host has applied every parameter, so the app reads its parameters (through the registry or its own setters) and draws. `ctx` is `{ i, frame, beat, time, fps, width, height, view, signal }`: `frame` is the clock's index (the offset included), `view` is what the app's own motion planned for this frame, `signal` aborts when the run is cancelled. Draw at `ctx.width × ctx.height`; wait for the picture to settle before returning (BASINS waits for its tile pyramid to finish). The frame goes onto an opaque black ground, because a film frame has no alpha.

## The motions

| Motion | Frames | Clock |
|---|---|---|
| `still` | `durationS` from `offsetS` | stepped, or frozen when modulation and timeline are both off |
| `timeline-active` | the **active range** (the ACTIVE button on the timeline's toolbar), start to end at the fps | the arrangement plays from beat zero; the run steps to the range's first frame, then records |
| `timeline-selection` | the **ruler's range** (Ctrl-drag, or the SELECT tool on touch) | the same |
| an app's own | its plan | `motions: { zoom: { label: 'ZOOM', prepare(ctx) → { view(i), durationS?, spec? } } }` |

A timeline motion with no range refuses with a sentence naming what to do ("TIMELINE · ACTIVE: there is no active range — mark one with ACTIVE in the TIMELINE first"). The active range is a field of the arrangement, so it is saved with the project, compared in its signature and undone with it (`timeline/model.js setActive`; `tests/timeline-active.node.mjs`).

## The clock modes

| Setting | Means |
|---|---|
| modulation **ON · FROM FIRST SPACE** | the rack replays from beat zero: phases reset, the play edge fired, frame zero is the first paint after Space |
| modulation **OFF · FREEZE THIS LOOK** | the routes are bypassed and every parameter holds the value it shows now |
| timeline **ON · FROM BEAT ZERO** | the arrangement replays through the clock's own automation |
| timeline **OFF · BYPASS AUTOMATION** | the clips are not read |

With both off nothing is stepped. A timeline motion always plays the arrangement. A resumed render holds the look it started with, not the one on screen now (`frozenValues` in the manifest). The pattern sequencer rides the clock's advance notice, so its hits are in the render at their velocity. Frame zero is the play edge's own fire, as live play paints it.

The run **suspends the realtime pump** (a scrub, or a second recorder, makes it refuse: "Finish scrubbing before rendering"), **captures the live runtime** and puts it back in one operation afterwards, whatever happens (`host.clock.captureRuntime / restoreRuntime`): no play or pause edge is emitted, so a stutter hold is not released and no base is written wrong. A wall-synced rack derives its beat from the host's wall stamp; the app's own tick keeps calling `advanceTo` while the clock runs and that moves the stamp, so the record clock puts the stamp back before every exact step.

## Formats

| Format | How | When it is not available |
|---|---|---|
| **MP4 · high bitrate** | WebCodecs H.264 (the avc1 ladder, High 5.2 down to Baseline), 40–200 Mbps at 0.5 bit/px/frame, keyframe every 2 s, the kit's own muxer (`render/mp4.js`: faststart, B-frame order, 64-bit offsets) | no `VideoEncoder`, or every rung refuses this size and rate: "Choose PNG frames or a smaller size" |
| **PNG frames · lossless** | `frame_000000.png` … in stored ZIP parts of at most 128 MB, each with a `recording.json` | never |

**The preflight** (`render/encoder.js verifyEncoder`) runs before the first frame of an MP4 render: two opaque frames are encoded through the shipping sink, then decoded; 60 s timeout; memoised per size, rate, codec and bitrate. A browser that accepts the configuration and cannot take a frame fails in seconds. The estimate in the panel decides the path as you choose (`isConfigSupported`), so RENDER is disabled with the reason before you press it.

## The store, and what survives a failure

An MP4 render writes its encoded samples to the origin-private file system as it goes, checkpointing every two seconds of video; a PNG render commits each ZIP part. The store is a directory per app (`dir`, default `mir-recordings`; BASINS passes `basins-recordings` and finds its old jobs), a sub-directory per run, with `job.json` (the manifest, version 1) beside the payload parts. A writer is `createWritable()` where the browser has it, or the module worker over a synchronous access handle (Safari). There is no polling: only a bounded queue (8 MB) and the sample index live in JS. With no origin-private file system the run keeps samples in memory (MP4 up to 128 MB, PNG up to 480 MB) and says so.

After a cancel, an error or a reload the panel lists the stored renders:

| Row | Does |
|---|---|
| **RECOVER COMPLETED FRAMES** | finalises the checkpointed prefix into a valid MP4 (`<app>-recovered-partial.mp4`) |
| **RESUME WITH MATCHING PROJECT** | renders on from the checkpoint into a new payload part and finishes one file; refused with a sentence when the project's colours, rack, parameter bases or tempo changed (`signature`) |
| **DOWNLOAD STORED …** / **DISCARD STORED RENDER** | the finished file, or removal |

A resume needs the same project; recovering consumes the payload (the render is then complete), so resume first when you mean to.

## The estimate and the ceiling

Under the rows: the size, the frame count, the clock, the beats and tempo (timeline motions), the MP4's target bitrate and size, and the time. The time is frames × milliseconds per frame, seeded with BASINS' measured 84 ms and replaced by the device's own after one run (`calib`). A projection above the run ceiling (20 minutes, BASINS') says so before the tap: keep the page open and visible; a failed render keeps its completed frames.

## RUN SELF-TEST

Does making a film work on this device, in seconds: the size under test; the app's own stages (`selfTestStages: [{ name, run() }]`); the frame source reads back and its tones are counted; a PNG encodes at full size; a file can be offered (download, share sheet); the VideoEncoder ladder at this size; a two-frame MP4 through the shipping sink, muxer and decoder; the temporary store writes, reads back and discards a probe; the wake lock exists; the projected cost of the film as configured. Each stage is timed and one failing never stops the rest. `rec.selfTest(options)` → `{ stages, passed, total, ok, firstFailure }`; `rec.selfTestLines(res)` is the text, and every dump carries the last result.

## Who owns the page while it runs

Pointer, wheel, click and key events are swallowed for the run's length. **Escape** cancels; a `[data-render-cancel]` button works (the panel's CANCEL). The screen is held awake from inside the RENDER tap, before the first await (`wake`), so the gesture still counts. While the page is hidden the run waits for it to be visible again (`pauseWhileHidden`, on `visibilitychange`, no polling) unless the app turns that off; the clock itself does not care.

## The panel and the rack card

`renderPanel(options)` is a panel for `createFolders({ panels })` (id `render`, glyph `render`); `createRenderCard(options)` is a `kit.device` holding the same rows (`data-seat="card"` gives BASINS' compact rack-card sizes); `createRenderView(parent, options)` puts them anywhere. The rows are BASINS': SUBJECT (this view or the inspected project: name, key facts, VIEW DETAILS, COPY, JSON), IMAGE (FORMAT, CAPTURE IMAGE, DOWNLOAD IMAGE: two taps so the save runs inside a tap on iPad), DETERMINISTIC RENDER (motion, format, size, fps, length, start at, modulation, timeline, the estimate, RENDER, PREVIEW FIRST 3 SECONDS, progress with CANCEL, the finished files, the stored renders), CHECK (RUN SELF-TEST), FILES (SAVE AS ZIP… and OPEN ZIP…, FOLDERS' project zip, closed until pressed; OPEN ZIP… over unsaved work asks FOLDERS' "Save this first?" below itself, `docs/FOLDERS.md`), then whatever `sections(wrap, gallery)` adds. VIEW DETAILS' caret is glyph.js' `chevronDown` / `chevronUp`. **The hand** (1.5.0-alpha.19): the progress row is always there, its CANCEL disabled while nothing runs and as wide as its own word (the progress reads on one line beside it); the status sentence sits below the buttons on a line kept even when empty; RUN SELF-TEST's report opens below the button. So a render starting, running, ending or being cancelled, and a self-test reporting, move no button (before: RUN SELF-TEST +51 / −35 px, RENDER and PREVIEW +16, CANCEL resized by 90). The app's own parts arrive as options:

| Option | For |
|---|---|
| `subject: { facts(entry, gallery), text(entry, gallery), json(entry, gallery), name?(entry, gallery) }` | the SUBJECT block (BASINS: the fractal's position and depth); omit it and there is none. Each is handed the view's own gallery (the window's, or the rack card's), so one subject serves both |
| `picture: { capture(), save(held), stale(held), size(), formats?, format?(), setFormat?() }` | the IMAGE block; the same adapter FOLDERS' `capturePicture` / `savePicture` / `pictureStale` take |
| `motionUi: { zoom: (host, { row, fields, change }) → { options(), paint?(estimate), text?(estimate) } }` | the rows of an app's own motion (BASINS: ZOOM's route and speed); shown only while it is chosen, `options()` becomes `motionOptions`. `row(text, tip, at)` seats a row under MOTION, or under the panel row `at` names (`'format'`, `'size'`, `'fps'`, `'length'`, `'start'`, `'modulation'`, `'timeline'`: BASINS' SPEED is `at: 'length'`). `fields` is `{ length, size, fps }`, the panel's own inputs (SPEED sets LENGTH: write `length.value`, then dispatch `change`). A `paint` that throws refuses the run: RENDER stays off and the thrown sentence is the estimate row |
| `defaults: { fps, motion }` | the first choices before anything is stored (default 30 FPS, STILL; BASINS: its FPS, `motion: 'zoom'`) |
| `sections(wrap, gallery)` | the app's own sections after CHECK and FILES (BASINS: SETTINGS & FILES) |
| `files` | `{ save(), open() }`, FOLDERS' `api.zip`: SAVE AS ZIP… and OPEN ZIP… in a FILES section, where BASINS' SETTINGS & FILES had them. `renderPanel` takes FOLDERS' own by default when FOLDERS has its zip; `false` leaves them out; a card is handed them (`createRenderCard({ files: folders.zip })`; `createApp`'s RENDER card is) |
| `loadingMark` | `createRenderCard` only: the card's waiting mark, as `kit.device` takes it (`false`: none, BASINS' card) |
| `prefix` | the storage keys' prefix (BASINS: `mandel.record.`) |
| `say(text, warn)`, `save(blob, name)` | a toast; handing a file over (default: the share sheet on iPad, else an anchor download) |

`view.state()` is what a harness reads: `{ motion, motions: [[id, label]], format, size, fps, estimate, status, progress, running, plan, held, done }`, where `plan` is `{ frames, startFrame, fps, range }` (null while the rows refuse), `held` the picture made (`{ w, h, bytes }`) and `done` the finished film's first file (`{ name, bytes }`, until DISCARD RENDER).

The panel repaints when it is shown, when the timeline's model changes (the active range is in it), on resize and on every choice. The selection range (not in the model) is read at paint and at press.

## Recorder reference

`createRecorder(options)` → `rec`. Options: `host`, `frame`, `motions`, `editor`, `app`, `dir`, `storage`, `wake`, `check`, `before`, `after`, `signature`, `canonical`, `describe`, `currentSize`, `colorSpace`, `hidden`, `pauseWhileHidden`, `guard`, `calib`, `selfTestStages`, `ceilingMs`, `handler` (read the header of `render/recorder.js`: each has a line there).

| Call | Returns |
|---|---|
| `rec.run({ motion, fps, durationS, offsetS, format, resolution \| size, modulation, timeline, previewS, motionOptions, onProgress })` | `{ files: [{ name, blob, bytes, firstFrame, lastFrame }], width, height, fps, frames, motion, durationS, offsetS, format, bitrate, diskBacked, wallMs, id }` |
| `rec.plan(options)` / `rec.estimate(options)` | the numbers a panel shows before the tap (or a sentence thrown) |
| `rec.encoderPath(options)` | what the preflight would take: `{ kind: 'webcodecs', codec, … }` or `{ kind: 'none', why }` |
| `rec.cancel()` · `rec.running()` · `rec.state()` · `rec.subscribe(fn)` | the run's state (`phase`, `progress`, `last`, `lastError`, counts) |
| `rec.recoveries()` · `rec.recover(job, { onProgress })` · `rec.discard(result)` | the stored renders; resume one; remove a finished one |
| `rec.selfTest(options)` · `rec.selfTestLines(res)` · `rec.dumpLines()` | the check, and its text |

Defaults are BASINS' panel defaults: modulation **OFF**, timeline **ON**, 1080p, MP4. `modulation` and `timeline` are booleans in the API (the panel's selects are `off`/`on`).

## Parts, and tests

| File | Is |
|---|---|
| `mir/render/recorder.js` | the recorder |
| `clock.js` | the record clock: enter, frame, exit |
| `plan.js` | frame plan, beat range, bitrate, ladder, estimate, ceiling (pure) |
| `mp4.js` | the muxer (pure) |
| `encoder.js` | `WcSink`, the path decision, the preflight, one PNG frame |
| `store.js`, `store-worker.js` | the store on disk with recovery |
| `selftest.js` | RUN SELF-TEST |
| `panel.js`, `render.css` | the panel, the card, the sheet (files are handed over with `folders/save-blob.js`) |

`tests/render.node.mjs` (the plan and the timeline ranges through the stepped clock, the muxer, the ZIP parts, the clock's four modes, repeatability, restore, a hidden page, the pattern's velocity, the store against an in-memory file system: create, checkpoint, interrupt, recover, resume, finish, discard) and `tests/render.browser.mjs` on `tests/fixtures/render.html` (a real browser, real pointer events, every press hit-tested): a 12-frame PNG render of the active range whose content follows the beat exactly, twice byte for byte, with the clock hidden, with the screen held; an MP4 and its preflight, an interrupted MP4 recovered and resumed, a refused resume; an app motion; the input guard; Escape and CANCEL; the panel in FOLDERS and in a rack card; RUN SELF-TEST.

Not proved: a 4K or an hour-long render; the Safari worker writer and the share sheet (Chromium only: no WebKit run); a wide-gamut (`display-p3`) film; a real GPU frame source (the fixture is a 2D canvas); a hidden *tab* (the clock's hidden state is, the browser's `document.hidden` is not).
