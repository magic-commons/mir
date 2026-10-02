# MIR · INFORMATIONAL — words on the picture

Floating text over the stage, with no window. It says what is on the screen, keeps out of the pointer's way, and points at things with lines that are only ever flat, 45° and vertical. The words come from **pages**: plain markdown files, the same ones the notebook shows as tabs. Play with it at `gallery/info.html` (its pages are in `gallery/pages/`). Plan: `MIR CLAUDE 1.5.X INFORMATIONAL + LLM PLAN 2026-10-01.md` §2, §4.

Plates (1280 × 800, real faces loaded), in `docs/plates/informational/`:

| Plate | What it shows |
|---|---|
| `greeting.png` | page 0, the greeting, shown as it is |
| `dark.png` | a page with four labels: three features and a place (`@0.39+0.68i`, the waist) |
| `dark-flat-first.png` | the same page with LINE: FLAT forcing every line flat-first |
| `light.png` | the same page in the light theme, the pointer top left so the blocks have crossed to the right |
| `pane-ui.png` | a page on a glass pane (PANE), with two labels pointing at controls in the strip (`ui:float`, `ui:page-next`) |

## A page

A page is a plain markdown file. It still reads well in Obsidian, because a label is an Obsidian callout:

```md
## The trefoil
A closed curve whose radius swells three times in every turn.

$$r(\theta) = R\,\bigl(1 + \varepsilon\cos 3(\theta - \varphi)\bigr)$$

---

Turning it by $2\pi/3$ gives the same curve.

> [!mir|nucleus] The centre
> The one point every symmetry fixes, $z = 0$.

> [!mir|@0.39+0.68i flat] The waist
> Between two lobes the radius dips to $R(1 - \varepsilon)$.

> [!mir|ui:float] FLOAT
> Each word bobs on its own slow cycle.
```

| Part | Rule |
|---|---|
| **Block text** | Everything that is not a label. A `---` on a line of its own starts a new block; the blocks of a page stand in one column beside the subject, in reading order |
| **A label** | `> [!mir|anchor]`, then an optional title on the same line, then the body on the following `>` lines |
| **The anchor** | A **feature** the app names (`nucleus`); a **place** in the app's own coordinates (starts with `@`: `@-0.7453+0.1127i`, `@51.48,-0.00`); a **control** (`ui:zoom-knob`) |
| **The line word** | One optional word after the anchor: `flat` (or `flat-first`) or `diagonal` (or `diagonal-first`). Without it the job decides (below). Any other word is ignored |
| **Other callouts** | `> [!note]`, `> [!tip]` … are ordinary prose and stay in their block |
| **Maths and markdown** | Pass through untouched; the layer renders them (sanitised marked + KaTeX) |
| **Also accepted** | CRLF line ends, a byte-order mark, Obsidian's properties (front matter) at the very top. Fenced code is never read for labels or rules |

There is no tutorial, guide or tour machinery, and no title card. A guide is whatever someone writes in their pages (Josh: "That's what the multiple pages are for which are really just different .mds"). The **greeting** is only a position: page 0, shown when the project opens if it has text and its switch is on (`pages.shouldGreet()`).

## The API as built

```js
import { createInfoLayer } from './mir/info/layer.js';      // + link mir/info/faces.css, then mir/info/info.css
import { showPage, greet, parsePage } from './mir/info/page.js';
import { createPages, pageFromFile } from './mir/shell/pages.js';

const layer = createInfoLayer({ stage, host?, subject?: () => rect, features?: () => [{ id, x, y, r }],
  style?, follow?, lines?, parallax?, drift?, pane?, controls? });

const shown = showPage(layer, page, { place?, controls?, pane?, hold? });   // page: a pages row, a markdown string, or parsePage(md)
shown.clear();                                   // → a promise, once its exit has landed
const g = greet(layer, pages, { hold: 2500, onDismiss?, place?, controls?, pane? });   // → { shown, dismiss() }

parsePage(md) → { blocks: [{ md }], labels: [{ anchor, kind: 'feature' | 'place' | 'control', line, title, md }] }

layer.addLabel({ anchor, title, md, line?, control? })   // anchor: a feature id, 'ui:name', { x, y, r }, or () => { x, y, r } | null
layer.addBlock({ md, hold, pane? })                      // pane: true / false; omitted → the layer's default
layer.setPane(on); layer.setStyle('auto' | 'diagonal-first' | 'flat-first'); layer.setFollow(on); layer.setLines(on);
layer.setEdit(on); layer.freeze(on); layer.setParallax(on); layer.setDrift(on);
layer.viewChanged();                    // the picture moved: anchors, places and controls are read again
layer.replay(); layer.clear(kind?); layer.debug(); layer.destroy(); layer.root; layer.stage;
```

- **One page at a time.** `showPage` remembers the page a layer shows. Showing another runs the old page's exit, then the new page's entrance. Labels an app added itself (`addLabel`) are never touched by it.
- **Places.** The app passes `place(text) → { x, y, r } | null` in stage CSS pixels; `text` is the anchor without its `@`. It is asked again on every `viewChanged()`. Labels on the same place text share one line (a comb).
- **Features.** A feature id is looked up in `features()` on every view change, as before.
- **Controls.** `ui:name` is the element with `data-info~="name"` (a space-separated list, so one element can carry several names), else `id="name"`, anywhere in the document. `controls` (on the layer, on `showPage`, or `control` on one label) narrows that: a node to search inside, or a function `name → element`.
- **The greeting** holds still for `hold` ms (2500 by default). It leaves on Escape, or on the first pointer press on the stage once the hold is over. The layer is click-through, so that press still reaches the app. If another page replaces it first, `dismiss()` only stops listening.
- **Coordinates:** `subject()`, `features()` and `place()` answer in the stage's own CSS pixels. The layer sits over the stage inside `host` (default: the stage's parent, which must be positioned).
- **Pure parts:** `info/page.js` (`parsePage`), `info/seats.js` (the seat chooser), `info/leader.js` (`leader`, `comb`, `route`, `toPath`), `info/bodies.js` (`step`, `resolveRests`, `createRunner`).

### How a control is reached (the decision)

A control usually sits outside the stage, in a window or the rack, and those paint over the stage. So **the label stays on the stage and its line goes on a second root**:

- **The overlay** (`.mir-info.mir-info-over`) is created the first time a `ui:` label is added. It is `position: fixed` over the whole window, above the chrome (`z-index: calc(var(--z-banner) + 4)`), and `pointer-events: none`. It holds one SVG, translated by the stage's offset, so a control's path is in stage pixels like every other line and keeps the same grammar.
- **The label** is a word on the picture: it rests inside the stage's walls. A control's seats are straight above or below it, toward the stage's middle first. A seat beside it would sit on the bar or window the control lives in, which the layer cannot see.
- **Following it, with no poller.** A control is read again:
  - on every `viewChanged()`;
  - on any `style`, `class`, `hidden` or `open` change outside the layer (a window dragged or folded, the rack scrolled), through one MutationObserver on `<body>`;
  - at the end of a transition or an animation;
  - on scroll.

  The watcher exists only while a `ui:` label does, and it ignores the layer's own writes, so a page at rest stays at zero work (tested).
- A control that is gone (removed, `display: none`, zero size) hides its label and line.

## The laws

| Law | As built |
|---|---|
| **The line grammar** | From the edge of the thing (centre + r) to the label's attach point. If \|dx\| ≥ \|dy\|: a 45° run of \|dy\|, then flat. Otherwise: a 45° run of \|dx\|, then vertical. **Diagonal first:** the flat part runs on to underline the title. **Flat first:** the 45° run arrives at the title's near corner. **Comb:** one 45° run, a vertical spine, one flat branch per label. This is legal at every frame, including mid-flight and under the hand |
| **A line never crosses words** | A leader never runs through a block of words: not its own label's title or body, not another label's, not a block's. A line that arrives vertically keeps 16 px from the words it passes (6 px of pad plus 10 px of clearance, eased in as the arrival turns vertical, so the line never jumps mid-flight). It crosses the subject only when no seat avoids it, and then by the shortest way out. The line ends beside the title on the side facing the anchor, and the text grows away from it. The chooser enforces this; it is proven on every gallery page in both themes, bare and on a pane |
| **Two lines, two jobs** | **diagonal-first** names a feature the app knows (a titled label on a feature id). **flat-first** is a note: at a place, on a control, or with no title. The callout's line word, `addLabel({ line })`, or `setStyle` (for all) overrides it. Each label carries `data-line` |
| **The seat chooser** | Under the force, a small chooser picks which side of its anchor a label (or a comb) rests on. See "The seat chooser" below |
| **Gone** | An anchor that resolves to null, or a feature or place outside the stage, hides its labels and line (`data-gone`). Hidden labels take no part in the force. When the anchor returns, they land on their seats rather than flying in. A control is never "off the stage" (it usually is), only gone when it is |
| **The text side follows the line** | A label whose line arrives from the right is right-aligned. The side flips only once the label's centre has crossed its anchor by 15 % of its width |
| **Against the cursor** | A block rests on the far side of the subject. It changes side after the pointer has crossed the centre line by 8 % of the stage width **and** stayed there 350 ms. With no room beside the subject (a phone), it sits above or below instead |
| **Reaching is not fleeing** | The pointer counts as reaching when it is on the block (+16 px), within 110 px of it, or heading at it within 60° (its speed fades 140 ms after the last move). Reaching never moves the block and lifts it to full strength. The pointer's push on labels uses the same rule: passing by parts them, heading at one pushes nothing |
| **Strength** | Blocks fall to .5 while the pointer is on the subject and not reaching, and to .55 while they cross over. They are at 1 when reached for or held |
| **Hold still** | While Space (or a 480 ms touch press) is held, every body freezes at full strength. The lines still track their anchors |
| **The pin** | The first time a block moves away, a small pin shows on it once (1.9 s) |
| **Following** | `viewChanged()` moves the rests, and the bodies trail on the spring. In steady motion the lag is about 0.11 s × the speed |
| **Travelling bodies pass through** | A free body more than 48 px from home is travelling, and two travelling bodies do not push each other (a held body still pushes everything, so a carried label's neighbours yield). Without this, two labels whose seats swap, or a label crossing a column of blocks, wedge against each other for good |
| **EDIT** | Labels take the pointer (only then). A dragged label is held: its rest is the hand, and its neighbours yield through the same force step. Dropped, it keeps that place relative to its anchor, and the chooser seats everyone else around it. Escape or blur rolls it back (`pointer.drag`) |
| **Click-through** | `pointer-events: none` everywhere (the overlay too) except labels in EDIT. `elementFromPoint` under a label is the stage, and under a control's dot is the control (tested) |
| **Idle** | The frame is booked only while a body moves, an entrance is laid out, or the view changed. Once at rest: no rAF, and zero writes, reads and frames (tested over 600 ms, also with a page and a live `ui:` label) |
| **Bare or on a pane** | Bare is the default: ink over a soft darkness (a feathered ellipse in the opposite ink under each block of words, and a broad weak blur under the glyphs), no outline, no box. **On a pane** (`addBlock({ pane: true })`, `showPage(…, { pane })`, or `setPane(on)` for every block that did not choose): the same type on INTENT's "a pane floats" (`--surface-fill`, `--surface-sheen`, `--surface-edge`, `--surface-edge-width`, `--surface-radius`, `--surface-shadow`, each read with its 1.4 fallback), with no shade and no glyph halo. **TINTED** never blurs; **REFRACTIVE** carries the blur (`--surface-filter`, falling back to `--frost-filter`) on `--surface-veil` |
| **Phone** | Under 560 px of stage width (a container query on the layer), a label's measure drops from 22em to 13em |
| **Parallax** | Everything leans away from the cursor, blocks more than labels, eased; a block being reached for holds its lean. `setParallax(on)`; FOLLOW CURSOR off stops it |
| **Drift** | `drift: true` / `setDrift(on)`: a slow bob per item. While it is on the layer keeps its frame on purpose, so idle is no longer zero work; it is off by default and on in the gallery page (FLOAT) |

## The seat chooser

Plan §2.6 said: "if labels end up overlapping in practice, a simple chooser of resting places is added underneath. One system before two." They did (a label pushed between a comb's members crossed its spine), so `info/seats.js` is that chooser. The force still moves the bodies; the chooser only decides where home is.

- **Judged where it will sit.** Each seat's labels are first pushed inside the walls, exactly as their rests will be. A seat whose label a wall would push back across its own anchor is a seat whose line runs through its own words, and the score sees it.
- **The seats.** An anchor outside the subject gets the four quadrants beside it (`h`: a 45° run, then flat). An anchor inside the subject's box gets those four plus four straight above or below it (`v`: a 45° run, then vertical), so it can leave by the nearest free edge. A control gets only the four above or below.
- **The order.** Labels the hand placed are seated first (they do not move). The rest follow by how deep their anchor lies inside the subject's box, in 40 px steps so the order never shuffles while the view moves. An anchor near an edge has one short way out; the one in the middle can leave by any edge, so it chooses last.
- **The score** (lower is better). Each seat is scored against the blocks, the anchors, the subject's box, and the labels and lines already seated.

  | Term | Weight |
  |---|---|
  | A crossing: its line through another line, through any label's words (its own too) or a block (each grown by 3 px), or another line through its label | 100 000 each |
  | Pushed back inside the walls (a seat that does not really exist) | 1000 × the px |
  | Overlap with a block, a label, an anchor or the subject (boxes grown by 6 px) | 3 × the area |
  | Outside the walls | 6 × the area |
  | Its line inside the subject | 90 × the length |
  | Not the natural seat | + 800 |
  | The seat it has now | − 2500 |

- **Sticky.** A group keeps its seat while that seat is out of trouble: the score without the two preferences stays under 6000. A seat that changed holds for 1.4 s, so its label lands before it may move again.
- **Measured in the gallery.** On the trefoil, with four labels on a turning shape, about six seat changes in 15 s. Before the order and the hold were fixed, labels flip-flopped and wedged.

## The numbers (retuned 10-01 after Josh's first look: "stronger and smoother, everything moving and floaty")

| What | Number | Feel |
|---|---|---|
| Label spring | k 70 s⁻², ζ 0.6 | ω 8.4 rad/s, ~9 % overshoot (measured 108.7 on a 100 px move), settled in ~0.8 s. Was k 170, ζ 0.72 |
| Block spring | k 34 s⁻², ζ 0.72 | A slow, heavy glide, with a 700 px/s² lift off the subject while crossing it. Was k 95, ζ 0.8 |
| Neighbours | rests 18 px apart (gap); in flight they push only when closer than 2 px (bump), 520 s⁻² per px; not at all while either is travelling (> 48 px from home) and neither is held | The rest pass resolves rest boxes deterministically, 12 passes, blocks fixed. The small bump lets bodies whose leans differ still reach their places |
| Pointer | reach 260 px, 5200 px/s² at contact, (1 − d/260)², heat τ 0.9 s, scaled by 1 − toward² | About 74 px of give at contact, and it lets go slowly. Was 120 px, 4400, τ 180 ms |
| Parallax | lean = −(pointer from the stage's middle, −1…1) × depth: block 38 px, labels 22 / 26 / 30 px; eased with τ 0.28 s; ×0.7 vertically | The lean is clamped so it never asks for a place beyond the walls |
| Drift | block 5 px, labels 3.5 px, periods about 8–14 s, each item its own phase | |
| Walls | 10 px in, 900 s⁻² per px | |
| Stop | every \|v\| < 6 px/s and every \|x − target\| < 0.4 px, else 300 frames per disturbance | Then every body is snapped exactly onto its target (rest + lean). Never while drift is on |
| Label offset | out = escape from the subject + 46 + r; rise = 34 + min(40, 0.2·escape). Above or below (`v`): 23 + r across, and out of the subject's edge + 34 (a control: r + 68, and the whole label clears it) | Comb members stack 14 px apart |
| Block seat | 36 px from the subject, centred on it; a page's blocks stack 18 px apart | |
| Seat hold | 1.4 s after a seat changes | |
| Line clearance | 6 px (pad) beside a title; + 10 px when the line arrives vertically past the body | |
| Entrance | dot 140 ms (spring) · line from 60 ms over 260 ms (ease-out) · text from 200 ms, 30 ms per line (spring, k 300 c 22, ~330 ms, as CSS `linear()`) · labels stagger 55 ms outward from the subject (max 5) | About 0.7 s for a screenful |
| Exit | text 120 ms · line from 70 ms over 120 ms · dot 90 ms, ease-in, 25 ms stagger | About 0.3 s |
| Gone | opacity out over `--motion-ui`, then hidden | |
| Reduced motion | an opacity fade, 120 ms; bodies jump to rest; the pin only fades | |
| Type | body clamp(14px, 8px + .68cqi, 18px) · label clamp(13px, 7.5px + .6cqi, 16.5px) · title clamp(16px, 9px + .8cqi, 22px) · # clamp(26px, 13px + 2.3cqi, 48px) · ## clamp(18px, 10px + 1cqi, 28px) · lh 1.45 · label measure 22em (13em under 560 px), block 23em (≤ 42cqi) | Spectral, Playfair Display 700 (# centred, label titles side-aligned), Alegreya SC links, through `mir/info/faces.css` |
| Pane | padding .85em 1.15em .95em (`--info-pane-pad`) | |

## What I would tune next

1. **A crowded page still compromises.** The chooser picks the least bad seat, so with five labels and two blocks round a small subject a line may run across the subject (the waist in `dark.png`). More seats per anchor (a second ring farther out) would help. A page with fewer labels is the honest fix.
2. **Phone.** Labels take the shorter measure, but a page with two blocks and four labels does not fit a 390 px stage. A display formula wider than the block runs past the stage's edge.
3. **UI rects to avoid.** The layer cannot see the app's bars and windows. A control's label avoids its own bar by sitting above or below it, but a label from elsewhere can still rest under a window.
4. **Label titles are side-aligned, not centred.** Centring them over a shelf reads badly beside a leader. `#` in a block is centred, per the law.

## Not built yet

- **Ink modes:** AUTO per label, INVERT, THRESHOLD. The layer root is a size container, and so a stacking context; a difference blend must therefore go on the root (draft 1 §1.6, measured).
- **The INFORMATIONAL rack window** (SHOW, the page picker, INK, SIZE, ADD LABEL, the label list).
- **Slides and tours** (a page as a slide, info clips on the timeline), and **the decade ruler**.
- **Paste `$…$` onto the stage** as a kit feature. The gallery page does it in its own script.
- **The `shared` eye** (a page a visiting model may read). The pages model carries it; the notebook draws it on its tabs.
- **BASINS' nucleus candidates** as features. The anchors are ready for them.
- **UI rects to avoid** (the rack, the transport).

## Proofs

- `tests/info-page.node.mjs` (12 checks): `parsePage` over labels with and without titles, the line word, the three anchor kinds, other callouts left alone, `---` splitting (and not inside a fence), maths untouched, CRLF, a BOM and front matter, a leading rule that is not front matter. The chooser: the geometry, the natural seat kept when free and left when a comb is in the way, stickiness, an anchor inside the subject leaving by the shorter way.
- `tests/info-words.browser.mjs` on `gallery/info.html?still` (13 checks): checks every page, bare and on a pane, in both themes, once at rest. No leader segment, on the stage or the overlay, runs through any label's or block's words (real rects, real paths through `getScreenCTM`). A vertical run beside words keeps at least 10 px. Run against the previous build it fails on the two cases it was written for: "Next page" (28 px through its own sentence) and "The centre" (7 px from its own body). `?still` stops the picture's clock and the drift so the bodies rest.
- `tests/info-leader.node.mjs`: 8,000 random leaders in both styles and 3,000 combs. Every segment is 0°, 45° or 90°, each path is connected, starts on the edge and ends at the label.
- `tests/info-bodies.node.mjs` (17 checks): rest is exact; overlapping bodies separate; the rest pass leaves no overlap; the energy cut-off; the cap and its reset; the pointer parts but a reach does not; a held body does not yield; reduced motion; walls.
- `tests/info.browser.mjs` on `tests/fixtures/info.html` (21 checks, real pointer): the far side after the dwell and not before; the pin; reaching never moves the block; a dragged line is legal at 44 sampled frames and the neighbour yields; the drop is kept; following lags and lands exactly; reduced motion is a fade; Space holds; click-through; the idle law; lines by job.
- `tests/info-pages.browser.mjs` on `tests/fixtures/info-pages.html` (14 checks, real pointer and keys):
  - a page with a feature, a place and a `ui:` label shows all three with legal lines;
  - the control's line is on the overlay, its dot on the knob in a rack outside the stage;
  - the `ui:` label follows its control when the control moves, with no call from the app;
  - a place off the stage hides its label and line, and they come back on their seat;
  - switching page leaves no node of the old page;
  - PANE has a background and BARE none; TINTED does not blur and REFRACTIVE does;
  - the greeting shows only when `shouldGreet()`, survives a press during its hold, and leaves on Escape or on a press after the hold;
  - click-through holds; the idle law holds with a `ui:` label live.
- **Not proven:**
  - touch (long press, avoiding fingers), WebKit and the iPad;
  - how it looks over a WebGPU canvas;
  - a control inside a real kit window being dragged (the fixture moves a plain button by its style, which is the same signal a window drag gives).
