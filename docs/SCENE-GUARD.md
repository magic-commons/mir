# MIR · SCENE GUARD — the UI's space never lets input fall through to the picture

`mir/shell/scene-guard.js`. A wheel or a press anywhere in the interface's space — a rack column, a floating window's whole rect, the gaps between its parts, its round corners — never reaches the picture underneath. Josh, 2026-10-01: *"the scroll still works on the fractal instead of not doing anything because we're in UI space."*

**Why it is needed.** The kit's floating windows, racks and rails sit in pointer-transparent hosts, so a gap between a window's head and its body, or a window's rounded corner, is hit-tested as the canvas underneath. Without the guard, the wheel there zooms the picture and a tap there starts navigation.

**How it works (BASINS' design).** No shield, no backdrop, no CSS, no measurement loop. When an event arrives on the canvas, the guard asks "is this point inside a UI rect?" and, if so, the picture never sees it.

## Use it

With `createApp()` you have it already: the guard watches the first `<canvas>` in the stage (or `createApp({ canvas })`) against the rack and the kit's float layer. It is `app.sceneGuard`; `createApp({ sceneGuard: false })` leaves it out.

By hand:

```js
import { createSceneGuard, uiSpace } from './mir/shell/scene-guard.js';
const guard = createSceneGuard({ canvas, rects: uiSpace({ rack }) });              // the kit's UI space in one call
// your own rects too:
const guard2 = createSceneGuard({ canvas, rects: uiSpace({ rack, extra: () => [myPanel.getBoundingClientRect()] }) });
// or any list: [...rack.keepClear(), ...windows.map((w) => w.rect())]
```

`uiSpace({ rack, layer, extra })` is the list a kit app needs:

| Space | Rect | Its wheel goes to |
|---|---|---|
| a rack column with a window showing | the column, **without** its 48-px shadow gutter (paint, not UI), following its real transform while it hides or reveals | the rack (it scrolls) |
| everything visible in the float layer (`rack.el.floats`): a floating rack window, a kit window, its rail, the modulation window | its **whole** rect; the modulation window's work bars are added even where they stand outside it | the modulation window's device row; the timeline's viewport when the point is over it; otherwise nothing (the wheel is swallowed) |
| `extra()` | the app's own rects | an entry's `scroll` (an element, or `(event) → element`) |

Two ways to install it:

- **`install: true` (the default).** The guard listens on the window in the capture phase and stops an event aimed at `canvas` in UI space before any of the app's listeners see it: `pointerdown`, `mousedown`, `touchstart`, `click`, `dblclick`, `contextmenu`, `wheel`, and hover moves when `hover: true`. The app's gesture code needs no change.
- **`install: false`.** Nothing is installed; the app's own gesture engine asks, as BASINS' `gestures.js` does:

```js
canvas.addEventListener('wheel', (e) => { const r = guard.hit(e); if (r) guard.wheel(e, r); else onWheel(e); }, { passive: false });
canvas.addEventListener('pointerdown', (e) => { if (guard.hit(e)) { e.preventDefault(); return; } onPointerDown(e); });
```

## The laws

| Law | How |
|---|---|
| A rect, not a target | UI space is a list of rects read when an event arrives; nothing is laid over the picture and nothing measures while idle |
| A wheel in UI space never zooms the picture | it is re-dispatched as a wheel to the region's scroller, whose own handler keeps its zoom and modifiers; if nobody took it and no Ctrl/⌘ is held, the scroller is scrolled by hand along each axis whose overflow is `auto` or `scroll` (a synthetic wheel scrolls nothing natively). A region with no scroller swallows it |
| A press in UI space starts nothing | a mouse press, a touch tap and a swipe that starts in a gap give the picture no `pointerdown`, no move, no up and no `click` |
| A drag begun on the picture keeps going | the moves and the up of a pointer that went down outside UI space always reach the picture, across any window |
| Hover | a new hover over UI space (no button down) is held back only with `hover: true` (BASINS: a cruise cannot be steered through a gap) |
| Hidden UI releases its space | with `body.ui-hidden` (H) nothing is UI space |
| The shadow gutter is the picture's | the picture beside a rack, and beside a float, still takes the wheel |

## API

`createSceneGuard({ canvas, rects, hover = false, install = true }) → { hit(e), wheel(e, region), destroy() }`

- `rects` — `() → [{ left, top, right, bottom } | { left, top, width, height }, …]`, each entry optionally with `scroll`
- `hit(e)` — the region under the event (`{ left, top, right, bottom, scroll }`), or `null`
- `wheel(e, region)` — prevents the event's default and forwards it, as the second law says

`uiSpace({ rack, layer = rack.el.floats, extra }) → rects()`. Pure helpers, exported: `box(r)`, `regionAt(list, e)`, `wheelStep(deltaMode, pageHeight)`.

## Proof

`tests/scene-guard.browser.mjs` runs a whole `createApp()` over a canvas with a floating window (its parts disconnected), two windows in the right rack and the KEYS window open, and drives it with real wheel, mouse, touch and keys. Each probe point is first hit-tested with `elementFromPoint` to show it IS the canvas underneath (the floating window's gap, the KEYS window's corner, the gap between two rack cards, the shadow gutter, the clear picture). Then: the wheel in those gaps never reaches the picture; in the rack's gap it is re-dispatched and the rack scrolls; in the gutter and the clear picture it reaches the picture; a press and a touch tap and swipe in a gap give the picture nothing; a drag begun on the picture keeps its moves and its up across a gap; after H the gap is the picture's again.

**An app deletes:** BASINS' `scene-input-guard.js` (68 lines) and the four guard lines in `gestures.js` `installGestures` (`sceneUI`), once its gesture engine runs on the kit's canvas with `createApp` or calls `hit()` / `wheel()` itself.
