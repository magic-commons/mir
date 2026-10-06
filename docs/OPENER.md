# MIR · the opener (1.5.0-alpha.13)

The opener is the title screen a cold start opens on: the app's starter covers, NEW, and RESUME when there is saved work. The app's engine is imported only after the pick. It is BASINS' title screen (`app/startup.js`, `startup.css`, `starter-covers.js`, 2026-10-02), moved into the kit: the mechanism is the kit's, and the covers, their art, the wordmark and the words of the notice are the app's.

```js
import { createOpener, applyChoice } from './mir/shell/opener.js';
import { createSession } from './mir/core/session.js';

const session = createSession({ key: 'myapp.session' });
const opener = createOpener({
  covers: [
    { id: 'elektra', name: 'ELEKTRA', art: './starter-elektra.jpg', video: './media/elektra.mp4', accent: '#a7b6f0', foot: { text: '10', sup: '243.3' } },
    { id: 'piezo',   name: 'PIEZO',   art: './starter-piezo.jpg',   video: './media/piezo.mp4',   accent: '#ff9ed7' },
    // …
  ],
  mainCount: 3,                                   // the rest are reached by ?starter= only
  session,                                        // RESUME shows when session.hasResume()
  logo: { src: './brand/wordmark.svg', alt: 'MYAPP' },
  notice: { body: 'This app displays rapid strobing effects…', art: './caution.png' },
  warn: 'every',                                  // BASINS: every cold start.  Default 'once': once per browser
  direct: ['rmb', 'classic'],                     // extra switches that resume at once
  onPick: async (id) => { const app = await import('./main.js'); app.start(id); },
});
const id = await opener.start();                  // 'home' (NEW) · 'resume' · a cover's id
// in main.js, once the project's parts exist:
applyChoice(session, id);                         // resume() for 'resume', discard() for anything else
```

The page loads `mir/mir.css` (which carries `shell/opener.css`). Nothing is drawn, fetched or listened to until `start()`.

## What happens, in BASINS' order

1. **The notice.** The photosensitivity notice (`shell/flash-guard.js`): once per browser by default; `warn: 'every'` shows it on every cold start and never writes the seen flag; `warn: false` never. `?warn=1` forces it, `?warn=0` (or a test driver) skips it and resumes. The notice takes the app's `title`, `body`, `accept` and an `art` picture.
2. **The switches.** `?starter=<id>` opens that start at once (`home` is NEW, `resume` is RESUME, or any cover's id, shown or not). Any `direct` switch resumes. An unknown `?starter=` is ignored. (`core/session.js` `openerSwitches`.)
3. **The title screen.** Covers in a 9:16 grid (three across; a row of snapping covers on a phone), NEW and RESUME below the logo.
4. **The pick.** The chosen cover grows while the rest, the logo and the buttons fade (420 ms), the screen fades (380 ms), the videos are emptied, then `onPick(id)` runs and `start()` resolves with the id. Under reduced motion there is no wait.

## The covers

| Field | Meaning |
|---|---|
| `id`, `name` | the cover's id and the name drawn above the active cover. The app's own name: never translated |
| `art` | the poster and the still (an image URL) |
| `video` | an optional looping preview. **Lazy** (`preload: none`: nothing is fetched until it plays) and **paused** while the page is hidden, the cover is off screen, a cover is chosen, or motion is not `full` |
| `accent` | any CSS colour: the active cover's rim, glow and light |
| `foot` | a string, or `{ text, sup }`, drawn under the active cover. BASINS draws the depth there: `10` and its exponent as a superscript. The fractal's own readout is the app's |
| `label` | the accessible name (default "Open {name}") |

## How the screen behaves

- **Hover goes by lanes.** The buttons' slots stay still while a cover grows (transform only), so the slot whose centre is nearest the pointer decides. An enlarged cover can never take its neighbour's hover, and a click picks by the same lanes, so the cover you see grown is the cover you get.
- **The active cover** grows (1.06), tilts toward the pointer, drifts its art and its label the other way, takes the accent as its rim, and shows its name above and its `foot` below; the others dim to .65. The pointer's pose is one coalesced job of the frame core: it reads every slot before it writes, and nothing runs while nothing moves.
- **The light** is the kit's pointer light (`fx/pointer-light.js`): each cover carries `data-light`, the kit writes `--light-x`/`--light-y` on it, and the sheet paints a 105 px radial light in the cover's accent **over** the art under `overlay` (the art is opaque; a pane's light sits under its content). With no pointer (a finger, a key, reduced motion) the active cover is lit from its middle.
- **The keyboard.** The screen has the focus when it opens; Tab goes to the first cover, then the arrows move across the grid (up and down step a row of three), Enter picks. Tab is trapped on the screen, and focus that leaves is brought back.
- **Reduced motion is the policy on `<html data-motion>`**, not only the media query: the videos stay paused, the pointer does no tilt, and the sheet draws no transition, growth or animation.

## Options

`createOpener({ covers, mainCount, session | resume, logo, label, notice, warn, search, webdriver, direct, columns, onPick, host, light, doc })` → `{ start() → Promise<id>, root, destroy() }`.

| Option | Default |
|---|---|
| `mainCount` | all the covers |
| `session` / `resume` | RESUME shows when `session.hasResume()`; or a boolean, or `() => boolean` |
| `logo` | none: `{ src, alt }`, a node, or a string |
| `label` | "starter projects" |
| `warn` | `'once'` · `'every'` · `false` |
| `search` | `location.search` |
| `webdriver` | `navigator.webdriver` |
| `columns` | 3 (the up and down arrows' step) |
| `light` | one is made for the screen's life; pass `false` for none, or your own `createPointerLight()` |

**The opener never touches the session.** Resuming has to wait until the app's parts exist, so the app calls `applyChoice(session, id)` when they do: `resume()` for `'resume'`, `discard()` (NEW) for anything else. A cover's start is a new project.

Pure, and tested in node: `arrowTarget(count, at, key, columns)`, `nearestSlot(slots, x, y)`, `pointerPose(box, x, y)`, `footParts(foot)`, `applyChoice(session, id)`.

## The look

An opaque page, not a pane: it is up before the app's interface exists, over nothing. `shell/opener.css` paints with `--opener-*` tokens whose defaults are BASINS' values (black ground, white type, an 18 px cover, 340 px at most, 1.06 growth, a 105 px light), declared on `.mir-opener`; an app re-points any of them. The cover titles read `--opener-title-font` (default the kit's display face, then Georgia): **the Butler font never enters the kit**, and an app that owns a face sets it here. Sheet: `@layer mir.kit.house`, after `fx/fx.css`.

## What BASINS deletes

`app/startup.js` (242 lines) becomes the options above; `app/startup.css` (176) and `app/starter-covers.js` (8, the data stays the app's) go; the warning's overlay code in `startup.js` is `flash-guard.js`'s notice with `art` and `warn: 'every'`. Its RESUME test of `localStorage` keys is `session.hasResume()` (`also` keys for `mandel.view`).

## Tests

`tests/opener.node.mjs` (the pure part) and `tests/opener.browser.mjs` (a real page, real input, every button hit-tested with `elementFromPoint`: the screen, RESUME only with a session, hover by lanes, Tab and the arrows and Enter, a click on RESUME and NEW, `?starter=`, previews lazy and silent under reduced motion, the notice once, every, skipped and forced).
