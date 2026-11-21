/* Act II's timing: the camera path through the two sets, and what is on
   screen when.

   Each project is two beats: the arrival (A2-nna: a hard cut onto a finished
   frame, held, no title card) and the scene (A2-nnb: the camera eases in a
   short way and holds; the hold is the poster, and the project's caption
   fades up once it has started). There is no match cut: the two sets do not
   share a shape. The scrollbar is the playhead. Pure maths, tested. */
import { SHOTS } from "../shots.js";
import { buildTimeline, timeAtScroll } from "../rig.js";

// The sets built so far, in film order. Each step of the build adds one.
import { BUILT } from "./built.js";
export { BUILT };

export const shotsFor = (slug) => SHOTS.filter((shot) => shot.act === "A2" && shot.slug === slug);

export const ACT_TWO_SHOTS = BUILT.flatMap(shotsFor);
export const ACT_TWO = buildTimeline(ACT_TWO_SHOTS);
const entry = (id) => ACT_TWO.entries.find((e) => e.shot.id === id);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const smooth = (u) => u * u * (3 - 2 * u);
export const timeAtProgress = (progress) => timeAtScroll(ACT_TWO, clamp01(progress) * ACT_TWO.screens);

/* For each built project: how far through its arrival and scene the film is
   (0 to 1, both 0 before it and 1 after), and the caption. */
export function moments(t) {
  return BUILT.map((slug) => {
    const [arriveShot, sceneShot] = shotsFor(slug);
    const a = entry(arriveShot.id), s = entry(sceneShot.id);
    const arrive = ramp(t, a.t0, a.t1);
    const scene = ramp(t, s.t0, s.t1);
    const here = t >= a.t0 - 0.002 && (t < s.t1 || slug === BUILT.at(-1));
    return {
      slug,
      here,
      arrive,
      scene,
      // 1 while the cut is held, for the sound of the cut.
      cut: t >= a.t0 - 0.002 && t < a.t1 ? 1 : 0,
      // The caption comes up after the camera has stopped.
      card: here ? smooth(ramp(scene, 0.55, 0.8)) : 0,
    };
  });
}
