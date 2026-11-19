/* The film's sound: off by default, and generated in the browser (no audio
   files). A quiet bed under each act, each in its own key, crossfading as
   the acts change and resolving home in the finale; it opens up and adds
   air as the visitor scrolls faster. Short cues on top: a whoosh, a low
   tone on a cut, a soft chime as a card comes up. With no film on the page
   (reduced motion, or a device that cannot play it) no act asks for a bed,
   so there is none.

   The choice is remembered in this browser. Browsers start audio only after
   a click or key press, which suits a switch that is off until pressed. */
const KEY = "film-sound";
let ctx = null, master = null, filter = null, air = null, on = false, banks = null, live = 0;

/* Each act's key: a root, its fifth and its octave (Hz). The finale comes
   home to the first act's key and adds the major third, so it resolves. */
export const BEDS = {
  act1: [73.42, 110, 146.83], // D
  act2: [87.31, 130.81, 174.61], // F
  act3: [55, 82.41, 110], // A
  act4: [65.41, 98, 130.81], // C
  finale: [73.42, 92.5, 146.83], // D, with F sharp
};
const BED_LEVEL = 0.75, CROSSFADE = 0.9;
// Which acts are on screen, most recent last. The bed follows the last one.
const showing = [];
let playing = null;
const listeners = new Set();

try { on = window.localStorage.getItem(KEY) === "1"; } catch { /* private mode: off */ }

export const soundOn = () => on;
export function onSoundChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function setSound(next) {
  on = next;
  try { window.localStorage.setItem(KEY, next ? "1" : "0"); } catch { /* not remembered */ }
  if (next) start(); else stop();
  listeners.forEach((fn) => fn(on));
}

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  // The bed: two banks of low, slightly detuned saws through a slowly
  // breathing filter. One plays while the other retunes, so a change of act
  // is a crossfade, not a slide.
  filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 320;
  filter.Q.value = 0.7;
  filter.connect(master);
  banks = [0, 1].map(() => {
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(filter);
    const voices = [0.035, 0.03, 0.018].map((level, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.detune.value = [-6, 5, 3][i];
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain).connect(out);
      osc.start();
      return osc;
    });
    return { out, voices };
  });
  applyBed(0.01);
  const lfo = ctx.createOscillator(), depth = ctx.createGain();
  lfo.frequency.value = 0.07;
  depth.gain.value = 90;
  lfo.connect(depth).connect(filter.frequency);
  lfo.start();
  // Air: filtered noise that rises with scroll speed.
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buffer;
  noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 900;
  band.Q.value = 0.6;
  air = ctx.createGain();
  air.gain.value = 0.004;
  noise.connect(band).connect(air).connect(master);
  noise.start();
  // Scroll speed opens the filter and lifts the air.
  let lastY = window.scrollY, lastT = performance.now();
  window.addEventListener("scroll", () => {
    if (!on) return;
    const now = performance.now(), dy = Math.abs(window.scrollY - lastY), dt = Math.max(16, now - lastT);
    lastY = window.scrollY; lastT = now;
    const speed = Math.min(1, dy / dt / 3);
    filter.frequency.setTargetAtTime(320 + speed * 1400, ctx.currentTime, 0.12);
    air.gain.setTargetAtTime(0.004 + speed * 0.03, ctx.currentTime, 0.1);
    clearTimeout(build.settle);
    build.settle = setTimeout(() => { filter.frequency.setTargetAtTime(320, ctx.currentTime, 0.6); air.gain.setTargetAtTime(0.004, ctx.currentTime, 0.6); }, 160);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") ctx.suspend(); else if (on) ctx.resume(); });
}

function start() {
  if (!ctx) build();
  ctx.resume();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.5);
}
function stop() {
  if (!ctx) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
}

function applyBed(fade = CROSSFADE) {
  if (!ctx || !banks) return;
  const want = showing.at(-1) ?? null;
  if (want === playing) return;
  playing = want;
  const now = ctx.currentTime;
  // The bank that was playing fades out; the other takes the new key and
  // fades in.
  banks[live].out.gain.setTargetAtTime(0, now, fade / 3);
  if (!want) return;
  live = 1 - live;
  const bank = banks[live];
  bank.voices.forEach((osc, i) => osc.frequency.setValueAtTime(BEDS[want][i], now));
  bank.out.gain.cancelScheduledValues(now);
  bank.out.gain.setValueAtTime(0, now);
  bank.out.gain.setTargetAtTime(BED_LEVEL, now, fade / 3);
}

/* An act says when its section is on screen; the bed crossfades to the key
   of the act that came on screen last, and goes quiet with none. */
export function showBed(name, visible) {
  const at = showing.indexOf(name);
  if (at >= 0) showing.splice(at, 1);
  if (visible && BEDS[name]) showing.push(name);
  applyBed();
}

// If it was left on, it starts with the visitor's first click or key.
if (on) {
  const wake = () => { ["pointerdown", "keydown"].forEach((name) => window.removeEventListener(name, wake, true)); if (on) start(); };
  ["pointerdown", "keydown"].forEach((name) => window.addEventListener(name, wake, true));
}

/* A short cue: "whoosh", "chime" or "tone". Silent while sound is off. */
export function cue(kind) {
  if (!on || !ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(master);
  if (kind === "whoosh") {
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(300, now);
    band.frequency.exponentialRampToValueAtTime(2600, now + 0.5);
    band.frequency.exponentialRampToValueAtTime(400, now + 1.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    noise.connect(band).connect(gain);
    noise.start(now);
    noise.stop(now + 1.2);
    return;
  }
  // A chime or a tone: a sine with a soft attack and a long tail.
  const osc = ctx.createOscillator();
  osc.type = "sine";
  // A tone on a cut sits in the key of the bed it lands on.
  const root = (BEDS[playing] ?? [55])[0] * 2;
  osc.frequency.value = kind === "tone" ? root * 2 : 880;
  const shimmer = ctx.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.value = kind === "tone" ? root * 3 : 1320;
  const peak = kind === "tone" ? 0.12 : 0.05, tail = kind === "tone" ? 3.5 : 1.4;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + tail);
  osc.connect(gain);
  const quiet = ctx.createGain();
  quiet.gain.value = 0.35;
  shimmer.connect(quiet).connect(gain);
  osc.start(now); shimmer.start(now);
  osc.stop(now + tail); shimmer.stop(now + tail);
}

// Fires `cue(kind)` when a value rises past `at`, once per rise.
export function cueOnRise(kind, at = 0.5) {
  let below = true;
  return (value) => {
    if (below && value >= at) { below = false; cue(kind); }
    else if (value < at * 0.5) below = true;
  };
}
