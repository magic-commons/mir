# MIR · WINDOWS — the one floating window

Three modules in `mir/window/` and one sheet. (The rack's windows, the `.dev` cards in the columns at the screen's edges, are `mir/shell/rack.js`: see `docs/RACK.md`. A kit window that reports `onMoved` can hand that rect to `rack.dodge()` so the transport gives way.) They are built on the core (`docs/CORE.md`) and add no runtime of their own. Load `mir/window/window.css` after the kit's sheets and `mir/core/core.css`; it lives in `@layer mir.kit.house`. Play with it at `gallery/windows.html`.

## The laws

1. **One species, one place that places it.** A window is a glass pane plus a chip rail beside it. One pure function, `windowLayout(state, env)`, turns `{ x, y, w, h, open, dock, chipSide }` into the pane's rect and the rail's seat. Every gesture changes the state and calls it. While the window's own placement tween owns the pane (`motion.owns`), a plain relayout waits for it to land.
2. **Hooks, not looks.** The DOM carries `data-mir-window="<id>"`, `data-mir-rail="<id>"`, `data-mir-chip="<name>"` + `data-glyph`, and classes. No stylesheet is cloned and nothing is styled by its label. The pane is a `.glass`, so skin.css paints it in every seat. Its chips follow lab.css §56: **each disc wears its own window's fill and filter**.
3. **Open and close travel** (`presence`), window and rail together. **A dock landing travels** (`tweenRect`). **A rail relocation travels**: same orientation by `tweenRect`, a turn of orientation by `flip`. The window makes room in the same motion.
4. **Every gesture is `pointer.drag`.** Moves are coalesced and the last sample is flushed before the commit. Escape, a lost capture, a blur or a hidden page rolls the state back, and nothing is persisted.
5. **Empty glass is a handle** (`emptyDrag`). A press on nothing pressable is handed to the grip, so one machinery moves the window.
6. **Window and rail rise together.** One stack is shared by every window. z is the pair's place in that stack (1, 2, 3 …), so it stays below the guide's `--z-prox` and nothing reads a sibling's style.
7. **The guide is the landing.** `dockGeometry()` gives the landing rect, with the chip lane on the chips' side. The guide is drawn at exactly that rect (`proximity.js`, reach 96, capture 32).
8. **The rail is always reachable, and its preference is never overwritten.** The solver tries the preferred side, then the other three, then the first side the rail fits on at all, and finally clamps. A docked window's rail sits in its lane.
9. **A chip says one thing in one place.** Each state is a row of one table, declared with the chip. The row sets `.on`, `aria-pressed` (true/false/mixed), `data-state`, the label, the hint (title) and the ink (a glyph or short text).
10. **Three hands can move the rail.** Shift-drag on the grip: the nearest edge wins. A long press on the grip (450 ms): four seat guides appear and the finger picks one. The keyboard on the grip: arrows preview, Enter keeps, Escape restores, and Shift+arrows nudge the window by 24 px.
11. **It says where it is.** `onMoved(rect)` fires after every layout and `onMoved(null)` on close.

## The API

**`window/window.js`**
- `createWindow({ id, title, host, chips, body | panels, size, min, resizable, emptyDrag, dock, persist, material, railGap, railTier, onMoved, onOpen, onClose })` returns `{ root, body, rail, panels, open(), close(), toggle(), isOpen(), rect(), place(rect | pos, { animate }), setChip(name, state), tab(name), raise(), pair, stackAt(z), state(), destroy() }`.
  - **The pane and its rail are one window in the stack.** A kit window is two elements: the pane (`root`) and its chip rail (`rail.el`), which sits outside the pane. `raise()` brings both to the top together (a press on either does it). For an app with its **own window law** (BASINS' kwin `installWindowLaw`):
    - `windowOf(el)` (exported from `window/window.js`) returns the window whose pane or rail is `el` (or holds it), so a law that raises by element calls `windowOf(el).raise()` and the rail comes with it;
    - `pair` is `{ root, rail }`, the two elements, for a law that walks its windows;
    - `stackAt(z, { railOffset })` puts the pane at z-index `z` and its rail at `z + railOffset`, for a law that keeps its own counter. The offset defaults to `createWindow({ railTier })`, which is 1 (the rail just above its pane, the two never part); an app whose law keeps every rail in a tier above every window (BASINS: rails at 1,000,000 + the window's z) sets `railTier` once and calls `stackAt(z)` as before.
  - `body` is a Node or `fn(bodyEl)`. `panels` is `[{ name, body }]`, one shown at a time; a radio chip named like a panel switches to it.
  - `dock` is `{ span, guide, anchor?, guideClass? }`.
    - `span` is `{ read(), subscribe(fn) }` (from `observeSpan`).
    - `guide()` is the Display switch, which hides the guide and keeps the snap.
    - `anchor` is a **seat on another element** the window can dock to: BASINS' `anchorTarget`, the PATTERN window seated on its ENV device. It is `{ rect() → DOMRect | null, clip?() → DOMRect | null, subscribe?(fn) → off }`.
      - Dragged within 96 px, corner to corner, of the seat, the window lights the same guide as an edge dock. Within 32 px, release lands it there.
      - It lands at the seat's left, top and width, at the window's own height, clamp-free (as kwin's `place`).
      - It follows the seat when the host calls the subscribed function.
      - It is cut to `clip()` (a `clip-path: inset(…)` on the pane).
      - It hides (window and rail `visibility: hidden`, `data-anchor="away"`) while the seat is gone or clipped away entirely.
      - `dock: 'anchor'` persists. Dragging it away detaches it, as an edge dock does.
    - `guideClass` is a class list put on this window's guide overlays, so an app's rigs keep their selector. BASINS: `guideClass: 'mod-snap-guide'` with the window id `patternwin` keeps `.mod-snap-guide[data-window="patternwin"]`.
  - `material: 'modulation'` (or `true`): the window wears the modulation window's material: rail, chips, controls, resize corner; no CSS cloning. It writes `data-mir-material="modulation"` on the window's root and on its rail, and `mir/window/window.css` and `mir/css/skin.css` key on that one name (the modulation window's material on SAVE / TIMELINE / COLOUR, in place of kwin's cloned rules). `'modulation'` is the only material name today.
  - `railGap` is how far a **floating** window's rail sits from its pane: one number, or `{ left, right, top, bottom }`. The default `RAIL.gap` is kwin's: 8 px on the right, flush on the left, top and bottom. A docked rail is always flush, in its lane, as snap-window seats it.
  - `persist` is `{ read() → shape | null, write(shape) }`. It is written on release, resize end, dock, a kept seat, open, close and `place`; never mid-gesture or on cancel.
  - A window whose persisted shape says it was **open** opens one microtask after `createWindow` returns, not inside the call. So its `onOpen` may already use the returned window and anything the host builds right after the call; `isOpen()` is `false` until then. A window destroyed before that microtask never opens.
- Pure: `readShape(raw, defaults, min)` (dock `top | bottom | anchor`), `windowLayout(state, env)` (env may carry `gap`, default 0, and `anchor`, the seat rect), `dockInput(state, env)`, `CLAMP` (120 px across and 52 px down stay on screen).
- **A scripted press is a press.** A `PointerEvent` built in script is `isPrimary: false` unless it says otherwise, and `core/pointer.js` `drag()` takes only a primary pointer. BASINS' `save-gate.js` drags the grip and the corner with such events, as it did kwin's. So the window re-sends an **untrusted**, primary-button press that did not say `isPrimary` as primary, once, from the same target. A real second finger (trusted) is still refused, and everything after the press is the drag's own law.

**`window/rail.js`**
- `createRail({ id, title, chips, layer, seats, onChip, onSide, onNudge })` returns `{ el, grip, chip(name), setChip(name, state), state(name), measure(), sizes(), seat(seat, { animate }), holding(), destroy() }`. `window.js` makes it; use it directly only for a rail without a window.
- A chip is `{ name, kind, label, hint?, glyph? | text?, group?, states?, state?, press?(state, win) }`, where kind is `close | action | toggle | radio | cycle | grip`. A toggle or radio may give `states: { true: {…}, false: {…} }`. A cycle gives `states: [{ id, pressed: true | false | 'mixed', label, hint, glyph | text }]` in its order. The close chip and the grip are added when absent.
- Pure: `seatRail({ prefer, box, sizes, view, gap })`, `seatOn(side, box, sizes, view, pad, gap)`, `chipPosition(side, box, w, h, view, pad, gap)`, `nearestSide(x, y, box)`, `roomFor(box, side, sizes, view, pad, gap)` (the window makes room for rail and gap), `chipTable(spec)`, `nextState(spec, state)`, `gapOf(gap, side)`, `SIDES`, `RAIL` (`RAIL.gap` = kwin's `{ left: 0, right: 8, top: 0, bottom: 0 }`). Every `gap` defaults to 0, which is how the modulation window seats its rail (BASINS `positionChips`).

**`window/dock.js`**
- `dockGeometry({ span, side, dock, height, railSizes, viewport })` returns `{ left, top, width, height, side } | null`.
- `dockTargets(o)` returns the two docks as proximity targets, each with `rect` = `dockGeometry()`.
- `createDockGuide({ layer, enabled, window, cls })` returns `{ track(box, o, seat?), end() → target | null, cancel(), destroy() }`.
  - With a `seat`, the anchor is a third target. The nearer one wins when both capture.
  - There is one drawing, the kit's (`core.css .mir-prox`), painted into `layer` as before.
  - The overlays carry stable hooks: `data-mir-guide="dock"`, `data-window="<window>"`, `data-edge="top | bottom | anchor"` while lit, and the classes in `cls`.
- `anchorTarget(box, seat, { reach })` returns the anchor as a proximity target: corner to corner, landing at `anchorBox(seat, height)`.
- `observeSpan({ left, right, edge, view, occupied, narrow, active })` returns `{ read(), subscribe(fn), setActive(on), active, destroy() }`, where `read()` gives `{ left, right, width, top, bottom }`. Make **one** per page (a rack's is `rack.span()`). It is BASINS' `observeRackBounds`, so a window docks where BASINS docked it:
  - each rack's edge is its logical edge: `--rack-shadow-gutter` is subtracted;
  - a rack is absent (the span runs to the screen edge, 8 px in) when it is missing or `hidden`, when it holds no open window (`occupied`, default `.dev:not(.closed):not([hidden])`; `false` counts any rack), when it is `display: none` or `visibility: hidden`, under `body.phone` or `body.ui-hidden`, or when the viewport is `narrow` (860) px wide or less;
  - `setActive(false)` stops it publishing, while `read()` still answers.

  It does no work while idle: a resize, a ResizeObserver tick or a class / membership change books one read, and a rack's own transition is followed through the one frame until it ends.

**`window/window.css`** declares these tokens on `.mir-rail`:
- `--chip-fill` and `--chip-filter`: the pane's seat ladder.
- `--chip-lift`: hover.
- `--chip-rim`, `--chip-on` ← `--state-on`, `--chip-on-rim` ← `--state-on-rim`: ON.
- `--chip-sink`: press.
- `--chrome-chip-disc` (48) and `--chrome-chip-target` (62).

## What this replaces

Paths are in BASINS `app/`, as listed in survey B (vault `MIR 1.5 SURVEY 2026-10-01/B`).

| Here | Replaces |
|---|---|
| `rail.js` `createRail` | the kit's `buildChipRail` (modwindow.js:484-533) and kwin's node-for-node copy (kwin.js:279-305) |
| `rail.js` `setChip` + `chipTable` | kwin `setChip` (kwin.js:466-471); the hand-written cycles: MOD WORK BARS / COMPACT (modwindow.js:396-430), TL WORK BARS (timeline-window.js:21-24), SAVE sort text ink (save-window.js:330-338) |
| `rail.js` `seatRail` / `chipPosition` / `nearestSide` | `positionChips` (modwindow.js:200-224), `seat` (snap-window.js:27-46), kwin's own seat arithmetic (kwin.js:348-353), `nearestChipSide` / `chipPosition` (mod-window-snap.js:25-41) |
| `rail.js` `measure` (one read) | `railSizes` ×2 (modwindow.js:186-191, snap-window.js:20-25): two forced reflows per guide frame |
| `rail.js` long press + keyboard | nothing: today there is no touch or keyboard path to relocate chips |
| `window.js` drag / resize / cancel | the drag ×3 (modwindow.js:443-535, snap-window.js:47-127, kwin.js:362-419); the resize (kwin.js:399-419, snap-window.js:65-72) |
| `window.js` `emptyDrag` | kwin.js:384-397 (SAVE only) |
| `window.js` raise + `.press` | kwin `installWindowLaw` / `raiseWindow` (kwin.js:86-137): every sibling's computed style read per press, and a z that only grows |
| `window.js` presence | instant `hidden` toggles (modwindow.js:3050-3067, kwin.js:447-462) |
| `window.js` `readShape` | three persistence shapes (modwindow.js:2994-2997; timeline-window.js:30, :42 + snap-window.js:148-149; save-window.js:319, :344, :361, :828) |
| `window.js` `onMoved` | `port.moved` (modwindow.js:379), `moved` (timeline-window.js:30); SAVE had none |
| `window.css` | `adoptMaterial` (kwin.js:162-207, ~1,250 cloned rules per window); the §56 chip law (lab.css:405-436, `:root`×6 ladders) |
| `dock.js` `dockGeometry` / `dockTargets` | `timelineDockGeometry` (timeline-dock.js:4-19); `snapTarget` (mod-window-snap.js:13-23), the guide that was not the landing |
| `dock.js` guide | `showGuide` ×2 (snap-window.js:47-61, modwindow.js:451-465), `mod-snap-guide.css:2-12` |
| `dock.js` `observeSpan` | `observeRackBounds` (rack-bounds.js:3-35), instantiated twice (modwindow.js:183, timeline-window.js:13) with two 350 ms rAF loops |
| `layout({ animate })` → `tweenRect` | the dock commit teleport (snap-window.js:103-105, modwindow.js:505-507); `window-resize-motion.js:4-22` (WAAPI on left/top/width/height) |

## Moving a window onto it (recipes; not done here)

**MODULATION (kit `createModWindow` + BASINS `modwindow.js`).**
1. Keep the panel builder. Mount `createModWindow`'s panel into `createWindow({ id: 'modulation', title: 'MODULATION', host: floats, body })` inside a wrapper `div#modwin.mir-modwindow.modwin` with no `.kwin` and no `.glass`. The plugin sheets keep matching `#modwin.mir-modwindow …`, and the pane is the kit's.
2. Chips: COMPACT is `cycle` F → C → M; WORK BARS is `cycle` bottom → top → hidden, with `pressed` declared once (Josh still has to pick the canonical order, survey Q6); ADD MACRO and ADD DEVICE are `action`.
3. `sizeLaw` gives `place({ width, height })`. `dock: { span, guide: () => !body.classList.contains('no-mod-dock-guide') }`.
4. Delete modwindow.js:180-224 and :443-535 (guide, seat, drag, Shift).
5. Map `basins.settings.modwin`'s `x, y, dock, chipSide` through `readShape`. Its other fields stay its own.

**TIMELINE (`timeline-window.js`).**
1. Replace `createKwin` + `snapWindow` with `createWindow({ id: 'timeline', resizable: true, size: { w: 1080, h: 440 }, min: { w: 320, h: 400 }, dock: { span, guide }, persist, body: editorShell })`.
2. Chips: WORK BARS `cycle`; + lane and − lane are `action`; reset size is `action` with `press: (s, w) => w.place({ width: 1080, height: 440 })`.
3. The lego stack (`reserveTop`) becomes the host's span: `{ read: () => ({ ...span.read(), top: 8 + inset }), subscribe: span.subscribe }`. `dockGeometry` already honours `span.top`.
4. Delete `rack-bounds.js`'s second instance. The `followingStack` guard can go once MOD stacks through TIMELINE's span instead of calling `place()`. `onMoved` must never place the window that reported it: nothing here guards against that re-entry.

**SAVE → FOLDERS (`save-window.js`).**
1. Use `createWindow({ id: 'folders', title: 'FOLDERS', panels: [{ name: 'gallery' }, { name: 'render' }], resizable: true, emptyDrag: '.sv-card, .sv-folder, .sv-context', size: { w: 380, h: 680 }, min: { w: 280, h: 360 } })`.
2. Chips: GALLERY and RENDER are `radio` in one group, named like the panels. Sort is `cycle` with `text` ink.
3. First seat, top right beside the rack: when `state().x === null`, call `place({ x, y })` before `open()`.
4. Delete the sheet hack (hiding `kwin.body`, inserting `.sv-sheet`). The pointer-events give-back (save.css:18) becomes unnecessary because `.mir-win` takes its own pointer events, but **keep a hit-test gate** (`elementFromPoint`), as `tests/window.browser.mjs` does.
5. Keep the pref key `savewin` and read it through `readShape` (no migration). Never rename `basins.library`.
6. It now gets dock, Shift / long-press / keyboard seats, motion, `moved` (the transport dodge) and the cancel paths. Docking is optional (survey Q4): omit `dock` to keep it floating.

## Proofs

- `tests/window-rail.node.mjs`: the solver (every fallback branch; the preference is kept), nearest edge, room-making, and the chip tables (toggle, radio, cycle).
- `tests/window-dock.node.mjs`: the lane on each side, the fallbacks, guide = landing (`dockTargets` against `dockGeometry` and `windowLayout`), the clamp, and the persisted shape.
- `tests/window.browser.mjs` on `tests/fixtures/window.html`, with real CDP input:
  - presence in and out;
  - `elementFromPoint` on the glass, a body control and every chip;
  - real clicks through the cycle and the radio pair;
  - the drag and its three cancels;
  - empty glass;
  - the dock: the guide rect equals the landing within 0.5 px, and the landing travels then settles;
  - Shift-drag, long press and keyboard, each moving the rail while the window makes room;
  - the guide switch, the raise, and the disc against its pane in 8 seats;
  - geometry against the modulation rail, and the idle law.
- Not proven: WebKit or a real iPad (the long press ran under Chromium's touch emulation); a hidden page (CDP cannot hide a headless page).
