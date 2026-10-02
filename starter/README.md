# STARTER — the smallest whole MIR app

A ring of dots drawn from five numbers, with everything an MIR app has around it: the transport bar (the one play, modulation's power, the tempo, a latch per window: on a first run it is all there is), the wordmark and its menus (FILE · EDIT · VIEW · WINDOW · ABOUT · LANGUAGE · GUI), a rack with two windows (RING built only when first opened, its knob becoming a modulation target then), the modulation window with an LFO driving SIZE, the notebook whose first page is `../LLM.md` (shared, and its first part shown on the picture as the greeting), FOLDERS to save and open projects, a key table with its help view, a notice on save, and the boot card if the page cannot start. `createApp` (`../mir/app.js`) does the wiring.

**To make your own app, copy this folder and change the game.** `../LLM.md` explains `app.js` section by section.

- `index.html` loads `../mir/mir.css` (every kit sheet, in order) and imports `app.js` behind the boot card.
- `app.js` is the app: every section starts with a `// ──` line saying what it is and what to change.
- The kit is read from `../mir/` and `../fonts/`, so this folder sits one level below the kit, as it does in the kit's repository and in the `mir-builder` skill.

Run it: `node tools/serve.mjs 8800` from the folder that holds `mir/` (it prints the pages it finds). In the kit's repository the starter is `http://127.0.0.1:8800/starter/`; copied into an app folder as `app/` (the skill's way), it is `http://127.0.0.1:8800/app/`. Check it plays: `node tools/check-app.mjs http://127.0.0.1:8800/app/ --keys Space --expect playing`. Keys: Space play, M modulation, J notebook, F FOLDERS, Ctrl/⌘+S save, I (held) holds the words still, ? the keys.

GPL-3.0-only, as the kit is.
