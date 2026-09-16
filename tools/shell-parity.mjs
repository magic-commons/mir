/* shell-parity.mjs — the proof that MIR's shell (wordmark, menubar, notebook, ABOUT) is λWAVES' shell.
 *
 *   node tools/shell-parity.mjs capture <name> <url> <out-dir>     drive one page through every state; write
 *                                                                   <out-dir>/<name>/<state>.png and styles.json
 *   node tools/shell-parity.mjs compare <out-dir> <a> <b>          per state: computed styles, own text and boxes
 *                                                                   element by element, then pixels; writes
 *                                                                   <state>.pair.png and parity-report.txt; exit 1
 *                                                                   on ANY difference, pixels included
 *
 * THE STATES.  Desktop 1440 × 900, each in LIGHT and DARK: the menubar with FILE open · the same with the pointer
 * really over its second item (CSS :hover through the input pipeline) · NOTES · NOTES previewed (markdown, a table,
 * inline and display maths — the renderer and KaTeX must have run) · ABOUT.  Then a PHONE, 390 × 844 with touch and
 * (hover: none), LIGHT and DARK: idle (the bar must already be shown) · ABOUT (the notebook is the whole screen).
 *
 * A page is driven through a contract it exposes, `window.__MIR_SHELL` = { theme(t), menu(name|null),
 * notebook(face|null), parts: { notebook } } (gallery/shell.html publishes it).  λWAVES predates the contract, so
 * its adapter is written here from its own debug API (`__LW`).  The racks, transport and banner are hidden in both
 * so the pictures compare the shell alone, over the same ground.
 *
 * WHAT IT CANNOT SEE, said plainly: behaviour (timing, focus, persistence — probe those separately), states not in
 * the list above, and differences smaller than 9 of 255 in a channel (text antialiasing lives there; the browser
 * renders text grayscale so the compositing layer cannot change it — see tools/cdp.mjs). */
import fs from 'node:fs'; import path from 'node:path';
import { launch, sleep } from './cdp.mjs';

const MARKDOWN = '# Heading\n\nA paragraph with *emphasis*, **strength**, `code` and a [link](https://magic-commons.com/).\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nInline $E = mc^2$ and display:\n\n$$\\int_0^1 x^2\\,dx = \\tfrac13$$\n\n> a quote';
const DESK = [], PHONE = [];
for (const theme of ['light', 'dark']) {
  for (const s of ['menu', 'hover', 'notes', 'view', 'about']) DESK.push({ id: `${theme}-${s}`, theme, s });
  for (const s of ['idle', 'about']) PHONE.push({ id: `phone-${theme}-${s}`, theme, s, phone: true });
}
const STATES = [...DESK, ...PHONE];

const HIDE = `for (const s of ['#rack','#rackL','#transport','#badges','#banner','#rackToggle','#rackAdd','#rackFav','#floats','#rackAddList','#rackFavList','#sheet','#warnPane','canvas']) for (const e of document.querySelectorAll(s)) e.style.visibility = 'hidden';`;
const ADAPT = {
  lambdawaves: {
    ready: `typeof __LW === 'object' && !!__LW.layout && !!__LW.layout.notebook`,
    theme: (t) => `__LW.setTheme(${JSON.stringify(t)})`,
    menu: (n) => n ? `(__LW.layout.menu.open(), [...document.querySelectorAll('#menubar .mb-btn')].find((b) => b.textContent === ${JSON.stringify(n)}).click())` : `__LW.layout.menu.isOpen && !document.body.classList.contains('phone') ? __LW.layout.menu.close() : null`,
    notebook: (f) => f ? `__LW.layout.notebook.open(${JSON.stringify(f)})` : `__LW.layout.notebook.close()`,
    notes: (text, mode) => `(__LW.layout.notebook.text = ${JSON.stringify(text)}, __LW.layout.notebook.setMode(${JSON.stringify(mode)}))`,
  },
  mir: {
    ready: `typeof __MIR_SHELL === 'object'`,
    theme: (t) => `__MIR_SHELL.theme(${JSON.stringify(t)})`,
    menu: (n) => n ? `__MIR_SHELL.menu(${JSON.stringify(n)})` : `(getComputedStyle(document.documentElement).getPropertyValue('--phone').trim() === '1' ? null : __MIR_SHELL.menu(null))`,
    notebook: (f) => `__MIR_SHELL.notebook(${JSON.stringify(f)})`,
    notes: (text, mode) => `(__MIR_SHELL.parts.notebook.text = ${JSON.stringify(text)}, __MIR_SHELL.parts.notebook.setMode(${JSON.stringify(mode)}))`,
  },
};

const PROPS = ['display', 'position', 'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'border-top-width', 'border-top-style', 'border-top-color', 'border-right-color', 'border-bottom-width', 'border-bottom-color', 'border-left-width', 'border-left-color',
  'border-top-left-radius', 'border-bottom-right-radius', 'background-color', 'background-image', 'box-shadow', 'backdrop-filter', 'filter', 'opacity',
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-decoration-line',
  'text-shadow', 'white-space', 'outline-style', 'outline-width', 'outline-color', 'pointer-events', 'transition-property', 'transition-duration',
  'gap', 'align-items', 'justify-content', 'flex-direction', 'z-index', 'cursor', 'visibility', 'overflow-x', 'overflow-y', 'transform', 'resize', 'fill',
  'top', 'right', 'bottom', 'left', 'inset', 'content'];

/* the page-side collector: every visible element under the shell roots, keyed by its path — its styles (and
   ::before/::after where they exist), its OWN text, and its box */
const COLLECT = `(() => {
  const PROPS = ${JSON.stringify(PROPS)};
  const roots = { title: document.getElementById('title'), menubar: document.getElementById('menubar'), notebook: document.getElementById('notebook') };
  const out = {}, boxes = {};
  const keyOf = (e, root, rootName) => { const parts = []; for (let n = e; n && n !== root; n = n.parentElement) {
      const sib = [...n.parentElement.children].filter((c) => c.tagName === n.tagName); const cls = [...n.classList].filter((c) => !/^(turn|busy|sq\\d)$/.test(c)).sort().join('.');
      parts.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : '') + (sib.length > 1 ? ':' + sib.indexOf(n) : '')); }
    return rootName + (parts.length ? ' > ' + parts.join(' > ') : ''); };
  const pick = (cs) => { const o = {}; for (const p of PROPS) o[p] = cs.getPropertyValue(p); return o; };
  const r2 = (v) => Math.round(v * 100) / 100;
  for (const [name, root] of Object.entries(roots)) {
    if (!root) continue;
    for (const e of [root, ...root.querySelectorAll('*')]) {
      if (e.closest('.nb-projectsface')) continue;
      if (!(e.checkVisibility ? e.checkVisibility() : e.getClientRects().length)) continue;
      const k = keyOf(e, root, name), b = e.getBoundingClientRect();
      const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.data).join('').replace(/\\s+/g, ' ').trim();
      out[k] = { ...pick(getComputedStyle(e)), '#text': own, '#box': [b.x, b.y, b.width, b.height].map(r2).join(' ') };
      for (const pe of ['::before', '::after']) { const cs = getComputedStyle(e, pe); if (cs.content && cs.content !== 'none' && cs.content !== 'normal') out[k + ' ' + pe] = pick(cs); }
    }
    const rb = root.getBoundingClientRect(); boxes[name] = { x: rb.x, y: rb.y, w: rb.width, h: rb.height, shown: root.checkVisibility ? root.checkVisibility() : rb.width > 0 };
  }
  const list = document.querySelector('#menubar .mb-list:not([hidden])');
  if (list) { const r = list.getBoundingClientRect(); boxes.list = { x: r.x, y: r.y, w: r.width, h: r.height, shown: true }; }
  return JSON.stringify({ styles: out, boxes, body: { theme: document.body.dataset.theme, card: document.body.dataset.card, cls: document.body.className } });
})()`;

async function runStates(p, A, states, dir, W, H) {
  const result = {};
  for (const st of states) {
    await p.eval(A.menu(null)); await p.eval(A.notebook(null));
    await p.eval(A.theme(st.theme)); await sleep(300);
    await p.mouse(W - 5, H - 5);                                    // the pointer parked where no shell part is
    if (st.s === 'menu' || st.s === 'hover') await p.eval(A.menu('FILE'));
    else if (st.s === 'notes' || st.s === 'about') await p.eval(A.notebook(st.s));
    else if (st.s === 'view') {
      await p.eval(A.notebook('notes')); await p.eval(A.notes(MARKDOWN, 'view'));
      for (let i = 0; i < 40 && !(await p.eval(`!!document.querySelector('#notebook .nb-view .katex-display')`)); i++) await sleep(150);
    }
    if (st.s === 'hover') {
      const r = JSON.parse(await p.eval(`JSON.stringify((() => { const b = document.querySelectorAll('#menubar .mb-list:not([hidden]) .mb-item')[1].getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })())`));
      await p.mouse(r[0], r[1]);
    }
    await p.eval(`document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
    await p.eval(`document.fonts.ready.then(() => true)`); await sleep(st.phone ? 900 : 500);
    const snap = JSON.parse(await p.eval(COLLECT)); result[st.id] = snap;
    const B = snap.boxes; let clip;
    const union = (bs) => { const v = bs.filter((b) => b && b.shown && b.w > 0); const x0 = Math.min(...v.map((b) => b.x)) - 16, y0 = Math.min(...v.map((b) => b.y)) - 12, x1 = Math.max(...v.map((b) => b.x + b.w)) + 16, y1 = Math.max(...v.map((b) => b.y + b.h)) + 16;
      const x = Math.max(0, x0), y = Math.max(0, y0); return { x, y, width: Math.min(W, x1) - x, height: Math.min(H, y1) - y }; };
    if (st.s === 'menu' || st.s === 'hover' || st.s === 'idle') clip = union([B.title, B.menubar, B.list]);
    else if (st.phone) clip = { x: 0, y: 0, width: W, height: H };
    else { const n = B.notebook; clip = { x: Math.max(0, n.x - 20), y: Math.max(0, n.y - 20), width: n.w + 40, height: n.h + 40 }; }
    result[st.id].clip = clip;
    await p.shot(path.join(dir, st.id + '.png'), clip);
    if (st.s === 'view') await p.eval(A.notes('', 'edit'));
  }
  return result;
}

async function capture(name, url, outDir) {
  const kind = name.startsWith('lambdawaves') ? 'lambdawaves' : 'mir', A = ADAPT[kind];
  const dir = path.join(outDir, name); fs.mkdirSync(dir, { recursive: true });
  const styles = { '#meta': { url, kind, at: new Date().toISOString() } }, logs = [];
  for (const [states, phone] of [[DESK, false], [PHONE, true]]) {
    const W = phone ? 390 : 1440, H = phone ? 844 : 900;
    const p = await launch({ width: W, height: H });
    try {
      if (phone) await p.phone(W, H);
      await p.goto(url, 3000);
      for (let i = 0; i < 40 && !(await p.eval(A.ready)); i++) await sleep(250);
      styles['#meta'][phone ? 'phoneTitle' : 'title'] = await p.eval('document.title');
      await p.eval(HIDE);
      Object.assign(styles, await runStates(p, A, states, dir, W, H));
      logs.push(...p.logs);
    } finally { await p.close(); }
  }
  fs.writeFileSync(path.join(dir, 'styles.json'), JSON.stringify(styles, null, 1));
  if (logs.length) fs.writeFileSync(path.join(dir, 'console.txt'), logs.join('\n'));
  console.log(`captured ${name} (${styles['#meta'].title}): ${STATES.length} states → ${dir}`);
}

async function compare(outDir, a, b) {
  const SA = JSON.parse(fs.readFileSync(path.join(outDir, a, 'styles.json'), 'utf8'));
  const SB = JSON.parse(fs.readFileSync(path.join(outDir, b, 'styles.json'), 'utf8'));
  let bad = 0; const report = [`# ${a}: ${SA['#meta'].url}\n# ${b}: ${SB['#meta'].url}`];
  if (SA['#meta'].url === SB['#meta'].url) { report.push('!! both captures came from the SAME url — this proves nothing'); bad++; }
  const KEYS = [...PROPS, '#text', '#box'];
  for (const st of STATES) {
    const x = SA[st.id].styles, y = SB[st.id].styles;
    const onlyA = Object.keys(x).filter((k) => !(k in y)), onlyB = Object.keys(y).filter((k) => !(k in x));
    const diffs = [];
    for (const k of Object.keys(x)) if (k in y) for (const pr of KEYS) if (x[k][pr] !== undefined && x[k][pr] !== y[k][pr]) diffs.push(`${k}  {${pr}: ${x[k][pr]}  ≠  ${y[k][pr]}}`);
    bad += diffs.length + onlyA.length + onlyB.length;
    report.push(`## ${st.id}: ${Object.keys(x).length} elements in ${a}, ${Object.keys(y).length} in ${b}; ${diffs.length} differences (style, text, box); ${onlyA.length} only in ${a}; ${onlyB.length} only in ${b}`);
    for (const k of onlyA.slice(0, 40)) report.push(`  only in ${a}: ${k}`);
    for (const k of onlyB.slice(0, 40)) report.push(`  only in ${b}: ${k}`);
    for (const d of diffs.slice(0, 80)) report.push('  ' + d);
  }
  /* pixels: decoded and differenced inside Chromium itself (no image library), side-by-side pairs written back */
  const p = await launch({ width: 800, height: 600 });
  const pix = []; let pixBad = 0;
  try {
    await p.goto('about:blank', 200);
    for (const st of STATES) {
      const ua = 'data:image/png;base64,' + fs.readFileSync(path.join(outDir, a, st.id + '.png')).toString('base64');
      const ub = 'data:image/png;base64,' + fs.readFileSync(path.join(outDir, b, st.id + '.png')).toString('base64');
      const r = JSON.parse(await p.eval(`(async () => {
        const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
        const [A, B] = await Promise.all([load(${JSON.stringify(ua)}), load(${JSON.stringify(ub)})]);
        const w = Math.max(A.width, B.width), h = Math.max(A.height, B.height);
        const ca = new OffscreenCanvas(w, h), cb = new OffscreenCanvas(w, h), xa = ca.getContext('2d'), xb = cb.getContext('2d');
        xa.drawImage(A, 0, 0); xb.drawImage(B, 0, 0);
        const da = xa.getImageData(0, 0, w, h).data, db = xb.getImageData(0, 0, w, h).data;
        let over8 = 0, sum = 0; const n = w * h; const box = [w, h, -1, -1];
        for (let i = 0; i < da.length; i += 4) { const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])); sum += d;
          if (d > 8) { over8++; const x = (i / 4) % w, y = Math.floor(i / 4 / w); box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y); } }
        const pair = new OffscreenCanvas(A.width + B.width + 12, h), xp = pair.getContext('2d');
        xp.fillStyle = '#ff00aa'; xp.fillRect(0, 0, pair.width, h); xp.drawImage(A, 0, 0); xp.drawImage(B, A.width + 12, 0);
        const blob = await pair.convertToBlob({ type: 'image/png' }); const buf = new Uint8Array(await blob.arrayBuffer());
        let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        return JSON.stringify({ sizeA: [A.width, A.height], sizeB: [B.width, B.height], meanDiff: sum / n, over8, frac: over8 / n, box: over8 ? box : null, png: btoa(s) });
      })()`));
      fs.writeFileSync(path.join(outDir, st.id + '.pair.png'), Buffer.from(r.png, 'base64'));
      const sizeBad = r.sizeA.join() !== r.sizeB.join();
      if (r.over8 || sizeBad) pixBad++;
      pix.push(`${st.id}: size ${r.sizeA.join('×')} vs ${r.sizeB.join('×')} · mean channel diff ${r.meanDiff.toFixed(2)} · pixels off by >8: ${r.over8} (${(100 * r.frac).toFixed(2)} %)${r.box ? ` inside x ${r.box[0]}–${r.box[2]}, y ${r.box[1]}–${r.box[3]}` : ''}`);
    }
  } finally { await p.close(); }
  const text = report.join('\n') + '\n\n## pixels\n' + pix.join('\n') + '\n';
  fs.writeFileSync(path.join(outDir, 'parity-report.txt'), text);
  console.log(text.split('\n').filter((l) => l.startsWith('#') || l.startsWith('!!') || /: size /.test(l)).join('\n'));
  const verdict = bad || pixBad ? `\n${bad} element difference(s), ${pixBad} state(s) with differing pixels — see ${path.join(outDir, 'parity-report.txt')}` : `\nidentical: styles, text, boxes and pixels in all ${STATES.length} states`;
  console.log(verdict);
  process.exit(bad || pixBad ? 1 : 0);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'capture' && args.length === 3) await capture(...args);
else if (cmd === 'compare' && args.length === 3) await compare(...args);
else { console.error('usage: shell-parity.mjs capture <name> <url> <out-dir> | compare <out-dir> <a> <b>'); process.exit(2); }
