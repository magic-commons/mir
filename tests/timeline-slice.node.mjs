// LANE T2's laws in node: the pattern kind (validate, duration, value null, the repeating grid across a resize) and the
// slice law (two instances of one source, continuity at the cut, two points in the break, the shape held, one undo,
// a pattern's phase carried, a kind's veto). Expected numbers are computed here from first principles.
import assert from 'node:assert/strict';
import { clipKind, clipKinds, registerClipKind } from '../mir/timeline/kinds.js';
import { createTimelineModel, isTimelineSnapshot } from '../mir/timeline/model.js';
import { patternSteps, patternSource, paintPattern, PATTERN_STEP_BEATS } from '../mir/timeline/pattern-kind.js';
import { sliceClip, sliceClips, midpointTension, SLICE_MIN } from '../mir/timeline/slice.js';
import { createClipCoordinates } from '../mir/timeline/geometry.js';
import { evaluateTimelineSource } from '../mir/timeline/source.js';
import { bend } from '../mir/modulation/curve.js';

// ---- the pattern kind ---------------------------------------------------------------------------------------------
const ROW = [100, 0, 0, 0, 64, 0, 0, 0, 127, 0, 30, 0, 90, 0, 0, 0]; // 6 lit of 16
const lit = ROW.filter(v => v > 0).length;
assert.ok(clipKinds().includes('pattern'), 'the pattern kind registers on import');
const kind = clipKind({ kind: 'pattern' });
assert.equal(kind.drives, false, 'a pattern fires, it never drives');
assert.deepEqual(patternSteps(ROW), ROW, 'a plain Uint8-valued array is accepted');
assert.deepEqual(patternSteps(Buffer.from(ROW).toString('base64')), ROW, 'base64 decodes to the same steps');
assert.equal(patternSteps(new Uint8Array(ROW)), null, 'a typed array is refused (JSON would mangle it)');
assert.equal(patternSteps(ROW.slice(0, 12)), null, 'only 16, 32 or 64 steps');
assert.equal(patternSteps([...ROW.slice(0, 15), 128]), null, 'velocity stops at 127');
assert.ok(patternSteps(new Array(64).fill(1)) && patternSteps(new Array(32).fill(0)), '32 and 64 steps are rows too');
assert.equal(kind.validate({ envId: '', steps: ROW }), false, 'an ENV id is required');
assert.equal(kind.validate({ envId: 'env1', steps: ROW }), true);
const src = patternSource({ envId: 7, steps: new Uint8Array(ROW), color: '#7bbfc8', name: 'KICK' });
assert.deepEqual(src, { kind: 'pattern', envId: '7', steps: ROW, length: 16, name: 'KICK', color: '#7bbfc8' }, 'patternSource normalises a row');
assert.equal(kind.duration(src, 120), 4, '16 steps = one 4-beat repeat');
assert.equal(kind.duration({ ...src, steps: new Array(64).fill(0) }, 120), 16, '64 steps = 16 beats');

const m = createTimelineModel(), lane = m.state().lanes[0].id;
const pid = m.create({ targetId: 'pattern:7', name: 'KICK', value: 0, start: 4, duration: 12, laneId: lane, source: src });
assert.ok(pid, 'a pattern clip creates through model.create');
assert.equal(m.value('pattern:7', 6), null, 'value is null: the hits are the sequencer\'s');
assert.equal(m.activeClips(6, 'pattern').length, 1, 'activeClips serves the pattern clip under the beat');
assert.equal(m.activeClips(17, 'pattern').length, 0);
assert.ok(isTimelineSnapshot(JSON.parse(JSON.stringify(m.serialize()))), 'the pattern clip survives the snapshot law');
assert.equal(m.state().curves[0].color, '#7bbfc8', 'the device colour rides on the source');

// A fake SVG node: enough DOM for paintPattern to be counted in node.
globalThis.document = { createElementNS: (_, tag) => ({ tag, attrs: {}, children: [], setAttribute(k, v) { this.attrs[k] = String(v); }, append(n) { this.children.push(n); } }) };
const paint = (clip, px = 20, height = 60) => { const svg = document.createElementNS('', 'svg'); paintPattern(svg, m.state().curves[0], clip, { geometry: createClipCoordinates(clip, 16, px, height), height, tint: '#7bbfc8' }); return svg.children; };
const count = (nodes, cls) => nodes.filter(n => (n.attrs.class || '').split(' ').includes(cls)).length;
let clip = m.state().clips[0], nodes = paint(clip);
assert.equal(count(nodes, 'lit'), lit * 3, 'a 3-bar clip repeats the row three times');
assert.equal(count(nodes, 'tl-pattern-step'), 16 * 3, 'sixteen steps per repeat');
assert.equal(count(nodes, 'tl-pattern-repeat'), 2, 'two inner repeat boundaries in three repeats');
assert.ok(nodes.filter(n => n.attrs.class === 'tl-pattern-step lit').every(n => n.attrs.fill === '#7bbfc8'), 'lit steps fill in the device colour');
const tall = nodes.find(n => n.attrs['data-velocity'] === '127'), low = nodes.find(n => n.attrs['data-velocity'] === '30');
assert.ok(+tall.attrs.height > +low.attrs.height, 'velocity is the lit fill\'s height');
m.updateClip(pid, { duration: 16 }); nodes = paint(m.state().clips[0]);
assert.equal(count(nodes, 'lit'), lit * 4, 'a resize to 4 bars extends to four repeats');
assert.equal(count(nodes, 'tl-pattern-repeat'), 3);
m.updateClip(pid, { duration: 13 }); nodes = paint(m.state().clips[0]);
assert.equal(count(nodes, 'tl-pattern-step'), 16 * 3 + 4, 'a partial bar shows its first four steps: the grid continues');
assert.equal(count(paint(m.state().clips[0], 8), 'tl-pattern-group'), 0, 'too narrow to read: groups and dim steps drop, lit steps stay');

// ---- the slice law: curves -----------------------------------------------------------------------------------------
assert.ok(Math.abs(bend(.5, midpointTension(.2)) - .2) < 1e-12 && Math.abs(bend(.5, midpointTension(.8)) - .8) < 1e-12, 'midpointTension inverts MIR\'s bend at the midpoint');
assert.equal(midpointTension(.5), 0);
const c = createTimelineModel(), cl = c.state().lanes[0].id;
const a = c.create({ targetId: 'camera.panx', name: 'A', value: .2, start: 2, duration: 8, laneId: cl });
const curveId = c.state().clips[0].curveId;
c.updateCurve(curveId, { points: [{ t: 0, v: .1, tension: .6 }, { t: .5, v: .9, tension: -.4 }, { t: 1, v: .3, tension: 0 }], length: 8 });
const before = Array.from({ length: 161 }, (_, i) => c.value('camera.panx', 2 + i * .05));
const signature = c.signature(), beat = 3.3, vCut = c.value('camera.panx', beat);
const cut = sliceClip(c, a, beat);
assert.ok(cut && cut.left === a && cut.right, 'a curve clip slices');
let s = c.state();
assert.equal(s.clips.length, 2); assert.equal(s.curves.length, 1, 'two instances of ONE source');
const L = s.clips.find(x => x.id === cut.left), R = s.clips.find(x => x.id === cut.right);
assert.ok(Math.abs(L.start + L.duration - beat) < 1e-12 && R.start === beat && Math.abs(R.start + R.duration - 10) < 1e-12, 'the halves meet at the cut and keep the outer edges');
assert.ok(Math.abs(R.offset - 1.3) < 1e-12 && R.curveId === L.curveId, 'the right offset continues the source');
const atCut = s.curves[0].points.filter(p => Math.abs(p.t * s.curves[0].length - 1.3) < 1e-9);
assert.equal(atCut.length, 2, 'two brand-new points in the break, one per side');
assert.ok(atCut.every(p => Math.abs(p.v - vCut) < 1e-12), 'valued at the curve there');
assert.ok(Math.abs(c.value('camera.panx', beat) - vCut) < 1e-6, 'the right half starts at the old value');
assert.ok(Math.abs(c.value('camera.panx', beat - 1e-7) - vCut) < 1e-6, 'the left half ends at it: continuous within 1e-6');
const after = Array.from({ length: 161 }, (_, i) => c.value('camera.panx', 2 + i * .05));
const drift = Math.max(...after.map((v, i) => Math.abs(v - before[i])));
assert.ok(drift < .02, 'the midpoint-matched tensions hold the shape: ' + drift);
const leftDrift = Math.max(...after.slice(0, 26).map((v, i) => Math.abs(v - before[i])));
assert.ok(leftDrift < 1e-9, 'a power-law left half (tension > 0) is held exactly: ' + leftDrift);
assert.ok(c.undo(), 'one undo'); assert.equal(c.signature(), signature, 'one undo restores the unsliced clip exactly');
assert.equal(sliceClip(c, a, 2 + SLICE_MIN / 2), null, 'a cut at the edge is refused');
assert.equal(c.signature(), signature, 'a refused cut changes nothing');
const onPoint = sliceClip(c, a, 6); s = c.state();
assert.equal(s.curves[0].points.filter(p => Math.abs(p.t * 8 - 4) < 1e-9).length, 2, 'a cut on an existing point adds one partner, not two');
assert.ok(onPoint && Math.abs(c.value('camera.panx', 6) - .9) < 1e-9);
c.undo();

// ---- Insert: every selected clip, one undo ---------------------------------------------------------------------
const b = c.create({ targetId: 'camera.pany', name: 'B', value: .5, start: 0, duration: 6, laneId: c.state().lanes[1].id });
const sig2 = c.signature(), many = sliceClips(c, [a, b], 5);
assert.equal(many.length, 2, 'Insert cuts every selected clip spanning the beat');
assert.equal(c.state().clips.length, 4);
c.undo(); assert.equal(c.signature(), sig2, 'one undo for the whole Insert');

// ---- patterns, audio-like kinds and the veto ---------------------------------------------------------------------
const p = createTimelineModel(), pl = p.state().lanes[0].id;
const pc = p.create({ targetId: 'pattern:7', name: 'KICK', value: 0, start: 1, duration: 12, laneId: pl, source: src });
const stepAt = (doc, w) => { const k = doc.clips.find(x => w >= x.start && w < x.start + x.duration); return Math.floor(((w - k.start) * k.scale + k.offset) / PATTERN_STEP_BEATS + 1e-9) % 16; };
const phase = Array.from({ length: 48 }, (_, i) => stepAt(p.state(), 1 + i * .25));
const pcut = sliceClip(p, pc, 6.5);
assert.ok(pcut, 'a pattern clip slices');
assert.equal(p.state().curves.length, 1, 'into two instances of the one row');
assert.deepEqual(Array.from({ length: 48 }, (_, i) => stepAt(p.state(), 1 + i * .25)), phase, 'the grid phase continues through the cut');
assert.equal(p.state().curves[0].points.length, 0, 'a kind gets no points');
registerClipKind('envelope', { validate: x => Array.isArray(x.env), value: (x, k, sb) => x.env[Math.min(x.env.length - 1, Math.floor(sb))] });
const e = p.create({ targetId: 'camera.orbit', name: 'E', value: 0, start: 0, duration: 8, laneId: p.state().lanes[1].id, source: { kind: 'envelope', env: [0, .1, .2, .3, .4, .5, .6, .7] } });
const ev = Array.from({ length: 8 }, (_, i) => p.value('camera.orbit', i + .5));
assert.ok(sliceClip(p, e, 3), 'a kind without slice() splits as instances');
assert.deepEqual(Array.from({ length: 8 }, (_, i) => p.value('camera.orbit', i + .5)), ev, 'its values run on through the cut (offsets)');
registerClipKind('fixed', { validate: () => true, value: () => .5, slice: () => null });
const f = p.create({ targetId: 'camera.rotation', name: 'F', value: 0, start: 0, duration: 4, laneId: p.state().lanes[2].id, source: { kind: 'fixed' } });
const sig3 = p.signature();
assert.equal(sliceClip(p, f, 2), null, 'a kind vetoes with slice() → null');
assert.equal(p.signature(), sig3);
console.log('Timeline slice + pattern kind: rows validate, the grid repeats and resizes, the slice holds value, shape, phase and one undo.');
