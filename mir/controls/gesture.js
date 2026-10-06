/* controls/gesture.js — what the colour controls share: the fine gear, the double-tap home and the forwarded press.
 *
 * THE LAW IT KEEPS: ONE HAND LAW PER KIT.  The kit's knob law lives in kit.js (`setKnobLaw`: travel, touch travel and
 * the fine divisor); this file READS it, never owns a copy of its numbers, so Josh's "Shift is an eighth" is one
 * number that the arc knob, the hue swatch and the lane slider all follow.  What is here is what BASINS'
 * colour-controls.js added around that law and the kit had not got:
 *   · the FINE GEAR is engaged by ANY modifier (Shift, Alt, Ctrl, Meta) or by a SECOND FINGER down while one drags
 *     (BASINS window.js fineTouchHeld); engaging it moves nothing (the controls keep a virtual point);
 *   · the DOUBLE-TAP is two presses within 300 ms and 14 px, taken on the press itself;
 *   · a press a control stops is FORWARDED, so the menus, the rack's + list and the float layer's raise still hear
 *     "a press happened outside you".
 * (Harvested from BASINS app/colour-controls.js wireTouches, fineHeld, forward.)  When kit.js exports the one law
 * for every control (lane C2, wave 13) `fineHeld` here becomes a re-export of it. */
import { setKnobLaw } from '../kit.js';

/** the double-tap: two presses this close in time (ms) and place (px) are a home gesture (BASINS' numbers) */
export const TAP = Object.freeze({ ms: 300, px: 14 });

/** the kit's drag law as it stands now: { travel, fine, keyFine, faderFine, touchTravel } (setKnobLaw() with no argument only reads) */
export const lawNow = () => setKnobLaw();

/* THE SECOND FINGER.  A touch that is down while another pointer drags is the fine gear on a glass; a primary
   touch means no other touch is down, which clears a lost pointerup. */
const touches = new Set();
let wired = false;
export function wireTouches() {
  if (wired || typeof document === 'undefined') return;
  wired = true;
  const opt = { capture: true, passive: true };
  document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; if (e.isPrimary) touches.clear(); touches.add(e.pointerId); }, opt);
  const up = (e) => touches.delete(e.pointerId);
  document.addEventListener('pointerup', up, opt);
  document.addEventListener('pointercancel', up, opt);
}
const otherTouch = (id) => { for (const t of touches) if (t !== id) return true; return false; };

/** the fine gear's one decision: any modifier held, or a second finger down (`id` is the dragging pointer) */
export const fineHeld = (ev, id) => !!(ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey || otherTouch(id));
/** the gain of the hand now: 1, or 1 / the kit's fine divisor (`fine` is a control's own divisor, as the kit's `o.fine`) */
export const fineGain = (ev, id, fine) => (fineHeld(ev, id) ? 1 / (fine > 0 ? fine : lawNow().fine) : 1);

/** tapHome(onHome) → (e) → true when this press is the second of a double-tap (and home has been taken) */
export function tapHome(onHome) {
  let last = null;
  return (e) => {
    const now = performance.now();
    if (last && now - last.t < TAP.ms && Math.hypot(e.clientX - last.x, e.clientY - last.y) <= TAP.px) { last = null; onHome(e); return true; }
    last = { t: now, x: e.clientX, y: e.clientY };
    return false;
  };
}

/** forward(root, e) — a press the control stopped, handed on to the page: a copy dispatched on the control root's
 *  PARENT (so the root's own capture listener never meets it again), bubbling to the document's outside-press
 *  closers and the float layer's raise */
export function forward(root, e) {
  const up = root.parentElement; if (!up) return;
  try { up.dispatchEvent(new PointerEvent(e.type, e)); } catch (_) { /* a press that cannot be copied is not forwarded */ }
}

/** the pure helpers the controls and their tests share */
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const frac = (v) => v - Math.floor(v);
