import { useEffect, useRef } from "react";

/* A printed-paper texture: multi-octave value noise reduced to two tones
   with a 4x4 ordered (Bayer) dither, drawn as small square pixels in pale
   ink on stone. It thins out toward the band's top and bottom edges so it
   reads as grain on the paper, not a block. Static: drawn once per size,
   so it costs nothing while you scroll. `seed` varies the pattern. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const hash = (x, y, seed) => {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return h - Math.floor(h);
};
const smooth = (t) => t * t * (3 - 2 * t);
function noise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
// Three octaves: broad drifts, mid detail, fine grain.
const fbm = (x, y, seed) => noise(x / 90, y / 90, seed) * 0.55 + noise(x / 34, y / 34, seed + 3) * 0.3 + noise(x / 12, y / 12, seed + 7) * 0.15;

export default function DitherField({ seed = 1, pixel = 3, density = 0.42, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgb(17 19 24 / .2)";
      const cols = Math.ceil(w / pixel), rows = Math.ceil(h / pixel);
      for (let j = 0; j < rows; j++) {
        // Fade toward the top and bottom edges of the band.
        const edge = Math.min(1, Math.min(j, rows - 1 - j) / (rows * 0.22));
        for (let i = 0; i < cols; i++) {
          const v = fbm(i * pixel, j * pixel, seed);
          const tone = ((v - 0.5) * 2.2 + density) * edge;
          if (tone > BAYER[(j % 4) * 4 + (i % 4)]) ctx.fillRect(i * pixel, j * pixel, pixel - 1, pixel - 1);
        }
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [seed, pixel, density]);

  return <canvas ref={ref} className={`qp-dither ${className}`} aria-hidden="true" />;
}
