/* audio.browser.mjs — lane AU's one browser test (2026-10-05): a generated WAV dropped on a lane becomes an audio clip with a waveform,
 * and SAVE AS ZIP then OPEN ZIP restores it.  Real CDP pointer input, every press hit-tested with elementFromPoint (tests/
 * timeline-rig.mjs keeps the answer in presses()); the drop is a real DragEvent carrying a real File.
 *   1. the drop on a lane opens the KEEP AUDIO / SIGNAL ONLY popup under the pointer, DRIVES a registered target;
 *      KEEP AUDIO (a hit-tested press) makes ONE clip of kind 'audio', keep, level, at the snapped beat on that lane;
 *   2. the clip paints a waveform canvas (the peaks level, the envelope line over it) with pixels in it, and the asset is in the store;
 *   3. the clip menu has ENVELOPE · LEVEL ✓ / LOW / MID / HIGH, KEEP AUDIO ↔ SIGNAL ONLY and STRETCH: LOW is chosen by a hit-tested press;
 *   4. KEEP AUDIO plays with the transport: one buffer source (Chromium only: no WebKit run);
 *   5. FOLDERS › EXPORT › SAVE AS ZIP… (hit-tested) downloads <name>.mirtest.zip holding project.json, the wav and its analysis; with the
 *      timeline cleared and the asset deleted, a .zip DROPPED on the FOLDERS window opens it: the project is in the library and current,
 *      the clip is back with its band, the asset is back in the store, a second open numbers the clash; a damaged zip changes nothing;
 *   6. the modulation seam's default audio capture: ADD AUDIO is offered with no `audio` option.
 * KEEP AUDIO is proven in Chromium only (BASINS' own state: its WPE WebKit cannot host an AudioContext in the app page).
 *   MIR_BASE=http://127.0.0.1:8851/ node tests/audio.browser.mjs */
import { openTimeline, ledger } from './timeline-rig.mjs';

const RUN = await (async () => {
  const { page, errors, presses, close } = await openTimeline({ page: 'tests/fixtures/audio.html', query: '' });
  const L = ledger('chromium');
  const S = (fn, arg) => page.evaluate(fn, arg);
  const state = () => S(() => window.__AU.tl.editor.model.state());
  try {
    await S(() => { window.__AU.mod.play(false); window.__AU.tl.open(); window.__AU.tl.editor.model.restore(null); });
    await page.waitForTimeout(300);

    // ---- 1. THE DROP: a generated WAV (4 s, 440 Hz, 8 kHz mono PCM16) on a lane, at a point the browser says is the lane --------------
    const lanePoint = await S(() => { const E = window.__AU.tl.editor, v = document.querySelector('.tl-viewport'), r = v.getBoundingClientRect(), pane = document.querySelectorAll('.tl-pane')[1].getBoundingClientRect();
      const x = Math.round(Math.max(r.left, pane.left) + 160), y = Math.round(pane.top + pane.height / 2), n = document.elementFromPoint(x, y);
      return { x, y, inside: !!n && !!n.closest('.tl-viewport'), at: E.at(x, y) }; });
    L.ck(lanePoint.inside, 'the drop point is inside the timeline viewport (elementFromPoint)', lanePoint);
    const dropped = await S(({ x, y }) => {
      const sr = 8000, secs = 4, n = Math.round(sr * secs), buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf), str = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
      str(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); str(36, 'data'); d.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) d.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * 440 * i / sr) * 0.6 * 32767 * Math.min(1, i / 2000)), true);
      const file = new File([buf], 'tone test.wav', { type: 'audio/wav' }), dt = new DataTransfer(); dt.items.add(file);
      const v = document.querySelector('.tl-viewport'), ev = (type) => new DragEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt });
      v.dispatchEvent(ev('dragover')); const prevented = !ev('drop').defaultPrevented ? false : true; v.dispatchEvent(ev('drop'));
      return { bytes: buf.byteLength, prevented };
    }, lanePoint);
    await page.waitForTimeout(400);
    const pop = await S(() => { const p = document.querySelector('.tl-audio-pop'); if (!p) return null; const r = p.getBoundingClientRect(), b = [...p.querySelectorAll('button')].map((n) => n.dataset.audio);
      const sel = p.querySelector('select'); return { buttons: b, title: p.querySelector('.tl-pop-title').textContent, target: sel.value, options: sel.options.length, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, role: p.getAttribute('role') }; });
    L.ck(dropped.bytes === 44 + 64000, 'the generated WAV is 4 s of PCM16 at 8 kHz', dropped);
    L.ck(pop && pop.buttons.join() === 'keep,signal,cancel' && pop.title.startsWith('AUDIO · TONE TEST') && pop.options === 1 && pop.target === 'palette.phase' && pop.inside && pop.role === 'dialog',
      'the popup: AUDIO · name, DRIVES the registered target, KEEP AUDIO · SIGNAL ONLY · CANCEL, inside the screen', pop);
    const keepBox = await page.locator('.tl-audio-pop [data-audio="keep"]').boundingBox();
    const hitKeep = await S(({ x, y }) => { const n = document.elementFromPoint(x, y); return !!n && !!n.closest('.tl-audio-pop [data-audio="keep"]'); }, { x: keepBox.x + keepBox.width / 2, y: keepBox.y + keepBox.height / 2 });
    L.ck(hitKeep, 'KEEP AUDIO is what elementFromPoint finds at its centre', keepBox);
    await page.mouse.click(keepBox.x + keepBox.width / 2, keepBox.y + keepBox.height / 2);
    for (let i = 0; i < 40 && !(await state()).clips.length; i++) await page.waitForTimeout(100);
    let doc = await state(); const clip = doc.clips[0], curve = doc.curves[0];
    L.ck(doc.clips.length === 1 && curve.kind === 'audio' && curve.keep === true && curve.band === 'level' && curve.targetId === 'palette.phase' && Math.abs(curve.seconds - 4) < 0.01,
      'one clip of kind audio: KEEP AUDIO, band LEVEL, 4 s, driving palette.phase', { clips: doc.clips.length, kind: curve.kind, keep: curve.keep, band: curve.band, seconds: curve.seconds });
    L.ck(clip.laneId === doc.lanes[1].id && Math.abs(clip.start - lanePoint.at.snapped) < 1e-9 && Math.abs(clip.duration - 4 * 30 / 60) < 0.1, 'on the lane under the pointer, at the snapped beat, 4 s long at the tempo', { lane: clip.laneId, start: clip.start, snapped: lanePoint.at.snapped, duration: clip.duration });
    L.ck(await S(() => !document.querySelector('.tl-audio-pop')), 'the popup is gone');
    const last = presses().at(-1);
    L.ck(/tl-action/.test(last.at) && /popup/.test(last.at), 'the press was delivered to the popup\'s button (hit-test log)', last);

    // ---- 2. THE WAVEFORM: a canvas under the clip's svg, peaks resolved, pixels drawn, the asset in the store ------------------------------
    const wave = await S((id) => { const b = document.querySelector(`.tl-clip[data-clip="${id}"]`), c = b && b.querySelector('canvas.tl-audio-wave'); if (!c) return null;
      const g = c.getContext('2d'), px = g.getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 0) lit++;
      const r = b.getBoundingClientRect(); return { kind: b.dataset.kind, w: c.width, h: c.height, peaks: c.dataset.peaks, lit, rect: { w: r.width, h: r.height }, aria: c.getAttribute('aria-hidden') }; }, clip.id);
    L.ck(wave && wave.kind === 'audio' && wave.lit > 200 && wave.peaks !== '' && wave.aria === 'true', 'the clip paints a waveform canvas: peaks level chosen, pixels drawn', wave);
    L.ck(wave && wave.rect.w > 20 && wave.rect.h > 20, 'and it has a body to see', wave && wave.rect);
    const stored = await S(async (id) => { const A = window.__AU.assets, m = await A.load(id), b = await A.bytes(id); return { seconds: m && m.seconds, name: m && m.name, bands: m && Object.keys(m.envelopes), peaks: m && m.peaks.length, bytes: b && b.length }; }, curve.assetId);
    L.ck(stored.bytes === 44 + 64000 && stored.peaks === 4 && stored.bands.join() === 'level,low,mid,high' && stored.name === 'tone test.wav', 'the file\'s bytes, four peak levels and four envelopes are in the asset store by content hash', stored);
    const env = await S((id) => { const c = window.__AU.tl.editor.model.state().curves[0]; return window.__AU.tl.model.value('palette.phase', 0.02 + window.__AU.tl.editor.model.state().clips[0].start); }, clip.id);
    L.ck(Number.isFinite(env), 'value(beat) is a lookup on the envelope (a number inside the clip)', env);

    // ---- 3. THE CLIP MENU: ENVELOPE · band, KEEP AUDIO ↔ SIGNAL ONLY, STRETCH ----------------------------------------------------------
    const cb = await page.locator(`.tl-clip-title[data-clip="${clip.id}"] .tl-clip-more`).boundingBox();
    const hitMore = await S(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.tl-clip-more'), { x: cb.x + cb.width / 2, y: cb.y + cb.height / 2 });
    L.ck(hitMore, 'the clip\'s ⋯ is what elementFromPoint finds at its centre', cb);
    await page.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2); await page.waitForTimeout(200);
    const rows = await S(() => [...document.querySelectorAll('.tl-pop[data-pop="clip"] [data-row]')].map((b) => [b.dataset.row, b.textContent]));
    const ids = rows.map((r) => r[0]);
    L.ck(['band-level', 'band-low', 'band-mid', 'band-high', 'keep', 'stretch-to-clip'].every((x) => ids.includes(x)), 'the clip menu holds the four envelopes, KEEP AUDIO ↔ SIGNAL ONLY and STRETCH', ids);
    L.ck(rows.find((r) => r[0] === 'band-level')[1].includes('✓') && !rows.find((r) => r[0] === 'band-low')[1].includes('✓') && /SIGNAL ONLY/.test(rows.find((r) => r[0] === 'keep')[1]), 'LEVEL is ticked; a KEEP clip offers SIGNAL ONLY', rows);
    const lowBox = await page.locator('.tl-pop[data-pop="clip"] [data-row="band-low"]').boundingBox();
    const hitLow = await S(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-row="band-low"]'), { x: lowBox.x + lowBox.width / 2, y: lowBox.y + lowBox.height / 2 });
    L.ck(hitLow, 'ENVELOPE · LOW is what elementFromPoint finds at its centre', lowBox);
    await page.mouse.click(lowBox.x + lowBox.width / 2, lowBox.y + lowBox.height / 2); await page.waitForTimeout(400);
    doc = await state();
    L.ck(doc.clips.length === 1 && doc.curves[0].band === 'low' && doc.curves[0].keep === true && doc.clips[0].start === clip.start && doc.clips[0].laneId === clip.laneId, 'LOW re-creates the clip in place: same lane and start, KEEP kept', { band: doc.curves[0].band, keep: doc.curves[0].keep });
    L.ck(await S((id) => !!document.querySelector('canvas.tl-audio-wave'), 0), 'the repainted clip still has its waveform');

    // ---- 4. KEEP AUDIO PLAYS WITH THE TRANSPORT: one buffer source per sounding clip (Chromium only) -------------------------------------
    await S((b) => { window.__AU.tl.controller.seek(b + 0.02); window.__AU.tl.controller.play(true); }, clip.start);
    let pb = null; for (let i = 0; i < 20; i++) { await page.waitForTimeout(150); pb = await S(() => window.__AU.au.playback.state()); if (pb.live.length) break; }
    L.ck(pb && pb.live.length === 1 && pb.starts >= 1 && pb.live[0].rate > 0.99 && pb.live[0].rate < 1.01, 'KEEP AUDIO: one buffer source sounds at rate 1 (the natural clip)', pb);
    await S(() => window.__AU.tl.controller.play(false)); await page.waitForTimeout(250);
    L.ck((await S(() => window.__AU.au.playback.state())).live.length === 0, 'paused: the source is stopped (and it is leased: it falls silent by itself)');

    // ---- 5. SAVE AS ZIP… then OPEN ZIP ---------------------------------------------------------------------------------------------------
    await S(() => window.__AU.folders.open()); await page.waitForTimeout(500);
    const zipRow = await S(() => { const b = document.querySelector('.mir-folders [data-zip="save"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      return { x, y, hit: !!document.elementFromPoint(x, y)?.closest('[data-zip="save"]'), openZip: !!document.querySelector('.mir-folders [data-zip="open"]'), cls: b.className }; });
    L.ck(zipRow && zipRow.hit && zipRow.openZip, 'FOLDERS offers SAVE AS ZIP… and OPEN ZIP…, and SAVE AS ZIP… is what a person would press', zipRow);
    await page.mouse.click(zipRow.x, zipRow.y);
    for (let i = 0; i < 40 && !(await S(() => window.__AU.downloads.length)); i++) await page.waitForTimeout(100);
    const dl = await S(async () => { const d = window.__AU.downloads[0]; if (!d) return null; const bytes = new Uint8Array(await d.blob.arrayBuffer()), dec = new TextDecoder(), names = [];
      const dv = new DataView(bytes.buffer); let end = bytes.length - 22; while (end > 0 && dv.getUint32(end, true) !== 0x06054b50) end--; let at = dv.getUint32(end + 16, true);
      for (let n = dv.getUint16(end + 10, true); n > 0; n--) { const nl = dv.getUint16(at + 28, true), el = dv.getUint16(at + 30, true), cl = dv.getUint16(at + 32, true); names.push(dec.decode(bytes.subarray(at + 46, at + 46 + nl))); at += 46 + nl + el + cl; }
      return { name: d.name, type: d.blob.type, size: d.blob.size, names }; });
    const id = curve.assetId;
    L.ck(dl && dl.name === 'UNTITLED.mirtest.zip' && dl.type === 'application/zip' && dl.names.join() === `project.json,assets/audio/${id}.json,assets/audio/${id}.wav`, 'SAVE AS ZIP… downloads <name>.<app>.zip: project.json, the analysis json and the wav, stored', dl);
    L.ck((await S(() => window.__AU.says)).some((s) => /^Saved UNTITLED\.mirtest\.zip/.test(s)), 'and says so', await S(() => window.__AU.says));

    // the project is gone from the screen and the file from the store; DROP the .zip on the FOLDERS window
    const zipId = id; await S((i) => { window.__AU.tl.editor.model.restore(null); return window.__AU.assets.delete(i); }, zipId);
    L.ck((await state()).clips.length === 0 && (await S((i) => window.__AU.assets.bytes(i), zipId)) === null, 'the timeline is empty and the asset is out of the store before the open');
    const droppedZip = await S(async () => { const d = window.__AU.downloads[0], file = new File([d.blob], 'UNTITLED.mirtest.zip', { type: 'application/zip' }), dt = new DataTransfer(); dt.items.add(file);
      const t = window.__AU.folders.win.root, r = t.getBoundingClientRect(), ev = (type) => new DragEvent(type, { bubbles: true, cancelable: true, clientX: r.left + 40, clientY: r.top + 200, dataTransfer: dt });
      t.dispatchEvent(ev('dragover')); t.dispatchEvent(ev('drop')); return true; });
    for (let i = 0; i < 50 && !(await S(() => window.__AU.folders.current())); i++) await page.waitForTimeout(100);
    await page.waitForTimeout(400);
    doc = await state();
    const cur = await S(() => { const e = window.__AU.folders.current(); return e && { name: e.name, folder: e.folder }; });
    L.ck(cur && cur.name === 'UNTITLED', 'the dropped .zip is in the library under its own name and is the current project', cur);
    L.ck(doc.clips.length === 1 && doc.curves[0].kind === 'audio' && doc.curves[0].band === 'low' && doc.curves[0].assetId === zipId, 'the clip is back with its band (LOW) and its asset id', { clips: doc.clips.length, band: doc.curves[0]?.band });
    const back = await S(async (i) => { const A = window.__AU.assets, m = await A.load(i), b = await A.bytes(i); return { bytes: b && b.length, peaks: m && m.peaks.length, rate: m && m.peaks[3].rate }; }, zipId);
    L.ck(back.bytes === 44 + 64000 && back.peaks === 4 && back.rate === 6.25, 'the asset is back in the store, bytes and peaks, by content hash', back);
    L.ck((await S(() => window.__AU.says)).some((s) => /^Opened UNTITLED · 1 audio asset/.test(s)), 'and says so (the count of audio assets)', await S(() => window.__AU.says.slice(-3)));
    await page.waitForTimeout(300);
    const wave2 = await S(() => { const c = document.querySelector('canvas.tl-audio-wave'); if (!c) return null; const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 0) lit++; return { lit, peaks: c.dataset.peaks }; });
    L.ck(wave2 && wave2.lit > 200 && wave2.peaks !== '', 'the restored clip paints its waveform from the restored peaks', wave2);
    // a second open numbers the clash; never an overwrite
    await S(() => window.__AU.folders.openZip(new File([window.__AU.downloads[0].blob], 'x.zip')));
    const names = await S(() => window.__AU.folders.files.entries().map((e) => e.name).sort());
    L.ck(names.length === 2 && names[1] === 'UNTITLED 2', 'a second open of the same zip is numbered, never an overwrite', names);
    // a damaged zip changes nothing
    const sigBefore = await S(() => JSON.stringify(window.__AU.folders.files.entries().map((e) => e.id)));
    const bad = await S(async () => { const bytes = new Uint8Array(await window.__AU.downloads[0].blob.arrayBuffer()); bytes[42] ^= 0xff; const r = await window.__AU.folders.openZip(new File([bytes], 'bad.zip')); return { ok: r.ok, says: window.__AU.says.at(-1) }; });
    L.ck(bad.ok === false && /^! That is not a project zip: project\.json failed its CRC/.test(bad.says) && (await S(() => JSON.stringify(window.__AU.folders.files.entries().map((e) => e.id)))) === sigBefore, 'a damaged zip is refused by its CRC and changes nothing', bad);

    // ---- 6. THE MODULATION SEAM'S DEFAULT AUDIO CAPTURE -------------------------------------------------------------------------------
    const mic = await S(async () => { const M = window.__AU.mod; M.open(); await new Promise((r) => setTimeout(r, 300));
      const all = [...document.querySelectorAll('button')], add = all.filter((b) => /^Add an audio follower/.test(b.title || b.dataset.tTitle || '')), off = all.filter((b) => /Audio input is unavailable/.test(b.title || ''));
      return { offered: add.length, refused: off.length, disabled: add.map((b) => b.disabled) }; });
    L.ck(mic.offered >= 1 && mic.refused === 0 && mic.disabled.every((d) => d === false), 'with no `audio` option ADD AUDIO is offered, not refused as unavailable (the kit\'s capture is the default)', mic);
    L.ck(errors().length === 0, 'no page exceptions', errors());
  } catch (e) { L.ck(false, 'the run finished', String(e && e.stack || e)); }
  finally { await close(); }
  return L.finish();
})();
process.exit(RUN.pass === RUN.total ? 0 : 1);
