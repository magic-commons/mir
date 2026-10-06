/* Keyboard input for normalized host sliders. Space remains the transport key.
 * One hundredth of the range per arrow; Shift is the kit's one fine gear (an eighth of that, kit.js setKnobLaw: 1.5.0-alpha.13, it was a tenth). */
import { setKnobLaw } from './kit.js';

export function bindSliderKeys(element, { get, set, editable = () => true }) {
  element.tabIndex = 0;
  element.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || !editable()) return;
    const step = event.shiftKey ? .01 / setKnobLaw().fine : .01;
    let value;
    switch (event.key) {
      case 'ArrowRight': case 'ArrowUp': value = get() + step; break;
      case 'ArrowLeft': case 'ArrowDown': value = get() - step; break;
      case 'Home': value = 0; break;
      case 'End': value = 1; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    set(Math.max(0, Math.min(1, value)));
  });
}
