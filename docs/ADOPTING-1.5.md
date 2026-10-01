# Adopting MIR 1.5 from 1.4

A checklist for an app moving from the 1.4 line to 1.5. Run `node tools/adopt.mjs <app> --line 1.5` (see
`docs/LINES.md`), then work down this list. Each entry says what changed, how to find the places in your app, and
what to write instead. Entries are added by the lane that made the change.

## 1. The chip rail is styled by hooks, not by its label

**What changed.** Kit CSS used to select the modulation window's chip rail by its English label,
`[aria-label="MODULATION window controls"]` (exact) and `[aria-label$="window controls"]` (suffix). Rename or translate
the label and the chips silently lost their material. 1.5 gives the rail and chips stable hooks and the kit's CSS keys
on them. The aria-label is unchanged and is for people only.

| Was | Now |
|---|---|
| `.kwin-chiprail[aria-label="MODULATION window controls"]` | `.kwin-chiprail[data-mir-rail="modulation"]` |
| `.kwin-chiprail[aria-label$="window controls"]` | `.kwin-chiprail[data-mir-rail]` |
| `.crail-chip[data-rail="ribbon"]` | `.crail-chip[data-mir-chip="ribbon"]` |

- The rail root carries `data-mir-rail="<window id>"` (`modulation` for the modulation window); each chip carries
  `data-mir-chip="<chip name>"` (`close`, `compact`, `workbars`, `ribbon`, `drag`, ...). `data-rail` on chips is still
  set, with the same value.
- **If your app builds its own rails** (BASINS does, in `mir-plugins/kwin/kwin.js`), set `data-mir-rail` there too, or
  the kit's host-rank rules (`[data-mir-rail]`) will not match your rail.
- Find your selectors: `grep -rn "window controls" <app>` over `*.css` and `*.js`; every hit that is a selector (not
  the `aria-label` assignment itself) becomes a hook selector from the table. Specificity is unchanged, one attribute
  selector for one.

**BASINS** (`MANDELBROT APP/.../basins-engine-2026-09-12/app/`), read-only survey. Files that mention
`window controls`: `colour-window.js`, `lab.css`, `scene-input-guard.js`, `skin.css`, `timeline-window.css`,
`colour.css`, `mir-plugins/kwin/kwin.js`. (`lab/mir/**` is the kit copy and is replaced by adopting.)

## 2. The chips' glyph attribute is `data-glyph`, not `data-ink`

**What changed.** Chips named their glyph with `data-ink="close|<glyph>"`. A host's adaptive text ink uses the same
attribute for `w|k`, so the two collided. The kit's chips now use `data-glyph`; the kit reads `data-ink` nowhere.

- Find: `grep -rn "dataset.ink\|data-ink" <app>`. Anything that sets or selects the chips' glyph name moves to
  `data-glyph`. Leave `data-ink="w|k"` (the adaptive-ink contract) alone.

**BASINS** sets the glyph on its own chips in `colour-window.js:179` (`xEl.dataset.ink = 'close'`) and in
`mir-plugins/kwin/kwin.js` (lines 252, 294, 299). Those become `dataset.glyph`. `adaptive-ink.js` and `ink.css` use
`data-ink` for `w|k` and stay as they are.

## 3. (other lanes' entries go here)

## Check

`npm test` in the kit; in your app, load once and confirm the chips keep their material (the stylehash neutrality
proof, `tools/stylehash.mjs`, is the instrument).
