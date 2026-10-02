/* starter/icons/make-icons.mjs — THE ICON RECIPE: the home-screen icons a PWA needs, drawn from one mark, with no
 * dependency (node's zlib and the kit's own PNG CRC).  Run from the kit's folder:  node starter/icons/make-icons.mjs
 *
 * It writes, beside itself (the sizes BASINS ships, app/icons/):
 *   icon-180.png       the apple-touch-icon (iOS takes no SVG and rounds the corners itself: draw it square)
 *   icon-192.png       the manifest's small icon            icon-512.png   the manifest's large icon (the install sheet)
 *   maskable-192.png   maskable-512.png   purpose "maskable": Android crops these to a circle, a squircle or a square,
 *                      so the mark must sit inside the SAFE ZONE, the centred circle of 40 % of the size (radius); the
 *                      ground runs to every edge.
 * THE MARK here is the MIR diamond (the nine tiles of mir/shell/assets/mir-dark.svg, its colours and its 25/27 tile
 * pitch) on BASINS' black.  An app replaces it: change TILES / GROUND below, or draw its own with the same five names
 * and sizes, and keep the maskable ones inside the safe zone. */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { crc32 } from '../../mir/core/png.js';

const GROUND = [0, 0, 0];
const TILES = ['#f15b66', '#f5bf5e', '#5bcfc2', '#f58b53', '#68cb83', '#767fd3', '#bad969', '#5ca9e4', '#b979d0']
  .map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
const TILE = 25, PITCH = 27, BLOCK = 2 * PITCH + TILE;           // 79: the logo's 3 × 3 block, before its 45° turn

/** the colour at a point of the mark, in block units centred on 0, or null (the ground) */
function at(x, y) {
  const c = Math.SQRT1_2, u = x * c + y * c + BLOCK / 2, v = -x * c + y * c + BLOCK / 2;   // undo the 45° turn
  if (u < 0 || v < 0 || u >= BLOCK || v >= BLOCK) return null;
  const col = Math.floor(u / PITCH), row = Math.floor(v / PITCH);
  if (u - col * PITCH >= TILE || v - row * PITCH >= TILE) return null;                    // the 2-unit gap
  return TILES[row * 3 + col];
}
/** draw(size, diag) → RGBA rows: the diamond's tip-to-tip span is `diag` of the size; 4 × 4 samples a pixel */
function draw(size, diag) {
  const unit = (BLOCK * Math.SQRT2) / (diag * size), out = Buffer.alloc(size * (size * 4 + 1)), N = 4;
  for (let py = 0; py < size; py++) {
    out[py * (size * 4 + 1)] = 0;                                                         // filter: none
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
        const x = (px + (sx + 0.5) / N - size / 2) * unit, y = (py + (sy + 0.5) / N - size / 2) * unit;
        const c = at(x, y) || GROUND; acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
      }
      const o = py * (size * 4 + 1) + 1 + px * 4;
      out[o] = Math.round(acc[0] / (N * N)); out[o + 1] = Math.round(acc[1] / (N * N)); out[o + 2] = Math.round(acc[2] / (N * N)); out[o + 3] = 255;
    }
  }
  return out;
}
function png(size, rows) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;   // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const here = new URL('./', import.meta.url);
for (const [name, size, diag] of [['icon-180', 180, 0.86], ['icon-192', 192, 0.86], ['icon-512', 512, 0.86],
  ['maskable-192', 192, 0.76], ['maskable-512', 512, 0.76]]) {                           // 0.76 < 0.80: inside the safe zone
  writeFileSync(new URL(name + '.png', here), png(size, draw(size, diag)));
  console.log('wrote starter/icons/' + name + '.png');
}
