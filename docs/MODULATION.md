# MIR · MODULATION — the plugin, importable

The modulation plugin is the kit's LFO / envelope / audio-follower rack with macros that route onto an app's controls: a model (`mod.js`), a parameter registry (`registry.js`), a clock that owns modulation time (`host.js`), the window's DOM (`modwindow/modwindow.js` + its two sheets), and, since 1.5.1, **the window's controller** (`window.js`) and **the seam to an app's parameters** (`bind.js`). Until 1.5 every app carried its own ~3,000-line copy of the controller (λWAVES `lab/modwindow.js`, byte-identical in NEBULA and SOLEIL; a 3,416-line fork in BASINS). An app now imports it. Play with it at `gallery/modulation.html`.

## Add it to an app

**The short form** (1.5.0-alpha.5): `createApp()` (`mir/app.js`) installs modulation, puts its power and its door on the transport bar, and makes every `app.param()` a target.

```js
import { createApp } from './mir/app.js';
const app = await createApp({ name: 'MYAPP', stage, state: S, present: redraw });
const size = app.param('size', 'SIZE', 0, 1);          // a knob, a target ('app.size') and a saved value, in one line
app.rack.register({ id: 'more', title: 'MORE', build(body) {
  body.append(app.param('bright', 'BRIGHT', 0, 1, { make: fader }).root);   // made in a lazy window: a target when it is built
} });
if (app.first) app.mod.route('lfo', 'app.size', 0.35);  // a first route in one call
```

**The long form**, the same seam by hand:

```html
<link rel="stylesheet" href="mir/mir.css">   <!-- or, one by one: base.css, skin.css, …, modhost.css, modwindow.css -->
```

```js
import { makeParam } from './mir/app.js';
import { installModulation } from './mir/modulation/bind.js';
import { observeSpan } from './mir/window/dock.js';

const mod = installModulation({
  mount: rack.el.floats,                                          // the kit's float layer: the window takes the pointer there
  present: redraw,                                                // the app draws a frame
  storageKey: 'myapp.modulation', presetKey: 'myapp.modpresets',  // name your own stores
  dock: { span: observeSpan({ left: rackL, right: rackR }) },     // ONE span per page, shared with every window
  audio: createAudioCapture,                                      // optional: the app's microphone edge (lab/audio.js)
});
const size = makeParam({ state: S, key: 'size', label: 'SIZE', min: 0, max: 1, mod, onChange: redraw });   // → mod.add(…)
// or entirely by hand: a widget whose onInput keeps the hand law, and mod.add({ id, label, min, max, map, get, set, widget })
const bright = fader({ label: 'BRIGHT', min: 0, max: 1, value: S.bright,
  onInput: (v) => { if (!mod.hand('app.bright', v)) { S.bright = v; redraw(); } } });            // the hand law
const off = mod.add({ id: 'app.bright', label: 'BRIGHT', min: 0, max: 1, get: () => S.bright, set: (v) => { S.bright = v; redraw(); }, widget: bright });
const first = mod.route('lfo', 'app.size', 0.35);                // → { route, macro, source, remove() }
tr = createTransport({ clock: { play: () => mod.play(true), pause: () => mod.play(false), isPlaying: mod.playing, onChange: mod.onPlay }, mod, … });
```

`params` can still be passed to `installModulation` up front, as before; `add` is for the ones that come later. A project saves `size.value()` (the base), never `S.size` while a route drives it.

That is the whole seam. `installModulation` registers every parameter as a target, writes `data-param` on each widget (the routing's one hook) and its `setBase` road, runs the clock through the one frame while it plays, paints routed widgets from the registry each tick, persists the rack and the window, and mounts the window.

### `installModulation(options)` — `mir/modulation/bind.js`

| Option | What it is | Default |
|---|---|---|
| `mount` | the element the window and its rail are appended to (the rack's `#floats`); `null`: the seam with no window, for node | required |
| `params` | `[{ id, label, unit, group, hint, min, max, step, map, def, get(), set(v), widget }]`. `id` is `root.name`; `map` is `linear`, `log`, `wrap`, `integer` or `bipolar`; `widget` is a kit `knob()` or `fader()` (anything with `.root`, and `setBase`/`show`/`set` if it has them) | `[]` |
| `roots` | the registry's id roots (a target added later must sit under one) | the first segment of every id, and `app` |
| `available()` | may modulation write now (BASINS: `flowActive`; NEBULA: the instrument is ready) | always |
| `present()` | ask the app for a frame | none |
| `onWindow(open)` | the window opened or closed | none |
| `moved(rect)` | where the window now is (`null` when it closes) — hand it to `rack.dodge()` so the transport gives way | none |
| `store` | `{ read() → record, write(patch) }`, the app's settings | `localStore(storageKey)` |
| `storageKey` | the localStorage key of the default store | `'mir.modulation'` |
| `presetKey` | the preset store's key | `mod.js PRESET_LS` (`'lambdawaves.q0.modpresets'`) |
| `audio` | the capture factory, `createAudioCapture({ onState })` | none: ADD AUDIO is offered disabled |
| `dock` | `{ span, guide }` for the window (see window.js below); `false`: it never docks | the viewport is the span |
| `copy` | words of the window (`modwindow.js COPY`), e.g. `{ factory: 'MANDELBROT' }` | `COPY` |
| `targets` | the selector of routable controls | `'.k[data-param], .fd[data-param]'` |
| `routeGlow()` | the Display switch for the routing glow (the snap still works when off) | on |
| `enabled` | the MOD arm at first boot | `true` |
| `showWidgets` | paint routed widgets from the registry each tick | `true` |

It returns `{ host, view, registry, M, open(), close(), toggle(), isOpen, power(), setPower(on), togglePower(), onPower(fn) → off, play(on), togglePlay(), playing(), onPlay(fn) → off, add(param) → remove(), remove(id), route(source, id, depth) → { route, macro, source, remove() } | null, params(), isModulated(id), baseOf(id), currentOf(id), hand(id, v), running(), bpm(), syncBases(), paintWidgets(), persist(), dispose() }`. The stored record is `{ modulationState, modwin, modArm, modCadence, audioDevice }` — the same shape SOLEIL and NEBULA already write, so their settings carry over. `arm(on)`, `armed()` and `onArm(fn)` are the 1.4 names of `setPower`, `power` and `onPower`, kept as aliases.

**`add(param)`** registers one more target after the install (a param as in `params`); an id already added is replaced, keeping its base and routes; a route saved or made against it while it was missing was dormant and wakes now. It returns `remove()`. **`remove(id)`** takes the target away **and every route onto it**, leaving its number on its base. **`route(source, id, depth = 0.5)`**: `source` is a source id, a source, or a kind (`'lfo'`, `'env'`, `'audio'`: the first of that kind, made if none); a macro already carrying that source takes the route, else a free macro; the route swings `depth` of the range up from the base (negative: down). Its `remove()` takes the route away, frees the macro if it bound it, and removes the source if it made it. Play stays the app's, and **it always plays** (alpha.6): `play(true)` holds a demand of its own on the clock (`host.clock.demand('app.play')`), so no route, no source and the power off never refuse it; `host.js`'s "nothing-to-run" refusal stays the law of a bare host. `installModulation` never plays by itself, and power is on unless the stored record or `enabled: false` says otherwise.

### `createModulation(host, port)` — `mir/modulation/window.js`

For an app that builds its own seam (λWAVES' rack does). `port` is `{ M, registry, clock, apply, knobOf, persist, cadence, setCadence, armed, arm, audio, rateControl, moved, opened, closed, presetKey, copy, dock, targets, routeGlow }` — the λWAVES port, plus the last five, all optional. It returns `{ root, rail, chipRail, api, open, close, toggle, isOpen, paint, sync, rebuild, presentation, restore, setAccent, say, resumeSentence, wake, dispose }`; `api` is the gates' read-back (λWAVES' `api` unchanged, plus `placement()` and `presetKey()`).

`createModWindow(host)` in `modwindow/modwindow.js` is unchanged: it builds the DOM and wires nothing.

## The laws

| Law | What it means |
|---|---|
| **One window set** | The chip rail is `window/rail.js` `createRail` (Shift-drag, long press and keyboard relocation come with it); placement is `window/window.js` `windowLayout` (the house clamp, the dock); the drag is `core/pointer.js` `drag` (Escape, a lost capture, a blur or a hidden page rolls it back); open and close are `motion.presence`; the dock landing and every relocation travel by `motion.tweenRect`. |
| **The guide is the landing** | The dotted guide is `dock.js` `dockGeometry` with the chip lane on the side the chips sit — the same function the landing uses. BASINS' guide reserved a left lane always and landed elsewhere. |
| **The look does not move** | The rail keeps the plugin's own material (`.kwin-chiprail[data-mir-rail="modulation"] .crail-chip`), and the pane stays `#modwin` (it lays out `overflow: visible` with work bars and pickers outside its box, which a `.mir-win` pane would cut). Proved by `tools/stylehash.mjs` (below). |
| **A fader is a target like a knob** | `.fd[data-param]` routes. A knob wears the ring; a fader wears a range bar (`.m2fdrange`, the selected route's span along its track). Both get the range dial and the × while the hand is on them. `bind.js` shows the modulated value on the widget (`fader().show`), so the fader moves. |
| **Routing shows where it lands** | While a macro's ✥ is dragged, each routable control glows by its distance (`core/proximity.js`, reach 56, capture 18); release inside capture routes there even when the finger is beside a small knob. The guides are drawn in accent B: a route is a relationship. |
| **The play dot is true** | The device curve's dot and line follow the model on every paint; a box that gains its size after a paint skipped it is redrawn (one shared ResizeObserver); a paused change (a seek, a preset, a route) asks for one paint. No loop. |
| **The hand owns the base** | On a routed control the hand writes the registry's base (`mod.hand(id, v)` → true); the app's own number is the base wherever nothing drives it (`syncBases`). |
| **Storage is the app's to name** | `storageKey` and `presetKey`. Two apps on one origin never share presets. |
| **Strings are not code** | Every word goes through `t()` / `label()` / `ariaLabel()`; the sheets' captions are `content: attr(data-cap)`; no `toUpperCase()`; nothing is found by its label. |
| **One clock** | Time is the app's. `mod.play(on)` starts and stops the clock, and only the app's play button calls it (the timeline's; the transport bar's play part until there is one). The window's first work-bar seat is **modulation's power**, drawn and behaving as BASINS' is: it never plays or pauses. Power never plays; play never powers. |
| **Idle costs nothing** | The clock ticks through `core/frame.js` only while it plays or the microphone is live. |

Kept as they were: every law in `modwindow/ACCEPTANCE.md` and `modwindow/host-contract.md`, the FL curve gestures (`curve-gesture.js`), the macro reorder and rename, the preset folders, the dead-send inspector, the matrix, and Sol's automation, exact resume and runtime capture in `host.js` and `mod.js`.

## What each app deletes

| App | Deletes | Keeps |
|---|---|---|
| **λWAVES** (frozen on 1.4.3; when it moves to 1.5) | `lab/modwindow.js` (3,084 lines); `lab.css:405-419` badge rules (`:root:root:root:root .k.has-ring …`, `.k-route-x`), the arming and pop-over rules (`lab.css:813-841`) | its rack wiring (`rack.js` builds the port: `createModulation(floats, port)`), `audio.js`, its parameter catalogue (`host.js labParameters`) |
| **SOLEIL** | `lab/modwindow.js`, `lab/modulation.js` (149 lines — `installModulation` is that file), `MODULATION-MANIFEST.json`, the invisible `.k.lane-drop` overlay that made its lane fader routable (`sol.css:56-65`, `main.js:907`), the badge ladders (`sol.css:191-201`), `paintParams` (`main.js:723-734`) | its catalogue rows (they already are `params`), `audio.js`, `prefs.js` as the `store` |
| **NEBULA-REDUX** | `lab/modwindow.js`, all of `lab/modulation.js` but its descriptor mapping (`routeId`, `mapOf`, ~25 lines that build `params`), the badge ladders (`nebula.css:130-142`) | `retireLegacy()`, `audio.js`, `prefs.js` as the `store` |
| **BASINS** | the controller's window half: `mod-window-snap.js`, `mod-snap-guide.css`, the second `observeRackBounds`, the MOD use of `window-resize-motion.js`, `modwindow.js:180-224, 443-535` in survey B's numbering (seat, drag, guide, Shift) | its fork's BASINS-only features (the timeline handoff, the pattern model, the readout layer, the transport controller hooks) until they are ported or become plugins; then `app/modwindow.js` goes too |

Any other app that copied λWAVES' controller deletes it the same way.

## One clock: what power and play each do

As BASINS has it (`modulation.js setArm` → `host.clock.setModulationEnabled`; `transport-controller.js play` → `clock.play / pause`):

| | the app plays | the app is paused |
|---|---|---|
| **power on** | the clock advances; every source moves; every routed target follows its routes | the clock stands still; sources hold their phase; with the pause law BASE (the default) every target sits on its base (HOLD keeps the last modulated value); a seek moves the model and the window repaints once |
| **power off** | the clock still advances and every source still moves (the curves' dots keep going), but every route is bypassed: every target is back on its base and the hand owns it; power on picks the routes up in time, with no jump in phase | as paused, with every target on its base |

- **The work bar beside the power** — BPM (the field and its drag), TAP, WALL / FREE, 60 / 120 HZ, HOLD 1/4 and HOLD 1 — acts on the clock exactly as before, whether the power is on or off. A HOLD latched while power is off is still latched when it comes on.
- **A restored project / a reload** keeps the power (`modArm` in the stored record) and never plays: time starts only when the app's play is pressed.
- `host.js` is unchanged: exact resume, automation and the realtime scrub keep their laws (their node tests pass). The power uses `clock.setModulationEnabled`; `clock.setEnabled` (the 1.4 "arm", which stopped the clock) is no longer called by the plugin.

## What changed from 1.4

- **BEHAVIOUR CHANGE (1.5.0-alpha.4): the window's play button is modulation's POWER button.** Josh, 2026-10-01: *"we're making modulation a power button and no longer a play button because it will remove the confusion between 'two' clocks. Timeline will have the true play while Modulation will now have a power button like Basins."* An app that relied on the window's play to start time must now give the user its own play (`mod.play`); an app that used `arm` / `setEnabled` to stop modulation now gets a bypass that leaves time running. BASINS' glyph (halo, ring, stem), its open-ring-when-off motion and its `aria-pressed`; ON is the frost face and its rim, lit in accent B, as BASINS (the time group: the tempo beside it is accent B too).

- **New:** `window.js` (the controller) and `bind.js` (the seam). `mod.js` `setPresetKey(key)` / `presetKeyOf()`; `PRESET_LS` is now the default, not the only key.
- **The rail** is `createRail`, re-classed with the plugin's material. Its grip is a `<button>` (it was a `<div>`): it takes focus, arrows move the seat, Enter keeps, Escape restores, Shift+arrows nudge. A long press shows the four seats. On a top or bottom seat the chips lie in a row. **Docked** at the top or bottom (1.5.0-alpha.5, as BASINS), the rail carries `data-dock` and its chips sit tighter along it: each is its 48 px disc + `--rail-gap`, `--rail-gap` apart (8 px disc to disc at the default spacing, was 21; 4 tight; 0 flush); across, the 62 px target and the dock lane are unchanged. Docked or floating, the right work bar ends at the last device, or at the run's right edge when the run overflows.
- **The window docks** at the top or bottom of the span, with the chip lane on its chip side; it detaches by dragging away. `presentation()` gains `dock` and `chipSide`; older records restore as floating, chips left.
- **Open and close travel** (`presence`). `close()` reports `moved(null)`.
- **Routing:** faders route; the proximity glow; the badges, pop-over and arming paint moved from the apps into `modhost.css` (`.k.has-ring > .k-dial` no longer slides 10 px left — every app had overridden it).
- **Words:** about 150 strings through `t()`; `COPY.hint` is one literal; the captions OUT, TRIG IN, + MACRO and + DEVICE are `data-cap`.
- **Unchanged:** `createModWindow`, `buildChipRail` (kept for callers that build a rail themselves; the controller no longer uses it), every `COPY` key, the model's state version.

## Proofs

- `tests/modwindow.browser.mjs` on `gallery/modulation.html`, real pointer and keyboard, hit-tested with `elementFromPoint`: in each of the four rail seats the guide's rect equals the landing rect (Δ 0 px), the landing travels and ends exactly; Escape and pointercancel put a drag back exactly; Shift-drag and the keyboard relocate the chips; a route dragged beside a knob lights it (accent B) and lands; a route onto a fader moves the fader; two presetKeys keep separate presets; the window's first seat is BASINS' power (no play anywhere in the window); with power on, the curve's dot follows the app's clock and a paused seek; power off returns every target to its base and leaves the app's clock running; the app's play never changes the power; a reload keeps the power; under `qps` the labels, chip names, captions and painted words translate; a second after a drag the page books zero frames.
- `tests/modwindow.node.mjs`: the preset key, the window-set imports (no hand copy), no `toUpperCase()`, no English in `content:`.
- Neutrality: the resting window under λWAVES' own controller and under the kit's, on the same kit, `tools/stylehash.mjs` over 8 seats: 0 changed elements, 0 pixels. The only element differences are the grip's tag (`div` → `button`; its one differing property is `text-align`, which draws nothing) and the routing glow's empty layer.
- Plates: `docs/plates/modulation/` — the rail in each seat (`rail-left/right/top/bottom.png`) a route mid-drag with SPIN lit (`route-lit.png`), the power off after a reload (`power-off.png`: the ring open and dim, the targets on their bases, the page's own PLAY above) and the light theme with the power on (`light-on.png`).

## Not done

- Not proven in WebKit or on an iPad; the long press is proven by `tests/window.browser.mjs` for the window set, not here.
- BASINS' fork features are not in the kit (see the table).
- The preset sheet's and the open button's accessible names come from `COPY.presetSheetLabel` / `presetOpenLabel`, which the catalogue tool cannot see (they are object values, not a choke point); they translate at run time if a pack has them.
