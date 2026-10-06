# MIR · AUDIO — a microphone, an audio clip, the asset store, the project ZIP

Four parts of one thing, harvested from BASINS (`app/audio.js`, `audio-clip.js`, `audio-assets.js`, `audio-playback.js`, `export-zip.js`): a **microphone** that feeds the modulation window's AUDIO device, an **audio clip** you drop on a timeline lane, the **asset store** that keeps the file by its content, and the **project ZIP** that carries a project and its audio in one file. KEEP AUDIO is proved in Chromium only (BASINS' own state: its WebKit cannot host an AudioContext in the app page); no WebKit run.

## Use it

```js
import { installModulation } from './mir/modulation/bind.js';
import { installTimeline } from './mir/timeline/bind.js';
import { createFolders } from './mir/folders/folders.js';

const mod = installModulation({ mount, params });          // the microphone is the kit's: no `audio` option needed (`audio: false` leaves it out)
const tl = installTimeline({ mount, mod, say, busy: () => recorder.running() });   // the audio clip installs with it: a drop on a lane, ⋯ › ADD AUDIO…, the popup, the playback (`audio: false` leaves it out; `tl.audio` is `installAudioDrop`'s handle)
const folders = createFolders({ host, app: 'myapp' });      // SAVE AS ZIP… and OPEN ZIP… are in the window
```

An audio file dropped on a lane (or ⋯ › ADD AUDIO…) opens a small popup: **DRIVES** (the target the envelope drives), **KEEP AUDIO** (the envelope drives the target and the file plays with the transport), **SIGNAL ONLY** (the envelope drives it and the file stays silent), CANCEL. The clip shows the waveform; its menu (the clip's ⋯) has ENVELOPE · LEVEL / LOW / MID / HIGH, KEEP AUDIO ↔ SIGNAL ONLY, and STRETCH TO CLIP · Shift+T.

## The microphone — `mir/modulation/audio-capture.js`

`createAudioCapture({ onState, deviceId }) → { state, reason, live, deviceId, frames, sampleRate, inputLatencyMs, analysisLatencyMs, visualLatencyMs, latencyMs, processing, support(), start(id?), stop(), suspend(), resume(), setHidden(v), read(feedHz), devices(), dispose() }`. `installModulation` uses it unless the app passes its own factory (or `audio: false`); the chosen input's id is kept in the modulation record (`audioDevice`) and the input picker is the AUDIO device's own.

`read(feedHz)` is the six numbers the model's follower wants: `rms` (linear amplitude), `bandPower: [low, mid, high]` (linear mean power; bands 20–250, 250–2000, 2000–16000 Hz, contiguous), `flux` (the sum of the rises of the spectrum), `capturedAt`, `feedHz`, `sampleRate`. No calibration, smoothing, threshold or onset logic is here: the model owns them.

| Law | Why |
|---|---|
| Adding a device never opens the microphone; only a press on its MIC does | a window that asks because you opened it is a window nobody opens twice |
| `stop()` stops every track and closes the context; the host calls it when the last audio device goes | a suspended context still holds the device and the recording light |
| Hiding the page suspends the analysis, not the capture | alt-tabbing must not cost you the microphone. The honest close is one press of MIC. The host reports visibility (`setHidden`); this file watches nothing |
| Nothing is recorded, stored or sent: source → analyser, never to the speakers | a microphone to the speakers is a feedback loop. The only thing kept anywhere is the input's id |
| Echo cancellation, noise suppression and auto gain are off, **mandatorily** (`{ exact: false }`) | a bare `false` is an ideal constraint that never fails, and AGC fights the follower; `processing` says what the browser really gave |
| One start at a time (a ticket); a cancel during the prompt cancels | two presses once leaked a stream and a context with the light on |
| The first frame after an open or a resume reports flux 0 | a spectrum differenced against silence is a phantom onset |

States: `idle · asking · live · denied · nodevice · unavailable · error`, each with a `reason` sentence for the face ("you said no", "there is no microphone" and "this browser cannot" are three different things).

## The audio clip — `mir/timeline/audio-*.js`

| File | What |
|---|---|
| `audio-kind.js` | the kind: the source, its check, the lookup, the tempo law, Shift+T, the in-place patch, the budget, the paint, the clip menu |
| `audio-analysis.js` | `analyseAudio(channels, sampleRate)`, `audioClipFromFile(file, { bpm, keep, band, store })`, `isAudioFile`, `audioBaseName`, `AUDIO_PEAK_RATES` |
| `audio-playback.js` | KEEP AUDIO: `createAudioPlayback({ model, mod, controller, retempo, busy })`, the pure `audioPlacement(clip, curve, beat, bpm)` |
| `audio-drop.js` | `installAudioDrop(editor, { mod, controller, say, busy, store })` → `{ add, addAll, pick, choose, playback, retempo, dispose }` |

**The source** (what the project file, a recorder and the signature see): `{ kind: 'audio', assetId, seconds, bpm, band, keep, envelope, color }`. `assetId` is the file's content hash; `bpm` is the tempo its beats were measured at; `band` ∈ `level · low · mid · high`; `envelope` is base64 Uint8 at 100 Hz, ⌈seconds·100⌉ samples. The file's bytes and the peaks live in the asset store, never in JSON: a project whose file is missing still drives (the envelope is in the project) and paints without peaks; KEEP AUDIO stays silent until the file is back (the ZIP brings it).

**The envelope law** is the AUDIO device's, offline: the mono mix in 10 ms windows; LEVEL = RMS through `audioDbAmp`; LOW / MID / HIGH = mean square after RBJ Butterworth biquads (Q = 1/√2) at the capture's edges (250 and 2000 Hz) through `audioDbPow`; each through `audioNorm` (−60 dBFS → 0, −6 dBFS → 1) and the model's own follower (`AUDIO_FOLLOW_DEFAULTS`, `audioAlpha` at 100 Hz); quantised. Sample *i* is the window centred on (*i*+½)/100 s, interpolated; silence before 0 and past the end. Peaks: min/max Int8 at 400 · 100 · 25 · 6.25 buckets a second.

**The tempo law.** A natural clip (rate 1) keeps its **seconds** when the tempo changes: its scale and its beat length are re-derived. A stretched clip (Shift+T, or STRETCH TO CLIP) keeps its **beats**, and its varispeed rate follows the tempo (pitch follows). The watcher is the transport's own events and tick, never a poller. **The re-derive is not an edit** (1.5.0-alpha.13): `model.rederive()` changes the derived fields with no snapshot, and `readjustAudioTempo` calls the unwrapped method under the one history, so a tempo change while playing adds no undo row; while a gesture is open in the model it defers (returns `null`) and the next tick asks again. Undoing past a tempo change restores clip fields as they were then; the next tempo change re-derives from the transport's tempo.

**KEEP AUDIO.** One buffer source per sounding clip, placed from the transport's beat; no second clock. Re-placed on seek and whenever its position drifts more than 60 ms; a 200 ms lookahead gives a clean onset; **leased**: every node is told to stop within a second and renewed each tick, so a node no tick renews (a recording, a hidden tab, a pause that bypassed the controller) falls silent by itself. Muted while a recorder owns the clock (`busy()`): it records no audio. SIGNAL ONLY never creates an AudioContext.

**The budget.** 64 audio clips, and 20 minutes of *distinct* decoded audio (a clip of an asset already on the timeline costs no seconds); a file over 20 minutes is refused before analysis. Counted for **every** audio clip however it was made (1.5.0-alpha.13; BASINS counted only the add): the model asks `audioBudgetAdding` in `create`, `pasteClips` (so DUPLICATE) and `duplicate` (so SLICE), before its one edit, so a refusal is **whole**: nothing half-applied, no history row, and `model.lastRefusal` is `{ why, vars }` (an English key and its values) for the caller to say with `t(why, vars)`. The add says the same sentence ("No room: 64 audio clips is the budget.").

**The project.** `installAudioDrop` registers a project part `assets`: `{ audio: [{ id, name, seconds }] }`; restoring it says how many of those files this browser lacks.

## The asset store — `mir/core/assets.js`

`assetId(bytes)` (first 128 bits of SHA-256; a two-lane FNV-1a outside a secure context), `createAssetStore({ name, indexedDB })` → `{ put(meta, bytes), meta(id), load(id), bytes(id), list(), delete(id), id }`, the shared `assets`, `useAssets(store)`, `toBase64`, `fromBase64`. File bytes, peaks and envelopes by content hash in IndexedDB (database `mir-assets`; stores `audio` and `audio-bytes`, the names BASINS used); without IndexedDB it answers from memory for the session. An app that already keeps files elsewhere names its database once, before first use: `useAssets(createAssetStore({ name: 'basins-assets' }))`. The bytes are copied in; a failed write keeps them in memory; nothing throws.

## The project ZIP — `mir/core/zip.js`, `mir/folders/zip.js`, FOLDERS

FL Studio's "Save project as zip": the current project and the audio it uses in one file. **SAVE AS ZIP…** and **OPEN ZIP…** are in FOLDERS' gallery foot (`createFolders({ zip: false })` removes them; `zip: { store, validate(project) }` names the asset store and what a project must be); a `.zip` dropped on the window, or chosen with OPEN FILE, opens too. The file is `<name>.<app>.zip`, and leaves through `saveBlob` (a Blob and `<a download>`; the share sheet on iPad). The layout is in `docs/FORMAT.md`.

**Opening is checked, then written, then rolled back if it fails.** The ZIP is read and every entry passes its CRC-32 before anything is written; an asset is taken only when its bytes hash to its own name; an id already in the store is skipped (never rewritten); a ZIP with no project or one `validate` refuses changes nothing; the project is saved under its own name in the current folder (a clash is numbered by the library, never an overwrite) and opened; if the library refuses it (full, quota) the assets this open wrote are deleted again. A damaged ZIP says `That is not a project zip: <why>`.

`core/zip.js`: `StoredZip` (`add(name, bytes)`, `finish() → Blob`; a part stays under 32-bit offsets and `add` throws `ZIP part is full` for the caller to start the next part), `PngZipPart` (the same class: the recorder's frames), `readStoredZip(bytes) → Map`, `zipSafeName`. Stored, never deflated: audio and PNG are already compressed. `folders/zip.js`: `projectZip`, `readProjectZip`, `restoreAssets`, `rollbackAssets`, `projectAssetIds`. `folders/save-blob.js`: `saveBlob(blob, name) → 'share' | 'download'`, `prefersVideoDownload()` (an iPadOS video is a download, never a share: the share sheet has terminated the page on a large movie).

## What BASINS can delete

| BASINS | Lines | Becomes |
|---|---|---|
| `audio.js` | 438 | `modulation/audio-capture.js` (and `installModulation`'s default) |
| `audio-clip.js` | 278 | `timeline/audio-kind.js` + `audio-analysis.js` + `audio-drop.js` |
| `audio-assets.js` | 110 | `core/assets.js` + `folders/zip.js` (`useAssets(createAssetStore({ name: 'basins-assets' }))`) |
| `audio-playback.js` | 72 | `timeline/audio-playback.js` |
| `export-zip.js` | 72 | `core/zip.js` |
| `starter-gallery.js` | 32 | `folders/seed.js` revisions (`revision`, `replaces`) |
| `export.js` `saveBlob`, `prefersVideoDownload` | ~45 | `folders/save-blob.js` |
| `save-window.js` SAVE AS ZIP / OPEN ZIP | ~50 | FOLDERS |
| `audio.css` the popup rule | 3 | `timeline.css` (the join) |

## Proofs

Node (BASINS' own tests, ported with their assertions, two changed on purpose): `tests/audio-clip.node.mjs` (the envelope of a ramped tone within 0.77 %, bands, tempo law, Shift+T, placement, budgets, **no undo row for the re-derive**), `audio-budget.node.mjs` (**duplicate, paste and slice are counted, whole**), `audio-zip.node.mjs` (round trip, a second import skips, a tampered ZIP refused by CRC, a swapped asset rejected, a failed write rolled back), `zip.node.mjs`, `folders-seed.node.mjs`, `audio-capture.node.mjs` (a scripted microphone). Browser: `tests/audio.browser.mjs` (Chromium, real input, every press hit-tested): a generated WAV dropped on a lane becomes a clip with a waveform; the clip menu; KEEP AUDIO sounds; SAVE AS ZIP… then a dropped `.zip` restores it. Not proved: WebKit, a real microphone (the capture is run against a scripted one), an iPad.
