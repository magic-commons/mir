/* core/i18n.js — the kit's one translation seam: t('English') and the language packs (docs/LANGUAGES.md).
 *
 * THE LAWS IT KEEPS
 *   · ENGLISH IS THE KEY AND THE FALLBACK.  t('EXPOSURE') looks the English up in the current pack; a string the pack
 *     does not have comes back as its English, never a key and never a blank.  Each miss is remembered (missing()).
 *   · A PACK LOADS ON DEMAND, one fetch per language per source, cached: `<source>/<tag>.json`.  The kit's own
 *     folder is the first source; an app adds its own with addLocales(url), and its strings win over the kit's.
 *   · setLanguage(tag) writes <html lang dir>, loads the pack, THEN tells the subscribers.  A pack that will not load
 *     does not throw: the language is set and every string stays English.
 *   · NOTHING RUNS WHILE THE LANGUAGE DOES NOT CHANGE.  The builders that wrote text keep its English on the node and
 *     rewrite it from onLanguage(); t() itself is one map lookup.
 *   · NEVER THROUGH t(): numbers and units in readouts, app and product names, maths, what the user typed.
 *   · `{name}` substitution only.  A var written { t: 'English' } is a kit label and is translated in turn; any
 *     other var is data and is written as it is.
 *   · `qps` / `qps-rtl` are generated, not packs (locales/pseudo.js): accented, ~40 % longer, bracketed. */

/** the ten and English, each named in its own script; `reviewed` flips when a native reader has checked the pack */
export const LANGUAGES = Object.freeze([
  { tag: 'en', name: 'English', dir: 'ltr', reviewed: true },
  { tag: 'zh-Hans', name: '中文', dir: 'ltr', reviewed: false },
  { tag: 'hi', name: 'हिन्दी', dir: 'ltr', reviewed: false },
  { tag: 'es', name: 'Español', dir: 'ltr', reviewed: false },
  { tag: 'ar', name: 'العربية', dir: 'rtl', reviewed: false },
  { tag: 'fr', name: 'Français', dir: 'ltr', reviewed: false },
  { tag: 'bn', name: 'বাংলা', dir: 'ltr', reviewed: false },
  { tag: 'pt-BR', name: 'Português', dir: 'ltr', reviewed: false },
  { tag: 'id', name: 'Bahasa Indonesia', dir: 'ltr', reviewed: false },
  { tag: 'ru', name: 'Русский', dir: 'ltr', reviewed: false },
  { tag: 'ja', name: '日本語', dir: 'ltr', reviewed: false },
  { tag: 'qps', name: '[Ƥšéûðö]', dir: 'ltr', reviewed: true, dev: true },
  { tag: 'qps-rtl', name: '[Ƥšéûðö ŔŢĹ]', dir: 'rtl', reviewed: true, dev: true },
]);

let tag = 'en', dir = 'ltr', strings = null, pseudo = null, seq = 0;
const sources = [new URL('../locales/', import.meta.url).href], cache = new Map(), subs = new Set(), miss = new Set();

export const language = () => tag;
export const direction = () => dir;
export const languages = ({ dev = false } = {}) => LANGUAGES.filter((l) => dev || !l.dev);
/** the English strings asked for in this language that its pack does not have (capped, so dynamic text cannot grow it) */
export const missing = () => [...miss];
/** an app's own packs: a folder URL (`<url>/<tag>.json`) or a function (tag) → pack | null.  Later sources win. */
export function addLocales(src) { if (!sources.includes(src)) { sources.push(src); cache.clear(); } }
export function onLanguage(fn) { subs.add(fn); return () => subs.delete(fn); }

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => {
  if (!(k in vars)) return m;
  const v = vars[k];
  return v && typeof v === 'object' && typeof v.t === 'string' ? t(v.t) : String(v);
});

export function t(en, vars) {
  if (typeof en !== 'string' || en === '') return en === undefined || en === null ? '' : en;
  let s = en;
  if (pseudo) s = pseudo(en);
  else if (strings) { const x = strings[en]; if (typeof x === 'string' && x) s = x; else if (miss.size < 4096) miss.add(en); }
  return vars ? fill(s, vars) : s;
}

async function loadPack(want) {
  if (!cache.has(want)) cache.set(want, (async () => {
    let pack = null;
    for (const src of sources) {
      try {
        let p = null;
        if (typeof src === 'function') p = await src(want);
        else { const r = await fetch(new URL(want + '.json', src)); if (r.ok) p = await r.json(); }
        if (p && typeof p === 'object') pack = { ...(pack || {}), ...p, strings: { ...(pack ? pack.strings : {}), ...(p.strings || {}) } };
      } catch (_) { /* a source without this language is not an error */ }
    }
    return pack;
  })());
  return cache.get(want);
}

/** setLanguage(tag) → Promise<boolean>: false when no pack was found (everything stays English).  The last call wins. */
export async function setLanguage(next = 'en') {
  const my = ++seq, meta = LANGUAGES.find((l) => l.tag === next) || { tag: next, dir: 'ltr' };
  let pack = null, ps = null, ok = true;
  if (/^qps(-|$)/.test(next)) { try { ps = (await import('../locales/pseudo.js')).pseudo; } catch (_) { ok = false; } }
  else if (next !== 'en') { pack = await loadPack(next); ok = !!pack; }
  if (my !== seq) return ok;
  tag = next; dir = (pack && pack.dir) || meta.dir; pseudo = ps;
  strings = next === 'en' || ps ? null : (pack && pack.strings) || {};
  miss.clear();
  if (typeof document !== 'undefined') { document.documentElement.lang = next; document.documentElement.dir = dir; }
  for (const fn of [...subs]) { try { fn(tag); } catch (e) { console.warn('language subscriber', e); } }
  return ok;
}
