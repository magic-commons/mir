/* history/history-list.js — THE HISTORY LIST: a view of one history (history.js) in a host element, plus its keys.
 *
 * THE LAW IT KEEPS (BASINS app/history-window.js, lifted to the kit): the list is a VIEW.  It reads `history.entries()`,
 * draws newest first with the row you stand on marked (past · current · future), a click on a row is `history.goto(i)`,
 * and UNDO / REDO are the kit's `trig`s, dimmed when there is nothing to do.  It repaints at most once a frame and only
 * while its host is visible; it writes the DOM through the kit's `setText`, so an unchanged count costs nothing.
 * It owns no frame, no placement and no persistence — the window around it is the host's.  Pair with history.css.
 *
 *   historyList(history, host, { limitLine = true }) → { root, paint, destroy }
 *   installHistoryKeys(history, { target = window, canAct = () => true, onEmpty }) → remove
 *       Ctrl/Cmd+Z undo · Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo, in the capture phase; a text field keeps its own undo.
 *       canAct() false (a render running) lets the key through untouched; onEmpty(redo) when there was nothing to do.
 *   editableTarget(el) → true for a field that owns its own undo
 */
import { el, trig, label, ariaLabel } from '../kit.js';
import { setText } from '../core/perf.js';

const TEXT_TYPES = /^(text|search|email|url|password|tel|number)$/i;
export const editableTarget = (t) => !!t && (t.isContentEditable || t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && TEXT_TYPES.test(t.type || 'text')));

export function historyList(history, host, o = {}) {
  const root = el('div', 'hist', host);
  const tools = el('div', 'hist-tools', root);
  const undo = trig({ label: 'UNDO', title: 'Undo (Ctrl+Z)', onFire: () => history.undo() });
  const redo = trig({ label: 'REDO', title: 'Redo (Ctrl+Shift+Z, Ctrl+Y)', onFire: () => history.redo() });
  tools.append(undo.root, redo.root);
  const list = el('div', 'hist-list', root);
  list.setAttribute('role', 'listbox'); ariaLabel(list, 'history rows');
  const count = o.limitLine === false ? null : el('div', 'hist-count', root);
  list.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.hist-row'); if (b) history.goto(+b.dataset.i); });

  let raf = 0, dead = false;
  function paint() {
    raf = 0;
    if (dead || !root.isConnected || root.offsetParent === null) return;   // hidden or gone: nothing to draw, the next show repaints
    const rows = history.entries(), out = [];
    for (let j = rows.length - 1; j >= 0; j--) {
      const r = rows[j], b = el('button', 'hist-row hist-' + r.state);
      b.type = 'button'; b.dataset.i = String(r.i); b.setAttribute('role', 'option');
      b.title = r.label + (r.state === 'current' ? ' — where the project stands' : ' — return here');
      if (r.state === 'current') { b.setAttribute('aria-current', 'true'); b.setAttribute('aria-selected', 'true'); }
      el('span', 'hist-i', b).textContent = String(r.i + 1);
      el('span', 'hist-lbl', b).textContent = r.label;
      if (r.domain) label(el('span', 'hist-dom', b), r.domain);   // the case is the sheet's: var(--label-case, uppercase)
      out.push(b);
    }
    list.replaceChildren(...out);
    undo.root.disabled = !history.canUndo; redo.root.disabled = !history.canRedo;
    if (count) setText(count, history.length + ' of ' + history.limit + ' · ' + (history.bytes / 1048576).toFixed(1) + ' of ' + Math.round(history.maxBytes / 1048576) + ' MB');
    const here = list.querySelector('[aria-current]');   // the row you stand on stays in view
    if (here && list.clientHeight) { const b = list.getBoundingClientRect(), a = here.getBoundingClientRect(); if (a.top < b.top || a.bottom > b.bottom) list.scrollTop += a.top < b.top ? a.top - b.top : a.bottom - b.bottom; }
  }
  const off = history.subscribe(() => { if (!raf && !dead) raf = requestAnimationFrame(paint); });
  paint();
  return { root, paint, destroy() { dead = true; off(); if (raf) cancelAnimationFrame(raf); root.remove(); } };
}

export function installHistoryKeys(history, { target = window, canAct = () => true, onEmpty } = {}) {
  const onKey = (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || (e.code !== 'KeyZ' && e.code !== 'KeyY')) return;
    if (editableTarget(e.target) || !canAct()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const isRedo = e.code === 'KeyY' || e.shiftKey;
    const ok = isRedo ? history.redo() : history.undo();
    if (!ok && onEmpty) onEmpty(isRedo);
  };
  target.addEventListener('keydown', onKey, true);
  return () => target.removeEventListener('keydown', onKey, true);
}
