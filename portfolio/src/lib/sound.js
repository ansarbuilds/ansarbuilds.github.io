/* The film's sound: off by default, and generated in the browser (no audio
   files). A score in the manner of a launch film: each act has its own
   chord progression (lib/score.js) played on warm pads, a bass and a soft
   piano figure, in one reverb space. It moves to the next act's music on
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
function hall(seconds = 3.2) {
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
  // Master, with a gentle compressor to glue the score and the cues.
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -18;
  glue.ratio.value = 3;
  glue.attack.value = 0.02;
  glue.release.value = 0.3;
  glue.connect(ctx.destination);
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(glue);
  // The reverb every voice sends into.
  verb = ctx.createGain();
  verb.gain.value = 0.55;
  const space = hall();
  verb.connect(space).connect(master);
  // The music bus: pads go through one low-pass that scrolling opens.
  music = ctx.createGain();
  music.gain.value = 0.8;
  music.connect(master);
  padTone = ctx.createBiquadFilter();
  padTone.type = "lowpass";
  padTone.frequency.value = 900;
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
    padTone.frequency.setTargetAtTime(900 + speed * 2200, ctx.currentTime, 0.15);
    air.gain.setTargetAtTime(speed * 0.025, ctx.currentTime, 0.1);
    clearTimeout(settle);
    settle = setTimeout(() => { padTone.frequency.setTargetAtTime(900, ctx.currentTime, 0.8); air.gain.setTargetAtTime(0, ctx.currentTime, 0.6); }, 160);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") ctx.suspend(); else if (on) ctx.resume(); });
  setInterval(schedule, 50);
}

function start() {
  if (!ctx) build();
  ctx.resume();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.7, ctx.currentTime, 0.4);
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

// A pad note: two detuned saws and a sine an octave down, slow in and out.
function pad(midi, at, length, level) {
  const out = ctx.createGain();
  const end = envelope(out, at, 0.022 * level, 1.4, Math.max(0, length - 1.4), 2.6);
  out.connect(padTone);
  ring(out, end);
  for (const [type, detune, mul] of [["sawtooth", -7, 1], ["sawtooth", 7, 1], ["sine", 0, 0.5]]) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = hz(midi) * mul;
    osc.detune.value = detune;
    osc.connect(out);
    osc.start(at);
    osc.stop(end + 0.05);
  }
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
  for (const midi of notes.slice(1)) pad(midi, at, length, part.padLevel);
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
      if (midi !== null) piano(midi, stepAt, inBar === 0 ? 1 : 0.75);
      if (part.pulse === "soft" && inBar % 2 === 0) drum(stepAt, inBar === 0 ? 0.5 : 0.28, 80, 45, 0.35);
      if (part.pulse === "drum" && inBar === part.steps / 2) drum(stepAt, 0.5);
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

// If it was left on, it starts with the visitor's first click or key.
if (on) {
  const wake = () => { ["pointerdown", "keydown"].forEach((name) => window.removeEventListener(name, wake, true)); if (on) start(); };
  ["pointerdown", "keydown"].forEach((name) => window.addEventListener(name, wake, true));
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
     bloom      the chord that opens the frame */
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
      drum(now, 1.6, 140, 32, 2.2);
      noise(now, 0.9, 6000, 600, 0.22, 0.02, 0.4);
      // The chord of the whole film, wide, ringing out in the hall.
      bass(38, now, 1.5);
      for (const midi of [50, 57, 62, 66, 69, 74]) pad(midi, now, 1.4, 1.6);
      piano(74, now, 1.4); piano(81, now + 0.02, 0.9);
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
      bass(38, now, 2.5);
      for (const midi of [57, 61, 64, 66]) pad(midi, now, 2.5, 1);
      piano(78, now + 0.1, 0.8);
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
