#!/usr/bin/env node
/* tests/share-link.node.mjs — shell/share-link.js (pure): the round trip, only-what-differs, typed by the defaults,
 *   and a damaged link is null, never a throw. */
import assert from 'node:assert/strict';
import { encodeState, decodeState, inspectLink, measureState, crc32, LINK_CEILING } from '../mir/shell/share-link.js';

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };
const defaults = { zoom: 1, cx: 0.5, cy: 0.5, mode: 'WAVE', play: true, law: { a: 0.1, b: 2 }, lanes: [1, 2, 3], look: { gamma: 1 } };
const state = { zoom: 2.5, cx: 0.123456789, cy: 0.5, mode: 'BAND', play: false, law: { a: 0.1, b: 3.25 }, lanes: [3, 2, 1], look: { gamma: 1 } };

ok('round trip: what differs comes back, rounded to 4 decimals; what equals its default is not written', () => {
  const s = encodeState(state, { defaults });
  assert.match(s, /^#v=1&c=[0-9a-z]+&/);
  assert.ok(!/cy=|gamma=|law\.a=/.test(s), s);
  const back = decodeState(s, { defaults });
  assert.deepEqual(back, { zoom: 2.5, cx: 0.1235, mode: 'BAND', play: false, law: { b: 3.25 }, lanes: [3, 2, 1] });
});
ok('round trip without defaults: numbers, strings, JSON come back by their look; top-level v and c are reserved', () => {
  const s = encodeState({ a: 1.5, b: 'x y', l: [1, { d: 2 }], e: { f: -0.25 }, v: 9, c: 9 });
  assert.deepEqual(decodeState(s), { a: 1.5, b: 'x y', l: [1, { d: 2 }], e: { f: -0.25 } });   // v and c are the header's: never state
});
ok('a whole URL, a #hash, or a bare fragment all read', () => {
  const s = encodeState(state, { defaults });
  const want = decodeState(s, { defaults });
  assert.deepEqual(decodeState('https://example.org/app/?q=1' + s, { defaults }), want);
  assert.deepEqual(decodeState(s.slice(1), { defaults }), want);
});
ok('the empty state is just the header, and it reads back as {}', () => {
  const s = encodeState(defaults, { defaults });
  assert.match(s, /^#v=1&c=[0-9a-z]+$/);
  assert.deepEqual(decodeState(s, { defaults }), {});
});
ok('damage: cut short anywhere, a changed character, garbage — null, never a throw', () => {
  const s = encodeState(state, { defaults });
  for (let i = 0; i < s.length - 1; i++) {
    let r; assert.doesNotThrow(() => { r = decodeState(s.slice(0, i), { defaults }); });
    assert.equal(r, null, 'cut at ' + i + ': ' + s.slice(0, i));
  }
  const edited = s.replace('zoom=2.5', 'zoom=9');
  assert.equal(decodeState(edited, { defaults }), null);
  for (const g of [null, undefined, '', '#', '#%E0%A4%A', '#v=1&c=zz&&&=', '#v=&c=', '#c=1', 42, {}, '#v=1&c=0&__proto__.x=1', '%%%#%%%']) {
    assert.doesNotThrow(() => decodeState(g, { defaults })); assert.equal(decodeState(g, { defaults }), null, String(g));
  }
});
ok('inspectLink says why, and salvages what it can from a damaged link (typed by the defaults)', () => {
  const s = encodeState(state, { defaults });
  const cut = s.slice(0, s.indexOf('&mode=') + 3);                                 // "…&mo"
  const r = inspectLink(cut, { defaults });
  assert.equal(r.ok, false); assert.equal(r.damaged, true); assert.match(r.why, /damaged/);
  assert.equal(r.state.zoom, 2.5); assert.ok(r.dropped.includes('mo'));
  const trunc = inspectLink('#v=1&zoom=&cx=abc&play=2&law.b=1e400&lanes={x', { defaults, strict: false });
  assert.deepEqual(trunc.state, {}); assert.deepEqual(trunc.dropped.sort(), ['cx', 'lanes', 'law.b', 'play', 'zoom']);
  const proto = inspectLink('#v=1&__proto__.polluted=1&a.constructor.x=1', { strict: false });
  assert.equal(({}).polluted, undefined); assert.equal(proto.dropped.length, 2);
});
ok('version: another version is null with a reason; a migrate lifts it', () => {
  const s = encodeState({ zoom: 3 }, { defaults, version: 1 });
  assert.equal(decodeState(s, { defaults, version: 2 }), null);
  assert.match(inspectLink(s, { defaults, version: 2 }).why, /version 1/);
  assert.deepEqual(decodeState(s, { defaults, version: 2, migrate: (st, v) => (v === '1' ? { ...st, zoom: st.zoom * 2 } : null) }), { zoom: 6 });
});
ok('length report: the text, its length against the 2000-character ceiling', () => {
  const m = measureState(state, { defaults });
  assert.equal(m.text, encodeState(state, { defaults })); assert.equal(m.length, m.text.length);
  assert.equal(m.ceiling, LINK_CEILING); assert.equal(m.fits, true); assert.equal(m.keys, 6);
  const big = measureState({ words: 'x'.repeat(2100) });
  assert.equal(big.fits, false);
});
ok('crc32 is the PNG one', () => { assert.equal(parseInt(crc32('123456789'), 36), 0xcbf43926); });
console.log(`share-link: ${n} passed`);
