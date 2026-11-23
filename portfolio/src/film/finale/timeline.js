/* The finale's timing: the signal returns (FN-01), then the line and the
   button (FN-02). Camera from the shot list through the rig. Pure, tested. */
import { SETS, SHOTS } from "../shots.js";
import { buildTimeline, timeAtScroll } from "../rig.js";

export const FINALE_SHOTS = SHOTS.filter((shot) => shot.act === "FN");
export const FINALE = buildTimeline(FINALE_SHOTS);
export const POINT = SETS.point.at;
const entry = (id) => FINALE.entries.find((e) => e.shot.id === id);

// Where a link to #contact lands, as a share of the section's scrolling: a
// little into the line, once the contact block is fully up.
export const CONTACT_AT = (entry("FN-02").s0 + 0.4) / FINALE.screens;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const smooth = (u) => u * u * (3 - 2 * u);
export const timeAtProgress = (progress) => timeAtScroll(FINALE, clamp01(progress) * FINALE.screens);

// The moment the line lands and the point bursts.
export const LAND = entry("FN-02").t0 + 0.3;

export function moments(t) {
  const signal = entry("FN-01");
  const shock = (t - LAND) / 1.2;
  return {
    // The point: the same first signal as the open, gathering itself...
    core: smooth(ramp(t, signal.t0, signal.t0 + 0.5)),
    flare: smooth(ramp(t, signal.t0, signal.t0 + 0.6)),
    gather: ramp(t, LAND - 0.7, LAND),
    // ...then bursting as the line lands: a flare, a shockwave, a jolt.
    burst: t >= LAND ? Math.exp(-(t - LAND) * 2.6) : 0,
    shock: shock >= 0 && shock <= 1 ? shock : -1,
    contact: smooth(ramp(t, LAND, LAND + 1)),
  };
}
