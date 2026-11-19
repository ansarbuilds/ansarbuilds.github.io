/* Act I's timing: the camera path, and when each part of it is on screen.

   The act starts on the cold open's last camera (CO-07, the name framed
   as the hero shows it) and flies shots A1-01 to A1-03. The scrollbar is
   the playhead: `screens` of scrolling through the act's section map to
   film time, then to a camera pose. Pure maths, tested in timeline.test.mjs. */
import { ACT_ONE as LAYOUT, SHOTS } from "../shots.js";
import { buildTimeline, timeAtScroll } from "../rig.js";

const opening = SHOTS.find((shot) => shot.id === "CO-07");
export const ACT_ONE_SHOTS = [
  // A held first frame: the cold open's closing shot, so the act opens where it ended.
  { ...opening, id: "A1-00", act: "A1", seconds: 0.001, scroll: 0.001, cut: true },
  ...SHOTS.filter((shot) => shot.act === "A1"),
];
export const ACT_ONE = buildTimeline(ACT_ONE_SHOTS);
export const startOf = (id) => ACT_ONE.entries.find((entry) => entry.shot.id === id).t0;
export const endOf = (id) => ACT_ONE.entries.find((entry) => entry.shot.id === id).t1;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const smooth = (u) => u * u * (3 - 2 * u);

// 0 to 1 through the act's section -> film time.
export const timeAtProgress = (progress) => timeAtScroll(ACT_ONE, clamp01(progress) * ACT_ONE.screens);

// How far a number has counted, from how close the camera is to it along the
// path: it starts as the camera comes within 60 units and lands at 30,
// while the number is still well inside the frame.
export function numberProgress(cameraZ, numberZ) {
  return smooth(ramp(cameraZ - numberZ, 60, 30));
}

// The value a number shows at that progress: "10+" counts 0, 1, ... 10, then
// gains its "+" when it lands.
export function countAt(value, progress) {
  const match = /^(\d+)(.*)$/.exec(value);
  if (!match) return value;
  const target = Number(match[1]);
  if (progress >= 1) return value;
  const eased = 1 - (1 - progress) ** 2;
  return String(Math.min(target, Math.floor(eased * (target + 1))));
}

// Title cards and captions over the frame, 0 to 1.
export function overlays(t) {
  // After the camera is through the name, gone before the first number rises.
  const statementIn = endOf("A1-01") - 1.1, statementOut = startOf("A1-02") + 0.9;
  return {
    statement: smooth(ramp(t, statementIn, statementIn + 0.6)) * (1 - smooth(ramp(t, statementOut, statementOut + 0.5))),
    tools: smooth(ramp(t, startOf("A1-03") + 0.2, startOf("A1-03") + 1)),
    // The name parts for the camera on its way through.
    part: smooth(ramp(t, startOf("A1-01") + 0.6, startOf("A1-01") + 2.2)),
  };
}

export { LAYOUT };
