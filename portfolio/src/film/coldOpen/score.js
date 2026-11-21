/* The cold open's score: for any moment, how bright the point is and how
   opaque the layer over the hero is.

   Pure maths over the shot list, so the timing lives in shots.js (change a
   shot's seconds and everything here moves with it), it can be tested, and
   skipping or starting part-way needs no state: ask for the values at t.

   Three shots: black (CO-01), the signal (CO-02), hand over (CO-03). */
import { SHOTS } from "../shots.js";
import { buildTimeline } from "../rig.js";

export const COLD_OPEN = buildTimeline(SHOTS.filter((shot) => shot.act === "CO"));
const start = (id) => COLD_OPEN.entries.find((entry) => entry.shot.id === id).t0;

// When each beat starts, in seconds.
export const T = {
  ignite: start("CO-02"),
  open: start("CO-03"),
  end: COLD_OPEN.seconds,
};
// The flare is thrown when the point appears.
export const IMPACT = T.ignite;
// The layer lifts over the last 0.7 seconds.
export const LIFT = 0.7;
// A returning visitor starts with the point already lit, and sees it for
// under a second.
export const SHORT_START = T.end - LIFT - 0.2;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const smooth = (u) => u * u * (3 - 2 * u);
const decay = (t, from, rate) => (t >= from ? Math.exp(-(t - from) * rate) : 0);

export function score(t) {
  // The point eases in over 200 milliseconds.
  const lit = ramp(t, T.ignite, T.ignite + 0.2);
  const flash = decay(t, IMPACT, 4);
  return {
    // The point of light, and the one soft flare across it that decays.
    core: lit,
    flare: lit * (0.15 + 0.85 * flash),
    bloom: 0.45 + flash * 0.25,
    // Almost off: the fringe only shows while a camera moves, and this one is locked.
    aberration: 0.0002,
    // The hero is underneath and starts its own entrance as the layer lifts.
    gone: smooth(ramp(t, T.end - LIFT, T.end)),
    // How opaque the whole overlay is.
    veil: 1 - smooth(ramp(t, T.end - LIFT, T.end)),
  };
}
