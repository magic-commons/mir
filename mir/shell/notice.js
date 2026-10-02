/* MIR · shell/notice.js — THE NOTICE: a short message in one corner that leaves by itself.
 *
 * Harvested from NEBULA's `#notice` (lab/index.html:213, a role=status toast with a × and `safe()` sending thrown errors
 * into it, main.js:43-47), copied into SOLEIL, AUTOMATA and EARTH line for line, and BASINS' `#toast`.  Each was a
 * single slot — a new message replaced the old one, and nothing timed out.  This one stacks and leaves.
 *
 * THE LAWS IT KEEPS
 *   · NOTHING BLOCKS THE STAGE.  The stack takes no press (`pointer-events: none`); only a notice itself does.
 *   · POLITE.  The stack is a `role=status` live region (`aria-live=polite`): a reader hears it after what it is saying.
 *   · IT LEAVES BY ITSELF, and HOVER OR FOCUS HOLDS IT: the time left pauses while the pointer is on it or the focus is
 *     in it, and runs on when they leave.  `ms: 0` stays until closed.
 *   · STACKED IN ONE CORNER (the end of the bottom edge), newest at the bottom, at most `max` (the oldest goes first).
 *   · MOTION through core/motion.js `presence`: under reduced motion it only fades; under off it just appears.
 *   · ENGLISH IN, translated by `label()`; the text is one whole sentence (use t('{n} saved', { n }) for a value).
 *
 * notice(text, { kind = 'info' | 'ok' | 'warn' | 'error', ms, action: { label, run }, max = 4 }) → { close(), root }
 *   ms defaults to 5 s, 9 s for an error.
 * guarded(fn) → fn's result; a throw (or a rejected promise) becomes an error notice instead (NEBULA's safe()). */
import { el, label, ariaLabel, trig } from '../kit.js';
import { presence } from '../core/motion.js';

let stack = null;
const live = new Set();

function host() {
  if (stack && stack.isConnected) return stack;
  stack = el('div', 'mir-notices', document.body);
  stack.setAttribute('role', 'status'); stack.setAttribute('aria-live', 'polite');
  return stack;
}

export function notice(text, { kind = 'info', ms, action = null, max = 4 } = {}) {
  const life = new AbortController(), on = { signal: life.signal };
  const root = el('div', 'mir-notice glass'); root.dataset.kind = kind; root.hidden = true;
  label(el('span', 'mir-notice-text', root), String(text));
  if (action && action.label) {
    const a = trig({ label: action.label, onFire: () => { try { action.run && action.run(); } finally { close(); } } });
    root.appendChild(a.root);
  }
  const x = el('button', 'mir-notice-x', root, '×'); x.type = 'button'; ariaLabel(x, 'dismiss');
  x.addEventListener('click', () => close(), on);
  host().appendChild(root);
  live.add(root);
  while (live.size > max) { const old = live.values().next().value; old.__close(); }
  presence(root, true);

  let left = ms === undefined ? (kind === 'error' ? 9000 : 5000) : ms, timer = 0, since = 0, holds = 0;
  const run = () => { if (!left || holds) return; since = performance.now(); timer = setTimeout(close, left); };
  const hold = () => { if (holds++ === 0 && timer) { clearTimeout(timer); timer = 0; left = Math.max(800, left - (performance.now() - since)); } };
  const free = () => { if (holds > 0 && --holds === 0) run(); };
  root.addEventListener('pointerenter', hold, on); root.addEventListener('pointerleave', free, on);
  root.addEventListener('focusin', hold, on);
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) free(); }, on);
  run();

  let closed = false;
  function close() {
    if (closed) return; closed = true;
    clearTimeout(timer); life.abort(); live.delete(root);
    presence(root, false).then(() => root.remove());
  }
  root.__close = close;
  return { close, root };
}

/** guarded(fn) — run fn; a throw or a rejection becomes an error notice with its message */
export function guarded(fn) {
  const say = (e) => notice(String((e && e.message) || e), { kind: 'error' });
  try { const r = fn(); if (r && typeof r.catch === 'function') r.catch(say); return r; } catch (e) { say(e); return null; }
}
