// The recorder and its RENDER panel, in a real browser (tests/fixtures/render.html: a 2D picture, the modulation, the timeline with a
// ramp clip on SIZE, FOLDERS holding the RENDER panel, the same rows in a rack card).  Real pointer events, every press hit-tested with
// elementFromPoint.  A 12-frame PNG render of the timeline's ACTIVE range gives 12 frames whose content follows the beat exactly, twice,
// byte for byte; the same with the page hidden; the preflight reports; MP4 runs when WebCodecs has an H.264 encoder here (and says so when
// it does not); an interrupted run keeps its completed frames; Escape cancels and the live rack comes back; the page's input is the
// run's while it runs.
// MIR_BASE=http://127.0.0.1:8852/ node tests/render.browser.mjs
import { openTimeline, ledger } from './timeline-rig.mjs';

const { page, errors, close } = await openTimeline({ page: 'tests/fixtures/render.html', query: '', width: 1280, height: 900 });
const L = ledger('render');
const at = (sel) => page.evaluate((sel) => { const n = document.querySelector(sel); if (!n) return null; const r = n.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, h = document.elementFromPoint(x, y);
  return { x, y, hit: !!h && (h === n || n.contains(h)), got: h ? h.tagName + '.' + String(h.className).slice(0, 40) : null }; }, sel);
const press = async (sel, label = sel) => {
  await page.evaluate((sel) => { const n = document.querySelector(sel); if (n) n.scrollIntoView({ block: 'center' }); }, sel);   // the panel scrolls inside the window
  await page.waitForTimeout(60);
  const c = await at(sel);
  if (!c) { L.ck(false, 'there is a ' + label, null); return false; }
  if (!c.hit) { L.ck(false, label + ' is what a hand presses at its centre (elementFromPoint)', c); return false; }
  await page.mouse.click(c.x, c.y); return true;
};
const waitFor = async (fn, ms = 20000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await page.waitForTimeout(100); } return false; };
const setSelect = (sel, value) => page.evaluate(([sel, value]) => { const s = document.querySelector(sel); s.value = value; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; }, [sel, value]);
const FRAMES = 12;
try {
  /* ── 0 · the page, and what this browser can do ── */
  const caps = await page.evaluate(() => ({ webcodecs: typeof VideoEncoder === 'function', decoder: typeof VideoDecoder === 'function', opfs: !!(navigator.storage && navigator.storage.getDirectory), secure: isSecureContext }));
  L.ck(caps.opfs && caps.secure, 'the origin-private file system is there (the store runs on disk)', caps);

  /* ── 1 · THE ACTIVE RANGE rides the project (row 108) ── */
  const ranged = await page.evaluate(async () => {
    const R = window.__R, ed = R.tl.editor, m = R.tl.model;
    ed.setActiveRange({ start: 1, end: 1.8 });
    const saved = JSON.parse(JSON.stringify(m.serialize()));
    m.restore(null); const cleared = ed.activeRange();
    m.restore(saved); const back = ed.activeRange();
    return { saved: saved.active, cleared, back, signatureHasIt: m.signature().includes('"active"') };
  });
  L.ck(ranged.saved && ranged.saved.start === 1 && ranged.saved.end === 1.8 && ranged.cleared === null && ranged.back && ranged.back.end === 1.8 && ranged.signatureHasIt,
    'the active range is in the saved arrangement, is gone with the project, and comes back with it', ranged);

  /* …and the ACTIVE button on the TIMELINE's toolbar sets it with a hand: no range chosen marks the whole arrangement, again clears it */
  await page.evaluate(() => { window.__R.tl.editor.setActiveRange(null); window.__R.tl.open(); });
  await page.waitForTimeout(700);
  L.ck(await press('.mir-timeline button[data-mode="active"]', 'ACTIVE'), 'ACTIVE (the timeline toolbar) was pressed');
  await page.waitForTimeout(150);
  const marked = await page.evaluate(() => ({ range: window.__R.tl.editor.activeRange(), band: !!document.querySelector('.mir-timeline .tl-active'), pressed: document.querySelector('.mir-timeline button[data-mode="active"]').getAttribute('aria-pressed') }));
  L.ck(marked.range && marked.range.start === 0 && marked.range.end === 4 && marked.band && marked.pressed === 'true', 'ACTIVE marks the whole arrangement (0 → 4), draws its band and lights', marked);
  await press('.mir-timeline button[data-mode="active"]', 'ACTIVE (again)');
  await page.waitForTimeout(150);
  L.ck((await page.evaluate(() => window.__R.tl.editor.activeRange())) === null, 'pressed again on the same span it clears', null);
  await page.evaluate(() => { window.__R.tl.editor.setActiveRange({ start: 1, end: 1.8 }); window.__R.tl.close(); });
  await page.waitForTimeout(400);

  /* ── 2 · FOLDERS holds the RENDER panel; its rows are what a hand presses ── */
  await page.evaluate(() => { window.__R.folders.open(); window.__R.folders.tab('render'); });
  await page.waitForTimeout(500);
  const seated = await page.evaluate(() => { const f = window.__R.folders; return { tab: f.activeTab(), panel: !!f.win.root.querySelector('.mir-render'), chip: !!document.querySelector('[data-mir-chip="render"]'), view: !!window.__R.panel.view() }; });
  L.ck(seated.tab === 'render' && seated.panel && seated.chip && seated.view, 'FOLDERS seats the RENDER panel with its chip on the rail', seated);
  const W = '.mir-folders .mir-render ';
  await setSelect(W + 'select[data-t-aria="Recording motion"]', 'timeline-active');
  await setSelect(W + 'select[data-t-aria="Recording format"]', 'png');
  await setSelect(W + 'select[data-t-aria="Recording resolution"]', 'current');
  await page.waitForTimeout(150);
  const est = await page.evaluate((w) => document.querySelector(w + '.sr-record-estimate').textContent, W);
  L.ck(/128 × 72/.test(est) && new RegExp('\\b' + FRAMES + ' frames').test(est) && /beats 1 → 1\.8 at 120 BPM/.test(est) && /numbered lossless PNG frames/.test(est), 'the estimate reads the active range: size, 12 frames, the beats and the tempo', est);
  const rowOrder = await page.evaluate((w) => [...document.querySelectorAll(w + '.sr-film .sr-row:not([hidden]) > .sr-label')].filter((n) => !n.closest('.sr-motion-ui[hidden]')).map((n) => n.textContent.trim()), W);
  L.ck(rowOrder.join('|') === 'motion|format|size|fps|modulation|timeline', 'the film rows are BASINS\' (a timeline motion has no length or start: the range is both)', rowOrder);

  /* ── 3 · RENDER, pressed: 12 frames, the content follows the beat exactly ── */
  const before = await page.evaluate(() => { const R = window.__R, c = R.mod.host.clock; return { playing: c.isPlaying(), running: c.isRunning(), beats: R.mod.host.model.transport.beats, size: R.S.size, hue: R.S.hue, enabled: c.isEnabled(), mod: c.isModulationEnabled() }; });
  await page.evaluate(() => { window.__R.slow.frames.length = 0; window.__saved.length = 0; });
  L.ck(await press(W + '.sr-film > .sv-primary.trig', 'RENDER'), 'RENDER was pressed');
  const done = await waitFor((w) => !document.querySelector(w + '.sr-done').hidden, 30000, W);
  const status = await page.evaluate((w) => ({ note: document.querySelector(w + '.sr-done .sv-note').textContent, files: [...document.querySelectorAll(w + '.sr-done .trig .trig-l')].map((n) => n.textContent), status: document.querySelector(w + '.sr-record-status').textContent }), W);
  L.ck(done && status.files.length === 2 && /^SAVE mirtest-frames-.*\.zip/.test(status.files[0]) && /DISCARD RENDER/.test(status.files[1]) && /Complete · 12 frames/.test(status.note) && /stored on disk/.test(status.note), 'the run completes: SAVE …zip, DISCARD RENDER, "Complete · 12 frames", stored on disk', status);
  const seen = await page.evaluate(() => window.__R.slow.frames.map((f) => ({ frame: f.frame, beat: +f.beat.toFixed(9) })));
  L.ck(seen.length === FRAMES && seen[0].frame === 15 && seen[FRAMES - 1].frame === 26 && seen.every((f, i) => Math.abs(f.beat - (15 + i) / 15) < 1e-9), 'the frames are 15…26 (the seek stepped the clock to beat 1), each exactly 1/15 beat on', seen.slice(0, 3));
  const after = await page.evaluate(() => { const R = window.__R, c = R.mod.host.clock; return { playing: c.isPlaying(), running: c.isRunning(), beats: R.mod.host.model.transport.beats, size: R.S.size, hue: R.S.hue, enabled: c.isEnabled(), mod: c.isModulationEnabled(), busy: R.rec.running(), guard: window.__probe || 0 }; });
  L.ck(JSON.stringify({ ...after, busy: undefined, guard: undefined }) === JSON.stringify({ ...before, busy: undefined, guard: undefined }) && after.busy === false, 'the live rack is where it was after the run (transport, power, beat, the parameters)', { before, after });
  L.ck(await press(W + '.sr-done .trig', 'SAVE …zip'), 'SAVE …zip was pressed');
  await page.waitForTimeout(200);
  const zip1 = await page.evaluate(async () => {
    const { readStoredZip } = await import('/mir/core/zip.js');
    const s = window.__saved[0]; if (!s) return null;
    const files = readStoredZip(new Uint8Array(await s.blob.arrayBuffer()));
    const names = [...files.keys()];
    const widths = [], digests = [];
    for (const n of names.filter((x) => x.endsWith('.png'))) {
      const bytes = files.get(n);
      digests.push([...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].slice(0, 8).join('.'));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' })), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const g = c.getContext('2d'); g.drawImage(bmp, 0, 0); const d = g.getImageData(0, 14, bmp.width, 1).data;
      let k = 1; while (k < bmp.width && d[k * 4] > 200) k++; widths.push(k - 1);
    }
    return { name: s.name, names, widths, digests, rec: JSON.parse(new TextDecoder().decode(files.get('recording.json'))) };
  });
  const doneState = await page.evaluate(() => window.__R.panel.view().state());
  L.ck(doneState.done && /^mirtest-frames-.*\.zip$/.test(doneState.done.name) && doneState.done.bytes > 0 && doneState.plan && doneState.plan.frames === FRAMES && doneState.plan.range && doneState.plan.range.start === 1
    && doneState.motions.some(([id, name]) => id === 'sweep' && name === 'SWEEP') && doneState.running === false && doneState.held === null,
    'view.state() has the finished film, the plan, the motion list and no held picture (BASINS\' rigs read them)', { done: doneState.done, plan: doneState.plan, motions: doneState.motions });
  L.ck(zip1 && zip1.names.filter((n) => n.endsWith('.png')).length === FRAMES && zip1.names[0] === 'frame_000000.png' && zip1.names.includes('recording.json'), 'the saved ZIP holds 12 numbered PNG frames and recording.json', zip1 && zip1.names);
  const want = Array.from({ length: FRAMES }, (_, i) => Math.round(((15 + i) / 15 / 4) * (128 - 2)));
  L.ck(zip1 && zip1.widths.every((w, i) => Math.abs(w - want[i]) <= 1) && new Set(zip1.widths).size > 8, 'frame i shows the arrangement at its beat: the bar\'s length follows the ramp exactly (±1 px)', { got: zip1 && zip1.widths, want });
  L.ck(zip1 && zip1.rec.motion === 'timeline' && zip1.rec.rangeKind === 'active' && zip1.rec.range.start === 1 && zip1.rec.range.end === 1.8 && zip1.rec.frames === FRAMES && zip1.rec.rendererVersion === 1 && zip1.rec.kind === 'mirtest-deterministic-png', 'recording.json says what was rendered (BASINS\' manifest fields)', zip1 && { ...zip1.rec, rack: undefined, arrangement: undefined, frozenValues: undefined, signature: undefined });

  /* ── 4 · repeatable to the bit: the same render again, and with the page's clock hidden ── */
  const digestsOf = (opts) => page.evaluate(async (opts) => {
    const { readStoredZip } = await import('/mir/core/zip.js');
    const R = window.__R, res = await R.rec.run(opts), out = [];
    for (const f of res.files) { const z = readStoredZip(new Uint8Array(await f.blob.arrayBuffer())); for (const [n, b] of z) if (n.endsWith('.png')) out.push(n + ':' + [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].slice(0, 8).join('.')); }
    await R.rec.discard(res);
    return out;
  }, opts);
  const O = { motion: 'timeline-active', format: 'png', size: { w: 128, h: 72 }, fps: 30, modulation: false, timeline: true };
  const again = await digestsOf(O);
  L.ck(again.length === FRAMES && again.every((d, i) => d.split(':')[1] === zip1.digests[i]), 'a second render of the same range is the same bytes, frame for frame', { n: again.length });
  await page.evaluate(() => { window.__R.mod.host.clock.setHidden(true); });
  const hid = await digestsOf(O);
  await page.evaluate(() => { window.__R.mod.host.clock.setHidden(false); });
  L.ck(hid.length === FRAMES && hid.every((d, i) => d === again[i]), 'a render started while the clock is hidden gives the same frames as one started visible', { n: hid.length });
  const wake = await page.evaluate(async (O) => { const R = window.__R; window.__wake.length = 0; const run = R.rec.run(O); const sync = [...window.__wake]; const res = await run; await R.rec.discard(res); return { sync, after: [...window.__wake] }; }, O);
  L.ck(wake.sync.join() === 'render' && wake.after.join() === 'render,release', 'the screen is held awake from inside the tap (before the first await) and let go when the run ends', wake);
  const still = await digestsOf({ motion: 'still', format: 'png', size: { w: 128, h: 72 }, fps: 30, durationS: 0.2, modulation: false, timeline: false });
  L.ck(still.length === 6 && new Set(still.map((d) => d.split(':')[1])).size === 1, 'STILL with modulation and timeline off freezes the look: six identical frames', still);
  const lead = await digestsOf({ motion: 'still', format: 'png', size: { w: 128, h: 72 }, fps: 30, durationS: 0.2, modulation: false, timeline: true });
  L.ck(lead.length === 6 && new Set(lead.map((d) => d.split(':')[1])).size > 1, 'STILL with the timeline ON plays the arrangement from beat zero (the bar grows)', lead);

  /* ── 4b · an app's own motion (BASINS: ZOOM): registered as data, its rows shown only while it is chosen, its view handed to the frame ── */
  await page.evaluate(() => { window.__R.folders.open(); window.__R.folders.tab('render'); });
  await page.waitForTimeout(400);
  const hiddenUi = await page.evaluate((w) => document.querySelector(w + '.sr-motion-ui').hidden, W);
  await setSelect(W + 'select[data-t-aria="Recording motion"]', 'sweep');
  await page.waitForTimeout(100);
  const shownUi = await page.evaluate((w) => ({ hidden: document.querySelector(w + '.sr-motion-ui').hidden, length: !document.querySelector(w + '.sr-record-time[type="number"]:not(.sweep-amount)').closest('.sr-row').hidden, est: document.querySelector(w + '.sr-record-estimate').textContent }), W);
  L.ck(hiddenUi === true && shownUi.hidden === false && shownUi.length && /sweep 0\.5/.test(shownUi.est), 'the app motion\'s rows appear when it is chosen (and the length and start rows with them), and add to the estimate', { hiddenUi, shownUi });
  await page.evaluate(() => { const r = window.__R; r.slow.frames.length = 0; window.__saved.length = 0; });
  await setSelect(W + 'select[data-t-aria="Recording format"]', 'png');
  await setSelect(W + 'select[data-t-aria="Recording resolution"]', 'current');
  await page.evaluate(() => { const d = [...document.querySelectorAll('.mir-folders .sr-record-time:not(.sweep-amount)')]; d[0].value = '0.2'; d[0].dispatchEvent(new Event('change', { bubbles: true })); });   // length: 0.2 s = 6 frames
  L.ck(await press(W + '.sr-film > .sv-primary.trig', 'RENDER (SWEEP)'), 'RENDER was pressed for SWEEP');
  await waitFor((w) => !document.querySelector(w + '.sr-done').hidden, 30000, W);
  const sweep = await page.evaluate(async () => {
    const { readStoredZip } = await import('/mir/core/zip.js');
    await new Promise((r) => setTimeout(r, 100));
    const R = window.__R, res = await R.rec.recoveries(); const job = res.sort((a, b) => b.store.manifest.at - a.store.manifest.at)[0];
    const f = job.files[0], files = readStoredZip(new Uint8Array(await f.blob.arrayBuffer())), xs = [];
    for (const n of [...files.keys()].filter((x) => x.endsWith('.png'))) {
      const bmp = await createImageBitmap(new Blob([files.get(n)], { type: 'image/png' })), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const g = c.getContext('2d'); g.drawImage(bmp, 0, 0); const d = g.getImageData(0, 52, bmp.width, 1).data; let x = -1; for (let k = 0; k < bmp.width; k++) if (d[k * 4] > 200 && d[k * 4 + 1] < 60) { x = k; break; }
      xs.push(x);
    }
    const spec = JSON.parse(new TextDecoder().decode(files.get('recording.json')));
    await job.store.discard();
    return { xs, motion: spec.motion, options: spec.motionOptions, motionSpec: spec.motionSpec, frames: spec.frames };
  });
  const wantX = Array.from({ length: sweep.frames }, (_, i) => 1 + Math.round(i / Math.max(1, sweep.frames - 1) * 0.5 * 126));
  L.ck(sweep.motion === 'sweep' && sweep.frames === 6 && sweep.xs.every((x, i) => Math.abs(x - wantX[i]) <= 1) && sweep.options.amount === 0.5 && sweep.motionSpec.amount === 0.5,
    'the app motion\'s view reaches the frame: the marker sweeps 0 → 0.5 of the width over 6 frames, and the manifest keeps its options', sweep);
  await setSelect(W + 'select[data-t-aria="Recording motion"]', 'timeline-active');

  /* ── 5 · the preflight and the self-test report; MP4 when this browser can ── */
  const pre = await page.evaluate(async () => { const p = await window.__R.rec.encoderPath({ motion: 'timeline-active', format: 'mp4', size: { w: 128, h: 72 }, fps: 30 }); return { kind: p.kind, codec: p.codec || null, why: p.why }; });
  L.ck(pre.kind === 'webcodecs' || pre.kind === 'none', 'the encoder path is decided and said: ' + pre.kind + (pre.codec ? ' ' + pre.codec : ''), pre);
  L.ck(await press(W + '.sr-check .trig', 'RUN SELF-TEST'), 'RUN SELF-TEST was pressed');
  const selfTest = await waitFor((w) => /stages/.test(document.querySelector(w + '.sr-lines').textContent), 90000, W);
  const lines = await page.evaluate((w) => document.querySelector(w + '.sr-lines').textContent, W);
  const stagesFailed = lines.split('\n').filter((l) => /^ {2}FAIL /.test(l));
  L.ck(selfTest && /selftest\s+\d+\/\d+ stages/.test(lines), 'RUN SELF-TEST prints its stages', lines.split('\n').slice(0, 3));
  L.ck(!stagesFailed.some((l) => /PNG encode|file can be offered|temporary file storage|frame source/.test(l)), 'the PNG, file-offer, store and frame-source stages pass here', stagesFailed);
  console.log('  self-test:', lines.split('\n').slice(0, 1).join(' '), stagesFailed.length ? '\n  ' + stagesFailed.join('\n  ') : '');

  let mp4 = { ran: false };
  if (pre.kind === 'webcodecs' && caps.decoder) {
    mp4 = await page.evaluate(async () => {
      const { mp4Parse } = await import('/mir/render/mp4.js');
      const R = window.__R; R.slow.frames.length = 0;
      let res; try { res = await R.rec.run({ motion: 'timeline-active', format: 'mp4', size: { w: 128, h: 72 }, fps: 30, modulation: false, timeline: true }); } catch (e) { return { ran: true, error: String(e.message || e) }; }
      const f = res.files[0], bytes = new Uint8Array(await f.blob.arrayBuffer()), parsed = mp4Parse(bytes);
      await R.rec.discard(res);
      return { ran: true, name: f.name, ftyp: String.fromCharCode(...bytes.slice(4, 8)), ok: parsed.ok, samples: parsed.sampleCount, delta: parsed.sampleDelta, timescale: parsed.timescale, duration: parsed.duration, bitrate: res.bitrate, frames: res.frames };
    });
    L.ck(mp4.ran && !mp4.error && mp4.ftyp === 'ftyp' && mp4.ok && mp4.samples === FRAMES && mp4.timescale === 90000 && mp4.duration === FRAMES * 3000, 'an MP4 of the same range: a valid file of 12 samples, 0.4 s exactly (the preflight passed)', mp4);

    /* an interrupted MP4 keeps its completed frames: cancelled after the checkpoint at 2 s of video */
    const cutRun = () => page.evaluate(async () => {
      const R = window.__R; R.slow.frames.length = 0; R.slow.ms = 20;
      R.tl.editor.setActiveRange({ start: 0, end: 8 });                              // 8 beats at 120 BPM and 30 fps: 120 frames
      const run = R.rec.run({ motion: 'timeline-active', format: 'mp4', size: { w: 128, h: 72 }, fps: 30, modulation: false, timeline: true });
      const t0 = performance.now(); while (R.slow.frames.length < 80 && performance.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 25));
      R.rec.cancel(); let err = ''; try { await run; } catch (e) { err = e.message; }
      R.slow.ms = 0;
      const jobs = (await R.rec.recoveries()).filter((j) => j.store.manifest.state === 'rendering');
      return { err, frames: R.slow.frames.length, jobs: jobs.map((j) => ({ id: j.store.id, frames: j.frames, files: j.files.length })), state: R.rec.state().phase };
    });
    const cut = await cutRun();
    L.ck(/cancelled/.test(cut.err) && cut.state === 'cancelled' && cut.jobs.length === 1 && cut.jobs[0].frames === 60, 'cancelled after frame 80: the store holds the 60 frames of the checkpoint', cut);
    await page.evaluate(() => { window.__R.panel.view().paint(); });
    await waitFor((w) => /RECOVER COMPLETED FRAMES/.test(document.querySelector(w + '.sr-film > .sr-record-files').textContent), 8000, W);
    const rows = await page.evaluate((w) => [...document.querySelectorAll(w + '.sr-film > .sr-record-files .trig .trig-l')].map((n) => n.textContent), W);
    L.ck(rows.includes('RECOVER COMPLETED FRAMES') && rows.includes('RESUME WITH MATCHING PROJECT') && rows.includes('DISCARD STORED RENDER'), 'the panel offers RECOVER COMPLETED FRAMES, RESUME WITH MATCHING PROJECT and DISCARD STORED RENDER', rows);
    await page.evaluate(() => { window.__saved.length = 0; });
    const recBtn = await page.evaluate((w) => { const b = [...document.querySelectorAll(w + '.sr-film > .sr-record-files .trig')].find((n) => /RECOVER/.test(n.textContent)); b.dataset.t1 = 'recover'; return true; }, W);
    L.ck(recBtn && await press(W + '.sr-film > .sr-record-files .trig[data-t1="recover"]', 'RECOVER COMPLETED FRAMES'), 'RECOVER COMPLETED FRAMES was pressed');
    await waitFor(() => window.__saved.length > 0, 8000);
    const rcv = await page.evaluate(async () => {
      const { mp4Parse } = await import('/mir/render/mp4.js'); const s = window.__saved[0]; if (!s) return null;
      const bytes = new Uint8Array(await s.blob.arrayBuffer()), p = mp4Parse(bytes); return { name: s.name, ok: p.ok, samples: p.sampleCount };
    });
    L.ck(rcv && rcv.name === 'mirtest-recovered-partial.mp4' && rcv.ok && rcv.samples === 60, 'the recovered file is a valid MP4 of the 60 completed frames', rcv);
    /* RESUME: a second interrupted run, the same project; the render goes on from frame 60 and ends with all 120 */
    const cut2 = await cutRun();
    const resumed = await page.evaluate(async () => {
      const { mp4Parse } = await import('/mir/render/mp4.js'); const R = window.__R;
      const [job] = (await R.rec.recoveries()).filter((j) => j.store.manifest.state === 'rendering');
      if (!job) return { error: 'no job to resume' };
      R.slow.frames.length = 0;
      let res; try { res = await R.rec.recover(job, {}); } catch (e) { return { error: String(e.message || e) }; }
      const f = res.files[res.files.length - 1], bytes = new Uint8Array(await f.blob.arrayBuffer()), p = mp4Parse(bytes);
      await R.rec.discard(res);
      return { from: R.slow.frames[0] && R.slow.frames[0].frame, count: R.slow.frames.length, samples: p.sampleCount, ok: p.ok, frames: res.frames, beat0: R.slow.frames[0] && +R.slow.frames[0].beat.toFixed(6) };
    });
    L.ck(cut2.jobs.length === 1 && !resumed.error && resumed.from === 60 && resumed.count === 60 && resumed.ok && resumed.samples === 120 && resumed.beat0 === 4, 'RESUME WITH MATCHING PROJECT renders frames 60…119 (beat 4 on) and finishes one MP4 of all 120', { cut2, resumed });
    /* a changed project refuses a resume (the signature) */
    const cut3 = await cutRun();
    const refused = await page.evaluate(async () => {
      const R = window.__R; const [job] = (await R.rec.recoveries()).filter((j) => j.store.manifest.state === 'rendering');
      R.mod.host.clock.setBpm(90);
      let err = ''; try { await R.rec.recover(job, {}); } catch (e) { err = e.message; }
      R.mod.host.clock.setBpm(120); await job.store.discard();
      return err;
    });
    L.ck(cut3.jobs.length === 1 && /colours, rack or parameter bases changed/.test(refused), 'a resume against a changed project (the tempo) is refused with a sentence', refused);
    await page.evaluate(() => { window.__R.tl.editor.setActiveRange({ start: 1, end: 1.8 }); });
  } else console.log('  MP4: not run — this browser has no H.264 encoder/decoder path (' + JSON.stringify(pre) + ')');

  /* a changed project refuses a resume: cut a PNG run short (PNG has no checkpoint but the part), so use the store directly */
  /* ── 6 · the run owns the page's input; Escape cancels; CANCEL works; the live rack comes back ── */
  await page.evaluate(() => { const R = window.__R; R.slow.ms = 60; R.slow.frames.length = 0; window.__probe = 0; });
  await setSelect(W + 'select[data-t-aria="Recording format"]', 'png');
  L.ck(await press(W + '.sr-film > .sv-primary.trig', 'RENDER (slow)'), 'RENDER was pressed again');
  await waitFor(() => window.__R.slow.frames.length > 2, 8000);
  const running = await page.evaluate((w) => ({ busy: window.__R.rec.running(), prog: !document.querySelector(w + '.sr-prog').hidden, text: document.querySelector(w + '.sr-prog .sr-value').textContent, renderDisabled: document.querySelector(w + '.sr-film > .sv-primary.trig').disabled }), W);
  L.ck(running.busy && running.prog && /prepare|encoder|seek|capture|resolve/.test(running.text) && running.renderDisabled, 'while it runs: progress shows, RENDER is disabled', running);
  await press('#probe', 'the page\'s own button');
  await page.waitForTimeout(150);
  const swallowed = await page.evaluate(() => window.__probe || 0);
  L.ck(swallowed === 0, 'a press on the page during the run never reaches it (the run owns the input)', swallowed);
  const cancelHit = await at(W + '.sr-prog [data-render-cancel]');
  L.ck(cancelHit && cancelHit.hit, 'CANCEL is hit-testable and reachable while the input is held', cancelHit);
  await press(W + '.sr-prog [data-render-cancel]', 'CANCEL');
  await waitFor(() => !window.__R.rec.running(), 8000);
  const cancelled = await page.evaluate((w) => ({ status: document.querySelector(w + '.sr-record-status').textContent, phase: window.__R.rec.state().phase, said: window.__said.slice(-1)[0] }), W);
  L.ck(/Render cancelled/.test(cancelled.status) && cancelled.phase === 'cancelled', 'CANCEL ends the run and says so', cancelled);
  await page.evaluate(() => { document.getElementById('probe').click(); });
  L.ck((await page.evaluate(() => window.__probe || 0)) === 1, 'and the page\'s input is the page\'s again (the guard is gone)', null);
  /* Escape */
  await page.evaluate(() => { window.__R.slow.frames.length = 0; window.__R.panel.view().controls.renderBtn.click(); });
  await waitFor(() => window.__R.slow.frames.length > 2, 8000);
  await page.keyboard.press('Escape');
  await waitFor(() => !window.__R.rec.running(), 8000);
  L.ck(await page.evaluate(() => window.__R.rec.state().phase === 'cancelled'), 'Escape cancels a run', null);
  const restored = await page.evaluate(() => { const R = window.__R, c = R.mod.host.clock; return { playing: c.isPlaying(), running: c.isRunning(), beats: R.mod.host.model.transport.beats, size: R.S.size, hue: R.S.hue, enabled: c.isEnabled(), mod: c.isModulationEnabled() }; });
  L.ck(JSON.stringify(restored) === JSON.stringify(before), 'after a cancel the live rack is where it was', { before, restored });
  await page.evaluate(() => { window.__R.slow.ms = 0; });
  const leftover = await page.evaluate(async () => (await window.__R.rec.recoveries()).length);
  console.log('  stored renders left after the cancels:', leftover);

  /* ── 7 · the same rows in the rack card ── */
  const card = await page.evaluate(() => { const v = document.querySelector('#rackcard .mir-render'); return v ? { seat: v.dataset.seat, est: v.querySelector('.sr-record-estimate').textContent, title: document.querySelector('#rackcard .dev-title').textContent } : null; });
  L.ck(card && card.seat === 'card' && /frames/.test(card.est) && card.title === 'RENDER', 'the rack card holds the same rows (data-seat="card")', card);
  await page.evaluate(() => { window.__R.folders.close(); });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#rackcard .sr-film > .sv-primary.trig').scrollIntoView({ block: 'center' }));
  const cardBtn = await at('#rackcard .sr-film > .sv-primary.trig');
  L.ck(cardBtn && cardBtn.hit, 'the card\'s RENDER is what a hand presses (elementFromPoint)', cardBtn);
  await page.screenshot({ path: '.tmp/W13/R/render-card.png' });

  /* ── 7b · BASINS parity, round seven: the second card wears BASINS' options ── */
  const C2 = '#rackcard .dev[data-id="rackRender2"] .mir-render ';
  const opened = await page.evaluate((c) => { const v = document.querySelector(c), d = v.closest('.dev');
    const rows = [...v.querySelectorAll('.sr-film .sr-row:not(.sr-prog) > .sr-label')].filter((n) => !n.closest('[hidden]')).map((n) => n.textContent.trim());
    return { motion: v.querySelector('select[data-t-aria="Recording motion"]').value, rows, mark: !!d.querySelector('.dev-loading .mark'), markCard1: !!document.querySelector('#rackcard .dev[data-id="rackRender"] .dev-loading .mark'),
      fact: v.querySelector('.sr-keyfact .sr-value').textContent, section: (v.querySelector('.p7-section') || {}).textContent }; }, C2);
  L.ck(opened.motion === 'sweep', 'defaults.motion: the card opens on the app\'s motion (BASINS: ZOOM), nothing stored', opened.motion);
  L.ck(opened.rows.join('|') === 'motion|amount|format|size|fps|length|speed|start at|modulation|timeline', 'row(…, \'length\') seats a motion\'s row under LENGTH (BASINS\' SPEED), the rest under MOTION', opened.rows);
  L.ck(!opened.mark && opened.markCard1, 'createRenderCard({ loadingMark: false }) has no waiting mark (the default card clones the wordmark\'s)', opened);
  L.ck(opened.fact === 'CARD-GALLERY' && opened.section === 'CARD-GALLERY', 'subject.facts and sections are handed the view\'s own gallery', opened);
  /* SPEED → LENGTH through the panel's fields, by a hand: click into the field, type, leave it */
  await page.evaluate((c) => { document.querySelector(c + '.p7-speed').scrollIntoView({ block: 'center' }); }, C2);
  await page.waitForTimeout(60);
  const sp = await at(C2 + '.p7-speed');
  L.ck(sp && sp.hit, 'the seated SPEED field is what a hand presses (elementFromPoint)', sp);
  await page.mouse.click(sp.x, sp.y);
  for (const k of ['End', 'Backspace', 'Backspace', 'Backspace', '4', 'Tab']) await page.keyboard.press(k);
  await page.waitForTimeout(150);
  const len = await page.evaluate((c) => ({ length: document.querySelector(c + 'input[data-t-aria="Recording duration in seconds"]').value, est: document.querySelector(c + '.sr-record-estimate').textContent, seen: window.__p7 }), C2);
  L.ck(len.length === '0.250' && /\b8 frames\b/.test(len.est) && len.seen && len.seen.fps === '30', 'the motion\'s row writes LENGTH through fields.length (4 per second → 0.250 s, 8 frames) and reads fields.fps', len);
  /* a paint that throws refuses the run with its sentence */
  await page.evaluate(() => { window.__breakPaint = true; });
  await page.evaluate((c) => { document.querySelector(c + '.p7-amount').scrollIntoView({ block: 'center' }); }, C2);
  await page.waitForTimeout(60);
  const am = await at(C2 + '.p7-amount');
  await page.mouse.click(am.x, am.y);
  for (const k of ['End', 'Backspace', 'Backspace', 'Backspace', '1', 'Tab']) await page.keyboard.press(k);
  await page.waitForTimeout(150);
  const refused = await page.evaluate((c) => { const b = document.querySelector(c + '.sr-film > .sv-primary.trig'); return { disabled: b.disabled, est: document.querySelector(c + '.sr-record-estimate').textContent, plan: window.__R.card2.view.state().plan, opacity: getComputedStyle(b).opacity, bg: getComputedStyle(b).backgroundColor }; }, C2);
  await page.evaluate((c) => document.querySelector(c + '.sr-film > .sv-primary.trig').scrollIntoView({ block: 'center' }), C2);
  await page.waitForTimeout(60);
  const rb = await at(C2 + '.sr-film > .sv-primary.trig');
  if (rb) await page.mouse.click(rb.x, rb.y);                                  // a disabled trigger lets the press through: nothing is there to take it
  await page.waitForTimeout(150);
  const ran = await page.evaluate(() => window.__R.rec.running());
  L.ck(refused.disabled && refused.est === 'This sweep cannot be flown on this device' && refused.plan === null && rb && !rb.hit && !ran, 'a motionUi.paint that throws leaves RENDER off with the thrown sentence on the estimate row; a press at its centre starts nothing', { refused, rb, ran });
  const wellW = await page.evaluate(() => { const b = document.querySelector('.mir-folders .mir-render .sr-picture .sr-download'); return { disabled: b.disabled, opacity: getComputedStyle(b).opacity }; });
  L.ck(refused.opacity === '0.55' && wellW.disabled && wellW.opacity === '0.38', 'a disabled RENDER fades to .55 in the card, a disabled DOWNLOAD IMAGE to the kit\'s one fade (.38) in the window', { card: refused.opacity, window: wellW });
  await page.evaluate(() => { window.__breakPaint = false; });
  /* the picture made, read from state() */
  await page.evaluate((c) => document.querySelector(c + '.sr-capture').scrollIntoView({ block: 'center' }), C2);
  await page.waitForTimeout(60);
  const cap = await at(C2 + '.sr-capture');
  if (cap && cap.hit) await page.mouse.click(cap.x, cap.y);
  await page.waitForTimeout(200);
  const heldState = await page.evaluate(() => window.__R.card2.view.state().held);
  L.ck(cap && cap.hit && heldState && heldState.w === 128 && heldState.h === 72 && heldState.bytes === 4096, 'CAPTURE IMAGE, pressed: view.state().held is the picture made', { cap, heldState });
  /* BASINS' sheet: the card's sections flush, notes in the window's text, no container, the second key fact grows, a motion's rows at the section gap */
  const sheet = await page.evaluate((c) => { const v = document.querySelector(c), cs = (n) => getComputedStyle(n);
    const note = v.querySelector('.sr-film > .sv-note'), film = v.querySelector('.sr-film');
    const ui = v.querySelector('.sr-motion-ui:not([hidden])');
    return { gap: cs(v).rowGap, container: cs(v).containerType, noteSize: cs(note).fontSize, filmSize: cs(film).fontSize, noteInk: cs(note).color, filmInk: cs(film).color,
      keyBasis: cs(v.querySelectorAll('.sr-keyfact')[1]).flexBasis, uiGap: ui ? cs(ui).rowGap : null, sectionGap: cs(film).rowGap }; }, C2);
  L.ck(sheet.gap === '0px' && sheet.container === 'normal' && sheet.noteSize === sheet.filmSize && sheet.noteInk === sheet.filmInk && sheet.keyBasis === '140px' && sheet.uiGap === sheet.sectionGap,
    'the card\'s sections stand flush, the notes inherit the window\'s text, no container is declared, the second key fact grows, a motion\'s rows keep the section gap', sheet);

  /* ── 7c · the fold caret is glyph.js' (no text glyph), and SAVE AS ZIP… / OPEN ZIP… are RENDER's FILES rows, not the gallery's foot ── */
  const caret0 = await page.evaluate((w) => { const s = document.querySelector(w + '.sr-detail-toggle'), g = s && s.querySelector('.sr-detail-glyph');
    return { gly: g && g.dataset.gly, svg: !!(g && g.querySelector('svg')), before: s && getComputedStyle(s, '::before').content }; }, C2);
  L.ck(await press(C2 + '.sr-detail-toggle', 'VIEW DETAILS'), 'VIEW DETAILS was pressed');
  await page.waitForTimeout(80);
  const caret1 = await page.evaluate((w) => { const s = document.querySelector(w + '.sr-detail-toggle'); return { open: s.parentElement.open, gly: s.querySelector('.sr-detail-glyph').dataset.gly }; }, C2);
  L.ck(caret0.gly === 'chevronDown' && caret0.svg && (caret0.before === 'none' || caret0.before === 'normal') && caret1.open && caret1.gly === 'chevronUp',
    'VIEW DETAILS draws glyph.js\' chevronDown closed and chevronUp open, no text glyph', { caret0, caret1 });
  const seat = await page.evaluate((w) => ({ foot: document.querySelectorAll('.mir-folders .sv-foot [data-zip]').length, any: document.querySelectorAll('.mir-folders [data-zip]').length,
    files: [...document.querySelectorAll(w + '.sr-files [data-zip]')].map((b) => b.dataset.zip).join(), title: (document.querySelector(w + '.sr-files > summary') || {}).textContent }), W);
  L.ck(seat.foot === 0 && seat.any === 2 && seat.files === 'save,open' && seat.title === 'FILES', 'SAVE AS ZIP… and OPEN ZIP… sit in RENDER\'s FILES section (BASINS\' SETTINGS & FILES), not the gallery\'s foot', seat);
  await page.evaluate(() => { window.__R.folders.open(); window.__R.folders.tab('render'); });
  await page.waitForTimeout(300);
  L.ck(await press(W + '.sr-files > summary', 'FILES'), 'FILES was pressed open');
  await page.waitForTimeout(80);
  const nSaved = await page.evaluate(() => window.__saved.length);
  L.ck(await press(W + '.sr-files [data-zip="save"]', 'SAVE AS ZIP…'), 'SAVE AS ZIP… was pressed');
  const zipped = await waitFor((n) => window.__saved.length > n, 8000, nSaved) && await page.evaluate(() => { const s = window.__saved.at(-1); return { name: s.name, folders: s.folders, type: s.blob.type }; });
  L.ck(zipped && zipped.folders && /\.mirtest\.zip$/.test(zipped.name) && zipped.type === 'application/zip', 'pressed, it is FOLDERS\' SAVE AS ZIP (a <name>.mirtest.zip handed to its download)', zipped);

  /* ── 8 · nothing broke on the way ── */
  const errs = errors();
  L.ck(errs.length === 0, 'no uncaught exception on the page', errs.slice(0, 3));
} catch (e) {
  L.ck(false, 'the test ran to the end (' + String(e && e.stack || e).slice(0, 400) + ')', null);
} finally { await close(); }
const out = L.finish();
process.exit(out.pass === out.total ? 0 : 1);
