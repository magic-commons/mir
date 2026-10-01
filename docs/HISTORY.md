# MIR · history and project parts

Three modules, no framework, no storage. Lifted from BASINS (2026-10-01) so every app has one undo ring and one seam for "this window is part of the project". Tests: `tests/history.node.mjs`, `tests/project.node.mjs`, `tests/kit-paint.browser.mjs`.

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

- `historyList(history, host, { limitLine = true })` → `{ root, paint, destroy }`. Draws newest first, rows past / current / future, a click is `goto`, UNDO and REDO are the kit's `trig`. Repaints once a frame, only while visible; writes go through `setText`. The frame, placement and persistence of the window are the host's. CSS is in `@layer mir.kit.house`, tokens only.
- `installHistoryKeys(history, { target = window, canAct, onEmpty })` → remove. Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y, capture phase; text fields keep their own undo (`editableTarget`); `canAct()` false (a render running) lets the key through.
- Gesture wiring (pointerdown → `hold(name)`, `input`/`change` → `note(name)`, naming a gesture from the DOM) is the app's, as in BASINS `history-window.js`: it knows the app's window classes.

## `mir/core/project.js` — the parts

`registerProjectPart(name, { capture, restore, signature, subscribe? })`, `captureProject()`, `restoreProject(data, ctx)`, `projectSignature()`, `subscribeProject(fn)`, `projectPartNames()`; `createProjectParts()` makes an isolated registry (the named exports are the app's shared one).

- `capture()` → JSON, or `null` to be left out of the file. `restore(saved | null, ctx)` — `null` means the project never had the part; the part decides.
- **Order:** registration order; registering a name again replaces the part and keeps its place.
- **Errors:** a part that throws is isolated. On capture it is left out; on restore the others still restore and `restoreProject` returns `{ failed: [names] }`; in the signature it reads `name:?`. Nothing is thrown or logged; the caller decides.

## What each replaces

| Here | Replaces |
|---|---|
| `history.js` | BASINS `app/history.js` (`createHistory`; `adoptTimeline` stays in the app: it reads its timeline model). λWAVES `lab/history.js`: one flat snapshot stack, which becomes one snapshot domain per window. |
| `history-list.js`, `history.css` | BASINS `app/history-window.js` list and keys (its frame, prefs and gesture wiring stay app-side); λWAVES's HISTORY list. |
| `project.js` | BASINS `app/project-session.js` `registerProjectPart` / `captureParts` / `restoreParts` / `partsSignature` / `subscribeParts` (renamed; `restoreProject` now reports failures; an unregister that has been replaced is a no-op). |
