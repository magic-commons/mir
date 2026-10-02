/* timeline/audio-kind.js — THE AUDIO CLIP KIND, as far as it is app-independent (harvested from BASINS app/audio-clip.js,
 * 2026-10-02).  A source of kind 'audio' carries its own envelope (base64 Uint8 at 100 Hz, the kit follower's output, as
 * BASINS analysed it), so its value(beat) is a lookup and a recorder renders it exactly: a BASINS project's audio clips
 * restore, drive their target and paint here with no file at all.  PURE at import (node tests it); paint needs a canvas.
 *
 * WHAT CAME IN: the source shape and its check (audioSource, validAudioSource), the lookup (envelopeAt), the tempo law
 * (audioRate, readjustAudioTempo), Shift+T (stretchAudioClip), the in-place source edit (patchAudioClip), the budget
 * (audioBudget), the paint (the envelope line, and the peaks when the app hands them: setAudioPeaks), the kind itself.
 * WHAT STAYS THE APP'S (it needs engines the kit does not have): decoding a file (WebAudio decodeAudioData), the
 * analysis that makes the envelope and the peaks (BASINS analyseAudio over its audio.js band edges), the content-hash
 * asset store (IndexedDB), playback with the transport (KEEP AUDIO), the drop popup that asks for a target, the asset
 * manifest project part, and the ENVELOPE · band menu rows (they reload the asset).  An app that has them registers
 * them on top: registerClipKind('audio', { ...AUDIO_KIND, menu }) and setAudioPeaks((assetId) => meta | null). */
import { registerClipKind } from './kinds.js';
import { AUDIO_FOLLOWED, BPM_MIN, BPM_MAX } from '../modulation/mod.js';

export const AUDIO_ENV_HZ = 100, AUDIO_BANDS = AUDIO_FOLLOWED, AUDIO_CLIP_MAX = 64, AUDIO_SECONDS_MAX = 20 * 60;
export const AUDIO_TINT = '#7bbfc8', AUDIO_CANVAS_MAX = 8192;
export const envelopeFrames = (seconds) => Math.max(1, Math.ceil(seconds * AUDIO_ENV_HZ));
// The source's own beat length at the tempo it was measured at (curve.length is the model's, set from the drop's duration).
export const sourceBeats = (curve) => curve.seconds * curve.bpm / 60;
const b64Length = (n) => 4 * Math.ceil(n / 3);
export function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromBase64(text) { const s = atob(text), out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }

// THE SOURCE: what JSON, the recorder and the signature see. `bpm` is the tempo its source beats were measured at.
// meta = { id (32 hex), seconds, envelopes: { level, low, mid, high } } — the app's analysis.
export function audioSource(meta, { bpm, keep = false, band = 'level' } = {}) {
  const tempo = Math.min(BPM_MAX, Math.max(BPM_MIN, Number(bpm) || 120)), b = AUDIO_BANDS.includes(band) ? band : 'level';
  return { kind: 'audio', assetId: meta.id, seconds: meta.seconds, bpm: tempo, band: b, keep: !!keep, envelope: meta.envelopes[b], length: meta.seconds * tempo / 60, color: AUDIO_TINT };
}
export function validAudioSource(c) {
  return !!c && typeof c.assetId === 'string' && /^[a-f0-9]{32}$/.test(c.assetId) && Number.isFinite(c.seconds) && c.seconds > 0 && c.seconds <= AUDIO_SECONDS_MAX &&
    Number.isFinite(c.bpm) && c.bpm >= BPM_MIN && c.bpm <= BPM_MAX && AUDIO_BANDS.includes(c.band) && typeof c.keep === 'boolean' &&
    typeof c.envelope === 'string' && c.envelope.length === b64Length(envelopeFrames(c.seconds)) && /^[A-Za-z0-9+/]*={0,2}$/.test(c.envelope);
}
const decoded = new WeakMap();
function envelopeBytes(curve) { let e = decoded.get(curve); if (!e || e.text !== curve.envelope) decoded.set(curve, e = { text: curve.envelope, bytes: fromBase64(curve.envelope) }); return e.bytes; }
// The lookup: sample i is the window centred on (i + ½)/100 s, linearly interpolated; silence before 0 and after the end.
export function envelopeAt(curve, seconds) {
  if (!(seconds >= 0) || seconds >= curve.seconds) return 0;
  const b = envelopeBytes(curve), f = seconds * AUDIO_ENV_HZ - 0.5, i = Math.floor(f);
  if (i < 0) return b[0] / 255; if (i >= b.length - 1) return b[b.length - 1] / 255;
  return (b[i] + (b[i + 1] - b[i]) * (f - i)) / 255;
}

// TEMPO LAW. A natural clip (rate 1) keeps its SECONDS when the BPM changes: scale and beat length re-derive in one undo.
// A stretched clip (Shift+T) keeps its BEATS and its varispeed rate follows the tempo.
export const audioRate = (clip, curve, bpm) => clip.scale * bpm / curve.bpm;
export function readjustAudioTempo(model, from, to) {
  if (!(from > 0) || !(to > 0) || from === to) return 0;
  const doc = model.state(), curves = new Map(doc.curves.map((c) => [c.id, c]));
  const moves = doc.clips.flatMap((c) => { const s = curves.get(c.curveId); return s?.kind === 'audio' && Math.abs(audioRate(c, s, from) - 1) < 1e-9 ? [[c.id, { scale: s.bpm / to, duration: c.duration * to / from }]] : []; });
  if (!moves.length) return 0;
  model.begin(); for (const [id, patch] of moves) model.updateClip(id, patch); model.commit();
  return moves.length;
}
// SHIFT+T: the audio from the clip's offset to the source's end is fitted into the clip's current beat length (varispeed).
export function stretchAudioClip(model, clipId) {
  const doc = model.state(), clip = doc.clips.find((c) => c.id === clipId), curve = clip && doc.curves.find((c) => c.id === clip.curveId);
  if (curve?.kind !== 'audio' || !(sourceBeats(curve) - clip.offset > 0)) return null;
  const scale = (sourceBeats(curve) - clip.offset) / clip.duration;
  return model.updateClip(clipId, { scale }) ? scale : null;
}
// A source edit (band, keep) re-creates the clip in place with the patched source: one undo, same lane, start, offset, scale.
export function patchAudioClip(model, clipId, patch) {
  const doc = model.state(), clip = doc.clips.find((c) => c.id === clipId), curve = clip && doc.curves.find((c) => c.id === clip.curveId);
  if (curve?.kind !== 'audio') return null;
  const { id, targetId, name, points, ...rest } = curve;
  model.begin();
  try {
    model.deleteClip(clipId);
    const next = model.create({ targetId, name, value: 0, start: clip.start, duration: clip.duration, laneId: clip.laneId, source: { ...rest, ...patch } });
    if (!next || !model.updateClip(next, { laneId: clip.laneId, offset: clip.offset, scale: clip.scale, mute: clip.mute })) { model.cancel(); return null; }
    model.commit(); return next;
  } catch (e) { model.cancel(); throw e; }
}

// BUDGET: 64 audio clips and 20 minutes of distinct decoded audio across the arrangement.  `why` is English: the caller
// translates it where it says it (t()).
export function audioBudget(doc, { seconds = 0, assetId = null } = {}) {
  const curves = new Map(doc.curves.map((c) => [c.id, c])), clips = doc.clips.filter((c) => curves.get(c.curveId)?.kind === 'audio').length;
  if (clips >= AUDIO_CLIP_MAX) return { ok: false, clips, why: 'No room: {n} audio clips is the budget.', vars: { n: AUDIO_CLIP_MAX } };
  const assets = new Map(doc.curves.filter((c) => c.kind === 'audio').map((c) => [c.assetId, c.seconds]));
  const total = [...assets.values()].reduce((a, b) => a + b, 0) + (assets.has(assetId) ? 0 : seconds);
  if (total > AUDIO_SECONDS_MAX + 1e-9) return { ok: false, clips, seconds: total, why: 'No room: {max} minutes of audio is the budget (this would be {now}).', vars: { max: AUDIO_SECONDS_MAX / 60, now: (total / 60).toFixed(1) } };
  return { ok: true, clips, seconds: total };
}

/* THE PEAKS: the app's analysis, by asset id (BASINS audioAssetMeta), or nothing — then the envelope line alone is drawn,
   exactly as BASINS draws a clip whose asset has not loaded */
let peaksOf = () => null;
export function setAudioPeaks(fn) { peaksOf = typeof fn === 'function' ? fn : () => null; }

// THE PAINT: a canvas beside the clip's svg, drawn once per render.
function drawWave(canvas, curve, clip, w, h, tint, meta) {
  const dpr = globalThis.devicePixelRatio || 1, W = Math.max(1, Math.min(AUDIO_CANVAS_MAX, Math.round(w * dpr))), H = Math.max(1, Math.round(h * dpr));
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d'); if (!g) return;
  const s0 = clip.offset * 60 / curve.bpm, per = clip.duration * clip.scale * 60 / curve.bpm / W;
  g.clearRect(0, 0, W, H);
  if (meta?.peaks) {
    const level = [...meta.peaks].reverse().find((p) => 1 / p.rate <= per) || meta.peaks[0], d = level.data, n = d.length / 2, mid = H / 2, amp = H * 0.45 / 127;
    g.fillStyle = tint; g.globalAlpha = 0.38;
    for (let x = 0; x < W; x++) {
      const t = s0 + x * per; if (t >= curve.seconds) break;
      const a = Math.floor(t * level.rate), b = Math.min(n, Math.max(a + 1, Math.ceil((t + per) * level.rate)));
      let lo = 127, hi = -128; for (let i = a; i < b; i++) { if (d[2 * i] < lo) lo = d[2 * i]; if (d[2 * i + 1] > hi) hi = d[2 * i + 1]; }
      if (hi >= lo) g.fillRect(x, mid - hi * amp, 1, Math.max(1, (hi - lo) * amp));
    }
    canvas.dataset.peaks = String(level.rate);
  } else canvas.dataset.peaks = '';
  g.globalAlpha = 0.95; g.strokeStyle = tint; g.lineWidth = Math.max(1, 1.25 * dpr); g.beginPath();
  for (let x = 0; x <= W; x += 2) { const y = H * (1 - envelopeAt(curve, s0 + x * per)); x ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
}
function paint(svg, curve, clip, ctx = {}) {
  const doc = svg.ownerDocument || document, canvas = doc.createElement('canvas'), host = ctx.block || svg.parentElement;
  const w = ctx.geometry?.width ?? clip.duration * (ctx.px || 20), h = ctx.height || svg.viewBox?.baseVal?.height || 48, tint = ctx.tint || curve.color || AUDIO_TINT;
  canvas.className = 'tl-audio-wave'; canvas.dataset.asset = curve.assetId; canvas.setAttribute('aria-hidden', 'true');
  if (host) host.insertBefore(canvas, svg.parentElement === host ? svg : null);
  drawWave(canvas, curve, clip, w, h, tint, peaksOf(curve.assetId));
  return canvas;
}
export const AUDIO_KIND = registerClipKind('audio', {
  validate: validAudioSource,
  value: (curve, clip, sourceBeat) => envelopeAt(curve, sourceBeat * 60 / curve.bpm),
  duration: (curve, bpm) => curve.seconds * bpm / 60,
  slice: (curve) => ({ before: curve, after: curve }),
  paint
});
