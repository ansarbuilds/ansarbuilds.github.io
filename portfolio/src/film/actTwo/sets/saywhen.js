import * as THREE from "three";
import { SIGNAL, canvasCard, points, ramp, smooth } from "../kit.js";
import { loadHead } from "./headPoints.js";

/* saywhen (shots A2-01a and A2-01b): a dark room. The only light is the
   monitor, which plays the real app. A life-size head made of points stands
   in profile and faces it; the side toward the screen picks up the screen's
   colour and the far side falls into the dark. A waveform runs from its
   mouth to the screen, and the command types in once and holds.

   No floor, no stand, no spotlight: depth is the screen's own falloff.
   The lower third of the frame stays empty for the caption.
   Local space: +z faces the camera's scene position, +x is screen right. */

const VIOLET = new THREE.Color(0.62, 0.32, 0.86);
const COMMAND = "cargo test --release";
// The app's window inside the loop's frame (the left of the frame is a title).
const APP = { x: 530 / 1280, y: 75 / 640, w: 701 / 1280, h: 485 / 640 };


export function buildSaywhen({ group, media }) {
  const disposers = [];
  const keep = (item) => { disposers.push(item.dispose); return item; };

  // The monitor, turned toward the head.
  const monitor = new THREE.Group();
  monitor.position.set(3.0, 0.6, 0);
  monitor.rotation.y = -0.5;
  group.add(monitor);
  // A thin dark bezel, not a glowing slab. No stand.
  const bezelGeometry = new THREE.BoxGeometry(7.1, 4.95, 0.12);
  const bezel = new THREE.Mesh(bezelGeometry, new THREE.MeshBasicMaterial({ color: 0x0a0a0c }));
  monitor.add(bezel);

  // On a phone the screen is a still of the product: the loop never starts.
  const phone = window.matchMedia("(max-width: 760px)").matches;
  const video = document.createElement("video");
  let footage;
  if (phone) {
    footage = new THREE.TextureLoader().load(media("/p/saywhen/loops/hero-loop.webp"));
  } else {
    Object.assign(video, { muted: true, loop: true, playsInline: true, crossOrigin: "anonymous", preload: "auto" });
    video.setAttribute("muted", "");
    video.src = media("/p/saywhen/loops/hero-loop.mp4");
    footage = new THREE.VideoTexture(video);
  }
  footage.colorSpace = THREE.SRGBColorSpace;
  footage.repeat.set(APP.w, APP.h);
  footage.offset.set(APP.x, 1 - APP.y - APP.h);
  const screenGeometry = new THREE.PlaneGeometry(6.9, 6.9 * (APP.h * 640) / (APP.w * 1280));
  const screen = new THREE.Mesh(screenGeometry, new THREE.MeshBasicMaterial({ map: footage, toneMapped: false, color: new THREE.Color(0.92, 0.92, 0.92) }));
  screen.position.z = 0.07;
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
  strip.mesh.position.set(0, -screenHalf + 0.31, 0.09);
  strip.mesh.material.opacity = 0;
  monitor.add(strip.mesh);

  // The head, in points, once its file arrives. In profile, facing the screen.
  const head = new THREE.Group();
  head.position.set(-3.0, 0.6, 0.6);
  head.rotation.y = 1.3;
  group.add(head);
  const mouth = new THREE.Object3D();
  head.add(mouth);
  let headPoints = null;
  let headDone = false;
  loadHead(media("/film/head-points.bin")).then((data) => {
    const scale = 5 / data.size[1];
    // The screen is the key light: points facing it take its colour, the far
    // side falls off into the background.
    const lit = new THREE.Color(1, 0.93, 0.84).lerp(VIOLET, 0.18);
    const depth = data.size[2] / 2;
    for (let i = 0; i < data.positions.length / 3; i++) {
      const facing = smooth(ramp(data.positions[i * 3 + 2] / depth, -0.35, 0.75));
      const k = 0.1 + 1.15 * facing;
      for (let c = 0; c < 3; c++) data.colors[i * 3 + c] *= k * (0.55 + 0.45 * [lit.r, lit.g, lit.b][c]) ** 0.5 * (facing > 0.5 ? 1.2 : 1);
    }
    headPoints = points(data.positions, data.colors, 0.05, { opacity: 1, wobble: 0.012 / scale });
    headPoints.mesh.scale.setScalar(scale);
    head.add(headPoints.mesh);
    // The mouth, in the model's own units: just under the nose, at the front.
    mouth.position.set(0, (-0.047 - data.centre[1]) * scale, (0.072 - data.centre[2]) * scale);
    headDone = true;
  }).catch(() => { headDone = true; });
  disposers.push(() => headPoints?.dispose());

  // The voice: points running from the mouth to the screen on a wave.
  const WAVE = 480;
  const wavePositions = new Float32Array(WAVE * 3), waveColors = new Float32Array(WAVE * 3);
  for (let i = 0; i < WAVE; i++) SIGNAL.clone().lerp(VIOLET, (i % 7) / 10).toArray(waveColors, i * 3);
  const wave = keep(points(wavePositions, waveColors, 0.07, { opacity: 0, wobble: 0.02 }));
  group.add(wave.mesh);
  const from = new THREE.Vector3(), to = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), point = new THREE.Vector3();
  const screenTarget = new THREE.Object3D();
  screenTarget.position.set(-2.4, -0.3, 0.2);
  monitor.add(screenTarget);

  return {
    ready: () => headDone,
    setPlaying(on) {
      if (phone) return;
      if (on) video.play().catch(() => {});
      else video.pause();
    },
    update({ scene, clock, scale }) {
      head.position.y = 0.6 + Math.sin(clock * 0.7) * 0.03;
      if (headPoints) { headPoints.uniforms.uTime.value = clock; headPoints.uniforms.uScale.value = scale; headPoints.uniforms.uOpacity.value = 1; }

      // The voice runs while it is speaking, quietly, then stops.
      const speaking = smooth(ramp(scene, 0.02, 0.1)) * (1 - smooth(ramp(scene, 0.4, 0.5)));
      wave.uniforms.uOpacity.value = 0.6 * speaking;
      wave.uniforms.uTime.value = clock;
      wave.uniforms.uScale.value = scale;
      if (speaking > 0) {
        group.updateMatrixWorld();
        mouth.getWorldPosition(from); group.worldToLocal(from);
        screenTarget.getWorldPosition(to); group.worldToLocal(to);
        for (let i = 0; i < WAVE; i++) {
          const u = (i / WAVE + clock * 0.2) % 1;
          const swell = Math.sin(Math.PI * u);
          point.copy(from).lerp(to, u).addScaledVector(up, Math.sin(u * 46 - clock * 8 + (i % 3)) * 0.3 * swell * (0.4 + 0.6 * Math.abs(Math.sin(clock * 2.4 + u * 5))));
          point.z += (i % 2 ? 1 : -1) * 0.04 * swell;
          point.toArray(wavePositions, i * 3);
        }
        wave.mesh.geometry.attributes.position.needsUpdate = true;
      }

      // The command types in once, is sent, and holds.
      const typed = Math.round(COMMAND.length * ramp(scene, 0.1, 0.4));
      const sent = scene >= 0.5;
      const key = sent ? 999 : typed;
      if (key !== lastTyped) { lastTyped = key; strip.redraw(typed, sent); }
      strip.mesh.material.opacity = smooth(ramp(scene, 0.06, 0.12));
    },
    dispose() {
      video.pause();
      video.removeAttribute("src");
      video.load();
      footage.dispose();
      [bezelGeometry, screenGeometry].forEach((g) => g.dispose());
      bezel.material.dispose();
      screen.material.dispose();
      disposers.forEach((fn) => fn());
    },
  };
}
