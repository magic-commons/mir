/* starter/app.js — THE STARTER: the smallest whole MIR app.  ../LLM.md explains it section by section.
 * To make your own: copy this folder beside the kit (../mir, ../fonts), rename APP, replace draw() and the numbers
 * in S, and keep everything else.  The one rule: the kit draws every control; you pass it data and options. */
import { el, knob, fader, sw, seg, trig } from '../mir/kit.js';
import { frame } from '../mir/core/frame.js';
import { installPress } from '../mir/core/pointer.js';
import { registerProjectPart } from '../mir/core/project.js';
import { createDescribe } from '../mir/core/describe.js';
import { installControlHelp } from '../mir/control-help.js';
import { wordmark } from '../mir/shell/wordmark.js';
import { createMenubar } from '../mir/shell/menubar.js';
import { createAccent } from '../mir/shell/accent.js';
import { createNotebook } from '../mir/shell/notebook.js';
import { gplLicence, kitType } from '../mir/shell/about.js';
import { createPages } from '../mir/shell/pages.js';
import { createRack } from '../mir/shell/rack.js';
import { createGui } from '../mir/shell/gui.js';
import { createKeys, localKeyStorage } from '../mir/shell/keys.js';
import { createKeysHelp } from '../mir/keyboard/keyboard.js';
import { languageMenu, startLanguage } from '../mir/shell/language.js';
import { notice } from '../mir/shell/notice.js';
import { installModulation } from '../mir/modulation/bind.js';
import { createFolders } from '../mir/folders/folders.js';
import { createInfoLayer } from '../mir/info/layer.js';
import { greet, showPage } from '../mir/info/page.js';

// ── THE NAME: APP names every store in this browser, so two apps never share one. Change both. ──
const APP = 'starter', NAME = 'STARTER';
const $ = (id) => document.getElementById(id);
const lab = $('lab'), stage = $('stage'), windows = $('windows');

// ── THE LOOK: the GUI window (menu GUI) applies the user's stored look before anything draws. Leave it first. ──
const accent = createAccent();
const gui = createGui({ host: windows, app: { name: NAME }, accent, about: { fonts: '../fonts/' } });
await startLanguage();

// ── THE PICTURE: a 2D canvas drawn from the numbers in S. Replace draw() with your game; keep the loop. ──
const S = { speed: 0.5, size: 0.6, hue: 200, count: 7, play: true, shape: 'dot' };
const HOME = { ...S };
const canvas = $('picture'), g = canvas.getContext('2d');
let turn = 0, last = 0;
function draw() {
  const dpr = devicePixelRatio || 1, w = stage.clientWidth, h = stage.clientHeight;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = document.body.dataset.theme === 'light' ? '#eef1f6' : '#070a0f'; g.fillRect(0, 0, w, h);
  const n = Math.round(S.count), R = Math.min(w, h) * 0.17 * S.size, r = Math.max(4, R * 0.18);
  for (let i = 0; i < n; i++) {
    const a = turn * Math.PI * 2 + (i / n) * Math.PI * 2, x = w / 2 + Math.cos(a) * R, y = h / 2 + Math.sin(a) * R;
    g.fillStyle = `hsl(${(S.hue + i * (360 / n) * 0.25) % 360} 80% 60%)`;
    if (S.shape === 'square') g.fillRect(x - r, y - r, 2 * r, 2 * r); else { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  }
}
/* the loop runs through the kit's one frame (core/frame.js), and only while PLAY is on: idle costs nothing */
function loop(now) {
  if (S.play) { turn += ((last ? now - last : 0) / 1000) * S.speed; last = now; frame.coalesce(APP + ':loop', loop); } else last = 0;
  draw();
}
const kick = () => frame.coalesce(APP + ':loop', loop);
addEventListener('resize', kick); kick();

// ── THE PARAMETERS: param() makes one number a kit control AND a modulation target. One call per number. ──
let mod = null;
const params = [];
function param(key, label, min, max, make = knob, more = {}) {
  const id = 'scene.' + key;
  /* the hand law: on a routed control the hand moves the route's base (mod.hand); otherwise it writes the number */
  const widget = make({ label, min, max, value: S[key], ...more, onInput: (v) => { if (!(mod && mod.hand(id, v))) { S[key] = v; kick(); } } });
  widget.root.dataset.info = key;                                     // a page's `ui:<key>` label points here
  params.push({ id, key, label, min, max, map: more.map || 'linear', get: () => S[key], set: (v) => { S[key] = v; kick(); }, widget });
  return widget;
}
const speed = param('speed', 'SPEED', 0, 2);
const size = param('size', 'SIZE', 0.1, 1);
const hue = param('hue', 'HUE', 0, 360, knob, { map: 'wrap', wrap: true, fmt: (v) => Math.round(v) + '°' });
const count = param('count', 'COUNT', 3, 24, fader, { map: 'integer', fmt: (v) => String(Math.round(v)) });

// ── THE RACK: windows by name. `build` runs the first time a window opens, so PLAY costs nothing until then. ──
const rack = createRack({ host: lab, key: APP + '.rack', favourites: 0 });
rack.register({ id: 'picture', title: 'PICTURE', side: 'right', open: true, hint: 'the four numbers the picture is drawn from',
  build(body) { el('div', 'row', body).append(speed.root, size.root, hue.root); body.append(count.root); } });
let playSwitch = null;
rack.register({ id: 'play', title: 'PLAY', side: 'left', hint: 'built the first time it opens',
  build(body) {
    playSwitch = sw({ label: 'PLAY', value: S.play, onChange: (v) => setPlay(v) });
    playSwitch.root.dataset.keyAction = 'play';                         // its hint shows the key from the key table
    el('div', 'row', body).append(playSwitch.root, trig({ label: 'RESET', title: 'every number back home', onFire: () => setScene(HOME) }).root);
    body.append(seg({ label: 'SHAPE', value: S.shape, options: [{ id: 'dot', label: 'DOTS' }, { id: 'square', label: 'SQUARES' }],
      onChange: (v) => { S.shape = v; kick(); } }).root);
  } });
rack.start();
function setPlay(on) { S.play = !!on; if (playSwitch) playSwitch.set(S.play); kick(); }
function setScene(v) { for (const p of params) { const x = v[p.key] ?? HOME[p.key]; p.widget.set(x); if (!mod.hand(p.id, x)) p.set(x); } }

// ── MODULATION: one call, and every parameter above is a target. On a first visit an LFO drives SIZE. ──
mod = installModulation({ mount: windows, params, present: kick, storageKey: APP + '.modulation', presetKey: APP + '.modpresets', moved: (r) => rack.dodge(r) });
if (!mod.M.routeList().length) {
  const lfo = mod.M.sourceList().find((s) => s.kind === 'lfo'), [macro] = mod.M.macroList();
  mod.M.setMacro(macro.id, { sourceId: lfo.id });
  mod.M.addRoute(macro.id, 'scene.size', 0, 0.35);
  mod.host.clock.recomputeRunning(); mod.view.rebuild();
}
mod.host.clock.setPlaying(true);

// ── THE PAGES: page 0 is LLM.md, shared, so a person reads it as the greeting and a model reads it through the app. ──
const pages = createPages();
pages.add({ title: 'LLM', md: await (await fetch('../LLM.md')).text(), shared: true });
pages.add({ title: 'Try this', md: '## Try this\nDrag a knob in PICTURE. Press M for the modulation window.\n\n> [!mir|ui:size] SIZE\n> An LFO is driving this knob. Drag it: you move the centre of its swing.' });
registerProjectPart('pages', pages.part());
const notebook = createNotebook({ host: stage, name: NAME, storageKey: APP + '.notebook', keyLabel: 'J', pages,
  about: { version: '0.1.0', tagline: 'A ring of dots on MIR: the smallest whole app, to copy.', copyright: '© 2026',
    licence: gplLicence(NAME, { license: '../LICENSE', notice: null }), type: kitType([], '../fonts/') },
  onLogo: () => accent.paintMarks(), dump: () => describe.dump() });

// ── INFORMATIONAL: words on the picture. The greeting is page 0's first block (a long page would fill the screen). ──
const ring = () => { const w = stage.clientWidth, h = stage.clientHeight, R = Math.min(w, h) * 0.2; return { left: w / 2 - R, top: h / 2 - R, width: 2 * R, height: 2 * R }; };
const info = createInfoLayer({ stage, subject: ring });
const firstBlock = (p) => ({ ...p, md: p.md.split(/\n---\n/)[0] });
greet(info, { shouldGreet: () => pages.shouldGreet(), greeting: () => firstBlock(pages.greeting()) });
const pageNow = () => pages.get(notebook.selected) || pages.list()[1];

// ── FOLDERS: the project window. A project part is anything with capture/restore; SAVE, OPEN, NEW and export come free. ──
registerProjectPart('scene', {
  capture: () => Object.fromEntries(params.map((p) => [p.key, mod.isModulated(p.id) ? mod.baseOf(p.id) : p.get()])),
  restore: (v) => setScene(v || HOME),
});
const folders = createFolders({ host: windows, app: APP, store: APP + '.folders', adapter: { thumbnail: () => canvas },
  firstSeat: () => ({ x: Math.round(innerWidth / 2 - 190), y: 64 }),                // clear of the racks at the edges
  onMoved: (r) => rack.dodge(r), say: (text, warn) => notice(text, { kind: warn ? 'warn' : 'ok' }) });

// ── THE KEYS: the keyboard, once, as data. The menus' key column, the hints and the help view come from this table. ──
const keys = createKeys({ storage: localKeyStorage(APP + '.keys'), actions: [
  { id: 'play', label: 'PLAY / PAUSE', group: 'PICTURE', keys: ['P'], run: () => setPlay(!S.play) },
  { id: 'save', label: 'SAVE', group: 'FILE', keys: ['Mod+S'], inFields: true, run: () => folders.save() },
  { id: 'folders', label: 'FOLDERS', group: 'WINDOW', keys: ['F'], run: () => folders.toggle() },
  { id: 'modulation', label: 'MODULATION', group: 'WINDOW', keys: ['M'], run: () => mod.toggle() },
  { id: 'notebook', label: 'NOTEBOOK', group: 'WINDOW', keys: ['J'], run: () => notebook.toggle() },
  { id: 'help', label: 'KEYS', group: 'WINDOW', keys: ['?'], run: () => help.toggle() },
] });
const help = createKeysHelp({ keys, host: windows });

// ── THE MENUS: data. WINDOW comes from the rack, LANGUAGE from the kit, every key column from the key table. ──
const k = (id) => keys.menuItem(id);
createMenubar({ opener: wordmark(stage, { word: NAME, sub: 'AN MIR APP' }), host: lab, menus: {
  FILE: () => [k('save'), ['NEW', () => folders.fresh()], k('folders')],
  EDIT: () => [['RESET THE PICTURE', () => setScene(HOME)]],
  VIEW: () => [k('play'), ['THIS PAGE ON THE PICTURE', () => showPage(info, pageNow())]],
  WINDOW: () => [...rack.windowMenu(), null, k('modulation'), k('notebook'), k('help')],
  ABOUT: () => [['ABOUT ' + NAME, () => notebook.open('about')]],
  LANGUAGE: languageMenu(),
  GUI: () => [['MIR OPTIONS', () => gui.open('options')], ['MIR ABOUT', () => gui.open('about')]],
} });
keys.hints(document); keys.onChange(() => keys.hints(document));
installControlHelp(document);
installPress({ selector: '.sw, .seg-b, .trig, .mir-rack-btn' });
accent.apply();

// ── DESCRIBE: what a visiting model can read: the windows, the numbers, the keys, and only the shared pages. ──
const describe = createDescribe({ app: { name: NAME, version: '0.1.0', what: 'A ring of dots driven by four numbers.' }, rack, params, pages, keys, prefs: gui.prefs, mod });

window.__STARTER = { S, params, mod, rack, pages, notebook, folders, keys, help, gui, info, describe };
