#!/usr/bin/env node
/* check-envelope.mjs — the checker as a command: the contract a person or a model writes a skin (or a spec, a page, a
 * settings file, a project) against.  It needs nothing but node and the kit.
 *
 *   node tools/check-envelope.mjs <file> [--app <id>] [--settings <schema.json>] [--tokens <tokens.json>] [--json]
 *
 *   <file>        a .mir / .json envelope, a packed 'mir1.…' text, a .png carrying one, or a .md (read as a page)
 *   --app         this app's id: a project written for another app is refused
 *   --settings    the options schema (an array of rows { key, type, range?, options?, default }) to check settings with
 *   --tokens      the token schema; default: the kit's mir/tokens.json
 *   --json        print the whole result as JSON
 *
 * Prints `ok <kind>` (and any warnings), or every error as `path: why`.  Exit 0 when ok, 1 when not, 2 on bad usage.
 * It goes through the same door the browser does (core/intake.js readInput), so what passes here passes there. */
import fs from 'node:fs'; import path from 'node:path';
import { readInput } from '../mir/core/intake.js';

const args = process.argv.slice(2), flags = {}, files = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--json') flags.json = true;
  else if (a.startsWith('--')) flags[a.slice(2)] = args[++i];
  else files.push(a);
}
if (files.length !== 1 || args.includes('--help')) {
  console.error('usage: node tools/check-envelope.mjs <file> [--app <id>] [--settings <schema.json>] [--tokens <tokens.json>] [--json]');
  process.exit(2);
}
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
let tokens, settings;
try {
  tokens = readJson(flags.tokens || new URL('../mir/tokens.json', import.meta.url));
  if (flags.settings) settings = readJson(flags.settings);
} catch (e) { console.error('could not read a schema: ' + e.message); process.exit(2); }

let bytes;
try { bytes = fs.readFileSync(files[0]); } catch (e) { console.error('could not read ' + files[0] + ': ' + e.message); process.exit(2); }
const name = path.basename(files[0]);
const r = await readInput(new File([bytes], name), { name, check: { tokens, settings, app: flags.app }, source: 'file' });

if (flags.json) console.log(JSON.stringify({ ok: r.ok, kind: r.envelope && r.envelope.kind, errors: r.errors, warnings: r.warnings }, null, 1));
else {
  if (r.ok) console.log(`ok ${r.envelope.kind}${r.envelope.name ? ' "' + r.envelope.name + '"' : ''}`);
  else for (const e of r.errors) console.log(`error  ${e.path || '(file)'}: ${e.why}`);
  for (const w of r.warnings) console.log(`warn   ${w.path || '(file)'}: ${w.why}`);
}
process.exit(r.ok ? 0 : 1);
