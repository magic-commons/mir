/* dev-tools.node.mjs — the pure parts of the developer tools, and the dev server's HTTPS and Range, with no browser.
 *   serve.mjs      byteRange; Range → 206 with Content-Range; a conditional request is still answered 200; no-store; the cache-only reset only
 *                  when asked; HTTPS with a self-signed certificate made into a temp folder (skipped, said so, with no openssl)
 *   hit-probe.mjs  gridPoints / tally / parseArgs / report
 *   audit-material.mjs  contrast / summarise / parseArgs
 *   webkit.mjs     playwrightKey: tools/cdp.mjs's key specs in Playwright's names */
import assert from 'node:assert/strict'; import http from 'node:http'; import https from 'node:https'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve, byteRange, devCertificate } from '../tools/serve.mjs';
import { gridPoints, tally, parseArgs as hitArgs, report as hitReport } from '../tools/hit-probe.mjs';
import { contrast, parseColor, summarise, parseArgs as auditArgs } from '../tools/audit-material.mjs';
import { playwrightKey } from '../tools/webkit.mjs';

let n = 0; const ok = (name, f) => { f(); n++; console.log('PASS  ' + name); };
const okA = async (name, f) => { await f(); n++; console.log('PASS  ' + name); };

ok('byteRange: the three single forms, an open end, a suffix, and what is not a range', () => {
  assert.deepEqual(byteRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(byteRange('bytes=90-', 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange('bytes=50-500', 100), { start: 50, end: 99 });
  assert.equal(byteRange('bytes=100-', 100), 'bad'); assert.equal(byteRange('bytes=0-1,5-6', 100), null); assert.equal(byteRange('items=0-1', 100), null);
});

const get = (url, headers = {}, opts = {}) => new Promise((resolve, reject) => {
  (url.startsWith('https') ? https : http).get(url, { headers, rejectUnauthorized: false, agent: false, ...opts }, (res) => { const b = []; res.on('data', (d) => b.push(d)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(b).toString() })); }).on('error', reject);
});

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mir-serve-test-'));
fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><p>hi</p>'); fs.writeFileSync(path.join(root, 'data.txt'), '0123456789');
const s = await serve(0, root);
try {
  await okA('serve: no-store, Accept-Ranges, and no Clear-Site-Data unless asked', async () => {
    const r = await get(s.url + '/data.txt'); assert.equal(r.status, 200); assert.equal(r.headers['cache-control'], 'no-store'); assert.equal(r.headers['accept-ranges'], 'bytes');
    assert.equal((await get(s.url + '/')).headers['clear-site-data'], undefined);
  });
  await okA('serve: a Range request is a 206 with the slice, a conditional request is still a full 200, a bad range is a 416', async () => {
    let r = await get(s.url + '/data.txt', { range: 'bytes=2-5' }); assert.equal(r.status, 206); assert.equal(r.body, '2345'); assert.equal(r.headers['content-range'], 'bytes 2-5/10');
    r = await get(s.url + '/data.txt', { 'if-none-match': '"x"', 'if-modified-since': new Date(Date.now() + 1e9).toUTCString() }); assert.equal(r.status, 200); assert.equal(r.body, '0123456789');
    r = await get(s.url + '/data.txt', { range: 'bytes=50-' }); assert.equal(r.status, 416);
  });
  await okA('serve: a path cannot climb out of the root, and a missing file is a 404', async () => {
    assert.ok([403, 404].includes((await get(s.url + '/%2e%2e/%2e%2e/etc/passwd')).status)); assert.equal((await get(s.url + '/nope.txt')).status, 404);
  });
} finally { await s.close(); }
const s2 = await serve(0, root, { resetCache: true });
try { await okA('serve: resetCache sends Clear-Site-Data: "cache" on HTML only', async () => { assert.equal((await get(s2.url + '/')).headers['clear-site-data'], '"cache"'); assert.equal((await get(s2.url + '/data.txt')).headers['clear-site-data'], undefined); }); }
finally { await s2.close(); }

let haveOpenssl = true; try { execFileSync('openssl', ['version'], { stdio: 'ignore' }); } catch { haveOpenssl = false; }
if (!haveOpenssl) console.log('SKIP  https: no openssl on this machine');
else {
  await okA('serve --https: a self-signed certificate is made once into a folder, reused, and made again when the addresses change', async () => {
    const dir = path.join(root, 'certs'), a = devCertificate(['10.1.2.3'], dir), t1 = fs.statSync(path.join(dir, 'dev.crt')).mtimeMs;
    assert.match(a.cert.toString(), /BEGIN CERTIFICATE/); assert.match(a.key.toString(), /PRIVATE KEY/);
    await new Promise((r) => setTimeout(r, 20)); devCertificate(['10.1.2.3'], dir); assert.equal(fs.statSync(path.join(dir, 'dev.crt')).mtimeMs, t1);
    await new Promise((r) => setTimeout(r, 20)); devCertificate(['10.1.2.3', '10.1.2.4'], dir); assert.ok(fs.statSync(path.join(dir, 'dev.crt')).mtimeMs > t1);
    assert.match(execFileSync('openssl', ['x509', '-in', path.join(dir, 'dev.crt'), '-noout', '-ext', 'subjectAltName'], { encoding: 'utf8' }), /10\.1\.2\.4/);
  });
  const s3 = await serve(0, root, { https: true });
  try { await okA('serve --https: a page is served over TLS and says so in its URL', async () => { assert.match(s3.url, /^https:/); const r = await get(s3.url + '/data.txt'); assert.equal(r.status, 200); assert.equal(r.body, '0123456789'); }); }
  finally { await s3.close(); }
}
fs.rmSync(root, { recursive: true, force: true });

ok('hit-probe: gridPoints is n × n and never on the edge; tally counts what went through', () => {
  const g = gridPoints({ left: 0, top: 0, width: 60, height: 60 }, 5); assert.equal(g.length, 25); assert.deepEqual(g[0], { x: 10, y: 10 }); assert.deepEqual(g[24], { x: 50, y: 50 });
  assert.deepEqual(tally([{ inside: true, name: 'a' }, { inside: false, name: 'b' }, { inside: false, name: 'b' }, { inside: false, name: 'c' }]), { inside: 1, through: 3, landsOn: [['b', 2], ['c', 1]] });
});
ok('hit-probe: the arguments, and the report fails on a point that went through or a drag that changed nothing', () => {
  const o = hitArgs(['http://x/', '#k', '--drag', '0,-40', '--watch', 'a', '--watch', 'b', '--grid', '3']); assert.deepEqual(o.drag, [0, -40]); assert.deepEqual(o.watch, ['a', 'b']); assert.equal(o.grid, 3);
  assert.ok(hitArgs(['http://x/']).error); assert.ok(hitArgs(['http://x/', '#k', '--drag', 'up']).error);
  const base = { found: true, name: 'div.k', matches: 1, box: [0, 0, 10, 10], noPointer: [], offscreen: false };
  assert.equal(hitReport(o, { ...base, grid: { n: 3, inside: 9, through: 0, landsOn: [] }, drag: { from: [5, 5], by: [0, -40], landedOn: 'div.k', landedInside: true, changed: ['its markup'] } }).ok, true);
  assert.equal(hitReport(o, { ...base, grid: { n: 3, inside: 8, through: 1, landsOn: [['body', 1]] } }).ok, false);
  assert.equal(hitReport(o, { ...base, grid: { n: 3, inside: 9, through: 0, landsOn: [] }, drag: { from: [5, 5], by: [0, -40], landedOn: 'div.k', landedInside: true, changed: [] } }).ok, false);
});
ok('audit-material: WCAG contrast, the colours it reads, and the verdict from a sweep', () => {
  assert.equal(Math.round(contrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })), 21); assert.deepEqual(parseColor('rgba(28, 32, 38, 0.84)'), { r: 28, g: 32, b: 38, a: 0.84 }); assert.deepEqual(parseColor('rgb(1 2 3 / 50%)'), { r: 1, g: 2, b: 3, a: 0.5 }); assert.deepEqual(parseColor('color(srgb 1 0 0 / 0.5)'), { r: 255, g: 0, b: 0, a: 0.5 }); const w = parseColor('oklab(1 0 0)'); assert.ok(w.r > 254 && w.g > 254 && w.b > 254 && w.a === 1); assert.equal(parseColor('transparent'), null);
  const raw = { opaque: [['a', { kind: 'FACE' }], ['b', { kind: 'accent' }], ['c', { kind: 'content' }]], faint: [], skipped: 0, texts: 3, ink: { cells: 0, followed: 0, stray: [] } };
  const sm = summarise(raw); assert.equal(sm.faces.length, 1); assert.deepEqual(sm.allowed, { accent: 1, content: 1 }); assert.equal(sm.ok, false);
  assert.equal(summarise({ ...raw, opaque: raw.opaque.slice(1) }).ok, true);
  assert.equal(auditArgs(['http://x/', '--click', '#a', '--click', '#b', '--theme', 'light']).click.length, 2); assert.ok(auditArgs([]).error); assert.ok(auditArgs(['http://x/', '--theme', 'sepia']).error);
});
ok('webkit: key specs in Playwright\'s names', () => {
  assert.equal(playwrightKey('Mod+S'), 'Control+KeyS'); assert.equal(playwrightKey('?'), 'Shift+Slash'); assert.equal(playwrightKey('Space'), 'Space'); assert.equal(playwrightKey('ArrowLeft'), 'ArrowLeft'); assert.equal(playwrightKey('X'), 'KeyX'); assert.equal(playwrightKey('7'), 'Digit7');
});
console.log(`ALL ${n} developer-tool checks passed`);
