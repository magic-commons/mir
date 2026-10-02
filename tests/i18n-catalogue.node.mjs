#!/usr/bin/env node
/* tests/i18n-catalogue.node.mjs — the English catalogue (mir/locales/en.json) is what the source says now.
 * A string added at a choke point and not extracted fails here: run `node tools/i18n-extract.mjs`. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/i18n-extract.mjs', import.meta.url)), '--check'], { encoding: 'utf8' });
process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
process.exit(r.status === 0 ? 0 : 1);
