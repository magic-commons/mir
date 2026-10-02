/* session.browser.mjs — the live project in a real page (tests/fixtures/session.html): work done with real clicks is
 *   saved by itself, a reload offers RESUME (hit-tested with elementFromPoint), RESUME brings the work back, and NEW
 *   starts empty and forgets it.
 * Standalone: node tools/serve.mjs 8841 & MIR_BASE=http://127.0.0.1:8841 node tests/session.browser.mjs */
import { launch, sleep } from '../tools/cdp.mjs';

const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8841';
const URL_ = BASE.replace(/\/$/, '') + '/tests/fixtures/session.html';
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);

const p = await launch({ width: 800, height: 600 });
try {
  await p.goto(URL_ + '?reset', 1200);
  check('a cold start offers no RESUME', await p.eval(`!document.getElementById('resume')`));
  for (let i = 0; i < 3; i++) { const r = await p.click('#add'); if (!r.hit) check('+1 takes the click', false, r.got); }
  await sleep(500);
  check('the work is saved by itself', await p.eval(`JSON.parse(localStorage.getItem('fixture.session')).parts.count.v`) === 3);
  await p.goto(URL_, 1200);
  check('the page restarted with nothing restored', await p.eval(`document.getElementById('value').textContent`) === '0');
  const r = await p.click('#resume');
  check('a reload offers RESUME, and it takes the click (elementFromPoint)', r.hit, r.got);
  check('RESUME brings the work back', await p.eval(`document.getElementById('value').textContent`) === '3');
  await p.goto(URL_, 1200);
  const nw = await p.click('#new');
  check('NEW takes the click', nw.hit, nw.got);
  check('NEW starts empty and forgets the saved work', await p.eval(`document.getElementById('value').textContent === '0' && localStorage.getItem('fixture.session') === null`));
  check('the page raised no exception', p.logs.filter((l) => l.startsWith('EXCEPTION')).length === 0, p.logs.join(' | '));
} finally {
  await p.close();
}
for (const line of results) console.log(line);
const failed = results.filter((l) => l.startsWith('FAIL'));
console.log(failed.length ? `${failed.length} of ${results.length} session checks FAILED` : `ALL ${results.length} MIR session browser checks passed`);
process.exit(failed.length ? 1 : 0);
