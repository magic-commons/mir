/* intake.browser.mjs — the one way in, under a real browser (gallery/format.html is the fixture).
 *   A PNG made by Chromium's own encoder (canvas.toBlob) with a spec embedded is DROPPED on the well (the drop target
 *   found by elementFromPoint, the drop a real DragEvent with a File in its DataTransfer): it is read, checked, and
 *   its skin lands on <body> · UNDO (a real click, hit-tested) takes it off · a hostile skin dropped as a .mir file is
 *   refused with paths and NOTHING is applied · a picture with no chunk is refused with the reason · a packed text
 *   pasted on the page comes in.
 * Run by tests/run.mjs with MIR_BASE set; standalone: MIR_BASE=http://127.0.0.1:8798 node tests/intake.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8798';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1100, height: 900 });
try {
  await p.goto(BASE + '/gallery/format.html', 800);
  for (let i = 0; i < 50 && !(await p.eval('!!(window.__F && window.__F.ready)')); i++) await sleep(100);
  const run = async (body) => JSON.parse(await p.eval(`(async () => { const F = window.__F, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const dropAt = async (file) => {                       // the drop target is whatever is under the well's centre
      const r = document.getElementById('drop').getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y), dt = new DataTransfer(); dt.items.add(file);
      const ev = (type) => hit.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }));
      ev('dragenter'); ev('dragover'); const guide = document.getElementById('drop').getAttribute('data-prox');
      F.last = null; ev('drop'); for (let i = 0; i < 40 && !F.last; i++) await wait(25);
      return { hitIsWell: hit.id === 'drop' || hit.closest('#drop') !== null, guide, after: document.getElementById('drop').getAttribute('data-prox') };
    };
    ${body} })().then(JSON.stringify)`));

  /* ── a picture carrying a spec, dropped ── */
  let r = await run(`const bytes = await F.specPicture(); const d = await dropAt(new File([bytes], 'mir-spec.png', { type: 'image/png' }));
    return { ...d, ok: F.last && F.last.ok, kind: F.last && F.last.envelope && F.last.envelope.kind, errors: F.last && F.last.errors,
      inline: document.body.style.getPropertyValue('--hue-acc'), verdict: document.getElementById('verdict').textContent.slice(0, 80) };`);
  check('drop: elementFromPoint at the well\'s centre is the well', r.hitIsWell, JSON.stringify(r));
  check('drop: the kit\'s drop guide shows while a file is over it, and clears on drop', r.guide === 'capture' && r.after === null, `${r.guide} → ${r.after}`);
  check('drop: a Chromium-encoded PNG carrying a spec is read and passes the checker', r.ok === true && r.kind === 'spec', JSON.stringify(r.errors));
  check('drop: the spec\'s skin lands on <body> as inline custom properties', r.inline === '28', `--hue-acc inline "${r.inline}"`);

  /* ── UNDO, by a real click on what is under the button ── */
  r = await run(`const b = [...document.querySelectorAll('.trig')].find((x) => !x.disabled && x.querySelector('.trig-l') && x === document.querySelectorAll('.g-row')[0].children[3]);
    const q = b.getBoundingClientRect(); const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    return { x: q.left + q.width / 2, y: q.top + q.height / 2, hitIsButton: !!hit && b.contains(hit) };`);
  check('undo: elementFromPoint at UNDO SKIN is the button', r.hitIsButton);
  await p.mouse(r.x, r.y, 'mousePressed'); await p.mouse(r.x, r.y, 'mouseReleased'); await sleep(100);
  r = await run(`return { inline: document.body.getAttribute('style') || '' };`);
  check('undo: the skin is off, <body> has no inline values left', r.inline.trim() === '', JSON.stringify(r));

  /* ── a hostile skin, dropped as a file: refused, nothing applied ── */
  r = await run(`const before = getComputedStyle(document.body).getPropertyValue('--acc');
    const hostile = { mir: 1, kind: 'skin', kit: '1.5.0-alpha.3', made: '2026-10-01', data: { tokens: { '--hue-acc': '0', '--acc': 'red</style><script>window.__pwned = 1</script>', '--glass-sheen': 'url(https://example.com/x.png)', '--fg': 'var(--not-a-token)' } } };
    const d = await dropAt(new File([JSON.stringify(hostile)], 'hostile.mir', { type: 'application/json' }));
    return { ...d, ok: F.last.ok, paths: F.last.errors.map((e) => e.path), inline: document.body.getAttribute('style') || '', same: getComputedStyle(document.body).getPropertyValue('--acc') === before,
      pwned: !!window.__pwned, scripts: document.scripts.length, verdict: document.getElementById('verdict').textContent.slice(0, 60) };`);
  check('hostile: refused with a path for each bad value', r.ok === false && ['data.tokens.--acc', 'data.tokens.--glass-sheen', 'data.tokens.--fg'].every((x) => r.paths.includes(x)), JSON.stringify(r.paths));
  check('hostile: NOTHING applied (not even its one good value), nothing ran', r.inline.trim() === '' && r.same && !r.pwned, JSON.stringify({ inline: r.inline, same: r.same, pwned: r.pwned }));

  /* ── a picture with no chunk: refused with the reason ── */
  r = await run(`const c = document.createElement('canvas'); c.width = c.height = 8; const b = await new Promise((res) => c.toBlob(res, 'image/png'));
    await dropAt(new File([b], 'screenshot.png', { type: 'image/png' })); return { ok: F.last.ok, why: F.last.errors[0] && F.last.errors[0].why };`);
  check('a plain picture (a screenshot): refused, saying it carries no MIR data', r.ok === false && /carries no MIR data/.test(r.why), r.why);

  /* ── a packed text, pasted on the page ── */
  r = await run(`const { pack } = await import('../mir/core/envelope.js'); const t = await pack(F.currentSpec());
    const dt = new DataTransfer(); dt.setData('text/plain', t); F.last = null; document.body.focus();
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    for (let i = 0; i < 40 && !F.last; i++) await wait(25);
    return { len: t.length, ok: F.last && F.last.ok, kind: F.last && F.last.envelope && F.last.envelope.kind, source: F.last && F.last.source };`);
  check('paste: a packed spec text pasted on the page comes in through the same door', r.ok === true && r.kind === 'spec' && r.source === 'paste', JSON.stringify(r));
  const logs = p.logs ? p.logs.filter((l) => !/favicon/.test(l)) : [];
  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
} finally { await p.close(); }

for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `\n${failed.length} FAILED` : `\nALL ${results.length} intake checks PASS`);
process.exit(failed.length ? 1 : 0);
