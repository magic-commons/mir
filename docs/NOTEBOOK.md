# MIR · the notebook: pages and the shelf (1.5.0)

The notebook is the free glass every app on MIR opens with J. Since 1.5 it holds two kinds of writing, kept apart:

- **A project's pages.** They travel inside the project and show as the notebook's **tabs** while that project is open.
- **Your shelf.** Your own notes, kept in this browser, in folders. They belong to no project and never change when a project opens.

Josh's rulings, 2026-10-01: *"the lambdawaves save feature should be how notes can be saved and loaded, separate from the folder's feature"* and *"the multiple pages … are really just different .mds."*

## What a page is

A page is a plain markdown file: a **title** (its file name, as Obsidian has it) and its **text** (`md`), with `$inline$` and `$$display$$` maths. Exported, it opens in Obsidian unchanged. The kit has no tutorial or slide system: a tutorial is whatever someone writes in pages.

| | Project pages | Your shelf |
|---|---|---|
| Belongs to | the project | you |
| Saved by | FOLDERS, inside the project file (`registerProjectPart('pages', …)`) | the shelf's own store (`mir.notes` in localStorage) |
| Shown as | tabs after the divider | the ▤ SHELF face; the note you open sits in the **YOURS** tab |
| Changes when a project opens | yes: the new project's pages replace the tabs | never |
| Page 0 | the **greeting**: shown when the project opens if it has text and SHOW ON OPEN is on | — |
| A visiting model may read it | only if its **eye** is open (`shared`) | — |

A page moves between the two by **copy**, never by link. The two stores never read each other, and a copy is a new object: editing one never changes the other.

## The tabs

`createNotebook({ pages })` with a `createPages()` model (`mir/shell/pages.js`) gives the notebook a tab strip under its head. Without `pages` the notebook is exactly what it was (node for node, pixel for pixel).

- **YOURS** comes first: the note open from your shelf, kept in this browser as the notebook's text always was. After a divider come the project's pages; page 0 carries a small **0**. **+** adds a page.
- The **selected tab** is what the title field, the text and the ◐ preview edit. Typing in a page writes `pages.update(id, { md })` 300 ms later, and at once on a tab switch, when the field loses focus, on Ctrl/⌘+S or Ctrl/⌘+, and on pagehide, so a project save never misses the last keystrokes.
- **Rename:** double-click a tab, or F2. **Delete:** the × on the selected tab, then "delete? yes / no" on the tab itself. **Reorder:** drag a tab (the drop places are guides from `core/proximity.js`), or Ctrl/⌘+←/→ while it has focus. On touch, the selected tab drags and the others let the strip scroll.
- **The eye** flips `shared`. A page is hidden from a visiting model until its eye is open.
- **Keys:** the strip is a tablist with one tab stop; ←/→/Home/End move and select; F2 renames; Delete asks.
- **Many tabs** scroll sideways inside the strip (a mouse wheel scrolls it too); the selected tab is kept in view; the notebook never scrolls sideways.
- **The foot** gains: SHOW ON OPEN (only while the greeting is selected), **.MD** (save the selected tab as a file), **IMPORT .MD** (files become pages), and **COPY TO SHELF** (on a page) or **COPY TO PROJECT** (on YOURS). A `.md` dropped anywhere on the notebook becomes a page.
- The model is the truth. When a project restores, or another part edits a page, the strip follows. If a page of the old project was open, the new project's greeting is selected (YOURS if it has none).

## The shelf

`mir/notes/` is λWAVES' mini file system (its PROJECTS list, 0.3.2), lifted as the notebook's own.

- **Store** (`notes/shelf.js`, pure, node-tested): one localStorage key holding `{ items: { [path]: { path, folder, name, saved, opened, title, md } }, recent: [path…] }`. A path is `folder/name`; folders are only path prefixes.
- **Face** (`notes/face.js`, drawn by `notes/notes.css`): SAVE AS a `folder/name`, with folder chips that fill the folder; SAVE back to where the note came from; the list by folder; RECENT, the last five; EXPORT .MD and IMPORT .MD. A name opens the note into YOURS (asking "replace yours?" first if YOURS holds text that is not on the shelf). ✎ renames, × asks "delete?" first, → copies the note into the open project as a page.

What changed from λWAVES, and why:

| λWAVES | The shelf | Why |
|---|---|---|
| a project (`data` + notebook) | a page (`title` + `md`) | the shelf holds notes, not experiments |
| recent keeps 8, the menu shows 5 | keeps and shows 5 | one number |
| no rename; × deletes at once | rename; × asks first | Josh's ruling ("added on the way") |
| a bad store is refused, the list goes dead | a bad store is **repaired**: its raw text is copied whole to `mir.notes.corrupt`, the sound records are kept | nothing is lost, and the shelf keeps working |
| export/import a project as JSON | export/import a note as `.md` | a note is a markdown file |
| a dirty project asks with `window.confirm` | an inline "yes / no" on the row | the kit never uses a browser dialog |

## How an app wires it

```js
import { createPages, pageFromNotebook } from './mir/shell/pages.js';
import { registerProjectPart } from './mir/core/project.js';
import { createNotebook } from './mir/shell/notebook.js';
import { createShelf } from './mir/notes/shelf.js';
import { notesFace } from './mir/notes/face.js';

const pages = createPages();
registerProjectPart('pages', pages.part());          // FOLDERS saves and restores them with the project

const notebook = createNotebook({
  host: stage, name: 'MYAPP', storageKey: 'myapp.notebook', keyLabel: 'J',
  pages,
  faces: [notesFace({ store: createShelf({ key: 'myapp.notes' }) })],
});
```

Sheets, after `mir/shell/shell.css`: `mir/core/core.css` (the drop guides), `mir/shell/pages.css`, `mir/notes/notes.css`.

**A 1.4 project** saved its notebook as `{ title, subtitle, text }`. When such a project opens, turn that into its first page and drop the old field:

```js
const first = pageFromNotebook(saved.notebook);       // null if it had no text
if (first && !saved.pages) pages.restore({ v: 1, showOnOpen: true, pages: [first] });
```

## API as built

**`createNotebook(options)`**, new options: `pages` (a `createPages()` model), and any face carrying `store` is the shelf. New on the returned object:

| | |
|---|---|
| `pages` | the model handed in, or null |
| `shelf` | the shelf store, or null |
| `selected` | `'yours'` or the selected page's id |
| `select(key)` | select `'yours'` or a page id (a missing id selects yours) |
| `yours` | `{ title, md }` of the YOURS tab |
| `openNote({ title, md })` | put a note in YOURS, select it, show NOTES |
| `addFiles(files)` | add `.md` / `.markdown` / `.txt` files as pages → a promise of the count |
| `flush()` | write every pending edit now (page model and storage) |

**`createShelf({ storage, key, now })`** → `{ key, list(), folders(), recent(), get(path), has(path), save(path, page), open(path), rename(from, to), remove(path), freePath(path), exportNote(path), importNote(fileName, text, folder?), repaired, error, subscribe(fn) }`. Every write returns its result or null/false and leaves words in `error`; nothing throws. Also exported: `normPath`, `splitPath`, `repair`, `RECENT`.

**`notesFace({ store, glyph, label })`** → a face for `createNotebook({ faces })` (id `shelf`, glyph ▤), with `current` (the path of the note open in YOURS).

## What is not built

- **The title card's design.** Josh will design the greeting's card himself. Here the greeting is only page 0, marked **0** on its tab.
- **The greeting on the stage.** Showing page 0 when a project opens, and pages on the picture, belong to INFORMATIONAL (`mir/info/`).
- **Moving pages between projects** other than through the shelf, and multi-select of tabs.
- **A size cap on the shelf.** Everything sits in one localStorage key (the browser's quota, about 5 MB, is the limit); a full quota shows as an error, never a throw.
