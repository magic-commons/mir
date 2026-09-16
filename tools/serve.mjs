#!/usr/bin/env node
/* serve.mjs — a static server for the kit's own pages and proofs, with no dependency.
 *   node tools/serve.mjs [port] [root]      default 8790 and the kit's own folder
 * Import { serve } to start one on a free port from a test: const { url, close } = await serve(0). */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.wgsl': 'text/plain; charset=utf-8' };

export function serve(port = 8790, root = fileURLToPath(new URL('..', import.meta.url))) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    let file = path.resolve(base, '.' + rel);
    if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }   // never outside the root
    try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch {}
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => {
    const p = server.address().port;
    resolve({ url: `http://127.0.0.1:${p}`, port: p, close: () => new Promise((r) => { server.close(r); server.closeAllConnections?.(); }) });   // a browser's keep-alive must not hold the close open
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.argv[2] || 8790), root = process.argv[3];
  const s = await serve(port, root || undefined);
  console.log(`serving ${root || 'the kit'} on ${s.url}/  (gallery: ${s.url}/gallery/ · shell: ${s.url}/gallery/shell.html)`);
}
