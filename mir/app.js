/* mir/app.js — THE STANDARD WIRING, as one call.  createApp() is the checklist every MIR app wrote by hand at the top of
 * its app.js (the starter's first hundred lines), in the order the kit needs, and nothing else.
 *
 *   const app = await createApp({ name: 'TETRIS', key: 'tetris', version: '0.1.0', stage, state: S, present: kick });
 *   const speed = app.param('speed', 'SPEED', 0, 2);        // a kit knob, a modulation target, a saved value
 *
 * THE LAWS IT KEEPS
 *   1. THIN.  Every piece is the kit's own constructor, called with the options an app would pass, in this order:
 *      a first run? · the rack (and its float layer) · the look (accent, GUI) · the language · the key table ·
 *      modulation · the one clock and the transport bar · the parameters · the pages · the notebook · FOLDERS ·
 *      INFORMATIONAL and its greeting · the keys' help view · the menus · the hints and the pressed look · describe.  It adds no behaviour of its own; read the function below as the checklist.
 *   2. EVERY PIECE IS OPTIONAL AND STILL YOURS.  Pass `false` to leave one out (`folders: false`), an object to add
 *      options to its constructor (`rack: { favourites: 4 }`), and build any piece by hand instead: each is returned.
 *   3. ONE CLOCK.  The transport's ▶ (and Space) is the app's ONE play; modulation's power only bypasses the routes
 *      (docs/MODULATION.md, "One clock").  The clock is modulation's own unless the app passes its own (`clock`).
 *   4. THE BAR IS THE OPENER.  On a first run (nothing saved) every window stays closed and the bar is all there is:
 *      register rack windows with `open: !app.first` (docs/TRANSPORT.md, the opener law).
 *   5. THE KIT'S WINDOWS TAKE THE POINTER IN THE KIT'S OWN FLOAT LAYER (the rack's `#floats`): an app writes no
 *      window layer and no pointer-events rule for one.
 *
 * makeParam(o) is the one function that makes a number a kit control, a modulation target and a saved value; app.param()
 * is it with the app's state and modulation filled in. */
import { el, knob } from './kit.js';
import { installPress } from './core/pointer.js';
import { registerProjectPart } from './core/project.js';
import { createDescribe } from './core/describe.js';
import { frame } from './core/frame.js';
import { installControlHelp } from './control-help.js';
import { wordmark } from './shell/wordmark.js';
import { createMenubar } from './shell/menubar.js';
import { createAccent } from './shell/accent.js';
import { createNotebook } from './shell/notebook.js';
import { gplLicence, kitType } from './shell/about.js';
import { createPages } from './shell/pages.js';
import { createRack } from './shell/rack.js';
import { createGui } from './shell/gui.js';
import { createKeys, localKeyStorage } from './shell/keys.js';
import { createTransport, firstRun, rackOpeners, transportActions } from './shell/transport.js';
import { createKeysHelp } from './keyboard/keyboard.js';
import { languageMenu, startLanguage } from './shell/language.js';
import { notice } from './shell/notice.js';
import { installModulation } from './modulation/bind.js';
import { createFolders } from './folders/folders.js';
import { createInfoLayer, infoActions } from './info/layer.js';
import { greet } from './info/page.js';

/** the controls installPress gives the pressed look (core/pointer.js) */
export const PRESSABLE = '.sw, .seg-b, .trig, .tbtn, .mir-rack-btn';
const FONTS = new URL('../fonts/', import.meta.url).href, LICENSE = new URL('../LICENSE', import.meta.url).href;
const opt = (v) => (v && typeof v === 'object' ? v : {});

/**
 * makeParam({ state, key, label, min, max, map, mod, onChange, id, make, …widget }) → the parameter
 *   One number, `state[key]`, becomes a kit control (`make`, default knob; fader works too), a modulation target (when
 *   `mod` is given; id 'app.<key>' unless `id`) and a saved value.  `map` is the target's map (linear · log · wrap ·
 *   integer · bipolar) and sets the widget's own option for it (log, wrap; integer rounds the shown value).
 *   THE HAND LAW: a hand on a routed control moves the route's base; otherwise it writes the number.
 *   → { id, key, label, min, max, map, widget, root, get(), value(), set(v), home, remove() }
 *     get()    the number now (the modulated reading while a route drives it)
 *     value()  THE BASE: what the hand set, never the modulated reading — what a project saves
 *     set(v)   as a hand would: the base while routed, else the number
 *     remove() the control stops being a target, and its routes go
 */
export function makeParam({ state, key, label = String(key).toUpperCase(), min = 0, max = 1, map = 'linear', mod = null, onChange = null,
  id = 'app.' + key, make = knob, unit = '', hint = '', ...more }) {
  const get = () => state[key];
  const put = (v) => { state[key] = v; if (onChange) onChange(key, v); };
  const shaped = { ...(map === 'log' ? { log: true } : {}), ...(map === 'wrap' ? { wrap: true } : {}), ...(map === 'integer' ? { fmt: (v) => String(Math.round(v)) } : {}) };
  const widget = make({ label, min, max, value: get(), unit, ...shaped, ...more,
    onInput: (v) => { if (!(mod && mod.hand(id, v))) put(v); if (more.onInput) more.onInput(v); } });
  widget.root.dataset.info = key;                                   // a page's `ui:<key>` label points here
  const home = get();
  const off = mod ? mod.add({ id, label, unit, hint, min, max, map, get, set: put, widget }) : null;
  const routed = () => !!(mod && mod.isModulated(id));
  return {
    id, key, label, unit, min, max, map, widget, root: widget.root, home, get,
    value: () => (routed() ? mod.baseOf(id) : get()),
    set(v) { widget.set(v); if (!(mod && mod.hand(id, v))) put(v); },
    remove: () => { if (off) off(); },
  };
}

/**
 * createApp(options) → Promise<app>
 *   name, key      the app's name (the wordmark, ABOUT) and the prefix of every store it keeps (default: name, lower case)
 *   version, what  for ABOUT and describe()
 *   stage          the element the picture is in (the notebook and the words sit on it); host: where the chrome goes
 *                  (default the stage's parent)
 *   state, present the numbers app.param() reads and writes, and "draw again" (called when one changes)
 *   clock          the ONE play's clock { play, pause, isPlaying, onChange } (default: modulation's own)
 *   keys           the app's own key rows (createKeys actions), ahead of the kit's
 *   menus          { FILE, EDIT, VIEW, WINDOW, … } rows that replace or add to the kit's menus (functions or arrays)
 *   pages          rows to add to the pages ({ title, md, shared }); page 0 is the greeting
 *   subject        INFORMATIONAL's subject: () → { left, top, width, height } in stage pixels
 *   thumbnail      () → the canvas FOLDERS takes a project's picture from
 *   about          extra ABOUT options (tagline, copyright …); sub: the line under the wordmark
 *   and one entry per piece — gui, transport, rack, mod, notebook, folders, info, greet, help, menubar, describe —
 *   each `false` to leave it out, or an object of extra options for its constructor.
 *   → { first, param, params, playing, rack, keys, gui, accent, transport, mod, pages, notebook, folders, info,
 *       greeting, help, menubar, describe, floats }
 */
export async function createApp(o = {}) {
  const name = o.name || 'APP', key = o.key || String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const stage = o.stage, host = o.host || stage.parentElement, state = o.state || {};
  const present = () => { if (o.present) o.present(); };
  const want = (piece) => o[piece] !== false;
  let tr = null, rack = null, mod = null, notebook = null, folders = null, info = null, help = null;

  /* 0. A FIRST RUN?  Asked before anything is saved: nothing stored → every window stays closed (the opener law) */
  const first = firstRun(key + '.transport', key + '.rack', key + '.modulation');

  /* 1. THE RACK and the bar's element (the rack seats the bar and gives the kit's windows their float layer, #floats).
        The rack builds nothing before the first frame, so the look below is still applied before anything draws.  With
        the bar, the rack shows no + and ☆ of its own: the bar's latches open the windows (as gallery/transport.html) */
  const bar = want('transport') ? el('div', '', host) : null;
  if (bar) bar.id = 'transport';
  if (want('rack')) rack = createRack({ host, key: key + '.rack', transport: bar, favourites: 0, ...(bar ? { chrome: false, handle: 'always' } : {}), ...opt(o.rack) });
  const floats = rack ? rack.el.floats : el('div', 'mir-rack-floats', host);
  const moved = (r) => (tr ? tr.moved(r) : rack ? rack.dodge(r) : null);

  /* 2. THE LOOK: the GUI window applies the stored theme, accent and glass */
  const accent = createAccent();
  const gui = want('gui') ? createGui({ host: floats, app: { name }, accent, about: { fonts: FONTS }, ...opt(o.gui) }) : null;

  /* 3. THE LANGUAGE the user chose, before the first label is drawn */
  await startLanguage();

  /* 4. THE KEYS, once, as data: the app's rows first (a chord held twice runs the first), then the kit's */
  const keys = createKeys({ storage: localKeyStorage(key + '.keys'), actions: [...(o.keys || []),
    ...(bar ? transportActions(() => tr) : []),
    { id: 'save', label: 'SAVE', group: 'FILE', keys: ['Mod+S'], inFields: true, run: () => folders && folders.save() },
    { id: 'folders', label: 'FOLDERS', group: 'WINDOW', keys: ['F'], run: () => folders && folders.toggle() },
    { id: 'modulation', label: 'MODULATION', group: 'WINDOW', keys: ['M'], run: () => mod && mod.toggle() },
    { id: 'notebook', label: 'NOTEBOOK', group: 'WINDOW', keys: ['J'], run: () => notebook && notebook.toggle() },
    { id: 'help', label: 'KEYS', group: 'WINDOW', keys: ['?'], run: () => help && help.toggle() },
    ...(want('info') ? infoActions(() => info) : []),
  ] });

  /* 5. MODULATION: the window and its seam.  Targets arrive through app.param(), a lazily built window's when it is built */
  if (want('mod')) mod = installModulation({ mount: floats, params: [], present, storageKey: key + '.modulation', presetKey: key + '.modpresets', moved, ...opt(o.mod) });

  /* 6. THE ONE CLOCK and THE TRANSPORT BAR, the main opener: ▶ (and Space) plays; the power ring is modulation's */
  const clock = o.clock || (mod ? { play: () => mod.play(true), pause: () => mod.play(false), isPlaying: () => mod.playing(), onChange: (fn) => mod.onPlay(fn) } : null);
  const openers = () => [...(rack ? rackOpeners(rack)() : []),
    ...(folders ? [{ id: 'folders', label: 'FOLDERS', glyph: 'folder', action: 'folders', open: () => folders.open(), close: () => folders.close(), isOpen: () => folders.isOpen() }] : [])];
  if (bar) tr = createTransport({ root: bar, host, clock, mod, keys, rack: () => rack, key: key + '.transport', opener: true, openers, ...opt(o.transport) });

  /* 7. THE PARAMETERS: app.param() makes each; one project part saves their bases */
  const params = [];
  function param(k, label, min, max, more = {}) {
    const p = makeParam({ state, key: k, label, min, max, mod, onChange: present, ...more });
    const i = params.findIndex((q) => q.id === p.id); if (i >= 0) params[i] = p; else params.push(p);
    known.add(p.key);
    const remove = p.remove;
    p.remove = () => { remove(); const j = params.indexOf(p); if (j >= 0) params.splice(j, 1); };
    return p;
  }
  /* one project part: each parameter's base.  A key a lazy window has not made yet is kept as the number in `state`,
     which the control reads when it is made.  NEW (restore(null)) puts each back home. */
  const known = new Set();
  registerProjectPart('params', {
    capture: () => ({ ...Object.fromEntries([...known].map((k) => [k, state[k]])), ...Object.fromEntries(params.map((p) => [p.key, p.value()])) }),
    restore: (v) => {
      for (const [k, x] of Object.entries(v || {})) if (Number.isFinite(x) && !params.some((p) => p.key === k)) { known.add(k); state[k] = x; }
      for (const p of params) p.set(v && Number.isFinite(v[p.key]) ? v[p.key] : p.home);
      present();
    },
  });

  /* 8. THE PAGES: page 0 is the greeting; they ride in the project */
  const pages = createPages();
  for (const row of o.pages || []) pages.add(row);
  registerProjectPart('pages', pages.part());

  /* 9. THE NOTEBOOK (J): the pages, ABOUT, the dump */
  let describe = null;
  if (want('notebook')) notebook = createNotebook({ host: stage, name, storageKey: key + '.notebook', keyLabel: 'J', pages,
    about: { version: o.version || '', licence: gplLicence(name, { license: LICENSE, notice: null }), type: kitType([], FONTS), ...opt(o.about) },
    onLogo: () => accent.paintMarks(), dump: () => (describe ? describe.dump() : ''), ...opt(o.notebook) });

  /* 10. FOLDERS: SAVE, OPEN, NEW, export — every registered project part, for free */
  if (want('folders')) folders = createFolders({ host: floats, app: key, store: key + '.folders', rack,
    adapter: o.thumbnail ? { thumbnail: o.thumbnail } : {}, onMoved: moved,
    say: (text, warn) => notice(text, { kind: warn ? 'warn' : 'ok' }), ...opt(o.folders) });

  /* 11. INFORMATIONAL: words on the picture; the greeting is page 0's first part */
  if (want('info')) info = createInfoLayer({ stage, subject: o.subject || null, keys, ...opt(o.info) });
  const greeting = info && want('greet') ? greet(info, pages, { first: true, ...opt(o.greet) }) : null;

  /* 12. THE KEYS' HELP VIEW (?) and THE MENUS: data; WINDOW from the rack, LANGUAGE from the kit, keys from the table */
  if (want('help')) help = createKeysHelp({ keys, host: floats });
  const k = (id) => keys.menuItem(id);
  const M = o.menus || {};
  const menus = {
    FILE: M.FILE || (() => [k('save'), ['NEW', () => folders && folders.fresh()], k('folders')]),
    ...(M.EDIT ? { EDIT: M.EDIT } : {}), ...(M.VIEW ? { VIEW: M.VIEW } : {}),
    WINDOW: M.WINDOW || (() => [...(rack ? rack.windowMenu() : []), null, k('modulation'), k('notebook'), k('help')]),
    ...Object.fromEntries(Object.entries(M).filter(([g]) => !['FILE', 'EDIT', 'VIEW', 'WINDOW', 'ABOUT', 'LANGUAGE', 'GUI'].includes(g))),
    ABOUT: M.ABOUT || (() => [['ABOUT ' + name, () => notebook && notebook.open('about')]]),
    LANGUAGE: M.LANGUAGE || languageMenu(),
    GUI: M.GUI || (() => [['MIR OPTIONS', () => gui && gui.open('options')], ['MIR ABOUT', () => gui && gui.open('about')]]),
  };
  const menubar = want('menubar') ? createMenubar({ opener: wordmark(stage, { word: name, sub: (o.about && o.about.sub) || 'AN MIR APP' }), host, menus, ...opt(o.menubar) }) : null;

  /* 13. THE HINTS (every [data-key-action] shows its key, a lazily built window's too), the control help, the pressed
         look, the accent on the marks */
  const hints = () => frame.coalesce(key + ':hints', () => keys.hints(document));
  hints(); keys.onChange(hints); document.addEventListener('devopen', hints);
  installControlHelp(document);
  installPress({ selector: PRESSABLE });
  accent.apply();

  /* 14. DESCRIBE: what a visiting model can read */
  if (want('describe')) describe = createDescribe({ app: { name, version: o.version || '', what: o.what || '' }, rack, params: () => params, pages, keys,
    prefs: gui ? gui.prefs : null, mod, transport: tr, ...opt(o.describe) });

  return { name, key, first, param, params, playing: () => !!clock.isPlaying(), clock,
    accent, gui, keys, transport: tr, rack, mod, pages, notebook, folders, info, greeting, help, menubar, describe, floats };
}
