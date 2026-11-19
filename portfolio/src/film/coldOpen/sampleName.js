import * as THREE from "three";

/* Where the name's particles should end up.

   The cold open ends by lifting off the real page, so its name has to sit
   exactly on top of the page's own name, whatever the screen size. This
   reads the hero's <h1> as the browser has laid it out, redraws each line
   on a hidden canvas at the same size and place, picks points from the
   drawn pixels, and projects them into the scene through the closing
   camera. The result lines up with the DOM to the pixel.

   Returns null when the name is not on the page or cannot be read. */
export function sampleName(camera, count) {
  const lines = [...document.querySelectorAll("#hero-name .sc-name-line > span")];
  if (!lines.length) return null;
  const width = window.innerWidth, height = window.innerHeight;
  // About 1500 pixels across is plenty on a wide screen (the points get a
  // random offset inside each pixel). A phone is drawn at up to twice its
  // size instead, or the thin outline of the second line comes out ragged.
  const k = Math.min(2, 1500 / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * k);
  canvas.height = Math.ceil(height * k);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  const drawn = [];
  const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (const line of lines) {
    const box = line.getBoundingClientRect();
    if (!box.width || !line.offsetWidth) return null;
    const style = getComputedStyle(line);
    // The name is scaled by a transform during the intro; the box knows.
    const scale = box.width / line.offsetWidth;
    const size = parseFloat(style.fontSize) * scale * k;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    if ("letterSpacing" in context) context.letterSpacing = `${(parseFloat(style.letterSpacing) || 0) * scale * k}px`;
    context.textBaseline = "alphabetic";
    const metrics = context.measureText(line.textContent);
    const ascent = metrics.fontBoundingBoxAscent ?? size * 0.8, descent = metrics.fontBoundingBoxDescent ?? size * 0.2;
    // The line box centres the font's own box; the baseline sits under its ascent.
    const baseline = box.top * k + (box.height * k - (ascent + descent)) / 2 + ascent;
    const stroke = parseFloat(style.webkitTextStrokeWidth) || 0;
    const outlined = stroke > 0;
    if (outlined) {
      context.lineWidth = Math.max(1.4, stroke * scale * k * 1.6);
      context.lineJoin = "round";
      context.strokeStyle = "#fff";
      context.strokeText(line.textContent, box.left * k, baseline);
    } else {
      context.fillStyle = "#fff";
      context.fillText(line.textContent, box.left * k, baseline);
    }
    const top = Math.max(0, Math.floor(box.top * k) - 2), bottom = Math.min(canvas.height, Math.ceil(box.bottom * k) + 2);
    const left = Math.max(0, Math.floor(box.left * k) - 2), right = Math.min(canvas.width, Math.ceil(box.right * k) + 4);
    if (bottom <= top || right <= left) return null;
    const { data } = context.getImageData(left, top, right - left, bottom - top);
    const pixels = [];
    for (let y = 0; y < bottom - top; y++) for (let x = 0; x < right - left; x++) if (data[(y * (right - left) + x) * 4 + 3] > 110) pixels.push(left + x, top + y);
    if (pixels.length) drawn.push({ pixels, outlined });
    // The line is a full-width block: the letters end where the text does.
    bounds.left = Math.min(bounds.left, box.left); bounds.top = Math.min(bounds.top, box.top);
    bounds.right = Math.max(bounds.right, box.left + metrics.width / k); bounds.bottom = Math.max(bounds.bottom, box.bottom);
  }
  if (!drawn.length) return null;

  // Share the particles by area, but an outline is thin: give it a floor so
  // it still reads as a solid line.
  const area = drawn.reduce((sum, line) => sum + line.pixels.length, 0);
  const weights = drawn.map((line) => Math.max(line.pixels.length / area, line.outlined ? 0.34 : 0));
  const weightSum = weights.reduce((a, b) => a + b, 0);

  // Screen pixel -> the point on the plane through the origin that faces the camera.
  const normal = new THREE.Vector3();
  camera.getWorldDirection(normal);
  const ray = new THREE.Vector3();
  const project = (x, y, out, offset) => {
    ray.set((x / width) * 2 - 1, 1 - (y / height) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
    const distance = -camera.position.dot(normal) / ray.dot(normal);
    out[offset] = camera.position.x + ray.x * distance;
    out[offset + 1] = camera.position.y + ray.y * distance;
    out[offset + 2] = camera.position.z + ray.z * distance;
  };

  const positions = new Float32Array(count * 3);
  const tints = new Float32Array(count);
  let written = 0;
  drawn.forEach((line, index) => {
    const share = index === drawn.length - 1 ? count - written : Math.round((count * weights[index]) / weightSum);
    const total = line.pixels.length / 2;
    for (let i = 0; i < share; i++) {
      const pick = Math.floor(Math.random() * total) * 2;
      project((line.pixels[pick] + Math.random()) / k, (line.pixels[pick + 1] + Math.random()) / k, positions, written * 3);
      positions[written * 3 + 2] += (Math.random() - 0.5) * 0.3; // a little depth
      tints[written] = line.outlined ? 1 : 0;
      written++;
    }
  });

  const centre = [0, 0, 0];
  project((bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2, centre, 0);
  return { positions, tints, centre, bounds };
}
