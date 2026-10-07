# Icons — one library, `mir/glyph.js`

Every icon in the kit and in the apps on it is a name in `mir/glyph.js`. One drawing per meaning, drawn in `currentColor`
on a 24-unit box, so an icon takes the ink of the button it sits in (and the accent when the button is ON). The page
`gallery/icons.html` shows every one at 16, 24 and 64 px on a dark ground and a light one.

```js
import { glyphEl, glyphSvg, setGlyph, hasGlyph, glyphNames } from './mir/glyph.js';

button.appendChild(glyphEl('undo', 'gly', 16));            // an <svg> element, 16 px
tray.innerHTML = glyphSvg('upload', 'gly', 16);            // the same as markup
setGlyph(playButton, paused ? 'play' : 'pause', { label: 'Play or pause', size: 20 });   // a toggling button: swap the drawing and its name together
```

An unknown name draws nothing, warns once and never throws. An icon button has no text, so its accessible name goes through
`setGlyph`'s `label` (translated) or `ariaLabel()`; the drawing is `aria-hidden`.

## Rules an app follows

- Reach for a name here before drawing anything. If the meaning exists, use its glyph: a second drawing of power, play,
  close or a pencil is a defect. If it does not, add it to `glyph.js` (see "Adding one") rather than inlining an `<svg>` in your module.
- Never a font character (`× ▶ ‹ › ▾ ★ ⠿ ⧉`) or the CSS pseudo-elements that stand in for one: iOS paints half of those as colour
  emoji and every font sets their size and baseline differently.
- Words stay words. `+ ADD` is a label with a plus in it; the library is for the mark that has no text.
- The icon takes its size from the caller (`size`, or a sheet's `width`/`height`, which wins) and its colour from `color`.

## The set

| name | the meaning | notes |
|---|---|---|
| **window and rack** | | |
| `close` | dismiss, delete this one | the cross of a close chip |
| `leave` | minimise: hide the window, keep its controls | the close chip's other face; NOT `minus` |
| `reopen` | the Leave-Chips square: the next tap brings the window back | |
| `popOut` | **leave the rack**: take this window or bar out | solid arrow, up and right; was `north` |
| `dock` | **go into the rack**: put it back | `popOut` turned 180°; never use `popOut` for docking |
| `grip` | drag handle, six dots | |
| `gripDots` | Josh's 5×5 reorder handle, nine dots | the same idea as `grip`; both kept until Josh says which goes |
| `move` | the four-way cross: drag onto a control to route it | the modulation window's routing grip |
| `compact`, `expand` | a bar narrows to its middle / opens out | two faces of one chip |
| `barsTop`, `barsBottom` | the work-bar lane: two bars at the top or the bottom edge | |
| `lanes` | timeline lanes: clips staggered on rows | |
| `more` | three dots in a row: MORE, the tools that do not fit and the actions with no seat of their own | the timeline work bar's ⋯ (a trigger, no lamp; always on the bar, so it never moves) |
| **transport** | | |
| `play`, `pause` | solid, same visual mass so the button does not change weight when it toggles | |
| `stop`, `record` | solid square, solid disc | |
| `rewind` | to the start: a bar and a triangle | BASINS' and λWAVES' |
| `loop` | repeat | |
| `power` | on / off, and modulation's POWER: a faint halo, the ring open at the top, the stem | BASINS' drawing; carries the classes `mir-power-halo`, `-ring`, `-stem` the motion rules use |
| `dirPrev`, `dirNext` | direction: small solid triangles | for a DIR chip, not for steppers: use the chevrons |
| **step and fold** | | |
| `chevronUp`, `chevronDown`, `chevronLeft`, `chevronRight` | fold carets and stepper arrows (‹ ›) | `chevronDown` is the fold caret every window turns |
| `plus`, `minus` | add one / remove one, step a value | a matched pair; `minus` is BASINS' timeline minus |
| `check` | done, chosen | |
| `clear` | the backspace tablet: clear the field | |
| **edit** | | |
| `undo`, `redo` | one step back / forward in history | |
| `duplicate` | copy this | |
| `rename` | a pencil: rename a saved entry | |
| `edit` | the timeline's EDIT tool, a pencil with ticks | BASINS' drawing; a second pencil, see "Open" |
| `select`, `scrub` | the timeline's SELECT (two dashed squares) and SCRUB (arrows round a dotted playhead) tools | BASINS' drawings |
| `swap` | exchange one surface with another | |
| `tune` | a crossed circle: the operator that adds a motif into a copy | |
| `lock` | locked | |
| `eye`, `eyeShut` | shown / hidden, shared / private | |
| **files** | | |
| `folder`, `saveFolder` | a folder; save into a folder | |
| `save`, `download`, `upload` | save; take out of the app; bring in | |
| `projectFile`, `gallery`, `bulletList` | a project file; the contact sheet (four panes); a list | |
| `link` | a link, a shared URL | |
| **find and set** | | |
| `search` | find | |
| `settings` | a cog | |
| `home` | home, reset the view | |
| `info` | about this | |
| `star`, `starFill` | not a favourite / is one | |
| `mute`, `solo` | a struck-through speaker; headphones | the drawing never changes, a lamp or the ON face shows the state |
| `sliders` | a control panel: three horizontal sliders | |
| `invertColors` | INVERT: a half-filled disc | |
| **state** | | |
| `dot`, `pending`, `warn` | settled, in progress (dashed ring), a problem | share one centre so a card whose state changes does not jump |
| **view and camera** | | |
| `camera` | a picture is taken here, or the camera window | |
| `compassNorth` | a camera's NORTH: a ring and a needle, north half solid | |
| `cameraOrbit` | orbit the camera: an arrowed ring round a centre | |
| `xy` | an XY pad: a frame with a dot and its two guides | |
| `curves` | a curves editor: axes, an S-curve, two handles | |
| `grade` | colour grade: three vertical sliders | `sliders` turned upright with different stops |
| `morph` | one period of a sine, the LFO's own shape | |
| `render` | render: a diamond inside a diamond | |
| **the apps' own marks** | | |
| `mandelbrot`, `mandelbrotSmall`, `juliaRestore` | the fractal's marks (solid) | the one place the library carries an app's art |

### Old names that still draw

| old | draws | until |
|---|---|---|
| `north` | `popOut` | a later kit flips `north` to the compass (`compassNorth`) once the apps' own racks say `popOut`. Do not use `north` in new code. |

`glyphAliases()` lists them; `glyphNames()` does not.

## The style, in numbers

Measured on the 41 glyphs the library had, kept by all that follow:

| | |
|---|---|
| box | `viewBox="0 0 24 24"`. Read at 16 px (1.27 px strokes), 20 px (the default) and 26 px (rail chips) |
| stroke | 1.9 for every outline, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`. The set's one number (`W` in `glyph.js`) |
| ink | inside 2.5 to 21.5 on both axes, centred on 12,12 (a few solid or oblong marks reach 1–23) |
| corners | soft: rects 1.5–2.4, no sharp miters |
| outline vs solid | outline for objects (folder, camera, lock); solid for acts and state (play, stop, record, dot, the pop-out arrow) |
| detail | nothing finer than 2.2 units between strokes, so the glyph still reads at 16 px |
| solid dots | `r` 1.15–2.4 |
| dimmed part | `opacity="0.42"` (the one dimmed rung: the far bar in `barsTop` and `barsBottom`) |
| colour | `currentColor` only, never a fixed fill or stroke, never a `style` carrying a colour |

`tests/glyph.node.mjs` checks all of it that can be checked without eyes: well-formed SVG, sized, `aria-hidden`, only
`currentColor`/`none` in `fill` and `stroke`, numbers inside the box, every name the kit calls exists, no module keeps
its own icon `<svg>`.

## Adding one

1. Write the meaning in one line (a verb the user does, or a thing they are looking at). If a glyph above already means
   it, use that one.
2. Draw it by hand against the table above, or ask Gemini (below).
3. Render at 16, 24 and 64 px in a real browser on a dark ground and a light one (`gallery/icons.html?only=name`, or
   the candidate page you make). Look at it. Keep it, or redo it.
4. Add it to `GLYPHS` in `glyph.js` with a comment that says the meaning, using the shared `STROKE` string. Add it to the
   test's list and to a group in `gallery/icons.html`, and a row to the table above. Retake the plate with
   `MIR_PLATES=1 MIR_BASE=… node tests/icons.browser.mjs`.

### Gemini through `agy` (BASINS' pipeline)

Josh's rule: use Gemini for SVGs, it is free. Prompt → `agy` → render → look → a constant.

- One icon per call, run from a small directory such as `/tmp` (the first calls, made from the repository root, never
  returned; whether the directory was the cause is not proved). `agy --model gemini-3.8-flash-medium -p "<prompt>"`
  answered in seconds when it answered; `-high` timed out on most calls on 2026-10-05, and about a third of the parallel
  calls came back empty: retry those.
- The prompt names the meaning in a sentence and gives the style as numbers: viewBox 0 0 24 24, stroke currentColor 1.9, round
  caps and joins, fill none (small solid dots only), ink inside 2.5 to 21.5, at most 6 shapes, "reply with only the svg
  element". A long prompt full of rules hung the CLI; a short one with the numbers did not.
- It sees image files only, so it cannot judge the render: you do. Gemini's answer is a candidate, not the glyph. Several of
  its answers are close to well-known open icon sets (it draws what it has seen); redraw what is too close to a known set.
- Record what it did well and badly in the project's collaborator notes after each run.

## Open

- **Two pencils.** `rename` (a pencil with a nib, 1.5.0) and `edit` (BASINS' timeline tool, a pencil with ticks) are the same
  meaning in two drawings. `edit` is BASINS' and stays as BASINS drew it; Josh may fold `rename` into it.
- **Two drag handles.** `grip` (six dots) and `gripDots` (nine). Josh ruled the nine-dot one for reordering; the six-dot one is
  still on the transport's seat chooser and a modulation bar grip.
- **`leave` and `minus`** are both a short horizontal bar. They mean different things (hide the window / remove one) and
  `leave` is drawn shorter so a chip does not change visual mass when the Leave-Chips setting flips.
- **Text still standing for an icon** in the kit and the apps (`‹ ›`, `×`, `☆ ★`, `⠿`): the library now has the glyphs; the
  call sites change one line at a time. *1.5.0-alpha.23 (Josh's call 18: Y):* the kit's own three are drawn now — the
  stepper's and the FOLDERS pager's `‹ ›` are `chevronLeft` / `chevronRight` at 1em of the button's font in the same seat
  (`controls/stepper.js`, `folders/gallery.js`), and the rack's + list favourite mark is `starFill` at the row's font size
  (`shell/rack.js`). Still typed in the kit: the rack's layout-favourites button `☆` (`shell/rack.js:387`), outside the
  call's three seats; the rest is the apps'.
