# STARTER — the smallest whole MIR app

A ring of dots drawn from four numbers, with everything an MIR app has around it: the wordmark and its menus (FILE · EDIT · VIEW · WINDOW · ABOUT · LANGUAGE · GUI), a rack with two windows (PICTURE open, PLAY built only when first opened), the modulation window with an LFO driving SIZE, the notebook whose first page is `../LLM.md` (shared, and shown on the picture as the greeting), FOLDERS to save and open projects, a key table with its help view, a notice on save, and the boot card if the page cannot start.

**To make your own app, copy this folder and change the game.** `../LLM.md` explains `app.js` section by section.

- `index.html` loads the kit's sheets in order (the modulation window's sheet last) and imports `app.js` behind the boot card.
- `app.js` is the app: every section starts with a `// ──` line saying what it is and what to change.
- The kit is read from `../mir/` and `../fonts/`, so this folder sits one level below the kit, as it does in the kit's repository and in the `mir-builder` skill.

Run it: `node tools/serve.mjs 8800` from the kit's folder, then open `http://127.0.0.1:8800/starter/`. Keys: P play, M modulation, J notebook, F FOLDERS, Ctrl/⌘+S save, ? the keys.

GPL-3.0-only, as the kit is.
