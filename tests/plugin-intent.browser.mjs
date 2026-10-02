/* plugin-intent.browser.mjs — the modulation plugin keeps docs/INTENT.md's plugin rows (1.5.0-alpha.3), read from computed style.
 *   ON       an ON switch in a device wears a neutral frost face and a thin rim — never an accent fill (L27/L29)
 *   PANE     a device card floats at the house's one pane height: its shadow IS the house's --glass-shadow (L03/L04/L06)
 *   RELIEF   the dial wears the one raised relief, the house's --neu-raise (L16/L17); no bevel token is left (L61/L62)
 *   PRESSED  a held add button is the press wash and ONE scale (--state-press-scale .96), with no translate (L21, S1)
 *   SCRIM    the matrix dialog's ::backdrop paints nothing and blurs nothing (L71)
 * Run by tests/run.mjs with MIR_BASE set; standalone: MIR_BASE=http://127.0.0.1:8790 node tests/plugin-intent.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8790';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  — ' + detail}`);
const p = await launch({ width: 1440, height: 1000 });
try {
  await p.goto(BASE + '/gallery/index.html', 1200);
  for (let i = 0; i < 40 && !(await p.eval('!!window.__GALLERY')); i++) await sleep(100);
  await p.eval(`(() => { const w = document.querySelector('.mir-modwindow'); for (const k of ['lfo', 'env', 'audio']) w.modwindow.addDevice({ kind: k, id: k });
    document.querySelector('.m2dev.lfo .m2swb').classList.add('on'); document.querySelector('.m2macadd').scrollIntoView({ block: 'center' }); return true; })()`);
  await sleep(400);
  for (const theme of ['dark', 'light']) {
    await p.eval(`window.__GALLERY.setTheme('${theme}'); true`); await sleep(500);
    const r = JSON.parse(await p.eval(`(() => {
      const cs = (s, pe) => getComputedStyle(document.querySelector(s), pe || null);
      const probe = document.createElement('div'); probe.style.boxShadow = 'var(--glass-shadow)'; probe.style.position = 'absolute'; document.body.appendChild(probe);
      const house = getComputedStyle(probe).boxShadow; probe.style.boxShadow = 'var(--neu-raise)'; const raise = getComputedStyle(probe).boxShadow; probe.remove();
      const sw = cs('.m2dev.lfo .m2swb.on');
      return JSON.stringify({ swBg: sw.backgroundColor, swSh: sw.boxShadow, dev: cs('.m2dev.lfo').boxShadow, house, raise, dial: cs('.m2dev .m2dialink', '::before').boxShadow,
        bevel: getComputedStyle(document.querySelector('.mir-modwindow')).getPropertyValue('--glass-bevel') });
    })()`));
    const rgba = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const [R, G, B, A = 1] = rgba(r.swBg);
    check(`${theme} · an ON switch has a frost face, not an accent fill (${r.swBg})`, A > 0 && Math.max(R, G, B) - Math.min(R, G, B) <= 8, r.swBg);
    check(`${theme} · an ON switch has a thin rim`, /inset/.test(r.swSh) && /0px 0px 0px 1px/.test(r.swSh), r.swSh);
    check(`${theme} · a device card's shadow is the house's pane height`, r.dev === r.house, `${r.dev} vs ${r.house}`);
    check(`${theme} · the dial wears the house's one raised relief`, r.dial === r.raise, `${r.dial} vs ${r.raise}`);
    check(`${theme} · no bevel token is left on the window`, r.bevel.trim() === '', r.bevel);
  }
  /* a real press on ADD MACRO, hit-tested first */
  const c = JSON.parse(await p.eval(`(() => { const e = document.querySelector('.m2macadd'); const b = e.getBoundingClientRect(); const x = b.left + b.width / 2, y = b.top + b.height / 2;
    return JSON.stringify({ x, y, hit: document.elementFromPoint(x, y) === e || e.contains(document.elementFromPoint(x, y)) }); })()`));
  check('the add button is the element under the pointer', c.hit);
  await p.mouse(c.x, c.y); await p.mouse(c.x, c.y, 'mousePressed'); await sleep(350);
  const held = JSON.parse(await p.eval(`(() => { const s = getComputedStyle(document.querySelector('.m2macadd')); return JSON.stringify({ scale: s.scale, transform: s.transform, active: document.querySelector('.m2macadd').matches(':active') }); })()`));
  await p.mouse(c.x, c.y, 'mouseReleased');
  check(`a held add button scales by one press scale, no translate (${held.scale}, ${held.transform})`, held.active && held.scale === '0.96' && held.transform === 'none', JSON.stringify(held));
  /* the matrix dialog, as a host opens it inside the window */
  const bd = JSON.parse(await p.eval(`(() => { const d = document.createElement('dialog'); d.className = 'mod-matrix'; d.textContent = 'MATRIX'; document.querySelector('.mir-modwindow').appendChild(d); d.showModal();
    const s = getComputedStyle(d, '::backdrop'); const out = JSON.stringify({ bg: s.backgroundColor, bf: s.backdropFilter }); d.close(); d.remove(); return out; })()`));
  check(`the matrix dialog has no scrim and no blur behind it (${bd.bg}, ${bd.bf})`, /^rgba\(0, 0, 0, 0\)$|^transparent$/.test(bd.bg) && bd.bf === 'none', JSON.stringify(bd));
  check('no page errors', !p.logs.some((l) => /EXCEPTION/.test(l)), p.logs.join(' | '));
} finally { await p.close(); }

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nPASS plugin-intent: all ${results.length}`);
process.exit(failed ? 1 : 0);
