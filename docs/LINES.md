# Lines

A **line** is the kit version's major.minor: MIR `1.4.3` is line **1.4**, MIR `1.5.0-alpha.1` is line **1.5**, MIR
`1.6.0-alpha.1` is line **1.6**. Patches on a line are drop-in; a new line may change what apps rely on.

`tools/adopt.mjs` writes the line into `<app>/MIR-MANIFEST.json` as `"line"`. A manifest written before 1.5 has
no `line` field; its line is read from its `version`.

## The lines

- **1.4** lives on branch `mir-1.4.x`, cut from tag `v1.4.3`. Fixes for an app that stays on 1.4 go there.
- **1.5** ends at `1.5.7-alpha.71` (branch `kit-043-sos` @ bf9cf2a). Its cuts are the tags `v1.5.5` and `v1.5.6`; 1.5.7 was
  never cut and its doors went whole into 1.6. Fixes for an app that stays on 1.5 go on a branch cut from `kit-043-sos`.
  In the 1.5.7 numbers, alpha.27…37 were MIR Focus's and never entered this line, and alpha.52 and 53 were never used.
- **1.6** is `main` from 2026-11-12 (Josh: "merge/cut all the latest MIR work into main to get its own alpha series"). It
  starts at `1.6.0-alpha.1`, the bytes of `1.5.7-alpha.71` under the new number, and numbers its own series,
  `1.6.0-alpha.N`. A new door is built on a branch from `main` and merged back. Its ADOPTING page is
  [ADOPTING-1.6.md](ADOPTING-1.6.md).
- **MIR Focus** (the phone; branches `focus`, `focus-043`) is not a line of this kit. It is its own world, numbered
  `0.X.X` (Josh, 2026-11-13), and it never takes a `1.5.x` or `1.6.x` number. The two trade ideas, not branches.

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
node tools/adopt.mjs ~/Documents/MY-APP --check
```

For an app still on 1.5 it prints `pinned to line 1.5 …; this kit is line 1.6 …; checked against its own manifest`, then
either `consistent with its own manifest` (exit 0) or one `DRIFT` / `MISSING` / `EXTRA` row per file that does not match
the hashes the app's manifest names (exit 1). That catches hand edits and stray files without listing every byte
that differs from the newer kit. A pinned app that passes is NOT in step with this kit: only `in step with MIR <version>`
says that.

To check it against its own line's kit instead, run the same command from a checkout of that line (`kit-043-sos` for 1.5,
`mir-1.4.x` for 1.4).

## Moving an app to a new line on purpose

1. Read what the new line changes for apps ([ADOPTING-1.6.md](ADOPTING-1.6.md) for 1.6).
2. Preview: `node tools/adopt.mjs <app> --line 1.6 --dry-run`.
3. Adopt: `node tools/adopt.mjs <app> --line 1.6`. The manifest now says `"line": "1.6"`.
4. Run the app's own tests, then commit the app.

To stay on the old line, adopt from the old line's kit (a checkout of `kit-043-sos` or `mir-1.4.x`). No flag is needed
there.
