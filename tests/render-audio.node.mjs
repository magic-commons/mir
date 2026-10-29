/* render-audio.node.mjs — THE AUDIO TRACK in the MP4 muxer (1.5.6-alpha.12, λWAVES 025 A1), headless.
 *
 *   node tests/render-audio.node.mjs
 *
 * A synthetic two-track file (H.264 samples + Opus or AAC packets) is muxed and read back with mp4Parse: the durations, the
 * edit lists (audible sample 0 at video frame 0), the integer sample tables, the roll group, the sample entries, and every
 * sample's bytes where its chunk offset says (the chunks interleave by the half second).  Without `audio` the one-track file
 * is byte for byte what 1.5.6-alpha.11 wrote (the sha-256s below were taken from it).
 * 1.5.6-alpha.13 (A2): THE MIXDOWN's plan — which KEEP clips sound in a range, where (sample 0 = frame 0), from which source
 * second, at which varispeed rate, for how long — and the WAV beside PNG frames.
 * 1.5.6-alpha.14 (A3): the audio ladder asked (AAC, then Opus), and THE STORE's audio: written once beside the payload, muxed
 * at finish in the interleaved order, a recovered prefix cut to its own frames.
 * 1.5.6-alpha.15 (A4): the recorder's estimate names the clips the film will carry, and AUDIO OFF or the timeline off carries none. */
import { createHash } from 'node:crypto';
import { mp4Parts, mp4Build, mp4Parse } from '../mir/render/mp4.js';
import { mixPlan, mixFrames, wavBytes, MIX_RATE } from '../mir/render/audio-mix.js';
import { RenderStore } from '../mir/render/store.js';
import { decideAudioPath, peakIndex, muxAudio } from '../mir/render/encoder.js';
import { createRecorder } from '../mir/render/recorder.js';
import { createModHost } from '../mir/modulation/host.js';

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok }); if (!ok) console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 600))); };
const sha = (b) => createHash('sha256').update(b).digest('hex');
const DESC = Uint8Array.from([1, 100, 0, 40, 255, 225, 0, 0]);
const V = (n, f) => Array.from({ length: n }, (_, i) => ({ data: Uint8Array.from({ length: 10 + (i % 7) }, (_, k) => (i * 31 + k) & 255), key: i % 4 === 0, ...(f ? f(i) : {}) }));

/* ── the one-track file is unchanged ── */
{
  const got = [
    mp4Build({ width: 64, height: 32, fps: 30, description: DESC, samples: V(9) }),
    mp4Build({ width: 64, height: 32, fps: 24, description: DESC, samples: V(9, (i) => ({ cts: [0, 3, 1, 2, 4, 7, 5, 6, 8][i] * 3750 })), handler: 'BASINS video' }),
    mp4Build({ width: 64, height: 32, fps: 60, largeFile: true, description: DESC, samples: V(5) }),
  ].map(sha);
  check('no audio: the one-track files are byte for byte 1.5.6-alpha.11\'s (plain, B-frames, 64-bit)', JSON.stringify(got) === JSON.stringify([
    '693c115a92878d1ac58538ebdc16de806782e6da7619484f40d1bcbdddeb34bc', '28a8fe7b46a563dbec069a43a44987abcdd8fd0fa46a5ac6d303f4d3a2616ce6',
    '115ee207ed769fc63e08ca623ed97d872a060ebb24773b2b66c2449132eaead4']), got);
  const hp = mp4Parts({ width: 64, height: 32, fps: 60, largeFile: true, headersOnly: true, description: DESC, samples: V(5).map((s) => ({ ...s, data: { size: s.data.length } })) });
  check('no audio: the headers-only parts are unchanged too', sha(Buffer.concat(hp)) === '625af77e7d37662831ed79522969a6cd43a7f7f623291234dea89a84e5984a89' && hp.layout === undefined);
}

/* ── a synthetic two-track file ── */
const opusHead = (preSkip, ch = 2) => Uint8Array.from([...'OpusHead'].map((c) => c.charCodeAt(0)).concat([1, ch, preSkip & 255, preSkip >> 8, 0x80, 0xbb, 0, 0, 0, 0, 0]));
const packets = (n, base) => Array.from({ length: n }, (_, j) => ({ data: Uint8Array.from({ length: 20 + (j % 5) }, (_, k) => (base + j * 7 + k) & 255) }));
const bytesAt = (file, off, len) => file.subarray(off, off + len);
function walk(file, tr, list) {
  /* every sample of a track, where stsc + stco say it is, compared with what was handed in */
  let s = 0, ok = true;
  const per = (c) => { let n = 0; for (const [first, count] of tr.stsc) if (first <= c + 1) n = count; return n; };
  tr.offsets.forEach((off, c) => {
    let at = off;
    for (let k = 0; k < per(c); k++, s++) { const d = list[s].data; if (sha(bytesAt(file, at, d.length)) !== sha(d)) ok = false; at += d.length; }
  });
  return ok && s === list.length;
}

for (const [label, fps, frames] of [['30 fps', 30, 60], ['24 fps', 24, 48], ['60 fps', 60, 120]]) {
  const valid = 96000, pre = 312, n = Math.ceil((pre + valid) / 960);
  const video = V(frames), audio = packets(n, 5);
  const file = mp4Build({ width: 64, height: 32, fps, description: DESC, samples: video,
    audio: { codec: 'opus', sampleRate: 48000, channels: 2, description: opusHead(pre), frames: valid, samples: audio.map((a) => ({ ...a, dur: 960 })) } });
  const p = mp4Parse(file), [v, a] = p.tracks || [];
  check('opus ' + label + ': the file parses whole, two traks, next_track_ID 3', p.ok && p.tracks.length === 2 && p.movie.nextTrack === 3 && v.handler === 'vide' && a.handler === 'soun', { ok: p.ok, n: p.tracks?.length });
  check('opus ' + label + ': the video stts is integer (90000 / fps), the audio stts is 960 a packet at 48 kHz',
    JSON.stringify(v.stts) === JSON.stringify([[frames, 90000 / fps]]) && a.timescale === 48000 && JSON.stringify(a.stts) === JSON.stringify([[n, 960]]) && a.mediaDuration === n * 960, { v: v.stts, a: a.stts });
  check('opus ' + label + ': the audio edit list starts at the pre-skip and lasts the valid samples = the video\'s duration',
    a.edits.length === 1 && a.edits[0].mediaTime === pre && a.edits[0].segment === 180000 && a.edits[0].rate === 1 && v.edits[0].mediaTime === 0 && v.edits[0].segment === 180000 &&
    p.movie.duration === 180000 && p.movie.timescale === 90000 && a.duration === 180000, { a: a.edits, v: v.edits, movie: p.movie });
  check('opus ' + label + ': the sample entry is Opus + dOps (pre-skip 312, 2 ch, 48 kHz)', a.entry === 'Opus' && a.dOps.preSkip === pre && a.dOps.channels === 2 && a.dOps.inputRate === 48000 && a.channels === 2 && a.sampleRate === 48000, a.dOps);
  check('opus ' + label + ': the roll group (−4: 80 ms of 20 ms packets) covers every packet', a.roll.type === 'roll' && a.roll.distance === -4 && JSON.stringify(a.rollRuns) === JSON.stringify([[n, 1]]), a.roll);
  check('opus ' + label + ': every sample of both tracks is where its chunk offset says', walk(file, v, video) && walk(file, a, audio));
  const order = [...v.offsets.map((o) => ['v', o]), ...a.offsets.map((o) => ['a', o])].sort((x, y) => x[1] - y[1]).map((x) => x[0]).join('');
  check('opus ' + label + ': the chunks interleave by the half second (v a v a …, four of each in 2 s)', /^(va){4}a?$/.test(order) && v.offsets.length === 4, order);
  check('opus ' + label + ': the first chunk sits at the payload\'s start', Math.min(v.offsets[0], a.offsets[0]) === p.mdatPayloadAt);
}

/* ── AAC: mp4a + esds, the measured priming ── */
{
  const valid = 96000, priming = 2112, n = Math.ceil((priming + valid) / 1024), asc = Uint8Array.from([0x11, 0x90]);
  const video = V(60), audio = packets(n, 9);
  const o = { width: 64, height: 32, fps: 30, description: DESC, samples: video, audio: { codec: 'mp4a.40.2', sampleRate: 48000, channels: 2, description: asc, priming, frames: valid, samples: audio } };
  const file = mp4Build(o), p = mp4Parse(file), a = p.tracks[1];
  check('aac: mp4a + esds carrying the AudioSpecificConfig verbatim (object 0x40, audio stream 0x15)', a.entry === 'mp4a' && JSON.stringify(a.asc) === '[17,144]' && a.objectType === 0x40 && a.streamType === 0x15, a);
  check('aac: the edit list starts at the measured priming (2112) and the roll is −1', a.edits[0].mediaTime === priming && a.edits[0].segment === 180000 && a.roll.distance === -1 && JSON.stringify(a.stts) === JSON.stringify([[n, 1024]]), a.edits);
  check('aac: every sample is where its chunk offset says', walk(file, p.tracks[0], video) && walk(file, a, audio));
  /* the store's road: headers only, then the payload streamed in .layout's order, is the same file */
  const sized = (l) => l.map((s) => ({ ...s, data: { size: s.data.length } }));
  const head = mp4Parts({ ...o, samples: sized(video), audio: { ...o.audio, samples: sized(audio) }, headersOnly: true });
  const payload = head.layout.flatMap((c) => (c.track === 'video' ? video : audio).slice(c.first, c.first + c.count).map((s) => s.data));
  check('aac: headers-only + the payload in .layout order is byte for byte the whole file', sha(Buffer.concat([...head, ...payload])) === sha(file), head.layout.slice(0, 4));
  const bigFile = mp4Build({ ...o, largeFile: true }), big = mp4Parse(bigFile);
  check('aac: a 64-bit file (co64) places every sample of both tracks too', big.ok && big.tracks[1].offsets.length === a.offsets.length && walk(bigFile, big.tracks[0], video) && walk(bigFile, big.tracks[1], audio), big.tracks[1].offsets.slice(0, 2));
  const throws = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };
  check('aac: refused without its AudioSpecificConfig; an unknown codec refused', /AudioSpecificConfig/.test(throws(() => mp4Build({ ...o, audio: { ...o.audio, description: null } }))) &&
    /mp4a.40.2 or opus/.test(throws(() => mp4Build({ ...o, audio: { ...o.audio, codec: 'flac' } }))));
}

/* ── THE MIXDOWN's plan (A2): pure, the live placement's own arithmetic ── */
{
  const curve = (id, o = {}) => ({ id, kind: 'audio', keep: true, assetId: id.padEnd(32, '0'), seconds: 10, bpm: 120, name: id.toUpperCase(), ...o });
  const clip = (id, curveId, o = {}) => ({ id, curveId, start: 0, duration: 4, offset: 0, scale: 1, mute: false, ...o });
  const model = (curves, clips) => ({ state: () => ({ curves, clips }) });
  check('mix: N = round(frames · 48000 / fps) — 300 frames at 30 fps are 480000 samples, one frame at 24 is 2000', mixFrames(300, 30) === 480000 && mixFrames(1, 24) === 2000 && MIX_RATE === 48000);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  let p = mixPlan({ model: model([curve('a')], [clip('c1', 'a', { start: 2 })]), startBeat: 0, bpm: 120, frames: 300, fps: 30 });
  check('mix: a clip at beat 2 (120 BPM) sounds from 1.0 s, its source from 0, at rate 1, for its 2 s', p.frames === 480000 && p.clips.length === 1 &&
    near(p.clips[0].when, 1) && near(p.clips[0].offset, 0) && near(p.clips[0].playRate, 1) && near(p.clips[0].length, 2) && p.clips[0].name === 'A', p.clips);
  p = mixPlan({ model: model([curve('a')], [clip('c1', 'a', { start: 0, duration: 16 })]), startBeat: 4, bpm: 120, frames: 60, fps: 30 });
  check('mix: a range that starts inside a clip starts the source 2 s in, at sample 0, for the range’s 2 s', near(p.clips[0].when, 0) && near(p.clips[0].offset, 2) && near(p.clips[0].length, 2), p.clips);
  p = mixPlan({ model: model([curve('a'), curve('b', { keep: false })], [clip('m', 'a', { mute: true }), clip('s', 'b'), clip('late', 'a', { start: 40 })]), startBeat: 0, bpm: 120, frames: 300, fps: 30 });
  check('mix: a muted clip, a SIGNAL ONLY clip and a clip past the range make no sound (no clip: no audio track)', p.clips.length === 0, p.clips);
  p = mixPlan({ model: model([curve('a', { seconds: 1 })], [clip('v', 'a', { duration: 8, scale: 1 })]), startBeat: 0, bpm: 150, frames: 300, fps: 30 });
  check('mix: a stretched clip plays varispeed (scale · bpm / source bpm = 1.25) and stops where its source runs out', near(p.clips[0].playRate, 1.25) && near(p.clips[0].length, 0.8), p.clips);
  const wav = wavBytes([Float32Array.from([0, 1, -1, 2]), Float32Array.from([0.5, -0.5, 0, 0])], 48000), dv = new DataView(wav.buffer);
  check('mix: the WAV is RIFF 16-bit PCM, 2 ch, 48 kHz, N samples exactly, full scale clipped not wrapped',
    new TextDecoder().decode(wav.subarray(0, 4)) === 'RIFF' && dv.getUint16(22, true) === 2 && dv.getUint32(24, true) === 48000 && dv.getUint32(40, true) === 16 &&
    dv.getInt16(44 + 4, true) === 32767 && dv.getInt16(44 + 8, true) === -32768 && dv.getInt16(44 + 12, true) === 32767 && dv.getInt16(46, true) === 16384);
}

/* ── THE AUDIO SINK's ladder and THE STORE's audio (A3) ── */
class Writable {
  constructor(file) { this.file = file; this.chunks = []; }
  async write(b) { this.chunks.push(b instanceof Uint8Array ? b.slice() : new Uint8Array(b)); }
  async close() { this.file.blob = new Blob(this.chunks); }
  async abort() { this.chunks = []; }
}
class FileHandle { constructor(name) { this.kind = 'file'; this.name = name; this.blob = new Blob([]); } async createWritable() { return new Writable(this); } async getFile() { return this.blob; } }
class DirHandle {
  constructor(name) { this.kind = 'directory'; this.name = name; this.map = new Map(); }
  async getDirectoryHandle(n, o = {}) { if (!this.map.has(n)) { if (!o.create) throw new Error('NotFound'); this.map.set(n, new DirHandle(n)); } return this.map.get(n); }
  async getFileHandle(n, o = {}) { if (!this.map.has(n)) { if (!o.create) throw new Error('NotFound'); this.map.set(n, new FileHandle(n)); } return this.map.get(n); }
  async removeEntry(n) { if (!this.map.delete(n)) throw new Error('NotFound'); }
  async *entries() { for (const e of this.map) yield e; }
}
{
  const asked = [];
  const env = (yes) => ({ AudioData: function () {}, AudioEncoder: Object.assign(function () {}, { isConfigSupported: async (c) => { asked.push(c.codec + '@' + c.sampleRate); return { supported: yes.includes(c.codec) }; } }) });
  const linux = await decideAudioPath(48000, 2, env(['opus'])), mac = await decideAudioPath(48000, 2, env(['mp4a.40.2', 'opus'])), none = await decideAudioPath(48000, 2, env([]));
  check('ladder: AAC is asked first, Opus after; a browser without AAC (Firefox, Linux) lands on Opus 48 k', linux.kind === 'audio' && linux.codec === 'opus' && linux.ladder === 'AAC no · Opus yes' &&
    mac.codec === 'mp4a.40.2' && none.kind === 'none' && asked[0] === 'mp4a.40.2@48000', { linux, mac, none });
  check('ladder: no AudioEncoder at all is a plain "none"', (await decideAudioPath(48000, 2, {})).kind === 'none');
  check('peakIndex: the loudest sample\'s index', peakIndex(Float32Array.from([0, 0.1, -0.9, 0.5])) === 2 && peakIndex(Float32Array.from([0, 0.1, -0.9, 0.5]), 3) === 3);

  const storage = (() => { const root = new DirHandle(''); return { getDirectory: async () => root, estimate: async () => ({ quota: 1e12, usage: 0 }), root }; })();
  const opts = { dir: 'mir-recordings', storage }, fps = 24, DESCV = [1, 100, 0, 40, 255, 225, 0, 0];
  const vbytes = (i) => new Uint8Array(100).fill(i + 1);
  const info = (n) => ({ width: 16, height: 16, fps, description: DESCV, samples: Array.from({ length: n }, (_, i) => ({ size: 100, key: i === 0, ts: Math.round(i * 1e6 / fps), cts: i * 3750 })) });
  const head = Uint8Array.from([...'OpusHead'].map((c) => c.charCodeAt(0)).concat([1, 2, 56, 1, 0x80, 0xbb, 0, 0, 0, 0, 0]));
  const N = mixFrames(6, fps), apk = Array.from({ length: Math.ceil((312 + N) / 960) }, (_, j) => ({ data: new Uint8Array(30).fill(200 + j % 50), dur: 960 }));
  const audio = { codec: 'opus', label: 'Opus', sampleRate: 48000, channels: 2, description: head, samples: apk, priming: 312, frames: N, bitrate: 192000, clips: ['CLICK'] };
  const spec = { format: 'mp4', width: 16, height: 16, fps, frames: 6, bitrate: 40e6, rendererVersion: 1 };
  const st = await RenderStore.create('av-1', spec, 6000, opts);
  await st.saveAudio(audio);
  for (let i = 0; i < 4; i++) st.append(vbytes(i));
  await st.checkpoint(info(4));
  for (let i = 4; i < 6; i++) st.append(vbytes(i));
  const done = await st.finish(info(6), 'mir-render.mp4');
  const file = new Uint8Array(await done.blob.arrayBuffer()), p = mp4Parse(file), [v, a] = p.tracks;
  const memory = mp4Build({ ...info(6), description: Uint8Array.from(DESCV), samples: info(6).samples.map((s, i) => ({ ...s, data: vbytes(i) })), largeFile: true, audio: muxAudio(audio) });
  check('store: the audio written before the first frame comes back as the second trak at finish, byte for byte the in-memory file',
    p.ok && p.tracks.length === 2 && a.entry === 'Opus' && a.edits[0].mediaTime === 312 && a.edits[0].segment === 6 * 3750 && sha(file) === sha(memory), { ok: p.ok, n: p.tracks?.length, a: a?.edits });
  check('store: finishing removes audio.bin with the payload parts', ![...(await (await (await storage.getDirectory()).getDirectoryHandle('mir-recordings')).getDirectoryHandle('av-1')).map.keys()].some((k) => k === 'audio.bin' || k.startsWith('payload')));
  /* a run that dies after its checkpoint: the recovered prefix keeps the audio of its own frames */
  const st2 = await RenderStore.create('av-2', spec, 6000, opts);
  await st2.saveAudio(audio);
  for (let i = 0; i < 2; i++) st2.append(vbytes(i));
  await st2.checkpoint(info(2));
  st2.append(vbytes(2)); await st2.interrupt();
  const job = (await RenderStore.recoveries(opts)).find((j) => j.store.id === 'av-2');
  check('store: the manifest carries the audio table (a RESUME keeps it)', job && job.store.manifest.audio && job.store.manifest.audio.samples.length === apk.length && job.store.manifest.audio.priming === 312);
  const rec = mp4Parse(new Uint8Array(await (await job.store.finalize('mir-recovered.mp4')).blob.arrayBuffer()));
  check('store: a recovered 2-frame prefix has its 2 frames and the audio\'s edit list cut to them (2 × 3750 ticks)', rec.ok && rec.tracks[0].sampleCount === 2 && rec.tracks[1].edits[0].segment === 7500 && rec.movie.duration === 7500, rec.tracks?.[1]?.edits);
}

/* ── the estimate names the film's audio (A4) ── */
{
  const host = createModHost({ presentationActive: true });
  host.model.modReset({ bare: true }); host.clock.setBpm(120);
  const curves = [{ id: 'k', kind: 'audio', keep: true, assetId: 'k'.padEnd(32, '0'), seconds: 10, bpm: 120, name: 'CLICK' }, { id: 's', kind: 'audio', keep: false, assetId: 's'.padEnd(32, '0'), seconds: 10, bpm: 120, name: 'SIGNAL' }];
  const clips = [{ id: 'c1', curveId: 'k', start: 1, duration: 2, offset: 0, scale: 1, mute: false }, { id: 'c2', curveId: 's', start: 0, duration: 4, offset: 0, scale: 1, mute: false }];
  const rec = createRecorder({ host, editor: { model: { state: () => ({ curves, clips }) }, range: () => null, activeRange: () => null }, calib: { read: () => null, write: () => {} }, guard: false });
  const on = rec.estimate({ motion: 'still', fps: 30, durationS: 2, format: 'mp4', resolution: '1080p' });
  const off = rec.estimate({ motion: 'still', fps: 30, durationS: 2, format: 'mp4', resolution: '1080p', audio: false });
  const bypass = rec.estimate({ motion: 'still', fps: 30, durationS: 2, format: 'mp4', resolution: '1080p', timeline: false });
  const late = rec.estimate({ motion: 'still', fps: 30, durationS: 2, offsetS: 3, format: 'mp4', resolution: '1080p' });
  check('estimate: AUDIO ON names the KEEP clip in the range (CLICK), never the SIGNAL ONLY one; 96000 samples at 48 k', on.audio && JSON.stringify(on.audio.clips) === '["CLICK"]' && on.audio.samples === 96000, on.audio);
  check('estimate: AUDIO OFF, the timeline OFF, or a range past the clip carry no audio (the silent film)', off.audio === null && bypass.audio === null && late.audio === null, { off: off.audio, bypass: bypass.audio, late: late.audio });
  rec.destroy();
}

const failed = results.filter((r) => !r.ok);
console.log(`render-audio: ${results.length - failed.length}/${results.length} pass`);
if (failed.length) process.exit(1);
