/* modulation-seam.node.mjs — the doors bind.js and host.js open for the shell (1.5.0-alpha.12):
 *   the AUTOMATION sampling grid (FRAME · 1/32 · 1/16 · 1/8 floors the beat; a recorder's step samples per frame),
 *   setAutomationGrid(value) on the live install (stored with the record), and upsertProjectPreset(name) — the rack
 *   saved as a preset named the project in CAPS, replacing its earlier self (BASINS project-session.js). */
import assert from 'node:assert/strict';
import { createModHost, AUTOMATION_GRIDS } from '../mir/modulation/host.js';
import { installModulation, setAutomationGrid, automationGrid, upsertProjectPreset } from '../mir/modulation/bind.js';

assert.deepEqual([...AUTOMATION_GRIDS], [0, 1 / 32, 1 / 16, 1 / 8]);

/* 1 · the grid on the clock: the provider is asked at the floored beat, except inside step() */
{
  const H = createModHost({ roots: ['test'], presentationActive: false }); H.model.modReset(); H.model.setTransport({ bpm: 60 });
  let value = 0; const asked = [];
  H.targets.install({ id: 'test.level', map: 'linear', min: 0, max: 1, get: () => value, set: (v) => { value = v; } });
  H.clock.setAutomation({ value: (id, beat) => { asked.push(beat); return Math.min(1, beat / 8); } });
  H.clock.setAutomationHold(true);
  assert.equal(H.clock.setAutomationGrid(1 / 8), 1 / 8);
  assert.equal(H.clock.setAutomationGrid(0.3), 0, 'a grid not on the list is FRAME');
  H.clock.setAutomationGrid(1 / 8);
  H.clock.seek(0.3); assert.equal(asked.at(-1), 0.25, 'a paused seek is sampled on the grid');
  asked.length = 0; H.clock.step(0.01);
  assert.ok(asked.length && Math.abs(asked.at(-1) - 0.31) < 1e-9, 'a recorder\'s step samples per frame: ' + asked.at(-1));
  H.clock.setAutomationGrid(0); H.clock.seek(0.3); assert.equal(asked.at(-1), 0.3);
}

/* 2 · the module doors before and after an install */
assert.equal(setAutomationGrid(1 / 16), null, 'nothing installed: the door does nothing');
const mem = {}; const store = { read: () => ({ ...mem }), write: (p) => Object.assign(mem, p) };
let x = 0.5;
const mod = installModulation({ mount: null, store, params: [{ id: 'app.x', label: 'X', min: 0, max: 1, get: () => x, set: (v) => { x = v; } }] });
assert.equal(setAutomationGrid(1 / 16), 1 / 16); assert.equal(automationGrid(), 1 / 16); assert.equal(mod.host.clock.automationGrid(), 1 / 16);
mod.persist(); assert.equal(mem.automationGrid, 1 / 16, 'the grid rides the modulation record');

/* 3 · upsertProjectPreset: CAPS, replaces its earlier self */
const fake = new Map(); globalThis.localStorage = { getItem: (k) => (fake.has(k) ? fake.get(k) : null), setItem: (k, v) => fake.set(k, String(v)), removeItem: (k) => fake.delete(k) };
const a = upsertProjectPreset('my Basin');
assert.equal(a.ok, true, JSON.stringify(a)); assert.equal(a.name, 'MY BASIN'); assert.equal(a.replaced, false);
const b = upsertProjectPreset(' my basin ');
assert.equal(b.ok, true); assert.equal(b.replaced, true); assert.equal(b.id, a.id, 'the same preset, replaced');
assert.equal(mod.M.presetList().filter((p) => p.name === 'MY BASIN').length, 1);
assert.equal(upsertProjectPreset('').ok, false);
mod.dispose();
assert.equal(setAutomationGrid(1 / 8), null, 'disposed: the door does nothing again');
console.log('PASS modulation seam: the automation grid (floored, bypassed in step), setAutomationGrid on the live install, upsertProjectPreset in CAPS');

/* 4 · THE ARRANGEMENT WINS WHERE IT PLAYS (1.5.6-alpha.27): under a clip a DEVICE's route on the target stands aside — the
   clip's value is the value, playing and paused; a hand macro still layers over it; off the clip the device adds as before */
{
  const H = createModHost({ roots: ['test'], presentationActive: false }); const M = H.model; M.modReset(); M.setTransport({ bpm: 60 });
  let value = 0.2;
  H.targets.install({ id: 'test.level', map: 'linear', min: 0, max: 1, get: () => value, set: (v) => { value = v; } });
  const lfo = M.addSource('lfo', { on: true, wave: 'square', sync: true, mult: M.LFO_MULT_DEFAULT, phaseOff: 0, smooth: 0 });
  const dev = M.macroList()[0]; M.setMacro(dev.id, { sourceId: lfo.id }); M.addRoute(dev.id, 'test.level', 0, 0.3); H.targets.sync();
  H.clock.setAutomationHold(true); H.clock.setAutomation({ value: (id, beat) => (id === 'test.level' && beat < 4 ? 0.5 : null) });
  H.clock.demand('t', true); H.clock.play(0);
  for (const b of [0.1, 0.6, 1.3, 2.2, 3.7]) { H.clock.seek(b); H.clock.step(0); assert.equal(value, 0.5, 'under the clip the device stands aside at beat ' + b); }
  const off = []; for (const b of [4.1, 4.3, 4.6, 4.9, 5.4, 5.7]) { H.clock.seek(b); H.clock.step(0); off.push(value); }
  assert.ok(off.some((v) => v > 0.2 + 1e-6), 'off the clip the device swings the base: ' + off.map((v) => v.toFixed(3)).join(' '));
  H.clock.pause(); H.clock.seek(1); assert.equal(value, 0.5, 'paused under the clip: the clip\'s value');
  const hand = M.addMacro('HAND'); M.setMacro(hand.id, { value: 1 }); M.addRoute(hand.id, 'test.level', 0, 0.1); H.targets.sync();
  H.clock.seek(1); assert.ok(Math.abs(value - 0.6) < 1e-12, 'a hand macro still layers over the clip: ' + value);
  H.clock.play(0); H.clock.seek(2); H.clock.step(0); assert.ok(Math.abs(value - 0.6) < 1e-12, 'playing too: the clip plus the hand, the device aside: ' + value);
  H.dispose();
}
console.log('modulation seam: the arrangement wins where it plays (a device stands aside under a clip; the hand layers; off the clip it adds)');
