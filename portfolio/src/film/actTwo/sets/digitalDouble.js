import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { STAGES } from "../../../data/digitalDouble.js";
import { SIGNAL, canvasCard, faceCamera, points } from "../kit.js";
import { loadHead } from "./headPoints.js";

/* Digital double (shots A2-02a and A2-02b): a portrait. The real head, large,
   on flat carbon, lit by a warm key, a very low fill and a thin cool rim. It
   sits just off camera and eases a few degrees toward the pointer. Its build
   stages run in one small strip behind it, out of focus, like a studio
   breakdown, and never cross the face.

   On a wide screen this is the real model (3 MB, fetched while the set
   before plays). On a phone it is the same head as points (56 kB).
   Local space: +z faces the camera's scene position, +x is screen right. */

const HEAD = new THREE.Vector3(0, 0, 0);
// The strip: one row, small, behind the shoulder and running into the dark.
const SHEET = new THREE.Vector3(2.0, -0.7, -4);
const FRAME = { w: 0.44, h: 0.55 };
const GAP = 0.07;
const VERDICT = { "dead end": "#ff6b5e", partial: "#ffb45e", kept: "#7fe0a0", measurement: "#b9a8ff", "wrong format": "#7fd3f0", shipped: "#ff8a5f" };
const MODEL_HEIGHT = 3.7;
const POINTS_HEIGHT = 3.4;

export function buildDigitalDouble({ group, media }) {
  const disposers = [];
  const keep = (item) => { disposers.push(item.dispose); return item; };

  // Flat carbon, a little lighter right behind the head so the silhouette separates.
  const backdrop = keep(canvasCard(16, 16, 256, (c, canvas) => {
    const g = c.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
    g.addColorStop(0, "rgba(58,46,38,.55)"); g.addColorStop(0.45, "rgba(30,24,20,.25)"); g.addColorStop(1, "rgba(7,6,5,0)");
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = g; c.fillRect(0, 0, canvas.width, canvas.height);
  }));
  backdrop.redraw();
  backdrop.mesh.position.set(0, 0.2, -2.6);
  group.add(backdrop.mesh);

  // Three lights, each with a short reach, so nothing else in the act is lit.
  // Key: warm, camera-left, 35 degrees, a little above the eyes.
  const key = new THREE.SpotLight(0xfff1e0, 900, 30, 0.5, 0.8, 2);
  key.position.set(-7, 5, 10);
  key.target.position.copy(HEAD);
  // Fill: very low, camera side, so the shadow side is not a hole.
  const fill = new THREE.SpotLight(0xffe6d0, 70, 30, 0.6, 0.9, 2);
  fill.position.set(5, 0.5, 11);
  fill.target.position.copy(HEAD);
  // Rim: cool and thin, from behind on camera-right.
  const rim = new THREE.SpotLight(0xcfe0ff, 380, 30, 0.45, 0.9, 2);
  rim.position.set(5, 2.5, -7);
  rim.target.position.copy(HEAD);
  group.add(key, key.target, fill, fill.target, rim, rim.target);

  // The head: a rig the gaze turns, holding the model or its points.
  const rig = new THREE.Group();
  rig.position.copy(HEAD);
  group.add(rig);
  const eyes = [];
  let headPoints = null;
  let model = null;
  const phone = window.matchMedia("(max-width: 760px)").matches;
  let loading = false, headDone = false, framesIn = 0;
  const load = () => {
    if (loading) return;
    loading = true;
    if (phone) {
      loadHead(media("/film/head-points.bin")).then((data) => {
        headPoints = points(data.positions, data.colors, 0.05, { opacity: 1, wobble: 0.012 / (POINTS_HEIGHT / data.size[1]) });
        headPoints.mesh.scale.setScalar(POINTS_HEIGHT / data.size[1]);
        rig.add(headPoints.mesh);
        disposers.push(headPoints.dispose);
        headDone = true;
      }).catch(() => { headDone = true; });
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
      headDone = true;
      disposers.push(() => model.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); [o.material].flat().forEach((m) => { m.map?.dispose(); m.dispose(); }); } }));
    }, undefined, () => { headDone = true; });
  };

  // The contact sheet: every stage, with its number and verdict.
  const loader = new THREE.TextureLoader();
  const sheet = new THREE.Group();
  sheet.position.copy(SHEET);
  group.add(sheet);
  const frameGeometry = new THREE.PlaneGeometry(FRAME.w, FRAME.h);
  disposers.push(() => frameGeometry.dispose());
  const frames = STAGES.map((stage, i) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(0.3), toneMapped: false, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(frameGeometry, material);
    mesh.position.set(i * (FRAME.w + GAP), 0, 0);
    sheet.add(mesh);
    const tag = keep(canvasCard(FRAME.w + 0.1, 0.16, 360, (c, canvas, lit) => {
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.font = "500 40px JetBrains Mono, monospace";
      c.textBaseline = "middle";
      c.fillStyle = "#9a9087";
      c.fillStyle = lit ? "#ff8a5f" : VERDICT[stage.verdict] ?? "#cfc4b6";
      c.fillText(stage.verdict.toUpperCase(), 0, canvas.height / 2);
    }));
    tag.redraw(false);
    tag.mesh.position.set(mesh.position.x + 0.05, mesh.position.y - FRAME.h / 2 - 0.1, 0);
    tag.mesh.material.opacity = 0.7;
    sheet.add(tag.mesh);
    // A border that lights on the shipped stage.
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(frameGeometry), new THREE.LineBasicMaterial({ color: SIGNAL, transparent: true, opacity: stage.verdict === "shipped" ? 0.8 : 0 }));
    border.position.copy(mesh.position);
    border.scale.setScalar(1.04);
    sheet.add(border);
    disposers.push(() => { material.map?.dispose(); material.dispose(); border.geometry.dispose(); border.material.dispose(); });
    return { stage, mesh, material, tag, border, lit: false };
  });
  let framesLoaded = false;
  const loadFrames = () => {
    framesLoaded = true;
    frames.forEach((frame) => loader.load(media(`/shots/digital-double/${frame.stage.img}`), (map) => { map.colorSpace = THREE.SRGBColorSpace; frame.material.map = map; frame.material.needsUpdate = true; framesIn++; }, undefined, () => { framesIn++; }));
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
    ready() { return headDone && framesLoaded && framesIn >= frames.length; },
    setPlaying() {},
    update({ clock, scale, camera }) {
      load();
      if (!framesLoaded) loadFrames();
      group.updateMatrixWorld();
      // With no pointer for a while (a phone at rest), the gaze wanders, a little.
      const now = performance.now();
      if (now - lastInput > 3000) pointer.set(Math.sin(clock * 0.35) * 0.4, Math.sin(clock * 0.23) * 0.2);
      aim.lerp(pointer, 0.05);
      // Look just off the lens, and lean a few degrees toward the pointer.
      faceCamera(rig, camera, { upright: true });
      rig.rotateY(-0.12 + aim.x * 0.15);
      rig.rotateX(-aim.y * 0.07);
      if (eyes.length) {
        right.set(1, 0, 0).applyQuaternion(camera.quaternion);
        up.set(0, 1, 0).applyQuaternion(camera.quaternion);
        gaze.copy(camera.position).addScaledVector(right, 0.5 + aim.x * 2).addScaledVector(up, aim.y * 1.5);
        for (const eye of eyes) eye.lookAt(gaze);
      }
      if (headPoints) { headPoints.uniforms.uTime.value = clock; headPoints.uniforms.uScale.value = scale; headPoints.uniforms.uOpacity.value = 1; }

      // The strip is a finished frame from the cut: no build-up, and only
      // the shipped stage is at full brightness.
      faceCamera(sheet, camera, { upright: true });
      frames.forEach((frame) => {
        const shipped = frame.stage.verdict === "shipped";
        frame.material.color.setScalar(frame.material.map ? (shipped ? 1 : 0.26) : 0);
        if (shipped !== frame.lit) { frame.lit = shipped; frame.tag.redraw(shipped); }
      });
    },
    dispose() {
      disposers.forEach((fn) => fn());
    },
  };
}
