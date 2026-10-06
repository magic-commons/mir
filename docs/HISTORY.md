# MIR · history and project parts

One undo ring, its list, its window, the way a gesture is named, and one seam for "this window is part of the project". Lifted from BASINS (2026-10-01 and 2026-10-05), no framework. An app that wants BASINS' HISTORY window writes:

```js
import { createHistory, adoptTimeline } from './mir/history/history.js';
import { createHistoryWindow } from './mir/history/window.js';

const history = createHistory();
history.register('colour', { read, write });            // the app's own domains (the picture's state)
const hw = createHistoryWindow({ history, host: floats, mod, present, stage: canvas });
history.clear('SESSION');                               // once every domain is in
// hw.toggle()  → WINDOW › HISTORY      Ctrl/⌘+Z · Ctrl/⌘+Shift+Z · Ctrl/⌘+Y already work
```

Tests: `tests/history.node.mjs`, `tests/project.node.mjs`, `tests/history-window.browser.mjs`, `tests/kit-paint.browser.mjs`.

## `mir/history/window.js` — the window

`createHistoryWindow({ history, host, id = 'history', title = 'HISTORY', mod, present, canAct, stage, windows, keys = true, gestures = true, storageKey = 'mir.history.window', persist, dock, chips, size = { w: 320, h: 440 }, min = { w: 240, h: 200 }, say, onOpen, onClose })` → `{ win, root, history, list, open(), close(), toggle(), isOpen, rows(), paint(), destroy() }`.

BASINS' window, on the kit's one window species (`createWindow`): the notebook's frame, HISTORY with ↶ ↷ × in the head, the rows newest first (the one you stand on lit, the future dimmed, a click returns to that row), the count and CLEAR in the foot. Empty glass drags it; the rail, the dock, the raise and the persistence are the window's. It remembers its shape under `storageKey` and first opens where BASINS' does: left of the right rack, 12 % down.

| Option | Does |
|---|---|
| `mod` | registers the modulation domain (below); `present()` is called after a write |
| `keys` | Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, Ctrl/⌘+Y in the capture phase, never in a text field, never while `canAct()` is false (a render is running); "Nothing to undo" through the kit's notice, or your `say` |
| `gestures` | the listeners below, so a pointer gesture is one row |
| `stage` | where a press is the picture's, not an edit: an element, a selector, or `(node) => bool` |

It costs nothing while closed: it repaints once a frame and only while open.

## `mir/history/gestures.js` — naming a gesture

`installHistoryGestures(history, { target = document, stage, windows = '[data-mir-window]', press = [0, 2] })` → remove, and the pure `gestureName(node, { windows })`.

- A pointer gesture is **one row**, named for the control it began on, read off the DOM when the gesture starts: **CONTROL · WINDOW** (`SIZE · SCENE`). The window is the nearest `[data-mir-window]` (its accessible name, else its id) or a rack card's eyebrow. The control is the nearest widget class the kit draws (`.k .sw .seg-b .trig .fd .m2k .m2dev`, a button, a select, an input, anything with an aria-label), and its words are the label the kit wrote on it, in the language on screen. Nothing looks for English text in a selector. The name is stored as written; the sheet puts it in capitals (`--label-case`).
- An `input` or `change`, a wheel turn, or a key released on a control inside a window settles after the stack's 400 ms quiet window (`note`).
- A press on the picture (`stage`) is released with `absorb`: it is not an edit. A press that is not a person's (`isTrusted` false: a control's forwarded copy) is not a second gesture. Blur releases every held gesture.

## `mir/history/domains.js` — the modulation domain

`registerModulation(history, mod, { present, name = 'modulation' })` → unregister, `modulationDomain(mod, { present })` → `{ read, write, key }`, `rackKey(rack)`.

The rack is written back **the way a preset loads**: the registry's bases restored, `deserializeRack`, dormant routes re-marked, targets re-synced, the clock re-asked, the window rebuilt. The LFOs' and ENVs' phases are snapshotted first and put back, so an undo does not restart them (unless a hold is live). The key is the authored rack: no id counters, no value on a macro a source is driving, no card folding, so a running source or a folded card is never an edit. It needs nothing but what `installModulation` already returns. The colour, camera and picture domains are the app's; the timeline's is `adoptTimeline`.

## `mir/history/history.js` — the stack (no DOM)

```js
import { createHistory } from './mir/history/history.js';
const history = createHistory({ limit = 256, bytes = 32 MiB, quiet = 400, now, timers });
```

- **Domains.** `register(name, { read, write, key? })` is a *snapshot* domain: the stack reads it whole and writes it whole (`key(snap)` is the equality string, default `JSON.stringify`). `register(name, { delegated: true })` is a domain whose owner pushes rows and keeps its own undo; the row only calls it. Returns an unregister function.
- **Rows.** `push({ label, domain, domains, size, undo, redo })` (an `undo` that returns `false` means the owner no longer holds it: the row is dropped and the next one answers). `record(names, label, before, after)` is one row over one or several snapshot domains. `change(name, label, fn)` makes a programmatic edit one row, or none if nothing changed.
- **Gestures.** `hold(label)` / `release({ absorb? })` bracket a pointer gesture: it lands as ONE row on the next task, named for the gesture. `note(label)` is an edit with no pointer (a select, a typed number): it settles after `quiet` ms. `release({ absorb: true })` says it was not an edit (a drag on the picture). `settle()`/`flush()` land now. `label(name)` renames the pending row. `absorb()` re-baselines everything.
- **Travel.** `undo()`, `redo()`, `goto(i)` (`-1` is START), all returning whether anything moved. A travel is never an edit: while a row runs, `applying` is true and notes and pushes are ignored.
- **Housekeeping.** `forget(domain)` drops a domain's rows; `clear(label)` starts a fresh stack on the live state with the bottom row named (`OPEN · NAME`, `SESSION`); `subscribe(fn)`; `entries()` is the list a view draws, oldest first, each `{ i, label, domain, at, state: past|current|future }`. Getters: `canUndo canRedo cursor length bytes limit maxBytes applying holding pendingLabel`.

### The laws

1. One app-level list of named rows; any row is one hop away.
2. An edit truncates the future. A gesture is one row (many moves under one `hold` coalesce). A gesture that moved nothing leaves no row and takes its name with it.
3. Only an *announced* edit (a released gesture, a note inside its quiet window) lands before what comes next. A change nobody announced (boot, a programmatic write) is absorbed at the next gesture and is never a row.
4. Caps: `limit` rows and `bytes` (UTF-16, both sides of a row). The oldest fall off the front; the newest row always survives, even past the byte cap.
5. A travel is not an edit.

## `mir/history/history-list.js` + `history.css` — the view and the keys

- `historyList(history, host, { tools = true, count = true })` → `{ root, paint, state(), onChange(fn), destroy }`. `tools: false` and `count: false` leave UNDO / REDO and the count line to the host (BASINS draws ↶ ↷ in its window's head and the count beside CLEAR in its foot); `state()` → `{ canUndo, canRedo, length, count }` and `onChange(fn)` (called with that state after every change) are what the host's buttons need. `historyState(history)` is the same, pure. `limitLine: false` is the old name of `count: false`. Draws newest first, rows past / current / future, a click is `goto`, UNDO and REDO are the kit's `trig`. Repaints once a frame, only while visible; writes go through `setText`. The frame, placement and persistence of the window are the host's. CSS is in `@layer mir.kit.house`, tokens only.
- `installHistoryKeys(history, { target = window, canAct, onEmpty })` → remove. Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y, capture phase; text fields keep their own undo (`editableTarget`); `canAct()` false (a render running) lets the key through.
- Gesture wiring (pointerdown → `hold(name)`, `input`/`change` → `note(name)`, naming a gesture from the DOM) is `gestures.js`, above; the frame around the list is `window.js`.

## `mir/core/project.js` — the parts

`registerProjectPart(name, { capture, restore, signature, subscribe? })`, `captureProject()`, `restoreProject(data, ctx)`, `projectSignature()`, `subscribeProject(fn)`, `projectPartNames()`; `createProjectParts()` makes an isolated registry (the named exports are the app's shared one).

- `capture()` → JSON, or `null` to be left out of the file. `restore(saved | null, ctx)` — `null` means the project never had the part; the part decides.
- **Order:** registration order; registering a name again replaces the part and keeps its place.
- **Errors:** a part that throws is isolated. On capture it is left out; on restore the others still restore and `restoreProject` returns `{ failed: [names] }`; in the signature it reads `name:?`. Nothing is thrown or logged; the caller decides.

## What each replaces

| Here | Replaces |
|---|---|
| `history.js` | BASINS `app/history.js` (`createHistory`; `adoptTimeline` stays in the app: it reads its timeline model). λWAVES `lab/history.js`: one flat snapshot stack, which becomes one snapshot domain per window. |
| `history-list.js`, `history.css` | BASINS `app/history-window.js` list and keys; λWAVES's HISTORY list. |
| `window.js` | BASINS `app/history-window.js` "THE WINDOW" (its hand-built section, its head drag, its `histwin` pref) and `app/history.css`. |
| `gestures.js` | BASINS `app/history-window.js` `gestureName` and its pointer, input, wheel and key listeners. |
| `domains.js` | BASINS `app/history-window.js` `installHistory`'s `modulation` domain and `rackKey`. The colour and camera domains stay the app's. |
| `project.js` | BASINS `app/project-session.js` `registerProjectPart` / `captureParts` / `restoreParts` / `partsSignature` / `subscribeParts` (renamed; `restoreProject` now reports failures; an unregister that has been replaced is a no-op). |
