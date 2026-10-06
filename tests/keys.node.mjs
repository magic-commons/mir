/* keys.node.mjs — the one key table (mir/shell/keys.js), with no browser: the chord spelling (permutations, aliases,
 * Mod on a Mac and elsewhere, malformed chords), the display, the one listener (when, fields, owned keys, repeat,
 * first-whose-when-holds), the steal (the loser reported and really unbound), reset, saving only the difference, and
 * restoring a saved object with an unknown action and a malformed chord.  The listener runs on Node's own EventTarget. */
import assert from 'node:assert/strict';
import { createKeys, normalize, parseChord, chordFromEvent, displayChord, ariaChord, pickAction, isField, ownsKey,
  steal, diffSaved, repairSaved, bindError } from '../mir/shell/keys.js';
import { check as checkEnvelope, wrap } from '../mir/core/envelope.js';

let n = 0;
const pass = (name, detail) => { n++; console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };
const memory = (init = null) => { const box = { v: init, writes: 0 }; return { box, get: () => box.v, set: (o) => { box.v = JSON.parse(JSON.stringify(o)); box.writes++; } }; };
const press = (target, code, mods = {}, extra = {}) => {
  const e = new Event('keydown', { cancelable: true, bubbles: true });
  Object.assign(e, { code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, isComposing: false, ...mods });
  if (extra.target) Object.defineProperty(e, 'target', { value: extra.target });
  target.dispatchEvent(e);
  return e;
};
const node = (tag, attrs = {}) => ({ nodeType: 1, tagName: tag.toUpperCase(), type: attrs.type || '', isContentEditable: !!attrs.ce,
  getAttribute: (k) => (k in attrs ? attrs[k] : null), hasAttribute: (k) => k in attrs });

{
  const one = 'Mod+Shift+KeyS';
  for (const s of ['Ctrl+Shift+KeyS', 'Shift+Ctrl+KeyS', 'ctrl+shift+s', 'SHIFT+CTRL+S', 'Control+Shift+s', 'Shift+Ctrl+S', ' Ctrl + Shift + S ', 'Mod+Shift+S', 'Shift+Mod+KeyS'])
    assert.equal(normalize(s, 'other'), one, s);
  assert.equal(normalize('Ctrl+Shift+KeyS', 'mac'), 'Ctrl+Shift+KeyS', 'on a Mac, Ctrl is the real Control key');
  assert.equal(normalize('Cmd+Shift+S', 'mac'), one, 'on a Mac, ⌘ is Mod');
  assert.equal(normalize('Meta+S', 'other'), 'Meta+KeyS', 'elsewhere, Meta is the Windows key, not Mod');
  assert.equal(normalize('Mod+S', 'mac'), normalize('Mod+S', 'other'), 'Mod is one spelling on both');
  assert.equal(normalize('?'), 'Shift+Slash'); assert.equal(normalize('Shift+/'), 'Shift+Slash');
  assert.equal(normalize('Ctrl++'), 'Mod+Shift+Equal', 'a + after a + is the key');
  assert.equal(normalize('Esc'), 'Escape'); assert.equal(normalize('up'), 'ArrowUp'); assert.equal(normalize('5'), 'Digit5'); assert.equal(normalize('f5'), 'F5');
  assert.equal(normalize('Alt+Ctrl+Shift+Win+K'), 'Mod+Alt+Shift+Meta+KeyK', 'the fixed order');
  for (const bad of ['', 'Ctrl', 'Ctrl+Shift', 'Ctrl+S+T', 'Ctrl+Banana', 'Ctrl+', null, 42, 'x'.repeat(80)]) assert.equal(normalize(bad), null, String(bad));
  assert.deepEqual(parseChord('Ctrl+Alt+Delete'), { mods: ['Mod', 'Alt'], code: 'Delete' });
  pass('normalising: every permutation and alias of Ctrl+Shift+S is one chord; Mod is ⌘ on a Mac and Ctrl elsewhere; malformed is null');
}
{
  assert.equal(chordFromEvent({ code: 'KeyS', ctrlKey: true, shiftKey: true }, 'other'), 'Mod+Shift+KeyS');
  assert.equal(chordFromEvent({ code: 'KeyS', metaKey: true, shiftKey: true }, 'mac'), 'Mod+Shift+KeyS', '⌘⇧S on a Mac is the same action');
  assert.equal(chordFromEvent({ code: 'KeyS', ctrlKey: true }, 'mac'), 'Ctrl+KeyS');
  assert.equal(chordFromEvent({ code: 'ShiftLeft', shiftKey: true }), null, 'a modifier alone is no chord');
  assert.equal(displayChord('Mod+Shift+KeyS', 'mac'), '⇧⌘S'); assert.equal(displayChord('Mod+Shift+KeyS', 'other'), 'Ctrl+Shift+S');
  assert.equal(displayChord('Shift+Slash', 'other'), 'Shift+/'); assert.equal(displayChord('ArrowLeft'), '←'); assert.equal(displayChord('Space'), 'Space');
  assert.equal(ariaChord('Mod+KeyS', 'mac'), 'Meta+S'); assert.equal(ariaChord('Mod+KeyS', 'other'), 'Control+S');
  pass('events and display: an event is the same chord as its spelling; ⇧⌘S on a Mac, Ctrl+Shift+S elsewhere');
}
{
  assert.equal(isField(node('input', { type: 'text' })), true); assert.equal(isField(node('input', { type: 'range' })), false);
  assert.equal(isField(node('textarea')), true); assert.equal(isField(node('div', { ce: true })), true); assert.equal(isField(node('button')), false);
  assert.equal(ownsKey(node('div', { role: 'slider' }), 'ArrowLeft'), true); assert.equal(ownsKey(node('div', { role: 'slider' }), 'Mod+ArrowLeft'), false);
  assert.equal(ownsKey(node('button'), 'Space'), true); assert.equal(ownsKey(node('button'), 'KeyP'), false);
  const E = [{ id: 'a', keys: ['KeyP'], when: () => false }, { id: 'b', keys: ['KeyP'] }, { id: 'c', keys: ['KeyP'] }, { id: 'f', keys: ['Mod+KeyS'], inFields: true }, { id: 't', keys: ['KeyT'], when: () => { throw new Error('x'); } }];
  assert.equal(pickAction(E, 'KeyP').id, 'b', 'the first whose when() holds');
  assert.equal(pickAction(E, 'KeyP', { field: true }), null, 'a field reaches no plain key');
  assert.equal(pickAction(E, 'Mod+KeyS', { field: true }).id, 'f', 'inFields reaches through a field');
  assert.equal(pickAction(E, 'KeyP', { repeat: true }), null, 'no auto-repeat unless asked');
  assert.equal(pickAction(E, 'KeyT'), null, 'a throwing when() is false');
  pass('matching: fields, owned keys, repeat, and the first action whose when() holds');
}
{
  const target = new EventTarget(), ran = [];
  let mode = 'stage';
  const K = createKeys({ target, platform: 'other', actions: [
    { id: 'play', label: 'PLAY', group: 'TRANSPORT', keys: ['Space'], when: () => mode === 'stage', run: () => ran.push('play') },
    { id: 'pause', label: 'PAUSE', group: 'TRANSPORT', keys: ['Space'], run: () => ran.push('pause') },
    { id: 'save', label: 'SAVE', group: 'FILE', keys: ['Mod+S'], inFields: true, run: () => ran.push('save') },
    { id: 'help', label: 'HELP', group: 'WINDOWS', keys: ['?'], run: () => ran.push('help') },
  ] });
  let e = press(target, 'Space'); assert.deepEqual(ran, ['play']); assert.equal(e.defaultPrevented, true, 'a key that ran is taken');
  mode = 'menu'; press(target, 'Space'); assert.deepEqual(ran, ['play', 'pause'], 'when() moves the chord to the next holder');
  press(target, 'KeyS', { ctrlKey: true }); press(target, 'Slash', { shiftKey: true }); assert.deepEqual(ran.slice(2), ['save', 'help']);
  ran.length = 0;
  press(target, 'Slash', { shiftKey: true }, { target: node('input', { type: 'text' }) });
  press(target, 'KeyS', { ctrlKey: true }, { target: node('textarea') });
  assert.deepEqual(ran, ['save'], 'in a field only the inFields action ran');
  ran.length = 0;
  press(target, 'Space', {}, { target: node('button') }); assert.deepEqual(ran, [], 'a focused button keeps its Space');
  press(target, 'Space', { repeat: true }); assert.deepEqual(ran, [], 'auto-repeat runs nothing');
  e = new Event('keydown', { cancelable: true }); Object.assign(e, { code: 'Space' }); e.preventDefault(); target.dispatchEvent(e); assert.deepEqual(ran, [], 'taken nearer the target: not ours');
  K.destroy(); press(target, 'Space'); assert.deepEqual(ran, [], 'destroy() removes the one listener');
  pass('the one listener: runs once, honours when(), fields, owned keys, repeat and defaultPrevented; destroy() removes it');
}
{
  const S = memory(), target = new EventTarget(), ran = [];
  const acts = () => [
    { id: 'undo', label: 'UNDO', group: 'EDIT', keys: ['Mod+Z'], run: () => ran.push('undo') },
    { id: 'redo', label: 'REDO', group: 'EDIT', keys: ['Mod+Shift+Z', 'Mod+Y'], run: () => ran.push('redo') },
    { id: 'zoom', label: 'ZOOM IN', group: 'VIEW', keys: ['='], run: () => ran.push('zoom') },
  ];
  const K = createKeys({ target, platform: 'other', storage: S, actions: acts() });
  assert.deepEqual(K.conflicts(), []);
  const r = K.bind('zoom', 'Ctrl+Y');
  assert.equal(r.ok, true); assert.deepEqual(r.stolen, [{ id: 'redo', label: 'REDO' }], 'the loser is reported');
  assert.deepEqual(K.chords('redo'), ['Mod+Shift+KeyZ'], 'and really unbound');
  assert.deepEqual(K.chords('zoom'), ['Mod+KeyY'], 'bind replaces: the old chord is gone');
  press(target, 'KeyY', { ctrlKey: true }); press(target, 'Equal'); assert.deepEqual(ran, ['zoom'], 'the new chord runs it, the old does not');
  assert.deepEqual(S.box.v, { redo: ['Mod+Shift+KeyZ'], zoom: ['Mod+KeyY'] }, 'only the difference is saved');
  assert.equal(K.bind('zoom', 'Escape').ok, false); assert.equal(K.bind('zoom', 'Tab').reason, bindError('Tab')); assert.equal(K.bind('nope', 'KeyQ').ok, false);
  assert.equal(K.check('zoom', 'Ctrl+Tab'), null, 'a modified Tab is a chord like any other');
  K.bind('zoom', 'Mod+Z', { add: true }); assert.deepEqual(K.chords('zoom'), ['Mod+KeyY', 'Mod+KeyZ']); assert.deepEqual(K.chords('undo'), []);
  K.reset('undo'); assert.deepEqual(K.chords('undo'), ['Mod+KeyZ']);
  assert.deepEqual(K.conflicts(), [{ chord: 'Mod+KeyZ', ids: ['undo', 'zoom'] }], 'a reset can bring a conflict back, and it is listed');
  K.unbind('zoom', 'Mod+Z'); assert.deepEqual(K.chords('zoom'), ['Mod+KeyY']);
  const K2 = createKeys({ target: new EventTarget(), platform: 'other', storage: S, actions: acts() });
  assert.deepEqual(K2.chords('zoom'), ['Mod+KeyY'], 'a second table on the same storage reads it back (the reload)');
  K.resetAll(); assert.deepEqual(S.box.v, {}, 'all defaults: nothing saved');
  assert.deepEqual(steal({ a: ['X'], b: ['X', 'Y'] }, 'c', 'X'), { map: { a: [], b: ['Y'], c: ['X'] }, stolen: ['a', 'b'] });
  assert.deepEqual(diffSaved({ a: ['X', 'Y'] }, { a: ['Y', 'X'] }), {}, 'order is not a difference');
  K.destroy(); K2.destroy();
  pass('rebinding: the steal reports and unbinds the loser; reserved keys refused; reset; only the difference saved and read back');
}
{
  const saved = { gone: ['Mod+KeyQ'], zoom: ['Ctrl+Banana'], undo: ['Ctrl+Shift+U', 'Ctrl+Banana'], redo: [], help: 'F1', play: 7 };
  const r = repairSaved(saved, ['zoom', 'undo', 'redo', 'help', 'play'], 'other');
  assert.deepEqual(r.keys, { undo: ['Mod+Shift+KeyU'], redo: [], help: ['F1'] });
  assert.equal(r.dropped.length, 4, JSON.stringify(r.dropped)); assert.deepEqual(r.dropped.map((d) => d.id), ['gone', 'zoom', 'undo', 'play']);
  assert.deepEqual(repairSaved('{nope', ['a']).keys, {}); assert.deepEqual(repairSaved(null, ['a']).keys, {}); assert.deepEqual(repairSaved([1], ['a']).keys, {});
  const K = createKeys({ target: new EventTarget(), platform: 'other', storage: memory(JSON.stringify(saved)), actions: [
    { id: 'zoom', label: 'ZOOM', keys: ['='] }, { id: 'undo', label: 'UNDO', keys: ['Mod+Z'] }, { id: 'redo', label: 'REDO', keys: ['Mod+Y'] }] });
  assert.deepEqual(K.chords('zoom'), ['Equal'], 'every chord malformed: the defaults stay');
  assert.deepEqual(K.chords('undo'), ['Mod+Shift+KeyU']); assert.deepEqual(K.chords('redo'), [], 'an empty list stays unbound');
  const broken = createKeys({ target: new EventTarget(), storage: { get() { throw new Error('denied'); }, set() { throw new Error('denied'); } }, actions: [{ id: 'a', keys: ['KeyA'] }] });
  assert.equal(broken.bind('a', 'KeyB').ok, true, 'a storage that throws costs the save, nothing else');
  /* the saved shape is a spec envelope's `keys` member */
  const v = checkEnvelope(wrap("spec", { keys: K.saved() }));
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  K.destroy(); broken.destroy();
  pass('restoring: an unknown action and a malformed chord are dropped, never thrown; the saved shape is a valid spec `keys`', `${r.dropped.length} dropped`);
}
{
  const K = createKeys({ target: new EventTarget(), platform: 'mac', actions: [
    { id: 'save', label: 'SAVE', group: 'FILE', hint: 'save the project', keys: ['Mod+S'], when: () => false },
    { id: 'open', label: 'OPEN', group: 'FILE', keys: ['Mod+O'] }, { id: 'keys', label: 'KEYS', group: 'HELP', keys: ['?'] }, { id: 'none', label: 'NONE', group: 'HELP' }] });
  assert.equal(K.menuKey('save'), '⌘S'); assert.equal(K.menuKey('save', 'other'), 'Ctrl+S'); assert.equal(K.menuKey('none'), '');
  const [txt, run, dis] = K.menuItem('save'); assert.equal(txt, 'SAVE\t⌘S'); assert.equal(dis(), true, 'when() false: the menu row is disabled'); assert.equal(run(), false);
  assert.deepEqual(K.helpRows().map((g) => [g.group, g.rows.map((r) => r.chords.join(' '))]), [['FILE', ['⌘S', '⌘O']], ['HELP', ['⇧/', '']]]);
  assert.equal(K.describe().actions[0].keys[0], 'Mod+KeyS');
  assert.equal(JSON.stringify(K.describe()).length > 0, true);
  K.destroy();
  pass('generated: the menu key column, a menu entry with its disabled state, the help rows and describe() come from the table');
}
{
  const E = [{ id: 'step', keys: ['Space'] }, { id: 'play', keys: ['Space'], overControls: true }];
  assert.equal(pickAction(E, 'Space', { owned: true }).id, 'play', 'a key a control owns reaches only an overControls action');
  assert.equal(pickAction(E, 'Space').id, 'step', 'unowned: table order as ever');
  assert.equal(pickAction(E, 'Space', { field: true }), null, 'overControls does not reach into a text field');
  const target = new EventTarget(), ran = [];
  const K = createKeys({ target, platform: 'other', actions: [
    { id: 'play', label: 'PLAY', keys: ['Space'], overControls: true, run: () => ran.push('play') },
    { id: 'next', label: 'NEXT', keys: ['ArrowRight'], run: () => ran.push('next') }] });
  const e = press(target, 'Space', {}, { target: node('button') });
  press(target, 'ArrowRight', {}, { target: node('div', { role: 'slider' }) });
  press(target, 'Space', {}, { target: node('input', { type: 'text' }) });
  assert.deepEqual(ran, ['play'], 'Space plays over a button; the slider keeps its arrow; a text field keeps its space');
  assert.equal(e.defaultPrevented, true, 'and the button does not get the press');
  const up = new Event('keyup', { cancelable: true }); Object.assign(up, { code: 'Space' }); target.dispatchEvent(up);
  assert.equal(up.defaultPrevented, true, 'nor its release (a button clicks on keyup)');
  K.destroy();
  pass('overControls: an action can run over a focused control (BASINS\' Space plays), never inside a text field');
}
{
  /* alpha.6 (three models' Tetris): a declared key that is not a key throws, naming the action; rows can be added later */
  assert.throws(() => createKeys({ actions: [{ id: 'hardDrop', label: 'HARD DROP', keys: ['Shift'], run: () => {} }], target: new EventTarget(), platform: 'other' }),
    /"hardDrop" names "Shift", which is not a key/);
  const store = memory({ late: ['KeyQ'] }), ran = [];
  const K = createKeys({ actions: [{ id: 'a', label: 'A', keys: ['KeyA'], run: () => {} }], storage: store, target: new EventTarget(), platform: 'other' });
  let told = 0; K.onChange(() => told++);
  assert.deepEqual(K.add({ id: 'late', label: 'LATE', keys: ['KeyL'], run: () => ran.push('late') }), ['late']);
  assert.deepEqual(K.chords('late'), ['KeyQ'], 'a saved binding for a row added later is read');
  assert.equal(told, 1, 'the listeners (hints, the help view) hear it');
  assert.deepEqual(K.add({ id: 'a', label: 'AGAIN', keys: ['KeyB'] }), [], 'an id already there is left alone');
  assert.ok(K.run('late') && ran[0] === 'late');
  assert.throws(() => K.add({ id: 'bad', keys: ['Ctrl'] }), /not a key/);
  K.destroy();
  pass('a modifier alone is refused at createKeys and add, naming the action; add() puts rows in later, with their saved keys');
}
{ /* a HELD action in a menu (INFORMATIONAL's hold-still in VIEW): a menu has no release, so its row latches (wave 19) */
  const log = [], target = new EventTarget();
  const K = createKeys({ actions: [{ id: 'info-hold', label: 'HOLD THE WORDS STILL', group: 'VIEW', keys: ['I'], run: () => log.push('hold'), up: () => log.push('let go') },
    { id: 'plain', label: 'PLAIN', keys: ['P'], run: () => log.push('plain') }], target, platform: 'other' });
  const [txt, fire] = K.menuItem('info-hold');
  assert.equal(txt, 'HOLD THE WORDS STILL\tI');
  fire(); assert.deepEqual(log, ['hold'], 'the first press holds'); fire(); assert.deepEqual(log, ['hold', 'let go'], 'the next lets it go');
  fire(); target.dispatchEvent(new Event('blur')); assert.deepEqual(log.slice(2), ['hold', 'let go'], 'leaving the page lets a menu-held one go too');
  K.menuItem('plain')[1](); K.menuItem('plain')[1](); assert.deepEqual(log.slice(4), ['plain', 'plain'], 'an action without up is a plain press each time');
  K.destroy();
  pass('a held action\'s menu row latches: press holds, press again lets go, leaving the page lets go');
}
{ /* undo / redo: one pair of ids and chords for every owner (history-list.js historyActions, the timeline's own rows) */
  const { EDIT_KEYS } = await import('../mir/shell/keys.js');
  const { historyActions } = await import('../mir/history/history-list.js');
  const { timelineActions } = await import('../mir/timeline/shortcuts.js');
  const h = historyActions({ undo: () => true, redo: () => true }, { doc: null }), t = timelineActions(() => null).filter((a) => a.id === 'undo' || a.id === 'redo');
  assert.deepEqual(h.map((a) => [a.id, a.keys]), [['undo', [...EDIT_KEYS.undo]], ['redo', [...EDIT_KEYS.redo]]]);
  assert.deepEqual(t.map((a) => [a.id, a.keys]), h.map((a) => [a.id, a.keys]), 'the timeline\'s pair is the same ids and chords');
  assert.ok(h.every((a) => a.inFields && a.repeat), 'inFields (a focused <select> still undoes the app; when() hands a text field its own undo), repeat');
  pass('undo and redo: one pair of ids and chords, the history\'s and the timeline\'s (shell/keys.js EDIT_KEYS)');
}
console.log(`\n${n} passed`);
