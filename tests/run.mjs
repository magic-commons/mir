#!/usr/bin/env node
/* tests/run.mjs — `npm test`: every proof the kit can run on its own.
 *   1. the token lint (tools/lint-tokens.mjs)
 *   2. every tests/*.node.mjs, each in its own node process
 *   3. a static server on a free port, then every tests/*.browser.mjs with MIR_BASE=<its url> (they need Chromium;
 *      MIR_SKIP_BROWSER=1 skips them, and says so)
 * The λWAVES parity proof is not here: it needs λWAVES served (see README, "Prove it"). */
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const results = [];
/* children run ASYNCHRONOUSLY: the static server the browser tests read lives in THIS process, and a blocking
   spawnSync would freeze it — every navigation then times out (measured 2026-09-16: 90 s, both suites) */
const spawnP = (args, env) => new Promise((resolve) => {
  const c = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env } });
  let stdout = '', stderr = '';
  c.stdout.on('data', (d) => { stdout += d; }); c.stderr.on('data', (d) => { stderr += d; });
  const kill = setTimeout(() => c.kill('SIGTERM'), 300000);
  c.on('close', (status) => { clearTimeout(kill); resolve({ status, stdout, stderr }); });
});
const run = async (label, args, env = {}) => {
  const t0 = Date.now();
  const r = await spawnP(args, env);
  const ok = r.status === 0;
  results.push({ label, ok, ms: Date.now() - t0 });
  const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (!ok) console.log('      ' + tail.slice(-25).join('\n      '));
  else { const last = tail.filter((l) => /PASS|ALL|every|in step|identical|ok/i.test(l)).pop(); if (last) console.log('      ' + last); }
};

await run('token lint', ['tools/lint-tokens.mjs']);
await run('intent lint', ['tools/lint-intent.mjs']);
const tests = fs.readdirSync(path.join(ROOT, 'tests')).sort();
for (const f of tests.filter((f) => f.endsWith('.node.mjs'))) await run(f, ['tests/' + f]);
const browser = tests.filter((f) => f.endsWith('.browser.mjs'));
if (process.env.MIR_SKIP_BROWSER) console.log(`SKIP  ${browser.length} browser test(s) (MIR_SKIP_BROWSER)`);
else {
  const srv = await serve(0);
  try { for (const f of browser) await run(f, ['tests/' + f], { MIR_BASE: srv.url }); }
  finally { await srv.close(); }
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed` + (failed.length ? ` — failed: ${failed.map((r) => r.label).join(', ')}` : ''));
process.exit(failed.length ? 1 : 0);
