# MIR · the contract between the kit and an app

What an app must do, what it may change, and what belongs to the kit. MIR 1.4.0.

## 1. Adoption

- **The kit is copied, never linked.** Copy it with `node <MIR>/tools/adopt.mjs <app>`, which writes `<app>/lab/mir/`, `<app>/lab/fonts/` and `<app>/MIR-MANIFEST.json`.
- **The two kit folders are the kit's alone.**
  - Never edit a file in them; change MIR and adopt again.
  - `adopt` removes any file there that the kit doesn't have.
  - `--check` reports each problem as `DRIFT`, `MISSING` or `EXTRA`.
- **`--check` must say `in step with MIR <version>` before every commit that touches the kit.**
- **The manifest records** the version, the kit commit the bytes came from (and whether that commit was dirty), and a hash for every file.
- **Every kit byte change bumps the kit's version.** Two different bytes must never share one version number.

## 2. Load order

Load these in `index.html`, in this order:

```html
<link rel="stylesheet" href="./mir/css/base.css">          <!-- tokens, layout, controls -->
<link rel="stylesheet" href="./mir/css/skin.css">          <!-- FROST: the materials, light and dark -->
<link rel="stylesheet" href="./mir/shell/shell.css">       <!-- if the app uses the shell -->
<link rel="stylesheet" href="./mir/shell/stage.css">       <!-- optional: λWAVES' ground -->
<!-- the app's own sheets -->
<link rel="stylesheet" href="./mir/modulation/modhost.css">              <!-- if the app uses modulation -->
<link rel="stylesheet" href="./mir/modulation/modwindow/modwindow.css">  <!-- LAST: nothing may follow it -->
```

A host that needs a different material writes its own sheet after the kit's and re-points the kit's tokens (§4). It never forks a kit file.

## 3. What the kit reads on `<body>`

These attributes and classes are the app's to set. The kit reads them and never sets them, except where noted.

| On `<body>` | Meaning | Written by |
|---|---|---|
| `data-theme="dark" \| "light"` | the theme | the app (λWAVES and BASINS: SETTINGS › THEME) |
| `data-card="tinted" \| "refractive"` | the card style: a tinted pane, or blur alone | the app. Nothing defaults it; without it a window has no pane |
| `.frost` | the frost policy: the blur is back, the tint thins to .58 | the app |
| `.frost-hold` | frost suspended while the picture moves; the pane is full again | the app |
| `.disconnected` | windows as a constellation: header chip, body card, air between | the app |
| `.phone` | the phone layout. The kit also raises `--phone: 1` at its own breakpoint, and the menubar reads either | the app |
| `.ui-hidden` | the interface is hidden (H) | the app. `createWindowActivity({ classes: { uiHidden } })` renames what window-activity reads; `mir/shell/shell.css` still hides the shell on `ui-hidden` itself |
| `.rack-hidden`, `.rack-peek` | a rack hidden, and peeking | the app. Renamed the same way |
| `.window-info-off` | every ⓘ panel hidden | the app. A contract name: `mir/css/skin.css` hides the panels on this exact class, so it is not renameable |
| `.control-hints-off` | hover hints silenced | the app. `setHelpClasses({ hintsOff })` renames it |
| `style="--acc: …; --acc2: …; --acc-ink: …; --acc-glow: …"` | resolved accents | `shell/accent.js`, or the app's own accent engine |

## 4. Tokens an app may re-point

Write them in the app's own sheet or on `<body>`. They are resolved where they are declared, so declare them on `<body>` or below.
**Breaking in 1.4.0:** the accents (`--acc`, `--acc2` and their soft tints) are declared on `<body>`, so an accent written on `<html>` or in a `:root` rule is shadowed there and ignored. Write accents on `<body>` (every known app already does); hue tokens written on `<html>` still work.

| Token | What it moves |
|---|---|
| `--hue-acc`, `--sat-acc`, `--lum-acc` | accent A. `--acc`, `--acc-soft` and `--acc-glow` follow (since 1.4.0) |
| `--hue-acc2`, `--sat-acc2`, `--lum-acc2` | accent B. `--acc2` and `--acc2-soft` follow |
| `--acc`, `--acc2`, `--acc-ink`, `--acc-glow` | the resolved accents, written directly; they win over the derivation |
| `--glass-blur` | the frost and notebook blur (λWAVES: SETTINGS › GLASS BLUR) |
| `--card-opacity`, `--glass-opacity` | how solid a tinted pane is |
| `--glass-hue`, `--glass-sat-tint`, `--glass-lum`, `--glass-tint` | the pane's tint |
| `--fg`, `--fg-soft`, `--ink-key`, `--dim`, `--ink-faint`, `--ink-shadow` | the ink ladder (BASINS' ink polarity re-points these) |
| `--rack-w` | the rack gutter. An app with no racks sets `0px`, and the shell's wordmark and notebook use the whole width |
| `--ui-scale` | the modulation window's scale (the kit's other sheets don't read it yet) |

Two families of tokens are written by the app and read by the kit (`tools/lint-tokens.mjs` checks both):
- `--accent-sweep`: an accent dial's arc, per dial;
- `--cx`, `--cy`: the busy mark's pointer position.

## 5. Ids and one-per-page parts

| Id | Owner |
|---|---|
| `#title` | the wordmark (`shell/wordmark.js`), which also opens the menus |
| `#menubar` | `shell/menubar.js`; one per page, `destroy()` removes it |
| `#notebook` | `shell/notebook.js`; one per page, `destroy()` removes it |
| `#controlHelp` | `control-help.js`'s hover hint; installed once |
| `#modwin` | the modulation window (`createModWindow`) |
| `#mirTurn` | the `<style>` that `shell/accent.js` writes for the mark's turn |
| `devt-<id>`, `devb-<id>` | a `device()`'s title and body |

## 6. Events

| Event | From | When |
|---|---|---|
| `devclose` | a `device()` root (bubbles) | its × was pressed. The window has the `.closed` class |

## 7. Storage

The kit writes `localStorage` only here:

| Key | Owner | Default |
|---|---|---|
| `<storageKey>`, `.title`, `.subtitle`, `.size` | `createNotebook({ storageKey })` | `mir.notebook` |
| `PRESET_LS` | `mod.js` | `lambdawaves.q0.modpresets` (λWAVES', inherited by BASINS and NEBULA; each app has its own origin, so they never meet). Not injectable yet: `mod.js` stays byte-identical to its source while λWAVES' §16 gate proves it |

## 8. Laws the kit keeps for an app

- **Idle is zero work.** A window that is closed, folded, powered off or off screen does not compute (`window-activity.js`).
- **The single-key law.** Controls never take Enter or Space; those stay the app's. Typing in the notebook reaches no app key except Ctrl/⌘+S and Ctrl/⌘+,.
- **A gesture belongs to the pointer that started it.** A capture that can't be taken must not throw. Cancel and lost capture end a gesture like pointerup.
- **Touch targets are 44 px** (`--touch`) wherever the pointer is coarse.
- **Text in hover hints steps aside for a hand on a control**, and shows for the keyboard.
- **Colour comes from tokens.** `tools/lint-tokens.mjs` proves every token the kit reads is written; it does not police literals, and the kit still carries some (the ⓘ panel's glass, the modulation window's sheet), each a candidate for a token.
