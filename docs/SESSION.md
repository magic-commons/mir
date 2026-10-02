# MIR · SESSION — the live project, and preferences against project

**What it is.** `mir/core/session.js` keeps the work on screen in this browser, so a reloaded or reopened tab comes back to it, and a cold start can offer RESUME. `mir/core/prefs.js` keeps the other half: this browser's preferences, with a versioned migration that moves anything that belongs to the project out of them once. Both are lifted from BASINS (`app/project-session.js`, `app/prefs.js`, 2026-10-01).

Josh's rule: **preferences are the device's** (CONTROLS, RENDER, SETTINGS and every presentation choice); **the project is the work** (colour, modulation and timeline, camera). The one setting a project also carries is the accents (A, B), which the accent part registers like any other part.

## How an app uses it

```js
import { registerProjectPart } from './mir/core/project.js';
import { createSession, openerSwitches } from './mir/core/session.js';

registerProjectPart('look', { capture, restore, signature, subscribe });   // every part of the work, once
const session = createSession({ key: 'myapp.session' });

// the opener (NEW / RESUME)
const sw = openerSwitches(location.search, { ids: ['home', 'resume', ...starterIds] });
if (session.hasResume()) offerResume();           // RESUME → session.resume()   NEW → session.discard()
else session.discard();                           // nothing to offer: start new, autosave on
```

From then on the session saves by itself. An app with no opener calls `session.resume()` at boot (it restores what is there and arms autosave).

## The laws

| Law | What it means |
|---|---|
| A change saves soon | A part's `subscribe` (or `session.changed()`) books one save 300 ms later; more changes move the booking. A one-shot timer, never a poller. |
| Unchanged writes nothing | A save whose parts' signature equals the last one written is skipped. |
| Leaving saves now | `pagehide` and a page going hidden (`visibilitychange`) write at once. |
| Nothing before the choice | Autosave is armed by `resume()`, `discard()` or `arm()`, so the boot can never overwrite the work RESUME is about to offer. |
| `hold()` | While it returns true nothing is written (BASINS: a film is rendering, the view is the film's). |
| A part that never saved | `resume()` restores every registered part; one the record lacks gets `null` and decides for itself. ctx is `{ session: true, … }`. |
| Nothing thrown | A storage that throws keeps nothing; a part that throws is isolated (`core/project.js`). |

## The record

`storage[key] = { v: 1, parts: { name: json }, seed? }`. Only the parts: the app's view (place, zoom) keeps its own key, and `also: ['myapp.view']` lets that key alone offer RESUME too. An app with an older record of its own passes `lift(raw) → { parts, seed? } | null` to read it once; the next save writes the kit's form.

## Preferences against project

```js
import { createPrefs } from './mir/core/prefs.js';
import { adoptInto } from './mir/core/session.js';

const prefs = createPrefs({ key: 'myapp.settings', schema, version: 2,
  projectKeys: ['modBpm', 'gauges'],                              // they lived here before; they are the work's
  project: (moved) => adoptInto(localStorage, 'myapp.session', moved) });
```

- **Once per version.** When the stored blob's `prefsV` (absent = 1) is below `version`, the project keys it holds are handed to `project(moved)` **first**; if that returns `false` they stay and the move is tried on the next load. Then `migrate(blob, from, version)` (optional) reshapes the rest, and the blob is marked `prefsV: version`. `prefs.migration` says what happened.
- **Refused after.** `prefs.set()` ignores a project key, even if the schema still has its row.
- **The seed.** `adoptInto` puts the moved values in the session record as `seed` (nothing already there is overwritten). The next `session.resume()` hands it to `onSeed(seed, { live })`: `live` is true when there was saved work too. The app applies what it needs (BASINS: the tempo, the colour gauges); the next save absorbs the seed.
- **FORGET.** `prefs.forget()` wipes this browser's key and puts every option home; `forgetPrefs(key, storage?)` does the same without an instance. BASINS then reloads the page.
- **DOWNLOAD SETTINGS.** `prefs.download({ app })` saves this browser's options as a `settings` envelope (`docs/FORMAT.md`) named `<app>-settings-YYYY-MM-DD.json`; `prefs.settings({ app })` returns the envelope; `prefs.load(textOrEnvelope)` reads one back against the schema and sets it (an out-of-bounds value refuses the file).

## The opener's switches

`openerSwitches(search, { ids, direct, webdriver })` → `{ warning, choice }`, as BASINS reads its URL: `?warn=1` always shows the warning; `?warn=0` (or a driven browser) skips it and resumes; any of the `direct` switches resumes; `?starter=<id>` opens that start when it is one of `ids` (`home` = NEW, `resume` = RESUME). `choice: null` means show the opener.

## API

- `createSession({ key, storage?, parts?, also?, delay = 300, hold?, lift?, onSeed?, win?, doc? })` → `{ hasResume(), resume(ctx?) → { ok, failed, seeded }, discard(), arm(), armed(), changed(), save() → bool, flush() → bool, read(), adopt(moved) → bool, destroy() }`
- `readSession(storage, key, lift?)` → `{ parts, seed? } | null` · `adoptInto(storage, key, moved)` → bool · `openerSwitches(search, opts)` · `SESSION_V`
- `createPrefs({ …, version?, migrate?, projectKeys?, project? })` adds `forget()`, `migration`, `settings()`, `download()`, `load()` · `migratePrefs(storage, key, opts)` · `forgetPrefs(key, storage?)` · `settingsFileName(app, date?)`

## Proof

- `tests/session.node.mjs` — autosave armed by the choice, coalesced, skipped when unchanged, flushed on hide and pagehide; resume and discard; `also` and `hold`; the seed and `lift`; the migration (once, project first, failure retried, refused after, `migrate`); the settings file and FORGET; the opener switches.
- `tests/session.browser.mjs` on `tests/fixtures/session.html` — real clicks save the work, a reload offers RESUME (hit-tested with `elementFromPoint`), RESUME restores it, NEW starts empty and forgets it.
