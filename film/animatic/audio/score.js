// The score for the sound version, composed from film/beats.json. Every time here is read from
// beats.json (plus the fixed offsets the picture uses in engine/world.js), so a retimed beat
// moves its sound with it. renderFilmAudio() renders the whole mix once in an
// OfflineAudioContext; live playback, the checks and the video export all use that buffer.
//
// Reference cue: Jon Hopkins, "Abandon Window" (Immunity, 2013). Key D major, 60 BPM base.
// Motif: A4 D5 B4 E5, a question that ends open on the 2nd; it returns resolved (E5 -> D5)
// on the end card, as the orange marker of the mark lands. The sections and their reasons are in film/BRIEF.md, "## Sound".
import { mulberry32, easeOut, easeIn, easeInOut, smooth } from '../../../src/scripts/film/engine/util.js';
import { ID, endTimes } from '../../../src/scripts/film/engine/world.js';
import { makeMix, duck, finish, LOOKAHEAD } from './mix.js';
import * as V from './synth.js';

export const SAMPLE_RATE = 48000;
export const MOTIF = ['A4', 'D5', 'B4', 'E5'];
export const RESOLVE = 'D5';
const SEED = 20260930;

// Chords per beat: open voicings, sus colours, pad never below D3. `lvl` shapes the arc.
// The benefit beat and the harm beat share one chord, so neither side sounds heavier.
const HARMONY = {
  [ID.q]: { pad: ['D3', 'A3', 'E4', 'A4'], cut: 1100, lvl: 0.75 },
  [ID.label]: { pad: ['G3', 'D4', 'A4', 'E5'], cut: 1300, lvl: 0.8 },
  [ID.hear]: { pad: ['E3', 'B3', 'D4', 'F#4'], cut: 1300, lvl: 0.8 },
  [ID.camps]: { pad: ['A3', 'D4', 'E4', 'B4'], cut: 1300, lvl: 0.8 },
  [ID.people]: { pad: ['D3', 'A3', 'F#4', 'E5'], cut: 1800, lvl: 0.95 },
  [ID.reads]: { pad: ['D3', 'A3', 'E4', 'F#4'], cut: 1700, lvl: 0.95 },
  [ID.mozilla]: { pad: ['G3', 'D4', 'A4', 'B4'], cut: 2000, lvl: 1.0 },
  [ID.google]: { pad: ['G3', 'D4', 'A4', 'B4'], cut: 2000, lvl: 1.0 },
  [ID.forks]: { pad: ['A3', 'D4', 'E4', 'B4'], cut: 2300, lvl: 1.05 },
  [ID.harris]: { pad: ['G3', 'D4', 'F#4', 'B4', 'A5'], cut: 2800, lvl: 1.2 },
  [ID.keep]: { pad: ['E3', 'B3', 'D4', 'F#4', 'A4'], cut: 2000, lvl: 0.95 },
  [ID.test]: { pad: ['A3', 'D4', 'E4', 'B4'], cut: 2200, lvl: 1.0 },
  [ID.caught]: { pad: ['G3', 'D4', 'F#4', 'B4'], cut: 2300, lvl: 1.0 },
  [ID.fix]: { pad: ['D3', 'A3', 'E4', 'F#4'], cut: 2400, lvl: 1.0 },
  [ID.law]: { pad: ['E3', 'B3', 'D4', 'G4'], cut: 2400, lvl: 1.0 },
  [ID.unknown]: { pad: ['A3', 'E4', 'B4', 'E5'], cut: 2000, lvl: 0.8 },
  [ID.clarity]: { pad: ['G3', 'D4', 'F#4', 'A4', 'B4'], cut: 2200, lvl: 0.95 },
  [ID.useit]: { pad: ['A3', 'D4', 'E4', 'B4'], cut: 2600, lvl: 1.05 },
  [ID.hold]: { pad: ['D3', 'A3', 'F#4', 'E5', 'A5'], cut: 3800, lvl: 1.45 },
  [ID.end]: { pad: ['D3', 'A3', 'D4', 'F#4', 'A4'], cut: 2200, lvl: 1.05 },
};

const READ_NOTES = ['A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6'];
const ARP_PATTERN = [0, 2, 1, 3, 0, 2, 1, 2];

export function buildScore(data) {
  const B = Object.fromEntries(data.beats.map((b) => [b.id, b]));
  const s = (id) => B[id].start, a = (id) => B[id].statement.at;
  const x = (id, role, i = 0) => (B[id].extra || []).filter((q) => q.role === role)[i].at;
  const D = data.duration;
  const rng = mulberry32(SEED);
  const events = [];
  const hits = [];
  const add = (kind, tag, p, hit) => {
    events.push({ kind, tag, ...p });
    if (hit) hits.push({ t: p.t, what: hit[0], visual: hit[1] });
  };

  // ---- the picture's hit times (offsets as drawn in engine/world.js) ----
  const T = {
    q: a(ID.q),
    forkRing: s(ID.reads) + 0.3,
    light: s(ID.mozilla) + 0.2,
    hazard: s(ID.google) + 0.2,
    fork2: s(ID.forks) + 0.1,
    both2: s(ID.forks) + 1.6,
    harris: a(ID.harris),
    catch: a(ID.caught) + 0.3,
    drop: a(ID.unknown) + 0.2,
    clarity: a(ID.clarity),
    glow: s(ID.useit) + 0.3,
    echo: x(ID.hold, 'echo'),
    hold: a(ID.hold),
    sheet: endTimes(s(ID.end)).sheet, // the chart's lines reach the map sheet
    marker: endTimes(s(ID.end)).marker, // the orange marker lands
    wordmark: x(ID.end, 'wordmark'),
  };

  // ---- pads: one per beat, identical neighbours merged; stopdown before Hold both at once ----
  const order = data.beats.map((b) => b.id);
  const segs = [];
  for (const id of order) {
    const h = HARMONY[id];
    const prev = segs.at(-1);
    if (prev && prev.pad.join() === h.pad.join()) continue;
    segs.push({ id, ...h, t0: s(id) });
  }
  segs.forEach((g, i) => {
    let t0 = g.t0, t1 = segs[i + 1] ? segs[i + 1].t0 : D, att = 2.2, rel = 2.6;
    if (g.id === ID.q) { t0 = 0.4; att = 3.0; }
    if (g.id === ID.useit) { t1 = s(ID.hold); rel = 0.9; } // the stopdown: the pad reverbs out
    if (g.id === ID.hold) { t0 = T.hold; att = 0.3; }
    if (g.id === ID.end) { t1 = T.wordmark + 1.3; rel = 3.0; att = 1.6; }
    add('pad', 'pad', { t0, t1, notes: g.pad, gain: 0.032 * g.lvl, cut: g.cut * 0.8, a: att, r: rel });
  });

  // ---- bass: absent in the opening, enters with People are people; no bottom under the fog ----
  const BASS = [
    [s(ID.people), s(ID.harris), 'D2'],
    [s(ID.harris), s(ID.keep), 'G2'],
    [s(ID.keep), s(ID.test), 'E2'],
    [s(ID.test), s(ID.caught), 'A2'],
    [s(ID.caught), s(ID.fix), 'G2'],
    [s(ID.fix), s(ID.law), 'D2'],
    [s(ID.law), T.drop, 'E2', 1.5, 3.5],
    [s(ID.clarity), s(ID.useit), 'G2'],
    [s(ID.useit), s(ID.hold), 'A2', 0.9, 0.8],
    [T.hold, T.wordmark + 1.3, 'D2', 1.2, 3.0],
  ];
  for (const [t0, t1, note, att = 1.2, rel = 1.0] of BASS) add('bass', 'bass', { t0, t1, note, gain: 0.032, a: att, r: rel });

  // ---- the motif ----
  const motif = (t0, step, notes, { vel = 1, pan = 0.12, dec = 3.2, hitAt = [] } = {}) => notes.forEach((note, i) => {
    const t = t0 + i * step, last = i === notes.length - 1;
    const h = hitAt.find((q) => Math.abs(q[0] - t) < 1e-6);
    add('bell', h ? 'hit' : 'bell', { t, note, vel: vel * (last ? 1 : 0.86), dec: last ? dec * 1.7 : dec, pan: (i % 2 ? 1 : -1) * pan }, h ? [h[1], h[2]] : null);
  });
  motif(T.q, 0.5, MOTIF, { hitAt: [[T.q, 'motif, stated (question)', 'caption: Is AI good or bad for us?']] });

  // ---- labels: identical low tone as each label lands; the readings go quiet under them ----
  const staged = [x(ID.label, 'region'), x(ID.hear, 'region')];
  const run = (B[ID.camps].extra || []).filter((q) => q.role === 'region').map((q) => q.at);
  add('low', 'hit', { t: staged[0], note: 'D2', vel: 0.7, dec: 1.6 }, ['label lands', `${B[ID.label].extra[0].text} lands`]);
  add('low', 'hit', { t: staged[1], note: 'D2', vel: 0.7, dec: 1.6 }, ['label lands', `${B[ID.hear].extra[0].text} lands`]);
  add('low', 'hit', { t: run[0], note: 'D2', vel: 0.7, dec: 1.6 }, ['labels land', 'two labels on the identical patches']);

  const tLift = s(ID.people) + 0.2, tSplit = s(ID.camps);
  const stagedA = (t) => Math.max(...staged.map((at, i) => {
    const next = staged[i + 1];
    return easeOut((t - at) / 0.9) * (next ? 1 - easeIn((t - next) / 0.8) : 1) * (1 - easeIn((t - tSplit) / 0.7));
  }));
  const covered = (t) => {
    const spread = easeInOut((t - tLift) / 1.6);
    return run.reduce((acc, at) => acc + easeOut((t - at) / 0.8) * (1 - smooth((spread - 0.45) / 0.55)), 0) / Math.max(1, run.length);
  };
  const readEnd = s(ID.reads) + 3.5;
  const density = (t) => smooth((t - 1.0) / 4.0) * (1 - 0.55 * stagedA(t)) * (1 - covered(t)) * (1 - smooth((t - s(ID.reads)) / 3.5));
  for (let t = 0.8; t < readEnd;) {
    t += -Math.log(1 - rng()) / 6; // Poisson, 6 per second at full density
    const u = rng(), note = READ_NOTES[Math.floor(rng() * READ_NOTES.length)], vel = 0.5 + 0.5 * rng(), pan = (rng() * 2 - 1) * 0.8, dec = 0.5 + 0.6 * rng();
    if (t < readEnd && u < density(t)) add('point', 'read', { t, note, vel, pan, dec });
  }

  // ---- first fork: neutral ring, then the benefit light and the harm mark, same voice, same weight ----
  add('bell', 'hit', { t: T.forkRing, note: 'D5', vel: 0.8 }, ['fork ring', 'neutral ring on the current']);
  add('bell', 'hit', { t: T.light, note: 'F#5', vel: 0.85, pan: -0.15 }, ['benefit', 'light on the north branch (Mozilla)']);
  add('bell', 'hit', { t: T.hazard, note: 'B4', vel: 0.85, pan: 0.15 }, ['harm', 'hazard on the south branch (Google)']);
  // second fork: ring, then both ends at once
  add('bell', 'hit', { t: T.fork2, note: 'D5', vel: 0.8 }, ['fork ring', 'second fork (sight)']);
  add('bell', 'hit', { t: T.both2, note: 'F#5', vel: 0.85, pan: -0.15 }, ['benefit and harm', 'light and hazard together']);
  add('bell', 'hit', { t: T.both2, note: 'B4', vel: 0.85, pan: 0.15 });
  // the synthesis: both branch notes around the ring note, over the widest chord so far
  add('bell', 'hit', { t: T.harris, note: 'B4', vel: 0.7, dec: 4.5, pan: 0.2 }, ['synthesis', 'Harris quote appears']);
  add('bell', 'hit', { t: T.harris, note: 'D5', vel: 0.7, dec: 4.5 });
  add('bell', 'hit', { t: T.harris, note: 'F#5', vel: 0.7, dec: 4.5, pan: -0.2 });

  // ---- the four steps spell the motif, one note per heading, ending open on E ----
  const steps = [[ID.test, 'We test it'], [ID.fix, 'We fix what tests find'], [ID.law, 'We make it law'], [ID.unknown, 'And we admit']];
  steps.forEach(([id, name], i) => add('bell', 'hit', { t: x(id, 'heading'), note: MOTIF[i], vel: 0.8, dec: i === 3 ? 5 : 3.4, pan: (i % 2 ? 1 : -1) * 0.1 }, ['step', `heading: ${name}`]));
  add('felt', 'hit', { t: T.catch, notes: ['D3', 'A3'], vel: 1 }, ['the catch', 'bar across the line (H42)']);
  add('bell', 'hit', { t: T.drop, note: 'A5', vel: 0.5, dec: 5, index: 1.1, send: 0.6 }, ['sounding drops', 'line into the fog, no bottom']);

  // ---- close: the motif's opening returns, both ends glow, stopdown, the one big moment ----
  add('bell', 'hit', { t: T.clarity, note: 'A4', vel: 0.7, pan: -0.1 }, ['clarity', 'Harris line appears']);
  add('bell', 'bell', { t: T.clarity + 0.5, note: 'D5', vel: 0.62, dec: 4, pan: 0.1 });
  add('bell', 'hit', { t: T.glow, note: 'F#5', vel: 0.8, pan: -0.15 }, ['both glow', 'lights and hazards glow together']);
  add('bell', 'hit', { t: T.glow, note: 'B4', vel: 0.8, pan: 0.15 });
  motif(T.echo, 0.4, MOTIF, { vel: 0.5, pan: 0.25, dec: 2.6, hitAt: [[T.echo, 'motif echo (question)', 'faint echo of the question']] });
  add('low', 'hit', { t: T.hold, note: 'D2', vel: 1.0, dec: 3.0, octave: 0.45 }, ['the big moment', 'caption: Hold both at once']);
  for (const [note, pan] of [['B4', 0.2], ['D5', 0], ['F#5', -0.2]]) add('bell', 'hit', { t: T.hold, note, vel: 0.95, dec: 5, pan });

  // ---- end card: the motif resolved, E falls to D as the orange marker lands ----
  const r0 = T.marker - 2.0; // = T.sheet: the motif starts as the lines reach the sheet
  motif(r0, 0.5, [...MOTIF, RESOLVE], {
    vel: 0.9, dec: 3.0, pan: 0.1,
    hitAt: [[T.sheet, 'motif (resolving)', 'lines reach the map sheet'], [T.marker, 'motif resolved', 'orange marker lands']],
  });
  add('bell', 'bell', { t: T.marker, note: 'D4', vel: 0.55, dec: 4.4, send: 0.4 });

  // ---- the pulse: three passages, each a whole number of eighths from cut to cut ----
  const PULSE = [
    { from: s(ID.reads), to: s(ID.harris), eighth: 0.5, gain: [0.5, 1.0], cut: [900, 2600] },
    { from: s(ID.test), to: T.drop, eighth: 0.5, gain: [0.8, 0.9], cut: [1800, 2400], rest: [T.catch, T.catch + 1.0] },
    { from: s(ID.useit), to: s(ID.hold), eighth: 0.45, gain: [0.7, 1.15], cut: [1400, 4200] },
  ];
  const chordAt = (t) => { let g = segs[0]; for (const q of segs) if (q.t0 <= t) g = q; return g.pad; };
  for (const p of PULSE) {
    const n = Math.max(1, Math.round((p.to - p.from) / p.eighth)), step = (p.to - p.from) / n;
    for (let k = 0; k < n; k++) {
      const jitter = k === 0 ? 0 : (rng() - 0.5) * 0.012;
      const t = p.from + k * step + jitter;
      if (p.rest && t >= p.rest[0] - 0.02 && t < p.rest[1]) continue;
      const tones = [...new Set(chordAt(t).map((nm) => { let m = V.midi(nm); while (m < 62) m += 12; return m; }))].sort((q, r) => q - r).slice(0, 4);
      const m = tones[ARP_PATTERN[k % 8] % tones.length];
      const u = k / n;
      const accent = k % 8 === 0 ? 1 : k % 2 === 0 ? 0.82 : 0.7;
      const vel = accent * (p.gain[0] + (p.gain[1] - p.gain[0]) * u) * 10 ** (((rng() - 0.5) * 3) / 20);
      add('pluck', 'arp', { t, note: noteName(m), vel, cut: p.cut[0] + (p.cut[1] - p.cut[0]) * u, pan: (k % 2 ? 0.28 : -0.28) + (rng() - 0.5) * 0.1 });
    }
  }

  // ---- automation: the erase in the labels chapter, ducks under hits, the final fade ----
  const auto = (M, stem) => {
    const ctx = M.ctx, t0 = s(ID.label), t1 = readEnd, n = Math.ceil((t1 - t0) * 100);
    const padCut = new Float32Array(n), readCut = new Float32Array(n), readLvl = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = t0 + i / 100, sa = stagedA(t), cv = covered(t);
      padCut[i] = 600 + 17400 * (1 - 0.45 * sa) * (1 - cv) ** 2;
      readCut[i] = 1500 + 14500 * (1 - 0.7 * sa) * (1 - cv);
      readLvl[i] = 1 - 0.35 * sa;
    }
    M.padTone.frequency.setValueCurveAtTime(padCut, t0, (n - 1) / 100);
    M.readTone.frequency.setValueCurveAtTime(readCut, t0, (n - 1) / 100);
    M.readGain.gain.setValueCurveAtTime(readLvl, t0, (n - 1) / 100);
    if (stem === 'mix') for (const h of hits) duck(M.padDuck.gain, h.t, -2.5, 0.5);
    M.master.gain.setValueAtTime(1, D - 1.7);
    M.master.gain.setTargetAtTime(0, D - 1.7, 0.3);
  };

  return { events, hits, auto, T, sections: data.chapters, pads: segs.map((g, i) => ({ id: g.id, t0: g.t0, t1: segs[i + 1] ? segs[i + 1].t0 : D })) };
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function noteName(m) { return `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`; }

const STEMS = {
  mix: () => true,
  hits: (e) => e.tag === 'hit',
  pads: (e) => e.tag === 'pad',
  // no notes at all: the bus, reverb, saturation and automation alone, i.e. the noise floor
  floor: () => false,
};

// Render the score. stem 'mix' is finished to -14 LUFS / -1.2 dBTP; the analysis stems
// ('hits', 'pads') go through the same bus but are left raw.
export async function renderFilmAudio(data, { stem = 'mix', sampleRate = SAMPLE_RATE } = {}) {
  const score = buildScore(data);
  const length = Math.ceil(data.duration * sampleRate), pre = Math.round(LOOKAHEAD * sampleRate);
  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: length + pre, sampleRate });
  const M = makeMix(ctx);
  // tape wow and flutter, shared by every pitched voice: 0.31 Hz +-2.5 cents, 5.7 Hz +-0.5 cents
  const wow = ctx.createGain();
  for (const [f, c] of [[0.31, 2.5], [5.7, 0.5]]) {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = c;
    o.connect(g).connect(wow);
    o.start(0);
  }
  M.wow = wow;
  // Chrome processes every connected node on every 128-frame block, including sources that
  // have not started yet and voices that have finished (no garbage collection runs during an
  // offline render). So the render pauses once a second: it builds the voices that start in the
  // next second and disconnects the ones that have fallen silent. Same graph, same output,
  // several times faster.
  const retired = [];
  M.retire = (end, node) => { retired.push([end, node]); return end; };
  const keep = stem.startsWith('tag:') ? (e) => e.tag === stem.slice(4) : STEMS[stem];
  if (!keep) throw new Error(`unknown stem ${stem}`);
  const queue = score.events.map((e, i) => [e, i]).filter(([e]) => keep(e)).sort((p, q) => (p[0].t ?? p[0].t0) - (q[0].t ?? q[0].t0));
  let qi = 0;
  const build = (until) => {
    for (; qi < queue.length && (queue[qi][0].t ?? queue[qi][0].t0) < until; qi++) {
      const [e, i] = queue[qi];
      V[e.kind](ctx, M, mulberry32(SEED + 7 * (i + 1)), e);
    }
  };
  build(1);
  score.auto(M, stem);
  // Browsers without OfflineAudioContext.suspend (Firefox) build every voice up front: same
  // output, slower render.
  let staged = true;
  for (let k = 1; k < data.duration && staged; k++) {
    try {
      ctx.suspend(k).then(() => {
        for (let i = retired.length - 1; i >= 0; i--) if (retired[i][0] < k) { retired[i][1].disconnect(); retired.splice(i, 1); }
        build(k + 1);
        ctx.resume();
      }, () => {});
    } catch {
      staged = false;
    }
  }
  if (!staged) build(Infinity);
  const rendered = await ctx.startRendering();
  const buffer = new AudioBuffer({ numberOfChannels: 2, length, sampleRate });
  for (let c = 0; c < 2; c++) buffer.copyToChannel(rendered.getChannelData(c).subarray(pre, pre + length), c);
  const report = stem === 'mix' ? finish([buffer.getChannelData(0), buffer.getChannelData(1)], sampleRate) : null;
  // onsets: every scheduled note start in this stem, so the click check can tell an attack from a click
  return { buffer, hits: score.hits, pads: score.pads, onsets: queue.map(([e]) => e.t ?? e.t0), report };
}

