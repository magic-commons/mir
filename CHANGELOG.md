# MIR — changelog

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
  `moveMacro`, `rebuildMacros`) so a second face can reuse them.
- The dot grip (`gripDots`, 3 × 3 on a 5-px pitch) is the one *drag me* mark: rack window headers, the rail's
  reorder handle, the transport's macro tiles, the modulation device cards. The four-way cross is *route me*.
- `tools/adopt.mjs` copies the kit into an app and writes `MIR-MANIFEST.json`; `--check` reports drift.
