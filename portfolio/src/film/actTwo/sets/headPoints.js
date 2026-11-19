import * as THREE from "three";
import { BONE, SIGNAL } from "../kit.js";

/* The digital double as 8,000 points (public/film/head-points.bin, written by
   scripts/make-head-points.mjs): positions centred on the head's own box,
   and a colour per point for skin, hair and eyes. */
export async function loadHead(url) {
  const buffer = await (await fetch(url)).arrayBuffer();
  const view = new DataView(buffer);
  const count = view.getUint32(0, true);
  const min = [0, 1, 2].map((k) => view.getFloat32(4 + k * 4, true));
  const max = [0, 1, 2].map((k) => view.getFloat32(16 + k * 4, true));
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const skin = BONE.clone().multiplyScalar(0.4), hair = new THREE.Color(0.3, 0.22, 0.19), eye = SIGNAL.clone().multiplyScalar(1.3);
  for (let i = 0; i < count; i++) {
    const at = 28 + i * 7;
    for (let k = 0; k < 3; k++) {
      const q = (view.getInt16(at + k * 2, true) + 32767) / 65534;
      // Centred on the box, so the head turns about its own middle.
      positions[i * 3 + k] = min[k] + q * (max[k] - min[k]) - (min[k] + max[k]) / 2;
    }
    [skin, hair, eye][view.getUint8(at + 6)].toArray(colors, i * 3);
  }
  return { positions, colors, size: max.map((v, k) => v - min[k]), centre: max.map((v, k) => (v + min[k]) / 2) };
}
