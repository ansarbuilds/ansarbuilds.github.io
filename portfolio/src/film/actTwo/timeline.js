/* Act II's timing: the camera path through the project sets that are built,
   and what is on screen when.

   Each project is three beats: a hard cut into a light-speed streak, the
   arrival (shot A2-nna: the camera settles wide on the set, under the
   letterbox, with the project's name as a title card), and the scene
   (A2-nnb: the camera pushes in while the set plays, and the project's card
   comes up). The scrollbar is the playhead. Pure maths, tested. */
import { SETS, SHOTS } from "../shots.js";
import { buildTimeline, timeAtScroll } from "../rig.js";

// The sets built so far, in film order. Each step of the build adds one.
import { BUILT } from "./built.js";
export { BUILT };

// The streak starts this far back along the line the camera arrives on, with
// a wide lens, so the arrival reads as a rush.
const STREAK_FROM = 150;
const STREAK_FOV = 64;

const sub = (a, b) => a.map((v, i) => v - b[i]);
const unit = (v) => { const length = Math.hypot(...v); return v.map((x) => x / length); };

export const shotsFor = (slug) => SHOTS.filter((shot) => shot.act === "A2" && shot.slug === slug);

export const ACT_TWO_SHOTS = BUILT.flatMap((slug) => {
  const [arrive, scene] = shotsFor(slug);
  const away = unit(sub(arrive.camera.pos, SETS[slug].at));
  const from = arrive.camera.pos.map((v, i) => v + away[i] * STREAK_FROM);
  return [
    { id: `${arrive.id}-in`, act: "A2", slug, title: "Streak", seconds: 0.001, scroll: 0.001, cut: true, camera: { pos: from, look: SETS[slug].at, fov: STREAK_FOV, move: "Cut into the streak" } },
    arrive,
    scene,
  ];
});
export const ACT_TWO = buildTimeline(ACT_TWO_SHOTS);
const entry = (id) => ACT_TWO.entries.find((e) => e.shot.id === id);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const smooth = (u) => u * u * (3 - 2 * u);
export const timeAtProgress = (progress) => timeAtScroll(ACT_TWO, clamp01(progress) * ACT_TWO.screens);

/* For each built project: how far through its arrival and scene the film is
   (0 to 1, both 0 before it and 1 after), and the overlays. */
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
      // The rush: strongest on the cut, gone as the camera settles.
      streak: here ? (1 - smooth(ramp(arrive, 0, 0.7))) * (arrive < 1 ? 1 : 0) : 0,
      // The name over the arrival, then the project's card over the scene.
      title: here ? smooth(ramp(arrive, 0.18, 0.4)) * (1 - smooth(ramp(arrive, 0.78, 1))) : 0,
      card: here ? smooth(ramp(scene, 0.12, 0.3)) : 0,
      bars: here && arrive < 1,
    };
  });
}
