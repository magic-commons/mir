# MIR — changelog

## 1.5.0-alpha.2 — 2026-10-01 · one window, the first 1.5 tokens, words on the stage

Not released: the 1.5 line is built on branch `worktree-mir-1.5`. The plans are in Josh's vault (`MIR CLAUDE 1.5 PLAN 2026-10-01`, `MIR CLAUDE 1.5.X INFORMATIONAL + LLM PLAN 2026-10-01`).

- **`mir/window/`**: one floating window, one chip rail, one dock (`docs/WINDOWS.md`). No runtime CSS cloning; chips relocate by Shift-drag, long press and keyboard; the dock guide is the landing rect.
- **The chip rail is styled by hooks** (`data-mir-rail`, `data-mir-chip`), not by its English label; the chips' glyph attribute is `data-glyph`. **Breaking for an adopting app:** `docs/ADOPTING-1.5.md`.
- **The first 1.5 token names**, read at the place of use with the 1.4 name as the fallback (`--surface-*`, `--relief-*`, `--state-*`, `--label-*`), and **`data-ui-tier="lite" | "flat"`** (`docs/TIERS.md`).
- **Controls paint only what changed** (`kit.js` through `core/perf.js`).
- **`mir/history/`** (one undo ring and its list) and **`mir/core/project.js`** (project parts), lifted from BASINS.
- **`mir/info/`**: INFORMATIONAL's first page: floating text, a jointed line that is only ever flat, 45° or vertical, force between labels (`docs/INFORMATIONAL.md`, `gallery/info.html`). The notebook faces Spectral, Playfair Display and Alegreya SC are in `fonts/info/`.

## 1.5.0-alpha.1 — 2026-10-01 · the foundation

- **The base**: BASINS' four forked kit files and the timeline's `host.js` / `mod.js` work are in the kit.
- **The line guard**: `adopt.mjs` refuses to move an app onto another line without `--line` (`docs/LINES.md`). The 1.4 line is frozen as branch `mir-1.4.x` at `v1.4.3`.
- **Cascade layers**: the kit's sheets are in `@layer`s; an app's sheets beat them with plain selectors; 838 `:root` ladders are gone (`docs/LAYERS.md`). **Behaviour change:** the kit's `!important`s now beat an app's.
- **`mir/core/`**: frame, motion, pointer, proximity, perf (`docs/CORE.md`).
- **INTENT**: `docs/INTENT.md`, `mir/tokens.json`, `tools/lint-intent.mjs`.

## 1.4.3 — 2026-09-23 · editable sine at birth, double-click tension reset

- Fresh LFOs now start on the editable SINE preset. Explicit analytic waves and saved source modes are preserved.
- Double-clicking a tension handle resets it, alongside the existing right-click reset, for LFO and ENV hosts.

## 1.4.2 — 2026-09-21 · the FL curve workflow is a kit law

- Added `mir/modulation/curve-gesture.js`, the shared interpreter every modulation host now uses.
- Restored Image-Line's documented envelope controls: right-drag empty space adds and places a point; Shift-right-click adds at the curve's current value; left-drag moves a point; left-drag on the tension handle changes curvature; Ctrl gives fine tension control; right-click on a tension handle resets it; Alt-left-click deletes a point. A plain left click on empty curve is inert.
- Fixed the scaled-editor miss: pointer coordinates are converted from client pixels into the SVG viewBox before point/handle hit testing. Clicking a visible tension handle can no longer fall through as empty space and add a point.
- Deterministic analytic LFOs materialize their equivalent editable curve on the first edit. The editor no longer blocks behind “select a preset first.” S&H and DRIFT remain analytic because no single-cycle breakpoint curve represents them.
- `PROMPT.md`, the contract, API and adopted host contract state the law explicitly so a model cannot silently reintroduce the tap-to-add or preset-gate variants.
- `tests/curve-gesture.node.mjs` proves the coordinate transform, hit priority, full action matrix, point-axis locks, Ctrl-fine tension and analytic-wave mapping.

## 1.4.0 — 2026-09-16 · polish: the kit proves itself

MIR gets its own proofs, repairs the bugs its 2026-09-16 survey found, shows everything it has in a gallery that restyles nothing, and has docs that are MIR's.

Every change below was measured in throwaway copies of λWAVES and BASINS III re-adopted onto this kit (`tools/stylehash.mjs`: every visible element × theme × card × frost, λWAVES fully booted on the GPU). The results, and how they were checked:
- **λWAVES:** identical in all 8 default states, element by element and pixel by pixel. Two tokens change underneath (see *The accent follows the app*), and they show as soon as a switch is on.
- **BASINS:** identical except that its accent setting now works.
- **The shell:** still λWAVES' own in all 14 states (`tools/shell-parity.mjs`).
- **An independent verifier** re-ran every proof, mutated the kit under the tests (each mutation caught), and found the gaps fixed below before release.

### Fixed
- **The accent follows the app.** `--acc` was a literal (`#78e1f0`, and `hsl(188 70% 34%)` on light), and its soft tints were resolved once on `:root`. So:
  - an app that turned `--hue-acc` on `<body>` moved the derived tints but never `--acc` itself;
  - an app that wrote `--acc` never moved `--acc-soft` or `--acc2-soft`.

  Accents are now `hsl(var(--hue-acc) var(--sat-acc) var(--lum-acc))`, and B likewise with `--hue-acc2/--sat-acc2/--lum-acc2`. They and their soft tints are declared again on `<body>`, so they follow whatever the app writes there; an inline `--acc` still wins. The defaults are the house cyan to within one level of green.
  - **Visible in BASINS and NEBULA:** their ACCENT A setting now recolours the power lamps, the switch and trigger fills and every other accent. Measured in BASINS: rgb(120,225,240) → rgb(134,227,214), BASINS' own chosen accent.
  - **Visible in λWAVES, once it re-adopts (Josh's call):** the soft tints now follow λWAVES' own accent instead of the house cyan. That means the fill of a switch that is ON, the modulation button while live, the transport's mod buttons and the keymap's highlights: a switch turned on at boot fills with the palette's accent rather than cyan (measured). The default screens paint no soft tint, so they are identical.
  - **Breaking, for an app that writes accents on `<html>` or in a `:root` rule:** those are now shadowed by the `<body>` declaration and ignored. Write accents on `<body>`; λWAVES, BASINS and NEBULA already do, and hue tokens on `<html>` still work.
- **Help reopened on a click.** A mouse press closed a hover hint, and the press's own focus reopened it at once, against the law that a hand on a control closes the hint. Focus now shows a hint only to the keyboard (`:focus-visible`), and Tab still does.
- **The parts the kit builds are styled by the kit.** The CSS for the window status (`.dev-stat`), the formula (`.fx`), the ⓘ button and panel, the hover hint (`.control-help`) and the plane model lived only in λWAVES' sheets, so every other app got them unstyled: the gallery's status ran into its title, and a hint sat in the page flow. The rules are λWAVES', now at the end of `mir/css/skin.css`: 32 blocks, 28 byte for byte, 1 differing only in whitespace, 3 with their selector lists trimmed to the kit's parts. They duplicate, and so don't change, what λWAVES, BASINS and NEBULA already carry.
- **A disabled fader is disabled.** It no longer resets on a double-click, and it looks disabled (`.fd.disabled`, the knob's .38 / .3).
- **Undefined tokens.**
  - `--w-medium` (a typo for `--w-med`) is now `--w-med`: bold text in a window's ⓘ help is medium weight again.
  - `--line` (defined nowhere) is now `--glass-border-color`, in the parked macro matrix.
  - `tools/lint-tokens.mjs` now fails on any token read that nothing writes.
- **Motion tokens.** `--t-fast/--t-soft/--t-linger/--logo-turn` moved from `skin.css` to `base.css`, which reads them.
- **The fader caught up with the knob.**
  - `setBase(fn)` works (it was an empty stub), and so does `setDisabled(on)`.
  - A painted (modulated) fader or knob announces the hand's value in both `aria-valuenow` and `aria-valuetext`.
  - `log` with min ≤ 0 warns instead of silently turning linear.
- **The drag law round-trips.** `setKnobLaw` takes explicit `keyFine`, `faderFine` and `touchTravel`, so `setKnobLaw(setKnobLaw())` changes nothing. `dragTravel(event, { touch })` gives the law to a drag surface the kit did not build.
- **The plane model** is sharp at every device-pixel ratio. It repaints on a theme flip, when it used to hold the other theme's ink. An accent written inline on `<body>` is noticed on the next `paint()`, with no style resolution per frame, since λWAVES paints it every frame. `destroy()` releases its observers.
- **Leaks.** An ⓘ panel's document listener leaves once the panel has been in the page and left it.

### λWAVES names became options (defaults unchanged)
- `device({ loadingMark })`: an element, a selector, or `false`. Default: the wordmark's mark.
- `createWindowActivity({ rackIds, classes: { uiHidden, rackHidden, rackPeek } })`. This renames what window-activity reads; `shell.css` still hides the shell on `ui-hidden`.
- `setHelpClasses({ hintsOff })`, and `consolidateWindowHelp(root, { sources })`. `window-info-off` is a CSS contract name and stays as it is.
- **Not in this release:** an injectable preset key. `mod.js` is untouched, byte-identical to its vendored source, because λWAVES' `tests/mir.test.mjs` §16 proves those bytes and an adopt must not break λWAVES' gate. It waits for that gate to retire.

### Proofs and tools
- **`npm test` (`tests/run.mjs`)**, with no dependencies. Every suite passes:
  - the token lint;
  - `adopt.node.mjs` (17 assertions);
  - `registry.node.mjs` (19), `curve.node.mjs` (10), `host.node.mjs` (50) and `modulation-model.node.mjs` (20), ported from λWAVES' `tests/mir.test.mjs` with neutral fixtures;
  - `widgets.browser.mjs` (47, real pointer and keyboard);
  - `shell.browser.mjs` (the 19 shell probes).
- **`tools/stylehash.mjs`** is the neutrality proof: the "3 292-element computed-style hash" of 1.0.0, kept this time.
  - **What it captures:** every visible element including `<html>` and `<body>`, about 90 computed properties, boxes, `::before`/`::after`, and every custom property the page's sheets declare.
  - **Noise:** a second capture of the unchanged page masks noise per property and per pixel. With that mask, a pixel difference fails the run too.
  - **What it does not drive:** hover, focus or popovers (the other proofs cover those).
- **`tools/lint-tokens.mjs`:** every `var(--x)` the kit reads has a writer. Tokens left to the host are listed with their reason.
- **`tools/adopt.mjs` hardened:**
  - an unknown flag is an error (a mistyped `--check` used to copy), and so is a `--prefix` that is a flag or leaves the app;
  - files the kit no longer has are removed, and `--check` reports them as EXTRA along with a manifest that doesn't match the bytes;
  - `--dry-run` and `--prefix` are new, and a corrupt manifest is reported, not thrown;
  - the manifest records the kit commit, and adopting from uncommitted kit changes needs `--allow-dirty`;
  - files are replaced atomically;
  - the manifest keeps the shape λWAVES' `tests/mir-manifest.test.mjs` reads.
- **`tools/serve.mjs`:** a static server with no dependencies. `npm run gallery` no longer needs Python.
- **`tools/cdp.mjs`:**
  - every call has a deadline (`MIR_CDP_TIMEOUT`), so a GPU-wedged page fails a proof instead of hanging it;
  - `gpu: true` for an app that needs WebGPU;
  - it finds Chromium on the PATH;
  - a snap Chromium's profile goes where the snap can write it, and every browser is killed on exit.
- **`package.json`:** `"type": "module"`, and scripts for `test`, `gallery`, `lint:tokens`, `adopt`, `check`, `parity:shell` and `stylehash`.

### Gallery
`gallery/index.html` is rebuilt.
- **Seats:** theme, card style, frost, disconnected, and a **ground** seat: plain, or a busy coloured field (Sol's test: glass must hold over a picture).
- **Accents:** A, B and VIVID on the accent engine.
- **Tokens:** every colour, type size, spacing and radius.
- **Controls:** every control in every state (linear, log, wrap, stepped, modulated with its base tick, disabled, large; switches off and on; a latched trigger; faders linear, log, driven and disabled; readout states; the formula; badges).
- **Window states:** live, off, calculating, folded.
- **The glyph set, and the real modulation window**, built by `createModWindow` and not restyled.
- **Removed:** the gallery's own `.g-tile` overrides, which broke the one rule.

### Docs
- **New:**
  - `docs/API.md`: every export of every module.
  - `docs/CONTRACT.md`: load order, what the kit reads on `<body>`, the tokens an app may re-point, ids, events, storage.
  - `docs/PLUGIN-CONTRACT.md`: the socket TIMELINE plugs into, and what the vault already decided about it.
- **Corrected:** STYLE-LOCK, MOTION-LAW, ANTI-PATTERNS, REFERENCES and the modulation window's notes are now MIR docs. Their λWAVES provenance is kept, λWAVES rulings are labelled as such, and stale claims are corrected (the byte-frozen law, keyboard knobs "NOT built", the default card style, the accent defaults, the host-API claim).

### Readability is the app's (Josh, 2026-09-16)
*"Each app specific stuff should be fine. And readability is different for each app."*
- **The kit ships normal polarity:** dark ink on light, light ink on dark, as λWAVES reads.
- **An app sets its own ink in its own sheet.** BASINS, whose glass sits over the coloured Mandelbrot set, uses white text on light and black on dark (its `ink.css`, re-pointing the ink ladder, CONTRACT §4).
- **So no kit-wide ground axis.** The gallery's FIELD ground stays a way to look at glass over a busy picture, not a law.
- **The same goes for the faint `--ok`/`--warn` readouts on light cards:** an app that uses them re-points them.

## 1.3.0 — 2026-09-16 · the shell, from λWAVES

Josh named λWAVES the reference app for MIR's features. The first to come into the kit are the menubar the wordmark opens and the notebook glass with its ABOUT face. A fresh app on MIR now gets these, and the basics of an ABOUT page, without writing them.

- **`mir/shell/`** is new. It holds the wordmark, the menubar and the notebook, built from λWAVES' own DOM and CSS, node for node.
  - **`wordmark.js`** builds `#title`: an optional lead glyph (λWAVES' λ), the name in LW Title, the nine-square mark, and a hidden subtitle.
  - **`menubar.js`** provides `createMenubar({ opener, host, menus })`.
    - **Menus are data:** `FILE · EDIT · VIEW · WINDOW · ABOUT → [label<TAB>key, run, disabled, hint]`, where `disabled` is a boolean or a function.
    - **Open and close:** hovering the wordmark opens the bar; leaving the wordmark and the bar for 400 ms closes it. A press outside closes it, and so does Escape, which gives the wordmark its focus back (λWAVES wave 62).
    - **Keyboard:** it is a disclosure, not an ARIA menubar. A keyboard open focuses the first group, and every list is filled when it opens.
    - **Phone:** the bar is always shown, and crossing into the kit's `--phone` breakpoint shows and places it. A shown bar is placed again once the fonts have loaded and on resize.
    - **Teardown:** `destroy()` removes the bar and all its listeners.
  - **`notebook.js`** provides `createNotebook({ host, name, about, faces, render, … })`, the free glass.
    - **NOTES** keeps markdown and maths; Ctrl/⌘+Enter previews, and typing never reaches the app's keys except Ctrl/⌘+S and Ctrl/⌘+,.
    - **ABOUT** is the face described below. **App faces** each get a round button after ◐.
    - **Drags:** moving and resizing belong to the pointer that started them.
    - **Storage:** each face remembers its own size, and writes are debounced and flushed on pagehide.
    - **Teardown:** `destroy()` flushes storage, then removes the notebook and its listeners.
  - **`about.js`** provides `aboutFace(face, data)`, the ABOUT face built from data.
    - **Defaults every app gets** unless it says otherwise:
      - the GNU GPL v3.0-only notice, with LICENSE and NOTICE links (the paths are options, and NOTICE can be left out);
      - the kit's three typefaces with their SIL OFL 1.1 licences.
    - **Its own words:** version, tagline, copyright, special thanks, team, made-by, and a home link.
    - **Rich text without `innerHTML`.**
    - **Unsafe links dropped:** a link whose scheme could run code (`javascript:`, `data:`, …) is written as plain text, and an unsafe home link is not built.
  - **`accent.js`** provides `createAccent()`, λWAVES' accent engine.
    - **Accents:** A and B are two angles on a palette, with their lightness held to the theme and pushed toward neon by VIVID.
    - **The λ:** its colour is held to a 3 : 1 contrast floor against its ground.
    - **The mark:** its nine squares are painted from the palette wheel, with a TURN and a BUSY loop.
    - **Defaults:** λWAVES' own, A 30° and B 300°. Josh's law of 60° and 300° is one option away.
  - **`notebook-render.js`, `notebook-math.js`** are λWAVES' sanitised markdown and KaTeX renderer, copied verbatim.
  - **`vendor/`** holds marked 12.0.2 and KaTeX, both MIT licensed, KaTeX's fonts under the SIL OFL, with their licences. The notebook loads them the first time a preview asks, and only the halves the page has not already loaded, so an app that never previews never downloads them. `vendor: false` turns this off.
  - **`shell.css`** holds the shell's rules: 109 rules taken from λWAVES' `lab.css` and `skin.css` by `tools/extract-shell-css.mjs`, with declaration blocks byte for byte and in cascade order, plus one kit addition: an app-added face hides the notebook's title, as PROJECTS does. Re-running the extractor reproduces the sheet exactly.
    - **No rack gutter by default:** it keeps λWAVES' gutter for two racks, and an app with no racks sets `--rack-w: 0px`.
    - **Hands off the stage:** it sets nothing on html, body, #lab or #stage.
  - **`stage.css`** is optional: λWAVES' ground (#070a0f dark, #eef1f6 light) for an app that wants the stage the shell was drawn on.
- **`mir/palette.js`** is λWAVES' palette module, copied verbatim: OKLab, the WCAG contrast floor (`visibleInk`), the 256-entry lookup table, and the 23-palette catalogue.
- **`gallery/shell.html`** is a fresh app on the kit and nothing else. `?as=lambdawaves` fills it with λWAVES' words.
- **Proofs.**
  - **`tools/shell-parity.mjs`** drives λWAVES and `gallery/shell.html?as=lambdawaves` through 14 states and compares four things in each: computed styles (70 properties plus ::before/::after), each element's own text, each element's box, and the pixels.
    - **Desktop, light and dark:** FILE open, a real pointer hovering an item, NOTES, NOTES previewed with markdown, a table and maths, and ABOUT.
    - **Phone, light and dark:** idle, and ABOUT full screen.
    - **Result:** all four are identical in every state. It exits 1 on any difference, pixels included.
  - **Negative controls:**
    - a fresh app's words: 274 differences;
    - a hover-only rule: caught in the two hover states;
    - a (hover: none) rule: caught;
    - one changed word and a heading text-shadow: caught.
  - **`tools/shell-behaviour.mjs`** runs 19 probes of what a picture cannot show: hover, Escape and focus, J never typing into the notes, the rack gutter, the preview rendering, links served and unsafe links dropped, `destroy()`, and the phone bar and its placement.
  - **`tools/cdp.mjs`** is the dependency-free headless Chromium underneath. Every browser it starts is killed when the process exits, and it renders text in grayscale, because subpixel antialiasing follows the compositing layer, not the design.
  - **An independent verifier** re-ran the proofs, compared about 590 properties per element (0 differences), and found the gaps fixed above.
- **Known and left as λWAVES has it:** on a phone, the always-shown bar covers the notebook's round buttons when the notebook is full screen.
- **Not in this release.**
  - **The keyboard (keymap) editor:** Josh's call; its GUI is not ready.
  - **The PROJECTS face:** the file/folder system is its own to-do. `faces` is where it will plug in.
- **The look is FROST.** MIR has one skin today, FROST; skins are to come (see `README.md`).

## 1.2.0 — 2026-09-12 · published under the 1.1.3 label

The two commits after the 1.1.3 entry (f0ac335, 05155da) added API to `kit.js` without a version of their own. They are this release.

- **The drag law as defaults an app may retune.**
  - `setKnobLaw({ travel, fine })` sets the law: travel is 220 px for a full scale, fine is the Shift divisor on a drag (900/220 on a knob, 5 on a fader), and 1/fine is the Shift factor on an arrow step. It returns the law.
  - BASINS asked for Shift = ⅛ with `setKnobLaw({ fine: 8 })`.
  - Every knob and fader may also carry its own `travel` and `fine`.
- **`fader` catches up with the knob.**
  - `log` gives a log-scale fader for FREQ-shaped ranges.
  - `show(x)` and `shown` paint a modulated value over the base, adding the `.mod` class.
  - `paint` and `setDefault` are new.
  - The Shift-drag is now `dx / (width · fine)`, and arrow steps move in log space on a log fader.
- **Known, and not fixed here** (see the 2026-09-16 survey):
  - `setKnobLaw(setKnobLaw())` does not round-trip.
  - A fader's Shift-drag (⅕) and Shift-arrow (¼) disagree.
  - The fader's `setBase` is an empty stub.
  - The modulation window's own dials do not read the law.

## 1.1.3 — 2026-09-11

- The tinted pane wears the glass opacity again (.84 dark / .86 light). While FROST is in force it thins to
  .58 so the blur can be seen through it; when the policy lifts (frost-hold) it is a full pane again.

## 1.1.2 — 2026-09-11

- `fader`: the fine (Shift) drag reads its rect once per drag, not once per move.
- `modhost.css`: two dead rules from the audio device's old cycling design removed (a trace rule for a device
  that never builds one; a selected/unselected split carrying one declaration).

## 1.1.1 — 2026-09-11

- `knob`: a modulated knob keeps its base visible — a short accent tick at the rim marks the hand's number
  under the dancing needle (Bitwig's convention: modulation shows over the setting, it does not hide it).

## 1.1.0 — 2026-09-11

- The modulation window's AUDIO device is redesigned (a minimised meter, separate full and compact layouts,
  routing controls aligned) and SPECTRUM/AUDIO labels tightened — work that arrived in λWAVES from the GPT
  team on 2026-09-10/11 and is taken back into the kit here (`modulation/modwindow/*`, `modhost.css`,
  `mod.js`). With this the "byte-frozen port" law is retired: MIR is the source of the window now, and
  λWAVES' `tests/mir.test.mjs` provenance patch (`docs/mir-matrix-patch.json`) records the delta from
  BASINS.
- `--card-opacity` .76 → .88: the tinted pane keeps a faint breath of the field, no more.
- `control-help.js`: the ⓘ panel's copy edits from the same pass.

## 1.0.1 — 2026-09-10

- `knob`: a base and a painted value are two things. `show(x)` paints a modulated value over the base (the
  needle dances), `set(x)` writes the base, and a drag starts from the base — so a hand on a routed knob moves
  its range by the drag and never teleports it to where the modulator was.

## 1.0.0 — 2026-09-10 · extracted from λWAVES

- Tokens, widgets and window chrome (`mir/css/base.css`, `mir/kit.js`) and the material language
  (`mir/css/skin.css`) split out of λWAVES' `lab.css` / `skin.css`; the app keeps only its own selectors.
  Proved neutral by a 3 292-element computed-style hash, dark and light, before and after.
- `control-help.js` (hints that step aside, the ⓘ panel, one help surface per window) and `plane-model.js`
  cut out of λWAVES' `native-ui.js`.
- The modulation system (BASINS' window, byte-frozen, with λWAVES' host, model, registry and curves) under
  `mir/modulation/`. The host API exposes the window's own gestures (`wireGrip`, `wireDepth`, `paintDepth`,
  `moveMacro`, `rebuildMacros`) so a second face can reuse them. *(Corrected in 1.4.0: those five live in
  λWAVES' own `lab/modwindow.js` host controller, not in MIR; the kit ships the window's builders.)*
- The dot grip (`gripDots`, 3 × 3 on a 5-px pitch) is the one *drag me* mark: rack window headers, the rail's
  reorder handle, the transport's macro tiles, the modulation device cards. The four-way cross is *route me*.
- `tools/adopt.mjs` copies the kit into an app and writes `MIR-MANIFEST.json`; `--check` reports drift.
