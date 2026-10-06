#!/usr/bin/env node
/* serve.mjs — a static server for the kit's own pages and proofs, with no dependency.
 *   node tools/serve.mjs [port] [root] [--https] [--lan] [--no-reset]      default 8790 and the kit's own folder
 *     --https     serve TLS, for an iPad (WebGPU, wake lock, the clipboard and install need a secure context): a self-signed
 *                 certificate is made on first use with the system's openssl into tools/.certs/ (gitignored, never committed),
 *                 and made again when this machine's addresses change.  Open the URL once on the iPad and accept the warning.
 *     --lan       listen on every network address, not only 127.0.0.1, and print the address to type on the iPad (implied by --https)
 *     --no-reset  leave out the cache-only reset below
 * Every file is sent no-store, a conditional request is never answered 304, and a Range request is answered 206 (Safari will not play
 * a video or an audio file without it): one current module graph on every reload.  From the command line an HTML page also carries
 * Clear-Site-Data: "cache", which empties a browser's HTTP cache that kept files from before no-store (only the cache: projects,
 * preferences and files stay).  Import { serve } to start one on a free port from a test: const { url, close } = await serve(0);
 * serve(port, root, { https, lan, resetCache }) takes the same switches. */
import http from 'node:http'; import https from 'node:https'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.wgsl': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.wasm': 'application/wasm' };
const CERTS = fileURLToPath(new URL('./.certs/', import.meta.url));

/** the machine's non-loopback IPv4 addresses (what an iPad on the LAN can reach) */
export const lanAddresses = () => Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address).sort();

/** byteRange('bytes=0-99' | 'bytes=500-' | 'bytes=-200', size) → { start, end } | 'bad' | null (null: not a single range, so send it whole); pure, exported for tests */
export function byteRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || '').trim()); if (!m || (!m[1] && !m[2])) return null;
  let start, end;
  if (m[1]) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1; } else { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  return size === 0 || start > end || start >= size ? 'bad' : { start, end };
}

/** the self-signed certificate for this machine's addresses: { key, cert }, made with openssl into tools/.certs/ on first use */
export function devCertificate(addresses = lanAddresses(), dir = CERTS) {
  const names = ['DNS:localhost', 'IP:127.0.0.1', ...addresses.map((a) => 'IP:' + a)].join(',');
  const key = path.join(dir, 'dev.key'), crt = path.join(dir, 'dev.crt'), sans = path.join(dir, 'dev.san');
  const same = fs.existsSync(key) && fs.existsSync(crt) && fs.existsSync(sans) && fs.readFileSync(sans, 'utf8') === names;
  if (!same) {
    fs.mkdirSync(dir, { recursive: true });
    try { execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '365', '-subj', '/CN=mir-dev', '-addext', 'subjectAltName=' + names, '-keyout', key, '-out', crt], { stdio: 'ignore' }); }
    catch (e) { throw new Error('--https needs the openssl command to make its certificate (apt install openssl), or put dev.key and dev.crt in ' + dir + ': ' + e.message); }
    fs.writeFileSync(sans, names);
  }
  return { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
}

export function serve(port = 8790, root = fileURLToPath(new URL('..', import.meta.url)), { https: tls = false, lan = false, resetCache = false } = {}) {
  const base = path.resolve(root);
  const handler = (req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    let file = path.resolve(base, '.' + rel);
    if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }   // never outside the root
    let stat; try { stat = fs.statSync(file); if (stat.isDirectory()) { file = path.join(file, 'index.html'); stat = fs.statSync(file); } } catch { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
    const ext = path.extname(file);
    const head = { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store', 'accept-ranges': 'bytes' };
    if (resetCache && ext === '.html') head['clear-site-data'] = '"cache"';
    const range = req.headers.range ? byteRange(req.headers.range, stat.size) : null;   // a conditional header is ignored on purpose: the bytes are always sent
    if (range === 'bad') { res.writeHead(416, { 'content-range': `bytes */${stat.size}` }).end(); return; }
    const opts = range ? { start: range.start, end: range.end } : {};
    if (range) res.writeHead(206, { ...head, 'content-range': `bytes ${range.start}-${range.end}/${stat.size}`, 'content-length': range.end - range.start + 1 });
    else res.writeHead(200, { ...head, 'content-length': stat.size });
    if (req.method === 'HEAD') { res.end(); return; }
    const s = fs.createReadStream(file, opts); s.on('error', () => res.destroy()); res.on('close', () => s.destroy()); s.pipe(res);   // a closed tab must not leave a read open
  };
  const server = tls ? https.createServer(devCertificate(), handler) : http.createServer(handler);
  const host = lan || tls ? '0.0.0.0' : '127.0.0.1';
  return new Promise((resolve) => server.listen(port, host, () => {
    const p = server.address().port, scheme = tls ? 'https' : 'http';
    resolve({ url: `${scheme}://127.0.0.1:${p}`, port: p, scheme, lan: host === '0.0.0.0' ? lanAddresses().map((a) => `${scheme}://${a}:${p}`) : [],
      close: () => new Promise((r) => { server.close(r); server.closeAllConnections?.(); }) });   // a browser's keep-alive must not hold the close open
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const rest = process.argv.slice(2), flags = rest.filter((a) => a.startsWith('--')), pos = rest.filter((a) => !a.startsWith('--'));
  const port = Number(pos[0] || 8790), dir = path.resolve(pos[1] || fileURLToPath(new URL('..', import.meta.url)));
  const s = await serve(port, dir, { https: flags.includes('--https'), lan: flags.includes('--lan'), resetCache: !flags.includes('--no-reset') });
  /* say what is there: in the kit, the gallery and the starter; in an app made from the starter, the app */
  const pages = ['app/', 'starter/', 'gallery/'].filter((p) => fs.existsSync(path.join(dir, p, 'index.html'))).map((p) => `${s.url}/${p}`);
  console.log(`serving ${dir} on ${s.url}/` + (pages.length ? `\n  ${pages.join('\n  ')}` : '') + (s.lan.length ? `\n  on the network (the iPad): ${s.lan.map((u) => u + '/').join('  ')}` + (s.scheme === 'https' ? '\n  the certificate is self-signed: accept the warning once in Safari' : '') : ''));
}
