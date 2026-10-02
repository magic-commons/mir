/* MIR · shell/wordmark.js — the app's name in the corner, and the MARK beside it.
 *
 * The DOM is λWAVES' (index.html #title), which BASINS copied byte for byte:
 *   <div id="title"><span class="lam">λ</span><span class="word">WAVES</span><svg class="mark">…nine squares…</svg><span class="ms">…</span></div>
 * `.lam` is the optional lead glyph (λWAVES' λ; BASINS has none), `.word` the name set in LW Title (printable ASCII),
 * `.mark` the nine squares rotated 45° — the square Josh calls the MIR logo — and `.ms` a subtitle the shell keeps
 * hidden.  The squares' fills are painted by shell/accent.js from the palette wheel; the ones written here are
 * λWAVES' own first-paint colours, so the mark is never blank before an accent runs.
 *
 * The wordmark is also the MENU OPENER: shell/menubar.js takes it as `opener`.
 *
 * 1.5.4 · A NAME IS NEVER TRANSLATED AND A MARK NEVER MIRRORS: the element says translate="no" (so a browser's own
 * page translator leaves it alone too) and dir="ltr", so λ stays before WAVES under an Arabic page.
 *
 * 1.5.0-alpha.12 · AN APP'S OWN ART (BASINS index.html #title, about.css §2).  `svg` seats the app's lettering in the
 * word's place: one SVG (markup or an element) that inks itself, or `{ dark, light }`, two image URLs of which the
 * theme shows one (wordmark-dark carries white ink, for a dark backdrop: BASINS' asset naming).  `mark` replaces the
 * nine squares with the app's own symbol; it is kept in `.word`, unseen, because a loading seat clones `#title .mark`
 * (BASINS keeps its half-continent there).  The art is always the app's: the kit only seats it.
 *
 * THE PALETTE DIAMOND (BASINS brand-motion.js createMirDiamond / installPaletteCycle): the same nine squares in MIR's
 * nine colours (JL-LOGOS mir-light.svg's rainbow diamond, in its row order).  While a MOUSE hovers its seat the colours
 * step one square every 240 ms, exact swatches, never interpolated; leaving, a blur or a hidden page puts them back.
 * Nothing runs unless a mouse is on it, and nothing runs under reduced or no motion (core/motion.js policy).
 *
 * wordmark(parent, { lead, word, sub, id, svg, mark }) → the #title element */
import { motionPolicy } from '../core/motion.js';
const SVG = 'http://www.w3.org/2000/svg';
/** MIR's nine swatches, in JL-LOGOS/light/mir-light.svg's rainbow-diamond row order (BASINS brand-motion.js) */
export const MIR_PALETTE = Object.freeze(['#f15b66', '#f5bf5e', '#5bcfc2', '#f58b53', '#68cb83', '#767fd3', '#bad969', '#5ca9e4', '#b979d0']);
/** the cycle's step (BASINS: setInterval 240) */
export const PALETTE_STEP = 240;
/** paletteAt(i, offset, colors) — the swatch square i wears after `offset` steps (pure; never a blend) */
export const paletteAt = (i, offset = 0, colors = MIR_PALETTE) => colors[(i + offset) % colors.length];
const FIRST_PAINT = ['#5ee7d8', '#78e1f0', '#f5f7fa', '#d97ce8', '#2b3f7a', '#5ee7d8', '#ffbe5a', '#d97ce8', '#78e1f0'];

/** the nine-square mark, as λWAVES and BASINS draw it (viewBox 0 0 10 10, squares 2.25 on a 2.25 pitch, rotated 45°) */
export function markSvg() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'mark'); svg.setAttribute('viewBox', '0 0 10 10'); svg.setAttribute('aria-hidden', 'true');
  const g = document.createElementNS(SVG, 'g'); g.setAttribute('transform', 'rotate(45 5 5)'); svg.appendChild(g);
  const at = [1.7, 3.95, 6.2];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const r = document.createElementNS(SVG, 'rect');
    r.setAttribute('x', String(at[col])); r.setAttribute('y', String(at[row]));
    r.setAttribute('width', '2.25'); r.setAttribute('height', '2.25'); r.setAttribute('fill', FIRST_PAINT[row * 3 + col]);
    g.appendChild(r);
  }
  return svg;
}

/** installPaletteCycle(target, tiles, colors) — BASINS' hover cycle: a mouse on `target` steps the tiles' fills by one
 *  swatch every PALETTE_STEP ms; leave, cancel, a window blur or a hidden page stops it and repaints the rest order.
 *  A timer runs only while a mouse hovers (it is the animation, not a poller).  → destroy() */
export function installPaletteCycle(target, tiles, colors = MIR_PALETTE) {
  const view = target.ownerDocument.defaultView, doc = target.ownerDocument;
  let timer = 0, offset = 0, hovered = false;
  const paint = () => tiles.forEach((tile, i) => tile.setAttribute('fill', paletteAt(i, offset, colors)));
  const stop = () => { if (timer) view.clearTimeout(timer); timer = 0; offset = 0; paint(); };
  const step = () => { timer = 0; if (!hovered) return; offset = (offset + 1) % colors.length; paint(); timer = view.setTimeout(step, PALETTE_STEP); };
  const start = () => { if (!hovered || timer || motionPolicy() !== 'full' || doc.hidden) return; timer = view.setTimeout(step, PALETTE_STEP); };
  const enter = (e) => { if (e.pointerType !== 'mouse') return; hovered = true; start(); };
  const leave = () => { hovered = false; stop(); };
  const visibility = () => { if (doc.hidden) leave(); };
  const life = new AbortController(), on = { signal: life.signal };
  paint();
  target.addEventListener('pointerenter', enter, on);
  target.addEventListener('pointerleave', leave, on);
  target.addEventListener('pointercancel', leave, on);
  view.addEventListener('blur', leave, on);
  doc.addEventListener('visibilitychange', visibility, on);
  return () => { leave(); life.abort(); };
}
/** createMirDiamond(target, { colors }) — BASINS' palette diamond (`svg.mod-palette-mark`, the nine squares with
 *  rx .22) appended to `target`, its cycle installed on `target`.  → { diamond, tiles, destroy() } */
export function createMirDiamond(target, { colors = MIR_PALETTE } = {}) {
  const diamond = document.createElementNS(SVG, 'svg');
  diamond.setAttribute('viewBox', '0 0 10 10'); diamond.setAttribute('class', 'mod-palette-mark');
  diamond.setAttribute('aria-hidden', 'true'); diamond.setAttribute('focusable', 'false');
  const g = document.createElementNS(SVG, 'g'); g.setAttribute('transform', 'rotate(45 5 5)'); diamond.appendChild(g);
  const tiles = Array.from({ length: 9 }, (_, i) => {
    const r = document.createElementNS(SVG, 'rect');
    r.setAttribute('x', String(1.7 + (i % 3) * 2.25)); r.setAttribute('y', String(1.7 + Math.floor(i / 3) * 2.25));
    r.setAttribute('width', '2.25'); r.setAttribute('height', '2.25'); r.setAttribute('rx', '.22');
    g.appendChild(r); return r;
  });
  target.appendChild(diamond);
  return { diamond, tiles, destroy: installPaletteCycle(target, tiles, colors) };
}

/** the app's art as a node: an Element as given, SVG markup parsed (its root must be <svg>) */
function artNode(art, cls) {
  if (!art) return null;
  if (typeof art === 'object' && art.nodeType === 1) { if (cls) art.classList.add(cls); return art; }
  if (typeof art !== 'string') return null;
  const box = document.createElement('div'); box.innerHTML = art.trim();
  const n = box.firstElementChild; if (!n || n.localName !== 'svg') return null;
  n.setAttribute('aria-hidden', 'true'); n.setAttribute('focusable', 'false'); if (cls) n.classList.add(cls);
  return n;
}

export function wordmark(parent, { lead = '', word = 'MIR', sub = '', id = 'title', svg = null, mark = null } = {}) {
  const t = document.createElement('div'); t.id = id; t.translate = false; t.dir = 'ltr';
  if (lead) { const s = document.createElement('span'); s.className = 'lam'; s.textContent = lead; t.appendChild(s); }
  const w = document.createElement('span'); w.className = 'word'; t.appendChild(w);
  const own = artNode(mark, 'mark');
  if (svg) {
    /* BASINS: <span class="word" role="img" aria-label="BASINS"> holds the art (and the mark, unseen) */
    w.setAttribute('role', 'img'); w.setAttribute('aria-label', word); w.dataset.art = '';
    if (own) w.appendChild(own);
    if (typeof svg === 'object' && svg.nodeType !== 1 && (svg.dark || svg.light)) {
      for (const k of ['dark', 'light']) if (svg[k]) { const img = document.createElement('img'); img.className = 'wordmark wordmark-' + k; img.src = svg[k]; img.alt = ''; img.draggable = false; w.appendChild(img); }
    } else { const art = artNode(svg, 'wordmark'); if (art) w.appendChild(art); else w.textContent = word; }
    if (!own) t.appendChild(markSvg());
  } else {
    w.textContent = word;
    t.appendChild(own || markSvg());
  }
  const ms = document.createElement('span'); ms.className = 'ms'; ms.textContent = sub; t.appendChild(ms);
  if (parent) parent.appendChild(t);
  return t;
}
