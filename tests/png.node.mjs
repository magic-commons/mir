#!/usr/bin/env node
/* tests/png.node.mjs — core/png.js: a PNG that carries an envelope.
 *   The picture is a real one, encoded here by node's own zlib with an independent framing; every chunk's CRC is read
 *   back by node's zlib.crc32 (not ours), and ours is checked against the CRC-32 check vector.  embed → extract round
 *   trip; a second embed replaces, never duplicates; the pixels' chunks are untouched; garbage in → null. */
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { embed, extract, extractText, chunks, crc32 } from '../mir/core/png.js';
import { wrap, check } from '../mir/core/envelope.js';

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };
const zcrc = typeof zlib.crc32 === 'function' ? (b) => zlib.crc32(b) >>> 0 : null;

/* an independent PNG encoder: 8×6 RGBA gradient, filter 0 rows, zlib.deflateSync, CRCs from zlib.crc32 when present */
function realPng(w = 8, h = 6) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) { raw[y * (1 + w * 4)] = 0; for (let x = 0; x < w; x++) raw.set([x * 30, y * 40, 200, 255], y * (1 + w * 4) + 1 + x * 4); }
  const c = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zcrc ? zcrc(td) : crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const text = Buffer.concat([Buffer.from('Software\0', 'latin1'), Buffer.from('a test', 'latin1')]);
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), c('IHDR', ihdr), c('tEXt', text), c('IDAT', zlib.deflateSync(raw)), c('IEND', Buffer.alloc(0))]));
}
/* an independent reader: every chunk's CRC by zlib.crc32 (or, on an old node, our table already checked against the vector) */
function verifyAll(b) {
  const out = []; let o = 8;
  while (o < b.length) {
    const len = Buffer.from(b.buffer, b.byteOffset + o, 4).readUInt32BE(0), type = Buffer.from(b.subarray(o + 4, o + 8)).toString('latin1');
    const want = Buffer.from(b.buffer, b.byteOffset + o + 8 + len, 4).readUInt32BE(0), got = (zcrc || crc32)(b.subarray(o + 4, o + 8 + len));
    out.push({ type, ok: want === got }); o += 12 + len;
  }
  return out;
}
const spec = wrap('spec', { skin: { tokens: { '--hue-acc': '30' } }, keys: { 'window.close': 'Ctrl+W' }, language: 'en' }, { name: 'josh-spec' });

ok('our CRC-32 is the CRC-32: the check vector, and agreement with node\'s zlib.crc32', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  if (zcrc) { const r = new Uint8Array(4096).map((_, i) => (i * 131 + 7) & 255); assert.equal(crc32(r), zcrc(r)); }
  console.log('     (independent reader: ' + (zcrc ? 'node zlib.crc32' : 'our table, vector-checked') + ')');
});
ok('the test picture is a real PNG: it parses, every CRC good, it inflates to its pixels', () => {
  const png = realPng(); const list = chunks(png);
  assert.deepEqual(list.map((c) => c.type), ['IHDR', 'tEXt', 'IDAT', 'IEND']); assert.ok(list.every((c) => c.crcOk));
  assert.equal(zlib.inflateSync(Buffer.from(png.subarray(list[2].start + 8, list[2].start + 8 + list[2].length))).length, 6 * (1 + 8 * 4));
});
ok('embed → extract round trip; one iTXt `mir` chunk just before IEND; every CRC right by an independent reader', () => {
  const png = realPng(), out = embed(png, spec);
  assert.ok(out instanceof Uint8Array);
  assert.deepEqual(extract(out), spec);
  assert.equal(check(extract(out), { tokens: JSON.parse(JSON.stringify({ tokens: [{ name: '--hue-acc', type: 'angle', skin: true }] })) }).ok, true);
  const v = verifyAll(out);
  assert.deepEqual(v.map((c) => c.type), ['IHDR', 'tEXt', 'IDAT', 'iTXt', 'IEND']); assert.ok(v.every((c) => c.ok), JSON.stringify(v));
  /* the original chunks are copied byte for byte: the picture is unchanged */
  const a = chunks(png), b = chunks(out);
  for (let i = 0; i < 3; i++) assert.deepEqual(out.subarray(b[i].start, b[i].start + 12 + b[i].length), png.subarray(a[i].start, a[i].start + 12 + a[i].length));
});
ok('a second embed replaces the chunk, never duplicates it', () => {
  const once = embed(realPng(), spec), other = wrap('page', { title: 'P', md: '# p' }), twice = embed(once, other);
  assert.equal(chunks(twice).filter((c) => c.type === 'iTXt').length, 1);
  assert.deepEqual(extract(twice), other);
  assert.equal(embed(twice, other).length, twice.length);
});
ok('a foreign iTXt with another keyword is kept, and not read as ours', () => {
  const png = realPng(), list = chunks(png);
  const kw = Buffer.from('Comment\0\0\0\0\0hello', 'latin1'), len = Buffer.alloc(4); len.writeUInt32BE(kw.length);
  const td = Buffer.concat([Buffer.from('iTXt', 'latin1'), kw]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  const iend = list[list.length - 1].start;
  const withForeign = new Uint8Array(Buffer.concat([png.subarray(0, iend), len, td, crc, png.subarray(iend)]));
  assert.equal(extract(withForeign), null);
  const out = embed(withForeign, spec);
  assert.equal(chunks(out).filter((c) => c.type === 'iTXt').length, 2); assert.deepEqual(extract(out), spec);
});
ok('garbage in → null, never a throw', () => {
  const good = embed(realPng(), spec);
  const bad = [null, undefined, 'png', new Uint8Array(0), new Uint8Array([137, 80, 78]), new TextEncoder().encode('GIF89a hello'), good.subarray(0, good.length - 20), good.subarray(0, 40), realPng()];
  for (const b of bad) { assert.equal(extract(b), null); }
  for (const b of bad.slice(0, 8)) assert.equal(embed(b, spec), null);
  /* a flipped byte inside our chunk: its CRC fails, so nothing is read */
  const flip = good.slice(); const c = chunks(flip).find((x) => x.type === 'iTXt'); flip[c.start + 20] ^= 1;
  assert.equal(extractText(flip), null);
  /* our chunk holding text that is not an envelope */
  assert.equal(extract(embed(realPng(), 'not json')), null);
});
console.log(`\nALL ${n} png checks ok`);
