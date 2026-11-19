/* Act II's timing: the camera path through the project sets that are built,
   and what is on screen when.

   Each project is three beats: a hard cut held on a finished frame, the
   arrival (shot A2-nna: the camera settles wide on the set, under the
   letterbox, with the project's name as a title card), and the scene
   (A2-nnb: the camera pushes in while the set plays, and the project's card
   comes up). The scrollbar is the playhead. Pure maths, tested. */
import { SETS, SHOTS } from "../shots.js";
import { buildTimeline, timeAtScroll } from "../rig.js";

// The sets built so far, in film order. Each step of the build adds one.
import { BUILT } from "./built.js";
export { BUILT };

/* The joins between sets. Every set opens on a hard cut held for a beat on
   a finished frame (no rush, no fade), then the camera settles wide for the
   arrival. Where two sets share a shape, the cut is a match cut: the new
   set's subject lands exactly where the last one's stood, the same size, and
   the camera pulls back from there. A join is always far shorter than the
   scenes either side of it. */
const HOLD_SCROLL = 0.12, HOLD_SECONDS = 0.5;
// Where each set's subject stands in its own local space (mirrors the
// constants in sets/*.js: +z faces the scene camera, +x is screen right).
export const SUBJECTS = {
  saywhen: [0, 1, 0],
  jarvis: [2.4, 1.5, -4],
  "agent-flight-recorder": [0.6, 0.9, -1.2],
  "prh-jepa": [1.6, 1.4, -2.5],
  haloscript: [3, 0, -4],
  "digital-double": [2.6, 1.3, 0.4],
};
// Pairs that share a shape: the black box resolves into the cloud of points.
export const MATCHES = { "prh-jepa": "agent-flight-recorder" };

const sub = (a, b) => a.map((v, i) => v - b[i]);
export const shotsFor = (slug) => SHOTS.filter((shot) => shot.act === "A2" && shot.slug === slug);
const add = (a, b) => a.map((v, i) => v + b[i]);
// A set's group faces its scene camera about the vertical, as createActTwo
// turns it. Its yaw, and local to world and back.
const yawOf = (slug) => { const [, s] = shotsFor(slug); const at = SETS[slug].at; return Math.atan2(s.camera.pos[0] - at[0], s.camera.pos[2] - at[2]); };
const turn = ([x, y, z], yaw) => [x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw)];
const subjectAt = (slug) => add(SETS[slug].at, turn(SUBJECTS[slug], yawOf(slug)));

// The camera a set opens on. A match carries the last set's closing camera,
// relative to its subject and turned into the new set's frame. Otherwise the
// cut lands on the arrival's own wide frame and holds there.
export function openingCamera(slug) {
  const [arrive] = shotsFor(slug);
  const from = MATCHES[slug];
  // A held cut: a little tighter than the wide, on a longer lens, so the
  // arrival still has somewhere to settle to.
  if (!from) return { pos: arrive.camera.pos.map((v, i) => v + (arrive.camera.look[i] - v) * 0.14), look: arrive.camera.look, fov: 33, move: "Hard cut, held" };
  const [, last] = shotsFor(from);
  const carry = (point) => add(subjectAt(slug), turn(turn(sub(point, subjectAt(from)), -yawOf(from)), yawOf(slug)));
  return { pos: carry(last.camera.pos), look: carry(last.camera.look), fov: last.camera.fov, move: "Match cut on the subject, held" };
}

export const ACT_TWO_SHOTS = BUILT.flatMap((slug) => {
  const [arrive, scene] = shotsFor(slug);
  return [
    { id: `${arrive.id}-in`, act: "A2", slug, title: MATCHES[slug] ? "Match cut" : "Cut", seconds: HOLD_SECONDS, scroll: HOLD_SCROLL, cut: true, match: !!MATCHES[slug], camera: openingCamera(slug) },
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
    const c = entry(`${arriveShot.id}-in`), a = entry(arriveShot.id), s = entry(sceneShot.id);
    const arrive = ramp(t, a.t0, a.t1);
    const scene = ramp(t, s.t0, s.t1);
    const here = t >= c.t0 - 0.002 && (t < s.t1 || slug === BUILT.at(-1));
    return {
      slug,
      here,
      arrive,
      scene,
      // 1 while the opening cut is held, for the sound of the cut.
      cut: t >= c.t0 - 0.002 && t < c.t1 ? 1 : 0,
      // The name over the arrival, then the project's card over the scene.
      title: here ? smooth(ramp(arrive, 0.18, 0.4)) * (1 - smooth(ramp(arrive, 0.78, 1))) : 0,
      card: here ? smooth(ramp(scene, 0.12, 0.3)) : 0,
      bars: here && arrive < 1,
    };
  });
}
