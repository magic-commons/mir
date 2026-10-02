> **Superseded for starting a new app (1.5.0-alpha.4).** A new app now starts from `starter/` and `LLM.md`, or the
> `mir-builder` skill that carries both (`docs/LLM-MODS.md`). This page is the 1.4 prompt, kept until Josh decides
> whether to delete it; its adopt sentence still describes adopting the kit into an existing app. A look is a vanilla theme
> (FROST · MORPH · CLASSIC · SWIFT · AURORA · NEON, with tones) or a 'name'-spec (rules or art outside the settings).

# Starting an app on MIR — the prompt

Give a model this, verbatim, with the path filled in:

> This app is built on MIR, the interface kit at `<path-to-MIR>`. Adopt it with `node tools/adopt.mjs <this-app>`
> and load `mir/css/base.css` then `mir/css/skin.css` before any sheet of our own. **Reuse MIR's nodes, gestures
> and CSS; never copy their look.** Every control comes from `mir/kit.js` (`knob`, `seg`, `sw`, `trig`, `fader`,
> `readout`, `formula`, `device`, `group`, `chip`, `gripDots`), the wordmark, menubar, notebook and ABOUT face come from
> `mir/shell/` (with `mir/shell/shell.css` loaded after the kit's two sheets), every drag surface uses `mir/slider-keys.js`, hints
> come from `mir/control-help.js`, idle work is governed by `mir/window-activity.js`. **A modulation curve editor must use
> `mir/modulation/curve-gesture.js` unchanged: right-drag empty space adds, Shift-right-click preserves the curve's current value, left-drag moves a point or tension handle,
> Ctrl fine-tunes tension, right-click or double-click resets a tension handle, and Alt-left-click deletes a point. A plain left click on
> empty curve never adds a point, a fresh LFO starts as the editable SINE preset, and no host may require a preset before a deterministic wave can be edited.** Colours, spacing and type
> come only from the tokens in `base.css`. If a widget or material is missing, add it to MIR with its law and a
> proof, re-adopt, and never grow a second version here. Read `docs/STYLE-LOCK.md` and `docs/ANTI-PATTERNS.md`
> before the first UI change. Run `node tools/adopt.mjs <this-app> --check` before every commit; it must report
> "in step".

Why these words: *copy* asks for a likeness; *reuse the nodes, gestures and CSS* names the layers and sends the
model to the builders that already exist.
