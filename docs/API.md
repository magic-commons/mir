# MIR · API

Every module the kit exports, what each export is, and what it returns. MIR 1.5.0-alpha.5.

Each module's own header holds its laws and their reasons. This page is the map to them.

How an app loads the kit, the body attributes it reads, the ids it owns and the tokens an app may re-point are all in [CONTRACT.md](CONTRACT.md).

Import paths below are from an adopted app's `lab/` folder: `./mir/…`.

---

## `mir/app.js` and `mir/mir.css`: the easy start (1.5.0-alpha.5)

| Export | What it is |
|---|---|
| `createApp(options)` → `Promise<app>` | The standard wiring, in the kit's order. Options: `name`, `key` (store prefix, default the name in lower case), `version`, `what`, `about` (ABOUT extras; `sub` under the wordmark), `stage`, `host` (default the stage's parent), `state`, `present()`, `clock` (`{ play, pause, isPlaying, onChange }`; default modulation's), `keys` (the app's key rows, ahead of the kit's), `menus` (`{ FILE, EDIT, VIEW, WINDOW, …, ABOUT, LANGUAGE, GUI }`, functions or arrays; given ones replace the kit's), `pages` (rows to add; page 0 greets), `subject()`, `thumbnail()`; and per piece `gui`, `transport`, `rack`, `mod`, `notebook`, `folders`, `info`, `greet`, `help`, `menubar`, `describe`: `false` to leave it out, an object of extra constructor options. Returns `{ name, key, first, param(key, label, min, max, more), params, playing(), clock, accent, gui, keys, transport, rack, mod, pages, notebook, folders, info, greeting, help, menubar, describe, floats }`. |
| `makeParam({ state, key, label, min, max, map, mod, onChange, id, make, …widget })` | One number as a kit control (`make`, default `knob`), a modulation target (`mod.add`; id `app.<key>`) and a saved value. → `{ id, key, label, unit, min, max, map, widget, root, home, get(), value(), set(v), remove() }`; `value()` is the base, never the modulated reading. |
| `PRESSABLE` | the selector `installPress` is given (`.sw, .seg-b, .trig, .tbtn, .mir-rack-btn`) |

**`mir/mir.css`**: every kit sheet, by `@import`, in the kit's order: `<link rel="stylesheet" href="mir/mir.css">`. Its header says which order still matters under the cascade layers. `tests/mir-css.node.mjs` fails if a sheet under `mir/` is missing from it or imported twice.

---

## `mir/kit.js`: controls and window chrome

### Builders
Each builder makes its own DOM, styled by `mir/css/base.css` and `skin.css`, and returns handles.

| Builder | Options | Returns |
|---|---|---|
| `knob(o)` | `label, aria, title, min, max, value, log, wrap, step, fmt, unit, size:'lg', cls, travel, fine, onInput, onChange, onDelta, onReset` | `{ root, get, set(x, silent=true), show(x), shown, setDefault(x), setDisabled(on), setBase(fn), paint }` |
| `fader(o)` | `label, aria, min, max, value, fmt, log, fine, cls, onInput, onChange` | `{ root, get, set, show(x), shown, setBase(fn), setDisabled(on), paint, setDefault, setLabel, dragging() }` |
| `seg(o)` | `label, aria, options:[{id,label,title}], value, onChange` | `{ root, get, set, button(id), paint }` |
| `sw(o)` | `label, value, title, onChange` | `{ root, get, set }` |
| `trig(o)` | `label, glyph, title, cls, onFire` | `{ root, setLabel, setGlyph, set on(v) }` (a trigger used as a state writes `aria-pressed`) |
| `readout(o)` | `label, value, cls` | `{ root, set(text, cls), setSub(text) }`. `cls` is `live`, `ok` or `warn` |
| `formula(o)` | `lines: [[string \| {s, v}]…], cls` | `{ root, set({s: v…}), names }` (only moved slots are written) |
| `device(o)` | `id, eyebrow, status, onPower, loadingMark` | `{ root, body, setOff, setLoading(v, key), popBtn, railBtn, foldBtn, off, loading, setStatus(text, cls), fold, row }` |
| `group(parent, label)` | | the group element |
| `gripDots(parent, size=13)` | | the 3 × 3 DRAG-ME grip |
| `chip(button, glyphName, label)` | | draws a glyph on a round chip |
| `el(tag, cls, parent, text)` | | the one DOM helper. Text in `<m>…</m>` is set as mathematics |

Notes on the builders:
- **The modulated look.** `show(x)` paints a value over the base: the knob's needle moves while a tick marks the base, and a fader gets `.mod`. `get()` stays the value the user set. A control driven by modulation announces its base once `setBase(() => base)` is wired.
- **Disabled.** `setDisabled(true)` removes the control from the tab order and sets `aria-disabled`. If the control had focus, focus moves to the window's power button.
- **`device()`.** It dispatches `devclose` (bubbling) when its × is pressed.
  - `loadingMark`: an element, a selector, or `false`. The default is the wordmark's mark (`#title .mark`).

### The drag law

| Export | What it is |
|---|---|
| `setKnobLaw({ travel, fine, keyFine, faderFine, touchTravel })` | Retunes the law and returns the law in force. Defaults: `travel 220`, `fine 900/220`, `keyFine .25`, `faderFine 5`, `touchTravel 320`. |
| `dragTravel(event, { touch, travel, fine })` | Pixels for a full scale under the law. It's for drag surfaces the kit did not build. |
| `tapWatcher(fn)` | The shared double-tap detector (320 ms). |

About `setKnobLaw`:
- `fine` alone retunes every Shift at once. BASINS' Shift = ⅛ is `setKnobLaw({ fine: 8 })`.
- Explicit parts win, so `setKnobLaw(setKnobLaw())` changes nothing.

### Ink, colour and canvas helpers

| Export | What it is |
|---|---|
| `lightTheme()` | `true` on the light theme |
| `onThemeChange(fn)` → `unsubscribe` | Called when `body[data-theme]` flips; repaint a canvas here |
| `parseCssColor(text)`, `cssRGB(ctx, name, fallback)` | Read a CSS colour (hex, rgb, hsl, `color(display-p3 …)`) as 0–255 RGB |
| `themeInk(…)`, `vividInk(…)`, `inkRatio`, `nRGB`, `N_COLOR`, `N_RGB`, `N_RGB_LIGHT` | The six data inks `--n1…n6`, per theme, for canvas drawing |
| `setAccentRGB(a, b)`, `accentRGB(ctx, n)` | The accents as numbers, for canvas views (`shell/accent.js` writes them) |
| `graphHover(canvas, { objects, plot, repaint, draw })` → `{ set, hit, clear, plot }`, `showGraphTip`, `hideGraphTip` | Hover labels on a canvas graph |
| `fitText(…)` | Shrink a label into its box |
| `hasMath(s)`, `mathText(node, s)`, `mathPlain(s)` | The `<m>` maths marker: detect it, set it, or strip it for an attribute |

---

## `mir/css/base.css`, `mir/css/skin.css`: tokens and materials

These are not modules. Tokens live on `:root` in `base.css`, are re-pointed in `skin.css`, and the light theme lives under `body[data-theme="light"]`. The kit's own material is **FROST**:
- tinted and refractive cards, with frost as a policy over both (`body.frost`, `.frost-hold`);
- disconnected windows (`body.disconnected`);
- neumorphic seats;
- the phone breakpoint, which raises `--phone` to 1.

See [CONTRACT.md](CONTRACT.md) for the tokens an app may re-point, and `tools/lint-tokens.mjs` for the check that every token the kit reads is written somewhere.

Since 1.5.0-alpha.3 a skin may also set the state and height tokens the house reads (the meanings are [INTENT.md](INTENT.md)'s; the full list is [TOKENS.md](TOKENS.md)): `--state-on`, `--state-on-rim`, `--state-on-light`, `--state-press-scale`, `--state-disabled`, `--state-focus` (an `outline` shorthand), `--state-carried`, `--surface-shadow-float`, `--surface-shadow-menu`. Under FROST · STILL (`body.frost-hold`) a REFRACTIVE pane stops blurring and wears the tinted fill.

---

## `mir/glyph.js`: drawn marks, never font characters

| Export | What it is |
|---|---|
| `glyphNames()` | Every glyph name (see the gallery) |
| `hasGlyph(name)` | Whether a glyph exists |
| `glyphSvg(name, cls, size)` | The glyph as an SVG string |
| `glyphEl(name, cls, size)` | The glyph as an SVG element |
| `setGlyph(el, name, { label })` | Draw a glyph into a button and set its accessible label |

## `mir/palette.js`: colour science and the palette catalogue

| Export | What it is |
|---|---|
| `rgbToOklab`, `oklabToRgb`, `hexToRgb`, `rgbToHex` | 0–1 RGB triples |
| `relLuminance`, `contrastRatio(a, b)` | WCAG 2.x |
| `visibleInk(rgb, ground, floor = 3)` | The same hue and chroma, at the nearest lightness that clears `floor` against `ground` |
| `normalize(stops)`, `toLUT(stops)` | A 256 × RGBA table, interpolated in OKLab |
| `cyclic(stops)` | The seam size |
| `hsvWheel(n, s, v)` | An HSV wheel as stops |
| `PRESETS`, `PRESET_BY_ID`, `PRESET_GROUPS` | The 23 palettes, grouped by point count |

## `mir/control-help.js`: hints that step aside, and one help surface per window

| Export | What it is |
|---|---|
| `installControlHelp(root = document)` | Every `[title]` becomes a hint shown after `HELP_HOVER_DELAY` (600 ms) |
| `infoPanel(content, label)` → `anchor` | An ⓘ button whose panel holds `content`: hover or focus to peek, click to pin, Escape closes |
| `consolidateWindowHelp(root, { sources })` | Gathers each window's notes into one ⓘ in its header. `sources` defaults to `.note:not(.link-note), .sp-fx` |
| `HELP_CLASSES`, `setHelpClasses({ hintsOff })` | The two body switches that silence help: `control-hints-off` (an app may rename it) and `window-info-off` (a CSS contract name, not renameable) |

How a hint behaves once installed:
- **A hand on a control closes it.** A press, a wheel or an operating key closes the hint, and it stays closed until the pointer leaves and returns.
- **Focus shows a hint only from the keyboard.** A click's own focus doesn't reopen it.
- **A control's key shows in its hint.** A node with `data-key-hint` (written by `keys.hints(root)`, `mir/shell/keys.js`) shows the key after its words, untranslated.

## `mir/window-activity.js`: idle is zero work

`createWindowActivity({ body, onChange, rackIds = ['rack', 'rackL'], classes: { uiHidden, rackHidden, rackPeek } })` returns `{ track(window), canPresent(window), state(window) → { active, intersecting, reason }, presentOffscreen(on), tracked, changes, disconnect }`.

A window does no presentation work while it is off, closed, folded, compact, hidden, in a hidden rack or off screen.

## `mir/slider-keys.js`

`bindSliderKeys(element, { get, set, editable })` gives a 0…1 host slider arrow keys: arrows move 0.01, Shift 0.001, Home and End go to the ends. Space is left to the app.

## `mir/plane-model.js`

`planeModel(host, { getNormal, getPosition, onTurn })` returns `{ root, paint(force), destroy() }`. It is the sphere-and-plane orientation control:
- dragging or the arrow keys tilt the plane about world X and Y, Shift for fine, and Home resets;
- it is sharp at every device-pixel ratio and repaints itself on a theme flip; an accent change shows on the app's next `paint()`.

## `mir/core/i18n.js`: one translation seam ([LANGUAGES.md](LANGUAGES.md))

- `t(en, vars?, context?)` → the current language's string, or the English. `{name}` substitution: a var `{ t: 'English' }` and an inline `{:LABEL}` are translated in turn, any other var is data. `context` (or the key `context::English`) is one meaning of a word that has two; the context `name` is never translated.
- `tn(n, one, other, vars?, context?)` → a count: English one/other by English rules; a pack entry `{ zero, one, two, few, many, other }` chosen by `Intl.PluralRules`; a missing form is `other`, a missing entry the English.
- `phrase(en, context?)` → the catalogue key, translating nothing (marks a string the extractor must see). `english(key)` → the English a key shows.
- `setLanguage(tag)` → `Promise<boolean>`; `language()`, `direction()`, `languages({ dev })`, `LANGUAGES`, `onLanguage(fn)` → off, `missing()`, `addLocales(urlOrFn)`.

`mir/kit.js`: `label(node, en, vars?, context?)`, `ariaLabel(node, en, vars?, context?)`, `hint(node, en | [en, vars], vars?, context?)`, `placeholder(input, en, vars?, context?)`, `relabel(root?)`. A builder's `title` may be `[en, vars]`. `knob()` and `fader()` roots are `dir="ltr"`.
`mir/glyph.js` `setGlyph(el, name, { label, vars })`.
A pack: `{ tag, name, dir, reviewed, fonts, type, strings: { English: "…" | { one, few, many, other } }, review?: { key: why } }`.
`tools/i18n-extract.mjs`: the catalogue's `strings`, `notes`, `names`, `sources`; `// tr:` / `// tr[KEY]:` notes; `--check`.

- `mir/shell/language.js`: `languageMenu({ languages, dev, storageKey })` → a menu entries function (`menus.LANGUAGE`); `startLanguage({ languages, storageKey })` → `Promise<tag>`; `pickLanguage(prefs, languages)`.
- `mir/locales/pseudo.js`: `pseudo(s)`, `unpseudo(p)`. `mir/locales/locales.css` (layer `mir.kit.locale`): load after base.css.
- `createMenubar`: an entry is `[label, run, disabled?, hint?, { raw?, current? }]`; `openGroup(name)` takes the English group name.
- `control-help.js`: a hinted node carries `data-help-en` (the English, stable) and `data-help` (shown, translated). `infoPanel(content, label)` also takes `[template, vars]`.
- `about.js`: a rich-text part may be `{ t, vars }`; a var that is `[text, href]` is a link inside the sentence.

## `mir/core/prefs.js`: browser preferences

- `createPrefs({ key, schema, presets, storage, doc, context })` → `{ get(k), set(k, v) | set(patch) → changedKeys, reset(), all(), subscribe(fn(state, changed)) → off, apply({ now }), preset(), applyPreset(id), presets, resolve(), env(), destroy() }`
- A schema row: `{ key, type: 'enum' | 'bool' | 'number', values?, min?, max?, step?, wrap?, default, apply: [{ on, attr, map? } | { on, cls, when? } | { on, prop, map? } | { run(v, state, env, context) }] }`
- Pure: `valid`, `defaults`, `repair`, `coerce`, `resolve(state, schema, env)`, `matchPreset(state, presets)`

## The portable format: `mir/core/envelope.js`, `png.js`, `intake.js` ([FORMAT.md](FORMAT.md))

### `core/envelope.js`

| export | what |
|---|---|
| `FORMAT` | the format version this code writes and reads (1) |
| `KIT` | the kit version written into `kit` (`mir/version.js` `MIR_VERSION`) |
| `KINDS` | `['settings', 'skin', 'project', 'page', 'spec']` |
| `LIMITS` | the size caps (file 32 MB, project 24 MB, page 2 MB, one skin value 400 characters …) |
| `wrap(kind, data, { kit?, app?, name?, made? })` | a new envelope. Throws only on an unknown kind |
| `unwrap(text \| object \| Uint8Array)` | `{ envelope, errors }`: parse, read the frame, refuse a newer format, migrate an older one |
| `stringify(envelope)` | the file text |
| `pack(envelope)` | `Promise<string>`: `'mir1.z.'` + base64url(deflate-raw(JSON)), or `'mir1.j.'` without CompressionStream |
| `unpackText(text)` | `Promise<{ envelope, errors }>`; inflates at most 1 MB; never throws |
| `check(envelope, { tokens, settings?, app? })` | `{ ok, errors: [{ path, why }], warnings, envelope }` — the clean copy, or null. Never throws |
| `checkSkinValue(row, value, known)` | null, or the reason one value is outside its type's grammar |
| `skinValues(skinData, theme)` | `{ '--token': value }` for one theme (`tokens`, then `dark`/`light` over it) |
| `migrate(envelope)`, `MIGRATIONS` | lifting an older format (empty today) |
| `RANGES`, `KEYWORDS`, `FONTS` | the number ranges, keyword sets and font families the grammar uses where the schema has none |

### `core/png.js`: a picture that carries an envelope

| export | what |
|---|---|
| `embed(pngBytes, envelope \| text)` | a new PNG with one `iTXt` `mir` chunk before IEND (an older one replaced); null if not a PNG |
| `extract(pngBytes)` | the envelope (frame read, data not yet checked), or null. Never throws |
| `extractText(pngBytes)` | the chunk's text, or null |
| `chunks(pngBytes)` | `[{ type, start, length, crcOk }]` up to IEND, or null |
| `crc32(bytes)` | the PNG CRC-32 |

### `core/intake.js`: the one way in

| export | what |
|---|---|
| `createIntake({ target, accept?, check?, onEnvelope, onReject?, paste? })` | drop on `target`, paste on the document (not in a text field), `pick()` for the file picker; `→ { pick, ingest(input, opts), destroy }`. While a file is over the target it carries `.mir-prox-host[data-prox="capture"]` (core.css draws the guide) |
| `readInput(input, { name?, type?, accept?, check?, source? })` | `Promise<{ ok, envelope, errors, warnings, source }>` for a File/Blob, a string or bytes — the same door without listeners |

## `mir/version.js`

`MIR_VERSION`: the kit's version, equal to `package.json`'s (`tests/version.node.mjs`). The GUI window shows it; every envelope carries it.

## `mir/info/`: INFORMATIONAL, words on the picture ([INFORMATIONAL.md](INFORMATIONAL.md))

### `info/page.js`: a page on the picture

- `parsePage(md) → { blocks: [{ md }], labels: [{ anchor, kind, line, title, md }] }` — pure. A label is `> [!mir|anchor word?] Title?` followed by `>` lines; `kind` is `'feature' | 'place' | 'control'` (`@…` a place, `ui:…` a control); `line` is `'auto' | 'flat-first' | 'diagonal-first'` (`flat`, `diagonal` in the callout). Other callouts stay prose; `---` on its own line separates blocks; fences, CRLF, a BOM and front matter are handled.
- `anchorKind(anchor)` → the kind.
- `showPage(layer, page, { place?, controls?, pane?, hold? }) → { clear(), page, blocks, labels }` — `page` is a pages-model row, a markdown string or a parsed page. One page per layer: showing another runs the old page's exit, then the new one's entrance. `place(text) → { x, y, r } | null` in stage px, asked on every `viewChanged()`.
- `greet(layer, pages, { hold = 2500, first?, onDismiss?, place?, controls?, pane? }) → { shown, dismiss() }` (`first`: page 0 only up to its first `---`; `firstPart(md)` exported) — page 0 when `pages.shouldGreet()`; leaves on Escape or on the first press on the stage after the hold.

### `info/seats.js`: the seat chooser (pure)

`chooseSeat(cands, obs, opts) → index`, `scoreSeat`, `troubleOf`, `SEAT`, and the geometry `segCrossesSeg`, `segHitsBox`, `clipLength`, `overlapArea`.

### `info/layer.js`: additions

`createInfoLayer({ …, pane = false, controls = null, keys })` (with the app's key table the layer listens to no key of its own); `layer.hold(on)`; `infoActions(get, { keys = ['I'] })` → the `info-hold` row; `HOLD_KEY` (`'KeyI'`); `addLabel({ anchor: 'ui:name', control? })`; `addBlock({ pane? })`; `setPane(on)`; `layer.stage`. A `() => null` anchor hides its labels.

---

## `mir/shell/`: the wordmark, the menubar, the notebook, ABOUT, the accent

| Export | What it is |
|---|---|
| `wordmark(parent, { lead, word, sub, id = 'title' })` | `#title`, with an optional lead glyph (λWAVES' λ) |
| `markSvg()` | The nine-square mark |
| `createMenubar({ opener, host, menus, label, phone, keep })` | FILE · EDIT · VIEW · WINDOW · ABOUT (and LANGUAGE, GUI) under the wordmark. An entry is `[label, run, disabled?, hint?, { raw?, current? }]`. On a phone the bar wraps onto a second row and an open list stays on the screen. Returns `{ bar, open(focus), close(), openGroup(name), isOpen, items, destroy() }` |
| `createNotebook({ host, name, title, storageKey, about, faces, render, vendor, logo, onLogo, dump, keyLabel })` | The glass with NOTES and ABOUT. Returns `{ root, open(face), close, toggle, isOpen, face, moveTo, resize, size, dump, text, title, subtitle, mode, setMode, render, html, destroy() }` |
| `loadRenderer()` | Loads marked and KaTeX from `shell/vendor/`, once, only what the page hasn't loaded |
| `aboutFace(face, data)` | The ABOUT face from data |
| `gplLicence(name, { license, notice })`, `kitType(extra, fontsPath)` | The default licence and type lines |
| `richText(node, line)` | Text and `[text, href]` parts. No `innerHTML`; unsafe schemes are dropped |
| `safeHref(u)` | Whether a link's scheme is safe |
| `createAccent({ accentStops, wheelStops, paletteOn, a, b, vivid, hueShift, stageGround, gamut, onAccent })` | Accents A and B as angles on a palette, plus the mark. Returns `{ apply, set(patch), wheelColor, accentColor, markInk, paintMarks, turn, busy(on), hueSat, a, b, vivid, hueShift, paletteOn }` |
| `STAGE_GROUND`, `CARD_GROUND`, `MARK_SELECTOR` | The two stage grounds, the two card grounds, and the marks that `paintMarks()` paints |
| `renderNotebook(markdown, { marked, katex })` | Sanitised markdown with maths (λWAVES' renderer) |
| `renderNotebookMath(tex, display, katex)` | One formula, with an escaped fallback |

Notes on the shell:
- **Menus are data:** `name → () => [[label + '\t' + key, run, disabled, hint] | null, …]`.
- **App faces:** each face in `faces` is `{ id, glyph, label, title, build(faceEl, api), show(faceEl, api) }` and gets a round button after ◐.
- **Accent defaults:** A 30°, B 300°, vivid 0.1, as λWAVES ships. Josh's law is `{ a: 60, b: 300 }`.
- **Sheets:** `shell/shell.css` is required for the shell. `shell/stage.css` is an optional ground.

### Pages and the notebook's tabs: `mir/shell/pages.js`, `mir/shell/notebook.js` ([NOTEBOOK.md](NOTEBOOK.md))

`createPages()` → `{ list, get, index, add, update, remove, move, greeting, shouldGreet, showOnOpen (get/set), copyOut, capture, beforeCapture, restore, signature, subscribe, part }`. A page is `{ id, title, md, shared }`; `pages[0]` is the greeting. `beforeCapture(fn)` → `off`: `fn` runs at the top of every `capture()` (a hook that throws is isolated), so a debounced editor writes its last keystrokes first. Also `pageFromNotebook({ title, subtitle, text })`, `pageFile(page) → { name, text }`, `pageFromFile(name, text) → { title, md }`.

`createNotebook(options)` — new option `pages` (a `createPages()` model): the notebook gets a tab strip, YOURS then the project's pages, and registers its flush with `pages.beforeCapture`. A face in `faces` that carries `store` is the shelf (COPY TO SHELF writes there). Without `pages` nothing changes. New on the returned object:
- `pages` — the model, or null · `shelf` — the shelf store, or null
- `selected` — `'yours'` or a page id · `select(key)` — a missing id selects yours
- `yours` — `{ title, md }` of the YOURS tab · `openNote({ title, md })` — into YOURS, selected and shown
- `addFiles(files)` → Promise<count> — `.md/.markdown/.txt` files as pages
- `flush()` — write pending page edits and storage now

Sheets: `mir/core/core.css` (drop guides) and `mir/shell/pages.css` after `mir/shell/shell.css`.

### The shelf: `mir/notes/`

`createShelf({ storage = localStorage, key = 'mir.notes', now })` (`mir/notes/shelf.js`, pure) → `{ key, list(), folders(), recent(), get(path), has(path), save(path, { title, md }), open(path), rename(from, to), remove(path), freePath(path), exportNote(path) → { name, text }, importNote(fileName, text, folder?), repaired, error, subscribe(fn(what, path)) }`.
Storage: `{ items: { [path]: { path, folder, name, saved, opened, title, md } }, recent: [≤5 paths] }`. Writes return the result or null/false with words in `error`; nothing throws. A damaged store is copied whole to `<key>.corrupt` and mended. Also exported: `normPath`, `splitPath`, `repair`, `RECENT` (5).

`notesFace({ store = createShelf(), glyph = '▤', label = 'shelf' })` (`mir/notes/face.js`) → a face `{ id: 'shelf', glyph, label, title, store, build, show, current }` for `createNotebook({ faces })`. Sheet: `mir/notes/notes.css`.

### The rack: `mir/shell/rack.js` ([RACK.md](RACK.md))

- `createRack({ host, sides, key, store, favourites, transport, seats, phone, chrome, handle, onChange })` → `rack`
- **Windows.**
  - `rack.register({ id, title, side, open, glyph, hint, key, status, build(body, api), onOpen, onWake, onClose, onSleep, onFold, onPower, onPresent })` → id. Built on first open.
  - `rack.start()` applies the saved layout. It also runs by itself after the creating task.
  - `rack.open(id, { side, index })`, `close(id)`, `toggle(id)`, `isOpen(id)`, `raise(id)`, `fold(id, on?)`, `move(id, { side, index })`.
  - `rack.float(id, at)`, `dock(id, { side, index })`, `toggleFloat(id)`, `setCompact(id, on)`.
- **Hiding and the transport.**
  - `rack.setHome('bottom' | 'top')` is the transport's resting seat (the user's choice on the bar); the dodge prefers it. `rack.spec(id)` is a registered window's description, for the bar's openers.
  - `rack.setHidden(on)` is the one hide path. Also `toggleHidden()`, `hidden` and `peek`.
  - `rack.setInterface(shown)` is H; the edge handle is the way back.
  - `rack.dodge(rect | null)` moves the transport to the free seat; `seat` says which.
- **Menus.**
  - `rack.windowMenu({ rack, rackKey })` gives the rows for `createMenubar({ menus })`.
  - `rack.addMenu` is `{ open, close, shown, queued, commit }`; `rack.favMenu` is `{ open, close, shown }`.
- **The layout.**
  - `rack.capture()` → `{ v, at, hidden, phoneShown, cards: [{ id, side, open, folded, off, float }] }`; `rack.apply(layout)`.
  - `saveLayout(slot?)`, `loadLayout(slot)`, `forgetLayout(slot)`, `layouts()`.
- **Reading the state.** `windows()` → `[{ id, title, side, open, built, floating, folded }]`, `keepClear()` → the rects of the racks showing a window and the transport bar (`[{ left, top, right, bottom }]`), `built`, `registered`, `isBuilt(id)`, `window(id)`, `order(side)`, `floating()`, `floatOf(id)`, `phone`, `dragging`, `cancelDrag()`, `activity`, `el`, `sync()`, `destroy()`.
- **Pure helpers.** `reorderIndex`, `insertionIndex`, `slotRect`, `moveId`, `clampFloat`, `detached`, `peekSide`, `dodgeSeat`, `queueToggle`, `openOrder`, `favSlot`, `readLayout`, `layoutLabel`, `localStore`, `RACK`, `SIDES`.
- **`mir/shell/rack.css`** loads after the kit's sheets and core.css, in `mir.kit.house`.

### The GUI window: `mir/shell/gui.js` ([GUI.md](GUI.md), [THEMES.md](THEMES.md))

- `createGui({ host, prefs, app, about, accent, defaults, storageKey })` → `{ root, window, prefs, open(page), close(), toggle(page), page, turn(dir), moving(bool), dropGuides(), census(), applyTheme(id), applyTone(id), themeCost(id?), light, parallax, destroy() }`; `open('options' | 'options:2' | 'about')`.
- `lookSchema()` → the schema rows (35 options) · `LOOK_PRESETS` → `{ [themeId]: theme options }` · `THEMES`.
- `glassTint(bright, hue, tint, theme, saturation = 1)` → `'H S% L%'` | null · `census(doc)` → `{ blur, shadow, shine }` · `stepper(o)` · `migrateShadow(key, win)` · `SKINS`, `MIR_VERSION`, `MIR_WORDS`.
- Sheet: `mir/shell/gui.css`.

### The vanilla themes: `mir/shell/themes.js`

A vanilla theme is a named set of the built-in settings and nothing else; its tones are named sets of only the colour options.
- `THEMES` → `[{ id, name, values, tones: [{ id, name, values }] }]` (FROST · MORPH · CLASSIC · SWIFT · AURORA · NEON) · `THEME_KEYS` · `COLOUR_KEYS`.
- `themeById(id)` · `themeValues(id)` → the theme's options + its first tone · `toneValues(themeId, toneId)` · `matchTheme(state)` → id | `'custom'` · `matchTone(state, themeId)` → id | `'custom'`.

### The look's arithmetic: `mir/core/look.js` (pure)

- `glassTint({ bright, hue, tint, saturation }, theme)` → `'H S% L%'` | null (BASINS' `applyGlass`) · `glassVeil({ veil, bright, hue, tint, saturation }, theme, homeVeil = 10)` → `'rgb(r g b / a)'` | null.
- `autoInk(state, theme)` → `'light' | 'dark' | null` · `solidInk(state, theme)` · `solidRelief(state, theme)` → `{ lift, sink, gain }` · `paneLightness(state, theme)`.
- `paneShadow({ shadow, lightAngle, shadowDist, shadowSoft }, theme)` → a box-shadow (BASINS' ABOUT shadow) · `lightOffset(angle, d)` → `{ x, y }` · `lightIsHome(state)`.
- `SPACING`, `spacingPx(level)` → `{ gap, inset, pad, rail }` · `THEME_GLASS` · `LIGHT_HOME` · `hslRgb(h, s, l)`.

### Pointer effects: `mir/fx/`

- `createPointerLight({ doc, enabled })` → `{ refresh(), destroy(), live }` — surfaces opt in with `data-light`; writes `--light-x/--light-y` (px) and `data-lit`; `<html data-pointer-light>` while live.
- `createParallax({ doc, enabled })` → `{ refresh(), destroy(), live }` — elements opt in with `data-parallax="<px>"`; writes `--plx-x/--plx-y`; `<html data-parallax-live>` while live.
- Pure: `fxAllowed({ coarse, motion, tier })`, `fxEnv(doc)`, `watchFxMedia(doc, fn)`, `parallaxOffset(px, py, view, depth)`.
- Sheet: `mir/fx/fx.css` (`@layer mir.kit.house`).


---

## `mir/shell/transport.js`: the transport, its parts, its layouts, the main opener ([TRANSPORT.md](TRANSPORT.md))

The kit gives the parts and the look; the layout is the app's (BASINS' design, λWAVES' arrangement from the same parts).

- `createTransport({ layout = BASINS_LAYOUT, bar = 'float' | 'work', nodes, clock, mod, model, setBpm, persist, openers, rack, keys, store, key = 'mir.transport', opener = true, onRefused, onInterface, host, root, id = 'transport' })`
  → `{ root, layout, parts, el: { play, power, door, pill, field, panel, seat, dock, back, menu, openers }, toggle(), play(), pause(), setBpm(v), bpm, edit(), moved(rect | null), setSeat(seat), seat, dock(on), docked, seatMenu(show), sync(), refresh(), start(), destroy() }`
  - `layout`: an array of part names (`play`, `power`, `door`, `tempo`, `panel`, `tap`, `rewind`, `openers`, `seat`, `dock`), `app:<name>` (from `nodes`), DOM nodes and `{ group, items }`.
  - `clock`: the ONE play's clock `{ play(), pause(), isPlaying(), toggle?(), onChange?(fn), seek?(beat) }`; `mod`: `installModulation`'s result (modulation is a power button, never a second play). `model` is `mir/modulation/mod.js` (`BPM_DEFAULT` 30).
  - `openers`: `[{ id, label, glyph?, key?, action?, hint?, open(), close?(), toggle?(), isOpen }]` or a function returning it. Seats BOTTOM / TOP / COMPACT; TOP uses the rack's `setHome(seat)`.
- Parts (each `→ { root, sync(), destroy() }`, with a `signal`): `playButton({ clock, onRefused })`, `modPower({ mod })`, `modDoor({ mod })`, `tempoPill({ tempo, panel })`, `tempoPanel({ tempo, mod })`, `tapButton({ tempo })`, `barButton({ cls, glyph, svg, text, label, title, run })`, `latch(opener)`, `wayBack({ run })`; `createTempo({ model, setBpm, mod, persist })` → `{ get, set, commit, min, max, onChange }`.
- `BASINS_LAYOUT`, `LAMBDAWAVES_LAYOUT`, `layoutNames(layout)`, `SVG_REWIND`, `DOCK_ID`. `bar: 'work'` is the transport inside a work bar (BASINS' timeline-mounted form: 52 px tall, its seats the bar's button face); `BARS`, `BAR_SEATS`.
- `firstRun(...stores)`, `rackOpeners(rack, { only, glyphs })`, `transportActions(get)` (Space: the one play).
- Pure: `formatBpm`, `clampBpm`, `digitStep`, `charAt`, `dragBpm`, `keyStep`, `parseBpm`, `seatOf`, `homeOf`, `seatRect`, `menuSide`, `localSeatStore`, `menuRow`, `openerRows`, `isOpenOf`, `toggleOf`; `TRANSPORT`, `SEATS`.
- Sheet: `mir/shell/transport.css` (after `rack.css`), `@layer mir.kit.house`; tokens `--xport-*` on `.mir-transport`.

---

## `mir/shell/keys.js` and `mir/keyboard/`: one key table, the keyboard window, the help view

The keyboard is data: one table of actions, from which the kit makes the listener, the menu key column, the hints, the
help view and the KEYBOARD window ([KEYS.md](KEYS.md)). Load `mir/keyboard/keyboard.css` after `mir/window/window.css`.

| Export | What it is |
|---|---|
| `createKeys({ actions, storage, platform, target })` | The table. An action is `{ id, label, group, keys, run(event, action), when?, hint?, inFields?, overControls?, repeat?, short?, up? }` (`overControls`: runs even when a focused control owns the key, never in a text field unless `inFields`; `up(event, action)`: a held key, run on press and `up` on release or blur); `storage` is `{ get(), set(obj) }`; `platform` is `'mac'` or `'other'` (detected). Returns `{ run, bind, unbind, reset, resetAll, check, holders, conflicts, record, answer, stopRecording, recording, menuKey, menuItem, hint, hints, helpRows, describe, list, get, chords, saved, restore, onChange, platform, destroy }` |
| `localKeyStorage(name)` | A `{ get, set }` over localStorage that survives a private window |
| `parseChord(s, platform)`, `normalize(s, platform)` | Any accepted spelling → `{ mods, code }` / `'Mod+Shift+KeyS'`, or `null` |
| `chordFromEvent(e, platform)` | The chord a keydown is (`null` for a modifier alone) |
| `displayChord(chord, platform)`, `keyText(code, platform)`, `modText(mod, platform)`, `ariaChord(chord, platform)` | `⇧⌘S` / `Ctrl+Shift+S`; a cap's legend; a modifier's chip; the `aria-keyshortcuts` spelling |
| `pickAction(entries, chord, { field, repeat, owned })` | The action a chord runs: table order, the first whose `when()` holds; `owned` (a focused control owns the key) picks only an `overControls` action |
| `isField(node)`, `ownsKey(node, chord)` | A place the user types; a key a focused control works by |
| `bindError(chord)`, `steal(map, id, chord, { add })` | The binding law (Escape and Tab are kept); the pure steal |
| `diffSaved(defaults, current)`, `repairSaved(raw, ids, platform)` | What is saved (only the difference); a save read back, bad entries dropped, never thrown |
| `detectPlatform(navigator)`, `MOD_ORDER`, `MODIFIER_CODES`, `CODE_CHAR` | |
| `createKeyboardWindow({ keys, host, persist, platform, onMoved })` (`mir/keyboard/keyboard.js`) | The KEYBOARD window on `createWindow` (id `keyboard`). Returns `{ win, root, open, close, toggle, isOpen, select(id), setPlatform(p), record(), refresh, destroy }` |
| `createKeysHelp({ keys, host, persist, onMoved })` | The help view (id `keys-help`): `helpRows()` by group. Returns `{ win, root, open, close, toggle, isOpen, refresh, destroy }` |
| `boardRows(platform)`, `keyStates(list, platform, selectedId)` | The drawn ANSI rows; what each drawn key shows |

Notes:
- **One spelling:** `Mod+Ctrl+Alt+Shift+Meta+<code>`, ASCII, so `saved()` is a spec envelope's `keys` member as it is.
- **Menus:** `keys.menuItem(id)` is a whole menubar entry; the key after the TAB is never translated.
- **Hints:** give a control `data-key-action="<id>"` and call `keys.hints(document)` (again on `onChange`).

---

## The shell parts: `mir/shell/dialog.js`, `notice.js`, `busy.js`, `boot.js`, `flash-guard.js`, `share-link.js`, `settings-rows.js` ([SHELL-PARTS.md](SHELL-PARTS.md))

Load `mir/shell/parts.css` after the kit's sheets.

### `mir/shell/dialog.js`
| Export | |
|---|---|
| `openDialog({ title, body, actions: [{ label, run, kind, value }], dismiss = true, kind, mark })` → `{ result, close(value), root }` | a pane at menu height, no scrim. `body`: English or a Node. `kind` on an action: `'primary'` (accent label, takes the focus) or `'danger'`. `result` resolves with `run()`'s return (awaited), else `value`, else `null` when dismissed. `dismiss: false` traps (no Escape, no outside press). One dialog at a time; later ones wait |
| `confirmDialog(text, { yes = 'OK', no = 'CANCEL', title, danger })` → `Promise<boolean>` | Escape / outside press = false |

### `mir/shell/notice.js`
| Export | |
|---|---|
| `notice(text, { kind = 'info' \| 'ok' \| 'warn' \| 'error', ms, action: { label, run }, seat = 'toast' \| 'corner', stack, offset, max = 4 })` → `{ close(), root }` | **toast** (default, BASINS'): one centred seat, `offset` from the bottom (default 84 px), replaced by the next notice, no ×, 3 s. **corner** (`seat: 'corner'` or `stack: true`, NEBULA's): a stack of up to `max`, each with a ×, 5 s (9 s for an error). `ms: 0` stays; hover or focus holds either |
| `guarded(fn)` → fn's result | a throw or a rejection becomes an error notice (the toast) |

### `mir/shell/busy.js`
| Export | |
|---|---|
| `busyMark(host, { size, seat = 'inline' \| 'card' \| 'logo' \| 'pointer', colors, label = 'CALCULATING' })` → `{ root, start(), stop(), paint(colors), running, destroy() }` | the 3×3 diamond; `seat: 'card'` is a transparent overlay over a positioned host |
| `busyCursor(on)` | the mark beside the pointer; counted |
| `busyLogo(on, logo = '#title')` | the mark in place of the wordmark's `.mark`; counted |
| `whileBusy(work, { cursor = true, logo = true })` → work's result | |
| `markColors(root?)`, `FIRST_PAINT` | the palette as the header mark wears it; λWAVES' first-paint colours |

### `mir/shell/boot.js`
| Export | |
|---|---|
| `bootCard({ name, steps, host })` → `{ root, step(text?), done(), fail(error, { retry }), destroy() }` | |
| `explainBoot(error)` → `{ code: 'nogpu' \| 'noadapter' \| 'lost' \| 'link' \| 'exception', what, todo }` | pure |
| `bootDetails(error, { name, steps })` → text | what COPY DETAILS copies |

### `mir/shell/flash-guard.js`
| Export | |
|---|---|
| `createFlashGuard({ maxHz = 3, delta = 0.1, window = 1, release = 1, ranges, now, onTrip, onRelease })` → `guard(value, route, t?)` | holds a route's swing that would exceed maxHz flashes in any second; `guard.lastTrip` `{ route, hz, at }`, `guard.state(route)`, `guard.describe(trip)`, `guard.reset(route?)`, `guard.enabled` |
| `areaEvent(prev, cur)`, `flashRate(samples)`, `createFlashModel()` | the field judge (POLAR/EARTH), pure |
| `photosensitivityNotice({ key, title, body, accept, driver, force, storage })` → `Promise<true>` | once per browser; not under a test driver unless forced |
| `flashNoticeSeen(o)`, `forgetFlashNotice(o)`, `WCAG` | |

### `mir/shell/share-link.js`
| Export | |
|---|---|
| `encodeState(state, { defaults, version = 1, digits = 4, strict = true })` → `'#v=1&c=…&…'` | only what differs from `defaults` |
| `decodeState(text, { defaults, version, strict, migrate })` → state \| null | never throws |
| `inspectLink(text, opts)` → `{ state, ok, why, version, damaged, dropped, length }` | |
| `measureState(state, opts)` → `{ text, length, ceiling, fits, keys }` | ceiling `LINK_CEILING` = 2000 |
| `createShareLink(opts)` → `{ encode, decode, inspect, measure, read(), write(state), url(state), copy(state), destroy() }` | `write` = replaceState, debounced 400 ms |
| `crc32(str)`, `flatten(obj)` | |

### `mir/shell/settings-rows.js`
| Export | |
|---|---|
| `settingsRows(host, rows, { onBegin, onEnd, onChange })` → `{ root, sync(), control(id), editing(id?), beginEdit(id), endEdit(id), destroy() }` | a row: `{ id, label, hint, control: 'sw' \| 'seg' \| 'fader' \| 'knob' \| 'select' \| 'number', get, set, options, min, max, step, log, wrap, fmt, when, begin, end }` |
| `selectField({ label, options, value, onChange, aria, title })`, `numberField({ label, value, min, max, step, fmt, onChange, aria, title })` → `{ root, input, get, set, setDisabled }` | to move into kit.js |

---

## FOLDERS: `mir/folders/`, the project window ([FOLDERS.md](FOLDERS.md))

**`folders/folders.js`**
- `createFolders({ host, id = 'folders', title = 'FOLDERS', store = 'mir.folders', storage, prefs, app, adapter, seeds, seededKey,
  size, min, dock, onMoved, firstSeat, say, download, picture, defaultName, capChars, parts, sorts, actions, depthOf, factory,
  capturePicture, savePicture, pictureStale, onInspect, onOpened })` → `{ win, files, gallery, adapter, seeded, intake, open(), close(),
  toggle(), isOpen(), save(), saveAs({ name, folder }), fresh(), openEntry(id, { force }), current(), dirty(), seed(list),
  exportProject('mir' | 'png'), importEnvelope(env), ingest(input), say(text, warn), state(), destroy() }`
- `localPrefs(storage, key)` → `{ read, write }` · `toThumb(src, { max, type, quality })` → `Promise<data URL>` · `FOLDERS_COPY`

`createFolders({ rack })`: the first seat keeps clear of the racks and the transport bar · `freeSeat({ vw, vh, w, h, minH, clear, top, margin })` → `{ x, y, h? }` (pure; 1.5.0-alpha.5).

**`folders/project.js`** (pure)
- `createProjectAdapter({ capture, restore, signature, thumbnail, empty, subscribe, facts })` — any hook left out is core/project.js's
- `openWithRollback(adapter, data, ctx)` · `emptyProject(adapter)` → `Promise<{ ok, why?, failed, rolledBack?, rollbackFailed? }>`
- `restoreOk(r)` → `{ ok, failed, why }`

**`folders/files.js`** (pure; BASINS' model) — `createFiles({ key, storage, capChars, defaultName })` → `{ save, overwrite, rename, move,
  remove, renameFolder, deleteFolder, setFolderPicture, folderPicture, saveMakingRoom, evictOldest, entries, entry, folders, count,
  proposedName, state, subscribe, reload, key, cap, setCap, chars }`; `normalizeFolder`, `inFolderTree`, `leafOf`, `parentOf`,
  `uniqueName`, `savedAtLabel`, `entryOk`, `FILES_V`, `NAME_MAX`

**`folders/seed.js`** (pure) — `seed(files, starters, { storage, seededKey })` → `{ ok, added, skipped, total }`; `seedId(starter)`

**`folders/gallery.js`** — `buildGallery(panel, { files, adapter, kit, glyph, parts, sorts, actions, extraActions, say, prefs, persist,
  pageSize, current, onInspect, onOpened, onSaved, onFresh, onRemoved, dropLayer })` → `{ root, toolbar, actions, paint, save, fresh,
  openEntry, markClean, closeContext, box, action, go, folder, selected, select, sort, sorts, setSort, cycleSort, presence, projection,
  dirty, nameValue, folderValue, carrying, state, destroy }`; `SORT_MODES`, `GALLERY_COPY`

**`folders/folders.css`** — `@layer mir.kit.house`, scoped on `.mir-folders` (+ `.sv-ghost`, the carried tile in `<body>`).

---

## `mir/modulation/`: the modulation system

### `bind.js`: the app seam (1.5.0-alpha.3, [MODULATION.md](MODULATION.md))
- `installModulation({ mount, params, roots, available, present, onWindow, store, storageKey, presetKey, audio, dock, copy,
  targets, routeGlow, enabled, showWidgets, moved })` → `{ host, view, registry, M, open(), close(), toggle(), isOpen,
  arm(on), armed(), onArm(fn) → off, isModulated(id), baseOf(id), currentOf(id), hand(id, value) → bool, running(), bpm(),
  syncBases(all?), paintWidgets(), persist(), dispose() }`.
  `params`: `[{ id, label, unit, group, hint, min, max, step, map, def, get(), set(v), widget }]`; `store`: `{ read(),
  write(patch) }` (default `localStore(storageKey || 'mir.modulation')`); `audio`: the app's `createAudioCapture`.
- `localStore(key)` → `{ read(), write(patch) }` (guarded localStorage, one JSON record).
- `rootsOf(params)` → the registry roots the ids imply.

### `bind.js`: targets after the install, and a first route in one call (1.5.0-alpha.5)

`installModulation(…)`'s result adds `add(param)` → `remove()` · `remove(id)` → boolean (the target and every route onto it go; the number stays on its base) · `route(source, id, depth = 0.5)` → `{ route, macro, source, remove() }` or `null` (a source id, a source or a kind; `depth` of the range up from the base, negative down) · `params()` → the targets (a copy). A route onto a target not added yet waits, dormant. Option `mount: null`: the seam without its window. Default `roots`: the params' roots and `app`. Power is on by default; play stays the app's.

### `bind.js`: one clock and modulation's power (1.5.0-alpha.4)

- `installModulation(…)` adds `power()` → bool · `setPower(on)` → bool · `togglePower()` → bool · `onPower(fn)` → off: modulation's power, a route bypass (time runs on). `arm(on)`, `armed()`, `onArm(fn)` are the same under their 1.4 names.
- `play(on)` → the clock's result · `togglePlay()` · `playing()` → bool · `onPlay(fn)` → off: the app's one clock. The window no longer starts time; an app gives the user its own play.
- The `enabled` option is the power at first boot when the store holds none.

### `window.js`: the controller (1.5.0-alpha.3)
- `createModulation(host, port)` → `{ root, rail, chipRail, api, open(), close(), toggle(), isOpen, paint(force), sync(),
  rebuild(), presentation(), restore(o), setAccent(a, b), say(msg, cls), resumeSentence(), wake(), dispose() }`.
  `port`: `{ M, registry, clock, apply, knobOf, persist, cadence, setCadence, armed, arm, audio, rateControl, moved,
  opened, closed, presetKey, copy, dock, targets, routeGlow }` (all but M, registry, clock optional).
  `presentation()` is `{ x, y, lane, ribbon, modes, audioMini, open, folder, macroSide, macroMin, selectedMacro,
  selectedSource, audioBands, audioRoutes, dock, chipSide }`.
  `api` (the gates' read-back) adds `placement()` → `{ box, dock, chipSide, side, seat, landing: { top, bottom }, moving }`
  and `presetKey()`.
- `ROUTABLE` (`'.k[data-param], .fd[data-param]'`), `ROUTE_REACH` (56), `ROUTE_CAPTURE` (18).
- 1.5.0-alpha.4: `port.armed()` / `port.arm(on)` are the power (absent: the window uses `clock.setModulationEnabled`). The window calls no play or pause.

### `mod.js`: the preset key (1.5.0-alpha.3)
- `setPresetKey(key)` → the key in force ('' restores `PRESET_LS`); `presetKeyOf()`. `presetStoreState().key` names the key
  in force.

### `registry.js`: the parameter registry

| Export | What it is |
|---|---|
| `createRegistry({ roots, onError })` | The registry every modulation target is registered in. `roots` defaults to λWAVES' `observer · material · state · transport · field` |
| `idFault(id, roots)` | Why an id is not valid, or `null` |
| `MAP_KINDS` | `linear · log · wrap · integer · bipolar` |

### `curve.js`: the curve editor's maths

| Export | What it is |
|---|---|
| `evaluate`, `bend`, `normalizePoints`, `clonePoints`, `mirror`, `flip`, `pointsEqual` | Evaluating and reshaping a curve |
| `addPoint`, `removePoint`, `movePoint`, `setTension` | Pure edits that never mutate their input |
| `PRESETS`, `PRESET_LABEL`, `isPreset`, `presetPoints`, `presetMirror`, `presetIsSymmetric`, `applyPreset` | The preset shapes |
| `curveHash`, `curveInfo` | A hash and a summary of a curve |
| `TENSION_OCT`, `CURVE_MAX_POINTS`, `SINE_TENSION` | Limits and constants |

### `curve-gesture.js`: the curve editor's pointer law (1.4.3)

| Export | What it is |
|---|---|
| `svgPoint(svg, event)` | Converts client coordinates to the SVG viewBox before hit testing, including CSS/UI scaling |
| `curveHit(point, points, handles, radius)` | Nearest point-or-handle hit test in that coordinate system |
| `curveAction(event, hit)` | FL Studio's action matrix: right-empty add, left-point move, left-handle tension, right- or double-click handle reset, Alt-left-point delete |
| `pointDrag(start, current, event)` | Shift locks value; Ctrl locks time |
| `pointAddValue(event, pointerValue, curveValue)` | Shift-right-click preserves the curve's current value; ordinary right-click uses pointer value |
| `tensionDelta(startY, currentY, event)` | Handle travel with Ctrl fine adjustment |
| `editablePresetForWave(wave)` | Deterministic analytic wave → editable breakpoint preset; S&H and DRIFT return `null` |
| `CURVE_GESTURES` | The human-readable gesture contract |

### `mod.js`: the model

188 exports. Grouped:

| Group | Exports |
|---|---|
| **Sources** (LFO, envelope, audio, steps) | `addSource, setSource, removeSource, moveSource, sourceList, sourceOf, sourceIndexOf, sourceCount, sourceIds, WAVES, WAVE_LABEL, waveAt, waveSeedOf, envAt, envDuration, envPoints, trigger, release, curveEdit, copyBank, pasteBank, STEPS_*, stepQuant, stepsRungIndex` |
| **Audio** | `modFeedAudio, audioReset, audioArm, audioConsumers, audioDemand, audioApplicationDemand, audioOutputOf, audioReadout, audioRangeNorm, audioDbAmp, audioDbPow, audioNorm, audioAlpha, audioRiseMs, AUDIO_*` |
| **Macros and triggers** | `addMacro, setMacro, removeMacro, moveMacro, macroList, macroOf, MACRO_KINDS, MACRO_BOOT, MACRO_MAX, isTriggerMacro, triggerMacros, fireMacro, releaseMacro, fireTriggers, releaseTriggers, triggerLevel, setSourceTrigger, subsOfTrigger, subCountOfTrigger, clearTrigger, pruneTriggerRefs, isHitOutput, HIT_ENV, hitEnvOf, hitMacroFor` |
| **Routes** | `addRoute, removeRoute, removeRoutesOfTarget, removeRoutesOfMacro, setRouteRange, routeList, routeOfTarget, routeOfId, routesOfTarget, routeCountOfTarget, routesOfMacro, routeCountOfMacro, targetDepth, targetPos, targetValue, targetDriven, anyLiveRoute, syncDormant, dormantRoutes, dormantCount, dormantCountOfMacro` |
| **Clock and transport** | `transport, setTransport, reanchorTransport, advance, needsClock, lfoHz, freeHz, freePos, beatsPerCycle, smoothTau, syncMode, setSyncMode, clampSyncMode, effectiveSyncMode, setExternalClock, externalClockActive, transportLag, tapTempo, TAP_*, HOLD_NOTES, heldBeat, holdStart, holdEnd, snapshotPhases, restorePhases, resetPhases, modPlayEdge, BPM_MIN, RATE_MIN, LFO_MULTS, LFO_MULT_LABEL, LFO_MULT_DEFAULT, TRIPLET, BEATS_PER_WHOLE, SYNC_MODES, SYNC_DEFAULT` |
| **State** | `serialize, deserialize, serializeRack, deserializeRack, migrateRack, modStateReadable, MOD_STATE_V, MOD_STATE_READS, modState, modStat, modReset, materialize, legacyOf, setLegacy, demolish, migrateFromLegacy` |
| **Presets** | `presetList, presetFolders, setPresetFolder, presetGet, presetApply, presetSave, presetDelete, presetStoreReload, presetStoreState, FACTORY_PRESETS, PRESET_LS, PRESET_FORMAT_V, PRESET_NAME_MAX, PRESET_FOLDER_DEFAULT, PRESET_FOLDER_FACTORY, PRESET_FOLDER_MAX` |

About the preset store:
- **The key and folders** are λWAVES' (`lambdawaves.q0.modpresets`; `Josh's Collection`, factory `MANDELBROT`), and every reader shares them (each app has its own origin).
- **Not injectable yet.** Making them options is a `mod.js` edit, and `mod.js` stays byte-identical to its vendored source while λWAVES' `tests/mir.test.mjs` §16 proves it.

### `host.js`: the host a window talks to

| Export | What it is |
|---|---|
| `createTargetHost({ registry, available })` | The targets a route can drive |
| `createModClock({ registry, targets, present, pauseMode, wall, maxStep, enabled, presentationActive })` | The clock that advances modulation |
| `createModHost({ …, invalidateGeometry, roots, onError })` | The host a window mounts on |
| `MAX_WALL_STEP`, `PAUSE_MODES`, `RESUME_LAWS`, `resumeGrid` | Clock limits and pause/resume laws |
| `model` | the model module (`mod.js`) the host drives, re-exported |

Interactive transport clients may call `clock.suspendRealtime(wallSeconds)`.
It returns an owned `release(wallSeconds)` function, or `null` if already owned.
While owned, `advanceTo()` refreshes its wall stamp without advancing the model;
`seek()` still previews and explicit deterministic `step()` remains available.
Release reanchors time without changing Play, demand, MOD, BASE/HOLD or retriggering
sources. Release is idempotent, and successful `restoreRuntime()` invalidates old
owners. `clock.isRealtimeSuspended()` reports this gate. Clients must release on
pointer end/cancel, blur, close, project replacement and disposal; recording clients
must reject interactive ownership before taking over the clock.

The remaining exports are **λWAVES content that still lives in the kit**:
- `labParameters`, `LAB_PRESET_FOLDER`, `LAB_PRESETS`, `presetRouteTargets`, `foreignPresets`, `labPresetList`, `labPresetFolders`, `labPresetGet`, `labPresetApply`;
- `barTempo`.

They go home to λWAVES when the kit drops its λWAVES leftovers (2.0.0).

### `modwindow/modwindow.js`: the window's builders

`SVG_POWER` (1.5.0-alpha.4) is the work bar's first seat (`button.modxport.mir-mod-power[data-face="power"]`); `SVG_PLAY` / `SVG_PAUSE` stay exported and are no longer drawn by the window.

The glyph strings (`GLYPHS`, `SVG_PLAY`, `SVG_PAUSE`, `powIcon()`) read `--m2-glyph-sw` (and `--m2-glyph-dim`, `--m2-xport-sw`, `--m2-pow-stem-sw`, `--m2-pow-ring-sw`) through an inline style: declare them if you draw a glyph outside the plugin's roots.

| Export | What it is |
|---|---|
| `createModWindow(host)` | The whole window, built and not wired: `root.modwindow` holds `rack, foot, transport, addMacro, addDevice, buildRing, buildSpan, buildClear, buildGhost, buildDevicePick, buildMacroPick, buildPresetSheet, buildDeadInspector` |
| `buildChipRail`, `buildMacroSlot`, `buildDevice`, `setDeviceMode`, `buildAudioSheet`, `buildRing`, `buildSpan`, `buildClear` | The sub-builders |
| `setViewHeight`, `setWorkLane` | Sizing the rack view and the work lane |
| `ringGeom`, `knobArc` | Ring and arc geometry |
| `gripIcon`, `powIcon`, `GLYPHS`, `glyphEl`, `setGlyph`, `m2mk`, `m2svg`, `SVG_PLAY`, `SVG_PAUSE` | The window's own icons and DOM helpers |
| `NS`, `WINDOW_ID`, `WINDOW_TITLE`, `CHIPRAIL_LABEL`, `IDS`, `GEOM`, `sizeLaw`, `COPY` | Names, ids, geometry and copy |

**The complete controller that wires the window to a host is not in the kit yet.** Routes, rings, the clock and presets (`wireGrip`, `wireDepth`, `paintDepth`, `moveMacro`, `rebuildMacros`) live in λWAVES' `lab/modwindow.js`, which BASINS and NEBULA copied. Curve pointer semantics are the exception since 1.4.2: every host imports `curve-gesture.js`, so copied controllers cannot drift on point/tension controls.

The window loads two sheets, `mir/modulation/modhost.css` and then `mir/modulation/modwindow/modwindow.css`, and nothing may follow the second.

---

## `mir/window/` and `mir/history/`: additions (1.5.0-alpha.5)

- `window/rail.js` `createRail(…)` → adds `setDock('top' | 'bottom' | null)`: docked at the top or bottom, the rail's chips sit tighter (its disc plus `--rail-gap` along the rail). `createWindow` calls it from its layout, so every kit window's docked rail tightens.
- `history/history-list.js`: `historyList(history, host, { tools = true, count = true })` → `{ root, paint, state(), onChange(fn) → off, destroy }`; `tools: false` / `count: false` leave UNDO / REDO and the count to the host; `state()` is `{ canUndo, canRedo, length, count }`. `historyState(history)` is the same state, pure.

---

## `mir/core/describe.js`: what a visiting model can read (1.5.0-alpha.4, [LLM-MODS.md](LLM-MODS.md))

- `createDescribe({ app, rack?, params?, pages?, keys?, prefs?, mod?, transport?, doc?, mount?, max? })` (`params` may be a function; with `transport`, `describe()` carries the clock: playing, the tempo, modulation's power) → `{ describe(), dump(), refresh(), observe(event), events(), errors(), destroy() }`
  - `app` `{ name, version?, what? }`; `rack` a `createRack()`; `params` the rows `installModulation` takes (`{ id, label, unit?, min, max, get() }`); `pages` a `createPages()`; `keys` a `createKeys()`; `prefs` a `createPrefs()` store (the GUI window's `gui.prefs`); `mod` the `installModulation()` handle (which parameters a route drives, and their base).
  - `doc` the document (default: the page's; `null` runs without a DOM); `mount` keeps the hidden `#mir-describe` element (default true); `max` the events and errors kept (default 20 each).
  - `describe()` → markdown: the app, its windows (open, built, rack side, floating, folded), its parameters (range, live value, base when modulated), its key actions, and only the pages with `shared: true`.
  - `dump()` → one fenced block: kit version, browser, look (skin, theme, card, frost, language, direction, motion, viewport), the prefs, the rack layout, `perf.snapshot()`, the last errors and the last input events (kind and target hooks only; a key in a field has no key), then `describe()`. Every text a field holds now (4+ characters) is cut out.
  - `refresh()` rewrites the hidden element in one coalesced frame job (it also runs on a pages or keys change and at the end of a gesture). `observe(event)` records one event (the document's capture listeners call it). `destroy()` removes the listeners, the element and the globals.
  - Sets `window.__MIR.describe` and `window.__MIR.dump`.
- Pure: `describeText(state)`, `dumpText(state)`, `targetOf(node)`, `eventEntry(event)`, `scrub(text, typed)`, `DESCRIBE_ID`.

---

## `tools/`: the proofs

| Tool | What it does |
|---|---|
| `adopt.mjs <app> [--check \| --dry-run] [--prefix lab] [--allow-dirty]` | Put the kit into an app, or prove it is in step |
| `serve.mjs [port] [root]` | A static server with no dependencies (`npm run gallery`) |
| `lint-tokens.mjs [--unused]` | Every token the kit reads has a writer |
| `stylehash.mjs capture\|compare` | Neutrality: does a kit change change what an app draws? |
| `shell-parity.mjs capture\|compare` | The shell is λWAVES' shell: styles, text, boxes and pixels in 14 states |
| `shell-behaviour.mjs [url]` | 19 behaviour probes of the shell |
| `extract-shell-css.mjs` | How `mir/shell/shell.css` was made |
| `lint-intent.mjs [--report] [--update-baseline]` | The INTENT counts per sheet may go down, never up |
| `tokens-doc.mjs` | Writes `docs/TOKENS.md` from `mir/tokens.json` |
| `i18n-extract.mjs [--check]` | The English catalogue `mir/locales/en.json` and its report (`npm run i18n`) |
| `check-envelope.mjs <file> [--app id] [--settings schema.json] [--tokens tokens.json] [--json]` | `ok <kind>` or `error path: why` lines; exit 0 / 1 (2 on bad usage) (`npm run check:envelope`) |
| `make-skill.mjs [--out <dir>] [--allow-dirty]` | Assembles the installable `mir-builder` skill into `dist/mir-builder/` (SKILL.md, LLM.md, LICENSE, the starter, `mir/`, `fonts/`, `docs/*.md`, `tools/serve.mjs`, `tools/check-envelope.mjs`, `tools/cdp.mjs`, `check-app.mjs`, BUILD.json) and prints its size; refuses a dirty kit unless told (`npm run skill`) |
| `cdp.mjs` | The headless Chromium under all of them |

`npm test` runs the token lint, `tests/*.node.mjs` and `tests/*.browser.mjs`.
