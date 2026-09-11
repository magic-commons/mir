# MIR — changelog

## 1.1.0 — 2026-09-11

- The modulation window's AUDIO device is redesigned (a minimised meter, separate full and compact layouts,
  routing controls aligned) and SPECTRUM/AUDIO labels tightened — work that arrived in λWAVES from the GPT
  team on 2026-09-10/11 and is taken back into the kit here (`modulation/modwindow/*`, `modhost.css`,
  `mod.js`). With this the "byte-frozen port" law is retired: MIR is the source of the window now, and
  λWAVES' `tests/mir.test.mjs` provenance patch (`docs/mir-matrix-patch.json`) records the delta from
  BASINS.
- `--card-opacity` .76 → .88: the tinted pane keeps a faint breath of the field, no more.
- `control-help.js`: the ⓘ panel's copy edits from the same pass.

## 1.0.1 — 2026-09-10

- `knob`: a base and a painted value are two things. `show(x)` paints a modulated value over the base (the
  needle dances), `set(x)` writes the base, and a drag starts from the base — so a hand on a routed knob moves
  its range by the drag and never teleports it to where the modulator was.

## 1.0.0 — 2026-09-10 · extracted from λWAVES

- Tokens, widgets and window chrome (`mir/css/base.css`, `mir/kit.js`) and the material language
  (`mir/css/skin.css`) split out of λWAVES' `lab.css` / `skin.css`; the app keeps only its own selectors.
  Proved neutral by a 3 292-element computed-style hash, dark and light, before and after.
- `control-help.js` (hints that step aside, the ⓘ panel, one help surface per window) and `plane-model.js`
  cut out of λWAVES' `native-ui.js`.
- The modulation system (BASINS' window, byte-frozen, with λWAVES' host, model, registry and curves) under
  `mir/modulation/`. The host API exposes the window's own gestures (`wireGrip`, `wireDepth`, `paintDepth`,
  `moveMacro`, `rebuildMacros`) so a second face can reuse them.
- The dot grip (`gripDots`, 3 × 3 on a 5-px pitch) is the one *drag me* mark: rack window headers, the rail's
  reorder handle, the transport's macro tiles, the modulation device cards. The four-way cross is *route me*.
- `tools/adopt.mjs` copies the kit into an app and writes `MIR-MANIFEST.json`; `--check` reports drift.
