# MIR · FOLDERS — the project window

FOLDERS is where a MIR app's **projects** are saved, found and opened: a gallery of pictured projects in folders, in the kit's one floating window. It is BASINS' SAVE window, retitled and split into parts any app can use (Josh, 2026-10-01: *"Refactor the SAVE window and retitle it FOLDERS"*; plan §7 1.5.1, rulings 5 and 6).

**BASINS is the design** (Josh, 2026-10-02: *"Prefer BASINS … If a feature is similar or the same on Basins/Lambdawaves, then use their design"*). Out of the box FOLDERS is BASINS' SAVE window with the word FOLDERS where BASINS says SAVE: its toolbar, its panel switch, its rail on the right, its top-right seat, its toast, its "save this first?" over an unknown screen. What BASINS does not have is an option an app turns on (FOLDERS' own verbs, the name line, the in-window status line).

Try it at `gallery/folders.html`: a small 2D app that turns on FOLDERS' own options (SAVE · SAVE AS · NEW · OPEN FILE · EXPORT, the name line, the status line), whose two knobs, colour and pages are project parts, with six starters in two folders and a transport that gives way to the window. `?theme=light`, `?reset`, `?break` (a part that refuses one starter, to watch a failed open roll back). `tests/fixtures/folders-basins.html` is FOLDERS mounted with BASINS' exact options.

Load `mir/folders/folders.css` after the kit's sheets, `mir/core/core.css` and `mir/window/window.css` (and `mir/shell/parts.css` for the toast). It is in `@layer mir.kit.house`.

## Using it

```js
import { registerProjectPart } from './mir/core/project.js';
import { createFolders } from './mir/folders/folders.js';

registerProjectPart('camera', { capture: () => camera.state(), restore: (v) => camera.set(v ?? camera.home()) });
registerProjectPart('pages', pages.part());          // shell/pages.js: a project carries its pages

const folders = createFolders({
  host: rack.el.floats,                               // the kit's float layer (#floats): the window takes the pointer there
  app: 'myapp',                                       // the app id a project file names (another app's is refused)
  adapter: { thumbnail: () => myCanvas },             // the picture a saved project wears
  rack,                                               // its first seat keeps clear of the racks and the bar
  onMoved: (r) => rack.dodge(r),                      // the transport gives way
  seeds: STARTERS,                                    // optional: shipped projects, added once
});
menu.add('FOLDERS\tS', () => folders.toggle());
```

With `createApp()` (`mir/app.js`) FOLDERS is made for you (`app.folders`, F and Ctrl/⌘+S in the key table, a latch on the bar), and every `app.param()` is already a project part.

An app that registers its parts gets saving, opening, NEW and import by drop with nothing else. FOLDERS never learns what a part is.

## The word on the glass (what BASINS shows where)

Read from BASINS (`save-window.js`, `mir-plugins/kwin/kwin.js`, `shell.js`; adoption branch, 2026-10-02):

| Where | BASINS' SAVE window | FOLDERS |
|---|---|---|
| On the glass | **nothing**: kwin builds a title bar (`.kwin-title`, "SAVE") but the window is `kwin-chips-only`, which hides it; the GALLERY / RENDER tab strip stays in the DOM for assistive tech only | nothing (`head: true` adds the open project's name and UNSAVED CHANGES; `status: true` a status line) |
| The window's accessible name | `SAVE` | `FOLDERS` |
| The rail's accessible name | `SAVE window controls` | `FOLDERS window controls` |
| The close button | `Close SAVE` (the hidden bar's) | the rail's close chip, `Close window` |
| The WINDOW menu and the key table | `SAVE` (key S) | the app's row: `FOLDERS` (key S stays) |
| The rack card | eyebrow `SAVE`, status `PROJECTS` | the app's `device({ eyebrow: 'FOLDERS', status: 'PROJECTS' })` around `mountGallery` |
| FILE menu | `SAVE project`, `SAVE project AS…` | unchanged: they are verbs, not the window's name |
| The open project's name | nowhere | nowhere by default (`head`) |
| What happened | the toast, one sentence, 84 px above the bottom | the kit's notice in its toast seat (BASINS'), unless `say` or `status` is given |

## What the user sees

| Part | What it does |
|---|---|
| The toolbar (default: BASINS') | **PROJECT** (save glyph): a new project named by NAME in the folder typed in SAVE TO · **CAPTURE** and **DOWNLOAD** (a picture, when the app gives `capturePicture` / `savePicture`; disabled otherwise) · **DUPLICATE** the selected project · **NEW** · **⋯** the components disclosure (when the app names `parts`) |
| FOLDERS' own verbs (`actions: FOLDERS_ACTIONS`) | **SAVE** over the open project (the first time, or over a read-only starter, it is SAVE AS) · **SAVE AS** · **NEW** · **OPEN FILE** (a `.mir` or a picture that carries one) · **EXPORT** (`.mir` or picture) |
| The panels | GALLERY first; an app's own after it (BASINS: RENDER). With more than one, a radio chip per panel sits on the rail before the sort, as BASINS draws them |
| The explorer | crumbs (ROOT / …), the folders as cards (the cover picture under a wash, a count), then the projects as pictured tiles. Tap a tile to choose it, tap again to open it. A chosen tile shows its name and four verbs: ⓘ, MOVE, RENAME, DELETE (DELETE asks "sure?") |
| **Drag to folder** | carry a tile with a mouse or pen: the folders and the crumbs in reach light up, dotted and brightening as it nears, solid when release would land. Escape, a lost pointer or a blur puts it back |
| **MOVE TO** | the touch and keyboard way to do the same: long-press a tile (or right-click, or the context-menu key), or press its MOVE verb. The menu lists every folder as a button, then BASINS' typed path and MOVE |
| Folder menu | long-press or right-click a folder: RENAME (onto an existing path it merges), REMOVE FOLDER (it arms first: MOVE CONTENTS TO ROOT?) |
| Opening | over a screen not known to be saved (as at start, BASINS' law) it asks: SAVE & OPEN or OPEN WITHOUT SAVING |
| The rail | close, the panel chips, the sort (A–Z, Z–A, newest, oldest; the depth sorts too with `depthOf`), the grip. On the window's **right** by default (BASINS). Shift-drag, long-press or the arrow keys on the grip move it to another edge |
| The window | drags by its grip **and by any empty glass**; a drag that starts on a tile carries the tile instead. Resizes from its corner. Opens and closes with motion. Reports its rect so a transport can dodge it. First opens at BASINS' seat: top right, 162 px down, clear of the right rack and its own rail |

## The API, as built

**`createFolders(options)`** (`mir/folders/folders.js`)

| Option | Default | What it is |
|---|---|---|
| `host` | `document.body` | where the window and its rail are appended (the floating layer) |
| `id` | `'folders'` | the window id: `data-mir-window`, `data-mir-rail`, and the root's DOM `id` (BASINS: `savewin`, so `#savewin` still names it) |
| `domId` | `id` | another DOM id, or `false` for none. Nothing in the kit hangs on it: the pointer is `.mir-win`'s |
| `title` | `'FOLDERS'` | the accessible names (window and rail) |
| `store` | `'mir.folders'` | the library's storage key |
| `storage` | `localStorage` | anything with `getItem` / `setItem` / `length` / `key` |
| `prefs` | `localPrefs(storage, store + '.window')` | `{ read() → object \| null, write(object) }`. FOLDERS writes `{ x, y, w, h, open, dock, chipSide }`, `tab`, `gallery: { sort, parts }` and a card's slot **merged into** what is there, so an app's other fields survive |
| `app` | — | the app id written into an exported project and required of an imported one |
| `adapter` | the kit's parts | `{ capture, restore, signature, thumbnail, empty, subscribe, facts }`, each optional (below) |
| `actions` | `DEFAULT_ACTIONS` = BASINS' `project capture download duplicate fresh options` | the toolbar's verbs, in order. `FOLDERS_ACTIONS` = `save saveAs fresh open export`; mix freely |
| `panels` | none | `[{ id, label, glyph, hint, build(body, api), onShow?(body, api) }]` after the built-in gallery; `galleryPanel` overrides the gallery's chip |
| `onTab(id)` | — | after a panel is shown (BASINS: `render.paint()`) |
| `head`, `status` | `false`, `false` | the name line with UNSAVED CHANGES; a status line in the window instead of the toast |
| `chipSide` | `'right'` | the rail's side before the user moves it |
| `seeds` / `seededKey` | — / `store + '.seeded'` | starter projects (below) |
| `size`, `min` | `380×680`, `280×360` | the floating size and its floor |
| `dock` | none | `{ span, guide }` as `createWindow` takes it; omitted, FOLDERS floats |
| `onMoved(rect \| null)` | — | after every layout; `rack.dodge` fits here |
| `rack` | — | the rack (or `() => rack`): the first seat keeps clear of what `rack.keepClear()` names |
| `firstSeat()` / `anchor`, `top` | BASINS' seat: `anchor: 'right'`, `top: 162` | `{ x, y, h? }` for the first open. `freeSeat({ vw, vh, w, h, minH, clear, anchor, top, gutter })` is exported and pure; `anchor: 'centre'` centres the window between the racks |
| `say(text, warn)` | the kit's notice in its toast seat | the app's own voice |
| `download(blob, name)` | an `<a download>` | how an export leaves |
| `picture(entry)` | the saved thumbnail | a canvas or Blob to embed the project in on EXPORT › PICTURE |
| `defaultName`, `capChars` | `'UNTITLED'`, 2.6 M | passed to the store |
| `parts` | none | `[{ id, label, soon? }]`: component switches (BASINS: MODULATION, COLOUR & BRIGHTNESS, POSITION, CACHE soon) |
| `sorts` | A–Z, Z–A, N↓, N↑ | sort ids; all six when `depthOf` is given |
| `depthOf(entry)`, `factory()`, `freshLoses()`, `locked()`, `projection(presence)`, `capturePicture`, `savePicture`, `pictureStale`, `onInspect(entry, how)`, `onOpened`, `galleryCopy`, `emptyDragExcept` | — | BASINS' gallery hooks, passed through as its gallery reads them |

Returns `{ win, files, gallery, adapter, seeded, intake, views, panels (id → body), tab(id) / tab(), activeTab(), mountGallery(el, { pageSize = 8, prefsKey = 'rackGallery', actions, factory, onInspect }), open(), close(), toggle(), isOpen(), save(), saveAs({ name, folder }), fresh(), openEntry(id, { force }), current(), dirty(), seed(list), exportProject('mir' | 'png'), importEnvelope(env), ingest(input), say(text, warn), state(), destroy() }`.

**`mountGallery(el, …)`** is a second live view of the same library (BASINS' rack card: 8 a page, its own sort under `rackGallery`). Every view shares one store and one adapter; when one opens, saves or starts NEW, the others learn that the screen is clean.

**`createProjectAdapter(options)`**, **`openWithRollback(adapter, data, entry)`**, **`emptyProject(adapter)`**, **`restoreOk(r)`** (`mir/folders/project.js`, pure). **`createFiles(…)`** (`files.js`, BASINS' model), **`seed(…)`** (`seed.js`), **`buildGallery(panel, …)`**, `DEFAULT_ACTIONS`, `SORT_MODES` (`gallery.js`).

## The adapter contract

| Hook | Returns | Default |
|---|---|---|
| `capture(presence?)` | the project as JSON. `presence` is the components switches (`{ rack: true, … }`); none (a rollback's own capture) means all | `{ parts: captureProject() }` |
| `restore(data, entry?)` | `true`/nothing = it took; `false`, `{ ok: false, why }` or `{ failed: [names] }` = it did not | `restoreProject(data.parts)` |
| `signature()` | a string: equal means unchanged | `projectSignature()` |
| `thumbnail()` | a canvas, a Blob, a data URL (kept as it is), or null | null |
| `empty()` | as `restore`; a string is the sentence the user is told (BASINS: "New fractal — …") | `restore(null)`: every part restored with null |
| `subscribe(fn)` | an `off()` | `subscribeProject` |
| `facts()` | small JSON kept beside the entry (BASINS: the depth) | `{}` |

**The three-scope law** (λWAVES 0.3.1): NEW is the empty project; a failed open rolls back to what was on screen, and says which part refused; a rollback that fails is said too.

## Moving a panel out into its own window (ruling 5, the app's step)

Josh ruled that FOLDERS holds the gallery and the folders and RENDER becomes its own window and rack card. That is the app's change, made when it is ready; until then RENDER is a panel. Later:

```js
const folders = createFolders({ …,                       // no `panels`: RENDER has left, so the rail has no panel chips
  onInspect: (e, how) => { if (how && how.show) render.open(); renderView.paint(); } });
let renderView;
const render = createWindow({ id: 'render', title: 'RENDER', host, resizable: true, persist, onMoved,
  body: (b) => { renderView = buildRender(b, folders.gallery); }, onOpen: () => renderView.paint() });
```

The panel's `build(body, api)` becomes the window's `body`; `onShow` becomes the window's `onOpen`; the panel chip goes. What FOLDERS does not have yet is an **action chip on its rail that opens another window** (it builds only the panel chips and the sort): an `extraChips` option is the one-line addition when the app asks for it.

## Seeding

```js
seeds: [{ name: 'EMBER', folder: 'STARTERS', data: { parts: { … } }, thumbnail: 'data:image/jpeg;…', readOnly: true }]
```

Each starter is added **once**, counted by its `id` (default `folder/name`) in a list under `seededKey`. One the user deleted stays deleted; a library that already holds it (`facts.seedId`) is not given a second; a name the user already used is suffixed. `readOnly` starters cannot be saved over or renamed.

## The laws

| Law | Why |
|---|---|
| **BASINS' design is the default** | Josh, 2026-10-02. FOLDERS' additions are options |
| **What the user reads changes; what a browser stored does not** | `id`, `store` and `prefs` are options. A renamed key loses every saved library and seat |
| **The window takes the pointer by its class** (`.mir-win`), never by an id | BASINS' 09-18 dead window. The id is there for parity, and `tests/folders.browser.mjs` takes it away and hit-tests again |
| **Two file systems, kept apart** | FOLDERS saves projects; the notebook's shelf saves notes. Neither reads the other's store |
| **Nothing is overwritten by accident** | SAVE AS suffixes; a seed suffixes; a full library refuses and offers MAKE ROOM; an unreadable library or record is set aside first |
| **A failed open changes nothing** | rollback, and it is said |
| **One window species, one drop guide** | `createWindow`; `core/proximity.js` |

## BASINS: the exact options, and where each job of `save-window.js` sits

```js
const folders = createFolders({
  host: mount, id: 'savewin', title: 'FOLDERS', store: 'basins.library', app: 'basins', defaultName: 'FRACTAL',
  prefs: { read: () => readPrefs().savewin || null, write: (v) => writePrefs({ savewin: v }) },
  adapter: {
    capture: (p = ALL) => basinsPayload(p),            // adapter.capture minus its thumb and facts (save-window.js:180-195)
    restore: (p, entry) => adapter.restore(p, entry),  // :196-227 as it is; for a rollback `entry` is undefined
    signature: adapter.signature, thumbnail: () => captureThumb(mainRealm), empty: adapter.fresh,
    facts: () => { const d = zoomDepth(mainRealm); return { depth: d, label: '10^' + d.toFixed(1) }; },
  },
  parts: [{ id: 'rack', label: 'MODULATION' }, { id: 'look', label: 'COLOUR & BRIGHTNESS' }, { id: 'place', label: 'POSITION' }, { id: 'cache', label: 'CACHE', soon: 'under construction' }],
  depthOf: adapter.depthOf, factory: restoreFactory, freshLoses: adapter.freshLoses, locked: adapter.locked,
  capturePicture: adapter.picture, savePicture: adapter.savePicture, pictureStale: adapter.pictureStale,
  galleryCopy: { factoryNote: 'puts back the fractals this app shipped with, and ' + LIBRARY_ROOT + ' — …' },
  panels: [{ id: 'render', label: 'RENDER', glyph: 'render', hint: 'Render — this project, and the picture or film you make of it',
             build: (body, api) => { render = buildRender(body, api.gallery, api.win.root, () => api.activeTab() === 'render'); },
             onShow: () => render.paint() }],
  onInspect: (e, how) => { if (how && how.show) folders.tab('render'); else if (render) render.paint(); },
  onOpened: () => { if (render) render.paint(); },
  rack: { keepClear: () => [document.getElementById('rack').getBoundingClientRect()] },
  say: (t, bad) => toast(t, bad ? 5000 : 3200),         // until BASINS takes the kit's notice
  onMoved: (r) => shell.workspaceMoved(r),
});
```

| `save-window.js` job | Seat |
|---|---|
| The window, the sheet hack, the chips, the sort ink, the drag and resize (`:339-396`) | `createFolders` itself — deleted from BASINS |
| GALLERY / RENDER panels and their chips | `panels: [{ id: 'render', … }]` (above) |
| The adapter: capture, restore, signature, fresh, freshLoses, locked, picture, depthOf (`:178-263`) | `adapter` + the pass-through options (above) |
| The rack card's compact gallery (`rackSave`, `:398-416`) | app code on the kit's API: `const card = kit.device({ id: 'rackSave', eyebrow: 'FOLDERS', status: 'PROJECTS' });` · `const rackGallery = folders.mountGallery(card.body, { pageSize: 8 });` · `card.root.addEventListener('devopen', () => { maybeSeed(); rackGallery.paint(); });` |
| The rack card RENDER view (`rackRender`) | app code: `buildRender(rackRender.body, rackGallery, …)` as today |
| The factory gallery and JOSH'S LIBRARY, seeded on the first open (`maybeSeed`, `restoreShipped`, `restoreLibrary`, `:281-321, :418-438`) | app code on the kit's API: they write through `folders.files.save(…)` and are counted by `facts.factoryId` / `facts.libraryId` as today; RESTORE FACTORY GALLERY is the `factory` option. Not `seeds`: BASINS' library is editable, not read-only, and its "seeded" flags hold a time |
| The starters (`seedStarters`, `STARTER_PROJECTS`) | app code as today, or `seeds` after a one-time copy of `facts.starterId` into `facts.seedId` (and a `seededKey` other than `basins.library.factory-seeded`) |
| The session keep (`saveCurrentSession` / `restoreCurrentSession`, `:121-147, :265-279`) | app code on the kit's API: `const keep = () => writeProjectSession(localStorage, folders.adapter.capture());` · `subscribeProject(debounce(keep)); addEventListener('pagehide', keep);` · `restoreCurrentSession = () => folders.adapter.restore(readProjectSession(localStorage))` (BASINS keeps its own session format; the adapter is the one capture) |
| Presets on save (`presetOnSave`, `:323-337`) | app code: pass `files: projectFiles` (the wrapped store, as today) — `createFolders({ files })` takes a store |
| The film estimate and everything else in RENDER (`buildRender`, `:440-…`) | the RENDER panel's own code (`panels`), unchanged |
| The history window install (`installHistory`) | app code, unchanged |
| **Fits neither** | the rail chip that opens another window (needed only once RENDER leaves; see above); `kwin`'s exact chip DOM (`.kwin-chiprail`, `data-rail`, `.kwin-resize`) that BASINS' rigs select — the kit's hooks are `[data-mir-rail]`, `[data-mir-chip]`, `.mir-win-resize` (the gate below maps them) |

**It deletes:** `mir-plugins/files/{files.js,gallery.js,save.css}` (save.css's `sr-*` RENDER rules move to the RENDER panel's own sheet); `save-window.js`'s window construction (`:339-396`); kwin's legacy drag path; the pointer-events give-back `save.css:18`.

**Its gate** (`tools/rig/save-gate.js`) needs five selector edits: `.kwin-chiprail[data-mir-rail="savewin"]` → `[data-mir-rail="savewin"]`; `[data-rail="x"]` → `[data-mir-chip="x"]` (`drag` → `grip`); `K.activeTab()` / `K.tab()` → `SV.activeTab()` / `SV.tab()`; `.kwin-resize` → `.mir-win-resize`; and 150 ms after close becomes 400 ms (the window's exit is animated, a ruling). `#savewin` stays.

## The retitle hazards

1. **The id.** `#savewin` is kept on the root for BASINS' own rules and rigs; the pointer never depends on it.
2. **The rail label.** `FOLDERS window controls`. Rigs and the scene-input guard that select `"SAVE window controls"` must move to `[data-mir-rail="savewin"]`.
3. **The menu row and the key.** WINDOW › SAVE becomes FOLDERS; the `S` key stays.
4. **The store and the prefs key.** Never renamed (ruling 6).
5. **The rack card ids** `rackSave` / `rackRender` stay; only their eyebrow text changes.

## Not built

- **RENDER as its own window** (ruling 5): the app's, when it is ready (above).
- **An action chip that opens another window** (`extraChips`), needed only when a panel leaves.
- **The timeline's assets** inside a project; **the title card** (plan §8.5); **minimise** (a `window/` change).
- **Drag to folder by touch**: a finger long-presses for MOVE TO instead.

## Proofs

- `tests/folders.node.mjs`: the store, the seeds, the adapter (open, NEW, rollback).
- `tests/folders.browser.mjs` on `gallery/folders.html?reset&test` (FOLDERS' own options), real CDP input, every press hit-tested: 25 checks — the window takes the pointer, and still does with its id taken away; the first open asks over an unknown screen; SAVE, the unsaved mark, SAVE in place; another project restores knobs, colour and pages; NEW; drag to folder and Escape; MOVE TO by keyboard; the rail moves; empty glass drags and a tile does not; the transport dodges; export and import; another app's file refused; a reload keeps the library; a failed open rolls back.
- `tests/folders-basins.browser.mjs` on `tests/fixtures/folders-basins.html` (BASINS' options, a stand-in engine and RENDER panel): **BASINS' own `save-gate.js` checks**, names and actions unchanged, the kwin selectors mapped: 28 run as written and pass; 7 run against the stand-in engine or panel and pass (they prove the seat, not the fractal); 9 need BASINS itself (the engine's exact scale, knobs and colours; CAPTURE IMAGE, the film estimate and the self-test in RENDER; the two film checks; the rail-against-modulation-rail comparison). `MIR_PLATES=1` writes `docs/plates/folders/basins.png`.
- Not proven: BASINS' real app (the stage that adopts this runs the real gate), WebKit or an iPad, a real OS file drop.
