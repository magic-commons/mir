# MIR · KEYS — one key table, and the keyboard window

An app writes its keyboard **once, as data**: a list of actions, each with its default keys. From that one table the kit makes everything else: the single `keydown` listener that runs the actions, the key column of every menu, the key in a control's hint, the help view, the drawn **KEYBOARD** window where any key can be re-recorded, and the `keys` member of a spec file. No app writes any of these by hand again.

Try it: `gallery/keyboard.html`. Press **K** for the keyboard window, **?** for the help view, hover the wordmark for the menus.

| Module | What it is |
|---|---|
| `mir/shell/keys.js` | the table: chords, the one listener, rebinding, saving, and everything generated from it. No DOM of its own |
| `mir/keyboard/keyboard.js` | the KEYBOARD window and the help view, both on the 1.5 window (`mir/window/window.js`) |
| `mir/keyboard/keyboard.css` | their sheet, in `@layer mir.kit.house`. Load it after `mir/window/window.css` |

## 1. Use it

```js
import { createKeys, localKeyStorage } from './mir/shell/keys.js';
import { createKeyboardWindow, createKeysHelp } from './mir/keyboard/keyboard.js';

const keys = createKeys({
  storage: localKeyStorage('myapp.keys'),           // or any { get(), set(obj) }
  actions: [
    { id: 'play', label: 'PLAY', group: 'TRANSPORT', keys: ['Space'], run: () => transport.toggle(), when: () => !modalOpen },
    { id: 'save', label: 'SAVE', group: 'FILE', keys: ['Mod+S'], inFields: true, hint: 'save the project', run: save },
    { id: 'redo', label: 'REDO', group: 'EDIT', keys: ['Mod+Shift+Z', 'Mod+Y'], run: redo },
    { id: 'keys', label: 'KEYS', group: 'HELP', keys: ['?'], run: () => help.toggle() },
  ],
});
const kb = createKeyboardWindow({ keys, host: floatsLayer });     // a WINDOW menu row opens it: kb.toggle()
const help = createKeysHelp({ keys, host: floatsLayer });
createMenubar({ opener, host, menus: {
  FILE: () => [keys.menuItem('save'), keys.menuItem('open')],     // 'SAVE\tCtrl+S' on Linux/Windows, 'SAVE\t⌘S' on a Mac
  WINDOW: () => [keys.menuItem('keys', 'KEYBOARD HELP')],
} });
keys.hints(document);                                             // every [data-key-action="id"] gets its key
keys.onChange(() => keys.hints(document));
```

With `createApp()` (`mir/app.js`) the table is made for you (`app.keys`): the app's own rows (`createApp({ keys: [...] })`) first, then the kit's, which are **BASINS' table** (ruled the kit's default 2026-10-02; `KIT_KEYS` in `mir/shell/keys.js` is the one place they are written):

| Key | Action id | What it does |
|---|---|---|
| Space | `transport.play` | the one play (`transportActions`; it works over a focused control) |
| S | `folders` | FOLDERS (BASINS: its SAVE window) |
| M | `modulation` | the modulation window |
| J | `notebook` | the notebook |
| B | `rack` | HIDE / SHOW the rack |
| T | `dock` | DOCK / UNDOCK the transport (with a rack and a bar) |
| H | `hide` | HIDE the interface, and back (`app.hideInterface()`; the focus leaves what is hidden) |
| F | `fullscreen` | FULL SCREEN, and out of it (`toggleFullscreen()`) |
| Ctrl/⌘+S | `save` | save over the open project (works in a field too) |
| ? | `help` | the keys' help view |
| I (held) | `info-hold` | holds the words on the picture still (`infoActions`) |
| Ctrl/⌘+Z | `undo` | undo: the history's row with a `history`, else the timeline's own (`EDIT_KEYS` in `mir/shell/keys.js`) |
| Ctrl/⌘+Shift+Z, Ctrl/⌘+Y | `redo` | redo, the same two owners |
| — | `history`, `render`, `gui`, `gui-about`, `keyboard`, `pattern`, `timeline` | the kit's windows (HISTORY, RENDER, MIR OPTIONS, MIR ABOUT, KEYBOARD, PATTERN, TIMELINE): rows with **no key** — their keys are Josh's to give — so the KEYBOARD window can bind them and a menu shows what they hold |

Before 1.5.0-alpha.12 the kit had F on FOLDERS; a user who rebound nothing now finds FOLDERS on S. The table writes the hints again whenever a window is built, so a lazily built window's `[data-key-action]` shows its key too.

**`createApp` installs the KEYBOARD window** beside the help view (`app.keyboard`, WINDOW › KEYBOARD; `keyboard: false` leaves it out), so every kit app rebinds its table from the UI.

**Undo and redo have one owner (wave 19).** They are the rows `undo` and `redo` of the one table, never a listener of their own: `installHistoryKeys(history, { keys })` (`mir/history/history-list.js`, which `createHistoryWindow` and `createApp` call with `app.keys`) adds them, and the timeline's own pair, the same ids and chords, is left out when the timeline is a domain of that history (`timeline/bind.js`). Before, a capture-phase listener beat every table row, so rebinding undo did nothing. A text field keeps its own undo; a focused `<select>` (it has none) still undoes the app.

**A held key.** An action with `up(event, action)` is held: `run` on the press, `up` on that key's release, or when the page loses the focus. INFORMATIONAL's hold-still is one (`infoActions(() => layer)` in `mir/info/layer.js`): in the table, it is in the help view and in VIEW › HOLD THE WORDS STILL, and Space stays free for play. A menu has no release, so **a held action's menu row latches**: one press holds, the next lets go (and leaving the page lets go). Before wave 19 this page said it was in the menus; it was not.

**A declared key that is not a key throws** at `createKeys` (and `add`), naming the action: a modifier alone (`'Shift'`), a typo. λWAVES' binding law ("Choose a key, with any modifiers") already refused it when rebinding; a declared row was silently left with no key, which a model (Haiku, building Tetris) did not notice. **`keys.add(action | actions)`** puts rows in after the table was made (a saved binding for them is read from the store; an id already there is left alone).

**Space is play over a focused control too**: `transportActions` sets `overControls: true` (BASINS). A game's own keys do the same with a `when`: `{ id: 'left', keys: ['ArrowLeft'], overControls: true, when: () => app.playing(), repeat: true, run: left }` steers while the game plays and leaves a paused game's knobs their arrows.

An action is `{ id, label, group, keys, run, when?, hint?, inFields?, overControls?, repeat?, short?, up? }`. `label`, `group`, `hint` and `short` are English; they are translated where they are shown. `short` is the name a drawn key carries (default: the label). `run(event, action)` gets the keydown, or `null` when a menu or button ran it.

## 2. The chord spelling

A chord is written one way everywhere: `Mod+Ctrl+Alt+Shift+Meta+<code>`, modifiers in that order, the key as its `KeyboardEvent.code` (`KeyS`, `Digit1`, `Slash`, `ArrowLeft`, `F5`, `Space` …).

- **The code, not the character.** A binding names a place on the board, so it survives AZERTY, Dvorak and every script. The drawn board shows US ANSI legends.
- **`Mod` is the platform's command key:** ⌘ on a Mac, an iPhone or an iPad, Ctrl everywhere else. Write `Mod+S` and both are right. On a Mac `Ctrl` means the real Control key; elsewhere `Meta` means the Windows key.
- **Authors may write it loosely.** `ctrl+shift+s`, `Shift+Ctrl+S`, `Cmd+S`, `?` (= `Shift+Slash`), `Esc`, `Up`, `5`, `=` all parse. A chord that does not parse (two keys, a modifier alone, an unknown name) is dropped.
- **It is ASCII**, so a saved table fits a spec envelope's `keys` member unchanged (`docs/FORMAT.md`).
- **Shown in the platform's symbols:** `⇧⌘S` on a Mac (Apple's order ⌃⌥⇧⌘), `Ctrl+Shift+S` elsewhere. Key caps are never translated.

## 3. The laws

| Law | Why |
|---|---|
| **One listener.** `createKeys` adds one bubbling `keydown` listener and nothing else | twelve hand-written handlers became one table lookup |
| **A field keeps its keys.** While the focus is in a text field, only an action marked `inFields` runs (the notebook passes Ctrl/⌘+S and Ctrl/⌘+, through) | typing "s" must never save |
| **A control keeps the keys it works by.** A focused slider keeps its arrows, Home, End and pages; a radio, tab or option its arrows; a button its Space and Enter | λWAVES' OWNED law |
| **…unless the action says `overControls`.** Then it runs over a focused control, and the control gets neither the press nor its release (a button clicks on Space's keyup). It still never runs in a text field unless it also says `inFields` | BASINS: Space plays even with a button or a slider focused. Without this, BASINS kept its own Space handler outside the table |
| **Taken nearer the target is not ours.** A key a control already handled (`defaultPrevented`), an IME composition, or an auto-repeat (unless `repeat: true`) runs nothing | |
| **Two actions on one chord:** the first in table order whose `when()` holds runs | one key can mean different things in different states, by data |
| **Rebinding steals, and says from whom.** `bind()` takes the chord from every other holder and returns the losers | no silent theft (λWAVES) |
| **Escape and Tab are kept.** Escape closes and cancels; plain Tab and Shift+Tab move the focus | a user can never lock themselves out |
| **Only the difference is saved**, as `{ actionId: [chords] }` | a new default in the next release reaches everyone who did not change that key |
| **A bad save is ignored, never thrown.** An action that no longer exists or a chord that no longer parses is dropped | an old file never breaks a new app |
| **Nothing is found by its label.** Actions by id, hint targets by `data-key-action`, drawn keys by `data-code`, rows by `data-id` | labels translate |
| **No key text is typed by hand.** A control that runs a table action carries `data-key-action="id"` (its tooltip shows the table's chord after its words); a menu row is `menuItem(id)`; a list row shows `menuKey(id)`; a rack panel names its action (`action: 'id'`), never a `key` string | the user's binding, in the user's platform's symbols: ⌘ on a Mac and an iPad (wave 19: `keyLabel: 'J'`, `'(Ctrl+Z)'`, `'· SHIFT+Z'` and the panels' `key` were each typed) |
| **One owner per chord.** No module adds a keydown listener of its own for a key the table can hold (undo, hide) | a rebind must move the key, everywhere (wave 19: a hard-coded `KeyH` and a capture-phase undo outlived their rebinds) |

## 4. The API

**`mir/shell/keys.js`** — `createKeys({ actions, storage?, platform?, target? })` returns:

| Member | What it does |
|---|---|
| `run(id, event?)` → bool | runs the action now if its `when()` holds |
| `bind(id, chord, { add })` → `{ ok, chord, stolen: [{ id, label }], reason? }` | gives the chord to `id` (replacing its chords, or adding with `add`) and takes it from everyone else |
| `unbind(id, chord?)`, `reset(id)`, `resetAll()` | remove one chord or all; back to the declared keys |
| `check(id, chord)` → `null` or the English reason | what `bind` would refuse |
| `holders(chord)`, `conflicts()` → `[{ chord, ids }]` | who holds a chord; every chord held twice |
| `record()` → `Promise<chord \| null>` | the next chord pressed (Escape → `null`); `answer(chord)` settles it from elsewhere (a tap on the drawn board), `stopRecording()` cancels, `recording()` says |
| `menuKey(id, platform?)`, `hint(id)` | the key text for a menu row or a hint (`''` if unbound) |
| `menuItem(id, label?)` | a ready menubar entry: `[label\tkey, run, disabled]` (disabled when `when()` is false; a held action's row latches) |
| `hints(root)` | writes `data-key-hint` and `aria-keyshortcuts` on every `[data-key-action]` under `root` |
| `helpRows(platform?)` → `[{ group, rows: [{ id, label, hint, keys, chords }] }]` | the help view's data |
| `describe()` | plain data for a model or a dump: platform, and every action's keys, defaults and display |
| `list()`, `get(id)`, `chords(id)`, `saved()`, `restore(obj)`, `onChange(fn)` → off, `platform`, `destroy()` | |

`localKeyStorage(name)` is a `{ get, set }` over localStorage that survives a private window. `KIT_KEYS` are the kit's default chords, `EDIT_KEYS` undo's and redo's. Pure exports, node-tested: `parseChord`, `normalize`, `chordFromEvent`, `displayChord`, `ariaChord`, `keyText`, `modText`, `pickAction`, `isField`, `ownsKey`, `steal`, `diffSaved`, `repairSaved`, `bindError`, `detectPlatform`.

**`mir/keyboard/keyboard.js`**
- `createKeyboardWindow({ keys, host, persist?, platform?, onMoved? })` → `{ win, root, open(), close(), toggle(), isOpen(), select(id), setPlatform('mac' | 'other'), record(), refresh(), destroy() }`. `win` is the `createWindow` window (id `keyboard`, 1080 × 416, 530 tall under 860 px); `persist` and `onMoved` are passed to it.
- `createKeysHelp({ keys, host, persist?, onMoved? })` → `{ win, root, open(), close(), toggle(), isOpen(), refresh(), destroy() }` (id `keys-help`).
- Pure: `boardRows(platform)`, `keyStates(list, platform, selectedId)`.

**The tokens** (declared on `.km` and `.km-help`): `--km-live` (the recording glow, accent A), `--km-conflict` (the neutral conflict ring), `--km-badge-alt` (the ⌥ badge, between the accents). Everything else is the house's tokens.

## 5. Moving an app onto it

1. **Write the table.** Each `if (e.code === …)` branch of the app's handler becomes one action. `when()` carries the conditions that used to sit in the branch ("not while the notebook is open"); `inFields` replaces the field guards.
2. **Delete the handler**: the app's own `keydown` listener and its field and modifier guards. The table's one listener replaces it.
3. **Delete the help dialog.** `createKeysHelp` replaces it; the `?` key is an action like any other.
4. **Delete the menus' hand-written keys.** A row `['SAVE\tCtrl+S', save]` becomes `keys.menuItem('save')`, so the menu shows the user's binding, in the user's platform's symbols.
5. **Delete the hand-appended hints.** A control gets `data-key-action="id"` and `keys.hints(document)` writes its key.
6. **Keep the saved keys:** `restore(oldSaved)` once, after mapping the old shape to `{ id: [chords] }`.

What that deletes, from the survey (vault `MIR 1.5 SURVEY 2026-10-01`):

| App | Deleted | Replaced by |
|---|---|---|
| λWAVES | `lab/keymap.js` (933 lines), `lab/shortcuts.js` (the binding law), `lab/keys.js` (the dispatcher, OWNED keys, `lambdawaves.q0.keys`), `lab.css` §KEYBOARD (~120 lines), the kit's dead `#keymap` rules and `@keyframes km-pulse` (`mir/css/base.css`) | the table, the window, this sheet |
| SOLEIL | `KEYS[]`, its handler and `renderHelp` (`lab/main.js` per survey D), the help `<dialog>` and its CSS | the table, the help view |
| POLAR, EARTH | the KEYS table, `renderHelp` and `keyHints()` (survey E) | the table, the help view, `hints()` |
| every app | `'\tCtrl+S'` typed into menu rows | `menuItem()` / `menuKey()` |

## 6. What differs from λWAVES' window, and why

The geometry is λWAVES' (lab.css §KEYBOARD as of waves 113–115): the 2.1 : 1 wells, the ANSI board with its key widths, 52 px keys with a 44 px finger, the legend and switch on one row, the 38 px rows and 118 px chip column, the single list under 860 px. The behaviour is λWAVES': click a key to see its action, RECORD INPUT, RESET TO DEFAULT, the second press that confirms a steal, Escape to cancel, then to clear the search, then to close.

| Changed | Why |
|---|---|
| **The four tinted places are drawn by INTENT.** A bound key is the ON frost face and rim, and its light is a small accent LED (the one the legend's "Active" dot shows). The wells are the well fill under the inset relief, the same in both themes. The platform switch is the kit's `seg`, the search is the kit's field. The panel is the window's own pane | Josh's brief: "rebuilt untinted" |
| **Unbound keys have no face and no relief**: a hairline and faint ink. λWAVES drew them as wells | INTENT: a resting button is never a well |
| **The chosen action's keys wear the ON face with the cap in accent A.** λWAVES used an accent fill in a well | INTENT: ON and chosen are never an accent fill or a well |
| **Recording is LIVE (an accent-A glow).** λWAVES used `--bad` (red) | INTENT: live is accent A |
| **A conflict is a neutral ring outside the key, plus words.** λWAVES used `--bad` | the brief: no colour that means something else |
| **Chord chips are hairline legends with no relief.** λWAVES raised the modifier chips and sank the key chip | a chip is read, not pressed (raised means "press me") |
| **No header bar.** The window's rail carries the grip and the close chip; the title is the window's name | the 1.5 window has one chrome for every window |
| **Every drawn key is a button**: one tab stop for the board, the arrows walk it. λWAVES made unbound keys unfocusable | keyboard and touch are first-class: pressing a free key says it is free |
| **Recording works from touch.** While recording, a tap on a drawn modifier latches it and a tap on a drawn key records that chord; with no fine pointer the status says so plainly | a touch screen with no keyboard can still rebind |
| **Groups come from the table** (`group`), in table order. λWAVES hard-coded five categories by id | the window serves any app |
| **Chords are `event.code` plus the fixed modifier order, and `Mod`.** λWAVES stored `{ key, ctrl, alt, shift }` with Ctrl and ⌘ folded together | one spelling for menus, saves and envelopes; a Mac's real Control key stays bindable |

## 7. Proofs

- `tests/keys.node.mjs`: the spelling (permutations, aliases, `Mod` on both platforms, malformed chords), the display, the one listener on Node's own `EventTarget` (when, fields, owned keys, repeat, `defaultPrevented`, `destroy`), the steal (the loser reported and really unbound), reserved keys, reset, saving only the difference and reading it back, restoring a save with an unknown action and malformed chords, the saved shape passing the envelope checker as a spec's `keys`, and the generated menu key, menu entry, help rows and `describe()`.
- `tests/keys-undo.browser.mjs` and `tests/keys-table.browser.mjs` on `tests/fixtures/keys-undo.html` (a whole `createApp()` with the history and the timeline, wave 19): one holder per undo / redo chord, one undo per Ctrl+Z after a knob drag and after a timeline edit, a rebind moves undo, a text field keeps its own; with hide rebound, H closes nothing; the ⋯ rows, the tools and the notebook's × show the table's chord and follow a rebind; the kit's windows are rows and open from a bound key; the KEYBOARD window is installed; VIEW, EDIT, WINDOW and GUI read the table; the hold-still row latches.
- `tests/keyboard.browser.mjs` on `tests/fixtures/keyboard.html`, with real keys and a real pointer through CDP, each click hit-tested with `elementFromPoint`: a chord runs once; in a text field it does not (an `inFields` one does); a drawn key shows its action, a free one says it is free; record → the old chord stops and the new one runs; a taken chord shows the conflict and a second press steals it, naming the loser; the menubar's key column and the help view follow without a reload; a reload keeps the bindings; RESET restores them; nothing scrolls sideways; under `qps` the labels translate and the key caps, chips and menu keys do not.
- Plates in `docs/plates/keyboard/`: `keyboard-dark.png`, `keyboard-light.png`, `keyboard-recording.png`, `keyboard-conflict.png`, `keys-help.png`. Retake them with `MIR_PLATES=1 node tests/keyboard.browser.mjs`; a plain test run never writes them.

**Not proved:** a real Mac (⌘ is proved through the pure functions only); WebKit and a real iPad; recording by tapping the drawn board (built, not exercised by the test); a non-US layout on real hardware; a screen reader.
