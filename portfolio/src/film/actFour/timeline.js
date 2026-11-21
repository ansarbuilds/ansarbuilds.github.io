/* Act IV's timing: the playground reel. The network collapses into a star
   (A4-01), then the camera flies on to the solar system (A4-02), the
   infinity ribbon (A4-03) and Emet's terminal (A4-04), each with a card
   that opens the real experiment. Camera from the shot list through the
   rig; pure maths, tested. */
import { SHOTS } from "../shots.js";
import { buildTimeline, timeAtScroll } from "../rig.js";

const shots = SHOTS.filter((shot) => shot.act === "A4");
const first = shots[0];
// The collapse is seen from close in, pulling back as it falls.
export const ACT_FOUR_SHOTS = [
  { ...first, id: "A4-00", seconds: 0.001, scroll: 0.001, cut: true, camera: { pos: [0, 1, -922], look: first.camera.look, fov: 50, move: "Close in" } },
  ...shots,
];
export const ACT_FOUR = buildTimeline(ACT_FOUR_SHOTS);
const entry = (id) => ACT_FOUR.entries.find((e) => e.shot.id === id);

// Which experiment each scene opens, by its id in EXPERIMENTS.
export const SCENES = [
  { shot: "A4-02", experiment: "solar" },
  { shot: "A4-03", experiment: "stars" },
  { shot: "A4-04", experiment: "emet" },
];

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const smooth = (u) => u * u * (3 - 2 * u);
export const timeAtProgress = (progress) => timeAtScroll(ACT_FOUR, clamp01(progress) * ACT_FOUR.screens);

export function moments(t) {
  const collapse = entry("A4-01");
  const progress = Object.fromEntries(["A4-01", "A4-02", "A4-03", "A4-04"].map((id) => { const e = entry(id); return [id, ramp(t, e.t0, e.t1)]; }));
  return {
    progress,
    collapse: smooth(ramp(t, collapse.t0, collapse.t1 - 0.4)),
    // The planets and their orbits appear round the new sun.
    planets: smooth(ramp(t, collapse.t1 - 0.3, collapse.t1 + 1.2)),
    // The solar system fades once the camera has left it (on a phone the
    // camera stands far enough back to see it in front of the ribbon).
    solar: 1 - smooth(ramp(progress["A4-03"], 0, 0.45)),
    title: smooth(ramp(t, collapse.t0 + 0.2, collapse.t0 + 0.8)) * (1 - smooth(ramp(t, collapse.t1 - 0.3, collapse.t1 + 0.2))),
    // A scene's card comes up once the camera has arrived, and goes as it leaves.
    cards: SCENES.map(({ shot }, i) => {
      const p = progress[shot];
      const last = i === SCENES.length - 1;
      return smooth(ramp(p, 0.58, 0.78)) * (last ? 1 : 1 - smooth(ramp(p, 0.94, 1)));
    }),
  };
}
