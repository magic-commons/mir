/* adopt.node.mjs — tools/adopt.mjs does what its header says, on a throwaway app. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const app = fs.mkdtempSync(path.join(os.tmpdir(), 'mir-adopt-'));
const adopt = (...a) => spawnSync(process.execPath, [path.join(ROOT, 'tools/adopt.mjs'), app, ...a], { encoding: 'utf8' });
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
try {
  let r = spawnSync(process.execPath, [path.join(ROOT, 'tools/adopt.mjs'), app, '--chek'], { encoding: 'utf8' });
  ok(r.status === 2 && /unknown option/.test(r.stderr), 'a mistyped flag is an error, not a copy');
  ok(!fs.existsSync(path.join(app, 'lab')), '…and nothing was written');
  r = adopt('--check'); ok(r.status === 1 && /MISSING/.test(r.stdout), '--check on an empty app reports what is missing');
  r = adopt('--dry-run'); ok(r.status === 0 && /would ADD/.test(r.stdout) && !fs.existsSync(path.join(app, 'lab')), '--dry-run changes nothing');
  r = adopt('--allow-dirty'); ok(r.status === 0 && /adopted MIR/.test(r.stdout), 'adopt copies the kit: ' + r.stdout + r.stderr);
  const m = JSON.parse(fs.readFileSync(path.join(app, 'MIR-MANIFEST.json'), 'utf8'));
  ok(m.kit === 'MIR' && /^\d+\.\d+\.\d+$/.test(m.version), 'the manifest names the kit and a semver version');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const disk = ['lab/mir', 'lab/fonts'].flatMap((d) => walk(path.join(app, d)).map((f) => path.relative(app, f))).sort();
  assert.deepEqual(Object.keys(m.files).sort(), disk); n++;
  for (const k of disk) assert.equal(m.files[k], sha(path.join(app, k))); n++;
  r = adopt('--check'); ok(r.status === 0 && /in step with MIR/.test(r.stdout), '--check passes after adopt');
  fs.writeFileSync(path.join(app, 'lab/mir/app-own.js'), '// not the kit\'s');
  r = adopt('--check'); ok(r.status === 1 && /EXTRA\s+lab\/mir\/app-own\.js/.test(r.stdout), '--check reports a file the kit does not have');
  r = adopt('--allow-dirty'); ok(r.status === 0 && !fs.existsSync(path.join(app, 'lab/mir/app-own.js')), 'adopt removes it');
  fs.appendFileSync(path.join(app, 'lab/mir/kit.js'), '\n// a hand edit');
  r = adopt('--check'); ok(r.status === 1 && /DRIFT\s+lab\/mir\/kit\.js/.test(r.stdout), '--check reports a hand edit');
  r = adopt('--allow-dirty'); ok(r.status === 0 && adopt('--check').status === 0, 'adopt restores the kit bytes');
  r = spawnSync(process.execPath, [path.join(ROOT, 'tools/adopt.mjs'), app, '--prefix', 'app', '--allow-dirty'], { encoding: 'utf8' });
  ok(r.status === 0 && fs.existsSync(path.join(app, 'app/mir/kit.js')), '--prefix puts the kit elsewhere');
  r = spawnSync(process.execPath, [path.join(ROOT, 'tools/adopt.mjs'), app, '--prefix', '--check', '--allow-dirty'], { encoding: 'utf8' });
  ok(r.status === 2 && !fs.existsSync(path.join(app, '--check')), 'a flag is never taken as the prefix');
  const outside = path.join(path.dirname(app), path.basename(app) + '-outside'); fs.mkdirSync(path.join(outside, 'mir'), { recursive: true }); fs.writeFileSync(path.join(outside, 'mir/precious.txt'), 'keep');
  r = spawnSync(process.execPath, [path.join(ROOT, 'tools/adopt.mjs'), app, '--prefix', '../' + path.basename(outside), '--allow-dirty'], { encoding: 'utf8' });
  ok(r.status === 2 && fs.existsSync(path.join(outside, 'mir/precious.txt')), 'a prefix that leaves the app is refused, and nothing outside is touched');
  fs.rmSync(outside, { recursive: true, force: true });
  fs.writeFileSync(path.join(app, 'MIR-MANIFEST.json'), '{ not json');
  r = adopt('--check'); ok(r.status === 1 && /MANIFEST unreadable/.test(r.stdout), '--check reports a corrupt manifest instead of throwing');
  console.log(`PASS adopt: ${n} assertions`);
} finally { fs.rmSync(app, { recursive: true, force: true }); }
