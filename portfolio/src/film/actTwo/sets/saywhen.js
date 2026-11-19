import * as THREE from "three";
import { BONE, SIGNAL, canvasCard, floor, glow, points, ramp, smooth } from "../kit.js";
import { loadHead } from "./headPoints.js";

/* saywhen (shots A2-01a and A2-01b): a dark room and a floating monitor
   playing the real app. A head made of points (the digital double's) turns
   toward it, a waveform runs from its mouth to the screen, and the command
   types in and is sent.

   Local space: +z faces the camera's scene position, +x is screen right. */

const VIOLET = new THREE.Color(0.62, 0.32, 0.86);
const COMMAND = "cargo test --release";
// The app's window inside the loop's frame (the left of the frame is a title).
const APP = { x: 530 / 1280, y: 75 / 640, w: 701 / 1280, h: 485 / 640 };


export function buildSaywhen({ group, media }) {
  const disposers = [];
  const keep = (item) => { disposers.push(item.dispose); return item; };

  const ground = keep(floor(44, BONE, 0.14));
  ground.mesh.position.y = -3.2;
  group.add(ground.mesh);

  // The monitor, turned a little toward the head.
  const monitor = new THREE.Group();
  // Head and monitor stand high in the frame: the card takes the lower left.
  monitor.position.set(3.6, 2.1, 0);
  monitor.rotation.y = -0.38;
  group.add(monitor);
  const bezelGeometry = new THREE.BoxGeometry(7.25, 5.05, 0.22);
  const bezel = new THREE.Mesh(bezelGeometry, new THREE.MeshBasicMaterial({ color: 0x0d0c10 }));
  monitor.add(bezel);
  const standGeometry = new THREE.BoxGeometry(0.22, 2.9, 0.22);
  const stand = new THREE.Mesh(standGeometry, bezel.material);
  stand.position.y = -3.9;
  monitor.add(stand);

  const video = document.createElement("video");
  Object.assign(video, { muted: true, loop: true, playsInline: true, crossOrigin: "anonymous", preload: "auto" });
  video.setAttribute("muted", "");
  video.src = media("/p/saywhen/loops/hero-loop.mp4");
  const footage = new THREE.VideoTexture(video);
  footage.colorSpace = THREE.SRGBColorSpace;
  footage.repeat.set(APP.w, APP.h);
  footage.offset.set(APP.x, 1 - APP.y - APP.h);
  const screenGeometry = new THREE.PlaneGeometry(6.9, 6.9 * (APP.h * 640) / (APP.w * 1280));
  const screen = new THREE.Mesh(screenGeometry, new THREE.MeshBasicMaterial({ map: footage, toneMapped: false, color: new THREE.Color(0.92, 0.92, 0.92) }));
  screen.position.z = 0.12;
  monitor.add(screen);
  const screenHalf = screenGeometry.parameters.height / 2;

  // The spoken command, typed into a strip along the bottom of the screen.
  let lastTyped = -1;
  const strip = keep(canvasCard(6.9, 0.62, 1024, (context, canvas, typed, sent) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(10,8,14,.88)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = sent ? "#ff8a5f" : "#efe6d8";
    context.font = "500 40px JetBrains Mono, monospace";
    context.textBaseline = "middle";
    const text = `› ${COMMAND.slice(0, typed)}`;
    context.fillText(text, 28, canvas.height / 2);
    if (sent) { context.textAlign = "right"; context.fillText("sent ↵", canvas.width - 28, canvas.height / 2); context.textAlign = "left"; }
    else if (typed > 0) { const w = context.measureText(text).width; context.fillRect(34 + w, canvas.height / 2 - 20, 20, 40); }
  }));
  strip.mesh.position.set(0, -screenHalf + 0.31, 0.14);
  strip.mesh.material.opacity = 0;
  monitor.add(strip.mesh);

  // Its light: a pool on the floor, violet like the app.
  const pool = keep(glow(12, 7, VIOLET, { opacity: 0.32 }));
  pool.mesh.position.set(2.4, -3.15, 2.2);
  group.add(pool.mesh);

  // A cone of light over the head.
  const cone = keep(glow(5, 9, BONE, { cone: true, opacity: 0.07 }));
  cone.mesh.position.set(-1.6, 4.4, 1.4);
  group.add(cone.mesh);

  // The head, in points, once its file arrives.
  const head = new THREE.Group();
  head.position.set(-1.6, 1.4, 1.4);
  group.add(head);
  const mouth = new THREE.Object3D();
  head.add(mouth);
  let headPoints = null;
  loadHead(media("/film/head-points.bin")).then((data) => {
    const scale = 4.2 / data.size[1];
    headPoints = points(data.positions, data.colors, 0.05, { opacity: 1, wobble: 0.012 / scale });
    headPoints.mesh.scale.setScalar(scale);
    head.add(headPoints.mesh);
    // The mouth, in the model's own units: just under the nose, at the front.
    mouth.position.set(0, (-0.047 - data.centre[1]) * scale, (0.072 - data.centre[2]) * scale);
  }).catch(() => {});
  disposers.push(() => headPoints?.dispose());

  // The voice: points running from the mouth to the screen on a wave.
  const WAVE = 480;
  const wavePositions = new Float32Array(WAVE * 3), waveColors = new Float32Array(WAVE * 3);
  for (let i = 0; i < WAVE; i++) SIGNAL.clone().lerp(VIOLET, (i % 7) / 10).toArray(waveColors, i * 3);
  const wave = keep(points(wavePositions, waveColors, 0.07, { opacity: 0, wobble: 0.02 }));
  group.add(wave.mesh);
  const from = new THREE.Vector3(), to = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), point = new THREE.Vector3();
  const screenTarget = new THREE.Object3D();
  screenTarget.position.set(-2.2, -0.6, 0.2);
  monitor.add(screenTarget);

  const TURN = 1.15;
  return {
    setPlaying(on) {
      if (on) video.play().catch(() => {});
      else video.pause();
    },
    update({ arrive, scene, clock, scale }) {
      // Head: faces the camera, then turns to the screen.
      head.rotation.y = TURN * smooth(ramp(scene, 0.1, 0.38));
      head.position.y = 1.4 + Math.sin(clock * 0.7) * 0.05;
      if (headPoints) { headPoints.uniforms.uTime.value = clock; headPoints.uniforms.uScale.value = scale; headPoints.uniforms.uOpacity.value = 0.45 + 0.55 * smooth(ramp(arrive, 0.3, 1)); }

      // Voice: flows while it is speaking.
      const speaking = smooth(ramp(scene, 0.33, 0.42)) * (1 - smooth(ramp(scene, 0.7, 0.78)));
      wave.uniforms.uOpacity.value = speaking;
      wave.uniforms.uTime.value = clock;
      wave.uniforms.uScale.value = scale;
      if (speaking > 0) {
        group.updateMatrixWorld();
        mouth.getWorldPosition(from); group.worldToLocal(from);
        screenTarget.getWorldPosition(to); group.worldToLocal(to);
        for (let i = 0; i < WAVE; i++) {
          const u = (i / WAVE + clock * 0.32) % 1;
          const swell = Math.sin(Math.PI * u);
          point.copy(from).lerp(to, u).addScaledVector(up, Math.sin(u * 46 - clock * 11 + (i % 3)) * 0.42 * swell * (0.4 + 0.6 * Math.abs(Math.sin(clock * 3.1 + u * 5))));
          point.z += (i % 2 ? 1 : -1) * 0.04 * swell;
          point.toArray(wavePositions, i * 3);
        }
        wave.mesh.geometry.attributes.position.needsUpdate = true;
      }

      // The command types in, then is sent.
      const typed = Math.round(COMMAND.length * ramp(scene, 0.5, 0.8));
      const sent = scene >= 0.88;
      const key = sent ? 999 : typed;
      if (key !== lastTyped) { lastTyped = key; strip.redraw(typed, sent); }
      strip.mesh.material.opacity = smooth(ramp(scene, 0.44, 0.52));
    },
    dispose() {
      video.pause();
      video.removeAttribute("src");
      video.load();
      footage.dispose();
      [bezelGeometry, standGeometry, screenGeometry].forEach((g) => g.dispose());
      bezel.material.dispose();
      screen.material.dispose();
      disposers.forEach((fn) => fn());
    },
  };
}
