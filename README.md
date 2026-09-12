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
| **Gestures** | `mir/slider-keys.js`, `kit.js`, `mir/control-help.js` | One slider ladder for every drag surface (arrows step, Shift is fine, Home/End, double-tap resets); hints that step aside for a hand on a control; the dot grip means *drag me*, the four-way cross means *route me*. |
| **Scheduling** | `mir/window-activity.js` | Idle is zero work: a window that is closed, folded, powered off or off-screen does not compute. |
| **Controls** | `mir/plane-model.js` | The sphere-and-plane orientation control. More belong here as they are built. |
| **Modulation** | `mir/modulation/` | The modulation window (BASINS' port, byte-frozen: `modwindow/`), its host (`host.js`, `modhost.css`), model (`mod.js`), registry, curves. See `modulation/modwindow/host-contract.md`. |
| **Type** | `fonts/` | LW Title (a renamed Spinwerad subset), Roboto (UI), STIX Two Math (the maths), with their licences. |
| **Laws** | `docs/` | STYLE-LOCK, MOTION-LAW, ANTI-PATTERNS, REFERENCES — the reasoning, kept with the code. |

## Adopt it

```bash
node tools/adopt.mjs ../my-app          # copies mir/ → my-app/lab/mir/, fonts/ → my-app/lab/fonts/, writes MIR-MANIFEST.json
node tools/adopt.mjs ../my-app --check  # lists every kit file the app has changed (CI-friendly, exit 1 on drift)
```

In the app's `index.html`, in this order, before any sheet of the app's own:

```html
<link rel="stylesheet" href="./mir/css/base.css">
<link rel="stylesheet" href="./mir/css/skin.css">
<!-- the app's own sheets here -->
<link rel="stylesheet" href="./mir/modulation/modhost.css">              <!-- only if the app uses modulation -->
<link rel="stylesheet" href="./mir/modulation/modwindow/modwindow.css">  <!-- and this one LAST: nothing may follow it -->
```

```js
import { knob, seg, trig, device, gripDots } from './mir/kit.js';
import { installControlHelp } from './mir/control-help.js';
```

## The one rule

**Reuse the nodes, the gestures and the CSS. Do not copy their look.** A widget the kit has is built by the
kit's builder and styled by the kit's sheet. When something is missing, add it to MIR (with its law and its
proof) and re-adopt; do not grow a second version inside an app. `PROMPT.md` is the sentence to give a model
starting a new app.

## See it

`npm run gallery` serves `gallery/index.html` on http://127.0.0.1:8790/gallery/ — every token, material and
widget on one page, built from the kit itself, with the card-style, frost and theme switches live.

## Made with

MIR was extracted from λWAVES by AI coding agents (Claude Code with Anthropic's Claude models; parts of the
modulation window by OpenAI's Codex; design reviews by Google's Gemini) under Joshua Hosain's direction. He
is not a programmer and says so; the [λWAVES README](https://github.com/magic-commons/lambdawaves#who-made-this-honestly)
carries the full disclosure — what was decided by hand, what was verified, what was not — and the same terms
apply here. Contributions made the same way are welcome under λWAVES' `AI_POLICY.md`.

## Licence

GNU GPL v3.0 only — © 2026 Joshua Hosain, Magic Commons. Third-party notices ride with the fonts and the
modulation window's provenance notes.
