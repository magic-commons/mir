/* version.node.mjs — the kit has one version: mir/version.js equals package.json, and the two places that show or
 * write it (the GUI window's ABOUT, every portable file's `kit`) read that one constant. */
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { MIR_VERSION } from '../mir/version.js';
import { KIT } from '../mir/core/envelope.js';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(MIR_VERSION, pkg.version, 'mir/version.js and package.json disagree: change both at a release');
assert.equal(KIT, MIR_VERSION, 'core/envelope.js KIT is not mir/version.js');
const gui = fs.readFileSync(new URL('../mir/shell/gui.js', import.meta.url), 'utf8');
assert.match(gui, /import \{ MIR_VERSION \} from '\.\.\/version\.js'/, 'shell/gui.js must read MIR_VERSION from mir/version.js');
const schema = JSON.parse(fs.readFileSync(new URL('../mir/tokens.json', import.meta.url), 'utf8'));
assert.equal(schema.kit, pkg.version, 'mir/tokens.json "kit" and package.json disagree');
console.log(`PASS version: ${MIR_VERSION} in package.json, mir/version.js, envelope KIT, gui.js and tokens.json`);
