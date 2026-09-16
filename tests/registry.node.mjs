/* registry.node.mjs — mir/modulation/registry.js: the five maps, the id grammar, hot re-registration, subscriber
 * isolation and resync under a running modulator.
 *
 *   node tests/registry.node.mjs
 *
 * Ported from λWAVES tests/mir.test.mjs §7, §8, §11, §12 and §18, which exercised λWAVES' copy of this file
 * (lab/mir/modulation/registry.js).  λWAVES' parameter ids (observer.yaw, material.knee, ...) are replaced by a
 * neutral fixture under EXPLICIT roots, so nothing here depends on which roots the kit ships as its default;
 * the default grammar is only asked the questions that are true of any root list.
 */
import assert from 'node:assert/strict';
import { createRegistry, idFault, MAP_KINDS } from '../mir/modulation/registry.js';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  if (!ok) console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 600)));
}

/* the neutral fixture's roots; 'state' is here because the grammar's mode-key rule is keyed to that root */
const ROOTS = ['view', 'look', 'grid', 'clock', 'state'];
const reg = (o) => createRegistry({ roots: ROOTS, ...(o || {}) });

/* ══════════════ λWAVES §7 · the five maps round-trip to 1e-12 ═══════════════════ */
{
  const R = reg();
  const cell = (v) => { let x = v; return { get: () => x, set: (n) => { x = n; } }; };
  const cases = [
    ['look.knee', { map: 'linear', min: 0, max: 1 }, [0, 1e-9, 0.25, 0.5, 0.6, 1 - 1e-9, 1]],
    ['view.zoom', { map: 'log', min: 0.4, max: 40 }, [0.4, 0.5, 1, 3.3, 12.75, 39.999, 40]],
    ['view.angle', { map: 'wrap', min: 0, max: 2 * Math.PI }, [0, 0.65, Math.PI, 5.9, 2 * Math.PI - 1e-6]],
    ['grid.cells', { map: 'integer', min: 32, max: 192, step: 32 }, [32, 64, 96, 128, 160, 192]],
    ['view.tilt', { map: 'bipolar', min: -Math.PI / 2, max: Math.PI / 2 }, [-Math.PI / 2, -1, -1e-9, 0, 1e-9, 0.38, Math.PI / 2]]
  ];
  const worst = {};
  let allOk = true;
  for (const [id, spec, values] of cases) {
    R.register(id, { ...spec, ...cell(values[0]) });
    let w = 0;
    for (const v of values) {
      const err = Math.abs(R.fromNorm(id, R.toNorm(id, v)) - R.snap(id, v));
      if (!(err <= 1e-12)) allOk = false;
      if (err > w) w = err;
    }
    worst[spec.map] = w;
  }
  check('§7 every map kind round-trips value -> norm -> value to 1e-12 (linear, log with min > 0, wrap, integer, bipolar)', allOk, worst);

  const asym = reg();
  asym.register('look.grain', { map: 'bipolar', min: -1, max: 3, get: () => 0, set: () => {} });
  check('§7 the bipolar map puts 0.5 exactly at zero on a lopsided range (-1 ... +3), both directions',
    asym.toNorm('look.grain', 0) === 0.5 && asym.fromNorm('look.grain', 0.5) === 0 &&
    asym.fromNorm('look.grain', 0) === -1 && asym.fromNorm('look.grain', 1) === 3,
    { atZero: asym.toNorm('look.grain', 0), fromHalf: asym.fromNorm('look.grain', 0.5) });

  const seam = R.snap('view.angle', 2 * Math.PI);
  check('§7 the wrap map is a circle: max is min, toNorm at the seam is 0, one turn out lands back on itself',
    seam === 0 && R.toNorm('view.angle', 2 * Math.PI) === 0 &&
    Math.abs(R.snap('view.angle', 0.65 + 4 * Math.PI) - 0.65) < 1e-12,
    { seam, oneTurnOut: R.snap('view.angle', 0.65 + 4 * Math.PI) });

  check('§7 the log map is exact at both ends and refuses a range that contains zero',
    R.fromNorm('view.zoom', 0) === 0.4 && R.fromNorm('view.zoom', 1) === 40 &&
    (() => { try { R.register('view.fov', { map: 'log', min: 0, max: 4, get: () => 1, set: () => {} }); return false; } catch (_) { return true; } })());

  check('§7 the integer map snaps to its rungs exactly, both directions, and toNorm snaps before it normalises',
    R.fromNorm('grid.cells', 0) === 32 && R.fromNorm('grid.cells', 0.4) === 96 &&
    R.fromNorm('grid.cells', 1) === 192 &&
    R.snap('grid.cells', 97.4) === 96 && R.snap('grid.cells', 111) === 96 &&
    R.snap('grid.cells', 113) === 128 && R.snap('grid.cells', 9999) === 192 &&
    R.toNorm('grid.cells', 97.4) === R.toNorm('grid.cells', 96),
    { rungs: [0, 0.2, 0.4, 0.6, 0.8, 1].map((u) => R.fromNorm('grid.cells', u)) });

  check('§7 MAP_KINDS is exactly the five map kinds',
    JSON.stringify(MAP_KINDS) === JSON.stringify(['linear', 'log', 'wrap', 'integer', 'bipolar']), MAP_KINDS);
}

/* ══════════════ λWAVES §8 · the id grammar ══════════════════════════════════════
 * λWAVES asked idFault(id) with the default roots; here the same shapes are asked against explicit roots, and the
 * default roots are only asked about a root that no list would contain. */
{
  const good = ['view.angle', 'look.hueshift', 'clock.rate', 'grid.resolution',
                'state.mode.h:2:1:0.amp', 'state.mode.h:4:3:-2.phase'];
  const bad = ['', 'view', 'View.Angle', 'view.', '.angle', 'view..angle',
               'view.my angle', 'view.angle!', 'nonsense.thing', 'state.mode.2p0.amp',
               'state.mode.h:2:1:0', ' view.angle', 'view.angle-2', 42, null];
  const goodOk = good.every((id) => idFault(id, ROOTS) === null);
  const badOk = bad.every((id) => typeof idFault(id, ROOTS) === 'string');
  check('§8 id validation: the six shipped shapes pass and 15 near-misses (case, empty segment, space, punctuation, unknown root, a mode key that is not one) are each refused with a reason',
    goodOk && badOk, { good: good.map((id) => idFault(id, ROOTS)), bad: bad.map((id) => idFault(id, ROOTS)) });

  const R = createRegistry();                      /* the DEFAULT roots, whatever they are */
  let threw = null;
  try { R.register('View.Angle', { min: 0, max: 1, get: () => 0, set: () => {} }); } catch (e) { threw = e; }
  check('§8 the refusal is a TypeError thrown at registration, naming the root, and nothing is registered',
    threw instanceof TypeError && /root "View"/.test(threw.message) && !R.has('View.Angle') &&
    typeof idFault('nonsense.thing') === 'string',
    { message: threw && threw.message });

  check('§8 state.mode.* insists on a real mode key h:n:l:m',
    idFault('state.mode.h:2:1:0.amp', ROOTS) === null && typeof idFault('state.mode.2p0.amp', ROOTS) === 'string' &&
    typeof idFault('state.mode.h:2:1.amp', ROOTS) === 'string');

  /* (added) explicit roots REPLACE the default list rather than extending it */
  const only = createRegistry({ roots: ['view'] });
  let refusedOther = false;
  try { only.register('look.gain', { min: 0, max: 1, get: () => 0, set: () => {} }); } catch (_) { refusedOther = true; }
  check('§8 explicit roots replace the default list: roots() reports them, their ids register, others are refused',
    JSON.stringify(only.roots()) === JSON.stringify(['view']) && refusedOther &&
    only.register('view.angle', { min: 0, max: 1, get: () => 0, set: () => {} }).id === 'view.angle' &&
    idFault('view.angle', ['view']) === null && typeof idFault('look.gain', ['view']) === 'string');
}

/* ══════════════ λWAVES §11 · hot re-registration keeps the base ═══════════════════ */
{
  const R = reg();
  let writes = 0, oldSet = 0, newSet = 0;
  const first = R.register('view.zoom', { label: 'OLD', map: 'log', min: 0.4, max: 40,
    get: () => 3.3, set: () => { oldSet++; } });
  R.write('view.zoom', 7.5);
  R.applyModulated('view.zoom', 12);
  const before = R.state('view.zoom');
  const off = R.subscribe('view.zoom', () => { writes++; });

  const again = R.register('view.zoom', { label: 'NEW', unit: 'au', map: 'log',
    min: 0.4, max: 40, get: () => 99, set: () => { newSet++; } });
  const after = R.state('view.zoom');
  R.applyModulated('view.zoom', 5);

  check('§11 hot re-registration replaces descriptor and adapters, keeps the base, the modulated state, the order and the subscribers',
    Object.is(after.base, 7.5) && after.modulated && again.label === 'NEW' && again.unit === 'au' &&
    first.label === 'OLD' && R.list().length === 1 && R.list()[0] === 'view.zoom' &&
    newSet === 1 && oldSet === 2 && writes > 0,
    { base: [before.base, after.base], oldSet, newSet, subscriberStillWired: writes });

  R.register('view.zoom', { map: 'log', min: 0.4, max: 4, get: () => 1, set: () => {} });
  check('§11 a re-registration that moves the range re-snaps the base into it',
    R.baseOf('view.zoom') === 4, { base: R.baseOf('view.zoom') });
  off();
}

/* ══════════════ λWAVES §12 · a subscriber that throws does not break the write ════ */
{
  const R = reg();
  const errors = [];
  const R2 = reg({ onError: (e, id, why) => errors.push([id, why, String(e.message)]) });
  let landed = null, second = 0;
  R2.register('look.knee', { min: 0, max: 1, get: () => 0.5, set: (v) => { landed = v; } });
  R2.subscribe('look.knee', () => { throw new Error('a spectator fell over'); });
  R2.subscribe('look.knee', () => { second++; });
  const returned = R2.write('look.knee', 0.9);

  check('§12 a throwing subscriber does not break the write: value landed, other subscriber ran, writer got its return, throw counted and reported',
    returned === 0.9 && landed === 0.9 && second === 1 &&
    R2.stats().callbackErrors === 1 && errors.length === 1 && errors[0][0] === 'look.knee',
    { returned, landed, second, errors });

  R.register('look.grain', { min: 0, max: 1, get: () => 0, set: () => { throw new Error('the Card fell over'); } });
  let setThrew = false;
  try { R.write('look.grain', 0.5); } catch (_) { setThrew = true; }
  check('§12 a SETTER that throws is not swallowed', setThrew);

  const before = second;
  const unsub = R2.subscribe('*', () => { second += 10; });
  R2.write('look.knee', 0.2);
  const withStar = second - before;
  unsub();
  R2.write('look.knee', 0.3);
  const afterUnsub = second - before - withStar;
  check("§12 subscribe('*') sees every parameter while wired, and unsubscribing leaves the per-id subscriber intact",
    withStar === 11 && afterUnsub === 1, { withStar, afterUnsub });
}

/* ══════════════ λWAVES §18 · resync() under a running modulator ════════════════════
 * (Not in the audit's list of pure-kit sections, but it touches nothing but this registry.) */
{
  const card = (v) => { const c = { v, sets: 0 }; c.get = () => c.v; c.set = (x) => { c.v = x; c.sets++; }; return c; };
  const rig = () => { const R = reg(); const c = card(0.5); R.register('look.gain', { min: 0, max: 2, get: c.get, set: c.set }); return { R, c }; };

  {
    const { R, c } = rig();
    const seen = [];
    R.subscribe('*', (e) => seen.push(e.reason));
    R.write('look.gain', 0.734);
    R.applyModulated('look.gain', 1.9);
    seen.length = 0;
    const n = R.resync();
    const quiet = seen.slice();
    const back = R.restoreBase('look.gain');
    check("§18 the user's number survives resync() under a running modulator: nothing counted, nothing announced, restoreBase hands back 0.734 bit for bit",
      Object.is(back, 0.734) && n === 0 && quiet.length === 0 && c.v === 0.734,
      { restored: back, resynced: n, events: quiet, card: c.v });
  }
  {
    const orders = [['drag', 'mod', 'resync'], ['drag', 'resync', 'mod'], ['mod', 'drag', 'resync'],
                    ['mod', 'resync', 'drag'], ['resync', 'drag', 'mod'], ['resync', 'mod', 'drag']];
    const lost = [];
    for (const o of orders) {
      const { R } = rig();
      for (const act of o) {
        if (act === 'drag') R.write('look.gain', 0.734);
        else if (act === 'mod') R.applyModulated('look.gain', 1.9);
        else R.resync();
      }
      if (!Object.is(R.restoreBase('look.gain'), 0.734)) lost.push(o.join('>'));
    }
    check('§18 ...in all six orderings of hand, modulator and resync', lost.length === 0, { lost });
  }
  {
    const { R, c } = rig();
    const seen = [];
    R.write('look.gain', 0.734);
    R.applyModulated('look.gain', 1.9);
    R.subscribe('*', (e) => seen.push({ reason: e.reason, value: e.value, base: e.base }));
    const setsBefore = c.sets;
    c.v = 0.25;
    const n = R.resync();
    check('§18 resync still re-reads and announces an outside move of a modulated CURRENT value, keeps the base, writes nothing back',
      n === 1 && R.read('look.gain') === 0.25 && Object.is(R.baseOf('look.gain'), 0.734) &&
      R.isModulated('look.gain') && c.sets === setsBefore &&
      seen.length === 1 && seen[0].reason === 'resync' && seen[0].value === 0.25 && seen[0].base === 0.734,
      { n, current: R.read('look.gain'), base: R.baseOf('look.gain'), writes: c.sets - setsBefore, seen });
  }
  {
    const { R, c } = rig();
    R.write('look.gain', 0.734);
    c.v = 1.25;
    const n = R.resync();
    check('§18 an UNMODULATED parameter is still re-read whole: base and current both become the instrument value',
      n === 1 && Object.is(R.baseOf('look.gain'), 1.25) && Object.is(R.read('look.gain'), 1.25) &&
      Object.is(R.restoreBase('look.gain'), 1.25));
  }
}

const failed = results.filter((r) => !r.ok);
assert.equal(failed.length, 0, failed.length + ' of ' + results.length + ' failed: ' + failed.map((r) => r.name).join(' | '));
console.log('PASS registry: ' + results.length + ' assertions');
