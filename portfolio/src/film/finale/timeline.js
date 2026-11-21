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

export function moments(t) {
  const signal = entry("FN-01"), contact = entry("FN-02");
  return {
    // The point: the same first signal as the open, then it holds.
    core: smooth(ramp(t, signal.t0, signal.t0 + 0.5)),
    flare: smooth(ramp(t, signal.t0, signal.t0 + 0.6)),
    contact: smooth(ramp(t, contact.t0 + 0.3, contact.t0 + 1.3)),
  };
}
