#!/usr/bin/env node
/* probe.mjs — the REMOTE PROBE: a page opened on another device (Safari on the iPad, Android Chrome, any browser on the network)
 * reports its console, errors, device and WebGPU details, touches and frame timings to this machine, and runs the scripts this
 * machine sends it.  Nothing in mir/** or in an app changes: the probe server serves the app's folder exactly as
 * `tools/serve.mjs --https --lan` does and adds ONE line, <script src="/__probe/client.js"></script>, as the first thing in the
 * <head> of every HTML page.  docs/PROBE.md is the manual.
 *
 *   node tools/probe.mjs serve [port] <root> [--http] [--lan] [--data <dir>]   serve <root> with the probe (default port 8931, TLS on
 *                                                       every address; --http: plain HTTP on 127.0.0.1 only, for tests and the desktop,
 *                                                       add --lan to open it to the network)
 *   node tools/probe.mjs sessions                        the sessions, newest first
 *   node tools/probe.mjs report <session>                the device report
 *   node tools/probe.mjs log <session> [--errors] [--since <n>] [--kind <k>]
 *   node tools/probe.mjs run <session> <file.js | -e "code"> [--timeout <ms>]   run it in the page, print the value as JSON
 *   node tools/probe.mjs shot <session> [selector]       a canvas to PNG; prints the PNG's path
 *   <session> may be `latest`.  --port <n> on any command (default 8931).
 *
 * THE SECURITY LINE: the page-side endpoints (/__probe/client.js, log, next, result) are open to the network; the control
 * endpoints (/__probe/ctl/*: queue a command, list sessions, read a log) answer ONLY to a request whose remote address is this
 * machine's loopback, and refuse everything else with 403.  Only this machine can run script in the page.
 * Data: tools/.probe/<session>/log.ndjson (one record a line, with the server's receive time `rt`), results/<n>.json, shots/<n>.png. */
import http from 'node:http'; import https from 'node:https'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_PORT = 8931;
export const DEFAULT_DATA = path.join(HERE, '.probe');
export const TAG = '<script src="/__probe/client.js"></script>';
const CLIENT = path.join(HERE, 'probe-client.js');
const POLL_MS = 25000;

/** isLoopback(remoteAddress) → true only for 127.0.0.0/8, ::1 and their IPv4-mapped forms (pure; the security line) */
export function isLoopback(addr) {
  let a = String(addr || '').trim().toLowerCase();
  if (a.startsWith('::ffff:')) a = a.slice(7);
  return a === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(a);
}

/** inject(html) → the same page with TAG as the first thing inside <head> (or, with no <head>, right after <html> / the doctype) */
export function inject(html) {
  const at = (re) => { const m = re.exec(html); return m ? m.index + m[0].length : -1; };
  let i = at(/<head(?:\s[^>]*)?>/i);
  if (i < 0) i = at(/<html(?:\s[^>]*)?>/i);
  if (i < 0) i = at(/<!doctype[^>]*>/i);
  if (i < 0) i = 0;
  return html.slice(0, i) + TAG + html.slice(i);
}

const PROBLEM_GPU = /^(lost|uncapturederror|device-failed)$/;
/** isProblem(record) → an error, a rejection, a CSP violation, GPU or WebGL trouble, a failed adapter, console.error or console.warn */
export function isProblem(r) {
  if (!r) return false;
  if (r.k === 'error' || r.k === 'rejection' || r.k === 'csp' || r.k === 'webgl') return true;
  if (r.k === 'gpu') return PROBLEM_GPU.test(r.ev) || (r.ev === 'adapter' && !r.ok);
  return r.k === 'console' && (r.level === 'error' || r.level === 'warn');
}

/** deviceWords(report) → 'iPad · Safari 18.4 · 1180×820@2x · WebGPU' */
export function deviceWords(rep) {
  if (!rep) return '(no report yet)';
  const ua = rep.ua || '';
  const dev = /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? (rep.maxTouchPoints > 1 ? 'iPad' : 'Mac')
    : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'a device';
  let m, br = 'a browser';
  if ((m = /Firefox\/([\d.]+)/.exec(ua))) br = 'Firefox ' + m[1];
  else if ((m = /EdgA?\/([\d.]+)/.exec(ua))) br = 'Edge ' + m[1];
  else if ((m = /CriOS\/([\d.]+)/.exec(ua))) br = 'Chrome (iOS) ' + m[1];
  else if ((m = /Chrome\/([\d.]+)/.exec(ua))) br = 'Chrome ' + m[1];
  else if ((m = /Version\/([\d.]+).*Safari/.exec(ua))) br = 'Safari ' + m[1];
  else if (/AppleWebKit/.test(ua)) br = 'WebKit';
  const vp = rep.viewport ? `${rep.viewport.innerW}×${rep.viewport.innerH}@${rep.dpr}x` : '';
  const gpu = rep.gpu ? (rep.gpu.adapter ? 'WebGPU' : rep.gpu.present ? 'WebGPU without an adapter' : 'no WebGPU') : '';
  return [dev, br, vp, gpu].filter(Boolean).join(' · ');
}

const sid = (s) => (typeof s === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : null);
const json = (res, status, obj) => { const b = Buffer.from(JSON.stringify(obj)); res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': b.length }); res.end(b); };
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject);
  });
}
const readLines = (file) => { try { return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } };

/** startProbe({ port, root, http, lan, data, quiet }) → { url, port, scheme, lan, data, close } — the server, importable for tests */
export async function startProbe({ port = DEFAULT_PORT, root = process.cwd(), http: plain = false, lan = false, data = DEFAULT_DATA, quiet = false, resetCache = true } = {}) {
  const say = quiet ? () => {} : (s) => console.log(s);
  fs.mkdirSync(data, { recursive: true });
  const sessions = new Map();
  /* a session: one page load.  Loaded from disk when the server restarts, so `sessions` and `log` still see earlier ones. */
  function session(id, create) {
    let s = sessions.get(id); if (s) return s;
    const dir = path.join(data, id);
    if (!create && !fs.existsSync(path.join(dir, 'log.ndjson'))) return null;
    s = { id, dir, n: 0, errors: 0, start: 0, last: 0, report: null, queue: [], waiter: null, lastPoll: 0, pending: new Map(), cmd: 0 };
    const old = readLines(path.join(dir, 'log.ndjson'));
    s.n = old.length; s.errors = old.filter(isProblem).length; s.start = old.length ? old[0].rt : 0; s.last = old.length ? old[old.length - 1].rt : 0;
    s.report = (old.find((r) => r.k === 'device') || {}).report || null;
    try { s.cmd = Math.max(0, ...fs.readdirSync(path.join(dir, 'results')).map((f) => parseInt(f, 10) || 0)); } catch {}
    sessions.set(id, s); return s;
  }
  for (const d of fs.readdirSync(data)) if (sid(d)) session(d, false);
  const summary = (s) => ({ id: s.id, device: deviceWords(s.report), start: s.start, last: s.last, records: s.n, errors: s.errors, connected: !!s.waiter || Date.now() - s.lastPoll < 3000 });
  const newest = () => [...sessions.values()].sort((a, b) => (b.start || 0) - (a.start || 0) || (b.id < a.id ? -1 : 1));
  const resolveId = (q) => (q === 'latest' ? (newest()[0] || {}).id : sid(q));

  function append(s, recs) {
    const rt = Date.now(); let lines = '';
    for (const r of recs) {
      if (!r || typeof r !== 'object') continue;
      r.rt = rt; r.n = s.n++;
      if (!s.start) s.start = rt;
      if (r.k === 'device' && !s.report) { s.report = r.report; say(`+ session ${s.id}  ${deviceWords(r.report)}`); }
      if (isProblem(r)) { s.errors++; say(`! ${s.id}  ${formatRecord(r).split('\n')[0]}`); }
      lines += JSON.stringify(r) + '\n';
    }
    s.last = rt; fs.mkdirSync(s.dir, { recursive: true }); fs.appendFileSync(path.join(s.dir, 'log.ndjson'), lines);
  }
  function deliver(s) {
    if (!s.waiter || !s.queue.length) return;
    const w = s.waiter; s.waiter = null; clearTimeout(w.timer);
    const cmd = s.queue.shift(); cmd.delivered = true; json(w.res, 200, { cmd: { id: cmd.id, code: cmd.code } });
  }
  /* a shot comes back as { __png: 'data:image/png;base64,…' } anywhere in the value: written to shots/<n>.png and replaced by its path */
  function shots(s, n, v) {
    let k = 0;
    const walk = (x) => {
      if (!x || typeof x !== 'object') return x;
      if (Array.isArray(x)) return x.map(walk);
      for (const key of Object.keys(x)) {
        if (key === '__png' && typeof x[key] === 'string' && x[key].startsWith('data:image/png;base64,')) {
          const buf = Buffer.from(x[key].slice(22), 'base64'), file = path.join(s.dir, 'shots', (k++ ? `${n}-${k}` : `${n}`) + '.png');
          fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf);
          delete x[key]; x.png = file; x.bytes = buf.length;
        } else x[key] = walk(x[key]);
      }
      return x;
    };
    return walk(v);
  }

  async function page(req, res, route, q) {
    if (route === 'client.js' && req.method === 'GET') {
      const b = fs.readFileSync(CLIENT); res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store', 'content-length': b.length }); res.end(b); return;
    }
    if (route === 'log' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req, 4 << 20)); const s = sid(body.s) && session(body.s, true);
      if (!s || !Array.isArray(body.recs)) return json(res, 400, { error: 'bad batch' });
      append(s, body.recs); res.writeHead(204).end(); return;
    }
    if (route === 'next' && req.method === 'GET') {
      const s = sid(q.get('s')) && session(q.get('s'), true); if (!s) return json(res, 400, { error: 'bad session' });
      if (s.waiter) { const w = s.waiter; s.waiter = null; clearTimeout(w.timer); json(w.res, 200, { cmd: null }); }
      s.lastPoll = Date.now();
      const w = { res, timer: setTimeout(() => { if (s.waiter === w) { s.waiter = null; s.lastPoll = Date.now(); json(res, 200, { cmd: null }); } }, POLL_MS) };
      s.waiter = w; res.on('close', () => { if (s.waiter === w) { s.waiter = null; clearTimeout(w.timer); s.lastPoll = Date.now(); } });
      deliver(s); return;
    }
    if (route === 'result' && req.method === 'POST') {
      const r = JSON.parse(await readBody(req, 64 << 20)); const s = sid(r.s) && session(r.s, false);
      if (!s || typeof r.id !== 'number') return json(res, 400, { error: 'bad result' });
      delete r.s; r.rt = Date.now(); if (r.ok) r.value = shots(s, r.id, r.value);
      fs.mkdirSync(path.join(s.dir, 'results'), { recursive: true }); fs.writeFileSync(path.join(s.dir, 'results', r.id + '.json'), JSON.stringify(r, null, 1));
      append(s, [{ k: 'result', t: null, id: r.id, ok: r.ok, ms: r.ms }]);
      const p = s.pending.get(r.id); if (p) { s.pending.delete(r.id); p(r); }
      res.writeHead(204).end(); return;
    }
    json(res, 404, { error: 'no such probe endpoint' });
  }

  async function control(req, res, route, q) {
    if (route === 'sessions') return json(res, 200, newest().map(summary));
    const id = resolveId(q.get('s')), s = id && session(id, false);
    if (!s) return json(res, 404, { error: 'no such session: ' + q.get('s') });
    if (route === 'log') {
      const since = Number(q.get('since') || 0), kind = q.get('kind'), errors = q.get('errors') === '1';
      const recs = readLines(path.join(s.dir, 'log.ndjson')).filter((r) => r.n >= since && (!kind || r.k === kind) && (!errors || isProblem(r)));
      return json(res, 200, { session: summary(s), records: recs });
    }
    if (route === 'run' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req, 4 << 20)); const wait = Math.max(100, Number(q.get('wait')) || 30000);
      if (typeof body.code !== 'string') return json(res, 400, { error: 'no code' });
      const cmd = { id: ++s.cmd, code: body.code, delivered: false };
      const got = new Promise((resolve) => { s.pending.set(cmd.id, resolve); setTimeout(() => { if (s.pending.delete(cmd.id)) resolve(null); }, wait); });
      s.queue.push(cmd); deliver(s);
      const r = await got;
      if (r) return json(res, 200, { session: s.id, ...r });
      const i = s.queue.indexOf(cmd); if (i >= 0) s.queue.splice(i, 1);
      return json(res, 504, { session: s.id, id: cmd.id, error: cmd.delivered ? `the page took the command but sent no result within ${wait} ms` : `not delivered within ${wait} ms: the page is not polling (closed, asleep, or in the background)` });
    }
    json(res, 404, { error: 'no such control endpoint' });
  }

  const intercept = (req, res) => {
    let u; try { u = new URL(req.url, 'http://x'); } catch { return false; }
    if (!u.pathname.startsWith('/__probe/')) return false;
    const route = u.pathname.slice('/__probe/'.length);
    const ctl = route.startsWith('ctl/');
    if (ctl && !isLoopback(req.socket.remoteAddress)) { json(res, 403, { error: 'the probe control endpoints answer only to this machine' }); return true; }
    (ctl ? control(req, res, route.slice(4), u.searchParams) : page(req, res, route, u.searchParams))
      .catch((e) => { try { if (!res.headersSent) json(res, 400, { error: String(e && e.message || e) }); else res.destroy(); } catch {} });
    return true;
  };
  const srv = await serve(port, root, { https: !plain, lan: plain ? lan : true, resetCache, intercept, html: (text) => inject(text) });
  return { ...srv, data, close: () => { for (const s of sessions.values()) if (s.waiter) { clearTimeout(s.waiter.timer); s.waiter = null; } return srv.close(); } };
}

/* ---------------- readable lines ---------------- */
const short = (v, n = 300) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > n ? s.slice(0, n) + '…' : s; };
/** formatRecord(r) → one readable line (a stack follows on indented lines) */
export function formatRecord(r) {
  const head = `#${r.n ?? '?'}  ${typeof r.t === 'number' ? '+' + (r.t / 1000).toFixed(2) + 's' : '       '}  `;
  const rest = (o) => { const x = { ...o }; for (const k of ['k', 't', 'n', 'rt']) delete x[k]; return short(x); };
  switch (r.k) {
    case 'device': return head + 'device   ' + deviceWords(r.report);
    case 'console': return head + `console.${r.level}  ` + (r.args || []).map((a) => (typeof a === 'string' ? a : short(a, 200))).join(' ');
    case 'error':
      if (r.resource) return head + `error    a resource failed to load: ${r.target} ${r.src}`;
      return head + `error    ${r.message}  (${r.file || '?'}:${r.line}:${r.col})` + (r.stack ? '\n' + String(r.stack).split('\n').slice(0, 6).map((l) => '           ' + l.trim()).join('\n') : '');
    case 'rejection': return head + 'rejection ' + (r.reason && r.reason.message ? r.reason.error + ': ' + r.reason.message + (r.reason.stack ? '\n' + String(r.reason.stack).split('\n').slice(0, 6).map((l) => '           ' + l.trim()).join('\n') : '') : short(r.reason));
    case 'frames': return head + `frames   ${r.frames} frames · mean ${r.mean} ms · p95 ${r.p95} · max ${r.max} · over 33 ms ${r.over33} · over 50 ms ${r.over50}`;
    case 'input': return head + `input    ${r.ev}${r.type ? ' ' + r.type : ''}${r.key ? ' ' + r.key : ''}${r.x !== undefined ? ` at ${r.x},${r.y}` : ''}${r.moves !== undefined ? ` · ${r.moves} moves, path ${r.path} px, ${r.ms} ms` : ''}${r.touches !== undefined ? ` · ${r.touches} down` : ''}${r.synthetic ? ' (synthetic)' : ''} → ${r.target}`;
    case 'result': return head + `result   command ${r.id} ${r.ok ? 'ok' : 'FAILED'} in ${r.ms} ms`;
    default: return head + (r.k + '        ').slice(0, 9) + rest(r);
  }
}
function printTree(o, indent = '') {
  for (const [k, v] of Object.entries(o || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) { console.log(indent + k + ':'); printTree(v, indent + '  '); }
    else console.log(indent + k + ': ' + (Array.isArray(v) ? v.join(', ') : v));
  }
}

/* ---------------- the command line ---------------- */
function request(scheme, port, method, p, body, timeout) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const r = (scheme === 'https' ? https : http).request({ host: '127.0.0.1', port, method, path: p, rejectUnauthorized: false, headers: data ? { 'content-type': 'application/json', 'content-length': data.length } : {} },
      (res) => { let b = ''; res.setEncoding('utf8'); res.on('data', (d) => { b += d; }); res.on('end', () => { let j; try { j = JSON.parse(b); } catch { j = { error: b.slice(0, 300) }; } resolve({ status: res.statusCode, body: j }); }); });
    r.setTimeout(timeout, () => r.destroy(new Error('timed out')));
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
let SCHEME = null;
/** ctl(port, method, path, body, timeout) — a control request to the running server on loopback (TLS tried first, then plain HTTP) */
export async function ctl(port, method, p, body, timeout = 10000) {
  let last;
  for (const s of SCHEME ? [SCHEME] : ['https', 'http']) {
    try { const r = await request(s, port, method, '/__probe/ctl/' + p, body, timeout); SCHEME = s; return r; } catch (e) { last = e; }
  }
  throw new Error(`no probe server answered on 127.0.0.1:${port} (${last && last.message}); start one with: node tools/probe.mjs serve <root>`);
}

async function main(argv) {
  const flags = {}, pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-e') { flags.e = argv[++i]; continue; }
    if (['--port', '--since', '--kind', '--timeout', '--data'].includes(a)) { flags[a.slice(2)] = argv[++i]; continue; }
    if (a.startsWith('--')) { flags[a.slice(2)] = true; continue; }
    pos.push(a);
  }
  const cmd = pos.shift(); let port = Number(flags.port) || DEFAULT_PORT;
  const die = (msg) => { console.error(msg); process.exit(1); };
  const need = (x, what) => x || die(`probe ${cmd}: give the ${what} (or \`latest\`)`);
  if (cmd === 'serve') {
    if (pos[0] && /^\d+$/.test(pos[0])) port = Number(pos.shift());
    const root = path.resolve(pos[0] || process.cwd());
    const s = await startProbe({ port, root, http: !!flags.http, lan: !!flags.lan, data: flags.data ? path.resolve(flags.data) : DEFAULT_DATA, resetCache: !flags['no-reset'] });
    const pages = ['app/', 'starter/', 'gallery/'].filter((p) => fs.existsSync(path.join(root, p, 'index.html')));
    console.log(`probe: serving ${root} on ${s.url}/` + pages.map((p) => `\n  ${s.url}/${p}`).join('')
      + (s.lan.length ? `\n  on the network (type this on the device): ${s.lan.map((u) => u + '/' + (pages[0] || '')).join('  ')}` + (s.scheme === 'https' ? '\n  the certificate is self-signed: accept the warning once in Safari' : '') : '')
      + `\n  records: ${s.data}/<session>/   control (sessions, log, run, shot): this machine only`);
    const stop = () => { s.close().then(() => process.exit(0)); };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    return;
  }
  if (cmd === 'sessions') {
    const r = await ctl(port, 'GET', 'sessions'); if (r.status !== 200) die(r.body.error);
    if (!r.body.length) { console.log('no sessions yet: open the page on the device'); return; }
    const t = (ms) => (ms ? new Date(ms).toLocaleTimeString('en-GB') : '—');
    for (const s of r.body) console.log(`${s.connected ? '●' : '○'} ${s.id}  ${s.device}  started ${t(s.start)}  last ${t(s.last)}  ${s.records} records  ${s.errors} problems${s.connected ? '  connected' : ''}`);
    return;
  }
  if (cmd === 'report') {
    const r = await ctl(port, 'GET', `log?s=${encodeURIComponent(need(pos[0], 'session'))}&kind=device`); if (r.status !== 200) die(r.body.error);
    const d = r.body.records[0]; if (!d) die('no device report yet');
    console.log(`${r.body.session.id}  ${deviceWords(d.report)}\n`); printTree(d.report); return;
  }
  if (cmd === 'log') {
    const q = `log?s=${encodeURIComponent(need(pos[0], 'session'))}&since=${Number(flags.since) || 0}` + (flags.kind ? '&kind=' + encodeURIComponent(flags.kind) : '') + (flags.errors ? '&errors=1' : '');
    const r = await ctl(port, 'GET', q); if (r.status !== 200) die(r.body.error);
    for (const rec of r.body.records) console.log(formatRecord(rec));
    return;
  }
  if (cmd === 'run' || cmd === 'shot') {
    const s = need(pos[0], 'session');
    let code;
    if (cmd === 'shot') code = `return await probe.shot(${pos[1] ? JSON.stringify(pos[1]) : ''});`;
    else if (flags.e !== undefined) code = flags.e;
    else if (pos[1]) code = fs.readFileSync(pos[1], 'utf8');
    else die('probe run: give a file or -e "code"');
    const wait = Number(flags.timeout) || 30000;
    const r = await ctl(port, 'POST', `run?s=${encodeURIComponent(s)}&wait=${wait}`, { code }, wait + 10000);
    if (r.status !== 200) die(`probe ${cmd}: ${r.body.error}`);
    if (!r.body.ok) die(`probe ${cmd} (${r.body.session} command ${r.body.id}, ${r.body.ms} ms) threw: ` + short(r.body.error, 4000));
    if (cmd === 'shot') { const v = r.body.value || {}; console.log(v.png + `   (${v.width}×${v.height}, ${v.bytes} bytes${v.blank ? ', BLANK: one colour in a 32×32 sample' : ''}, ${v.canvas})`); return; }
    console.log(JSON.stringify(r.body.value, null, 2)); return;
  }
  die('usage: node tools/probe.mjs serve [port] <root> [--http] [--lan] | sessions | report <s> | log <s> [--errors] [--since n] [--kind k] | run <s> <file | -e code> | shot <s> [selector]   (--port, default 8931)');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((e) => { console.error('probe: ' + (e && e.message || e)); process.exit(1); });
}
