/* MIR · shell/menubar.js — FILE · EDIT · VIEW · WINDOW · ABOUT, opened by the wordmark.
 *
 * Ported from λWAVES rack.js ("the logo opens FILE · EDIT · WINDOW", waves 53–106, its Escape at wave 62 and its
 * phone crossing at wave 106), with the one thing BASINS' copy added: a menu item that throws cannot leave the bar
 * stuck open.
 *
 * THE LAWS IT CARRIES (λWAVES' own words where they exist)
 *   · Hovering the wordmark shows the bar; leaving both for 400 ms hides it.  A touch never opens it by hover.
 *   · It is a DISCLOSURE, not an ARIA menubar: the wordmark is a role=button with aria-expanded, a keyboard open
 *     moves focus to the first group, and Tab walks the rest (λWAVES wave 62 says why the full menubar contract
 *     earns nothing for a duplicate surface).
 *   · The bar is placed from geometry the wordmark's transform cannot move: its left edge + untransformed width + 8,
 *     centred on its vertical middle.
 *   · Each list is FILLED WHEN IT OPENS, so every label says the live state (a recent file, a disabled UNDO).
 *   · Hovering another group while one is open switches to it; a press outside closes everything.
 *   · Escape closes it and gives focus back to the wordmark.
 *   · On a phone the bar is always shown: crossing into the phone breakpoint shows and places it on the next frame.
 *     "Phone" is the kit's sentinel — skin.css raises `--phone` to 1 at its breakpoint — or `body.phone` where an
 *     app sets that class itself.
 *
 * MENUS ARE DATA.  `menus` maps a group name to a function returning entries, each either `null` (a separator) or
 *   [label, run, disabled?, hint?, opts?]   label may carry a key after a TAB: 'SAVE project\tCtrl+S';
 *                                    disabled is a boolean or a function asked each time the list opens;
 *                                    opts.raw: the label is a NAME and is never translated (a language, a file);
 *                                    opts.current: the item is the chosen one (aria-current, class .on)
 *
 * 1.5.4 · LANGUAGES.  The group names and every item label go through t() (core/i18n.js); the key after the TAB
 *   never does.  A group is found by `data-menu` (its English name), never by the text it shows.  On a language
 *   change the group buttons are relabelled by kit.js and the open list is refilled.  Under dir="rtl" the bar sits
 *   on the other side of the wordmark.
 *
 * createMenubar({ opener, host, menus, label, phone, keep }) → { open(focus?), close(), openGroup(name), isOpen, items, bar, destroy() }
 *   One menubar per page: it owns the id `menubar`.  destroy() removes the bar and every listener it added.
 *   opener  the wordmark element (shell/wordmark.js)
 *   host    where the <nav id="menubar"> is appended (λWAVES: #lab)
 *   label   the opener's aria-label (default: '<word> — the <GROUPS> menus')
 *   phone   () => boolean, the phone law (default: the --phone sentinel, or body.phone)
 *   keep    () => Element[] — presses inside these do not close the bar (λWAVES: #rackToggle) */
import { el, label as writeLabel } from '../kit.js';
import { t, onLanguage } from '../core/i18n.js';
import { setVar } from '../core/perf.js';

export function createMenubar({ opener, host, menus, label, phone, keep } = {}) {
  if (!opener || !menus) return null;
  const isPhone = phone || (() => document.body.classList.contains('phone') || (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--phone')) || 0) >= 1);
  const life = new AbortController(), on = { signal: life.signal };
  const keepers = keep || (() => [document.getElementById('rackToggle')].filter(Boolean));
  const bar = el('nav', 'menubar', host || document.body); bar.id = 'menubar';
  try { bar.setAttribute('popover', 'manual'); } catch (_) {}
  bar.hidden = true;
  const canPop = typeof bar.showPopover === 'function';
  let openList = null;
  const closeLists = () => { for (const l of bar.querySelectorAll('.mb-list')) l.hidden = true; for (const b of bar.querySelectorAll('.mb-btn')) b.setAttribute('aria-expanded', 'false'); openList = null; };

  const names = Object.keys(menus);
  const word = (opener.querySelector('.lam') ? opener.querySelector('.lam').textContent : '') + (opener.querySelector('.word') ? opener.querySelector('.word').textContent : '');
  opener.tabIndex = 0;
  opener.setAttribute('role', 'button');
  opener.setAttribute('aria-haspopup', 'true');
  opener.setAttribute('aria-expanded', 'false');
  /* the opener's name, as one sentence with the group list joined by the language's own "and" */
  const nameOpener = () => {
    if (label) { opener.setAttribute('aria-label', label); return; }
    const lang = document.documentElement.lang || 'en', g = names.map((n) => t(n));
    let menus = g.slice(0, -1).join(', ') + (g.length > 1 ? ' and ' : '') + g[g.length - 1];   // English as it always was (no serial comma)
    if (!/^en(-|$)/.test(lang)) { try { menus = new Intl.ListFormat(lang, { type: 'conjunction' }).format(g); } catch (_) {} }
    opener.setAttribute('aria-label', t('{word} — the {menus} menus', { word, menus }));
  };
  nameOpener();

  /* `bar.hidden` is written in exactly ONE place, so aria-expanded can never disagree with it */
  const barShown = (v) => {
    const want = isPhone() ? true : !!v;
    bar.hidden = !want; if (!want) publish();
    if (canPop) { try { if (want && !bar.matches(':popover-open')) bar.showPopover(); else if (!want && bar.matches(':popover-open')) bar.hidePopover(); } catch (_) {} }
    opener.classList.toggle('menu-open', want); opener.setAttribute('aria-expanded', String(want));
  };
  const fills = new Map();
  for (const name of names) {
    const grp = el('div', 'mb-group', bar);
    const btn = writeLabel(el('button', 'mb-btn', grp), name); btn.type = 'button'; btn.dataset.menu = name;
    btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    const list = el('div', 'mb-list', grp); list.hidden = true;
    const fill = () => {
      list.innerHTML = '';
      for (const entry of menus[name]()) {
        if (!entry) { const sep = el('div', 'mb-sep', list); sep.setAttribute('role', 'separator'); continue; }
        const [text, run, dis, hint, opts] = entry;
        const it = el('button', 'mb-item', list); it.type = 'button';
        const kk = String(text).split('\t');
        if (opts && opts.raw) el('span', 'mb-lbl', it, kk[0]).translate = false; else writeLabel(el('span', 'mb-lbl', it), kk[0]);
        if (opts && opts.current) { it.classList.add('on'); it.setAttribute('aria-current', 'true'); }
        if (kk[1]) el('span', 'mb-key', it, kk[1]);
        if (hint) it.title = hint;
        if (typeof dis === 'function' ? dis() : dis === true) it.disabled = true;
        it.addEventListener('click', (e) => { e.stopPropagation(); closeLists(); barShown(false); try { if (run) run(); } catch (err) { console.warn('menu: ' + kk[0], err); } });   // the item dies with the list
      }
    };
    fills.set(list, fill);
    btn.addEventListener('click', (e) => { e.stopPropagation(); const was = openList === list; closeLists(); if (!was) { fill(); list.hidden = false; fitList(list); btn.setAttribute('aria-expanded', 'true'); openList = list; } });
    btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch' || !openList || openList === list) return; closeLists(); fill(); list.hidden = false; fitList(list); btn.setAttribute('aria-expanded', 'true'); openList = list; });
  }
  let barTimer = 0;
  /* ON A PHONE the bar may not run off the screen: it gets the width from the wordmark to the edge and wraps onto a
     second row there (shell.css), its first row level with the wordmark.  The desktop bar is one row, as it was. */
  const place = () => {
    const r = opener.getBoundingClientRect(), phone = isPhone();
    let rtl = false; try { rtl = bar.matches(':dir(rtl)'); } catch (_) {}
    bar.style.maxWidth = phone ? Math.max(120, (rtl ? r.right - opener.offsetWidth : window.innerWidth - r.left - opener.offsetWidth) - 16) + 'px' : '';
    bar.style.left = (rtl ? r.right - opener.offsetWidth - 8 - bar.offsetWidth : r.left + opener.offsetWidth + 8) + 'px';   // rtl: the wordmark's untransformed RIGHT edge stays put (locales.css turns its origin)
    const row = phone && bar.firstElementChild ? bar.firstElementChild.offsetHeight : bar.offsetHeight;
    bar.style.top = Math.max(0, r.top + r.height / 2 - row / 2) + 'px';
    publish();
  };
  /* the bar's foot, for the chrome below it: on a phone the kit's rack starts under it (rack.css reads --menubar-bottom
     on <html>); nothing is written on a desktop or while the bar is hidden */
  function publish() { setVar(document.documentElement, '--menubar-bottom', isPhone() && !bar.hidden ? Math.ceil(bar.getBoundingClientRect().bottom) + 'px' : null); }
  /* an open list stays whole on the screen: shifted sideways by as much as it would run off, never more */
  const fitList = (list) => {
    list.style.translate = '';
    const r = list.getBoundingClientRect(), W = window.innerWidth, M = 8;
    const dx = r.right > W - M ? Math.max(M - r.left, W - M - r.right) : r.left < M ? M - r.left : 0;
    if (dx) list.style.translate = Math.round(dx) + 'px 0';
  };
  const showBar = (focusIt) => {
    clearTimeout(barTimer); barShown(true); place();
    /* the bar sits late in the DOM; moving focus into it on a KEYBOARD open makes that irrelevant, and a pointer
       hover never steals the seat under the hand */
    if (focusIt) { const first = bar.querySelector('.mb-btn'); if (first) first.focus(); }
  };
  const hide = () => { closeLists(); barShown(false); };
  const hideBarSoon = () => { clearTimeout(barTimer); barTimer = setTimeout(() => { if (!openList) barShown(false); }, 400); };
  opener.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') showBar(); }, on);
  opener.addEventListener('click', () => { if (bar.hidden) showBar(); else hide(); }, on);
  opener.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return;   // Space belongs to the app (λWAVES: the transport)
    e.preventDefault();
    if (bar.hidden) showBar(true); else hide();
  }, on);
  opener.addEventListener('pointerleave', hideBarSoon, on);
  bar.addEventListener('pointerenter', () => clearTimeout(barTimer));
  bar.addEventListener('pointerleave', hideBarSoon);
  document.addEventListener('pointerdown', (e) => {
    if (bar.hidden || bar.contains(e.target) || opener.contains(e.target)) return;
    if (keepers().some((k) => k && k.contains(e.target))) return;
    hide();
  }, on);
  /* λWAVES wave 62: Escape closes the bar and the wordmark takes the focus back, so the keyboard is where it was */
  window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && !bar.hidden && !e.defaultPrevented) { e.preventDefault(); hide(); opener.focus(); } }, on);
  /* THE PHONE CROSSING (λWAVES wave 106): entering the breakpoint shows and PLACES the bar on the next frame;
     leaving it lets the bar go unless a list is open */
  let wasPhone = isPhone();
  const syncPhone = () => { const now = isPhone(); if (now === wasPhone) return; wasPhone = now; if (now) requestAnimationFrame(() => { if (isPhone()) showBar(false); }); else if (!openList) barShown(false); };
  window.addEventListener('resize', syncPhone, { passive: true, signal: life.signal });
  window.addEventListener('orientationchange', syncPhone, { passive: true, signal: life.signal });
  if (wasPhone) requestAnimationFrame(() => { if (isPhone()) showBar(false); });
  /* a bar placed before the wordmark's face has loaded sits where the fallback font ended (measured: 3 px right on a
     phone), and one left up through a resize sits where the old layout put it — so a shown bar is placed again */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!life.signal.aborted && !bar.hidden) place(); });
  window.addEventListener('resize', () => { if (!bar.hidden) place(); }, { passive: true, signal: life.signal });
  const offLang = onLanguage(() => { nameOpener(); if (openList) fills.get(openList)(); if (!bar.hidden) place(); });
  life.signal.addEventListener('abort', offLang);
  return {
    bar,
    open: showBar,
    close: () => { hide(); return true; },
    get isOpen() { return !bar.hidden; },
    /** open the bar and one group, as a click would */
    openGroup(name) { showBar(false); const b = [...bar.querySelectorAll('.mb-btn')].find((x) => x.dataset.menu === name); if (b && (!openList || openList !== b.nextElementSibling)) b.click(); return !!b; },
    get items() { return openList ? [...openList.querySelectorAll('.mb-item')].map((b) => b.textContent) : []; },
    destroy() { clearTimeout(barTimer); life.abort(); setVar(document.documentElement, '--menubar-bottom', null); try { if (canPop && bar.matches(':popover-open')) bar.hidePopover(); } catch (_) {} bar.remove();
      opener.classList.remove('menu-open'); for (const a of ['tabindex', 'role', 'aria-haspopup', 'aria-expanded', 'aria-label']) opener.removeAttribute(a); },
  };
}
