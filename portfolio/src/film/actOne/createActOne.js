import * as THREE from "three";
import { poseAt } from "../rig.js";
import { ACT_ONE, LAYOUT, overlays, timeAtProgress } from "./timeline.js";
import { riverFragment, riverVertex } from "./shaders.js";
import { CODE_LINES } from "./codeLines.js";
import { attachFilm } from "../engine.js";

/* Act I (storyboard A1-01) in plain three.js: one slow drift forward in the
   dark, over a very dim river of code that runs low in the frame and never
   crosses the words.

   createActOne(canvas, { getProgress, onFrame }) builds the scene and returns
   { setActive, dispose }. While active it draws every frame: it asks
   `getProgress()` how far the visitor has scrolled through the act (0 to 1),
   turns that into film time and a camera pose, and tells the page through
   `onFrame(t, overlays)` so it can place the sentence. */

const additive = (options) => new THREE.ShaderMaterial({ blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, ...options });

function buildRiver(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 2048;
  const context = canvas.getContext("2d");
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = "500 17px JetBrains Mono, monospace";
  context.textBaseline = "top";
  const columns = [24, 360, 696];
  let line = 0;
  for (const x of columns) {
    for (let y = 8; y < canvas.height - 20; y += 26) {
      const text = CODE_LINES[line++ % CODE_LINES.length];
      // Most lines dim, every so often one lit up like a signal passing.
      context.fillStyle = line % 11 === 0 ? "#ff8a5f" : line % 4 === 0 ? "#8a8075" : "#4a443e";
      context.fillText(text, x, y);
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  map.colorSpace = THREE.SRGBColorSpace;
  const { y, from, to, width } = LAYOUT.river;
  const geometry = new THREE.PlaneGeometry(width, from - to);
  const uniforms = { uMap: { value: map }, uFlow: { value: 0 }, uRepeat: { value: 4 }, uOpacity: { value: 0.3 } };
  const mesh = new THREE.Mesh(geometry, additive({ uniforms, vertexShader: riverVertex, fragmentShader: riverFragment }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y, (from + to) / 2);
  mesh.frustumCulled = false;
  return { mesh, uniforms, dispose: () => { geometry.dispose(); map.dispose(); mesh.material.dispose(); } };
}

export function createActOne(canvas, { getProgress, onFrame }) {
  // The shared renderer (see engine.js): this act draws into it, and its
  // frames are copied onto this canvas. Low bloom: nothing here should glow.
  const film = attachFilm(canvas, { clear: 0x070605, bloom: [0.15, 0.4, 0.7], grain: 0.008 });
  const renderer = film.renderer;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 600);
  const river = buildRiver(renderer);
  scene.add(river.mesh);

  const resize = () => {
    film.resize();
    camera.aspect = (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight);
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  let active = false, frame = 0, clock = 0, last = performance.now(), disposed = false, settledFrames = 0;
  // Scroll position is read every frame, not from scroll events, so the
  // camera never lags the page.
  function tick(nowMs) {
    if (!active || disposed) return;
    frame = requestAnimationFrame(tick);
    clock += Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    const t = Math.min(ACT_ONE.seconds, Math.max(0, timeAtProgress(getProgress())));
    const pose = poseAt(ACT_ONE, t);
    camera.position.fromArray(pose.pos);
    camera.lookAt(...pose.look);
    if (camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    river.uniforms.uFlow.value = clock * 0.012 - t * 0.05;
    // Before the act starts or after it ends only the river's drift is
    // left, often while the next section plays beside it: a quarter of the
    // frames is enough there.
    if ((t <= 0 || t >= ACT_ONE.seconds) && settledFrames++ % 4) return;
    if (t > 0 && t < ACT_ONE.seconds) settledFrames = 0;
    film.render(scene, camera, { now: nowMs, skip: t <= 0 || t >= ACT_ONE.seconds });
    onFrame?.(t, overlays(t));
  }

  return {
    setActive(on) {
      if (on === active || disposed) return;
      active = on;
      if (on) { last = performance.now(); frame = requestAnimationFrame(tick); }
      else cancelAnimationFrame(frame);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      river.dispose();
      film.release();
    },
  };
}
