# Starting an app on MIR — the prompt

Give a model this, verbatim, with the path filled in:

> This app is built on MIR, the interface kit at `<path-to-MIR>`. Adopt it with `node tools/adopt.mjs <this-app>`
> and load `mir/css/base.css` then `mir/css/skin.css` before any sheet of our own. **Reuse MIR's nodes, gestures
> and CSS; never copy their look.** Every control comes from `mir/kit.js` (`knob`, `seg`, `sw`, `trig`, `fader`,
> `readout`, `formula`, `device`, `group`, `chip`, `gripDots`), every drag surface uses `mir/slider-keys.js`, hints
> come from `mir/control-help.js`, idle work is governed by `mir/window-activity.js`. Colours, spacing and type
> come only from the tokens in `base.css`. If a widget or material is missing, add it to MIR with its law and a
> proof, re-adopt, and never grow a second version here. Read `docs/STYLE-LOCK.md` and `docs/ANTI-PATTERNS.md`
> before the first UI change. Run `node tools/adopt.mjs <this-app> --check` before every commit; it must report
> "in step".

Why these words: *copy* asks for a likeness; *reuse the nodes, gestures and CSS* names the layers and sends the
model to the builders that already exist.
