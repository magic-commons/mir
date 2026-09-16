/* shell-behaviour.mjs — what the shell DOES, which a picture cannot show: the probes behind MIR 1.3.0's shell.
 *
 *   node tools/shell-behaviour.mjs [url]      default http://127.0.0.1:8790/gallery/shell.html (npm run gallery)
 *
 * Desktop (1280 × 800): hover shows the bar · Escape closes it and gives the wordmark its focus back · a rackless
 * app has no rack gutter · J opens the notebook without typing into it, and a J typed in the notes stays there ·
 * NOTES keeps 640 px at a 1024 px window · the preview renders markdown and display maths with the kit's own marked
 * and KaTeX · ABOUT's default links resolve and are served · a javascript: link is dropped to text and an unsafe
 * home link is not built · destroy() removes the bar, the notebook and the opener's role, and the wordmark is inert.
 * Phone (390 × 844, touch, hover: none): the --phone sentinel is 1 · the bar is shown at idle · it is placed after
 * the wordmark's final width · rotated to 844 × 390 it is still a phone and the bar is still shown.
 * Exit 1 if any probe fails. */
import { launch, sleep } from './cdp.mjs';
const PAGE = process.argv[2] || 'http://127.0.0.1:8790/gallery/shell.html';
const results = [];
const check = (name, ok, detail = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const key = async (p, code, keyName, mods = 0) => {
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: keyName, text: keyName.length === 1 ? keyName : undefined, modifiers: mods });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: keyName, modifiers: mods });
};

{ // desktop
  const p = await launch({ width: 1280, height: 800 });
  try {
    await p.goto(PAGE, 2500);
    // Escape returns focus to the wordmark
    const t = JSON.parse(await p.eval(`JSON.stringify((() => { const b = document.getElementById('title').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })())`));
    await p.mouse(t[0], t[1]); await sleep(150);
    check('hover shows the bar', await p.eval(`!document.getElementById('menubar').hidden`));
    await p.eval(`document.querySelector('#menubar .mb-btn').click()`);
    await key(p, 'Escape', 'Escape'); await sleep(100);
    check('Escape closes the bar', await p.eval(`document.getElementById('menubar').hidden`));
    check('Escape gives focus back to the wordmark', await p.eval(`document.activeElement === document.getElementById('title')`), await p.eval(`document.activeElement.id || document.activeElement.tagName`));
    // the rackless gutter
    check('fresh app: wordmark sits 14 px in (no rack gutter)', await p.eval(`Math.round(document.getElementById('title').getBoundingClientRect().left) === 14`), await p.eval(`String(document.getElementById('title').getBoundingClientRect().left)`));
    // J opens the notebook and does not type a j into it
    await p.mouse(1270, 790); await p.eval(`document.activeElement.blur()`);
    await key(p, 'KeyJ', 'j'); await sleep(200);
    check('J opens the notebook', await p.eval(`!document.getElementById('notebook').hidden`));
    check('…without typing "j" into it', await p.eval(`document.querySelector('#notebook .nb-text').value === ''`), JSON.stringify(await p.eval(`document.querySelector('#notebook .nb-text').value`)));
    await key(p, 'KeyJ', 'j'); await sleep(150);
    check('J typed in the notes stays in the notes', await p.eval(`!document.getElementById('notebook').hidden && document.querySelector('#notebook .nb-text').value === 'j'`));
    // notes width at 1024 is not clamped by a rack gutter the app does not have
    await p.resize(1024, 768); await sleep(200);
    check('notes 640 wide at 1024 px (no rack clamp)', await p.eval(`Math.round(document.getElementById('notebook').getBoundingClientRect().width) === 640`), await p.eval(`String(document.getElementById('notebook').getBoundingClientRect().width)`));
    await p.resize(1280, 800);
    // preview renders markdown with the vendored marked + KaTeX
    await p.eval(`(__MIR_SHELL.parts.notebook.text = '# H\\n\\n- a\\n\\n$$x^2$$', __MIR_SHELL.parts.notebook.setMode('view'))`);
    for (let i = 0; i < 40 && !(await p.eval(`!!document.querySelector('#notebook .nb-view .katex-display')`)); i++) await sleep(150);
    check('preview: vendored marked renders a heading and a list', await p.eval(`!!document.querySelector('#notebook .nb-view h1') && !!document.querySelector('#notebook .nb-view li')`));
    check('preview: vendored KaTeX renders display maths', await p.eval(`!!document.querySelector('#notebook .nb-view .katex-display')`));
    // ABOUT: default links resolve from /gallery/, and an unsafe href is dropped
    await p.eval(`__MIR_SHELL.notebook('about')`); await sleep(200);
    const links = await p.eval(`JSON.stringify([...document.querySelectorAll('.nb-aboutface a')].map((a) => a.getAttribute('href')))`);
    check('ABOUT links point one folder up from the gallery', /\.\.\/LICENSE/.test(links) && /\.\.\/fonts\/Roboto-OFL\.txt/.test(links) && !/NOTICE/.test(links), links);
    const statuses = await p.eval(`Promise.all([...document.querySelectorAll('.nb-aboutface a')].filter((a) => !a.href.startsWith('https://')).map((a) => fetch(a.href).then((r) => r.status))).then((s) => JSON.stringify(s))`);
    check('…and they are served (no 404)', !/404/.test(statuses), statuses);
    const unsafe = await p.eval(`(async () => { const m = await import(new URL('../mir/shell/about.js', location.href).href); const d = document.createElement('div'); m.richText(d, ['x ', ['bad', 'java' + 'script:alert(1)'], ' ', ['ok', 'https://example.com/']]); return JSON.stringify({ html: d.innerHTML, home: (() => { const f = document.createElement('div'); m.aboutFace(f, { name: 'T', home: { href: ' javascript:alert(1)' } }); return !!f.querySelector('.ab-home'); })() }); })()`);
    check('javascript: link dropped to text, https kept; unsafe home link not built', /bad/.test(unsafe) && !/javascript/.test(unsafe) && /example\.com/.test(unsafe) && /"home":false/.test(unsafe), unsafe);
    // destroy removes nodes and listeners
    const d = await p.eval(`(() => { const P = __MIR_SHELL.parts; P.menubar.destroy(); P.notebook.destroy(); return JSON.stringify({ bar: !!document.getElementById('menubar'), nb: !!document.getElementById('notebook'), role: document.getElementById('title').getAttribute('role') }); })()`);
    check('destroy() removes the bar, the notebook and the opener role', d === JSON.stringify({ bar: false, nb: false, role: null }), d);
    const t2 = JSON.parse(await p.eval(`JSON.stringify((() => { const b = document.getElementById('title').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })())`));
    await p.mouse(t2[0], t2[1]); await sleep(150);
    check('…and hovering the wordmark after destroy throws nothing', !p.logs.some((l) => /EXCEPTION/.test(l)), p.logs.join(' | '));
  } finally { await p.close(); }
}
{ // phone
  const p = await launch({ width: 390, height: 844 });
  try {
    await p.phone(390, 844);
    await p.goto(PAGE, 3000);
    check('phone: --phone sentinel is 1', await p.eval(`getComputedStyle(document.documentElement).getPropertyValue('--phone').trim() === '1'`));
    check('phone: the bar is shown at idle', await p.eval(`!document.getElementById('menubar').hidden`));
    const place = await p.eval(`(() => { const t = document.getElementById('title'), b = document.getElementById('menubar'); return JSON.stringify({ want: t.getBoundingClientRect().left + t.offsetWidth + 8, got: b.getBoundingClientRect().left }); })()`);
    const pl = JSON.parse(place);
    check('phone: the bar is placed after the wordmark\'s final width', Math.abs(pl.want - pl.got) < 0.5, place);
    await p.phone(844, 390); await sleep(400);
    check('phone rotated to landscape (844×390): still a phone, bar still shown', await p.eval(`getComputedStyle(document.documentElement).getPropertyValue('--phone').trim() === '1' && !document.getElementById('menubar').hidden`));
  } finally { await p.close(); }
}
console.log(results.join('\n'));
const ok = results.every((r) => r.startsWith('PASS'));
console.log(ok ? '\nALL PASS' : '\nSOME FAIL');
process.exit(ok ? 0 : 1);
