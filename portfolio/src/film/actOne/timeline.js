/* Act I's timing: one shot, A1-01, a slow drift forward while one sentence
   holds on screen. The scrollbar is the playhead: `screens` of scrolling
   through the act's section map to film time, then to a camera pose.
   Pure maths, tested in timeline.test.mjs. */
import { ACT_ONE as LAYOUT, SHOTS } from "../shots.js";
import { buildTimeline, timeAtScroll } from "../rig.js";

export const ACT_ONE_SHOTS = SHOTS.filter((shot) => shot.act === "A1");
export const ACT_ONE = buildTimeline(ACT_ONE_SHOTS);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const smooth = (u) => u * u * (3 - 2 * u);

// 0 to 1 through the act's section -> film time.
export const timeAtProgress = (progress) => timeAtScroll(ACT_ONE, clamp01(progress) * ACT_ONE.screens);

// The statement fades up as the act starts and is fully present for most of
// it. It does not slide around.
export function overlays(t) {
  return { statement: smooth(ramp(t, 0.1, 0.9)) };
}

export { LAYOUT };
