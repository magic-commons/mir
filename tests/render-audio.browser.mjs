// THE AUDIO ON THE FILM, in a real browser (1.5.6-alpha.16, λWAVES 025 A5): the self-test's alignment proof — clicks at beats
// 0 · 1 · 2 (120 BPM) mixed offline, encoded down the ladder (Chromium on Linux and Firefox: Opus; AAC where the browser has it),
// muxed with 2 s of 30 fps H.264 and read back as a player reads it: every click within one sample of its beat's frame.
// MIR_BASE=http://127.0.0.1:8852/ node tests/render-audio.browser.mjs
import { openTimeline, ledger } from './timeline-rig.mjs';

const { page, close } = await openTimeline({ page: 'tests/fixtures/render.html', query: '', width: 1280, height: 900 });
const L = ledger('render-audio');
try {
  const caps = await page.evaluate(() => ({ audioEncoder: typeof AudioEncoder === 'function', videoEncoder: typeof VideoEncoder === 'function', offline: typeof OfflineAudioContext === 'function' }));
  if (!caps.audioEncoder || !caps.videoEncoder) L.ck(true, 'no WebCodecs encoder here: the proof is the browser gate\'s (said, not failed)', caps);
  else {
    const r = await page.evaluate(async () => {
      const { audioAlignment } = await import('/mir/render/selftest.js');
      try { return await audioAlignment(); } catch (e) { return { error: String(e.message || e) }; }
    });
    L.ck(!r.error && r.deltas.length === 3 && r.deltas.every((d) => Math.abs(d) <= 1) && r.samples === 96000,
      'the clicks at beats 0 · 1 · 2 land on frames 0 · 15 · 30 within one sample, after the edit list (' + (r.line || r.error) + ')', r);
    const line = await page.evaluate(async () => {
      const { renderSelfTest } = await import('/mir/render/selftest.js');
      const res = await renderSelfTest({ width: 320, height: 180, fps: 30 });
      return res.stages.find((s) => /the audio is on the film/.test(s.name));
    });
    L.ck(line && line.ok && /Δ/.test(line.detail), 'RUN SELF-TEST carries the alignment as one line', line);
  }
} catch (e) {
  L.ck(false, 'the test ran to the end (' + String(e && e.stack || e).slice(0, 400) + ')', null);
} finally { await close(); }
const out = L.finish();
process.exit(out.pass === out.total ? 0 : 1);
