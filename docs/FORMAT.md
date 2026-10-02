# MIR · FORMAT

One file format for everything a person carries between MIR apps: a skin, settings, a page, a project, or a **spec**
(one person's skin, options, layouts, keys and language in one file). One checker reads all of them. One way in takes
them: a file, a drop, a paste, or a picture.

| module | what it is |
|---|---|
| `mir/core/envelope.js` | the envelope, the checker, the compact text form. Pure: no DOM |
| `mir/core/png.js` | a PNG that carries an envelope. Pure: bytes in, bytes out |
| `mir/core/intake.js` | the way in for a browser: drop, paste, picker → a checked envelope or a reason |
| `tools/check-envelope.mjs` | the checker as a command: `node tools/check-envelope.mjs my-skin.mir` |
| `gallery/format.html` | try it: drop a file or a picture, see the verdict, see a skin applied |

## The envelope

```json
{ "mir": 1, "kind": "skin", "kit": "1.5.0-alpha.3", "name": "ember", "made": "2026-10-01T12:00:00Z", "data": { … } }
```

| field | meaning |
|---|---|
| `mir` | the **format version**, a whole number. A reader refuses a newer one ("update the app to open it") and lifts an older one through `MIGRATIONS` (empty today: format 1 is the first) |
| `kind` | `settings` · `skin` · `project` · `page` · `spec` |
| `kit` | the kit version that wrote it |
| `app` | an app id, for a kind only one app can read (a project). Optional otherwise |
| `name` | a human name, at most 300 characters. Optional |
| `made` | an ISO date |
| `data` | the payload, per kind (below) |

A file is the envelope as JSON. The extension is `.mir` (`.json` also reads).

```js
import { wrap, unwrap, stringify, check } from './mir/core/envelope.js';
const env = wrap('skin', { tokens: { '--hue-acc': '28' } }, { name: 'ember' });
const text = stringify(env);                     // → the file
const { envelope, errors } = unwrap(text);       // the frame only: JSON, version, kind
const r = check(envelope, { tokens });           // the data: { ok, errors: [{ path, why }], warnings, envelope }
```

`check` never throws, on anything. `r.envelope` is the clean copy to use (unknown settings and members dropped); it is
`null` when `r.ok` is false. Every error and warning has a `path` (`data.tokens.--acc`) and a reason in plain words.

## The kinds

### skin — token values, and nothing else

```json
{ "mir": 1, "kind": "skin", "kit": "1.5.0-alpha.3", "made": "2026-10-01", "name": "ember",
  "data": { "tokens": { "--hue-acc": "28", "--glass-blur": "14px", "--r-md": "3px" },
            "light":  { "--lum-acc": "30%" } } }
```

`tokens` applies in both themes; `dark` and `light` override it in one theme. Each is a map of token → value.

| rule | why |
|---|---|
| every key is a token in `mir/tokens.json` | an unknown name is an error, never ignored: a typo should be seen |
| the token's row says `skin: true` | data inks, geometry, runtime and plugin tokens are not a skin's (see docs/TOKENS.md, column **skin**) |
| every value is in its type's grammar (table below) | a whitelist, not a blacklist: nothing outside the grammar passes |
| a `var()` names a token in the schema | a skin can point at the kit's tokens, not at anything else |
| a value is at most 400 characters | |
| the skin has `tokens`, `dark`, `light` and no other member | rules, images, fonts and script make a **'name'-spec** (METRO, SPRITES), which is code (not built; see the end); a skin file is a vanilla theme's values |

Warned, not refused: a shadow switched off as `none` (the kit's off value is `0 0 0 0 transparent`), a blur switched
off as `blur(0)` (the kit's off value is the whole filter `none`), a deprecated token, and top ink (`--fg`) on the pane
colour (`--glass-tint`) below 4.5:1 in either theme, when both resolve to plain colours.

#### The value grammar

Every value is first held to a character set (letters, digits, space, `# % . , ( ) / + * - _` and quotes), then
parsed, then checked against its token's type. Math (`calc()`, `min()`, `max()`, `clamp()`) and `var(--token, fallback)`
are allowed wherever a single value is, with the same leaves.

| type | what passes | range |
|---|---|---|
| `color` | `#rgb` `#rgba` `#rrggbb` `#rrggbbaa`; a CSS colour name; `rgb()` `hsl()` `hwb()` `lab()` `lch()` `oklab()` `oklch()` `color()` `color-mix()` `light-dark()` with numbers, angles, percentages, colour-space words and nested colours | every `%` inside 0…100 |
| `color-channels` | three values, `H S% L%` (the kit's `hsl(var(--glass-tint) / a)` form) | H −360…720, S and L 0…100% |
| `angle` | a number, or `deg` `turn` `rad` `grad` | −360…720 (unitless or deg) |
| `percentage` | `n%` | 0…100% |
| `number` | a unitless number | the row's `range`; else the table in `envelope.js` (`RANGES`: opacities 0…1, weights 100…900 …); else ±10000 |
| `length` | `px em rem ex ch lh vw vh vmin vmax svh dvh lvh cqi cqb cqw cqh cqmin cqmax pt %`, or `0` | ±4096 px/pt, ±100 for the rest |
| `duration` | `ms` or `s` | 0…20 s |
| `easing` | `linear ease ease-in ease-out ease-in-out step-start step-end`, `cubic-bezier(x1, y1, x2, y2)`, `steps(n, …)`, `linear(…)` | x1, x2 in 0…1 |
| `shadow` | a comma list of layers: optional `inset`, 2–4 lengths, at most one colour; or `none` (warned) | blur ≥ 0, ±512 px |
| `filter` | `none`, or `blur() brightness() contrast() saturate() grayscale() sepia() invert() opacity() hue-rotate() drop-shadow()` | blur 0…200, amounts 0…10 (0…1000%) |
| `image` | `none`, or a comma list of `linear-` `radial-` `conic-gradient()` (and their `repeating-` forms) | every colour inside as above |
| `font` | a comma list of family names from a fixed list (`FONTS` in `envelope.js`: the faces the kit ships — Roboto, Spectral, Playfair Display, Alegreya SC, STIX Two Math … — common system faces, and the generics) | |
| `keyword` | a word from the token's set (`--label-case`: `uppercase none lowercase capitalize`) | |
| `outline` | an outline shorthand (`--state-focus`): a width (a length or `thin medium thick`), a style (`none auto solid dashed dotted double groove ridge inset outset`) and a colour, each at most once, in any order | width 0…16px |
| `border` | a border shorthand: the same three parts as `outline`, with the border styles (`hidden` yes, `auto` no) | width 0…16px |
| `font-shorthand` | a whole `font`: `[style] [weight] size[/line-height] family`, the family by the `font` grammar; each part may be a `var()` | weight 1…1000, size ≤ 400px, a unitless line height 0.5…4 |

#### What is refused, and why

| refused | why |
|---|---|
| `url(…)`, `image-set()`, `@import` | a skin value cannot **load** anything: a picture or a paste from anywhere must stay data |
| `expression(…)`, `javascript:` | a skin value cannot **run** anything |
| `<`, `</style><script>` | markup is not a value: a value written into a style sheet must not be able to close it |
| `;` `{` `}` `!` `\` | a value cannot end its declaration, open a rule, raise its rank or hide a character behind an escape |
| `env()`, `attr()`, `element()` | a value cannot reach outside itself |
| `var(--not-a-token)` | a skin may point only at the schema's tokens |
| an unknown token, a token that is not a skin's | the schema is the contract |
| a value of the wrong type or out of range | a colour where a length goes is a mistake, and an opacity of 7 is too |

### settings — an app's options

```json
{ "mir": 1, "kind": "settings", "kit": "1.5.0-alpha.3", "made": "2026-10-01", "data": { "motion": "reduced", "scale": 1.25 } }
```

Checked against the options schema the app passes (`check(env, { settings })`): an array of rows
`{ key, type, range?, options?, default }` or a map key → row. Types read: `bool`, `number`/`int` (with `range` or
`min`/`max`), `enum` (with `options`), `string`, `color`. A bad value is an error; an option this app does not have is
dropped with a warning (a settings file from a newer app still opens). Without a schema the values are checked only as
plain JSON, with a warning.

### page — one markdown page

```json
{ "mir": 1, "kind": "page", "kit": "1.5.0-alpha.3", "made": "2026-10-01", "data": { "title": "HELLO", "md": "# hello\n\n$x^2$", "shared": false } }
```

`title` a string (≤ 300), `md` a string (≤ 2 MB), `shared` optional. A dropped `.md` file becomes a page, its title the
file name (`shell/pages.js`, `pageFromFile`).

### project — an app's work

```json
{ "mir": 1, "kind": "project", "kit": "1.5.0-alpha.3", "app": "basins", "made": "2026-10-01",
  "data": { "parts": { "pattern": { "rows": [1, 2, 3] }, "pages": { "pages": [ … ], "showOnOpen": true } } } }
```

`parts` is exactly what `captureProject()` (`core/project.js`) returns: name → JSON. The checker reads its shape and
size only (plain JSON, at most 24 MB, no cycles, no `__proto__`); the parts are the app's to read. `pages` may also sit
beside `parts`, as a list of `{ title, md }` or the pages model's own capture. When the caller passes `app`, a project
for another app is refused ("this project is automata's; this is basins").

### spec — a person, in one file

```json
{ "mir": 1, "kind": "spec", "kit": "1.5.0-alpha.3", "made": "2026-10-01", "name": "josh-spec",
  "data": { "skin": { "tokens": { "--hue-acc": "30" } },
            "settings": { "scale": 1.5 },
            "layouts": { "main": { "rack": ["a", "b"] } },
            "keys": { "window.close": "Ctrl+W", "rack.next": ["Tab", "Ctrl+]"] },
            "language": "pt-BR" } }
```

Every member is optional and checked by its own rule: `skin` as a skin, `settings` as settings, `layouts` as plain JSON
(≤ 1 MB, the app's), `keys` as action id → a short chord string or a list of them, `language` as a tag (`en`, `pt-BR`)
or `{ code, strings }`. Another member is dropped with a warning.

## The way in

```js
import { createIntake } from './mir/core/intake.js';
const intake = createIntake({
  target: myWindowBody, accept: ['skin', 'spec'], check: { tokens, settings: optionRows, app: 'basins' },
  onEnvelope(env, r) { /* checked: apply it */ }, onReject(r) { /* r.errors: show why */ }
});
myOpenButton.onclick = () => intake.pick();       // the touch and keyboard way in
intake.destroy();
```

| comes in | becomes |
|---|---|
| a `.mir` / `.json` file | its envelope |
| a packed text (`mir1.…`) | its envelope |
| a `.md` / `.markdown` / `.txt` file | a `page` |
| a `.png` | the envelope its `mir` chunk carries, or "this picture carries no MIR data" |
| pasted text that is not an envelope | a `page`, only where `accept` takes pages |

Every envelope goes through `check` before `onEnvelope`; a kind not in `accept` is refused by name. While a file is over
the target it carries the kit's drop guide (`.mir-prox-host[data-prox="capture"]`, drawn by core.css). A paste while
the focus is in a text field belongs to the field. `readInput(input, opts)` is the same door without the listeners.

## The picture carries it

`embed(pngBytes, envelope)` writes the envelope's JSON into one `iTXt` chunk, keyword `mir`, uncompressed, just before
`IEND`; it replaces an older `mir` chunk, so embedding twice never duplicates. Every other chunk is copied byte for
byte, so the picture does not change. `extract(pngBytes)` gives the envelope back (its frame read, its data still to be
checked) or `null` for anything else: not a PNG, truncated, a bad CRC on the chunk, text that is not an envelope. It
never throws, needs no canvas, and runs in node. Any PNG writer's output works: the browser's `canvas.toBlob`, and
λWAVES' own encoder, which frames chunks the same standard way.

**The limit.** The chunk survives a copy, a download, a drop, and an upload that keeps the file's bytes. It does **not**
survive a re-encode: an OS screenshot of the picture, most chat apps, an image editor's export, a social site. They
draw new pixels and drop the chunk; the way in then says "this picture carries no MIR data". That case is what a
visible QR code is for (not built).

## The compact text

`pack(envelope)` → `'mir1.z.' + base64url(deflate-raw(JSON))` (or `'mir1.j.' + base64url(JSON)` where the platform has
no `CompressionStream`); `unpackText(text)` reads it back and inflates at most 1 MB. Measured: a small spec (a skin of
two tokens, two options, a key, a language, a layout) is about 300 characters, a skin of three tokens about 175, a
settings block about 150. A QR code drawn large enough to survive a screenshot holds about 1 KB, so a spec or a skin of
a few dozen tokens fits; a project with a timeline does not.

## How a model writes a skin

1. Read `docs/TOKENS.md`: the tokens with ✓ in the **skin** column are the ones a skin may set; the **type** column
   says which grammar row above its value must fit.
2. Write the envelope (the skin example above is the shape).
3. Run `node tools/check-envelope.mjs my-skin.mir`. It prints `ok skin` or one line per error, `path: why`, and exits
   0 or 1. Fix and run again until it says `ok`. Warnings (contrast, off values) are worth fixing too.
4. Open `gallery/format.html` and drop the file on it to see it applied; UNDO SKIN takes it off.

The command needs nothing but node and the kit (`--app`, `--settings <schema.json>`, `--tokens <tokens.json>`, `--json`).

## Not built

- **The QR code** (writing and reading one), for pictures that get re-encoded.
- **'name'-specs**: a MIR build or theme with its own rules, images and fonts (METRO, SPRITES). That is code, so it loads only
  from a file by an explicit act, and the app shows that it is loaded. A skin envelope never carries one.
- **The GUI window's import**: the options window will call `createIntake` with its own rows; this kit step gives it
  the door, not the window.
