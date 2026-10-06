#!/usr/bin/env node
/* make-skill.mjs — assembles the installable `mir-builder` skill: everything a model needs to build an app on MIR with no
 * website involved.  The skill carries the kit with it, so "build me Tetris with MIR" works offline in Claude Code.
 *
 *   node tools/make-skill.mjs                 → dist/mir-builder/ (replaced whole), and prints its size
 *   node tools/make-skill.mjs --out <dir>     somewhere else (the folder is replaced whole)
 *   node tools/make-skill.mjs --allow-dirty   build from uncommitted kit changes (BUILD.json says so)
 *
 * What goes in, laid out as the kit's own repository is, so the starter's `../mir/` paths hold unchanged:
 *   SKILL.md (+ anything else in skill/mir-builder/) · LLM.md · LICENSE · starter/ · mir/ · fonts/ · docs/*.md
 *   tools/serve.mjs (a static server) · tools/check-envelope.mjs (the skin and file checker) · tools/cdp.mjs (the headless
 *   browser) · tools/check-app.mjs (loads an app, plays it with real keys, checks it; --webkit via tools/webkit.mjs) · tools/hit-probe.mjs · tools/audit-material.mjs · BUILD.json
 * The skill's tools/ is what a model copies into its app folder, so the checker runs from there.
 * It refuses to build from a dirty kit (an uncommitted or untracked file in any of those) unless told: a skill names the
 * bytes it carries.  `dist/` is a build product and is never committed.
 * Install the result: copy dist/mir-builder/ to ~/.claude/skills/mir-builder/ (or a project's .claude/skills/). */
import fs from 'node:fs'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MIR_VERSION } from '../mir/version.js';

const KIT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const outArg = args.indexOf('--out');
const OUT = path.resolve(outArg >= 0 ? args[outArg + 1] : path.join(KIT, 'dist', 'mir-builder'));

/* what the skill carries: [source in the kit, where it goes in the skill] */
const PARTS = [['skill/mir-builder', '.'], ['LLM.md', 'LLM.md'], ['LICENSE', 'LICENSE'], ['starter', 'starter'], ['mir', 'mir'], ['fonts', 'fonts'],
  ['tools/serve.mjs', 'tools/serve.mjs'], ['tools/check-envelope.mjs', 'tools/check-envelope.mjs'], ['tools/cdp.mjs', 'tools/cdp.mjs'],
  ['tools/check-app.mjs', 'tools/check-app.mjs'], ['tools/webkit.mjs', 'tools/webkit.mjs'], ['tools/hit-probe.mjs', 'tools/hit-probe.mjs'], ['tools/audit-material.mjs', 'tools/audit-material.mjs']];
const DOCS = fs.readdirSync(path.join(KIT, 'docs')).filter((f) => f.endsWith('.md')).map((f) => ['docs/' + f, 'docs/' + f]);

const git = (...a) => { try { return execFileSync('git', ['-C', KIT, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const commit = git('rev-parse', '--short=12', 'HEAD');
const status = commit === null ? '' : git('status', '--porcelain', '--', ...PARTS.map(([s]) => s), 'docs');
const dirty = !!status;
if (dirty && !flag('--allow-dirty')) {
  console.error('make-skill: the kit has uncommitted changes in what the skill carries — commit them, or pass --allow-dirty:\n' + status);
  process.exit(1);
}
if (!fs.existsSync(path.join(KIT, 'skill/mir-builder/SKILL.md'))) { console.error('make-skill: skill/mir-builder/SKILL.md is missing'); process.exit(1); }

fs.rmSync(OUT, { recursive: true, force: true });
let files = 0, bytes = 0;
function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) { for (const e of fs.readdirSync(src)) copy(path.join(src, e), path.join(dst, e)); return; }
  fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); files++; bytes += st.size;
}
for (const [src, dst] of [...PARTS, ...DOCS]) copy(path.join(KIT, src), path.join(OUT, dst));
const build = { skill: 'mir-builder', kit: 'MIR', version: MIR_VERSION, commit, dirty: dirty || undefined, made: new Date().toISOString(), files };
fs.writeFileSync(path.join(OUT, 'BUILD.json'), JSON.stringify(build, null, 1) + '\n');

const mb = (n) => (n / 1048576).toFixed(2) + ' MB';
const part = (d) => { let n = 0; const walk = (p) => { const s = fs.statSync(p); if (s.isDirectory()) for (const e of fs.readdirSync(p)) walk(path.join(p, e)); else n += s.size; }; walk(path.join(OUT, d)); return n; };
console.log(`make-skill: ${path.relative(process.cwd(), OUT) || OUT} — ${files} files, ${mb(bytes)} (mir ${mb(part('mir'))} · fonts ${mb(part('fonts'))} · docs ${mb(part('docs'))} · starter ${mb(part('starter'))})`);
console.log(`  MIR ${MIR_VERSION}${commit ? ' at ' + commit : ''}${dirty ? ', UNCOMMITTED changes included' : ''}`);
console.log(`  install: cp -r ${path.relative(process.cwd(), OUT) || OUT} ~/.claude/skills/mir-builder`);
