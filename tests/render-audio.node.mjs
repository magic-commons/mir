/* render-audio.node.mjs — THE AUDIO TRACK in the MP4 muxer (1.5.6-alpha.12, λWAVES 025 A1), headless.
 *
 *   node tests/render-audio.node.mjs
 *
 * A synthetic two-track file (H.264 samples + Opus or AAC packets) is muxed and read back with mp4Parse: the durations, the
 * edit lists (audible sample 0 at video frame 0), the integer sample tables, the roll group, the sample entries, and every
 * sample's bytes where its chunk offset says (the chunks interleave by the half second).  Without `audio` the one-track file
 * is byte for byte what 1.5.6-alpha.11 wrote (the sha-256s below were taken from it). */
import { createHash } from 'node:crypto';
import { mp4Parts, mp4Build, mp4Parse } from '../mir/render/mp4.js';

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

const failed = results.filter((r) => !r.ok);
console.log(`render-audio: ${results.length - failed.length}/${results.length} pass`);
if (failed.length) process.exit(1);
