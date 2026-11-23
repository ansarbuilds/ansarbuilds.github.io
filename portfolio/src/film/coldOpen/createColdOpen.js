import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { poseAt } from "../rig.js";
import { COLD_OPEN, CUES, SHORT_START, SUBTITLE, T, score } from "./score.js";
import { cue } from "../../lib/sound.js";
import { sampleName } from "./sampleName.js";
import { finishShader, flareFragment, flareVertex, lineFragment, lineVertex, particleFragment, particleVertex, raysFragment } from "./shaders.js";
import { createAdaptive, lensWanted } from "../adaptive.js";
import { pickQuality } from "./quality.js";

/* The cold open's scene and its frame loop, in plain three.js.

   createColdOpen(canvas, options) starts it and returns { skip, dispose }.
   Each frame it asks the score (score.js) what the moment looks like and
   the rig (rig.js) where the camera is, sets the uniforms, and draws. It
   tells the page around it what to do through the callbacks:

     onVeil(opacity)   how opaque the whole layer should be
     onBars(closed)    letterbox bars closed or open
     onLine(text)      the typed line so far
     onName(bounds)    where the name sits on screen, once it has been read
     onHandOver()      the page underneath may start its own entrance
     onDone()          the layer is fully lifted and can be removed */

const SKIP_FADE_MS = 320;
const SHORT_SPEED = 1.6;

const deviceQuality = () => pickQuality({
  narrow: window.matchMedia("(max-width: 760px)").matches,
  cores: navigator.hardwareConcurrency || 8,
  memory: navigator.deviceMemory || 8,
  dpr: window.devicePixelRatio || 1,
});

const additive = (options) => new THREE.ShaderMaterial({ blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, ...options });

function buildScene(quality) {
  const total = quality.name + quality.dust;
  const nebula = new Float32Array(total * 3), target = new Float32Array(total * 3), seed = new Float32Array(total * 4);
  const kind = new Float32Array(total), tint = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    // A flattened, slightly spiralled cloud, denser toward the middle.
    const reach = 4 + 58 * Math.random() ** 0.72;
    const angle = Math.random() * Math.PI * 2 + reach * 0.045;
    nebula[i * 3] = Math.cos(angle) * reach * 1.25;
    nebula[i * 3 + 1] = (Math.random() - 0.5) * (9 + reach * 0.42);
    nebula[i * 3 + 2] = Math.sin(angle) * reach * 0.8;
    target.set(nebula.subarray(i * 3, i * 3 + 3), i * 3);
    for (let j = 0; j < 4; j++) seed[i * 4 + j] = Math.random();
    kind[i] = 0; // set to 1 once the name has been read from the page
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(nebula, 3));
  geometry.setAttribute("aNebula", new THREE.BufferAttribute(nebula, 3));
  geometry.setAttribute("aTarget", new THREE.BufferAttribute(target, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  geometry.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
  geometry.setAttribute("aTint", new THREE.BufferAttribute(tint, 1));
  const particleUniforms = { uTime: { value: 0 }, uGrow: { value: 0 }, uForm: { value: 0 }, uGone: { value: 0 }, uDust: { value: 1 }, uSpin: { value: 0 }, uScale: { value: 1 }, uSize: { value: 1 }, uImpact: { value: 0 } };
  const particles = new THREE.Points(geometry, additive({ uniforms: particleUniforms, vertexShader: particleVertex, fragmentShader: particleFragment }));
  particles.frustumCulled = false;

  // Edges: each hub (taken from the particles that stay in the nebula)
  // links to its two nearest hubs.
  const hubAt = (h) => (quality.name + h) * 3;
  const ends = [], others = [], whichEnd = [], phases = [];
  for (let h = 0; h < quality.hubs; h++) {
    const a = hubAt(h);
    const nearest = [];
    for (let other = 0; other < quality.hubs; other++) {
      if (other === h) continue;
      const b = hubAt(other);
      const d = (nebula[a] - nebula[b]) ** 2 + (nebula[a + 1] - nebula[b + 1]) ** 2 + (nebula[a + 2] - nebula[b + 2]) ** 2;
      if (nearest.length < 2) { nearest.push([d, b]); nearest.sort((x, y) => x[0] - y[0]); }
      else if (d < nearest[1][0]) { nearest[1] = [d, b]; nearest.sort((x, y) => x[0] - y[0]); }
    }
    for (const [, b] of nearest) {
      const phase = Math.random();
      ends.push(nebula[a], nebula[a + 1], nebula[a + 2], nebula[b], nebula[b + 1], nebula[b + 2]);
      others.push(nebula[b], nebula[b + 1], nebula[b + 2], nebula[a], nebula[a + 1], nebula[a + 2]);
      whichEnd.push(0, 1);
      phases.push(phase, phase);
    }
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(ends, 3));
  lineGeometry.setAttribute("aOther", new THREE.Float32BufferAttribute(others, 3));
  lineGeometry.setAttribute("aEnd", new THREE.Float32BufferAttribute(whichEnd, 1));
  lineGeometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
  const lineUniforms = { uTime: { value: 0 }, uGrow: { value: 0 }, uSpin: { value: 0 }, uLines: { value: 0 }, uSignals: { value: 0 } };
  const lines = new THREE.LineSegments(lineGeometry, additive({ uniforms: lineUniforms, vertexShader: lineVertex, fragmentShader: lineFragment }));
  lines.frustumCulled = false;

  // Two screen-filling cards that always face the camera: the signal with
  // its flare, and the light behind the name.
  const card = new THREE.PlaneGeometry(2, 2);
  const flareUniforms = { uCore: { value: 0 }, uFlare: { value: 0 }, uBeat1: { value: -1 }, uBeat2: { value: -1 }, uAspect: { value: 1 } };
  const flare = new THREE.Mesh(card, additive({ uniforms: flareUniforms, vertexShader: flareVertex, fragmentShader: flareFragment }));
  const raysUniforms = { uTime: { value: 0 }, uRays: { value: 0 }, uAspect: { value: 1 } };
  const rays = new THREE.Mesh(card, additive({ uniforms: raysUniforms, vertexShader: flareVertex, fragmentShader: raysFragment }));
  flare.frustumCulled = rays.frustumCulled = false;
  rays.renderOrder = -1;

  const group = new THREE.Group();
  group.add(rays, lines, particles, flare);
  const dispose = () => { [geometry, lineGeometry, card].forEach((item) => item.dispose()); [particles, lines, flare, rays].forEach((item) => item.material.dispose()); };
  return { group, geometry, particles, lines, flare, rays, particleUniforms, lineUniforms, flareUniforms, raysUniforms, dispose };
}

export function createColdOpen(canvas, { mode, waited = 0, holdAt = null, onVeil, onBars, onLine, onName, onHandOver, onDone }) {
  const quality = deviceQuality();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(quality.dpr);
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 800);
  const film = buildScene(quality);
  scene.add(film.group);

  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.5, 0.32);
  const finish = new ShaderPass(finishShader);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  // Steps quality down if this device cannot keep up (see adaptive.js).
  const lens = { on: lensWanted(renderer) };
  const adaptive = createAdaptive({ quality, bloom, lens, apply: () => { renderer.setPixelRatio(quality.dpr); resize(); } });

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
  // toward the opening beat of black. A return visit joins at the name.
  const short = mode === "short";
  let t = short ? SHORT_START : Math.min(T.ignite - 0.25, waited);
  const speed = short ? SHORT_SPEED : 1;
  let skippedAt = null;
  let fontsReady = false;
  let disposed = false;
  let frames = 0;
  (document.fonts?.ready ?? Promise.resolve()).then(() => { fontsReady = true; });

  // Read the name off the page and give the particles their places in it.
  let placed = false;
  function placeName() {
    placed = true;
    const closing = camera.clone();
    const pose = poseAt(COLD_OPEN, T.line + 0.01);
    closing.position.fromArray(pose.pos);
    closing.lookAt(...pose.look);
    closing.fov = pose.fov;
    closing.updateProjectionMatrix();
    closing.updateMatrixWorld(true);
    const name = sampleName(closing, quality.name);
    // No name to build (the hero is not on screen): leave without a show.
    if (!name) { if (import.meta.env?.DEV) console.warn("cold open: the hero name is not on the page"); skippedAt ??= performance.now(); return; }
    const { aTarget, aKind, aTint } = film.geometry.attributes;
    aTarget.array.set(name.positions);
    aKind.array.fill(1, 0, quality.name);
    aTint.array.set(name.tints);
    aTarget.needsUpdate = aKind.needsUpdate = aTint.needsUpdate = true;
    film.rays.position.fromArray(name.centre);
    onName?.(name.bounds);
  }

  const told = { bars: null, typed: -1, handed: false, done: false };
  // Where the score has played up to; a cue exactly at the start still plays.
  let heard = t - 0.001;
  let frame = 0;
  let last = performance.now();
  function tick(nowMs) {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    // Real time, so a slow machine still plays it at about speed. A gap over
    // a second is a stalled or hidden tab, and must not skip the film forward.
    const gap = (nowMs - last) / 1000;
    t = Math.min(T.end, t + (gap > 1 ? 1 / 60 : Math.min(gap, 0.25)) * speed);
    last = nowMs;
    frames++;
    if (holdAt !== null) t = Math.min(T.end, holdAt);
    // The score: each cue the playhead passed this frame, until a skip.
    if (skippedAt === null && holdAt === null) {
      for (const c of CUES) if ((!c.mode || c.mode === (short ? "short" : "full")) && c.at >= heard && c.at < t) cue(c.kind, c.length);
    }
    heard = t;
    // Read the page's name once its font has loaded and the hero has had a
    // few frames to set it mid-screen. If the font is very slow, go anyway
    // just after the name should have started forming.
    if (!placed && t >= T.name - 0.3 && frames > 3 && (fontsReady || (holdAt === null && t >= T.name + 0.2))) placeName();
    const now = score(t);

    const pose = poseAt(COLD_OPEN, t);
    camera.position.fromArray(pose.pos);
    camera.lookAt(...pose.look);
    if (camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();

    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = width / height;
    const p = film.particleUniforms;
    p.uTime.value = t; p.uGrow.value = now.grow; p.uForm.value = now.form; p.uGone.value = now.gone; p.uDust.value = now.dust; p.uImpact.value = now.impact;
    p.uSpin.value = t * 0.035;
    p.uScale.value = canvas.height / (2 * half);
    const l = film.lineUniforms;
    l.uTime.value = t; l.uGrow.value = now.grow; l.uSpin.value = p.uSpin.value; l.uLines.value = now.lines; l.uSignals.value = now.signals;
    const f = film.flareUniforms;
    f.uCore.value = now.core; f.uFlare.value = now.flare; f.uBeat1.value = now.beat1; f.uBeat2.value = now.beat2; f.uAspect.value = aspect;
    const r = film.raysUniforms;
    // On a tall phone screen the rays fill the whole frame behind the name
    // and wash it out: they shine at about half strength there.
    r.uTime.value = t; r.uRays.value = now.rays * (0.5 + 0.5 * Math.min(1, aspect / 1.4)); r.uAspect.value = aspect;
    // Keep both cards filling the frame, whatever the camera does.
    for (const mesh of [film.flare, film.rays]) {
      const distance = camera.position.distanceTo(mesh.position);
      mesh.quaternion.copy(camera.quaternion);
      // Half again bigger than the frame: the rays card is centred on the
      // name, not the screen, so at exact size it stops short of an edge.
      mesh.scale.set(distance * half * aspect * 1.5, distance * half * 1.5, 1);
    }
    bloom.strength = now.bloom;
    finish.uniforms.uTime.value = t;
    finish.uniforms.uAberration.value = now.aberration;
    finish.uniforms.uStreak.value = finish.uniforms.uHalation.value = lens.on ? 1 : 0;
    adaptive.frame(nowMs);
    composer.render();

    // The page around the canvas.
    const skipFade = skippedAt === null ? 1 : 1 - Math.min(1, (performance.now() - skippedAt) / SKIP_FADE_MS);
    const veil = Math.min(now.veil, skipFade);
    onVeil?.(veil);
    if (told.bars !== now.bars) { told.bars = now.bars; onBars?.(now.bars); }
    if (told.typed !== now.typed) { if (!short && now.typed > told.typed && told.typed >= 0 && skippedAt === null) cue("tick"); told.typed = now.typed; onLine?.(short ? "" : SUBTITLE.slice(0, now.typed)); }
    if (!told.handed && (t >= T.open || skippedAt !== null)) { told.handed = true; onHandOver?.(); }
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
