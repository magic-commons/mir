/* panel-grade.node.mjs — the GRADE and CURVES panels' pure parts and their models with no DOM (mir/panels/picture-filter.js, grade.js,
 * curves.js): the filter's tone, matrix and composed tables (neutral is nothing at all), the curve's table and its AMOUNT, the presets, the
 * modulation ids, the PORT road (every value reaches port.set, every table port.setTable), the project part and one history row per change.
 * The same panels under a real browser, read off the screen: tests/panel-grade.browser.mjs. */
import assert from 'node:assert/strict';
import { GRADE_HOME, BLEND_MODES, toneAt, toneTable, colourMatrix, isNeutralTone, isNeutralMatrix, lookup, composeTables } from '../mir/panels/picture-filter.js';
import { GRADE_VOCAB, GRADE_IDS, CONTINUOUS, blendItems, gradeTargetId, describeGrade, createGradeModel } from '../mir/panels/grade.js';
import { IDENTITY, PRESETS, PRESET_NAMES, isIdentity, presetOf, curveTable, pathOf, histPath, createCurvesModel } from '../mir/panels/curves.js';
import { createHistory } from '../mir/history/history.js';
import { idFault } from '../mir/modulation/registry.js';

let n = 0;
const pass = (name) => { n++; console.log(`PASS ${name}`); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const apply = (M, rgb) => [0, 1, 2].map((r) => M[r * 5] * rgb[0] + M[r * 5 + 1] * rgb[1] + M[r * 5 + 2] * rgb[2]);

/* ── the filter: neutral is nothing ── */
{
  const g = { ...GRADE_HOME };
  assert.equal(composeTables(g, {}), null, 'the home grade composes no table');
  assert.ok(isNeutralTone(g) && isNeutralMatrix(g));
  assert.ok(isNeutralMatrix({ ...g, hue: 360 }) && isNeutralMatrix({ ...g, hue: -720 }), 'a whole turn is neutral');
  for (let i = 0; i <= 10; i++) assert.ok(near(toneAt(i / 10, g), i / 10), 'the home tone is the diagonal');
  const I = colourMatrix(1, 0);
  assert.deepEqual(I.map((x) => +x.toFixed(12)), [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]);
  pass('the home grade is no table and the identity matrix: the filter leaves the picture alone (and drops off the element)');
}
{
  const M = colourMatrix(0, 0), c = apply(M, [0.86, 0.24, 0.16]);
  assert.ok(near(c[0], c[1], 1e-9) && near(c[1], c[2], 1e-9), 'saturation 0 is a grey');
  assert.ok(near(c[0], 0.213 * 0.86 + 0.715 * 0.24 + 0.072 * 0.16, 1e-9), 'the CSS (Rec. 709) weights');
  for (const h of [0, 90, 200, 359]) { const g = apply(colourMatrix(1, h), [0.5, 0.5, 0.5]); assert.ok(g.every((x) => near(x, 0.5, 1e-9)), 'a hue turn keeps a grey grey'); }
  const half = apply(colourMatrix(1, 180), [1, 0, 0]);
  assert.ok(half[0] < 0.2 && half[1] > 0.2 && half[2] > 0.2, 'red turned half way leans cyan');
  pass('the colour matrix: SATURATION 0 is grey by the CSS weights; HUE turns colour and keeps grey');
}
{
  const g = { ...GRADE_HOME };
  assert.ok(near(toneAt(0.25, { ...g, exposure: 2 }), 0.5) && toneAt(0.8, { ...g, exposure: 2 }) === 1, 'EXPOSURE multiplies, then clamps');
  assert.ok(near(toneAt(0.25, { ...g, gamma: 2 }), 0.5), 'GAMMA 2 lifts: out = in^(1/γ)');
  assert.ok(near(toneAt(0.75, { ...g, contrast: 2 }), 1) && near(toneAt(0.5, { ...g, contrast: 2 }), 0.5), 'CONTRAST is about mid-grey');
  assert.ok(toneAt(0.2, { ...g, black: 0.2 }) === 0 && toneAt(0.8, { ...g, white: 0.8 }) === 1 && near(toneAt(0.5, { ...g, black: 0.2, white: 0.8 }), 0.5), 'BLACK and WHITE are the input levels');
  const t = composeTables({ ...g, invert: true }, {});
  assert.ok(t && near(t.r[0], 1) && near(t.r[255], 0) && near(t.g[128], 1 - 128 / 255, 1e-6), 'INVERT is the last word of the table');
  const lift = curveTable([{ t: 0, v: 0, tension: 0 }, { t: 0.4, v: 0.7, tension: 0 }, { t: 1, v: 1, tension: 0 }]);
  const c = composeTables({ ...g }, { MASTER: lift, R: null });
  assert.ok(near(c.r[128], lookup(lift, 128 / 255), 1e-6) && c.r[128] > 0.74, 'the master curve, read as the filter reads a table');
  const r = composeTables({ ...g }, { R: lift });
  assert.ok(r.r[128] > 0.74 && near(r.g[128], 128 / 255, 1e-6) && near(r.b[128], 128 / 255, 1e-6), 'a channel curve moves its channel alone');
  const both = composeTables({ ...g, exposure: 2, invert: true }, { MASTER: lift });
  assert.ok(near(both.r[64], 1 - lookup(lift, toneAt(64 / 255, { ...g, exposure: 2 })), 1e-6), 'tone, then master, then channel, then invert: one table');
  assert.equal(toneTable(g, 16).length, 16);
  pass('the tone (exposure → levels → gamma → contrast), the curves and INVERT compose into one table per channel');
}

/* ── the curves ── */
{
  const id = curveTable(IDENTITY());
  assert.ok(id.length === 256 && id.every((v, i) => near(v, i / 255, 1e-6)), 'the identity table is the diagonal');
  const inv = PRESETS.INVERT();
  assert.ok(near(curveTable(inv, 0)[200], 200 / 255, 1e-6), 'AMOUNT 0 is the diagonal whatever the curve');
  assert.ok(near(curveTable(inv, 0.5)[0], 0.5, 1e-6), 'AMOUNT mixes the curve with the diagonal');
  assert.ok(isIdentity(IDENTITY()) && !isIdentity(inv));
  for (const name of PRESET_NAMES) assert.equal(presetOf(PRESETS[name]()), name);
  assert.equal(presetOf([{ t: 0, v: 0.1, tension: 0 }, { t: 1, v: 1, tension: 0 }]), null);
  assert.ok(/^M0\.0 256\.0L/.test(pathOf(IDENTITY())) && pathOf(IDENTITY()).endsWith('L256.0 0.0'));
  assert.equal(histPath(null), ''); assert.equal(histPath([0, 0]), '');
  assert.ok(/^M0 256L0\.0 [0-9.]+L128\.0/.test(histPath([1, 2])) && histPath([1, 2]).endsWith('Z'), 'a histogram is an area under its bins');
  pass('a curve\'s table (256 entries, AMOUNT mixed in), SOLEIL\'s six presets known by shape, the plot\'s paths');
}

/* ── the grade's words and ids ── */
{
  assert.deepEqual(GRADE_IDS, ['exposure', 'contrast', 'gamma', 'saturation', 'hue', 'black', 'white', 'opacity', 'blend', 'invert']);
  for (const id of CONTINUOUS) { const d = describeGrade(id); assert.ok(Number.isFinite(d.min) && Number.isFinite(d.max) && d.home >= d.min && d.home <= d.max, id + ' has a range around its home'); }
  for (const id of CONTINUOUS) assert.equal(idFault(gradeTargetId('grade', id), ['grade']), null, 'a valid registry id: ' + id);
  assert.equal(gradeTargetId('gport', 'blackPoint'), 'gport.blackpoint');
  assert.deepEqual(describeGrade('exposure', { exposure: { min: 0.05, max: 20 } }), { id: 'exposure', home: 1, ...GRADE_VOCAB.exposure, min: 0.05, max: 20 });
  const items = blendItems();
  assert.equal(items.length, BLEND_MODES.length); assert.deepEqual(items[6], { id: 'color-dodge', label: 'COLOR DODGE' });
  pass('the ten grade ids, their ranges about home, valid modulation ids, an app\'s range laid over, the sixteen blend modes');
}

/* ── the PORT road with no DOM: every value to port.set; the project part; one history row per change ── */
{
  const seen = [], subs = new Set(), app = { exposure: 1.5 };
  const port = { set: (id, v) => { seen.push([id, v]); app[id] = v; }, get: (id) => app[id], subscribe: (f) => { subs.add(f); return () => subs.delete(f); },
    rows: [{ id: 'vibrance', label: 'VIBRANCE', min: 0, max: 1, home: 0 }] };
  const parts = new Map();
  const project = { register: (name, part) => { parts.set(name, part); return () => parts.delete(name); } };
  const timers = { setTimeout: (f) => { f(); return 1; }, clearTimeout: () => {} };
  const history = createHistory({ timers });
  const M = createGradeModel({ port, project, history });
  assert.equal(M.filter, null, 'a port installs no filter');
  assert.equal(M.read('exposure'), 1.5, 'the app\'s number is the truth');
  history.hold('SATURATION · GRADE'); M.write('saturation', 0); history.release();
  assert.deepEqual(seen.at(-1), ['saturation', 0], 'the value reached port.set');
  const rows = history.entries().filter((r) => r.i >= 0);
  assert.ok(rows.length === 1 && rows[0].label === 'SATURATION · GRADE' && rows[0].domain === 'grade', 'one history row, named for the gesture: ' + JSON.stringify(rows));
  history.undo();
  assert.equal(M.read('saturation'), 1, 'undo puts SATURATION back through the port');
  M.write('vibrance', 0.4);
  assert.deepEqual(seen.at(-1), ['vibrance', 0.4], 'an app\'s own row reaches port.set by its id');
  app.exposure = 3; for (const f of subs) f();
  assert.equal(M.values().exposure, 3, 'a change the app makes itself is a notice, never a poll');
  const cap = parts.get('grade').capture();
  assert.equal(cap.v, 1); assert.equal(cap.values.exposure, 3); assert.equal(cap.values.vibrance, 0.4);
  parts.get('grade').restore({ v: 1, values: { gamma: 1.8, invert: true } });
  assert.ok(seen.some(([id, v]) => id === 'gamma' && v === 1.8) && app.invert === true, 'a project restored is written through the port');
  M.destroy(); assert.equal(parts.size, 0);
  pass('GRADE with a port and no DOM: port.set for every value and row, the app\'s get is the truth, a notice is taken, the project part, one undoable history row');
}
{
  const tables = new Map();
  const port = { setTable: (ch, t) => tables.set(ch, t) };
  const parts = new Map();
  const C = createCurvesModel({ port, channels: ['MASTER', '171', '193'], project: { register: (n, p) => { parts.set(n, p); return () => parts.delete(n); } } });
  assert.deepEqual([...tables.keys()], ['MASTER', '171', '193'], 'the app\'s shader starts from a table per channel (any channel names)');
  assert.ok(tables.get('171') instanceof Float32Array && tables.get('171').length === 256 && near(tables.get('171')[255], 1));
  C.set('171', PRESETS.INVERT());
  assert.ok(near(tables.get('171')[0], 1) && near(tables.get('MASTER')[0], 0), 'one channel\'s curve reaches its table alone');
  C.setAmount(0.5);
  assert.ok(near(tables.get('171')[0], 0.5), 'AMOUNT reaches every table');
  const s = parts.get('curves').capture();
  assert.deepEqual(Object.keys(s.curves), ['171'], 'the identity channels are left out of the part');
  C.reset('171');
  assert.ok(near(tables.get('171')[0], 0) && C.amount() === 1, 'RESET: the diagonal at 100 %');
  parts.get('curves').restore(s);
  assert.ok(near(tables.get('171')[0], 0.5) && C.amount() === 0.5, 'a project part restores the curve and its amount');
  pass('CURVES with a port and no DOM: a table per channel by name, AMOUNT mixed in, the project part without the identity channels, RESET');
}

console.log(`${n}/${n} passed`);
