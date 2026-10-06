# MIR · skins: where the look lives (1.5.0-alpha.4)

A **skin is a set of token values**. Nothing else in the kit's sheets carries a look: every colour, shadow, radius, blur, duration, easing, font size, weight, letter-spacing and look opacity the house draws with is a custom property, declared once, in one block at the top of its sheet. The rules below each block read names only, so a skin that sets the names changes the look and nothing else. FROST, the kit's own glass, is simply the values those blocks hold today.

**How MIR names a look** (Josh, 2026-10-01): a **vanilla theme** is a named set of the built-in settings and nothing else. **FROST** (glassmorphism, Josh's recipe, the default) is one; **MORPH** (neumorphism) is coming. Anything that needs rules or art outside the settings is a **'name'-spec** MIR build or theme: **METRO** and **SPRITES** are 'name'-specs.

This page is for whoever writes a vanilla theme or a 'name'-spec against these names (FROST is the values the blocks hold; METRO will be a 'name'-spec beside it) and for a model writing a skin against the schema (`mir/tokens.json`, `docs/LLM-MODS.md`). Plan: `MIR CLAUDE 1.5 PLAN 2026-10-01.md` §5.2, §7 (1.5.5), §8.3. The modulation plugin's two sheets follow the same law in their own blocks (`docs/TIERS.md`, "The modulation plugin").

## The window material (1.5.0-alpha.8)

`createWindow({ material: 'modulation' })` (FOLDERS passes it by default) writes `data-mir-material="modulation"` on a kit window's root and its rail: the window wears the modulation window's material: rail, chips, controls, resize corner; no CSS cloning. The shared values (`--m2-mat-frost`, the controls' `--glass-hairline`, `--m2-rail-track`) are declared once in `mir/css/skin.css` on `.mir-modwindow, .kwin-chiprail, .m2ghost, [data-mir-material="modulation"]`; `mir/window/window.css` adds the corner and trigger values (`--win-corner*`, `--win-trig-*`) and eight rules. A skin that sets those names restyles the modulation window and every window that wears its material together.

## The four rules a skin follows

| Rule | Why |
|---|---|
| **Set a name on the selector the kit declares it on.** The table below gives the selector for every name. | A custom property declared on an element beats one it inherits. A value the kit declares on `.k-dial` is not reached by a skin's `:root` |
| **A themed value is set twice:** the dark value where the table says, the light value on `body[data-theme="light"]` (or on the light selector the table names). | The kit's theme is `data-theme` on `<body>`. A `:root` value never sees it |
| **A value that reads another token (`var()`) is declared where its inputs are:** on `<body>` for the tint and the accent, on the element for anything the element carries (`--prox`, `--nc`). Never on `:root`. | A custom property is resolved on the element that declares it (`docs/TIERS.md`, "Where the values live, and why"). `--x: hsl(var(--glass-tint) / .9)` on `:root` freezes the dark tint |
| **Write the skin unlayered, or in a layer that ranks after `mir.kit`; never with `!important`.** The tier (`mir.tier`) still wins over a layered skin, and an unlayered skin must gate its own tier values (`docs/TIERS.md`, "How a skin and the tier meet"). | An unlayered rule beats every layered one; a layered `!important` inverts the order (`docs/LAYERS.md`) |

Off values follow the kit's two laws: a switched-off blur is the whole filter `none`, a switched-off shadow is `0 0 0 0 transparent`.

## The FROST value blocks

Every block is headed `/* FROST · values */` and closed by `/* ── end of the values ── */` in its sheet. Selectors and their order are the ones the values always had; a gate added in a block is written with `:where()`, so no block changes a selector's weight. Sheets in load order (`base.css` and `skin.css` are one layer, so `skin.css` re-points `base.css`'s names exactly as it did before).

| Sheet | Selector | Names |
|---|---|---|
| `mir/css/base.css` | `:root` | `--ui-scale` `--touch` `--font-ui` `--font-mono` `--font-sans` `--font-num` `--font-math` `--glass-blur` `--fs-micro` `--fs-tiny` `--fs-small` `--fs-base` `--fs-lead` `--tr-tight` `--tr-wide` `--tr-wider` `--lh` `--w-light` `--w-med` `--w-bold` `--r-xs` `--r-sm` `--r-md` `--r-lg` `--r-pill` `--sp-1` `--sp-2` `--sp-3` `--sp-4` `--sp-5` `--glass-hue` `--glass-sat-tint` `--glass-lum` `--glass-tint` `--glass-opacity` `--glass-border` `--glass-border-color` `--glass-hairline` `--glass-sheen` `--glass-shadow` `--glass-well` `--glass-raise` `--glass-press` `--glass-groove` `--glass-groove-hot` `--glass-filter` `--fg` `--fg-soft` `--dim` `--ink-key` `--ink-faint` `--ink-shadow` `--hue-acc` `--sat-acc` `--lum-acc` `--acc` `--acc-ink` `--acc-soft` `--acc-glow` `--hue-acc2` `--sat-acc2` `--lum-acc2` `--acc2` `--acc2-soft` `--ok` `--warn` `--bad` `--n1` `--n2` `--n3` `--n4` `--n5` `--n6` `--rack-w` `--rail-w` `--z-chrome` `--z-veil` `--z-banner` `--phone` `--t-fast` `--t-soft` `--t-linger` `--logo-turn` `--ease-std` `--ease-linear` `--w-regular` `--w-semi` `--w-heavy` `--dev-swap-glyph` `--dev-close-glyph` `--dev-copy-glyph` `--dev-fold-glyph` `--dev-off-fade` `--dev-enter-time` `--dev-enter-ease` `--math-scale` `--k-dial-groove-gap` `--k-needle-r` `--k-needle-edge` `--k-tick-r` `--k-tick-fade` `--sw-fill` `--sw-led-fill` `--sw-mode-fade` `--seg-ground` `--seg-b-r` `--trig-glyph` `--sel-fill` `--fd-r` `--fd-ground` `--fd-edge-shadow` `--ro-ground` `--ro-sub-fade` `--abar-r` `--abar-track` `--picker-ground` `--cv-tick-size` |
| `mir/css/base.css` | `.badge.exact i` | `--badge-led-glow` |
| `mir/css/base.css` | `.badge.numerical i` | `--badge-led-glow` |
| `mir/css/base.css` | `.badge.warn i` | `--badge-led-glow` |
| `mir/css/base.css` | `.badge.bad i` | `--badge-led-glow` |
| `mir/css/base.css` | `.fd-fill` | `--fd-fill-color` `--fd-pop-fill` |
| `mir/css/base.css` | `#graphTip` | `--tip-fill` |
| `mir/css/base.css` | `.cv-fill` | `--cv-area` |
| `mir/css/base.css` | `.cv-head` | `--cv-head-ink` |
| `mir/css/base.css` | `.k-ring-stack` | `--k-ring-stack-ink` |
| `mir/css/skin.css` | `:root` | `--rack-w` `--glass-hue` `--glass-sat-tint` `--glass-lum` `--glass-opacity` `--card-opacity` `--glass-border-color` `--glass-hairline` `--glass-sheen` `--glass-shadow` `--surface-shadow-float` `--surface-shadow-menu` `--state-on` `--state-on-rim` `--state-press-scale` `--state-disabled` `--glass-well` `--glass-raise` `--glass-press` `--glass-groove` `--glass-groove-hot` `--neu-raise` `--neu-inset` `--neu-flat` `--fg` `--fg-soft` `--dim` `--ink-key` `--ink-faint` `--ink-shadow` `--hue-acc` `--sat-acc` `--lum-acc` `--acc` `--acc-ink` `--acc-soft` `--acc-glow` `--card-gap` `--card-r` `--disc-gap` `--disc-r` `--frost-filter` `--grp-r` `--k-dial-sheen` `--sw-fill` `--sw-led-fill` `--sw-led-well` `--fd-edge-shadow` `--abar-track` `--frost-veil-dark` `--frost-veil-light` `--fx-v-scale` `--font-help-glyph` `--help-glyph-size` `--trig-press-relief` |
| `mir/css/skin.css` | `body` | `--acc` `--acc2` `--acc-soft` `--acc-glow` `--acc2-soft` |
| `mir/css/skin.css` | `body[data-theme="light"]` | `--glass-hue` `--glass-sat-tint` `--glass-lum` `--glass-tint` `--glass-opacity` `--fg` `--fg-soft` `--dim` `--ink-key` `--ink-faint` `--glass-border-color` `--glass-hairline` `--glass-sheen` `--glass-well` `--glass-raise` `--glass-press` `--glass-shadow` `--surface-shadow-float` `--surface-shadow-menu` `--state-on` `--state-on-rim` `--neu-raise` `--neu-inset` `--lum-acc` `--acc` `--acc-ink` `--n1` `--n2` `--n3` `--n4` `--n5` `--n6` |
| `mir/css/skin.css` | `@media (hover: none) and (max-width: 700px), (hover: none) and (max-height: 520px) and (max-width: 1000px) → :root` | `--phone` `--rack-w` `--rack-edge` `--top-bar` |
| `mir/css/skin.css` | `@media (hover: none) and (max-width: 700px), (hover: none) and (max-height: 520px) and (max-width: 1000px) → :root, body[data-theme]` | `--glass-opacity` |
| `mir/css/skin.css` | `.dev, .dev-head, .dev-body` | `--dev-carried-ring` `--dev-tab-ring` |
| `mir/css/skin.css` | `.k-dial, .trig` | `--state-hover-wash` |
| `mir/css/skin.css` | `.k-dial` | `--knob-face` `--k-live-ring` |
| `mir/css/skin.css` | `.k-val` | `--k-val-fill` |
| `mir/css/skin.css` | `.trig` | `--trig-face` |
| `mir/css/skin.css` | `.fd-fill` | `--fd-fill-color` |
| `mir/css/skin.css` | `.native-info .native-info-content, .control-help` | `--popover-fill` |
| `mir/shell/shell.css` | `:root` | `--nb-r` `--nb-shade` `--nb-title-size` `--nb-title-tracking` `--nb-subtitle-size` `--nb-subtitle-tracking` `--nb-placeholder-fade` `--nb-view-size` `--nb-h1-size` `--nb-h2-size` `--nb-h3-size` `--nb-katex-scale` `--nb-code-size` `--nb-code-r` `--nb-code-fill` `--nb-pre-r` `--nb-pre-fill` `--nb-cell-rule` `--nb-hr` `--nb-mode-size` `--nb-tool-glyph` `--nb-btn-r` `--nb-grip-r` `--nb-grip-fade` `--nb-logo-size` `--nb-lam-face` `--lam-scale` `--wordmark-tracking` `--wordmark-ink` `--wordmark-ink-light` `--ab-version-size` `--ab-version-tracking` `--ab-credit-size` `--ab-fine-size` `--ab-rule-ink` `--mb-btn-r` `--mb-list-r` `--mb-item-r` |
| `mir/shell/shell.css` | `#notebook` | `--nb-line` `--nb-btn` `--nb-btn-line` `--nb-edge` `--nb-phone-fill` |
| `mir/shell/shell.css` | `body[data-theme="dark"] #notebook` | `--nb-line` `--nb-btn` `--nb-btn-line` `--nb-edge` |
| `mir/shell/shell.css` | `.nb-tools button` | `--state-hover-wash` |
| `mir/shell/shell.css` | `.nb-dump, .ab-home` | `--nb-btn-line-hot` |
| `mir/shell/shell.css` | `.mb-list` | `--mb-list-veil` |
| `mir/shell/stage.css` | `:root` | `--stage-ground` `--stage-ground-light` |
| `mir/core/core.css` | `:root` | `--motion-micro` `--motion-ui` `--motion-structural` `--ease-out` `--ease-in` `--prox-r` |
| `mir/core/core.css` | `:root[data-motion="off"]` | `--motion-micro` `--motion-ui` `--motion-structural` |
| `mir/core/core.css` | `.mir-prox` | `--prox-fill` `--prox-fill-capture` |
| `mir/core/core.css` | `.mir-prox-host` | `--prox-host-ring` |
| `mir/core/core.css` | `.mir-glow` | `--pointer-light` |
| `mir/window/window.css` | `:root` | `--chip-hover-scale` `--chip-press-scale` |
| `mir/window/window.css` | `.mir-rail` | `--chip-fill` `--chip-filter` `--chip-lift` `--chip-rim` `--chip-sink` `--chip-on` `--chip-on-rim` |
| `mir/window/window.css` | `body[data-theme="light"] .mir-rail` | `--chip-rim` |
| `mir/window/window.css` | `body[data-card="tinted"] .mir-rail` | `--chip-fill` |
| `mir/window/window.css` | `body[data-card="refractive"] .mir-rail` | `--chip-fill` |
| `mir/window/window.css` | `body.frost[data-card="refractive"] .mir-rail` | `--chip-filter` |
| `mir/window/window.css` | `body.frost[data-card="refractive"][data-theme="dark"] .mir-rail` | `--chip-fill` |
| `mir/window/window.css` | `body.frost.frost-hold[data-card="refractive"] .mir-rail` | `--chip-filter` `--chip-fill` |
| `mir/shell/pages.css` | `#notebook[data-tab]` | `--nb-tab-on` `--nb-tab-on-rim` `--nb-tab-hover` `--nb-tab-carried` `--nb-tab-h` `--nb-tab-max` |
| `mir/shell/pages.css` | `@media (pointer: coarse) → #notebook[data-tab]` | `--nb-tab-h` |
| `mir/notes/notes.css` | `.nb-shelfface` | `--nt-line` `--nt-row-hover` `--nt-on` `--nt-on-rim` `--nt-h` |
| `mir/notes/notes.css` | `@media (pointer: coarse) → .nb-shelfface` | `--nt-h` |
| `mir/shell/gui.css` | `.mir-gui` | `--gui-col` `--gui-col-narrow` `--gui-about-w` `--gui-about-w-narrow` `--gui-gap` `--gui-grp-r` `--gui-grp-pad` `--gui-logo-h` `--gui-step-b` |
| `mir/shell/parts.css` | `.mir-busy` | `--busy-turn` `--busy-breathe` `--busy-ease` `--busy-low` `--busy-ring` |
| `mir/shell/parts.css` | `.mir-toast` | `--toast-fill` `--toast-ink` `--toast-edge` `--toast-shadow` `--toast-radius` `--toast-size` `--toast-weight` `--toast-lh` `--toast-tracking` |
| `mir/shell/parts.css` | `body[data-theme="light"] .mir-toast` | `--toast-fill` `--toast-ink` |
| `mir/info/info.css` | `.mir-info` | `--info-ink` `--info-paper` `--info-paper-soft` `--info-halo` `--info-line-w` `--info-halo-w` `--info-lh` `--info-size-body` `--info-size-label` `--info-size-title` `--info-size-h1` `--info-size-h2` `--info-measure` `--info-measure-narrow` `--info-pane-pad` `--info-block-measure` `--info-dim` `--info-travel` `--info-pin-time` `--info-weight-display` `--info-weight-heading` `--info-weight-strong` |
| `mir/info/info.css` | `[data-theme="light"] .mir-info` | `--info-ink` `--info-paper` `--info-paper-soft` |
| `mir/fx/fx.css` | `:where([data-light])` | `--light-r` `--light-ink` `--light-strength` `--light-blend` |
| `mir/fx/fx.css` | `:where(body[data-theme="light"] [data-light])` | `--light-strength` `--light-blend` |
| `mir/fx/fx.css` | `:where(html[data-pointer-light] [data-light])` | `--light-paint` |
| `mir/keyboard/keyboard.css` | `:root` | `--km-shift-fade` |
| `mir/keyboard/keyboard.css` | `.km, .km-help` | `--km-live` `--km-conflict` `--km-badge-alt` |
| `mir/folders/folders.css` | `.mir-folders` | `--folders-thumb-ground` `--folders-over-ink` `--folders-over-scrim` `--folders-over-scrim-soft` `--folders-cover-scrim` `--folders-parallax` `--folders-zoom` `--folders-zoom-hot` |
| `mir/folders/folders.css` | `.sv-ghost` | `--folders-thumb-ground` `--folders-carry-scale` `--folders-ghost-fade` |
| `mir/history/history.css` | `:root` | `--hist-future-fade` |
| `mir/locales/locales.css` | `:where(:root:lang(ar))` | `--label-case` `--label-tracking` `--lh` `--font-ui` |
| `mir/locales/locales.css` | `:where(:root:lang(hi))` | `--label-case` `--label-tracking` `--lh` `--font-ui` |
| `mir/locales/locales.css` | `:where(:root:lang(bn))` | `--label-case` `--label-tracking` `--lh` `--font-ui` |
| `mir/locales/locales.css` | `:where(:root:lang(zh))` | `--label-case` `--label-tracking` `--lh` `--font-ui` |
| `mir/locales/locales.css` | `:where(:root:lang(ja))` | `--label-case` `--label-tracking` `--lh` `--font-ui` |

`mir/css/tokens.css` is the performance tier, not a FROST block: it switches `--surface-*`, `--relief-*`, `--t-*`, `--motion-*`, `--frost-filter` and `--glass-filter`, and a skin leaves it alone. `mir/shell/rack.css` declares layout only (the rack's gutter and the visibility step easings), `mir/info/faces.css` only `@font-face` rules: no FROST block.

## The built-in settings' hooks (1.5.0-alpha.5)

The GUI window's look store writes these; a vanilla theme is a set of their values (`docs/THEMES.md`). They are read by the house sheets as follows, so a skin may set them too:

| Name / attribute | On | What reads it |
|---|---|---|
| `--light-angle` (and `--light-sin`, `--light-cos` from it) | `<html>` | `--neu-raise`, `--neu-inset` (the relief, every theme), the cast and the shine |
| `--shadow-amount`, `--shadow-dist`, `--shadow-soft` | `<html>` | the cast: `--cast-pane`, `--cast-float`, `--cast-menu` on `html[data-cast] body`, which become `--surface-shadow`, `-float`, `-menu` |
| `--shine-amount`, `--shine-soft` → `--shine-term` | `<html>` → `html[data-shine] body` | a rack card's `::before` (additive) and every other pane's shadow list |
| `body[data-card="solid"]` | `<body>` | `--card-opacity: 1`, `--glass-opacity: 1`, `--surface-sheen: none`, `--solid-pane`, `--solid-lit`, `--solid-shade`, the wells and the relief mixed from the pane |
| `body[data-faces="glass" \| "blend"]`, `--faces-solid-pct`, `--faces-transition-alpha` | `<body>` | the faces' own tokens (`--knob-face`, `--trig-face`, `--sw-fill`, `--glass-well`, `--k-dial-sheen`, `--glass-groove`), the hairline, the blend layer; the modulation dial's `--m2-dialink-b-wash`; the transport pill's `--xport-face` |
| `body[data-text="light" \| "dark"]` | `<body>` | the ink ladder (`--fg` … `--ink-faint`), `--ink-shadow`, and the plugin's `--m2-ink-*` |
| `--pane-edge` | `<body>` | the window panes' rim (`.dev`, `.glass`, the islands, the notebook, the modulation panes), before `--surface-edge` |
| `--rack-gap`, `--rack-inset`, `--pane-pad`; `html[data-flush]` | `<html>` | `rack.css` (the column's gap and padding), `.dev-body`'s padding; flush: a square, shadowless slab |

## Themed names

| Name | Dark (or no theme) | Light |
|---|---|---|
| the 1.4 material and inks (`--glass-*`, `--fg` … `--ink-faint`, `--neu-*`, `--acc`, `--acc-ink`, `--lum-acc`, `--n1` … `--n6`, `--surface-shadow-float`, `--surface-shadow-menu`, `--state-on`, `--state-on-rim`) | `skin.css :root` (the accents again on `body`) | `skin.css body[data-theme="light"]` |
| `--nb-line`, `--nb-btn`, `--nb-btn-line`, `--nb-edge` | `shell.css body[data-theme="dark"] #notebook` | `shell.css #notebook` (also the value with no theme) |
| `--chip-rim` | `window.css .mir-rail` | `window.css body[data-theme="light"] .mir-rail` |
| `--info-ink`, `--info-paper`, `--info-paper-soft` | `info.css .mir-info` | `info.css [data-theme="light"] .mir-info` |
| `--light-strength`, `--light-blend` | `fx.css :where([data-light])` | `fx.css :where(body[data-theme="light"] [data-light])` |

Two pairs are deliberately **not** themed by the token, because the elements that read them do not all follow the theme: `--stage-ground` / `--stage-ground-light` (`<html>` and `<body>` keep the dark ground in both themes; only `#stage` turns light) and `--wordmark-ink` / `--wordmark-ink-light` (the title's light rule reads the second). The frost veils are two names for the same reason: `--frost-veil-dark` is read only under `[data-theme="dark"]`, `--frost-veil-light` everywhere else, including a page with no `data-theme` at all.

## Names whose value reads another token

Declared on the element that draws them (the table above gives the selector), so each resolves exactly where its literal did:

| Name | Reads | Declared on |
|---|---|---|
| `--badge-led-glow` | `--ok` / `--acc` / `--warn` / `--bad` | each `.badge.<status> i` |
| `--fd-fill-color`, `--fd-pop-fill` | `--hue-acc`, `--sat-acc` (base) / `--acc` (skin); `--nc`, `--acc` | `.fd-fill` |
| `--tip-fill`, `--k-val-fill`, `--knob-face`, `--trig-face`, `--popover-fill`, `--nb-phone-fill`, `--mb-list-veil` | `--glass-tint` (themed on `<body>`) | `#graphTip`, `.k-val`, `.k-dial`, `.trig`, the help panel and hint, `#notebook`, `.mb-list` |
| `--cv-area`, `--cv-head-ink`, `--k-live-ring`, `--dev-carried-ring`, `--dev-tab-ring`, `--prox-fill`, `--prox-fill-capture`, `--pointer-light` | `--acc` | `.cv-fill`, `.cv-head`, `.k-dial`, `.dev, .dev-head, .dev-body`, `.mir-prox`, `.mir-glow` |
| `--k-ring-stack-ink` | `--acc2` | `.k-ring-stack` |
| `--state-hover-wash` | `--state-hover`, `--glass-raise` | `.k-dial, .trig` (skin.css) and `.nb-tools button` (shell.css) |
| `--nb-btn-line-hot` | `--acc`, `--nb-btn-line` | `.nb-dump, .ab-home` |
| `--prox-host-ring` | `--acc`, and `--prox`, which `core/proximity.js` writes on the host | `.mir-prox-host` |
| `--chip-fill`, `--chip-filter`, `--chip-sink`, `--chip-on`, `--chip-on-rim` | the tint, the 1.5 surface and state names | `.mir-rail` and its seat rules |
| the component names that were already declared on their parts (`--nb-tab-*`, `--nt-*`, `--info-halo`, `--km-*`, `--light-paint`, `--busy-turn`, `--busy-ring`) | as their rows in `mir/tokens.json` say | as the table above says |

## What is still written as a literal, and why

**Counted by `tools/lint-intent.mjs` (five, all justified):**

| Where | Literal | Why it is not a look |
|---|---|---|
| `mir/core/core.css`, the proximity guide's transition | `visibility 0s … var(--motion-ui)` and `transition-delay: 0s` | the instant visibility flip that lets the fade finish without a timer: `0s` is "at once", not a duration a skin tunes |
| `mir/css/skin.css`, `.accent-dial .k-dial::after` | `mask: radial-gradient(… #000 0)` | a mask's colour is only its alpha; nothing is painted in it |
| `mir/css/skin.css`, DISABLED (`.k.disabled …`, `.k.disabled .k-dial`) | `box-shadow: 0 0 0 0 transparent` | INTENT's law: a disabled control has no relief. This is the kit's "off", not a drawing (a pressed trigger's relief, which a skin may draw, is `--trig-press-relief`) |

**Not counted, and left as written on purpose:**
- **Geometry:** line heights, border, outline and stroke widths, outline offsets, gradient stop positions (the dot grip, the groove ticks, the resize corner, the base tick), keyframes and travel distances, z-index. These place things; a skin that changes them is a layout change.
- **Fallbacks of a 1.5 name a skin already sets:** `var(--font-display, 'LW Title', var(--font-ui))`, `var(--font-info-body, "Spectral", …)`, `var(--state-focus, 2px solid var(--acc))`, `var(--state-press-scale, .96)`, `var(--state-disabled, .38)`, `var(--label-case, uppercase)`, `var(--surface-edge-width, 1px)`. The skin reaches each through the name; the fallback is the FROST value when nothing is set.
- **`!important`** (26 in the house sheets) and every selector's weight, order and layer: unchanged in this pass.

## Near-duplicates (for Josh: a later look pass could merge these)

Every value above is today's value exactly; nothing was rounded or merged. These are values within a hair of each other that play the same role, and identical values in parts that may be one role. Merging any of them is a look change, shown here, not made.

| Values | Where | Note |
|---|---|---|
| `cubic-bezier(.23, 1, .32, 1)` · `cubic-bezier(.22, 1, .36, 1)` | `--dev-enter-ease` (the window entrance) · `--ease-out` (core.css) | the same out-curve, written twice |
| `.96` · `.97` · `.98` tint alpha | `--k-val-fill` (knob value tip) · `--tip-fill` (the one tip) · `--popover-fill` (help panel and hint) | three popovers, three opacities |
| `--w-bold` 650 · 700 | the window ⓘ button · the notebook's ABOUT ⓘ (`--font-help-glyph`, `--help-glyph-size` shared) | one glyph, two weights |
| the math stack with and without `'Libertinus Math'` | `#title .lam` (reads `--font-math`) · `.nb-logo .lam` (`--nb-lam-face`) | one λ, two stacks |
| `hsl(0 0% 50% / .12)` · `/ .14` | `--nb-pre-fill` · `--nb-code-fill` | code block and inline code grounds |
| `hsl(0 0% 50% / .25)` · `/ .3` | `--nb-cell-rule`, `--ab-rule-ink` · `--nb-hr`, notes.css `--nt-line` | the notebook's rules |
| `hsl(0 0% 0% / .16)` · `.18` · `.2` · `.2` | `--ro-ground` · `--fd-ground` · `--seg-ground` · `--picker-ground` (base.css; skin.css draws the first three as the well) | the pre-skin wells |
| `hsl(0 0% 0% / .22)` | `--nb-shade` = base.css `--glass-well` | the notebook's shade is the old well |
| `--nb-edge` = `--nb-line` | `.45` white, `.18` on dark, in both | the notebook's edge and its grip strokes |
| `color-mix(in srgb, var(--acc) 16%, transparent)` | skin.css `--fd-fill-color` = `--acc-soft` | the fader fill is the soft accent; kept apart because `shell/accent.js` rewrites `--acc-soft` |
| `.38` | `--dev-off-fade` = `--state-disabled` | a powered-off window's body and a disabled control fade alike |
| `.85` | `--k-tick-fade` · `--ro-sub-fade` · `--nb-grip-fade` | three resting marks |
| 6 · 7 · 8 · 10 · 12 px | `--seg-b-r`, `--mb-item-r`, base `--fd-r` · `--mb-btn-r` · `--nb-pre-r`, `--nb-btn-r` (= `--r-md`) · `--grp-r`, `--mb-list-r` · `--r-lg` | eleven corners on five steps, as the plan said |
| 16 px | `--nb-r` · `--prox-r` | the notebook and the proximity guide share a corner; `--card-r` is 14 |
| 12 px type | `--nb-code-size`, `--nb-mode-size`, `--ab-version-size`, `--ab-credit-size`, `--help-glyph-size`, `--dev-copy-glyph` | the scale has no 12 (11 is `--fs-base`, 13 `--fs-lead`) |
| 10.5 px | `--ab-fine-size` | half a pixel above `--fs-small` |
| `.04em` · `.06em` | `--nb-title-tracking`, `--nb-subtitle-tracking` · `--wordmark-tracking`, `--ab-version-tracking` | display tracking, two values |
| `0 0 0 .5px … / .38` · `0 0 0 1px … / .4` | `--k-needle-edge` (base) · `--fd-edge-shadow` (skin) | two hairline edges on two indicators |

## How it was proved

`tools/stylehash.mjs`, before = the kit at `2e72216`, after = that copy with only the house sheets changed, on `gallery/index.html` (and the `lite` and `flat` tiers), `intent`, `shell` (closed, and with the notebook and a menu open), `windows`, `rack`, `info`, `gui`, `keyboard` (both windows open), `parts`, `folders`, `language` and `format`, theme × card × frost: no element and no pixel changed beyond the noise a second "before" capture masks. Hover, focus and press are held by the browser tests that load these sheets. `tools/lint-intent.mjs`: every `lit.*` count in the house sheets is at zero but the five above.
