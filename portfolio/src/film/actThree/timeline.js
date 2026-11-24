/* Act III's timing and camera: the monoliths rise (A3-01), then the camera
   circles them (A3-02) and each one's carved names light up as it turns to
   the camera.

   A camera path through two keyframes is a straight line, not an orbit, so
   this act flies a real arc between the storyboard's two cameras: from in
   front of the monoliths, round to their right. The timing still comes
   from the shot list. Pure maths, tested in timeline.test.mjs. */
import { SETS, SHOTS } from "../shots.js";
import { buildTimeline, timeAtScroll } from "../rig.js";
import { BUILT, closingFraming } from "../actTwo/timeline.js";

export const ACT_THREE_SHOTS = SHOTS.filter((shot) => shot.act === "A3");
export const ACT_THREE = buildTimeline(ACT_THREE_SHOTS);
export const CENTRE = SETS.monoliths.at;
const [riseShot, orbitShot] = ACT_THREE_SHOTS;
const riseEntry = ACT_THREE.entries[0], orbitEntry = ACT_THREE.entries[1];

// The three monoliths, left to right, each turned so that it faces the
// camera at a different point of the orbit.
export const PILLARS = [
  { x: -11, height: 15, yaw: 0.2 },
  { x: 0, height: 18, yaw: 1.15 },
  { x: 11, height: 15, yaw: 2.1 },
];

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const smooth = (u) => u * u * (3 - 2 * u);
const lerp = (a, b, u) => a + (b - a) * u;
export const timeAtProgress = (progress) => timeAtScroll(ACT_THREE, clamp01(progress) * ACT_THREE.screens);

// Where a storyboard camera sits relative to the monoliths: angle round
// them (0 is straight in front), distance and height.
function polar(pos) {
  const dx = pos[0] - CENTRE[0], dz = pos[2] - CENTRE[2];
  return { angle: Math.atan2(dx, dz), radius: Math.hypot(dx, dz), height: pos[1] };
}
const START = polar(riseShot.camera.pos);
const END = polar(orbitShot.camera.pos);

/* The way in: a match back to the last thing Act II showed. The act opens
   on a hard cut, held, with the middle monolith already standing exactly
   where the last set's subject stood, in the same framing. Then the
   camera drops back to the low angle and the other two rise beside it. The
   hold is a small share of the rise, so the join is shorter than the shots
   it joins, and both its ends are finished frames. */
export const MATCH_SHARE = 0.18;
const MIDDLE = 1;
// The middle monolith's centre takes the last subject's place. It is far
// bigger, so that set's closing framing is scaled up (by its height over
// 3.6 units, the subject's size in the set) to keep the same size in frame.
const FACE = [CENTRE[0] + PILLARS[MIDDLE].x, CENTRE[1] + PILLARS[MIDDLE].height * 0.5, CENTRE[2]];
const SCALE = PILLARS[MIDDLE].height / 3.6;
const yawTurn = ([x, y, z], yaw) => [x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw)];
// An offset in the monolith's own space (+z out of its carved face) to world.
const onFace = (offset) => yawTurn(offset.map((v) => v * SCALE), PILLARS[MIDDLE].yaw).map((v, i) => v + FACE[i]);
const framing = closingFraming(BUILT.at(-1));
export const MATCH = { pos: onFace(framing.pos), look: onFace(framing.look), fov: framing.fov };
const matchEnd = () => riseEntry.t0 + (riseEntry.t1 - riseEntry.t0) * MATCH_SHARE;
const mix3 = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));

export function cameraAt(t) {
  const base = baseCameraAt(t);
  const away = smooth(ramp(t, matchEnd(), riseEntry.t1));
  if (away >= 1) return base;
  return { ...base, pos: mix3(MATCH.pos, base.pos, away), look: mix3(MATCH.look, base.look, away), fov: lerp(MATCH.fov, base.fov, away) };
}

function baseCameraAt(t) {
  const rise = smooth(ramp(t, riseEntry.t0, riseEntry.t1));
  const orbit = smooth(ramp(t, orbitEntry.t0, orbitEntry.t1));
  // Rising: low and a little further off, tilting up as they climb.
  const angle = lerp(START.angle, END.angle, orbit);
  const radius = lerp(START.radius + 6 * (1 - rise), END.radius, orbit);
  const height = lerp(lerp(3, START.height, rise), END.height, orbit);
  const lookY = lerp(lerp(2, riseShot.camera.look[1], rise), orbitShot.camera.look[1], orbit);
  return {
    pos: [CENTRE[0] + Math.sin(angle) * radius, CENTRE[1] + height, CENTRE[2] + Math.cos(angle) * radius],
    look: [CENTRE[0], CENTRE[1] + lookY, CENTRE[2]],
    fov: lerp(riseShot.camera.fov, orbitShot.camera.fov, orbit),
    angle,
  };
}

// How squarely a monolith faces the camera, -1 to 1.
export const facing = (angle, pillar) => Math.cos(angle - pillar.yaw);

// When each rising monolith starts, and when it lands.
const riseStart = (i) => matchEnd() + i * 0.2;
export const landAt = (i) => matchEnd() + 1.4 + i * 0.2;

export function moments(t) {
  const { angle } = cameraAt(t);
  const orbiting = t >= orbitEntry.t0;
  const faces = PILLARS.map((pillar) => facing(angle, pillar));
  const best = faces.indexOf(Math.max(...faces));
  return {
    // 1 while the opening match cut is held, for the sound of the cut.
    held: t < matchEnd() ? 1 : 0,
    // Each rises in turn, out of the ground, gathering speed, and slams to
    // a stop. The middle one is the match and already stands; the other two
    // rise beside it once the held cut is over.
    rise: PILLARS.map((_, i) => (i === MIDDLE ? 1 : ramp(t, riseStart(i), landAt(i)) ** 2)),
    // The slams: a jolt that dies away, and a shockwave across the ground
    // from each one's foot (0 to 1 as it spreads, -1 when there is none).
    slam: Math.max(0, ...PILLARS.map((_, i) => (i !== MIDDLE && t >= landAt(i) ? Math.exp(-(t - landAt(i)) * 6) : 0))),
    wave: PILLARS.map((_, i) => { const u = (t - landAt(i)) / 0.9; return i !== MIDDLE && u >= 0 && u <= 1 ? u : -1; }),
    // Carved names glow as their monolith faces the camera.
    glow: faces.map((face) => smooth(ramp(face, 0.55, 0.95)) * (orbiting ? 1 : 0.25)),
    title: smooth(ramp(t, riseEntry.t0 + 0.6, riseEntry.t0 + 1.3)) * (1 - smooth(ramp(t, orbitEntry.t0 - 0.2, orbitEntry.t0 + 0.4))),
    // One card at a time: the monolith facing the camera most.
    card: PILLARS.map((_, i) => (orbiting && i === best ? smooth(ramp(faces[i], 0.8, 0.96)) * smooth(ramp(t, orbitEntry.t0 + 0.45, orbitEntry.t0 + 1)) : 0)),
  };
}
