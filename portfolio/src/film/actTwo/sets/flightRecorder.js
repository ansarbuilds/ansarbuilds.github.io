import * as THREE from "three";
import { FLAGSHIPS } from "../../../data/showcase.js";
import { canvasCard, floor, glow, ramp, smooth } from "../kit.js";

/* Agent Flight Recorder (shots A2-03a and A2-03b): an aircraft black box in
   an orange spotlight. It comes apart into one layer per recorded step (the
   run from the home page's illustration: read, edit, run, failure, suspect,
   evidence), the failing layer lit red. Then the suspect edit flashes and
   flies to the camera with its diff.

   This is an illustration of a recorded run, and its card says so.
   Local space: +z faces the camera's scene position, +x is screen right. */

const ORANGE = new THREE.Color(1, 0.42, 0.12);
const RED = new THREE.Color(1, 0.18, 0.14);
const BOX = { w: 3.4, h: 2.7, d: 2.5 };
const AT = new THREE.Vector3(0.6, 0.9, -1.2);
const LINES = FLAGSHIPS.find((flag) => flag.slug === "agent-flight-recorder").visual.lines;
// The edit the recorder names as the suspect, and the failure it caused.
const SUSPECT = LINES.findIndex(([, text]) => /\bedit\b/.test(text));
const FAILURE = LINES.findIndex(([tone]) => tone === "bad");
const BESIDE = new THREE.Vector3(BOX.w * 0.5 + 2.25, 0, 0), ABOVE = new THREE.Vector3(0, 0.55, 0), BELOW = new THREE.Vector3(0, 1.3, 0);
const COLORS = { dim: "#cfc4b6", bad: "#ff5a4e", good: "#ff8a5f" };

// The recorder's casing: orange, with the words every black box carries.
function casingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 800;
  const c = canvas.getContext("2d");
  c.fillStyle = "#ff6a1f"; c.fillRect(0, 0, 1024, 800);
  // Reflective tape.
  c.fillStyle = "#f4f1ea";
  for (const y of [90, 650]) { c.fillRect(0, y, 1024, 60); }
  c.fillStyle = "#1a0d06";
  c.textAlign = "center";
  c.font = "400 150px Anton, sans-serif";
  c.fillText("FLIGHT RECORDER", 512, 400);
  c.font = "500 54px JetBrains Mono, monospace";
  c.fillText("DO NOT OPEN", 512, 520);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export function buildFlightRecorder({ group }) {
  const disposers = [];
  const keep = (item) => { disposers.push(item.dispose); return item; };

  const ground = keep(floor(44, ORANGE, 0.14));
  ground.mesh.position.y = -3.2;
  group.add(ground.mesh);
  const pool = keep(glow(11, 8, ORANGE, { opacity: 0.45 }));
  pool.mesh.position.set(AT.x, -3.15, AT.z);
  group.add(pool.mesh);
  const cone = keep(glow(7, 11, ORANGE, { cone: true, opacity: 0.09 }));
  cone.mesh.position.set(AT.x, 3.2, AT.z);
  group.add(cone.mesh);

  // A real spotlight, so the casing has a lit top and shaded sides.
  const spot = new THREE.SpotLight(0xffd2b0, 520, 0, 0.42, 0.65, 2);
  spot.position.set(AT.x + 0.8, 10, AT.z + 2);
  spot.target.position.copy(AT);
  const fill = new THREE.HemisphereLight(0x4a3a40, 0x120804, 0.9);
  group.add(spot, spot.target, fill);

  // The box is a stack of slabs, one per recorded step.
  const slabHeight = BOX.h / LINES.length;
  const slabGeometry = new THREE.BoxGeometry(BOX.w, slabHeight * 0.96, BOX.d);
  const edgeGeometry = new THREE.EdgesGeometry(slabGeometry);
  disposers.push(() => { slabGeometry.dispose(); edgeGeometry.dispose(); });
  const slabs = LINES.map(([tone, text]) => {
    const material = new THREE.MeshStandardMaterial({ color: ORANGE.clone(), roughness: 0.55, metalness: 0.15, emissive: new THREE.Color(0, 0, 0) });
    const mesh = new THREE.Mesh(slabGeometry, material);
    const edges = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color: 0x1a0d06, transparent: true, opacity: 0.7 }));
    mesh.add(edges);
    group.add(mesh);
    const tag = keep(canvasCard(4, 0.46, 1100, (c, canvas, flash) => {
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = "rgba(10,6,4,.78)";
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = flash ? "#ff5a4e" : COLORS[tone];
      c.fillRect(0, 0, 10, canvas.height);
      c.font = "500 54px JetBrains Mono, monospace";
      c.textBaseline = "middle";
      c.fillText(text, 34, canvas.height / 2);
    }));
    tag.redraw(false);
    tag.mesh.material.opacity = 0;
    group.add(tag.mesh);
    disposers.push(() => { material.dispose(); edges.material.dispose(); });
    return { mesh, material, edges, tag, flashed: false, seed: Math.random() };
  });

  // The casing's face: the words, on the front of the closed box.
  const faceMap = casingTexture();
  const faceGeometry = new THREE.PlaneGeometry(BOX.w * 0.98, BOX.h * 0.96);
  const face = new THREE.Mesh(faceGeometry, new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.6, transparent: true }));
  face.position.set(AT.x, AT.y, AT.z + BOX.d / 2 + 0.01);
  group.add(face);
  disposers.push(() => { faceMap.dispose(); faceGeometry.dispose(); face.material.dispose(); });

  // The evidence the recorder keeps with the suspect: the diff.
  const diff = keep(canvasCard(4.2, 1.5, 1100, (c, canvas) => {
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "rgba(10,6,4,.9)";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.font = "500 40px JetBrains Mono, monospace";
    c.textBaseline = "top";
    c.fillStyle = "#9a9087";
    c.fillText("auth/session.py · edit #2", 30, 26);
    c.fillStyle = "#ff5a4e";
    c.fillText("-   if token.expired:", 30, 106);
    c.fillText("-       raise SessionExpired", 30, 160);
    c.fillStyle = "#cfc4b6";
    c.fillText("    return token", 30, 214);
    c.fillStyle = "#ff8a5f";
    c.fillText("→ test_refresh_token failed", 30, 288);
  }));
  diff.redraw();
  diff.mesh.material.opacity = 0;
  group.add(diff.mesh);

  const toCamera = new THREE.Vector3(), forward = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), target = new THREE.Vector3(), home = new THREE.Vector3();
  return {
    setPlaying() {},
    update({ scene, clock, camera }) {
      // Apart: the layers separate and fan out, then hold.
      const apart = smooth(ramp(scene, 0.1, 0.42));
      const flash = scene > 0.5 && scene < 0.66 ? (Math.sin(clock * 22) > 0 ? 1 : 0.35) : scene >= 0.66 ? 1 : 0;
      const fly = smooth(ramp(scene, 0.62, 0.86));

      // Where "in front of the lens" is, in this set's own space.
      camera.getWorldDirection(forward);
      up.copy(camera.up).applyQuaternion(camera.quaternion);
      right.crossVectors(forward, up).normalize();
      // Close, but to the right and high, clear of the card in the lower left.
      // On a narrow screen: nearer the middle, higher (the card is taller there) and further off.
      const wide = Math.min(1, camera.aspect / 1.5);
      target.copy(camera.position).addScaledVector(forward, 12 + (1 - wide) * 7).addScaledVector(right, 2.6 * wide).addScaledVector(up, 1.4 + (1 - wide) * 2.4);
      group.worldToLocal(target);
      toCamera.copy(camera.position);
      group.worldToLocal(toCamera);

      slabs.forEach((slab, i) => {
        const centre = i - (LINES.length - 1) / 2;
        // Top step first: the stack reads top to bottom like the recording.
        home.set(AT.x - centre * 0.35 * apart, AT.y - centre * (slabHeight + 0.72 * apart), AT.z + Math.sin(i * 1.7) * 0.6 * apart);
        slab.mesh.rotation.set(0, (slab.seed - 0.5) * 0.5 * apart, (slab.seed - 0.5) * 0.08 * apart);
        if (i === SUSPECT) {
          slab.mesh.position.copy(home).lerp(target, fly);
          slab.mesh.lookAt(toCamera.x, slab.mesh.position.y, toCamera.z);
          slab.mesh.rotation.y += (1 - fly) * 0.3;
          slab.mesh.scale.setScalar(1 - fly * 0.3);
        } else {
          slab.mesh.position.copy(home);
          slab.mesh.scale.setScalar(1);
        }
        const red = i === FAILURE ? apart : i === SUSPECT ? flash : 0;
        slab.material.color.copy(ORANGE).lerp(RED, red * 0.8);
        slab.material.emissive.copy(RED).multiplyScalar(red * (i === SUSPECT ? 0.9 : 0.45));
        if ((i === SUSPECT && flash > 0.5) !== slab.flashed) { slab.flashed = i === SUSPECT && flash > 0.5; slab.tag.redraw(slab.flashed); }
        // Each layer's step, beside it, facing the lens.
        // (The suspect's rides just above it on the way in.)
        slab.tag.mesh.position.copy(slab.mesh.position).add(i === SUSPECT && fly > 0 ? ABOVE : BESIDE);
        slab.tag.mesh.lookAt(toCamera);
        slab.tag.mesh.material.opacity = smooth(ramp(apart, 0.55, 1)) * (i === SUSPECT || fly < 0.5 ? 1 : 1 - (fly - 0.5) * 1.2);
      });

      // The words fade as the box opens; the diff follows the suspect in.
      face.material.opacity = 1 - smooth(ramp(apart, 0, 0.25));
      face.visible = face.material.opacity > 0.01;
      const suspect = slabs[SUSPECT].mesh;
      diff.mesh.position.copy(suspect.position).sub(BELOW);
      diff.mesh.lookAt(toCamera);
      diff.mesh.material.opacity = smooth(ramp(scene, 0.8, 0.92));
      pool.mesh.material.uniforms.uTint.value.copy(ORANGE).lerp(RED, flash * 0.5);
      spot.intensity = 520 + flash * 160;
    },
    dispose() {
      disposers.forEach((fn) => fn());
    },
  };
}
