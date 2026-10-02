# MIR · LANGUAGES — one translation seam, ten languages

MIR speaks English and, through **language packs**, Chinese (Simplified), Hindi, Spanish, Arabic, French, Bengali, Portuguese (Brazil), Indonesian, Russian and Japanese. The user picks one from the **LANGUAGE** menu after ABOUT, and every label changes **without a reload**. English is both the key and the fallback: a string a pack does not have shows its English, never a key and never a blank.

This release (1.5.4) ships the **mechanism**, the menu, the per-language type and the right-to-left mirror, proved with a generated pseudo-language. Since 1.5.0-alpha.4 all ten packs are **draft translations** of the whole catalogue (`mir/locales/en.json`), written against one glossary (`docs/LANGUAGES-GLOSSARY.md`); each stays `reviewed: false` (the menu shows DRAFT) until a native reader checks it. **No font is shipped yet** (font downloads are on hold): each pack names its faces and the system faces stand in.

Try it: `gallery/language.html` (`?lang=qps`, `?lang=qps-rtl`, `?lang=es`).

## 1. Use it in an app

```js
import { t, setLanguage, onLanguage, addLocales } from './mir/core/i18n.js';
import { languageMenu, startLanguage } from './mir/shell/language.js';

addLocales(new URL('./locales/', import.meta.url).href);   // the app's own packs: ./locales/<tag>.json
await startLanguage();                                      // remembered choice, else the browser's, else English
createMenubar({ opener, host, menus: { FILE, EDIT, VIEW, WINDOW, ABOUT, LANGUAGE: languageMenu() } });
```

Load the sheet after the kit's: `<link rel="stylesheet" href="mir/locales/locales.css">` (after `mir/css/base.css`).

The kit's builders already translate what they write: `knob`, `fader`, `seg`, `sw`, `trig`, `readout`, `group` and `device` labels, their accessible names, every hint (`title`), the menubar, the ABOUT face and the chips' names. An app passes English, as it always has: `knob({ label: 'EXPOSURE' })`.

For text the app writes itself:

| The app writes | Do this |
|---|---|
| a label in its own DOM, once | `label(node, 'EXPOSURE')` from `mir/kit.js`: translated now and again on every change |
| an accessible name | `ariaLabel(node, 'close the window')` |
| a hint | `node.title = 'how bright the picture is'`: the hint hop translates it (needs `installControlHelp`) |
| a sentence with a value in it | `t('{n} pages open', { n })`: one whole sentence, never `n + ' pages open'` |
| a sentence with a kit label in it | `t('{name} help', { name: { t: 'MODULATION' } })`: a `{ t }` var is translated too |
| a line of the ABOUT face | `tagline: { t: 'One sentence.' }`; a plain string (a name, a copyright) is written as it is |
| text it rebuilds itself | call `t()` when it rebuilds, and `onLanguage(rebuild)` |

## 2. The API

**`mir/core/i18n.js`**

| Export | What it does |
|---|---|
| `t(en, vars?)` | the current language's string for `en`, or `en`. `{name}` substitution; a var `{ t: 'English' }` is translated, any other var is written as it is |
| `setLanguage(tag)` → `Promise<boolean>` | loads the pack, writes `<html lang dir>`, then tells the subscribers. `false` when no pack was found (every string stays English). The last call wins |
| `language()`, `direction()` | the current tag and `'ltr' \| 'rtl'` |
| `languages({ dev })` | the list, each `{ tag, name, dir, reviewed }`; `dev: true` adds `qps` and `qps-rtl` |
| `onLanguage(fn)` → `off` | `fn(tag)` after every change |
| `addLocales(src)` | an app's packs: a folder URL (`<src>/<tag>.json`) or a function `tag → pack \| null`. Later sources win, string by string |
| `missing()` | the English strings asked for in this language that its pack does not have |
| `LANGUAGES` | the frozen list behind `languages()` |

**`mir/kit.js`**: `label(node, en, vars?)`, `ariaLabel(node, en, vars?)`, `relabel(root?)`.
**`mir/shell/language.js`**: `languageMenu({ languages, dev, storageKey })`, `startLanguage({ languages, storageKey })`, `pickLanguage(prefs, languages)`.
**`mir/locales/pseudo.js`**: `pseudo(s)`, `unpseudo(p)`.
**`tools/i18n-extract.mjs`**: the catalogue (§8).

## 3. A pack

`mir/locales/<tag>.json` (the kit's) and `<app>/locales/<tag>.json` (the app's), loaded on demand, one fetch per language per source, cached:

```json
{
 "tag": "es", "name": "Español", "dir": "ltr", "reviewed": false,
 "fonts": [{ "family": "Roboto", "role": "ui", "script": "Latin (a fuller cut)", "licence": "OFL-1.1", "file": null, "status": "held" }],
 "type": { "case": "uppercase", "tracking": "house", "lineHeight": 1.45 },
 "strings": { "EXPOSURE": "EXPOSICIÓN", "{value} · modulated": "{value} · modulado" }
}
```

- `name` is the language in its own script; `reviewed` is `false` until a native reader has checked the pack (the menu shows DRAFT). `name`, `dir` and `reviewed` must agree with `LANGUAGES` in `core/i18n.js` (`tests/i18n.node.mjs` checks).
- `fonts` names the planned faces; `file: null, status: "held"` until the files ship.
- `type` records the language's type rules; `locales.css` is what applies them (the test checks the two agree on case).
- `strings` maps the English to the translation. A key must be in the catalogue. A missing or empty value falls back to the English.

## 4. The laws

| Law | Why |
|---|---|
| **English is the key and the fallback** | no key tables to keep in step with call sites; a missing string is readable, never blank |
| **Never translated:** numbers and units in readouts, app and product names, maths (`<m>…</m>`), shortcut keys, what the user typed | a readout is data (it is copied, saved and typed back); a name is a name |
| **Never mirrored:** knobs, faders, the timeline, the transport, curves, meters | a value grows clockwise and to the right in every language. `knob()` and `fader()` are `dir="ltr"` islands |
| **Readouts keep Latin digits** | in an LTR island (`locales.css`), in every language |
| **Nothing finds or styles by label text** | a translated label must not lose its styling or its handler. Find by class and `data-` hooks: menus by `data-menu`, hints by `data-help-en` |
| **Code does not decide case** | `toUpperCase()` on translated text is wrong in Turkish, German and Greek, and meaningless in Chinese. The string carries its case (the translator writes it); the CSS token `--label-case` is set per language |
| **A sentence is one string** | a fragment (`' window controls'`) cannot be translated: word order differs. Use `{vars}` |
| **Idle costs nothing** | `t()` is one map lookup; the relabel pass runs only when the language changes |

## 5. Live switching: how it works

Every builder writes a label through `label(node, en)`: it writes `t(en)` and keeps the English in `data-t` (and `data-t-aria` for an accessible name, `data-t-vars` for a template's vars). When the language changes, `kit.js` runs one pass, `relabel(document)`, over those attributes. The hint hop keeps `data-help-en` and rewrites `data-help`. The menubar refills an open list and renames its opener; the ABOUT face rewrites its lines. Nothing runs while the language stays the same.

## 6. Type per language and right to left

`mir/locales/locales.css` is in the layer `mir.kit.locale`, after the house. Its gates are `:where(:root:lang(xx))`, so any app rule beats them. English sets nothing.

| Language | `--label-case` | `--label-tracking` | `--lh` | `--font-ui` (planned face first, then system faces) |
|---|---|---|---|---|
| Latin (en, es, fr, pt-BR, id) and Russian | house (uppercase in the strings) | house | 1.45 | Roboto (a fuller cut is planned) |
| Arabic | none | 0 | 1.7 | Roboto, Noto Sans Arabic, Geeza Pro, Segoe UI … |
| Hindi | none | 0 | 1.7 | Roboto, Noto Sans Devanagari, Kohinoor Devanagari, Nirmala UI … |
| Bengali | none | 0 | 1.7 | Roboto, Noto Sans Bengali, Kohinoor Bangla, Nirmala UI … |
| Chinese | none | 0 | 1.6 | Roboto, Noto Sans SC, PingFang SC, Microsoft YaHei … |
| Japanese | none | 0 | 1.6 | Roboto, M PLUS 1, Noto Sans JP, Hiragino Sans, Yu Gothic UI … |

Roboto stays first so every Latin letter and every digit is the house's; the script face draws the rest. Letter-spacing breaks Arabic joining and Devanagari and Bengali conjuncts, and Chinese has no capitals, so hierarchy there comes from weight and size.

**Right to left** (`dir="rtl"` on `<html>`): flex and grid rows mirror by themselves. `locales.css` mirrors what the house sheets set physically and is cheap to mirror: the wordmark's corner, the menu lists, a window's head (padding and the drag dot), the status alignment, a blockquote's rule. `menubar.js` places the bar on the far side of the wordmark. A segmented row is chrome and mirrors, so its arrow keys follow what the eye sees. The wordmark itself is `dir="ltr"` and `translate="no"`.

## 7. The traps, and what was done

| Trap (survey lane I) | Done |
|---|---|
| **115 places upper-case in code** (kit 7, BASINS 76, λWAVES 36) | the kit's own choke points do none. The kit's remaining sites are listed below; each upper-cases an English *id* before it is shown, which is safe while it happens before `t()` and wrong after it. The apps' sites move with each app's adoption |
| **Strings built from fragments** (kit 53, BASINS 1,350, λWAVES 432) | the kit's choke points are whole sentences with `{vars}` (the opener's name, the licence, the type line, the `· modulated` announcements). The rest are listed in `mir/locales/en.unreached.json` |
| **English inside CSS `content:`** (`· OFF`, `· COPIED`, `OUT`, `TRIG IN`, `+ MACRO`, `+ DEVICE`) | listed in `en.unreached.json`; each needs a `content: attr(data-…)` the JS fills through `t()` |
| **Controls found by label text** (menu groups by text; the chip rail's `aria-label` in CSS) | `openGroup()` finds by `data-menu`; hints keep `data-help-en`; the rail's CSS already keys on hooks |
| **Hint = accessible name** (control-help copies a hint into an empty button's `aria-label`) | both are translated at the same hop, from the same English |
| **id-or-label fallbacks** (`device()` with no eyebrow shows its id) | an id is written as it is and never translated |
| **Labels saved into projects** | the kit saves no default labels; an app must save only a user's own rename, never the English default |
| **Maths markers** (`<m>…</m>`) | pass through `t()` and the pseudo-language untouched |
| **Text drawn on a canvas** (λWAVES: 42 `ctx.font` sites) | not reached by the DOM pass. A canvas view calls `t()` when it draws and repaints `onLanguage` |

**The `toUpperCase()` calls in the kit today:**

| Where | What it does | Verdict |
|---|---|---|
| `modulation/registry.js:269` | the default label from an id's last segment | safe: an English key, translated where it is shown |
| `history/history-list.js:44` | a domain name upper-cased into the row | move the case to CSS (`text-transform: var(--label-case, uppercase)`) and pass the English through `t()` |
| `window/window.js:109`, `window/rail.js:128` | an `aria-label` upper-cased | drop it: a screen reader does not need capitals, and it would upper-case a translation |
| `modulation/modwindow/modwindow.js:965, 1139` | a kind and a key name upper-cased into the DOM | the modulation pass: `t()` on the English, case from CSS |
| `shell/rack.js:786` | a default window title from its id | safe while it stays an English key the builder translates |

## 8. The catalogue

`node tools/i18n-extract.mjs` lexes the kit's JavaScript and writes:
- **`mir/locales/en.json`**: every English string at a choke point, once, with the files it came from. It is itself a valid pack, with each English as its own translation.
- **`mir/locales/en.unreached.json`**: what it found but cannot reach: fragments beside a `+`, template literals written into the page, literals written by `.textContent =`, and CSS `content:` strings.

`--check` exits 1 when either file is stale (`tests/i18n-catalogue.node.mjs` runs it). An app runs the same tool over its own folder: `node mir-tools/i18n-extract.mjs --root lab --out lab/locales/en.json`.

## 9. The pseudo-language

`qps` and `qps-rtl` are generated from the English, never written by hand, so they cannot go stale. Every letter is accented one to one (`EXPOSURE` → `[ÉẊÞÖŠÛŔÉ~]`), the string is about 40 % longer, and it is wrapped in brackets so a clipped string shows a missing bracket. Maths runs, `{vars}`, digits and punctuation pass through. `unpseudo()` reverses it exactly. Switch to `qps` and read the page: any plain English left is a string the kit did not route through `t()`. `qps-rtl` is the same strings right to left.

On `gallery/language.html` under `qps`, no label is wider than its control. `EXPOSURE` is the tightest: 60 px in a 62 px knob. A label of 9 or more letters in a knob will clip.

## 10. Fonts: the plan per script, and the hold

**Font downloads are on hold:** Josh has not released them. Nothing is downloaded or shipped. Each pack names its faces with `file: null, status: "held"`, and `locales.css` names them first in the stack, so a face appears the day its file lands, and the system face stands in until then. Today the shipped Roboto is a small subset without most accented Latin letters and without Cyrillic, so even Spanish, French and Russian draw those letters in the system face.

| Script | UI face | Title face | Note |
|---|---|---|---|
| Latin (es, fr, pt-BR, id) | Roboto, a fuller cut (Latin-1 + Latin Extended-A) | Noto Serif Display | the shipped subset lacks ä ñ ç è ß |
| Cyrillic (ru) | Roboto, a fuller cut | Noto Serif Display | |
| Han (zh-Hans) | Noto Sans SC, subset to the app's strings + GB2312 level 1 | Noto Serif SC | whole files are 18–25 MB |
| Devanagari (hi) | Noto Sans Devanagari | Tiro Devanagari Hindi | |
| Arabic (ar) | Noto Sans Arabic | Amiri Bold | |
| Bengali (bn) | Noto Sans Bengali | Tiro Bangla | |
| Japanese (ja) | M PLUS 1 (or Noto Sans JP) | Shippori Mincho | shares the Han subset pipeline |

All are SIL OFL 1.1. When they land: each in its own `@font-face` with a `unicode-range` limited to its script, in a sheet of its own (not `mir/css/skin.css`: λWAVES' PWA test pins the three shipped faces), each licence beside it, and the ABOUT type line extended.

## 11. What a translator needs

1. `mir/locales/en.json`: the strings, and where each comes from.
2. The glossary (instrument and maths terms, and what stays Latin): [`docs/LANGUAGES-GLOSSARY.md`](LANGUAGES-GLOSSARY.md), the rules, the voice per language and one table with the ten columns.
3. The laws in §4: keep `{vars}` and `<m>…</m>` exactly as they are; write the case your language uses (the English labels are capitals); never translate names, units or shortcut keys.
4. The pack format in §3. Copy `en.json` to `<tag>.json`, keep the head of the existing `<tag>.json` (`name`, `dir`, `fonts`, `type`), and fill `strings`. Leave `reviewed: false`: only a native reader flips it.
5. A check: open `gallery/language.html?lang=<tag>`. The count says how many strings still fall back to English.

## 12. Not done yet

- **No pack is reviewed**: the ten packs are drafts (`reviewed: false`) until a native reader checks each. `tests/i18n-packs.node.mjs` checks their shape and placeholders and reports coverage; a key the English has changed shows English until the pack is updated.
- **Ambiguous English keys** the translators found: `LIGHT` (the tier and the theme), `FROST` (the look's name and the frost option), `WINDOW` (a time window and the interface window), `FULL` (a lane mode and the tier) share one key each and need two.
- **Native tooltips**: a `title` is translated where it becomes a hint (`installControlHelp`). On a page without it, the browser's own tooltip stays English.
- **A window's head hint** (`name: status`) is assembled from two strings and falls back to English.
- **Plurals**: there is no plural mechanism; counts such as "{n} pages" are one string per language, wrong for some n in Russian and Arabic.
- **Directional glyphs** (a back chevron) do not flip under right-to-left.
