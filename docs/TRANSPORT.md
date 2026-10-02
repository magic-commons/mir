# MIR · TRANSPORT — the transport's parts, and the bar an app lays out from them

`mir/shell/transport.js` and `mir/shell/transport.css`. The transport is the small floating bar every MIR app has: play, modulation's power, the BPM pill, the door to the modulation window, and (in 1.5) one latch per main window. It is the first thing a person sees and the thing they open everything else from.

Josh's rulings, 2026-10-01:
- *"Always basic Transport Bar as the main opener."* · *"Let 30BPM be the default."*
- *"Prefer BASINS. However keep the Transports as they are per each app. If a feature is similar or the same on Basins/Lambdawaves, then use their design. Lambdawaves should have its same Transport layout but upgraded to be customizable by 1.5's crazy CSS settings."*
- *"We're making modulation a power button and no longer a play button … Timeline will have the true play while Modulation will now have a power button like Basins."*
- The kit's own choices (the COMPACT seat with no TAP and no Hz reading, the ⠿ seat menu, the way back under H, a latch press toggling its window) were approved as built.

So **the kit gives parts and the look; the layout is the app's.** Every part is an exported builder an app can place in its own arrangement; `createTransport({ layout })` assembles a bar from an ordered list. With no layout you get BASINS' basic bar. λWAVES' transport is the same parts in λWAVES' order. Try both at `gallery/transport.html` (the switch at the top left; `?fresh` opens a first run).

Load `mir/shell/transport.css` after the kit's sheets, `mir/core/core.css` and `mir/shell/rack.css`. It sits in `@layer mir.kit.house`.

## Using it

```js
import { createTransport, firstRun, rackOpeners, transportActions, BASINS_LAYOUT, LAMBDAWAVES_LAYOUT } from './mir/shell/transport.js';

const first = firstRun('myapp.transport', 'myapp.rack');          // a first run: leave every window closed
let tr = null, rack = null;
const keys = createKeys({ actions: [...transportActions(() => tr), /* … */] });   // Space: the one play

tr = createTransport({
  layout: BASINS_LAYOUT,                    // or the app's own list (below)
  clock: timeline.clock,                    // THE ONE PLAY's clock: the timeline's, or the app's main clock
  mod,                                      // installModulation's result: the power button, the door, the panel's clock tiles
  keys, rack: () => rack, key: 'myapp.transport',
  openers: () => [...rackOpeners(rack)(), { id: 'folders', label: 'FOLDERS', glyph: 'folder', open: () => folders.open(), close: () => folders.close(), isOpen: () => folders.isOpen() }],
});
rack = createRack({ key: 'myapp.rack', transport: tr.root });
createFolders({ …, onMoved: (r) => tr.moved(r) });               // every floating window reports where it is
```

**A layout** is an array. Each entry is a part's name, `app:<name>` (one of the app's own nodes, passed in `nodes`), a DOM node, or a group `{ group: 'class names', items: [...] }`.

| Part name | The part | Builder |
|---|---|---|
| `play` | the one true play | `playButton({ clock, onRefused })` |
| `power` | modulation's power | `modPower({ mod })` |
| `door` | the door to the modulation window | `modDoor({ mod })` |
| `tempo` | the BPM pill (and the field you type it in) | `tempoPill({ tempo, panel })` |
| `panel` | the tempo panel the pill opens | `tempoPanel({ tempo, mod })` |
| `tap` | TAP as a seat of its own | `tapButton({ tempo })` |
| `rewind` | seek to the beginning (needs `clock.seek`) | `barButton({ cls: 'transport-home', svg: SVG_REWIND, run })` |
| `openers` | the window latches | `latch(opener)` each |
| `seat` | ⠿, the seat menu | (createTransport) |
| `dock` | the dock chip | (createTransport) |
| — | the way back under H (always the bar's last child) | `wayBack({ run })` |

```js
BASINS_LAYOUT      = [{ group: 'native-play-row', items: ['play', 'power', 'rewind', 'tempo'] }, 'panel', 'openers', 'seat', 'dock', 'door'];
LAMBDAWAVES_LAYOUT = [{ group: 'native-play-row', items: ['play', 'power', 'rewind', 'app:back', 'app:forward', 'app:scrub', 'app:jump',
                       'app:time', 'app:period', 'app:rate', 'tempo'] }, 'panel', 'openers', 'seat', 'dock', 'door'];
```

λWAVES passes its own step buttons, scrub fader, ⟳ jump, readouts and RATE knob as `nodes` (they are the app's instruments). The gallery builds them from kit widgets on its own clock.

## The API, as built

**`createTransport(options)`** — `layout` (default `BASINS_LAYOUT`), `nodes`, `clock`, `mod`, `model` (`mir/modulation/mod.js`), `setBpm`, `persist`, `openers` (array or function), `rack` (or `() => rack`), `keys`, `store` / `key` (the seat), `opener` (default `true`), `onRefused`, `onInterface`, `host`, `root` (an element to adopt, e.g. BASINS' `#transport`), `id`.

It returns `{ root, layout, parts, el: { play, power, door, pill, field, panel, seat, dock, back, menu, openers }, toggle(), play(), pause(), setBpm(v), bpm, edit(), moved(rect | null), setSeat(seat), seat, dock(on), docked, seatMenu(show), sync(), refresh(), start(), destroy() }`. `destroy()` leaves an adopted root empty, so the app can build another layout on it (the gallery's switch does).

**The parts** each return `{ root, sync(), destroy() }` and take a `signal` (an AbortSignal) that ends their listeners. **`createTempo({ model, setBpm, mod, persist })`** → `{ get, set(v), commit(), min, max, onChange(fn) }` is the one read and write every tempo part shares: it writes through the modulation clock's `setBpm` when there is one (it re-anchors, so the beat is continuous), else `model.setTransport`.

**Pure helpers** (`tests/transport.node.mjs`): `formatBpm`, `clampBpm`, `digitStep`, `charAt`, `dragBpm`, `keyStep`, `parseBpm`, `seatOf`, `homeOf`, `seatRect`, `menuSide`, `firstRun`, `localSeatStore`, `menuRow`, `openerRows`, `isOpenOf`, `toggleOf`, `rackOpeners`, `transportActions`, `layoutNames`; `TRANSPORT`, `SEATS`, `DOCK_ID`, `SVG_REWIND`.

## Whose design each piece is

| Piece | Design |
|---|---|
| The bar on the stage: `#transport.mini`, 46 px tall, 60 px up from the bottom, centred, 640 px wide (wider when its parts need it), 2 px gaps | BASINS' |
| The round seats: 34 px, flat, `--ink-key`; hover is a lighter face and `--fg` | BASINS' |
| **Play**: no face; its ink lights in accent A while playing; the glyph swaps ▶ / ❚❚ and scales 1.08 on hover, .94 when pressed; `aria-label` "Play or pause" | BASINS' |
| **Play is the only thing that starts or stops time** | ruled by Josh 2026-10-01 |
| **Modulation's power**: the ring-and-stem glyph in a 44 px seat; off, the ring opens and dims; on, it closes and lights in accent B with its halo; a press is `mod.arm(!mod.armed())`, BASINS' `toggleModulation` | BASINS' (and ruled by Josh 2026-10-01: a power button, not a play) |
| **The door** to the modulation window: the MIR mark in a 34 px round seat with a hairline (`.mod-exp.mod-logo`) | BASINS' / λWAVES' |
| **The BPM pill**: 72 px, the number in accent B (12 px), BPM and the Hz reading (7 px), the chevron, a hairline that warms to accent B on hover and when the panel is open | BASINS' |
| The pill's drag (the digit under the pointer is the step; 9 px a step, a finger 14 px in ones), its wheel (by the digit under the pointer), its keys (↑ → up, ↓ ← down, Shift a tenth, PageUp/PageDown ten) | BASINS' |
| A click on the pill opens the **tempo panel**: TAP, WALL / FREE, the cadence, ÷2 ×2 ×4 (hold to bend, tap to latch), HOLD ¼, HOLD 1 | BASINS' (λWAVES has the same panel) |
| **TAP's place**: in the tempo panel | BASINS' |
| **The resting pill stands proud** (its own face and the raised relief), not a well | ruled by Josh 2026-10-01 (INTENT: BASINS' rested in a well and read as already pressed) |
| A double click on the pill types the tempo, in a well in the pill's seat (Enter or leaving takes it, Escape does not) | the kit's (BASINS types the tempo only in its timeline form) |
| **The dock chip** (`.dock-btn`, the north glyph): the bar goes into a rack window named TRANSPORT and back | BASINS' / λWAVES' |
| The dock chip and the door wear no pane shadow | ruled (INTENT: a button never wears a pane's float; BASINS gave them `--glass-shadow`) |
| The dodge: the bottom seat unless a floating window covers it, then the top | BASINS' / λWAVES' (the rack's `dodge`) |
| **λWAVES' bar**: play, power, rewind, ‹ ›, the scrub as a thin line, ⟳, the stacked readouts, the small RATE knob, the pill, then dock and door | λWAVES' (lab/rack.js §25, skin.css §12), with its MOD word replaced by the power button (ruled) |
| **The window latches** (a glyph and a word; lit with the frost face and the label in accent A; a press toggles the window) | ruled by Josh 2026-10-01 (the kit's) |
| **The seats BOTTOM, TOP, COMPACT** and the ⠿ menu (a right click or a long press opens it too); COMPACT: glyphs only, no TAP, no Hz reading | ruled by Josh 2026-10-01 (the kit's) |
| **The way back** under H on a touch screen | ruled by Josh 2026-10-01 (the kit's) |
| The focus ring on the seats (`--state-focus`), and on the power button BASINS' 1 px accent-B outline | the kit's / BASINS' |

## The two clocks become one

λWAVES has two clocks today: the transport's play and the modulation window's MOD ▶ (with LINKED / SEPARATE). In 1.5 there is **one play**, the transport's, bound to the app's timeline (or main) clock, and **modulation has a power button**, BASINS' (Josh, 2026-10-01). The gallery's λWAVES layout shows it: one ▶, and the power ring where λWAVES had MOD. When λWAVES moves to 1.5, its MOD button becomes `power` and its MOD ▶ tile goes. (The modulation window's own play button is changed in `mir/modulation/`, not here.)

## Customizable by 1.5's settings

Every look value of the bar is the kit's, so the GUI window restyles it with no transport code:

| Setting (GUI window) | What it changes on the bar | How |
|---|---|---|
| CARD STYLE | TINTED: the tint, never a blur; REFRACTIVE: the veil and the blur | the bar is `.glass` |
| FROST | off: no blur anywhere | skin.css |
| BLUR | the blur's radius | `--glass-blur` |
| CORNERS | the bar's corner, the same as every pane's (BASINS' 16 px, `--xport-radius`, only where the 1.5 surface tokens are absent) | `border-radius: var(--surface-radius, var(--xport-radius))` |
| RELIEF | flat: the pill loses its raise | `--relief-raise` |
| SHADOW, the tier | flat tier: no shadow, no blur, no relief | `--surface-shadow`, the tier's tokens |

`tests/transport.browser.mjs` checks every row in both layouts. BASINS' own numbers (the bar's width and height, the seats, the pill) are `--xport-*` tokens declared on `.mir-transport`, so a skin can change them.

## The opener law

1. An app calls `createTransport({ opener: true })` first and asks `firstRun(store, …)` before it opens anything (true when none of the stores holds anything; a store is `{ get() }` or a localStorage key).
2. On a first run the app leaves every window closed: the bar is the only thing on screen. With the rack, register windows `open: !first`.
3. The app passes its main windows as openers (`rackOpeners(rack)` reads the rack's own registrations, the docked bar's window aside), so a window is described once.
4. Under H, on a touch screen, the main opener keeps one button, the way back.

## The laws

| # | Law | How |
|---|---|---|
| 1 | One true play | only `playButton` starts or stops time; the power button is the arm; the door and the latches open windows |
| 2 | One dodge: the rack's | `moved(rect)` → `rack.dodge`; the rack writes `data-seat`; docked, the bar does not dodge |
| 3 | Latches say the truth; nothing polls | one paint in the next frame after a click or key on the page, `devopen`/`devclose`, the arm, the clock, the tempo. BASINS' 250 ms interval is gone |
| 4 | Idle costs nothing | tested: zero frames, zero rAF |
| 5 | Every look value is the kit's | the table above |
| 6 | Keyboard and touch | one tab stop for the bar (← → Home End walk it; on the pill ← → step the tempo, as in BASINS); 32 px seats on a coarse pointer; a long press opens the seat menu |
| 7 | No English in a lookup | words through `label()` / `ariaLabel()`; parts found by class and `data-opener`, `data-seat-choice` |

## What an adopting app deletes

| App | Deletes |
|---|---|
| BASINS | `app/transport.js` (the bar, the pill and its drag, wheel and keys, the tempo panel's clock tiles, the dock chip and the door, the 250 ms sync interval; the macro rail stays), `transport-controls.js` and `.css` (the play and power faces and their `!important` layer), `transport-dodge.js` (its timers; the rack's dodge replaces it), the stage and rack seats of `transport-placement.js`, the `#transport` rules in `skin.css` §12 and 441–490 and in `lab.css` 177–179, 299–349, 558 |
| λWAVES (at 1.5) | the transport strip's play / MOD / rewind wiring in `lab/rack.js` §25, the tempo pill and panel in `native-ui.js`, the dock chip and the logo door, the `#transport` rules in `lab.css` / `skin.css`, and `modDodge`; it keeps its scrub, readouts, RATE and ⟳ and passes them as `nodes` |
| A NEBULA-port app | its transport card and its `modDodge` copy |

## Left for later

- **The timeline-mounted form** (BASINS `timeline-mounted`).
- **The macro rail** in the tempo panel: it needs the modulation window's `buildMacroSlot` and its `wireGrip` / `wireDepth` / `moveMacro`, which `mir/modulation/window.js` keeps inside the window.
- **The cadence tile** shows only when the seam has `cadence()` / `setCadence()` (installModulation does not expose them yet).
- **BASINS' 10ⁿ depth readout** (an app node: pass it in `nodes`).
- **The door's hover motion** (BASINS cycles the mark's colours, λWAVES spins it): the kit's mark is static here.
- **TOP with a rack** needs the rack's `setHome` (one hunk at the join); until then TOP is offered disabled when a rack is present.

## Proofs

- `tests/transport.node.mjs` (8 groups): the step under a pointer, the clamp and the tenth, BASINS' drag and keys, a typed tempo, the seats, `firstRun`, the openers, the key-table row, the two layouts (one play each, no second play), `createTempo`.
- `tests/transport.browser.mjs` on `gallery/transport.html`, real CDP pointer, wheel and keys, every press hit-tested with `elementFromPoint`: first run; 30.0 and 72 px; play runs the clock; **the power button toggles modulation and never the clock, and play never the power**; the drag by tens, tenths and ones; the wheel; BASINS' keys; a click opens the tempo panel and TAP there sets the tempo; a double click types it; the resting pill is not a well and the field is; latches and closing from the window; the door; the dodge; the dock chip, in and out; **the settings check in both layouts** (card, frost, BLUR, CORNERS, RELIEF, the flat tier); the λWAVES layout from the switch, its one play; H; idle; the seat and the layout across a reload; `qps`.
- Plates (`MIR_PLATES=1`): `docs/plates/transport/transport-first-run.png`, `transport-basins-dark.png`, `transport-basins-light.png`, `transport-lambdawaves-dark.png`, `transport-lambdawaves-light.png`.

**Not proven:** the way back on a real touch screen (the CSS rule is on `any-pointer: coarse`; the headless run is a fine pointer), the long press, WebKit and a real iPad, a screen reader.
