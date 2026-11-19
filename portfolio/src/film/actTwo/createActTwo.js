import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { poseAt } from "../rig.js";
import { SETS } from "../shots.js";
import { finishShader } from "../coldOpen/shaders.js";
import { ACT_TWO, BUILT, moments, shotsFor, timeAtProgress } from "./timeline.js";
import { cardVertex, streakFragment } from "./shaders.js";
import { BONE, SIGNAL, additive, points } from "./kit.js";
import { buildSaywhen } from "./sets/saywhen.js";
import { buildJarvis } from "./sets/jarvis.js";
import { buildFlightRecorder } from "./sets/flightRecorder.js";
import { buildPrhJepa } from "./sets/prhJepa.js";

/* Act II (the project sets) in plain three.js.

   createActTwo(canvas, { getProgress, onFrame, media }) builds every set in
   BUILT and returns { setActive, dispose }. Each set stands at its place in
   SETS, turned to face the camera's scene position, and is told each frame
   how far through its arrival and scene the film is. Only the set on screen
   plays its footage. */

const BUILDERS = { saywhen: buildSaywhen, jarvis: buildJarvis, "agent-flight-recorder": buildFlightRecorder, "prh-jepa": buildPrhJepa };

function pickQuality() {
  const low = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  return low ? { dust: 5000, dpr: Math.min(window.devicePixelRatio, 1.25) } : { dust: 12000, dpr: Math.min(window.devicePixelRatio, 1.75) };
}

// Dust along each approach, so the streak has something to rush past.
function buildDust(count) {
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const tint = new THREE.Color();
  const lines = BUILT.map((slug) => { const [arrive] = shotsFor(slug); return [SETS[slug].at, arrive.camera.pos]; });
  for (let i = 0; i < count; i++) {
    const [set, arrive] = lines[i % lines.length];
    const along = -0.2 + Math.random() * 3.8;
    const angle = Math.random() * Math.PI * 2, reach = 5 + 46 * Math.random() ** 0.8;
    for (let k = 0; k < 3; k++) positions[i * 3 + k] = set[k] + (arrive[k] - set[k]) * along;
    positions[i * 3] += Math.cos(angle) * reach;
    positions[i * 3 + 1] += Math.sin(angle) * reach * 0.6;
    tint.copy(BONE).lerp(SIGNAL, Math.random() ** 3).toArray(colors, i * 3);
  }
  return points(positions, colors, 0.08, { opacity: 0.5 });
}

export function createActTwo(canvas, { getProgress, onFrame, media }) {
  const quality = pickQuality();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(quality.dpr);
  renderer.setClearColor(0x050405, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 800);
  scene.add(camera);

  const dust = buildDust(quality.dust);
  scene.add(dust.mesh);

  const sets = BUILT.map((slug) => {
    const group = new THREE.Group();
    group.position.fromArray(SETS[slug].at);
    const [, sceneShot] = shotsFor(slug);
    group.lookAt(sceneShot.camera.pos[0], SETS[slug].at[1], sceneShot.camera.pos[2]);
    scene.add(group);
    return { slug, group, set: BUILDERS[slug]({ group, media }), playing: false };
  });

  // The streak, on a card held in front of the lens.
  const streakUniforms = { uStreak: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 } };
  const streakGeometry = new THREE.PlaneGeometry(2, 2);
  const streak = new THREE.Mesh(streakGeometry, additive({ uniforms: streakUniforms, vertexShader: cardVertex, fragmentShader: streakFragment }));
  streak.position.z = -1;
  streak.renderOrder = 10;
  streak.frustumCulled = false;
  camera.add(streak);

  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.45, 0.6);
  const finish = new ShaderPass(finishShader);
  finish.uniforms.uGrain.value = 0.016;
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  let width = 1, height = 1, fit = 1;
  const resize = () => {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setPixelRatio(quality.dpr);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fit = Math.min(1, Math.max(0.3, camera.aspect / 1.5));
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  let active = false, frame = 0, last = performance.now(), clock = 0, disposed = false;
  const look = new THREE.Vector3(), pos = new THREE.Vector3();
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
    // On a narrow screen the card covers the lower half: pan the frame down
    // so each set stands in the upper part, above it.
    const pan = (1 - Math.min(1, camera.aspect / 1.5)) * 0.62 * pos.distanceTo(look) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    pos.y -= pan;
    look.y -= pan;
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    streak.scale.set(half * camera.aspect, half, 1);
    const scale = renderer.domElement.height / (2 * half);

    const now = moments(t);
    dust.uniforms.uTime.value = clock;
    dust.uniforms.uScale.value = scale;
    let rush = 0;
    sets.forEach((item, i) => {
      const m = now[i];
      item.group.visible = m.here || m.arrive > 0 && m.scene < 1;
      if (m.here !== item.playing) { item.playing = m.here; item.set.setPlaying(m.here); }
      if (item.group.visible) item.set.update({ arrive: m.arrive, scene: m.scene, clock, scale, camera });
      rush = Math.max(rush, m.streak);
    });
    streakUniforms.uStreak.value = rush;
    streakUniforms.uTime.value = clock;
    streakUniforms.uAspect.value = camera.aspect;
    finish.uniforms.uTime.value = clock;
    finish.uniforms.uAberration.value = 0.001 + rush * 0.006;
    composer.render();
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
      dust.dispose();
      streakGeometry.dispose();
      streak.material.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
