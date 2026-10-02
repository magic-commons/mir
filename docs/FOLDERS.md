# MIR · FOLDERS — the project window

FOLDERS is where a MIR app's **projects** are saved, found and opened: a gallery of pictured projects in folders, in the kit's one floating window. It is BASINS' SAVE window, retitled and split into parts any app can use (Josh, 2026-10-01: *"Refactor the SAVE window and retitle it FOLDERS"*; plan §7 1.5.1, rulings 5 and 6).

Try it at `gallery/folders.html`: a small 2D app whose two knobs, colour and pages are project parts, six starter projects in two folders, and a transport that gives way to the window. `?theme=light`, `?reset` (forget the library), `?break` (a part that refuses one starter, to watch a failed open roll back).

Load `mir/folders/folders.css` after the kit's sheets, `mir/core/core.css` and `mir/window/window.css`. It is in `@layer mir.kit.house`.

## Using it

```js
import { registerProjectPart } from './mir/core/project.js';
import { createFolders } from './mir/folders/folders.js';

registerProjectPart('camera', { capture: () => camera.state(), restore: (v) => camera.set(v ?? camera.home()) });
registerProjectPart('pages', pages.part());          // shell/pages.js: a project carries its pages

const folders = createFolders({
  host: document.getElementById('floats'),          // the floating-window layer
  app: 'myapp',                                       // the app id a project file names (another app's is refused)
  adapter: { thumbnail: () => myCanvas },             // the picture a saved project wears
  onMoved: (r) => rack.dodge(r),                      // the transport gives way
  seeds: STARTERS,                                    // optional: shipped projects, added once
});
menu.add('FOLDERS\tS', () => folders.toggle());
```

An app that registers its parts gets SAVE, SAVE AS, NEW, OPEN, export and import with nothing else. FOLDERS never learns what a part is.

## What the user sees

| Part | What it does |
|---|---|
| The head | the open project's name (UNTITLED when none), and **UNSAVED CHANGES** in accent A when what is on screen is no longer what was saved (the adapter's signature) |
| **SAVE** | writes over the open project in place (same name, same folder). The first time, or over a starter that came with the app, it is SAVE AS (the user's own copy) |
| **SAVE AS** | a new project, named by the NAME field, in the folder typed in SAVE TO (a new path is made by the save). A taken name gets a number (`EMBER 2`); nothing is ever overwritten |
| **NEW** | the empty project. Asks first when what is on screen is unsaved |
| **OPEN FILE** | a `.mir` project file, or a picture that carries one. Dropping either on the window does the same |
| **EXPORT** | the selected project (or the open one, or what is on screen) as a `.mir` file, or as a PNG picture that carries it |
| The explorer | crumbs (ROOT / …), the folders as cards (a cover picture, a count), then the projects as pictured tiles. Tap a tile to choose it, tap again to open it. A chosen tile shows its name and four verbs: ⓘ, MOVE, RENAME, DELETE (DELETE asks "sure?") |
| **Drag to folder** | carry a tile with a mouse or pen: the folders and the crumbs in reach light up, dotted and brightening as it nears, solid when release would land. Escape, a lost pointer or a blur puts it back |
| **MOVE TO** | the touch and keyboard way to do the same: long-press a tile (or right-click, or the context-menu key), or press its MOVE verb. The menu lists every folder as a button; the keyboard lands on the first |
| Folder menu | long-press or right-click a folder: RENAME (onto an existing path it merges), REMOVE FOLDER (its projects go to ROOT; it asks first) |
| The rail | close, the sort (A–Z, Z–A, newest, oldest; depth too when the app gives `depthOf`), and the grip. Shift-drag, long-press or the arrow keys on the grip move the rail to another edge |
| The window | drags by its grip **and by any empty glass** (titles, labels, gaps); a drag that starts on a tile carries the tile instead. Resizes from its corner. Opens and closes with motion. Reports its rect so a transport can dodge it |
| The status line | what happened, in words; a refusal in the warning ink |

## The API, as built

**`createFolders(options)`** (`mir/folders/folders.js`)

| Option | Default | What it is |
|---|---|---|
| `host` | `document.body` | where the window and its rail are appended (the floating layer) |
| `id` | `'folders'` | the window id: `data-mir-window`, `data-mir-rail` |
| `title` | `'FOLDERS'` | what the user reads (the accessible name and the rail's) |
| `store` | `'mir.folders'` | the library's storage key |
| `storage` | `localStorage` | anything with `getItem` / `setItem` / `length` / `key` |
| `prefs` | `localPrefs(storage, store + '.window')` | `{ read() → object \| null, write(object) }`. FOLDERS writes the window's shape `{ x, y, w, h, open, dock, chipSide }` and `gallery: { sort, parts }` **merged into** what is there, so an app's other fields survive |
| `app` | — | the app id written into an exported project and required of an imported one |
| `adapter` | the kit's parts | `{ capture, restore, signature, thumbnail, empty, subscribe, facts }`, each optional (below) |
| `seeds` / `seededKey` | — / `store + '.seeded'` | starter projects (below) |
| `size`, `min` | `380×680`, `280×360` | the floating size and its floor |
| `dock` | none | `{ span, guide }` as `createWindow` takes it; omitted, FOLDERS floats |
| `onMoved(rect \| null)` | — | after every layout; `rack.dodge` fits here |
| `firstSeat()` | top right | `{ x, y }` for the first open, before a hand has placed it |
| `say(text, warn)` | the window's status line | the app's own voice instead (a toast) |
| `download(blob, name)` | an `<a download>` | how an export leaves |
| `picture(entry)` | the saved thumbnail | a canvas or Blob to embed the project in on EXPORT › PICTURE (the app's own render, at full size) |
| `defaultName`, `capChars` | `'UNTITLED'`, 2.6 M | passed to the store |
| `parts` | none | `[{ id, label }]`: component switches (BASINS: MODULATION, COLOUR, POSITION). None: no switches |
| `sorts` | A–Z, Z–A, N↓, N↑ | sort ids; all six when `depthOf` is given |
| `actions` | `save saveAs fresh open export` | the toolbar's verbs, in order |
| `depthOf(entry)`, `factory()`, `capturePicture`, `savePicture`, `pictureStale`, `onInspect`, `onOpened` | — | BASINS' gallery hooks, passed through |

Returns `{ win, files, gallery, adapter, seeded, intake, open(), close(), toggle(), isOpen(), save(), saveAs({ name, folder }), fresh(), openEntry(id, { force }), current(), dirty(), seed(list), exportProject('mir' | 'png'), importEnvelope(env), ingest(input), say(text, warn), state(), destroy() }`.

**`createProjectAdapter(options)`**, **`openWithRollback(adapter, data)`**, **`emptyProject(adapter)`**, **`restoreOk(r)`** (`mir/folders/project.js`, pure).

**`createFiles({ key, storage, capChars, defaultName })`** (`mir/folders/files.js`, pure): BASINS' library model. `save`, `overwrite`, `rename`, `move`, `remove`, `renameFolder`, `deleteFolder`, `setFolderPicture`, `folderPicture`, `saveMakingRoom`, `evictOldest`, `entries`, `entry`, `folders`, `count`, `proposedName`, `state`, `subscribe`, `reload`; and `normalizeFolder`, `uniqueName`, `entryOk`.

**`seed(files, starters, { storage, seededKey })`** (`mir/folders/seed.js`, pure).

**`buildGallery(panel, options)`** (`mir/folders/gallery.js`): the explorer by itself, for a second view such as a rack card (`pageSize: 8` pages it).

## The adapter contract

| Hook | Returns | Default |
|---|---|---|
| `capture()` | the project as JSON | `{ parts: captureProject() }` |
| `restore(data)` | `true`/nothing = it took; `false`, `{ ok: false, why }` or `{ failed: [names] }` = it did not | `restoreProject(data.parts)` |
| `signature()` | a string: equal means unchanged | `projectSignature()` |
| `thumbnail()` | a canvas, a Blob, a data URL, or null | null (a tile with no picture) |
| `empty()` | as `restore` | `restore(null)`: every part restored with null |
| `subscribe(fn)` | an `off()` | `subscribeProject` (parts that subscribe repaint the unsaved mark) |
| `facts()` | small JSON kept beside the entry (BASINS: the depth) | `{}` |

**The three-scope law** (λWAVES 0.3.1): **NEW is the empty project** — every part is restored with null, and each part decides what nothing is for it. **A failed open rolls back**: what is on screen is captured first; if the restore does not take, that capture is restored and the status line says which part refused and that what was open is back. If the rollback fails too, it says that. Preferences never go in a project: keep them out of your parts.

A saved project is the `project` envelope's `data` (`docs/FORMAT.md`): `{ parts: { name: json } }`. EXPORT wraps it as `{ mir: 1, kind: 'project', app, name, data }`.

## Seeding

```js
seeds: [{ name: 'EMBER', folder: 'STARTERS', data: { parts: { … } }, thumbnail: 'data:image/jpeg;…', readOnly: true }]
```

Each starter is added **once**, counted by its `id` (default `folder/name`) in a list under `seededKey`. One the user deleted stays deleted. A library that already holds it (an entry with that `facts.seedId`) is not given a second. A name the user already used in that folder is suffixed, so the user's project is never touched. `readOnly` starters cannot be saved over or renamed (SAVE makes the user's copy; DUPLICATE too); they can be deleted.

## The laws

| Law | Why |
|---|---|
| **What the user reads changes; what a browser stored does not** | `id`, `store` and `prefs` are options. A renamed key loses every saved library and seat |
| **The window takes the pointer by its class** (`.mir-win`, window.css), never by an id | BASINS' 09-18 dead window: an id-keyed `pointer-events` rule was missed and every click fell through. `tests/folders.browser.mjs` hit-tests every verb, field, folder, chip and the empty glass with `elementFromPoint` |
| **Two file systems, kept apart** | FOLDERS saves projects; the notebook's shelf (`mir/notes/`) saves notes. Neither reads the other's store, neither opens the other's window. A project's pages ride inside it as a part |
| **Nothing is overwritten by accident** | SAVE AS suffixes; a seed suffixes; a full library refuses with the numbers and offers MAKE ROOM; an unreadable library or record is set aside under `<store>.refused-<time>` before the first write |
| **A failed open changes nothing** | rollback, and it is said |
| **One window species** | `createWindow` — no second shell, no CSS cloned at runtime |
| **One drop guide** | `core/proximity.js`: the guide is drawn at the folder's own rect, the rect a release lands in |

## BASINS: what it deletes, and what it passes

**It passes its old names**, so nobody loses a library or a layout:

```js
createFolders({
  id: 'savewin', store: 'basins.library', app: 'basins', defaultName: 'FRACTAL',
  prefs: { read: () => readPrefs().savewin || null, write: (v) => writePrefs({ savewin: v }) },
  adapter: { capture, restore, signature, thumbnail, empty, facts },   // save-window.js:179-263, minus the gallery's wording
  parts: [{ id: 'rack', label: 'MODULATION' }, { id: 'look', label: 'COLOUR & BRIGHTNESS' }, { id: 'place', label: 'POSITION' }],
  depthOf, factory: restoreFactory,
  onMoved: (r) => shell.workspaceMoved(r),
});
```

`savewin`'s existing `{ x, y, w, h, open }` read straight through `readShape`; its `gallery`, `rackGallery`, `placed`, `tab` and `tallGalleryV1` are kept (FOLDERS merges, never replaces). `basins.library` is read by the same `files.js`, so every saved project opens. BASINS' payloads are not `{ parts }`: it keeps its own `capture`/`restore` in the adapter and the store holds them as they are.

**It deletes:**
- `mir-plugins/files/files.js`, `gallery.js`, `save.css` (the kit's copies replace them; `save.css`'s RENDER rules move with RENDER);
- `save-window.js`'s window construction and the sheet hack (`:339-396`: kwin, the `.sv-sheet` insert, hiding `kwin.body`) and the sort chip's text ink (`:378-386`);
- later, its `seedStarters` (`:82-94`): `seeds` counts a starter by `facts.seedId`, BASINS' starters carry `facts.starterId`, so it moves over only with a one-time copy of `starterId` into `seedId` (and `seededKey` must not be `basins.library.factory-seeded`, which holds a time, not a list);
- `kwin.js`'s legacy drag path, which lived on only for SAVE (survey B §2c);
- the pointer-events give-back `save.css:18` and the `#savewin` rules in `material.css:163` and `surface-material.css:9, :34, :59` (the kit window has no `#savewin` id: select `[data-mir-window="savewin"]` where an app rule is still wanted).

**It keeps:** `buildRender` (it becomes its own RENDER window and rack card, ruling 5), JOSH'S LIBRARY and the factory gallery (`factory()`), the session keep, presets on save, and the rack card gallery (`buildGallery(rackSave.body, { pageSize: 8, … })`).

## The retitle hazards

1. **The id.** BASINS' `#savewin` carried the rule that made the window answer the mouse. Here nothing does: `.mir-win` takes the pointer by class. Any app rule that named `#savewin` must name `[data-mir-window="savewin"]` or it silently stops applying. The hit-test gate, not a synthetic click, is what proves it.
2. **The rail label.** The rail's accessible name is now `FOLDERS window controls`. BASINS rigs and the scene-input guard that select `"SAVE window controls"` (survey B §1) must move to `[data-mir-rail="savewin"]`.
3. **The menu row and the key.** WINDOW › SAVE becomes FOLDERS; the `S` key stays.
4. **The store and the prefs key.** Never renamed (ruling 6).
5. **The rack card ids** `rackSave` / `rackRender` stay; only their eyebrow text may change.

## Not built

- **RENDER as its own window** (ruling 5): the app's, from BASINS' `buildRender`.
- **The timeline's assets** (audio clips and their files) inside a project: a part the timeline registers, later.
- **The title card** (plan §8.5): Josh is still designing it. A project's first page is its greeting today (`shell/pages.js`).
- **Minimise.** The kit window opens and closes with motion; it has no minimised state yet (a `window/` change).
- **A second live view** (BASINS' rack card gallery) is possible with `buildGallery`, but the two do not share one subscription registry (survey B §2b, item 6).
- **Drag to folder by touch.** A finger long-presses for MOVE TO instead: a tile carried by a finger would fight the gallery's scroll.

## Proofs

- `tests/folders.node.mjs`: the store (save, SAVE AS, overwrite, rename, delete, folders, move, merge, duplicate, a corrupt record skipped and set aside, a refusing browser), the seeds (once, never over the user's, a deleted one stays deleted, read-only), the adapter (a good open, NEW, an open whose part throws rolls back and says so, a rollback that fails is said).
- `tests/folders.browser.mjs` on `gallery/folders.html?reset&test`, real CDP mouse and keys, every press hit-tested first: the window takes the pointer everywhere it should; open by two taps; SAVE over a starter makes the user's copy; a knob drag lights the unsaved mark and SAVE puts it out in place; another project restores the knobs, the colour and the pages; NEW is the empty project; a tile carried to a folder lights it solid at its exact rect and lands; Escape mid-carry leaves it; MOVE TO by the keyboard; Shift-drag moves the rail; empty glass moves the window and a tile drag does not; the transport takes its other seat; EXPORT `.mir` and PNG, and dropping each back opens the project; another app's file is refused with the reason; a reload keeps the library and seeds nothing twice; a failed open rolls back (`?break`). `MIR_PLATES=1` writes `docs/plates/folders/{dark,light,carry}.png`.
- Not proven: WebKit or a real iPad (the long press for MOVE TO runs only under a real finger), a real OS file drop (the test drops a `DataTransfer` built in the page), the library-full refusal in a browser (node only).
