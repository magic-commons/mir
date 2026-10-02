# MIR · the plugin contract

A plugin is a subsystem that ships inside the kit as one folder beside the kit's primitives. The kit knows nothing about it, and every app that adopts the kit can mount it.

`mir/modulation/` is the first plugin. **TIMELINE is expected to be the second**, and this page is the socket it plugs into. Josh: *"the first testing ground if we can add a new MIR plugin (alongside Modulation) 'Timeline'."* Sol's spec is pending.

## 1. Shape

```
mir/<plugin>/
  <plugin>window/        the window's DOM builders, and its own sheet
  host.js                what an app mounts: createXHost({ … }) → an api
  <plugin>host.css       host tokens, scoped to the window
  *.js                   the model, pure where it can be (node-testable)
  <PLUGIN>-NOTES.md      its laws and their reasons
```

- **No coupling from the kit.** `mir/kit.js` never imports a plugin. A plugin imports the kit's primitives (`kit.js`, `glyph.js`, `control-help.js`, `window-activity.js`, `slider-keys.js`) and nothing from another plugin, except through a host api the app hands it.
- **A pure model.** State, serialisation and timing live in modules that run under node, so `tests/<plugin>*.node.mjs` can prove them without a browser.

## 2. What a plugin must honour

1. **Colour from tokens only.** It reads the house ink (`--fg`, `--fg-soft`, `--ink-key`, `--dim`, `--ink-faint`, `--ink-shadow`), the accents (`--acc`, `--acc2` and their soft tints), the glass tokens and the data inks `--n1…n6`, and it writes no colour literal. That is how a plugin inherits the theme, the frost policy, an app's ink polarity (BASINS) and the skins (FROST now, METRO next) for free. `tools/lint-tokens.mjs` must pass.
2. **Controls from the kit.** Knobs, faders, segs, switches and triggers come from `kit.js` builders, under the drag law (`setKnobLaw` and `dragTravel`), never a second implementation.
3. **Window chrome from the kit.** A plugin window is a `device()`, or has the modulation window's species (header chip, body card, the dot grip for DRAG ME). The four-way cross stays the modulation window's ROUTE ME.
4. **Idle is zero work.** Its frame work runs only while `window-activity` says the window can present.
5. **One help surface.** Explanations live in the ⓘ panel (`infoPanel`, `consolidateWindowHelp`); hints come from `title` through `installControlHelp`.
6. **Storage is the app's to name.** Every storage key is an option with a documented default, and renaming a key is called out as orphaning.
7. **The single-key law and pointer ownership** as the kit keeps them (CONTRACT §8).
8. **Load order.** Its sheet loads after the app's own sheets and after the kit's; if it must win every tie, it says so, as the modulation window does.

## 3. What a plugin must ship with

- A gallery section in `gallery/index.html`, built by its own builders, never restyled.
- Node tests for its model, and browser tests for its gestures, in `npm test`.
- Its API in `docs/API.md` and its laws in its notes file.
- A CHANGELOG entry and a kit version bump.

## 4. TIMELINE: built in 1.5.0-alpha.11 (`docs/TIMELINE.md`)

This is not a spec. It records the laws the vault already holds, for Sol's spec to meet or overrule:

- **CRAFTER PROPOSAL (2026-08-14).**
  - *"The FL creation order is law: select a time range first, then tap a control"* — the clip is born exactly that long.
  - Touch-first, with pinch to zoom time.
  - Automation clips are edited with the existing curve editor (`mir/modulation/curve.js`) and its tension law.
  - One shared transport: "rack drives, timeline arranges".
- **ZOETROPE lab spec (2026-09-02).**
  - "Do not build a DAW yet."
  - Three tracks: pose/camera, identity, grade.
- **λWAVES goal spec (2026-09-02).**
  - Automation records parameter and state events, not pixels.
  - Four clocks are never conflated: simulation, presentation, modulation, recording/replay.
  - Parameters carry a `recordable?` flag.
- **The seam.** A TIMELINE reads and writes parameters through the same registry the modulation plugin uses (`mir/modulation/registry.js`). The decision is taken (1.5.0-alpha.11): the timeline reads and writes parameters through the modulation registry the app already has (`installModulation`'s `registry`); the registry did not move.
