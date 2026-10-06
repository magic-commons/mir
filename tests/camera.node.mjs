/* camera.node.mjs — the camera panel's pure part (mir/panels/camera-rig.js): BASINS' rig (rotation, pan, orbit, the two scales, the unwrapped
 * seam), NORTH and its memory, the vocabulary and its units, the sphere's drag (the arrow's tip follows the finger), the CSS transforms.
 * The panel under a real browser is tests/camera.browser.mjs. */
import assert from 'node:assert/strict';
import {
  CAMERA_DEFAULTS, turn, wrapDegrees, createCameraRig, setCameraValue, cameraPose, atNorth, northStep, signed, fmtDeg, fmtScale, fmtPan,
  VOCAB, IDS, HAND_IDS, has, present, describe, lookDir, anglesOf, project, sphereDrag, SPHERE, transform2d, transform3d,
} from '../mir/panels/camera-rig.js';

let n = 0;
const pass = (name) => { n++; console.log(`PASS ${name}`); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

{
  assert.equal(turn(10, 350), 20); assert.equal(turn(350, 10), -20); assert.equal(wrapDegrees(-10), 350); assert.equal(wrapDegrees(370), 10);
  const rig = createCameraRig();
  assert.deepEqual({ ...rig, unwrapped: undefined }, { ...CAMERA_DEFAULTS, unwrapped: undefined });
  /* BASINS' seam: 359° → 0° is one degree of continuous travel, and at 1/16× it stays one sixteenth of a degree */
  setCameraValue(rig, 'rotation', 359); assert.equal(rig.unwrapped, -1, '359° is one degree back from north, not 359 forward'); setCameraValue(rig, 'rotation', 0);
  assert.equal(rig.unwrapped, 0, 'and back through the seam: continuous, never a 360° jump'); setCameraValue(rig, 'rotation', 10); assert.equal(rig.unwrapped, 10);
  rig.rotationmul = 1 / 16;
  assert.ok(near(cameraPose(rig, 0).rotation, 10 / 16), 'the excursion is scaled about the base, not the angle');
  pass("BASINS' rig: turn, wrap, the unwrapped seam, the scaled excursion");
}
{
  const rig = createCameraRig({ panx: 0.2, pany: -0.1, panmul: 2, orbit: 0.5, orbitangle: 90 });
  const p = cameraPose(rig);
  assert.ok(near(p.panx, 0.4 + 0.5 * Math.cos(Math.PI / 2)) && near(p.pany, -0.2 + 0.5), 'the pan axes and the orbit compose: pan × scale + orbit radius at its angle');
  rig.panmul = 0; assert.ok(near(cameraPose(rig).panx, 0, 1e-12), 'PAN SCALE 0 mutes the pan');
  pass('the pan, the orbit and PAN SCALE compose');
}
{
  assert.ok(atNorth(0) && atNorth(0.05) && atNorth(359.95) && !atNorth(1) && !atNorth(180));
  assert.equal(signed(190), -170); assert.equal(fmtDeg(190), '−170°'); assert.equal(fmtDeg(45), '45°');
  /* BASINS' one-button law: off north → north, remembering; at north → back; and the memory outlives the trip back */
  let s = northStep(90, null);
  assert.deepEqual(s, { to: 0, memo: 90 });
  s = northStep(0, s.memo); assert.deepEqual(s, { to: 90, memo: 90 }, 'at north: back to where it left');
  s = northStep(0, s.memo); assert.deepEqual(s, { to: 90, memo: 90 }, 'the memory is kept: the next press from north goes back again');
  s = northStep(90, s.memo); assert.deepEqual(s, { to: 0, memo: 90 });
  assert.deepEqual(northStep(0, null), { to: null, memo: null }, 'at north with nothing remembered: no trip');
  assert.deepEqual(northStep(-30, 5), { to: 0, memo: 330 }, 'the memory is [0, 360)');
  pass('NORTH goes north and, pressed again, back; it remembers; at north with nothing remembered it stays');
}
{
  assert.equal(fmtScale(1), '1:1'); assert.equal(fmtScale(0.25), '1/4×'); assert.equal(fmtScale(2), '2×'); assert.equal(fmtPan(0.5), '+50%'); assert.equal(fmtPan(-0.25), '−25%');
  pass("BASINS' formats: 1:1, 1/4×, +50%");
}
{
  assert.ok(IDS.includes('rotation') && IDS.includes('panX') && IDS.includes('yaw') && IDS.includes('fov') && IDS.includes('orbitAngle'));
  assert.deepEqual([...HAND_IDS].sort(), ['autoRotate', 'drag', 'friction', 'fling', 'inertia', 'spin', 'wheel'].sort());
  /* a port implements only the ids it has */
  const port = { get: (id) => ({ rotation: 10, panX: 0 })[id] };
  assert.deepEqual(present(port), ['rotation', 'panX']);
  assert.equal(has({ get: () => undefined, has: (id) => id === 'zoom' }, 'zoom'), true, 'port.has decides when it exists');
  assert.equal(has(port, 'notAnId'), false);
  /* units: a radian port gets radian ranges; the readouts stay in degrees */
  const d = describe('yaw', { angle: 'rad' });
  assert.ok(near(d.min, -Math.PI) && near(d.max, Math.PI) && d.wrap, 'yaw in radians spans ±π');
  assert.equal(d.fmt(Math.PI / 2), '90°');
  assert.equal(describe('yaw', {}).max, 180);
  /* the port's own range wins, in its own unit */
  const z = describe('zoom', { ranges: { zoom: { min: 1.2, max: 8, home: 3.3 } } });
  assert.deepEqual([z.min, z.max, z.home, z.log], [1.2, 8, 3.3, true]);
  assert.equal(describe('friction', {}).fmt(0), '∞ · forever', "λWAVES' friction reads μ, and zero is forever");
  assert.equal(VOCAB.rotation.wrap, true); assert.equal(VOCAB.pitch.wrap, undefined, 'pitch is bounded');
  pass('the vocabulary: present ids only, radian ports scaled, the port\'s own range wins, readouts in degrees');
}
{
  for (const [y, p] of [[0.3, 0.2], [-1.1, 0.6], [2.4, -0.4], [3.0, 0.1], [-2.2, -0.7], [0, 0]]) {
    const d = lookDir(y, p), a = anglesOf(d);
    assert.ok(near(Math.hypot(...d), 1) && near(a.yaw, Math.atan2(Math.sin(y), Math.cos(y))) && near(a.pitch, p), 'lookDir and anglesOf are inverse');
  }
  const o = project([0, 0, 0]); assert.ok(near(o[0], SPHERE.cx) && near(o[1], SPHERE.cy), 'the origin is the drawing\'s centre');
  /* THE DRAG: the turn sphereDrag returns moves the arrow's tip by the step the finger made */
  let worst = 0;
  for (const [y, p] of [[0.3, 0.2], [2.4, -0.4], [3.0, 0.1], [-2.2, -0.7], [0, 0], [1.7, 1.0], [-0.4, -1.2]]) {   // (not the silhouette, where one screen direction cannot be followed)
    for (const [sx, sy] of [[0.2, 0], [0, 0.2], [-0.2, 0.1], [0.14, -0.14]]) {
      const [dy, dp] = sphereDrag(y, p, sx, sy);
      const t0 = project(lookDir(y, p)), t1 = project(lookDir(y + dy, p + dp));
      const err = Math.hypot(t1[0] - t0[0] - sx, t1[1] - t0[1] - sy) / Math.hypot(sx, sy);
      worst = Math.max(worst, err);
    }
  }
  assert.ok(worst < 0.05, "the tip follows the finger within 5% at every sampled pose (worst " + worst.toFixed(3) + ")");
  /* at the pole a sideways drag still turns the arrow (no gimbal lock): yaw changes the tip there only a little, but the pitch answer is finite and the turn is small */
  const [dyP, dpP] = sphereDrag(0.5, Math.PI / 2 - 1e-6, 5, 0);
  assert.ok(Number.isFinite(dyP) && Number.isFinite(dpP) && Math.abs(dpP) < 0.2, 'at the pole the answer is finite and small');
  /* the pose looking along the eye: the damped inverse never explodes */
  const eye = anglesOf([1, 1, 1]), [ey, ep] = sphereDrag(eye.yaw, eye.pitch, 10, 10);
  assert.ok(Number.isFinite(ey) && Number.isFinite(ep) && Math.abs(ey) < 1 && Math.abs(ep) < 1, 'pointed at the eye the damped inverse stays bounded');
  /* zero in, zero out */
  assert.deepEqual(sphereDrag(0.2, 0.3, 0, 0).map((v) => Math.abs(v)), [0, 0]);
  pass('the sphere drag: the arrow\'s tip follows the finger (worst error ' + worst.toFixed(3) + '), finite at the pole and at the eye');
}
{
  const rig = createCameraRig({ rotation: 30, panx: 0.1, pany: 0.2 });
  const t = transform2d(rig, { w: 400, zoom: 2 });
  assert.equal(t, 'translate(40.00px, -80.00px) rotate(30.000deg) scale(2.00000, 2.00000)', 'pan is a share of the width, up is +y; the picture turns clockwise');
  assert.ok(transform2d(rig, { w: 400, zoom: 2, flip: true }).includes('scale(-2.00000, 2.00000)'), 'FLIP mirrors');
  const t3 = transform3d({ yaw: 20, pitch: 10, roll: 5, zoom: 1.5, fov: 60, h: 400, free: true });
  assert.ok(t3.startsWith('perspective(346.4px)') && t3.includes('rotateX(-10.000deg)') && t3.includes('rotateY(20.000deg)') && t3.includes('rotateZ(5.000deg)'), t3);
  assert.ok(transform3d({ roll: 9, free: false }).includes('rotateZ(0.000deg)'), 'roll is for FREE only');
  pass('the CSS camera: 2-D translate · rotate · scale, 3-D a perspective with FOV; roll only in FREE');
}
console.log(`${n} passed`);
