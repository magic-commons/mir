/* notebook-render.node.mjs — A NOTE'S PICTURE IS THIS ORIGIN'S OR ITS OWN BYTES (1.6.0-alpha.5, mir/shell/notebook-render.js
 * notebookImage): the one question the sanitizer asks of an IMG's src, with no page.  The sanitizer itself (the IMG replaced by
 * its alt, `referrerpolicy` and `loading` on a kept one) is proven in a real page by tests/notebook.browser.mjs. */
import assert from 'node:assert/strict';
import { notebookImage } from '../mir/shell/notebook-render.js';

const BASE = 'https://app.example/lab/index.html', ORIGIN = 'https://app.example';
const ok = (src) => notebookImage(src, BASE, ORIGIN);
let n = 0;
const pass = (name) => { n++; console.log(`PASS ${name}`); };

for (const src of ['img/a.png', './a.png', '../a.png', '/a.png', 'https://app.example/a.png', 'HTTPS://APP.EXAMPLE/a.png', ' \n/a.png '])
  assert.equal(ok(src), true, 'this origin: ' + JSON.stringify(src));
pass('a picture this origin serves loads (relative, rooted, absolute, any case, padded)');

for (const src of ['data:image/png;base64,AAAA', 'DATA:IMAGE/webp;base64,AAAA', 'data:image/svg+xml,%3Csvg/%3E'])
  assert.equal(ok(src), true, 'own bytes: ' + src);
pass('a picture written into the note (data:image/…) loads');

for (const src of ['https://tracker.example/p.gif', 'http://app.example/a.png', 'https://app.example:8443/a.png', '//tracker.example/p.gif',
  '\\\\tracker.example\\p.gif', 'https://app.example@tracker.example/p.gif', 'https://app.example.tracker.example/p.gif', ' https://tracker.example/p.gif',
  'ht\ntps://tracker.example/p.gif'])
  assert.equal(ok(src), false, 'another origin: ' + JSON.stringify(src));
pass('another host, scheme or port does not load (protocol-relative, backslashes, userinfo, a look-alike host, a split scheme)');

for (const src of ['data:text/html,<script>1</script>', 'data:,x', 'blob:https://app.example/1b9d6bcd', 'file:///etc/passwd', 'javascript:alert(1)',
  'vbscript:x', 'ftp://app.example/a.png', '', null, undefined])
  assert.equal(ok(src), false, 'not a picture road: ' + JSON.stringify(src));
pass('data that is not an image, blob:, file:, javascript:, another scheme and no src at all do not load');

assert.equal(notebookImage('a.png', 'file:///home/x/index.html', 'null'), false);
pass('a page opened from a file has no origin to match');
console.log(`ALL ${n} notebook-render checks passed`);
