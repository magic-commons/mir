/* shell.browser.mjs — the shell's behaviour probes (tools/shell-behaviour.mjs) against the kit's own gallery page. */
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const BASE = process.env.MIR_BASE || 'http://127.0.0.1:8790';
const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/shell-behaviour.mjs', import.meta.url)), BASE + '/gallery/shell.html'], { encoding: 'utf8', timeout: 240000 });
process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
process.exit(r.status === 0 ? 0 : 1);
