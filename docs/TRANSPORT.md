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
BASINS_LAYOUT      = [{ group: 'native-play-row', items: ['play', 'power', 'tempo', 'rewind'] }, 'panel', 'openers', 'seat', 'dock', 'door'];   // name 'basins'
LAMBDAWAVES_LAYOUT = [{ group: 'native-play-row', items: ['play', 'power', 'rewind', 'app:back', 'app:forward', 'app:scrub', 'app:jump',
                       'app:time', 'app:period', 'app:rate', 'tempo'] }, 'panel', 'openers', 'seat', 'dock', 'door'];   // name 'lambdawaves'
```

**Each layout keeps its own drawing.** A layout's `name` is written on the bar as `data-layout`. BASINS' drawing is the default, so an app's own list (BASINS passes one with its depth readout after the pill) is drawn as BASINS' is: the bar is as wide as its row (BASINS measured 359 px), the pill sits where the list puts it (after the power button), and the docked card is BASINS' five-column grid (play, power, to-start; an app node on the second row by the app's own rule; the pill across the third; the round seats 34 px with the `--r-md` corner; to-start's ring the hairline). `data-layout="lambdawaves"` keeps λWAVES' drawing: the 640 px bar (`--xport-w`), the pill last in its row (`order: 8`), the docked row wrapping, 13 px dock and door glyphs and its pill ink.

λWAVES passes its own step buttons, scrub fader, ⟳ jump, readouts and RATE knob as `nodes` (they are the app's instruments). The gallery builds them from kit widgets on its own clock.

## The API, as built

**`createTransport(options)`** — `layout` (default `BASINS_LAYOUT`), `nodes`, `clock`, `mod`, `model` (`mir/modulation/mod.js`), `setBpm`, `persist`, `openers` (array or function), `rack` (or `() => rack`), `keys`, `store` / `key` (the seat), `opener` (default `true`), `onRefused`, `onInterface`, `host`, `root` (an element to adopt, e.g. BASINS' `#transport`), `id`, `bar` (`'float'` | `'work'`), `door` (`'palette'`, the default, BASINS' palette diamond; or `'mark'`, λWAVES' nine squares the accent paints), `onSwitch` (in a work bar the door switches workspace), `macros` (`false` leaves the macro rail out of the tempo panel).

It returns `{ root, layout, parts, el: { play, power, door, pill, field, panel, seat, dock, back, menu, openers }, toggle(), play(), pause(), setBpm(v), bpm, edit(), moved(rect | null), setSeat(seat), seat, dock(on), docked, mountIn(host | null), placement, closed, tempoPanel(show), seatMenu(show), sync(), refresh(), start(), destroy() }`. `destroy()` leaves an adopted root empty, so the app can build another layout on it (the gallery's switch does).

**The parts** each return `{ root, sync(), destroy() }` and take a `signal` (an AbortSignal) that ends their listeners. **`createTempo({ model, setBpm, mod, persist })`** → `{ get, set(v), commit(), min, max, onChange(fn) }` is the one read and write every tempo part shares: it writes through the modulation clock's `setBpm` when there is one (it re-anchors, so the beat is continuous), else `model.setTransport`.

**`transportActions(get)`** is the key table's row for the one play: id `PLAY_ACTION` (`'transport.play'`, exported), Space, `overControls: true` (Space plays with a button, a latch or a knob focused, as in BASINS; a text field still types it).

**`bindTempoField({ button, input, tempo, enabled, drag, paint })`** → `{ open(), close(take), editing, destroy() }` is THE inline BPM editor of every work bar (BASINS `tempo-editor.js`, one module for the modulation and timeline work bars): a click puts the field in the button's seat at its size, holding the tempo; Enter or leaving takes it, Escape does not (focus returns to the button); 8 characters; decimals. With `drag: true` the button also gets BASINS' drag: the whole tempo range in 220 px (a finger 320 px, Shift 1760 px), and a drag is not a click. The pill uses it (below); the modulation window's own BPM field can too.

**`macroRail({ M, api })`** is the tempo panel's MACROS pane on its own (the panel builds it).

**Pure helpers** (`tests/transport.node.mjs`, `tests/transport-placement.node.mjs`): `formatBpm`, `clampBpm`, `digitStep`, `charAt`, `dragBpm`, `keyStep`, `parseBpm`, `seatOf`, `homeOf`, `seatRect`, `menuSide`, `firstRun`, `localSeatStore`, `menuRow`, `openerRows`, `isOpenOf`, `toggleOf`, `rackOpeners`, `transportActions`, `layoutNames`, `placementOf`, `tempoDirection`, `travelBpm`, `reorderTo`; `TRANSPORT`, `SEATS`, `PLACEMENTS`, `DOCK_ID`, `SVG_REWIND`.

## The one bar that moves

Josh: *"when the timeline is open and the toolbar is hidden, let the center transport return. Hide center floating transport when the toolbar comes back."* · *"If timeline is hidden then bring back transport"* · *"If Transport was already selected to be closed, then let it stay closed until called back by the user."*

An app has **one** transport. `tr.mountIn(host)` moves that same node (its listeners, its tempo, its state; nothing is rebuilt) into a work lane in the work-bar form, and `tr.mountIn(null)` puts it back on the stage. The timeline calls it: with the window open and its work lane showing, `mountIn(editor.transportHost)`; with the lane hidden (WORK BARS) or the window closed, `mountIn(null)`.

| Rule | How |
|---|---|
| The rack's dock wins | docked in the rack's TRANSPORT window, `mountIn` keeps the wish and the bar stays docked; undocked, it goes to the lane if one shows, else the stage (`placementOf({ docked, host })`) |
| A bar the user switched off stays off | `body.no-transport-bar` (Settings › TRANSPORT BAR; the GUI row sets it) hides the bar on the stage, in a work lane and in the rack's window; `tr.closed` reads it |
| Moving closes what was open | the tempo panel and the tempo field close, a drag in flight ends (BASINS `placementChanged`) |
| It says where it is | `tr.placement` is `'stage' \| 'work' \| 'rack'`; a `transport-placement` event (`detail.placement`) fires on the bar when it changes |
| On the stage only, it dodges | `moved(rect)` reaches the rack's dodge only while the bar is on the stage; in a lane a hidden rack does not slide it away |

In the work-bar form the bar is BASINS' timeline transport: the seats take the bar's button face, **a click on the BPM pill types the tempo** and **a drag runs the travel law** (`bindTempoField`), with the pill's look unchanged (Josh: *"Don't change the look but make the click behavior change or type in BPM, the same UI module … that the bpm on the modulation window uses"*). On the stage the pill keeps its digit drag, and **its click opens the tempo panel** (*"Keep the behavior on the regular center floating transport that the BPM button opens more timing options and macro routings"*); the kit's double click types through the same binder. In a work bar **the door switches** to the modulation workspace when the app passes `onSwitch` (BASINS: the timeline's MIR button), and the tempo panel, opened from code (`tr.tempoPanel(true)`), floats over the lanes **toward the free side**: below while the room under the bar holds it and 16 px, or while there is at least as much room below as above; else above (`tempoDirection`, BASINS `positionTempo`; `data-tempo-direction` on the bar).

## The tempo panel: MACROS | CLOCK

The panel is BASINS' two panes. **MACROS** is the modulation window's own macro rows as tiles (`modwindow.js buildMacroSlot`, faces hidden): the routing grip (drag to route, tap to arm, double-tap to reset), the numbered depth seat and its arc (drag, keys, double-tap to 100 %), and the reorder grip (drag among the tiles; every arrow one place, Home, End — one law with the modulation window's macro rows since 1.5.0-alpha.19: BASINS' tiles took ↑ ↓ as a row of two, the window's rows one place, so the same key moved a macro two places in one seat and one in the other). The gestures are the window's, never copies (`mod.view.api`: `wireGrip`, `wireDepth`, `paintDepth`, `moveMacro`). It rebuilds only when the list of macros changes and repaints the arcs after a hand works a tile: BASINS re-read the rail every 200 ms while the panel was open, and that timer is gone. With no macros, one line says where to add one. **CLOCK** is TAP, WALL / FREE, the cadence (60 / 120 Hz: `installModulation` exposes `cadence()` / `setCadence()`, so the tile shows), ÷2 ×2 ×4, HOLD ¼ and HOLD 1.

**The hand (1.5.0-alpha.19): opening the panel moves nothing on the row.** On the stage the bar keeps the row's width (read with the panel out of the flow, then pinned while it is open), so the panel is the row's width with MACROS over CLOCK (λWAVES' 640 px bar keeps them side by side; COMPACT's rail is one tile across); on a bottom seat the panel opens **above** the row, on a top seat below it, so the bar grows away from the row; the row keeps the closed bar's line. Before, the bar grew to the panel's width (304 → 742 px) and, centred, carried play 219 px left and 118 px up.

## The door's palette diamond

The door to the modulation window is BASINS' MIR palette diamond (`wordmark.js createMirDiamond`): the nine squares in MIR's nine colours (JL-LOGOS mir-light.svg's rainbow diamond, `MIR_PALETTE`). While a **mouse** hovers it the colours step one square every 240 ms, exact swatches, never interpolated; leaving, a window blur or a hidden page puts them back. Nothing runs unless a mouse is on it, and nothing runs under reduced or no motion. `createTransport({ door: 'mark' })` keeps λWAVES' nine squares, painted by the accent.

## Whose design each piece is

| Piece | Design |
|---|---|
| The bar on the stage: `#transport.mini`, 46 px tall, 60 px up from the bottom, centred, as wide as its row (λWAVES' layout: at least 640 px), 2 px gaps | BASINS' (1.5.0-alpha.15: BASINS basins.css; the 640 px is λWAVES') |
| **Docked** in the rack's TRANSPORT window: clear (no fill in any CARD STYLE: the card is the pane), BASINS' five-column grid, play 34 px high, to-start's ring the hairline | BASINS' (skin.css 477–500, basins.css) |
| The round seats: 34 px, flat, `--ink-key`; hover is a lighter face and `--fg` | BASINS' |
| **Play**: no face and no ring; its glyph is 32 px (`--xport-play-size`, was 20) in a 40 × 40 seat (the glyph + 8); its ink lights in accent A while playing; the glyph swaps ▶ / ❚❚ and scales 1.08 on hover, .94 when pressed; `aria-label` "Play or pause" | BASINS' (ui-fixes 10, Josh 2026-10-01: "way bigger and still have no background") |
| **Play is the only thing that starts or stops time** | ruled by Josh 2026-10-01 |
| **Modulation's power**: the ring-and-stem glyph in a 44 px seat; off, the ring opens and dims; on, it closes and lights in accent B with its halo; a press is `mod.arm(!mod.armed())`, BASINS' `toggleModulation` | BASINS' (and ruled by Josh 2026-10-01: a power button, not a play) |
| **The door** to the modulation window: the MIR mark in a 34 px round seat with a hairline (`.mod-exp.mod-logo`) | BASINS' / λWAVES' |
| **The BPM pill**: sized to its number, at least 72 px (about 92 px at 30.0), after the power button, in `--ink-key` (.86 under white text), no row gap between BPM and Hz; the number in accent B at 18 px (`--xport-num-size`, was 12), BPM and the Hz reading 8 px (was 7), the chevron, a hairline that warms to accent B on hover and when the panel is open. The digit under the pointer is read from the number's own glyph boxes, so the drag and the wheel follow the size | BASINS' (ui-fixes 9, Josh 2026-10-01: "increase the size of the BPM thingy") |
| The pill's drag (the digit under the pointer is the step; 9 px a step, a finger 14 px in ones), its wheel (by the digit under the pointer), its keys (↑ → up, ↓ ← down, Shift a tenth, PageUp/PageDown ten) | BASINS' |
| A click on the pill opens the **tempo panel**: TAP, WALL / FREE, the cadence, ÷2 ×2 ×4 (hold to bend, tap to latch), HOLD ¼, HOLD 1 | BASINS' (λWAVES has the same panel) |
| **TAP's place**: in the tempo panel | BASINS' |
| **The resting pill stands proud** (its own face and the raised relief), not a well | ruled by Josh 2026-10-01 (INTENT: BASINS' rested in a well and read as already pressed) |
| A double click on the pill types the tempo, in a well in the pill's seat (Enter or leaving takes it, Escape does not) | the kit's (BASINS types the tempo only in its timeline form) |
| **The dock chip** (`.dock-btn`, the dock glyph, 12 px as is the door's: `--xport-glyph`; λWAVES' 13): the bar goes into a rack window named TRANSPORT and back | BASINS' / λWAVES' |
| **To-start** (`.transport-home`) is one of the round seats: 34 px with the dock chip's and the door's hairline ring | BASINS' (ui-fixes 11, Josh 2026-10-01) |
| The dock chip, the door and to-start wear no pane shadow | ruled (INTENT: a button never wears a pane's float; BASINS gave them `--glass-shadow`) |
| **In a work bar** (`bar: 'work'`): to-start, send-to-rack and the logo take the bar's button face (`.trig`) in a 34 × 34, radius-8 box; the pill is 34 px tall; the transport is 52 px tall with 3 px padding | BASINS' (ui-fixes 8 and 11, Josh 2026-10-01: "match the button style and size of the right work bar") |
| The dodge: the bottom seat unless a floating window covers it, then the top | BASINS' / λWAVES' (the rack's `dodge`) |
| **λWAVES' bar**: play, power, rewind, ‹ ›, the scrub as a thin line, ⟳, the stacked readouts, the small RATE knob, the pill, then dock and door | λWAVES' (lab/rack.js §25, skin.css §12), with its MOD word replaced by the power button (ruled) |
| **The window latches** (a glyph and a word; lit with the frost face and the label in accent A; a press toggles the window) | ruled by Josh 2026-10-01 (the kit's) |
| **The seats BOTTOM, TOP, COMPACT** and the ⠿ menu (a right click or a long press opens it too); COMPACT: glyphs only, no TAP, no Hz reading | ruled by Josh 2026-10-01 (the kit's) |
| COMPACT's sizes (40 px tall): play's glyph 22 px in a 30 px seat, the tempo 14 px, the pill at least 52 px | the kit's (not ruled) |
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
| CORNERS | does not reach the bar: it keeps its own 16 px corner under any CORNERS, as BASINS' bar does (1.5.0-alpha.7) | `border-radius: var(--xport-radius)` |
| RELIEF | flat: the pill loses its raise | `--relief-raise` |
| SHADOW, the tier | flat tier: no shadow, no blur, no relief | `--surface-shadow`, the tier's tokens |

`tests/transport.browser.mjs` checks every row in both layouts. BASINS' own numbers (the bar's width and height, the seats, the pill) are `--xport-*` tokens declared on `.mir-transport`, so a skin can change them.

## In a work bar

`createTransport({ bar: 'work' })` (`data-bar="work"` on the bar; `BARS` is `['float', 'work']`) is BASINS' timeline-mounted transport: the bar sits in its host's flow (no seat, no dodge), 52 px tall with 3 px of padding, and the seats named in `BAR_SEATS` (to-start, send-to-rack, the logo) carry `.trig`, the kit's button face, so the GUI's look paints them exactly as it paints the work bar's own buttons. `gallery/transport.html` shows one in a mock work bar beside two ordinary work-bar buttons (EDIT, SNAP); the test checks that the three seats match them in size, corner, face and relief. The same form is what `mountIn(host)` puts the stage bar in (below, "The one bar that moves").

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
| BASINS | `app/transport.js` whole (the bar, the pill and its drag, wheel and keys, the tempo panel with its macro rail and clock tiles, `positionTempo`, the dock chip and the door, the 200 ms panel timer and the 250 ms sync interval; the 10ⁿ readout becomes an `app:` node), `transport-placement.js` whole (`mountIn`), `tempo-editor.js` whole (`bindTempoField`), `createMirDiamond` / `installPaletteCycle` / `MIR_PALETTE` in `brand-motion.js` (`wordmark.js`), `transport-controls.js` and `.css` (the play and power faces and their `!important` layer), `transport-dodge.js` (its timers; the rack's dodge replaces it), the `#transport` rules in `skin.css` §12, 354–386 and 441–490, `timeline-window.css` 64–95, `lab.css` 177–179, 299–349, 558, 575–577, and `material.css` 237–238 (`no-transport-bar`) |
| λWAVES (at 1.5) | the transport strip's play / MOD / rewind wiring in `lab/rack.js` §25, the tempo pill and panel in `native-ui.js`, the dock chip and the logo door, the `#transport` rules in `lab.css` / `skin.css`, and `modDodge`; it keeps its scrub, readouts, RATE and ⟳ and passes them as `nodes` |
| A NEBULA-port app | its transport card and its `modDodge` copy |

## Left for later

- **BASINS' 10ⁿ depth readout** (an app node: pass it in `nodes`).
- **λWAVES' spinning door** (λWAVES spins its mark on hover; `door: 'mark'` is static).
- **TOP with a rack** needs the rack's `setHome` (one hunk at the join); until then TOP is offered disabled when a rack is present.

## Proofs

- `tests/transport.node.mjs` (8 groups): the step under a pointer, the clamp and the tenth, BASINS' drag and keys, a typed tempo, the seats, `firstRun`, the openers, the key-table row, the two layouts (one play each, no second play), `createTempo`.
- `tests/transport.browser.mjs` on `gallery/transport.html`, real CDP pointer, wheel and keys, every press hit-tested with `elementFromPoint`: first run; 30.0; BASINS' new sizes (the tempo 18 px, BPM / Hz 8 px, the pill about 90 px, play's 32 px glyph in a 40 px seat with no face, to-start's ring); the work-bar match; play runs the clock; **the power button toggles modulation and never the clock, and play never the power**; the drag by tens, tenths and ones; the wheel; BASINS' keys; a click opens the tempo panel and TAP there sets the tempo; a double click types it; the resting pill is not a well and the field is (under GLASS faces both are clear, as BASINS draws them); latches and closing from the window; the door; the dodge; the dock chip, in and out; **the settings check in both layouts** (card, frost, BLUR, CORNERS, RELIEF, the flat tier); the λWAVES layout from the switch, its one play; in λWAVES' layout and in COMPACT, after the size change, the wheel on the tens digit, a click opening the panel, and play; H; idle; the seat and the layout across a reload; `qps`.
- Plates (`MIR_PLATES=1`): `docs/plates/transport/transport-first-run.png`, `transport-basins-dark.png`, `transport-basins-light.png`, `transport-lambdawaves-dark.png`, `transport-lambdawaves-light.png`.

- `tests/transport-placement.browser.mjs` on `tests/fixtures/transport-placement.html` (the kit's real timeline built without a transport of its own, the stage bar, a kit window in MODULATION's seat), real CDP input, every press hit-tested with `elementFromPoint`: the timeline opens → the same node is in its work lane in the work-bar form, play and the pill are what the pointer finds; a click on the pill types the tempo (Enter takes 123.5, Escape does not), a 22 px drag is the travel law; the tempo panel opens below the bar, 8 px off, its tiles hit; WORK BARS → bottom (stays), → hidden (back on the stage), → top (back in the lane); TRANSPORT BAR off hides it in the lane and on the stage, on again brings it back; the stage pill opens MACROS | CLOCK, a tile's grip and depth seat hit; the lego stack and the switches (docs/WINDOWS.md); the door's diamond steps under a hovering mouse and rests on leave.

**Not proven:** the timeline's own call to `mountIn` (the kit's timeline still builds its own work-bar transport until the join applies the hunk; the fixture makes the same calls from the page), the macro tiles' route drag onto a control from the panel (it is the window's own `wireGrip`, proven there), the way back on a real touch screen (the CSS rule is on `any-pointer: coarse`; the headless run is a fine pointer), the long press, WebKit and a real iPad, a screen reader.
