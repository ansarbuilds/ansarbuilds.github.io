/* The camera rig: turns the shot list into a camera pose for any moment.

   Pure maths, no three.js and no DOM, so it runs in tests and the same code
   can drive the pre-vis now and the real film later.

   Each shot says where the camera ends up. Between shots the camera flies a
   smooth curve through those end points (a Catmull-Rom spline), so a run of
   shots reads as one continuous move. A shot marked `cut` starts on a hard
   cut instead: the camera is already in place and holds there. */

// Shots that play on their own (scroll: 0) still need some scrollbar in the
// pre-vis so they can be scrubbed: this many screens per second.
const SCRUB_SCREENS_PER_SECOND = 0.25;

export function buildTimeline(shots) {
  let time = 0;
  let screens = 0;
  const entries = shots.map((shot, index) => {
    const length = shot.scroll || shot.seconds * SCRUB_SCREENS_PER_SECOND;
    const entry = { shot, index, t0: time, t1: time + shot.seconds, s0: screens, s1: screens + length };
    time = entry.t1;
    screens = entry.s1;
    return entry;
  });
  return { entries, seconds: time, screens };
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// Pacing for a camera move: `out` leaves fast and settles (a dolly that
// lands), `inOut` eases both ends.
export const EASES = {
  linear: (u) => u,
  out: (u) => 1 - (1 - u) ** 3,
  inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - ((-2 * u + 2) ** 3) / 2),
};

// Scroll position (in screens) to film time (in seconds), and back.
export function timeAtScroll(timeline, screens) {
  const { entries } = timeline;
  if (screens <= 0) return 0;
  if (screens >= timeline.screens) return timeline.seconds;
  const entry = entries.find((candidate) => screens < candidate.s1);
  return entry.t0 + ((screens - entry.s0) / (entry.s1 - entry.s0)) * (entry.t1 - entry.t0);
}
export function scrollAtTime(timeline, seconds) {
  const { entries } = timeline;
  if (seconds <= 0) return 0;
  if (seconds >= timeline.seconds) return timeline.screens;
  const entry = entries.find((candidate) => seconds < candidate.t1);
  return entry.s0 + ((seconds - entry.t0) / (entry.t1 - entry.t0)) * (entry.s1 - entry.s0);
}

export function entryAtTime(timeline, seconds) {
  const { entries } = timeline;
  if (seconds >= timeline.seconds) return entries[entries.length - 1];
  return entries.find((candidate) => seconds < candidate.t1) ?? entries[0];
}

// Uniform Catmull-Rom between b and c, with a and d as the neighbours.
function spline(a, b, c, d, u) {
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
}
const splinePoint = (a, b, c, d, u) => [0, 1, 2].map((axis) => spline(a[axis], b[axis], c[axis], d[axis], u));

/* The camera at a moment of film time: { pos, look, fov, entry, progress }.
   `progress` is how far through the shot that moment is, 0 to 1. */
export function poseAt(timeline, seconds) {
  const { entries } = timeline;
  const entry = entryAtTime(timeline, seconds);
  const progress = clamp01((seconds - entry.t0) / (entry.t1 - entry.t0));
  const camera = (index) => entries[index].shot.camera;
  // How the move is paced. Linear unless the shot's camera names an ease.
  const eased = (EASES[entry.shot.camera.ease] ?? EASES.linear)(progress);
  const i = entry.index;
  // The move into this shot runs from the previous shot's camera (b) to this
  // one's (c). A cut has no move: the camera is already here.
  const starts = (index) => index === 0 || !!entries[index].shot.cut;
  const b = starts(i) ? i : i - 1;
  const c = i;
  // Neighbours shape the curve, but never reach across a cut.
  const a = starts(b) ? b : b - 1;
  const d = c + 1 < entries.length && !starts(c + 1) ? c + 1 : c;
  // No move to make (a cut, or the very first shot): hold on this camera.
  if (b === c) return { pos: [...camera(c).pos], look: [...camera(c).look], fov: camera(c).fov, entry, progress };
  const pick = (key) => splinePoint(camera(a)[key], camera(b)[key], camera(c)[key], camera(d)[key], eased);
  return {
    pos: pick("pos"),
    look: pick("look"),
    fov: camera(b).fov + (camera(c).fov - camera(b).fov) * eased,
    entry,
    progress,
  };
}

// 83.4 -> "01:23.4"
export function timecode(seconds) {
  const whole = Math.max(0, seconds);
  const minutes = Math.floor(whole / 60);
  const rest = (whole - minutes * 60).toFixed(1).padStart(4, "0");
  return `${String(minutes).padStart(2, "0")}:${rest}`;
}
