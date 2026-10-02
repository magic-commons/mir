/* starter/app.js — THE STARTER: the smallest whole MIR app.  ../LLM.md explains it section by section.
 * To make your own: copy this folder beside the kit (../mir, ../fonts), rename NAME and KEY, replace S and draw(),
 * and keep everything else.  The one rule: the kit draws every control; you pass it data and options. */
import { el, seg, trig } from '../mir/kit.js';
import { frame } from '../mir/core/frame.js';
import { createApp } from '../mir/app.js';
import { showPage } from '../mir/info/page.js';

// ── THE NAME: KEY names every store in this browser, so two apps never share one. Change both. ──
const NAME = 'STARTER', KEY = 'starter';
const stage = document.getElementById('stage'), canvas = document.getElementById('picture'), g = canvas.getContext('2d');

// ── THE NUMBERS: everything the picture is drawn from. Replace them with your game's. ──
const S = { speed: 0.5, size: 0.6, hue: 200, count: 7, spread: 0.25, shape: 'dot' };

// ── THE PICTURE: a 2D canvas drawn from S. Replace draw() with your game; keep the loop. ──
let turn = 0, last = 0, app = null;
function draw() {
  const dpr = devicePixelRatio || 1, w = stage.clientWidth, h = stage.clientHeight;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = document.body.dataset.theme === 'light' ? '#eef1f6' : '#070a0f'; g.fillRect(0, 0, w, h);
  const n = Math.round(S.count), R = Math.min(w, h) * 0.17 * S.size, r = Math.max(4, R * 0.18);
  for (let i = 0; i < n; i++) {
    const a = turn * Math.PI * 2 + (i / n) * Math.PI * 2, x = w / 2 + Math.cos(a) * R, y = h / 2 + Math.sin(a) * R;
    g.fillStyle = `hsl(${(S.hue + i * (360 / n) * S.spread) % 360} 80% 60%)`;
    if (S.shape === 'square') g.fillRect(x - r, y - r, 2 * r, 2 * r); else { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  }
}
/* the loop runs through the kit's one frame (core/frame.js), and only while the app's one clock plays: idle costs nothing */
function loop(now) {
  if (app && app.playing()) { turn += ((last ? now - last : 0) / 1000) * S.speed; last = now; frame.coalesce(KEY + ':loop', loop); } else last = 0;
  draw();
}
const kick = () => frame.coalesce(KEY + ':loop', loop);
addEventListener('resize', kick);

// ── THE APP: one call wires the look, the language, the keys, the transport bar, the rack, modulation, the pages,
//    the notebook, FOLDERS, the words on the picture, the menus and describe (../mir/app.js). Change the words. ──
const ring = () => { const R = Math.min(stage.clientWidth, stage.clientHeight) * 0.2; return { left: stage.clientWidth / 2 - R, top: stage.clientHeight / 2 - R, width: 2 * R, height: 2 * R }; };
app = await createApp({ name: NAME, key: KEY, version: '0.1.0', what: 'A ring of dots driven by five numbers.',
  about: { tagline: 'A ring of dots on MIR: the smallest whole app, to copy.', copyright: '© 2026' },
  stage, state: S, present: kick, thumbnail: () => canvas, subject: ring,
  pages: [{ title: 'LLM', md: await (await fetch('../LLM.md')).text(), shared: true },          // page 0: the greeting
    { title: 'Try this', md: '## Try this\nOpen PICTURE from the bar and drag a knob. Space plays.\n\n> [!mir|ui:size] SIZE\n> An LFO is driving this knob. Drag it: you move the centre of its swing.' }],
  menus: { EDIT: () => [['RESET THE PICTURE', reset]], VIEW: () => [app.keys.menuItem('transport.play'), ['THIS PAGE ON THE PICTURE', () => showPage(app.info, app.pages.get(app.notebook.selected) || app.pages.list()[1])]] } });
app.clock.onChange(kick); kick();

// ── THE PARAMETERS: app.param() makes one number a kit control, a modulation target and a saved value. ──
const speed = app.param('speed', 'SPEED', 0, 2);
const size = app.param('size', 'SIZE', 0.1, 1);
const hue = app.param('hue', 'HUE', 0, 360, { map: 'wrap', fmt: (v) => Math.round(v) + '°' });
const count = app.param('count', 'COUNT', 3, 24, { map: 'integer' });
function reset() { for (const p of app.params) p.set(p.home); S.shape = 'dot'; kick(); }

// ── THE RACK: windows by name; each opens from its latch on the bar. `build` runs the first time a window opens. ──
app.rack.register({ id: 'picture', title: 'PICTURE', side: 'right', open: !app.first, glyph: 'tune', hint: 'the four numbers the picture is drawn from',
  build(body) { el('div', 'row', body).append(speed.root, size.root, hue.root, count.root); } });
app.rack.register({ id: 'ring', title: 'RING', side: 'left', glyph: 'sliders', hint: 'built the first time it opens',
  build(body) {                                                       // a parameter made here becomes a target when it is built
    el('div', 'row', body).append(app.param('spread', 'SPREAD', 0, 1).root, trig({ label: 'RESET', title: 'every number back home', onFire: reset }).root);
    body.append(seg({ label: 'SHAPE', value: S.shape, options: [{ id: 'dot', label: 'DOTS' }, { id: 'square', label: 'SQUARES' }],
      onChange: (v) => { S.shape = v; kick(); } }).root);
  } });

// ── MODULATION: on a first run an LFO drives SIZE. The window opens from the MIR mark on the bar; its power is there too. ──
if (app.first) app.mod.route('lfo', 'app.size', 0.35);

window.__STARTER = { S, app };
