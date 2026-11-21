import * as THREE from "three";
import { poseAt } from "../rig.js";
import { SETS } from "../shots.js";
import { BONE, SIGNAL, canvasCard, faceCamera, glow, points, ramp, smooth } from "../actTwo/kit.js";
import { PLANETS, buildOrbitPoints, displayRadius, planetPosition } from "../../three/orbitalMechanics.js";
import { getEmetEntry } from "../../emet/emetKnowledge.js";
import { ACT_FOUR, moments, timeAtProgress } from "./timeline.js";
import { attachFilm } from "../engine.js";

/* Act IV (A4-01 to A4-04), the playground reel, in plain three.js:
   the network collapses into a star; the solar system, on its real orbits;
   an infinity ribbon of light; Emet's terminal answering in its own words.
   One camera flies the shot list's path through all four. */

const GREEN = new THREE.Color(0.35, 1, 0.6);
const VIOLET = new THREE.Color(0.72, 0.62, 1);
const at = (key) => new THREE.Vector3().fromArray(SETS[key].at);

// Points fade out past 240 units: on a phone the camera stands about three
// times further back than on a wide screen, and must still see them.
function pickQuality() {
  const low = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  return low ? { network: 4000, ribbon: 5000, dpr: Math.min(window.devicePixelRatio, 1.25) } : { network: 10000, ribbon: 12000, dpr: Math.min(window.devicePixelRatio, 1.75) };
}

// The network, as points round where the star will be, and how to fold it in.
function buildCollapse(count, centre) {
  const start = new Float32Array(count * 3), positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const tint = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = 6 + 34 * Math.random() ** 0.7, a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
    start.set([r * Math.sin(b) * Math.cos(a) * 1.4, r * Math.cos(b) * 0.55, r * Math.sin(b) * Math.sin(a)], i * 3);
    tint.copy(BONE).lerp(SIGNAL, Math.random() ** 2.5).toArray(colors, i * 3);
  }
  positions.set(start);
  const cloud = points(positions, colors, 0.08, { opacity: 0.9, far: 240, wobble: 0.1 });
  cloud.mesh.position.copy(centre);
  const v = new THREE.Vector3();
  cloud.fold = (amount, clock) => {
    // Inward on a tightening spiral: the outer points arrive last.
    for (let i = 0; i < count; i++) {
      v.fromArray(start, i * 3);
      const r = v.length();
      const left = Math.max(0, 1 - amount * (1.15 - r / 60)) ** 1.6;
      const turn = (1 - left) * 2.4 + clock * 0.05;
      const c = Math.cos(turn), s = Math.sin(turn);
      positions[i * 3] = (v.x * c - v.z * s) * left;
      positions[i * 3 + 1] = v.y * left;
      positions[i * 3 + 2] = (v.x * s + v.z * c) * left;
    }
    cloud.mesh.geometry.attributes.position.needsUpdate = true;
  };
  return cloud;
}

function buildSolarSystem(centre) {
  const group = new THREE.Group();
  group.position.copy(centre);
  const disposers = [];
  const own = (thing) => { disposers.push(() => thing.dispose()); return thing; };
  const SCALE = 4.4;
  const sun = new THREE.Mesh(own(new THREE.SphereGeometry(1.7, 48, 32)), own(new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.78, 0.5) })));
  group.add(sun);
  const corona = glow(9, 9, SIGNAL, { opacity: 0.7 });
  disposers.push(corona.dispose);
  group.add(corona.mesh);
  const light = new THREE.PointLight(0xffe2c2, 900, 90, 2);
  group.add(light, new THREE.AmbientLight(0x202633, 0.4));
  const planets = PLANETS.map((planet) => {
    const radius = planet.radius * 2.1;
    const mesh = new THREE.Mesh(own(new THREE.SphereGeometry(radius, 32, 20)), own(new THREE.MeshStandardMaterial({ color: new THREE.Color(planet.color), roughness: 0.85, metalness: 0, transparent: true })));
    group.add(mesh);
    if (planet.ring) {
      const ring = new THREE.Mesh(own(new THREE.RingGeometry(radius * 1.35, radius * 2.3, 64)), own(new THREE.MeshBasicMaterial({ color: new THREE.Color(planet.color).multiplyScalar(0.8), side: THREE.DoubleSide, transparent: true, opacity: 0.55 })));
      ring.rotation.x = Math.PI / 2 - 0.45;
      mesh.add(ring);
    }
    const orbit = new THREE.LineLoop(own(new THREE.BufferGeometry().setFromPoints(buildOrbitPoints(planet, SCALE, 160).map((p) => new THREE.Vector3(...p)))), own(new THREE.LineBasicMaterial({ color: BONE, transparent: true, opacity: 0.14 })));
    group.add(orbit);
    return { planet, mesh, orbit };
  });
  return {
    group, corona, sun,
    show(amount) {
      for (const { mesh, orbit } of planets) {
        mesh.visible = orbit.visible = amount > 0.01;
        mesh.material.opacity = amount;
        mesh.children.forEach((ring) => { ring.material.opacity = 0.55 * amount; });
        orbit.material.opacity = 0.14 * amount;
      }
    },
    update(days) {
      for (const { planet, mesh } of planets) {
        const { x, y, z, r } = planetPosition(planet, days);
        const dr = displayRadius(r, SCALE) / r;
        mesh.position.set(x * dr, z * dr, -y * dr);
        mesh.rotation.y = days * 0.02;
      }
    },
    dispose: () => disposers.forEach((fn) => fn()),
  };
}

// A lemniscate (the infinity sign), in a gently tilted plane.
function lemniscate(u, size) {
  const s = Math.sin(u), c = Math.cos(u), d = 1 + s * s;
  return new THREE.Vector3((size * c) / d, (size * s * c) / d * 0.9, (size * s * c) / d * 0.35);
}
function buildRibbon(count, centre) {
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const tint = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = (i / count) * Math.PI * 2;
    const p = lemniscate(u, 11);
    const spread = 0.12 + 0.5 * Math.random() ** 3;
    p.add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(spread * 2));
    positions.set([p.x, p.y, p.z], i * 3);
    tint.copy(SIGNAL).lerp(VIOLET, 0.5 + 0.5 * Math.sin(u * 2)).multiplyScalar(0.8).toArray(colors, i * 3);
  }
  const ribbon = points(positions, colors, 0.07, { opacity: 0.85, far: 240, wobble: 0.05 });
  ribbon.mesh.position.copy(centre);
  // A bright head that runs round it.
  const HEAD = 360;
  const headPositions = new Float32Array(HEAD * 3), headColors = new Float32Array(HEAD * 3);
  for (let i = 0; i < HEAD; i++) new THREE.Color(1, 0.92, 0.85).toArray(headColors, i * 3);
  const head = points(headPositions, headColors, 0.11, { opacity: 1, far: 240, wobble: 0.02 });
  head.mesh.position.copy(centre);
  head.run = (clock) => {
    for (let i = 0; i < HEAD; i++) {
      const u = clock * 0.6 - (i / HEAD) * 1.1;
      const p = lemniscate(u, 11);
      headPositions.set([p.x, p.y, p.z], i * 3);
    }
    head.mesh.geometry.attributes.position.needsUpdate = true;
  };
  return { ribbon, head };
}

// Emet's terminal: a glass panel, typed in as the scene plays.
function buildTerminal(centre) {
  const question = "who are you?";
  const answer = getEmetEntry("identity")?.answer ?? "";
  const wrap = (context, text, width) => {
    const words = text.split(" "), lines = [];
    let line = "";
    for (const word of words) { const next = line ? `${line} ${word}` : word; if (context.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next; }
    if (line) lines.push(line);
    return lines;
  };
  const panel = canvasCard(9.6, 6, 1200, (c, canvas, asked, said) => {
    const w = canvas.width, h = canvas.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = "rgba(6,18,11,.72)"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(90,255,150,.35)"; c.lineWidth = 3; c.strokeRect(1.5, 1.5, w - 3, h - 3);
    c.fillStyle = "rgba(90,255,150,.08)"; c.fillRect(0, 0, w, 64);
    c.font = "500 26px JetBrains Mono, monospace"; c.textBaseline = "middle";
    c.fillStyle = "#7dffb0"; c.fillText("emet · portfolio assistant", 30, 33);
    c.font = "500 34px JetBrains Mono, monospace"; c.textBaseline = "top";
    c.fillStyle = "#efe6d8"; c.fillText(`> ${question.slice(0, asked)}`, 30, 104);
    c.fillStyle = "#9dffc2";
    const lines = wrap(c, answer.slice(0, said), w - 60);
    lines.forEach((line, i) => c.fillText(line, 30, 172 + i * 48));
    // The caret, where the typing is.
    const caretLine = said > 0 ? lines.length - 1 : -1;
    const x = caretLine >= 0 ? 30 + c.measureText(lines[caretLine] ?? "").width + 6 : 30 + c.measureText(`> ${question.slice(0, asked)}`).width + 6;
    const y = caretLine >= 0 ? 172 + caretLine * 48 : 104;
    c.fillStyle = "#7dffb0"; c.fillRect(x, y + 2, 18, 34);
  });
  panel.mesh.position.copy(centre);
  panel.mesh.material.opacity = 0;
  const halo = glow(16, 11, GREEN, { opacity: 0 });
  halo.mesh.position.copy(centre).add(new THREE.Vector3(0, 0, -0.6));
  const dustPositions = new Float32Array(2400 * 3), dustColors = new Float32Array(2400 * 3);
  for (let i = 0; i < 2400; i++) { dustPositions.set([(Math.random() - 0.5) * 50, (Math.random() - 0.5) * 26, -4 - Math.random() * 30], i * 3); GREEN.clone().multiplyScalar(0.4 + Math.random() * 0.4).toArray(dustColors, i * 3); }
  const dust = points(dustPositions, dustColors, 0.07, { opacity: 0.6, far: 240, wobble: 0.2 });
  dust.mesh.position.copy(centre);
  let shown = "";
  return {
    panel, halo, dust, question, answer,
    type(progress) {
      const asked = Math.round(question.length * ramp(progress, 0.15, 0.32));
      const said = Math.round(answer.length * ramp(progress, 0.4, 0.86));
      const key = `${asked}/${said}`;
      if (key !== shown) { shown = key; panel.redraw(asked, said); }
    },
  };
}

export function createActFour(canvas, { getProgress, onFrame }) {
  const quality = pickQuality();
  // The shared renderer (see engine.js): this act draws into it, and its
  // frames are copied onto this canvas.
  const film = attachFilm(canvas, { clear: 0x040406, bloom: [0.55, 0.5, 0.5], grain: 0.008 });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040406, 0.012);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  const disposers = [];

  // The network folds into the solar system's sun.
  const network = buildCollapse(quality.network, at("solar"));
  const solar = buildSolarSystem(at("solar"));
  const { ribbon, head } = buildRibbon(quality.ribbon, at("ribbon"));
  const terminal = buildTerminal(at("head"));
  scene.add(network.mesh, solar.group, ribbon.mesh, head.mesh, terminal.dust.mesh, terminal.halo.mesh, terminal.panel.mesh);
  disposers.push(network.dispose, solar.dispose, ribbon.dispose, head.dispose, terminal.panel.dispose, terminal.halo.dispose, terminal.dust.dispose);

  const finish = film.finish;

  let fit = 1;
  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth, height = canvas.clientHeight || window.innerHeight;
    film.resize();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fit = Math.min(1, Math.max(0.35, camera.aspect / 1.5));
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  let active = false, frame = 0, last = performance.now(), clock = 0, disposed = false, settledFrames = 0;
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  function tick(nowMs) {
    if (!active || disposed) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    clock += dt;
    const t = timeAtProgress(getProgress());
    const pose = poseAt(ACT_FOUR, t);
    look.fromArray(pose.look);
    pos.fromArray(pose.pos).sub(look).divideScalar(fit).add(look);
    if (camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    // On a narrow screen, pan so each scene sits above its card.
    const pan = (1 - fit) * 0.55 * pos.distanceTo(look) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    pos.y -= pan; look.y -= pan;
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    const scale = film.pixelHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

    const m = moments(t);
    // The collapse, and the star it leaves.
    if (m.collapse < 1 || network.mesh.visible) network.fold(m.collapse, clock);
    network.uniforms.uOpacity.value = 0.9 * (1 - smooth(ramp(m.collapse, 0.85, 1)));
    network.mesh.visible = network.uniforms.uOpacity.value > 0.01;
    // The sun forms out of it; then the planets come in round it.
    const burn = smooth(ramp(m.collapse, 0.55, 1));
    solar.sun.scale.setScalar(0.05 + burn * 0.95 + Math.sin(clock * 3) * 0.03 * burn);
    solar.corona.mesh.material.uniforms.uOpacity.value = 0.7 * burn * m.solar;
    solar.show(m.planets * m.solar);
    solar.group.visible = m.solar > 0.01;
    solar.sun.material.transparent = true;
    solar.sun.material.opacity = m.solar;
    // The solar system turns at a few months a second.
    solar.update(8000 + clock * 45);
    faceCamera(solar.corona.mesh, camera);
    head.run(clock);
    // Emet's terminal.
    const emet = m.progress["A4-04"];
    terminal.panel.mesh.material.opacity = smooth(ramp(emet, 0, 0.25));
    terminal.halo.mesh.material.uniforms.uOpacity.value = 0.25 * smooth(ramp(emet, 0, 0.25));
    faceCamera(terminal.panel.mesh, camera);
    faceCamera(terminal.halo.mesh, camera);
    terminal.type(emet);

    for (const cloud of [network, ribbon, head, terminal.dust]) { cloud.uniforms.uTime.value = clock; cloud.uniforms.uScale.value = scale; }
    finish.uniforms.uTime.value = clock;
    // Before the act starts or after it ends only ambient motion is left (dust,
    // a caret), often while the next section plays beside it: a quarter of
    // the frames is enough there.
    if ((t <= 0 || t >= ACT_FOUR.seconds) && settledFrames++ % 4) return;
    if (t > 0 && t < ACT_FOUR.seconds) settledFrames = 0;
    film.render(scene, camera, { now: nowMs, skip: t <= 0 || t >= ACT_FOUR.seconds });
    onFrame?.(t, m);
  }

  return {
    question: terminal.question,
    answer: terminal.answer,
    setActive(on) {
      if (on === active || disposed) return;
      active = on;
      if (on) { last = performance.now(); frame = requestAnimationFrame(tick); } else cancelAnimationFrame(frame);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposers.forEach((fn) => fn());
      film.release();
    },
  };
}
