#!/usr/bin/env node
/* adopt.mjs — put MIR into an app, or bring an app's copy up to date, or prove it already is.
 *
 *   node tools/adopt.mjs <app-root>                 copy mir/ → <app>/lab/mir/ and fonts/ → <app>/lab/fonts/, remove
 *                                                   files the kit no longer has, write <app>/MIR-MANIFEST.json
 *   node tools/adopt.mjs <app-root> --check         change nothing; exit 1 if any kit file is missing or different,
 *                                                   if the app carries a file the kit does not have, or if the
 *                                                   manifest does not describe the bytes on disk
 *   node tools/adopt.mjs <app-root> --dry-run       say what an adopt would copy and remove, change nothing
 *   options: --prefix <dir>   where the kit lives inside the app (default lab)
 *            --allow-dirty    adopt from a kit with uncommitted changes to mir/ or fonts/ (the manifest says so)
 *            --line <x.y>     move an app pinned to another line onto this kit's line; x.y must be this kit's line
 *
 * A LINE is the kit version's major.minor ("1.5.0-alpha.1" → 1.5).  The manifest records it; a manifest without
 * one (1.4 and before) is on the line of its version.  An app on another line is PINNED there: adopt refuses to
 * move it without --line, and --check verifies it against its own manifest instead of this kit (docs/LINES.md).
 *
 * The kit is COPIED, never linked: a static site ships bytes.  The two folders it writes are the kit's alone —
 * an app never edits them (change MIR, re-adopt), which is why a file in them that the kit does not have is
 * removed on adopt and reported by --check.  The manifest records the version, the kit commit the bytes came from,
 * and a 16-hex sha256 prefix for every file; λWAVES' tests/mir-manifest.test.mjs reads exactly that shape.
 * Any flag this tool does not know is an error: a mistyped --check must never become a silent copy. */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const KNOWN = new Set(['--check', '--dry-run', '--allow-dirty', '--prefix', '--line']);
const USAGE = 'usage: adopt.mjs <app-root> [--check | --dry-run] [--prefix lab] [--allow-dirty] [--line x.y]';
const argv = process.argv.slice(2), flags = {}, pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('-')) {
    if (!KNOWN.has(a)) { console.error(`adopt: unknown option ${a}\n${USAGE}`); process.exit(2); }
    if (a === '--prefix' || a === '--line') {                                     // the two flags that take a value
      const v = argv[++i]; if (!v || v.startsWith('-')) { console.error(`adopt: ${a} needs a value`); process.exit(2); }
      flags[a.slice(2)] = v;
    } else flags[a.slice(2)] = true;
  } else pos.push(a);
}
if (pos.length !== 1) { console.error(USAGE); process.exit(2); }
if (flags.check && flags['dry-run']) { console.error('adopt: --check and --dry-run are two different questions; ask one'); process.exit(2); }
const APP = path.resolve(pos[0]), PREFIX = flags.prefix || 'lab';
if (!fs.existsSync(APP) || !fs.statSync(APP).isDirectory()) { console.error(`adopt: ${APP} is not a folder`); process.exit(2); }
/* --prefix takes a folder INSIDE the app: never a flag swallowed as its value (`--prefix --check` once adopted into
   <app>/--check/), and never a path that leaves the app (`--prefix ../x` once pruned a stranger's folder) */
{ const into = path.resolve(APP, PREFIX), rel = path.relative(APP, into);
  if (PREFIX.startsWith('-') || path.isAbsolute(PREFIX) || rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    console.error(`adopt: --prefix must name a folder inside the app, not "${PREFIX}"`); process.exit(2); } }

const version = JSON.parse(fs.readFileSync(path.join(KIT, 'package.json'), 'utf8')).version;
const lineOf = (v) => { const m = /^(\d+)\.(\d+)\.\d+/.exec(String(v || '')); return m ? `${+m[1]}.${+m[2]}` : null; };
const LINE = lineOf(version);
if (!LINE) { console.error(`adopt: the kit's package.json version "${version}" is not x.y.z`); process.exit(2); }
if (flags.line !== undefined && flags.line !== LINE) {
  console.error(`adopt: --line ${flags.line} is not this kit's line — this kit is MIR ${version}, line ${LINE}; adopt from that line's kit (docs/LINES.md)`);
  process.exit(2);
}
/* the app's own manifest decides its line; unreadable or version-less, it pins nothing (--check still reports it) */
const MF = path.join(APP, 'MIR-MANIFEST.json');
let own = null; try { own = JSON.parse(fs.readFileSync(MF, 'utf8')); } catch { own = null; }
const appLine = own && typeof own === 'object' ? (typeof own.line === 'string' ? own.line : lineOf(own.version)) : null;
const pinned = appLine !== null && appLine !== LINE && flags.line === undefined;
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : []);
const git = (...a) => { try { return execFileSync('git', ['-C', KIT, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const commit = git('rev-parse', '--short=12', 'HEAD');
const dirty = commit !== null && git('status', '--porcelain', '--', 'mir', 'fonts') !== '';

const MAP = [['mir', path.join(PREFIX, 'mir')], ['fonts', path.join(PREFIX, 'fonts')]];
const want = new Map();                     // app-relative path → { src, hash }
for (const [src, dst] of MAP) for (const f of walk(path.join(KIT, src))) want.set(path.join(dst, path.relative(path.join(KIT, src), f)).split(path.sep).join('/'), { src: f, hash: sha(f) });
const have = new Set(MAP.flatMap(([, dst]) => walk(path.join(APP, dst)).map((f) => path.relative(APP, f).split(path.sep).join('/'))));

const differ = [], missing = [], extra = [];
for (const [rel, w] of want) { if (!have.has(rel)) missing.push(rel); else if (sha(path.join(APP, rel)) !== w.hash) differ.push(rel); }
for (const rel of have) if (!want.has(rel)) extra.push(rel);

if (pinned) {
  const where = `${APP} is pinned to line ${appLine} (MIR ${own.version}); this kit is line ${LINE} (MIR ${version})`;
  if (flags.check) {                     // this kit's bytes are not the app's to match: hold it to its own manifest
    console.log(`${where}; checked against its own manifest`);
    let bad = 0; const files = (own.files && typeof own.files === 'object') ? own.files : {};
    for (const k of Object.keys(files).sort()) {
      if (!have.has(k)) { console.log('MISSING ' + k); bad++; }
      else if (sha(path.join(APP, k)) !== files[k]) { console.log('DRIFT   ' + k + '   (not the bytes its manifest names)'); bad++; }
    }
    for (const r of [...have].sort()) if (!Object.hasOwn(files, r)) { console.log('EXTRA   ' + r + '   (not in its manifest)'); bad++; }
    console.log(bad ? `${bad} problem(s): ${APP} does not match its own MIR ${own.version} manifest` : `consistent with its own manifest: MIR ${own.version}, line ${appLine}`);
    process.exit(bad ? 1 : 0);
  }
  if (flags['dry-run']) console.log(`dry run: with --line ${LINE} an adopt would move it to MIR ${version}: ${missing.length} to add, ${differ.length} to update, ${extra.length} to remove, ${want.size - differ.length - missing.length} unchanged`);
  console.error(`adopt: refused — ${where}.  Nothing was changed.  To move it onto line ${LINE} on purpose, pass --line ${LINE}; to stay on ${appLine}, adopt from that line's kit (docs/LINES.md)`);
  process.exit(1);
}

if (flags.check) {
  let bad = 0;
  for (const r of differ) { console.log('DRIFT   ' + r); bad++; }
  for (const r of missing) { console.log('MISSING ' + r); bad++; }
  for (const r of extra) { console.log('EXTRA   ' + r + '   (not a kit file: the kit folders are the kit\'s alone)'); bad++; }
  const mf = path.join(APP, 'MIR-MANIFEST.json');
  if (!fs.existsSync(mf)) { console.log('MANIFEST missing'); bad++; }
  else {
    let m = null; try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch (e) { console.log('MANIFEST unreadable: ' + e.message); bad++; }
    const keys = Object.keys((m && m.files) || {}).sort(), disk = [...have].sort();
    if (m && JSON.stringify(keys) !== JSON.stringify(disk)) { console.log('MANIFEST does not list exactly the files on disk'); bad++; }
    else if (m) for (const k of keys) if (sha(path.join(APP, k)) !== m.files[k]) { console.log('MANIFEST hash does not match the bytes: ' + k); bad++; }
    if (m && !bad && m.version !== version) { console.log(`MANIFEST says ${m.version}, the bytes are MIR ${version}`); bad++; }
  }
  console.log(bad ? `${bad} problem(s): ${APP} is not in step with MIR ${version}${commit ? ' (' + commit + (dirty ? ', uncommitted' : '') + ')' : ''}` : `in step with MIR ${version}`);
  process.exit(bad ? 1 : 0);
}

if (dirty && !flags['allow-dirty'] && !flags['dry-run']) {
  console.error(`adopt: the kit has uncommitted changes under mir/ or fonts/ — commit them (so the manifest can name the bytes) or pass --allow-dirty`);
  process.exit(1);
}
const unchanged = want.size - differ.length - missing.length;
if (flags['dry-run']) {
  for (const r of missing) console.log('would ADD    ' + r);
  for (const r of differ) console.log('would UPDATE ' + r);
  for (const r of extra) console.log('would REMOVE ' + r);
  console.log(`dry run: ${missing.length} to add, ${differ.length} to update, ${extra.length} to remove, ${unchanged} unchanged → MIR ${version}`);
  process.exit(0);
}
for (const rel of [...missing, ...differ]) {
  const target = path.join(APP, rel), tmp = target + '.adopt-tmp';
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(want.get(rel).src, tmp); fs.renameSync(tmp, target);          // a reader never sees half a file
}
for (const rel of extra) fs.rmSync(path.join(APP, rel));
const prune = (d, top) => {                                                      // folders the kit no longer has
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) prune(path.join(d, e.name), top);
  if (d !== top && fs.readdirSync(d).length === 0) fs.rmdirSync(d);
};
for (const [, dst] of MAP) prune(path.join(APP, dst), path.join(APP, dst));
const manifest = { kit: 'MIR', version, line: LINE, commit, dirty: dirty || undefined, files: {} };
for (const rel of [...want.keys()].sort()) manifest.files[rel] = want.get(rel).hash;
fs.writeFileSync(path.join(APP, 'MIR-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`adopted MIR ${version}${commit ? ' (' + commit + (dirty ? ', uncommitted' : '') + ')' : ''}: ${missing.length} added, ${differ.length} updated, ${extra.length} removed, ${unchanged} unchanged → ${APP}`);
