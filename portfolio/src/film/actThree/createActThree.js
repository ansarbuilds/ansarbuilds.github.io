import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { finishShader } from "../coldOpen/shaders.js";
import { BONE, SIGNAL, floor, glow, points } from "../actTwo/kit.js";
import { ACT_THREE, CENTRE, PILLARS, cameraAt, moments, timeAtProgress } from "./timeline.js";
import { createAdaptive } from "../adaptive.js";

/* Act III (A3-01, A3-02) in plain three.js: three monoliths of dark stone
   rise out of the ground, each carved with what it stands for and the
   projects that prove it. The camera circles them; the carving glows as each
   one turns to face it.

   createActThree(canvas, { pillars, getProgress, onFrame }) where pillars are
   [{ count, unit, title, projects: ["Jarvis", ...] }], left to right. Fonts
   must be loaded first: the carving is drawn from them. */

const WIDTH = 6, DEPTH = 2.4;
const STONE = new THREE.Color(0.13, 0.12, 0.11);

function pickQuality() {
  const low = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  return low ? { dust: 3000, dpr: Math.min(window.devicePixelRatio, 1.25) } : { dust: 8000, dpr: Math.min(window.devicePixelRatio, 1.75) };
}

// The front face: grained stone with the words cut into it, and the same
// words alone (for the glow).
function carving(pillar, height) {
  const w = 600, h = Math.round((600 * height) / WIDTH);
  const make = () => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const stone = make(), light = make();
  const s = stone.getContext("2d"), l = light.getContext("2d");
  s.fillStyle = "#2a2724"; s.fillRect(0, 0, w, h);
  // Grain: a scatter of lighter and darker flecks.
  for (let i = 0; i < 9000; i++) { s.fillStyle = Math.random() > 0.5 ? "rgba(255,245,230,.035)" : "rgba(0,0,0,.08)"; s.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  l.fillStyle = "#000"; l.fillRect(0, 0, w, h);
  const lines = [
    { text: pillar.count, font: "400 230px Anton, sans-serif", y: h * 0.3 },
    { text: pillar.unit.toUpperCase(), font: "500 26px JetBrains Mono, monospace", y: h * 0.3 + 54 },
    { text: pillar.title.toUpperCase(), font: "400 54px Anton, sans-serif", y: h * 0.3 + 150 },
    ...pillar.projects.map((name, i) => ({ text: name.toUpperCase(), font: "500 30px JetBrains Mono, monospace", y: h * 0.3 + 240 + i * 52, name: true })),
  ];
  for (const ctx of [s, l]) { ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; }
  for (const line of lines) {
    // Cut: a dark groove with a lit lower lip.
    s.font = l.font = line.font;
    s.fillStyle = "rgba(255,240,225,.16)"; s.fillText(line.text, w / 2, line.y + 2);
    s.fillStyle = "#0e0d0c"; s.fillText(line.text, w / 2, line.y);
    l.fillStyle = line.name ? "#ffffff" : "#b8a998"; l.fillText(line.text, w / 2, line.y);
  }
  const map = new THREE.CanvasTexture(stone), glowMap = new THREE.CanvasTexture(light);
  map.colorSpace = glowMap.colorSpace = THREE.SRGBColorSpace;
  return { map, glowMap };
}

export function createActThree(canvas, { pillars, getProgress, onFrame }) {
  const quality = pickQuality();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(quality.dpr);
  renderer.setClearColor(0x060505, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x060505, 40, 120);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
  const disposers = [];
  const keep = (item) => { disposers.push(item.dispose); return item; };

  const world = new THREE.Group();
  world.position.fromArray(CENTRE);
  scene.add(world);
  const ground = keep(floor(120, BONE, 0.1));
  world.add(ground.mesh);

  // Dust hanging in the air round them.
  const positions = new Float32Array(quality.dust * 3), colors = new Float32Array(quality.dust * 3);
  const tint = new THREE.Color();
  for (let i = 0; i < quality.dust; i++) {
    const a = Math.random() * Math.PI * 2, r = 6 + 50 * Math.random() ** 0.7;
    positions.set([Math.cos(a) * r, Math.random() * 26, Math.sin(a) * r], i * 3);
    tint.copy(BONE).lerp(SIGNAL, Math.random() ** 3).multiplyScalar(0.8).toArray(colors, i * 3);
  }
  const dust = keep(points(positions, colors, 0.07, { opacity: 0.45, wobble: 0.3 }));
  world.add(dust.mesh);

  // Light: a high key from the front left, a warm rim behind, a low fill.
  const key = new THREE.SpotLight(0xfff0e2, 2600, 120, 0.5, 0.6, 2);
  key.position.set(-26, 34, 30);
  key.target.position.set(0, 7, 0);
  const rim = new THREE.SpotLight(0xff9a6a, 1600, 120, 0.6, 0.7, 2);
  rim.position.set(20, 20, -30);
  rim.target.position.set(0, 7, 0);
  const fill = new THREE.HemisphereLight(0x4a4640, 0x0a0806, 0.7);
  world.add(key, key.target, rim, rim.target, fill);

  const side = new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.92, metalness: 0 });
  disposers.push(() => side.dispose());
  const monoliths = PILLARS.map((pillar, i) => {
    const geometry = new THREE.BoxGeometry(WIDTH, pillar.height, DEPTH);
    const { map, glowMap } = carving(pillars[i], pillar.height);
    const front = new THREE.MeshStandardMaterial({ map, roughness: 0.88, metalness: 0, emissive: SIGNAL.clone(), emissiveMap: glowMap, emissiveIntensity: 0 });
    // Box faces: +x, -x, +y, -y, +z (the carved front), -z.
    const mesh = new THREE.Mesh(geometry, [side, side, side, side, front, side]);
    const holder = new THREE.Group();
    holder.position.set(pillar.x, 0, 0);
    holder.rotation.y = pillar.yaw;
    holder.add(mesh);
    world.add(holder);
    // A pool of the glow on the ground in front of it.
    const pool = keep(glow(9, 6, SIGNAL, { opacity: 0 }));
    pool.mesh.position.set(Math.sin(pillar.yaw) * 3.5 + pillar.x, 0.03, Math.cos(pillar.yaw) * 3.5);
    world.add(pool.mesh);
    disposers.push(() => { geometry.dispose(); map.dispose(); glowMap.dispose(); front.dispose(); });
    return { pillar, mesh, front, pool };
  });

  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 0.55);
  const finish = new ShaderPass(finishShader);
  finish.uniforms.uGrain.value = 0.018;
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(finish);
  composer.addPass(new OutputPass());
  // Steps quality down if this device cannot keep up (see adaptive.js).
  const adaptive = createAdaptive({ quality, bloom, apply: () => { renderer.setPixelRatio(quality.dpr); resize(); } });

  let width = 1, height = 1, fit = 1;
  const resize = () => {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setPixelRatio(quality.dpr);
    composer.setSize(width, height);
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
    const pose = cameraAt(t);
    look.fromArray(pose.look);
    // A narrow screen stands further back to keep all three in frame, and
    // pans down so they sit above the card.
    pos.fromArray(pose.pos).sub(look).divideScalar(fit).add(look);
    if (camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
    const pan = (1 - fit) * 0.5 * pos.distanceTo(look) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    pos.y -= pan; look.y -= pan;
    camera.position.copy(pos);
    camera.lookAt(look);

    const m = moments(t);
    monoliths.forEach(({ pillar, mesh, front, pool }, i) => {
      const rise = m.rise[i];
      mesh.position.y = pillar.height / 2 - (1 - rise) * (pillar.height + 0.4);
      // A shudder as it breaks the surface.
      mesh.position.x = rise > 0 && rise < 1 ? Math.sin(clock * 60 + i) * 0.04 * (1 - rise) : 0;
      front.emissiveIntensity = 1.8 * m.glow[i];
      pool.mesh.material.uniforms.uOpacity.value = 0.45 * m.glow[i];
    });
    dust.uniforms.uTime.value = clock;
    dust.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    finish.uniforms.uTime.value = clock;
    // Before the act starts or after it ends only ambient motion is left (dust,
    // a caret), often while the next section plays beside it: a quarter of
    // the frames is enough there.
    if ((t <= 0 || t >= ACT_THREE.seconds) && settledFrames++ % 4) return;
    if (t > 0 && t < ACT_THREE.seconds) settledFrames = 0;
    adaptive.frame(nowMs, t <= 0 || t >= ACT_THREE.seconds);
    composer.render();
    onFrame?.(t, m);
  }

  return {
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
      composer.dispose();
      renderer.dispose();
    },
  };
}
