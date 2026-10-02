# MIR · TRANSPORT — the basic transport bar, the main opener

`mir/shell/transport.js` and `mir/shell/transport.css`. The transport bar is the small floating bar at the bottom of every MIR app: **play**, the **MOD lamp**, the **BPM pill**, **TAP**, and one **latch** per main window. It is the first thing a person sees and the thing they open everything else from.

Josh ruled it on 2026-10-01: *"Always basic Transport Bar as the main opener."* and *"Let 30BPM be the default."*

Every app carried its own bar (BASINS' `transport.js` was the best, λWAVES and the NEBULA ports had theirs). This module is BASINS' basic bar, moved into the kit. Try it at `gallery/transport.html` (`?fresh` forgets everything, so the page opens as a first run).

Load `mir/shell/transport.css` after the kit's sheets, `mir/core/core.css` and `mir/shell/rack.css`. It sits in `@layer mir.kit.house`.

## Using it

```js
import { createTransport, firstRun, rackOpeners, transportActions } from './mir/shell/transport.js';
import { createRack } from './mir/shell/rack.js';
import { createKeys } from './mir/shell/keys.js';

// 1. Ask first: is anything saved?  A first run leaves every window closed, so the bar is all there is.
const first = firstRun('myapp.transport', 'myapp.rack');

// 2. The key table: the bar's row gives Space to play (the bar is made below, so it is read through a getter).
let tr = null, rack = null;
const keys = createKeys({ actions: [...transportActions(() => tr), /* … the app's own … */] });

// 3. The bar, first.  The rack needs the bar's element, so the bar takes the rack as a getter.
tr = createTransport({
  opener: true,                       // the main opener (the default)
  clock: mod.host.clock,              // or the app's own { play, pause, isPlaying, onChange }
  mod,                                // installModulation's result: the MOD lamp
  keys, rack: () => rack, key: 'myapp.transport',
  openers: () => [...rackOpeners(rack)(),                       // the rack's windows, described once (in register)
    { id: 'folders', label: 'FOLDERS', glyph: 'folder', key: 'S', open: () => folders.open(), close: () => folders.close(), isOpen: () => folders.isOpen() },
    { id: 'gui', label: 'GUI', glyph: 'sliders', open: () => gui.open(), close: () => gui.close(), isOpen: () => gui.window.isOpen() }],
});
rack = createRack({ key: 'myapp.rack', transport: tr.root });
rack.register({ id: 'camera', title: 'CAMERA', open: !first, glyph: 'camera', build(b) { … } });

// 4. Every floating window reports where it is to the bar: it hands the rect to the rack's dodge.
createFolders({ …, onMoved: (r) => tr.moved(r) });
installModulation({ …, moved: (r) => tr.moved(r) });
```

## The API, as built

**`createTransport(options)`**

| Option | Default | What it is |
|---|---|---|
| `opener` | `true` | this bar is the main opener: it is marked `data-opener`, and under H on a touch screen it keeps its way-back button |
| `host` | `document.body` | where the bar and its seat menu are appended |
| `root` | the element with `id`, else a new one | an existing element to adopt (BASINS' `#transport`) |
| `id` | `'transport'` | the bar's id |
| `clock` | `mod.host.clock` | `{ play(), pause(), isPlaying(), toggle?(), onChange?(fn) → off }`. No clock: no play button |
| `mod` | — | the modulation seam (`installModulation`'s result): `armed()`, `onArm(fn)`, `toggle()`, `isOpen`. No `mod`: no MOD lamp |
| `model` | `mir/modulation/mod.js` | the transport model: `transport.bpm`, `setTransport`, `tapTempo`, `BPM_MIN`, `BPM_MAX`, `BPM_DEFAULT` |
| `setBpm` | `mod.host.clock.setBpm`, else `model.setTransport` | how a tempo is written (the modulation clock re-anchors so the beat is continuous) |
| `persist` | `mod.persist()` | called once a tempo is committed: a drag let go, a wheel step, a key, a typed value, a tap |
| `openers` | `[]` | `[{ id, label, glyph?, key?, action?, hint?, open(), close?(), toggle?(), isOpen }]`, or a function returning it (read again on every paint, so windows registered later appear). `isOpen` may be a function or a getter. `key` is a key cap shown in the hint; `action` names a key-table action instead |
| `rack` | — | the rack, or `() => rack` |
| `keys` | — | the app's key table (`shell/keys.js`): the bar writes its key hints from it |
| `store` | localStorage under `key` | `{ get() → { v, seat } \| null, set(value) }` for the seat |
| `key` | `'mir.transport'` | the default store's key |
| `onRefused` | — | `(result)` when the clock refuses to play (the modulation clock does when nothing is routed); hand it to `notice()` |
| `onInterface` | `rack.setInterface(true)` | the way back under H |

It returns:

| Member | What it does |
|---|---|
| `root` | the bar (`#transport.mir-transport.glass.mini`) |
| `el` | `{ play, lamp, pill, field, tap, seat, back, menu, openers }`, the nodes |
| `toggle()`, `play()`, `pause()` | the clock |
| `setBpm(v)`, `bpm` | the tempo (clamped to the model's range, on the tenth; committed) |
| `edit()`, `tap()` | type the tempo; one tap |
| `moved(rect \| null)` | a floating window reports where it is; the rack's dodge moves the bar, and the latches re-read |
| `setSeat('bottom' \| 'top' \| 'compact')`, `seat`, `seatMenu(show)` | the seat, chosen and remembered |
| `sync()`, `refresh()` | paint now; paint in the next frame |
| `destroy()` | removes every listener and every node it made (an adopted root is given back bare) |

**Pure helpers** (node-tested in `tests/transport.node.mjs`): `formatBpm`, `clampBpm`, `digitStep(text, i)`, `charAt(boxes, x)`, `dragBpm`, `keyStep`, `parseBpm`, `seatOf`, `homeOf`, `seatRect`, `menuSide`, `firstRun(...stores)`, `localSeatStore`, `menuRow`, `openerRows`, `isOpenOf`, `toggleOf`, `rackOpeners(rack, { only, glyphs })`, `transportActions(get)`; the numbers `TRANSPORT` and `SEATS`.

**The DOM it keeps** (BASINS' names, so its sheets keep matching): `#transport.mir-transport.glass.mini[data-opener][data-home][data-form][data-seat]` > `.native-play-row` > `button.tbtn.play`, `button.tbtn.modb.mir-transport-lamp` (`.tr-word`, `.tr-led`), `button.tbtn.tempo-expand[role=spinbutton]` (`b.tempo-number`, `span.tempo-unit`, `i.tempo-hz`), `input.transport-tempo-input`, `button.tbtn.tap`, `.tr-sep`, `.tr-openers` > `button.tbtn.tr-open[data-opener]`, `button.tbtn.tr-seat`; `button.tr-back`; the seat menu `.glass.mb-list.mir-transport-seats` > `button.mb-item[data-seat-choice]`. A latch that is open is `.on` with `aria-pressed="true"`.

## The bar

| Part | What it does |
|---|---|
| **▶ / ❚❚** | plays or pauses the clock the app passes. ON (playing) is the frost face and rim, its glyph lit in accent A. **Space** plays it through the app's key table (`transportActions`) |
| **MOD** | the modulation window's opener. Its LED is lit in accent A while modulation is armed; a press opens or closes the window (`aria-expanded` says which) |
| **The BPM pill** | the tempo, in accent B (time). **Drag up or down**: the digit under the pointer is the step (on `30.0`: the `3` steps by 10, the first `0` by 1, the last `0` by 0.1), one step per 9 px; a finger steps in ones, one per 14 px. **The wheel** steps by the digit under the pointer. **↑ ↓** step by one, **Shift** by a tenth, **PageUp / PageDown** by ten. **A double click, a double tap or Enter** types it: the pill gives its seat to a field; Enter or leaving the field takes the value, Escape does not. Escape during a drag puts the tempo back |
| **TAP** | taps the tempo (`mod.js` `tapTempo`: four taps set it, a long gap starts a new count, a wild tap restarts the run) |
| **The latches** | one per main window, from data. Lit (the frost face, the label in accent A) while its window is open, however it was closed |
| **⠿** | the seat menu: **BOTTOM** (the default), **TOP**, **COMPACT**. A right click or a long press anywhere on the bar opens it too |

With nothing saved the pill reads **30.0**: the model's `BPM_DEFAULT` (Josh, 2026-10-01).

## The opener law

1. **An app calls `createTransport({ opener: true })` first** and asks `firstRun(store, …)` before it opens anything. `firstRun` is true when none of the stores it names holds anything (a store is `{ get() }` or a localStorage key; a store that throws counts as empty).
2. **On a first run the app leaves every window closed.** The bar is the only thing on screen, and every main window opens from one of its latches. (With the rack: register windows with `open: !first`. FOLDERS, GUI and the modulation window stay closed unless opened.)
3. **The bar names every main window.** The app passes its main windows as openers: FOLDERS, MODULATION (the MOD lamp), TIMELINE, the rack's windows, the notebook, GUI. `rackOpeners(rack)` makes the rack's rows from the rack's own data (`rack.spec(id)` once the join lands; until then the WINDOW menu's rows), so a window is described once, in `register`.
4. **Hiding the interface never strands a finger.** Under H (`body.ui-hidden`, `rack.setInterface(false)`) the bar leaves paint like everything else; on a touch screen (`any-pointer: coarse`) the main opener keeps one button, the way back (`.tr-back`), as well as the rack's edge handle.

## The laws

| # | Law | How |
|---|---|---|
| 1 | One dodge: the rack's | `moved(rect)` hands the rect to `rack.dodge`; the rack writes `data-seat` and runs its sequence (it waits on each animation, no timers). The bar writes `data-seat` only when there is no rack |
| 2 | One writer per element per frame | the drag's moves come through `core/pointer.js` `drag` (coalesced in the one frame); every paint is `perf.setText` / `setAttr`, written only where it changed |
| 3 | Latches say the truth | after any click or key on the page, on the rack's `devopen` / `devclose`, on the arm and on the clock's `onChange`, the bar books ONE paint in the next frame and re-reads every `isOpen`. No poller |
| 4 | Idle costs nothing | no rAF and no timer at rest (tested: zero frames and zero rAF) |
| 5 | A resting control is raised or flat; a field you type in is a well | the pill wears `--relief-raise` on its own face; the typed field `--relief-well` on `--glass-well`; the seats on the bar are flat until hovered, pressed or ON (INTENT fact 4) |
| 6 | ON is the frost face and a thin rim, its light in accent A | play's glyph, the MOD lamp's LED, a latch's label |
| 7 | Keyboard and touch are first-class | the bar is one tab stop (a roving `tabindex`: ← → Home End walk it, mirrored right to left); every seat is 32 px or more on a coarse pointer; a long press opens the seat menu where a mouse would right-click |
| 8 | No English in a lookup | words through `label()` / `ariaLabel()`; parts found by class and `data-opener`, `data-seat-choice` |

## What an adopting app deletes

| App | Deletes |
|---|---|
| BASINS | `app/transport.js` lines 26–75 (play, the MOD power, the pill and its drag, wheel and keys) and 159–185 (the sync and its 250 ms `setInterval` poller); `app/transport-controls.js` and `app/transport-controls.css` (the play and power faces, stripped by layered `!important`); `app/tempo-editor.js` for the bar (the modulation work bar may keep it); `app/transport-dodge.js` (its 220/400/330 ms timers; the rack's dodge replaces it); the `stage` and `rack` seats of `transport-placement.js`; `skin.css` §12 and lines 441–465 (`#transport.mini` geometry, the pill's well at rest), `lab.css` 177–179, 299–349, 558 (the bar, its two transition timings), the hand-written WINDOW rows that open the main windows |
| A NEBULA-port app (NEBULA-REDUX, SOLEIL, AUTOMATA, POLAR, EARTH) | the transport card and its play, tempo and window buttons in the port (`lab.js` / `rack.js`), its `#transport` rules in `lab.css` / `skin.css`, and the λWAVES `modDodge` copy |

**What stays in the app:** the macro rail tiles and the CLOCK pane (WALL / FREE, the cadence, ÷2 ×2 ×4 bends, HOLD ¼ / 1), the 10ⁿ depth readout, the rewind, the dock chip, the timeline-mounted form, and the MIR diamond logo button. See below.

## What differs from BASINS' bar, and why

| Changed | Why |
|---|---|
| The resting BPM pill is **raised**, not a well | INTENT fact 4: BASINS' pill wore `--neu-inset` at rest and read as already pressed. A field you type in is a well; a control you press or drag stands proud |
| A single click on the pill does nothing; a **double click / double tap or Enter** types it | Josh's brief. In BASINS a click opened the tempo panel (stage) or the editor (timeline) |
| **TAP** is on the bar | BASINS kept TAP in the CLOCK pane behind the pill; on the basic bar it is one press away |
| The MOD lamp **opens the modulation window**; its light says "armed" | the brief. BASINS' power glyph toggled the arm and the separate diamond logo opened the window. Arming stays in the modulation window |
| ON is the frost face, rim and an accent-A light | INTENT. BASINS lit play with accent ink only and the MOD power in accent B |
| **← →** walk the bar; ↑ ↓ (and pages) step the tempo | a roving tab stop (one Tab into the bar). BASINS stepped the tempo on ← → too |
| No 250 ms `setInterval` sync | latches and the lamp re-read on the page's own events, coalesced to one frame (law 3) |
| The dodge is the rack's sequence | BASINS' `transport-dodge.js` ran on `animationend` plus 220/400/330 ms belts and wrote `style.animation` from two files |
| Window buttons are **latches from data** | BASINS' bar had only the modulation door; its windows opened from the menubar |
| Seats: BOTTOM, TOP, COMPACT, chosen by the user and remembered | BASINS chose stage / rack / timeline by itself. The docked-in-rack seat is not built (below) |

## Left for later

- **The timeline-mounted form** (BASINS `timeline-mounted`: the bar inside the TIMELINE's work bar, the tempo panel above or below it, the work-lane events).
- **The macro rail tiles**: they need the modulation window's `buildMacroSlot` and its `api.wireGrip` / `wireDepth` / `moveMacro`, which `mir/modulation/window.js` keeps inside the window. A later step can expose them and put the rail back under the pill.
- **The CLOCK pane**: WALL / FREE, the cadence, the ÷2 ×2 ×4 bends and HOLD. Each is one `trig` over the clock (`setSync`, `hold`, `release`); they were left off the basic bar.
- **The CLOCK readout's deep-zoom parts** (BASINS' 10ⁿ decade, the rewind). The rewind is `clock.seek(0)`.
- **The docked seat** (the bar as the first thing in the rack, BASINS' `docked`, λWAVES' phone `wTr` card). `RACK.md` lists it as not built.
- **TOP needs one hunk in `rack.js`** (`setHome`, `dodgeSeat`'s `home`): until it lands, TOP is offered disabled whenever a rack is present (with no rack it works).

## Proofs

- `tests/transport.node.mjs`: the pure part (7 groups) — the step under the pointer, the clamp and the tenth, a drag's and a key's tempo, a typed tempo, the seats' geometry and repair, `firstRun`, the opener rows (from objects and from the rack's WINDOW menu), the key table's row.
- `tests/transport.browser.mjs` on `gallery/transport.html`, real CDP pointer, wheel and keys, every press hit-tested with `elementFromPoint` (23 checks): a first load shows only the bar; the pill reads 30.0 with nothing saved; play toggles the clock and its light; a drag on the tens digit steps by 10, on the tenths by 0.1, on the ones by 1; the wheel by the digit under the pointer; ↑ ↓ Shift PageUp; the resting pill stands proud and the typed field is a well (computed style); Enter and a double click type it, Escape leaves it; four taps set it; a rack window's latch opens it and its own × unlatches it; GUI's latch and its own close chip; the MOD lamp opens the modulation window; the bar dodges a floating window and comes back with no animation left; H takes the bar out of paint and back; idle is zero frames and zero rAF; the seat menu and COMPACT; a reload keeps the seat; under `qps` every word and accessible name translates and the number does not; no exception.
- Plates: `docs/plates/transport/transport-first-run.png`, `transport-dark.png`, `transport-light.png`. Retake them with `MIR_PLATES=1 MIR_BASE=… node tests/transport.browser.mjs`.

**Not proven:** the way back under H on a real touch screen (the rule is CSS on `any-pointer: coarse`; the headless run is a fine pointer); the long press (built, not driven); WebKit and a real iPad; a screen reader.
