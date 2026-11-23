/* The cold open's score: for any moment, how bright, how grown, how formed.

   Pure maths over the shot list, so the timing lives in shots.js (change a
   shot's seconds and everything here moves with it), it can be tested, and
   skipping or starting part-way needs no state: ask for the values at t. */
import { SHOTS } from "../shots.js";
import { buildTimeline } from "../rig.js";

export const COLD_OPEN = buildTimeline(SHOTS.filter((shot) => shot.act === "CO"));
const start = (id) => COLD_OPEN.entries.find((entry) => entry.shot.id === id).t0;

// When each beat of the opening starts, in seconds.
export const T = {
  ignite: start("CO-02"),
  heart: start("CO-03"),
  pull: start("CO-04"),
  name: start("CO-05"),
  line: start("CO-06"),
  open: start("CO-07"),
  end: COLD_OPEN.seconds,
};
// The two heartbeats, and how long each one's ring takes to spread.
export const BEATS = [T.heart + 0.12, T.heart + 0.74];
const BEAT_SECONDS = 0.62;
// The name finishes forming here: the flash, and the light behind it.
export const IMPACT = T.name + 1.22;
// A returning visitor starts here, with the network already grown.
export const SHORT_START = T.name - 0.75;
// The cut the film plays now, as a trailer: from the point of light just
// before the pull back, through the network into the name, a little faster
// than life.
export const TRAILER_START = T.pull - 0.15;
export const TRAILER_SPEED = 1.25;

/* The cold open's sound, cue by cue (lib/sound.js plays them): the point
   ignites, two heartbeats, a riser under the pull back that lands as the
   name forms, then the chord that opens the frame. A returning visitor,
   who joins at the name, gets a shorter riser into the same hit. */
export const CUES = [
  { at: T.ignite, kind: "ignite", mode: "full" },
  { at: BEATS[0], kind: "heartbeat", mode: "full" },
  { at: BEATS[1], kind: "heartbeat", mode: "full" },
  { at: T.pull, kind: "riser", length: IMPACT - T.pull, mode: "full" },
  { at: SHORT_START, kind: "riser", length: IMPACT - SHORT_START, mode: "short" },
  { at: TRAILER_START, kind: "ignite", mode: "trailer" },
  { at: TRAILER_START, kind: "riser", length: IMPACT - TRAILER_START, mode: "trailer" },
  { at: IMPACT, kind: "hit" },
  { at: T.open, kind: "bloom" },
];
export const SUBTITLE = "I build agents, studies and apps. With proof.";

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const smooth = (u) => u * u * (3 - 2 * u);
const outCubic = (u) => 1 - (1 - u) ** 3;
const decay = (t, from, rate) => (t >= from ? Math.exp(-(t - from) * rate) : 0);

export function score(t) {
  const lit = ramp(t, T.ignite, T.ignite + 0.2);
  const beat = (at) => { const u = (t - at) / BEAT_SECONDS; return u >= 0 && u <= 1 ? u : -1; };
  const thump = Math.max(decay(t, BEATS[0], 7), decay(t, BEATS[1], 7));
  // Each heartbeat throws out a few nodes; the pull back reveals the rest.
  const firstNodes = 0.07 * smooth(ramp(t, BEATS[0], BEATS[0] + 0.5)) + 0.07 * smooth(ramp(t, BEATS[1], BEATS[1] + 0.5));
  const grow = firstNodes + 0.86 * outCubic(ramp(t, T.pull, T.pull + 1.45));
  const form = smooth(ramp(t, T.name + 0.08, IMPACT));
  const impact = decay(t, IMPACT, 5);
  // The shockwave off the impact: 0 to 1 as it spreads, -1 before and after.
  const shockAt = (t - IMPACT) / 0.9;
  const cut = t >= T.line; // the hard cut: the nebula is gone, only the name
  const open = smooth(ramp(t, T.open, T.end));
  return {
    // The point of light, and the streak of lens flare across it.
    core: lit * (0.8 + 0.7 * decay(t, T.ignite, 6)) * (1 - 0.92 * form) + thump * 0.8,
    flare: lit * (0.5 + 1.3 * decay(t, T.ignite, 4)) * (1 - form) + thump * 0.45 + impact * 2.4,
    beat1: beat(BEATS[0]),
    beat2: beat(BEATS[1]),
    grow,
    form,
    // Edges of the network, and the signals running along them.
    lines: cut ? 0 : smooth(ramp(t, BEATS[0], BEATS[0] + 0.3)) * (1 - smooth(ramp(t, T.name + 0.45, IMPACT))),
    signals: 0.35 + 1.5 * ramp(t, T.name - 0.3, T.name + 0.6),
    // Everything that is not the name.
    dust: cut ? 0.1 * (1 - open) : 1 - 0.7 * form,
    // The light behind the name flares as it lands, then settles low so the
    // letters stay readable against it.
    rays: smooth(ramp(t, IMPACT - 0.3, IMPACT + 0.1)) * (0.38 + 0.62 * decay(t, IMPACT + 0.1, 3.2)) * (cut ? 0.7 : 1) * (1 - open),
    impact,
    shock: shockAt >= 0 && shockAt <= 1 ? shockAt : -1,
    // The camera takes the blow and settles.
    shake: decay(t, IMPACT, 4.5),
    aberration: 0.0005 + 0.0025 * Math.sin(Math.PI * ramp(t, T.pull, T.pull + 1.3)) + impact * 0.007,
    bloom: 0.55 + thump * 0.35 + impact * 1,
    // The name's particles let go as the real page takes over.
    gone: open,
    bars: t < T.open,
    typed: Math.round(SUBTITLE.length * ramp(t, T.line + 0.12, T.line + 0.78)),
    // How opaque the whole overlay is: it lifts off the page at the end.
    veil: 1 - smooth(ramp(t, T.open + 0.08, T.end)),
  };
}
