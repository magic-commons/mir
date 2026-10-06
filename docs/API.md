# MIR · API

Every module the kit exports, what each export is, and what it returns. MIR 1.5.0-alpha.11.

Each module's own header holds its laws and their reasons. This page is the map to them.

How an app loads the kit, the body attributes it reads, the ids it owns and the tokens an app may re-point are all in [CONTRACT.md](CONTRACT.md).

Import paths below are from an adopted app's `lab/` folder: `./mir/…`.

---

## `mir/app.js` and `mir/mir.css`: the easy start (1.5.0-alpha.5)

| Export | What it is |
|---|---|
| `createApp(options)` → `Promise<app>` | The standard wiring, in the kit's order. Options: `name`, `key` (store prefix, default the name in lower case), `version`, `what`, `about` (ABOUT extras; `sub` under the wordmark), `stage`, `host` (default the stage's parent), `state`, `present()`, `clock` (`{ play, pause, isPlaying, onChange }`; default modulation's), `keys` (the app's key rows, ahead of the kit's), `menus` (`{ FILE, EDIT, VIEW, WINDOW, …, ABOUT, LANGUAGE, GUI }`, functions or arrays; given ones replace the kit's), `pages` (rows to add; page 0 greets), `subject()`, `thumbnail()`; and per piece `gui`, `transport`, `rack`, `mod`, `notebook`, `folders`, `info`, `greet`, `help`, `menubar`, `describe`: `false` to leave it out, an object of extra constructor options. Returns `{ name, key, first, param(key, label, min, max, more), params, playing(), play(), pause(), safeRect(), clock, accent, gui, keys, transport, rack, mod, pages, notebook, folders, info, greeting, help, menubar, describe, floats }`. |
| `app.safeRect()` → `{ left, top, width, height }` | Where the picture may draw, in stage px: the stage minus the transport bar and the racks showing a window (1.5.0-alpha.6). `createApp` also calls `present` on a theme or look change and on `devopen` / `devclose`, and writes `document.title` from `name` |
| `makeParam({ state, key, label, min, max, map, mod, onChange, id, make, …widget })` | One number as a kit control (`make`, default `knob`), a modulation target (`mod.add`; id `app.<key>`) and a saved value. → `{ id, key, label, unit, min, max, map, widget, root, home, get(), value(), set(v), remove() }`; `value()` is the base, never the modulated reading. With no `id`, a `key` that does not match `/^[a-z][a-z0-9]*$/` throws a `TypeError` naming it and the fix. |
| `PRESSABLE` | the selector `installPress` is given (`.sw, .seg-b, .trig, .tbtn, .mir-rack-btn`) |

**`createApp` (1.5.0-alpha.12).** More options: `banner`, `sceneGuard`, `wakeLock` (each `false` or options), `canvas` (the picture's canvas, for the scene guard), `coming: [[NAME, hint]]` (menu rows for what is not built yet), `session` (off by default: `true` or `{ key, … }` keeps the live project in one key, [SESSION.md](SESSION.md)), `pattern` (the PATTERN with the modulation; `false` leaves it out; WINDOW › PATTERN), `factory` (bundled starter presets, `{ presets, folder, apply }`, handed to `installModulation`), `timeline` (`true` or options: the TIMELINE, the lego stack under the modulation window and the MIR switch between the two). The rack gets `scrollbar: true, name, notebook`; the GUI window gets the rack; the accent's angles go to the modulation window's `setAccent`, and the GUI's saved SAMPLING · AUTOMATION grid goes to `installModulation({ automationGrid })`. More members: `hideInterface()`, `dump()`, `banner`, `sceneGuard`, `wakeLock`, `session`, `pattern`, `timeline`, `workspaces`. Key actions `rack` (B), `dock` (T), `hide` (H), `fullscreen` (F); `folders` moved to S. `window.__MIR.app`.

**`createApp` (1.5.0-alpha.13).** More options: `history` (the app's one stack, `createHistory()`: a HISTORY window behind WINDOW › HISTORY, with the keys, the gesture naming and the modulation rack as a domain; `historyWindow` adds that window's options), `render` (`{ frame, motions?, subject?, picture?, motionUi?, sections?, prefix?, card?, …createRecorder options }`: the recorder, `busy` to the timeline, RENDER in FOLDERS and as a rack window; [RENDER.md](RENDER.md)). `timeline` now installs the audio clip too (`timeline: { audio: false }` leaves it out). A notebook without pages registers its project part. Returns `history` and `recorder` as well.

**`createApp` (1.5.0-alpha.14).** `modRoots: ['grade', 'curves', …]`: more modulation id roots beside `app`, so a kit panel's targets (`camera.*`, `grade.*`, `curves.*`, `lanes.*`, `xy.*` by default) route with no other line; `mod: { roots }` still wins.

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
| `setKnobLaw({ travel, fine, keyFine, faderFine, touchTravel })` | Retunes the law and returns the law in force. Defaults (1.5.0-alpha.13): `travel 220`, `fine 8`, `keyFine .125`, `faderFine 8`, `touchTravel 320`. |
| `dragTravel(event, { touch, travel, fine })` | Pixels for a full scale under the law (1760 with any modifier). It's for drag surfaces the kit did not build. |
| `tapWatcher(fn)` | The shared double-tap detector (320 ms). |

About `setKnobLaw`:
- `fine` alone retunes every fine gear at once; ⅛ (`fine: 8`) is the default since 1.5.0-alpha.13, on Shift, Alt, Ctrl, Meta or a second finger, for knobs, faders, arrow keys and `bindSliderKeys`.
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
| `glyphNames()` | Every canonical glyph name, aliases excluded (75; see [ICONS.md](ICONS.md) and `gallery/icons.html`) |
| `glyphAliases()` | `{ old: target }`: the retired names that still draw (`north` → `popOut`) |
| `hasGlyph(name)` | Whether a glyph exists; true for an alias too |
| `glyphSvg(name, cls, size)` | The glyph as an SVG string |
| `glyphEl(name, cls, size)` | The glyph as an SVG element |
| `setGlyph(el, name, { label })` | Draw a glyph into a button and set its accessible label. `glyphSvg`, `glyphEl` and `setGlyph` draw an alias's target and keep the name the caller passed in the class (`gly-north`) and in `data-gly` |

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
- dragging or the arrow keys tilt the plane about world X and Y, the one knob law's ⅛ fine gear (any modifier or a second finger), and a double-tap or Home resets;
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

- `createPrefs({ key, schema, presets, storage, doc, context, version?, migrate?, projectKeys?, project? })` → `{ get(k), set(k, v) | set(patch) → changedKeys, reset(), forget(), all(), subscribe(fn(state, changed)) → off, apply({ now }), preset(), applyPreset(id), presets, resolve(), env(), migration, settings({ app, name }) → envelope, download({ app, name }) → bool, load(textOrEnvelope) → { ok, changed, errors, warnings }, destroy() }` — preferences against project: [SESSION.md](SESSION.md)
- `migratePrefs(storage, key, { version, migrate, projectKeys, project })` → `{ ok, migrated, moved? }` · `forgetPrefs(key, storage?)` · `settingsFileName(app, date?)`
- A schema row: `{ key, type: 'enum' | 'bool' | 'number', values?, min?, max?, step?, wrap?, default, apply: [{ on, attr, map? } | { on, cls, when? } | { on, prop, map? } | { run(v, state, env, context) }] }`
- Pure: `valid`, `defaults`, `repair`, `coerce`, `resolve(state, schema, env)`, `matchPreset(state, presets)`, `migratePrefs`, `settingsFileName`

## `mir/core/session.js`: the live project ([SESSION.md](SESSION.md))

- `createSession({ key, storage?, parts?, also?, delay = 300, hold?, lift?, onSeed?, win?, doc? })` → `{ hasResume(), resume(ctx?) → { ok, failed, seeded }, discard(), arm(), armed(), changed(), save() → bool, flush() → bool, read() → { parts, seed? } | null, adopt(moved) → bool, destroy() }`
- `readSession(storage, key, lift?)` → `{ parts, seed? } | null` · `adoptInto(storage, key, moved)` → bool · `openerSwitches(search, { ids, direct, webdriver })` → `{ warning, choice }` · `SESSION_V` (1)

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

`createInfoLayer({ …, pane = false, controls = null, keys, avoid })` (`avoid`: viewport rects a block never rests under, e.g. `rack.keepClear()`; a block with no room beside the subject sits over it, dimmed, with `data-over`) (with the app's key table the layer listens to no key of its own); `layer.hold(on)`; `infoActions(get, { keys = ['I'] })` → the `info-hold` row; `HOLD_KEY` (`'KeyI'`); `addLabel({ anchor: 'ui:name', control? })`; `addBlock({ pane? })`; `setPane(on)`; `layer.stage`. A `() => null` anchor hides its labels.

---

## `mir/shell/`: the wordmark, the menubar, the notebook, ABOUT, the accent

| Export | What it is |
|---|---|
| `wordmark(parent, { lead, word, sub, id = 'title' })` | `#title`, with an optional lead glyph (λWAVES' λ) |
| `markSvg()` | The nine-square mark |
| `createMenubar({ opener, host, menus, label, phone, keep })` | FILE · EDIT · VIEW · WINDOW · ABOUT (and LANGUAGE, GUI) under the wordmark. An entry is `[label, run, disabled?, hint?, { raw?, current? }]`. On a phone the bar wraps onto a second row and an open list stays on the screen. Returns `{ bar, open(focus), close(), openGroup(name), isOpen, items, destroy() }` |
| `createNotebook({ host, name, title, storageKey, about, faces, render, vendor, logo, onLogo, dump, keyLabel })` | The glass with NOTES and ABOUT. Returns `{ root, open(face), close, toggle, isOpen, face, moveTo, resize, size, dump, text, title, subtitle, mode, setMode, render, html, destroy() }` |
| `loadRenderer()` | Loads marked and KaTeX from `shell/vendor/`, once, only what the page hasn't loaded |
| `aboutFace(face, data)` | The ABOUT face from data: `{ name, version, tagSplit: 'first' \| 'last', tagline, taglines, copyright, licence, thanks, teamTitle, team, made, makers: [[name, house]], type, home, dump }`; a rich part is a string, `[text, href]`, `{ t, vars }` or `{ sup: text }` (1.5.0-alpha.16: `taglines`, `{ sup }`, `teamTitle`, `makers`, `tagSplit`) |
| `gplLicence(name, { license, notice })`, `kitType(extra, fontsPath)` | The default licence and type lines |
| `richText(node, line)` | Text and `[text, href]` parts. No `innerHTML`; unsafe schemes are dropped |
| `safeHref(u)` | Whether a link's scheme is safe |
| `createAccent({ accentStops, wheelStops, paletteOn, a, b, vivid, hueShift, stageGround, gamut, model, onAccent })` | Accents A and B as angles on a palette (`model: 'hsl'`, alpha.14: BASINS' HSL engine), plus the mark. Returns `{ apply, set(patch), wheelColor, accentColor, markInk, paintMarks, turn, busy(on), hueSat, a, b, vivid, hueShift, paletteOn, model }` |
| `STAGE_GROUND`, `CARD_GROUND`, `MARK_SELECTOR` | The two stage grounds, the two card grounds, and the marks that `paintMarks()` paints |
| `renderNotebook(markdown, { marked, katex })` | Sanitised markdown with maths (λWAVES' renderer) |
| `renderNotebookMath(tex, display, katex)` | One formula, with an escaped fallback |

Notes on the shell:
- **Menus are data:** `name → () => [[label + '\t' + key, run, disabled, hint] | null, …]`.
- **App faces:** each face in `faces` is `{ id, glyph, label, title, build(faceEl, api), show(faceEl, api) }` and gets a round button after ◐. A face `{ id, glyph, label, title, run(api) }` (1.5.0-alpha.16) is only a button: a press runs `run` and flips nothing (BASINS' ▤ opens its SAVE window).
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

- `createRack({ host, sides, key, store, favourites, transport, seats, phone, chrome, handle, look, onChange })` → `rack`. With an app's existing rack in the page (`#rack`, `#rackL`, `#floats`, the chrome ids) it adopts it: no second container, no kit look class on them (`look: 'kit'` opts in; `docs/RACK.md` "Adopting into an app that has a rack").
- **Windows.**
  - `rack.register({ id, title, side, open, glyph, hint, key, status, el, closed, eager, card, build(body, api), onOpen, onWake, onClose, onSleep, onFold, onPower, onPresent })` → id. Built on first open.
  - `el` takes over an already-built window; `closed: true` starts it closed; `eager: true` builds it at once; `card: true` marks an app card that is not a window (it keeps its place in the order and in saved layouts, as an unregistered `.dev` in a rack does). `rack.span()` is the page's one dock span; `rack.windows()` rows carry `card`.
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
- **The rack's motion (1.5.0-alpha.11, BASINS' `rack-motion.js`):** `createRackMotion(hosts, view)` → `{ refresh(), hold(card), follow(card, x, y), release(card, settle), holding, destroy() }`; any card change animates the card's height and every moved card's travel at `--rack-motion` / `--rack-ease`; a card enters 6 px up over `--rack-enter` / `--rack-enter-ease` (BASINS' 220 ms). `reorderIndex(boxes, at, bar)` and `insertionIndex(boxes, bar)` take the title bar's middle (the title bar decides above or below); `RACK.hyst` is removed. Racks carry `data-mir-rack`. The rack's height motion joins the core's one-writer registry through `core/motion.js` `own(el, anim)` → Promise<boolean> (`docs/CORE.md`).
- **createRack options (1.5.0-alpha.12)**: `scrollbar` (false; true seats BASINS' scrollbar at the card column), `tabletClamp` (true), `retired` (`{ oldId: heirId }`), `notebook` (the notebook or `() => it`; layouts keep `nb: [w, h]`), `name` (COPY's head line), `persist` (`'all'` | `'closed'`: `'closed'` keeps only which windows are closed and the phone rack shown across a reload; `closedLayout(windows, { phoneShown, at })` is that record).
- **Rack verbs (1.5.0-alpha.12)**: `rack.resetLayout()` → true (RESET LAYOUT: every float docked home, every window opened, powered on, unfolded and in its home rack; the rack shown; app cards keep their place and state) · `rack.digest(id)` → string (`name · TITLE · ISO time`, `status\t…`, then one `label\tvalue\tsub` line per readout) · `rack.copyDigest(id)` → Promise&lt;string&gt; (the digest to the clipboard and a 900-ms `· COPIED` flash on the status) · `rack.scrollbar` → `{ paint(), tracks, destroy() }` | null.
- **createRack (1.5.0-alpha.14)**: `layoutExtra: { capture() → object, apply(object, layout) }` (the app's own layout state rides every layout as `extra`, BASINS' `docked`); `rack.touch()` (the layout changed outside the rack: save it); `readLayout` keeps `extra`.
- **Pure helpers (1.5.0-alpha.12)**: `readLayout(raw, known, retired)` (resolves retired ids, keeps `nb`), `clampFloatTablet(x, y, w, h, vv, edge)`, `digestText({ name, title, status, rows, at })`. **`mir/shell/rack-scrollbar.js`**: `createRackScrollbars({ host, racks, span, view })` → `{ paint(), tracks, destroy() }`; pure `scrollbarSeat({ side, rect, gutter, view, overflow, uiHidden, hidden })`, `thumbOf({ height, client, scrollHeight, scrollTop })`, `SCROLLBAR`.
- **Pure helpers.** `reorderIndex`, `insertionIndex`, `slotRect`, `moveId`, `clampFloat`, `detached`, `peekSide`, `dodgeSeat`, `queueToggle`, `openOrder`, `favSlot`, `readLayout`, `layoutLabel`, `localStore`, `RACK`, `SIDES`.
- **`mir/shell/rack.css`** loads after the kit's sheets and core.css, in `mir.kit.house`.

### The GUI window: `mir/shell/gui.js` ([GUI.md](GUI.md), [THEMES.md](THEMES.md))

- `createGui({ host, prefs, app, about, accent, defaults, storageKey, inkSampler, tierBench, sampling, projectAccent, rack })` → `{ root, window, prefs, open(page), close(), toggle(page), page, turn(dir), moving(bool), dropGuides(), census(), applyTheme(id), applyTone(id), themeCost(id?), tier(), measureTier(force?), sampling(), light, parallax, destroy() }` (1.5.0-alpha.12). `inkSampler`: a `createInkSampler` sampler (TEXT · AUTO samples; LIGHT · DARK stop it) or `true` (the app's own sampler; TEXT offers TEXT · SAMPLED, the `text` option `'sampled'`, no `data-text` written). `tierBench: async ({ win, doc, budgetMs }) → { periodMs, passMs }`. `sampling: { automation(grid), frameMs() }`. `projectAccent` (default true) registers the project part `accent`. `rack` shows RESET LAYOUT. `tier()` → `{ tier, hz, periodMs, passMs, headroom, ms, at, version, why }` or null; `sampling()` → `{ scrub, grid }`.
- `shell/gui.js` also exports (alpha.12): `measureTier({ bench, storage, key, force, win })`, `storedTier(storage, key)`, `uiBench({ win, doc, budgetMs })`, `TIER_KEY`, `AUTOMATION_GRID`, `effectiveQuality(quality, tier)`, `touchTablet(doc, signal)`; `lookSchema({ tier })` takes the tier reader. New rows: STATUS TAGS, TRANSPORT BAR, SAMPLING (SCRUB · AUTOMATION), ACCENT BRIGHTNESS, FORGET, RESET LAYOUT. A new user's defaults: HELP off, CONTROL HINTS on, STATUS TAGS off, QUALITY AUTO.
- `createGui({ …, forget: [storage keys] })` (alpha.14): FORGET wipes the look's own key and each listed key; `forgetLook(prefs, keys = [], storage?)` is that wipe, exported. A fresh look store's TEXT is `light` (FROST is the recipe's White Text).
- `shell/accent.js` (alpha.14): `createAccent({ …, model: 'palette' | 'hsl' })` (`'hsl'` is BASINS' accent engine: A = 180°, VIVID 1 is hsl(180 100% 64%)); the result has `model`; `hslVivid(v)` → `{ sat, lum }`, `hslToRgb(deg, sat, lum)`.
- `shell/accent.js` (alpha.12): `createAccent({ …, bright })` and `set({ bright })`, `.bright`; `towardWhite(rgb, k)`; `accentPart({ get, set, subscribe })` → a project part. `core/look.js` (alpha.12): `isMobile(nav, matchMedia)`, `isIPad(nav)`, `TOUCH_TABLET_MQ`, `BLUR_DESKTOP` (11), `BLUR_TOUCH` (20), `firstRunBlur(mobile)`, `DEVICE_BLUR`, `TIER_LAW`, `classifyTier(hz, headroom)`, `qualityOfTier(tier)`.
- **`mir/core/ink.js`** ([INK.md](INK.md), alpha.12): `createInkSampler({ sample, doc, stage, skip, hz, law, frame })` → `{ update(), poke(), mode(m?), tick(), explain(el), state(), stat, destroy() }`; `sample()` → `{ luma, w, h, rect? }` (or a Promise); `canvasSample(source, { w, h })`; pure: `INK`, `INK_SKIP`, `parseFill`, `over`, `paintOf`, `summedArea`, `meanUnder`, `groundOf`, `decide`, `walkCells`, `domIO`.
- `lookSchema()` → the schema rows (35 options) · `LOOK_PRESETS` → `{ [themeId]: theme options }` · `THEMES`.
- `glassTint(bright, hue, tint, theme, saturation = 1)` → `'H S% L%'` | null · `census(doc)` → `{ blur, shadow, shine }` · `stepper(o)` · `migrateShadow(key, win)` · `SKINS`, `MIR_VERSION`, `MIR_WORDS`.
- Sheet: `mir/shell/gui.css`.

### An app's own panes: `[data-mir-surface]` (1.5.0-alpha.7, [GUI.md](GUI.md))

`data-mir-surface="pane | float | menu | chip | island"` on an app's own element gives it the kit's material: `pane`, `float` and `menu` are the three heights, `chip` keeps its own corner, `island` is a pane only while DISCONNECTED. It is in every rule a `.glass` pane is in, at no weight of its own. The look options `reliefAngle` (0–360, default 315) and `reliefLink` (default off) are the second light (`THEME_KEYS` has both).

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
- **Each layout keeps its own drawing (1.5.0-alpha.15).** `BASINS_LAYOUT` = `[{ group: 'native-play-row', items: ['play', 'power', 'tempo', 'rewind'] }, 'panel', 'openers', 'seat', 'dock', 'door']`, `name: 'basins'`; `LAMBDAWAVES_LAYOUT`: unchanged items, `name: 'lambdawaves'`. `createTransport({ layout })` writes `data-layout="<layout.name>"` on the bar when the layout has a name. λWAVES' has its own drawing (the 640 px bar, the pill last, the wrapping docked row, 13 px glyphs); any other layout, an app's own list included, is drawn as BASINS' is (the bar as wide as its row, the five-column docked grid, 12 px glyphs: `--xport-glyph`).
- `firstRun(...stores)`, `rackOpeners(rack, { only, glyphs })`, `transportActions(get)` (Space: the one play; the row has `overControls: true`, so Space plays over a focused button, latch or knob), `PLAY_ACTION` (`'transport.play'`).
- Pure: `formatBpm`, `clampBpm`, `digitStep`, `charAt`, `dragBpm`, `keyStep`, `parseBpm`, `seatOf`, `homeOf`, `seatRect`, `menuSide`, `localSeatStore`, `menuRow`, `openerRows`, `isOpenOf`, `toggleOf`; `TRANSPORT`, `SEATS`.
- Sheet: `mir/shell/transport.css` (after `rack.css`), `@layer mir.kit.house`; tokens `--xport-*` on `.mir-transport`.

---

**Additions (1.5.0-alpha.12).**
- `createTransport({ …, door: 'palette' | 'mark', onSwitch, macros })` → adds `mountIn(host | null)` → placement, `placement` (`'stage' | 'work' | 'rack'`), `closed`, `tempoPanel(show)`. Event `transport-placement` (`detail.placement`) on the bar. The timeline takes the app's one bar as `transport: { shared: tr }`.
- `bindTempoField({ button, input, tempo, enabled, drag, paint, signal })` → `{ open(), close(take), editing, destroy() }` · `tempoPill({ tempo, panel, work })` (`work()` true: a click types, a drag is the travel law) · `tempoPanel({ tempo, mod, macros })` → adds `rail` · `macroRail({ M, api, signal })` → `{ root, rail, tiles, sync(), rebuild(), destroy() }` · `modDoor({ mod, mark, onSwitch, work })`.
- Pure: `placementOf({ docked, host })`, `tempoDirection(rect, panelHeight, viewHeight)`, `travelBpm(start, rise, { shift, touch, min, max })`, `reorderTo(key, at, count)`; `PLACEMENTS`; `TRANSPORT.fieldChars / travel / travelTouch / travelFine / panelGap`.
- `shell/wordmark.js`: `wordmark(parent, { lead, word, sub, id, svg, mark })`: `svg` = SVG markup or an element, or `{ dark, light }` image URLs (wordmark-dark carries white ink); `mark` = the app's symbol in place of the nine squares (kept unseen in `.word` so `#title .mark` still feeds loading seats); `.word` becomes `role="img"` with `aria-label` = `word`, `data-art`; its height is `--title-art-h`. `createMirDiamond(target, { colors })` → `{ diamond, tiles, destroy() }`; `installPaletteCycle(target, tiles, colors)` → destroy; `MIR_PALETTE`, `PALETTE_STEP` (240), `paletteAt(i, offset, colors)`.

---

## `mir/shell/keys.js` and `mir/keyboard/`: one key table, the keyboard window, the help view

The keyboard is data: one table of actions, from which the kit makes the listener, the menu key column, the hints, the
help view and the KEYBOARD window ([KEYS.md](KEYS.md)). Load `mir/keyboard/keyboard.css` after `mir/window/window.css`.

| Export | What it is |
|---|---|
| `keys.add(action \| actions)` → the ids added | Rows after the table was made, with their saved keys (1.5.0-alpha.6). `createKeys` and `add` throw a `TypeError` for a declared key that does not parse (a modifier alone), naming the action |
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

**BASINS' table is the kit's default (1.5.0-alpha.12).** `KIT_KEYS` → the kit's default chords by action id (`transport.play` Space, `save` Mod+S, `folders` S, `modulation` M, `notebook` J, `rack` B, `dock` T, `hide` H, `fullscreen` F, `help` ?); `toggleFullscreen(doc?)` → the document full screen, or out.

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
| `notice(text, { kind = 'info' \| 'ok' \| 'warn' \| 'error', ms, action: { label, run }, seat = 'toast' \| 'corner', stack, offset, max = 4 })` → `{ close(), root }` | **toast** (default, BASINS'): one centred seat, `offset` from the bottom (default 84 px), replaced by the next notice, no ×, 3 s. **corner** (`seat: 'corner'` or `stack: true`, NEBULA's): a stack of up to `max`, each with a ×, 5 s (9 s for an error). `ms: 0` stays; hover or focus holds either. The toast is `#mir-toast.glass`, takes no press (an action does), z-index 50 (1.5.0-alpha.7) |
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

### The scene guard, the banner, copy, the menus' rows, the dump lines, the wake lock (1.5.0-alpha.12)

**`mir/shell/scene-guard.js`** ([SCENE-GUARD.md](SCENE-GUARD.md))
| Export | What it does |
|---|---|
| `createSceneGuard({ canvas, rects, hover = false, install = true })` → `{ hit(e), wheel(e, region), destroy() }` | the guard. `rects()` → `[{ left, top, right, bottom } \| { left, top, width, height }, …]`, each optionally with `scroll` (an element or `(e) → element`). `install: true` stops events aimed at `canvas` in UI space in the window's capture phase; `false` leaves the calls to the app's gesture engine |
| `uiSpace({ rack, layer, extra })` → `rects()` | the kit's UI space: the rack's columns (gutter out, the rack as scroller), everything visible in the float layer by its whole rect, and `extra()` |
| `box(r)`, `regionAt(list, e)`, `wheelStep(mode, page)` | pure helpers |

**`mir/shell/banner.js`** (+ `banner.css`)
| Export | What it does |
|---|---|
| `installBanner({ host, errors = true })` → `{ root, report, fail, warn, offerReload, hide(), problems, destroy() }` | seat the pane; `errors` reports every uncaught error and rejection |
| `report(severity, title, detail?)`, `fail(title, detail?)`, `warn(title, detail?)` | one funnel: de-duplicated by title with a count, at most 30 drawn, an error makes it an error pane |
| `offerReload(on = true)` | the "Reload the page" button under the problems |
| `problems()` → `[string]` | the dump's lines; `describeDetail(x)` the detail's text |

**`mir/shell/boot.js` (added)**
| Export | What it does |
|---|---|
| `bootVeil({ ready, el, host, timeout = 8000 })` → `{ el, stat, dismiss(via), done }` | the veil until the first real frame (+1), a 160 ms fade; `ready` a function asked once a frame, or a Promise; `stat` measured; a `boot veil` dump line |
| `veilLine(stat)` | that line |
| `watchDevice(device, { recover })` → `off()` | a GPU device lost after boot: `recover(info)` first, else the banner and RELOAD |

**`mir/shell/clipboard.js`**: `copyText(text)` → `Promise<boolean>`: the clipboard, then a hidden textarea and `execCommand('copy')`; never throws.

**`mir/shell/menubar.js` (added)**: `comingRow(name, hint)` · `purgeRow({ name })` · `copyDumpRow(dump, hint?)`: one menu entry each ([SHELL-PARTS.md](SHELL-PARTS.md) §10). **`mir/folders/files.js` (added)**: `recentRows(files, n = 5, open)`: the last `n` projects as `↺  NAME` rows, newest first, the folder in the hint, raw names.

**`mir/core/describe.js` (added)**: `registerDumpLines(name, fn)` → `off()` · `dumpLines()` → `[string]`: a module's own lines in every dump; a throwing producer is one line.

**`mir/core/wakelock.js`**
| Export | What it does |
|---|---|
| `createWakeLock(env)` → `{ acquire(opts), release(), disarm(), armIfNeeded(ctx), state() }` | BASINS' state machine, every platform dependency injected |
| `installWakeLock({ clock, nav, target, doc })` → `{ hold(reason) → release(), sync(), state(), line(), destroy() }` | held while the clock plays and while held; a `wakeLock` dump line |
| `wakeLine(state, stat)` | that line |

---

## FOLDERS: `mir/folders/`, the project window ([FOLDERS.md](FOLDERS.md))

**`folders/folders.js`**
- `createFolders({ host, id = 'folders', domId, title = 'FOLDERS', store = 'mir.folders', storage, prefs, app, adapter, actions = DEFAULT_ACTIONS,
  panels, galleryPanel, onTab, head = false, status = false, chipSide = 'right', seeds, seededKey, size, min, dock, onMoved, rack, firstSeat,
  anchor = 'right', top = 162, say, download, picture, defaultName, capChars, parts, sorts, depthOf, factory, freshLoses, locked, projection,
  capturePicture, savePicture, pictureStale, onInspect, onOpened, onSaved, galleryCopy, files, emptyDragExcept })` → `{ win, files, gallery, adapter,
  seeded, intake, views, panels, tab(id?), activeTab(), mountGallery(el, { pageSize, prefsKey, actions, factory, onInspect }), open(), close(),
  toggle(), isOpen(), save(), saveAs(), fresh(), openEntry(), current(), dirty(), seed(), exportProject(), importEnvelope(), ingest(), say(),
  state(), destroy() }` (1.5.0-alpha.7: BASINS' toolbar and panels by default). 1.5.0-alpha.8 adds `dragToFolder` (off; drag-to-folder and MOVE TO), `folderGlyph` (BASINS' `mandelbrotSmall` by default), `onOpen` (a persisted open included), `material` (default `'modulation'`: the window wears the modulation window's material; `null` for the house glass) and `railGap`
- `DEFAULT_ACTIONS` (BASINS' toolbar: PROJECT · CAPTURE · DOWNLOAD · DUPLICATE · NEW · ⋯), `FOLDERS_ACTIONS` (SAVE · SAVE AS · NEW · OPEN FILE · EXPORT), `GALLERY_PANEL`; `freeSeat({ …, anchor: 'centre' | 'right', gutter })`
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

### `bind.js`: one stack (1.5.0-alpha.15)

The modulation window `installModulation` mounts joins the kit's one window stack (`registerWindow({ root: view.root, rail: view.rail })`, `mir/window/window.js`): a press on it raises it over every kit window and a press on a kit window (PATTERN, the timeline) raises that one over it. `dispose()` takes it out again. An app that registers the same root itself gets the first registration back.

### `bind.js`: a list of targets at once, and macros a panel owns (1.5.0-alpha.14)

`add([param, …])` adds a list and rebuilds the window once (→ one `remove()` for them all); `add(param)` is as before. `own(macroId, owner)` → off: a panel drives this macro by hand (the XY panel's ROUTE), so `route()`'s free-macro finder and the window's source cycle (`cycleMacro`, `cycleAudioOut`) pass it by; `owned(macroId)` → the owner or null; `apply()` re-applies every route now and paints once. The window reads `port.owned`. An audio HIT's envelope (`mod.js hitMacroFor`) can still take an owned macro when every other macro is busy.

### `bind.js`: `onTick` (1.5.0-alpha.11)

`installModulation(…)`'s result adds `onTick(fn)` → off: `fn(stamp)` after every advance of the clock (the timeline's playhead rides it, without the app's `present`).

### `bind.js`: the app's play is never refused (1.5.0-alpha.6)

`play(true)` holds a demand of its own on the clock (`host.clock.demand('app.play')`), so with no route, no source or the power off, the app still plays. A bare `host.js` keeps its "nothing-to-run" refusal.

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

Since 1.5.0-alpha.13 the window draws through the house's one icon library (`glyph.js`): its private `GLYPHS` copy is gone, `SVG_PLAY`, `SVG_PAUSE` and `SVG_POWER` are `glyphSvg` strings, `gripIcon()` is the `move` glyph and `powIcon()` the `power` glyph. The window's weights (`--m2-glyph-sw`, `--m2-glyph-dim`, `--m2-power-sw`, `--m2-pow-stem-sw`, `--m2-pow-ring-sw`) are read by the plugin's own rules (`modwindow.css`, `modhost.css`), so a glyph drawn outside the window's root keeps the library's own weight; `--m2-xport-sw` is retired.

| Export | What it is |
|---|---|
| `createModWindow(host)` | The whole window, built and not wired: `root.modwindow` holds `rack, foot, transport, addMacro, addDevice, buildRing, buildSpan, buildClear, buildGhost, buildDevicePick, buildMacroPick, buildPresetSheet, buildDeadInspector` |
| `buildChipRail`, `buildMacroSlot`, `buildDevice`, `setDeviceMode`, `buildAudioSheet`, `buildRing`, `buildSpan`, `buildClear` | The sub-builders |
| `setViewHeight`, `setWorkLane` | Sizing the rack view and the work lane |
| `ringGeom`, `knobArc` | Ring and arc geometry |
| `gripIcon`, `powIcon`, `glyphEl` (a re-export of `glyph.js`'s), `setGlyph`, `m2mk`, `m2svg`, `SVG_PLAY`, `SVG_PAUSE`, `SVG_POWER` | The window's own icons and DOM helpers |
| `NS`, `WINDOW_ID`, `WINDOW_TITLE`, `CHIPRAIL_LABEL`, `IDS`, `GEOM`, `sizeLaw`, `COPY` | Names, ids, geometry and copy |

**The complete controller that wires the window to a host is not in the kit yet.** Routes, rings, the clock and presets (`wireGrip`, `wireDepth`, `paintDepth`, `moveMacro`, `rebuildMacros`) live in λWAVES' `lab/modwindow.js`, which BASINS and NEBULA copied. Curve pointer semantics are the exception since 1.4.2: every host imports `curve-gesture.js`, so copied controllers cannot drift on point/tension controls.

The window loads two sheets, `mir/modulation/modhost.css` and then `mir/modulation/modwindow/modwindow.css`, and nothing may follow the second.

---

### The rest of BASINS' fork (1.5.0-alpha.12)

```
mir/modulation/bind.js (added)
  setAutomationGrid(value) → grid | null · automationGrid() → grid | null · upsertProjectPreset(name, rack?) → presetSave result
  installModulation options: automationGrid, factory, switchWorkspace, toast, onWindow, moved;  result: setTimeline(tl), timeline(),
    setAutomationGrid(g), automationGrid()
mir/modulation/window.js (added)
  wireGrip(grip, macroId) · wireDepth(seat, macroId, n) · paintDepth(seat, arc, macroId) · moveMacro(macroId, to) — the live
    window's macro gestures (→ false with no window)
  createModulation(…) result: seatBox(), onGeometry(fn) → off, setPattern(p), setTimeline(tl), stackAbove(anchor), isStacked,
    stackHeight();  api.sendToTimeline(id), api.selectForTarget(id), api.placement().content (the content box, now);
    port: toast, timeline, switchWorkspace, starterPresets, applyStarterPreset;  the rail's default seat is 'auto'
mir/modulation/host.js (added)
  AUTOMATION_GRIDS · clock.setAutomationGrid(g) / automationGrid() · clock.onAdvance(fn(kind)) → off ('tick' | 'step' | 'seek')
    · clock.isStepping()
mir/modulation/mod.js (added)
  presetCaps(name) · presetUpsertCaps(name, rack) · bundledPresets(list, folder?) · rackApply(rack, fromV?)
mir/modulation/layout-motion.js
  createLayoutMotion(nodes, { skipOwn? }) → { change(fn, sizing), hold(node), follow(node, x, y), layoutRect(node), release(node),
    holding, destroy() }
mir/modulation/mod-cursor.js
  createModCursor({ rec, timeTextAt, inkOf }) → { resolve(ev), gesture() }
mir/timeline/bind.js (added)
  installTimeline attaches itself to the modulation (mod.setTimeline(tl)); dispose() takes it back
mir/timeline/window.js (added)
  port.transport: { layout, nodes, rack } | { shared: tr } (the app's one transport: it moves into the work lane while it shows) | false (none)
```

## `mir/pattern/`: the step sequencer for the modulation window's envelopes ([PATTERN.md](PATTERN.md), 1.5.0-alpha.12)

```
mir/pattern/window.js
  installPattern({ mount, mod, model?, history?, project?, dock?, store?, storageKey?, say?, moved?, onWindow? })
    → { win, root, rail, model, sequencer, open(), close(), toggle(), isOpen(), show(envId), rows(), seat(), docked(), height(),
        menu(), sync(), paintMarkers(force), closeMenu(), destroy() }
mir/pattern/model.js
  createPatternModel() → { row, rowsLive, rowOf, steps, lengthOf, isLive, lit, setStep, setSteps, fill, clear, setLength, setLive,
    capture, signature, restore, subscribe, rackChanged, bindRack, rackVersion }
  patternProjectPart(model) → { capture, restore, signature, subscribe }
  PATTERN_LENGTHS [16, 32, 64] · PATTERN_MAX 64 · STEP_BEATS 0.25 · VEL_MAX 127
mir/pattern/sequencer.js
  stepCrossings(p, b, step?) → [k]
  createPatternSequencer({ M, clock, pattern, timeline?, step? }) → { tick(), reset(beat?), position(envId, beat?), scale(), stats() }
```

## `mir/timeline/`: the timeline, the kit's second plugin ([TIMELINE.md](TIMELINE.md), 1.5.0-alpha.11)

### `bind.js`: the app seam
- `installTimeline({ mount, mod, model, present, say, dock, storageKey, store, initial, keys, history, project, remap,
  automation, transport, audio, scrubLevel, busy, moved, onWindow })` → `{ win, root, rail, editor, model, controller,
  transport, actions, keys, open(), close(), toggle(), isOpen(), paintHead(), presentation(), restore(shape),
  shortcuts(x, y), automation(id, beat), dispose() }`.
  `mod`: `installModulation`'s result (its registry is the targets, its clock the time); `initial`: the first shape
  `{ dock, open, x, y, w, h, chipSide, workLane }`; `keys`: the app's `createKeys` table (the timeline's rows and the
  one play's Space go in it); `history`: the app's `createHistory`; `remap(id, saved)`: a target id that does not
  survive a reload; `automation: false`: the app wires `model.value` into its clock itself; `transport`:
  `{ layout, nodes, rack }` or `false`; `audio`: `{ pick({ laneId, start }) }`; `scrubLevel()`: `'live' | 'light' |
  'release'`; `busy()`: a recorder owns the clock.
  `controller` (1.5.0-alpha.15): the app's own one-play controller (`timeline/controller.js`'s shape), forwarded to
  `createTimeline`, so its play, its scrub gate and its refusal sentences are the ones used; absent, one is made from
  `scrubLevel` and `busy`.

### `window.js`: the window
- `createTimeline(host, port)` → as above, without `keys`, `automation` and `dispose` (`destroy()` instead). `port`:
  `{ model, mod, controller, present, say, dock, store, initial, size, min, keys, transport, audio, scrubLevel, busy,
  moved, onWindow, id, title, storageKey }`.
- `TIMELINE_TRANSPORT` (the work bar's layout: play, power, tempo, `app:readout`, rewind, then dock and door),
  `TIMELINE_SIZE` (1080 × 440), `TIMELINE_MIN` (320 × 400).

### `editor.js`: inside the window
- `buildTimelineEditor(win, { model, mod, controller, present, say, audio })` → `{ surface, transportHost, toolbar,
  createClip(targetId), addClip(kind, source, { start, duration, laneId, targetId, name, select }), at(x, y) → { beat,
  snapped, laneId }, model, paint(), px(), view, act, range(), activeRange(), setActiveRange(r), onDrop(fn) → off,
  slice(ids, beat), tool(), setTool(name), gesture(), paintHead(), selected(), selection() → { clips, points }, workLane(),
  setWorkLane(lane), snap(), setSnap(beats), scope(), keysLive(), locate(targetId), addLane(), removeLane(), close(),
  dispose() }`. `act` is the key table's verbs. `SNAPS`, `TOOLS`, `SWATCHES`.

### `model.js`: the arrangement (pure)
- `createTimelineModel()` → `{ state(), serialize(), subscribe(fn) → off, beforeReplace(fn) → off, begin(), commit(),
  cancel(), undo(), redo(), restore(snapshot | null, remap?) → bool, addLane(), removeLane(id, confirmed?), create({ targetId,
  name, value, start, duration, laneId, source }), updateClip(id, patch), updateCurve(id, patch), addPoint, movePoint,
  movePoints, removePoints, drawPoints, removePoint, setTension, setSegment, deleteClip, deleteClips, copyClips,
  pasteClips, duplicateClips, moveClips, duplicate, makeUnique, value(targetId, beat) → 0..1 | null, setActive(range),
  activeClips(beat, kind?), needsClock(has), signature() }`; `isTimelineSnapshot(o)`; `DEFAULT_TIMELINE_COLOR`,
  `TIMELINE_HISTORY_BYTES`, `TIMELINE_HISTORY_LIMIT`.

### The pure laws
- `source.js`: `normalizeTimelinePoints`, `evaluateTimelineSource`, `addTimelinePoint`, `moveTimelinePoint`,
  `slideTimelinePoint`, `moveTimelinePoints`, `removeTimelinePoint(s)`, `drawTimelinePoints`, `setTimelineTension`,
  `setTimelineSegment`, `TIMELINE_MAX_SOURCE_POINTS` (256), `TIMELINE_MAX_TOTAL_POINTS` (32768).
- `kinds.js`: `registerClipKind(name, { validate, value, paint, slice, duration, drives, menu })`, `clipKind(curve)`,
  `clipKinds()`, `isKindCurve(curve)`.
- `pattern-kind.js`: `patternSteps`, `patternSource({ envId, steps, name, color })`, `patternRepeatBeats`, `paintPattern`,
  `PATTERN_LENGTHS`, `PATTERN_STEP_BEATS`.
- `audio-kind.js`: `audioSource(meta, { bpm, keep, band })`, `validAudioSource`, `envelopeAt`, `audioRate`,
  `readjustAudioTempo`, `stretchAudioClip`, `patchAudioClip`, `audioBudget`, `setAudioPeaks(fn)`, `AUDIO_KIND`,
  `toBase64`, `fromBase64`, `envelopeFrames`, `sourceBeats`, `AUDIO_*`.
- `geometry.js`: `createClipCoordinates`, `timelineLaneHeight`, `nearestTimelineLane`, `snapTimelineBeat`,
  `timelineResizeDelta`, `resizeTimelineClip`, `timelineTabPath`, `TIMELINE_TAB_HEIGHT`, `TIMELINE_ROW_GAP`,
  `TIMELINE_POINT_RADIUS`, `TIMELINE_TENSION_RADIUS`, `TIMELINE_CURVE_GRAB`, `TIMELINE_TENSION_TRAVEL`.
- `curve-view.js` `createTimelinePlot`; `draw.js` `timelineStepSamples`; `selection.js` `selectionRect`, `clipsInRectangle`,
  `pointsInRectangle`; `slice.js` `sliceClips`, `sliceClip`, `curveCut`, `midpointTension`, `SLICE_MIN`;
  `time-format.js` `formatSeconds`, `formatBar`, `formatPercent`; `view.js` `tickLaw`, `ticks`.
- `controller.js`: `createTransportController({ mod, onChange, onRefusedPlay, now, scrubLevel, busy })` → `{ play(on),
  toggle(), seek(beat), scrub(beat, { snap, alt, shift }), beginning(), beginScrub(), endScrub({ cancel }), isScrubbing(),
  handBeat(), subscribe(fn) → off, setModulation(on), toggleModulation(), state(), dispose() }`.
- `project.js`: `timelinePart(model, { remap })` → `{ capture, restore, signature, subscribe }`,
  `registerTimelinePart(model, { remap, name }, register?)` → unregister.
- `history.js`: `adoptTimeline(history, model, name = 'timeline')`, `timelineLabel(method)`.
- `shortcuts.js`: `timelineActions(get)` → key-table rows, `TIMELINE_POINTER`, `TIMELINE_FIXED`,
  `shortcutRows(actions, keys?)`, `openTimelineShortcuts({ actions, keys, x, y })`, `renderShortcutsMarkdown(actions)`.
- `readout.js`: `createReadoutLayer({ mount, resolve })` → `{ refresh(), dispose() }`, `coalesce(fn)` → `{ post, flush,
  cancel }` (over `core/frame.js`); `cursor.js` `createTimelineCursor({ editor, mod })`; `playhead.js`
  `createTimelinePlayhead`; `knobs.js` `installTimelineKnobs({ registry, editor })`; `icons.js` `TIMELINE_ICONS`.

---

## `mir/window/` and `mir/history/`: additions (1.5.0-alpha.5, alpha.7, alpha.8)

- `window/window.js` `createWindow({ …, material, railGap })` (1.5.0-alpha.8; the full signature is `docs/WINDOWS.md`): `material: 'modulation'` (or `true`) — the window wears the modulation window's material: rail, chips, controls, resize corner; no CSS cloning (`data-mir-material="modulation"` on the window and its rail). `railGap` (default `RAIL.gap`, 8 px): a floating window's rail sits that far off the pane's right edge, flush on the left, top and bottom; a docked rail stays flush. `dock: { span, guide, anchor: { rect, clip?, subscribe? }, guideClass }`: the anchor dock docks a window onto another element's seat, corner to corner (reach 96, capture 32), follows it, is clipped to `clip()` and hides while the seat is gone.
- `window/window.js` (1.5.0-alpha.9): `windowOf(el)` → the kit window whose pane or rail is `el` (or holds it), or null; a window's `pair` is `{ root, rail }`; `win.stackAt(z, { railOffset })` puts the pane at z-index `z` and its rail at `z + railOffset` (default `createWindow({ railTier })`, itself default 1), so an app's own stacking law never parts them, and an app that keeps its rails in a tier above its windows passes `railTier` (1.5.0-alpha.10).
- `window/rail.js`: `RAIL.gap`, `gapOf(gap, side)`; `chipPosition(side, box, w, h, view, pad, gap)`, `seatOn(…, pad, gap)`, `seatRail({ …, gap })`, `roomFor(…, pad, gap)` (gap default 0, so the modulation window seats as BASINS' `positionChips` does).
- `window/dock.js`: `anchorTarget(box, seat, { reach })`, `anchorBox(seat, height)`; `createDockGuide({ layer, enabled, window, cls })` (one guide drawing; its overlays carry `data-mir-guide="dock"`, `data-window`, `data-edge` and the app's class), whose `track(box, o, seat?)` takes the seat as a third argument.
- `core/pointer.js` `drag()`: a non-primary press is refused only when it is trusted (a real second finger); a scripted `PointerEvent` (isPrimary unset) is a press (1.5.0-alpha.8).

- `window/window.js` (1.5.0-alpha.12): `win.resize({ w, h })` → the window's own size, keeping its dock (an edge or an anchor), one layout, saved; `reserveTop(px)`, `reserved`, `stackAbove(anchor | null)`, `isStacked`, `stackHeight()` (the lego stack). Pure: `stackedAt(box, anchor, view, gap)`, `withReserve(span, px)`; `windowLayout`'s env takes `top` (a floating floor). Docked-resize rules: [WINDOWS.md](WINDOWS.md) law 12.
- `window/window.js` (1.5.0-alpha.15): `registerWindow({ root, rail? })` → `{ root, rail, pair, raise(), leave() }`: a window the app built itself joins the kit's one stack (on top). A press on its pane or rail raises the pair over every kit window; a press on a kit window raises that one over it. `windowOf(el)` finds it. `leave()` takes it out (its z-index stays where it was). Registering the same root twice returns the first registration.
- `window/window.js` (1.5.0-alpha.15): `win.restore(shape)` puts the window in a persisted shape `{ x, y, w, h, open, dock, chipSide }` (fields left out keep theirs); it opens or closes as the shape says; `dock: 'anchor'` seats it on its anchor again. `dock.anchor.rect()` may return `{ …, avoid, outer }`: the glass the rail must keep off and the edge facing away from it. Seated on an anchor, the window takes the seat's width as its own (kept when a hand frees it).
- `window/rail.js` (1.5.0-alpha.15): `seatRail({ prefer, box, sizes, view, pad?, gap?, avoid?, outer?, lane? })`: with `avoid` it is BASINS' seat law under another window (a clear lane: inside `lane`, off `avoid`; a real `prefer` side wins; `auto` orders left, right, `outer`, then the rest; else the seat that covers least, else the first reachable side). Pure: `coverOf(seat, rect)` → the area of the seat that lies on `rect`.
- `window/workspaces.js` (new, 1.5.0-alpha.12): `createWorkspaces({ upper, lower, gap })` → `{ sync(), moved(which, rect | null), show(which), stacked, destroy() }` (MODULATION 8 px above TIMELINE when both are open) · `workspaceSwitch({ run, title })` → `{ root, destroy() }` (the MIR switch chip) · `stackPlan(u, l)`, `stackedAt`, `WORKSPACE` (`{ gap: 8 }`), `WHICH`.

- `window/dock.js` `observeSpan({ left, right, edge, view, occupied, narrow, active })` → `{ read() → { left, right, width, top, bottom }, subscribe(fn), setActive(on), active, destroy() }` (1.5.0-alpha.7, BASINS' rack-bounds): the rack's shadow gutter is subtracted; a rack with no open window (`occupied`, default `.dev:not(.closed):not([hidden])`; `false` counts any rack), a hidden one, `phone`, `ui-hidden` or a viewport of at most `narrow` (860) px counts as absent.

- `window/rail.js` `createRail(…)` → adds `setDock('top' | 'bottom' | null)`: docked at the top or bottom, the rail's chips sit tighter (its disc plus `--rail-gap` along the rail). `createWindow` calls it from its layout, so every kit window's docked rail tightens.
- `history/history-list.js`: `historyList(history, host, { tools = true, count = true })` → `{ root, paint, state(), onChange(fn) → off, destroy }`; `tools: false` / `count: false` leave UNDO / REDO and the count to the host; `state()` is `{ canUndo, canRedo, length, count }`. `historyState(history)` is the same state, pure.

---

## `mir/core/describe.js`: what a visiting model can read (1.5.0-alpha.4, [LLM-MODS.md](LLM-MODS.md))

- `createDescribe({ app, rack?, params?, pages?, keys?, prefs?, mod?, transport?, doc?, mount?, max? })` (`params` may be a function; with `transport`, `describe()` carries the clock: playing, the tempo, modulation's power) → `{ describe(), dump(), refresh(), observe(event), events(), errors(), destroy() }`
  - `app` `{ name, version?, what? }`; `rack` a `createRack()`; `params` the rows `installModulation` takes (`{ id, label, unit?, min, max, get() }`); `pages` a `createPages()`; `keys` a `createKeys()`; `prefs` a `createPrefs()` store (the GUI window's `gui.prefs`); `mod` the `installModulation()` handle (which parameters a route drives, and their base).
  - `doc` the document (default: the page's; `null` runs without a DOM); `mount` keeps the hidden `#mir-describe` element (default true); `max` the events and errors kept (default 20 each).
  - `describe({ pages? })` → markdown (`{ pages: false }`: each shared page as its title and line count, as `tools/check-app.mjs` prints it): the app, its windows (open, built, rack side, floating, folded), its parameters (range, live value, base when modulated), its key actions, and only the pages with `shared: true`.
  - `dump()` → one fenced block: kit version, browser, look (skin, theme, card, frost, language, direction, motion, viewport), the prefs, the rack layout, `perf.snapshot()`, the last errors and the last input events (kind and target hooks only; a key in a field has no key), then `describe()`. Every text a field holds now (4+ characters) is cut out.
  - `refresh()` rewrites the hidden element in one coalesced frame job (it also runs on a pages or keys change and at the end of a gesture). `observe(event)` records one event (the document's capture listeners call it). `destroy()` removes the listeners, the element and the globals.
  - Sets `window.__MIR.describe` and `window.__MIR.dump`.
- Pure: `describeText(state)`, `dumpText(state)`, `targetOf(node)`, `eventEntry(event)`, `scrub(text, typed)`, `DESCRIBE_ID`.

## `mir/controls/`: the control language ([CONTROLS.md](CONTROLS.md), [CONTROLS-COLOUR.md](CONTROLS-COLOUR.md), 1.5.0-alpha.13)

The kit prescribes one control per kind of value. Every control below is re-exported from `mir/kit.js`; each takes `label` / `aria` words through `label()` (so they translate) and returns a widget with the kit knob's contract (`root`, `get`, `set`, `destroy`, and for a value a macro may drive: `show`, `shown`, `setBase`, `setDisabled`, `setDefault`, `paint`).

### The general set: `stepper.js`, `select.js`, `number.js`, `range.js`, `xy.js`, `factory.js`

| Export | What it does |
|---|---|
| `stepper({ label, aria, items, value, onChange(id, dir), wrap, list, pager, count, compact, cls })` → `{ root, prev, next, name, get, set(id), setItems(items, id), step(d), open(), close(), destroy() }` | `‹ NAME ›`: two round 44 px buttons around a live name; a tap on the name opens the full list in the menu pane (`list: false` makes it a label); `pager: true` is the page turner (`count: true` adds `n / N`); `compact: true` (alpha.14) leaves the arrows out of the DOM (the name opens the list, ← → still step); an item with `coming` is listed and never chosen; the arrows mirror under `dir="rtl"`. Buttons are `.mir-step-b[data-step]`, the name `.mir-step-name` |
| `select({ label, aria, items, value, onChange, placeholder, cls, disabled, host })` → `{ root, button, get, set(id), setItems(list, id), open(), close(), isOpen, setDisabled(on), destroy() }` · `listPane({ anchor, items, value, onPick, onClose, label, cls, signal, host })` → `{ root, close(), items }` | the kit's own choose-one, for a long list of data: the list opens in the menu pane (`.mir-pick`, a `.glass[data-mir-surface="menu"]` on the body, or in `host`: alpha.14, a popup's own node, its containing-block offset corrected), never the platform's popup; keys: arrows, Home, End, Enter, typeahead (700 ms), Escape; items are `{ id, label, vars?, coming? }` |
| `number({ label, aria, min, max, value, step, digits, fmt, editFmt, parse, unit, chars, range, drag, onInput, onChange, cls })` → `{ root, face, input, get, set(x), setDisabled(on), open(), close(take), editing, destroy() }` · `bindNumber({ button, input, model, parse, editFmt, enabled, drag, click, paint, chars, step, range, signal })` → `{ open(), close(take), editing, destroy() }` | the tempo field's law for every typed number (alpha.14: the field opens on `editFmt(v)`, default `String(v)`; with `parse` its inverse a value is typed in the unit shown): drag (the whole range in 220 px, 320 under a finger, ⅛ on any modifier or a second finger, on a virtual point), click or Enter opens the field, Enter or leaving takes it, Escape does not; ↑ → ↓ ← one step, Shift an eighth, Page ten, Home / End the ends, Delete home |
| `numberTravel(start, p, opts)`, `parseNumber(text)`, `digitsOf(step)`, `NUMBER` | the pure parts |
| `rangeSlider({ label, aria, min, max, lo, hi, step, log, fmt, minGap, onInput(lo, hi), onChange(lo, hi), cls, loLabel, hiLabel })` → `{ root, lo, hi, get() → [lo, hi], set(lo, hi), setDisabled(on), destroy() }` | one track, two thumbs that never cross; each thumb (`.rng-t`) is a modulation target; a press goes to the nearest thumb |
| `xyPad({ label, aria, x, y, home, tags, onInput(x, y), onChange(x, y), cls })` → `{ root, pad, x, y, get() → [x, y], set(x, y), setDisabled(on), paint(), destroy() }` | one square for the hand and the two knobs that stay the modulation targets (`x`, `y` are the knobs' options and then the widgets); a press brings the dot to the pointer; Home or a double-tap goes to `home` |
| `control(descriptor)` → `{ kind, root, widget, targets, get(), set(v), desc, params() }` · `controlKind(descriptor)` · `KINDS` | (alpha.14: `home` reaches a knob's and a range's thumbs' double-tap too, `home: [lo, hi]` for a range) the kind of value chooses the control: switch · swatch · xy · range · segment (1 to 4 options, every label under 26 characters) · stepper (5 or more, in order) · select (a long list, over 16) · arc · lane · knob · number; `params()` is the record `installModulation({ params })` takes |

### The colour family: `arc.js`, `swatch.js`, `lane.js`, `list.js`, `gesture.js`

| Export | What it does |
|---|---|
| `arcRing(parent, { from = 0, span = 360 })` → `{ svg, set(turn) }` | an SVG ring with round caps: a track `span`° long starting `from`° clockwise from the top, and a value ring `turn`° of it (0 hides it) |
| `arcKnob(o)` → the kit knob plus `{ law, home, paintArc(), arc(), gesture(), dragging(), destroy() }` | every `knob()` option and widget method; `law: 'vertical'` (default) or `'angular'`; `home`; `ink` (a colour or `(base) → colour`); `size: 'sm'`; `onPress(event)`; `live()`. The ring strokes in `--k-state-ink`, then `--lane-ink`, then the accent |
| `ARC` | `{ SWEEP: 300, DEAD: 7, NEAR: 34, FLOOR: .15 }`: the sweep and the angular law's numbers |
| `hueSwatch({ rgb, label, title, onInput(rgb), onChange(), fine })` → `{ root, button, input, arc, set(rgb), get(), dragging(), destroy() }` | a circle of the colour: tap = the platform's chooser, an 8 px drag up or down turns the hue |
| `rgbToHsv(rgb)`, `hsvToRgb(h, s, v)`, `rgbCss(rgb)`, `SWATCH` | pure helpers (`rgb` is `[r, g, b]` in 0..1, `h` in turns); `SWATCH = { ARM: 8, TRAVEL: 220 }` |
| `laneSlider({ home, value, orient: 'h' \| 'v', ink, …fader() options })` → the kit fader plus `{ home, orient }` · `laneInk(node, css)` | a pill in the lane's ink with a glowing thumb; one hand law for both orientations; a modulation target natively; `laneInk` writes `--lane-ink` (`null` clears it) |
| `chipStrip({ id, title, chips, onChip, onGrip, onKey, glyphSize, flow, material })` → `{ el, grip, chip(name), setChip(name, state), state(name), setDisabled(name, on), destroy() }` | a static strip of the rail's `.mir-chip` discs; the rail's chip specs plus `confirm: { text, ms, label }` (an armed-to-fire chip) |
| `sortableList({ items, build, onMove, onRemove, onAdd, cap, min, noun, addLabel, side, armMs, material, axis })` → `{ root, rows, add(), items(), setItems(items), rebuild(), move(id, to), remove(id), nodeOf(id), stripOf(id), count(), destroy() }` · `ARM_MS` (2600) | a stack of island panes with a grip over an armed × beside each, and a + ADD pill that dims at `cap`; reordered by drag or arrows. `axis: 'x'` (alpha.14): strips side by side in one island pane, the chips under each, the drag along x, ← → (mirrored under rtl). 1.5.0-alpha.16: the rack is read by `[data-mir-rack][data-side]` (an adopted rack seats the chips on its outer edge); a stepper in an item's pane is BASINS' blend; + ADD is in the look's corner, in the panes' material, 5 + 7 px below the rows (`--list-foot-gap`, `--list-step-glyph`) |
| `fineHeld`, `fineGain`, `wireTouches` (re-exports of `kit.js`), `tapHome(onHome)`, `forward(root, ev)`, `lawNow()`, `TAP`, `clamp01`, `frac` | the pieces the colour hands share |

### `mir/kit.js` additions

| Export | What it does |
|---|---|
| `knob.setState('warn' \| 'clamped', reason)`, `knob.dragging()` | `warn` draws a 1 px `--warn` ring and the value in `--warn`; `clamped` adds the needle in `--warn`; the reason is the hover hint and `aria-description` |
| `sw({ lamp: false })` | ON is the frost face with the label in accent A, as a trigger's (no lamp) |
| `sw({ glyph, glyphSize = 24 })` (alpha.14) | the glyph is the state (power, an eye, invert): `.sw.sw-glyph`, a 44 px round target with no face, no lamp and no word (the label is the accessible name); the owner shows ON in the glyph |
| `verticalDrag(down, { travel, fine, touchTravel, axis })` → `{ id, touch, move(e), gear, p }` | the knob law as an accumulator (up is +, `axis: 'sum'` also adds Δx) |
| `fineHeld(event, pointerId)`, `gearOf(event, pointerId, fine?)`, `watchTouches()`, `otherTouch(id)` | the fine gear's one decision (Shift, Alt, Ctrl, Meta or a second finger) and its gain (1, or 1 / the law's ⅛) |
| `knob({ dragAxis: 'sum' })` | keeps 1.4's up-and-right drag (the default is vertical) |

## `mir/core/zip.js`, `assets.js` and the audio clip ([AUDIO.md](AUDIO.md), [FORMAT.md](FORMAT.md), 1.5.0-alpha.13)

**`mir/modulation/audio-capture.js`**: `createAudioCapture({ onState({ state, reason }), deviceId }) → { state, reason, live, deviceId, frames, sampleRate, inputLatencyMs, analysisLatencyMs, visualLatencyMs, latencyMs, latencyEstimated, upMs, processing, support(), start(id?) → Promise<state>, stop(), suspend(), resume(), setHidden(v), read(feedHz) → { feedHz, capturedAt, now, sampleRate, rms, bandPower: [low, mid, high], flux, …latency } | null, devices() → [{ id, label }], dispose() }` · `BANDS` (20–250, 250–2000, 2000–16000 Hz) · `AUDIO_STATE` · `audioSupport() → { ok, why }`. It is the default of `installModulation({ audio })` (`audio: false` leaves AUDIO out; an app's own factory wins).

**`mir/core/assets.js`**: `assetId(bytes) → Promise<32 hex>` · `createAssetStore({ name = 'mir-assets', indexedDB }) → { put(meta, bytes) → id, meta(id) → meta | null, load(id) → Promise<meta | null>, bytes(id) → Promise<Uint8Array | null>, list(), delete(id), id }` · `assets` (the shared store; never changes identity) · `useAssets(store)` · `toBase64(bytes)`, `fromBase64(text)`.

**`mir/core/zip.js`**: `class StoredZip { add(name, bytes) → size so far (throws 'ZIP part is full'), finish() → Blob, bytes, entries }` · `PngZipPart` (same) · `readStoredZip(Uint8Array) → Map<name, Uint8Array>` (throws on CRC, compressed, damaged, not a ZIP) · `ZIP_LIMIT` · `zipSafeName(name)`.

**`mir/timeline/audio-kind.js`** (additions): `audioBudgetAdding(doc, [{ assetId, seconds }]) → { ok, clips, seconds?, why?, vars? }` · `audioBudget(doc, { seconds, assetId })` · `setAudioBand(model, clipId, band)` · the kind has a `menu` · `readjustAudioTempo(model, from, to) → count | null` · re-exports `toBase64`, `fromBase64`. **`model.js`**: `rederive([[clipId, patch]]) → bool` (derived state, no undo row), `lastRefusal → { why, vars } | null`.

**`mir/timeline/audio-analysis.js`**: `analyseAudio(channels, sampleRate) → { seconds, frames, sampleRate, peaks: [{ rate, data: Int8Array }], envelopes: { level, low, mid, high } }` · `audioClipFromFile(file, { bpm, keep, band, store }) → Promise<{ source, seconds, duration }>` · `isAudioFile(file)` · `audioBaseName(name)` · `AUDIO_PEAK_RATES`.

**`mir/timeline/audio-playback.js`**: `createAudioPlayback({ model, mod, controller, retempo, busy }) → { sync(), stopAll(), state(), dispose() }` · `audioPlacement(clip, curve, beat, bpm) → { rate, lead, offset, left }` · `audioContext()`, `decodeAudio(bytes)`, `rememberAudioBuffer(id, buffer)`, `forgetAudioBuffer(id)` · `AUDIO_LEASE`, `AUDIO_LOOKAHEAD`, `AUDIO_DRIFT`, `AUDIO_TAIL`.

**`mir/timeline/audio-drop.js`**: `installAudioDrop(editor, { mod, controller, say, busy, store }) → { add(file, at), addAll(files, at), pick(at), choose(file, at), playback, retempo, dispose() }`; registers the project part `assets`. `installTimeline({ audio })` calls it (`audio: false` leaves it out; an object is its options) and exposes it as `tl.audio`.

**`mir/folders/zip.js`**: `projectZip(project, { store, ids }) → Promise<Blob>` · `readProjectZip(blob) → Promise<{ project, assets: [{ id, meta, bytes }], rejected }>` · `restoreAssets(read, { store }) → Promise<{ restored, skipped, written }>` · `rollbackAssets(written, { store })` · `projectAssetIds(project)`. **`folders/save-blob.js`**: `saveBlob(blob, name) → 'share' | 'download'` · `prefersVideoDownload()`. **`folders/folders.js`**: option `zip` (false | `{ store, validate(project), parts(), foot }`: `parts()` the live project's data with no capture, `foot: true` the gallery's foot buttons, 1.5.0-alpha.16), api `exportZip()`, `openZip(file)`, `zip` (`{ save(), open() }` or null: RENDER's FILES rows), `mountGallery(el, { zip })`. `zipProject({ entry, parts, capture, untitled }) → { name, project }` (`folders/zip.js`): SAVE AS ZIP's rule (the open project's name, else UNTITLED). **`folders/seed.js`**: starters take `revision` and `replaces(entry)`; `seed()` returns `refreshed` / `refreshFailed`; `refreshes(files, starters)`. **`folders/files.js`**: `files.refresh([{ id, at?, thumb?, payload, facts? }]) → { ok, updated }`.

## `mir/render/`: the recorder ([RENDER.md](RENDER.md), 1.5.0-alpha.13)

- `createRecorder({ host, frame(i, ctx), motions, editor, app, dir, storage, wake, check, before, after, signature, canonical, describe, currentSize, colorSpace, hidden, pauseWhileHidden, guard, calib, selfTestStages, ceilingMs, handler })` → `rec`. `rec.run({ motion, fps, durationS, offsetS, format, resolution | size, modulation, timeline, previewS, motionOptions, onProgress })` → `{ files: [{ name, blob, bytes, firstFrame, lastFrame }], width, height, fps, frames, motion, durationS, offsetS, format, bitrate, diskBacked, wallMs, id }` · `rec.plan(options)` / `rec.estimate(options)` · `rec.encoderPath(options)` · `rec.cancel()` · `rec.running()` · `rec.state()` · `rec.subscribe(fn)` · `rec.recoveries()` · `rec.recover(job, { onProgress })` · `rec.discard(result)` · `rec.selfTest(options)` · `rec.selfTestLines(res)` · `rec.dumpLines()`. The header of `render/recorder.js` says what each option is.
- `renderPanel(options)` → `{ id: 'render', label, glyph, hint, build(body, api), onShow(), view() }` for `createFolders({ panels })` · `createRenderCard(options)` → `{ card, view }` (a rack card) · `createRenderView(parent, options)` → `{ root, paint(), state(), destroy() }`. Options: `recorder` (required), `subject`, `picture`, `motionUi`, `gallery`, `say(text, warn)`, `save(blob, name)`, `prefix`, `seat: 'window' | 'card'`, `sections(wrap, gallery)`, `defaults`, `files`, `loadingMark`. As of 1.5.0-alpha.16:

```
renderPanel(o) / createRenderView(parent, o) / createRenderCard(o)   (mir/render/panel.js)
  o.subject   { facts(entry|null, gallery), name?(entry, gallery), text(entry|null, gallery), json(entry|null, gallery) }
  o.motionUi  { [id]: (host, { row(text, tip, at?), fields: { length, size, fps }, change(), el, label, prefix }) → { options(), paint?(e), text?(e) } }
              at: 'motion' (default) | 'format' | 'size' | 'fps' | 'length' | 'start' | 'modulation' | 'timeline'; a paint that throws refuses the run
  o.defaults  { fps = 30, motion = 'still' }        o.sections(wrap, gallery)        o.loadingMark (createRenderCard; false: none)
  o.files     { save(), open() } (FOLDERS' api.zip): SAVE AS ZIP… / OPEN ZIP… in a FILES section; renderPanel takes FOLDERS' own by default, false: none
  view.state() → { motion, motions, format, size, fps, estimate, status, progress, running, plan | null, held | null, done | null }
```
- Pure parts: `render/plan.js` (frame plan, beat range, bitrate, ladder, estimate, ceiling), `mp4.js` (the muxer), `encoder.js` (`WcSink`, the path decision, the preflight, one PNG frame), `store.js` / `store-worker.js` (the store on disk with recovery), `selftest.js`, `clock.js` (the record clock).
- `createApp({ render: { frame, motions?, subject?, picture?, motionUi?, sections?, prefix?, card?, …createRecorder options } })` wires it (`app.recorder`).

## History window, opener, notebook project seam ([HISTORY.md](HISTORY.md), [OPENER.md](OPENER.md), [NOTEBOOK.md](NOTEBOOK.md), 1.5.0-alpha.13)

- `createHistoryWindow({ history, host, id = 'history', title = 'HISTORY', mod, present, canAct, stage, windows, keys = true, gestures = true, storageKey = 'mir.history.window', persist, dock, chips, size = { w: 320, h: 440 }, min = { w: 240, h: 200 }, say, onOpen, onClose })` → `{ win, root, history, list, open(), close(), toggle(), isOpen, rows(), paint(), destroy() }` (`mir/history/window.js`). `createApp({ history, historyWindow })` seats it behind WINDOW › HISTORY.
- `installHistoryGestures(history, { target = document, stage, windows = '[data-mir-window]', press = [0, 2] })` → remove · `gestureName(node, { windows })` → `'CONTROL · WINDOW'` (`mir/history/gestures.js`).
- `registerModulation(history, mod, { present, name })` → unregister · `modulationDomain(mod, { present })` → `{ read, write, key }` · `rackKey(rack)` (`mir/history/domains.js`).
- `createOpener({ covers, mainCount, session | resume, logo, label, notice, warn = 'once' | 'every' | false, search, webdriver, direct, columns, onPick, host, light, doc })` → `{ start() → Promise<id>, root, destroy() }` · `arrowTarget(count, at, key, columns)` · `nearestSlot(slots, x, y)` · `pointerPose(box, x, y)` · `footParts(foot)` · `applyChoice(session, id)` (`mir/shell/opener.js`). A cover is `{ id, name, art, video?, accent?, foot?, label? }`.
- `photosensitivityNotice({ …, every, art, alt })` (`mir/shell/flash-guard.js`): `every: true` is BASINS' every cold start (it never reads or writes the seen flag); `art` and `alt` put the app's picture above the words.
- `createNotebook({ …, aboutSize: { w, h }, aboutRise, landing })` and `notebook.project` → `{ capture(name), restore(saved, name) → bool, signature(), part() }`, or `null` when the notebook has `pages`.

## `mir/panels/`: the kit's rack windows ([PANELS.md](PANELS.md), 1.5.0-alpha.14)

Every panel is a rack card built only from the control language, named by a small port; its continuous controls are modulation targets under its own root (`createApp({ modRoots })`), its values a project part and one history domain. `mir/panels/index.js` re-exports the builders (`kit.js` cannot: the panels import it): `createCameraPanel`, `createCameraView`, `createCssPort`, `directionSphere`, `createGradePanel`, `createGradeView`, `createGradeModel`, `createCurvesPanel`, `createCurvesView`, `createCurvesModel`, `curveEditor`, `pictureFilter`, `createXYPanel`, `morph` (the module), `createLanesPanel`, `createLanesView`, `createRampPanel`, `createRampView`, `rampLUT`.

### `panels/camera.js`: the CAMERA panel ([PANEL-CAMERA.md](PANEL-CAMERA.md))
```
createCameraPanel({ rack, id = 'camera', title = 'CAMERA', side = 'right', open, glyph = 'cameraOrbit', hint, mode, port | canvas, mod, history,
                    project, part = 'camera', modPrefix = 'camera', modIds, hand, spec }) → { id, port, view(), params(), sync(), destroy() }
    a rack card (rack.register); the view is built on first open. `port` or `canvas` is required; `canvas` alone is the zero-engine camera.
createCameraView(parent, options) → { root, port, mode, ids, controls, params(), targets(), sync(), northPress(), home(), schedule(), sphere, pad, north, homeBtn, verbs, memo(), destroy() }
    the rows anywhere. options as above, plus `status(text)` (the rack's setStatus), `cls`.
createCssPort(canvas, { mode = '2d' | '3d', values }) → a port that drives a CSS transform on `canvas` (coalesced, one write per frame); `.destroy()` clears it.
directionSphere({ label, aria, yaw, pitch, unit, roll, turn(dyawRad, dpitchRad), home(), onChange() }) → { root, svg, yaw, pitch, paint(), setDisabled(on), destroy() }
port = { get(id), set(id, v), subscribe(fn) → off, has?, angle?: 'deg' | 'rad', ranges?, modIds?, verbs?: [{ label, title?, run }], home?, north?, northMemo?, turn? }
```
**`panels/camera-rig.js`** (the maths, no DOM): `CAMERA` · `CAMERA_DEFAULTS` · `turn` · `wrapDegrees` · `createCameraRig` · `setCameraValue` · `cameraPose` (BASINS' rig, unchanged) · `NORTH_EPS` · `NORTH_EPS_DEG` · `signed` · `atNorth` · `northStep(angle, memo)` → `{ to, memo }` · `fmtDeg` · `fmtScale` · `fmtPan` · `VOCAB` · `IDS` · `HAND_IDS` · `ANGLE_UNIT` · `has(port, id)` · `present(port)` · `describe(id, port)` · `SPHERE` · `lookDir(yaw, pitch)` · `anglesOf(dir)` · `project(p)` · `sphereDrag(yaw, pitch, dsx, dsy)` → `[dyaw, dpitch]` · `transform2d(rig, { w, zoom, flip })` · `transform3d({ yaw, pitch, roll, zoom, fov, h, free })`.

### `panels/grade.js`: the GRADE panel ([PANEL-GRADE.md](PANEL-GRADE.md))
```
createGradePanel({ rack | parent, id = 'grade', title = 'GRADE', side = 'right', open, glyph = 'grade', hint, key, eager, port | canvas, mod, history,
                   project, part = id, modPrefix = part, modIds, ranges, rows, hide, levelsGap = 0.02, spec }) → { id, model, view(), params(), values(), sync(), destroy() }
    a rack card; the model (values, filter, project part, history domain) is made at once, the view on first open. `port` or `canvas` is required.
createGradeView(parent, options) → { root, model, filter, port, controls, invert, values(), get(id), set(id, v), home(), params(), sync(), schedule(), onChange(fn), destroy() }
createGradeModel(options) → { port, filter, read(id), put(id, v), write(id, v), base(id), routed(id), modId(id), values(), restore(values), home(), onChange(fn), destroy() }
port = { set(id, v), get?(id), subscribe?(fn) → off, ranges?, rows?: [descriptor], hide?: [id], modIds? }
GRADE_VOCAB · GRADE_IDS · CONTINUOUS · blendItems(modes) · gradeTargetId(prefix, id) · describeGrade(id, ranges)
```

### `panels/curves.js`: the CURVES panel ([PANEL-CURVES.md](PANEL-CURVES.md))
```
createCurvesPanel({ rack | parent, id = 'curves', title = 'CURVES', side, open, glyph = 'curves', hint, key, eager, channels = ['MASTER', 'R', 'G', 'B'], port | canvas,
                    mod, history, project, part = id, modPrefix, histogram, channelLabel, label, spec }) → { id, model, view(), params(), sync(), setHistogram(data), destroy() }
createCurvesView(parent, options) → { root, model, editor, channel, preset, amount, reset, sync(), schedule(), params(), setHistogram(data), destroy() }
createCurvesModel(options) → { channels, points(ch), set(ch, points, live), amount(), setAmount(v), channel(), setChannel(ch), preset(ch, name), reset(ch), table(ch),
                               serialize(), restore(s), onChange(fn), destroy() }
curveEditor({ get, set(points, live), label, hint, histogram }) → { root, svg, paint(), schedule(), select(i), selected(), dragging(), setHistogram(bins), setDisabled(on), destroy() }
port = { setTable(channel, Float32Array(256)) }      histogram = bins | { MASTER, R, G, B } | (channel) → bins
IDENTITY · PRESETS · PRESET_NAMES · PRESET_HINT · isIdentity · presetOf · curveTable(points, amount = 1, n = 256) · pathOf(points, w, h, n) · histPath(bins, w, h)
```

### `panels/picture-filter.js`: the zero-engine grade
```
pictureFilter(element) → { el, id, setGrade(partial), setTable(channel, table | null), grade(), tables(), describe(), flush(), release() }   one per element, shared, counted
GRADE_HOME · BLEND_MODES · TABLE_N · toneAt(x, grade) · toneTable(grade, n) · colourMatrix(saturation, hueDeg) · isNeutralTone · isNeutralMatrix · lookup(table, x) · composeTables(grade, tables, n)
```

### `panels/xy.js`: the XY panel ([PANEL-XY.md](PANEL-XY.md))
```
createXYPanel({ rack | parent, mod, pairs, morph, subscribe, history, project, part, id = 'xy', title = 'XY', side = 'right', open, glyph = 'xy', hint, key,
                modPrefix = id, spec }) → { id, part, spec, root, macros: { x, y }, targets: { route: [x, y], morph: [x, y] },
    mode(), setMode(m), modes(), pair(), setPair(i), sets(), set(), setSet(id), route() → { x, y, hand }, morph() → { set, engaged, x, y, bank },
    store(slot?), recall(slot), storeOnCorner(c), assign(c, slot), engage(on), capture(), restore(s), sync(), params(), view(), destroy() }
    pairs   [{ label, x, y }]: x, y a modulation id or a record { id, label, min, max, map, step, def, get, set, widget }
    morph   [{ id, label, params: [id | record] | () => […] }]; absent: every root of mod.params() but the panel's own
    the install's roots must name modPrefix (installModulation({ roots: ['xy', …] }), or createApp({ modRoots: ['xy'] }))
MODES · TRAIL · HOLD_MS · resolveRef(ref, list) · morphSets(params, ownPrefix) → [{ id, label, params }] · readXY(raw)
```
**`panels/morph.js`** (SNAPSHOTS and the MORPH, AUTOMATA's `lab/morph.js`): `BANK_MAX` · `NAME_MAX` · `LINEAR` · `LOG` · `STEP` · `CORNERS` · `FADE0` · `kindOf(p)` · `dialsOf(law | params)` · `fillCorners(has)` · `blend(kind, a, b, c, d, x, y)` · `createMorph(dials)` → `{ dials, out, mask, setCorners(snaps), step(xy) → moved, sync(xy), touch(), at(i, x, y) }` · `snapshot(dials, base, name, regime)` · `recallValues(dials, snap)` · `loadBank(raw)` · `saveBank(bank)` · `morphPart({ bank, xy, fade, after })`.

### `panels/lanes.js` and `panels/ramp.js`: the LANES panel and the RAMP editor ([PANEL-LANES.md](PANEL-LANES.md), [PANEL-RAMP.md](PANEL-RAMP.md))
```
createLanesPanel(options) → api                      the lanes as a rack card (`rack`) or in `parent`
  lanes           the port: list() → [lane], get(id, key), set(id, key, v), add() → id | record | nothing, remove(id), move(id, to) (false refuses),
                  subscribe(fn) → off; optional cap, min, commit(id, key), snapshot(), restore(s)
  a lane          { id, label?, ink?, colour?: 'swatch' | 'hue' | 'chip', hue?, fill?, principal: { key, label, min, max, home, log, fmt, unit, hint },
                    extras?: [{ key, label, min, max, home, wrap, log, fmt, unit, hint }], blend?: [{ id, label }] | [id], mute?, solo?, active? }
  layout          'rows' (BASINS) | 'strips' (NEBULA, SOLEIL: sortableList({ axis: 'x' }))     noun, cap, min, fixed, fold ('auto' | true | false), side, addLabel, armMs
  mod             installModulation's result: every principal, extra and hue is a target <idRoot>.<lane>.<key>, one mod.add([…]) per lane   idRoot ('lanes')   targetId(id, key)
  project         false: no part; else the card's id is the part's name                    history   a createHistory() handle: one domain, named for the card
  rack card       id ('lanes'), title, side, open, glyph, hint, key, eager     or parent: a node
  → { id, view, root, refresh(), ids(), solo(id), peek(id, on), soloOf(), params(), snapshot(), restore(s), part(), destroy() }
createLanesView(parent, options) → { root, view (the sortableList), layout, refresh(), request(), ids(), lane(id), laneRoot(id), params(), targetId,
                    solo(id), peek(id, on), soloOf(), peeking(), present(on), destroy() }
laneTargetId(root, laneId, key) · hueCss(v, min, max) · createSolo({ ids, get, set }) → { toggle(id), peek(id, on), latched(), peeking(), forget(), clear() }
laneKeys(lane) · snapshotLanes(port) · restoreLanes(port, snap) · HOLD_MS (250)

createRampPanel(options) → api                       the ramp editor as a rack card or in `parent`
  ramp            the port: get() → { stops: [{ at, rgb }], preset? }, set(stops, { preset, live }), lut?(Float32Array, n), subscribe?(fn) → off
  cyclic (true), labels { ticks, seam, seamOk, seamWarn, at, fmt, note }, n (256), cap (16), min (2), presets (PRESETS), ring, seamTol (.06), project, history, id ('ramp') …
  → { id, view, root, stops(), toLUT(n), snapshot(), restore(s), part(), destroy() }
createRampView(parent, options) → { root, strip, stops(), selected(), toLUT(n), load(stops, id), preset(id), presetId(), seam(), handle(i), refresh(), part(), destroy() }
rampLUT(stops, n = 256, cyclic = true, out) · rampGradient(lut, n, dir) · rampConic(lut, n) · normalizeStops · addStop · removeStop · rotateStops · reverseStops · seamOf · OFF_STRIP
```

## Developer tools added (1.5.0-alpha.13)

See the `tools/` table: `hit-probe.mjs`, `audit-material.mjs`, `serve.mjs --https`, `check-app.mjs --webkit` and its control-language WARN. Their headers are the docs.

---

## `tools/`: the proofs

| Tool | What it does |
|---|---|
| `adopt.mjs <app> [--check \| --dry-run] [--prefix lab] [--allow-dirty]` | Put the kit into an app, or prove it is in step |
| `serve.mjs [port] [root] [--https] [--lan] [--no-reset]` | A static server with no dependencies (`npm run gallery`): no-store, Range, and from the command line the cache-only reset. `--https` serves TLS with a self-signed certificate made on first use into `tools/.certs/` (gitignored), `--lan` listens on every address and prints the one to type on the iPad |
| `hit-probe.mjs <url> <selector> [--drag dx,dy] [--from fx,fy] [--watch js] [--grid 5] [--shot f] [--json]` | What a real pointer lands on: an N × N grid of `elementFromPoint` over the element and (with `--drag`) a real mouse drag through whatever the browser says is there; exit 1 on a point that goes through, a press that lands outside, or a drag that changes nothing |
| `audit-material.mjs <url> [--theme dark\|light] [--click sel]… [--scope sel] [--allow sel] [--min-alpha .5] [--min-contrast 2] [--json]` | The look audits on the live page: dense FACE fills (accent and content are allowed and counted), text under 2:1, adaptive-ink strays; exit 1 on any |
| `lint-tokens.mjs [--unused]` | Every token the kit reads has a writer |
| `stylehash.mjs capture\|compare` | Neutrality: does a kit change change what an app draws? |
| `shell-parity.mjs capture\|compare` | The shell is λWAVES' shell: styles, text, boxes and pixels in 14 states |
| `shell-behaviour.mjs [url]` | 19 behaviour probes of the shell |
| `extract-shell-css.mjs` | How `mir/shell/shell.css` was made |
| `lint-intent.mjs [--report] [--update-baseline]` | The INTENT counts per sheet may go down, never up |
| `tokens-doc.mjs` | Writes `docs/TOKENS.md` from `mir/tokens.json` |
| `i18n-extract.mjs [--check]` | The English catalogue `mir/locales/en.json` and its report (`npm run i18n`) |
| `check-envelope.mjs <file> [--app id] [--settings schema.json] [--tokens tokens.json] [--json]` | `ok <kind>` or `error path: why` lines; exit 0 / 1 (2 on bad usage) (`npm run check:envelope`) |
| `make-skill.mjs [--out <dir>] [--allow-dirty]` | Assembles the installable `mir-builder` skill into `dist/mir-builder/` (SKILL.md, LLM.md, LICENSE, the starter, `mir/`, `fonts/`, `docs/*.md`, `tools/serve.mjs`, `tools/check-envelope.mjs`, `tools/cdp.mjs`, `tools/check-app.mjs`, BUILD.json) and prints its size; refuses a dirty kit unless told (`npm run skill`) |
| `check-app.mjs <url> [--keys a,b] [--click sel] [--wait ms] [--expect playing \| paused \| text] [--changed js] [--light] [--shot file] [--pages]` | Loads an app headless and **plays it**: real keys and hit-tested clicks, then the checks. Prints every console error, each step, and `describe()` (windows, clock, parameters and keys in full; each shared page as its title and line count unless `--pages`). Exit 0 only when it started with no error and every step and check held. The skill ships it in `tools/` |
| `check-app.mjs … [--webkit]` (append to the row above) | `--webkit` runs it in WebKit through a Playwright and a WebKit already on the machine (`webkit.mjs`); it also WARNS when an app's own window holds a native select / range / number / color (the kit has its own control for each kind of value; `data-native="ok"` silences one) |
| `cdp.mjs` | The headless Chromium under all of them: `launch()`, `page.key(spec, { hold })`, `page.click(selector)` → `{ hit, got }`, the pure `keyOf(spec)` |

`npm test` runs the token lint, `tests/*.node.mjs` and `tests/*.browser.mjs`.
