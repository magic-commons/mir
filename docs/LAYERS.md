# MIR · the cascade layers (1.5.0)

How the kit's CSS is ranked since 1.5.0, how that was proved neutral, and what an adopting app will see.
Plan: `MIR CLAUDE 1.5 PLAN 2026-10-01.md` §5.1. Audit: `MIR 1.5 SURVEY 2026-10-01/F1 TOKENS AND PAINT.md` §3, §5.4.

## 1. The order

`mir/css/base.css` loads first and declares it once:

```css
@layer mir.tokens, mir.kit, mir.core, mir.tier, mir.a11y;
@layer mir.kit.house, mir.kit.plugin.artifact, mir.kit.plugin.host, mir.kit.locale;
```

| Layer | Holds | Notes |
|---|---|---|
| `mir.tokens` | nothing yet | reserved for the token tiers (1.5.1) |
| `mir.kit.house` | `base.css`, `skin.css`, `shell/shell.css`, `shell/stage.css` | one rank: among them the cascade is 1.4's |
| `mir.kit.plugin.artifact` | `modulation/modwindow/modwindow.css` | the vendored window sheet |
| `mir.kit.plugin.host` | `modulation/modhost.css` | beats the artifact by rank, so it has no `:root` ladders (§5) |
| `mir.kit.locale` | `locales/locales.css` | per-language type tokens and the RTL mirror; `:where()` gates, so any app rule wins |
| `mir.core` | `mir/core/**` | lane L3 |
| `mir.tier` | `css/tokens.css` | the performance tier and reduced transparency (docs/TIERS.md) |
| `mir.a11y` | reduced-motion guarantees | 2 rules: shell.css `#title`, modwindow.css's window-wide stop |
| *(no layer)* | every app sheet | beats every layer above, whatever the selector |

The rules of the cascade that matter here:
- **Normal declarations:** a later layer beats an earlier one, and a rule in no layer beats them all. Inside one layer it is 1.4 exactly: specificity, then order of appearance.
- **`!important`** runs the other way: an earlier layer's `!important` beats a later layer's, and any layered `!important` beats an unlayered one.
- **A rule directly in a layer beats that layer's sub-layers.**
- **Names are global.** An app that writes `@layer mir.material` puts its rules *inside the kit's `mir`*, after `mir.a11y`, so it outranks the whole kit. Apps use their own root name.

## 2. Step A — the wrap (landed, then split by Step B)

Step A wrapped all six sheets whole in `@layer mir.kit { … }` and put the base.css order statement first. Because the six shared one layer, every kit-internal fight was decided exactly as in 1.4.3. That is what §3 proves. Step B (§5) then split `mir.kit` into three ranks and is proved separately.

At-rules inside the wrap:
- `@media`, `@keyframes` (base.css 13, modhost.css 2), `@font-face` (skin.css 3), `@supports`: all legal inside a layer block. The CSSOM census (below) shows each one survives.
- None of the six has `@import`, `@charset`, `@property` or `@container`.
- **`@keyframes` and `@font-face` now rank by layer.** An app's own unlayered `@keyframes lw-dev-enter` or `@font-face { font-family: Roboto }` now wins over the kit's whatever the load order. In 1.4 the last one loaded won.

The kit's other CSS is **not** layered and stays so: `mir/shell/vendor/katex/katex.min.css` (vendored, KaTeX-only selectors), the `<style id="mirTurn">` that `shell/accent.js` writes (its own keyframe names), and every gallery page's own `<style>`.

## 3. The proof (Step A)

**Before copy:** `.tmp/L2/before/` holds `mir/`, `fonts/`, `gallery/` and `tests/fixtures/` at bd69f99, taken before any edit. It was served on :8831 and the worktree on :8832. Each page was captured three times with `tools/stylehash.mjs`: before, before-again (the noise mask) and after.

| Page | Elements | States | Element diffs | Pixel diffs beyond noise |
|---|---|---|---|---|
| `gallery/index.html` (disconnected) | 827 | 8 (theme × card × frost) | 0 | 0 |
| `gallery/index.html` joined (`--setup` removes `.disconnected`) | 827 | 8 | 0 | 0 |
| `gallery/shell.html` | 19 | 8 | 0 | 0 |
| `gallery/shell.html?as=lambdawaves` | 20 | 8 | 0 | 0 |
| `gallery/shell.html`: notes open, FILE menu open | 60 | 8 | 0 | 0 |
| `?as=lambdawaves`: ABOUT open, VIEW menu open | 125 | 8 | 0 | 0 |
| `tests/fixtures/widgets.html` | 82 | 8 | 0 | 0 |
| `gallery/index.html`, `--media prefers-reduced-motion=reduce,prefers-reduced-transparency=reduce,prefers-contrast=more`, the two rAF-animated controls skipped | 817 | 8 | 0 | 0 |
| `?as=lambdawaves` ABOUT + VIEW, `--media prefers-reduced-motion=reduce` | 125 | 8 | 0 | 0 |

- **Media emulation bites:** the same page with and without `--media` differs in 176 element properties. So the a11y rows really exercise the moved rules and modhost's reduced-transparency and contrast blocks.
- **The first a11y capture showed 9 element diffs and 0 pixels.** All 9 were the gallery's ROUTED knob and DRIVEN fader, which animate by rAF below the fold and happened to sit still between the two before-runs. With those two controls skipped (`--skip 'canvas, .k.k-mod, .fd.mod'`), the a11y page has zero noise and zero diffs.
- **CSSOM census** (`.tmp/L2/census.mjs`): every sheet parses to the same style rules before and after, with the same text and media context. Within each layer the order is kept. The only additions are the order statement and the 3 rules now in `mir.a11y`.
- **The kit's browser tests pass on Step A:** `tests/widgets.browser.mjs` 47/47 and `tests/shell.browser.mjs` ALL PASS, phone included. No test needed changing.
- **`tools/extract-shell-css.mjs` reproduces the layered `mir/shell/shell.css` byte for byte** from λWAVES at 8fcdcf8 (`--frame`: "byte-identical … 14357 bytes").

## 4. The `!important` audit (34 declarations)

**Inside the kit nothing changed: all 34 are in the same layer, or in `mir.a11y`, and still beat every normal kit rule.**
**Against an app, every one changed in the same way.** A layered `!important` beats an unlayered `!important`, so an app can no longer out-specify any of these with its own `!important`. Until 1.4.3, an app `!important` of higher specificity, or of equal specificity loaded later, won.

| # | Where | Declaration(s) | Verdict |
|---|---|---|---|
| 1 | base.css `[hidden]` | `display:none` | **Keep.** The deliberate guarantee: `hidden` hides, whatever the app writes |
| 2 | base.css `.dev.closed` | `display:none` | **Keep.** The same guarantee for a closed window |
| 3 | base.css `.picker` | `border` | **Drop the flag (1.5.1).** No kit rule competes, so it only fights apps |
| 4 | skin.css `body.tablet-motion .dev *` | `box-shadow:none` | **Keep.** The iPad motion law: no nested relief while the picture moves |
| 5–6 | skin.css `.window-help-book > *` | `display`, `position` | **Keep for now.** These un-hide the notes moved into the ⓘ book. Revisit with 1.5.1's help rework |
| 7–9 | skin.css `.native-info .native-info-content` (and `:popover-open`) | `display` ×2, `position:fixed` | **Keep.** Popover mechanics |
| 10–14 | skin.css `.native-info .native-info-content, .control-help` | `border`, `background`, `box-shadow`, `-webkit-backdrop-filter`, `backdrop-filter` | **Drop the flags (1.5.1), measured first.** These are the ⓘ panel's and the hover hint's glass, and the one place the inversion bites today. BASINS re-frosts both panels with `!important` (surface-material.css `@layer mir.material`, material.css). In 1.4.3 that won; now the kit wins (§6, 14 rule pairs). War #4 in the audit |
| 15–17 | skin.css light theme, same two panels | `border-color`, `background`, `box-shadow` | **Drop with 10–14.** |
| 18 | skin.css `body.window-info-off …` | `display:none` | **Keep.** The contract switch (CONTRACT §3) |
| 19 | shell.css `#notebook[data-mode="edit"] .nb-view` | `display:none` | **Keep.** The mode switch |
| 20–21 | shell.css `body.ui-hidden #menubar, #title, #notebook` | `display:none` | **Keep.** H hides the interface |
| 22–23 | shell.css reduced motion `#title` | `transition:none`, `transform:none` | **Moved to `mir.a11y`.** |
| 24–27 | shell.css phone `#notebook` | `left`, `top`, `width`, `height` | **Keep.** They must beat the inline size the resize grip writes, and only `!important` beats an inline style |
| 28–30 | modhost.css `.mod-matrix-bars > *` | `position`, `inset`, `transform` | **Review (1.5.1).** Unscoped, and it fights an app's matrix layout. Scope it to the plugin or drop it |
| 31 | modhost.css `#modwin .m2-side-grip, .m2-matrix-open` | `display:none` | **Keep.** Retired controls stay hidden |
| 32 | modwindow.css `.kwin-chips-only > .kwin-bar` | `display:none` | **Keep.** The vendored guarantee ("THE BAR IS HIDDEN BY THIS ONE LINE") |
| 33–34 | modwindow.css reduced motion | `transition:none`, `animation:none` | **Moved to `mir.a11y`.** |

The moves into `mir.a11y` change nothing inside the kit: the moved declarations are all `!important`, they compete only with normal kit declarations, and no other kit `!important` sets `transition`, `transform` or `animation` on those elements. The a11y captures in §3 prove it.

## 5. Step B — host over artifact by rank, ladders gone (landed)

**The sub-layers**, declared once on the line after the order statement in base.css:

```css
@layer mir.kit.house, mir.kit.plugin.artifact, mir.kit.plugin.host;
```

| Sub-layer | Sheets |
|---|---|
| `mir.kit.house` | base.css, skin.css, shell/shell.css, shell/stage.css: one rank, so it is 1.4's cascade among them |
| `mir.kit.plugin.artifact` | modulation/modwindow/modwindow.css (the vendored window sheet) |
| `mir.kit.plugin.host` | modulation/modhost.css |
| `mir.kit.locale` | locales/locales.css (per-language type and the RTL mirror) |

**The ladders.** 838 `:root:root:root ` descendant prefixes were deleted by script, and the two compounds on `<html>` (`:root:root:root:not(.skin-frost)` and `:root:root { --m2-mat-hue }`) keep a single `:root`. 0 ladders are left, and `tools/lint-tokens.mjs` now **fails** on one in modhost.css (`LADDER_FREE`).

### 5.1 The flips, found and repaired

Moving the war from specificity to rank flips every pair where the losing sheet used to win by specificity. The cascade simulator (§7) found them. It runs on the gallery with the modulation window grown into every part its builder makes: 4 macros + a trigger macro; LFO, ENV and AUDIO devices in FULL, COMPACT and MINIMIZED; the audio sheet; the chip rail; the four picker sheets; ring, span, clear and ghost on kit controls; a few `.on`/`.drag`/`aria-pressed` states. It adds a synthetic element chain for every one of the 1,753 plugin selectors. That is 3,418 elements × 8 states × hover/focus/active forced on and off, in three environments: desktop, phone (hover: none, 390 px) and a11y media (reduced motion, reduced transparency, more contrast).

**First pass (ladders off, no repair): 31 rule pairs, 996 element·property·state flips in the desktop environment.** stylehash saw only one of them: 8 element diffs (one element per state), in the a11y state only. Every other flip had two values that happen to coincide in the driven states, or lay in a hover/focus state or a part the gallery does not build. All 31 pairs:

| Old winner (1.4.3) | New winner without repair | Properties |
|---|---|---|
| modwindow `#modwin.mir-modwindow .m2dev` (1,2,0) | modhost theme arms `body[data-theme] .mir-modwindow .m2dev:not(.glass)` (0,7,1 with ladder) | background-color |
| modwindow officiation list `#modwin.mir-modwindow .m2slot, … .m2name` (1,2,0) | modhost theme arms for .m2slot/.m2seat44/.m2audout/.m2prename/.m2name… | background-color |
| modwindow `#modwin … .m2prename` (1,2,0) and `::placeholder` (1,2,1) | modhost theme ink arms | color |
| modwindow `#modwin … .m2val.drag .m2vnum` (1,4,0) | modhost theme `.m2vnum` | color |
| modwindow chip rail `:focus-visible`, `.on`, `:active/.on::before` (0,6,0)/(0,6,1) | modhost `#modwin :focus-visible`, `.kwin-chiprail … .crail-chip(::before)` | outline, color, ::before background/border |
| modwindow `html body .crail.crail-float[…] .crail-chip.on` (0,5,2) | modhost `#modwin *, .kwin-chiprail … *` | text-shadow |
| modwindow `.m2ghost` (0,1,0), later | modhost's unladdered seat `.mir-modwindow, .kwin-chiprail, .m2ghost` (0,1,0) | font-family, font-variant-numeric |
| skin.css `body.frost .dev, body.frost .glass` (0,2,1) | modwindow `.glass.mir-modwindow` (0,2,0), now a rank above the house | backdrop-filter |

**Variant Q** (the artifact in the house rank) avoids only the last row (30 pairs). It was not taken: P is the design the plan names, and the one house reach-in is repaired below.

**The repair is a re-assertion, not a deletion.** The modhost theme arms were dead wherever `#modwin` matched. But `createModWindow({ id })` lets a host rename the window, and then they are alive, so deleting them is not neutral.
- Each 1.4.3 winner is re-asserted inside `mir.kit.plugin.host`, at **its 1.4.3 specificity less (0,3,0)**. That is the exact weight it had against the laddered host rules, which have all just lost (0,3,0).
- Three class-weights move into `:where()`: `.crail.crail-float.kwin-chiprail[…] .crail-chip:focus-visible` (0,6,0) becomes `:where(.crail.crail-float).kwin-chiprail[…] .crail-chip:where(:focus-visible)` (0,3,0).
- Where the rule has fewer than three, only the id is kept and the rule goes **first** in the layer, so it loses every tie. (1,0,0) placed first behaves as (1,−1,0).
- Re-assertions with full weight go **last**, because modwindow.css followed modhost.css.
- `.m2ghost` beat an unladdered rule, so it keeps its full weight. It won every font longhand in 1.4.3 and is re-asserted as the same shorthand.
- The skin.css frost rule is narrowed to the plugin by `:where(.mir-modwindow, .mir-modwindow *, …)`, which weighs nothing.

**The first, naive repair** re-asserted each winner with its own selector at the end. It created 35 second-order pairs: re-asserted at full weight, the copies out-ranked laddered host rules that had beaten them only through the ladder. That is how the "less (0,3,0)" rule was found.

**The result: 11 re-asserted rules (one at full weight), 0 flips in all three environments.** Both the scratch build (P3) and the final in-tree kit (`final`) were checked the same way: 526,144 winner identities moved with identical declared text, which is the re-assertions shifting rule indices, and 0 declared values differ. stylehash on all 9 captures shows 0 element and 0 pixel differences beyond noise (§3's table, rerun on the final tree).

### 5.2 What the simulator does not see

- **States the DOM never takes.** A rule that needs two JS states at once (`.drag` on one element while its parent is `.m2min`) is checked only where the grown window or a synthetic chain happens to have both.
- **Mixed dynamic states.** It forces hover, focus and active all on or all off, not one hovered element among unhovered ones.
- **Firefox.** The two `::-moz-range-*` rules are dropped by Chromium, and their weight changed (they lost the ladder) without proof. They sit in the host rank, which is what the ladder bought them.
- **The four picker sheets and the dead inspector** are built but not opened by real code paths.

### 5.3 To redo or extend it

The scripts are in `.tmp/L2/` (git-ignored). The method:
1. `stepb.mjs P <dir>` renames the layer blocks, strips the ladders and inserts `repair-start.css` / `repair-end.css`.
2. `simrun.mjs <tag> <port>` runs the three environments.
3. `simdiff.mjs before2 <tag>` prints the flip pairs.
4. Fit a re-assertion per old winner, at its 1.4.3 weight less (0,3,0) when the rule it beat was laddered, then loop.

## 6. What an adopting app sees: BASINS, measured

**The proving copies.**
- `.tmp/L2/basins-old/` and `.tmp/L2/basins-new/` are plain copies of `~/Documents/Codex/2026-09-28/hel/work/basins-save/app`. The source was read only.
- `basins-old/lab/mir` is byte-identical to the kit at bd69f99 (`diff -rq`: no output). `basins-new/lab/mir` holds the Step-A kit, and the only differing linked files are the six sheets.
- BASINS boots headless on the shared RTX (`--gpu 1`, `?warn=0`, ready on `window.__BASINS`, setup `__BASINS.layout.modulation.expand()`). Captures ran one at a time and took about a minute each.
- **Pixels are not usable for this app.** The live fractal under the glass renders differently between runs, so they are reported only as context. The element diffs are what count.

**stylehash, old vs new (4 states, ~1,200 elements, masked by a second old run):**

| Kit in `basins-new` | dark-tinted-off | dark-refractive-on | light-tinted-off | light-refractive-on |
|---|---|---|---|---|
| Step A, app untouched | 111 | 111 | 103 | 111 |
| Step A + the kwin.js fix below | 67–90 ¹ | 66–67 | 58–59 | 66–67 |
| the final kit (Step B) + the kwin.js fix | 66 | 66 | 58 | 66 |

¹ The upper figure appears when BASINS has already set `body[data-mir-material]` at capture time. That changes from run to run, and the cause is (d) below.

Every state also has 1 new element, `#m2-dead-send-warning.m2predead.off`, which is now visible. The causes come from the cascade simulator (§7), run on the modulation window, both chip rails and the rack cards: **97 flipping rule pairs, 406 element·property flips** after the kwin.js fix.

| Cause | Size | Where the fix belongs |
|---|---|---|
| **(a) A script reads the kit's CSSOM and skips `@layer`.** `mir-plugins/kwin/kwin.js` `adoptMaterial()` clones the modulation window's rules for the SAVE, TIMELINE and COLOUR windows. It descends only into `@media`/`@supports`, so with the kit layered it copies nothing: `#savewin-material` and `#timelinewin-material` fall from 1,272 rules to 0, and the COLOUR rail loses every chip style | 44 elements per state | **App**, 3 lines (tried in the proving copy): also descend into a `CSSLayerBlockRule` whose name is `mir.kit…`, and re-issue it inside `@layer <same name> { }`. Descending into *every* layer is wrong: it then adopts BASINS' own `mir.material` blocks, which 1.4.3 never copied (4 extra pairs on `#modwin`, measured) |
| **(b) App rules that used to lose to modhost's `#modwin` ladders now win.** `ink.css` (`:root×5 body:where(…) .mir-modwindow .m2…` at (0,7,1)) lost to modhost's (1,5,0) on every modulation-window part, so it was dead there. Unlayered, it now paints the window's inks: chip and macro inks, preset buttons, bank letters, power ring | ink.css 31 pairs / 196 flips; skin.css 14 / 46; basins.css 14 / 42 (`body[data-card="tinted"] .glass` reaches the work bar) | **App.** Delete the now-live rules that were dead for `#modwin` in 1.4.3, or narrow them with `:not(#modwin *)`. Putting `lab.css`/`skin.css` in an app layer *under* the kit would need an `@layer app.shell, mir;` statement before `base.css`, and they would then also lose to `base.css`, which they were written to beat. Not recommended |
| **(c) `!important` inversion.** BASINS re-frosts the ⓘ panel and the hover hint with `!important` (surface-material.css in `mir.material`, and material.css). The kit's `!important` on the same panels (skin.css, §4 rows 10–17) now wins | 14 pairs | **Kit**, 1.5.1: drop those 8 flags (§4) |
| **(d) Layer-name collision.** `mir.material`, `mir.timeline` and `mir.transport-controls` are BASINS' own layers but sit inside the kit's `mir`, after `mir.a11y`. Their normal rules now beat the whole kit (rack-card faces turn transparent under `data-mir-material`; transport controls take 12 pairs from modhost). In 1.4.3 they lost to every unlayered kit rule, which is why those three sheets carry 111 `!important`s | 12 pairs measured + the material faces | **App**: rename to its own root (`app.material`, …) and decide their rank deliberately. With the kit layered, most of the 111 `!important`s can go |
| **(e) kwin's adopted copy is now in `mir.kit`, below the app.** In 1.4.3 the injected `<style>` came last and unlayered, so it beat app sheets on ties. Now `timeline-window.css` beats it | 3 pairs / 24 flips | **App**: delete the TIMELINE rail rules that it now overrides, or accept |

**What an adopting app must expect, in one line:** every rule of the app that a kit rule used to out-specify now wins. On the modulation window that means every app rule that lost to modhost's `#modwin` ladder. Delete the ones that were dead, and keep the ones that were meant.

### 6.1 The host seat an app may write into: `@layer mir.kit.plugin.host`

An app that **replaces the modulation window's ink ladder** (BASINS' `ink.css` §3b: 35 generated rungs) may wrap those rules in `@layer mir.kit.plugin.host { … }`. That is blessed: in that layer they beat modhost.css's theme arms (same layer, later in the order) and lose to modhost's `#modwin` rules on specificity, exactly as they did in 1.4.3. Use it only for rules that stand in for the plugin's own; everything else an app writes stays unlayered, and an app's own layers are never named `mir.*` (see `docs/ADOPTING-1.5.md` §4).

## 7. The tools

- **`tools/stylehash.mjs`** walks every grouping rule, so tokens inside `@layer` are seen (it already recursed into `cssRules`, and this is now stated). New: `--media name=value,…` emulates media features for a whole capture (reduced motion, reduced transparency, contrast). That is how the `mir.a11y` layer and modhost's accessibility arms are proved.
- **`tools/lint-tokens.mjs`** reads sheets as text, so layers need nothing. New: it counts `:root:root` in every kit sheet. The list `LADDER_FREE` names the sheets where a ladder is an error. It holds `mir/modulation/modhost.css` since Step B (840 before, 0 now); any other sheet is report-only.
- **`tools/extract-shell-css.mjs`** emits the layer blocks itself: `mir.kit`, and `mir.a11y` for a reduced-motion rule whose declarations are `!important`. It closes a wrapper only as far as the next rule's wrappers differ. `--frame mir/shell/shell.css` splices the sheet's hand-written header and kit additions around the extraction and reports byte identity. Measured against λWAVES 8fcdcf8 (`git archive`, served from `.tmp/L2/lw/lab`): **byte-identical, 14,357 bytes**.
- **The cascade simulator** (`.tmp/L2/cascade.mjs`, git-ignored; worth promoting to `tools/` in 1.5.1) reruns the cascade itself instead of reading computed styles, so it sees a flip even where both values happen to be equal in the current state.
  - For every element, and every pseudo-element a rule targets, it collects every matching rule. Dynamic pseudo-classes are forced all-true in one pass and all-false in another.
  - It picks each property's winner by CSS Cascade 5: importance, then layer (reversed for `!important`; a rule directly in a layer beats that layer's sub-layers), then specificity (its own Selectors-4 calculator, `:is/:not/:has` taking the maximum and `:where` zero), then order.
  - `--synth` builds, for every selector of the plugin sheets, a minimal element chain that matches it inside the real window. A rule the live DOM never exercises still meets every rule that can reach its element. The chain is built from one fixed selector list, so the old and new runs share one DOM.
  - `cascadediff.mjs` reports flips per (old winner → new winner) rule pair. `repair.mjs`/`srcrules.mjs` map a winner back to its source text (the CSSOM index skips the two `::-moz-` rules Chromium drops).
