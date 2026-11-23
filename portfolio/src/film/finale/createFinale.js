import * as THREE from "three";
import { poseAt } from "../rig.js";
import { flareFragment, flareVertex } from "../coldOpen/shaders.js";
import { additive } from "../actTwo/kit.js";
import { FINALE, POINT, moments } from "./timeline.js";
import { attachFilm } from "../engine.js";

/* The finale (FN-01 and FN-02) in plain three.js: one point of light on
   carbon black. It is the cold open's signal, drawn with the same flare
   shader, so the film ends where it began. Nothing else is in the scene. The
   type is in the DOM over the canvas, so the bloom cannot touch it. */

export function createFinale(canvas, { getTime, onFrame }) {
  // The shared renderer (see engine.js): this act draws into it, and its
  // frames are copied onto this canvas. Bloom is higher than the portraits:
  // the point is supposed to bloom.
  const film = attachFilm(canvas, { clear: 0x070605, bloom: [0.5, 0.6, 0.3] });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 400);
  scene.add(camera);
  const point = new THREE.Vector3().fromArray(POINT);

  // The signal: the cold open's flare, on a card held in front of the lens.
  const flareUniforms = { uCore: { value: 0 }, uFlare: { value: 0 }, uBeat1: { value: -1 }, uBeat2: { value: -1 }, uAspect: { value: 1 }, uShock: { value: -1 } };
  const cardGeometry = new THREE.PlaneGeometry(2, 2);
  const flare = new THREE.Mesh(cardGeometry, additive({ uniforms: flareUniforms, vertexShader: flareVertex, fragmentShader: flareFragment }));
  flare.frustumCulled = false;
  scene.add(flare);

  const finish = film.finish;

  const resize = () => {
    film.resize();
    camera.aspect = (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight);
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  let active = false, frame = 0, clock = 0, disposed = false, settledFrames = 0;
  function tick(nowMs) {
    if (!active || disposed) return;
    frame = requestAnimationFrame(tick);
    clock += 1 / 60;
    const t = Math.min(FINALE.seconds, Math.max(0, getTime()));
    const pose = poseAt(FINALE, t);
    camera.position.fromArray(pose.pos);
    camera.lookAt(...pose.look);
    if (camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    const m = moments(t);
    // The burst jolts the camera, and it settles.
    if (m.burst > 0.001) {
      camera.position.x += (Math.sin(t * 87) + 0.6 * Math.sin(t * 129)) * 0.05 * m.burst;
      camera.position.y += (Math.cos(t * 93) + 0.5 * Math.sin(t * 59)) * 0.04 * m.burst;
      camera.rotateZ(Math.sin(t * 71) * 0.01 * m.burst);
    }
    camera.updateMatrixWorld();

    // Keep the flare card filling the frame, at the point. Half again the
    // frame: the shared flare shader is drawn for a card that size.
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distance = camera.position.distanceTo(point);
    flare.position.copy(point);
    flare.quaternion.copy(camera.quaternion);
    flare.scale.set(distance * half * camera.aspect * 1.5, distance * half * 1.5, 1);
    // It gathers (a quickening pulse), then bursts.
    const pulse = 0.9 + (0.1 + 0.25 * m.gather) * Math.sin(clock * (2.2 + 14 * m.gather));
    flareUniforms.uCore.value = m.core * pulse * (1 + 0.6 * m.gather) + m.burst * 1.4;
    flareUniforms.uFlare.value = m.flare * (0.8 + 0.7 * m.gather) + m.burst * 2.8;
    flareUniforms.uShock.value = m.shock;
    flareUniforms.uAspect.value = camera.aspect;
    film.bloom[0] = 0.5 + 0.25 * m.gather + m.burst * 0.9;
    finish.uniforms.uAberration.value = 0.0002 + m.burst * 0.006;

    // Before the act starts or after it ends the frame does not change.
    if ((t <= 0 || t >= FINALE.seconds) && settledFrames++ % 4) return;
    if (t > 0 && t < FINALE.seconds) settledFrames = 0;
    finish.uniforms.uTime.value = clock;
    film.render(scene, camera, { now: nowMs, skip: t <= 0 || t >= FINALE.seconds });
    onFrame?.(t, m);
  }

  return {
    setActive(on) {
      if (on === active || disposed) return;
      active = on;
      if (on) frame = requestAnimationFrame(tick); else cancelAnimationFrame(frame);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      cardGeometry.dispose();
      flare.material.dispose();
      film.release();
    },
  };
}
