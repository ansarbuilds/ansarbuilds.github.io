import * as THREE from "three";
import { BONE, SIGNAL, additive, canvasCard, floor, glow, ramp, smooth } from "../kit.js";

/* PRH-JEPA (shots A2-04a and A2-04b): two clouds of points, one for images
   and one for text, drift apart. One rotation snaps the text cloud onto the
   image cloud, and the lines between matching points shrink to nothing.
   Then a light sweeps across and lights up the share of the score that came
   from a hidden clip: minus 35%.

   An illustration of the finding, not the study's data; its card says so.
   Local space: +z faces the camera's scene position, +x is screen right. */

const COOL = new THREE.Color(0.55, 0.7, 1);
const RED = new THREE.Color(1, 0.3, 0.22);
const COUNT = 2600;
const CLUSTERS = 7;
const HIDDEN = 0.35;
const CENTRE = new THREE.Vector3(1.6, 1.4, -2.5);
const PAIRS = 220;

const cloudVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSeed, aClip;
  uniform float uTime, uScale, uSize, uOpacity, uSweep, uShown;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position + 0.03 * vec3(sin(uTime * 0.7 + aSeed * 40.), cos(uTime * 0.6 + aSeed * 31.), sin(uTime * 0.5 + aSeed * 17.));
    vec4 world = modelMatrix * vec4(p, 1.);
    vec4 view = viewMatrix * world;
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(uSize * (0.6 + aSeed) * uScale / -view.z, 1., 6.);
    // Once the light has swept past, the hidden share shows red.
    float lit = aClip * uShown * smoothstep(0.4, -0.4, position.x - uSweep);
    vColor = mix(aColor, vec3(1., 0.3, 0.22) * 1.4, lit);
    vAlpha = uOpacity * (0.55 + 0.45 * sin(uTime * (1. + aSeed * 2.) + aSeed * 60.));
  }
`;
const cloudFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vColor * smoothstep(0.5, 0.08, d) * vAlpha, 1.); }
`;

// A shared shape: clusters (the "concepts") on a lumpy ball. Both clouds use
// it; the text cloud starts turned by a fixed rotation, with a little noise.
function shape() {
  const centres = Array.from({ length: CLUSTERS }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / CLUSTERS, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(1.7);
  });
  const base = new Float32Array(COUNT * 3), cluster = new Uint8Array(COUNT);
  const v = new THREE.Vector3();
  for (let i = 0; i < COUNT; i++) {
    const c = i % CLUSTERS;
    const spread = 0.42 + Math.random() * 0.28;
    v.set(gauss(), gauss(), gauss()).multiplyScalar(spread).add(centres[c]);
    v.toArray(base, i * 3);
    cluster[i] = c;
  }
  return { base, cluster };
}
function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) * 1.15; }

function cloud(base, color, clips) {
  const positions = base.slice();
  const colors = new Float32Array(COUNT * 3), seeds = new Float32Array(COUNT), clip = new Float32Array(COUNT);
  const tint = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    tint.copy(color).multiplyScalar(0.6 + Math.random() * 0.5).toArray(colors, i * 3);
    seeds[i] = Math.random();
    clip[i] = clips ? clips[i] : 0;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aClip", new THREE.BufferAttribute(clip, 1));
  const uniforms = { uTime: { value: 0 }, uScale: { value: 1 }, uSize: { value: 0.07 }, uOpacity: { value: 1 }, uSweep: { value: -9 }, uShown: { value: 0 } };
  const mesh = new THREE.Points(geometry, additive({ uniforms, vertexShader: cloudVertex, fragmentShader: cloudFragment }));
  mesh.frustumCulled = false;
  return { mesh, uniforms, positions, dispose: () => { geometry.dispose(); mesh.material.dispose(); } };
}

function caption(width, text, color, size = 64) {
  const card = canvasCard(width, width * 0.16, 1000, (c, canvas, words) => {
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = color;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `500 ${size}px JetBrains Mono, monospace`;
    c.fillText(words ?? text, canvas.width / 2, canvas.height / 2);
  });
  card.redraw();
  card.mesh.material.opacity = 0;
  return card;
}

export function buildPrhJepa({ group }) {
  const disposers = [];
  const keep = (item) => { disposers.push(item.dispose); return item; };

  const ground = keep(floor(44, COOL, 0.12));
  ground.mesh.position.y = -3.2;
  group.add(ground.mesh);
  const pool = keep(glow(12, 9, COOL, { opacity: 0.3 }));
  pool.mesh.position.set(CENTRE.x, -3.15, CENTRE.z);
  group.add(pool.mesh);

  const { base } = shape();
  // The hidden clip: exactly 35% of the points, the ones on the side the
  // light sweeps from, so the red covers that share and no more.
  const xs = Array.from({ length: COUNT }, (_, i) => base[i * 3]).sort((a, b) => a - b);
  const cut = xs[Math.floor(COUNT * HIDDEN)];
  const clips = Float32Array.from({ length: COUNT }, (_, i) => (base[i * 3] < cut ? 1 : 0));
  const images = keep(cloud(base, BONE, clips));
  const text = keep(cloud(base, SIGNAL, null));
  group.add(images.mesh, text.mesh);

  // Lines between matching points (the same concept in both clouds).
  const pairPositions = new Float32Array(PAIRS * 6);
  const pairGeometry = new THREE.BufferGeometry();
  pairGeometry.setAttribute("position", new THREE.BufferAttribute(pairPositions, 3));
  const pairMaterial = new THREE.LineBasicMaterial({ color: COOL, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const pairs = new THREE.LineSegments(pairGeometry, pairMaterial);
  pairs.frustumCulled = false;
  group.add(pairs);
  disposers.push(() => { pairGeometry.dispose(); pairMaterial.dispose(); });

  // The light that sweeps across: a thin, tall sheet.
  const sweepGeometry = new THREE.PlaneGeometry(0.12, 7.5);
  const sweep = new THREE.Mesh(sweepGeometry, new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(sweep);
  const sweepGlow = keep(glow(2.4, 7.5, RED, { opacity: 0 }));
  sweepGlow.mesh.rotation.set(0, 0, 0);
  group.add(sweepGlow.mesh);
  disposers.push(() => { sweepGeometry.dispose(); sweep.material.dispose(); });

  const imagesLabel = keep(caption(3, "IMAGES", "#efe6d8"));
  const textLabel = keep(caption(3, "TEXT", "#ff8a5f"));
  const rotationLabel = keep(caption(6.6, "ONE ROTATION · R", "#c9d6ff", 60));
  const finding = keep(canvasCard(4.6, 1.9, 1000, (c, canvas) => {
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.textAlign = "center";
    c.fillStyle = "#ff5a4e";
    c.font = "400 230px Anton, sans-serif";
    c.textBaseline = "alphabetic";
    c.fillText("−35%", canvas.width / 2, 250);
    c.fillStyle = "#cfc4b6";
    c.font = "500 34px JetBrains Mono, monospace";
    c.fillText("OF THE TOP SCORE CAME FROM A HIDDEN CLIP", canvas.width / 2, 330);
  }));
  finding.redraw();
  finding.mesh.material.opacity = 0;
  [imagesLabel, textLabel, rotationLabel, finding].forEach((card) => group.add(card.mesh));

  // The text cloud's starting turn, fixed so every visit sees the same snap.
  const start = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, -1.4, 0.5));
  const turn = new THREE.Quaternion(), wobble = new THREE.Quaternion(), identity = new THREE.Quaternion();
  const toCamera = new THREE.Vector3(), point = new THREE.Vector3();
  const pick = Array.from({ length: PAIRS }, (_, i) => Math.floor((i / PAIRS) * COUNT));
  const sweepFrom = CENTRE.x - 3, sweepTo = CENTRE.x + 3;

  return {
    setPlaying() {},
    update({ arrive, scene, clock, scale, camera }) {
      for (const item of [images, text]) { item.uniforms.uTime.value = clock; item.uniforms.uScale.value = scale; }
      group.updateMatrixWorld();
      toCamera.copy(camera.position);
      group.worldToLocal(toCamera);

      const wide = Math.min(1, camera.aspect / 1.5);
      const y = CENTRE.y;

      // Apart, then one rotation brings them together.
      const apart = 1 - smooth(ramp(scene, 0.28, 0.5));
      const align = smooth(ramp(scene, 0.3, 0.52));
      const gap = 2.9 * apart * (0.7 + 0.3 * smooth(ramp(arrive, 0, 1)));
      images.mesh.position.set(CENTRE.x - gap, y, CENTRE.z);
      text.mesh.position.set(CENTRE.x + gap, y, CENTRE.z);
      wobble.setFromEuler(new THREE.Euler(Math.sin(clock * 0.3) * 0.15 * (1 - align), clock * 0.12 * (1 - align), 0));
      turn.copy(start).slerp(identity, align).multiply(wobble);
      text.mesh.quaternion.copy(turn);
      images.mesh.rotation.y = clock * 0.05;
      text.mesh.quaternion.premultiply(images.mesh.quaternion);
      // Once aligned the two clouds are one; the text cloud sits just inside.
      text.uniforms.uOpacity.value = 1 - smooth(ramp(scene, 0.55, 0.65)) * 0.55;

      // Matching points, joined while they come into line.
      images.mesh.updateMatrixWorld();
      text.mesh.updateMatrixWorld();
      pick.forEach((index, i) => {
        point.fromArray(base, index * 3).applyMatrix4(images.mesh.matrix);
        point.toArray(pairPositions, i * 6);
        point.fromArray(base, index * 3).applyMatrix4(text.mesh.matrix);
        point.toArray(pairPositions, i * 6 + 3);
      });
      pairGeometry.attributes.position.needsUpdate = true;
      pairMaterial.opacity = smooth(ramp(scene, 0.12, 0.28)) * (1 - smooth(ramp(scene, 0.48, 0.56))) * 0.35;

      // The sweep, then the finding.
      const across = smooth(ramp(scene, 0.62, 0.82));
      const sweepX = sweepFrom + (sweepTo - sweepFrom) * across;
      const sweeping = scene > 0.6 && across < 1 ? 1 : 0;
      sweep.position.set(sweepX, y, CENTRE.z + 0.4);
      sweepGlow.mesh.position.copy(sweep.position);
      sweep.lookAt(toCamera.x, sweep.position.y, toCamera.z);
      sweepGlow.mesh.lookAt(toCamera.x, sweep.position.y, toCamera.z);
      sweep.material.opacity = sweeping * 0.9;
      sweepGlow.mesh.material.uniforms.uOpacity.value = sweeping * 0.5;
      // The red follows the light across, in the image cloud's own space.
      images.uniforms.uShown.value = scene > 0.6 ? 1 : 0;
      images.uniforms.uSweep.value = (sweepX - images.mesh.position.x) * 1.2;

      const place = (card, x, y, z, opacity) => { card.mesh.position.set(x, y, z); card.mesh.lookAt(toCamera); card.mesh.material.opacity = opacity; };
      place(imagesLabel, CENTRE.x - gap, y - 2.9, CENTRE.z, smooth(ramp(scene, 0.04, 0.14)) * apart);
      place(textLabel, CENTRE.x + gap, y - 2.9, CENTRE.z, smooth(ramp(scene, 0.04, 0.14)) * apart);
      place(rotationLabel, CENTRE.x, y - 2.9, CENTRE.z, smooth(ramp(scene, 0.4, 0.5)) * (1 - smooth(ramp(scene, 0.6, 0.66))));
      // Beside the cloud on a wide screen; above it on a narrow one.
      place(finding, CENTRE.x + 4.4 * wide, y + 0.4 + (1 - wide) * 3.1, CENTRE.z + 0.6, smooth(ramp(scene, 0.8, 0.9)));
      pool.mesh.material.uniforms.uTint.value.copy(COOL).lerp(RED, smooth(ramp(scene, 0.7, 0.9)) * 0.5);
    },
    dispose() {
      disposers.forEach((fn) => fn());
    },
  };
}
