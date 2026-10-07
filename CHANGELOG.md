# MIR — changelog

## 1.5.0-alpha.20 — 2026-10-06 · the lattice

Not released: built on branch `worktree-mir-1.5`. A small release: the XY pad's glow becomes a dot matrix, the camera card loses a row, and a title-bar window rises above the rails.

### Fixed
- **The rack's touch law reaches a rack that carries only `data-mir-rack`.** alpha.19's rule that lets a finger scroll the rack on a touch tablet (`body.touch-tablet` and `pointer: coarse`: the column takes the pointer) selected `.mir-rack`, and an adopted app's columns can carry only the attribute (BASINS' `#rack` / `#rackL`), so it never reached them (found by BASINS' stage 9). Both rules now select `:is(.mir-rack, [data-mir-rack])` (`mir/shell/rack.css`).

### The XY pad's lattice
Josh: "for the XY grids, could they have a fancy dot matrix/lattice that grows in size the closer the XY is? And also have so cursor hoverover interaction" and "replace the tint on the current XY and replace it with a dot matrix". **The dot's glow is gone; a lattice says where the point is.** A square grid of dots sits on a transparent canvas under the dot and the ring: each dot swells toward the point the pad shows (the modulated value when routed) as a smooth bell, and its ink rises from the pad's ink, faint, to the accent (accent B when routed). With a mouse, a gentler swell sits under the cursor and eases in and out; it steps aside while the hand drags. The point's swell never eases: the point's own motion is the animation. It repaints only when the point, the cursor, the size or the theme changes (one `frame.write`, nothing booked at rest); a paint costs about 0.45 ms on a 240 px pad at 2× while dragging. `xyPad` gains `lattice(reset)`, the tests' probe; `paint()` repaints the lattice too. Every XY pad has it: the XY panel's, the CAMERA panel's PAN, and any app's `control({ pair })`.

### The camera card is one row shorter
Josh: "could the rotation knob sit underneath the Y knob? I think we can save a row that way". ROTATION now sits under Y in the PAN pad's knob column, so a 2-D camera with no ZOOM or FLIP (BASINS) has no view row at all; when the view row exists (ROLL · ZOOM · FOV · FLIP) it follows the pad. The rows, top down: the verbs · the pad with X, Y, ROTATION · the view row · the scales. `docs/PANEL-CAMERA.md`.

### A title-bar window rises above the rails
alpha.19's tenth question: MIR OPTIONS and MIR ABOUT sat under every other window's chip rail, since alpha.17 put every rail above every window; the alpha.19 GUI plates showed a real × click failing to close MIR OPTIONS under a rail. **A `chrome: 'close'` window pressed above every railed window now takes the z its rail would have** (n + 1 + its place in the stack), so it sits above every other rail and its title bar and × can be hit; pressed under a railed window it stays in the pane tier, below that window's rail. Railed windows keep alpha.17's law; it is the same one stack, no second counter. A window's `pair` gains `titled`. `docs/WINDOWS.md` laws 6 and 14.

### Tokens, strings, tests
- 1,368 token rows (8 added, 1 removed). Added, on `.mir-xy`, read by `controls/xy.js`: `--xy-lattice-n` `auto` (dots across; auto is the side over the pitch) · `--xy-lattice-pitch` 10px · `--xy-lattice-dot` .9px (a far dot's radius) · `--xy-lattice-swell` 3.1px (the radius added at the point) · `--xy-lattice-reach` .35 (the bell's radius, a share of the side) · `--xy-lattice-hover` .5 (the cursor's swell, a share of the point's) · `--xy-lattice-far` .22 · `--xy-lattice-near` .9 (the ink's alpha far and at the point). Removed: `--xy-glow-b` (the routed dot's glow). `docs/TOKENS.md` regenerated.
- 1,494 catalogue keys, unchanged: no new strings.
- `npm test`: 141/141 (was 140). New file: `tests/xy-lattice.browser.mjs` (the lattice, 22). New rows in `window.browser` (a title-bar window above and under the rails; 44 rows); `camera.browser` finds ROTATION in the pad's column (its layout row and two selectors changed).

### Choices to overrule
- **The lattice's eight defaults**: 24 dots across a 240 px pad, a .9 px far dot swelling by 3.1 px at the point over a bell a third of the pad wide, the cursor's swell half the point's, ink at .22 far and .9 near.
- **No cursor swell under reduced motion** (or no motion, or on touch): then only the point swells.
- **The camera's view row now sits below the pad** (it sat above it), and ROTATION is in the pad's knob column.

### For Josh's eye
- The XY pads: a dot matrix that swells and lights toward the dot, and gently under the mouse; no glow on the dot. Its whole look is the eight `--xy-lattice-*` tokens, so it can be tuned without code.
- The CAMERA card is one row shorter: ROTATION under Y, beside the pad.
- MIR OPTIONS and MIR ABOUT, pressed, sit above every other window's chips; their × always closes.

## 1.5.0-alpha.19 — 2026-10-06 · the hand

Not released: built on branch `worktree-mir-1.5`. One principle, from Josh's first iPad pass of BASINS on 1.5: **a control's place never depends on state, and every key is consistent and shown.** Changing a page, a mode, a fold or a value must not move the head, the bar or the other controls, so what the hand learned stays true; every key is a row of the one table, shown beside its action and rebindable.

### Fixed
- **The dock no longer squashes a window.** `tweenRect` rests first, then travels: the layout is written before the first frame, the box travels by `translate`, and a side that grew is revealed by `clip-path`. Nothing is scaled (Josh on the iPad: it "squashes it horizontally, before readjusting"; after: "Docking feels smooth now").
- **The resize corner points where it resizes.** Docked at the bottom, the timeline's corner pointed bottom right. The cause: `window.css` turned the handle with `scaleY(-1)`, and the timeline turns its own drawn corner as well, so it was turned twice. The handle is never transformed now; the hairlines turn by `--win-corner-angle` (135° floating, 45° docked at the bottom).
- **The rack scrolls by touch on the iPad, with one 2-px bar.** Safari does not touch-scroll a scroller whose own `pointer-events` is none, even from a child that takes the pointer (Chromium and Firefox do). On a touch tablet and under a coarse pointer the rack's column now takes the pointer itself; the cost is that a finger on the rack's blank gaps scrolls the rack instead of reaching the picture (the scene guard already counted them as interface). The native bar stays hidden (`scrollbar-width: none`) and the kit's thumb is 2 px (was 3) in a 12-px track that paints nothing. The second bar Josh saw is BASINS' own (`app/lab.css:164-167`): it goes at BASINS' re-adoption.
- **The transport bar no longer grows when the tempo panel opens.** The bar read its width after the panel was in and grew from 304 to 742 px, carrying PLAY 219 px left and 118 px up. The width is now read with the panel hidden and kept; the panel opens above the row on a bottom seat and below it on a top seat, MACROS over CLOCK at the row's width (a bar 640 px wide or more keeps them side by side). Every control of the row moves 0 px.
- **Undo has one owner.** HISTORY's keys were a capture listener that beat every row of the key table, so rebinding undo did nothing, and the timeline had its own Ctrl+Z as well. Undo and redo are now the rows `undo` and `redo` of the one table (Ctrl/⌘+Z; Ctrl/⌘+Shift+Z and Ctrl/⌘+Y); with a history the timeline's pair is left out. One Ctrl+Z undoes once wherever the focus is; a text field keeps its own undo; a rebind moves it.
- **No key text typed by hand.** The ⋯ rows, the timeline's tools, the notebook's ×, HISTORY's ↶ ↷, the transport's door, dock chip and way back, the rack's edge handle and the WINDOW menu's rack rows all show the chord from the table (ZOOM TO SELECTION no longer says SHIFT+Z by hand; the notebook's × is ⌘-correct on a Mac or an iPad).
- **No hard-coded H in the timeline.** Hiding the interface, on whatever key `hide` has, ends a gesture or closes a menu (the CLIP menu closes when the focus leaves it).
- **A panel's key is the table's.** XY, CURVES, GRADE, RAMP, LANES and CAMERA take `action` (a row of the table), not a bare `key` that was shown in WINDOW and bound to nothing.
- **↑ ↓ on a closed list is one law.** The stepper's name steps on ↑ ↓ as a closed select does (↓ the next, ↑ the previous), and Alt+↓ opens its list; ↑ ↓ used to open it.
- **Delete goes home wherever a control has one**: the XY pad, the CAMERA sphere and the host sliders (Backspace too: an iPad has no forward Delete). Their Shift step, and CURVES' and RAMP's, read the kit's one fine gear (`setKnobLaw().keyFine`) instead of a typed eighth.
- **HOLD THE WORDS STILL is in VIEW**, as `docs/KEYS.md` said it was; a held action's menu row latches (press on, press off), since a menu has no key release.
- **The notebook's head stays.** ⓘ ABOUT re-centred the glass at the other face's size, so ✎, ⓘ and × jumped (+60, −88 px). A face change now keeps the head's top-right corner; a taller face scrolls rather than run off the screen.
- **FOLDERS' NEW question no longer pushes the explorer.** Its ask row sits over the explorer (BASINS' solid pane) instead of above it, so the FOLDERS ROOT breadcrumb stays (it moved 108 px).
- **RENDER's buttons never move.** The progress row is always there (CANCEL disabled while idle), the status line sits below it and keeps its line when empty, and RUN SELF-TEST's report opens below its button (RENDER, PREVIEW and CANCEL moved 16–90 px before).
- **The KEYBOARD window's status keeps its line**, so a key pressed on the drawn board no longer pushes the search and every row 20 px.
- **The stepper's name is as wide as its longest option**, in any language, so ‹ and › never move as the name changes (they moved 5–13 px; the INFO gallery's page turner 5.7 px).
- **A label whose word changes keeps its widest word's width**: the modulation work bar's cadence chip (60 → 120 HZ pushed HOLD ¼ and HOLD 1 5 px) and the transport's BPM reading (×4 pushed everything after it 5.2 px).
- **The banner's × stays put.** Its top and its width are fixed (520 px, less a gutter on a narrow screen), and a longer or a second message grows it down; centred and as wide as its words, its × moved 16 px a line and up to 148 px across. `--banner-rise` (23 px) keeps a one-line message where BASINS' was.
- **The transport's macro-reorder arrows are the modulation window's law**: every arrow moves a tile one place (it was two on some arrows), Home and End the ends.
- **`createApp` installs the KEYBOARD window** behind WINDOW › KEYBOARD, so a kit app rebinds from the UI.

### The GUI window
MIR OPTIONS is three tabs, **LOOK · LIGHT · WINDOWS**, a segment in one fixed row under the title bar. The tabs share one grid cell, so the window is sized once for the biggest and a tab changes only the body, which scrolls; the head, the (i), the × and the tab row keep one rect across every tab. **MIR ABOUT is its own window**, opened by the circled (i) beside the ×. Both are the new `createWindow({ chrome: 'close' })`: a title bar inside the pane that drags the window from anywhere on it, a plain × (the `close` glyph), Escape closes, no chip rail; on a touch tablet the bar and its buttons are a finger tall (44 px). The tab is remembered (`mir.gui.tab`). On a phone it is the same three tabs in one column, the screen's height under the menubar. HELP's prose keeps its seat while HELP is off.
- `gui.open('options' | 'look' | 'light' | 'windows' | 'about')`, `gui.about`, `gui.tab`, `GUI_TABS`; `turn(±1)` steps the tabs.
- **BREAKING**: the page turner is gone (`'options:1'` still opens LOOK and `'options:2'` LIGHT), and the GUI window has no `W.rail` (`rail.el` and `pair.rail` are null). Strings: + LOOK, MIR OPTIONS; − MIR OPTIONS 1, MIR OPTIONS 2, MIR OPTIONS {page}/{of}, GUI — MIR OPTIONS and MIR ABOUT, GUI.
- `createWindow({ chrome })`: `'rail'` (default, every other window unchanged) or `'close'`; the result gains `head` and `tools`. Tokens `--win-head-h` 38px, `--win-head-btn` 32px, `--win-head-glyph` 18px, `--win-head-press` .92. `docs/WINDOWS.md` law 14.

### The timeline's tool bar
**One line, always.** The work bar never wraps: the tools that do not fit fold from its end (ACTIVE first, then SLIDE, STEP, SNAP, scope, SLICE, SCRUB, SELECT, EDIT) behind ⋯, which is always on the bar so it never moves. A folded tool is a row of ⋯'s list, with its icon, its word and its pressed state (SNAP and scope open their choices), and keeps its key. One `ResizeObserver`, no timer; a tool comes back only with 6 px to spare. ⋯ is the new `more` glyph. `editor.folded()` says how many tools are folded.

### The remote probe
`tools/probe.mjs serve <port> <folder>` serves an app over TLS on the network with one script line added to every page, so a page on the iPad (or any device) reports to this machine: its details, console, errors, WebGPU, touches and frame times, and it runs the scripts this machine sends; `autorun` re-runs a script on every load, so an experiment survives Safari's background reloads. A development tool only: nothing in `mir/**` or an app changes. `docs/PROBE.md`; `tests/probe.browser.mjs`.

### For adopters
- **An app must not set `scrollbar-width` or `::-webkit-scrollbar` on its rack.** Unlayered, the rule beats the kit's and brings the native bar back beside the kit's thumb. BASINS deletes `app/lab.css:164-167` at re-adoption; its `material.css` touch rule is now the kit's and can go too.
- The GUI window's page turner and `W.rail` are removed (above). `createRack` is unchanged.
- **BREAKING (keys)**: the timeline's `timeline.undo` / `timeline.redo` are `undo` / `redo` (a saved rebind of the old ids is dropped quietly); a panel's `key` is `action`; `installHistoryKeys(history, { keys })` adds rows to the app's table and returns `remove` with `remove.keys` (the capture listener is gone); `historyActions`, `EDIT_KEYS`. Every kit window is a row: `history`, `render`, `gui`, `gui-about`, `keyboard`, with no key. `createApp` hands `keys` to the notebook and to HISTORY; `keyboard: false` leaves the KEYBOARD window out; `app.keyboard`.
- `docs/ADOPTING-1.5.md` §11.

### Tokens, strings, tests
- 1,361 token rows (7 added: `--win-head-h`, `--win-head-btn`, `--win-head-glyph`, `--win-head-press`, `--win-corner-angle`, `--banner-rise`, `--tl-pop-row-gap`); `--rack-scrollbar-thumb-w` 3 → 2 px and `--rack-scrollbar-thumb-x` 4 → 5 px corrected in the schema. The timeline's ⋯ row gap was declared as `--tl-row-gap`, the name the lane rows' 2 px already had (written by `editor.js`): the join renamed it `--tl-pop-row-gap` (two lines of `timeline.css`). `docs/TOKENS.md` regenerated.
- 1,494 catalogue keys (1,497 − 9 + 6). Added, as drafts in the ten packs: HISTORY, LOOK, MIR OPTIONS, More tools and actions, SCOPE · {value}, SNAP · {value}. Removed from the catalogue and the packs: GUI, GUI — MIR OPTIONS and MIR ABOUT, MIR OPTIONS 1, MIR OPTIONS 2, MIR OPTIONS {page}/{of}, Undo (Ctrl+Z), Redo (Ctrl+Shift+Z, Ctrl+Y), Release any open menu or gesture before the shell hides the UI, Selection actions.
- `npm test`: 140/140 (was 136). New files: `tests/timeline-fold.browser.mjs` (the one-line bar, 26), `tests/keys-undo.browser.mjs` (one undo owner, 17, on `tests/fixtures/keys-undo.html`), `tests/keys-table.browser.mjs` (every key from the table, 27), `tests/probe.browser.mjs` (the remote probe, 14). No file removed. New rows in `gui` (the hand law across the tabs, the title-bar drag, Escape, the remembered tab, the phone head), `window` (the corner's direction), `rack-leftovers` (the 2-px thumb, pointer-events by pointer type), `controls` (↑ ↓ on the stepper's name, Delete on the XY pad and the sliders), `camera` (Delete), `keys.node` (the latch; one pair of undo ids), and one law row each in `transport-placement`, `notebook`, `folders`, `render`, `keyboard` and `scene-guard`. `ink.browser` opened `'options:2'` for TRANSPORT BAR and SAMPLING, which are on the WINDOWS tab now: the join changed it to `'windows'`.
- The GUI plates in `docs/plates/gui/` are retaken (the tabs, MIR ABOUT, the phone at 390 × 844; `phone-5` and `phone-6` are gone with the five phone sheets, `windows-dark-frost` is new).

### Choices to overrule
- **⋯ is always on the timeline's bar**, even when nothing is folded, so it never appears or moves (lane T).
- **Tabs as a segment** in a fixed row (Josh offered tabs as chip options or a scroll; three tabs is a segment by the control language); MIR ABOUT a window of its own rather than a fourth tab (lane G).
- **The stepper's seat is its longest option** (P6), and a changing label's seat its widest word (P7): a short name now sits in a wider seat.
- **The banner is always 520 px wide** (P8): a one-word message sits in the full pane.
- **The tempo panel is narrow and taller** (MACROS over CLOCK) rather than wider than the bar (P1).
- **A disabled CANCEL always sits under PREVIEW** with one blank status line (P4).
- **No key invented** for HISTORY, RENDER, MIR OPTIONS, MIR ABOUT or KEYBOARD: rows with no chord, for you to give (K4).
- **A macro's value keeps Delete off** (its double-click is rename, it has no default); the tempo pill's Shift stays 0.1 BPM, the tempo's own resolution, not the fine gear (K8).
- **A held action's menu row latches** (K9).
- **The reorder arrows move one place** on the transport too (P9).
- **Left, by the lanes**: FOLDERS' tile menu and the full-library refusal still push the explorer (they sit in translucent wells: glass); a finished render's SAVE / DISCARD rows appear below CANCEL (a result below its cause); the harmless ResizeObserver loop notice (four candidates that write what they observe are named in the lane's notes).

### For Josh's eye
What you will see:
- MIR OPTIONS: a title bar with (i) and ×, no chips; drag it anywhere on the bar; LOOK · LIGHT · WINDOWS stay put; MIR ABOUT opens as its own window.
- The timeline docked at the bottom: its corner points top right.
- On the iPad the rack scrolls by finger, with one 2-px bar once BASINS deletes its own `lab.css` rule; on the desktop the thumb is 2 px instead of 3.
- The timeline's work bar stays one line; what does not fit is behind ⋯.
- The tempo panel opens narrow and taller and the bar never widens; the notebook's head stays; RENDER shows a disabled CANCEL under PREVIEW with one blank status line; the banner is always 520 wide and grows down.
- Ctrl/⌘+Z undoes once anywhere and can be rebound; EDIT starts with UNDO / REDO; VIEW gains HOLD THE WORDS STILL; WINDOW gains KEYBOARD; HISTORY, MIR OPTIONS, MIR ABOUT and RENDER can be bound; every ⋯ row shows its key; the timeline's tool tooltips show E / P / Y / C; the stepper's name steps on ↑ ↓; Delete homes the XY pad, the camera and the sliders; timeline redo also takes Ctrl+Y.

**Ten questions** for you (the orchestrator puts them in the vault note):
1. The MODULATION window sizes itself to its devices: folding or compacting one moves its rail, its work bar and PATTERN's rail, and a folded device's ⏻ and × move 258–302 px (census rows 2–4, 8). A design call.
2. The timeline's bar hugs the right in row mode (wider than 760 px, beside the transport), so folding shifts the first tools right; the fix is a fixed-width glass pane, and glass is yours. In column mode (the iPad upright) the first tools never move.
3. Keys for TIMELINE, PATTERN, HISTORY, RENDER, GUI and KEYBOARD (the gallery's precedent is K for KEYBOARD).
4. The arrows on a window's handle: two laws today. On a rack card's head the plain arrows move the window (a floating one by a nudge, a docked one up or down its rack, or to the other rack); on a kit window's grip they move its rail to another side, and Shift+arrows nudge the window. Which law for both?
5. iPad chords for Numpad ×, Numpad ÷ and Insert (an iPad keyboard has none).
6. Space on a focused ÷2 / ×2 / ×4 latches the bend; should it play instead?
7. Should Escape close MODULATION and TIMELINE too, as it now closes the GUI's windows?
8. Ctrl/⌘+Y (redo) takes Safari's and Mac Chrome's History shortcut, as before. Keep it?
9. FOLDERS: a tile's menu and the full-library refusal still push the explorer, because they sit in translucent wells; a solid pane over them would be glass.
10. A window with a title bar (MIR OPTIONS, MIR ABOUT) sits under every other window's chip rail, since alpha.17 put every rail above every window; the retaken plates show the gallery's sample rail over MIR OPTIONS. Should a title-bar window rise above the rails when pressed?

## 1.5.0-alpha.18 — 2026-10-06 · the consolidation

Not released: built on branch `worktree-mir-1.5`. Nothing new: the kit is smaller. This release removes what was said twice and what nothing uses, fixes the defects that turned up while looking, and reports what BASINS' adoption of alpha.17 cost and saved at run time. No feature was added, and no option, store or file format changed except the removals named below.

### Fixed
- **One raise stack.** A floated rack card is now in the same window stack as the kit's windows, so a floated card and a window swap on each press (the card stayed under a window before), and the modulation window comes to the top when it opens (its rail tied the timeline's pane and sat under the timeline's rail). The rack keeps its own order of floating cards, so a saved layout is unchanged.
- **`createApp` hands its history to the timeline and the pattern.** With `createApp({ history })` a timeline edit was not an undo row; now it is, and one Ctrl+Z undoes it.
- **The modulation plugin's motion obeys the flat tier and motion off.** Its two transition times (80 and 120 ms) go to 0 under `data-ui-tier="flat"` and `data-motion="off"`; they were only cut by the system's reduced-motion setting.
- **The clock never reads 0:60.** RENDER's estimate and the recorder's projection truncate the seconds (59.6 s reads 0:59); `render/plan.js fmtClock` is now the timeline's `formatSeconds`.
- **The three downloads go through `saveBlob`.** DOWNLOAD SETTINGS (`prefs.download()`), the shelf's EXPORT .MD and the notebook's .MD each built their own link; they now use `folders/save-blob.js`, as FOLDERS' exports already did.
- **The notebook's COPY has the fallback.** It called the clipboard API directly and copied nothing where that is missing; it now uses `shell/clipboard.js copyText` (the API, then the textarea).
- **A closed modulation window does not paint its body.** Closed, a paint redraws only the routing rings on the app's own knobs, and only when forced; opening still rebuilds and paints. Measured on `gallery/modulation.html`, 40 paints closed: changes inside the window 1,260 → 0, 17.5 ms → 0.
- **Parallax does no work per move when there is nothing to move.** It finds its elements once, then again after a press, a release or a key, and on `refresh()`; an element under a `[hidden]` ancestor is left out. 60 moves with no elements: 60 queries → 1.
- **The timeline's readout exists only while the timeline is open** (made on open, put away on close, as the modulation window's editor readouts already were). 60 moves with the timeline closed: 60 layout reads → 0.
- **Opening the modulation window forces no style or layout pass of its own.** One open: style recalculations 20 → 17, layouts 9 → 7. The rebuild on open is unchanged.
- **The flaky SPACING AIRY test.** `tests/themes.browser.mjs` read the rack's geometry while the rack's own 320 ms card motion was still running. It and its kin (`timeline.browser`, `gui.browser`) now wait until every running animation has finished (`tests/settle.mjs`: two frames, then the animations, at most 3 s) instead of a fixed pause.

### One copy now
- **Colour maths**: `palette.js` holds the sRGB curve (`srgbToLinear`, `linearToSrgb`) and HSL ↔ RGB (`hslToRgb01`, `rgbToHsl`); `kit.js`, `core/look.js` and `shell/accent.js` call it.
- **SVG elements**: `kit.js svgEl` / `svgNode`, used by the modulation window, CAMERA, CURVES and the timeline.
- **The notebook's two keys and its inline yes / no**: `shell/notebook.js APP_KEY` and `askInline`; the shelf uses both.
- **The hand law** (a hand on a routed control moves its base): `modulation/registry.js handWrite`, used by `createApp` and the LANES, XY, GRADE, CURVES and CAMERA panels.
- **"Is the user typing"**: `core/pointer.js isField` (five copies before; `shell/keys.js` re-exports it).
- **Storage**: `core/prefs.js jsonStore`, under the rack's layout, the transport's seat, the key table, the modulation, pattern and timeline records, and FOLDERS' and HISTORY's window shapes. The keys and the stored shapes are unchanged.
- **The value drag** of the arc knob, the lane slider and the hue swatch: `controls/gesture.js valueDrag`.
- **The grip drag** of the kit window and the modulation window: `window/window.js gripGesture`.
- **Smaller ones**: `fmtBytes` is `render/plan.js`'; the modulation window re-exports `glyph.js setGlyph`; one nine-square builder in `wordmark.js`; FOLDERS' gallery takes `ARM_MS` from `controls/list.js`; the history list and the menubar schedule through `core/frame.js`.
- **CSS**: each declaration said once. `modhost.css` no longer re-declares 24 `--m2-*` tokens the window sheet already sets, says each seat of a routed knob, a chip and a slot once, and reads two refractive literals from `--frost-veil-light` / `-dark`; `skin.css` drops what `base.css` already says (`base.css` still stands alone); `--z-prox` is declared once in the z ladder; `--rack-enter` reads `--dev-enter-time`; the openers and the timeline play `lw-warn-in` (three identical fades gone); seven pairs of identical rules are one rule each.

### Removed (nothing used them)
- **Options**: `createRack({ name })` (COPY's head line; BASINS passes it and it is now ignored), `createRack({ layoutExtra })` with `rack.touch()` and `readLayout`'s `extra`, `createFolders({ zip: { foot } })` and `mountGallery(el, { zip })` (the gallery-foot ZIP buttons; SAVE AS ZIP… and OPEN ZIP… stay in RENDER's FILES), `number({ editFmt })` / `bindNumber({ editFmt })`, `select({ host })` / `listPane({ host })`.
- **Behaviour**: the rack's COPY of a window's readouts (`rack.digest`, `rack.copyDigest`, `digestText`, the 900 ms `· COPIED` flash, `RACK.copied`); `knob.setState('warn' | 'clamped')` and `knob.state` with their four rules; the modulation matrix dialog (hidden and disabled since alpha.3) with its rules and the kit select and number imports only it used.
- **A module**: `mir/shell/settings-rows.js` (`settingsRows`, `selectField`, `numberField`), and its section of `gallery/parts.html`.
- **Exports**: `parentOf` (folders/files.js), `inkRatio` (kit.js), `labPresetFolders` (modulation/host.js), `fireTriggers`, `releaseTriggers`, `clearTrigger`, `audioApplicationDemand`, `dormantCountOfMacro`, `setPresetFolder` (modulation/mod.js), `CHIPRAIL_LABEL` (modwindow.js), `forgetVerified` (render/encoder.js), `PLACEMENTS` (shell/transport.js), the `wireTouches` alias (controls/gesture.js), `watchDevice` (shell/boot.js). `WAVE_WORDS` stays in `modulation/window.js` but is no longer exported (its `phrase()` calls are the catalogue's only source of SAW↓, S&H and DRIFT).
- **Inline properties**: the timeline's `--tl-quarter` and `--tl-subdivision` (no sheet read them; `--tl-beat-alpha` stays, a test reads it).
- **Keyframes**: `mir-opener-in`, `mir-opener-card-in`, `tl-popup-in`.
- **Token rows**: 73, 1,427 → 1,354: the 62 `proposed` rows that no sheet or script ever declared or read (the list: `.tmp/W18/S/rows_c.py`), and `--dev-carried-ring`, `--fr-r-card`, `--tl-tail-max`, `--m2-matrix-edge`, `--m2-matrix-face`, `--pane`, `--m2-r-14`, `--m2-fs-12`, `--m2-input-edge`, `--k-state-ink`, `--k-state-ring`. Five `proposed` rows stay (kit code reads them).
- **Strings**: 13 keys only the matrix dialog reached left the catalogue and the ten packs (ADD ROUTE, BIPOLAR, UNIPOLAR, POLARITY, DESTINATION, CLOSE, MODULATION MATRIX and six sentences). 1,510 → 1,497 keys.
- `docs/ADOPTING-1.5.md` §10 lists the removed names for an adopter.

### Measured: BASINS before and after adopting alpha.17
Headless Firefox on this machine, BASINS' fix branch before adoption (`:8920`) against the adopted branch (`:8930`), each phase run more than once:

| | before | after |
|---|---|---|
| at rest, main thread | 3.62 ms/s | 1.15 ms/s |
| at rest, live timers | 5 | 3 |
| elements | 5,159 | 4,282 |
| CSS rules | 7,462 | 4,281 |
| first frame (veil down) | 1,236 ms | 1,246 ms |
| pan, mean frame | 29.9 ms | 30.2 ms |
| play (an LFO on a knob), main thread | 32.0 ms/s | 45.0 ms/s |
| MODULATION opened, opens over 50 ms | 1 of 10 | 10 of 10 |
| JavaScript loaded | 5,373 KB | 6,157 KB |

At rest the adoption is a clear saving. Two things got worse. **Play**: BASINS' own glue (`app/modulation.js:100-101`) forces a full repaint of the modulation window on every tick, even closed; the kit's half is fixed here (a closed window does not paint its body), and BASINS' half is its stage 8 at re-adoption. **Opening MODULATION**: a forced style read in the window's open and its rebuild; the forced read is fixed here, the rebuild stays. **Load**: the after branch loads 67 more requests and 784 KB more JavaScript (the old hidden stack, 1,084 KB, still downloads and costs nothing at run time); loading the windows closed at boot only when they are first opened is deferred to the iPad pass.

### Tokens, strings, tests
- 1,354 token rows (73 removed, none added); `docs/TOKENS.md` regenerated. The two timeline inks' notes say what they read (the patterns `view.js` writes), not that `view.js` writes them.
- 1,497 catalogue keys (13 removed, none added).
- `npm test`: 136/136 (no test file removed). Rows removed with what they tested: `controls.browser`' KNOB STATES (warn, clamped, cleared); `plugin-intent.browser`' SCRIM row (the matrix dialog's backdrop); `rack-leftovers.browser`' COPY row and its two `layoutExtra` rows; `rack-leftovers.node`' `digestText`; `rack.node`' `readLayout` `extra` rows; `parts.browser`' four SETTINGS rows and the row-label and select-option half of its LANGUAGE check. Changed: `audio.browser` step 5 presses SAVE AS ZIP… in RENDER's FILES (its fixture gains a RENDER panel); `modwindow.node`'s source check looks for `gripGesture(rail,`; `themes`, `timeline` and `gui` wait on `tests/settle.mjs` (new). `tests/i18n-catalogue.node.mjs` is green again on the regenerated catalogue.

### Choices to overrule
- **Culled** (the census found no user in the kit, BASINS or the six older apps): the gallery-foot ZIP buttons; the rack's COPY digest; `knob.setState('warn' | 'clamped')`; the modulation matrix dialog; `select` / `listPane({ host })`; `createRack({ layoutExtra })` and `rack.touch()`; `number({ editFmt })`; `watchDevice`; `shell/settings-rows.js`; 13 unused exports; the 62 undeclared `proposed` token rows and 3 unread tokens.
- **Kept against the census**: the kit's DOWNLOAD SETTINGS (BASINS should switch to it at its stage 8); `laneSlider({ orient: 'v' })` (NEBULA and SOLEIL have vertical lanes); every glyph (the icon library is your ask); `wordmark({ svg, mark })` (the title card is yours); the five panels and the 3-D camera (you asked for them by name); the 1.4 compatibility options.
- **Taken as defects, not as your calls**: the one raise stack, `createApp` handing its history on, and `saveBlob` for the three downloads.
- **Not taken, because they are yours**: undo / redo as rows in the key table; the transport's reorder engine; the native `<select>` and number fields left in `timeline/editor.js` and `render/panel.js`; the two double-tap laws (320 ms, and 300 ms with 14 px); the rack and the tempo as project parts; a registry of floating-window ids; `modhost.css:1995`; the plugin's ink ladder; the typed ‹ › ★ against the unused chevron and star glyphs.
- **Left for a later pass**: `bind.js`' install half of one-copy `add` (the install is one batch before the window exists; `add` rebuilds and starts the loop, not the same thing); `history.css` / `shell.css` inks (neither sheet always loads with the other); `base.css`' 29 values that `skin.css` re-sets (`base.css` alone is a supported unskinned load); `lw-busy-breathe` and the four `lw-tr-*` keyframes (λWAVES, AUTOMATA and EARTH play them); `window/dock.js` reading layout every frame of a rack transition and four times inside `open()`.
- **Deferred to the iPad pass**: loading the windows that are closed at boot only when first opened.

### For Josh's eye
- **A floated rack card and a kit window now swap on each press**, and the modulation window comes to the top when it opens.
- **The clock truncates**: RENDER's estimate and the recorder's projection read 0:59 for 59.6 s.
- **The share sheet**: DOWNLOAD SETTINGS, the shelf's EXPORT .MD and the notebook's .MD give the same download on Linux Chromium, but a browser that can share files (Safari, Chrome and Edge on Windows, the iPad) now opens its share sheet, as FOLDERS' exports already do.
- **The shelf's yes / no question re-translates** when the language changes.
- **The hue swatch cancels a drag when the page is hidden**, and lets go of the pointer it captured on Escape (the arc and the lane already cancelled on a hidden page).
- **Date and time inputs keep their own undo** (Ctrl+Z in one is the field's, as the key table already said).
- **A HISTORY window record holding `null`** opens the window in its first place.
- **The modulation plugin's transitions are instant** in the flat tier and with motion off.
- **An AUDIO device's level-history graph has a gap** for the time the modulation window was closed (it fills only while the window paints; BASINS before adoption behaved the same).
- **Not true any more, and not rewritten**: alpha.14's line "no native `<select>` is left in a kit window". `timeline/editor.js` and `render/panel.js` still have native fields; replacing them is one of your calls above.
- **The rack's blurred glass halves the pan frame rate** over a moving picture: about 30 fps with the rack shown, 60 with it hidden, on BASINS before and after adoption alike (headless Firefox on this machine). It is not new and nothing was changed: the glass is yours.
- **Twenty yes / no questions** from the census (`.tmp/W18/C/CENSUS.md`) will be in the vault note for you (the panels question alone decides about 4,745 lines).

## 1.5.0-alpha.17 — 2026-10-06 · BASINS parity, round eight

Not released: built on branch `worktree-mir-1.5`. Two kit gaps measured by the BASINS adoption (stage 6, log rows 66–67), closed with BASINS' law.

**Behaviour changes (read these first):**
- **Every rail is above every window, the kit's and the app's registered ones alike.** The one stack puts the panes at z 1 … n in press order and the rails at n + 1 … 2n in the same order (it put each rail just above its own pane: 1 + 2k and 2 + 2k), so a window opened or pressed over another never covers its chips, and the pressed window's rail is the top rail. This is BASINS' window law and Josh's (2026-09-26: "The 'chips' keep dissapearing underneath other windows despite being the window interacted with"). A rail joined by `registerWindow({ root, rail })` is in the same tier. Measured in `tests/window.browser.mjs`: a kit window opened over a registered window hit the new pane at the registered rail's chip (panes 1, 5, 3; rails 2, 6, 4); now elementFromPoint finds the chip (panes 1, 3, 2; rails 4, 6, 5), and after a press on the registered pane its rail is the top rail (rails 4, 5, 6). The top z is still 2n, below the guide's `--z-prox`. `stackAt(z, { railOffset })` and `railTier` are unchanged for an app with its own counter.
- **The notebook's COPY DUMP says whether it worked.** A press on the ABOUT face's COPY DUMP copies through the kit's clipboard (`shell/clipboard.js`, its textarea fallback included) and shows the kit's `notice()`: COPIED (`kind: 'ok'`) when the clipboard took the dump, FAILED (`kind: 'warn'`) when both ways were refused, for 1.4 s, BASINS' flash time; on FAILED the dump goes to the console. It used to write `navigator.clipboard` with no word either way. (The menubar's ABOUT › COPY DUMP row, `copyDumpRow`, already said so with BASINS' menu words and is unchanged.)

### What BASINS can delete
`lab.css`' modulation rail rule (`.crail.crail-float.kwin-chiprail[data-mir-rail="modulation"] { z-index: 1000000 !important; }`): the kit's one stack keeps the registered modulation rail above every window. The notebook-gate's note that the kit's COPY DUMP gives no acknowledgement can become a check of the COPIED toast.

### Tokens, tests
- No new tokens: 1,427 rows. No new strings: COPIED and FAILED were in the catalogue (1,510 keys).
- `tests/window.browser.mjs` 40/40 (+2: a kit window opened over a registered window leaves the registered rail's chip on top, hit-tested; the pressed window's rail is the top rail and every rail is above every pane); its two raise checks and the window-law check now assert the tier (B over A, B's rail over A's rail, every rail over every pane) instead of a rail at its pane's z + 1. `tests/scene-guard.browser.mjs` 22/22 (+1: COPY DUMP pressed and hit-tested, COPIED with the clipboard, FAILED with it refused).

### Choices to overrule
- The notebook's acknowledgement is the kit's toast, not BASINS' flash on the button's own label (the brief's ruling: one notice for every acknowledgement); the words and the 1.4 s are BASINS'.
- The rail tier is the whole stack's (n + 1 … 2n), not a fixed band such as BASINS' 1,000,000: it keeps every z below `--z-prox`.

## 1.5.0-alpha.16 — 2026-10-06 · BASINS parity, round seven

Not released: built on branch `worktree-mir-1.5`. Twelve kit gaps measured by the BASINS adoption (stage 5, log rows 56–61), closed with BASINS' values, and two more from BASINS' stage-5 report (the VIEW DETAILS caret, the ZIP rows' seat); one (the arcs' value chip) was measured as BASINS' own and left there.

**Behaviour changes (read these first):**
- **RENDER's rows are in BASINS' order, SPEED under LENGTH.** `motionUi`'s `row(text, tip, at)` seats a motion's row under MOTION (the default) or under `'format' | 'size' | 'fps' | 'length' | 'start' | 'modulation' | 'timeline'`; BASINS' SPEED sits under LENGTH again (it sat under ROUTE).
- **RENDER opens on the app's motion**: `renderPanel` / `createRenderCard({ defaults: { motion } })` (BASINS: `zoom`); a stored choice still wins (it always opened on STILL).
- **`motionUi` is handed the panel's own fields**: `tools.fields` is `{ length, size, fps }`, so BASINS' SPEED → LENGTH writes LENGTH through `fields.length` (it found the fields by their aria-labels: English in a lookup).
- **`ready` is set after `paint`**: a `motionUi.paint` that throws refuses the run; RENDER stays off and the thrown sentence is the estimate row (RENDER used to stay on).
- **The subject and the sections are handed the view's gallery**: `subject.facts(entry, gallery)`, `name`, `text` and `json` the same, `sections(wrap, gallery)`; one subject serves the window and the rack card.
- **`view.state()`** has `motions`, `running`, `plan` (`{ frames, startFrame, fps, range }`, or null while the rows refuse), `held` (`{ w, h, bytes }`) and `done` (`{ name, bytes }` of the finished film, until DISCARD). `createRenderCard({ loadingMark })` is passed to `kit.device` (`false`: no waiting mark, BASINS' card).
- **The RENDER sheet draws BASINS'**: a note inherits the window's text (it was 10 px soft ink); the second key fact grows (`:nth-child(2)`, was `:last-child`); a disabled RENDER and DOWNLOAD IMAGE fade by `--state-disabled` (.38) in the window and by .55 in the card, and a disabled RENDER is the well; the card's sections stand flush (gap 0); `.mir-render` declares no container (an app's `@container` rules stay as inert as they were); a motion's rows keep the section's gap.
- **VIEW DETAILS' caret is glyph.js'**: `chevronDown` closed, `chevronUp` open (`.sr-detail-glyph`, in the accent). The sheet drew the text glyphs ▸ / ▾, which `docs/ICONS.md` forbids.
- **The sortable list's pane stepper and + ADD are BASINS'.** The list reads its rack by `[data-mir-rack][data-side]`, so an adopted rack (BASINS' `#rackL`, which carries no kit look class) seats the chips on its outer edge. A stepper in an item's pane is BASINS' blend: it spans the pane, the name 8 px in the key ink with no seat height, the arrows 44 px squares in the 3 px corner with a 22 px glyph (`--list-step-glyph`). + ADD is in the look's corner (`--surface-radius`, it was a pill) and wears the panes' material: the TINTED fill (`--card-opacity`; `--frost-opacity` under FROST) and FROST's filter (none while frost holds); the rows stand 5 + 7 px above it (`--list-foot-gap` + `--list-gap`; it was 7).
- **`aboutFace` takes BASINS' ABOUT as data**: `taglines` (one `.ab-tagline` each), a `{ sup }` rich part (10<sup>500</sup>), `teamTitle` (an eyebrow over the team), `makers` (`[[name, house]]`: BASINS' "Made with" block, three across in a 440 px measure with an 8 px gap, the house 10 px on its own line: `--ab-made-w`, `--ab-makers-gap`) and `tagSplit: 'last'` (the tag is the build line up to its last ` · `: BASINS' `MANDELBROT · BASINS · 2026-09-26`).
- **A notebook face can `run(api)`**: a face with `run` and no `build` is a button that runs an action and flips nothing (BASINS' ▤ opens its SAVE window). Measured on BASINS: a face change has no transition or animation, so none was added.
- **SAVE AS ZIP reads the app's parts**: `createFolders({ zip: { parts } })` makes the zip from the live project the app's parts give (BASINS: its session), with no `capture()` (whose thumbnail needed BASINS' tile engine); an unopened project's zip is UNTITLED, not the name field's proposal (BASINS' `defaultName` FRACTAL). `zipProject({ entry, parts, capture, untitled })` is the rule (`mir/folders/zip.js`); with no `parts` the data is still the live capture.
- **SAVE AS ZIP… and OPEN ZIP… sit in RENDER's FILES section**, where BASINS' SETTINGS & FILES had them: `renderPanel({ files })` takes FOLDERS' `api.zip` by default when FOLDERS has its zip, and draws the two rows in a closed FILES section after CHECK (before the app's own `sections`); `files: false` leaves them out; `createRenderCard({ files: folders.zip })` gives a card the same (`createApp`'s RENDER rack card is handed them). **FOLDERS' gallery foot no longer has them unless asked**: `createFolders({ zip: { foot: true } })`. `api.zip` (`{ save(), open() }`) is new; OPEN FILE and a dropped `.zip` still open a project zip either way.

### What BASINS can delete
The `recorder.js` mappings for render gaps 1–5 (`mandel.record.motion = zoom`, the aria-label field lookups, the `estimate` wrap, the per-view closures, `render.state()`'s plan / motions / done); the five unlayered `save.css` `sr-*` rules (flush card, key facts, container, motion rows' gap, notes) and the disabled fades; `colour.css`' blend stepper, list gap, + ADD margin and the three `#rackL` list rules; `material.css`' four + ADD rules; `notebook.js`' hand-built `aboutFace` (its about data lines become `about: { … }`) and the ▤ face's capture-phase listener; `about.css:46–48`; `save-window.js`' GPU-free SAVE AS ZIP stub (`zip: { parts }`). The lines are in `docs/ADOPTING-1.5.md` §7.

### Tokens, tests
- Five new tokens: `--list-foot-gap` (5 px), `--list-step-glyph` (22 px), `--ab-made-w` (440 px), `--ab-makers-gap` (8 px), `--render-files-gap` (6 px); `--list-gap`'s and `--render-disabled`'s notes say what they are now; readers synced from the sheets. 1,427 rows.
- `tests/render.browser.mjs` 63/63 (+15: `view.state()`, the second card's defaults.motion, the seat under LENGTH, `loadingMark: false`, the gallery handed, SPEED → LENGTH by typing, the refusing paint pressed at RENDER's centre, the two disabled fades, `held`, the sheet; the caret's two glyphs with a real press; the ZIP rows in FILES and not the foot, SAVE AS ZIP… pressed and hit-tested); `tests/controls-colour.browser.mjs` 63/63 (+5); `tests/rack-adopt.browser.mjs` 13/13 (+1); `tests/notebook.browser.mjs` 23/23 (+2); `tests/audio-zip.node.mjs` (+2 assertions: `zipProject`). The audio fixture asks for `zip: { foot: true }`; `folders`, `folders-basins`, `audio` and `shell` pass with the folders and shell hunks.

### Choices to overrule
- `createRack` still gives an adopted rack no `mir-rack` class (its look rules would land on the app's rack); the list reads `[data-mir-rack][data-side]` instead.
- A motion row's seat names are the panel's own rows (`'format'` … `'timeline'`); an unknown name seats it under MOTION.
- A refused run's estimate row is the thrown sentence as it is, with no prefix.
- `tagSplit` is `'first'` (λWAVES') unless an app says `'last'`; `makers` is always three across.
- A notebook face with both `build` and `run` is a button (`run` wins; it gets no face element).
- An unopened project's zip is UNTITLED even when the name field holds a proposal.
- RENDER's FILES section is titled FILES (BASINS' was SETTINGS & FILES, which also held its settings and gallery files), starts closed as BASINS' did, and its summary has no caret, as BASINS' had none. An app with FOLDERS and no RENDER panel shows no SAVE AS ZIP… button unless it asks for `zip: { foot: true }`.
- `--ab-made-w` and `--ab-makers-gap` are in the `layout` group of the token table.

### For Josh's eye
- **+ ADD keeps a raised relief**, the trigger's raise, not BASINS' pane float shadow: INTENT says a pane floats and a button does not. Everything else about it (corner, fill, filter, gap) is BASINS'.
- **The arcs' value-chip tag** is left to BASINS' own rule: measured, it is BASINS' drawing, not a kit gap.

## 1.5.0-alpha.15 — 2026-10-06 · BASINS parity, round six

Not released: built on branch `worktree-mir-1.5`. Ten kit gaps measured by the BASINS adoption (stage 4 part B, log rows 51–55), closed with BASINS' values; the tenth is left for Josh's eye.

**Behaviour changes (read these first):**
- **A window freed from its anchor keeps the seat's width.** Seated on an anchor, the window takes the seat's left, top and width as its own (BASINS `snap-window.js`: `w = P.w = s.width`): a 40 px grip drag frees PATTERN at 360 px where it was, and a drop back lands on the seat (was: 470 px, 76 px off the seat, not captured).
- **The rail's seat knows the window it is seated under.** An anchor's `rect()` may carry `avoid` (the other window's glass) and `outer` (the edge facing away); `seatRail({ avoid, outer, lane })` then follows BASINS' seat law (`seatClear`): a hand-chosen side wins; with `auto`, left, right, the outer edge, then the rest, a side only in a clear lane (inside the racks, off that glass); else the fitting seat that covers least. PATTERN passes the modulation window's content and `top` / `bottom`, and **its default rail side is BASINS' `auto`** (was the kit's `top`; a shape stored before alpha.15 reads `auto`, as BASINS' v:2 prefs did).
- **One stack.** `registerWindow({ root, rail })` puts a window the app built itself (BASINS' `#modwin`) in the kit's stack: one press order across the kit's windows and the app's; `windowOf` finds it. **The kit's own modulation window registers itself** (`installModulation`; `dispose()` takes it out), so in every app a press on the modulation window raises it over PATTERN and the timeline, and a press on those raises them over it (it sat at the sheet's static `--z-win` before). `win.restore(shape)` (BASINS kwin `restore`) puts a window in a persisted shape, e.g. `dock: 'anchor'` re-seats it.
- **An unnamed transport layout draws as BASINS'.** A layout's `name` is written as `data-layout`; BASINS' drawing is the default: the bar as wide as its row (no 640 px floor; BASINS measured 359 px), the pill in the row's order (`BASINS_LAYOUT` is now play, power, tempo, rewind), the pill ink `--ink-key` (.86), the dock and door glyphs 12 px (`--xport-glyph`), and docked: BASINS' five-column grid, play 34 px high, to-start's ring the hairline (.08).
- **`LAMBDAWAVES_LAYOUT` is chosen by its name** (`data-layout="lambdawaves"`) and keeps λWAVES' 640 px bar (`--xport-w`), the pill last, the wrapping docked row, 13 px glyphs and its pill ink.
- **The pill has `row-gap: 0`**: BPM and Hz no longer sit 3 px up and 2 px down against BASINS' (`.mir-transport .tbtn { gap: 5px }` had become the pill's row gap).
- **The docked bar is clear in every CARD STYLE.** It sets `--surface-fill`, `--surface-veil` and `--surface-sheen` on itself, so skin.css's TINTED `.glass` fill can no longer sit inside the rack card.
- **`installTimeline({ controller })` is forwarded** to `createTimeline`, so the app's controller and its refusal sentences are the ones used.
- **A zoom level (Shift+1/2/3) starts the view at the ruler range's start**, else at the start of the bar the left edge was in (a level no longer leaves the first clip's title cut off at the window's edge).

### What BASINS can delete
`basins.css` lines 8–17 of the adopt branch (the mini bar's width, the pill's order and row gap, the docked bar's clear fill and the seven docked-grid rules); `shell.js:131`'s `pattern.win.stackAt(z + 1)` seat; kwin's `raiseWindow` for the modulation window (`windowOf(modRoot).raise()`); `timeline-ticks-check:76`'s `scrollLeft = 0`. The lines are in `docs/ADOPTING-1.5.md` §7.

### Tokens, tests
- One new token, `--xport-glyph` (12 px, the dock chip's and the door's glyph); `--xport-w`'s note now says it is λWAVES' least width (only `data-layout="lambdawaves"` reads it). 1,422 rows.
- `tests/pattern.browser.mjs` 21/21 (+3: the freed width and the re-dock with real grip drags; the rail on the outer edge under the modulation window with a real click on its `+`); `tests/window.browser.mjs` 38/38 (+1: one stack, real presses, the overlap read by `elementFromPoint`); `tests/transport.node.mjs` reads BASINS_LAYOUT's order and the two names. Against alpha.14 the new rows fail with BASINS' measured numbers. With the modulation window in the stack, `modwindow`, `modulation-stack`, `pattern` and `window` pass unchanged.

### Choices to overrule
- A layout with no `name` (an app's own list) is drawn as BASINS' is, not as λWAVES'.
- A zoom level with no ruler range starts at the start of the bar the view's left edge is in (BASINS' view sat at a bar; the rule is the lane's).
- `registerWindow` raises the window on top when it registers; `leave()` leaves its last z-index where it was; registering the same root twice returns the first registration.
- The kit's modulation window joins the one stack in every app, not only in BASINS.

### For Josh's eye
- **SELECT and SCRUB** (the timeline's tool icons) draw outlined and dashed: the glyph library's drawings, `fill: none`, ink .86. BASINS' build drew them filled through kwin's copied `svg` rule (`fill` .96). Left as designed until you say otherwise.

## 1.5.0-alpha.14 — 2026-10-06 · the rack windows: CAMERA, GRADE, CURVES, XY, LANES, RAMP; BASINS parity round five

Not released: built on branch `worktree-mir-1.5`.

**Behaviour changes (read these first):**
- **FROST says TEXT LIGHT** (Josh's recipe: "White Text"): `themes.js` FROST and its tones carry `text: 'light'` where they carried AUTO, and a fresh look store starts on TEXT LIGHT (`lookSchema`). A new user on the light theme therefore has white ink too; TEXT AUTO is still offered.
- **The rail's grip draws BASINS' dots again**: nine dots, `.mir-grip-dots.kwin-grip-dots > i` (BASINS' selector, so its gate rigs find them), in the chip ink with a one-pixel lift (`--chip-ink-drop`, BASINS' rail rule 32).
- **`createGui({ forget: [storage keys] })`**: FORGET wipes the look's own key and each listed key (BASINS' FORGET wiped its whole settings blob); `forgetLook(prefs, keys, storage)` is the wipe, exported.
- **The audio drop popup's DRIVES is the kit's `select()`**: no native `<select>` is left in a kit window; a press in its list pane is the popup's own and Escape closes the list before the popup.
- **A macro can be owned by a panel** (`mod.own(macroId, owner)`): `mod.route()`'s free-macro finder and the modulation window's source cycle pass an owned macro by, so an LFO added later can no longer take the XY panel's XY X or XY Y (measured: before this, `mod.route('lfo', …)` took `xy:x`). `mod.add([…])` takes a list and rebuilds the window once.
- **`control()` passes `home` to a knob and to a range's thumbs** (`home: [lo, hi]`): a double-tap goes home, not to the value the control was built with. `stepper({ compact })`, `number({ editFmt })`, `select({ host })` / `listPane({ host })` and `sortableList({ axis: 'x' })` are new options; nothing changes without them.
- **The plane model is on the one knob law**: the fine gear is ⅛ on any modifier or a second finger (it was ⅕ on Shift only), the pointer that went down owns the drag, a lost capture ends it, and a double-tap is home.

### The rack windows (`docs/PANELS.md`)
- **What a kit rack window is**: a rack card built only from the control language (`docs/CONTROLS.md`, `control(descriptor)`), named by a small port with no poller (`get`, `set`, `subscribe`, or ids in the modulation registry), its continuous controls modulation targets under its own root, its values a project part named for the card and one history domain (a gesture is one `CONTROL · WINDOW` row); where an app already had the window, that app's design is the source; where it can, it works on a blank canvas with zero engine code. The rules are a table in `docs/PANELS.md`, with how an app ports its own window onto one.
- `mir/panels/index.js` is the panels' one import (`kit.js` cannot re-export them: they import it). `createApp({ modRoots: ['grade', 'curves', …] })` names their modulation roots beside `app`. `mir/mir.css` imports the six sheets (LANES and RAMP after the colour controls, in `mir.kit.plugin.host`; CAMERA and XY in `mir.kit.house` after RENDER; GRADE and CURVES last).

### CAMERA (`mir/panels/camera.js`, `camera-rig.js`, `camera.css`; `docs/PANEL-CAMERA.md`; `gallery/panel-camera.html`)
- A rack card for where the view is, built from the control language. **2-D** from BASINS' camera window: the verb row at the very top; ROTATION as an arc; NORTH that goes back when pressed again; PAN as an XY pad and its two knobs; ROT SCALE, PAN SCALE, ORBIT, ORBIT ANGLE. **3-D** from the plane model and λWAVES' camera: a direction sphere whose arrow's tip follows the finger, with YAW and PITCH arcs beside it; ROLL, ZOOM, FOV; TURNTABLE · FREE; HOME. An optional **HAND** section: DRAG, FRICTION, INERTIA, FLING, AUTO-ROTATE, SPIN, WHEEL.
- The app names its camera by a port `{ get(id), set(id, v), subscribe(fn), verbs, … }` and implements only the ids it has; every continuous control is a modulation target (`camera.<id>`: BASINS' own ids); the values ride in the project and in one history domain. With no engine (`canvas` given) it drives a CSS transform (`createCssPort`). BASINS' `camera-rig.js` is the kit's now, its exports unchanged.

### GRADE and CURVES (`mir/panels/grade.js`, `curves.js`, `picture-filter.js` and their sheets; `docs/PANEL-GRADE.md`, `docs/PANEL-CURVES.md`; `gallery/panel-grade.html`, `gallery/panel-curves.html`)
- **GRADE**, the master picture from NEBULA's GRADE, SOLEIL's MASTER and BASINS' BRIGHTNESS and INVERT: EXPOSURE, CONTRAST, GAMMA, SATURATION as solid knobs; BLACK · WHITE as one range slider; OPACITY as the window's lane slider; HUE as an arc; INVERT as a switch whose glyph is the state (now the kit's `sw({ glyph })`); BLEND as a stepper over the sixteen CSS blend modes; an app's own rows by descriptor, and the rows it lacks hidden. Every continuous control is a modulation target (`grade.<id>`); the values ride in the project and in one history domain. With `canvas` and no engine it grades the picture through one SVG filter; with a `port` (`set(id, v)`) the app takes the values into its own shader.
- **CURVES**, Photoshop's curves from SOLEIL's editor on the kit's curve mathematics and pointer law: a press on the plot adds a point and drags it, a point dragged out or double-tapped goes, rings bend; CHANNEL (MASTER R G B or the app's), PRESET, AMOUNT (a modulation target), RESET; the app's histogram behind the curve. Output: one 256-entry table per channel, to the picture's filter or to `port.setTable(channel, table)`.
- **The picture filter** (`picture-filter.js`): one SVG filter per picture, shared by GRADE and CURVES: a colour matrix and one composed table per channel, CSS opacity and blend; nothing at all at home; one write per frame. **Measured cost**: no frame lost at 2560 × 1440 on the RTX 3070 with HUE modulated; 5–9 ms a frame more on a software compositor (SwiftShader) at 1600 × 1000. The recommendation (in the doc): an app with a WebGPU engine takes the port and grades in its own last pass.

### XY and MORPH (`mir/panels/xy.js`, `morph.js`, `xy.css`; `docs/PANEL-XY.md`; `gallery/panel-xy.html`)
- One pad, three uses on a segment at its head. **PAIR**: the pad drives one of the app's coupled pairs (`pairs: [{ label, x, y }]`, ids in the modulation registry or records; a stepper when there are several); its knobs are the app's own targets. **ROUTE**: X and Y are two macros the panel owns (`XY X`, `XY Y`), made on first use, with the modulation window's own grips: drag onto any knob, or tap to arm; the pad moves them; X and Y are targets too (`xy.x`, `xy.y`), so an LFO can play the controller. **MORPH**: AUTOMATA's — a bank of eight snapshots of a window's parameters (their bases), four on the corners A–D (tap then a number; hold or Shift-click stores straight onto a corner), ENGAGE, and the pad blends them each in its own map (log geometric, linear, stepped nearest); X and Y are targets (`xy.morphx`, `xy.morphy`).
- SPRING (a switch with a lamp) returns the pad on release; a trail of its last positions while a route moves it. The state is a project part (`xy`) and one history domain. **`mir/panels/morph.js`** is AUTOMATA's `lab/morph.js`, moved (its `dialsOf` also takes a parameter list). The modulation seam it needs (`mod.own`, `owned`, `apply`) is in `bind.js` and the window (above).

### LANES and RAMP (`mir/panels/lanes.js`, `ramp.js`, their sheets; `docs/PANEL-LANES.md`, `docs/PANEL-RAMP.md`; `gallery/panel-lanes.html`, `gallery/panel-ramp.html`)
- **LANES**: a list of lanes (a colour, one principal amount, a blend, a mute) as a rack window, in two layouts: **rows** (BASINS' colour lanes) and **strips** (NEBULA's AGE and SOLEIL's lanes). Every amount is a modulation target (one `mod.add([…])` per lane), SOLEIL's solo (a click latches and restores exactly, a hold is a peek), the armed ×, the fold behind which a coarse pointer's arcs sit, the project part and the history row. The strips are the kit's `sortableList({ axis: 'x' })` (one island pane, a chip strip under each strip, the drag along x, ← → mirrored under rtl) and their blend is `stepper({ compact: true })`: the panel's own horizontal twin of the list is deleted.
- **RAMP**: λWAVES' palette editor made generic on `palette.js`: stops as handles on a strip, a preset stepper, OKLab blending, a seam reading and a ring when cyclic, a linear mode, `rampLUT(stops, n, cyclic)` out.

### BASINS parity, round five (from BASINS stage 4 part A, measured against its branch)
- **Gap 1 · FROST's text**: TEXT LIGHT, BASINS' White Text (behaviour changes, above).
- **Gap 2 · the rail grip**: BASINS' nine dots on the grip chip, `.kwin-grip-dots > i`, chip ink, a 1 px lift `drop-shadow(0 1px 0 var(--glass-raise))`.
- **Gap 3 · FORGET**: `createGui({ forget })` (BASINS: `forget: ['basins.settings', …]`).
- **Gap 4 · the accent engine**: `createAccent({ model: 'hsl' })`, `hslVivid(v)`, `hslToRgb(deg, s, l)`: BASINS' engine, where A = 180° at VIVID 1 is `hsl(180 100% 64%)` (the palette model gave `#e000ff`).
- **Gap 5 · the app's layout state**: `createRack({ layoutExtra: { capture, apply } })`, `rack.touch()`, and `readLayout` keeps `extra` (BASINS' `docked`).
- **Gap 6 · a transport in a work bar** (`#timelinewin` in BASINS): the pane's fill and shadow and the .82 Hz ink in any window (`timeline.css`), not only inside `.mir-modwindow` (BASINS drew `0 1px 0 .12 inset, 0 2px 8px .2, 0 1px 2px .12` where the kit drew none, and its `.tempo-hz` ink is .82 where the kit's was .86).
- **Gap 7 · the modulation window's value names**: `.m2vname` ink is `--m2-ink` (.96 under TEXT LIGHT / DARK), BASINS' generated rung, not `--m2-ink-a94`.
- **Gap 8 · `material.css` §1** is not closable in a kit layer: the kit's CONTROL FACES already clear a pill trigger, a segment well and a switch under FROST (measured, `parity5.browser.mjs` check 8); what fills BASINS' COLOUR `+ ADD` and MAPPING well with §1 deleted is its own unlayered `skin.css:529–533`. BASINS-side (`docs/ADOPTING-1.5.md` §7).
- **Gap 9 · DRIVES**: the kit's `select()` (behaviour changes, above).

### The lanes' asks (applied at the join)
- `sw({ glyph })` in `kit.js`: the switch whose glyph is the state (`.sw.sw-glyph` in `controls.css`, tokens `--sw-glyph`, `--sw-glyph-size`, `--sw-glyph-shadow`); GRADE's INVERT is one call of it and keeps only its turn-over. `docs/CONTROLS.md` names it in the lamp rules.
- `control()` passes `home` to `knob()` and to the range thumbs; CAMERA's and GRADE's own `setDefault` lines are gone.
- `sortableList({ axis: 'x' })`, `stepper({ compact })`, `number({ editFmt })` / `bindNumber({ editFmt })`, `listPane({ host })` / `select({ host })`.
- `mod.add([…])` (LANES, CAMERA, GRADE and CURVES add their targets in one call); `mod.own` / `owned` / `apply` and the window's `port.owned` (the XY seam, `seam-check`: `route('lfo')` now makes `m3` and leaves `xy:x` free).
- `createApp({ modRoots })`; `mir/panels/index.js`.
- `plane-model.js` on `gearOf` / `watchTouches` (seven lines).
- `docs/CONTROLS.md` gains the row "a 3-D direction → DIRECTION SPHERE + its two arcs" (R, for Josh to rule).

### Tokens, languages, tests
- **Tokens: 1,421 rows** (72 new: 7 CAMERA, 1 the rail, 43 LANES and RAMP, 5 XY, 16 GRADE, CURVES and the glyph switch; LANES' `--strip-drag-fade` was not taken: the list's `--list-drag-fade` is the same .55); `docs/TOKENS.md` regenerated.
- **The catalogue is 1,508 keys**; the 132 keys the packs lacked are drafted in all ten packs (`reviewed: false`); the glossary gains the panels' terms.
- `npm test`: 136 of 136 (the browser suites included). One test changed on purpose: `i18n.browser`'s draft-pack check counted `n > 20` strings missing in es on the language page; a new catalogue key the page also shows (WINDOW, the XY panel's) took it to 20, so it now checks the count against the es pack itself (every counted string is one the pack lacks, and the page shows the count).

### Not proved
- WebKit and a real iPad have not been run on the panels (CDP touch only). The direction sphere's hand, the curve editor's hit radii and the strips' 28 px chips have not been tried by a finger. The picture filter's cost was measured on the RTX 3070 and on SwiftShader only. BASINS' adoption of the panels has not started (CAMERA needs a notice from BASINS when its view changes).

### Choices to overrule (what the lanes chose where no source decided, one list)
Each is one place to change. Grouped by lane.
- **CAMERA**: ORBIT is BASINS' knob (a radius, 0…1 view widths) with ORBIT ANGLE as an arc; the direction sphere is a new widget (the plane model's drawing in SVG, "the tip follows the finger": yaw about z, pitch up from the horizon); ROTATION turns the zero-engine picture clockwise, pan is a share of the picture's width, up is +Y, the 3-D CSS camera is `perspective(h / 2 / tan(fov / 2)) rotateX(−pitch) rotateY(yaw) rotateZ(roll) scale(zoom)` with roll only in FREE; the default ranges (`zoom` log 0.25…64 home 1, the CSS port 0.25…4; `fov` 10…120° home 60; `drag` log 0.2…8; `friction` 0…12; `inertia` 0…1 home .5; `fling` 0…2; `spin` log 1…120°/s home 15; `pitch` ±90°); modulation ids are `camera.` + the id lower-cased; 2-D rows ROTATION · ZOOM · FLIP, the pad, the four scales; 3-D rows CONTROL, the sphere with YAW and PITCH arcs, ROLL · ZOOM · FOV, and AUTO-ROTATE and SPIN in HAND; HAND has a heading, the verb row none; PAN HOME resets pan and orbit only, HOME calls `port.home()`; the values are a project part by default and one history domain, named `camera`; a verb that returns a promise disables its button until it settles; the sphere's keys (← → yaw, ↑ ↓ pitch, 2π/100 a step, Shift ⅛, Page ten, Home); ROTATION's double-tap and a drag landing on 0 are a trip north that remembers; the glyph is `cameraOrbit`.
- **GRADE and CURVES**: EXPOSURE 0.25 … 4×, log, home 1; GAMMA is Levels' sense (`out = in^(1/γ)`), 0.5 … 2.2 log; CONTRAST 0.5 … 2 log about mid-grey; SATURATION 0 … 2; HUE 0 … 360°; BLACK · WHITE are input levels on 0 … 1 with a 0.02 gap; the zero-engine order (colour matrix, then EXPOSURE → BLACK / WHITE → GAMMA → CONTRAST → the MASTER curve → the channel's curve → INVERT, as one table); the rows' order; BLEND is the sixteen CSS modes upper-cased; INVERT turns its glyph over in 160 ms (BASINS 170) and has no accent; GRADE has no RESET verb (a double-tap is home); a routed value is saved as its base; the filter keeps the element's own CSS filter and puts it back on the last release. CURVES: a press on the plot adds a point (SOLEIL added on a double-tap); a point dragged 24 px out is removed on release; a double-tap removes a point, a double-tap or right-click straightens a ring, Alt-click removes; the ends move only up and down; hit radius 12 px (22 coarse); the keys (+ / − choose, arrows 1/100, Shift ⅛, Page ten, Delete, Enter adds halfway, Escape lets go); AMOUNT is one per window; PRESET is SOLEIL's six on a stepper; R, G, B draw in their own colour, MASTER in accent B, the chosen point an accent-A ring; a quarter grid; the histogram's tallest bin at 92 %; the channel row is CHANNEL; a port gets every channel's table at the start; the glyphs `grade` and `curves`.
- **XY**: the use is a SEGMENT at the head (only the uses the app can have); ROUTE's macros are made on first use, named `XY X` / `XY Y`, ids `xy:x` / `xy:y`; ROUTE's grips are two trigger faces under the pad with the count each reaches in accent B; a route from the panel's own macro onto its own axis is taken away at once; ROUTE and MORPH keep separate positions and targets; PAIR's pad knobs carry the app's `data-param`; Home in PAIR goes to the parameter's `def`; SPRING returns at once, only after a pointer drag, one state for the three uses; the trail is twelve accent-B dots at .55; a corner held 450 ms or Shift-clicked stores onto it; MORPH's window is each root of the registry when the app names none (booleans and unbounded parameters left out; a wrapped dial blends linearly); snapshots are named `SNAP n`, a bank per window; the bank's rows keep AUTOMATA's plain number button and inline name field, × is not armed; the project part and history domain are named for the card; a MORPH restore never writes the dials; the targets live as long as the card's view.
- **LANES and RAMP**: a lane's mute key is `mute` and the dot is lit while the lane is ON; one S button latches on a click and peeks on a 250 ms hold; a lane with no `label` shows `colour 3` on its head, and the head shows only when folded; the fold is a 44 px chevron on a coarse pointer, hides the arcs and the blend, one lane open at a time not enforced, not saved; strips show a blend as its name only; strips have a 28 px chip strip under each strip; `colour: 'chip'` is EARTH's layer swatch; a lane's targets are re-registered (routes kept) after a move. Ramp: a click on the strip adds a stop in the ramp's own colour there; a handle's hit area is a 28 px square (44 under a finger) on the strip's top edge; no double-click deletion (drag off, the armed ×, or Delete twice); Escape restores a drag; the ring is a CSS conic and the strip a 33-sample gradient; a flat preset list; the stop's place is typed in 0 … 1; no modulation targets; 2 … 16 stops; the linear mode is new.
- **Parity round five**: FROST is white ink in the light theme too (the recipe says White Text in both modes); a ☆ layout saved before `layoutExtra` has no `extra` and leaves the transport where it is.
- **The join**: the strips share one island pane (`sortableList({ axis: 'x' })` puts the island on the row of items, not on each item, to keep LANES' look); `fixed: true` hides the chips and + ADD in both layouts (rows showed them disabled); `.sw-glyph` leaves how ON shows to the owner; `select({ host })` exists but the audio drop popup keeps its pane on the body (the popup scrolls, `overflow: auto`, and would clip a list inside it); `createApp({ modRoots })` has no default list of the panels' roots; `modwindow.css:371` stays (it also clears the background image and reverts the backdrop filter, which `timeline.css`'s rule does not); `mod.js hitMacroFor` is left as X recommends.

### For Josh's eye
- **FROST in the light theme is white ink on a light pane.** The recipe says White Text in both modes, so the kit follows it; if you want white only in dark, it is FROST's `text` in `themes.js` (or TEXT AUTO in the GUI).
- **The direction sphere is a new control kind.** CAMERA's 3-D view uses it for yaw and pitch, with two arcs that stay the modulation targets; it is in `docs/CONTROLS.md` as an R row for you to keep or overrule (the alternative: the camera keeps it as its own widget).
- **The XY window has three uses** (PAIR · ROUTE · MORPH) on one segment, and in ROUTE its X and Y are **two macros named XY X and XY Y** that appear in the modulation window the first time ROUTE is used, owned by the panel so nothing else binds to them.
- **The recorder-style accent-label buttons** (standing since alpha.13): RENDER and CAPTURE IMAGE are a raised trigger with an accent label and a .55 accent rim, not BASINS' `--acc-soft` fill (INTENT: ON is a frost face and a rim, never an accent fill). The XY panel draws its armed corner's target numbers the same way (a raised face with an accent rim).
- **Gap 8 is BASINS'**: the COLOUR `+ ADD` and MAPPING well fill under glass faces is BASINS' own unlayered `skin.css:529–533`, not the kit's.

## 1.5.0-alpha.13 — 2026-10-05 · the control language, audio, the recorder, the opener, the icons

Not released: built on branch `worktree-mir-1.5`.

**Behaviour changes (read these first):**
- **The fine gear is ⅛, on any modifier or a second finger, everywhere.** One number (`setKnobLaw`: `fine` 8, `keyFine` .125, `faderFine` 8; `dragTravel` is 1760 px with a modifier) now serves every knob, fader, arrow key and `bindSliderKeys` (it was ¼ on a knob, ⅕ on a fader, 1/10 on the slider keys, and Shift only). Shift, Alt, Ctrl, Meta or a second finger down engages it, on a virtual point: engaging it moves nothing. The modulation window's macro seats and bars take the same law (`wireSlider`).
- **A knob's drag is vertical by default**, jog wheels included. `dragAxis: 'sum'` keeps 1.4's (up and right both raise).
- **The stepper is `.mir-step`**: `.gui-step`, `.gui-step-row`, `.gui-step-name`, `.gui-step-b` are now `.mir-step`, `.mir-step-row`, `.mir-step-name`, `.mir-step-b`, and the token `--gui-step-b` is `--step-b`; its rules moved from `gui.css` to `controls/controls.css`. A page that links `shell/gui.css` by hand must also link `controls/controls.css` after it (`mir.css` imports both).
- **The GUI's five accent dials are arcs**: ACCENT A, ACCENT B, HUE, LIGHT ANGLE and RELIEF ANGLE are `arcKnob`s (the kit now has one arc build). The ring is 4 of 40 units, 3.8 px on a 38 px dial, where the old masked conic was 2 px: `--arc-stroke: 2` on `.mir-gui .k-arcknob` brings the thin one back. `.accent-dial`, `.accent-dial-b` and `--accent-sweep` are gone from `skin.css` and from the host-token list (an app that wrote `--accent-sweep` should draw its dial with `arcKnob`); the HUE dial no longer writes `--acc` on its own root.
- **ABOUT is 520 × 812** (BASINS'; it was 470 × 670) and sits 32 px above the stage's middle (`aboutSize`, `aboutRise`). **The notebook saves the size it was given** (its inline style), not its layout box.
- **History row names are stored as written and put in capitals by the sheet** (`.hist-lbl` reads `--label-case`): a row an app pushed in lower case now reads in capitals.
- **FOLDERS exports leave through `saveBlob`**: where the browser accepts files in `navigator.share` (iPadOS, Windows and macOS Chrome) the share sheet takes the file; other browsers download as before.
- **The kit's microphone is `installModulation`'s default audio**: ADD AUDIO is offered in every app (it was refused as "unavailable" when the app passed no factory). `audio: false` leaves AUDIO out; an app's own factory still wins; the microphone opens only on a press of MIC.
- **`installTimeline` installs the audio clip**: dropping an audio file on a lane, ADD AUDIO… in the ⋯ menu, the playback and the `assets` project part need no app line. `audio: false` leaves it out; an object is `installAudioDrop`'s options.
- **A tempo change re-derives natural audio clips as derived state, in no undo row** (BASINS added one row per re-derive). The audio budget (64 clips, 20 minutes of distinct audio) counts every audio clip however it was made, and a refused add says why.
- **`north` is now `popOut`** (the pop-out arrow). `north` stays as an alias that draws the same arrow; the compass is `compassNorth`. The transport's dock chip draws `dock` (and `popOut` when docked), the rack chip `popOut` / `dock`.
- **`host.clock.advanceTo` returns before touching the wall stamp while a scrub or a recorder owns the clock**: an app's own realtime tick can no longer move the stamp under a recorder's exact steps.
- **The modulation window keeps no native field**: the route matrix's select and number are the kit's `select()` and `number()`; a range slider's thumb is a routable target (`ROUTABLE` gains `.rng-t[data-param]`); an arc knob's press still selects its macro and still starts the hold-for-the-pop-over (both are heard on the host in capture).

### The control language (`docs/CONTROLS.md`, `gallery/controls.html`)
- The kit prescribes one control per kind of value, in one table, and a page shows each (`controls.html?pair` shows dark and light as two frames). New in `mir/controls/`: `stepper` (‹ NAME ›, a list pane on the name, `pager: true` for a page turner), `select` + `listPane` (the kit's own choose-one, in the menu pane, never the platform's popup), `number` + `bindNumber` (the tempo field's law for every typed number: drag, click-to-type, keys), `rangeSlider` (one track, two thumbs that never cross), `xyPad` (the hand for a coupled pair, its two knobs staying the targets) and `control(descriptor)` (a descriptor chooses the kind: SEGMENT up to 4 options, STEPPER 5 to 16, SELECT beyond, and so on; `params()` returns the record).
- `knob.setState('warn' | 'clamped', reason)` and `knob.dragging()`; `sw({ lamp: false })` (ON is the frost face with the label in the accent, as a trigger's); `verticalDrag`, `fineHeld`, `gearOf`, `watchTouches` exported from `kit.js`; every control is re-exported from `kit.js`. The GUI's private stepper is the kit's (`gui.js` still exports `stepper`). `bindTempoField` is one `bindNumber` call.

### The colour controls (`docs/CONTROLS-COLOUR.md`, `gallery/colour-controls.html`)
- BASINS' `colour-controls.js`, `arc-ring.js` and `colour.css` in the kit: the **arc** (`arcRing`, `arcKnob`: a body-less SVG ring with round caps in its own ink, the vertical law or the angular law (farther from the hub is finer, a 7 px dead hub), the routed live dot; a modulation target as `knob()` is), the **hue swatch** (`hueSwatch`: tap = the platform's chooser, an 8 px drag turns the hue, a glow in its colour), the **lane slider** (`laneSlider`, `laneInk`: a pill in the lane's ink with a glowing thumb, horizontal or vertical, a modulation target natively), the **static chip strip** (`chipStrip`: the rail's round discs in the flow, with an armed-to-fire chip) and the **sortable list** (`sortableList`: a pane per item, grip over an armed ×, + ADD that dims at the cap, mirrored to the rack's outer edge, reordered by drag or arrows). A press a control stops is forwarded to the page; cancel, lost capture, Escape and a hidden page put the value back.

### Audio, assets and the project ZIP (`docs/AUDIO.md`, `docs/FORMAT.md` § The project ZIP)
- `core/zip.js` (the stored ZIP: CRC-32, 32-bit parts) and `core/assets.js` (file bytes and their analysis by content hash in IndexedDB, memory fallback); `modulation/audio-capture.js` (a microphone: three bands, flux, latency); `timeline/audio-analysis.js`, `audio-playback.js`, `audio-drop.js` (the audio clip: peaks and envelopes by band, KEEP AUDIO ↔ SIGNAL ONLY, STRETCH, the drop popup with its DRIVES row).
- FOLDERS: SAVE AS ZIP… and OPEN ZIP… (`folders/zip.js`, the `zip` option, a dropped `.zip`, `api.exportZip` / `openZip`; the project is validated before any asset is written, and an asset whose bytes do not hash to its name is rejected), starter refresh in place (`revision`, `replaces`, `files.refresh`), `folders/save-blob.js`.
- **The two BASINS leftovers closed**: FOLDERS' rack-card pager was checked against BASINS' and is BASINS' already (44 px round wells, a 44 px / 1fr / 44 px grid, gap 6, margin-top 8; the kit reads `--state-disabled` .38 where BASINS wrote .35); and the share sheet for exports is `saveBlob`.
- The timeline's notices say the add's own sentence when the budget refuses a duplicate, a paste or a slice; Shift+T says `STRETCH ×{rate} · pitch follows`.

### RENDER (`mir/render/`, `docs/RENDER.md`)
- BASINS' deterministic render as `createRecorder`: frame zero at the play edge, exact 1/fps steps, the live runtime captured and restored (`host.clock.captureRuntime / restoreRuntime`), MP4 at a high bitrate by WebCodecs (the kit's own muxer) or lossless PNG frames in stored ZIP parts, the encoder preflight (encode and decode, 60 s), RUN SELF-TEST, the store on disk with recovery (RECOVER COMPLETED FRAMES, RESUME WITH MATCHING PROJECT), the four clock modes, STILL · TIMELINE · ACTIVE · TIMELINE · SELECTION and an app's own motions, the estimate and the ceiling warning. `renderPanel` (a FOLDERS panel), `createRenderCard` (a rack card), `createRenderView`.
- `createApp({ render: { frame, … } })` builds the recorder, hands `busy` to the timeline, seats RENDER in FOLDERS and as a rack window, and returns `app.recorder`.
- The timeline's active range rides the project (it already did in the model; the editor's local fallback is gone), with a test.

### The HISTORY window, the opener, the notebook (`docs/HISTORY.md`, `docs/OPENER.md`, `docs/NOTEBOOK.md`)
- **HISTORY window** (`mir/history/window.js`): `createHistoryWindow({ history, host, mod, present, stage, … })` on `createWindow`: the notebook's frame, ↶ ↷ × in the head, the rows newest first, the future dimmed, a click returns, the count and CLEAR in the foot; the keys and the gesture naming come with it. `gestures.js` (`gestureName`, `installHistoryGestures`: CONTROL · WINDOW read off `[data-mir-window]` and the kit's labels; input settles after 400 ms; a press on the picture is absorbed), `domains.js` (`registerModulation`: the rack written back as a preset loads). `createApp({ history, historyWindow })` seats it behind WINDOW › HISTORY.
- **The opener** (`mir/shell/opener.js` + `opener.css`): BASINS' title screen, `createOpener({ covers, mainCount, session, logo, notice, warn, direct, onPick })` → `start()`: lazy video covers paused when hidden, off screen or under reduced motion; hover by lanes; the kit's pointer light; the arrow-key grid; NEW / RESUME; `?starter=` and `?warn=`. The notice takes `photosensitivityNotice({ every: true })` (BASINS' every cold start) and `art` / `alt`.
- **The notebook**: `notebook.project` (`capture`, `restore`, `signature`, `part()`) for a notebook without pages (the landing law: a project lands on its notebook only when it has text; `createApp` registers the part); `landing: 'text'` does the same for a notebook with pages; its drags paint through the frame core.

### The icon library (`docs/ICONS.md`, `gallery/icons.html`)
- `mir/glyph.js` is the one icon library: **75 glyphs**. New: power (BASINS' ring and stem, with the `mir-power-*` hook classes), minus, eye, eyeShut, rewind, stop, record, loop, undo, redo, upload, search, settings, home, link, star, starFill, mute, solo, chevronUp / Left / Right, move, gripDots, compassNorth, and for the windows to come xy, curves, cameraOrbit, grade, lanes; BASINS' timeline tools edit, select, scrub on the 24 box. `glyphAliases()` is new and `hasGlyph` follows aliases.
- Every module that kept a drawing of its own now draws through it: the transport (power, rewind, dock), the notebook's eyes, the timeline's minus and three tools, `gripDots()`, the modulation window (its private `GLYPHS` copy is deleted, `glyphEl` is re-exported; its transport faces, power, move cross and macro-head power are the library's). `tests/glyph.node.mjs` now fails on any inline icon.

### Developer tools
- `tools/hit-probe.mjs` (a 5 × 5 `elementFromPoint` grid over any element and a real drag through what the browser says is there), `tools/audit-material.mjs` (surfaces at alpha ≥ .5 and text under 2:1 read from the live page; adaptive-ink strays), `tools/serve.mjs --https [--lan]` (a self-signed certificate made on first use into the gitignored `tools/.certs/`, for an iPad; Range requests so Safari plays video), `tools/check-app.mjs --webkit` (WebKit through a Playwright and a WebKit already on the machine; says what is missing, installs nothing) and a control-language WARN (a native select, range, number or colour inside an app's window; never a failure; `data-native="ok"` silences one). `make-skill.mjs` carries the three tools in the skill.
- `gallery/windows.html` now passes both of its own tools: it opens in REFRACTIVE with glass faces and its two windows are seated apart on first visit.

### Tokens, languages, tests
- **Tokens: 1,349 rows** (133 new: 42 colour controls, 18 controls, 60 history and opener, 13 render; `--gui-step-b`, `--accent-sweep` and `--m2-xport-sw` retired); `docs/TOKENS.md` regenerated. The opener's eleven transition shorthands and its glow gradient are rows with `skin: false` (a whole value, not a skin value).
- **The catalogue is 1,377 keys**; the 125 new keys are drafted in all ten packs (`reviewed: false`); the glossary gains the controls', audio and render terms.
- `npm test`: 126 of 126 (the browser suites included). mir.css imports `controls/controls.css`, `controls/colour-controls.css`, `shell/opener.css` and `render/render.css`. Tests changed on purpose: `widgets.browser` (the ⅛ gear), `gui.browser` (`.mir-step*`), `modwindow.node` (`ROUTABLE`), `timeline-audio.node` (the re-derive adds no undo row), `glyph.node` (no inline icon passes), `parity.html` (no `.accent-dial` class).

### Not proved
- **WebKit has not been run**: Playwright's WebKit is downloaded on this machine but 12 shared libraries it needs are missing, and the installed Playwright wants a newer revision; `check-app --webkit` was proved by driving Chromium through the same adapter. Touch on a real iPad (CDP touch only), a screen reader on the list pane and the range thumbs, a 4K or hour-long render, the Safari store worker and the share sheet, a wide-gamut film, a real GPU frame source for RENDER (the fixture is a 2D canvas), and each icon in its real seat beyond the gallery are not proved.

### Choices to overrule (what the lanes chose where BASINS decided nothing, one list)
Each is one place to change. Grouped by lane.
- **Controls (lane C2)**: the ⅛ gear is one number for the knob drag, the fader drag, the arrow keys and `bindSliderKeys` (Josh asked for the knob only); a knob's drag is vertical by default and jog wheels too; a fader's press-to-set stays absolute and the gear stops the jump; a synthetic `pointercancel` still ends a drag; `warn` is a 1 px `--warn` ring and the value in `--warn`, `clamped` adds the needle; the stepper's name is a button that opens the list, the page turner is `pager: true`, and its arrows mirror under RTL; the list pane is `.mir-pick` (`.mir-list` is the sortable list's), closes on resize and blur, types ahead for 700 ms, and a `coming` row neither takes the focus nor picks; a closed select steps with ↑ ↓; the number field is 8 characters, a range-less number moves 100 steps per full travel; the range slider's thumbs never cross and a routed thumb wears an accent-B ring; a press on the XY pad brings the dot to the pointer; `control(descriptor)`'s thresholds (SEGMENT up to 4 options with every label under 26 characters, a long list over 16).
- **Colour controls (lane C1)**: `.mir-lane` and `laneInk()` are the kit's; `size: 'sm'` is BASINS' 22 px lane arc as an option (BASINS' default was the 34 px dial); the default law is `'vertical'`; Escape, cancel, lost capture and a hidden page put the value back (BASINS' arc committed on cancel); the swatch's hint says "Shift: finer", not "an eighth"; the swatch's focus is the accent ring outside, not a 1 px ring in the lane's ink; a vertical lane slider is new; a routed lane slider keeps its own ink on the thumb; the sortable list reorders by transform and commits at the drop, neighbours gliding 80 ms; `chipStrip`'s `confirm` and `flow: 'row'` are the strip's own; `+ ADD`'s `noun` is an option; the arc's 4-of-40 stroke is BASINS'.
- **Audio and ZIP (lane AU)**: FOLDERS' ZIP buttons sit in the gallery foot, and a dropped `.zip` opens as a project; the file is `<name>.<app>.zip` and keeps the project's case; SAVE AS ZIP reads the live project; the project is validated before any asset is written (default validity is "an object"; `zip.validate` is the app's); opening forces the open with no "save this first?"; the asset store's database is `mir-assets` (`useAssets(createAssetStore({ name: 'basins-assets' }))` keeps BASINS' users' files); the reader rejects a swapped asset and an entry pointing outside the file; seed revisions are the starter's `revision` string and a conflict reloads and applies on top; undoing an edit made before a tempo change restores that edit's clip fields as they were; the budget refusal is `model.lastRefusal` (`why`, `vars`); the drop popup is `tl-pop glass` in the menu surface; microphone and audio-file messages go through `t()`; KEEP AUDIO is muted while a recorder runs; the kit's microphone is on by default.
- **RENDER (lane R)**: the frame protocol (`frame(i, ctx)` returns a canvas, bitmap or pixels, put on an opaque black ground); the record clock reads the host's own automation provider; a wall stamp is put back before each exact step (and `advanceTo` is fixed at the source); waiting while hidden is on `visibilitychange`, not a poll; the screen is held through an option `wake(reason) → release`, asked inside the tap; no MediaRecorder fallback; the estimate shows time (BASINS' 84 ms seed, learned after one run) and the ceiling sentence is reworded; the self-test gains the store, MP4 decode and wake-lock stages; the store directory defaults to `mir-recordings` (BASINS passes `basins-recordings`); modulation defaults OFF and timeline ON in the API; a resume refuses when the tempo changed.
- **HISTORY, opener, notebook (lane H)**: the opener never touches the session (`applyChoice(session, id)` is the app's); a cover's start is a new project; the notice stays the kit's dialog pane (no scrim) with the app's picture above the words; the hover glow is the kit's pointer light; BASINS' `is-*` classes became `data-*` attributes and `mandel-warn-*` / `starter-*` became `mir-opener-*`; reduced motion is the kit's policy; `--opener-title-font` defaults to the kit's display face (the app's own font stays the app's); the screen has the focus, not a cover; the history list keeps the kit's look (the inset well, the chosen row on the frost face) inside BASINS' notebook frame; `createHistoryWindow` installs the keys and the gestures by default; the window's first place is BASINS' (left of the right rack, 12 % down) and its key is `mir.history.window`; the modulation domain also calls `mod.persist()` and `mod.view.rebuild()`; `aboutRise` is 32 px; `landing` is off by default for a notebook with pages (the INFORMATIONAL greeting is that notebook's landing); `warn: 'every'` still skips under a test driver.
- **Icons (lane I)**: `north` stays the pop-out alias and the compass is `compassNorth` (flip at 1.6 if you want); `dock` is `popOut` turned 180° and the transport's dock chip now says what it does; the box stays 24 units (16 px is where it must still read); BASINS' three timeline tools are scaled ×1.5 and drawn at the set's 1.9, a little lighter than BASINS' plates; `chevronLeft`, `chevronRight` and `starFill` were added for the typed `‹ › ★`; `power` carries BASINS' faint halo; `record` is a plain disc; `mute` is a speaker with a cross; `lanes` is staggered clips with no track lines; the macro head's power keeps its two heavier weights and loses the halo.
- **Developer tools (lane D)**: the self-signed certificate lives in the gitignored `tools/.certs/`; the control-language check only WARNs; its list of kit-owned subtrees (`KIT` in `check-app.mjs`) still skips the timeline, `.mir-field`, the keyboard window, the notebook, FOLDERS and the modulation window; BASINS' boot stub was not harvested (it is BASINS-specific).
- **The join**: the route matrix's `select()` and `number()` replace the native fields (the matrix button is hidden and disabled by default; a kit list pane opened from inside its modal dialog would sit behind the dialog's top layer); the HISTORY menu row and the `history`, `historyWindow` and `render` options of `createApp`; the RENDER rack window is `side: 'right'`, closed; `gallery/windows.html` opens in REFRACTIVE.

### For Josh's eye
- **The accent dials**: the GUI's five accent dials are now the kit's arc at 3.8 px where the conic was 2 px. If you prefer the thin one it is `--arc-stroke: 2` on `.mir-gui .k-arcknob`.
- **WALL and 60 Hz stay tiles**: the transport's WALL / 60 Hz triggers cycle two modes through a button whose label is the state; the table says 2–4 modes are a SEGMENT, but BASINS' tempo panel draws them as tiles, so they are left as tiles. Say the word and they become segments.
- **The recorder panel's primary buttons**: RENDER and CAPTURE IMAGE are a raised trigger with an accent label and a .55 accent rim, not BASINS' `--acc-soft` fill (INTENT: ON is a frost face and a rim, never an accent fill).
- **`north`**: stays the pop-out alias and the compass is `compassNorth`; the window header's CSS-drawn `.dev-power` is not replaced by the glyph (it is the header's look); two pencils (`rename`, `edit`), two grips (`grip`, `gripDots`) and two bars (`leave`, `minus`) are left as they were and listed under "Open" in `docs/ICONS.md`.
- **The audio drop popup still carries a native select** for its DRIVES target: a kit list pane would be outside the popup and its outside-press closer would cancel it. It wants a select that lives inside a popup.
- **The BASINS plates**: the timeline's three tool icons and the transport's play in the modulation window are the library's drawings, a little lighter than BASINS' own.

## 1.5.0-alpha.12 — 2026-10-05 · the BASINS harvest, wave 12

Not released: built on branch `worktree-mir-1.5`.

**Behaviour changes (read these first):**
- **The keys are BASINS' now** (`KIT_KEYS`): **S** opens FOLDERS and **F** is full screen (new `fullscreen` action). F was FOLDERS before: a user who rebound nothing now finds FOLDERS on S. B the rack, T dock the transport, H hide the interface, M, J, Space as before.
- **A new user starts as BASINS' new user does** (Josh's own list, BASINS NOTE I, DEFAULTS: "Status Tags, Help: OFF · CONTROL HINTS: ON"): HELP is off (the kit's was on), CONTROL HINTS on, STATUS TAGS off. The GUI's own help prose goes with HELP.
- **QUALITY defaults to AUTO**: a one-time benchmark of the device sorts it A / B / C; A and B are FULL, C is BALANCED. Every theme but SWIFT now says AUTO. The first-run BLUR is 11 px on a desktop and 20 px on a touch device.
- **The tempo field opens with "30"**, not "30.0" (BASINS' tempo editor): the field holds `String(bpm)`.
- **The door shows BASINS' diamond** (nine swatches stepping under a hovering mouse, never interpolated); `door: 'mark'` keeps λWAVES' accent-painted squares.
- **The modulation rail defaults to the macros' side** (`auto`; it was `left`), and **a docked or stacked modulation window docks its content box** (the rack and the work bars), not its own box: the dock guide, the landing and the lego stack are the content's.
- **FROST's TINTED has no sheen**: BASINS draws every TINTED surface (rack cards, disconnected heads and bodies, COLOUR's islands, dark and light) with `background-image: none`, and FROST is Josh's BASINS recipe. In FROST and all its tones the TINTED pane is the tint alone; CLASSIC keeps 1.4's 160° sheen. INTENT rule 4 now reads "TINTED is the tint; a sheen only where the theme gives one".
- **The fader RANGE bar is BASINS' line and dot**: a 2 px pill line across the track at 18 px in accent B (85 % at .9) and a 4 px live-value dot with a glow. The kit's 3 px floor band is gone.
- A disconnected window's head is always a pane (the 1.4 chip lift is gone); the work-bar transport inside a modulation window is the house pane; SPACING DEFAULT leaves the pane padding to the sheets (BASINS' 7 · 7 · 10).
- `createApp` installs more by default: the banner, the scene guard, the wake lock, the PATTERN with the modulation, the rack's scrollbar (`rack: { scrollbar: false }` keeps the native bar) and the skip link. The live project session and the timeline are opt-in (`session: true`, `timeline: true`).
- DOWNLOAD SETTINGS is BASINS' SAVE window's, not Settings': FOLDERS' row for it is wave 13's; it is available now as `prefs.download({ app })`.

### The live project session (`core/session.js`, `docs/SESSION.md`)
- `createSession({ key })` keeps every registered project part beside the app's view, saves 300 ms after a change (one-shot, skipped when the signature is unchanged), saves at once on `pagehide` and when the page goes hidden, and is armed only by the opener's choice (`resume()` / `discard()` / `arm()`). `hasResume()` offers RESUME on a cold start; `hold()` keeps it from writing (a film rendering); `lift` reads an app's older record; `adoptInto` + `onSeed` carry a preference migration's values into the project; `openerSwitches(search)` reads BASINS' `?warn=` and `?starter=`.
- **Preferences against project** (`core/prefs.js`): `createPrefs({ version, migrate, projectKeys, project })`: a versioned migration runs once per version and moves the project's keys out (project first; a failed hand-over retries next load), `set` refuses them after. New: `prefs.forget()` / `forgetPrefs(key, storage)` (FORGET), `prefs.download({ app })` (a `settings` envelope, `<app>-settings-YYYY-MM-DD.json`), `prefs.settings()`, `prefs.load()`, `prefs.migration`, pure `migratePrefs`, `settingsFileName`. Without `version` the store behaves as before.
- FOLDERS tells its host a project was saved: `createFolders({ onSaved(entry) })`, after SAVE AS and after SAVE over the open project (`createApp` writes the project's modulation as a CAPS preset there, `upsertProjectPreset`).

### The scene guard, the keys, the menus, the banner, the veil, the wake lock, the PWA
- **The scene input guard** (`shell/scene-guard.js`, `docs/SCENE-GUARD.md`): a wheel or a press in the UI's space (a rack column without its shadow gutter, a floating window's whole rect, the modulation window with its work bars) never reaches the picture; a gap wheel is re-dispatched to the UI scroller under it; a tap or swipe from a gap starts nothing; a drag begun on the picture keeps going. `createApp()` installs it (`app.sceneGuard`).
- **The key table** (`KIT_KEYS`, `toggleFullscreen()`, `app.hideInterface()`): see the behaviour changes.
- **createApp's menus are BASINS'**: FILE ends with the five recent projects (`recentRows`), EDIT has PLAY / PAUSE and Purge Cache/RAM, VIEW HIDE and FULL SCREEN, WINDOW the windows with their keys then the rack's then the `coming` rows, ABOUT · SETTINGS… · COPY DUMP. New row helpers in `shell/menubar.js`: `comingRow`, `purgeRow`, `copyDumpRow`.
- **The banner** (`shell/banner.js` + `banner.css`): a persistent, dismissable pane of problems, de-duplicated by title with a count, at most 30, every uncaught error and rejection reported, `offerReload()`.
- **The boot veil and the reload offer** (`shell/boot.js`): `bootVeil({ ready })` holds an opaque veil until the first real frame plus one, a 160 ms fade, an 8 s timeout; `watchDevice(device, { recover })` offers RELOAD in the banner when a GPU device is lost after boot and the app's own recovery fails.
- **The wake lock** (`core/wakelock.js`): held while the one clock plays, `hold(reason)` for a recorder (`app.wakeLock`).
- **Copy and the dump**: `copyText()` with the textarea fallback; `registerDumpLines(name, fn)` / `dumpLines()` in `core/describe.js`; `app.dump()`; `window.__MIR.app`.
- **The touch-tablet paint fix** (`base.css`, `body.touch-tablet`): a disconnected window's root is visible and paintless so Safari composites its panes; floating bodies scroll inside the screen; the head's chips grow to 38 px. **The skip link**: "skip to the device rack", first in the page. **The starter is a PWA shell**: `manifest.json`, apple meta, `viewport-fit=cover`, theme-color, no pinch zoom, five icons and their recipe (`starter/icons/make-icons.mjs`, no dependency).

### PATTERN (`mir/pattern/`, `docs/PATTERN.md`)
- BASINS' step sequencer for the modulation window's ENVs, as a plugin part: one row per ENV, 16/32/64 steps of FL's channel rack, an LED bar per step (velocity), the row menu (ON/OFF · FILL 2/4/8 · CLEAR · LENGTH · SEND TO TIMELINE), finger seats. The window is the kit's one window, seated on its ENV device through the modulation window's seat notices (`seatBox`, `onGeometry`): it follows the device, hides when it scrolls away, goes and comes back with the modulation window; a drag frees it. The rows are a project part and a history domain.
- The sequencer rides the clock's new advance notice (`host.clock.onAdvance`: every tick, every recorder step, every seek): one hit per lit step, the play edge adopted, gate release, velocity, the clip under the playhead first. It is exact under a recorder, and in a hidden tab too (BASINS' open item: a hidden-tab recording rendered hits at full strength: fixed).
- `installPattern({ mount, mod })`; `createApp` installs it with the modulation (`pattern: false` leaves it out; WINDOW › PATTERN).

### The modulation window: the rest of BASINS' fork
- PATT on the ENV face (Full and Compact) and → TL on the LFO and ENV heads; COMPACT cycles Full → Compact → Minimized; BASINS' layout motion for folds, COMPACT, the macro rail and reorders (devices and macros dragged by `core/pointer.js`, the neighbours gliding, nothing rebuilt mid-drag); a vertical wheel scrolls a docked run; a narrow dock puts the work bars in two rows; the device curve editor's readout; live shape changes redraw at 30 Hz; stepped minimised traces; Shift is 1/8; bundled starter presets (`installModulation({ factory })`); `api.selectForTarget`; nothing paints while the interface is hidden.
- The MIR switch after the preset arrows and the lego stack over the TIMELINE (`stackAbove`); TEXT LIGHT/DARK reach the 29 alpha rungs; accent BRIGHTNESS reaches the 25 hue tints.
- Importable pieces: `wireGrip`, `wireDepth`, `paintDepth`, `moveMacro`; `setAutomationGrid` / `automationGrid` (the sampling grid floors the beat the arrangement is read at; stored with the record); `upsertProjectPreset`; `AUTOMATION_GRIDS`; `presetCaps`, `presetUpsertCaps`, `bundledPresets`, `rackApply`; `createLayoutMotion`, `createModCursor`.
- `installTimeline` attaches itself to the modulation (`mod.setTimeline(tl)`): → TL and the PATTERN's clips with no app wiring; `dispose()` takes it back. A kit window gains `resize({ w, h })`, which keeps its dock.

### The transport's last parts and the workspace stack
- **The one bar that moves** (`shell/transport.js`): `tr.mountIn(host | null)` moves the same transport node into the timeline's work lane while it shows and back to the stage when it hides or the timeline closes; the rack's dock wins; `body.no-transport-bar` (Settings › TRANSPORT BAR) keeps it off in every seat; `tr.placement`, `tr.closed`, a `transport-placement` event. The timeline takes it as `transport: { shared: tr }`; `transport: false` really means none now.
- **One tempo field** (`bindTempoField`): in a work bar a click on the BPM pill types the tempo (Enter or blur takes, Escape cancels, 8 characters, decimals) and a drag runs BASINS' travel law (220 px for the range, a finger 320, Shift 1760); on the stage the pill keeps its digit drag and opens the tempo panel.
- **The tempo panel's macro rail** (BASINS buildMacros / wireTileReorder): MACROS | CLOCK; the modulation window's own macro rows as tiles (route grip, depth, reorder by drag and keys); in a work bar the panel opens toward the free side.
- **The door's palette diamond** (`wordmark.js createMirDiamond`, `installPaletteCycle`, `MIR_PALETTE`).
- **The lego stack and the MIR switch** (`window/workspaces.js`): `createWorkspaces({ upper, lower })` seats MODULATION 8 px above TIMELINE when both are open, the timeline reserving its top; dragging MODULATION away detaches; `workspaceSwitch()` is the MIR switch chip. Kit windows gain `reserveTop(px)`, `stackAbove(anchor)`, `isStacked`, `stackHeight()`. `createApp({ timeline: true })` builds the TIMELINE, the stack and the switch.
- **Docked resize rules stated** (docs/WINDOWS.md law 12): docked resizes height inward; a bottom dock's corner is the upper right; detaching restores the floating width.
- **`wordmark({ svg, mark })`**: an app seats its own SVG lettering (one SVG, or `{ dark, light }` image URLs) and its own mark; `--title-art-h` (26px) is its height.

### Adaptive ink, accents, the GUI's rows, QUALITY AUTO
- **Adaptive ink** (`core/ink.js`, `docs/INK.md`): `createInkSampler({ sample })`: the app hands a small luma grid of its picture; the kit walks the cells, composites the ground up through every pane, applies BASINS' bias (.45 / .55) and its seen-twice hysteresis, and writes `data-ink="w|k"`; `skin.css` re-seats the pure ladder (and the modulation window's ink rungs) on the cell. No poller: sampled on the app's `update()`, ≤ 4 Hz. The glass is never touched and there is no text shadow. TEXT · AUTO samples when `createGui({ inkSampler })` is handed one; LIGHT · DARK stop it.
- **ACCENT BRIGHTNESS**: both accents mixed toward white in OKLCH (`createAccent({ bright })`, `towardWhite`), `--acc-white` on `<body>` while above 0. **The accents ride the project**: the GUI registers the part `accent`; opening a project applies them live.
- **The GUI's missing rows**: STATUS TAGS (`body.no-badges`), RESET LAYOUT (with `createGui({ rack })`), FORGET (`prefs.forget()` and a reload), TRANSPORT BAR (`body.no-transport-bar`), SAMPLING · SCRUB (LIVE · LIGHT · RELEASE) and AUTOMATION (FRAME · 1/32 · 1/16 · 1/8) with BASINS' cost toasts (now through `t()`). `scrubLevel` has no seat in `createApp` (it builds no timeline controller): an app that binds the timeline passes `scrubLevel: () => gui.prefs.get('scrub')` itself (`docs/TIMELINE.md`).
- **QUALITY · AUTO**: see the behaviour changes; the bench is injectable (`tierBench`); the kit's measures the UI's own style and layout pass. `body.touch-tablet` on an iPad or a coarse pointer wider than 700 px.

### The rack's leftovers (`docs/RACK.md`, items #20 #33 #34 #71 #72 #73 closed)
- The scrollbar seated at the card column (`createRack({ scrollbar: true })`, `shell/rack-scrollbar.js`): BASINS' transparent 12-px track beside the cards with a 3-px accent thumb, dragged, wheeled and keyed; the native bar off on a wide screen; gone with no overflow, under H and with the rack hidden.
- The touch-tablet float clamp (`tabletClamp`, on by default); retired window ids (`createRack({ retired: { oldId: heirId } })`) in saved layouts and ☆ layouts; a layout keeps the notebook's size (`createRack({ notebook })`); `rack.resetLayout()` (RESET LAYOUT); `rack.digest(id)` / `rack.copyDigest(id)` (COPY a window's readouts, `· COPIED` flash).
- `createRack({ persist: 'all' | 'closed' })`: `'closed'` keeps only which windows are closed and the phone rack shown across a reload (BASINS'); `closedLayout()` is that record. Default `'all'`, unchanged.
- The shadow gutter checked against BASINS (identical at 1280 × 800); `body.phone` now has none, as BASINS' `body:not(.phone)` rule.

### BASINS parity, round four
- The modulation window under the engine: GLASS faces clear + MACRO and + DEVICE (`--m2-add-face`); the device head keeps its .06 wash in every card style (only the flat tier drops it); the artifact's switched-off two-stop wash is `none`; the device cards, the macro rail and the work bar thin with every TINTED pane (`--m2-mat-chassis` reads `--card-opacity`).
- FOLDERS: the ask ("save this first?") is BASINS' solid tinted pane with a .55 accent rim and its own ink; the menu box is a well with a .40 accent rim; the components disclosure is at 6 / 4 px with 8 px labels; the folder row and the project grid are 6 px, the projects 4 px; a paged rack card reserves its four rows, its page buttons are round wells.
- Tokens: 1,219 rows: 104 new (lane rows plus `--i`, `--q` and `--title-art-h`), two retired (`--disc-chip-lift`, `--surface-lift`: nothing read them since the 1.4 disconnected head went), `--card-opacity`, `--m2-mat-chassis` and `--m2-glass-wash` re-stated; the catalogue is 1,252 keys, the 82 new keys drafted in all ten packs (reviewed: false).

### Choices to overrule (what the lanes chose where BASINS decided nothing, one list)
Each is one place to change. The lanes' own "inventions" lists were not kept with their hand-overs, so this is what the hand-overs, the docs and the code show, grouped by lane.
- **Look (lane L)**: every theme but SWIFT states QUALITY as AUTO; the bench measures the UI's own style and layout pass (the kit's reading of BASINS' device-relative law, and injectable as `tierBench`); TEXT · AUTO samples only when an app hands `createGui` a sampler, otherwise it is the pure ladder as before; `TOUCH-TABLET` is an iPad or a coarse pointer wider than 700 px. The join flipped two of lane L's choices to BASINS': HELP's default (it was on) and the SAMPLING toasts (now through `t()`).
- **App (lane G)**: the live session is off by default in `createApp` (`session: true` turns it on; BASINS' own app always runs one); the banner keeps 30 problems and the veil times out at 8 s; the skip link's words; the PWA starter's icons and its no-pinch-zoom viewport; `app.dump()` and `window.__MIR.app` as the debug seat; `scrubLevel` has no seat in `createApp` (documented as the app's one line).
- **Transport (lane T)**: `door: 'palette'` (BASINS' diamond) is the default and `'mark'` keeps λWAVES'; the nine swatches `MIR_PALETTE` and the 240 ms step are the kit's palette on BASINS' mechanism; the lego stack's 8 px gap; the tempo panel opening toward the free side in a work bar; `--title-art-h` 26 px.
- **PATTERN and the modulation window (lane M, PX2)**: PATTERN is on with the modulation in `createApp` (`pattern: false` leaves it out); rows of 16 / 32 / 64 steps; the window's seat (8 px above the content, or below it when the screen's top has no room) and "a drag frees it"; the three COMPACT states' sentences; the → TL sentences; `persist: 'all'` kept as `createRack`'s default (BASINS persists only the closed list: `persist: 'closed'` is one option away).
- **Session (lane S)**: the settings file's name (`<app>-settings-YYYY-MM-DD.json`) and envelope kind (`settings`), and `prefs.load` refusing a whole file when one value is out of bounds, are the kit's.
- **Rack (lane RK)**: `createApp` turns the scrollbar on (`createRack`'s own default stays false); the COPY digest's layout (`name · TITLE · ISO time`, one tab-separated line per readout); RESET LAYOUT leaves app cards in place.
- **Round four (PX1, PX2)**: FOLDERS' padding and gap values were measured from BASINS' source, not ruled; the rail's default `auto` and the content-box dock were read from BASINS' modwindow.

### For Josh's eye
- **The TINTED sheen**: FROST's TINTED panes lose the 160° highlight (as BASINS draws them). CLASSIC keeps it. If you want the sheen back under FROST it is one rule in `skin.css` (`body.frost[data-card="tinted"] { --surface-sheen: none; }`).
- **The notebook's light-theme veil is not ported**: BASINS paints a white .58 veil behind the light-theme notebook (INV-CODE row 189) and .72 white on its buttons, which repaints glass to rescue text. With adaptive ink the notebook's labels read by the picture instead. Say the word and it goes in.
- **`persist` default kept as the kit's**: `createRack` keeps all of the layout across a reload (`'all'`); BASINS keeps only the closed list (`'closed'`).
- DOWNLOAD SETTINGS lives on `prefs.download()`, not in a FOLDERS row yet (wave 13).

## 1.5.0-alpha.11 — 2026-10-02 · the timeline, TINTED can blur, the rack moves as BASINS'

Not released: built on branch `worktree-mir-1.5`.

**Behaviour changes (read these first):**
- **TINTED can blur** (INTENT O12, ruled by Josh: "tinted can blur, the blur knob can reach 0 no?"): under FROST every tinted surface thins to `--frost-opacity` (.58) and takes the frost filter, as REFRACTIVE does; FROST · STILL, the lite and flat tiers and reduced transparency return the full tinted fill with no filter. SOLID never blurs. The value tooltip and the notice toast stay unblurred under TINTED, as BASINS' tip and toast.
- **BLUR 0 is no blur**: `--surface-filter` and `--frost-filter` are both the whole value `none`; the pane stays at .58.
- **CLASSIC states FROST off** (1.4's default); FROST on gives 1.4's .58 frosted card at 22 px.
- **Rack cards move** (Josh: "Yes to basins animated drag and drop"): a fold, an open or close, content growing, a window dropped in or lifted out animate the card's height and every moved card's travel (320 ms); a card enters 6 px up over BASINS' 220 ms on its own curve.
- **The title bar decides** (Josh: "Let the windows title bar be the deciding factor whether a window goes above or below something"): a carried window goes above another once the middle of its title bar is above that window's middle, below once below; in the rack and when a floating window is dropped over one.
- **A work-bar transport's round seats (to-start, send-to-rack, the logo) keep the bar's hairline** in every work bar, as BASINS draws them beside the tools (they had none outside the timeline).
- FOLDERS: 6 px between the wrap's rows, the fields and the grid; 4 px between tools (each 55 px); the count a 16 px row; a folder button with a cover sits on `--glass-well` (.22), not black.

### THE TIMELINE: the kit's second plugin (`mir/timeline/`, `docs/TIMELINE.md`)
- **BASINS' timeline, harvested whole** (Josh's 2026-10-01 tuning, branch `basins-ui-fixes-2026-10-01`): lanes of clips over musical time, automation curves on any registered parameter, pattern clips, audio clips (the kit's half), the ruler (scrub, range, Shift-zoom), the playhead, selection, slice, the curve editor (FL's gestures: `curve-gesture.js`), the readout layer, the held-knob CREATE AUTOMATION CLIP, the ⋯ menus.
- **`installTimeline({ mount, mod, … })`** (`timeline/bind.js`): one call wires the arrangement into the modulation clock as its automation (no second clock), registers it as the project part `timeline`, adds its keys to the app's key table and (with `history`) makes it one domain of the app's history. **`createTimeline(host, port)`** (`timeline/window.js`) for an app that builds its own seam.
- **The one play:** the work bar carries the kit's transport in its work-bar form (`createTransport({ bar: 'work' })`); its ▶ and Space start and stop the app's one clock; modulation's power only bypasses. The work bar is Josh's fix 5 (the transport hugs the left; EDIT … ACTIVE · ⋯ is one right bar reaching the resize corner); no hint row (fix 6).
- **The window** is `createWindow({ material: 'modulation' })`: docked at the top or bottom of the app's span, floating, resizable, its rail relocatable (Shift-drag, long press, keys); WORK BARS cycles top → bottom → hidden with BASINS' pressed; + / − lane, reset size.
- **The clip-kind registry** (`registerClipKind`): curve, `pattern`, `audio`, and an app's own.
- **The keys are rows of the app's one key table** (`timelineActions(get)`, live only while the timeline has the focus); the SHORTCUTS sheet and `docs/TIMELINE.md`'s table are generated from them.
- **The look** is tokens (`timeline.css`'s FROST block, 130 tokens, intent lint zero); the window is clear and its ruler, lanes and work bars are house `.glass` panes, so CARD, FROST, CORNERS, FACES, both lights and SPACING reach them.
- **What BASINS deletes** when it adopts: about 2,300 lines (`docs/TIMELINE.md`, file by file); what stays its own: the palette remap (the `remap` port), the pattern sequencer and PATTERN window, the audio engine, its SAMPLING grid and recorder, the 10ⁿ readout.
- `gallery/timeline.html`: a picture drawn from four parameters, two automation lanes, a pattern clip, play.
- Tests: BASINS' node tests ported (`tests/timeline*.node.mjs`, 13 files) and its six browser rigs ported (`tests/timeline-{fixes,scrub,ticks,kinds,readout,smoke}.browser.mjs`: 44/44, 14 of 22, 58/58, 32/32, 23/23, 6/6, each plus a press ledger), and `tests/timeline.browser.mjs` (24 checks).
- The timeline's status line counts through `tn()` ("1 clip selected", "2 clips selected").
- `installModulation` gains `onTick(fn)`; a work-bar transport types the tempo on a click of the pill (BASINS' timeline form); `tools/cdp.mjs` names Insert and the numpad's * and /.

### TINTED can blur
- Rule 4 now reads: TINTED is tint + sheen, and thins and blurs under FROST as REFRACTIVE does; BLUR 0 is no blur. Every tinted surface follows: rack cards, `.glass` panes and hooked surfaces, stage rack buttons, islands, disconnected heads and bodies, menus, the hint and the ⓘ panel, both kinds of rail disc, the modulation work bar and the work-bar transport. Rail discs take the chip filter under FROST for every card style, as BASINS'. INTENT ledger L64–L68 and L70 reversed; L69 (the tip) kept unblurred, as BASINS' tip. New token `--frost-opacity` (.58).

### The rack moves as BASINS' does
- `shell/rack.js` `createRackMotion` is BASINS' `rack-motion.js`, harvested: height and travel at `--rack-motion` / `--rack-ease` (the core's structural duration and ease-out); the held card follows the hand and settles into its slot; reduced motion, `off` and the flat tier jump. It is the one sanctioned layout animation (`docs/MOTION-LAW.md`, `docs/CORE.md` law 2), joined to the one-writer registry by `core/motion.js` `own(el, anim)`. The entrance is BASINS' (`--rack-enter` 220 ms, `--rack-enter-ease`); the carried card has no scale, as BASINS'. `reorderIndex` / `insertionIndex` take the title bar's middle; `RACK.hyst` is gone. Racks carry `data-mir-rack`.

## 1.5.0-alpha.10 — 2026-10-02 · FOLDERS lands in BASINS

Not released: built on branch `worktree-mir-1.5`.

**Behaviour changes:**
- **The FOLDERS gallery's paddings and corner are BASINS'**: explorer padding 9 px 9 px 0 and a 12 px corner, crumb 4 px 6 px, the count with −9 px on the right, folder button 8 px, foot 8 px.
- **The picture ground is black** (`--folders-thumb-ground`: `hsl(0 0% 0%)`, was `hsl(220 14% 6%)`).
- **A segment in a modulation-material window is the plugin's own button**: a 1 px edge in the pane's edge colour, `--m2-button-r`, 11 px type at 1.32 px, `--m2-button-pad`, ink `--fg` unchosen; CHOSEN keeps its ruled ON face.
- **Disabled controls in that material show `cursor: not-allowed`**, as the plugin's own.

**A rail tier for an app's window law:** `win.stackAt(z, { railOffset })` and `createWindow({ railTier })` (default 1): an app that keeps its rails in a tier above its windows passes it (`docs/WINDOWS.md`).

**For the record.** On alpha.9, BASINS replaced its SAVE window with `createFolders`. Its own SAVE gate scored 38/40, with the same two failures as before. An old library loaded whole: 37 entries, 9 folders, 9 pictures and the window rect. The gallery compared at zero open differences over 36 elements in 5 states. And 1,261 cloned rules (205 kB at boot) were deleted. With this release's geometry BASINS can delete the last of its `save.css`.

## 1.5.0-alpha.9 — 2026-10-02 · BASINS parity, round three

Not released: built on branch `worktree-mir-1.5`. FOLDERS (`material: 'modulation'`) now computes what BASINS' SAVE window computes, element by element, at BASINS' boot, at Josh's FROST recipe and in the light TINTED seats; what still differs is ruled (`docs/THEMES.md`).

**Behaviour changes (read these first):**
- **The light TINTED pane is .86, not .84**: `--card-opacity` follows the theme's glass opacity (it resolved at `:root`), as its note always said and as BASINS draws it.
- **The modulation plugin's panes lose their inner-light shadow layer**: the window and rail panes wear the pane shadow alone (`--m2-win-shadow`, `--m2-rail-shadow` = `var(--surface-shadow, …)`), as BASINS' material.
- **In a modulation-material window, a trigger that is not a toolbar verb is the plugin's own button** (RESTORE FACTORY GALLERY, a question's buttons, the RENDER panel's): its corner, padding, ink, .06 face and edge, read from the plugin's shared values (`--m2-button-r`, `--m2-button-pad`, `--glass-raise`).

### BASINS parity, round three
- **The material's well is .22** (`--glass-well`, shared with the plugin in `skin.css`'s block): FOLDERS' folder and project tiles take it as their ground (still flat: a tile is pressed, not a well), and the options button too, with BASINS' hairline.
- **A kit window's pane and rail stack as one** for an app's own window law: `windowOf(el)` (from the pane or the rail), `win.pair`, `win.stackAt(z)` (`docs/WINDOWS.md`).
- An `island` under TINTED draws no 160° sheen; a transport in a work bar (`bar: 'work'`) keeps its tinted pane and its shadow inside a modulation window.
- **Translator notes** (`// tr:`) for alpha.7's 14 strings, in `gui.js`, `folders/folders.js` and `folders/gallery.js`; the catalogue is unchanged at 931 keys, every pack 931 / 931.
- `--m2-button-pad` is a padding shorthand, so it is geometry and not skin-settable (the format checker refused its two values).

### Still to rule
- **INTENT rule 4 against BASINS' own tinted-frost drawing** (`docs/INTENT.md`, open question O12): rule 4 says TINTED never blurs and REFRACTIVE carries the blur; BASINS draws its TINTED panes with the frost blur when FROST is on. The kit keeps rule 4 until Josh rules.

## 1.5.0-alpha.8 — 2026-10-02 · BASINS parity, round two

Not released: built on branch `worktree-mir-1.5`.

**Behaviour and breaking changes (read these first):**
- **A floating window's right-side rail sits 8 px from the window** (kwin's gap, `RAIL.gap`, `createWindow({ railGap })`); it is flush on the left, top and bottom, and a docked rail stays flush.
- **`dragToFolder` is off by default in FOLDERS** (as BASINS): drag-to-folder and MOVE TO are an option; the FOLDERS gallery page turns it on.
- **FOLDERS wears the modulation window's material** by default (`material: 'modulation'`: rail, chips, controls, resize corner, as BASINS' SAVE window); `material: null` gives the plain house glass.
- **With the look store, a pane's shadow at SHADOW 100 % is BASINS' material shadow**, not the 1.4 one. A page with no store is unchanged.
- **A scripted pointer press can start a drag**: `core/pointer.js` `drag()` (and a window's empty-glass drag and its rail's relocation) refuse a non-primary press only when it is trusted. A `new PointerEvent('pointerdown')` from a rig (isPrimary unset) is a press; a real second finger is still refused.
- The modulation chip rail honours VEIL; SHADOW never reaches the value tooltip (`--tip-shadow`); a `chip` surface takes SATURATION; a disconnected window head is a pane under the look engine.
- FOLDERS' cover wash is BASINS' .65 (was .62); its gallery inset is 13 px; a press that travels 10 px is not a tap.
- Under GLASS control faces the house clears its wells by rule, not through `--glass-well` (an app's own fader track keeps its well, as BASINS'); the transport bar clears its own tempo field and panel, as BASINS' transport does.

### The window material, without cloning
- `createWindow({ material: 'modulation' })` writes `data-mir-material="modulation"` on the window and its rail: the window wears the modulation window's material (its rail, chips, controls and resize corner) through **eight rules in `window.css` and one shared value block in `skin.css`** (`--m2-mat-frost`, the controls' `--glass-hairline`, `--m2-rail-track`, declared once for `.mir-modwindow, .kwin-chiprail, .m2ghost, [data-mir-material="modulation"]`). **No CSS is cloned.**
- **An adopting app deletes** BASINS' `kwin.js adoptMaterial` and the about 1,250 rules it cloned for the SAVE, TIMELINE and COLOUR windows: pass `material: 'modulation'` instead.

### The look engine's last gaps
- BASINS' list a–g: the engine always draws BASINS' material shadow (at SHADOW 100 % too); a `chip` surface takes SATURATION; a disconnected window head is a pane under the engine; the modulation chip rail honours VEIL; GLASS faces keep an app's own fader track; SHADOW never reaches the value tooltip. The GUI window writes `--frost-filter` on `<html>` (blur and saturate, FULL tier only). `tests/themes.browser.mjs` proves each.

### Docking to an element
- **The anchor dock** (BASINS' `anchorTarget`): `createWindow({ dock: { anchor: { rect, clip?, subscribe? } } })` docks a window onto another element's seat, corner to corner (reach 96, capture 32); it follows the seat, is clipped to `clip()`, and hides while the seat is gone. `dock.js` gains `anchorTarget` and `anchorBox`; `createDockGuide({ window, cls })` is one guide drawing whose overlays carry `data-mir-guide="dock"`, `data-window`, `data-edge` and the app's class.

### The FOLDERS gallery
- BASINS' gallery by default: the options disclosure is BASINS' plain button, a folder counts with `mandelbrotSmall` (`folderGlyph`), the cover wash has BASINS' .65, the tile parallax follows a finger, a press that travels 10 px is not a tap, the gallery inset is 13 px (`--folders-inset`); drag-to-folder and MOVE TO are an option (`dragToFolder`); `onOpen` (BASINS seeds there, a persisted open included); `material` and `railGap` pass through.
- FOLDERS with BASINS' options (`tests/fixtures/folders-basins.html`) wears the material without the page setting it, its rail sits 8 px off the window, and BASINS' gate drives it (`tests/folders-basins.browser.mjs`).

### What BASINS can delete now
- `kwin.js adoptMaterial` and its ~1,250 cloned rules (`material: 'modulation'`); `kwin`'s anchor docking (`dock: { anchor }`); the shim its rig needed (none now). The full list and the rules only BASINS can change (its card's 14 px corner, the COLOUR lane controls, the segment's 9 px corner and the raise on its chosen segment) are `docs/ADOPTING-1.5.md` §7.

## 1.5.0-alpha.7 — 2026-10-02 · BASINS parity

Not released: built on branch `worktree-mir-1.5`. Josh, 10-02: "Prefer BASINS." Each part below was measured against BASINS' own.

**Behaviour and breaking changes (read these first):**
- **FOLDERS' default toolbar is BASINS'**: PROJECT · CAPTURE · DOWNLOAD · DUPLICATE · NEW · ⋯ (`DEFAULT_ACTIONS`). FOLDERS' own SAVE · SAVE AS · NEW · OPEN FILE · EXPORT is `actions: FOLDERS_ACTIONS`. Its rail is on the right, and **its first seat is top right** (BASINS'; `anchor: 'centre'` for the old one). The name and status lines are options (`head`, `status`): what happened is said by the toast. `createApp`'s FILE › SAVE and Ctrl/⌘+S still save over the open project.
- **The notice toast takes no pointer and is drawn as a pane**: a `.glass` pane (`#mir-toast`), so REFRACTIVE + FROST blur it; a press at the toast reaches what is beneath it (with an action, only the action takes the pointer); z-index 50.
- **`observeSpan` treats an empty or hidden rack as absent** (no open `.dev`, hidden, `phone`, `ui-hidden`, or a viewport of 860 px or less) **and subtracts the rack's shadow gutter**. A page whose rack is a plain card passes `occupied: false`.
- **FROST's controls are lit from the upper left again (two lights)**: the controls' raise and wells turn with RELIEF ANGLE (default 315°), the panes with LIGHT ANGLE (0°). alpha.5's straight-down control relief is gone: every control is back to its 1.4 relief (stylehash against alpha.4: no relief differs). MORPH links the two at 315°.
- **Glass control faces are clear in every state** (BASINS' `material.css` §1): a chosen segment, a hovered switch or segment, a pressed trigger included; a knob has no image; knobs, triggers, switches, tracks, fields, faders and readouts carry the .08 hairline.
- **The transport bar keeps its own 16 px corner** under CORNERS (BASINS).
- **`createRack` adopts an app's existing rack**: with `#rack`, `#rackL` and `#floats` in the page it uses them as they are and puts no kit look class on them (`look: 'kit'` opts in).

### The look reaches an app's own panes
- **`data-mir-surface`**: an app's own pane takes the kit's material with one attribute: `pane` · `float` · `menu` (the height) · `chip` (its own corner) · `island` (a pane only while DISCONNECTED). It is in every rule a `.glass` pane is in, at no weight of its own; a hooked pane computes what a kit card computes in every card style × frost × tier (`tests/themes.browser.mjs`).
- **TEXT · SAMPLED** (`createGui({ inkSampler: true })`): writes no `data-text`, so an app's own per-label ink sampler decides. AUTO is unchanged for apps without one.
- **Menus and pickers under REFRACTIVE + FROST** wear the theme's .10 frost veil (or VEIL) and the blur, no sheen; FROST · STILL holds the pickers.
- **A pane shadow written as `none` breaks nothing**: the carried window's ring, the tooltip's and the badge's seat and the modulation window's resize ring are outlines now, outside the pane shadow's list (`--seat-edge`, `--dev-carried-edge`, `--m2-resizing-edge`). `docs/ADOPTING-1.5.md` §8 says what an app may write.

### Two lights
- **RELIEF ANGLE** (an arc) and **LINK** beside LIGHT ANGLE: LIGHT ANGLE turns the pane shadows and the shine, RELIEF ANGLE the controls' raise and wells, LINK makes them one light (INTENT O2 settled). FROST, CLASSIC, AURORA and NEON are 0° / 315°: panes straight down, controls down-right, BASINS and the 1.4 relief to the pixel. New look options `reliefAngle` (0–360, default 315) and `reliefLink` (default off); `--relief-angle`, `--relief-sin`, `--relief-cos`; `--neu-raise` / `--neu-inset` use exact √2 offsets (the format checker now accepts `sqrt()` inside a length).
- The GUI window's OPTIONS page 2 keeps SPACING's four levels on one line (a mouse; a finger keeps the 44 px seats).

### Glass faces as BASINS draws them
- Under CONTROL FACES · GLASS every neutral face is clear in every state, as BASINS' `material.css` §1 draws it; `docs/THEMES.md` lists each state where this differs from INTENT's wording. `tests/intent.browser.mjs` accepts a clear chosen segment under GLASS faces, with its rim and accent label.

### The toast
- `notice()`'s toast is BASINS' `#toast` value for value: fill `color-mix(var(--glass-tint-color, hsl(212 12% 17%)) 82%)` (`--glass-tint-color` is BASINS' to write), shadow `--glass-shadow`, z-index 50 (`calc(var(--z-veil) + 10)`), no pointer. Measured against BASINS' toast in four seats: identical but for the dark ink.

### The dock span and adopting an existing rack
- **The dock span is BASINS' rack-bounds** (`window/dock.js` `observeSpan`): the shadow gutter subtracted; an empty, hidden, phone, ui-hidden or narrow rack absent; `setActive(on)`; `read()` adds `width`; options `occupied` and `narrow`. BASINS' docked modulation window lands where it did.
- **`createRack` adopts an app's existing rack**: `register({ id, el })` takes over an already-built window, `closed: true` starts it closed, `eager: true` builds it at once, `card: true` marks an app card that is not a window (it keeps its place in the order and in saved layouts); `rack.span()` is the page's one dock span. Proven against a ☆ layout written by BASINS' own `rack.js`. `docs/RACK.md` gains "Adopting into an app that has a rack" (four stages) and "What BASINS' rack does that the kit still does not".

### FOLDERS with BASINS' toolbar and panels
- The toolbar is data (`actions`), BASINS' by default; `panels: [{ id, label, glyph, hint, build, onShow }]` after the built-in gallery, with BASINS' radio chips on the rail; BASINS' top-right first seat (`freeSeat({ anchor: 'right' })`); an open over an unknown screen asks first; the root carries its id (`#savewin` for BASINS); `mountGallery()` for a rack card's second view, every view sharing one store and adapter; `freshLoses`, `locked` and `projection` passed through. BASINS' own SAVE gate runs against it (`tests/folders-basins.browser.mjs`).

### What BASINS can delete now
- `surface-material.js` + `.css` (with `data-mir-surface` on its own panes); the face, popover, menu-veil and window-edge rules of `material.css`; with TEXT · SAMPLED, every override of the kit in `ink.css` (its sampler seats stay).
- `toast()` and `#toast` (it keeps writing `--glass-tint-color`).
- `rack-bounds.js` and its extra instances; in stages, `rack.js` (`docs/RACK.md`).
- `save-window.js`, in stages (`docs/FOLDERS.md`).
- The full list, by part: `docs/ADOPTING-1.5.md` §7; the staged rack and FOLDERS adoptions: §9.

### Also
- `docs/LLM-MODS.md` "First runs": round two, a fresh Haiku on the fixed skill, built a playing Tetris with none of the round-one workarounds.

## 1.5.0-alpha.6 — 2026-10-02 · what three models hit, ten complete draft translations, a checker that plays

Not released: built on branch `worktree-mir-1.5`.

**Behaviour changes (read these first):**
- **The app's play no longer needs a modulation source.** `installModulation`'s `play(true)` holds a demand of its own on the clock, so with no route, no source or the power off, Space and ▶ still play. Before, the host refused ("nothing-to-run") and an app had to route an LFO it did not need.
- **Space plays over a focused button, latch or knob** (the transport's key row is `overControls`, as BASINS).
- **A modifier-only key and a non-lowercase parameter key now throw.** `createKeys` and `keys.add` refuse a declared key that is not a key (a modifier alone), naming the action; `app.param` refuses a key that is not lowercase letters and digits, naming it and the fix. Both were silent before.
- **The page title comes from `createApp({ name })`** (`document.title`); the starter's `index.html` and boot card no longer carry a name.

### What three models hit, and what the kit does now
- "Build me Tetris with MIR" was run on Haiku, Sonnet and Opus with only the skill: **all three built a playing Tetris from the skill alone**. Every one had to route an LFO just so Space would play, two found Space pressing a just-clicked latch, one bound hard drop to Shift alone (silently dropped), one put the greeting under the bar. **A fourth run on the fixed skill needed no workaround.** The evaluation is `docs/LLM-MODS.md` "First runs, 2026-10-02"; plates `docs/plates/tetris/`.
- **INFORMATIONAL keeps clear of the bar and the racks:** `createInfoLayer({ avoid })` (viewport rects; `createApp` passes `rack.keepClear()`); a block rests only in the free stage, beside the subject, else above or below, else over the subject dimmed (`data-over`, new token `--info-over-fade`), never outside the stage or under the bar.
- **`app.safeRect()`** (where the picture may draw: the stage minus the bar and the racks showing a window), **`app.play()` / `app.pause()`**; `createApp` calls the app's `present` when the theme or the look changes and when a window opens or closes.
- **`keys.add(action | actions)`**: rows after the table was made, with their saved keys. `PLAY_ACTION` is exported from the transport.
- **`LLM.md`**: one clock that always plays, `app.pause()`, `app.safeRect()`, `present` on a theme change, the key spelling, game keys over a focused knob, readouts (`.set`), the glyph names (generated; `tests/app.node.mjs` fails if they drift), checking by playing; §9 "Observed" says what each model hit and whether the kit now prevents it, reports it, or the page warns of it.
- `tools/serve.mjs` prints the pages that exist where it serves (`app/`, `starter/`, `gallery/`).
- **Apps can delete:** a first-run LFO route kept only so play works; a Space row of their own to play over a focused button; a hand-made theme subscription for the canvas; a board offset to dodge the bar (use `safeRect()`); their own play-check scripts.

### Ten complete draft translations
- All ten packs (Spanish, French, Brazilian Portuguese, Indonesian, Simplified Chinese, Japanese, Russian, Hindi, Bengali, Arabic) now translate the whole catalogue, 917 of 917 keys, with the plural forms each language needs and no review flag left. They stay `reviewed: false` (DRAFT in the menu) until a native reader checks them.
- The glossary (`docs/LANGUAGES-GLOSSARY.md`) gains the terms the top-up met and its corrections (HOLD stays English in es / fr / pt-BR / id; WALL and LIVE differ in Chinese; RACK is الراك in Arabic, so it differs from SHELF). The known weak spots are named in `docs/LANGUAGES.md` §12: Arabic's and Bengali's glass vocabulary, Russian HUE and TINT (both ОТТЕНОК), long labels (ADD DEVICE in the Latin-script languages, Bengali overall).

### The checker
- **`tools/check-app.mjs` plays the app** (it was the skill's `check-app.mjs`, which only proved the page boots): `--keys`, `--click` (hit-tested, refused when something else is on top), `--wait`, `--expect playing | paused | <text>`, `--changed '<js>'`, `--light`, `--shot`. It prints the windows, the clock, every parameter and the keys in full, and each shared page as its title and line count (`--pages` prints the pages' text; the starter's page 0 is all of `LLM.md`). The skill ships it in `tools/`. `describe({ pages: false })` is that short form.
- `tools/cdp.mjs` gains `key(spec, { hold })`, `click(selector)` and the pure `keyOf`; `window.__MIR.prefs` lets a checker set the theme.

## 1.5.0-alpha.5 — 2026-10-01 · the vanilla themes, one light, SPACING, createApp, plurals and context, BASINS' toast and transport sizes

Not released: built on branch `worktree-mir-1.5`.

**Behaviour and breaking changes (read these first):**
- **English keys changed.** 70 of the 559 English keys the alpha.4 drafts were written against changed (a context, a `{:LABEL}`, an index var, a whole sentence, curly quotes). **An app's own language packs keyed on kit strings must be re-keyed** to the new English (`mir/locales/en.json`); the kit's ten packs were carried over by script.
- **The notice is BASINS' toast by default**: one centred pill 84 px above the bottom, at most 560 px wide; a new message replaces the one showing; no ×; 3 s. An app that relied on NEBULA's corner stack passes `seat: 'corner'` (or `stack: true`).
- **SPACING's default is tighter**: rack gap and inset 6 px, pane padding 8 px (1.4 was 10 / 10 / 7); docked chip rails 4 px.
- **INFORMATIONAL's hold-still is the I key; Space is the app's one play** (BASINS and λWAVES both play on Space).
- **The GUI window's `shadow` is an amount (0–2), not a switch**: the switch is `dropShadow`; a stored alpha.4 `shadow: true/false` is migrated (true → the matched theme's amount, FROST 200 %, else 100 %; false → 0).
- **`LOOK_PRESETS` → the themes**: it holds every vanilla theme (no colour options; a theme's colours are its tones'); `LOOK_PRESETS.light` is gone (SWIFT replaces it). `census()` returns `{ blur, shadow, shine }`.
- **The controls' relief at the default light is straight down**, not down-right (every raised control and well shifts by about a pixel); the text emboss is off under REFRACTIVE or FROST; TEXT AUTO under glass is white ink in dark and black in light, so FROST reads in both modes; NEON sets the dark mode; a cast's height scales its distance and softness, not its darkness; the BLUR range is 0–24.
- **FOLDERS' default first seat** with no `firstSeat` and no rack is the centre of the stage, not the top right.

### The vanilla themes and the settings that reach them
- **A vanilla theme is a named set of the built-in settings and nothing else** (`mir/shell/themes.js`, `docs/THEMES.md`): **FROST** (Josh's recipe, the default), **MORPH** (neumorphism), **CLASSIC** (the 1.4 spirit), **SWIFT** (the fast one), **AURORA** (the flashy one) and **NEON**. Each has tones, named sets of only the colour options. Anything that needs rules or art outside the settings is a 'name'-spec (METRO, SPRITES). The GUI window's PRESET and SKIN groups are one THEME group: SKIN `‹ theme ›`, TONE `‹ tone ›`, the theme's measured cost, THEME light · dark · system, RESET LOOK. Wall: `gallery/themes.html`.
- **Harvested from BASINS, exactly:** CONTROL FACES glass · solid and BLEND, TEXT white · black · auto, SHADOW 0–200 % plus the DROP SHADOW switch, and BRIGHT · HUE · TINT · VEIL · SATURATION as BASINS' `applyGlass` computes them. FROST now matches BASINS at Josh's recipe on every compared element except where INTENT rules otherwise.
- **EDGE**: a window pane's rim (`--pane-edge`). CORNERS now reaches the kit window, menus and popovers. Under REFRACTIVE with FROST the hover hint and the ⓘ panel are glass.
- **The GUI window** has three pages (MIR OPTIONS 1 · 2 · MIR ABOUT) and five phone sheets; every new option has its proof (`tests/gui.browser.mjs`).
- `mir/core/look.js`: the look's arithmetic, pure (`glassTint`, `glassVeil`, `autoInk`, `paneShadow`, `spacingPx` …).
- **The modulation window:** its focus ring is an outline (`--state-focus` is one; reading it as a box-shadow lost the ring whenever a skin set it); the work bar's power seat is 44 × 44, as BASINS draws it.
- **Apps can delete** (BASINS): Settings › LOOK's implementation in `skin.js` (setFaces, setFaceBlend, setText, setMaterial, setMaterialPreset, applyGlass, setBlur, the pane part of setUIDropShadow), `surface-material.js` + `.css`, the glass-face, popover, glass-knob and window-edge rules of `material.css`, the TEXT seats of `ink.css` §1, the 44 px power rule in `transport-controls.css`.

### SOLID, the light angle and the shine
- **CARD STYLE · SOLID**: the opaque pane in the tint's colour (HUE picks it, TINT is its saturation, BRIGHT its lightness), with faces in the pane's colour and the relief mixed from it.
- **One light**: LIGHT ANGLE (an arc), SHADOW DISTANCE and SOFTNESS, SHINE and SHINE SOFT. The pane shadow falls away from the light, the shine (additive, on rack cards) sits toward it, and the controls' relief turns with it (`--neu-raise` / `--neu-inset` read `--light-sin` / `--light-cos`). FROST's light is from above; MORPH's upper-left.

### SPACING
- Josh: "the dock margins are too large … an option for 0". BASINS' three levels 0 · TIGHT · DEFAULT, and AIRY (this kit's): `--rack-gap` / `--rack-inset` / `--pane-pad` / `--rail-gap` = 0/0/6/0 · 3/3/6/2 · **6/6/8/4 (the default)** · 16/16/9/6. 0 is flush (square, one hairline, no shadow inside the slab).
- The GUI window writes `--rail-gap` on `<html>`; the rail sheets read `var(--rail-gap, var(--rail-gap-derived))`, so the written value wins and a page with no GUI window derives it from `--rack-gap`.

### `createApp`, `param` and the one stylesheet
- **`mir/app.js`: `createApp(options)`** does the standard wiring an app wrote by hand, in the kit's order, and returns every piece: the rack and its float layer, the look, the language, the key table, modulation, the one clock and the transport bar (the main opener), the parameters, the pages, the notebook, FOLDERS, INFORMATIONAL and its greeting, the help view, the menus, the hints and the pressed look, describe. Each piece is still the kit's own constructor (`false` leaves one out).
- **`makeParam` / `app.param(key, label, min, max)`**: one number becomes a kit control, a modulation target and a saved value; `value()` is the base, never the modulated reading.
- **Modulation takes targets after the install**: `mod.add(param)`, `mod.remove(id)`, `mod.params()`; **`mod.route(source, id, depth)`** is a first route in one call.
- **`mir/mir.css`**: one stylesheet that `@import`s every kit sheet in the kit's order (`tests/mir-css.node.mjs` fails if one is missing or doubled).
- `greet(…, { first: true })` shows page 0 up to its first `---`; keys can be held (`up`); `rack.windows()` and `rack.keepClear()`; FOLDERS' first seat keeps clear of the racks and the bar; `describe()` carries the clock.
- **The starter** is rewritten on these: one stylesheet link, `app.js` 69 lines (was 161); the transport bar is the opener, Space and ▶ are the one play.
- **Apps can delete:** the per-sheet `<link>`s; a full-screen windows layer and its pointer rules; the hand law in every `onInput`; the seven-call first route; an up-front `params` list; a hand-placed FOLDERS seat; the start-up checklist.

### Languages: plurals, context, whole sentences
- **Plurals:** `tn(n, one, other, vars?, context?)`; a pack entry may hold `{ zero, one, two, few, many, other }`, chosen by `Intl.PluralRules`.
- **Context:** one English word with two meanings is two keys (`t(en, vars, context)` or `context::English`); `name::X` is a name, never translated. Split: LIGHT, DARK, FROST, WINDOW, FULL, HOLD.
- **Labels inside sentences:** `{:LABEL}` is that label, translated in turn (57 sentences). `phrase()` marks a string for the catalogue; `english()` gives a key's English. `kit.js` `hint()` and `placeholder()`; a native tooltip is translated too.
- **The catalogue** writes notes (`// tr:`), names and each count's forms: 917 keys. The fragments the drafts could not translate are whole sentences.
- **The packs** were carried onto the new keys by script (no translation written); `tests/i18n-packs.node.mjs` checks plural forms and reports covered / missing / review per pack.

### The transport's sizes and work-bar form
- **BASINS' new sizes** (Josh, BASINS ui-fixes 8–11): the tempo 18 px (was 12), BPM / Hz 8 px (was 7), the pill sized to its number; play's glyph 32 px (was 20) in a 40 × 40 seat with no face and no ring; to-start is one of the round seats. COMPACT: play 22 px, the tempo 14 px.
- **`createTransport({ bar: 'work' })`**: the transport inside a work bar (BASINS' timeline-mounted form): 52 px tall, its seats the bar's button face at 34 × 34. `BARS`, `BAR_SEATS`.
- Fixed: two bars on one page shared one paint job.

### The notice
- `notice()` is BASINS' toast by default (above); NEBULA's corner stack is `seat: 'corner'`; `offset` lifts the toast clear of a transport bar. 14 `--toast-*` tokens. FOLDERS and the boot card speak through it.
- **Apps can delete:** BASINS' `toast()` and `#toast`.

### Keys and the history list
- **Keys can play over a control**: an action marked `overControls` runs even when a focused control owns its key, and the control gets neither the press nor its release (never in a text field unless `inFields`). BASINS' own Space handler can go.
- **The history list takes a host's tools**: `historyList(h, host, { tools: false, count: false })` leaves UNDO / REDO and the count to the host; `state()`, `onChange(fn)`, `historyState(h)`.

### The modulation window docked
- Docked, the right work bar ends at the last device (or the run's right edge when it overflows), as floating (BASINS: "so it doesn't hang").
- **A chip rail docked at the top or bottom sits tighter** (BASINS: "Reduce the padding on all the chips when docked"): each chip is its 48 px disc + `--rail-gap` along the rail, 8 px disc to disc where it was 21; the 62 px target across the rail is unchanged. `rail.setDock(dock)`; `createWindow` calls it, so every kit window's docked rail tightens.
- A status message is no longer overwritten by the idle hint on a language change.

## 1.5.0-alpha.4 — 2026-10-01 · the look in tokens, the starter and the skill, ten draft languages, FROST by default, the transport bar, one play

Not released: built on branch `worktree-mir-1.5`.

**Behaviour changes (read these first):**
- **The modulation window's play is now modulation's power** (one clock: the timeline owns the one play). The window never starts time; an app gives the user its own play (below).
- **The default tempo is 30 BPM** (`BPM_DEFAULT` in `mir/modulation/mod.js`, was 60). A saved rack keeps its own tempo.
- **New users start on FROST, dark.** FROST (refractive, frost always, BLUR 11, SATURATION 130 %, CORNERS 24, shadow on, disconnected off) is the GUI window's default preset; a user with saved look preferences keeps them.
- **CLASSIC's blur is 20 px, not 22**: the GUI window's BLUR range is now BASINS' 0–20.

### The look values are tokens
- **The house sheets' look is in tokens.** Every colour, shadow, radius, duration, easing, font size, weight, letter-spacing and look opacity in the kit's own sheets (`base.css`, `skin.css`, `shell.css`, `stage.css`, `core.css`, `window.css`, `pages.css`, `notes.css`, `gui.css`, `parts.css`, `info.css`, `fx.css`, `keyboard.css`, `folders.css`, `history.css`, `locales.css`) is a custom property holding today's exact value, declared in one `/* FROST · values */` block at the top of its sheet; the rules below read names only. 115 new names; `--knob-face` lands. Nothing was rounded or merged: proved neutral by stylehash on twelve gallery pages × theme × card × frost and on the lite and flat tiers (zero elements, zero pixels). The house sheets' look literals go from 151 to 5, each justified in `docs/SKINS.md` (new: where the look lives, the rules a skin follows, the themed names, the near-duplicates).
- **The modulation window's look is in tokens.** Every look literal in `modhost.css` and `modwindow.css` is one of 362 tokens in a `/* FROST · values */` block at the top of its sheet, with today's exact value; the five values `modwindow.js` wrote as SVG attributes are tokens too. Proved neutral with stylehash (eight configurations × eight states) and the plugin's browser tests. `docs/SKINS-MODULATION.md` lists the blocks, the exceptions and 30 near-duplicate pairs.
- **Two new token types**, `border` and `font-shorthand`, with their grammars in the format checker (`mir/core/envelope.js`, `docs/FORMAT.md`), so a skin may set the plugin's border and whole-font tokens.
- **How MIR names a look** (Josh, 2026-10-01): a **vanilla theme** is a named set of the built-in settings and nothing else (FROST, glassmorphism; MORPH, neumorphism, coming); anything that needs rules or art outside the settings is a **'name'-spec** MIR build or theme (METRO, SPRITES). The docs now use these words.
- **Apps can delete:** any rule that re-states a kit look value to change it: set the token instead (`docs/SKINS.md` gives the selector for each).

### The starter, LLM.md and the skill
- **`starter/`: the smallest whole MIR app**, to copy. A ring of dots drawn from four numbers on a 2D canvas, with the wordmark and FILE · EDIT · VIEW · WINDOW · ABOUT · LANGUAGE · GUI, a rack with two windows (one built only when first opened), the modulation window with an LFO routed onto SIZE, the notebook whose page 0 is `LLM.md` (shared, and the greeting on the picture), FOLDERS, a key table and its help view, a notice on save and the boot card. `app.js` is 161 lines; every section starts with a line saying what to change. `param(key, label, min, max)` makes a number a kit control and a modulation target.
- **`LLM.md`**: one page for a model that has never seen MIR: the one rule, how to start, the starter section by section, the builders, INTENT as do and don't, how to add each thing, skins and their checker, and the mistakes models make.
- **The `mir-builder` skill** (`skill/mir-builder/`, built by `node tools/make-skill.mjs` or `npm run skill` into `dist/mir-builder/`, never committed): `SKILL.md`, the kit, the starter, `LLM.md`, the docs, a static server, the envelope checker, and `check-app.mjs`, which loads an app headless and exits 0 only when it started with no console error. It refuses to build from a dirty kit unless `--allow-dirty`. Doc: `docs/LLM-MODS.md`.
- **`mir/core/describe.js`: what a visiting model can read.** `createDescribe({ app, rack, params, pages, keys, prefs, mod })` → `describe()` (the windows, every parameter with its range and value, the keys, and only the pages marked shared; also kept in a hidden `#mir-describe` element) and `dump()` (versions, look, layout, the cost meter, the last errors and input events, then `describe()`). It never carries what was typed into a field, nor an unshared page.
- `PROMPT.md` is superseded for starting a new app (a note at its top says so); Josh decides later whether to delete it.
- **Apps can delete:** a hand-written "about this app for the model" text, and any debug-dump code (the notebook's COPY DUMP takes `dump: () => d.dump()`).

### Ten draft translations
- All ten packs translate the whole catalogue: Spanish, French, Brazilian Portuguese and Indonesian; Simplified Chinese, Japanese and Russian; Hindi, Bengali and Modern Standard Arabic (`mir/locales/*.json`). Every pack stays `reviewed: false` (the menu shows DRAFT) until a native reader checks it. Latin-script labels keep their capitals with accents; in Hindi, Bengali and Arabic the control, DSP and modulation names stay in Latin capitals; `{placeholders}`, names, key caps, units and maths pass through.
- **`docs/LANGUAGES-GLOSSARY.md`**: the rules, the voice per language, and one table of terms with the ten columns.
- **`tests/i18n-packs.node.mjs`**: every pack parses, every key is in the catalogue, no value is empty or holds `<` or a control character, each keeps exactly its key's `{placeholders}`; coverage and over-long labels are reported, never failed.
- Known limits: no plural mechanism (counts are wrong for some n in Russian and Arabic); a few English keys carry two meanings (`LIGHT`, `FROST`, `WINDOW`, `FULL`) and need splitting (`docs/LANGUAGES.md` §12).

### FROST is the default; the tempo default is 30
- **The GUI window's presets are FROST · CLASSIC · LIGHT.** GLASS became FROST, Josh's recipe: BASINS' ABOUT GLASS (veil 0, saturation 130 %, bright, hue and tint 0, refractive, frost always) with BLUR 11, CORNERS 24 (maxed), SHADOW on, DISCONNECTED off. FROST is a vanilla theme: a named set of the built-in settings.
- The ranges match BASINS (BLUR 0–20, VEIL 0–60, SATURATION 0–200, CORNERS 0–24). MATERIAL gains **BRIGHT**, **HUE** (an arc in its own hue) and **TINT**, onto the kit's `--glass-tint` on `<body>`, as BASINS' `applyGlass` computes it. WHITE TEXT, GLASS CONTROL FACES and SHADOW as an amount are what FROST still wants (`docs/GUI.md`).
- **The default tempo is 30 BPM** (Josh: "Let 30BPM be the default"). Two tests that counted one beat a second from the default now set 60 out loud.
- **Breaking:** `LOOK_PRESETS.glass` is now `LOOK_PRESETS.frost` (an app that named `glass` must say `frost`).

### The transport bar: BASINS' design, parts an app lays out
- **`mir/shell/transport.js`, `transport.css`.** Josh, 2026-10-01: "Prefer BASINS … keep the Transports as they are per each app." The kit gives the parts and the look; the layout is the app's. Parts, each an exported builder: `playButton` (the one true play, on the app's timeline or main clock), `modPower` (BASINS' power ring: a press arms or disarms modulation, never plays), `modDoor` (the MIR mark: opens the modulation window), `tempoPill` (BASINS' 72 px BPM pill: drag by the digit under the pointer, the wheel, the arrows, Shift, pages; a click opens the tempo panel; a double click types it), `tempoPanel` (BASINS' CLOCK tiles: TAP, WALL/FREE, the bends, HOLD), `tapButton`, `latch` (a window's latch), `barButton`, `wayBack`, and `createTempo`. `createTransport({ layout })` assembles a bar from an ordered list of parts, groups and the app's own nodes; `BASINS_LAYOUT` is the default, `LAMBDAWAVES_LAYOUT` is λWAVES' bar from the same parts. The dock chip moves the bar into a rack window named TRANSPORT. Seats BOTTOM / TOP / COMPACT from ⠿. The dodge is the rack's. Doc: `docs/TRANSPORT.md`; page: `gallery/transport.html` (a switch flips the two layouts).
- **The opener law** (Josh: "Always basic Transport Bar as the main opener"): `createTransport({ opener: true })` first, `firstRun(store, …)`; on a first run only the bar is on screen. Under H on a touch screen the bar keeps its way back.
- **Customizable by the settings:** every look value is the kit's or an `--xport-*` token, so CARD STYLE, FROST, BLUR, CORNERS, RELIEF and the flat tier restyle the bar in both layouts. INTENT on BASINS' design: the resting pill stands proud (BASINS drew a well); the dock chip and the door wear no pane shadow. No poller (BASINS' 250 ms interval is gone); idle is zero frames.
- The transport's tokens use the prefix `--xport-*`, not `--tr-*`, which is the house's tracking prefix (`--tr-tight`, `--tr-wide`, `--tr-wider`).
- `rack.js`: `setHome(seat)` (the TOP seat; `dodgeSeat` takes a `home`) and `spec(id)` (a window's description, for the openers).
- **Apps can delete:** BASINS' `transport.js` bar (all but the macro rail), `transport-controls.js` / `.css`, `transport-dodge.js`, the stage and rack seats of `transport-placement.js`, the `#transport` rules in `skin.css` / `lab.css`; λWAVES' transport wiring in `lab/rack.js` §25 and its tempo pill and panel in `native-ui.js`; a NEBULA port's transport card and `modDodge`.

### Modulation: a power button, not a second play
- **Behaviour change: the modulation window's play button is now modulation's POWER button** (Josh, 2026-10-01: one clock; the timeline owns the one play, modulation has power). The work bar's first seat is BASINS' power (its halo, ring and stem; the ring opens when off), lit in accent B as BASINS draws it. A press bypasses or restores every route (`host.clock.setModulationEnabled`): off, every target returns to its base while the clock, the sources, the tempo and the HOLDs keep running; it never plays or pauses. The power is kept in the stored record and a reload never plays.
- **Breaking for an adopting app:** the window no longer starts time, so an app must give the user its own play (`mod.play(on)`). An app that used the window's play, or `arm` / `clock.setEnabled` to stop modulation, now gets a bypass that leaves time running.
- `bind.js`: `play(on)`, `togglePlay()`, `playing()`, `onPlay(fn)` (the app's one clock) and `power()`, `setPower(on)`, `togglePower()`, `onPower(fn)` (`arm` / `armed` / `onArm` stay as aliases). The transport's power button binds to them. `modwindow.js` exports `SVG_POWER`; `SVG_PLAY` / `SVG_PAUSE` stay exported and are no longer drawn by the window. `gallery/modulation.html` has the app's PLAY outside the window.

## 1.5.0-alpha.3 — 2026-10-01 · INTENT in the house, pages, the rack, languages, the GUI window, one portable file, keys, the shell parts, FOLDERS and the modulation window

Not released: built on branch `worktree-mir-1.5`. This entry is wave 3, joined.

### INTENT in the house sheets
- Every ledger row in `base.css`, `skin.css` and `shell.css` is fixed (`docs/INTENT.md`, its status column).
  - One light from above: the card float's upward term is gone. A floating window, the notebook, a carried window and every menu, tip and popover now cast down at their own height.
  - ON and CHOSEN are the frost face and a thin rim, never an accent fill. A switch's light is its LED; a trigger's is its label glow.
  - Pressed is the press wash and one `scale` (`--state-press-scale: .96`). Hover is a lighter face (and a 1 px lift on what stands proud), never ink alone or a ring. Keyboard focus is one accent ring outside, on `:focus-visible`, for every control the kit builds. Disabled is one fade (`--state-disabled: .38`) with no relief.
  - A modulation route is accent B. TINTED never blurs under FROST (the .58 thinning is gone); REFRACTIVE carries the blur. The menubar list wears CARD STYLE. The ⓘ panel and the control hint lost their seven `!important`s.
  - The rail chip follows its pane under FROST (`mir/window/window.css`). In LIGHT the ON chip face is now `hsl(0 0% 100% / .62)` (it was .086, invisible on a light card).
- **FROST · STILL holds a joined pane too.** While `body.frost-hold` is set, a REFRACTIVE pane (and its rail chip, and a disconnected window's body card) stops blurring and wears the tinted fill, the surface the lite tier gives it, so STILL differs from ALWAYS. Only the pixels of the hold change.
- New page `gallery/intent.html`: the INTENT vocabulary, live, drawn by the kit's own controls. New test `tests/intent.browser.mjs`.
- Removed: `--glass-shadow-flat` (read by nothing), the unread `--face-*` rows in `mir/tokens.json` (the 1.5 names are `--relief-*` and `--state-*`), and the duplicate `.sw.on`, `.trig.on`, `.seg-b.on`, `.k.live .k-needle`, `.dev.dragging` and disabled rules in `base.css`.
- `--state-focus` is an `outline` shorthand (a new token type), so it never has to be composed with a control's own relief.
- **Apps can delete:** any rule that undid the upward card shadow, re-flattened `.seg-b.on`, put a focus ring on kit controls, re-drew the accent fill on `.sw.on` / `.trig.on`, or turned off the tinted blur under FROST; any `!important` used to beat the ⓘ panel or the hint.

### The modulation sheets
- The plugin reads the 1.5 names (`--surface-*`, `--relief-*`, `--state-*`, `--label-*`) at the place of use with its 1.4 value as fallback, so the performance tier and a skin reach it. FLAT leaves no shadow in the plugin; LITE leaves no blur and gives its panes the tinted fill. Literals equal to a token became the token. Proved neutral by stylehash before the INTENT pass.
- The plugin keeps INTENT: ON is a frost face, a thin rim and an accent light (switches, LED switches, power, tempo, transport, the eight underline controls, + DEVICE); a chosen preset is the ON face with an accent glyph; hover is a lighter face (no ring); pressed is the press wash and one scale, no translate; the dial wears the house's raised relief; one pane height, the house's; no scrim behind the matrix dialog. Plates: `docs/plates/intent/plugin/`.
- Removed: `--glass-bevel` and its six lights `--gl-w`, `--gl-t`, `--gl-l`, `--gl-r`, `--gl-b`, `--gl-glow` (they drew nothing). `--m2-mat-shadow` is now the house height, declared once in `modhost.css`.
- **Apps can delete:** any rule that re-quoted the plugin's pane shadow, or turned off its hover ring or scrim.

### Pages, the notebook and the shelf
- `mir/shell/pages.js`: a project's pages as one pure model (a page is a `.md` file; `pages[0]` is the greeting). New: `beforeCapture(fn) → off`, called at the top of `capture()` (a hook that throws is isolated); the notebook registers its flush there, so a capture always has the last keystrokes.
- **The notebook gets pages.** `createNotebook({ pages })` shows them as tabs after YOURS: select, type, add, rename, delete with an inline yes/no, reorder by drag or Ctrl/⌘+←/→, the eye for `shared`, SHOW ON OPEN on the greeting, .MD export, IMPORT .MD, drop a .md, COPY TO SHELF / COPY TO PROJECT. Without `pages` the notebook is unchanged node for node. New sheet `mir/shell/pages.css`. Doc: `docs/NOTEBOOK.md`.
- **The shelf** (`mir/notes/`): λWAVES' mini file system as the notebook's own notes store (`shelf.js`, pure) and face (`face.js`, `notes.css`): folders, the recent five, SAVE / SAVE AS, .md export and import, rename, delete. A damaged store is mended, never thrown.
- **Apps can delete:** their own notes store and projects face (λWAVES' `renderProjects`), and any timer that flushed the notebook before saving.

### INFORMATIONAL
- `mir/info/page.js` shows PAGES: `parsePage(md)` (Obsidian callouts `> [!mir|anchor] Title` become labels on a feature, an `@place` or a `ui:control`), `showPage(layer, page, opts)` (one page at a time) and `greet(layer, pages)` (page 0 when the project should greet).
- Control anchors follow the element with `data-info~="name"`; a gone anchor hides its label and line; a page may sit bare or on a pane (`setPane`); `mir/info/seats.js` chooses which side of its anchor a label rests on, so lines stop crossing.
- `gallery/info.html` reads its words from `gallery/pages/*.md`.
- **Apps can delete:** any tour, guide or title-card code: a tutorial is just a page someone writes.

### The rack
- `mir/shell/rack.js` and `rack.css`: `createRack()`. Windows are registered by name and built on first open; the `+` menu has the SHIFT-queue and ☆ favourite layouts; `windowMenu()` gives the WINDOW menu; reorder, carry across, float and dock run through core pointer, motion and proximity, with the slot and the detach edge drawn; Escape and pointercancel roll back. One hide path, by transform and delayed visibility, that never fades a rack. Edge peek, the transport dodge, the edge handle, header keys, layout persistence through an injected store, the phone's one rack. Doc: `docs/RACK.md`; page: `gallery/rack.html`.
- **Apps can delete:** their own `rack.js` (BASINS: about 618 lines plus `createRackMotion` and about 85 CSS lines; each NEBULA port about 400–550 lines).

### Languages
- `mir/core/i18n.js`: `t('English')`. English is the key and the fallback; packs load on demand from `mir/locales/<tag>.json`; `setLanguage(tag)` writes `<html lang dir>`. Every kit label changes language live, without a reload, through `label()` / `ariaLabel()` in `kit.js`.
- The menubar, the ABOUT face, the chips' names, the hints, the notebook, the shelf, the window and rail names, the history list's domain and a window's OFF / COPIED caption all translate. A window's and a rail's accessible name is no longer upper-cased in script; the history domain's capitals are CSS (`var(--label-case, uppercase)`).
- `mir/shell/language.js`: the LANGUAGE menu (each language in its own name, DRAFT for an unreviewed pack). The pseudo-languages `qps` / `qps-rtl`. `tools/i18n-extract.mjs` writes the catalogue `mir/locales/en.json` (`npm run i18n`). Ten empty draft packs; no font is shipped.
- Right to left: `dir="rtl"` mirrors the chrome. The house sheets now draw their sides as logical properties (`inset-inline-start`, `padding-inline`, `margin-inline-*`, `text-align: start | end`, `border-inline-start`), so the mirror rules for the wordmark, the menu lists, a window's head and status and the notebook's quotes are gone from `locales.css`. In left to right nothing changed (stylehash: 0 pixels on `gallery/index.html` and `gallery/shell.html`).
- `mir/locales/locales.css` is in its own layer, `mir.kit.locale`, declared in `base.css`'s order statement.
- **Breaking:** `about.js` `gplLicence()` and `kitType()` return one sentence part `{ t, vars }`; a menubar entry takes a fifth element `{ raw, current }`; `openGroup(name)` takes the English group name; a window root's `aria-label` is its title as written, no longer upper-cased. Code must never upper-case translated text.
- **Apps can delete:** any lookup by a label's English text (use `data-menu`, `data-help-en`).

### The GUI window, prefs and fx
- `mir/shell/gui.js`, `gui.css`: the menubar's GUI group opens MIR OPTIONS (eight groups of kit controls with a live reading of what the look costs) and MIR ABOUT (the MIR logo, the version and skin, MIR's words, licences and credits). Nothing scrolls; at phone width the groups page sideways. Doc: `docs/GUI.md`; page: `gallery/gui.html`.
- `mir/core/prefs.js`: one store for browser preferences; a schema says how each option is applied; bad stored values are repaired; applying is one coalesced frame job.
- `mir/fx/pointer-light.js`, `parallax.js`, `fx.css`: the cursor glow and one pointer parallax, opt-in by `data-light` / `data-parallax`; off on touch, under reduced motion, in the flat tier and by switch.
- **The menubar on a phone wraps.** With seven groups the bar ran off a 390 px screen; it now gets the room from the wordmark to the edge, wraps onto a second row, and an opened list is shifted sideways to stay whole on the screen. The phone rack starts below the bar (menubar.js writes `--menubar-bottom` on `<html>`; rack.css reads it) (`tests/menubar-phone.browser.mjs`).
- **One version constant:** `mir/version.js` exports `MIR_VERSION`; the GUI window and the envelope read it, and `tests/version.node.mjs` holds it equal to `package.json`.
- **Apps can delete:** their own options window, preference store, cursor glow and parallax.

### The portable format
- `mir/core/envelope.js`: one envelope `{ mir: 1, kind, kit, app?, name?, made, data }` for settings, a skin, a project, a page and a spec, and one checker that never throws. A skin is checked against `mir/tokens.json` by a whitelist grammar per token type. The `outline` type has its grammar (a width, a style and a colour), so a skin may set `--state-focus`. A compact form for small carriers.
- `mir/core/png.js` carries the envelope in one `iTXt` chunk of any PNG; `mir/core/intake.js` is the one way in (drop, paste, picker). `node tools/check-envelope.mjs <file>` (`npm run check:envelope`). Doc: `docs/FORMAT.md`; page: `gallery/format.html`.
- **Apps can delete:** their own settings export/import and drop handlers.

### Keys and the keyboard window
- **`mir/shell/keys.js`: one key table.** An app declares its keyboard once (`{ id, label, group, keys, run, when, inFields }`); one `keydown` listener runs it. Chords are `event.code` with a fixed modifier order and `Mod` (⌘ on a Mac, Ctrl elsewhere). Rebinding steals and reports the loser; only the difference is saved (the shape of a spec envelope's `keys`). The table generates the menus' key column (`menuItem`, `menuKey`), control hints (`hints`, `aria-keyshortcuts`, and now the visible hint: `control-help.js` shows a control's `data-key-hint` after its words, untranslated), the help rows and a plain-data `describe()`. Doc: `docs/KEYS.md`.
- **`mir/keyboard/`: the KEYBOARD window**, λWAVES' design rebuilt untinted on the 1.5 window: the drawn ANSI board, the modifier badges, the two wells, the action list with search, the platform switch, RECORD and RESET, steal on conflict. Every drawn key is focusable and pressable; recording works from a tap on the board. **`createKeysHelp`**: the help view generated from the table. Page: `gallery/keyboard.html`.
- Removed: the dead λWAVES `#keymap` rules and `@keyframes km-pulse` in `base.css` (nothing in the kit builds a `#keymap` now).
- **Apps can delete:** their shortcut tables, keymap editors and every hand-written help dialog (λWAVES `lab/shortcuts.js`, `lab/keymap.js`).

### The shell parts
- The small parts every app wrote again, each taken from the app with the best one (`docs/SHELL-PARTS.md`, `gallery/parts.html`; sheet `mir/shell/parts.css`):
  - `shell/dialog.js`: `openDialog` / `confirmDialog`, a pane at menu height with no scrim; focus trapped and returned; Escape and a press outside dismiss when allowed; one at a time.
  - `shell/notice.js`: `notice(text, { kind, ms, action })`, stacked in one corner, a polite live region, leaving by itself, held by hover or focus; `guarded(fn)` turns a throw into an error notice.
  - `shell/busy.js`: the loading mark is the 3×3 diamond (`busyMark` inline, card, logo or pointer; `busyCursor`, `busyLogo`, `whileBusy`), moved by transform and opacity only, and nothing when stopped.
  - `shell/boot.js`: `bootCard({ name, steps })` with `step` / `done` / `fail(error, { retry })`; `explainBoot(error)` names no WebGPU, no adapter, a lost device, a file that did not load or an exception, in plain words; COPY DETAILS.
  - `shell/flash-guard.js`: a per-route limiter that holds a parameter to WCAG 2.3.1 (at most 3 flashes a second) and names what tripped it; the field judge; `photosensitivityNotice()` once per browser.
  - `shell/share-link.js`: a readable `#v=1&c=…` fragment of what differs from the defaults, CRC-checked, so a damaged link is null and never a throw.
  - `shell/settings-rows.js`: a settings panel from data with the kit's controls and the begin/end edit law (a sync never repaints a control under the hand); the kit's first select and number fields.
- **Apps can delete:** their hand-rolled `<dialog>`s and `window.confirm`, toast code, spinners, boot screens, flash limiters, share-link encoders and settings panels.

### FOLDERS
- **`mir/folders/`: BASINS' SAVE window, retitled and split.** `createFolders()` on the one window (rail, empty-glass drag, resize, motion, `onMoved` for the transport dodge); the project adapter (`createProjectAdapter`, default core/project.js parts; NEW is the empty project; a failed open rolls back and says so); BASINS' library store (`files.js`: the key an option, plus `overwrite`, and a library with a bad record is repaired instead of hidden); the gallery plus drag-to-folder with the proximity glow and MOVE TO for touch and keyboard; seeding once (`seed.js`); export as a `.mir` project envelope or a PNG that carries it; import by drop or OPEN FILE (another app's project is refused with the reason). Doc: `docs/FOLDERS.md`; page: `gallery/folders.html`.
- INTENT where BASINS' SAVE broke it: resting toolbar buttons are raised kit triggers (they were wells), tiles at rest are flat (they were sunk), a chosen tile wears the ON face with its name in accent A, pressed is the sink and scale, and the "save this first?" box lost its literal colours and `!important`.
- **A window persisted open opens one microtask after `createWindow` returns** (`mir/window/window.js`, `docs/WINDOWS.md`), so its `onOpen` can use the returned window. FOLDERS' guard for the old order is gone.
- **Apps can delete:** BASINS' `save-window.js` and its library code.

### The modulation window
- **The controller is importable.** `mir/modulation/window.js` (`createModulation(host, port)`) is λWAVES' 3,084-line `lab/modwindow.js`, taken whole into the kit, and `mir/modulation/bind.js` (`installModulation({ mount, params, … })`) is the app seam SOLEIL and NEBULA each wrote. Doc: `docs/MODULATION.md`; page: `gallery/modulation.html`.
- **It joins the window set.** Its chip rail is `window/rail.js`, its placement `windowLayout`, its drag `core/pointer.js`, its dock guide `createDockGuide` (the guide is the landing in every seat), and the landing and every relocation travel; open and close have motion. The resting window is unchanged (stylehash, 8 seats: 0 pixels); the grip is now a `<button>`.
- **It routes onto faders natively:** `.fd[data-param]` is a target; a routed fader wears a range bar and shows the modulated value. While a macro is dragged, routable controls glow by distance (core/proximity.js, accent B) and the one inside capture takes the drop.
- The preset key is an option (`mod.js setPresetKey(key)` / `presetKeyOf()`); the play dot is true after a resize or a paused change; the plugin's words go through `t()` (the CSS captions are `content: attr(data-cap)`, no `toUpperCase()`); the route badges, pop-over and arming marks are the kit's; `.k.has-ring > .k-dial` no longer slides 10 px left; the ON rim draws again (the plugin read `--state-on-rim` as a colour).
- **Apps can delete:** λWAVES' `lab/modwindow.js`, SOLEIL's and NEBULA's modulation seams, SOLEIL's invisible-knob overlay, and every app's `:root`-laddered route-badge rules.

## 1.5.0-alpha.2 — 2026-10-01 · one window, the first 1.5 tokens, words on the stage

Not released: the 1.5 line is built on branch `worktree-mir-1.5`. The plans are in Josh's vault (`MIR CLAUDE 1.5 PLAN 2026-10-01`, `MIR CLAUDE 1.5.X INFORMATIONAL + LLM PLAN 2026-10-01`).

- **`mir/window/`**: one floating window, one chip rail, one dock (`docs/WINDOWS.md`). No runtime CSS cloning; chips relocate by Shift-drag, long press and keyboard; the dock guide is the landing rect.
- **The chip rail is styled by hooks** (`data-mir-rail`, `data-mir-chip`), not by its English label; the chips' glyph attribute is `data-glyph`. **Breaking for an adopting app:** `docs/ADOPTING-1.5.md`.
- **The first 1.5 token names**, read at the place of use with the 1.4 name as the fallback (`--surface-*`, `--relief-*`, `--state-*`, `--label-*`), and **`data-ui-tier="lite" | "flat"`** (`docs/TIERS.md`).
- **Controls paint only what changed** (`kit.js` through `core/perf.js`).
- **`mir/history/`** (one undo ring and its list) and **`mir/core/project.js`** (project parts), lifted from BASINS.
- **`mir/info/`**: INFORMATIONAL's first page: floating text, a jointed line that is only ever flat, 45° or vertical, force between labels (`docs/INFORMATIONAL.md`, `gallery/info.html`). The notebook faces Spectral, Playfair Display and Alegreya SC are in `fonts/info/`.

## 1.5.0-alpha.1 — 2026-10-01 · the foundation

- **The base**: BASINS' four forked kit files and the timeline's `host.js` / `mod.js` work are in the kit.
- **The line guard**: `adopt.mjs` refuses to move an app onto another line without `--line` (`docs/LINES.md`). The 1.4 line is frozen as branch `mir-1.4.x` at `v1.4.3`.
- **Cascade layers**: the kit's sheets are in `@layer`s; an app's sheets beat them with plain selectors; 838 `:root` ladders are gone (`docs/LAYERS.md`). **Behaviour change:** the kit's `!important`s now beat an app's.
- **`mir/core/`**: frame, motion, pointer, proximity, perf (`docs/CORE.md`).
- **INTENT**: `docs/INTENT.md`, `mir/tokens.json`, `tools/lint-intent.mjs`.

## 1.4.3 — 2026-09-23 · editable sine at birth, double-click tension reset

- Fresh LFOs now start on the editable SINE preset. Explicit analytic waves and saved source modes are preserved.
- Double-clicking a tension handle resets it, alongside the existing right-click reset, for LFO and ENV hosts.

## 1.4.2 — 2026-09-21 · the FL curve workflow is a kit law

- Added `mir/modulation/curve-gesture.js`, the shared interpreter every modulation host now uses.
- Restored Image-Line's documented envelope controls: right-drag empty space adds and places a point; Shift-right-click adds at the curve's current value; left-drag moves a point; left-drag on the tension handle changes curvature; Ctrl gives fine tension control; right-click on a tension handle resets it; Alt-left-click deletes a point. A plain left click on empty curve is inert.
- Fixed the scaled-editor miss: pointer coordinates are converted from client pixels into the SVG viewBox before point/handle hit testing. Clicking a visible tension handle can no longer fall through as empty space and add a point.
- Deterministic analytic LFOs materialize their equivalent editable curve on the first edit. The editor no longer blocks behind “select a preset first.” S&H and DRIFT remain analytic because no single-cycle breakpoint curve represents them.
- `PROMPT.md`, the contract, API and adopted host contract state the law explicitly so a model cannot silently reintroduce the tap-to-add or preset-gate variants.
- `tests/curve-gesture.node.mjs` proves the coordinate transform, hit priority, full action matrix, point-axis locks, Ctrl-fine tension and analytic-wave mapping.

## 1.4.0 — 2026-09-16 · polish: the kit proves itself

MIR gets its own proofs, repairs the bugs its 2026-09-16 survey found, shows everything it has in a gallery that restyles nothing, and has docs that are MIR's.

Every change below was measured in throwaway copies of λWAVES and BASINS III re-adopted onto this kit (`tools/stylehash.mjs`: every visible element × theme × card × frost, λWAVES fully booted on the GPU). The results, and how they were checked:
- **λWAVES:** identical in all 8 default states, element by element and pixel by pixel. Two tokens change underneath (see *The accent follows the app*), and they show as soon as a switch is on.
- **BASINS:** identical except that its accent setting now works.
- **The shell:** still λWAVES' own in all 14 states (`tools/shell-parity.mjs`).
- **An independent verifier** re-ran every proof, mutated the kit under the tests (each mutation caught), and found the gaps fixed below before release.

### Fixed
- **The accent follows the app.** `--acc` was a literal (`#78e1f0`, and `hsl(188 70% 34%)` on light), and its soft tints were resolved once on `:root`. So:
  - an app that turned `--hue-acc` on `<body>` moved the derived tints but never `--acc` itself;
  - an app that wrote `--acc` never moved `--acc-soft` or `--acc2-soft`.

  Accents are now `hsl(var(--hue-acc) var(--sat-acc) var(--lum-acc))`, and B likewise with `--hue-acc2/--sat-acc2/--lum-acc2`. They and their soft tints are declared again on `<body>`, so they follow whatever the app writes there; an inline `--acc` still wins. The defaults are the house cyan to within one level of green.
  - **Visible in BASINS and NEBULA:** their ACCENT A setting now recolours the power lamps, the switch and trigger fills and every other accent. Measured in BASINS: rgb(120,225,240) → rgb(134,227,214), BASINS' own chosen accent.
  - **Visible in λWAVES, once it re-adopts (Josh's call):** the soft tints now follow λWAVES' own accent instead of the house cyan. That means the fill of a switch that is ON, the modulation button while live, the transport's mod buttons and the keymap's highlights: a switch turned on at boot fills with the palette's accent rather than cyan (measured). The default screens paint no soft tint, so they are identical.
  - **Breaking, for an app that writes accents on `<html>` or in a `:root` rule:** those are now shadowed by the `<body>` declaration and ignored. Write accents on `<body>`; λWAVES, BASINS and NEBULA already do, and hue tokens on `<html>` still work.
- **Help reopened on a click.** A mouse press closed a hover hint, and the press's own focus reopened it at once, against the law that a hand on a control closes the hint. Focus now shows a hint only to the keyboard (`:focus-visible`), and Tab still does.
- **The parts the kit builds are styled by the kit.** The CSS for the window status (`.dev-stat`), the formula (`.fx`), the ⓘ button and panel, the hover hint (`.control-help`) and the plane model lived only in λWAVES' sheets, so every other app got them unstyled: the gallery's status ran into its title, and a hint sat in the page flow. The rules are λWAVES', now at the end of `mir/css/skin.css`: 32 blocks, 28 byte for byte, 1 differing only in whitespace, 3 with their selector lists trimmed to the kit's parts. They duplicate, and so don't change, what λWAVES, BASINS and NEBULA already carry.
- **A disabled fader is disabled.** It no longer resets on a double-click, and it looks disabled (`.fd.disabled`, the knob's .38 / .3).
- **Undefined tokens.**
  - `--w-medium` (a typo for `--w-med`) is now `--w-med`: bold text in a window's ⓘ help is medium weight again.
  - `--line` (defined nowhere) is now `--glass-border-color`, in the parked macro matrix.
  - `tools/lint-tokens.mjs` now fails on any token read that nothing writes.
- **Motion tokens.** `--t-fast/--t-soft/--t-linger/--logo-turn` moved from `skin.css` to `base.css`, which reads them.
- **The fader caught up with the knob.**
  - `setBase(fn)` works (it was an empty stub), and so does `setDisabled(on)`.
  - A painted (modulated) fader or knob announces the hand's value in both `aria-valuenow` and `aria-valuetext`.
  - `log` with min ≤ 0 warns instead of silently turning linear.
- **The drag law round-trips.** `setKnobLaw` takes explicit `keyFine`, `faderFine` and `touchTravel`, so `setKnobLaw(setKnobLaw())` changes nothing. `dragTravel(event, { touch })` gives the law to a drag surface the kit did not build.
- **The plane model** is sharp at every device-pixel ratio. It repaints on a theme flip, when it used to hold the other theme's ink. An accent written inline on `<body>` is noticed on the next `paint()`, with no style resolution per frame, since λWAVES paints it every frame. `destroy()` releases its observers.
- **Leaks.** An ⓘ panel's document listener leaves once the panel has been in the page and left it.

### λWAVES names became options (defaults unchanged)
- `device({ loadingMark })`: an element, a selector, or `false`. Default: the wordmark's mark.
- `createWindowActivity({ rackIds, classes: { uiHidden, rackHidden, rackPeek } })`. This renames what window-activity reads; `shell.css` still hides the shell on `ui-hidden`.
- `setHelpClasses({ hintsOff })`, and `consolidateWindowHelp(root, { sources })`. `window-info-off` is a CSS contract name and stays as it is.
- **Not in this release:** an injectable preset key. `mod.js` is untouched, byte-identical to its vendored source, because λWAVES' `tests/mir.test.mjs` §16 proves those bytes and an adopt must not break λWAVES' gate. It waits for that gate to retire.

### Proofs and tools
- **`npm test` (`tests/run.mjs`)**, with no dependencies. Every suite passes:
  - the token lint;
  - `adopt.node.mjs` (17 assertions);
  - `registry.node.mjs` (19), `curve.node.mjs` (10), `host.node.mjs` (50) and `modulation-model.node.mjs` (20), ported from λWAVES' `tests/mir.test.mjs` with neutral fixtures;
  - `widgets.browser.mjs` (47, real pointer and keyboard);
  - `shell.browser.mjs` (the 19 shell probes).
- **`tools/stylehash.mjs`** is the neutrality proof: the "3 292-element computed-style hash" of 1.0.0, kept this time.
  - **What it captures:** every visible element including `<html>` and `<body>`, about 90 computed properties, boxes, `::before`/`::after`, and every custom property the page's sheets declare.
  - **Noise:** a second capture of the unchanged page masks noise per property and per pixel. With that mask, a pixel difference fails the run too.
  - **What it does not drive:** hover, focus or popovers (the other proofs cover those).
- **`tools/lint-tokens.mjs`:** every `var(--x)` the kit reads has a writer. Tokens left to the host are listed with their reason.
- **`tools/adopt.mjs` hardened:**
  - an unknown flag is an error (a mistyped `--check` used to copy), and so is a `--prefix` that is a flag or leaves the app;
  - files the kit no longer has are removed, and `--check` reports them as EXTRA along with a manifest that doesn't match the bytes;
  - `--dry-run` and `--prefix` are new, and a corrupt manifest is reported, not thrown;
  - the manifest records the kit commit, and adopting from uncommitted kit changes needs `--allow-dirty`;
  - files are replaced atomically;
  - the manifest keeps the shape λWAVES' `tests/mir-manifest.test.mjs` reads.
- **`tools/serve.mjs`:** a static server with no dependencies. `npm run gallery` no longer needs Python.
- **`tools/cdp.mjs`:**
  - every call has a deadline (`MIR_CDP_TIMEOUT`), so a GPU-wedged page fails a proof instead of hanging it;
  - `gpu: true` for an app that needs WebGPU;
  - it finds Chromium on the PATH;
  - a snap Chromium's profile goes where the snap can write it, and every browser is killed on exit.
- **`package.json`:** `"type": "module"`, and scripts for `test`, `gallery`, `lint:tokens`, `adopt`, `check`, `parity:shell` and `stylehash`.

### Gallery
`gallery/index.html` is rebuilt.
- **Seats:** theme, card style, frost, disconnected, and a **ground** seat: plain, or a busy coloured field (Sol's test: glass must hold over a picture).
- **Accents:** A, B and VIVID on the accent engine.
- **Tokens:** every colour, type size, spacing and radius.
- **Controls:** every control in every state (linear, log, wrap, stepped, modulated with its base tick, disabled, large; switches off and on; a latched trigger; faders linear, log, driven and disabled; readout states; the formula; badges).
- **Window states:** live, off, calculating, folded.
- **The glyph set, and the real modulation window**, built by `createModWindow` and not restyled.
- **Removed:** the gallery's own `.g-tile` overrides, which broke the one rule.

### Docs
- **New:**
  - `docs/API.md`: every export of every module.
  - `docs/CONTRACT.md`: load order, what the kit reads on `<body>`, the tokens an app may re-point, ids, events, storage.
  - `docs/PLUGIN-CONTRACT.md`: the socket TIMELINE plugs into, and what the vault already decided about it.
- **Corrected:** STYLE-LOCK, MOTION-LAW, ANTI-PATTERNS, REFERENCES and the modulation window's notes are now MIR docs. Their λWAVES provenance is kept, λWAVES rulings are labelled as such, and stale claims are corrected (the byte-frozen law, keyboard knobs "NOT built", the default card style, the accent defaults, the host-API claim).

### Readability is the app's (Josh, 2026-09-16)
*"Each app specific stuff should be fine. And readability is different for each app."*
- **The kit ships normal polarity:** dark ink on light, light ink on dark, as λWAVES reads.
- **An app sets its own ink in its own sheet.** BASINS, whose glass sits over the coloured Mandelbrot set, uses white text on light and black on dark (its `ink.css`, re-pointing the ink ladder, CONTRACT §4).
- **So no kit-wide ground axis.** The gallery's FIELD ground stays a way to look at glass over a busy picture, not a law.
- **The same goes for the faint `--ok`/`--warn` readouts on light cards:** an app that uses them re-points them.

## 1.3.0 — 2026-09-16 · the shell, from λWAVES

Josh named λWAVES the reference app for MIR's features. The first to come into the kit are the menubar the wordmark opens and the notebook glass with its ABOUT face. A fresh app on MIR now gets these, and the basics of an ABOUT page, without writing them.

- **`mir/shell/`** is new. It holds the wordmark, the menubar and the notebook, built from λWAVES' own DOM and CSS, node for node.
  - **`wordmark.js`** builds `#title`: an optional lead glyph (λWAVES' λ), the name in LW Title, the nine-square mark, and a hidden subtitle.
  - **`menubar.js`** provides `createMenubar({ opener, host, menus })`.
    - **Menus are data:** `FILE · EDIT · VIEW · WINDOW · ABOUT → [label<TAB>key, run, disabled, hint]`, where `disabled` is a boolean or a function.
    - **Open and close:** hovering the wordmark opens the bar; leaving the wordmark and the bar for 400 ms closes it. A press outside closes it, and so does Escape, which gives the wordmark its focus back (λWAVES wave 62).
    - **Keyboard:** it is a disclosure, not an ARIA menubar. A keyboard open focuses the first group, and every list is filled when it opens.
    - **Phone:** the bar is always shown, and crossing into the kit's `--phone` breakpoint shows and places it. A shown bar is placed again once the fonts have loaded and on resize.
    - **Teardown:** `destroy()` removes the bar and all its listeners.
  - **`notebook.js`** provides `createNotebook({ host, name, about, faces, render, … })`, the free glass.
    - **NOTES** keeps markdown and maths; Ctrl/⌘+Enter previews, and typing never reaches the app's keys except Ctrl/⌘+S and Ctrl/⌘+,.
    - **ABOUT** is the face described below. **App faces** each get a round button after ◐.
    - **Drags:** moving and resizing belong to the pointer that started them.
    - **Storage:** each face remembers its own size, and writes are debounced and flushed on pagehide.
    - **Teardown:** `destroy()` flushes storage, then removes the notebook and its listeners.
  - **`about.js`** provides `aboutFace(face, data)`, the ABOUT face built from data.
    - **Defaults every app gets** unless it says otherwise:
      - the GNU GPL v3.0-only notice, with LICENSE and NOTICE links (the paths are options, and NOTICE can be left out);
      - the kit's three typefaces with their SIL OFL 1.1 licences.
    - **Its own words:** version, tagline, copyright, special thanks, team, made-by, and a home link.
    - **Rich text without `innerHTML`.**
    - **Unsafe links dropped:** a link whose scheme could run code (`javascript:`, `data:`, …) is written as plain text, and an unsafe home link is not built.
  - **`accent.js`** provides `createAccent()`, λWAVES' accent engine.
    - **Accents:** A and B are two angles on a palette, with their lightness held to the theme and pushed toward neon by VIVID.
    - **The λ:** its colour is held to a 3 : 1 contrast floor against its ground.
    - **The mark:** its nine squares are painted from the palette wheel, with a TURN and a BUSY loop.
    - **Defaults:** λWAVES' own, A 30° and B 300°. Josh's law of 60° and 300° is one option away.
  - **`notebook-render.js`, `notebook-math.js`** are λWAVES' sanitised markdown and KaTeX renderer, copied verbatim.
  - **`vendor/`** holds marked 12.0.2 and KaTeX, both MIT licensed, KaTeX's fonts under the SIL OFL, with their licences. The notebook loads them the first time a preview asks, and only the halves the page has not already loaded, so an app that never previews never downloads them. `vendor: false` turns this off.
  - **`shell.css`** holds the shell's rules: 109 rules taken from λWAVES' `lab.css` and `skin.css` by `tools/extract-shell-css.mjs`, with declaration blocks byte for byte and in cascade order, plus one kit addition: an app-added face hides the notebook's title, as PROJECTS does. Re-running the extractor reproduces the sheet exactly.
    - **No rack gutter by default:** it keeps λWAVES' gutter for two racks, and an app with no racks sets `--rack-w: 0px`.
    - **Hands off the stage:** it sets nothing on html, body, #lab or #stage.
  - **`stage.css`** is optional: λWAVES' ground (#070a0f dark, #eef1f6 light) for an app that wants the stage the shell was drawn on.
- **`mir/palette.js`** is λWAVES' palette module, copied verbatim: OKLab, the WCAG contrast floor (`visibleInk`), the 256-entry lookup table, and the 23-palette catalogue.
- **`gallery/shell.html`** is a fresh app on the kit and nothing else. `?as=lambdawaves` fills it with λWAVES' words.
- **Proofs.**
  - **`tools/shell-parity.mjs`** drives λWAVES and `gallery/shell.html?as=lambdawaves` through 14 states and compares four things in each: computed styles (70 properties plus ::before/::after), each element's own text, each element's box, and the pixels.
    - **Desktop, light and dark:** FILE open, a real pointer hovering an item, NOTES, NOTES previewed with markdown, a table and maths, and ABOUT.
    - **Phone, light and dark:** idle, and ABOUT full screen.
    - **Result:** all four are identical in every state. It exits 1 on any difference, pixels included.
  - **Negative controls:**
    - a fresh app's words: 274 differences;
    - a hover-only rule: caught in the two hover states;
    - a (hover: none) rule: caught;
    - one changed word and a heading text-shadow: caught.
  - **`tools/shell-behaviour.mjs`** runs 19 probes of what a picture cannot show: hover, Escape and focus, J never typing into the notes, the rack gutter, the preview rendering, links served and unsafe links dropped, `destroy()`, and the phone bar and its placement.
  - **`tools/cdp.mjs`** is the dependency-free headless Chromium underneath. Every browser it starts is killed when the process exits, and it renders text in grayscale, because subpixel antialiasing follows the compositing layer, not the design.
  - **An independent verifier** re-ran the proofs, compared about 590 properties per element (0 differences), and found the gaps fixed above.
- **Known and left as λWAVES has it:** on a phone, the always-shown bar covers the notebook's round buttons when the notebook is full screen.
- **Not in this release.**
  - **The keyboard (keymap) editor:** Josh's call; its GUI is not ready.
  - **The PROJECTS face:** the file/folder system is its own to-do. `faces` is where it will plug in.
- **The look is FROST.** MIR has one skin today, FROST; skins are to come (see `README.md`).

## 1.2.0 — 2026-09-12 · published under the 1.1.3 label

The two commits after the 1.1.3 entry (f0ac335, 05155da) added API to `kit.js` without a version of their own. They are this release.

- **The drag law as defaults an app may retune.**
  - `setKnobLaw({ travel, fine })` sets the law: travel is 220 px for a full scale, fine is the Shift divisor on a drag (900/220 on a knob, 5 on a fader), and 1/fine is the Shift factor on an arrow step. It returns the law.
  - BASINS asked for Shift = ⅛ with `setKnobLaw({ fine: 8 })`.
  - Every knob and fader may also carry its own `travel` and `fine`.
- **`fader` catches up with the knob.**
  - `log` gives a log-scale fader for FREQ-shaped ranges.
  - `show(x)` and `shown` paint a modulated value over the base, adding the `.mod` class.
  - `paint` and `setDefault` are new.
  - The Shift-drag is now `dx / (width · fine)`, and arrow steps move in log space on a log fader.
- **Known, and not fixed here** (see the 2026-09-16 survey):
  - `setKnobLaw(setKnobLaw())` does not round-trip.
  - A fader's Shift-drag (⅕) and Shift-arrow (¼) disagree.
  - The fader's `setBase` is an empty stub.
  - The modulation window's own dials do not read the law.

## 1.1.3 — 2026-09-11

- The tinted pane wears the glass opacity again (.84 dark / .86 light). While FROST is in force it thins to
  .58 so the blur can be seen through it; when the policy lifts (frost-hold) it is a full pane again.

## 1.1.2 — 2026-09-11

- `fader`: the fine (Shift) drag reads its rect once per drag, not once per move.
- `modhost.css`: two dead rules from the audio device's old cycling design removed (a trace rule for a device
  that never builds one; a selected/unselected split carrying one declaration).

## 1.1.1 — 2026-09-11

- `knob`: a modulated knob keeps its base visible — a short accent tick at the rim marks the hand's number
  under the dancing needle (Bitwig's convention: modulation shows over the setting, it does not hide it).

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
  `moveMacro`, `rebuildMacros`) so a second face can reuse them. *(Corrected in 1.4.0: those five live in
  λWAVES' own `lab/modwindow.js` host controller, not in MIR; the kit ships the window's builders.)*
- The dot grip (`gripDots`, 3 × 3 on a 5-px pitch) is the one *drag me* mark: rack window headers, the rail's
  reorder handle, the transport's macro tiles, the modulation device cards. The four-way cross is *route me*.
- `tools/adopt.mjs` copies the kit into an app and writes `MIR-MANIFEST.json`; `--check` reports drift.
