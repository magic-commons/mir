#!/usr/bin/env node
/* tests/glyph.node.mjs — the one icon library (mir/glyph.js, docs/ICONS.md).
 *   every glyph is well-formed SVG that the library sizes and hides from a reader; paints only in currentColor (no fixed colour,
 *   no style attribute carrying one); sits in the 24 box; every name the kit calls exists (and an alias draws its target);
 *   the glyphs the library must hold are there; and no module in mir/ keeps a drawing of its own beside the library. */
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glyphNames, glyphAliases, hasGlyph, glyphSvg } from '../mir/glyph.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };

/* a small well-formedness reader: tags balance, attributes are quoted, only drawing elements appear */
const ELEMENTS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon']);
function parse(markup) {
  const stack = [], elements = []; let i = 0;
  while (i < markup.length) {
    if (markup[i] !== '<') { assert.ok(/^\s*$/.test(markup[i]), 'text inside a glyph: ' + JSON.stringify(markup.slice(i, i + 20))); i++; continue; }
    const end = markup.indexOf('>', i); assert.ok(end > 0, 'unterminated tag');
    const tag = markup.slice(i + 1, end); i = end + 1;
    if (tag[0] === '/') { const name = tag.slice(1).trim(); assert.equal(stack.pop(), name, 'unbalanced </' + name + '>'); continue; }
    const selfClosed = tag.endsWith('/'); const body = selfClosed ? tag.slice(0, -1) : tag;
    const m = /^([a-zA-Z]+)((?:\s+[a-zA-Z:-]+="[^"]*")*)\s*$/.exec(body); assert.ok(m, 'malformed tag <' + tag.slice(0, 60) + '>');
    assert.ok(ELEMENTS.has(m[1]), 'element <' + m[1] + '> is not a drawing element');
    const attrs = {}; for (const a of m[2].matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    elements.push({ name: m[1], attrs }); if (!selfClosed) stack.push(m[1]);
  }
  assert.equal(stack.length, 0, 'unclosed <' + stack[stack.length - 1] + '>');
  return elements;
}

const names = glyphNames();

ok('the library holds the glyphs the brief and the census ask for (and the 41 it had)', () => {
  const had = ['close', 'leave', 'reopen', 'info', 'gallery', 'camera', 'duplicate', 'sliders', 'bulletList', 'download', 'saveFolder', 'mandelbrotSmall',
    'projectFile', 'render', 'folder', 'play', 'pause', 'dirNext', 'dirPrev', 'plus', 'grip', 'clear', 'tune', 'juliaRestore', 'lock', 'mandelbrot', 'morph',
    'dot', 'pending', 'warn', 'swap', 'rename', 'check', 'compact', 'save', 'invertColors', 'chevronDown', 'expand', 'barsTop', 'barsBottom'];
  const added = ['popOut', 'dock', 'compassNorth', 'power', 'minus', 'eye', 'eyeShut', 'rewind', 'stop', 'record', 'loop', 'undo', 'redo', 'search', 'settings',
    'home', 'link', 'upload', 'star', 'starFill', 'mute', 'solo', 'chevronUp', 'chevronLeft', 'chevronRight', 'move', 'gripDots', 'xy', 'curves', 'cameraOrbit',
    'grade', 'lanes', 'edit', 'select', 'scrub'];
  for (const k of [...had, ...added]) assert.ok(names.includes(k), 'missing glyph ' + k);
  assert.equal(new Set(names).size, names.length, 'a name appears twice');
});

ok('every glyph is well-formed SVG in a 24 box, sized and hidden from a reader', () => {
  for (const k of names) {
    const svg = glyphSvg(k); const els = parse(svg);
    assert.equal(els[0].name, 'svg', k);
    assert.equal(els[0].attrs.viewBox, '0 0 24 24', k + ': viewBox');
    assert.ok(els[0].attrs.width && els[0].attrs.height, k + ': sized by the library, not by a stylesheet');
    assert.equal(els[0].attrs['aria-hidden'], 'true', k + ': aria-hidden');
    assert.ok(els.length > 1, k + ': draws nothing');
  }
});

ok('every glyph paints in currentColor only: no fixed colour, no style that carries one, no gradient or reference', () => {
  for (const k of names) {
    const svg = glyphSvg(k);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgb|hsl|oklch|url\(|<style|<defs|<image|href|<text|<linearGradient|<use/i.test(svg), k + ': a fixed colour or a reference');
    for (const e of parse(svg)) {
      for (const p of ['fill', 'stroke']) if (e.attrs[p] !== undefined) assert.ok(['none', 'currentColor'].includes(e.attrs[p]), `${k}: ${p}="${e.attrs[p]}"`);
      if (e.attrs.style) assert.ok(!/(^|;)\s*(fill|stroke|color)\s*:/.test(e.attrs.style), k + ': style sets a colour');
    }
    assert.ok(/currentColor/.test(svg), k + ': never uses currentColor');
  }
});

ok('every glyph keeps its ink in the 24 box (absolute coordinates of circles, rects and ellipses; path numbers within 0 to 24 plus the scale groups)', () => {
  for (const k of names) {
    for (const e of parse(glyphSvg(k))) {
      const a = e.attrs; const num = (v) => Number(v);
      if (e.name === 'circle') assert.ok(num(a.cx) - num(a.r) >= -0.01 && num(a.cx) + num(a.r) <= 24.01 && num(a.cy) - num(a.r) >= -0.01 && num(a.cy) + num(a.r) <= 24.01, k + ': circle outside the box');
      if (e.name === 'rect' && !a.transform) assert.ok(num(a.x) >= 0 && num(a.y) >= 0 && num(a.x) + num(a.width) <= 24 && num(a.y) + num(a.height) <= 24, k + ': rect outside the box');
      if (e.name === 'path' && a.d && !/[a-z]/.test(a.d.replace(/[eE]/g, ''))) for (const v of a.d.match(/-?\d*\.?\d+/g) || []) assert.ok(num(v) >= -0.01 && num(v) <= 24.01, k + ': path number ' + v + ' outside the box');
    }
  }
});

ok('aliases draw their target; the unknown is empty and never throws', () => {
  const al = glyphAliases();
  assert.equal(al.north, 'popOut', '`north` stays the pop-out arrow this wave');
  for (const [from, to] of Object.entries(al)) {
    assert.ok(hasGlyph(from) && hasGlyph(to), from);
    assert.ok(!names.includes(from), from + ' is an alias, not a glyph of its own');
    assert.equal(glyphSvg(from).replace(/gly-\w+/, ''), glyphSvg(to).replace(/gly-\w+/, ''), from + ' draws its target');
  }
  const warn = console.warn; console.warn = () => {}; try { assert.equal(glyphSvg('no-such-glyph'), ''); } finally { console.warn = warn; }
  assert.ok(!hasGlyph('toString') && !hasGlyph('__proto__'), 'prototype names are not glyphs');
});

/* the names the kit calls: every literal it passes to the library's own entry points, found in the source */
function sources(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (f.name !== 'vendor' && f.name !== 'locales') out.push(...sources(p)); }
    else if (/\.js$/.test(f.name) && f.name !== 'glyph.js') out.push(p);
  }
  return out;
}
const CALLS = [
  /\b(?:glyphSvg|glyphEl|hasGlyph)\(\s*'([A-Za-z]+)'/g,
  /\bsetGlyph\(\s*[\w.$]+\s*,\s*'([A-Za-z]+)'/g,
  /\bglyph\s*:\s*'([A-Za-z]+)'/g,
  /\bchip\(\s*[\w.$]+\s*,\s*'([A-Za-z]+)'/g,
  /\bg(?:lyph)?\(\s*'([A-Za-z]+)'\s*,\s*'gly gly-/g
];
const TERNARY = /\b(?:setGlyph|chip)\(\s*[\w.$]+\s*,\s*[\w.$]+\s*\?\s*'([A-Za-z]+)'\s*:\s*'([A-Za-z]+)'/g;
ok('every glyph name the kit calls exists in the library', () => {
  const used = new Map();
  for (const f of sources(path.join(ROOT, 'mir'))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const re of CALLS) for (const m of src.matchAll(re)) used.set(m[1], f);
    for (const m of src.matchAll(TERNARY)) { used.set(m[1], f); used.set(m[2], f); }
  }
  assert.ok(used.size >= 12, 'the scan found only ' + used.size + ' names: the patterns have drifted from the code');
  const missing = [...used].filter(([k]) => !hasGlyph(k)).map(([k, f]) => k + ' (' + path.relative(ROOT, f) + ')');
  assert.deepEqual(missing, [], 'names used but not in glyph.js');
});

/* An inline icon is an <svg> a module writes out itself on the 16 or 24 grid (a string, or a createElementNS with that viewBox).  A plot, a ring or a wordmark
   has its own viewBox and is not one.  Any leftover fails. */
ok('no other module keeps a drawing of its own: the inline icon strings have been folded in', () => {
  const INLINE = [/<svg[^>]*viewBox="0 0 (?:16|24) (?:16|24)"/, /viewBox'?\s*[:,]\s*'0 0 24 24'/];
  const left = [];
  for (const f of sources(path.join(ROOT, 'mir'))) {
    const src = fs.readFileSync(f, 'utf8');
    if (INLINE.some((re) => re.test(src))) left.push(path.relative(ROOT, f));
  }
  assert.deepEqual(left, [], 'an inline icon svg is still in: ' + left.join(', ') + ' — fold it into glyph.js (docs/ICONS.md)');
});

console.log(`\nALL ${n} glyph checks pass (${names.length} glyphs, ${Object.keys(glyphAliases()).length} alias)`);
