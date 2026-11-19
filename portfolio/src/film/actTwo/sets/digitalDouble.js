import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { STAGES } from "../../../data/digitalDouble.js";
import { SIGNAL, canvasCard, faceCamera, floor, glow, points, ramp, smooth } from "../kit.js";
import { loadHead } from "./headPoints.js";

/* Digital double (shots A2-06a and A2-06b): the head stands in a cone of
   light and looks at the visitor: the head turns a little toward the
   pointer and the eyes aim at it. Its build stages hang behind it like a
   contact sheet, each with its honest verdict, and the shipped one lights.

   On a wide screen this is the real model (3 MB, fetched while the set
   before plays). On a phone it is the same head as points (56 kB).
   Local space: +z faces the camera's scene position, +x is screen right. */

const WARM = new THREE.Color(1, 0.86, 0.72);
const HEAD = new THREE.Vector3(2.6, 1.3, 0.4);
const SHEET = new THREE.Vector3(2.6, 1.6, -5.5);
const FRAME = { w: 1.7, h: 2.125 };
const VERDICT = { "dead end": "#ff6b5e", partial: "#ffb45e", kept: "#7fe0a0", measurement: "#b9a8ff", "wrong format": "#7fd3f0", shipped: "#ff8a5f" };
const MODEL_HEIGHT = 4.2;

export function buildDigitalDouble({ group, media }) {
  const disposers = [];
  const keep = (item) => { disposers.push(item.dispose); return item; };

  const ground = keep(floor(44, WARM, 0.1));
  ground.mesh.position.y = -3.2;
  group.add(ground.mesh);
  const cone = keep(glow(6.5, 12, WARM, { cone: true, opacity: 0 }));
  cone.mesh.position.set(HEAD.x, HEAD.y + 3.4, HEAD.z);
  group.add(cone.mesh);
  const pool = keep(glow(8, 6, WARM, { opacity: 0 }));
  pool.mesh.position.set(HEAD.x, -3.15, HEAD.z);
  group.add(pool.mesh);

  // Light for the real model: a spot from above (the cone), a key, a cool rim.
  // Each has a short reach, so nothing else in the act is lit by them.
  const top = new THREE.SpotLight(0xfff0e0, 0, 30, 0.32, 0.6, 2);
  top.position.set(HEAD.x, HEAD.y + 11, HEAD.z + 1);
  top.target.position.copy(HEAD);
  const front = new THREE.SpotLight(0xffe6d0, 0, 30, 0.5, 0.8, 2);
  front.position.set(HEAD.x - 5, HEAD.y + 2, HEAD.z + 9);
  front.target.position.copy(HEAD);
  const rim = new THREE.SpotLight(0xcfe0ff, 0, 30, 0.5, 0.8, 2);
  rim.position.set(HEAD.x + 4, HEAD.y + 4, HEAD.z - 7);
  rim.target.position.copy(HEAD);
  group.add(top, top.target, front, front.target, rim, rim.target);

  // The head: a rig the gaze turns, holding the model or its points.
  const rig = new THREE.Group();
  rig.position.copy(HEAD);
  group.add(rig);
  const eyes = [];
  let headPoints = null;
  let model = null;
  const phone = window.matchMedia("(max-width: 760px)").matches;
  let loading = false;
  const load = () => {
    if (loading) return;
    loading = true;
    if (phone) {
      loadHead(media("/film/head-points.bin")).then((data) => {
        headPoints = points(data.positions, data.colors, 0.05, { opacity: 0, wobble: 0.012 / (MODEL_HEIGHT / data.size[1]) });
        headPoints.mesh.scale.setScalar(MODEL_HEIGHT / data.size[1]);
        rig.add(headPoints.mesh);
        disposers.push(headPoints.dispose);
      }).catch(() => {});
      return;
    }
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(media("/models/digital_double.glb"), (gltf) => {
      model = gltf.scene;
      // Centre on the head, not the bust, as the model's own page does.
      const head = model.getObjectByName("Web_Head") || model;
      const centre = new THREE.Box3().setFromObject(head).getCenter(new THREE.Vector3());
      model.position.sub(centre);
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      const holder = new THREE.Group();
      holder.scale.setScalar(MODEL_HEIGHT / size.y);
      holder.add(model);
      model.traverse((o) => {
        if (!o.isMesh) return;
        if (o.name.startsWith("Web_Hair")) { o.material.alphaTest = 0.35; o.material.side = THREE.DoubleSide; }
        if (o.name.startsWith("Web_Eye")) eyes.push(o);
      });
      rig.add(holder);
      disposers.push(() => model.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); [o.material].flat().forEach((m) => { m.map?.dispose(); m.dispose(); }); } }));
    }, undefined, () => {});
  };

  // The contact sheet: every stage, with its number and verdict.
  const loader = new THREE.TextureLoader();
  const sheet = new THREE.Group();
  sheet.position.copy(SHEET);
  group.add(sheet);
  const frameGeometry = new THREE.PlaneGeometry(FRAME.w, FRAME.h);
  disposers.push(() => frameGeometry.dispose());
  const frames = STAGES.map((stage, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(0), toneMapped: false, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(frameGeometry, material);
    mesh.position.set((col - 1.5) * (FRAME.w + 0.35), (0.5 - row) * (FRAME.h + 0.75), 0);
    sheet.add(mesh);
    const tag = keep(canvasCard(FRAME.w, 0.42, 520, (c, canvas, lit) => {
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.font = "500 34px JetBrains Mono, monospace";
      c.textBaseline = "middle";
      c.fillStyle = "#9a9087";
      c.fillText(String(stage.n).padStart(2, "0"), 0, canvas.height / 2);
      c.fillStyle = lit ? "#ff8a5f" : VERDICT[stage.verdict] ?? "#cfc4b6";
      c.fillText(stage.verdict.toUpperCase(), 70, canvas.height / 2);
    }));
    tag.redraw(false);
    tag.mesh.position.set(mesh.position.x, mesh.position.y - FRAME.h / 2 - 0.28, 0);
    tag.mesh.material.opacity = 0;
    sheet.add(tag.mesh);
    // A border that lights on the shipped stage.
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(frameGeometry), new THREE.LineBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0 }));
    border.position.copy(mesh.position);
    border.scale.setScalar(1.04);
    sheet.add(border);
    disposers.push(() => { material.map?.dispose(); material.dispose(); border.geometry.dispose(); border.material.dispose(); });
    return { stage, mesh, material, tag, border, lit: false };
  });
  let framesLoaded = false;
  const loadFrames = () => {
    framesLoaded = true;
    frames.forEach((frame) => loader.load(media(`/shots/digital-double/${frame.stage.img}`), (map) => { map.colorSpace = THREE.SRGBColorSpace; frame.material.map = map; frame.material.needsUpdate = true; }));
  };

  // Where the visitor is pointing, -1 to 1 across the window.
  const pointer = new THREE.Vector2(), aim = new THREE.Vector2();
  let lastInput = -1e9;
  const onMove = (event) => { lastInput = performance.now(); pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1); };
  window.addEventListener("pointermove", onMove, { passive: true });
  disposers.push(() => window.removeEventListener("pointermove", onMove));

  const right = new THREE.Vector3(), up = new THREE.Vector3(), gaze = new THREE.Vector3();
  return {
    prepare() { load(); if (!framesLoaded) loadFrames(); },
    setPlaying() {},
    update({ arrive, scene, clock, scale, camera }) {
      load();
      if (!framesLoaded) loadFrames();
      const lit = smooth(ramp(arrive, 0.35, 1)) * 0.5 + smooth(ramp(scene, 0, 0.2)) * 0.5;
      top.intensity = 950 * lit;
      front.intensity = 520 * lit;
      rim.intensity = 700 * lit;
      cone.mesh.material.uniforms.uOpacity.value = 0.1 * lit;
      pool.mesh.material.uniforms.uOpacity.value = 0.35 * lit;

      group.updateMatrixWorld();
      // With no pointer for a while (a phone at rest), the gaze wanders.
      const now = performance.now();
      if (now - lastInput > 3000) pointer.set(Math.sin(clock * 0.35) * 0.6, Math.sin(clock * 0.23) * 0.3);
      aim.lerp(pointer, 0.06);
      // Face the lens, then lean a little toward the pointer.
      faceCamera(rig, camera, { upright: true });
      rig.rotateY(aim.x * 0.25);
      rig.rotateX(-aim.y * 0.12);
      if (eyes.length) {
        right.set(1, 0, 0).applyQuaternion(camera.quaternion);
        up.set(0, 1, 0).applyQuaternion(camera.quaternion);
        gaze.copy(camera.position).addScaledVector(right, aim.x * 3).addScaledVector(up, aim.y * 2);
        for (const eye of eyes) eye.lookAt(gaze);
      }
      if (headPoints) { headPoints.uniforms.uTime.value = clock; headPoints.uniforms.uScale.value = scale; headPoints.uniforms.uOpacity.value = lit; }

      // The stages come up one after another, then the shipped one lights.
      faceCamera(sheet, camera, { upright: true });
      frames.forEach((frame, i) => {
        const shown = smooth(ramp(scene, 0.14 + i * 0.045, 0.24 + i * 0.045));
        const shipped = frame.stage.verdict === "shipped" && scene > 0.72;
        frame.material.opacity = shown;
        frame.material.color.setScalar(frame.material.map ? (shipped ? 0.85 : 0.42) * shown : 0);
        frame.tag.mesh.material.opacity = shown;
        frame.border.material.opacity = shipped ? 0.6 + 0.4 * Math.sin(clock * 3) : 0;
        if (shipped !== frame.lit) { frame.lit = shipped; frame.tag.redraw(shipped); }
      });
    },
    dispose() {
      disposers.forEach((fn) => fn());
    },
  };
}
