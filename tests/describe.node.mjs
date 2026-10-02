#!/usr/bin/env node
/* tests/describe.node.mjs — core/describe.js: what a visiting model can read.  describe() names the windows, the
 * parameters (with ranges, values, and what modulation drives) and the keys, and quotes only the SHARED pages; dump()
 * carries no text typed into a field (keys pressed in a field are recorded without the key, and a field's current
 * text is cut out even if something else leaked it) and no unshared page. */
import assert from 'node:assert/strict';
import { createDescribe, describeText, targetOf, eventEntry, scrub } from '../mir/core/describe.js';
import { createPages } from '../mir/shell/pages.js';
import { createKeys } from '../mir/shell/keys.js';
import { MIR_VERSION } from '../mir/version.js';

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok   ' + name); };

/* a rack as describe() reads one: registered ids, the WINDOW menu rows, open/built, capture() */
const rack = {
  registered: ['picture', 'play'],
  windowMenu: () => [['↑  PICTURE', () => {}], ['⊕  PLAY\tP', () => {}]],
  isOpen: (id) => id === 'picture', isBuilt: (id) => id === 'picture',
  capture: () => ({ v: 1, cards: [{ id: 'picture', side: 'right', open: true, folded: false, off: false, float: null }, { id: 'play', side: 'left', open: false, folded: false, off: false, float: null }] }),
};
const S = { speed: 0.4, size: 0.5 };
const params = [
  { id: 'scene.speed', label: 'SPEED', unit: '×', min: 0, max: 2, get: () => S.speed },
  { id: 'scene.size', label: 'SIZE', min: 0.1, max: 1, get: () => S.size },
];
const mod = { isModulated: (id) => id === 'scene.size', currentOf: () => 0.73, baseOf: () => 0.5 };
const pages = createPages();
pages.add({ title: 'LLM', md: '# MIR for models\nThe one rule.', shared: true });
pages.add({ title: 'Diary', md: 'PRIVATE-DIARY-LINE never leaves', shared: false });
const keys = createKeys({ actions: [{ id: 'play', label: 'PLAY', group: 'VIEW', keys: ['Space'], run: () => {} }, { id: 'save', label: 'SAVE', group: 'FILE', keys: ['Mod+S'], run: () => {} }], target: new EventTarget(), platform: 'other' });

/* a document as far as describe.js touches one: events, the fields' text, a window for errors */
const SECRET = 'hunter2-typed-secret';
function fakeDoc(fields) {
  const d = new EventTarget(), view = new EventTarget();
  d.defaultView = view; d.querySelectorAll = () => fields; d.body = null;
  return d;
}
const field = { tagName: 'INPUT', value: SECRET, getAttribute: (k) => (k === 'class' ? 'sv-name-input' : null) };
const knob = { tagName: 'DIV', getAttribute: (k) => ({ class: 'k live', 'data-param': 'scene.size', 'aria-label': 'SIZE knob', title: 'how big' }[k] ?? null) };

ok('describe() lists the windows, the parameters with ranges and values, and the keys', () => {
  const d = createDescribe({ app: { name: 'STARTER', what: 'A ring of dots.' }, rack, params, pages, keys, mod, doc: null });
  const s = d.describe();
  assert.match(s, new RegExp(`# STARTER · MIR ${MIR_VERSION.replace(/\./g, '\\.')}`));
  assert.match(s, /\| picture \| PICTURE \| open, right rack \|/);
  assert.match(s, /\| play \| PLAY \| closed, never built, left rack \|/);
  assert.match(s, /\| scene\.speed \| SPEED \| 0 – 2 × \| 0\.4 × \|/);
  assert.match(s, /\| scene\.size \| SIZE \| 0\.1 – 1 \| 0\.73 \(driven by modulation; base 0\.5\) \|/);
  assert.match(s, /\| play \| PLAY \| Space \|/);
  assert.match(s, /\| save \| SAVE \| Ctrl\+S \|/);
  S.speed = 1.25; assert.match(d.describe(), /0 – 2 × \| 1\.25 × \|/, 'values are read live');
  d.destroy();
});
ok('describe() quotes the shared pages and never names, counts or quotes an unshared one', () => {
  const s = createDescribe({ app: { name: 'X' }, pages, doc: null }).describe();
  assert.match(s, /## Shared pages\n\n### LLM\n\n# MIR for models\nThe one rule\./);
  assert.doesNotMatch(s, /Diary|PRIVATE-DIARY-LINE/);
  const brief = createDescribe({ app: { name: 'X' }, pages, doc: null }).describe({ pages: false });   // tools/check-app.mjs prints this
  assert.match(brief, /## Shared pages\n\n- LLM \(\d+ lines?\)/); assert.doesNotMatch(brief, /The one rule/, 'describe({ pages: false }): titles and line counts only');
  pages.update(pages.list()[1].id, { shared: true });
  assert.match(createDescribe({ pages, doc: null }).describe(), /PRIVATE-DIARY-LINE/, 'opening the eye shares it');
  pages.update(pages.list()[1].id, { shared: false });
  assert.doesNotMatch(createDescribe({ pages, doc: null }).describe(), /Diary/);
});
ok('targetOf() names a node by its hooks only: no title, no aria-label, no value', () => {
  assert.equal(targetOf(knob), 'div.k[data-param=scene.size]');
  assert.equal(targetOf(field), 'input.sv-name-input (a field)');
  assert.equal(eventEntry({ type: 'keydown', code: 'KeyH', key: 'h', target: field }).key, undefined, 'a key in a field has no key');
  assert.equal(eventEntry({ type: 'keydown', code: 'KeyS', ctrlKey: true, target: knob }).key, 'ctrl+KeyS', 'a command outside a field is kept');
  assert.equal(scrub('a hunter2-typed-secret b', [SECRET, 'ab']), 'a ‹typed text› b');
});
ok('dump(): versions, look, layout, cost, events and errors — and never the typed secret, nor an unshared page', () => {
  const doc = fakeDoc([field]);
  const d = createDescribe({ app: { name: 'STARTER' }, rack, params, pages, keys, mod, doc });
  /* the user types the secret into a field, key by key, then presses a knob and saves */
  for (const ch of SECRET) d.observe({ type: 'keydown', code: 'Key' + ch.toUpperCase(), key: ch, target: field });
  d.observe({ type: 'change', target: field });
  d.observe({ type: 'pointerdown', pointerType: 'mouse', target: knob });
  d.observe({ type: 'keydown', code: 'KeyS', ctrlKey: true, target: knob });
  /* and something leaks it into an error message */
  doc.defaultView.dispatchEvent(Object.assign(new Event('error'), { message: 'JSON.parse: unexpected "' + SECRET + '"' }));
  const out = d.dump();
  assert.match(out, new RegExp('MIR ' + MIR_VERSION.replace(/\./g, '\\.')));
  assert.match(out, /^layout: .*"picture"/m);
  assert.match(out, /^cost: \{"writes":/m);
  assert.match(out, /pointerdown div\.k\[data-param=scene\.size\] mouse/);
  assert.match(out, /keydown div\.k\[data-param=scene\.size\] ctrl\+KeyS/);
  assert.match(out, /keydown input\.sv-name-input \(a field\)\n/);
  assert.match(out, /errors \(1\):\n  \+\d+ms JSON\.parse: unexpected "‹typed text›"/);
  assert.ok(!out.includes(SECRET), 'the typed secret is absent');
  assert.ok(!/KeyU.*KeyN.*KeyT/s.test(out.split('events')[1].split('```')[0].replace(/ctrl\+KeyS/g, '')), 'the keys typed in the field are absent');
  assert.doesNotMatch(out, /PRIVATE-DIARY-LINE|Diary/);
  assert.match(out, /### LLM/, 'the dump ends with describe()');
  assert.equal(d.events().length, 20, 'the ring keeps the last 20');
  d.destroy();
});
ok('describeText is pure: an empty app still reads', () => {
  assert.match(describeText({}), /^# An MIR app · MIR /);
});
console.log(`\ndescribe.node: ${n} passed`);
