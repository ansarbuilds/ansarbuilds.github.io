import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { poseAt } from "../rig.js";
import { finishShader } from "../coldOpen/shaders.js";
import { ACT_ONE, LAYOUT, countAt, numberProgress, overlays, timeAtProgress } from "./timeline.js";
import { pointFragment, pointVertex, riverFragment, riverVertex } from "./shaders.js";
import { CODE_LINES } from "./codeLines.js";

/* Act I (storyboard A1-01 to A1-03) in plain three.js.

   createActOne(canvas, options) builds the scene and returns
   { setActive, dispose }. While active it draws every frame: it asks
   `getProgress()` how far the visitor has scrolled through the act (0 to 1),
   turns that into film time and a camera pose, and tells the page through
   `onFrame(t, overlays)` so it can place its title cards.

   options.receipts  [{ value: "10+", label }] for the four numbers
   options.tools     ["Claude Code", ...] for the orbit
   Fonts must be loaded first: the name, numbers and labels are drawn from them. */

const BONE = new THREE.Color(0.94, 0.9, 0.85);
const SIGNAL = new THREE.Color(1, 0.54, 0.37);
const DIM_BONE = new THREE.Color(0.66, 0.63, 0.6);

function pickQuality() {
  const low = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  return low
    ? { name: 9000, dust: 6000, dpr: Math.min(window.devicePixelRatio, 1.25) }
    : { name: 26000, dust: 16000, dpr: Math.min(window.devicePixelRatio, 1.75) };
}

const additive = (options) => new THREE.ShaderMaterial({ blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, ...options });

function pointsFrom(positions, colors, size) {
  const count = positions.length / 3;
  const seeds = new Float32Array(count * 2);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 2));
  const uniforms = { uTime: { value: 0 }, uScale: { value: 1 }, uSize: { value: size }, uPart: { value: 0 }, uOpacity: { value: 1 }, uFar: { value: 170 } };
  const points = new THREE.Points(geometry, additive({ uniforms, vertexShader: pointVertex, fragmentShader: pointFragment }));
  points.frustumCulled = false;
  return { points, uniforms };
}

// Pixels of text drawn on a canvas: [x, y, ...] where the ink is.
function inkOf(lines, { font, gap, stroke }) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.font = font;
  const widths = lines.map(({ text }) => context.measureText(text).width);
  const lineHeight = parseFloat(/(\d+)px/.exec(font)[1]) * gap;
  canvas.width = Math.ceil(Math.max(...widths)) + 20;
  canvas.height = Math.ceil(lineHeight * lines.length) + 20;
  const pixels = lines.map(({ text, outlined }, i) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = font;
    context.textBaseline = "middle";
    const y = 10 + lineHeight * (i + 0.5);
    if (outlined) { context.lineWidth = stroke; context.strokeStyle = "#fff"; context.strokeText(text, 10, y); }
    else { context.fillStyle = "#fff"; context.fillText(text, 10, y); }
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const found = [];
    for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) if (data[(py * canvas.width + px) * 4 + 3] > 110) found.push(px, py);
    return found;
  });
  return { pixels, width: Math.max(...widths), height: canvas.height, pad: 10 };
}

// The name, in points, as wide as LAYOUT.name.width, centred on its place.
function buildName(count) {
  const ink = inkOf([{ text: "MOHAMED" }, { text: "ANSAR", outlined: true }], { font: "400 220px Anton", gap: 0.9, stroke: 5 });
  const scale = LAYOUT.name.width / ink.width;
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  // The outline is thin: give it a fair share so it still reads.
  const shares = [0.6, 0.4];
  let written = 0;
  ink.pixels.forEach((pixels, line) => {
    const share = line === ink.pixels.length - 1 ? count - written : Math.round(count * shares[line]);
    const color = line === 0 ? BONE : SIGNAL;
    for (let i = 0; i < share; i++) {
      const pick = Math.floor(Math.random() * (pixels.length / 2)) * 2;
      positions[written * 3] = (pixels[pick] + Math.random() - ink.pad - ink.width / 2) * scale + LAYOUT.name.at[0];
      positions[written * 3 + 1] = -(pixels[pick + 1] + Math.random() - ink.height / 2) * scale + LAYOUT.name.at[1];
      positions[written * 3 + 2] = (Math.random() - 0.5) * 0.4 + LAYOUT.name.at[2];
      color.toArray(colors, written * 3);
      written++;
    }
  });
  return pointsFrom(positions, colors, 0.075);
}

// Dust in a loose tube around the path, with a clear core for the camera.
function buildDust(count) {
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const { from, to } = LAYOUT.river;
  const tint = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2, reach = 4 + 52 * Math.random() ** 0.85;
    positions[i * 3] = Math.cos(angle) * reach * 1.3;
    positions[i * 3 + 1] = Math.sin(angle) * reach * 0.7;
    positions[i * 3 + 2] = from + (to - from) * Math.random();
    tint.copy(BONE).lerp(SIGNAL, Math.random() ** 3).toArray(colors, i * 3);
  }
  const dust = pointsFrom(positions, colors, 0.08);
  dust.uniforms.uOpacity.value = 0.55;
  return dust;
}

function buildRiver(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 2048;
  const context = canvas.getContext("2d");
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = "500 17px JetBrains Mono, monospace";
  context.textBaseline = "top";
  const columns = [24, 360, 696];
  let line = 0;
  for (const x of columns) {
    for (let y = 8; y < canvas.height - 20; y += 26) {
      const text = CODE_LINES[line++ % CODE_LINES.length];
      // Most lines dim, every so often one lit up like a signal passing.
      context.fillStyle = line % 11 === 0 ? "#ff8a5f" : line % 4 === 0 ? "#8a8075" : "#4a443e";
      context.fillText(text, x, y);
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  map.colorSpace = THREE.SRGBColorSpace;
  const { y, from, to, width } = LAYOUT.river;
  const geometry = new THREE.PlaneGeometry(width, from - to);
  const uniforms = { uMap: { value: map }, uFlow: { value: 0 }, uRepeat: { value: 4 }, uOpacity: { value: 0.85 } };
  const mesh = new THREE.Mesh(geometry, additive({ uniforms, vertexShader: riverVertex, fragmentShader: riverFragment }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y, (from + to) / 2);
  mesh.frustumCulled = false;
  return { mesh, uniforms, dispose: () => { geometry.dispose(); map.dispose(); mesh.material.dispose(); } };
}

// A cube per cell of the digits, from the text drawn small on a canvas.
const CELL = 0.3;
function cellsFor(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 300; canvas.height = 130;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.font = "400 108px Anton";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff";
  context.fillText(text, 150, 68);
  const { data } = context.getImageData(0, 0, 300, 130);
  const cells = [];
  const step = 5;
  for (let y = 0; y < 130; y += step) for (let x = 0; x < 300; x += step) {
    if (data[((y + 2) * 300 + x + 2) * 4 + 3] > 120) cells.push(((x - 150) / step) * CELL, (-(y - 65) / step) * CELL);
  }
  return cells;
}

function labelSprite(text, { font, color, height }) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = font;
  canvas.width = Math.ceil(context.measureText(text).width) + 24;
  canvas.height = Math.ceil(parseFloat(/(\d+)px/.exec(font)[1]) * 1.5);
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.fillText(text, 12, canvas.height / 2);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((height * canvas.width) / canvas.height, height, 1);
  sprite.userData.base = sprite.scale.clone();
  return sprite;
}

function buildNumbers(receipts) {
  const cube = new THREE.BoxGeometry(CELL * 0.8, CELL * 0.8, CELL * 0.8);
  const numbers = receipts.slice(0, LAYOUT.numbers.length).map(({ value, label }, index) => {
    // Every string it will show on the way up, so the count never builds a layout mid-flight.
    const layouts = new Map();
    for (let i = 0; i <= 1; i += 0.001) { const text = countAt(value, i); if (!layouts.has(text)) layouts.set(text, cellsFor(text)); }
    layouts.set(value, cellsFor(value));
    const most = Math.max(...[...layouts.values()].map((cells) => cells.length / 2));
    const material = new THREE.MeshBasicMaterial({ color: index === 0 ? SIGNAL.clone().multiplyScalar(0.62) : BONE.clone().multiplyScalar(0.46), transparent: true });
    const mesh = new THREE.InstancedMesh(cube, material, most);
    mesh.count = 0;
    mesh.frustumCulled = false;
    const group = new THREE.Group();
    group.position.fromArray(LAYOUT.numbers[index]);
    group.add(mesh);
    const caption = labelSprite(label.toUpperCase(), { font: "500 30px JetBrains Mono", color: "#a39a8f", height: 0.5 });
    caption.position.set(0, -3.8, 0);
    group.add(caption);
    // Each cube rises out of the river from its own depth.
    const seeds = Float32Array.from({ length: most }, () => Math.random());
    return { value, group, mesh, caption, layouts, seeds, shown: null, progress: -1, opacity: 0, captionOpacity: 0, baseY: LAYOUT.numbers[index][1] };
  });
  return { numbers, dispose: () => { cube.dispose(); numbers.forEach((n) => { n.mesh.material.dispose(); n.caption.material.map.dispose(); n.caption.material.dispose(); }); } };
}

const dummy = new THREE.Object3D();
function drawNumber(number, progress, time) {
  const text = countAt(number.value, progress);
  const cells = number.layouts.get(text) ?? number.layouts.get(number.value);
  const rise = 1 - (1 - Math.min(1, progress * 2.2)) ** 3;
  number.mesh.count = cells.length / 2;
  for (let i = 0; i < number.mesh.count; i++) {
    const late = number.seeds[i];
    const up = Math.min(1, Math.max(0, rise * 1.4 - late * 0.4));
    dummy.position.set(cells[i * 2], cells[i * 2 + 1] - (1 - up) * (7 + late * 6), Math.sin(time * 1.3 + late * 30) * 0.06);
    dummy.rotation.set((1 - up) * late * 3, (1 - up) * 2, 0);
    dummy.scale.setScalar(Math.max(0.001, up));
    dummy.updateMatrix();
    number.mesh.setMatrixAt(i, dummy.matrix);
  }
  number.mesh.instanceMatrix.needsUpdate = true;
  number.opacity = Math.min(1, progress * 3);
  number.captionOpacity = Math.max(0, Math.min(1, (progress - 0.55) * 3));
  number.shown = text;
}

function buildTools(tools) {
  const center = new THREE.Vector3().fromArray(LAYOUT.tools.at);
  const group = new THREE.Group();
  group.position.copy(center);
  const rings = LAYOUT.tools.rings.map((radius, index) => {
    const ring = new THREE.Group();
    ring.rotation.set(Math.PI / 2 - 0.42 + index * 0.18, 0, (index - 1) * 0.22);
    group.add(ring);
    return { ring, radius, speed: 0.05 + (2 - index) * 0.025 };
  });
  const items = tools.map((name, i) => {
    const sprite = labelSprite(name.toUpperCase(), { font: "400 64px Anton", color: "#efe6d8", height: 0.78 });
    const ring = rings[i % rings.length];
    const home = new THREE.Group();
    ring.ring.add(home);
    group.add(sprite);
    return { sprite, ring, home, angle: (i / tools.length) * Math.PI * 2 * 3 + i * 0.37, pull: 0 };
  });
  // A soft light at the middle of the orbits.
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  const g = glowCanvas.getContext("2d");
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,240,225,1)"); gradient.addColorStop(0.2, "rgba(255,150,105,.6)"); gradient.addColorStop(1, "rgba(255,138,95,0)");
  g.fillStyle = gradient; g.fillRect(0, 0, 128, 128);
  const glowMap = new THREE.CanvasTexture(glowCanvas);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(6, 6, 1);
  group.add(glow);
  const dispose = () => { items.forEach(({ sprite }) => { sprite.material.map.dispose(); sprite.material.dispose(); }); glowMap.dispose(); glow.material.dispose(); };
  return { group, items, glow, dispose };
}

export function createActOne(canvas, { receipts, tools, getProgress, onFrame }) {
  const quality = pickQuality();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(quality.dpr);
  renderer.setClearColor(0x070605, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 600);

  const name = buildName(quality.name);
  const dust = buildDust(quality.dust);
  const river = buildRiver(renderer);
  const { numbers, dispose: disposeNumbers } = buildNumbers(receipts);
  const toolOrbit = buildTools(tools);
  scene.add(river.mesh, dust.points, name.points, toolOrbit.group, ...numbers.map((n) => n.group));

  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.45, 0.55);
  const finish = new ShaderPass(finishShader);
  finish.uniforms.uGrain.value = 0.016;
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  let width = 1, height = 1, fit = 1;
  const resize = () => {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setPixelRatio(quality.dpr);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // On a narrow screen everything beside the path comes in closer and smaller.
    fit = Math.min(1, Math.max(0.42, camera.aspect / 1.5));
    const visible = 2 * 70 * Math.tan(THREE.MathUtils.degToRad(18)) * camera.aspect;
    name.points.scale.setScalar(Math.min(1, (visible * 0.86) / LAYOUT.name.width));
    numbers.forEach((number, i) => {
      const [x, y, z] = LAYOUT.numbers[i];
      // On a phone the frame is too narrow to keep them beside the path, but
      // tall: they stand almost on it, smaller, alternately high and low, and
      // fade before the camera arrives.
      const phone = fit < 0.6;
      number.baseY = phone ? (i % 2 ? -1.7 : 2.3) : y;
      number.group.position.set(x * (phone ? 0.12 : fit), number.baseY, z);
      number.group.scale.setScalar(fit < 0.6 ? 0.45 : fit);
    });
    toolOrbit.group.scale.setScalar(Math.max(0.6, fit));
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  // Pointing at a tool pulls it toward the camera.
  const pointer = new THREE.Vector2(9, 9);
  const raycaster = new THREE.Raycaster();
  const onPointer = (event) => {
    const box = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
  };
  const onLeave = () => pointer.set(9, 9);
  canvas.addEventListener("pointermove", onPointer);
  canvas.addEventListener("pointerdown", onPointer);
  canvas.addEventListener("pointerleave", onLeave);

  let active = false, frame = 0, last = performance.now(), clock = 0, disposed = false;
  const toCamera = new THREE.Vector3(), orbit = new THREE.Vector3();
  function tick(nowMs) {
    if (!active || disposed) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    clock += dt;
    const t = Math.min(ACT_ONE.seconds, Math.max(0, getProgressTime()));
    const pose = poseAt(ACT_ONE, t);
    camera.position.fromArray(pose.pos);
    camera.lookAt(...pose.look);
    if (camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    const show = overlays(t);
    const scale = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

    for (const { uniforms } of [name, dust]) { uniforms.uTime.value = clock; uniforms.uScale.value = scale; }
    name.uniforms.uPart.value = show.part;
    river.uniforms.uFlow.value = clock * 0.012 - t * 0.05;

    for (const number of numbers) {
      const progress = numberProgress(camera.position.z, number.group.position.z);
      if (progress !== number.progress || progress < 1) { drawNumber(number, progress, clock); number.progress = progress; }
      number.group.position.y = number.baseY + Math.sin(clock * 0.8 + number.group.position.z) * 0.15;
      // Gone before the camera reaches it, so it never fills the lens.
      const near = Math.min(1, Math.max(0, (camera.position.z - number.group.position.z - 5) / 12));
      number.mesh.material.opacity = number.opacity * near;
      number.caption.material.opacity = number.captionOpacity * near;
    }

    raycaster.setFromCamera(pointer, camera);
    const hit = show.tools > 0.5 ? raycaster.intersectObjects(toolOrbit.items.map((item) => item.sprite))[0]?.object : null;
    canvas.style.cursor = hit ? "pointer" : "";
    for (const item of toolOrbit.items) {
      item.angle += dt * item.ring.speed;
      item.home.position.set(Math.cos(item.angle) * item.ring.radius, Math.sin(item.angle) * item.ring.radius, 0);
      item.home.updateMatrixWorld();
      orbit.setFromMatrixPosition(item.home.matrixWorld);
      toolOrbit.group.worldToLocal(orbit);
      // A critically damped spring toward 1 while pointed at, back to 0 after.
      item.pull += ((item.sprite === hit ? 1 : 0) - item.pull) * (1 - Math.exp(-dt * 9));
      toCamera.copy(camera.position);
      toolOrbit.group.worldToLocal(toCamera);
      item.sprite.position.copy(orbit).lerp(toCamera, item.pull * 0.38);
      item.sprite.scale.copy(item.sprite.userData.base).multiplyScalar(1 + item.pull * 0.35);
      item.sprite.material.color.copy(DIM_BONE).lerp(SIGNAL, item.pull);
      item.sprite.material.opacity = show.tools;
    }
    toolOrbit.glow.material.opacity = 0.18 + show.tools * 0.3;

    composer.render();
    onFrame?.(t, show);
  }
  // Scroll position is read every frame, not from scroll events, so the
  // camera never lags the page.
  const getProgressTime = () => timeAtProgress(getProgress());

  return {
    setActive(on) {
      if (on === active || disposed) return;
      active = on;
      if (on) { last = performance.now(); frame = requestAnimationFrame(tick); }
      else cancelAnimationFrame(frame);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerdown", onPointer);
      canvas.removeEventListener("pointerleave", onLeave);
      [name, dust].forEach(({ points }) => { points.geometry.dispose(); points.material.dispose(); });
      river.dispose();
      disposeNumbers();
      toolOrbit.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}

