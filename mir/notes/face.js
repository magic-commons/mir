/* MIR · notes/face.js — THE SHELF's face in the notebook: your notes, their folders, the recent five, SAVE and
 * SAVE AS, export and import.  λWAVES' ▤ PROJECTS face (rack.js renderProjects, index.html .nb-projectsface), lifted
 * as the notebook's own and pointed at notes instead of projects.  mir/notes/notes.css draws it.
 *
 *   notesFace({ store, glyph, label }) → a face for createNotebook({ faces: [ … ] })
 *     store   a notes/shelf.js createShelf() (default: a fresh one on 'mir.notes')
 *   The face carries `store`, which is how the notebook finds the shelf for its COPY TO SHELF.
 *
 * WHAT IT DOES (λWAVES' behaviour kept; what is new is marked NEW)
 *   · SAVE AS takes "folder/name" from the field; the folder chips above the list fill the field's folder, as
 *     λWAVES' roots row does.  SAVE writes the note open in YOURS back to the path it came from (no path yet: it
 *     asks for one).  The list groups notes by folder, folders by name, newest save first within each.
 *   · A name opens the note into the notebook's YOURS tab (the notebook's openNote).  If YOURS holds text that is
 *     not on the shelf, the row asks "replace yours? yes / no" first (NEW: λWAVES confirmed a dirty project with
 *     window.confirm; the kit never uses a browser dialog).
 *   · ✎ renames in place (NEW) · × deletes after an inline "delete? yes / no" (NEW: λWAVES' × deleted at once) ·
 *     → copies the note into the open project as a page, when the notebook has pages (a copy, never a link).
 *   · RECENT: the last five saved or opened, as chips that open them.
 *   · EXPORT .MD saves the current note as a plain markdown file; IMPORT .MD adds files as notes (never over one).
 *   · A repaired store says so in the status line, with where the damaged text was kept.
 *   Keys typed in the fields never reach the app, except Ctrl/⌘+S and Ctrl/⌘+, (the notebook's own law). */
import { el } from '../kit.js';
import { createShelf } from './shelf.js';

const APP_KEY = (e) => (e.ctrlKey || e.metaKey) && !e.altKey && (e.code === 'KeyS' || e.code === 'Comma');
const keep = (e) => { if (!APP_KEY(e)) e.stopPropagation(); };

export function notesFace({ store = createShelf(), glyph = '▤', label = 'shelf' } = {}) {
  let cur = null, base = null, nbApi = null, face = null;
  const btn = (cls, parent, text, title) => { const b = el('button', cls, parent, text); b.type = 'button'; if (title) b.title = title; return b; };
  const sig = (p) => p.title + '\n' + p.md;
  const dirty = () => { const y = nbApi.yours; return y.md.trim() !== '' && (cur === null || sig(y) !== base); };

  let path, roots, recentRow, list, status;
  const say = (s) => { status.textContent = s; };
  function build(f, api) {
    face = f; nbApi = api; base = sig(api.yours);
    el('div', 'ab-eyebrow', f, 'SHELF');
    const row = el('div', 'nt-new', f);
    path = el('input', 'nt-path', row); path.placeholder = 'folder/name'; path.spellcheck = false; path.setAttribute('aria-label', 'save as folder/name');
    const saveAs = btn('nt-saveas', row, 'SAVE AS', 'save the note open in YOURS under this name');
    recentRow = el('div', 'nt-recent', f);
    roots = el('div', 'nt-roots', f);
    list = el('div', 'nt-list', f); list.setAttribute('role', 'list');
    const foot = el('div', 'nt-foot', f);
    const save = btn('nt-save', foot, 'SAVE', 'save the note open in YOURS where it came from');
    const exp = btn('nt-export', foot, 'EXPORT .MD', 'save the current note as a markdown file');
    const imp = btn('nt-import', foot, 'IMPORT .MD', 'add markdown files to the shelf');
    status = el('span', 'nt-status', foot); status.setAttribute('role', 'status');

    saveAs.addEventListener('click', () => saveTo(path.value));
    save.addEventListener('click', () => { if (cur) saveTo(cur); else { say('give it a name: folder/name'); path.focus(); } });
    path.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveTo(path.value); } keep(e); });
    exp.addEventListener('click', () => {
      if (!cur) { say('nothing to export — save first'); return; }
      const file = store.exportNote(cur); if (!file) return;
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([file.text], { type: 'text/markdown' })); a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000); say('saved ' + file.name);
    });
    imp.addEventListener('click', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = '.md,.markdown,.txt,text/markdown,text/plain';
      inp.addEventListener('change', async () => { let n = 0, last = ''; for (const file of inp.files || []) { const p = store.importNote(file.name, await file.text(), folderOf(path.value)); if (p) { n++; last = p; } } say(n ? 'imported ' + (n === 1 ? last : n + ' notes') : store.error || 'nothing imported'); });
      inp.click();
    });
    store.subscribe(() => { if (face && !face.hidden) paint(); });
    if (store.repaired) say('the shelf was damaged and has been mended — the old text is kept under ' + store.repaired.backup);
    paint();
  }
  const folderOf = (p) => { const s = String(p || '').trim(), i = s.lastIndexOf('/'); return i < 0 ? '' : s.slice(0, i); };

  function saveTo(p) {
    const y = nbApi.yours, at = store.save(p, y);
    if (!at) { say(store.error); return; }
    cur = at; base = sig(y); path.value = at; say('saved ' + at);
  }
  function open(p, row) {
    const go = () => { const page = store.open(p); if (!page) return; cur = p; base = sig(page); nbApi.openNote(page); say('opened ' + p); };
    if (row && dirty() && p !== cur) askOn(row, 'replace yours?', go); else go();
  }
  /* an inline question on a row: yes runs `then`, no or leaving it puts the row back */
  function askOn(row, words, then) {
    if (row.dataset.asking !== undefined) return;
    row.dataset.asking = '';
    const q = el('span', 'nt-ask', row); el('span', 'nt-q', q, words);
    const yes = btn('nt-yes', q, 'yes'), no = btn('nt-no', q, 'no');
    let shut = false;
    const close = () => { if (shut) return; shut = true; delete row.dataset.asking; q.remove(); };   // removing the focused button fires focusout: once only
    yes.addEventListener('click', () => { close(); then(); });
    no.addEventListener('click', close);
    q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } keep(e); });
    q.addEventListener('focusout', (e) => { if (!q.contains(e.relatedTarget)) close(); });
    no.focus();
  }
  function rename(row, it) {
    if (row.dataset.renaming !== undefined) return;
    row.dataset.renaming = '';
    const inp = el('input', 'nt-rename'); inp.value = it.path; inp.spellcheck = false; inp.setAttribute('aria-label', 'rename to folder/name');
    row.insertBefore(inp, row.firstChild); inp.focus(); inp.select();
    let done = false;
    const end = (ok) => {
      if (done) return; done = true; delete row.dataset.renaming; inp.remove();   // `done` first: the removal blurs the field
      if (!ok || inp.value.trim() === it.path) return;
      const to = store.rename(it.path, inp.value);
      if (!to) { say(store.error); return; }
      if (cur === it.path) cur = to;
      say('renamed to ' + to);
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); end(true); } else if (e.key === 'Escape') { e.preventDefault(); end(false); } keep(e); });
    inp.addEventListener('blur', () => end(true));
  }

  function paint() {
    if (!list) return;
    const items = store.list(), recent = store.recent();
    recentRow.replaceChildren(); roots.replaceChildren(); list.replaceChildren();
    recentRow.hidden = !recent.length;
    if (recent.length) {
      el('span', 'nt-label', recentRow, 'RECENT');
      for (const p of recent) { const c = btn('nt-chip', recentRow, p.split('/').pop(), 'open ' + p); c.addEventListener('click', () => open(p, c)); }
    }
    if (!items.length) { el('div', 'nt-none', list, 'no notes yet — name one above and SAVE AS'); return; }
    const by = new Map();
    for (const it of items) { if (!by.has(it.folder)) by.set(it.folder, []); by.get(it.folder).push(it); }
    const names = [...by.keys()].sort((a, b) => a.localeCompare(b));
    for (const f of names) {
      const c = btn('nt-root', roots, f || '(root)', f ? 'save into ' + f : 'save into no folder');
      c.addEventListener('click', () => { const name = (path.value.split('/').pop() || '').trim(); path.value = (f ? f + '/' : '') + name; path.focus(); });
    }
    const toProject = !!(nbApi && nbApi.pages);
    for (const f of names) {
      el('div', 'nt-folder', list, f || '(root)');
      for (const it of by.get(f)) {
        const row = el('div', 'nt-item', list); row.setAttribute('role', 'listitem'); row.dataset.path = it.path;
        if (it.path === cur) row.dataset.current = '';
        const nm = btn('nt-name', row, it.name, 'open ' + it.path + ' in YOURS');
        nm.addEventListener('click', () => open(it.path, row));
        el('span', 'nt-when', row, (it.saved || '').slice(0, 16).replace('T', ' '));
        const rn = btn('nt-act nt-ren', row, '✎', 'rename'); rn.setAttribute('aria-label', 'rename ' + it.path);
        rn.addEventListener('click', () => rename(row, it));
        if (toProject) {
          const cp = btn('nt-act nt-toproject', row, '→', 'copy into the project as a page'); cp.setAttribute('aria-label', 'copy ' + it.path + ' into the project');
          cp.addEventListener('click', () => { const page = store.get(it.path); if (!page) return; const p = nbApi.pages.add(page); nbApi.select(p.id); say('copied ' + it.path + ' into the project'); });
        }
        const x = btn('nt-act nt-del', row, '×', 'delete'); x.setAttribute('aria-label', 'delete ' + it.path);
        x.addEventListener('click', () => askOn(row, 'delete?', () => { if (store.remove(it.path)) { if (cur === it.path) cur = null; say('deleted ' + it.path); } }));
      }
    }
  }

  return {
    id: 'shelf', glyph, label, title: 'your notes: save, open, folders, recent', store,
    build,
    show(f) { paint(); if (cur && path) path.value = cur; },
    /** the path of the note open in YOURS, or null */
    get current() { return cur; },
  };
}
