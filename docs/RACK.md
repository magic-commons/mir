# MIR · RACK — the columns of windows at the screen's edges

`mir/shell/rack.js` and `mir/shell/rack.css`. The rack is where an app's windows live: one column at the right edge and, if the app wants it, one at the left. A window can be reordered, carried to the other column, taken off onto the stage (it floats) and put back. The racks hide and peek. A `+` button opens closed windows, and a `☆` button saves and loads whole arrangements. The layout survives a reload.

Every MIR app used to carry its own copy of this (BASINS' `rack.js`; λWAVES' `rack.js` + `rack-menus.js`; NEBULA's port, copied by five more apps). This module is that code, moved into the kit, so an app deletes its copy.

Try it at `gallery/rack.html`. Load `mir/shell/rack.css` after the kit's sheets and `mir/core/core.css`. It sits in `@layer mir.kit.house`.

## Using it

```js
import { createRack } from './mir/shell/rack.js';

const rack = createRack({ host: document.getElementById('lab'), key: 'myapp.rack', transport: document.getElementById('transport') });

rack.register({ id: 'camera', title: 'CAMERA', side: 'left', open: true, glyph: 'camera', hint: 'the view',
  build(body, api) { body.appendChild(knob({ label: 'ZOOM', min: 1, max: 64, value: 4 }).root); },
  onClose(api) { /* sleep: stop work, keep what you built */ },
  onPower(live, api) { /* off: free GPU memory */ },
});
// … register every window, then:
rack.start();          // (it also starts by itself after the task that created it)

createMenubar({ opener, menus: { WINDOW: () => rack.windowMenu({ rack: true, rackKey: 'B' }) } });
kitWindow = createWindow({ …, onMoved: (r) => rack.dodge(r) });   // the transport gives way to it
```

A registered window costs one Map entry. Its `device()` shell is made, and its `build(body, api)` runs, the **first time it opens**: from `+`, from the WINDOW menu, from a saved layout, or because it was registered with `open: true`. A window that is never opened is never in the DOM.

## The API, as built

**`createRack(options)`**

| Option | Default | What it is |
|---|---|---|
| `host` | `document.body` | where the racks, the float layer and the chrome are appended (λWAVES/BASINS: `#lab`) |
| `sides` | `['left', 'right']` | which racks exist |
| `key` | `'mir.rack'` | the localStorage key of the default store |
| `store` | localStorage under `key` | `{ get() → value \| null, set(value) }`. The value is `{ v: 1, layout, favs }` |
| `favourites` | `4` | ☆ slots; `0` builds no ☆ button |
| `transport` | `null` | an element that gives way to a floating rect (`dodge`) and hides and peeks with the rack |
| `seats` | `{ top: 52, bottom: 60 }` | the transport's two seats, px from the top and the bottom |
| `phone` | the kit's `--phone` sentinel, or `body.phone` | `() => boolean` |
| `chrome` | `true` | `false` builds no hide / `+` / `☆` buttons |
| `handle` | `'coarse'` | when the edge handle shows under H: `'coarse'` (touch), `'always'`, `'never'` |
| `onChange` | — | `(layout)` after every saved change |

**`rack.register(spec)` → id.** `spec` is:
- `id` (required, unique), `title` (default: the id in capitals), `side` (`'left'` / `'right'`, its home), `open` (open by default), `glyph` (a `glyph.js` name, shown in the `+` list), `hint`, `key` (a key hint for the WINDOW row), `status`, `loadingMark`;
- `build(body, api)`, run once, on first open;
- the lifecycle hooks, each called with `api` last: `onOpen`, `onWake` (a reopen), `onClose` and `onSleep` (the same moment, two names), `onFold(folded)`, `onPower(live)`, `onPresent(canPresent)`.

The window's `api` is `{ id, dev, root, body, setStatus, canPresent(), open(), close(), raise(), isOpen, floating, side }`.

**Windows.**
- `open(id, { side, index })`: builds the window if it was never built, and puts it at the top of its rack unless told where.
- `close(id)`: the window leaves the rack and its neighbours close the gap.
- `toggle(id)`, `isOpen(id)`.
- `raise(id)`: opens it, unfolds it, shows the rack, and brings it to the top of its rack (or to the front if it floats).
- `fold(id, on?)`.
- `move(id, { side, index })`.
- `float(id, { x, y, w, compact })`, `dock(id, { side, index })`, `toggleFloat(id)`, `setCompact(id, on)`.

**Hiding.**
- `setHidden(on)`: **the** hide path for the key, the menu, a touch and a test alike. Also `toggleHidden()` and the `hidden` property.
- `setInterface(shown)`: H. The whole interface leaves paint, and the edge handle is the way back.

**The transport.** `dodge(rect | null)` takes the rect a floating window reports. The transport moves to whichever seat that rect does not cover. `seat` says which seat it is in.

**Menus.**
- `windowMenu({ rack, rackKey })` returns the WINDOW menu's rows in the data shape `createMenubar({ menus })` takes: `[label, run, disabled, hint]`. There is one row per registered window: `↑ NAME` raises an open window and `⊕ NAME` opens a closed one. `rack: true` adds a separator and HIDE / SHOW the rack.
- `addMenu` is `{ open(), close(), shown, queued, commit() }` and `favMenu` is `{ open(), close(), shown }`.

**The layout.**
- `capture()` returns `{ v, at, hidden, phoneShown, cards: [{ id, side, open, folded, off, float: { x, y, w, compact, z, index } | null }] }`, in rack order.
- `apply(layout)` arranges every registered window as the layout says.
- The ☆ slots: `saveLayout(slot?)`, `loadLayout(slot)`, `forgetLayout(slot)`, `layouts()`.

**Reading the state.**
- `built`: how many windows exist. `registered`, `isBuilt(id)`, `window(id)` (the window's `api`).
- `order(side)`, `floating()`, `floatOf(id)`, `peek`, `phone`, `dragging`, `cancelDrag()`.
- `activity`: the rack's `window-activity.js` instance. `el` holds the nodes it made. `sync()` re-checks the phone. `start()`, `destroy()`.

**Pure helpers** (node-tested in `tests/rack.node.mjs`):
- `reorderIndex(boxes, at, center, hyst)`, `insertionIndex(boxes, y)`, `slotRect(col, boxes, index)`, `moveId`;
- `clampFloat`, `detached`, `peekSide`, `dodgeSeat`;
- `queueToggle`, `openOrder`, `favSlot`;
- `readLayout(raw, knownIds)`, `layoutLabel`, `localStore`;
- `RACK` (the numbers) and `SIDES`.

**The DOM it keeps:**
- `#rack.mir-rack[data-side=right]` and `#rackL.mir-rack[data-side=left]`;
- `#floats.mir-rack-floats`;
- `#rackToggle`, `#rackAdd`, `#rackFav` (`.glass.mir-rack-btn[data-rack-btn]`) and `#rackAddList`, `#rackFavList` (`.mir-rack-list`);
- `.mir-rack-handle[data-side]`;
- each window is a kit `device()` (`.dev`, `.dev-head`, `.dev-body`). A floating one is `.dev.floating` with `--float-w`.

It creates these ids only when they are absent, so an app's existing elements are adopted as they are.

**Body classes it writes:**
- `rack-hidden`;
- `rack-peek`, `rack-peek-left` and `rack-peek-right`;
- `transport-peek`;
- `ui-hidden`;
- `phone` (crossing the sentinel).

## The laws

| # | Law | How |
|---|---|---|
| 1 | A window is built on first open; a closed one sleeps, a powered-off one frees | `register` stores a name; `build` runs once; close → `onClose`/`onSleep`, power → `onPower(false)`, fold → `onFold` (it keeps running: EARTH's law) |
| 2 | One gesture, one writer | one `core/pointer.js` `drag` on an off-screen grip; a header press is handed to it only after the hand moves 3 px (or a finger holds 400 ms), so clicks, double-clicks and header buttons keep their own events |
| 3 | Move by transform; commit layout once | the held window moves by `translate`; neighbours `flip`; release writes `left/top` (or the DOM order) once and the transform goes in the same task |
| 4 | The drop shows where it lands | a docked window being carried: the slot it holds is drawn (`core/proximity.js`, solid); the rack's detach edge brightens as it nears; a floating window over a rack: the insertion slot, brightening with nearness, solid when release would land |
| 5 | Cancel leaves everything where it began | Escape, pointercancel, lost capture, blur, a hidden page: order, rack, float state and transforms all return; tested reversed halfway |
| 6 | Hide costs nothing, by one path | `setHidden` writes `body.rack-hidden` only; `window-activity.js` reads it; racks slide by transform and stop painting by a delayed `visibility`; H is `display: none` |
| 7 | Never fade a rack | no opacity on a rack, the float layer or a carried window (`.dragging` is held at opacity 1). An ancestor below opacity 1 becomes what the glass blurs: the likely cause of the Linux lost-blur bug. Tested: no ancestor below 1 at any frame of a hide |
| 8 | A touch user always has a way back | the edge handle shows under H on a coarse pointer; a finger holds a header to lift it |
| 9 | The keyboard can do what the hand does | a header is focusable: ↑ ↓ move in the rack, ← → to the other rack, Enter floats / docks; arrows nudge a floating window 24 px |
| 10 | Sequences wait on animations, not timers | the transport's dodge is `motion.sequence` (out, then in); a dodge that arrives mid-move is replayed when it lands |
| 11 | Idle costs nothing | no poller, no rAF at rest; the peek reads one cached width per pointer move; saves are coalesced to one frame. Tested: zero frames and zero rAF after a drag |
| 12 | The layout is data, repaired on read | `readLayout` drops unknown and repeated ids and checks every field; λWAVES' and BASINS' records (`side: 'L'/'R'`, `closed`) read as they are |
| 13 | The phone has one rack and nothing floats | crossing the sentinel docks every float (remembered), folds the left rack into the right one (`data-phone-from`), and starts hidden unless the user left it shown; crossing back restores all of it |

## The reference, item by item

The brief asked for survey C's 65-item rack list. Survey C has no numbered list of that length; its §g, §5 and the code it cites (λWAVES 0.3.2 `rack.js` 3408–3700, 4117–4340; `rack-menus.js`) are the reference. Below is every rack behaviour found there and in BASINS `rack.js`, one row each.

| # | λWAVES / BASINS behaviour | Here |
|---|---|---|
| 1 | Two racks, right `#rack` and left `#rackL` | kept |
| 2 | A float layer `#floats` | kept |
| 3 | `body.rack-l` when the left rack has cards (BASINS) | not built: CSS `:has()` or the app can do it; nothing in the kit read it |
| 4 | Drag a header to reorder; the held card follows the hand vertically | kept (BASINS) |
| 5 | Neighbours swap 8 px past a middle and travel (FLIP) | kept, through `core/motion.js` `flip` |
| 6 | The held card stays attached until it clears the rack by 12 px | kept |
| 7 | Then it floats where the hand is, and the same gesture carries it | kept |
| 8 | A floating window drags by its header | kept, by transform with one commit (was `left/top` per frame) |
| 9 | Dropping over a rack docks it at the slot under the pointer | kept |
| 10 | Drop target: the whole rack lit with a 1-px line, binary | changed: the insertion slot, by proximity (plan §6.4 item 2) |
| 11 | Detach threshold had no indicator | changed: the detach edge is drawn and brightens (plan §6.4 item 3) |
| 12 | λWAVES: reorder across racks by the pointer's half of the screen | changed: carry it out and drop it into the other rack's slot (BASINS' model); the keyboard's ← → moves across directly |
| 13 | Drag cancel on pointercancel restores order (BASINS) | kept, and extended to Escape, lost capture, blur and a hidden page |
| 14 | A drag that floated then cancels | changed: it goes back to its rack and its place (before, it stayed floating) |
| 15 | A press anywhere on a floating window raises it | kept |
| 16 | Floating windows keep a stack; `floating()` lists them back-most first | kept |
| 17 | `popOut`: comes off sideways, one card's width from its rack; lands fully on screen when it fits | kept (`float`), and it travels there |
| 18 | `dockWindow`: home (side + index) unless dropped somewhere | kept (`dock`), and it travels into its slot |
| 19 | Float clamp: 120 px stay across, the header below the top | kept (`clampFloat`) |
| 20 | Touch-tablet clamp to the visual viewport (BASINS) | not built: the plain clamp applies on a tablet |
| 21 | Floats re-clamped on resize | kept |
| 22 | COMPACT floating window (the rail chip) | kept (`setCompact`, the `.dev-rail` chip) |
| 23 | The pop chip's face (north / reopen) and the rail chip's face | kept |
| 24 | `--float-w` as a custom property, not inline width | kept |
| 25 | `raise(id)`: open, unfold, show the rack, top of the rack | kept |
| 26 | `reopen(id, side)`: prepend into a rack, with the card-enter animation | kept (`open`), translate-only entrance, no fade |
| 27 | `devopen` / `devclose` events | kept |
| 28 | `closed()` list, persisted | changed: part of the one layout record |
| 29 | `moveToRack`, `moveCard`, `order`, `orderAll` | changed: `move(id, { side, index })` and `order(side)` |
| 30 | Fold and power restored through the buttons (device closure state) | kept: through `device()`'s own `fold` / `setOff` |
| 31 | `captureLayout` v3: cards with side, folded, closed, off, float | kept; v1 of the kit's shape reads v3 as it is |
| 32 | `applyLayout`: dock all first, then arrange, then float by z | kept |
| 33 | Retired ids resolve to their heir (`retired` map) | not built: no kit app needs it yet; `readLayout` drops unknown ids instead |
| 34 | A layout keeps the notebook's size (`nb`) | not built: the notebook is not the rack's |
| 35 | Four ☆ slots; SAVE replaces the oldest when full | kept |
| 36 | ☆ row label: slot · windows · racks · floating · time | kept (`layoutLabel`) |
| 37 | ☆ LOAD rows with × to forget | kept |
| 38 | `+` lists closed windows A→Z with ⊕ | kept; it now also lists never-built windows |
| 39 | `+` marks ★ those in the most recent saved layout | kept |
| 40 | SHIFT-click queues with numbered badges | kept |
| 41 | Releasing SHIFT opens the queue in reverse, so the rack reads in pick order | kept |
| 42 | The `+` and ☆ lists close on a press outside | kept |
| 43 | — | added: Escape closes the `+` / ☆ list and returns focus |
| 44 | `#rackToggle` hides / shows; it turns accent when hidden | kept |
| 45 | The `+` and ☆ buttons leave with a hidden rack and return with its peek | kept, by `visibility` (they were faded) |
| 46 | Hidden racks slide out; visibility delayed .28 s | kept, on the structural motion token |
| 47 | Racks faded with opacity on hide (lab.css:18, 22) | changed: never faded (law 7) |
| 48 | BASINS' `.dev.dragging { opacity: 1 }` blur fix | kept, in the kit sheet |
| 49 | Disconnected parts' `visibility: visible` outliving a hidden rack (BASINS material.css) | kept, the `inherit` fix |
| 50 | Edge peek within 44–60 px of an edge | kept (44, BASINS) |
| 51 | The armed dismiss: only a peek the pointer armed is dismissed, at rack + 24–48 | kept (48) |
| 52 | Peek reads `--rack-w` once and on resize, never per move | kept |
| 53 | Touch never peeks by hover | kept |
| 54 | A carried window peeks a hidden rack so it can be dropped there | kept |
| 55 | A hidden rack is a drop target at its resting edge, not the animated one | kept |
| 56 | `#rackPeek` / `#rackPeekL` 16-px strips | not built: BASINS made them inert, and the pointer handler does their job |
| 57 | Transport peek around its current seat (80/60 in, 120 out) | kept |
| 58 | The transport hides with the rack | kept, by translate and visibility |
| 59 | Transport dodge: bottom seat unless covered, then top, else stay; narrow screens force top | kept |
| 60 | The dodge animation: out ±96 px + fade, in from the other side | kept |
| 61 | Dodge timers (220/400 ms belts, the 320 ms retry) | changed: `motion.sequence` on `Animation.finished`, no timers |
| 62 | Skip links focus the rack themselves | not built: the app's `index.html` owns its skip links; the racks are `tabindex=-1` regions so they still work |
| 63 | No keyboard way to move a window | added: header keys (law 9) |
| 64 | Phone: one rack, nothing floats, floats remembered, left cards folded in with `data-phone-from` | kept |
| 65 | Phone: the rack starts hidden unless the user left it shown (`phoneRack`) | kept (`phoneShown`) |
| 66 | Phone: the transport docks at the top of the rack (`wTr` card) | not built: the transport card is the app's |
| 67 | `dockTransport` / the transport's own dock chip | not built: the app's |
| 68 | Phone: the hide toggle follows the rack edge in the thumb zone | kept (rack.css) |
| 69 | Narrow screens (≤ 860 px): the rack along the bottom | kept (rack.css) |
| 70 | No way back from H on touch | added: the edge handle |
| 71 | `copyDigest` / `digest` (COPY a window's readouts) | not built: an app verb, not the rack's |
| 72 | `resetLayout` | not built as a verb: `apply({ cards: [] })` docks everything, and an app's RESET can open its defaults |
| 73 | The rack's own scrollbar seated at the card column (BASINS `rack-scrollbars.js`) | not built: the native thin accent scrollbar on the inner edge is kept. BASINS keeps its file |
| 74 | Rack height motion when a card folds (BASINS animates height) | changed: neighbours travel by `flip`; heights snap (no layout animation, CORE law 2) |

## What an adopting app deletes

| App | Deletes | About |
|---|---|---|
| BASINS | `app/rack.js` (all 618 lines) | −618 |
| | `app/rack-motion.js` `createRackMotion` (lines 1–135; `createLayoutMotion` stays until the modulation window moves) | −135 |
| | `app/frame-coalescer.js` users in the rack (the two pumps) | −4 |
| | `lab.css` rack rules: §2 columns, hide/peek, chrome column, lists, `.rack-drop`, floats, the scrollbar block, the narrow rule (lines 13–37, 201–206, 262, 360–378, 554–557) | ≈ −60 |
| | `material.css` rack rules (203–216, 225–229, 243–251) | ≈ −25 |
| | `shell.js`: the hand-written WINDOW rows for rack windows (line 203) | becomes `...rack.windowMenu()` |
| | the 26 hand-written hide checks (plan §6.3): they read `window-activity` instead | — |
| A NEBULA-port app (NEBULA-REDUX, SOLEIL, AUTOMATA, POLAR, EARTH) | the rack half of the 543-line port (its `layout` verbs, the menus, the drag, the phone crossing); `rack-menus.js` where copied; the rack rules in its `lab.css`/`skin.css` | ≈ −400 to −550 JS, ≈ −60 CSS each (from survey D's counts, not measured app by app) |
| EARTH | `cardkit.js`'s own lazy-card machinery (`addWindow(…, { closed: true })`, the first-`devopen` bind) | its lifecycle hooks map onto `register` |

**What stays in the app:**
- the transport card and its dock chip;
- `copyDigest`;
- retired-id maps;
- the notebook's size in a layout;
- BASINS' scrollbar seat.

An app with retired ids maps them before calling `apply`.

## Proofs

- `tests/rack.node.mjs`: the pure part (7 groups).
- `tests/rack.browser.mjs` on `tests/fixtures/rack.html`, with real CDP input and every press hit-tested with `elementFromPoint`. 23 checks:
  - laziness;
  - `+`, and the SHIFT-queue in pick order;
  - reorder with the slot drawn at the exact landing;
  - drag out to float, then drag back into the lit slot;
  - Escape after a reorder reversed halfway;
  - a finger's long press carried off the rack and halfway back, then `touchCancel`;
  - the keyboard;
  - hide with no rack ancestor below opacity 1 at any of about 37 sampled frames;
  - window-activity's `rack-hidden`;
  - edge peek and its release;
  - show by the button;
  - H and the edge handle;
  - the transport's dodge both ways;
  - zero frames and zero rAF after a drag;
  - the WINDOW menu;
  - the layout across a reload;
  - an unknown saved id ignored.
- Plates: `docs/plates/rack/rack-dark.png`, `rack-light.png`, `rack-mid-drag-slot.png`.

**Not proven:**
- WebKit or a real iPad: the long press ran under Chromium's touch emulation.
- The phone crossing in a browser: the node tests cover the layout shape, and the crossing code is λWAVES' as it stands.
- The Linux blur bug itself: the law is enforced and tested as "no ancestor below opacity 1", but no Linux GPU run was made.
- A hidden page cancelling a drag: CDP cannot hide a headless page.
