/* probe.browser.mjs — tools/probe.mjs, the REMOTE PROBE, end to end in the kit's test browser (tools/cdp.mjs, Chromium).
 * A probe server on a free port over plain HTTP, with a small fixture page (written to a temp folder) as its root:
 *   · the script line is added as the first thing in <head>, and no other byte of the page changes;
 *   · the device report arrives first; a console.warn and a thrown error both arrive in log.ndjson;
 *   · a queued command's value comes back; probe.tap reaches a click handler; probe.shot writes a non-blank PNG;
 *   · the control endpoints answer this machine (sessions) and the loopback check refuses every other address (unit);
 *   · with the server stopped, the page does not throw and its dot turns red.
 * MIR_BASE is not used: the test serves its own fixture.  Standalone: node tests/probe.browser.mjs */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { launch, sleep } from '../tools/cdp.mjs';
import { startProbe, isLoopback, inject, TAG, ctl } from '../tools/probe.mjs';

const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : detail ? '  — ' + detail : ''}`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mir-probe-'));
const root = path.join(tmp, 'root'), data = path.join(tmp, 'data');
fs.mkdirSync(root);
const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><title>probe fixture</title>
</head>
<body>
<button id="b" style="position:absolute;left:40px;top:40px;width:120px;height:40px">tap</button>
<canvas id="c" width="64" height="64" style="position:absolute;left:40px;top:120px"></canvas>
<script>
  window.clicks = 0; document.getElementById('b').addEventListener('click', function () { window.clicks++; });
  var g = document.getElementById('c').getContext('2d'); g.fillStyle = '#f00'; g.fillRect(0, 0, 32, 64); g.fillStyle = '#00f'; g.fillRect(32, 0, 32, 64);
</script>
</body>
</html>`;
fs.writeFileSync(path.join(root, 'index.html'), PAGE);

/* the pure parts */
const loopOk = ['127.0.0.1', '127.8.9.10', '::1', '::ffff:127.0.0.1'].every(isLoopback);
const loopNo = ['192.168.1.20', '::ffff:192.168.1.20', '10.0.0.2', 'fe80::1', '0.0.0.0', '', undefined, '127.0.0.1.evil', '1127.0.0.1'].every((a) => !isLoopback(a));
check('the control check: loopback addresses pass, every network address is refused', loopOk && loopNo);
check('inject: the line goes first inside <head> (attributes kept), and after <html> when there is no head',
  inject('<html><head lang="x"><meta charset="utf-8">').startsWith('<html><head lang="x">' + TAG + '<meta') && inject('<!doctype html><html><body>x').startsWith('<!doctype html><html>' + TAG + '<body>'));

const srv = await startProbe({ port: 0, root, http: true, data, quiet: true });
const page = await launch({ width: 800, height: 600 });
const logOf = () => { const d = fs.readdirSync(data).filter((f) => fs.existsSync(path.join(data, f, 'log.ndjson'))); return d.length ? fs.readFileSync(path.join(data, d[0], 'log.ndjson'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; };
const until = async (fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(100); } return null; };
try {
  const served = await (await fetch(srv.url + '/')).text();
  check('the served page carries the script line first in <head>, and nothing else changed', served === PAGE.replace('<head>', '<head>' + TAG), served.slice(0, 120));
  const js = await fetch(srv.url + '/__probe/client.js');
  check('the client script is served', js.ok && /javascript/.test(js.headers.get('content-type')));

  await page.goto(srv.url + '/', 1000);
  const first = await until(() => logOf()[0]);
  check('the device report arrives as the first record', first && first.k === 'device' && first.report && first.report.ua && first.report.viewport && 'gpu' in first.report && first.report.media && typeof first.rt === 'number', JSON.stringify(first).slice(0, 300));

  await page.eval(`console.warn('probe-warn', { a: 1 }); setTimeout(function () { throw new Error('probe-boom'); }, 0); 1`);
  const got = await until(() => { const l = logOf(); return l.some((r) => r.k === 'console' && r.level === 'warn' && r.args[0] === 'probe-warn') && l.some((r) => r.k === 'error' && /probe-boom/.test(r.message)) ? l : null; });
  check('a console.warn and a thrown error both arrive in log.ndjson', !!got, JSON.stringify(logOf().slice(-4)).slice(0, 400));
  const errRec = got && got.find((r) => r.k === 'error');
  check('the thrown error carries its stack and line', !!errRec && /probe-boom/.test(errRec.stack || '') && errRec.line > 0, JSON.stringify(errRec));

  const sess = await ctl(srv.port, 'GET', 'sessions');
  check('control from this machine: the session is listed, connected, with its device', sess.status === 200 && sess.body.length === 1 && sess.body[0].connected && /Linux · Chrome/.test(sess.body[0].device), JSON.stringify(sess.body));

  const run = await ctl(srv.port, 'POST', 'run?s=latest&wait=10000', { code: 'await probe.wait(20); return { title: document.title, n: 6 * 7, rect: probe.rect("#b") };' }, 20000);
  check('a queued command runs in the page and its value comes back', run.status === 200 && run.body.ok && run.body.value.title === 'probe fixture' && run.body.value.n === 42 && run.body.value.rect.w === 120, JSON.stringify(run.body));

  const tap = await ctl(srv.port, 'POST', 'run?s=latest&wait=10000', { code: 'return probe.tap("#b");' }, 20000);
  const clicks = await page.eval('window.clicks');
  check('probe.tap reaches the page\'s click handler', tap.status === 200 && tap.body.ok && tap.body.value.onTarget && clicks === 1, JSON.stringify(tap.body) + ' clicks ' + clicks);

  const bad = await ctl(srv.port, 'POST', 'run?s=latest&wait=10000', { code: 'throw new Error("probe-command-error")' }, 20000);
  check('a command that throws comes back as an error, not a hang', bad.status === 200 && !bad.body.ok && /probe-command-error/.test(bad.body.error.message), JSON.stringify(bad.body));

  const shot = await ctl(srv.port, 'POST', 'run?s=latest&wait=10000', { code: 'return await probe.shot("#c");' }, 20000);
  const png = shot.body.value && shot.body.value.png;
  check('probe.shot writes a non-blank PNG under shots/', shot.status === 200 && shot.body.ok && png && fs.existsSync(png) && fs.readFileSync(png).subarray(1, 4).toString() === 'PNG' && shot.body.value.blank === false, JSON.stringify(shot.body).slice(0, 300));
  const tapRec = await until(() => logOf().find((r) => r.k === 'input' && r.ev === 'click' && r.synthetic));
  check('the input trace records the tap (marked synthetic) with its target', !!tapRec && /button#b/.test(tapRec.target), JSON.stringify(tapRec));

  const before = page.logs.length;
  await srv.close();
  await sleep(500);
  await page.eval(`console.log('after the server stopped'); document.getElementById('b').click(); 1`);
  await sleep(3000);
  const dot = await page.eval(`(function () { var d = document.getElementById('__probe-dot'); return d ? getComputedStyle(d).backgroundColor : 'absent'; })()`);
  const alive = await page.eval('window.clicks');
  const newLogs = page.logs.slice(before);
  check('with the server stopped the page does not throw, keeps working, and the dot turns red', newLogs.every((l) => !/^EXCEPTION/.test(l)) && alive === 2 && dot === 'rgb(255, 64, 64)', `dot ${dot}, clicks ${alive}, logs ${newLogs.join(' | ')}`);
} catch (e) {
  check('the run finished', false, e.stack || String(e));
} finally {
  await page.close();
  try { await srv.close(); } catch {}
  fs.rmSync(tmp, { recursive: true, force: true });
}
for (const x of results) console.log(x);
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(failed ? `${failed} of ${results.length} probe checks FAILED` : `ALL ${results.length} probe checks passed`);
process.exit(failed ? 1 : 0);
