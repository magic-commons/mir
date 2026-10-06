#!/usr/bin/env node
/* hit-probe.mjs — what a real pointer would land on, for any element of any MIR app.  The kit's own proofs hit-test every control with
 * document.elementFromPoint; this puts the same check in an app's hands, because a window that looks fine can have a pointer-transparent
 * sheet over it or a layer that swallows the click, and a test that dispatches straight at an element cannot see that.
 *
 *   node tools/hit-probe.mjs <url> <selector> [--drag dx,dy] [--from fx,fy] [--watch 'js expression'] [--grid 5]
 *                            [--size 1280x800] [--wait 1500] [--shot out.png] [--json]
 *
 *   The grid: N × N points spread evenly over the element's box (default 5 × 5 = 25), each asked of the browser with elementFromPoint.
 *     A point is INSIDE when the element, or one of its descendants, answers; otherwise it went THROUGH and the line names what answered.
 *   --drag dx,dy   then press at the element's centre (--from fx,fy: a fraction of its box, 0.5,0.5 is the centre), move by dx,dy
 *                  CSS px in eight steps and release, with the browser's own input pipeline (Input.dispatchMouseEvent), never a
 *                  dispatch at the element: the press lands on whatever the browser says is there.  Said back: what that was, and
 *                  whether anything changed (the element's markup or box, what it landed on, or the value of every --watch expression,
 *                  e.g. --watch 'document.querySelector("#gain").value').  --watch can be given more than once.
 *   Exit 0 only when the element was found, every grid point was inside, and (with --drag) the press landed inside it and something changed.
 *   Needs a Chromium on PATH (or CHROMIUM=…): tools/cdp.mjs. */
import { launch, sleep } from './cdp.mjs';
import { fileURLToPath } from 'node:url'; import path from 'node:path';

/** gridPoints(rect, n) → n × n points evenly inside a box, never on its edge (i/(n+1) of the way); pure, exported for tests */
export function gridPoints(rect, n = 5) {
  const pts = [];
  for (let j = 1; j <= n; j++) for (let i = 1; i <= n; i++) pts.push({ x: rect.left + rect.width * i / (n + 1), y: rect.top + rect.height * j / (n + 1) });
  return pts;
}
/** tally(answers) → { inside, through, landsOn: [[name, count]…] } from [{ inside, name }…]; pure, exported for tests */
export function tally(answers) {
  const through = new Map(); let inside = 0;
  for (const a of answers) { if (a.inside) inside++; else through.set(a.name, (through.get(a.name) || 0) + 1); }
  return { inside, through: answers.length - inside, landsOn: [...through].sort((a, b) => b[1] - a[1]) };
}
/** parseArgs(argv) → the options above, or { error }; pure, exported for tests */
export function parseArgs(argv) {
  const o = { url: null, selector: null, drag: null, from: [0.5, 0.5], watch: [], grid: 5, size: [1280, 800], wait: 1500, shot: null, json: false };
  const pair = (s, sep = ',') => String(s).split(sep).map(Number);
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = argv[i + 1];
    if (a === '--drag') { o.drag = pair(v); i++; } else if (a === '--from') { o.from = pair(v); i++; } else if (a === '--watch') { o.watch.push(v); i++; }
    else if (a === '--grid') { o.grid = Math.max(1, Number(v) || 5); i++; } else if (a === '--size') { o.size = pair(v, 'x'); i++; } else if (a === '--wait') { o.wait = Number(v) || 0; i++; }
    else if (a === '--shot') { o.shot = v; i++; } else if (a === '--json') o.json = true; else pos.push(a);
  }
  [o.url, o.selector] = pos;
  if (!o.url || !o.selector) return { error: 'usage: node tools/hit-probe.mjs <url> <selector> [--drag dx,dy] [--from fx,fy] [--watch js] [--grid 5] [--size 1280x800] [--wait ms] [--shot out.png] [--json]' };
  if (o.drag && (o.drag.length !== 2 || o.drag.some(Number.isNaN))) return { error: '--drag takes dx,dy in CSS px, e.g. --drag 0,-40' };
  if (o.from.length !== 2 || o.from.some(Number.isNaN)) return { error: '--from takes fx,fy as fractions of the box, e.g. --from 0.5,0.5' };
  return o;
}

/* the page side: a name for a node, and the box + markup of one; written once, sent as text */
const PAGE = `(() => {
  const name = (n) => !n ? 'nothing' : n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.getAttribute && n.getAttribute('class') ? '.' + String(n.getAttribute('class')).trim().split(/\\s+/).slice(0, 3).join('.') : '');
  const find = (sel) => { for (const n of document.querySelectorAll(sel)) { const b = n.getBoundingClientRect(); if (b.width > 0 && b.height > 0) return n; } return null; };
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; };
  const snap = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return { box: [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10), html: hash(n.outerHTML || '') }; };
  window.__hitProbe = { name, find, snap };
})()`;

export async function probe(o, page) {
  await page.eval(PAGE);
  const sel = JSON.stringify(o.selector);
  const box = await page.eval(`(() => { const n = __hitProbe.find(${sel}); if (!n) return null; n.scrollIntoView({ block: 'center', inline: 'center' }); const b = n.getBoundingClientRect();
    const pe = getComputedStyle(n).pointerEvents === 'none' ? [__hitProbe.name(n)] : [];
    return { left: b.left, top: b.top, width: b.width, height: b.height, name: __hitProbe.name(n), matches: document.querySelectorAll(${sel}).length, noPointer: pe, vw: innerWidth, vh: innerHeight }; })()`);
  if (!box) return { found: false };
  const out = { found: true, name: box.name, matches: box.matches, box: [box.left, box.top, box.width, box.height].map(Math.round), noPointer: box.noPointer, offscreen: box.left < 0 || box.top < 0 || box.left + box.width > box.vw || box.top + box.height > box.vh };
  const pts = gridPoints(box, o.grid);
  const answers = await page.eval(`(() => { const n = __hitProbe.find(${sel}); return ${JSON.stringify(pts)}.map((p) => { const h = document.elementFromPoint(p.x, p.y); return { inside: !!h && (h === n || n.contains(h)), name: __hitProbe.name(h) }; }); })()`);
  out.grid = { n: o.grid, ...tally(answers) };
  if (o.drag) {
    const x = box.left + box.width * o.from[0], y = box.top + box.height * o.from[1];
    const landed = await page.eval(`(() => { const n = __hitProbe.find(${sel}), h = document.elementFromPoint(${x}, ${y}); window.__hitProbe.landed = h; return { name: __hitProbe.name(h), inside: !!h && (h === n || n.contains(h)) }; })()`);
    const state = () => page.eval(`(() => { const n = __hitProbe.find(${sel}), h = window.__hitProbe.landed; return JSON.stringify({ target: __hitProbe.snap(n), landed: h && h !== n ? __hitProbe.snap(h) : null, watch: [${o.watch.map((w) => `(() => { try { return String(${w}); } catch (e) { return 'threw ' + e.message; } })()`).join(', ')}] }); })()`);
    const before = await state();
    const mouse = (type, px, py, down) => page.send('Input.dispatchMouseEvent', { type, x: px, y: py, button: type === 'mouseMoved' && !down ? 'none' : 'left', buttons: down ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });
    await mouse('mouseMoved', x, y, false); await mouse('mousePressed', x, y, true);
    for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', x + o.drag[0] * i / 8, y + o.drag[1] * i / 8, true); await sleep(16); }
    await mouse('mouseReleased', x + o.drag[0], y + o.drag[1], false); await sleep(300);
    const after = await state();
    const b = JSON.parse(before), a = JSON.parse(after), parts = [];
    if (JSON.stringify(b.target?.box) !== JSON.stringify(a.target?.box)) parts.push('its box');
    if (b.target?.html !== a.target?.html) parts.push('its markup');
    if (JSON.stringify(b.landed) !== JSON.stringify(a.landed)) parts.push('what it landed on');
    b.watch.forEach((v, i) => { if (v !== a.watch[i]) parts.push(`--watch #${i + 1} (${v} → ${a.watch[i]})`); });
    out.drag = { from: [Math.round(x), Math.round(y)], by: o.drag, landedOn: landed.name, landedInside: landed.inside, changed: parts };
  }
  return out;
}

/** report(o, result) → { lines, ok } (pure, exported for tests) */
export function report(o, r) {
  if (!r.found) return { lines: [`hit-probe  ${o.url}  ${o.selector}`, 'FAIL  no visible element matches the selector'], ok: false };
  const lines = [`hit-probe  ${o.url}  ${o.selector}`, `element   ${r.name}  box ${r.box[0]},${r.box[1]} ${r.box[2]}×${r.box[3]}` + (r.matches > 1 ? `  (the first visible of ${r.matches})` : '') + (r.offscreen ? '  (partly off the screen: the points off it land on nothing of the app)' : '')];
  let ok = true;
  if (r.noPointer.length) lines.push(`note      the element itself has pointer-events: none (a click falls through it to what is beneath)`);
  const g = r.grid; lines.push(`grid      ${g.n}×${g.n}: ${g.inside} inside · ${g.through} through` + (g.through ? '  → ' + g.landsOn.map(([n, c]) => `${n} ×${c}`).join(', ') : ''));
  if (g.through) { ok = false; lines.push(`FAIL      ${g.through} point(s) of the element's box land on something that is not it`); }
  if (r.drag) {
    const d = r.drag;
    lines.push(`drag      press at ${d.from[0]},${d.from[1]} landed on ${d.landedOn}${d.landedInside ? '' : '  (NOT the element)'} · moved ${d.by[0]},${d.by[1]} · changed: ${d.changed.length ? d.changed.join(', ') : 'nothing'}`);
    if (!d.landedInside) { ok = false; lines.push('FAIL      the press did not land inside the element'); }
    if (!d.changed.length) { ok = false; lines.push('FAIL      nothing changed (give --watch an expression if the change is in a model the markup does not show)'); }
  }
  lines.push(ok ? 'OK' : 'NOT OK');
  return { lines, ok };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const o = parseArgs(process.argv.slice(2));
  if (o.error) { console.log(o.error); process.exit(2); }
  const p = await launch({ width: o.size[0], height: o.size[1] });
  let code = 1;
  try {
    await p.goto(o.url, o.wait);
    const r = await probe(o, p);
    if (o.shot) await p.shot(o.shot);
    const rep = report(o, r);
    console.log(o.json ? JSON.stringify({ ...r, ok: rep.ok }, null, 2) : rep.lines.join('\n'));
    code = rep.ok ? 0 : 1;
  } catch (e) { console.log('hit-probe threw: ' + (e && e.stack || e)); } finally { await p.close(); }
  process.exit(code);
}
