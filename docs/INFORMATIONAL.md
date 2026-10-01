# MIR · INFORMATIONAL — words on the picture (1.5.x, the first thing to see)

Floating text over the stage, with no window. It says what is on the screen, keeps out of the pointer's way, and points at things with lines that are only ever flat, 45° and vertical. Play with it at `gallery/info.html`. Plan: `MIR CLAUDE 1.5.X INFORMATIONAL + LLM PLAN 2026-10-01.md` §2, §4.

Plates: `docs/plates/informational/dark.png`, `light.png` (1280 × 800; real faces loaded; in the light plate the pointer is top right, so the greeting has crossed to the left).

## The API as built

```js
import { createInfoLayer } from './mir/info/layer.js';      // + link mir/info/faces.css, then mir/info/info.css
const layer = createInfoLayer({ stage, host?, subject?: () => rect, features?: () => [{ id, x, y, r }], style?, follow?, lines?, parallax?, drift? });
layer.addLabel({ anchor, title, md, line? })   // anchor: a feature id, { x, y, r }, or () => { x, y, r }  → { el, id, remove() }
layer.addBlock({ md, hold })            // hold: ms before it may move (the greeting uses 2500)    → { el, id, remove() }
layer.setStyle('auto' | 'diagonal-first' | 'flat-first'); layer.setFollow(on); layer.setLines(on); layer.setEdit(on); layer.freeze(on);
layer.setParallax(on); layer.setDrift(on);
layer.viewChanged();                    // the picture moved: anchors and subject are read again, labels follow on the spring
layer.replay(); layer.clear(kind?); layer.debug(); layer.destroy();
```

- **The two lines are for two jobs** (Josh, 10-01: "could be for different purposes, be sure to use them both").
  - **diagonal-first** names a feature the app knows: thing → 45° → a flat shelf that underlines the name. The default for a titled label on a feature id.
  - **flat-first** is a note: thing → flat → 45° → the text. The default for a label at a place (`{x,y}` or a function), on a control (`ui:`), or with no title.
  - A label may choose with `line`; `setStyle` may force one for all; `'auto'` (the default) lets the job decide. Each label carries `data-line`.
- **Coordinates:** `subject()` and `features()` answer in the stage's own CSS pixels. The layer sits over the stage inside `host` (default: the stage's parent, which must be positioned).
- **Markdown and maths:** `shell/notebook-render.js` (sanitised marked + KaTeX), loaded on first use by `shell/notebook.js` `loadRenderer()`.
- **Pure parts:** `info/leader.js` (`leader`, `comb`, `route`, `toPath`) and `info/bodies.js` (`step`, `resolveRests`, `createRunner`).
- **Lines are one SVG**, with one path per anchor (a halo stroke under the ink) and a dot on the edge.
  - A frame writes one attribute per line, however many joints it has.
  - `pathLength="1"` makes "the line draws outward" a single dash offset, whatever the line's length mid-flight.
  - A stroke stays crisp at 45°; thin rotated divs do not.

## The laws

| Law | As built |
|---|---|
| **The line grammar** | From the edge of the thing (centre + r) to the label's attach point. If \|dx\| ≥ \|dy\|: a 45° run of \|dy\|, then flat. Otherwise: a 45° run of \|dx\|, then vertical. **Diagonal first:** the flat part runs on to underline the title. **Flat first:** the 45° run arrives at the title's near corner. **Comb:** one 45° run, a vertical spine, one flat branch per label. This is legal at every frame, including mid-flight and under the hand |
| **The text side follows the line** | A label whose line arrives from the right is right-aligned. The side flips only once the label's centre has crossed its anchor by 15 % of its width |
| **Against the cursor** | A block rests on the far side of the subject. It changes side after the pointer has crossed the centre line by 8 % of the stage width **and** stayed there 350 ms. With no room beside the subject (a phone), it sits above or below instead |
| **Reaching is not fleeing** | The pointer counts as reaching when it is on the block (+16 px), within 110 px of it, or heading at it within 60° (its speed fades 140 ms after the last move). Reaching never moves the block and lifts it to full strength. The pointer's push on labels uses the same rule: passing by parts them, heading at one pushes nothing |
| **Strength** | Blocks fall to .5 while the pointer is on the subject and not reaching, and to .55 while they cross over. They are at 1 when reached for or held |
| **Hold still** | While Space (or a 480 ms touch press) is held, every body freezes at full strength. The lines still track their anchors |
| **The pin** | The first time a block moves away, a small pin shows on it once (1.9 s) |
| **Following** | `viewChanged()` moves the rests, and the bodies trail on the spring. In steady motion the lag is about 0.11 s × the speed |
| **EDIT** | Labels take the pointer (only then). A dragged label is held: its rest is the hand, and its neighbours yield through the same force step. Dropped, it keeps that place relative to its anchor. Escape or blur rolls it back (`pointer.drag`) |
| **Click-through** | `pointer-events: none` everywhere except labels in EDIT. `elementFromPoint` under a label is the stage (tested) |
| **Idle** | The frame is booked only while a body moves, an entrance is laid out, or the view changed. Once at rest: no rAF, and zero writes, reads and frames (tested over 600 ms) |
| **Ink** | Ink over a soft darkness: a feathered ellipse in the opposite ink under each block of words, and a broad weak blur under the glyphs. No outline, no pane, no box (Josh, 10-01: "way less drop shadow or outline. Let it be a soft darkness underneath") |
| **Parallax** | Everything leans away from the cursor, blocks more than labels, eased; a block being reached for holds its lean. `setParallax(on)`; FOLLOW CURSOR off stops it |
| **Drift** | `drift: true` / `setDrift(on)`: a slow bob per item. While it is on the layer keeps its frame on purpose, so idle is no longer zero work; it is off by default and on in the gallery page (FLOAT) |

## The numbers (retuned 10-01 after Josh's first look: "stronger and smoother, everything moving and floaty")

| What | Number | Feel |
|---|---|---|
| Label spring | k 70 s⁻², ζ 0.6 | ω 8.4 rad/s, ~9 % overshoot (measured 108.7 on a 100 px move), settled in ~0.8 s. Was k 170, ζ 0.72 |
| Block spring | k 34 s⁻², ζ 0.72 | A slow, heavy glide, with a 700 px/s² lift off the subject while crossing it. Was k 95, ζ 0.8 |
| Neighbours | rests 18 px apart (gap); in flight they push only when closer than 2 px (bump), 520 s⁻² per px | The rest pass resolves rest boxes deterministically, 12 passes, blocks fixed. The small bump lets bodies whose leans differ still reach their places |
| Pointer | reach 260 px, 5200 px/s² at contact, (1 − d/260)², heat τ 0.9 s, scaled by 1 − toward² | About 74 px of give at contact, and it lets go slowly. Was 120 px, 4400, τ 180 ms |
| Parallax | lean = −(pointer from the stage's middle, −1…1) × depth: block 38 px, labels 22 / 26 / 30 px; eased with τ 0.28 s; ×0.7 vertically | The lean is clamped so it never asks for a place beyond the walls |
| Drift | block 5 px, labels 3.5 px, periods about 8–14 s, each item its own phase | |
| Walls | 10 px in, 900 s⁻² per px | |
| Stop | every \|v\| < 6 px/s and every \|x − target\| < 0.4 px, else 300 frames per disturbance | Then every body is snapped exactly onto its target (rest + lean). Never while drift is on |
| Label offset | out = escape from the subject + 46 + r; rise = 34 + min(40, 0.2·escape) | Comb members stack 14 px apart |
| Block seat | 36 px from the subject, centred on it | |
| Entrance | dot 140 ms (spring) · line from 60 ms over 260 ms (ease-out) · text from 200 ms, 30 ms per line (spring, k 300 c 22, ~330 ms, as CSS `linear()`) · labels stagger 55 ms outward from the subject (max 5) | About 0.7 s for a screenful |
| Exit | text 120 ms · line from 70 ms over 120 ms · dot 90 ms, ease-in, 25 ms stagger | About 0.3 s |
| Reduced motion | an opacity fade, 120 ms; bodies jump to rest; the pin only fades | |
| Type | body clamp(14px, 8px + .68cqi, 18px) · label clamp(13px, 7.5px + .6cqi, 16.5px) · title clamp(16px, 9px + .8cqi, 22px) · # clamp(26px, 13px + 2.3cqi, 48px) · ## clamp(18px, 10px + 1cqi, 28px) · lh 1.45 · label measure 22em, block 23em (≤ 42cqi) | Spectral, Playfair Display 700 (# centred, label titles side-aligned), Alegreya SC links, through `mir/info/faces.css` |

## What I would tune next

1. **A seat chooser under the force.** A clicked label can be pushed between two members of a comb, so its line crosses the spine (visible in both plates). Plan §2.6 foresaw this: "if labels end up overlapping in practice, a simple chooser of resting places is added underneath". The rest pass keeps boxes apart, but it does not yet keep lines from crossing or a comb's members together.
2. **Phone.** It works (the block takes a vertical seat), but it is crowded. Labels want a smaller measure there.
3. **The nucleus line** must cross the subject to reach the edge. An anchor inside the subject might prefer the 45° run toward the nearest free side.
4. **Label titles are side-aligned, not centred.** Centring them over a shelf reads badly beside a leader. `#` in a block is centred, per the law.

## Not built yet

- **Pages** (project pages and your shelf, the greeting as page 0), and the callout syntax `> [!mir|anchor]`.
- **Anchors from apps:** BASINS' nucleus candidates, `@place` coordinates in an app's own space, and `ui:` control anchors (coach marks).
- **Ink modes:** AUTO per label, INVERT, THRESHOLD. The layer root is a size container, and so a stacking context. A difference blend must therefore go on the root (draft 1 §1.6, measured).
- **The INFORMATIONAL rack window**, slides and tours, the decade ruler, and UI rects to avoid (the rack, the transport). The gallery shrinks its stage above the controls on a phone in place of the last.

## Proofs

- `tests/info-leader.node.mjs`: 8,000 random leaders in both styles and 3,000 combs. Every segment is 0°, 45° or 90°, each path is connected, starts on the edge and ends at the label.
- `tests/info-bodies.node.mjs` (15 checks): rest is exact; overlapping bodies separate; the rest pass leaves no overlap; the energy cut-off; the 90-frame cap and its reset; the pointer parts but a reach does not; a held body does not yield; reduced motion; walls.
- `tests/info.browser.mjs` on `tests/fixtures/info.html` (20 checks, real pointer): the far side after the dwell and not before; the pin; reaching never moves the block; a dragged line is legal at 44 sampled frames and the neighbour yields; the drop is kept; following lags and lands exactly; reduced motion is a fade; Space holds; click-through; the idle law.
- Not proven here: touch (long press, avoiding fingers), WebKit and the iPad, and how it looks over a WebGPU canvas.
