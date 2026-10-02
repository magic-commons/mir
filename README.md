# MIR

**Magic Commons' interface kit.** One set of tokens, materials, widgets, gestures, window chrome and a
modulation system, as vanilla ES modules and plain CSS. No framework, no build step. An app *adopts* MIR:
it copies the bytes in, never edits them, and asks for changes here.

MIR is the design system Josh built across two instruments — BASINS (the MANDELBROT museum), whose
modulation window is MIR's ancestor, and λWAVES, where the kit was extracted on 2026-09-10. From here on
MIR is the source; the apps are readers.

## The layers, in the order a page loads them

| Layer | Where | What it is |
|---|---|---|
| **Tokens** | `mir/css/base.css` (`:root`, theme blocks) | Colour, spacing, type scale, radii, the accent pair A/B, light and dark. Nothing else names a colour. |
| **Widgets** | `mir/css/base.css` + `mir/kit.js` | `knob`, `seg`, `sw`, `trig`, `fader`, `readout`, `formula`, `device` (window chrome), `group`, `chip`, `gripDots`, `el`. Each builds its own DOM and returns handles (`set`, `get`, `setDisabled`, `setStatus`…). |
| **Materials** | `mir/css/skin.css` | The three card styles — *tinted* (a pane, no filter), *refractive* (blur only), *frost* (a policy over both) — the neumorphic seats, the hairlines, the three faces of a window. |
| **Gestures** | `mir/kit.js`, `mir/slider-keys.js`, `mir/control-help.js`, `mir/modulation/curve-gesture.js` | The drag law — 220 px for a full scale, Shift for fine, 320 under a finger — as defaults an app may retune (`setKnobLaw`, `dragTravel`); arrows, Page, Home/End and Delete on every slider; hints that step aside for a hand on a control and show for the keyboard; the dot grip means *drag me*, the four-way cross means *route me*. Curve editors use FL Studio's point/tension gesture law from `curve-gesture.js`; hosts do not reinterpret it. |
| **Scheduling** | `mir/window-activity.js` | Idle is zero work: a window that is closed, folded, powered off or off-screen does not compute. |
| **Controls** | `mir/plane-model.js` | The sphere-and-plane orientation control. More belong here as they are built. |
| **Palette** | `mir/palette.js` | OKLab, the WCAG contrast floor, the 256-entry palette LUT and the 23-palette catalogue the accents read. |
| **Shell** | `mir/shell/` | What every app begins with, taken node for node from λWAVES: the **wordmark** (`wordmark.js`), the **menubar** it opens — FILE · EDIT · VIEW · WINDOW · ABOUT as data (`menubar.js`), the **notebook** glass with NOTES and **ABOUT** faces (`notebook.js`, `about.js` — the GPL notice and the font licences by default), the **accent engine** that colours A, B and the mark from a palette (`accent.js`), their sheet (`shell.css`) and an optional ground (`stage.css`). NOTES previews markdown and maths with marked and KaTeX from `vendor/`, loaded on the first preview. See `gallery/shell.js` for the whole assembly. |
| **Modulation** | `mir/modulation/` | The kit's first plugin: the modulation window's builders (`modwindow/`, BASINS' window, the source since 1.1.0), its host (`host.js`, `modhost.css`), model (`mod.js`), registry, curves and the shared FL-style curve gesture interpreter (`curve-gesture.js`). The rest of the controller that wires the window to a host is still λWAVES' (`lab/modwindow.js`). See `modulation/modwindow/host-contract.md` and `docs/PLUGIN-CONTRACT.md`. |
| **Type** | `fonts/` | LW Title (a renamed Spinwerad subset), Roboto (UI), STIX Two Math (the maths), with their licences. |
| **Laws** | `docs/` | [API](docs/API.md) (every export) · [CONTRACT](docs/CONTRACT.md) (load order, what the kit reads on `<body>`, the tokens an app may re-point, ids, storage) · [INTENT](docs/INTENT.md) (what every shadow, bevel and light means) · [TOKENS](docs/TOKENS.md) (every token, generated) · [TIERS](docs/TIERS.md) (lite and flat) · [LAYERS](docs/LAYERS.md) (the cascade layers) · [CORE](docs/CORE.md) (frame, motion, pointer, proximity, perf) · [WINDOWS](docs/WINDOWS.md) · [RACK](docs/RACK.md) · [KEYS](docs/KEYS.md) (the key table and the keyboard window) · [SHELL-PARTS](docs/SHELL-PARTS.md) (dialog, notice, busy, boot, flash guard, share link, settings rows) · [FOLDERS](docs/FOLDERS.md) (the project window) · [MODULATION](docs/MODULATION.md) (the plugin's controller and app seam) · [NOTEBOOK](docs/NOTEBOOK.md) (pages and the shelf) · [INFORMATIONAL](docs/INFORMATIONAL.md) (words on the picture) · [GUI](docs/GUI.md) (MIR OPTIONS and MIR ABOUT) · [LANGUAGES](docs/LANGUAGES.md) · [FORMAT](docs/FORMAT.md) (the portable file format, its checker, and pictures that carry a project) · [LLM-MODS](docs/LLM-MODS.md) (the mir-builder skill, the starter, LLM.md, describe() and dump()) · [THEMES](docs/THEMES.md) (the vanilla themes and their tones, and how a 'name'-spec differs) · [SKINS](docs/SKINS.md) (where the look lives: every FROST value block, the rules a skin follows, the near-duplicates) · [SKINS-MODULATION](docs/SKINS-MODULATION.md) (the modulation window's look values: its FROST blocks, how to set one, what stays a literal) · [TRANSPORT](docs/TRANSPORT.md) (the transport: its parts, BASINS' and λWAVES' layouts, the main opener) · [LANGUAGES-GLOSSARY](docs/LANGUAGES-GLOSSARY.md) (the translators' glossary) · [HISTORY](docs/HISTORY.md) · [ADOPTING-1.5](docs/ADOPTING-1.5.md) · [LINES](docs/LINES.md) · [PLUGIN-CONTRACT](docs/PLUGIN-CONTRACT.md) (the socket TIMELINE plugs into) · STYLE-LOCK, MOTION-LAW, ANTI-PATTERNS, REFERENCES — the reasoning, kept with the code. |
| **Proofs** | `tests/`, `tools/` | `npm test`: the token lint, node tests of the model and the adopt tool, browser tests of the controls and the shell. `tools/stylehash.mjs` proves a kit change neutral in an app; `tools/shell-parity.mjs` proves the shell is λWAVES'. |

## Adopt it

```bash
node tools/adopt.mjs ../my-app            # copies mir/ → my-app/lab/mir/, fonts/ → my-app/lab/fonts/, removes what the kit no longer has, writes MIR-MANIFEST.json
node tools/adopt.mjs ../my-app --check    # changes nothing; exit 1 on a changed, missing or extra kit file, or a manifest that lies
node tools/adopt.mjs ../my-app --dry-run  # what an adopt would add, update and remove
# --prefix <dir> puts the kit somewhere other than lab/; --allow-dirty adopts from uncommitted kit changes (the manifest says so)
```

In the app's `index.html`, in this order, before any sheet of the app's own:

```html
<link rel="stylesheet" href="./mir/css/base.css">
<link rel="stylesheet" href="./mir/css/skin.css">
<link rel="stylesheet" href="./mir/shell/shell.css">                    <!-- if the app uses the shell (wordmark, menubar, notebook) -->
<link rel="stylesheet" href="./mir/shell/stage.css">                    <!-- optional: λWAVES' ground, if the app has none of its own -->
<!-- the app's own sheets here -->
<link rel="stylesheet" href="./mir/modulation/modhost.css">              <!-- only if the app uses modulation -->
<link rel="stylesheet" href="./mir/modulation/modwindow/modwindow.css">  <!-- and this one LAST: nothing may follow it -->
```

```js
import { knob, seg, trig, device, gripDots } from './mir/kit.js';
import { installControlHelp } from './mir/control-help.js';
// the shell
import { wordmark } from './mir/shell/wordmark.js';
import { createMenubar } from './mir/shell/menubar.js';
import { createNotebook } from './mir/shell/notebook.js';
import { createAccent } from './mir/shell/accent.js';
```

A fresh app's shell is five calls — the wordmark, the accent, the menus as data, the notebook with its ABOUT words.
The shell keeps λWAVES' gutter for a rack on each side; an app with no racks sets `--rack-w: 0px` in its own sheet.
One menubar and one notebook per page (they own the ids `menubar` and `notebook`); both have `destroy()`.

```js
const title = wordmark(stage, { word: 'MYAPP' });
const accent = createAccent();                          // A 30°, B 300° on the palette; pass { a: 60, b: 300 } for Josh's law
const menus = createMenubar({ opener: title, host: lab, menus: { FILE: () => [['NEW'], null, ['EXPORT (.json)']], ABOUT: () => [['ABOUT MYAPP', () => notebook.open('about')]] } });
const notebook = createNotebook({ host: stage, name: 'MYAPP', about: { version: '0.1.0', tagline: 'What it is, in one sentence.', copyright: '© 2026 …' }, onLogo: () => accent.paintMarks() });
accent.apply();
```

## The one rule

**Reuse the nodes, the gestures and the CSS. Do not copy their look.** A widget the kit has is built by the
kit's builder and styled by the kit's sheet. When something is missing, add it to MIR (with its law and its
proof) and re-adopt; do not grow a second version inside an app. A model starting a new app copies `starter/` and
reads `LLM.md`; the `mir-builder` skill (`node tools/make-skill.mjs`, `docs/LLM-MODS.md`) carries both, and the kit.

## Skins

The look is chosen in the GUI window (GUI › MIR OPTIONS · SKIN and TONE) from the **vanilla themes** FROST (glassmorphism, Josh's recipe, the default) · MORPH (neumorphism) · CLASSIC (the 1.4 spirit) · SWIFT (the fast one) · AURORA (the flashy one) · NEON, each with its tones (named sets of only the colour options) (`docs/THEMES.md`,
`gallery/themes.html`). New users start on FROST, dark. Every look value in the kit's sheets is a token,
declared once in a `/* FROST · values */` block at the top of its sheet (`docs/SKINS.md`, and
`docs/SKINS-MODULATION.md` for the modulation window), so a skin is a set of token values (`docs/FORMAT.md` checks one).

**How MIR names a look** (Josh, 2026-10-01): a **vanilla theme** is a named set of the built-in settings and nothing else: FROST, MORPH, CLASSIC, SWIFT, AURORA and NEON are. Anything that needs rules or art outside the settings is a **'name'-spec** MIR build or theme: **METRO** and **SPRITES** are 'name'-specs. METRO is flat colour switches instead of shading (old Android
material, the Windows 8–10 start-menu cards); every look has a Dark and a Light variant and works with the accent
A/B system.

## See it

`npm run gallery` serves http://127.0.0.1:8790/gallery/ — every token, control, window state, glyph and the
modulation window on one page, built from the kit itself and restyled by nothing, with the theme, card style,
frost, ground (plain or a busy coloured field) and accent seats live.
`gallery/shell.html` is a fresh app on the kit: hover the wordmark for the menus, press J for the notebook (with a project's pages and the ▤ shelf), ⓘ for ABOUT.
`starter/` is the smallest whole app, to copy: `http://127.0.0.1:8790/starter/`.
`mir/app.js` — `createApp()`: the standard wiring in one call; `mir/mir.css` — every kit sheet in one link.

The gallery's front page links every other page:

| Page | What it shows |
|---|---|
| `gallery/intent.html` | INTENT: what every shadow, bevel and light means, drawn by the kit's own controls |
| `gallery/core.html` | one frame, one motion, one drag, the drop-here glow and the cost meter |
| `gallery/windows.html` | one floating window, its chip rail and the dock |
| `gallery/rack.html` | two racks, lazy windows, + / SHIFT-queue / ☆, drag, float, dock, hide and peek |
| `gallery/shell.html` | the wordmark, the menus, the notebook with pages and the shelf, ABOUT |
| `gallery/folders.html` | FOLDERS, the project window: save, open, folders, drag to folder, export and import |
| `gallery/modulation.html` | the modulation plugin mounted by one call, routing onto knobs and faders |
| `gallery/keyboard.html` | one key table, the KEYBOARD window that rebinds it, the help view |
| `gallery/parts.html` | dialog, notice, busy mark, boot card, flash guard, share link, settings rows |
| `gallery/info.html` | INFORMATIONAL: words on the picture, read from `.md` pages |
| `gallery/gui.html` | MIR OPTIONS 1 · 2 and MIR ABOUT, one light, SPACING, the pointer glow and the parallax |
| `gallery/themes.html` | every vanilla theme × tone, live; click one to apply it |
| `gallery/language.html` | the language mechanism: English, the pseudo-language and right to left |
| `gallery/transport.html` | the transport's parts in BASINS' and λWAVES' layouts: one play, modulation's power, the BPM pill, the tempo panel |
| `gallery/format.html` | the portable file: a skin, a spec, a picture that carries one |
| `starter/index.html` | the smallest whole MIR app, to copy |

## Prove it

```bash
npm test                                   # token lint · node tests (adopt, registry, curve, host, model) · browser tests (controls, shell)
node tools/lint-tokens.mjs --unused        # every token read has a writer; and what is written but never read
```

**Neutrality** — does a kit change change what an app draws?  Adopt the working kit into a *copy* of the app
(never the app itself), serve both, then:

```bash
node tools/stylehash.mjs capture before  http://127.0.0.1:8811/index.html out   # the app as it ships (twice: the second is the noise)
node tools/stylehash.mjs capture before2 http://127.0.0.1:8811/index.html out
node tools/stylehash.mjs capture after   http://127.0.0.1:8812/index.html out   # the copy on the new kit
node tools/stylehash.mjs compare out before after --noise before2             # every visible element × 8 states; exit 1 on a difference
```

(`--theme`, `--card`, `--frost`, `--ready`, `--setup` tell it how to drive the app; `--gpu 1` for an app that needs WebGPU.
Measure an app FULLY booted: λWAVES builds its help and native controls only once the GPU is up, so drive it with
`--gpu 1 --ready "__LW.ready && !!document.getElementById('controlHelp')" --theme "__LW.setTheme(%s)" --card "__LW.setCardStyle(%s)" --frost "__LW.setFrost(%s ? 'always' : 'off')"` —
a half-booted page is a half proof.)

**The shell is λWAVES' shell** — serve λWAVES' `lab/` and this repository, then

```bash
node tools/shell-parity.mjs capture lambdawaves http://127.0.0.1:8779/index.html /tmp/parity
node tools/shell-parity.mjs capture mir-as-lw   'http://127.0.0.1:8780/gallery/shell.html?as=lambdawaves' /tmp/parity
node tools/shell-parity.mjs compare /tmp/parity lambdawaves mir-as-lw      # styles, text, boxes, pixels · 14 states · exit 1 on any difference
node tools/shell-behaviour.mjs http://127.0.0.1:8780/gallery/shell.html    # 19 behaviour probes · exit 1 on any failure
```

They need Chromium (`CHROMIUM=…`; otherwise the first on PATH, then the snap's) and nothing else.

## Made with

MIR was extracted from λWAVES by AI coding agents (Claude Code with Anthropic's Claude models; parts of the
modulation window by OpenAI's Codex; design reviews by Google's Gemini) under Joshua Hosain's direction. He
is not a programmer and says so; the [λWAVES README](https://github.com/magic-commons/lambdawaves#who-made-this-honestly)
carries the full disclosure — what was decided by hand, what was verified, what was not — and the same terms
apply here. Contributions made the same way are welcome under λWAVES' `AI_POLICY.md`.

## Licence

GNU GPL v3.0 only — © 2026 Joshua Hosain, Magic Commons. Third-party notices ride with the fonts and the
modulation window's provenance notes.
