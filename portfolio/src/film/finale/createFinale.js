import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { poseAt } from "../rig.js";
import { finishShader, flareFragment, flareVertex } from "../coldOpen/shaders.js";
import { additive, points } from "../actTwo/kit.js";
import { FINALE, POINT, moments, timeAtProgress } from "./timeline.js";
import { createAdaptive } from "../adaptive.js";

/* The finale (FN-01 to FN-03) in plain three.js: everything the visitor
   passed, as points in the colours of each act, falls back into one point
   of light. That point is the cold open's signal, drawn with the same flare
   shader, so the film ends where it began. */

// The acts' colours: the signal, saywhen's violet, Jarvis's night blue, the
// recorder's orange, PRH-JEPA's red, Emet's green, and bone.
const PALETTE = ["#ff8a5f", "#9e52db", "#6b99ff", "#ff6b1f", "#ff4d38", "#5aff99", "#efe6d8"].map((c) => new THREE.Color(c));

function pickQuality() {
  const low = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  return low ? { count: 6000, dpr: Math.min(window.devicePixelRatio, 1.25) } : { count: 16000, dpr: Math.min(window.devicePixelRatio, 1.75) };
}

export function createFinale(canvas, { getProgress, onFrame }) {
  const quality = pickQuality();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(quality.dpr);
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 400);
  scene.add(camera);
  const point = new THREE.Vector3().fromArray(POINT);

  // The world, in a wide drifting field round the point.
  const start = new Float32Array(quality.count * 3), positions = new Float32Array(quality.count * 3), colors = new Float32Array(quality.count * 3);
  for (let i = 0; i < quality.count; i++) {
    const r = 8 + 90 * Math.random() ** 0.8, a = Math.random() * Math.PI * 2;
    start.set([Math.cos(a) * r * 1.3, (Math.random() - 0.5) * r * 0.6, Math.sin(a) * r * 0.9 - 10], i * 3);
    PALETTE[i % PALETTE.length].clone().multiplyScalar(0.55 + Math.random() * 0.45).toArray(colors, i * 3);
  }
  positions.set(start);
  const world = points(positions, colors, 0.08, { opacity: 0.9, far: 260, wobble: 0.15 });
  world.mesh.position.copy(point);
  scene.add(world.mesh);

  // The signal: the cold open's flare, on a card held in front of the lens.
  const flareUniforms = { uCore: { value: 0 }, uFlare: { value: 0 }, uBeat1: { value: -1 }, uBeat2: { value: -1 }, uAspect: { value: 1 } };
  const cardGeometry = new THREE.PlaneGeometry(2, 2);
  const flare = new THREE.Mesh(cardGeometry, additive({ uniforms: flareUniforms, vertexShader: flareVertex, fragmentShader: flareFragment }));
  flare.frustumCulled = false;
  scene.add(flare);

  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.6, 0.12);
  const finish = new ShaderPass(finishShader);
  finish.uniforms.uGrain.value = 0.022;
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  // Steps quality down if this device cannot keep up (see adaptive.js).
  const adaptive = createAdaptive({ quality, bloom, apply: () => { renderer.setPixelRatio(quality.dpr); resize(); } });

  let width = 1, height = 1;
  const resize = () => {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setPixelRatio(quality.dpr);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  let active = false, frame = 0, last = performance.now(), clock = 0, disposed = false, settledFrames = 0;
  const v = new THREE.Vector3();
  let folded = -1;
  function tick(nowMs) {
    if (!active || disposed) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    clock += dt;
    const t = timeAtProgress(getProgress());
    const pose = poseAt(FINALE, t);
    camera.position.fromArray(pose.pos);
    camera.lookAt(...pose.look);
    if (camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    const m = moments(t);

    // Fold the world in: far things last, on a slow turn.
    if (m.recede !== folded) {
      folded = m.recede;
      for (let i = 0; i < quality.count; i++) {
        v.fromArray(start, i * 3);
        const left = Math.max(0, 1 - m.recede * (1.2 - v.length() / 200)) ** 1.5;
        const turn = (1 - left) * 1.6;
        const c = Math.cos(turn), s = Math.sin(turn);
        positions[i * 3] = (v.x * c - v.z * s) * left;
        positions[i * 3 + 1] = v.y * left;
        positions[i * 3 + 2] = (v.x * s + v.z * c) * left;
      }
      world.mesh.geometry.attributes.position.needsUpdate = true;
    }
    world.uniforms.uOpacity.value = 0.9 * (1 - smooth01((m.recede - 0.82) / 0.18));
    world.uniforms.uTime.value = clock;
    world.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

    // Keep the flare card filling the frame, at the point.
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distance = camera.position.distanceTo(point);
    flare.position.copy(point);
    flare.quaternion.copy(camera.quaternion);
    flare.scale.set(distance * half * camera.aspect, distance * half, 1);
    flareUniforms.uCore.value = m.core * (0.9 + 0.1 * Math.sin(clock * 2.2));
    flareUniforms.uFlare.value = m.flare;
    flareUniforms.uAspect.value = camera.aspect;

    if ((t <= 0 || t >= FINALE.seconds) && settledFrames++ % 4) return;
    if (t > 0 && t < FINALE.seconds) settledFrames = 0;
    finish.uniforms.uTime.value = clock;
    adaptive.frame(nowMs, t <= 0 || t >= FINALE.seconds);
    composer.render();
    onFrame?.(t, m);
  }
  const smooth01 = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };

  return {
    setActive(on) {
      if (on === active || disposed) return;
      active = on;
      if (on) { last = performance.now(); frame = requestAnimationFrame(tick); } else cancelAnimationFrame(frame);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      world.dispose();
      cardGeometry.dispose();
      flare.material.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
