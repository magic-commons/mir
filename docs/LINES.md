# Lines

A **line** is the kit version's major.minor: MIR `1.4.3` is line **1.4**, MIR `1.5.0-alpha.1` is line **1.5**.
Patches on a line are drop-in; a new line may change what apps rely on.

`tools/adopt.mjs` writes the line into `<app>/MIR-MANIFEST.json` as `"line"`. A manifest written before 1.5 has
no `line` field; its line is read from its `version`.

## The 1.4 freeze

- Line 1.4 lives on branch `mir-1.4.x`, cut from tag `v1.4.3`. Fixes for 1.4 apps go there.
- `main` moves on to 1.5.
- λWAVES is pinned to 1.4 (MIR 1.4.3) while 1.5 is built.

## What adopt does across lines

An app whose manifest is on a different line from the kit you run is **pinned**:

| Command | On a pinned app |
|---|---|
| `adopt.mjs <app>` | Refused, exit 1. Names both lines and the flag. Nothing is written, not even the manifest. |
| `adopt.mjs <app> --dry-run` | Says what `--line` would change, then refuses (exit 1). Nothing is written. |
| `adopt.mjs <app> --check` | Checks the app against **its own manifest**, not this kit. |
| `adopt.mjs <app> --line <x.y>` | Moves the app onto this kit's line. `x.y` must be this kit's line, or it is refused. |

An app with no manifest adopts freely. An app on the same line behaves exactly as before.

## Checking a pinned app

```
node tools/adopt.mjs ~/Documents/LAMBDAWAVES --check
```

It prints `pinned to line 1.4 …; this kit is line 1.5 …; checked against its own manifest`, then either
`consistent with its own manifest` (exit 0) or one `DRIFT` / `MISSING` / `EXTRA` row per file that does not match
the hashes the app's manifest names (exit 1). That catches hand edits and stray files without listing every byte
that differs from the newer kit.

To check it against its own line's kit instead, run the same command from a checkout of `mir-1.4.x`.

## Moving an app to a new line on purpose

1. Read what the new line changes for apps.
2. Preview: `node tools/adopt.mjs <app> --line 1.5 --dry-run`.
3. Adopt: `node tools/adopt.mjs <app> --line 1.5`. The manifest now says `"line": "1.5"`.
4. Run the app's own tests, then commit the app.

To stay on the old line, adopt from the old line's kit (a checkout of `mir-1.4.x`). No flag is needed there.
