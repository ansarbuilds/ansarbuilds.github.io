/* The film's sound, generated in the browser (no audio files). An original
   score in the manner of a big space film: each act has its own chord
   progression (lib/score.js) played on a church organ, a sub bass and a
   high ticking figure, with a clock under it, all in one long hall. It moves to the next act's music on
   the next chord, and opens up and adds air as the visitor scrolls faster.
   Cues sit on top: the cold open's heartbeats, riser and hit, a tone on a
   cut, a chime as a card comes up. With no film on the page (reduced
   motion, or a device that cannot play it) no act asks for music, so there
   is none.

   The choice is remembered in this browser. Browsers start audio only after
   a click or key press, which suits a switch that is off until pressed. */
import { SCORE, arpNote, chordAt, hz } from "./score.js";

const KEY = "film-sound";
let ctx = null, master = null, music = null, padTone = null, air = null, verb = null, on = false;
let noiseBuffer = null;
// The film is paused: the score holds where it is until it plays again.
let paused = false;
// The chord voices still ringing, so a change of act can let them go.
const sounding = new Set();
const listeners = new Set();

try { on = window.localStorage.getItem(KEY) === "1"; } catch { /* private mode: off */ }

export const soundOn = () => on;
// On, and actually playing: the browser has had its click or key.
export const soundPlaying = () => on && ctx?.state === "running";
export function onSoundChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function setSound(next) {
  on = next;
  try { window.localStorage.setItem(KEY, next ? "1" : "0"); } catch { /* not remembered */ }
  if (next) start(); else stop();
  listeners.forEach((fn) => fn(on));
}

// A hall: about three seconds of decaying stereo noise as the impulse.
function hall(seconds = 5.2) {
  const rate = ctx.sampleRate, length = Math.floor(rate * seconds);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let c = 0; c < 2; c++) {
    const data = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const fade = 1 - i / length;
      data[i] = (Math.random() * 2 - 1) * fade ** 2.6;
    }
  }
  const node = ctx.createConvolver();
  node.buffer = impulse;
  return node;
}

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  // Master: a compressor to glue the score and the cues, then a limiter so
  // the big hits can be loud without clipping.
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20;
  glue.ratio.value = 4;
  glue.attack.value = 0.01;
  glue.release.value = 0.25;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -4;
  limit.knee.value = 0;
  limit.ratio.value = 20;
  limit.attack.value = 0.001;
  limit.release.value = 0.1;
  const makeup = ctx.createGain();
  makeup.gain.value = 1.5;
  glue.connect(makeup).connect(limit).connect(ctx.destination);
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(glue);
  // The reverb every voice sends into.
  verb = ctx.createGain();
  verb.gain.value = 0.55;
  const space = hall();
  verb.gain.value = 0.7;
  verb.connect(space).connect(master);
  // The music bus: pads go through one low-pass that scrolling opens.
  music = ctx.createGain();
  music.gain.value = 0.8;
  music.connect(master);
  padTone = ctx.createBiquadFilter();
  padTone.type = "lowpass";
  padTone.frequency.value = 1500;
  padTone.Q.value = 0.5;
  padTone.connect(music);
  padTone.connect(verb);
  // The pads breathe, slowly.
  const lfo = ctx.createOscillator(), depth = ctx.createGain();
  lfo.frequency.value = 0.08;
  depth.gain.value = 220;
  lfo.connect(depth).connect(padTone.frequency);
  lfo.start();
  // Air: filtered noise that rises with scroll speed.
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1100;
  band.Q.value = 0.5;
  air = ctx.createGain();
  air.gain.value = 0;
  noise.connect(band).connect(air).connect(master);
  noise.start();
  // Scroll speed opens the pads and lifts the air.
  let lastY = window.scrollY, lastT = performance.now(), settle = 0;
  window.addEventListener("scroll", () => {
    if (!on || !playing) return;
    const now = performance.now(), dy = Math.abs(window.scrollY - lastY), dt = Math.max(16, now - lastT);
    lastY = window.scrollY; lastT = now;
    const speed = Math.min(1, dy / dt / 3);
    padTone.frequency.setTargetAtTime(1500 + speed * 2200, ctx.currentTime, 0.15);
    air.gain.setTargetAtTime(speed * 0.025, ctx.currentTime, 0.1);
    clearTimeout(settle);
    settle = setTimeout(() => { padTone.frequency.setTargetAtTime(1500, ctx.currentTime, 0.8); air.gain.setTargetAtTime(0, ctx.currentTime, 0.6); }, 160);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") ctx.suspend(); else if (on && !paused) ctx.resume(); });
  setInterval(schedule, 50);
}

function start() {
  if (!ctx) build();
  if (!paused) ctx.resume();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(1, ctx.currentTime, 0.4);
}
function stop() {
  if (!ctx) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
}

/* ---- Instruments. Each makes its nodes for one note and lets them go. ---- */

function envelope(gain, at, peak, attack, hold, release) {
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.setValueAtTime(peak, at + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold + release);
  return at + attack + hold + release;
}

function ring(out, end) {
  sounding.add(out);
  setTimeout(() => sounding.delete(out), (end - ctx.currentTime + 0.2) * 1000);
}
// Lets every chord voice go over about a second, from `at`.
function release(at) {
  for (const out of sounding) {
    if (out.gain.cancelAndHoldAtTime) out.gain.cancelAndHoldAtTime(at);
    else out.gain.cancelScheduledValues(at);
    out.gain.setTargetAtTime(0, at, 0.35);
  }
  sounding.clear();
}

// The organ: one pipe rank per drawbar (16', 8', 4', 2 2/3', 2'), sines in
// tune with each other, a slow swell in and a long release into the hall,
// and a slight drift between ranks so it breathes like air in pipes.
const RANKS = [[0.5, 0.45], [1, 1], [2, 0.55], [3, 0.18], [4, 0.22]];
function organ(midi, at, length, level) {
  const out = ctx.createGain();
  const end = envelope(out, at, 0.016 * level, 1.1, Math.max(0, length - 1.1), 3.2);
  out.connect(padTone);
  ring(out, end);
  RANKS.forEach(([mul, weight], i) => {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = hz(midi) * mul;
    osc.detune.value = (i % 2 ? 1 : -1) * (1.5 + i);
    g.gain.value = weight;
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(end + 0.05);
  });
}

// The high figure: a soft flute stop, quick to speak and quick to stop, so
// a run of them ticks.
function flute(midi, at, velocity = 1) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, at);
  out.gain.linearRampToValueAtTime(0.028 * velocity, at + 0.025);
  out.gain.exponentialRampToValueAtTime(0.012 * velocity, at + 0.25);
  out.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
  out.connect(music);
  const send = ctx.createGain();
  send.gain.value = 1.1;
  out.connect(send).connect(verb);
  for (const [mul, level] of [[1, 1], [2, 0.35], [3, 0.08]]) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = hz(midi) * mul;
    g.gain.value = level;
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + 1);
  }
}

// The clock: a dry, tiny wooden click.
function clock(at, level = 1) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 3200;
  band.Q.value = 6;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.05 * level, at);
  out.gain.exponentialRampToValueAtTime(0.0001, at + 0.035);
  src.connect(band).connect(out).connect(master);
  src.start(at, Math.random());
  src.stop(at + 0.05);
}

// The strings' drive: a low, bowed sawtooth pair, short and accented, the
// engine of a trailer cue.
function strings(midi, at, accent = 1) {
  const out = ctx.createGain(), tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(700 + accent * 900, at);
  tone.frequency.exponentialRampToValueAtTime(420, at + 0.22);
  tone.Q.value = 1.2;
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(0.06 * accent, at + 0.012);
  out.gain.exponentialRampToValueAtTime(0.0001, at + 0.26);
  out.connect(tone).connect(music);
  const send = ctx.createGain();
  send.gain.value = 0.25;
  tone.connect(send).connect(verb);
  for (const detune of [-9, 9]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = hz(midi);
    osc.detune.value = detune;
    osc.connect(out);
    osc.start(at);
    osc.stop(at + 0.3);
  }
}

// The trailer drums: a big low skin with a long tail in the hall, and a
// cracking hit on the backbeat.
function taiko(at, level = 1) {
  drum(at, 1.25 * level, 120, 38, 0.9);
  noise(at, 0.18, 900, 200, 0.18 * level, 0.05, 0.8);
}
function crack(at, level = 1) {
  noise(at, 0.32, 2600, 900, 0.3 * level, 0.03, 0.9);
  drum(at, 0.5 * level, 220, 120, 0.14);
}

// The bass: a round sine with a little triangle for edge, under the chord.
function bass(midi, at, length) {
  const out = ctx.createGain();
  const end = envelope(out, at, 0.16, 0.6, Math.max(0, length - 0.6), 1.8);
  out.connect(music);
  ring(out, end);
  for (const [type, level] of [["sine", 1], ["triangle", 0.25]]) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = hz(midi);
    g.gain.value = level;
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(end + 0.05);
  }
}

// The piano: a felt-soft strike, a sine with its octave and a breath of
// triangle, quick in and a long decay, sent wet into the hall.
function piano(midi, at, velocity = 1) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, at);
  out.gain.linearRampToValueAtTime(0.07 * velocity, at + 0.008);
  out.gain.exponentialRampToValueAtTime(0.02 * velocity, at + 0.5);
  out.gain.exponentialRampToValueAtTime(0.0001, at + 3.2);
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(3200, at);
  tone.frequency.exponentialRampToValueAtTime(900, at + 1.5);
  out.connect(tone);
  tone.connect(music);
  const send = ctx.createGain();
  send.gain.value = 0.9;
  tone.connect(send).connect(verb);
  for (const [type, mul, level] of [["sine", 1, 1], ["sine", 2, 0.28], ["triangle", 1, 0.18], ["sine", 3, 0.06]]) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = hz(midi) * mul;
    g.gain.value = level;
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + 3.3);
  }
}

// A low drum: a sine that drops in pitch, felt more than heard.
function drum(at, level = 1, from = 110, to = 42, decay = 0.55) {
  const osc = ctx.createOscillator(), out = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + 0.18);
  out.gain.setValueAtTime(0, at);
  out.gain.linearRampToValueAtTime(0.5 * level, at + 0.005);
  out.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(out).connect(master);
  const send = ctx.createGain();
  send.gain.value = 0.25;
  out.connect(send).connect(verb);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

// Noise shaped by a band-pass sweep: a whoosh, a riser, the crack of a hit.
function noise(at, length, from, to, peak, peakAt = 0.4, q = 1.2) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = q;
  band.frequency.setValueAtTime(from, at);
  band.frequency.exponentialRampToValueAtTime(to, at + length);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(peak, at + length * peakAt);
  out.gain.exponentialRampToValueAtTime(0.0001, at + length);
  src.connect(band).connect(out).connect(master);
  const send = ctx.createGain();
  send.gain.value = 0.4;
  out.connect(send).connect(verb);
  src.start(at);
  src.stop(at + length + 0.05);
}

/* ---- The score: which act's music plays, scheduled a little ahead. ---- */

// Drum patterns, one level per step of a bar (0 for none).
const DRUMS = {
  build: [1, 0, 0, 0, 0, 0, 0.5, 0],
  full: [1, 0, 0, 0.6, 0, 0.7, 0, 0.4],
};

// Which acts are on screen, most recent last. The music follows the last.
const showing = [];
let playing = null, bar = 0, step = 0, stepAt = 0;
const AHEAD = 0.3;

function startAct(name, at) {
  release(at);
  playing = name;
  bar = 0; step = 0; stepAt = at;
  if (name) chord(at);
}

function chord(at) {
  const part = SCORE[playing];
  const notes = part.chords[chordAt(playing, bar)];
  const held = part.hold && chordAt(playing, bar) === part.chords.length - 1;
  // A held last chord rings for a long time instead of looping.
  const length = held ? part.bar * 4 : part.bar;
  bass(notes[0] - 12, at, length);
  for (const midi of notes.slice(1)) organ(midi, at, length, part.padLevel);
  if (part.pulse === "drum") drum(at, 0.65);
}

function schedule() {
  if (!ctx || ctx.state !== "running") return;
  const want = showing.at(-1) ?? null;
  const now = ctx.currentTime;
  if (want !== playing) {
    // A new act takes over on the next step, so it lands with the music.
    if (!playing) startAct(want, now + 0.05);
    else if (stepAt <= now + AHEAD) startAct(want, Math.max(stepAt, now + 0.05));
    return;
  }
  if (!playing) return;
  const part = SCORE[playing];
  const stepLength = part.bar / part.steps;
  while (stepAt < now + AHEAD) {
    // A new bar: the next chord.
    if (step > 0 && step % part.steps === 0) {
      bar += 1;
      const last = part.hold && chordAt(playing, bar - 1) === part.chords.length - 1;
      if (!last) chord(stepAt);
    }
    const inBar = step % part.steps;
    const finished = part.hold && chordAt(playing, bar) === part.chords.length - 1 && bar >= part.chords.length;
    if (!finished) {
      const midi = arpNote(playing, chordAt(playing, bar), inBar);
      if (midi !== null) flute(midi, stepAt, inBar === 0 ? 1 : 0.7);
      if (part.tick) clock(stepAt, inBar % 2 === 0 ? 1 : 0.55);
      if (part.pulse === "soft" && inBar % 2 === 0) drum(stepAt, inBar === 0 ? 0.5 : 0.28, 80, 45, 0.35);
      if (part.pulse === "drum" && inBar === part.steps / 2) drum(stepAt, 0.5);
      // The drive: the chord's root in the low strings on every half step,
      // leaning on the beats.
      if (part.drive) {
        const root = part.chords[chordAt(playing, bar)][0] + 12;
        const half = stepLength / 2;
        strings(root, stepAt, inBar % 2 === 0 ? 1 : 0.7);
        strings(root + (inBar % 4 === 3 ? 7 : 0), stepAt + half, 0.55);
      }
      // The drums: a hit on the downbeat, more as the act builds.
      if (part.drums) {
        const level = DRUMS[part.drums][inBar % 8];
        if (level) taiko(stepAt, level);
        if (part.drums === "full" && inBar % 4 === 2) crack(stepAt, 0.8);
      }
    }
    step += 1;
    stepAt += stepLength;
  }
}

/* An act says when its section is on screen; the music moves to the act
   that came on screen last, and goes quiet with none. */
export function showBed(name, visible) {
  const at = showing.indexOf(name);
  if (at >= 0) showing.splice(at, 1);
  if (visible && SCORE[name]) showing.push(name);
}

/* A browser lets a page make sound only after a click, tap or key press.
   Sound that is on but waiting starts with the first one. */
const GESTURES = ["pointerdown", "keydown", "touchend"];
function startOnGesture() {
  const wake = () => {
    GESTURES.forEach((name) => window.removeEventListener(name, wake, true));
    if (on) { start(); listeners.forEach((fn) => fn(on)); }
  };
  GESTURES.forEach((name) => window.addEventListener(name, wake, true));
}
// If it was left on, it starts with the visitor's first click or key.
if (on) startOnGesture();

/* The film playing on its own as the page opens: the sound is on, and
   starts at the visitor's first click, tap or key (see FilmPlayer's
   "Tap for sound"). Not remembered: it is not the visitor's choice yet. */
export function armSound() {
  if (on) return;
  on = true;
  listeners.forEach((fn) => fn(on));
  startOnGesture();
}

// The root of whatever is playing, for cues that should sit in its key.
const root = () => {
  if (!playing) return 62;
  const part = SCORE[playing];
  return part.chords[chordAt(playing, bar)][0] + 12;
};

/* A cue. Silent while sound is off.
     whoosh     air past the camera
     tone       a low bell on a cut, in the key of the music
     chime      a soft high bell as a card comes up
     ignite     the first point of light: a sub swell and a bell
     heartbeat  one low double thump
     riser      a build of `length` seconds into a hit
     hit        the impact: a boom, a crack and a wide chord
     tick       a quiet key press
     bloom      the chord that opens the frame
     braam      a trailer hit, for a chapter card
     swell      a rise of `length` seconds into a hit */
export function cue(kind, length = 1.6) {
  if (!on || !ctx || ctx.state !== "running") return;
  const now = ctx.currentTime + 0.01;
  switch (kind) {
    case "whoosh": noise(now, 1.1, 300, 2600, 0.12); return;
    case "tone": piano(root() + 12, now, 1.3); piano(root() + 19, now + 0.01, 0.6); bass(root() - 12, now, 0.4); return;
    case "chime": piano(root() + 36, now, 0.7); piano(root() + 43, now + 0.12, 0.45); return;
    case "ignite": {
      const osc = ctx.createOscillator(), out = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = hz(38);
      envelope(out, now, 0.25, 1.2, 0.6, 2.5);
      osc.connect(out).connect(master);
      osc.start(now); osc.stop(now + 4.5);
      piano(86, now + 0.05, 1); piano(93, now + 0.4, 0.5);
      return;
    }
    case "heartbeat": drum(now, 0.9, 70, 38, 0.5); drum(now + 0.24, 0.6, 66, 36, 0.5); return;
    case "riser": {
      noise(now, length, 200, 5200, 0.16, 0.97, 2.4);
      const osc = ctx.createOscillator(), out = ctx.createGain(), tone = ctx.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(hz(38), now);
      osc.frequency.exponentialRampToValueAtTime(hz(62), now + length);
      tone.type = "lowpass";
      tone.frequency.setValueAtTime(200, now);
      tone.frequency.exponentialRampToValueAtTime(2400, now + length);
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.05, now + length * 0.95);
      out.gain.exponentialRampToValueAtTime(0.0001, now + length + 0.05);
      osc.connect(tone).connect(out).connect(master);
      osc.start(now); osc.stop(now + length + 0.1);
      return;
    }
    case "hit": {
      drum(now, 2.2, 140, 28, 2.6);
      taiko(now + 0.01, 1.2);
      noise(now, 0.9, 6000, 600, 0.22, 0.02, 0.4);
      // The chord of the whole film, wide, ringing out in the hall.
      bass(33, now, 1.8);
      for (const midi of [45, 52, 57, 60, 64, 69]) organ(midi, now, 2.4, 1.7);
      flute(76, now + 0.02, 1.2);
      return;
    }
    case "tick": {
      const osc = ctx.createOscillator(), out = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 2400 + Math.random() * 400;
      out.gain.setValueAtTime(0.012, now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      osc.connect(out).connect(master);
      osc.start(now); osc.stop(now + 0.04);
      return;
    }
    case "bloom": {
      bass(33, now, 2.5);
      for (const midi of [57, 60, 64, 71]) organ(midi, now, 2.5, 1.1);
      flute(81, now + 0.1, 0.8);
      return;
    }
    case "braam": {
      // A trailer hit: a low organ cluster that swells, a drum under it.
      drum(now, 2, 120, 28, 2);
      crack(now, 1);
      for (const midi of [33, 40, 45, 52]) {
        const osc = ctx.createOscillator(), out = ctx.createGain(), tone = ctx.createBiquadFilter();
        osc.type = "sawtooth";
        osc.frequency.value = hz(midi);
        tone.type = "lowpass";
        tone.frequency.setValueAtTime(180, now);
        tone.frequency.exponentialRampToValueAtTime(1300, now + 0.35);
        tone.frequency.exponentialRampToValueAtTime(220, now + 2.2);
        envelope(out, now, 0.08, 0.05, 0.5, 1.9);
        osc.connect(tone).connect(out).connect(master);
        out.connect(verb);
        osc.start(now); osc.stop(now + 2.6);
      }
      return;
    }
    case "swell": {
      // Into a hit: noise rising and a cymbal played backwards, `length` long.
      noise(now, length, 300, 9000, 0.22, 0.96, 0.7);
      noise(now + length * 0.4, length * 0.6, 6000, 12000, 0.12, 0.98, 0.5);
      return;
    }
    default:
  }
}

// Fires `cue(kind)` when a value rises past `at`, once per rise.
export function cueOnRise(kind, at = 0.5) {
  let below = true;
  return (value) => {
    if (below && value >= at) { below = false; cue(kind); }
    else if (value < at * 0.5) below = true;
  };
}

// Pausing the film holds the score and every ringing note with it.
export function holdSound(next) {
  paused = next;
  if (!ctx) return;
  if (paused) ctx.suspend();
  else if (on && document.visibilityState === "visible") ctx.resume();
}
