# MIR · INK — each label white or black from the picture beneath it

**Adaptive ink** keeps the labels of a glass interface legible over a live picture without touching the glass. Under REFRACTIVE (or FROST), each small thing in the interface — a label, a knob face, a chip, a button — is given white or black ink from what is actually under it: the picture there, seen through every pane between the two.

Josh, 2026-09-18: *"can we just have the text simply invert the color underneath and bias towards darkness and lightness depending on which is underneathe? I don't want too much of a tint on the glass … I just fucking asked to change the text color not the glas."* It is BASINS' `adaptive-ink.js` and `ink.css` §1, moved into the kit (`mir/core/ink.js`, the seats in `mir/css/skin.css`). The app keeps one thing: the sampler of its own picture.

## How an app uses it

```js
import { createInkSampler, canvasSample } from './mir/core/ink.js';
import { createGui } from './mir/shell/gui.js';

// 1. hand the kit a small grid of the picture's luma (0…1), and say where it is on screen
const ink = createInkSampler({
  sample: () => ({ luma, w: 64, h: 36 }),   // or a Promise of it; a 2D canvas can use canvasSample(canvas)
  stage: canvas,                            // the element the picture is drawn in (its box is the sample's box)
  skip: '#banner, #warnPane',               // things that are never a label (optional)
});

// 2. the GUI window's TEXT row drives it: AUTO samples, LIGHT and DARK stop it
const gui = createGui({ host, inkSampler: ink });

// 3. say when the picture changed; the kit takes at most 4 samples a second
engine.onPresent(() => ink.update());
```

BASINS' sample is a 64 × 36 read of its present pass on the GPU, four times a second; that stays the app's. An app with a 2D canvas (or an image, or a video) uses `canvasSample(source)`, which draws the source into a 64 × 36 grid and reads it back.

## What the kit does

| Step | What happens |
|---|---|
| **The cells** | The page is walked, not listed, so a window that opens tomorrow is covered. A thing at most 300 × 72 px is one cell, unless it holds faces of its own (a strip holding a card holding a button): then the walk goes in and each face becomes a cell. A big surface that prints text of its own is a cell, and so is a text field with text in it. Hidden boxes, things off screen, `script`, `style`, `option`, the inside of an `svg`, the kit's toast, `[data-ink-skip]` and the app's `skip` list are never cells |
| **The ground** | The mean luma of the sample under the cell (grown by 10 px under FROST, which blurs that far), with every fill between the picture and the label laid over it, outermost first. A pale .86 card over a black picture is a light ground. A fill on something that holds the picture is under it and is ignored. A `::before` of 12 px or more that has content is a face (a chip's disc) |
| **The bias** | ground < .45 → white · ground > .55 → black · between, the cell keeps what it had. A first look takes the nearer pole |
| **The hysteresis** | A flip has to be seen twice running, so a moving or modulated picture does not make the labels flicker |
| **The ink** | `data-ink="w"` or `"k"` on the cell, `data-ink-live` on `<body>` while it runs. `skin.css` declares the whole pure ladder again on the cell (1 · .96 · .86 · .82 · .70 for `--fg`, `--fg-soft`, `--ink-key`, `--dim`, `--ink-faint`, and the modulation window's `--m2-ink` rungs), so every colour written as a token re-resolves beneath it |

## The laws

| Law | How it is kept |
|---|---|
| The glass is Josh's | One attribute per label and nothing else: no fill, no veil, no blend mode, no text shadow. `tests/ink.browser.mjs` compares the pane's computed fill, image and filter before and after a flip |
| The accents never flip | `--acc`, `--acc2`, `--ok`, `--warn`, `--bad` never read the cell's ink |
| The gate | REFRACTIVE, or FROST on a pane that is not SOLID. A TINTED pane with FROST off is an opaque pane with the ordinary ink: no sample, no attribute. The gate is read from `<body>` and followed by a MutationObserver, so a change of card style, frost or theme turns it on or off at once |
| TEXT · LIGHT · DARK | `mode('off')`: no sample is taken (the answer is chosen) and every cell is cleared; the kit's `body[data-text]` seats say the ink |
| No poller | A sample only when the app calls `update()`, at most `hz` (4) times a second, one one-shot timer keeping the trailing edge. A scroll, a release or a key re-walks the cells against the last sample once, 140 ms later. Nothing runs while the document is hidden or `body.ui-hidden` is set |
| One frame | The cell walk and every ground are read in the frame core's read phase (`core/frame.js`), the attributes written in its write phase |
| Why not a blend mode | `mix-blend-mode: difference` cannot reach the canvas through a stacking context, and every pane is one (BASINS measured a colour-burn trial pixel-identical, 2026-09-16) |

## The API

`createInkSampler({ sample, doc, stage, skip, hz, law, frame })` → `{ update(), poke(), mode(m?), tick(), explain(el), state(), stat, destroy() }`

- `sample()` → `{ luma: Float32Array (0…1, row by row), w, h, rect? }`, or a Promise of it. `rect` is the screen box the grid covers; default: `stage`'s box, else the viewport.
- `update()` — the picture changed: sample at most `hz` times a second.
- `poke()` — something opened, closed or changed: walk the cells again now against the last sample, and ask for a new one.
- `mode('auto' | 'off')` — the GUI window sets it from TEXT; with no argument it says the mode.
- `tick()` — sample now, ignoring the cadence (a test, a one-off).
- `explain(el)` — why a label wears its ink: `{ cell, box, picture, fills, ground, ink, pending }`.
- `state()` / `stat` — samples, fails, cells, white, black, flips, sample and walk times, whether it is on.

Pure, for tests: `INK` (BASINS' numbers: the 64 × 36 grid, 4 Hz, .45 / .55, 300 × 72, the 10 px frost reach), `parseFill`, `over`, `paintOf`, `summedArea`, `meanUnder`, `groundOf`, `decide`, `walkCells(root, io, { vw, vh, keep })`, `domIO(doc, { skip, stage })`. `canvasSample(source, { w, h })`.

## What BASINS can delete

`app/adaptive-ink.js` except its GPU read (`targets()` and the copy in `sample()`), which becomes the `sample` it hands `createInkSampler`; its `setInterval` and listeners go with the rest. From `app/ink.css`: §1's body, forced and sampled seats, and §3a. §3b, the 35 generated rungs, goes once the modulation window's own text seats carry the rungs too (asked of the modulation host sheet).

## Proofs

- `tests/ink.node.mjs` — the arithmetic, the ground, the bias and the hysteresis, and the walk over a fake page with a fake `sample`.
- `tests/ink.browser.mjs` — a two-tone canvas under a REFRACTIVE pane: white over black, black once the picture turns white and the flip is seen twice, the pane's computed fill and filter unchanged, no text shadow; TEXT · LIGHT and AUTO by real clicks.
- **Not proved:** WebKit and a real iPad; BASINS' GPU sample through this sampler (BASINS has not adopted it yet); the cost of the walk on BASINS' full interface (BASINS measured its own walk; this one is the same code).
