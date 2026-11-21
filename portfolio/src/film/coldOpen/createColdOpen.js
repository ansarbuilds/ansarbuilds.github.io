import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SHORT_START, T, score } from "./score.js";
import { finishShader, flareFragment, flareVertex } from "./shaders.js";
import { createAdaptive } from "../adaptive.js";
import { cue } from "../../lib/sound.js";
import { pickQuality } from "./quality.js";

/* The cold open's scene and its frame loop, in plain three.js.

   createColdOpen(canvas, options) starts it and returns { skip, dispose }.
   The scene is one point of light on carbon black, drawn with the flare
   shader the finale also uses. Each frame it asks the score (score.js) how
   bright the point is, and tells the page around it what to do:

     onVeil(opacity)   how opaque the whole layer should be
     onHandOver()      the page underneath may start its own entrance
     onDone()          the layer is fully lifted and can be removed */

const SKIP_FADE_MS = 320;

const deviceQuality = () => pickQuality({
  narrow: window.matchMedia("(max-width: 760px)").matches,
  cores: navigator.hardwareConcurrency || 8,
  memory: navigator.deviceMemory || 8,
  dpr: window.devicePixelRatio || 1,
});

const additive = (options) => new THREE.ShaderMaterial({ blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, ...options });

function buildScene() {
  // One screen-filling card that always faces the camera: the signal and its flare.
  const card = new THREE.PlaneGeometry(2, 2);
  const flareUniforms = { uCore: { value: 0 }, uFlare: { value: 0 }, uBeat1: { value: -1 }, uBeat2: { value: -1 }, uAspect: { value: 1 } };
  const flare = new THREE.Mesh(card, additive({ uniforms: flareUniforms, vertexShader: flareVertex, fragmentShader: flareFragment }));
  flare.frustumCulled = false;
  const dispose = () => { card.dispose(); flare.material.dispose(); };
  return { flare, flareUniforms, dispose };
}

export function createColdOpen(canvas, { mode, waited = 0, holdAt = null, onVeil, onHandOver, onDone }) {
  const quality = deviceQuality();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(quality.dpr);
  // The hero's carbon, not pure black, so the hand-over does not flash.
  renderer.setClearColor(0x070605, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const film = buildScene();
  scene.add(film.flare);

  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 0.32);
  const finish = new ShaderPass(finishShader);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  // Steps quality down if this device cannot keep up (see adaptive.js).
  const adaptive = createAdaptive({ quality, bloom, apply: () => { renderer.setPixelRatio(quality.dpr); resize(); } });

  let width = 1, height = 1;
  const resize = () => {
    width = window.innerWidth; height = window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setPixelRatio(quality.dpr);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // The black the visitor already sat through while this loaded counts
  // toward the opening beat of black. A return visit joins with the point lit.
  const short = mode === "short";
  let t = short ? SHORT_START : Math.min(T.ignite - 0.25, waited);
  let skippedAt = null;
  let disposed = false;
  const told = { handed: false, done: false, toned: false };
  let frame = 0;
  let last = performance.now();
  function tick(nowMs) {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    // Real time, so a slow machine still plays it at about speed. A gap over
    // a second is a stalled or hidden tab, and must not skip the film forward.
    const gap = (nowMs - last) / 1000;
    t = Math.min(T.end, t + (gap > 1 ? 1 / 60 : Math.min(gap, 0.25)));
    last = nowMs;
    if (holdAt !== null) t = Math.min(T.end, holdAt);
    const now = score(t);
    // The open: one soft tone as the point appears (silent unless sound is on).
    if (!told.toned && t >= T.ignite && t < T.ignite + 0.5) { told.toned = true; cue("tone"); }

    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = width / height;
    const f = film.flareUniforms;
    f.uCore.value = now.core; f.uFlare.value = now.flare; f.uAspect.value = aspect;
    // Keep the card filling the frame. Half again bigger than the frame: the
    // shared flare shader is drawn for a card that size.
    film.flare.scale.set(3 * half * aspect * 1.5, 3 * half * 1.5, 1);
    bloom.strength = now.bloom;
    finish.uniforms.uTime.value = t;
    finish.uniforms.uAberration.value = now.aberration;
    adaptive.frame(nowMs);
    composer.render();

    // The page around the canvas.
    const skipFade = skippedAt === null ? 1 : 1 - Math.min(1, (performance.now() - skippedAt) / SKIP_FADE_MS);
    const veil = Math.min(now.veil, skipFade);
    onVeil?.(veil);
    if (!told.handed && (t >= T.end - 0.7 || skippedAt !== null)) { told.handed = true; onHandOver?.(); }
    if (!told.done && veil <= 0.001) { told.done = true; onDone?.(); }
  }
  frame = requestAnimationFrame(tick);

  return {
    skip() { skippedAt ??= performance.now(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      film.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
