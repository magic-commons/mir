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
 * (Harvested from BASINS app/colour-controls.js wireTouches, fineHeld, forward.)  `fineHeld` and `fineGain` are re-exports
 * of kit.js's one law (watchTouches, fineHeld, gearOf). */
import { setKnobLaw } from '../kit.js';

/** the double-tap: two presses this close in time (ms) and place (px) are a home gesture (BASINS' numbers) */
export const TAP = Object.freeze({ ms: 300, px: 14 });

/** the kit's drag law as it stands now: { travel, fine, keyFine, faderFine, touchTravel } (setKnobLaw() with no argument only reads) */
export const lawNow = () => setKnobLaw();

/* THE SECOND FINGER and the fine gear's one decision are the kit's own (kit.js watchTouches, fineHeld, gearOf): one law, one tracker.
   The controls import them from kit.js by those names; `fineGain` is `gearOf` under the name the colour-controls test reads. */
export { fineHeld, gearOf as fineGain } from '../kit.js';

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
