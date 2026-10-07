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

With `createApp()` (`mir/app.js`) the rack is made for you (`app.rack`, with the bar as its transport and no `+`/☆ chrome of its own: the bar's latches open the windows); register with `open: !app.first` so a first run shows only the bar. The rack's float layer (`rack.el.floats`, `#floats`) is where the kit's own windows go too (modulation, FOLDERS, GUI, the keys' help): they take the pointer there, so an app writes no window layer of its own.

`rack.windows()` lists every registered window, in registration order: `[{ id, title, side, open, built, floating, folded }]` (what `describe()` and the openers read). `rack.keepClear()` gives the rects a new floating window should not land on: each rack showing a window, and the transport bar (FOLDERS' first seat asks it).

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
| `look` | `'auto'` | nodes the rack creates wear the kit's look (`rack.css`); nodes the app already had (found by id) keep the app's. `'kit'` puts the kit's look on both |
| `onChange` | — | `(layout)` after every saved change |
| `scrollbar` | `false` | `true`: the scrollbar seated at the card column (BASINS'), below |
| `tabletClamp` | `true` | on a touch tablet (a coarse pointer wider than 700 px, not the phone) a floating window is clamped wholly inside the visual viewport, 8 px in (BASINS'). `false`: the desktop clamp everywhere |
| `retired` | — | `{ oldId: heirId }`: a saved layout that names an old window id opens its heir instead. If the layout names the heir too, the old record is dropped (BASINS') |
| `persist` | `'all'` | what a reload keeps. `'all'`: every window's side, order, fold, float, and whether the rack is hidden. `'closed'` (BASINS `rack.js persist`): only which windows are closed, and whether the phone rack is shown; each window comes back on its own side, in registration order. ☆ layouts keep everything either way |
| `notebook` | — | the notebook (`createNotebook()`'s result: `size()`, `resize(w, h)`), or `() => it` when it is made later. A layout then keeps the notebook's size as `nb: [w, h]`, and loading a ☆ layout (or `apply`) resizes it. A reload leaves the notebook's own saved size alone |

**`rack.register(spec)` → id.** `spec` is:
- `id` (required, unique), `title` (default: the id in capitals), `side` (`'left'` / `'right'`, its home), `open` (open by default), `glyph` (a `glyph.js` name, shown in the `+` list), `hint`, `action` (the key table's id that opens it: the WINDOW row shows its chord through `windowMenu({ keyOf })`, the bar's latch through `data-key-action`; never a typed key), `status`, `loadingMark`;
- `build(body, api)`, run once, on first open;
- or `el`: a window the app **already built** (`device()`'s result, best, or its `.dev`). It is taken over where it stands: never rebuilt, never moved. `closed: true` starts it closed (BASINS' `addWindow(dev, side, { closed: true })`). Its home side is the rack it stands in unless `side` says otherwise;
- or `eager: true`: built at once, closed until the layout or `open` opens it;
- `card: true` (with `el`): an app card that is not a window, such as BASINS' transport card. It keeps its place in the order and in saved layouts, drags and folds with the rest, keeps its own buttons, and is in neither the `+` list nor the WINDOW menu. A `.dev` the app puts in a rack and never registers is treated the same way;
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

**A finger scrolls the rack** (1.5.0-alpha.19, proven on Josh's iPad). The rack's column has `pointer-events: none` so the picture behind its gaps stays reachable, and its windows take the pointer. Safari does not touch-scroll a scroller whose own `pointer-events` is none, even from a child that takes the pointer (Chromium and Firefox do). So on `body.touch-tablet`, and under `@media (pointer: coarse)`, the column takes the pointer itself (`rack.css`; the rule selects `.mir-rack` and `[data-mir-rack]`, so an adopted column that carries only the attribute gets it too, 1.5.0-alpha.20). The cost: on touch, a finger on the rack's blank areas (the gaps, the gutter, the column below the last window) scrolls the rack instead of reaching the picture. The scene guard already counts those areas as interface, so nothing else changes. A mouse is unchanged. An app needs no rule of its own for this (BASINS' `material.css` rule of the same kind becomes redundant at its re-adoption).

**The transport.** `dodge(rect | null)` takes the rect a floating window reports. The transport moves to whichever seat that rect does not cover. `seat` says which seat it is in. `setHome('bottom' | 'top')` sets the seat the transport rests in (the user's choice on the bar, `docs/TRANSPORT.md`); the dodge then prefers it. `spec(id)` returns a registered window's description (its title, glyph, key, hint) for the bar's openers.

**Menus.**
- `windowMenu({ rack, rackKey, keyOf })` returns the WINDOW menu's rows in the data shape `createMenubar({ menus })` takes: `[label, run, disabled, hint]`. There is one row per registered window: `↑ NAME` raises an open window and `⊕ NAME` opens a closed one. `rack: true` adds a separator and HIDE / SHOW the rack. `keyOf(action) → text` (1.5.0-alpha.19; `createApp` passes `keys.menuKey`) shows each window's chord from the key table beside its row; a window with no `action`, or no `keyOf`, shows none.
- `addMenu` is `{ open(), close(), shown, queued, commit() }` and `favMenu` is `{ open(), close(), shown }`.

**The layout.**
- `capture()` returns `{ v, at, hidden, phoneShown, cards: [{ id, side, open, folded, off, float: { x, y, w, compact, z, index } | null }] }`, in rack order.
- `apply(layout)` arranges every registered window as the layout says.
- The ☆ slots: `saveLayout(slot?)`, `loadLayout(slot)`, `forgetLayout(slot)`, `layouts()`.
- `resetLayout()`: RESET LAYOUT (BASINS' Settings button). Every floating window docks home; every window opens, powers on and unfolds; every window goes back to its home rack (the right rack keeps its order, the left rack's windows that are not left-homed join the end of it, then every left-homed window goes to the left rack in that order); the rack shows. An app card (`card: true`, or a `.dev` the app never registered) keeps its place and its state. A settings row calls it: `trig({ label: 'RESET LAYOUT', onFire: () => rack.resetLayout() })`.

**COPY a window's readouts** (`digest`, `copyDigest`, `digestText`, the `name` option and the `· COPIED` flash) is removed in 1.5.0-alpha.18: no app pressed it.

**The scrollbar at the card column** (`scrollbar: true`, `mir/shell/rack-scrollbar.js`). A rack keeps its native scrolling and its 48-px shadow gutter, so the native bar would sit at the far edge of the gutter, away from the cards (Josh: "scrollers seems to be way too far out from the rack"). This turns the native bar off on a wide screen (`body.rack-scrollbars`) and stands a transparent 12-px track beside the cards instead, at the gutter's inner edge (left rack: its right − gutter − 8; right rack: its left + gutter − 4), 8 px in from the top and bottom, with a 2-px accent thumb centred in it (never shorter than 32 px; 3 px before 1.5.0-alpha.19, Josh on the iPad: "a simple 2PX scroll bar is visible only"). The track is the touch target and paints nothing. The native bar is hidden with `scrollbar-width: none` (the standard property; Safari since 18.2) and `::-webkit-scrollbar { display: none }` (the older engines).
- **An app must not set `scrollbar-width` or `::-webkit-scrollbar` on its rack.** An app sheet is unlayered, so its rule beats the kit's and brings the native bar back beside the kit's thumb: two bars (BASINS' `app/lab.css:164-167` did exactly this on the iPad). Leave the rack's bar to the kit.
- A hand drags the thumb, or presses the track to jump there; a wheel turns it; ↑ ↓ step 40 px, PageUp / PageDown 90 %, Home / End the ends.
- It is gone when there is no gutter (a narrow screen, the phone), no overflow, under H, or while the rack is hidden.
- It paints only when the rack scrolls, resizes or changes, the body's classes change, the window resizes, or the dock span (`span()`) moves during a slide: one paint per frame, nothing at rest.
- `rack.scrollbar` is `{ paint(), tracks, destroy() }`, or null.
- Its tokens (on `.rack-scrollbar`): `--rack-scrollbar-w` 12px, `--rack-scrollbar-thumb-w` 2px, `--rack-scrollbar-thumb-x` 5px, `--rack-scrollbar-rest` .65 (the thumb's opacity at rest; 1 on hover and in a drag), `--rack-scrollbar-fade` 150ms, `--rack-scrollbar-ease` ease, `--rack-scrollbar-focus-r` 6px.

**Reading the state.**
- `built`: how many windows exist. `registered`, `isBuilt(id)`, `window(id)` (the window's `api`).
- `order(side)`, `floating()`, `floatOf(id)`, `peek`, `phone`, `dragging`, `cancelDrag()`.
- `activity`: the rack's `window-activity.js` instance. `el` holds the nodes it made. `sync()` re-checks the phone. `start()`, `destroy()`.

**The dock span.** `span()` returns the page's one dock span (`window/dock.js` `observeSpan` on these two racks), made on first ask. Hand it to every docking window: `createWindow({ dock: { span: rack.span() } })`.

**Pure helpers** (node-tested in `tests/rack.node.mjs`):
- `reorderIndex(boxes, at, center, hyst)`, `insertionIndex(boxes, y)`, `slotRect(col, boxes, index)`, `moveId`;
- `clampFloat`, `detached`, `peekSide`, `dodgeSeat`;
- `queueToggle`, `openOrder`, `favSlot`;
- `readLayout(raw, knownIds, retired)` (keeps `nb`), `closedLayout(windows, { phoneShown })` (the `persist: 'closed'` record), `layoutLabel`, `localStore`, `clampFloatTablet`;
- in `rack-scrollbar.js`: `scrollbarSeat`, `thumbOf`, `SCROLLBAR` (node-tested in `tests/rack-leftovers.node.mjs`);
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
| 3 | BASINS' animated drag and drop (ruled 2026-10-02) | BASINS' `rack-motion.js`, harvested whole (`createRackMotion`). Any change to a card (fold, open, close, content growing, a window dropped in or lifted out) animates its height, and every moved card travels by transform from where it was seen: 320 ms, `cubic-bezier(.22, 1, .36, 1)`. The held card follows the hand by `translate` and settles into its slot on release. A floating window still moves by transform and commits `left/top` once. Reduced motion, `off` and the flat tier jump |
| 3a | The title bar decides (ruled 2026-10-02) | a carried window goes above another window as soon as the middle of its title bar is above that window's middle, and below it as soon as the middle is below. This holds in the rack and when a floating window is dropped over one (`reorderIndex`, `insertionIndex`) |
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
| 5 | Neighbours swap once the held card's CENTRE is 8 px past their middle, and travel (FLIP) | changed by Josh's ruling: the held card's TITLE BAR middle decides, with no hysteresis (none is needed); the travel is BASINS' own motion |
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
| 20 | Touch-tablet clamp to the visual viewport (BASINS) | **closed** (1.5.0-alpha.12): `tabletClamp` (on by default), `clampFloatTablet`; floats re-fit when the visual viewport resizes |
| 21 | Floats re-clamped on resize | kept |
| 22 | COMPACT floating window (the rail chip) | kept (`setCompact`, the `.dev-rail` chip) |
| 23 | The pop chip's face (popOut / dock) and the rail chip's face | kept |
| 24 | `--float-w` as a custom property, not inline width | kept |
| 25 | `raise(id)`: open, unfold, show the rack, top of the rack | kept |
| 26 | `reopen(id, side)`: prepend into a rack, with the card-enter animation | kept (`open`), translate-only entrance, no fade |
| 27 | `devopen` / `devclose` events | kept |
| 28 | `closed()` list, persisted | changed: part of the one layout record |
| 29 | `moveToRack`, `moveCard`, `order`, `orderAll` | changed: `move(id, { side, index })` and `order(side)` |
| 30 | Fold and power restored through the buttons (device closure state) | kept: through `device()`'s own `fold` / `setOff` |
| 31 | `captureLayout` v3: cards with side, folded, closed, off, float | kept; v1 of the kit's shape reads v3 as it is |
| 32 | `applyLayout`: dock all first, then arrange, then float by z | kept |
| 33 | Retired ids resolve to their heir (`retired` map) | **closed** (1.5.0-alpha.12): `createRack({ retired })`; `readLayout` resolves them in the saved layout, in ☆ layouts and in their labels |
| 34 | A layout keeps the notebook's size (`nb`) | **closed** (1.5.0-alpha.12): `createRack({ notebook })`; `capture()` keeps `nb: [w, h]`, a ☆ load or `apply` resizes the notebook |
| 35 | Four ☆ slots; SAVE replaces the oldest when full | kept |
| 36 | ☆ row label: slot · windows · racks · floating · time | kept (`layoutLabel`) |
| 37 | ☆ LOAD rows with × to forget | kept |
| 38 | `+` lists closed windows A→Z with ⊕ | kept; it now also lists never-built windows |
| 39 | `+` marks ★ those in the most recent saved layout | kept; the mark is the drawn `starFill` glyph at the row's font size, not a typed ★ (Josh's call 18, wave 22) |
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
| 66 | Phone: the transport docks at the top of the rack (`wTr` card) | the transport is `shell/transport.js` (`docs/TRANSPORT.md`): its parts, BASINS' and λWAVES' layouts, the dock chip and the docked seat (a rack window named TRANSPORT) |
| 67 | `dockTransport` / the transport's own dock chip | the transport is `shell/transport.js` (`docs/TRANSPORT.md`): its parts, BASINS' and λWAVES' layouts, the dock chip and the docked seat (a rack window named TRANSPORT) |
| 68 | Phone: the hide toggle follows the rack edge in the thumb zone | kept (rack.css) |
| 69 | Narrow screens (≤ 860 px): the rack along the bottom | kept (rack.css) |
| 70 | No way back from H on touch | added: the edge handle |
| 71 | `copyDigest` / `digest` (COPY a window's readouts) | **closed** (1.5.0-alpha.12): `rack.digest(id)`, `rack.copyDigest(id)` with BASINS' flash; the head line's app name is `name`; **removed** in 1.5.0-alpha.18 (no app pressed it) |
| 72 | `resetLayout` | **closed** (1.5.0-alpha.12): `rack.resetLayout()`, BASINS' verb |
| 73 | The rack's own scrollbar seated at the card column (BASINS `rack-scrollbars.js`) | **closed** (1.5.0-alpha.12): `createRack({ scrollbar: true })`, `mir/shell/rack-scrollbar.js`, fed by `span()` |
| 74 | Rack height motion when a card folds (BASINS animates height) | kept (ruled 2026-10-02): BASINS' motion, height included, the one sanctioned layout animation (MOTION-LAW, "The rack's cards") |

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

| | `app/rack-scrollbars.js` (62 lines) and its `skin.css` block (lines 657–667, 11 lines): `createRack({ scrollbar: true })` | −73 |
| | in `app/rack.js`: the tablet branch of `clampFloat` and `isTouchTablet`, `RETIRED` / `heirOf`, the `nb` lines, `resetLayout`, `digest` / `copyDigest` (all inside the 618 above) | — |
| | `lab.css:29` (the COPIED flash) | −1 |

**What stays in the app:**
- the transport is `shell/transport.js` (`docs/TRANSPORT.md`): its parts, BASINS' and λWAVES' layouts, the dock chip and the docked seat (a rack window named TRANSPORT);
- its retired-id map (passed as `retired`), its notebook (passed as `notebook`), and where RESET LAYOUT and COPY are offered (a settings row, a key).

## Adopting into an app that has a rack

The recipe for BASINS, and for any app whose rack predates the kit. It goes in four stages. Each one stands on its own, ships on its own, and deletes something.

**1. The dock span.** Replace every `observeRackBounds()` with **one** `observeSpan({ left: $('rackL'), right: $('rack') })`, or with `rack.span()` after stage 3.
- It is BASINS' rack-bounds:
  - the shadow gutter is subtracted;
  - a rack with no open window, a hidden one (once its slide ends), `phone`, `ui-hidden` and a viewport of 860 px or less count as absent;
  - it has `subscribe` and `setActive`.
- `read()` gives `{ left, right, width }` as before, plus `top` and `bottom`. So `timeline-window.js`, `pattern-window.js` and `rack-scrollbars.js` keep their calls.
- **Deletes:**
  - `rack-bounds.js` (35 lines);
  - the second and third instances (each with its own observers and 350 ms rAF loop);
  - the gutter arithmetic it repeated: `rack.js:399-402`, `scene-input-guard.js:40`, modwindow `dockBounds`.

**2. The rack takes the windows; the motion goes with it.** Call `createRack({ host: $('lab'), store, chrome: false })`. Then turn each `rk.addWindow(dev, side, o)` into `rack.register({ id, el: dev, side, closed: o && o.closed, onPower, onClose })`, and register the transport card with `card: true`.
- The containers are adopted as they are: `#rack`, `#rackL` and `#floats`, with their ids, classes and the app's sheets. The rack adds only `data-side` and `data-mir-adopted`.
- The store is a three-line adapter onto `basins.settings`. The ☆ slots are at `layouts`, and the kit keeps its current layout beside them (tested).
- The app's `layout` verbs map one to one, and outside `rack.js` BASINS calls only four of them:
  - `raise` → `rack.raise`;
  - `toggleRack` → `rack.toggleHidden`;
  - `resetLayout` → `rack.apply({ cards })` with the defaults;
  - `dockTransport` stays the transport's.
- **Deletes:**
  - in `rack.js`: the float layer, the verbs, the drag and its two pumps, the peek, the phone crossing and `wire()` (about 450 of its 618 lines);
  - `createRackMotion` (`rack-motion.js` 1–135). The kit's rack motion IS it: the same observers, the same refresh, the same height and FLIP animations, the same hold / follow / release, 320 ms `cubic-bezier(.22, 1, .36, 1)`. Tested on BASINS' markup (`tests/rack-motion.browser.mjs`). `createLayoutMotion` (136–204, the modulation shelf) stays until the modulation window moves;
  - the `.rack-drop` rule.

**3. The `+` and ☆ menus.** Set `chrome: true`. `#rackToggle`, `#rackAdd`, `#rackFav` and their lists are found by id and keep their look.
- **Deletes:**
  - `rack.js` 307–392 (the menus);
  - the toggle's wiring;
  - the hand-written WINDOW rows (`shell.js:206`), which become `...rack.windowMenu()`.

**4. The containers' look.** Delete the app's rack rules (`lab.css` §2, 360–378, 554–557, the narrow rule; `material.css` 203–251). Pass `look: 'kit'`, or let the rack create its own nodes, and `rack.css` draws them. This is the only stage that changes pixels, so it waits for Josh's eye. The ids stay, so the app's scripts that name `#rack` keep working.

### What BASINS' rack does that the kit still does not

Each item is exact. "Stays" means it stays in BASINS until the kit has it.
1. ~~Height motion~~: **done** (ruled 2026-10-02). What still differs in motion:
   - **The reorder rule.** It is the title bar's middle against the neighbour's middle, by Josh's ruling. BASINS compares the card's centre, ± 8 px.
   - ~~The entrance~~: **matches** (1.5.0-alpha.11): 6 px up over `--rack-enter` (220 ms) on `--rack-enter-ease` (`cubic-bezier(.23, 1, .32, 1)`), BASINS' `.dev-enter`.
   - **A reduced-motion switch mid-session.** BASINS re-runs a refresh when `prefers-reduced-motion` changes. The kit reads the policy at every refresh, so the next change uses the new policy.
   - ~~The lift~~: **matches**: the carried card has no scale (`.dev.dragging` computes `scale: none`, as BASINS' `transform: none`; the house sheet's 1.012 left with INTENT's carried rule in 1.5.0-alpha.3).
2. ~~The scrollbar seat~~: **in the kit** (1.5.0-alpha.12), `scrollbar: true`.
3. ~~The touch-tablet clamp~~: **in the kit** (1.5.0-alpha.12), `tabletClamp`, on by default.
4. ~~Retired ids~~: **in the kit** (1.5.0-alpha.12), `retired: { old: heir }`.
5. **A layout's `docked`.** The kit reads the cards, `rackHidden` and (1.5.0-alpha.12) `nb` from a BASINS record. Docking the transport is the app's: it reads `docked` from the record and acts on it before or after `loadLayout`.
6. **What persists across a reload.** BASINS keeps only the closed list (`closed`, plus the one-shot `rackFileWindowsV1` migration) and `phoneRack` / `phoneTr`. The kit keeps the whole arrangement (order, sides, folds, floats). The first adoption must seed the kit's record from `closed`, or the first load opens the defaults.
7. ~~`copyDigest` / `digest`~~: **in the kit** (1.5.0-alpha.12), with `name` for BASINS' head line. Removed again in 1.5.0-alpha.18: no app pressed it.
8. **The transport card's docking** (`dockTransport`, `dockSide`, `dockIndex`, `wTr`). The card's PLACE is the kit's (`card: true`). Docking it and undocking it are the transport's (`shell/transport.js` in the kit, or BASINS' own).
9. **`body.rack-l`.** BASINS sets it when the left rack has children, and nothing in BASINS reads it now. Not built.

## Proofs

- `tests/rack-leftovers.browser.mjs` on `tests/fixtures/rack-leftovers.html`, real CDP input, presses hit-tested with `elementFromPoint`. 10 checks:
  - the scrollbar stands at the gutter's inner edge, 2 px from the cards, with the native bar off; a rack with no overflow has none;
  - a real drag of the thumb scrolls the rack and the thumb follows; a press low on the track jumps there; Home goes back to the top;
  - a hidden rack takes its bar away, and showing it brings the bar back;
  - a saved layout naming a retired id opens its heir where the old one stood;
  - RESET LAYOUT: a window carried off the rack by a real drag, a folded, a closed, a powered-off and a moved one all come home, and the hidden rack shows;
  - a ☆ layout keeps the notebook's size, and loading it resizes the notebook;
  - COPY's text and its 900-ms flash;
  - under touch emulation at 1280 px a float is kept wholly inside the viewport, 8 px in.
- `tests/rack-leftovers.node.mjs`: retired ids and `nb` in `readLayout`, the tablet clamp, the scrollbar's seat and thumb, COPY's text.
- The 48-px shadow gutter, measured against BASINS running (1280 × 800). In both: racks 348 px wide, the gutter 48 px, the inward padding 58 px and the outer 10 px, `pointer-events: none` on the column. The one difference was a landscape phone wider than 860 px: BASINS has no gutter there (`body:not(.phone)`) and the kit had one; `body.phone .mir-rack` now sets it to 0. BASINS pads the inward side with `--rack-gap` and the kit with `--rack-inset`; every SPACING level sets the two equal, so nothing paints differently.

- `tests/rack-motion.browser.mjs`, on `gallery/rack.html` and on BASINS' markup (`tests/fixtures/rack-basins.html`). 8 checks:
  - a real click folds a window: its height animates and the window below travels with it, 38 sampled frames, 15 distinct positions, no step over a third of the 145-px travel, ending exactly;
  - a drag that moved the others, reversed halfway, then Escape: exactly where it began;
  - reduced motion jumps;
  - idle is zero rAF;
  - **the title bar decides** at three heights of the dragged window (about 200, 400 and 600 px): 2 px below the neighbour's middle it stays below, 2 px above it goes above, and the slot is drawn there.
- Plates: `docs/plates/rack/rack-motion-mid-fold.png`, `rack-motion-mid-drag.png`.

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
- `tests/rack-adopt.browser.mjs` on `tests/fixtures/rack-basins.html` (BASINS' markup and id rules, windows built eagerly by the app, the transport card in the left rack). 12 checks:
  - the span: the 48-px gutter is subtracted; an empty rack, a hidden one, the phone, H and a viewport of 860 px or less are absent; `setActive(false)` is quiet;
  - adoption: one of each container, no kit look class, the app's own width, every window the same node (never rebuilt), the eager window built once, the app's order kept;
  - an adopted window drags (hit-tested);
  - the app's own `+` opens the kit's list, and the card is in neither menu;
  - a ☆ layout written by **BASINS' own `rack.js`** (`tests/fixtures/basins-layout.json`) loads through the store adapter: order, sides, fold, close, the float at (520, 180), and the transport card's place.
- Plates: `docs/plates/rack/rack-dark.png`, `rack-light.png`, `rack-mid-drag-slot.png`.

**Not proven:**
- WebKit or a real iPad: the long press ran under Chromium's touch emulation.
- The phone crossing in a browser: the node tests cover the layout shape, and the crossing code is λWAVES' as it stands.
- The Linux blur bug itself: the law is enforced and tested as "no ancestor below opacity 1", but no Linux GPU run was made.
- A hidden page cancelling a drag: CDP cannot hide a headless page.
- The tablet clamp on a real iPad with the on-screen keyboard up (the visual viewport smaller than the layout one): the node test covers the arithmetic; the browser check ran under Chromium's touch emulation with the full viewport.
