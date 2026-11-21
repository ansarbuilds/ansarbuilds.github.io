import * as THREE from "three";
import { BONE, SIGNAL, canvasCard, floor, glow, points, ramp, smooth } from "../kit.js";
import { PROMPT, RUN } from "./hedwigRun.js";

/* Hedwig (shots A2-00a and A2-00b): an owl made of points sits on a branch
   under the moon. Beside it a page floats in the dark, and a real run of the
   13.8M model types onto it one piece at a time, with the three pieces it was
   choosing between shown under the line. Word-pieces stream from the owl to
   the page while it writes.

   Local space: +z faces the camera's scene position, +x is screen right. */

const AMBER = new THREE.Color(0.95, 0.71, 0.29);
const MOON = new THREE.Color(0.62, 0.72, 1);

// Points spread over an ellipsoid's surface (with a little depth).
function ellipsoid(out, colors, n, [cx, cy, cz], [rx, ry, rz], color, fill = 0.15) {
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const r = 1 - Math.random() * fill;
    out.push(cx + rx * s * Math.cos(a) * r, cy + ry * u * r, cz + rz * s * Math.sin(a) * r);
    const c = color(u, a); colors.push(c.r, c.g, c.b);
  }
}

function buildOwl() {
  const p = [], c = [];
  const bone = () => BONE, belly = (u, a) => (Math.sin(a) > 0.3 ? BONE.clone().lerp(AMBER, 0.12) : BONE.clone().multiplyScalar(0.72));
  ellipsoid(p, c, 2600, [0, 0, 0], [1.05, 1.45, 0.95], belly);                 // body
  ellipsoid(p, c, 1900, [0, 1.75, 0.05], [0.95, 0.85, 0.85], bone);            // head
  ellipsoid(p, c, 700, [-1.0, -0.05, -0.1], [0.32, 1.15, 0.7], () => BONE.clone().multiplyScalar(0.6)); // wings
  ellipsoid(p, c, 700, [1.0, -0.05, -0.1], [0.32, 1.15, 0.7], () => BONE.clone().multiplyScalar(0.6));
  for (const x of [-0.55, 0.55]) {                                              // ear tufts
    for (let i = 0; i < 160; i++) { const t = Math.random(); p.push(x * (1 + t * 0.25) + (Math.random() - 0.5) * 0.25 * (1 - t), 2.35 + t * 0.6, (Math.random() - 0.5) * 0.25 * (1 - t)); c.push(BONE.r, BONE.g, BONE.b); }
  }
  for (const x of [-0.37, 0.37]) {                                              // eyes: amber rings
    for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, r = 0.16 + Math.random() * 0.12; p.push(x + Math.cos(a) * r, 1.85 + Math.sin(a) * r, 0.8); c.push(AMBER.r, AMBER.g, AMBER.b); }
  }
  for (let i = 0; i < 90; i++) { const t = Math.random(); p.push((Math.random() - 0.5) * 0.18 * (1 - t), 1.6 - t * 0.28, 0.86 + t * 0.08); c.push(AMBER.r, AMBER.g, AMBER.b); } // beak
  const branch = new THREE.Color(0.55, 0.42, 0.3);
  for (let i = 0; i < 900; i++) { const t = Math.random(); p.push(-3.4 + t * 7, -1.55 + Math.sin(t * 3) * 0.12 + (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.2); c.push(branch.r, branch.g, branch.b); }
  return points(new Float32Array(p), new Float32Array(c), 0.05, { opacity: 1, wobble: 0.01 });
}

function buildMoon() {
  const p = [], c = [];
  for (let i = 0; i < 2600; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.3 * Math.sqrt(Math.random());
    p.push(Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 0.1);
    const k = 0.55 + 0.45 * (1 - r / 2.3); c.push(MOON.r * k, MOON.g * k, MOON.b * k);
  }
  return points(new Float32Array(p), new Float32Array(c), 0.06, { opacity: 0.55, wobble: 0.02 });
}

// The page: the prompt, the story so far, and the choice under the cursor.
function drawPage(context, canvas, count) {
  const W = canvas.width, H = canvas.height, pad = 46;
  context.clearRect(0, 0, W, H);
  context.fillStyle = "rgba(12,13,22,.9)";
  context.fillRect(0, 0, W, H);
  context.strokeStyle = "rgba(237,230,216,.18)"; context.lineWidth = 3; context.strokeRect(1.5, 1.5, W - 3, H - 3);
  context.font = "500 22px JetBrains Mono, monospace"; context.fillStyle = "#8d8779";
  context.fillText(`USER: ${PROMPT}`.toUpperCase().slice(0, 64), pad, pad + 6);
  context.fillStyle = "#6fd3a5"; context.fillText("● 13.8M HEDWIG · A REAL RUN, REPLAYED", pad, pad + 42);
  // The story, wrapped.
  context.font = "400 34px JetBrains Mono, monospace";
  const text = RUN.slice(0, count).map(([piece]) => piece).join("");
  const words = text.split(/(\s+)/);
  let x = pad, y = pad + 120;
  const line = 52, maxX = W - pad;
  for (const w of words) {
    if (w.includes("\n")) { x = pad; y += line; continue; }
    const wd = context.measureText(w).width;
    if (x + wd > maxX && w.trim()) { x = pad; y += line; }
    if (!w.trim() && x === pad) continue;
    context.fillStyle = "#ede6d8"; context.fillText(w, x, y); x += wd;
  }
  context.fillStyle = "#f3b54a"; context.fillRect(x + 4, y - 28, 18, 36);
  // The three pieces it was choosing between for the newest one.
  const step = RUN[Math.max(0, Math.min(RUN.length - 1, count - 1))];
  const by = H - 120;
  context.strokeStyle = "rgba(237,230,216,.12)"; context.beginPath(); context.moveTo(pad, by - 34); context.lineTo(W - pad, by - 34); context.stroke();
  context.font = "500 20px JetBrains Mono, monospace"; context.fillStyle = "#8d8779"; context.fillText("CHOOSING", pad, by + 6);
  let bx = pad + 140;
  context.font = "500 26px JetBrains Mono, monospace";
  for (const [piece, pct] of step[1]) {
    const label = `${JSON.stringify(piece)} ${pct}%`, bw = context.measureText(label).width + 32;
    context.fillStyle = "rgba(111,211,165,.18)"; context.fillRect(bx, by - 22, bw * pct / 100, 46);
    context.strokeStyle = piece === step[0] ? "#f3b54a" : "rgba(237,230,216,.25)"; context.strokeRect(bx, by - 22, bw, 46);
    context.fillStyle = piece === step[0] ? "#ede6d8" : "#b9b2a6"; context.fillText(label, bx + 16, by + 10);
    bx += bw + 16;
  }
}

export function buildHedwig({ group }) {
  const disposers = [];
  const keep = (item) => { disposers.push(item.dispose); return item; };

  const ground = keep(floor(44, BONE, 0.12));
  ground.mesh.position.y = -3.2;
  group.add(ground.mesh);

  const moon = keep(buildMoon());
  moon.mesh.position.set(-4.2, 5.2, -6);
  group.add(moon.mesh);
  const moonGlow = keep(glow(9, 6, MOON, { opacity: 0.16 }));
  moonGlow.mesh.position.set(-1.2, -3.15, 0.6);
  group.add(moonGlow.mesh);

  // The owl, a little left; it stands high in the frame (the card takes the lower left).
  const owl = new THREE.Group();
  owl.position.set(-1.6, 0.9, 0.8);
  owl.scale.setScalar(0.95);
  group.add(owl);
  const body = keep(buildOwl());
  owl.add(body.mesh);
  const cone = keep(glow(5, 9, BONE, { cone: true, opacity: 0.06 }));
  cone.mesh.position.set(-1.6, 4.4, 0.8);
  group.add(cone.mesh);

  // The page, turned a little toward the owl.
  const page = keep(canvasCard(6.8, 4.25, 1280, drawPage));
  page.mesh.position.set(3.9, 2.1, 0);
  page.mesh.rotation.y = -0.36;
  group.add(page.mesh);
  const pool = keep(glow(12, 7, AMBER, { opacity: 0.18 }));
  pool.mesh.position.set(2.6, -3.15, 2);
  group.add(pool.mesh);
  let shown = -1;

  // Word-pieces streaming from the owl's eyes to the page.
  const N = 420;
  const sp = new Float32Array(N * 3), sc = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) AMBER.clone().lerp(SIGNAL, (i % 5) / 8).lerp(BONE, (i % 3) / 6).toArray(sc, i * 3);
  const stream = keep(points(sp, sc, 0.06, { opacity: 0, wobble: 0.02 }));
  group.add(stream.mesh);
  const from = new THREE.Vector3(-1.6, 2.6, 1.6), to = new THREE.Vector3(2.4, 2.1, 0.4), pt = new THREE.Vector3();

  return {
    ready: () => true,
    setPlaying() {},
    update({ scene, clock, scale }) {
      owl.rotation.y = -0.25 + 0.55 * smooth(ramp(scene, 0.12, 0.4)) + Math.sin(clock * 0.5) * 0.04;
      owl.position.y = 0.9 + Math.sin(clock * 0.8) * 0.04;
      for (const item of [body, moon]) { item.uniforms.uTime.value = clock; item.uniforms.uScale.value = scale; }

      const count = Math.max(1, Math.round(RUN.length * ramp(scene, 0.22, 0.92)));
      if (count !== shown) { shown = count; page.redraw(count); }
      page.mesh.material.opacity = smooth(ramp(scene, 0.05, 0.2));

      const writing = smooth(ramp(scene, 0.2, 0.28)) * (1 - smooth(ramp(scene, 0.9, 0.97)));
      stream.uniforms.uOpacity.value = writing;
      stream.uniforms.uTime.value = clock; stream.uniforms.uScale.value = scale;
      if (writing > 0) {
        for (let i = 0; i < N; i++) {
          const u = (i / N + clock * 0.28) % 1, swell = Math.sin(Math.PI * u);
          pt.copy(from).lerp(to, u);
          pt.y += Math.sin(u * 9 + i) * 0.5 * swell + swell * 0.9;
          pt.z += Math.cos(u * 7 + i * 1.7) * 0.4 * swell;
          pt.toArray(sp, i * 3);
        }
        stream.mesh.geometry.attributes.position.needsUpdate = true;
      }
    },
    dispose() { disposers.forEach((fn) => fn()); },
  };
}
