/* transport.node.mjs — the transport bar's pure part: the step under the pointer (tens, ones, tenths), the tempo's
 * clamp and rounding, a drag's tempo, the keys' steps, a typed tempo, the seats' geometry and repair, the first run,
 * the opener rows (from objects, from the rack's WINDOW menu), and the key table's row for Space. */
import assert from 'node:assert/strict';
import { TRANSPORT, SEATS, formatBpm, clampBpm, digitStep, charAt, dragBpm, keyStep, parseBpm, seatOf, homeOf, seatRect, menuSide,
  firstRun, menuRow, openerRows, isOpenOf, toggleOf, rackOpeners, transportActions } from '../mir/shell/transport.js';
import { BPM_DEFAULT, BPM_MIN, BPM_MAX } from '../mir/modulation/mod.js';

let n = 0;
const pass = (name) => { n++; console.log(`PASS ${name}`); };

{
  assert.equal(digitStep('30.0', 0), 10, 'tens'); assert.equal(digitStep('30.0', 1), 1, 'ones');
  assert.equal(digitStep('30.0', 2), 1, 'the point steps by one'); assert.equal(digitStep('30.0', 3), 0.1, 'tenths');
  assert.equal(digitStep('120', 0), 100, 'hundreds'); assert.equal(digitStep('120', 2), 1);
  assert.equal(digitStep('30.0', -1), 1, 'off the number'); assert.equal(digitStep('30.0', 9), 1);
  const boxes = [{ left: 10, right: 17 }, { left: 17, right: 24 }, { left: 24, right: 27 }, { left: 27, right: 34 }];
  assert.equal(charAt(boxes, 12), 0); assert.equal(charAt(boxes, 30), 3); assert.equal(charAt(boxes, 50), -1);
  assert.equal(digitStep('30.0', charAt(boxes, 12)), 10); assert.equal(digitStep('30.0', charAt(boxes, 31)), 0.1);
  pass('the digit under the pointer chooses the step: tens 10, ones 1, tenths 0.1; the point or off the number 1');
}
{
  assert.equal(BPM_DEFAULT, 30, 'Josh 2026-10-01: 30 BPM is the default');
  assert.equal(formatBpm(30), '30.0'); assert.equal(formatBpm(99.94), '99.9'); assert.equal(formatBpm(120), '120'); assert.equal(formatBpm(NaN), '');
  assert.equal(clampBpm(30.04, BPM_MIN, BPM_MAX), 30); assert.equal(clampBpm(30.06, BPM_MIN, BPM_MAX), 30.1);
  assert.equal(clampBpm(5, BPM_MIN, BPM_MAX), BPM_MIN); assert.equal(clampBpm(999, BPM_MIN, BPM_MAX), BPM_MAX);
  assert.equal(clampBpm(0.1 + 0.2 + 40, BPM_MIN, BPM_MAX), 40.3, 'on the tenth, no float dust'); assert.equal(clampBpm('x'), null);
  pass('the tempo is clamped to the model\'s range and rounded to the tenth; 30 is the default');
}
{
  const R = { min: BPM_MIN, max: BPM_MAX };
  assert.equal(dragBpm(30, 0, 10, false, R), 30);
  assert.equal(dragBpm(30, TRANSPORT.pxPerStep, 10, false, R), 40, 'one band up on the tens: +10');
  assert.equal(dragBpm(30, TRANSPORT.pxPerStep * 3 - 1, 0.1, false, R), 30.2, 'two whole bands on the tenths');
  assert.equal(dragBpm(30, -TRANSPORT.pxPerStep, 1, false, R), 29, 'down is less');
  assert.equal(dragBpm(30, TRANSPORT.touchPxPerStep * 2, 10, true, R), 32, 'a finger steps in ones, 14 px a band');
  assert.equal(dragBpm(290, 900, 10, false, R), BPM_MAX, 'clamped');
  assert.equal(keyStep('ArrowUp'), 1); assert.equal(keyStep('ArrowDown', true), -0.1); assert.equal(keyStep('PageUp'), 10); assert.equal(keyStep('PageDown', true), -10);
  assert.equal(keyStep('ArrowLeft'), 0, '← → walk the bar, they do not step'); assert.equal(keyStep('KeyA'), 0);
  assert.equal(parseBpm(' 92.5 '), 92.5); assert.equal(parseBpm('92,5'), 92.5); assert.equal(parseBpm('fast'), null); assert.equal(parseBpm(''), null);
  pass('a drag, a key and a typed value each give the tempo BASINS\' law says');
}
{
  assert.deepEqual(SEATS, ['bottom', 'top', 'compact']);
  assert.equal(seatOf('top'), 'top'); assert.equal(seatOf('mini'), 'bottom'); assert.equal(seatOf(undefined), 'bottom');
  assert.equal(homeOf('compact'), 'bottom'); assert.equal(homeOf('top'), 'top');
  assert.deepEqual(seatRect('bottom', { vw: 1280, vh: 800, w: 560, h: 46 }), { left: 360, right: 920, top: 694, bottom: 740, width: 560, height: 46 });
  assert.deepEqual(seatRect('top', { vw: 1280, vh: 800, w: 560, h: 46 }), { left: 360, right: 920, top: 52, bottom: 98, width: 560, height: 46 });
  assert.equal(seatRect('compact', { vw: 400, vh: 800, w: 200, h: 40 }).top, 700, 'the compact bar rests at the bottom');
  assert.equal(menuSide('bottom'), 'above'); assert.equal(menuSide('top'), 'below');
  pass('seats: bottom centre by default, top, compact; an unknown stored seat is repaired; the geometry is the rack\'s');
}
{
  const empty = { get: () => null }, saved = { get: () => ({ v: 1 }) }, broken = { get: () => { throw new Error('private'); } };
  assert.equal(firstRun(empty), true); assert.equal(firstRun(empty, broken), true, 'a store that throws is empty');
  assert.equal(firstRun(empty, saved), false, 'anything saved anywhere: not a first run');
  assert.equal(firstRun([empty, { get: () => '' }]), true);
  globalThis.localStorage = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, v) { this.m.set(k, String(v)); } };
  assert.equal(firstRun('app.rack'), true); localStorage.setItem('app.rack', '{}'); assert.equal(firstRun('app.rack'), false);
  pass('firstRun: true only when nothing is saved in any store the app names');
}
{
  let opened = '';
  const rows = openerRows([{ id: 'folders', label: 'FOLDERS', glyph: 'folder', key: 'S', open: () => { opened = 'f'; }, isOpen: () => false },
    { id: 'folders', label: 'AGAIN', open() {} }, { label: 'NO ID', open() {} }, { id: 'mute' }, null,
    { id: 'gui', open() {}, isOpen: true }]);
  assert.deepEqual(rows.map((r) => r.id), ['folders', 'gui'], 'an id once, a way to open, or it is dropped');
  assert.equal(rows[1].label, 'GUI', 'a missing label is the id in capitals');
  assert.equal(isOpenOf(rows[1]), true, 'a getter works'); assert.equal(isOpenOf({ isOpen() { throw new Error(); } }), false);
  toggleOf(rows[0]); assert.equal(opened, 'f');
  let closed = false; toggleOf({ open() {}, close() { closed = true; }, isOpen: () => true }); assert.ok(closed, 'an open window is closed');
  assert.deepEqual(menuRow(['↑  TONE\tT', () => {}, false, 'two knobs']), { label: 'TONE', key: 'T', hint: 'two knobs' });
  assert.deepEqual(menuRow(['⊕  MIX', () => {}]), { label: 'MIX', key: '', hint: '' }); assert.equal(menuRow(null), null);
  const open = new Set(['tone']);
  const rack = { registered: ['tone', 'mix'], windowMenu: () => [['↑  TONE\tT', () => {}], ['⊕  MIX', () => {}]],
    raise: (id) => open.add(id), close: (id) => open.delete(id), isOpen: (id) => open.has(id) };
  const list = openerRows(rackOpeners(rack, { glyphs: { mix: 'sliders' } })());
  assert.deepEqual(list.map((o) => [o.id, o.label, o.key, o.glyph, isOpenOf(o)]), [['tone', 'TONE', 'T', '', true], ['mix', 'MIX', '', 'sliders', false]]);
  toggleOf(list[1]); assert.ok(open.has('mix'), 'a latch opens its rack window'); toggleOf(list[0]); assert.ok(!open.has('tone'), 'and closes an open one');
  assert.deepEqual(openerRows(rackOpeners(rack, { only: ['mix'] })()).map((o) => o.id), ['mix']);
  const specRack = { ...rack, spec: (id) => ({ title: id === 'tone' ? 'TONE' : 'MIXER', glyph: 'tune', key: '' }) };
  assert.equal(openerRows(rackOpeners(specRack)())[1].label, 'MIXER', 'rack.spec wins over the menu when the rack has it');
  pass('openers: repaired rows; the rack\'s windows become openers from its own data (no second description)');
}
{
  let toggled = 0;
  const [a] = transportActions(() => ({ toggle: () => toggled++ }));
  assert.equal(a.id, 'transport.play'); assert.deepEqual(a.keys, ['Space']); a.run(); assert.equal(toggled, 1);
  assert.doesNotThrow(() => transportActions(() => null)[0].run(), 'a table made before the bar is safe');
  pass('the key table row: Space plays and pauses, through the app\'s one key table');
}
console.log(`\n${n} transport groups pass`);
