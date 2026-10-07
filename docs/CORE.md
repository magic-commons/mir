# MIR · CORE — the runtime under the windows

Five small modules in `mir/core/` and one sheet. No dependency between them except downward: `perf` ← `frame` ← `motion`/`pointer`/`proximity`. Load `mir/core/core.css` after the kit's sheets; it is all inside `@layer mir.core`, so any unlayered app rule wins. Play with all of it at `gallery/core.html`.

## The laws

1. **One writer per element.** While a motion holds an element, nothing else places it. `owns(el)` says so; `settled(el)` resolves after the *last* motion on it lands. A caller with a new placement does `if (owns(el)) settled(el).then(place); else place();`.
2. **No layout animation.** Movement animates `translate`/`scale` only. `tweenRect` writes the layout once, first, then travels by `translate` and reveals a grown side with `clip-path` (1.5.0-alpha.19: it never scales a box, so a window is never shown as a stretched picture of another layout); `flip` measures the layout the caller's `mutate` made. **One ruled exception:** a rack card's height (`shell/rack.js`, BASINS' rack motion, Josh 2026-10-02: "Yes to basins animated drag and drop"). It goes through `own(el, anim)`, is skipped under reduced / off / flat, and keeps law 1 (docs/MOTION-LAW.md, "The rack's cards").
3. **Idle is zero work.** With nothing queued, the frame books no rAF and no timer; `__MIR.perf` shows zero writes, reads and frames (gated by `tests/core.browser.mjs`).
4. **Cancel always rolls back.** A drag ends by release (the last sample is flushed first) or by cancel (pointercancel, lost capture, window blur, a hidden page, Escape), and a cancel calls the rollback. A proximity guide clears on the same events.
5. **Every motion is interruptible.** Called again mid-flight, it starts from the current *visual* state and lands exactly on the newest target. Ten calls end on the tenth. No timers: endings ride `Animation.finished`.
6. **One reduced-motion signal.** `motionPolicy()` is `full | reduced | off`, from the OS unless the app set one, mirrored on `<html data-motion>`. Under `reduced` nothing travels (flip and tweenRect land at once; presence fades opacity only, MOTION-LAW: fewer and gentler, never zero). Under `off` nothing animates and the CSS duration tokens are 0 ms.

## The API

**`core/frame.js`** — the UI's one frame.
- `frame.read(fn)`, `frame.write(fn)` — queued; each frame runs every read, then the coalesced jobs, then every write. Work queued during a batch runs next frame.
- `frame.coalesce(key, fn)` — one job per key per frame, the latest wins (the drag pump).
- `frame.flush(key?)` — run one key, or the whole queue, now. `frame.cancel(key)` — drop one.
- `frame.tick(now)` + `frame.drive(kick)` — the app's loop runs the batch; the frame books no rAF of its own and calls `kick()` to wake the loop. `drive(null)` hands rAF back.
- A 32 ms timer floor rides every booking, so a busy GPU frame cannot stall a drag; whichever of rAF and timer fires first runs the batch.
- `frame.state()` → `{ pending, scheduled, raf, timer, driven }`. `createFrame({ raf, caf, setTimer, clearTimer, now, floor, count })` for tests.

**`core/motion.js`** — the one motion primitive.
- Tokens: `--motion-micro` 80 ms, `--motion-ui` 160 ms, `--motion-structural` 320 ms, `--ease-out` `cubic-bezier(.22,1,.36,1)`, `--ease-in` `cubic-bezier(.55,0,1,.45)` (exits only). `motionToken(name)` reads them; `MOTION` holds the same numbers as the fallback.
- `motionPolicy()`, `setMotionPolicy('auto'|'full'|'reduced'|'off')`, `resolvePolicy(setting, mediaReduced)`.
- `flip(nodes, mutate, { duration, easing })` — nodes is an array or a function (read before and after `mutate`).
- `tweenRect(el, rect, { duration, easing, commit })` — a positioned box to a viewport rect. It rests first, then travels (1.5.0-alpha.19; Josh on the iPad: the dock "squashes it horizontally, before readjusting"): `commit(el, to, layoutRect)` writes the layout once, before the first frame, then the box travels by `translate` from where it was seen, and a side that grew is revealed by `clip-path` as it goes (a side that shrank snaps); nothing is scaled. The default `commit` is `commitRect`, which shifts inline left/top/width/height by the difference (right for fixed or absolute). `tweenRect(el, el.getBoundingClientRect())` stops a motion where it is.
- `presence(el, show, { duration })` — toggles `hidden`: shown before the entrance, hidden after the exit.
- `sequence(steps)` → `{ finished: Promise<boolean>, cancel() }` — each step returns an Animation, a promise or nothing.
- `owns(el)`, `settled(el)`. `own(el, anim)` — a motion made elsewhere (the rack's) joins the registry, so `owns` / `settled` see it. Every motion returns a promise: `true` when it landed, `false` when superseded.

**`core/pointer.js`**
- `drag(el, { slop = 4, button = 0, onStart, onMove, onEnd, onCancel })` → `{ cancel(), destroy(), active }`. A sample is `{ x, y, x0, y0, dx, dy, shiftKey, altKey, ctrlKey, metaKey, pointerType, pointerId }`; a modifier pressed mid-drag sends a move. A press that never passes the slop is a click and calls nothing. Give the handle `touch-action: none`.
- `installPress({ selector = 'button, [role="button"]', root })` → uninstall. `.press` from a capture-phase pointerdown for every pointer type until that pointer lifts or cancels.
- `pointerField(el, { touch = false })` → destroy. Writes `--px/--py` (0..1), `--pxs/--pys` (−1..1) and `data-pointer="in"`; one rect read per enter; cleared on leave and blur; nothing unless the policy is `full`. `core.css` `.mir-glow` draws a soft accent light from it.

**`core/proximity.js`**
- `createProximity({ layer, reach = 96, capture = 32, enabled, onCancel })` → `{ update(probe, targets), end(), cancel(), destroy(), last }`.
- A target is `{ id, rect, hit?, shape?, el? }`: `rect` is the **exact landing rect** (where the guide is drawn), `hit` is what distance is measured to (a rect, a line = a rect of zero height, or a point; default `rect`), `shape` is `rect | slot | ring`, `el` paints on an existing element (a ring around a knob) instead of a pooled overlay.
- `update` returns `{ list, best, distance, strength, captured }` at once and paints next frame: `--prox` 0..1 and `data-prox="far|near|capture"`. Strength is 0 at `reach`, 1 at `capture`, smoothstep between; only the nearest target inside `capture` is captured. `end()` fades the guides and returns the last measurement for the commit; `enabled()` false still measures (snapping works) and draws nothing.
- Pure: `distance(probe, hit)`, `strength(d, reach, capture)`, `measure(probe, targets, { reach, capture })`.

**`core/perf.js`** — `window.__MIR.perf`.
- `setText(el, s)`, `setVar(el, name, v)` (any style property; `null` removes), `setAttr(el, name, v)` — each skips an identical write and counts it as `skipped`.
- `rect(el)` — the counted layout read. `count(name, n)` — what `frame` feeds (`frames`, `timers`).
- `snapshot()` → `{ writes, skipped, reads, frames, timers, longTasks, longestMs, ms }`; `reset()`. Long tasks come from `PerformanceObserver` where the engine has it.

## Beside the runtime: preferences, languages, the portable format

Five more modules live in `mir/core/`. They are not part of the frame law above; each has its own doc.

**`core/prefs.js`** — one store for browser preferences. A schema row says how each option is applied (an attribute, a class, a property, or a call); a bad stored value is repaired, never thrown; applying is one coalesced frame job. The GUI window is built on it. A versioned migration moves the project's keys out once; FORGET and DOWNLOAD SETTINGS: [SESSION.md](SESSION.md). API: [API.md](API.md#mircoreprefsjs-browser-preferences); doc: [GUI.md](GUI.md).

**`core/session.js`** — the live project: every registered part kept beside the view, saved 300 ms after a change and at once on leaving, RESUME on a cold start. [SESSION.md](SESSION.md).

**`core/i18n.js`** — `t('English')`: English is the key and the fallback; packs load on demand; `setLanguage(tag)` writes `<html lang dir>` and every kit label changes live through `kit.js`'s `label()` / `ariaLabel()`. Doc: [LANGUAGES.md](LANGUAGES.md).

**`core/zip.js`** — the stored ZIP writer and reader (`StoredZip`, `readStoredZip`, CRC-32 from `png.js`, parts under 32-bit offsets). **`core/assets.js`** — file bytes and their analysis by content hash in IndexedDB, memory fallback (`assets`, `createAssetStore`, `useAssets`, `assetId`); see [AUDIO.md](AUDIO.md).

**`core/envelope.js`**, **`core/png.js`**, **`core/intake.js`** — one portable file `{ mir: 1, kind, kit, app?, name?, made, data }` and one checker that never throws; the same envelope inside a PNG's `iTXt` chunk; one way in (drop, paste, picker). Doc: [FORMAT.md](FORMAT.md).

## What each module replaces in the apps

Paths are BASINS REDUX `app/` (read 2026-10-01; survey B and F2 in the vault).

| Module | Replaces |
|---|---|
| `frame` | `frame-coalescer.js:1-17` (the drag pump, rAF + 32 ms) and its users `rack.js:476,483`, `snap-window.js:62`; the private rAF coalescers in `julia.js:751,883`, `logz.js:633`, `sphere.js:333`, `notebook.js:60`, `lab/mir/shell/notebook.js:102`, `window.js:256`, `startup.js:126`, `crawl.js:737`, `rack-scrollbars.js:8`; `glass.js:278-282` (rAF + timeout per pointermove) |
| `motion` | `rack-motion.js:4` (`RACK_MOTION` literal) → the structural token; `createRackMotion` (`rack-motion.js:5-135`) and `createLayoutMotion` (`:140-204`) → `flip`; `window-resize-motion.js:4-22` (WAAPI on left/top/width/height) → `tweenRect`; the dock commit teleport (`snap-window.js:103-105`, `modwindow.js:505-507`) → `tweenRect`; `transport-dodge.js:25-40` (animationend + 220/400 ms fallback timers, the 330 ms retry at `:16`) → `sequence`; window open/close with no motion (survey B §4 #8) and menu exits (#16) → `presence`; the five separate `prefers-reduced-motion` queries (`rack-motion.js` ×2, `window-resize-motion.js:5`, `rack-bounds.js:21`, `timeline-playhead.js:4`) → `motionPolicy()` |
| `pointer` | the window drag in `snap-window.js:90-126` and `modwindow.js:504-510` (no Escape, no hidden-page cancel); the `.press` law in `mir-plugins/kwin/kwin.js:126-136`; the hand-written pointer variables in `startup.js:122-146` (`--pointer-x/y`, `--tilt-*`) and the thumbnail parallax in `gallery.js:566-584` → `pointerField` |
| `proximity` | both `showGuide` copies (`snap-window.js:47-61`, `modwindow.js:451-465`) and `snapTarget` (`mod-window-snap.js:13-23`, the guide that is not the landing rect); `mod-snap-guide.css:2-12`; the binary rack drop `.rack-drop` (`rack.js:477-483`, `lab.css:370`) → a `slot`; the routing outlines `.mod-drop/.is-over` (`modwindow.js:972-1092`, `lab.css:837-848`) → `ring`s on the knobs |
| `perf` | the unconditional knob/fader text writes (`kit.js:182`, `kit.js:442`) → `setText`/`setVar`; the modulation window's private `paintText` (`modwindow.js:25`) and its private counters (`modwindow.js:2742,2882`) |

**What the core does not replace:** the 250 ms pollers (`transport.js:190`, `controls-window.js:154`, `camera-window.js:155`, `statsbar.js:40`) need event subscriptions, not a scheduler; the frame gives them nowhere to hide but does not delete them. The rack-bounds 350 ms rAF loop (`rack-bounds.js:20-21`) can become `frame.read` + `frame.write` jobs booked from `transitionrun`, but that is the app's change.

## Proofs

- `tests/core-frame.node.mjs`, `tests/core-proximity.node.mjs`, `tests/core-motion.node.mjs`, `tests/core-perf.node.mjs` — the laws on a fake clock.
- `tests/core.browser.mjs` on `tests/fixtures/core.html` — the reliability law for flip, tweenRect and presence (retarget halfway, ten rapid triggers, reduced motion, owns/settled), the drag with real input (coalescing, the flushed final sample, the Escape / blur / pointercancel rollbacks, `.press` under a finger), the guide's strength, capture and exactness, the pointer field, and the idle law.
- Not proven here: the hidden-page cancel (Chromium's headless page cannot be made hidden through CDP, so `visibilitychange` is untested), and anything on WebKit or a real iPad.
