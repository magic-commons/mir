/* zip.node.mjs — core/zip.js, the stored ZIP (BASINS' export-zip.js, ported 2026-10-05): a stored round trip, the CRC refusal
 * (BASINS' tampered-zip assertion), a compressed entry named, a damaged directory refused, the part ceiling, a hostile name. */
import assert from 'node:assert/strict';
import { StoredZip, PngZipPart, readStoredZip, zipSafeName, ZIP_LIMIT } from '../mir/core/zip.js';
import { crc32 } from '../mir/core/png.js';

const enc = new TextEncoder(), a = enc.encode('{"hello":"world"}'), b = Uint8Array.from({ length: 5000 }, (_, i) => (i * 31) & 255);
const zip = new StoredZip(); zip.add('project.json', a); zip.add('assets/audio/x.bin', b);
const blob = zip.finish(), raw = new Uint8Array(await blob.arrayBuffer());
assert.equal(blob.type, 'application/zip');
const files = readStoredZip(raw);
assert.deepEqual([...files.keys()], ['project.json', 'assets/audio/x.bin'], 'names and order');
assert.deepEqual(files.get('project.json'), a); assert.deepEqual(files.get('assets/audio/x.bin'), b, 'bytes ride stored, not deflated');
assert.equal(raw.length, 30 + 12 + a.length + 30 + 18 + b.length + 46 + 12 + 46 + 18 + 22, 'a stored ZIP is headers plus the bytes');
assert.equal(crc32(enc.encode('123456789')), 0xcbf43926, 'the one CRC table is the ZIP one');
assert.ok(new PngZipPart() instanceof StoredZip);

// a tampered byte inside the first entry's payload (30-byte header + the 12-byte name) fails its CRC, by name
const bad = raw.slice(); bad[42] ^= 0xff;
assert.throws(() => readStoredZip(bad), /project\.json failed its CRC/);
// a compressed entry is named, never read as if it were stored
const deflated = raw.slice(); { const d = new DataView(deflated.buffer); const dir = d.getUint32(raw.length - 22 + 16, true); d.setUint16(dir + 10, 8, true); }
assert.throws(() => readStoredZip(deflated), /is compressed; only stored ZIPs are read/);
// not a ZIP, and a directory that points outside the file
assert.throws(() => readStoredZip(enc.encode('not a zip at all, not even close')), /Not a ZIP file/);
const wild = raw.slice(); { const d = new DataView(wild.buffer); const dir = d.getUint32(raw.length - 22 + 16, true); d.setUint32(dir + 42, 0xfffffff0, true); }
assert.throws(() => readStoredZip(wild), /damaged/);
assert.throws(() => readStoredZip(raw.slice(0, raw.length - 30)), /Not a ZIP file|damaged/, 'a truncated file is refused');
// the part ceiling: past 32-bit offsets add() throws, the caller starts the next part
const full = new StoredZip(); full.bytes = ZIP_LIMIT - 10;
assert.throws(() => full.add('x.bin', new Uint8Array(100)), /ZIP part is full/);
assert.throws(() => new StoredZip().add('x', 'not bytes'), /too large/);
// the names that cannot climb out of an unpack
for (const n of ['project.json', 'assets/audio/a.json']) assert.ok(zipSafeName(n), n);
for (const n of ['../x', 'a/../../x', '/etc/passwd', '\\win', '']) assert.equal(zipSafeName(n), false, n);
console.log('zip: a stored round trip, the CRC refusal by name, a compressed entry and a damaged directory refused, the part ceiling, hostile names pass.');
