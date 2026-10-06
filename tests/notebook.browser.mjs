/* notebook.browser.mjs — THE NOTEBOOK's size law and landing law in a real page (tests/fixtures/notebook.html).
 * Proves: the size SAVED is the size GIVEN, not the layout box (the sheet caps the box at 500 px) · each face keeps its own
 * size (nbW/nbH, abW/abH) and both survive a reload · the 320 × 240 floor · ABOUT opens 520 × 812 (BASINS') and `aboutSize`
 * says another · a resize by the grip (a real drag, hit-tested) is committed and saved, and a move books the frame core's
 * 32 ms timer behind its rAF · a project lands on its notebook only when it has text.
 * Standalone: node tools/serve.mjs 8854 & MIR_BASE=http://127.0.0.1:8854 node tests/notebook.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = (process.env.MIR_BASE || 'http://127.0.0.1:8854').replace(/\/$/, '');
const PAGE = BASE + '/tests/fixtures/notebook.html';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 1100, height: 900 });
try {
  const ready = async () => { for (let i = 0; i < 40 && !(await p.eval(`typeof __NB === 'object'`)); i++) await sleep(100); };
  const stored = async () => JSON.parse(await p.eval(`localStorage.getItem('mir.test.nb.size') || '{}'`));
  const inline = async () => JSON.parse(await p.eval(`(() => { const n = document.getElementById('notebook'); return JSON.stringify({ w: parseFloat(n.style.width), h: parseFloat(n.style.height), ow: n.offsetWidth, oh: n.offsetHeight }); })()`));
  const mouse = (type, x, y) => p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });

  await p.goto(PAGE + '?reset', 1200); await ready();
  await p.eval(`__NB.open('notes')`); await sleep(150);
  let g = await inline();
  check('NOTES opens at 500 (the sheet\'s cap) of the 640 it was given, 460 high', g.w === 640 && g.h === 460 && g.ow === 500, JSON.stringify(g));

  /* the size saved is the one given, never the layout box */
  await p.eval(`__NB.resize(700, 400)`); await sleep(100);
  g = await inline(); let s = await stored();
  check('the layout box is capped at 500 while 700 was given', g.w === 700 && g.ow === 500, JSON.stringify(g));
  check('the size SAVED is the one given (700 × 400), not the layout box (500)', s.nbW === 700 && s.nbH === 400, JSON.stringify(s));

  /* the floor */
  await p.eval(`__NB.resize(100, 100)`); await sleep(50);
  g = await inline(); s = await stored();
  check('the floor is 320 × 240', g.w === 320 && g.h === 240 && s.nbW === 320 && s.nbH === 240, JSON.stringify([g, s]));
  await p.eval(`__NB.resize(700, 400)`);

  /* the desktop's own resize corner (CSS resize: both): a real drag from the corner, committed and saved as given */
  await p.eval(`document.getElementById('notebook').style.maxWidth = 'none'`);
  const corner = JSON.parse(await p.eval(`(() => { const n = document.getElementById('notebook'); const b = n.getBoundingClientRect(); const x = Math.round(b.right - 5), y = Math.round(b.bottom - 5); const h = document.elementFromPoint(x, y); return JSON.stringify({ x, y, hit: h === n }); })()`));
  check('the corner takes the press (elementFromPoint finds the notebook)', corner.hit, JSON.stringify(corner));
  await mouse('mouseMoved', corner.x, corner.y); await mouse('mousePressed', corner.x, corner.y);
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: corner.x - 60, y: corner.y - 40, button: 'left', buttons: 1 });
  await mouse('mouseReleased', corner.x - 60, corner.y - 40); await sleep(250);
  g = await inline(); s = await stored();
  check('the resize is saved as given (640 × 360)', g.w === 640 && g.h === 360 && s.nbW === 640 && s.nbH === 360, JSON.stringify([g, s]));

  /* a move by the head books the frame core: the rAF and the 32 ms timer behind it, and commits on release */
  const head = JSON.parse(await p.eval(`(() => { const n = document.getElementById('notebook'); const e = n.querySelector('.nb-head'); const b = e.getBoundingClientRect(); const x = Math.round(b.left + 40), y = Math.round(b.top + 3); const h = document.elementFromPoint(x, y); return JSON.stringify({ x, y, left: n.getBoundingClientRect().left, hit: h === e }); })()`));
  check('the head takes the press (elementFromPoint)', head.hit, JSON.stringify(head));
  await mouse('mouseMoved', head.x, head.y); await mouse('mousePressed', head.x, head.y);
  await p.eval(`import('/mir/core/frame.js').then((m) => document.querySelector('#notebook .nb-head').addEventListener('pointermove', () => { window.__booked = m.frame.state(); }, { once: true }))`); await sleep(100);   // added after the notebook's own: it runs right behind it
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: head.x + 50, y: head.y + 30, button: 'left', buttons: 1 });
  await sleep(5);
  const booked = JSON.parse(await p.eval(`JSON.stringify(window.__booked || null)`)) || {};
  check('a move books the frame core: a rAF and the 32 ms timer behind it', booked.raf === true && booked.timer === true, JSON.stringify(booked));
  await mouse('mouseReleased', head.x + 50, head.y + 30); await sleep(200);
  const left = await p.eval(`document.getElementById('notebook').getBoundingClientRect().left`);
  check('the move is committed on release', Math.abs(left - (head.left + 50)) < 2, `${head.left} to ${left}`);

  /* ABOUT: BASINS' size, its own memory */
  await p.eval(`__NB.open('about')`); await sleep(150);
  g = await inline();
  check('ABOUT opens 520 × 812 (BASINS\')', g.w === 520 && g.h === 812, JSON.stringify(g));
  await p.eval(`__NB.resize(560, 700)`); await sleep(100);
  await p.eval(`__NB.open('notes')`); await sleep(100);
  g = await inline();
  check('each face keeps its own size: NOTES is still 640 × 360', g.w === 640 && g.h === 360, JSON.stringify(g));
  s = await stored();
  check('both are stored', s.abW === 560 && s.abH === 700 && s.nbW === 640 && s.nbH === 360, JSON.stringify(s));

  /* survives a reload */
  await p.goto(PAGE, 1200); await ready();
  await p.eval(`__NB.open('notes')`); await sleep(150);
  g = await inline();
  check('NOTES size survives a reload', g.w === 640 && g.h === 360, JSON.stringify(g));
  await p.eval(`__NB.open('about')`); await sleep(150);
  g = await inline();
  check('ABOUT size survives a reload', g.w === 560 && g.h === 700, JSON.stringify(g));

  /* the option */
  await p.goto(PAGE + '?reset&about', 1200); await ready();
  await p.eval(`__NB.open('about')`); await sleep(150);
  g = await inline();
  check('aboutSize says another default (400 × 500)', g.w === 400 && g.h === 500, JSON.stringify(g));

  /* the landing law */
  await p.goto(PAGE + '?reset', 1200); await ready();
  const open = () => p.eval(`__NB.isOpen`);
  await p.eval(`__NB.project.restore({ title: 'EMPTY ONE', subtitle: '', text: '   ' }, 'x')`); await sleep(100);
  check('a project with no text does not open the notebook', (await open()) === false);
  check('but its title was put back', (await p.eval(`__NB.title`)) === 'EMPTY ONE');
  await p.eval(`__NB.project.restore({ title: 'HAS TEXT', subtitle: 'sub', text: '# Hello\\n\\nthe notes' }, 'x')`); await sleep(300);
  check('a project with text lands on its notebook, in the preview', (await open()) === true && (await p.eval(`__NB.face`)) === 'notes' && (await p.eval(`__NB.mode`)) === 'view');
  check('the preview shows the complete notes', /Hello/.test(await p.eval(`__NB.html`)));
  const cap = JSON.parse(await p.eval(`JSON.stringify(__NB.project.capture('NAME'))`));
  check('capture gives { title, subtitle, text }', cap.title === 'HAS TEXT' && cap.subtitle === 'sub' && /Hello/.test(cap.text), JSON.stringify(cap));
  /* BASINS parity, round seven: a face that runs an action (BASINS' ▤ opens its SAVE window), and BASINS' ABOUT through the kit's data */
  await p.goto(PAGE + '?reset&basins', 1200); await ready();
  await p.eval(`__NB.open('notes')`); await sleep(150);
  const act = await p.click('#notebook .nb-projects-btn'); await sleep(100);
  const after = JSON.parse(await p.eval(`JSON.stringify({ ran: window.__ran || 0, face: __NB.face, open: __NB.isOpen, faceEl: !!document.querySelector('#notebook .nb-projectsface') })`));
  check('a face with run() is a button that runs its action and flips nothing (hit-tested press), with no face element', act.hit && after.ran === 1 && after.face === 'notes' && after.open && !after.faceEl, JSON.stringify([act, after]));
  const ab = await p.click('#notebook .nb-about'); await sleep(150);
  const about = JSON.parse(await p.eval(`(() => { const f = document.querySelector('#notebook .nb-aboutface');
    const team = f.querySelector('.ab-team'), made = f.querySelector('.ab-made');
    return JSON.stringify({ face: __NB.face, tag: f.querySelector('.ab-tag').textContent, version: f.querySelector('.ab-version').textContent,
      taglines: [...f.querySelectorAll('.ab-tagline')].map((n) => n.innerHTML), teamEyebrow: team.previousElementSibling.className + ' ' + team.previousElementSibling.textContent,
      made: made && made.tagName + ' ' + made.className, makers: made ? [...made.querySelectorAll('.ab-makers > span')].map((n) => n.firstChild.textContent + '/' + n.querySelector('small').textContent) : [] }); })()`));
  check('BASINS\' ABOUT from data: the tag up to the last " · ", two taglines (10<sup>500</sup>), the team\'s eyebrow, the makers block', ab.hit && about.face === 'about' && about.tag === 'MANDELBROT · BASINS'
    && about.version === 'MANDELBROT · BASINS · 2026-09-26' && about.taglines.length === 2 && /10<sup>500<\/sup>, minibrot/.test(about.taglines[1])
    && about.teamEyebrow === 'ab-eyebrow Independent research & Assistance' && about.made === 'DIV ab-credit ab-made'
    && about.makers.join() === 'Claude/Anthropic,Gemini/Google DeepMind,GPT/OpenAI', JSON.stringify(about));
  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} notebook checks FAILED` : `ALL ${results.length} MIR notebook browser checks passed`);
process.exit(failed.length ? 1 : 0);
