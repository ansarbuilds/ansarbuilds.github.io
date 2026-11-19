/* The finale's timing: everything recedes into one point of light (FN-01),
   the contact line and the email (FN-02), the credits rolling into the
   footer (FN-03). Camera from the shot list through the rig. Pure, tested. */
import { SETS, SHOTS } from "../shots.js";
import { buildTimeline, timeAtScroll } from "../rig.js";

export const FINALE_SHOTS = SHOTS.filter((shot) => shot.act === "FN");
export const FINALE = buildTimeline(FINALE_SHOTS);
export const POINT = SETS.point.at;
const entry = (id) => FINALE.entries.find((e) => e.shot.id === id);

// Where a link to #contact lands, as a share of the section's scrolling: a
// little into the contact beat, once the contact block is fully up.
export const CONTACT_AT = (entry("FN-02").s0 + 0.4) / FINALE.screens;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const smooth = (u) => u * u * (3 - 2 * u);
export const timeAtProgress = (progress) => timeAtScroll(FINALE, clamp01(progress) * FINALE.screens);

export function moments(t) {
  const recede = entry("FN-01"), contact = entry("FN-02"), credits = entry("FN-03");
  const pull = smooth(ramp(t, recede.t0, recede.t1));
  return {
    // Everything the visitor passed falls back into the point.
    recede: pull,
    // The point: faint at first, then the first signal again.
    core: 0.25 + 0.75 * smooth(ramp(t, recede.t1 - 1, recede.t1 + 0.4)),
    flare: smooth(ramp(t, recede.t1 - 0.6, recede.t1 + 0.6)) * (1 - 0.5 * smooth(ramp(t, credits.t0, credits.t1))),
    contact: smooth(ramp(t, contact.t0 + 0.3, contact.t0 + 1.3)),
    // The credits roll up from below as the last shot plays.
    credits: smooth(ramp(t, credits.t0, credits.t1)),
  };
}
