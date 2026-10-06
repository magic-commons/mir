/* dev-tools.browser.mjs — tools/hit-probe.mjs, tools/audit-material.mjs and tools/check-app.mjs's control-language warning, run as an app
 * would run them (as commands, against tests/fixtures/dev-tools.html), and judged by what they print and their exit code.
 *   · hit-probe: a draggable box is 25 inside / 0 through and a real drag changes it (exit 0); a pointer-transparent box lands on nothing of
 *     its own (exit 1); a box with a transparent sheet over half of it names the sheet (exit 1); a missing selector fails;
 *   · audit-material: the dense face is named and fails (exit 1), the accent fill is allowed and counted, the faint text is named with its
 *     ratio; scoped to the clean block it passes (exit 0);
 *   · check-app: warns once for each of the four native kinds in a window, not for the text field, the data-native="ok" one or the one outside a
 *     window; the warning does not fail the run.
 * Standalone: MIR_BASE=http://127.0.0.1:8855 node tests/dev-tools.browser.mjs */
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import path from 'node:path';

const BASE = (process.env.MIR_BASE || 'http://127.0.0.1:8855').replace(/\/$/, '');
const URL_ = BASE + '/tests/fixtures/dev-tools.html';
const TOOLS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tools');
const run = (tool, ...args) => { const r = spawnSync(process.execPath, [path.join(TOOLS, tool), ...args], { encoding: 'utf8', timeout: 120000 }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; };
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : detail ? '  — ' + detail : ''}`);

let r = run('hit-probe.mjs', URL_, '#drag', '--drag', '0,-40', '--wait', '300');
check('hit-probe: a draggable box is 25 inside, a real drag lands on it and changes it (exit 0)', r.code === 0 && /25 inside · 0 through/.test(r.out) && /changed: .*its markup/.test(r.out), r.out);
r = run('hit-probe.mjs', URL_, '#ghost', '--wait', '300');
check('hit-probe: a pointer-transparent box lands on nothing of its own (exit 1) and says so', r.code === 1 && /0 inside · 25 through/.test(r.out) && /pointer-events: none/.test(r.out), r.out);
r = run('hit-probe.mjs', URL_, '#covered', '--wait', '300');
check('hit-probe: a transparent sheet over half a box is named (exit 1)', r.code === 1 && /through/.test(r.out) && /div#cover/.test(r.out) && !/ 0 through/.test(r.out), r.out);
r = run('hit-probe.mjs', URL_, '#nothing-here', '--wait', '300');
check('hit-probe: a selector that matches nothing fails (exit 1)', r.code === 1 && /no visible element/.test(r.out), r.out);

r = run('audit-material.mjs', URL_, '--wait', '300');
check('audit-material: the dense face is named and fails (exit 1)', r.code === 1 && /FACE\s+div\.face\s+α0\.84/.test(r.out), r.out);
check('audit-material: the accent fill is counted as allowed, not failed', /allowed dense: 1 accent/.test(r.out) && !/FACE\s+div\.accent/.test(r.out), r.out);
check('audit-material: the faint text is named with its ratio', /FAINT\s+div\.faint\s+1\.\d+:1/.test(r.out), r.out);
r = run('audit-material.mjs', URL_, '--scope', '#clean', '--wait', '300');
check('audit-material: scoped to the clean block it passes (exit 0)', r.code === 0 && /^OK$/m.test(r.out), r.out);

r = run('check-app.mjs', URL_);
const warns = r.out.split('\n').filter((l) => l.startsWith('WARN'));
check('check-app: one control-language warning for each of select, range, number and color in a window', warns.length === 4 && ['select', 'input type=range', 'input type=number', 'input type=color'].every((k) => warns.some((w) => w.includes('<' + k + '>'))), warns.join('\n'));
check('check-app: no warning for the text field, the data-native="ok" one or the one outside a window', !warns.some((w) => /ok-|outside|text/.test(w)), warns.join('\n'));
check('check-app: the warnings do not fail the run (exit 0)', r.code === 0, r.out);

for (const x of results) console.log(x);
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(failed ? `${failed} of ${results.length} developer-tool checks FAILED` : `ALL ${results.length} developer-tool checks passed`);
process.exit(failed ? 1 : 0);
