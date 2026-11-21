import * as THREE from "three";
import { poseAt } from "../rig.js";
import { SETS } from "../shots.js";
import { ACT_TWO, BUILT, moments, shotsFor, timeAtProgress } from "./timeline.js";
import { buildSaywhen } from "./sets/saywhen.js";
import { buildDigitalDouble } from "./sets/digitalDouble.js";
import { attachFilm } from "../engine.js";

/* Act II (the project sets) in plain three.js.

   createActTwo(canvas, { getProgress, onFrame, media }) builds every set in
   BUILT and returns { setActive, dispose }. Each set stands at its place in
   SETS, turned to face the camera's scene position, and is told each frame
   how far through its arrival and scene the film is. Only the set on screen
   plays its footage. */

const BUILDERS = { saywhen: buildSaywhen, "digital-double": buildDigitalDouble };
// Bloom per set: low, with a high threshold, so only the screen glows and skin and hair do not.
const BLOOM = { saywhen: [0.2, 0.3, 0.85], "digital-double": [0.15, 0.3, 0.9] };

export function createActTwo(canvas, { getProgress, onFrame, media }) {
  // The shared renderer (see engine.js): this act draws into it, and its
  // frames are copied onto this canvas.
  const film = attachFilm(canvas, { clear: 0x050405, bloom: [0.2, 0.3, 0.85], grain: 0.008 });
  const renderer = film.renderer;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 800);
  scene.add(camera);

  const sets = BUILT.map((slug) => {
    const group = new THREE.Group();
    group.position.fromArray(SETS[slug].at);
    const [, sceneShot] = shotsFor(slug);
    group.lookAt(sceneShot.camera.pos[0], SETS[slug].at[1], sceneShot.camera.pos[2]);
    scene.add(group);
    return { slug, group, set: BUILDERS[slug]({ group, media, renderer }), playing: false };
  });

  const finish = film.finish;

  let width = 1, height = 1, fit = 1;
  const resize = () => {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    film.resize();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fit = Math.min(1, Math.max(0.3, camera.aspect / 1.5));
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  let drawn = false, active = false, frame = 0, last = performance.now(), clock = 0, disposed = false, settledFrames = 0;
  const look = new THREE.Vector3(), pos = new THREE.Vector3();
  let last3 = null;
  function tick(nowMs) {
    if (!active || disposed) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    clock += dt;
    const t = timeAtProgress(getProgress());
    const pose = poseAt(ACT_TWO, t);
    look.fromArray(pose.look);
    // A narrow screen sees less across, so the camera stands further back.
    pos.fromArray(pose.pos).sub(look).divideScalar(fit).add(look);
    if (camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const scale = film.pixelHeight / (2 * half);

    const now = moments(t);
    sets.forEach((item, i) => {
      const m = now[i];
      item.group.visible = m.here || m.arrive > 0 && m.scene < 1;
      if (m.here !== item.playing) { item.playing = m.here; item.set.setPlaying(m.here); }
      // Every frame of a set is a finished one: it is lit and assembled from
      // the cut on, never built up on screen.
      if (item.group.visible) item.set.update({ arrive: 1, scene: m.scene, clock, scale, camera });
      // The next set may want to start loading its heavier pieces now.
      if (m.here) sets[i + 1]?.set.prepare?.();
    });
    finish.uniforms.uTime.value = clock;
    // The portraits are holds: clean edges. The fringe only shows while the camera moves fast.
    const moved = last3 ? last3.distanceTo(pos) / Math.max(dt, 1e-3) : 0;
    last3 = (last3 ?? new THREE.Vector3()).copy(pos);
    finish.uniforms.uAberration.value = 0.0002 + Math.min(0.0008, moved * 0.00004);
    const here = sets.findIndex((item, i) => now[i].here);
    if (here >= 0) film.bloom.splice(0, 3, ...BLOOM[sets[here].slug]);
    // Before the act starts or after it ends only ambient motion is left (dust,
    // a caret), often while the next section plays beside it: a quarter of
    // the frames is enough there.
    if ((t <= 0 || t >= ACT_TWO.seconds) && settledFrames++ % 4) return;
    if (t > 0 && t < ACT_TWO.seconds) settledFrames = 0;
    // A set that is on screen but still waiting for its pictures is not a
    // finished frame: hold the last one drawn until it is. (Not drawing
    // leaves the canvas showing that frame.)
    if (drawn && sets.some((item) => item.group.visible && item.set.ready && !item.set.ready())) return;
    film.render(scene, camera, { now: nowMs, skip: t <= 0 || t >= ACT_TWO.seconds });
    drawn = true;
    onFrame?.(t, now);
  }

  return {
    setActive(on) {
      if (on === active || disposed) return;
      active = on;
      if (on) { last = performance.now(); frame = requestAnimationFrame(tick); }
      else {
        cancelAnimationFrame(frame);
        sets.forEach((item) => { if (item.playing) { item.playing = false; item.set.setPlaying(false); } });
      }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      sets.forEach(({ set }) => set.dispose());
      film.release();
    },
  };
}
