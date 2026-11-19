import * as THREE from "three";
import { BONE, SIGNAL, additive, canvasCard, floor, glow, points, ramp, smooth } from "../kit.js";

/* Jarvis (shots A2-02a and A2-02b): a control room at night. Panels of the
   real dashboard (sample data) orbit a glowing core, the agents circle it,
   and a gauge counts the day's AI calls up to the hard cap of 20, where it
   glows like a reactor limit.

   Local space: +z faces the camera's scene position, +x is screen right. */

const NIGHT = new THREE.Color(0.42, 0.6, 1);
const CAP = 20;
// Set back from the camera's last position, so the panels stay in frame.
const CORE = new THREE.Vector3(2.4, 1.5, -4);
const PANELS = [
  { src: "/shots/jarvis/command-lab.webp", width: 4.8, aspect: 1000 / 1600, angle: 0.25, brightness: 1 },
  { src: "/shots/jarvis/constellation.webp", width: 4, aspect: 910 / 1160, angle: 2.35, brightness: 1 },
  { src: "/shots/jarvis/dashboard.webp", width: 4, aspect: 900 / 1280, angle: 4.3, brightness: 0.62 },
];
// The agents, by the names they have in the real dashboard.
const AGENTS = ["SCOUT", "BUILDER", "RECRUITER", "TICKER"];

function label(text, color) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const font = "500 44px JetBrains Mono, monospace";
  context.font = font;
  canvas.width = Math.ceil(context.measureText(text).width) + 20;
  canvas.height = 64;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.fillText(text, 10, 32);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
  sprite.scale.set((0.34 * canvas.width) / canvas.height, 0.34, 1);
  return { sprite, dispose: () => { map.dispose(); sprite.material.dispose(); } };
}

export function buildJarvis({ group, media }) {
  const disposers = [];
  const keep = (item) => { disposers.push(item.dispose); return item; };

  const ground = keep(floor(48, NIGHT, 0.2));
  ground.mesh.position.y = -3.2;
  group.add(ground.mesh);
  const pool = keep(glow(18, 12, NIGHT, { opacity: 0.4 }));
  pool.mesh.position.set(CORE.x, -3.15, CORE.z + 0.5);
  group.add(pool.mesh);

  // The core: a ball of points with a hot centre, and two rings round it.
  const CORE_POINTS = 2600;
  const corePositions = new Float32Array(CORE_POINTS * 3), coreColors = new Float32Array(CORE_POINTS * 3);
  const tint = new THREE.Color();
  for (let i = 0; i < CORE_POINTS; i++) {
    const r = 1.35 * Math.cbrt(Math.random()), a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
    corePositions.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)], i * 3);
    tint.copy(NIGHT).lerp(BONE, (1 - r / 1.35) * 0.6).multiplyScalar(0.7).toArray(coreColors, i * 3);
  }
  const core = keep(points(corePositions, coreColors, 0.07, { wobble: 0.05 }));
  core.mesh.position.copy(CORE);
  group.add(core.mesh);
  const heart = keep(glow(4.4, 4.4, NIGHT, { opacity: 0.35 }));
  heart.mesh.rotation.set(0, 0, 0);
  heart.mesh.position.copy(CORE);
  group.add(heart.mesh);
  const ringGeometry = new THREE.TorusGeometry(2.1, 0.012, 6, 160);
  const ringMaterial = additive({ uniforms: { uColor: { value: NIGHT.clone() }, uOpacity: { value: 0.8 } }, vertexShader: "void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}", fragmentShader: "uniform vec3 uColor;uniform float uOpacity;void main(){gl_FragColor=vec4(uColor*uOpacity,1.);}" });
  const rings = [0.5, -0.9].map((tilt, i) => {
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(CORE);
    ring.rotation.set(Math.PI / 2 + tilt, i * 0.6, 0);
    ring.scale.setScalar(1 + i * 0.35);
    group.add(ring);
    return ring;
  });

  // The agents: dots on their own orbits, each named.
  const agents = AGENTS.map((name, i) => {
    const dotGeometry = new THREE.SphereGeometry(0.11, 12, 8);
    const dot = new THREE.Mesh(dotGeometry, new THREE.MeshBasicMaterial({ color: i === 1 ? SIGNAL.clone() : BONE.clone().multiplyScalar(0.9) }));
    const tag = keep(label(name, i === 1 ? "#ff8a5f" : "#c9d6ff"));
    group.add(dot, tag.sprite);
    disposers.push(() => { dotGeometry.dispose(); dot.material.dispose(); });
    return { dot, tag: tag.sprite, radius: 2.7 + i * 0.55, speed: 0.32 - i * 0.05, phase: i * 1.7, tilt: 0.35 - i * 0.22 };
  });

  // The panels: the real screens, on frames, round the core.
  const loader = new THREE.TextureLoader();
  const panels = PANELS.map((panel) => {
    const geometry = new THREE.PlaneGeometry(panel.width, panel.width * panel.aspect);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(panel.brightness), transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide });
    loader.load(media(panel.src), (map) => { map.colorSpace = THREE.SRGBColorSpace; material.map = map; material.needsUpdate = true; disposers.push(() => map.dispose()); });
    const mesh = new THREE.Mesh(geometry, material);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: NIGHT, transparent: true, opacity: 0 }));
    mesh.add(edges);
    group.add(mesh);
    disposers.push(() => { geometry.dispose(); material.dispose(); edges.geometry.dispose(); edges.material.dispose(); });
    return { ...panel, mesh, edges };
  });

  // The gauge: today's calls against the cap.
  let shown = -1;
  const gauge = keep(canvasCard(4.4, 1.7, 880, (context, canvas, calls) => {
    const full = calls >= CAP;
    const w = canvas.width, h = canvas.height;
    context.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.92, r = h * 0.72;
    context.lineCap = "round";
    context.lineWidth = 18;
    context.strokeStyle = "rgba(140,170,255,.18)";
    context.beginPath(); context.arc(cx, cy, r, Math.PI, 0); context.stroke();
    context.strokeStyle = full ? "#ff8a5f" : "#8fb0ff";
    if (full) { context.shadowColor = "#ff8a5f"; context.shadowBlur = 30; }
    context.beginPath(); context.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * (calls / CAP)); context.stroke();
    context.shadowBlur = 0;
    context.textAlign = "center";
    context.fillStyle = full ? "#ff8a5f" : "#efe6d8";
    context.font = "400 120px Anton, sans-serif";
    context.fillText(`${calls}`, cx, cy - 30);
    context.font = "500 26px JetBrains Mono, monospace";
    context.fillStyle = full ? "#ff8a5f" : "#9fb4e6";
    context.fillText(full ? "HARD CAP REACHED" : `AI CALLS TODAY · CAP ${CAP}`, cx, cy + 4);
  }));
  gauge.mesh.position.set(CORE.x, -1.2, -1);
  group.add(gauge.mesh);
  const limit = keep(glow(6, 3, SIGNAL, { opacity: 0 }));
  limit.mesh.position.set(CORE.x, -3.12, -1);
  group.add(limit.mesh);

  const face = new THREE.Vector3(), local = new THREE.Vector3();
  return {
    setPlaying() {},
    update({ arrive, scene, clock, scale, camera }) {
      for (const item of [core]) { item.uniforms.uTime.value = clock; item.uniforms.uScale.value = scale; }
      const calls = Math.round(CAP * smooth(ramp(scene, 0.34, 0.72)));
      const full = calls >= CAP;
      // At the cap the core strains: brighter, faster, warmer.
      const strain = full ? 0.5 + 0.5 * Math.sin(clock * 9) : 0;
      core.uniforms.uOpacity.value = 0.4 + 0.25 * smooth(ramp(arrive, 0.3, 1)) + strain * 0.2;
      heart.mesh.material.uniforms.uOpacity.value = 0.3 + strain * 0.25;
      heart.mesh.material.uniforms.uTint.value.copy(NIGHT).lerp(SIGNAL, full ? 0.55 : 0);
      rings.forEach((ring, i) => { ring.rotation.z = clock * (0.18 + i * 0.1) * (full ? 2.2 : 1); });
      ringMaterial.uniforms.uColor.value.copy(NIGHT).lerp(SIGNAL, full ? 0.6 : 0);

      // Cards and labels face the lens.
      group.updateMatrixWorld();
      face.copy(camera.position);
      group.worldToLocal(face);
      heart.mesh.lookAt(face.x, face.y, face.z);

      agents.forEach((agent) => {
        const a = clock * agent.speed + agent.phase;
        local.set(Math.cos(a) * agent.radius, Math.sin(a) * agent.radius * Math.sin(agent.tilt) * 0.6, Math.sin(a) * agent.radius).add(CORE);
        agent.dot.position.copy(local);
        agent.tag.position.copy(local).add(new THREE.Vector3(0, 0.32, 0));
        agent.tag.material.opacity = smooth(ramp(scene, 0.05, 0.25)) * 0.95;
      });

      // Panels open out from behind the core, then turn slowly round it.
      const open = smooth(ramp(arrive, 0.35, 1)) * 0.6 + smooth(ramp(scene, 0, 0.3)) * 0.4;
      panels.forEach((panel) => {
        const a = panel.angle + clock * 0.05 + scene * 0.9;
        const radius = 1.5 + 5.2 * open;
        panel.mesh.position.set(CORE.x + Math.cos(a) * radius, CORE.y + 0.2 + Math.sin(a * 2) * 0.4, CORE.z + Math.sin(a) * radius * 0.55 - 0.8);
        panel.mesh.lookAt(face.x, panel.mesh.position.y, face.z);
        // Dimmer when swung round behind.
        const front = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(a));
        panel.mesh.material.opacity = open * front;
        panel.edges.material.opacity = open * 0.6;
      });

      if (calls !== shown) { shown = calls; gauge.redraw(calls); }
      gauge.mesh.lookAt(face.x, gauge.mesh.position.y, face.z);
      gauge.mesh.material.opacity = smooth(ramp(scene, 0.26, 0.36));
      limit.mesh.material.uniforms.uOpacity.value = full ? 0.35 + strain * 0.3 : 0;
    },
    dispose() {
      ringGeometry.dispose();
      ringMaterial.dispose();
      disposers.forEach((fn) => fn());
    },
  };
}
