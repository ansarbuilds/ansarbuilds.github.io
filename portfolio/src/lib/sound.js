/* The film's sound: off by default, and generated in the browser (no audio
   files). A low ambient pad that opens up and adds air as the visitor
   scrolls faster, and short cues: a whoosh on a light-speed streak, a soft
   chime as a card comes up, one tone for the finale.

   The choice is remembered in this browser. Browsers start audio only after
   a click or key press, which suits a switch that is off until pressed. */
const KEY = "film-sound";
let ctx = null, master = null, filter = null, air = null, on = false;
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
  // The pad: two low, slightly detuned saws through a slowly breathing filter.
  filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 320;
  filter.Q.value = 0.7;
  filter.connect(master);
  for (const [freq, detune] of [[55, -6], [82.41, 5], [110, 3]]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const gain = ctx.createGain();
    gain.gain.value = freq === 110 ? 0.018 : 0.035;
    osc.connect(gain).connect(filter);
    osc.start();
  }
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
  osc.frequency.value = kind === "tone" ? 220 : 880;
  const shimmer = ctx.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.value = kind === "tone" ? 330 : 1320;
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
