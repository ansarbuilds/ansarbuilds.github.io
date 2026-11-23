import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { finishShader } from "./coldOpen/shaders.js";
import { createAdaptive, lensWanted } from "./adaptive.js";

/* One WebGL renderer for the film's acts (I to IV and the finale), instead
   of one each. A browser keeps only so many contexts alive (Chrome: 16) and
   every renderer carried its own composer targets, so the acts share one
   renderer, one composer (the scene, bloom, the finish and grade, output)
   and one adaptive-quality controller.

   The renderer draws off screen. Each act keeps its own <canvas> in its own
   pinned stage, now a plain 2D canvas: after an act renders, the frame is
   copied onto it. A canvas keeps its last frame until the next copy, so an
   act that is not rendering (scrolled away, or holding while pictures load)
   still shows a finished frame, and two stages on screen during a handoff
   both stay drawn. Only acts whose section is on screen render.

   attachFilm(canvas, { clear, bloom: [strength, radius, threshold], grain })
   returns a view: { renderer, bloom, finish, dpr, resize(), render(scene,
   camera, { now, skip }), release() }. `bloom` and `finish` are the act's own
   settings, applied to the shared passes before each of its frames. The
   engine is made with the first view and disposed with the last one, so
   leaving the home page frees it. The cold open keeps its own renderer: it
   plays alone, before any act, and is gone when they start. */

let engine = null;

function pickDpr() {
  const low = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  return Math.min(window.devicePixelRatio, low ? 1.25 : 1.75);
}

function createEngine() {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  const quality = { dpr: pickDpr() };
  renderer.setPixelRatio(quality.dpr);
  const pass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 0.5);
  const finish = new ShaderPass(finishShader);
  const composer = new EffectComposer(renderer);
  composer.addPass(pass);
  composer.addPass(bloom);
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  let width = 0, height = 0, sizedDpr = 0, lastFrame = -1;
  const size = (w, h) => {
    if (w === width && h === height && sizedDpr === quality.dpr) return;
    width = w; height = h; sizedDpr = quality.dpr;
    renderer.setPixelRatio(quality.dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(quality.dpr);
    composer.setSize(w, h);
  };
  const views = new Set();
  // Steps quality down for every act at once if the device cannot keep up.
  const lens = { on: lensWanted(renderer) };
  const adaptive = createAdaptive({ quality, bloom, lens, apply: () => views.forEach((view) => view.resize()) });
  return {
    renderer, quality, views,
    draw(view, scene, camera, { now, skip }) {
      size(view.width, view.height);
      pass.scene = scene;
      pass.camera = camera;
      renderer.setClearColor(view.clear, 1);
      [bloom.strength, bloom.radius, bloom.threshold] = view.bloom;
      for (const key of ["uTime", "uAberration", "uGrain", "uGrade", "uStreak", "uHalation"]) finish.uniforms[key].value = view.finish.uniforms[key].value;
      if (!lens.on) { finish.uniforms.uStreak.value = 0; finish.uniforms.uHalation.value = 0; }
      // Two acts can draw in one animation frame during a handoff: count
      // the frame once.
      if (now !== lastFrame) { lastFrame = now; adaptive.frame(now, skip); }
      composer.render();
      view.copy(canvas);
    },
    dispose() {
      composer.dispose();
      bloom.dispose();
      finish.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

export function attachFilm(target, { clear = 0x000000, bloom = [0.5, 0.5, 0.5], grain = 0.014 } = {}) {
  engine ??= createEngine();
  const own = engine;
  const context = target.getContext("2d", { alpha: false });
  const finish = { uniforms: Object.fromEntries(Object.entries(finishShader.uniforms).filter(([key]) => key !== "tDiffuse").map(([key, u]) => [key, { value: u.value }])) };
  finish.uniforms.uGrain.value = grain;
  const view = {
    renderer: own.renderer,
    // The composer's buffers have no colour space, so three clears them with
    // the colour's sRGB numbers and the output pass then encodes those a
    // second time: 0x070605 came out as a milky #2a2622 behind every act.
    // Converting once more first cancels three's conversion, so the buffer
    // holds the linear value and the frame lands on the colour asked for.
    clear: new THREE.Color(clear).convertSRGBToLinear(),
    // [strength, radius, threshold], read before each frame.
    bloom: [...bloom],
    finish,
    width: 1, height: 1,
    get dpr() { return own.quality.dpr; },
    resize() {
      view.width = target.clientWidth || window.innerWidth;
      view.height = target.clientHeight || window.innerHeight;
      const w = Math.round(view.width * own.quality.dpr), h = Math.round(view.height * own.quality.dpr);
      if (target.width !== w || target.height !== h) { target.width = w; target.height = h; }
    },
    // The height of the frame in device pixels, for sizing points.
    get pixelHeight() { return Math.round(view.height * own.quality.dpr); },
    copy(source) { context.drawImage(source, 0, 0, source.width, source.height, 0, 0, target.width, target.height); },
    render(scene, camera, { now = performance.now(), skip = false } = {}) { own.draw(view, scene, camera, { now, skip }); },
    release() {
      own.views.delete(view);
      if (!own.views.size && engine === own) { own.dispose(); engine = null; }
    },
  };
  own.views.add(view);
  view.resize();
  return view;
}
