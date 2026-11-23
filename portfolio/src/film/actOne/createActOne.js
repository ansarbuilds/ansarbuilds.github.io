import * as THREE from "three";
import { poseAt } from "../rig.js";
import { ACT_ONE, LAYOUT, countAt, numberProgress, overlays } from "./timeline.js";
import { digitsFragment, digitsVertex, pointFragment, pointVertex, riverFragment, riverVertex } from "./shaders.js";
import { CODE_LINES } from "./codeLines.js";
import { attachFilm } from "../engine.js";

/* Act I (storyboard A1-01 to A1-03) in plain three.js.

   createActOne(canvas, options) builds the scene and returns
   { setActive, dispose }. While active it draws every frame: it asks
   `getTime()` where the film's clock is in the act (seconds), turns
   that into a camera pose, and tells the page through
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
    ? { name: 12000, dust: 6000, dpr: Math.min(window.devicePixelRatio, 1.25) }
    : { name: 30000, dust: 16000, dpr: Math.min(window.devicePixelRatio, 1.75) };
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
  const uniforms = { uTime: { value: 0 }, uScale: { value: 1 }, uSize: { value: size }, uPart: { value: 0 }, uOpacity: { value: 1 }, uFar: { value: 170 }, uWobble: { value: 0.22 }, uSteady: { value: 0 } };
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
    // Even coverage, not random picks: random picks clump and leave holes,
    // and the letters read as static. Walk the ink in strides instead, each
    // point jittered inside its own stretch.
    const inked = pixels.length / 2, stride = inked / share;
    for (let i = 0; i < share; i++) {
      const pick = Math.min(inked - 1, Math.floor((i + Math.random()) * stride)) * 2;
      positions[written * 3] = (pixels[pick] + Math.random() - ink.pad - ink.width / 2) * scale + LAYOUT.name.at[0];
      positions[written * 3 + 1] = -(pixels[pick + 1] + Math.random() - ink.height / 2) * scale + LAYOUT.name.at[1];
      positions[written * 3 + 2] = (Math.random() - 0.5) * 0.4 + LAYOUT.name.at[2];
      color.toArray(colors, written * 3);
      written++;
    }
  });
  const name = pointsFrom(positions, colors, 0.1);
  name.uniforms.uSteady.value = 1;
  return name;
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

// The digits as crisp type on a plane, one texture per value the count
// shows, so the count never draws text mid-flight. 1px of the canvas is
// 0.03 units: a number is 18 units wide, as the old cube digits were.
const DIGITS = { width: 600, height: 260, unit: 0.03 };
function digitsTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = DIGITS.width; canvas.height = DIGITS.height;
  const context = canvas.getContext("2d");
  context.font = "400 216px Anton";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff";
  context.fillText(text, DIGITS.width / 2, DIGITS.height / 2 + 6);
  const map = new THREE.CanvasTexture(canvas);
  map.anisotropy = 4;
  return map;
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
  const plane = new THREE.PlaneGeometry(DIGITS.width * DIGITS.unit, DIGITS.height * DIGITS.unit);
  const numbers = receipts.slice(0, LAYOUT.numbers.length).map(({ value, label }, index) => {
    // Every string it will show on the way up, drawn once up front.
    const textures = new Map();
    for (let i = 0; i <= 1; i += 0.001) { const text = countAt(value, i); if (!textures.has(text)) textures.set(text, digitsTexture(text)); }
    if (!textures.has(value)) textures.set(value, digitsTexture(value));
    const uniforms = {
      uMap: { value: textures.get(value) },
      // Kept under the bloom threshold: only the seam glows.
      uColor: { value: index === 0 ? SIGNAL.clone().multiplyScalar(0.5) : BONE.clone().multiplyScalar(0.42) },
      uRise: { value: 0 }, uOpacity: { value: 0 },
    };
    const mesh = new THREE.Mesh(plane, new THREE.ShaderMaterial({ uniforms, vertexShader: digitsVertex, fragmentShader: digitsFragment, transparent: true, depthWrite: false }));
    mesh.frustumCulled = false;
    const group = new THREE.Group();
    group.position.fromArray(LAYOUT.numbers[index]);
    group.add(mesh);
    const caption = labelSprite(label.toUpperCase(), { font: "500 30px JetBrains Mono", color: "#a39a8f", height: 0.5 });
    caption.position.set(0, -3.8, 0);
    group.add(caption);
    return { value, group, mesh, uniforms, caption, textures, shown: null, progress: -1, opacity: 0, captionOpacity: 0, baseY: LAYOUT.numbers[index][1] };
  });
  const dispose = () => {
    plane.dispose();
    numbers.forEach((n) => { n.textures.forEach((map) => map.dispose()); n.mesh.material.dispose(); n.caption.material.map.dispose(); n.caption.material.dispose(); });
  };
  return { numbers, dispose };
}

// A number is lit from the bottom up, a hot seam climbing through it, while
// it lifts the last stretch out of the river.
function drawNumber(number, progress) {
  const text = countAt(number.value, progress);
  const rise = 1 - (1 - Math.min(1, progress * 2.2)) ** 3;
  number.uniforms.uMap.value = number.textures.get(text) ?? number.textures.get(number.value);
  number.uniforms.uRise.value = rise;
  number.mesh.position.y = -(1 - rise) * 1.6;
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
  gradient.addColorStop(0, "rgba(255,240,225,1)"); gradient.addColorStop(0.08, "rgba(255,170,120,.55)"); gradient.addColorStop(0.35, "rgba(255,138,95,.1)"); gradient.addColorStop(1, "rgba(255,138,95,0)");
  g.fillStyle = gradient; g.fillRect(0, 0, 128, 128);
  const glowMap = new THREE.CanvasTexture(glowCanvas);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(6, 6, 1);
  group.add(glow);
  const dispose = () => { items.forEach(({ sprite }) => { sprite.material.map.dispose(); sprite.material.dispose(); }); glowMap.dispose(); glow.material.dispose(); };
  return { group, items, glow, dispose };
}

export function createActOne(canvas, { receipts, tools, getTime, onFrame }) {
  const quality = pickQuality();
  // The shared renderer (see engine.js): this act draws into it, and its
  // frames are copied onto this canvas.
  const film = attachFilm(canvas, { clear: 0x070605, bloom: [0.42, 0.45, 0.55] });
  // Almost no colour fringing here: on dots this small it splits each one
  // into red and blue and the name turns to purple static.
  film.finish.uniforms.uAberration.value = 0.00006;
  const renderer = film.renderer;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 600);

  const name = buildName(quality.name);
  const dust = buildDust(quality.dust);
  const river = buildRiver(renderer);
  const { numbers, dispose: disposeNumbers } = buildNumbers(receipts);
  const toolOrbit = buildTools(tools);
  scene.add(river.mesh, dust.points, name.points, toolOrbit.group, ...numbers.map((n) => n.group));


  let width = 1, height = 1, fit = 1;
  const resize = () => {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    film.resize();
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

  let active = false, frame = 0, last = performance.now(), clock = 0, disposed = false, settledFrames = 0;
  const toCamera = new THREE.Vector3(), orbit = new THREE.Vector3();
  function tick(nowMs) {
    if (!active || disposed) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    clock += dt;
    const t = Math.min(ACT_ONE.seconds, Math.max(0, getTime()));
    const pose = poseAt(ACT_ONE, t);
    camera.position.fromArray(pose.pos);
    camera.lookAt(...pose.look);
    if (camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    const show = overlays(t);
    const scale = film.pixelHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

    for (const { uniforms } of [name, dust]) { uniforms.uTime.value = clock; uniforms.uScale.value = scale; }
    name.uniforms.uPart.value = show.part;
    river.uniforms.uFlow.value = clock * 0.012 - t * 0.05;

    for (const number of numbers) {
      const progress = numberProgress(camera.position.z, number.group.position.z);
      if (progress !== number.progress) { drawNumber(number, progress); number.progress = progress; }
      number.group.position.y = number.baseY + Math.sin(clock * 0.8 + number.group.position.z) * 0.15;
      // Gone before the camera reaches it, so it never fills the lens.
      const near = Math.min(1, Math.max(0, (camera.position.z - number.group.position.z - 5) / 12));
      number.uniforms.uOpacity.value = number.opacity * near;
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
      // The far side of the orbit sits back in the dark, so words that cross
      // read as near and far instead of colliding.
      const near = Math.min(1, Math.max(0, 0.5 + orbit.z / (2 * item.ring.radius)));
      item.sprite.material.opacity = show.tools * Math.max(item.pull, 0.28 + 0.72 * near * near);
      item.sprite.renderOrder = Math.round(orbit.z * 10);
    }
    toolOrbit.glow.material.opacity = 0.12 + show.tools * 0.25;

    // Before the act starts or after it ends only ambient motion is left (dust,
    // a caret), often while the next section plays beside it: a quarter of
    // the frames is enough there.
    if ((t <= 0 || t >= ACT_ONE.seconds) && settledFrames++ % 4) return;
    if (t > 0 && t < ACT_ONE.seconds) settledFrames = 0;
    film.render(scene, camera, { now: nowMs, skip: t <= 0 || t >= ACT_ONE.seconds });
    onFrame?.(t, show);
  }
  // Scroll position is read every frame, not from scroll events, so the
  // camera never lags the page.

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
      film.release();
    },
  };
}

