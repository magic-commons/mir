/* gallery/shell.js — the shell, assembled the way an app assembles it.
 *   default         a fresh app called MIR, with the ABOUT basics every app on the kit gets
 *   ?as=lambdawaves λWAVES' own wordmark, menus and ABOUT words, for tools/shell-parity.mjs
 *   ?theme=dark     start dark (the page starts LIGHT, as λWAVES ships)
 * Hover the wordmark for the menus; J opens the notebook; the ⓘ on the notebook flips to ABOUT. */
import { wordmark } from '../mir/shell/wordmark.js';
import { createMenubar } from '../mir/shell/menubar.js';
import { createNotebook } from '../mir/shell/notebook.js';
import { createAccent } from '../mir/shell/accent.js';
import { kitType, gplLicence } from '../mir/shell/about.js';

const q = new URLSearchParams(location.search);
const AS_LW = q.get('as') === 'lambdawaves';
const lab = document.getElementById('lab'), stage = document.getElementById('stage');
if (q.get('theme') === 'dark') document.body.dataset.theme = 'dark';
if (!AS_LW) document.documentElement.style.setProperty('--rack-w', '0px');   // a fresh app has no racks: no gutter for them (λWAVES keeps two)

const accent = createAccent();
const setTheme = (t) => { document.body.dataset.theme = t; accent.apply(); };

let notebook = null;
const title = AS_LW ? wordmark(stage, { lead: 'λ', word: 'WAVES', sub: 'QWAVE-0 · HYDROGEN SHADOW LAB' })
  : wordmark(stage, { word: 'MIR', sub: 'THE INTERFACE KIT' });

/* ── λWAVES' words, as its menubar and index.html say them (captured 2026-09-16 from dev 8fcdcf8) ── */
const LW_MENUS = {
  FILE: () => [['NEW project'], ['SAVE project…\tCtrl+S'], ['SAVE project AS…\tCtrl+Shift+S', () => notebook.open('projects')], ['OPEN a project…', () => notebook.open('projects')], null,
    ['EXPORT project (.json)'], ['IMPORT project (.json)…'], null,
    ['SAVE the experiment (quick)'], ['LOAD the last quick save'], ['COPY as JSON'],
    ['COPY a LINK to this state', null, null, 'a URL that reopens this exact state — the STATE card says how long it is and what format v1 could not carry (the MOLECULE panel and the MODULATION rack)']],
  EDIT: () => [['UNDO\tCtrl+Z', null, () => true], ['REDO\tCtrl+Shift+Z', null, () => true], ['HISTORY UNDO\tCtrl+Alt+Z', null, () => true, 'return once to the timeline that existed before the last history-row jump'], ['UNDO HISTORY…'], null,
    ['PLAY / PAUSE\tSpace'], ['NORMALIZE'], ['CLEAR the register'], ['RESET the view'], ['RESEED the particles\tCtrl+R'], null, ['RESET the key bindings'], ['SETTINGS…\tCtrl+,']],
  VIEW: () => [['INVERT the cloud — ink, not light', null, null, 'draw the cloud as ink rather than light; the transfer is inverted and ψ is not touched'], ['ρ = |ψ|²  density'], ['arg ψ  phase\tV cycles'], ['Re ψ'], ['Im ψ'], ['Δρ  difference'], ['Re + Im  superposed (heuristic)'],
    ['— style: CLOUD\tC cycles'], ['— style: SOLID'], ['— style: GRAIN'], ['— style: SIGNED'], ['— style: BANDS'],
    ['STAGE CAPTIONS  on / off'], ['STATUS TAGS  on / off'], ['CONTROL HINTS  on / off'], ['HIDE the interface\tH'], ['FULL SCREEN / back\tF']],
  WINDOW: () => [['MODULATION\tM'], ['NOTEBOOK\tJ', () => notebook.toggle()], ['HIDE / SHOW the rack\tB'], ['DOCK / UNDOCK the transport\tT'], ['HIDE the interface\tH'], ['SHOW / HIDE help\tN'], null,
    ['THEME · LIGHT', () => setTheme('light')], ['THEME · DARK', () => setTheme('dark')], ['THEME · SYSTEM', () => setTheme(matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')]],
  ABOUT: () => [['ABOUT λWAVES', () => notebook.open('about')], ['KEYBOARD SHORTCUTS…\t?'], ['SETTINGS…\tCtrl+,'], null, ['UPDATE APP', null, null, 'check for a new build, rebuild the offline cache, and reload']],
};
const LW_ABOUT = {
  version: 'PRE-ALPHA · waves 5–107 · 2026-09-07',
  tagline: 'A playable hydrogen shadow where 91 nlm states become heuristics for classical waves. Tune amplitudes, phases, and viewpoints like an instrument, then watch eigenmodes interfere and the wave field bloom into motion.',
  copyright: '© 2026 Joshua Hosain • Magic Commons',
  thanks: [
    ['Team @ Chronus Quantum for the Molecular Orbital Model — ', ['ChronusQ', 'https://github.com/xsligroup/chronusq_public']],
    [['‘Electron Orbitals’', 'https://play.google.com/store/apps/details?id=com.gputreats.orbitalexplorer'], ' Google Play Store App by Brian Johnson'],
    ['Paul Falstad’s Math & Physics Java Applets @ ', ['falstad.com', 'https://www.falstad.com/']],
  ],
  team: 'Seth Shultz · Beatriz Erranté · Independent research & Assistance',
  made: 'Built by AI coding agents\nClaude (Anthropic) · Gemini (Google) · GPT (OpenAI)',
  type: ['Type: ', ['LW\u00a0Title', './fonts/Spinwerad-OFL.txt'], ', a renamed subset of Spinwerad by gluk · ', ['Roboto', './fonts/Roboto-OFL.txt'], ' · ', ['STIX\u00a0Two\u00a0Math', './fonts/STIXTwoMath-OFL.txt'],
    ' — all SIL OFL 1.1, subset for this lab. Maths set with ', ['KaTeX', './vendor/katex/LICENSE'], ' (MIT; its ', ['fonts', './vendor/katex/fonts/OFL.txt'], ' SIL OFL 1.1) and ', ['marked', './vendor/marked-LICENSE.md'], ' (MIT).'],
  home: { label: 'RETURN HOME', href: 'https://magic-commons.com/' },
};

/* ── a fresh app's words: what the kit gives an app that says nothing but its name ── */
const MIR_MENUS = {
  FILE: () => [['NEW'], ['OPEN…'], ['SAVE\tCtrl+S'], ['SAVE AS…\tCtrl+Shift+S'], null, ['EXPORT (.json)'], ['IMPORT (.json)…']],
  EDIT: () => [['UNDO\tCtrl+Z', null, () => true], ['REDO\tCtrl+Shift+Z', null, () => true], null, ['SETTINGS…\tCtrl+,']],
  VIEW: () => [['THEME · LIGHT', () => setTheme('light')], ['THEME · DARK', () => setTheme('dark')], null, ['FULL SCREEN / back\tF', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})]],
  WINDOW: () => [['NOTEBOOK\tJ', () => notebook.toggle()]],
  ABOUT: () => [['ABOUT MIR', () => notebook.open('about')]],
};
const MIR_ABOUT = {
  version: '1.3.0 · the shell · 2026-09-16',
  tagline: 'Magic Commons’ interface kit: one set of tokens, materials, widgets, gestures and window chrome — and this shell, the wordmark, the menus and the notebook every app on it begins with.',
  copyright: '© 2026 Joshua Hosain • Magic Commons',
  licence: gplLicence('MIR', { license: '../LICENSE', notice: null }),   // the gallery sits one folder down from the kit's LICENSE
  made: 'Built by AI coding agents\nClaude (Anthropic) · Gemini (Google) · GPT (OpenAI)',
  type: kitType([], '../fonts/'),
  home: { label: 'RETURN HOME', href: 'https://magic-commons.com/' },
};

const menubar = createMenubar({ opener: title, host: lab, menus: AS_LW ? LW_MENUS : MIR_MENUS });
notebook = createNotebook({
  host: stage,
  name: AS_LW ? 'λWAVES' : 'MIR',
  storageKey: AS_LW ? 'mir.gallery.lw.notebook' : 'mir.gallery.notebook',
  keyLabel: 'J',
  projectsNote: AS_LW,
  about: AS_LW ? LW_ABOUT : MIR_ABOUT,
  faces: AS_LW ? [{ id: 'projects', glyph: '▤', label: 'projects', title: 'projects: save, open, folders, recent',
    build(face) { const e = document.createElement('div'); e.className = 'ab-eyebrow'; e.textContent = 'PROJECTS'; face.appendChild(e); } }] : [],
  onLogo: () => accent.paintMarks(),
});
accent.apply();
accent.turn();

/* J, the way λWAVES' key dispatcher takes a key: never from a field the user is typing in, never twice for a held key,
   never when something nearer already took it — and it is consumed, so it does not also type a "j" where focus lands */
const typing = (t) => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
  if (e.code === 'KeyJ') { e.preventDefault(); notebook.toggle(); }
});

/* the driving contract tools/shell-parity.mjs speaks */
window.__MIR_SHELL = {
  theme: (t) => setTheme(t),
  menu: (name) => (name ? menubar.openGroup(name) : menubar.close()),
  notebook: (face) => (face ? notebook.open(face) : notebook.close()),
  parts: { accent, menubar, notebook },
};
