/* timeline-controller.node.mjs — BASINS tools/test-transport-controller.mjs, ported (2026-10-02): the recorder gate is the
 * busy() port and the SCRUB level the scrubLevel() port, where BASINS read its own clocks and prefs. */
import assert from 'node:assert/strict';
import { createTransportController } from '../mir/timeline/controller.js';
import { createModHost } from '../mir/modulation/host.js';

// One action surface supports window controls and keyboard/menu callers without
// DOM clicks. Playback demand is independent of MOD routing and window visibility.
const calls = [];
let playing = false, armed = false, beat = 2.375, refused = false;
const model = { transport: { get beats() { return beat; } } };
let demand=false;
const clock = { isPlaying: () => playing, isRunning: () => playing && demand,
  demand(id,on) { assert.equal(id,'transport');calls.push(['demand',on]);demand=on; },
  seek(value) { calls.push(['seek', value]); beat = value; return beat; } };
const mod = { host: { clock, model }, armed: () => armed,
  arm(value) { calls.push(['arm', value]); armed = value; return armed; },
  play(value) { calls.push(['play', value]); if (refused && value) return { ok: false, reason: 'nothing-to-run' }; playing = value; return { ok: true }; } };
let changes = 0, refusals = 0;
const controller = createTransportController({ mod, onChange: () => changes++, onRefusedPlay: () => refusals++ });
controller.toggle();
assert.deepEqual(calls.splice(0), [['demand',true],['play', true]], 'Play obtains demand before starting and preserves MOD state');
assert.deepEqual(controller.state(), { playing: true, running: true, modulation: false, beat: 2.375 });
controller.toggle();
assert.deepEqual(calls.splice(0), [['play', false],['demand',false]], 'Pause releases playback demand');
controller.toggle();
assert.deepEqual(calls.splice(0), [['demand',true],['play', true]], 'Stage and Timeline use identical playback semantics');
controller.toggleModulation();
assert.equal(armed, true); assert.equal(playing, true, 'MOD is not spelled Pause by the controller');
assert.deepEqual(calls.splice(0), [['arm', true]]);
assert.equal(controller.beginning(), 0);
assert.deepEqual(calls.splice(0), [['seek', 0]], 'Beginning seeks musical time, without an unsupported model retrigger call');
assert.equal(playing, true, 'Beginning preserves playback state');
controller.play(false); calls.splice(0); refused = true;
assert.equal(controller.play(true).ok, false); assert.equal(refusals, 1); assert.equal(playing, false);
assert.equal(demand,false,'Refused Play cannot leak demand');
assert.equal(changes, 7, 'Each completed action publishes one change');
controller.dispose();assert.equal(demand,false);assert.equal(controller.play(true).reason,'disposed');

// Real MIR clock: a source-free Timeline can seek/rewind without writing its
// current value into the authored parameter base or starting playback.
const H = createModHost({ roots: ['camera'], presentationActive: false });
H.model.modReset(); H.clock.setBpm(60); let actual = .2;   // BASINS' default tempo is 60; the kit's is 30
H.targets.install({ id: 'camera.test', min: 0, max: 1, map: 'linear', get: () => actual, set: value => { actual = value; } });
H.clock.setAutomation({ value: (_, at) => at / 4 });
let modulation = false;
const real = createTransportController({ mod: { host: H, armed: () => modulation,
  arm(value) { modulation = value; H.clock.setModulationEnabled(value); return value; },
  play(value) { return value ? H.clock.play(0) : H.clock.pause(0); } } });
real.seek(2.375); assert.equal(actual, 2.375 / 4);
real.beginning(); assert.equal(H.model.transport.beats, 0); assert.equal(actual, 0);
assert.equal(H.registry.baseOf('camera.test'), .2); assert.equal(H.clock.isPlaying(), false);
assert.equal(real.play(true).ok,true,'Empty clock gets transport demand');assert.equal(H.clock.isRunning(),true);assert.equal(modulation,false,'Play never enables modulation');
H.clock.step(.5);assert.equal(H.model.transport.beats,.5);real.toggleModulation();assert.equal(H.model.transport.beats,.5);assert.equal(H.clock.isPlaying(),true);
real.dispose();assert.equal(H.clock.isRunning(),false);H.dispose();

// Controller owns the interactive gate and releases it on cancel/dispose,
// without restoring stale Play or MOD state. Recorder ownership wins.
H.model.modReset({bare:true});let stamp=1,recording=false;
const scrub=createTransportController({now:()=>stamp,mod:{host:H,armed:()=>false,arm:()=>false,play:on=>on?H.clock.play(stamp):H.clock.pause(stamp)},busy:()=>recording}); // BASINS: mod.deterministicClock.active(); the kit: the busy() port
let published=[];scrub.subscribe(reason=>published.push(reason));scrub.seek(2.375);scrub.play(true);
assert.equal(scrub.beginScrub(),true);assert.equal(scrub.beginScrub(),false);scrub.seek(9.25);stamp=40;H.clock.advanceTo(stamp);assert.equal(H.model.transport.beats,9.25);
scrub.endScrub({cancel:true});assert.equal(H.model.transport.beats,2.375);assert.equal(H.clock.isPlaying(),true);assert.equal(H.clock.isRealtimeSuspended(),false);
assert.deepEqual(published.slice(-4),['transport','scrub','seek','scrub-end']);
recording=true;assert.equal(scrub.beginScrub(),false);recording=false;scrub.beginScrub();scrub.play(false);scrub.endScrub();assert.equal(H.clock.isPlaying(),false);
scrub.beginScrub();scrub.dispose();assert.equal(H.clock.isRealtimeSuspended(),false);assert.equal(scrub.beginScrub(),false);H.dispose();

// FREE SCRUB (2026-10-01): unsnapped by default, Shift snaps, Alt always bypasses (even with Shift).
// THE HAND LEADS: handBeat() tracks every scrub() call; null outside a scrub.
const H2 = createModHost({ roots: ['camera'], presentationActive: false }); H2.model.modReset({ bare: true });
const ctl = createTransportController({ mod: { host: H2, armed: () => false, arm: () => false, play: () => ({ ok: true }) } });
ctl.beginScrub();
ctl.scrub(1.125, {}); assert.equal(H2.model.transport.beats, 1.125, 'unsnapped: the beat lands exactly');
ctl.scrub(1.6, { shift: true, snap: .25 }); assert.equal(H2.model.transport.beats, 1.5, 'Shift snaps to the grid');
ctl.scrub(1.6, { shift: true, snap: .25, alt: true }); assert.equal(H2.model.transport.beats, 1.6, 'Alt bypasses the grid even with Shift held');
assert.equal(ctl.handBeat(), 1.6);
ctl.endScrub(); assert.equal(ctl.handBeat(), null, 'handBeat is null outside a scrub');

// SCRUB level (read fresh from prefs at beginScrub): LIVE seeks every call; LIGHT about a third;
// RELEASE none until release — and the model always lands on the hand's last beat at release.
let pref = 'live';   // BASINS read prefs.scrubLevel from localStorage; the kit reads the scrubLevel() port
const lev = createTransportController({ mod: { host: H2, armed: () => false, arm: () => false, play: () => ({ ok: true }) }, scrubLevel: () => pref });
for (const [level, expectSeeks] of [['live', 6], ['light', 2], ['release', 0]]) {
  pref = level;
  lev.beginScrub();
  const before = H2.clock.stats().presents;
  for (let i = 1; i <= 6; i++) lev.scrub(2 + i * .25, {});
  assert.equal(H2.clock.stats().presents - before, expectSeeks, `${level}: ${expectSeeks} seeks across 6 moves`);
  const hand = lev.handBeat();
  lev.endScrub();
  assert.equal(H2.model.transport.beats, hand, `${level}: the model lands on the hand's beat at release`);
}
lev.dispose();
ctl.dispose(); H2.dispose();
console.log('Transport controller shared actions, source-free demand, independent MOD, Beginning, refusal cleanup, seek/base invariants, free scrub and SCRUB-level invariants pass.');
