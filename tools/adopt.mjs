#!/usr/bin/env node
/* adopt.mjs — put MIR into an app, or bring an app's copy up to date.
 *   node tools/adopt.mjs <app-root>           copies mir/ → <app>/lab/mir/ and fonts/ → <app>/lab/fonts/, writes MIR-MANIFEST.json
 *   node tools/adopt.mjs <app-root> --check   reports every file that differs from this kit (exit 1 if any)
 * The kit is copied, never linked: a static site ships bytes. The manifest says which bytes are the kit's,
 * so an app never edits them by accident — change the kit, re-adopt. */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const here = path.resolve(new URL('..', import.meta.url).pathname);
const [app, flag] = process.argv.slice(2);
if (!app) { console.error('usage: adopt.mjs <app-root> [--check]'); process.exit(2); }
const MAP = [['mir', 'lab/mir'], ['fonts', 'lab/fonts']];
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const version = JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8')).version;
let drift = 0; const manifest = { kit: 'MIR', version, files: {} };
for (const [src, dst] of MAP) {
  for (const f of walk(path.join(here, src))) {
    const rel = path.relative(path.join(here, src), f), target = path.join(app, dst, rel);
    manifest.files[path.join(dst, rel)] = sha(f);
    if (flag === '--check') { if (!fs.existsSync(target) || sha(target) !== sha(f)) { drift++; console.log('DRIFT ' + path.join(dst, rel)); } continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(f, target);
  }
}
if (flag === '--check') { console.log(drift ? `${drift} file(s) differ from MIR ${version}` : `in step with MIR ${version}`); process.exit(drift ? 1 : 0); }
fs.writeFileSync(path.join(app, 'MIR-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`adopted MIR ${version}: ${Object.keys(manifest.files).length} files → ${app}`);
