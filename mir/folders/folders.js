/* MIR · folders/folders.js — FOLDERS: the kit's project window (BASINS' SAVE window, retitled and split).
 *
 * Josh, 2026-10-01: "Refactor the SAVE window and retitle it FOLDERS."  The 1.5 plan (§7 1.5.1, rulings 5 and 6)
 * splits BASINS' save-window.js (836 lines, seven jobs) into four parts, and this file is the one that joins them:
 *   1. THE WINDOW   window/window.js createWindow — the one window species: the chip rail (Shift-drag, long press and
 *                   keyboard relocate it), the dock if the app gives one, resize by transform with one layout commit,
 *                   cancel on a lost pointer, presence motion on open and close, and onMoved(rect) so a rack's
 *                   transport can dodge it (shell/rack.js dodge).  It keeps BASINS' EMPTY-GLASS DRAG: the gaps, the
 *                   titles and the labels move the window; the tiles, folders and the context box do not.
 *   2. THE ADAPTER  folders/project.js — capture · restore · signature · thumbnail · empty; by default the kit's
 *                   core/project.js parts.  NEW is the empty project; a failed open rolls back and says so.
 *   3. THE STORE    folders/files.js — BASINS' library model as it stands, the key an option (BASINS: basins.library).
 *   4. THE GALLERY  folders/gallery.js — BASINS' explorer as it stands, plus drag-to-folder with the proximity glow.
 * And: SEEDING (folders/seed.js, starters added once), EXPORT (a `.mir` project envelope, or a PNG that carries it:
 * core/envelope.js + core/png.js) and IMPORT (core/intake.js: drop on the window, or OPEN FILE; another app's project
 * is refused with the reason).
 *
 * THE LAWS IT KEEPS
 *   · WHAT THE USER READS CHANGES; WHAT A BROWSER STORED DOES NOT.  `id` (the window id, the prefs it persists under),
 *     `store` (the library key) and `prefs` are options; an app that had a SAVE window passes its old names and keeps
 *     every saved library and layout.  BASINS: { id: 'savewin', store: 'basins.library', prefs: savewin's slot }.
 *   · THE WINDOW TAKES THE POINTER BY ITS CLASS, NEVER BY ITS ID.  `.mir-win` (window.css) answers the mouse; nothing
 *     here hangs on `#savewin`, so the 2026-09-18 dead-window bug (an id-keyed pointer-events rule) cannot recur.
 *   · TWO FILE SYSTEMS, KEPT APART.  FOLDERS saves projects in its store; the notebook's shelf (notes/) saves notes in
 *     its own.  Neither reads the other's store and neither opens the other's window.  A project's pages ride in the
 *     project as one more part (shell/pages.js part()), which FOLDERS never looks inside.
 *   · Strings through t() (core/i18n.js).  Listeners under one AbortController; destroy() removes everything.
 *
 * createFolders(options) → api        (options and api: docs/FOLDERS.md) */
import { createWindow } from '../window/window.js';
import { ariaLabel } from '../kit.js';
import { t } from '../core/i18n.js';
import { frame } from '../core/frame.js';
import { setText, setAttr } from '../core/perf.js';
import { wrap, stringify } from '../core/envelope.js';
import { embed } from '../core/png.js';
import { createIntake } from '../core/intake.js';
import { createFiles } from './files.js';
import { buildGallery, SORT_MODES } from './gallery.js';
import { createProjectAdapter, openWithRollback, emptyProject } from './project.js';
import { seed as seedLibrary } from './seed.js';

export const FOLDERS_COPY = {
  save: ['SAVE', 'this project', 'Save — store what is on screen over the open project (a new one the first time).'],
  saveAs: ['SAVE AS', 'a new project', 'Save as — store what is on screen as a new project, with the name and folder below.'],
  fresh: ['NEW', 'the empty project', 'New — the empty project: every part starts from nothing.'],
  open: ['OPEN FILE', '.mir or picture', 'Open a project file (.mir) or a picture that carries one — or drop it on this window.'],
  export: ['EXPORT', '.mir or picture', 'Export the selected project (or the open one) as a .mir file, or as a picture that carries it.'],
};
const LOOK_SORTS = ['az', 'za', 'new', 'old'];

/** localPrefs(storage, key) — the default window prefs: one JSON object under one key */
export function localPrefs(storage, key) {
  return {
    read() { try { const v = JSON.parse(storage.getItem(key) || 'null'); return v && typeof v === 'object' ? v : null; } catch (_) { return null; } },
    write(v) { try { storage.setItem(key, JSON.stringify(v)); } catch (_) {} },
  };
}

/** toThumb(src, { max, type }) → Promise<data URL | ''> — a canvas, a Blob or a data URL made small for the library */
export async function toThumb(src, { max = 320, type = 'image/jpeg', quality = 0.84 } = {}) {
  try {
    if (!src) return '';
    let img = src;
    if (typeof src === 'string') { if (!/^data:image\//.test(src)) return ''; img = await loadImage(src); }
    else if (typeof Blob !== 'undefined' && src instanceof Blob) img = await createImageBitmap(src);
    const w = img.width, h = img.height; if (!w || !h) return '';
    const k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(type, quality);
  } catch (_) { return ''; }
}
const loadImage = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('the picture could not be read')); i.src = url; });
/** pngBytes(src) → Promise<Uint8Array | null> — any picture (canvas, Blob, data URL) as PNG bytes */
async function pngBytes(src) {
  try {
    let c = src;
    if (!(typeof HTMLCanvasElement !== 'undefined' && src instanceof HTMLCanvasElement)) {
      const img = typeof src === 'string' ? await loadImage(src) : await createImageBitmap(src);
      c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0);
    }
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch (_) { return null; }
}
const fileName = (s) => (String(s || 'project').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim() || 'project');
function saveBlob(blob, name) {
  const a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function createFolders(options = {}) {
  const o = options;
  const host = o.host || document.body, doc = host.ownerDocument, view = doc.defaultView;
  const storage = o.storage || view.localStorage;
  const id = o.id || 'folders', title = o.title || 'FOLDERS', store = o.store || 'mir.folders';
  const prefs = o.prefs || localPrefs(storage, store + '.window');
  const life = new AbortController(), on = { signal: life.signal };
  const copy = { ...FOLDERS_COPY, ...(o.copy || {}) };
  const readPrefs = () => prefs.read() || {};
  const writePrefs = (patch) => prefs.write({ ...readPrefs(), ...patch });

  /* ── 3. the store, and 5. the seeds ── */
  const files = o.files || createFiles({ key: store, storage, defaultName: o.defaultName || 'UNTITLED', capChars: o.capChars });
  const seeded = o.seeds ? seedLibrary(files, o.seeds, { storage, seededKey: o.seededKey }) : null;
  view.addEventListener('storage', (e) => { if (e.key === store || e.key === null) files.reload(); }, on);

  /* ── 2. the adapter ── */
  const A = createProjectAdapter(o.adapter || {});
  let current = null;                                               // the open project's entry id, or null
  const currentEntry = () => (current ? files.entry(current) : null);
  const ro = (e) => !!(e && e.facts && e.facts.readOnly);
  async function capture(presence) {
    const payload = await A.capture(presence || (gallery ? gallery.presence() : {}));
    let thumb = '';
    try { thumb = await toThumb(await A.thumbnail(), o.thumb); } catch (_) {}
    let facts = {}; try { facts = A.facts() || {}; } catch (_) {}
    return { payload, thumb, facts };
  }
  const galleryAdapter = {
    capture,
    restore: (payload, entry) => openWithRollback(A, payload, entry),
    signature: () => A.signature(),
    fresh: async () => { const r = await emptyProject(A); if (!r.ok) return r; return t('New — the empty project'); },
    freshLoses: () => true,
    factory: o.factory,
    depthOf: o.depthOf,
    picture: o.capturePicture, savePicture: o.savePicture, pictureStale: o.pictureStale,
  };

  /* ── the status voice: the app's, or a line in the window ── */
  let statusEl = null;
  const say = typeof o.say === 'function' ? o.say : (text, bad) => {
    if (!statusEl) return;
    setText(statusEl, text); setAttr(statusEl, 'data-tone', bad ? 'warn' : null);
  };

  /* ── 1. the window ── */
  const sorts = o.sorts || (o.depthOf ? SORT_MODES.map((m) => m.id) : LOOK_SORTS);
  const sortModes = sorts.map((s) => SORT_MODES.find((m) => m.id === s)).filter(Boolean);
  const gp = readPrefs().gallery || {};
  const head = doc.createElement('div'), panel = doc.createElement('div');
  head.className = 'fo-head'; panel.className = 'fo-gallery';
  const curName = doc.createElement('span'); curName.className = 'fo-current';
  const mark = doc.createElement('span'); mark.className = 'fo-mark';
  head.append(curName, mark);
  statusEl = doc.createElement('div'); statusEl.className = 'fo-status'; statusEl.setAttribute('role', 'status'); statusEl.setAttribute('aria-live', 'polite');

  let gallery = null;
  const MARK = Symbol('folders-mark');
  const win = createWindow({
    id, title, host, size: o.size || { w: 380, h: 680 }, min: o.min || { w: 280, h: 360 }, resizable: true,
    /* the tiles, the folders and the context box are the gallery's to press; every other piece of glass drags */
    emptyDrag: '.sv-card, .sv-folder, .sv-context, .sv-crumb',
    dock: o.dock || null,
    persist: { read: () => readPrefs(), write: (shape) => writePrefs(shape) },
    onMoved: (r) => { if (typeof o.onMoved === 'function') o.onMoved(r); },
    onOpen: () => { if (gallery) gallery.paint(); paintMark(); },
    chips: [
      { name: 'sort', kind: 'cycle', label: t('Sort'), state: (sortModes[gp.sort] || sortModes[0]).id,
        states: sortModes.map((m) => ({ id: m.id, text: m.ink, label: t(m.label), hint: t(m.label) + ' — ' + t('press for the next order') })),
        press: (state) => { if (gallery) gallery.setSort(sortModes.findIndex((m) => m.id === state)); } },
    ],
    body: (b) => { b.append(head, panel, statusEl); },
  });
  win.root.classList.add('mir-folders');
  ariaLabel(win.root, title);
  const intakeTarget = win.root;

  /* ── 4. the gallery ── */
  const extraActions = {
    save: { copy: copy.save, icon: 'save', fire: () => saveNow() },
    saveAs: { copy: copy.saveAs, icon: 'duplicate', fire: () => gallery.save() },
    fresh: { copy: copy.fresh, icon: 'plus', fire: () => gallery.fresh() },
    open: { copy: copy.open, icon: 'folder', fire: () => intake.pick() },
    export: { copy: copy.export, icon: 'download', fire: () => exportMenu() },
  };
  gallery = buildGallery(panel, {
    files, adapter: galleryAdapter, say, glyph: o.glyph, kit: o.kit,
    parts: o.parts || [], sorts, copy: { root: 'ROOT', ...(o.galleryCopy || {}) },
    actions: o.actions || ['save', 'saveAs', 'fresh', 'open', 'export'], extraActions,
    prefs: gp, persist: (g) => writePrefs({ gallery: g }),
    current: () => current,
    onOpened: async (e) => {
      current = e.id; paintMark();
      if (!e.thumb) { const c = await capture().catch(() => null); if (c && c.thumb) files.overwrite(e.id, { payload: e.payload, thumb: c.thumb, facts: e.facts, at: e.at }); }
      if (typeof o.onOpened === 'function') o.onOpened(e);
    },
    onSaved: (e) => { current = e.id; paintMark(); },
    onFresh: () => { current = null; paintMark(); },
    onRemoved: (e) => { if (current === e.id) { current = null; paintMark(); } },
    onInspect: o.onInspect,
  });
  gallery.markClean();                                             // what the app started with is the clean state

  /* ── the unsaved mark: the open project's name, and whether what is on screen is still it ── */
  function paintMark() {
    if (!gallery) return;                                          // a window persisted open opens before the gallery is built
    frame.coalesce(MARK, () => {
      const e = currentEntry(), d = gallery.dirty();
      setText(curName, e ? e.name : t('UNTITLED'));
      setAttr(head, 'data-read-only', ro(e) ? 'true' : null);
      const dirty = d.known && d.dirty;
      setAttr(head, 'data-dirty', dirty ? 'true' : null);
      setText(mark, dirty ? t('UNSAVED CHANGES') : '');
    });
  }
  const unsub = A.subscribe ? A.subscribe(() => paintMark()) : null;
  paintMark();

  /* ── SAVE: over the open project; the first time (or over a starter) it is SAVE AS ── */
  async function saveNow() {
    const e = currentEntry();
    if (!e || ro(e)) {
      if (ro(e)) say(t('{name} came with the app — saving it as your own copy', { name: e.name }));
      return gallery.save(ro(e) ? { name: e.name } : undefined);
    }
    let r;
    try { const c = await capture(); r = files.overwrite(e.id, c); } catch (err) { r = { ok: false, why: String((err && err.message) || err) }; }
    if (r.ok) { gallery.markClean(); say(t('Saved — {name}', { name: r.entry.name })); gallery.paint(); paintMark(); }
    else say(t('Could not save: {why}', { why: r.why || 'unknown' }), true);
    return r;
  }

  /* ── 6. export and import ── */
  const download = typeof o.download === 'function' ? o.download : saveBlob;
  async function subject() {
    const e = gallery.selected() || currentEntry();
    if (e) return { name: e.name, payload: e.payload, thumb: e.thumb, entry: e };
    const c = await capture();
    return { name: gallery.nameValue() || t('UNTITLED'), payload: c.payload, thumb: c.thumb, entry: null };
  }
  const envelopeOf = (s) => wrap('project', s.payload, { app: o.app, name: s.name });
  async function exportProject(how = 'mir') {
    const s = await subject();
    const env = envelopeOf(s);
    if (how === 'png') {
      let pic = null;
      try { pic = typeof o.picture === 'function' ? await o.picture(s.entry) : null; } catch (_) {}
      if (!pic && !s.entry) { try { pic = await A.thumbnail(); } catch (_) {} }
      const bytes = await pngBytes(pic || s.thumb);
      const out = bytes && embed(bytes, env);
      if (!out) { say(t('Could not make the picture for {name} — it has none; export the .mir file instead', { name: s.name }), true); return null; }
      const blob = new Blob([out], { type: 'image/png' });
      download(blob, fileName(s.name) + '.png');
      say(t('Exported {name} as a picture that carries it', { name: s.name }));
      return blob;
    }
    const blob = new Blob([stringify(env)], { type: 'application/json' });
    download(blob, fileName(s.name) + '.mir');
    say(t('Exported {name} as a .mir file', { name: s.name }));
    return blob;
  }
  function exportMenu() {
    const b = gallery.box(t('EXPORT'));
    const row = doc.createElement('div'); row.className = 'sv-context-row'; b.appendChild(row);
    gallery.action(row, '.MIR FILE', () => { gallery.closeContext(); exportProject('mir'); }, 'sv-primary').root.dataset.export = 'mir';
    gallery.action(row, 'PICTURE', () => { gallery.closeContext(); exportProject('png'); }).root.dataset.export = 'png';
    gallery.action(b, 'CLOSE', () => gallery.closeContext());
    const first = row.querySelector('.trig'); if (first) first.focus({ preventScroll: true });
  }
  async function importEnvelope(env) {
    const r = files.save({ name: env.name || t('IMPORTED'), folder: gallery.folder(), payload: env.data, thumb: '', facts: {} });
    if (!r.ok) { say(t('Could not keep {name}: {why}', { name: env.name || '', why: r.why || 'unknown' }), true); return r; }
    gallery.go(r.entry.folder);
    say(t('Imported — {name}', { name: r.entry.name }));
    return gallery.openEntry(r.entry.id);
  }
  const intake = createIntake({ target: intakeTarget, accept: ['project'], check: { app: o.app }, paste: false,
    onEnvelope: (env) => { importEnvelope(env); },
    onReject: (r) => say(t('Could not open that file: {why}', { why: (r.errors && r.errors[0] && r.errors[0].why) || 'unknown' }), true) });

  /* ── the first seat: top right, clear of a rack (the app says where), unless a hand already placed it ── */
  const firstSeat = typeof o.firstSeat === 'function' ? o.firstSeat
    : () => ({ x: Math.max(16, view.innerWidth - (o.size ? o.size.w : 380) - 88), y: 72 });
  const seatOnce = () => { if (win.state().x == null) { const s = firstSeat(); if (s) win.place({ x: s.x, y: s.y }); } };
  if (win.isOpen()) seatOnce();

  return {
    win, files, gallery, adapter: A, seeded, intake,
    open() { if (!win.isOpen()) { win.open(); seatOnce(); } },
    close: () => win.close(), toggle() { if (win.isOpen()) win.close(); else this.open(); }, isOpen: () => win.isOpen(),
    save: saveNow, saveAs: (so) => gallery.save(so), fresh: (fo) => gallery.fresh(fo),
    openEntry: (eid, oo) => gallery.openEntry(eid, oo),
    current: () => currentEntry(), dirty: () => gallery.dirty(),
    seed: (list) => { const r = seedLibrary(files, list, { storage, seededKey: o.seededKey }); gallery.paint(); return r; },
    exportProject, importEnvelope, ingest: (input, io) => intake.ingest(input, io), say,
    state: () => ({ window: win.state(), gallery: gallery.state(), library: files.state(), current, dirty: gallery.dirty() }),
    destroy() { life.abort(); if (unsub) unsub(); frame.cancel(MARK); intake.destroy(); gallery.destroy(); win.destroy(); },
  };
}

export default createFolders;
