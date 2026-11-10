/* faces-walk.mjs — THE FACES WALK (1.5.7-alpha.61, λWAVES 041 W3): under FACES · GLASS (REFRACTIVE, FROST), which pressable faces still paint a fill?
 * For each page: set the look on <body>, list every visible pressable element whose own background is not clear, grouped by its classes.
 * A diagnostic, not a gate: it prints, it never fails.  node tools/faces-walk.mjs [page …]   (MIR_BASE = the served root, default http://127.0.0.1:9743;
 * MIR_CDP_PORT; pages are paths under it, default the kit's gallery).  An app serves itself and passes its own pages. */
import { launch, sleep } from './cdp.mjs';
const BASE = process.env.MIR_BASE || 'http://127.0.0.1:9743';
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['gallery/controls.html', 'gallery/timeline.html', 'gallery/modulation.html', 'gallery/folders.html', 'gallery/gui.html', 'gallery/keyboard.html',
  'gallery/transport.html', 'gallery/rack.html', 'gallery/shell.html', 'gallery/panel-camera.html', 'gallery/panel-curves.html', 'gallery/panel-grade.html', 'gallery/panel-lanes.html', 'gallery/panel-ramp.html', 'gallery/panel-xy.html',
  'gallery/colour-controls.html', 'gallery/info.html', 'tests/fixtures/pattern.html', 'tests/fixtures/history-window.html'];
const p = await launch({ width: 1500, height: 1000 });
try {
  for (const page of pages) {
    await p.goto(BASE + '/' + page, 900); await sleep(1200);
    const r = JSON.parse(await p.eval(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      document.body.dataset.faces = 'glass'; document.body.dataset.card = 'refractive'; document.body.classList.add('frost'); await wait(400);
      const PRESS = 'button, select, input, textarea, [role="button"], [role="slider"], [role="switch"], [role="tab"], [role="option"], [role="menuitem"], .k-dial, .trig, .seg, .seg-b, .sw, .fd, .ro, .badge, .mir-chip, [class*="-btn"], [class*="-chip"], [class*="-cell"], [class*="-tab"], [class*="-field"], [class*="-well"], [class*="-seat"], [class*="-tool"], [class*="-pill"], [class*="-tile"], [class*="-step"], [class*="-key"]';
      const clear = (c) => c === 'transparent' || /rgba\\([^)]*,\\s*0\\)$/.test(c) || /\\/ 0\\)$/.test(c);
      const alpha = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return 1; const q = m[1].split(/[,\\/]/).map((x) => parseFloat(x)); return q.length > 3 ? q[3] : 1; };
      const out = {};
      for (const n of document.querySelectorAll(PRESS)) {
        if (!(n.checkVisibility ? n.checkVisibility() : n.getClientRects().length)) continue;
        if (n.matches('.on, [aria-pressed="true"], [aria-selected="true"], [aria-checked="true"], [aria-expanded="true"], :disabled, .dev-power, [data-kind="swatch"], .swatch, input[type="color"]') || n.closest('.on.seg-b, [hidden]')) continue;
        const cs = getComputedStyle(n), bc = cs.backgroundColor, bi = cs.backgroundImage;
        const filled = (!clear(bc) && alpha(bc) > 0.03) || (bi && bi !== 'none');
        if (!filled) continue;
        const owner = (n.closest('.mir-timeline, .mir-modwindow, .mir-folders, .mir-pattern, .mir-history, .mir-gui, .mir-transport, .mir-keyboard, .mir-rail, .mir-win, .dev, .mb-list, .mir-ctx, .mir-dialog, .mir-window-picker') || { className: '' }).className.toString().split(' ')[0] || 'page';
        const key = owner + ' › ' + n.tagName.toLowerCase() + '.' + [...n.classList].slice(0, 3).join('.');
        const o = out[key] || (out[key] = { n: 0, bg: bc, img: bi === 'none' ? '' : bi.slice(0, 48) }); o.n++;
      }
      return JSON.stringify(out);
    })()`));
    const rows = Object.entries(r).sort((a, b) => b[1].n - a[1].n);
    console.log('── ' + page + '  (' + rows.length + ' kinds still filled)');
    for (const [k, v] of rows.slice(0, 40)) console.log('   ' + String(v.n).padStart(3) + '  ' + k.padEnd(64) + ' ' + v.bg + (v.img ? '  img ' + v.img : ''));
  }
} finally { await p.close(); }
