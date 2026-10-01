# MIR · the performance tier (1.5.0-alpha.2)

One attribute on `<html>` trades the glass for frame time. The switches are token values in `mir/css/tokens.css`, in the `mir.tier` layer, behind `:where()` gates. With no attribute, nothing in that sheet applies, and the kit draws exactly what 1.4 drew (proof: `tests/tier.browser.mjs`, and stylehash on six pages).

Plan §5.2 and §6.6–6.7. Audit: F1 §4.3 and §5.

## What each tier switches

| Tier | `data-ui-tier` | What changes |
|---|---|---|
| **full** | absent or `full` | nothing |
| **lite** | `lite` | **No backdrop filter anywhere.** `--surface-filter` and `--surface-lift` are `none`, and so are the bridges `--frost-filter` and `--glass-filter` (the modulation sheets still read those).<br>**A legible pane.** `--surface-fill` and `--surface-veil` get the TINTED fill `hsl(var(--glass-tint) / var(--card-opacity))`. A refractive pane, the frost-thinned .58 pane, the notebook and the menus then sit on a tint, not on the bare picture.<br>**One shadow layer.** Every pane height (`--surface-shadow`, `-float`, `-menu`) is one layer falling down: `0 1px 2px`, black .16 on dark and navy .09 on light |
| **flat** | `flat` | Everything lite does, plus:<br>**Control relief off:** `--relief-raise` and `--relief-well` become `0 0 0 0 transparent`.<br>**Pane shadows off:** all three heights become `0 0 0 0 transparent`.<br>**Sheen off:** `--surface-sheen: none`.<br>**Motion 0s:** `--t-fast`, `--t-soft`, `--t-linger`, and core.css's `--motion-micro`, `-ui`, `-structural` |
| *(media)* | `prefers-reduced-transparency: reduce` | The lite **surface** values (filter, lift, fill, veil, shadows), whatever the tier. Flat still wins its own values |

Not switched by any tier:
- **The busy mark** (`--logo-turn`). It says the app is working.
- **The value tooltip and badge glows** in an accent or status colour. They carry meaning.
- **The carried window's lift** (`.dev.dragging`). It shows only during a drag.

## How an app or the GUI window sets it

```js
document.documentElement.dataset.uiTier = 'lite';      // or 'flat'
delete document.documentElement.dataset.uiTier;         // back to full
```

1. Load the sheet once, anywhere after `base.css`. Its layer is ranked by base.css's order statement, so the `<link>` order does not matter:

   ```html
   <link rel="stylesheet" href="mir/css/tokens.css">
   ```

2. Set the attribute. The gallery's seat row has a **TIER** control that does exactly this.
3. The coming **GUI QUALITY** row (plan §6.6: FULL, BALANCED, LIGHT, AUTO) writes the same attribute. The governor writes it too, stepping down when frames are late and back up after three healthy seconds.
4. Nothing else needs to change: the kit reads the values where it paints.

## What a skin may set

A skin sets the **semantic** names. Each one is read at the place of use with the 1.4 value as its fallback, so an unset name changes nothing.

| Group | Names |
|---|---|
| Pane | `--surface-fill`, `--surface-sheen`, `--surface-veil`, `--surface-filter`, `--surface-lift`, `--surface-edge`, `--surface-edge-width`, `--surface-radius`, `--surface-shadow`, `--surface-shadow-float`, `--surface-shadow-menu` |
| Control relief | `--relief-raise`, `--relief-well` |
| State | `--state-hover`, `--state-press`, `--state-on`, `--state-disabled` |
| Type | `--label-tracking`, `--label-case`, `--font-display` |

How a skin and the tier meet:

- **The tier beats a skin layered below it.** `mir.tier` ranks after `mir.kit` and `mir.core`, so a skin written into a lower layer cannot undo the tier.
- **An unlayered app or skin sheet beats the tier.** That is the 1.5 contract: an app sheet is in no layer. An app that declares these names itself must gate its values on `[data-ui-tier]` too, or put them in a layer below `mir.tier`.
- **A value with `var()` is resolved on the element that declares it.** A skin that writes `--surface-fill: hsl(var(--glass-tint) / .9)` on `:root` freezes `:root`'s tint, and the light theme's tint on `<body>` never reaches it. Declare such a value where the inputs are: on `<body>`, which is how the tier writes its fill.

## The two rules

1. **A switched-off blur is the whole filter `none`, never `blur(0)`.** `blur(0)` still allocates a render surface and costs a pass.
   - This is also why the frost bar-chip reads `var(--surface-filter, var(--frost-filter) brightness(1.03) saturate(1.03))`, with the whole chain as the fallback. A set `--surface-filter: none` then gives `none`, never `none brightness(…)`.
   - `tools/lint-intent.mjs` counts `blur(0` as a relief break.
2. **A switched-off shadow is `0 0 0 0 transparent`, never `none`.**
   - Several rules put a shadow token inside a list, for example `var(--relief-raise, var(--neu-raise)), 0 0 0 1px …`.
   - A list with `none` in it is invalid, and the whole declaration drops.

## Where the values live, and why

A value with no `var()` and no theme goes on `:root`. That covers filters `none`, relief, sheen and durations. Script reads it there too: `core/motion.js` reads `--motion-*` on `<html>`.

Two kinds of value go on `<body>`, where the theme and the tint are:
- **The fill.** It reads `--glass-tint`, which the light theme sets on `<body>`.
- **The shadows.** They differ by theme, and the kit's theme is `body[data-theme]`.

This is the same constraint that makes the 1.5 names read at the place of use instead of being declared as `:root` aliases.

## What is not on the tier yet

The modulation plugin's sheets (`mir/modulation/**`) do not read the 1.5 names yet.
- **Lite reaches them** through the `--frost-filter` and `--glass-filter` bridges, and the tier test holds them to it.
- **Flat does not reach their own shadows.** `tests/tier.browser.mjs` counts what is left (3 elements in the gallery: `.m2rail`, `.m2workbar.m2prebar`, `.m2workbar.m2pre`) and does not fail on it.
- The plugin lane's hunks route those sheets onto the names, and then the bridges can go.
