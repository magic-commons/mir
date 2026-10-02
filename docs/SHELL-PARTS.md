# MIR · SHELL PARTS — the small things every app wrote again

Every MIR app re-wrote the same handful of shell parts: a dialog, a toast, a boot message, a loading mark, a flash guard, a share link, a settings panel. The kit had none of them. These seven modules are those parts, each taken from the app that had the best one, so each app can delete its copy.

Try them all: `gallery/parts.html` (`?theme=light`, `?lang=qps`). Plates, dark and light: `docs/plates/parts/`.

```html
<link rel="stylesheet" href="mir/shell/parts.css">   <!-- after the kit's sheets -->
```

| Module | What it is | Taken from |
|---|---|---|
| `mir/shell/dialog.js` | a dialog and a confirm, with no scrim | NEBULA, SOLEIL, AUTOMATA, EARTH (hand-rolled `<dialog>`s), λWAVES' photosensitivity trap |
| `mir/shell/notice.js` | the notice: BASINS' toast by default, NEBULA's corner stack as an option | BASINS' `#toast`; NEBULA's `#notice` and `safe()` |
| `mir/shell/busy.js` | the loading mark: the 3×3 diamond in three seats | λWAVES (`#busyMark`, the card overlay, the logo turn) |
| `mir/shell/boot.js` | the boot card and the boot failure in plain words | NEBULA's `#bootStatus`, EARTH's link-failure voice |
| `mir/shell/flash-guard.js` | the flash limiter, the field judge, the photosensitivity notice | POLAR and EARTH (the route-naming guard), λWAVES (the notice) |
| `mir/shell/share-link.js` | the share-link codec | SOLEIL, AUTOMATA, EARTH, POLAR (the shape), λWAVES (the header law) |
| `mir/shell/settings-rows.js` | a settings panel built from rows of data; the `select` and `number` fields | NEBULA (`control()` and the edit-ownership law) |
| `mir/shell/banner.js` + `banner.css` | the banner: a persistent, dismissable pane of problems, and the reload offer | BASINS (`overlay.js report / fail / warn / offerReload`, `#banner`) |
| `mir/shell/boot.js` `bootVeil`, `watchDevice` | the veil until the first real frame; a lost GPU offers RELOAD | BASINS (`main.js armVeil / dismissVeil`, `gpu.js` device lost) |
| `mir/shell/clipboard.js`, `menubar.js` rows | `copyText` with the textarea fallback; COPY DUMP, Purge Cache/RAM, the "coming" rows, recent projects | BASINS (`shell.js` menus, `debug.js copyDebugInfo`) |
| `mir/core/wakelock.js` | the screen stays on while the clock plays or something records | BASINS (`wakelock.js`, node-tested) |

`createApp()` (`mir/app.js`) wires the last four for you: the banner first (every uncaught error lands in it), the wake lock on the one clock, the menus with the rows, and `app.dump()`.

All of them write their words through the language seam (`label()` / `t()`, docs/LANGUAGES.md): pass English, and a language change rewrites it in place.

---

## 1. Dialog — `mir/shell/dialog.js`

A floating pane at menu height, in CARD STYLE's material, **with nothing behind it**: no scrim, no dimming (INTENT rule 7). The page is held by a focus trap and a press guard instead.

```js
import { openDialog, confirmDialog } from './mir/shell/dialog.js';

const d = openDialog({
  title: 'RENDER SETTINGS',
  body: 'Pick a size.',                 // English (translated), or a Node
  actions: [{ label: 'CANCEL', value: 'cancel' }, { label: 'APPLY', kind: 'primary', run: () => apply() }],
  dismiss: true                         // Escape and a press outside close it with null
});
const choice = await d.result;          // run()'s return, else the action's value, else null when dismissed

if (await confirmDialog('Delete this project? It cannot be undone.', { yes: 'DELETE', no: 'KEEP', danger: true })) remove();
```

| Law | How |
|---|---|
| No scrim | no backdrop element at all; the pane's own shadow is the menu height (`--surface-shadow-menu`) |
| Focus goes in, is trapped, and comes back | the primary action takes the focus; Tab and Shift+Tab cycle inside; on close the focus returns to what had it |
| Dismiss when allowed | `dismiss: true`: Escape or a press outside → `null` (a confirm reads it as `false`). `dismiss: false` is a trap: only an action closes it |
| A press outside never reaches the page | it is swallowed (pointerdown and the click after it), whether or not it dismisses |
| Keys stay inside | a key pressed in the dialog does not reach the app's shortcuts |
| One at a time | a second dialog waits and opens when the first closes |

`kind: 'primary'` draws the action's label in accent A and gives it the focus; `kind: 'danger'` draws it in `--bad`. `kind: 'notice'` and `mark: 'caution'` are what the photosensitivity notice uses.

**An app deletes:** its `<dialog>` element and `dialog { … }` / `dialog::backdrop` rules (NEBULA nebula.css:95-101, SOLEIL sol.css:97-105, AUTOMATA automata.css:44-50, EARTH earth.css:36-44), every `showModal()`, and every `window.confirm` (λWAVES rack.js:3913).

## 2. Notice — `mir/shell/notice.js`

A short message that leaves by itself, in one of two seats.

| Seat | Whose | What it is |
|---|---|---|
| **the toast** (the default) | **BASINS'** `#toast` (`app/overlay.js` `toast()`, `basins.css`) | BASINS' pane, value for value: a `.glass` pill centred 84 px above the bottom, at most 560 px wide (90 vw on a phone), z-index 50; a new message **replaces** the one showing; no ×; 3 s; it takes no press |
| **the corner** (`seat: 'corner'`, or `stack: true`) | **NEBULA's** `#notice` (copied into SOLEIL, AUTOMATA, EARTH) | a stack in the bottom end corner, at most four (the oldest goes first), each with a ×; 5 s, 9 s for an error; the kind drawn as a bar in `--ok` / `--warn` / `--bad` |

```js
import { notice, guarded } from './mir/shell/notice.js';
notice('Position copied.');                                              // the toast, 3 s
notice('Copied 3 windows.', { kind: 'ok', action: { label: 'UNDO', run: undo } });   // the action sits inside the one seat
notice('Saved.', { offset: 120 });                                       // an app whose transport sits higher lifts the toast
notice('The file could not be read.', { seat: 'corner', kind: 'error' }); // NEBULA's stack, for an app that has it
guarded(() => engine.set(id, v));                                        // a throw becomes an error notice (NEBULA's safe())
```

| Law | How |
|---|---|
| Nothing blocks the stage | the toast is `pointer-events: none`: a press at its centre reaches what is beneath it; with an action, only the action takes the pointer. In the corner, only a notice takes a press; the stack's box takes none |
| Polite | the seat is `role=status`, `aria-live=polite` |
| Leaves by itself; hover or focus holds it | the time left pauses while the pointer is on it (on a toast: on its action) or the focus is in it; `ms: 0` stays until closed |
| One at a time (the toast) | a new notice takes the same seat: the old one's text, timer and action go |
| Above the transport | `--toast-bottom` is BASINS' 84 px, chosen with its bar in mind; the kit's bar (docs/TRANSPORT.md) is 46 px tall, 60 px up, so an app that keeps the bar clear passes `offset` (e.g. `offset: 112`) |
| Reduced motion fades | through `core/motion.js presence` |

`kind` (`info` · `ok` · `warn` · `error`) is on the element as `data-kind` in both seats; the toast does not draw it, as BASINS does not. Both seats carry the class `mir-notice`; the toast is `#mir-toast`. `notice()` returns `{ close(), root }`.

**The toast is BASINS' drawing.** It is a `.glass` pane, so CARD STYLE reaches it: under FROST it blurs with the panes' filter (`--surface-filter`, e.g. `blur(8px) saturate(1.3)` at BASINS' settings), REFRACTIVE or TINTED (INTENT O12, 1.5.0-alpha.11); its own fill does not thin. Its own fill, edge, shadow and ink win over the pane's (`#mir-toast`, as BASINS' `#toast`): fill `color-mix(in srgb, var(--glass-tint-color, hsl(212 12% 17%)) 82%, transparent)` (light `hsl(0 0% 100% / .86)`), edge `--glass-border-color`, shadow `--glass-shadow`, ink `--fg` (light `#071114`), radius a pill, padding 8 × 14 px, `500 11px/1.4` with `.04em` tracking. Its z-index is `calc(var(--z-veil) + 10)` = 50, BASINS' number: above the veil (40), under the banner (60), the tip and the menus. The values are in the sheet's FROST values block (`--toast-fill`, `--toast-ink`, `--toast-edge`, `--toast-shadow`, `--toast-radius`, `--toast-size`, `--toast-weight`, `--toast-lh`, `--toast-tracking`).

Measured against BASINS' own toast (its adoption branch, served and fired; dark and light × tinted and refractive, FROST on, BASINS' GLASS BLUR 8 and SATURATION 1.3): fill, shadow, backdrop filter, edge, radius, padding, font, tracking, pointer-events, z-index, position and size compute identically. The one difference is the dark ink: both read `--fg`, which is `#fff` in BASINS' sheets and `rgb(242 245 247)` in the kit's.

**An app deletes:** BASINS' `#toast` and `toast()`; `#notice`, `#noticeText`, `#noticeClose` and their CSS (NEBULA, SOLEIL, AUTOMATA, EARTH: the same lines in each), `showMessage()`, `safe()`.

## 3. Busy mark — `mir/shell/busy.js`

The loading mark is the 3×3 diamond (INTENT rule 6): the nine squares of the wordmark, rotated 45°, carrying the app's palette. **The squares travel round the ring**, so the palette turns through the mark; the centre and the whole mark breathe (.42 → 1 over 1.1 s, λWAVES'). It animates by `translate` and `opacity` only: the compositor runs it, no script runs per frame, nothing animates a colour.

```js
import { busyMark, busyCursor, busyLogo, whileBusy } from './mir/shell/busy.js';

const m = busyMark(card, { seat: 'card', label: 'CALCULATING' });   // a waiting card's overlay (card must be positioned)
m.start(); … m.stop();
busyCursor(true); … busyCursor(false);                               // beside the pointer (+15 px); counted, so calls nest
busyLogo(true); … busyLogo(false);                                   // in place of the wordmark's mark, same size
await whileBusy(loadThings());                                       // pointer + logo until the promise settles
busyMark(host, { size: 34 }).start();                                // inline, anywhere
```

| Law | How |
|---|---|
| Transform and opacity only | eight `@keyframes mir-busy-ring-*` (translate) + a breath (opacity); proved with `getAnimations()` |
| Stopped costs nothing | `stop()` removes the one attribute the animations hang on: no animation, no writes (proved over 0.5 s) |
| Reduced motion | the breath stays, the travel stops; `data-motion="off"` stills it |
| The colours are the app's | read once at `start()` from `#title .mark rect` (as `shell/accent.js paintMarks` painted them), or `colors: [...]` |
| The pointer seat | follows the pointer through `core/frame.js` (one write per frame), listens only while on |

The card overlay is transparent: no dark layer. BASINS' busy loop animated `fill`, which repaints on the main thread every frame, and cloned a 185 KB logo into seven hidden seats; neither is taken.

**An app deletes:** λWAVES `busy-mark.js` and `#busyMark`, its `lw-busy-breathe` / `.mark.busy` CSS; BASINS' hidden `#busyMark` and its seven logo clones. The kit's `device()` loading seat still clones `#title .mark`; moving it onto `busyMark` is noted for the join.

## 4. Boot card — `mir/shell/boot.js`

What a WebGPU app shows while it starts, and, when it cannot, what happened and what to do.

```js
import { bootCard } from './mir/shell/boot.js';
const boot = bootCard({ name: 'NEBULA', steps: ['Asking for a graphics adapter', 'Compiling the shaders', 'Building the orbit bank'] });
try {
  boot.step(); const adapter = await navigator.gpu.requestAdapter(); if (!adapter) throw new Error('requestAdapter() returned null');
  boot.step(); await compile();
  boot.step(); await build();
  boot.done();
} catch (e) { boot.fail(e, { retry: () => location.reload() }); }
```

A pane in the middle of the stage (pane height, no scrim) with the app's name, the turning mark, the current step and "2 of 3". `fail()` turns it into a message with two plain sentences and COPY DETAILS (the error, its stack, the steps done, whether WebGPU is present, the browser) and RETRY when the app gives one.

| `explainBoot(error).code` | When | What it says to do |
|---|---|---|
| `nogpu` | no `navigator.gpu`, "WebGPU is not supported" | open it in a current Chrome, Edge or Safari, or turn WebGPU on |
| `noadapter` | "adapter" in the message | reload (a cold start is sometimes late); then hardware acceleration or the driver |
| `lost` | device lost, context lost | reload; saved work is kept |
| `link` | a module or file did not load | check the connection; check every file was copied |
| `exception` | anything else | reload; COPY DETAILS and send them |

**An app deletes:** NEBULA's `#bootStatus`, `#bootTitle`, `#bootDetail` and the sentence-building in `sync()`; SOLEIL's black `#fail`; AUTOMATA's and EARTH's `#fail` CSS.

## 5. Flash guard — `mir/shell/flash-guard.js`

The flash rule is WCAG 2.2 success criterion 2.3.1, **Three Flashes or Below Threshold**: nothing may flash more than three times in any one second. A flash is a pair of opposing changes in relative luminance of 10 % or more of the maximum, where the darker state is below 0.80, over an area larger than about a quarter of the central field of view. The numbers are the ones POLAR and EARTH ship (POLAR `lab/engine/flash.js`, EARTH law 110), which are that criterion's:

| Threshold | Value | Where |
|---|---|---|
| a swing that counts | 10 % of the range (`delta: 0.1`) | the limiter, per route; the field judge, of luminance |
| the most flashes | 3 a second (`maxHz: 3`): at most 6 changes of direction in any one second | both |
| the darker state | below 0.80 | the field judge |
| the area | 25 % of the field | the field judge |
| the judging window | 1 s (limiter), 1.25 s (field judge, as POLAR) | |
| letting go | after 1 s with no held swing | both |

**The limiter** is the part an app with a modulation system puts on the road from a source to the picture:

```js
import { createFlashGuard, photosensitivityNotice } from './mir/shell/flash-guard.js';
const guard = createFlashGuard({ ranges: { 'LFO SQUARE → exposure': [0, 4] }, onTrip: (x) => showTrip(guard.describe(x)) });
await photosensitivityNotice();                                  // once per browser, before the first route that can flash
exposure = guard(lfoValue, 'LFO SQUARE → exposure');             // every frame; the route is a name the app chooses
```

Each route counts its own swings. A swing that would make that route change direction a seventh time inside a second is **held** (the value stays where it was) and the trip is reported once, naming the route and the rate it tried: `LFO SQUARE → exposure · 10.0 Hz` (POLAR's LAST TRIP). A route that flashes is held to the safe rate, not frozen: three flashes a second still pass. A slow change is never touched. `guard.enabled = false` is SETTINGS › SAFETY's off switch. `guard.state(route)` → `{ hz, held, trips, lastTrip }`.

**The field judge** (`areaEvent`, `flashRate`, `createFlashModel`) is POLAR's and EARTH's arithmetic for an app that measures the presented picture (a 64² luminance readback): samples in frame order → `'trip'` / `'release'`. The GPU readback stays the app's.

**The photosensitivity notice** is shown once per browser (`localStorage` `mir.flashNotice`) and resolves when read. It is λWAVES' trap — no Escape, no press outside; the way past is CONTINUE — drawn as a floating pane with a caution sign in accent A, where λWAVES drew a black full-screen page. Under a test driver (`navigator.webdriver`) it is not shown unless `force: true`. `flashNoticeSeen()`, `forgetFlashNotice()`.

**An app deletes:** POLAR's and EARTH's `engine/flash.js` and the page half of the guard (`flashSuspects`, `suspectText`, LAST TRIP's sentence), AUTOMATA's `notice.js` (the copy of λWAVES' warning) and the `#warnPane` markup and CSS. The veil the apps draw over a tripped stage stays theirs (`#flashveil`); the limiter makes it unnecessary for a modulated route.

## 6. Share link — `mir/shell/share-link.js`

An app's state as a URL fragment and back: readable, versioned, only what differs from the defaults.

```js
import { encodeState, decodeState, inspectLink, measureState, createShareLink } from './mir/shell/share-link.js';
const DEFAULTS = { zoom: 1, mode: 'WAVE', play: true, view: { x: 0, y: 0 } };
encodeState({ zoom: 2.5, mode: 'BAND', play: true, view: { x: 0.31, y: 0 } }, { defaults: DEFAULTS });
// → '#v=1&c=1bd38ck&zoom=2.5&mode=BAND&view.x=0.31'
decodeState(location.hash, { defaults: DEFAULTS });   // → { zoom: 2.5, mode: 'BAND', view: { x: 0.31 } }, or null

const link = createShareLink({ defaults: DEFAULTS });
link.read();            // the state the page opened with, or null
link.write(state);      // the address bar follows, replaceState at most every 400 ms
await link.copy(state); // FILE › COPY A LINK → the url
```

| Law | How |
|---|---|
| The fragment, never the query | a fragment is never sent to a server |
| Only what differs | with `defaults`, a value equal to its default is not written; nested objects become dotted keys; numbers keep `digits` (4) decimals |
| Typed by the defaults | a value takes its default's type (a number must parse finite, a boolean is 1/0, an array or object is JSON); an unknown key is dropped. Without defaults, numbers and JSON are read by their look |
| Damage is null, never a throw | `v` (the app's version) and `c` (a CRC32 of the rest) come first, so a link cut short anywhere, or edited, fails: `decodeState` → `null`. `inspectLink` says why and gives what survived, for an app that would rather open half a link |
| Versioned | a link of another version is `null` unless `migrate(state, version)` lifts it |
| A length report | `measureState(state)` → `{ length, ceiling: 2000, fits, keys }` |

`v` and `c` are reserved top-level keys. `strict: false` drops the check (a hand-edited link then reads).

**Why not `core/envelope.js`:** the envelope is the *file* format (a skin, settings, a page, a project, a spec). Its text form (`pack`) is deflated base64 behind an async `CompressionStream` and carries the frame (kind, kit, date). A share link is an app's live view, written on every change through `replaceState`, so it has to be synchronous, readable, and a diff against the defaults. To put a skin or a spec in a link, `pack` it and carry the text as one value here.

**An app deletes:** `statelink.js` (SOLEIL, AUTOMATA, EARTH, POLAR: four files for one job) once its keys are written as a defaults object; the debounced `replaceState` and the COPY LINK verb.

## 7. Settings rows — `mir/shell/settings-rows.js`

A settings panel built from rows of data, with the kit's own controls, and NEBULA's edit-ownership law.

```js
import { settingsRows } from './mir/shell/settings-rows.js';
const panel = settingsRows(win.body, [
  { id: 'theme', label: 'THEME', control: 'seg', options: [{ id: 'dark', label: 'DARK' }, { id: 'light', label: 'LIGHT' }], get: () => S.theme, set: setTheme },
  { id: 'hints', label: 'HINTS', hint: 'show a hint when the pointer rests on a control', control: 'sw', get: () => S.hints, set: (v) => (S.hints = v) },
  { id: 'quality', label: 'QUALITY', control: 'select', options: [{ id: 'full', label: 'FULL' }, { id: 'auto', label: 'AUTO' }], get, set },
  { id: 'blur', label: 'GLASS BLUR', control: 'fader', min: 0, max: 40, fmt: (x) => x.toFixed(0) + ' px', get, set, when: () => S.card === 'refractive' },
  { id: 'hue', label: 'ACCENT HUE', control: 'knob', min: 0, max: 360, wrap: true, get, set, begin: () => history.begin(), end: () => history.end() },
  { id: 'fps', label: 'FRAME CAP', control: 'number', min: 15, max: 240, step: 1, get, set }
], { onBegin, onEnd, onChange });
panel.sync();   // after the engine changed something: repaints only what moved, never what is held
```

| Row field | Meaning |
|---|---|
| `control` | `sw` · `seg` · `fader` · `knob` (the kit's) · `select` · `number` (built here, the kit's field look) |
| `get` / `set` | read the value; write it (the row calls `set` as the hand moves) |
| `label`, `hint`, `options`, `min`, `max`, `step`, `log`, `wrap`, `fmt` | as the kit control takes them; `hint` becomes the control's title |
| `when()` | the row shows only while it is true; asked again on every `sync()` |
| `begin()` / `end()` | the edit's two ends (an undo group, an engine's `begin/end`) |

| Law | How |
|---|---|
| Begin and end around a drag | a press or an edit key on a fader or knob begins; release, key up or focus leaving ends. A switch, segment or select change is one whole edit. A number field is held from focus to blur |
| `sync()` skips what is held | a control under the hand is never repainted; proved with a real drag |
| A field you type in is a well | `select.sel` (the kit's) and `.mir-num` |

`selectField(o)` and `numberField(o)` are exported on their own (`{ root, input, get, set, setDisabled }`); they belong in `kit.js` and will move there.

**An app deletes:** NEBULA's `control()` and `bindWidget()` (main.js:113-161) and its `.choice select` / `.number-control` CSS; SOLEIL's and EARTH's raw `<select>`s and their `--option-ink` fixes; AUTOMATA's `seg` standing in for a port list; each app's hand-built SETTINGS groups (APPEARANCE, SAFETY, WORKSPACE).

## 8. Banner — `mir/shell/banner.js`

A pane of what went wrong that stays until it is put down. The notice leaves by itself; the banner is for the problem somebody must read and report. BASINS' words: "The overlay is our only debugger: the user is a non-programmer on an iPad with no console."

```html
<link rel="stylesheet" href="mir/shell/banner.css">
```
```js
import { installBanner, fail, warn, report, offerReload, problems } from './mir/shell/banner.js';
installBanner({ host: stage });                 // createApp does this first; also reports every uncaught error and rejection
warn('The tile cache is full', 'oldest tiles are being dropped');
fail('The picture broke', error);               // an Error shows its name, message and stack
offerReload();                                  // the last honest move, once recovery itself has failed
```

| Law | How |
|---|---|
| One line per title | the same title again counts on its first line, `(x3)`: a failure in a frame loop never appends a node a frame |
| At most 30 problems drawn | after that the console and the dump still have everything |
| An error makes it an error pane | `data-kind="error"` for good; warnings alone leave it `warn` |
| Dismissable | the × (26 px of ink, 44 px of finger) hides it; a new problem shows it again |
| In the dump | `--- problems (n) ---` and every problem with its detail, drawn or not |
| BASINS' look | one pane at 40 % of the stage, at most 520 px, BASINS' maroon (`--banner-fill`, `--banner-edge`) with its own near-white ink on both themes (`--banner-ink`): the pane does not follow the theme, so its ink cannot either. No shadow, no scrim |

## 9. Boot veil and the reload offer — `mir/shell/boot.js`

**The veil** covers the stage until the FIRST REAL FRAME. A configured WebGPU canvas is opaque black until something is presented; that flash is what the veil hides, so it comes down after the first present, not on `load` and not when boot returns.

```html
<!-- in <head>, before any sheet, so the first paint is already covered (BASINS' index.html) -->
<style>.mir-veil { position: fixed; inset: 0; z-index: 40; background: #000; pointer-events: none; transition: opacity 160ms ease; }
  .mir-veil.gone { opacity: 0; } .mir-veil[hidden] { display: none; }</style>
<!-- first in the stage -->  <div class="mir-veil" aria-hidden="true"></div>
```
```js
import { bootVeil, watchDevice } from './mir/shell/boot.js';
const veil = bootVeil({ ready: () => renderer.presents > 0 });   // or a Promise; asked once a frame until it holds
// veil.stat → { firstPresentMs, dismissedMs, frames, dismissed, via, timeoutMs }
```

| Law | How |
|---|---|
| After the first present, plus one frame | submitted is not composited: one more frame, then a 160 ms opacity fade, `hidden` 220 ms later |
| The fade never waits on a transition | `startViewTransition()` is a garnish around a no-op where the platform has it (`via: 'fade+view-transition'`); while it runs, about 250 ms, the page takes no input |
| No minimum time, no spinner | after 8 s it comes down anyway and says so (`via: 'timeout'`) |
| Measured | navigation start → first present on `stat`, and a `boot veil` line in every dump |
| A rAF chain that stops dead | it asks `ready()` once a frame and stops when it holds or times out: never a poller |

**The reload offer.** `watchDevice(device, { recover })` watches a GPU device after boot. When it is lost, the app's own `recover(info)` is tried first; if it resolves true, a notice says the picture is being rebuilt. If not, the banner says what happened (the boot card's `lost` words) and offers **Reload the page**. A loss with reason `destroyed` is the app's own teardown and says nothing.

## 10. Copy, the dump and the menu rows — `mir/shell/clipboard.js`, `mir/shell/menubar.js`

`copyText(text) → Promise<boolean>`: the clipboard API, then a hidden read-only textarea and `execCommand('copy')` (an older Safari, a refused permission). It never throws. The share link's `copy()` and the boot card's COPY DETAILS use it.

**The dump lines.** `registerDumpLines(name, fn)` (`mir/core/describe.js`) adds a module's own lines to every dump; `fn()` returns an array of strings, a second registration under a name replaces the first, and a producer that throws is one line naming it, never a lost dump. The banner (`problems`), the veil (`boot veil`) and the wake lock (`wakeLock`) register theirs. `app.dump()` (createApp) is describe's dump with them.

**The rows** (each one menu entry, for `createMenubar({ menus })`):

| Row | What it is |
|---|---|
| `copyDumpRow(dump)` | ABOUT › **COPY DUMP**: the dump to the clipboard, for a tablet with no console; a notice says whether it worked, and a failed copy prints it to the console |
| `purgeRow({ name })` | EDIT › **Purge Cache/RAM**: reloads to give the session's memory back; saved projects and settings are kept |
| `comingRow(name, hint)` | `○  NAME  (coming)`, disabled, its hint naming the window to come; `createApp({ coming: [[NAME, hint]] })` puts them at the foot of WINDOW |
| `recentRows(files, 5, open)` (`mir/folders/files.js`) | FILE › the last five projects as `↺  NAME`, newest first, the folder in the hint; createApp opens one in FOLDERS |

createApp's menus are BASINS': FILE (SAVE, NEW, FOLDERS, the recent projects) · EDIT (PLAY / PAUSE, Purge Cache/RAM) · VIEW (HIDE the interface, FULL SCREEN) · WINDOW (MODULATION, FOLDERS, NOTEBOOK, KEYS, HIDE / SHOW the rack, DOCK / UNDOCK the transport, then the rack's windows, then the windows to come) · ABOUT (ABOUT, SETTINGS…, COPY DUMP) · LANGUAGE · GUI. Each takes the key from the table. `window.__MIR.app` is the live app object for a rig or the console (BASINS' `window.__BASINS`).

## 11. Wake lock — `mir/core/wakelock.js`

The screen stays on while the one clock plays, or while something holds it (a recorder). BASINS' state machine as it stands, every platform dependency injected, so every transition runs under node.

```js
import { installWakeLock } from './mir/core/wakelock.js';
const wake = installWakeLock({ clock });         // createApp does this: app.wakeLock
recordButton.onclick = () => { const release = wake.hold('record'); recorder.start().finally(release); };   // inside the tap: a gesture
```

| Law (BASINS, proved on an iPad) | How |
|---|---|
| A context with no gesture only ARMS | a restored play, a resume: it never asks, so it can never be refused |
| An armed lock asks inside live activation | on pointerup (touch and pen), pointerdown (a mouse), a key that is not Escape; where `navigator.userActivation` says no activation is live, it spends nothing and stays armed |
| A play inside a tap asks at once | the bar's ▶, Space, a RECORD press carry activation, so the request is made in the same stack |
| Three refusals stop the asking | only a refusal with a real gesture in hand counts (Low Power Mode is the known cause); a success resets it |
| The platform lets go on a hidden page | a visible page again re-arms; the next touch asks |
| Idle costs nothing | it moves only on the clock's change, a hold and visibility: no timer, no poller |

`wake.state()` → `{ state, held, armed, denials, skips, attempts, acquires, releases, refusals, holds }`; the dump carries one `wakeLock` line in BASINS' words.

---

## Tokens

Every look value is a token declared on the part's own root in `parts.css` (group `shell-parts` in `mir/tokens.json`): `--dialog-w/-pad/-gap/-gutter/-max-h/-z`, `--caution-size`, `--notice-w/-inset/-gap/-z/-pad/-bar/-x`, `--busy-size/-turn/-breathe/-ease/-low/-ring/-off`, `--boot-w/-pad/-gutter`, `--settings-gap`, `--field-h/-pad`. Written by script: `--busy-c` (a square's colour), `--busy-x/-y` (the pointer seat). The materials are the kit's: `.glass`, `--surface-shadow-menu`, `--relief-well`, `--glass-well`, `--state-focus`.
`banner.css` declares, on `.mir-banner`, `--banner-fill`, `--banner-edge`, `--banner-ink`, `--banner-x-hover`, `--banner-w`, and on `.mir-veil` `--veil-fill`, `--veil-fade`, `--veil-ease` (BASINS' values). `base.css` declares `--skip-fill` on the skip link.

## Proofs

| Test | What it proves |
|---|---|
| `tests/wakelock.node.mjs` | the wake lock's law under node (arm only without a gesture, the granting events, the activation veto, three strikes, the platform's release); held while the clock plays and by `hold()`; never while hidden; the dump lines registry; `recentRows`; BASINS' key table |
| `tests/scene-guard.browser.mjs` (its last checks) | the banner de-duplicates and counts, is an error pane in BASINS' maroon, offers RELOAD, and its × (hit-tested) puts it down; the boot veil comes down after its first frame; the dump carries problems, the veil and the wake lock |
| `tests/share-link.node.mjs` | the round trip; only what differs; typed by the defaults; cut short at every length, edited, or garbage → `null`, never a throw; versions; the length report |
| `tests/flash-guard.node.mjs` | a 10 Hz square wave comes out at ≤ 3 flashes in every second and the trip names its route and its 10 Hz; a slow sine passes untouched; routes are judged apart; the field judge trips and lets go |
| `tests/parts.browser.mjs` | real pointer and keys, hit-tested with `elementFromPoint`: the dialog traps and returns focus, resolves, is dismissed by Escape and by a press outside that never reaches the stage, and paints no scrim; the toast is one seat, centred within 1 px, 84 px up (or an app's offset), with no ×, a second replaces the first, it holds under the pointer and leaves, and the corner seat still stacks; the busy mark animates only translate and opacity and writes nothing when stopped; the boot card fails into a readable message; a switch row changes its value; `sync()` during a fader drag leaves the fader alone; everything reads in the pseudo-language |
