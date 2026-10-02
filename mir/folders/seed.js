/* MIR · folders/seed.js — STARTER PROJECTS: what an app ships in its gallery (pure: no DOM).
 *
 * BASINS ships JOSH'S LIBRARY and its starters; any app can ship a few.  seed(files, list) adds each starter ONCE:
 *   · a starter is { id?, name, folder, data, thumbnail, readOnly, at?, facts? }; its id (default folder/name) is what
 *     "once" is counted by;
 *   · it is added only if its id is in neither the seeded list (kept under `seededKey` in `storage`) nor the library
 *     (an entry whose facts.seedId is that id).  So a starter the user deleted stays deleted, and a library copied
 *     from another device is not seeded twice;
 *   · NEVER OVER THE USER'S: files.save always makes a new entry, and a name already taken in that folder is suffixed
 *     ("PIEZO 2"), so a project of the user's with the same name is not touched;
 *   · readOnly is kept on the entry (facts.readOnly): FOLDERS will not SAVE over it or rename it (SAVE AS makes the
 *     user's own copy); the user may still delete it.
 * A full library stops the seeding where it is, with the store's own refusal; what was added is remembered.
 *
 * seed(files, starters, { storage, seededKey }) → { ok, added, skipped, total, why?, full? } */

const readList = (storage, key) => { try { const v = JSON.parse(storage.getItem(key) || '[]'); return Array.isArray(v) ? v.map(String) : []; } catch (_) { return []; } };
const writeList = (storage, key, list) => { try { storage.setItem(key, JSON.stringify(list)); return true; } catch (_) { return false; } };
export const seedId = (s) => String(s && s.id != null ? s.id : ((s && s.folder) || '') + '/' + ((s && s.name) || ''));

export function seed(files, starters, { storage = globalThis.localStorage, seededKey = files.key + '.seeded' } = {}) {
  const list = Array.isArray(starters) ? starters : [];
  const done = new Set(readList(storage, seededKey));
  for (const e of files.entries()) if (e.facts && e.facts.seedId) done.add(String(e.facts.seedId));
  let added = 0, skipped = 0;
  for (const s of list) {
    const id = seedId(s);
    if (done.has(id)) { skipped++; continue; }
    if (!s || !s.data || typeof s.data !== 'object') { skipped++; continue; }
    const facts = { ...(s.facts && typeof s.facts === 'object' ? s.facts : {}), seedId: id };
    if (s.readOnly) facts.readOnly = true;
    const r = files.save({ name: s.name, folder: s.folder || '', at: s.at, thumb: typeof s.thumbnail === 'string' ? s.thumbnail : '', payload: s.data, facts });
    if (!r.ok) { writeList(storage, seededKey, [...done]); return { ...r, ok: false, added, skipped, total: list.length }; }
    done.add(id); added++;
  }
  writeList(storage, seededKey, [...done]);
  return { ok: true, added, skipped, total: list.length };
}
