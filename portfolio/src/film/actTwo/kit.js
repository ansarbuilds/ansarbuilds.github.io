import * as THREE from "three";
import { cardVertex, floorFragment, glowFragment } from "./shaders.js";
import { pointFragment, pointVertex } from "../actOne/shaders.js";

/* Small pieces every Act II set is built from. */

export const BONE = new THREE.Color(0.94, 0.9, 0.85);
export const SIGNAL = new THREE.Color(1, 0.54, 0.37);

export const additive = (options) => new THREE.ShaderMaterial({ blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, ...options });

// Soft dots: positions and colours as flat arrays.
export function points(positions, colors, size, { opacity = 1, far = 170, wobble = 0.22 } = {}) {
  const count = positions.length / 3;
  const seeds = new Float32Array(count * 2);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 2));
  const uniforms = { uTime: { value: 0 }, uScale: { value: 1 }, uSize: { value: size }, uPart: { value: 0 }, uOpacity: { value: opacity }, uFar: { value: far }, uWobble: { value: wobble } };
  const mesh = new THREE.Points(geometry, additive({ uniforms, vertexShader: pointVertex, fragmentShader: pointFragment }));
  mesh.frustumCulled = false;
  return { mesh, uniforms, dispose: () => { geometry.dispose(); mesh.material.dispose(); } };
}

export function floor(size, tint = BONE, opacity = 0.16) {
  const geometry = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(geometry, additive({ uniforms: { uTint: { value: tint.clone() }, uOpacity: { value: opacity } }, vertexShader: cardVertex, fragmentShader: floorFragment }));
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, dispose: () => { geometry.dispose(); mesh.material.dispose(); } };
}

// A pool of light on the floor (flat) or a cone of light from above.
export function glow(width, height, tint, { cone = false, opacity = 0.5 } = {}) {
  const geometry = cone ? new THREE.CylinderGeometry(width * 0.08, width / 2, height, 48, 1, true) : new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geometry, additive({ uniforms: { uTint: { value: tint.clone() }, uOpacity: { value: opacity }, uCone: { value: cone ? 1 : 0 } }, vertexShader: cardVertex, fragmentShader: glowFragment, side: THREE.DoubleSide }));
  if (!cone) mesh.rotation.x = -Math.PI / 2;
  return { mesh, dispose: () => { geometry.dispose(); mesh.material.dispose(); } };
}

// A canvas drawn on whenever `draw` is called, shown on a flat card.
export function canvasCard(width, height, pixelsWide, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = pixelsWide;
  canvas.height = Math.round((pixelsWide * height) / width);
  const context = canvas.getContext("2d");
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false }));
  return {
    mesh,
    redraw: (...args) => { draw(context, canvas, ...args); map.needsUpdate = true; },
    dispose: () => { geometry.dispose(); map.dispose(); mesh.material.dispose(); },
  };
}

export const clamp01 = (value) => Math.min(1, Math.max(0, value));
export const ramp = (t, from, to) => clamp01((t - from) / (to - from));
export const smooth = (u) => u * u * (3 - 2 * u);
