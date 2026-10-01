/* adopt.node.mjs — tools/adopt.mjs does what its header says, on a throwaway app. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const app = fs.mkdtempSync(path.join(os.tmpdir(), 'mir-adopt-')), app2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mir-adopt-line-'));
const adopt = (...a) => spawnSync(process.execPath, [path.join(ROOT, 'tools/adopt.mjs'), app, ...a], { encoding: 'utf8' });
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;   // pre-release and build allowed
const KITV = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const LINE = KITV.split('.').slice(0, 2).map(Number).join('.');
const OTHER = LINE === '1.4' ? '1.3' : '1.4', OTHERV = OTHER + '.3';            // a line that is not this kit's
try {
  let r = spawnSync(process.execPath, [path.join(ROOT, 'tools/adopt.mjs'), app, '--chek'], { encoding: 'utf8' });
  ok(r.status === 2 && /unknown option/.test(r.stderr), 'a mistyped flag is an error, not a copy');
  ok(!fs.existsSync(path.join(app, 'lab')), '…and nothing was written');
  r = adopt('--check'); ok(r.status === 1 && /MISSING/.test(r.stdout), '--check on an empty app reports what is missing');
  r = adopt('--dry-run'); ok(r.status === 0 && /would ADD/.test(r.stdout) && !fs.existsSync(path.join(app, 'lab')), '--dry-run changes nothing');
  r = adopt('--allow-dirty'); ok(r.status === 0 && /adopted MIR/.test(r.stdout), 'adopt copies the kit: ' + r.stdout + r.stderr);
  const m = JSON.parse(fs.readFileSync(path.join(app, 'MIR-MANIFEST.json'), 'utf8'));
  ok(m.kit === 'MIR' && SEMVER.test(m.version), 'the manifest names the kit and a semver version: ' + m.version);
  ok(m.line === LINE && m.version.startsWith(LINE + '.'), 'a fresh adopt writes the kit line');
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

  /* LINES — an app on another line is pinned there (docs/LINES.md).  A second throwaway app, adopted fresh, then
     re-labelled as an older line's manifest: its bytes are real, so "consistent with its own manifest" is honest. */
  const pin = (...a) => spawnSync(process.execPath, [path.join(ROOT, 'tools/adopt.mjs'), app2, ...a], { encoding: 'utf8' });
  const mf2 = path.join(app2, 'MIR-MANIFEST.json');
  const snap = () => JSON.stringify(walk(app2).sort().map((f) => [path.relative(app2, f), sha(f)]));
  const relabel = (fn) => { const x = JSON.parse(fs.readFileSync(mf2, 'utf8')); fn(x); fs.writeFileSync(mf2, JSON.stringify(x, null, 2) + '\n'); };
  r = pin('--allow-dirty'); ok(r.status === 0 && JSON.parse(fs.readFileSync(mf2, 'utf8')).line === LINE, 'fresh app: adopt writes the line');
  relabel((x) => { x.version = LINE + '.0-alpha.0'; delete x.line; });            // same line, older version, no line field
  r = pin('--allow-dirty'); ok(r.status === 0 && /adopted MIR/.test(r.stdout) && JSON.parse(fs.readFileSync(mf2, 'utf8')).version === KITV, 'same-line re-adopt proceeds as today: ' + r.stderr);
  ok(pin('--check').status === 0, '…and is in step');

  relabel((x) => { x.version = OTHERV; delete x.line; });                         // a 1.4-style manifest: no line field
  r = pin('--check');
  ok(r.status === 0 && new RegExp(`pinned to line ${OTHER}\\b`).test(r.stdout) && new RegExp(`this kit is line ${LINE}\\b`).test(r.stdout)
     && /checked against its own manifest/.test(r.stdout) && /consistent/.test(r.stdout) && !/DRIFT|MISSING|EXTRA/.test(r.stdout), 'no line field: the line comes from the version, and --check holds it to its own manifest: ' + r.stdout);
  relabel((x) => { x.line = OTHER; });
  r = pin('--check'); ok(r.status === 0 && new RegExp(`pinned to line ${OTHER}\\b`).test(r.stdout), 'an explicit line field pins the same way');

  let before = snap();
  r = pin('--allow-dirty');
  ok(r.status === 1 && r.stderr.includes(`line ${OTHER}`) && r.stderr.includes(`line ${LINE}`) && r.stderr.includes(`--line ${LINE}`), 'a cross-line adopt is refused, naming both lines and the flag: ' + r.stderr);
  ok(snap() === before && !r.stdout.includes('adopted'), '…and nothing was written, not even the manifest');
  r = pin('--dry-run');
  ok(r.status === 1 && new RegExp(`with --line ${LINE}`).test(r.stdout) && /refused/.test(r.stderr) && snap() === before, 'a cross-line --dry-run says what --line would do, refuses, and changes nothing');
  r = pin('--line', OTHER, '--allow-dirty'); ok(r.status === 2 && /not this kit's line/.test(r.stderr) && snap() === before, '--line with a value that is not this kit\'s line is refused');
  r = pin('--line', '--allow-dirty'); ok(r.status === 2 && snap() === before, '--line never takes a flag as its value');

  const kitjs = path.join(app2, 'lab/mir/kit.js'), orig = fs.readFileSync(kitjs);
  fs.appendFileSync(kitjs, '\n// a hand edit');
  r = pin('--check');
  ok(r.status === 1 && /DRIFT\s+lab\/mir\/kit\.js/.test(r.stdout) && r.stdout.split('\n').filter((l) => /^(DRIFT|MISSING|EXTRA)/.test(l)).length === 1, 'pinned --check reports one edited file, and only it: ' + r.stdout);
  fs.writeFileSync(kitjs, orig);
  fs.writeFileSync(path.join(app2, 'lab/mir/app-own.js'), '// not the kit\'s');
  r = pin('--check'); ok(r.status === 1 && /EXTRA\s+lab\/mir\/app-own\.js/.test(r.stdout), 'pinned --check reports an extra file');
  fs.rmSync(path.join(app2, 'lab/mir/app-own.js'));
  fs.renameSync(kitjs, kitjs + '.away');
  r = pin('--check'); ok(r.status === 1 && /MISSING\s+lab\/mir\/kit\.js/.test(r.stdout), 'pinned --check reports a missing file');
  fs.renameSync(kitjs + '.away', kitjs);
  ok(pin('--check').status === 0, '…and is consistent again once restored');

  r = pin('--line', LINE, '--dry-run'); ok(r.status === 0 && /dry run:/.test(r.stdout) && snap() === before, '--line with --dry-run previews the move and changes nothing');
  r = pin('--line', LINE, '--allow-dirty');
  const m2 = JSON.parse(fs.readFileSync(mf2, 'utf8'));
  ok(r.status === 0 && m2.line === LINE && m2.version === KITV, '--line <this kit\'s line> moves the app on purpose: ' + r.stderr);
  ok(pin('--check').status === 0, '…and it is then in step with this kit');
  console.log(`PASS adopt: ${n} assertions`);
} finally { fs.rmSync(app, { recursive: true, force: true }); fs.rmSync(app2, { recursive: true, force: true }); }
